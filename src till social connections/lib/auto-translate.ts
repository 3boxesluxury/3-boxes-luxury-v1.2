/**
 * auto-translate.ts
 * Auto-translates product name + description into all 9 locales.
 * Uses Google Translate (gtx endpoint — FREE, no API key, no credit card).
 * Fallback: MyMemory API if Google fails.
 *
 * Usage:
 *   import { autoTranslateProduct } from '@/lib/auto-translate'
 *   autoTranslateProduct(productId, name, description) // fire-and-forget
 */

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

// ─── Google Translate (gtx) ────────────────────────────────────────

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

// ─── Combined ──────────────────────────────────────────────────────

async function translate(text: string, targetLang: string): Promise<string | null> {
  const result = await googleTranslate(text, targetLang)
  if (result) return result
  return myMemoryTranslate(text, targetLang)
}

export async function autoTranslateProduct(
  productId: string,
  name: string,
  description: string
): Promise<{ created: number; failed: number }> {
  let created = 0
  let failed = 0

  try {
    const { db } = await import('@/lib/db')

    for (const locale of LOCALES) {
      // Translate name (retry 3 times)
      let translatedName: string | null = null
      for (let retry = 0; retry < 3; retry++) {
        translatedName = await translate(name, locale.code)
        if (translatedName) break
        if (retry < 2) await new Promise((r) => setTimeout(r, 2000))
      }

      if (!translatedName) {
        failed++
        continue
      }

      // Translate description (retry 3 times)
      let translatedDesc: string | null = null
      for (let retry = 0; retry < 3; retry++) {
        translatedDesc = await translate(description.substring(0, 500), locale.code)
        if (translatedDesc) break
        if (retry < 2) await new Promise((r) => setTimeout(r, 2000))
      }

      try {
        await db.productTranslation.upsert({
          where: {
            productId_locale: { productId, locale: locale.code },
          },
          create: {
            productId,
            locale: locale.code,
            name: translatedName,
            description: translatedDesc || description,
          },
          update: {
            name: translatedName,
            description: translatedDesc || description,
          },
        })
        created++
      } catch {
        failed++
      }

      await new Promise((r) => setTimeout(r, 300))
    }

    if (created > 0) {
      console.log(`[auto-translate] "${name}": ${created} created, ${failed} failed`)
    }
  } catch (err: any) {
    console.log(`[auto-translate] "${name}" error: ${err.message?.substring(0, 60)}`)
    failed = LOCALES.length
  }

  return { created, failed }
}

export async function autoTranslateProducts(
  products: { id: string; name: string; description: string }[]
): Promise<{ total: number; created: number; failed: number }> {
  let created = 0
  let failed = 0
  for (const product of products) {
    const result = await autoTranslateProduct(product.id, product.name, product.description)
    created += result.created
    failed += result.failed
    await new Promise((r) => setTimeout(r, 500))
  }
  return { total: products.length, created, failed }
}