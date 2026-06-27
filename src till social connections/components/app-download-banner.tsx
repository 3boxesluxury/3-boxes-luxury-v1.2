'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from '@/hooks/useTranslation';

const STORAGE_KEY = '3bl_app_banner_dismissed';

export function AppDownloadBanner() {
  const [isDismissed, setIsDismissed] = useState(true); // Start true to prevent flash
  const [mounted, setMounted] = useState(false);
  const { canInstall, promptInstall, isInstalled } = usePWAInstall();
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
    // Check localStorage for persisted dismiss state
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      // localStorage unavailable — show banner by default
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstall = () => {
    if (canInstall) {
      promptInstall();
    } else {
      const section = document.getElementById('app-download');
      section?.scrollIntoView({ behavior: 'smooth' });
    }
    handleDismiss();
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) return null;

  // Don't show if dismissed or already installed
  if (isDismissed || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 2.5 }}
        className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0"
      >
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-900/20 p-4 shadow-2xl shadow-amber-900/20 backdrop-blur-lg">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-amber-200/40 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
            aria-label={t('appDownload.dismissBanner')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />

          <div className="flex items-center gap-4">
            {/* App icon */}
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-amber-700/10">
                <Smartphone className="h-6 w-6 text-amber-400" />
              </div>
            </div>

            {/* Text & action */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-amber-100">
                {t('appDownload.installOurApp')}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-xs text-amber-200/50">
                {t('appDownload.subtitle')}
              </p>
              <div className="mt-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="h-7 gap-1.5 bg-amber-600 text-xs font-semibold text-stone-950 hover:bg-amber-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('appDownload.installNow')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
