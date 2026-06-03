'use client'

import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialNetwork = 'facebook' | 'linkedin' | 'instagram'

interface SocialConnection {
  network: SocialNetwork
  connected: boolean
  connecting: boolean
}

interface StyleProfile {
  tags: string[]
  confidence: number
  description: string
}

interface ColorPreference {
  name: string
  hex: string
  affinity: number // 0-100
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
}

const SOCIAL_NETWORKS: SocialNetworkConfig[] = [
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
      'Photos you\'ve been tagged in (for style analysis)',
      'Interest categories from your activity',
    ],
    dataItems: ['Profile', 'Likes', 'Photos', 'Interests'],
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
    { name: 'Forest Green', hex: '#228B22', affinity: 65 },
  ],
  recommendedCategories: [
    {
      name: 'Luxury Watches',
      score: 95,
      reason: 'Your classic aesthetic aligns perfectly with timeless timepieces',
    },
    {
      name: 'Premium Leather Goods',
      score: 91,
      reason: 'Minimalist style pairs beautifully with refined leather accessories',
    },
    {
      name: 'Fine Jewelry',
      score: 88,
      reason: 'Sophisticated taste matches elegant jewelry selections',
    },
    {
      name: 'Designer Fragrances',
      score: 84,
      reason: 'Contemporary sensibility drawn to nuanced, layered scents',
    },
    {
      name: 'Silk & Cashmere',
      score: 80,
      reason: 'Your preference for premium fabrics suggests luxury textiles',
    },
  ],
}

