import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest, type AuthUser } from '@/lib/auth-helper'

type CartWithItems = Awaited<ReturnType<typeof db.cart.findUnique>> & {
  items: Array<{
    id: string
    cartId: string
    productId: string
    quantity: number
    variantId: string | null
    giftWrapping: boolean
    greetingMessage: string | null
    hidePrice: boolean
    product: NonNullable<Awaited<ReturnType<typeof db.product.findUnique>>> & {
      category: NonNullable<Awaited<ReturnType<typeof db.category.findUnique>>>
    }
  }>
  couponCode: string | null
  userId: string | null
}

// Helper: get or create cart for session/user
async function getOrCreateCart(sessionId: string, authUser?: AuthUser | null): Promise<CartWithItems> {
  let cart: CartWithItems | null = null

  if (authUser) {
    const userCart = await db.cart.findFirst({
      where: { userId: authUser.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })
    if (userCart) cart = userCart as unknown as CartWithItems
  }

  if (!cart) {
    const sessionCart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })
    if (sessionCart) cart = sessionCart as unknown as CartWithItems
  }

  if (!cart) {
    const newCart = await db.cart.create({
      data: { sessionId, userId: authUser?.id || undefined },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })
    cart = newCart as unknown as CartWithItems
  } else if (authUser && !cart.userId) {
    // Link anonymous cart to user
    const updated = await db.cart.update({
      where: { id: cart.id },
      data: { userId: authUser.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })
    cart = updated as unknown as CartWithItems
  }

  return cart
}

// Validate coupon code using offers logic
async function validateCoupon(code: string, subtotal: number) {
  const offer = await db.offer.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!offer) return { valid: false, error: 'Invalid coupon code', discount: 0 }

  if (!offer.isActive) return { valid: false, error: 'This coupon is no longer active', discount: 0 }

  const now = new Date()
  if (offer.validFrom > now) return { valid: false, error: 'This coupon is not yet active', discount: 0 }
  if (offer.validTo < now) return { valid: false, error: 'This coupon has expired', discount: 0 }
  if (offer.usageLimit !== null && offer.usedCount >= offer.usageLimit)
    return { valid: false, error: 'This coupon has reached its usage limit', discount: 0 }
  if (offer.minOrder !== null && subtotal < offer.minOrder)
    return { valid: false, error: `Minimum order amount is ₹${offer.minOrder}`, discount: 0 }

  let discount = 0
  if (offer.type === 'percentage') {
    discount = (subtotal * offer.value) / 100
    if (offer.maxDiscount !== null) discount = Math.min(discount, offer.maxDiscount)
  } else if (offer.type === 'fixed') {
    discount = offer.value
  }

  discount = Math.min(discount, subtotal)
  discount = Math.round(discount * 100) / 100

  return { valid: true, error: null as string | null, discount, offer }
}

/**
 * Return an empty cart response when the database is unavailable.
 * This allows the frontend to continue working with client-side cart state.
 */
function emptyCartResponse() {
  return NextResponse.json({
    cart: {
      id: 'offline-cart',
      sessionId: 'offline',
      userId: null,
      couponCode: null,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    summary: {
      subtotal: 0,
      discount: 0,
      itemCount: 0,
    },
    source: 'offline',
  })
}

// GET /api/cart - Get cart with items
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const user = await getSessionFromRequest(request)
    const cart = await getOrCreateCart(sessionId, user)

    // Calculate cart summary
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product!.price
      return sum + price * item.quantity
    }, 0)

    // Check if coupon is valid and calculate discount
    let discount = 0
    if (cart.couponCode) {
      const validation = await validateCoupon(cart.couponCode, subtotal)
      discount = validation.discount
      // If coupon is no longer valid, remove it
      if (!validation.valid && cart.couponCode) {
        await db.cart.update({
          where: { id: cart.id },
          data: { couponCode: null },
        })
        discount = 0
      }
    }

    return NextResponse.json({
      cart,
      summary: {
        subtotal: Math.round(subtotal * 100) / 100,
        discount,
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
      source: 'database',
    })
  } catch (error) {
    console.warn('[Cart API] Database query failed, returning empty offline cart:', error)
    return emptyCartResponse()
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      productId,
      quantity = 1,
      variantId,
      giftWrapping = false,
      greetingMessage,
      hidePrice = false,
    } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Verify product exists and has stock
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // If variant specified, verify it exists
    if (variantId) {
      const variant = await db.productVariant.findUnique({
        where: { id: variantId },
      })
      if (!variant || variant.productId !== productId) {
        return NextResponse.json(
          { error: 'Product variant not found' },
          { status: 404 }
        )
      }
      if (variant.stock < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for selected variant' },
          { status: 400 }
        )
      }
    } else {
      if (product.stock < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        )
      }
    }

    const user = await getSessionFromRequest(request)
    const cart = await getOrCreateCart(sessionId, user)

    // Check if item with same product+variant already exists in cart
    const existingItem = cart.items.find(
      (item) => item.productId === productId && item.variantId === (variantId || null)
    )

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (variantId) {
        const variant = await db.productVariant.findUnique({ where: { id: variantId } })
        if (variant && variant.stock < newQuantity) {
          return NextResponse.json(
            { error: 'Insufficient stock for selected variant' },
            { status: 400 }
          )
        }
      } else if (product.stock < newQuantity) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        )
      }
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          giftWrapping: giftWrapping || existingItem.giftWrapping,
          greetingMessage: greetingMessage || existingItem.greetingMessage,
          hidePrice: hidePrice || existingItem.hidePrice,
        },
      })
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          variantId: variantId || null,
          giftWrapping,
          greetingMessage: greetingMessage || null,
          hidePrice,
        },
      })
    }

    // Return updated cart
    const updatedCart = await db.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ cart: updatedCart, source: 'database' })
  } catch (error) {
    console.warn('[Cart API] Database operation failed for POST:', error)
    return NextResponse.json(
      { error: 'Cart is currently unavailable. Please use client-side cart or try again later.', offline: true },
      { status: 503 }
    )
  }
}

