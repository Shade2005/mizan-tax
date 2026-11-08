// ============================================================================
// Mizan (ميزان) - Update Business DTO
// Type-safe updates to existing business profiles within tenant boundary
// ============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { LegalEntityTypeDto, JurisdictionTypeDto } from './create-trade-license.dto';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ description: 'Business Legal Name (English)', example: 'Al Nahda Trading LLC' })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Business Trade Name', example: 'Al Nahda' })
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiPropertyOptional({ enum: LegalEntityTypeDto })
  @IsEnum(LegalEntityTypeDto)
  @IsOptional()
  legalEntityType?: LegalEntityTypeDto;

  @ApiPropertyOptional({ enum: JurisdictionTypeDto })
  @IsEnum(JurisdictionTypeDto)
  @IsOptional()
  jurisdictionType?: JurisdictionTypeDto;

  @ApiPropertyOptional({ description: 'Issuing Authority (DET Dubai, ADGM, DMCC, etc.)', example: 'DET Dubai' })
  @IsString()
  @IsOptional()
  licensingAuthority?: string;

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
  @Min(0)
  @IsOptional()
  annualRevenueEstimateAED?: number;

  @ApiPropertyOptional({ description: 'VAT TRN (15 digits)', example: '100234567800003' })
  @IsString()
  @IsOptional()
  vatTrn?: string;

  @ApiPropertyOptional({ description: 'Corporate Tax Registration Number', example: 'CT-1002345678' })
  @IsString()
  @IsOptional()
  corporateTaxTrn?: string;

  @ApiPropertyOptional({ description: 'Registered business address', example: 'Office 402, Business Bay, Dubai' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Licensed business activities', example: ['General Trading', 'Import & Export'] })
  @IsArray()
  @IsOptional()
  businessActivities?: string[];

  @ApiPropertyOptional({ description: 'Verification status', example: 'MANUALLY_ENTERED' })
  @IsString()
  @IsOptional()
  verificationStatus?: string;
}
