import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for server-side usage (API routes).
 * Uses the SERVICE ROLE KEY to bypass RLS for admin operations like file uploads.
 *
 * Required env vars:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (server-only, never expose to client)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL is not set. Uploads will fail.')
}
if (!supabaseServiceKey) {
  console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Uploads will fail.')
}

// Singleton pattern to avoid creating multiple clients
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase

/** The Supabase Storage bucket name for product images */
export const STORAGE_BUCKET = 'product-images'
