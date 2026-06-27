import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helper';

// Default permissions by admin sub-role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // All permissions
  product_manager: [
    'products.manage', 'products.view', 'categories.manage', 'categories.view',
    'inventory.manage', 'inventory.view', 'offers.manage', 'offers.view',
  ],
  order_manager: [
    'orders.manage', 'orders.view', 'refunds.manage', 'refunds.view',
    'tracking.manage',
  ],
  inventory_manager: [
    'inventory.manage', 'inventory.view', 'products.view',
    'stock.manage',
  ],
  finance_manager: [
    'accounting.view', 'accounting.manage', 'invoices.manage', 'invoices.view',
    'payments.manage', 'payments.view', 'refunds.manage', 'refunds.view',
  ],
  support_agent: [
    'tickets.manage', 'tickets.view', 'orders.view', 'customers.view',
  ],
  corporate_account_manager: [
    'corporate.manage', 'corporate.view', 'campaigns.manage', 'campaigns.view',
    'corporate.members', 'corporate.branding',
  ],
};

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    return NextResponse.json({ rolePermissions: ROLE_PERMISSIONS });
  } catch (error) {
    console.error('Role permissions error:', error);
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Role and permissions array are required' }, { status: 400 });
    }

    // In a real system, you'd persist this to a database table
    // For now, we just return the updated mapping
    ROLE_PERMISSIONS[role] = permissions;

    return NextResponse.json({
      message: `Permissions updated for role: ${role}`,
      role,
      permissions: ROLE_PERMISSIONS[role],
    });
  } catch (error) {
    console.error('Role permissions update error:', error);
    return NextResponse.json({ error: 'Failed to update role permissions' }, { status: 500 });
  }
}
