// ============================================================================
// Mizan (ميزان) - Tax Intelligence Service
// Bridges REST endpoints to the deterministic Corporate Tax & VAT engines
// ============================================================================

import { Injectable } from '@nestjs/common';
import {
  CorporateTaxEngine,
  CorporateTaxEngineInput,
  CorporateTaxEngineResult,
} from '../tax-engine/corporate-tax.engine';
import {
  VatEngine,
  VatTransactionLine,
  VatReturn201Result,
} from '../tax-engine/vat.engine';
import { Decimal } from 'decimal.js';

@Injectable()
export class TaxService {
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
