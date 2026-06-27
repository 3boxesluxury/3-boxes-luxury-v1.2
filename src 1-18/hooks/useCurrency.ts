'use client';

import { useStore } from '@/lib/store';
import { convertAndFormat, formatPrice, convertPrice } from '@/lib/currency/formatter';

export function useCurrency() {
  const { currency, exchangeRates } = useStore();
  
  const format = (amountUsd: number, overrideCurrency?: string): string => {
    const targetCurrency = overrideCurrency || currency;
    const rates = exchangeRates || { USD: 1 };
    return convertAndFormat(amountUsd, targetCurrency, rates);
  };
  
  const convert = (amountUsd: number, overrideCurrency?: string): number => {
    const targetCurrency = overrideCurrency || currency;
    const rates = exchangeRates || { USD: 1 };
    return convertPrice(amountUsd, targetCurrency, rates);
  };
  
  const formatOnly = (amount: number, overrideCurrency?: string): string => {
    return formatPrice(amount, overrideCurrency || currency);
  };
  
  return {
    currency,
    format,
    convert,
    formatOnly,
    rates: exchangeRates,
  };
}
