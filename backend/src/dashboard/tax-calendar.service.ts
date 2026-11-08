// ============================================================================
// Mizan (ميزان) - UAE Business Tax Calendar & Deadline Management Service
// Computes statutory UAE tax deadlines strictly grounded in Federal Laws & Decisions:
// 1. VAT Return & Payment: 28th of the month following period end (FDL 8/2017 Art. 71)
// 2. CT Return & Payment: within 9 months from the end of the Tax Period (FDL 47/2022 Art. 48)
// 3. CT Registration: FTA Decision No. 3 of 2024 timeline (Cabinet Decision 75/2023 penalties)
// 4. Trade License Renewal: Economic Department / Freezone expiry tracking
// ============================================================================

import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from 'decimal.js';
import { CalendarDeadlineDto } from './dashboard.types';

@Injectable()
export class TaxCalendarService {
  private readonly logger = new Logger(TaxCalendarService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Computes authoritative statutory deadlines for a business and synchronizes
   * persistent ComplianceObligation records in the database.
   */
  public async getBusinessTaxDeadlines(
    businessId: string,
    currentDate: Date = new Date()
  ): Promise<CalendarDeadlineDto[]> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        taxRegistrations: true,
        complianceObligations: true,
      },
    });

    if (!business) {
      return [];
    }

    const deadlines: CalendarDeadlineDto[] = [];
    const vatReg = business.taxRegistrations.find((r) => r.taxType === 'VAT');
    const ctReg = business.taxRegistrations.find((r) => r.taxType === 'CORPORATE_TAX');

    // ------------------------------------------------------------------------
    // 1. VAT RETURN & PAYMENT DEADLINES (FDL 8/2017, Art. 71)
    // ------------------------------------------------------------------------
    const isVatRegistered = vatReg && (vatReg.status === 'REGISTERED' || !!vatReg.trn);
    if (isVatRegistered) {
      const vatDeadline = this.calculateNextVatDeadline(currentDate);
      deadlines.push(vatDeadline);
    } else {
      deadlines.push({
        id: `vat-threshold-monitor-${business.id}`,
        obligationType: 'VAT_REGISTRATION',
        title: 'VAT Registration Threshold Monitoring',
        description: 'Monitor rolling 12-month taxable supplies against AED 375,000 mandatory registration threshold.',
        legalReference: 'Federal Decree-Law No. 8 of 2017, Article 13',
        calculatedDueDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString(),
        daysRemaining: Math.ceil((new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)),
        status: 'UPCOMING',
        severity: 'MEDIUM',
        potentialPenaltyAED: '10000.00',
        actionRequired: 'Review monthly taxable revenue ledger to ensure timely registration before exceeding AED 375,000.',
      });
    }

    // ------------------------------------------------------------------------
    // 2. CORPORATE TAX RETURN & PAYMENT DEADLINE (FDL 47/2022, Art. 48)
    // ------------------------------------------------------------------------
    const ctDeadline = this.calculateCorporateTaxFilingDeadline(business, currentDate);
    deadlines.push(ctDeadline);

    // ------------------------------------------------------------------------
    // 3. CORPORATE TAX REGISTRATION DEADLINE (FTA Decision No. 3 of 2024)
    // ------------------------------------------------------------------------
    const isCtRegistered = ctReg && (ctReg.status === 'REGISTERED' || !!ctReg.trn);
    if (!isCtRegistered) {
      const ctRegDeadline = this.calculateCorporateTaxRegistrationDeadline(business, currentDate);
      deadlines.push(ctRegDeadline);
    }

    // ------------------------------------------------------------------------
    // 4. TRADE LICENSE RENEWAL DEADLINE
    // ------------------------------------------------------------------------
    if (business.licenseExpiryDate) {
      const licenseExpiry = new Date(business.licenseExpiryDate);
      const daysRemaining = Math.ceil((licenseExpiry.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' = 'UPCOMING';
      let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

      if (daysRemaining < 0) {
        status = 'OVERDUE';
        severity = 'CRITICAL';
      } else if (daysRemaining <= 30) {
        status = 'DUE_SOON';
        severity = 'HIGH';
      }

      deadlines.push({
        id: `trade-license-renewal-${business.id}`,
        obligationType: 'TRADE_LICENSE_RENEWAL',
        title: 'Commercial Trade License Renewal',
        description: `Renew license ${business.tradeLicenseNumber} issued by ${business.licensingAuthority || 'DED'}.`,
        legalReference: 'Federal Decree-Law No. 32 of 2021 on Commercial Companies',
        calculatedDueDate: licenseExpiry.toISOString(),
        daysRemaining,
        status,
        severity,
        potentialPenaltyAED: '5000.00',
        actionRequired: daysRemaining < 0 ? 'Urgent renewal required: Expired trade license impairs legal status and bank accounts.' : 'Initiate renewal with issuing licensing authority.',
      });
    }

    // Sort deadlines by urgency (overdue first, then soonest due date)
    deadlines.sort((a, b) => {
      const dateA = new Date(a.calculatedDueDate).getTime();
      const dateB = new Date(b.calculatedDueDate).getTime();
      return dateA - dateB;
    });

    // Synchronize with database compliance obligations
    await this.syncComplianceObligations(business.id, deadlines);

    return deadlines;
  }

  /**
   * Calculates the statutory VAT return & payment deadline:
   * Article 71: Must be submitted and paid by the 28th of the month following the end of the tax period.
   */
  public calculateNextVatDeadline(currentDate: Date): CalendarDeadlineDto {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    let dueDate: Date;
    let periodTitle: string;

    if (month < 3) {
      const q4DueDate = new Date(year, 0, 28);
      if (currentDate <= q4DueDate) {
        dueDate = q4DueDate;
        periodTitle = `VAT 201 Return - Q4 ${year - 1} (Oct 1 - Dec 31, ${year - 1})`;
      } else {
        dueDate = new Date(year, 3, 28);
        periodTitle = `VAT 201 Return - Q1 ${year} (Jan 1 - Mar 31, ${year})`;
      }
    } else if (month < 6) {
      const q1DueDate = new Date(year, 3, 28);
      if (currentDate <= q1DueDate) {
        dueDate = q1DueDate;
        periodTitle = `VAT 201 Return - Q1 ${year} (Jan 1 - Mar 31, ${year})`;
      } else {
        dueDate = new Date(year, 6, 28);
        periodTitle = `VAT 201 Return - Q2 ${year} (Apr 1 - Jun 30, ${year})`;
      }
    } else if (month < 9) {
      const q2DueDate = new Date(year, 6, 28);
      if (currentDate <= q2DueDate) {
        dueDate = q2DueDate;
        periodTitle = `VAT 201 Return - Q2 ${year} (Apr 1 - Jun 30, ${year})`;
      } else {
        dueDate = new Date(year, 9, 28);
        periodTitle = `VAT 201 Return - Q3 ${year} (Jul 1 - Sep 30, ${year})`;
      }
    } else {
      const q3DueDate = new Date(year, 9, 28);
      if (currentDate <= q3DueDate) {
        dueDate = q3DueDate;
        periodTitle = `VAT 201 Return - Q3 ${year} (Jul 1 - Sep 30, ${year})`;
      } else {
        dueDate = new Date(year + 1, 0, 28);
        periodTitle = `VAT 201 Return - Q4 ${year} (Oct 1 - Dec 31, ${year})`;
      }
    }

    const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    let status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' = 'UPCOMING';
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    if (daysRemaining < 0) {
      status = 'OVERDUE';
      severity = 'CRITICAL';
    } else if (daysRemaining <= 14) {
      status = 'DUE_SOON';
      severity = 'HIGH';
    }

    return {
      id: `vat-return-${dueDate.toISOString().slice(0, 10)}`,
      obligationType: 'VAT_RETURN_FILING',
      title: periodTitle,
      description: 'Submit VAT Form 201 and settle net tax liability via EmaraTax portal.',
      legalReference: 'Federal Decree-Law No. 8 of 2017 on Value Added Tax, Article 71',
      calculatedDueDate: dueDate.toISOString(),
      daysRemaining,
      status,
      severity,
      potentialPenaltyAED: '1000.00',
      actionRequired: daysRemaining <= 7 ? 'Reconcile sales and purchase invoices immediately and submit Form 201.' : 'Ensure all sales and purchase records for the quarter are recorded.',
    };
  }

  /**
   * Calculates Corporate Tax filing deadline:
   * Article 48: 9 months from the end of the Tax Period.
   */
  public calculateCorporateTaxFilingDeadline(business: any, currentDate: Date): CalendarDeadlineDto {
    const currentYear = currentDate.getFullYear();
    let taxYear = currentYear - 1;
    let dueDate = new Date(currentYear, 8, 30);

    if (currentDate > dueDate) {
      taxYear = currentYear;
      dueDate = new Date(currentYear + 1, 8, 30);
    }

    const daysRemaining = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    let status: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' = 'UPCOMING';
    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    if (daysRemaining < 0) {
      status = 'OVERDUE';
      severity = 'CRITICAL';
    } else if (daysRemaining <= 30) {
      status = 'DUE_SOON';
      severity = 'HIGH';
    }

    return {
      id: `corporate-tax-filing-${taxYear}`,
      obligationType: 'CT_RETURN_FILING',
      title: `Corporate Tax Return & Payment (Tax Year ${taxYear})`,
      description: `Submit Corporate Tax return and settle liability under Federal Decree-Law No. 47 of 2022 within 9 months of period close.`,
      legalReference: 'Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses, Article 48',
      calculatedDueDate: dueDate.toISOString(),
      daysRemaining,
      status,
      severity,
      potentialPenaltyAED: '500.00',
      actionRequired: daysRemaining <= 30 ? 'Finalise financial statements, tax adjustments, and file on EmaraTax.' : 'Maintain audited / compliant financial statements and ledger records.',
    };
  }

  /**
   * Calculates Corporate Tax registration deadline under FTA Decision No. 3 of 2024.
   */
  public calculateCorporateTaxRegistrationDeadline(business: any, currentDate: Date): CalendarDeadlineDto {
    const deadlineDate = new Date(2025, 4, 31);
    const daysRemaining = Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: `corporate-tax-reg-${business.id}`,
      obligationType: 'CT_REGISTRATION',
      title: 'Mandatory Corporate Tax Registration',
      description: 'Obtain Corporate Tax Registration Number (CT TRN) via FTA EmaraTax portal.',
      legalReference: 'FTA Decision No. 3 of 2024 & Cabinet Decision No. 75 of 2023',
      calculatedDueDate: deadlineDate.toISOString(),
      daysRemaining,
      status: daysRemaining < 0 ? 'OVERDUE' : 'DUE_SOON',
      severity: 'CRITICAL',
      potentialPenaltyAED: '10000.00',
      actionRequired: 'URGENT: Submit Corporate Tax registration on EmaraTax to avoid or mitigate the AED 10,000 penalty.',
    };
  }

  private async syncComplianceObligations(businessId: string, deadlines: CalendarDeadlineDto[]): Promise<void> {
    try {
      for (const d of deadlines) {
        const typeEnum = d.obligationType as any;
        const existing = await this.prisma.complianceObligation.findFirst({
          where: {
            businessId,
            obligationType: typeEnum,
            calculatedDueDate: new Date(d.calculatedDueDate),
          },
        });

        if (!existing) {
          await this.prisma.complianceObligation.create({
            data: {
              businessId,
              obligationType: typeEnum,
              title: d.title,
              description: d.description,
              legalReference: d.legalReference,
              calculatedDueDate: new Date(d.calculatedDueDate),
              status: d.status === 'OVERDUE' ? 'OVERDUE' : 'PENDING',
              severity: d.severity,
              penaltyAmountAED: new Decimal(d.potentialPenaltyAED),
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sync compliance obligations for business ${businessId}: ${err.message}`);
    }
  }
}
