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
 * Also handles "connect" actions from the social media integration page:
 * When a user connects a provider (action=connect), the callback returns
 * connect_provider/connect_name/connect_email params instead of auth_token.
 * This handler stores the provider info in sessionStorage so the
 * SocialStyleIntegration component can read it — WITHOUT changing the
 * main auth session.
 *
 * Also restores the `view` state from the `?view=` URL parameter
 * so that OAuth redirects can return to the correct view (e.g. social-style).
 */
export function OAuthCallbackHandler() {
  const setAuth = useStore((s) => s.setAuth)
  const setView = useStore((s) => s.setView)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    let authToken = params.get('auth_token')
    const authError = params.get('auth_error')
    const authProvider = params.get('auth_provider')
    const authName = params.get('auth_name')
    const authEmail = params.get('auth_email')
    const authRole = params.get('auth_role')
    const authId = params.get('auth_id')
    const authAvatar = params.get('auth_avatar')
    // v16: Read gender from OAuth provider (Facebook Graph API / Google People API / LinkedIn name inference)
    const authGender = params.get('auth_gender')
    const viewParam = params.get('view')

    // Connect action params (from social media integration page)
    const connectProvider = params.get('connect_provider')
    const connectName = params.get('connect_name')
    const connectEmail = params.get('connect_email')
    const connectAvatar = params.get('connect_avatar')
    const connectId = params.get('connect_id')
    // v16: Read gender from connect action (OAuth provider)
    const connectGender = params.get('connect_gender')

    // Restore view state from URL parameter (e.g. ?view=social-style)
    if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
      console.log('[OAuth Callback] Restoring view:', viewParam)
      setView(viewParam as View)
    }

    // ─── Handle CONNECT action (from social media integration page) ───
    // This does NOT change the main auth session — it only stores the
    // connected provider info in sessionStorage so SocialStyleIntegration
    // can read it and show the provider as "connected".
    if (connectProvider && connectName) {
      console.log('[OAuth Callback] Connect action detected — storing provider info without changing main auth:', connectProvider, connectName)
      try {
        sessionStorage.setItem('3boxes_oauth_provider', connectProvider)
        sessionStorage.setItem('3boxes_oauth_name', connectName)
        sessionStorage.setItem('3boxes_oauth_email', connectEmail || '')
        if (connectAvatar) {
          sessionStorage.setItem('3boxes_oauth_avatar', connectAvatar)
        }
        if (connectId) {
          sessionStorage.setItem('3boxes_oauth_social_id', connectId)
        }
        // v16: Store gender from OAuth provider
        if (connectGender) {
          sessionStorage.setItem('3boxes_oauth_gender', connectGender)
        }
        console.log('[OAuth Callback] Provider info stored in sessionStorage for SocialStyleIntegration')
      } catch {}

      showToast('success', `${connectProvider.charAt(0).toUpperCase() + connectProvider.slice(1)} connected: ${connectName}`)

      // Clean URL — remove connect params but keep view param if present
      const cleanParams = new URLSearchParams()
      if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
        cleanParams.set('view', viewParam)
      }
      const cleanUrl = cleanParams.toString()
        ? `${window.location.pathname}?${cleanParams.toString()}`
        : window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
      return // Don't process further — don't change main auth
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
      showToast('error', authError)
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

    // Handle successful OAuth callback (LOGIN action)
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
          if (authAvatar) {
            sessionStorage.setItem('3boxes_oauth_avatar', authAvatar)
          }
          // v16: Store gender from OAuth provider in login flow
          if (authGender) {
            sessionStorage.setItem('3boxes_oauth_gender', authGender)
          }
          console.log('[OAuth Callback] Stored provider info in sessionStorage:', authProvider, authName, authAvatar ? 'with avatar' : 'no avatar')
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
