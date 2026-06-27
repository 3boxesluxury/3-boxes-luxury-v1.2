'use client';

import Image from 'next/image';
import { Smartphone, Download, Phone, Mail, MessageCircle, Palette, Zap, Users, GraduationCap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { useCallback } from 'react';
import { trackBug } from '@/lib/bug-track';

// Map of footer Shop links → search query terms that should match products in DB.
// Clicking a Shop link triggers a database search via /api/products?search=… and
// routes the user to the home view with the product grid filtered.
type ShopLink = { label: string; search: string };

const SHOP_LINKS: ShopLink[] = [
  { label: 'footer.watches',         search: 'watch' },
  { label: 'footer.jewellery',       search: 'jewel' },
  { label: 'footer.leatherGoods',    search: 'leather' },
  { label: 'footer.fragrances',      search: 'perfume' },
  { label: 'footer.fashion',         search: 'fashion' },
  { label: 'footer.homeLiving',      search: 'home decor' },
  { label: 'footer.sarees',          search: 'saree' },
  { label: 'footer.kidsFashion',     search: 'kids' },
];

export function Footer() {
  const { setView, setSearch, setCategory, setPendingScrollId } = useStore();
  const { t } = useTranslation();

  const handleInstallApp = () => {
    // Try to trigger PWA install prompt
    const event = new Event('trigger-pwa-install');
    window.dispatchEvent(event);

    // Fallback: scroll to the app download section
    const downloadSection = document.getElementById('app-download-section');
    if (downloadSection) {
      downloadSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Shop-link click → set search query, reset category, route to home, scroll to products grid.
  // The /api/products endpoint will return products matching the search term from the DB only.
  // If no products match, the ProductGrid's empty state will display "No products found".
  // ✅ FIX: previously used scrollToProducts() (a Zustand counter with NO listener) —
  // so the scroll never happened. Now we use setPendingScrollId('products') which is
  // consumed by the header's scrollToSectionById effect, which uses scrollIntoView.
  const handleShopLinkClick = useCallback((search: string) => {
    trackBug('CLICK', `[Footer Shop Link] clicked: "${search}" — queuing scroll to #products`);
    setSearch(search);
    setCategory(null);
    setView('home');
    setTimeout(() => setPendingScrollId('products'), 60);
  }, [setSearch, setCategory, setView, setPendingScrollId]);

  return (
    <footer className="mt-auto border-t border-amber-900/30 bg-stone-950">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <Image
                  src="/images/logo-uploaded.png"
                  alt="3 Boxes Luxury Logo"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain sepia-[0.8] hue-rotate-[10deg] saturate-[1.8] brightness-110 mix-blend-lighten drop-shadow-[0_0_14px_rgba(212,164,55,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]"
                />
              </div>
              <h3 className="gold-shimmer text-lg font-bold tracking-widest">
                3 BOXES LUXURY
              </h3>
            </div>
            <p className="mt-2 text-sm text-amber-200/50">
              {t('footer.brandDescription')}
            </p>
            {/* Social / Contact Icons */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://wa.me/919611533511"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.chatWhatsApp")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="tel:+919611533511"
                aria-label={t("footer.callUs")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href="mailto:info@3boxes.in"
                aria-label={t("footer.emailUs")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop — each link searches the DB for matching products (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.shop')}
            </h4>
            <ul className="mt-3 space-y-2">
              {SHOP_LINKS.map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => handleShopLinkClick(item.search)}
                  >
                    {t(item.label)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.company')}
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'footer.aboutUs',        view: 'about' },
                { label: 'footer.ourDivisions',   view: 'divisions' },
                { label: 'footer.careers',         view: 'careers' },
                { label: 'footer.press',           view: 'press' },
                { label: 'footer.sustainability',  view: 'sustainability' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {t(item.label)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.support')}
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span
                  className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                  onClick={() => setView('contact' as any)}
                >
                  {t('footer.contactUs')}
                </span>
                <p className="mt-0.5 text-xs text-amber-200/30">
                  info@3boxes.in · +91 9611533511
                </p>
              </li>
              {[
                { label: 'footer.shippingReturns', view: 'shipping' },
                { label: 'footer.faq',                view: 'faq' },
                { label: 'footer.sizeGuide',         view: 'size-guide' },
                { label: 'footer.trackOrder',        view: 'track-order' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {t(item.label)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.policies')}
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'footer.privacyPolicy',   view: 'privacy-policy'   },
                { label: 'footer.termsOfService', view: 'terms-of-service' },
                { label: 'footer.securityPolicy',  view: 'security-policy'  },
                { label: 'footer.cookiePolicy',    view: 'cookie-policy'    },
                { label: 'footer.refundPolicy',    view: 'refund-policy'    },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {t(item.label)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Features — "Social Style" renamed to "Social" (Issue 7).
              3 Boxes Curate & Family Shop scroll to home-page sections (v3 fix). */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              {t('footer.features')}
            </h4>
            <ul className="mt-3 space-y-2">
                {[
                { label: 'footer.social',          type: 'view',   target: 'social-style',     icon: Palette },
                { label: 'footer.threeBoxesCurate',  type: 'scroll', target: '3boxes-curate-section', icon: Zap },
                { label: 'footer.familyPacks',     type: 'scroll', target: 'family-pack-section',  icon: Users },
                { label: 'footer.knowledgeHub',   type: 'view',   target: 'wiki',             icon: GraduationCap },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer flex items-center gap-1.5"
                    onClick={() => {
                      if (item.type === 'view') {
                        trackBug('CLICK', `[Footer Feature Link] view: ${item.target}`);
                        setView(item.target as any);
                      } else {
                        // Use the same robust pendingScrollId mechanism as the header
                        // ✅ FIX: add small delay so setView('home') flushes before queueing scroll
                        trackBug('CLICK', `[Footer Feature Link] scroll to #${item.target}`);
                        setView('home');
                        setCategory(null);
                        setTimeout(() => setPendingScrollId(item.target), 60);
                      }
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {t(item.label)}
                    <span className="rounded bg-emerald-600/20 px-1 py-0.5 text-[8px] font-bold text-emerald-400">{t("footer.new")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Install App Section - Full Width */}
        <div className="mt-8 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
                {t('footer.installApp')}
              </h4>
              <p className="mt-1 text-sm text-amber-200/50">
                {t('footer.installAppDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/50"
              >
                <Smartphone className="h-4 w-4" />
                {t('footer.installAndroid')}
              </button>
              <button
                onClick={() => window.open('/app/', '_blank')}
                className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-stone-900/50 px-3 py-2 text-sm text-amber-200/60 transition-colors hover:bg-stone-800/50 hover:text-amber-200 hover:border-amber-500/30"
              >
                <Download className="h-4 w-4" />
                {t('footer.flutterWebApp')}
              </button>
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800/50">
                  <span className="text-lg">📱</span>
                </div>
                <div className="text-[10px] text-amber-200/30">
                  {t("footer.pwaLine1")}<br />{t("footer.pwaLine2")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-6 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-amber-200/40">
              {t("footer.copyright")}
            </p>
            <p className="text-xs text-amber-200/30">
              Bengaluru, India | info@3boxes.in | +91 9611533511
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
