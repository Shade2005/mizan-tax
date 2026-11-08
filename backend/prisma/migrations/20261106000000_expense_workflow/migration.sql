-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'PROCESSING_FAILED', 'REJECTED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "expense_bills" ADD COLUMN "subtotalAED" DECIMAL(18,4),
ADD COLUMN "vatTotalAED" DECIMAL(18,4),
ADD COLUMN "supplierName" TEXT,
ADD COLUMN "supplierTrn" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER_BUSINESS_EXPENSES',
ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "ocrStatus" "OcrProcessingStatus",
ADD COLUMN "ocrConfidence" DECIMAL(5,2),
ADD COLUMN "ocrRawData" JSONB,
ADD COLUMN "conversionEvidence" JSONB,
ADD COLUMN "fileHash" TEXT,
ADD COLUMN "duplicateWarning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "duplicateReferenceId" TEXT,
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "vatRate" DECIMAL(5,2) DEFAULT 5.00,
ADD COLUMN "vatTreatment" TEXT DEFAULT 'STANDARD_5';

-- AlterTable
ALTER TABLE "expense_bill_lines" ALTER COLUMN "accountId" DROP NOT NULL,
ADD COLUMN "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
ADD COLUMN "unitPrice" DECIMAL(18,4),
ADD COLUMN "vatPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5.00;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "fileHash" TEXT;

-- CreateIndex
CREATE INDEX "expense_bills_businessId_status_idx" ON "expense_bills"("businessId", "status");
CREATE INDEX "expense_bills_businessId_category_idx" ON "expense_bills"("businessId", "category");
CREATE INDEX "expense_bills_businessId_fileHash_idx" ON "expense_bills"("businessId", "fileHash");
