'use client';

import Image from 'next/image';
import { Smartphone, Download, Phone, Mail, MessageCircle, Palette, Zap, Users, GraduationCap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useCallback } from 'react';

// Map of footer Shop links → search query terms that should match products in DB.
// Clicking a Shop link triggers a database search via /api/products?search=… and
// routes the user to the home view with the product grid filtered.
type ShopLink = { label: string; search: string };

const SHOP_LINKS: ShopLink[] = [
  { label: 'Watches',         search: 'watch' },
  { label: 'Jewellery',       search: 'jewel' },
  { label: 'Leather Goods',   search: 'leather' },
  { label: 'Fragrances',      search: 'perfume' },
  { label: 'Fashion',         search: 'fashion' },
  { label: 'Home & Living',   search: 'home decor' },
  { label: 'Sarees',          search: 'saree' },
  { label: 'Kids Fashion',    search: 'kids' },
];

export function Footer() {
  const { setView, setSearch, setCategory, scrollToProducts } = useStore();

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
  const handleShopLinkClick = useCallback((search: string) => {
    setSearch(search);
    setCategory(null);
    setView('home');
    setTimeout(() => scrollToProducts(), 60);
  }, [setSearch, setCategory, setView, scrollToProducts]);

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
              Luxury gifting, curated for every occasion. Personalised hampers, premium fragrances, and timeless pieces — handpicked and delivered across India.
            </p>
            {/* Social / Contact Icons */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://wa.me/919611533511"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="tel:+919611533511"
                aria-label="Call us"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href="mailto:info@3boxes.in"
                aria-label="Email us"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-stone-900/50 text-amber-200/50 transition-colors hover:bg-amber-600/20 hover:text-amber-300 hover:border-amber-500/40"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop — each link searches the DB for matching products (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              Shop
            </h4>
            <ul className="mt-3 space-y-2">
              {SHOP_LINKS.map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => handleShopLinkClick(item.search)}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              Company
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'About Us',        view: 'about' },
                { label: 'Our Divisions',   view: 'divisions' },
                { label: 'Careers',         view: 'careers' },
                { label: 'Press',           view: 'press' },
                { label: 'Sustainability',  view: 'sustainability' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Support — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              Support
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span
                  className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                  onClick={() => setView('contact' as any)}
                >
                  Contact Us
                </span>
                <p className="mt-0.5 text-xs text-amber-200/30">
                  info@3boxes.in · +91 9611533511
                </p>
              </li>
              {[
                { label: 'Shipping & Returns', view: 'shipping' },
                { label: 'FAQ',                view: 'faq' },
                { label: 'Size Guide',         view: 'size-guide' },
                { label: 'Track Order',        view: 'track-order' },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies — literal labels (Issue 7) */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              Policies
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'Privacy Policy',   view: 'privacy-policy'   },
                { label: 'Terms of Service', view: 'terms-of-service' },
                { label: 'Security Policy',  view: 'security-policy'  },
                { label: 'Cookie Policy',    view: 'cookie-policy'    },
                { label: 'Refund Policy',    view: 'refund-policy'    },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-200/50 transition-colors hover:text-amber-400 cursor-pointer"
                    onClick={() => setView(item.view as any)}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Features — "Social Style" renamed to "Social" (Issue 7).
              3 Boxes Curate & Family Shop scroll to home-page sections (v3 fix). */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-400/80">
              Features
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'Social',          type: 'view',   target: 'social-style',     icon: Palette },
                { label: '3 Boxes Curate',  type: 'scroll', target: '3boxes-curate-section', icon: Zap },
                { label: 'Family Shop',     type: 'scroll', target: 'family-pack-section',  icon: Users },
                { label: 'Knowledge Hub',   type: 'view',   target: 'wiki',             icon: GraduationCap },
              ].map((item, i) => (
                <li key={i}>
                  <span
                    className="text-sm text-amber-300/60 transition-colors hover:text-amber-400 cursor-pointer flex items-center gap-1.5"
                    onClick={() => {
                      if (item.type === 'view') {
                        setView(item.target as any);
                      } else {
                        // Scroll to a section on the home page.
                        // Pattern: route home, clear category, then queue the scroll.
                        setView('home');
                        setCategory(null);
                        // Use a small delay + retry loop to ensure the section exists.
                        const tryScroll = (attempts = 0) => {
                          const el = document.getElementById(item.target);
                          if (el) {
                            const heading = el.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
                            const headerEl = document.querySelector('header') as HTMLElement | null;
                            const offset = (headerEl ? headerEl.getBoundingClientRect().bottom : 100) + 20;
                            const top = (heading || el).getBoundingClientRect().top + window.pageYOffset - offset;
                            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                          } else if (attempts < 60) {
                            setTimeout(() => tryScroll(attempts + 1), 50);
                          }
                        };
                        setTimeout(tryScroll, 60);
                      }
                    }}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                    <span className="rounded bg-emerald-600/20 px-1 py-0.5 text-[8px] font-bold text-emerald-400">NEW</span>
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
                Install App
              </h4>
              <p className="mt-1 text-sm text-amber-200/50">
                Install our app directly — no app store needed. Shop luxury gifts on the go.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-300 transition-colors hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/50"
              >
                <Smartphone className="h-4 w-4" />
                Install Android App
              </button>
              <button
                onClick={() => window.open('/app/', '_blank')}
                className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-stone-900/50 px-3 py-2 text-sm text-amber-200/60 transition-colors hover:bg-stone-800/50 hover:text-amber-200 hover:border-amber-500/30"
              >
                <Download className="h-4 w-4" />
                Flutter Web App
              </button>
              <div className="flex items-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-800/50">
                  <span className="text-lg">📱</span>
                </div>
                <div className="text-[10px] text-amber-200/30">
                  Progressive Web App<br />Works offline &amp; fullscreen
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-6 border-t border-amber-900/20 pt-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-amber-200/40">
              © 2024 3 Boxes Luxury Curations. All rights reserved. Crafted with care.
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
