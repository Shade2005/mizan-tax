import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InvoicingService } from './invoicing.service';

@ApiTags('Invoicing & Expense Classification')
@Controller('api/v1/invoicing')
export class InvoicingController {
  constructor(@Inject(InvoicingService) private readonly invoicingService: InvoicingService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate Tax Invoice with CBUAE FX rates (Art. 69)' })
  calculateInvoice(@Body() dto: { currency: string; subtotal: number; vatRatePct?: number }) {
    return this.invoicingService.calculateTaxInvoice(dto);
  }

  @Post('expenses/classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Classify expense under Decision No. 17 of 2026 & Art. 53' })
  classifyExpense(
    @Body()
    dto: {
      merchantName: string;
      supplierTrn?: string;
      amountAED: number;
      category: 'DUTY_TRAVEL' | 'CLIENT_ENTERTAINMENT' | 'REVERSE_CHARGE_SAAS';
    }
  ) {
    return this.invoicingService.classifyExpenseReceipt(dto);
  }
}
