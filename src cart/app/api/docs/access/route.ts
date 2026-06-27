import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Auth Helper ─────────────────────────────────────────────────────

interface DecodedUser {
  userId: string
  email: string
  role: string
  adminRole?: string
}

function getUserFromRequest(request: NextRequest): DecodedUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return {
      userId: payload.userId || payload.sub || '',
      email: payload.email || '',
      role: payload.role || 'user',
      adminRole: payload.adminRole || undefined,
    }
  } catch {
    return null
  }
}

function isSuperAdmin(user: DecodedUser): boolean {
  return user.role === 'admin' && (user.adminRole === 'super_admin' || !user.adminRole)
}

// ── GET /api/docs/access — List all access grants ──────────────────

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const docId = request.nextUrl.searchParams.get('docId')

  try {
    const where = docId ? { docId } : {}
    const grants = await db.docAccessGrant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with user info
    const userIds = [...new Set(grants.map(g => g.userId))]
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const enriched = grants.map(g => ({
      ...g,
      user: userMap[g.userId] || { name: 'Unknown', email: 'Unknown', role: 'unknown' },
    }))

    return NextResponse.json({ grants: enriched })
  } catch (err) {
    console.error('[docs/access] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch access grants' }, { status: 500 })
  }
}

// ── POST /api/docs/access — Grant access to a user ─────────────────

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { docId, userId, canView, canDownload, canShare, expiresAt } = body

    if (!docId || !userId) {
      return NextResponse.json({ error: 'docId and userId are required' }, { status: 400 })
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const grant = await db.docAccessGrant.upsert({
      where: { docId_userId: { docId, userId } },
      update: {
        canView: canView ?? true,
        canDownload: canDownload ?? true,
        canShare: canShare ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: user.userId,
      },
      create: {
        docId,
        userId,
        grantedBy: user.userId,
        canView: canView ?? true,
        canDownload: canDownload ?? true,
        canShare: canShare ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'doc_access_grant',
        entity: 'documentation',
        entityId: docId,
        details: JSON.stringify({ targetUserId: userId, canView, canDownload, canShare }),
      },
    })

    return NextResponse.json({ grant })
  } catch (err) {
    console.error('[docs/access] POST error:', err)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }
}

// ── DELETE /api/docs/access — Revoke access ────────────────────────

export async function DELETE(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { docId, userId } = body

    if (!docId || !userId) {
      return NextResponse.json({ error: 'docId and userId are required' }, { status: 400 })
    }

    await db.docAccessGrant.deleteMany({
      where: { docId, userId },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'doc_access_revoke',
        entity: 'documentation',
        entityId: docId,
        details: JSON.stringify({ targetUserId: userId }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[docs/access] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }
}
