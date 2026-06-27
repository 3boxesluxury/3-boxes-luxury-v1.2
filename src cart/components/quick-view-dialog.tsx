'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useDynamicTranslation } from '@/lib/i18n/translate-dynamic';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, ShoppingCart, ExternalLink, Truck, Package, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';

interface QuickViewProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  category: string;
  categorySlug: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  tags: string[];
  isExternal?: boolean;
  platform?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  platformLogo?: string;
  translations?: Array<{ locale: string; name: string | null; description: string | null }>;
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  caratlane: 'CaratLane',
  tanishq: 'Tanishq',
  bluestone: 'BlueStone',
  voylla: 'Voylla',
};

const PLATFORM_BUTTON_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600 hover:bg-amber-500',
  tanishq: 'bg-rose-600 hover:bg-rose-500',
  bluestone: 'bg-blue-600 hover:bg-blue-500',
  voylla: 'bg-purple-600 hover:bg-purple-500',
  myntra: 'bg-red-600 hover:bg-red-500',
  nykaa: 'bg-pink-600 hover:bg-pink-500',
  amazon: 'bg-orange-600 hover:bg-orange-500',
  flipkart: 'bg-yellow-600 hover:bg-yellow-500',
};

export function QuickViewDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: QuickViewProduct | null;
}) {
  const { selectProduct, addItem, authUser, setAuthView } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { tName, tDesc } = useDynamicTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  if (!product) return null;

  const mainImage = product.images.length > 0
    ? getProxiedImageUrl(product.images[selectedImage] || product.images[0], product.platform)
    : '/images/placeholder.jpg';
  const isExternal = product.isExternal && product.platform;
  const platformSlug = product.platform?.toLowerCase() || '';
  const platformName = PLATFORM_DISPLAY_NAMES[platformSlug] || product.platform || '';
  const shopUrl = product.affiliateUrl || product.sourceUrl || '#';

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    // Require login before adding to cart
    if (!authUser) { setAuthView('login'); return; }
    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: getProxiedImageUrl(product.images[0] || '/images/placeholder.jpg', product.platform),
      translations: product.translations,
    });
    setTimeout(() => setIsAdding(false), 800);
  };

  const handleViewFullDetails = () => {
    onOpenChange(false);
    selectProduct(product.id);
  };

  const handleShopOnPlatform = () => {
    window.open(shopUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image Section */}
          <div className="relative aspect-square bg-stone-900/60">
            {product.images.length > 0 && !imageErrors.has(selectedImage) ? (
              <img
                src={mainImage}
                alt={tName(product)}
                className="h-full w-full object-cover"
                onError={() => setImageErrors(prev => new Set(prev).add(selectedImage))}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                <span className="text-5xl text-amber-600/40">&#x1F48E;</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {product.featured && (
                <span className="rounded-md bg-amber-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm">
                  {t('common.featuredBadge')}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-md bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  -{discount}%
                </span>
              )}
            </div>

            {product.stock === 0 && !isExternal && (
              <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70">
                <span className="rounded-md bg-stone-900/90 px-4 py-2 text-sm font-bold text-amber-200/60 backdrop-blur-sm">
                  {t('quickView.soldOutOverlay')}
                </span>
              </div>
            )}

            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 overflow-x-auto pb-1">
                {product.images.slice(0, 5).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 h-12 w-12 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === i
                        ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                        : 'border-stone-700/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={getProxiedImageUrl(img, product.platform)}
                      alt={`${tName(product)} ${i + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => setImageErrors(prev => new Set(prev).add(i))}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col p-5 md:p-6">
            <DialogHeader className="mb-3 space-y-0 text-left">
              <p className="text-[10px] uppercase tracking-wider text-amber-500/60">
                {product.category}
              </p>
              <DialogTitle className="text-lg font-bold text-amber-100 leading-tight">
                {tName(product)}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t('quickView.quickViewDetailsFor', { name: product.name })}
              </DialogDescription>
            </DialogHeader>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.floor(product.rating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-amber-700/30'
                  }`}
                />
              ))}
              <span className="ml-1.5 text-xs text-amber-200/40">
                {product.rating} ({product.reviewCount} {t('productDetail.reviewsWord')})
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl font-bold text-amber-400">
                {format(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-amber-200/25 line-through">
                  {format(product.compareAtPrice)}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {t('common.onlyLeft').replace('{count}', String(discount))}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-amber-200/50 line-clamp-3 mb-4 leading-relaxed">
              {tDesc(product)}
            </p>

            {/* Stock & Delivery */}
            <div className="space-y-1.5 mb-4">
              {product.stock > 0 && !isExternal && (
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-emerald-400/60" />
                  <span className="text-[11px] text-emerald-400/80">
                    {product.stock <= 5 ? t('productDetail.onlyLeftInStock', { count: product.stock }) : t('common.inStock')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Truck className="h-3 w-3 text-amber-400/60" />
                <span className="text-[11px] text-amber-200/40">
                  {t('quickView.freeDelivery')}
                </span>
              </div>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {product.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-amber-900/20 px-2 py-0.5 text-[9px] text-amber-400/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* CTA Buttons */}
            <div className="space-y-2 mt-4">
              {isExternal ? (
                <Button
                  onClick={handleShopOnPlatform}
                  className={`w-full text-stone-950 font-semibold gap-2 ${PLATFORM_BUTTON_COLORS[platformSlug] || 'bg-emerald-600 hover:bg-emerald-500'}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('common.shopOn', { platform: platformName })}
                </Button>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAdding}
                  className={`w-full font-semibold gap-2 ${
                    isAdding
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                  }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {isAdding ? t('quickView.addedToCartBtn') : product.stock === 0 ? t('common.soldOut') : t('common.addToCart')}
                </Button>
              )}

              <Button
                onClick={handleViewFullDetails}
                variant="outline"
                className="w-full border-amber-900/30 text-amber-200/70 hover:border-amber-600/40 hover:text-amber-400 gap-2"
              >
                {t('quickView.viewFullDetails')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}