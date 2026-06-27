'use client';

import { useStore, type View } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingCart, Package, Menu, X, LogIn, LogOut, User, Shield, Gift, Sparkles, Download, Heart, UserCircle, Baby, Home, Briefcase, ChevronDown, ChevronRight, Building2, Sun, Moon, Users, Crown, Globe, DollarSign } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { showToast } from '@/hooks/use-toast-notification';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '@/i18n/config';
import { getAllStaticProducts } from '@/lib/static-products';
import type { LucideIcon } from 'lucide-react';
import { trackBug, snapshotProductsState } from '@/lib/bug-track';

interface CategoryChild {
  name: string;
  slug: string;
}

interface CategoryNavItem {
  name: string;
  slug: string;
  icon: LucideIcon;
  children: CategoryChild[];
  scrollToId?: string; // If set, clicking scrolls to this section ID on the home page
  viewId?: string; // If set, clicking navigates to this view instead of category
  disabled?: boolean; // If true, tab is shown but not clickable (e.g. no products yet)
}

const CATEGORY_NAV: CategoryNavItem[] = [
  {
    name: 'Couple',
    slug: 'couple',
    icon: Heart,
    children: [
      { name: 'Couple Friendly', slug: 'couple-friendly' },
    ],
  },
  {
    name: 'Men',
    slug: 'men',
    icon: User,
    children: [
      { name: 'Accessories', slug: 'men-accessories' },
      { name: 'Shirts', slug: 'men-shirts' },
      { name: 'T-Shirts & Polos', slug: 'men-tshirts' },
      { name: 'Fragrances', slug: 'men-fragrances' },
      { name: 'Watches', slug: 'men-watches' },
      { name: 'Leather Goods', slug: 'men-leather' },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    icon: UserCircle,
    children: [
      { name: 'Jewellery', slug: 'women-jewelry' },
      { name: 'Sarees', slug: 'women-sarees' },
      { name: 'Fashion', slug: 'women-fashion' },
      { name: 'Fragrances', slug: 'women-fragrances' },
      { name: 'Accessories', slug: 'women-accessories' },
    ],
  },
  {
    name: 'Home Decor',
    slug: 'home',
    icon: Home,
    children: [
      { name: 'Candles & Fragrances', slug: 'home-candles' },
      { name: 'Living', slug: 'home-living' },
    ],
  },
  {
    name: 'Office',
    slug: 'office',
    icon: Briefcase,
    children: [
      { name: 'Corporate Gifts', slug: 'office-corporate-gifts' },
      { name: 'Desk Accessories', slug: 'office-desk' },
      { name: 'Stationery', slug: 'office-stationery' },
    ],
  },
  {
    name: 'New Arrivals',
    slug: 'new-arrivals',
    icon: Sparkles,
    children: [],
  },
  {
    name: 'familyPacks',
    slug: 'family-packs',
    icon: Package,
    children: [],
    scrollToId: 'family-pack-section',
  },
  {
    name: 'Social',
    slug: 'social-connections',
    icon: Users,
    children: [],
    scrollToId: 'social-connections-section',
  },
  {
    name: 'Curate',
    slug: '3boxes-curate',
    icon: Crown,
    children: [],
    scrollToId: '3boxes-curate-section',
  },
  {
    name: 'Gallery',
    slug: 'ai-style-gallery',
    icon: Sparkles,
    children: [],
    scrollToId: 'ai-style-gallery',
  },
];

export function Header() {
  const { searchQuery, setSearch, setView, view, cartItems, wishlistItems, setCategory, selectedCategory, authUser, setAuthView, clearAuth, toggleGiftBuilder, appTheme, setAppTheme, locale, setLocale, currency, setCurrency, pendingScrollId, setPendingScrollId } = useStore();
  const { t } = useTranslation();

  const categoryKeyMap: Record<string, string> = {
    'Couple': 'header.couple',
    'Men': 'header.men',
    'Women': 'header.women',
    'Kids': 'header.kids',
    'Home Decor': 'header.home',
    'Office': 'header.office',
    'New Arrivals': 'header.newArrivals',
    'familyPacks': 'header.familyPacks',
    'Social': 'header.social',
    'Curate': 'header.curate',
    'Gallery': 'header.gallery',
  };

  const subCategoryKeyMap: Record<string, string> = {
    'Couple Friendly': 'header.subCategories.coupleGifts',
    'Accessories': 'header.subCategories.accessories',
    'Shirts': 'header.subCategories.shirts',
    'T-Shirts & Polos': 'header.subCategories.tshirts',
    'Fragrances': 'header.subCategories.fragrances',
    'Watches': 'header.subCategories.watches',
    'Leather Goods': 'header.subCategories.leatherGoods',
    'Jewellery': 'header.subCategories.jewelry',
    'Sarees': 'header.subCategories.sarees',
    'Fashion': 'categories.fashion',
    'Candles & Fragrances': 'categories.fragrances',
    'Living': 'categories.homeLiving',
    'Corporate Gifts': 'header.subCategories.corporateGifts',
    'Desk Accessories': 'header.subCategories.deskAccessories',
    'Stationery': 'header.subCategories.stationery',
  };

  const tc = (text: string): string => {
    const key = categoryKeyMap[text] || subCategoryKeyMap[text];
    if (key) {
      const translated = t(key);
      if (translated === key) return text;
      return translated;
    }
    return text;
  };

  const { canInstall, promptInstall } = usePWAInstall();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // ✅ pendingScrollId now comes from the global Zustand store (so hero-section.tsx,
  // footer.tsx, and other components can queue scrolls too). Previously it was a
  // local useState which made `setPendingScrollId is not a function` errors appear
  // in hero-section.tsx and footer.tsx.
  const [mounted, setMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false); // tracks search input focus (for white bg + autocomplete dropdown)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null); // tracks which category is expanded in mobile drawer
  const [langDropdownOpen, setLangDropdownOpen] = useState(false); // mobile drawer language dropdown
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false); // mobile drawer currency dropdown
  const searchContainerRef = useRef<HTMLDivElement>(null); // for click-outside detection on autocomplete
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = Array.isArray(wishlistItems) ? wishlistItems.length : 0;

  // Product names for autocomplete (deduplicated, sorted alphabetically)
  const productNames = useMemo(() => {
    try {
      const products = getAllStaticProducts();
      const names = products.map((p) => p.name).filter(Boolean);
      return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, []);

  // Autocomplete suggestions: top 5 product names that start with the current query (case-insensitive)
  const searchSuggestions = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q || !searchFocused) return [];
    return productNames
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [localSearch, searchFocused, productNames]);

  // Click-outside handler for search autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart search: maps search terms to categories or scroll targets
  const SEARCH_CATEGORY_MAP: Record<string, { type: 'category'; slug: string } | { type: 'scroll'; target: string }> = {
    'men': { type: 'category', slug: 'men' },
    'mens': { type: 'category', slug: 'men' },
    'man': { type: 'category', slug: 'men' },
    'women': { type: 'category', slug: 'women' },
    'womens': { type: 'category', slug: 'women' },
    'woman': { type: 'category', slug: 'women' },
    'ladies': { type: 'category', slug: 'women' },
    'couple': { type: 'category', slug: 'couple' },
    'couples': { type: 'category', slug: 'couple' },
    'home': { type: 'category', slug: 'home' },
    'home decor': { type: 'category', slug: 'home' },
    'decor': { type: 'category', slug: 'home' },
    'office': { type: 'category', slug: 'office' },
    'corporate': { type: 'category', slug: 'office' },
    'new arrivals': { type: 'category', slug: 'new-arrivals' },
    'new': { type: 'category', slug: 'new-arrivals' },
    'arrivals': { type: 'category', slug: 'new-arrivals' },
    'family packs': { type: 'scroll', target: 'family-pack-section' },
    'family': { type: 'scroll', target: 'family-pack-section' },
    'family pack': { type: 'scroll', target: 'family-pack-section' },
    'social': { type: 'scroll', target: 'social-connections-section' },
    'curate': { type: 'scroll', target: '3boxes-curate-section' },
    '3 boxes curate': { type: 'scroll', target: '3boxes-curate-section' },
    '3boxes curate': { type: 'scroll', target: '3boxes-curate-section' },
    'gallery': { type: 'scroll', target: 'ai-style-gallery' },
    'ai gallery': { type: 'scroll', target: 'ai-style-gallery' },
  };

  const smartSearch = useCallback((query: string) => {
    const normalized = query.trim().toLowerCase();
    const match = SEARCH_CATEGORY_MAP[normalized];
    if (match) {
      if (match.type === 'category') {
        // Set category filter instead of text search
        setSearch('');
        setCategory(match.slug);
        setView('home');
        trackBug('CLICK', `[Smart Search] "${query}" → category="${match.slug}"`);
        setTimeout(() => setPendingScrollId('products'), 50);
        return true;
      } else {
        // Scroll to section instead of searching
        setSearch('');
        setCategory(null);
        setView('home');
        trackBug('CLICK', `[Smart Search] "${query}" → scroll to #${match.target}`);
        setTimeout(() => setPendingScrollId(match.target), 50);
        return true;
      }
    }
    return false;
  }, [setSearch, setCategory, setView, setPendingScrollId]);

  // Helper: handle suggestion click — fills search and triggers search
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setLocalSearch(suggestion);
    // Try smart search first
    if (smartSearch(suggestion)) {
      setSearchFocused(false);
      return;
    }
    // Normal search fallback
    setSearch(suggestion);
    setCategory(null);
    setView('home');
    setSearchFocused(false);
    trackBug('CLICK', `[Search Suggestion] clicked: "${suggestion}" — queuing scroll to #products`);
    setTimeout(() => setPendingScrollId('products'), 50);
  }, [setSearch, setCategory, setView, setPendingScrollId, smartSearch]);

  // Helper: toggle category expansion in mobile drawer
  const toggleCategoryExpand = useCallback((slug: string) => {
    setExpandedCategory((prev) => (prev === slug ? null : slug));
  }, []);

  // Helper: change language from mobile drawer dropdown
  const handleLanguageChange = useCallback((code: string) => {
    setLocale(code);
    setLangDropdownOpen(false);
  }, [setLocale]);

  // Helper: change currency from mobile drawer dropdown
  const handleCurrencyChange = useCallback((code: string) => {
    setCurrency(code);
    setCurrencyDropdownOpen(false);
    // Persist to localStorage (same pattern as CurrencySwitcher)
    try {
      const saved = localStorage.getItem('3boxes_locale');
      const prefs = saved ? JSON.parse(saved) : {};
      prefs.currency = code;
      localStorage.setItem('3boxes_locale', JSON.stringify(prefs));
    } catch {}
  }, [setCurrency]);

  // Current currency object (for the dropdown button label)
  const currentCurrency = useMemo(
    () => SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0],
    [currency]
  );

  // Current language object (for the dropdown button label)
  const currentLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0],
    [locale]
  );

  // Fix hydration mismatch - only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!localSearch.trim()) return;
      // Try smart search first — if it matches a category, use category filter
      if (smartSearch(localSearch)) {
        setSearchFocused(false);
        return;
      }
      // Normal search fallback
      setSearch(localSearch);
      setCategory(null);
      setView('home');
      trackBug('CLICK', `[Search] submitted: "${localSearch}" — queuing scroll to #products`);
      setTimeout(() => setPendingScrollId('products'), 50);
    },
    [localSearch, setSearch, setCategory, setView, setPendingScrollId, smartSearch]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleDashboard = () => {
    if (!authUser) return;
    switch (authUser.role) {
      case 'admin': setView('admin-dashboard'); break;
      case 'user': setView('wishlist'); break;
      case 'agent': setView('agent-dashboard'); break;
      case 'team': setView('team-dashboard'); break;
      case 'corporate': setView('corporate-dashboard'); break;
    }
  };

  // Robust scroll-to-section: polls until the element is present in the DOM,
  // then scrolls so the FIRST HEADING inside the section sits exactly at the
  // top of the visible area (just under the sticky header).
  //
  // ✅ FIX (latest): The previous version used scrollIntoView() + 700ms/1300ms
  // re-adjustments. The re-adjustments were causing the page to "jump back up"
  // because lazy-loaded images above the target shifted layout AFTER the initial
  // scroll, making the heading appear to move. The re-adjustment then tried to
  // re-align by scrolling AGAIN, which overcorrected.
  //
  // New approach:
  // 1. Wait for the target element to mount
  // 2. Use window.scrollTo() with absolute coordinates (header.height + 16px offset)
  // 3. Schedule ONE re-adjustment at 800ms ONLY IF the heading is actually
  //    hidden under the sticky header (top < 100px). This prevents the "jump up".
  // 4. Do NOT re-adjust if the heading is already visible — even if it's not
  //    at the "perfect" position. This avoids the visual jump.
  const scrollToSectionById = useCallback((id: string) => {
    trackBug('CLICK', `[Nav Tab] scrollToSectionById("${id}") called`);
    trackBug('STATE', 'Before scroll', { targetId: id, ...snapshotProductsState() });

    let attempts = 0;
    const maxAttempts = 100; // 100 * 50ms = 5s max wait

    // Compute the REAL sticky-header height by measuring the actual <header>
    // element's height. Note: we use height (not bottom), because bottom is
    // viewport-relative and returns huge negative numbers when scrolled.
    const computeHeaderHeight = (): number => {
      const headerEl = document.querySelector('header') as HTMLElement | null;
      if (!headerEl) return 120;
      return headerEl.offsetHeight;
    };

    // Final landing position: heading top should be at (headerHeight + 16px) from viewport top.
    // ✅ We use `behavior: 'auto'` (instant) for re-adjustments to avoid visible
    // "jump" animations. The initial scroll is smooth (user sees the page glide),
    // then any re-adjustment snaps silently to the final position.
    const scrollToTarget = (target: HTMLElement, smooth: boolean = true) => {
      const headerHeight = computeHeaderHeight();
      const targetTop = target.getBoundingClientRect().top;
      const currentScroll = window.pageYOffset;
      const finalScrollY = currentScroll + targetTop - headerHeight - 16;

      trackBug('SCROLL', `window.scrollTo — target heading to y=${Math.max(0, finalScrollY)}px (${smooth ? 'smooth' : 'instant'})`, {
        headerHeight,
        targetTop,
        currentScroll,
        finalScrollY: Math.max(0, finalScrollY),
        smooth,
      });
      window.scrollTo({
        top: Math.max(0, finalScrollY),
        behavior: smooth ? 'smooth' : 'auto',
      });
    };

    const tryScroll = () => {
      attempts++;
      const el = document.getElementById(id);
      trackBug('STATE', `tryScroll attempt ${attempts}/100 — #${id} found: ${!!el}`);
      if (el) {
        // Prefer the first heading inside the section for precise alignment.
        const heading = el.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
        const target = heading || el;

        // Initial scroll — smooth so the user sees the page glide to the heading
        scrollToTarget(target, true);

        // ✅ The ideal heading top position is (headerHeight + 16)px from viewport top.
        // After the initial smooth scroll, lazy-loaded images above the target may
        // finish loading and shift layout — pushing the heading DOWN (below ideal)
        // or pulling it UP (under the header). We re-align in BOTH directions,
        // using INSTANT (non-smooth) scrolling so the user doesn't see a visible
        // "jump animation" — the heading just silently appears at the right spot.
        const reAlignIfNeeded = (delayMs: number) => {
          setTimeout(() => {
            const stillThere = document.getElementById(id);
            if (!stillThere) return;
            const stillHeading = stillThere.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
            const t = stillHeading || stillThere;
            const actualTop = t.getBoundingClientRect().top;
            const currentIdealTop = computeHeaderHeight() + 16;

            // Re-align if heading is more than 8px off from ideal in EITHER direction
            if (Math.abs(actualTop - currentIdealTop) > 8) {
              trackBug('SCROLL', `Re-align at ${delayMs}ms — heading off by ${actualTop - currentIdealTop}px (instant)`, {
                targetId: id,
                actualTop,
                idealTop: currentIdealTop,
                delta: actualTop - currentIdealTop,
              });
              scrollToTarget(t, false);  // false = instant (no visible jump)
            } else {
              trackBug('SCROLL', `Re-align skipped at ${delayMs}ms — heading within 8px of ideal (top=${actualTop}px, ideal=${currentIdealTop}px)`, {
                targetId: id,
                actualTop,
                idealTop: currentIdealTop,
              });
            }
          }, delayMs);
        };

        // Check at 500ms (after smooth scroll completes), 1000ms (catch lazy images), 1800ms (final)
        reAlignIfNeeded(500);
        reAlignIfNeeded(1000);
        reAlignIfNeeded(1800);
      } else if (attempts < maxAttempts) {
        setTimeout(tryScroll, 50);
      } else {
        trackBug('ERROR', `#${id} NOT found after 100 attempts (5s) — giving up`);
      }
    };
    // Small initial delay to let the React state update flush
    setTimeout(tryScroll, 50);
  }, []);

  // When view changes to 'home' and there's a pending scroll target, perform the scroll.
  // This reliably handles transitions from other views (e.g., social-style) back to home,
  // because the target section elements only exist AFTER the home view has rendered.
  // Without this gate, scrollToSectionById polls while the old view is still mounted
  // and gives up before the home view's sections appear in the DOM.
  useEffect(() => {
    if (view === 'home' && pendingScrollId) {
      scrollToSectionById(pendingScrollId);
      setPendingScrollId(null);
    }
  }, [view, pendingScrollId, scrollToSectionById]);

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-600/20 text-red-400 border-red-600/30',
    user: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    agent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    team: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    corporate: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  };

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md ${mounted && appTheme === 'light' ? 'border-b border-amber-200/50 bg-white/95' : 'border-b border-amber-900/30 bg-stone-950/95'}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-24 items-center justify-between gap-1 sm:gap-1.5 md:justify-center md:gap-6 lg:gap-8">
          {/* Mobile Hamburger Icon (☰) — opens slide-in drawer from LEFT */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-300 -ml-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile Logo — small logo icon ONLY (text removed in v7), taps to go home */}
          <button
            onClick={() => {
              setView('home');
              setSearch('');
              setLocalSearch('');
              setCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="md:hidden flex-shrink-0 flex items-center"
            aria-label="3 BOXES LUXURY home"
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <Image
                src="/images/logo-uploaded.png"
                alt="3 Boxes Luxury Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain sepia-[0.8] hue-rotate-[10deg] saturate-[1.8] brightness-110 mix-blend-lighten drop-shadow-[0_0_10px_rgba(212,164,55,0.6)] drop-shadow-[0_0_4px_rgba(245,230,163,0.4)]"
                priority
              />
            </div>
          </button>

          {/* Logo — Desktop only (full logo with full brand name) */}
          <button
            onClick={() => {
              setView('home');
              setSearch('');
              setLocalSearch('');
              setCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hidden md:flex flex-shrink-0 items-center gap-2 sm:gap-[22px] group"
          >
            <div className="relative flex h-12 w-12 sm:h-[88px] sm:w-[88px] items-center justify-center">
              <Image
                src="/images/logo-uploaded.png"
                alt="3 Boxes Luxury Logo"
                width={88}
                height={88}
                className="h-12 w-12 sm:h-[88px] sm:w-[88px] object-contain sepia-[0.8] hue-rotate-[10deg] saturate-[1.8] brightness-110 mix-blend-lighten drop-shadow-[0_0_14px_rgba(212,164,55,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]"
                priority
              />
            </div>
            <h1 className="gold-shimmer text-base font-bold tracking-wider sm:text-[26px] sm:tracking-widest block">
              3 BOXES LUXURY
            </h1>
          </button>

          {/* Search Bar - Desktop (in top bar, unchanged) */}
          <form onSubmit={handleSearch} className="hidden md:flex w-[185px] shrink-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/60" />
              <Input
                value={localSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalSearch(val);
                  // If user clears the search text, reset all filters to show all products
                  if (!val.trim()) {
                    setSearch('');
                    setCategory(null);
                  }
                }}
                placeholder={t('header.searchPlaceholder')}
                className="w-full h-9 text-sm border-amber-900/40 bg-stone-900/50 pl-10 pr-4 text-amber-50 placeholder:text-amber-200/30 placeholder:whitespace-nowrap focus:border-amber-600/60 focus:ring-amber-600/30"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    setSearch('');
                    setCategory(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 hover:text-amber-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* NOTE: Mobile search bar is NO LONGER in the top bar (v7).
              It has been MOVED to a full-width row UNDER the navigation bar (see below). */}

          {/* Spacer to push actions to the right on mobile (since search bar is gone from top bar) */}
          <div className="md:hidden flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Install App Button — DESKTOP ONLY (with text) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (canInstall) {
                  promptInstall();
                } else {
                  const section = document.getElementById('app-download');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hidden lg:flex items-center gap-1.5 border-amber-500/40 bg-amber-600/10 text-amber-300 hover:bg-amber-600/20 hover:text-amber-200 hover:border-amber-500/60"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs font-medium">{t('header.installApp')}</span>
            </Button>

            {/* Install App Icon — MOBILE ONLY (icon only, in top bar) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (canInstall) {
                  promptInstall();
                } else {
                  const section = document.getElementById('app-download');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="md:hidden text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-300"
              aria-label={t('header.installApp')}
            >
              <Download className="h-5 w-5" />
            </Button>

            {/* Theme Toggle (Desktop only — mobile uses hamburger drawer) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
              className={`hidden md:flex ${mounted && appTheme === 'light' ? 'text-stone-600 hover:bg-amber-100/50 hover:text-amber-700' : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400'}`}
              aria-label={appTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && appTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Locale Switcher — DESKTOP ONLY (mobile uses LocaleSwitcherMobile in drawer) */}
            <div className="hidden md:block">
              <LocaleSwitcher />
            </div>

            {/* Orders — DESKTOP ONLY (mobile uses hamburger drawer) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('orders')}
              className="hidden md:flex text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label={t('common.orders')}
            >
              <Package className="h-5 w-5" />
            </Button>

            {/* Gift Builder — DESKTOP ONLY */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleGiftBuilder}
              className="hidden md:flex items-center gap-1.5 text-amber-300/80 hover:bg-amber-900/20 hover:text-amber-300 border border-amber-600/30 hover:border-amber-500/50"
            >
              <Gift className="h-4 w-4" />
              <span className="text-xs font-medium">{t('nav.giftBuilder')}</span>
              <Sparkles className="h-3 w-3 text-amber-400/60" />
            </Button>

            {/* Login / Profile — DESKTOP ONLY (mobile uses hamburger drawer) */}
            {mounted && authUser ? (
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDashboard}
                  className="flex items-center gap-1 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 px-1.5"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                    {authUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs">{authUser.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { clearAuth(); setView('home'); showToast('success', 'You have been signed out successfully.') }}
                  className="h-8 w-8 text-amber-200/40 hover:bg-red-900/20 hover:text-red-400"
                  aria-label={t('common.signOut')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthView('login')}
                className="hidden md:flex border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-600/30 hover:text-amber-100 hover:border-amber-500/60 gap-1.5 px-3 py-1.5 font-medium shadow-sm shadow-amber-900/20"
                aria-label={t('common.signIn')}
              >
                <LogIn className="h-4 w-4" />
                <span className="text-xs">{t('common.signIn')}</span>
              </Button>
            )}

            {/* Wishlist — Heart icon with item count badge. Shown on BOTH mobile and desktop, placed BEFORE the cart. */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('wishlist')}
              className="relative text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label="View wishlist"
            >
              <Heart className="h-5 w-5" />
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Cart — kept on BOTH mobile and desktop (primary action with item count badge) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('cart')}
              className="relative text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label={t('common.viewCart')}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-stone-950"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE HAMBURGER DRAWER (Myntra-style slide-in from LEFT) ─── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="border-amber-900/30 bg-stone-950 p-0 w-[85vw] max-w-[340px] overflow-y-auto"
        >
          {/* Header: Logo only — the Sheet component renders ONE built-in X close button at top-right (no duplicate) */}
          <SheetTitle asChild>
            <div className="flex items-center border-b border-amber-900/30 bg-stone-900/60 px-4 py-4 pr-12">
              <div className="flex items-center gap-2">
                <div className="relative flex h-9 w-9 items-center justify-center">
                  <Image
                    src="/images/logo-uploaded.png"
                    alt="3 Boxes Luxury Logo"
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain sepia-[0.8] hue-rotate-[10deg] saturate-[1.8] brightness-110 mix-blend-lighten drop-shadow-[0_0_14px_rgba(212,164,55,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]"
                  />
                </div>
                <span className="gold-shimmer text-base font-bold tracking-wider">
                  3 BOXES LUXURY
                </span>
              </div>
            </div>
          </SheetTitle>

          <div className="flex flex-col">
            {/* User Profile Section */}
            {mounted && authUser ? (
              <button
                onClick={() => { handleDashboard(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 border-b border-amber-900/20 px-4 py-4 text-left transition-colors hover:bg-amber-900/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/20 text-sm font-bold text-amber-400">
                  {authUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-100 truncate">Hi, {authUser.name}</p>
                  <p className="text-xs text-amber-200/50 capitalize">View Dashboard ({authUser.role}) ›</p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => { setAuthView('login'); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 border-b border-amber-900/20 px-4 py-4 text-left transition-colors hover:bg-amber-900/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/20">
                  <User className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-100">Welcome to 3BOXES</p>
                  <p className="text-xs text-amber-200/50">Sign in to your account ›</p>
                </div>
              </button>
            )}

            {/* Home Decor Button (renamed from 'Home' per user request) */}
            <button
              onClick={() => {
                setView('home');
                setSearch('');
                setLocalSearch('');
                setCategory(null);
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 border-b border-amber-900/20 px-4 py-3 text-left text-sm font-medium text-amber-100 transition-colors hover:bg-amber-900/10"
            >
              <Home className="h-5 w-5 text-amber-400" />
              Home Decor
            </button>

            {/* ─── SHOP BY CATEGORY ─── */}
            <div className="border-b border-amber-900/20 py-2">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
                Shop by Category
              </p>
              {CATEGORY_NAV.filter((cat) =>
                ['couple', 'men', 'women', 'home', 'office', 'new-arrivals', 'family-packs'].includes(cat.slug)
              ).map((cat) => {
                const Icon = cat.icon;
                const hasChildren = cat.children.length > 0;
                const isExpanded = expandedCategory === cat.slug;

                // For categories WITH children: tap toggles expand/collapse (does NOT navigate)
                // For categories WITHOUT children: tap navigates (scrolls to section / sets category / sets view)
                const handleCatClick = () => {
                  if (cat.disabled) return;
                  if (hasChildren) {
                    toggleCategoryExpand(cat.slug);
                  } else {
                    if (cat.scrollToId) {
                      setView('home');
                      setCategory(null);
                      setPendingScrollId(cat.scrollToId);
                    } else if (cat.viewId) {
                      setView(cat.viewId as View);
                      setCategory(null);
                    } else {
                      // ✅ FIX: previously just setCategory(cat.slug) with no scroll.
                      // Now switch to home view and queue a scroll to #products so
                      // the mobile user lands on the filtered product grid.
                      setView('home');
                      setCategory(cat.slug);
                      trackBug('CLICK', `[Mobile Menu] \"${cat.name}\" clicked — queuing scroll to #products`);
                      setTimeout(() => setPendingScrollId('products'), 50);
                    }
                    setMobileMenuOpen(false);
                  }
                };

                return (
                  <div key={cat.slug}>
                    <button
                      onClick={handleCatClick}
                      disabled={cat.disabled}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        cat.disabled
                          ? 'text-amber-200/20 cursor-not-allowed'
                          : 'text-amber-200/80 hover:bg-amber-900/10 hover:text-amber-100'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${cat.disabled ? 'text-amber-400/20' : 'text-amber-400/70'}`} />
                      <span className="flex-1">{tc(cat.name)}</span>
                      {cat.disabled && (
                        <span className="rounded bg-stone-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200/30">
                          Soon
                        </span>
                      )}
                      {hasChildren ? (
                        <ChevronRight
                          className={`h-4 w-4 text-amber-500/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-amber-500/40" />
                      )}
                    </button>

                    {/* Sub-categories (only shown when this category is expanded) */}
                    {hasChildren && isExpanded && (
                      <div className="border-l border-amber-900/20 ml-7 my-1">
                        {/* "All {Category}" link — sets parent category filter */}
                        <button
                          onClick={() => {
                            // ✅ FIX: navigate to home + scroll to #products
                            trackBug('CLICK', `[Mobile Menu "All ${cat.name}"] clicked — queuing scroll to #products`);
                            setView('home');
                            setCategory(cat.slug);
                            setTimeout(() => setPendingScrollId('products'), 50);
                            setMobileMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-amber-300/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
                        >
                          <span className="h-1 w-1 rounded-full bg-amber-400/60" />
                          <span>{t('common.all')} {tc(cat.name)}</span>
                        </button>
                        {cat.children.map((child) => (
                          <button
                            key={child.slug}
                            onClick={() => {
                              // ✅ FIX: navigate to home + scroll to #products
                              trackBug('CLICK', `[Mobile Menu Subcategory] "${child.name}" clicked — queuing scroll to #products`);
                              setView('home');
                              setCategory(child.slug);
                              setTimeout(() => setPendingScrollId('products'), 50);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs transition-colors hover:bg-amber-900/10 hover:text-amber-100 ${
                              selectedCategory === child.slug
                                ? 'text-amber-300 bg-amber-900/20'
                                : 'text-amber-200/70'
                            }`}
                          >
                            <span className={`h-1 w-1 rounded-full ${
                              selectedCategory === child.slug ? 'bg-amber-400' : 'bg-amber-600/50'
                            }`} />
                            <span>{tc(child.name)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── DISCOVER ─── */}
            <div className="border-b border-amber-900/20 py-2">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
                Discover
              </p>
              {CATEGORY_NAV.filter((cat) =>
                ['social-connections', '3boxes-curate', 'ai-style-gallery'].includes(cat.slug)
              ).map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      if (cat.scrollToId) {
                        setView('home');
                        setCategory(null);
                        setPendingScrollId(cat.scrollToId);
                      } else if (cat.viewId) {
                        setView(cat.viewId as View);
                        setCategory(null);
                      } else {
                        setCategory(cat.slug);
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
                  >
                    <Icon className="h-4 w-4 text-amber-400/70" />
                    <span className="flex-1">{tc(cat.name)}</span>
                    <ChevronRight className="h-4 w-4 text-amber-500/40" />
                  </button>
                );
              })}
            </div>

            {/* ─── MY ACCOUNT ─── */}
            <div className="border-b border-amber-900/20 py-2">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
                My Account
              </p>

              {/* Wishlist */}
              <button
                onClick={() => { setView('wishlist'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                <Heart className="h-4 w-4 text-rose-400/80" />
                <span className="flex-1">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Order History */}
              <button
                onClick={() => { setView('orders'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                <Package className="h-4 w-4 text-amber-400/70" />
                <span className="flex-1">Order History</span>
                <ChevronRight className="h-4 w-4 text-amber-500/40" />
              </button>

              {/* Shopping Cart */}
              <button
                onClick={() => { setView('cart'); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                <ShoppingCart className="h-4 w-4 text-amber-400/70" />
                <span className="flex-1">Shopping Cart</span>
                {totalItems > 0 && (
                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Gift Builder */}
              <button
                onClick={() => { toggleGiftBuilder(); setMobileMenuOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                <Gift className="h-4 w-4 text-amber-400/70" />
                <span className="flex-1">{t('header.giftBuilder')}</span>
                <Sparkles className="h-3 w-3 text-amber-400/50" />
              </button>

              {/* Sign In / Logout */}
              {mounted && authUser ? (
                <button
                  onClick={() => {
                    clearAuth();
                    setView('home');
                    setMobileMenuOpen(false);
                    showToast('success', 'You have been signed out successfully.');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400/80 transition-colors hover:bg-red-900/20 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="flex-1">Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => { setAuthView('login'); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-300 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="flex-1">Sign In</span>
                </button>
              )}
            </div>

            {/* ─── SUPPORT ─── */}
            <div className="py-2">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
                Support
              </p>

              {/* Install App */}
              <button
                onClick={() => {
                  if (canInstall) {
                    promptInstall();
                  } else {
                    const section = document.getElementById('app-download');
                    section?.scrollIntoView({ behavior: 'smooth' });
                  }
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                <Download className="h-4 w-4 text-amber-400/70" />
                <span className="flex-1">{t('header.installApp')}</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-200/80 transition-colors hover:bg-amber-900/10 hover:text-amber-100"
              >
                {mounted && appTheme === 'dark' ? <Sun className="h-4 w-4 text-amber-400/70" /> : <Moon className="h-4 w-4 text-amber-400/70" />}
                <span className="flex-1">{mounted && appTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>

              {/* Language Dropdown — replaces the horizontal button list. English pre-selected by default. */}
              <div className="px-4 py-2 relative">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-amber-400/70 flex-shrink-0" />
                  <span className="text-sm text-amber-200/80 flex-1">Language</span>
                  <button
                    onClick={() => {
                      setLangDropdownOpen((v) => !v);
                      setCurrencyDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-amber-900/40 bg-stone-900/60 px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:border-amber-600/50 hover:bg-amber-900/10"
                  >
                    <span>{currentLanguage.nativeName}</span>
                    <ChevronDown className={`h-3 w-3 text-amber-400/60 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {langDropdownOpen && (
                  <div className="mt-1.5 w-full rounded-md border border-amber-900/40 bg-stone-900 py-1 shadow-xl max-h-60 overflow-y-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                          locale === lang.code
                            ? 'bg-amber-600/20 text-amber-300'
                            : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-100'
                        }`}
                      >
                        <span>{lang.nativeName}</span>
                        <span className="text-[10px] text-amber-400/40 uppercase">{lang.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Dropdown — NEW. INR pre-selected by default. */}
              <div className="px-4 py-2 relative">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-amber-400/70 flex-shrink-0" />
                  <span className="text-sm text-amber-200/80 flex-1">Currency</span>
                  <button
                    onClick={() => {
                      setCurrencyDropdownOpen((v) => !v);
                      setLangDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-amber-900/40 bg-stone-900/60 px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:border-amber-600/50 hover:bg-amber-900/10"
                  >
                    <span className="font-semibold">{currentCurrency.symbol}</span>
                    <span>{currentCurrency.code}</span>
                    <ChevronDown className={`h-3 w-3 text-amber-400/60 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {currencyDropdownOpen && (
                  <div className="mt-1.5 w-full rounded-md border border-amber-900/40 bg-stone-900 py-1 shadow-xl max-h-60 overflow-y-auto">
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => handleCurrencyChange(c.code)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                          currency === c.code
                            ? 'bg-amber-600/20 text-amber-300'
                            : 'text-amber-200/70 hover:bg-amber-900/10 hover:text-amber-100'
                        }`}
                      >
                        <span className="w-5 font-semibold">{c.symbol}</span>
                        <span>{c.code}</span>
                        <span className="ml-auto text-[10px] text-amber-400/40">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── MOBILE SEARCH BAR (under navigation, full width) ───
          - Shown ONLY on mobile (md:hidden)
          - Sits between the top bar and the category navigation row
          - White background when focused (with dark text)
          - Autocomplete dropdown appears below when typing (top 5 product name matches)
      */}
      <div className="md:hidden border-b border-amber-900/30 bg-stone-950/90 px-4 py-2" ref={searchContainerRef}>
        <form onSubmit={handleSearch} className="relative">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none transition-colors ${searchFocused ? 'text-stone-500' : 'text-amber-600/60'}`} />
            <Input
              value={localSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                // If user clears the search text, reset all filters to show all products
                if (!val.trim()) {
                  setSearch('');
                  setCategory(null);
                }
              }}
              onFocus={() => setSearchFocused(true)}
              placeholder={t('header.searchPlaceholder')}
              className={`w-full h-10 text-sm border transition-colors pl-10 pr-9 rounded-full ${
                searchFocused
                  ? 'border-amber-500 bg-white text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-amber-500/20'
                  : 'border-amber-900/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-200/40 focus:border-amber-600/60 focus:ring-amber-600/30'
              }`}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setSearch('');
                  setCategory(null);
                  setSearchFocused(false);
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${searchFocused ? 'text-stone-400 hover:text-stone-700' : 'text-amber-200/40 hover:text-amber-200'}`}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Autocomplete dropdown — top 5 product name matches */}
          {searchFocused && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-amber-200 bg-white shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100">
                Suggestions
              </div>
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-900"
                >
                  <Search className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Category Navigation Bar */}
      <div className="border-t border-amber-900/20 bg-stone-950/90">
        <div className="container mx-auto px-4">
          {/* Desktop: compact horizontal row — MOBILE NAV REMOVED (now lives in hamburger drawer) */}
          <nav className="hidden md:flex items-center justify-between w-full" aria-label="Category navigation">
            {CATEGORY_NAV.map((cat) => {
              const Icon = cat.icon;
              const hasChildren = cat.children.length > 0;
              const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);

              // Helper: handle nav item click — scroll to section, set view, or set category
              const handleNavClick = () => {
                if (cat.scrollToId) {
                  // Issue 12 & 18: Switch to home and queue scroll
                  if (view !== 'home') {
                    setView('home');
                  }
                  setCategory(null);
                  trackBug('CLICK', `[Nav Tab] "${cat.name}" clicked — scrollToId="${cat.scrollToId}"`);
                  // Slight delay to ensure setView has processed before queueing scroll
                  setTimeout(() => setPendingScrollId(cat.scrollToId!), 50);
                } else if (cat.viewId) {
                  trackBug('CLICK', `[Nav Tab] "${cat.name}" clicked — viewId="${cat.viewId}"`);
                  setView(cat.viewId as View);
                  setCategory(null);
                } else {
                  // Issue 12: Switch to home and set category
                  trackBug('CLICK', `[Nav Tab] "${cat.name}" clicked — setting category="${cat.slug}" and scrolling to #products`);
                  if (view !== 'home') {
                    setView('home');
                  }
                  setCategory(cat.slug);
                  // ✅ FIX: previously called window.scrollTo({top:0}) which left the user
                  // at the top of the page (hero section) instead of at the "All Products"
                  // heading. Now we queue a scroll to #products so the user lands on the
                  // filtered product grid below the hero.
                  setTimeout(() => setPendingScrollId('products'), 50);
                }
              };

              if (!hasChildren) {
                // No subcategories — click directly sets filter or scrolls to section
                return (
                  <button
                    key={cat.slug}
                    onClick={handleNavClick}
                    disabled={cat.disabled}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors rounded ${
                      cat.disabled
                        ? 'text-amber-200/20 cursor-not-allowed'
                        : isActive
                          ? 'bg-amber-900/30 text-amber-300'
                          : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tc(cat.name)}
                    {(cat.scrollToId || cat.viewId) && (
                      <span className="ml-0.5 rounded bg-amber-600/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400">
                        New
                      </span>
                    )}
                    {cat.slug === 'new-arrivals' && !cat.scrollToId && !cat.viewId && (
                      <span className="ml-0.5 rounded bg-amber-600/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400">
                        New
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={cat.slug}
                  className="group relative"
                  onMouseEnter={() => {
                    const el = document.getElementById(`dropdown-${cat.slug}`);
                    if (el) { el.style.visibility = 'visible'; el.style.opacity = '1'; }
                  }}
                  onMouseLeave={() => {
                    const el = document.getElementById(`dropdown-${cat.slug}`);
                    if (el) { el.style.visibility = 'hidden'; el.style.opacity = '0'; }
                  }}
                >
                  <button
                    onClick={() => {
                      if (cat.disabled) return;
                      // ✅ FIX: previously only setCategory(cat.slug) — which on non-home views
                      // (e.g. social-style) would NOT navigate back to home. Now we always
                      // switch to home view + queue a scroll to #products.
                      trackBug('CLICK', `[Nav Tab Parent] "${cat.name}" clicked — setting category="${cat.slug}" and queuing scroll to #products`);
                      if (view !== 'home') {
                        setView('home');
                      }
                      setCategory(cat.slug);
                      setTimeout(() => setPendingScrollId('products'), 50);
                    }}
                    disabled={cat.disabled}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors rounded ${
                      cat.disabled
                        ? 'text-amber-200/20 cursor-not-allowed'
                        : isActive
                          ? 'bg-amber-900/30 text-amber-300'
                          : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tc(cat.name)}
                    {cat.disabled && (
                      <span className="ml-0.5 rounded bg-stone-700/40 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-200/30">
                        Soon
                      </span>
                    )}
                    {!cat.disabled && <ChevronDown className="h-2.5 w-2.5 text-amber-500/50 transition-transform group-hover:rotate-180" />}
                  </button>

                  {/* Dropdown */}
                  <div
                    id={`dropdown-${cat.slug}`}
                    style={{ visibility: 'hidden', opacity: 0, transition: 'all 0.2s' }}
                    className="absolute top-full left-0 z-50 mt-0.5 min-w-[200px] rounded-lg border border-amber-900/30 bg-stone-950/98 backdrop-blur-md shadow-xl shadow-black/40 py-2"
                  >
                    {/* Parent category "All" link */}
                    <button
                      onClick={() => {
                        // ✅ FIX: navigate to home + scroll to #products
                        trackBug('CLICK', `[Dropdown "All ${cat.name}"] clicked — queuing scroll to #products`);
                        if (view !== 'home') {
                          setView('home');
                        }
                        setCategory(cat.slug);
                        setTimeout(() => setPendingScrollId('products'), 50);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-amber-300/90 font-medium transition-colors hover:bg-amber-900/20 hover:text-amber-200"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t('common.all')} {tc(cat.name)}
                    </button>
                    <div className="mx-3 my-1 border-t border-amber-900/20" />
                    {cat.children.map((child) => (
                      <button
                        key={child.slug}
                        onClick={() => {
                          // ✅ FIX: navigate to home + scroll to #products
                          trackBug('CLICK', `[Dropdown Subcategory] "${child.name}" clicked — queuing scroll to #products`);
                          if (view !== 'home') {
                            setView('home');
                          }
                          setCategory(child.slug);
                          setTimeout(() => setPendingScrollId('products'), 50);
                        }}
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-amber-900/20 hover:text-amber-300 ${
                          selectedCategory === child.slug
                            ? 'text-amber-300 bg-amber-900/20'
                            : 'text-amber-200/60'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedCategory === child.slug ? 'bg-amber-400' : 'bg-amber-600/50'
                        }`} />
                        {tc(child.name)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
