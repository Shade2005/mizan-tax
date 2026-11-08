# MIZAN (ميزان) — PHASE 6.6 IMPLEMENTATION REPORT
## UAE VAT & Corporate Tax Assessment Engines

---

### 1. Executive Summary

Phase 6.6 delivers the core statutory tax computation layer of **Mizan (ميزان)**. It connects real persisted financial data—invoices, credit notes, expenses, vendor TRNs, and business entity profiles—directly into two deterministic, legally grounded calculation engines:
1. **UAE VAT Assessment Engine (VAT 201 Return)**: Calculates standard-rated supplies, reverse-charge mechanism (RCM) foreign services, zero-rated exports, exempt supplies, recoverable input tax, Article 53 non-recoverable blocked input tax (entertainment and private vehicles), Decision No. 17 of 2026 employee expenses, and Net VAT Payable / (Refundable).
2. **UAE Corporate Tax Assessment Engine (FDL No. 47 of 2022)**: Reconciles accounting profit from real invoices and categorized expenses, applies statutory tax adjustments (Article 32 50% entertainment disallowance, Article 33(1) non-deductible fines, Article 30 GIDLR interest limitation, Article 39 75% tax loss offset), evaluates Small Business Relief (SBR under Article 21 & MD 73/2023), Natural Person thresholds (CD 49/2023), and Qualifying Free Zone Person (QFZP) de minimis tests.
3. **Automated Compliance Audit Engine**: Flags statutory risks (missing supplier TRNs, unverified input VAT without tax invoices, unregistered businesses collecting VAT, registration threshold breaches, SBR disqualifications).
4. **Historical Lineage & Reassessment**: Preserves historical assessments by superseding old versions rather than deleting records, establishing full audit trails.
5. **Grounded AI Explanation Layer**: Empowers users to ask plain-text questions about their exact tax position; responses are strictly grounded in deterministic calculations and official FTA / Ministry of Finance statutory citations.
6. **Live Mobile Integration**: Connects `mobile/app/(tabs)/tax.tsx` to live backend APIs, replacing static mock values with dynamic assessments, box-by-box return views, compliance findings, and interactive AI consultations.

All 132 tests in the cumulative backend test suite pass with 100% success. Both backend and mobile TypeScript compilations pass with 0 errors.

---

### 2. Initial Architecture Audit Findings

Before writing code, a comprehensive audit of the repository was conducted:
- **Tenancy Resolution**: Multi-tenancy is structured around `Organisation` with child `Business` entities. Authenticated JWTs supply `user.organisationId` and `user.id`. The active business is managed on mobile via `BusinessContext` and verified server-side by validating `business.organisationId === user.organisationId`.
- **Existing Models**: `backend/prisma/schema.prisma` contained initial `TaxAssessment` and `TaxAdjustment` models, but `TaxAssessment.taxPeriodId` was strictly required (preventing ad-hoc or quarterly assessment periods), and lacked status variants (`REQUIRES_ATTENTION`, `READY_FOR_REVIEW`, `SUPERSEDED`), period date ranges, compliance score, compliance findings JSON, source counts, and historical lineage (`reassessedFromId`).
- **Calculation Engines**: `backend/src/tax-engine/corporate-tax.engine.ts` and `backend/src/tax-engine/vat.engine.ts` contained deterministic arithmetic algorithms using `Decimal.js`, but were stateless and disconnected from the PostgreSQL database.
- **RAG Infrastructure**: `backend/src/ai/rag.service.ts` had a statutory corpus and RAG pipeline, but had no interface for ingesting calculated assessment figures to explain user tax positions.
- **Mobile UI**: `mobile/app/(tabs)/tax.tsx` contained a 4-tab segmented control (Overview, Corporate Tax, VAT 201, SBR) displaying hardcoded mock figures (e.g., AED 1,820,000 revenue, AED 14,320 VAT) with no backend API integration.

---

