'use client'

import { motion } from 'framer-motion'
import {
  Facebook,
  Linkedin,
  Instagram,
  Chrome,
  Loader2,
  Unplug,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
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
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
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
  /** Variant kept for backward compat — both produce the same compact layout now. */
  variant?: 'full' | 'compact'
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Compact grid of 4 social network connection items (Google, Facebook, LinkedIn, Instagram).
 *
 * Each item shows:
 *   - Brand icon in a color-coded circle
 *   - Network name (bold)
 *   - @username (when connected) or "—" (when not connected)
 *   - Status pill (green dot + "Connected" OR gray dot + "Not connected")
 *   - Action button ("Connect" or "Disconnect")
 *
 * Layout:
 *   - Mobile/tablet: 2 columns
 *   - Desktop (lg+): 4 columns in a single row
 *
 * Much more compact than the previous card layout — fits comfortably on screen
 * without taking up excessive vertical space.
 */
export function SocialNetworkCards({
  connections: connectionsProp,
  failedAvatars: failedAvatarsProp,
  setFailedAvatars: setFailedAvatarsProp,
  onConnectClick,
  onDisconnect,
}: SocialNetworkCardsProps) {
  // Always call the hook (rules of hooks), but only use its values if no props were passed
  const hookResult = useSocialConnections()
  const appTheme = useStore((s) => s.appTheme)

  const connections = connectionsProp ?? hookResult.connections
  const handleConnectClick = onConnectClick ?? hookResult.handleConnectClick
  const handleDisconnect = onDisconnect ?? hookResult.handleDisconnect

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {SOCIAL_NETWORKS.map((networkConfig) => {
        const connection = connections.find((c) => c.network === networkConfig.network)
        const isConnected = connection?.connected ?? false
        const isConnecting = connection?.connecting ?? false
        const Icon = NETWORK_ICONS[networkConfig.icon]
        const username = connection?.profile?.name

        const lightCardBase = 'flex h-full flex-col items-center rounded-xl border p-3 text-center transition-all duration-200 sm:p-4 bg-gradient-to-b from-[#f8efe1] via-[#fbf4ea] to-[#f5e6cf]'
        const darkCardBase = 'flex h-full flex-col items-center rounded-xl border p-3 text-center transition-all duration-200 sm:p-4 bg-stone-900/80'

        const cardBgClass = appTheme === 'light'
          ? `${lightCardBase} border-[#e5d4b3] hover:border-[#d4b884] hover:bg-[#f4e4c8]`
          : `${darkCardBase} border-amber-900/30 hover:border-amber-900/50 hover:bg-stone-900`

        const buttonCommon = 'w-full gap-1 text-xs'
        const connectingButtonClass = appTheme === 'light'
          ? 'bg-stone-100 text-stone-900'
          : 'bg-stone-800 text-amber-200/60'
        const disconnectButtonClass = appTheme === 'light'
          ? 'border border-red-300/60 text-red-600 hover:border-red-400/70 hover:bg-red-100 hover:text-red-700'
          : 'border-amber-900/40 text-amber-200/70 hover:border-red-900/40 hover:bg-red-900/20 hover:text-red-300'
        const connectButtonClass = appTheme === 'light'
          ? `border ${networkConfig.color} ${networkConfig.bgColor} ${networkConfig.borderColor} hover:opacity-90`
          : `border ${networkConfig.color} ${networkConfig.bgColor} ${networkConfig.borderColor} hover:opacity-80`

        return (
          <motion.div key={networkConfig.network} variants={itemVariants} className="h-full">
            <div
              className={`flex h-full flex-col items-center rounded-xl border p-3 text-center transition-all duration-200 sm:p-4 ${cardBgClass}`}
            >
              {/* Brand icon in a color-coded circle */}
              <div
                className={`mb-2 flex size-11 items-center justify-center rounded-full ${networkConfig.bgColor} ${networkConfig.color} sm:size-12`}
              >
                <Icon className="size-5 sm:size-6" />
              </div>

              {/* Network name */}
              <h4 className={`text-sm font-bold ${appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'}`}>
                {networkConfig.label}
              </h4>

              {/* Username — @username when connected, "—" when not */}
              <p className={`mt-0.5 w-full truncate text-xs ${appTheme === 'light' ? 'text-stone-600' : 'text-amber-200/50'}`}>
                {isConnected && username ? `@${username}` : '—'}
              </p>

              {/* Status pill — green dot + "Connected" OR gray dot + "Not connected" */}
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={`size-2 rounded-full ${
                    isConnected ? 'bg-emerald-400' : appTheme === 'light' ? 'bg-stone-400' : 'bg-stone-600'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium uppercase tracking-wide ${
                    isConnected ? (appTheme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : appTheme === 'light' ? 'text-stone-500' : 'text-stone-400'
                  }`}
                >
                  {isConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>

              {/* Action button */}
              <div className="mt-3 w-full">
                {isConnecting ? (
                  <Button
                    disabled
                    size="sm"
                    className={`${buttonCommon} ${connectingButtonClass}`}
                  >
                    <Loader2 className="size-3 animate-spin" />
                    Connecting...
                  </Button>
                ) : isConnected ? (
                  <Button
                    onClick={() => handleDisconnect(networkConfig.network)}
                    size="sm"
                    variant="outline"
                    className={`${buttonCommon} ${disconnectButtonClass}`}
                  >
                    <Unplug className="size-3" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleConnectClick(networkConfig)}
                    size="sm"
                    variant="outline"
                    className={`${buttonCommon} ${connectButtonClass}`}
                  >
                    {networkConfig.realConnect && <ExternalLink className="size-3" />}
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
