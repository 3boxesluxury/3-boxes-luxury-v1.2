import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/shopify/webhooks/register
 * Register webhook subscriptions with Shopify using the Admin REST API
 *
 * Registers the following topics:
 * - orders/create
 * - orders/updated
 * - orders/cancelled
 * - products/create
 * - products/update
 * - products/delete
 *
 * Uses: POST /admin/api/2025-01/webhooks.json
 */

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || '';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'products/create',
  'products/update',
  'products/delete',
] as const;

interface WebhookRegistrationResult {
  topic: string;
  success: boolean;
  webhookId?: number;
  error?: string;
  alreadyExists?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Validate required env vars
    if (!SHOPIFY_DOMAIN) {
      return NextResponse.json(
        { error: 'SHOPIFY_STORE_DOMAIN is not configured' },
        { status: 500 }
      );
    }

    if (!ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'SHOPIFY_ADMIN_TOKEN is not configured. Save the Admin API token first.' },
        { status: 403 }
      );
    }

    // Determine the callback URL
    let callbackUrl: string;
    try {
      const body = await request.json();
      callbackUrl = body.callbackUrl || '';
    } catch {
      callbackUrl = '';
    }

    // If no callbackUrl provided, construct from APP_URL env var or request headers
    if (!callbackUrl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (appUrl) {
        callbackUrl = `${appUrl.replace(/\/$/, '')}/api/shopify/webhooks`;
      } else {
        // Fallback: use the request origin
        const origin = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        if (origin) {
          callbackUrl = `${protocol}://${origin}/api/shopify/webhooks`;
        } else {
          return NextResponse.json(
            { error: 'Cannot determine callback URL. Set APP_URL env var or provide callbackUrl in request body.' },
            { status: 400 }
          );
        }
      }
    }

    const adminApiBase = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

    // First, fetch existing webhooks to avoid duplicates
    let existingWebhooks: Array<{ id: number; topic: string; address: string }> = [];
    try {
      const listResponse = await fetch(`${adminApiBase}/webhooks.json`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_TOKEN,
        },
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        existingWebhooks = listData.webhooks || [];
      }
    } catch (error) {
      console.error('Failed to fetch existing webhooks:', error);
    }

    const results: WebhookRegistrationResult[] = [];

    for (const topic of WEBHOOK_TOPICS) {
      // Check if webhook already exists for this topic
      const existing = existingWebhooks.find(
        (wh) => wh.topic === topic && wh.address === callbackUrl
      );

      if (existing) {
        results.push({
          topic,
          success: true,
          webhookId: existing.id,
          alreadyExists: true,
        });
        console.log(`Webhook already exists for ${topic} (id: ${existing.id})`);
        continue;
      }

      // Register new webhook
      try {
        const response = await fetch(`${adminApiBase}/webhooks.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_TOKEN,
          },
          body: JSON.stringify({
            webhook: {
              topic,
              address: callbackUrl,
              format: 'json',
            },
          }),
        });

        const responseData = await response.json();

        if (response.ok && responseData.webhook) {
          results.push({
            topic,
            success: true,
            webhookId: responseData.webhook.id,
          });
          console.log(`Registered webhook for ${topic} (id: ${responseData.webhook.id})`);
        } else {
          const errorMsg = responseData.errors
            ? typeof responseData.errors === 'string'
              ? responseData.errors
              : JSON.stringify(responseData.errors)
            : `HTTP ${response.status}: ${response.statusText}`;

          results.push({
            topic,
            success: false,
            error: errorMsg,
          });
          console.error(`Failed to register webhook for ${topic}: ${errorMsg}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          topic,
          success: false,
          error: errorMsg,
        });
        console.error(`Error registering webhook for ${topic}:`, error);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const alreadyExistedCount = results.filter((r) => r.alreadyExists).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Webhook registration complete: ${successCount} registered, ${alreadyExistedCount} already existed, ${failedCount} failed`,
      callbackUrl,
      results,
      summary: {
        total: WEBHOOK_TOPICS.length,
        registered: successCount - alreadyExistedCount,
        alreadyExisted: alreadyExistedCount,
        failed: failedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook registration error:', error);
    return NextResponse.json(
      { error: 'Webhook registration failed', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify/webhooks/register
 * Check the status of webhook registrations with Shopify
 */
export async function GET() {
  try {
    if (!SHOPIFY_DOMAIN) {
      return NextResponse.json({
        configured: false,
        error: 'SHOPIFY_STORE_DOMAIN is not set',
      });
    }

    if (!ADMIN_TOKEN) {
      return NextResponse.json({
        configured: false,
        error: 'SHOPIFY_ADMIN_TOKEN is not set',
      });
    }

    const adminApiBase = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}`;

    // Fetch existing webhooks
    const response = await fetch(`${adminApiBase}/webhooks.json`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json({
        configured: true,
        error: `Shopify API returned ${response.status}: ${body.slice(0, 200)}`,
      });
    }

    const data = await response.json();
    const webhooks: Array<{ id: number; topic: string; address: string; created_at: string; updated_at: string }> = data.webhooks || [];

    // Check which required topics are registered
    const registeredTopics = new Set(webhooks.map((wh) => wh.topic));
    const missingTopics = WEBHOOK_TOPICS.filter((topic) => !registeredTopics.has(topic));
    const extraTopics = Array.from(registeredTopics).filter(
      (topic) => !WEBHOOK_TOPICS.includes(topic as typeof WEBHOOK_TOPICS[number])
    );

    return NextResponse.json({
      configured: true,
      webhooks: webhooks.map((wh) => ({
        id: wh.id,
        topic: wh.topic,
        address: wh.address,
        createdAt: wh.created_at,
        updatedAt: wh.updated_at,
      })),
      summary: {
        totalRegistered: webhooks.length,
        requiredTopics: WEBHOOK_TOPICS,
        missingTopics: missingTopics.length > 0 ? missingTopics : undefined,
        extraTopics: extraTopics.length > 0 ? extraTopics : undefined,
        allRegistered: missingTopics.length === 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check webhook status', details: message },
      { status: 500 }
    );
  }
}
