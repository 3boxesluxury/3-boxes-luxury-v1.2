import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticate, requireAdmin } from '@/lib/auth-helper'

// GET /api/support/tickets/[id]/messages - Get messages for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // If ticket has a userId, verify the requester is the owner or admin
    if (ticket.userId) {
      const { user, error } = await authenticate(request)
      if (error) return error

      if (user!.id !== ticket.userId && user!.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own tickets' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ messages: ticket.messages })
  } catch (err) {
    console.error('Error fetching ticket messages:', err)
    return NextResponse.json(
      { error: 'Failed to fetch ticket messages' },
      { status: 500 }
    )
  }
}

// POST /api/support/tickets/[id]/messages - Add message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { message, senderId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // If ticket is closed, don't allow new messages unless admin
    if (ticket.status === 'closed') {
      const { user, error } = await authenticate(request)
      if (error) return error
      if (user!.role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot add messages to a closed ticket' },
          { status: 400 }
        )
      }
    }

    const ticketMessage = await db.supportTicketMessage.create({
      data: {
        ticketId: id,
        message,
        senderId: senderId || undefined,
      },
    })

    // Update ticket status to in_progress if it was open
    if (ticket.status === 'open') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      })
    }

    return NextResponse.json({ message: ticketMessage }, { status: 201 })
  } catch (err) {
    console.error('Error adding ticket message:', err)
    return NextResponse.json(
      { error: 'Failed to add ticket message' },
      { status: 500 }
    )
  }
}

// PUT /api/support/tickets/[id]/messages - Update ticket status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Require admin to update status
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { status } = body

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (open, in_progress, resolved, closed)' },
        { status: 400 }
      )
    }

    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const updatedTicket = await db.supportTicket.update({
      where: { id },
      data: { status },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json({ ticket: updatedTicket })
  } catch (err) {
    console.error('Error updating ticket status:', err)
    return NextResponse.json(
      { error: 'Failed to update ticket status' },
      { status: 500 }
    )
  }
}
