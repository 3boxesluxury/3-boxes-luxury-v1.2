import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchShopifyProducts,
  type ShopifyProductTransformed,
} from '@/lib/shopify'

// POST /api/gift-recommend - Gift recommendation using LLM + local product search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { occasion, recipient, relationship, budget, category, message } = body

    // At least one criterion should be provided
    if (!occasion && !recipient && !relationship && !budget && !category && !message) {
      return NextResponse.json(
        { error: 'At least one of occasion, recipient, relationship, budget, category, or message is required' },
        { status: 400 }
      )
    }

    // Budget parsing helper
    const budgetMap: Record<string, [number, number]> = {
      'under-50': [0, 50],
      '50-100': [50, 100],
      '100-250': [100, 250],
      '250-500': [250, 500],
      '500-plus': [500, 999999],
    }
    let budgetMin: number | null = null
    let budgetMax: number | null = null
    if (budget) {
      const range = budgetMap[budget]
      if (range) {
        budgetMin = range[0]
        budgetMax = range[1]
      } else {
        const budgetNum = parseFloat(budget)
        if (!isNaN(budgetNum) && budgetNum > 0) {
          budgetMax = budgetNum
        }
      }
    }

    // ── Shopify-only path (Vercel) ────────────────────────────────────
    const preferShopify = process.env.DATA_SOURCE === 'shopify' || !!process.env.VERCEL

    if (preferShopify) {
      try {
        let shopifyProducts = await fetchShopifyProducts()

        // Category filter
        if (category) {
          const catLower = category.toLowerCase()
          shopifyProducts = shopifyProducts.filter(p =>
            p.categorySlug.includes(catLower) || p.category.toLowerCase().includes(catLower)
          )
        }

        // Budget filter
        if (budgetMin !== null) {
          shopifyProducts = shopifyProducts.filter(p => p.price >= budgetMin!)
        }
        if (budgetMax !== null) {
          shopifyProducts = shopifyProducts.filter(p => p.price <= budgetMax!)
        }

        // Sort by featured then rating
        shopifyProducts.sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1
          return b.rating - a.rating
        })

        // If filters leave no results, fall back to all products
        if (shopifyProducts.length === 0) {
          shopifyProducts = await fetchShopifyProducts()
        }

        const recommendations = shopifyProducts.slice(0, 8).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          image: p.images?.[0] || null,
          category: p.category,
          categorySlug: p.categorySlug,
          rating: p.rating,
          reviewCount: p.reviewCount,
          description: p.description,
          tags: p.tags,
          occasions: p.occasions || [],
          recipientTypes: p.recipientTypes || [],
          deliveryEstimate: p.deliveryEstimate,
          isExternal: p.isExternal,
          affiliateUrl: p.affiliateUrl,
        }))

        // Generate a helpful message without LLM
        const occasionText = occasion ? ` for ${occasion}` : ''
        const recipientText = recipient ? ` for your ${recipient}` : ''
        const budgetText = budget ? ` within your budget` : ''
        const aiMessage = `Here are my top luxury gift recommendations${occasionText}${recipientText}${budgetText}:\n\n${recommendations.map((p, i) => `${i + 1}. ${p.name} - ₹${p.price.toLocaleString('en-IN')}${p.compareAtPrice ? ` (was ₹${p.compareAtPrice.toLocaleString('en-IN')})` : ''} | ${p.category}`).join('\n')}\n\nEach of these premium items would make a wonderful gift. Click on any product to see more details and add luxury gift wrapping at checkout!`

        return NextResponse.json({
          message: aiMessage,
          products: recommendations,
          aiSuggestions: [],
          criteria: {
            occasion: occasion || null,
            recipient: recipient || null,
            relationship: relationship || null,
            budget: budget || null,
            category: category || null,
          },
          source: 'shopify',
        })
      } catch (shopifyError) {
        console.error('[Gift Recommend] Shopify fetch failed:', shopifyError)
        return NextResponse.json(
          { error: 'Failed to get recommendations. Please try again later.' },
          { status: 500 }
        )
      }
    }

    // ── DB-first path (local development) ─────────────────────────────
    const where: Record<string, unknown> = {}

    // Budget filter
    if (budgetMin !== null || budgetMax !== null) {
      where.price = {}
      if (budgetMin !== null) (where.price as Record<string, unknown>).gte = budgetMin
      if (budgetMax !== null) (where.price as Record<string, unknown>).lte = budgetMax
    }

    // Category filter
    if (category) {
      const categoryRecord = await db.category.findFirst({
        where: {
          OR: [
            { slug: { contains: category.toLowerCase() } },
            { name: { contains: category } },
          ],
        },
      })
      if (categoryRecord) {
        where.categoryId = categoryRecord.id
      }
    }

    // Only show products in stock
    where.stock = { gt: 0 }

    // Get matching products from DB
    const localProducts = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
      take: 50,
    })

    // Filter by occasion/recipient/relationship using JSON fields
    let filtered = localProducts
    if (occasion) {
      filtered = filtered.filter((p) => {
        const occasions = JSON.parse(p.occasions || '[]') as string[]
        return occasions.some((o) => o.toLowerCase().includes(occasion.toLowerCase()))
      })
    }
    if (recipient) {
      filtered = filtered.filter((p) => {
        const recipients = JSON.parse(p.recipientTypes || '[]') as string[]
        return recipients.some((r) => r.toLowerCase().includes(recipient.toLowerCase()))
      })
    }
    if (relationship) {
      filtered = filtered.filter((p) => {
        const relationships = JSON.parse(p.relationships || '[]') as string[]
        return relationships.some((r) => r.toLowerCase().includes(relationship.toLowerCase()))
      })
    }

    // If no products match the specific filters, fall back to broader results
    if (filtered.length === 0) {
      filtered = localProducts
    }

    // Format local product recommendations
    const recommendations = filtered.slice(0, 8).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      image: JSON.parse(p.images || '[]')[0] || null,
      category: p.category.name,
      categorySlug: p.category.slug,
      rating: p.rating,
      reviewCount: p.reviewCount,
      description: p.description,
      tags: JSON.parse(p.tags || '[]'),
      occasions: JSON.parse(p.occasions || '[]'),
      recipientTypes: JSON.parse(p.recipientTypes || '[]'),
      deliveryEstimate: p.deliveryEstimate,
      isExternal: p.isExternal,
      affiliateUrl: p.affiliateUrl,
    }))

    // ── Use LLM for AI-powered suggestions ────────────────────────────
    let aiMessage = ''
    let aiSuggestions: Array<{ name: string; reason: string; priceRange: string }> = []

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const productContext = recommendations
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} - ₹${p.price}${p.compareAtPrice ? ` (was ₹${p.compareAtPrice})` : ''} | ${p.category} | Rating: ${p.rating}/5 (${p.reviewCount} reviews) | ${p.description.slice(0, 120)}...${p.occasions.length ? ` | Occasions: ${p.occasions.join(', ')}` : ''}${p.recipientTypes.length ? ` | For: ${p.recipientTypes.join(', ')}` : ''}`
        )
        .join('\n')

      const systemPrompt = `You are the AI Gift Concierge for "3 BOXES LUXURY", a premium luxury e-commerce store specializing in jewelry, sarees, watches, fragrances, and luxury accessories. You help customers find the perfect gift. Be warm, sophisticated, and insightful. Reference product numbers when recommending from the catalog. Also suggest 2-3 additional gift ideas that may not be in our current catalog but would complement the occasion. Format your response clearly with sections for catalog picks and AI suggestions.`

      const userPrompt = `Help me find the perfect gift!
