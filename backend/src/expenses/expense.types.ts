// ============================================================================
// Mizan (ميزان) - Expense & Bookkeeping Type Definitions
// Compliant with UAE VAT Decree-Law No. 8 of 2017 & Corporate Tax Law No. 47 of 2022
// ============================================================================

import Decimal from 'decimal.js';

export type ExpenseStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'PROCESSING_FAILED'
  | 'REJECTED'
  | 'ARCHIVED';

export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED';

export type PaymentMethodType =
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'CASH'
  | 'CHEQUE'
  | 'UAE_PAY'
  | 'OTHER';

export type PaymentStatusType = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export type VatRateType = 'STANDARD_5' | 'ZERO_RATED_0' | 'EXEMPT' | 'OUT_OF_SCOPE' | 'REVERSE_CHARGE';

export type VatRecoverabilityStatus =
  | 'FULLY_RECOVERABLE'
  | 'PARTIALLY_RECOVERABLE'
  | 'BLOCKED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'NOT_APPLICABLE';

export interface ExpenseCategoryDef {
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  defaultVatRateType: VatRateType;
  defaultVatPercentage: number;
  icon: string;
}

export const UAE_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  {
    code: 'RENT_PREMISES',
    nameEn: 'Rent and Premises',
    nameAr: 'إيجار ومباني',
    description: 'Commercial property leases, warehouse rent, office space',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'business-outline',
  },
  {
    code: 'UTILITIES',
    nameEn: 'Utilities',
    nameAr: 'المرافق والخدمات',
    description: 'Electricity and water (DEWA, SEWA, FEWA), district cooling (Empower)',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'water-outline',
  },
  {
    code: 'TELECOMMUNICATIONS',
    nameEn: 'Telecommunications',
    nameAr: 'الاتصالات والإنترنت',
    description: 'Business internet, landlines, mobile plans (e&, du)',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'cellular-outline',
  },
  {
    code: 'OFFICE_SUPPLIES',
    nameEn: 'Office Supplies',
    nameAr: 'مستلزمات مكتبية',
    description: 'Stationery, pantry items, printer ink, furniture, consumables',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'cart-outline',
  },
  {
    code: 'SOFTWARE_SUBSCRIPTIONS',
    nameEn: 'Software and Subscriptions',
    nameAr: 'برمجيات واشتراكات',
    description: 'Cloud hosting (AWS, Azure), SaaS subscriptions, software licenses',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'laptop-outline',
  },
  {
    code: 'MARKETING_ADVERTISING',
    nameEn: 'Marketing and Advertising',
    nameAr: 'التسويق والإعلان',
    description: 'Online ad spend (Google, Meta, LinkedIn), print, PR campaigns',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'megaphone-outline',
  },
  {
    code: 'PROFESSIONAL_SERVICES',
    nameEn: 'Professional Services',
    nameAr: 'خدمات مهنية واستشارية',
    description: 'Management consultants, IT contractors, design & engineering fees',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'briefcase-outline',
  },
  {
    code: 'LEGAL_ACCOUNTING',
    nameEn: 'Legal and Accounting',
    nameAr: 'خدمات قانونية ومحاسبية',
    description: 'Law firms, audit, statutory bookkeepers, tax agent retainers',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'document-text-outline',
  },
  {
    code: 'EMPLOYEE_EXPENSES',
    nameEn: 'Employee Expenses',
    nameAr: 'نفقات الموظفين',
    description: 'Staff training, work visas, Emirates ID processing, health insurance',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'people-outline',
  },
  {
    code: 'TRAVEL_TRANSPORTATION',
    nameEn: 'Travel and Transportation',
    nameAr: 'السفر والانتقال',
    description: 'Business flights, airline tickets, rail, duty accommodation',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'airplane-outline',
  },
  {
    code: 'VEHICLE_EXPENSES',
    nameEn: 'Vehicle Expenses',
    nameAr: 'نفقات المركبات والوقود',
    description: 'Fuel (ENOC, ADNOC, Emarat), Salik tolls, commercial vehicle maintenance',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'car-outline',
  },
  {
    code: 'INVENTORY_PURCHASES',
    nameEn: 'Inventory and Purchases',
    nameAr: 'المشتريات والمخزون (تكلفة البضاعة)',
    description: 'Raw materials, merchandise for resale, packaging materials (COGS)',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'cube-outline',
  },
  {
    code: 'REPAIRS_MAINTENANCE',
    nameEn: 'Repairs and Maintenance',
    nameAr: 'الصيانة والإصلاحات',
    description: 'Equipment repair, office maintenance, AC servicing',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'construct-outline',
  },
  {
    code: 'BANK_CHARGES',
    nameEn: 'Bank Charges and Fees',
    nameAr: 'الرسوم والعمولات المصرفية',
    description: 'Transfer fees, account maintenance, payment gateway processing fees',
    defaultVatRateType: 'EXEMPT',
    defaultVatPercentage: 0,
    icon: 'card-outline',
  },
  {
    code: 'INSURANCE',
    nameEn: 'Insurance',
    nameAr: 'التأمين',
    description: 'Commercial liability, property insurance, marine freight cargo cover',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'shield-checkmark-outline',
  },
  {
    code: 'GOVERNMENT_FEES',
    nameEn: 'Government Fees',
    nameAr: 'الرسوم والغرامات الحكومية',
    description: 'Trade license renewal fees, chamber of commerce, municipal taxes',
    defaultVatRateType: 'OUT_OF_SCOPE',
    defaultVatPercentage: 0,
    icon: 'ribbon-outline',
  },
  {
    code: 'OTHER_BUSINESS_EXPENSES',
    nameEn: 'Other Business Expenses',
    nameAr: 'نفقات تشغيلية أخرى',
    description: 'Miscellaneous authorized business operational expenses',
    defaultVatRateType: 'STANDARD_5',
    defaultVatPercentage: 5,
    icon: 'ellipsis-horizontal-outline',
  },
];