### 3. Existing Components Reused

1. `backend/src/tax-engine/vat.engine.ts`: Reused core Box 1, 3, 4, 5, 8, 9, 10, 11, 12 calculations and Article 53 / Decision 17 of 2026 recoverability rules.
2. `backend/src/tax-engine/corporate-tax.engine.ts`: Reused 0%/9% bracket arithmetic, GIDLR interest cap formulas, SBR checks, and QFZP de minimis calculation.
3. `backend/src/ai/rag.service.ts`: Reused the RAG pipeline for retrieval-augmented generation and statutory legal citation matching.
4. `backend/src/prisma/prisma.service.ts`: Reused existing Prisma database connection and client extensions.
5. `mobile/src/context/BusinessContext.tsx`: Reused active business state and entity switching logic.
6. `mobile/src/theme/tokens.ts`: Reused design tokens, colors, radii, and typography.

---

### 4. New Components Implemented

#### Backend
- `backend/src/tax/statutory-rules.config.ts`: Authoritative repository of effective-dated statutory citations (FDL 8/2017, FDL 47/2022, CD 52/2017, FTA Dec 17/2026, MD 73/2023, CD 49/2023, CD 139/2023) and statutory constants.
- `backend/src/tax/tax.types.ts`: TypeScript interfaces for assessment summaries, compliance findings, box breakdowns, adjustments, and period DTOs.
- `backend/src/tax/vat-assessment.service.ts`: Complete data collection, compliance auditing, deterministic VAT 201 return mapping, and database persistence service.
- `backend/src/tax/corporate-tax-assessment.service.ts`: Bookkeeping reconciliation, statutory additions/subtractions, loss offset capping, SBR/QFZP checks, and database persistence service.
- `backend/src/tax/tax.service.ts`: Facade coordinating persistent VAT/CT assessments, assessment history, reassessments, status updates, and grounded AI explanations.
- `backend/src/tax/tax.controller.ts`: 10 authenticated REST endpoints under `/api/v1/tax/`.
- `backend/src/tax/run-tax-assessment-tests.ts`: 24-case automated statutory calculation and integration test suite.
- `backend/prisma/migrations/20261106010000_tax_assessments/migration.sql`: PostgreSQL migration documenting enum alterations and table extensions.

#### Mobile Client
- `mobile/src/services/api.ts`: Added 8 new API client methods (`assessBusinessVat`, `assessBusinessCorporateTax`, `getTaxAssessments`, `getTaxAssessment`, `updateAssessmentStatus`, `reassessTaxAssessment`, `getAssessmentLegalReferences`, `explainAssessmentWithAi`).
- `mobile/app/(tabs)/tax.tsx`: Completely refactored into a live statutory tax hub connecting to backend APIs, with real combined tax positions, live Corporate Tax reconciliation, official FTA VAT 201 box schedule, SBR ceiling progress gauge, and grounded AI question modal.

---

### 5. Database Schema and Migration Changes

