'use client';

import { useCurrency } from '@/hooks/useCurrency';

interface FormattedPriceProps {
  price: number; // Always in USD
  compareAtPrice?: number; // Optional, also USD
  currency?: string; // Override currency
  className?: string;
  showSavings?: boolean;
}

export function FormattedPrice({ 
  price, 
  compareAtPrice, 
  currency, 
  className = '',
  showSavings = false,
}: FormattedPriceProps) {
  const { format, convert } = useCurrency();
  
  if (showSavings && compareAtPrice && compareAtPrice > price) {
    const savings = compareAtPrice - price;
    const percent = Math.round((savings / compareAtPrice) * 100);
    return (
      <span className={className}>
        <span className="font-bold">{format(price, currency)}</span>
        <span className="ml-2 text-xs line-through opacity-40">{format(compareAtPrice, currency)}</span>
        <span className="ml-2 text-xs text-emerald-400">-{percent}%</span>
      </span>
    );
  }
  
  return (
    <span className={className}>
      {format(price, currency)}
    </span>
  );
}

// Lightweight version for inline use (no compare/savings)
export function Price({ price, currency, className }: { price: number; currency?: string; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(price, currency)}</span>;
}
