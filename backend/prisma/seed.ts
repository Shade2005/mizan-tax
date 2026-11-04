// ============================================================================
// Mizan (ميزان) - Database Seed Script
// Seeds default Organisation, User, Business (Al Nahda Trading LLC), Chart of Accounts
// ============================================================================

import {
  PrismaClient,
  UserRole,
  LegalEntityType,
  JurisdictionType,
  LicenseVerificationStatus,
  VatRegistrationStatus,
  TaxType,
  AccountType,
  AccountSubtype,
  ObligationType,
  ObligationStatus,
} from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Mizan UAE Tax Database Seed on Neon PostgreSQL...');

  // 1. Create or upsert Demo User
  const user = await prisma.user.upsert({
    where: { email: 'hamza@alnahda.ae' },
    update: {},
    create: {
      email: 'hamza@alnahda.ae',
      fullName: 'Hamza Al Mansoori',
      phone: '+971501234567',
      isBiometricOn: true,
      isActive: true,
    },
  });
  console.log(`✅ User verified: ${user.fullName} (${user.email})`);

  // 2. Create or upsert Organisation
  const organisation = await prisma.organisation.upsert({
    where: { id: 'org-alnahda-demo-001' },
    update: {},
    create: {
      id: 'org-alnahda-demo-001',
      name: 'Al Nahda Enterprises',
      legalName: 'Al Nahda Enterprises Group LLC',
      isPractice: false,
    },
  });
  console.log(`✅ Organisation verified: ${organisation.name}`);

  // 3. Link Membership
  await prisma.membership.upsert({
    where: { id: 'mem-hamza-alnahda-001' },
    update: {},
    create: {
      id: 'mem-hamza-alnahda-001',
      userId: user.id,
      organisationId: organisation.id,
      role: UserRole.ADMIN,
    },
  });

  // 4. Create or upsert Business (Al Nahda Trading LLC)
  const business = await prisma.business.upsert({
    where: {
      organisationId_tradeLicenseNumber: {
        organisationId: organisation.id,
        tradeLicenseNumber: '1234567',
      },
    },
    update: {},
    create: {
      organisationId: organisation.id,
      tradeLicenseNumber: '1234567',
      legalName: 'Al Nahda Trading LLC',
      tradeName: 'Al Nahda Trading',
      legalEntityType: LegalEntityType.LLC,
      jurisdictionType: JurisdictionType.MAINLAND,
      licensingAuthority: 'Department of Economy and Tourism (DET)',
      emirate: 'Dubai',
      licenseIssueDate: new Date('2024-01-15'),
      licenseExpiryDate: new Date('2027-01-15'),
      verificationStatus: LicenseVerificationStatus.REGISTRY_VERIFIED,
      isQfzpEligible: false,
      isNaturalPersonBiz: false,
      businessActivities: ['General Trading', 'IT Equipment Wholesale'],
    },
  });
  console.log(`✅ Business verified: ${business.legalName} [Lic: ${business.tradeLicenseNumber}]`);

  // 4b. Tax Registrations (VAT & Corporate Tax)
  await prisma.taxRegistration.upsert({
    where: {
      businessId_taxType: {
        businessId: business.id,
        taxType: TaxType.VAT,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      taxType: TaxType.VAT,
      trn: '100234567800003',
      status: VatRegistrationStatus.REGISTERED,
      registrationDate: new Date('2024-02-01'),
      effectiveDate: new Date('2024-02-01'),
    },
  });

  await prisma.taxRegistration.upsert({
    where: {
      businessId_taxType: {
        businessId: business.id,
        taxType: TaxType.CORPORATE_TAX,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      taxType: TaxType.CORPORATE_TAX,
      trn: 'CT-1002345678',
      status: VatRegistrationStatus.REGISTERED,
      registrationDate: new Date('2024-05-10'),
    },
  });
  console.log('✅ VAT & Corporate Tax registrations registered with FTA TRNs');

  // 5. Seed UAE Standard Chart of Accounts (COA)
  const standardAccounts = [
    { code: '1010', name: 'Emirates NBD Operating Account', type: AccountType.ASSET, subtype: AccountSubtype.CASH_EQUIVALENTS },
    { code: '1200', name: 'Accounts Receivable (Trade Debtors)', type: AccountType.ASSET, subtype: AccountSubtype.ACCOUNTS_RECEIVABLE },
    { code: '2010', name: 'Accounts Payable (Trade Creditors)', type: AccountType.LIABILITY, subtype: AccountSubtype.ACCOUNTS_PAYABLE },
    { code: '2100', name: 'Output VAT Payable (Box 1)', type: AccountType.LIABILITY, subtype: AccountSubtype.VAT_PAYABLE },
    { code: '2110', name: 'Input VAT Recoverable (Box 9)', type: AccountType.LIABILITY, subtype: AccountSubtype.VAT_PAYABLE },
    { code: '2120', name: 'Reverse Charge Mechanism VAT (Box 3/10)', type: AccountType.LIABILITY, subtype: AccountSubtype.VAT_PAYABLE },
    { code: '2200', name: 'Corporate Tax Provision', type: AccountType.LIABILITY, subtype: AccountSubtype.CT_PROVISION },
    { code: '4000', name: 'Standard Rated Sales (5% VAT)', type: AccountType.REVENUE, subtype: AccountSubtype.OPERATING_REVENUE },
    { code: '4100', name: 'Zero-Rated Export Sales (0% VAT)', type: AccountType.REVENUE, subtype: AccountSubtype.ZERO_RATED_REVENUE },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', type: AccountType.EXPENSE, subtype: AccountSubtype.COGS },
    { code: '6010', name: 'Employee Duty Travel & Hotels (Dec 17)', type: AccountType.EXPENSE, subtype: AccountSubtype.OPERATING_EXPENSE },
    { code: '6020', name: 'Client Entertainment (Art 53 Blocked / Art 32 50% Cap)', type: AccountType.EXPENSE, subtype: AccountSubtype.ENTERTAINMENT_EXPENSE },
    { code: '6030', name: 'Foreign Cloud & SaaS Services (RCM Art 48)', type: AccountType.EXPENSE, subtype: AccountSubtype.RCM_SERVICE_EXPENSE },
  ];

  for (const acc of standardAccounts) {
    await prisma.account.upsert({
      where: {
        businessId_accountCode: {
          businessId: business.id,
          accountCode: acc.code,
        },
      },
      update: {},
      create: {
        businessId: business.id,
        accountCode: acc.code,
        accountName: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        currency: 'AED',
        isSystemAccount: true,
        isActive: true,
      },
    });
  }
  console.log(`✅ Standard Chart of Accounts seeded (${standardAccounts.length} accounts)`);

  // 6. Seed Compliance Obligations
  await prisma.complianceObligation.upsert({
    where: { id: 'obl-ct-reg-1234567' },
    update: {},
    create: {
      id: 'obl-ct-reg-1234567',
      businessId: business.id,
      obligationType: ObligationType.CT_REGISTRATION,
      title: 'Corporate Tax Registration Deadline',
      description: 'Mandatory registration on EmaraTax based on license issuance month.',
      calculatedDueDate: new Date('2026-07-31'),
      status: ObligationStatus.PENDING,
      penaltyAmountAED: new Decimal(10000),
      legalReference: 'FTA Decision No. 3 of 2024 & Cabinet Decision No. 75 of 2023',
    },
  });

  await prisma.complianceObligation.upsert({
    where: { id: 'obl-vat-q2-1234567' },
    update: {},
    create: {
      id: 'obl-vat-q2-1234567',
      businessId: business.id,
      obligationType: ObligationType.VAT_RETURN_FILING,
      title: 'Q2 VAT Return Submission (Form 201)',
      description: 'Quarterly tax declaration for Box 1 output and Box 9 input recovery.',
      calculatedDueDate: new Date('2026-08-28'),
      status: ObligationStatus.PENDING,
      penaltyAmountAED: new Decimal(1000),
      legalReference: 'Federal Decree-Law No. 8 of 2017 - Article 67',
    },
  });
  console.log('✅ Statutory compliance obligations seeded');

  console.log('🎉 Seed completed successfully on Neon PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
