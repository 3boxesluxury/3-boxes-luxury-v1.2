import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionAsync } from '@/lib/sessions'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key')
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production. Set it in Vercel → Settings → Environment Variables')
}

interface JWTPayload {
  userId: string
  email?: string
  role?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  adminRole?: string | null
  corporateRole?: string | null
  approvalStatus?: string
  isActive?: boolean
  emailVerified?: boolean
  twoFactorEnabled?: boolean
  twoFactorRequired?: boolean
}

/**
 * Authenticate a request using either JWT or session token from the Authorization header.
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }),
    }
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { type?: string; name?: string }

    if (decoded.type === 'session' && decoded.userId) {
      return {
        user: {
          id: decoded.userId,
          email: decoded.email || '',
          name: decoded.name || '',
          role: decoded.role || 'user',
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          twoFactorEnabled: false,
        },
        error: null,
      }
    }

    try {
      const dbUser = await db.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          corporateRole: true,
          isActive: true,
          approvalStatus: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorRequired: true,
        },
      })

      if (!dbUser || !dbUser.isActive) {
        return {
          user: null,
          error: NextResponse.json({ error: 'User not found or inactive' }, { status: 401 }),
        }
      }

      return {
        user: dbUser as AuthUser,
        error: null,
      }
    } catch {
      return {
        user: {
          id: decoded.userId,
          email: decoded.email || '',
          name: decoded.name || '',
          role: decoded.role || 'user',
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          twoFactorEnabled: false,
        },
        error: null,
      }
    }
  } catch {
    // JWT verification failed, try session-based auth
  }

  try {
    const sessionUser = await getSessionAsync(token)
    if (!sessionUser) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
      }
    }

    try {
      const dbUser = await db.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          adminRole: true,
          corporateRole: true,
          isActive: true,
          approvalStatus: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorRequired: true,
        },
      })

      if (!dbUser || !dbUser.isActive) {
        return {
          user: null,
          error: NextResponse.json({ error: 'User not found or inactive' }, { status: 401 }),
        }
      }

      return {
        user: dbUser as AuthUser,
        error: null,
      }
    } catch {
      return {
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          role: sessionUser.role,
          isActive: true,
          approvalStatus: 'approved',
          emailVerified: true,
          twoFactorEnabled: false,
        },
        error: null,
      }
    }
  } catch {
    return {
      user: null,
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    }
  }
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    const result = await authenticate(request)
    if (result.error) return null
    return result.user
  } catch {
    return null
  }
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(request)
  if (result.error) return result

  if (result.user.role !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    }
  }

  return result
}

export function generateJWT(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown'
}

export function parseDeviceInfo(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/Windows/i.test(userAgent)) return 'Windows Desktop'
  if (/Macintosh/i.test(userAgent)) return 'Mac Desktop'
  if (/Linux/i.test(userAgent)) return 'Linux Desktop'
  return 'Unknown Device'
}

export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(request)
  if (result.error) return result

  if (result.user.role === 'admin') {
    return result
  }

  try {
    const userPerms = await db.userPermission.findMany({
      where: { userId: result.user.id },
      select: { permission: true },
    })
    const permStrings = userPerms.map((p) => p.permission)

    if (!permStrings.includes(permission)) {
      return {
        user: null,
        error: NextResponse.json(
          { error: `Forbidden: '${permission}' permission required` },
          { status: 403 }
        ),
      }
    }

    return result
  } catch {
    return result
  }
}
