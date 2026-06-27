// Maps ISO 3166-1 alpha-2 country codes to default currency and language
export interface CountryInfo {
  currency: string;
  language: string;
  languages: string[]; // all official/common languages
  name: string;
}

export const COUNTRY_MAP: Record<string, CountryInfo> = {
  US: { currency: 'USD', language: 'en', languages: ['en'], name: 'United States' },
  GB: { currency: 'GBP', language: 'en', languages: ['en'], name: 'United Kingdom' },
  IN: { currency: 'INR', language: 'hi', languages: ['hi', 'en'], name: 'India' },
  AE: { currency: 'AED', language: 'ar', languages: ['ar', 'en'], name: 'United Arab Emirates' },
  SA: { currency: 'SAR', language: 'ar', languages: ['ar'], name: 'Saudi Arabia' },
  SG: { currency: 'SGD', language: 'en', languages: ['en', 'zh', 'ms', 'ta'], name: 'Singapore' },
  AU: { currency: 'AUD', language: 'en', languages: ['en'], name: 'Australia' },
  CA: { currency: 'CAD', language: 'en', languages: ['en', 'fr'], name: 'Canada' },
  JP: { currency: 'JPY', language: 'ja', languages: ['ja'], name: 'Japan' },
  DE: { currency: 'EUR', language: 'de', languages: ['de'], name: 'Germany' },
  FR: { currency: 'EUR', language: 'fr', languages: ['fr'], name: 'France' },
  ES: { currency: 'EUR', language: 'es', languages: ['es'], name: 'Spain' },
  IT: { currency: 'EUR', language: 'en', languages: ['it', 'en'], name: 'Italy' },
  NL: { currency: 'EUR', language: 'en', languages: ['nl', 'en'], name: 'Netherlands' },
  BE: { currency: 'EUR', language: 'en', languages: ['nl', 'fr', 'de'], name: 'Belgium' },
  AT: { currency: 'EUR', language: 'de', languages: ['de'], name: 'Austria' },
  CH: { currency: 'EUR', language: 'de', languages: ['de', 'fr', 'it'], name: 'Switzerland' },
  PT: { currency: 'EUR', language: 'en', languages: ['pt'], name: 'Portugal' },
  IE: { currency: 'EUR', language: 'en', languages: ['en', 'ga'], name: 'Ireland' },
  BR: { currency: 'USD', language: 'en', languages: ['pt'], name: 'Brazil' },
  MX: { currency: 'USD', language: 'es', languages: ['es'], name: 'Mexico' },
  KR: { currency: 'USD', language: 'en', languages: ['ko'], name: 'South Korea' },
  CN: { currency: 'USD', language: 'zh', languages: ['zh'], name: 'China' },
  HK: { currency: 'USD', language: 'zh', languages: ['zh', 'en'], name: 'Hong Kong' },
  TW: { currency: 'USD', language: 'zh', languages: ['zh'], name: 'Taiwan' },
  MY: { currency: 'USD', language: 'en', languages: ['ms', 'en'], name: 'Malaysia' },
  TH: { currency: 'USD', language: 'en', languages: ['th'], name: 'Thailand' },
  ZA: { currency: 'USD', language: 'en', languages: ['en', 'af', 'zu'], name: 'South Africa' },
  NZ: { currency: 'AUD', language: 'en', languages: ['en'], name: 'New Zealand' },
  KW: { currency: 'USD', language: 'ar', languages: ['ar'], name: 'Kuwait' },
  QA: { currency: 'USD', language: 'ar', languages: ['ar'], name: 'Qatar' },
  BH: { currency: 'USD', language: 'ar', languages: ['ar'], name: 'Bahrain' },
  OM: { currency: 'USD', language: 'ar', languages: ['ar'], name: 'Oman' },
  PK: { currency: 'USD', language: 'en', languages: ['ur', 'en'], name: 'Pakistan' },
  BD: { currency: 'USD', language: 'en', languages: ['bn', 'en'], name: 'Bangladesh' },
  LK: { currency: 'USD', language: 'en', languages: ['si', 'ta', 'en'], name: 'Sri Lanka' },
  NP: { currency: 'INR', language: 'en', languages: ['ne', 'en'], name: 'Nepal' },
  RU: { currency: 'USD', language: 'en', languages: ['ru'], name: 'Russia' },
  TR: { currency: 'USD', language: 'en', languages: ['tr'], name: 'Turkey' },
  IL: { currency: 'USD', language: 'en', languages: ['he', 'ar'], name: 'Israel' },
  EG: { currency: 'USD', language: 'ar', languages: ['ar'], name: 'Egypt' },
  NG: { currency: 'USD', language: 'en', languages: ['en'], name: 'Nigeria' },
  KE: { currency: 'USD', language: 'en', languages: ['en', 'sw'], name: 'Kenya' },
  SE: { currency: 'EUR', language: 'en', languages: ['sv', 'en'], name: 'Sweden' },
  NO: { currency: 'EUR', language: 'en', languages: ['no', 'en'], name: 'Norway' },
  DK: { currency: 'EUR', language: 'en', languages: ['da', 'en'], name: 'Denmark' },
  FI: { currency: 'EUR', language: 'en', languages: ['fi', 'sv', 'en'], name: 'Finland' },
  PL: { currency: 'EUR', language: 'en', languages: ['pl'], name: 'Poland' },
  CZ: { currency: 'EUR', language: 'en', languages: ['cs'], name: 'Czech Republic' },
  PH: { currency: 'USD', language: 'en', languages: ['en', 'fil'], name: 'Philippines' },
  ID: { currency: 'USD', language: 'en', languages: ['id', 'en'], name: 'Indonesia' },
  VN: { currency: 'USD', language: 'en', languages: ['vi'], name: 'Vietnam' },
};

export function getCountryInfo(countryCode: string): CountryInfo | null {
  return COUNTRY_MAP[countryCode.toUpperCase()] || null;
}

export function getDefaultCountryInfo(): CountryInfo {
  return { currency: 'USD', language: 'en', languages: ['en'], name: 'United States' };
}
