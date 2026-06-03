import { db } from "@/lib/db";

// ─── Version 1.2 Category Structure ───
// Parent categories first, then subcategories with parentSlug references

const parentCategories = [
  {
    name: "Couple",
    slug: "couple",
    description: "Curated gifts and experiences for couples",
    image: "/images/categories/couple.jpg",
    order: 1,
  },
  {
    name: "Men",
    slug: "men",
    description: "Luxury gifts and essentials for him",
    image: "/images/categories/men.jpg",
    order: 2,
  },
  {
    name: "Women",
    slug: "women",
    description: "Elegant gifts and essentials for her",
    image: "/images/categories/women.jpg",
    order: 3,
  },
  {
    name: "Kids",
    slug: "kids",
    description: "Premium toys, games, and fashion for children",
    image: "/images/categories/kids.jpg",
    order: 4,
  },
  {
    name: "Home",
    slug: "home",
    description: "Luxurious home décor and lifestyle accessories",
    image: "/images/categories/home.jpg",
    order: 5,
  },
  {
    name: "Office",
    slug: "office",
    description: "Corporate gifts, desk accessories, and stationery",
    image: "/images/categories/office.jpg",
    order: 6,
  },
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "The latest additions to our luxury collection",
    image: "/images/categories/new-arrivals.jpg",
    order: 7,
  },
];

const subcategories = [
  // Couple
  {
    name: "Couple Friendly",
    slug: "couple-friendly",
    description: "Thoughtful gift experiences for couples to share together",
    image: "/images/categories/couple-friendly.jpg",
    order: 1,
    parentSlug: "couple",
  },

  // Men
  {
    name: "Accessories",
    slug: "men-accessories",
    description: "Premium accessories for the modern gentleman",
    image: "/images/categories/men-accessories.jpg",
    order: 1,
    parentSlug: "men",
  },
  {
    name: "Shirts",
    slug: "men-shirts",
    description: "Premium dress shirts and formal shirts",
    image: "/images/categories/mens-shirts.jpg",
    order: 2,
    parentSlug: "men",
  },
  {
    name: "T-Shirts & Polos",
    slug: "men-tshirts",
    description: "Casual luxury t-shirts, polos, and henleys",
    image: "/images/categories/mens-tshirts.jpg",
    order: 3,
    parentSlug: "men",
  },
  {
    name: "Fragrances",
    slug: "men-fragrances",
    description: "Signature masculine scents from world-renowned perfumers",
    image: "/images/categories/men-fragrances.jpg",
    order: 4,
    parentSlug: "men",
  },
  {
    name: "Watches",
    slug: "men-watches",
    description: "Luxury timepieces from world-renowned makers",
    image: "/images/categories/watches.jpg",
    order: 5,
    parentSlug: "men",
  },
  {
    name: "Leather Goods",
    slug: "men-leather",
    description: "Premium leather bags, wallets, and accessories",
    image: "/images/categories/leather.jpg",
    order: 6,
    parentSlug: "men",
  },

  // Women
  {
    name: "Jewelry",
    slug: "women-jewelry",
    description: "Exquisite jewelry crafted with precious stones and metals",
    image: "/images/categories/jewelry.jpg",
    order: 1,
    parentSlug: "women",
  },
  {
    name: "Sarees",
    slug: "women-sarees",
    description: "Handwoven silk and designer sarees for every occasion",
    image: "/images/categories/sarees.jpg",
    order: 2,
    parentSlug: "women",
  },
  {
    name: "Fashion",
    slug: "women-fashion",
    description: "Designer clothing and haute couture collections",
    image: "/images/categories/fashion.jpg",
    order: 3,
    parentSlug: "women",
  },
  {
    name: "Fragrances",
    slug: "women-fragrances",
    description: "Captivating feminine scents from master perfumers",
    image: "/images/categories/women-fragrances.jpg",
    order: 4,
    parentSlug: "women",
  },
  {
    name: "Accessories",
    slug: "women-accessories",
    description: "Elegant accessories to complete every look",
    image: "/images/categories/women-accessories.jpg",
    order: 5,
    parentSlug: "women",
  },

  // Kids
  {
    name: "Toys & Games",
    slug: "kids-toys",
    description: "Premium collectible toys and luxury gifts for all ages",
    image: "/images/categories/toys.jpg",
    order: 1,
    parentSlug: "kids",
  },
  {
    name: "Kids Fashion",
    slug: "kids-fashion",
    description: "Designer clothing and accessories for children",
    image: "/images/categories/kids-fashion.jpg",
    order: 2,
    parentSlug: "kids",
  },

  // Home
  {
    name: "Home Décor",
    slug: "home-decor",
    description: "Artisan décor pieces to elevate your living space",
    image: "/images/categories/home-decor.jpg",
    order: 1,
    parentSlug: "home",
  },
  {
    name: "Candles & Fragrances",
    slug: "home-candles",
    description: "Hand-poured candles and home fragrance collections",
    image: "/images/categories/home-candles.jpg",
    order: 2,
    parentSlug: "home",
  },
  {
    name: "Living",
    slug: "home-living",
    description: "Luxurious textiles and lifestyle accessories for the home",
    image: "/images/categories/home-living.jpg",
    order: 3,
    parentSlug: "home",
  },

  // Office
  {
    name: "Corporate Gifts",
    slug: "office-corporate-gifts",
    description: "Curated corporate gift hampers and bulk gifting solutions",
    image: "/images/categories/office-corporate-gifts.jpg",
    order: 1,
    parentSlug: "office",
  },
  {
    name: "Desk Accessories",
    slug: "office-desk",
    description: "Elegant desk organizers and workspace accessories",
    image: "/images/categories/office-desk.jpg",
    order: 2,
    parentSlug: "office",
  },
  {
    name: "Stationery",
    slug: "office-stationery",
    description: "Premium journals, pens, and writing instruments",
    image: "/images/categories/office-stationery.jpg",
    order: 3,
    parentSlug: "office",
  },
];

