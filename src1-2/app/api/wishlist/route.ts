import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate } from '@/lib/auth-helper'

// GET /api/wishlist - List wishlist items for authenticated user
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const wishlistItems = await db.wishlistItem.findMany({
      where: { userId: user!.id },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            translations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform images from JSON string to parsed array (same as /api/products/[id])
    const transformed = wishlistItems.map((w: any) => {
      const p = w.product || {};
      let parsedImages: string[] = [];
      if (typeof p.images === 'string') {
        try { parsedImages = JSON.parse(p.images || '[]'); } catch { parsedImages = []; }
      } else if (Array.isArray(p.images)) {
        parsedImages = p.images;
      }
      return {
        ...w,
        product: {
          ...p,
          images: parsedImages,
          price: typeof p.price === 'string' ? parseFloat(p.price) : (p.price ?? 0),
          translations: (p.translations || []).map((tr: any) => ({
            locale: tr.locale,
            name: tr.name,
            description: tr.description,
          })),
        },
      };
    });

    return NextResponse.json({ wishlist: transformed })
  } catch (err) {
    console.error('Error fetching wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user!.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Product already in wishlist', wishlistItem: existing },
        { status: 409 }
      )
    }

    const wishlistItem = await db.wishlistItem.create({
      data: {
        userId: user!.id,
        productId,
      },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ wishlistItem }, { status: 201 })
  } catch (err) {
    console.error('Error adding to wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request)
    if (error) return error

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    const wishlistItem = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user!.id,
          productId,
        },
      },
    })

    if (!wishlistItem) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      )
    }

    await db.wishlistItem.delete({
      where: { id: wishlistItem.id },
    })

    return NextResponse.json({ message: 'Item removed from wishlist' })
  } catch (err) {
    console.error('Error removing from wishlist:', err)
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}
