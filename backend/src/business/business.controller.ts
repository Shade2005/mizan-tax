// ============================================================================
// Mizan (ميزان) - Business & Trade License Controller
// Endpoints for Trade License Ingestion & EmaraTax Readiness Assessment
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateTradeLicenseDto } from './dto/create-trade-license.dto';
import { TaxReadinessResponseDto } from './dto/tax-readiness-response.dto';

@ApiTags('Businesses & Trade Licenses')
@Controller('api/v1/businesses')
export class BusinessController {
  constructor(@Inject(BusinessService) private readonly businessService: BusinessService) {}

  @Post('trade-license')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save scanned or verified UAE Trade License details' })
  @ApiResponse({
    status: 201,
    description: 'Trade license saved and compliance schedule generated.',
  })
  async saveTradeLicense(@Body() dto: CreateTradeLicenseDto) {
    return this.businessService.createOrUpdateTradeLicense(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered businesses for multi-entity switching' })
  async listBusinesses() {
    return this.businessService.listBusinesses();
  }

  @Get(':licenseNumber/readiness')
  @ApiOperation({
    summary: 'Evaluate EmaraTax Readiness & Tax Posture (Powers Screens 4 & 5)',
  })
  @ApiQuery({
    name: 'revenue',
    required: false,
    description: 'Estimated annual turnover in AED',
    example: 1200000,
  })
  @ApiResponse({
    status: 200,
    description: 'EmaraTax Readiness Assessment with CT, VAT, and deadlines.',
    type: TaxReadinessResponseDto,
  })
  async getTaxReadiness(
    @Param('licenseNumber') licenseNumber: string,
    @Query('revenue') revenue?: number
  ): Promise<TaxReadinessResponseDto> {
    const rev = revenue ? Number(revenue) : 1200000;
    return this.businessService.assessTaxReadiness(licenseNumber, rev);
  }
}
