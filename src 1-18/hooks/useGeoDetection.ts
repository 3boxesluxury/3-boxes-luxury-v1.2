'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useLocale } from './useLocale';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '@/i18n/config';

export function useGeoDetection() {
  const { setCurrency, setLanguage, setCountry, setExchangeRates, currency, language } = useStore();
  const { loadMessages } = useLocale();
  const hasDetected = useRef(false);
  
  useEffect(() => {
    if (hasDetected.current) return;
    hasDetected.current = true;
    
    const detectAndSet = async () => {
      // Check localStorage first
      const saved = localStorage.getItem('3boxes_locale');
      if (saved) {
        try {
          const prefs = JSON.parse(saved);
          if (prefs.currency) setCurrency(prefs.currency);
          if (prefs.language) {
            setLanguage(prefs.language);
            await loadMessages(prefs.language);
          }
          if (prefs.country) setCountry(prefs.country);
          return;
        } catch {
          // Invalid saved data, continue with detection
        }
      }
      
      // Detect from browser language
      const browserLang = navigator.language.split('-')[0];
      const supportedLangCodes = SUPPORTED_LANGUAGES.map(l => l.code);
      const detectedLang = supportedLangCodes.includes(browserLang) ? browserLang : 'en';
      
      // Try geolocation API
      try {
        const geoRes = await fetch('/api/geo');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          
          // Set currency from geo
          const supportedCurrencies = SUPPORTED_CURRENCIES.map(c => c.code);
          if (supportedCurrencies.includes(geoData.currency)) {
            setCurrency(geoData.currency);
          }
          
          // Set language: prefer browser language if supported, otherwise use geo suggestion
          if (supportedLangCodes.includes(browserLang)) {
            setLanguage(browserLang);
            await loadMessages(browserLang);
          } else if (supportedLangCodes.includes(geoData.language)) {
            setLanguage(geoData.language);
            await loadMessages(geoData.language);
          }
          
          setCountry(geoData.country);
          
          // Save to localStorage
          localStorage.setItem('3boxes_locale', JSON.stringify({
            currency: geoData.currency,
            language: supportedLangCodes.includes(browserLang) ? browserLang : geoData.language,
            country: geoData.country,
          }));
          
          return;
        }
      } catch {
        // Geo API failed, use browser defaults
      }
      
      // Fallback: use browser language detection
      setLanguage(detectedLang);
      await loadMessages(detectedLang);
      
      localStorage.setItem('3boxes_locale', JSON.stringify({
        currency: 'USD',
        language: detectedLang,
        country: null,
      }));
    };
    
    detectAndSet();
  }, []);
  
  // Fetch exchange rates on mount (separate from geo detection)
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/exchange-rates');
        if (res.ok) {
          const data = await res.json();
          setExchangeRates(data.rates);
        }
      } catch {
        // Rates fetch failed, USD will be used
      }
    };
    
    fetchRates();
  }, []);
}
