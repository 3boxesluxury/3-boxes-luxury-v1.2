import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Google Connect Route - For Social Style Integration
// ============================================================
// Takes a Google access token and fetches profile + YouTube
// data for the Social Style Integration feature.
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Fetch user profile from Google
    let profile: any = {};
    try {
      const profileRes = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      profile = await profileRes.json();

      if (profile.error) {
        console.error('[Google Connect] Profile error:', profile.error);
        return NextResponse.json(
          { error: 'Failed to fetch Google profile', details: profile.error.message },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('[Google Connect] Profile fetch error:', err);
      return NextResponse.json(
        { error: 'Failed to fetch Google profile' },
        { status: 500 }
      );
    }

    // Try to fetch YouTube channel data (if YouTube Data API is enabled)
    let youtubeData: any = null;
    try {
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&access_token=${accessToken}`
      );
      const ytData = await ytRes.json();

      if (!ytData.error && ytData.items?.length > 0) {
        const channel = ytData.items[0];
        youtubeData = {
          channelTitle: channel.snippet?.title,
          channelDescription: channel.snippet?.description,
          subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
          videoCount: parseInt(channel.statistics?.videoCount || '0'),
        };
      }
    } catch {
      // YouTube API might not be enabled
      console.warn('[Google Connect] YouTube data fetch failed (API not enabled or no channel)');
    }

    // Try to fetch Google People API for interests/contact groups
    let interests: string[] = [];
    try {
      const peopleRes = await fetch(
        `https://people.googleapis.com/v1/people/me?personFields=interests,locales&access_token=${accessToken}`
      );
      const peopleData = await peopleRes.json();

      if (!peopleData.error && peopleData.interests) {
        interests = peopleData.interests
          .map((i: any) => i.value)
          .filter(Boolean);
      }
    } catch {
      console.warn('[Google Connect] People API fetch failed');
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture,
          locale: profile.locale,
        },
        youtube: youtubeData,
        interests: interests,
        stats: {
          hasYouTube: !!youtubeData,
          interestCount: interests.length,
        },
      },
    });

  } catch (error) {
    console.error('[Google Connect] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
