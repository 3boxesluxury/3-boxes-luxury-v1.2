'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/hooks/useTranslation'
import { trackBug } from '@/lib/bug-track'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Facebook,
  Linkedin,
  Instagram,
  Chrome,
  Loader2,
  Sparkles,
  Shield,
  Palette,
  Tag,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Unplug,
  Wand2,
  TrendingUp,
  ExternalLink,
  User,
  ArrowLeft,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialNetwork = 'facebook' | 'linkedin' | 'instagram' | 'google'

interface SocialConnection {
  network: SocialNetwork
  connected: boolean
  connecting: boolean
  profile?: {
    name: string
    avatar?: string
    email?: string
    gender?: string  // v21: Fix — gender from OAuth provider (Google/Facebook)
  }
  likes?: { name: string; category: string }[]
  // v20: YouTube access token for fetching subscriptions
  youtubeToken?: string
  // v20.5: Token expiry timestamp (ms since epoch) — used to auto-refresh
  youtubeTokenExpiry?: number
  // v20.4: Birthday from Google People API
  birthday?: string
}

interface StyleProfile {
  tags: string[]
  confidence: number
  description: string
}

interface ColorPreference {
  name: string
  hex: string
  affinity: number
}

interface RecommendedCategory {
  name: string
  score: number
  reason: string
}

interface StyleAnalysis {
  styleProfile: StyleProfile
  colorPreferences: ColorPreference[]
  recommendedCategories: RecommendedCategory[]
}

interface PrivacySettings {
  shareStyleProfile: boolean
  shareColorPreferences: boolean
  sharePurchaseHistory: boolean
  allowPersonalizedAds: boolean
}

interface ProductRecommendation {
  id: string
  name: string
  price: number
  image: string
  reason: string
  matchScore: number
}

// ─── Social Network Config ────────────────────────────────────────────────────

interface SocialNetworkConfig {
  network: SocialNetwork
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  dataDescription: string[]
  dataItems: string[]
  realConnect: boolean
}

const SOCIAL_NETWORKS: SocialNetworkConfig[] = [
  {
    network: 'google',
    label: 'Google',
    icon: <Chrome className="size-5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    dataDescription: ['socialIntegration.dataDesc.google1', 'socialIntegration.dataDesc.google2', 'socialIntegration.dataDesc.google3', 'socialIntegration.dataDesc.google4'],
    dataItems: ['Profile', 'YouTube', 'Search', 'Photos'],
    realConnect: true,
  },
  {
    network: 'facebook',
    label: 'Facebook',
    icon: <Facebook className="size-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    dataDescription: ['socialIntegration.dataDesc.facebook1', 'socialIntegration.dataDesc.facebook2', 'socialIntegration.dataDesc.facebook3', 'socialIntegration.dataDesc.facebook4'],
    dataItems: ['Profile', 'Likes', 'Photos', 'Interests'],
    realConnect: true,
  },
  {
    network: 'linkedin',
    label: 'LinkedIn',
    icon: <Linkedin className="size-5" />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    dataDescription: ['socialIntegration.dataDesc.linkedin1', 'socialIntegration.dataDesc.linkedin2', 'socialIntegration.dataDesc.linkedin3', 'socialIntegration.dataDesc.linkedin4'],
    dataItems: ['Profile', 'Industry', 'Communities', 'Skills'],
    realConnect: true,
  },
  {
    network: 'instagram',
    label: 'Instagram',
    icon: <Instagram className="size-5" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    dataDescription: ['socialIntegration.dataDesc.instagram1', 'socialIntegration.dataDesc.instagram2', 'socialIntegration.dataDesc.instagram3', 'socialIntegration.dataDesc.instagram4'],
    dataItems: ['Posts', 'Follows', 'Hashtags', 'Profile'],
    realConnect: true,  // v22: Now uses real Instagram Graph API via Facebook OAuth
  },
]

// ─── Fallback Mock Data ───────────────────────────────────────────────────────

const FALLBACK_ANALYSIS: StyleAnalysis = {
  styleProfile: {
    tags: ['Classic', 'Minimalist', 'Sophisticated', 'Contemporary'],
    confidence: 87,
    description:
      'Your style reflects a refined appreciation for timeless elegance combined with modern sensibility. You gravitate toward clean lines, premium fabrics, and understated luxury that speaks volumes without excess.',
  },
  colorPreferences: [
    { name: 'Ivory & Cream', hex: '#FFFDD0', affinity: 92 },
    { name: 'Deep Charcoal', hex: '#36454F', affinity: 88 },
    { name: 'Champagne Gold', hex: '#F7E7CE', affinity: 85 },
    { name: 'Slate Blue', hex: '#6A7BA2', affinity: 78 },
    { name: 'Burgundy', hex: '#800020', affinity: 72 },
  ],
  recommendedCategories: [
    { name: 'Luxury Watches', score: 95, reason: 'Your classic aesthetic aligns perfectly with timeless timepieces' },
    { name: 'Premium Leather Goods', score: 91, reason: 'Minimalist style pairs beautifully with refined leather accessories' },
    { name: 'Fine Jewelry', score: 88, reason: 'Sophisticated taste matches elegant jewelry selections' },
    { name: 'Designer Fragrances', score: 84, reason: 'Contemporary sensibility drawn to nuanced, layered scents' },
    { name: 'Silk & Cashmere', score: 80, reason: 'Your preference for premium fabrics suggests luxury textiles' },
  ],
}

