-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PROFIT_AND_LOSS', 'VAT_RETURN_201_REPORT', 'CORPORATE_TAX_REPORT', 'TAX_READINESS_AUDIT', 'EXPENSE_BREAKDOWN', 'TRANSACTION_LEDGER');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('READY', 'GENERATING', 'FAILED');

-- AlterTable
ALTER TABLE "compliance_obligations" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "notes" TEXT,
ADD COLUMN "resolvedById" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolutionNotes" TEXT;

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "status" "ReportStatus" NOT NULL DEFAULT 'READY',
    "fileUrl" TEXT,
    "fileSizeBytes" INTEGER,
    "summaryMetrics" JSONB,
    "parametersJson" JSONB,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_readiness_snapshots" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "corporateTaxScore" INTEGER NOT NULL,
    "vatScore" INTEGER NOT NULL,
    "bookkeepingScore" INTEGER NOT NULL,
    "complianceScore" INTEGER NOT NULL,
    "profileScore" INTEGER NOT NULL,
    "categoryScoresJson" JSONB NOT NULL,
    "missingItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionableSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criticalBlockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_readiness_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_reports_businessId_reportType_idx" ON "generated_reports"("businessId", "reportType");

-- CreateIndex
CREATE INDEX "generated_reports_businessId_createdAt_idx" ON "generated_reports"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "tax_readiness_snapshots_businessId_evaluatedAt_idx" ON "tax_readiness_snapshots"("businessId", "evaluatedAt");

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_readiness_snapshots" ADD CONSTRAINT "tax_readiness_snapshots_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
