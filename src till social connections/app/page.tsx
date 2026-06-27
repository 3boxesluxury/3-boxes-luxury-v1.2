'use client';
export const dynamic = 'force-dynamic';

import { useStore, type View } from '@/lib/store';
import { QueryProvider } from '@/lib/query-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/hero-section';
import { CategoryGrid } from '@/components/category-grid';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetail } from '@/components/product-detail';
import { CartView } from '@/components/cart-view';
import { WishlistView } from '@/components/wishlist-view';
import { CheckoutView } from '@/components/checkout-view';
import { OrderConfirmation } from '@/components/order-confirmation';
import { OrderHistory } from '@/components/order-history';
import { AuthDialog } from '@/components/auth-dialog';
import { AdminDashboard } from '@/components/admin-dashboard';
import { UserDashboard } from '@/components/user-dashboard';
import { AgentDashboard } from '@/components/agent-dashboard';
import { TeamDashboard } from '@/components/team-dashboard';
import { CorporateDashboard } from '@/components/corporate-dashboard';
import { SecurityPolicy } from '@/components/security-policy';
import { GiftAssistant } from '@/components/gift-assistant';
import { GiftBuilder } from '@/components/gift-builder';
import { AppDownloadSection } from '@/components/app-download-section';
import { AppDownloadBanner } from '@/components/app-download-banner';
import { SocialStyleIntegration } from '@/components/social-style-integration';
import { ThreeBoxCurate } from '@/components/threebox-curate';
import { FamilyShopping } from '@/components/family-shopping';
import { WikiSection } from '@/components/wiki-section';
import { FamilyPackSection } from '@/components/family-pack-section';
import { SocialConnectionsSection } from '@/components/social-connections-section';
import { ThreeboxesCurateSection } from '@/components/threeboxes-curate-section';
import { StyleGallerySection } from '@/components/style-gallery-section';
import { AIStyleGallery } from '@/components/ai-style-gallery';
import { ComingSoon } from '@/components/coming-soon';
import { OAuthCallbackHandler } from '@/components/oauth-callback-handler';
import { ToastContainer } from '@/hooks/use-toast-notification';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect } from 'react';
import { trackBug } from '@/lib/bug-track';

