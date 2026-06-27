'use client';

import { motion } from 'framer-motion';
import {
  Smartphone,
  Sparkles,
  Gift,
  Zap,
  Shield,
  ChevronRight,
  Download,
  Star,
  Crown,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from '@/hooks/useTranslation';

const getBenefits = (t: (key: string, params?: Record<string, string | number>) => string) => [
  {
    icon: Zap,
    title: t('appDownload.benefitFasterShopping'),
    desc: t('appDownload.benefitFasterShoppingDesc'),
  },
  {
    icon: Sparkles,
    title: t('appDownload.benefitExclusiveDeals'),
    desc: t('appDownload.benefitExclusiveDealsDesc'),
  },
  {
    icon: Gift,
    title: t('appDownload.benefitAIGiftAssistant'),
    desc: t('appDownload.benefitAIGiftAssistantDesc'),
  },
  {
    icon: Crown,
    title: t('appDownload.benefitVIPExperience'),
    desc: t('appDownload.benefitVIPExperienceDesc'),
  },
  {
    icon: Shield,
    title: t('appDownload.benefitSecurePayments'),
    desc: t('appDownload.benefitSecurePaymentsDesc'),
  },
  {
    icon: Star,
    title: t('appDownload.benefitWishlistAlerts'),
    desc: t('appDownload.benefitWishlistAlertsDesc'),
  },
];

export function AppDownloadSection() {
  const { canInstall, promptInstall, isInstalled } = usePWAInstall();
  const { t } = useTranslation();

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
    }
  };

  return (
    <section id="app-download" className="relative overflow-hidden border-t border-amber-900/30 bg-gradient-to-b from-stone-950 via-stone-900/50 to-stone-950 py-16 sm:py-20 lg:py-24">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-amber-700/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/3 blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
              <Smartphone className="h-3.5 w-3.5" />
              {t('appDownload.availableOnIosAndroid')}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-amber-50">{t('appDownload.installThe')} </span>
              <span className="luxury-text">{t('appDownload.appName')}</span>
              <span className="text-amber-50"> {t('appDownload.app')}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-amber-200/60 sm:text-lg">
              {t('appDownload.description')}
            </p>
          </motion.div>

          {/* Main content grid */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left - Phone mockup & install buttons */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              {/* Phone frame */}
              <div className="relative mx-auto w-64 sm:w-72">
                <div className="overflow-hidden rounded-[2.5rem] border-2 border-amber-500/30 bg-stone-900 p-2 shadow-2xl shadow-amber-900/20">
                  <div className="overflow-hidden rounded-[2rem] bg-stone-950">
                    {/* Status bar */}
                    <div className="flex items-center justify-between bg-stone-900 px-6 py-1.5">
                      <span className="text-[10px] text-amber-200/50">9:41</span>
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-amber-400/50" />
                        <div className="h-2 w-2 rounded-full bg-amber-400/50" />
                        <div className="h-2 w-4 rounded-full bg-amber-400/50" />
                      </div>
                    </div>
                    {/* App screen mockup */}
                    <div className="flex flex-col items-center px-4 py-6">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-amber-700/10">
                        <span className="text-lg font-bold text-amber-400">3B</span>
                      </div>
                      <div className="mb-1 text-sm font-bold text-amber-100">
                        {t('appDownload.appName')}
                      </div>
                      <div className="mb-4 text-[10px] text-amber-200/40">
                        {t('appDownload.curatedLuxuryGifting')}
                      </div>
                      {/* Category pills */}
                      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
                        {[t('categories.watches'), t('categories.jewelry'), t('categories.leatherGoods'), t('categories.fragrances')].map(
                          (cat) => (
                            <span
                              key={cat}
                              className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[9px] text-amber-300/70"
                            >
                              {cat}
                            </span>
                          )
                        )}
                      </div>
                      {/* Product cards mockup */}
                      <div className="grid w-full grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-lg border border-amber-500/10 bg-gradient-to-br from-stone-800 to-stone-900"
                          >
                            <div className="flex h-full items-center justify-center">
                              <div className="h-8 w-8 rounded-full border border-amber-500/20 bg-amber-500/10" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Bottom nav */}
                      <div className="mt-4 flex w-full justify-around border-t border-amber-500/10 pt-2">
                        {['🏠', '🔍', '🎁', '🛒', '👤'].map((emoji, i) => (
                          <span
                            key={i}
                            className="text-xs opacity-60"
                          >
                            {emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Notch */}
                <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-stone-900" />
                {/* Glow effect */}
                <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-amber-500/5 blur-xl" />
              </div>

              {/* Install buttons */}
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
                {/* PWA Install / Google Play button */}
                {canInstall ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallClick}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-600/20 px-6 py-3.5 shadow-lg shadow-amber-900/20 transition-colors hover:border-amber-500/50 hover:bg-amber-600/30"
                  >
                    <Download className="h-6 w-6 text-amber-400" />
                    <div className="text-left">
                      <div className="text-[10px] leading-tight text-amber-200/50">{t('appDownload.installAppLabel')}</div>
                      <div className="text-sm font-semibold text-amber-100">{t('appDownload.addToHomeScreen')}</div>
                    </div>
                  </motion.button>
                ) : isInstalled ? (
                  <motion.div
                    className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-6 py-3.5"
                  >
                    <Check className="h-6 w-6 text-emerald-400" />
                    <div className="text-left">
                      <div className="text-[10px] leading-tight text-emerald-200/50">{t('appDownload.installedLabel')}</div>
                      <div className="text-sm font-semibold text-emerald-100">{t('appDownload.appReady')}</div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstallClick}
                    className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-stone-900 px-5 py-3 shadow-lg shadow-amber-900/10 transition-colors hover:border-amber-500/40 hover:bg-stone-800"
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                      <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734c0-.382.218-.726.558-.92h.052z" fill="#4285F4" />
                      <path d="M17.092 8.65l-3.3 3.35 3.3 3.35 3.743-2.09a1 1 0 000-1.74l-3.743-2.87z" fill="#FBBC04" />
                      <path d="M3.61 1.814L13.793 12l3.3-3.35L4.396 1.098c-.25-.134-.522-.178-.786-.116V1.814z" fill="#EA4335" />
                      <path d="M3.61 22.186L17.092 15.35 13.793 12 3.61 22.186z" fill="#34A853" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] leading-tight text-amber-200/50">{t('appDownload.installOn')}</div>
                      <div className="text-sm font-semibold text-amber-100">{t('appDownload.googlePlay')}</div>
                    </div>
                  </motion.button>
                )}

                {/* App Store / iOS install button */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstallClick}
                  className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-stone-900 px-5 py-3 shadow-lg shadow-amber-900/10 transition-colors hover:border-amber-500/40 hover:bg-stone-800"
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" fillOpacity="0.9">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] leading-tight text-amber-200/50">{t('appDownload.installOn')}</div>
                    <div className="text-sm font-semibold text-amber-100">{t('appDownload.appStore')}</div>
                  </div>
                </motion.button>
              </div>

              <p className="mt-4 text-xs text-amber-200/40">
                {t('appDownload.freeInstallNote')}
              </p>
            </motion.div>

            {/* Right - Benefits list */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col justify-center"
            >
              <h3 className="mb-6 text-xl font-bold text-amber-100 sm:text-2xl">
                {t('appDownload.whyYoullLove')}
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {getBenefits(t).map((benefit, i) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="group rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 backdrop-blur-sm transition-colors hover:border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 transition-colors group-hover:bg-amber-500/20">
                        <benefit.icon className="h-4 w-4 text-amber-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-amber-100">
                        {benefit.title}
                      </h4>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-200/50">
                      {benefit.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* CTA at bottom of benefits */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
              >
                {canInstall ? (
                  <Button
                    size="lg"
                    onClick={handleInstallClick}
                    className="gap-2 bg-amber-600 px-8 py-6 text-base font-bold text-stone-950 transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Download className="h-5 w-5" />
                    {t('appDownload.installAppNow')}
                  </Button>
                ) : isInstalled ? (
                  <Button
                    size="lg"
                    className="gap-2 bg-emerald-600 px-8 py-6 text-base font-bold text-white"
                    disabled
                  >
                    <Check className="h-5 w-5" />
                    {t('appDownload.appInstalled')}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleInstallClick}
                    className="gap-2 bg-amber-600 px-8 py-6 text-base font-bold text-stone-950 transition-all duration-300 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Download className="h-5 w-5" />
                    {t('appDownload.installAppNow')}
                  </Button>
                )}
                <span className="flex items-center gap-1 text-xs text-amber-200/40">
                  <ChevronRight className="h-3 w-3" />
                  {t('appDownload.availableOnAllDevices')}
                </span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