const products = [
  // ═══════════════════════════════════════════════════
  // MEN - Watches (men-watches)
  // ═══════════════════════════════════════════════════
  {
    name: "Royal Chronograph Gold",
    slug: "royal-chronograph-gold",
    description: "An exquisite 18K gold chronograph with Swiss movement, sapphire crystal, and alligator leather strap. Water-resistant to 100 meters with moon phase complication.",
    price: 12500,
    compareAtPrice: 15000,
    images: JSON.stringify(["/images/products/watch-1.jpg", "/images/products/watch-1-alt.jpg"]),
    categorySlug: "men-watches",
    stock: 5,
    rating: 4.9,
    reviewCount: 47,
    featured: true,
    tags: JSON.stringify(["gold", "chronograph", "swiss", "luxury", "new-arrival"]),
  },
  {
    name: "Midnight Tourbillon",
    slug: "midnight-tourbillon",
    description: "A masterpiece of horological engineering featuring a flying tourbillon, midnight blue dial, and platinum case. Limited edition of 50 pieces worldwide.",
    price: 45000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/watch-2.jpg", "/images/products/watch-2-alt.jpg"]),
    categorySlug: "men-watches",
    stock: 2,
    rating: 5.0,
    reviewCount: 12,
    featured: true,
    tags: JSON.stringify(["tourbillon", "platinum", "limited", "swiss"]),
  },
  {
    name: "Classic Automatic Silver",
    slug: "classic-automatic-silver",
    description: "Timeless elegance with automatic movement, silver dial, and stainless steel bracelet. A perfect everyday luxury timepiece.",
    price: 4200,
    compareAtPrice: 5000,
    images: JSON.stringify(["/images/products/watch-3.jpg"]),
    categorySlug: "men-watches",
    stock: 15,
    rating: 4.7,
    reviewCount: 89,
    featured: false,
    tags: JSON.stringify(["automatic", "silver", "classic"]),
  },
  {
    name: "Diamond Bezel Diver",
    slug: "diamond-bezel-diver",
    description: "A stunning dive watch with diamond-set bezel, ceramic insert, and 300m water resistance. Where adventure meets luxury.",
    price: 18500,
    compareAtPrice: 22000,
    images: JSON.stringify(["/images/products/watch-4.jpg"]),
    categorySlug: "men-watches",
    stock: 8,
    rating: 4.8,
    reviewCount: 34,
    featured: true,
    tags: JSON.stringify(["diamond", "diver", "ceramic", "new-arrival"]),
  },

  // ═══════════════════════════════════════════════════
  // WOMEN - Jewelry (women-jewelry)
  // ═══════════════════════════════════════════════════
  {
    name: "Eternal Diamond Necklace",
    slug: "eternal-diamond-necklace",
    description: "A breathtaking 5-carat diamond pendant on an 18K white gold chain. GIA certified, VS1 clarity, D color.",
    price: 28000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-1.jpg", "/images/products/jewelry-1-alt.jpg"]),
    categorySlug: "women-jewelry",
    stock: 3,
    rating: 5.0,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["diamond", "necklace", "white-gold"]),
  },
  {
    name: "Ruby Empire Ring",
    slug: "ruby-empire-ring",
    description: "A magnificent 3-carat Burmese ruby surrounded by diamonds, set in 18K rose gold. A statement piece of extraordinary beauty.",
    price: 35000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-2.jpg"]),
    categorySlug: "women-jewelry",
    stock: 2,
    rating: 4.9,
    reviewCount: 15,
    featured: true,
    tags: JSON.stringify(["ruby", "ring", "rose-gold", "new-arrival"]),
  },
  {
    name: "Sapphire Cascade Earrings",
    slug: "sapphire-cascade-earrings",
    description: "Elegant cascade earrings featuring Ceylon sapphires and diamonds in platinum setting. Total gemstone weight 4.5 carats.",
    price: 8900,
    compareAtPrice: 10500,
    images: JSON.stringify(["/images/products/jewelry-3.jpg"]),
    categorySlug: "women-jewelry",
    stock: 6,
    rating: 4.8,
    reviewCount: 31,
    featured: false,
    tags: JSON.stringify(["sapphire", "earrings", "platinum"]),
  },
  {
    name: "Emerald Tennis Bracelet",
    slug: "emerald-tennis-bracelet",
    description: "A stunning tennis bracelet featuring 5 carats of graduated Colombian emeralds, each surrounded by a halo of brilliant-cut diamonds in 18K white gold. The flexible setting ensures comfort and elegance on the wrist.",
    price: 15800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-4.jpg"]),
    categorySlug: "women-jewelry",
    stock: 4,
    rating: 4.9,
    reviewCount: 19,
    featured: true,
    tags: JSON.stringify(["emerald", "bracelet", "white-gold", "diamond-halo"]),
  },
  {
    name: "South Sea Pearl Choker",
    slug: "south-sea-pearl-choker",
    description: "A magnificent choker of hand-selected South Sea pearls, each 12-13mm with exceptional luster and overtone. Fastened with a diamond-paved platinum clasp. A timeless statement of refined elegance.",
    price: 12500,
    compareAtPrice: 14000,
    images: JSON.stringify(["/images/products/jewelry-5.jpg"]),
    categorySlug: "women-jewelry",
    stock: 5,
    rating: 4.8,
    reviewCount: 24,
    featured: true,
    tags: JSON.stringify(["pearl", "choker", "south-sea", "platinum", "diamond-clasp"]),
  },
  {
    name: "Brilliant Diamond Stud Earrings",
    slug: "brilliant-diamond-stud-earrings",
    description: "Classic diamond stud earrings featuring 2-carat each round brilliant-cut diamonds (GIA certified, F color, VS1 clarity) in platinum four-prong martini settings. The essential luxury staple.",
    price: 18500,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-6.jpg"]),
    categorySlug: "women-jewelry",
    stock: 6,
    rating: 5.0,
    reviewCount: 41,
    featured: true,
    tags: JSON.stringify(["diamond", "studs", "platinum", "GIA", "brilliant-cut"]),
  },
  {
    name: "Kundan Bridal Jewelry Set",
    slug: "kundan-bridal-jewelry-set",
    description: "A breathtaking Kundan bridal set featuring a grand necklace and matching jhumka earrings. Uncut Polki diamonds, Colombian emeralds, and Burmese rubies set in 22K gold using traditional Rajasthani techniques. A bride's dream.",
    price: 22000,
    compareAtPrice: 25000,
    images: JSON.stringify(["/images/products/jewelry-7.jpg"]),
    categorySlug: "women-jewelry",
    stock: 2,
    rating: 5.0,
    reviewCount: 16,
    featured: true,
    tags: JSON.stringify(["kundan", "bridal", "polki", "uncut-diamond", "emerald", "ruby", "22K-gold"]),
  },
  {
    name: "Temple Gold Lakshmi Necklace",
    slug: "temple-gold-lakshmi-necklace",
    description: "A traditional South Indian temple necklace in 22K gold featuring intricately carved Goddess Lakshmi coins with ruby and emerald accents. The coin fringe design is a timeless symbol of prosperity and devotion.",
    price: 9800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-8.jpg"]),
    categorySlug: "women-jewelry",
    stock: 4,
    rating: 4.9,
    reviewCount: 28,
    featured: true,
    tags: JSON.stringify(["temple", "22K-gold", "lakshmi", "south-indian", "ruby", "coin-necklace"]),
  },
  {
    name: "Polki Diamond Jhumka Earrings",
    slug: "polki-diamond-jhumka-earrings",
    description: "Exquisite Polki diamond jhumka earrings featuring uncut diamonds and seed pearls in a traditional bell-shaped design. The gold setting is hand-finished with meenakari enamel work on the reverse. A perfect blend of heritage and luxury.",
    price: 4500,
    compareAtPrice: 5200,
    images: JSON.stringify(["/images/products/jewelry-9.jpg"]),
    categorySlug: "women-jewelry",
    stock: 8,
    rating: 4.8,
    reviewCount: 52,
    featured: true,
    tags: JSON.stringify(["polki", "jhumka", "uncut-diamond", "meenakari", "pearl", "traditional"]),
  },
  {
    name: "Antique Silver Turquoise Cuff",
    slug: "antique-silver-turquoise-cuff",
    description: "A bold oxidized silver cuff bracelet featuring Sleeping Beauty turquoise cabochons set in intricate filigree work. The bohemian-luxury design draws inspiration from Rajasthani tribal jewelry. Adjustable fit.",
    price: 1200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-10.jpg"]),
    categorySlug: "women-jewelry",
    stock: 10,
    rating: 4.6,
    reviewCount: 37,
    featured: false,
    tags: JSON.stringify(["silver", "cuff", "turquoise", "filigree", "boho", "oxidized"]),
  },

  // ═══════════════════════════════════════════════════
  // MEN - Leather Goods (men-leather)
  // ═══════════════════════════════════════════════════
  {
    name: "Heritage Leather Briefcase",
    slug: "heritage-leather-briefcase",
    description: "Handcrafted Italian calfskin leather briefcase with brass hardware. Features laptop compartment, organizer pockets, and detachable shoulder strap.",
    price: 1850,
    compareAtPrice: 2200,
    images: JSON.stringify(["/images/products/leather-1.jpg", "/images/products/leather-1-alt.jpg"]),
    categorySlug: "men-leather",
    stock: 12,
    rating: 4.8,
    reviewCount: 67,
    featured: true,
    tags: JSON.stringify(["briefcase", "italian-leather", "calfskin"]),
  },
  {
    name: "Monogram Travel Trunk",
    slug: "monogram-travel-trunk",
    description: "A legendary monogram canvas trunk with natural cowhide trim. The epitome of luxury travel, handcrafted with over 150 years of heritage.",
    price: 5200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/leather-2.jpg"]),
    categorySlug: "men-leather",
    stock: 4,
    rating: 4.9,
    reviewCount: 28,
    featured: true,
    tags: JSON.stringify(["trunk", "monogram", "travel", "new-arrival"]),
  },
  {
    name: "Bifold Wallet in Epi Leather",
    slug: "bifold-wallet-epi",
    description: "Slim bifold wallet in textured Epi leather with multiple card slots and bill compartment. A refined essential.",
    price: 650,
    compareAtPrice: 780,
    images: JSON.stringify(["/images/products/leather-3.jpg"]),
    categorySlug: "men-leather",
    stock: 25,
    rating: 4.6,
    reviewCount: 112,
    featured: false,
    tags: JSON.stringify(["wallet", "epi-leather", "slim"]),
  },

  // ═══════════════════════════════════════════════════
  // MEN - Fragrances (men-fragrances)
  // ═══════════════════════════════════════════════════
  {
    name: "Noir Absolu Parfum",
    slug: "noir-absolu-parfum",
    description: "An intoxicating blend of black amber, oud wood, and Bulgarian rose. A bold, sophisticated fragrance for the discerning connoisseur.",
    price: 420,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fragrance-1.jpg", "/images/products/fragrance-1-alt.jpg"]),
    categorySlug: "men-fragrances",
    stock: 30,
    rating: 4.8,
    reviewCount: 156,
    featured: true,
    tags: JSON.stringify(["oud", "amber", "masculine"]),
  },
  {
    name: "Vetiver Imperial Cologne",
    slug: "vetiver-imperial-cologne",
    description: "A refined masculine cologne featuring Haitian vetiver, Italian bergamot, and pepper. Timeless sophistication in every spritz.",
    price: 280,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fragrance-3.jpg"]),
    categorySlug: "men-fragrances",
    stock: 50,
    rating: 4.6,
    reviewCount: 178,
    featured: false,
    tags: JSON.stringify(["vetiver", "bergamot", "masculine"]),
  },

  // ═══════════════════════════════════════════════════
  // WOMEN - Fragrances (women-fragrances)
  // ═══════════════════════════════════════════════════
  {
    name: "Jardin Secret Eau de Parfum",
    slug: "jardin-secret-edp",
    description: "A secret garden captured in a bottle — jasmine sambac, tuberose, and fresh fig leaf create an enchanting feminine fragrance.",
    price: 350,
    compareAtPrice: 420,
    images: JSON.stringify(["/images/products/fragrance-2.jpg"]),
    categorySlug: "women-fragrances",
    stock: 40,
    rating: 4.7,
    reviewCount: 203,
    featured: false,
    tags: JSON.stringify(["floral", "jasmine", "feminine"]),
  },

  // ═══════════════════════════════════════════════════
  // WOMEN - Fashion (women-fashion)
  // ═══════════════════════════════════════════════════
  {
    name: "Cashmere Overcoat",
    slug: "cashmere-overcoat",
    description: "Double-breasted overcoat in pure Italian cashmere. Tailored silhouette with satin lining, horn buttons, and hand-finished details.",
    price: 3200,
    compareAtPrice: 3800,
    images: JSON.stringify(["/images/products/fashion-1.jpg", "/images/products/fashion-1-alt.jpg"]),
    categorySlug: "women-fashion",
    stock: 8,
    rating: 4.9,
    reviewCount: 43,
    featured: true,
    tags: JSON.stringify(["cashmere", "overcoat", "italian"]),
  },
  {
    name: "Silk Evening Gown",
    slug: "silk-evening-gown",
    description: "A stunning floor-length gown in pure silk charmeuse with delicate crystal embellishments. Designed for the most memorable occasions.",
    price: 5800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fashion-2.jpg"]),
    categorySlug: "women-fashion",
    stock: 4,
    rating: 5.0,
    reviewCount: 19,
    featured: true,
    tags: JSON.stringify(["silk", "gown", "crystal", "new-arrival"]),
  },
  {
    name: "Tailored Linen Blazer",
    slug: "tailored-linen-blazer",
    description: "Impeccably tailored linen blazer with half-canvas construction. Perfect for warm-weather sophistication.",
    price: 1450,
    compareAtPrice: 1700,
    images: JSON.stringify(["/images/products/fashion-3.jpg"]),
    categorySlug: "women-fashion",
    stock: 10,
    rating: 4.7,
    reviewCount: 55,
    featured: false,
    tags: JSON.stringify(["linen", "blazer", "tailored"]),
  },

  // ═══════════════════════════════════════════════════
  // HOME - Décor (home-decor)
  // ═══════════════════════════════════════════════════
  {
    name: "Murano Crystal Vase",
    slug: "murano-crystal-vase",
    description: "Handblown Murano crystal vase with 24K gold leaf inclusions. Each piece is a unique work of art, signed by the master glassblower.",
    price: 2800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/home-1.jpg", "/images/products/home-1-alt.jpg"]),
    categorySlug: "home-decor",
    stock: 7,
    rating: 4.8,
    reviewCount: 24,
    featured: true,
    tags: JSON.stringify(["murano", "crystal", "vase", "gold-leaf"]),
  },

  // ═══════════════════════════════════════════════════
  // HOME - Living (home-living)
  // ═══════════════════════════════════════════════════
  {
    name: "Silk Throw Pillow Set",
    slug: "silk-throw-pillow-set",
    description: "Set of 4 hand-embroidered silk throw pillows with gold thread accents. Filled with premium duck down for luxurious comfort.",
    price: 950,
    compareAtPrice: 1200,
    images: JSON.stringify(["/images/products/home-2.jpg"]),
    categorySlug: "home-living",
    stock: 15,
    rating: 4.6,
    reviewCount: 41,
    featured: false,
    tags: JSON.stringify(["silk", "pillow", "embroidered"]),
  },

  // ═══════════════════════════════════════════════════
  // HOME - Candles & Fragrances (home-candles)
  // ═══════════════════════════════════════════════════
  {
    name: "Artisan Scented Candle Collection",
    slug: "artisan-scented-candles",
    description: "A collection of 6 artisan candles hand-poured in amber glass vessels. Notes of sandalwood, vanilla, and exotic spices. Total burn time: 240 hours.",
    price: 380,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/home-3.jpg"]),
    categorySlug: "home-candles",
    stock: 20,
    rating: 4.5,
    reviewCount: 87,
    featured: false,
    tags: JSON.stringify(["candles", "scented", "artisan"]),
  },
  {
    name: "Luxury Reed Diffuser Set",
    slug: "luxury-reed-diffuser-set",
    description: "An elegant reed diffuser set in hand-blown glass with natural rattan reeds. Available in three sophisticated scent blends: Oud & Rose, White Tea & Ginger, and Amber & Sandalwood. Each bottle lasts up to 90 days.",
    price: 320,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/home-diffuser-1.jpg"]),
    categorySlug: "home-candles",
    stock: 25,
    rating: 4.7,
    reviewCount: 54,
    featured: true,
    tags: JSON.stringify(["diffuser", "home-fragrance", "reed", "new-arrival"]),
  },
  {
    name: "Handpoured Soy Candle Trio",
    slug: "handpoured-soy-candle-trio",
    description: "A trio of handpoured soy wax candles in matte ceramic vessels. Scents: Midnight Jasmine, Cedarwood & Sage, and Vanilla Orchid. Clean burn, cotton wicks. 60 hours burn time each.",
    price: 250,
    compareAtPrice: 310,
    images: JSON.stringify(["/images/products/home-candle-trio.jpg"]),
    categorySlug: "home-candles",
    stock: 30,
    rating: 4.6,
    reviewCount: 72,
    featured: false,
    tags: JSON.stringify(["soy-candle", "handpoured", "ceramic", "eco-friendly"]),
  },

  // ═══════════════════════════════════════════════════
  // WOMEN - Sarees (women-sarees)
  // ═══════════════════════════════════════════════════
  {
    name: "Banarasi Silk Saree",
    slug: "banarasi-silk-saree",
    description: "A magnificent Banarasi silk saree with intricate gold zari work. Handwoven by master craftsmen, this heirloom piece features traditional Mughal motifs and a rich pallu. Perfect for weddings and grand celebrations.",
    price: 1850,
    compareAtPrice: 2200,
    images: JSON.stringify(["/images/products/saree-1.jpg"]),
    categorySlug: "women-sarees",
    stock: 8,
    rating: 4.9,
    reviewCount: 56,
    featured: true,
    tags: JSON.stringify(["silk", "banarasi", "zari", "wedding", "handwoven"]),
  },
  {
    name: "Kanjeevaram Silk Saree",
    slug: "kanjeevaram-silk-saree",
    description: "A stunning Kanjeevaram silk saree in vibrant magenta with contrasting golden border. Woven with pure mulberry silk and real gold threads, this saree is a South Indian treasure.",
    price: 2400,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/saree-2.jpg"]),
    categorySlug: "women-sarees",
    stock: 5,
    rating: 5.0,
    reviewCount: 34,
    featured: true,
    tags: JSON.stringify(["silk", "kanjeevaram", "gold-thread", "temple-border"]),
  },
  {
    name: "Designer Chiffon Saree",
    slug: "designer-chiffon-saree",
    description: "An elegant designer chiffon saree with delicate embroidery and sequin work. Lightweight and flowing, perfect for parties and festive occasions. Includes matching blouse piece.",
    price: 780,
    compareAtPrice: 950,
    images: JSON.stringify(["/images/products/saree-3.jpg"]),
    categorySlug: "women-sarees",
    stock: 15,
    rating: 4.7,
    reviewCount: 89,
    featured: false,
    tags: JSON.stringify(["chiffon", "embroidered", "sequin", "party-wear"]),
  },
  {
    name: "Patola Double Ikat Saree",
    slug: "patola-double-ikat-saree",
    description: "A rare Patola silk saree from Patan, featuring the ancient double ikat technique where both warp and weft threads are tie-dyed before weaving. Royal blue and red geometric patterns create a mesmerizing visual. A true collector's piece.",
    price: 3200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/saree-4.jpg"]),
    categorySlug: "women-sarees",
    stock: 4,
    rating: 5.0,
    reviewCount: 18,
    featured: true,
    tags: JSON.stringify(["patola", "double-ikat", "handwoven", "heritage", "collector", "new-arrival"]),
  },
  {
    name: "Organza Floral Dream Saree",
    slug: "organza-floral-dream-saree",
    description: "A breathtaking organza saree in blush pink with exquisite 3D floral appliqué work. Delicate pastel flowers cascade across the drape, creating a fairy-tale aesthetic. Includes pre-stitched pleats and matching blouse.",
    price: 1650,
    compareAtPrice: 1900,
    images: JSON.stringify(["/images/products/saree-5.jpg"]),
    categorySlug: "women-sarees",
    stock: 7,
    rating: 4.8,
    reviewCount: 42,
    featured: true,
    tags: JSON.stringify(["organza", "floral", "3D-applique", "contemporary", "reception"]),
  },
  {
    name: "Tussar Silk Tribal Art Saree",
    slug: "tussar-silk-tribal-art-saree",
    description: "A hand-painted Tussar silk saree in natural golden-beige tone featuring traditional tribal motifs from Jharkhand. The raw silk texture and earthy elegance make this a sustainable luxury choice. Each piece is unique.",
    price: 1100,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/saree-6.jpg"]),
    categorySlug: "women-sarees",
    stock: 10,
    rating: 4.6,
    reviewCount: 35,
    featured: false,
    tags: JSON.stringify(["tussar", "hand-painted", "tribal", "sustainable", "eco-friendly"]),
  },
  {
    name: "Velvet Zardozi Bridal Saree",
    slug: "velvet-zardozi-bridal-saree",
    description: "An opulent deep maroon velvet bridal saree with intricate zardozi embroidery using real gold and silver threads. Features heavy embellished borders and pallu with Mughal-inspired floral patterns. The ultimate wedding statement piece.",
    price: 4800,
    compareAtPrice: 5500,
    images: JSON.stringify(["/images/products/saree-7.jpg"]),
    categorySlug: "women-sarees",
    stock: 3,
    rating: 5.0,
    reviewCount: 27,
    featured: true,
    tags: JSON.stringify(["velvet", "zardozi", "bridal", "gold-thread", "wedding", "mughal"]),
  },
  {
    name: "Chanderi Mint Elegance Saree",
    slug: "chanderi-mint-elegance-saree",
    description: "A feather-light Chanderi cotton-silk saree in refreshing mint green with delicate gold butis scattered across the drape. The sheer fabric creates a graceful silhouette perfect for daytime events and pujas.",
    price: 680,
    compareAtPrice: 820,
    images: JSON.stringify(["/images/products/saree-8.jpg"]),
    categorySlug: "women-sarees",
    stock: 12,
    rating: 4.5,
    reviewCount: 63,
    featured: false,
    tags: JSON.stringify(["chanderi", "cotton-silk", "lightweight", "day-wear", "traditional"]),
  },
  {
    name: "Paithani Peacock Heritage Saree",
    slug: "paithani-peacock-heritage-saree",
    description: "A magnificent Paithani silk saree in rich purple with the iconic peacock motif pallu woven in gold zari. Handloomed in Yeola, Maharashtra, this heritage piece features the distinctive oblique weave that creates a distinctive texture.",
    price: 3600,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/saree-9.jpg"]),
    categorySlug: "women-sarees",
    stock: 5,
    rating: 4.9,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["paithani", "peacock", "handloom", "maharashtra", "heritage", "zari"]),
  },
  {
    name: "Georgette Crystal Glam Saree",
    slug: "georgette-crystal-glam-saree",
    description: "A show-stopping georgette saree in champagne gold adorned with Swarovski crystals and stone work. The lightweight fabric drapes beautifully while the sparkling embellishments catch every light. Perfect for cocktail parties and receptions.",
    price: 2100,
    compareAtPrice: 2500,
    images: JSON.stringify(["/images/products/saree-10.jpg"]),
    categorySlug: "women-sarees",
    stock: 6,
    rating: 4.8,
    reviewCount: 38,
    featured: true,
    tags: JSON.stringify(["georgette", "crystal", "swarovski", "cocktail", "party-wear", "glam"]),
  },

  // ═══════════════════════════════════════════════════
  // KIDS - Toys & Games (kids-toys)
  // ═══════════════════════════════════════════════════
  {
    name: "Luxury Crystal Chess Set",
    slug: "luxury-crystal-chess-set",
    description: "A breathtaking chess set with hand-carved crystal pieces on a rosewood and maple board. Each piece is a miniature sculpture, making this a collector's dream and a stunning display piece.",
    price: 1200,
    compareAtPrice: 1500,
    images: JSON.stringify(["/images/products/toy-1.jpg"]),
    categorySlug: "kids-toys",
    stock: 6,
    rating: 4.8,
    reviewCount: 28,
    featured: true,
    tags: JSON.stringify(["crystal", "chess", "collector", "rosewood"]),
  },
  {
    name: "Limited Edition Model Car",
    slug: "limited-edition-model-car",
    description: "A 1:8 scale die-cast model of a classic Ferrari 250 GTO. Hand-assembled with over 1,500 parts, opening doors, hood, and detailed engine bay. Limited to 999 pieces worldwide.",
    price: 3500,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/toy-2.jpg"]),
    categorySlug: "kids-toys",
    stock: 3,
    rating: 5.0,
    reviewCount: 15,
    featured: true,
    tags: JSON.stringify(["ferrari", "die-cast", "limited-edition", "collectible", "new-arrival"]),
  },
  {
    name: "Premium Wooden Train Set",
    slug: "premium-wooden-train-set",
    description: "An heirloom-quality wooden train set handcrafted from sustainable beech wood. Includes 52 pieces with magnetic connectors, bridges, and stations. Non-toxic paints, safe for all ages.",
    price: 450,
    compareAtPrice: 580,
    images: JSON.stringify(["/images/products/toy-3.jpg"]),
    categorySlug: "kids-toys",
    stock: 12,
    rating: 4.7,
    reviewCount: 67,
    featured: false,
    tags: JSON.stringify(["wooden", "train", "handcrafted", "sustainable"]),
  },

  // ═══════════════════════════════════════════════════
  // COUPLE - Couple Friendly (couple-friendly)
  // ═══════════════════════════════════════════════════
  {
    name: "Enchanted Rose Box",
    slug: "enchanted-rose-box",
    description: "A preserved eternal rose under a glass dome, inspired by fairy tales. Available in red, pink, or white. Comes in a premium gift box with a handwritten card. A timeless symbol of love.",
    price: 320,
    compareAtPrice: 400,
    images: JSON.stringify(["/images/products/romantic-1.jpg"]),
    categorySlug: "couple-friendly",
    stock: 20,
    rating: 4.8,
    reviewCount: 142,
    featured: true,
    tags: JSON.stringify(["rose", "eternal", "glass-dome", "love"]),
  },
  {
    name: "Couple's Star Map Print",
    slug: "couples-star-map",
    description: "A custom star map showing the exact alignment of stars and constellations at a specific date and location. Perfect for commemorating anniversaries, first meetings, or special moments. Museum-quality archival print.",
    price: 180,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/romantic-2.jpg"]),
    categorySlug: "couple-friendly",
    stock: 30,
    rating: 4.9,
    reviewCount: 89,
    featured: true,
    tags: JSON.stringify(["star-map", "custom", "anniversary", "print"]),
  },
  {
    name: "Luxury Date Night Hamper",
    slug: "luxury-date-night-hamper",
    description: "A curated hamper for the perfect date night at home. Includes artisan chocolates, premium wine glasses, scented candles, a silk blindfold, and a couples activity book. Elegantly packaged.",
    price: 550,
    compareAtPrice: 680,
    images: JSON.stringify(["/images/products/romantic-3.jpg"]),
    categorySlug: "couple-friendly",
    stock: 10,
    rating: 4.7,
    reviewCount: 56,
    featured: false,
    tags: JSON.stringify(["hamper", "date-night", "chocolate", "candles"]),
  },
  {
    name: "His & Hers Watch Set",
    slug: "his-hers-watch-set",
    description: "A matching pair of luxury automatic watches in a shared presentation box. His: 42mm with steel bracelet. Hers: 36mm with mother-of-pearl dial on leather strap. Swiss movement, sapphire crystal.",
    price: 6800,
    compareAtPrice: 7500,
    images: JSON.stringify(["/images/products/couple-1.jpg"]),
    categorySlug: "couple-friendly",
    stock: 4,
    rating: 4.9,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["watch", "matching", "couple", "swiss", "new-arrival"]),
  },
  {
    name: "Couple's Spa Experience Box",
    slug: "couples-spa-experience",
    description: "A luxury at-home spa kit for two. Includes matching bamboo robes, aromatic massage oils, bath bombs, face masks, and a wooden massage tool. Transform any evening into a retreat.",
    price: 420,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/couple-2.jpg"]),
    categorySlug: "couple-friendly",
    stock: 15,
    rating: 4.8,
    reviewCount: 74,
    featured: true,
    tags: JSON.stringify(["spa", "robes", "massage", "relaxation"]),
  },
  {
    name: "Personalized Couple Portrait",
    slug: "personalized-couple-portrait",
    description: "A hand-drawn digital portrait of a couple, created from your photo by a professional artist. Printed on premium canvas and framed in your choice of gold, black, or white frame. A unique keepsake.",
    price: 350,
    compareAtPrice: 450,
    images: JSON.stringify(["/images/products/couple-3.jpg"]),
    categorySlug: "couple-friendly",
    stock: 25,
    rating: 4.6,
    reviewCount: 48,
    featured: false,
    tags: JSON.stringify(["portrait", "custom", "canvas", "framed"]),
  },

  // ═══════════════════════════════════════════════════
  // MEN - Shirts (men-shirts)
  // ═══════════════════════════════════════════════════
  {
    name: "Royal White Dress Shirt",
    slug: "royal-white-dress-shirt",
    description: "A pristine white formal dress shirt crafted from the finest two-ply Egyptian cotton. Features a spread collar, French cuffs, and mother-of-pearl buttons. The perfect foundation for black-tie elegance and boardroom authority.",
    price: 480,
    compareAtPrice: 580,
    images: JSON.stringify(["/images/products/mens-shirt-1.jpg"]),
    categorySlug: "men-shirts",
    stock: 20,
    rating: 4.9,
    reviewCount: 67,
    featured: true,
    tags: JSON.stringify(["dress-shirt", "white", "formal", "egyptian-cotton", "french-cuff"]),
  },
  {
    name: "Navy Oxford Button-Down",
    slug: "navy-oxford-button-down",
    description: "A classic navy Oxford shirt with button-down collar in premium long-staple cotton. The slightly textured Oxford weave gives it character while maintaining a polished look. Perfect for business casual and weekend sophistication.",
    price: 320,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/mens-shirt-2.jpg"]),
    categorySlug: "men-shirts",
    stock: 25,
    rating: 4.8,
    reviewCount: 89,
    featured: true,
    tags: JSON.stringify(["oxford", "navy", "button-down", "business-casual"]),
  },
  {
    name: "Mediterranean Linen Shirt",
    slug: "mediterranean-linen-shirt",
    description: "A breezy light blue linen shirt with mandarin collar for effortless summer style. Woven from premium European flax linen that softens beautifully with each wear. The relaxed fit and breathable fabric make it ideal for warm-weather sophistication.",
    price: 380,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/mens-shirt-4.jpg"]),
    categorySlug: "men-shirts",
    stock: 15,
    rating: 4.8,
    reviewCount: 42,
    featured: true,
    tags: JSON.stringify(["linen", "light-blue", "summer", "mandarin-collar", "relaxed"]),
  },
  {
    name: "Heritage Micro-Check Dress Shirt",
    slug: "heritage-micro-check-dress-shirt",
    description: "A distinguished blue and white micro-check dress shirt with cutaway collar. Crafted from fine two-ply cotton with a subtle textured pattern that adds depth without overwhelming. Pair with a silk tie for the boardroom or wear open-necked for smart casual.",
    price: 420,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/mens-shirt-6.jpg"]),
    categorySlug: "men-shirts",
    stock: 18,
    rating: 4.8,
    reviewCount: 55,
    featured: true,
    tags: JSON.stringify(["dress-shirt", "check", "cutaway-collar", "two-ply-cotton"]),
  },
  {
    name: "Noir Silk Evening Shirt",
    slug: "noir-silk-evening-shirt",
    description: "A dramatic black silk evening shirt with hidden button placket and wing collar. The luxurious silk fabric has a subtle sheen that catches the light, while the clean front creates an uninterrupted line of elegance. For the man who commands the room.",
    price: 890,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/mens-shirt-9.jpg"]),
    categorySlug: "men-shirts",
    stock: 8,
    rating: 5.0,
    reviewCount: 23,
    featured: true,
    tags: JSON.stringify(["silk", "black", "evening", "wing-collar", "formal", "hidden-placket", "new-arrival"]),
  },

  // ═══════════════════════════════════════════════════
  // MEN - T-Shirts & Polos (men-tshirts)
  // ═══════════════════════════════════════════════════
  {
    name: "Obsidian Crew Neck Tee",
    slug: "obsidian-crew-neck-tee",
    description: "A luxurious black t-shirt in heavyweight Supima cotton with a rich, substantial feel. The crew neck retains its shape wash after wash, while the slim fit drapes perfectly. The essential foundation of every refined casual wardrobe.",
    price: 145,
    compareAtPrice: 180,
    images: JSON.stringify(["/images/products/mens-shirt-3.jpg"]),
    categorySlug: "men-tshirts",
    stock: 35,
    rating: 4.7,
    reviewCount: 156,
    featured: true,
    tags: JSON.stringify(["t-shirt", "black", "crew-neck", "supima-cotton", "essential"]),
  },
  {
    name: "Ivory V-Neck Essential Tee",
    slug: "ivory-vneck-essential-tee",
    description: "A premium white V-neck t-shirt in ultra-soft Supima cotton jersey. The clean minimal design features a perfectly proportioned V-neck, reinforced seams, and a slim fit that layers beautifully under blazers or stands alone with style.",
    price: 125,
    compareAtPrice: 160,
    images: JSON.stringify(["/images/products/mens-shirt-5.jpg"]),
    categorySlug: "men-tshirts",
    stock: 40,
    rating: 4.6,
    reviewCount: 203,
    featured: false,
    tags: JSON.stringify(["t-shirt", "white", "v-neck", "supima-cotton", "layering"]),
  },
  {
    name: "Riviera Striped Polo",
    slug: "riviera-striped-polo",
    description: "A refined navy and white striped polo shirt in premium piqué cotton. The ribbed collar and two-button placket offer classic styling, while the breathable piqué weave keeps you comfortable. European sophistication meets casual elegance.",
    price: 275,
    compareAtPrice: 340,
    images: JSON.stringify(["/images/products/mens-shirt-7.jpg"]),
    categorySlug: "men-tshirts",
    stock: 22,
    rating: 4.7,
    reviewCount: 71,
    featured: true,
    tags: JSON.stringify(["polo", "striped", "piqué", "navy", "casual-luxury"]),
  },
  {
    name: "Cloud Grey Modal-Blend Tee",
    slug: "cloud-grey-modal-blend-tee",
    description: "An impossibly soft heather grey t-shirt in a premium modal-cotton blend. The luxurious drape and silky hand-feel elevate this beyond any ordinary tee. Relaxed fit with a lived-in softness from day one. The ultimate comfort luxury.",
    price: 165,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/mens-shirt-8.jpg"]),
    categorySlug: "men-tshirts",
    stock: 30,
    rating: 4.9,
    reviewCount: 94,
    featured: true,
    tags: JSON.stringify(["t-shirt", "grey", "modal", "soft", "relaxed-fit", "luxury-casual"]),
  },
  {
    name: "Sage Henley Long Sleeve",
    slug: "sage-henley-long-sleeve",
    description: "A vintage-inspired dark olive henley in premium slub cotton with a three-button placket and ribbed cuffs. The textured slub yarn gives it a lived-in character, while the relaxed drape channels effortless cool. Pairs perfectly with dark denim or chinos.",
    price: 195,
    compareAtPrice: 240,
    images: JSON.stringify(["/images/products/mens-shirt-10.jpg"]),
    categorySlug: "men-tshirts",
    stock: 20,
    rating: 4.7,
    reviewCount: 63,
    featured: false,
    tags: JSON.stringify(["henley", "olive", "slub-cotton", "long-sleeve", "vintage"]),
  },

  // ═══════════════════════════════════════════════════
  // KIDS - Kids Fashion (kids-fashion) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Designer Kids Sherwani Set",
    slug: "designer-kids-sherwani-set",
    description: "An adorable mini sherwani set for boys in royal navy with gold embroidery. Includes kurta, churidar, and matching dupatta. Crafted from breathable cotton silk blend. Perfect for weddings and festive celebrations.",
    price: 850,
    compareAtPrice: 1050,
    images: JSON.stringify(["/images/products/kids-fashion-1.jpg"]),
    categorySlug: "kids-fashion",
    stock: 10,
    rating: 4.8,
    reviewCount: 32,
    featured: true,
    tags: JSON.stringify(["sherwani", "kids", "festive", "wedding", "new-arrival"]),
  },
  {
    name: "Princess Tulle Party Dress",
    slug: "princess-tulle-party-dress",
    description: "A magical layered tulle party dress in blush pink with delicate sequin bodice and satin sash. Fully lined with a comfortable cotton inner. Available for ages 3-10. Every little girl's fairy tale dream.",
    price: 620,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/kids-fashion-2.jpg"]),
    categorySlug: "kids-fashion",
    stock: 15,
    rating: 4.9,
    reviewCount: 48,
    featured: true,
    tags: JSON.stringify(["dress", "tulle", "party", "princess", "new-arrival"]),
  },
  {
    name: "Mini Denim Jacket",
    slug: "mini-denim-jacket",
    description: "A stylish kids' denim jacket in soft-washed indigo with custom embroidered patches and brass snap buttons. Pre-shrunk premium denim with a comfortable relaxed fit. Machine washable. Ages 4-12.",
    price: 480,
    compareAtPrice: 580,
    images: JSON.stringify(["/images/products/kids-fashion-3.jpg"]),
    categorySlug: "kids-fashion",
    stock: 18,
    rating: 4.6,
    reviewCount: 27,
    featured: false,
    tags: JSON.stringify(["denim", "jacket", "casual", "kids", "embroidered"]),
  },

  // ═══════════════════════════════════════════════════
  // OFFICE - Corporate Gifts (office-corporate-gifts) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Executive Gift Hamper",
    slug: "executive-gift-hamper",
    description: "A premium corporate gift hamper featuring artisan chocolates, a leather-bound planner, premium tea collection, and a personalized thank-you card. Elegantly packaged in a matte black box with gold foil branding. Perfect for VIP clients and leadership.",
    price: 1800,
    compareAtPrice: 2200,
    images: JSON.stringify(["/images/products/corp-gift-1.jpg"]),
    categorySlug: "office-corporate-gifts",
    stock: 25,
    rating: 4.8,
    reviewCount: 56,
    featured: true,
    tags: JSON.stringify(["hamper", "corporate", "executive", "gifting", "new-arrival"]),
  },
  {
    name: "Premium Pen & Watch Gift Set",
    slug: "premium-pen-watch-gift-set",
    description: "An exclusive gift set pairing a Swiss automatic watch with a handcrafted fountain pen in a shared walnut presentation box. The watch features a minimalist silver dial and Italian leather strap. The pen has a rhodium-plated 18K gold nib. Engravable.",
    price: 4800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/corp-gift-2.jpg"]),
    categorySlug: "office-corporate-gifts",
    stock: 8,
    rating: 4.9,
    reviewCount: 18,
    featured: true,
    tags: JSON.stringify(["watch", "pen", "gift-set", "corporate", "engravable", "new-arrival"]),
  },
  {
    name: "Luxury Welcome Kit",
    slug: "luxury-welcome-kit",
    description: "A curated onboarding welcome kit for new employees and executives. Includes a branded leather portfolio, premium coffee sampler, wireless charging pad, and a welcome note. Customizable with company branding and logo.",
    price: 950,
    compareAtPrice: 1200,
    images: JSON.stringify(["/images/products/corp-gift-3.jpg"]),
    categorySlug: "office-corporate-gifts",
    stock: 30,
    rating: 4.7,
    reviewCount: 42,
    featured: false,
    tags: JSON.stringify(["welcome-kit", "onboarding", "corporate", "customizable"]),
  },

  // ═══════════════════════════════════════════════════
  // OFFICE - Desk Accessories (office-desk) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Crystal Desk Organizer",
    slug: "crystal-desk-organizer",
    description: "A stunning lead crystal desk organizer with multiple compartments for pens, cards, and paper clips. The hand-cut facets create a brilliant play of light. A sophisticated addition to any executive desk.",
    price: 680,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/desk-1.jpg"]),
    categorySlug: "office-desk",
    stock: 12,
    rating: 4.7,
    reviewCount: 34,
    featured: true,
    tags: JSON.stringify(["crystal", "desk", "organizer", "executive", "new-arrival"]),
  },
  {
    name: "Leather Desk Pad",
    slug: "leather-desk-pad",
    description: "A generous full-grain Italian leather desk pad with felt backing and stitched edges. Available in cognac, black, and burgundy. Protects your desk while adding a touch of old-world sophistication to your workspace. 90cm x 45cm.",
    price: 420,
    compareAtPrice: 520,
    images: JSON.stringify(["/images/products/desk-2.jpg"]),
    categorySlug: "office-desk",
    stock: 20,
    rating: 4.8,
    reviewCount: 67,
    featured: true,
    tags: JSON.stringify(["leather", "desk-pad", "italian", "workspace", "new-arrival"]),
  },
  {
    name: "Magnetic Hourglass Timer",
    slug: "magnetic-hourglass-timer",
    description: "A mesmerizing magnetic hourglass with iron-filing sand that creates stunning sculptural formations as it flows. Brushed copper frame with glass body. 5-minute timer. A conversation piece for any desk.",
    price: 350,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/desk-3.jpg"]),
    categorySlug: "office-desk",
    stock: 15,
    rating: 4.6,
    reviewCount: 28,
    featured: false,
    tags: JSON.stringify(["hourglass", "magnetic", "copper", "timer", "sculptural"]),
  },

  // ═══════════════════════════════════════════════════
  // WOMEN - Accessories (women-accessories) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Silk Scarf Collection",
    slug: "silk-scarf-collection",
    description: "A set of 3 hand-rolled 100% mulberry silk scarves in complementary prints — geometric, floral, and abstract. Each scarf measures 90cm x 90cm. Lightweight, luxurious, and endlessly versatile. Gift boxed.",
    price: 580,
    compareAtPrice: 720,
    images: JSON.stringify(["/images/products/women-acc-1.jpg"]),
    categorySlug: "women-accessories",
    stock: 14,
    rating: 4.8,
    reviewCount: 39,
    featured: true,
    tags: JSON.stringify(["silk", "scarf", "hand-rolled", "gift-set", "new-arrival"]),
  },
  {
    name: "Designer Sunglasses",
    slug: "designer-sunglasses",
    description: "Oversized cat-eye sunglasses in hand-polished acetate with gradient smoke lenses and gold temple accents. 100% UV protection with premium Carl Zeiss lenses. Includes hard case and microfiber cloth. Italian craftsmanship.",
    price: 890,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/women-acc-2.jpg"]),
    categorySlug: "women-accessories",
    stock: 10,
    rating: 4.7,
    reviewCount: 51,
    featured: true,
    tags: JSON.stringify(["sunglasses", "cat-eye", "designer", "UV-protection", "new-arrival"]),
  },
  {
    name: "Pearl Handbag Clutch",
    slug: "pearl-handbag-clutch",
    description: "An exquisite evening clutch covered in hand-sewn freshwater pearls with a gold-tone frame clasp. Silk-satin interior with card slot and removable gold chain strap. The perfect companion for galas, weddings, and red-carpet events.",
    price: 1450,
    compareAtPrice: 1700,
    images: JSON.stringify(["/images/products/women-acc-3.jpg"]),
    categorySlug: "women-accessories",
    stock: 6,
    rating: 4.9,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["pearl", "clutch", "evening", "handbag", "wedding"]),
  },

  // ═══════════════════════════════════════════════════
  // MEN - Accessories (men-accessories) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Luxury Cufflink Set",
    slug: "luxury-cufflink-set",
    description: "A set of three pairs of cufflinks in a walnut presentation box: mother-of-pearl, onyx, and lapis lazuli. Each pair crafted in sterling silver with a polished finish. The essential finishing touch for the discerning gentleman.",
    price: 750,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/men-acc-1.jpg"]),
    categorySlug: "men-accessories",
    stock: 12,
    rating: 4.8,
    reviewCount: 35,
    featured: true,
    tags: JSON.stringify(["cufflinks", "sterling-silver", "mother-of-pearl", "onyx", "new-arrival"]),
  },
  {
    name: "Italian Leather Belt",
    slug: "italian-leather-belt",
    description: "A handcrafted full-grain Italian leather belt with a brushed palladium buckle. The saddle-stitched construction ensures a lifetime of wear. Available in dark brown and black. 35mm width — the perfect balance of classic and contemporary.",
    price: 480,
    compareAtPrice: 580,
    images: JSON.stringify(["/images/products/men-acc-2.jpg"]),
    categorySlug: "men-accessories",
    stock: 18,
    rating: 4.7,
    reviewCount: 82,
    featured: true,
    tags: JSON.stringify(["belt", "italian-leather", "palladium", "saddle-stitched", "new-arrival"]),
  },
  {
    name: "Silk Pocket Square Collection",
    slug: "silk-pocket-square-collection",
    description: "A collection of 5 hand-rolled silk pocket squares in a leather keepsake box. Patterns include paisley, polka dot, houndstooth, geometric, and solid. Each square is 33cm x 33cm in 100% Como silk. Elevate every blazer.",
    price: 390,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/men-acc-3.jpg"]),
    categorySlug: "men-accessories",
    stock: 20,
    rating: 4.6,
    reviewCount: 44,
    featured: false,
    tags: JSON.stringify(["pocket-square", "silk", "como", "gift-set"]),
  },

  // ═══════════════════════════════════════════════════
  // OFFICE - Stationery (office-stationery) — NEW
  // ═══════════════════════════════════════════════════
  {
    name: "Premium Leather Journal",
    slug: "premium-leather-journal",
    description: "A hand-stitched full-grain leather journal with 200 pages of fountain-pen-friendly cream paper. Features a wrap-around leather tie, gilt edges, and a ribbon bookmark. The paper is acid-free 120gsm from an Italian mill. A joy to write in.",
    price: 320,
    compareAtPrice: 400,
    images: JSON.stringify(["/images/products/stationery-1.jpg"]),
    categorySlug: "office-stationery",
    stock: 22,
    rating: 4.8,
    reviewCount: 73,
    featured: true,
    tags: JSON.stringify(["journal", "leather", "hand-stitched", "italian-paper", "new-arrival"]),
  },
  {
    name: "Gold Fountain Pen Set",
    slug: "gold-fountain-pen-set",
    description: "A prestigious fountain pen and ballpoint pen set in solid brass with 24K gold plating. The fountain pen features a rhodium-plated 18K gold nib in Fine, Medium, or Broad. Presented in a velvet-lined lacquer box. Engravable.",
    price: 1200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/stationery-2.jpg"]),
    categorySlug: "office-stationery",
    stock: 8,
    rating: 4.9,
    reviewCount: 29,
    featured: true,
    tags: JSON.stringify(["fountain-pen", "gold", "24K", "engravable", "new-arrival"]),
  },
  {
    name: "Wax Seal Kit",
    slug: "wax-seal-kit",
    description: "A traditional wax seal kit with a solid brass seal handle, interchangeable monogram die, and 10 sealing wax sticks in 5 colors. Create an impression of distinction on letters, invitations, and certificates. Gift boxed.",
    price: 280,
    compareAtPrice: 340,
    images: JSON.stringify(["/images/products/stationery-3.jpg"]),
    categorySlug: "office-stationery",
    stock: 16,
    rating: 4.5,
    reviewCount: 38,
    featured: false,
    tags: JSON.stringify(["wax-seal", "brass", "monogram", "traditional"]),
  },

  // ═══════════════════════════════════════════════════
  // Additional Office Products
  // ═══════════════════════════════════════════════════
  {
    name: "Luxury Corporate Gift Box",
    slug: "luxury-corporate-gift-box",
    description: "An exquisite corporate gift box featuring a curated selection of premium items including artisan chocolates, a silk scarf, a crystal paperweight, and a handwritten note. Wrapped in signature gold ribbon.",
    price: 2400,
    compareAtPrice: 2800,
    images: JSON.stringify(["/images/products/corp-gift-3.jpg", "/images/products/corp-gift-4.jpg"]),
    categorySlug: "office-corporate-gifts",
    stock: 15,
    rating: 4.7,
    reviewCount: 42,
    featured: true,
    tags: JSON.stringify(["gift-box", "corporate", "premium", "gifting"]),
  },
  {
    name: "Executive Leather Portfolio Set",
    slug: "executive-leather-portfolio-set",
    description: "A premium full-grain leather portfolio with matching business card holder and pen loop. Features padded compartments for tablet and documents. Italian calfskin with hand-stitched edges.",
    price: 950,
    compareAtPrice: 1150,
    images: JSON.stringify(["/images/products/corp-gift-5.jpg"]),
    categorySlug: "office-corporate-gifts",
    stock: 20,
    rating: 4.8,
    reviewCount: 38,
    featured: true,
    tags: JSON.stringify(["leather", "portfolio", "corporate", "executive"]),
  },
  {
    name: "Marble & Brass Desk Clock",
    slug: "marble-brass-desk-clock",
    description: "An elegant desk clock combining Italian Carrara marble with brushed brass accents. The silent sweep movement ensures no ticking distraction. A statement piece for the discerning professional.",
    price: 580,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/desk-4.jpg"]),
    categorySlug: "office-desk",
    stock: 10,
    rating: 4.9,
    reviewCount: 25,
    featured: true,
    tags: JSON.stringify(["marble", "brass", "clock", "desk"]),
  },
  {
    name: "Walnut Pen Holder Set",
    slug: "walnut-pen-holder-set",
    description: "A handcrafted walnut wood pen holder with brass accents, paired with a matching letter tray. The warm wood grain and polished brass create a refined workspace aesthetic.",
    price: 340,
    compareAtPrice: 420,
    images: JSON.stringify(["/images/products/desk-5.jpg"]),
    categorySlug: "office-desk",
    stock: 18,
    rating: 4.6,
    reviewCount: 44,
    featured: false,
    tags: JSON.stringify(["walnut", "pen-holder", "brass", "workspace"]),
  },
  {
    name: "Crystal Inkwell & Pen Set",
    slug: "crystal-inkwell-pen-set",
    description: "A magnificent hand-cut crystal inkwell paired with a matching dip pen featuring a gold-plated nib. The inkwell holds premium bottled ink and makes a stunning desk display piece. Gift boxed.",
    price: 890,
    compareAtPrice: 1050,
    images: JSON.stringify(["/images/products/stationery-3.jpg", "/images/products/stationery-4.jpg"]),
    categorySlug: "office-stationery",
    stock: 6,
    rating: 4.8,
    reviewCount: 19,
    featured: true,
    tags: JSON.stringify(["crystal", "inkwell", "pen", "desk"]),
  },
  {
    name: "Artisan Wax Seal Letter Set",
    slug: "artisan-wax-seal-letter-set",
    description: "A complete wax seal correspondence set featuring a brass seal with custom monogram, 3 sticks of premium wax, and 50 sheets of heavyweight laid paper with matching envelopes.",
    price: 280,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/stationery-5.jpg"]),
    categorySlug: "office-stationery",
    stock: 30,
    rating: 4.7,
    reviewCount: 51,
    featured: false,
    tags: JSON.stringify(["wax-seal", "letter", "correspondence", "monogram"]),
  },

  // ═══════════════════════════════════════════════════
  // NEW ARRIVALS - Exclusive Products (new-arrivals)
  // ═══════════════════════════════════════════════════
  {
    name: "Smart Luxury Watch Gold Edition",
    slug: "smart-luxury-watch-gold-edition",
    description: "The latest in luxury smartwatch technology. 18K rose gold case with sapphire crystal display, health monitoring suite, and 7-day battery life. Seamlessly blends traditional elegance with cutting-edge innovation.",
    price: 8500,
    compareAtPrice: 9800,
    images: JSON.stringify(["/images/products/new-arrival-1.jpg"]),
    categorySlug: "new-arrivals",
    stock: 10,
    rating: 4.9,
    reviewCount: 15,
    featured: true,
    tags: JSON.stringify(["smart-watch", "gold", "luxury-tech", "new-arrival"]),
  },
  {
    name: "Heritage Silk Scarf Collection",
    slug: "heritage-silk-scarf-collection",
    description: "A limited-edition silk twill scarf featuring hand-painted heritage motifs. 100% Mulberry silk with hand-rolled edges. Each scarf comes numbered in a signature gift box.",
    price: 680,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/new-arrival-2.jpg"]),
    categorySlug: "new-arrivals",
    stock: 25,
    rating: 4.8,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["silk-scarf", "heritage", "limited-edition", "new-arrival"]),
  },
  {
    name: "Noir Oud Parfum Collector's Edition",
    slug: "noir-oud-parfum-collectors-edition",
    description: "An exclusive collector's edition of our bestselling Noir Oud, presented in a hand-blown crystal flacon with 24K gold stopper. Notes of aged oud, Damask rose, and ambergris. Limited to 500 bottles worldwide.",
    price: 1200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/new-arrival-3.jpg"]),
    categorySlug: "new-arrivals",
    stock: 5,
    rating: 5.0,
    reviewCount: 8,
    featured: true,
    tags: JSON.stringify(["perfume", "oud", "collectors-edition", "limited", "new-arrival"]),
  },
  {
    name: "Artisan Gold Leaf Chocolate Box",
    slug: "artisan-gold-leaf-chocolate-box",
    description: "A stunning box of 24 handcrafted chocolates, each adorned with edible gold leaf. Flavors include single-origin dark ganache, salted caramel, rose pistachio, and champagne truffle.",
    price: 450,
    compareAtPrice: 550,
    images: JSON.stringify(["/images/products/new-arrival-4.jpg"]),
    categorySlug: "new-arrivals",
    stock: 30,
    rating: 4.9,
    reviewCount: 34,
    featured: true,
    tags: JSON.stringify(["chocolate", "gold-leaf", "artisan", "gourmet", "new-arrival"]),
  },
  {
    name: "Monogram Leather Card Holder",
    slug: "monogram-leather-card-holder",
    description: "A sleek calfskin leather card holder with custom monogramming. Features 6 card slots, a central bill compartment, and RFID blocking technology. Available in 8 colors.",
    price: 290,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/new-arrival-5.jpg"]),
    categorySlug: "new-arrivals",
    stock: 40,
    rating: 4.7,
    reviewCount: 61,
    featured: true,
    tags: JSON.stringify(["card-holder", "leather", "monogram", "RFID", "new-arrival"]),
  },
  {
    name: "Crystal Decanter & Glasses Set",
    slug: "crystal-decanter-glasses-set",
    description: "A hand-cut lead crystal decanter with matching set of 6 whiskey glasses. The intricate geometric cuts create a mesmerizing play of light. Perfect for the connoisseur's home bar. Gift boxed.",
    price: 1650,
    compareAtPrice: 1900,
    images: JSON.stringify(["/images/products/new-arrival-6.jpg"]),
    categorySlug: "new-arrivals",
    stock: 8,
    rating: 4.9,
    reviewCount: 17,
    featured: true,
    tags: JSON.stringify(["crystal", "decanter", "whiskey", "barware", "new-arrival"]),
  },
];

