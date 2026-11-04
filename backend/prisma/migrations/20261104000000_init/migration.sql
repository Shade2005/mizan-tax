-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'ACCOUNTANT', 'BOOKKEEPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "LegalEntityType" AS ENUM ('NATURAL_PERSON', 'SOLE_ESTABLISHMENT', 'LLC', 'FREE_ZONE_ESTABLISHMENT', 'FREE_ZONE_COMPANY', 'BRANCH_OF_FOREIGN_COMPANY', 'CIVIL_COMPANY', 'OTHER');

-- CreateEnum
CREATE TYPE "JurisdictionType" AS ENUM ('MAINLAND', 'FREE_ZONE', 'DESIGNATED_FREE_ZONE');

-- CreateEnum
CREATE TYPE "LicenseVerificationStatus" AS ENUM ('UNVERIFIED', 'OCR_EXTRACTED', 'REGISTRY_VERIFIED', 'NEEDS_REVIEW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('CORPORATE_TAX', 'VAT');

-- CreateEnum
CREATE TYPE "VatRegistrationStatus" AS ENUM ('NOT_REGISTERED', 'MONITORING_THRESHOLD', 'VOLUNTARY_ELIGIBLE', 'MANDATORY_ELIGIBLE', 'REGISTERED', 'EXEMPT');

-- CreateEnum
CREATE TYPE "TaxPeriodFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "VatRateType" AS ENUM ('STANDARD_5', 'ZERO_RATED_0', 'EXEMPT', 'OUT_OF_SCOPE', 'REVERSE_CHARGE');

-- CreateEnum
CREATE TYPE "VatRecoverabilityStatus" AS ENUM ('FULLY_RECOVERABLE', 'PARTIALLY_RECOVERABLE', 'BLOCKED', 'MANUAL_REVIEW_REQUIRED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'ESTIMATED', 'NEEDS_REVIEW', 'REVIEWED', 'FINALISED', 'FILED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('ELIGIBLE', 'POTENTIALLY_ELIGIBLE', 'NOT_ELIGIBLE', 'REQUIRES_REVIEW', 'CLAIMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('CT_REGISTRATION', 'CT_RETURN_FILING', 'VAT_REGISTRATION', 'VAT_RETURN_FILING', 'TRADE_LICENSE_RENEWAL', 'E_INVOICING_ONBOARDING', 'RECORD_RETENTION', 'AUDIT_PREPARATION');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TRADE_LICENSE', 'VAT_CERTIFICATE', 'CT_CERTIFICATE', 'TAX_INVOICE', 'PURCHASE_BILL', 'EXPENSE_RECEIPT', 'CREDIT_NOTE', 'BANK_STATEMENT', 'AUDITED_FINANCIALS', 'MEMORANDUM_OF_ASSOCIATION', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "OcrProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('CASH_EQUIVALENTS', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'FIXED_ASSETS', 'ACCUMULATED_DEPRECIATION', 'OTHER_CURRENT_ASSET', 'OTHER_NON_CURRENT_ASSET', 'ACCOUNTS_PAYABLE', 'VAT_PAYABLE', 'CT_PROVISION', 'SHORT_TERM_DEBT', 'LONG_TERM_DEBT', 'OTHER_CURRENT_LIABILITY', 'SHARE_CAPITAL', 'RETAINED_EARNINGS', 'OWNERS_EQUITY', 'OPERATING_REVENUE', 'ZERO_RATED_REVENUE', 'EXEMPT_REVENUE', 'OTHER_INCOME', 'COGS', 'OPERATING_EXPENSE', 'ENTERTAINMENT_EXPENSE', 'RCM_SERVICE_EXPENSE', 'DEPRECIATION_EXPENSE', 'TAX_EXPENSE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'SALES_INVOICE', 'PURCHASE_BILL', 'EXPENSE', 'PAYMENT', 'REVERSAL', 'OPENING_BALANCE', 'YEAR_END_CLOSING', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EInvoiceStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_SUBMISSION', 'TRANSMITTED_TO_ASP', 'CLEARED_BY_FTA', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'CHEQUE', 'UAE_PAY', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "uaePassSub" TEXT,
    "isBiometricOn" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "isPractice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "legalEntityType" "LegalEntityType" NOT NULL,
    "jurisdictionType" "JurisdictionType" NOT NULL,
    "emirate" TEXT,
    "licensingAuthority" TEXT NOT NULL,
    "tradeLicenseNumber" TEXT NOT NULL,
    "licenseIssueDate" TIMESTAMP(3),
    "licenseExpiryDate" TIMESTAMP(3),
    "verificationStatus" "LicenseVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "businessActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "accountingMethod" TEXT NOT NULL DEFAULT 'accrual',
    "financialYearStartDay" INTEGER NOT NULL DEFAULT 1,
    "financialYearStartMon" INTEGER NOT NULL DEFAULT 1,
    "isQfzpEligible" BOOLEAN NOT NULL DEFAULT false,
    "isNaturalPersonBiz" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_registrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "trn" TEXT,
    "status" "VatRegistrationStatus" NOT NULL DEFAULT 'NOT_REGISTERED',
    "registrationDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "deregistrationDate" TIMESTAMP(3),
    "certificateDocId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_periods" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "frequency" "TaxPeriodFrequency" NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "filingDueDate" TIMESTAMP(3) NOT NULL,
    "paymentDueDate" TIMESTAMP(3) NOT NULL,
    "isFiled" BOOLEAN NOT NULL DEFAULT false,
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentAccountId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "postingDate" TIMESTAMP(3) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceReferenceId" TEXT,
    "narration" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "reversedByEntryId" TEXT,
    "reversalOfEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "credit" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    "amountAED" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "memo" TEXT,
    "vatRateType" "VatRateType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "trn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isFreeZone" BOOLEAN NOT NULL DEFAULT false,
    "isForeign" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "trn" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isForeign" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "cbUaeRateDate" TIMESTAMP(3),
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "vatTotal" DECIMAL(18,4) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "totalAmountAED" DECIMAL(18,4) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "eInvoiceStatus" "EInvoiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "peppolPintXml" TEXT,
    "aspReference" TEXT,
    "pdfUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1.0000,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "discount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "vatRateType" "VatRateType" NOT NULL DEFAULT 'STANDARD_5',
    "vatPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "vatAmount" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,4) NOT NULL,
    "lineTotalAED" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_bills" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT,
    "documentId" TEXT,
    "journalEntryId" TEXT,
    "billNumber" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "vatTotal" DECIMAL(18,4) NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "totalAmountAED" DECIMAL(18,4) NOT NULL,
    "isReverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "vatRecoverability" "VatRecoverabilityStatus" NOT NULL DEFAULT 'FULLY_RECOVERABLE',
    "recoverableVatAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "isCtDeductible" BOOLEAN NOT NULL DEFAULT true,
    "ctDeductiblePercentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_bill_lines" (
    "id" TEXT NOT NULL,
    "expenseBillId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "amountAED" DECIMAL(18,4) NOT NULL,
    "vatRateType" "VatRateType" NOT NULL DEFAULT 'STANDARD_5',
    "vatAmount" DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    "vatRecoverability" "VatRecoverabilityStatus" NOT NULL DEFAULT 'FULLY_RECOVERABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "expenseBillId" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "amountAED" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cbuae_exchange_rates" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "rateDate" DATE NOT NULL,
    "rateToAED" DECIMAL(12,6) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cbuae_exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_assessments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxPeriodId" TEXT NOT NULL,
    "taxType" "TaxType" NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'ESTIMATED',
    "ruleSetVersion" TEXT NOT NULL,
    "grossRevenueAED" DECIMAL(18,4) NOT NULL,
    "accountingProfitAED" DECIMAL(18,4),
    "taxableIncomeAED" DECIMAL(18,4),
    "outputVatAED" DECIMAL(18,4),
    "recoverableVatAED" DECIMAL(18,4),
    "netTaxPayableAED" DECIMAL(18,4) NOT NULL,
    "isSmallBizRelief" BOOLEAN NOT NULL DEFAULT false,
    "isQfzpClaimed" BOOLEAN NOT NULL DEFAULT false,
    "calculationJson" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_adjustments" (
    "id" TEXT NOT NULL,
    "taxAssessmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "legalReference" TEXT NOT NULL,
    "amountAED" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_opportunities" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "legalReference" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'POTENTIALLY_ELIGIBLE',
    "estimatedImpactAED" DECIMAL(18,4),
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanation" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_obligations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "obligationType" "ObligationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "legalReference" TEXT NOT NULL,
    "calculatedDueDate" TIMESTAMP(3) NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'PENDING',
    "penaltyAmountAED" DECIMAL(18,4),
    "completionDate" TIMESTAMP(3),
    "evidenceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_notifications" (
    "id" TEXT NOT NULL,
    "complianceObligationId" TEXT NOT NULL,
    "daysBeforeDue" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "notificationChannel" TEXT NOT NULL DEFAULT 'PUSH_AND_IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "ocrStatus" "OcrProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "ocrConfidence" DECIMAL(5,2),
    "ocrRawJson" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_extraction_fields" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "rawValue" TEXT,
    "correctedValue" TEXT,
    "confidence" DECIMAL(5,2),
    "boundingBoxJson" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_extraction_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentMd" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "optionsJson" JSONB NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_course_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progressPct" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "documentNumber" TEXT,
    "taxCategory" "TaxType" NOT NULL,
    "sourceUrl" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "knowledgeDocumentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadataJson" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "aiConversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citationsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "businessId" TEXT,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_uaePassSub_key" ON "users"("uaePassSub");

-- CreateIndex
CREATE INDEX "memberships_organisationId_idx" ON "memberships"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_organisationId_key" ON "memberships"("userId", "organisationId");

-- CreateIndex
CREATE INDEX "businesses_organisationId_idx" ON "businesses"("organisationId");

-- CreateIndex
CREATE INDEX "businesses_tradeLicenseNumber_idx" ON "businesses"("tradeLicenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_organisationId_tradeLicenseNumber_key" ON "businesses"("organisationId", "tradeLicenseNumber");

-- CreateIndex
CREATE INDEX "tax_registrations_trn_idx" ON "tax_registrations"("trn");

-- CreateIndex
CREATE UNIQUE INDEX "tax_registrations_businessId_taxType_key" ON "tax_registrations"("businessId", "taxType");

-- CreateIndex
CREATE INDEX "fiscal_years_businessId_idx" ON "fiscal_years"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_businessId_year_key" ON "fiscal_years"("businessId", "year");

-- CreateIndex
CREATE INDEX "tax_periods_businessId_taxType_idx" ON "tax_periods"("businessId", "taxType");

-- CreateIndex
CREATE INDEX "tax_periods_filingDueDate_idx" ON "tax_periods"("filingDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "tax_periods_businessId_taxType_fiscalYearId_periodNumber_key" ON "tax_periods"("businessId", "taxType", "fiscalYearId", "periodNumber");

-- CreateIndex
CREATE INDEX "accounts_businessId_type_idx" ON "accounts"("businessId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_businessId_accountCode_key" ON "accounts"("businessId", "accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reversedByEntryId_key" ON "journal_entries"("reversedByEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reversalOfEntryId_key" ON "journal_entries"("reversalOfEntryId");

-- CreateIndex
CREATE INDEX "journal_entries_businessId_postingDate_idx" ON "journal_entries"("businessId", "postingDate");

-- CreateIndex
CREATE INDEX "journal_entries_businessId_status_idx" ON "journal_entries"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_businessId_entryNumber_key" ON "journal_entries"("businessId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_lines_journalEntryId_idx" ON "journal_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- CreateIndex
CREATE INDEX "customers_trn_idx" ON "customers"("trn");

-- CreateIndex
CREATE INDEX "suppliers_businessId_idx" ON "suppliers"("businessId");

-- CreateIndex
CREATE INDEX "suppliers_trn_idx" ON "suppliers"("trn");

-- CreateIndex
CREATE INDEX "invoices_businessId_status_idx" ON "invoices"("businessId", "status");

-- CreateIndex
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_businessId_invoiceNumber_key" ON "invoices"("businessId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "expense_bills_businessId_billDate_idx" ON "expense_bills"("businessId", "billDate");

-- CreateIndex
CREATE INDEX "expense_bills_businessId_paymentStatus_idx" ON "expense_bills"("businessId", "paymentStatus");

-- CreateIndex
CREATE INDEX "expense_bill_lines_expenseBillId_idx" ON "expense_bill_lines"("expenseBillId");

-- CreateIndex
CREATE INDEX "payments_businessId_paymentDate_idx" ON "payments"("businessId", "paymentDate");

-- CreateIndex
CREATE INDEX "cbuae_exchange_rates_rateDate_idx" ON "cbuae_exchange_rates"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "cbuae_exchange_rates_currencyCode_rateDate_key" ON "cbuae_exchange_rates"("currencyCode", "rateDate");

-- CreateIndex
CREATE INDEX "tax_assessments_businessId_taxType_idx" ON "tax_assessments"("businessId", "taxType");

-- CreateIndex
CREATE INDEX "tax_adjustments_taxAssessmentId_idx" ON "tax_adjustments"("taxAssessmentId");

-- CreateIndex
CREATE INDEX "tax_opportunities_businessId_status_idx" ON "tax_opportunities"("businessId", "status");

-- CreateIndex
CREATE INDEX "compliance_obligations_businessId_status_idx" ON "compliance_obligations"("businessId", "status");

-- CreateIndex
CREATE INDEX "compliance_obligations_calculatedDueDate_idx" ON "compliance_obligations"("calculatedDueDate");

-- CreateIndex
CREATE INDEX "compliance_notifications_scheduledFor_isSent_idx" ON "compliance_notifications"("scheduledFor", "isSent");

-- CreateIndex
CREATE INDEX "documents_businessId_documentType_idx" ON "documents"("businessId", "documentType");

-- CreateIndex
CREATE INDEX "documents_ocrStatus_idx" ON "documents"("ocrStatus");

-- CreateIndex
CREATE INDEX "document_extraction_fields_documentId_fieldKey_idx" ON "document_extraction_fields"("documentId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_courseId_slug_key" ON "lessons"("courseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_course_progress_userId_courseId_key" ON "user_course_progress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_knowledgeDocumentId_idx" ON "knowledge_chunks"("knowledgeDocumentId");

-- CreateIndex
CREATE INDEX "audit_events_organisationId_createdAt_idx" ON "audit_events"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_businessId_entityType_entityId_idx" ON "audit_events"("businessId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_registrations" ADD CONSTRAINT "tax_registrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_periods" ADD CONSTRAINT "tax_periods_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversedByEntryId_fkey" FOREIGN KEY ("reversedByEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bills" ADD CONSTRAINT "expense_bills_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bills" ADD CONSTRAINT "expense_bills_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bills" ADD CONSTRAINT "expense_bills_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bills" ADD CONSTRAINT "expense_bills_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bill_lines" ADD CONSTRAINT "expense_bill_lines_expenseBillId_fkey" FOREIGN KEY ("expenseBillId") REFERENCES "expense_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_bill_lines" ADD CONSTRAINT "expense_bill_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_expenseBillId_fkey" FOREIGN KEY ("expenseBillId") REFERENCES "expense_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_taxPeriodId_fkey" FOREIGN KEY ("taxPeriodId") REFERENCES "tax_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_adjustments" ADD CONSTRAINT "tax_adjustments_taxAssessmentId_fkey" FOREIGN KEY ("taxAssessmentId") REFERENCES "tax_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_opportunities" ADD CONSTRAINT "tax_opportunities_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notifications" ADD CONSTRAINT "compliance_notifications_complianceObligationId_fkey" FOREIGN KEY ("complianceObligationId") REFERENCES "compliance_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_extraction_fields" ADD CONSTRAINT "document_extraction_fields_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_progress" ADD CONSTRAINT "user_course_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledgeDocumentId_fkey" FOREIGN KEY ("knowledgeDocumentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_aiConversationId_fkey" FOREIGN KEY ("aiConversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

