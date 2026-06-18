'use client';

import { useStore, type View } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Search, ShoppingCart, Package, Menu, X, LogIn, LogOut, User, Shield, Gift, Sparkles, Download, Heart, UserCircle, Baby, Home, Briefcase, ChevronDown, Building2, Sun, Moon, Users, Crown, Palette, Sofa } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { LocaleSwitcher, LocaleSwitcherMobile } from '@/components/locale-switcher';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { showToast } from '@/hooks/use-toast-notification';
import { FormattedPrice } from '@/components/formatted-price';
import type { LucideIcon } from 'lucide-react';

// ─── Search Suggestion Type ───
interface SearchSuggestion {
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  category: string | null;
  categorySlug: string | null;
}

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
}

// NOTE: 'Home' is intentionally NOT in CATEGORY_NAV — it is rendered as a separate
// centered item in the desktop nav bar (see render below) so it stays visually centered
// between the other items. 'Family Packs' was removed from this list per Issue 6 —
// it now lives only in the mobile hamburger menu's Discover section.
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
      { name: 'Jewelry', slug: 'women-jewelry' },
      { name: 'Sarees', slug: 'women-sarees' },
      { name: 'Fashion', slug: 'women-fashion' },
      { name: 'Fragrances', slug: 'women-fragrances' },
      { name: 'Accessories', slug: 'women-accessories' },
    ],
  },
  {
    name: 'Kids',
    slug: 'kids',
    icon: Baby,
    children: [
      { name: 'Toys & Games', slug: 'kids-toys' },
      { name: 'Kids Fashion', slug: 'kids-fashion' },
      { name: 'Shirts (5-18 yrs)', slug: 'kids-shirts' },
      { name: 'Dresses (5-18 yrs)', slug: 'kids-dresses' },
    ],
  },
  {
    name: 'Home',
    slug: 'home',
    icon: Home,
    children: [
      { name: 'Home Décor', slug: 'home-decor' },
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
  // 'Family Packs' removed from CATEGORY_NAV — moved to mobile Discover section
  {
    name: 'Social',
    slug: 'social-connections',
    icon: Users,
    children: [],
    scrollToId: 'social-connections-section',
  },
  {
    name: 'Social Style',
    slug: 'social-style',
    icon: Palette,
    children: [],
    viewId: 'social-style',
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
  const { searchQuery, setSearch, setView, view, cartItems, setCategory, selectedCategory, authUser, setAuthView, clearAuth, toggleGiftBuilder, appTheme, setAppTheme, scrollToProducts, selectProduct } = useStore();
  const { t } = useTranslation();
  const { canInstall, promptInstall } = usePWAInstall();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ─── Search Suggestions State ───
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fix hydration mismatch - only render after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!localSearch.trim()) return;
      setSearch(localSearch);
      setCategory(null);
      setView('home');
      setShowSuggestions(false);
      // Trigger scroll-to-products after a short delay to allow view change + render
      setTimeout(() => scrollToProducts(), 50);
    },
    [localSearch, setSearch, setCategory, setView, scrollToProducts]
  );

  // ─── Fetch DB-only search suggestions (debounced) ───
  // Queries /api/search/suggestions which reads ONLY from the database —
  // never falls back to Shopify. Returns product names matching the query.
  const fetchSuggestions = useCallback((query: string) => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    fetchTimerRef.current = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
          setActiveSuggestionIdx(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);
  }, []);

  // Cleanup fetch timer on unmount
  useEffect(() => {
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, []);

  // Close suggestions when clicking outside the search boxes
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target as Node) &&
          mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle suggestion click — navigate to the product detail page directly
  const handleSuggestionClick = useCallback((s: SearchSuggestion) => {
    setShowSuggestions(false);
    setLocalSearch('');
    setSearch('');
    // Find the product by slug — we use selectProduct with the slug as ID fallback.
    // The store's selectProduct expects a productId; we fetch it from the products list
    // via a lightweight API call, then navigate.
    fetch(`/api/products?search=${encodeURIComponent(s.name)}&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.products?.[0]?.id) {
          selectProduct(data.products[0].id);
        } else {
          // Fallback: just set the search query so the grid shows the product
          setSearch(s.name);
          setView('home');
          setTimeout(() => scrollToProducts(), 50);
        }
      })
      .catch(() => {
        setSearch(s.name);
        setView('home');
        setTimeout(() => scrollToProducts(), 50);
      });
  }, [selectProduct, setSearch, setView, scrollToProducts]);

  // Keyboard navigation inside the suggestions dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeSuggestionIdx >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeSuggestionIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIdx(-1);
    }
  };

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleDashboard = () => {
    if (!authUser) return;
    switch (authUser.role) {
      case 'admin': setView('admin-dashboard'); break;
      case 'user': setView('user-dashboard'); break;
      case 'agent': setView('agent-dashboard'); break;
      case 'team': setView('team-dashboard'); break;
      case 'corporate': setView('corporate-dashboard'); break;
    }
  };

  // Robust scroll-to-section: polls until the element is present in the DOM,
  // then scrolls so the FIRST HEADING inside the section sits exactly at the
  // top of the visible area (just under the sticky header).
  //
  // Why not scrollIntoView? Because the ID is usually on a wrapper div, not the
  // heading itself — so block:'start' aligns the wrapper top (often hidden under
  // the sticky header) rather than the heading. We instead locate the heading,
  // compute its absolute Y, and subtract the sticky header height so the heading
  // is fully visible right beneath the header bar.
  const scrollToSectionById = useCallback((id: string) => {
    let attempts = 0;
    const maxAttempts = 100; // 100 * 50ms = 5s max wait

    // Compute the dynamic sticky-header offset by measuring the real <header>
    // element. The header wraps the main bar AND the category nav bar (which
    // flex-wraps on mobile, so its height varies). Hardcoded offsets leave the
    // heading hidden behind the header; measuring header.bottom captures the
    // true rendered height every time.
    const computeHeaderOffset = (): number => {
      const headerEl = document.querySelector('header') as HTMLElement | null;
      if (!headerEl) return 120; // sensible fallback
      const headerRect = headerEl.getBoundingClientRect();
      // headerRect.bottom = pixels from viewport top to header's bottom edge.
      // Add 20px breathing room so the heading isn't flush against the header.
      return headerRect.bottom + 20;
    };

    // Perform the actual scroll alignment for a given target element.
    const alignToTarget = (target: HTMLElement) => {
      const headerOffset = computeHeaderOffset();
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    };

    const tryScroll = () => {
      attempts++;
      const el = document.getElementById(id);
      if (el) {
        // Prefer the first heading inside the section for precise alignment.
        // Fall back to the section element itself if no heading is found.
        const heading = el.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
        const target = heading || el;

        alignToTarget(target);

        // Follow-up re-adjustments: smooth scroll is async (~500ms), and images
        // / lazy-loaded content above the target can shift layout AFTER the
        // scroll completes — pushing the heading back under the header. We
        // re-measure and re-align at 700ms and 1300ms to correct any drift.
        [700, 1300].forEach((delay) => {
          setTimeout(() => {
            // Re-query in case the DOM changed; bail out silently if gone.
            const stillThere = document.getElementById(id);
            if (!stillThere) return;
            const stillHeading = stillThere.querySelector('h1, h2, h3, h4, h5, h6') as HTMLElement | null;
            const t = stillHeading || stillThere;
            // Only re-align if the heading is more than 8px off from where it
            // should be (just below the header). This avoids redundant scrolls.
            const desiredTop = computeHeaderOffset();
            const actualTop = t.getBoundingClientRect().top;
            if (Math.abs(actualTop - desiredTop) > 8) {
              alignToTarget(t);
            }
          }, delay);
        });
      } else if (attempts < maxAttempts) {
        setTimeout(tryScroll, 50);
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
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md ${mounted && appTheme === 'light' ? 'border-b border-amber-200/50 bg-white/95' : 'border-b border-amber-900/30 bg-stone-950/95'} ${view === 'cart' ? 'hidden md:block' : ''}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-24 items-center justify-between gap-1 sm:gap-1.5">
          {/* Logo */}
          <button
            onClick={() => {
              setView('home');
              setSearch('');
              setLocalSearch('');
              setCategory(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex-shrink-0 flex items-center gap-2 sm:gap-[22px] group"
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

          {/* Search Bar - Desktop (with DB-only autocomplete dropdown) */}
          <form onSubmit={handleSearch} className="hidden md:flex w-[185px] shrink-0">
            <div className="relative w-full" ref={desktopSearchRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/60 z-10" />
              <Input
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search luxury items…"
                className="w-full h-9 text-sm border-amber-900/40 bg-stone-900/50 pl-10 pr-4 text-amber-50 placeholder:text-amber-200/30 placeholder:whitespace-nowrap focus:border-amber-600/60 focus:ring-amber-600/30"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch('');
                    setSearch('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 hover:text-amber-200 z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Suggestions Dropdown — DB products only, white background (Issue 1) */}
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-amber-200 bg-white shadow-xl shadow-amber-900/10 py-1 max-h-[420px] overflow-y-auto z-50"
                  >
                    {isLoadingSuggestions && (
                      <div className="px-4 py-3 text-xs text-stone-500">Searching database…</div>
                    )}
                    {!isLoadingSuggestions && suggestions.length === 0 && (
                      <div className="px-4 py-3 text-xs text-stone-500">
                        No products match “{localSearch}” in your store.
                      </div>
                    )}
                    {!isLoadingSuggestions && suggestions.map((s, i) => (
                      <button
                        key={s.slug}
                        type="button"
                        onMouseEnter={() => setActiveSuggestionIdx(i)}
                        onClick={() => handleSuggestionClick(s)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                          i === activeSuggestionIdx ? 'bg-amber-50' : 'hover:bg-amber-50'
                        }`}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                          {s.image ? (
                            <img src={s.image} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-400">
                              <Search className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm text-stone-900">{s.name}</div>
                          <div className="text-[10px] text-stone-500">
                            {s.category ? `${s.category} · ` : ''}From DB
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-medium text-amber-700">
                          <FormattedPrice amount={s.price} />
                        </div>
                      </button>
                    ))}
                    {!isLoadingSuggestions && suggestions.length > 0 && (
                      <div className="border-t border-stone-200 mt-1 pt-1 px-3 py-1.5 text-[10px] text-stone-500">
                        Press <kbd className="rounded bg-stone-100 px-1">Enter</kbd> to search all results ·
                        <kbd className="rounded bg-stone-100 px-1 ml-1">↑↓</kbd> to navigate
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Install App Button */}
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
              <span className="text-xs font-medium">Install App</span>
            </Button>

            {/* Theme Toggle (Desktop) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
              className={`hidden md:flex ${mounted && appTheme === 'light' ? 'text-stone-600 hover:bg-amber-100/50 hover:text-amber-700' : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400'}`}
              aria-label={appTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && appTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* Locale Switcher (Desktop) */}
            <LocaleSwitcher />

            {/* Orders */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('orders')}
              className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
              aria-label={t('common.orders')}
            >
              <Package className="h-5 w-5" />
            </Button>

            {/* Gift Builder */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleGiftBuilder}
              className="hidden sm:flex items-center gap-1.5 text-amber-300/80 hover:bg-amber-900/20 hover:text-amber-300 border border-amber-600/30 hover:border-amber-500/50"
            >
              <Gift className="h-4 w-4" />
              <span className="text-xs font-medium">{t('nav.giftBuilder')}</span>
              <Sparkles className="h-3 w-3 text-amber-400/60" />
            </Button>

            {/* Login / Profile */}
            {mounted && authUser ? (
              <div className="flex items-center gap-1">
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
                className="border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-600/30 hover:text-amber-100 hover:border-amber-500/60 gap-1.5 px-3 py-1.5 font-medium shadow-sm shadow-amber-900/20"
                aria-label={t('common.signIn')}
              >
                <LogIn className="h-4 w-4" />
                <span className="text-xs">{t('common.signIn')}</span>
              </Button>
            )}

            {/* Mobile Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 md:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
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

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="border-amber-900/30 bg-stone-950">
                <SheetTitle className="flex items-center gap-2">
                  <div className="relative flex h-[45px] w-[45px] items-center justify-center">
                    <Image
                      src="/images/logo-uploaded.png"
                      alt="3 Boxes Luxury Logo"
                      width={45}
                      height={45}
                      className="h-[45px] w-[45px] object-contain sepia-[0.8] hue-rotate-[10deg] saturate-[1.8] brightness-110 mix-blend-lighten drop-shadow-[0_0_14px_rgba(212,164,55,0.7)] drop-shadow-[0_0_6px_rgba(245,230,163,0.5)]"
                    />
                  </div>
                  <span className="gold-shimmer text-lg font-bold tracking-widest">
                    3 BOXES LUXURY
                  </span>
                </SheetTitle>
                <div className="mt-8 flex flex-col gap-4">
                  {/* Mobile Search with DB-only autocomplete */}
                  <form onSubmit={handleSearch} className="md:hidden">
                    <div className="relative" ref={mobileSearchRef}>
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/60 z-10" />
                      <Input
                        value={localSearch}
                        onChange={(e) => {
                          setLocalSearch(e.target.value);
                          fetchSuggestions(e.target.value);
                        }}
                        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={t('common.searchPlaceholder')}
                        className="w-full border-amber-900/40 bg-stone-900/50 pl-10 pr-4 text-amber-50 placeholder:text-amber-200/30"
                      />
                      {localSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalSearch('');
                            setSearch('');
                            setSuggestions([]);
                            setShowSuggestions(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-200/40 hover:text-amber-200 z-10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {/* Mobile Suggestions Dropdown — DB products only, white background (Issue 1) */}
                      <AnimatePresence>
                        {showSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-amber-200 bg-white shadow-xl shadow-amber-900/10 py-1 max-h-[360px] overflow-y-auto z-50"
                          >
                            {isLoadingSuggestions && (
                              <div className="px-4 py-3 text-xs text-stone-500">Searching database…</div>
                            )}
                            {!isLoadingSuggestions && suggestions.length === 0 && (
                              <div className="px-4 py-3 text-xs text-stone-500">
                                No products match “{localSearch}” in your store.
                              </div>
                            )}
                            {!isLoadingSuggestions && suggestions.map((s, i) => (
                              <button
                                key={s.slug}
                                type="button"
                                onMouseEnter={() => setActiveSuggestionIdx(i)}
                                onClick={() => {
                                  handleSuggestionClick(s);
                                  setMobileMenuOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                                  i === activeSuggestionIdx ? 'bg-amber-50' : 'hover:bg-amber-50'
                                }`}
                              >
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                                  {s.image ? (
                                    <img src={s.image} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-stone-400">
                                      <Search className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm text-stone-900">{s.name}</div>
                                  <div className="text-[10px] text-stone-500">
                                    {s.category ? `${s.category} · ` : ''}From DB
                                  </div>
                                </div>
                                <div className="shrink-0 text-sm font-medium text-amber-700">
                                  <FormattedPrice amount={s.price} />
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </form>
                  <button
                    onClick={() => {
                      setView('home');
                      setSearch('');
                      setLocalSearch('');
                      setCategory(null);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('nav.home')}
                  </button>
                  {mounted && authUser ? (
                    <>
                      <button
                        onClick={() => {
                          handleDashboard();
                          setMobileMenuOpen(false);
                        }}
                        className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                      >
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t('common.myDashboard')} ({authUser.role})
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          clearAuth();
                          setView('home');
                          setMobileMenuOpen(false);
                          showToast('success', 'You have been signed out successfully.')
                        }}
                        className="rounded-md px-4 py-2 text-left text-red-400/80 transition-colors hover:bg-red-900/20 hover:text-red-400"
                      >
                        <span className="flex items-center gap-2">
                          <LogOut className="h-4 w-4" />
                          {t('common.signOut')}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setAuthView('login');
                        setMobileMenuOpen(false);
                      }}
                      className="rounded-md px-4 py-3 text-left text-amber-100 font-medium transition-colors bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30"
                    >
                      <span className="flex items-center gap-2">
                        <LogIn className="h-5 w-5" />
                        {t('common.signIn')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setView('cart');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('common.cart')} ({totalItems})
                  </button>
                  <button
                    onClick={() => {
                      setView('orders');
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400"
                  >
                    {t('common.orders')}
                  </button>
                  <button
                    onClick={() => {
                      toggleGiftBuilder();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-md px-4 py-2 text-left text-amber-300/90 transition-colors hover:bg-amber-900/20 hover:text-amber-300 flex items-center gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    {t('nav.giftBuilder')}
                    <Sparkles className="h-3 w-3 text-amber-400/60" />
                  </button>
                  <div className="border-t border-amber-900/20 my-1" />
                  {/* Quick section links — renamed to "Discover" per Issue 6 */}
                  <div className="my-3 border-t border-amber-900/20 pt-3">
                    <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-400/50">Discover</p>
                    {/* Family Packs moved here per Issue 6 (removed from Shop by Category / CATEGORY_NAV) */}
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setPendingScrollId('family-pack-section');
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Family Packs
                    </button>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setPendingScrollId('social-connections-section');
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Social Connections
                    </button>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setPendingScrollId('3boxes-curate-section');
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      3BOXES Curate
                    </button>
                    <button
                      onClick={() => {
                        setView('home');
                        setCategory(null);
                        setMobileMenuOpen(false);
                        setPendingScrollId('ai-style-gallery');
                      }}
                      className="rounded-md px-4 py-2 w-full text-left text-amber-200/80 transition-colors hover:bg-amber-900/20 hover:text-amber-400 flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Style Gallery
                    </button>
                  </div>
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
                    className="rounded-md px-4 py-3 text-left text-amber-100 font-medium transition-colors bg-amber-600/10 border border-amber-500/30 hover:bg-amber-600/20 flex items-center gap-2"
                  >
                    <Download className="h-5 w-5" />
                    Install App
                  </button>

                  {/* Mobile Locale Switcher */}
                  <LocaleSwitcherMobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="border-t border-amber-900/20 bg-stone-950/90">
        <div className="container mx-auto px-4">
          {/* Desktop: two halves with centered "Home" button (Issue 6) */}
          {(() => {
            // Split CATEGORY_NAV into left & right halves so Home can sit centered
            const mid = Math.ceil(CATEGORY_NAV.length / 2);
            const leftHalf = CATEGORY_NAV.slice(0, mid);
            const rightHalf = CATEGORY_NAV.slice(mid);

            const renderNavItem = (cat: CategoryNavItem) => {
              const Icon = cat.icon;
              const hasChildren = cat.children.length > 0;
              const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);

              const handleNavClick = () => {
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
              };

              if (!hasChildren) {
                return (
                  <button
                    key={cat.slug}
                    onClick={handleNavClick}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors rounded ${
                      isActive
                        ? 'bg-amber-900/30 text-amber-300'
                        : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.name}
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
                    onClick={() => setCategory(cat.slug)}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors rounded ${
                      isActive
                        ? 'bg-amber-900/30 text-amber-300'
                        : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.name}
                    <ChevronDown className="h-2.5 w-2.5 text-amber-500/50 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Dropdown */}
                  <div
                    id={`dropdown-${cat.slug}`}
                    style={{ visibility: 'hidden', opacity: 0, transition: 'all 0.2s' }}
                    className="absolute top-full left-0 z-50 mt-0.5 min-w-[200px] rounded-lg border border-amber-900/30 bg-stone-950/98 backdrop-blur-md shadow-xl shadow-black/40 py-2"
                  >
                    {/* Parent category "All" link */}
                    <button
                      onClick={() => { setCategory(cat.slug); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-amber-300/90 font-medium transition-colors hover:bg-amber-900/20 hover:text-amber-200"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      All {cat.name}
                    </button>
                    <div className="mx-3 my-1 border-t border-amber-900/20" />
                    {cat.children.map((child) => (
                      <button
                        key={child.slug}
                        onClick={() => { setCategory(child.slug); }}
                        className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-amber-900/20 hover:text-amber-300 ${
                          selectedCategory === child.slug
                            ? 'text-amber-300 bg-amber-900/20'
                            : 'text-amber-200/60'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          selectedCategory === child.slug ? 'bg-amber-400' : 'bg-amber-600/50'
                        }`} />
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Desktop nav: left half + centered Home + right half */}
                <nav className="hidden md:flex items-center justify-between w-full" aria-label="Category navigation">
                  <div className="flex items-center gap-1 flex-1 justify-start">
                    {leftHalf.map(renderNavItem)}
                  </div>
                  {/* Centered Home Decor button on desktop (Issue 6 + v3 — label changed from "Home" to "Home Decor").
                      Behavior unchanged: still routes to home view + scrolls to top. */}
                  <button
                    onClick={() => {
                      setView('home');
                      setSearch('');
                      setLocalSearch('');
                      setCategory(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`mx-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border transition-all ${
                      view === 'home' && !selectedCategory
                        ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md shadow-amber-600/30'
                        : 'border-amber-600/40 bg-amber-900/10 text-amber-300 hover:bg-amber-600/20 hover:border-amber-500/60 hover:text-amber-200'
                    }`}
                    aria-label="Home"
                  >
                    <Sofa className="h-3.5 w-3.5" />
                    Home Decor
                  </button>
                  <div className="flex items-center gap-1 flex-1 justify-end">
                    {rightHalf.map(renderNavItem)}
                  </div>
                </nav>

                {/* Mobile: compact navigation - all items visible without scroll */}
                <nav className="md:hidden flex flex-wrap items-center gap-0.5 py-1.5 justify-center" aria-label="Category navigation">
                  {/* Centered Home button on mobile nav strip (Issue 6) */}
                  <button
                    onClick={() => {
                      setView('home');
                      setSearch('');
                      setLocalSearch('');
                      setCategory(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      view === 'home' && !selectedCategory
                        ? 'bg-amber-600 text-stone-950 border-amber-500'
                        : 'border-amber-600/40 bg-amber-900/10 text-amber-300'
                    }`}
                  >
                    <Home className="h-3 w-3" />
                    Home
                  </button>
                  {CATEGORY_NAV.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.slug || cat.children.some((c) => c.slug === selectedCategory);
                    const handleMobileNavClick = () => {
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
                    };
                    return (
                      <button
                        key={cat.slug}
                        onClick={handleMobileNavClick}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors rounded whitespace-nowrap ${
                          isActive
                            ? 'bg-amber-900/30 text-amber-300'
                            : 'text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {cat.name}
                        {(cat.scrollToId || cat.viewId) && (
                          <span className="ml-0.5 rounded bg-amber-600/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400">
                            New
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </>
            );
          })()}
        </div>
      </div>
    </header>
  );
}
