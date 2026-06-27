import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Facebook Connect API - For Social Style Integration
// ============================================================
// This endpoint exchanges a Facebook access token (from client-side
// FB.login popup) for user profile data that can be used for
// AI-powered style analysis.
// ============================================================

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1638724140532761';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'f6faeeafe9b64e31719894476129b4ee';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Step 1: Verify the access token belongs to our app
    const verifyUrl = `https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;

    let verifyData: any;
    try {
      const verifyRes = await fetch(verifyUrl);
      verifyData = await verifyRes.json();
    } catch {
      return NextResponse.json({ error: 'Failed to verify access token' }, { status: 500 });
    }

    if (verifyData.data?.app_id !== FACEBOOK_APP_ID) {
      return NextResponse.json({ error: 'Invalid access token - app mismatch' }, { status: 401 });
    }

    if (!verifyData.data?.is_valid) {
      return NextResponse.json({ error: 'Access token is expired or invalid' }, { status: 401 });
    }

    const scopes = verifyData.data.scopes || [];

    // Step 2: Get user profile data
    const fields = ['id', 'name', 'email', 'picture.width(200).height(200)'];
    if (scopes.includes('user_likes')) fields.push('likes.limit(50){name,category}');
    if (scopes.includes('user_interests')) fields.push('interests.limit(50){name}');

    const profileUrl = `https://graph.facebook.com/v19.0/me?fields=${fields.join(',')}&access_token=${accessToken}`;

    let profileData: any;
    try {
      const profileRes = await fetch(profileUrl);
      profileData = await profileRes.json();
    } catch {
      return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
    }

    if (profileData.error) {
      return NextResponse.json({ error: profileData.error.message }, { status: 500 });
    }

    // Step 3: Try to get liked pages for style analysis
    let likedPages: any[] = [];
    try {
      const likesUrl = `https://graph.facebook.com/v19.0/me/likes?fields=name,category,about&limit=50&access_token=${accessToken}`;
      const likesRes = await fetch(likesUrl);
      const likesData = await likesRes.json();
      if (likesData.data) {
        likedPages = likesData.data;
      }
    } catch {
      // Likes not available, that's OK
    }

    // Step 4: Compile the social data for style analysis
    const socialData = {
      network: 'facebook',
      connected: true,
      profile: {
        id: profileData.id,
        name: profileData.name,
        email: profileData.email || null,
        avatar: profileData.picture?.data?.url || null,
      },
      likes: likedPages.map((page: any) => ({
        name: page.name,
        category: page.category || 'Unknown',
        about: page.about || '',
      })),
      permissions: scopes,
      connectedAt: new Date().toISOString(),
    };

    console.log('[FB Connect] User connected:', profileData.name, `(${likedPages.length} liked pages)`);

    return NextResponse.json({
      success: true,
      data: socialData,
    });

  } catch (error) {
    console.error('[FB Connect] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
