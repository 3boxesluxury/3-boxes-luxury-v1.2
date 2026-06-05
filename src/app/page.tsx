'use client';

import { useStore, type View, type AuthUser } from '@/lib/store';
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
import { ToastContainer, showToast } from '@/hooks/use-toast-notification';
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
  const appTheme = useStore((s) => s.appTheme);
  const setAuth = useStore((s) => s.setAuth);
  const setAuthView = useStore((s) => s.setAuthView);

  // Handle Facebook OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    const userName = params.get('userName');
    const userEmail = params.get('userEmail');
    const userRole = params.get('userRole');
    const authProvider = params.get('authProvider');
    const authError = params.get('auth');

    if (token && userId && authProvider === 'facebook') {
      const user: AuthUser = {
        id: userId,
        email: userEmail || '',
        name: userName ? decodeURIComponent(userName) : 'Facebook User',
        role: userRole || 'user',
      };
      setAuth(user, token);
      showToast('success', `Welcome, ${user.name}! Signed in with Facebook.`);

      // Clean up URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('token');
      cleanUrl.searchParams.delete('userId');
      cleanUrl.searchParams.delete('userName');
      cleanUrl.searchParams.delete('userEmail');
      cleanUrl.searchParams.delete('userRole');
      cleanUrl.searchParams.delete('authProvider');
      cleanUrl.searchParams.delete('isNewUser');
      window.history.replaceState({}, '', cleanUrl.toString());
    } else if (authError) {
      const messages: Record<string, string> = {
        denied: 'Facebook login was cancelled.',
        error: 'Facebook login failed. Please try again.',
        deactivated: 'Your account has been deactivated.',
        pending: 'Your account is pending approval.',
        rejected: 'Your account has been rejected.',
      };
      showToast('error', messages[authError] || 'Authentication failed.');
      // Clean up URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('auth');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [setAuth, setAuthView]);

  // Scroll to top whenever the view changes
  // This fixes: feature pages opening at bottom, product detail at bottom,
  // cart page at bottom, footer navigation not scrolling up, etc.
  useEffect(() => {
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
      default:
        return (
          <>
            <HeroSection />
            <CategoryGrid />
            <ProductGrid />
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
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
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
