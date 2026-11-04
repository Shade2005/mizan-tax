// ============================================================================
// Mizan (ميزان) - Central Bank of the UAE (CBUAE) Exchange Rates Engine
// Statutory Framework: Article 69 of the UAE VAT Executive Regulations
// Non-AED invoices must be converted using the official CBUAE rate for invoice date
// ============================================================================

export interface CbUaeRate {
  currencyCode: string;
  currencyNameEn: string;
  currencyNameAr: string;
  rateToAED: number;
}

export const CBUAE_OFFICIAL_RATES: Record<string, CbUaeRate> = {
  AED: {
    currencyCode: 'AED',
    currencyNameEn: 'UAE Dirham',
    currencyNameAr: 'درهم إماراتي',
    rateToAED: 1.0,
  },
  USD: {
    currencyCode: 'USD',
    currencyNameEn: 'US Dollar',
    currencyNameAr: 'دولار أمريكي',
    rateToAED: 3.6725,
  },
  EUR: {
    currencyCode: 'EUR',
    currencyNameEn: 'Euro',
    currencyNameAr: 'يورو',
    rateToAED: 3.9821,
  },
  GBP: {
    currencyCode: 'GBP',
    currencyNameEn: 'British Pound',
    currencyNameAr: 'جنيه إسترليني',
    rateToAED: 4.654,
  },
  SAR: {
    currencyCode: 'SAR',
    currencyNameEn: 'Saudi Riyal',
    currencyNameAr: 'ريال سعودي',
    rateToAED: 0.979,
  },
};

export class CbUaeRatesService {
  /**
   * Retrieves the official CBUAE exchange rate for a currency code.
   */
  public static getRate(currencyCode: string): CbUaeRate {
    const code = currencyCode.toUpperCase();
    return (
      CBUAE_OFFICIAL_RATES[code] || {
        currencyCode: code,
        currencyNameEn: code,
        currencyNameAr: code,
        rateToAED: 1.0,
      }
    );
  }

  /**
   * Converts a foreign currency amount to AED using the official CBUAE rate.
   */
  public static convertToAED(amount: number, currencyCode: string): number {
    const rate = this.getRate(currencyCode);
    return Math.round(amount * rate.rateToAED * 100) / 100;
  }
}
