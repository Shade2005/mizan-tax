// ============================================================================
// Mizan (ميزان) - Strict Tax Assessment Input DTOs
// Enforces type safety, non-negative amounts, and enumerated tax domains
// ============================================================================

import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export const VALID_LEGAL_ENTITY_TYPES = [
  'NATURAL_PERSON',
  'SOLE_ESTABLISHMENT',
  'LLC',
  'FREE_ZONE_ESTABLISHMENT',
  'FREE_ZONE_COMPANY',
  'BRANCH_OF_FOREIGN_COMPANY',
] as const;

export class AssessCorporateTaxDto {
  @ApiProperty({
    enum: VALID_LEGAL_ENTITY_TYPES,
    example: 'LLC',
    description: 'Statutory legal form under UAE Commercial Companies Law',
  })
  @IsIn(VALID_LEGAL_ENTITY_TYPES as any, {
    message: 'legalEntityType must be a recognized UAE entity type',
  })
  legalEntityType!: string;

  @ApiProperty({ example: 1820000, description: 'Annual turnover in AED' })
  @IsNumber({}, { message: 'revenueAED must be a valid numeric amount' })
  @Min(0, { message: 'revenueAED must not be negative' })
  revenueAED!: number;

  @ApiProperty({ example: 450000, description: 'Net accounting profit or loss in AED' })
  @IsNumber({}, { message: 'accountingNetProfit must be a valid number' })
  accountingNetProfit!: number;

  @ApiProperty({ example: true, required: false, description: 'Elect 0% Small Business Relief' })
  @IsOptional()
  @IsBoolean()
  isSmallBusinessReliefElected?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Qualifying Free Zone Person status' })
  @IsOptional()
  @IsBoolean()
  isQfzp?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Belongs to an MNE group (Art. 21)' })
  @IsOptional()
  @IsBoolean()
  isMneGroup?: boolean;

  @ApiProperty({ example: '2026-01-01', required: false })
  @IsOptional()
  @IsDateString()
  taxPeriodStart?: string;

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  taxPeriodEnd?: string;