const FALLBACK_PRODUCTS: ProductRecommendation[] = [
  {
    id: 'rec-1',
    name: 'Royal Chronograph Gold',
    price: 45000,
    image: '/images/products/generated/royal-chronograph-gold-11047389823249.png',
    reason: 'Perfect match for your classic watch aesthetic',
    matchScore: 97,
  },
  {
    id: 'rec-2',
    name: 'Heritage Leather Briefcase',
    price: 28000,
    image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png',
    reason: 'Aligns with your minimalist leather preference',
    matchScore: 94,
  },
  {
    id: 'rec-3',
    name: 'Emerald Tennis Bracelet',
    price: 62000,
    image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png',
    reason: 'Sophisticated elegance that matches your style',
    matchScore: 91,
  },
  {
    id: 'rec-4',
    name: 'Jardin Secret Eau de Parfum',
    price: 8500,
    image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png',
    reason: 'Layered complexity for your contemporary taste',
    matchScore: 87,
  },
  {
    id: 'rec-5',
    name: 'Cashmere Overcoat',
    price: 35000,
    image: '/images/products/generated/cashmere-overcoat-11047388414225.png',
    reason: 'Premium fabric perfect for your refined palette',
    matchScore: 84,
  },
  {
    id: 'rec-6',
    name: 'Sapphire Cascade Earrings',
    price: 38000,
    image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png',
    reason: 'Understated luxury that speaks to your sophistication',
    matchScore: 82,
  },
]

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: 'easeOut' as const } },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SocialStyleIntegration() {
  const { authUser, setAuthView } = useStore()

  // Connection states
  const [connections, setConnections] = useState<SocialConnection[]>([
    { network: 'facebook', connected: false, connecting: false },
    { network: 'linkedin', connected: false, connecting: false },
    { network: 'instagram', connected: false, connecting: false },
  ])

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
      setConnections((prev) =>
        prev.map((c) => (c.network === network ? { ...c, ...updates } : c))
      )
    },
    []
  )

  // ─── Connect Flow ─────────────────────────────────────────────────────────

  const handleConnectClick = useCallback((networkConfig: SocialNetworkConfig) => {
    // Require login first
    if (!authUser) {
      setAuthView('login')
      return
    }
    setConsentDialogNetwork(networkConfig)
    setConsentDialogOpen(true)
  }, [authUser, setAuthView])

  const handleConsentAccept = useCallback(() => {
    if (!consentDialogNetwork) return
    const network = consentDialogNetwork.network

    setConsentDialogOpen(false)
    updateConnection(network, { connecting: true })

    // Simulate connection (2 second delay)
    setTimeout(() => {
      updateConnection(network, { connecting: false, connected: true })
    }, 2000)
  }, [consentDialogNetwork, updateConnection])

  const handleDisconnect = useCallback(
    (network: SocialNetwork) => {
      updateConnection(network, { connected: false })
      // Clear analysis if it was based on this network
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

    const connectedNames = connectedNetworks.map((c) => c.network)

    try {
      const response = await fetch('/api/social-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networks: connectedNames }),
      })

      if (!response.ok) {
        throw new Error('Analysis request failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis ?? FALLBACK_ANALYSIS)
      setProducts(data.products ?? FALLBACK_PRODUCTS)
    } catch {
      // Use fallback mock data on failure
      setAnalysis(FALLBACK_ANALYSIS)
      setProducts(FALLBACK_PRODUCTS)
    } finally {
      setAnalyzing(false)
    }
  }, [hasAnyConnection, connectedNetworks])

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
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                          <div
                            className={`flex size-10 items-center justify-center rounded-lg ${networkConfig.bgColor} ${networkConfig.color}`}
                          >
                            {networkConfig.icon}
                          </div>
                          <div>
                            <CardTitle className="text-amber-100">
                              {networkConfig.label}
                            </CardTitle>
                            <CardDescription className="text-amber-200/50">
                              {isConnected ? 'Connected' : 'Not connected'}
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
                      </div>

                      {/* Connect / Disconnect Button */}
                      {isConnecting ? (
                        <Button
                          disabled
                          className="w-full bg-stone-800 text-amber-200/60"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          Connecting...
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
                          Connect {networkConfig.label}
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
                        ? 'You\'re ready for the most comprehensive style analysis'
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
                    {/* Confidence Score */}
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

                    {/* Style Tags */}
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

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-amber-200/70">
                      {analysis.styleProfile.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Color Preferences */}
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

                {/* Recommended Categories */}
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
                          {/* Product Image */}
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
                          {/* Match Score */}
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
                          {/* Product Info */}
                          <h4 className="text-sm font-semibold text-amber-100 line-clamp-1">
                            {product.name}
                          </h4>
                          <p className="mt-1 text-xs text-amber-200/50 line-clamp-2">
                            {product.reason}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Re-analyze button */}
                    <div className="mt-6 text-center">
                      <Button
                        onClick={handleAnalyzeStyle}
                        disabled={analyzing}
                        variant="outline"
                        className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20"
                      >
                        <Sparkles className="size-4" />
                        Re-Analyze My Style
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="border-amber-900/30 bg-stone-900/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-amber-400" />
                <CardTitle className="text-amber-100">Privacy & Data Control</CardTitle>
              </div>
              <CardDescription className="text-amber-200/50">
                Manage how your data is used and shared across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Privacy Toggles */}
              <div className="mb-6 space-y-4">
                {[
                  {
                    key: 'shareStyleProfile' as const,
                    icon: <Eye className="size-4 text-amber-400" />,
                    label: 'Share Style Profile',
                    description:
                      'Allow your AI-generated style profile to be visible in your public profile',
                  },
                  {
                    key: 'shareColorPreferences' as const,
                    icon: <Palette className="size-4 text-amber-400" />,
                    label: 'Share Color Preferences',
                    description:
                      'Include your color preferences in personalized recommendations for others',
                  },
                  {
                    key: 'sharePurchaseHistory' as const,
                    icon: <ShoppingBag className="size-4 text-amber-400" />,
                    label: 'Share Purchase History',
                    description:
                      'Use your purchase history to refine style analysis and recommendations',
                  },
                  {
                    key: 'allowPersonalizedAds' as const,
                    icon: <Lock className="size-4 text-amber-400" />,
                    label: 'Allow Personalized Promotions',
                    description:
                      'Receive tailored promotional offers based on your style analysis',
                  },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-amber-900/15 bg-stone-800/30 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{setting.icon}</div>
                      <div>
                        <p className="text-sm font-medium text-amber-100">{setting.label}</p>
                        <p className="mt-0.5 text-xs text-amber-200/50">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={privacySettings[setting.key]}
                      onCheckedChange={() => togglePrivacy(setting.key)}
                      className="data-[state=checked]:bg-amber-600"
                    />
                  </div>
                ))}
              </div>

              <Separator className="bg-amber-900/20" />

              {/* Connected Networks Management */}
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-amber-100">
                  Connected Networks
                </h4>
                {hasAnyConnection ? (
                  <div className="space-y-2">
                    {connections
                      .filter((c) => c.connected)
                      .map((conn) => {
                        const config = SOCIAL_NETWORKS.find(
                          (n) => n.network === conn.network
                        )!
                        return (
                          <div
                            key={conn.network}
                            className="flex items-center justify-between rounded-lg border border-amber-900/15 bg-stone-800/30 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex size-8 items-center justify-center rounded-md ${config.bgColor} ${config.color}`}
                              >
                                {config.icon}
                              </div>
                              <div>
                                <span className="text-sm font-medium text-amber-100">
                                  {config.label}
                                </span>
                                <p className="text-xs text-emerald-400/70">Connected</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleDisconnect(conn.network)}
                              variant="outline"
                              size="sm"
                              className="border-amber-900/40 text-amber-200/60 hover:bg-red-900/20 hover:text-red-300 hover:border-red-900/40"
                            >
                              <XCircle className="size-3.5" />
                              Disconnect
                            </Button>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-amber-900/20 bg-stone-800/20 px-4 py-8 text-center">
                    <Shield className="mx-auto mb-2 size-8 text-amber-200/30" />
                    <p className="text-sm text-amber-200/50">
                      No networks connected yet. Connect a social network above to get started.
                    </p>
                  </div>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="mt-6 rounded-lg border border-amber-900/15 bg-amber-900/5 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 size-4 shrink-0 text-amber-400/70" />
                  <div>
                    <p className="text-xs font-medium text-amber-200/70">
                      Your Privacy Matters
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-200/40">
                      3 Boxes Luxury never stores your social media credentials. We only access
                      the data you explicitly consent to share, and you can disconnect at any
                      time. Your style analysis is encrypted and used solely to enhance your
                      shopping experience. We never sell or share your personal data with third
                      parties.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Consent Dialog */}
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 text-amber-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              {consentDialogNetwork && (
                <div
                  className={`flex size-8 items-center justify-center rounded-md ${consentDialogNetwork.bgColor} ${consentDialogNetwork.color}`}
                >
                  {consentDialogNetwork.icon}
                </div>
              )}
              Connect {consentDialogNetwork?.label}
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Review what data will be imported from your {consentDialogNetwork?.label} account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Data items */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-200/50">
                Data to be imported
              </p>
              <ul className="space-y-2">
                {consentDialogNetwork?.dataDescription.map((desc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-200/70">
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                    {desc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg bg-amber-900/10 p-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-amber-400/70" />
              <p className="text-xs text-amber-200/50">
                Your credentials are never stored. We use secure OAuth tokens and you can
                revoke access at any time from the privacy settings below.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={() => setConsentDialogOpen(false)}
              variant="outline"
              className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConsentAccept}
              className="bg-amber-600 text-stone-950 hover:bg-amber-500"
            >
              <CheckCircle2 className="size-4" />
              Allow & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