#### Schema Updates (`backend/prisma/schema.prisma`)
```prisma
enum AssessmentStatus {
  DRAFT
  REQUIRES_ATTENTION
  READY_FOR_REVIEW
  REVIEWED
  FINALISED
  SUPERSEDED
  ESTIMATED
  FILED
  NEEDS_REVIEW
}

model TaxAssessment {
  id                  String           @id @default(uuid())
  businessId          String
  taxPeriodId         String?
  taxType             TaxType
  periodKey           String?          // e.g. "2026-Q1", "2026-M11", "FY2026"
  periodStartDate     DateTime?
  periodEndDate       DateTime?
  assessmentDate      DateTime         @default(now())
  status              AssessmentStatus @default(DRAFT)
  ruleSetVersion      String           // e.g., "2026.2-VAT", "2026.1-CT"
  grossRevenueAED     Decimal          @db.Decimal(18, 4)
  accountingProfitAED Decimal?         @db.Decimal(18, 4)
  taxableIncomeAED    Decimal?         @db.Decimal(18, 4)
  outputVatAED        Decimal?         @db.Decimal(18, 4)
  recoverableVatAED   Decimal?         @db.Decimal(18, 4)
  netTaxPayableAED    Decimal          @db.Decimal(18, 4)
  effectiveTaxRate    Decimal?         @db.Decimal(5, 2)
  isSmallBizRelief    Boolean          @default(false)
  isQfzpClaimed       Boolean          @default(false)
  complianceScore     Int?             @default(100)
  complianceFindings  Json?
  sourceInvoicesCount Int?             @default(0)
  sourceExpensesCount Int?             @default(0)
  calculationJson     Json
  reassessedFromId    String?
  notes               String?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  business            Business         @relation(fields: [businessId], references: [id], onDelete: Cascade)
  taxPeriod           TaxPeriod?       @relation(fields: [taxPeriodId], references: [id], onDelete: Restrict)
  adjustments         TaxAdjustment[]

  @@index([businessId, taxType])
  @@index([businessId, status])
  @@index([periodStartDate, periodEndDate])
  @@map("tax_assessments")
}

model TaxAdjustment {
  id              String        @id @default(uuid())
  taxAssessmentId String
  code            String?       // e.g. "ENTERTAINMENT_ART_32"
  label           String
  legalReference  String
  amountAED       Decimal       @db.Decimal(18, 4)
  isAddition      Boolean       @default(true)
  reason          String
  createdAt       DateTime      @default(now())

  taxAssessment   TaxAssessment @relation(fields: [taxAssessmentId], references: [id], onDelete: Cascade)

  @@index([taxAssessmentId])
  @@map("tax_adjustments")
}
```

The database was synchronized using `npx prisma db push` and documented in `backend/prisma/migrations/20261106010000_tax_assessments/migration.sql`.

---

### 6. Backend API Changes

| HTTP Method | Route | Description | Auth & Access |
|---|---|---|---|
| `POST` | `/api/v1/tax/vat/assess-business` | Assesses VAT from real invoices & expenses for a period; maps to VAT 201; checks compliance; persists to DB. | JWT Required, Org tenant-scoped |
| `POST` | `/api/v1/tax/corporate/assess-business` | Reconciles accounting profit, applies statutory additions/subtractions/reliefs, assesses CT liability, and persists to DB. | JWT Required, Org tenant-scoped |
| `GET` | `/api/v1/tax/assessments` | Lists historical assessments for the active business. | JWT Required, Scoped to active business |
| `GET` | `/api/v1/tax/assessments/:id` | Retrieves full assessment details, calculation breakdowns, and compliance findings. | JWT Required, Tenant verified |
| `PATCH` | `/api/v1/tax/assessments/:id/status` | Updates assessment status (e.g. `REVIEWED`) and notes. | JWT Required, Tenant verified |
| `POST` | `/api/v1/tax/assessments/:id/reassess` | Reassesses period, marks old as `SUPERSEDED`, links historical lineage. | JWT Required, Tenant verified |
| `GET` | `/api/v1/tax/assessments/:id/legal-references` | Retrieves official statutory citations for the assessment. | JWT Required, Tenant verified |
| `POST` | `/api/v1/tax/assessments/:id/explain` | Grounded AI consultation answering questions using real assessment calculations and legal citations. | JWT Required, Tenant verified |
| `POST` | `/api/v1/tax/corporate/assess` | Stateless CT calculation on raw payload (backward compatible). | JWT Required |
| `POST` | `/api/v1/tax/vat/assess` | Stateless VAT 201 calculation on raw lines (backward compatible). | JWT Required |

---

### 7. VAT Calculation Implementation