  @ApiProperty({ example: [1500000, 1600000], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  priorPeriodRevenues?: number[];

  @ApiProperty({ example: 25000, required: false, description: 'Government fines/penalties to add back' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'nonDeductibleFines must not be negative' })
  nonDeductibleFines?: number;

  @ApiProperty({ example: 50000, required: false, description: 'Client entertainment (50% add-back under Art. 32)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'clientEntertainmentExpense must not be negative' })
  clientEntertainmentExpense?: number;

  @ApiProperty({ example: 0, required: false, description: 'Net interest expense for GIDLR evaluation' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'netInterestExpense must not be negative' })
  netInterestExpense?: number;

  @ApiProperty({ example: 500000, required: false, description: 'Tax EBITDA for interest capping' })
  @IsOptional()
  @IsNumber()
  taxEbitda?: number;

  @ApiProperty({ example: 0, required: false, description: 'Unutilized tax losses from prior years' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'unutilizedPriorTaxLosses must not be negative' })
  unutilizedPriorTaxLosses?: number;
}

export const VALID_VAT_CATEGORIES = [
  'STANDARD_5',
  'ZERO_RATED_0',
  'EXEMPT',
  'OUT_OF_SCOPE',
  'REVERSE_CHARGE',
] as const;

export class VatTransactionLineDto {
  @ApiProperty({ example: 'tx-101' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: true, description: 'true for output supplies (sales), false for inputs (purchases)' })
  @IsBoolean()
  isSale!: boolean;

  @ApiProperty({ example: 12500.5, description: 'Line amount in AED' })
  @IsNumber({}, { message: 'amountAED must be a valid number' })
  @Min(0, { message: 'amountAED must not be negative' })
  amountAED!: number;

  @ApiProperty({ enum: VALID_VAT_CATEGORIES, example: 'STANDARD_5' })
  @IsIn(VALID_VAT_CATEGORIES as any, {
    message: 'vatRateCategory must be one of STANDARD_5, ZERO_RATED_0, EXEMPT, OUT_OF_SCOPE, REVERSE_CHARGE',
  })
  vatRateCategory!: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isReverseChargeService?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isEntertainmentOrHospitality?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isEmployeeExpense?: boolean;

  @ApiProperty({ example: 'BUSINESS_TRAVEL_HOTEL', required: false })
  @IsOptional()
  @IsIn(['MANDATED_BY_LABOUR_LAW', 'CONTRACTUAL_DUTY_PERFORMANCE', 'BUSINESS_TRAVEL_HOTEL', 'PERSONAL_PERK_OR_BENEFIT'])
  employeeExpenseCategory?: string;

  @ApiProperty({ example: true, required: false, description: 'Has valid supplier Tax Invoice under Art. 59/65' })
  @IsOptional()
  @IsBoolean()
  hasValidTaxInvoice?: boolean;
}

export class AssessVatDto {
  @ApiProperty({ type: [VatTransactionLineDto] })
  @IsArray({ message: 'lines must be an array of transaction lines' })
  @ValidateNested({ each: true })
  @Type(() => VatTransactionLineDto)
  lines!: VatTransactionLineDto[];
}

export class AssessBusinessVatDto {
  @ApiProperty({ example: 'biz-1234567', description: 'Business ID to assess' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ example: '2026-Q1', description: 'Period identifier (e.g. 2026-Q1, 2026-M11, FY2026)' })
  @IsString()
  @IsNotEmpty()
  periodKey!: string;

  @ApiProperty({ example: '2026-01-01', description: 'Period start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2026-03-31', description: 'Period end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({ example: false, required: false, description: 'Whether to include review-required draft expenses' })
  @IsOptional()
  @IsBoolean()
  includeDraftExpenses?: boolean;
}

export class AssessBusinessCorporateTaxDto {
  @ApiProperty({ example: 'biz-1234567', description: 'Business ID to assess' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ example: 2026, description: 'Tax Financial Year' })
  @IsNumber()
  @Min(2023)
  financialYear!: number;

  @ApiProperty({ example: '2026-01-01', required: false, description: 'Period start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2026-12-31', required: false, description: 'Period end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: true, required: false, description: 'Elect 0% Small Business Relief under Art. 21 & MD 73/2023' })
  @IsOptional()
  @IsBoolean()
  electSmallBusinessRelief?: boolean;

  @ApiProperty({ example: [1800000, 2100000], required: false, description: 'Prior period revenues for SBR qualification check' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  priorPeriodRevenues?: number[];

  @ApiProperty({ example: 0, required: false, description: 'Prior period unutilized tax losses for Art. 39 75% offset' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unutilizedPriorTaxLosses?: number;

  @ApiProperty({ example: false, required: false, description: 'Qualifying Free Zone Person (QFZP 0% on Qualifying Income)' })
  @IsOptional()
  @IsBoolean()
  isQfzpClaimed?: boolean;

  @ApiProperty({ example: false, required: false, description: 'Member of Multinational Enterprise Group' })
  @IsOptional()
  @IsBoolean()
  isMneGroup?: boolean;

  @ApiProperty({ example: 500000, required: false, description: 'Tax EBITDA for interest limitation (Art. 30 GIDLR)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxEbitda?: number;
}

export const VALID_ASSESSMENT_STATUSES = [
  'DRAFT',
  'REQUIRES_ATTENTION',
  'READY_FOR_REVIEW',
  'REVIEWED',
  'FINALISED',
  'SUPERSEDED',
] as const;

export class UpdateAssessmentStatusDto {
  @ApiProperty({ enum: VALID_ASSESSMENT_STATUSES, example: 'REVIEWED' })
  @IsIn(VALID_ASSESSMENT_STATUSES as any)
  status!: string;

  @ApiProperty({ example: 'Reviewed and confirmed with external auditor', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExplainAssessmentDto {
  @ApiProperty({ example: 'Why is my VAT liability AED 14,320 and why was entertainment VAT blocked?' })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({ example: 'en', required: false, enum: ['en', 'ar'] })
  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';
}

