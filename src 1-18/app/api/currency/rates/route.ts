import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Fallback seed data (used when external API is unavailable)
const CURRENCY_SEED_DATA = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 1 },
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.0119 },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.0110 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.0095 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 0.0437 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', rate: 0.0446 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 0.0160 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 0.0189 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 0.0170 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 1.7850 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rate: 0.0865 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', rate: 17.35 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 0.069 },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', rate: 0.243 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 0.219 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rate: 0.0528 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 0.401 },
]

// Currency name and symbol mappings for currencies from the external API
const CURRENCY_META: Record<string, { name: string; symbol: string }> = {
  INR: { name: 'Indian Rupee', symbol: '₹' },
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  MXN: { name: 'Mexican Peso', symbol: 'MX$' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM' },
  THB: { name: 'Thai Baht', symbol: '฿' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  DKK: { name: 'Danish Krone', symbol: 'kr' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  PLN: { name: 'Polish Zloty', symbol: 'zł' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft' },
  PHP: { name: 'Philippine Peso', symbol: '₱' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
  TRY: { name: 'Turkish Lira', symbol: '₺' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  ILS: { name: 'Israeli Shekel', symbol: '₪' },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв' },
  RON: { name: 'Romanian Leu', symbol: 'lei' },
  ISK: { name: 'Icelandic Króna', symbol: 'kr' },
}

// 24 hours in milliseconds
const STALE_THRESHOLD = 24 * 60 * 60 * 1000

// Fetch exchange rates from the Frankfurter API
interface FrankfurterResponse {
  base: string
  date: string
  rates: Record<string, number>
}

async function fetchRatesFromApi(): Promise<FrankfurterResponse | null> {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?from=INR', {
      cache: 'no-store',
    })
    if (!response.ok) {
      console.error(`Frankfurter API returned status ${response.status}`)
      return null
    }
    const data: FrankfurterResponse = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch exchange rates from Frankfurter API:', error)
    return null
  }
}

// Seed the CurrencyRate table with fallback data if empty
async function seedCurrencyRates() {
  const count = await db.currencyRate.count()
  if (count === 0) {
    await db.currencyRate.createMany({
      data: CURRENCY_SEED_DATA.map((item) => ({
        code: item.code,
        name: item.name,
        symbol: item.symbol,
        rate: item.rate,
      })),
    })
  }
}

// Get all rates from the database formatted for the API response
async function getFormattedRates() {
  const rates = await db.currencyRate.findMany({
    orderBy: { code: 'asc' },
  })

  const ratesMap: Record<string, { code: string; name: string; symbol: string; rate: number }> = {}
  for (const r of rates) {
    ratesMap[r.code] = {
      code: r.code,
      name: r.name,
      symbol: r.symbol,
      rate: r.rate,
    }
  }

  // Find the most recent updatedAt as lastUpdated
  const lastUpdated = rates.length > 0 ? rates[0].updatedAt.toISOString() : new Date().toISOString()

  return {
    baseCurrency: 'INR',
    rates: ratesMap,
    lastUpdated,
  }
}

// Refresh rates from the external API and store in DB
async function refreshRatesFromApi(): Promise<boolean> {
  const apiData = await fetchRatesFromApi()

  if (!apiData || !apiData.rates) {
    console.warn('Could not fetch rates from API, keeping existing data')
    return false
  }

  // Include INR base rate
  const allRates: Record<string, number> = { INR: 1, ...apiData.rates }

  // Upsert all rates into the database
  for (const [code, rate] of Object.entries(allRates)) {
    const meta = CURRENCY_META[code] || { name: code, symbol: code }
    await db.currencyRate.upsert({
      where: { code },
      update: {
        rate,
        name: meta.name,
        symbol: meta.symbol,
      },
      create: {
        code,
        name: meta.name,
        symbol: meta.symbol,
        rate,
      },
    })
  }

  return true
}

// Check if rates are stale (older than 24 hours)
async function areRatesStale(): Promise<boolean> {
  const latestRate = await db.currencyRate.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!latestRate) return true

  const timeSinceUpdate = Date.now() - latestRate.updatedAt.getTime()
  return timeSinceUpdate > STALE_THRESHOLD
}

// GET /api/currency/rates — Returns all currency rates
export async function GET() {
  try {
    // Seed if empty
    await seedCurrencyRates()

    // Check if rates are stale
    const stale = await areRatesStale()

    if (stale) {
      // Try to refresh from external API
      const refreshed = await refreshRatesFromApi()
      if (!refreshed) {
        // API unavailable — serve existing (possibly stale) data
        console.warn('Using cached currency rates (external API unavailable)')
      }
    }

    const result = await getFormattedRates()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Currency rates GET error:', error)

    // Try to return whatever we have in the database
    try {
      const result = await getFormattedRates()
      return NextResponse.json(result)
    } catch {
      // Absolute fallback with seed data
      const ratesMap: Record<string, { code: string; name: string; symbol: string; rate: number }> = {}
      for (const item of CURRENCY_SEED_DATA) {
        ratesMap[item.code] = item
      }
      return NextResponse.json({
        baseCurrency: 'INR',
        rates: ratesMap,
        lastUpdated: new Date().toISOString(),
      })
    }
  }
}

// POST /api/currency/rates — Force refresh exchange rates (admin only, no auth check for now)
export async function POST() {
  try {
    // Seed if empty
    await seedCurrencyRates()

    // Force refresh from external API
    const refreshed = await refreshRatesFromApi()

    if (!refreshed) {
      // Return cached data even if refresh failed
      const cached = await getFormattedRates()
      return NextResponse.json(
        {
          error: 'Failed to refresh rates from external API. Using cached data.',
          ...cached,
        },
        { status: 503 }
      )
    }

    const result = await getFormattedRates()
    return NextResponse.json({
      ...result,
      message: 'Exchange rates refreshed successfully',
    })
  } catch (error) {
    console.error('Currency rates POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to refresh currency rates'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
