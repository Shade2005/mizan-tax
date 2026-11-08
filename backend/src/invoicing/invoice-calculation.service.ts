// ============================================================================
// Mizan (ميزان) - Deterministic Invoice Calculation Service
// High-precision arithmetic via Decimal.js, CBUAE FX conversion & VAT breakdown
// Enforcing Article 69 of Executive Regulations (Currency conversion)
// ============================================================================

import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  CalculatedInvoiceLine,
  InvoiceCalculationSummary,
  InvoiceLineItemInput,
  VatTreatment,
} from './invoice.types';
import { CBUAE_FIXED_RATES } from './invoicing.service';

export interface CalculationOptions {
  currency?: string;
  customExchangeRate?: number;
  invoiceDiscountAmount?: number;
  amountPaid?: number;
  isSupplierVatRegistered?: boolean;
}

@Injectable()
export class InvoiceCalculationService {
  /**
   * Deterministically calculates all invoice line items, subtotals, VAT amounts,
   * currency conversions, and outstanding balances.
   */
  public calculateInvoice(
    lineInputs: InvoiceLineItemInput[],
    options: CalculationOptions = {},
  ): {
    lines: CalculatedInvoiceLine[];
    summary: InvoiceCalculationSummary;
  } {
    const currency = (options.currency || 'AED').toUpperCase();
    const exchangeRate =
      options.customExchangeRate !== undefined && options.customExchangeRate > 0
        ? options.customExchangeRate
        : CBUAE_FIXED_RATES[currency] || 1.0;

    const rateDec = new Decimal(exchangeRate);
    const isSupplierRegistered = options.isSupplierVatRegistered ?? true;

    let subtotalGross = new Decimal(0);
    let totalLineDiscount = new Decimal(0);
    let subtotalNetTaxable = new Decimal(0);
    let totalVat = new Decimal(0);

    const calculatedLines: CalculatedInvoiceLine[] = [];

    // Map of VAT treatments to accumulators
    const vatMap: Record<
      VatTreatment,
      {
        taxable: Decimal;
        vat: Decimal;
        taxableAED: Decimal;
        vatAED: Decimal;
        ratePct: number;
        legalBasis: string;
      }
    > = {
      STANDARD_5: {
        taxable: new Decimal(0),
        vat: new Decimal(0),
        taxableAED: new Decimal(0),
        vatAED: new Decimal(0),
        ratePct: 5.0,
        legalBasis: 'Article 3 Federal Decree-Law No. 8 of 2017 (Standard Rate 5%)',
      },
      ZERO_RATED_0: {
        taxable: new Decimal(0),
        vat: new Decimal(0),
        taxableAED: new Decimal(0),
        vatAED: new Decimal(0),
        ratePct: 0.0,
        legalBasis: 'Article 45 Federal Decree-Law No. 8 of 2017 (Zero-Rated Supply)',
      },
      EXEMPT: {
        taxable: new Decimal(0),
        vat: new Decimal(0),
        taxableAED: new Decimal(0),
        vatAED: new Decimal(0),
        ratePct: 0.0,
        legalBasis: 'Article 46 Federal Decree-Law No. 8 of 2017 (Exempt Supply)',
      },
      OUT_OF_SCOPE: {
        taxable: new Decimal(0),
        vat: new Decimal(0),
        taxableAED: new Decimal(0),
        vatAED: new Decimal(0),
        ratePct: 0.0,
        legalBasis: 'Outside Scope of UAE VAT Legislation',
      },
      REVERSE_CHARGE: {
        taxable: new Decimal(0),
        vat: new Decimal(0),
        taxableAED: new Decimal(0),
        vatAED: new Decimal(0),
        ratePct: 0.0,
        legalBasis: 'Article 48 Federal Decree-Law No. 8 of 2017 (Reverse Charge Mechanism)',
      },
    };

    for (let i = 0; i < lineInputs.length; i++) {
      const input = lineInputs[i];
      const qty = new Decimal(input.quantity || 1);
      const unitPrice = new Decimal(input.unitPrice || 0);
      const discount = new Decimal(input.discount || 0);

      // Line gross = qty * unitPrice
      const lineGross = qty.times(unitPrice);
      // Line taxable = lineGross - discount (clamped to min 0)
      const lineTaxable = Decimal.max(0, lineGross.minus(discount));

      // Underlying VAT treatment of the supply (e.g. STANDARD_5, ZERO_RATED_0, EXEMPT)
      // Under Article 65(1) of Federal Decree-Law No. 8 of 2017, an unregistered supplier
      // is strictly prohibited from charging or representing VAT, but the underlying
      // nature of the supply is NOT corrupted or forced to OUT_OF_SCOPE.
      const treatment = input.vatTreatment || 'STANDARD_5';
      let vatPct = 0;
      let isVatCharged = false;
      let legalBasis = vatMap[treatment]?.legalBasis || 'Statutory UAE VAT Regulation';

      if (isSupplierRegistered) {
        if (treatment === 'STANDARD_5') {
          vatPct = 5.0;
          isVatCharged = true;
        } else {
          vatPct = 0.0;
          isVatCharged = false;
        }
      } else {
        vatPct = 0.0;
        isVatCharged = false;
        legalBasis = 'Article 65(1) Federal Decree-Law No. 8 of 2017: Supplier is not registered for Tax; prohibited from charging or representing VAT';
      }

      // VAT amount = taxable * (vatPct / 100)
      const lineVatRaw = lineTaxable.times(vatPct).dividedBy(100);
      const lineVat = new Decimal(this.roundCurrency(lineVatRaw.toNumber(), 2));
      const lineTaxableRounded = new Decimal(this.roundCurrency(lineTaxable.toNumber(), 2));
      const lineTotal = lineTaxableRounded.plus(lineVat);

      // Convert to AED (Art. 69 CBUAE conversion)
      const taxableAED = new Decimal(this.roundCurrency(lineTaxableRounded.times(rateDec).toNumber(), 2));
      const vatAED = new Decimal(this.roundCurrency(lineVat.times(rateDec).toNumber(), 2));
      const lineTotalAED = taxableAED.plus(vatAED);

      // Accumulate totals
      subtotalGross = subtotalGross.plus(lineGross);
      totalLineDiscount = totalLineDiscount.plus(discount);
      subtotalNetTaxable = subtotalNetTaxable.plus(lineTaxableRounded);
      totalVat = totalVat.plus(lineVat);

      // Accumulate VAT breakdown
      vatMap[treatment].taxable = vatMap[treatment].taxable.plus(lineTaxableRounded);
      vatMap[treatment].vat = vatMap[treatment].vat.plus(lineVat);
      vatMap[treatment].taxableAED = vatMap[treatment].taxableAED.plus(taxableAED);
      vatMap[treatment].vatAED = vatMap[treatment].vatAED.plus(vatAED);

      calculatedLines.push({
        id: input.id || `line-${i + 1}`,
        description: input.description,
        itemName: input.itemName,
        quantity: this.roundCurrency(qty.toNumber(), 4),
        unit: input.unit || 'unit',
        unitPrice: this.roundCurrency(unitPrice.toNumber(), 2),
        discount: this.roundCurrency(discount.toNumber(), 2),
        taxableAmount: lineTaxableRounded.toNumber(),
        vatRatePercentage: vatPct,
        vatTreatment: treatment,
        vatAmount: lineVat.toNumber(),
        lineTotal: lineTotal.toNumber(),
        taxableAmountAED: taxableAED.toNumber(),
        vatAmountAED: vatAED.toNumber(),
        lineTotalAED: lineTotalAED.toNumber(),
        statutoryLegalBasis: legalBasis,
        isVatCharged,
      });
    }

    // Invoice-level discount (if any)
    const invoiceDiscount = new Decimal(options.invoiceDiscountAmount || 0);
    const finalDiscount = totalLineDiscount.plus(invoiceDiscount);
    const grandTotal = subtotalNetTaxable.minus(invoiceDiscount).plus(totalVat);

    // Paid & outstanding balance
    const amountPaidDec = new Decimal(options.amountPaid || 0);
    const outstandingDec = Decimal.max(0, grandTotal.minus(amountPaidDec));

    // Convert statutory summary to AED (rounded to nearest fils via ROUND_HALF_EVEN)
    const subtotalNetTaxableAED = new Decimal(this.roundCurrency(subtotalNetTaxable.times(rateDec).toNumber(), 2));
    const totalVatAED = new Decimal(this.roundCurrency(totalVat.times(rateDec).toNumber(), 2));
    const grandTotalAED = subtotalNetTaxableAED.plus(totalVatAED);
    const amountPaidAED = new Decimal(this.roundCurrency(amountPaidDec.times(rateDec).toNumber(), 2));
    const outstandingAED = Decimal.max(0, grandTotalAED.minus(amountPaidAED));

    // Assemble VAT breakdown items that have non-zero taxable amounts
    const vatBreakdown = Object.entries(vatMap)
      .filter(([_, data]) => data.taxable.greaterThan(0))
      .map(([treatment, data]) => ({
        treatment: treatment as VatTreatment,
        ratePct: data.ratePct,
        taxableAmount: this.roundCurrency(data.taxable.toNumber(), 2),
        vatAmount: this.roundCurrency(data.vat.toNumber(), 2),
        taxableAmountAED: this.roundCurrency(data.taxableAED.toNumber(), 2),
        vatAmountAED: this.roundCurrency(data.vatAED.toNumber(), 2),
        legalBasis: data.legalBasis,
      }));

    const summary: InvoiceCalculationSummary = {
      currency,
      exchangeRate: this.roundCurrency(rateDec.toNumber(), 6),
      subtotalGross: this.roundCurrency(subtotalGross.toNumber(), 2),
      totalDiscount: this.roundCurrency(finalDiscount.toNumber(), 2),
      subtotalNetTaxable: this.roundCurrency(subtotalNetTaxable.toNumber(), 2),
      totalVat: this.roundCurrency(totalVat.toNumber(), 2),
      grandTotal: this.roundCurrency(grandTotal.toNumber(), 2),
      amountPaid: this.roundCurrency(amountPaidDec.toNumber(), 2),
      outstandingBalance: this.roundCurrency(outstandingDec.toNumber(), 2),
      statutoryAED: {
        subtotalNetTaxableAED: this.roundCurrency(subtotalNetTaxableAED.toNumber(), 2),
        totalVatAED: this.roundCurrency(totalVatAED.toNumber(), 2),
        grandTotalAED: this.roundCurrency(grandTotalAED.toNumber(), 2),
        amountPaidAED: this.roundCurrency(amountPaidAED.toNumber(), 2),
        outstandingBalanceAED: this.roundCurrency(outstandingAED.toNumber(), 2),
        legalReference: 'Article 69 UAE VAT Executive Regulations (CBUAE Exchange Rates)',
      },
      vatBreakdown,
    };

    return {
      lines: calculatedLines,
      summary,
    };
  }

  /**
   * Rounds a number to specified decimal places using half-even standard financial rounding.
   */
  public roundCurrency(value: number, decimals = 2): number {
    return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_EVEN).toNumber();
  }
}
