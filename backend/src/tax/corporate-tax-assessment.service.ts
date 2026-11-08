// ============================================================================
// Mizan (ميزان) - UAE Corporate Tax Assessment Engine Service
// Statutory Framework: Federal Decree-Law No. (47) of 2022 on Corporate Tax
// Decisions: MD 73/2023 (SBR), CD 49/2023 (Natural Persons), CD 139/2023 (QFZP)
// ============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import {
  CorporateTaxEngine,
  LegalEntityType,
  CorporateTaxEngineInput,
  CT_RULESET_VERSION,
  CT_STATUTORY_EXEMPT_THRESHOLD,
  CT_STANDARD_RATE,
  SBR_REVENUE_THRESHOLD,
  SBR_MAX_EXPIRY_DATE,
  NATURAL_PERSON_TURNOVER_THRESHOLD,
  GIDLR_DE_MINIMIS_THRESHOLD,
  GIDLR_EBITDA_RATIO,
  TAX_LOSS_MAX_OFFSET_RATIO,
} from '../tax-engine/corporate-tax.engine';
import {
  AssessCorporateTaxPeriodDto,
  CorporateTaxAssessmentSummary,
  CorporateTaxAdjustmentItem,
  TaxComplianceFinding,
  AssessmentStatusEnum,
} from './tax.types';
import { STATUTORY_CITATIONS, CT_STATUTORY_CONSTANTS } from './statutory-rules.config';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class CorporateTaxAssessmentService {
  private readonly logger = new Logger(CorporateTaxAssessmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic Corporate Tax assessment from real persisted financial records.
   */
  public async assessBusinessCorporateTax(
    dto: AssessCorporateTaxPeriodDto,
    organisationId: string
  ): Promise<CorporateTaxAssessmentSummary> {
    const {
      businessId,
      financialYear,
      electSmallBusinessRelief = false,
      priorPeriodRevenues = [],
      unutilizedPriorTaxLosses = 0,
      isQfzpClaimed = false,
      isMneGroup = false,
      taxEbitda,
    } = dto;

    const startDateStr = dto.startDate || `${financialYear}-01-01`;
    const endDateStr = dto.endDate || `${financialYear}-12-31`;

    const periodStart = new Date(startDateStr);
    const periodEnd = new Date(endDateStr);
    periodEnd.setHours(23, 59, 59, 999);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate format. Use YYYY-MM-DD.');
    }
    if (periodStart > periodEnd) {
      throw new BadRequestException('startDate cannot be after endDate.');
    }

    // 1. Verify business belongs to authenticated tenant organisation
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        taxRegistrations: true,
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found.`);
    }

    if (business.organisationId !== organisationId) {
      this.logger.warn(`Tenant isolation breach: Org ${organisationId} tried assessing Business ${businessId}`);
      throw new ForbiddenException('Access denied: You do not have permission to assess this business.');
    }

    // 2. Query Real Invoices (Revenue)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        issueDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          notIn: ['CANCELLED'],
        },
      },
      orderBy: { issueDate: 'asc' },
    });

    // 3. Query Real Expense Bills (Accounting Expenses)
    const expenses = await this.prisma.expenseBill.findMany({
      where: {
        businessId,
        billDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          in: ['APPROVED'],
        },
      },
      include: {
        lines: true,
      },
      orderBy: { billDate: 'asc' },
    });

    // 4. Financial Statement Aggregations
    let totalRevenueAED = new Decimal(0);
    for (const inv of invoices) {
      // Subtotal before VAT in AED represents business turnover/revenue
      const subtotalAED = new Decimal(inv.subtotal || 0).times(inv.exchangeRate || 1);
      totalRevenueAED = totalRevenueAED.plus(subtotalAED);
    }

    let cogsAED = new Decimal(0);
    let operatingExpensesAED = new Decimal(0);
    let clientEntertainmentExpenseAED = new Decimal(0);
    let nonDeductibleFinesAED = new Decimal(0);
    let netInterestExpenseAED = new Decimal(0);

    const categoryMap: Record<string, { total: Decimal; deductible: Decimal; disallowed: Decimal }> = {};

    for (const exp of expenses) {
      const expSubtotalAED = new Decimal(exp.subtotalAED || exp.subtotal || 0);
      const category = exp.category || 'OTHER_EXPENSES';

      if (!categoryMap[category]) {
        categoryMap[category] = {
          total: new Decimal(0),
          deductible: new Decimal(0),
          disallowed: new Decimal(0),
        };
      }
      categoryMap[category].total = categoryMap[category].total.plus(expSubtotalAED);

      // Analyze specific statutory adjustments
      if (category === 'INVENTORY_PURCHASES') {
        cogsAED = cogsAED.plus(expSubtotalAED);
        categoryMap[category].deductible = categoryMap[category].deductible.plus(expSubtotalAED);
      } else if (category === 'ENTERTAINMENT' || category === 'CLIENT_ENTERTAINMENT') {
        // Art. 32: 50% non-deductible
        clientEntertainmentExpenseAED = clientEntertainmentExpenseAED.plus(expSubtotalAED);
        operatingExpensesAED = operatingExpensesAED.plus(expSubtotalAED);
        const half = expSubtotalAED.times(0.5);
        categoryMap[category].deductible = categoryMap[category].deductible.plus(half);
        categoryMap[category].disallowed = categoryMap[category].disallowed.plus(half);
      } else if (
        category === 'GOVERNMENT_FEES' &&
        exp.notes &&
        exp.notes.toLowerCase().includes('fine')
      ) {
        // Art. 33(1): Penalties/Fines are 100% non-deductible
        nonDeductibleFinesAED = nonDeductibleFinesAED.plus(expSubtotalAED);
        operatingExpensesAED = operatingExpensesAED.plus(expSubtotalAED);
        categoryMap[category].disallowed = categoryMap[category].disallowed.plus(expSubtotalAED);
      } else if (category === 'BANK_CHARGES' && exp.notes && exp.notes.toLowerCase().includes('interest')) {
        netInterestExpenseAED = netInterestExpenseAED.plus(expSubtotalAED);
        operatingExpensesAED = operatingExpensesAED.plus(expSubtotalAED);
        categoryMap[category].deductible = categoryMap[category].deductible.plus(expSubtotalAED);
      } else {
        operatingExpensesAED = operatingExpensesAED.plus(expSubtotalAED);
        categoryMap[category].deductible = categoryMap[category].deductible.plus(expSubtotalAED);
      }
    }

    const totalAccountingExpensesAED = cogsAED.plus(operatingExpensesAED);
    const accountingNetProfitAED = totalRevenueAED.minus(totalAccountingExpensesAED);

    // 5. Automated Corporate Tax Compliance Checks
    const findings: TaxComplianceFinding[] = [];

    // Check A: Small Business Relief eligibility warnings
    if (electSmallBusinessRelief) {
      if (totalRevenueAED.greaterThan(SBR_REVENUE_THRESHOLD)) {
        findings.push({
          id: 'FND-CT-SBR-REVENUE-BREACH',
          code: 'SBR_REVENUE_LIMIT_EXCEEDED',
          severity: 'CRITICAL',
          title: 'Small Business Relief Ineligible: Revenue Exceeds AED 3,000,000',
          description: `Current period revenue of AED ${totalRevenueAED.toFixed(2)} exceeds the statutory SBR threshold of AED 3,000,000 under Art. 21 and MD 73/2023.`,
          affectedRecordType: 'BUSINESS',
          affectedAmountAED: totalRevenueAED.toNumber(),
          legalReference: STATUTORY_CITATIONS.CT_SMALL_BUSINESS_RELIEF.legislation,
          recommendedAction: 'Small Business Relief cannot be elected. Taxable income will be assessed under standard 9% Corporate Tax rules.',
        });
      }

      const priorBreach = priorPeriodRevenues.find((r) => r > SBR_REVENUE_THRESHOLD.toNumber());
      if (priorBreach) {
        findings.push({
          id: 'FND-CT-SBR-PRIOR-BREACH',
          code: 'SBR_PRIOR_YEAR_BREACH',
          severity: 'CRITICAL',
          title: 'Small Business Relief Ineligible: Prior Period Revenue Breach',
          description: `A prior period had revenue of AED ${priorBreach.toFixed(2)}, which permanently disqualifies the entity from electing SBR under Ministerial Decision No. 73 of 2023.`,
          affectedRecordType: 'BUSINESS',
          affectedAmountAED: priorBreach,
          legalReference: STATUTORY_CITATIONS.CT_SMALL_BUSINESS_RELIEF.legislation,
          recommendedAction: 'Assess under standard Corporate Tax rules.',
        });
      }

      if (isQfzpClaimed) {
        findings.push({
          id: 'FND-CT-SBR-QFZP-CONFLICT',
          code: 'SBR_QFZP_MUTUALLY_EXCLUSIVE',
          severity: 'CRITICAL',
          title: 'Small Business Relief Ineligible for Qualifying Free Zone Persons',
          description: 'Qualifying Free Zone Persons are statutorily prohibited from electing Small Business Relief under Article 21(2)(a).',
          affectedRecordType: 'BUSINESS',
          legalReference: STATUTORY_CITATIONS.CT_SMALL_BUSINESS_RELIEF.legislation,
          recommendedAction: 'Elect either standard QFZP 0% treatment on Qualifying Income or standard Corporate Tax regime.',
        });
      }
    }

    // Check B: 50% Client Entertainment Disallowance
    if (clientEntertainmentExpenseAED.greaterThan(0)) {
      const disallowed = clientEntertainmentExpenseAED.times(0.5);
      findings.push({
        id: 'FND-CT-ENTERTAINMENT-ADD-BACK',
        code: 'ENTERTAINMENT_50_PCT_DISALLOWED',
        severity: 'INFO',
        title: '50% Entertainment Expense Add-Back Applied',
        description: `Under Article 32 of Federal Decree-Law No. (47) of 2022, 50% of client entertainment expenses (AED ${disallowed.toFixed(2)}) is non-deductible and has been added back to taxable income.`,
        affectedRecordType: 'EXPENSE',
        affectedAmountAED: disallowed.toNumber(),
        legalReference: STATUTORY_CITATIONS.CT_ENTERTAINMENT_DISALLOWANCE.legislation,
        recommendedAction: 'Retain client attendance rosters and itemized receipts for entertainment to substantiate the 50% deductible portion.',
      });
    }

    // Check C: Non-Deductible Government Fines
    if (nonDeductibleFinesAED.greaterThan(0)) {
      findings.push({
        id: 'FND-CT-FINES-ADD-BACK',
        code: 'FINES_PENALTIES_100_PCT_DISALLOWED',
        severity: 'WARNING',
        title: 'Non-Deductible Government Fines Added Back',
        description: `Under Article 33(1), AED ${nonDeductibleFinesAED.toFixed(2)} in fines or administrative penalties are 100% non-deductible and added back to taxable income.`,
        affectedRecordType: 'EXPENSE',
        affectedAmountAED: nonDeductibleFinesAED.toNumber(),
        legalReference: STATUTORY_CITATIONS.CT_FINES_PENALTIES.legislation,
        recommendedAction: 'Ensure fines are separated from ordinary operational expenses in accounting records.',
      });
    }

    // Check D: QFZP De Minimis Requirement
    if (isQfzpClaimed) {
      // Evaluate QFZP de minimis test
      const qfzpEval = CorporateTaxEngine.evaluateQfzpDeMinimis(totalRevenueAED, new Decimal(0));
      if (!qfzpEval.passesDeMinimis) {
        findings.push({
          id: 'FND-CT-QFZP-DE-MINIMIS-BREACH',
          code: 'QFZP_DE_MINIMIS_BREACH',
          severity: 'CRITICAL',
          title: 'QFZP De Minimis Requirement Breached',
          description: qfzpEval.explanation,
          affectedRecordType: 'BUSINESS',
          legalReference: STATUTORY_CITATIONS.CT_QFZP_REGIME.legislation,
          recommendedAction: 'Entity loses 0% QFZP status and becomes subject to standard 9% Corporate Tax.',
        });
      }
    }

    // 6. Map Legal Entity Type
    let mappedEntityType: LegalEntityType = 'LLC';
    if (business.legalEntityType === 'NATURAL_PERSON' || business.legalEntityType === 'SOLE_ESTABLISHMENT') {
      mappedEntityType = business.legalEntityType as LegalEntityType;
    } else if (business.legalEntityType === 'FREE_ZONE_ESTABLISHMENT' || business.legalEntityType === 'FREE_ZONE_COMPANY') {
      mappedEntityType = business.legalEntityType as LegalEntityType;
    } else if (business.legalEntityType === 'BRANCH_OF_FOREIGN_COMPANY') {
      mappedEntityType = 'BRANCH_OF_FOREIGN_COMPANY';
    }

    // 7. Execute Deterministic Corporate Tax Engine
    const ctInput: CorporateTaxEngineInput = {
      legalEntityType: mappedEntityType,
      taxPeriodStart: periodStart,
      taxPeriodEnd: periodEnd,
      revenueAED: totalRevenueAED,
      priorPeriodRevenues: priorPeriodRevenues.map((r) => new Decimal(r)),
      accountingNetProfit: accountingNetProfitAED,
      isSmallBusinessReliefElected: electSmallBusinessRelief,
      isQfzp: isQfzpClaimed,
      isMneGroup: isMneGroup,
      nonDeductibleFines: nonDeductibleFinesAED,
      clientEntertainmentExpense: clientEntertainmentExpenseAED,
      netInterestExpense: netInterestExpenseAED,
      taxEbitda: taxEbitda ? new Decimal(taxEbitda) : undefined,
      unutilizedPriorTaxLosses: new Decimal(unutilizedPriorTaxLosses),
    };

    const ctResult = CorporateTaxEngine.calculate(ctInput);

    // 8. Transform Adjustments
    const adjustments: CorporateTaxAdjustmentItem[] = ctResult.adjustments.map((adj) => ({
      code: adj.code,
      label: adj.label,
      statutoryReference: adj.statutoryReference,
      amountAED: adj.amountAED.toNumber(),
      isAdditionToProfit: adj.isAdditionToProfit,
      rationale: adj.rationale,
    }));

    // 9. Format Expense Breakdown
    const expenseBreakdown = Object.entries(categoryMap).map(([cat, val]) => ({
      category: cat,
      amountAED: val.total.toNumber(),
      ctDeductibleAED: val.deductible.toNumber(),
      disallowedAED: val.disallowed.toNumber(),
    }));

    // 10. Compliance Health Score
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'CRITICAL') score -= 25;
      else if (f.severity === 'WARNING') score -= 10;
      else score -= 3;
    }
    const complianceScore = Math.max(0, Math.min(100, score));

    let status: AssessmentStatusEnum = 'DRAFT';
    if (findings.some((f) => f.severity === 'CRITICAL')) {
      status = 'REQUIRES_ATTENTION';
    } else if (complianceScore >= 80) {
      status = 'READY_FOR_REVIEW';
    }

    const periodKey = `FY${financialYear}`;

    // 11. Handle Historical Reassessment & Lineage
    const existingAssessment = await this.prisma.taxAssessment.findFirst({
      where: {
        businessId,
        taxType: 'CORPORATE_TAX',
        periodKey,
        status: { not: 'SUPERSEDED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    let reassessedFromId: string | null = null;
    if (existingAssessment) {
      await this.prisma.taxAssessment.update({
        where: { id: existingAssessment.id },
        data: { status: 'SUPERSEDED' },
      });
      reassessedFromId = existingAssessment.id;
      this.logger.log(`Superseded existing CT assessment ${existingAssessment.id} for ${periodKey}`);
    }

    const calculationJson = {
      reconciliation: {
        totalRevenueAED: totalRevenueAED.toNumber(),
        cogsAED: cogsAED.toNumber(),
        operatingExpensesAED: operatingExpensesAED.toNumber(),
        accountingNetProfitAED: accountingNetProfitAED.toNumber(),
        totalAdditionsAED: ctResult.totalAdditions.toNumber(),
        totalSubtractionsAED: ctResult.totalSubtractions.toNumber(),
        taxableIncomeBeforeReliefsAED: ctResult.taxableIncomeBeforeReliefs.toNumber(),
        isSmallBusinessReliefApplied: ctResult.isSmallBusinessReliefApplied,
        taxLossOffsetAppliedAED: ctResult.taxLossOffsetApplied.toNumber(),
        remainingTaxLossesAED: ctResult.remainingTaxLosses.toNumber(),
        finalTaxableIncomeAED: ctResult.finalTaxableIncome.toNumber(),
        corporateTaxPayableAED: ctResult.corporateTaxPayableAED.toNumber(),
        effectiveTaxRatePct: ctResult.effectiveTaxRatePct.toNumber(),
      },
      adjustments,
      expenseBreakdown,
      ruleSetVersion: CT_RULESET_VERSION,
      statutoryCitations: [
        STATUTORY_CITATIONS.CT_BASIC_LAW,
        STATUTORY_CITATIONS.CT_SMALL_BUSINESS_RELIEF,
        STATUTORY_CITATIONS.CT_ENTERTAINMENT_DISALLOWANCE,
        STATUTORY_CITATIONS.CT_FINES_PENALTIES,
        STATUTORY_CITATIONS.CT_TAX_LOSS_RELIEF,
      ],
    };

    // 12. Persist TaxAssessment and TaxAdjustment records
    const savedAssessment = await this.prisma.taxAssessment.create({
      data: {
        businessId,
        taxType: 'CORPORATE_TAX',
        periodKey,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        status: status as any,
        ruleSetVersion: CT_RULESET_VERSION,
        grossRevenueAED: totalRevenueAED.toNumber(),
        accountingProfitAED: accountingNetProfitAED.toNumber(),
        taxableIncomeAED: ctResult.finalTaxableIncome.toNumber(),
        netTaxPayableAED: ctResult.corporateTaxPayableAED.toNumber(),
        effectiveTaxRate: ctResult.effectiveTaxRatePct.toNumber(),
        isSmallBizRelief: ctResult.isSmallBusinessReliefApplied,
        isQfzpClaimed: isQfzpClaimed,
        complianceScore,
        complianceFindings: findings as any,
        sourceInvoicesCount: invoices.length,
        sourceExpensesCount: expenses.length,
        calculationJson: calculationJson as any,
        reassessedFromId,
        notes: `Corporate Tax assessment for ${periodKey}. Evaluated ${invoices.length} invoices and ${expenses.length} expense bills.`,
        adjustments: {
          create: adjustments.map((adj) => ({
            code: adj.code,
            label: adj.label,
            legalReference: adj.statutoryReference,
            amountAED: adj.amountAED,
            isAddition: adj.isAdditionToProfit,
            reason: adj.rationale,
          })),
        },
      },
    });

    this.logger.log(`Created persistent CT assessment ${savedAssessment.id} for business ${businessId} [Tax: AED ${ctResult.corporateTaxPayableAED.toFixed(2)}]`);

    return {
      assessmentId: savedAssessment.id,
      businessId,
      periodKey,
      periodStartDate: periodStart.toISOString().split('T')[0],
      periodEndDate: periodEnd.toISOString().split('T')[0],
      status,
      ruleSetVersion: CT_RULESET_VERSION,
      legalEntityType: mappedEntityType,
      accountingRevenueAED: totalRevenueAED.toNumber(),
      cogsAED: cogsAED.toNumber(),
      operatingExpensesAED: operatingExpensesAED.toNumber(),
      accountingNetProfitAED: accountingNetProfitAED.toNumber(),
      totalAdditionsAED: ctResult.totalAdditions.toNumber(),
      totalSubtractionsAED: ctResult.totalSubtractions.toNumber(),
      taxableIncomeBeforeReliefsAED: ctResult.taxableIncomeBeforeReliefs.toNumber(),
      isSmallBusinessReliefApplied: ctResult.isSmallBusinessReliefApplied,
      isQfzpApplied: isQfzpClaimed,
      taxLossOffsetAppliedAED: ctResult.taxLossOffsetApplied.toNumber(),
      remainingTaxLossesAED: ctResult.remainingTaxLosses.toNumber(),
      finalTaxableIncomeAED: ctResult.finalTaxableIncome.toNumber(),
      corporateTaxPayableAED: ctResult.corporateTaxPayableAED.toNumber(),
      effectiveTaxRatePct: ctResult.effectiveTaxRatePct.toNumber(),
      complianceScore,
      adjustments,
      findings,
      expenseBreakdown,
      sourceCounts: {
        invoicesCount: invoices.length,
        expensesCount: expenses.length,
      },
      reassessedFromId,
      createdAt: savedAssessment.createdAt.toISOString(),
      updatedAt: savedAssessment.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves a specific Corporate Tax Assessment by ID with tenant isolation.
   */
  public async getCorporateTaxAssessmentById(
    assessmentId: string,
    organisationId: string
  ): Promise<CorporateTaxAssessmentSummary> {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        business: true,
        adjustments: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not have permission to view this assessment.');
    }

    const calcJson = (assessment.calculationJson as any) || {};
    const recon = calcJson.reconciliation || {};

    const adjustments: CorporateTaxAdjustmentItem[] = (assessment.adjustments || []).map((adj) => ({
      code: adj.code || '',
      label: adj.label,
      statutoryReference: adj.legalReference,
      amountAED: Number(adj.amountAED),
      isAdditionToProfit: adj.isAddition ?? true,
      rationale: adj.reason,
    }));

    return {
      assessmentId: assessment.id,
      businessId: assessment.businessId,
      periodKey: assessment.periodKey || 'CUSTOM',
      periodStartDate: assessment.periodStartDate ? assessment.periodStartDate.toISOString().split('T')[0] : '',
      periodEndDate: assessment.periodEndDate ? assessment.periodEndDate.toISOString().split('T')[0] : '',
      status: assessment.status as AssessmentStatusEnum,
      ruleSetVersion: assessment.ruleSetVersion,
      legalEntityType: assessment.business.legalEntityType,
      accountingRevenueAED: Number(assessment.grossRevenueAED),
      cogsAED: recon.cogsAED || 0,
      operatingExpensesAED: recon.operatingExpensesAED || 0,
      accountingNetProfitAED: Number(assessment.accountingProfitAED || 0),
      totalAdditionsAED: recon.totalAdditionsAED || 0,
      totalSubtractionsAED: recon.totalSubtractionsAED || 0,
      taxableIncomeBeforeReliefsAED: recon.taxableIncomeBeforeReliefsAED || 0,
      isSmallBusinessReliefApplied: assessment.isSmallBizRelief,
      isQfzpApplied: assessment.isQfzpClaimed,
      taxLossOffsetAppliedAED: recon.taxLossOffsetAppliedAED || 0,
      remainingTaxLossesAED: recon.remainingTaxLossesAED || 0,
      finalTaxableIncomeAED: Number(assessment.taxableIncomeAED || 0),
      corporateTaxPayableAED: Number(assessment.netTaxPayableAED),
      effectiveTaxRatePct: Number(assessment.effectiveTaxRate || 0),
      complianceScore: assessment.complianceScore ?? 100,
      adjustments,
      findings: (assessment.complianceFindings as any[]) || [],
      expenseBreakdown: calcJson.expenseBreakdown || [],
      sourceCounts: {
        invoicesCount: assessment.sourceInvoicesCount || 0,
        expensesCount: assessment.sourceExpensesCount || 0,
      },
      reassessedFromId: assessment.reassessedFromId,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  }
}
