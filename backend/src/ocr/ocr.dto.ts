// ============================================================================
// Mizan (ميزان) - OCR Ingestion Data Transfer Objects
// Strict Payload Size Bounds and MIME Type Validation
// ============================================================================

import { IsNotEmpty, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ACCEPTED_DOCUMENT_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export class ExtractTradeLicenseDto {
  @ApiProperty({
    description: 'Base64 encoded trade license image or document (Max 10MB)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty({ message: 'imageBase64 document payload is required' })
  // Enforce 10MB raw base64 size ceiling (approx 14,000,000 characters)
  @MaxLength(14000000, { message: 'Image base64 payload exceeds strict 10MB limit' })
  imageBase64!: string;

  @ApiProperty({
    description: 'MIME type of uploaded document',
    example: 'image/jpeg',
    required: false,
    enum: ACCEPTED_DOCUMENT_MIMES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ACCEPTED_DOCUMENT_MIMES, {
    message: 'Unsupported MIME type. Allowed formats: image/jpeg, image/png, image/webp, application/pdf',
  })
  mimeType?: string;
}

export class ExtractReceiptDto {
  @ApiProperty({
    description: 'Base64 encoded receipt image or PDF (Max 10MB)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  })
  @IsString()
  @IsNotEmpty({ message: 'imageBase64 document payload is required' })
  @MaxLength(14000000, { message: 'Image base64 payload exceeds strict 10MB limit' })
  imageBase64!: string;

  @ApiProperty({
    description: 'MIME type of receipt document',
    example: 'image/jpeg',
    required: false,
    enum: ACCEPTED_DOCUMENT_MIMES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ACCEPTED_DOCUMENT_MIMES, {
    message: 'Unsupported MIME type. Allowed formats: image/jpeg, image/png, image/webp, application/pdf',
  })
  mimeType?: string;
}
