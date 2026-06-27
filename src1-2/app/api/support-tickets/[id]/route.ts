import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/support-tickets/[id] — return ticket with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Access check
    const isCreator = ticket.creatorId === user.id
    const isAssignee = ticket.assigneeId === user.id
    const isAdmin = user.role === 'admin'

    if (!isCreator && !isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    console.error('Support ticket [id] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch support ticket' }, { status: 500 })
  }
}

// PATCH /api/support-tickets/[id] — update ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, priority, assigneeId } = body

    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Access check
    const isAssignee = ticket.assigneeId === user.id
    const isAdmin = user.role === 'admin'

    if (!isAssignee && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    const updateData: Record<string, string> = {}

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (priority !== undefined) {
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      // Only admin can change priority
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admin can change priority' }, { status: 403 })
      }
      updateData.priority = priority
    }

    if (assigneeId !== undefined) {
      // Only admin can change assignee
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admin can change assignee' }, { status: 403 })
      }
      updateData.assigneeId = assigneeId
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ ticket: updated })
  } catch (error) {
    console.error('Support ticket [id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 })
  }
}
