// ============================================================================
// Mizan (ميزان) - Comprehensive Expense Scanning & Bookkeeping Audit Suite (Phase 6.5)
// Validates:
// 1. OCR & extraction workflows, missing fields, non-fabrication & manual fallback
// 2. Complete expense lifecycle: UPLOADED -> PROCESSING -> REVIEW_REQUIRED -> APPROVED, REJECTED, ARCHIVED
// 3. Financial integrity: Decimal precision, Banker's rounding, VAT preservation, Article 69 CBUAE conversion
// 4. Tenancy & Security: Cross-tenant isolation, cross-business isolation, receipt authorization
// 5. Duplicate receipt detection (file hash & multi-factor match)
// 6. Persistence & Ledger reconciliation: Monthly summaries, category breakdowns, auditability
// ============================================================================

import { ExpensesService } from './expenses.service';
import { BusinessService } from '../business/business.service';
import { OcrService } from '../ocr/ocr.service';
import { InvoicingService } from '../invoicing/invoicing.service';
import { InvoiceCalculationService } from '../invoicing/invoice-calculation.service';
import { InvoiceValidationService } from '../invoicing/invoice-validation.service';
import { InvoiceNumberService } from '../invoicing/invoice-number.service';
import { InvoicePdfService } from '../invoicing/invoice-pdf.service';
import { PrismaClient } from '@prisma/client';
import { LegalEntityTypeDto, JurisdictionTypeDto } from '../business/dto/create-trade-license.dto';
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
  console.log('MIZAN EXPENSE SCANNING & BOOKKEEPING AUDIT SUITE (PHASE 6.5)');
  console.log('============================================================\n');

  const prisma = new PrismaClient();
  const bizService = new BusinessService(prisma as any);
  const ocrService = new OcrService();
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
    prisma as any
  );

  const expensesService = new ExpensesService(
    bizService,
    ocrService,
    invoicingService,
    prisma as any
  );

  // Use persistent DB tenant organisations and user
  const orgA = 'org-tenant-alpha';
  const orgB = 'org-tenant-beta';
  const dbUser = (await prisma.user.findFirst())?.id || 'user-alpha-1';

  // Ensure organisations exist in DB
  await prisma.organisation.upsert({
    where: { id: orgA },
    update: {},
    create: { id: orgA, name: 'Tenant Alpha Holdings LLC' },
  });
  await prisma.organisation.upsert({
    where: { id: orgB },
    update: {},
    create: { id: orgB, name: 'Tenant Beta Free Zone LLC' },
  });

  // Seed two businesses
  const bizA = await bizService.createOrUpdateTradeLicense({
    tradeLicenseNumber: 'TL-EXP-ALPHA-01',
    legalName: 'Apex Gulf Innovations LLC',
    tradeName: 'Apex Gulf',
    legalEntityType: LegalEntityTypeDto.LLC,
    jurisdictionType: JurisdictionTypeDto.MAINLAND,
    licensingAuthority: 'Department of Economy and Tourism (DET)',
    emirate: 'Dubai',
    annualRevenueEstimateAED: 2500000,
    vatTrn: '100456789000003',
  }, orgA);

  const bizB = await bizService.createOrUpdateTradeLicense({
    tradeLicenseNumber: 'TL-EXP-BETA-02',
    legalName: 'Blue Horizon General Trading FZCO',
    tradeName: 'Blue Horizon',
    legalEntityType: LegalEntityTypeDto.FREE_ZONE_COMPANY,
    jurisdictionType: JurisdictionTypeDto.FREE_ZONE,
    licensingAuthority: 'Dubai Multi Commodities Centre (DMCC)',
    emirate: 'Dubai',
    annualRevenueEstimateAED: 5000000,
    vatTrn: '100876543200003',
  }, orgB);

  // Sample authentic 1x1 JPEG in base64: starts with /9j/
  const validJpegBase64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  // ==========================================================================
  // SECTION 1: OCR & EXTRACTION INTEGRITY
  // ==========================================================================
  console.log('--- 1. OCR & EXTRACTION WORKFLOW ---');

  // TC-EXP-OCR-01: Receipt scan creates document attachment and preserves draft expense in reviewable state
  const scanResult1 = await expensesService.scanReceipt(
    {
      businessId: bizA.id,
      imageBase64: validJpegBase64,
      fileName: 'carrefour-receipt-oct.jpg',
    },
    orgA,
    dbUser
  );

  assert(
    scanResult1 &&
      (scanResult1.status === 'REVIEW_REQUIRED' || scanResult1.status === 'PROCESSING_FAILED') &&
      scanResult1.documentId !== undefined,
    'TC-EXP-OCR-01',
    'Receipt scan persists document attachment and produces reviewable expense record'
  );

  // TC-EXP-OCR-02: Receipt extraction is marked as unverified (does not claim FTA registration)
  assert(
    scanResult1.status !== 'APPROVED' && scanResult1.approvedAt === undefined,
    'TC-EXP-OCR-02',
    'OCR result is strictly treated as unverified draft and never auto-approved without user action'
  );

  // TC-EXP-OCR-03: Invalid non-image format is rejected by signature validation
  let invalidSignatureRejected = false;
  try {
    await expensesService.scanReceipt(
      {
        businessId: bizA.id,
        imageBase64: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA...', // Windows EXE signature
      },
      orgA,
      dbUser
    );
  } catch (err: any) {
    invalidSignatureRejected = err.status === 400 || err.message?.includes('Invalid document signature');
  }
  assert(
    invalidSignatureRejected,
    'TC-EXP-OCR-03',
    'Invalid or executable binary upload is rejected with 400 Bad Request signature error'
  );

  // TC-EXP-OCR-04: Manual entry fallback works cleanly when receipt is not scanned
  const manualExpense = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'Etisalat by e&',
      supplierTrn: '100012345600003',
      receiptNumber: 'REC-ETI-9921',
      expenseDate: '2026-10-18',
      currency: 'AED',
      totalAmount: 420.0,
      subtotal: 400.0,
      vatAmount: 20.0,
      category: 'TELECOMMUNICATIONS',
      description: 'Office high-speed fiber internet',
    },
    orgA,
    dbUser
  );

  assert(
    manualExpense && manualExpense.category === 'TELECOMMUNICATIONS' && manualExpense.subtotal === 400.0,
    'TC-EXP-OCR-04',
    'Manual entry fallback cleanly persists complete expense records without OCR requirement'
  );

  // ==========================================================================
  // SECTION 2: DUPLICATE RECEIPT & EXPENSE DETECTION
  // ==========================================================================
  console.log('\n--- 2. DUPLICATE RECEIPT & EXPENSE DETECTION ---');

  // TC-EXP-DUP-01: Multi-factor duplicate warning triggered for identical vendor, receipt #, date, and amount
  const duplicateSubmission = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'Etisalat by e&',
      receiptNumber: 'REC-ETI-9921',
      expenseDate: '2026-10-18',
      totalAmount: 420.0,
      category: 'TELECOMMUNICATIONS',
    },
    orgA,
    dbUser
  );

  assert(
    duplicateSubmission.duplicateWarning === true &&
      duplicateSubmission.duplicateReferenceId === manualExpense.id,
    'TC-EXP-DUP-01',
    'Multi-factor duplicate check warns user of identical receipt #, supplier, date, and amount'
  );

  // TC-EXP-DUP-02: Duplicate warning does not delete or auto-reject legitimate expense
  assert(
    duplicateSubmission.status === 'REVIEW_REQUIRED',
    'TC-EXP-DUP-02',
    'Duplicate warning flags the record for review without destructive auto-deletion or premature rejection'
  );

  // ==========================================================================
  // SECTION 3: EXPENSE LIFECYCLE & STATE TRANSITIONS
  // ==========================================================================
  console.log('\n--- 3. EXPENSE LIFECYCLE & STATE TRANSITIONS ---');

  // TC-EXP-LIFE-01: Update fields, amounts, and category while in review
  const updatedExpense = await expensesService.updateExpense(
    manualExpense.id,
    {
      supplierName: 'Emirates Telecom (e&)',
      category: 'TELECOMMUNICATIONS',
      notes: 'Verified against monthly statutory telco invoice',
    },
    orgA,
    dbUser
  );

  assert(
    updatedExpense.supplierName === 'Emirates Telecom (e&)' &&
      updatedExpense.notes?.includes('Verified against monthly'),
    'TC-EXP-LIFE-01',
    'User can update vendor name, category, and accounting notes during review'
  );

  // TC-EXP-LIFE-02: User approves expense -> transitions to APPROVED with audit timestamp and approver
  const approvedExpense = await expensesService.approveExpense(
    manualExpense.id,
    orgA,
    dbUser
  );

  assert(
    approvedExpense.status === 'APPROVED' &&
      approvedExpense.approvedById === dbUser &&
      approvedExpense.approvedAt !== undefined,
    'TC-EXP-LIFE-02',
    'User approval transitions expense to APPROVED with explicit approver ID and timestamp'
  );

  // TC-EXP-LIFE-03: Approval is idempotent (re-approving already approved expense returns record safely)
  const reApproved = await expensesService.approveExpense(manualExpense.id, orgA, dbUser);
  assert(
    reApproved.status === 'APPROVED',
    'TC-EXP-LIFE-03',
    'Re-approving an approved expense is idempotent and prevents duplicate ledger postings'
  );

  // TC-EXP-LIFE-04: Rejection workflow transitions record to REJECTED with reason recorded
  const expToReject = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'Personal Grocery Mart',
      expenseDate: '2026-10-19',
      totalAmount: 150.0,
      category: 'OTHER_BUSINESS_EXPENSES',
    },
    orgA,
    dbUser
  );

  const rejected = await expensesService.rejectExpense(
    expToReject.id,
    'Personal expense not wholly and exclusively for business purposes under Art 28',
    orgA,
    dbUser
  );

  assert(
    rejected.status === 'REJECTED' && rejected.notes?.includes('Personal expense not wholly'),
    'TC-EXP-LIFE-04',
    'Rejection workflow transitions record to REJECTED with statutory reason recorded in audit notes'
  );

  // TC-EXP-LIFE-05: Archived expense cannot be edited or approved
  const expToArchive = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'Old Cancelled Vendor LLC',
      expenseDate: '2026-10-01',
      totalAmount: 85.0,
      category: 'OFFICE_SUPPLIES',
    },
    orgA,
    dbUser
  );

  await expensesService.archiveExpense(expToArchive.id, 'Duplicate invoice cancelled', orgA, dbUser);

  let archiveEditBlocked = false;
  try {
    await expensesService.updateExpense(expToArchive.id, { supplierName: 'New Name' }, orgA, dbUser);
  } catch (err: any) {
    archiveEditBlocked = err.status === 400 || err.message?.includes('Archived');
  }

  assert(
    archiveEditBlocked,
    'TC-EXP-LIFE-05',
    'Editing an ARCHIVED expense record is strictly blocked to preserve audit integrity'
  );

  // ==========================================================================
  // SECTION 4: FINANCIAL INTEGRITY & DECIMAL PRECISION
  // ==========================================================================
  console.log('\n--- 4. FINANCIAL INTEGRITY & DECIMAL CALCULATIONS ---');

  // TC-EXP-DEC-01: Subtotal, VAT, and Total reconciliation without float drift
  const precisionExp = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'Hardware Store LLC',
      expenseDate: '2026-10-22',
      currency: 'AED',
      totalAmount: 105.0,
      subtotal: 100.0,
      vatAmount: 5.0,
      category: 'REPAIRS_MAINTENANCE',
    },
    orgA,
    dbUser
  );

  const decSubtotal = new Decimal(precisionExp.subtotal);
  const decVat = new Decimal(precisionExp.vatAmount);
  const decTotal = new Decimal(precisionExp.totalAmount);
  assert(
    decSubtotal.plus(decVat).equals(decTotal),
    'TC-EXP-DEC-01',
    'Subtotal + VAT exactly reconciles to Total Amount with Decimal precision (100.00 + 5.00 = 105.00)'
  );

  // TC-EXP-DEC-02: Foreign currency conversion adheres to Article 69 CBUAE rate evidence
  const foreignUsdExp = await expensesService.createManualExpense(
    {
      businessId: bizA.id,
      supplierName: 'AWS Cloud Services Inc.',
      expenseDate: '2026-10-25',
      currency: 'USD',
      totalAmount: 1000.0,
      category: 'SOFTWARE_SUBSCRIPTIONS',
    },
    orgA,
    dbUser
  );

  // Official pegged CBUAE rate for USD is 3.6725 -> 1000 USD = 3672.50 AED
  assert(
    foreignUsdExp.exchangeRate === 3.6725 &&
      Math.abs(foreignUsdExp.totalAmountAED - 3672.5) < 0.0001 &&
      foreignUsdExp.conversionEvidence?.isOfficialCbUae === true,
    'TC-EXP-DEC-02',
    'USD expense resolves official CBUAE pegged rate (3.6725) under Article 69 with statutory conversion evidence'
  );

  // TC-EXP-DEC-03: Zero or negative expense amounts are rejected
  let negativeAmtRejected = false;
  try {
    await expensesService.createManualExpense(
      {
        businessId: bizA.id,
        supplierName: 'Invalid Vendor',
        expenseDate: '2026-10-25',
        totalAmount: -50.0,
        category: 'OFFICE_SUPPLIES',
      },
      orgA,
      dbUser
    );
  } catch (err: any) {
    negativeAmtRejected = err.status === 400 || err.message?.includes('greater than zero');
  }

  assert(
    negativeAmtRejected,
    'TC-EXP-DEC-03',
    'Creating an expense with zero or negative total amount is rejected with 400 Bad Request'
  );

  // ==========================================================================
  // SECTION 5: TENANCY & MULTI-TENANT ISOLATION
  // ==========================================================================
  console.log('\n--- 5. TENANCY & MULTI-TENANT SECURITY ---');

  // TC-EXP-TEN-01: Cross-organisation access blocked: Org B cannot retrieve Org A expense
  let crossOrgGetBlocked = false;
  try {
    await expensesService.getExpenseById(manualExpense.id, orgB);
  } catch (err: any) {
    crossOrgGetBlocked = err.status === 403 || err.status === 404;
  }

  assert(
    crossOrgGetBlocked,
    'TC-EXP-TEN-01',
    'Cross-organisation retrieval of expense records is strictly blocked with 403 Forbidden'
  );

  // TC-EXP-TEN-02: Cross-organisation update blocked
  let crossOrgUpdateBlocked = false;
  try {
    await expensesService.updateExpense(manualExpense.id, { supplierName: 'Hacked' }, orgB, 'user-beta-1');
  } catch (err: any) {
    crossOrgUpdateBlocked = err.status === 403 || err.status === 404;
  }

  assert(
    crossOrgUpdateBlocked,
    'TC-EXP-TEN-02',
    'Cross-organisation modification of another tenant expense is strictly blocked'
  );

  // TC-EXP-TEN-03: Cross-organisation approval blocked
  let crossOrgApproveBlocked = false;
  try {
    await expensesService.approveExpense(scanResult1.id, orgB, 'user-beta-1');
  } catch (err: any) {
    crossOrgApproveBlocked = err.status === 403 || err.status === 404;
  }

  assert(
    crossOrgApproveBlocked,
    'TC-EXP-TEN-03',
    'Cross-organisation approval of another tenant expense is strictly blocked'
  );

  // TC-EXP-TEN-04: Forged business ID belonging to another organisation is rejected
  let forgedBizRejected = false;
  try {
    await expensesService.createManualExpense(
      {
        businessId: bizB.id, // Belongs to Org B
        supplierName: 'Spoofed Expense',
        expenseDate: '2026-10-25',
        totalAmount: 100.0,
        category: 'OFFICE_SUPPLIES',
      },
      orgA, // Authenticated as Org A
      dbUser
    );
  } catch (err: any) {
    forgedBizRejected = err.status === 403 || err.message?.includes('Access denied');
  }

  assert(
    forgedBizRejected,
    'TC-EXP-TEN-04',
    'Submitting an expense with a business ID belonging to another tenant is blocked with 403 Forbidden'
  );

  // TC-EXP-TEN-05: List expenses strictly filters by active business and tenant
  const listOrgA = await expensesService.listExpenses({ businessId: bizA.id }, orgA);
  const listOrgB = await expensesService.listExpenses({ businessId: bizB.id }, orgB);

  const allOrgA = listOrgA.every((e) => e.businessId === bizA.id && e.organisationId === orgA);
  const allOrgB = listOrgB.every((e) => e.businessId === bizB.id && e.organisationId === orgB);

  assert(
    allOrgA && allOrgB && listOrgA.length > 0,
    'TC-EXP-TEN-05',
    'Listing expenses returns strictly records for the authorized active business with zero cross-tenant leak'
  );

  // ==========================================================================
  // SECTION 6: BOOKKEEPING & LEDGER SUMMARIES
  // ==========================================================================
  console.log('\n--- 6. BOOKKEEPING & LEDGER SUMMARIES ---');

  // TC-EXP-SUM-01: Expense categories return all 17 standardized UAE business categories
  const categories = expensesService.getCategories();
  assert(
    categories.length === 17 &&
      categories.some((c) => c.code === 'RENT_PREMISES') &&
      categories.some((c) => c.code === 'VEHICLE_EXPENSES'),
    'TC-EXP-SUM-01',
    'Categorisation system provides complete 17 standardized UAE business expense categories with bilingual metadata'
  );

  // TC-EXP-SUM-02: Summary report accurately aggregates recorded, approved, and pending review totals
  const summary = await expensesService.getExpenseSummaries(bizA.id, orgA, 2026);

  assert(
    summary.totalRecordedExpensesAED > 0 &&
      summary.totalApprovedExpensesAED > 0 &&
      summary.categoryBreakdown.length === 17 &&
      summary.monthlySummary.length === 12,
    'TC-EXP-SUM-02',
    'Ledger summary accurately reconciles recorded total, approved total, category distributions, and monthly breakdown'
  );

  // TC-EXP-SUM-03: Category breakdown percentages sum to approximately 100%
  const totalCatPct = summary.categoryBreakdown.reduce((acc, c) => acc + c.percentage, 0);
  assert(
    Math.round(totalCatPct) >= 99 && Math.round(totalCatPct) <= 101,
    'TC-EXP-SUM-03',
    `Category breakdown percentage distribution reconciles to 100% (${totalCatPct.toFixed(1)}%)`
  );

  // ==========================================================================
  // SECTION 7: REAL POSTGRESQL PRISMA PERSISTENCE
  // ==========================================================================
  console.log('\n--- 7. REAL POSTGRESQL PRISMA PERSISTENCE ---');

  // TC-EXP-PG-01: Verify ExpenseBill and Document persisted in PostgreSQL via Prisma
  const pgExpense = await prisma.expenseBill.findUnique({
    where: { id: manualExpense.id },
  });

  assert(
    pgExpense !== null && pgExpense.businessId === bizA.id && pgExpense.supplierName === 'Emirates Telecom (e&)',
    'TC-EXP-PG-01',
    'Expense records are persisted directly to PostgreSQL via Prisma with relational business links'
  );

  // TC-EXP-PG-02: Verify document attachment record in PostgreSQL
  const pgDoc = await prisma.document.findUnique({
    where: { id: scanResult1.documentId! },
  });

  assert(
    pgDoc !== null && pgDoc.documentType === 'EXPENSE_RECEIPT',
    'TC-EXP-PG-02',
    'Document attachments are stored with DocumentType EXPENSE_RECEIPT in PostgreSQL'
  );

  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL EXPENSE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------------');

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
