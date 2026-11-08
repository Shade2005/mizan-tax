// ============================================================================
// Mizan (ميزان) - Business Intelligence Dashboard Controller
// Validated, tenant-isolated endpoints for executive metrics, readiness & deadlines
// ============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ReadinessService } from './readiness.service';
import { TaxCalendarService } from './tax-calendar.service';
import { ComplianceActionService } from './compliance-action.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

@ApiTags('Business Intelligence & Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
    @Inject(ReadinessService) private readonly readinessService: ReadinessService,
    @Inject(TaxCalendarService) private readonly taxCalendarService: TaxCalendarService,
    @Inject(ComplianceActionService) private readonly complianceActionService: ComplianceActionService
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Retrieve unified business intelligence dashboard metrics' })
  @ApiQuery({ name: 'businessId', required: true })
  @ApiResponse({ status: 200, description: 'Aggregated financial metrics, tax positions, readiness and deadlines.' })
  public async getOverview(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    return this.dashboardService.getDashboardOverview(businessId, user.organisationId);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Retrieve UAE statutory tax calendar deadlines' })
  @ApiQuery({ name: 'businessId', required: true })
  public async getCalendarDeadlines(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    // Verify business belongs to tenant first
    await this.dashboardService.getDashboardOverview(businessId, user.organisationId);
    return this.taxCalendarService.getBusinessTaxDeadlines(businessId);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Generate detailed multi-category UAE Tax Readiness assessment' })
  @ApiQuery({ name: 'businessId', required: true })
  public async getTaxReadiness(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    await this.dashboardService.getDashboardOverview(businessId, user.organisationId);
    return this.readinessService.evaluateReadiness(businessId, true);
  }

  @Get('readiness/history')
  @ApiOperation({ summary: 'Retrieve historical readiness snapshots' })
  @ApiQuery({ name: 'businessId', required: true })
  public async getReadinessHistory(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    await this.dashboardService.getDashboardOverview(businessId, user.organisationId);
    return this.readinessService.getHistoricalSnapshots(businessId);
  }

  @Get('compliance-actions')
  @ApiOperation({ summary: 'Retrieve deduplicated compliance findings and action items' })
  @ApiQuery({ name: 'businessId', required: true })
  public async getComplianceActions(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    await this.dashboardService.getDashboardOverview(businessId, user.organisationId);
    return this.complianceActionService.getActiveFindings(businessId);
  }

  @Post('compliance-actions/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a compliance obligation or action item' })
  public async resolveAction(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body('resolutionNotes') resolutionNotes: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    return this.complianceActionService.resolveObligation(
      id,
      businessId,
      user.organisationId,
      user.userId,
      resolutionNotes
    );
  }
}
