'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, ArrowLeft, Trash2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

/**
 * WishlistView — displays the user's wishlist items.
 *
 * Uses the local Zustand store wishlist (no auth required).
 * Wishlist items are stored in `wishlistItems` and persisted to localStorage
 * under the `3boxes_wishlist` key (see src/lib/store.ts).
 *
 * Features:
 *   - List all wishlist items with image, name, price
 *   - Remove individual items from wishlist (trash icon)
 *   - Move item to cart (ShoppingCart icon)
 *   - "Continue Shopping" button when wishlist is empty
 *   - Back button to return to the previous view
 */
export function WishlistView() {
  const { wishlistItems, removeFromWishlist, addItem, setView, selectProduct } = useStore();

  const handleMoveToCart = (item: typeof wishlistItems[0]) => {
    addItem({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
    });
    removeFromWishlist(item.productId);
  };

  const handleViewProduct = (productId: string) => {
    selectProduct(productId);
  };

  return (
    <div className="min-h-screen bg-stone-950 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setView('home')}
            className="gap-2 border-amber-900/40 bg-stone-900/60 text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-100 hover:border-amber-700/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            <h1 className="text-2xl font-bold text-amber-100">My Wishlist</h1>
            {wishlistItems.length > 0 && (
              <span className="rounded-full bg-rose-600/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-600/30">
                {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {wishlistItems.length === 0 ? (
          <Card className="border-amber-900/30 bg-stone-900/60">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-600/10 border border-rose-600/20">
                <Heart className="h-10 w-10 text-rose-400/60" />
              </div>
              <h2 className="text-xl font-semibold text-amber-100">Your wishlist is empty</h2>
              <p className="mt-2 max-w-md text-sm text-amber-200/50">
                Tap the heart icon on any product to save it here. Your wishlist lets you keep track
                of items you love and want to buy later.
              </p>
              <Button
                onClick={() => setView('home')}
                className="mt-6 gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500"
              >
                Continue Shopping
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Wishlist items grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {wishlistItems.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="group h-full border-amber-900/30 bg-stone-900/60 transition-all hover:border-amber-700/50 hover:shadow-lg hover:shadow-amber-900/10">
                      <CardContent className="flex h-full flex-col p-4">
                        {/* Product image (clickable to view product detail) */}
                        <button
                          onClick={() => handleViewProduct(item.productId)}
                          className="mb-3 aspect-square overflow-hidden rounded-lg bg-stone-800"
                          aria-label={`View ${item.name}`}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Image
                                src="/images/placeholder.jpg"
                                alt="No image"
                                width={200}
                                height={200}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                        </button>

                        {/* Product info */}
                        <button
                          onClick={() => handleViewProduct(item.productId)}
                          className="mb-1 text-left"
                        >
                          <h3 className="line-clamp-2 text-sm font-semibold text-amber-100 hover:text-amber-300">
                            {item.name}
                          </h3>
                        </button>
                        {item.category && (
                          <p className="mb-2 text-xs text-amber-200/40">{item.category}</p>
                        )}
                        <p className="mb-3 text-lg font-bold text-amber-300">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          }).format(item.price)}
                        </p>

                        {/* Actions */}
                        <div className="mt-auto flex gap-2">
                          <Button
                            onClick={() => handleMoveToCart(item)}
                            size="sm"
                            className="flex-1 gap-1.5 bg-amber-600 text-stone-950 hover:bg-amber-500"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Move to Cart
                          </Button>
                          <Button
                            onClick={() => removeFromWishlist(item.productId)}
                            size="sm"
                            variant="outline"
                            className="border-amber-900/40 text-amber-200/60 hover:border-red-900/40 hover:bg-red-900/20 hover:text-red-300"
                            aria-label="Remove from wishlist"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-amber-200/50">
                {wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} in your wishlist
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setView('home')}
                  variant="outline"
                  className="gap-2 border-amber-900/40 text-amber-200/80 hover:bg-amber-900/20 hover:text-amber-100"
                >
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setView('cart')}
                  className="gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500"
                >
                  <ShoppingCart className="h-4 w-4" />
                  View Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
