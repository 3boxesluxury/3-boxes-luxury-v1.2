import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { validatePassword } from '@/lib/password-validator';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (await db.corporateAccount.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      companyName,
      industry,
      website,
      contactName,
      contactPhone,
      gstNumber,
      panNumber,
      // Billing address fields
      billingAddress,
      billingCity,
      billingState,
      billingZipCode,
      billingCountry,
    } = body;

    // Validate required fields
    if (!email || !password || !name || !companyName || !contactName) {
      return NextResponse.json(
        { error: 'Email, password, name, companyName, and contactName are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements', passwordErrors: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Generate unique slug from companyName
    const baseSlug = slugify(companyName);
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Company name must contain alphanumeric characters' },
        { status: 400 }
      );
    }
    const slug = await ensureUniqueSlug(baseSlug);

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create User with role "corporate" and CorporateAccount in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password: hashedPassword,
          role: 'corporate',
          corporateRole: 'corporate_admin',
          approvalStatus: 'pending',
          isActive: true,
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          emailVerifyToken,
          emailVerifyExpiry,
        },
      });

      const corporateAccount = await tx.corporateAccount.create({
        data: {
          companyName: companyName.trim(),
          slug,
          industry: industry?.trim() || null,
          website: website?.trim() || null,
          gstNumber: gstNumber?.trim() || null,
          panNumber: panNumber?.trim() || null,
          // Billing address
          billingAddress: billingAddress?.trim() || null,
          billingCity: billingCity?.trim() || null,
          billingState: billingState?.trim() || null,
          billingZipCode: billingZipCode?.trim() || null,
          billingCountry: billingCountry?.trim() || 'India',
          // Contact info
          contactName: contactName.trim(),
          contactEmail: email.toLowerCase().trim(),
          contactPhone: contactPhone?.trim() || null,
          userId: user.id,
          approvalStatus: 'pending',
          isActive: true,
        },
      });

      // Create the corporate account creator as a CorporateMember with role "corporate_admin"
      await tx.corporateMember.create({
        data: {
          corporateId: corporateAccount.id,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: 'corporate_admin',
          status: 'active',
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
      });

      return { user, corporateAccount };
    });

    const { user, corporateAccount } = result;

    // Since corporate accounts need approval, return pending message
    return NextResponse.json(
      {
        message: 'Registration successful. Your corporate account is pending admin approval. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          corporateRole: user.corporateRole,
          approvalStatus: user.approvalStatus,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        corporateAccount: {
          id: corporateAccount.id,
          companyName: corporateAccount.companyName,
          slug: corporateAccount.slug,
          approvalStatus: corporateAccount.approvalStatus,
          billingAddress: corporateAccount.billingAddress,
          billingCity: corporateAccount.billingCity,
          billingState: corporateAccount.billingState,
          billingZipCode: corporateAccount.billingZipCode,
          billingCountry: corporateAccount.billingCountry,
        },
        approvalStatus: 'pending',
        // Return the verification token for MVP testing
        emailVerifyToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Corporate registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