The engine maps persisted transactions into official UAE VAT 201 return boxes:
- **Box 1 (Standard-Rated Supplies)**: Gross commercial sales at 5% rate ($5\% \times \text{Taxable Sales}$).
- **Box 3 (Reverse-Charge Supplies)**: Foreign cross-border SaaS and imported services where recipient accounts for output VAT.
- **Box 4 (Zero-Rated Supplies)**: Exports of goods and services, international transportation, and qualifying healthcare/education.
- **Box 5 (Exempt Supplies)**: Local passenger transport, bare land, financial services without explicit fee.
- **Box 8 (Total Output VAT Due)**: $\text{Box 1 Output VAT} + \text{Box 3 Output VAT}$.
- **Box 9 (Standard-Rated Purchases & Input VAT)**: Local business expenses with valid Tax Invoices and supplier TRNs. Blocked inputs (entertainment under Art. 53(1)(a) and private vehicles under Art. 53(1)(b)) are filtered out of recoverable tax.
- **Box 10 (Reverse-Charge Recoverable Tax)**: Input tax recovery matching Box 3 for taxable business use.
- **Box 11 (Total Recoverable Tax)**: $\text{Box 9 Recoverable} + \text{Box 10 Recoverable}$.
- **Box 12 (Net VAT Position)**:
  $$\text{Net Position} = \text{Box 8 Total Output VAT} - \text{Box 11 Total Recoverable Tax}$$
  - If $> 0$: Net VAT Payable to the FTA.
  - If $< 0$: Net VAT Refundable credit from the FTA.

#### Automated VAT Compliance Checks
1. `UNREGISTERED_VAT_CHARGED` (`CRITICAL`): Unregistered business charging VAT on invoices without an FTA TRN.
2. `MANDATORY_REGISTRATION_REQUIRED` (`CRITICAL`): 12-month taxable supplies exceed AED 375,000 threshold without active VAT registration.
3. `MISSING_SUPPLIER_TRN` (`CRITICAL`): Input VAT claimed on expense lacking a 15-digit supplier TRN (recovery blocked under Art. 59/65).
4. `MISSING_TAX_INVOICE_EVIDENCE` (`WARNING`): Input VAT claimed without attached document evidence.
5. `BLOCKED_ENTERTAINMENT_INPUT_VAT` (`WARNING`): Input VAT on entertainment/hospitality automatically blocked under Art. 53(1)(a).

---

### 8. Corporate Tax Calculation Implementation

1. **Accounting Profit Reconciliation**:
   $$\text{Accounting Net Profit} = \text{Gross Turnover (Invoices)} - \text{Total Accounting Expenses (COGS + Opex)}$$
2. **Statutory Additions to Profit**:
   - 50% Client Entertainment Disallowance under Article 32.
   - 100% Non-Deductible Government Fines and Penalties under Article 33(1).
   - Net Interest Expense in excess of AED 12M de minimis and 30% Tax EBITDA under Article 30 (GIDLR).
3. **Statutory Subtractions / Exemptions**:
   - Domestic dividends and qualifying foreign participation exemption gains under Articles 22 & 23.
4. **Small Business Relief (SBR)** under Article 21 & MD 73/2023:
   - Validates that current revenue $\le \text{AED } 3,000,000$, prior period revenues $\le \text{AED } 3,000,000$, entity is not a QFZP, and entity is not an MNE group member.
   - If SBR is elected and valid: $\text{Taxable Income} = \text{AED } 0$.
5. **Prior Period Tax Loss Relief** under Article 39:
   - Max loss offset capped at 75% of taxable income before losses. Remaining losses are carried forward indefinitely.
6. **Statutory Rate Calculation**:
   - 0% on Taxable Income up to AED 375,000.
   - 9% on Taxable Income exceeding AED 375,000.
   - Effective Tax Rate: $(\text{Tax Payable} / \text{Final Taxable Income}) \times 100\%$.

---

### 9. Legal Sources and Statutory Rule Versions

