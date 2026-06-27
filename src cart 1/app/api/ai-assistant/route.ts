import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `You are the AI Gift Recommendation Assistant for 3 BOXES GIFTS — a premium luxury gifting brand in India. You are sophisticated, warm, and knowledgeable about luxury gifts.

YOUR ROLE:
- Help customers find the perfect luxury gift by asking thoughtful questions
- Understand the occasion, recipient, relationship, budget, and preferences
- Recommend specific product categories and price ranges from our collection

OUR CATEGORIES: Jewelry, Sarees, Watches, Fashion, Leather Goods, Fragrances, Home & Living, Men's Shirts & T-Shirts, Toys & Collectibles, Romantic Gifts, Couple Gifts

OUR PRICE RANGES: Under ₹1,000 | ₹1,000–2,500 | ₹2,500–5,000 | ₹5,000–10,000 | Above ₹10,000

CONVERSATION FLOW:
1. Greet warmly and ask about the OCCASION (birthday, anniversary, wedding, diwali, valentine, housewarming, christmas, new-year, graduation, baby-shower, retirement, thank-you)
2. Ask about the RECIPIENT (for-him, for-her, for-couple, for-kids, for-parents, for-boss, for-colleague, for-friend)
3. Ask about the RELATIONSHIP (spouse, friend, parent, sibling, colleague, boss, client)
4. Ask about BUDGET / PRICE RANGE
5. Ask about any PREFERENCES (style, color, material, etc.)

WHEN YOU HAVE ENOUGH INFO (at least occasion + recipient or relationship + budget):
- Give a warm, personalized recommendation with 2-3 specific category suggestions
- Explain WHY each category is perfect for their situation
- Mention specific price ranges that fit their budget

CRITICAL RULE:
When you provide a recommendation, you MUST include a hidden filter block at the VERY END of your response (after all text). This block allows our system to filter products automatically. Format:

<!--FILTERS:{"occasion":"value","recipient":"value","relationship":"value","priceRange":"value"}-->

The filter values must match exactly:
- occasion: birthday, anniversary, wedding, diwali, valentine, housewarming, christmas, new-year, graduation, baby-shower, retirement, thank-you
- recipient: for-him, for-her, for-couple, for-kids, for-parents, for-boss, for-colleague, for-friend
- relationship: spouse, friend, parent, sibling, colleague, boss, client
- priceRange: under-1000, 1000-2500, 2500-5000, 5000-10000, above-10000

Only include fields that are known from the conversation. If a field is unknown, omit it from the JSON.

Example response:
"I'd love to help you find the perfect birthday gift for your wife! For a spouse's birthday in the ₹2,500–5,000 range, here are my top picks:

💍 **Jewelry** — A timeless necklace or elegant earrings would make her feel truly special. Our jewelry collection features stunning designs in gold and silver.

⌚ **Watches** — A luxury watch is both practical and romantic. It's a gift she'll treasure every day.

🧣 **Fashion** — A designer scarf or premium accessory adds a touch of everyday luxury.

Each of these categories has beautiful options in your budget range!

<!--FILTERS:{"occasion":"birthday","recipient":"for-her","relationship":"spouse","priceRange":"2500-5000"}-->"

Keep responses concise but warm. Use emojis sparingly for elegance. Never break character.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function createZAI(): Promise<InstanceType<typeof ZAI>> {
  return await ZAI.create()
}

function parseFilters(text: string): Record<string, string> | null {
  const match = text.match(/<!--FILTERS:(\{[^}]+\})-->/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function stripFilters(text: string): string {
  return text.replace(/<!--FILTERS:\{[^}]+\}-->/, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history } = body as { message: string; history?: ChatMessage[] }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const zai = await createZAI()

    // Build messages array for the chat completion
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // Add conversation history
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    // Add the current user message
    messages.push({ role: 'user', content: message })

    const response = await zai.chat.completions.create({
      model: 'glm-4-flash',
      messages: messages as any,
    })

    const reply = response?.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that. Could you please try again?"

    // Parse filters from the response
    const filters = parseFilters(reply)
    const cleanReply = stripFilters(reply)

    // Save recommendation to database if we have filters
    if (filters) {
      try {
        await db.aIRecommendation.create({
          data: {
            occasion: filters.occasion || null,
            recipient: filters.recipient || null,
            relationship: filters.relationship || null,
            budget: filters.priceRange || null,
            category: filters.category || null,
            query: message,
            recommendations: JSON.stringify(filters),
          },
        })
      } catch (dbErr) {
        console.error('[ai-assistant] Failed to save recommendation:', dbErr)
        // Non-critical — continue
      }
    }

    return NextResponse.json({
      reply: cleanReply,
      filters,
    })
  } catch (error) {
    console.error('[ai-assistant] API error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    )
  }
}
