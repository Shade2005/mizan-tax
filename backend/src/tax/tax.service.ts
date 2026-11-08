// ============================================================================
// Mizan (ميزان) - Comprehensive Tax Intelligence Service
// Unified Facade for Statutory Calculation Engines, Persistent Assessments & Grounded AI
// ============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VatAssessmentService } from './vat-assessment.service';
import { CorporateTaxAssessmentService } from './corporate-tax-assessment.service';
import { RagService } from '../ai/rag.service';
import {
  CorporateTaxEngine,
  CorporateTaxEngineResult,
} from '../tax-engine/corporate-tax.engine';
import {
  VatEngine,
  VatTransactionLine,
  VatReturn201Result,
} from '../tax-engine/vat.engine';
import {
  AssessVatPeriodDto,
  AssessCorporateTaxPeriodDto,
  VatAssessmentSummary,
  CorporateTaxAssessmentSummary,
  AssessmentStatusEnum,
} from './tax.types';
import { STATUTORY_CITATIONS } from './statutory-rules.config';
import { Decimal } from 'decimal.js';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vatAssessmentService: VatAssessmentService,
    private readonly ctAssessmentService: CorporateTaxAssessmentService,
    private readonly ragService: RagService
  ) {}

  // ============================================================================
  // PERSISTENT BUSINESS ASSESSMENTS (PHASE 6.6)
  // ============================================================================

  /**
   * Generates a persistent VAT Return 201 assessment from real invoices & expenses
   */
  public async assessBusinessVat(
    dto: AssessVatPeriodDto,
    organisationId: string
  ): Promise<VatAssessmentSummary> {
    return this.vatAssessmentService.assessBusinessVat(dto, organisationId);
  }

  /**
   * Generates a persistent Corporate Tax assessment from real bookkeeping records
   */
  public async assessBusinessCorporateTax(
    dto: AssessCorporateTaxPeriodDto,
    organisationId: string
  ): Promise<CorporateTaxAssessmentSummary> {
    return this.ctAssessmentService.assessBusinessCorporateTax(dto, organisationId);
  }

  /**
   * Lists all historical assessments for a business (scoped to authenticated tenant)
   */
  public async listBusinessAssessments(
    businessId: string,
    organisationId: string,
    taxType?: 'VAT' | 'CORPORATE_TAX'
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException(`Business ${businessId} not found.`);
    }

    if (business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not have permission to view assessments for this business.');
    }

    const where: any = { businessId };
    if (taxType) {
      where.taxType = taxType;
    }

    const assessments = await this.prisma.taxAssessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        adjustments: true,
      },
    });

    return assessments.map((a) => ({
      id: a.id,
      businessId: a.businessId,
      taxType: a.taxType,
      periodKey: a.periodKey || 'CUSTOM',
      periodStartDate: a.periodStartDate ? a.periodStartDate.toISOString().split('T')[0] : null,
      periodEndDate: a.periodEndDate ? a.periodEndDate.toISOString().split('T')[0] : null,
      assessmentDate: a.assessmentDate.toISOString(),
      status: a.status,
      ruleSetVersion: a.ruleSetVersion,
      grossRevenueAED: Number(a.grossRevenueAED),
      accountingProfitAED: a.accountingProfitAED ? Number(a.accountingProfitAED) : null,
      taxableIncomeAED: a.taxableIncomeAED ? Number(a.taxableIncomeAED) : null,
      outputVatAED: a.outputVatAED ? Number(a.outputVatAED) : null,
      recoverableVatAED: a.recoverableVatAED ? Number(a.recoverableVatAED) : null,
      netTaxPayableAED: Number(a.netTaxPayableAED),
      effectiveTaxRate: a.effectiveTaxRate ? Number(a.effectiveTaxRate) : null,
      isSmallBizRelief: a.isSmallBizRelief,
      isQfzpClaimed: a.isQfzpClaimed,
      complianceScore: a.complianceScore ?? 100,
      findingsCount: Array.isArray(a.complianceFindings) ? (a.complianceFindings as any[]).length : 0,
      sourceInvoicesCount: a.sourceInvoicesCount || 0,
      sourceExpensesCount: a.sourceExpensesCount || 0,
      reassessedFromId: a.reassessedFromId,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Retrieves a single assessment summary by ID
   */
  public async getAssessmentById(assessmentId: string, organisationId: string) {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: { business: true },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    if (assessment.taxType === 'VAT') {
      return this.vatAssessmentService.getVatAssessmentById(assessmentId, organisationId);
    } else {
      return this.ctAssessmentService.getCorporateTaxAssessmentById(assessmentId, organisationId);
    }
  }

  /**
   * Updates an assessment's user review status (e.g. REVIEWED, DRAFT, etc.)
   */
  public async updateAssessmentStatus(
    assessmentId: string,
    status: AssessmentStatusEnum,
    notes: string | undefined,
    organisationId: string
  ) {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: { business: true },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    if (assessment.status === 'SUPERSEDED') {
      throw new BadRequestException('Cannot change status of a SUPERSEDED assessment.');
    }

    const updated = await this.prisma.taxAssessment.update({
      where: { id: assessmentId },
      data: {
        status: status as any,
        notes: notes !== undefined ? notes : assessment.notes,
      },
    });

    this.logger.log(`Assessment ${assessmentId} status updated to ${status}`);

    return {
      id: updated.id,
      status: updated.status,
      notes: updated.notes,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Reassesses an existing assessment period, preserving lineage
   */
  public async reassess(assessmentId: string, organisationId: string) {
    const existing = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: { business: true },
    });

    if (!existing) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (existing.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    if (existing.taxType === 'VAT') {
      return this.vatAssessmentService.assessBusinessVat(
        {
          businessId: existing.businessId,
          periodKey: existing.periodKey || 'CUSTOM',
          startDate: existing.periodStartDate ? existing.periodStartDate.toISOString().split('T')[0] : '2026-01-01',
          endDate: existing.periodEndDate ? existing.periodEndDate.toISOString().split('T')[0] : '2026-12-31',
        },
        organisationId
      );
    } else {
      const year = existing.periodStartDate ? existing.periodStartDate.getFullYear() : 2026;
      return this.ctAssessmentService.assessBusinessCorporateTax(
        {
          businessId: existing.businessId,
          financialYear: year,
          startDate: existing.periodStartDate ? existing.periodStartDate.toISOString().split('T')[0] : `${year}-01-01`,
          endDate: existing.periodEndDate ? existing.periodEndDate.toISOString().split('T')[0] : `${year}-12-31`,
          electSmallBusinessRelief: existing.isSmallBizRelief,
          isQfzpClaimed: existing.isQfzpClaimed,
        },
        organisationId
      );
    }
  }

  /**
   * AI-powered grounded explanation layer for a specific assessment
   * Answers user questions using actual assessment calculations and statutory RAG citations.
   */
  public async explainAssessmentWithAi(
    assessmentId: string,
    userQuestion: string,
    language: 'en' | 'ar' = 'en',
    organisationId: string
  ) {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        business: {
          include: { taxRegistrations: true },
        },
        adjustments: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    const calcJson = (assessment.calculationJson as any) || {};

    // Build context-rich prompt integrating real persisted financial amounts
    let contextSummary = '';
    if (assessment.taxType === 'VAT') {
      const boxes = calcJson.boxes || [];
      contextSummary = `
Active Business: ${assessment.business.legalName}
Tax Type: Value Added Tax (VAT 201)
Period: ${assessment.periodKey} (${assessment.periodStartDate?.toISOString().split('T')[0]} to ${assessment.periodEndDate?.toISOString().split('T')[0]})
Status: ${assessment.status}
Compliance Score: ${assessment.complianceScore}/100
Gross Taxable Sales: AED ${Number(assessment.grossRevenueAED).toFixed(2)}
Output VAT Due (Box 8): AED ${Number(assessment.outputVatAED || 0).toFixed(2)}
Total Recoverable Input VAT (Box 11): AED ${Number(assessment.recoverableVatAED || 0).toFixed(2)}
Net VAT Position (Box 12): AED ${Number(assessment.netTaxPayableAED).toFixed(2)} (${Number(assessment.netTaxPayableAED) >= 0 ? 'Payable to FTA' : 'Refundable'})
Compliance Findings: ${JSON.stringify(assessment.complianceFindings || [])}
Statutory Return Boxes: ${JSON.stringify(boxes)}
`;
    } else {
      const recon = calcJson.reconciliation || {};
      const adjustments = assessment.adjustments || [];
      contextSummary = `
Active Business: ${assessment.business.legalName} (${assessment.business.legalEntityType})
Tax Type: UAE Corporate Tax
Financial Year / Period: ${assessment.periodKey}
Status: ${assessment.status}
Compliance Score: ${assessment.complianceScore}/100
Accounting Revenue: AED ${Number(assessment.grossRevenueAED).toFixed(2)}
Accounting Net Profit: AED ${Number(assessment.accountingProfitAED || 0).toFixed(2)}
Taxable Income Before Reliefs: AED ${recon.taxableIncomeBeforeReliefsAED ?? '0.00'}
Small Business Relief Applied: ${assessment.isSmallBizRelief ? 'YES (Taxable Income = AED 0)' : 'NO'}
Final Taxable Income: AED ${Number(assessment.taxableIncomeAED || 0).toFixed(2)}
Corporate Tax Payable (9% over 375k): AED ${Number(assessment.netTaxPayableAED).toFixed(2)}
Effective Tax Rate: ${Number(assessment.effectiveTaxRate || 0)}%
Tax Adjustments: ${adjustments.map((a) => `${a.label} (${a.legalReference}): AED ${Number(a.amountAED).toFixed(2)} [${a.reason}]`).join('; ')}
Compliance Findings: ${JSON.stringify(assessment.complianceFindings || [])}
`;
    }

    const enhancedQuery = `
Assessment Financial Context:
${contextSummary}

User Question:
${userQuestion}

Please explain the assessment figures, clarify the tax treatment, cite the relevant UAE legislation (Federal Decree-Law No. 8 of 2017 or No. 47 of 2022, Cabinet Decisions, or FTA Decisions), and provide actionable guidance.
`;

    const ragResult = await this.ragService.generateGroundedAnswer({
      query: enhancedQuery,
      language,
      businessContext: {
        legalForm: assessment.business.legalEntityType,
        isFreeZone: assessment.business.jurisdictionType !== 'MAINLAND',
        annualRevenue: Number(assessment.grossRevenueAED),
        isVatRegistered: assessment.business.taxRegistrations.some((r) => r.taxType === 'VAT' && r.status === 'REGISTERED'),
        isCorporateTaxRegistered: assessment.business.taxRegistrations.some((r) => r.taxType === 'CORPORATE_TAX'),
      },
    });

    return {
      assessmentId: assessment.id,
      taxType: assessment.taxType,
      periodKey: assessment.periodKey,
      userQuestion,
      explanation: ragResult.answer,
      citations: ragResult.citations,
      statutoryRationale: ragResult.statutoryRationale,
      actionRequired: ragResult.actionRequired,
      suggestedFollowUps: ragResult.suggestedFollowUps,
      isGrounded: ragResult.isGrounded,
    };
  }

  /**
   * Retrieves relevant statutory citations for a specific assessment
   */
  public async getAssessmentLegalReferences(assessmentId: string, organisationId: string) {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: { business: true },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    if (assessment.taxType === 'VAT') {
      return [
        STATUTORY_CITATIONS.VAT_BASIC_LAW,
        STATUTORY_CITATIONS.VAT_BLOCKED_INPUTS_ART_53,
        STATUTORY_CITATIONS.VAT_EMPLOYEE_EXPENSES_DEC_17,
        STATUTORY_CITATIONS.VAT_TAX_INVOICE_ART_59_65,
      ];
    } else {
      return [
        STATUTORY_CITATIONS.CT_BASIC_LAW,
        STATUTORY_CITATIONS.CT_SMALL_BUSINESS_RELIEF,
        STATUTORY_CITATIONS.CT_ENTERTAINMENT_DISALLOWANCE,
        STATUTORY_CITATIONS.CT_FINES_PENALTIES,
        STATUTORY_CITATIONS.CT_INTEREST_LIMITATION_GIDLR,
        STATUTORY_CITATIONS.CT_TAX_LOSS_RELIEF,
        STATUTORY_CITATIONS.CT_EXEMPT_INCOME,
        STATUTORY_CITATIONS.CT_NATURAL_PERSON,
        STATUTORY_CITATIONS.CT_QFZP_REGIME,
      ];
    }
  }

  // ============================================================================
  // STATELESS ENGINE CALCULATIONS (PRESERVED FROM EARLIER PHASES)
  // ============================================================================

  /**
   * Deterministic Corporate Tax calculation
   */
  public calculateCorporateTax(input: any): CorporateTaxEngineResult {
    return CorporateTaxEngine.calculate({
      legalEntityType: input.legalEntityType || 'LLC',
      taxPeriodStart: input.taxPeriodStart ? new Date(input.taxPeriodStart) : new Date('2026-01-01'),
      taxPeriodEnd: input.taxPeriodEnd ? new Date(input.taxPeriodEnd) : new Date('2026-12-31'),
      revenueAED: new Decimal(input.revenueAED || 0),
      priorPeriodRevenues: (input.priorPeriodRevenues || []).map((r: any) => new Decimal(r)),
      accountingNetProfit: new Decimal(input.accountingNetProfit || 0),
      isSmallBusinessReliefElected: !!input.isSmallBusinessReliefElected,
      isQfzp: !!input.isQfzp,
      isMneGroup: !!input.isMneGroup,
      nonDeductibleFines: input.nonDeductibleFines ? new Decimal(input.nonDeductibleFines) : undefined,
      clientEntertainmentExpense: input.clientEntertainmentExpense ? new Decimal(input.clientEntertainmentExpense) : undefined,
      netInterestExpense: input.netInterestExpense ? new Decimal(input.netInterestExpense) : undefined,
      taxEbitda: input.taxEbitda ? new Decimal(input.taxEbitda) : undefined,
      unutilizedPriorTaxLosses: input.unutilizedPriorTaxLosses ? new Decimal(input.unutilizedPriorTaxLosses) : undefined,
    });
  }

  /**
   * Deterministic VAT 201 Return calculation
   */
  public calculateVat201(lines: any[]): VatReturn201Result {
    const parsedLines: VatTransactionLine[] = (lines || []).map((l, idx) => ({
      id: l.id || `line-${idx}`,
      isSale: !!l.isSale,
      amountAED: new Decimal(l.amountAED || 0),
      vatRateCategory: l.vatRateCategory || 'STANDARD_5',
      isReverseChargeService: !!l.isReverseChargeService,
      isEntertainmentOrHospitality: !!l.isEntertainmentOrHospitality,
      isEmployeeExpense: !!l.isEmployeeExpense,
      employeeExpenseCategory: l.employeeExpenseCategory,
      hasValidTaxInvoice: l.hasValidTaxInvoice !== false,
    }));

    return VatEngine.calculateVatReturn201(parsedLines);
  }
}
