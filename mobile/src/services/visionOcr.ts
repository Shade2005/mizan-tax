// ============================================================================
// Mizan (ميزان) - AI Vision OCR Client Service
// Securely routes document extraction through authenticated backend proxy
// Zero client-side API keys or secrets
// Zero fabricated financial data on failure
// ============================================================================

import { API_BASE_URL, MizanApi, STORAGE_KEY_AUTH_TOKEN } from './api';
import { auth } from './firebase';
import { AppStorage } from '../utils/storage';

export interface ExtractedTradeLicense {
  licenseNumber: string;
  businessName: string;
  businessNameAr?: string;
  legalForm: string;
  jurisdiction: string;
  issueDate: string;
  expiryDate?: string;
}

export interface ExtractedReceipt {
  merchantName: string;
  trn: string;
  invoiceDate: string;
  amountAED: string;
  vatAED: string;
  category: 'DUTY_TRAVEL' | 'CLIENT_ENTERTAINMENT' | 'REVERSE_CHARGE_SAAS' | 'GENERAL';
}

export class VisionOcr {
  /**
   * Resolves the freshest available auth token for secure API requests
   */
  private static async resolveAuthToken(): Promise<string | null> {
    let token = MizanApi.getAuthToken();
    if (!token && auth?.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
        if (token) {
          MizanApi.setAuthToken(token);
        }
      } catch (err) {
        console.warn('Could not retrieve Firebase token for OCR:', err);
      }
    }
    if (!token) {
      try {
        token = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (token) {
          MizanApi.setAuthToken(token);
        }
      } catch {}
    }
    return token;
  }

  /**
   * Securely delegates Trade License extraction to the authenticated Mizan backend
   */
  public static async extractTradeLicense(
    base64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<ExtractedTradeLicense> {
    const token = await this.resolveAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/ocr/trade-license`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.message || `Trade license recognition failed with HTTP ${res.status}`
      );
    }

    const data = await res.json();
    return {
      licenseNumber: data.licenseNumber || '',
      businessName: data.businessName || '',
      businessNameAr: data.businessNameAr || '',
      legalForm: data.legalForm || 'Limited Liability Company (LLC)',
      jurisdiction: data.jurisdiction || 'Mainland (Dubai)',
      issueDate: data.issueDate || '',
      expiryDate: data.expiryDate || '',
    };
  }

  /**
   * Securely delegates Receipt extraction to the authenticated Mizan backend
   */
  public static async extractReceipt(
    base64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<ExtractedReceipt> {
    const token = await this.resolveAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/ocr/receipt`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.message || `Tax receipt recognition failed with HTTP ${res.status}`
      );
    }

    const data = await res.json();
    return {
      merchantName: data.merchantName || '',
      trn: data.trn || '',
      invoiceDate: data.invoiceDate || '',
      amountAED: data.totalAmountAED != null ? String(data.totalAmountAED) : '',
      vatAED: data.vatAED != null ? String(data.vatAED) : '',
      category: data.category === 'CLIENT_ENTERTAINMENT' ? 'CLIENT_ENTERTAINMENT' : 'GENERAL',
    };
  }
}
