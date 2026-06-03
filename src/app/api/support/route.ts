import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Create a support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, subject, message, category, orderId, userId } = body

    if (!email || !name || !subject || !message) {
      return NextResponse.json(
        { error: 'Email, name, subject, and message are required' },
        { status: 400 }
      )
    }

    // Generate ticket ID
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const ticketId = `TKT-${timestamp}-${random}`

    const ticket = await db.supportTicket.create({
      data: {
        userId: userId || null,
        email,
        name,
        subject,
        message,
        category: category || 'other',
        orderId: orderId || null,
        priority: 'medium',
        status: 'open',
      },
    })

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketId,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}

// GET: Fetch user's tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    const tickets = await db.supportTicket.findMany({
      where: { userId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
