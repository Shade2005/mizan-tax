// ============================================================================
// Mizan (ميزان) - Create Trade License DTO
// Type-safe ingestion of scanned and verified UAE Trade Licenses
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';

export enum LegalEntityTypeDto {
  NATURAL_PERSON = 'NATURAL_PERSON',
  SOLE_ESTABLISHMENT = 'SOLE_ESTABLISHMENT',
  LLC = 'LLC',
  FREE_ZONE_ESTABLISHMENT = 'FREE_ZONE_ESTABLISHMENT',
  FREE_ZONE_COMPANY = 'FREE_ZONE_COMPANY',
  BRANCH_OF_FOREIGN_COMPANY = 'BRANCH_OF_FOREIGN_COMPANY',
}

export enum JurisdictionTypeDto {
  MAINLAND = 'MAINLAND',
  FREE_ZONE = 'FREE_ZONE',
  DESIGNATED_FREE_ZONE = 'DESIGNATED_FREE_ZONE',
}

export class CreateTradeLicenseDto {
  @ApiProperty({ description: 'Parent organization ID', example: 'org-123' })
  @IsString()
  @IsNotEmpty()
  organisationId: string;

  @ApiProperty({ description: 'Official UAE Trade License number', example: '1234567' })
  @IsString()
  @IsNotEmpty()
  tradeLicenseNumber: string;

  @ApiProperty({ description: 'Business Legal Name (English)', example: 'Al Nahda Trading LLC' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiPropertyOptional({ description: 'Business Trade Name', example: 'Al Nahda' })
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiProperty({ enum: LegalEntityTypeDto, example: LegalEntityTypeDto.LLC })
  @IsEnum(LegalEntityTypeDto)
  legalEntityType: LegalEntityTypeDto;

  @ApiProperty({ enum: JurisdictionTypeDto, example: JurisdictionTypeDto.MAINLAND })
  @IsEnum(JurisdictionTypeDto)
  jurisdictionType: JurisdictionTypeDto;

  @ApiProperty({ description: 'Issuing Authority (DET Dubai, ADGM, DMCC, etc.)', example: 'DET Dubai' })
  @IsString()
  @IsNotEmpty()
  licensingAuthority: string;

  @ApiPropertyOptional({ description: 'Emirate of incorporation', example: 'Dubai' })
  @IsString()
  @IsOptional()
  emirate?: string;

  @ApiPropertyOptional({ description: 'License Issue Date (ISO string)', example: '2024-05-15' })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'License Expiry Date (ISO string)', example: '2027-05-14' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Estimated annual business revenue in AED', example: 1200000 })
  @IsNumber()
  @IsOptional()
  annualRevenueEstimateAED?: number;

  @ApiPropertyOptional({ description: 'Licensed business activities', example: ['General Trading', 'Import & Export'] })
  @IsArray()
  @IsOptional()
  businessActivities?: string[];
}
