'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/hooks/useCurrency';
import { SUPPORTED_CURRENCIES } from '@/i18n/config';
import { useState, useRef, useEffect } from 'react';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (code: string) => {
    setCurrency(code);
    setIsOpen(false);
    // Save to localStorage
    try {
      const saved = localStorage.getItem('3boxes_locale');
      const prefs = saved ? JSON.parse(saved) : {};
      prefs.currency = code;
      localStorage.setItem('3boxes_locale', JSON.stringify(prefs));
    } catch {}
  };
  
  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
  
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-200/70 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
        title="Change currency"
      >
        <span className="font-semibold">{currentCurrency.symbol}</span>
        <span className="hidden sm:inline">{currentCurrency.code}</span>
        <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute end-0 top-full z-50 mt-1 w-48 rounded-lg border border-amber-900/30 bg-stone-900 py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">
            Display prices in
          </div>
          {SUPPORTED_CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                currency === c.code
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-200'
              }`}
            >
              <span className="w-6 text-start font-semibold">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="ms-auto text-xs opacity-50">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
