type TranslationKey = string; // dot-notation key like "common.shopNow"
type Translations = Record<string, any>;

// Cache loaded translations — empty until loadTranslation() is called
const translationCache: Record<string, Translations> = {};

// Get nested value from object using dot notation
function getNestedValue(obj: any, key: string): string | undefined {
  return key.split('.').reduce((o, k) => o?.[k], obj);
}

// Interpolate {variable} placeholders
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

// Load translation file dynamically
async function loadTranslation(locale: string): Promise<Translations> {
  if (translationCache[locale]) return translationCache[locale];
  try {
    const mod = await import(`./translations/${locale}.json`);
    translationCache[locale] = mod.default || mod;
    return translationCache[locale];
  } catch {
    console.warn(`Translation file for "${locale}" not found, falling back to English`);
    // Try to load English as fallback
    if (locale !== 'en' && !translationCache['en']) {
      try {
        const fallback = await import('./translations/en.json');
        translationCache['en'] = fallback.default || fallback;
      } catch {
        console.warn('English translations also not found');
      }
    }
    return translationCache['en'] || {};
  }
}

// Translate function
export function t(locale: string, key: TranslationKey, vars?: Record<string, string | number>): string {
  const translations = translationCache[locale] || translationCache['en'] || {};
  const value = getNestedValue(translations, key);
  if (!value) {
    // Fallback to English
    const fallback = getNestedValue(translationCache['en'] || {}, key);
    if (!fallback) return key;
    return vars ? interpolate(fallback, vars) : fallback;
  }
  return vars ? interpolate(value, vars) : value;
}

// Preload a translation
export async function setLocale(locale: string): Promise<void> {
  await loadTranslation(locale);
}

// Get RTL status
export function isRTL(locale: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes(locale);
}

// Get all supported locales
export function getSupportedLocales(): string[] {
  return ['en', 'hi', 'ar', 'fr', 'de', 'es', 'zh', 'ja', 'ko', 'pt'];
}

// Locale display names
export function getLocaleDisplayName(locale: string): string {
  const names: Record<string, string> = {
    en: 'English',
    hi: 'हिन्दी',
    ar: 'العربية',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    zh: '简体中文',
    ja: '日本語',
    ko: '한국어',
    pt: 'Português',
  };
  return names[locale] || locale;
}

export type { Translations, TranslationKey };