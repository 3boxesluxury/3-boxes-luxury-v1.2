import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── 1. Create Categories ───
  console.log('Creating categories...')

  // Parent categories
  const men = await prisma.category.upsert({
    where: { slug: 'men' },
    update: {},
    create: { name: 'Men', slug: 'men', description: 'Gifts for Him', order: 1 },
  })

  const women = await prisma.category.upsert({
    where: { slug: 'women' },
    update: {},
    create: { name: 'Women', slug: 'women', description: 'Gifts for Her', order: 2 },
  })

  const couple = await prisma.category.upsert({
    where: { slug: 'couple' },
    update: {},
    create: { name: 'Couple', slug: 'couple', description: 'Gifts for Couples', order: 3 },
  })

  const kids = await prisma.category.upsert({
    where: { slug: 'kids' },
    update: {},
    create: { name: 'Kids', slug: 'kids', description: 'Gifts for Kids', order: 4 },
  })

  const home = await prisma.category.upsert({
    where: { slug: 'home' },
    update: {},
    create: { name: 'Home', slug: 'home', description: 'Home & Living', order: 5 },
  })

  const office = await prisma.category.upsert({
    where: { slug: 'office' },
    update: {},
    create: { name: 'Office', slug: 'office', description: 'Corporate & Office Gifts', order: 6 },
  })

  const newArrivals = await prisma.category.upsert({
    where: { slug: 'new-arrivals' },
    update: {},
    create: { name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest arrivals', order: 7 },
  })

  // Sub-categories
  const subCategories = [
    // Men sub-categories
    { name: 'Leather Goods', slug: 'leather-goods', parentId: men.id, order: 1 },
    { name: 'Watches', slug: 'watches', parentId: men.id, order: 2 },
    { name: 'Fragrances', slug: 'fragrances', parentId: men.id, order: 3 },
    { name: 'Mens Shirts', slug: 'mens-shirts', parentId: men.id, order: 4 },
    { name: 'Fashion', slug: 'fashion', parentId: men.id, order: 5 },

    // Women sub-categories
    { name: 'Jewelry', slug: 'jewelry', parentId: women.id, order: 1 },
    { name: 'Sarees', slug: 'sarees', parentId: women.id, order: 2 },
    { name: 'Women Fashion', slug: 'women-fashion', parentId: women.id, order: 3 },
    { name: 'Women Fragrances', slug: 'women-fragrances', parentId: women.id, order: 4 },

    // Couple sub-categories
    { name: 'Couple Friendly Gifts', slug: 'couple-friendly', parentId: couple.id, order: 1 },
    { name: 'Romantic Gifts', slug: 'romantic-gifts', parentId: couple.id, order: 2 },

    // Kids sub-categories
    { name: 'Kids Shirts', slug: 'kids-shirts', parentId: kids.id, order: 1 },
    { name: 'Kids Dresses', slug: 'kids-dresses', parentId: kids.id, order: 2 },
    { name: 'Kids Toys', slug: 'kids-toys', parentId: kids.id, order: 3 },
    { name: 'Kids Fashion', slug: 'kids-fashion', parentId: kids.id, order: 4 },

    // Home sub-categories
    { name: 'Home & Living', slug: 'home-living', parentId: home.id, order: 1 },
    { name: 'Home Decor', slug: 'home-decor', parentId: home.id, order: 2 },

    // Office sub-categories
    { name: 'Corporate Gifts', slug: 'office-corporate-gifts', parentId: office.id, order: 1 },
    { name: 'Desk Accessories', slug: 'office-desk', parentId: office.id, order: 2 },
    { name: 'Stationery', slug: 'office-stationery', parentId: office.id, order: 3 },
  ]

  const categoryMap: Record<string, string> = {
    men: men.id,
    women: women.id,
    couple: couple.id,
    kids: kids.id,
    home: home.id,
    office: office.id,
    'new-arrivals': newArrivals.id,
  }

  for (const cat of subCategories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    categoryMap[cat.slug] = created.id
  }

  console.log('Categories created:', Object.keys(categoryMap).length)

  // ─── 2. Create Admin User ───
  console.log('Creating admin user...')

  const hashedPassword = await bcrypt.hash('admin123', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@3boxesluxury.com' },
    update: {},
    create: {
      email: 'admin@3boxesluxury.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      approvalStatus: 'approved',
      twoFactorEnabled: false,
      twoFactorRequired: false,
    },
  })

  // Also create pmkshar@gmail.com admin
  await prisma.user.upsert({
    where: { email: 'pmkshar@gmail.com' },
    update: {},
    create: {
      email: 'pmkshar@gmail.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      emailVerified: true,
      approvalStatus: 'approved',
      twoFactorEnabled: false,
      twoFactorRequired: false,
    },
  })

  // Create a regular user
  await prisma.user.upsert({
    where: { email: 'user@3boxesluxury.com' },
    update: {},
    create: {
      email: 'user@3boxesluxury.com',
      name: 'User',
      password: await bcrypt.hash('user123', 12),
      role: 'user',
      isActive: true,
      emailVerified: true,
      approvalStatus: 'approved',
    },
  })

  console.log('Admin user created:', adminUser.email)

  // ─── 3. Create Products ───
  console.log('Creating products...')

  // Helper to generate product number
  let productCounter = 10001
  async function createProduct(data: {
    name: string
    slug: string
    description: string
    price: number
    compareAtPrice?: number | null
    categorySlug: string
    images?: string[]
    stock?: number
    rating?: number
    reviewCount?: number
    featured?: boolean
    tags?: string[]
    occasions?: string[]
    recipientTypes?: string[]
    relationships?: string[]
    deliveryEstimate?: string
  }) {
    const productNumber = `PRD-${productCounter++}`
    const categoryId = categoryMap[data.categorySlug]
    if (!categoryId) {
      console.warn(`Category not found for slug: ${data.categorySlug}, skipping product: ${data.name}`)
      return
    }

    await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        productNumber,
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice || null,
        categoryId,
        images: JSON.stringify(data.images || ['/images/placeholder.jpg']),
        stock: data.stock || 10,
        rating: data.rating || 4.5,
        reviewCount: data.reviewCount || 0,
        featured: data.featured || false,
        tags: JSON.stringify(data.tags || []),
        occasions: JSON.stringify(data.occasions || []),
        recipientTypes: JSON.stringify(data.recipientTypes || []),
        relationships: JSON.stringify(data.relationships || []),
        deliveryEstimate: data.deliveryEstimate || '3-5 business days',
      },
    })
  }

  // ─── Men's Products ───
  const mensProducts = [
    {
      name: 'Italian Leather Wallet',
      slug: 'italian-leather-wallet',
      description: 'A premium Italian leather bi-fold wallet with hand-stitched edges, 8 card slots, 2 bill compartments, and a coin pocket. Crafted from full-grain calfskin with a rich patina that develops over time. Available in cognac and black.',
      price: 1200,
      compareAtPrice: 1500,
      categorySlug: 'leather-goods',
      images: ['/images/products/men-leather-1.jpg'],
      stock: 25,
      rating: 4.8,
      reviewCount: 56,
      featured: true,
      tags: ['leather', 'wallet', 'italian', 'men', 'premium'],
      occasions: ['birthday', 'anniversary'],
      recipientTypes: ['him'],
      relationships: ['spouse', 'friend', 'colleague'],
    },
    {
      name: 'Swiss Automatic Watch',
      slug: 'swiss-automatic-watch',
      description: 'A timeless Swiss automatic watch featuring a minimalist silver dial, sapphire crystal, and Italian leather strap. The 40mm case houses a precision Swiss movement visible through the exhibition caseback. Water resistant to 50m.',
      price: 15000,
      compareAtPrice: 18000,
      categorySlug: 'watches',
      images: ['/images/products/men-watch-1.jpg'],
      stock: 8,
      rating: 4.9,
      reviewCount: 23,
      featured: true,
      tags: ['watch', 'swiss', 'automatic', 'luxury', 'men'],
      occasions: ['anniversary', 'wedding'],
      recipientTypes: ['him'],
      relationships: ['spouse', 'parent'],
    },
    {
      name: 'Oud Wood Eau de Parfum',
      slug: 'oud-wood-eau-de-parfum',
      description: 'A sophisticated men\'s fragrance featuring rare oud wood, cardamom, and sandalwood. This long-lasting eau de parfum comes in a hand-blown crystal flacon with a magnetic cap. 100ml. Perfect for evening wear and special occasions.',
      price: 3500,
      compareAtPrice: null,
      categorySlug: 'fragrances',
      images: ['/images/products/men-fragrance-1.jpg'],
      stock: 15,
      rating: 4.7,
      reviewCount: 41,
      featured: true,
      tags: ['fragrance', 'oud', 'perfume', 'men', 'luxury'],
      occasions: ['birthday', 'diwali'],
      recipientTypes: ['him'],
      relationships: ['friend', 'colleague', 'spouse'],
    },
    {
      name: 'Premium Cufflinks Set',
      slug: 'premium-cufflinks-set',
      description: 'Elegant mother-of-pearl cufflinks set in sterling silver with a polished finish. Comes in a velvet-lined presentation box. The perfect finishing touch for formal occasions. Engravable with initials.',
      price: 2200,
      compareAtPrice: 2800,
      categorySlug: 'fashion',
      images: ['/images/products/men-cufflinks-1.jpg'],
      stock: 12,
      rating: 4.6,
      reviewCount: 29,
      featured: false,
      tags: ['cufflinks', 'silver', 'formal', 'men', 'engravable'],
      occasions: ['wedding', 'anniversary'],
      recipientTypes: ['him'],
      relationships: ['spouse', 'friend'],
    },
    {
      name: 'Heritage Leather Belt',
      slug: 'heritage-leather-belt',
      description: 'A handcrafted full-grain leather belt with a solid brass buckle. The vegetable-tanned leather ages beautifully, developing a unique patina over time. 35mm width suitable for both casual and formal wear. Available in tan and dark brown.',
      price: 980,
      compareAtPrice: null,
      categorySlug: 'leather-goods',
      images: ['/images/products/men-belt-1.jpg'],
      stock: 20,
      rating: 4.8,
      reviewCount: 64,
      featured: true,
      tags: ['belt', 'leather', 'brass', 'men', 'handcrafted'],
      occasions: ['birthday', 'diwali', 'christmas'],
      recipientTypes: ['him'],
      relationships: ['friend', 'colleague', 'spouse'],
    },
  ]

  for (const p of mensProducts) {
    await createProduct(p)
  }

  // ─── Women's Products ───
  const womensProducts = [
    {
      name: 'Diamond Pendant Necklace',
      slug: 'diamond-pendant-necklace',
      description: 'A stunning solitaire diamond pendant set in 18K white gold. The 0.25 carat VS1 diamond is prong-set for maximum brilliance. Includes a delicate 18-inch Italian chain with lobster clasp. Comes with GIA certification.',
      price: 25000,
      compareAtPrice: 28000,
      categorySlug: 'jewelry',
      images: ['/images/products/women-jewelry-1.jpg'],
      stock: 5,
      rating: 5.0,
      reviewCount: 12,
      featured: true,
      tags: ['diamond', 'necklace', 'gold', 'jewelry', 'luxury'],
      occasions: ['anniversary', 'wedding', 'birthday'],
      recipientTypes: ['her'],
      relationships: ['spouse', 'parent'],
    },
    {
      name: 'Banarasi Silk Saree',
      slug: 'banarasi-silk-saree',
      description: 'A handwoven Banarasi silk saree featuring intricate gold zari work with traditional floral motifs. The rich burgundy hue is achieved using natural dyes. Includes matching blouse piece. Comes in a premium silk box. 6.3 meters.',
      price: 8500,
      compareAtPrice: 10000,
      categorySlug: 'sarees',
      images: ['/images/products/women-saree-1.jpg'],
      stock: 10,
      rating: 4.9,
      reviewCount: 37,
      featured: true,
      tags: ['saree', 'silk', 'banarasi', 'zari', 'wedding'],
      occasions: ['wedding', 'diwali'],
      recipientTypes: ['her'],
      relationships: ['spouse', 'parent', 'friend'],
    },
    {
      name: 'Rose Gold Bracelet',
      slug: 'rose-gold-bracelet',
      description: 'A delicate rose gold chain bracelet with a heart-shaped charm set with a single diamond. 14K rose gold with a toggle clasp. Adjustable length 16-19cm. The perfect everyday luxury piece.',
      price: 4500,
      compareAtPrice: null,
      categorySlug: 'jewelry',
      images: ['/images/products/women-bracelet-1.jpg'],
      stock: 18,
      rating: 4.8,
      reviewCount: 45,
      featured: true,
      tags: ['bracelet', 'rose-gold', 'diamond', 'jewelry'],
      occasions: ['birthday', 'anniversary', 'valentine'],
      recipientTypes: ['her'],
      relationships: ['spouse', 'friend', 'sibling'],
    },
    {
      name: 'Jasmine & Vanilla Parfum',
      slug: 'jasmine-vanilla-parfum',
      description: 'An exquisite women\'s fragrance blending night-blooming jasmine, Madagascar vanilla, and white musk. Presented in a hand-painted porcelain flacon with a silk tassel. 75ml eau de parfum. Long-lasting 12+ hour wear.',
      price: 2800,
      compareAtPrice: 3200,
      categorySlug: 'women-fragrances',
      images: ['/images/products/women-fragrance-1.jpg'],
      stock: 20,
      rating: 4.7,
      reviewCount: 53,
      featured: true,
      tags: ['fragrance', 'jasmine', 'vanilla', 'perfume', 'women'],
      occasions: ['birthday', 'diwali', 'christmas'],
      recipientTypes: ['her'],
      relationships: ['friend', 'spouse', 'sibling'],
    },
  ]

  for (const p of womensProducts) {
    await createProduct(p)
  }

  // ─── Couple's Products ───
  const coupleProducts = [
    {
      name: 'His & Hers Watch Set',
      slug: 'his-hers-watch-set',
      description: 'A matching pair of luxury watches in a shared walnut presentation box. His: 42mm automatic with steel bracelet. Hers: 32mm quartz with leather strap. Both feature sapphire crystal and Swiss movements. Engravable on caseback.',
      price: 28000,
      compareAtPrice: 32000,
      categorySlug: 'couple-friendly',
      images: ['/images/products/couple-watch-1.jpg'],
      stock: 4,
      rating: 4.9,
      reviewCount: 8,
      featured: true,
      tags: ['watch', 'couple', 'matching', 'gift-set', 'engravable'],
      occasions: ['anniversary', 'wedding', 'valentine'],
      recipientTypes: ['couple'],
      relationships: ['spouse'],
    },
    {
      name: 'Couples Spa Experience Box',
      slug: 'couples-spa-experience-box',
      description: 'A curated spa experience for two including artisan bath bombs, massage oils, scented candles, and matching silk robes. Beautifully packaged in a keepsake hamper with a personalized card. The ultimate relaxation gift.',
      price: 3500,
      compareAtPrice: 4200,
      categorySlug: 'couple-friendly',
      images: ['/images/products/couple-spa-1.jpg'],
      stock: 15,
      rating: 4.8,
      reviewCount: 34,
      featured: true,
      tags: ['spa', 'couple', 'relaxation', 'gift-box', 'experience'],
      occasions: ['anniversary', 'valentine'],
      recipientTypes: ['couple'],
      relationships: ['spouse', 'friend'],
    },
    {
      name: 'Romantic Candlelight Dinner Set',
      slug: 'romantic-candlelight-dinner-set',
      description: 'Everything for a perfect romantic dinner at home: hand-poured soy candles, crystal wine glasses, a linen table runner, cloth napkins with gold trim, and a playlist QR card. Comes in a luxury black box with gold embossing.',
      price: 4200,
      compareAtPrice: null,
      categorySlug: 'romantic-gifts',
      images: ['/images/products/couple-dinner-1.jpg'],
      stock: 10,
      rating: 4.7,
      reviewCount: 21,
      featured: true,
      tags: ['romantic', 'dinner', 'candles', 'couple', 'date-night'],
      occasions: ['anniversary', 'valentine', 'birthday'],
      recipientTypes: ['couple'],
      relationships: ['spouse'],
    },
  ]

  for (const p of coupleProducts) {
    await createProduct(p)
  }

  // ─── Kids Products ───
  const kidsProducts = [
    {
      name: 'Classic Cotton Shirt (Ages 5-7)',
      slug: 'classic-cotton-shirt-5-7',
      description: 'A comfortable cotton shirt for young boys, perfect for school and casual wear. Features a button-down collar, chest pocket, and relaxed fit. Available in white, blue, and pink.',
      price: 450,
      compareAtPrice: 550,
      categorySlug: 'kids-shirts',
      images: ['/images/products/kids-shirt-1.jpg'],
      stock: 30,
      rating: 4.6,
      reviewCount: 42,
      featured: true,
      tags: ['shirt', 'cotton', 'boys', 'school', 'kids'],
      occasions: ['birthday'],
      recipientTypes: ['kids'],
      relationships: ['sibling'],
    },
    {
      name: 'Floral Cotton Dress (Ages 5-7)',
      slug: 'floral-cotton-dress-5-7',
      description: 'A delightful floral cotton dress for little girls. Features a twirly skirt, Peter Pan collar, and back zip closure. Perfect for parties and playdates. Available in rose pink and lavender prints.',
      price: 550,
      compareAtPrice: 650,
      categorySlug: 'kids-dresses',
      images: ['/images/products/kids-dress-1.jpg'],
      stock: 28,
      rating: 4.7,
      reviewCount: 38,
      featured: true,
      tags: ['dress', 'floral', 'cotton', 'girls', 'party', 'kids'],
      occasions: ['birthday'],
      recipientTypes: ['kids'],
      relationships: ['sibling'],
    },
    {
      name: 'Luxury Wooden Building Block Set',
      slug: 'luxury-wooden-building-block-set',
      description: 'A premium 100-piece wooden building block set crafted from sustainable beechwood. Smooth sanded edges, non-toxic paint in jewel tones, and a canvas storage bag included. Encourages creative open-ended play for children ages 3 and up.',
      price: 850,
      compareAtPrice: 1000,
      categorySlug: 'kids-toys',
      images: ['/images/products/kids-toy-1.jpg'],
      stock: 22,
      rating: 4.8,
      reviewCount: 45,
      featured: true,
      tags: ['toy', 'building-blocks', 'wooden', 'kids', 'educational'],
      occasions: ['birthday', 'christmas'],
      recipientTypes: ['kids'],
      relationships: ['sibling', 'friend'],
    },
    {
      name: 'Designer Kids Sneakers',
      slug: 'designer-kids-sneakers',
      description: 'Trendy and comfortable designer sneakers for kids. Premium leather upper with cushioned insole and non-slip rubber outsole. Available in white/gold, black/silver, and rose gold colorways. Sizes for ages 5-14.',
      price: 1500,
      compareAtPrice: 1800,
      categorySlug: 'kids-fashion',
      images: ['/images/products/kids-fashion-1.jpg'],
      stock: 20,
      rating: 4.8,
      reviewCount: 36,
      featured: true,
      tags: ['sneakers', 'shoes', 'designer', 'kids', 'fashion'],
      occasions: ['birthday'],
      recipientTypes: ['kids'],
      relationships: ['sibling'],
    },
  ]

  for (const p of kidsProducts) {
    await createProduct(p)
  }

  // ─── Home Products ───
  const homeProducts = [
    {
      name: 'Handcrafted Ceramic Vase Set',
      slug: 'handcrafted-ceramic-vase-set',
      description: 'A set of 3 handcrafted ceramic vases in graduated sizes. Matte white glaze with subtle gold leaf accents. Each piece is unique, made by artisans using traditional techniques. Perfect for fresh or dried flower arrangements.',
      price: 1800,
      compareAtPrice: 2200,
      categorySlug: 'home-living',
      images: ['/images/products/home-vase-1.jpg'],
      stock: 12,
      rating: 4.8,
      reviewCount: 27,
      featured: true,
      tags: ['vase', 'ceramic', 'handcrafted', 'home', 'decor'],
      occasions: ['housewarming', 'wedding', 'anniversary'],
      recipientTypes: ['her', 'couple'],
      relationships: ['friend', 'spouse'],
    },
    {
      name: 'Luxury Scented Candle Collection',
      slug: 'luxury-scented-candle-collection',
      description: 'A collection of 4 hand-poured soy wax candles in artisan glass jars. Scents: Midnight Jasmine, Oud & Sandalwood, Vanilla Bean, and Ocean Breeze. 60+ hours burn time each. Comes in a signature gift box.',
      price: 2400,
      compareAtPrice: 2800,
      categorySlug: 'home-living',
      images: ['/images/products/home-candle-1.jpg'],
      stock: 20,
      rating: 4.9,
      reviewCount: 48,
      featured: true,
      tags: ['candle', 'scented', 'soy', 'luxury', 'home'],
      occasions: ['diwali', 'christmas', 'housewarming', 'birthday'],
      recipientTypes: ['her', 'him', 'couple'],
      relationships: ['friend', 'colleague', 'spouse'],
    },
    {
      name: 'Cashmere Throw Blanket',
      slug: 'cashmere-throw-blanket',
      description: 'A sumptuously soft 100% Mongolian cashmere throw blanket. Generous 150cm x 200cm size with hand-knotted fringe. Available in ivory, charcoal, and dusty rose. Comes in a signature linen storage bag. The ultimate luxury home accessory.',
      price: 8500,
      compareAtPrice: null,
      categorySlug: 'home-living',
      images: ['/images/products/home-blanket-1.jpg'],
      stock: 8,
      rating: 5.0,
      reviewCount: 15,
      featured: true,
      tags: ['cashmere', 'blanket', 'throw', 'luxury', 'home'],
      occasions: ['wedding', 'anniversary', 'christmas'],
      recipientTypes: ['couple', 'her'],
      relationships: ['spouse', 'parent'],
    },
  ]

  for (const p of homeProducts) {
    await createProduct(p)
  }

  // ─── Office Products ───
  const officeProducts = [
    {
      name: 'Executive Gift Hamper',
      slug: 'executive-gift-hamper',
      description: 'A premium corporate gift hamper featuring artisan chocolates, a leather-bound planner, premium tea collection, and a personalized thank-you card. Elegantly packaged in a matte black box with gold foil branding.',
      price: 1800,
      compareAtPrice: 2200,
      categorySlug: 'office-corporate-gifts',
      images: ['/images/products/corp-gift-1.jpg'],
      stock: 25,
      rating: 4.8,
      reviewCount: 56,
      featured: true,
      tags: ['hamper', 'corporate', 'executive', 'gifting', 'new-arrival'],
      occasions: ['diwali', 'christmas'],
      recipientTypes: ['colleague', 'him'],
      relationships: ['colleague', 'boss'],
    },
    {
      name: 'Premium Pen & Watch Gift Set',
      slug: 'premium-pen-watch-gift-set',
      description: 'An exclusive gift set pairing a Swiss automatic watch with a handcrafted fountain pen in a shared walnut presentation box. The watch features a minimalist silver dial and Italian leather strap. Engravable.',
      price: 4800,
      compareAtPrice: null,
      categorySlug: 'office-corporate-gifts',
      images: ['/images/products/corp-gift-2.jpg'],
      stock: 8,
      rating: 4.9,
      reviewCount: 18,
      featured: true,
      tags: ['watch', 'pen', 'gift-set', 'corporate', 'engravable', 'new-arrival'],
      occasions: ['diwali', 'retirement'],
      recipientTypes: ['him'],
      relationships: ['boss', 'colleague'],
    },
    {
      name: 'Crystal Desk Organizer',
      slug: 'crystal-desk-organizer',
      description: 'A stunning lead crystal desk organizer with multiple compartments for pens, cards, and paper clips. The hand-cut facets create a brilliant play of light. A sophisticated addition to any executive desk.',
      price: 680,
      compareAtPrice: null,
      categorySlug: 'office-desk',
      images: ['/images/products/desk-1.jpg'],
      stock: 12,
      rating: 4.7,
      reviewCount: 34,
      featured: true,
      tags: ['crystal', 'desk', 'organizer', 'executive'],
      occasions: ['promotion', 'retirement'],
      recipientTypes: ['him', 'her'],
      relationships: ['colleague', 'boss'],
    },
    {
      name: 'Premium Leather Journal',
      slug: 'premium-leather-journal',
      description: 'A hand-stitched full-grain leather journal with 200 pages of fountain-pen-friendly cream paper. Features a wrap-around leather tie, gilt edges, and a ribbon bookmark. Acid-free 120gsm from an Italian mill.',
      price: 320,
      compareAtPrice: 400,
      categorySlug: 'office-stationery',
      images: ['/images/products/stationery-1.jpg'],
      stock: 22,
      rating: 4.8,
      reviewCount: 73,
      featured: true,
      tags: ['journal', 'leather', 'hand-stitched', 'italian-paper'],
      occasions: ['birthday', 'promotion'],
      recipientTypes: ['him', 'her'],
      relationships: ['friend', 'colleague'],
    },
    {
      name: 'Gold Fountain Pen Set',
      slug: 'gold-fountain-pen-set',
      description: 'A prestigious fountain pen and ballpoint pen set in solid brass with 24K gold plating. The fountain pen features a rhodium-plated 18K gold nib. Presented in a velvet-lined lacquer box. Engravable.',
      price: 1200,
      compareAtPrice: null,
      categorySlug: 'office-stationery',
      images: ['/images/products/stationery-2.jpg'],
      stock: 8,
      rating: 4.9,
      reviewCount: 29,
      featured: true,
      tags: ['fountain-pen', 'gold', '24K', 'engravable'],
      occasions: ['promotion', 'retirement', 'diwali'],
      recipientTypes: ['him', 'her'],
      relationships: ['boss', 'colleague', 'parent'],
    },
  ]

  for (const p of officeProducts) {
    await createProduct(p)
  }

  // ─── New Arrivals Products ───
  const newArrivalsProducts = [
    {
      name: 'Smart Luxury Watch Gold Edition',
      slug: 'smart-luxury-watch-gold-edition',
      description: 'The latest in luxury smartwatch technology. 18K rose gold case with sapphire crystal display, health monitoring suite, and 7-day battery life. Seamlessly blends traditional elegance with cutting-edge innovation.',
      price: 8500,
      compareAtPrice: 9800,
      categorySlug: 'new-arrivals',
      images: ['/images/products/new-arrival-1.jpg'],
      stock: 10,
      rating: 4.9,
      reviewCount: 15,
      featured: true,
      tags: ['smart-watch', 'gold', 'luxury-tech', 'new-arrival'],
      occasions: ['birthday', 'anniversary'],
      recipientTypes: ['him'],
      relationships: ['spouse', 'friend'],
    },
    {
      name: 'Heritage Silk Scarf Collection',
      slug: 'heritage-silk-scarf-collection',
      description: 'A limited-edition silk twill scarf featuring hand-painted heritage motifs. 100% Mulberry silk with hand-rolled edges. Each scarf comes numbered in a signature gift box. A collector\'s dream.',
      price: 680,
      compareAtPrice: null,
      categorySlug: 'new-arrivals',
      images: ['/images/products/new-arrival-2.jpg'],
      stock: 25,
      rating: 4.8,
      reviewCount: 22,
      featured: true,
      tags: ['silk-scarf', 'heritage', 'limited-edition', 'new-arrival'],
      occasions: ['birthday', 'diwali'],
      recipientTypes: ['her'],
      relationships: ['friend', 'spouse'],
    },
    {
      name: 'Artisan Gold Leaf Chocolate Box',
      slug: 'artisan-gold-leaf-chocolate-box',
      description: 'A stunning box of 24 handcrafted chocolates, each adorned with edible gold leaf. Flavors include single-origin dark ganache, salted caramel, rose pistachio, and champagne truffle. Arrives in a velvet-lined box.',
      price: 450,
      compareAtPrice: 550,
      categorySlug: 'new-arrivals',
      images: ['/images/products/new-arrival-4.jpg'],
      stock: 30,
      rating: 4.9,
      reviewCount: 34,
      featured: true,
      tags: ['chocolate', 'gold-leaf', 'artisan', 'gourmet', 'new-arrival'],
      occasions: ['diwali', 'christmas', 'birthday'],
      recipientTypes: ['him', 'her', 'couple'],
      relationships: ['friend', 'spouse', 'colleague'],
    },
  ]

  for (const p of newArrivalsProducts) {
    await createProduct(p)
  }

  // ─── Create Admin Permissions ───
  const adminPermissions = [
    'products.manage', 'orders.manage', 'users.approve', 'users.manage',
    'reports.view', 'settings.manage', 'inventory.manage', 'accounting.view',
    'corporate.manage', 'wiki.manage', 'support.manage', 'coupons.manage',
  ]

  for (const perm of adminPermissions) {
    await prisma.userPermission.upsert({
      where: {
        userId_permission: { userId: adminUser.id, permission: perm },
      },
      update: {},
      create: { userId: adminUser.id, permission: perm },
    })
  }

  console.log('\n✅ Seed completed successfully!')
  console.log(`  Categories: ${Object.keys(categoryMap).length}`)
  console.log(`  Products: ${productCounter - 10001}`)
  console.log(`  Admin user: admin@3boxesluxury.com / admin123`)
  console.log(`  Admin user: pmkshar@gmail.com / admin123`)
  console.log(`  Regular user: user@3boxesluxury.com / user123`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
