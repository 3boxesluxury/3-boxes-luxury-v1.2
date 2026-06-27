/**
 * In-memory rate limiter for API endpoints
 * Tracks requests by IP address + endpoint
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when the window resets
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // time window in milliseconds
}

// Default configurations for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },           // 5 per 15 min
  'otp-login': { maxRequests: 3, windowMs: 5 * 60 * 1000 },       // 3 per 5 min
  register: { maxRequests: 3, windowMs: 60 * 60 * 1000 },         // 3 per hour
  'forgot-password': { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 min
  '2fa-verify': { maxRequests: 5, windowMs: 5 * 60 * 1000 },      // 5 per 5 min
};

// In-memory store: key = `${endpoint}:${ip}`, value = RateLimitEntry
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds until reset, only present if blocked
}

/**
 * Check if a request is allowed under the rate limit
 * @param endpoint - The endpoint identifier (e.g., 'login', 'register')
 * @param ip - The client IP address
 * @param config - Optional custom config, defaults to RATE_LIMITS[endpoint]
 */
export function checkRateLimit(
  endpoint: string,
  ip: string,
  config?: RateLimitConfig
): RateLimitResult {
  const limitConfig = config || RATE_LIMITS[endpoint];
  if (!limitConfig) {
    // No rate limit configured for this endpoint
    return { allowed: true, remaining: Infinity, resetAt: Date.now() + 60000 };
  }

  const key = `${endpoint}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // No entry or expired - create new
    const resetAt = now + limitConfig.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limitConfig.maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= limitConfig.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment counter
  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: limitConfig.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Create a rate limit error response (429)
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}
