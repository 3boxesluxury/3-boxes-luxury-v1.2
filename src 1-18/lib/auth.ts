import { NextRequest } from 'next/server'
import { sessions } from './sessions'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || '3boxes-secret-key'

/**
 * Extracts and validates the Bearer token from the request Authorization header.
 * Supports in-memory session cache, JWT tokens, and async session lookup.
 * Returns the session user if valid, or null if invalid/missing.
 */
export async function verifyAuth(
  request: NextRequest
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7) // Remove "Bearer " prefix
  if (!token) {
    return null
  }

  // 1. Check in-memory session cache (fastest)
  const session = sessions.get(token)
  if (session) {
    if (session.expiresAt < new Date()) {
      sessions.delete(token)
      return null
    }
    return {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
    }
  }

  // 2. Try JWT verification (works on Vercel without DB)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>
    if (decoded && decoded.type === 'session' && decoded.userId) {
      return {
        id: decoded.userId as string,
        email: (decoded.email as string) || '',
        name: (decoded.name as string) || '',
        role: (decoded.role as string) || 'user',
      }
    }
  } catch {
    // Not a valid JWT session token
  }

  // 3. Fall back to async session lookup (includes DB)
  try {
    const { getSessionAsync } = await import('./sessions')
    const sessionUser = await getSessionAsync(token)
    if (sessionUser) {
      return {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role,
      }
    }
  } catch {
    // Session lookup failed
  }

  return null
}
