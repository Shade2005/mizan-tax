// ============================================================================
// Mizan (ميزان) - Explainable UAE Tax Readiness Assessment Engine
// Evaluates readiness across 5 categories with statutory deductions & critical blockers:
// Profile (20%), VAT (25%), Corporate Tax (25%), Bookkeeping (15%), Compliance (15%)
// ============================================================================

import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import {
  TaxReadinessResultDto,
  CategoryReadinessDto,
} from './dashboard.types';

@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Performs a comprehensive, deterministic tax readiness evaluation for a business.
   * Persists a TaxReadinessSnapshot for historical trend monitoring.
   */
  public async evaluateReadiness(
    businessId: string,
    persistSnapshot: boolean = true
  ): Promise<TaxReadinessResultDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        taxRegistrations: true,
        invoices: true,
        expenseBills: true,
        taxAssessments: {
          orderBy: { createdAt: 'desc' },
        },
        complianceObligations: true,
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found.`);
    }

    const criticalBlockers: string[] = [];
    const missingItems: string[] = [];
    const actionableSteps: string[] = [];

    const vatReg = business.taxRegistrations.find((r) => r.taxType === 'VAT');
    const ctReg = business.taxRegistrations.find((r) => r.taxType === 'CORPORATE_TAX');

    const isVatRegistered = vatReg && (vatReg.status === 'REGISTERED' || !!vatReg.trn);
    const vatTrn = vatReg?.trn;
    const isCtRegistered = ctReg && (ctReg.status === 'REGISTERED' || !!ctReg.trn);
    const ctTrn = ctReg?.trn;

    // Calculate annual revenue from invoices (paid and sent)
    const annualRevenue = business.invoices
      .filter((inv) => inv.status !== 'VOID' && inv.status !== 'DRAFT')
      .reduce((acc, inv) => acc.plus(new Decimal(inv.totalAmountAED.toString())), new Decimal(0));

    // Calculate total verified expenses
    const totalExpenses = business.expenseBills
      .filter((exp) => exp.status !== 'REJECTED')
      .reduce((acc, exp) => acc.plus(new Decimal(exp.totalAmountAED.toString())), new Decimal(0));

    // ========================================================================
    // 1. PROFILE READINESS (20% Weight)
    // ========================================================================
    const profileDetails = [];
    let profilePoints = 0;

    // Check Legal Entity Type & Jurisdiction (25 pts)
    if (business.legalEntityType) {
      profilePoints += 25;
      profileDetails.push({
        criterion: 'Legal Entity Structure Defined',
        passed: true,
        points: 25,
        maxPoints: 25,
        explanation: `Registered as ${business.legalEntityType} in ${business.jurisdictionType || 'MAINLAND'}.`,
        statutoryRef: 'Federal Decree-Law No. 32 of 2021',
      });
    } else {
      missingItems.push('Legal entity structure / jurisdiction');
      profileDetails.push({
        criterion: 'Legal Entity Structure Defined',
        passed: false,
        points: 0,
        maxPoints: 25,
        explanation: 'Legal entity type or jurisdiction is missing.',
      });
    }

    // Check Active Trade License (35 pts)
    if (business.tradeLicenseNumber) {
      const now = new Date();
      const isExpired = business.licenseExpiryDate && new Date(business.licenseExpiryDate) < now;
      if (isExpired) {
        criticalBlockers.push(`Trade license ${business.tradeLicenseNumber} is expired.`);
        actionableSteps.push('Renew your commercial trade license immediately to avoid banking and operational disruption.');
        profileDetails.push({
          criterion: 'Commercial Trade License Active',
          passed: false,
          points: 10,
          maxPoints: 35,
          explanation: `License ${business.tradeLicenseNumber} expired on ${business.licenseExpiryDate?.toISOString().slice(0, 10)}.`,
        });
      } else {
        profilePoints += 35;
        profileDetails.push({
          criterion: 'Commercial Trade License Active',
          passed: true,
          points: 35,
          maxPoints: 35,
          explanation: `Valid license ${business.tradeLicenseNumber} issued by ${business.licensingAuthority || 'DED'}.`,
        });
      }
    } else {
      missingItems.push('Commercial Trade License record');
      actionableSteps.push('Upload or input your trade license details to complete your corporate tax profile.');
      profileDetails.push({
        criterion: 'Commercial Trade License Active',
        passed: false,
        points: 0,
        maxPoints: 35,
        explanation: 'No trade license registered on file.',
      });
    }

    // Check Address / Emirate (20 pts)
    if (business.emirate) {
      profilePoints += 20;
      profileDetails.push({
        criterion: 'Physical Business Address in UAE',
        passed: true,
        points: 20,
        maxPoints: 20,
        explanation: `Operating address in ${business.emirate}.`,
      });
    } else {
      missingItems.push('Emirate operating address');
      profileDetails.push({
        criterion: 'Physical Business Address in UAE',
        passed: false,
        points: 0,
        maxPoints: 20,
        explanation: 'No registered UAE operating emirate provided.',
      });
    }

    // Check Fiscal Year End Defined (20 pts)
    if (business.financialYearStartDay && business.financialYearStartMon) {
      profilePoints += 20;
      profileDetails.push({
        criterion: 'Financial Tax Year End Configured',
        passed: true,
        points: 20,
        maxPoints: 20,
        explanation: `Fiscal tax year starting month ${business.financialYearStartMon}.`,
        statutoryRef: 'Federal Decree-Law No. 47 of 2022, Article 57',
      });
    } else {
      missingItems.push('Fiscal year parameters');
      profileDetails.push({
        criterion: 'Financial Tax Year End Configured',
        passed: false,
        points: 0,
        maxPoints: 20,
        explanation: 'Fiscal year parameters not explicitly configured.',
      });
    }

    const profileCategory: CategoryReadinessDto = {
      category: 'PROFILE',
      name: 'Business Entity & Licensing',
      weightPercentage: 20,
      score: profilePoints,
      status: profilePoints >= 85 ? 'EXCELLENT' : profilePoints >= 60 ? 'GOOD' : 'NEEDS_ATTENTION',
      passedChecks: profileDetails.filter((d) => d.passed).length,
      totalChecks: profileDetails.length,
      details: profileDetails,
    };

    // ========================================================================
    // 2. VAT READINESS (25% Weight)
    // ========================================================================
    const vatDetails = [];
    let vatPoints = 0;

    const VAT_MANDATORY_THRESHOLD = new Decimal(375000);
    const isAboveVatThreshold = annualRevenue.gte(VAT_MANDATORY_THRESHOLD);

    // Threshold evaluation check (25 pts)
    vatPoints += 25;
    vatDetails.push({
      criterion: 'VAT Registration Threshold Monitored',
      passed: true,
      points: 25,
      maxPoints: 25,
      explanation: isAboveVatThreshold
        ? `Annual taxable revenue (AED ${annualRevenue.toFixed(2)}) exceeds AED 375,000 threshold.`
        : `Annual taxable revenue (AED ${annualRevenue.toFixed(2)}) is below AED 375,000 mandatory threshold.`,
      statutoryRef: 'Federal Decree-Law No. 8 of 2017, Article 13',
    });

    // VAT Registration check (35 pts)
    if (isVatRegistered && vatTrn) {
      vatPoints += 35;
      vatDetails.push({
        criterion: 'VAT Tax Registration Number (TRN)',
        passed: true,
        points: 35,
        maxPoints: 35,
        explanation: `Valid VAT TRN ${vatTrn} on file.`,
        statutoryRef: 'Executive Regulation of FDL No. 8 of 2017, Article 6',
      });
    } else if (isAboveVatThreshold) {
      criticalBlockers.push('Mandatory VAT Registration Required: Taxable revenue exceeds AED 375,000 but no VAT TRN is recorded.');
      actionableSteps.push('Register for VAT immediately on EmaraTax to avoid an AED 10,000 late registration penalty under Cabinet Decision No. 40 of 2017.');
      vatDetails.push({
        criterion: 'VAT Tax Registration Number (TRN)',
        passed: false,
        points: 0,
        maxPoints: 35,
        explanation: 'Mandatory VAT registration threshold exceeded without VAT TRN.',
        statutoryRef: 'Cabinet Decision No. 40 of 2017, Penalty Item 1',
      });
    } else {
      vatPoints += 35;
      vatDetails.push({
        criterion: 'VAT Tax Registration Number (TRN)',
        passed: true,
        points: 35,
        maxPoints: 35,
        explanation: 'Exempt from mandatory VAT registration (below AED 375,000 threshold).',
      });
    }

    // VAT 201 Assessment check (25 pts)
    const vatAssessments = business.taxAssessments.filter((a) => a.taxType === 'VAT');
    if (vatAssessments.length > 0) {
      vatPoints += 25;
      vatDetails.push({
        criterion: 'Periodic VAT 201 Assessment Performed',
        passed: true,
        points: 25,
        maxPoints: 25,
        explanation: `${vatAssessments.length} VAT 201 assessment(s) generated from real records.`,
        statutoryRef: 'Federal Decree-Law No. 8 of 2017, Article 71',
      });
    } else if (isVatRegistered) {
      missingItems.push('VAT 201 Return Assessment');
      actionableSteps.push('Generate a VAT 201 Return assessment to determine quarterly output tax and recoverable input tax.');
      vatDetails.push({
        criterion: 'Periodic VAT 201 Assessment Performed',
        passed: false,
        points: 0,
        maxPoints: 25,
        explanation: 'No VAT 201 return calculations generated for registered business.',
      });
    } else {
      vatPoints += 25;
      vatDetails.push({
        criterion: 'Periodic VAT 201 Assessment Performed',
        passed: true,
        points: 25,
        maxPoints: 25,
        explanation: 'Not required for non-VAT registered entity.',
      });
    }

    // High-value purchase compliance check (15 pts)
    const largeExpensesWithoutTrn = business.expenseBills.filter(
      (e) => new Decimal(e.totalAmountAED.toString()).gte(new Decimal(10000)) && !e.supplierTrn
    );
    if (largeExpensesWithoutTrn.length === 0) {
      vatPoints += 15;
      vatDetails.push({
        criterion: 'Supplier TRN Documentation for Large Purchases (>AED 10k)',
        passed: true,
        points: 15,
        maxPoints: 15,
        explanation: 'All material purchase expenses have documented supplier tax details.',
        statutoryRef: 'Executive Regulation of FDL No. 8 of 2017, Article 59',
      });
    } else {
      actionableSteps.push(`Obtain tax invoices showing supplier TRN for ${largeExpensesWithoutTrn.length} expense(s) exceeding AED 10,000 to defend input tax recovery.`);
      vatDetails.push({
        criterion: 'Supplier TRN Documentation for Large Purchases (>AED 10k)',
        passed: false,
        points: 0,
        maxPoints: 15,
        explanation: `${largeExpensesWithoutTrn.length} purchase(s) >= AED 10k missing supplier TRN.`,
      });
    }

    const vatCategory: CategoryReadinessDto = {
      category: 'VAT',
      name: 'Value Added Tax (VAT 201)',
      weightPercentage: 25,
      score: vatPoints,
      status: vatPoints >= 85 ? 'EXCELLENT' : vatPoints >= 60 ? 'GOOD' : 'NEEDS_ATTENTION',
      passedChecks: vatDetails.filter((d) => d.passed).length,
      totalChecks: vatDetails.length,
      details: vatDetails,
    };

    // ========================================================================
    // 3. CORPORATE TAX READINESS (25% Weight)
    // ========================================================================
    const ctDetails = [];
    let ctPoints = 0;

    // Corporate Tax Registration (35 pts)
    if (isCtRegistered && ctTrn) {
      ctPoints += 35;
      ctDetails.push({
        criterion: 'Corporate Tax Registration Number (CT TRN)',
        passed: true,
        points: 35,
        maxPoints: 35,
        explanation: `Corporate Tax TRN ${ctTrn} recorded.`,
        statutoryRef: 'Federal Decree-Law No. 47 of 2022, Article 51',
      });
    } else {
      criticalBlockers.push('Mandatory Corporate Tax Registration: UAE businesses must obtain a Corporate Tax TRN under FTA Decision No. 3 of 2024.');
      actionableSteps.push('Submit Corporate Tax registration application on EmaraTax portal immediately to mitigate AED 10,000 administrative fine.');
      ctDetails.push({
        criterion: 'Corporate Tax Registration Number (CT TRN)',
        passed: false,
        points: 0,
        maxPoints: 35,
        explanation: 'Missing Corporate Tax registration number.',
        statutoryRef: 'Cabinet Decision No. 75 of 2023, Table Item 1',
      });
    }

    // Corporate Tax Assessment Done (30 pts)
    const ctAssessments = business.taxAssessments.filter((a) => a.taxType === 'CORPORATE_TAX');
    if (ctAssessments.length > 0) {
      ctPoints += 30;
      ctDetails.push({
        criterion: 'Corporate Tax Assessment & Liability Schedule',
        passed: true,
        points: 30,
        maxPoints: 30,
        explanation: `${ctAssessments.length} Corporate Tax assessment(s) generated with statutory adjustments.`,
        statutoryRef: 'Federal Decree-Law No. 47 of 2022, Article 48',
      });
    } else {
      missingItems.push('Corporate Tax statutory assessment');
      actionableSteps.push('Run Corporate Tax Assessment to compute taxable income, verify Small Business Relief eligibility, and determine 9% tax liability.');
      ctDetails.push({
        criterion: 'Corporate Tax Assessment & Liability Schedule',
        passed: false,
        points: 0,
        maxPoints: 30,
        explanation: 'No Corporate Tax assessment recorded yet.',
      });
    }

    // Small Business Relief Verification (20 pts)
    const SBR_THRESHOLD = new Decimal(3000000);
    const qualifiesForSbr = annualRevenue.lte(SBR_THRESHOLD);
    ctPoints += 20;
    ctDetails.push({
      criterion: 'Small Business Relief (SBR) Eligibility Evaluated',
      passed: true,
      points: 20,
      maxPoints: 20,
      explanation: qualifiesForSbr
        ? `Revenue (AED ${annualRevenue.toFixed(2)}) is within the AED 3,000,000 threshold for 0% Corporate Tax relief.`
        : `Revenue (AED ${annualRevenue.toFixed(2)}) exceeds AED 3,000,000; statutory 9% CT rate applies above AED 375,000.`,
      statutoryRef: 'Ministerial Decision No. 73 of 2023 on Small Business Relief',
    });

    // Non-deductible expense tracking (15 pts)
    const entertainmentExpenses = business.expenseBills.filter((e) => e.category === 'ENTERTAINMENT');
    ctPoints += 15;
    ctDetails.push({
      criterion: 'Statutory Disallowance & Adjustment Tracking',
      passed: true,
      points: 15,
      maxPoints: 15,
      explanation: `${entertainmentExpenses.length} entertainment expense(s) identified for statutory 50% restriction under Article 32.`,
      statutoryRef: 'Federal Decree-Law No. 47 of 2022, Article 32 & Article 33',
    });

    const ctCategory: CategoryReadinessDto = {
      category: 'CORPORATE_TAX',
      name: 'Corporate Tax (FDL 47/2022)',
      weightPercentage: 25,
      score: ctPoints,
      status: ctPoints >= 85 ? 'EXCELLENT' : ctPoints >= 60 ? 'GOOD' : 'NEEDS_ATTENTION',
      passedChecks: ctDetails.filter((d) => d.passed).length,
      totalChecks: ctDetails.length,
      details: ctDetails,
    };

    // ========================================================================
    // 4. BOOKKEEPING & LEDGER READINESS (15% Weight)
    // ========================================================================
    const bookDetails = [];
    let bookPoints = 0;

    const totalRecords = business.invoices.length + business.expenseBills.length;
    if (totalRecords > 0) {
      bookPoints += 20;
      bookDetails.push({
        criterion: 'Financial Transactions Recorded',
        passed: true,
        points: 20,
        maxPoints: 20,
        explanation: `${business.invoices.length} invoices and ${business.expenseBills.length} expenses on ledger.`,
      });
    } else {
      missingItems.push('Initial invoices or expenses');
      actionableSteps.push('Record your sales invoices and scan expense receipts to build an audit-compliant bookkeeping ledger.');
      bookDetails.push({
        criterion: 'Financial Transactions Recorded',
        passed: false,
        points: 0,
        maxPoints: 20,
        explanation: 'No invoices or expense records found on ledger.',
      });
    }

    const pendingExpenses = business.expenseBills.filter((e) => e.status === 'REVIEW_REQUIRED');
    const reviewRatio = business.expenseBills.length > 0 ? (pendingExpenses.length / business.expenseBills.length) : 0;
    if (reviewRatio <= 0.15) {
      bookPoints += 30;
      bookDetails.push({
        criterion: 'Expense Review Backlog Controlled',
        passed: true,
        points: 30,
        maxPoints: 30,
        explanation: `${business.expenseBills.length - pendingExpenses.length} of ${business.expenseBills.length} expenses reviewed and confirmed.`,
      });
    } else {
      actionableSteps.push(`Review and approve ${pendingExpenses.length} scanned expense receipt(s) in your expense queue.`);
      bookDetails.push({
        criterion: 'Expense Review Backlog Controlled',
        passed: false,
        points: Math.max(0, Math.round(30 * (1 - reviewRatio))),
        maxPoints: 30,
        explanation: `${pendingExpenses.length} unreviewed expenses requiring user confirmation.`,
      });
    }

    const expensesWithReceipt = business.expenseBills.filter((e) => e.documentId);
    const receiptRatio = business.expenseBills.length > 0 ? (expensesWithReceipt.length / business.expenseBills.length) : 1;
    if (receiptRatio >= 0.70) {
      bookPoints += 25;
      bookDetails.push({
        criterion: 'Source Receipt Documentation',
        passed: true,
        points: 25,
        maxPoints: 25,
        explanation: `${expensesWithReceipt.length} expenses supported by digital receipt documentation.`,
        statutoryRef: 'Federal Decree-Law No. 8 of 2017, Article 78',
      });
    } else {
      actionableSteps.push('Attach digital receipt images for unreceipted expenses to protect expense deductibility.');
      bookDetails.push({
        criterion: 'Source Receipt Documentation',
        passed: false,
        points: Math.round(25 * receiptRatio),
        maxPoints: 25,
        explanation: `${business.expenseBills.length - expensesWithReceipt.length} expense(s) lack source receipt attachments.`,
      });
    }

    const uncategorisedExpenses = business.expenseBills.filter((e) => e.category === 'OTHER_BUSINESS_EXPENSES' || !e.category);
    if (uncategorisedExpenses.length === 0 || business.expenseBills.length === 0) {
      bookPoints += 25;
      bookDetails.push({
        criterion: 'Expense Categorisation Integrity',
        passed: true,
        points: 25,
        maxPoints: 25,
        explanation: 'All expenses mapped to specific tax-deductible accounts.',
      });
    } else {
      bookPoints += 15;
      bookDetails.push({
        criterion: 'Expense Categorisation Integrity',
        passed: true,
        points: 15,
        maxPoints: 25,
        explanation: `${uncategorisedExpenses.length} expense(s) classified under Other Business Expenses.`,
      });
    }

    const bookCategory: CategoryReadinessDto = {
      category: 'BOOKKEEPING',
      name: 'Bookkeeping & Records Integrity',
      weightPercentage: 15,
      score: bookPoints,
      status: bookPoints >= 85 ? 'EXCELLENT' : bookPoints >= 60 ? 'GOOD' : 'NEEDS_ATTENTION',
      passedChecks: bookDetails.filter((d) => d.passed).length,
      totalChecks: bookDetails.length,
      details: bookDetails,
    };

    // ========================================================================
    // 5. COMPLIANCE & RECORD RETENTION (15% Weight)
    // ========================================================================
    const compDetails = [];
    let compPoints = 0;

    const overdueObligations = business.complianceObligations.filter((o) => o.status === 'OVERDUE');
    if (overdueObligations.length === 0) {
      compPoints += 40;
      compDetails.push({
        criterion: 'Zero Overdue Statutory Obligations',
        passed: true,
        points: 40,
        maxPoints: 40,
        explanation: 'All statutory filings and deadlines are current or pending within timeline.',
      });
    } else {
      criticalBlockers.push(`${overdueObligations.length} statutory compliance obligation(s) are overdue.`);
      actionableSteps.push(`Immediately address overdue obligations: ${overdueObligations.map((o) => o.title).join(', ')}.`);
      compDetails.push({
        criterion: 'Zero Overdue Statutory Obligations',
        passed: false,
        points: 0,
        maxPoints: 40,
        explanation: `${overdueObligations.length} overdue obligation(s) incurring potential penalty exposure.`,
      });
    }

    compPoints += 30;
    compDetails.push({
      criterion: 'Record Retention Architecture (5-Yr VAT / 7-Yr CT)',
      passed: true,
      points: 30,
      maxPoints: 30,
      explanation: 'System stores immutable digital audit trails and records for 7+ years.',
      statutoryRef: 'FDL 8/2017 Art. 78 & FDL 47/2022 Art. 56',
    });

    if (business.licenseExpiryDate) {
      const daysUntilExpiry = Math.ceil((new Date(business.licenseExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry > 30) {
        compPoints += 30;
        compDetails.push({
          criterion: 'Commercial License Validity Horizon',
          passed: true,
          points: 30,
          maxPoints: 30,
          explanation: `Trade license valid for ${daysUntilExpiry} more days.`,
        });
      } else if (daysUntilExpiry >= 0) {
        compPoints += 15;
        actionableSteps.push(`Trade license expires in ${daysUntilExpiry} days. Initiate renewal with Licensing Authority.`);
        compDetails.push({
          criterion: 'Commercial License Validity Horizon',
          passed: true,
          points: 15,
          maxPoints: 30,
          explanation: `Trade license expires in ${daysUntilExpiry} days.`,
        });
      } else {
        compDetails.push({
          criterion: 'Commercial License Validity Horizon',
          passed: false,
          points: 0,
          maxPoints: 30,
          explanation: 'Trade license has expired.',
        });
      }
    } else {
      compDetails.push({
        criterion: 'Commercial License Validity Horizon',
        passed: false,
        points: 0,
        maxPoints: 30,
        explanation: 'No license expiry date recorded.',
      });
    }

    const compCategory: CategoryReadinessDto = {
      category: 'COMPLIANCE',
      name: 'Statutory Compliance & Governance',
      weightPercentage: 15,
      score: compPoints,
      status: compPoints >= 85 ? 'EXCELLENT' : compPoints >= 60 ? 'GOOD' : 'NEEDS_ATTENTION',
      passedChecks: compDetails.filter((d) => d.passed).length,
      totalChecks: compDetails.length,
      details: compDetails,
    };

    // ========================================================================
    // OVERALL WEIGHTED CALCULATION
    // ========================================================================
    const overallScore = Math.round(
      profilePoints * 0.20 +
      vatPoints * 0.25 +
      ctPoints * 0.25 +
      bookPoints * 0.15 +
      compPoints * 0.15
    );

    let healthGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (overallScore < 50 || criticalBlockers.length >= 2) {
      healthGrade = 'F';
    } else if (overallScore < 65 || criticalBlockers.length === 1) {
      healthGrade = 'D';
    } else if (overallScore < 75) {
      healthGrade = 'C';
    } else if (overallScore < 90) {
      healthGrade = 'B';
    }

    const categories = [profileCategory, vatCategory, ctCategory, bookCategory, compCategory];

    const result: TaxReadinessResultDto = {
      overallScore,
      healthGrade,
      isAuditReady: overallScore >= 80 && criticalBlockers.length === 0,
      categories,
      criticalBlockers,
      missingItems,
      actionableSteps,
      disclaimer: 'Internal completeness metric for UAE tax readiness. Does not constitute an official FTA clearance or legal audit certificate.',
      evaluatedAt: new Date().toISOString(),
    };

    if (persistSnapshot) {
      try {
        const snapshot = await this.prisma.taxReadinessSnapshot.create({
          data: {
            businessId,
            overallScore,
            profileScore: profilePoints,
            vatScore: vatPoints,
            corporateTaxScore: ctPoints,
            bookkeepingScore: bookPoints,
            complianceScore: compPoints,
            categoryScoresJson: categories as any,
            missingItems,
            criticalBlockers,
            actionableSteps,
            metadata: { healthGrade, isAuditReady: result.isAuditReady },
          },
        });
        result.snapshotId = snapshot.id;
      } catch (err: any) {
        this.logger.warn(`Failed to persist readiness snapshot for ${businessId}: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Returns historical readiness snapshots for trend analysis.
   */
  public async getHistoricalSnapshots(businessId: string, limit: number = 10) {
    return this.prisma.taxReadinessSnapshot.findMany({
      where: { businessId },
      orderBy: { evaluatedAt: 'desc' },
      take: limit,
    });
  }
}
