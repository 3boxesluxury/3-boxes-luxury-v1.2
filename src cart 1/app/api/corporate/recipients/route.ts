import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: get user from Authorization header
async function getUserFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session.user;
}

// Helper: get corporate account for user
async function getCorporateForUser(userId: string) {
  return db.corporate.findUnique({
    where: { userId },
  });
}

// GET /api/corporate/recipients — List all recipients for the corporate account
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporate = await getCorporateForUser(user.id);
    if (!corporate) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    const recipients = await db.corporateRecipient.findMany({
      where: { corporateId: corporate.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}

// POST /api/corporate/recipients — Add single recipient or bulk upload
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporate = await getCorporateForUser(user.id);
    if (!corporate) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    const body = await req.json();

    // Bulk upload
    if (body.action === 'bulk' && Array.isArray(body.recipients)) {
      const results = await Promise.allSettled(
        body.recipients.map((r: { name: string; email: string; phone?: string; department?: string; designation?: string; address?: string; city?: string; state?: string; zipCode?: string; notes?: string }) =>
          db.corporateRecipient.create({
            data: {
              corporateId: corporate.id,
              name: r.name,
              email: r.email,
              phone: r.phone || null,
              department: r.department || null,
              designation: r.designation || null,
              address: r.address || null,
              city: r.city || null,
              state: r.state || null,
              zipCode: r.zipCode || null,
              notes: r.notes || null,
            },
          })
        )
      );

      const imported = results.filter((r) => r.status === 'fulfilled').length;
      const errors = results
        .map((r, i) =>
          r.status === 'rejected'
            ? { index: i, error: r.reason?.message || 'Failed to create' }
            : null
        )
        .filter(Boolean);

      return NextResponse.json({ imported, errors });
    }

    // Single recipient
    const { name, email, phone, department, designation, address, city, state, zipCode, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const recipient = await db.corporateRecipient.create({
      data: {
        corporateId: corporate.id,
        name,
        email,
        phone: phone || null,
        department: department || null,
        designation: designation || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ recipient });
  } catch (error) {
    console.error('Error creating recipient:', error);
    return NextResponse.json({ error: 'Failed to create recipient' }, { status: 500 });
  }
}

// DELETE /api/corporate/recipients — Remove recipient
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporate = await getCorporateForUser(user.id);
    if (!corporate) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    // Verify recipient belongs to this corporate account
    const recipient = await db.corporateRecipient.findUnique({
      where: { id },
    });

    if (!recipient || recipient.corporateId !== corporate.id) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    await db.corporateRecipient.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json({ error: 'Failed to delete recipient' }, { status: 500 });
  }
}
