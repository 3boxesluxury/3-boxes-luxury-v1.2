/**
 * Seed script: Create hierarchical categories matching the Shopify CATEGORY_HIERARCHY
 * 
 * Run: node prisma/seed-hierarchical-categories.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hierarchical category structure matching shopify.ts CATEGORY_HIERARCHY
const HIERARCHICAL_CATEGORIES = [
  {
    name: 'Couple',
    slug: 'couple',
    description: 'Gifts and experiences for couples',
    children: [
      { name: 'Couple Friendly', slug: 'couple-friendly', description: 'Couple friendly gifts and experiences' },
      { name: 'Romantic Gifts', slug: 'romantic-gifts', description: 'Thoughtful romantic gift experiences' },
    ],
  },
  {
    name: 'Men',
    slug: 'men',
    description: 'Gifts and products for men',
    children: [
      { name: 'Accessories', slug: 'men-accessories', description: "Men's accessories" },
      { name: 'Shirts', slug: 'men-shirts', description: 'Premium shirts for men' },
      { name: 'T-Shirts & Polos', slug: 'men-tshirts', description: 'Casual t-shirts and polos for men' },
      { name: 'Fragrances', slug: 'men-fragrances', description: 'Signature fragrances for men' },
      { name: 'Watches', slug: 'men-watches', description: 'Luxury watches for men' },
      { name: 'Leather Goods', slug: 'men-leather', description: 'Premium leather goods for men' },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    description: 'Gifts and products for women',
    children: [
      { name: 'Jewelry', slug: 'women-jewelry', description: 'Exquisite jewelry for women' },
      { name: 'Sarees', slug: 'women-sarees', description: 'Handwoven and designer sarees' },
      { name: 'Fashion', slug: 'women-fashion', description: 'Designer fashion for women' },
      { name: 'Fragrances', slug: 'women-fragrances', description: 'Signature fragrances for women' },
      { name: 'Accessories', slug: 'women-accessories', description: "Women's accessories" },
    ],
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Gifts and products for kids',
    children: [
      { name: 'Toys & Games', slug: 'kids-toys', description: 'Premium toys and games' },
      { name: 'Kids Fashion', slug: 'kids-fashion', description: 'Fashion for kids' },
    ],
  },
  {
    name: 'Home',
    slug: 'home',
    description: 'Home and living products',
    children: [
      { name: 'Home Decor', slug: 'home-decor', description: 'Luxurious home decor' },
      { name: 'Candles & Fragrances', slug: 'home-candles', description: 'Scented candles and home fragrances' },
      { name: 'Living', slug: 'home-living', description: 'Home and living essentials' },
    ],
  },
  {
    name: 'Office',
    slug: 'office',
    description: 'Office and corporate products',
    children: [
      { name: 'Corporate Gifts', slug: 'office-corporate-gifts', description: 'Corporate gifting solutions' },
      { name: 'Desk Accessories', slug: 'office-desk', description: 'Premium desk accessories' },
      { name: 'Stationery', slug: 'office-stationery', description: 'Fine stationery' },
    ],
  },
  {
    name: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'Latest additions to our collection',
    children: [],
  },
];

// Legacy flat categories for backwards compatibility with existing products
const LEGACY_FLAT_CATEGORIES = [
  { name: 'Watches', slug: 'watches', description: 'Luxury timepieces from world-renowned makers' },
  { name: 'Jewelry', slug: 'jewelry', description: 'Exquisite jewelry crafted with precious stones and metals' },
  { name: 'Leather Goods', slug: 'leather-goods', description: 'Premium leather bags, wallets, and accessories' },
  { name: 'Fragrances', slug: 'fragrances', description: "Signature scents from the world's finest perfumers" },
  { name: 'Fashion', slug: 'fashion', description: 'Designer clothing and haute couture collections' },
  { name: 'Home & Living', slug: 'home-living', description: 'Luxurious home decor and lifestyle accessories' },
  { name: 'Sarees', slug: 'sarees', description: 'Handwoven silk and designer sarees for every occasion' },
  { name: 'Toys', slug: 'toys', description: 'Premium collectible toys and luxury gifts for all ages' },
  { name: 'Romantic Gifts', slug: 'romantic-gifts', description: 'Thoughtful gift experiences to express your love' },
  { name: 'Couple Friendly Gifts', slug: 'couple-friendly-gifts', description: 'Gift experiences for couples to share together' },
  { name: "Men's Shirts & T-Shirts", slug: 'mens-shirts', description: 'Premium shirts and t-shirts for the modern gentleman' },
  { name: 'Corporate Gifts', slug: 'corporate-gifts', description: 'Corporate gifting solutions' },
  { name: 'Stationery', slug: 'stationery', description: 'Fine stationery' },
  { name: 'Desk Accessories', slug: 'desk-accessories', description: 'Premium desk accessories' },
];

async function seedHierarchicalCategories() {
  console.log('Seeding hierarchical categories...');

  // First, ensure legacy flat categories exist (for backwards compatibility with existing products)
  for (const cat of LEGACY_FLAT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { name: cat.name, slug: cat.slug, description: cat.description },
    });
  }
  console.log('Ensured ' + LEGACY_FLAT_CATEGORIES.length + ' legacy flat categories exist');

  // Create hierarchical parent + child categories
  let totalCreated = 0;
  for (const parent of HIERARCHICAL_CATEGORIES) {
    // Create or update parent category
    const parentRecord = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, description: parent.description },
      create: { name: parent.name, slug: parent.slug, description: parent.description },
    });
    totalCreated++;
    console.log('  Parent: ' + parent.name + ' (id: ' + parentRecord.id + ')');

    // Create children
    for (const child of parent.children) {
      const childRecord = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          description: child.description,
          parentId: parentRecord.id,
        },
        create: {
          name: child.name,
          slug: child.slug,
          description: child.description,
          parentId: parentRecord.id,
        },
      });
      totalCreated++;
      console.log('    Child: ' + child.name + ' (id: ' + childRecord.id + ', parentId: ' + parentRecord.id + ')');
    }
  }

  console.log('\nCreated/updated ' + totalCreated + ' hierarchical categories');
  console.log('Category seeding complete!');
}

seedHierarchicalCategories()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });