// ============================================================================
// UAE Tax Intelligence Platform - Deterministic VAT Calculation Engine
// Statutory Framework: Federal Decree-Law No. 8 of 2017 & Executive Regulations
// Decisions: Decision No. 17 of 2026 (Employee Expenses) & Art. 53 Blocked Inputs
// Version: 2026.2-VAT
// ============================================================================

import { Decimal } from 'decimal.js';

Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const VAT_RULESET_VERSION = '2026.2-VAT';
export const VAT_STANDARD_RATE = new Decimal('0.05');
export const VAT_MANDATORY_REGISTRATION_THRESHOLD = new Decimal('375000.0000');
export const VAT_VOLUNTARY_REGISTRATION_THRESHOLD = new Decimal('187500.0000');

export type VatRateCategory =
  | 'STANDARD_5'
  | 'ZERO_RATED_0'
  | 'EXEMPT'
  | 'OUT_OF_SCOPE'
  | 'REVERSE_CHARGE';

export type InputVatRecoverability =
  | 'FULLY_RECOVERABLE'
  | 'PARTIALLY_RECOVERABLE'
  | 'BLOCKED'
  | 'NOT_APPLICABLE';

export interface VatTransactionLine {
  id: string;
  isSale: boolean; // true for sales (output), false for purchases (input)
  amountAED: Decimal;
  vatRateCategory: VatRateCategory;
  emirate?: 'Abu Dhabi' | 'Dubai' | 'Sharjah' | 'Ajman' | 'Umm Al Quwain' | 'Ras Al Khaimah' | 'Fujairah';
  isReverseChargeService?: boolean; // Foreign SaaS, foreign consultancies
  isEmployeeExpense?: boolean; // Decision No. 17 of 2026
  employeeExpenseCategory?:
    | 'MANDATED_BY_LABOUR_LAW'
    | 'CONTRACTUAL_DUTY_PERFORMANCE'
    | 'BUSINESS_TRAVEL_HOTEL'
    | 'PERSONAL_PERK_OR_BENEFIT';
  isEntertainmentOrHospitality?: boolean; // Art. 53(1)(a)
  isPersonalMotorVehicle?: boolean; // Art. 53(1)(b)
  hasValidTaxInvoice: boolean; // Supplier TRN, Tax Invoice title, date, etc.
}

export interface VatReturn201Result {
  ruleSetVersion: string;
  box1StandardRatedSuppliesAED: Decimal;
  box1OutputVatAED: Decimal;
  box3ReverseChargeSuppliesAED: Decimal;
  box3OutputVatAED: Decimal;
  box4ZeroRatedSuppliesAED: Decimal;
  box5ExemptSuppliesAED: Decimal;
  box8TotalOutputVatDueAED: Decimal;
  box9StandardRatedPurchasesAED: Decimal;
  box9RecoverableInputVatAED: Decimal;
  box10ReverseChargePurchasesAED: Decimal;
  box10RecoverableInputVatAED: Decimal;
  box11TotalRecoverableVatAED: Decimal;
  box12NetVatPositionAED: Decimal; // Positive = Payable to FTA, Negative = Refundable
  blockedInputVatAED: Decimal;
  warnings: string[];
}

