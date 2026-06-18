'use client';

import { useStore, type View } from '@/lib/store';
import { QueryProvider } from '@/lib/query-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/hero-section';
import { CategoryGrid } from '@/components/category-grid';
import { ProductGrid } from '@/components/product-grid';
import { ProductDetail } from '@/components/product-detail';
import { CartView } from '@/components/cart-view';
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
import { WishlistView } from '@/components/wishlist-view';
import { FamilyPackSection } from '@/components/family-pack-section';
import { SocialConnectionsSection } from '@/components/social-connections-section';
import { ThreeboxesCurateSection } from '@/components/threeboxes-curate-section';
import { StyleGallerySection } from '@/components/style-gallery-section';
import { AIStyleGallery } from '@/components/ai-style-gallery';
import { OAuthCallbackHandler } from '@/components/oauth-callback-handler';
import { ToastContainer } from '@/hooks/use-toast-notification';
import { useBrowserHistory } from '@/hooks/useBrowserHistory';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect } from 'react';

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
  const selectProduct = useStore((s) => s.selectProduct);
  const appTheme = useStore((s) => s.appTheme);

  // ─── Browser history sync ────────────────────────────────────────────────
  // This hook handles:
  //   1. Pushing view changes to browser history (so Back/Forward work)
  //   2. Listening to popstate (Back/Forward) → restore view from URL
  //   3. Showing "Leave site?" confirmation via beforeunload
  // See src/hooks/useBrowserHistory.ts for full details.
  useBrowserHistory();

  // ─── Restore view + product from URL on initial load ─────────────────────
  // This runs ONCE on mount. It reads ?view=...&id=... from the URL and
  // restores the corresponding view in the Zustand store.
  //
  // This handles:
  //   - Direct URL access (e.g., user bookmarks /?view=product&id=123)
  //   - Page refresh (URL is preserved by useBrowserHistory, so refresh
  //     lands on the same view)
  //   - OAuth callbacks (e.g., /?view=social-style after Google OAuth)
  //
  // Unlike the previous implementation, we NO LONGER clear the URL after
  // reading it — the URL is preserved so refresh works. OAuth-specific
  // params (auth_token, connect_provider, etc.) are still cleaned up by
  // OAuthCallbackHandler and SocialStyleIntegration respectively.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as View | null;
    const idParam = params.get('id');

    if (viewParam) {
      const validViews: View[] = [
        'home', 'product', 'cart', 'checkout', 'orders', 'order-confirmation',
        'user-dashboard', 'admin-dashboard', 'agent-dashboard', 'team-dashboard',
        'corporate-dashboard', 'wiki', 'downloads', 'security-policy',
        'social-style', '3box-curate', 'family-shopping', 'wishlist',
      ];
      if (validViews.includes(viewParam)) {
        if (viewParam === 'product' && idParam) {
          // Restore product view with the specific product ID
          selectProduct(idParam);
        } else if (viewParam !== view) {
          setView(viewParam);
        }
      }
    }
    // NOTE: We intentionally do NOT clear the URL here anymore.
    // useBrowserHistory will replaceState on initial mount to canonicalize
    // the URL for the current view.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top whenever the view changes
  // This fixes: feature pages opening at bottom, product detail at bottom,
  // cart page at bottom, footer navigation not scrolling up, etc.
  // NOTE: Skip scroll-to-top if we're navigating to a section (header handles that)
  useEffect(() => {
    // Check if there's a pending section scroll (set by header navigation)
    const pendingScroll = (window as any).__pendingScrollToSection;
    if (pendingScroll) {
      // Let the header's scroll logic handle it
      delete (window as any).__pendingScrollToSection;
      return;
    }
    // Always scroll to top for non-home views
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [view]);

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
              <div id="family-pack-section" className="scroll-mt-20">
                <FamilyPackSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="social-connections-section" className="scroll-mt-20">
                <SocialConnectionsSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="3boxes-curate-section" className="scroll-mt-20">
                <ThreeboxesCurateSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="ai-style-gallery" className="scroll-mt-20">
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
      case 'wishlist':
        return <WishlistView />;
      case 'wiki':
        return <WikiSection />;
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
              <div id="family-pack-section" className="scroll-mt-20">
                <FamilyPackSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="social-connections-section" className="scroll-mt-20">
                <SocialConnectionsSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="3boxes-curate-section" className="scroll-mt-20">
                <ThreeboxesCurateSection />
              </div>
            </ErrorBoundary>
            <ErrorBoundary fallback={null}>
              <div id="ai-style-gallery" className="scroll-mt-20">
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
      <Footer />
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
