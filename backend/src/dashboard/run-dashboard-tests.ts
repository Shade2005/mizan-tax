// ============================================================================
// Mizan (ميزان) - Phase 6.7 Comprehensive Verification Test Suite
// Verifies:
// 1. Unified Dashboard aggregation from real invoices & expenses
// 2. Tax Readiness assessment engine (multi-category scoring, blockers, snapshots)
// 3. Tax Calendar statutory deadlines (VAT 28th, CT 9 months, FTA Dec 3/2024)
// 4. Compliance Action Centre (deduplication & resolution workflow)
// 5. Reporting Engine (P&L, VAT 201, CT Schedule, Audit in CSV & HTML)
// 6. Multi-tenant security boundary enforcement (cross-org blocked with 403)
// ============================================================================

import { PrismaClient, LegalEntityType, JurisdictionType, TaxType, ReportType, ReportFormat } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { DashboardService } from './dashboard.service';
import { ReadinessService } from './readiness.service';
import { TaxCalendarService } from './tax-calendar.service';
import { ComplianceActionService } from './compliance-action.service';
import { ReportsService } from './reports.service';

const prisma = new PrismaClient();

const readinessService = new ReadinessService(prisma as any);
const taxCalendarService = new TaxCalendarService(prisma as any);
const complianceActionService = new ComplianceActionService(prisma as any);
const reportsService = new ReportsService(prisma as any, readinessService);
const dashboardService = new DashboardService(
  prisma as any,
  readinessService,
  taxCalendarService,
  complianceActionService
);

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failedTests++;
  }
}

