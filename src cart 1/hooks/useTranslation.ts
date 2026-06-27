'use client';

import { useStore } from '@/lib/store';
import { t, setLocale, isRTL, getSupportedLocales, getLocaleDisplayName } from '@/lib/i18n';
import { useEffect, useState, useCallback } from 'react';

/**
 * React hook for translations with the current locale from the store
 */
export function useTranslation() {
  const locale = useStore((s) => s.locale);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLocale(locale).then(() => setLoaded(true));
  }, [locale]);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      return t(locale, key, vars);
    },
    [locale]
  );

  return {
    t: translate,
    locale,
    isRTL: isRTL(locale),
    loaded,
    supportedLocales: getSupportedLocales(),
    getLocaleDisplayName,
  };
}
