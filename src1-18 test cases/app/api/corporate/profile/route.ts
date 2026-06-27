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

// GET /api/corporate/profile - Get corporate profile + branding
export async function GET(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    const branding = await db.corporateBranding.findUnique({
      where: { corporateId: corporateAccount!.id },
    });

    return NextResponse.json({
      corporate: corporateAccount,
      branding,
    });
  } catch (err) {
    console.error('Error fetching corporate profile:', err);
    return NextResponse.json(
      { error: 'Failed to fetch corporate profile', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// PUT /api/corporate/profile - Update corporate profile
export async function PUT(request: NextRequest) {
  const { error, corporateAccount } = await verifyCorporate(request);
  if (error) return error;

  try {
    const body = await request.json();
    const {
      companyName,
      industry,
      website,
      contactName,
      contactPhone,
      gstNumber,
      address,
      city,
      state,
      zipCode,
      panNumber,
      logo,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (companyName !== undefined) updateData.companyName = companyName.trim();
    if (industry !== undefined) updateData.industry = industry?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (contactName !== undefined) updateData.contactName = contactName.trim();
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || null;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (zipCode !== undefined) updateData.zipCode = zipCode?.trim() || null;
    if (panNumber !== undefined) updateData.panNumber = panNumber?.trim() || null;
    if (logo !== undefined) updateData.logo = logo?.trim() || null;

    const updated = await db.corporateAccount.update({
      where: { id: corporateAccount!.id },
      data: updateData,
    });

    return NextResponse.json({ corporate: updated });
  } catch (err) {
    console.error('Error updating corporate profile:', err);
    return NextResponse.json(
      { error: 'Failed to update corporate profile' },
      { status: 500 }
    );
  }
}
