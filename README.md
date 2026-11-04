# Mizan (ميزان) — UAE Tax Intelligence & Financial Platform

Mizan is an intelligent, bilingual (English & Arabic RTL) UAE tax compliance, financial accounting, and trade license intelligence platform. It features deterministic statutory tax engines for UAE Corporate Tax (Federal Decree-Law No. 47 of 2022) and Value Added Tax (Federal Decree-Law No. 8 of 2017), on-device trade license scanning, e-invoicing (Peppol PINT), and a grounded statutory tax assistant.

---

## 🏛️ Architecture

- **Mobile Client (`mobile/`)**:
  - React Native & Expo SDK 58 (Expo Router)
  - Full English & Arabic (RTL) localization from Day 1
  - Edge-first Google ML Kit document scanner for Trade Licenses & Receipts
  - P&L, Invoicing with CBUAE Article 69 rates, Expense categorizer (Decision No. 17 of 2026 vs Article 53)
  - Grounded AI Tax Assistant conversational interface with statutory citations
  - Multi-business entity switcher (Mainland LLC, Free Zone FZE, Freelancer)

- **Backend API & Statutory Engine (`backend/`)**:
  - NestJS 11+ with TypeScript
  - Prisma ORM 6.19+ connected to PostgreSQL 16 (with `pgcrypto` and `pgvector`)
  - Deterministic Corporate Tax Engine & VAT 201 Box Engine
  - FTA Decision No. 3 of 2024 license-month registration deadline matrix (AED 10,000 late penalty shield)
  - Central Bank of the UAE (CBUAE) foreign exchange conversion
  - Grounded RAG statutory knowledge retrieval with Arabic text normalization

---

## 🚀 Quickstart

### 1. Backend Setup
```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```
Backend runs on `http://localhost:4000` with Swagger docs at `http://localhost:4000/api/docs`.

### 2. Mobile Setup
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

---

## ⚖️ Statutory Legal Framework Grounding
- **Federal Decree-Law No. 47 of 2022**: Taxation of Corporations and Businesses
- **Federal Decree-Law No. 8 of 2017**: Value Added Tax (VAT)
- **Ministerial Decision No. 73 of 2023**: Small Business Relief (SBR) up to AED 3,000,000 extended to 2029
- **Cabinet Decision No. 49 of 2023**: Natural Persons / Freelancers AED 1,000,000 turnover threshold
- **FTA Decision No. 17 of 2026**: Input VAT recovery on employee duty travel & accommodation
- **FTA Decision No. 3 of 2024 & CD 75 of 2023**: Corporate Tax registration deadlines and late penalties
