import { NextRequest, NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────

interface SocialStyleRequest {
  networks: string[]
  userId?: string
  facebookData?: {
    profile: { name: string; avatar?: string; email?: string }
    likes?: { name: string; category: string }[]
  }
}

interface StyleProfile {
  tags: string[]
  confidence: number
  description: string
}

interface ColorPreference {
  name: string
  hex: string
  affinity: number
}

interface RecommendedCategory {
  name: string
  match: number
  reason: string
}

interface SocialStyleResponse {
  styleProfile: StyleProfile
  colorPreferences: ColorPreference[]
  recommendedCategories: RecommendedCategory[]
}

// ── Fallback Data ──────────────────────────────────────────────────────────

function getFallbackData(networks: string[], facebookData?: SocialStyleRequest['facebookData']): SocialStyleResponse {
  const networkInfluence = networks.length > 0
    ? `influenced by your ${networks.join(', ')} presence`
    : 'based on general luxury trends'

  // If we have real Facebook likes, customize the tags
  let tags = ['Contemporary Luxury', 'Minimalist Chic', 'Artisan Craft']
  if (facebookData?.likes && facebookData.likes.length > 0) {
    const categories = [...new Set(facebookData.likes.map(l => l.category).filter(Boolean))]
    if (categories.length > 0) {
      tags = categories.slice(0, 3).map(c => `${c} Style`).concat(['Luxury Connoisseur'])
    }
  }

  return {
    styleProfile: {
      tags,
      confidence: 0.72,
      description: `Your style profile ${networkInfluence} suggests a preference for refined elegance with modern sensibilities. You gravitate toward quality craftsmanship and understated luxury.`,
    },
    colorPreferences: [
      { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 0.89 },
      { name: 'Midnight Navy', hex: '#1B2A4A', affinity: 0.85 },
      { name: 'Blush Rose', hex: '#F4C2C2', affinity: 0.78 },
      { name: 'Sage Green', hex: '#B2AC88', affinity: 0.74 },
      { name: 'Ivory Cream', hex: '#FFFFF0', affinity: 0.71 },
    ],
    recommendedCategories: [
      { name: 'Jewelry', match: 92, reason: 'Your affinity for timeless elegance aligns perfectly with our curated jewelry collection.' },
      { name: 'Watches', match: 87, reason: 'Your minimalist aesthetic pairs beautifully with our selection of refined timepieces.' },
      { name: 'Fragrances', match: 83, reason: 'Your sensory-driven style matches our luxury fragrance portfolio.' },
      { name: 'Fashion', match: 79, reason: 'Your contemporary taste resonates with our designer fashion lineup.' },
      { name: 'Home & Living', match: 74, reason: 'Your appreciation for artisanal quality extends naturally to luxury home décor.' },
    ],
  }
}

// ── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SocialStyleRequest
    const { networks, userId, facebookData } = body

    // Validate input
    if (!networks || !Array.isArray(networks) || networks.length === 0) {
      return NextResponse.json(
        { error: 'At least one social network must be provided' },
        { status: 400 }
      )
    }

    const validNetworks = ['instagram', 'pinterest', 'facebook', 'twitter', 'tiktok', 'linkedin', 'youtube']
    const normalizedNetworks = networks.map(n => n.toLowerCase().trim())
    const unknownNetworks = normalizedNetworks.filter(n => !validNetworks.includes(n))

    // Allow unknown networks but log them
    if (unknownNetworks.length > 0) {
      console.log(`[social-style] Unknown networks provided: ${unknownNetworks.join(', ')}`)
    }

    // ── AI-powered analysis ──────────────────────────────────────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const systemPrompt = `You are a fashion AI analyst for "3 BOXES LUXURY", a premium luxury e-commerce brand in India. You analyze social media presence to determine personal style profiles, color preferences, and product category recommendations. You always respond with valid JSON only — no markdown, no extra text.`

      // Build a richer prompt if we have real Facebook data
      let facebookContext = ''
      if (facebookData) {
        const parts: string[] = []
        if (facebookData.profile?.name) parts.push(`User's name: ${facebookData.profile.name}`)
        if (facebookData.likes && facebookData.likes.length > 0) {
          const likeNames = facebookData.likes.slice(0, 20).map(l => l.name).join(', ')
          const likeCategories = [...new Set(facebookData.likes.slice(0, 20).map(l => l.category).filter(Boolean))].join(', ')
          parts.push(`Liked pages: ${likeNames}`)
          parts.push(`Interest categories: ${likeCategories}`)
        }
        if (parts.length > 0) {
          facebookContext = `\n\nReal Facebook data available:\n${parts.join('\n')}`
        }
      }

      const userPrompt = `Analyze the fashion style of a user who is active on these social networks: ${normalizedNetworks.join(', ')}.${facebookContext}
${userId ? `User ID: ${userId}` : ''}

Based on typical content and aesthetic patterns on these platforms${facebookData ? ', plus the real social data provided above' : ''}, generate a style analysis. Return ONLY a JSON object with this exact structure (no markdown fences, no extra text):

{
  "styleProfile": {
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "confidence": 0.85,
    "description": "A 2-3 sentence description of the predicted style"
  },
  "colorPreferences": [
    {"name": "Color Name", "hex": "#HEXCODE", "affinity": 0.9},
    {"name": "Color Name", "hex": "#HEXCODE", "affinity": 0.8},
    {"name": "Color Name", "hex": "#HEXCODE", "affinity": 0.7},
    {"name": "Color Name", "hex": "#HEXCODE", "affinity": 0.6},
    {"name": "Color Name", "hex": "#HEXCODE", "affinity": 0.5}
  ],
  "recommendedCategories": [
    {"name": "Category Name", "match": 95, "reason": "Why this category matches"},
    {"name": "Category Name", "match": 88, "reason": "Why this category matches"},
    {"name": "Category Name", "match": 82, "reason": "Why this category matches"},
    {"name": "Category Name", "match": 75, "reason": "Why this category matches"},
    {"name": "Category Name", "match": 68, "reason": "Why this category matches"}
  ]
}

Available categories: Jewelry, Sarees, Watches, Fashion, Leather Goods, Fragrances, Home & Living, Men's Shirts & T-Shirts, Toys & Collectibles, Romantic Gifts, Couple Gifts.

Rules:
- tags should be fashion/style descriptors (e.g., "Bohemian Glamour", "Power Dressing")
- confidence should be 0.60-0.95
- hex codes must be valid 6-digit hex colors
- affinity values should be 0.50-0.99, sorted descending
- match values should be 50-99, sorted descending
- descriptions and reasons should be specific and insightful${facebookData ? '\n- Use the real social data to make more accurate and personalized recommendations' : ''}`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const rawContent = completion.choices?.[0]?.message?.content || ''

      // Try to parse the AI response as JSON
      let parsed: SocialStyleResponse | null = null
      try {
        // Strip markdown code fences if present
        const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (parseErr) {
        console.error('[social-style] Failed to parse AI response as JSON:', parseErr)
        console.log('[social-style] Raw AI response:', rawContent.substring(0, 500))
      }

      if (parsed && parsed.styleProfile && parsed.colorPreferences && parsed.recommendedCategories) {
        // Validate and sanitize the parsed data
        const result: SocialStyleResponse = {
          styleProfile: {
            tags: Array.isArray(parsed.styleProfile.tags)
              ? parsed.styleProfile.tags.slice(0, 5)
              : getFallbackData(normalizedNetworks, facebookData).styleProfile.tags,
            confidence: typeof parsed.styleProfile.confidence === 'number'
              ? Math.min(Math.max(parsed.styleProfile.confidence, 0), 1)
              : 0.72,
            description: typeof parsed.styleProfile.description === 'string'
              ? parsed.styleProfile.description
              : getFallbackData(normalizedNetworks, facebookData).styleProfile.description,
          },
          colorPreferences: Array.isArray(parsed.colorPreferences)
            ? parsed.colorPreferences
                .filter((c: ColorPreference) => c.name && c.hex && typeof c.affinity === 'number')
                .slice(0, 5)
            : getFallbackData(normalizedNetworks, facebookData).colorPreferences,
          recommendedCategories: Array.isArray(parsed.recommendedCategories)
            ? parsed.recommendedCategories
                .filter((c: RecommendedCategory) => c.name && typeof c.match === 'number' && c.reason)
                .slice(0, 5)
            : getFallbackData(normalizedNetworks, facebookData).recommendedCategories,
        }

        return NextResponse.json(result)
      }
    } catch (aiError) {
      console.error('[social-style] AI analysis failed, using fallback:', aiError instanceof Error ? aiError.message : String(aiError))
    }

    // Fallback if AI call fails or returns unparseable data
    return NextResponse.json(getFallbackData(normalizedNetworks, facebookData))
  } catch (error) {
    console.error('[social-style] Route error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze social style' },
      { status: 500 }
    )
  }
}