| Legislation / Decision | Regulatory Reference | Effective Date | Version Tag |
|---|---|---|---|
| Value Added Tax Basic Law | Federal Decree-Law No. (8) of 2017 | 2018-01-01 | `2026.2-VAT` |
| VAT Executive Regulations | Cabinet Decision No. (52) of 2017 (Art. 53, 59, 65) | 2018-01-01 | `2026.2-VAT` |
| Employee Expense VAT Rules | FTA Decision No. 17 of 2026 | 2026-01-01 | `2026.2-VAT` |
| Corporate Tax Basic Law | Federal Decree-Law No. (47) of 2022 | 2023-06-01 | `2026.1-CT` |
| Small Business Relief (SBR) | Ministerial Decision No. 73 of 2023 | 2023-06-01 | `2026.1-CT` |
| General Interest Limitation (GIDLR) | Ministerial Decision No. 126 of 2023 | 2023-06-01 | `2026.1-CT` |
| Natural Persons Corporate Tax | Cabinet Decision No. (49) of 2023 | 2023-06-01 | `2026.1-CT` |
| Qualifying Free Zone Persons (QFZP) | Cabinet Decision No. 139 / MD 265 of 2023 | 2023-06-01 | `2026.1-CT` |

---

### 10. AI Integration

The AI explanation layer (`POST /api/v1/tax/assessments/:id/explain`) connects user questions directly to their persisted assessment records:
- Pulls actual calculated figures (gross sales, output VAT, Box 11 recoverable VAT, net position, accounting profit, additions, final taxable income, liability).
- Prepares an augmented context prompt including compliance findings and statutory return boxes.
- Calls `RagService.generateGroundedAnswer` to generate grounded statutory explanations with authoritative citations (legislation name, article numbers, and FTA official URLs).
- Guarantees zero AI hallucination on financial numbers: calculations are strictly produced by the deterministic engine; AI only explains the legal rationale.

---

### 11. Mobile Screens and Workflows

1. **Tax Hub Overview (`mobile/app/(tabs)/tax.tsx`)**:
   - Hero card with live combined tax liability (Corporate Tax liability + Net VAT payable).
   - Compliance health indicator score.
   - Quick navigation cards to Corporate Tax and VAT (201).
   - Small Business Relief status pill.
   - Statutory compliance audit summary showing top actionable findings.
2. **Corporate Tax Screen**:
   - Estimated Tax Liability hero card showing 0% / 9% status and effective tax rate.
   - Profit to Taxable Income Reconciliation table (Revenue, Profit, Additions, Reliefs, Final Taxable Income).
   - Itemized statutory adjustments list (50% entertainment add-back, fines).
   - Reassess button with live mutation and haptic feedback.
3. **VAT (201) Screen**:
   - Net VAT Position hero card (Payable vs Refundable badge).
   - Complete 9-box FTA Form 201 schedule showing Box 1, Box 3, Box 4, Box 5, Box 8, Box 9, Box 10, Box 11, Box 12.
   - Blocked input VAT breakdown under Article 53.
4. **Small Business Relief (SBR) Dashboard**:
   - Revenue ceiling progress gauge comparing revenue to the AED 3M statutory cap.
   - 4-point eligibility checklist (revenue ceiling, non-QFZP, non-MNE, sunset window).
5. **Grounded AI Intelligence Modal**:
   - Modal accessible via sparkle icon.
   - Pre-built quick prompt chips.
   - Custom query input.
   - Renders statutory explanations with official legislation citations.

---

### 12. Automated Tests Executed

