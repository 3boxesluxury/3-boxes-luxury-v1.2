'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialNetwork = 'facebook' | 'linkedin' | 'instagram' | 'google'

export interface SocialConnection {
  network: SocialNetwork
  connected: boolean
  connecting: boolean
  profile?: {
    name: string
    avatar?: string
    email?: string
    gender?: string
  }
  likes?: { name: string; category: string }[]
  youtubeToken?: string
  youtubeTokenExpiry?: number
  birthday?: string
}

export interface SocialNetworkConfig {
  network: SocialNetwork
  label: string
  icon: 'google' | 'facebook' | 'linkedin' | 'instagram'
  color: string
  bgColor: string
  borderColor: string
  dataDescription: string[]
  dataItems: string[]
  realConnect: boolean
}

// ─── Social Network Config ────────────────────────────────────────────────────

export const SOCIAL_NETWORKS: SocialNetworkConfig[] = [
  {
    network: 'google',
    label: 'Google',
    icon: 'google',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    dataDescription: [
      'Your Google profile information',
      'YouTube subscriptions & preferences',
      'Search patterns related to fashion',
      'Google Photos for style analysis',
    ],
    dataItems: ['Profile', 'YouTube', 'Search', 'Photos'],
    realConnect: true,
  },
  {
    network: 'facebook',
    label: 'Facebook',
    icon: 'facebook',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    dataDescription: [
      'Your public profile information',
      'Liked pages related to fashion & lifestyle',
      'Profile picture for style analysis',
      'Interest categories from your activity',
    ],
    dataItems: ['Profile', 'Likes', 'Photos', 'Interests'],
    realConnect: true,
  },
  {
    network: 'linkedin',
    label: 'LinkedIn',
    icon: 'linkedin',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    dataDescription: [
      'Your professional profile & industry',
      'Professional communities you follow',
      'Work anniversary & career milestones',
      'Skills & endorsements related to fashion',
    ],
    dataItems: ['Profile', 'Industry', 'Communities', 'Skills'],
    realConnect: true,
  },
  {
    network: 'instagram',
    label: 'Instagram',
    icon: 'instagram',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    dataDescription: [
      'Your public posts & captions',
      'Accounts you follow (fashion & lifestyle)',
      'Hashtags you frequently use',
      'Profile & bio for style analysis',
    ],
    dataItems: ['Posts', 'Follows', 'Hashtags', 'Profile'],
    realConnect: true,
  },
]

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = '3boxes_social_connections'

