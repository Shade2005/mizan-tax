// ============================================================================
// UAE Tax Intelligence Platform - Statutory Test Suite (12 Scenarios)
// Validates Corporate Tax & VAT against official FTA & MoF statutory baselines
// ============================================================================

import { Decimal } from 'decimal.js';
import { CorporateTaxEngine } from './corporate-tax.engine';
import { VatEngine, VatTransactionLine } from './vat.engine';

describe('UAE Tax Intelligence - Deterministic Engine Test Suite', () => {
  // --------------------------------------------------------------------------
  // SCENARIO 01: Freelancer with High Employment Salary (Cabinet Decision 49/2023)
  // --------------------------------------------------------------------------
  test('TC-01: Freelancer with AED 1.5M salary + AED 400k freelance business is exempt from CT', () => {
    const npResult = CorporateTaxEngine.evaluateNaturalPerson({
      grossBusinessTurnoverAED: new Decimal('400000.0000'),
      employmentSalaryAED: new Decimal('1500000.0000'),
      personalInvestmentIncomeAED: new Decimal('100000.0000')
    });

    expect(npResult.isSubjectToCorporateTax).toBe(false);
    expect(npResult.taxableBusinessTurnoverAED.toNumber()).toBe(400000);

    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'NATURAL_PERSON',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('400000.0000'),
      accountingNetProfit: new Decimal('350000.0000'),
      isSmallBusinessReliefElected: false,
      isQfzp: false,
      isMneGroup: false
    });

    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(0);
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(0);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 02: Freelancer Crossing AED 1,000,000 Turnover Threshold
  // --------------------------------------------------------------------------
  test('TC-02: Freelancer with AED 1.2M gross turnover and AED 600k profit pays 9% on excess of 375k', () => {
    const npResult = CorporateTaxEngine.evaluateNaturalPerson({
      grossBusinessTurnoverAED: new Decimal('1200000.0000')
    });
    expect(npResult.isSubjectToCorporateTax).toBe(true);

    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'NATURAL_PERSON',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('1200000.0000'),
      accountingNetProfit: new Decimal('600000.0000'),
      isSmallBusinessReliefElected: false,
      isQfzp: false,
      isMneGroup: false
    });

    // Taxable = 600,000. Excess = 600,000 - 375,000 = 225,000. 9% of 225,000 = 20,250.
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(600000);
    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(20250);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 03: Mainland LLC with Small Business Relief (SBR)
  // --------------------------------------------------------------------------
  test('TC-03: Mainland LLC with AED 2.8M revenue elects SBR -> Taxable Income = 0, Tax = 0', () => {
    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'LLC',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('2800000.0000'),
      priorPeriodRevenues: [new Decimal('2500000.0000')],
      accountingNetProfit: new Decimal('500000.0000'),
      isSmallBusinessReliefElected: true,
      isQfzp: false,
      isMneGroup: false
    });

    expect(ctCalc.isSmallBusinessReliefApplied).toBe(true);
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(0);
    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(0);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 04: Mainland LLC Breaching SBR in Prior Tax Period
  // --------------------------------------------------------------------------
  test('TC-04: LLC with AED 2.0M current revenue disqualified from SBR due to prior AED 3.2M revenue', () => {
    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'LLC',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('2000000.0000'),
      priorPeriodRevenues: [new Decimal('3200000.0000')], // Breached in Year 1
      accountingNetProfit: new Decimal('500000.0000'),
      isSmallBusinessReliefElected: true,
      isQfzp: false,
      isMneGroup: false
    });

    expect(ctCalc.isSmallBusinessReliefApplied).toBe(false);
    expect(ctCalc.warnings.some((w) => w.includes('Prior tax period revenue exceeded'))).toBe(true);
    // Standard tax: (500k - 375k) * 0.09 = 125,000 * 0.09 = 11,250
    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(11250);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 05: Mainland LLC with 50% Entertainment & Fines Addbacks
  // --------------------------------------------------------------------------
  test('TC-05: 50% of client entertainment and 100% of fines added back to accounting profit', () => {
    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'LLC',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('5000000.0000'),
      accountingNetProfit: new Decimal('1000000.0000'),
      clientEntertainmentExpense: new Decimal('100000.0000'), // 50,000 addback
      nonDeductibleFines: new Decimal('20000.0000'), // 20,000 addback
      isSmallBusinessReliefElected: false,
      isQfzp: false,
      isMneGroup: false
    });

    // Taxable = 1,000,000 + 50,000 + 20,000 = 1,070,000
    // Tax = (1,070,000 - 375,000) * 0.09 = 695,000 * 0.09 = 62,550
    expect(ctCalc.totalAdditions.toNumber()).toBe(70000);
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(1070000);
    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(62550);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 06: General Interest Deduction Limitation (GIDLR - Art. 30)
  // --------------------------------------------------------------------------
  test('TC-06: Net interest of AED 15M restricted to max(12M, 30% of 30M EBITDA) -> 3M addback', () => {
    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'LLC',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('50000000.0000'),
      accountingNetProfit: new Decimal('5000000.0000'),
      netInterestExpense: new Decimal('15000000.0000'),
      taxEbitda: new Decimal('30000000.0000'), // 30% is 9,000,000. De minimis is 12,000,000.
      isSmallBusinessReliefElected: false,
      isQfzp: false,
      isMneGroup: false
    });

    // Allowed deduction = max(12M, 9M) = 12M. Disallowed = 15M - 12M = 3,000,000 addback.
    const gidlrAdj = ctCalc.adjustments.find((a) => a.code === 'GIDLR_ART_30');
    expect(gidlrAdj).toBeDefined();
    expect(gidlrAdj?.amountAED.toNumber()).toBe(3000000);
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(8000000);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 07: 75% Tax Loss Utilization Cap (Art. 39)
  // --------------------------------------------------------------------------
  test('TC-07: Tax losses offset against current taxable profit capped at 75%', () => {
    const ctCalc = CorporateTaxEngine.calculate({
      legalEntityType: 'LLC',
      taxPeriodStart: new Date('2026-01-01'),
      taxPeriodEnd: new Date('2026-12-31'),
      revenueAED: new Decimal('4000000.0000'),
      accountingNetProfit: new Decimal('1000000.0000'),
      unutilizedPriorTaxLosses: new Decimal('1200000.0000'),
      isSmallBusinessReliefElected: false,
      isQfzp: false,
      isMneGroup: false
    });

    // Max 75% of 1,000,000 = 750,000.
    // Remaining taxable income = 250,000 <= 375,000 -> Tax Payable = 0.
    // Remaining losses carried forward = 1,200,000 - 750,000 = 450,000.
    expect(ctCalc.taxLossOffsetApplied.toNumber()).toBe(750000);
    expect(ctCalc.finalTaxableIncome.toNumber()).toBe(250000);
    expect(ctCalc.corporateTaxPayableAED.toNumber()).toBe(0);
    expect(ctCalc.remainingTaxLosses.toNumber()).toBe(450000);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 08: QFZP Passing De Minimis Test
  // --------------------------------------------------------------------------
  test('TC-08: QFZP with AED 10M total rev and AED 400k non-qualifying passes de minimis', () => {
    const evalResult = CorporateTaxEngine.evaluateQfzpDeMinimis(
      new Decimal('10000000.0000'),
      new Decimal('400000.0000')
    );
    // 5% of 10M = 500,000. Limit = min(5M, 500k) = 500k. 400k <= 500k -> PASS.
    expect(evalResult.passesDeMinimis).toBe(true);
    expect(evalResult.deMinimisLimitAED.toNumber()).toBe(500000);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 09: QFZP Breaching De Minimis Test
  // --------------------------------------------------------------------------
  test('TC-09: QFZP with AED 10M total rev and AED 600k non-qualifying breaches de minimis', () => {
    const evalResult = CorporateTaxEngine.evaluateQfzpDeMinimis(
      new Decimal('10000000.0000'),
      new Decimal('600000.0000')
    );
    expect(evalResult.passesDeMinimis).toBe(false);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 10: Foreign SaaS Reverse Charge Mechanism (RCM)
  // --------------------------------------------------------------------------
  test('TC-10: Cross-border foreign SaaS (AWS) is reported in Box 3 and Box 10 simultaneously', () => {
    const lines: VatTransactionLine[] = [
      {
        id: '1',
        isSale: true,
        amountAED: new Decimal('100000.0000'),
        vatRateCategory: 'STANDARD_5',
        hasValidTaxInvoice: true
      },
      {
        id: '2',
        isSale: false,
        amountAED: new Decimal('20000.0000'), // Foreign SaaS bill under RCM
        vatRateCategory: 'REVERSE_CHARGE',
        isReverseChargeService: true,
        hasValidTaxInvoice: true
      }
    ];

    const vatReturn = VatEngine.calculateVatReturn201(lines);

    // Box 1 Output = 5,000
    expect(vatReturn.box1OutputVatAED.toNumber()).toBe(5000);
    // Box 3 RCM Output = 1,000
    expect(vatReturn.box3OutputVatAED.toNumber()).toBe(1000);
    // Box 8 Total Due = 6,000
    expect(vatReturn.box8TotalOutputVatDueAED.toNumber()).toBe(6000);
    // Box 10 RCM Recoverable = 1,000
    expect(vatReturn.box10RecoverableInputVatAED.toNumber()).toBe(1000);
    // Box 11 Total Recoverable = 1,000
    expect(vatReturn.box11TotalRecoverableVatAED.toNumber()).toBe(1000);
    // Box 12 Net Payable = 6,000 - 1,000 = 5,000
    expect(vatReturn.box12NetVatPositionAED.toNumber()).toBe(5000);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 11: Decision No. 17 of 2026 & Art. 53 Blocked VAT
  // --------------------------------------------------------------------------
  test('TC-11: Decision 17/2026 allows duty travel hotel, but Art. 53 blocks entertainment dinner', () => {
    const hotelLine: VatTransactionLine = {
      id: 'h1',
      isSale: false,
      amountAED: new Decimal('10000.0000'),
      vatRateCategory: 'STANDARD_5',
      isEmployeeExpense: true,
      employeeExpenseCategory: 'BUSINESS_TRAVEL_HOTEL',
      hasValidTaxInvoice: true
    };

    const dinnerLine: VatTransactionLine = {
      id: 'd1',
      isSale: false,
      amountAED: new Decimal('2000.0000'),
      vatRateCategory: 'STANDARD_5',
      isEntertainmentOrHospitality: true,
      hasValidTaxInvoice: true
    };

    const hotelEval = VatEngine.evaluateInputRecoverability(hotelLine);
    const dinnerEval = VatEngine.evaluateInputRecoverability(dinnerLine);

    expect(hotelEval.recoverability).toBe('FULLY_RECOVERABLE');
    expect(hotelEval.recoverableVatAED.toNumber()).toBe(500);

    expect(dinnerEval.recoverability).toBe('BLOCKED');
    expect(dinnerEval.recoverableVatAED.toNumber()).toBe(0);
    expect(dinnerEval.blockedVatAED.toNumber()).toBe(100);
  });

  // --------------------------------------------------------------------------
  // SCENARIO 12: VAT Mandatory Threshold Monitoring
  // --------------------------------------------------------------------------
  test('TC-12: Turnover crossing AED 375,000 triggers mandatory registration alert', () => {
    const thresholdEval = VatEngine.evaluateRegistrationThresholds(new Decimal('420000.0000'));
    expect(thresholdEval.isMandatoryRegistrationRequired).toBe(true);
    expect(thresholdEval.recommendation).toContain('CRITICAL');
  });
});
