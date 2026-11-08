// ============================================================================
// Mizan (ميزان) - AI Vision OCR Client Service
// Securely routes document extraction through authenticated backend proxy
// Zero client-side API keys or secrets
// Zero fabricated financial data on failure
// ============================================================================

import { API_BASE_URL, MizanApi } from './api';

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
   * Securely delegates Trade License extraction to the authenticated Mizan backend
   */
  public static async extractTradeLicense(
    base64Data: string,
    mimeType: string = 'image/jpeg'
  ): Promise<ExtractedTradeLicense> {
    const token = MizanApi.getAuthToken();
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
    const token = MizanApi.getAuthToken();
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
