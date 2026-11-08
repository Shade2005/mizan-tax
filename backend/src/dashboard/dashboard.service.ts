// ============================================================================
// Mizan (ميزان) - Unified Business Intelligence Dashboard Service
// Aggregates real backend ledger data, tax positions, readiness & deadlines
// ============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import {
  DashboardOverviewDto,
  FinancialMetricSummary,
  TaxOverviewSummary,
} from './dashboard.types';
import { ReadinessService } from './readiness.service';
import { TaxCalendarService } from './tax-calendar.service';
import { ComplianceActionService } from './compliance-action.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReadinessService) private readonly readinessService: ReadinessService,
    @Inject(TaxCalendarService) private readonly taxCalendarService: TaxCalendarService,
    @Inject(ComplianceActionService) private readonly complianceActionService: ComplianceActionService
  ) {}

  /**
   * Retrieves full unified business intelligence dashboard for the active business.
   * Enforces strict organisation isolation.
   */
  public async getDashboardOverview(
    businessId: string,
    organisationId: string
  ): Promise<DashboardOverviewDto> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        taxRegistrations: true,
        invoices: true,
        expenseBills: true,
        taxAssessments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found.`);
    }

    if (business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not have permission to access this business.');
    }

    const vatReg = business.taxRegistrations.find((r) => r.taxType === 'VAT');
    const ctReg = business.taxRegistrations.find((r) => r.taxType === 'CORPORATE_TAX');

    const isVatRegistered = vatReg && (vatReg.status === 'REGISTERED' || !!vatReg.trn);
    const isCtRegistered = ctReg && (ctReg.status === 'REGISTERED' || !!ctReg.trn);

    // ------------------------------------------------------------------------
    // 1. FINANCIAL METRICS COMPUTATION (Decimal-Safe)
    // ------------------------------------------------------------------------
    let totalRevenue = new Decimal(0);
    let totalReceivables = new Decimal(0);

    for (const inv of business.invoices) {
      if (inv.status === 'VOID') continue;
      const amountAED = new Decimal(inv.totalAmountAED.toString());
      totalRevenue = totalRevenue.plus(amountAED);

      if (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') {
        totalReceivables = totalReceivables.plus(amountAED);
      }
    }

    let totalExpenses = new Decimal(0);
    let totalPayables = new Decimal(0);

    for (const exp of business.expenseBills) {
      if (exp.status === 'REJECTED') continue;
      const amountAED = new Decimal(exp.totalAmountAED.toString());
      totalExpenses = totalExpenses.plus(amountAED);

      if (exp.paymentStatus === 'UNPAID') {
        totalPayables = totalPayables.plus(amountAED);
      }
    }

    const netAccountingProfit = totalRevenue.minus(totalExpenses);

    const financials: FinancialMetricSummary = {
      totalRevenueAED: totalRevenue.toFixed(2),
      totalExpensesAED: totalExpenses.toFixed(2),
      netAccountingProfitAED: netAccountingProfit.toFixed(2),
      totalReceivablesAED: totalReceivables.toFixed(2),
      totalPayablesAED: totalPayables.toFixed(2),
      currency: 'AED',
      invoiceCount: business.invoices.length,
      expenseCount: business.expenseBills.length,
    };

    // ------------------------------------------------------------------------
    // 2. LATEST TAX POSITIONS
    // ------------------------------------------------------------------------
    const latestVat = business.taxAssessments.find((a) => a.taxType === 'VAT');
    let vatSummary = null;
    if (latestVat) {
      const calc = (latestVat.calculationJson as any) || {};
      const netPayable = new Decimal(latestVat.netTaxPayableAED.toString());
      vatSummary = {
        id: latestVat.id,
        periodKey: latestVat.periodKey || calc.taxPeriod || 'Q1',
        periodStart: latestVat.periodStartDate ? latestVat.periodStartDate.toISOString() : '',
        periodEnd: latestVat.periodEndDate ? latestVat.periodEndDate.toISOString() : '',
        netVatPayableAED: netPayable.toFixed(2),
        status: latestVat.status,
        dueDate: calc.statutoryDueDate || (latestVat.periodEndDate ? new Date(latestVat.periodEndDate.getTime() + 28 * 24 * 3600 * 1000).toISOString() : ''),
        isRefundable: netPayable.lt(0),
      };
    }

    const latestCt = business.taxAssessments.find((a) => a.taxType === 'CORPORATE_TAX');
    let ctSummary = null;
    if (latestCt) {
      const calc = (latestCt.calculationJson as any) || {};
      const ctDue = new Decimal(latestCt.netTaxPayableAED.toString());
      const accountingProfitAED = latestCt.accountingProfitAED ? new Decimal(latestCt.accountingProfitAED.toString()).toFixed(2) : (calc.accountingProfit ? new Decimal(calc.accountingProfit).toFixed(2) : '0.00');
      const taxableIncomeAED = latestCt.taxableIncomeAED ? new Decimal(latestCt.taxableIncomeAED.toString()).toFixed(2) : (calc.taxableIncome ? new Decimal(calc.taxableIncome).toFixed(2) : '0.00');
      ctSummary = {
        id: latestCt.id,
        taxYear: latestCt.periodStartDate ? latestCt.periodStartDate.getFullYear() : 2026,
        accountingProfitAED,
        taxableIncomeAED,
        corporateTaxDueAED: ctDue.toFixed(2),
        smallBusinessReliefApplied: latestCt.isSmallBizRelief || !!calc.smallBusinessReliefApplied,
        status: latestCt.status,
        dueDate: calc.statutoryDueDate || '',
      };
    }

    const tax: TaxOverviewSummary = {
      latestVatAssessment: vatSummary,
      latestCorporateTaxAssessment: ctSummary,
    };

    // ------------------------------------------------------------------------
    // 3. TAX READINESS SCORE & BLOCKERS
    // ------------------------------------------------------------------------
    const readinessResult = await this.readinessService.evaluateReadiness(business.id, false);
    const readiness = {
      overallScore: readinessResult.overallScore,
      healthGrade: readinessResult.healthGrade,
      status: readinessResult.isAuditReady ? 'AUDIT_READY' : 'ACTION_REQUIRED',
      criticalBlockerCount: readinessResult.criticalBlockers.length,
    };

    // ------------------------------------------------------------------------
    // 4. STATUTORY CALENDAR DEADLINES
    // ------------------------------------------------------------------------
    const allDeadlines = await this.taxCalendarService.getBusinessTaxDeadlines(business.id);
    const upcomingDeadlines = allDeadlines.slice(0, 4);

    // ------------------------------------------------------------------------
    // 5. TOP COMPLIANCE ACTION FINDINGS
    // ------------------------------------------------------------------------
    const allFindings = await this.complianceActionService.getActiveFindings(business.id);
    const topComplianceActions = allFindings.slice(0, 5);

    return {
      business: {
        id: business.id,
        legalName: business.legalName,
        tradeName: business.tradeName || undefined,
        tradeLicenseNumber: business.tradeLicenseNumber,
        entityType: business.legalEntityType,
        isVatRegistered: !!isVatRegistered,
        vatTrn: vatReg?.trn || undefined,
        isCtRegistered: !!isCtRegistered,
        ctTrn: ctReg?.trn || undefined,
        fiscalYearEnd: `${business.financialYearStartMon.toString().padStart(2, '0')}-${business.financialYearStartDay.toString().padStart(2, '0')}`,
      },
      financials,
      tax,
      readiness,
      upcomingDeadlines,
      topComplianceActions,
    };
  }
}
