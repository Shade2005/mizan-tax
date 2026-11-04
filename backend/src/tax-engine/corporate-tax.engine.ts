// ============================================================================
// UAE Tax Intelligence Platform - Deterministic Corporate Tax Engine
// Statutory Framework: Federal Decree-Law No. 47 of 2022 & Subsequent Decisions
// Version: 2026.1-CT
// ============================================================================

import { Decimal } from 'decimal.js';

// Enforce fintech-grade arithmetic invariants
Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export const CT_RULESET_VERSION = '2026.1-CT';
export const CT_STATUTORY_EXEMPT_THRESHOLD = new Decimal('375000.0000');
export const CT_STANDARD_RATE = new Decimal('0.09');
export const SBR_REVENUE_THRESHOLD = new Decimal('3000000.0000');
export const SBR_MAX_EXPIRY_DATE = new Date('2029-12-31T23:59:59.999Z');
export const NATURAL_PERSON_TURNOVER_THRESHOLD = new Decimal('1000000.0000');
export const GIDLR_DE_MINIMIS_THRESHOLD = new Decimal('12000000.0000');
export const GIDLR_EBITDA_RATIO = new Decimal('0.30');
export const TAX_LOSS_MAX_OFFSET_RATIO = new Decimal('0.75');

export type LegalEntityType =
  | 'NATURAL_PERSON'
  | 'SOLE_ESTABLISHMENT'
  | 'LLC'
  | 'FREE_ZONE_ESTABLISHMENT'
  | 'FREE_ZONE_COMPANY'
  | 'BRANCH_OF_FOREIGN_COMPANY';

export interface NaturalPersonAssessmentInput {
  grossBusinessTurnoverAED: Decimal;
  employmentSalaryAED?: Decimal;
  personalInvestmentIncomeAED?: Decimal;
  personalRealEstateIncomeAED?: Decimal;
}

export interface NaturalPersonAssessmentResult {
  isSubjectToCorporateTax: boolean;
  taxableBusinessTurnoverAED: Decimal;
  exemptTurnoverAED: Decimal;
  legalReference: string;
  rationale: string;
}

export interface CorporateTaxEngineInput {
  legalEntityType: LegalEntityType;
  taxPeriodStart: Date;
  taxPeriodEnd: Date;
  revenueAED: Decimal;
  priorPeriodRevenues?: Decimal[];
  accountingNetProfit: Decimal;
  isSmallBusinessReliefElected: boolean;
  isQfzp: boolean;
  isMneGroup: boolean;
  nonDeductibleFines?: Decimal;
  bribesOrIllicitPayments?: Decimal;
  ownerDividendsDistributed?: Decimal;
  recoverableInputVatExpense?: Decimal;
  clientEntertainmentExpense?: Decimal; // 50% disallowed under Art. 32
  netInterestExpense?: Decimal;
  taxEbitda?: Decimal;
  exemptDividendsAndGains?: Decimal;
  qualifyingForeignPeProfit?: Decimal;
  unutilizedPriorTaxLosses?: Decimal;
  qfzpQualifyingIncome?: Decimal;
  qfzpNonQualifyingIncome?: Decimal;
}

export interface TaxAdjustmentItem {
  code: string;
  label: string;
  statutoryReference: string;
  amountAED: Decimal;
  isAdditionToProfit: boolean;
  rationale: string;
}

export interface CorporateTaxEngineResult {
  ruleSetVersion: string;
  isLiable: boolean;
  accountingNetProfit: Decimal;
  totalAdditions: Decimal;
  totalSubtractions: Decimal;
  taxableIncomeBeforeReliefs: Decimal;
  isSmallBusinessReliefApplied: boolean;
  taxLossOffsetApplied: Decimal;
  remainingTaxLosses: Decimal;
  finalTaxableIncome: Decimal;
  corporateTaxPayableAED: Decimal;
  effectiveTaxRatePct: Decimal;
  adjustments: TaxAdjustmentItem[];
  warnings: string[];
}

