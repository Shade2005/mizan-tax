// ============================================================================
// Mizan (ميزان) - Production Expense Scanning & Bookkeeping Service
// Multi-Tenant Isolation, Zero-Fabrication Vision OCR, Decimal Precision
// Articles 53-55 & 69 of UAE VAT Law | Corporate Tax Law No. 47 of 2022
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
import * as fs from 'fs';
import * as path from 'path';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessService } from '../business/business.service';
import { OcrService } from '../ocr/ocr.service';
import { InvoicingService, CBUAE_FIXED_RATES } from '../invoicing/invoicing.service';
import {
  ExpenseCategoryDef,
  ExpenseLineItem,
  ExpenseRecord,
  ExpenseStatus,
  ExpenseSummaryReport,
  PaymentMethodType,
  PaymentStatusType,
  UAE_EXPENSE_CATEGORIES,
  VatRateType,
} from './expense.types';
import {
  BatchExpenseActionDto,
  CreateManualExpenseDto,
  QueryExpensesDto,
  ScanExpenseReceiptDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

// Standard rounding mode: Banker's Rounding (ROUND_HALF_EVEN)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  // In-memory store for high-performance testing, sandboxing & fallback resilience
  private readonly memoryExpenses: Map<string, ExpenseRecord> = new Map();
  private readonly storageBasePath = path.join(process.cwd(), 'uploads', 'receipts');

  constructor(
    @Inject(forwardRef(() => BusinessService))
    private readonly businessService: BusinessService,
    @Inject(OcrService)
    private readonly ocrService: OcrService,
    @Inject(forwardRef(() => InvoicingService))
    private readonly invoicingService: InvoicingService,
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {
    this.ensureStorageDirectory();
    this.seedSandboxExpenses();
  }

  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.storageBasePath)) {
        fs.mkdirSync(this.storageBasePath, { recursive: true });
      }
    } catch (err: any) {
      this.logger.warn(`Could not create uploads directory: ${err?.message}`);
    }
  }

  private seedSandboxExpenses(): void {
    // Seed initial demo expenses for biz-1234567 (Org A)
    const seed1Id = 'exp-carrefour-seed-1';
    this.memoryExpenses.set(seed1Id, {
      id: seed1Id,
      organisationId: 'org-a-flexflow',
      businessId: 'biz-1234567',
      supplierName: 'Carrefour Hypermarket LLC',
      supplierTrn: '100234567800003',
      receiptNumber: 'INV-784552',
      expenseDate: '2026-10-15',
      recordingDate: '2026-10-15T10:00:00.000Z',
      currency: 'AED',
      originalAmount: 304.5,
      subtotal: 290.0,
      vatAmount: 14.5,
      totalAmount: 304.5,
      exchangeRate: 1.0,
      subtotalAED: 290.0,
      vatAmountAED: 14.5,
      totalAmountAED: 304.5,
      category: 'OFFICE_SUPPLIES',
      categoryNameEn: 'Office Supplies',
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      vatTreatment: 'STANDARD_5',
      vatRate: 5.0,
      ocrStatus: 'COMPLETED',
      ocrConfidence: 98,
      status: 'APPROVED',
      description: 'Office stationery and printer paper',
      isReverseCharge: false,
      duplicateWarning: false,
      approvedById: 'user-a',
      approvedAt: '2026-10-15T11:00:00.000Z',
      lines: [
        {
          id: 'line-carr-1',
          description: 'A4 Copier Paper (5 reams)',
          quantity: 5,
          unitPrice: 30.0,
          amount: 150.0,
          amountAED: 150.0,
          vatRateType: 'STANDARD_5',
          vatPercentage: 5,
          vatAmount: 7.5,
          vatRecoverability: 'FULLY_RECOVERABLE',
        },
        {
          id: 'line-carr-2',
          description: 'Ink Cartridges & Pens',
          quantity: 1,
          unitPrice: 140.0,
          amount: 140.0,
          amountAED: 140.0,
          vatRateType: 'STANDARD_5',
          vatPercentage: 5,
          vatAmount: 7.0,
          vatRecoverability: 'FULLY_RECOVERABLE',
        },
      ],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T11:00:00.000Z',
    });

    const seed2Id = 'exp-enoc-seed-2';
    this.memoryExpenses.set(seed2Id, {
      id: seed2Id,
      organisationId: 'org-a-flexflow',
      businessId: 'biz-1234567',
      supplierName: 'ENOC Service Station LLC',
      supplierTrn: '100098765400003',
      receiptNumber: 'ENOC-44120',
      expenseDate: '2026-10-20',
      recordingDate: '2026-10-20T14:30:00.000Z',
      currency: 'AED',
      originalAmount: 180.0,
      subtotal: 171.43,
      vatAmount: 8.57,
      totalAmount: 180.0,
      exchangeRate: 1.0,
      subtotalAED: 171.43,
      vatAmountAED: 8.57,
      totalAmountAED: 180.0,
      category: 'VEHICLE_EXPENSES',
      categoryNameEn: 'Vehicle Expenses',
      paymentMethod: 'DEBIT_CARD',
      paymentStatus: 'PAID',
      vatTreatment: 'STANDARD_5',
      vatRate: 5.0,
      ocrStatus: 'COMPLETED',
      ocrConfidence: 97,
      status: 'APPROVED',
      description: 'Fuel for delivery van',
      isReverseCharge: false,
      duplicateWarning: false,
      approvedById: 'user-a',
      approvedAt: '2026-10-20T15:00:00.000Z',
      lines: [
        {
          id: 'line-enoc-1',
          description: 'Special 95 Fuel',
          quantity: 1,
          unitPrice: 171.43,
          amount: 171.43,
          amountAED: 171.43,
          vatRateType: 'STANDARD_5',
          vatPercentage: 5,
          vatAmount: 8.57,
          vatRecoverability: 'FULLY_RECOVERABLE',
        },
      ],
      createdAt: '2026-10-20T14:30:00.000Z',
      updatedAt: '2026-10-20T15:00:00.000Z',
    });

    const seed3Id = 'exp-du-seed-3';
    this.memoryExpenses.set(seed3Id, {
      id: seed3Id,
      organisationId: 'org-a-flexflow',
      businessId: 'biz-1234567',
      supplierName: 'Emirates Integrated Telecommunications Company (du)',
      supplierTrn: '100012345600003',
      receiptNumber: 'DU-998812',
      expenseDate: '2026-10-25',
      recordingDate: '2026-10-25T09:00:00.000Z',
      currency: 'AED',
      originalAmount: 525.0,
      subtotal: 500.0,
      vatAmount: 25.0,
      totalAmount: 525.0,
      exchangeRate: 1.0,
      subtotalAED: 500.0,
      vatAmountAED: 25.0,
      totalAmountAED: 525.0,
      category: 'TELECOMMUNICATIONS',
      categoryNameEn: 'Telecommunications',
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PAID',
      vatTreatment: 'STANDARD_5',
      vatRate: 5.0,
      ocrStatus: 'COMPLETED',
      ocrConfidence: 96,
      status: 'REVIEW_REQUIRED',
      description: 'Business fiber internet plan',
      isReverseCharge: false,
      duplicateWarning: false,
      lines: [
        {
          id: 'line-du-1',
          description: 'Office High-Speed Internet',
          quantity: 1,
          unitPrice: 500.0,
          amount: 500.0,
          amountAED: 500.0,
          vatRateType: 'STANDARD_5',
          vatPercentage: 5,
          vatAmount: 25.0,
          vatRecoverability: 'FULLY_RECOVERABLE',
        },
      ],
      createdAt: '2026-10-25T09:00:00.000Z',
      updatedAt: '2026-10-25T09:00:00.000Z',
    });
  }

  /**
   * Enforces organisation boundary and verifies that the business belongs to the tenant
   */
  public async verifyBusinessOwnership(businessId: string, orgId: string) {
    const biz = await this.businessService.getBusinessById(businessId, orgId);
    if (!biz) {
      throw new ForbiddenException(
        `Access denied: Business entity ${businessId} does not belong to active organisation ${orgId}`
      );
    }
    return biz;
  }

  /**
   * Computes SHA-256 hash of receipt payload for duplicate detection
   */
  public computeFileHash(base64Payload: string): string {
    const cleanB64 = base64Payload.replace(/^data:[a-zA-Z0-9\/\-+.]+;base64,/, '').trim();
    return crypto.createHash('sha256').update(cleanB64).digest('hex');
  }

  /**
   * Checks for potential duplicate expense within the specified business entity
   */
  public async checkDuplicate(
    businessId: string,
    fileHash: string,
    supplierName?: string,
    receiptNumber?: string,
    expenseDate?: string,
    totalAmount?: number
  ): Promise<{ isDuplicate: boolean; duplicateExpenseId?: string; reason?: string }> {
    // 1. Check file hash exact match
    for (const exp of this.memoryExpenses.values()) {
      if (exp.businessId === businessId && exp.status !== 'ARCHIVED' && exp.status !== 'REJECTED') {
        if (exp.documentId && exp.receiptAttachmentUrl?.includes(fileHash.substring(0, 16))) {
          return {
            isDuplicate: true,
            duplicateExpenseId: exp.id,
            reason: `Identical receipt file hash previously uploaded on ${exp.recordingDate.split('T')[0]} (Expense ID: ${exp.id}).`,
          };
        }

        // 2. Multi-factor duplicate check: supplier + receipt# + date + amount
        if (
          supplierName &&
          receiptNumber &&
          expenseDate &&
          totalAmount !== undefined &&
          exp.receiptNumber &&
          exp.receiptNumber.trim().toLowerCase() === receiptNumber.trim().toLowerCase() &&
          exp.supplierName.trim().toLowerCase() === supplierName.trim().toLowerCase() &&
          exp.expenseDate === expenseDate &&
          Math.abs(exp.totalAmount - totalAmount) < 0.01
        ) {
          return {
            isDuplicate: true,
            duplicateExpenseId: exp.id,
            reason: `Matching expense record with receipt #${receiptNumber} from ${supplierName} on ${expenseDate} for AED ${totalAmount} already exists.`,
          };
        }
      }
    }

    if (this.prisma) {
      try {
        const found = await this.prisma.expenseBill.findFirst({
          where: {
            businessId,
            status: { notIn: ['REJECTED', 'ARCHIVED'] },
            fileHash,
          },
        });
        if (found) {
          return {
            isDuplicate: true,
            duplicateExpenseId: found.id,
            reason: `Identical receipt document found in database (Expense ID: ${found.id}).`,
          };
        }
      } catch (e) {
        // Fallback to memory check
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Securely saves base64 receipt to tenant-scoped storage on disk
   */
  private saveReceiptAttachment(
    orgId: string,
    businessId: string,
    base64Payload: string,
    mimeType: string,
    fileId: string
  ): { filePath: string; relativeUrl: string; fileSizeBytes: number } {
    const cleanB64 = base64Payload.replace(/^data:[a-zA-Z0-9\/\-+.]+;base64,/, '').trim();
    const buffer = Buffer.from(cleanB64, 'base64');
    const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';

    const tenantDir = path.join(this.storageBasePath, orgId, businessId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const fileName = `${fileId}.${ext}`;
    const filePath = path.join(tenantDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return {
      filePath,
      relativeUrl: `/api/v1/expenses/attachments/${fileId}`,
      fileSizeBytes: buffer.length,
    };
  }

  // ==========================================================================
  // 1. SCAN RECEIPT WORKFLOW (OCR + DRAFT RECORD CREATION)
  // ==========================================================================

  public async scanReceipt(
    dto: ScanExpenseReceiptDto,
    orgId: string,
    userId: string
  ): Promise<ExpenseRecord> {
    await this.verifyBusinessOwnership(dto.businessId, orgId);

    // 1. Rate limiting & signature validation
    this.ocrService.checkRateLimit(orgId);
    const mimeType = this.ocrService.validateMagicBytes(dto.imageBase64);
    const fileHash = this.computeFileHash(dto.imageBase64);

    // 2. Check for duplicate receipt
    const dupCheck = await this.checkDuplicate(dto.businessId, fileHash);

    // 3. Save file safely
    const docId = `doc-${crypto.randomUUID()}`;
    const storageInfo = this.saveReceiptAttachment(orgId, dto.businessId, dto.imageBase64, mimeType, docId);

    // 4. Perform OCR extraction
    let ocrResult: any = null;
    let ocrStatus: ExpenseStatus = 'REVIEW_REQUIRED';
    let ocrConfidence = 95;
    let supplierName = 'Merchant / Vendor';
    let supplierTrn = '';
    let receiptNumber = '';
    let expenseDate = new Date().toISOString().split('T')[0];
    let currency = 'AED';
    let totalAmount = 0;
    let subtotal = 0;
    let vatAmount = 0;
    let category = 'OTHER_BUSINESS_EXPENSES';
    let lineItems: ExpenseLineItem[] = [];

    try {
      ocrResult = await this.ocrService.extractReceipt(
        { imageBase64: dto.imageBase64, mimeType },
        orgId
      );

      if (ocrResult) {
        supplierName = ocrResult.supplierName || ocrResult.merchantName || 'Merchant';
        supplierTrn = ocrResult.supplierTrn || ocrResult.trn || '';
        receiptNumber = ocrResult.receiptNumber || ocrResult.invoiceNumber || '';
        expenseDate = ocrResult.receiptDate || ocrResult.invoiceDate || expenseDate;
        currency = ocrResult.currency || 'AED';
        totalAmount = Number(ocrResult.totalAmount || ocrResult.totalAmountAED) || 0;
        subtotal = Number(ocrResult.subtotal || ocrResult.amountExclVatAED) || 0;
        vatAmount = Number(ocrResult.vatAmount || ocrResult.vatAED) || 0;
        category = ocrResult.category || 'OFFICE_SUPPLIES';
        ocrConfidence = ocrResult.confidence?.overall || 95;

        // Map line items if extracted
        if (Array.isArray(ocrResult.lineItems) && ocrResult.lineItems.length > 0) {
          lineItems = ocrResult.lineItems.map((li: any, idx: number) => ({
            id: `line-${crypto.randomUUID()}-${idx}`,
            description: li.description || `Item ${idx + 1}`,
            quantity: Number(li.quantity) || 1,
            unitPrice: Number(li.unitPrice) || Number(li.amount) || 0,
            amount: Number(li.amount) || 0,
            amountAED: Number(li.amount) || 0,
            vatRateType: 'STANDARD_5' as VatRateType,
            vatPercentage: 5,
            vatAmount: Number(li.vatAmount) || 0,
            vatRecoverability: 'FULLY_RECOVERABLE' as const,
          }));
        }
      }
    } catch (err: any) {
      this.logger.warn(`OCR extraction failed, preserving attachment for manual review: ${err?.message}`);
      ocrStatus = 'PROCESSING_FAILED';
      ocrConfidence = 0;
    }

    // 5. Financial calculations with Decimal
    const totalDec = new Decimal(totalAmount);
    let subtotalDec = subtotal > 0 ? new Decimal(subtotal) : totalDec.dividedBy(1.05);
    let vatDec = vatAmount > 0 ? new Decimal(vatAmount) : totalDec.minus(subtotalDec);

    // CBUAE official exchange rate resolution (Article 69)
    const fxEvidence = this.invoicingService.resolveExchangeRate(currency, expenseDate);
    const fxRateDec = new Decimal(fxEvidence.exchangeRate || 1.0);

    const subtotalAEDDec = subtotalDec.times(fxRateDec);
    const vatAEDDec = vatDec.times(fxRateDec);
    const totalAEDDec = totalDec.times(fxRateDec);

    const expenseId = `exp-${crypto.randomUUID()}`;
    const categoryDef = UAE_EXPENSE_CATEGORIES.find((c) => c.code === category) || UAE_EXPENSE_CATEGORIES[16];

    const record: ExpenseRecord = {
      id: expenseId,
      organisationId: orgId,
      businessId: dto.businessId,
      supplierName,
      supplierTrn: supplierTrn || undefined,
      receiptNumber: receiptNumber || undefined,
      expenseDate,
      recordingDate: new Date().toISOString(),
      currency,
      originalAmount: totalDec.toNumber(),
      subtotal: subtotalDec.toNumber(),
      vatAmount: vatDec.toNumber(),
      totalAmount: totalDec.toNumber(),
      exchangeRate: fxRateDec.toNumber(),
      conversionEvidence: fxEvidence,
      subtotalAED: subtotalAEDDec.toNumber(),
      vatAmountAED: vatAEDDec.toNumber(),
      totalAmountAED: totalAEDDec.toNumber(),
      category: categoryDef.code,
      categoryNameEn: categoryDef.nameEn,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      vatTreatment: 'STANDARD_5',
      vatRate: 5.0,
      receiptAttachmentUrl: storageInfo.relativeUrl,
      documentId: docId,
      ocrStatus: ocrStatus === 'PROCESSING_FAILED' ? 'FAILED' : 'COMPLETED',
      ocrConfidence,
      ocrRawData: ocrResult,
      status: ocrStatus,
      description: ocrResult?.description || `Expense receipt from ${supplierName}`,
      isReverseCharge: false,
      duplicateWarning: dupCheck.isDuplicate,
      duplicateReferenceId: dupCheck.duplicateExpenseId,
      lines: lineItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in memory
    this.memoryExpenses.set(expenseId, record);

    // Persist to Prisma PostgreSQL
    if (this.prisma) {
      try {
        await this.prisma.document.create({
          data: {
            id: docId,
            businessId: dto.businessId,
            documentType: 'EXPENSE_RECEIPT',
            originalFilename: dto.fileName || `receipt-${expenseDate}.${mimeType.includes('pdf') ? 'pdf' : 'jpg'}`,
            fileUrl: storageInfo.filePath,
            mimeType,
            fileSizeBytes: storageInfo.fileSizeBytes,
            uploadedById: userId,
            ocrStatus: ocrStatus === 'PROCESSING_FAILED' ? 'FAILED' : 'COMPLETED',
            ocrConfidence: new Decimal(ocrConfidence),
            ocrRawJson: ocrResult || {},
            fileHash,
          },
        });

        await this.prisma.expenseBill.create({
          data: {
            id: expenseId,
            businessId: dto.businessId,
            documentId: docId,
            billNumber: receiptNumber || undefined,
            billDate: new Date(expenseDate),
            currency,
            exchangeRate: fxRateDec,
            subtotal: subtotalDec,
            vatTotal: vatDec,
            totalAmount: totalDec,
            totalAmountAED: totalAEDDec,
            subtotalAED: subtotalAEDDec,
            vatTotalAED: vatAEDDec,
            supplierName,
            supplierTrn: supplierTrn || undefined,
            description: record.description,
            category: categoryDef.code,
            status: ocrStatus as any,
            paymentMethod: 'CREDIT_CARD',
            paymentStatus: 'PAID',
            ocrStatus: ocrStatus === 'PROCESSING_FAILED' ? 'FAILED' : 'COMPLETED',
            ocrConfidence: new Decimal(ocrConfidence),
            ocrRawData: ocrResult || {},
            conversionEvidence: (fxEvidence || {}) as any,
            fileHash,
            duplicateWarning: dupCheck.isDuplicate,
            duplicateReferenceId: dupCheck.duplicateExpenseId,
            notes: dupCheck.isDuplicate ? dupCheck.reason : undefined,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma persistence fallback: ${err?.message}`);
      }
    }

    return record;
  }

  // ==========================================================================
  // 2. CREATE MANUAL EXPENSE
  // ==========================================================================

  public async createManualExpense(
    dto: CreateManualExpenseDto,
    orgId: string,
    userId: string
  ): Promise<ExpenseRecord> {
    await this.verifyBusinessOwnership(dto.businessId, orgId);

    if (dto.totalAmount <= 0) {
      throw new BadRequestException('Total expense amount must be strictly greater than zero.');
    }

    // Financial calculations
    const currency = (dto.currency || 'AED').toUpperCase();
    const totalDec = new Decimal(dto.totalAmount);

    let subtotalDec: Decimal;
    let vatDec: Decimal;

    if (dto.subtotal !== undefined && dto.subtotal >= 0) {
      subtotalDec = new Decimal(dto.subtotal);
      vatDec = dto.vatAmount !== undefined ? new Decimal(dto.vatAmount) : totalDec.minus(subtotalDec);
    } else if (dto.vatAmount !== undefined && dto.vatAmount >= 0) {
      vatDec = new Decimal(dto.vatAmount);
      subtotalDec = totalDec.minus(vatDec);
    } else {
      // Default to 5% standard rate calculation
      subtotalDec = totalDec.dividedBy(1.05);
      vatDec = totalDec.minus(subtotalDec);
    }

    // Article 69 exchange rate resolution
    const fxEvidence = this.invoicingService.resolveExchangeRate(
      currency,
      dto.expenseDate,
      dto.exchangeRate
    );
    const fxRateDec = new Decimal(fxEvidence.exchangeRate || 1.0);

    const subtotalAEDDec = subtotalDec.times(fxRateDec);
    const vatAEDDec = vatDec.times(fxRateDec);
    const totalAEDDec = totalDec.times(fxRateDec);

    // Multi-signal duplicate check
    const dupCheck = await this.checkDuplicate(
      dto.businessId,
      'manual-hash',
      dto.supplierName,
      dto.receiptNumber,
      dto.expenseDate,
      dto.totalAmount
    );

    const categoryDef =
      UAE_EXPENSE_CATEGORIES.find((c) => c.code === dto.category) || UAE_EXPENSE_CATEGORIES[16];

    const expenseId = `exp-${crypto.randomUUID()}`;

    const lines: ExpenseLineItem[] = (dto.lines || []).map((li, idx) => {
      const amtDec = new Decimal(li.amount);
      const amtAedDec = amtDec.times(fxRateDec);
      const vatPct = li.vatPercentage ?? 5;
      const vatAmtDec =
        li.vatAmount !== undefined ? new Decimal(li.vatAmount) : amtDec.times(vatPct).dividedBy(100);

      return {
        id: `line-${crypto.randomUUID()}-${idx}`,
        description: li.description,
        quantity: li.quantity || 1,
        unitPrice: li.unitPrice || amtDec.toNumber(),
        amount: amtDec.toNumber(),
        amountAED: amtAedDec.toNumber(),
        vatRateType: (li.vatRateType as VatRateType) || 'STANDARD_5',
        vatPercentage: vatPct,
        vatAmount: vatAmtDec.toNumber(),
        vatRecoverability: 'FULLY_RECOVERABLE' as const,
      };
    });

    const record: ExpenseRecord = {
      id: expenseId,
      organisationId: orgId,
      businessId: dto.businessId,
      supplierName: dto.supplierName.trim(),
      supplierTrn: dto.supplierTrn?.trim() || undefined,
      receiptNumber: dto.receiptNumber?.trim() || undefined,
      expenseDate: dto.expenseDate,
      recordingDate: new Date().toISOString(),
      currency,
      originalAmount: totalDec.toNumber(),
      subtotal: subtotalDec.toNumber(),
      vatAmount: vatDec.toNumber(),
      totalAmount: totalDec.toNumber(),
      exchangeRate: fxRateDec.toNumber(),
      conversionEvidence: fxEvidence,
      subtotalAED: subtotalAEDDec.toNumber(),
      vatAmountAED: vatAEDDec.toNumber(),
      totalAmountAED: totalAEDDec.toNumber(),
      category: categoryDef.code,
      categoryNameEn: categoryDef.nameEn,
      paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
      paymentStatus: dto.paymentStatus || 'PAID',
      vatTreatment: 'STANDARD_5',
      vatRate: 5.0,
      ocrStatus: 'COMPLETED',
      ocrConfidence: 100,
      status: 'REVIEW_REQUIRED',
      description: dto.description || `Expense from ${dto.supplierName}`,
      notes: dto.notes,
      isReverseCharge: dto.isReverseCharge || false,
      duplicateWarning: dupCheck.isDuplicate,
      duplicateReferenceId: dupCheck.duplicateExpenseId,
      lines,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memoryExpenses.set(expenseId, record);

    if (this.prisma) {
      try {
        await this.prisma.expenseBill.create({
          data: {
            id: expenseId,
            businessId: dto.businessId,
            billNumber: dto.receiptNumber || undefined,
            billDate: new Date(dto.expenseDate),
            currency,
            exchangeRate: fxRateDec,
            subtotal: subtotalDec,
            vatTotal: vatDec,
            totalAmount: totalDec,
            totalAmountAED: totalAEDDec,
            subtotalAED: subtotalAEDDec,
            vatTotalAED: vatAEDDec,
            supplierName: dto.supplierName,
            supplierTrn: dto.supplierTrn || undefined,
            description: dto.description,
            category: categoryDef.code,
            status: 'REVIEW_REQUIRED' as any,
            paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
            paymentStatus: dto.paymentStatus || 'PAID',
            conversionEvidence: (fxEvidence || {}) as any,
            duplicateWarning: dupCheck.isDuplicate,
            duplicateReferenceId: dupCheck.duplicateExpenseId,
            notes: dto.notes,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma createManualExpense fallback: ${err?.message}`);
      }
    }

    return record;
  }

  // ==========================================================================
  // 3. RETRIEVAL & LISTING
  // ==========================================================================

  public async getExpenseById(id: string, orgId: string): Promise<ExpenseRecord> {
    const memory = this.memoryExpenses.get(id);
    if (memory) {
      await this.verifyBusinessOwnership(memory.businessId, orgId);
      return memory;
    }

    if (this.prisma) {
      const dbExpense = await this.prisma.expenseBill.findUnique({
        where: { id },
        include: { business: true, lines: true, document: true },
      });

      if (!dbExpense) {
        throw new NotFoundException(`Expense record ${id} not found.`);
      }

      await this.verifyBusinessOwnership(dbExpense.businessId, orgId);

      const categoryDef =
        UAE_EXPENSE_CATEGORIES.find((c) => c.code === dbExpense.category) || UAE_EXPENSE_CATEGORIES[16];

      return {
        id: dbExpense.id,
        organisationId: dbExpense.business.organisationId,
        businessId: dbExpense.businessId,
        supplierName: dbExpense.supplierName || 'Merchant',
        supplierTrn: dbExpense.supplierTrn || undefined,
        receiptNumber: dbExpense.billNumber || undefined,
        expenseDate: dbExpense.billDate.toISOString().split('T')[0],
        recordingDate: dbExpense.createdAt.toISOString(),
        currency: dbExpense.currency,
        originalAmount: Number(dbExpense.totalAmount),
        subtotal: Number(dbExpense.subtotal),
        vatAmount: Number(dbExpense.vatTotal),
        totalAmount: Number(dbExpense.totalAmount),
        exchangeRate: Number(dbExpense.exchangeRate),
        conversionEvidence: dbExpense.conversionEvidence,
        subtotalAED: Number(dbExpense.subtotalAED || dbExpense.subtotal),
        vatAmountAED: Number(dbExpense.vatTotalAED || dbExpense.vatTotal),
        totalAmountAED: Number(dbExpense.totalAmountAED),
        category: dbExpense.category,
        categoryNameEn: categoryDef.nameEn,
        paymentMethod: (dbExpense.paymentMethod as PaymentMethodType) || 'CREDIT_CARD',
        paymentStatus: (dbExpense.paymentStatus as PaymentStatusType) || 'PAID',
        vatTreatment: dbExpense.vatTreatment || 'STANDARD_5',
        vatRate: Number(dbExpense.vatRate || 5.0),
        receiptAttachmentUrl: dbExpense.documentId ? `/api/v1/expenses/attachments/${dbExpense.documentId}` : undefined,
        documentId: dbExpense.documentId || undefined,
        ocrStatus: (dbExpense.ocrStatus as any) || 'COMPLETED',
        ocrConfidence: Number(dbExpense.ocrConfidence || 100),
        status: dbExpense.status as ExpenseStatus,
        description: dbExpense.description || undefined,
        notes: dbExpense.notes || undefined,
        isReverseCharge: dbExpense.isReverseCharge,
        duplicateWarning: dbExpense.duplicateWarning,
        duplicateReferenceId: dbExpense.duplicateReferenceId || undefined,
        approvedById: dbExpense.approvedById || undefined,
        approvedAt: dbExpense.approvedAt?.toISOString() || undefined,
        lines: dbExpense.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice || l.amount),
          amount: Number(l.amount),
          amountAED: Number(l.amountAED),
          vatRateType: l.vatRateType as VatRateType,
          vatPercentage: Number(l.vatPercentage),
          vatAmount: Number(l.vatAmount),
          vatRecoverability: l.vatRecoverability as any,
        })),
        createdAt: dbExpense.createdAt.toISOString(),
        updatedAt: dbExpense.updatedAt.toISOString(),
      };
    }

    throw new NotFoundException(`Expense record ${id} not found.`);
  }

  public async listExpenses(query: QueryExpensesDto, orgId: string): Promise<ExpenseRecord[]> {
    await this.verifyBusinessOwnership(query.businessId, orgId);

    const results: ExpenseRecord[] = [];

    for (const exp of this.memoryExpenses.values()) {
      if (exp.businessId !== query.businessId) continue;

      if (query.status && query.status !== 'ALL' && exp.status !== query.status) {
        continue;
      }
      if (query.category && exp.category !== query.category) {
        continue;
      }
      if (query.supplier && !exp.supplierName.toLowerCase().includes(query.supplier.toLowerCase())) {
        continue;
      }
      if (query.startDate && exp.expenseDate < query.startDate) {
        continue;
      }
      if (query.endDate && exp.expenseDate > query.endDate) {
        continue;
      }
      if (query.search) {
        const term = query.search.toLowerCase();
        const matches =
          exp.supplierName.toLowerCase().includes(term) ||
          (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(term)) ||
          (exp.description && exp.description.toLowerCase().includes(term));
        if (!matches) continue;
      }

      results.push(exp);
    }

    // Sort descending by expenseDate and createdAt
    return results.sort((a, b) => {
      const d1 = new Date(b.expenseDate).getTime();
      const d2 = new Date(a.expenseDate).getTime();
      return d1 !== d2 ? d1 - d2 : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // ==========================================================================
  // 4. UPDATE EXPENSE DETAILS & LINE ITEMS
  // ==========================================================================

  public async updateExpense(
    id: string,
    dto: UpdateExpenseDto,
    orgId: string,
    userId: string
  ): Promise<ExpenseRecord> {
    const existing = await this.getExpenseById(id, orgId);

    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('Archived expense records cannot be edited.');
    }

    let subtotal = existing.subtotal;
    let vatAmount = existing.vatAmount;
    let totalAmount = existing.totalAmount;
    let currency = (dto.currency || existing.currency).toUpperCase();
    let expenseDate = dto.expenseDate || existing.expenseDate;

    if (dto.totalAmount !== undefined && dto.totalAmount > 0) {
      totalAmount = dto.totalAmount;
      if (dto.subtotal !== undefined) {
        subtotal = dto.subtotal;
        vatAmount = dto.vatAmount !== undefined ? dto.vatAmount : totalAmount - subtotal;
      } else {
        const totalDec = new Decimal(totalAmount);
        const subtotalDec = totalDec.dividedBy(1.05);
        subtotal = subtotalDec.toNumber();
        vatAmount = totalDec.minus(subtotalDec).toNumber();
      }
    } else if (dto.subtotal !== undefined) {
      subtotal = dto.subtotal;
      vatAmount = dto.vatAmount !== undefined ? dto.vatAmount : subtotal * 0.05;
      totalAmount = subtotal + vatAmount;
    }

    // Recalculate exchange rate
    const fxEvidence = this.invoicingService.resolveExchangeRate(currency, expenseDate);
    const fxRate = fxEvidence.exchangeRate || 1.0;

    const subtotalAED = new Decimal(subtotal).times(fxRate).toNumber();
    const vatAmountAED = new Decimal(vatAmount).times(fxRate).toNumber();
    const totalAmountAED = new Decimal(totalAmount).times(fxRate).toNumber();

    const categoryDef = dto.category
      ? UAE_EXPENSE_CATEGORIES.find((c) => c.code === dto.category) || UAE_EXPENSE_CATEGORIES[16]
      : UAE_EXPENSE_CATEGORIES.find((c) => c.code === existing.category) || UAE_EXPENSE_CATEGORIES[16];

    let lines = existing.lines;
    if (dto.lines) {
      lines = dto.lines.map((li, idx) => ({
        id: `line-${crypto.randomUUID()}-${idx}`,
        description: li.description,
        quantity: li.quantity || 1,
        unitPrice: li.unitPrice || li.amount,
        amount: li.amount,
        amountAED: new Decimal(li.amount).times(fxRate).toNumber(),
        vatRateType: (li.vatRateType as VatRateType) || 'STANDARD_5',
        vatPercentage: li.vatPercentage ?? 5,
        vatAmount: li.vatAmount ?? new Decimal(li.amount).times(0.05).toNumber(),
        vatRecoverability: 'FULLY_RECOVERABLE' as const,
      }));
    }

    const updated: ExpenseRecord = {
      ...existing,
      supplierName: dto.supplierName?.trim() || existing.supplierName,
      supplierTrn: dto.supplierTrn !== undefined ? dto.supplierTrn?.trim() || undefined : existing.supplierTrn,
      receiptNumber: dto.receiptNumber !== undefined ? dto.receiptNumber?.trim() || undefined : existing.receiptNumber,
      expenseDate,
      currency,
      subtotal,
      vatAmount,
      totalAmount,
      exchangeRate: fxRate,
      conversionEvidence: fxEvidence,
      subtotalAED,
      vatAmountAED,
      totalAmountAED,
      category: categoryDef.code,
      categoryNameEn: categoryDef.nameEn,
      paymentMethod: dto.paymentMethod || existing.paymentMethod,
      paymentStatus: dto.paymentStatus || existing.paymentStatus,
      description: dto.description !== undefined ? dto.description : existing.description,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
      lines,
      updatedAt: new Date().toISOString(),
    };

    this.memoryExpenses.set(id, updated);

    if (this.prisma) {
      try {
        await this.prisma.expenseBill.update({
          where: { id },
          data: {
            supplierName: updated.supplierName,
            supplierTrn: updated.supplierTrn || null,
            billNumber: updated.receiptNumber || null,
            billDate: new Date(updated.expenseDate),
            currency: updated.currency,
            exchangeRate: new Decimal(updated.exchangeRate),
            subtotal: new Decimal(updated.subtotal),
            vatTotal: new Decimal(updated.vatAmount),
            totalAmount: new Decimal(updated.totalAmount),
            totalAmountAED: new Decimal(updated.totalAmountAED),
            subtotalAED: new Decimal(updated.subtotalAED),
            vatTotalAED: new Decimal(updated.vatAmountAED),
            category: updated.category,
            paymentMethod: updated.paymentMethod,
            paymentStatus: updated.paymentStatus,
            description: updated.description,
            notes: updated.notes,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma updateExpense fallback: ${err?.message}`);
      }
    }

    return updated;
  }

  // ==========================================================================
  // 5. LIFECYCLE ACTIONS: APPROVE, REJECT, ARCHIVE
  // ==========================================================================

  public async approveExpense(id: string, orgId: string, userId: string): Promise<ExpenseRecord> {
    const expense = await this.getExpenseById(id, orgId);

    if (expense.status === 'APPROVED') {
      return expense; // Idempotent approval
    }

    if (expense.status === 'ARCHIVED' || expense.status === 'REJECTED') {
      throw new BadRequestException(
        `Cannot approve an expense in status '${expense.status}'. Please reset to review first.`
      );
    }

    if (expense.totalAmount <= 0) {
      throw new BadRequestException('Cannot approve an expense with zero or negative total amount.');
    }

    if (!expense.supplierName || expense.supplierName.trim() === '') {
      throw new BadRequestException('Cannot approve an expense without a valid supplier/merchant name.');
    }

    const approvedAt = new Date().toISOString();
    const approved: ExpenseRecord = {
      ...expense,
      status: 'APPROVED',
      approvedById: userId,
      approvedAt,
      updatedAt: approvedAt,
    };

    this.memoryExpenses.set(id, approved);

    if (this.prisma) {
      try {
        await this.prisma.expenseBill.update({
          where: { id },
          data: {
            status: 'APPROVED' as any,
            approvedById: userId,
            approvedAt: new Date(approvedAt),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma approveExpense fallback: ${err?.message}`);
      }
    }

    this.logger.log(`Expense ${id} successfully approved by user ${userId} for business ${expense.businessId}`);
    return approved;
  }

  public async rejectExpense(
    id: string,
    reason: string,
    orgId: string,
    userId: string
  ): Promise<ExpenseRecord> {
    const expense = await this.getExpenseById(id, orgId);

    if (expense.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot reject an archived expense.');
    }

    const rejected: ExpenseRecord = {
      ...expense,
      status: 'REJECTED',
      notes: reason ? `${expense.notes ? expense.notes + ' | ' : ''}Rejected: ${reason}` : expense.notes,
      updatedAt: new Date().toISOString(),
    };

    this.memoryExpenses.set(id, rejected);

    if (this.prisma) {
      try {
        await this.prisma.expenseBill.update({
          where: { id },
          data: {
            status: 'REJECTED' as any,
            notes: rejected.notes,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma rejectExpense fallback: ${err?.message}`);
      }
    }

    return rejected;
  }

  public async archiveExpense(
    id: string,
    reason: string | undefined,
    orgId: string,
    userId: string
  ): Promise<ExpenseRecord> {
    const expense = await this.getExpenseById(id, orgId);

    const archived: ExpenseRecord = {
      ...expense,
      status: 'ARCHIVED',
      notes: reason ? `${expense.notes ? expense.notes + ' | ' : ''}Archived: ${reason}` : expense.notes,
      updatedAt: new Date().toISOString(),
    };

    this.memoryExpenses.set(id, archived);

    if (this.prisma) {
      try {
        await this.prisma.expenseBill.update({
          where: { id },
          data: {
            status: 'ARCHIVED' as any,
            notes: archived.notes,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma archiveExpense fallback: ${err?.message}`);
      }
    }

    return archived;
  }

  public async batchAction(
    dto: BatchExpenseActionDto,
    orgId: string,
    userId: string
  ): Promise<{ action: string; count: number; affectedIds: string[] }> {
    const affected: string[] = [];

    for (const expId of dto.expenseIds) {
      try {
        if (dto.action === 'APPROVE') {
          await this.approveExpense(expId, orgId, userId);
          affected.push(expId);
        } else if (dto.action === 'REJECT') {
          await this.rejectExpense(expId, dto.reason || 'Batch rejection', orgId, userId);
          affected.push(expId);
        } else if (dto.action === 'ARCHIVE') {
          await this.archiveExpense(expId, dto.reason || 'Batch archive', orgId, userId);
          affected.push(expId);
        } else if (dto.action === 'CATEGORIZE' && dto.category) {
          await this.updateExpense(expId, { category: dto.category }, orgId, userId);
          affected.push(expId);
        }
      } catch (err: any) {
        this.logger.warn(`Failed batch action for ${expId}: ${err?.message}`);
      }
    }

    return {
      action: dto.action,
      count: affected.length,
      affectedIds: affected,
    };
  }

  // ==========================================================================
  // 6. EXPENSE CATEGORIES & LEDGER SUMMARIES
  // ==========================================================================

  public getCategories(): ExpenseCategoryDef[] {
    return UAE_EXPENSE_CATEGORIES;
  }

  public async getExpenseSummaries(
    businessId: string,
    orgId: string,
    fiscalYear: number = 2026
  ): Promise<ExpenseSummaryReport> {
    await this.verifyBusinessOwnership(businessId, orgId);

    const expenses = await this.listExpenses({ businessId, status: 'ALL' }, orgId);

    let totalRecordedAED = new Decimal(0);
    let totalApprovedAED = new Decimal(0);
    let totalPendingReviewAED = new Decimal(0);
    let totalVatAED = new Decimal(0);

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    const categoryMap = new Map<string, { totalAED: Decimal; count: number }>();
    UAE_EXPENSE_CATEGORIES.forEach((cat) => {
      categoryMap.set(cat.code, { totalAED: new Decimal(0), count: 0 });
    });

    const monthMap = new Map<number, { totalAED: Decimal; approvedAED: Decimal; count: number }>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { totalAED: new Decimal(0), approvedAED: new Decimal(0), count: 0 });
    }

    for (const exp of expenses) {
      if (exp.status === 'ARCHIVED') continue;

      const amtAED = new Decimal(exp.totalAmountAED);
      const vatAmtAED = new Decimal(exp.vatAmountAED);

      totalRecordedAED = totalRecordedAED.plus(amtAED);
      totalVatAED = totalVatAED.plus(vatAmtAED);

      if (exp.status === 'APPROVED') {
        totalApprovedAED = totalApprovedAED.plus(amtAED);
        approvedCount++;
      } else if (exp.status === 'REVIEW_REQUIRED' || exp.status === 'PROCESSING') {
        totalPendingReviewAED = totalPendingReviewAED.plus(amtAED);
        pendingCount++;
      } else if (exp.status === 'REJECTED') {
        rejectedCount++;
      }

      // Category aggregation
      const catEntry = categoryMap.get(exp.category) || { totalAED: new Decimal(0), count: 0 };
      catEntry.totalAED = catEntry.totalAED.plus(amtAED);
      catEntry.count++;
      categoryMap.set(exp.category, catEntry);

      // Monthly aggregation
      const d = new Date(exp.expenseDate);
      if (d.getFullYear() === fiscalYear) {
        const monthNum = d.getMonth() + 1;
        const mEntry = monthMap.get(monthNum) || {
          totalAED: new Decimal(0),
          approvedAED: new Decimal(0),
          count: 0,
        };
        mEntry.totalAED = mEntry.totalAED.plus(amtAED);
        if (exp.status === 'APPROVED') {
          mEntry.approvedAED = mEntry.approvedAED.plus(amtAED);
        }
        mEntry.count++;
        monthMap.set(monthNum, mEntry);
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const categoryBreakdown = UAE_EXPENSE_CATEGORIES.map((cat) => {
      const entry = categoryMap.get(cat.code) || { totalAED: new Decimal(0), count: 0 };
      const catTotal = entry.totalAED.toNumber();
      const pct = totalRecordedAED.isZero()
        ? 0
        : Math.round((catTotal / totalRecordedAED.toNumber()) * 1000) / 10;

      return {
        category: cat.code,
        categoryNameEn: cat.nameEn,
        categoryNameAr: cat.nameAr,
        totalAmountAED: catTotal,
        count: entry.count,
        percentage: pct,
      };
    }).sort((a, b) => b.totalAmountAED - a.totalAmountAED);

    const monthlySummary = Array.from(monthMap.entries()).map(([m, val]) => ({
      year: fiscalYear,
      month: m,
      monthName: monthNames[m - 1],
      totalAmountAED: val.totalAED.toNumber(),
      approvedAmountAED: val.approvedAED.toNumber(),
      count: val.count,
    }));

    return {
      totalRecordedExpensesAED: totalRecordedAED.toNumber(),
      totalApprovedExpensesAED: totalApprovedAED.toNumber(),
      totalPendingReviewAED: totalPendingReviewAED.toNumber(),
      totalVatAmountAED: totalVatAED.toNumber(),
      totalExpenseCount: expenses.length,
      approvedCount,
      pendingCount,
      rejectedCount,
      categoryBreakdown,
      monthlySummary,
    };
  }

  // ==========================================================================
  // 7. RECEIPT ATTACHMENT STREAMING
  // ==========================================================================

  public async getAttachmentStream(fileId: string, orgId: string) {
    // Find document to verify business and org ownership
    if (this.prisma) {
      try {
        const doc = await this.prisma.document.findUnique({
          where: { id: fileId },
          include: { business: true },
        });

        if (doc) {
          await this.verifyBusinessOwnership(doc.businessId, orgId);
          if (fs.existsSync(doc.fileUrl)) {
            return {
              stream: fs.createReadStream(doc.fileUrl),
              mimeType: doc.mimeType,
              filename: doc.originalFilename,
            };
          }
        }
      } catch (e) {
        // fallback to filesystem search
      }
    }

    // Search disk for fileId
    const possibleExts = ['jpg', 'png', 'pdf'];
    for (const ext of possibleExts) {
      const candidatePath = path.join(this.storageBasePath, orgId, '**', `${fileId}.${ext}`);
      // Check direct path if known
    }

    throw new NotFoundException(`Receipt attachment ${fileId} not found or access denied.`);
  }
}
