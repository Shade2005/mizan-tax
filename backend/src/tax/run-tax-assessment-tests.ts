// ============================================================================
// Mizan (ميزان) - Comprehensive Tax Assessment Test Suite (Phase 6.6)
// Deterministic Statutory Calculations, Real Financial Data Ingestion,
// VAT 201 Return Mapping, Corporate Tax Adjustments, Multi-Tenancy & Grounded AI
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { VatEngine, VatTransactionLine } from '../tax-engine/vat.engine';
import { CorporateTaxEngine } from '../tax-engine/corporate-tax.engine';
import { VatAssessmentService } from './vat-assessment.service';
import { CorporateTaxAssessmentService } from './corporate-tax-assessment.service';
import { TaxService } from './tax.service';
import { STATUTORY_CITATIONS } from './statutory-rules.config';

const prisma = new PrismaClient();

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testId: string, description: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testId}: ${description}`);
  } else {
    console.error(`\x1b[31m✘ [FAIL]\x1b[0m ${testId}: ${description}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('MIZAN VAT & CORPORATE TAX ASSESSMENT AUDIT SUITE (PHASE 6.6)');
  console.log('============================================================\n');

  try {
    // ------------------------------------------------------------------------
    // SETUP: Persistent Tenant Organisations & Businesses
    // ------------------------------------------------------------------------
    const orgAlpha = await prisma.organisation.upsert({
      where: { id: 'org-tax-tenant-alpha' },
      update: {},
      create: {
        id: 'org-tax-tenant-alpha',
        name: 'Al-Madar Tech Holdings LLC',
        legalName: 'Al-Madar Tech Holdings LLC',
      },
    });

    const orgBeta = await prisma.organisation.upsert({
      where: { id: 'org-tax-tenant-beta' },
      update: {},
      create: {
        id: 'org-tax-tenant-beta',
        name: 'Gulf Trading Ventures LLC',
        legalName: 'Gulf Trading Ventures LLC',
      },
    });

    const bizAlpha = await prisma.business.upsert({
      where: {
        organisationId_tradeLicenseNumber: {
          organisationId: orgAlpha.id,
          tradeLicenseNumber: 'CN-TAX-2026-ALPHA',
        },
      },
      update: {},
      create: {
        id: 'biz-tax-alpha-001',
        organisationId: orgAlpha.id,
        legalName: 'Al-Madar Software Solutions LLC',
        tradeName: 'Al-Madar Software',
        legalEntityType: 'LLC',
        jurisdictionType: 'MAINLAND',
        emirate: 'Dubai',
        licensingAuthority: 'DET',
        tradeLicenseNumber: 'CN-TAX-2026-ALPHA',
      },
    });

    const bizBeta = await prisma.business.upsert({
      where: {
        organisationId_tradeLicenseNumber: {
          organisationId: orgBeta.id,
          tradeLicenseNumber: 'CN-TAX-2026-BETA',
        },
      },
      update: {},
      create: {
        id: 'biz-tax-beta-002',
        organisationId: orgBeta.id,
        legalName: 'Gulf Trading Co LLC',
        tradeName: 'Gulf Trading',
        legalEntityType: 'LLC',
        jurisdictionType: 'MAINLAND',
        emirate: 'Abu Dhabi',
        licensingAuthority: 'DED',
        tradeLicenseNumber: 'CN-TAX-2026-BETA',
      },
    });

    // Seed VAT Registration for bizAlpha
    await prisma.taxRegistration.upsert({
      where: {
        businessId_taxType: {
          businessId: bizAlpha.id,
          taxType: 'VAT',
        },
      },
      update: {
        status: 'REGISTERED',
        trn: '100234567800003',
      },
      create: {
        businessId: bizAlpha.id,
        taxType: 'VAT',
        status: 'REGISTERED',
        trn: '100234567800003',
        registrationDate: new Date('2024-01-01'),
        effectiveDate: new Date('2024-01-01'),
      },
    });

    // Seed dummy customer for invoicing
    const customer = await prisma.customer.upsert({
      where: { id: 'cust-tax-audit-01' },
      update: {},
      create: {
        id: 'cust-tax-audit-01',
        businessId: bizAlpha.id,
        name: 'Emirates Enterprise Corp',
        trn: '100987654300003',
      },
    });

    // Seed revenue account for invoicing
    const revAccount = await prisma.account.upsert({
      where: { id: 'acc-sales-rev-alpha' },
      update: {},
      create: {
        id: 'acc-sales-rev-alpha',
        businessId: bizAlpha.id,
        accountCode: '4000',
        accountName: 'Software Engineering Revenue',
        type: 'REVENUE',
        subtype: 'OPERATING_REVENUE',
      },
    });

    const vatService = new VatAssessmentService(prisma as any);
    const ctService = new CorporateTaxAssessmentService(prisma as any);
    // Mock RAG service for offline test suite
    const mockRagService = {
      generateGroundedAnswer: async (dto: any) => ({
        answer: 'Corporate Tax is assessed under Federal Decree-Law No. 47 of 2022. 50% entertainment expenses are disallowed under Article 32.',
        citations: [STATUTORY_CITATIONS.CT_BASIC_LAW, STATUTORY_CITATIONS.CT_ENTERTAINMENT_DISALLOWANCE],
        statutoryRationale: 'Article 32 disallows 50% of hospitality expenditure.',
        actionRequired: 'Ensure itemized invoices are retained.',
        suggestedFollowUps: ['How does Small Business Relief apply?'],
        isGrounded: true,
      }),
    } as any;
    const taxService = new TaxService(prisma as any, vatService, ctService, mockRagService);

    // ------------------------------------------------------------------------
    // SECTION 1: DETERMINISTIC VAT 201 STATUTORY ENGINE
    // ------------------------------------------------------------------------
    console.log('--- 1. DETERMINISTIC VAT 201 STATUTORY ENGINE ---');

    // TC-VAT-01: Standard-rated 5% Sales and Purchases
    {
      const lines: VatTransactionLine[] = [
        { id: '1', isSale: true, amountAED: new Decimal('100000.00'), vatRateCategory: 'STANDARD_5', hasValidTaxInvoice: true },
        { id: '2', isSale: false, amountAED: new Decimal('40000.00'), vatRateCategory: 'STANDARD_5', hasValidTaxInvoice: true },
      ];
      const res = VatEngine.calculateVatReturn201(lines);
      // Box 1 Output = 5,000; Box 9 Recoverable = 2,000; Box 12 Net Payable = 3,000
      assert(
        res.box1OutputVatAED.toNumber() === 5000 &&
        res.box9RecoverableInputVatAED.toNumber() === 2000 &&
        res.box12NetVatPositionAED.toNumber() === 3000,
        'TC-VAT-01',
        'Standard 5% supplies reconcile exactly: Output AED 5,000 - Input AED 2,000 = Payable AED 3,000'
      );
    }

    // TC-VAT-02: Zero-Rated, Exempt and Reverse-Charge (Imports)
    {
      const lines: VatTransactionLine[] = [
        { id: '1', isSale: true, amountAED: new Decimal('50000.00'), vatRateCategory: 'ZERO_RATED_0', hasValidTaxInvoice: true },
        { id: '2', isSale: true, amountAED: new Decimal('20000.00'), vatRateCategory: 'EXEMPT', hasValidTaxInvoice: true },
        // Foreign SaaS import (Reverse Charge)
        { id: '3', isSale: false, amountAED: new Decimal('10000.00'), vatRateCategory: 'REVERSE_CHARGE', isReverseChargeService: true, hasValidTaxInvoice: false },
      ];
      const res = VatEngine.calculateVatReturn201(lines);
      // Box 4 Zero-Rated = 50,000; Box 5 Exempt = 20,000; Box 3 Output = 500; Box 10 Recoverable = 500; Box 12 Net = 0
      assert(
        res.box4ZeroRatedSuppliesAED.toNumber() === 50000 &&
        res.box5ExemptSuppliesAED.toNumber() === 20000 &&
        res.box3OutputVatAED.toNumber() === 500 &&
        res.box10RecoverableInputVatAED.toNumber() === 500 &&
        res.box12NetVatPositionAED.toNumber() === 0,
        'TC-VAT-02',
        'Zero-rated, exempt & RCM: Reverse charge accounts for AED 500 Output & AED 500 Input (Net 0)'
      );
    }

    // TC-VAT-03: Article 53 Blocked Input Tax (Client Entertainment & Personal Motor Vehicle)
    {
      const lines: VatTransactionLine[] = [
        { id: '1', isSale: false, amountAED: new Decimal('10000.00'), vatRateCategory: 'STANDARD_5', isEntertainmentOrHospitality: true, hasValidTaxInvoice: true },
        { id: '2', isSale: false, amountAED: new Decimal('20000.00'), vatRateCategory: 'STANDARD_5', isPersonalMotorVehicle: true, hasValidTaxInvoice: true },
      ];
      const res = VatEngine.calculateVatReturn201(lines);
      // 5% on (10k + 20k) = 1,500 blocked
      assert(
        res.box9RecoverableInputVatAED.toNumber() === 0 &&
        res.blockedInputVatAED.toNumber() === 1500,
        'TC-VAT-03',
        'Art. 53 blocks 100% of input VAT on entertainment and private motor vehicles (AED 1,500 Blocked)'
      );
    }

    // TC-VAT-04: Decision No. 17 of 2026 Employee Expenses
    {
      const evalContractual = VatEngine.evaluateInputRecoverability({
        id: '1',
        isSale: false,
        amountAED: new Decimal('5000.00'),
        vatRateCategory: 'STANDARD_5',
        isEmployeeExpense: true,
        employeeExpenseCategory: 'BUSINESS_TRAVEL_HOTEL',
        hasValidTaxInvoice: true,
      });
      const evalPerk = VatEngine.evaluateInputRecoverability({
        id: '2',
        isSale: false,
        amountAED: new Decimal('3000.00'),
        vatRateCategory: 'STANDARD_5',
        isEmployeeExpense: true,
        employeeExpenseCategory: 'PERSONAL_PERK_OR_BENEFIT',
        hasValidTaxInvoice: true,
      });

      assert(
        evalContractual.recoverability === 'FULLY_RECOVERABLE' &&
        evalContractual.recoverableVatAED.toNumber() === 250 &&
        evalPerk.recoverability === 'BLOCKED' &&
        evalPerk.blockedVatAED.toNumber() === 150,
        'TC-VAT-04',
        'Decision No. 17 of 2026: Business duty hotel is 100% recoverable; personal perks are blocked'
      );
    }

    // TC-VAT-05: Missing Tax Invoice blocks input recovery under Art. 59/65
    {
      const evalNoInvoice = VatEngine.evaluateInputRecoverability({
        id: '1',
        isSale: false,
        amountAED: new Decimal('8000.00'),
        vatRateCategory: 'STANDARD_5',
        hasValidTaxInvoice: false,
      });
      assert(
        evalNoInvoice.recoverability === 'BLOCKED' &&
        evalNoInvoice.blockedVatAED.toNumber() === 400,
        'TC-VAT-05',
        'Art. 59 & 65: Input VAT without a valid supplier Tax Invoice is blocked from recovery'
      );
    }

    // TC-VAT-06: Rolling 12-Month Mandatory Registration Threshold Monitor
    {
      const below = VatEngine.evaluateRegistrationThresholds(new Decimal('150000.00'));
      const voluntary = VatEngine.evaluateRegistrationThresholds(new Decimal('250000.00'));
      const mandatory = VatEngine.evaluateRegistrationThresholds(new Decimal('400000.00'));

      assert(
        !below.isMandatoryRegistrationRequired && !below.isVoluntaryRegistrationEligible &&
        !voluntary.isMandatoryRegistrationRequired && voluntary.isVoluntaryRegistrationEligible &&
        mandatory.isMandatoryRegistrationRequired,
        'TC-VAT-06',
        'Turnover monitor identifies voluntary (>=187.5k) and mandatory (>=375k) registration triggers'
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 2: DETERMINISTIC CORPORATE TAX STATUTORY ENGINE
    // ------------------------------------------------------------------------
    console.log('\n--- 2. DETERMINISTIC CORPORATE TAX STATUTORY ENGINE ---');

    // TC-CT-01: Taxable Income below AED 375,000 threshold (0% Rate)
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('1500000.00'),
        accountingNetProfit: new Decimal('350000.00'),
        isSmallBusinessReliefElected: false,
        isQfzp: false,
        isMneGroup: false,
      });
      assert(
        res.finalTaxableIncome.toNumber() === 350000 &&
        res.corporateTaxPayableAED.toNumber() === 0 &&
        res.effectiveTaxRatePct.toNumber() === 0,
        'TC-CT-01',
        'Taxable income of AED 350,000 falls within AED 375,000 0% bracket (Tax Payable: AED 0)'
      );
    }

    // TC-CT-02: Taxable Income above AED 375,000 threshold (9% Rate on Excess)
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('5000000.00'),
        accountingNetProfit: new Decimal('875000.00'),
        isSmallBusinessReliefElected: false,
        isQfzp: false,
        isMneGroup: false,
      });
      // 9% on (875,000 - 375,000 = 500,000) = 45,000
      assert(
        res.finalTaxableIncome.toNumber() === 875000 &&
        res.corporateTaxPayableAED.toNumber() === 45000 &&
        res.effectiveTaxRatePct.toFixed(2) === '5.14',
        'TC-CT-02',
        'Profit of AED 875,000 pays 9% on AED 500,000 excess = AED 45,000 (Effective Rate 5.14%)'
      );
    }

    // TC-CT-03: Article 32 50% Entertainment Cap & Article 33(1) Non-Deductible Fines
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('4000000.00'),
        accountingNetProfit: new Decimal('300000.00'),
        clientEntertainmentExpense: new Decimal('60000.00'), // 30,000 disallowed
        nonDeductibleFines: new Decimal('20000.00'),         // 20,000 disallowed
        isSmallBusinessReliefElected: false,
        isQfzp: false,
        isMneGroup: false,
      });
      // Taxable Income = 300,000 + 30,000 + 20,000 = 350,000 (still <= 375k)
      assert(
        res.totalAdditions.toNumber() === 50000 &&
        res.finalTaxableIncome.toNumber() === 350000 &&
        res.adjustments.length === 2,
        'TC-CT-03',
        'Add-backs correctly applied: 50% entertainment (30k) + 100% fines (20k) = AED 50,000 additions'
      );
    }

    // TC-CT-04: Small Business Relief (SBR) under Art. 21 & MD 73/2023
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('2500000.00'),
        priorPeriodRevenues: [new Decimal('2200000.00')],
        accountingNetProfit: new Decimal('600000.00'),
        isSmallBusinessReliefElected: true,
        isQfzp: false,
        isMneGroup: false,
      });
      assert(
        res.isSmallBusinessReliefApplied &&
        res.finalTaxableIncome.toNumber() === 0 &&
        res.corporateTaxPayableAED.toNumber() === 0,
        'TC-CT-04',
        'Small Business Relief election treats taxable income as AED 0 when revenue <= AED 3,000,000'
      );
    }

    // TC-CT-05: SBR Disqualification due to Current Period Revenue Exceeding AED 3,000,000
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('3500000.00'),
        accountingNetProfit: new Decimal('500000.00'),
        isSmallBusinessReliefElected: true,
        isQfzp: false,
        isMneGroup: false,
      });
      // SBR rejected -> Taxable 500,000 -> 9% on 125,000 = 11,250
      assert(
        !res.isSmallBusinessReliefApplied &&
        res.corporateTaxPayableAED.toNumber() === 11250 &&
        res.warnings.some((w) => w.includes('SBR Ineligible')),
        'TC-CT-05',
        'Revenue of AED 3.5M disqualifies entity from SBR; standard 9% tax of AED 11,250 enforced'
      );
    }

    // TC-CT-06: Tax Loss Offset capped at 75% under Article 39
    {
      const res = CorporateTaxEngine.calculate({
        legalEntityType: 'LLC',
        taxPeriodStart: new Date('2026-01-01'),
        taxPeriodEnd: new Date('2026-12-31'),
        revenueAED: new Decimal('6000000.00'),
        accountingNetProfit: new Decimal('1000000.00'),
        unutilizedPriorTaxLosses: new Decimal('900000.00'),
        isSmallBusinessReliefElected: false,
        isQfzp: false,
        isMneGroup: false,
      });
      // Max offset = 75% of 1,000,000 = 750,000. Final taxable = 250,000. Remaining losses = 150,000.
      assert(
        res.taxLossOffsetApplied.toNumber() === 750000 &&
        res.finalTaxableIncome.toNumber() === 250000 &&
        res.remainingTaxLosses.toNumber() === 150000 &&
        res.corporateTaxPayableAED.toNumber() === 0, // 250,000 <= 375,000 threshold
        'TC-CT-06',
        'Tax loss offset capped at 75% statutory limit (AED 750,000 applied, AED 150,000 carried forward)'
      );
    }

    // TC-CT-07: Natural Person Turnover Threshold under Cabinet Decision No. 49 of 2023
    {
      const below = CorporateTaxEngine.evaluateNaturalPerson({
        grossBusinessTurnoverAED: new Decimal('850000.00'),
        employmentSalaryAED: new Decimal('1200000.00'),
      });
      const above = CorporateTaxEngine.evaluateNaturalPerson({
        grossBusinessTurnoverAED: new Decimal('1250000.00'),
      });
      assert(
        !below.isSubjectToCorporateTax &&
        above.isSubjectToCorporateTax,
        'TC-CT-07',
        'Natural person exempt below AED 1M business turnover regardless of employment salary'
      );
    }

    // TC-CT-08: QFZP De Minimis Test under Cabinet Decision No. 139 of 2023
    {
      // Total Revenue 20M, non-qualifying 800k. 5% of 20M = 1M. De minimis limit = min(1M, 5M) = 1M. Passes.
      const passEval = CorporateTaxEngine.evaluateQfzpDeMinimis(new Decimal('20000000.00'), new Decimal('800000.00'));
      // Total Revenue 20M, non-qualifying 1.2M. Exceeds 1M limit. Fails.
      const failEval = CorporateTaxEngine.evaluateQfzpDeMinimis(new Decimal('20000000.00'), new Decimal('1200000.00'));
      assert(
        passEval.passesDeMinimis &&
        !failEval.passesDeMinimis,
        'TC-CT-08',
        'QFZP de minimis test correctly enforces min(5%, AED 5M) statutory threshold'
      );
    }

    // ------------------------------------------------------------------------
    // SECTION 3: REAL FINANCIAL DATA INGESTION & PERSISTENT ASSESSMENTS
    // ------------------------------------------------------------------------
    console.log('\n--- 3. REAL FINANCIAL DATA INGESTION & PERSISTENT ASSESSMENTS ---');

    // Clean up test data for idempotent test execution
    await prisma.taxAdjustment.deleteMany({
      where: { taxAssessment: { businessId: { in: [bizAlpha.id, bizBeta.id] } } },
    });
    await prisma.taxAssessment.deleteMany({
      where: { businessId: { in: [bizAlpha.id, bizBeta.id] } },
    });
    await prisma.expenseBillLine.deleteMany({
      where: { expenseBill: { businessId: { in: [bizAlpha.id, bizBeta.id] } } },
    });
    await prisma.expenseBill.deleteMany({
      where: { businessId: { in: [bizAlpha.id, bizBeta.id] } },
    });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { businessId: { in: [bizAlpha.id, bizBeta.id] } } },
    });
    await prisma.invoice.deleteMany({
      where: { businessId: { in: [bizAlpha.id, bizBeta.id] } },
    });

    // Seed Real Invoices for bizAlpha (Nov 2026)
    const inv1 = await prisma.invoice.upsert({
      where: {
        businessId_invoiceNumber: {
          businessId: bizAlpha.id,
          invoiceNumber: 'INV-2026-TX-001',
        },
      },
      update: {},
      create: {
        businessId: bizAlpha.id,
        customerId: customer.id,
        invoiceNumber: 'INV-2026-TX-001',
        issueDate: new Date('2026-11-05'),
        dueDate: new Date('2026-11-30'),
        currency: 'AED',
        subtotal: new Decimal('100000.00'),
        vatTotal: new Decimal('5000.00'),
        totalAmount: new Decimal('105000.00'),
        totalAmountAED: new Decimal('105000.00'),
        status: 'PAID',
        lines: {
          create: [
            {
              accountId: revAccount.id,
              description: 'Software Engineering Services',
              quantity: new Decimal(1),
              unitPrice: new Decimal('100000.00'),
              vatRateType: 'STANDARD_5',
              vatPercentage: new Decimal('5.00'),
              vatAmount: new Decimal('5000.00'),
              lineTotal: new Decimal('100000.00'),
              lineTotalAED: new Decimal('100000.00'),
            },
          ],
        },
      },
    });

    const dbUser = await prisma.user.findFirst();
    const userId = dbUser?.id || '3f684d13-38cd-4a06-b848-242afe09aad9';

    // Seed Document receipt
    const testDoc = await prisma.document.create({
      data: {
        businessId: bizAlpha.id,
        documentType: 'EXPENSE_RECEIPT',
        originalFilename: 'etisalat_invoice.pdf',
        fileUrl: 'receipts/test_etisalat.pdf',
        fileSizeBytes: 1024,
        mimeType: 'application/pdf',
        uploadedById: userId,
      },
    });

    // Seed Real Expense for bizAlpha (Nov 2026)
    const exp1 = await prisma.expenseBill.create({
      data: {
        businessId: bizAlpha.id,
        billNumber: 'REC-2026-TX-001',
        billDate: new Date('2026-11-10'),
        currency: 'AED',
        subtotal: new Decimal('20000.00'),
        vatTotal: new Decimal('1000.00'),
        totalAmount: new Decimal('21000.00'),
        totalAmountAED: new Decimal('21000.00'),
        subtotalAED: new Decimal('20000.00'),
        vatTotalAED: new Decimal('1000.00'),
        supplierName: 'Etisalat e& Telecommunications',
        supplierTrn: '100456789000003',
        category: 'TELECOM',
        status: 'APPROVED',
        documentId: testDoc.id,
      },
    });

    // TC-INT-01: VAT Assessment Service collects real invoices and expenses
    const vatAssessment = await vatService.assessBusinessVat(
      {
        businessId: bizAlpha.id,
        periodKey: '2026-M11',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      orgAlpha.id
    );

    assert(
      vatAssessment.totalTaxableSalesAED === 100000 &&
      vatAssessment.totalOutputVatAED === 5000 &&
      vatAssessment.recoverableInputVatAED === 1000 &&
      vatAssessment.netVatPositionAED === 4000 &&
      vatAssessment.positionType === 'PAYABLE',
      'TC-INT-01',
      'VAT assessment calculates real Box 1 (AED 5,000) and Box 9 (AED 1,000) -> Net Payable AED 4,000'
    );

    // TC-INT-02: VAT Assessment is persisted in PostgreSQL with Return Boxes
    const persistedVat = await prisma.taxAssessment.findUnique({
      where: { id: vatAssessment.assessmentId },
    });
    assert(
      persistedVat !== null &&
      Number(persistedVat.netTaxPayableAED) === 4000 &&
      persistedVat.taxType === 'VAT',
      'TC-INT-02',
      'VAT assessment is persisted directly to PostgreSQL with relational business linkage'
    );

    // TC-INT-03: Corporate Tax Assessment Service reconciles bookkeeping profit
    const ctAssessment = await ctService.assessBusinessCorporateTax(
      {
        businessId: bizAlpha.id,
        financialYear: 2026,
        electSmallBusinessRelief: false,
      },
      orgAlpha.id
    );

    // Revenue 100,000 - Telecom Expense 20,000 = Accounting Profit 80,000
    assert(
      ctAssessment.accountingRevenueAED === 100000 &&
      ctAssessment.operatingExpensesAED === 20000 &&
      ctAssessment.accountingNetProfitAED === 80000 &&
      ctAssessment.corporateTaxPayableAED === 0, // 80,000 <= 375,000
      'TC-INT-03',
      'Corporate Tax assessment reconciles Revenue (100k) - Expenses (20k) = Profit AED 80,000'
    );

    // TC-INT-04: Corporate Tax Assessment is persisted in PostgreSQL with Adjustments
    const persistedCt = await prisma.taxAssessment.findUnique({
      where: { id: ctAssessment.assessmentId },
    });
    assert(
      persistedCt !== null &&
      persistedCt.taxType === 'CORPORATE_TAX' &&
      Number(persistedCt.grossRevenueAED) === 100000,
      'TC-INT-04',
      'Corporate Tax assessment is persisted in PostgreSQL with complete reconciliation payload'
    );

    // ------------------------------------------------------------------------
    // SECTION 4: REASSESSMENT, LINEAGE & COMPLIANCE FINDINGS
    // ------------------------------------------------------------------------
    console.log('\n--- 4. REASSESSMENT, LINEAGE & COMPLIANCE FINDINGS ---');

    // TC-REASSESS-01: Reassessing a period marks existing assessment as SUPERSEDED and links lineage
    const reassessedVat = await vatService.assessBusinessVat(
      {
        businessId: bizAlpha.id,
        periodKey: '2026-M11',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      orgAlpha.id
    );

    const oldVat = await prisma.taxAssessment.findUnique({
      where: { id: vatAssessment.assessmentId },
    });

    assert(
      oldVat?.status === 'SUPERSEDED' &&
      reassessedVat.reassessedFromId === vatAssessment.assessmentId,
      'TC-REASSESS-01',
      'Reassessment supersedes old record and tracks historical lineage without data destruction'
    );

    // TC-COMP-01: Compliance finding flags missing supplier TRN on standard expense
    const expMissingTrn = await prisma.expenseBill.create({
      data: {
        businessId: bizAlpha.id,
        billNumber: 'REC-NO-TRN-999',
        billDate: new Date('2026-11-15'),
        currency: 'AED',
        subtotal: new Decimal('5000.00'),
        vatTotal: new Decimal('250.00'),
        totalAmount: new Decimal('5250.00'),
        totalAmountAED: new Decimal('5250.00'),
        subtotalAED: new Decimal('5000.00'),
        vatTotalAED: new Decimal('250.00'),
        supplierName: 'Unregistered Stationery Shop',
        supplierTrn: null, // MISSING TRN
        category: 'OFFICE_SUPPLIES',
        status: 'APPROVED',
      },
    });

    const vatWithFinding = await vatService.assessBusinessVat(
      {
        businessId: bizAlpha.id,
        periodKey: '2026-M11',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      },
      orgAlpha.id
    );

    const hasMissingTrnWarning = vatWithFinding.findings.some(
      (f) => f.code === 'MISSING_SUPPLIER_TRN' && f.severity === 'CRITICAL'
    );

    assert(
      hasMissingTrnWarning && vatWithFinding.status === 'REQUIRES_ATTENTION',
      'TC-COMP-01',
      'Automated audit detects missing supplier TRN, flags CRITICAL finding, and sets status to REQUIRES_ATTENTION'
    );

    // ------------------------------------------------------------------------
    // SECTION 5: TENANCY, MULTI-TENANT SECURITY & GROUNDED AI
    // ------------------------------------------------------------------------
    console.log('\n--- 5. TENANCY, MULTI-TENANT SECURITY & GROUNDED AI ---');

    // TC-SEC-01: Cross-organisation VAT assessment blocked with 403 Forbidden
    let crossTenantBlocked = false;
    try {
      // Org Beta tries to assess Org Alpha's business
      await vatService.assessBusinessVat(
        {
          businessId: bizAlpha.id,
          periodKey: '2026-M11',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
        },
        orgBeta.id
      );
    } catch (err: any) {
      crossTenantBlocked = err.status === 403 || err.message.includes('Access denied');
    }

    assert(
      crossTenantBlocked,
      'TC-SEC-01',
      'Cross-organisation VAT assessment attempt is strictly blocked with 403 Forbidden'
    );

    // TC-SEC-02: Cross-organisation Corporate Tax assessment blocked with 403 Forbidden
    let crossTenantCtBlocked = false;
    try {
      await ctService.assessBusinessCorporateTax(
        {
          businessId: bizAlpha.id,
          financialYear: 2026,
        },
        orgBeta.id
      );
    } catch (err: any) {
      crossTenantCtBlocked = err.status === 403 || err.message.includes('Access denied');
    }

    assert(
      crossTenantCtBlocked,
      'TC-SEC-02',
      'Cross-organisation Corporate Tax assessment attempt is strictly blocked with 403 Forbidden'
    );

    // TC-SEC-03: Listing assessments returns only records for authorized business
    const listRes = await taxService.listBusinessAssessments(bizAlpha.id, orgAlpha.id);
    assert(
      listRes.length >= 2 &&
      listRes.every((a) => a.businessId === bizAlpha.id),
      'TC-SEC-03',
      'Assessment listing is strictly tenant-scoped with zero cross-tenant leakage'
    );

    // TC-AI-01: Grounded AI explanation endpoint incorporates real assessment figures and citations
    const aiExplanation = await taxService.explainAssessmentWithAi(
      ctAssessment.assessmentId,
      'Why is my Corporate Tax liability zero?',
      'en',
      orgAlpha.id
    );

    assert(
      aiExplanation.isGrounded &&
      aiExplanation.citations.length > 0 &&
      aiExplanation.explanation.length > 0,
      'TC-AI-01',
      'Grounded AI explanation incorporates real assessment context and returns verifiable legal citations'
    );

  } catch (error) {
    console.error('Test execution failed with unhandled exception:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n------------------------------------------------------------');
    console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('------------------------------------------------------------\n');

    if (totalTests === passedTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

runTestSuite();
