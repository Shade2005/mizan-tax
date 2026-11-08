// ============================================================================
// Mizan (ميزان) - UAE Invoicing & Tax Compliance Types
// Formal definitions for Tax Invoices, Simplified Invoices, Line Items & Credit Notes
// Governing: Federal Decree-Law No. 8 of 2017 (VAT) & Executive Regulations Art. 59
// ============================================================================

export type VatTreatment =
  | 'STANDARD_5'       // 5% standard rate
  | 'ZERO_RATED_0'     // 0% exports, qualifying international transport, healthcare, education
  | 'EXEMPT'           // 0% local passenger transport, residential leases, certain financial services
  | 'OUT_OF_SCOPE'     // Non-economic activities, outside UAE jurisdiction
  | 'REVERSE_CHARGE';  // Cross-border B2B SaaS, designated services under Art. 48

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'CANCELLED';

export type InvoiceType =
  | 'TAX_INVOICE'            // Full Tax Invoice under Art. 59(1) (mandatory for >= AED 10,000 or upon request)
  | 'SIMPLIFIED_TAX_INVOICE' // Simplified Tax Invoice under Art. 59(5) (consideration < AED 10,000)
  | 'COMMERCIAL_INVOICE';    // Non-VAT registered business (no VAT charged, no "Tax Invoice" label)

export type CustomerType =
  | 'INDIVIDUAL'
  | 'CORPORATE'
  | 'GOVERNMENT'
  | 'FOREIGN_ENTITY';

export interface CustomerRecord {
  id: string;
  businessId: string;
  name: string;
  companyName?: string;
  customerType: CustomerType;
  trn?: string; // 15-digit UAE TRN
  email?: string;
  phone?: string;
  billingAddress: string;
  emirate?: string;
  country: string;
  isFreeZone?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItemInput {
  id?: string;
  description: string;
  itemName?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number; // Line-level discount amount
  vatTreatment: VatTreatment;
}

export interface CalculatedInvoiceLine {
  id: string;
  description: string;
  itemName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxableAmount: number; // (quantity * unitPrice) - discount
  vatRatePercentage: number;
  vatTreatment: VatTreatment;
  vatAmount: number;
  lineTotal: number; // taxableAmount + vatAmount
  taxableAmountAED: number;
  vatAmountAED: number;
  lineTotalAED: number;
  statutoryLegalBasis: string;
  isVatCharged: boolean; // false for unregistered supplier under Art. 65(1)
}

export interface ExchangeRateEvidence {
  currencyPair: string; // e.g. "USD/AED"
  exchangeRate: number;
  rateSource: 'CBUAE_OFFICIAL_FIX' | 'CBUAE_PUBLISHED_DAILY' | 'USER_VERIFIED_OVERRIDE' | 'UNRESOLVED_RATE_ERROR';
  effectiveDate: string; // YYYY-MM-DD
  retrievalTimestamp: string; // ISO 8601
  supplyDateUsed: string; // YYYY-MM-DD
  isOfficialCbUae: boolean;
  unresolvedReason?: string;
}

export interface PaymentRecord {
  id: string;
  businessId: string;
  invoiceId: string;
  amount: number;
  amountAED: number;
  currency: string;
  exchangeRate: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  isRefund?: boolean;
  createdAt: Date;
}

export interface InvoiceCalculationSummary {
  currency: string;
  exchangeRate: number;
  subtotalGross: number;
  totalDiscount: number;
  subtotalNetTaxable: number;
  totalVat: number;
  grandTotal: number;
  amountPaid: number;
  outstandingBalance: number;
  statutoryAED: {
    subtotalNetTaxableAED: number;
    totalVatAED: number;
    grandTotalAED: number;
    amountPaidAED: number;
    outstandingBalanceAED: number;
    legalReference: string;
  };
  vatBreakdown: {
    treatment: VatTreatment;
    ratePct: number;
    taxableAmount: number;
    vatAmount: number;
    taxableAmountAED: number;
    vatAmountAED: number;
    legalBasis: string;
  }[];
}

export interface InvoiceRecord {
  id: string;
  organisationId: string;
  businessId: string;
  customerId: string;
  customer: CustomerRecord;
  invoiceNumber: string;
  sequenceNumber: number;
  invoiceType: InvoiceType;
  issueDate: string; // ISO date YYYY-MM-DD
  supplyDate: string; // Date of supply under Art. 25 & 26
  dueDate: string;
  currency: string;
  exchangeRate: number;
  paymentTerms: string;
  purchaseOrderReference?: string;
  customerReference?: string;
  notes?: string;
  termsAndConditions?: string;
  status: InvoiceStatus;
  lines: CalculatedInvoiceLine[];
  calculation: InvoiceCalculationSummary;
  amountPaid: number;
  outstandingBalance: number;
  issuedAt?: string;
  issuedBy?: string;
  isImmutable: boolean;
  pdfChecksum?: string;
  renderedHtml?: string;
  businessSnapshot?: Record<string, any>;
  customerSnapshot?: Record<string, any>;
  exchangeRateEvidence?: ExchangeRateEvidence;
  payments?: PaymentRecord[];
  creditedAmount?: number;
  creditNoteId?: string;
  creditNotes?: CreditNoteRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditNoteRecord {
  id: string;
  organisationId: string;
  businessId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  creditNoteNumber: string;
  issueDate: string;
  reason: string;
  statutoryBasis: string; // Cabinet Decision No. 52/2017 Art. 60 & FDL No. 8/2017 Art. 70
  subtotalCredited: number;
  vatCredited: number;
  totalCredited: number;
  currency: string;
  exchangeRate: number;
  lines: CalculatedInvoiceLine[];
  issuedAt: string;
  issuedBy: string;
  pdfChecksum?: string;
  createdAt: Date;
}

export interface ComplianceValidationResult {
  isValid: boolean;
  invoiceType: InvoiceType;
  missingMandatoryFields: string[];
  warnings: string[];
  statutoryCitations: string[];
}
