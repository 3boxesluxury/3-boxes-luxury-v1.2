'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore } from '@/lib/store'
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
  }
  likes?: { name: string; category: string }[]
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
    icon: <Facebook className="size-5" />,
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
    icon: <Linkedin className="size-5" />,
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
    icon: <Instagram className="size-5" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    dataDescription: [
      'Your public posts & captions',
      'Accounts you follow (fashion & lifestyle)',
      'Hashtags you frequently use',
      'Saved collections & reels interactions',
    ],
    dataItems: ['Posts', 'Follows', 'Hashtags', 'Collections'],
    realConnect: false,
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
function loadPersistedConnections(): Record<string, { name: string; email?: string; avatar?: string }> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Helper: save connections to localStorage
function persistConnections(data: Record<string, { name: string; email?: string; avatar?: string }>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function SocialStyleIntegration() {
  const { authUser, setAuthView } = useStore()

  // Connection states — initialized from localStorage if available
  const [connections, setConnections] = useState<SocialConnection[]>(() => {
    const persisted = loadPersistedConnections()
    return [
      { network: 'google', connected: !!persisted.google, connecting: false, profile: persisted.google ? { name: persisted.google.name, email: persisted.google.email, avatar: persisted.google.avatar } : undefined },
      { network: 'facebook', connected: !!persisted.facebook, connecting: false, profile: persisted.facebook ? { name: persisted.facebook.name, email: persisted.facebook.email, avatar: persisted.facebook.avatar } : undefined },
      { network: 'linkedin', connected: !!persisted.linkedin, connecting: false, profile: persisted.linkedin ? { name: persisted.linkedin.name, email: persisted.linkedin.email, avatar: persisted.linkedin.avatar } : undefined },
      { network: 'instagram', connected: !!persisted.instagram, connecting: false, profile: persisted.instagram ? { name: persisted.instagram.name, email: persisted.instagram.email } : undefined },
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
        // Persist to localStorage whenever connections change
        const persisted: Record<string, { name: string; email?: string; avatar?: string }> = {}
        for (const c of next) {
          if (c.connected && c.profile) {
            persisted[c.network] = { name: c.profile.name, email: c.profile.email, avatar: c.profile.avatar }
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

      if (urlConnectProvider && urlConnectName && authUser) {
        const network = urlConnectProvider as SocialNetwork
        console.log('[Social Connect] ✅ Connect detected via URL params:', urlConnectProvider, urlConnectName)

        if (network === 'google' || network === 'facebook' || network === 'linkedin') {
          updateConnection(network, {
            connecting: false,
            connected: true,
            profile: {
              name: urlConnectName,
              email: urlConnectEmail || undefined,
              avatar: urlConnectAvatar || undefined,
            },
          })
        }

        // Clean URL — remove connect params but keep view param
        const cleanParams = new URLSearchParams()
        const viewParam = urlParams.get('view')
        if (viewParam) cleanParams.set('view', viewParam)
        const cleanUrl = cleanParams.toString()
          ? `${window.location.pathname}?${cleanParams.toString()}`
          : window.location.pathname
        window.history.replaceState({}, '', cleanUrl)

        // Clean up all sessionStorage markers
        sessionStorage.removeItem('3boxes_oauth_provider')
        sessionStorage.removeItem('3boxes_oauth_name')
        sessionStorage.removeItem('3boxes_oauth_email')
        sessionStorage.removeItem('3boxes_oauth_avatar')
        sessionStorage.removeItem('3boxes_oauth_social_id')
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
        return
      }

      // ─── SOURCE 2: sessionStorage (set by OAuthCallbackHandler) ───
      const oauthProvider = sessionStorage.getItem('3boxes_oauth_provider')
      const oauthName = sessionStorage.getItem('3boxes_oauth_name')
      const oauthEmail = sessionStorage.getItem('3boxes_oauth_email')
      const oauthAvatar = sessionStorage.getItem('3boxes_oauth_avatar')

      if (oauthProvider && authUser) {
        // IMPORTANT: Use oauthName (the provider's username), NOT authUser.name (the main login user)
        const profileName = oauthName || 'Unknown'
        const profileEmail = oauthEmail || ''
        const profileAvatar = oauthAvatar || undefined
        const network = oauthProvider as SocialNetwork

        console.log('[Social Connect] ✅ OAuth callback detected via sessionStorage:', oauthProvider, profileName)

        if (network === 'google' || network === 'facebook' || network === 'linkedin') {
          updateConnection(network, {
            connecting: false,
            connected: true,
            profile: { name: profileName, email: profileEmail, avatar: profileAvatar },
          })
        }

        // Clean up all sessionStorage markers AFTER connection is established
        sessionStorage.removeItem('3boxes_oauth_provider')
        sessionStorage.removeItem('3boxes_oauth_name')
        sessionStorage.removeItem('3boxes_oauth_email')
        sessionStorage.removeItem('3boxes_oauth_avatar')
        sessionStorage.removeItem('3boxes_oauth_social_id')
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
      if (linkingGoogle === 'true' && authUser) {
        console.log('[Social Connect] ✅ Google callback (fallback), marking as connected:', authUser.name)
        updateConnection('google', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email },
        })
        sessionStorage.removeItem('3boxes_google_connect')
        sessionStorage.removeItem('3boxes_google_connect_time')
      } else if (linkingFacebook === 'true' && authUser) {
        console.log('[Social Connect] ✅ Facebook callback (fallback), marking as connected:', authUser.name)
        updateConnection('facebook', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email },
        })
        sessionStorage.removeItem('3boxes_facebook_connect')
        sessionStorage.removeItem('3boxes_facebook_connect_time')
      } else if (linkingLinkedIn === 'true' && authUser) {
        console.log('[Social Connect] ✅ LinkedIn callback (fallback), marking as connected:', authUser.name)
        updateConnection('linkedin', {
          connecting: false,
          connected: true,
          profile: { name: authUser.name, email: authUser.email },
        })
        sessionStorage.removeItem('3boxes_linkedin_connect')
        sessionStorage.removeItem('3boxes_linkedin_connect_time')
      }

      // If we have markers but no authUser yet, wait for next render
      // But if we've been waiting too long (>30 seconds), clean up and stop connecting
      const now = Date.now()
      const connectTime = parseInt(sessionStorage.getItem('3boxes_google_connect_time') || '0')
      const connectTimeFB = parseInt(sessionStorage.getItem('3boxes_facebook_connect_time') || '0')
      const connectTimeLI = parseInt(sessionStorage.getItem('3boxes_linkedin_connect_time') || '0')

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
      }
    } catch {}
  }, [authUser, updateConnection])

  // ─── Connect Flow ─────────────────────────────────────────────────────────

  const handleConnectClick = useCallback((networkConfig: SocialNetworkConfig) => {
    if (!authUser) {
      setAuthView('login')
      return
    }

    // Google has real OAuth - use server-side redirect
    if (networkConfig.network === 'google' && networkConfig.realConnect) {
      handleGoogleConnect()
      return
    }

    // Facebook has real OAuth - use server-side redirect (like LinkedIn)
    if (networkConfig.network === 'facebook' && networkConfig.realConnect) {
      handleFacebookConnect()
      return
    }

    // LinkedIn has real OAuth - use server-side redirect
    if (networkConfig.network === 'linkedin' && networkConfig.realConnect) {
      handleLinkedInConnect()
      return
    }

    // Instagram - show consent dialog for simulated connection
    setConsentDialogNetwork(networkConfig)
    setConsentDialogOpen(true)
  }, [authUser, setAuthView, handleGoogleConnect, handleFacebookConnect, handleLinkedInConnect])

  const handleConsentAccept = useCallback(() => {
    if (!consentDialogNetwork) return
    const network = consentDialogNetwork.network

    setConsentDialogOpen(false)
    updateConnection(network, { connecting: true })

    // Simulate connection for non-Facebook networks (2 second delay)
    setTimeout(() => {
      updateConnection(network, { connecting: false, connected: true })
    }, 2000)
  }, [consentDialogNetwork, updateConnection])

  const handleDisconnect = useCallback(
    (network: SocialNetwork) => {
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

    // Build social data payload including real Facebook data if available
    const socialPayload: any = {
      networks: connectedNetworks.map((c) => c.network),
    }

    // Include real Facebook data for AI analysis
    const fbConnection = connections.find((c) => c.network === 'facebook' && c.connected)
    if (fbConnection?.profile) {
      socialPayload.facebookData = {
        profile: fbConnection.profile,
        likes: fbConnection.likes || [],
      }
    }

    try {
      const response = await fetch('/api/social-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socialPayload),
      })

      if (!response.ok) {
        throw new Error('Analysis request failed')
      }

      const data = await response.json()
      // Map API response (which uses "match" field) to component format (which uses "score")
      const mappedAnalysis: StyleAnalysis = {
        styleProfile: {
          tags: data.styleProfile?.tags || FALLBACK_ANALYSIS.styleProfile.tags,
          confidence: data.styleProfile?.confidence
            ? Math.round(data.styleProfile.confidence * 100)
            : FALLBACK_ANALYSIS.styleProfile.confidence,
          description: data.styleProfile?.description || FALLBACK_ANALYSIS.styleProfile.description,
        },
        colorPreferences: data.colorPreferences?.map((c: any) => ({
          name: c.name,
          hex: c.hex,
          affinity: Math.round((c.affinity || 0.5) * 100),
        })) || FALLBACK_ANALYSIS.colorPreferences,
        recommendedCategories: data.recommendedCategories?.map((c: any) => ({
          name: c.name,
          score: c.match || c.score || 50,
          reason: c.reason,
        })) || FALLBACK_ANALYSIS.recommendedCategories,
      }
      setAnalysis(mappedAnalysis)
      setProducts(FALLBACK_PRODUCTS)
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-900/30 bg-amber-900/10 px-4 py-1.5 text-sm text-amber-200/80">
            <Wand2 className="size-4" />
            AI-Powered Style Discovery
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Social Style{' '}
            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Integration
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-amber-200/60">
            Connect your social networks and let our AI analyze your unique fashion DNA.
            Discover personalized recommendations that match your authentic style.
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
              <motion.div key={networkConfig.network} variants={itemVariants}>
                <motion.div
                  variants={cardHover}
                  initial="rest"
                  whileHover="hover"
                >
                  <Card
                    className={`border transition-colors ${
                      isConnected
                        ? `${networkConfig.borderColor} bg-stone-900/80`
                        : 'border-amber-900/30 bg-stone-900/80 hover:border-amber-900/50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isConnected && connection?.profile?.avatar ? (
                            <img
                              src={connection.profile.avatar}
                              alt={connection.profile.name}
                              className="size-10 rounded-lg object-cover border border-white/10"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div
                              className={`flex size-10 items-center justify-center rounded-lg ${networkConfig.bgColor} ${networkConfig.color}`}
                            >
                              {networkConfig.icon}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-amber-100">
                              {networkConfig.label}
                            </CardTitle>
                            <CardDescription className="text-amber-200/50">
                              {isConnected
                                ? `Connected with ${networkConfig.label} user${connection?.profile?.name ? ': ' + connection.profile.name : ''}`
                                : 'Not connected'}
                            </CardDescription>
                          </div>
                        </div>
                        {isConnected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            <CheckCircle2 className="size-5 text-emerald-400" />
                          </motion.div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Data items preview */}
                      <div className="mb-4 flex flex-wrap gap-1.5">
                        {networkConfig.dataItems.map((item) => (
                          <Badge
                            key={item}
                            variant="outline"
                            className="border-amber-900/30 text-amber-200/50"
                          >
                            {item}
                          </Badge>
                        ))}
                        {networkConfig.realConnect && (
                          <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-600/30 text-xs">
                            Live
                          </Badge>
                        )}
                      </div>

                      {/* Likes count for connected Facebook */}
                      {isConnected && networkConfig.network === 'facebook' && connection?.likes && connection.likes.length > 0 && (
                        <p className="mb-3 text-xs text-amber-200/50">
                          {connection.likes.length} liked pages analyzed
                        </p>
                      )}

                      {/* Connect / Disconnect Button */}
                      {isConnecting ? (
                        <Button
                          disabled
                          className="w-full bg-stone-800 text-amber-200/60"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          {networkConfig.realConnect ? `Opening ${networkConfig.label}...` : 'Connecting...'}
                        </Button>
                      ) : isConnected ? (
                        <Button
                          onClick={() => handleDisconnect(networkConfig.network)}
                          variant="outline"
                          className="w-full border-amber-900/40 text-amber-200/60 hover:bg-red-900/20 hover:text-red-300 hover:border-red-900/40"
                        >
                          <Unplug className="size-4" />
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleConnectClick(networkConfig)}
                          className={`w-full ${networkConfig.color} ${networkConfig.bgColor} border ${networkConfig.borderColor} hover:opacity-80`}
                          style={{ background: undefined }}
                          variant="outline"
                        >
                          {networkConfig.realConnect && <ExternalLink className="size-4" />}
                          Connect {networkConfig.label}
                          {!networkConfig.realConnect && (
                            <Badge variant="outline" className="ml-2 border-amber-900/30 text-amber-200/40 text-[10px] px-1">
                              Simulated
                            </Badge>
                          )}
                        </Button>
                      )}
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
                          ? 'All networks connected!'
                          : `${connectedNetworks.length} network${connectedNetworks.length > 1 ? 's' : ''} connected`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-amber-200/50">
                      {allConnected
                        ? "You're ready for the most comprehensive style analysis"
                        : 'Connect more networks for a richer analysis'}
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
                        Analyzing Style...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Analyze My Style
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
                      Analyzing your style DNA...
                    </p>
                    <p className="mt-1 text-sm text-amber-200/50">
                      Processing data from {connectedNetworks.map((c) => c.network).join(', ')}
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
                      <CardTitle className="text-amber-100">Your Style Profile</CardTitle>
                    </div>
                    <CardDescription className="text-amber-200/50">
                      Powered by AI analysis of your social presence
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
                            Analysis Confidence
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
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <Card className="h-full border-amber-900/30 bg-stone-900/80">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Palette className="size-5 text-amber-400" />
                        <CardTitle className="text-amber-100">Color Preferences</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                >
                  <Card className="h-full border-amber-900/30 bg-stone-900/80">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="size-5 text-amber-400" />
                        <CardTitle className="text-amber-100">Recommended Categories</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-72">
                        <div className="space-y-3">
                          {analysis.recommendedCategories.map((cat, i) => (
                            <motion.div
                              key={cat.name}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                              className="rounded-lg border border-amber-900/20 bg-stone-800/50 p-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-amber-100">
                                  {cat.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-amber-600/30 text-amber-400"
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
                      <CardTitle className="text-amber-100">Privacy Controls</CardTitle>
                    </div>
                    <CardDescription className="text-amber-200/50">
                      Manage how your social data is used for recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { key: 'shareStyleProfile' as const, label: 'Share Style Profile', desc: 'Allow your style profile to influence product recommendations' },
                        { key: 'shareColorPreferences' as const, label: 'Share Color Preferences', desc: 'Use your color preferences for visual curation' },
                        { key: 'sharePurchaseHistory' as const, label: 'Share Purchase History', desc: 'Include purchase history in style analysis' },
                        { key: 'allowPersonalizedAds' as const, label: 'Personalized Suggestions', desc: 'Show personalized product suggestions based on style data' },
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
                  onClick={() => { setAnalysis(null); setProducts([]) }}
                  variant="outline"
                  className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-100"
                >
                  <Wand2 className="size-4" />
                  Re-analyze Style
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
                Connect {consentDialogNetwork?.label}
              </DialogTitle>
              <DialogDescription className="text-amber-200/60">
                This will allow 3 BOXES LUXURY to access the following data from your{' '}
                {consentDialogNetwork?.label} account:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              {consentDialogNetwork?.dataDescription.map((desc) => (
                <div key={desc} className="flex items-start gap-2 text-sm">
                  <Eye className="size-4 mt-0.5 text-amber-400 shrink-0" />
                  <span className="text-amber-200/70">{desc}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-amber-900/20 bg-stone-800/50 p-3">
              <div className="flex items-start gap-2 text-xs">
                <Lock className="size-3.5 mt-0.5 text-amber-400 shrink-0" />
                <span className="text-amber-200/50">
                  Your data is encrypted and used only for style analysis. You can disconnect anytime.
                  {!consentDialogNetwork?.realConnect && ' (Simulated connection - no real data is accessed)'}
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
                Allow & Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
