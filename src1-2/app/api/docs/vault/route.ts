import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

// ── GET /api/docs/vault — Check if vault password is set ───────────

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const docId = request.nextUrl.searchParams.get('docId') || 'patent-documentation'

  try {
    const vault = await db.docVaultPassword.findUnique({ where: { docId } })
    return NextResponse.json({
      isPasswordSet: !!vault,
      setBy: vault?.setBy || null,
      createdAt: vault?.createdAt || null,
    })
  } catch (err) {
    console.error('[docs/vault] GET error:', err)
    return NextResponse.json({ error: 'Failed to check vault status' }, { status: 500 })
  }
}

// ── POST /api/docs/vault — Set or verify vault password ────────────

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { docId, action, password } = body

    if (!docId || !action || !password) {
      return NextResponse.json({ error: 'docId, action, and password are required' }, { status: 400 })
    }

    // ── SET PASSWORD (only super admin can set) ──
    if (action === 'set') {
      if (!isSuperAdmin(user)) {
        return NextResponse.json({ error: 'Only super admin can set vault password' }, { status: 403 })
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      await db.docVaultPassword.upsert({
        where: { docId },
        update: { password: hashedPassword, setBy: user.userId },
        create: { docId, password: hashedPassword, setBy: user.userId },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'vault_password_set',
          entity: 'documentation',
          entityId: docId,
          details: JSON.stringify({ setBy: user.email }),
        },
      })

      return NextResponse.json({ success: true, message: 'Vault password set successfully' })
    }

    // ── VERIFY PASSWORD ──
    if (action === 'verify') {
      const vault = await db.docVaultPassword.findUnique({ where: { docId } })
      if (!vault) {
        return NextResponse.json({ error: 'No vault password set for this document' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(password, vault.password)

      // Audit log for verification attempt
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: isValid ? 'vault_password_verified' : 'vault_password_failed',
          entity: 'documentation',
          entityId: docId,
          details: JSON.stringify({ attemptedBy: user.email }),
        },
      })

      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }

      return NextResponse.json({ success: true, verified: true })
    }

    // ── CHANGE PASSWORD (only super admin) ──
    if (action === 'change') {
      if (!isSuperAdmin(user)) {
        return NextResponse.json({ error: 'Only super admin can change vault password' }, { status: 403 })
      }

      const { currentPassword } = body
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }

      const vault = await db.docVaultPassword.findUnique({ where: { docId } })
      if (!vault) {
        return NextResponse.json({ error: 'No vault password set for this document' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, vault.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      await db.docVaultPassword.update({
        where: { docId },
        data: { password: hashedPassword, setBy: user.userId },
      })

      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'vault_password_changed',
          entity: 'documentation',
          entityId: docId,
        },
      })

      return NextResponse.json({ success: true, message: 'Vault password changed successfully' })
    }

    return NextResponse.json({ error: 'Invalid action. Use: set, verify, or change' }, { status: 400 })
  } catch (err) {
    console.error('[docs/vault] POST error:', err)
    return NextResponse.json({ error: 'Vault operation failed' }, { status: 500 })
  }
}
