// ============================================================================
// Mizan (ميزان) - Create Trade License DTO
// Type-safe ingestion of scanned and verified UAE Trade Licenses
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

export function normalizeDateToISO(raw: any): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return undefined;
}

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
  @ApiPropertyOptional({ description: 'Parent organization ID (auto-populated by server)', example: 'org-123' })
  @IsString()
  @IsOptional()
  organisationId?: string;

  @ApiProperty({ description: 'Official UAE Trade License number', example: '1234567' })
  @IsString()
  @IsNotEmpty({ message: 'tradeLicenseNumber is required' })
  tradeLicenseNumber!: string;

  @ApiProperty({ description: 'Business Legal Name (English)', example: 'Al Nahda Trading LLC' })
  @IsString()
  @IsNotEmpty({ message: 'legalName is required' })
  legalName!: string;

  @ApiPropertyOptional({ description: 'Business Trade Name', example: 'Al Nahda' })
  @IsString()
  @IsOptional()
  tradeName?: string;

  @ApiProperty({ enum: LegalEntityTypeDto, example: LegalEntityTypeDto.LLC })
  @IsEnum(LegalEntityTypeDto)
  legalEntityType!: LegalEntityTypeDto;

  @ApiProperty({ enum: JurisdictionTypeDto, example: JurisdictionTypeDto.MAINLAND })
  @IsEnum(JurisdictionTypeDto)
  jurisdictionType!: JurisdictionTypeDto;

  @ApiProperty({ description: 'Issuing Authority (DET Dubai, ADGM, DMCC, etc.)', example: 'DET Dubai' })
  @IsString()
  @IsNotEmpty({ message: 'licensingAuthority is required' })
  licensingAuthority!: string;

  @ApiPropertyOptional({ description: 'Emirate of incorporation', example: 'Dubai' })
  @IsString()
  @IsOptional()
  emirate?: string;

  @ApiPropertyOptional({ description: 'License Issue Date (ISO string)', example: '2024-05-15' })
  @Transform(({ value }) => normalizeDateToISO(value))
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiPropertyOptional({ description: 'License Expiry Date (ISO string)', example: '2027-05-14' })
  @Transform(({ value }) => normalizeDateToISO(value))
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

  @ApiPropertyOptional({ description: 'Verification status', example: 'OCR_EXTRACTED' })
  @IsString()
  @IsOptional()
  verificationStatus?: string;
}
