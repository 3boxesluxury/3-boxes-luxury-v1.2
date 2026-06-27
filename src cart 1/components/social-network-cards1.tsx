'use client'

import { motion } from 'framer-motion'
import { Facebook, Linkedin, Instagram, Chrome, Loader2, CheckCircle2, Unplug, ExternalLink, BadgeCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SOCIAL_NETWORKS,
  type SocialNetwork,
  type SocialNetworkConfig,
  useSocialConnections,
} from '@/hooks/useSocialConnections'

// ─── Icon resolver ────────────────────────────────────────────────────────────

const NETWORK_ICONS: Record<SocialNetworkConfig['icon'], React.ElementType> = {
  google: Chrome,
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
}

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

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SocialNetworkCardsProps {
  /** Pass in pre-existing connections from parent (e.g. from SocialStyleIntegration's
   * more advanced state management). If not provided, this component uses the
   * shared useSocialConnections hook directly. */
  connections?: ReturnType<typeof useSocialConnections>['connections']
  failedAvatars?: Set<SocialNetwork>
  setFailedAvatars?: React.Dispatch<React.SetStateAction<Set<SocialNetwork>>>
  onConnectClick?: (network: SocialNetworkConfig) => void
  onDisconnect?: (network: SocialNetwork) => void
  /** Variant: 'full' shows avatar/profile info for connected networks (used in
   * social-style view). 'compact' shows just the brand and connect status. */
  variant?: 'full' | 'compact'
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Reusable grid of 4 social network connection cards (Google, Facebook, LinkedIn, Instagram).
 * Used by both SocialConnectionsSection (home page Social tab) and SocialStyleIntegration.
 */
export function SocialNetworkCards({
  connections: connectionsProp,
  failedAvatars: failedAvatarsProp,
  setFailedAvatars: setFailedAvatarsProp,
  onConnectClick,
  onDisconnect,
  variant = 'full',
}: SocialNetworkCardsProps) {
  // Always call the hook (rules of hooks), but only use its values if no props were passed
  const hookResult = useSocialConnections()

  const connections = connectionsProp ?? hookResult.connections
  const failedAvatars = failedAvatarsProp ?? hookResult.failedAvatars
  const setFailedAvatars = setFailedAvatarsProp ?? hookResult.setFailedAvatars
  const handleConnectClick = onConnectClick ?? hookResult.handleConnectClick
  const handleDisconnect = onDisconnect ?? hookResult.handleDisconnect

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {SOCIAL_NETWORKS.map((networkConfig) => {
        const connection = connections.find((c) => c.network === networkConfig.network)
        const isConnected = connection?.connected ?? false
        const isConnecting = connection?.connecting ?? false
        const Icon = NETWORK_ICONS[networkConfig.icon]

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
                  {/* Checkmark in top-right when connected */}
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
                    {variant === 'full' && isConnected && connection?.profile?.avatar && !failedAvatars.has(networkConfig.network) ? (
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
                        <Icon className="size-5" />
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
                            Connected
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-amber-200/50 truncate">
                        {isConnected
                          ? (connection?.profile?.name || 'Connected')
                          : 'Not connected'}
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
                        {item}
                      </Badge>
                    ))}
                    {networkConfig.realConnect && (
                      <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-600/30 text-xs">
                        <BadgeCheck className="size-3 mr-0.5" />
                        Live
                      </Badge>
                    )}
                  </div>

                  {/* Likes count for connected Facebook */}
                  {variant === 'full' && isConnected && networkConfig.network === 'facebook' && connection?.likes && connection.likes.length > 0 && (
                    <p className="mb-3 text-xs text-amber-200/50">
                      {connection.likes.length} liked pages analyzed
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
  )
}