#### Test Suite: `backend/src/tax/run-tax-assessment-tests.ts` (24 Tests)
```bash
============================================================
MIZAN VAT & CORPORATE TAX ASSESSMENT AUDIT SUITE (PHASE 6.6)
============================================================

--- 1. DETERMINISTIC VAT 201 STATUTORY ENGINE ---
✔ [PASS] TC-VAT-01: Standard 5% supplies reconcile exactly: Output AED 5,000 - Input AED 2,000 = Payable AED 3,000
✔ [PASS] TC-VAT-02: Zero-rated, exempt & RCM: Reverse charge accounts for AED 500 Output & AED 500 Input (Net 0)
✔ [PASS] TC-VAT-03: Art. 53 blocks 100% of input VAT on entertainment and private motor vehicles (AED 1,500 Blocked)
✔ [PASS] TC-VAT-04: Decision No. 17 of 2026: Business duty hotel is 100% recoverable; personal perks are blocked
✔ [PASS] TC-VAT-05: Art. 59 & 65: Input VAT without a valid supplier Tax Invoice is blocked from recovery
✔ [PASS] TC-VAT-06: Turnover monitor identifies voluntary (>=187.5k) and mandatory (>=375k) registration triggers

--- 2. DETERMINISTIC CORPORATE TAX STATUTORY ENGINE ---
✔ [PASS] TC-CT-01: Taxable income of AED 350,000 falls within AED 375,000 0% bracket (Tax Payable: AED 0)
✔ [PASS] TC-CT-02: Profit of AED 875,000 pays 9% on AED 500,000 excess = AED 45,000 (Effective Rate 5.14%)
✔ [PASS] TC-CT-03: Add-backs correctly applied: 50% entertainment (30k) + 100% fines (20k) = AED 50,000 additions
✔ [PASS] TC-CT-04: Small Business Relief election treats taxable income as AED 0 when revenue <= AED 3,000,000
✔ [PASS] TC-CT-05: Revenue of AED 3.5M disqualifies entity from SBR; standard 9% tax of AED 11,250 enforced
✔ [PASS] TC-CT-06: Tax loss offset capped at 75% statutory limit (AED 750,000 applied, AED 150,000 carried forward)
✔ [PASS] TC-CT-07: Natural person exempt below AED 1M business turnover regardless of employment salary
✔ [PASS] TC-CT-08: QFZP de minimis test correctly enforces min(5%, AED 5M) statutory threshold

--- 3. REAL FINANCIAL DATA INGESTION & PERSISTENT ASSESSMENTS ---
✔ [PASS] TC-INT-01: VAT assessment calculates real Box 1 (AED 5,000) and Box 9 (AED 1,000) -> Net Payable AED 4,000
✔ [PASS] TC-INT-02: VAT assessment is persisted directly to PostgreSQL with relational business linkage
✔ [PASS] TC-INT-03: Corporate Tax assessment reconciles Revenue (100k) - Expenses (20k) = Profit AED 80,000
✔ [PASS] TC-INT-04: Corporate Tax assessment is persisted in PostgreSQL with complete reconciliation payload

--- 4. REASSESSMENT, LINEAGE & COMPLIANCE FINDINGS ---
✔ [PASS] TC-REASSESS-01: Reassessment supersedes old record and tracks historical lineage without data destruction
✔ [PASS] TC-COMP-01: Automated audit detects missing supplier TRN, flags CRITICAL finding, and sets status to REQUIRES_ATTENTION

--- 5. TENANCY, MULTI-TENANT SECURITY & GROUNDED AI ---
✔ [PASS] TC-SEC-01: Cross-organisation VAT assessment attempt is strictly blocked with 403 Forbidden
✔ [PASS] TC-SEC-02: Cross-organisation Corporate Tax assessment attempt is strictly blocked with 403 Forbidden
✔ [PASS] TC-SEC-03: Assessment listing is strictly tenant-scoped with zero cross-tenant leakage
✔ [PASS] TC-AI-01: Grounded AI explanation incorporates real assessment context and returns verifiable legal citations

------------------------------------------------------------
TOTAL AUDIT TESTS: 24 | PASSED: 24 | FAILED: 0
------------------------------------------------------------
```

---

### 13. Cumulative Test Results Across Entire Platform

