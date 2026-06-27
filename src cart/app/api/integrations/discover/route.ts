import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// Default platform integrations to auto-discover
const DEFAULT_INTEGRATIONS = [
  {
    name: 'Myntra',
    slug: 'myntra',
    baseUrl: 'https://www.myntra.com',
    logo: '/logos/myntra.png',
    categories: ['jewelry', 'sarees', 'fashion', 'watches'],
    commission: 8,
    maxProducts: 500,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'Nykaa',
    slug: 'nykaa',
    baseUrl: 'https://www.nykaa.com',
    logo: '/logos/nykaa.png',
    categories: ['jewelry', 'fragrances', 'fashion'],
    commission: 6,
    maxProducts: 500,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'Amazon India',
    slug: 'amazon',
    baseUrl: 'https://www.amazon.in',
    logo: '/logos/amazon.png',
    categories: ['jewelry', 'watches', 'fashion', 'fragrances', 'home-living'],
    commission: 5,
    maxProducts: 1000,
    affiliateTag: '3boxesluxury-21',
  },
  {
    name: 'Flipkart',
    slug: 'flipkart',
    baseUrl: 'https://www.flipkart.com',
    logo: '/logos/flipkart.png',
    categories: ['jewelry', 'watches', 'fashion'],
    commission: 5,
    maxProducts: 500,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'CaratLane',
    slug: 'caratlane',
    baseUrl: 'https://www.caratlane.com',
    logo: '/logos/caratlane.png',
    categories: ['jewelry'],
    commission: 10,
    maxProducts: 300,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'Tanishq',
    slug: 'tanishq',
    baseUrl: 'https://www.tanishq.co.in',
    logo: '/logos/tanishq.png',
    categories: ['jewelry'],
    commission: 8,
    maxProducts: 300,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'BlueStone',
    slug: 'bluestone',
    baseUrl: 'https://www.bluestone.com',
    logo: '/logos/bluestone.png',
    categories: ['jewelry'],
    commission: 9,
    maxProducts: 300,
    affiliateTag: '3boxesluxury',
  },
  {
    name: 'Voylla',
    slug: 'voylla',
    baseUrl: 'https://www.voylla.com',
    logo: '/logos/voylla.png',
    categories: ['jewelry', 'fashion'],
    commission: 7,
    maxProducts: 300,
    affiliateTag: '3boxesluxury',
  },
];

// POST /api/integrations/discover - Auto-discover and create default integrations
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const created: Array<Record<string, unknown>> = [];
    const skipped: Array<{ name: string; slug: string }> = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const def of DEFAULT_INTEGRATIONS) {
      // Check if integration already exists (by name or slug)
      const existing = await db.platformIntegration.findFirst({
        where: {
          OR: [{ name: def.name }, { slug: def.slug }],
        },
      });

      if (existing) {
        skipped.push({ name: def.name, slug: def.slug });
        continue;
      }

      try {
        const integration = await db.platformIntegration.create({
          data: {
            name: def.name,
            slug: def.slug,
            baseUrl: def.baseUrl,
            logo: def.logo,
            categories: JSON.stringify(def.categories),
            commission: def.commission,
            maxProducts: def.maxProducts,
            affiliateTag: def.affiliateTag,
            autoSync: true,
            syncInterval: 3600,
            isActive: true,
            syncStatus: 'idle',
            productCount: 0,
          },
        });

        created.push({
          ...integration,
          categories: JSON.parse(integration.categories || '[]'),
        });
      } catch (createErr: unknown) {
        const msg = createErr instanceof Error ? createErr.message : 'Unknown error';
        errors.push({ name: def.name, error: msg });
      }
    }

    return NextResponse.json({
      message: `Discovered ${created.length} new integrations, ${skipped.length} already existing`,
      created,
      skipped,
      errors,
    });
  } catch (err) {
    console.error('Error discovering integrations:', err);
    return NextResponse.json(
      { error: 'Failed to discover integrations' },
      { status: 500 }
    );
  }
}