export class VatEngine {
  /**
   * Evaluates input VAT recoverability for a single purchase/expense line under
   * Art. 53 and Decision No. 17 of 2026.
   */
  public static evaluateInputRecoverability(line: VatTransactionLine): {
    recoverability: InputVatRecoverability;
    recoverableVatAED: Decimal;
    blockedVatAED: Decimal;
    legalReference: string;
    rationale: string;
  } {
    const rawVat = line.vatRateCategory === 'STANDARD_5' || line.vatRateCategory === 'REVERSE_CHARGE'
      ? line.amountAED.times(VAT_STANDARD_RATE)
      : new Decimal(0);

    // Condition 1: Must possess a valid Tax Invoice under Art. 59/65
    if (!line.hasValidTaxInvoice && !line.isReverseChargeService) {
      return {
        recoverability: 'BLOCKED',
        recoverableVatAED: new Decimal(0),
        blockedVatAED: rawVat,
        legalReference: 'Article 59 & 65 Executive Regulations',
        rationale: 'Input VAT cannot be recovered without a valid Tax Invoice bearing the supplier TRN.'
      };
    }

    // Condition 2: Blocked entertainment/hospitality under Art. 53(1)(a)
    if (line.isEntertainmentOrHospitality) {
      return {
        recoverability: 'BLOCKED',
        recoverableVatAED: new Decimal(0),
        blockedVatAED: rawVat,
        legalReference: 'Article 53(1)(a) Executive Regulations',
        rationale: 'Client entertainment, hospitality, and amusement expenses are strictly non-recoverable.'
      };
    }

    // Condition 3: Blocked personal motor vehicle under Art. 53(1)(b)
    if (line.isPersonalMotorVehicle) {
      return {
        recoverability: 'BLOCKED',
        recoverableVatAED: new Decimal(0),
        blockedVatAED: rawVat,
        legalReference: 'Article 53(1)(b) Executive Regulations',
        rationale: 'Motor vehicles purchased, leased, or maintained for personal use are blocked.'
      };
    }

    // Condition 4: Decision No. 17 of 2026 Employee Expenses
    if (line.isEmployeeExpense) {
      if (
        line.employeeExpenseCategory === 'MANDATED_BY_LABOUR_LAW' ||
        line.employeeExpenseCategory === 'CONTRACTUAL_DUTY_PERFORMANCE' ||
        line.employeeExpenseCategory === 'BUSINESS_TRAVEL_HOTEL'
      ) {
        return {
          recoverability: 'FULLY_RECOVERABLE',
          recoverableVatAED: rawVat,
          blockedVatAED: new Decimal(0),
          legalReference: 'FTA Decision No. 17 of 2026',
          rationale: 'Employee expense is mandated by law, contractual employment policy, or strictly required for performance of duties. 100% recoverable.'
        };
      } else {
        return {
          recoverability: 'BLOCKED',
          recoverableVatAED: new Decimal(0),
          blockedVatAED: rawVat,
          legalReference: 'FTA Decision No. 17 of 2026 & Art. 53',
          rationale: 'Employee expense classified as personal perk, discretionary family benefit, or entertainment. Blocked from recovery.'
        };
      }
    }

    // Standard business expense
    if (line.vatRateCategory === 'STANDARD_5' || line.vatRateCategory === 'REVERSE_CHARGE') {
      return {
        recoverability: 'FULLY_RECOVERABLE',
        recoverableVatAED: rawVat,
        blockedVatAED: new Decimal(0),
        legalReference: 'Article 54 Federal Decree-Law No. 8 of 2017',
        rationale: 'Standard business expense incurred for making taxable supplies.'
      };
    }

    return {
      recoverability: 'NOT_APPLICABLE',
      recoverableVatAED: new Decimal(0),
      blockedVatAED: new Decimal(0),
      legalReference: 'Article 45 / 46',
      rationale: 'Zero-rated, exempt, or out-of-scope supply.'
    };
  }

