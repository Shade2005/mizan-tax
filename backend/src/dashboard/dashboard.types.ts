// ============================================================================
// Mizan (ميزان) - Phase 6.7: Dashboard, Readiness, Compliance & Reports Types
// Authoritative TypeScript interfaces & DTOs for unified business intelligence
// ============================================================================

import { ReportType, ReportFormat, ReportStatus, ObligationType, ObligationStatus } from '@prisma/client';

export { ReportType, ReportFormat, ReportStatus, ObligationType, ObligationStatus };

export interface FinancialMetricSummary {
  totalRevenueAED: string;
  totalExpensesAED: string;
  netAccountingProfitAED: string;
  totalReceivablesAED: string;      // Unpaid customer invoices
  totalPayablesAED: string;         // Unpaid supplier bills / expenses
  currency: string;                 // Always "AED"
  invoiceCount: number;
  expenseCount: number;
}

export interface TaxOverviewSummary {
  latestVatAssessment: {
    id: string;
    periodKey: string;
    periodStart: string;
    periodEnd: string;
    netVatPayableAED: string;
    status: string;
    dueDate: string;
    isRefundable: boolean;
  } | null;
  latestCorporateTaxAssessment: {
    id: string;
    taxYear: number;
    accountingProfitAED: string;
    taxableIncomeAED: string;
    corporateTaxDueAED: string;
    smallBusinessReliefApplied: boolean;
    status: string;
    dueDate: string;
  } | null;
}

export interface CalendarDeadlineDto {
  id: string;
  obligationType: string;
  title: string;
  description: string;
  legalReference: string;
  calculatedDueDate: string;
  daysRemaining: number;
  status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  potentialPenaltyAED: string;
  actionRequired: string;
}

export interface ComplianceFindingDto {
  id: string;
  findingKey: string;             // Unique deduplication key e.g. "OVERDUE_VAT_Q1"
  category: 'VAT' | 'CORPORATE_TAX' | 'BOOKKEEPING' | 'PROFILE' | 'DEADLINE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  statutoryReference: string;
  potentialPenaltyAED?: string;
  impactScore: number;            // Points deducted from readiness
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  actionRoute?: string;           // Mobile navigation deep link
  actionLabel?: string;
  createdAt: string;
}

export interface CategoryReadinessDto {
  category: 'PROFILE' | 'VAT' | 'CORPORATE_TAX' | 'BOOKKEEPING' | 'COMPLIANCE';
  name: string;
  weightPercentage: number;
  score: number;                  // 0 - 100
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  passedChecks: number;
  totalChecks: number;
  details: {
    criterion: string;
    passed: boolean;
    points: number;
    maxPoints: number;
    explanation: string;
    statutoryRef?: string;
  }[];
}

export interface TaxReadinessResultDto {
  overallScore: number;           // 0 - 100 weighted
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  isAuditReady: boolean;
  categories: CategoryReadinessDto[];
  criticalBlockers: string[];
  missingItems: string[];
  actionableSteps: string[];
  disclaimer: string;
  evaluatedAt: string;
  snapshotId?: string;
}

export interface DashboardOverviewDto {
  business: {
    id: string;
    legalName: string;
    tradeName?: string;
    tradeLicenseNumber: string;
    entityType: string;
    isVatRegistered: boolean;
    vatTrn?: string;
    isCtRegistered: boolean;
    ctTrn?: string;
    fiscalYearEnd: string;
  };
  financials: FinancialMetricSummary;
  tax: TaxOverviewSummary;
  readiness: {
    overallScore: number;
    healthGrade: string;
    status: string;
    criticalBlockerCount: number;
  };
  upcomingDeadlines: CalendarDeadlineDto[];
  topComplianceActions: ComplianceFindingDto[];
}

export interface GenerateReportRequestDto {
  businessId: string;
  reportType: ReportType;
  format?: ReportFormat;
  periodStart?: string;
  periodEnd?: string;
  taxYear?: number;
  title?: string;
}

export interface GeneratedReportSummaryDto {
  id: string;
  businessId: string;
  reportType: ReportType;
  format: ReportFormat;
  title: string;
  periodStart?: string;
  periodEnd?: string;
  status: ReportStatus;
  fileUrl?: string;
  fileSizeBytes?: number;
  summaryMetrics?: any;
  generatedAt: string;
}