// Wrapper for FamilyShopping that scrolls to top on internal step changes
// Detects step transitions by observing significant DOM content changes
function FamilyShoppingWrapper() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastScrollTime = React.useRef(0);

  useEffect(() => {
    // Scroll to top when FamilyShopping first mounts
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    const container = containerRef.current;
    if (!container) return;

    // Throttled scroll: only scroll once per 500ms to avoid spamming
    const throttledScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current > 500) {
        lastScrollTime.current = now;
        window.scrollTo({ top: 0, behavior: 'smooth' as ScrollBehavior });
      }
    };

    // Observe childList changes which happen on step transitions
    const observer = new MutationObserver((mutations) => {
      // Only react to significant structural changes (not just attribute changes)
      const significant = mutations.some(
        (m) => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
      );
      if (significant) {
        throttledScroll();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <FamilyShopping />
    </div>
  );
}

function AppContent() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const appTheme = useStore((s) => s.appTheme);
  const selectedCategory = useStore((s) => s.selectedCategory);
  const setCategory = useStore((s) => s.setCategory);
  const showFooter = !['admin-dashboard', 'user-dashboard', 'agent-dashboard', 'team-dashboard', 'corporate-dashboard'].includes(view);

  // Restore view state from URL ?view= parameter on initial load
  // This allows OAuth callbacks to redirect back to the correct view
  // (e.g. /?view=social-style after LinkedIn/Facebook/Google OAuth)
  // Both this effect AND OAuthCallbackHandler handle view restoration.
  // This effect handles non-OAuth navigation (direct URL, bookmarks, etc.)
  // and also serves as a safety net if OAuthCallbackHandler hasn't run yet.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const viewParam = params.get('view')
    if (viewParam) {
           const validViews: View[] = [
        'home', 'product', 'cart', 'checkout', 'orders', 'order-confirmation',
        'user-dashboard', 'admin-dashboard', 'agent-dashboard', 'team-dashboard',
        'corporate-dashboard', 'wiki', 'downloads', 'security-policy',
        'social-style', '3box-curate', 'family-shopping', 'coming-soon', 'wishlist',
      ]
      if (validViews.includes(viewParam as View) && viewParam !== view) {
        setView(viewParam as View)
      }
      // Only clean URL if there are no auth params AND no connect params
      // (OAuthCallbackHandler handles auth params, SocialStyleIntegration handles connect params)
      const hasAuthParams = params.has('auth_token') || params.has('auth_error')
      const hasConnectParams = params.has('connect_provider') || params.has('connect_name')
      if (!hasAuthParams && !hasConnectParams) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top whenever the view changes
  // This fixes: feature pages opening at bottom, product detail at bottom,
  // cart page at bottom, footer navigation not scrolling up, etc.
  // NOTE: Skip scroll-to-top if we're navigating to a section (header handles that)
  useEffect(() => {
    const pendingScroll = (window as any).__pendingScrollToSection;
    trackBug('PAGE', `useEffect[view] fired — view="${view}" pendingScrollToSection=${!!pendingScroll}`);
    if (pendingScroll) {
      // Don't delete it here, let the scroll logic handle it
      trackBug('PAGE', 'Skipping scroll-to-top because __pendingScrollToSection is set');
      return; // Skip scrolling to top
    }
    trackBug('SCROLL', `Scrolling to top (view changed to "${view}")`);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view]);

  // ════════════════════════════════════════════════════════════════════
  // PROPER BROWSER HISTORY NAVIGATION FOR CATEGORIES & VIEWS
  // ════════════════════════════════════════════════════════════════════
  // Tracks both 'view' and 'selectedCategory' in browser history.
  // Example: Home → Men → Women → Kids
  //   Back → Women, Back → Men, Forward → Women, Forward → Kids
  // ════════════════════════════════════════════════════════════════════

  // Ref to track if we're restoring from history (to avoid pushState loops)
  const isRestoringFromHistory = React.useRef(false);

  // Push new history entry whenever view or category changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip if we're restoring from history (popstate handler will set state)
    if (isRestoringFromHistory.current) {
      isRestoringFromHistory.current = false;
      trackBug('PAGE', `history pushState SKIPPED (restoring from popstate) — view="${view}" cat="${selectedCategory}"`);
      return;
    }

    const currentState = window.history.state;
    const newState = { view, category: selectedCategory };

    // Only push if state actually changed
    if (!currentState ||
        currentState.view !== view ||
        currentState.category !== selectedCategory) {
      window.history.pushState(newState, '', window.location.pathname);
      trackBug('PAGE', `history pushState — view="${view}" cat="${selectedCategory}"`);
    } else {
      trackBug('PAGE', `history pushState SKIPPED (state unchanged) — view="${view}" cat="${selectedCategory}"`);
    }
  }, [view, selectedCategory]);

  // Listen for back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (e: PopStateEvent) => {
      trackBug('PAGE', `popstate event — state.view="${e.state?.view}" state.category="${e.state?.category}"`);
      if (e.state) {
        // Set flag to prevent pushState when we restore
        isRestoringFromHistory.current = true;

        // Restore view
        if (e.state.view && e.state.view !== view) {
          setView(e.state.view);
        }

        // Restore category
        if (e.state.category !== undefined) {
          if (e.state.category !== selectedCategory) {
            setCategory(e.state.category);
          }
        }
      } else {
        // At the very root (no state) - go to home with no category
        isRestoringFromHistory.current = true;
        if (view !== 'home') setView('home');
        if (selectedCategory !== null) setCategory(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view, selectedCategory, setView, setCategory]);

  // 'Are you leaving site?' confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <HeroSection />
            <CategoryGrid />
            <ProductGrid />
            <ErrorBoundary fallback={null}>
              <StyleGallerySection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="family-pack-section" className="scroll-mt-36">
                <FamilyPackSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="social-connections-section" className="scroll-mt-36">
                <SocialConnectionsSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="3boxes-curate-section" className="scroll-mt-36">
                <ThreeboxesCurateSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="ai-style-gallery" className="scroll-mt-36">
                <AIStyleGallery />
              </div>
            </ErrorBoundary>
            <AppDownloadSection />
          </>
        );
      case 'product':
        return <ProductDetail />;
      case 'cart':
        return <CartView />;
      case 'checkout':
        return <CheckoutView />;
      case 'order-confirmation':
        return <OrderConfirmation />;
      case 'orders':
        return <OrderHistory />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'user-dashboard':
        return <UserDashboard />;
      case 'agent-dashboard':
        return <AgentDashboard />;
      case 'team-dashboard':
        return <TeamDashboard />;
      case 'corporate-dashboard':
        return <CorporateDashboard />;
      case 'security-policy':
        return <SecurityPolicy />;
      case 'social-style':
        return <SocialStyleIntegration />;
      case '3box-curate':
        return <ThreeBoxCurate />;
      case 'family-shopping':
        return <FamilyShoppingWrapper />;
      case 'wiki':
        return <WikiSection />;
            case 'coming-soon':
        return <ComingSoon />;
      case 'wishlist':
        return <WishlistView />;
      default:
        return (
          <>
            <HeroSection />
            <CategoryGrid />
            <ProductGrid />
            <ErrorBoundary fallback={null}>
              <StyleGallerySection />
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="family-pack-section" className="scroll-mt-36">
                <FamilyPackSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="social-connections-section" className="scroll-mt-36">
                <SocialConnectionsSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="3boxes-curate-section" className="scroll-mt-36">
                <ThreeboxesCurateSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="ai-style-gallery" className="scroll-mt-36">
                <AIStyleGallery />
              </div>
            </ErrorBoundary>
            <AppDownloadSection />
          </>
        );
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${appTheme === 'light' ? 'bg-white' : 'bg-stone-950'}`}
      data-theme={appTheme}
    >
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {showFooter && <Footer />}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-16 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/30 bg-stone-950/90 text-amber-100 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:bg-amber-500 hover:text-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-stone-950"
        aria-label="Scroll to top"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
          <path
            d="M12 5.5l-6 6 1.4 1.4L11 9.3V19h2V9.3l3.6 3.6 1.4-1.4-6-6z"
            fill="currentColor"
          />
        </svg>
      </button>
      <OAuthCallbackHandler />
      <AuthDialog />
      <GiftBuilder />
      <GiftAssistant />
      <AppDownloadBanner />
      <ToastContainer />
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-amber-100">Something went wrong!</h2>
          <p className="mb-4 max-w-md text-sm text-amber-200/60">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-amber-600 px-6 py-2 text-sm font-medium text-stone-950 hover:bg-amber-500"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </ErrorBoundary>
  );
}
