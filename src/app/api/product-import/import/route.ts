import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';
import { processProductImages } from '@/lib/image-downloader';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// POST /api/product-import/import - Import scraped product to DB with sourceUrl and platform
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      name,
      description,
      price,
      compareAtPrice,
      images,
      categoryId,
      tags,
      sourceUrl,
      platform,
      vendorId,
      costPrice,
      sku,
      stock,
    } = body;

    if (!name || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Name, price, and categoryId are required' },
        { status: 400 }
      );
    }

    // Auto-generate productNumber: PRD-XXXXX
    const lastProduct = await db.product.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { productNumber: true },
    });
    let nextNum = 10001;
    if (lastProduct?.productNumber) {
      const lastNum = parseInt(lastProduct.productNumber.replace('PRD-', ''));
      nextNum = lastNum + 1;
    }
    const productNumber = `PRD-${nextNum}`;

    // Auto-generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Download external images to local storage if they're from external URLs
    let finalImages = images || [];
    if (Array.isArray(images) && images.length > 0 && platform) {
      const hasExternalUrl = images.some((url: string) =>
        url.startsWith('http') || url.startsWith('//')
      );
      if (hasExternalUrl) {
        const localImages = await processProductImages(images, platform);
        if (localImages.length > 0) {
          finalImages = localImages;
        }
        // If download failed, keep original URLs (they'll be proxied at runtime)
      }
    }

    const product = await db.product.create({
      data: {
        productNumber,
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        sku: sku || null,
        images: JSON.stringify(finalImages),
        categoryId,
        stock: stock ? parseInt(stock) : 0,
        reorderLevel: 5,
        featured: false,
        tags: tags ? JSON.stringify(tags) : null,
        vendorId: vendorId || null,
        sourceUrl: sourceUrl || null,
        platform: platform || null,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    const productResponse = {
      ...product,
      images: JSON.parse(product.images),
      tags: product.tags ? JSON.parse(product.tags) : null,
    };

    return NextResponse.json(productResponse, { status: 201 });
  } catch (err) {
    console.error('Error importing product:', err);
    return NextResponse.json({ error: 'Failed to import product' }, { status: 500 });
  }
}
