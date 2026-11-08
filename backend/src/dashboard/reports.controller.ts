// ============================================================================
// Mizan (ميزان) - Tax & Financial Reports Controller
// Validated, tenant-isolated endpoints for P&L, VAT 201, CT reports & PDF/CSV export
// ============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';
import { GenerateReportRequestDto } from './dashboard.types';

@ApiTags('Tax & Financial Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a persistent financial or tax report' })
  @ApiResponse({ status: 200, description: 'Generated report metadata and rendered content.' })
  public async generateReport(
    @Body() dto: GenerateReportRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!dto.businessId) {
      throw new BadRequestException('Field "businessId" is required.');
    }
    if (!dto.reportType) {
      throw new BadRequestException('Field "reportType" is required.');
    }
    return this.reportsService.generateReport(dto, user.organisationId, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List generated reports for a business' })
  @ApiQuery({ name: 'businessId', required: true })
  public async listReports(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    if (!businessId) {
      throw new BadRequestException('Query parameter "businessId" is required.');
    }
    return this.reportsService.listBusinessReports(businessId, user.organisationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve report metadata and metrics by ID' })
  public async getReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.reportsService.getReportById(id, user.organisationId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export or download report content in CSV or HTML format' })
  public async exportReport(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response
  ) {
    const report = await this.reportsService.getReportById(id, user.organisationId);
    // Re-generate content for direct download
    const result = await this.reportsService.generateReport(
      {
        businessId: report.businessId,
        reportType: report.reportType,
        format: report.format,
        periodStart: report.periodStart?.toISOString(),
        periodEnd: report.periodEnd?.toISOString(),
        title: report.title,
      },
      user.organisationId,
      user.userId
    );

    const filename = `${report.reportType.toLowerCase()}_${report.id.slice(0, 8)}.${report.format === 'CSV' ? 'csv' : 'html'}`;

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.content);
  }
}
