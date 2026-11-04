// ============================================================================
// Mizan (ميزان) - EmaraTax Readiness Response DTO
// Structured payload for Screens 4 & 5 (Tax Readiness & Assessment Report)
// ============================================================================

import { ApiProperty } from '@nestjs/swagger';

export class CorporateTaxReadinessDto {
  @ApiProperty({ type: Boolean, example: true })
  isApplicable: boolean;

  @ApiProperty({ type: String, example: 'Likely Applicable' })
  statusBadge: string;

  @ApiProperty({ type: String, example: 'SBR Eligible (0%)' })
  reliefStatus: string;

  @ApiProperty({ type: Number, example: 0 })
  estimatedLiabilityAED: number;

  @ApiProperty({ type: String, example: '2024-07-31' })
  statutoryRegistrationDeadline: string;

  @ApiProperty({ type: Number, example: 10000 })
  penaltyRiskAmountAED: number;

  @ApiProperty({ type: String, example: 'FTA Decision No. 3 of 2024' })
  legalReference: string;
}

export class VatReadinessDto {
  @ApiProperty({ type: Boolean, example: true })
  isRegistrationRequired: boolean;

  @ApiProperty({ type: String, example: 'Registration Required' })
  statusBadge: string;

  @ApiProperty({ type: Number, example: 1200000 })
  annualTaxableTurnoverAED: number;

  @ApiProperty({ type: Number, example: 375000 })
  mandatoryThresholdAED: number;

  @ApiProperty({ type: Number, example: 8500 })
  estimatedNetVatPayableAED: number;

  @ApiProperty({ type: String, example: 'Federal Decree-Law No. 8 of 2017' })
  legalReference: string;
}

export class ComplianceItemDto {
  @ApiProperty({ type: String, example: 'ct_registration' })
  id: string;

  @ApiProperty({ type: String, example: 'Submit Corporate Tax Registration on EmaraTax' })
  title: string;

  @ApiProperty({ type: String, example: 'PENDING' })
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';

  @ApiProperty({ type: String, example: '31 July 2024' })
  dueDate: string;

  @ApiProperty({ type: Number, example: 10000, required: false })
  potentialPenaltyAED?: number;
}

export class TaxReadinessResponseDto {
  @ApiProperty({ type: String, example: 'biz-123' })
  businessId: string;

  @ApiProperty({ type: String, example: 'Al Nahda Trading LLC' })
  legalName: string;

  @ApiProperty({ type: String, example: '1234567' })
  tradeLicenseNumber: string;

  @ApiProperty({ type: String, example: 'LIKELY_COMPLIANT' })
  overallStatus: 'LIKELY_COMPLIANT' | 'ACTION_REQUIRED' | 'HIGH_RISK';

  @ApiProperty({ type: String, example: 'You appear to be under the standard UAE tax regime with no immediate risks.' })
  summaryMessage: string;

  @ApiProperty({ type: () => CorporateTaxReadinessDto })
  corporateTax: CorporateTaxReadinessDto;

  @ApiProperty({ type: () => VatReadinessDto })
  vat: VatReadinessDto;

  @ApiProperty({ type: () => [ComplianceItemDto] })
  complianceChecklist: ComplianceItemDto[];

  @ApiProperty({ type: String, example: '2026.1-MZN' })
  engineVersion: string;

  @ApiProperty({ type: String, example: '2026-11-04T16:00:00.000Z' })
  assessedAt: string;
}
