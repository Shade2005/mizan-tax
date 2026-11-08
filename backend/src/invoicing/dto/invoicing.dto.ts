// ============================================================================
// Mizan (ميزان) - Invoicing DTOs
// Strict validation for Customer Creation, Invoice Drafting, Line Items & Credit Notes
// ============================================================================

import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerType, VatTreatment } from '../invoice.types';

export class InvoiceLineDto {
  @ApiProperty({ example: 'Consulting Services (Tax Compliance)' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'Corporate Tax Advisory', required: false })
  @IsOptional()
  @IsString()
  itemName?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty({ example: 'hours', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({
    enum: ['STANDARD_5', 'ZERO_RATED_0', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE'],
    example: 'STANDARD_5',
  })
  @IsIn(['STANDARD_5', 'ZERO_RATED_0', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE'])
  vatTreatment!: VatTreatment;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'Al Noor Trading LLC' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Al Noor Trading LLC', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({
    enum: ['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'FOREIGN_ENTITY'],
    example: 'CORPORATE',
  })
  @IsIn(['INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'FOREIGN_ENTITY'])
  customerType!: CustomerType;

  @ApiProperty({ example: '100567894300003', required: false })
  @IsOptional()
  @IsString()
  trn?: string;

  @ApiProperty({ example: 'billing@alnoor.ae', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '+971 4 123 4567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Downtown Dubai, Boulevard Plaza, Tower 1' })
  @IsString()
  @IsNotEmpty()
  billingAddress!: string;

  @ApiProperty({ example: 'Dubai', required: false })
  @IsOptional()
  @IsString()
  emirate?: string;

  @ApiProperty({ example: 'United Arab Emirates', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  isFreeZone?: boolean;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'biz-123' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ example: 'cust-456' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: '2026-11-06' })
  @IsString()
  @IsNotEmpty()
  issueDate!: string;

  @ApiProperty({ example: '2026-11-06', required: false })
  @IsOptional()
  @IsString()
  supplyDate?: string;

  @ApiProperty({ example: '2026-11-20' })
  @IsString()
  @IsNotEmpty()
  dueDate!: string;

  @ApiProperty({ example: 'AED', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  exchangeRate?: number;

  @ApiProperty({ example: 'Net 14 Days', required: false })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ example: 'PO-98765', required: false })
  @IsOptional()
  @IsString()
  purchaseOrderReference?: string;

  @ApiProperty({ example: 'Monthly consulting retainer', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 'Payment due upon receipt', required: false })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiProperty({ example: 'TAX_INVOICE', required: false, description: 'Voluntarily request Full Tax Invoice under Art. 59(1) where simplified is permitted' })
  @IsOptional()
  @IsString()
  preferredInvoiceType?: 'TAX_INVOICE' | 'SIMPLIFIED_TAX_INVOICE';

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines!: InvoiceLineDto[];
}

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplyDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiProperty({ type: [InvoiceLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];
}

export class RecordPaymentDto {
  @ApiProperty({ example: 5250 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-11-06', required: false })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiProperty({ example: 'BANK_TRANSFER', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: 'TXN-9823471', required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ example: 'Payment received via Emirates NBD', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCreditNoteDto {
  @ApiProperty({ example: 'Partial refund due to scope change' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ type: [InvoiceLineDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  creditedLines?: InvoiceLineDto[];
}

export class CalculateInvoiceDto {
  @ApiProperty({ example: 'AED', description: 'ISO currency code' })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({ example: 12000, description: 'Subtotal before VAT' })
  @IsNumber()
  @Min(0, { message: 'subtotal must not be negative' })
  subtotal!: number;

  @ApiProperty({ example: 5, required: false, description: 'VAT percentage (default 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRatePct?: number;
}

export class ClassifyExpenseDto {
  @ApiProperty({ example: 'Grand Hyatt Hotel Dubai' })
  @IsString()
  @IsNotEmpty()
  merchantName!: string;

  @ApiProperty({ example: '100258594900003', required: false, description: 'Supplier 15-digit TRN' })
  @IsOptional()
  @IsString()
  supplierTrn?: string;

  @ApiProperty({ example: 1850.0, description: 'Expense amount in AED' })
  @IsNumber()
  @Min(0, { message: 'amountAED must not be negative' })
  amountAED!: number;

  @ApiProperty({
    enum: ['DUTY_TRAVEL', 'CLIENT_ENTERTAINMENT', 'REVERSE_CHARGE_SAAS'],
    example: 'DUTY_TRAVEL',
  })
  @IsIn(['DUTY_TRAVEL', 'CLIENT_ENTERTAINMENT', 'REVERSE_CHARGE_SAAS'], {
    message: 'category must be one of DUTY_TRAVEL, CLIENT_ENTERTAINMENT, REVERSE_CHARGE_SAAS',
  })
  category!: 'DUTY_TRAVEL' | 'CLIENT_ENTERTAINMENT' | 'REVERSE_CHARGE_SAAS';
}
