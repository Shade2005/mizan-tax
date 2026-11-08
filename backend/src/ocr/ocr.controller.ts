// ============================================================================
// Mizan (ميزان) - OCR Ingestion Controller
// Authenticated endpoints for Trade License & Receipt document ingestion
// ============================================================================

import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OcrService } from './ocr.service';
import { ExtractTradeLicenseDto, ExtractReceiptDto } from './ocr.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

@ApiTags('OCR & Document Recognition')
@ApiBearerAuth()
@Controller('api/v1/ocr')
export class OcrController {
  constructor(@Inject(OcrService) private readonly ocrService: OcrService) {}

  @Post('trade-license')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Securely extract UAE trade license via server-side vision' })
  extractTradeLicense(
    @Body() dto: ExtractTradeLicenseDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.ocrService.extractTradeLicense(dto, user.organisationId);
  }

  @Post('receipt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Securely extract tax receipt via server-side vision' })
  extractReceipt(
    @Body() dto: ExtractReceiptDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.ocrService.extractReceipt(dto, user.organisationId);
  }
}
