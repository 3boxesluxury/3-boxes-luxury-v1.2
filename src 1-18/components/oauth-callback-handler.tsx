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

// v19: Dedicated localStorage key for Facebook extended data
// This is MORE RELIABLE than storing in the connection state because:
// 1. It survives page reloads even if the connection state is lost
// 2. It's separate from the main connection data, so quota issues won't affect basic profile data
// 3. It can be read directly by handleAnalyzeStyle as a fallback
const FB_EXTENDED_DATA_KEY = '3boxes_facebook_extended'

/**
 * OAuthCallbackHandler — v19
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
 * v19 FIX: Now also stores Facebook extended data (gender, photos, birthday,
 * ageGroup, fashionLikes) in a DEDICATED localStorage key so it survives
 * page reloads, race conditions, and connection state loss.
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
    // v17: Read Facebook extended data (photos, likes, birthday, age_range, gender, fashionLikes)
    const authFbData = params.get('auth_fb_data')
    const viewParam = params.get('view')

    // Connect action params (from social media integration page)
    const connectProvider = params.get('connect_provider')
    const connectName = params.get('connect_name')
    const connectEmail = params.get('connect_email')
    const connectAvatar = params.get('connect_avatar')
    const connectId = params.get('connect_id')
    // v16: Read gender from connect action (OAuth provider)
    const connectGender = params.get('connect_gender')
    // v21: Read birthday from connect action (Google People API)
    const connectBirthday = params.get('connect_birthday')
    // v21: Read YouTube access token from connect action (Google OAuth)
    const connectYoutubeToken = params.get('connect_youtube_token')
    // v17: Read Facebook extended data from connect action (photos, likes, birthday, age_range, fashionLikes)
    const connectFbData = params.get('connect_fb_data')
    // v22.1: Read Instagram connection data from Facebook OAuth callback
    const connectIgUsername = params.get('connect_ig_username')
    const connectIgUserId = params.get('connect_ig_user_id')
    const connectIgAvatar = params.get('connect_ig_avatar')
    // v22.5: Read Facebook connection data from Instagram OAuth callback
    const connectFbName = params.get('connect_fb_name')
    const connectFbId = params.get('connect_fb_id')
    const connectFbEmail = params.get('connect_fb_email')
    const connectFbAvatar = params.get('connect_fb_avatar')

    // v21: Diagnostic log — show what data is available from the OAuth callback
    console.log('[OAuth Callback] v22.5: URL params present:', {
      auth_provider: !!authProvider, auth_gender: !!authGender, auth_fb_data: !!authFbData,
      auth_birthday: !!params.get('auth_birthday'), auth_youtube_token: !!params.get('auth_youtube_token'),
      connect_provider: !!connectProvider, connect_name: !!connectName,
      connect_gender: !!connectGender, connect_birthday: !!connectBirthday,
      connect_youtube_token: !!connectYoutubeToken, connect_fb_data: !!connectFbData,
      connect_fb_data_length: connectFbData?.length || 0,
      connect_ig_username: !!connectIgUsername, connect_fb_name: !!connectFbName, connect_fb_id: !!connectFbId,
    })
    if (connectGender) console.log('[OAuth Callback] v21: connect_gender =', connectGender)
    if (connectBirthday) console.log('[OAuth Callback] v21: connect_birthday =', connectBirthday)
    if (authGender) console.log('[OAuth Callback] v21: auth_gender =', authGender)

    // Restore view state from URL parameter (e.g. ?view=social-style)
    if (viewParam && VALID_VIEWS.includes(viewParam as View)) {
      console.log('[OAuth Callback] Restoring view:', viewParam)
      setView(viewParam as View)
    }

    // ─── Helper: Parse and store Facebook extended data reliably ───
    // v19: Stores in BOTH sessionStorage (for immediate use) AND
    // localStorage (for survival across page reloads and race conditions)
    function storeFbExtendedData(rawFbData: string | null, source: string): any | null {
      if (!rawFbData) return null
      try {
        // Handle both single-encoded and double-encoded data
        // The Facebook callback route may use encodeURIComponent + searchParams.set (double-encoded)
        // or just searchParams.set (single-encoded). Handle both.
        let jsonString = rawFbData
        // Try direct parse first (already decoded by searchParams.get)
        try {
          const parsed = JSON.parse(jsonString)
          if (parsed && typeof parsed === 'object' && (parsed.gender !== undefined || parsed.photosCount !== undefined)) {
            // Successfully parsed directly
            storeParsedFbData(parsed, source)
            return parsed
          }
        } catch {}
        // Try single decodeURIComponent then parse
        try {
          const decoded = decodeURIComponent(jsonString)
          const parsed = JSON.parse(decoded)
          if (parsed && typeof parsed === 'object') {
            storeParsedFbData(parsed, source)
            return parsed
          }
        } catch {}
        // Try double decodeURIComponent then parse (double-encoded by callback route)
        try {
          const decoded1 = decodeURIComponent(jsonString)
          const decoded2 = decodeURIComponent(decoded1)
          const parsed = JSON.parse(decoded2)
          if (parsed && typeof parsed === 'object') {
            storeParsedFbData(parsed, source)
            return parsed
          }
        } catch {}
        console.warn('[OAuth Callback] v19: Could not parse Facebook extended data from', source)
        return null
      } catch (e) {
        console.warn('[OAuth Callback] v19: Error processing Facebook extended data:', e)
        return null
      }
    }

    function storeParsedFbData(parsed: any, source: string) {
      console.log(`[OAuth Callback] v19: Parsed Facebook extended data from ${source} — gender: ${parsed.gender}, photos: ${parsed.photosCount}, likes: ${parsed.likesCount}, ageGroup: ${parsed.ageGroup}, birthday: ${parsed.birthday}`)
      // Store in sessionStorage for immediate use by SocialStyleIntegration
      try {
        sessionStorage.setItem('3boxes_oauth_fb_data', JSON.stringify(parsed))
      } catch {}
      // v19: ALSO store in dedicated localStorage for reliability
      // This survives page reloads, race conditions, and connection state loss
      try {
        localStorage.setItem(FB_EXTENDED_DATA_KEY, JSON.stringify(parsed))
        console.log('[OAuth Callback] v19: Facebook extended data also saved to localStorage key:', FB_EXTENDED_DATA_KEY)
      } catch (e) {
        console.warn('[OAuth Callback] v19: Failed to save Facebook extended data to localStorage (may exceed quota):', e)
      }
    }

    // ─── Handle CONNECT action (from social media integration page) ───
    // This does NOT change the main auth session — it only stores the
    // connected provider info in sessionStorage so SocialStyleIntegration
    // can read it and show the provider as "connected".
    if (connectProvider && connectName) {
      console.log('[OAuth Callback] Connect action detected — storing provider info:', connectProvider, connectName, '| avatar:', connectAvatar ? 'YES (' + connectAvatar.substring(0, 80) + '...)' : 'NONE')
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
          console.log('[OAuth Callback] v21: Stored connect gender:', connectGender)
        }
        // v21: Store birthday from Google People API
        if (connectBirthday) {
          sessionStorage.setItem('3boxes_google_birthday', connectBirthday)
          console.log('[OAuth Callback] v21: Stored connect birthday:', connectBirthday)
        }
        // v21: Store YouTube access token from Google OAuth
        if (connectYoutubeToken) {
          sessionStorage.setItem('3boxes_google_youtube_token', connectYoutubeToken)
          console.log('[OAuth Callback] v21: Stored connect YouTube token (length:', connectYoutubeToken.length, ')')
        }
        // v17/v19: Store Facebook extended data (photos, likes, birthday, age, fashionLikes)
        // Uses the robust parser that handles both single and double encoding
        if (connectFbData) {
          storeFbExtendedData(connectFbData, 'connect_fb_data')
        }
        // v22.1: Store Instagram connection data from Facebook OAuth callback
        // This is critical so SocialStyleIntegration can mark Instagram as connected
        // when Facebook OAuth also returns Instagram Graph API data
        if (connectIgUsername && connectIgUserId) {
          try {
            sessionStorage.setItem('3boxes_oauth_ig_username', connectIgUsername)
            sessionStorage.setItem('3boxes_oauth_ig_user_id', connectIgUserId)
            if (connectIgAvatar) {
              sessionStorage.setItem('3boxes_oauth_ig_avatar', connectIgAvatar)
            }
            console.log('[OAuth Callback] v22.1: Stored Instagram connect data:', connectIgUsername)
          } catch {}
        }
        // v22.5: Store Facebook connection data from Instagram OAuth callback
        // This is critical so SocialStyleIntegration can mark Facebook as connected
        // when Instagram OAuth also returns Facebook profile data
        if (connectFbName && connectFbId) {
          try {
            sessionStorage.setItem('3boxes_oauth_fb_name', connectFbName)
            sessionStorage.setItem('3boxes_oauth_fb_id', connectFbId)
            if (connectFbEmail) {
              sessionStorage.setItem('3boxes_oauth_fb_email', connectFbEmail)
            }
            if (connectFbAvatar) {
              sessionStorage.setItem('3boxes_oauth_fb_avatar', connectFbAvatar)
            }
            console.log('[OAuth Callback] v22.5: Stored Facebook connect data from Instagram callback:', connectFbName)
          } catch {}
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
            console.log('[OAuth Callback] v21: Stored auth gender:', authGender)
          }
          // v21: Store birthday from Google People API in login flow
          const authBirthday = params.get('auth_birthday')
          if (authBirthday) {
            sessionStorage.setItem('3boxes_google_birthday', authBirthday)
            console.log('[OAuth Callback] v21: Stored auth birthday:', authBirthday)
          }
          // v21: Store YouTube access token in login flow
          const authYoutubeToken = params.get('auth_youtube_token')
          if (authYoutubeToken) {
            sessionStorage.setItem('3boxes_google_youtube_token', authYoutubeToken)
            console.log('[OAuth Callback] v21: Stored auth YouTube token (length:', authYoutubeToken.length, ')')
          }
          // v17/v19: Store Facebook extended data (photos, likes, birthday, age, fashionLikes)
          // Uses the robust parser that handles both single and double encoding
          if (authFbData) {
            storeFbExtendedData(authFbData, 'auth_fb_data')
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
