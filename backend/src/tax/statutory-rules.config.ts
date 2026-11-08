// ============================================================================
// Mizan (ميزان) - Statutory UAE Tax Rules & Legal References Configuration
// Authoritative Regulatory Citations: FTA, Ministry of Finance, Cabinet Decisions
// Effective Versions: VAT 2026.2-VAT | CT 2026.1-CT
// ============================================================================

import { Decimal } from 'decimal.js';

export const STATUTORY_METADATA = {
  jurisdiction: 'United Arab Emirates',
  authorities: [
    'Federal Tax Authority (FTA) - الهيئة الاتحادية للضرائب',
    'Ministry of Finance (MoF) - وزارة المالية',
  ],
  versionDate: '2026-11-06',
} as const;

export interface StatutoryCitation {
  id: string;
  authority: string;
  legislation: string;
  article: string;
  title: string;
  effectiveDate: string;
  summary: string;
  officialReferenceUrl?: string;
}

export const STATUTORY_CITATIONS: Record<string, StatutoryCitation> = {
  VAT_BASIC_LAW: {
    id: 'FDL_8_2017',
    authority: 'Federal Tax Authority',
    legislation: 'Federal Decree-Law No. (8) of 2017 on Value Added Tax (as amended)',
    article: 'Articles 1, 2, 25, 45, 46, 54',
    title: 'Value Added Tax Scope, Tax Rates, and Input Recovery',
    effectiveDate: '2018-01-01',
    summary: 'Establishes the standard 5% VAT rate, 0% zero-rated supplies, exemptions, and general right to recover input tax incurred for making taxable supplies.',
  },
  VAT_BLOCKED_INPUTS_ART_53: {
    id: 'VAT_EXEC_REG_ART_53',
    authority: 'Cabinet of the United Arab Emirates',
    legislation: 'Cabinet Decision No. (52) of 2017 on the Executive Regulations of Federal Decree-Law No. (8) of 2017',
    article: 'Article 53(1)',
    title: 'Non-Recoverable Input Tax (Entertainment & Motor Vehicles)',
    effectiveDate: '2018-01-01',
    summary: 'Strictly blocks input VAT recovery on client entertainment, hospitality, amusement, and motor vehicles purchased, leased, or maintained for personal employee use.',
  },
  VAT_EMPLOYEE_EXPENSES_DEC_17: {
    id: 'FTA_DEC_17_2026',
    authority: 'Federal Tax Authority',
    legislation: 'FTA Decision No. 17 of 2026',
    article: 'Clauses 1–4',
    title: 'Input Tax Incurred on Employee-Related Expenses and Mobile Telecommunications',
    effectiveDate: '2026-01-01',
    summary: 'Clarifies that VAT on employee expenses is 100% recoverable when mandated by UAE Labour Law, contractual employment policy, or necessary for duty performance (business travel & hotel). Personal perks and discretionary family benefits remain blocked under Art. 53.',
  },
  VAT_TAX_INVOICE_ART_59_65: {
    id: 'VAT_EXEC_REG_ART_59_65',
    authority: 'Federal Tax Authority',
    legislation: 'Executive Regulations to Federal Decree-Law No. (8) of 2017',
    article: 'Articles 59 & 65',
    title: 'Mandatory Requirements for Valid Tax Invoices',
    effectiveDate: '2018-01-01',
    summary: 'Input VAT recovery requires a valid Tax Invoice bearing the supplier name, address, 15-digit TRN, sequential invoice number, date of supply, and clear VAT breakdown in AED.',
  },
  CT_BASIC_LAW: {
    id: 'FDL_47_2022',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022 on the Taxation of Corporations and Businesses',
    article: 'Articles 1, 3, 11, 20, 48',
    title: 'Corporate Tax Scope, Taxable Persons, and Accounting Income',
    effectiveDate: '2023-06-01',
    summary: 'Imposes 0% tax on taxable income up to AED 375,000, and 9% tax on taxable income exceeding AED 375,000. Taxable income is determined starting from accounting net profit/loss prepared in accordance with IFRS or IFRS for SMEs.',
  },
  CT_SMALL_BUSINESS_RELIEF: {
    id: 'CT_SBR_ART_21',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022 & Ministerial Decision No. 73 of 2023',
    article: 'Article 21 & MD 73/2023',
    title: 'Small Business Relief (SBR) - Revenue <= AED 3,000,000',
    effectiveDate: '2023-06-01',
    summary: 'Allows resident taxable persons with gross revenue not exceeding AED 3,000,000 in the current and all prior tax periods to elect for Small Business Relief, treating taxable income as zero. Not available to Qualifying Free Zone Persons or MNE groups.',
  },
  CT_ENTERTAINMENT_DISALLOWANCE: {
    id: 'CT_ENTERTAINMENT_ART_32',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022',
    article: 'Article 32',
    title: 'Entertainment Expenditure 50% Disallowance',
    effectiveDate: '2023-06-01',
    summary: '50% of any expenditure incurred to entertain, host, or accommodate customers, shareholders, suppliers, or business partners is non-deductible for Corporate Tax purposes and must be added back to accounting profit.',
  },
  CT_FINES_PENALTIES: {
    id: 'CT_FINES_ART_33_1',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022',
    article: 'Article 33(1)',
    title: 'Non-Deductible Fines and Penalties',
    effectiveDate: '2023-06-01',
    summary: 'Fines, penalties, and administrative charges payable to governmental bodies, courts, or regulators are strictly non-deductible for Corporate Tax purposes.',
  },
  CT_INTEREST_LIMITATION_GIDLR: {
    id: 'CT_GIDLR_ART_30',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022 & Ministerial Decision No. 126 of 2023',
    article: 'Article 30 & MD 126/2023',
    title: 'General Interest Deduction Limitation Rule (GIDLR)',
    effectiveDate: '2023-06-01',
    summary: 'Net interest expense exceeding the de minimis threshold of AED 12,000,000 is limited to 30% of Tax EBITDA. Disallowed net interest may be carried forward for up to 10 subsequent tax periods.',
  },
  CT_TAX_LOSS_RELIEF: {
    id: 'CT_LOSS_RELIEF_ART_37_39',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022',
    article: 'Articles 37 & 39',
    title: 'Tax Loss Carry-Forward and 75% Offset Limitation',
    effectiveDate: '2023-06-01',
    summary: 'Tax losses may be carried forward indefinitely. The maximum tax loss that can be offset against current period taxable income is capped at 75% of taxable income before the loss offset.',
  },
  CT_EXEMPT_INCOME: {
    id: 'CT_EXEMPT_INCOME_ART_22_23',
    authority: 'Ministry of Finance',
    legislation: 'Federal Decree-Law No. (47) of 2022',
    article: 'Articles 22 & 23',
    title: 'Exempt Income, Dividends, and Participation Exemption',
    effectiveDate: '2023-06-01',
    summary: 'Dividends and profit distributions received from UAE juridical persons are fully exempt. Qualifying participation gains from foreign subsidiaries (>= 5% ownership for >= 12 months subject to >= 9% tax) are also exempt.',
  },
  CT_NATURAL_PERSON: {
    id: 'CT_NATURAL_PERSON_CD_49',
    authority: 'Cabinet of the United Arab Emirates',
    legislation: 'Cabinet Decision No. (49) of 2023',
    article: 'Articles 2, 3, 4',
    title: 'Application of Corporate Tax to Natural Persons (Turnover > AED 1,000,000)',
    effectiveDate: '2023-06-01',
    summary: 'A natural person (freelancer, sole proprietor) is subject to Corporate Tax only if gross turnover derived from licensed business activities exceeds AED 1,000,000 within a calendar year. Employment wages, personal investments, and personal real estate income are excluded.',
  },
  CT_QFZP_REGIME: {
    id: 'CT_QFZP_CD_139_MD_265',
    authority: 'Cabinet & Ministry of Finance',
    legislation: 'Cabinet Decision No. (139) of 2023 & Ministerial Decision No. 265 of 2023',
    article: 'Articles 2, 3, 4',
    title: 'Qualifying Free Zone Person (QFZP) 0% Regime & De Minimis Rule',
    effectiveDate: '2023-06-01',
    summary: 'A Qualifying Free Zone Person benefits from 0% Corporate Tax on Qualifying Income. Non-qualifying revenue must not exceed the de minimis threshold: min(5% of total revenue, AED 5,000,000). Breaching the de minimis causes loss of QFZP status for the tax year and next 4 tax years.',
  },
};

export const VAT_STATUTORY_CONSTANTS = {
  standardRate: new Decimal('0.05'),
  zeroRate: new Decimal('0.00'),
  mandatoryRegistrationThresholdAED: new Decimal('375000.00'),
  voluntaryRegistrationThresholdAED: new Decimal('187500.00'),
  lateRegistrationPenaltyAED: new Decimal('10000.00'),
  ruleSetVersion: '2026.2-VAT',
} as const;

export const CT_STATUTORY_CONSTANTS = {
  statutoryExemptThresholdAED: new Decimal('375000.00'),
  standardRate: new Decimal('0.09'),
  sbrRevenueThresholdAED: new Decimal('3000000.00'),
  sbrSunsetDate: '2029-12-31',
  naturalPersonThresholdAED: new Decimal('1000000.00'),
  gidlrDeMinimisAED: new Decimal('12000000.00'),
  gidlrEbitdaRatio: new Decimal('0.30'),
  taxLossMaxOffsetRatio: new Decimal('0.75'),
  qfzpDeMinimisCapAED: new Decimal('5000000.00'),
  qfzpDeMinimisPct: new Decimal('0.05'),
  ruleSetVersion: '2026.1-CT',
} as const;
