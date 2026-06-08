import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production. Set it in Vercel → Settings → Environment Variables');
}

// In-memory session cache for fast lookups
const sessionCache = new Map<string, { userId: string; expiresAt: Date; id: string; email: string; name: string; role: string }>();

/**
 * Export the session cache for synchronous lookups (used by auth.ts verifyAuth).
 */
export { sessionCache as sessions };

// Clean expired sessions from cache every 5 minutes
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const now = new Date();
    for (const [token, session] of sessionCache.entries()) {
      if (session.expiresAt < now) {
        sessionCache.delete(token);
      }
    }
  }, 5 * 60 * 1000);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  approvalStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

/**
 * Create a new session for a user.
 */
export async function createSession(
  token: string,
  user: SessionUser,
  metadata?: SessionMetadata
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Set in-memory cache FIRST so it's available even if DB write fails
  sessionCache.set(token, { userId: user.id, expiresAt, id: user.id, email: user.email, name: user.name, role: user.role });

  try {
    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        ipAddress: metadata?.ipAddress || null,
        userAgent: metadata?.userAgent || null,
        deviceInfo: metadata?.deviceInfo || null,
      },
    });
  } catch (dbError) {
    console.warn('[Sessions] DB write failed, session stored in-memory only:', dbError);
  }
}

/**
 * Get a session by token.
 */
export async function getSessionAsync(
  token: string
): Promise<SessionUser | null> {
  if (!token) return null;

  const cached = sessionCache.get(token);
  if (cached) {
    if (cached.expiresAt < new Date()) {
      sessionCache.delete(token);
      return null;
    }

    try {
      const user = await db.user.findUnique({
        where: { id: cached.userId },
      });

      if (!user || !user.isActive) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      };
    } catch {
      return {
        id: cached.id,
        email: cached.email,
        name: cached.name,
        role: cached.role,
        avatar: null,
        isActive: true,
        approvalStatus: 'approved',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
      };
    }
  }

  // Try JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;

    if (decoded && decoded.type === 'session' && decoded.userId) {
      return {
        id: decoded.userId as string,
        email: (decoded.email as string) || '',
        name: (decoded.name as string) || '',
        role: (decoded.role as string) || 'user',
        avatar: null,
        isActive: true,
        approvalStatus: 'approved',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
      };
    }
  } catch {
    // Not a valid JWT
  }

  // Fallback to DB session lookup
  try {
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { token } }).catch(() => {});
      return null;
    }

    if (!session.user.isActive) return null;

    sessionCache.set(token, {
      userId: session.userId,
      expiresAt: session.expiresAt,
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    });

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      avatar: session.user.avatar,
      isActive: session.user.isActive,
      approvalStatus: session.user.approvalStatus,
      emailVerified: session.user.emailVerified,
      phoneVerified: session.user.phoneVerified,
      twoFactorEnabled: session.user.twoFactorEnabled,
    };
  } catch {
    return null;
  }
}

/**
 * Destroy a session by token.
 */
export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token);

  try {
    await db.session.delete({ where: { token } });
  } catch {
    // Session may not exist
  }
}

/**
 * Generate a new session token (UUID).
 */
export function generateToken(): string {
  return uuidv4();
}

/**
 * Generate a JWT session token for Vercel serverless.
 */
export function generateSessionJWT(user: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(
    {
      type: 'session',
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

export async function generateTokenPair(
  user: SessionUser,
  permissions: string[] = []
): Promise<TokenPair> {
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions,
      type: 'access',
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPair | null> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const userWithPerms = await db.user.findUnique({
      where: { id: user.id },
      include: { permissions: { select: { permission: true } } },
    });
    const permissions = userWithPerms?.permissions.map((p) => p.permission) || [];

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      approvalStatus: user.approvalStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    };

    return generateTokenPair(sessionUser, permissions);
  } catch {
    return null;
  }
}
