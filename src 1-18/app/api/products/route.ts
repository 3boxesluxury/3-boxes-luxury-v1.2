import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  fetchShopifyProducts,
  searchShopifyProducts,
  type ShopifyProductTransformed,
} from '@/lib/shopify'

// Platform slug to logo URL mapping
const PLATFORM_LOGO_MAP: Record<string, string> = {
  myntra: '/logos/myntra.png',
  nykaa: '/logos/nykaa.png',
  amazon: '/logos/amazon.png',
  flipkart: '/logos/flipkart.png',
  caratlane: '/logos/caratlane.png',
  tanishq: '/logos/tanishq.png',
  bluestone: '/logos/bluestone.png',
  voylla: '/logos/voylla.png',
}

// ─── Category slug aliases ───
// Maps header sub-menu slugs → actual DB category slugs.
// NO FALLBACKS: if a category has no matching DB slug, the array is empty
// and the API will return "No products found" (honest behavior).
const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  // ─── Men sub-categories → DB slugs ───
  'men-accessories':   ['men-gift-hamper', 'mens-shirts'],     // leather goods, wallets, belts → men-gift-hamper
  'men-shirts':        ['mens-shirts'],                        // DB slug is 'mens-shirts' (not 'men-shirts')
  'men-tshirts':       ['mens-shirts'],                        // same DB category as shirts
  'men-fragrances':    ['fragrances'],                         // perfumes
  'men-watches':       ['mens-shirts', 'men-gift-hamper'],     // watches may be in mens-shirts or gift hampers
  'men-leather':       ['men-gift-hamper'],                    // leather goods → men-gift-hamper

  // ─── Women sub-categories → DB slugs ───
  'women-jewelry':     ['jewellery'],
  'women-sarees':      ['sarees'],                             // DB slug is 'sarees'
  'women-fashion':     ['fashion'],                             // DB slug is 'fashion'
  'women-fragrances':  ['fragrances'],
  'women-accessories': ['jewellery', 'fashion'],                // accessories may be in jewellery or fashion

  // ─── Kids sub-categories → DB slugs ───
  'kids-toys':         ['kids-fashion'],
  'kids-fashion':      ['kids-fashion'],
  'kids-shirts':       ['kids-fashion'],
  'kids-dresses':      ['kids-fashion'],

  // ─── Home sub-categories → DB slugs ───
  'home-decor':        ['home-decor'],
  'home-candles':      ['scented-candles'],  // Removed 'fragrances' to prevent Men's perfumes from showing
  'home-living':       ['home-decor'],  // Removed 'scented-candles' to keep Living and Candles separate

  // ─── Couple sub-categories → DB slugs ───
  'couple-friendly':   ['romantic-gifts'],

  // ─── Office sub-categories → DB slugs ───
  'office-corporate-gifts': ['corporate-gifts'],
  'office-desk':       ['office-desk'],
  'office-stationery': ['office-stationery'],

  // ─── Legacy/alternate mappings (back-compat) ───
  'romantic-gifts':    ['romantic-gifts'],
  'corporate-gifts':   ['corporate-gifts'],
  'fragrances':        ['fragrances'],
  'jewellery':         ['jewellery'],
  'jewelry':           ['jewellery'],
  'scented-candles':   ['scented-candles'],
  'beauty':            ['beauty'],
  'gift-sets':         ['gift-sets'],
  'birthday-gifts':    ['birthday-gifts'],
  'travel-products':   ['travel-products'],
  'men-gift-hamper':   ['men-gift-hamper'],
  'men-grooming-kit':  ['men-grooming-kit'],
  'mens-shirts':       ['mens-shirts'],                        // DB slug self-mapping
  'sarees':            ['sarees'],
  'fashion':           ['fashion'],
  'kids-fashion':      ['kids-fashion'],
}

// v1.2: Parent category → child category slug mapping
// When a parent category is selected, show products from all its subcategories.
// Only ACTUAL DB slugs are included (no fallbacks).
const PARENT_CATEGORY_CHILDREN: Record<string, string[]> = {
  'couple':       ['couple-friendly', 'romantic-gifts'],
  'men':          ['men-accessories', 'men-fragrances', 'men-leather', 'men-gift-hamper', 'men-grooming-kit', 'fragrances', 'mens-shirts'],
  'women':        ['women-jewelry', 'women-fragrances', 'jewellery', 'sarees', 'fashion'],  // Removed 'fragrances' to prevent Men's perfumes from showing
  'kids':         ['kids-toys', 'kids-fashion', 'kids-shirts', 'kids-dresses'],
  'home':         ['home-decor', 'home-candles', 'home-living', 'scented-candles'],  // Removed 'fragrances' to prevent Men's perfumes from showing
  'office':       ['office-corporate-gifts', 'office-desk', 'office-stationery', 'corporate-gifts'],
  'new-arrivals': [],  // Special: handled by createdAt filter (30 days)
}

/**
 * Resolve a category slug to all its equivalent slugs (including itself).
 * E.g. "mens-shirts" → ["mens-shirts-t-shirts", "mens-shirts"]
 * v1.2: Also expands parent categories (e.g. "men" → ["men", "mens-shirts-t-shirts", "watches", ...])
 */
function resolveCategorySlugs(slug: string): string[] {
  const aliases = [slug]
  // Expand aliases
  for (const [canonical, alts] of Object.entries(CATEGORY_SLUG_ALIASES)) {
    if (canonical === slug) {
      aliases.push(...alts)
    } else if (alts.includes(slug)) {
      aliases.push(canonical)
    }
  }
  // Expand parent categories to include all child slugs
  const childSlugs = PARENT_CATEGORY_CHILDREN[slug]
  if (childSlugs && childSlugs.length > 0) {
    aliases.push(...childSlugs)
  }
  return [...new Set(aliases)] // deduplicate
}

