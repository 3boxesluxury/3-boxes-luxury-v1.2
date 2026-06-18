'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, ArrowRight, Crown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback } from 'react';

const HERO_IMAGES = [
  '/images/hero-bg.png',
  '/images/hero-bg-2.png',
  '/images/hero-bg-3.png',
  '/images/hero-bg-4.png',
];

const SLIDE_INTERVAL = 5000; // 5 seconds per image

export function HeroSection() {
  const { setView, setCategory, toggleGiftBuilder } = useStore();
  const { t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      setIsTransitioning(false);
    }, 800); // fade out duration
  }, []);

  useEffect(() => {
    const timer = setInterval(advanceSlide, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [advanceSlide]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-900/20">
      {/* Rotating Background Images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGES[currentImageIndex]}')` }}
        />
      </AnimatePresence>

      {/* Golden flash effect on transition */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-amber-400"
          />
        )}
      </AnimatePresence>

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/55 to-stone-950/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/60 via-transparent to-stone-950/60" />

      {/* Decorative golden accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-36 w-36 rounded-full bg-amber-600/[0.05] blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
      </div>

      {/* Content - compact height */}
      <div className="relative container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center text-center"
        >
          {/* Luxury Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm"
          >
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400/90">
              {t('hero.curatedLuxury')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
          >
            <span className="luxury-text">3 BOXES</span>{' '}
            <span className="text-amber-50">LUXURY</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-2 max-w-lg text-xs text-amber-100/70 sm:text-sm"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              onClick={() => {
                setCategory(null);
                setView('home');
              }}
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25 gap-2 h-9 px-4 text-sm"
            >
              {t('hero.shopNow')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleGiftBuilder}
              className="border-amber-500/50 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-100 hover:border-amber-500/60 gap-2 backdrop-blur-sm h-9 px-4 text-sm"
            >
              <Gift className="h-4 w-4" />
              {t('hero.giftBuilder')}
              <Sparkles className="h-3 w-3 text-amber-400/70" />
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Slide indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentImageIndex(i);
                setIsTransitioning(false);
              }, 400);
            }}
            className={`rounded-full transition-all duration-500 ${
              i === currentImageIndex
                ? 'h-1.5 w-6 bg-amber-400/80'
                : 'h-1.5 w-1.5 bg-amber-400/30 hover:bg-amber-400/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
    </section>
  );
}
