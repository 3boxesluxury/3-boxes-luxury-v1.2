import { NextResponse } from 'next/server';

// ============================================================
// Facebook Auth Test Endpoint
// ============================================================
// Visit /api/auth/facebook/test to verify the route is deployed
// If you see JSON response, the route is working.
// If you see 404, the route files are not deployed correctly.
// ============================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Facebook Auth routes are deployed and working!',
    timestamp: new Date().toISOString(),
    appId: process.env.FACEBOOK_APP_ID ? 'configured (env)' : 'using default',
    appSecret: process.env.FACEBOOK_APP_SECRET ? 'configured (env)' : 'using default',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set (will auto-detect)',
    jwtSecret: process.env.JWT_SECRET ? 'configured' : 'not set (using default)',
  });
}