export class CorporateTaxEngine {
  /**
   * Evaluates Natural Person applicability under Cabinet Decision No. 49 of 2023.
   */
  public static evaluateNaturalPerson(input: NaturalPersonAssessmentInput): NaturalPersonAssessmentResult {
    const businessTurnover = new Decimal(input.grossBusinessTurnoverAED || 0);
    const exemptTurnover = new Decimal(input.employmentSalaryAED || 0)
      .plus(input.personalInvestmentIncomeAED || 0)
      .plus(input.personalRealEstateIncomeAED || 0);

    const isSubject = businessTurnover.greaterThan(NATURAL_PERSON_TURNOVER_THRESHOLD);

    return {
      isSubjectToCorporateTax: isSubject,
      taxableBusinessTurnoverAED: businessTurnover,
      exemptTurnoverAED: exemptTurnover,
      legalReference: 'Cabinet Decision No. 49 of 2023',
      rationale: isSubject
        ? `Gross business turnover of AED ${businessTurnover.toFixed(2)} exceeds statutory threshold of AED 1,000,000.`
        : `Gross business turnover of AED ${businessTurnover.toFixed(2)} is below AED 1,000,000 threshold. Employment salary and personal investments are statutorily exempt.`
    };
  }

  /**
   * Main deterministic Corporate Tax calculation pipeline.
   */
  public static calculate(input: CorporateTaxEngineInput): CorporateTaxEngineResult {
    const warnings: string[] = [];
    const adjustments: TaxAdjustmentItem[] = [];

    const accountingProfit = new Decimal(input.accountingNetProfit || 0);
    const revenue = new Decimal(input.revenueAED || 0);
    let totalAdditions = new Decimal(0);
    let totalSubtractions = new Decimal(0);

    // Natural Person Turnover Check
    if (input.legalEntityType === 'NATURAL_PERSON' || input.legalEntityType === 'SOLE_ESTABLISHMENT') {
      const npEval = this.evaluateNaturalPerson({ grossBusinessTurnoverAED: revenue });
      if (!npEval.isSubjectToCorporateTax) {
        return {
          ruleSetVersion: CT_RULESET_VERSION,
          isLiable: false,
          accountingNetProfit: accountingProfit,
          totalAdditions: new Decimal(0),
          totalSubtractions: new Decimal(0),
          taxableIncomeBeforeReliefs: new Decimal(0),
          isSmallBusinessReliefApplied: false,
          taxLossOffsetApplied: new Decimal(0),
          remainingTaxLosses: new Decimal(input.unutilizedPriorTaxLosses || 0),
          finalTaxableIncome: new Decimal(0),
          corporateTaxPayableAED: new Decimal(0),
          effectiveTaxRatePct: new Decimal(0),
          adjustments: [],
          warnings: ['Natural person business turnover is below AED 1,000,000. Statutorily exempt from Corporate Tax.']
        };
      }
    }

    // Small Business Relief (Art. 21 & MD 73/2023 extended to 2029)
    let isSbrEligible = false;
    if (input.isSmallBusinessReliefElected) {
      const revenueQualifiesCurrent = revenue.lessThanOrEqualTo(SBR_REVENUE_THRESHOLD);
      const priorRevenues = input.priorPeriodRevenues || [];
      const revenueQualifiesPrior = priorRevenues.every((rev) => new Decimal(rev).lessThanOrEqualTo(SBR_REVENUE_THRESHOLD));
      const notQfzp = !input.isQfzp;
      const notMne = !input.isMneGroup;
      const withinDateWindow = input.taxPeriodEnd <= SBR_MAX_EXPIRY_DATE;

      if (revenueQualifiesCurrent && revenueQualifiesPrior && notQfzp && notMne && withinDateWindow) {
        isSbrEligible = true;
      } else {
        if (!revenueQualifiesCurrent) warnings.push('SBR Ineligible: Current period revenue exceeds AED 3,000,000.');
        if (!revenueQualifiesPrior) warnings.push('SBR Ineligible: Prior tax period revenue exceeded AED 3,000,000.');
        if (!notQfzp) warnings.push('SBR Ineligible: Qualifying Free Zone Persons cannot elect Small Business Relief.');
        if (!notMne) warnings.push('SBR Ineligible: Members of multinational enterprise groups cannot elect Small Business Relief.');
        if (!withinDateWindow) warnings.push('SBR Ineligible: Tax period ends after 31 December 2029 statutory sunset.');
      }
    }

    // If SBR is elected and valid, taxable income is treated as zero
    if (isSbrEligible) {
      return {
        ruleSetVersion: CT_RULESET_VERSION,
        isLiable: true,
        accountingNetProfit: accountingProfit,
        totalAdditions: new Decimal(0),
        totalSubtractions: new Decimal(0),
        taxableIncomeBeforeReliefs: new Decimal(0),
        isSmallBusinessReliefApplied: true,
        taxLossOffsetApplied: new Decimal(0),
        remainingTaxLosses: new Decimal(input.unutilizedPriorTaxLosses || 0),
        finalTaxableIncome: new Decimal(0),
        corporateTaxPayableAED: new Decimal(0),
        effectiveTaxRatePct: new Decimal(0),
        adjustments: [
          {
            code: 'SBR_ART_21',
            label: 'Small Business Relief Election',
            statutoryReference: 'Article 21 Federal Decree-Law No. 47 of 2022 & MD 73 of 2023',
            amountAED: accountingProfit,
            isAdditionToProfit: false,
            rationale: 'Revenue <= AED 3M; taxable person elected SBR; taxable income treated as AED 0.'
          }
        ],
        warnings
      };
    }

    // 1. ADDITIONS TO ACCOUNTING PROFIT
    // Non-deductible fines (Art. 33(1))
    const fines = new Decimal(input.nonDeductibleFines || 0);
    if (fines.greaterThan(0)) {
      totalAdditions = totalAdditions.plus(fines);
      adjustments.push({
        code: 'FINES_ART_33_1',
        label: 'Non-Deductible Penalties & Fines',
        statutoryReference: 'Article 33(1) Federal Decree-Law No. 47 of 2022',
        amountAED: fines,
        isAdditionToProfit: true,
        rationale: 'Administrative penalties, government fines, and violations are non-deductible.'
      });
    }

    // 50% Client Entertainment (Art. 32)
    const entertainment = new Decimal(input.clientEntertainmentExpense || 0);
    if (entertainment.greaterThan(0)) {
      const disallowed50 = entertainment.times(0.5);
      totalAdditions = totalAdditions.plus(disallowed50);
      adjustments.push({
        code: 'ENTERTAINMENT_ART_32',
        label: '50% Entertainment & Hospitality Disallowance',
        statutoryReference: 'Article 32 Federal Decree-Law No. 47 of 2022',
        amountAED: disallowed50,
        isAdditionToProfit: true,
        rationale: '50% of client entertainment, accommodation, and hospitality expenses is disallowed.'
      });
    }

    // General Interest Deduction Limitation Rule (GIDLR - Art. 30)
    const netInterest = new Decimal(input.netInterestExpense || 0);
    if (netInterest.greaterThan(GIDLR_DE_MINIMIS_THRESHOLD)) {
      const taxEbitda = new Decimal(input.taxEbitda || 0);
      const ebitdaAllowance = taxEbitda.times(GIDLR_EBITDA_RATIO);
      const maxDeduction = Decimal.max(GIDLR_DE_MINIMIS_THRESHOLD, ebitdaAllowance);

      if (netInterest.greaterThan(maxDeduction)) {
        const disallowedInterest = netInterest.minus(maxDeduction);
        totalAdditions = totalAdditions.plus(disallowedInterest);
        adjustments.push({
          code: 'GIDLR_ART_30',
          label: 'General Interest Deduction Limitation (GIDLR)',
          statutoryReference: 'Article 30 Federal Decree-Law No. 47 of 2022 & MD 126 of 2023',
          amountAED: disallowedInterest,
          isAdditionToProfit: true,
          rationale: `Net interest expense exceeds de minimis and 30% Tax EBITDA cap. Disallowed amount carried forward.`
        });
      }
    }

    // 2. SUBTRACTIONS FROM ACCOUNTING PROFIT
    // Exempt Dividends & Capital Gains (Art. 22 & 23)
    const exemptIncome = new Decimal(input.exemptDividendsAndGains || 0);
    if (exemptIncome.greaterThan(0)) {
      totalSubtractions = totalSubtractions.plus(exemptIncome);
      adjustments.push({
        code: 'EXEMPT_INCOME_ART_22_23',
        label: 'Exempt Dividends & Participation Gains',
        statutoryReference: 'Articles 22 & 23 Federal Decree-Law No. 47 of 2022',
        amountAED: exemptIncome,
        isAdditionToProfit: false,
        rationale: 'Domestic dividends and qualifying participation exemption gains are fully exempt.'
      });
    }

    // Compute Taxable Income Before Losses
    const taxableBeforeLosses = accountingProfit.plus(totalAdditions).minus(totalSubtractions);

    // 3. TAX LOSS OFFSET (Art. 37 & 39 - Capped at 75% of Taxable Income)
    let taxLossApplied = new Decimal(0);
    let remainingLosses = new Decimal(input.unutilizedPriorTaxLosses || 0);
    let finalTaxableIncome = taxableBeforeLosses;

    if (taxableBeforeLosses.greaterThan(0) && remainingLosses.greaterThan(0)) {
      const maxLossAllowed = taxableBeforeLosses.times(TAX_LOSS_MAX_OFFSET_RATIO);
      taxLossApplied = Decimal.min(remainingLosses, maxLossAllowed);
      finalTaxableIncome = taxableBeforeLosses.minus(taxLossApplied);
      remainingLosses = remainingLosses.minus(taxLossApplied);

      adjustments.push({
        code: 'TAX_LOSS_ART_39',
        label: 'Prior Period Tax Loss Relief',
        statutoryReference: 'Article 39 Federal Decree-Law No. 47 of 2022',
        amountAED: taxLossApplied,
        isAdditionToProfit: false,
        rationale: `Offset against current taxable income capped at 75% statutory limit. Remaining loss: AED ${remainingLosses.toFixed(2)}.`
      });
    }

    // 4. TAX LIABILITY COMPUTATION
    // 0% up to AED 375,000; 9% on excess
    let taxPayable = new Decimal(0);
    if (finalTaxableIncome.greaterThan(CT_STATUTORY_EXEMPT_THRESHOLD)) {
      const taxableExcess = finalTaxableIncome.minus(CT_STATUTORY_EXEMPT_THRESHOLD);
      taxPayable = taxableExcess.times(CT_STANDARD_RATE);
    }

    const effectiveRate = finalTaxableIncome.greaterThan(0)
      ? taxPayable.dividedBy(finalTaxableIncome).times(100)
      : new Decimal(0);

    return {
      ruleSetVersion: CT_RULESET_VERSION,
      isLiable: true,
      accountingNetProfit: accountingProfit,
      totalAdditions,
      totalSubtractions,
      taxableIncomeBeforeReliefs: taxableBeforeLosses,
      isSmallBusinessReliefApplied: false,
      taxLossOffsetApplied: taxLossApplied,
      remainingTaxLosses: remainingLosses,
      finalTaxableIncome,
      corporateTaxPayableAED: taxPayable,
      effectiveTaxRatePct: effectiveRate,
      adjustments,
      warnings
    };
  }