// PATCH /api/cart - Update item quantity OR apply/remove coupon
export async function PATCH(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action } = body

    // Handle coupon actions
    if (action === 'applyCoupon') {
      const { couponCode } = body
      if (!couponCode) {
        return NextResponse.json(
          { error: 'Coupon code is required' },
          { status: 400 }
        )
      }

      const user = await getSessionFromRequest(request)
      const cart = await getOrCreateCart(sessionId, user)

      // Calculate subtotal from cart items
      const subtotal = cart.items.reduce((sum, item) => {
        return sum + item.product!.price * item.quantity
      }, 0)

      const validation = await validateCoupon(couponCode, subtotal)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error, valid: false },
          { status: 400 }
        )
      }

      // Apply coupon to cart
      await db.cart.update({
        where: { id: cart.id },
        data: { couponCode: couponCode.toUpperCase() },
      })

      const updatedCart = await db.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      })

      return NextResponse.json({
        cart: updatedCart,
        coupon: {
          valid: true,
          code: couponCode.toUpperCase(),
          discount: validation.discount,
          offer: validation.offer,
        },
      })
    }

    if (action === 'removeCoupon') {
      const user = await getSessionFromRequest(request)
      const cart = await getOrCreateCart(sessionId, user)

      await db.cart.update({
        where: { id: cart.id },
        data: { couponCode: null },
      })

      const updatedCart = await db.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      })

      return NextResponse.json({
        cart: updatedCart,
        coupon: { valid: false, code: null, discount: 0 },
      })
    }

    // Default: update item quantity
    const { cartItemId, quantity } = body

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Cart item ID and quantity are required' },
        { status: 400 }
      )
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      )
    }

    // Verify the cart item belongs to this session
    const cartItem = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    })

    if (!cartItem || cartItem.cart.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // Check stock for variant or product
    if (cartItem.variantId) {
      const variant = await db.productVariant.findUnique({ where: { id: cartItem.variantId } })
      if (variant && variant.stock < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for selected variant' },
          { status: 400 }
        )
      }
    } else if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }

    await db.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    })

    const updatedCart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ cart: updatedCart })
  } catch (error) {
    console.warn('[Cart API] Database operation failed for PATCH:', error)
    return NextResponse.json(
      { error: 'Cart update is currently unavailable. Please try again later.', offline: true },
      { status: 503 }
    )
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cartItemId = searchParams.get('cartItemId')

    if (!cartItemId) {
      return NextResponse.json(
        { error: 'Cart item ID is required' },
        { status: 400 }
      )
    }

    // Verify the cart item belongs to this session
    const cartItem = await db.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    })

    if (!cartItem || cartItem.cart.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    await db.cartItem.delete({
      where: { id: cartItemId },
    })

    const updatedCart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ cart: updatedCart })
  } catch (error) {
    console.warn('[Cart API] Database operation failed for DELETE:', error)
    return NextResponse.json(
      { error: 'Cart removal is currently unavailable. Please try again later.', offline: true },
      { status: 503 }
    )
  }
}
