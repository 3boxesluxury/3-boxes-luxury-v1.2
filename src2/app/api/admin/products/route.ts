import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// GET /api/admin/products - List all products with category + vendor
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { productNumber: { contains: search } },
      { sku: { contains: search } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: true,
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p: any) => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images || '[]') : p.images,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags || 'null') : p.tags,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/admin/products - Create product with auto-generated productNumber and slug
export async function POST(request: NextRequest) {
  const { error, user } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      name,
      description,
      price,
      compareAtPrice,
      costPrice,
      sku,
      images,
      categoryId,
      stock,
      reorderLevel,
      featured,
      tags,
      vendorId,
      sourceUrl,
      platform,
    } = body;

    if (!name || !description || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Name, description, price, and categoryId are required' },
        { status: 400 }
      );
    }

    // ── Verify the category exists before creating product ──
    const categoryExists = await db.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return NextResponse.json(
        { error: `Category not found (id: ${categoryId}). Please select a valid category.` },
        { status: 400 }
      );
    }

    // Auto-generate productNumber: PRD-XXXXX
    // Find the highest existing productNumber to avoid unique constraint violations
    let productNumber = '';
    let attempts = 0;
    while (attempts < 10) {
      const allProducts = await db.product.findMany({
        select: { productNumber: true },
        orderBy: { productNumber: 'desc' },
        take: 1,
      });
      let nextNum = 10001;
      if (allProducts.length > 0 && allProducts[0].productNumber) {
        const lastNum = parseInt(allProducts[0].productNumber.replace('PRD-', ''));
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      productNumber = `PRD-${nextNum}`;
      // Verify it doesn't already exist
      const exists = await db.product.findUnique({ where: { productNumber } });
      if (!exists) break;
      nextNum++;
      attempts++;
    }
    if (!productNumber) {
      return NextResponse.json({ error: 'Failed to generate unique product number' }, { status: 500 });
    }

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

    // ── Build product data with safe defaults ──
    const productData: Record<string, any> = {
      productNumber,
      name,
      slug,
      description,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      sku: sku || null,
      images: images ? JSON.stringify(images) : '[]',
      categoryId,
      stock: stock ? parseInt(stock) : 0,
      reorderLevel: reorderLevel ? parseInt(reorderLevel) : 5,
      featured: featured || false,
      tags: tags ? JSON.stringify(tags) : null,
    };

    // Only add vendorId if it's a valid non-empty string
    if (vendorId && vendorId !== 'none') {
      // Verify vendor exists
      const vendorExists = await db.vendor.findUnique({ where: { id: vendorId } });
      if (vendorExists) {
        productData.vendorId = vendorId;
      }
    }

    // Only add optional fields if they have values
    if (sourceUrl) productData.sourceUrl = sourceUrl;
    if (platform) productData.platform = platform;

    const product = await db.product.create({
      data: productData,
      include: {
        category: true,
        vendor: true,
      },
    });

    // Parse images back for response
    const productResponse = {
      ...product,
      images: JSON.parse(product.images),
      tags: product.tags ? JSON.parse(product.tags) : null,
    };

    return NextResponse.json(productResponse, { status: 201 });
  } catch (err: any) {
    console.error('Error creating product:', err);

    // Return the ACTUAL error message so we can debug
    const errorMessage = err?.message || 'Failed to create product';
    const prismaError = err?.meta?.cause || '';
    const fullError = prismaError ? `${errorMessage}: ${prismaError}` : errorMessage;

    return NextResponse.json({ error: fullError }, { status: 500 });
  }
}