  /**
   * Aggregates transactions into statutory FTA VAT Return 201 boxes.
   */
  public static calculateVatReturn201(lines: VatTransactionLine[]): VatReturn201Result {
    const warnings: string[] = [];

    let box1StandardSupplies = new Decimal(0);
    let box1OutputVat = new Decimal(0);
    let box3RcmSupplies = new Decimal(0);
    let box3OutputVat = new Decimal(0);
    let box4ZeroRatedSupplies = new Decimal(0);
    let box5ExemptSupplies = new Decimal(0);

    let box9StandardPurchases = new Decimal(0);
    let box9RecoverableVat = new Decimal(0);
    let box10RcmPurchases = new Decimal(0);
    let box10RecoverableVat = new Decimal(0);
    let totalBlockedVat = new Decimal(0);

    for (const line of lines) {
      if (line.isSale) {
        // OUTPUT VAT (SALES)
        switch (line.vatRateCategory) {
          case 'STANDARD_5': {
            const vat = line.amountAED.times(VAT_STANDARD_RATE);
            box1StandardSupplies = box1StandardSupplies.plus(line.amountAED);
            box1OutputVat = box1OutputVat.plus(vat);
            break;
          }
          case 'ZERO_RATED_0':
            box4ZeroRatedSupplies = box4ZeroRatedSupplies.plus(line.amountAED);
            break;
          case 'EXEMPT':
            box5ExemptSupplies = box5ExemptSupplies.plus(line.amountAED);
            break;
          case 'OUT_OF_SCOPE':
            // Not reported in statutory return boxes
            break;
        }
      } else {
        // INPUT VAT (PURCHASES / EXPENSES)
        if (line.isReverseChargeService || line.vatRateCategory === 'REVERSE_CHARGE') {
          // Reverse Charge Mechanism (RCM) - Foreign SaaS / Imported Services
          const rcmVat = line.amountAED.times(VAT_STANDARD_RATE);
          box3RcmSupplies = box3RcmSupplies.plus(line.amountAED);
          box3OutputVat = box3OutputVat.plus(rcmVat);

          // RCM input recovery in Box 10
          box10RcmPurchases = box10RcmPurchases.plus(line.amountAED);
          box10RecoverableVat = box10RecoverableVat.plus(rcmVat);
        } else {
          // Domestic purchases
          const evalResult = this.evaluateInputRecoverability(line);
          if (evalResult.recoverability === 'FULLY_RECOVERABLE') {
            box9StandardPurchases = box9StandardPurchases.plus(line.amountAED);
            box9RecoverableVat = box9RecoverableVat.plus(evalResult.recoverableVatAED);
          } else if (evalResult.recoverability === 'BLOCKED') {
            totalBlockedVat = totalBlockedVat.plus(evalResult.blockedVatAED);
          }
        }
      }
    }

    const box8TotalDue = box1OutputVat.plus(box3OutputVat);
    const box11TotalRecoverable = box9RecoverableVat.plus(box10RecoverableVat);
    const box12NetPosition = box8TotalDue.minus(box11TotalRecoverable);

    return {
      ruleSetVersion: VAT_RULESET_VERSION,
      box1StandardRatedSuppliesAED: box1StandardSupplies,
      box1OutputVatAED: box1OutputVat,
      box3ReverseChargeSuppliesAED: box3RcmSupplies,
      box3OutputVatAED: box3OutputVat,
      box4ZeroRatedSuppliesAED: box4ZeroRatedSupplies,
      box5ExemptSuppliesAED: box5ExemptSupplies,
      box8TotalOutputVatDueAED: box8TotalDue,
      box9StandardRatedPurchasesAED: box9StandardPurchases,
      box9RecoverableInputVatAED: box9RecoverableVat,
      box10ReverseChargePurchasesAED: box10RcmPurchases,
      box10RecoverableInputVatAED: box10RecoverableVat,
      box11TotalRecoverableVatAED: box11TotalRecoverable,
      box12NetVatPositionAED: box12NetPosition,
      blockedInputVatAED: totalBlockedVat,
      warnings
    };
  }

  /**
   * Monitors rolling 12-month turnover against VAT registration thresholds.
   */
  public static evaluateRegistrationThresholds(rolling12MonthTaxableSuppliesAED: Decimal): {
    isMandatoryRegistrationRequired: boolean;
    isVoluntaryRegistrationEligible: boolean;
    turnoverAED: Decimal;
    mandatoryThresholdAED: Decimal;
    voluntaryThresholdAED: Decimal;
    recommendation: string;
  } {
    const turnover = new Decimal(rolling12MonthTaxableSuppliesAED);
    const mandatory = turnover.greaterThanOrEqualTo(VAT_MANDATORY_REGISTRATION_THRESHOLD);
    const voluntary = turnover.greaterThanOrEqualTo(VAT_VOLUNTARY_REGISTRATION_THRESHOLD);

    let recommendation = 'Turnover is below voluntary registration threshold. No immediate action required.';
    if (mandatory) {
      recommendation = `CRITICAL: Taxable turnover of AED ${turnover.toFixed(2)} exceeds mandatory threshold of AED 375,000. Registration with FTA must be submitted within 30 days to avoid late registration penalties.`;
    } else if (voluntary) {
      recommendation = `ELIGIBLE: Taxable turnover of AED ${turnover.toFixed(2)} exceeds voluntary threshold of AED 187,500. You may voluntarily register to recover input tax on expenses.`;
    }

    return {
      isMandatoryRegistrationRequired: mandatory,
      isVoluntaryRegistrationEligible: voluntary,
      turnoverAED: turnover,
      mandatoryThresholdAED: VAT_MANDATORY_REGISTRATION_THRESHOLD,
      voluntaryThresholdAED: VAT_VOLUNTARY_REGISTRATION_THRESHOLD,
      recommendation
    };
  }
}
