import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// POST /api/support-tickets/[id]/messages — add message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Access check — creator, assignee, or admin can add messages
    const isCreator = ticket.creatorId === user.id
    const isAssignee = ticket.assigneeId === user.id
    const isAdmin = user.role === 'admin'

    if (!isCreator && !isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const message = await db.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        senderName: user.name,
        content: content.trim(),
      },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Support ticket messages POST error:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}
