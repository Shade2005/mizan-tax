# Mizan (ميزان) - UAE Tax Intelligence Platform: Feature Registry

This registry tracks the status, tier, and architectural boundaries of all core platform capabilities.

| Feature ID | Feature Name | Description | Module / Scope | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-AUTH-01** | Production Authentication | Email/Password, Firebase Identity Engine & Session Persistence | `mobile/src/services` & `backend/src/auth` | Active |
| **FEAT-AUTH-02** | Mandatory Business Onboarding | Non-skippable UAE Trade License & Legal Entity registration flow | `mobile/app/onboarding/business.tsx` | Active |
| **FEAT-ONBD-02** | 3-Way Trade License Entry | Tri-modal onboarding: 📷 Camera OCR, 📁 PDF Document & Image Picker (`expo-document-picker`) with permission gating, or ✍️ Manual Form | `mobile/app/onboarding/business.tsx` | Active |
| **FEAT-PREF-01** | App Preferences & Feedback | Global toggle for Haptics & Camera Shutter Sound (both default OFF) | `mobile/src/utils/preferences.ts` & `mobile/app/(tabs)/profile.tsx` | Active |
| **FEAT-PERM-01** | Auto Camera Permission | Automatic native OS permission prompt upon screen mount without manual button clicks | `mobile/app/scan/index.tsx` & `mobile/app/expenses/scan.tsx` | Active |
| **FEAT-AUTH-03** | Gatekeeper Route Guard | Strict session & entity gating prohibiting unauthorized tab access | `mobile/app/index.tsx` & `mobile/app/(tabs)/_layout.tsx` | Active |
| **FEAT-AUTH-04** | 1-Tap Google Sign-In | Native Google OAuth authentication via Firebase Auth and Google Play Services | `mobile/app/auth` & `mobile/android` | Active |
| **FEAT-DATA-01** | Cloud Firestore Data Layer | Serverless multi-tenant NoSQL data store with hardened Security Rules (`firestore.rules`) | `mobile/src/services/firestore.service.ts` & `firestore.rules` | Active |
| **FEAT-TAX-01** | UAE Corporate Tax Engine | Federal Decree-Law No. 47/2022 & 9% calculation above AED 375k | `backend/src/tax-engine` & `mobile/app/(tabs)/tax.tsx` | Active |
| **FEAT-TAX-02** | Small Business Relief (SBR) | Ministerial Decision No. 73/2023 0% relief calculation up to AED 3M | `backend/src/tax-engine` | Active |
| **FEAT-VAT-01** | VAT 201 Engine | Federal Decree-Law No. 8/2017 5% Standard, 0% Zero-Rated & Exempt | `backend/src/tax-engine` | Active |
| **FEAT-OCR-01** | Trade License OCR | Automated recognition of UAE Trade Licenses across all 7 Emirates | `backend/src/ocr` & `mobile/app/scan` | Active |
| **FEAT-OCR-02** | Expense & Receipt Scanner | Receipt OCR parsing with VAT extraction and categorization | `mobile/app/expenses/scan.tsx` | Active |
| **FEAT-INV-01** | UAE Compliant Tax Invoicing | Bilingual Arabic/English tax invoices with QR & TRN formatting | `backend/src/invoicing` & `mobile/app/(tabs)/invoices.tsx` | Active |
| **FEAT-AI-01** | Grounded Tax AI Assistant | Statutory FTA-grounded advisory with zero hallucination guarantee | `backend/src/ai` & `mobile/app/learn/chat.tsx` | Active |
| **FEAT-DASH-01** | EmaraTax Calendar & Deadlines | Automated tax filing calendars & trade license renewal tracking | `backend/src/dashboard` & `mobile/app/(tabs)/index.tsx` | Active |
