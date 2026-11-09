# Mizan (ميزان) - Feature Dependency Graph & Architecture Log

```mermaid
graph TD
    subgraph Identity & Tenant Layer
        AUTH[FEAT-AUTH-01: Production Auth]
        GUARD[FEAT-AUTH-03: Route Gatekeeper]
        ONBOARD[FEAT-AUTH-02: Mandatory Business Onboarding]
        BIZ_CTX[Business Multi-Entity Context]
    end

    subgraph Tax & Regulatory Core
        TAX_ENG[FEAT-TAX-01: Corporate Tax Engine]
        SBR_ENG[FEAT-TAX-02: Small Business Relief 0%]
        VAT_ENG[FEAT-VAT-01: VAT 201 Engine]
    end

    subgraph Operational Tools
        OCR_LIC[FEAT-OCR-01: Trade License OCR]
        OCR_EXP[FEAT-OCR-02: Expense Scanner]
        INVOICE[FEAT-INV-01: Compliant Invoicing]
        DASH[FEAT-DASH-01: EmaraTax Dashboard]
        AI_ASST[FEAT-AI-01: Grounded AI Assistant]
    end

    AUTH --> GUARD
    GUARD --> ONBOARD
    ONBOARD --> BIZ_CTX
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
