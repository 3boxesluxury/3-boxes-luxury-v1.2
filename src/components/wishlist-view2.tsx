'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

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
}

export function WishlistView() {
  const { user, setView, selectProduct, addItem, setShowAuthDialog, setAuthMode } = useStore();
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('3bl-auth-token');
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const token = localStorage.getItem('3bl-auth-token');
      const res = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    addItem({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
    });
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => {
      addItem({
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
      });
    });
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-24"
      >
        <Heart className="h-20 w-20 text-amber-700/30" />
        <h3 className="mt-6 text-2xl font-bold text-amber-100">Sign in to view your wishlist</h3>
        <p className="mt-2 max-w-md text-center text-sm text-amber-200/40">
          Save your favorite luxury items and access them anytime
        </p>
        <Button
          onClick={() => {
            setAuthMode('login');
            setShowAuthDialog(true);
          }}
          className="mt-8 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
          size="lg"
        >
          Sign In
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
        <p className="mt-4 text-sm text-amber-200/50">Loading your wishlist...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 md:py-8">
      {/* Mobile top bar: back arrow + "My Wishlist" + cart button (Issue 2) */}
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
          My Wishlist
          {items.length > 0 && (
            <span className="text-xs font-normal text-amber-200/50">
              ({items.length})
            </span>
          )}
        </h2>
        {/* Wishlist button — current view (highlighted to indicate active) */}
        <button
          onClick={() => setView('user-dashboard')}
          aria-label="Wishlist"
          aria-current="page"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-amber-300 bg-amber-900/30 transition-colors"
        >
          <Heart className="h-5 w-5" />
        </button>
        {/* Cart button — jumps to shopping cart */}
        <button
          onClick={() => setView('cart')}
          aria-label="Cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-amber-200/80 transition-colors hover:bg-amber-900/30 hover:text-amber-300"
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop: original heading layout */}
      <div className="hidden md:block">
        <Button
          variant="ghost"
          onClick={() => setView('home')}
          className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-3">
              <Heart className="h-6 w-6 text-amber-500 fill-amber-500" />
              My Wishlist
            </h2>
            <p className="mt-1 text-sm text-amber-200/40">
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          {items.length > 0 && (
            <Button
              onClick={handleAddAllToCart}
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add All to Cart
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: floating "Add All to Cart" button (since the heading block is hidden) */}
      {items.length > 0 && (
        <div className="md:hidden mb-4 flex justify-end">
          <Button
            onClick={handleAddAllToCart}
            size="sm"
            className="bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add All to Cart
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
          <h3 className="mt-6 text-xl font-semibold text-amber-100">Your wishlist is empty</h3>
          <p className="mt-2 max-w-md text-center text-sm text-amber-200/40">
            Browse our luxury collection and tap the heart icon on items you love to save them here
          </p>
          <Button
            onClick={() => setView('home')}
            className="mt-8 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
            size="lg"
          >
            Explore Collection
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
                    {/* Image */}
                    <div
                      className="relative aspect-square cursor-pointer overflow-hidden bg-stone-800"
                      onClick={() => selectProduct(item.productId)}
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {/* Remove button overlay */}
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
                      {/* Category badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className="rounded-full bg-stone-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                          {item.category}
                        </span>
                      </div>
                      {item.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/60">
                          <span className="rounded-md bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-red-200">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-3">
                      <h3
                        className="text-sm font-semibold text-amber-100 line-clamp-2 cursor-pointer hover:text-amber-300 transition-colors"
                        onClick={() => selectProduct(item.productId)}
                      >
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-amber-400">
                          ${item.price.toLocaleString()}
                        </span>
                        {item.rating > 0 && (
                          <span className="text-xs text-amber-200/40">
                            ★ {item.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock === 0}
                        className="w-full bg-amber-600/90 text-stone-950 hover:bg-amber-500 hover:shadow-md hover:shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        size="sm"
                      >
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                        {item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
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
