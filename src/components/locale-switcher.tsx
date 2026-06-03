'use client';

import { useStore, type CurrencyInfo } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { getLocaleDisplayName } from '@/lib/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, ChevronDown, Check, MapPin, Languages, Banknote } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

// Popular currencies ordered by relevance for luxury gifting
const CURRENCY_ORDER = [
  'INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD',
  'JPY', 'CNY', 'KRW', 'SAR', 'BRL', 'MXN', 'ZAR', 'MYR', 'THB',
];

// Supported locales with native names and flags
const LOCALE_INFO: Record<string, { nativeName: string; flag: string; englishName: string }> = {
  en: { nativeName: 'English', flag: '🇬🇧', englishName: 'English' },
  hi: { nativeName: 'हिन्दी', flag: '🇮🇳', englishName: 'Hindi' },
  ar: { nativeName: 'العربية', flag: '🇸🇦', englishName: 'Arabic' },
  fr: { nativeName: 'Français', flag: '🇫🇷', englishName: 'French' },
  de: { nativeName: 'Deutsch', flag: '🇩🇪', englishName: 'German' },
  es: { nativeName: 'Español', flag: '🇪🇸', englishName: 'Spanish' },
  zh: { nativeName: '简体中文', flag: '🇨🇳', englishName: 'Chinese' },
  ja: { nativeName: '日本語', flag: '🇯🇵', englishName: 'Japanese' },
  ko: { nativeName: '한국어', flag: '🇰🇷', englishName: 'Korean' },
  pt: { nativeName: 'Português', flag: '🇧🇷', englishName: 'Portuguese' },
};

