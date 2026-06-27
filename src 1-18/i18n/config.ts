export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' as const },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' as const },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' as const },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' as const },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' as const },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' as const },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' as const },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' as const },
];

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalPlaces: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimalPlaces: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
];

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_CURRENCY = 'USD';
export const RTL_LANGUAGES = ['ar'];
