import { NextRequest, NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────

interface BundleItem {
  portal: string
  productId: string
  name: string
  price: number
}

interface ThreeBoxCurateRequest {
  items: BundleItem[]
  userId?: string
}

interface AISuggestion {
  productId: string
  reason: string
}

interface ThreeBoxCurateResponse {
  bundleId: string
  totalItems: number
  subtotal: number
  discount: number
  total: number
  packagingNotes: string
  estimatedDelivery: string
  aiSuggestions: AISuggestion[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateBundleId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `3BX-${timestamp}-${random}`.toUpperCase()
}

function calculateDiscount(itemCount: number, subtotal: number): number {
  // Tiered discount: more items = bigger savings
  if (itemCount >= 5) return Math.round(subtotal * 0.15 * 100) / 100
  if (itemCount >= 3) return Math.round(subtotal * 0.10 * 100) / 100
  if (itemCount >= 2) return Math.round(subtotal * 0.05 * 100) / 100
  return 0
}

function getEstimatedDelivery(): string {
  const date = new Date()
  date.setDate(date.getDate() + 3) // 3 business days from now
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

// ── Fallback Data ──────────────────────────────────────────────────────────

function getFallbackData(items: BundleItem[]): ThreeBoxCurateResponse {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const discount = calculateDiscount(items.length, subtotal)

  return {
    bundleId: generateBundleId(),
    totalItems: items.length,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round((subtotal - discount) * 100) / 100,
    packagingNotes: `Your ${items.length}-item luxury bundle will be carefully packaged in our signature 3 Boxes gift packaging. Each item is wrapped individually in premium tissue paper with branded seals. Fragile items receive additional protective cushioning. The complete set is presented in our signature matte-black gift box with a satin ribbon closure.`,
    estimatedDelivery: getEstimatedDelivery(),
    aiSuggestions: [
      { productId: 'ADD-GIFT-WRAP', reason: 'Enhance your bundle with our premium gift wrapping service for a complete luxury experience.' },
      { productId: 'ADD-CARD', reason: 'Add a personalized greeting card to make your gift bundle even more special.' },
    ],
  }
}

// ── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ThreeBoxCurateRequest
    const { items, userId } = body

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item must be provided' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.name || typeof item.price !== 'number' || item.price < 0) {
        return NextResponse.json(
          { error: `Invalid item: ${JSON.stringify(item)}. Each item must have productId, name, and a valid price.` },
          { status: 400 }
        )
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.price, 0)

    // ── AI-powered curation ──────────────────────────────────────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const systemPrompt = `You are the AI Bundle Curator for "3 BOXES LUXURY", a premium luxury e-commerce brand in India. You optimize multi-item bundles for the best packaging, delivery experience, and complementary product suggestions. You always respond with valid JSON only — no markdown, no extra text.`

      const itemList = items
        .map((item, i) => `${i + 1}. ${item.name} (₹${item.price}) — Portal: ${item.portal}, ID: ${item.productId}`)
        .join('\n')

      const userPrompt = `Optimize this luxury gift bundle for the best customer experience:

Items in bundle:
${itemList}

Bundle subtotal: ₹${subtotal}
Total items: ${items.length}
${userId ? `Customer ID: ${userId}` : ''}

Analyze the items and provide:
1. Optimal packaging strategy (consider item types, fragility, presentation)
2. Realistic delivery estimate for India
3. Up to 3 AI-suggested complementary products that would enhance this bundle

Return ONLY a JSON object with this exact structure (no markdown fences, no extra text):

{
  "packagingNotes": "Detailed packaging description for this specific bundle",
  "estimatedDelivery": "Delivery estimate like 'Thursday, Jan 15'",
  "aiSuggestions": [
    {"productId": "SUGGESTED-PRODUCT-ID", "reason": "Why this product complements the bundle"},
    {"productId": "SUGGESTED-PRODUCT-ID", "reason": "Why this product complements the bundle"},
    {"productId": "SUGGESTED-PRODUCT-ID", "reason": "Why this product complements the bundle"}
  ]
}

Rules:
- packagingNotes should be specific to the items (mention item types, not generic)
- estimatedDelivery should be 3-5 business days from now in format "Weekday, Month Day"
- aiSuggestions should recommend products from: Jewelry, Sarees, Watches, Fashion, Leather Goods, Fragrances, Home & Living
- productId for suggestions can be like "ADD-JEWELRY-SET", "ADD-FRAGRANCE-MINI", "ADD-SCARF", etc.
- reasons should explain how the suggestion complements the existing items`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const rawContent = completion.choices?.[0]?.message?.content || ''

      // Try to parse the AI response as JSON
      let parsed: { packagingNotes?: string; estimatedDelivery?: string; aiSuggestions?: AISuggestion[] } | null = null
      try {
        const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (parseErr) {
        console.error('[threebox-curate] Failed to parse AI response as JSON:', parseErr)
        console.log('[threebox-curate] Raw AI response:', rawContent.substring(0, 500))
      }

      if (parsed) {
        const discount = calculateDiscount(items.length, subtotal)

        const result: ThreeBoxCurateResponse = {
          bundleId: generateBundleId(),
          totalItems: items.length,
          subtotal: Math.round(subtotal * 100) / 100,
          discount: Math.round(discount * 100) / 100,
          total: Math.round((subtotal - discount) * 100) / 100,
          packagingNotes: typeof parsed.packagingNotes === 'string'
            ? parsed.packagingNotes
            : getFallbackData(items).packagingNotes,
          estimatedDelivery: typeof parsed.estimatedDelivery === 'string'
            ? parsed.estimatedDelivery
            : getEstimatedDelivery(),
          aiSuggestions: Array.isArray(parsed.aiSuggestions)
            ? parsed.aiSuggestions
                .filter((s: AISuggestion) => s.productId && s.reason)
                .slice(0, 3)
            : getFallbackData(items).aiSuggestions,
        }

        return NextResponse.json(result)
      }
    } catch (aiError) {
      console.error('[threebox-curate] AI curation failed, using fallback:', aiError instanceof Error ? aiError.message : String(aiError))
    }

    // Fallback if AI call fails or returns unparseable data
    return NextResponse.json(getFallbackData(items))
  } catch (error) {
    console.error('[threebox-curate] Route error:', error)
    return NextResponse.json(
      { error: 'Failed to curate bundle' },
      { status: 500 }
    )
  }
}