| Test Suite | Command | Total Tests | Passed | Failed |
|---|---|---|---|---|
| Statutory Tax Calculations | `npm run test:tax` | 12 | 12 | 0 |
| Security & Tenancy Hardening | `npm run test:security` | 22 | 22 | 0 |
| Business & Entity Management | `npm run test:business` | 12 | 12 | 0 |
| Grounded AI & Statutory RAG | `npm run test:ai` | 14 | 14 | 0 |
| Invoicing & VAT Compliance | `npm run test:invoicing` | 24 | 24 | 0 |
| Expense Scanning & Bookkeeping | `npm run test:expenses` | 24 | 24 | 0 |
| Tax Assessment Audit Suite | `npm run test:assessment` | 24 | 24 | 0 |
| **Total Platform Tests** | | **132** | **132** | **0** |

#### TypeScript Compilation Results
- **Backend**: `npm run build` (`prisma generate && tsc`) — **0 errors**.
- **Mobile**: `npx tsc --noEmit` — **0 errors**.

---

### 14. Security & Tenant Isolation Verification

1. **Cross-Tenant Assessment Request Blocked**: Verified via `TC-SEC-01` and `TC-SEC-02` that organisation B attempting to generate or retrieve an assessment for organisation A's business receives an immediate `403 Forbidden` error.
2. **Tenant Scoping in DB Queries**: All database queries for invoices and expense bills enforce `{ businessId: business.id }` after validating `business.organisationId === user.organisationId`.
3. **Assessment History Protection**: Listing assessments via `GET /api/v1/tax/assessments` validates that the requesting organisation owns the target business.
4. **Historical Immutability**: Superseded assessments cannot have their status altered (`400 Bad Request`).

---

### 15. Known Limitations

1. **Direct FTA Filing (EmaraTax API)**: Assessments are currently for compliance calculation, internal review, and return preparation. Automatic submission to EmaraTax requires a certified FTA tax agency license and dedicated FTA B2G API credentials.
2. **Apportionment of Overhead Input VAT**: For businesses with mixed taxable and exempt supplies, the engine currently defaults to standard input recovery unless specific exempt supply ratios are provided. Complex annual input tax apportionment will be supported in future tax agent tooling.

---

### 16. Outstanding Bugs

None. All 132 automated tests pass with 0 errors, and both backend and mobile codebases compile cleanly.

---

### 17. Manual Verification Guide

1. **Launch Backend**:
   ```bash
   cd backend && npm run start:dev
   ```
2. **Launch Mobile Application**:
   ```bash
   cd mobile && npx expo start
   ```
3. **Navigate to Tax Hub**: Tap the **Tax** tab in the bottom navigation bar.
4. **Inspect Overview**: Verify that live Corporate Tax and VAT (201) summary cards reflect persisted data.
5. **Inspect Corporate Tax Tab**: Tap **Corporate Tax** pill; inspect the Profit to Taxable Income Reconciliation table and statutory adjustments. Tap **Reassess** to verify live recalculation.
6. **Inspect VAT (201) Tab**: Tap **VAT (201)** pill; inspect the Form 201 Return boxes (Boxes 1, 3, 4, 5, 8, 9, 10, 11, 12).
7. **Test AI Grounding**: Tap the sparkle icon in the header, select a question (e.g. *"Why is my tax liability zero?"*), and verify that the AI responds with actual assessment figures and citations.

---

### 18. Phase 6.7 Integration Readiness

Phase 6.6 produces structured, persistent tax assessment outputs ready for consumption by Phase 6.7 (Tax Readiness, Reports & Dashboard Integration):
- `GET /api/v1/tax/assessments`: Exposes latest VAT and Corporate Tax assessments.
- Full `calculationJson` and `boxes` payloads contain all Form 201 box totals for official PDF report export.
- `complianceScore` and `complianceFindings` arrays provide structured inputs for compliance dashboard health rings and action checklists.
- Statutory filing deadlines and liability estimates are structured for the upcoming Phase 6.7 compliance calendar and push notification schedules.
