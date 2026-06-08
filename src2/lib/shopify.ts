/**
 * Shopify Admin API Client
 * 
 * Provides fallback data fetching when the database is unavailable.
 * Uses the Shopify Admin REST API to fetch products and collections.
 */

// ─── Configuration ───

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '3boxesluxury-2.myshopify.com'
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || 'YOUR_SHOPIFY_ADMIN_TOKEN'
const SHOPIFY_API_VERSION = '2024-10'
const SHOPIFY_API_BASE = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`

// ─── Shopify Raw Types ───

interface ShopifyImage {
  id: number
  product_id: number
  position: number
  created_at: string
  updated_at: string
  alt: string | null
  width: number
  height: number
  src: string
  variant_ids: number[]
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku: string | null
  position: number
  inventory_policy: string
  compare_at_price: string | null
  fulfillment_service: string
  inventory_management: string | null
  option1: string | null
  option2: string | null
  option3: string | null
  created_at: string
  updated_at: string
  taxable: boolean
  barcode: string | null
  grams: number
  image_id: number | null
  weight: number
  weight_unit: string
  inventory_quantity: number
  requires_shipping: boolean
}

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at: string | null
  template_suffix: string | null
  published_scope: string
  tags: string
  status: string
  variants: ShopifyVariant[]
  options: Array<{
    id: number
    name: string
    position: number
    values: string[]
  }>
  images: ShopifyImage[]
  image: ShopifyImage | null
}

interface ShopifyCollection {
  id: number
  handle: string
  title: string
  updated_at: string
  body_html: string
  published_at: string | null
  sort_order: string
  template_suffix: string | null
  published_scope: string
  image?: {
    created_at: string
    alt: string | null
    width: number
    height: number
    src: string
  } | null
}

interface ShopifyCollect {
  id: number
  collection_id: number
  product_id: number
  created_at: string
  updated_at: string
  position: number
  sort_value: string
}

// ─── Transformed Types (matching Prisma API output) ───

export interface ShopifyProductTransformed {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAtPrice: number | null
  images: string[]
  category: string
  categorySlug: string
  stock: number
  rating: number
  reviewCount: number
  featured: boolean
  tags: string[]
  occasions: string[]
  recipientTypes: string[]
  relationships: string[]
  deliveryEstimate: string | null
  platform: string | null
  isExternal: boolean
  sourceUrl: string | null
  affiliateUrl: string | null
  platformLogo: string | null
  commission: number | null
  syncStatus: string
}

export interface ShopifyCategoryTransformed {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productCount: number
  parentId: string | null
  order: number
  children: ShopifyCategoryTransformed[]
}

// ─── In-memory cache ───

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let productsCache: CacheEntry<ShopifyProductTransformed[]> | null = null
let categoriesCache: CacheEntry<ShopifyCategoryTransformed[]> | null = null

function isCacheValid<T>(cache: CacheEntry<T> | null): cache is CacheEntry<T> {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL
}

// ─── API Fetch Helper ───

async function shopifyFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SHOPIFY_API_BASE}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes at Next.js level
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Shopify API error (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

// ─── Slug Helper ───

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Category Mapping ───

const PRODUCT_TYPE_TO_CATEGORY: Record<string, { name: string; slug: string }> = {
  // Primary categories — slugs MUST match Shopify collection handles to avoid duplicates
  'jewelry': { name: 'Jewelry', slug: 'jewelry' },
  'jewellery': { name: 'Jewelry', slug: 'jewelry' },
  'fine jewellery': { name: 'Jewelry', slug: 'jewelry' },
  'fashion jewellery': { name: 'Jewelry', slug: 'jewelry' },
  'costume jewellery': { name: 'Jewelry', slug: 'jewelry' },
  // Sub-categories of jewelry — all map to parent Jewelry category
  'rings': { name: 'Jewelry', slug: 'jewelry' },
  'ring': { name: 'Jewelry', slug: 'jewelry' },
  'necklaces': { name: 'Jewelry', slug: 'jewelry' },
  'necklace': { name: 'Jewelry', slug: 'jewelry' },
  'pendants': { name: 'Jewelry', slug: 'jewelry' },
  'pendant': { name: 'Jewelry', slug: 'jewelry' },
  'earrings': { name: 'Jewelry', slug: 'jewelry' },
  'earring': { name: 'Jewelry', slug: 'jewelry' },
  'bracelets': { name: 'Jewelry', slug: 'jewelry' },
  'bracelet': { name: 'Jewelry', slug: 'jewelry' },
  'bangles': { name: 'Jewelry', slug: 'jewelry' },
  'bangle': { name: 'Jewelry', slug: 'jewelry' },
  'chains': { name: 'Jewelry', slug: 'jewelry' },
  'chain': { name: 'Jewelry', slug: 'jewelry' },
  'anklets': { name: 'Jewelry', slug: 'jewelry' },
  'anklet': { name: 'Jewelry', slug: 'jewelry' },
  'brooches': { name: 'Jewelry', slug: 'jewelry' },
  'brooch': { name: 'Jewelry', slug: 'jewelry' },
  // Other primary categories
  'watches': { name: 'Watches', slug: 'watches' },
  'watch': { name: 'Watches', slug: 'watches' },
  'sarees': { name: 'Sarees', slug: 'sarees' },
  'saree': { name: 'Sarees', slug: 'sarees' },
  "men's shirts": { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts-t-shirts' },
  "men's shirts & t-shirts": { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts-t-shirts' },
  'mens shirts': { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts-t-shirts' },
  'shirts': { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts-t-shirts' },
  'fashion': { name: 'Fashion', slug: 'fashion' },
  'fragrances': { name: 'Fragrances', slug: 'fragrances' },
  'fragrance': { name: 'Fragrances', slug: 'fragrances' },
  'perfume': { name: 'Fragrances', slug: 'fragrances' },
  'leather goods': { name: 'Leather Goods', slug: 'leather-goods' },
  'leather': { name: 'Leather Goods', slug: 'leather-goods' },
  'home & living': { name: 'Home & Living', slug: 'home-living' },
  'home living': { name: 'Home & Living', slug: 'home-living' },
  'home': { name: 'Home & Living', slug: 'home-living' },
  'couple friendly gifts': { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts' },
  'couple gifts': { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts' },
  'romantic gifts': { name: 'Romantic Gifts', slug: 'romantic-gifts' },
  'romantic': { name: 'Romantic Gifts', slug: 'romantic-gifts' },
  'toys': { name: 'Toys', slug: 'toys' },
  'toy': { name: 'Toys', slug: 'toys' },
  'gift sets': { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts' },
  'gift set': { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts' },
  'gift box': { name: 'Romantic Gifts', slug: 'romantic-gifts' },
  'gift boxes': { name: 'Romantic Gifts', slug: 'romantic-gifts' },
  'accessories': { name: 'Fashion', slug: 'fashion' },
  'accessory': { name: 'Fashion', slug: 'fashion' },
  // Office categories
  'corporate gifts': { name: 'Corporate Gifts', slug: 'corporate-gifts' },
  'corporate gift': { name: 'Corporate Gifts', slug: 'corporate-gifts' },
  'office': { name: 'Office', slug: 'corporate-gifts' },
  'stationery': { name: 'Stationery', slug: 'stationery' },
  'desk accessories': { name: 'Desk Accessories', slug: 'office-desk' },
}

function getCategoryForProductType(productType: string): { name: string; slug: string } {
  if (!productType) {
    return { name: 'Uncategorized', slug: 'uncategorized' }
  }

  const lower = productType.toLowerCase().trim()

  // Direct match
  if (PRODUCT_TYPE_TO_CATEGORY[lower]) {
    return PRODUCT_TYPE_TO_CATEGORY[lower]
  }

  // Partial match
  for (const [key, value] of Object.entries(PRODUCT_TYPE_TO_CATEGORY)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value
    }
  }

  // Create category from product type
  return { name: productType, slug: toSlug(productType) }
}

// ─── Category-based Fallback Images ───
// When Shopify products have no images, assign category-appropriate placeholders.

const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  // Primary categories — slugs match Shopify collection handles
  jewelry: [
    '/images/products/jewelry-1.jpg',
    '/images/products/jewelry-2.jpg',
    '/images/products/jewelry-3.jpg',
    '/images/products/jewelry-4.jpg',
    '/images/products/jewelry-5.jpg',
    '/images/products/jewelry-6.jpg',
    '/images/products/jewelry-7.jpg',
    '/images/products/jewelry-8.jpg',
    '/images/products/jewelry-9.jpg',
    '/images/products/jewelry-10.jpg',
    '/images/products/jewelry-1-alt.jpg',
  ],
  watches: [
    '/images/products/watch-1.jpg',
    '/images/products/watch-2.jpg',
    '/images/products/watch-3.jpg',
    '/images/products/watch-4.jpg',
    '/images/products/watch-1-alt.jpg',
    '/images/products/watch-2-alt.jpg',
  ],
  sarees: [
    '/images/products/saree-1.jpg',
    '/images/products/saree-2.jpg',
    '/images/products/saree-3.jpg',
    '/images/products/saree-4.jpg',
    '/images/products/saree-5.jpg',
    '/images/products/saree-6.jpg',
    '/images/products/saree-7.jpg',
    '/images/products/saree-8.jpg',
    '/images/products/saree-9.jpg',
    '/images/products/saree-10.jpg',
  ],
  'mens-shirts-t-shirts': [
    '/images/products/mens-shirt-1.jpg',
    '/images/products/mens-shirt-2.jpg',
    '/images/products/mens-shirt-3.jpg',
    '/images/products/mens-shirt-4.jpg',
    '/images/products/mens-shirt-5.jpg',
    '/images/products/mens-shirt-6.jpg',
    '/images/products/mens-shirt-7.jpg',
    '/images/products/mens-shirt-8.jpg',
    '/images/products/mens-shirt-9.jpg',
    '/images/products/mens-shirt-10.jpg',
  ],
  fashion: [
    '/images/products/fashion-1.jpg',
    '/images/products/fashion-2.jpg',
    '/images/products/fashion-3.jpg',
    '/images/products/fashion-1-alt.jpg',
  ],
  fragrances: [
    '/images/products/fragrance-1.jpg',
    '/images/products/fragrance-2.jpg',
    '/images/products/fragrance-3.jpg',
    '/images/products/fragrance-1-alt.jpg',
  ],
  'leather-goods': [
    '/images/products/leather-1.jpg',
    '/images/products/leather-2.jpg',
    '/images/products/leather-3.jpg',
    '/images/products/leather-1-alt.jpg',
    '/images/products/leather-bag-taupe.jpg',
  ],
  'home-living': [
    '/images/products/home-1.jpg',
    '/images/products/home-2.jpg',
    '/images/products/home-3.jpg',
    '/images/products/home-1-alt.jpg',
  ],
  'couple-friendly-gifts': [
    '/images/products/couple-1.jpg',
    '/images/products/couple-2.jpg',
    '/images/products/couple-3.jpg',
  ],
  'romantic-gifts': [
    '/images/products/romantic-1.jpg',
    '/images/products/romantic-2.jpg',
    '/images/products/romantic-3.jpg',
  ],
  toys: [
    '/images/products/toy-1.jpg',
    '/images/products/toy-2.jpg',
    '/images/products/toy-3.jpg',
  ],
  'corporate-gifts': [
    '/images/products/corp-gift-1.jpg',
    '/images/products/corp-gift-2.jpg',
    '/images/products/corp-gift-3.jpg',
    '/images/products/corp-gift-4.jpg',
    '/images/products/corp-gift-5.jpg',
  ],
  'office-desk': [
    '/images/products/desk-1.jpg',
    '/images/products/desk-2.jpg',
    '/images/products/desk-3.jpg',
    '/images/products/desk-4.jpg',
    '/images/products/desk-5.jpg',
  ],
  'office-stationery': [
    '/images/products/stationery-1.jpg',
    '/images/products/stationery-2.jpg',
    '/images/products/stationery-3.jpg',
    '/images/products/stationery-4.jpg',
    '/images/products/stationery-5.jpg',
  ],
  'new-arrivals': [
    '/images/products/new-arrival-1.jpg',
    '/images/products/new-arrival-2.jpg',
    '/images/products/new-arrival-3.jpg',
    '/images/products/new-arrival-4.jpg',
    '/images/products/new-arrival-5.jpg',
    '/images/products/new-arrival-6.jpg',
  ],
  uncategorized: [
    '/images/placeholder.jpg',
  ],
}

// Deterministic image selection based on product ID so the same product always gets the same image
function getFallbackImages(categorySlug: string, productId: number): string[] {
  const pool = CATEGORY_FALLBACK_IMAGES[categorySlug]
  if (pool && pool.length > 0) {
    // Use product ID to deterministically pick 1-2 images from the pool
    const idx = productId % pool.length
    const images = [pool[idx]]
    if (pool.length > 1) {
      const secondIdx = (productId + 1) % pool.length
      if (secondIdx !== idx) images.push(pool[secondIdx])
    }
    return images
  }
  return ['/images/placeholder.jpg']
}

// ─── Public API ───

/**
 * Fetch all products from Shopify Admin API and transform to match the Prisma API format.
 * Results are cached for 5 minutes.
 *
 * Handles Link-header pagination so stores with >250 products are fully fetched.
 * Deduplicates by both Shopify numeric ID and product handle/slug to prevent
 * visual duplicates when the same product appears with different IDs.
 */
export async function fetchShopifyProducts(): Promise<ShopifyProductTransformed[]> {
  if (isCacheValid(productsCache)) {
    return productsCache.data
  }

  try {
    // ── Paginated fetch using Shopify Link header ──
    // The Admin REST API returns a `Link` header with a `rel="next"` URL when
    // more pages exist.  We follow every page until no next link is present.
    const allRawProducts: ShopifyProduct[] = []
    let nextUrl: string | null =
      `${SHOPIFY_API_BASE}/products.json?limit=250&status=active`

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Shopify API error (${response.status}): ${text}`)
      }

      const data: { products: ShopifyProduct[] } = await response.json()
      const page = data.products || []
      allRawProducts.push(...page)

      // Parse Link header for next page
      const linkHeader = response.headers.get('link') || ''
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      nextUrl = nextMatch ? nextMatch[1] : null
    }

    // ── Deduplicate raw products by Shopify numeric ID ──
    const seenIds = new Set<number>()
    const uniqueById = allRawProducts.filter(p => {
      if (seenIds.has(p.id)) return false
      seenIds.add(p.id)
      return true
    })

    // ── Transform to app format ──
    const transformed: ShopifyProductTransformed[] = uniqueById.map((p) => {
      const firstVariant = p.variants?.[0]
      const category = getCategoryForProductType(p.product_type)
      const tags = p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

      return {
        id: `shopify-${p.id}`,
        name: p.title,
        slug: p.handle || toSlug(p.title),
        description: p.body_html?.replace(/<[^>]*>/g, '').trim() || '',
        price: firstVariant ? parseFloat(firstVariant.price) || 0 : 0,
        compareAtPrice: firstVariant?.compare_at_price
          ? parseFloat(firstVariant.compare_at_price)
          : null,
        images: (p.images && p.images.length > 0)
          ? p.images.map((img) => img.src)
          : getFallbackImages(category.slug, p.id),
        category: category.name,
        categorySlug: category.slug,
        stock: firstVariant?.inventory_quantity ?? 0,
        rating: 0,
        reviewCount: 0,
        featured: false,
        tags,
        occasions: [],
        recipientTypes: [],
        relationships: [],
        deliveryEstimate: '3-5 business days',
        platform: null,
        isExternal: false,
        sourceUrl: null,
        affiliateUrl: null,
        platformLogo: null,
        commission: null,
        syncStatus: 'active',
      }
    })

    // ── Deduplicate transformed products by slug/handle ──
    // If the same product handle appears with different Shopify IDs (e.g. from
    // a re-sync that created a duplicate listing), keep only the first one.
    const seenSlugs = new Set<string>()
    const deduped = transformed.filter(p => {
      if (seenSlugs.has(p.slug)) return false
      seenSlugs.add(p.slug)
      return true
    })

    if (deduped.length < transformed.length) {
      console.warn(
        `[Shopify] Deduplicated ${transformed.length - deduped.length} products with duplicate slugs`
      )
    }

    productsCache = { data: deduped, timestamp: Date.now() }
    return deduped
  } catch (error) {
    console.error('[Shopify] Failed to fetch products:', error)
    throw error
  }
}

