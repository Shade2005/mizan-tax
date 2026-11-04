// ============================================================================
// UAE Tax Intelligence Platform - Standalone Test Suite Runner
// Executes all 12 statutory scenarios and asserts exact mathematical outcomes
// ============================================================================

import { Decimal } from 'decimal.js';
import { CorporateTaxEngine } from './corporate-tax.engine';
import { VatEngine, VatTransactionLine } from './vat.engine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testId: string, description: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testId}: ${description}`);
  } else {
    console.error(`\x1b[31m✘ [FAIL]\x1b[0m ${testId}: ${description}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

console.log('\n============================================================');
console.log('UAE TAX INTELLIGENCE DETERMINISTIC ENGINE TEST RUNNER');
console.log('============================================================\n');

// TC-01: Freelancer High Salary Exemption
{
  const npResult = CorporateTaxEngine.evaluateNaturalPerson({
    grossBusinessTurnoverAED: new Decimal('400000.0000'),
    employmentSalaryAED: new Decimal('1500000.0000'),
    personalInvestmentIncomeAED: new Decimal('100000.0000')
  });
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
  assert(!npResult.isSubjectToCorporateTax && ctCalc.corporateTaxPayableAED.toNumber() === 0,
    'TC-01', 'Freelancer with AED 1.5M employment salary + AED 400k business turnover is exempt from CT');
}

// TC-02: Freelancer Crossing AED 1M Threshold
{
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
  // 9% on (600,000 - 375,000) = 20,250
  assert(ctCalc.corporateTaxPayableAED.toNumber() === 20250,
    'TC-02', 'Freelancer with AED 1.2M gross turnover and AED 600k profit pays AED 20,250 (9% over 375k)');
}

// TC-03: Mainland LLC with Small Business Relief
{
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
  assert(ctCalc.isSmallBusinessReliefApplied && ctCalc.corporateTaxPayableAED.toNumber() === 0,
    'TC-03', 'Mainland LLC with AED 2.8M revenue qualifies for SBR -> 0 Tax Payable');
}

// TC-04: SBR Disqualification due to Prior Period Breach
{
  const ctCalc = CorporateTaxEngine.calculate({
    legalEntityType: 'LLC',
    taxPeriodStart: new Date('2026-01-01'),
    taxPeriodEnd: new Date('2026-12-31'),
    revenueAED: new Decimal('2000000.0000'),
    priorPeriodRevenues: [new Decimal('3200000.0000')],
    accountingNetProfit: new Decimal('500000.0000'),
    isSmallBusinessReliefElected: true,
    isQfzp: false,
    isMneGroup: false
  });
  assert(!ctCalc.isSmallBusinessReliefApplied && ctCalc.corporateTaxPayableAED.toNumber() === 11250,
    'TC-04', 'LLC with prior AED 3.2M revenue is disqualified from SBR and pays standard 9%');
}

// TC-05: 50% Entertainment Cap & Non-Deductible Fines
{
  const ctCalc = CorporateTaxEngine.calculate({
    legalEntityType: 'LLC',
    taxPeriodStart: new Date('2026-01-01'),
    taxPeriodEnd: new Date('2026-12-31'),
    revenueAED: new Decimal('5000000.0000'),
    accountingNetProfit: new Decimal('1000000.0000'),
    clientEntertainmentExpense: new Decimal('100000.0000'),
    nonDeductibleFines: new Decimal('20000.0000'),
    isSmallBusinessReliefElected: false,
    isQfzp: false,
    isMneGroup: false
  });
  assert(ctCalc.finalTaxableIncome.toNumber() === 1070000 && ctCalc.corporateTaxPayableAED.toNumber() === 62550,
    'TC-05', '50% entertainment cap (AED 50k) and fines (AED 20k) correctly added back');
}

// TC-06: Interest Limitation (GIDLR)
{
  const ctCalc = CorporateTaxEngine.calculate({
    legalEntityType: 'LLC',
    taxPeriodStart: new Date('2026-01-01'),
    taxPeriodEnd: new Date('2026-12-31'),
    revenueAED: new Decimal('50000000.0000'),
    accountingNetProfit: new Decimal('5000000.0000'),
    netInterestExpense: new Decimal('15000000.0000'),
    taxEbitda: new Decimal('30000000.0000'),
    isSmallBusinessReliefElected: false,
    isQfzp: false,
    isMneGroup: false
  });
  assert(ctCalc.finalTaxableIncome.toNumber() === 8000000,
    'TC-06', 'GIDLR interest cap correctly disallows AED 3,000,000 excess interest above AED 12M de minimis');
}

// TC-07: 75% Tax Loss Utilization Cap
{
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
  assert(ctCalc.taxLossOffsetApplied.toNumber() === 750000 && ctCalc.remainingTaxLosses.toNumber() === 450000,
    'TC-07', 'Tax losses capped at 75% statutory limit (AED 750k utilized, AED 450k carried forward)');
}

// TC-08: QFZP Passing De Minimis
{
  const evalResult = CorporateTaxEngine.evaluateQfzpDeMinimis(
    new Decimal('10000000.0000'),
    new Decimal('400000.0000')
  );
  assert(evalResult.passesDeMinimis,
    'TC-08', 'QFZP passing de minimis ratio (AED 400k <= min(5M, 5% of 10M)) maintains 0% status');
}

// TC-09: QFZP Breaching De Minimis
{
  const evalResult = CorporateTaxEngine.evaluateQfzpDeMinimis(
    new Decimal('10000000.0000'),
    new Decimal('600000.0000')
  );
  assert(!evalResult.passesDeMinimis,
    'TC-09', 'QFZP breaching de minimis (AED 600k > AED 500k) is disqualified for 5 years');
}

// TC-10: Foreign SaaS Reverse Charge Mechanism
{
  const lines: VatTransactionLine[] = [
    { id: '1', isSale: true, amountAED: new Decimal('100000.0000'), vatRateCategory: 'STANDARD_5', hasValidTaxInvoice: true },
    { id: '2', isSale: false, amountAED: new Decimal('20000.0000'), vatRateCategory: 'REVERSE_CHARGE', isReverseChargeService: true, hasValidTaxInvoice: true }
  ];
  const vatReturn = VatEngine.calculateVatReturn201(lines);
  assert(
    vatReturn.box3OutputVatAED.toNumber() === 1000 &&
    vatReturn.box10RecoverableInputVatAED.toNumber() === 1000 &&
    vatReturn.box12NetVatPositionAED.toNumber() === 5000,
    'TC-10', 'Foreign SaaS under RCM reported in Box 3 and Box 10 with net cash neutral impact');
}

// TC-11: Decision No. 17 of 2026 Employee Expenses vs Blocked Entertainment
{
  const hotelLine: VatTransactionLine = {
    id: 'h1', isSale: false, amountAED: new Decimal('10000.0000'), vatRateCategory: 'STANDARD_5',
    isEmployeeExpense: true, employeeExpenseCategory: 'BUSINESS_TRAVEL_HOTEL', hasValidTaxInvoice: true
  };
  const dinnerLine: VatTransactionLine = {
    id: 'd1', isSale: false, amountAED: new Decimal('2000.0000'), vatRateCategory: 'STANDARD_5',
    isEntertainmentOrHospitality: true, hasValidTaxInvoice: true
  };
  const hotelEval = VatEngine.evaluateInputRecoverability(hotelLine);
  const dinnerEval = VatEngine.evaluateInputRecoverability(dinnerLine);

  assert(hotelEval.recoverability === 'FULLY_RECOVERABLE' && dinnerEval.recoverability === 'BLOCKED',
    'TC-11', 'Decision 17/2026 allows duty business hotel VAT recovery while Art. 53 blocks client dinner VAT');
}

// TC-12: VAT Mandatory Threshold Monitoring
{
  const thresholdEval = VatEngine.evaluateRegistrationThresholds(new Decimal('420000.0000'));
  assert(thresholdEval.isMandatoryRegistrationRequired && thresholdEval.recommendation.includes('CRITICAL'),
    'TC-12', 'Turnover exceeding AED 375,000 triggers mandatory VAT registration alert with 30-day countdown');
}

console.log('\n------------------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('------------------------------------------------------------\n');

if (passedTests === totalTests) {
  console.log('\x1b[32m✔ ALL 12 STATUTORY TAX ENGINE TEST CASES PASSED PERFECTLY!\x1b[0m\n');
} else {
  process.exit(1);
}
