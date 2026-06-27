import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, requireAdmin } from '@/lib/auth-helper'

// GET /api/support/tickets - List tickets for a user or all tickets (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // If userId provided, verify the requester is that user or admin
    if (userId) {
      const { user, error } = await authenticate(request)
      if (error) return error

      // Only allow users to see their own tickets, or admin can see any
      if (user!.id !== userId && user!.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own tickets' },
          { status: 403 }
        )
      }

      const tickets = await db.supportTicket.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ tickets })
    }

    // No userId provided - require admin
    const { user, error } = await requireAdmin(request)
    if (error) return error

    const tickets = await db.supportTicket.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (err) {
    console.error('Error fetching support tickets:', err)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// POST /api/support/tickets - Create a ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, priority, userId, message } = body

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    // If userId is provided, authenticate the user
    let resolvedUserId = userId || null
    if (userId) {
      const { user, error } = await authenticate(request)
      if (error) return error
      resolvedUserId = user!.id
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent']
    const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'medium'

    // Create ticket with first message
    const initialMessage = message || `Ticket created: ${subject}`

    const ticket = await db.supportTicket.create({
      data: {
        subject,
        priority: ticketPriority,
        userId: resolvedUserId,
        status: 'open',
        messages: {
          create: {
            message: initialMessage,
            senderId: resolvedUserId,
          },
        },
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    console.error('Error creating support ticket:', err)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}
