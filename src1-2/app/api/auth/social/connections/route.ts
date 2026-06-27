import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticate } from '@/lib/auth-helper';
import { getSessionAsync, destroySession } from '@/lib/sessions';

// GET /api/auth/social/connections
// Returns the user's active social provider from the database.
// This is the single source of truth for which provider the user used to log in.
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (error) return error;

    const dbUser = await db.user.findUnique({
      where: { id: user!.id },
      select: {
        id: true,
        socialProvider: true,
        socialId: true,
        name: true,
        email: true,
        avatar: true,
        gender: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      activeProvider: dbUser.socialProvider || null,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar: dbUser.avatar,
        gender: dbUser.gender,
      },
    });
  } catch (err) {
    console.error('Error fetching social connections:', err);
    return NextResponse.json(
      { error: 'Failed to fetch social connections' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/social/connections?provider=google
// Disconnects a social provider.
// If the provider is the user's active login provider, it:
//   1. Clears socialProvider and socialId from the User model
//   2. Deletes the user's session (logs them out)
//   3. Returns { loggedOut: true } so the frontend can redirect to login
// If the provider is NOT the active login provider, it just returns success.
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    const validProviders = ['google', 'facebook', 'linkedin', 'instagram'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user!.id },
      select: { id: true, socialProvider: true, socialId: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isActiveProvider = dbUser.socialProvider?.toLowerCase() === provider.toLowerCase();

    if (isActiveProvider) {
      // This is the active login provider — must log the user out
      await db.user.update({
        where: { id: user!.id },
        data: {
          socialProvider: null,
          socialId: null,
        },
      });

      // Delete the user's session to force logout
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        try {
          await destroySession(token);
        } catch {
          // Session deletion might fail — not critical since the token is invalidated
        }
      }

      return NextResponse.json({
        success: true,
        loggedOut: true,
        message: 'Active login provider disconnected. User has been logged out.',
      });
    } else {
      // Not the active provider — just return success
      // The frontend will handle removing the localStorage entry
      return NextResponse.json({
        success: true,
        loggedOut: false,
        message: 'Provider disconnected.',
      });
    }
  } catch (err) {
    console.error('Error disconnecting social provider:', err);
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    );
  }
}
