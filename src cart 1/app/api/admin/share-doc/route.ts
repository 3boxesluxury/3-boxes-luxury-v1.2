import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/admin/share-doc — list all document shares (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const shares = await db.agentDocShare.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with document and user info
    const enriched = await Promise.all(shares.map(async (share) => {
      const [doc, agent, admin] = await Promise.all([
        db.wikiDocument.findUnique({ where: { id: share.docId }, select: { id: true, title: true, category: true } }),
        db.user.findUnique({ where: { id: share.agentId }, select: { id: true, name: true, email: true } }),
        db.user.findUnique({ where: { id: share.sharedBy }, select: { id: true, name: true } }),
      ])
      return {
        ...share,
        document: doc,
        agent,
        admin,
      }
    }))

    return NextResponse.json({ shares: enriched })
  } catch (error) {
    console.error('Admin share-doc GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }
}

// POST /api/admin/share-doc — admin shares a wiki document with an agent
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { docId, agentId, canDownload, canShare, message } = body

    if (!docId || !agentId) {
      return NextResponse.json(
        { error: 'docId and agentId are required' },
        { status: 400 }
      )
    }

    // Verify document exists
    const doc = await db.wikiDocument.findUnique({ where: { id: docId } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify agent exists and has agent role
    const agent = await db.user.findUnique({ where: { id: agentId } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Create or update the share record
    try {
      const share = await db.agentDocShare.create({
        data: {
          docId,
          agentId,
          sharedBy: user.id,
          canDownload: canDownload !== undefined ? canDownload : true,
          canShare: canShare !== undefined ? canShare : false,
          message: message || null,
        },
      })

      return NextResponse.json({ share }, { status: 201 })
    } catch (err: unknown) {
      // Handle unique constraint — share already exists
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        return NextResponse.json(
          { error: 'Document already shared with this agent' },
          { status: 409 }
        )
      }
      throw err
    }
  } catch (error) {
    console.error('Admin share-doc POST error:', error)
    return NextResponse.json({ error: 'Failed to share document' }, { status: 500 })
  }
}