  /**
   * Evaluates Qualifying Free Zone Person (QFZP) De Minimis Requirement under CD 139/2023 & MD 265/2023.
   */
  public static evaluateQfzpDeMinimis(totalRevenueAED: Decimal, nonQualifyingRevenueAED: Decimal): {
    passesDeMinimis: boolean;
    deMinimisLimitAED: Decimal;
    nonQualifyingRevenueAED: Decimal;
    explanation: string;
  } {
    const totalRev = new Decimal(totalRevenueAED);
    const nonQualRev = new Decimal(nonQualifyingRevenueAED);

    const fivePct = totalRev.times(0.05);
    const fiveMillion = new Decimal('5000000.0000');
    const deMinimisLimit = Decimal.min(fiveMillion, fivePct);

    const passes = nonQualRev.lessThanOrEqualTo(deMinimisLimit);

    return {
      passesDeMinimis: passes,
      deMinimisLimitAED: deMinimisLimit,
      nonQualifyingRevenueAED: nonQualRev,
      explanation: passes
        ? `Non-qualifying revenue of AED ${nonQualRev.toFixed(2)} is within the de minimis threshold of AED ${deMinimisLimit.toFixed(2)}.`
        : `De minimis breached! Non-qualifying revenue of AED ${nonQualRev.toFixed(2)} exceeds limit of AED ${deMinimisLimit.toFixed(2)}. Entity loses QFZP status for current year and subsequent 4 years.`
    };
  }
}