/**
 * v1.2 Category Hierarchy Mapping
 * Maps Shopify flat category slugs to parent categories with display order.
 */
const CATEGORY_HIERARCHY: {
  parentSlug: string
  parentName: string
  order: number
  childSlugs: { slug: string; name: string; order: number }[]
}[] = [
  {
    parentSlug: 'couple',
    parentName: 'Couple',
    order: 1,
    childSlugs: [
      { slug: 'couple-friendly', name: 'Couple Friendly', order: 1 },
      { slug: 'romantic-gifts', name: 'Romantic Gifts', order: 2 },
    ],
  },
  {
    parentSlug: 'men',
    parentName: 'Men',
    order: 2,
    childSlugs: [
      { slug: 'men-accessories', name: 'Accessories', order: 1 },
      { slug: 'men-shirts', name: 'Shirts', order: 2 },
      { slug: 'men-tshirts', name: 'T-Shirts & Polos', order: 3 },
      { slug: 'men-fragrances', name: 'Fragrances', order: 4 },
      { slug: 'men-watches', name: 'Watches', order: 5 },
      { slug: 'men-leather', name: 'Leather Goods', order: 6 },
    ],
  },
  {
    parentSlug: 'women',
    parentName: 'Women',
    order: 3,
    childSlugs: [
      { slug: 'women-jewelry', name: 'Jewelry', order: 1 },
      { slug: 'women-sarees', name: 'Sarees', order: 2 },
      { slug: 'women-fashion', name: 'Fashion', order: 3 },
      { slug: 'women-fragrances', name: 'Fragrances', order: 4 },
      { slug: 'women-accessories', name: 'Accessories', order: 5 },
    ],
  },
  {
    parentSlug: 'kids',
    parentName: 'Kids',
    order: 4,
    childSlugs: [
      { slug: 'kids-toys', name: 'Toys & Games', order: 1 },
      { slug: 'kids-fashion', name: 'Kids Fashion', order: 2 },
    ],
  },
  {
    parentSlug: 'home',
    parentName: 'Home',
    order: 5,
    childSlugs: [
      { slug: 'home-decor', name: 'Home Décor', order: 1 },
      { slug: 'home-candles', name: 'Candles & Fragrances', order: 2 },
      { slug: 'home-living', name: 'Living', order: 3 },
    ],
  },
  {
    parentSlug: 'office',
    parentName: 'Office',
    order: 6,
    childSlugs: [
      { slug: 'office-corporate-gifts', name: 'Corporate Gifts', order: 1 },
      { slug: 'office-desk', name: 'Desk Accessories', order: 2 },
      { slug: 'office-stationery', name: 'Stationery', order: 3 },
    ],
  },
  {
    parentSlug: 'new-arrivals',
    parentName: 'New Arrivals',
    order: 7,
    childSlugs: [],
  },
]

