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
import { OAuthCallbackHandler } from '@/components/oauth-callback-handler';
import { ToastContainer } from '@/hooks/use-toast-notification';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState, useCallback } from 'react';
import { Linkedin, ShoppingBag, Tag, ArrowLeft, Star, Eye, Heart, Briefcase, Crown, Gem, Watch, Sparkles, Gift, Package, ChevronRight, Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

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

// ─── LinkedIn Categories & Products Data ──────────────────────────────────────

const LINKEDIN_CATEGORIES = [
  { id: 'luxury-watches', name: 'Luxury Watches', icon: Watch, count: 24, description: 'Premium timepieces for the discerning professional', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  { id: 'corporate-gifting', name: 'Corporate Gifting', icon: Gift, count: 36, description: 'Sophisticated gifts for business partners & clients', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20' },
  { id: 'premium-leather', name: 'Premium Leather', icon: Briefcase, count: 18, description: 'Handcrafted leather goods for executives', color: 'text-amber-300', bgColor: 'bg-amber-600/10', borderColor: 'border-amber-600/20' },
  { id: 'fine-jewelry', name: 'Fine Jewelry', icon: Gem, count: 30, description: 'Elegant jewelry for milestone celebrations', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
  { id: 'designer-fragrances', name: 'Designer Fragrances', icon: Sparkles, count: 22, description: 'Exclusive scents that make a lasting impression', color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/20' },
  { id: 'exclusive-bundles', name: 'Exclusive Bundles', icon: Package, count: 12, description: 'Curated luxury bundles for special occasions', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
]

const LINKEDIN_PRODUCTS = [
  { id: 'li-p1', name: 'Royal Chronograph Gold', price: 45000, originalPrice: 52000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'luxury-watches', rating: 4.9, reviews: 128, badge: 'Bestseller', matchReason: 'Perfect for senior executives' },
  { id: 'li-p2', name: 'Heritage Leather Briefcase', price: 28000, originalPrice: 33000, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', category: 'premium-leather', rating: 4.8, reviews: 94, badge: 'Executive Pick', matchReason: 'Ideal for boardroom presence' },
  { id: 'li-p3', name: 'Emerald Tennis Bracelet', price: 62000, originalPrice: 75000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'fine-jewelry', rating: 5.0, reviews: 67, badge: 'Premium', matchReason: 'Milestone celebration gift' },
  { id: 'li-p4', name: 'Jardin Secret Eau de Parfum', price: 8500, originalPrice: 9800, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', category: 'designer-fragrances', rating: 4.7, reviews: 203, badge: 'Trending', matchReason: 'Popular among professionals' },
  { id: 'li-p5', name: 'Cashmere Overcoat', price: 35000, originalPrice: 42000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', category: 'luxury-watches', rating: 4.9, reviews: 56, badge: 'Seasonal', matchReason: 'Refined outerwear for leaders' },
  { id: 'li-p6', name: 'Sapphire Cascade Earrings', price: 38000, originalPrice: 45000, image: '/images/products/generated/sapphire-cascade-earrings-11047389954321.png', category: 'fine-jewelry', rating: 4.8, reviews: 89, badge: 'Exclusive', matchReason: 'Elegant statement pieces' },
  { id: 'li-p7', name: 'Corporate Gift Box - Elite', price: 15000, originalPrice: 18000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'corporate-gifting', rating: 4.9, reviews: 312, badge: 'Top Rated', matchReason: 'Most popular corporate gift' },
  { id: 'li-p8', name: 'Leather Portfolio Set', price: 12000, originalPrice: 14500, image: '/images/products/generated/heritage-leather-briefcase-11047388905745.png', category: 'premium-leather', rating: 4.6, reviews: 78, badge: 'New', matchReason: 'Perfect for client meetings' },
  { id: 'li-p9', name: 'Prestige Watch Collection', price: 85000, originalPrice: 95000, image: '/images/products/generated/royal-chronograph-gold-11047389823249.png', category: 'luxury-watches', rating: 5.0, reviews: 42, badge: 'Limited', matchReason: 'For watch connoisseurs' },
  { id: 'li-p10', name: 'Luxury Gift Bundle - Premium', price: 25000, originalPrice: 30000, image: '/images/products/generated/emerald-tennis-bracelet-11047388709137.png', category: 'exclusive-bundles', rating: 4.8, reviews: 156, badge: 'Value Deal', matchReason: 'Best value luxury bundle' },
  { id: 'li-p11', name: 'Noir Intense Eau de Toilette', price: 6200, originalPrice: 7500, image: '/images/products/generated/jardin-secret-eau-de-parfum-11047389036817.png', category: 'designer-fragrances', rating: 4.7, reviews: 178, badge: 'Popular', matchReason: 'Signature scent for leaders' },
  { id: 'li-p12', name: 'Client Appreciation Set', price: 9800, originalPrice: 12000, image: '/images/products/generated/cashmere-overcoat-11047388414225.png', category: 'corporate-gifting', rating: 4.6, reviews: 234, badge: 'Corporate Pick', matchReason: 'Perfect for client relations' },
]

// ─── LinkedIn Page Component ───────────────────────────────────────────────────

function LinkedInPage() {
  const setView = useStore((s) => s.setView)
  const setSelectedProduct = useStore((s) => s.setSelectedProduct)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured')
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price)

  const filteredProducts = selectedCategory
    ? LINKEDIN_PRODUCTS.filter((p) => p.category === selectedCategory)
    : LINKEDIN_PRODUCTS

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price
      case 'price-high': return b.price - a.price
      case 'rating': return b.rating - a.rating
      default: return 0
    }
  })

  const toggleWishlist = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleProductClick = useCallback((productId: string) => {
    setSelectedProduct(productId)
    setView('product')
  }, [setSelectedProduct, setView])

  return (
    <section className="w-full bg-stone-950 text-amber-100 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-950 via-stone-950 to-stone-900 border-b border-sky-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <button
            onClick={() => setView('home')}
            className="mb-6 flex items-center gap-1.5 text-sm text-sky-300/70 hover:text-sky-300 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/20">
              <Linkedin className="size-7 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                LinkedIn{' '}
                <span className="bg-gradient-to-r from-sky-400 to-amber-400 bg-clip-text text-transparent">
                  Collection
                </span>
              </h1>
              <p className="text-sm text-sky-200/50 mt-0.5">Curated for professionals & executives</p>
            </div>
          </div>
          <p className="max-w-2xl text-amber-200/60 text-sm sm:text-base leading-relaxed">
            Discover luxury products handpicked for the modern professional. From executive accessories to corporate gifting solutions, elevate your professional presence with 3 Boxes Luxury.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/25">
              <Linkedin className="size-3 mr-1" />
              Professional Picks
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25">
              <Crown className="size-3 mr-1" />
              Premium Quality
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25">
              <Gift className="size-3 mr-1" />
              Corporate Ready
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Categories Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Tag className="size-5 text-sky-400" />
              <h2 className="text-xl font-bold text-amber-100">Shop by Category</h2>
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-sky-300/70 hover:text-sky-300 transition-colors"
              >
                Show All
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {LINKEDIN_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
                    isActive
                      ? `${cat.borderColor} ${cat.bgColor} shadow-lg shadow-sky-900/10`
                      : 'border-amber-900/20 bg-stone-900/60 hover:border-amber-900/40 hover:bg-stone-900/80'
                  }`}
                >
                  <div className={`flex size-10 items-center justify-center rounded-lg ${cat.bgColor} ${cat.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? cat.color : 'text-amber-200/70'}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-amber-200/40">{cat.count} items</span>
                </motion.button>
              )
            })}
          </div>
        </div>

        <Separator className="bg-amber-900/20 mb-8" />

        {/* Products Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-sky-400" />
              <h2 className="text-xl font-bold text-amber-100">
                {selectedCategory
                  ? LINKEDIN_CATEGORIES.find((c) => c.id === selectedCategory)?.name
                  : 'All Products'}
              </h2>
              <Badge variant="outline" className="border-amber-900/30 text-amber-200/50 text-xs">
                {sortedProducts.length} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <SortAsc className="size-4 text-amber-200/40" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-md border border-amber-900/30 bg-stone-900/80 px-3 py-1.5 text-xs text-amber-200/70 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedProducts.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Card className="group border-amber-900/20 bg-stone-900/60 hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-900/10 transition-all overflow-hidden cursor-pointer"
                  onClick={() => handleProductClick(product.id)}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-stone-800/50 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder-product.png'
                      }}
                    />
                    {/* Badge */}
                    {product.badge && (
                      <div className="absolute top-2 left-2">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${
                          product.badge === 'Bestseller' || product.badge === 'Top Rated'
                            ? 'bg-amber-600/90 text-stone-950'
                            : product.badge === 'Premium' || product.badge === 'Limited'
                              ? 'bg-purple-600/90 text-white'
                              : 'bg-sky-600/90 text-white'
                        }`}>
                          {product.badge}
                        </Badge>
                      </div>
                    )}
                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id) }}
                      className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-stone-950/60 backdrop-blur-sm border border-white/10 transition-colors hover:bg-stone-950/80"
                    >
                      <Heart className={`size-4 ${wishlist.has(product.id) ? 'fill-red-400 text-red-400' : 'text-white/60'}`} />
                    </button>
                    {/* Discount Badge */}
                    {product.originalPrice > product.price && (
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-emerald-600/90 text-white text-[10px] px-1.5 py-0.5">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </Badge>
                      </div>
                    )}
                  </div>
                  {/* Product Info */}
                  <CardContent className="p-3">
                    <h3 className="text-sm font-medium text-amber-100 line-clamp-1 group-hover:text-sky-300 transition-colors">
                      {product.name}
                    </h3>
                    {/* Match Reason */}
                    <p className="text-[10px] text-sky-300/50 mt-0.5 line-clamp-1">
                      {product.matchReason}
                    </p>
                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, si) => (
                          <Star
                            key={si}
                            className={`size-3 ${si < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-amber-900/30'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-amber-200/40">({product.reviews})</span>
                    </div>
                    {/* Price */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-bold text-amber-100">{formatPrice(product.price)}</span>
                      {product.originalPrice > product.price && (
                        <span className="text-[10px] text-amber-200/30 line-through">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {sortedProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="size-12 text-amber-900/30 mb-4" />
              <p className="text-amber-200/50 text-lg font-medium">No products found</p>
              <p className="text-amber-200/30 text-sm mt-1">Try selecting a different category</p>
              <Button
                onClick={() => setSelectedCategory(null)}
                variant="outline"
                className="mt-4 border-amber-900/30 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-200"
              >
                View All Products
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function AppContent() {
  const view = useStore((s) => s.view);
  const appTheme = useStore((s) => s.appTheme);

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
      case 'linkedin':
        return <LinkedInPage />;
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
