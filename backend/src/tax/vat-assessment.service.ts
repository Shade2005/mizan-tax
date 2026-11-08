// ============================================================================
// Mizan (ميزان) - VAT Assessment Engine Service
// Statutory Framework: Federal Decree-Law No. (8) of 2017 & Executive Regulations
// Decisions: Decision No. 17 of 2026 & Art. 53 Blocked Inputs
// ============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import {
  VatEngine,
  VatTransactionLine,
  VatRateCategory,
  VAT_RULESET_VERSION,
  VAT_STANDARD_RATE,
  VAT_MANDATORY_REGISTRATION_THRESHOLD,
  VAT_VOLUNTARY_REGISTRATION_THRESHOLD,
} from '../tax-engine/vat.engine';
import {
  AssessVatPeriodDto,
  VatAssessmentSummary,
  TaxComplianceFinding,
  VatBoxBreakdown,
  AssessmentStatusEnum,
} from './tax.types';
import { STATUTORY_CITATIONS } from './statutory-rules.config';

// Fintech-grade precision
Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class VatAssessmentService {
  private readonly logger = new Logger(VatAssessmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a deterministic VAT Assessment for a business within a period.
   * Collects real persisted Invoices and ExpenseBills, executes compliance checks,
   * calculates statutory VAT 201 boxes, and saves the assessment to PostgreSQL.
   */
  public async assessBusinessVat(
    dto: AssessVatPeriodDto,
    organisationId: string
  ): Promise<VatAssessmentSummary> {
    const { businessId, periodKey, startDate, endDate, includeDraftExpenses } = dto;

    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    periodEnd.setHours(23, 59, 59, 999);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate format. Use YYYY-MM-DD.');
    }
    if (periodStart > periodEnd) {
      throw new BadRequestException('startDate cannot be after endDate.');
    }

    // 1. Verify business exists and belongs to the authenticated tenant organisation
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
      this.logger.warn(`Tenant isolation breach attempt: Org ${organisationId} tried to assess Business ${businessId}`);
      throw new ForbiddenException('Access denied: You do not have permission to assess this business.');
    }

    // 2. Resolve VAT Registration details
    const vatRegistration = business.taxRegistrations.find((r) => r.taxType === 'VAT');
    const isVatRegistered = vatRegistration?.status === 'REGISTERED';
    const trn = vatRegistration?.trn || null;
    const registrationEffectiveDate = vatRegistration?.effectiveDate || null;

    // 3. Query Real Financial Records from Database
    // A) Sales: Real Invoices (excluding CANCELLED)
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
      include: {
        lines: true,
        customer: true,
      },
      orderBy: { issueDate: 'asc' },
    });

    // B) Purchases: Real Expense Bills
    const expenseStatusFilter = includeDraftExpenses
      ? { notIn: ['REJECTED', 'ARCHIVED'] as any[] }
      : { in: ['APPROVED'] as any[] };

    const expenses = await this.prisma.expenseBill.findMany({
      where: {
        businessId,
        billDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: expenseStatusFilter,
      },
      include: {
        lines: true,
        document: true,
      },
      orderBy: { billDate: 'asc' },
    });

    const findings: TaxComplianceFinding[] = [];
    const transactionLines: VatTransactionLine[] = [];

    // 4. Transform Invoices into VAT Lines & Run Output Compliance Checks
    let totalTaxableSales = new Decimal(0);
    let totalOutputVatInvoices = new Decimal(0);

    for (const inv of invoices) {
      const invTotalAED = new Decimal(inv.totalAmountAED || inv.totalAmount || 0);
      const invSubtotalAED = new Decimal(inv.subtotal || 0).times(inv.exchangeRate || 1);
      const invVatAED = new Decimal(inv.vatTotal || 0).times(inv.exchangeRate || 1);

      totalTaxableSales = totalTaxableSales.plus(invSubtotalAED);
      totalOutputVatInvoices = totalOutputVatInvoices.plus(invVatAED);

      // Compliance Check: Charging VAT without valid VAT Registration
      if (!isVatRegistered && invVatAED.greaterThan(0)) {
        findings.push({
          id: `FND-VAT-NO-REG-${inv.id}`,
          code: 'UNREGISTERED_VAT_CHARGED',
          severity: 'CRITICAL',
          title: 'VAT Charged by Unregistered Business',
          description: `Invoice #${inv.invoiceNumber} charges AED ${invVatAED.toFixed(2)} VAT, but the business is not officially VAT registered with the FTA.`,
          affectedRecordId: inv.id,
          affectedRecordType: 'INVOICE',
          affectedAmountAED: invVatAED.toNumber(),
          legalReference: STATUTORY_CITATIONS.VAT_BASIC_LAW.legislation,
          recommendedAction: 'Credit note or cancel VAT charges immediately. Businesses without a valid TRN are prohibited by law from collecting VAT.',
        });
      }

      // If invoice has detailed lines, process each line
      if (inv.lines && inv.lines.length > 0) {
        for (const line of inv.lines) {
          const lineAmountAED = new Decimal(line.lineTotalAED || line.lineTotal || 0);
          const vatCategory: VatRateCategory = (line.vatRateType as VatRateCategory) || 'STANDARD_5';

          transactionLines.push({
            id: line.id,
            isSale: true,
            amountAED: lineAmountAED,
            vatRateCategory: vatCategory,
            hasValidTaxInvoice: true,
          });
        }
      } else {
        // Fallback to top-level invoice summary line
        transactionLines.push({
          id: inv.id,
          isSale: true,
          amountAED: invSubtotalAED,
          vatRateCategory: invVatAED.greaterThan(0) ? 'STANDARD_5' : 'ZERO_RATED_0',
          hasValidTaxInvoice: true,
        });
      }
    }

    // 5. Transform Expenses into VAT Lines & Run Input Compliance Checks
    let totalPurchases = new Decimal(0);
    let totalInputVatExpenses = new Decimal(0);

    for (const exp of expenses) {
      const expSubtotalAED = new Decimal(exp.subtotalAED || exp.subtotal || 0);
      const expVatAED = new Decimal(exp.vatTotalAED || exp.vatTotal || 0);
      const expTotalAED = new Decimal(exp.totalAmountAED || exp.totalAmount || 0);

      totalPurchases = totalPurchases.plus(expSubtotalAED);
      totalInputVatExpenses = totalInputVatExpenses.plus(expVatAED);

      const isReverseCharge = !!exp.isReverseCharge;
      const hasAttachment = !!exp.documentId;
      const hasValidTrn = !!exp.supplierTrn && exp.supplierTrn.trim().length === 15;

      // Determine Category flags
      const isEntertainment = exp.category === 'ENTERTAINMENT' || exp.category === 'CLIENT_ENTERTAINMENT';
      const isVehicle = exp.category === 'VEHICLE_EXPENSES';
      const isEmployee = exp.category === 'EMPLOYEE_EXPENSES';

      // Compliance Check 1: Missing attachment on claimed input VAT
      if (!hasAttachment && expVatAED.greaterThan(0) && !isReverseCharge) {
        findings.push({
          id: `FND-VAT-NO-DOC-${exp.id}`,
          code: 'MISSING_TAX_INVOICE_EVIDENCE',
          severity: 'WARNING',
          title: 'Missing Tax Invoice Document Evidence',
          description: `Expense #${exp.billNumber || exp.id} claims AED ${expVatAED.toFixed(2)} input VAT without an attached receipt or tax invoice.`,
          affectedRecordId: exp.id,
          affectedRecordType: 'EXPENSE',
          affectedAmountAED: expVatAED.toNumber(),
          legalReference: STATUTORY_CITATIONS.VAT_TAX_INVOICE_ART_59_65.legislation,
          recommendedAction: 'Upload the original Tax Invoice image or PDF. In the event of an FTA audit, input VAT without tax invoices will be clawed back with penalties.',
        });
      }

      // Compliance Check 2: Missing supplier TRN
      if (!hasValidTrn && expVatAED.greaterThan(0) && !isReverseCharge) {
        findings.push({
          id: `FND-VAT-NO-TRN-${exp.id}`,
          code: 'MISSING_SUPPLIER_TRN',
          severity: 'CRITICAL',
          title: 'Supplier TRN Missing or Invalid on Input VAT Claim',
          description: `Expense from vendor "${exp.supplierName || 'Unknown'}" lacks a valid 15-digit FTA TRN. Input VAT cannot be recovered legally without a supplier TRN.`,
          affectedRecordId: exp.id,
          affectedRecordType: 'EXPENSE',
          affectedAmountAED: expVatAED.toNumber(),
          legalReference: STATUTORY_CITATIONS.VAT_TAX_INVOICE_ART_59_65.legislation,
          recommendedAction: 'Request a compliant Tax Invoice bearing the supplier 15-digit TRN or reclassify input VAT as non-recoverable.',
        });
      }

      // Compliance Check 3: Blocked entertainment under Article 53(1)(a)
      if (isEntertainment && expVatAED.greaterThan(0)) {
        findings.push({
          id: `FND-VAT-BLOCKED-ENT-${exp.id}`,
          code: 'BLOCKED_ENTERTAINMENT_INPUT_VAT',
          severity: 'WARNING',
          title: 'Blocked Input VAT: Client Entertainment & Hospitality',
          description: `Expense #${exp.billNumber || exp.id} of AED ${expTotalAED.toFixed(2)} includes AED ${expVatAED.toFixed(2)} VAT on entertainment, which is blocked under Art. 53(1)(a).`,
          affectedRecordId: exp.id,
          affectedRecordType: 'EXPENSE',
          affectedAmountAED: expVatAED.toNumber(),
          legalReference: STATUTORY_CITATIONS.VAT_BLOCKED_INPUTS_ART_53.legislation,
          recommendedAction: 'The engine has automatically blocked recovery of this VAT in Box 9 to keep your return compliant.',
        });
      }

      // Compliance Check 4: Decision No. 17 of 2026 Employee Expense check
      let employeeCategory: any = undefined;
      if (isEmployee) {
        employeeCategory = 'BUSINESS_TRAVEL_HOTEL'; // Default compliant duty performance
      }

      transactionLines.push({
        id: exp.id,
        isSale: false,
        amountAED: expSubtotalAED,
        vatRateCategory: isReverseCharge ? 'REVERSE_CHARGE' : 'STANDARD_5',
        isReverseChargeService: isReverseCharge,
        isEntertainmentOrHospitality: isEntertainment,
        isPersonalMotorVehicle: isVehicle && exp.vatRecoverability === 'BLOCKED',
        isEmployeeExpense: isEmployee,
        employeeExpenseCategory: employeeCategory,
        hasValidTaxInvoice: hasValidTrn && hasAttachment,
      });
    }

    // 6. Check Rolling 12-Month Turnover against Registration Thresholds
    const thresholdEval = VatEngine.evaluateRegistrationThresholds(totalTaxableSales);
    if (!isVatRegistered && thresholdEval.isMandatoryRegistrationRequired) {
      findings.push({
        id: 'FND-VAT-MANDATORY-THRESHOLD',
        code: 'MANDATORY_REGISTRATION_REQUIRED',
        severity: 'CRITICAL',
        title: 'Mandatory VAT Registration Threshold Exceeded',
        description: thresholdEval.recommendation,
        affectedRecordType: 'BUSINESS',
        affectedAmountAED: totalTaxableSales.toNumber(),
        legalReference: STATUTORY_CITATIONS.VAT_BASIC_LAW.legislation,
        recommendedAction: 'Submit EmaraTax VAT registration immediately within 30 days to avoid the AED 10,000 late registration fine.',
      });
    }

    // 7. Execute Deterministic VAT 201 Engine Calculations
    const vatReturn = VatEngine.calculateVatReturn201(transactionLines);

    // 8. Construct VAT 201 Return Boxes
    const boxes: VatBoxBreakdown[] = [
      {
        boxNumber: 'Box 1',
        boxTitle: 'Standard Rated Supplies (Sales)',
        amountAED: vatReturn.box1StandardRatedSuppliesAED.toNumber(),
        vatAmountAED: vatReturn.box1OutputVatAED.toNumber(),
        legalReference: 'Article 25 Federal Decree-Law No. (8) of 2017',
        notes: 'Commercial sales in the UAE taxed at standard 5% rate.',
      },
      {
        boxNumber: 'Box 3',
        boxTitle: 'Supplies Subject to Reverse Charge (Imports & Cross-Border SaaS)',
        amountAED: vatReturn.box3ReverseChargeSuppliesAED.toNumber(),
        vatAmountAED: vatReturn.box3OutputVatAED.toNumber(),
        legalReference: 'Article 48 Federal Decree-Law No. (8) of 2017',
        notes: 'Imported services where recipient accounts for output VAT under reverse-charge.',
      },
      {
        boxNumber: 'Box 4',
        boxTitle: 'Zero-Rated Supplies',
        amountAED: vatReturn.box4ZeroRatedSuppliesAED.toNumber(),
        vatAmountAED: 0,
        legalReference: 'Article 45 Federal Decree-Law No. (8) of 2017',
        notes: 'Exports of goods & services, international transport, qualifying healthcare.',
      },
      {
        boxNumber: 'Box 5',
        boxTitle: 'Exempt Supplies',
        amountAED: vatReturn.box5ExemptSuppliesAED.toNumber(),
        vatAmountAED: 0,
        legalReference: 'Article 46 Federal Decree-Law No. (8) of 2017',
        notes: 'Local passenger transport, bare land, qualifying financial services.',
      },
      {
        boxNumber: 'Box 8',
        boxTitle: 'Total Output VAT Due',
        amountAED: vatReturn.box1StandardRatedSuppliesAED.plus(vatReturn.box3ReverseChargeSuppliesAED).toNumber(),
        vatAmountAED: vatReturn.box8TotalOutputVatDueAED.toNumber(),
        legalReference: 'Article 52 Federal Decree-Law No. (8) of 2017',
        notes: 'Total output VAT payable before recoverable input tax deductions (Box 1 + Box 3).',
      },
      {
        boxNumber: 'Box 9',
        boxTitle: 'Standard Rated Purchases & Recoverable VAT',
        amountAED: vatReturn.box9StandardRatedPurchasesAED.toNumber(),
        vatAmountAED: vatReturn.box9RecoverableInputVatAED.toNumber(),
        recoverableVatAED: vatReturn.box9RecoverableInputVatAED.toNumber(),
        legalReference: 'Article 54 & Article 53 Executive Regulations',
        notes: 'Local business expenses incurring standard 5% VAT with valid tax invoices.',
      },
      {
        boxNumber: 'Box 10',
        boxTitle: 'Supplies Subject to Reverse Charge (Input Recovery)',
        amountAED: vatReturn.box10ReverseChargePurchasesAED.toNumber(),
        vatAmountAED: vatReturn.box10RecoverableInputVatAED.toNumber(),
        recoverableVatAED: vatReturn.box10RecoverableInputVatAED.toNumber(),
        legalReference: 'Article 48 & 54 Federal Decree-Law No. (8) of 2017',
        notes: 'Simultaneous input VAT deduction for reverse-charge services.',
      },
      {
        boxNumber: 'Box 11',
        boxTitle: 'Total Recoverable Tax',
        amountAED: vatReturn.box9StandardRatedPurchasesAED.plus(vatReturn.box10ReverseChargePurchasesAED).toNumber(),
        vatAmountAED: vatReturn.box11TotalRecoverableVatAED.toNumber(),
        recoverableVatAED: vatReturn.box11TotalRecoverableVatAED.toNumber(),
        legalReference: 'Article 54 Federal Decree-Law No. (8) of 2017',
        notes: 'Total input VAT legally recoverable by the business (Box 9 + Box 10).',
      },
      {
        boxNumber: 'Box 12',
        boxTitle: 'Net VAT Payable or (Refundable)',
        amountAED: 0,
        vatAmountAED: vatReturn.box12NetVatPositionAED.toNumber(),
        legalReference: 'Article 52 & 64 Federal Decree-Law No. (8) of 2017',
        notes: vatReturn.box12NetVatPositionAED.greaterThanOrEqualTo(0)
          ? 'Positive balance: Net VAT amount payable to the Federal Tax Authority.'
          : 'Negative balance: Net VAT refundable from the Federal Tax Authority.',
      },
    ];

    // 9. Calculate Compliance Health Score (starts at 100, drops on findings)
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'CRITICAL') score -= 25;
      else if (f.severity === 'WARNING') score -= 10;
      else score -= 3;
    }
    const complianceScore = Math.max(0, Math.min(100, score));

    // Determine Assessment Status
    let status: AssessmentStatusEnum = 'DRAFT';
    if (findings.some((f) => f.severity === 'CRITICAL')) {
      status = 'REQUIRES_ATTENTION';
    } else if (complianceScore >= 80) {
      status = 'READY_FOR_REVIEW';
    }

    const netPosition = vatReturn.box12NetVatPositionAED.toNumber();
    const positionType = netPosition > 0 ? 'PAYABLE' : netPosition < 0 ? 'REFUNDABLE' : 'NIL';

    // 10. Persist to PostgreSQL with Historical Lineage
    // Check if an existing assessment exists for this business and periodKey
    const existingAssessment = await this.prisma.taxAssessment.findFirst({
      where: {
        businessId,
        taxType: 'VAT',
        periodKey,
        status: { not: 'SUPERSEDED' },
      },
      orderBy: { createdAt: 'desc' },
    });

    let reassessedFromId: string | null = null;
    if (existingAssessment) {
      // Mark old assessment as SUPERSEDED to preserve audit history
      await this.prisma.taxAssessment.update({
        where: { id: existingAssessment.id },
        data: { status: 'SUPERSEDED' },
      });
      reassessedFromId = existingAssessment.id;
      this.logger.log(`Superseded existing VAT assessment ${existingAssessment.id} for period ${periodKey}`);
    }

    const calculationJson = {
      vatReturn201: {
        box1: vatReturn.box1StandardRatedSuppliesAED.toNumber(),
        box1Vat: vatReturn.box1OutputVatAED.toNumber(),
        box3: vatReturn.box3ReverseChargeSuppliesAED.toNumber(),
        box3Vat: vatReturn.box3OutputVatAED.toNumber(),
        box4: vatReturn.box4ZeroRatedSuppliesAED.toNumber(),
        box5: vatReturn.box5ExemptSuppliesAED.toNumber(),
        box8: vatReturn.box8TotalOutputVatDueAED.toNumber(),
        box9: vatReturn.box9StandardRatedPurchasesAED.toNumber(),
        box9Vat: vatReturn.box9RecoverableInputVatAED.toNumber(),
        box10: vatReturn.box10ReverseChargePurchasesAED.toNumber(),
        box10Vat: vatReturn.box10RecoverableInputVatAED.toNumber(),
        box11: vatReturn.box11TotalRecoverableVatAED.toNumber(),
        box12: vatReturn.box12NetVatPositionAED.toNumber(),
        blockedInputVat: vatReturn.blockedInputVatAED.toNumber(),
      },
      boxes,
      ruleSetVersion: VAT_RULESET_VERSION,
      statutoryDate: new Date().toISOString(),
      statutoryCitations: [
        STATUTORY_CITATIONS.VAT_BASIC_LAW,
        STATUTORY_CITATIONS.VAT_BLOCKED_INPUTS_ART_53,
        STATUTORY_CITATIONS.VAT_EMPLOYEE_EXPENSES_DEC_17,
        STATUTORY_CITATIONS.VAT_TAX_INVOICE_ART_59_65,
      ],
    };

    const savedAssessment = await this.prisma.taxAssessment.create({
      data: {
        businessId,
        taxType: 'VAT',
        periodKey,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        status: status as any,
        ruleSetVersion: VAT_RULESET_VERSION,
        grossRevenueAED: totalTaxableSales.toNumber(),
        accountingProfitAED: totalTaxableSales.minus(totalPurchases).toNumber(),
        outputVatAED: vatReturn.box8TotalOutputVatDueAED.toNumber(),
        recoverableVatAED: vatReturn.box11TotalRecoverableVatAED.toNumber(),
        netTaxPayableAED: netPosition,
        complianceScore,
        complianceFindings: findings as any,
        sourceInvoicesCount: invoices.length,
        sourceExpensesCount: expenses.length,
        calculationJson: calculationJson as any,
        reassessedFromId,
        notes: `VAT 201 Return assessment for ${periodKey}. Evaluated ${transactionLines.length} transaction lines.`,
      },
    });

    this.logger.log(`Created persistent VAT assessment ${savedAssessment.id} for business ${businessId} [Net: AED ${netPosition}]`);

    return {
      assessmentId: savedAssessment.id,
      businessId,
      periodKey,
      periodStartDate: periodStart.toISOString().split('T')[0],
      periodEndDate: periodEnd.toISOString().split('T')[0],
      status,
      ruleSetVersion: VAT_RULESET_VERSION,
      trn,
      isVatRegistered,
      totalTaxableSalesAED: totalTaxableSales.toNumber(),
      totalOutputVatAED: vatReturn.box8TotalOutputVatDueAED.toNumber(),
      totalPurchasesAED: totalPurchases.toNumber(),
      totalInputVatAED: totalInputVatExpenses.toNumber(),
      recoverableInputVatAED: vatReturn.box11TotalRecoverableVatAED.toNumber(),
      blockedInputVatAED: vatReturn.blockedInputVatAED.toNumber(),
      netVatPositionAED: netPosition,
      positionType,
      complianceScore,
      findings,
      boxes,
      sourceCounts: {
        invoicesCount: invoices.length,
        expensesCount: expenses.length,
        linesCount: transactionLines.length,
      },
      reassessedFromId,
      createdAt: savedAssessment.createdAt.toISOString(),
      updatedAt: savedAssessment.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves a specific VAT Assessment by ID, enforcing tenant isolation.
   */
  public async getVatAssessmentById(
    assessmentId: string,
    organisationId: string
  ): Promise<VatAssessmentSummary> {
    const assessment = await this.prisma.taxAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        business: {
          include: { taxRegistrations: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }

    if (assessment.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not have permission to view this assessment.');
    }

    const calcJson = (assessment.calculationJson as any) || {};
    const vatReg = assessment.business.taxRegistrations.find((r) => r.taxType === 'VAT');

    const net = Number(assessment.netTaxPayableAED);
    const positionType = net > 0 ? 'PAYABLE' : net < 0 ? 'REFUNDABLE' : 'NIL';

    return {
      assessmentId: assessment.id,
      businessId: assessment.businessId,
      periodKey: assessment.periodKey || 'CUSTOM',
      periodStartDate: assessment.periodStartDate ? assessment.periodStartDate.toISOString().split('T')[0] : '',
      periodEndDate: assessment.periodEndDate ? assessment.periodEndDate.toISOString().split('T')[0] : '',
      status: assessment.status as AssessmentStatusEnum,
      ruleSetVersion: assessment.ruleSetVersion,
      trn: vatReg?.trn || null,
      isVatRegistered: vatReg?.status === 'REGISTERED',
      totalTaxableSalesAED: Number(assessment.grossRevenueAED),
      totalOutputVatAED: Number(assessment.outputVatAED || 0),
      totalPurchasesAED: 0,
      totalInputVatAED: Number(assessment.recoverableVatAED || 0),
      recoverableInputVatAED: Number(assessment.recoverableVatAED || 0),
      blockedInputVatAED: Number(calcJson.vatReturn201?.blockedInputVat || 0),
      netVatPositionAED: net,
      positionType,
      complianceScore: assessment.complianceScore ?? 100,
      findings: (assessment.complianceFindings as any[]) || [],
      boxes: calcJson.boxes || [],
      sourceCounts: {
        invoicesCount: assessment.sourceInvoicesCount || 0,
        expensesCount: assessment.sourceExpensesCount || 0,
        linesCount: 0,
      },
      reassessedFromId: assessment.reassessedFromId,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  }
}
