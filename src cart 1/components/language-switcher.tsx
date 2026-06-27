'use client';

import { useStore } from '@/lib/store';
import { useLocale } from '@/hooks/useLocale';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { Languages } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useStore();
  const { loadMessages } = useLocale();
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
  
  const handleSelect = async (code: string) => {
    setLanguage(code);
    await loadMessages(code);
    setIsOpen(false);
    
    // Update document direction for RTL
    const htmlEl = document.querySelector('html');
    if (htmlEl) {
      htmlEl.setAttribute('dir', code === 'ar' ? 'rtl' : 'ltr');
      htmlEl.setAttribute('lang', code);
    }
    
    // Save to localStorage
    try {
      const saved = localStorage.getItem('3boxes_locale');
      const prefs = saved ? JSON.parse(saved) : {};
      prefs.language = code;
      localStorage.setItem('3boxes_locale', JSON.stringify(prefs));
    } catch {}
  };
  
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-200/70 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
        title="Change language"
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{currentLang.nativeName}</span>
        <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute end-0 top-full z-50 mt-1 w-52 rounded-lg border border-amber-900/30 bg-stone-900 py-1 shadow-xl">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">
            Language
          </div>
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                language === l.code
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-200'
              }`}
            >
              <span className="font-medium">{l.nativeName}</span>
              <span className="ms-auto text-xs opacity-50">{l.name}</span>
              {l.direction === 'rtl' && (
                <span className="rounded bg-amber-900/30 px-1 text-[9px] text-amber-400">RTL</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