async function runDashboardTests() {
  console.log('================================================================');
  console.log('MIZAN PHASE 6.7: DASHBOARD, READINESS, CALENDAR & REPORTS TESTS');
  console.log('================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);

  // --------------------------------------------------------------------------
  // SETUP TEST DATA: TWO ORGANISATIONS FOR TENANT ISOLATION
  // --------------------------------------------------------------------------
  console.log('Step 1: Setting up multi-tenant test entities...');

  const orgA = await prisma.organisation.create({
    data: {
      name: `Al Mizan Tech Org A ${testSuffix}`,
      legalName: `Al Mizan Tech Org A LLC`,
    },
  });

  const orgB = await prisma.organisation.create({
    data: {
      name: `Competitor Org B ${testSuffix}`,
      legalName: `Competitor Org B FZE`,
    },
  });

  const userA = await prisma.user.create({
    data: {
      email: `founder-a-${testSuffix}@mizan.ae`,
      passwordHash: 'hash_test_12345',
      fullName: 'Rashid Al Maktoum',
      memberships: {
        create: {
          organisationId: orgA.id,
          role: 'ADMIN',
        },
      },
    },
  });

  const bizA = await prisma.business.create({
    data: {
      organisationId: orgA.id,
      legalName: `Mizan Enterprises LLC ${testSuffix}`,
      tradeName: `Mizan Trading`,
      tradeLicenseNumber: `CN-99${testSuffix}`,
      licensingAuthority: 'Dubai Economy and Tourism (DET)',
      licenseIssueDate: new Date('2024-03-01'),
      licenseExpiryDate: new Date('2027-03-01'), // Valid
      legalEntityType: LegalEntityType.LLC,
      jurisdictionType: JurisdictionType.MAINLAND,
      emirate: 'Dubai',
      financialYearStartDay: 1,
      financialYearStartMon: 1,
    },
  });

  const bizB = await prisma.business.create({
    data: {
      organisationId: orgB.id,
      legalName: `Competitor FZE ${testSuffix}`,
      tradeLicenseNumber: `FZ-11${testSuffix}`,
      licensingAuthority: 'DMCC',
      legalEntityType: LegalEntityType.FREE_ZONE_COMPANY,
      jurisdictionType: JurisdictionType.FREE_ZONE,
      emirate: 'Dubai',
    },
  });

  // Setup tax registration for Biz A: VAT Registered
  await prisma.taxRegistration.create({
    data: {
      businessId: bizA.id,
      taxType: TaxType.VAT,
      trn: `100999999900003`,
      status: 'REGISTERED',
    },
  });

  // Corporate tax unregistered for now to test blocker detection
  console.log('  Entities initialized successfully.\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: MULTI-TENANT ISOLATION
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Multi-Tenant Boundary Enforcement');
  try {
    // Org A user requesting Biz B data must be rejected
    let threw = false;
    try {
      await dashboardService.getDashboardOverview(bizB.id, orgA.id);
    } catch (err: any) {
      threw = true;
      assert(err.status === 403 || err.name === 'ForbiddenException', 'Cross-tenant dashboard overview access is blocked with 403 Forbidden');
    }
    if (!threw) {
      assert(false, 'Cross-tenant dashboard overview access is blocked with 403 Forbidden', 'Expected ForbiddenException');
    }

    // Reports cross-tenant check
    threw = false;
    try {
      await reportsService.generateReport(
        { businessId: bizB.id, reportType: ReportType.PROFIT_AND_LOSS },
        orgA.id,
        userA.id
      );
    } catch (err: any) {
      threw = true;
      assert(err.status === 403 || err.name === 'ForbiddenException', 'Cross-tenant report generation is blocked with 403 Forbidden');
    }
    if (!threw) {
      assert(false, 'Cross-tenant report generation is blocked with 403 Forbidden', 'Expected ForbiddenException');
    }
  } catch (err: any) {
    console.error('Tenant isolation test error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: FINANCIAL METRICS & DASHBOARD AGGREGATION
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Real Financial Ledger & Metrics Aggregation');
  try {
    // Create customer
    const testCust = await prisma.customer.create({
      data: {
        businessId: bizA.id,
        name: 'Emirates Telecom',
        trn: '100888777600003',
      },
    });

    // Add real invoices
    const inv1 = await prisma.invoice.create({
      data: {
        businessId: bizA.id,
        customerId: testCust.id,
        invoiceNumber: `INV-2026-001-${testSuffix}`,
        issueDate: new Date('2026-02-15'),
        dueDate: new Date('2026-03-15'),
        status: 'PAID',
        currency: 'AED',
        subtotal: new Decimal(20000),
        vatTotal: new Decimal(1000),
        totalAmount: new Decimal(21000),
        totalAmountAED: new Decimal(21000),
      },
    });

    const inv2 = await prisma.invoice.create({
      data: {
        businessId: bizA.id,
        customerId: testCust.id,
        invoiceNumber: `INV-2026-002-${testSuffix}`,
        issueDate: new Date('2026-02-20'),
        dueDate: new Date('2026-03-20'),
        status: 'ISSUED', // Unpaid receivable
        currency: 'AED',
        subtotal: new Decimal(10000),
        vatTotal: new Decimal(500),
        totalAmount: new Decimal(10500),
        totalAmountAED: new Decimal(10500),
      },
    });

    // Add real receipt document
    const testDoc = await prisma.document.create({
      data: {
        businessId: bizA.id,
        documentType: 'EXPENSE_RECEIPT',
        originalFilename: 'aws-receipt.pdf',
        fileUrl: 'https://storage.mizan.ae/uploads/aws-receipt.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        uploadedById: userA.id,
      },
    });

    // Add real expenses
    const exp1 = await prisma.expenseBill.create({
      data: {
        businessId: bizA.id,
        billNumber: `BILL-001-${testSuffix}`,
        billDate: new Date('2026-02-18'),
        supplierName: 'AWS Cloud Services',
        supplierTrn: '100444555600003',
        category: 'TECHNOLOGY_SOFTWARE',
        subtotal: new Decimal(5000),
        vatTotal: new Decimal(250),
        totalAmount: new Decimal(5250),
        totalAmountAED: new Decimal(5250),
        subtotalAED: new Decimal(5000),
        vatTotalAED: new Decimal(250),
        status: 'APPROVED',
        paymentStatus: 'PAID',
        documentId: testDoc.id,
      },
    });

    const exp2 = await prisma.expenseBill.create({
      data: {
        businessId: bizA.id,
        billNumber: `BILL-002-${testSuffix}`,
        billDate: new Date('2026-02-22'),
        supplierName: 'Executive Dining DIFC',
        supplierTrn: '100111222300003',
        category: 'ENTERTAINMENT',
        subtotal: new Decimal(2000),
        vatTotal: new Decimal(100),
        totalAmount: new Decimal(2100),
        totalAmountAED: new Decimal(2100),
        subtotalAED: new Decimal(2000),
        vatTotalAED: new Decimal(100),
        status: 'REVIEW_REQUIRED',
        paymentStatus: 'UNPAID', // Unpaid payable
      },
    });

    // Fetch dashboard overview
    const overview = await dashboardService.getDashboardOverview(bizA.id, orgA.id);

    // Total Revenue = 21,000 + 10,500 = 31,500
    assert(overview.financials.totalRevenueAED === '31500.00', 'Calculates accurate total revenue (AED 31,500.00)', `Got ${overview.financials.totalRevenueAED}`);
    // Total Expenses = 5,250 + 2,100 = 7,350
    assert(overview.financials.totalExpensesAED === '7350.00', 'Calculates accurate total expenses (AED 7,350.00)', `Got ${overview.financials.totalExpensesAED}`);
    // Net Accounting Profit = 31,500 - 7,350 = 24,150
    assert(overview.financials.netAccountingProfitAED === '24150.00', 'Calculates accurate net profit (AED 24,150.00)', `Got ${overview.financials.netAccountingProfitAED}`);
    // Receivables = 10,500 (unpaid inv2)
    assert(overview.financials.totalReceivablesAED === '10500.00', 'Calculates accurate outstanding receivables (AED 10,500.00)', `Got ${overview.financials.totalReceivablesAED}`);
    // Payables = 2,100 (unpaid exp2)
    assert(overview.financials.totalPayablesAED === '2100.00', 'Calculates accurate outstanding payables (AED 2,100.00)', `Got ${overview.financials.totalPayablesAED}`);
  } catch (err: any) {
    console.error('Financial metrics test error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: TAX READINESS ASSESSMENT ENGINE
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Tax Readiness Assessment Engine');
  try {
    const readiness = await readinessService.evaluateReadiness(bizA.id, true);

    assert(typeof readiness.overallScore === 'number' && readiness.overallScore >= 0 && readiness.overallScore <= 100, 'Produces valid bounded readiness score (0-100)');
    assert(readiness.categories.length === 5, 'Evaluates all 5 mandatory statutory categories (Profile, VAT, CT, Bookkeeping, Compliance)');

    const profileCat = readiness.categories.find((c) => c.category === 'PROFILE');
    const vatCat = readiness.categories.find((c) => c.category === 'VAT');
    const ctCat = readiness.categories.find((c) => c.category === 'CORPORATE_TAX');
    const bookCat = readiness.categories.find((c) => c.category === 'BOOKKEEPING');
    const compCat = readiness.categories.find((c) => c.category === 'COMPLIANCE');

    assert(profileCat !== undefined && profileCat.score > 70, 'Profile category reflects verified legal entity and active license');
    assert(vatCat !== undefined && vatCat.score >= 50, 'VAT category reflects recorded VAT TRN');
    assert(ctCat !== undefined, 'Corporate Tax category evaluated');

    // Corporate Tax is missing CT TRN, so critical blocker must be triggered!
    assert(
      readiness.criticalBlockers.some((b) => b.includes('Corporate Tax')),
      'Identifies critical blocker: Missing mandatory Corporate Tax registration'
    );

    // Verify snapshot persistence
    assert(!!readiness.snapshotId, 'Persists TaxReadinessSnapshot record in database');

    const historical = await readinessService.getHistoricalSnapshots(bizA.id);
    assert(historical.length >= 1, 'Retrieves persisted historical readiness snapshots');
  } catch (err: any) {
    console.error('Readiness test error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: STATUTORY CALENDAR DEADLINES
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Business Tax Calendar & Statutory Deadlines');
  try {
    const deadlines = await taxCalendarService.getBusinessTaxDeadlines(bizA.id, new Date('2026-03-15'));

    // Check VAT Deadline (FDL 8/2017 Art. 71 -> 28th of month following period end)
    const vatDeadline = deadlines.find((d) => d.obligationType === 'VAT_RETURN_FILING');
    assert(vatDeadline !== undefined, 'Computes statutory VAT 201 filing and payment deadline');
    if (vatDeadline) {
      assert(vatDeadline.legalReference.includes('Article 71'), 'Cites Federal Decree-Law No. 8 of 2017, Article 71 for VAT deadline');
      const due = new Date(vatDeadline.calculatedDueDate);
      assert(due.getDate() === 28, 'VAT deadline day is strictly the 28th of the month');
    }

    // Check CT Filing Deadline (FDL 47/2022 Art. 48 -> 9 months after fiscal year end)
    const ctDeadline = deadlines.find((d) => d.obligationType === 'CT_RETURN_FILING');
    assert(ctDeadline !== undefined, 'Computes statutory Corporate Tax filing deadline (9-month rule)');
    if (ctDeadline) {
      assert(ctDeadline.legalReference.includes('Article 48'), 'Cites Federal Decree-Law No. 47 of 2022, Article 48 for CT deadline');
      const due = new Date(ctDeadline.calculatedDueDate);
      assert(due.getMonth() === 8 && due.getDate() === 30, 'Corporate Tax filing deadline falls on September 30 (9 months post Dec 31)');
    }

    // Check CT Registration Deadline (FTA Decision No. 3 of 2024)
    const ctRegDeadline = deadlines.find((d) => d.obligationType === 'CT_REGISTRATION');
    assert(ctRegDeadline !== undefined, 'Detects pending Corporate Tax registration deadline under FTA Decision No. 3 of 2024');

    // Check Trade License Renewal
    const licenseDeadline = deadlines.find((d) => d.obligationType === 'TRADE_LICENSE_RENEWAL');
    assert(licenseDeadline !== undefined, 'Tracks commercial trade license renewal date');
  } catch (err: any) {
    console.error('Calendar test error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: COMPLIANCE ACTION CENTRE & ISSUE RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: Unified Compliance Monitoring & Action Centre');
  try {
    const findings = await complianceActionService.getActiveFindings(bizA.id);

    assert(findings.length > 0, 'Aggregates actionable compliance findings');
    assert(findings.some((f) => f.category === 'CORPORATE_TAX'), 'Includes Corporate Tax registration finding');
    assert(findings.some((f) => f.category === 'BOOKKEEPING'), 'Includes unreviewed expenses backlog finding');

    // Verify deduplication: no two findings should have the same findingKey
    const keys = findings.map((f) => f.findingKey);
    const uniqueKeys = new Set(keys);
    assert(keys.length === uniqueKeys.size, 'All compliance findings have strictly deduplicated keys');

    // Test resolution of an obligation
    const obligations = await prisma.complianceObligation.findMany({ where: { businessId: bizA.id } });
    if (obligations.length > 0) {
      const targetObligation = obligations[0];
      const resolved = await complianceActionService.resolveObligation(
        targetObligation.id,
        bizA.id,
        orgA.id,
        userA.id,
        'Submitted application via EmaraTax portal.'
      );
      assert(resolved.status === 'COMPLETED', 'Resolves compliance obligation to COMPLETED status');
      assert(resolved.resolvedById === userA.id, 'Records resolver user ID in audit trail');
      assert(resolved.resolutionNotes?.includes('EmaraTax'), 'Saves resolution notes');
    }
  } catch (err: any) {
    console.error('Compliance action test error:', err);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: TAX & FINANCIAL REPORTING SYSTEM (PDF & CSV)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: Tax & Financial Reporting System');
  try {
    // 1. Profit & Loss Report
    const pnlReport = await reportsService.generateReport(
      {
        businessId: bizA.id,
        reportType: ReportType.PROFIT_AND_LOSS,
        format: ReportFormat.CSV,
      },
      orgA.id,
      userA.id
    );
    assert(pnlReport.report.status === 'READY', 'Generates Profit & Loss report in READY status');
    assert(pnlReport.content.includes('NET ACCOUNTING PROFIT'), 'P&L CSV contains Net Accounting Profit line');
    assert(pnlReport.report.summaryMetrics.netProfitAED === '24150.00', 'P&L summary metrics match financial ledger');

    // 2. VAT Return 201 Report
    const vatReport = await reportsService.generateReport(
      {
        businessId: bizA.id,
        reportType: ReportType.VAT_RETURN_201_REPORT,
        format: ReportFormat.PDF,
      },
      orgA.id,
      userA.id
    );
    assert(vatReport.report.status === 'READY', 'Generates VAT 201 Report in READY status');
    assert(vatReport.content.includes('Box 1') && vatReport.content.includes('Box 12'), 'VAT 201 HTML report contains statutory Box 1 through Box 12');

    // 3. Corporate Tax Report
    const ctReport = await reportsService.generateReport(
      {
        businessId: bizA.id,
        reportType: ReportType.CORPORATE_TAX_REPORT,
        format: ReportFormat.CSV,
      },
      orgA.id,
      userA.id
    );
    assert(ctReport.report.status === 'READY', 'Generates Corporate Tax Computation schedule');
    assert(ctReport.content.includes('Small Business Relief'), 'CT schedule evaluates Small Business Relief under MD 73/2023');
    assert(ctReport.content.includes('Disallowed 50% Entertainment'), 'CT schedule adjusts 50% entertainment under Article 32');

    // 4. Tax Readiness Audit Report
    const auditReport = await reportsService.generateReport(
      {
        businessId: bizA.id,
        reportType: ReportType.TAX_READINESS_AUDIT,
        format: ReportFormat.PDF,
      },
      orgA.id,
      userA.id
    );
    assert(auditReport.report.status === 'READY', 'Generates Tax Readiness Audit Report');
    assert(auditReport.content.includes('Readiness Score'), 'Audit report contains readiness score breakdown');

    // 5. List Business Reports
    const listedReports = await reportsService.listBusinessReports(bizA.id, orgA.id);
    assert(listedReports.length >= 4, 'Lists all generated reports for the authenticated business');
  } catch (err: any) {
    console.error('Reporting engine test error:', err);
  }

  // --------------------------------------------------------------------------
  // CLEANUP TEST ENTITIES
  // --------------------------------------------------------------------------
  console.log('\nCleaning up test entities...');
  try {
    await prisma.business.deleteMany({ where: { id: { in: [bizA.id, bizB.id] } } });
    await prisma.user.deleteMany({ where: { id: userA.id } });
    await prisma.organisation.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  } catch (err: any) {
    console.warn('Cleanup warning:', err.message);
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runDashboardTests()
  .catch((e) => {
    console.error('Fatal error during dashboard test execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
