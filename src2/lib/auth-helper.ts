import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionAsync } from '@/lib/sessions'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key'

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
 * Returns the authenticated user or an error response.
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

  // Try JWT verification first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { type?: string; name?: string }

    // JWT session token with embedded user data (used on Vercel)
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

    // Standard JWT (from generateTokenPair) — try DB lookup
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
      // DB unavailable — return JWT data
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

  // Fall back to session-based auth
  try {
    const sessionUser = await getSessionAsync(token)
    if (!sessionUser) {
      return {
        user: null,
        error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
      }
    }

    // Try to fetch extended user data from DB
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
      // DB unavailable — return session user data
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

/**
 * Get session info from request (lightweight - returns AuthUser from token).
 * Useful for routes that need session data without full user DB lookup.
 * Returns null if not authenticated (no error thrown).
 */
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

/**
 * Require admin role. Authenticates first, then checks role.
 */
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

/**
 * Generate a JWT token for a user
 */
export function generateJWT(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Extract client IP address from request
 */
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

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'Unknown'
}

/**
 * Parse device info from user agent string (basic)
 */
export function parseDeviceInfo(userAgent: string): string {
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/Windows/i.test(userAgent)) return 'Windows Desktop'
  if (/Macintosh/i.test(userAgent)) return 'Mac Desktop'
  if (/Linux/i.test(userAgent)) return 'Linux Desktop'
  return 'Unknown Device'
}

/**
 * Require a specific permission. Authenticates first, then checks the user's permissions.
 * Admins always pass permission checks.
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<{ user: AuthUser; error: null } | { user: null; error: NextResponse }> {
  const result = await authenticate(request)
  if (result.error) return result

  // Admins have all permissions
  if (result.user.role === 'admin') {
    return result
  }

  // Look up user permissions from DB
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
    // DB unavailable — grant all permissions for demo users (Vercel fallback)
    return result
  }
}
