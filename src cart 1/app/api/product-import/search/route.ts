import { NextRequest, NextResponse } from 'next/server';
import { getSessionAsync } from '@/lib/sessions';

async function verifyAdmin(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const user = await getSessionAsync(auth?.replace('Bearer ', '') ?? '');
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  if (user.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null };
  return { error: null, user };
}

// POST /api/product-import/search - Search Myntra/Nykaa/Amazon products using z-ai-web-dev-sdk web_search
export async function POST(request: NextRequest) {
  const { error } = await verifyAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { query, platform } = body;

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Build platform-specific search query
    let searchQuery = query;
    if (platform) {
      const platformMap: Record<string, string> = {
        myntra: 'site:myntra.com',
        nykaa: 'site:nykaa.com',
        amazon: 'site:amazon.in',
      };
      if (platformMap[platform]) {
        searchQuery = `${platformMap[platform]} ${query}`;
      }
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 15,
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Error searching products:', err);
    return NextResponse.json({ error: 'Failed to search products' }, { status: 500 });
  }
}
