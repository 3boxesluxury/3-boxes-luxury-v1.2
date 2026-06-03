import { NextRequest, NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────

interface FamilyShoppingRequest {
  occasion: string
  adults: number
  kids: number
  ageGroups: {
    adults: string
    kids: string
  }
  budget: string
  preferences: string[]
  userId?: string
}

interface PackageItem {
  name: string
  price: number
  image: string
}

interface FamilyPackage {
  type: string
  items: PackageItem[]
  totalPrice: number
  discount: number
  savings: number
}

interface FamilyOffer {
  title: string
  description: string
  discount: string
  badge: string
}

interface FamilyShoppingResponse {
  packages: FamilyPackage[]
  familyOffers: FamilyOffer[]
  discountTier: string
  totalSavings: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseBudget(budget: string): number {
  const budgetMap: Record<string, number> = {
    'under-1000': 1000,
    '1000-2500': 2500,
    '2500-5000': 5000,
    '5000-10000': 10000,
    '10000-25000': 25000,
    'above-25000': 50000,
  }
  if (budgetMap[budget]) return budgetMap[budget]
  const parsed = parseInt(budget.replace(/[^0-9]/g, ''), 10)
  return isNaN(parsed) ? 5000 : parsed
}

function getDiscountTier(familySize: number): string {
  if (familySize >= 6) return 'Platinum Family'
  if (familySize >= 4) return 'Gold Family'
  return 'Silver Family'
}

function getFamilyDiscount(tier: string): number {
  switch (tier) {
    case 'Platinum Family': return 0.20
    case 'Gold Family': return 0.15
    case 'Silver Family': return 0.10
    default: return 0.10
  }
}

// ── Fallback Data ──────────────────────────────────────────────────────────

function getFallbackData(req: FamilyShoppingRequest): FamilyShoppingResponse {
  const budgetAmount = parseBudget(req.budget)
  const familySize = req.adults + req.kids
  const discountTier = getDiscountTier(familySize)
  const discountRate = getFamilyDiscount(discountTier)

  // Distribute budget across packages
  const adultBudget = budgetAmount * 0.5
  const kidsBudget = budgetAmount * 0.3
  const sharedBudget = budgetAmount * 0.2

  const packages: FamilyPackage[] = [
    {
      type: 'Adults Collection',
      items: [
        { name: 'Premium Silk Saree', price: Math.round(adultBudget * 0.4), image: '/images/products/saree.jpg' },
        { name: 'Luxury Watch', price: Math.round(adultBudget * 0.35), image: '/images/products/watch.jpg' },
        { name: 'Designer Fragrance', price: Math.round(adultBudget * 0.25), image: '/images/products/fragrance.jpg' },
      ],
      totalPrice: 0, // calculated below
      discount: 0,
      savings: 0,
    },
    {
      type: 'Kids Collection',
      items: [
        { name: 'Premium Toy Set', price: Math.round(kidsBudget * 0.45), image: '/images/products/toys.jpg' },
        { name: 'Designer Kids Outfit', price: Math.round(kidsBudget * 0.35), image: '/images/products/kids-fashion.jpg' },
        { name: 'Educational Game', price: Math.round(kidsBudget * 0.2), image: '/images/products/game.jpg' },
      ],
      totalPrice: 0,
      discount: 0,
      savings: 0,
    },
    {
      type: 'Family Shared',
      items: [
        { name: 'Luxury Home Decor', price: Math.round(sharedBudget * 0.5), image: '/images/products/home-decor.jpg' },
        { name: 'Gourmet Gift Box', price: Math.round(sharedBudget * 0.5), image: '/images/products/gourmet.jpg' },
      ],
      totalPrice: 0,
      discount: 0,
      savings: 0,
    },
  ]

  // Calculate totals per package
  let totalSavings = 0
  for (const pkg of packages) {
    pkg.totalPrice = pkg.items.reduce((sum, item) => sum + item.price, 0)
    pkg.discount = Math.round(pkg.totalPrice * discountRate * 100) / 100
    pkg.savings = pkg.discount
    totalSavings += pkg.savings
  }

  return {
    packages,
    familyOffers: [
      {
        title: 'Family Bundle Discount',
        description: `${discountTier} members enjoy ${Math.round(discountRate * 100)}% off on all family packages`,
        discount: `${Math.round(discountRate * 100)}% OFF`,
        badge: discountTier,
      },
      {
        title: 'Kids Go Free Wrapping',
        description: 'Free luxury gift wrapping on all kids\' items in your family package',
        discount: 'FREE',
        badge: 'Kids Special',
      },
      {
        title: 'Occasion Bonus',
        description: `Extra 5% off for ${req.occasion} family celebrations`,
        discount: '5% EXTRA',
        badge: 'Limited Time',
      },
    ],
    discountTier,
    totalSavings: Math.round(totalSavings * 100) / 100,
  }
}

// ── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as FamilyShoppingRequest
    const { occasion, adults, kids, ageGroups, budget, preferences, userId } = body

    // Validate input
    if (!occasion || typeof occasion !== 'string') {
      return NextResponse.json(
        { error: 'Occasion is required' },
        { status: 400 }
      )
    }

    if (typeof adults !== 'number' || adults < 0) {
      return NextResponse.json(
        { error: 'Number of adults must be a non-negative number' },
        { status: 400 }
      )
    }

    if (typeof kids !== 'number' || kids < 0) {
      return NextResponse.json(
        { error: 'Number of kids must be a non-negative number' },
        { status: 400 }
      )
    }

    if (adults + kids === 0) {
      return NextResponse.json(
        { error: 'At least one family member (adult or kid) must be specified' },
        { status: 400 }
      )
    }

    if (!budget || typeof budget !== 'string') {
      return NextResponse.json(
        { error: 'Budget is required' },
        { status: 400 }
      )
    }

    const familySize = adults + kids
    const budgetAmount = parseBudget(budget)
    const discountTier = getDiscountTier(familySize)
    const discountRate = getFamilyDiscount(discountTier)

    // ── AI-powered family recommendations ────────────────────────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const systemPrompt = `You are the AI Family Shopping Advisor for "3 BOXES LUXURY", a premium luxury e-commerce brand in India. You create personalized family gift packages for celebrations, considering each family member's age group, preferences, and budget. You always respond with valid JSON only — no markdown, no extra text.`

      const userPrompt = `Create a personalized family shopping package for this celebration:

Occasion: ${occasion}
Adults: ${adults} (Age group: ${ageGroups?.adults || '25-45'})
Kids: ${kids} (Age group: ${ageGroups?.kids || '5-12'})
Budget: ₹${budgetAmount}
Preferences: ${preferences?.length ? preferences.join(', ') : 'No specific preferences'}
${userId ? `Customer ID: ${userId}` : ''}

Available categories: Jewelry, Sarees, Watches, Fashion, Leather Goods, Fragrances, Home & Living, Men's Shirts & T-Shirts, Toys & Collectibles, Romantic Gifts, Couple Gifts.

Return ONLY a JSON object with this exact structure (no markdown fences, no extra text):

{
  "packages": [
    {
      "type": "Package type (e.g., Adults Collection, Kids Collection, Family Shared, Couple Special)",
      "items": [
        {"name": "Product name", "price": 1500, "image": "/images/products/placeholder.jpg"},
        {"name": "Product name", "price": 2000, "image": "/images/products/placeholder.jpg"}
      ],
      "totalPrice": 3500,
      "discount": 525,
      "savings": 525
    }
  ],
  "familyOffers": [
    {"title": "Offer title", "description": "Offer details", "discount": "15% OFF", "badge": "Badge name"},
    {"title": "Offer title", "description": "Offer details", "discount": "FREE", "badge": "Badge name"},
    {"title": "Offer title", "description": "Offer details", "discount": "5% EXTRA", "badge": "Badge name"}
  ],
  "discountTier": "${discountTier}",
  "totalSavings": 1050
}

Rules:
- Create 2-4 packages depending on family composition
- Always include an "Adults Collection" if adults > 0
- Always include a "Kids Collection" if kids > 0
- Include a "Family Shared" package for joint gifts
- Each package should have 2-4 items
- Item prices should be realistic for luxury products in India
- Total of all package totalPrice values should be within the budget (₹${budgetAmount})
- discount on each package should be ${Math.round(discountRate * 100)}% (for ${discountTier})
- image paths should use /images/products/ placeholder format
- familyOffers should include 3 relevant offers
- totalSavings should equal sum of all package savings
- Make items specific to the occasion and age groups`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      const rawContent = completion.choices?.[0]?.message?.content || ''

      // Try to parse the AI response as JSON
      let parsed: FamilyShoppingResponse | null = null
      try {
        const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (parseErr) {
        console.error('[family-shopping] Failed to parse AI response as JSON:', parseErr)
        console.log('[family-shopping] Raw AI response:', rawContent.substring(0, 500))
      }

      if (parsed && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
        // Validate and sanitize packages
        const validatedPackages: FamilyPackage[] = parsed.packages
          .filter((pkg: FamilyPackage) => pkg.type && Array.isArray(pkg.items) && pkg.items.length > 0)
          .map((pkg: FamilyPackage) => {
            const items = pkg.items
              .filter((item: PackageItem) => item.name && typeof item.price === 'number' && item.price > 0)
              .map((item: PackageItem) => ({
                name: item.name,
                price: Math.round(item.price * 100) / 100,
                image: item.image || '/images/products/placeholder.jpg',
              }))

            const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
            const discount = Math.round(totalPrice * discountRate * 100) / 100

            return {
              type: pkg.type,
              items,
              totalPrice: Math.round(totalPrice * 100) / 100,
              discount,
              savings: discount,
            }
          })
          .filter((pkg: FamilyPackage) => pkg.items.length > 0)

        if (validatedPackages.length > 0) {
          const totalSavings = validatedPackages.reduce((sum, pkg) => sum + pkg.savings, 0)

          // Validate family offers
          const validatedOffers: FamilyOffer[] = Array.isArray(parsed.familyOffers)
            ? parsed.familyOffers
                .filter((o: FamilyOffer) => o.title && o.description)
                .slice(0, 4)
            : getFallbackData(body).familyOffers

          const result: FamilyShoppingResponse = {
            packages: validatedPackages,
            familyOffers: validatedOffers.length > 0 ? validatedOffers : getFallbackData(body).familyOffers,
            discountTier: parsed.discountTier || discountTier,
            totalSavings: Math.round(totalSavings * 100) / 100,
          }

          return NextResponse.json(result)
        }
      }
    } catch (aiError) {
      console.error('[family-shopping] AI recommendation failed, using fallback:', aiError instanceof Error ? aiError.message : String(aiError))
    }

    // Fallback if AI call fails or returns unparseable data
    return NextResponse.json(getFallbackData(body))
  } catch (error) {
    console.error('[family-shopping] Route error:', error)
    return NextResponse.json(
      { error: 'Failed to generate family shopping recommendations' },
      { status: 500 }
    )
  }
}
