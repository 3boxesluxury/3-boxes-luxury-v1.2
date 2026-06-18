'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Star,
  ImageIcon,
  ArrowRight,
  Wand2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/lib/store';

/* ── Types ── */

interface GalleryProduct {
  id: string;
  name: string;
  slug: string;
  images: string;
}

interface GalleryImage {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  aiGeneratedImage: string;
  rating: number;
  reviewTitle: string | null;
  reviewComment: string | null;
  status: string;
  createdAt: string;
  product: GalleryProduct;
}

interface GalleryResponse {
  // API returns { items, total } — also support legacy { images, pagination }
  items?: GalleryImage[];
  images?: GalleryImage[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/* ── Helpers ── */

/** Resolve the image source — handles both URLs and base64 data strings */
function resolveImageSrc(raw: string): string {
  if (!raw) return '';
  // Already a data URL or regular URL
  if (raw.startsWith('data:') || raw.startsWith('http') || raw.startsWith('/')) {
    return raw;
  }
  // Treat as raw base64 (no prefix) — prepend default PNG data URL prefix
  return `data:image/png;base64,${raw}`;
}

/** Parse product images from JSON string or array */
function parseProductImages(images: string | string[]): string[] {
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return images ? [images] : [];
  }
}

/** Format relative time */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
  });
}

/* ── Star Rating Display ── */