// ─── Product deduplication ───
// Ensures the API never returns duplicate products regardless of source.
// Deduplicates by id first, then by slug, then by name (case-insensitive).

function deduplicateProducts<T extends { id: string; slug: string; name: string }>(products: T[]): T[] {
  const seenIds = new Set<string>()
  const seenSlugs = new Set<string>()
  const seenNames = new Set<string>()

  return products.filter((p) => {
    // Dedupe by id
    if (seenIds.has(p.id)) return false
    seenIds.add(p.id)

    // Dedupe by slug (handles same product from different sources)
    const slugLower = p.slug.toLowerCase()
    if (seenSlugs.has(slugLower)) return false
    seenSlugs.add(slugLower)

    // Dedupe by name (handles visual duplicates with different IDs/slugs)
    const nameLower = p.name.toLowerCase().trim()
    if (seenNames.has(nameLower)) return false
    seenNames.add(nameLower)

    return true
  })
}

/**
 * Apply filters, sorting, and pagination to Shopify fallback products
 * to match the same query semantics as the Prisma-based route.
 */
function filterAndPaginateShopifyProducts(
  products: ShopifyProductTransformed[],
  params: {
    category?: string | null
    search?: string | null
    minPrice?: number | null
    maxPrice?: number | null
    sort: string
    page: number
    limit: number
    platform?: string | null
    source?: string | null
    isExternalParam?: string | null
    occasion?: string | null
    recipient?: string | null
    relationship?: string | null
  }
) {
  let filtered = [...products]

  // Category filter — resolve aliases so both DB and Shopify slugs match
  if (params.category) {
    const allowedSlugs = resolveCategorySlugs(params.category)
    filtered = filtered.filter((p) => allowedSlugs.includes(p.categorySlug))
  }

  // Search filter
  if (params.search) {
    const q = params.search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  // Price range filter
  if (params.minPrice != null) {
    filtered = filtered.filter((p) => p.price >= (params.minPrice ?? 0))
  }
  if (params.maxPrice != null) {
    filtered = filtered.filter((p) => p.price <= (params.maxPrice ?? Infinity))
  }

  // Platform filter
  if (params.platform) {
    filtered = filtered.filter((p) => p.platform === params.platform)
  }

  // Source filter
  if (params.source === 'own') {
    filtered = filtered.filter((p) => !p.isExternal)
  } else if (params.source === 'external') {
    filtered = filtered.filter((p) => p.isExternal)
  }

  // isExternal filter
  if (params.isExternalParam === 'true') {
    filtered = filtered.filter((p) => p.isExternal)
  } else if (params.isExternalParam === 'false') {
    filtered = filtered.filter((p) => !p.isExternal)
  }

  // Occasion filter
  if (params.occasion) {
    filtered = filtered.filter((p) => p.occasions.includes(params.occasion!))
  }

  // Recipient filter
  if (params.recipient) {
    filtered = filtered.filter((p) => p.recipientTypes.includes(params.recipient!))
  }

  // Relationship filter
  if (params.relationship) {
    filtered = filtered.filter((p) => p.relationships.includes(params.relationship!))
  }

  // Sorting
  switch (params.sort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      filtered.sort((a, b) => b.rating - a.rating)
      break
    case 'featured':
      filtered.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return 0
      })
      break
    case 'newest':
    default:
      // Shopify products don't have createdAt in our transformed format,
      // so we keep original order (which is Shopify's default: created_at desc)
      break
  }

  // Pagination
  const total = filtered.length
  const skip = (params.page - 1) * params.limit
  const paginated = filtered.slice(skip, skip + params.limit)

  return {
    products: paginated,
    total,
    page: params.page,
    totalPages: Math.ceil(total / params.limit),
  }
}