export function LocaleSwitcher() {
  const { locale, setLocale, currency, setCurrency, currencyRates, geoInfo, setGeoInfo, setCurrencyRates, geoDetected } = useStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'currency' | 'language'>('currency');

  // Detect geo location on mount
  useEffect(() => {
    if (geoDetected) return;
    
    const detectGeo = async () => {
      try {
        const res = await fetch('/api/geo');
        if (res.ok) {
          const data = await res.json();
          setGeoInfo(data);
        }
      } catch (err) {
        console.warn('Geo detection failed:', err);
      }
    };
    detectGeo();
  }, [geoDetected, setGeoInfo]);

  // Load exchange rates
  useEffect(() => {
    if (Object.keys(currencyRates).length > 0) return;

    const loadRates = async () => {
      try {
        const res = await fetch('/api/currency/rates');
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            setCurrencyRates(data.rates);
          }
        }
      } catch (err) {
        console.warn('Failed to load exchange rates:', err);
      }
    };
    loadRates();
  }, [currencyRates, setCurrencyRates]);

  const currentCurrencyInfo = currencyRates[currency];
  const currencyDisplay = currentCurrencyInfo
    ? `${currentCurrencyInfo.symbol} ${currency}`
    : `₹ INR`;

  const currentLocaleInfo = LOCALE_INFO[locale];
  const languageDisplay = currentLocaleInfo
    ? `${currentLocaleInfo.flag} ${currentLocaleInfo.nativeName}`
    : '🇬🇧 English';

  const sortedCurrencies = CURRENCY_ORDER
    .filter((code) => currencyRates[code])
    .map((code) => currencyRates[code]);

  const locales = Object.entries(LOCALE_INFO).map(([code, info]) => ({
    code,
    ...info,
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-1.5 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 border border-amber-900/30 hover:border-amber-600/40 px-2.5 h-8 text-xs font-medium"
          aria-label="Change currency and language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="max-w-[80px] truncate">{currencyDisplay}</span>
          <span className="text-amber-200/30">|</span>
          <span className="max-w-[60px] truncate">{currentLocaleInfo?.nativeName || 'English'}</span>
          <ChevronDown className="h-3 w-3 text-amber-200/40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 border-amber-900/30 bg-stone-950 p-0 shadow-xl shadow-amber-900/20"
        align="end"
        sideOffset={8}
      >
        {/* Tabs */}
        <div className="flex border-b border-amber-900/30">
          <button
            onClick={() => setActiveTab('currency')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'currency'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/10'
                : 'text-amber-200/50 hover:text-amber-200/70 hover:bg-amber-900/5'
            }`}
          >
            <Banknote className="h-4 w-4" />
            {t('currencySwitcher.title')}
          </button>
          <button
            onClick={() => setActiveTab('language')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'language'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-900/10'
                : 'text-amber-200/50 hover:text-amber-200/70 hover:bg-amber-900/5'
            }`}
          >
            <Languages className="h-4 w-4" />
            {t('languageSwitcher.title')}
          </button>
        </div>

        {/* Geo detection notice */}
        {geoInfo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/10 border-b border-amber-900/20">
            <MapPin className="h-3.5 w-3.5 text-amber-400/60 flex-shrink-0" />
            <span className="text-[11px] text-amber-200/50 truncate">
              {geoInfo.flagEmoji} Detected: {geoInfo.countryName} — {geoInfo.currency} / {getLocaleDisplayName(geoInfo.language)}
            </span>
          </div>
        )}

        {/* Currency List */}
        {activeTab === 'currency' && (
          <ScrollArea className="max-h-72">
            <div className="py-1">
              {sortedCurrencies.map((info) => (
                <button
                  key={info.code}
                  onClick={() => {
                    setCurrency(info.code);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    currency === info.code
                      ? 'bg-amber-900/20 text-amber-300'
                      : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium w-6 text-center">{info.symbol}</span>
                    <div className="text-left">
                      <span className="font-medium">{info.code}</span>
                      <span className="ml-2 text-amber-200/40 text-xs">{info.name}</span>
                    </div>
                  </div>
                  {currency === info.code && (
                    <Check className="h-4 w-4 text-amber-400" />
                  )}
                </button>
              ))}
              {sortedCurrencies.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-amber-200/40">
                  Loading currencies...
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Language List */}
        {activeTab === 'language' && (
          <ScrollArea className="max-h-72">
            <div className="py-1">
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => {
                    setLocale(loc.code);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    locale === loc.code
                      ? 'bg-amber-900/20 text-amber-300'
                      : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{loc.flag}</span>
                    <div className="text-left">
                      <span className="font-medium">{loc.nativeName}</span>
                      <span className="ml-2 text-amber-200/40 text-xs">{loc.englishName}</span>
                    </div>
                  </div>
                  {locale === loc.code && (
                    <Check className="h-4 w-4 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer hint */}
        <div className="border-t border-amber-900/20 px-4 py-2">
          <p className="text-[10px] text-amber-200/30 text-center">
            Prices are converted from ₹ INR at current exchange rates
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Mobile version of the locale switcher for the hamburger menu
 */
export function LocaleSwitcherMobile() {
  const { locale, setLocale, currency, setCurrency, currencyRates } = useStore();
  const { t } = useTranslation();

  const sortedCurrencies = CURRENCY_ORDER
    .filter((code) => currencyRates[code])
    .map((code) => currencyRates[code]);

  const locales = Object.entries(LOCALE_INFO).map(([code, info]) => ({
    code,
    ...info,
  }));

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-amber-900/20">
      {/* Language */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-2 flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5" />
          {t('languageSwitcher.title')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => setLocale(loc.code)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                locale === loc.code
                  ? 'bg-amber-900/20 text-amber-300 border border-amber-600/30'
                  : 'text-amber-200/60 hover:bg-amber-900/10 hover:text-amber-200 border border-transparent'
              }`}
            >
              <span>{loc.flag}</span>
              <span className="truncate">{loc.nativeName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-2 flex items-center gap-1.5">
          <Banknote className="h-3.5 w-3.5" />
          {t('currencySwitcher.title')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {sortedCurrencies.slice(0, 10).map((info) => (
            <button
              key={info.code}
              onClick={() => setCurrency(info.code)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                currency === info.code
                  ? 'bg-amber-900/20 text-amber-300 border border-amber-600/30'
                  : 'text-amber-200/60 hover:bg-amber-900/10 hover:text-amber-200 border border-transparent'
              }`}
            >
              <span className="text-base">{info.symbol}</span>
              <span>{info.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