function loadPersistedConnections(): Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistConnections(data: Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Shared hook for managing social network connections.
 * Used by both SocialConnectionsSection (home page) and SocialStyleIntegration (social-style view).
 *
 * The connection state is persisted in localStorage so that connections made on
 * one view are reflected on the other. The OAuth flow redirects back to
 * /?view=social-style, where the SocialStyleIntegration component picks up the
 * callback and finalizes the connection.
 */
export function useSocialConnections() {
  const { authUser, authToken, setAuthView, clearAuth, setView } = useStore()

  // Connection states — initialized from localStorage if available
  const [connections, setConnections] = useState<SocialConnection[]>(() => {
    const persisted = loadPersistedConnections()
    return [
      { network: 'google', connected: !!persisted.google, connecting: false, profile: persisted.google ? { name: persisted.google.name, email: persisted.google.email, avatar: persisted.google.avatar, gender: persisted.google.gender } : undefined, youtubeToken: persisted.google?.youtubeToken || undefined, youtubeTokenExpiry: persisted.google?.youtubeTokenExpiry || undefined, birthday: persisted.google?.birthday || undefined },
      { network: 'facebook', connected: !!persisted.facebook, connecting: false, profile: persisted.facebook ? { name: persisted.facebook.name, email: persisted.facebook.email, avatar: persisted.facebook.avatar, gender: persisted.facebook.gender } : undefined },
      { network: 'linkedin', connected: !!persisted.linkedin, connecting: false, profile: persisted.linkedin ? { name: persisted.linkedin.name, email: persisted.linkedin.email, avatar: persisted.linkedin.avatar } : undefined },
      { network: 'instagram', connected: !!persisted.instagram, connecting: false, profile: persisted.instagram ? { name: persisted.instagram.name, email: persisted.instagram.email, avatar: persisted.instagram.avatar } : undefined },
    ]
  })

  // Track avatars that failed to load (so we show icon fallback instead of broken image)
  const [failedAvatars, setFailedAvatars] = useState<Set<SocialNetwork>>(new Set())

  // ─── Sync with backend on mount ──────────────────────────────────────────
  // Fetch the user's active social provider from the database.
  // This ensures the connection status is always correct, even across devices.
  useEffect(() => {
    if (!authUser || !authToken) return

    let cancelled = false

    async function syncWithBackend() {
      try {
        const res = await fetch('/api/auth/social/connections', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const activeProvider = data.activeProvider
        if (activeProvider) {
          // The user has an active social login provider — ensure it shows as connected
          setConnections((prev) =>
            prev.map((c) => {
              if (c.network === activeProvider.toLowerCase()) {
                // If not already connected (or profile missing), mark as connected
                // using the user's profile data from the backend
                if (!c.connected || !c.profile) {
                  return {
                    ...c,
                    connected: true,
                    connecting: false,
                    profile: c.profile || {
                      name: data.user?.name || authUser.name,
                      email: data.user?.email || authUser.email,
                      avatar: data.user?.avatar || undefined,
                      gender: data.user?.gender || undefined,
                    },
                  }
                }
              }
              return c
            })
          )
        }
      } catch {
        // Backend unavailable — localStorage state remains (graceful fallback)
      }
    }

    syncWithBackend()
    return () => { cancelled = true }
  }, [authUser, authToken])

  const connectedNetworks = connections.filter((c) => c.connected)
  const hasAnyConnection = connectedNetworks.length > 0
  const allConnected = connections.every((c) => c.connected)

  const updateConnection = useCallback(
    (network: SocialNetwork, updates: Partial<SocialConnection>) => {
      setConnections((prev) => {
        const next = prev.map((c) => (c.network === network ? { ...c, ...updates } : c))
        // Persist to localStorage whenever connections change
        const persisted: Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }> = {}
        for (const c of next) {
          if (c.connected && c.profile) {
            persisted[c.network] = { name: c.profile.name, email: c.profile.email, avatar: c.profile.avatar }
            if (c.profile.gender) {
              persisted[c.network].gender = c.profile.gender
            }
            if (c.network === 'google' && c.youtubeToken) {
              persisted[c.network].youtubeToken = c.youtubeToken
            }
            if (c.network === 'google' && c.youtubeTokenExpiry) {
              persisted[c.network].youtubeTokenExpiry = c.youtubeTokenExpiry
            }
            if (c.network === 'google' && c.birthday) {
              persisted[c.network].birthday = c.birthday
            }
          }
        }
        persistConnections(persisted)
        return next
      })
    },
    []
  )

  // ─── OAuth Redirect Handlers ──────────────────────────────────────────────
  // Each handler redirects to the provider's OAuth endpoint with `returnTo=/?view=social-style`
  // so the user lands back on the social-style page after authenticating.

  const handleGoogleConnect = useCallback(() => {
    updateConnection('google', { connecting: true })
    try {
      sessionStorage.setItem('3boxes_google_connect', 'true')
      sessionStorage.setItem('3boxes_google_connect_time', Date.now().toString())
    } catch {}
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  const handleFacebookConnect = useCallback(() => {
    updateConnection('facebook', { connecting: true })
    try {
      sessionStorage.setItem('3boxes_facebook_connect', 'true')
      sessionStorage.setItem('3boxes_facebook_connect_time', Date.now().toString())
    } catch {}
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/facebook?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  const handleLinkedInConnect = useCallback(() => {
    updateConnection('linkedin', { connecting: true })
    try {
      sessionStorage.setItem('3boxes_linkedin_connect', 'true')
      sessionStorage.setItem('3boxes_linkedin_connect_time', Date.now().toString())
    } catch {}
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/linkedin?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  const handleInstagramConnect = useCallback(() => {
    updateConnection('instagram', { connecting: true })
    try {
      sessionStorage.setItem('3boxes_instagram_connect', 'true')
      sessionStorage.setItem('3boxes_instagram_connect_time', Date.now().toString())
    } catch {}
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/facebook?returnTo=${encodeURIComponent(returnUrl)}&action=connect&instagram=true`
  }, [updateConnection])

  // ─── Detect OAuth callback on mount (for connections made from this view) ──
  // This reads the connect_provider URL param set by the OAuth callback.
  // The full OAuth callback handling (including sessionStorage, cookies, etc.)
  // is done by SocialStyleIntegration when the user lands on /?view=social-style.
  // Here we just do a lightweight refresh of the connection state from localStorage
  // in case the connection was established on another view.
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Refresh from localStorage on mount
    const persisted = loadPersistedConnections()
    setConnections((prev) =>
      prev.map((c) => {
        const p = persisted[c.network]
        if (p && !c.connected) {
          return {
            ...c,
            connected: true,
            connecting: false,
            profile: { name: p.name, email: p.email, avatar: p.avatar, gender: p.gender },
            ...(c.network === 'google' && p.youtubeToken ? { youtubeToken: p.youtubeToken } : {}),
            ...(c.network === 'google' && p.youtubeTokenExpiry ? { youtubeTokenExpiry: p.youtubeTokenExpiry } : {}),
            ...(c.network === 'google' && p.birthday ? { birthday: p.birthday } : {}),
          }
        }
        if (!p && c.connected) {
          // Was disconnected elsewhere
          return { ...c, connected: false, connecting: false, profile: undefined }
        }
        return c
      })
    )
  }, [])

  // ─── Connect / Disconnect ─────────────────────────────────────────────────

  const handleConnectClick = useCallback((networkConfig: SocialNetworkConfig) => {
    if (!authUser) {
      setAuthView('login')
      return
    }
    const network = networkConfig.network
    if (network === 'google') return handleGoogleConnect()
    if (network === 'facebook') return handleFacebookConnect()
    if (network === 'linkedin') return handleLinkedInConnect()
    if (network === 'instagram') return handleInstagramConnect()
  }, [authUser, setAuthView, handleGoogleConnect, handleFacebookConnect, handleLinkedInConnect, handleInstagramConnect])

  const handleDisconnect = useCallback(
    async (network: SocialNetwork) => {
      setFailedAvatars((prev) => {
        const next = new Set(prev)
        next.delete(network)
        return next
      })

      // If Facebook, also logout from FB SDK
      if (network === 'facebook' && typeof window !== 'undefined' && window.FB) {
        try {
          window.FB.getLoginStatus((response: any) => {
            if (response.status === 'connected') {
              window.FB!.logout(() => {})
            }
          })
        } catch {}
      }

      // Call backend to disconnect the provider
      // If this is the active login provider, the backend will log the user out
      if (authToken) {
        try {
          const res = await fetch(`/api/auth/social/connections?provider=${network}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          })

          if (res.ok) {
            const data = await res.json()

            // Update local state (remove connection from UI)
            updateConnection(network, { connected: false, profile: undefined, likes: undefined })

            // If the backend says the user was logged out (active provider disconnected),
            // clear the auth session and redirect to login
            if (data.loggedOut) {
              clearAuth()
              // Clear all social connections from localStorage
              try { localStorage.removeItem(STORAGE_KEY) } catch {}
              // Redirect to home/login
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }
          } else {
            // Backend call failed — still update local state as fallback
            updateConnection(network, { connected: false, profile: undefined, likes: undefined })
          }
        } catch {
          // Network error — still update local state as fallback
          updateConnection(network, { connected: false, profile: undefined, likes: undefined })
        }
      } else {
        // No auth token — just update local state
        updateConnection(network, { connected: false, profile: undefined, likes: undefined })
      }
    },
    [updateConnection, authToken, clearAuth]
  )

  return {
    connections,
    connectedNetworks,
    hasAnyConnection,
    allConnected,
    failedAvatars,
    setFailedAvatars,
    handleConnectClick,
    handleDisconnect,
    updateConnection,
  }
}
