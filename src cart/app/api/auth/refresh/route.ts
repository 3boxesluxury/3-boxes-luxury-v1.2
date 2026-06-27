import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/sessions';
import { validateInput, refreshTokenSchema } from '@/lib/validations/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { addApiLog, getClientIpFromRequest } from '@/lib/api-logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit('login', ip); // Reuse login rate limit
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    // Validate input
    const validation = validateInput(refreshTokenSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const { refreshToken } = validation.data;

    // Refresh the token pair
    const tokenPair = await refreshAccessToken(refreshToken);

    if (!tokenPair) {
      addApiLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/refresh',
        statusCode: 401,
        responseTime: Date.now() - startTime,
        ip: getClientIpFromRequest(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        error: 'Invalid refresh token',
      });

      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/refresh',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ip: getClientIpFromRequest(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessExpiresAt: tokenPair.accessExpiresAt,
      refreshExpiresAt: tokenPair.refreshExpiresAt,
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    addApiLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/refresh',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      ip: getClientIpFromRequest(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'An error occurred during token refresh' },
      { status: 500 }
    );
  }
}
