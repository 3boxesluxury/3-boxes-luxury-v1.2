import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/sessions';
import jwt from 'jsonwebtoken';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : '3boxes-dev-secret-key');

// v20: Upgraded from v19.0 to v21.0 — Facebook sometimes returns more fields in newer API versions
const FB_GRAPH_VERSION = 'v21.0';

/**
 * GET /api/auth/facebook/callback
 * Facebook OAuth callback - exchanges code for token, fetches user profile, creates/signs in user
 * Supports "connect" action: when oauth_action=connect, links provider without changing main auth
 *
 * v17: Fetches photos, likes, birthday, age_range for AI-powered fashion/style analysis.
 * v20: Upgraded Graph API to v21.0, added fallback gender API call, enhanced diagnostic logging.
 *      Gender returns null if Facebook privacy setting is not 'Public' — we now make a second
 *      dedicated API call for just the gender field if the first call doesn't return it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');

  // Read the oauth_action cookie to determine if this is a "login" or "connect" flow
  const oauthAction = request.cookies.get('oauth_action')?.value || 'login';
  const isConnectAction = oauthAction === 'connect';

  // User denied access
  if (error) {
    const errorMsg = errorReason === 'user_denied'
      ? 'You denied Facebook access. Please try again.'
      : `Facebook login failed: ${error}`;
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', errorMsg);
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  if (!code || !state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Facebook login failed: missing authorization code');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  // Verify state for CSRF protection
  const savedState = request.cookies.get('oauth_state_facebook')?.value;
  if (!savedState || savedState !== state) {
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'Invalid OAuth state. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&redirect_uri=${encodeURIComponent(`${BASE_URL}/api/auth/facebook/callback`)}&code=${code}`,
      { method: 'GET' }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[Facebook OAuth] Token exchange error:', tokenData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to authenticate with Facebook. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const accessToken = tokenData.access_token;

    // v20: Log the scopes granted by the access token
    if (tokenData.scope) {
      console.log('[Facebook OAuth] v20: Scopes granted by Facebook:', tokenData.scope);
    }

    // Step 2: Fetch user profile from Facebook (using v21.0 Graph API)
    const profileResponse = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/me?fields=id,name,email,picture.width(200).height(200),gender,birthday,age_range,locale&access_token=${accessToken}`,
      { method: 'GET' }
    );

    const profileData = await profileResponse.json();

    // v20: Log RAW Facebook response so we can see EXACTLY what fields come back
    console.log('[Facebook OAuth] v20: ========== RAW FACEBOOK RESPONSE ==========');
    console.log('[Facebook OAuth] v20: Raw profileData:', JSON.stringify(profileData, null, 2));
    console.log('[Facebook OAuth] v20: =============================================');

    if (profileData.error) {
      console.error('[Facebook OAuth] Profile fetch error:', profileData.error);
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to fetch Facebook profile. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    const facebookId = profileData.id;
    const facebookName = profileData.name || 'Facebook User';
    const facebookEmail = profileData.email || null;
    const facebookAvatar = profileData.picture?.data?.url || null;
    let facebookGender = profileData.gender || null;
    const facebookBirthday = profileData.birthday || null; // Format: MM/DD/YYYY
    let facebookAgeRange = profileData.age_range || null; // Format: { min: 21, max: ... }
    const facebookLocale = profileData.locale || null;

    // v20: FALLBACK — If gender is null, make a second dedicated API call for JUST the gender field
    // Sometimes Facebook doesn't return all fields in a combined request but will in a targeted one
    if (!facebookGender) {
      console.log('[Facebook OAuth] v20: Gender NOT in main profile response — attempting fallback API call...');
      try {
        const genderResponse = await fetch(
          `https://graph.facebook.com/${FB_GRAPH_VERSION}/me?fields=gender,age_range&access_token=${accessToken}`,
          { method: 'GET' }
        );
        const genderData = await genderResponse.json();
        console.log('[Facebook OAuth] v20: Fallback gender API response:', JSON.stringify(genderData, null, 2));

        if (genderData.gender) {
          facebookGender = genderData.gender;
          console.log('[Facebook OAuth] v20: Gender recovered from fallback call:', facebookGender);
        }
        if (!facebookAgeRange && genderData.age_range) {
          facebookAgeRange = genderData.age_range;
        }
      } catch (fallbackError) {
        console.warn('[Facebook OAuth] v20: Fallback gender API call failed:', fallbackError);
      }
    }

    // v20: If STILL no gender, try the /me endpoint with debug info using the token metadata
    if (!facebookGender) {
      console.log('[Facebook OAuth] v20: Gender STILL null — attempting token debug approach...');
      try {
        const debugResponse = await fetch(
          `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
          { method: 'GET' }
        );
        const debugData = await debugResponse.json();
        console.log('[Facebook OAuth] v20: Token debug response:', JSON.stringify(debugData, null, 2));
        // The debug endpoint shows scopes but not gender — but it confirms if our scopes are correct
        if (debugData.data?.scopes) {
          console.log('[Facebook OAuth] v20: Token scopes:', debugData.data.scopes.join(', '));
        }
      } catch (debugError) {
        console.warn('[Facebook OAuth] v20: Token debug call failed:', debugError);
      }
    }

    // v20: Enhanced logging with clear diagnostic markers
    console.log('[Facebook OAuth] v20: ========== PROFILE FIELDS ==========');
    console.log('[Facebook OAuth] v20: ID:', facebookId);
    console.log('[Facebook OAuth] v20: Name:', facebookName);
    console.log('[Facebook OAuth] v20: Email:', facebookEmail || 'NOT PROVIDED');
    console.log('[Facebook OAuth] v20: Gender:', facebookGender || 'NULL — Facebook privacy setting may block this');
    console.log('[Facebook OAuth] v20: Birthday:', facebookBirthday || 'NOT PROVIDED');
    console.log('[Facebook OAuth] v20: Age range:', facebookAgeRange ? JSON.stringify(facebookAgeRange) : 'NOT PROVIDED');
    console.log('[Facebook OAuth] v20: Locale:', facebookLocale || 'NOT PROVIDED');
    console.log('[Facebook OAuth] v20: ======================================');

    // v17: Fetch user's photos for AI style analysis (up to 10 recent uploaded photos)
    let facebookPhotos: string[] = [];
    try {
      const photosResponse = await fetch(
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/photos?type=uploaded&fields=id,images&limit=10&access_token=${accessToken}`,
        { method: 'GET' }
      );
      const photosData = await photosResponse.json();
      if (photosData.data && photosData.data.length > 0) {
        facebookPhotos = photosData.data.map((photo: any) => {
          return photo.images?.[0]?.source || photo.images?.[0]?.url || null;
        }).filter(Boolean);
        console.log('[Facebook OAuth] v20: Fetched', facebookPhotos.length, 'photos for AI analysis');
      }
    } catch (photoError) {
      console.warn('[Facebook OAuth] v20: Could not fetch photos:', photoError);
    }

    // v17: Fetch user's liked pages for style/brand preferences
    let facebookLikes: Array<{ name: string; category: string }> = [];
    try {
      const likesResponse = await fetch(
        `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/likes?fields=name,category&limit=50&access_token=${accessToken}`,
        { method: 'GET' }
      );
      const likesData = await likesResponse.json();
      if (likesData.data && likesData.data.length > 0) {
        facebookLikes = likesData.data.map((like: any) => ({
          name: like.name || '',
          category: like.category || '',
        }));
        console.log('[Facebook OAuth] v20: Fetched', facebookLikes.length, 'liked pages for AI analysis');
      }
    } catch (likesError) {
      console.warn('[Facebook OAuth] v20: Could not fetch likes:', likesError);
    }

    // v17: Compute age group from birthday or age_range
    let ageGroup: string | null = null;
    if (facebookBirthday) {
      const birthDate = new Date(facebookBirthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 18 && age <= 24) ageGroup = '18-24';
      else if (age >= 25 && age <= 34) ageGroup = '25-34';
      else if (age >= 35 && age <= 44) ageGroup = '35-44';
      else if (age >= 45 && age <= 54) ageGroup = '45-54';
      else if (age >= 55) ageGroup = '55+';
      else ageGroup = 'under-18';
    } else if (facebookAgeRange) {
      ageGroup = `${facebookAgeRange.min || 18}+`;
    }
    console.log('[Facebook OAuth] v20: Age group:', ageGroup || 'unknown');

    if (!facebookId) {
      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('auth_error', 'Failed to get Facebook user ID. Please try again.');
      const resp = NextResponse.redirect(redirectUrl.toString());
      resp.cookies.delete('oauth_state_facebook');
      resp.cookies.delete('oauth_return_to');
      resp.cookies.delete('oauth_action');
      return resp;
    }

    // v17: Serialize extended data for passing to social-style AI analysis
    const facebookExtendedData = JSON.stringify({
      gender: facebookGender,
      birthday: facebookBirthday,
      ageRange: facebookAgeRange,
      ageGroup,
      locale: facebookLocale,
      photosCount: facebookPhotos.length,
      photos: facebookPhotos,
      likes: facebookLikes,
      likesCount: facebookLikes.length,
      // Extract fashion-related likes for quick signal
      fashionLikes: facebookLikes.filter((like: { name: string; category: string }) => {
        const cat = (like.category || '').toLowerCase();
        const name = (like.name || '').toLowerCase();
        return cat.includes('clothing') || cat.includes('fashion') || cat.includes('jewel') ||
               cat.includes('luxury') || cat.includes('beauty') || cat.includes('shoe') ||
               cat.includes('accessori') || cat.includes('apparel') ||
               name.includes('gucci') || name.includes('louis vuitton') || name.includes('prada') ||
               name.includes('chanel') || name.includes('versace') || name.includes('dior') ||
               name.includes('balenciaga') || name.includes('coach') || name.includes('burberry');
      }),
    });

    // ─── CONNECT ACTION: Link provider to current user, do NOT change auth session ───
    if (isConnectAction) {
      console.log('[Facebook OAuth] Connect action — linking Facebook provider without changing main auth');

      const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
      const redirectUrl = new URL(returnTo, BASE_URL);
      redirectUrl.searchParams.set('connect_provider', 'facebook');
      redirectUrl.searchParams.set('connect_name', facebookName);
      if (facebookEmail) redirectUrl.searchParams.set('connect_email', facebookEmail);
      if (facebookAvatar) redirectUrl.searchParams.set('connect_avatar', facebookAvatar);
      redirectUrl.searchParams.set('connect_id', facebookId);
      if (facebookGender) redirectUrl.searchParams.set('connect_gender', facebookGender);
      // FIX: Remove encodeURIComponent() — searchParams.set() already URL-encodes values.
      redirectUrl.searchParams.set('connect_fb_data', facebookExtendedData);

      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete('oauth_state_facebook');
      response.cookies.delete('oauth_return_to');
      response.cookies.delete('oauth_action');
      return response;
    }

    // ─── LOGIN ACTION: Full login flow (original behavior) ───

    // Step 3: Find or create user in our database
    let user = await db.user.findFirst({
      where: {
        socialProvider: 'facebook',
        socialId: facebookId,
      },
    });

    // If not found by social ID, try to find by email (to link accounts)
    if (!user && facebookEmail) {
      user = await db.user.findUnique({
        where: { email: facebookEmail.toLowerCase().trim() },
      });

      if (user) {
        // Link the Facebook account to existing user
        user = await db.user.update({
          where: { id: user.id },
          data: {
            socialProvider: 'facebook',
            socialId: facebookId,
            ...(facebookAvatar && !user.avatar ? { avatar: facebookAvatar } : {}),
            ...(facebookGender && !user.gender ? { gender: facebookGender } : {}),
          },
        });
      }
    }

    // If user exists, check status
    if (user) {
      if (!user.isActive) {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been deactivated. Please contact support.')}`);
      }

      if (user.approvalStatus === 'pending') {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account is pending approval.')}`);
      }

      if (user.approvalStatus === 'rejected') {
        return NextResponse.redirect(`${BASE_URL}/?auth_error=${encodeURIComponent('Your account has been rejected. Please contact support.')}`);
      }

      // Update last login + persist gender if not already saved
      await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(facebookAvatar && !user.avatar ? { avatar: facebookAvatar } : {}),
          ...(facebookGender && !user.gender ? { gender: facebookGender } : {}),
        },
      }).catch(() => {});
    } else {
      // Create new user from Facebook profile
      if (!facebookEmail) {
        const tempEmail = `fb_${facebookId}@3boxes-social.placeholder`;

        user = await db.user.create({
          data: {
            email: tempEmail,
            name: facebookName,
            password: null,
            role: 'user',
            avatar: facebookAvatar,
            socialProvider: 'facebook',
            socialId: facebookId,
            approvalStatus: 'approved',
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
            ...(facebookGender ? { gender: facebookGender } : {}),
          },
        });
      } else {
        user = await db.user.create({
          data: {
            email: facebookEmail.toLowerCase().trim(),
            name: facebookName,
            password: null,
            role: 'user',
            avatar: facebookAvatar,
            socialProvider: 'facebook',
            socialId: facebookId,
            approvalStatus: 'approved',
            isActive: true,
            emailVerified: true,
            phoneVerified: false,
            twoFactorEnabled: false,
            ...(facebookGender ? { gender: facebookGender } : {}),
          },
        });
      }

      // Create default permissions for new user
      const defaultPermissions = ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'];
      for (const perm of defaultPermissions) {
        await db.userPermission.create({
          data: { userId: user.id, permission: perm },
        }).catch(() => {});
      }
    }

    // Step 4: Generate JWT token
    const jwtToken = jwt.sign(
      {
        type: 'session',
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create session
    try {
      await createSession(jwtToken, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        gender: user.gender,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      });
    } catch (sessionError) {
      console.warn('[Facebook OAuth] DB session creation failed, JWT-only auth will be used:', sessionError);
    }

    // Step 6: Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'login',
          entity: 'user',
          entityId: user.id,
          details: JSON.stringify({ method: 'facebook', socialId: facebookId }),
        },
      });
    } catch {}

    // Step 7: Redirect to frontend with token
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_token', jwtToken);
    redirectUrl.searchParams.set('auth_provider', 'facebook');
    redirectUrl.searchParams.set('auth_name', user.name);
    redirectUrl.searchParams.set('auth_email', user.email);
    redirectUrl.searchParams.set('auth_role', user.role);
    redirectUrl.searchParams.set('auth_id', user.id);
    if (user.avatar || facebookAvatar) redirectUrl.searchParams.set('auth_avatar', user.avatar || facebookAvatar || '');
    if (facebookGender) redirectUrl.searchParams.set('auth_gender', facebookGender);
    // FIX: Remove encodeURIComponent() — searchParams.set() already URL-encodes values.
    redirectUrl.searchParams.set('auth_fb_data', facebookExtendedData);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('oauth_state_facebook');
    response.cookies.delete('oauth_return_to');
    response.cookies.delete('oauth_action');

    // Also set auth token as a cookie for extra reliability
    response.cookies.set('auth_token', jwtToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Facebook OAuth] Unexpected error:', err);
    const returnTo = request.cookies.get('oauth_return_to')?.value || '/';
    const redirectUrl = new URL(returnTo, BASE_URL);
    redirectUrl.searchParams.set('auth_error', 'An unexpected error occurred during Facebook login. Please try again.');
    const resp = NextResponse.redirect(redirectUrl.toString());
    resp.cookies.delete('oauth_state_facebook');
    resp.cookies.delete('oauth_return_to');
    resp.cookies.delete('oauth_action');
    return resp;
  }
}