/**
 * Fetch categories derived from Shopify collections and product types.
 * Results are cached for 5 minutes.
 *
 * v1.2: Organizes flat Shopify categories into the hierarchical menu structure
 * (Couple, Men, Women, Kids, Home, Office, New Arrivals) with subcategories.
 */
export async function fetchShopifyCategories(): Promise<ShopifyCategoryTransformed[]> {
  if (isCacheValid(categoriesCache)) {
    return categoriesCache.data
  }

  try {
    // Fetch both custom and smart collections
    const [customData, smartData, products] = await Promise.all([
      shopifyFetch<{ custom_collections: ShopifyCollection[] }>(
        '/custom_collections.json',
        { limit: '250' }
      ).catch(() => ({ custom_collections: [] })),
      shopifyFetch<{ smart_collections: ShopifyCollection[] }>(
        '/smart_collections.json',
        { limit: '250' }
      ).catch(() => ({ smart_collections: [] })),
      fetchShopifyProducts().catch(() => [] as ShopifyProductTransformed[]),
    ])

    const customCollections = customData.custom_collections || []
    const smartCollections = smartData.smart_collections || []

    // Build flat category map — collections are the primary source
    const flatCategoryMap = new Map<string, ShopifyCategoryTransformed>()

    // Add categories from collections first (these are the canonical categories)
    for (const col of [...customCollections, ...smartCollections]) {
      const slug = col.handle || toSlug(col.title)
      // Skip "frontpage" / "uncategorized" — not real browsing categories
      if (slug === 'frontpage' || slug === 'uncategorized') continue
      if (!flatCategoryMap.has(slug)) {
        flatCategoryMap.set(slug, {
          id: `shopify-col-${col.id}`,
          name: col.title,
          slug,
          description: col.body_html?.replace(/<[^>]*>/g, '').trim() || null,
          image: col.image?.src || null,
          productCount: 0,
          parentId: null,
          order: 0,
          children: [],
        })
      }
    }

    // Count products per category (from product_type mapping)
    const productCountMap = new Map<string, number>()
    for (const product of products) {
      const count = productCountMap.get(product.categorySlug) || 0
      productCountMap.set(product.categorySlug, count + 1)
    }

    // Only add product-type categories if no matching collection exists
    for (const product of products) {
      if (!flatCategoryMap.has(product.categorySlug)) {
        flatCategoryMap.set(product.categorySlug, {
          id: `shopify-cat-${product.categorySlug}`,
          name: product.category,
          slug: product.categorySlug,
          description: null,
          image: null,
          productCount: 0,
          parentId: null,
          order: 0,
          children: [],
        })
      }
    }

    // Update product counts
    for (const [slug, cat] of flatCategoryMap) {
      cat.productCount = productCountMap.get(slug) || 0
    }

    // ── v1.2: Build hierarchical categories ──
    const hierarchicalCategories: ShopifyCategoryTransformed[] = []

    for (const group of CATEGORY_HIERARCHY) {
      const children: ShopifyCategoryTransformed[] = []

      for (const childDef of group.childSlugs) {
        const existing = flatCategoryMap.get(childDef.slug)
        if (existing && existing.productCount > 0) {
          children.push({
            ...existing,
            parentId: `shopify-parent-${group.parentSlug}`,
            order: childDef.order,
            children: [],
          })
        } else if (existing) {
          // Include even with 0 products if it came from a collection
          children.push({
            ...existing,
            parentId: `shopify-parent-${group.parentSlug}`,
            order: childDef.order,
            children: [],
          })
        } else {
          // Create a placeholder subcategory even without Shopify data
          children.push({
            id: `shopify-cat-${childDef.slug}`,
            name: childDef.name,
            slug: childDef.slug,
            description: null,
            image: null,
            productCount: productCountMap.get(childDef.slug) || 0,
            parentId: `shopify-parent-${group.parentSlug}`,
            order: childDef.order,
            children: [],
          })
        }
      }

      // Calculate total product count for parent
      const childrenProductCount = children.reduce((sum, c) => sum + c.productCount, 0)

      // For "New Arrivals", count products created in the last 30 days
      let newArrivalsCount = 0
      if (group.parentSlug === 'new-arrivals') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        // Count products that are recently created or tagged as new
        newArrivalsCount = products.filter(p =>
          p.tags.some(t => t.toLowerCase().includes('new')) ||
          p.featured
        ).length
        // Fallback: if no tagged products, use total product count
        if (newArrivalsCount === 0 && products.length > 0) {
          newArrivalsCount = Math.min(products.length, Math.ceil(products.length * 0.2))
        }
      }

      hierarchicalCategories.push({
        id: `shopify-parent-${group.parentSlug}`,
        name: group.parentName,
        slug: group.parentSlug,
        description: null,
        image: null,
        productCount: group.parentSlug === 'new-arrivals' ? newArrivalsCount : childrenProductCount,
        parentId: null,
        order: group.order,
        children,
      })
    }

    // Also add any flat categories that don't fit into the hierarchy
    const mappedChildSlugs = new Set(CATEGORY_HIERARCHY.flatMap(g => g.childSlugs.map(c => c.slug)))
    const mappedParentSlugs = new Set(CATEGORY_HIERARCHY.map(g => g.parentSlug))
    for (const [slug, cat] of flatCategoryMap) {
      if (!mappedChildSlugs.has(slug) && !mappedParentSlugs.has(slug) && cat.productCount > 0) {
        // This category exists in Shopify but isn't in our hierarchy — add as standalone
        hierarchicalCategories.push({
          ...cat,
          order: hierarchicalCategories.length + 1,
          children: [],
        })
      }
    }

    categoriesCache = { data: hierarchicalCategories, timestamp: Date.now() }
    return hierarchicalCategories
  } catch (error) {
    console.error('[Shopify] Failed to fetch categories:', error)
    throw error
  }
}

/**
 * Fetch products filtered by category slug from Shopify.
 */
export async function fetchShopifyProductsByCategory(
  categorySlug: string
): Promise<ShopifyProductTransformed[]> {
  const allProducts = await fetchShopifyProducts()
  return allProducts.filter((p) => p.categorySlug === categorySlug)
}

/**
 * Search Shopify products by name or description.
 */
export async function searchShopifyProducts(
  query: string
): Promise<ShopifyProductTransformed[]> {
  const allProducts = await fetchShopifyProducts()
  const lowerQuery = query.toLowerCase()
  return allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Check if Shopify API is available by making a lightweight request.
 */
export async function isShopifyAvailable(): Promise<boolean> {
  try {
    await shopifyFetch('/products/count.json')
    return true
  } catch {
    return false
  }
}

/**
 * Invalidate the Shopify cache to force fresh data on next request.
 */
export function invalidateShopifyCache(): void {
  productsCache = null
  categoriesCache = null
}
