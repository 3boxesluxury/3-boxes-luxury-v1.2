export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  locale: string; // BCP 47 locale for Intl.NumberFormat
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, locale: 'en-GB' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, locale: 'en-IN' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2, locale: 'ar-AE' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimalPlaces: 2, locale: 'ar-SA' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, locale: 'en-SG' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, locale: 'en-AU' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, locale: 'en-CA' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, locale: 'ja-JP' },
};

// Default hardcoded rates (fallback when API is unavailable)
export const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.50,
  AED: 3.67,
  SAR: 3.75,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
  JPY: 149.50,
};
