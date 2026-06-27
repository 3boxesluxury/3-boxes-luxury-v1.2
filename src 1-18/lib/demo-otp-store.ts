/**
 * In-memory OTP store for demo users and fallback when DB is unavailable.
 * This is shared between the login route and 2FA verify route.
 */

interface OtpEntry {
  otp: string
  expiry: Date
  email: string
}

// Global in-memory store (survives HMR in development)
const globalForOtp = globalThis as unknown as { __demoOtpStore: Map<string, OtpEntry> }

export const demoOtpStore: Map<string, OtpEntry> =
  globalForOtp.__demoOtpStore || (globalForOtp.__demoOtpStore = new Map())

/**
 * Store an OTP for a user
 */
export function setOtp(userId: string, otp: string, email: string, ttlMinutes: number = 5): void {
  demoOtpStore.set(userId, {
    otp,
    expiry: new Date(Date.now() + ttlMinutes * 60 * 1000),
    email,
  })

  // Clean up expired entries
  for (const [key, val] of demoOtpStore.entries()) {
    if (val.expiry < new Date()) {
      demoOtpStore.delete(key)
    }
  }
}

/**
 * Verify an OTP for a user. Returns true if valid and not expired.
 * Also deletes the OTP after successful verification (one-time use).
 */
export function verifyOtp(userId: string, code: string): { valid: boolean; email: string } {
  const entry = demoOtpStore.get(userId)
  if (!entry) return { valid: false, email: '' }

  if (new Date() > entry.expiry) {
    demoOtpStore.delete(userId)
    return { valid: false, email: '' }
  }

  if (entry.otp === code) {
    const email = entry.email
    demoOtpStore.delete(userId) // One-time use
    return { valid: true, email }
  }

  return { valid: false, email: '' }
}

/**
 * Demo user ID to email mapping
 */
export const DEMO_USER_MAP: Record<string, { email: string; name: string; role: string; permissions: string[] }> = {
  'demo-pmkshar': { email: 'pmkshar@gmail.com', name: 'Admin', role: 'admin', permissions: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'] },
  'demo-admin': { email: 'admin@3boxesluxury.com', name: 'Admin', role: 'admin', permissions: ['products.manage', 'orders.manage', 'users.approve', 'users.manage', 'reports.view', 'settings.manage', 'inventory.manage'] },
  'demo-user': { email: 'user@3boxesluxury.com', name: 'User', role: 'user', permissions: ['orders.own', 'cart.manage', 'wishlist.manage', 'profile.own'] },
  'demo-agent': { email: 'agent@3boxesluxury.com', name: 'Agent', role: 'agent', permissions: ['orders.view', 'orders.manage', 'products.view', 'customers.view', 'reports.view'] },
  'demo-team': { email: 'team@3boxesluxury.com', name: 'Team', role: 'team', permissions: ['orders.view', 'products.view', 'inventory.manage', 'reports.view'] },
  'demo-corporate': { email: 'corporate@3boxesluxury.com', name: 'TechCorp Industries', role: 'corporate', permissions: ['corporate.manage', 'campaigns.manage', 'branding.manage', 'recipients.manage'] },
}
