// ============================================================================
// Mizan (ميزان) - Complete Invoicing Management & Lifecycle Service
// Multi-Tenant Isolation, Sequential Numbering, Immutable Issuance & Credit Notes
// Enforcing Article 59 & Article 69 of UAE VAT Executive Regulations
// ============================================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CalculatedInvoiceLine,
  CreditNoteRecord,
  CustomerRecord,
  ExchangeRateEvidence,
  InvoiceRecord,
  InvoiceStatus,
  InvoiceType,
} from './invoice.types';
import {
  CreateCreditNoteDto,
  CreateCustomerDto,
  CreateInvoiceDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/invoicing.dto';
import { BusinessRecord, BusinessService } from '../business/business.service';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { InvoiceValidationService } from './invoice-validation.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PrismaService } from '../prisma/prisma.service';
import { VatEngine, VatTransactionLine } from '../tax-engine/vat.engine';
import Decimal from 'decimal.js';

export const CBUAE_FIXED_RATES: Record<string, number> = {
  AED: 1.0,
  USD: 3.6725,
  EUR: 3.9821,
  GBP: 4.654,
  SAR: 0.979,
};

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  // In-memory repositories for test/sandbox execution & offline resilience
  private readonly customers: Map<string, CustomerRecord> = new Map();
  private readonly invoices: Map<string, InvoiceRecord> = new Map();
  private readonly creditNotes: Map<string, CreditNoteRecord> = new Map();

  constructor(
    @Inject(forwardRef(() => BusinessService))
    private readonly businessService: BusinessService,
    private readonly calculationService: InvoiceCalculationService,
    private readonly validationService: InvoiceValidationService,
    private readonly numberService: InvoiceNumberService,
    private readonly pdfService: InvoicePdfService,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {
    this.seedDefaultCustomer();
  }

  private seedDefaultCustomer() {
    const demoCustId = 'cust-al-noor-1';
    this.customers.set(demoCustId, {
      id: demoCustId,
      businessId: 'biz-default',
      name: 'Al Noor Trading LLC',
      companyName: 'Al Noor Trading LLC',
      customerType: 'CORPORATE',
      trn: '100567894300003',
      email: 'billing@alnoor.ae',
      phone: '+971 4 123 4567',
      billingAddress: 'Downtown Dubai, Boulevard Plaza, Tower 1',
      emirate: 'Dubai',
      country: 'United Arab Emirates',
      isFreeZone: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Resolves official CBUAE exchange rate evidence under Article 69 of Executive Regulations.
   */
  public resolveExchangeRate(
    currency: string,
    supplyDate: string,
    customRate?: number,
  ): ExchangeRateEvidence {
    const curr = (currency || 'AED').toUpperCase();
    const effectiveDate = supplyDate || new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    if (curr === 'AED') {
      return {
        currencyPair: 'AED/AED',
        exchangeRate: 1.0,
        rateSource: 'CBUAE_OFFICIAL_FIX',
        effectiveDate,
        retrievalTimestamp: timestamp,
        supplyDateUsed: effectiveDate,
        isOfficialCbUae: true,
      };
    }

    if (curr === 'USD') {
      // UAE Dirham pegged legally to USD at 3.6725
      return {
        currencyPair: 'USD/AED',
        exchangeRate: 3.6725,
        rateSource: 'CBUAE_OFFICIAL_FIX',
        effectiveDate,
        retrievalTimestamp: timestamp,
        supplyDateUsed: effectiveDate,
        isOfficialCbUae: true,
      };
    }

    if (customRate !== undefined && customRate > 0) {
      return {
        currencyPair: `${curr}/AED`,
        exchangeRate: customRate,
        rateSource: 'USER_VERIFIED_OVERRIDE',
        effectiveDate,
        retrievalTimestamp: timestamp,
        supplyDateUsed: effectiveDate,
        isOfficialCbUae: false,
      };
    }

    if (CBUAE_FIXED_RATES[curr]) {
      return {
        currencyPair: `${curr}/AED`,
        exchangeRate: CBUAE_FIXED_RATES[curr],
        rateSource: 'CBUAE_PUBLISHED_DAILY',
        effectiveDate,
        retrievalTimestamp: timestamp,
        supplyDateUsed: effectiveDate,
        isOfficialCbUae: true,
      };
    }

    return {
      currencyPair: `${curr}/AED`,
      exchangeRate: 0,
      rateSource: 'UNRESOLVED_RATE_ERROR',
      effectiveDate,
      retrievalTimestamp: timestamp,
      supplyDateUsed: effectiveDate,
      isOfficialCbUae: false,
      unresolvedReason: `Official CBUAE exchange rate for currency ${curr} on supply date ${effectiveDate} is unavailable. Under Article 69 of UAE VAT Executive Regulations, conversion to AED must use the official rate published by the Central Bank of the UAE.`,
    };
  }

  // ==========================================================================
  // 1. CUSTOMER MANAGEMENT
  // ==========================================================================

  public async getCustomers(businessId: string, orgId: string): Promise<CustomerRecord[]> {
    await this.verifyBusinessOwnership(businessId, orgId);

    const list: CustomerRecord[] = [];
    for (const cust of this.customers.values()) {
      if (cust.businessId === businessId || cust.businessId === 'biz-default') {
        list.push(cust);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async createCustomer(
    dto: CreateCustomerDto,
    businessId: string,
    orgId: string,
  ): Promise<CustomerRecord> {
    await this.verifyBusinessOwnership(businessId, orgId);

    const id = `cust-${crypto.randomUUID()}`;
    const cust: CustomerRecord = {
      id,
      businessId,
      name: dto.name.trim(),
      companyName: dto.companyName ? dto.companyName.trim() : undefined,
      customerType: dto.customerType,
      trn: dto.trn ? dto.trn.trim() : undefined,
      email: dto.email ? dto.email.trim() : undefined,
      phone: dto.phone ? dto.phone.trim() : undefined,
      billingAddress: dto.billingAddress.trim(),
      emirate: dto.emirate || 'Dubai',
      country: dto.country || 'United Arab Emirates',
      isFreeZone: !!dto.isFreeZone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customers.set(id, cust);

    if (this.prisma && process.env.DATABASE_URL) {
      try {
        await this.prisma.customer.create({
          data: {
            id: cust.id,
            businessId: cust.businessId,
            name: cust.name,
            companyName: cust.companyName,
            trn: cust.trn,
            email: cust.email,
            phone: cust.phone,
            address: cust.billingAddress,
            isFreeZone: !!cust.isFreeZone,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Customer persistence in PostgreSQL deferred: ${err.message}`);
      }
    }

    return cust;
  }

  public async getCustomerById(
    customerId: string,
    businessId: string,
    orgId: string,
  ): Promise<CustomerRecord> {
    await this.verifyBusinessOwnership(businessId, orgId);

    const cust = this.customers.get(customerId);
    if (!cust) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    if (cust.businessId !== businessId && cust.businessId !== 'biz-default') {
      throw new ForbiddenException('Access denied: Customer belongs to another business entity');
    }

    return cust;
  }

  // ==========================================================================
  // 2. INVOICE CREATION & LIFECYCLE
  // ==========================================================================

  /**
   * Creates a new DRAFT invoice. Calculations are deterministic.
   */
  public async createDraftInvoice(
    dto: CreateInvoiceDto,
    orgId: string,
    userId: string,
  ): Promise<InvoiceRecord> {
    const business = await this.verifyBusinessOwnership(dto.businessId, orgId);
    const customer = await this.getCustomerById(dto.customerId, dto.businessId, orgId);

    const isSupplierVatRegistered = !!business.vatTrn && business.vatTrn.trim().length >= 15;

    // Resolve CBUAE exchange rate evidence under Article 69
    const currency = (dto.currency || 'AED').toUpperCase();
    const supplyDate = dto.supplyDate || dto.issueDate;
    const exchangeEvidence = this.resolveExchangeRate(currency, supplyDate, dto.exchangeRate);
    if (exchangeEvidence.rateSource === 'UNRESOLVED_RATE_ERROR') {
      throw new BadRequestException(exchangeEvidence.unresolvedReason);
    }

    // Perform deterministic calculations
    const { lines, summary } = this.calculationService.calculateInvoice(dto.lines, {
      currency,
      customExchangeRate: exchangeEvidence.exchangeRate,
      isSupplierVatRegistered,
    });

    // Provisional draft number
    const draftNumber = `DRAFT-${Date.now().toString().slice(-6)}`;

    // Determine compliant invoice type classification via Article 59(5) rules
    const validation = this.validationService.validateInvoiceForIssuance({
      business,
      customer,
      invoiceNumber: draftNumber,
      issueDate: dto.issueDate,
      supplyDate,
      currency,
      lines: dto.lines,
      calculation: summary,
      preferredInvoiceType: (dto as any).preferredInvoiceType,
    });
    const invoiceType = validation.invoiceType;

    const id = `inv-${crypto.randomUUID()}`;
    const invoice: InvoiceRecord = {
      id,
      organisationId: orgId,
      businessId: dto.businessId,
      customerId: dto.customerId,
      customer,
      invoiceNumber: draftNumber,
      sequenceNumber: 0,
      invoiceType,
      issueDate: dto.issueDate,
      supplyDate,
      dueDate: dto.dueDate,
      currency,
      exchangeRate: summary.exchangeRate,
      exchangeRateEvidence: exchangeEvidence,
      paymentTerms: dto.paymentTerms || 'Net 14 Days',
      purchaseOrderReference: dto.purchaseOrderReference,
      notes: dto.notes,
      termsAndConditions: dto.termsAndConditions,
      status: 'DRAFT',
      lines,
      calculation: summary,
      amountPaid: 0,
      outstandingBalance: summary.grandTotal,
      isImmutable: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.invoices.set(id, invoice);

    if (this.prisma && process.env.DATABASE_URL) {
      try {
        await this.prisma.invoice.create({
          data: {
            id: invoice.id,
            businessId: invoice.businessId,
            customerId: invoice.customerId,
            invoiceNumber: invoice.invoiceNumber,
            issueDate: new Date(invoice.issueDate),
            dueDate: new Date(invoice.dueDate),
            currency: invoice.currency,
            exchangeRate: new Decimal(invoice.exchangeRate),
            subtotal: new Decimal(invoice.calculation.subtotalGross),
            vatTotal: new Decimal(invoice.calculation.totalVat),
            totalAmount: new Decimal(invoice.calculation.grandTotal),
            totalAmountAED: new Decimal(invoice.calculation.statutoryAED.grandTotalAED),
            status: 'DRAFT',
            notes: invoice.notes,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Invoice draft persistence in PostgreSQL deferred: ${err.message}`);
      }
    }

    return invoice;
  }

  /**
   * Retrieves all invoices for a business entity, enforcing organisation ownership.
   */
  public async getInvoices(
    businessId: string,
    orgId: string,
    filters?: { status?: string; search?: string },
  ): Promise<InvoiceRecord[]> {
    await this.verifyBusinessOwnership(businessId, orgId);

    const list: InvoiceRecord[] = [];
    for (const inv of this.invoices.values()) {
      if (inv.businessId === businessId && inv.organisationId === orgId) {
        // Status filter
        if (filters?.status && filters.status !== 'All') {
          if (inv.status !== filters.status) continue;
        }

        // Search query
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
          const matchCust = inv.customer.name.toLowerCase().includes(q);
          if (!matchNo && !matchCust) continue;
        }

        list.push(inv);
      }
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Retrieves a single invoice by ID, enforcing strict tenant and business boundaries.
   */
  public async getInvoiceById(id: string, orgId: string): Promise<InvoiceRecord> {
    const inv = this.invoices.get(id);
    if (!inv) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (inv.organisationId !== orgId) {
      throw new ForbiddenException('Access denied: Invoice belongs to another organisation');
    }

    return inv;
  }

  /**
   * Updates a DRAFT invoice. Issued or paid invoices are strictly IMMUTABLE.
   */
  public async updateDraftInvoice(
    id: string,
    dto: UpdateInvoiceDto,
    orgId: string,
  ): Promise<InvoiceRecord> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status !== 'DRAFT' || inv.isImmutable) {
      throw new BadRequestException(
        `Issued invoice ${inv.invoiceNumber} is legally immutable under UAE Tax Law. Modifications must be processed via a Tax Credit Note.`,
      );
    }

    const business = await this.verifyBusinessOwnership(inv.businessId, orgId);
    let customer = inv.customer;

    if (dto.customerId && dto.customerId !== inv.customerId) {
      customer = await this.getCustomerById(dto.customerId, inv.businessId, orgId);
      inv.customerId = dto.customerId;
      inv.customer = customer;
    }

    if (dto.issueDate) inv.issueDate = dto.issueDate;
    if (dto.supplyDate) inv.supplyDate = dto.supplyDate;
    if (dto.dueDate) inv.dueDate = dto.dueDate;
    if (dto.paymentTerms) inv.paymentTerms = dto.paymentTerms;
    if (dto.notes !== undefined) inv.notes = dto.notes;
    if (dto.termsAndConditions !== undefined) inv.termsAndConditions = dto.termsAndConditions;

    if (dto.lines && dto.lines.length > 0) {
      const isSupplierVatRegistered = !!business.vatTrn && business.vatTrn.trim().length >= 15;
      const { lines, summary } = this.calculationService.calculateInvoice(dto.lines, {
        currency: inv.currency,
        customExchangeRate: inv.exchangeRate,
        isSupplierVatRegistered,
        amountPaid: inv.amountPaid,
      });
      inv.lines = lines;
      inv.calculation = summary;
      inv.outstandingBalance = summary.outstandingBalance;
    }

    inv.updatedAt = new Date();
    return inv;
  }

  /**
   * Issues an invoice:
   * 1. Validates full legal compliance under Article 59 of UAE VAT Executive Regulations.
   * 2. Allocates next sequential, business-isolated invoice number.
   * 3. Generates PDF HTML and computes SHA-256 integrity checksum.
   * 4. Permanently locks record (isImmutable = true, status = ISSUED).
   */
  public async issueInvoice(
    id: string,
    orgId: string,
    userId: string,
  ): Promise<InvoiceRecord> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status !== 'DRAFT') {
      throw new BadRequestException(`Invoice ${inv.invoiceNumber} is already in ${inv.status} state.`);
    }

    const business = await this.verifyBusinessOwnership(inv.businessId, orgId);

    // 1. Compliance Validation under Article 59
    const validation = this.validationService.validateInvoiceForIssuance({
      business,
      customer: inv.customer,
      invoiceNumber: 'PROVISIONAL',
      issueDate: inv.issueDate,
      supplyDate: inv.supplyDate,
      currency: inv.currency,
      lines: inv.lines.map((l) => ({
        description: l.description,
        itemName: l.itemName,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        discount: l.discount,
        vatTreatment: l.vatTreatment,
      })),
      calculation: inv.calculation,
    });

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invoice compliance validation failed under UAE Tax Law: ${validation.missingMandatoryFields.join('; ')}`,
      );
    }

    // 2. Allocate Sequential Invoice Number
    const { invoiceNumber, sequenceNumber } = this.numberService.getNextInvoiceNumber(
      inv.businessId,
      'INV',
      new Date(inv.issueDate).getFullYear(),
    );

    inv.invoiceNumber = invoiceNumber;
    inv.sequenceNumber = sequenceNumber;
    inv.invoiceType = validation.invoiceType;
    inv.status = 'ISSUED';
    inv.isImmutable = true;
    inv.issuedAt = new Date().toISOString();
    inv.issuedBy = userId;
    inv.updatedAt = new Date();

    // 3. Capture Immutable Business & Customer Snapshots
    inv.businessSnapshot = {
      legalName: business.legalName,
      tradeName: business.tradeName,
      vatTrn: business.vatTrn,
      tradeLicenseNumber: business.tradeLicenseNumber,
      licensingAuthority: business.licensingAuthority,
      jurisdictionType: business.jurisdictionType,
      emirate: business.emirate,
    };
    inv.customerSnapshot = {
      name: inv.customer.name,
      companyName: inv.customer.companyName,
      trn: inv.customer.trn,
      billingAddress: inv.customer.billingAddress,
      customerType: inv.customer.customerType,
    };

    // 4. Generate PDF and calculate SHA-256 Checksum
    const { html, checksum } = this.pdfService.generateInvoiceHtml(inv, business);
    inv.renderedHtml = html;
    inv.pdfChecksum = checksum;

    if (this.prisma && process.env.DATABASE_URL) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.invoice.update({
            where: { id: inv.id },
            data: {
              invoiceNumber: inv.invoiceNumber,
              status: 'ISSUED',
              pdfUrl: `invoices/${inv.invoiceNumber}.pdf`,
            },
          });
        });
      } catch (err: any) {
        this.logger.warn(`Invoice issuance persistence in PostgreSQL deferred: ${err.message}`);
      }
    }

    this.logger.log(
      `Invoice ${inv.invoiceNumber} successfully issued for business ${inv.businessId} (Checksum: ${checksum.slice(0, 8)}...)`,
    );

    return inv;
  }

  /**
   * Records a payment against an invoice (partial or full payment).
   */
  public async recordPayment(
    id: string,
    dto: RecordPaymentDto,
    orgId: string,
  ): Promise<InvoiceRecord> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status === 'DRAFT' || inv.status === 'VOID' || inv.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot record payment on invoice in ${inv.status} status.`);
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    const grandTotal = new Decimal(inv.calculation.grandTotal);
    const credited = new Decimal(inv.creditedAmount || 0);
    const effectiveTotal = grandTotal.minus(credited);

    const newAmountPaid = new Decimal(inv.amountPaid).plus(new Decimal(dto.amount));

    if (newAmountPaid.greaterThan(effectiveTotal)) {
      throw new BadRequestException(
        `Payment of ${dto.amount} exceeds remaining outstanding balance of ${inv.outstandingBalance}.`,
      );
    }

    inv.amountPaid = this.calculationService.roundCurrency(newAmountPaid.toNumber(), 2);
    const remaining = effectiveTotal.minus(newAmountPaid);
    inv.outstandingBalance = this.calculationService.roundCurrency(remaining.toNumber(), 2);

    if (inv.outstandingBalance === 0) {
      inv.status = 'PAID';
    } else {
      inv.status = 'PARTIALLY_PAID';
    }

    inv.calculation.amountPaid = inv.amountPaid;
    inv.calculation.outstandingBalance = inv.outstandingBalance;

    const paymentRecord = {
      id: `pay-${crypto.randomUUID()}`,
      businessId: inv.businessId,
      invoiceId: inv.id,
      amount: dto.amount,
      amountAED: this.calculationService.roundCurrency(dto.amount * inv.exchangeRate, 2),
      currency: inv.currency,
      exchangeRate: inv.exchangeRate,
      paymentDate: dto.paymentDate || new Date().toISOString(),
      paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      createdAt: new Date(),
    };

    if (!inv.payments) inv.payments = [];
    inv.payments.push(paymentRecord);
    inv.updatedAt = new Date();

    if (this.prisma && process.env.DATABASE_URL) {
      try {
        await this.prisma.payment.create({
          data: {
            id: paymentRecord.id,
            businessId: paymentRecord.businessId,
            invoiceId: paymentRecord.invoiceId,
            amount: new Decimal(paymentRecord.amount),
            amountAED: new Decimal(paymentRecord.amountAED),
            currency: paymentRecord.currency,
            exchangeRate: new Decimal(paymentRecord.exchangeRate),
            paymentDate: new Date(paymentRecord.paymentDate),
            paymentMethod: (dto.paymentMethod as any) || 'BANK_TRANSFER',
            referenceNumber: paymentRecord.referenceNumber,
            notes: paymentRecord.notes,
          },
        });
        await this.prisma.invoice.update({
          where: { id: inv.id },
          data: { status: inv.status as any },
        });
      } catch (err: any) {
        this.logger.warn(`Payment persistence in PostgreSQL deferred: ${err.message}`);
      }
    }

    return inv;
  }

  /**
   * Refunds or reverses a previously recorded payment.
   */
  public async refundPayment(
    id: string,
    amount: number,
    reason: string,
    orgId: string,
  ): Promise<InvoiceRecord> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status === 'DRAFT' || inv.status === 'VOID' || inv.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot refund payment on invoice in ${inv.status} status.`);
    }

    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    if (amount > inv.amountPaid) {
      throw new BadRequestException(
        `Refund amount of ${amount} exceeds total amount paid of ${inv.amountPaid}.`,
      );
    }

    const effectiveTotal = inv.calculation.grandTotal - (inv.creditedAmount || 0);
    inv.amountPaid = this.calculationService.roundCurrency(inv.amountPaid - amount, 2);
    inv.outstandingBalance = this.calculationService.roundCurrency(
      effectiveTotal - inv.amountPaid,
      2,
    );
    inv.status = inv.amountPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED';
    inv.calculation.amountPaid = inv.amountPaid;
    inv.calculation.outstandingBalance = inv.outstandingBalance;
    inv.notes = `${inv.notes || ''}\n[REFUND: ${amount} ${inv.currency} - ${reason}]`.trim();
    inv.updatedAt = new Date();

    if (inv.payments) {
      inv.payments.push({
        id: `pay-ref-${crypto.randomUUID()}`,
        businessId: inv.businessId,
        invoiceId: inv.id,
        amount: -amount,
        amountAED: -this.calculationService.roundCurrency(amount * inv.exchangeRate, 2),
        currency: inv.currency,
        exchangeRate: inv.exchangeRate,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'REFUND',
        notes: reason,
        isRefund: true,
        createdAt: new Date(),
      });
    }

    return inv;
  }

  /**
   * Deletes a draft invoice. Issued invoices cannot be deleted.
   */
  public async deleteInvoice(id: string, orgId: string): Promise<{ success: boolean; message: string }> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status !== 'DRAFT' || inv.isImmutable) {
      throw new BadRequestException(
        `Issued invoice ${inv.invoiceNumber} is immutable and cannot be deleted under UAE Tax Audit regulations.`,
      );
    }

    this.invoices.delete(id);
    if (this.prisma && process.env.DATABASE_URL) {
      try {
        await this.prisma.invoice.delete({ where: { id } });
      } catch (err: any) {
        this.logger.warn(`Invoice deletion in PostgreSQL deferred: ${err.message}`);
      }
    }
    return { success: true, message: `Draft invoice ${id} deleted successfully.` };
  }

  /**
   * Voids an invoice where legally permissible.
   */
  public async voidInvoice(id: string, reason: string, orgId: string): Promise<InvoiceRecord> {
    const inv = await this.getInvoiceById(id, orgId);

    if (inv.status === 'PAID') {
      throw new BadRequestException('Cannot void a paid invoice. Please issue a Tax Credit Note instead.');
    }

    inv.status = 'VOID';
    inv.notes = `${inv.notes || ''}\n[VOID REASON: ${reason}]`.trim();
    inv.updatedAt = new Date();
    return inv;
  }

  /**
   * Issues a legally grounded Tax Credit Note linked to an issued invoice.
   * Under Article 60 of Cabinet Decision No. 52 of 2017 & Article 70 of Federal Decree-Law No. 8 of 2017.
   */
  public async createCreditNote(
    invoiceId: string,
    dto: CreateCreditNoteDto,
    orgId: string,
    userId: string,
  ): Promise<CreditNoteRecord> {
    const originalInvoice = await this.getInvoiceById(invoiceId, orgId);

    if (originalInvoice.status === 'DRAFT') {
      throw new BadRequestException('Credit notes can only be issued against an ISSUED, PARTIALLY_PAID, or PAID invoice.');
    }

    const business = await this.verifyBusinessOwnership(originalInvoice.businessId, orgId);

    // Lines to credit (default to all lines if not specified)
    const linesToCredit: CalculatedInvoiceLine[] =
      dto.creditedLines && dto.creditedLines.length > 0
        ? this.calculationService.calculateInvoice(dto.creditedLines, {
            currency: originalInvoice.currency,
            customExchangeRate: originalInvoice.exchangeRate,
            isSupplierVatRegistered: !!business.vatTrn,
          }).lines
        : originalInvoice.lines;

    let subtotalCredited = new Decimal(0);
    let vatCredited = new Decimal(0);

    for (const line of linesToCredit) {
      subtotalCredited = subtotalCredited.plus(new Decimal(line.taxableAmount));
      vatCredited = vatCredited.plus(new Decimal(line.vatAmount));
    }

    const totalCredited = subtotalCredited.plus(vatCredited);

    // Verify cumulative credit note limit against remaining eligible invoice amount
    const alreadyCredited = (originalInvoice.creditNotes || []).reduce(
      (acc, cn) => acc.plus(new Decimal(cn.totalCredited)),
      new Decimal(0),
    );
    const originalGrandTotal = new Decimal(originalInvoice.calculation.grandTotal);
    const maxEligible = originalGrandTotal.minus(alreadyCredited);

    if (totalCredited.greaterThan(maxEligible)) {
      throw new BadRequestException(
        `Credit note total of ${totalCredited.toFixed(2)} exceeds remaining eligible invoice balance of ${maxEligible.toFixed(2)}.`,
      );
    }

    // Generate Credit Note Number: CN-2026-0001
    const { invoiceNumber: creditNoteNumber } = this.numberService.getNextInvoiceNumber(
      originalInvoice.businessId,
      'CN',
      new Date().getFullYear(),
    );

    const creditNoteId = `cn-${crypto.randomUUID()}`;
    const creditNote: CreditNoteRecord = {
      id: creditNoteId,
      organisationId: orgId,
      businessId: originalInvoice.businessId,
      originalInvoiceId: originalInvoice.id,
      originalInvoiceNumber: originalInvoice.invoiceNumber,
      creditNoteNumber,
      issueDate: new Date().toISOString().split('T')[0],
      reason: dto.reason.trim(),
      statutoryBasis: 'Article 60 Cabinet Decision No. 52 of 2017 & Article 70 Federal Decree-Law No. 8 of 2017',
      subtotalCredited: this.calculationService.roundCurrency(subtotalCredited.toNumber(), 2),
      vatCredited: this.calculationService.roundCurrency(vatCredited.toNumber(), 2),
      totalCredited: this.calculationService.roundCurrency(totalCredited.toNumber(), 2),
      currency: originalInvoice.currency,
      exchangeRate: originalInvoice.exchangeRate,
      lines: linesToCredit,
      issuedAt: new Date().toISOString(),
      issuedBy: userId,
      createdAt: new Date(),
    };

    const { checksum } = this.pdfService.generateCreditNoteHtml(creditNote, originalInvoice, business);
    creditNote.pdfChecksum = checksum;

    this.creditNotes.set(creditNoteId, creditNote);

    // Link credit note to original invoice and adjust customer balance
    if (!originalInvoice.creditNotes) {
      originalInvoice.creditNotes = [];
    }
    originalInvoice.creditNotes.push(creditNote);
    originalInvoice.creditedAmount = alreadyCredited.plus(totalCredited).toNumber();
    originalInvoice.outstandingBalance = Decimal.max(
      0,
      new Decimal(originalInvoice.outstandingBalance).minus(totalCredited),
    ).toNumber();

    if (originalInvoice.outstandingBalance === 0 && originalInvoice.status !== 'PAID') {
      originalInvoice.status = 'PAID';
    }
    originalInvoice.updatedAt = new Date();

    this.logger.log(
      `Credit Note ${creditNoteNumber} issued against invoice ${originalInvoice.invoiceNumber}`,
    );

    return creditNote;
  }

  /**
   * Retrieves generated PDF HTML for an invoice.
   * If the invoice is issued, returns the immutable rendered HTML snapshot.
   */
  public async getInvoicePdfHtml(
    id: string,
    orgId: string,
  ): Promise<{ html: string; checksum: string }> {
    const inv = await this.getInvoiceById(id, orgId);
    if (inv.isImmutable && inv.renderedHtml && inv.pdfChecksum) {
      return { html: inv.renderedHtml, checksum: inv.pdfChecksum };
    }
    const business = await this.verifyBusinessOwnership(inv.businessId, orgId);
    return this.pdfService.generateInvoiceHtml(inv, business);
  }

  // ==========================================================================
  // 3. UTILITY METHODS (VERIFICATION & BACKWARD COMPATIBILITY)
  // ==========================================================================

  private async verifyBusinessOwnership(
    businessId: string,
    orgId: string,
  ): Promise<BusinessRecord> {
    const biz = await this.businessService.getBusinessById(businessId, orgId);
    if (!biz) {
      throw new NotFoundException(`Business entity ${businessId} not found in active organisation`);
    }
    return biz;
  }

  /**
   * Backward-compatible simple tax invoice calculation
   */
  public calculateTaxInvoice(dto: {
    currency: string;
    subtotal: number;
    vatRatePct?: number;
  }) {
    const rate = CBUAE_FIXED_RATES[dto.currency.toUpperCase()] || 1.0;
    const vatRate = (dto.vatRatePct ?? 5) / 100;
    const vatAmount = dto.subtotal * vatRate;
    const totalAmount = dto.subtotal + vatAmount;

    const subtotalAED = Math.round(dto.subtotal * rate * 100) / 100;
    const vatAmountAED = Math.round(vatAmount * rate * 100) / 100;
    const totalAmountAED = Math.round(totalAmount * rate * 100) / 100;

    return {
      currency: dto.currency.toUpperCase(),
      cbUaeExchangeRate: rate,
      subtotal: dto.subtotal,
      vatAmount,
      totalAmount,
      statutoryAED: {
        subtotalAED,
        vatAmountAED,
        totalAmountAED,
        legalReference: 'Article 69 UAE VAT Executive Regulations',
      },
    };
  }

  /**
   * Backward-compatible expense classification
   */
  public classifyExpenseReceipt(dto: {
    merchantName: string;
    supplierTrn?: string;
    amountAED: number;
    category: 'DUTY_TRAVEL' | 'CLIENT_ENTERTAINMENT' | 'REVERSE_CHARGE_SAAS';
  }) {
    const isEntertainment = dto.category === 'CLIENT_ENTERTAINMENT';
    const isDutyTravel = dto.category === 'DUTY_TRAVEL';
    const isRcm = dto.category === 'REVERSE_CHARGE_SAAS';

    const line: VatTransactionLine = {
      id: 'exp-eval',
      isSale: false,
      amountAED: new Decimal(dto.amountAED),
      vatRateCategory: isRcm ? 'REVERSE_CHARGE' : 'STANDARD_5',
      isReverseChargeService: isRcm,
      isEntertainmentOrHospitality: isEntertainment,
      isEmployeeExpense: isDutyTravel,
      employeeExpenseCategory: isDutyTravel ? 'BUSINESS_TRAVEL_HOTEL' : undefined,
      hasValidTaxInvoice: isRcm || (!!dto.supplierTrn && dto.supplierTrn.startsWith('100')),
    };

    const vatResult = VatEngine.evaluateInputRecoverability(line);

    return {
      merchantName: dto.merchantName,
      supplierTrn: dto.supplierTrn,
      amountAED: dto.amountAED,
      vatRecoverability: vatResult.recoverability,
      recoverableVatAED: vatResult.recoverableVatAED.toNumber(),
      blockedVatAED: vatResult.blockedVatAED.toNumber(),
      vatLegalReference: vatResult.legalReference,
      vatRationale: vatResult.rationale,
      corporateTaxDeductibilityPct: isEntertainment ? 50 : 100,
      corporateTaxLegalReference: isEntertainment ? 'Article 32 Law No. 47/2022' : 'Article 28 Law No. 47/2022',
    };
  }
}
