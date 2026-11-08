// ============================================================================
// Mizan (ميزان) - Business & Trade License Controller
// Authenticated Multi-Tenant Endpoints for Entity Ingestion, Management & EmaraTax
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { CreateTradeLicenseDto } from './dto/create-trade-license.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { TaxReadinessResponseDto } from './dto/tax-readiness-response.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

@ApiTags('Businesses & Trade Licenses')
@ApiBearerAuth()
@Controller('api/v1/businesses')
export class BusinessController {
  constructor(@Inject(BusinessService) private readonly businessService: BusinessService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new business entity for the authenticated organisation' })
  @ApiResponse({
    status: 201,
    description: 'Business entity created within authenticated organisation boundary.',
  })
  async createBusiness(
    @Body() dto: CreateTradeLicenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.businessService.createOrUpdateTradeLicense(dto, user.organisationId);
  }

  @Post('trade-license')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save scanned or verified UAE Trade License details (legacy route)' })
  @ApiResponse({
    status: 201,
    description: 'Trade license saved within authenticated organisation boundary.',
  })
  async saveTradeLicense(
    @Body() dto: CreateTradeLicenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.businessService.createOrUpdateTradeLicense(dto, user.organisationId);
  }

  @Get()
  @ApiOperation({ summary: 'List registered businesses scoped strictly to user organisation' })
  @ApiResponse({ status: 200, description: 'List of business entities accessible by user organisation.' })
  async listBusinesses(@CurrentUser() user: AuthenticatedUser) {
    return this.businessService.listBusinesses(user.organisationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business details by ID or trade license number' })
  @ApiResponse({ status: 200, description: 'Business details.' })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async getBusiness(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.businessService.getBusinessById(id, user.organisationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update business profile details' })
  @ApiResponse({ status: 200, description: 'Updated business profile.' })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden.' })
  @ApiResponse({ status: 404, description: 'Business not found.' })
  async updateBusiness(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.businessService.updateBusiness(id, dto, user.organisationId);
  }

  @Get(':licenseNumber/readiness')
  @ApiOperation({
    summary: 'Evaluate EmaraTax Readiness & Tax Posture for user organisation',
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
    @CurrentUser() user: AuthenticatedUser,
    @Query('revenue') revenue?: number
  ): Promise<TaxReadinessResponseDto> {
    const rev = revenue ? Number(revenue) : 1200000;
    return this.businessService.assessTaxReadiness(licenseNumber, rev, user.organisationId);
  }
}
