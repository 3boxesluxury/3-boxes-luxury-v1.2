'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { AuthUser, View } from '@/lib/store'
import { showToast } from '@/hooks/use-toast-notification'

const VALID_VIEWS: View[] = [
  'home', 'product', 'cart', 'checkout', 'orders', 'order-confirmation',
  'user-dashboard', 'admin-dashboard', 'agent-dashboard', 'team-dashboard',
  'corporate-dashboard', 'wiki', 'downloads', 'security-policy',
  'social-style', '3box-curate', 'family-shopping',
]

/**
 * OAuthCallbackHandler
 *
 * Handles OAuth redirect callbacks from Google, Facebook & LinkedIn.
 * Placed once in the app root (page.tsx) — it reads auth params
 * from URL or cookies on every page load and sets the auth state.
 *
 * Also restores the `view` state from the `?view=` URL parameter
 * so that OAuth redirects can return to the correct view (e.g. social-style).
 *
 * IMPORTANT: After successful auth, this component stores the provider info
 * in sessionStorage so that other components (like SocialStyleIntegration)
 * can read it reliably, even if the URL params are cleaned before they render.
 *
 * V7 FIX: URL param names now match what the callback routes actually set:
 *   auth_token, auth_id, auth_name, auth_email, auth_role, auth_provider
 */
export function OAuthCallbackHandler() {
  const setAuth = useStore((s) => s.setAuth)
  const setView = useStore((s) => s.setView)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)

    // Read auth params — these MUST match what the callback routes set in the URL
    let authToken = params.get('auth_token')
    const authError = params.get('auth_error')
    const authProvider = params.get('auth_provider')
    const authName = params.get('auth_name')
    const authEmail = params.get('auth_email')
    const authRole = params.get('auth_role')
    const authId = params.get('auth_id')
    const viewParam = params.get('view')

    // Restore view state from URL parameter (e.g. ?view=social-style)
    if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
      console.log('[OAuth Callback] Restoring view:', viewParam)
      setView(viewParam as View)
    }

    // Fallback: check auth_token cookie if URL params missing
    if (!authToken) {
      const cookies = document.cookie.split(';')
      for (const c of cookies) {
        const [key, val] = c.trim().split('=')
        if (key === 'auth_token' && val) {
          authToken = val
          break
        }
      }
    }

    // Handle error from OAuth callback
    if (authError) {
      console.error('[OAuth Callback] Auth error:', authError)
      showToast('error', decodeURIComponent(authError))
      // Clean URL — keep view param if present
      const cleanParams = new URLSearchParams()
      if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
        cleanParams.set('view', viewParam)
      }
      const cleanUrl = cleanParams.toString()
        ? `${window.location.pathname}?${cleanParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
      return
    }

    // Handle successful OAuth callback
    if (authToken && authId) {
      const user: AuthUser = {
        id: authId,
        email: authEmail || '',
        name: authName || 'User',
        role: (authRole as AuthUser['role']) || 'user',
      }

      console.log('[OAuth Callback] Setting auth user:', user.name, user.email, 'provider:', authProvider)
      setAuth(user, authToken)

      // Store OAuth provider info in sessionStorage so SocialStyleIntegration
      // can read it reliably (URL params might be cleaned before it renders)
      if (authProvider) {
        try {
          sessionStorage.setItem('3boxes_oauth_provider', authProvider)
          sessionStorage.setItem('3boxes_oauth_name', authName || user.name)
          sessionStorage.setItem('3boxes_oauth_email', authEmail || user.email)
          console.log('[OAuth Callback] Stored provider info in sessionStorage:', authProvider, authName)
        } catch {}
      }

      // Verify auth was saved to localStorage
      try {
        const saved = localStorage.getItem('3boxes_auth')
        console.log('[OAuth Callback] Auth saved to localStorage:', !!saved)
      } catch {}

      showToast('success', `Welcome, ${user.name}! Signed in with ${authProvider || 'social'}.`)

      // Clean URL — remove auth params but keep view param if present
      const cleanParams = new URLSearchParams()
      if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
        cleanParams.set('view', viewParam)
      }
      const cleanUrl = cleanParams.toString()
        ? `${window.location.pathname}?${cleanParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', cleanUrl)

      // Clean up the auth_token cookie
      document.cookie = 'auth_token=; path=/; max-age=0'
    }
  }, [setAuth, setView])

  // This component has no UI — it only handles auth state
  return null
}
