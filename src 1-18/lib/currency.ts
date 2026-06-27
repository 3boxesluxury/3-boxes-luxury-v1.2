'use client';

import { useStore, type CurrencyInfo } from '@/lib/store';

/**
 * Format a price from INR (base) to the user's selected currency
 * @param priceInINR - Price in Indian Rupees (base currency)
 * @param currency - Currency code (e.g., "USD", "EUR")
 * @param rates - Exchange rates record
 * @param symbol - Currency symbol
 */
export function formatPrice(
  priceInINR: number,
  currency: string,
  rates: Record<string, CurrencyInfo>,
  symbol: string
): string {
  if (currency === 'INR') {
    return `₹${priceInINR.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const rate = rates[currency]?.rate;
  if (!rate || rate === 0) {
    return `₹${priceInINR.toLocaleString('en-IN')}`;
  }

  const converted = priceInINR * rate;

  // Use locale-specific formatting
  const localeMap: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    KRW: 'ko-KR',
    BRL: 'pt-BR',
    AED: 'ar-AE',
    SAR: 'ar-SA',
    SGD: 'en-SG',
    AUD: 'en-AU',
    CAD: 'en-CA',
    MXN: 'es-MX',
    ZAR: 'en-ZA',
    MYR: 'ms-MY',
    THB: 'th-TH',
  };

  try {
    const locale = localeMap[currency] || 'en-US';
    // JPY and KRW don't use decimals
    const noDecimal = ['JPY', 'KRW'];
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: noDecimal.includes(currency) ? 0 : 2,
      maximumFractionDigits: noDecimal.includes(currency) ? 0 : 2,
    }).format(converted);
  } catch {
    // Fallback
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Convert a price from INR to the selected currency (just the number)
 */
export function convertPrice(
  priceInINR: number,
  currency: string,
  rates: Record<string, CurrencyInfo>
): number {
  if (currency === 'INR') return priceInINR;
  const rate = rates[currency]?.rate;
  if (!rate || rate === 0) return priceInINR;
  return priceInINR * rate;
}

/**
 * React hook to get currency formatting functions based on the current store state
 */
export function useCurrency() {
  const currency = useStore((s) => s.currency);
  const currencySymbol = useStore((s) => s.currencySymbol);
  const currencyRates = useStore((s) => s.currencyRates);

  const format = (priceInINR: number): string => {
    return formatPrice(priceInINR, currency, currencyRates, currencySymbol);
  };

  const convert = (priceInINR: number): number => {
    return convertPrice(priceInINR, currency, currencyRates);
  };

  return {
    currency,
    currencySymbol,
    currencyRates,
    format,
    convert,
    formatPrice: format,
    convertPrice: convert,
  };
}