export interface ExpenseLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  amountAED: number;
  vatRateType: VatRateType;
  vatPercentage: number;
  vatAmount: number;
  vatRecoverability: VatRecoverabilityStatus;
}

export interface ExpenseRecord {
  id: string;
  organisationId: string;
  businessId: string;
  supplierId?: string;
  supplierName: string;
  supplierTrn?: string;
  receiptNumber?: string;
  expenseDate: string; // YYYY-MM-DD
  recordingDate: string; // ISO
  currency: string;
  originalAmount: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  exchangeRate: number;
  conversionEvidence?: any;
  subtotalAED: number;
  vatAmountAED: number;
  totalAmountAED: number;
  category: string;
  categoryNameEn: string;
  paymentMethod?: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  vatTreatment: string;
  vatRate: number;
  receiptAttachmentUrl?: string;
  documentId?: string;
  ocrStatus: OcrStatus;
  ocrConfidence?: number;
  ocrRawData?: any;
  status: ExpenseStatus;
  notes?: string;
  description?: string;
  isReverseCharge: boolean;
  duplicateWarning: boolean;
  duplicateReferenceId?: string;
  approvedById?: string;
  approvedAt?: string;
  lines: ExpenseLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateExpenseId?: string;
  reason?: string;
}

export interface ExpenseSummaryReport {
  totalRecordedExpensesAED: number;
  totalApprovedExpensesAED: number;
  totalPendingReviewAED: number;
  totalVatAmountAED: number;
  totalExpenseCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  categoryBreakdown: Array<{
    category: string;
    categoryNameEn: string;
    categoryNameAr: string;
    totalAmountAED: number;
    count: number;
    percentage: number;
  }>;
  monthlySummary: Array<{
    year: number;
    month: number;
    monthName: string;
    totalAmountAED: number;
    approvedAmountAED: number;
    count: number;
  }>;
}
