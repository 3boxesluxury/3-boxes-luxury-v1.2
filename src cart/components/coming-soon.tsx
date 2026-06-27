'use client';

import { motion } from 'framer-motion';
import { Heart, ArrowLeft, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';

/**
 * ComingSoon — placeholder page shown when a feature is not yet launched.
 *
 * Triggered by:
 *  - Family Pack section → "Explore Collection" button → setView('coming-soon')
 *
 * Uses the warm Option 2 copy:
 *   "Great things are in the making.
 *    We're curating something special just for you.
 *    Made with love, delivered with joy — soon."
 */
export function ComingSoon() {
  const { setView } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-16"
    >
      {/* Decorative glowing background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 -z-10 h-48 w-48 rounded-full bg-amber-500/10 blur-[100px]"
      />

      <div className="mx-auto max-w-xl text-center">
        {/* Glowing heart icon */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/30 bg-amber-900/20 backdrop-blur-sm"
        >
          <Heart className="h-10 w-10 fill-amber-500 text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
        </motion.div>

        {/* COMING SOON title with gold shimmer */}
        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="gold-shimmer mb-6 text-4xl font-bold tracking-[0.25em] sm:text-5xl"
        >
          COMING SOON
        </motion.h1>

        {/* Subtitle copy — Option 2 */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-3"
        >
          <p className="text-base leading-relaxed text-amber-100/90 sm:text-lg">
            Great things are in the making.
          </p>
          <p className="text-base leading-relaxed text-amber-200/70 sm:text-lg">
            We&apos;re curating something special just for you.
          </p>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm italic text-amber-300/80 sm:text-base">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Made with love, delivered with joy — soon.
            <Sparkles className="h-4 w-4 text-amber-400" />
          </p>
        </motion.div>

        {/* Back to Home button */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-10 flex justify-center"
        >
          <button
            onClick={() => setView('home')}
            className="group inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-600/10 px-6 py-3 text-sm font-medium text-amber-200 transition-all hover:bg-amber-600 hover:text-stone-950 hover:shadow-lg hover:shadow-amber-600/30"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </button>
        </motion.div>

        {/* Decorative dots at the bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-12 flex items-center justify-center gap-1.5"
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-amber-400/40"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
