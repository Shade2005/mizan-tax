# Mizan (ميزان) - Feature Dependency Graph & Architecture Log

```mermaid
graph TD
    subgraph Identity & Tenant Layer
        AUTH[FEAT-AUTH-01: Production Auth]
        GOOGLE[FEAT-AUTH-04: 1-Tap Google Sign-In]
        GUARD[FEAT-AUTH-03: Route Gatekeeper]
        ONBOARD[FEAT-AUTH-02: Mandatory Business Onboarding]
        ONBOARD_TRI[FEAT-ONBD-02: 3-Way Entry - Scan, Upload, Manual]
        FIRESTORE[FEAT-DATA-01: Cloud Firestore Multi-Tenant Store]
        BIZ_CTX[Business Multi-Entity Context]
        PREFS[FEAT-PREF-01: App Preferences & Silent Defaults]
    end

    subgraph Tax & Regulatory Core
        TAX_ENG[FEAT-TAX-01: Corporate Tax Engine]
        SBR_ENG[FEAT-TAX-02: Small Business Relief 0%]
        VAT_ENG[FEAT-VAT-01: VAT 201 Engine]
    end

    subgraph Operational Tools
        OCR_LIC[FEAT-OCR-01: Trade License OCR]
        OCR_EXP[FEAT-OCR-02: Expense Scanner]
        PERM[FEAT-PERM-01: Auto Camera Permission Prompt]
        INVOICE[FEAT-INV-01: Compliant Invoicing]
        DASH[FEAT-DASH-01: EmaraTax Dashboard]
        AI_ASST[FEAT-AI-01: Grounded AI Assistant]
    end

    AUTH --> GUARD
    GOOGLE --> GUARD
    GUARD --> ONBOARD
    ONBOARD --> ONBOARD_TRI
    ONBOARD_TRI --> OCR_LIC
    ONBOARD_TRI --> FIRESTORE
    PERM --> OCR_LIC
    PERM --> OCR_EXP
    PREFS --> OCR_EXP
    PREFS --> OCR_LIC
    FIRESTORE --> BIZ_CTX
    BIZ_CTX --> DASH
    BIZ_CTX --> TAX_ENG
    BIZ_CTX --> SBR_ENG
    BIZ_CTX --> VAT_ENG
    BIZ_CTX --> INVOICE
    BIZ_CTX --> OCR_LIC
    BIZ_CTX --> OCR_EXP
    TAX_ENG --> AI_ASST
```

### Dependency Audit
- **Entry Security**: Users entering the mobile application must pass `AUTH` and verify identity.
- **Entity Pre-condition**: `DASH`, `TAX_ENG`, and `INVOICE` require `activeBusiness` with a valid `tradeLicenseNumber` and jurisdiction configuration.
- **Onboarding Gate**: If `businesses.length == 0`, the navigation stack intercepts routing and locks into `ONBOARD` until valid company details are committed.
