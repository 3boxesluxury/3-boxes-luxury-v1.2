import { NextRequest, NextResponse } from 'next/server';
import { testAdminConnection } from '@/lib/shopify/admin-client';
import { isShopifyConfigured, testStorefrontConnection } from '@/lib/shopify/client';
import fs from 'fs';
import path from 'path';

/**
 * POST /api/shopify/admin-token
 * Save the Admin API token and/or Storefront API token to the .env file
 * and set them in process.env for immediate use
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, storefrontToken } = body;

    // Validate at least one token is provided
    if (!token && !storefrontToken) {
      return NextResponse.json(
        { error: 'At least one token (admin or storefront) is required' },
        { status: 400 }
      );
    }

    // Validate admin token format
    if (token && !token.startsWith('shpat_')) {
      return NextResponse.json(
        { error: 'Admin API token must start with "shpat_"' },
        { status: 400 }
      );
    }

    // Write to .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = envContent.split('\n');

    // Process Admin API token
    if (token) {
      let adminFound = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SHOPIFY_ADMIN_TOKEN=')) {
          lines[i] = `SHOPIFY_ADMIN_TOKEN=${token}`;
          adminFound = true;
          break;
        }
      }
      if (!adminFound) {
        lines.push(`SHOPIFY_ADMIN_TOKEN=${token}`);
      }
      // Set in process.env for immediate use (without restart)
      process.env.SHOPIFY_ADMIN_TOKEN = token;
    }

    // Process Storefront API token
    if (storefrontToken) {
      let storefrontFound = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SHOPIFY_STOREFRONT_TOKEN=')) {
          lines[i] = `SHOPIFY_STOREFRONT_TOKEN=${storefrontToken}`;
          storefrontFound = true;
          break;
        }
      }
      if (!storefrontFound) {
        lines.push(`SHOPIFY_STOREFRONT_TOKEN=${storefrontToken}`);
      }
      // Set in process.env for immediate use (without restart)
      process.env.SHOPIFY_STOREFRONT_TOKEN = storefrontToken;
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Token(s) saved successfully',
      adminTokenSaved: !!token,
      storefrontTokenSaved: !!storefrontToken,
    });
  } catch (error: unknown) {
    console.error('Error saving token:', error);
    const message = error instanceof Error ? error.message : 'Failed to save token';
    return NextResponse.json(
      { error: 'Failed to save token', details: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shopify/admin-token
 * Check connection status for both Admin API and Storefront API
 */
export async function GET() {
  try {
    // Check Admin API status
    const adminConfigured = !!(process.env.SHOPIFY_ADMIN_TOKEN && process.env.SHOPIFY_ADMIN_TOKEN.length > 0);

    let adminResult: { configured: boolean; connected: boolean; shop?: string; error?: string };
    if (!adminConfigured) {
      adminResult = {
        configured: false,
        connected: false,
      };
    } else {
      const result = await testAdminConnection();
      if (result.success) {
        adminResult = {
          configured: true,
          connected: true,
          shop: result.shop?.name || '3boxesluxury-2.myshopify.com',
        };
      } else {
        adminResult = {
          configured: true,
          connected: false,
          error: result.error,
        };
      }
    }

    // Check Storefront API status
    const storefrontConfigured = isShopifyConfigured();

    let storefrontResult: { configured: boolean; connected: boolean; shopName?: string; error?: string };
    if (!storefrontConfigured) {
      storefrontResult = {
        configured: false,
        connected: false,
      };
    } else {
      const result = await testStorefrontConnection();
      storefrontResult = {
        configured: true,
        connected: result.connected,
        shopName: result.shopName,
        error: result.error,
      };
    }

    return NextResponse.json({
      adminApi: adminResult,
      storefrontApi: storefrontResult,
    });
  } catch (error: unknown) {
    console.error('Error checking tokens:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      adminApi: {
        configured: !!(process.env.SHOPIFY_ADMIN_TOKEN && process.env.SHOPIFY_ADMIN_TOKEN.length > 0),
        connected: false,
        error: message,
      },
      storefrontApi: {
        configured: isShopifyConfigured(),
        connected: false,
        error: message,
      },
    });
  }
}
