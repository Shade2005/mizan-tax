// ============================================================================
// Mizan (ميزان) - Mobile API Client
// Connects Expo client to the NestJS Tax Intelligence backend on port 4000
// ============================================================================

import { Platform } from 'react-native';
import { AppStorage } from '../utils/storage';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from './firebase';

export const STORAGE_KEY_AUTH_TOKEN = 'mizan_auth_token';
export const STORAGE_KEY_ORG_ID = 'mizan_organisation_id';
export const STORAGE_KEY_USER_PROFILE = 'mizan_user_profile';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Production cloud API on Render (accessible by real Android devices and emulators)
  return 'https://mizan-api-jpen.onrender.com';
};

export const API_BASE_URL = getBaseUrl();

export interface SaveTradeLicensePayload {
  organisationId?: string;
  tradeLicenseNumber: string;
  legalName: string;
  tradeName?: string;
  legalEntityType: 'NATURAL_PERSON' | 'SOLE_ESTABLISHMENT' | 'LLC' | 'FREE_ZONE_ESTABLISHMENT' | 'FREE_ZONE_COMPANY' | 'BRANCH_OF_FOREIGN_COMPANY';
  jurisdictionType: 'MAINLAND' | 'FREE_ZONE' | 'DESIGNATED_FREE_ZONE';
  licensingAuthority: string;
  emirate?: string;
  issueDate?: string;
  expiryDate?: string;
  annualRevenueEstimateAED?: number;
  vatTrn?: string;
  corporateTaxTrn?: string;
  address?: string;
  businessActivities?: string[];
  verificationStatus?: string;
}

export interface EmaraTaxReadinessResponse {
  businessId: string;
  legalName: string;
  tradeLicenseNumber: string;
  overallStatus: 'LIKELY_COMPLIANT' | 'ACTION_REQUIRED' | 'HIGH_RISK';
  summaryMessage: string;
  corporateTax: {
    isApplicable: boolean;
    statusBadge: string;
    reliefStatus: string;
    estimatedLiabilityAED: number;
    statutoryRegistrationDeadline: string;
    penaltyRiskAmountAED: number;
    legalReference: string;
  };
  vat: {
    isRegistrationRequired: boolean;
    statusBadge: string;
    annualTaxableTurnoverAED: number;
    mandatoryThresholdAED: number;
    estimatedNetVatPayableAED: number;
    legalReference: string;
  };
  complianceChecklist: Array<{
    id: string;
    title: string;
    status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
    dueDate: string;
    potentialPenaltyAED?: number;
  }>;
  engineVersion: string;
  assessedAt: string;
}

let currentAuthToken: string | null = null;
let currentOrganisationId: string = 'org-a-flexflow';

export class MizanApi {
  public static setAuthToken(token: string | null, orgId?: string): void {
    currentAuthToken = token;
    if (orgId) currentOrganisationId = orgId;
  }

  public static getAuthToken(): string | null {
    return currentAuthToken;
  }

  public static getCurrentOrganisationId(): string {
    return currentOrganisationId;
  }

