import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// POST /api/affiliate/click — Track an affiliate click
// This is a public endpoint (no auth required) — used when users click affiliate links
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, platform, sourceUrl, referralCode } = body;

    if (!productId) {
      return Response.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    // Extract IP address and user agent from request
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // Record the click
    const click = await db.affiliateClick.create({
      data: {
        productId,
        platform: platform || product.platform || 'unknown',
        sourceUrl: sourceUrl || product.sourceUrl || null,
        referralCode: referralCode || product.affiliateId || null,
        ipAddress,
        userAgent,
      },
    });

    // Determine the redirect URL
    const redirectUrl = product.affiliateUrl || product.sourceUrl || sourceUrl;

    return Response.json({
      clickId: click.id,
      redirectUrl,
      message: 'Click tracked successfully',
    });
  } catch (err) {
    console.error('Error tracking affiliate click:', err);
    return Response.json({ error: 'Failed to track click' }, { status: 500 });
  }
}
