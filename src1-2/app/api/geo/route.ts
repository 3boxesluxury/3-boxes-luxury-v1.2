import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Seed data for countries
const COUNTRY_SEED_DATA = [
  { code: 'IN', name: 'India', currencyCode: 'INR', languageCode: 'hi', flagEmoji: '🇮🇳' },
  { code: 'US', name: 'United States', currencyCode: 'USD', languageCode: 'en', flagEmoji: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', languageCode: 'en', flagEmoji: '🇬🇧' },
  { code: 'EU', name: 'European Union', currencyCode: 'EUR', languageCode: 'en', flagEmoji: '🇪🇺' },
  { code: 'AE', name: 'United Arab Emirates', currencyCode: 'AED', languageCode: 'ar', flagEmoji: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currencyCode: 'SAR', languageCode: 'ar', flagEmoji: '🇸🇦' },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', languageCode: 'en', flagEmoji: '🇸🇬' },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', languageCode: 'en', flagEmoji: '🇦🇺' },
  { code: 'CA', name: 'Canada', currencyCode: 'CAD', languageCode: 'en', flagEmoji: '🇨🇦' },
  { code: 'JP', name: 'Japan', currencyCode: 'JPY', languageCode: 'ja', flagEmoji: '🇯🇵' },
  { code: 'DE', name: 'Germany', currencyCode: 'EUR', languageCode: 'de', flagEmoji: '🇩🇪' },
  { code: 'FR', name: 'France', currencyCode: 'EUR', languageCode: 'fr', flagEmoji: '🇫🇷' },
  { code: 'ES', name: 'Spain', currencyCode: 'EUR', languageCode: 'es', flagEmoji: '🇪🇸' },
  { code: 'CN', name: 'China', currencyCode: 'CNY', languageCode: 'zh', flagEmoji: '🇨🇳' },
  { code: 'KR', name: 'South Korea', currencyCode: 'KRW', languageCode: 'ko', flagEmoji: '🇰🇷' },
  { code: 'BR', name: 'Brazil', currencyCode: 'BRL', languageCode: 'pt', flagEmoji: '🇧🇷' },
  { code: 'MX', name: 'Mexico', currencyCode: 'MXN', languageCode: 'es', flagEmoji: '🇲🇽' },
  { code: 'ZA', name: 'South Africa', currencyCode: 'ZAR', languageCode: 'en', flagEmoji: '🇿🇦' },
  { code: 'MY', name: 'Malaysia', currencyCode: 'MYR', languageCode: 'en', flagEmoji: '🇲🇾' },
  { code: 'TH', name: 'Thailand', currencyCode: 'THB', languageCode: 'en', flagEmoji: '🇹🇭' },
]

// Seed the GeoCountry table if empty
async function seedGeoCountries() {
  const count = await db.geoCountry.count()
  if (count === 0) {
    await db.geoCountry.createMany({
      data: COUNTRY_SEED_DATA,
    })
  }
}

// Extract client IP from request
function getClientIp(request: NextRequest): string {
  // Try x-forwarded-for header first (common in proxy/CDN setups)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs; the first is the client
    const ips = forwarded.split(',').map((ip) => ip.trim())
    if (ips.length > 0 && ips[0]) {
      return ips[0]
    }
  }

  // Fallback: try request.ip (available in some Next.js deployments)
  // Note: request.ip is not standard in NextRequest, but may be available via custom server

  // Default to a known Indian IP for local development (will resolve to IN)
  return '103.156.19.2'
}

// Fetch geo data from ipapi.co
interface GeoApiResponse {
  ip?: string
  country?: string
  country_name?: string
  currency?: string
  languages?: string
  error?: boolean
  reason?: string
}

async function fetchGeoFromIp(ip: string): Promise<GeoApiResponse | null> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      cache: 'no-store', // No cache for real-time detection
    })
    if (!response.ok) {
      console.error(`Geo API returned status ${response.status}`)
      return null
    }
    const data: GeoApiResponse = await response.json()
    if (data.error) {
      console.error(`Geo API error: ${data.reason}`)
      return null
    }
    return data
  } catch (error) {
    console.error('Failed to fetch geo data from ipapi.co:', error)
    return null
  }
}

// Map country code to language code from our database
async function getCountryInfo(countryCode: string): Promise<{
  country: string
  countryName: string
  currency: string
  language: string
  flagEmoji: string
} | null> {
  const geoCountry = await db.geoCountry.findUnique({
    where: { code: countryCode },
  })
  if (geoCountry) {
    return {
      country: geoCountry.code,
      countryName: geoCountry.name,
      currency: geoCountry.currencyCode,
      language: geoCountry.languageCode,
      flagEmoji: geoCountry.flagEmoji ?? '',
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Seed the GeoCountry table if empty
    await seedGeoCountries()

    // Get client IP
    const ip = getClientIp(request)

    // Default fallback (India / INR / Hindi)
    const defaultResponse = {
      country: 'IN',
      countryName: 'India',
      currency: 'INR',
      language: 'hi',
      flagEmoji: '🇮🇳',
      ip,
    }

    // Try to detect geo from IP
    const geoData = await fetchGeoFromIp(ip)

    if (!geoData || !geoData.country) {
      // Could not detect — return default
      return NextResponse.json(defaultResponse)
    }

    const detectedCountryCode = geoData.country.toUpperCase()

    // Look up country info from our database
    const countryInfo = await getCountryInfo(detectedCountryCode)

    if (countryInfo) {
      return NextResponse.json({
        ...countryInfo,
        ip,
      })
    }

    // Country not in our database — use API data with fallbacks
    // Try to find if the currency from the API matches any country in our DB
    const currencyMatch = await db.geoCountry.findFirst({
      where: { currencyCode: geoData.currency || 'USD' },
    })

    if (currencyMatch) {
      return NextResponse.json({
        country: detectedCountryCode,
        countryName: geoData.country_name || detectedCountryCode,
        currency: currencyMatch.currencyCode,
        language: currencyMatch.languageCode,
        flagEmoji: currencyMatch.flagEmoji ?? '',
        ip,
      })
    }

    // Absolute fallback — use API data or defaults
    return NextResponse.json({
      country: detectedCountryCode,
      countryName: geoData.country_name || detectedCountryCode,
      currency: geoData.currency || 'INR',
      language: geoData.languages?.split(',')[0]?.split('-')[0] || 'en',
      flagEmoji: '',
      ip,
    })
  } catch (error) {
    console.error('Geo API error:', error)
    return NextResponse.json(
      {
        country: 'IN',
        countryName: 'India',
        currency: 'INR',
        language: 'hi',
        flagEmoji: '🇮🇳',
        ip: 'unknown',
      },
      { status: 200 } // Return 200 with default data so the client always gets a response
    )
  }
}
