import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_RATES } from '@/lib/currency/config';

// In-memory cache
let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Check in-memory cache first
    if (ratesCache && now - ratesCache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({
        base: 'USD',
        rates: ratesCache.rates,
        fetchedAt: new Date(ratesCache.fetchedAt).toISOString(),
        source: 'cache',
      });
    }
    
    // Try to fetch from DB
    try {
      const dbRates = await db.exchangeRate.findMany({
        where: { base: 'USD' },
      });
      
      if (dbRates.length > 0) {
        const rates: Record<string, number> = {};
        let latestFetchedAt = 0;
        
        for (const r of dbRates) {
          rates[r.target] = r.rate;
          const fetchedTime = new Date(r.fetchedAt).getTime();
          if (fetchedTime > latestFetchedAt) latestFetchedAt = fetchedTime;
        }
        
        // Ensure USD is always 1
        rates.USD = 1;
        
        // Use DB rates if they're recent enough (< 6 hours)
        if (latestFetchedAt > now - CACHE_TTL) {
          ratesCache = { rates, fetchedAt: latestFetchedAt };
          return NextResponse.json({
            base: 'USD',
            rates,
            fetchedAt: new Date(latestFetchedAt).toISOString(),
            source: 'database',
          });
        }
      }
    } catch {
      // DB read failed, continue to API fetch
    }
    
    // Try to fetch from external API
    try {
      const apiRes = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json' },
      });
      
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const apiRates: Record<string, number> = { USD: 1 };
        
        // Extract only the currencies we support
        const supportedCurrencies = Object.keys(DEFAULT_RATES);
        for (const currency of supportedCurrencies) {
          if (apiData.rates && apiData.rates[currency]) {
            apiRates[currency] = apiData.rates[currency];
          } else if (DEFAULT_RATES[currency]) {
            apiRates[currency] = DEFAULT_RATES[currency];
          }
        }
        
        // Save to DB (upsert)
        try {
          for (const [target, rate] of Object.entries(apiRates)) {
            if (target === 'USD') continue;
            await db.exchangeRate.upsert({
              where: { base_target: { base: 'USD', target } },
              update: { rate, source: 'open-er-api', fetchedAt: new Date() },
              create: { base: 'USD', target, rate, source: 'open-er-api' },
            });
          }
        } catch {
          // DB write failed, that's OK - we still have the rates
        }
        
        // Update in-memory cache
        ratesCache = { rates: apiRates, fetchedAt: now };
        
        return NextResponse.json({
          base: 'USD',
          rates: apiRates,
          fetchedAt: new Date().toISOString(),
          source: 'api',
        });
      }
    } catch {
      // API fetch failed
    }
    
    // Fallback: use default hardcoded rates
    ratesCache = { rates: DEFAULT_RATES, fetchedAt: now };
    return NextResponse.json({
      base: 'USD',
      rates: DEFAULT_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
    });
  } catch (error) {
    console.error('Exchange rates error:', error);
    return NextResponse.json({
      base: 'USD',
      rates: DEFAULT_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'error-fallback',
    });
  }
}

// POST: Admin force-refresh rates
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Clear cache to force refresh
    ratesCache = null;
    
    // Fetch fresh rates from API
    const apiRes = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(10000),
    });
    
    if (!apiRes.ok) {
      throw new Error(`API returned ${apiRes.status}`);
    }
    
    const apiData = await apiRes.json();
    const apiRates: Record<string, number> = { USD: 1 };
    
    const supportedCurrencies = Object.keys(DEFAULT_RATES);
    for (const currency of supportedCurrencies) {
      if (apiData.rates && apiData.rates[currency]) {
        apiRates[currency] = apiData.rates[currency];
      } else if (DEFAULT_RATES[currency]) {
        apiRates[currency] = DEFAULT_RATES[currency];
      }
    }
    
    // Save to DB
    for (const [target, rate] of Object.entries(apiRates)) {
      if (target === 'USD') continue;
      await db.exchangeRate.upsert({
        where: { base_target: { base: 'USD', target } },
        update: { rate, source: 'open-er-api', fetchedAt: new Date() },
        create: { base: 'USD', target, rate, source: 'open-er-api' },
      });
    }
    
    ratesCache = { rates: apiRates, fetchedAt: Date.now() };
    
    return NextResponse.json({
      base: 'USD',
      rates: apiRates,
      fetchedAt: new Date().toISOString(),
      source: 'refreshed',
    });
  } catch (error) {
    console.error('Rate refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh exchange rates' },
      { status: 500 }
    );
  }
}
