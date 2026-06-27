import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

interface ScrapedProduct {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  brand?: string;
  category?: string;
  tags?: string[];
  sku?: string;
  inStock?: boolean;
}

// POST /api/product-import/scrape - Scrape product page using z-ai-web-dev-sdk page_reader + LLM
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { url, platform } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Step 1: Read the page content
    const pageData = await zai.functions.invoke('page_reader', { url });

    // Step 2: Use LLM to extract structured product data
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a product data extraction assistant for a luxury e-commerce platform called "3 BOXES LUXURY". 
Extract structured product data from the given webpage content. Return ONLY a valid JSON object with these fields:
- name: string (product name, clean and professional)
- description: string (detailed product description, well-formatted)
- price: number (current selling price in INR, numeric only)
- compareAtPrice: number or null (original/MRP price if available, otherwise null)
- images: string[] (array of FULL, ABSOLUTE image URLs found on the page - must start with http or https. Do NOT include relative URLs, data URIs, or placeholder images. Look for high-resolution product images in <img>, <source>, <picture> tags, and CSS background-image properties. For platforms like Nykaa, Myntra, Amazon, images are often in img tags with data-src or src attributes, or in JSON-LD structured data.)
- brand: string or null (brand name if available)
- category: string or null (product category like "Watches", "Jewelry", "Fashion", "Sarees", "Fragrance", "Home Decor", "Mens Shirts", "Leather", "Toys", "Romantic", "Couple")
- tags: string[] (relevant tags for the product)
- sku: string or null (SKU if available)
- inStock: boolean (whether the product appears to be in stock)

IMPORTANT FOR IMAGES:
- Only include COMPLETE URLs starting with http:// or https://
- Include the LARGEST/HIGHEST QUALITY version of each image
- Exclude thumbnails, icons, logos, and UI elements
- Exclude data: URIs and placeholder images
- If you find image URLs starting with //, prefix them with https:
- Look in these locations: <img src>, <img data-src>, <source srcset>, JSON-LD "image" field, og:image meta tags

If you cannot find a field, use null. For prices, extract the numeric value only (no currency symbols).
Return ONLY the JSON object, no markdown or explanation.`,
        },
        {
          role: 'user',
          content: `Extract product data from this webpage content:\n\nURL: ${url}\nPlatform: ${platform || 'unknown'}\n\nPage Content:\n${pageData}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion.choices?.[0]?.message?.content || '';
    
    // Parse the JSON from the LLM response
    let productData: ScrapedProduct;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/```\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      productData = JSON.parse(jsonStr.trim());
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse product data from page', rawContent: content },
        { status: 422 }
      );
    }

    return NextResponse.json({
      sourceUrl: url,
      platform: platform || null,
      scrapedAt: new Date().toISOString(),
      product: productData,
    });
  } catch (err) {
    console.error('Error scraping product:', err);
    return NextResponse.json({ error: 'Failed to scrape product page' }, { status: 500 });
  }
}
