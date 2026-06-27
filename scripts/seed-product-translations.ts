/**
 * seed-product-translations.ts
 * Populates product_translation table for all 9 non-English locales.
 *
 * Usage:
 *   npx tsx scripts/seed-product-translations.ts
 *   npx tsx scripts/seed-product-translations.ts --force
 *   npx tsx scripts/seed-product-translations.ts --lang hi
 *
 * Uses Google Translate (gtx endpoint — FREE, no API key, no credit card).
 * Fallback: MyMemory API if Google fails.
 * NO product skipping — retries on failure.
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const LOCALES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'zh', name: 'Chinese Simplified' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
] as const

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const langFilter = args.find((a) => a.startsWith('--lang='))?.replace('--lang=', '') || null

// ─── Google Translate (gtx) — same endpoint Google website uses ──

async function googleTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!res.ok) return null

    const data = await res.json()
    // Response format: [[["translated","original",...],...],...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((part: any[]) => part[0]).filter(Boolean).join('')
      return translated || null
    }
    return null
  } catch {
    return null
  }
}

// ─── MyMemory fallback ─────────────────────────────────────────────

async function myMemoryTranslate(text: string, targetLang: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
    const res = await fetch(url)

    if (!res.ok) return null

    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText
      // MyMemory returns uppercase text when it hits limits — detect and reject
      if (translated === translated.toUpperCase() && translated.length > 20) {
        return null
      }
      return translated
    }
    return null
  } catch {
    return null
  }
}

// ─── Combined translator: Google first, MyMemory fallback ──────────

async function translate(text: string, targetLang: string): Promise<string | null> {
  // Try Google first
  const result = await googleTranslate(text, targetLang)
  if (result) return result

  // Fallback to MyMemory
  const fallback = await myMemoryTranslate(text, targetLang)
  if (fallback) return fallback

  return null
}

/**
 * Translate a single product's name and description.
 * Each field retries up to 3 times.
 */
async function translateProduct(
  product: { id: string; name: string; description: string },
  targetLang: string
): Promise<{ name: string; description: string } | null> {
  // Translate name (retry 3 times)
  let translatedName: string | null = null
  for (let retry = 0; retry < 3; retry++) {
    translatedName = await translate(product.name, targetLang)
    if (translatedName) break
    if (retry < 2) await new Promise((r) => setTimeout(r, 2000))
  }

  if (!translatedName) return null

  // Translate description (retry 3 times)
  let translatedDesc: string | null = null
  const shortDesc = product.description.substring(0, 500)
  for (let retry = 0; retry < 3; retry++) {
    translatedDesc = await translate(shortDesc, targetLang)
    if (translatedDesc) break
    if (retry < 2) await new Promise((r) => setTimeout(r, 2000))
  }

  return {
    name: translatedName,
    description: translatedDesc || product.description,
  }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('=== Product Translation Seeder (Google Translate - FREE) ===')
  console.log('  Primary: Google Translate (gtx endpoint)')
  console.log('  Fallback: MyMemory API\n')

  // Quick test
  console.log('Testing translation API...')
  const testResult = await translate('hello world', 'es')
  if (testResult) {
    console.log(`  OK! ("hello world" -> "${testResult}")\n`)
  } else {
    console.log('  WARNING: Test translation failed, but will retry during actual work\n')
  }

  // Fetch products
  console.log('Fetching products...')
  const products = await db.product.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { createdAt: 'asc' },
  })

  if (products.length === 0) {
    console.error('No products found.')
    process.exit(1)
  }

  const targetLocales = langFilter
    ? LOCALES.filter((l) => l.code === langFilter)
    : [...LOCALES]

  console.log(`${products.length} products x ${targetLocales.length} languages`)
  console.log(`Force: ${FORCE ? 'YES (re-translate everything)' : 'NO (skip existing)'}\n`)

  let totalCreated = 0
  let totalFailed = 0
  const failedProducts: string[] = []

  for (const locale of targetLocales) {
    console.log(`\n=== ${locale.name} (${locale.code}) ===`)

    const existing = await db.productTranslation.findMany({
      where: { locale: locale.code },
      select: { productId: true },
    })
    const existingIds = new Set(existing.map((e: any) => e.productId))
    const toTranslate = FORCE
      ? products
      : products.filter((p) => !existingIds.has(p.id))

    if (toTranslate.length === 0) {
      console.log('  All done - skipping')
      continue
    }

    console.log(`  ${toTranslate.length} to translate (${existingIds.size} already exist)`)

    let localeCreated = 0
    let localeFailed = 0

    for (let i = 0; i < toTranslate.length; i++) {
      const product = toTranslate[i]
      const num = `[${i + 1}/${toTranslate.length}]`
      process.stdout.write(`  ${num} "${product.name.substring(0, 40)}"... `)

      const translated = await translateProduct(product, locale.code)

      if (translated) {
        try {
          await db.productTranslation.upsert({
            where: {
              productId_locale: { productId: product.id, locale: locale.code },
            },
            create: {
              productId: product.id,
              locale: locale.code,
              name: translated.name,
              description: translated.description,
            },
            update: {
              name: translated.name,
              description: translated.description,
            },
          })
          localeCreated++
          console.log(`OK`)
        } catch (err: any) {
          localeFailed++
          console.log(`DB ERROR: ${err.message?.substring(0, 50)}`)
        }
      } else {
        localeFailed++
        console.log(`FAILED`)
        if (!failedProducts.includes(product.name)) {
          failedProducts.push(product.name)
        }
      }

      // Small delay between products
      await new Promise((r) => setTimeout(r, 500))
    }

    totalCreated += localeCreated
    totalFailed += localeFailed
    console.log(`  Result: ${localeCreated} OK, ${localeFailed} failed`)
  }

  console.log('\n' + '='.repeat(50))
  console.log(`DONE! ${totalCreated} translations created`)
  if (totalFailed > 0) {
    console.log(`WARNING: ${totalFailed} translations failed`)
    console.log(`Failed products: ${failedProducts.join(', ')}`)
    console.log('\nRe-run the script to retry failed products.')
  }

  const totalCount = await db.productTranslation.count()
  console.log(`DB total: ${totalCount}/${products.length * LOCALES.length} rows`)

  await db.$disconnect()
}

main().catch((err) => {
  console.error('Fatal:', err)
  db.$disconnect()
  process.exit(1)
})