const FALLBACK_PRODUCTS: ProductRecommendation[] = [
  { id: 'rec-1', name: 'Royal Chronograph Gold', price: 45000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', reason: 'Perfect match for your classic watch aesthetic', matchScore: 97 },
  { id: 'rec-2', name: 'Heritage Leather Briefcase', price: 28000, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', reason: 'Aligns with your minimalist leather preference', matchScore: 94 },
  { id: 'rec-3', name: 'Emerald Tennis Bracelet', price: 62000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', reason: 'Sophisticated elegance that matches your style', matchScore: 91 },
  { id: 'rec-4', name: 'Jardin Secret Eau de Parfum', price: 8500, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', reason: 'Layered complexity for your contemporary taste', matchScore: 87 },
  { id: 'rec-5', name: 'Cashmere Overcoat', price: 35000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', reason: 'Premium fabric perfect for your refined palette', matchScore: 84 },
  { id: 'rec-6', name: 'Sapphire Cascade Earrings', price: 38000, image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png', reason: 'Understated luxury that speaks to your sophistication', matchScore: 82 },
]

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

// ─── Facebook SDK types (minimal, used only for disconnect) ──────────────────

declare global {
  interface Window {
    FB?: {
      getLoginStatus: (callback: (response: any) => void) => void
      logout: (callback: () => void) => void
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STORAGE_KEY = '3boxes_social_connections'

// Helper: load persisted connections from localStorage
function loadPersistedConnections(): Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Helper: save connections to localStorage (includes youtubeToken for Google)
function persistConnections(data: Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function SocialStyleIntegration() {
  const { authUser, setAuthView, setView } = useStore()
  const { t } = useTranslation()

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

  // Consent dialog
  const [consentDialogNetwork, setConsentDialogNetwork] = useState<SocialNetworkConfig | null>(null)
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)

  // Analysis state
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Products
  const [products, setProducts] = useState<ProductRecommendation[]>([])

  // Track avatars that failed to load (so we show icon fallback instead of broken image)
  const [failedAvatars, setFailedAvatars] = useState<Set<SocialNetwork>>(new Set())

  // Ref for the "Analyze My Style" section — used to scroll back on re-analyze
  const analyzeSectionRef = useRef<HTMLDivElement>(null)

  // Privacy
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    shareStyleProfile: true,
    shareColorPreferences: true,
    sharePurchaseHistory: false,
    allowPersonalizedAds: false,
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const connectedNetworks = connections.filter((c) => c.connected)
  const hasAnyConnection = connectedNetworks.length > 0
  const allConnected = connections.every((c) => c.connected)

  const updateConnection = useCallback(
    (network: SocialNetwork, updates: Partial<SocialConnection>) => {
      setConnections((prev) => {
        const next = prev.map((c) => (c.network === network ? { ...c, ...updates } : c))
        // Persist to localStorage whenever connections change (includes youtubeToken for Google)
        const persisted: Record<string, { name: string; email?: string; avatar?: string; gender?: string; youtubeToken?: string; youtubeTokenExpiry?: number; birthday?: string }> = {}
        for (const c of next) {
          if (c.connected && c.profile) {
            persisted[c.network] = { name: c.profile.name, email: c.profile.email, avatar: c.profile.avatar }
            // v21: Persist gender to localStorage so it survives page reloads
            if (c.profile.gender) {
              persisted[c.network].gender = c.profile.gender
            }
            // v20.1: Persist YouTube token to localStorage so it survives page reloads
            if (c.network === 'google' && c.youtubeToken) {
              persisted[c.network].youtubeToken = c.youtubeToken
            }
            // v20.5: Persist YouTube token expiry to localStorage
            if (c.network === 'google' && c.youtubeTokenExpiry) {
              persisted[c.network].youtubeTokenExpiry = c.youtubeTokenExpiry
            }
            // v20.4: Persist birthday to localStorage so it survives page reloads
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

  // ─── Real Facebook Connect Flow (server-side redirect, like LinkedIn) ──────

  const handleFacebookConnect = useCallback(() => {
    updateConnection('facebook', { connecting: true })

    // Store that we're connecting Facebook so we can detect it on return
    try {
      sessionStorage.setItem('3boxes_facebook_connect', 'true')
      sessionStorage.setItem('3boxes_facebook_connect_time', Date.now().toString())
    } catch {}

    // Redirect to Facebook OAuth — include view=social-style in returnTo so we come back to this page
    // Use action=connect so the callback does NOT change the main login session
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/facebook?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  // ─── Real Instagram Connect Flow (via Facebook OAuth with Instagram scopes) ───
  // v22: Instagram Graph API is accessed through the Facebook OAuth flow.
  // We redirect to Facebook OAuth with Instagram scopes, and the callback returns
  // Instagram data (profile, media, hashtags) alongside Facebook data.

  const handleInstagramConnect = useCallback(() => {
    updateConnection('instagram', { connecting: true })

    // Store that we're connecting Instagram so we can detect it on return
    try {
      sessionStorage.setItem('3boxes_instagram_connect', 'true')
      sessionStorage.setItem('3boxes_instagram_connect_time', Date.now().toString())
    } catch {}

    // Redirect to Facebook OAuth with Instagram scopes — same endpoint as Facebook connect
    // The Facebook callback will also fetch Instagram data via the Graph API
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/facebook?returnTo=${encodeURIComponent(returnUrl)}&action=connect&instagram=true`
  }, [updateConnection])

  // ─── Real LinkedIn Connect Flow ─────────────────────────────────────────────

  const handleLinkedInConnect = useCallback(() => {
    updateConnection('linkedin', { connecting: true })

    // Store that we're connecting LinkedIn so we can detect it on return
    try {
      sessionStorage.setItem('3boxes_linkedin_connect', 'true')
      sessionStorage.setItem('3boxes_linkedin_connect_time', Date.now().toString())
    } catch {}

    // Redirect to LinkedIn OAuth — include view=social-style in returnTo so we come back to this page
    // Use action=connect so the callback does NOT change the main login session
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/linkedin?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  // ─── Real Google Connect Flow ────────────────────────────────────────────────

  const handleGoogleConnect = useCallback(() => {
    updateConnection('google', { connecting: true })

    // Store that we're connecting Google so we can detect it on return
    try {
      sessionStorage.setItem('3boxes_google_connect', 'true')
      sessionStorage.setItem('3boxes_google_connect_time', Date.now().toString())
    } catch {}

    // Redirect to Google OAuth — include view=social-style in returnTo so we come back to this page
    // Use action=connect so the callback does NOT change the main login session
    const returnUrl = '/?view=social-style'
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(returnUrl)}&action=connect`
  }, [updateConnection])

  // ─── Detect OAuth callback on this page (Google/LinkedIn/Facebook) ────────────
  // When OAuth redirects back to this page (via ?view=social-style), we need to
  // mark the corresponding social network as "connected".
  //
  // We read provider info from THREE sources (in priority order):
  // 1. URL params: connect_provider/connect_name (set by callback when action=connect)
  // 2. sessionStorage: 3boxes_oauth_provider/3boxes_oauth_name (set by OAuthCallbackHandler)
  // 3. Per-provider markers: 3boxes_facebook_connect etc. (set before redirect)
  //
  // CRITICAL: For "connect" action, authUser is the ORIGINAL login user.
  // The provider's name/email come from the URL or sessionStorage, NOT from authUser.
  // This ensures Facebook shows Facebook's username, not Google's.

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // ─── SOURCE 1: Direct URL params (most reliable for connect action) ───
      const urlParams = new URLSearchParams(window.location.search)
      const urlConnectProvider = urlParams.get('connect_provider')
      const urlConnectName = urlParams.get('connect_name')
      const urlConnectEmail = urlParams.get('connect_email')
      const urlConnectAvatar = urlParams.get('connect_avatar')
      // v15: Read gender from Facebook OAuth callback
      const urlConnectGender = urlParams.get('connect_gender')
      // v21: Also read gender from cookie (set by callback route — survives reloads)
      const cookieConnectGender = (() => { try { const cs = document.cookie.split(';'); const gc = cs.find(c => c.trim().startsWith('google_gender=')); const v = gc ? decodeURIComponent(gc.split('=').slice(1).join('=')) : null; return v && v !== '' ? v : null } catch { return null } })()
      const connectGender = urlConnectGender || cookieConnectGender
      // v20.2: Read birthday from Google OAuth callback
      const urlConnectBirthday = urlParams.get('connect_birthday')
      // v20.6: Also read birthday from cookie (set by callback route — MOST RELIABLE)
      // Cookie is set even when Google returns no birthday (empty string), so we can differentiate
      const cookieBirthday = (() => { try { const cookies = document.cookie.split(';'); const bCookie = cookies.find(c => c.trim().startsWith('google_birthday=')); return bCookie ? decodeURIComponent(bCookie.split('=').slice(1).join('=')) : null } catch { return null } })()
      const connectBirthday = urlConnectBirthday || (cookieBirthday && cookieBirthday !== '' ? cookieBirthday : null)
      // v20: Read YouTube access token from Google OAuth callback
      const urlConnectYoutubeToken = urlParams.get('connect_youtube_token')
      // v20.1: Also read YouTube token from cookie (set by callback route — more reliable)
      const cookieYoutubeToken = (() => { try { const cookies = document.cookie.split(';'); const ytCookie = cookies.find(c => c.trim().startsWith('google_youtube_token=')); return ytCookie ? decodeURIComponent(ytCookie.split('=').slice(1).join('=')) : null } catch { return null } })()
      const youtubeTokenFromOAuth = urlConnectYoutubeToken || cookieYoutubeToken
      // v20.5: Read token expiry timestamp from cookie (set by callback route)
      const cookieTokenExpiry = (() => { try { const cookies = document.cookie.split(';'); const expCookie = cookies.find(c => c.trim().startsWith('google_token_expires=')); return expCookie ? parseInt(decodeURIComponent(expCookie.split('=').slice(1).join('')), 10) || null : null } catch { return null } })()

      if (urlConnectProvider && urlConnectName && authUser) {
        const network = urlConnectProvider as SocialNetwork
        console.log('[Social Connect] ✅ Connect detected via URL params:', urlConnectProvider, urlConnectName)

        // v22: Read Instagram data from Facebook OAuth callback params
        const urlIgUsername = urlParams.get('connect_ig_username')
        const urlIgUserId = urlParams.get('connect_ig_user_id')
        const urlIgAvatar = urlParams.get('connect_ig_avatar')

        if (network === 'google' || network === 'facebook' || network === 'linkedin' || network === 'instagram') {
          // v22.9: For Instagram, also check connect_ig_avatar as fallback for connect_avatar
          const effectiveAvatar = urlConnectAvatar || (network === 'instagram' ? urlIgAvatar : undefined) || undefined
          updateConnection(network, {
            connecting: false,
            connected: true,
            profile: {
              name: urlConnectName,
              email: urlConnectEmail || undefined,
              avatar: effectiveAvatar,
              // v15/v21: Store gender from OAuth provider (URL or cookie)
              gender: connectGender || undefined,
            },
            // v20.1: Store YouTube token for social-style route (from URL or cookie)
            ...(youtubeTokenFromOAuth && network === 'google' ? { youtubeToken: youtubeTokenFromOAuth } : {}),
            // v20.5: Store YouTube token expiry timestamp
            ...(cookieTokenExpiry && network === 'google' ? { youtubeTokenExpiry: cookieTokenExpiry } : {}),
            // v20.6: Store birthday from Google People API (from cookie or URL)
            ...(connectBirthday && network === 'google' ? { birthday: connectBirthday } : {}),
          })

          // v22.6: Store Instagram rich data when Instagram connects (SOURCE 1)
          if (network === 'instagram' && urlIgUsername && urlIgUserId) {
            try {
              sessionStorage.setItem('3boxes_rich_instagram', JSON.stringify({
                username: urlIgUsername,
                igUserId: urlIgUserId,
                profilePictureUrl: urlIgAvatar || null,
              }))
            } catch {}
          }
          if (network === 'instagram') {
            try {
              sessionStorage.setItem('3boxes_rich_instagram', JSON.stringify({
                username: urlConnectName,
                igUserId: urlParams.get('connect_user_id') || '',
                profilePictureUrl: urlConnectAvatar || null,
              }))
            } catch {}
          }

          // v20.1: Persist YouTube token to sessionStorage + localStorage
          if (youtubeTokenFromOAuth && network === 'google') {
            try { sessionStorage.setItem('3boxes_google_youtube_token', youtubeTokenFromOAuth) } catch {}
            console.log('[Social Connect] YouTube token stored from', urlConnectYoutubeToken ? 'URL' : 'cookie')
          }
          // v20.6: Persist birthday to sessionStorage AND localStorage
          if (connectBirthday && network === 'google') {
            try { sessionStorage.setItem('3boxes_google_birthday', connectBirthday) } catch {}
            // Also persist to localStorage so it survives tab closes and page reloads
            try {
              const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
              if (stored.google) {
                stored.google.birthday = connectBirthday
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
              }
            } catch {}
            console.log('[Social Connect] Birthday stored:', connectBirthday)
          }
          // v21: Persist gender to localStorage (gender is now in profile, which updateConnection persists)
          // But also store it in a dedicated localStorage key for robustness
          if (connectGender && network === 'google') {
            try {
              const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
              if (stored.google) {
                stored.google.gender = connectGender
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
              }
            } catch {}
            console.log('[Social Connect] Gender stored:', connectGender)
          }
        }

        // Clean URL — remove connect params but keep view param
        const cleanParams = new URLSearchParams()
        const viewParam = urlParams.get('view')
        if (viewParam) cleanParams.set('view', viewParam)
        const cleanUrl = cleanParams.toString()
          ? `${window.location.pathname}?${cleanParams.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl)

        // Clean up all sessionStorage markers (keep youtube token)
        sessionStorage.removeItem('3boxes_oauth_provider')
        sessionStorage.removeItem('3boxes_oauth_name')
        sessionStorage.removeItem('3boxes_oauth_email')
        sessionStorage.removeItem('3boxes_oauth_avatar')
        sessionStorage.removeItem('3boxes_oauth_social_id')
        sessionStorage.removeItem('3boxes_oauth_gender')
        // v22.1: Clean up Instagram data from sessionStorage
        sessionStorage.removeItem('3boxes_oauth_ig_username')
        sessionStorage.removeItem('3boxes_oauth_ig_user_id')
        sessionStorage.removeItem('3boxes_oauth_ig_avatar')
        // v22.5: Clean up Facebook data from sessionStorage (stored by Instagram connect)
        sessionStorage.removeItem('3boxes_oauth_fb_name')
        sessionStorage.removeItem('3boxes_oauth_fb_id')
        sessionStorage.removeItem('3boxes_oauth_fb_email')
        sessionStorage.removeItem('3boxes_oauth_fb_avatar')
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
        return
      }

      // v20.1: Also check for YouTube token in login redirect (URL or cookie)
      const urlAuthYoutubeToken = urlParams.get('auth_youtube_token')
      const loginYoutubeToken = urlAuthYoutubeToken || cookieYoutubeToken
      if (loginYoutubeToken) {
        try { sessionStorage.setItem('3boxes_google_youtube_token', loginYoutubeToken) } catch {}
        // v20.1: Also persist to localStorage so it survives browser restarts
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          if (stored.google) {
            stored.google.youtubeToken = loginYoutubeToken
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
          }
        } catch {}
        // Also update the Google connection state with the token
        const googleConnState = connections.find(c => c.network === 'google' && c.connected)
        if (googleConnState && !googleConnState.youtubeToken) {
          updateConnection('google', { youtubeToken: loginYoutubeToken })
        }
        // Clean it from URL
        urlParams.delete('auth_youtube_token')
        const cleanUrl2 = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl2)
        console.log('[Social Connect] YouTube token stored from login flow (source:', urlAuthYoutubeToken ? 'URL' : 'cookie', ')')
      }

      // v20.6: Also check for birthday in login redirect (URL + cookie)
      const urlAuthBirthday = urlParams.get('auth_birthday')
      const cookieAuthBirthday = (() => { try { const cookies = document.cookie.split(';'); const bCookie = cookies.find(c => c.trim().startsWith('google_birthday=')); return bCookie ? decodeURIComponent(bCookie.split('=').slice(1).join('=')) : null } catch { return null } })()
      const authBirthday = urlAuthBirthday || (cookieAuthBirthday && cookieAuthBirthday !== '' ? cookieAuthBirthday : null)
      if (authBirthday) {
        try { sessionStorage.setItem('3boxes_google_birthday', authBirthday) } catch {}
        // Also persist to localStorage so it survives tab closes and page reloads
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          if (stored.google) {
            stored.google.birthday = authBirthday
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
          }
        } catch {}
        // v21: Also update Google connection state with birthday
        const googleConnForBday = connections.find(c => c.network === 'google' && c.connected)
        if (googleConnForBday && !googleConnForBday.birthday) {
          updateConnection('google', { birthday: authBirthday })
        }
        urlParams.delete('auth_birthday')
        const cleanUrl3 = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl3)
        console.log('[Social Connect] Birthday stored from login flow:', authBirthday)
      }

      // v21: Also check for gender in login redirect (URL + cookie)
      const urlAuthGender = urlParams.get('auth_gender')
      const cookieAuthGender = (() => { try { const cs = document.cookie.split(';'); const gc = cs.find(c => c.trim().startsWith('google_gender=')); const v = gc ? decodeURIComponent(gc.split('=').slice(1).join('=')) : null; return v && v !== '' ? v : null } catch { return null } })()
      const authGender = urlAuthGender || cookieAuthGender
      if (authGender) {
        try {
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
          if (stored.google) {
            stored.google.gender = authGender
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
          }
        } catch {}
        const googleConnForGender = connections.find(c => c.network === 'google' && c.connected)
        if (googleConnForGender && !googleConnForGender.profile?.gender) {
          updateConnection('google', { profile: { ...googleConnForGender.profile!, gender: authGender } })
        }
        urlParams.delete('auth_gender')
        const cleanUrl4 = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl4)
        console.log('[Social Connect] Gender stored from login flow:', authGender)
      }

      // ─── SOURCE 2: sessionStorage (set by OAuthCallbackHandler) ───
      const oauthProvider = sessionStorage.getItem('3boxes_oauth_provider')
      const oauthName = sessionStorage.getItem('3boxes_oauth_name')
      const oauthEmail = sessionStorage.getItem('3boxes_oauth_email')
      const oauthAvatar = sessionStorage.getItem('3boxes_oauth_avatar')
      // v16: Read gender from sessionStorage (stored by OAuthCallbackHandler)
      const oauthGender = sessionStorage.getItem('3boxes_oauth_gender')

      if (oauthProvider && authUser) {
        // IMPORTANT: Use oauthName (the provider's username), NOT authUser.name (the main login user)
        const profileName = oauthName || 'Unknown'
        const profileEmail = oauthEmail || ''
        // v22.9: For Instagram, also check 3boxes_oauth_ig_avatar as fallback
        const igAvatarFallback = oauthProvider === 'instagram' ? sessionStorage.getItem('3boxes_oauth_ig_avatar') : null
        const profileAvatar = oauthAvatar || igAvatarFallback || undefined
        const network = oauthProvider as SocialNetwork

        console.log('[Social Connect] ✅ OAuth callback detected via sessionStorage:', oauthProvider, profileName, '| avatar:', profileAvatar ? 'YES' : 'NONE')

        if (network === 'google' || network === 'facebook' || network === 'linkedin' || network === 'instagram') {
          // v21: For Google, also include birthday + YouTube token from cookie/sessionStorage
          // to prevent overwriting previously-persisted data with empty values
          const googleExtras: Partial<SocialConnection> = {}
          if (network === 'google') {
            // Read birthday from cookie (most reliable) or sessionStorage
            const cookieBday = (() => { try { const cs = document.cookie.split(';'); const bc = cs.find(c => c.trim().startsWith('google_birthday=')); const v = bc ? decodeURIComponent(bc.split('=').slice(1).join('=')) : null; return v && v !== '' ? v : null } catch { return null } })()
            const sessionBday = sessionStorage.getItem('3boxes_google_birthday')
            if (cookieBday || sessionBday) googleExtras.birthday = cookieBday || sessionBday || undefined
            // Read YouTube token from cookie
            const cookieYt = (() => { try { const cs = document.cookie.split(';'); const yc = cs.find(c => c.trim().startsWith('google_youtube_token=')); return yc ? decodeURIComponent(yc.split('=').slice(1).join('=')) : null } catch { return null } })()
            const sessionYt = sessionStorage.getItem('3boxes_google_youtube_token')
            if (cookieYt || sessionYt) googleExtras.youtubeToken = cookieYt || sessionYt || undefined
            // Read token expiry from cookie
            const cookieExp = (() => { try { const cs = document.cookie.split(';'); const ec = cs.find(c => c.trim().startsWith('google_token_expires=')); return ec ? parseInt(decodeURIComponent(ec.split('=').slice(1).join('')), 10) || undefined : undefined } catch { return undefined } })()
            if (cookieExp) googleExtras.youtubeTokenExpiry = cookieExp
          }
          updateConnection(network, {
            connecting: false,
            connected: true,
            profile: { name: profileName, email: profileEmail, avatar: profileAvatar, gender: oauthGender || undefined },
            ...googleExtras,
          })

          // v22.6: Store Instagram rich data when Instagram connects (SOURCE 2)
          // Do NOT auto-connect the other provider — only connect the one the user clicked
          if (network === 'instagram') {
            try {
              sessionStorage.setItem('3boxes_rich_instagram', JSON.stringify({
                username: profileName,
                igUserId: sessionStorage.getItem('3boxes_oauth_social_id') || '',
                profilePictureUrl: profileAvatar || null,
              }))
            } catch {}
          }
        }

        // Clean up all sessionStorage markers AFTER connection is established
        sessionStorage.removeItem('3boxes_oauth_provider')
        sessionStorage.removeItem('3boxes_oauth_name')
        sessionStorage.removeItem('3boxes_oauth_email')
        sessionStorage.removeItem('3boxes_oauth_avatar')
        sessionStorage.removeItem('3boxes_oauth_social_id')
        // v16: Clean up gender from sessionStorage
        sessionStorage.removeItem('3boxes_oauth_gender')
        // v22.1: Clean up Instagram data from sessionStorage
        sessionStorage.removeItem('3boxes_oauth_ig_username')
        sessionStorage.removeItem('3boxes_oauth_ig_user_id')
        sessionStorage.removeItem('3boxes_oauth_ig_avatar')
        // v22.5: Clean up Facebook data from sessionStorage (stored by Instagram connect)
        sessionStorage.removeItem('3boxes_oauth_fb_name')
        sessionStorage.removeItem('3boxes_oauth_fb_id')
        sessionStorage.removeItem('3boxes_oauth_fb_email')
        sessionStorage.removeItem('3boxes_oauth_fb_avatar')
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
        return
      }

      // ─── SOURCE 3: Per-provider markers (fallback for login flow) ───
      const linkingLinkedIn = sessionStorage.getItem('3boxes_linkedin_connect')
      const linkingGoogle = sessionStorage.getItem('3boxes_google_connect')
      const linkingFacebook = sessionStorage.getItem('3boxes_facebook_connect')

      // This fallback is for the "login" flow where authUser was just set by the OAuth login
      // In this case, authUser.name IS the provider's name
      // Also try to read avatar from sessionStorage (set by OAuthCallbackHandler)
      const storedAvatar = sessionStorage.getItem('3boxes_oauth_avatar') || undefined

      if (linkingGoogle === 'true' && authUser) {
        console.log('[Social Connect] ✅ Google callback (fallback), marking as connected:', authUser.name)
        // v21: Also read birthday + YouTube token + gender from cookie/sessionStorage/localStorage
        // to prevent losing previously-persisted data
        const savedGoogle = (() => { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return d.google || {} } catch { return {} } })()
        const bdayCookie = (() => { try { const cs = document.cookie.split(';'); const bc = cs.find(c => c.trim().startsWith('google_birthday=')); const v = bc ? decodeURIComponent(bc.split('=').slice(1).join('=')) : null; return v && v !== '' ? v : null } catch { return null } })()
        const bdaySession = sessionStorage.getItem('3boxes_google_birthday')
        const bdayLocal = savedGoogle.birthday
        const ytCookie = (() => { try { const cs = document.cookie.split(';'); const yc = cs.find(c => c.trim().startsWith('google_youtube_token=')); return yc ? decodeURIComponent(yc.split('=').slice(1).join('=')) : null } catch { return null } })()
        const ytSession = sessionStorage.getItem('3boxes_google_youtube_token')
        const ytLocal = savedGoogle.youtubeToken
        const expCookie = (() => { try { const cs = document.cookie.split(';'); const ec = cs.find(c => c.trim().startsWith('google_token_expires=')); return ec ? parseInt(decodeURIComponent(ec.split('=').slice(1).join('')), 10) || undefined : undefined } catch { return undefined } })()
        const expLocal = savedGoogle.youtubeTokenExpiry
        const genderCookie = (() => { try { const cs = document.cookie.split(';'); const gc = cs.find(c => c.trim().startsWith('google_gender=')); return gc ? decodeURIComponent(gc.split('=').slice(1).join('=')) : null } catch { return null } })()
        const genderLocal = savedGoogle.gender
        updateConnection('google', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email, avatar: storedAvatar, gender: genderCookie || genderLocal || undefined },
          birthday: bdayCookie || bdaySession || bdayLocal || undefined,
          youtubeToken: ytCookie || ytSession || ytLocal || undefined,
          youtubeTokenExpiry: expCookie || expLocal || undefined,
        })
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
      } else if (linkingFacebook === 'true' && authUser) {
        console.log('[Social Connect] ✅ Facebook callback (fallback), marking as connected:', authUser.name)
        updateConnection('facebook', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email, avatar: storedAvatar },
        })
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
      } else if (linkingLinkedIn === 'true' && authUser) {
        console.log('[Social Connect] ✅ LinkedIn callback (fallback), marking as connected:', authUser.name)
        updateConnection('linkedin', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email, avatar: storedAvatar },
        })
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
      }

      // v22: Also detect Instagram connect markers (redirects through Facebook OAuth)
      const linkingInstagram = sessionStorage.getItem('3boxes_instagram_connect')
      if (linkingInstagram === 'true' && authUser) {
        // Instagram connect goes through Facebook OAuth, so Facebook will also be connected
        // The Instagram data comes from the Facebook callback params (handled above)
        // This is just a fallback for when the URL params have already been cleaned
        console.log('[Social Connect] v22: Instagram connect marker found')
        sessionStorage.removeItem('3boxes_instagram_connect')
        sessionStorage.removeItem('3boxes_instagram_connect_time')
      }

      // If we have markers but no authUser yet, wait for next render
      // But if we've been waiting too long (>30 seconds), clean up and stop connecting
      const now = Date.now()
      const connectTime = parseInt(sessionStorage.getItem('3boxes_google_connect_time') || '0')
      const connectTimeFB = parseInt(sessionStorage.getItem('3boxes_facebook_connect_time') || '0')
      const connectTimeLI = parseInt(sessionStorage.getItem('3boxes_linkedin_connect_time') || '0')
      const connectTimeIG = parseInt(sessionStorage.getItem('3boxes_instagram_connect_time') || '0')

      if (linkingGoogle === 'true' && !authUser && now - connectTime > 30000) {
        console.log('[Social Connect] Google connect timeout — marking as not connecting')
        updateConnection('google', { connecting: false })
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
      } else if (linkingFacebook === 'true' && !authUser && now - connectTimeFB > 30000) {
        console.log('[Social Connect] Facebook connect timeout — marking as not connecting')
        updateConnection('facebook', { connecting: false })
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
      } else if (linkingLinkedIn === 'true' && !authUser && now - connectTimeLI > 30000) {
        console.log('[Social Connect] LinkedIn connect timeout — marking as not connecting')
        updateConnection('linkedin', { connecting: false })
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
      } else if (linkingInstagram === 'true' && !authUser && now - connectTimeIG > 30000) {
        console.log('[Social Connect] v22: Instagram connect timeout — marking as not connecting')
        updateConnection('instagram', { connecting: false })
        sessionStorage.removeItem('3boxes_instagram_connect')
        sessionStorage.removeItem('3boxes_instagram_connect_time')
      }
    } catch {}
  }, [authUser, updateConnection])

  // ─── Connect Flow ─────────────────────────────────────────────────────────

  const handleConnectClick = useCallback((networkConfig: SocialNetworkConfig) => {
    if (!authUser) {
      setAuthView('login')
      return
    }

    // v22.6: ALL networks show consent dialog first before redirecting to OAuth
    // This gives users a clear understanding of what data will be accessed
    setConsentDialogNetwork(networkConfig)
    setConsentDialogOpen(true)
  }, [authUser, setAuthView])

  const handleConsentAccept = useCallback(() => {
    if (!consentDialogNetwork) return
    const network = consentDialogNetwork.network

    setConsentDialogOpen(false)

    // v22.6: Redirect to real OAuth for networks that support it
    if (network === 'google') {
      handleGoogleConnect()
      return
    }
    if (network === 'facebook') {
      handleFacebookConnect()
      return
    }
    if (network === 'linkedin') {
      handleLinkedInConnect()
      return
    }
    if (network === 'instagram') {
      handleInstagramConnect()
      return
    }

    // Fallback: simulate connection for non-OAuth networks (2 second delay)
    updateConnection(network, { connecting: true })
    setTimeout(() => {
      updateConnection(network, { connecting: false, connected: true })
    }, 2000)
  }, [consentDialogNetwork, updateConnection, handleGoogleConnect, handleFacebookConnect, handleLinkedInConnect, handleInstagramConnect])

  const handleDisconnect = useCallback(
    (network: SocialNetwork) => {
      // Clear failed avatar state so it resets if they reconnect
      setFailedAvatars((prev) => {
        const next = new Set(prev)
        next.delete(network)
        return next
      })
      // If Facebook, also logout from FB SDK
      if (network === 'facebook' && window.FB) {
        try {
          window.FB.getLoginStatus((response: any) => {
            if (response.status === 'connected') {
              window.FB!.logout(() => {})
            }
          })
        } catch {
          // Ignore
        }
      }
      updateConnection(network, { connected: false, profile: undefined, likes: undefined })
      if (connectedNetworks.length <= 1) {
        setAnalysis(null)
        setProducts([])
      }
    },
    [updateConnection, connectedNetworks.length]
  )

  // ─── Analyze Style ───────────────────────────────────────────────────────

  const handleAnalyzeStyle = useCallback(async () => {
    if (!hasAnyConnection) return

    setAnalyzing(true)
    setAnalysisError(null)

    // Build social data payload with ALL connected provider profiles + rich data
    const socialPayload: any = {
      networks: connectedNetworks.map((c) => c.network),
    }

    // Helper: read rich data from cookie (set by OAuth callbacks)
    const getRichData = (provider: string): any => {
      try {
        const cookies = document.cookie.split(';')
        const richCookie = cookies.find(c => c.trim().startsWith('connect_rich_data='))
        if (richCookie) {
          const raw = decodeURIComponent(richCookie.split('=').slice(1).join('='))
          const data = JSON.parse(raw)
          // Check if this rich data is for the right provider (by matching name)
          const conn = connections.find((c) => c.network === provider && c.connected)
          if (conn?.profile?.name === data.name) return data
        }
      } catch {}
      // Also try sessionStorage fallback
      try {
        const stored = sessionStorage.getItem(`3boxes_rich_${provider}`)
        if (stored) return JSON.parse(stored)
      } catch {}
      return null
    }

    // Include Google profile data + rich data (YouTube, locale, corporate domain)
    const googleConn = connections.find((c) => c.network === 'google' && c.connected)
    if (googleConn?.profile) {
      const googleRich = getRichData('google')
      socialPayload.googleData = {
        profile: googleConn.profile,
        ...(googleRich?.youtubeCategories && { youtubeCategories: googleRich.youtubeCategories }),
        ...(googleRich?.locale && { locale: googleRich.locale }),
        ...(googleRich?.hd && { corporateDomain: googleRich.hd }),
        ...(googleRich?.inferredSignals && { inferredSignals: googleRich.inferredSignals }),
        // v16: Pass gender from Google People API to the social-style route
        ...(googleConn.profile.gender && { gender: googleConn.profile.gender }),
      }
      // v20.6: Pass birthday from Google People API to the social-style route
      // Read from multiple sources (like YouTube token) for robustness:
      //   1. Cookie (set by callback route — MOST RELIABLE, survives reloads)
      //   2. sessionStorage (set during OAuth callback)
      //   3. localStorage (persisted across tabs/reloads)
      //   4. googleConn.birthday (from component state)
      const googleBirthdayFromCookie = typeof window !== 'undefined' ? (() => { try { const cookies = document.cookie.split(';'); const bCookie = cookies.find(c => c.trim().startsWith('google_birthday=')); const val = bCookie ? decodeURIComponent(bCookie.split('=').slice(1).join('=')) : null; return val && val !== '' ? val : null } catch { return null } })() : null
      const googleBirthdayFromSession = typeof window !== 'undefined' ? sessionStorage.getItem('3boxes_google_birthday') : null
      const googleBirthdayFromLocal = typeof window !== 'undefined' ? (() => { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return d.google?.birthday || null } catch { return null } })() : null
      const googleBirthdayFromState = googleConn?.birthday
      const googleBirthday = googleBirthdayFromCookie || googleBirthdayFromSession || googleBirthdayFromLocal || googleBirthdayFromState
      console.log('[Social Style v20.6] Birthday debug:', {
        fromCookie: !!googleBirthdayFromCookie,
        fromSession: !!googleBirthdayFromSession,
        fromLocal: !!googleBirthdayFromLocal,
        fromState: !!googleBirthdayFromState,
        hasBirthday: !!googleBirthday,
      })
      if (googleBirthday) {
        socialPayload.googleData.birthday = googleBirthday
      }
    }

    // v20.5: Pass Google/YouTube access token for fetching subscriptions
    // AUTO-REFRESH: Check if token is expired, and if so, refresh it before calling API
    // Token sources (in priority order):
    //   1. Cookie (set by callback route — MOST RELIABLE)
    //   2. googleConn.youtubeToken (from state)
    //   3. sessionStorage (from OAuth callback redirect)
    //   4. localStorage (fallback read)
    const youtubeTokenFromCookie = typeof window !== 'undefined' ? (() => { try { const cookies = document.cookie.split(';'); const ytCookie = cookies.find(c => c.trim().startsWith('google_youtube_token=')); return ytCookie ? decodeURIComponent(ytCookie.split('=').slice(1).join('=')) : null } catch { return null } })() : null
    const youtubeTokenFromState = googleConn?.youtubeToken
    const youtubeTokenFromSession = typeof window !== 'undefined' ? sessionStorage.getItem('3boxes_google_youtube_token') : null
    const youtubeTokenFromLocal = typeof window !== 'undefined' ? (() => { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return d.google?.youtubeToken || null } catch { return null } })() : null
    let youtubeToken = youtubeTokenFromCookie || youtubeTokenFromState || youtubeTokenFromSession || youtubeTokenFromLocal

    // v20.5: Check token expiry from cookie or state
    const tokenExpiryFromCookie = typeof window !== 'undefined' ? (() => { try { const cookies = document.cookie.split(';'); const expCookie = cookies.find(c => c.trim().startsWith('google_token_expires=')); return expCookie ? parseInt(decodeURIComponent(expCookie.split('=').slice(1).join('')), 10) || null : null } catch { return null } })() : null
    const tokenExpiryFromState = googleConn?.youtubeTokenExpiry
    const tokenExpiryFromLocal = typeof window !== 'undefined' ? (() => { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return d.google?.youtubeTokenExpiry || null } catch { return null } })() : null
    const tokenExpiry = tokenExpiryFromCookie || tokenExpiryFromState || tokenExpiryFromLocal

    // v20.5: If token is expired (or expires in <5 minutes), try to refresh it
    const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000 // 5 minutes before actual expiry
    const isTokenExpired = tokenExpiry ? Date.now() > (tokenExpiry - TOKEN_REFRESH_BUFFER) : !youtubeToken // if no expiry and no token, assume expired

    if (youtubeToken && isTokenExpired && googleConn?.connected) {
      console.log('[Social Style v20.5] YouTube token is expired or expiring soon — attempting refresh...')
      try {
        const refreshResponse = await fetch('/api/auth/google/refresh')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          if (refreshData.success && refreshData.accessToken) {
            youtubeToken = refreshData.accessToken
            // Update the connection state with new token + expiry
            updateConnection('google', {
              youtubeToken: refreshData.accessToken,
              youtubeTokenExpiry: refreshData.expiresAt,
            })
            // Also update sessionStorage
            try { sessionStorage.setItem('3boxes_google_youtube_token', refreshData.accessToken) } catch {}
            console.log('[Social Style v20.5] ✅ YouTube token refreshed successfully')
          } else {
            console.warn('[Social Style v20.5] Refresh response missing token:', refreshData.error)
            // If needsReconnect, clear the stale token
            if (refreshData.needsReconnect) {
              youtubeToken = null
              updateConnection('google', { youtubeToken: undefined, youtubeTokenExpiry: undefined })
              console.warn('[Social Style v20.5] Refresh token invalid — user needs to reconnect Google')
            }
          }
        } else {
          console.warn('[Social Style v20.5] Token refresh failed with status:', refreshResponse.status)
          // Try using the stale token anyway — it might still work for a few minutes
        }
      } catch (refreshError) {
        console.warn('[Social Style v20.5] Token refresh request failed:', refreshError)
        // Continue with stale token — API will handle 401 gracefully
      }
    }

    console.log('[Social Style v20.5] YouTube token debug:', {
      fromCookie: !!youtubeTokenFromCookie,
      fromState: !!youtubeTokenFromState,
      fromSession: !!youtubeTokenFromSession,
      fromLocal: !!youtubeTokenFromLocal,
      googleConnected: !!googleConn?.connected,
      hasToken: !!youtubeToken,
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toISOString() : 'unknown',
      isTokenExpired,
    })

    if (youtubeToken && googleConn?.connected) {
      socialPayload.googleAccessToken = youtubeToken
      console.log('[Social Style v20.5] Passing YouTube access token to API')
    } else {
      console.warn('[Social Style v20.5] No YouTube token available - recommendations will not use YouTube data')
      if (!youtubeToken) console.warn('  Reason: No token found (or token expired and refresh failed)')
      if (!googleConn?.connected) console.warn('  Reason: Google is not connected')
    }

    // Include Facebook profile data + rich data (likes, age_range, interests, gender)
    const fbConnection = connections.find((c) => c.network === 'facebook' && c.connected)
    if (fbConnection?.profile) {
      const fbRich = getRichData('facebook')
      socialPayload.facebookData = {
        profile: fbConnection.profile,
        likes: fbRich?.likes || fbConnection.likes || [],
        ...(fbRich?.ageRange && { ageRange: fbRich.ageRange }),
        ...(fbRich?.inferredSignals && { inferredSignals: fbRich.inferredSignals }),
        // v15: Pass gender from Facebook OAuth to the social-style route
        ...(fbConnection.profile.gender && { gender: fbConnection.profile.gender }),
      }
    }

    // Include LinkedIn profile data + rich data (locale, inferred industry)
    const liConnection = connections.find((c) => c.network === 'linkedin' && c.connected)
    if (liConnection?.profile) {
      const liRich = getRichData('linkedin')
      socialPayload.linkedinData = {
        profile: liConnection.profile,
        ...(liRich?.locale && { locale: liRich.locale }),
        ...(liRich?.inferredSignals && { inferredSignals: liRich.inferredSignals }),
        // v16: Pass gender from LinkedIn name inference to the social-style route
        ...(liConnection.profile.gender && { gender: liConnection.profile.gender }),
      }
    }

    // Include Instagram data if available
    // v22: Now uses real Instagram Graph API data (profile, media, hashtags)
    const igConnection = connections.find((c) => c.network === 'instagram' && c.connected)
    if (igConnection?.profile) {
      // Read rich Instagram data from sessionStorage or cookie
      const igRich = getRichData('instagram')
      // Also try to read Instagram data from the Facebook extended data (stored in rich cookie)
      const fbRich = getRichData('facebook')

      socialPayload.instagramData = {
        username: igConnection.profile.name,
        // v22: Add rich Instagram data from Graph API
        ...(igRich?.igUserId && { igUserId: igRich.igUserId }),
        ...(igRich?.biography && { biography: igRich.biography }),
        ...(igRich?.followersCount && { followersCount: igRich.followersCount }),
        ...(igRich?.followsCount && { followsCount: igRich.followsCount }),
        ...(igRich?.mediaCount && { mediaCount: igRich.mediaCount }),
        ...(igRich?.recentHashtags && { recentHashtags: igRich.recentHashtags }),
        ...(igRich?.recentMedia && { recentMedia: igRich.recentMedia }),
        // Also check Facebook rich data for Instagram info (since IG data comes through FB OAuth)
        ...(fbRich?.instagram && { ...fbRich.instagram }),
      }
    }

    try {
      // ─── Discover proxy URL (same pattern as try-on) ───
      // This is needed so the server-side route can reach the AI API
      // through the sandbox proxy, which the browser already knows about.
      let proxyUrl = '';
      try {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          proxyUrl = configData.aiProxyUrl || '';
        }
      } catch {}
      if (!proxyUrl) {
        proxyUrl = process.env.NEXT_PUBLIC_AI_PROXY_URL || '';
      }

      // Pass the proxy URL in the request body so the server-side route can use it
      socialPayload.proxyUrl = proxyUrl;

      const response = await fetch('/api/social-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socialPayload),
      })

      if (!response.ok) {
        throw new Error('Analysis request failed')
      }

      const data = await response.json()
      // API returns { analysis: { styleProfile, colorPreferences, recommendedCategories }, products }
      const aiAnalysis = data.analysis || data
      // Map API response (which uses "match" field) to component format (which uses "score")
      const mappedAnalysis: StyleAnalysis = {
        styleProfile: {
          tags: aiAnalysis.styleProfile?.tags || FALLBACK_ANALYSIS.styleProfile.tags,
          confidence: aiAnalysis.styleProfile?.confidence
            ? Math.round(aiAnalysis.styleProfile.confidence * 100)
            : FALLBACK_ANALYSIS.styleProfile.confidence,
          description: aiAnalysis.styleProfile?.description || FALLBACK_ANALYSIS.styleProfile.description,
        },
        colorPreferences: aiAnalysis.colorPreferences?.map((c: any) => ({
          name: c.name,
          hex: c.hex,
          affinity: Math.round((c.affinity || 0.5) * 100),
        })) || FALLBACK_ANALYSIS.colorPreferences,
        recommendedCategories: aiAnalysis.recommendedCategories?.map((c: any) => ({
          name: c.name,
          score: c.match || c.score || 50,
          reason: c.reason,
        })) || FALLBACK_ANALYSIS.recommendedCategories,
      }
      setAnalysis(mappedAnalysis)
      // Use AI-recommended products if available, otherwise fallback
      setProducts(data.products?.length > 0 ? data.products : FALLBACK_PRODUCTS)
    } catch {
      setAnalysis(FALLBACK_ANALYSIS)
      setProducts(FALLBACK_PRODUCTS)
    } finally {
      setAnalyzing(false)
    }
  }, [hasAnyConnection, connectedNetworks, connections])

  // ─── Privacy Toggle ──────────────────────────────────────────────────────

  const togglePrivacy = useCallback((key: keyof PrivacySettings) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ─── Format Price ────────────────────────────────────────────────────────

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <section className="w-full bg-stone-950 text-amber-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button — returns to the Social tab on the home page */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            onClick={() => {
              trackBug('CLICK', '[Social Style Integration] Back button pressed — navigating to #social-connections-section')
              // Switch back to the home view
              setView('home')
              // After the home view renders, scroll to the Social Connections section
              // (the Social tab) so the user lands back where they came from.
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  const el = document.getElementById('social-connections-section')
                  if (el) {
                    // ✅ FIX: use scrollIntoView() — old code used headerEl.getBoundingClientRect().bottom
                    // which returns a HUGE NEGATIVE number when scrolled past header.
                    trackBug('SCROLL', 'Calling el.scrollIntoView({ behavior: "smooth", block: "start" })', {
                      targetId: 'social-connections-section',
                      targetRectTop: el.getBoundingClientRect().top,
                      currentPageYOffset: window.pageYOffset,
                    })
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  } else {
                    // Fallback: if section not yet rendered, retry a few times
                    let attempts = 0
                    const tryScroll = () => {
                      attempts++
                      const e2 = document.getElementById('social-connections-section')
                      trackBug('STATE', `retry attempt ${attempts}/20 — #social-connections-section found: ${!!e2}`)
                      if (e2) {
                        trackBug('SCROLL', 'Calling e2.scrollIntoView({ behavior: "smooth", block: "start" })', {
                          targetRectTop: e2.getBoundingClientRect().top,
                          currentPageYOffset: window.pageYOffset,
                        })
                        e2.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      } else if (attempts < 20) {
                        setTimeout(tryScroll, 100)
                      } else {
                        trackBug('ERROR', '#social-connections-section NOT found after 20 attempts')
                      }
                    }
                    setTimeout(tryScroll, 100)
                  }
                }, 200)
              }
            }}
            variant="outline"
            className="gap-2 border-amber-900/40 bg-stone-900/60 text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-100 hover:border-amber-700/50"
          >
            <ArrowLeft className="size-4" />
            {t('socialIntegration.backToSocialTab')}
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-900/30 bg-amber-900/10 px-4 py-1.5 text-sm text-amber-200/80">
            <Wand2 className="size-4" />
            {t('social.aiPowered')}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('social.title1')}{' '}
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              {t('social.title2')}
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-amber-200/60">
            {t('social.connectNetworks')}
            {t('social.discoverDesc')}
          </p>
        </motion.div>

        {/* Social Network Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {SOCIAL_NETWORKS.map((networkConfig) => {
            const connection = connections.find((c) => c.network === networkConfig.network)
            const isConnected = connection?.connected ?? false
            const isConnecting = connection?.connecting ?? false

            return (
              <motion.div key={networkConfig.network} variants={itemVariants} className="h-full">
                <motion.div
                  variants={cardHover}
                  initial="rest"
                  whileHover="hover"
                  className="h-full"
                >
                  <Card
                    className={`h-full flex flex-col border transition-colors ${
                      isConnected
                        ? `${networkConfig.borderColor} bg-stone-900/80`
                        : 'border-amber-900/30 bg-stone-900/80 hover:border-amber-900/50'
                    }`}
                  >
                    <CardHeader className="pb-3 relative">
                      {/* v22.9: Checkmark absolutely positioned in top-right so it's always aligned across all cards */}
                      {isConnected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="absolute top-3 right-3 shrink-0"
                        >
                          <CheckCircle2 className="size-5 text-emerald-400" />
                        </motion.div>
                      )}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-8">
                        {isConnected && connection?.profile?.avatar && !failedAvatars.has(networkConfig.network) ? (
                          <img
                            src={connection.profile.avatar}
                            alt={connection.profile.name}
                            className="size-10 rounded-lg object-cover border border-white/10 shrink-0"
                            onError={() => {
                              setFailedAvatars((prev) => new Set(prev).add(networkConfig.network))
                            }}
                          />
                        ) : (
                          <div
                            className={`flex size-10 items-center justify-center rounded-lg ${networkConfig.bgColor} ${networkConfig.color} shrink-0`}
                          >
                            {networkConfig.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-amber-100">
                              {networkConfig.label}
                            </CardTitle>
                            {isConnected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                <span className="size-1.5 rounded-full bg-emerald-400" />
                                {t('socialIntegration.connected')}
                              </span>
                            )}
                          </div>
                          <CardDescription className="text-amber-200/50 truncate">
                            {isConnected
                              ? (connection?.profile?.name || t('socialIntegration.connected'))
                              : t('socialIntegration.notConnected')}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {/* Data items preview */}
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {networkConfig.dataItems.map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className="border-amber-900/30 text-amber-200/50"
                          >
                            {t(`socialIntegration.dataItem.${item.toLowerCase().replace(/[^a-z]/g, '')}`)}
                          </Badge>
                        ))}
                        {networkConfig.realConnect && (
                          <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-600/30 text-xs">
                            {t('socialIntegration.live')}
                          </Badge>
                        )}
                      </div>

                      {/* Likes count for connected Facebook */}
                      {isConnected && networkConfig.network === 'facebook' && connection?.likes && connection.likes.length > 0 && (
                        <p className="mb-3 text-xs text-amber-200/50">
                          {connection.likes.length} {t('socialIntegration.likedPagesAnalyzed')}
                        </p>
                      )}

                      {/* Connect / Disconnect Button */}
                      <div className="mt-auto pt-2">
                      {isConnecting ? (
                        <Button
                          disabled
                          className="w-full bg-stone-800 text-amber-200/60"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          {networkConfig.realConnect ? `${t('socialIntegration.opening')} ${networkConfig.label}...` : t('socialIntegration.connecting')}
                        </Button>
                      ) : isConnected ? (
                        <Button
                          onClick={() => handleDisconnect(networkConfig.network)}
                          variant="outline"
                          className="w-full border-amber-900/40 text-amber-200/60 hover:bg-red-900/20 hover:text-red-300 hover:border-red-900/40"
                        >
                          <Unplug className="size-4" />
                          {t('socialIntegration.disconnect')}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnectClick(networkConfig)}
                          className={`w-full ${networkConfig.color} ${networkConfig.bgColor} border ${networkConfig.borderColor} hover:opacity-80`}
                          style={{ background: undefined }}
                          variant="outline"
                        >
                          {networkConfig.realConnect && <ExternalLink className="size-4" />}
                          {t('socialIntegration.connect')} {networkConfig.label}
                          {!networkConfig.realConnect && (
                            <Badge variant="outline" className="ml-2 border-amber-900/30 text-amber-200/40 text-[10px] px-1">
                              {t('socialIntegration.simulated')}
                            </Badge>
                          )}
                        </Button>
                      )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Connection Status & Analyze Button */}
        <AnimatePresence mode="wait">
          {hasAnyConnection && !analysis && (
            <motion.div
              key="analyze-section"
              ref={analyzeSectionRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <Card className="border-amber-900/30 bg-stone-900/80">
                <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center gap-2 text-amber-100">
                      <Sparkles className="size-5 text-amber-400" />
                      <span className="text-lg font-semibold">
                        {allConnected
                          ? t('socialIntegration.allNetworksConnected')
                          : t('socialIntegration.networksConnected', { count: connectedNetworks.length })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-amber-200/50">
                      {allConnected
                        ? t('socialIntegration.readyForAnalysis')
                        : t('socialIntegration.connectMore')}
                    </p>
                  </div>
                  <Button
                    onClick={handleAnalyzeStyle}
                    disabled={analyzing}
                    className="bg-amber-600 text-stone-950 hover:bg-amber-500 min-w-[200px]"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t('socialIntegration.analyzingStyle')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        {t('socialIntegration.analyzeMyStyle')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyzing Progress */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8"
            >
              <Card className="border-amber-900/30 bg-stone-900/80">
                <CardContent className="flex flex-col items-center gap-4 py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="size-10 text-amber-400" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-100">
                      {t('socialIntegration.analyzingDNA')}
                    </p>
                    <p className="mt-1 text-sm text-amber-200/50">
                      {t('socialIntegration.processingData')} {connectedNetworks.map((c) => c.network).join(', ')}
                    </p>
                  </div>
                  <Progress value={66} className="h-2 w-64 bg-amber-900/20 [&>div]:bg-amber-500" />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && !analyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Style Profile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="mb-6"
              >
                <Card className="border-amber-900/30 bg-stone-900/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Tag className="size-5 text-amber-400" />
                      <CardTitle className="text-amber-100">{t('socialIntegration.yourStyleProfile')}</CardTitle>
                    </div>
                    <CardDescription className="text-amber-200/50">
                      {t('socialIntegration.poweredByAI')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-amber-600/20">
                        <TrendingUp className="size-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-200/70">
                            {t('socialIntegration.analysisConfidence')}
                          </span>
                          <span className="text-lg font-bold text-amber-400">
                            {analysis.styleProfile.confidence}%
                          </span>
                        </div>
                        <Progress
                          value={analysis.styleProfile.confidence}
                          className="mt-1.5 h-2 bg-amber-900/20 [&>div]:bg-amber-500"
                        />
                      </div>
                    </div>

                    <div className="mb-5 flex flex-wrap gap-2">
                      {analysis.styleProfile.tags.map((tag, i) => (
                        <motion.div
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
                        >
                          <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 text-sm px-3 py-1">
                            {tag}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>

                    <p className="text-sm leading-relaxed text-amber-200/70">
                      {analysis.styleProfile.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Color Preferences & Recommended Categories */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2 lg:grid-rows-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="min-h-0"
                >
                  <Card className="h-full flex flex-col overflow-hidden border-amber-900/30 bg-stone-900/80">
                    <CardHeader className="shrink-0">
                      <div className="flex items-center gap-2">
                        <Palette className="size-5 text-amber-400" />
                        <CardTitle className="text-amber-100">{t('social.colorPrefs')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto">
                      <div className="space-y-3">
                        {analysis.colorPreferences.map((color, i) => (
                          <motion.div
                            key={color.name}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                            className="flex items-center gap-3"
                          >
                            <div
                              className="size-8 shrink-0 rounded-md border border-white/10 shadow-inner"
                              style={{ backgroundColor: color.hex }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-amber-100 truncate">
                                  {color.name}
                                </span>
                                <span className="text-xs text-amber-200/50 ml-2">
                                  {color.affinity}%
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-amber-900/20">
                                <motion.div
                                  className="h-full rounded-full bg-amber-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${color.affinity}%` }}
                                  transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="min-h-0"
                >
                  <Card className="h-full flex flex-col overflow-hidden border-amber-900/30 bg-stone-900/80">
                    <CardHeader className="shrink-0">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="size-5 text-amber-400" />
                        <CardTitle className="text-amber-100">Recommended Categories</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="space-y-3 pr-3">
                          {analysis.recommendedCategories.map((cat, i) => (
                            <motion.div
                              key={cat.name}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                              className="rounded-lg border border-amber-900/20 bg-stone-800/50 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-amber-100 truncate">
                                  {cat.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-amber-600/30 text-amber-400 shrink-0"
                                >
                                  {cat.score}% match
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-amber-200/50">{cat.reason}</p>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Personalized Product Recommendations */}
              {products.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="mb-8"
                >
                  <Card className="border-amber-900/30 bg-stone-900/80">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-5 text-amber-400" />
                          <CardTitle className="text-amber-100">
                            Curated For You
                          </CardTitle>
                        </div>
                        <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">
                          {products.length} picks
                        </Badge>
                      </div>
                      <CardDescription className="text-amber-200/50">
                        Personalized recommendations based on your style DNA
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((product, i) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.07, duration: 0.35 }}
                            className="group rounded-lg border border-amber-900/20 bg-stone-800/50 p-3 transition-colors hover:border-amber-900/40 hover:bg-stone-800/80"
                          >
                            <div className="mb-3 aspect-square overflow-hidden rounded-md bg-stone-800">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="size-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src =
                                    '/images/placeholder.jpg'
                                }}
                              />
                            </div>
                            <div className="mb-2 flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className="border-amber-600/30 text-amber-400 text-xs"
                              >
                                {product.matchScore}% match
                              </Badge>
                              <span className="text-sm font-bold text-amber-100">
                                {formatPrice(product.price)}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-amber-100 mb-1 line-clamp-1">
                              {product.name}
                            </h4>
                            <p className="text-xs text-amber-200/50 line-clamp-2">
                              {product.reason}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Privacy Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <Card className="border-amber-900/30 bg-stone-900/80">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="size-5 text-amber-400" />
                      <CardTitle className="text-amber-100">{t('socialIntegration.privacyControls')}</CardTitle>
                    </div>
                    <CardDescription className="text-amber-200/50">
                      {t('socialIntegration.privacyDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { key: 'shareStyleProfile' as const, label: t('socialIntegration.shareStyleProfile'), desc: t('socialIntegration.shareStyleProfileDesc') },
                        { key: 'shareColorPreferences' as const, label: t('socialIntegration.shareColorPreferences'), desc: t('socialIntegration.shareColorPreferencesDesc') },
                        { key: 'sharePurchaseHistory' as const, label: t('socialIntegration.sharePurchaseHistory'), desc: t('socialIntegration.sharePurchaseHistoryDesc') },
                        { key: 'allowPersonalizedAds' as const, label: t('socialIntegration.personalizedSuggestions'), desc: t('socialIntegration.personalizedSuggestionsDesc') },
                      ].map((item, i) => (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-100">{item.label}</p>
                            <p className="text-xs text-amber-200/50">{item.desc}</p>
                          </div>
                          <Switch
                            checked={privacySettings[item.key]}
                            onCheckedChange={() => togglePrivacy(item.key)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Re-analyze button */}
              <div className="mt-6 text-center">
                <Button
                  onClick={() => {
                    setAnalysis(null)
                    setProducts([])
                    // Scroll back to the "Analyze My Style" button area
                    setTimeout(() => {
                      analyzeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 100)
                  }}
                  variant="outline"
                  className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-100"
                >
                  <Wand2 className="size-4" />
                  {t('socialIntegration.reAnalyze')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consent Dialog for Simulated Networks */}
        <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
          <DialogContent className="bg-stone-900 border-amber-900/30 text-amber-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {consentDialogNetwork?.icon}
                {t('socialIntegration.connect')} {consentDialogNetwork?.label}
              </DialogTitle>
              <DialogDescription className="text-amber-200/60">
                {t('socialIntegration.consentDesc', { platform: consentDialogNetwork?.label })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              {consentDialogNetwork?.dataDescription.map((desc) => (
                <div key={desc} className="flex items-start gap-2 text-sm">
                  <Eye className="size-4 mt-0.5 text-amber-400 shrink-0" />
                  <span className="text-amber-200/70">{t(desc)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-900/20 bg-stone-800/50 p-3">
              <div className="flex items-start gap-2 text-xs">
                <Lock className="size-3.5 mt-0.5 text-amber-400 shrink-0" />
                <span className="text-amber-200/50">
                  {t('socialIntegration.consentNote')}
                  {!consentDialogNetwork?.realConnect && ` (${t('socialIntegration.simulatedNote')})`}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConsentDialogOpen(false)}
                className="border-amber-900/40 text-amber-200/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConsentAccept}
                className="bg-amber-600 text-stone-950 hover:bg-amber-500"
              >
                {t('socialIntegration.allowConnect')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
