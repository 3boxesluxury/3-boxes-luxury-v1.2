import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { authenticate, getClientIp, getUserAgent } from '@/lib/auth-helper';

/**
 * GET /api/corporate/members
 * List all members of the corporate account (requires corporate admin role)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (authResult.error) return authResult.error;

    const user = authResult.user;

    if (user.role !== 'corporate') {
      return NextResponse.json(
        { error: 'Forbidden: Corporate access required' },
        { status: 403 }
      );
    }

    if (user.corporateRole !== 'corporate_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Corporate admin role required' },
        { status: 403 }
      );
    }

    // Find the corporate account for this user
    const corporateAccount = await db.corporateAccount.findUnique({
      where: { userId: user.id },
    });

    if (!corporateAccount) {
      return NextResponse.json(
        { error: 'Corporate account not found' },
        { status: 404 }
      );
    }

    // List all members
    const members = await db.corporateMember.findMany({
      where: { corporateId: corporateAccount.id },
      orderBy: { createdAt: 'desc' },
      include: {
        corporate: {
          select: { id: true, companyName: true, slug: true },
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching corporate members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/corporate/members
 * Invite a new member to the corporate account.
 * Accept: email, name, role (corporate_admin, finance_user, campaign_manager)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticate(request);
    if (authResult.error) return authResult.error;

    const user = authResult.user;

    if (user.role !== 'corporate') {
      return NextResponse.json(
        { error: 'Forbidden: Corporate access required' },
        { status: 403 }
      );
    }

    if (user.corporateRole !== 'corporate_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Corporate admin role required to invite members' },
        { status: 403 }
      );
    }

    // Find the corporate account for this user
    const corporateAccount = await db.corporateAccount.findUnique({
      where: { userId: user.id },
    });

    if (!corporateAccount) {
      return NextResponse.json(
        { error: 'Corporate account not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, name, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['corporate_admin', 'finance_user', 'campaign_manager'];
    const memberRole = role || 'campaign_manager';
    if (!validRoles.includes(memberRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const memberEmail = email.toLowerCase().trim();

    // Check if member already exists for this corporate account
    const existingMember = await db.corporateMember.findUnique({
      where: {
        corporateId_email: {
          corporateId: corporateAccount.id,
          email: memberEmail,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'A member with this email already exists in this corporate account' },
        { status: 409 }
      );
    }

    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    // Create a User account if one doesn't exist, and the CorporateMember record
    const result = await db.$transaction(async (tx) => {
      // Check if user already exists
      let existingUser = await tx.user.findUnique({
        where: { email: memberEmail },
      });

      let linkedUserId: string | null = null;

      if (existingUser) {
        // User exists, link them
        linkedUserId = existingUser.id;
        // Update their corporate role
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            corporateRole: memberRole,
            role: existingUser.role === 'corporate' ? 'corporate' : 'corporate',
          },
        });
      } else {
        // Create a new User with a temp password
        const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
        const salt = await bcrypt.genSalt(12);
        const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

        const newUser = await tx.user.create({
          data: {
            email: memberEmail,
            name: name?.trim() || memberEmail.split('@')[0],
            password: hashedTempPassword,
            role: 'corporate',
            corporateRole: memberRole,
            approvalStatus: 'pending',
            isActive: true,
            emailVerified: false,
          },
        });

        linkedUserId = newUser.id;
      }

      // Create CorporateMember record with status "pending"
      const member = await tx.corporateMember.create({
        data: {
          corporateId: corporateAccount.id,
          userId: linkedUserId,
          email: memberEmail,
          name: name?.trim() || null,
          role: memberRole,
          status: 'pending',
          invitedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'corporate_member_invited',
          entity: 'corporate_member',
          entityId: member.id,
          details: JSON.stringify({
            corporateId: corporateAccount.id,
            corporateName: corporateAccount.companyName,
            memberEmail,
            memberRole,
            invitedBy: user.email,
          }),
          ipAddress,
          userAgent,
        },
      });

      return { member, isNewUser: !existingUser };
    });

    return NextResponse.json(
      {
        message: 'Member invited successfully',
        member: {
          id: result.member.id,
          email: result.member.email,
          name: result.member.name,
          role: result.member.role,
          status: result.member.status,
          invitedAt: result.member.invitedAt,
          corporateId: result.member.corporateId,
        },
        isNewUser: result.isNewUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error inviting corporate member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
