import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionAsync } from '@/lib/sessions';

async function verifyCorporate(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const session = await getSessionAsync(token ?? '');

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }

  if (session.role !== 'corporate') {
    return { error: NextResponse.json({ error: 'Forbidden. Corporate access required.' }, { status: 403 }), user: null };
  }

  const corporateAccount = await db.corporateAccount.findUnique({
    where: { userId: session.id },
  });

  if (!corporateAccount) {
    return { error: NextResponse.json({ error: 'Corporate account not found' }, { status: 404 }), user: null };
  }

  return { error: null, user: session, corporateAccount };
}

// GET /api/corporate/branding - Get branding settings
export async function GET(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    let branding = await db.corporateBranding.findUnique({
      where: { corporateId: corporateAccount!.id },
    });

    // Return defaults if no branding exists yet
    if (!branding) {
      branding = {
        id: '',
        corporateId: corporateAccount!.id,
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
        customMessage: null,
        packagingType: 'standard',
        giftWrapStyle: null,
        includeBranding: true,
        hidePrice: true,
        cardTemplate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json({ branding });
  } catch (err) {
    console.error('Error fetching branding:', err);
    return NextResponse.json(
      { error: 'Failed to fetch branding settings' },
      { status: 500 }
    );
  }
}

// PUT /api/corporate/branding - Update branding settings (upsert)
export async function PUT(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      logoUrl,
      primaryColor,
      secondaryColor,
      customMessage,
      packagingType,
      giftWrapStyle,
      includeBranding,
      hidePrice,
      cardTemplate,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor?.trim() || null;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor?.trim() || null;
    if (customMessage !== undefined) updateData.customMessage = customMessage?.trim() || null;
    if (packagingType !== undefined) {
      const validTypes = ['standard', 'premium', 'luxury'];
      if (!validTypes.includes(packagingType)) {
        return NextResponse.json(
          { error: 'Invalid packagingType. Must be one of: standard, premium, luxury' },
          { status: 400 }
        );
      }
      updateData.packagingType = packagingType;
    }
    if (giftWrapStyle !== undefined) updateData.giftWrapStyle = giftWrapStyle?.trim() || null;
    if (includeBranding !== undefined) updateData.includeBranding = Boolean(includeBranding);
    if (hidePrice !== undefined) updateData.hidePrice = Boolean(hidePrice);
    if (cardTemplate !== undefined) updateData.cardTemplate = cardTemplate?.trim() || null;

    // Upsert: create if doesn't exist, update if it does
    const branding = await db.corporateBranding.upsert({
      where: { corporateId: corporateAccount!.id },
      update: updateData,
      create: {
        corporateId: corporateAccount!.id,
        logoUrl: logoUrl?.trim() || null,
        primaryColor: primaryColor?.trim() || null,
        secondaryColor: secondaryColor?.trim() || null,
        customMessage: customMessage?.trim() || null,
        packagingType: packagingType || 'standard',
        giftWrapStyle: giftWrapStyle?.trim() || null,
        includeBranding: includeBranding !== undefined ? Boolean(includeBranding) : true,
        hidePrice: hidePrice !== undefined ? Boolean(hidePrice) : true,
        cardTemplate: cardTemplate?.trim() || null,
      },
    });

    return NextResponse.json({ branding });
  } catch (err) {
    console.error('Error updating branding:', err);
    return NextResponse.json(
      { error: 'Failed to update branding settings' },
      { status: 500 }
    );
  }
}