// ─── Static fallback products for categories not covered by Shopify ───
// These are injected when the Shopify path returns 0 results for Office/New Arrivals
const STATIC_OFFICE_PRODUCTS: ShopifyProductTransformed[] = [
  {
    id: 'static-corp-gift-1',
    name: 'Executive Gift Hamper',
    slug: 'executive-gift-hamper',
    description: 'A premium corporate gift hamper featuring artisan chocolates, a leather-bound planner, premium tea collection, and a personalized thank-you card. Elegantly packaged in a matte black box with gold foil branding.',
    price: 1800,
    compareAtPrice: 2200,
    images: ['/images/products/corp-gift-1.jpg'],
    category: 'Corporate Gifts',
    categorySlug: 'office-corporate-gifts',
    stock: 25,
    rating: 4.8,
    reviewCount: 56,
    featured: true,
    tags: ['hamper', 'corporate', 'executive', 'gifting', 'new-arrival'],
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
  },
  {
    id: 'static-corp-gift-2',
    name: 'Premium Pen & Watch Gift Set',
    slug: 'premium-pen-watch-gift-set',
    description: 'An exclusive gift set pairing a Swiss automatic watch with a handcrafted fountain pen in a shared walnut presentation box. The watch features a minimalist silver dial and Italian leather strap. Engravable.',
    price: 4800,
    compareAtPrice: null,
    images: ['/images/products/corp-gift-2.jpg'],
    category: 'Corporate Gifts',
    categorySlug: 'office-corporate-gifts',
    stock: 8,
    rating: 4.9,
    reviewCount: 18,
    featured: true,
    tags: ['watch', 'pen', 'gift-set', 'corporate', 'engravable', 'new-arrival'],
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
  },
  {
    id: 'static-corp-gift-3',
    name: 'Luxury Corporate Gift Box',
    slug: 'luxury-corporate-gift-box',
    description: 'An exquisite corporate gift box featuring a curated selection of premium items including artisan chocolates, a silk scarf, a crystal paperweight, and a handwritten note. Wrapped in signature gold ribbon.',
    price: 2400,
    compareAtPrice: 2800,
    images: ['/images/products/corp-gift-3.jpg', '/images/products/corp-gift-4.jpg'],
    category: 'Corporate Gifts',
    categorySlug: 'office-corporate-gifts',
    stock: 15,
    rating: 4.7,
    reviewCount: 42,
    featured: true,
    tags: ['gift-box', 'corporate', 'premium', 'gifting', 'new-arrival'],
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
  },
  {
    id: 'static-corp-gift-4',
    name: 'Executive Leather Portfolio Set',
    slug: 'executive-leather-portfolio-set',
    description: 'A premium full-grain leather portfolio with matching business card holder and pen loop. Features padded compartments for tablet and documents. Italian calfskin with hand-stitched edges. Available in cognac and black.',
    price: 950,
    compareAtPrice: 1150,
    images: ['/images/products/corp-gift-5.jpg'],
    category: 'Corporate Gifts',
    categorySlug: 'office-corporate-gifts',
    stock: 20,
    rating: 4.8,
    reviewCount: 38,
    featured: true,
    tags: ['leather', 'portfolio', 'corporate', 'executive', 'new-arrival'],
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
  },
  {
    id: 'static-desk-1',
    name: 'Crystal Desk Organizer',
    slug: 'crystal-desk-organizer',
    description: 'A stunning lead crystal desk organizer with multiple compartments for pens, cards, and paper clips. The hand-cut facets create a brilliant play of light. A sophisticated addition to any executive desk.',
    price: 680,
    compareAtPrice: null,
    images: ['/images/products/desk-1.jpg'],
    category: 'Desk Accessories',
    categorySlug: 'office-desk',
    stock: 12,
    rating: 4.7,
    reviewCount: 34,
    featured: true,
    tags: ['crystal', 'desk', 'organizer', 'executive'],
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
  },
  {
    id: 'static-desk-2',
    name: 'Leather Desk Pad',
    slug: 'leather-desk-pad',
    description: 'A generous full-grain Italian leather desk pad with felt backing and stitched edges. Available in cognac, black, and burgundy. Protects your desk while adding a touch of old-world sophistication. 90cm x 45cm.',
    price: 420,
    compareAtPrice: 520,
    images: ['/images/products/desk-2.jpg'],
    category: 'Desk Accessories',
    categorySlug: 'office-desk',
    stock: 20,
    rating: 4.8,
    reviewCount: 67,
    featured: true,
    tags: ['leather', 'desk-pad', 'italian', 'workspace'],
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
  },
  {
    id: 'static-desk-3',
    name: 'Marble & Brass Desk Clock',
    slug: 'marble-brass-desk-clock',
    description: 'An elegant desk clock combining Italian Carrara marble with brushed brass accents. The silent sweep movement ensures no ticking distraction. A statement piece for the discerning professional.',
    price: 580,
    compareAtPrice: null,
    images: ['/images/products/desk-4.jpg'],
    category: 'Desk Accessories',
    categorySlug: 'office-desk',
    stock: 10,
    rating: 4.9,
    reviewCount: 25,
    featured: true,
    tags: ['marble', 'brass', 'clock', 'desk', 'new-arrival'],
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
  },
  {
    id: 'static-desk-4',
    name: 'Walnut Pen Holder Set',
    slug: 'walnut-pen-holder-set',
    description: 'A handcrafted walnut wood pen holder with brass accents, paired with a matching letter tray. The warm wood grain and polished brass create a refined workspace aesthetic. Includes 2 brass-capped pens.',
    price: 340,
    compareAtPrice: 420,
    images: ['/images/products/desk-5.jpg'],
    category: 'Desk Accessories',
    categorySlug: 'office-desk',
    stock: 18,
    rating: 4.6,
    reviewCount: 44,
    featured: false,
    tags: ['walnut', 'pen-holder', 'brass', 'workspace'],
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
  },
  {
    id: 'static-stationery-1',
    name: 'Premium Leather Journal',
    slug: 'premium-leather-journal',
    description: 'A hand-stitched full-grain leather journal with 200 pages of fountain-pen-friendly cream paper. Features a wrap-around leather tie, gilt edges, and a ribbon bookmark. Acid-free 120gsm from an Italian mill.',
    price: 320,
    compareAtPrice: 400,
    images: ['/images/products/stationery-1.jpg'],
    category: 'Stationery',
    categorySlug: 'office-stationery',
    stock: 22,
    rating: 4.8,
    reviewCount: 73,
    featured: true,
    tags: ['journal', 'leather', 'hand-stitched', 'italian-paper'],
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
  },
  {
    id: 'static-stationery-2',
    name: 'Gold Fountain Pen Set',
    slug: 'gold-fountain-pen-set',
    description: 'A prestigious fountain pen and ballpoint pen set in solid brass with 24K gold plating. The fountain pen features a rhodium-plated 18K gold nib. Presented in a velvet-lined lacquer box. Engravable.',
    price: 1200,
    compareAtPrice: null,
    images: ['/images/products/stationery-2.jpg'],
    category: 'Stationery',
    categorySlug: 'office-stationery',
    stock: 8,
    rating: 4.9,
    reviewCount: 29,
    featured: true,
    tags: ['fountain-pen', 'gold', '24K', 'engravable'],
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
  },
  {
    id: 'static-stationery-3',
    name: 'Crystal Inkwell & Pen Set',
    slug: 'crystal-inkwell-pen-set',
    description: 'A magnificent hand-cut crystal inkwell paired with a matching dip pen featuring a gold-plated nib. The inkwell holds premium bottled ink and makes a stunning desk display piece. Gift boxed.',
    price: 890,
    compareAtPrice: 1050,
    images: ['/images/products/stationery-3.jpg', '/images/products/stationery-4.jpg'],
    category: 'Stationery',
    categorySlug: 'office-stationery',
    stock: 6,
    rating: 4.8,
    reviewCount: 19,
    featured: true,
    tags: ['crystal', 'inkwell', 'pen', 'desk', 'new-arrival'],
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
  },
  {
    id: 'static-stationery-4',
    name: 'Artisan Wax Seal Letter Set',
    slug: 'artisan-wax-seal-letter-set',
    description: 'A complete wax seal correspondence set featuring a brass seal with custom monogram, 3 sticks of premium wax, and 50 sheets of heavyweight laid paper with matching envelopes. The art of meaningful communication.',
    price: 280,
    compareAtPrice: null,
    images: ['/images/products/stationery-5.jpg'],
    category: 'Stationery',
    categorySlug: 'office-stationery',
    stock: 30,
    rating: 4.7,
    reviewCount: 51,
    featured: false,
    tags: ['wax-seal', 'letter', 'correspondence', 'monogram'],
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
  },
]

