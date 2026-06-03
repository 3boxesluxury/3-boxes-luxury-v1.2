/**
 * Script to add Corporate Gifts and New Arrivals products
 * Task ID: 2
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🚀 Starting product seeding...\n')

  // ─── Step 1: Find or create Corporate Gifts category ───
  let corporateGiftsCategory = await db.category.findFirst({
    where: {
      OR: [
        { slug: 'corporate-gifts' },
        { slug: 'office-corporate-gifts' },
      ],
    },
  })

  if (!corporateGiftsCategory) {
    console.log('📦 Corporate Gifts category not found, creating under Office...')
    const officeCategory = await db.category.findFirst({
      where: { slug: 'office' },
    })
    if (!officeCategory) {
      throw new Error('Office parent category not found')
    }
    corporateGiftsCategory = await db.category.create({
      data: {
        name: 'Corporate Gifts',
        slug: 'office-corporate-gifts',
        description: 'Premium corporate gifting solutions for every occasion',
        parentId: officeCategory.id,
        order: 0,
      },
    })
    console.log(`✅ Created Corporate Gifts category: ${corporateGiftsCategory.id}`)
  } else {
    console.log(`✅ Found Corporate Gifts category: ${corporateGiftsCategory.name} (${corporateGiftsCategory.slug})`)
  }

  // ─── Step 2: Find or create New Arrivals category ───
  let newArrivalsCategory = await db.category.findFirst({
    where: { slug: 'new-arrivals' },
  })

  if (!newArrivalsCategory) {
    console.log('🆕 New Arrivals category not found, creating...')
    newArrivalsCategory = await db.category.create({
      data: {
        name: 'New Arrivals',
        slug: 'new-arrivals',
        description: 'Our latest arrivals — fresh finds across all categories',
        order: 100,
      },
    })
    console.log(`✅ Created New Arrivals category: ${newArrivalsCategory.id}`)
  } else {
    console.log(`✅ Found New Arrivals category: ${newArrivalsCategory.name} (${newArrivalsCategory.slug})`)
  }

  // ─── Step 3: Ensure Office subcategories exist ───
  let officeDeskCategory = await db.category.findFirst({
    where: { slug: 'office-desk' },
  })
  let officeStationeryCategory = await db.category.findFirst({
    where: { slug: 'office-stationery' },
  })

  const officeCategory = await db.category.findFirst({
    where: { slug: 'office' },
  })

  if (!officeDeskCategory && officeCategory) {
    officeDeskCategory = await db.category.create({
      data: {
        name: 'Desk Accessories',
        slug: 'office-desk',
        description: 'Premium desk accessories for the modern professional',
        parentId: officeCategory.id,
        order: 1,
      },
    })
    console.log(`✅ Created Desk Accessories category`)
  }

  if (!officeStationeryCategory && officeCategory) {
    officeStationeryCategory = await db.category.create({
      data: {
        name: 'Stationery',
        slug: 'office-stationery',
        description: 'Elegant stationery for business and personal use',
        parentId: officeCategory.id,
        order: 2,
      },
    })
    console.log(`✅ Created Stationery category`)
  }

  // ─── Step 4: Add Corporate Gift Products ───
  console.log('\n🎁 Adding Corporate Gift products...')

  const corporateGiftProducts = [
    {
      productNumber: 'CG-001',
      name: 'Executive Gift Box',
      slug: 'executive-gift-box',
      description: 'A luxurious executive gift box featuring premium leather accessories, artisan chocolates, and a handcrafted wooden keepsake. Perfect for celebrating milestones and showing appreciation to valued colleagues and business partners.',
      price: 4500,
      compareAtPrice: 5500,
      images: JSON.stringify(['/images/products/corp-gift-1.jpg', '/images/products/desk-1.jpg', '/images/products/stationery-1.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 25,
      stockStatus: 'in_stock',
      rating: 4.8,
      reviewCount: 12,
      featured: true,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'executive']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'CG-002',
      name: 'Premium Desk Organizer',
      slug: 'premium-desk-organizer',
      description: 'Elevate any workspace with this premium desk organizer crafted from sustainable bamboo and accented with brushed brass fittings. Features compartments for pens, cards, and mobile devices — a thoughtful gift for the organized professional.',
      price: 2200,
      compareAtPrice: 2800,
      images: JSON.stringify(['/images/products/desk-2.jpg', '/images/products/desk-3.jpg', '/images/products/corp-gift-2.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 40,
      stockStatus: 'in_stock',
      rating: 4.6,
      reviewCount: 8,
      featured: false,
      tags: JSON.stringify(['corporate', 'premium', 'desk', 'organizer']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'CG-003',
      name: 'Corporate Hamper Deluxe',
      slug: 'corporate-hamper-deluxe',
      description: 'An indulgent corporate hamper overflowing with gourmet treats, artisan coffee, premium tea selections, and handcrafted cookies. Beautifully presented in a signature gift box with custom ribbon — ideal for festive gifting.',
      price: 3500,
      compareAtPrice: 4200,
      images: JSON.stringify(['/images/products/corp-gift-3.jpg', '/images/products/corp-gift-1.jpg', '/images/products/stationery-2.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 30,
      stockStatus: 'in_stock',
      rating: 4.9,
      reviewCount: 15,
      featured: true,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'hamper', 'deluxe']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'CG-004',
      name: 'Business Portfolio Set',
      slug: 'business-portfolio-set',
      description: 'A sophisticated business portfolio set featuring a genuine leather portfolio folder, matching pen, and notepad. Designed for the modern executive who values style and functionality in every meeting.',
      price: 5800,
      compareAtPrice: 6800,
      images: JSON.stringify(['/images/products/desk-1.jpg', '/images/products/leather-1.jpg', '/images/products/stationery-3.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 20,
      stockStatus: 'in_stock',
      rating: 4.7,
      reviewCount: 6,
      featured: true,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'leather', 'portfolio']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'CG-005',
      name: 'Luxury Pen & Notebook Set',
      slug: 'luxury-pen-notebook-set',
      description: 'An exquisite pairing of a handcrafted fountain pen with a premium Italian leather notebook. The pen features a gold-plated nib and the notebook is bound with archival-quality paper — the perfect companion for the discerning professional.',
      price: 1500,
      compareAtPrice: 1900,
      images: JSON.stringify(['/images/products/stationery-1.jpg', '/images/products/stationery-2.jpg', '/images/products/desk-2.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 50,
      stockStatus: 'in_stock',
      rating: 4.5,
      reviewCount: 10,
      featured: false,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'pen', 'notebook']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'CG-006',
      name: 'Corporate Gift Basket',
      slug: 'corporate-gift-basket',
      description: 'A thoughtfully curated gift basket featuring premium dry fruits, artisan chocolates, scented candles, and a personalized thank-you card. Elegantly wrapped in corporate branding — making every professional relationship feel valued.',
      price: 2800,
      compareAtPrice: 3400,
      images: JSON.stringify(['/images/products/corp-gift-2.jpg', '/images/products/corp-gift-3.jpg', '/images/products/desk-3.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 35,
      stockStatus: 'in_stock',
      rating: 4.6,
      reviewCount: 9,
      featured: true,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'basket', 'dry-fruits']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'CG-007',
      name: 'Premium Office Welcome Kit',
      slug: 'premium-office-welcome-kit',
      description: 'Welcome new team members in style with this premium onboarding kit. Includes a branded mug, premium notebook, executive pen, desk organizer, and a personalized welcome card — everything needed for a great first day.',
      price: 1800,
      compareAtPrice: 2200,
      images: JSON.stringify(['/images/products/corp-gift-1.jpg', '/images/products/desk-1.jpg', '/images/products/stationery-3.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 45,
      stockStatus: 'in_stock',
      rating: 4.4,
      reviewCount: 7,
      featured: false,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'welcome', 'onboarding']),
      occasions: JSON.stringify(['congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'friend']),
      relationships: JSON.stringify(['colleague']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'CG-008',
      name: 'Executive Leather Accessory Set',
      slug: 'executive-leather-accessory-set',
      description: 'A distinguished leather accessory set for the modern executive — includes a premium card holder, key organizer, and luggage tag, all crafted from full-grain Italian leather with subtle embossing. A gift that leaves a lasting impression.',
      price: 8000,
      compareAtPrice: 9500,
      images: JSON.stringify(['/images/products/leather-1.jpg', '/images/products/leather-2.jpg', '/images/products/leather-3.jpg']),
      categoryId: corporateGiftsCategory.id,
      stock: 15,
      stockStatus: 'low_stock',
      rating: 4.9,
      reviewCount: 4,
      featured: true,
      tags: JSON.stringify(['corporate', 'premium', 'gift-set', 'leather', 'executive']),
      occasions: JSON.stringify(['diwali', 'christmas', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['colleague', 'boss', 'friend']),
      relationships: JSON.stringify(['colleague', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
  ]

  for (const product of corporateGiftProducts) {
    const existing = await db.product.findFirst({
      where: {
        OR: [
          { productNumber: product.productNumber },
          { slug: product.slug },
        ],
      },
    })
    if (existing) {
      console.log(`  ⏭️  Skipping ${product.productNumber}: ${product.name} (already exists)`)
      continue
    }
    const created = await db.product.create({ data: product })
    console.log(`  ✅ Created ${created.productNumber}: ${created.name} (₹${created.price})`)
  }

  // ─── Step 5: Add New Arrivals Products ───
  console.log('\n🆕 Adding New Arrivals products...')

  // Find category IDs for different product types
  const womenJewelryCategory = await db.category.findFirst({ where: { slug: 'women-jewelry' } })
  const menWatchesCategory = await db.category.findFirst({ where: { slug: 'men-watches' } })
  const womenFashionCategory = await db.category.findFirst({ where: { slug: 'women-fashion' } })
  const womenSareesCategory = await db.category.findFirst({ where: { slug: 'women-sarees' } })
  const womenFragrancesCategory = await db.category.findFirst({ where: { slug: 'women-fragrances' } })
  const menLeatherCategory = await db.category.findFirst({ where: { slug: 'men-leather' } })
  const menFragrancesCategory = await db.category.findFirst({ where: { slug: 'men-fragrances' } })
  const menAccessoriesCategory = await db.category.findFirst({ where: { slug: 'men-accessories' } })
  const homeCandlesCategory = await db.category.findFirst({ where: { slug: 'home-candles' } })

  const newArrivalProducts = [
    {
      productNumber: 'NA-001',
      name: 'Crystal Drop Earrings',
      slug: 'crystal-drop-earrings',
      description: 'Stunning crystal drop earrings that catch the light with every movement. Hand-set Swarovski crystals on a delicate sterling silver frame, these earrings add a touch of glamour to any outfit — from boardroom to cocktail hour.',
      price: 2800,
      compareAtPrice: 3500,
      images: JSON.stringify(['/images/products/jewelry-4.jpg', '/images/products/jewelry-5.jpg', '/images/products/jewelry-6.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 30,
      stockStatus: 'in_stock',
      rating: 4.7,
      reviewCount: 5,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'earrings', 'crystal', 'jewelry']),
      occasions: JSON.stringify(['birthday', 'anniversary', 'valentines', 'wedding']),
      recipientTypes: JSON.stringify(['her', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'sibling']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'NA-002',
      name: 'Titanium Sport Watch',
      slug: 'titanium-sport-watch',
      description: 'A bold titanium sport watch designed for the active gentleman. Features a scratch-resistant sapphire crystal, 100m water resistance, and a precision Swiss quartz movement. The perfect blend of rugged durability and sophisticated style.',
      price: 15500,
      compareAtPrice: 18500,
      images: JSON.stringify(['/images/products/watch-3.jpg', '/images/products/watch-4.jpg', '/images/products/watch-1.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 12,
      stockStatus: 'in_stock',
      rating: 4.8,
      reviewCount: 3,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'watch', 'titanium', 'sport']),
      occasions: JSON.stringify(['birthday', 'anniversary', 'congratulations', 'diwali']),
      recipientTypes: JSON.stringify(['him', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'NA-003',
      name: 'Silk Blend Saree',
      slug: 'silk-blend-saree-new',
      description: 'A breathtaking silk blend saree featuring intricate zari work and a rich pallu design. The lightweight fabric drapes beautifully, making it perfect for festive celebrations, weddings, and special occasions. Comes with an unstitched blouse piece.',
      price: 4500,
      compareAtPrice: 5500,
      images: JSON.stringify(['/images/products/saree-6.jpg', '/images/products/saree-7.jpg', '/images/products/saree-8.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 20,
      stockStatus: 'in_stock',
      rating: 4.9,
      reviewCount: 8,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'saree', 'silk', 'festive']),
      occasions: JSON.stringify(['diwali', 'wedding', 'anniversary', 'birthday']),
      recipientTypes: JSON.stringify(['her', 'friend', 'parents']),
      relationships: JSON.stringify(['spouse', 'parent', 'friend']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'NA-004',
      name: 'Rose Gold Pendant Necklace',
      slug: 'rose-gold-pendant-necklace',
      description: 'An elegant rose gold pendant necklace featuring a delicate heart motif adorned with micro-pavé diamonds. The adjustable chain allows for versatile styling — wear it as a choker or a longer pendant. A timeless piece she\'ll cherish forever.',
      price: 8500,
      compareAtPrice: 10200,
      images: JSON.stringify(['/images/products/jewelry-7.jpg', '/images/products/jewelry-8.jpg', '/images/products/jewelry-9.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 18,
      stockStatus: 'in_stock',
      rating: 4.8,
      reviewCount: 6,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'necklace', 'rose-gold', 'jewelry']),
      occasions: JSON.stringify(['valentines', 'anniversary', 'birthday', 'wedding']),
      recipientTypes: JSON.stringify(['her', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'sibling']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'NA-005',
      name: 'Italian Leather Weekender Bag',
      slug: 'italian-leather-weekender-bag',
      description: 'Crafted from premium full-grain Italian leather, this weekender bag is the ultimate travel companion. Features a spacious main compartment, multiple organizer pockets, and detachable shoulder strap. Ages beautifully with use — truly a gift that keeps giving.',
      price: 7200,
      compareAtPrice: 8800,
      images: JSON.stringify(['/images/products/leather-2.jpg', '/images/products/leather-3.jpg', '/images/products/leather-1.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 10,
      stockStatus: 'low_stock',
      rating: 4.9,
      reviewCount: 4,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'leather', 'bag', 'travel']),
      occasions: JSON.stringify(['birthday', 'congratulations', 'diwali', 'christmas']),
      recipientTypes: JSON.stringify(['him', 'her', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'boss']),
      deliveryEstimate: '3-5 business days',
    },
    {
      productNumber: 'NA-006',
      name: 'Oud & Rose Parfum',
      slug: 'oud-rose-parfum',
      description: 'An enchanting fusion of rare Arabian oud and Bulgarian rose, this parfum opens with notes of saffron and bergamot, unfolds into a heart of rose absolute, and settles into a warm base of oud, sandalwood, and amber. A truly captivating fragrance.',
      price: 3800,
      compareAtPrice: 4500,
      images: JSON.stringify(['/images/products/fragrance-1.jpg', '/images/products/fragrance-2.jpg', '/images/products/fragrance-3.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 25,
      stockStatus: 'in_stock',
      rating: 4.7,
      reviewCount: 7,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'fragrance', 'oud', 'rose', 'parfum']),
      occasions: JSON.stringify(['birthday', 'anniversary', 'valentines', 'diwali']),
      recipientTypes: JSON.stringify(['him', 'her', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'parent']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'NA-007',
      name: 'Boho Maxi Dress',
      slug: 'boho-maxi-dress',
      description: 'A free-spirited boho maxi dress in a stunning floral print, featuring a flattering V-neckline, flowing silhouette, and delicate crochet trim. Perfect for brunches, garden parties, and sun-kissed vacations. Made from breathable organic cotton.',
      price: 2200,
      compareAtPrice: 2800,
      images: JSON.stringify(['/images/products/fashion-1.jpg', '/images/products/fashion-2.jpg', '/images/products/fashion-3.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 35,
      stockStatus: 'in_stock',
      rating: 4.5,
      reviewCount: 9,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'fashion', 'dress', 'boho']),
      occasions: JSON.stringify(['birthday', 'congratulations', 'thank-you']),
      recipientTypes: JSON.stringify(['her', 'friend']),
      relationships: JSON.stringify(['spouse', 'friend', 'sibling']),
      deliveryEstimate: '2-4 business days',
    },
    {
      productNumber: 'NA-008',
      name: 'Heritage Gold Bangle Set',
      slug: 'heritage-gold-bangle-set',
      description: 'A magnificent set of three heritage gold bangles featuring traditional Indian filigree work and modern minimalist design. Each bangle is crafted with 22kt gold plating over sterling silver — perfect for stacking or wearing individually for an elegant statement.',
      price: 6200,
      compareAtPrice: 7500,
      images: JSON.stringify(['/images/products/jewelry-1.jpg', '/images/products/jewelry-2.jpg', '/images/products/jewelry-3.jpg']),
      categoryId: newArrivalsCategory.id,
      stock: 15,
      stockStatus: 'in_stock',
      rating: 4.8,
      reviewCount: 11,
      featured: true,
      tags: JSON.stringify(['new-arrival', 'new', 'bangle', 'gold', 'jewelry', 'heritage']),
      occasions: JSON.stringify(['diwali', 'wedding', 'anniversary', 'birthday']),
      recipientTypes: JSON.stringify(['her', 'friend', 'parents']),
      relationships: JSON.stringify(['spouse', 'parent', 'sibling']),
      deliveryEstimate: '3-5 business days',
    },
  ]

  for (const product of newArrivalProducts) {
    const existing = await db.product.findFirst({
      where: {
        OR: [
          { productNumber: product.productNumber },
          { slug: product.slug },
        ],
      },
    })
    if (existing) {
      console.log(`  ⏭️  Skipping ${product.productNumber}: ${product.name} (already exists)`)
      continue
    }
    const created = await db.product.create({ data: product })
    console.log(`  ✅ Created ${created.productNumber}: ${created.name} (₹${created.price})`)
  }

  // ─── Summary ───
  console.log('\n📊 Final Summary:')

  const corpGiftCount = await db.product.count({
    where: { category: { slug: 'office-corporate-gifts' } },
  })
  const newArrivalCount = await db.product.count({
    where: { category: { slug: 'new-arrivals' } },
  })
  const totalProducts = await db.product.count()

  console.log(`  Corporate Gifts products: ${corpGiftCount}`)
  console.log(`  New Arrivals products: ${newArrivalCount}`)
  console.log(`  Total products in database: ${totalProducts}`)

  console.log('\n✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
