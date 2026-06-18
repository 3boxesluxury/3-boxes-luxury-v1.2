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
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { SocialNetworkCards } from '@/components/social-network-cards';

interface SocialFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
  accentBg: string;
}

const SOCIAL_FEATURES: SocialFeature[] = [
  {
    icon: Share2,
    title: 'Share Wishlists',
    description: 'Create and share gift wishlists with family & friends. Let them know exactly what you desire.',
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
  },
  {
    icon: Users,
    title: 'Group Gifting',
    description: 'Pool contributions from multiple people for that one special luxury gift. Make big dreams come true together.',
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
  },
  {
    icon: MessageCircle,
    title: 'Gift Chat',
    description: 'Discuss and plan gifts with your close circle. Share ideas, get opinions, and surprise together.',
    accentColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
  },
  {
    icon: PartyPopper,
    title: 'Celebration Reminders',
    description: 'Never miss a birthday, anniversary, or special occasion. Get AI-powered gift suggestions ahead of time.',
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
  },
  {
    icon: Heart,
    title: 'Gift Registry',
    description: 'Set up your personal gift registry for weddings, housewarmings, and milestone celebrations.',
    accentColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
  },
  {
    icon: Award,
    title: 'Referral Rewards',
    description: 'Share 3BOXES with friends and earn luxury credits. Both of you get rewards on their first purchase.',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
  },
];

const OCCASIONS = [
  { emoji: '🎂', label: 'Birthday' },
  { emoji: '💑', label: 'Anniversary' },
  { emoji: '🏠', label: 'Housewarming' },
  { emoji: '🎓', label: 'Graduation' },
  { emoji: '👶', label: 'Baby Shower' },
  { emoji: '🎊', label: 'Festivals' },
];

export function SocialConnectionsSection() {
  const { toggleGiftBuilder, setView } = useStore();
  // Use shared hook so connection state is reflected here too.
  const { hasAnyConnection, connectedNetworks } = useSocialConnections();

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
    <section className="relative overflow-hidden border-t border-amber-900/20 py-12 sm:py-16">
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
            Gift Together, Celebrate Together
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="text-amber-50">Social </span>
            <span className="luxury-text">Connections</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
            Gift giving is better together. Connect with your loved ones and make every celebration memorable.
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
              <h3 className="text-lg font-semibold text-amber-100 sm:text-xl">
                Connect Your Social Networks
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Wand2 className="h-3 w-3" />
              AI-Powered Style Discovery
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
            className="mt-6 rounded-2xl border border-amber-900/30 bg-gradient-to-r from-amber-900/10 via-stone-900/40 to-amber-900/10 p-6 text-center sm:p-8"
          >
            {/* Heading — CENTERED on all viewports */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="text-xl font-bold tracking-tight text-amber-100 sm:text-2xl">
                  Discover Your AI Style Profile
                </h3>
              </div>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-amber-200/60 sm:text-base">
                Connect your social networks above, then visit the Social Style page to unlock
                AI-powered recommendations, personalized color preferences, and curated products
                that match your unique fashion DNA.
              </p>

              {/* Feature pills — CENTERED on all viewports */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70">
                  <Wand2 className="h-3 w-3 text-amber-400" />
                  AI Style Analysis
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Color Preferences
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/70">
                  <Gift className="h-3 w-3 text-amber-400" />
                  Curated Products
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
                    ? `${connectedNetworks.length} network${connectedNetworks.length > 1 ? 's' : ''} connected`
                    : 'No networks connected yet'}
                </span>
                <p className="mt-1 text-xs text-amber-200/50">
                  {hasAnyConnection
                    ? "You're ready to discover your style profile"
                    : 'Connect at least one network to begin your analysis'}
                </p>
              </div>
              <Button
                onClick={handleAnalyze}
                className="gap-2 bg-amber-600 px-8 py-5 text-base font-bold text-stone-950 transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25 min-w-[260px]"
                size="lg"
              >
                <Sparkles className="h-5 w-5" />
                Go to Social Style Page
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Divider between social network cards block and the rest of the section */}
        <div className="my-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
          <span className="text-xs uppercase tracking-widest text-amber-400/40">
            More Social Features
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
          {OCCASIONS.map((occ) => (
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
          {SOCIAL_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/60 to-stone-950/80 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 ${feature.accentBg}`}>
                    <Icon className={`h-5 w-5 ${feature.accentColor}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-bold text-amber-100">{feature.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-amber-200/50">{feature.description}</p>
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
            Start Group Gifting
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-amber-500/40 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100"
          >
            <Send className="h-4 w-4" />
            Invite Friends
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
            Trusted by 50,000+ families across India
          </p>
        </motion.div>
      </div>
    </section>
  );
}
