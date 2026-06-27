/**
 * API Logger - logs API requests for monitoring and admin dashboard
 * Stores last 1000 entries in memory
 */

export interface ApiLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number; // ms
  ip: string;
  userAgent: string;
  userId?: string;
  error?: string;
}

const MAX_LOG_ENTRIES = 1000;
const apiLogs: ApiLogEntry[] = [];

/**
 * Add a log entry
 */
export function addApiLog(entry: ApiLogEntry): void {
  apiLogs.push(entry);
  // Keep only the last MAX_LOG_ENTRIES
  while (apiLogs.length > MAX_LOG_ENTRIES) {
    apiLogs.shift();
  }
}

/**
 * Get recent API logs
 * @param limit - max entries to return (default 100)
 * @param offset - skip entries (default 0)
 */
export function getApiLogs(limit: number = 100, offset: number = 0): ApiLogEntry[] {
  return apiLogs.slice(-(limit + offset)).slice(0, limit).reverse();
}

/**
 * Get total count of stored logs
 */
export function getApiLogCount(): number {
  return apiLogs.length;
}

/**
 * Get API log stats summary
 */
export function getApiLogStats(): {
  total: number;
  last5min: number;
  avgResponseTime: number;
  errorRate: number;
} {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  const recentLogs = apiLogs.filter(
    (log) => new Date(log.timestamp).getTime() > fiveMinAgo
  );

  const avgResponseTime =
    recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.responseTime, 0) /
        recentLogs.length
      : 0;

  const errorCount = recentLogs.filter((log) => log.statusCode >= 400).length;
  const errorRate =
    recentLogs.length > 0 ? (errorCount / recentLogs.length) * 100 : 0;

  return {
    total: apiLogs.length,
    last5min: recentLogs.length,
    avgResponseTime: Math.round(avgResponseTime),
    errorRate: Math.round(errorRate * 100) / 100,
  };
}

/**
 * Create a timing wrapper for API route handlers
 * Usage:
 *   export const POST = withApiLogging(async (request) => { ... })
 */
export function withApiLogging(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const response = await handler(request);
      statusCode = response.status;
      return response;
    } catch (error) {
      statusCode = 500;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      const url = new URL(request.url);

      addApiLog({
        timestamp: new Date().toISOString(),
        method: request.method,
        path: url.pathname,
        statusCode,
        responseTime,
        ip:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        userId: undefined, // Will be set by auth middleware
        error: errorMessage,
      });
    }
  };
}

/**
 * Get client IP from request (re-exported for convenience)
 */
export function getClientIpFromRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
