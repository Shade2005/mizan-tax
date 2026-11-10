// ============================================================================
// Mizan (ميزان) - Cloud Firestore Statutory Data Service
// Direct serverless persistence layer for UAE businesses, tax entities,
// invoices, expenses, and statutory compliance profiles
// ============================================================================

import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from './firebase';

export interface FirestoreBusiness {
  id: string;
  ownerId: string;
  legalName: string;
  tradeName?: string;
  tradeLicenseNumber: string;
  legalEntityType: string;
  jurisdictionType: string;
  licensingAuthority: string;
  emirate?: string;
  annualRevenueEstimateAED?: number;
  vatTrn?: string;
  corporateTaxTrn?: string;
  isSmallBusinessReliefEligible?: boolean;
  corporateTaxRatePercent?: number;
  taxPeriodStart?: string;
  taxPeriodEnd?: string;
  verificationStatus?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreInvoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerName: string;
  customerTrn?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  vatRatePercent: number;
  vatAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  items?: any[];
  qrCodeData?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreExpense {
  id: string;
  businessId: string;
  merchantName: string;
  category: string;
  amount: number;
  vatAmount: number;
  vatRatePercent: number;
  receiptUrl?: string;
  date: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export class FirestoreService {
  /**
   * Helper to ensure the current session is authenticated
   * Returns the authenticated user UID or throws an error
   */
  private static requireAuthUid(): string {
    const user = auth.currentUser;
    if (!user || !user.uid) {
      throw new Error('Authentication required. Please sign in to access your UAE business records.');
    }
    return user.uid;
  }

  /**
   * Persists or updates a UAE Business Entity in the /businesses collection
   * Automatically scopes the document with the caller's ownerId
   */
  public static async saveBusiness(payload: Partial<FirestoreBusiness>): Promise<FirestoreBusiness> {
    const ownerId = this.requireAuthUid();
    
    // Generate an ID if not provided
    const businessId = payload.id || `biz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const businessRef = doc(db, 'businesses', businessId);

    // Statutory calculation for Small Business Relief (MD 73/2023)
    const revenue = Number(payload.annualRevenueEstimateAED || 0);
    const isSbrEligible = revenue <= 3000000;
    const taxRate = isSbrEligible ? 0 : 9;

    const record: FirestoreBusiness = {
      id: businessId,
      ownerId,
      legalName: payload.legalName || 'Unnamed Entity',
      tradeName: payload.tradeName || payload.legalName || '',
      tradeLicenseNumber: payload.tradeLicenseNumber || `TL-${Date.now().toString().slice(-6)}`,
      legalEntityType: payload.legalEntityType || 'LLC',
      jurisdictionType: payload.jurisdictionType || 'MAINLAND',
      licensingAuthority: payload.licensingAuthority || 'DET',
      emirate: payload.emirate || 'Dubai',
      annualRevenueEstimateAED: revenue,
      vatTrn: payload.vatTrn || '',
      corporateTaxTrn: payload.corporateTaxTrn || '',
      isSmallBusinessReliefEligible: isSbrEligible,
      corporateTaxRatePercent: taxRate,
      verificationStatus: payload.verificationStatus || 'UNVERIFIED',
      updatedAt: serverTimestamp(),
    };

    // Include createdAt only for new documents
    if (!payload.id) {
      record.createdAt = serverTimestamp();
    }

    await setDoc(businessRef, record, { merge: true });
    return record;
  }

  /**
   * Retrieves all UAE businesses owned by the current authenticated user
   */
  public static async getBusinesses(): Promise<FirestoreBusiness[]> {
    const ownerId = this.requireAuthUid();
    const businessesRef = collection(db, 'businesses');
    const q = query(businessesRef, where('ownerId', '==', ownerId));

    const snapshot = await getDocs(q);
    const list: FirestoreBusiness[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as FirestoreBusiness);
    });

    return list;
  }

  /**
   * Fetches a single business profile by ID
   */
  public static async getBusinessById(businessId: string): Promise<FirestoreBusiness | null> {
    this.requireAuthUid();
    const businessRef = doc(db, 'businesses', businessId);
    const snap = await getDoc(businessRef);
    if (!snap.exists()) return null;
    return snap.data() as FirestoreBusiness;
  }

  /**
   * Saves an invoice under the business's subcollection /businesses/{businessId}/invoices/{invoiceId}
   */
  public static async saveInvoice(businessId: string, invoice: Partial<FirestoreInvoice>): Promise<FirestoreInvoice> {
    this.requireAuthUid();
    const invoiceId = invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const invoiceRef = doc(db, 'businesses', businessId, 'invoices', invoiceId);

    const subtotal = Number(invoice.subtotal || 0);
    const vatRate = Number(invoice.vatRatePercent ?? 5);
    const vatAmount = invoice.vatAmount !== undefined ? Number(invoice.vatAmount) : (subtotal * vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    const record: FirestoreInvoice = {
      id: invoiceId,
      businessId,
      invoiceNumber: invoice.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      customerName: invoice.customerName || 'Customer LLC',
      customerTrn: invoice.customerTrn || '',
      issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate,
      currency: invoice.currency || 'AED',
      subtotal,
      vatRatePercent: vatRate,
      vatAmount,
      totalAmount,
      status: invoice.status || 'ISSUED',
      items: invoice.items || [],
      qrCodeData: invoice.qrCodeData || '',
      updatedAt: serverTimestamp(),
    };

    if (!invoice.id) {
      record.createdAt = serverTimestamp();
    }

    await setDoc(invoiceRef, record, { merge: true });
    return record;
  }

  /**
   * Lists all invoices for a given business
   */
  public static async getInvoices(businessId: string): Promise<FirestoreInvoice[]> {
    this.requireAuthUid();
    const invoicesRef = collection(db, 'businesses', businessId, 'invoices');
    const snapshot = await getDocs(invoicesRef);
    const list: FirestoreInvoice[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as FirestoreInvoice);
    });
    return list;
  }

  /**
   * Saves a business expense under /businesses/{businessId}/expenses/{expenseId}
   */
  public static async saveExpense(businessId: string, expense: Partial<FirestoreExpense>): Promise<FirestoreExpense> {
    this.requireAuthUid();
    const expenseId = expense.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expenseRef = doc(db, 'businesses', businessId, 'expenses', expenseId);

    const amount = Number(expense.amount || 0);
    const vatRate = Number(expense.vatRatePercent ?? 5);
    const vatAmount = expense.vatAmount !== undefined ? Number(expense.vatAmount) : (amount * vatRate) / 100;

    const record: FirestoreExpense = {
      id: expenseId,
      businessId,
      merchantName: expense.merchantName || 'Supplier LLC',
      category: expense.category || 'General',
      amount,
      vatAmount,
      vatRatePercent: vatRate,
      receiptUrl: expense.receiptUrl,
      date: expense.date || new Date().toISOString().split('T')[0],
      notes: expense.notes,
      updatedAt: serverTimestamp(),
    };

    if (!expense.id) {
      record.createdAt = serverTimestamp();
    }

    await setDoc(expenseRef, record, { merge: true });
    return record;
  }

  /**
   * Lists all expenses for a given business
   */
  public static async getExpenses(businessId: string): Promise<FirestoreExpense[]> {
    this.requireAuthUid();
    const expensesRef = collection(db, 'businesses', businessId, 'expenses');
    const snapshot = await getDocs(expensesRef);
    const list: FirestoreExpense[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as FirestoreExpense);
    });
    return list;
  }
}
