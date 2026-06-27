'use client';

import { useStore } from '@/lib/store';
import en from '@/i18n/messages/en.json';

// Message type - use a generic type since different locales may have slightly different shapes
type Messages = Record<string, any>;

// Lazy-load message modules
const messageModules: Record<string, () => Promise<Messages>> = {
  en: () => import('@/i18n/messages/en.json').then(m => m.default),
  hi: () => import('@/i18n/messages/hi.json').then(m => m.default),
  ar: () => import('@/i18n/messages/ar.json').then(m => m.default),
  fr: () => import('@/i18n/messages/fr.json').then(m => m.default),
  es: () => import('@/i18n/messages/es.json').then(m => m.default),
  de: () => import('@/i18n/messages/de.json').then(m => m.default),
  ja: () => import('@/i18n/messages/ja.json').then(m => m.default),
  zh: () => import('@/i18n/messages/zh.json').then(m => m.default),
};

// Simple nested key resolver: "common.addToCart" -> messages.common.addToCart
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // fallback to key if not found
    }
  }
  return typeof current === 'string' ? current : path;
}

// Replace {param} placeholders in translation strings
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function useLocale() {
  const { language, messages, setMessages } = useStore();
  
  const t = (key: string, params?: Record<string, string | number>): string => {
    const msgs = messages || en;
    const value = getNestedValue(msgs, key);
    return interpolate(value, params);
  };
  
  const loadMessages = async (lang: string) => {
    const loader = messageModules[lang];
    if (loader) {
      try {
        const msgs = await loader();
        setMessages(msgs);
      } catch {
        setMessages(en);
      }
    } else {
      setMessages(en);
    }
  };
  
  const isRTL = language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  return {
    language,
    messages: messages || en,
    t,
    loadMessages,
    isRTL,
    direction,
  };
}
