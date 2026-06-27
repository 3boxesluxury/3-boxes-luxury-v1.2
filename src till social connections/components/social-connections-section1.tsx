'use client';

import { motion } from 'framer-motion';
import {
  Share2,
  Users,
  MessageCircle,
  Gift,
  Heart,
  Sparkles,
  Send,
  PartyPopper,
  Cake,
  Award,
  ArrowRight,
  Crown,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { SocialNetworkCards } from '@/components/social-network-cards';

interface SocialFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

const getSocialFeatures = (t: (key: string, params?: Record<string, string | number>) => string): SocialFeature[] => [
  {
    icon: Share2,
    title: t('socialConnections.shareWishlists'),
    description: t('socialConnections.shareWishlistsDesc'),
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    icon: Users,
    title: t('socialConnections.groupGifting'),
    description: t('socialConnections.groupGiftingDesc'),
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/50',
  },
  {
    icon: MessageCircle,
    title: t('socialConnections.giftChat'),
    description: t('socialConnections.giftChatDesc'),
    accentColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
    accentBorder: 'border-teal-500/30 hover:border-teal-500/50',
  },
  {
    icon: PartyPopper,
    title: t('socialConnections.celebrationReminders'),
    description: t('socialConnections.celebrationRemindersDesc'),
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30 hover:border-orange-500/50',
  },
  {
    icon: Heart,
    title: t('socialConnections.giftRegistry'),
    description: t('socialConnections.giftRegistryDesc'),
    accentColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/30 hover:border-pink-500/50',
  },
  {
    icon: Award,
    title: t('socialConnections.referralRewards'),
    description: t('socialConnections.referralRewardsDesc'),
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/50',
  },
];

const getOccasions = (t: (key: string, params?: Record<string, string | number>) => string) => [
  { emoji: '🎂', label: t('socialConnections.occasionBirthday') },
  { emoji: '💑', label: t('socialConnections.occasionAnniversary') },
  { emoji: '🏠', label: t('socialConnections.occasionHousewarming') },
  { emoji: '🎓', label: t('socialConnections.occasionGraduation') },
  { emoji: '👶', label: t('socialConnections.occasionBabyShower') },
  { emoji: '🎊', label: t('socialConnections.occasionFestivals') },
];

export function SocialConnectionsSection() {
  const { toggleGiftBuilder, setView, appTheme } = useStore();
  const { t } = useTranslation();
  // Use shared hook so connection state is reflected here too.
  const { hasAnyConnection, connectedNetworks } = useSocialConnections();

  const sectionClass = appTheme === 'light'
    ? 'relative overflow-hidden border-t border-stone-200 bg-amber-50 py-12 sm:py-16'
    : 'relative overflow-hidden border-t border-amber-900/20 py-12 sm:py-16'
  const headerTextClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
  const bodyTextClass = appTheme === 'light' ? 'text-stone-600' : 'text-amber-200/60'
  const pillClass = appTheme === 'light'
    ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-xs font-medium text-stone-700'
    : 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300'
  const ctaCardClass = appTheme === 'light'
    ? 'mt-6 rounded-2xl border border-amber-200/60 bg-amber-50 p-6 text-center sm:p-8 shadow-sm shadow-amber-200/20'
    : 'mt-6 rounded-2xl border border-amber-900/30 bg-gradient-to-r from-amber-900/10 via-stone-900/40 to-amber-900/10 p-6 text-center sm:p-8'
  const ctaHeadingClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
  const ctaTextClass = appTheme === 'light' ? 'text-stone-600' : 'text-amber-200/60'

  // Navigate to the Social Style page (SocialStyleIntegration view) when the
  // "Analyze My Style" button is clicked. The Social Style page handles the
  // actual analysis using the connections established here.
  const handleAnalyze = () => {
    setView('social-style');
    // Scroll to top so the user sees the social-style page from the top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className={sectionClass}>
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-48 w-48 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-400">
            <Users className="h-3.5 w-3.5" />
            {t('socialConnections.giftTogether')}
          </div>
          <h2 className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl ${headerTextClass}`}>
            <span className={headerTextClass}>{t('socialConnections.social')} </span>
            <span className="luxury-text">{t('socialConnections.connections')}</span>
          </h2>
          <p className={`mx-auto mt-3 max-w-xl text-sm ${bodyTextClass} sm:text-base`}>
            {t('socialConnections.description')}
          </p>
        </motion.div>

        {/* ─── NEW: 4 Social Network Connection Cards (Google, Facebook, LinkedIn, Instagram) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          {/* Sub-header for the connection cards */}
          <div className="mb-4 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className={`text-lg font-semibold sm:text-xl ${headerTextClass}`}>
                {t('socialConnections.connectSocialNetworks')}
              </h3>
            </div>
            <span className={pillClass}>
              <Wand2 className="h-3 w-3" />
              {t('socialConnections.aiPoweredStyleDiscovery')}
            </span>
          </div>

          {/* The 4 cards (Google, Facebook, LinkedIn, Instagram) */}
          <SocialNetworkCards variant="full" />

          {/* CTA — Discover Your AI Style Profile (redirects to Social Style page for AI recommendations, color preferences, curated products) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={ctaCardClass}
          >
            {/* Heading — CENTERED on all viewports */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className={`text-xl font-bold tracking-tight sm:text-2xl ${ctaHeadingClass}`}>
                  {t('socialConnections.discoverAIStyleProfile')}
                </h3>
              </div>
              <p className={`mx-auto mt-2 max-w-2xl text-sm ${ctaTextClass} sm:text-base`}>
                {t('socialConnections.discoverDescription')}
              </p>

              {/* Feature pills — CENTERED on all viewports */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className={appTheme === 'light' ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-xs text-stone-700' : 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70'}>
                  <Wand2 className="h-3 w-3 text-amber-400" />
                  {t('socialConnections.aiStyleAnalysis')}
                </span>
                <span className={appTheme === 'light' ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-xs text-stone-700' : 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70'}>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {t('socialConnections.colorPreferences')}
                </span>
                <span className={appTheme === 'light' ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-xs text-stone-700' : 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70'}>
                  <Gift className="h-3 w-3 text-amber-400" />
                  {t('socialConnections.curatedProducts')}
                </span>
              </div>
            </div>

            {/* Divider for visual separation between description and CTA */}
            <div className="my-6 mx-auto h-px max-w-md bg-gradient-to-r from-transparent via-amber-900/40 to-transparent" />

            {/* Status text + CTA Button — both CENTERED */}
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <span className="text-sm font-medium text-amber-100">
                  {hasAnyConnection
                    ? t('socialConnections.networksConnected', { count: connectedNetworks.length })
                    : t('socialConnections.noNetworksYet')}
                </span>
                <p className="mt-1 text-xs text-amber-200/50">
                  {hasAnyConnection
                    ? t('socialConnections.readyToDiscover')
                    : t('socialConnections.connectAtLeastOne')}
                </p>
              </div>
              <Button
                onClick={handleAnalyze}
                className="gap-2 bg-amber-600 px-8 py-5 text-base font-bold text-stone-950 transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25 min-w-[260px]"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                {t('socialConnections.goToSocialStylePage')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Divider between social network cards block and the rest of the section */}
        <div className="my-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
          <span className="text-xs uppercase tracking-widest text-amber-400/40">
            {t('socialConnections.moreSocialFeatures')}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
        </div>

        {/* Occasion pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-10 flex flex-wrap justify-center gap-3"
        >
          {getOccasions(t).map((occ) => (
            <div
              key={occ.label}
              className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm text-amber-200/70 transition-all hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-100"
            >
              <span>{occ.emoji}</span>
              <span className="font-medium">{occ.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Feature cards grid (the existing 6 cards) */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {getSocialFeatures(t).map((feature, i) => {
            const Icon = feature.icon;
            const baseDarkClass = 'group rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/60 to-stone-950/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/10'
            const baseLightClass = 'group relative overflow-hidden rounded-2xl border border-[#e5d4b3] bg-gradient-to-b from-[#f8efe1] via-[#fbf4ea] to-[#f5e6cf] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#d4b884] hover:bg-[#f4e4c8] hover:shadow-lg hover:shadow-amber-200/25'
            const cardClass = appTheme === 'light' ? `${baseLightClass} ${feature.accentBorder}` : baseDarkClass
            const titleTextClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
            const descriptionTextClass = appTheme === 'light' ? 'text-stone-700' : 'text-amber-200/50'

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={cardClass}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/60 ${feature.accentBg}`}>
                    <Icon className={`h-5 w-5 ${feature.accentColor}`} strokeWidth={1.5} />
                  </div>
                  <h3 className={`text-base font-bold ${titleTextClass}`}>{feature.title}</h3>
                </div>
                <p className={`text-xs leading-relaxed ${descriptionTextClass}`}>{feature.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Button
            onClick={toggleGiftBuilder}
            className="gap-2 bg-amber-600 px-8 py-5 text-base font-bold text-stone-950 transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
          >
            <Gift className="h-5 w-5" />
            {t('socialConnections.startGroupGifting')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/40 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100"
          >
            <Send className="h-4 w-4" />
            {t('socialConnections.inviteFriends')}
          </Button>
        </motion.div>

        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-amber-200/40">
            <Crown className="mr-1 inline-block h-3.5 w-3.5 text-amber-400" />
            {t('socialConnections.trustedBy')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
