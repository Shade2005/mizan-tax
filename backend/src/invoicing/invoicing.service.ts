// ============================================================================
// Mizan (ميزان) - Invoicing & Expense Classification Service
// Enforces CBUAE Exchange Rates (Art. 69) & Decision 17/2026 VAT Recovery
// ============================================================================

import { Injectable } from '@nestjs/common';
import { VatEngine, VatTransactionLine } from '../tax-engine/vat.engine';
import { Decimal } from 'decimal.js';

export const CBUAE_FIXED_RATES: Record<string, number> = {
  AED: 1.0,
  USD: 3.6725,
  EUR: 3.9821,
  GBP: 4.654,
  SAR: 0.979,
};

@Injectable()
export class InvoicingService {
  /**
   * Calculates CBUAE foreign currency conversions and generates a compliant tax invoice summary
   */
  public calculateTaxInvoice(dto: {
    currency: string;
    subtotal: number;
    vatRatePct?: number;
  }) {
    const rate = CBUAE_FIXED_RATES[dto.currency.toUpperCase()] || 1.0;
    const vatRate = (dto.vatRatePct ?? 5) / 100;
    const vatAmount = dto.subtotal * vatRate;
    const totalAmount = dto.subtotal + vatAmount;

    const subtotalAED = Math.round(dto.subtotal * rate * 100) / 100;
    const vatAmountAED = Math.round(vatAmount * rate * 100) / 100;
    const totalAmountAED = Math.round(totalAmount * rate * 100) / 100;

    return {
      currency: dto.currency.toUpperCase(),
      cbUaeExchangeRate: rate,
      subtotal: dto.subtotal,
      vatAmount,
      totalAmount,
      statutoryAED: {
        subtotalAED,
        vatAmountAED,
        totalAmountAED,
        legalReference: 'Article 69 UAE VAT Executive Regulations',
      },
    };
  }

  /**
   * Deterministically classifies an expense receipt under Decision No. 17 of 2026 and Art. 53
   */
  public classifyExpenseReceipt(dto: {
    merchantName: string;
    supplierTrn?: string;
    amountAED: number;
    category: 'DUTY_TRAVEL' | 'CLIENT_ENTERTAINMENT' | 'REVERSE_CHARGE_SAAS';
  }) {
    const isEntertainment = dto.category === 'CLIENT_ENTERTAINMENT';
    const isDutyTravel = dto.category === 'DUTY_TRAVEL';
    const isRcm = dto.category === 'REVERSE_CHARGE_SAAS';

    const line: VatTransactionLine = {
      id: 'exp-eval',
      isSale: false,
      amountAED: new Decimal(dto.amountAED),
      vatRateCategory: isRcm ? 'REVERSE_CHARGE' : 'STANDARD_5',
      isReverseChargeService: isRcm,
      isEntertainmentOrHospitality: isEntertainment,
      isEmployeeExpense: isDutyTravel,
      employeeExpenseCategory: isDutyTravel ? 'BUSINESS_TRAVEL_HOTEL' : undefined,
      hasValidTaxInvoice: isRcm || (!!dto.supplierTrn && dto.supplierTrn.startsWith('100')),
    };

    const vatResult = VatEngine.evaluateInputRecoverability(line);

    return {
      merchantName: dto.merchantName,
      supplierTrn: dto.supplierTrn,
      amountAED: dto.amountAED,
      vatRecoverability: vatResult.recoverability,
      recoverableVatAED: vatResult.recoverableVatAED.toNumber(),
      blockedVatAED: vatResult.blockedVatAED.toNumber(),
      vatLegalReference: vatResult.legalReference,
      vatRationale: vatResult.rationale,
      corporateTaxDeductibilityPct: isEntertainment ? 50 : 100,
      corporateTaxLegalReference: isEntertainment ? 'Article 32 Law No. 47/2022' : 'Article 28 Law No. 47/2022',
    };
  }
}
