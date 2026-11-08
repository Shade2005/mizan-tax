// ============================================================================
// Mizan (ميزان) - Tax Domain Types & Assessment Interfaces
// Deterministic Models for VAT 201 Return & Corporate Tax Computations
// ============================================================================

import { Decimal } from 'decimal.js';

export type TaxTypeEnum = 'VAT' | 'CORPORATE_TAX';

export type AssessmentStatusEnum =
  | 'DRAFT'
  | 'REQUIRES_ATTENTION'
  | 'READY_FOR_REVIEW'
  | 'REVIEWED'
  | 'FINALISED'
  | 'SUPERSEDED'
  | 'ESTIMATED'
  | 'FILED';

export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface TaxComplianceFinding {
  id: string;
  code: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  affectedRecordId?: string;
  affectedRecordType?: 'INVOICE' | 'EXPENSE' | 'REGISTRATION' | 'BUSINESS';
  affectedAmountAED?: number;
  legalReference: string;
  recommendedAction: string;
}

export interface VatBoxBreakdown {
  boxNumber: string;
  boxTitle: string;
  amountAED: number;
  vatAmountAED: number;
  recoverableVatAED?: number;
  legalReference: string;
  notes?: string;
}

export interface VatAssessmentSummary {
  assessmentId: string;
  businessId: string;
  periodKey: string;
  periodStartDate: string;
  periodEndDate: string;
  status: AssessmentStatusEnum;
  ruleSetVersion: string;
  trn: string | null;
  isVatRegistered: boolean;
  totalTaxableSalesAED: number;
  totalOutputVatAED: number;
  totalPurchasesAED: number;
  totalInputVatAED: number;
  recoverableInputVatAED: number;
  blockedInputVatAED: number;
  netVatPositionAED: number; // positive = payable to FTA, negative = refundable
  positionType: 'PAYABLE' | 'REFUNDABLE' | 'NIL';
  complianceScore: number;
  findings: TaxComplianceFinding[];
  boxes: VatBoxBreakdown[];
  sourceCounts: {
    invoicesCount: number;
    expensesCount: number;
    linesCount: number;
  };
  reassessedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateTaxAdjustmentItem {
  code: string;
  label: string;
  statutoryReference: string;
  amountAED: number;
  isAdditionToProfit: boolean;
  rationale: string;
}

export interface CorporateTaxAssessmentSummary {
  assessmentId: string;
  businessId: string;
  periodKey: string;
  periodStartDate: string;
  periodEndDate: string;
  status: AssessmentStatusEnum;
  ruleSetVersion: string;
  legalEntityType: string;
  accountingRevenueAED: number;
  cogsAED: number;
  operatingExpensesAED: number;
  accountingNetProfitAED: number;
  totalAdditionsAED: number;
  totalSubtractionsAED: number;
  taxableIncomeBeforeReliefsAED: number;
  isSmallBusinessReliefApplied: boolean;
  isQfzpApplied: boolean;
  taxLossOffsetAppliedAED: number;
  remainingTaxLossesAED: number;
  finalTaxableIncomeAED: number;
  corporateTaxPayableAED: number;
  effectiveTaxRatePct: number;
  complianceScore: number;
  adjustments: CorporateTaxAdjustmentItem[];
  findings: TaxComplianceFinding[];
  expenseBreakdown: {
    category: string;
    amountAED: number;
    ctDeductibleAED: number;
    disallowedAED: number;
  }[];
  sourceCounts: {
    invoicesCount: number;
    expensesCount: number;
  };
  reassessedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessVatPeriodDto {
  businessId: string;
  periodKey: string; // e.g. "2026-Q1", "2026-M10", "CUSTOM"
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  includeDraftExpenses?: boolean;
}

export interface AssessCorporateTaxPeriodDto {
  businessId: string;
  financialYear: number; // e.g. 2026
  startDate?: string;    // defaults to Jan 1 of fiscal year
  endDate?: string;      // defaults to Dec 31 of fiscal year
  electSmallBusinessRelief?: boolean;
  priorPeriodRevenues?: number[];
  unutilizedPriorTaxLosses?: number;
  isQfzpClaimed?: boolean;
  isMneGroup?: boolean;
  taxEbitda?: number;
}
