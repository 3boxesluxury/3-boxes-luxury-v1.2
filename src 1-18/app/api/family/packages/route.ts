import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { occasion, familyMembers } = body;

    if (!occasion) {
      return NextResponse.json(
        { error: 'Occasion is required' },
        { status: 400 }
      );
    }

    if (!familyMembers || !Array.isArray(familyMembers) || familyMembers.length === 0) {
      return NextResponse.json(
        { error: 'At least 1 family member is required' },
        { status: 400 }
      );
    }

    // Categorize family members
    const adults = familyMembers.filter((m: { age: number }) => m.age >= 18);
    const kids = familyMembers.filter((m: { age: number }) => m.age < 18);
    const maleAdults = adults.filter((m: { gender: string }) => m.gender === 'male');
    const femaleAdults = adults.filter((m: { gender: string }) => m.gender === 'female');
    const maleKids = kids.filter((m: { gender: string }) => m.gender === 'male');
    const femaleKids = kids.filter((m: { gender: string }) => m.gender === 'female');
    const elders = adults.filter((m: { age: number }) => m.age >= 55);

    // Occasion-specific product catalogs
    const occasionProducts: Record<string, Record<string, Array<{ name: string; price: number }>>> = {
      diwali: {
        male: [
          { name: 'Silk Kurta Pajama Set', price: 3499 },
          { name: 'Gold Plated Cufflinks', price: 1999 },
          { name: 'Premium Dry Fruit Box', price: 2499 },
          { name: 'Designer Diyas Set', price: 899 },
          { name: 'Leather Puja Thali Set', price: 1599 },
        ],
        female: [
          { name: 'Banarasi Silk Saree', price: 5999 },
          { name: 'Gold Plated Necklace Set', price: 4499 },
          { name: 'Designer Diya & Candle Set', price: 1299 },
          { name: 'Rangoli Colors & Stencils Kit', price: 699 },
          { name: 'Silver Plated Pooja Thali', price: 2499 },
        ],
        kids_male: [
          { name: 'Kids Ethnic Kurta Set', price: 1499 },
          { name: 'Diwali Crackers Gift Box', price: 999 },
          { name: 'LED Diya Making Kit', price: 599 },
        ],
        kids_female: [
          { name: 'Kids Lehenga Choli Set', price: 1799 },
          { name: 'Diwali Art & Craft Kit', price: 699 },
          { name: 'Fairy Light Decoration Set', price: 499 },
        ],
        elder: [
          { name: 'Premium Pooja Samagri Box', price: 1999 },
          { name: 'Silver Coin Set (Lakshmi Ganesh)', price: 4999 },
          { name: 'Ayurvedic Gift Hamper', price: 2999 },
        ],
      },
      christmas: {
        male: [
          { name: 'Christmas Sweater', price: 2499 },
          { name: 'Whiskey Gift Set', price: 3999 },
          { name: 'LED Christmas Tree', price: 1999 },
        ],
        female: [
          { name: 'Christmas Party Dress', price: 3499 },
          { name: 'Festive Candle Set', price: 1499 },
          { name: 'Ornament Making Kit', price: 999 },
        ],
        kids_male: [
          { name: 'Santa Claus Costume', price: 1299 },
          { name: 'Christmas LEGO Set', price: 2499 },
          { name: 'Stocking Fillers Pack', price: 799 },
        ],
        kids_female: [
          { name: 'Christmas Fairy Dress', price: 1499 },
          { name: 'Gingerbread House Kit', price: 899 },
          { name: 'Princess Ornament Set', price: 699 },
        ],
        elder: [
          { name: 'Christmas Fruit Cake Hamper', price: 2499 },
          { name: 'Cozy Blanket & Mug Set', price: 1999 },
          { name: 'Carol Song Collection Box', price: 999 },
        ],
      },
      birthday: {
        male: [
          { name: 'Premium Watch', price: 5999 },
          { name: 'Grooming Kit Deluxe', price: 2999 },
          { name: 'Tech Gadget Gift Set', price: 4499 },
        ],
        female: [
          { name: 'Designer Handbag', price: 6999 },
          { name: 'Skincare Luxury Set', price: 3499 },
          { name: 'Birthstone Jewelry', price: 4999 },
        ],
        kids_male: [
          { name: 'Action Figure Collection', price: 1999 },
          { name: 'Remote Control Car', price: 2499 },
          { name: 'Building Blocks Set', price: 1499 },
        ],
        kids_female: [
          { name: 'Doll House Playset', price: 2999 },
          { name: 'Art & Craft Mega Kit', price: 1499 },
          { name: 'Princess Dress Up Set', price: 1799 },
        ],
        elder: [
          { name: 'Premium Tea Collection', price: 1999 },
          { name: 'Spiritual Books Box Set', price: 1499 },
          { name: 'Health Monitor Device', price: 3499 },
        ],
      },
    };

    // Default fallback products
    const defaultProducts: Record<string, Array<{ name: string; price: number }>> = {
      male: [
        { name: 'Premium Gift Set', price: 3499 },
        { name: 'Luxury Accessory', price: 2999 },
        { name: 'Festive Special Hamper', price: 2499 },
      ],
      female: [
        { name: 'Elegant Gift Collection', price: 3999 },
        { name: 'Designer Accessory Set', price: 3499 },
        { name: 'Beauty Gift Box', price: 2499 },
      ],
      kids_male: [
        { name: 'Kids Fun Pack', price: 1499 },
        { name: 'Adventure Gift Set', price: 1999 },
      ],
      kids_female: [
        { name: 'Kids Delight Pack', price: 1499 },
        { name: 'Creative Art Set', price: 1299 },
      ],
      elder: [
        { name: 'Wellness Gift Hamper', price: 2999 },
        { name: 'Premium Comfort Set', price: 2499 },
      ],
    };

    const catalog = occasionProducts[occasion] || defaultProducts;

    // Build packages
    const packages = [];

    // Complete Family Package
    if (familyMembers.length >= 2) {
      const items = [];
      let originalPrice = 0;

      maleAdults.slice(0, 2).forEach((_: unknown, i: number) => {
        const products = catalog.male || defaultProducts.male;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Him', memberType: 'male_adult' });
        originalPrice += p.price;
      });
      femaleAdults.slice(0, 2).forEach((_: unknown, i: number) => {
        const products = catalog.female || defaultProducts.female;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Her', memberType: 'female_adult' });
        originalPrice += p.price;
      });
      maleKids.slice(0, 2).forEach((_: unknown, i: number) => {
        const products = catalog.kids_male || defaultProducts.kids_male;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Boy', memberType: 'male_kid' });
        originalPrice += p.price;
      });
      femaleKids.slice(0, 2).forEach((_: unknown, i: number) => {
        const products = catalog.kids_female || defaultProducts.kids_female;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Girl', memberType: 'female_kid' });
        originalPrice += p.price;
      });
      elders.slice(0, 2).forEach((_: unknown, i: number) => {
        const products = catalog.elder || defaultProducts.elder;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Elders', memberType: 'elder' });
        originalPrice += p.price;
      });

      if (items.length > 0) {
        const discount = 0.15;
        packages.push({
          id: `pkg-family-${Date.now()}`,
          name: 'Complete Family Gift Pack',
          emoji: '🎁',
          description: `Curated for your family of ${familyMembers.length} — something special for everyone`,
          items,
          originalPrice,
          packagePrice: Math.floor(originalPrice * (1 - discount)),
          discountPercent: Math.round(discount * 100),
          memberCount: items.length,
        });
      }
    }

    // Couples Special
    if (maleAdults.length > 0 && femaleAdults.length > 0) {
      const maleProducts = catalog.male || defaultProducts.male;
      const femaleProducts = catalog.female || defaultProducts.female;
      const items = [
        { ...maleProducts[0], for: 'Him', memberType: 'male_adult' },
        { ...femaleProducts[0], for: 'Her', memberType: 'female_adult' },
      ];
      if (maleProducts.length > 1) items.push({ ...maleProducts[1], for: 'Him', memberType: 'male_adult' });
      if (femaleProducts.length > 1) items.push({ ...femaleProducts[1], for: 'Her', memberType: 'female_adult' });
      const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
      const discount = 0.18;
      packages.push({
        id: `pkg-couple-${Date.now()}`,
        name: 'Couples Special',
        emoji: '💑',
        description: 'Perfect pair gifts for the special couple',
        items,
        originalPrice,
        packagePrice: Math.floor(originalPrice * (1 - discount)),
        discountPercent: Math.round(discount * 100),
        memberCount: 2,
      });
    }

    // Kids Delight
    if (kids.length > 0) {
      const items = [];
      let originalPrice = 0;
      maleKids.forEach((_: unknown, i: number) => {
        const products = catalog.kids_male || defaultProducts.kids_male;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Boy', memberType: 'male_kid' });
        originalPrice += p.price;
      });
      femaleKids.forEach((_: unknown, i: number) => {
        const products = catalog.kids_female || defaultProducts.kids_female;
        const p = products[i % products.length];
        items.push({ ...p, for: 'Girl', memberType: 'female_kid' });
        originalPrice += p.price;
      });
      if (items.length > 0) {
        const discount = 0.20;
        packages.push({
          id: `pkg-kids-${Date.now()}`,
          name: 'Kids Delight',
          emoji: '🧒',
          description: `Fun surprises for ${kids.length} little ${kids.length === 1 ? 'one' : 'ones'}`,
          items,
          originalPrice,
          packagePrice: Math.floor(originalPrice * (1 - discount)),
          discountPercent: Math.round(discount * 100),
          memberCount: kids.length,
        });
      }
    }

    // Elders Blessing
    if (elders.length > 0) {
      const elderProducts = catalog.elder || defaultProducts.elder;
      const items = elders.slice(0, 3).map((_: unknown, i: number) => ({
        ...elderProducts[i % elderProducts.length],
        for: 'Elder',
        memberType: 'elder',
      }));
      const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
      const discount = 0.15;
      packages.push({
        id: `pkg-elder-${Date.now()}`,
        name: "Elder's Blessing",
        emoji: '🙏',
        description: `Thoughtful gifts for ${elders.length} respected ${elders.length === 1 ? 'elder' : 'elders'}`,
        items,
        originalPrice,
        packagePrice: Math.floor(originalPrice * (1 - discount)),
        discountPercent: Math.round(discount * 100),
        memberCount: elders.length,
      });
    }

    // Family offers
    const offers = [
      {
        id: 'offer-1',
        title: 'Buy 3+ items: 15% off',
        description: 'On any family package with 3 or more items',
        type: 'percentage' as const,
        value: 15,
        minItems: 3,
      },
      {
        id: 'offer-2',
        title: 'Family of 4+: Free gift wrapping',
        description: 'Complimentary premium gift wrapping for all items',
        type: 'freebie' as const,
        value: 0,
        minFamilySize: 4,
      },
      {
        id: 'offer-3',
        title: 'Occasion Special: Extra 10% on prepaid',
        description: `Additional 10% discount on prepaid orders for ${occasion}`,
        type: 'percentage' as const,
        value: 10,
        paymentMethod: 'prepaid',
      },
    ];

    return NextResponse.json({
      success: true,
      packages,
      offers,
      familyComposition: {
        total: familyMembers.length,
        adults: adults.length,
        kids: kids.length,
        maleAdults: maleAdults.length,
        femaleAdults: femaleAdults.length,
        maleKids: maleKids.length,
        femaleKids: femaleKids.length,
        elders: elders.length,
      },
    });
  } catch (error) {
    console.error('Family packages error:', error);
    return NextResponse.json(
      { error: 'Failed to generate family packages' },
      { status: 500 }
    );
  }
}
