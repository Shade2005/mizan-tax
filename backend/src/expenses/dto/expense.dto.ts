// ============================================================================
// Mizan (ميزان) - Expense DTOs & Validation Schema
// ============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsIn,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ACCEPTED_DOCUMENT_MIMES } from '../../ocr/ocr.dto';
import { ExpenseStatus, PaymentMethodType, PaymentStatusType, VatRateType } from '../expense.types';

export class ExpenseLineItemDto {
  @ApiProperty({ description: 'Line item description', example: 'A4 Printing Paper 80gsm' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Quantity', example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiProperty({ description: 'Unit price', example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ description: 'Line total amount before VAT', example: 125.0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ description: 'VAT rate percentage', example: 5.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatPercentage?: number;

  @ApiProperty({ description: 'VAT amount for line', example: 6.25, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @ApiProperty({ description: 'VAT rate classification', example: 'STANDARD_5', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['STANDARD_5', 'ZERO_RATED_0', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE'])
  vatRateType?: VatRateType;
}

export class ScanExpenseReceiptDto {
  @ApiProperty({ description: 'Business ID', example: 'biz-1234567' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ description: 'Base64 encoded receipt image or PDF (Max 10MB)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(14000000, { message: 'Image base64 payload exceeds strict 10MB limit' })
  imageBase64!: string;

  @ApiProperty({ description: 'MIME type of document', required: false, enum: ACCEPTED_DOCUMENT_MIMES })
  @IsOptional()
  @IsString()
  @IsIn(ACCEPTED_DOCUMENT_MIMES)
  mimeType?: string;

  @ApiProperty({ description: 'Original filename', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;
}

export class CreateManualExpenseDto {
  @ApiProperty({ description: 'Business ID', example: 'biz-1234567' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ description: 'Supplier / Vendor name', example: 'Carrefour Hypermarket LLC' })
  @IsString()
  @IsNotEmpty()
  supplierName!: string;

  @ApiProperty({ description: '15-digit UAE TRN of supplier', example: '100234567800003', required: false })
  @IsOptional()
  @IsString()
  supplierTrn?: string;

  @ApiProperty({ description: 'Receipt or invoice reference number', example: 'REC-2026-904', required: false })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiProperty({ description: 'Expense date (YYYY-MM-DD)', example: '2026-10-15' })
  @IsString()
  @IsNotEmpty()
  expenseDate!: string;

  @ApiProperty({ description: 'Currency', example: 'AED', default: 'AED' })
  @IsOptional()
  @IsString()
  currency?: string = 'AED';

  @ApiProperty({ description: 'Subtotal before VAT', example: 290.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiProperty({ description: 'VAT amount', example: 14.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @ApiProperty({ description: 'Total gross amount including VAT', example: 304.5 })
  @IsNumber()
  @IsPositive({ message: 'Total amount must be greater than zero' })
  totalAmount!: number;

  @ApiProperty({ description: 'Expense category code', example: 'OFFICE_SUPPLIES' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Payment method', required: false, enum: ['BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHEQUE', 'UAE_PAY', 'OTHER'] })
  @IsOptional()
  @IsString()
  @IsIn(['BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHEQUE', 'UAE_PAY', 'OTHER'])
  paymentMethod?: PaymentMethodType;

  @ApiProperty({ description: 'Payment status', required: false, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'] })
  @IsOptional()
  @IsString()
  @IsIn(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'])
  paymentStatus?: PaymentStatusType;

  @ApiProperty({ description: 'Expense description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Internal accounting notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Custom exchange rate if foreign currency', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;

  @ApiProperty({ description: 'Is Reverse Charge Mechanism applicable', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isReverseCharge?: boolean;

  @ApiProperty({ description: 'Line items breakdown', type: [ExpenseLineItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineItemDto)
  lines?: ExpenseLineItemDto[];
}

export class UpdateExpenseDto {
  @ApiProperty({ description: 'Supplier / Vendor name', required: false })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiProperty({ description: '15-digit UAE TRN', required: false })
  @IsOptional()
  @IsString()
  supplierTrn?: string;

  @ApiProperty({ description: 'Receipt reference number', required: false })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiProperty({ description: 'Expense date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  expenseDate?: string;

  @ApiProperty({ description: 'Currency code', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Subtotal before VAT', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiProperty({ description: 'VAT amount', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @ApiProperty({ description: 'Total gross amount', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalAmount?: number;

  @ApiProperty({ description: 'Expense category code', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Payment method', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHEQUE', 'UAE_PAY', 'OTHER'])
  paymentMethod?: PaymentMethodType;

  @ApiProperty({ description: 'Payment status', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'])
  paymentStatus?: PaymentStatusType;

  @ApiProperty({ description: 'Expense description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Internal notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Line items breakdown', type: [ExpenseLineItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineItemDto)
  lines?: ExpenseLineItemDto[];
}

export class QueryExpensesDto {
  @ApiProperty({ description: 'Business ID', example: 'biz-1234567' })
  @IsString()
  @IsNotEmpty()
  businessId!: string;

  @ApiProperty({ description: 'Lifecycle status filter', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'PROCESSING_FAILED', 'REJECTED', 'ARCHIVED'])
  status?: string;

  @ApiProperty({ description: 'Category code filter', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Supplier name search filter', required: false })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: 'Search term (vendor, reference, description)', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

export class RejectExpenseDto {
  @ApiProperty({ description: 'Reason for rejection', example: 'Personal expense / non-business receipt' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ArchiveExpenseDto {
  @ApiProperty({ description: 'Reason for archiving', example: 'Duplicate submission or cancelled vendor invoice' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchExpenseActionDto {
  @ApiProperty({ description: 'Array of expense IDs to action', example: ['exp-1', 'exp-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  expenseIds!: string[];

  @ApiProperty({ description: 'Action to apply: APPROVE | REJECT | ARCHIVE | CATEGORIZE', example: 'APPROVE' })
  @IsString()
  @IsIn(['APPROVE', 'REJECT', 'ARCHIVE', 'CATEGORIZE'])
  action!: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'CATEGORIZE';

  @ApiProperty({ description: 'Category code if action is CATEGORIZE', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Reason if action is REJECT or ARCHIVE', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
