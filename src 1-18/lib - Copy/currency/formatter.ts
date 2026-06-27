/**
 * Currency formatting and conversion utilities for 3 BOXES LUXURY
 * All prices are stored in USD and converted at display time
 */

// Currency display configurations
const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string; decimals: number }> = {
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', locale: 'de-DE', decimals: 2 },
  GBP: { symbol: '£', locale: 'en-GB', decimals: 2 },
  INR: { symbol: '₹', locale: 'en-IN', decimals: 0 },
  AED: { symbol: 'د.إ', locale: 'ar-AE', decimals: 2 },
  SAR: { symbol: '﷼', locale: 'ar-SA', decimals: 2 },
  JPY: { symbol: '¥', locale: 'ja-JP', decimals: 0 },
  CNY: { symbol: '¥', locale: 'zh-CN', decimals: 2 },
  CAD: { symbol: 'C$', locale: 'en-CA', decimals: 2 },
  AUD: { symbol: 'A$', locale: 'en-AU', decimals: 2 },
  CHF: { symbol: 'CHF', locale: 'de-CH', decimals: 2 },
  SGD: { symbol: 'S$', locale: 'en-SG', decimals: 2 },
};

/**
 * Convert a USD amount to the target currency
 */
export function convertPrice(
  amountUsd: number,
  targetCurrency: string,
  rates: Record<string, number>
): number {
  if (targetCurrency === 'USD') return amountUsd;
  const rate = rates[targetCurrency];
  if (!rate || rate <= 0) return amountUsd; // Fallback to USD if rate unavailable
  return amountUsd * rate;
}

/**
 * Format a number as a price string in the given currency
 * Uses Intl.NumberFormat for proper localization
 */
export function formatPrice(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    // Fallback: manual formatting
    const symbol = config.symbol;
    const formatted = amount.toFixed(config.decimals);
    return currency === 'CHF' ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
  }
}

/**
 * Convert from USD and format in one step
 * This is the primary function used throughout the app
 */
export function convertAndFormat(
  amountUsd: number,
  targetCurrency: string,
  rates: Record<string, number>
): string {
  const converted = convertPrice(amountUsd, targetCurrency, rates);
  return formatPrice(converted, targetCurrency);
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
}
