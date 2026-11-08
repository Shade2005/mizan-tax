-- AlterEnum AssessmentStatus
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'REQUIRES_ATTENTION';
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_REVIEW';
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'SUPERSEDED';

-- AlterTable tax_assessments
ALTER TABLE "tax_assessments" ALTER COLUMN "taxPeriodId" DROP NOT NULL;
ALTER TABLE "tax_assessments" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "periodKey" TEXT;
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "periodStartDate" TIMESTAMP(3);
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "periodEndDate" TIMESTAMP(3);
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "effectiveTaxRate" DECIMAL(5,2);
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "complianceScore" INTEGER DEFAULT 100;
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "complianceFindings" JSONB;
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "sourceInvoicesCount" INTEGER DEFAULT 0;
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "sourceExpensesCount" INTEGER DEFAULT 0;
ALTER TABLE "tax_assessments" ADD COLUMN IF NOT EXISTS "reassessedFromId" TEXT;

-- AlterTable tax_adjustments
ALTER TABLE "tax_adjustments" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "tax_adjustments" ADD COLUMN IF NOT EXISTS "isAddition" BOOLEAN DEFAULT true;

-- Indexes
CREATE INDEX IF NOT EXISTS "tax_assessments_businessId_status_idx" ON "tax_assessments"("businessId", "status");
CREATE INDEX IF NOT EXISTS "tax_assessments_periodStartDate_periodEndDate_idx" ON "tax_assessments"("periodStartDate", "periodEndDate");
