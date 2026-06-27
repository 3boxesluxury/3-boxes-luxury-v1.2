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

// POST /api/corporate/recipients/import-csv — Import recipients from CSV
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
    const { csvData } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        { error: 'CSV data is required' },
        { status: 400 }
      );
    }

    // Parse CSV
    const lines = csvData.trim().split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());

    // Map header names to fields
    const fieldMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      department: 'department',
      designation: 'designation',
      address: 'address',
      city: 'city',
      state: 'state',
      zipcode: 'zipCode',
      zip: 'zipCode',
      pincode: 'zipCode',
      notes: 'notes',
    };

    const mappedHeaders = headers.map((h: string) => fieldMap[h] || h);

    const nameIdx = mappedHeaders.indexOf('name');
    const emailIdx = mappedHeaders.indexOf('email');

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json(
        { error: 'CSV must have "name" and "email" columns' },
        { status: 400 }
      );
    }

    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));

      const name = values[nameIdx];
      const email = values[emailIdx];

      if (!name || !email) {
        errors.push({ row: i + 1, error: 'Missing name or email' });
        continue;
      }

      try {
        const data: Record<string, string | null> = {
          corporateId: corporate.id,
          name,
          email,
        };

        // Map other fields
        for (let j = 0; j < mappedHeaders.length; j++) {
          if (j !== nameIdx && j !== emailIdx && mappedHeaders[j] !== 'name' && mappedHeaders[j] !== 'email') {
            data[mappedHeaders[j]] = values[j] || null;
          }
        }

        await db.corporateRecipient.create({ data: data as never });
        imported++;
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err instanceof Error ? err.message : 'Failed to create',
        });
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
