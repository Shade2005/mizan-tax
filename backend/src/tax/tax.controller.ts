// ============================================================================
// Mizan (ميزان) - Tax Intelligence Controller
// Validated, Authenticated Endpoints for Deterministic Corporate Tax & VAT Assessment
// Full-Stack Real Persistent Assessments, Compliance Audits & Grounded AI
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import {
  AssessCorporateTaxDto,
  AssessVatDto,
  AssessBusinessVatDto,
  AssessBusinessCorporateTaxDto,
  UpdateAssessmentStatusDto,
  ExplainAssessmentDto,
} from './dto/assess-tax.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';
import { AssessmentStatusEnum } from './tax.types';

@ApiTags('Tax Intelligence')
@ApiBearerAuth()
@Controller('api/v1/tax')
export class TaxController {
  constructor(@Inject(TaxService) private readonly taxService: TaxService) {}

  // ============================================================================
  // PERSISTENT VAT ASSESSMENTS (PHASE 6.6)
  // ============================================================================

  @Post('vat/assess-business')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate deterministic VAT 201 Return assessment from real business invoices & expenses',
  })
  @ApiResponse({ status: 200, description: 'Statutory VAT 201 boxes, recoverability, and compliance findings.' })
  @ApiResponse({ status: 400, description: 'Validation failed: Invalid dates or period parameters.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requesting user does not own the business.' })
  async assessBusinessVat(
    @Body() dto: AssessBusinessVatDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.assessBusinessVat(dto, user.organisationId);
  }

  // ============================================================================
  // PERSISTENT CORPORATE TAX ASSESSMENTS (PHASE 6.6)
  // ============================================================================

  @Post('corporate/assess-business')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate deterministic Corporate Tax assessment from real business bookkeeping records',
  })
  @ApiResponse({ status: 200, description: 'Taxable income, 50% entertainment add-back, SBR, and CT liability.' })
  @ApiResponse({ status: 400, description: 'Validation failed: Invalid financial year.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requesting user does not own the business.' })
  async assessBusinessCorporateTax(
    @Body() dto: AssessBusinessCorporateTaxDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.assessBusinessCorporateTax(dto, user.organisationId);
  }

  // ============================================================================
  // ASSESSMENT HISTORY & LIFECYCLE MANAGEMENT
  // ============================================================================

  @Get('assessments')
  @ApiOperation({ summary: 'List historical tax assessments for the active business' })
  @ApiQuery({ name: 'businessId', required: true })
  @ApiQuery({ name: 'taxType', required: false, enum: ['VAT', 'CORPORATE_TAX'] })
  async listAssessments(
    @Query('businessId') businessId: string,
    @Query('taxType') taxType: 'VAT' | 'CORPORATE_TAX' | undefined,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.listBusinessAssessments(businessId, user.organisationId, taxType);
  }

  @Get('assessments/:id')
  @ApiOperation({ summary: 'Get full assessment details, calculation breakdowns, and compliance findings' })
  async getAssessmentById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.getAssessmentById(id, user.organisationId);
  }

  @Patch('assessments/:id/status')
  @ApiOperation({ summary: 'Update assessment review status and notes' })
  async updateAssessmentStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.updateAssessmentStatus(
      id,
      dto.status as AssessmentStatusEnum,
      dto.notes,
      user.organisationId
    );
  }

  @Post('assessments/:id/reassess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reassess a tax period, marking the previous assessment as SUPERSEDED' })
  async reassess(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.reassess(id, user.organisationId);
  }

  @Get('assessments/:id/legal-references')
  @ApiOperation({ summary: 'Get authoritative statutory legal citations for this assessment' })
  async getLegalReferences(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.getAssessmentLegalReferences(id, user.organisationId);
  }

  @Post('assessments/:id/explain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask grounded AI questions about this specific assessment' })
  async explainWithAi(
    @Param('id') id: string,
    @Body() dto: ExplainAssessmentDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.explainAssessmentWithAi(
      id,
      dto.question,
      dto.language || 'en',
      user.organisationId
    );
  }

  // ============================================================================
  // STATELESS ENGINE ENDPOINTS (BACKWARD COMPATIBLE)
  // ============================================================================

  @Post('corporate/assess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run deterministic UAE Corporate Tax calculation on raw payload' })
  async assessCorporateTax(
    @Body() payload: AssessCorporateTaxDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.calculateCorporateTax(payload);
  }

  @Post('vat/assess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate statutory VAT Return 201 boxes on raw transaction lines' })
  async assessVat(
    @Body() payload: AssessVatDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.taxService.calculateVat201(payload.lines);
  }
}
