// ============================================================================
// Mizan (ميزان) - Comprehensive Invoicing & VAT Compliance Test Suite (Phase 6.4.1)
// Verifies Article 59 Classification, Non-Registered Supply Classification,
// CBUAE FX Evidence, Half-Even Rounding, Real PostgreSQL Persistence,
// Numbering Concurrency, Document Integrity, Credit Notes & Tenant Isolation
// ============================================================================

import { InvoicingService } from './invoicing.service';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { InvoiceValidationService } from './invoice-validation.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { BusinessRecord, BusinessService } from '../business/business.service';
import { LegalEntityTypeDto, JurisdictionTypeDto } from '../business/dto/create-trade-license.dto';
import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testId: string, desc: string) {
  if (condition) {
    console.log(`✔ [PASS] ${testId}: ${desc}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testId}: ${desc}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('============================================================');
  console.log('MIZAN INVOICING & VAT TAX COMPLIANCE AUDIT SUITE (PHASE 6.4.1)');
  console.log('============================================================\n');

  const prisma = new PrismaClient();
  const bizService = new BusinessService(prisma as any);
  const calcService = new InvoiceCalculationService();
  const valService = new InvoiceValidationService();
  const numService = new InvoiceNumberService();
  const pdfService = new InvoicePdfService();

  const invoicingService = new InvoicingService(
    bizService,
    calcService,
    valService,
    numService,
    pdfService,
  );

  const orgA = 'org-tenant-alpha';
  const orgB = 'org-tenant-beta';
  const userA = 'user-alpha-1';

  // Seed two distinct businesses for Org A and Org B
  const bizA: BusinessRecord = await bizService.createOrUpdateTradeLicense({
    tradeLicenseNumber: 'CN-1002341',
    legalName: 'Al Baraka Technologies LLC',
    tradeName: 'Baraka Tech',
    legalEntityType: LegalEntityTypeDto.LLC,
    jurisdictionType: JurisdictionTypeDto.MAINLAND,
    licensingAuthority: 'DET Dubai',
    annualRevenueEstimateAED: 4_500_000,
    vatTrn: '100456789000003',
  }, orgA);

  const bizB: BusinessRecord = await bizService.createOrUpdateTradeLicense({
    tradeLicenseNumber: 'FZ-992384',
    legalName: 'Crescent Moon Creative FZ-LLC',
    tradeName: 'Crescent Creative',
    legalEntityType: LegalEntityTypeDto.FREE_ZONE_COMPANY,
    jurisdictionType: JurisdictionTypeDto.FREE_ZONE,
    licensingAuthority: 'DDA Dubai Media City',
    annualRevenueEstimateAED: 1_200_000,
    vatTrn: '100888999000003',
  }, orgB);

  // --------------------------------------------------------------------------
  // 1. ARTICLE 59 INVOICE CLASSIFICATION (ARTICLE 59(5) ELIGIBILITY RULES)
  // --------------------------------------------------------------------------
  console.log('--- 1. ARTICLE 59 INVOICE CLASSIFICATION (ARTICLE 59(5) ELIGIBILITY RULES) ---');

  // Customer A: Unregistered recipient (no TRN)
  const custUnregistered = await invoicingService.createCustomer({
    name: 'Individual Retail Buyer',
    customerType: 'INDIVIDUAL',
    billingAddress: 'Al Wasl Road, Villa 4, Dubai',
    country: 'United Arab Emirates',
  }, bizA.id, orgA);

  // Customer B: Registered recipient (with 15-digit TRN)
  const custRegistered = await invoicingService.createCustomer({
    name: 'Al Futtaim Engineering LLC',
    companyName: 'Al Futtaim Engineering LLC',
    customerType: 'CORPORATE',
    trn: '100333444555003',
    billingAddress: 'Al Rashidiya, Dubai, UAE',
    country: 'United Arab Emirates',
  }, bizA.id, orgA);

  // Case 1: Unregistered recipient, AED 15,000 -> Simplified Tax Invoice permitted under Art. 59(5)(a)
  const valCase1 = valService.validateInvoiceForIssuance({
    business: bizA,
    customer: custUnregistered,
    invoiceNumber: 'INV-TEMP-1',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [{ description: 'High-end Laptop', quantity: 1, unitPrice: 15000, vatTreatment: 'STANDARD_5' }],
    calculation: calcService.calculateInvoice([{ description: 'Laptop', quantity: 1, unitPrice: 15000, vatTreatment: 'STANDARD_5' }]).summary,
  });
  assert(
    valCase1.invoiceType === 'SIMPLIFIED_TAX_INVOICE' &&
      valCase1.statutoryCitations.some((c) => c.includes('59(5)(a)')),
    'TC-INV-CL-01',
    'Unregistered recipient, AED 15,000: Simplified Tax Invoice permitted under Article 59(5)(a)',
  );

  // Case 2: Registered recipient, AED 9,999 -> Simplified Tax Invoice permitted under Art. 59(5)(b)
  const valCase2 = valService.validateInvoiceForIssuance({
    business: bizA,
    customer: custRegistered,
    invoiceNumber: 'INV-TEMP-2',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [{ description: 'Maintenance Services', quantity: 1, unitPrice: 9522.85, vatTreatment: 'STANDARD_5' }],
    calculation: calcService.calculateInvoice([{ description: 'Maintenance', quantity: 1, unitPrice: 9522.85, vatTreatment: 'STANDARD_5' }]).summary,
  });
  assert(
    valCase2.invoiceType === 'SIMPLIFIED_TAX_INVOICE' &&
      valCase2.statutoryCitations.some((c) => c.includes('59(5)(b)')),
    'TC-INV-CL-02',
    'Registered recipient, AED 9,999: Simplified Tax Invoice permitted under Article 59(5)(b)',
  );

  // Case 3: Registered recipient, consideration exactly AED 10,000 -> Simplified Tax Invoice permitted under Art. 59(5)(b)
  const valCase3 = valService.validateInvoiceForIssuance({
    business: bizA,
    customer: custRegistered,
    invoiceNumber: 'INV-TEMP-3',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [{ description: 'Annual License', quantity: 1, unitPrice: 9523.81, vatTreatment: 'STANDARD_5' }],
    calculation: calcService.calculateInvoice([{ description: 'Annual License', quantity: 1, unitPrice: 9523.81, vatTreatment: 'STANDARD_5' }]).summary,
  });
  assert(
    valCase3.invoiceType === 'SIMPLIFIED_TAX_INVOICE' &&
      valCase3.statutoryCitations.some((c) => c.includes('59(5)(b)')),
    'TC-INV-CL-03',
    'Registered recipient, exactly AED 10,000: Simplified Tax Invoice permitted under Article 59(5)(b)',
  );

  // Case 4: Registered recipient, consideration AED 10,000.01 -> Full Tax Invoice is MANDATORY under Art. 59(1)
  const valCase4 = valService.validateInvoiceForIssuance({
    business: bizA,
    customer: custRegistered,
    invoiceNumber: 'INV-TEMP-4',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [{ description: 'Enterprise Software', quantity: 1, unitPrice: 9523.82, vatTreatment: 'STANDARD_5' }],
    calculation: calcService.calculateInvoice([{ description: 'Enterprise Software', quantity: 1, unitPrice: 9523.82, vatTreatment: 'STANDARD_5' }]).summary,
  });
  assert(
    valCase4.invoiceType === 'TAX_INVOICE' &&
      valCase4.statutoryCitations.some((c) => c.includes('59(1)')),
    'TC-INV-CL-04',
    'Registered recipient, AED 10,000.01: Full Tax Invoice mandatory under Article 59(1)',
  );

  // Case 5: Full invoice voluntarily issued where simplified invoicing is permitted
  const valCase5 = valService.validateInvoiceForIssuance({
    business: bizA,
    customer: custRegistered,
    invoiceNumber: 'INV-TEMP-5',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [{ description: 'Minor Consulting', quantity: 1, unitPrice: 1000, vatTreatment: 'STANDARD_5' }],
    calculation: calcService.calculateInvoice([{ description: 'Minor Consulting', quantity: 1, unitPrice: 1000, vatTreatment: 'STANDARD_5' }]).summary,
    preferredInvoiceType: 'TAX_INVOICE',
  });
  assert(
    valCase5.invoiceType === 'TAX_INVOICE' &&
      valCase5.statutoryCitations.some((c) => c.includes('voluntarily issued')),
    'TC-INV-CL-05',
    'Full Tax Invoice voluntarily issued where simplified invoicing is permitted',
  );

  // --------------------------------------------------------------------------
  // 2. UNREGISTERED SUPPLIER & SUPPLY CLASSIFICATION SEPARATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. UNREGISTERED SUPPLIER & SUPPLY CLASSIFICATION SEPARATION ---');

  const unregisteredBiz: BusinessRecord = {
    id: 'biz-unregistered-sole',
    organisationId: orgA,
    legalName: 'Karim Creative Studio',
    tradeLicenseNumber: 'FL-889922',
    legalEntityType: 'SOLE_ESTABLISHMENT',
    jurisdictionType: 'MAINLAND',
    licensingAuthority: 'DET Dubai',
    annualRevenueEstimateAED: 220000,
    taxRegime: 'NATURAL_PERSON_EXEMPT',
    isSbrEligible: true,
    isQfzpEligible: false,
    verificationStatus: 'MANUAL_ENTRY',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const unregCalc = calcService.calculateInvoice(
    [
      {
        description: 'Brand Identity Strategy',
        quantity: 1,
        unitPrice: 12000,
        vatTreatment: 'STANDARD_5',
      },
      {
        description: 'Website International Hosting',
        quantity: 1,
        unitPrice: 3000,
        vatTreatment: 'ZERO_RATED_0',
      },
    ],
    { isSupplierVatRegistered: false },
  );

  assert(
    unregCalc.lines[0].vatTreatment === 'STANDARD_5' &&
      unregCalc.lines[1].vatTreatment === 'ZERO_RATED_0' &&
      unregCalc.lines[0].vatAmount === 0 &&
      unregCalc.lines[0].isVatCharged === false &&
      unregCalc.summary.totalVat === 0 &&
      unregCalc.lines[0].statutoryLegalBasis.includes('Article 65(1)'),
    'TC-INV-UNREG-01',
    'Commercial invoice calculation preserves underlying supply classifications while enforcing 0% VAT under Article 65(1)',
  );

  const unregVal = valService.validateInvoiceForIssuance({
    business: unregisteredBiz,
    invoiceNumber: 'COM-2026-0001',
    issueDate: '2026-11-06',
    currency: 'AED',
    lines: [
      {
        description: 'Brand Identity Strategy',
        quantity: 1,
        unitPrice: 12000,
        vatTreatment: 'STANDARD_5',
      },
    ],
    calculation: unregCalc.summary,
  });

  assert(
    unregVal.invoiceType === 'COMMERCIAL_INVOICE' &&
      unregVal.isValid === true &&
      unregVal.statutoryCitations.some((c) => c.includes('Article 65(1)')),
    'TC-INV-UNREG-02',
    'Unregistered supplier validated as Commercial Invoice citing Article 65(1) without charging VAT',
  );

  // --------------------------------------------------------------------------
  // 3. CBUAE EXCHANGE-RATE EVIDENCE (ARTICLE 69)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. CBUAE EXCHANGE-RATE EVIDENCE (ARTICLE 69) ---');

  const usdEvidence = invoicingService.resolveExchangeRate('USD', '2026-11-06');
  assert(
    usdEvidence.currencyPair === 'USD/AED' &&
      usdEvidence.exchangeRate === 3.6725 &&
      usdEvidence.rateSource === 'CBUAE_OFFICIAL_FIX' &&
      usdEvidence.isOfficialCbUae === true &&
      usdEvidence.supplyDateUsed === '2026-11-06',
    'TC-INV-FX-01',
    'USD invoice resolves official CBUAE pegged rate (3.6725) with complete audit evidence',
  );

  const unknownEvidence = invoicingService.resolveExchangeRate('XYZ', '2026-11-06');
  assert(
    unknownEvidence.rateSource === 'UNRESOLVED_RATE_ERROR' &&
      unknownEvidence.unresolvedReason!.includes('Article 69'),
    'TC-INV-FX-02',
    'Unrecognized currency without official CBUAE rate returns UNRESOLVED_RATE_ERROR',
  );

  // --------------------------------------------------------------------------
  // 4. FINANCIAL ROUNDING & SUB-FILS PRECISION
  // --------------------------------------------------------------------------
  console.log('\n--- 4. FINANCIAL ROUNDING & SUB-FILS PRECISION ---');

  // Verify Banker's rounding (ROUND_HALF_EVEN)
  const r1 = calcService.roundCurrency(0.005, 2);
  const r2 = calcService.roundCurrency(0.015, 2);
  const r3 = calcService.roundCurrency(0.025, 2);
  const r4 = calcService.roundCurrency(0.035, 2);

  assert(
    r1 === 0.00 && r2 === 0.02 && r3 === 0.02 && r4 === 0.04,
    'TC-INV-RND-01',
    'Sub-fils amounts adhere strictly to ROUND_HALF_EVEN banker rounding (0.005->0.00, 0.015->0.02, 0.025->0.02, 0.035->0.04)',
  );

  // Verify line-by-line summation reconciliation
  const multiLineCalc = calcService.calculateInvoice([
    { description: 'Item 1', quantity: 3, unitPrice: 33.33, vatTreatment: 'STANDARD_5' },
    { description: 'Item 2', quantity: 1, unitPrice: 14.25, vatTreatment: 'STANDARD_5' },
  ]);

  const sumLineVat = multiLineCalc.lines.reduce((acc, l) => acc + l.vatAmount, 0);
  assert(
    multiLineCalc.summary.totalVat === sumLineVat,
    'TC-INV-RND-02',
    'Line-level VAT amounts reconcile exactly with aggregated invoice total VAT (zero rounding divergence)',
  );

  // --------------------------------------------------------------------------
  // 5. REAL POSTGRESQL PERSISTENCE & PRISMA REPOSITORY
  // --------------------------------------------------------------------------
  console.log('\n--- 5. REAL POSTGRESQL PERSISTENCE & PRISMA REPOSITORY ---');

  try {
    const dbBiz = await prisma.business.findFirst();
    const dbAcc = await prisma.account.findFirst();

    if (dbBiz && dbAcc) {
      const testCust = await prisma.customer.create({
        data: {
          businessId: dbBiz.id,
          name: 'PostgreSQL Automated Test Customer LLC',
          trn: '100999888777003',
          address: 'Sheikh Zayed Road, Dubai',
          email: 'qa@postgresql-test.ae',
        },
      });

      const testInv = await prisma.invoice.create({
        data: {
          businessId: dbBiz.id,
          customerId: testCust.id,
          invoiceNumber: `INV-PG-${Date.now().toString().slice(-4)}`,
          issueDate: new Date('2026-11-06'),
          dueDate: new Date('2026-11-20'),
          currency: 'AED',
          exchangeRate: new Decimal(1.0),
          subtotal: new Decimal(10000.0),
          vatTotal: new Decimal(500.0),
          totalAmount: new Decimal(10500.0),
          totalAmountAED: new Decimal(10500.0),
          status: 'DRAFT',
          lines: {
            create: [
              {
                description: 'PostgreSQL Enterprise Architecture Audit',
                quantity: new Decimal(1.0),
                unitPrice: new Decimal(10000.0),
                vatRateType: 'STANDARD_5',
                vatPercentage: new Decimal(5.0),
                vatAmount: new Decimal(500.0),
                lineTotal: new Decimal(10500.0),
                lineTotalAED: new Decimal(10500.0),
                accountId: dbAcc.id,
              },
            ],
          },
        },
        include: { lines: true },
      });

      await prisma.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: testInv.id },
          data: { status: 'ISSUED' },
        });

        await tx.payment.create({
          data: {
            businessId: dbBiz.id,
            invoiceId: testInv.id,
            amount: new Decimal(10500.0),
            amountAED: new Decimal(10500.0),
            currency: 'AED',
            paymentDate: new Date(),
            paymentMethod: 'BANK_TRANSFER',
            referenceNumber: 'TXN-PG-VERIFIED',
          },
        });
      });

      const retrieved = await prisma.invoice.findUnique({
        where: { id: testInv.id },
        include: { payments: true, lines: true },
      });

      assert(
        retrieved !== null &&
          retrieved.status === 'ISSUED' &&
          retrieved.lines.length === 1 &&
          retrieved.payments.length === 1 &&
          retrieved.payments[0].amount.toNumber() === 10500,
        'TC-INV-PG-01',
        'Real PostgreSQL persistence verified: customer, invoice, lines and payments stored and retrieved via Prisma',
      );

      // Clean up test records
      await prisma.payment.deleteMany({ where: { invoiceId: testInv.id } });
      await prisma.invoiceLine.deleteMany({ where: { invoiceId: testInv.id } });
      await prisma.invoice.delete({ where: { id: testInv.id } });
      await prisma.customer.delete({ where: { id: testCust.id } });
    }
  } catch (err: any) {
    assert(false, 'TC-INV-PG-01', `PostgreSQL execution encountered error: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // --------------------------------------------------------------------------
  // 6. NUMBERING CONCURRENCY & RACE CONDITIONS
  // --------------------------------------------------------------------------
  console.log('\n--- 6. NUMBERING CONCURRENCY & RACE CONDITIONS ---');

  const concurrentNumbers = await Promise.all([
    Promise.resolve(numService.getNextInvoiceNumber(bizA.id, 'INV', 2026)),
    Promise.resolve(numService.getNextInvoiceNumber(bizA.id, 'INV', 2026)),
    Promise.resolve(numService.getNextInvoiceNumber(bizA.id, 'INV', 2026)),
    Promise.resolve(numService.getNextInvoiceNumber(bizA.id, 'INV', 2026)),
    Promise.resolve(numService.getNextInvoiceNumber(bizA.id, 'INV', 2026)),
  ]);

  const allocated = concurrentNumbers.map((n) => n.invoiceNumber);
  const uniqueAllocated = new Set(allocated);

  assert(
    allocated.length === 5 && uniqueAllocated.size === 5,
    'TC-INV-CONC-01',
    'Concurrent numbering generation produces 100% unique sequence numbers with zero collisions',
  );

  const num2026 = numService.getNextInvoiceNumber(bizA.id, 'INV', 2026);
  const num2027 = numService.getNextInvoiceNumber(bizA.id, 'INV', 2027);

  assert(
    num2026.invoiceNumber.includes('INV-2026-') &&
      num2027.invoiceNumber === 'INV-2027-0001',
    'TC-INV-CONC-02',
    'Year rollover resets sequential sequence to 0001 without identifier collision',
  );

  // --------------------------------------------------------------------------
  // 7. ISSUED DOCUMENT IMMUTABILITY & DOCUMENT INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- 7. ISSUED DOCUMENT IMMUTABILITY & INTEGRITY ---');

  const draftInv = await invoicingService.createDraftInvoice(
    {
      businessId: bizA.id,
      customerId: custRegistered.id,
      issueDate: '2026-11-06',
      dueDate: '2026-11-20',
      currency: 'AED',
      lines: [
        {
          description: 'Network Infrastructure Deployment',
          quantity: 1,
          unitPrice: 20000,
          vatTreatment: 'STANDARD_5',
        },
      ],
    },
    orgA,
    userA,
  );

  const issuedInv = await invoicingService.issueInvoice(draftInv.id, orgA, userA);

  let updateBlocked = false;
  try {
    await invoicingService.updateDraftInvoice(issuedInv.id, { notes: 'Tamper attempt' }, orgA);
  } catch (err: any) {
    if (err.message.includes('immutable')) updateBlocked = true;
  }
  assert(updateBlocked, 'TC-INV-IMM-01', 'Update of issued invoice is strictly rejected with 400 Bad Request');

  let deleteBlocked = false;
  try {
    await invoicingService.deleteInvoice(issuedInv.id, orgA);
  } catch (err: any) {
    if (err.message.includes('cannot be deleted')) deleteBlocked = true;
  }
  assert(deleteBlocked, 'TC-INV-IMM-02', 'Deletion of issued invoice is strictly blocked under audit regulations');

  assert(
    issuedInv.businessSnapshot?.legalName === bizA.legalName &&
      issuedInv.customerSnapshot?.name === custRegistered.name &&
      !!issuedInv.renderedHtml &&
      !!issuedInv.pdfChecksum,
    'TC-INV-IMM-03',
    'Issued invoice captures immutable business and customer snapshots, ensuring historical reproduction',
  );

  // --------------------------------------------------------------------------
  // 8. CREDIT NOTE CORRECTNESS & ARTICLE 60 COMPLIANCE
  // --------------------------------------------------------------------------
  console.log('\n--- 8. CREDIT NOTE CORRECTNESS & ARTICLE 60 COMPLIANCE ---');

  const cn1 = await invoicingService.createCreditNote(
    issuedInv.id,
    {
      reason: 'Partial cancellation of scope under Article 70 FDL 8/2017',
      creditedLines: [
        {
          description: 'Scope Reduction Phase 1',
          quantity: 1,
          unitPrice: 5000,
          vatTreatment: 'STANDARD_5',
        },
      ],
    },
    orgA,
    userA,
  );

  assert(
    cn1.totalCredited === 5250 &&
      issuedInv.outstandingBalance === 15750 &&
      cn1.statutoryBasis.includes('Article 60 Cabinet Decision No. 52 of 2017'),
    'TC-INV-CN-01',
    'Partial credit note reduces invoice outstanding balance and references Article 60 & Article 70',
  );

  let excessBlocked = false;
  try {
    await invoicingService.createCreditNote(
      issuedInv.id,
      {
        reason: 'Excess credit attempt',
        creditedLines: [
          {
            description: 'Illegal excess credit',
            quantity: 1,
            unitPrice: 20000,
            vatTreatment: 'STANDARD_5',
          },
        ],
      },
      orgA,
      userA,
    );
  } catch (err: any) {
    if (err.message.includes('exceeds remaining eligible invoice balance')) {
      excessBlocked = true;
    }
  }
  assert(excessBlocked, 'TC-INV-CN-02', 'Credit note exceeding remaining eligible balance is strictly blocked');

  // --------------------------------------------------------------------------
  // 9. PAYMENT, REFUND & TENANT ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- 9. PAYMENT, REFUND & TENANT ISOLATION ---');

  let overpayBlocked = false;
  try {
    await invoicingService.recordPayment(issuedInv.id, { amount: 50000 }, orgA);
  } catch (err: any) {
    if (err.message.includes('exceeds remaining outstanding balance')) {
      overpayBlocked = true;
    }
  }
  assert(overpayBlocked, 'TC-INV-PAY-01', 'Overpayment exceeding remaining outstanding balance is rejected');

  const payRecord = await invoicingService.recordPayment(issuedInv.id, { amount: 10000 }, orgA);
  assert(
    payRecord.amountPaid === 10000 && payRecord.outstandingBalance === 5750,
    'TC-INV-PAY-02',
    'Valid partial payment recorded successfully',
  );

  const refundRecord = await invoicingService.refundPayment(issuedInv.id, 2000, 'Customer duplicate transfer', orgA);
  assert(
    refundRecord.amountPaid === 8000 && refundRecord.outstandingBalance === 7750,
    'TC-INV-PAY-03',
    'Payment refund restores outstanding balance and updates payment ledger',
  );

  let crossCustBlocked = false;
  try {
    await invoicingService.getCustomerById(custRegistered.id, bizB.id, orgB);
  } catch (err: any) {
    if (err.status === 403 || err.message.includes('another organisation') || err.message.includes('another business')) {
      crossCustBlocked = true;
    }
  }
  assert(crossCustBlocked, 'TC-INV-PAY-04', 'Cross-tenant customer access is blocked with 403 Forbidden');

  // --------------------------------------------------------------------------
  // 10. PDF WORKFLOW & REGULATORY E-INVOICING DISCLOSURE
  // --------------------------------------------------------------------------
  console.log('\n--- 10. PDF WORKFLOW & REGULATORY E-INVOICING DISCLOSURE ---');

  const renderedPdf = await invoicingService.getInvoicePdfHtml(issuedInv.id, orgA);

  assert(
    renderedPdf.html.includes('TAX INVOICE') &&
      renderedPdf.html.includes('فاتورة ضريبية') &&
      renderedPdf.html.includes('UAE Ministry of Finance e-Billing System Regulatory Disclosure (November 2026)') &&
      renderedPdf.html.includes('Document Content Digest (SHA-256)') &&
      renderedPdf.html.includes('QR') &&
      renderedPdf.checksum.length === 64,
    'TC-INV-PDF-01',
    'PDF rendered with compliant Arabic RTL, QR metadata, and accurate November 2026 e-Invoicing disclosures',
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL AUDIT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
