// ============================================================================
// Mizan (ميزان) - Invoicing & Tax Compliance Controller
// Authenticated Multi-Tenant Endpoints for Invoices, Customers, Payments & PDF
// ============================================================================

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicingService } from './invoicing.service';
import {
  CalculateInvoiceDto,
  ClassifyExpenseDto,
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateInvoiceDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/invoicing.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.interface';

@ApiTags('Invoicing & Tax Compliance')
@ApiBearerAuth()
@Controller('api/v1/invoicing')
export class InvoicingController {
  constructor(@Inject(InvoicingService) private readonly invoicingService: InvoicingService) {}

  // ==========================================================================
  // CUSTOMER MANAGEMENT
  // ==========================================================================

  @Get('customers')
  @ApiOperation({ summary: 'List customer records for active business' })
  async getCustomers(
    @Query('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.getCustomers(businessId, user.organisationId);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create new customer record' })
  async createCustomer(
    @Query('businessId') businessId: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.createCustomer(dto, businessId, user.organisationId);
  }

  // ==========================================================================
  // INVOICE LIFECYCLE
  // ==========================================================================

  @Post('invoices')
  @ApiOperation({ summary: 'Create new draft invoice with deterministic calculations' })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.createDraftInvoice(dto, user.organisationId, user.userId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices for a business entity' })
  async getInvoices(
    @Query('businessId') businessId: string,
    @Query('status') status: string | undefined,
    @Query('search') search: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.getInvoices(businessId, user.organisationId, { status, search });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single invoice details and line items' })
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.getInvoiceById(id, user.organisationId);
  }

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Update draft invoice' })
  async updateDraftInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.updateDraftInvoice(id, dto, user.organisationId);
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Delete a draft invoice (issued invoices cannot be deleted)' })
  async deleteInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.deleteInvoice(id, user.organisationId);
  }

  @Post('invoices/:id/issue')
  @ApiOperation({ summary: 'Issue invoice with sequential number, Art. 59 compliance check & immutability lock' })
  async issueInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.issueInvoice(id, user.organisationId, user.userId);
  }

  @Post('invoices/:id/pay')
  @ApiOperation({ summary: 'Record payment against an invoice (partial or full)' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.recordPayment(id, dto, user.organisationId);
  }

  @Post('invoices/:id/refund')
  @ApiOperation({ summary: 'Refund or reverse a previously recorded payment' })
  async refundPayment(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.refundPayment(id, amount, reason || 'Customer refund', user.organisationId);
  }

  @Post('invoices/:id/void')
  @ApiOperation({ summary: 'Void an invoice where legally appropriate' })
  async voidInvoice(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.voidInvoice(id, reason || 'Voided by user', user.organisationId);
  }

  @Post('invoices/:id/credit-note')
  @ApiOperation({ summary: 'Issue a legally linked Tax Credit Note under Article 60' })
  async createCreditNote(
    @Param('id') id: string,
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.createCreditNote(id, dto, user.organisationId, user.userId);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Generate print-ready HTML/PDF with SHA-256 integrity checksum' })
  async getInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.getInvoicePdfHtml(id, user.organisationId);
  }

  // ==========================================================================
  // BACKWARD-COMPATIBLE UTILITY ENDPOINTS
  // ==========================================================================

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate Tax Invoice with CBUAE FX rates (Art. 69)' })
  calculateInvoice(
    @Body() dto: CalculateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.calculateTaxInvoice(dto);
  }

  @Post('expenses/classify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Classify expense under Decision No. 17 of 2026 & Art. 53' })
  classifyExpense(
    @Body() dto: ClassifyExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicingService.classifyExpenseReceipt(dto);
  }
}