  public static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentAuthToken) {
      headers['Authorization'] = `Bearer ${currentAuthToken}`;
    }
    return headers;
  }

  public static async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    organisationName?: string;
  }): Promise<any> {
    let idToken = '';
    let firebaseUser: any = null;

    // 1. Create account in Firebase Auth
    try {
      const userCred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
      firebaseUser = userCred.user;
      if (payload.fullName) {
        try {
          await updateProfile(firebaseUser, { displayName: payload.fullName.trim() });
        } catch {}
      }
      idToken = await firebaseUser.getIdToken();
      this.setAuthToken(idToken);
      await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, idToken);
    } catch (fbErr: any) {
      console.warn('Firebase registration error, checking direct backend:', fbErr?.code || fbErr?.message);
      // Fallback to direct backend registration
      try {
        const directRes = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData.accessToken) {
            this.setAuthToken(directData.accessToken, directData.organisation?.id);
            await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, directData.accessToken);
            if (directData.organisation?.id) {
              await AppStorage.setItem(STORAGE_KEY_ORG_ID, directData.organisation.id);
            }
            if (directData.user) {
              await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(directData.user));
            }
            return directData;
          }
        }
      } catch {}
      throw fbErr;
    }

    // 2. Synchronize account with PostgreSQL backend
    try {
      const syncRes = await fetch(`${API_BASE_URL}/api/v1/auth/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (syncRes.ok) {
        const data = await syncRes.json();
        if (data.activeOrganisation?.id) {
          this.setAuthToken(idToken, data.activeOrganisation.id);
          await AppStorage.setItem(STORAGE_KEY_ORG_ID, data.activeOrganisation.id);
        }
        if (data.user) {
          await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(data.user));
        }
        return data;
      }
    } catch (syncErr) {
      console.warn('Backend user synchronization deferred:', syncErr);
    }

    const fallbackUser = {
      id: firebaseUser?.uid || 'user-default',
      email: firebaseUser?.email || payload.email.trim(),
      fullName: payload.fullName || firebaseUser?.displayName || 'Taxpayer',
    };
    await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(fallbackUser));
    return { user: fallbackUser, accessToken: idToken };
  }

  public static async login(payload: { email: string; password: string }): Promise<any> {
    let idToken = '';
    let firebaseUser: any = null;

    // 1. Authenticate with Firebase Auth
    try {
      const userCred = await signInWithEmailAndPassword(auth, payload.email.trim(), payload.password);
      firebaseUser = userCred.user;
      idToken = await firebaseUser.getIdToken();
      this.setAuthToken(idToken);
      await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, idToken);
    } catch (fbErr: any) {
      console.warn('Firebase login error, checking direct backend:', fbErr?.code || fbErr?.message);
      // Fallback to direct backend login
      try {
        const directRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData.accessToken) {
            this.setAuthToken(directData.accessToken, directData.organisation?.id);
            await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, directData.accessToken);
            if (directData.organisation?.id) {
              await AppStorage.setItem(STORAGE_KEY_ORG_ID, directData.organisation.id);
            }
            if (directData.user) {
              await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(directData.user));
            }
            return directData;
          }
        }
      } catch {}
      throw fbErr;
    }

    // 2. Synchronize profile and active organisation with PostgreSQL backend
    try {
      const syncRes = await fetch(`${API_BASE_URL}/api/v1/auth/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (syncRes.ok) {
        const data = await syncRes.json();
        if (data.activeOrganisation?.id) {
          this.setAuthToken(idToken, data.activeOrganisation.id);
          await AppStorage.setItem(STORAGE_KEY_ORG_ID, data.activeOrganisation.id);
        }
        if (data.user) {
          await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(data.user));
        }
        return data;
      }
    } catch (syncErr) {
      console.warn('Backend user profile synchronization deferred:', syncErr);
    }

    const fallbackUser = {
      id: firebaseUser?.uid || 'user-default',
      email: firebaseUser?.email || payload.email.trim(),
      fullName: firebaseUser?.displayName || 'Taxpayer',
    };
    await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(fallbackUser));
    return { user: fallbackUser, accessToken: idToken };
  }

  public static async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  public static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch {}
    currentAuthToken = null;
    currentOrganisationId = '';
    await AppStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    await AppStorage.removeItem(STORAGE_KEY_ORG_ID);
    await AppStorage.removeItem(STORAGE_KEY_USER_PROFILE);
    await AppStorage.removeItem('mizan_active_business_id');
  }

  public static async getProfile(): Promise<any> {
    // Instant resolution if authenticated via Firebase
    if (auth.currentUser) {
      const u = auth.currentUser;
      return {
        user: {
          id: u.uid,
          email: u.email || '',
          fullName: u.displayName || u.email?.split('@')[0] || 'User',
          phone: u.phoneNumber || undefined,
        },
        activeOrganisation: {
          id: `org_${u.uid}`,
          name: u.displayName ? `${u.displayName}'s Entity` : 'UAE Enterprise',
          role: 'ADMIN',
        },
      };
    }

    await this.ensureAuthenticated();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error('Failed to retrieve user profile');
      }
      return res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  public static async loadStoredSession(): Promise<boolean> {
    try {
      const token = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      const orgId = await AppStorage.getItem(STORAGE_KEY_ORG_ID);
      if (token) {
        currentAuthToken = token;
        if (orgId) currentOrganisationId = orgId;
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile?.user) {
            await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile.user));
          }
          return true;
        } else {
          await this.logout();
          return false;
        }
      }
    } catch {
      // Offline fallback
    }
    return false;
  }

  /**
   * Initializes session token from backend for the specified sandbox user identity
   */
  public static async initSession(userKey: 'user-a' | 'user-b' | 'superadmin' = 'user-a'): Promise<string> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/demo-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKey }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          currentAuthToken = data.accessToken;
          if (data.user?.organisationId) {
            currentOrganisationId = data.user.organisationId;
          }
          return data.accessToken;
        }
      }
    } catch (err) {
      console.warn('Network session initialization failed, using local offline fallback:', err);
    }
    return '';
  }

  /**
   * Guarantees an active authentication session before executing privileged API calls
   */
  public static async ensureAuthenticated(userKey: 'user-a' | 'user-b' | 'superadmin' = 'user-a'): Promise<string> {
    if (auth.currentUser) {
      try {
        const freshToken = await auth.currentUser.getIdToken();
        if (freshToken) {
          currentAuthToken = freshToken;
          await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, freshToken);
          return freshToken;
        }
      } catch {}
    }
    if (currentAuthToken) return currentAuthToken;
    const restored = await this.loadStoredSession();
    if (restored && currentAuthToken) return currentAuthToken;
    return this.initSession(userKey);
  }

  /**
   * Persists scanned and verified Trade License directly to Cloud Firestore
   * with seamless fallback to backend API if needed
   */
  public static async saveTradeLicense(payload: SaveTradeLicensePayload): Promise<any> {
    // If Firebase Auth session is active, write directly to Cloud Firestore
    if (auth.currentUser) {
      try {
        const { FirestoreService } = require('./firestore.service');
        const saved = await FirestoreService.saveBusiness(payload);
        return saved;
      } catch (err: any) {
        console.warn('Firestore direct write failed, attempting backend fallback:', err.message);
      }
    }

    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to save trade license (HTTP ${res.status})`);
    }

    return res.json();
  }

  /**
   * Lists all registered business entities for the authenticated user from Cloud Firestore
   */
  public static async getBusinesses(): Promise<any[]> {
    // If Firebase Auth session is active, read directly from Cloud Firestore
    if (auth.currentUser) {
      try {
        const { FirestoreService } = require('./firestore.service');
        const list = await FirestoreService.getBusinesses();
        if (list && list.length > 0) {
          return list;
        }
      } catch (err: any) {
        console.warn('Firestore read failed, attempting backend fallback:', err?.message || err);
      }
    }

    try {
      await this.ensureAuthenticated();
      const res = await fetch(`${API_BASE_URL}/api/v1/businesses`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        return [];
      }
      return res.json();
    } catch {
      return [];
    }
  }

  /**
   * Retrieves single business entity by ID or trade license number
   */
  public static async getBusiness(idOrLicense: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses/${encodeURIComponent(idOrLicense)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch business (HTTP ${res.status})`);
    }
    return res.json();
  }

  /**
   * Updates an existing business profile within the tenant boundary
   */
  public static async updateBusiness(idOrLicense: string, payload: Partial<SaveTradeLicensePayload>): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses/${encodeURIComponent(idOrLicense)}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update business (HTTP ${res.status})`);
    }
    return res.json();
  }

  /**
   * Evaluates real-time EmaraTax Readiness Assessment from the backend
   */
  public static async getTaxReadiness(
    licenseNumber: string,
    revenue: number = 1200000
  ): Promise<EmaraTaxReadinessResponse> {
    await this.ensureAuthenticated();
    const url = `${API_BASE_URL}/api/v1/businesses/${encodeURIComponent(
      licenseNumber
    )}/readiness?revenue=${revenue}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch tax readiness: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Runs deterministic Corporate Tax assessment on the backend
   */
  public static async assessCorporateTax(payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/corporate/assess`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Corporate Tax calculation failed');
    return res.json();
  }

  /**
   * Fetches curated prompt chips from the statutory AI assistant
   */
  public static async getAiPrompts(lang: 'en' | 'ar' = 'en'): Promise<Array<{ id: string; prompt: string; tag: string }>> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/prompts?lang=${lang}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch AI prompts');
    return res.json();
  }

  /**
   * Submits user tax query to grounded statutory AI
   */
  public static async askAi(
    message: string,
    lang: 'en' | 'ar' = 'en',
    context?: any,
    businessId?: string
  ): Promise<{
    answer: string;
    citations: Array<{
      id: string;
      authority: string;
      officialNumber: string;
      article: string;
      title: string;
      summary: string;
      officialUrl?: string;
    }>;
    statutoryRationale: string;
    actionRequired: string;
    emaraTaxImpact?: string;
    suggestedFollowUps: string[];
    isGrounded: boolean;
    topicId?: string;
    businessGrounding?: {
      entityName?: string;
      entityType?: string;
      isFreeZone?: boolean;
      applicableRelief?: string;
    };
  }> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, language: lang, context, businessId }),
    });
    if (!res.ok) throw new Error('Failed to obtain AI answer');
    return res.json();
  }

  /**
   * Creates a persistent AI conversation thread scoped to the user and active business
   */
  public static async createAiConversation(businessId?: string, title?: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ businessId, title }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  }

  /**
   * Retrieves conversation threads for the authenticated user
   */
  public static async getAiConversations(businessId?: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/conversations${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  }

  /**
   * Retrieves specific conversation with complete message history and citations
   */
  public static async getAiConversation(conversationId: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversation history');
    return res.json();
  }

  /**
   * Sends a message within a persistent conversation thread
   */
  public static async sendAiConversationMessage(
    conversationId: string,
    content: string,
    businessId?: string,
    language?: 'en' | 'ar'
  ): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ content, businessId, language }),
      }
    );
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  /**
   * Retrieves official statutory corpus documents and indexing statistics
   */
  public static async getAiCorpusSummary(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/corpus`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch corpus summary');
    return res.json();
  }

  // ==========================================================================
  // INVOICING & CUSTOMER MANAGEMENT
  // ==========================================================================

  /**
   * Retrieves customers for active business entity
   */
  public static async getCustomers(businessId: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/customers?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch customers');
    return res.json();
  }

  /**
   * Creates a customer record for the active business
   */
  public static async createCustomer(businessId: string, payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/customers?businessId=${encodeURIComponent(businessId)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create customer');
    }
    return res.json();
  }

  /**
   * Creates a draft invoice
   */
  public static async createDraftInvoice(payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create invoice');
    }
    return res.json();
  }

  /**
   * Retrieves invoices for a business entity with optional status/search filters
   */
  public static async getInvoices(businessId: string, status?: string, search?: string): Promise<any[]> {
    await this.ensureAuthenticated();
    let url = `${API_BASE_URL}/api/v1/invoicing/invoices?businessId=${encodeURIComponent(businessId)}`;
    if (status && status !== 'All') url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  }

  /**
   * Retrieves single invoice details by ID
   */
  public static async getInvoice(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  }

  /**
   * Updates a draft invoice
   */
  public static async updateDraftInvoice(id: string, payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update invoice');
    }
    return res.json();
  }

  /**
   * Issues an invoice, locking it permanently and allocating sequential number
   */
  public static async issueInvoice(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(id)}/issue`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to issue invoice');
    }
    return res.json();
  }

  /**
   * Records a payment against an issued invoice
   */
  public static async recordInvoicePayment(id: string, amount: number): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(id)}/pay`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record payment');
    }
    return res.json();
  }

  /**
   * Creates a credit note linked to an invoice
   */
  public static async createCreditNote(invoiceId: string, payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(invoiceId)}/credit-note`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create credit note');
    }
    return res.json();
  }

  /**
   * Retrieves generated PDF HTML and SHA-256 integrity checksum for an invoice
   */
  public static async getInvoicePdfHtml(id: string): Promise<{ html: string; checksum: string }> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/invoicing/invoices/${encodeURIComponent(id)}/pdf`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve invoice PDF');
    return res.json();
  }

  // ==========================================================================
  // EXPENSES & BOOKKEEPING (PHASE 6.5)
  // ==========================================================================

  /**
   * Uploads receipt and triggers server-side OCR extraction
   */
  public static async scanExpenseReceipt(
    businessId: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    fileName?: string
  ): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/scan`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ businessId, imageBase64, mimeType, fileName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Receipt scan failed');
    }
    return res.json();
  }

  /**
   * Creates a manual expense record
   */
  public static async createManualExpense(payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create manual expense');
    }
    return res.json();
  }

  /**
   * Retrieves standard UAE expense categories
   */
  public static async getExpenseCategories(): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/categories`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch expense categories');
    return res.json();
  }

  /**
   * Retrieves expense summary metrics and category distributions
   */
  public static async getExpenseSummaries(businessId: string, year: number = 2026): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/expenses/summary?businessId=${encodeURIComponent(businessId)}&year=${year}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    if (!res.ok) throw new Error('Failed to fetch expense summaries');
    return res.json();
  }

  /**
   * Retrieves expenses for active business with optional filters
   */
  public static async getExpenses(
    businessId: string,
    status?: string,
    category?: string,
    search?: string
  ): Promise<any[]> {
    await this.ensureAuthenticated();
    let url = `${API_BASE_URL}/api/v1/expenses?businessId=${encodeURIComponent(businessId)}`;
    if (status && status !== 'ALL') url += `&status=${encodeURIComponent(status)}`;
    if (category && category !== 'ALL') url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  }

  /**
   * Retrieves single expense record by ID
   */
  public static async getExpense(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch expense details');
    return res.json();
  }

  /**
   * Updates an expense record
   */
  public static async updateExpense(id: string, payload: any): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update expense');
    }
    return res.json();
  }

  /**
   * Approves an expense record and posts to business ledger
   */
  public static async approveExpense(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to approve expense');
    }
    return res.json();
  }

  /**
   * Rejects an expense record
   */
  public static async rejectExpense(id: string, reason: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to reject expense');
    }
    return res.json();
  }

  /**
   * Archives an expense record
   */
  public static async archiveExpense(id: string, reason?: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to archive expense');
    }
    return res.json();
  }

  /**
   * Batch approve, reject, archive, or categorize
   */
  public static async batchExpenseAction(payload: {
    expenseIds: string[];
    action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'CATEGORIZE';
    category?: string;
    reason?: string;
  }): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/expenses/batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Batch action failed');
    }
    return res.json();
  }

  // ============================================================================
  // TAX ASSESSMENTS (PHASE 6.6)
  // ============================================================================

  /**
   * Generates or retrieves a deterministic VAT 201 Return assessment from real business records
   */
  public static async assessBusinessVat(payload: {
    businessId: string;
    periodKey: string;
    startDate: string;
    endDate: string;
    includeDraftExpenses?: boolean;
  }): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/vat/assess-business`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'VAT assessment failed');
    }
    return res.json();
  }

  /**
   * Generates or retrieves a deterministic Corporate Tax assessment from real business records
   */
  public static async assessBusinessCorporateTax(payload: {
    businessId: string;
    financialYear: number;
    startDate?: string;
    endDate?: string;
    electSmallBusinessRelief?: boolean;
    priorPeriodRevenues?: number[];
    unutilizedPriorTaxLosses?: number;
    isQfzpClaimed?: boolean;
  }): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/corporate/assess-business`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Corporate Tax assessment failed');
    }
    return res.json();
  }

  /**
   * Retrieves historical tax assessments for the active business
   */
  public static async getTaxAssessments(businessId: string, taxType?: 'VAT' | 'CORPORATE_TAX'): Promise<any[]> {
    await this.ensureAuthenticated();
    let url = `${API_BASE_URL}/api/v1/tax/assessments?businessId=${encodeURIComponent(businessId)}`;
    if (taxType) url += `&taxType=${encodeURIComponent(taxType)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tax assessments');
    return res.json();
  }

  /**
   * Retrieves full details, calculation breakdown, and compliance findings for an assessment
   */
  public static async getTaxAssessment(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/assessments/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tax assessment details');
    return res.json();
  }

  /**
   * Updates an assessment's user review status (e.g. REVIEWED, DRAFT)
   */
  public static async updateAssessmentStatus(id: string, status: string, notes?: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/assessments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update assessment status');
    }
    return res.json();
  }

  /**
   * Reassesses an existing tax period, creating a fresh version and marking the old as SUPERSEDED
   */
  public static async reassessTaxAssessment(id: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/assessments/${encodeURIComponent(id)}/reassess`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Reassessment failed');
    }
    return res.json();
  }

  /**
   * Fetches official legal citations for an assessment
   */
  public static async getAssessmentLegalReferences(id: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/assessments/${encodeURIComponent(id)}/legal-references`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch legal references');
    return res.json();
  }

  /**
   * Asks grounded AI questions about a specific assessment
   */
  public static async explainAssessmentWithAi(
    id: string,
    question: string,
    language: 'en' | 'ar' = 'en'
  ): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/assessments/${encodeURIComponent(id)}/explain`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ question, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'AI explanation failed');
    }
    return res.json();
  }

  // ============================================================================
  // PHASE 6.7: DASHBOARD, READINESS, COMPLIANCE & REPORTS
  // ============================================================================

  /**
   * Retrieves unified business intelligence dashboard metrics
   */
  public static async getDashboardOverview(businessId: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/overview?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  }

  /**
   * Retrieves UAE tax calendar statutory deadlines
   */
  public static async getCalendarDeadlines(businessId: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/calendar?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch tax calendar deadlines');
    return res.json();
  }

  /**
   * Evaluates comprehensive multi-category UAE Tax Readiness assessment
   */
  public static async getDetailedTaxReadiness(businessId: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/readiness?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to evaluate tax readiness');
    return res.json();
  }

  /**
   * Retrieves deduplicated active compliance findings
   */
  public static async getComplianceActions(businessId: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/compliance-actions?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch compliance actions');
    return res.json();
  }

  /**
   * Resolves a compliance action finding or obligation
   */
  public static async resolveComplianceAction(
    findingId: string,
    businessId: string,
    resolutionNotes?: string
  ): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/dashboard/compliance-actions/${encodeURIComponent(findingId)}/resolve?businessId=${encodeURIComponent(businessId)}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ resolutionNotes }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to resolve compliance action');
    }
    return res.json();
  }

  /**
   * Generates a persistent tax or financial report (P&L, VAT 201, CT Schedule, Audit)
   */
  public static async generateReport(payload: {
    businessId: string;
    reportType: string;
    format?: string;
    periodStart?: string;
    periodEnd?: string;
    title?: string;
  }): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate report');
    }
    return res.json();
  }

  /**
   * Lists generated reports for the active business
   */
  public static async listReports(businessId: string): Promise<any[]> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/reports?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to list generated reports');
    return res.json();
  }

  /**
   * Fetches report details by ID
   */
  public static async getReportById(reportId: string): Promise<any> {
    await this.ensureAuthenticated();
    const res = await fetch(`${API_BASE_URL}/api/v1/reports/${encodeURIComponent(reportId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  }
}
