import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaxService } from './tax.service';

@ApiTags('Tax Intelligence')
@Controller('api/v1/tax')
export class TaxController {
  constructor(@Inject(TaxService) private readonly taxService: TaxService) {}

  @Post('corporate/assess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run deterministic UAE Corporate Tax assessment' })
  async assessCorporateTax(@Body() payload: any) {
    return this.taxService.calculateCorporateTax(payload);
  }

  @Post('vat/assess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate statutory VAT Return 201 boxes & RCM' })
  async assessVat(@Body() payload: { lines: any[] }) {
    return this.taxService.calculateVat201(payload.lines);
  }
}
