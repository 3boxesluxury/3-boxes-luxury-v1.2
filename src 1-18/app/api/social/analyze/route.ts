import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platforms, consents } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'At least one connected platform is required' },
        { status: 400 }
      );
    }

    // Simulate AI analysis delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate a fashion style profile based on connected platforms
    const styleOptions = [
      'Classic Elegance',
      'Modern Minimalist',
      'Bohemian Chic',
      'Streetwear Edge',
      'Romantic Feminine',
      'Corporate Power',
      'Casual Luxe',
      'Avant-Garde',
    ];

    const colorOptions = [
      '#1a1a2e', '#e94560', '#f5c518', '#0f3460',
      '#16213e', '#533483', '#e07c24', '#2d6a4f',
      '#d4af37', '#c2185b', '#00838f', '#4e342e',
    ];

    const brandOptions = [
      'Zara', 'H&M', 'Tanishq', 'Fabindia', 'Mango',
      'Allen Solly', 'Peter England', 'Biba', 'W', 'Global Desi',
      'CaratLane', 'Voylla', 'BlueStone', 'Nike', 'Adidas',
    ];

    const patternOptions = [
      'Seasonal Shopper', 'Brand Loyal', 'Sale Hunter',
      'Trend Follower', 'Quality First', 'Sustainable Buyer',
      'Impulse Buyer', 'Research Driven',
    ];

    // Select subset based on platforms
    const seed = platforms.length * 17 + platforms.join('').length;
    const pick = <T>(arr: T[], count: number): T[] => {
      const result: T[] = [];
      for (let i = 0; i < count; i++) {
        result.push(arr[(seed + i * 3) % arr.length]);
      }
      return [...new Set(result)] as T[];
    };

    const styles = pick(styleOptions, 3 + Math.min(platforms.length, 3)).map((name, i) => ({
      name,
      score: Math.max(40, 95 - i * 12 - (seed % 8)),
    }));

    const colors = pick(colorOptions, 5 + Math.min(platforms.length, 3));
    const brands = pick(brandOptions, 3 + Math.min(platforms.length, 2));
    const patterns = pick(patternOptions, 2 + Math.min(platforms.length, 2));

    // Generate recommendations
    const recNames = [
      'Silk Blend Saree', 'Gold Plated Necklace Set', 'Premium Leather Wallet',
      'Designer Kurti Collection', 'Diamond Stud Earrings', 'Cashmere Scarf',
      'Embroidered Clutch', 'Ethnic Dupatta Set', 'Silver Anklet Pair',
      'Premium Watch Collection', 'Silk Pocket Square', 'Pearl Drop Earrings',
    ];

    const recommendations = pick(recNames, 6).map((name, i) => ({
      id: `rec-${Date.now()}-${i}`,
      name,
      price: Math.floor(1500 + Math.random() * 8000),
      matchScore: Math.max(60, 98 - i * 6 - (seed % 5)),
      category: i % 2 === 0 ? 'women' : 'men',
    }));

    const profile = {
      styles,
      colors,
      brands,
      patterns,
      recommendations,
      analyzedAt: new Date().toISOString(),
      platformCount: platforms.length,
    };

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Social analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze social style' },
      { status: 500 }
    );
  }
}