async function seed() {
  console.log("🌱 Seeding database (Version 1.2)...");

  // ─── Step 1: Create parent categories ───
  for (const cat of parentCategories) {
    await db.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, image: cat.image, order: cat.order, parentId: null },
      create: { name: cat.name, slug: cat.slug, description: cat.description, image: cat.image, order: cat.order, parentId: null },
    });
  }
  console.log(`✅ Created ${parentCategories.length} parent categories`);

  // ─── Step 2: Create subcategories with parentId references ───
  for (const subcat of subcategories) {
    const parent = await db.category.findUnique({ where: { slug: subcat.parentSlug } });
    if (!parent) {
      console.error(`❌ Parent category not found: ${subcat.parentSlug}`);
      continue;
    }

    const { parentSlug, ...catData } = subcat;
    await db.category.upsert({
      where: { slug: catData.slug },
      update: { name: catData.name, description: catData.description, image: catData.image, order: catData.order, parentId: parent.id },
      create: { name: catData.name, slug: catData.slug, description: catData.description, image: catData.image, order: catData.order, parentId: parent.id },
    });
  }
  console.log(`✅ Created ${subcategories.length} subcategories`);

  // ─── Step 3: Create products ───
  // Find the max productNumber to avoid collisions with existing products
  const existingProducts = await db.product.findMany({
    select: { productNumber: true },
    orderBy: { productNumber: 'desc' },
  });
  let productCounter = existingProducts.length > 0
    ? parseInt(existingProducts[0].productNumber.replace('PRD-', '')) + 1
    : 10001;

  for (const prod of products) {
    const category = await db.category.findUnique({
      where: { slug: prod.categorySlug },
    });

    if (!category) {
      console.error(`❌ Category not found: ${prod.categorySlug}`);
      continue;
    }

    const { categorySlug, ...productData } = prod;

    // Check if product already exists by slug
    const existing = await db.product.findUnique({ where: { slug: prod.slug } });

    if (existing) {
      // Update existing product — keep its productNumber
      await db.product.update({
        where: { slug: prod.slug },
        data: { ...productData, categoryId: category.id },
      });
    } else {
      // Create new product with a fresh productNumber
      const productNumber = `PRD-${productCounter}`;
      productCounter++;
      await db.product.create({
        data: { ...productData, slug: prod.slug, categoryId: category.id, productNumber },
      });
    }
  }
  console.log(`✅ Created/updated ${products.length} products`);

  // ─── Step 4: Create default demo users ───
  const bcrypt = await import('bcryptjs');
  const demoUsers = [
    {
      email: 'admin@3boxesluxury.com',
      name: 'Admin',
      password: 'admin123',
      role: 'admin' as const,
      permissions: [
        'products.manage', 'orders.manage', 'users.approve', 'users.manage',
        'reports.view', 'settings.manage', 'inventory.manage',
      ],
    },
    {
      email: 'user@3boxesluxury.com',
      name: 'User',
      password: 'user123',
      role: 'user' as const,
      permissions: ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'],
    },
    {
      email: 'agent@3boxesluxury.com',
      name: 'Agent',
      password: 'agent123',
      role: 'agent' as const,
      permissions: ['orders.view', 'orders.manage', 'products.view', 'customers.view', 'reports.view'],
    },
    {
      email: 'team@3boxesluxury.com',
      name: 'Team',
      password: 'team123',
      role: 'team' as const,
      permissions: ['orders.view', 'products.view', 'inventory.manage', 'reports.view'],
    },
    {
      email: 'corporate@3boxesluxury.com',
      name: 'TechCorp Industries',
      password: 'corporate123',
      role: 'corporate' as const,
      permissions: ['corporate.manage', 'campaigns.manage', 'branding.manage', 'recipients.manage'],
    },
  ];

  for (const demoUser of demoUsers) {
    const exists = await db.user.findUnique({ where: { email: demoUser.email } });
    if (!exists) {
      const hashedPassword = await bcrypt.hash(demoUser.password, 12);
      await db.user.create({
        data: {
          email: demoUser.email,
          name: demoUser.name,
          password: hashedPassword,
          role: demoUser.role,
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          phoneVerified: false,
          twoFactorEnabled: false,
          permissions: {
            create: demoUser.permissions.map((p) => ({ permission: p })),
          },
        },
      });
      console.log(`✅ Created demo user: ${demoUser.email} / ${demoUser.password} (${demoUser.role})`);
    } else {
      console.log(`⏭️  Demo user already exists: ${demoUser.email}`);
    }
  }

  // ─── Step 5: Create corporate account for demo corporate user ───
  const corpUser = await db.user.findUnique({ where: { email: 'corporate@3boxesluxury.com' } });
  if (corpUser) {
    const existingCorp = await db.corporateAccount.findUnique({ where: { userId: corpUser.id } });
    if (!existingCorp) {
      const corp = await db.corporateAccount.create({
        data: {
          companyName: 'TechCorp Industries',
          slug: 'techcorp-industries',
          industry: 'Technology',
          website: 'https://techcorp.example.com',
          gstNumber: '27AABCT1234F1ZP',
          panNumber: 'AABCT1234F',
          contactName: 'Rajesh Kumar',
          contactEmail: 'rajesh@techcorp.example.com',
          contactPhone: '+91-9876543210',
          address: '123 Tech Park, Cyber City',
          city: 'Gurgaon',
          state: 'Haryana',
          zipCode: '122002',
          userId: corpUser.id,
          approvalStatus: 'approved',
          creditLimit: 500000,
          creditUsed: 0,
          discountPercent: 12,
        },
      });

      await db.corporateBranding.create({
        data: {
          corporateId: corp.id,
          logoUrl: '/images/logo.png',
          primaryColor: '#1e40af',
          secondaryColor: '#f59e0b',
          customMessage: 'Wishing you joy and success this festive season! — TechCorp Industries',
          packagingType: 'premium',
          giftWrapStyle: 'Gold ribbon with branded wrapping',
          includeBranding: true,
          hidePrice: true,
        },
      });

      // Create demo campaigns
      const allProducts = await db.product.findMany({ take: 2 });
      const campaign = await db.corporateCampaign.create({
        data: {
          corporateId: corp.id,
          name: 'Diwali 2026 Corporate Gifts',
          occasion: 'diwali',
          description: 'Annual Diwali gifting for all employees and key clients',
          budgetPerRecipient: 3000,
          totalBudget: 150000,
          status: 'approved',
          deliveryType: 'bulk',
          deliveryDate: new Date('2026-10-20'),
          message: 'May the festival of lights bring you happiness and prosperity!',
          productId: allProducts[0]?.id || null,
        },
      });

      const recipients = [
        { name: 'Priya Sharma', email: 'priya@techcorp.example.com', designation: 'VP Engineering', department: 'Engineering', city: 'Gurgaon', state: 'Haryana' },
        { name: 'Amit Patel', email: 'amit@techcorp.example.com', designation: 'CTO', department: 'Technology', city: 'Bangalore', state: 'Karnataka' },
        { name: 'Sneha Reddy', email: 'sneha@techcorp.example.com', designation: 'Head of Design', department: 'Design', city: 'Mumbai', state: 'Maharashtra' },
        { name: 'Vikram Singh', email: 'vikram@techcorp.example.com', designation: 'Director Sales', department: 'Sales', city: 'Delhi', state: 'Delhi' },
        { name: 'Ananya Gupta', email: 'ananya@techcorp.example.com', designation: 'HR Manager', department: 'Human Resources', city: 'Pune', state: 'Maharashtra' },
      ];
      for (const r of recipients) {
        await db.campaignRecipient.create({ data: { campaignId: campaign.id, ...r } });
      }

      const campaign2 = await db.corporateCampaign.create({
        data: {
          corporateId: corp.id,
          name: 'New Year Team Appreciation',
          occasion: 'new_year',
          description: 'New year appreciation gifts for the leadership team',
          budgetPerRecipient: 5000,
          totalBudget: 50000,
          status: 'pending_approval',
          deliveryType: 'individual',
          deliveryDate: new Date('2027-01-01'),
          message: 'Happy New Year! Thank you for an amazing year ahead.',
          productId: allProducts[1]?.id || null,
        },
      });

      const recipients2 = [
        { name: 'Rajesh Kumar', email: 'rajesh@techcorp.example.com', designation: 'CEO', department: 'Leadership', city: 'Gurgaon', state: 'Haryana' },
        { name: 'Priya Sharma', email: 'priya@techcorp.example.com', designation: 'VP Engineering', department: 'Engineering', city: 'Gurgaon', state: 'Haryana' },
      ];
      for (const r of recipients2) {
        await db.campaignRecipient.create({ data: { campaignId: campaign2.id, ...r } });
      }

      console.log('✅ Created corporate account, branding, and 2 demo campaigns');
    } else {
      console.log('⏭️  Corporate account already exists');
    }
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
