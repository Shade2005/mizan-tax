// ============================================================================
// Mizan (ميزان) - Unified Compliance Monitoring & Action Centre Service
// Aggregates, deduplicates, and resolves tax & regulatory findings across:
// VAT, Corporate Tax, Bookkeeping, Commercial Licensing, and Deadlines
// ============================================================================

import { Injectable, Logger, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import { ComplianceFindingDto } from './dashboard.types';

@Injectable()
export class ComplianceActionService {
  private readonly logger = new Logger(ComplianceActionService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Aggregates all open and actionable compliance findings for a business without duplicates.
   */
  public async getActiveFindings(businessId: string): Promise<ComplianceFindingDto[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        taxRegistrations: true,
        invoices: true,
        expenseBills: true,
        complianceObligations: true,
        taxAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found.`);
    }

    const findingsMap = new Map<string, ComplianceFindingDto>();

    const vatReg = business.taxRegistrations.find((r) => r.taxType === 'VAT');
    const ctReg = business.taxRegistrations.find((r) => r.taxType === 'CORPORATE_TAX');

    const isVatRegistered = vatReg && (vatReg.status === 'REGISTERED' || !!vatReg.trn);
    const isCtRegistered = ctReg && (ctReg.status === 'REGISTERED' || !!ctReg.trn);

    // ------------------------------------------------------------------------
    // 1. CORPORATE TAX REGISTRATION FINDING
    // ------------------------------------------------------------------------
    if (!isCtRegistered || !ctReg?.trn) {
      const key = `CT_REGISTRATION_REQUIRED_${business.id}`;
      findingsMap.set(key, {
        id: key,
        findingKey: key,
        category: 'CORPORATE_TAX',
        severity: 'CRITICAL',
        title: 'Mandatory Corporate Tax Registration Missing',
        description: 'All UAE businesses and juridical entities must obtain a Corporate Tax TRN under FTA Decision No. 3 of 2024.',
        statutoryReference: 'FTA Decision No. 3 of 2024 & Cabinet Decision No. 75 of 2023',
        potentialPenaltyAED: '10000.00',
        impactScore: 25,
        status: 'OPEN',
        actionRoute: '/profile',
        actionLabel: 'Complete Registration Profile',
        createdAt: business.createdAt.toISOString(),
      });
    }

    // ------------------------------------------------------------------------
    // 2. MANDATORY VAT REGISTRATION THRESHOLD EXCEEDED
    // ------------------------------------------------------------------------
    const totalSalesAED = business.invoices
      .filter((inv) => inv.status !== 'VOID' && inv.status !== 'DRAFT')
      .reduce((acc, inv) => acc.plus(new Decimal(inv.totalAmountAED.toString())), new Decimal(0));

    if (totalSalesAED.gte(new Decimal(375000)) && (!isVatRegistered || !vatReg?.trn)) {
      const key = `VAT_REGISTRATION_THRESHOLD_${business.id}`;
      findingsMap.set(key, {
        id: key,
        findingKey: key,
        category: 'VAT',
        severity: 'CRITICAL',
        title: 'Mandatory VAT Registration Threshold Exceeded',
        description: `Taxable sales of AED ${totalSalesAED.toFixed(2)} exceed the AED 375,000 mandatory threshold. VAT registration is legally required.`,
        statutoryReference: 'Federal Decree-Law No. 8 of 2017, Article 13 & Cabinet Decision No. 40 of 2017',
        potentialPenaltyAED: '10000.00',
        impactScore: 30,
        status: 'OPEN',
        actionRoute: '/(tabs)/tax',
        actionLabel: 'Register for VAT on EmaraTax',
        createdAt: new Date().toISOString(),
      });
    }

    // ------------------------------------------------------------------------
    // 3. OVERDUE COMPLIANCE OBLIGATIONS
    // ------------------------------------------------------------------------
    for (const ob of business.complianceObligations) {
      if (ob.status === 'OVERDUE') {
        const key = `OBLIGATION_${ob.id}`;
        findingsMap.set(key, {
          id: ob.id,
          findingKey: key,
          category: ob.obligationType.startsWith('VAT') ? 'VAT' : ob.obligationType.startsWith('CT') ? 'CORPORATE_TAX' : 'DEADLINE',
          severity: 'CRITICAL',
          title: `Overdue: ${ob.title}`,
          description: ob.description || 'Statutory filing or payment deadline has passed.',
          statutoryReference: ob.legalReference,
          potentialPenaltyAED: ob.penaltyAmountAED ? ob.penaltyAmountAED.toString() : '1000.00',
          impactScore: 20,
          status: 'OPEN',
          actionRoute: '/(tabs)/tax',
          actionLabel: 'Settle Obligation',
          createdAt: ob.createdAt.toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------------
    // 4. UNREVIEWED EXPENSES BACKLOG
    // ------------------------------------------------------------------------
    const unreviewedExpenses = business.expenseBills.filter((e) => e.status === 'REVIEW_REQUIRED');
    if (unreviewedExpenses.length > 0) {
      const key = `EXPENSES_PENDING_REVIEW_${business.id}`;
      findingsMap.set(key, {
        id: key,
        findingKey: key,
        category: 'BOOKKEEPING',
        severity: unreviewedExpenses.length > 5 ? 'HIGH' : 'MEDIUM',
        title: `${unreviewedExpenses.length} Expense(s) Awaiting Review`,
        description: 'Scanned receipts require verification of supplier TRN, amounts, and tax categorisation before posting to the tax ledger.',
        statutoryReference: 'Federal Decree-Law No. 8 of 2017, Article 78',
        impactScore: Math.min(15, unreviewedExpenses.length * 3),
        status: 'OPEN',
        actionRoute: '/expenses/review',
        actionLabel: 'Review Scanned Expenses',
        createdAt: new Date().toISOString(),
      });
    }

    // ------------------------------------------------------------------------
    // 5. TRADE LICENSE EXPIRY WARNING
    // ------------------------------------------------------------------------
    if (business.licenseExpiryDate) {
      const expiry = new Date(business.licenseExpiryDate);
      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        const key = `LICENSE_EXPIRED_${business.id}`;
        findingsMap.set(key, {
          id: key,
          findingKey: key,
          category: 'PROFILE',
          severity: 'CRITICAL',
          title: 'Commercial Trade License Expired',
          description: `Trade license ${business.tradeLicenseNumber} expired ${Math.abs(daysLeft)} days ago. Immediate renewal is required.`,
          statutoryReference: 'Federal Decree-Law No. 32 of 2021 on Commercial Companies',
          potentialPenaltyAED: '5000.00',
          impactScore: 25,
          status: 'OPEN',
          actionRoute: '/profile',
          actionLabel: 'Update Trade License',
          createdAt: business.updatedAt.toISOString(),
        });
      } else if (daysLeft <= 30) {
        const key = `LICENSE_EXPIRING_SOON_${business.id}`;
        findingsMap.set(key, {
          id: key,
          findingKey: key,
          category: 'PROFILE',
          severity: 'HIGH',
          title: `Trade License Expires in ${daysLeft} Days`,
          description: `Commercial license ${business.tradeLicenseNumber} expires on ${expiry.toISOString().slice(0, 10)}.`,
          statutoryReference: 'Federal Decree-Law No. 32 of 2021',
          potentialPenaltyAED: '2000.00',
          impactScore: 10,
          status: 'OPEN',
          actionRoute: '/profile',
          actionLabel: 'Renew License',
          createdAt: business.updatedAt.toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------------
    // 6. TAX ASSESSMENT SPECIFIC WARNINGS
    // ------------------------------------------------------------------------
    const latestAssessments = business.taxAssessments;
    for (const assessment of latestAssessments) {
      const calc = (assessment.calculationJson as any) || {};
      if (calc.complianceWarnings && Array.isArray(calc.complianceWarnings)) {
        for (const warn of calc.complianceWarnings) {
          const key = `ASSESSMENT_WARN_${assessment.id}_${warn.slice(0, 20).replace(/\s+/g, '_')}`;
          if (!findingsMap.has(key)) {
            findingsMap.set(key, {
              id: key,
              findingKey: key,
              category: assessment.taxType === 'VAT' ? 'VAT' : 'CORPORATE_TAX',
              severity: 'HIGH',
              title: `${assessment.taxType} Assessment Notice`,
              description: warn,
              statutoryReference: assessment.taxType === 'VAT' ? 'Federal Decree-Law No. 8 of 2017' : 'Federal Decree-Law No. 47 of 2022',
              impactScore: 10,
              status: 'OPEN',
              actionRoute: '/(tabs)/tax',
              actionLabel: 'View Assessment Audit',
              createdAt: assessment.createdAt.toISOString(),
            });
          }
        }
      }
    }

    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return Array.from(findingsMap.values()).sort((a, b) => {
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    });
  }

  /**
   * Resolves or updates a compliance obligation/finding.
   */
  public async resolveObligation(
    obligationId: string,
    businessId: string,
    organisationId: string,
    userId: string,
    resolutionNotes?: string
  ) {
    const obligation = await this.prisma.complianceObligation.findUnique({
      where: { id: obligationId },
      include: { business: true },
    });

    if (!obligation) {
      throw new NotFoundException(`Compliance obligation ${obligationId} not found.`);
    }

    if (obligation.business.organisationId !== organisationId) {
      throw new ForbiddenException('Access denied: You do not own this business.');
    }

    return this.prisma.complianceObligation.update({
      where: { id: obligationId },
      data: {
        status: 'COMPLETED',
        completionDate: new Date(),
        resolvedById: userId,
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes || 'Marked as completed by user.',
      },
    });
  }
}