function StarDisplay({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= value
              ? 'fill-amber-400 text-amber-400'
              : 'fill-transparent text-stone-700'
          } transition-colors`}
        />
      ))}
    </div>
  );
}

/* ── Loading Skeleton ── */

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-md sm:max-w-none mx-auto sm:mx-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60"
        >
          <Skeleton className="aspect-square w-full rounded-none bg-stone-800/80" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-3/4 bg-stone-800/80" />
            <Skeleton className="h-3 w-1/2 bg-stone-800/80" />
            <Skeleton className="h-7 w-full mt-2 bg-stone-800/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Empty State ── */

function EmptyGallery() {
  const { setView, setCategory } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-900/25 bg-stone-900/20 py-16 px-6 text-center"
    >
      {/* Decorative icon */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-900/15">
          <Wand2 className="h-9 w-9 text-amber-500/40" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-900/30">
          <Sparkles className="h-3.5 w-3.5 text-amber-400/60" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-amber-100/80">
        No Styles Shared Yet
      </h3>
      <p className="mt-2 max-w-sm text-sm text-amber-200/40 leading-relaxed">
        Be the first to try on our luxury products with AI and share your unique style with the community.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button
          onClick={() => {
            setCategory(null);
            setView('social-style');
          }}
          className="bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/20 gap-2"
        >
          <Eye className="h-4 w-4" />
          Browse Products
        </Button>
      </div>

      {/* Subtle decorative dots */}
      <div className="mt-8 flex items-center gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-1 w-1 rounded-full bg-amber-600/20"
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Main Component ── */

export function AIStyleGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectProduct, setView: navigateToView, setCategory: clearCategory } = useStore();

  /* Fetch approved gallery items */
  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/style-gallery?limit=8&status=approved', {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        // API returned an error — gracefully fall back to empty state
        console.warn('Style Gallery API returned status:', res.status);
        setImages([]);
        return;
      }
      const data = await res.json();
      // Safely extract gallery items — API returns { items } or legacy { images }
      const galleryImages = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.images)
          ? data.images
          : [];
      setImages(galleryImages);
    } catch (err: any) {
      // Don't crash on network/timeout/abort errors — just show empty state
      if (err?.name === 'AbortError') {
        console.warn('Style Gallery fetch timed out');
      } else {
        console.warn('Style Gallery fetch error:', err?.message || err);
      }
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  /* Handle "Try This Look" — navigate to product */
  const handleTryLook = useCallback(
    (productId: string) => {
      selectProduct(productId);
    },
    [selectProduct]
  );

  return (
    <section id="ai-style-gallery" className="py-12 sm:py-16">
      {/* ── Section Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        {/* Icon + Title */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/15 border border-amber-600/20">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-amber-100 sm:text-3xl tracking-tight">
            AI Style Gallery
          </h2>
        </div>

        {/* Subtitle */}
        <p className="mx-auto max-w-lg text-sm text-amber-200/50 leading-relaxed sm:text-base">
          Discover how our community styles their favorite pieces. Try on products virtually with AI and share your unique look.
        </p>

        {/* Decorative line */}
        <div className="mt-5 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      </motion.div>

      {/* ── Gallery Content ── */}
      {loading ? (
        <GallerySkeleton />
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-xl border border-amber-900/20 bg-stone-900/30 py-12 text-center"
        >
          <ImageIcon className="h-10 w-10 text-amber-400/30 mb-3" />
          <p className="text-sm text-amber-200/40">{error}</p>
          <Button
            onClick={fetchGallery}
            variant="outline"
            size="sm"
            className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
          >
            Try Again
          </Button>
        </motion.div>
      ) : images.length === 0 ? (
        <EmptyGallery />
      ) : (
        <>
          {/* ── Gallery Grid — single column on mobile, 2 on tablet, 4 on desktop (Issue 5) ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-md sm:max-w-none mx-auto sm:mx-0">
            <AnimatePresence mode="popLayout">
              {images.filter(item => item && item.id).map((item, idx) => {
                const imgSrc = resolveImageSrc(item.aiGeneratedImage);
                const productImages = parseProductImages(item.product?.images);
                const productThumb =
                  productImages.length > 0 ? productImages[0] : null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{
                      duration: 0.4,
                      delay: idx * 0.06,
                      ease: 'easeOut',
                    }}
                    layout
                  >
                    <Card className="group overflow-hidden rounded-xl border border-amber-900/15 bg-stone-900/50 backdrop-blur-sm transition-all duration-300 hover:border-amber-700/30 hover:shadow-lg hover:shadow-amber-900/10 hover:-translate-y-0.5 py-0 gap-0">
                      {/* ── Image Container ── */}
                      <div className="relative aspect-square overflow-hidden">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={`AI style by ${item.userName} wearing ${item.product?.name || 'luxury product'}`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                            <ImageIcon className="h-8 w-8 text-amber-600/30" />
                          </div>
                        )}

                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* AI Generated badge */}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm px-1.5 py-0.5 gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI Generated
                          </Badge>
                        </div>

                        {/* Product thumbnail badge */}
                        {productThumb && (
                          <div className="absolute top-2 right-2">
                            <div className="h-8 w-8 rounded-md overflow-hidden border border-amber-900/30 shadow-md">
                              <img
                                src={productThumb}
                                alt={item.product?.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Card Content ── */}
                      <CardContent className="p-3 space-y-2">
                        {/* User + Rating */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/15 text-[10px] font-bold text-amber-400 border border-amber-600/20">
                              {item.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="text-xs text-amber-200/60 truncate font-medium">
                              {item.userName}
                            </span>
                          </div>
                          <StarDisplay value={item.rating || 0} size="sm" />
                        </div>

                        {/* Product Name */}
                        <p className="text-xs font-medium text-amber-100/80 line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {item.product?.name || 'Luxury Product'}
                        </p>

                        {/* Review comment (if any) */}
                        {item.reviewComment && (
                          <p className="text-[10px] text-amber-200/30 line-clamp-1 italic">
                            &ldquo;{item.reviewComment}&rdquo;
                          </p>
                        )}

                        {/* Time + Try This Look */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] text-amber-200/25">
                            {relativeTime(item.createdAt)}
                          </span>
                          <Button
                            onClick={() => handleTryLook(item.productId)}
                            size="sm"
                            className="h-6 rounded-md bg-amber-700/80 text-stone-950 hover:bg-amber-600 text-[10px] font-semibold px-2.5 gap-1 transition-all duration-200 hover:shadow-md hover:shadow-amber-700/20"
                          >
                            <Wand2 className="h-2.5 w-2.5" />
                            Try This Look
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* ── Bottom CTA Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 rounded-2xl border border-amber-900/20 bg-gradient-to-br from-amber-900/15 via-stone-900/50 to-amber-900/10 p-6 sm:p-8 text-center relative overflow-hidden"
          >
            {/* Decorative accents */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 top-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-amber-500/[0.04] blur-2xl" />
              <div className="absolute -right-16 top-1/3 h-24 w-24 rounded-full bg-amber-600/[0.04] blur-2xl" />
              <div className="absolute left-0 top-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Wand2 className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-amber-100 sm:text-xl">
                  Try On Your Favorite Style
                </h3>
              </div>
              <p className="mx-auto max-w-md text-sm text-amber-200/45 leading-relaxed">
                Upload your photo and see how our luxury products look on you. Share your AI-generated style with the community.
              </p>
              <div className="mt-5">
                <Button
                  onClick={() => {
                    clearCategory(null);
                    navigateToView('social-style');
                  }}
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-lg hover:shadow-amber-600/25 gap-2"
                >
                  Explore Products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </section>
  );
}
