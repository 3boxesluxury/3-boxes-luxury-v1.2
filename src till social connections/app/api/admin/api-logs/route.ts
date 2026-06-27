import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-helper';
import { getApiLogs, getApiLogStats } from '@/lib/api-logger';

export async function GET(request: NextRequest) {
  try {
    // Require audit.view permission
    const { error } = await requirePermission(request, 'audit.view');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [logs, stats] = await Promise.all([
      getApiLogs(limit, offset),
      getApiLogStats(),
    ]);

    return NextResponse.json({
      logs,
      stats,
      total: stats.total,
    });
  } catch (error) {
    console.error('API logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch API logs' }, { status: 500 });
  }
}
