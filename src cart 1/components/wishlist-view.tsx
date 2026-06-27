'use client';

import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { useCurrency } from '@/hooks/useCurrency';
import { showToast } from '@/hooks/use-toast-notification';

interface WishlistProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  category: string;
  categorySlug: string;
  slug: string;
  rating: number;
  stock: number;
  translations?: Array<{ locale: string; name: string | null; description: string | null }>;
}

export function WishlistView() {
  // FIX 1: Use correct store variable names (authUser, authToken, setAuthView)
  const { authUser, authToken, setView, selectProduct, addItem, setAuthView } = useStore();
  const { format } = useCurrency();
  const { t, locale } = useTranslation();

  // Helper: pick the right product name from the translations array based on locale
  const getLocalizedName = (item: { name: string; translations?: Array<{ locale: string; name: string | null }> }) => {
    if (!item.translations || item.translations.length === 0) return item.name;
    const tr = item.translations.find(tr => tr.locale === locale);
    return tr?.name || item.name;
  };
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!authUser || !authToken) {
      setLoading(false);
      return;
    }
    try {
      // FIX 2: Use authToken from store, not localStorage
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data?.wishlist) ? data.wishlist : (Array.isArray(data?.items) ? data.items : []);
        // Map API response (nested product object) to flat WishlistProduct
        const mapped: WishlistProduct[] = raw.map((w: any) => {
          const p = w.product || {};
          // Handle images stored as JSON string in DB (same as admin-dashboard)
          let images: string[] = [];
          if (typeof p.images === 'string') {
            try { images = JSON.parse(p.images || '[]'); } catch { images = []; }
          } else if (Array.isArray(p.images)) {
            images = p.images;
          }
          return {
            id: w.id,
            productId: w.productId || p.id || '',
            name: p.name || 'Unknown Product',
            price: typeof p.price === 'string' ? parseFloat(p.price) || 0 : (Number(p.price) || 0),
            image: images.length > 0 ? getProxiedImageUrl(images[0], p.platform) : '/images/placeholder.jpg',
            category: p.category?.name || '',
            categorySlug: p.category?.slug || '',
            slug: p.slug || '',
            rating: p.rating ?? 0,
            stock: p.stock ?? 0,
            translations: p.translations || [],
          };
        });
        setItems(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser, authToken]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      }
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (item: WishlistProduct) => {
    // Require login before adding to cart
    if (!authUser) { setAuthView('login'); return; }
    addItem({
      productId: item.productId,
      name: getLocalizedName(item),
      price: item.price,
      image: item.image,
      translations: item.translations,
    });
    showToast('success', `${getLocalizedName(item)} added to cart`);
  };

  const handleAddAllToCart = () => {
    // Require login before adding to cart
    if (!authUser) { setAuthView('login'); return; }
    items.forEach((item) => {
      addItem({
        productId: item.productId,
        name: getLocalizedName(item),
        price: item.price,
        image: item.image,
        translations: item.translations,
      });
    });
    showToast('success', `${items.length} item${items.length !== 1 ? 's' : ''} added to cart`);
  };

  // FIX 1: Use authUser, not user. Use setAuthView, not setAuthMode/setShowAuthDialog
  if (!authUser) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24"
      >
        <Heart className="h-20 w-20 text-amber-700/30" />
        <h3 className="mt-6 text-2xl font-bold text-amber-100">{t('wishlist.signInToView')}</h3>
        <p className="mt-2 max-w-md text-center text-sm text-amber-200/40">
          {t('wishlist.signInDesc')}
        </p>
        <Button
          onClick={() => setAuthView('login')}
          className="mt-8 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
          size="lg"
        >
          {t('wishlist.signIn')}
        </Button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24"
      >
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="mt-4 text-sm text-amber-200/50">{t('wishlist.loading')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 md:py-8">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 -mx-4 mb-4 flex items-center gap-3 border-b border-amber-900/20 bg-stone-950/95 backdrop-blur-md px-4 py-3 z-10">
        <button
          onClick={() => setView('home')}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-amber-200/80 transition-colors hover:bg-amber-900/30 hover:text-amber-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-base font-semibold text-amber-100 flex items-center gap-2">
          <Heart className="h-4 w-4 text-amber-500 fill-amber-500" />
          {t('wishlist.myWishlist')}
          {items.length > 0 && (
            <span className="text-xs font-normal text-amber-200/50">({items.length})</span>
          )}
        </h2>
        <button
          onClick={() => setView('cart')}
          aria-label="Cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-amber-200/80 transition-colors hover:bg-amber-900/30 hover:text-amber-300"
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop heading */}
      <div className="hidden md:block">
        <Button
          variant="ghost"
          onClick={() => setView('home')}
          className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('wishlist.continueShopping')}
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-3">
              <Heart className="h-6 w-6 text-amber-500 fill-amber-500" />
              {t('wishlist.myWishlist')}
            </h2>
            <p className="mt-1 text-sm text-amber-200/40">
              {t('wishlist.itemsSaved', { count: items.length, items: items.length === 1 ? t('wishlist.item') : t('wishlist.items') })}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              onClick={handleAddAllToCart}
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t('wishlist.addAllToCart')}
            </Button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="md:hidden mb-4 flex justify-end">
          <Button
            onClick={handleAddAllToCart}
            size="sm"
            className="bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('wishlist.addAllToCart')}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative">
            <Heart className="h-24 w-24 text-amber-700/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-amber-600/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-amber-500/40" />
              </div>
            </div>
          </div>
          <h3 className="mt-6 text-xl font-semibold text-amber-100">{t('wishlist.empty')}</h3>
          <p className="mt-2 max-w-md text-center text-sm text-amber-200/40">
            {t('wishlist.emptyDesc')}
          </p>
          <Button
            onClick={() => setView('home')}
            className="mt-8 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
            size="lg"
          >
            {t('wishlist.exploreCollection')}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group border-amber-900/20 bg-stone-900/60 overflow-hidden hover:border-amber-700/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10">
                  <CardContent className="p-0">
                    <div
                      className="relative aspect-square cursor-pointer overflow-hidden bg-stone-800"
                      onClick={() => selectProduct(item.productId)}
                    >
                      <Image
                        src={imageErrors.has(item.productId) ? '/images/placeholder.jpg' : item.image}
                        alt={getLocalizedName(item)}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        onError={() => setImageErrors(prev => new Set(prev).add(item.productId))}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(item.productId);
                        }}
                        disabled={removingId === item.productId}
                        className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-stone-950/70 backdrop-blur-sm text-amber-400 hover:bg-red-900/80 hover:text-red-300 transition-all duration-200"
                        aria-label="Remove from wishlist"
                      >
                        {removingId === item.productId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <h3
                        className="text-sm font-semibold text-amber-100 line-clamp-2 cursor-pointer hover:text-amber-300 transition-colors"
                        onClick={() => selectProduct(item.productId)}
                      >
                        {getLocalizedName(item)}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-amber-400">
                          {format(item.price ?? 0)}
                        </span>
                      </div>
                      <Button
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-amber-600/90 text-stone-950 hover:bg-amber-500 hover:shadow-md hover:shadow-amber-600/20 text-xs"
                        size="sm"
                      >
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                        {t('wishlist.addToCart')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}