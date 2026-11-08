// ============================================================================
// Mizan (ميزان) - UAE Tax & Financial Reporting System Service
// Generates official reports (P&L, VAT 201, Corporate Tax Reconciliation,
// Tax Readiness Audit, Expense Breakdown, Transaction Ledger) with CSV/PDF support.
// ============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import {
  ReportType,
  ReportFormat,
  GenerateReportRequestDto,
  GeneratedReportSummaryDto,
} from './dashboard.types';
import { ReadinessService } from './readiness.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReadinessService) private readonly readinessService: ReadinessService
  ) {}

  /**
   * Generates a formal financial or tax report, calculates summaries, and persists record.
   */
  public async generateReport(
    dto: GenerateReportRequestDto,
    organisationId: string,
    userId?: string
  ): Promise<{ report: GeneratedReportSummaryDto; content: string; contentType: string }> {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: {
        taxRegistrations: true,
        invoices: {
          include: { lines: true, customer: true },
          orderBy: { issueDate: 'asc' },
        },
        expenseBills: {
          orderBy: { billDate: 'asc' },
        },
        taxAssessments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!business) {
      throw new NotFoundException(`Business ${dto.businessId} not found.`);
    }

    if (business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not own this business.');
    }

    const format = dto.format || ReportFormat.PDF;
    let title = dto.title;
    let summaryMetrics: any = {};
    let content = '';
    let contentType = format === ReportFormat.CSV ? 'text/csv' : 'text/html';

    const periodStart = dto.periodStart ? new Date(dto.periodStart) : undefined;
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : undefined;

    const filteredInvoices = business.invoices.filter((inv) => {
      if (inv.status === 'VOID') return false;
      const invDate = new Date(inv.issueDate);
      if (periodStart && invDate < periodStart) return false;
      if (periodEnd && invDate > periodEnd) return false;
      return true;
    });

    const filteredExpenses = business.expenseBills.filter((exp) => {
      if (exp.status === 'REJECTED') return false;
      const expDate = new Date(exp.billDate);
      if (periodStart && expDate < periodStart) return false;
      if (periodEnd && expDate > periodEnd) return false;
      return true;
    });

    switch (dto.reportType) {
      case ReportType.PROFIT_AND_LOSS: {
        title = title || `Profit & Loss Statement - ${business.legalName}`;
        const pnl = this.calculateProfitAndLoss(business, filteredInvoices, filteredExpenses);
        summaryMetrics = pnl.metrics;
        content = format === ReportFormat.CSV ? pnl.toCsv() : pnl.toHtml(business);
        break;
      }

      case ReportType.VAT_RETURN_201_REPORT: {
        title = title || `VAT Return 201 Report - ${business.legalName}`;
        const vat = this.calculateVat201Report(business, filteredInvoices, filteredExpenses);
        summaryMetrics = vat.metrics;
        content = format === ReportFormat.CSV ? vat.toCsv() : vat.toHtml(business);
        break;
      }

      case ReportType.CORPORATE_TAX_REPORT: {
        title = title || `Corporate Tax Computation Schedule - ${business.legalName}`;
        const ct = this.calculateCorporateTaxReport(business, filteredInvoices, filteredExpenses);
        summaryMetrics = ct.metrics;
        content = format === ReportFormat.CSV ? ct.toCsv() : ct.toHtml(business);
        break;
      }

      case ReportType.TAX_READINESS_AUDIT: {
        title = title || `Tax Readiness & Compliance Audit - ${business.legalName}`;
        const readiness = await this.readinessService.evaluateReadiness(business.id, false);
        summaryMetrics = {
          overallScore: readiness.overallScore,
          healthGrade: readiness.healthGrade,
          isAuditReady: readiness.isAuditReady,
          blockerCount: readiness.criticalBlockers.length,
        };
        content = format === ReportFormat.CSV ? this.readinessToCsv(readiness) : this.readinessToHtml(business, readiness);
        break;
      }

      case ReportType.EXPENSE_BREAKDOWN: {
        title = title || `Expense Classification Breakdown - ${business.legalName}`;
        const expenses = this.buildExpenseBreakdown(business, filteredExpenses);
        summaryMetrics = expenses.metrics;
        content = format === ReportFormat.CSV ? expenses.toCsv() : expenses.toHtml(business);
        break;
      }

      case ReportType.TRANSACTION_LEDGER: {
        title = title || `Unified Financial Transaction Ledger - ${business.legalName}`;
        const ledger = this.buildTransactionLedger(business, filteredInvoices, filteredExpenses);
        summaryMetrics = ledger.metrics;
        content = format === ReportFormat.CSV ? ledger.toCsv() : ledger.toHtml(business);
        break;
      }

      default:
        throw new BadRequestException(`Unsupported report type: ${dto.reportType}`);
    }

    const created = await this.prisma.generatedReport.create({
      data: {
        organisationId,
        businessId: business.id,
        reportType: dto.reportType,
        format,
        title,
        periodStart,
        periodEnd,
        summaryMetrics,
        fileSizeBytes: Buffer.byteLength(content, 'utf8'),
        generatedById: userId,
      },
    });

    const reportSummary: GeneratedReportSummaryDto = {
      id: created.id,
      businessId: created.businessId,
      reportType: created.reportType,
      format: created.format,
      title: created.title,
      periodStart: created.periodStart?.toISOString(),
      periodEnd: created.periodEnd?.toISOString(),
      status: created.status,
      fileSizeBytes: created.fileSizeBytes || 0,
      summaryMetrics: created.summaryMetrics,
      generatedAt: created.generatedAt.toISOString(),
    };

    return {
      report: reportSummary,
      content,
      contentType,
    };
  }

  public async getReportById(reportId: string, organisationId: string) {
    const report = await this.prisma.generatedReport.findUnique({
      where: { id: reportId },
      include: { business: true },
    });

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found.`);
    }

    if (report.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    return report;
  }

  public async listBusinessReports(businessId: string, organisationId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException(`Business ${businessId} not found.`);
    }

    if (business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied.');
    }

    return this.prisma.generatedReport.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================================================
  // PROFIT & LOSS CALCULATOR
  // ==========================================================================
  private calculateProfitAndLoss(business: any, invoices: any[], expenses: any[]) {
    let totalRevenue = new Decimal(0);
    for (const inv of invoices) {
      totalRevenue = totalRevenue.plus(new Decimal(inv.totalAmountAED.toString()));
    }

    const categoryTotals: Record<string, Decimal> = {};
    let totalExpenses = new Decimal(0);

    for (const exp of expenses) {
      const cat = exp.category || 'OTHER_BUSINESS_EXPENSES';
      const amt = new Decimal(exp.totalAmountAED.toString());
      categoryTotals[cat] = (categoryTotals[cat] || new Decimal(0)).plus(amt);
      totalExpenses = totalExpenses.plus(amt);
    }

    const netProfit = totalRevenue.minus(totalExpenses);

    const metrics = {
      totalRevenueAED: totalRevenue.toFixed(2),
      totalExpensesAED: totalExpenses.toFixed(2),
      netProfitAED: netProfit.toFixed(2),
      operatingMargin: totalRevenue.gt(0) ? netProfit.dividedBy(totalRevenue).times(100).toFixed(1) + '%' : '0%',
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
    };

    const toCsv = () => {
      const rows = [
        ['Mizan UAE - Profit and Loss Statement'],
        [`Business: ${business.legalName}`, `License: ${business.tradeLicenseNumber}`],
        [`Generated: ${new Date().toISOString()}`],
        [''],
        ['Account Category', 'Amount (AED)'],
        ['REVENUE', totalRevenue.toFixed(2)],
        ...invoices.map((inv) => [`  Invoice ${inv.invoiceNumber} (${inv.customer?.name || 'Customer'})`, new Decimal(inv.totalAmountAED.toString()).toFixed(2)]),
        ['TOTAL REVENUE', totalRevenue.toFixed(2)],
        [''],
        ['OPERATING EXPENSES', ''],
        ...Object.entries(categoryTotals).map(([cat, amt]) => [`  ${cat.replace(/_/g, ' ')}`, amt.toFixed(2)]),
        ['TOTAL EXPENSES', totalExpenses.toFixed(2)],
        [''],
        ['NET ACCOUNTING PROFIT / (LOSS)', netProfit.toFixed(2)],
      ];
      return rows.map((r) => r.join(',')).join('\n');
    };

    const toHtml = (b: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Profit & Loss - ${b.legalName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 700; color: #0f172a; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .table th { background-color: #f8fafc; font-weight: 600; color: #475569; font-size: 13px; text-transform: uppercase; }
          .total-row { font-weight: 700; background-color: #f1f5f9; }
          .net-row { font-weight: 800; font-size: 16px; background-color: #e2e8f0; }
          .text-right { text-align: right !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">PROFIT & LOSS STATEMENT</div>
          <div class="subtitle">${b.legalName} | Trade License: ${b.tradeLicenseNumber}</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-GB')} | Currency: AED</div>
        </div>

        <table class="table">
          <thead>
            <tr><th>Classification</th><th class="text-right">Amount (AED)</th></tr>
          </thead>
          <tbody>
            <tr style="font-weight: 600;"><td>Revenue from Operations</td><td class="text-right">${totalRevenue.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Operating Revenue</td><td class="text-right">${totalRevenue.toFixed(2)}</td></tr>
            <tr><td colspan="2" style="height: 16px; background: transparent; border: none;"></td></tr>
            <tr style="font-weight: 600;"><td colspan="2">Operating Expenses by Classification</td></tr>
            ${Object.entries(categoryTotals).map(([cat, amt]) => `
              <tr><td>&nbsp;&nbsp;&bull;&nbsp;${cat.replace(/_/g, ' ')}</td><td class="text-right">${amt.toFixed(2)}</td></tr>
            `).join('')}
            <tr class="total-row"><td>Total Operating Expenses</td><td class="text-right">${totalExpenses.toFixed(2)}</td></tr>
            <tr><td colspan="2" style="height: 16px; background: transparent; border: none;"></td></tr>
            <tr class="net-row"><td>NET ACCOUNTING PROFIT / (LOSS)</td><td class="text-right">${netProfit.toFixed(2)} AED</td></tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    return { metrics, toCsv, toHtml };
  }

  // ==========================================================================
  // VAT 201 REPORT CALCULATOR
  // ==========================================================================
  private calculateVat201Report(business: any, invoices: any[], expenses: any[]) {
    let standardRatedSalesAED = new Decimal(0);
    let zeroRatedSalesAED = new Decimal(0);
    let outputVatAED = new Decimal(0);

    for (const inv of invoices) {
      const net = new Decimal(inv.subtotal.toString());
      const vat = new Decimal(inv.vatTotal.toString());
      if (vat.gt(0)) {
        standardRatedSalesAED = standardRatedSalesAED.plus(net);
        outputVatAED = outputVatAED.plus(vat);
      } else {
        zeroRatedSalesAED = zeroRatedSalesAED.plus(net);
      }
    }

    let standardRatedExpensesAED = new Decimal(0);
    let inputVatRecoverableAED = new Decimal(0);

    for (const exp of expenses) {
      const net = exp.subtotalAED ? new Decimal(exp.subtotalAED.toString()) : new Decimal(exp.totalAmountAED.toString());
      const vat = exp.vatTotalAED ? new Decimal(exp.vatTotalAED.toString()) : new Decimal(0);
      if (vat.gt(0)) {
        standardRatedExpensesAED = standardRatedExpensesAED.plus(net);
        inputVatRecoverableAED = inputVatRecoverableAED.plus(vat);
      }
    }

    const netVatPayableAED = outputVatAED.minus(inputVatRecoverableAED);

    const metrics = {
      standardRatedSalesAED: standardRatedSalesAED.toFixed(2),
      zeroRatedSalesAED: zeroRatedSalesAED.toFixed(2),
      outputVatAED: outputVatAED.toFixed(2),
      inputVatRecoverableAED: inputVatRecoverableAED.toFixed(2),
      netVatPayableAED: netVatPayableAED.toFixed(2),
      isRefundable: netVatPayableAED.lt(0),
    };

    const toCsv = () => {
      const rows = [
        ['Mizan UAE - VAT Return Form 201 Summary'],
        [`Business: ${business.legalName}`, `License: ${business.tradeLicenseNumber}`],
        [`Statutory Grounding: Federal Decree-Law No. 8 of 2017`],
        [''],
        ['Box #', 'Description', 'Amount (AED)', 'VAT Amount (AED)'],
        ['Box 1', 'Standard Rated Supplies (5%)', standardRatedSalesAED.toFixed(2), outputVatAED.toFixed(2)],
        ['Box 4', 'Zero Rated Supplies (0%)', zeroRatedSalesAED.toFixed(2), '0.00'],
        ['Box 8', 'Total Output Tax Due', '', outputVatAED.toFixed(2)],
        ['Box 9', 'Standard Rated Expenses', standardRatedExpensesAED.toFixed(2), inputVatRecoverableAED.toFixed(2)],
        ['Box 11', 'Total Recoverable Tax', '', inputVatRecoverableAED.toFixed(2)],
        ['Box 12', 'Net VAT Payable / (Refundable)', '', netVatPayableAED.toFixed(2)],
      ];
      return rows.map((r) => r.join(',')).join('\n');
    };

    const toHtml = (b: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>VAT 201 Return - ${b.legalName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table th, .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #cbd5e1; }
          .table th { background: #f8fafc; font-weight: 600; font-size: 13px; }
          .total-row { font-weight: 700; background-color: #f1f5f9; }
          .text-right { text-align: right !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FTA VAT RETURN FORM 201 BREAKDOWN</div>
          <div>${b.legalName} | License: <strong>${b.tradeLicenseNumber}</strong></div>
          <div>Statutory Basis: Federal Decree-Law No. 8 of 2017, Article 71</div>
        </div>

        <table class="table">
          <thead>
            <tr><th>Box #</th><th>Description</th><th class="text-right">Amount (AED)</th><th class="text-right">VAT Amount (AED)</th></tr>
          </thead>
          <tbody>
            <tr><td>Box 1</td><td>Standard rated supplies (5%)</td><td class="text-right">${standardRatedSalesAED.toFixed(2)}</td><td class="text-right">${outputVatAED.toFixed(2)}</td></tr>
            <tr><td>Box 4</td><td>Zero-rated supplies (0%)</td><td class="text-right">${zeroRatedSalesAED.toFixed(2)}</td><td class="text-right">0.00</td></tr>
            <tr class="total-row"><td>Box 8</td><td>Total Output Tax Due</td><td></td><td class="text-right">${outputVatAED.toFixed(2)}</td></tr>
            <tr><td>Box 9</td><td>Standard rated expenses</td><td class="text-right">${standardRatedExpensesAED.toFixed(2)}</td><td class="text-right">${inputVatRecoverableAED.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Box 11</td><td>Total Recoverable Tax</td><td></td><td class="text-right">${inputVatRecoverableAED.toFixed(2)}</td></tr>
            <tr style="font-weight: 800; background: #e2e8f0;"><td>Box 12</td><td>Net VAT Payable / (Refundable)</td><td></td><td class="text-right">${netVatPayableAED.toFixed(2)} AED</td></tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    return { metrics, toCsv, toHtml };
  }

  // ==========================================================================
  // CORPORATE TAX REPORT CALCULATOR
  // ==========================================================================
  private calculateCorporateTaxReport(business: any, invoices: any[], expenses: any[]) {
    let totalRevenue = new Decimal(0);
    for (const inv of invoices) {
      totalRevenue = totalRevenue.plus(new Decimal(inv.totalAmountAED.toString()));
    }

    let totalExpenses = new Decimal(0);
    let entertainmentDisallowed = new Decimal(0);

    for (const exp of expenses) {
      const amt = new Decimal(exp.totalAmountAED.toString());
      totalExpenses = totalExpenses.plus(amt);
      if (exp.category === 'ENTERTAINMENT') {
        entertainmentDisallowed = entertainmentDisallowed.plus(amt.times(0.50));
      }
    }

    const accountingProfit = totalRevenue.minus(totalExpenses);
    const taxableIncome = Decimal.max(new Decimal(0), accountingProfit.plus(entertainmentDisallowed));

    const SBR_THRESHOLD = new Decimal(3000000);
    const qualifiesSbr = totalRevenue.lte(SBR_THRESHOLD);

    const CT_THRESHOLD = new Decimal(375000);
    let ctDue = new Decimal(0);

    if (!qualifiesSbr) {
      if (taxableIncome.gt(CT_THRESHOLD)) {
        ctDue = taxableIncome.minus(CT_THRESHOLD).times(0.09);
      }
    }

    const metrics = {
      accountingProfitAED: accountingProfit.toFixed(2),
      entertainmentDisallowedAED: entertainmentDisallowed.toFixed(2),
      taxableIncomeAED: taxableIncome.toFixed(2),
      qualifiesForSbr: qualifiesSbr,
      corporateTaxDueAED: ctDue.toFixed(2),
    };

    const toCsv = () => {
      const rows = [
        ['Mizan UAE - Corporate Tax Computation Schedule'],
        [`Business: ${business.legalName}`, `License: ${business.tradeLicenseNumber}`],
        [`Statutory Grounding: Federal Decree-Law No. 47 of 2022`],
        [''],
        ['Line Item', 'Amount (AED)', 'Statutory Reference'],
        ['Accounting Net Profit / (Loss)', accountingProfit.toFixed(2), 'Financial Statements'],
        ['(+) Disallowed 50% Entertainment', entertainmentDisallowed.toFixed(2), 'FDL 47/2022, Article 32'],
        ['Taxable Income', taxableIncome.toFixed(2), 'FDL 47/2022, Article 20'],
        ['Small Business Relief Status', qualifiesSbr ? 'QUALIFIED (0% Rate)' : 'STANDARD APPLICABLE', 'MD 73/2023'],
        ['Statutory 0% Threshold', '375,000.00', 'Cabinet Decision No. 116 of 2022'],
        ['Corporate Tax Liability (9%)', ctDue.toFixed(2), 'FDL 47/2022, Article 3'],
      ];
      return rows.map((r) => r.join(',')).join('\n');
    };

    const toHtml = (b: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Corporate Tax Schedule - ${b.legalName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 22px; font-weight: 700; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table th, .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #cbd5e1; }
          .table th { background: #f8fafc; font-weight: 600; font-size: 13px; }
          .total-row { font-weight: 700; background-color: #f1f5f9; }
          .text-right { text-align: right !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CORPORATE TAX COMPUTATION SCHEDULE</div>
          <div>${b.legalName} | License: <strong>${b.tradeLicenseNumber}</strong></div>
          <div>Statutory Basis: Federal Decree-Law No. 47 of 2022, Article 48</div>
        </div>

        <table class="table">
          <thead>
            <tr><th>Schedule Item</th><th>Statutory Reference</th><th class="text-right">Amount (AED)</th></tr>
          </thead>
          <tbody>
            <tr><td>Accounting Net Profit / (Loss)</td><td>Audited Ledger</td><td class="text-right">${accountingProfit.toFixed(2)}</td></tr>
            <tr><td>(+) Disallowed 50% Entertainment</td><td>Article 32</td><td class="text-right">${entertainmentDisallowed.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Taxable Income (Article 20)</td><td>FDL 47/2022</td><td class="text-right">${taxableIncome.toFixed(2)}</td></tr>
            <tr><td>Small Business Relief (Revenue &le; AED 3M)</td><td>MD 73/2023</td><td class="text-right">${qualifiesSbr ? 'ELECTED (0% Rate)' : 'Not Elected'}</td></tr>
            <tr><td>Statutory 0% Threshold (Article 3)</td><td>Cabinet Dec 116/2022</td><td class="text-right">375,000.00</td></tr>
            <tr style="font-weight: 800; background: #e2e8f0;"><td>NET CORPORATE TAX DUE (9%)</td><td>Article 3</td><td class="text-right">${ctDue.toFixed(2)} AED</td></tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    return { metrics, toCsv, toHtml };
  }

  // ==========================================================================
  // EXPENSE BREAKDOWN & TRANSACTION LEDGER BUILDERS
  // ==========================================================================
  private buildExpenseBreakdown(business: any, expenses: any[]) {
    const totalExpenses = expenses.reduce((acc, e) => acc.plus(new Decimal(e.totalAmountAED.toString())), new Decimal(0));
    const metrics = {
      count: expenses.length,
      totalExpensesAED: totalExpenses.toFixed(2),
    };

    const toCsv = () => {
      const rows = [
        ['Mizan UAE - Detailed Expense Breakdown'],
        [`Business: ${business.legalName}`],
        [''],
        ['Expense Date', 'Supplier', 'Supplier TRN', 'Category', 'Payment Method', 'VAT (AED)', 'Total (AED)'],
        ...expenses.map((e) => [
          e.billDate.toISOString().slice(0, 10),
          `"${(e.supplierName || 'General Supplier').replace(/"/g, '""')}"`,
          e.supplierTrn || '',
          e.category || '',
          e.paymentMethod || '',
          e.vatTotalAED ? new Decimal(e.vatTotalAED.toString()).toFixed(2) : '0.00',
          new Decimal(e.totalAmountAED.toString()).toFixed(2),
        ]),
      ];
      return rows.map((r) => r.join(',')).join('\n');
    };

    const toHtml = (b: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Expense Breakdown - ${b.legalName}</title>
        <style>
          body { font-family: sans-serif; margin: 30px; font-size: 13px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          th { background: #f1f5f9; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Expense Breakdown - ${b.legalName}</h2>
        <p>Total Expenses: <strong>AED ${totalExpenses.toFixed(2)}</strong> (${expenses.length} records)</p>
        <table>
          <thead>
            <tr><th>Date</th><th>Supplier</th><th>Supplier TRN</th><th>Category</th><th>Payment</th><th class="text-right">VAT (AED)</th><th class="text-right">Total (AED)</th></tr>
          </thead>
          <tbody>
            ${expenses.map((e) => `
              <tr>
                <td>${e.billDate.toISOString().slice(0, 10)}</td>
                <td>${e.supplierName || 'General Supplier'}</td>
                <td>${e.supplierTrn || '-'}</td>
                <td>${e.category || '-'}</td>
                <td>${e.paymentMethod || '-'}</td>
                <td class="text-right">${e.vatTotalAED ? new Decimal(e.vatTotalAED.toString()).toFixed(2) : '0.00'}</td>
                <td class="text-right">${new Decimal(e.totalAmountAED.toString()).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return { metrics, toCsv, toHtml };
  }

  private buildTransactionLedger(business: any, invoices: any[], expenses: any[]) {
    const combined: any[] = [
      ...invoices.map((i) => ({
        date: new Date(i.issueDate),
        type: 'INVOICE (CREDIT)',
        ref: i.invoiceNumber,
        party: i.customer?.name || 'Customer',
        amount: new Decimal(i.totalAmountAED.toString()),
        isCredit: true,
      })),
      ...expenses.map((e) => ({
        date: new Date(e.billDate),
        type: 'EXPENSE (DEBIT)',
        ref: e.billNumber || e.id.slice(0, 8),
        party: e.supplierName || 'General Supplier',
        amount: new Decimal(e.totalAmountAED.toString()),
        isCredit: false,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalCredits = combined.filter((c) => c.isCredit).reduce((acc, c) => acc.plus(c.amount), new Decimal(0));
    const totalDebits = combined.filter((c) => !c.isCredit).reduce((acc, c) => acc.plus(c.amount), new Decimal(0));

    const metrics = {
      transactionCount: combined.length,
      totalCreditsAED: totalCredits.toFixed(2),
      totalDebitsAED: totalDebits.toFixed(2),
      netBalanceAED: totalCredits.minus(totalDebits).toFixed(2),
    };

    const toCsv = () => {
      const rows = [
        ['Mizan UAE - Unified Transaction Ledger'],
        [`Business: ${business.legalName}`],
        [''],
        ['Date', 'Type', 'Reference', 'Counterparty', 'Debit (AED)', 'Credit (AED)'],
        ...combined.map((c) => [
          c.date.toISOString().slice(0, 10),
          c.type,
          c.ref,
          `"${c.party.replace(/"/g, '""')}"`,
          !c.isCredit ? c.amount.toFixed(2) : '',
          c.isCredit ? c.amount.toFixed(2) : '',
        ]),
      ];
      return rows.map((r) => r.join(',')).join('\n');
    };

    const toHtml = (b: any) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Transaction Ledger - ${b.legalName}</title>
        <style>
          body { font-family: sans-serif; margin: 30px; font-size: 13px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          th { background: #f1f5f9; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Financial Transaction Ledger - ${b.legalName}</h2>
        <p>Total Credits: <strong>AED ${totalCredits.toFixed(2)}</strong> | Total Debits: <strong>AED ${totalDebits.toFixed(2)}</strong> | Net Balance: <strong>AED ${totalCredits.minus(totalDebits).toFixed(2)}</strong></p>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Reference</th><th>Counterparty</th><th class="text-right">Debit (AED)</th><th class="text-right">Credit (AED)</th></tr>
          </thead>
          <tbody>
            ${combined.map((c) => `
              <tr>
                <td>${c.date.toISOString().slice(0, 10)}</td>
                <td>${c.type}</td>
                <td>${c.ref}</td>
                <td>${c.party}</td>
                <td class="text-right">${!c.isCredit ? c.amount.toFixed(2) : '-'}</td>
                <td class="text-right">${c.isCredit ? c.amount.toFixed(2) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return { metrics, toCsv, toHtml };
  }

  // ==========================================================================
  // READINESS AUDIT FORMATTERS
  // ==========================================================================
  private readinessToCsv(r: any) {
    const rows = [
      ['Mizan UAE - Tax Readiness & Compliance Audit'],
      [`Overall Readiness Score: ${r.overallScore}%`],
      [`Health Grade: ${r.healthGrade}`],
      [`Audit Ready: ${r.isAuditReady ? 'YES' : 'NO'}`],
      [''],
      ['Category', 'Weight', 'Score', 'Status', 'Passed Checks'],
      ...r.categories.map((c: any) => [c.name, `${c.weightPercentage}%`, `${c.score}%`, c.status, `${c.passedChecks}/${c.totalChecks}`]),
      [''],
      ['CRITICAL BLOCKERS', ''],
      ...r.criticalBlockers.map((b: string) => [b]),
      [''],
      ['RECOMMENDED ACTION ROADMAP', ''],
      ...r.actionableSteps.map((s: string, idx: number) => [`${idx + 1}. ${s}`]),
    ];
    return rows.map((r) => r.join(',')).join('\n');
  }

  private readinessToHtml(b: any, r: any) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Tax Readiness Audit - ${b.legalName}</title>
        <style>
          body { font-family: sans-serif; margin: 30px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; }
          .score-card { display: flex; gap: 20px; margin-bottom: 25px; }
          .score-box { background: #f8fafc; padding: 15px 20px; border-radius: 8px; border: 1px solid #cbd5e1; }
          .score-num { font-size: 32px; font-weight: 800; color: #0284c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { padding: 10px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          th { background: #f1f5f9; }
          .blocker { color: #dc2626; font-weight: 600; padding: 4px 0; }
          .action { color: #0f766e; padding: 4px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Tax Readiness & Compliance Audit</h2>
          <div>${b.legalName} | Trade License: ${b.tradeLicenseNumber}</div>
        </div>

        <div class="score-card">
          <div class="score-box">
            <div>Readiness Score</div>
            <div class="score-num">${r.overallScore}%</div>
          </div>
          <div class="score-box">
            <div>Health Grade</div>
            <div class="score-num">${r.healthGrade}</div>
          </div>
          <div class="score-box">
            <div>Audit Status</div>
            <div style="font-size: 20px; font-weight: 700; margin-top: 8px; color: ${r.isAuditReady ? '#16a34a' : '#ea580c'};">
              ${r.isAuditReady ? 'AUDIT READY' : 'ACTION REQUIRED'}
            </div>
          </div>
        </div>

        <h3>Category Performance</h3>
        <table>
          <thead>
            <tr><th>Domain</th><th>Weight</th><th>Score</th><th>Status</th><th>Verification Progress</th></tr>
          </thead>
          <tbody>
            ${r.categories.map((c: any) => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.weightPercentage}%</td>
                <td>${c.score}%</td>
                <td>${c.status}</td>
                <td>${c.passedChecks} / ${c.totalChecks} checks passed</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${r.criticalBlockers.length > 0 ? `
          <h3 style="color: #dc2626; margin-top: 30px;">Critical Blockers</h3>
          <div>
            ${r.criticalBlockers.map((blk: string) => `<div class="blocker">&bull; ${blk}</div>`).join('')}
          </div>
        ` : ''}

        <h3 style="margin-top: 30px;">Prioritized Action Roadmap</h3>
        <div>
          ${r.actionableSteps.map((act: string, idx: number) => `<div class="action">${idx + 1}. ${act}</div>`).join('')}
        </div>
      </body>
      </html>
    `;
  }
}