const STATIC_NEW_ARRIVALS_PRODUCTS: ShopifyProductTransformed[] = [
  {
    id: 'static-new-1',
    name: 'Smart Luxury Watch Gold Edition',
    slug: 'smart-luxury-watch-gold-edition',
    description: 'The latest in luxury smartwatch technology. 18K rose gold case with sapphire crystal display, health monitoring suite, and 7-day battery life. Seamlessly blends traditional elegance with cutting-edge innovation.',
    price: 8500,
    compareAtPrice: 9800,
    images: ['/images/products/new-arrival-1.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 10,
    rating: 4.9,
    reviewCount: 15,
    featured: true,
    tags: ['smart-watch', 'gold', 'luxury-tech', 'new-arrival'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-new-2',
    name: 'Heritage Silk Scarf Collection',
    slug: 'heritage-silk-scarf-collection',
    description: 'A limited-edition silk twill scarf featuring hand-painted heritage motifs. 100% Mulberry silk with hand-rolled edges. Each scarf comes numbered in a signature gift box. A collector\'s dream.',
    price: 680,
    compareAtPrice: null,
    images: ['/images/products/new-arrival-2.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 25,
    rating: 4.8,
    reviewCount: 22,
    featured: true,
    tags: ['silk-scarf', 'heritage', 'limited-edition', 'new-arrival'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-new-3',
    name: 'Noir Oud Parfum Collector\'s Edition',
    slug: 'noir-oud-parfum-collectors-edition',
    description: 'An exclusive collector\'s edition of our bestselling Noir Oud, presented in a hand-blown crystal flacon with 24K gold stopper. Notes of aged oud, Damask rose, and ambergris. Limited to 500 bottles worldwide.',
    price: 1200,
    compareAtPrice: null,
    images: ['/images/products/new-arrival-3.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 5,
    rating: 5.0,
    reviewCount: 8,
    featured: true,
    tags: ['perfume', 'oud', 'collectors-edition', 'limited', 'new-arrival'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-new-4',
    name: 'Artisan Gold Leaf Chocolate Box',
    slug: 'artisan-gold-leaf-chocolate-box',
    description: 'A stunning box of 24 handcrafted chocolates, each adorned with edible gold leaf. Flavors include single-origin dark ganache, salted caramel, rose pistachio, and champagne truffle. Arrives in a velvet-lined box.',
    price: 450,
    compareAtPrice: 550,
    images: ['/images/products/new-arrival-4.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 30,
    rating: 4.9,
    reviewCount: 34,
    featured: true,
    tags: ['chocolate', 'gold-leaf', 'artisan', 'gourmet', 'new-arrival'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '1-3 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-new-5',
    name: 'Monogram Leather Card Holder',
    slug: 'monogram-leather-card-holder',
    description: 'A sleek calfskin leather card holder with custom monogramming. Features 6 card slots, a central bill compartment, and RFID blocking technology. Available in 8 colors with gold or silver embossing.',
    price: 290,
    compareAtPrice: null,
    images: ['/images/products/new-arrival-5.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 40,
    rating: 4.7,
    reviewCount: 61,
    featured: true,
    tags: ['card-holder', 'leather', 'monogram', 'RFID', 'new-arrival'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-new-6',
    name: 'Crystal Decanter & Glasses Set',
    slug: 'crystal-decanter-glasses-set',
    description: 'A hand-cut lead crystal decanter with matching set of 6 whiskey glasses. The intricate geometric cuts create a mesmerizing play of light. Perfect for the connoisseur\'s home bar. Gift boxed.',
    price: 1650,
    compareAtPrice: 1900,
    images: ['/images/products/new-arrival-6.jpg'],
    category: 'New Arrivals',
    categorySlug: 'new-arrivals',
    stock: 8,
    rating: 4.9,
    reviewCount: 17,
    featured: true,
    tags: ['crystal', 'decanter', 'whiskey', 'barware', 'new-arrival'],
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
  },
]

const STATIC_KIDS_PRODUCTS: ShopifyProductTransformed[] = [
  {
    id: 'static-kids-shirt-1',
    name: 'Classic Cotton Shirt (Ages 5-7)',
    slug: 'classic-cotton-shirt-5-7',
    description: 'A comfortable cotton shirt for young boys, perfect for school and casual wear. Features a button-down collar, chest pocket, and relaxed fit. Available in white, blue, and pink.',
    price: 450,
    compareAtPrice: 550,
    images: ['/images/products/kids-shirt-1.jpg', '/images/products/kids-shirt-1-2.jpg', '/images/products/kids-shirt-1-3.jpg'],
    category: 'Kids Shirts',
    categorySlug: 'kids-shirts',
    stock: 30,
    rating: 4.6,
    reviewCount: 42,
    featured: true,
    tags: ['shirt', 'cotton', 'boys', 'school', 'kids'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-shirt-2',
    name: 'Striped Formal Shirt (Ages 8-10)',
    slug: 'striped-formal-shirt-8-10',
    description: 'A smart striped formal shirt for growing boys. Slim fit with spread collar and adjustable cuffs. Perfect for school events and family gatherings. Available in navy/white and red/white stripes.',
    price: 520,
    compareAtPrice: null,
    images: ['/images/products/kids-shirt-2.jpg', '/images/products/kids-shirt-2-2.jpg', '/images/products/kids-shirt-2-3.jpg'],
    category: 'Kids Shirts',
    categorySlug: 'kids-shirts',
    stock: 25,
    rating: 4.7,
    reviewCount: 28,
    featured: true,
    tags: ['shirt', 'formal', 'striped', 'boys', 'kids'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-shirt-3',
    name: 'Denim Casual Shirt (Ages 11-13)',
    slug: 'denim-casual-shirt-11-13',
    description: 'A trendy denim casual shirt for pre-teens. Soft washed denim with button-down collar and dual chest pockets. Pairs perfectly with chinos or jeans.',
    price: 680,
    compareAtPrice: 800,
    images: ['/images/products/kids-shirt-3.jpg', '/images/products/kids-shirt-3-2.jpg', '/images/products/kids-shirt-3-3.jpg'],
    category: 'Kids Shirts',
    categorySlug: 'kids-shirts',
    stock: 20,
    rating: 4.8,
    reviewCount: 35,
    featured: true,
    tags: ['shirt', 'denim', 'casual', 'boys', 'pre-teen'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-shirt-4',
    name: 'Premium Linen Shirt (Ages 14-16)',
    slug: 'premium-linen-shirt-14-16',
    description: 'A premium linen shirt for teenagers who appreciate quality. Breathable fabric with a relaxed fit, mandarin collar, and coconut shell buttons. Available in sage, sky blue, and sand.',
    price: 890,
    compareAtPrice: null,
    images: ['/images/products/kids-shirt-4.jpg', '/images/products/kids-shirt-4-2.jpg', '/images/products/kids-shirt-4-3.jpg'],
    category: 'Kids Shirts',
    categorySlug: 'kids-shirts',
    stock: 15,
    rating: 4.9,
    reviewCount: 19,
    featured: true,
    tags: ['shirt', 'linen', 'premium', 'teen', 'boys'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-shirt-5',
    name: 'Oxford Button-Down Shirt (Ages 16-18)',
    slug: 'oxford-button-down-shirt-16-18',
    description: 'A classic Oxford button-down shirt for young adults. Premium cotton Oxford cloth with button-down collar, back box pleat, and barrel cuffs. Timeless style for college and beyond.',
    price: 950,
    compareAtPrice: 1100,
    images: ['/images/products/kids-shirt-5.jpg', '/images/products/kids-shirt-5-2.jpg', '/images/products/kids-shirt-5-3.jpg'],
    category: 'Kids Shirts',
    categorySlug: 'kids-shirts',
    stock: 12,
    rating: 4.8,
    reviewCount: 24,
    featured: false,
    tags: ['shirt', 'oxford', 'classic', 'young-adult', 'boys'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-dress-1',
    name: 'Floral Cotton Dress (Ages 5-7)',
    slug: 'floral-cotton-dress-5-7',
    description: 'A delightful floral cotton dress for little girls. Features a twirly skirt, Peter Pan collar, and back zip closure. Perfect for parties and playdates. Available in rose pink and lavender prints.',
    price: 550,
    compareAtPrice: 650,
    images: ['/images/products/kids-dress-1.jpg', '/images/products/kids-dress-1-2.jpg', '/images/products/kids-dress-1-3.jpg'],
    category: 'Kids Dresses',
    categorySlug: 'kids-dresses',
    stock: 28,
    rating: 4.7,
    reviewCount: 38,
    featured: true,
    tags: ['dress', 'floral', 'cotton', 'girls', 'party', 'kids'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-dress-2',
    name: 'Tulle Party Dress (Ages 8-10)',
    slug: 'tulle-party-dress-8-10',
    description: 'A magical tulle party dress for young girls. Layers of soft tulle over a satin bodice with delicate beadwork at the waist. Available in blush pink, champagne, and lilac.',
    price: 1200,
    compareAtPrice: null,
    images: ['/images/products/kids-dress-2.jpg', '/images/products/kids-dress-2-2.jpg', '/images/products/kids-dress-2-3.jpg'],
    category: 'Kids Dresses',
    categorySlug: 'kids-dresses',
    stock: 15,
    rating: 4.9,
    reviewCount: 22,
    featured: true,
    tags: ['dress', 'tulle', 'party', 'girls', 'special-occasion'],
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
  },
  {
    id: 'static-kids-dress-3',
    name: 'Embroidered Anarkali Dress (Ages 11-13)',
    slug: 'embroidered-anarkali-dress-11-13',
    description: 'An elegant embroidered Anarkali dress for pre-teen girls. Features intricate thread embroidery on the yoke, flared silhouette, and matching dupatta. Perfect for festivals and celebrations.',
    price: 980,
    compareAtPrice: 1200,
    images: ['/images/products/kids-dress-3.jpg', '/images/products/kids-dress-3-2.jpg', '/images/products/kids-dress-3-3.jpg'],
    category: 'Kids Dresses',
    categorySlug: 'kids-dresses',
    stock: 18,
    rating: 4.8,
    reviewCount: 30,
    featured: true,
    tags: ['dress', 'anarkali', 'embroidered', 'girls', 'festival', 'pre-teen'],
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
  },
  {
    id: 'static-kids-dress-4',
    name: 'Chic Shift Dress (Ages 14-16)',
    slug: 'chic-shift-dress-14-16',
    description: 'A sophisticated shift dress for teenage girls. A-line silhouette with V-neckline, side pockets, and back zip. Premium crepe fabric that drapes beautifully. Available in teal, burgundy, and black.',
    price: 1350,
    compareAtPrice: null,
    images: ['/images/products/kids-dress-4.jpg', '/images/products/kids-dress-4-2.jpg', '/images/products/kids-dress-4-3.jpg'],
    category: 'Kids Dresses',
    categorySlug: 'kids-dresses',
    stock: 14,
    rating: 4.7,
    reviewCount: 18,
    featured: true,
    tags: ['dress', 'shift', 'chic', 'teen', 'girls', 'crepe'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-dress-5',
    name: 'Silk Midi Dress (Ages 16-18)',
    slug: 'silk-midi-dress-16-18',
    description: 'An exquisite silk midi dress for young women. Features a wrap-style bodice, flutter sleeves, and a flowing midi-length skirt. Luxurious mulberry silk with subtle sheen. Perfect for special occasions and formals.',
    price: 2200,
    compareAtPrice: 2600,
    images: ['/images/products/kids-dress-5.jpg', '/images/products/kids-dress-5-2.jpg', '/images/products/kids-dress-5-3.jpg'],
    category: 'Kids Dresses',
    categorySlug: 'kids-dresses',
    stock: 8,
    rating: 4.9,
    reviewCount: 14,
    featured: false,
    tags: ['dress', 'silk', 'midi', 'young-adult', 'girls', 'formal'],
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
  },
  // ─── Kids Toys & Games ───
  {
    id: 'static-kids-toy-1',
    name: 'Luxury Wooden Building Block Set',
    slug: 'luxury-wooden-building-block-set',
    description: 'A premium 100-piece wooden building block set crafted from sustainable beechwood. Smooth sanded edges, non-toxic paint in jewel tones, and a canvas storage bag included. Encourages creative open-ended play for children ages 3 and up.',
    price: 850,
    compareAtPrice: 1000,
    images: ['/images/products/kids-toy-1.jpg'],
    category: 'Kids Toys & Games',
    categorySlug: 'kids-toys',
    stock: 22,
    rating: 4.8,
    reviewCount: 45,
    featured: true,
    tags: ['toy', 'building-blocks', 'wooden', 'kids', 'educational'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-toy-2',
    name: 'Artisan Chess & Strategy Game Set',
    slug: 'artisan-chess-strategy-game-set',
    description: 'A beautifully crafted chess set with hand-carved wooden pieces on a walnut and maple inlaid board. Includes a strategy game guide for beginners. Perfect for developing critical thinking skills in children ages 6 and above.',
    price: 1200,
    compareAtPrice: null,
    images: ['/images/products/kids-toy-2.jpg'],
    category: 'Kids Toys & Games',
    categorySlug: 'kids-toys',
    stock: 14,
    rating: 4.9,
    reviewCount: 28,
    featured: true,
    tags: ['toy', 'chess', 'strategy', 'wooden', 'kids', 'educational'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-toy-3',
    name: 'Premium Puzzle Collection (500pc)',
    slug: 'premium-puzzle-collection-500pc',
    description: 'A curated set of 3 premium 500-piece jigsaw puzzles featuring stunning artwork — a world map, a tropical reef, and a space explorer scene. Made from thick recycled cardboard with linen-textured finish for a glare-free experience.',
    price: 680,
    compareAtPrice: 780,
    images: ['/images/products/kids-toy-3.jpg'],
    category: 'Kids Toys & Games',
    categorySlug: 'kids-toys',
    stock: 30,
    rating: 4.7,
    reviewCount: 52,
    featured: false,
    tags: ['toy', 'puzzle', 'jigsaw', 'kids', 'educational'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  // ─── Kids Fashion ───
  {
    id: 'static-kids-fashion-1',
    name: 'Designer Kids Sneakers',
    slug: 'designer-kids-sneakers',
    description: 'Trendy and comfortable designer sneakers for kids. Premium leather upper with cushioned insole and non-slip rubber outsole. Available in white/gold, black/silver, and rose gold colorways. Sizes for ages 5-14.',
    price: 1500,
    compareAtPrice: 1800,
    images: ['/images/products/kids-fashion-1.jpg'],
    category: 'Kids Fashion',
    categorySlug: 'kids-fashion',
    stock: 20,
    rating: 4.8,
    reviewCount: 36,
    featured: true,
    tags: ['sneakers', 'shoes', 'designer', 'kids', 'fashion'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-fashion-2',
    name: 'Boutique Kids Hoodie Collection',
    slug: 'boutique-kids-hoodie-collection',
    description: 'A premium organic cotton hoodie for kids with a modern oversized fit. Features a kangaroo pocket, ribbed cuffs, and a subtle embroidered logo. Soft brushed fleece interior for warmth. Available in charcoal, cream, and sage.',
    price: 780,
    compareAtPrice: null,
    images: ['/images/products/kids-fashion-2.jpg'],
    category: 'Kids Fashion',
    categorySlug: 'kids-fashion',
    stock: 25,
    rating: 4.7,
    reviewCount: 41,
    featured: true,
    tags: ['hoodie', 'cotton', 'organic', 'kids', 'fashion'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
  {
    id: 'static-kids-fashion-3',
    name: 'Luxury Kids Backpack Set',
    slug: 'luxury-kids-backpack-set',
    description: 'A premium kids backpack set featuring a main backpack, matching lunch bag, and pencil case. Water-resistant nylon with padded shoulder straps and multiple compartments. Available in midnight blue, burgundy, and forest green.',
    price: 950,
    compareAtPrice: 1100,
    images: ['/images/products/kids-fashion-3.jpg'],
    category: 'Kids Fashion',
    categorySlug: 'kids-fashion',
    stock: 18,
    rating: 4.9,
    reviewCount: 29,
    featured: true,
    tags: ['backpack', 'school', 'kids', 'fashion', 'accessories'],
    occasions: [],
    recipientTypes: [],
    relationships: [],
    deliveryEstimate: '2-4 business days',
    platform: null,
    isExternal: false,
    sourceUrl: null,
    affiliateUrl: null,
    platformLogo: null,
    commission: null,
    syncStatus: 'active',
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '12', 10)

  // New filters for platform aggregation
  const platform = searchParams.get('platform')
  const source = searchParams.get('source') // 'own' or 'external'
  const isExternalParam = searchParams.get('isExternal') // 'true', 'false', or 'all'

  // Gift-centric filters
  const occasion = searchParams.get('occasion')
  const recipient = searchParams.get('recipient')
  const relationship = searchParams.get('relationship')
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')

  // ─── Check data source preference ───
  // With Supabase PostgreSQL, the DB is accessible from Vercel serverless too
  const dataSource = process.env.DATA_SOURCE // 'shopify' to skip DB, 'database' for DB-first (default)
  const preferShopify = dataSource === 'shopify'

  // ─── EARLY RETURNS DISABLED ───
  // Previously, Office / New Arrivals / Kids returned hardcoded STATIC products
  // with broken image URLs (/images/products/kids-shirt-1.jpg etc.).
  // These have been removed so ALL categories now query the database only.
  // If no DB products match a category, the response will be empty (0 products)
  // and the ProductGrid will show "No products found".
  // To restore the static fallbacks, uncomment the blocks below.

  /*
  const officeCategorySlugs = ['office', 'office-corporate-gifts', 'office-desk', 'office-stationery', 'corporate-gifts', 'desk-accessories', 'stationery']
  if (category && officeCategorySlugs.includes(category) && !search) {
    const officeSlugs = resolveCategorySlugs(category)
    const filtered = STATIC_OFFICE_PRODUCTS.filter(p => officeSlugs.includes(p.categorySlug))
    return NextResponse.json({
      products: filtered,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      source: 'static',
    })
  }
  if (category === 'new-arrivals' && !search) {
    return NextResponse.json({
      products: STATIC_NEW_ARRIVALS_PRODUCTS,
      total: STATIC_NEW_ARRIVALS_PRODUCTS.length,
      page,
      totalPages: Math.ceil(STATIC_NEW_ARRIVALS_PRODUCTS.length / limit),
      source: 'static',
    })
  }
  // Kids categories also serve static products directly (no Shopify/DB data)
  const kidsCategorySlugs = ['kids', 'kids-shirts', 'kids-dresses', 'kids-fashion', 'kids-toys']
  if (category && kidsCategorySlugs.includes(category) && !search) {
    const kidsSlugs = resolveCategorySlugs(category)
    const filtered = STATIC_KIDS_PRODUCTS.filter(p => kidsSlugs.includes(p.categorySlug))
    return NextResponse.json({
      products: filtered,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      source: 'static',
    })
  }
  */

  // ─── Shopify-only path (no DB, no duplication) ───
  if (preferShopify) {
    try {
      let shopifyProducts: ShopifyProductTransformed[]

      if (category && !search) {
        // Resolve category slug aliases so both DB and Shopify slugs work
        const categorySlugs = resolveCategorySlugs(category)
        const allProducts = await fetchShopifyProducts()
        shopifyProducts = allProducts.filter((p) => categorySlugs.includes(p.categorySlug))
      } else if (search && !category) {
        shopifyProducts = await searchShopifyProducts(search)
      } else if (category && search) {
        // Resolve category slug aliases so both DB and Shopify slugs work
        const categorySlugs = resolveCategorySlugs(category)
        const allProducts = await fetchShopifyProducts()
        const categoryProducts = allProducts.filter((p) => categorySlugs.includes(p.categorySlug))
        const q = search.toLowerCase()
        shopifyProducts = categoryProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
      } else {
        shopifyProducts = await fetchShopifyProducts()
      }

      const effectiveMinPriceNum = (priceMin || minPrice)
        ? parseFloat(priceMin || minPrice || '0')
        : null
      const effectiveMaxPriceNum = (priceMax || maxPrice)
        ? parseFloat(priceMax || maxPrice || '0')
        : null

      // Deduplicate before filtering/pagination to guarantee no duplicates
      const dedupedProducts = deduplicateProducts(shopifyProducts)

      const result = filterAndPaginateShopifyProducts(dedupedProducts, {
        category: category || null,
        search: search || null,
        minPrice: effectiveMinPriceNum,
        maxPrice: effectiveMaxPriceNum,
        sort,
        page,
        limit,
        platform: platform || null,
        source: source || null,
        isExternalParam: isExternalParam || null,
        occasion: occasion || null,
        recipient: recipient || null,
        relationship: relationship || null,
      })

    return NextResponse.json({
      products: result.products,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
      source: 'shopify',
    })
    } catch (shopifyError) {
      console.error('[Products API] Shopify fetch failed:', shopifyError)
      // Even if Shopify fails, return empty results rather than a 500 error
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        totalPages: 0,
        source: 'shopify-error',
      })
    }
  }

  // ─── DB-first path (default, with Shopify fallback) ───
  try {
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (category) {
      // ─── NEW ARRIVALS: products created within the last 30 days ───
      if (category === 'new-arrivals') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        where.createdAt = { gte: thirtyDaysAgo }
      }
      // ─── PARENT CATEGORIES: query all sub-category slugs at once ───
      else if (PARENT_CATEGORY_CHILDREN[category]) {
        const childSlugs = resolveCategorySlugs(category).filter(s => s !== category)
        if (childSlugs.length > 0) {
          where.category = { slug: { in: childSlugs } }
        } else {
          // No sub-categories → no products
          where.category = { slug: category }
        }
      }
      // ─── LEAF CATEGORIES: resolve aliases and query ───
      else {
        const categorySlugs = resolveCategorySlugs(category)
        if (categorySlugs.length === 1) {
          where.category = { slug: category }
        } else {
          where.category = { slug: { in: categorySlugs } }
        }
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // Price range (legacy + new params)
    const effectiveMinPrice = priceMin || minPrice
    const effectiveMaxPrice = priceMax || maxPrice
    if (effectiveMinPrice || effectiveMaxPrice) {
      where.price = {}
      if (effectiveMinPrice) (where.price as Record<string, unknown>).gte = parseFloat(effectiveMinPrice)
      if (effectiveMaxPrice) (where.price as Record<string, unknown>).lte = parseFloat(effectiveMaxPrice)
    }

    // Platform filter: filter by platform slug
    if (platform) {
      where.platform = platform
    }

    // Source filter: 'own' = isExternal false, 'external' = isExternal true
    if (source === 'own') {
      where.isExternal = false
    } else if (source === 'external') {
      where.isExternal = true
    }

    // isExternal filter: explicit true/false/all
    if (isExternalParam === 'true') {
      where.isExternal = true
    } else if (isExternalParam === 'false') {
      where.isExternal = false
    }
    // 'all' or undefined = no filter (show both)

    // Occasion filter: products whose occasions JSON array contains the value
    if (occasion) {
      where.occasions = { contains: occasion }
    }

    // Recipient filter: products whose recipientTypes JSON array contains the value
    if (recipient) {
      where.recipientTypes = { contains: recipient }
    }

    // Relationship filter: products whose relationships JSON array contains the value
    if (relationship) {
      where.relationships = { contains: relationship }
    }

    // Build orderBy
    let orderBy: Record<string, unknown> | Array<Record<string, unknown>> = { createdAt: 'desc' }
    switch (sort) {
      case 'price-asc':
        orderBy = { price: 'asc' }
        break
      case 'price-desc':
        orderBy = { price: 'desc' }
        break
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'featured':
        orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }]
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: true, translations: true },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    // Transform products for frontend
    const transformedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: JSON.parse(p.images || '[]') as string[],
      category: p.category.name,
      categorySlug: p.category.slug,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      tags: JSON.parse(p.tags || '[]') as string[],
      occasions: JSON.parse(p.occasions || '[]') as string[],
      recipientTypes: JSON.parse(p.recipientTypes || '[]') as string[],
      relationships: JSON.parse(p.relationships || '[]') as string[],
      deliveryEstimate: p.deliveryEstimate || null,
      // Platform aggregation fields
      platform: p.platform,
      isExternal: p.isExternal,
      sourceUrl: p.sourceUrl,
      affiliateUrl: p.affiliateUrl,
      platformLogo: p.platform ? (PLATFORM_LOGO_MAP[p.platform] || null) : null,
      commission: p.commission,
      syncStatus: p.syncStatus,
      // i18n: product translations for all locales
      translations: (p.translations || []).map((tr: any) => ({
        locale: tr.locale,
        name: tr.name,
        description: tr.description,
      })),
    }))

    // Deduplicate DB products as a safety net (handles multiple seed/sync runs)
    const dedupedProducts = deduplicateProducts(transformedProducts)

    const adjustedTotal = total

    return NextResponse.json({
      products: dedupedProducts,
      total: adjustedTotal,
      page,
      totalPages: Math.ceil(adjustedTotal / limit),
      source: 'database',
    })
  } catch (dbError) {
    console.warn('[Products API] Database query failed, falling back to Shopify:', dbError)

    // ─── Fallback to Shopify Admin API ───
    try {
      let shopifyProducts: ShopifyProductTransformed[]

      // Use targeted fetch if we have a category or search filter
      if (category && !search) {
        // Special handling for "new-arrivals" — filter by tag/featured, not by category slug
        if (category === 'new-arrivals') {
          const allProducts = await fetchShopifyProducts()
          shopifyProducts = allProducts.filter(p =>
            p.tags.some(t => t.toLowerCase().includes('new')) || p.featured
          )
          if (shopifyProducts.length === 0 && allProducts.length > 0) {
            const count = Math.ceil(allProducts.length * 0.2)
            shopifyProducts = allProducts.slice(0, count)
          }
        } else {
          // Resolve category slug aliases so both DB and Shopify slugs work
          const categorySlugs = resolveCategorySlugs(category)
          const allProducts = await fetchShopifyProducts()
          shopifyProducts = allProducts.filter((p) => categorySlugs.includes(p.categorySlug))
        }
      } else if (search && !category) {
        shopifyProducts = await searchShopifyProducts(search)
      } else if (category && search) {
        // Both filters: get by category (with alias resolution), then search within
        const categorySlugs = resolveCategorySlugs(category)
        const allProducts = await fetchShopifyProducts()
        const categoryProducts = allProducts.filter((p) => categorySlugs.includes(p.categorySlug))
        const q = search.toLowerCase()
        shopifyProducts = categoryProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
      } else {
        shopifyProducts = await fetchShopifyProducts()
      }

      // Apply all the same filters, sorting, and pagination
      const effectiveMinPriceNum = (priceMin || minPrice)
        ? parseFloat(priceMin || minPrice || '0')
        : null
      const effectiveMaxPriceNum = (priceMax || maxPrice)
        ? parseFloat(priceMax || maxPrice || '0')
        : null

      // Deduplicate before filtering/pagination
      const dedupedShopifyProducts = deduplicateProducts(shopifyProducts)

      const result = filterAndPaginateShopifyProducts(dedupedShopifyProducts, {
        category: category || null,
        search: search || null,
        minPrice: effectiveMinPriceNum,
        maxPrice: effectiveMaxPriceNum,
        sort,
        page,
        limit,
        platform: platform || null,
        source: source || null,
        isExternalParam: isExternalParam || null,
        occasion: occasion || null,
        recipient: recipient || null,
        relationship: relationship || null,
      })

    return NextResponse.json({
      products: result.products,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
      source: 'shopify',
    })
    } catch (shopifyError) {
      console.error('[Products API] Shopify fallback also failed:', shopifyError)
      // Return empty results instead of 500 error
      return NextResponse.json({
        products: [],
        total: 0,
        page,
        totalPages: 0,
        source: 'error',
      })
    }
  }
}

// v2.0 - deploy trigger
