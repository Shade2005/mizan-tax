// ============================================================================
// Mizan (ميزان) - Mobile API Client
// Connects Expo client to the NestJS Tax Intelligence backend on port 4000
// ============================================================================

import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android Emulator uses 10.0.2.2 to access host localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
};

export const API_BASE_URL = getBaseUrl();

export interface SaveTradeLicensePayload {
  organisationId: string;
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
  businessActivities?: string[];
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

export class MizanApi {
  /**
   * Persists scanned and verified Trade License to backend PostgreSQL
   */
  public static async saveTradeLicense(
    payload: SaveTradeLicensePayload
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses/trade-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to save trade license: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Lists all registered business entities for multi-business switching
   */
  public static async getBusinesses(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/businesses`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch businesses');
    return res.json();
  }

  /**
   * Evaluates real-time EmaraTax Readiness Assessment from the backend
   */
  public static async getTaxReadiness(
    licenseNumber: string,
    revenue: number = 1200000
  ): Promise<EmaraTaxReadinessResponse> {
    const url = `${API_BASE_URL}/api/v1/businesses/${encodeURIComponent(
      licenseNumber
    )}/readiness?revenue=${revenue}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE_URL}/api/v1/tax/corporate/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    context?: any
  ): Promise<{
    answer: string;
    citations: Array<{
      id: string;
      authority: string;
      officialNumber: string;
      article: string;
      title: string;
      summary: string;
    }>;
    statutoryRationale: string;
    actionRequired: string;
    emaraTaxImpact?: string;
    suggestedFollowUps: string[];
    isGrounded: boolean;
    topicId?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language: lang, context }),
    });
    if (!res.ok) throw new Error('Failed to obtain AI answer');
    return res.json();
  }
}
