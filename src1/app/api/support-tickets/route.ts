import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/support-tickets — list tickets based on role
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let tickets

    const { searchParams } = new URL(request.url)
    const unassigned = searchParams.get('unassigned') === 'true'

    if (user.role === 'admin') {
      // Admin sees all tickets
      tickets = await db.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
      })
    } else if (user.role === 'team') {
      if (unassigned) {
        // Team can also see all open/unassigned tickets for assignment view
        tickets = await db.supportTicket.findMany({
          where: {
            OR: [
              { assigneeId: null },
              { status: 'open' },
            ],
          },
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
            _count: { select: { messages: true } },
          },
        })
      } else {
        // Team sees assigned tickets
        tickets = await db.supportTicket.findMany({
          where: { assigneeId: user.id },
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            assignee: { select: { id: true, name: true, email: true } },
            _count: { select: { messages: true } },
          },
        })
      }
    } else {
      // User sees own tickets
      tickets = await db.supportTicket.findMany({
        where: { creatorId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true } },
        },
      })
    }

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Support tickets GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 })
  }
}

// POST /api/support-tickets — create a new ticket
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category, priority } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: 'title and description are required' },
        { status: 400 }
      )
    }

    const validCategories = ['general', 'technical', 'billing', 'product', 'returns']
    const validPriorities = ['low', 'medium', 'high', 'urgent']

    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    const ticket = await db.supportTicket.create({
      data: {
        title,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        creatorId: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('Support tickets POST error:', error)
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
  }
}
