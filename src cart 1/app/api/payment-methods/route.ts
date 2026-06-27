import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/payment-methods — return user's payment methods
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paymentMethods = await db.paymentMethod.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error('Payment methods GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
  }
}

// POST /api/payment-methods — create a payment method
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, label, last4, isDefault } = body

    if (!type || !label) {
      return NextResponse.json(
        { error: 'type and label are required' },
        { status: 400 }
      )
    }

    const validTypes = ['card', 'upi', 'netbanking', 'wallet']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid payment method type' }, { status: 400 })
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await db.paymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        userId: user.id,
        type,
        label,
        last4: last4 || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json({ paymentMethod }, { status: 201 })
  } catch (error) {
    console.error('Payment methods POST error:', error)
    return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 })
  }
}