${message ? `Customer message: "${message}"` : ''}
${occasion ? `Occasion: ${occasion}` : ''}
${recipient ? `Recipient: ${recipient}` : ''}
${relationship ? `Relationship: ${relationship}` : ''}
${budget ? `Budget: ${budget}` : ''}
${category ? `Category preference: ${category}` : ''}

Available products from our luxury catalog:
${productContext || 'No specific products found matching criteria, but I can offer personalized guidance.'}

Please provide:
1. Personalized gift recommendations from our catalog (reference product numbers)
2. 2-3 AI-suggested gift ideas that may not be in our catalog but would be perfect for this occasion
3. Brief explanation of why each gift is a great choice
4. Gift wrapping or presentation tips`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })

      aiMessage = completion.choices?.[0]?.message?.content || ''

      // Try to extract AI suggestions from the response
      // This is a best-effort parse of the LLM output
      const suggestionPattern = /(?:suggestion|idea|also consider|alternatively)[:\s]*([^.\n]+)/gi
      let match
      while ((match = suggestionPattern.exec(aiMessage)) !== null) {
        if (aiSuggestions.length < 3) {
          aiSuggestions.push({
            name: match[1].trim(),
            reason: 'AI recommended based on your criteria',
            priceRange: budget ? `Within your budget` : 'Varies',
          })
        }
      }
    } catch (llmError) {
      console.error('LLM error, falling back to basic response:', llmError)
      // Fallback response without LLM
      const occasionText = occasion ? ` for ${occasion}` : ''
      const recipientText = recipient ? ` for your ${recipient}` : ''
      const budgetText = budget ? ` within your budget` : ''
      aiMessage = `Here are my top luxury gift recommendations${occasionText}${recipientText}${budgetText}:\n\n${recommendations.map((p, i) => `${i + 1}. ${p.name} - ₹${p.price}${p.compareAtPrice ? ` (was ₹${p.compareAtPrice})` : ''} | ${p.category} | ${p.rating}/5⭐`).join('\n')}\n\nEach of these premium items would make a wonderful gift. Click on any product to see more details and add luxury gift wrapping at checkout!`
    }

    return NextResponse.json({
      message: aiMessage,
      products: recommendations,
      aiSuggestions,
      criteria: {
        occasion: occasion || null,
        recipient: recipient || null,
        relationship: relationship || null,
        budget: budget || null,
        category: category || null,
      },
    })
  } catch (error) {
    console.error('Gift recommend error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
