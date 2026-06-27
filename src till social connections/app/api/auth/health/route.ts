import { NextResponse } from 'next/server';

/**
 * GET /api/auth/health
 * Simple health check to verify API routes are working on Vercel
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'OAuth API routes are working',
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasFacebookAppId: !!process.env.FACEBOOK_APP_ID,
      hasFacebookAppSecret: !!process.env.FACEBOOK_APP_SECRET,
      hasLinkedInClientId: !!process.env.LINKEDIN_CLIENT_ID,
      hasLinkedInClientSecret: !!process.env.LINKEDIN_CLIENT_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
    }
  });
}
