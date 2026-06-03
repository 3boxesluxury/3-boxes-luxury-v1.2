'use client';

import { useStore } from '@/lib/store';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, ExternalLink, Eye } from 'lucide-react';

import { useState } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';

interface Product {
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
}

// Platform badge colors
const PLATFORM_BADGE_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600/90',
  tanishq: 'bg-rose-600/90',
  bluestone: 'bg-blue-600/90',
  voylla: 'bg-purple-600/90',
  myntra: 'bg-red-600/90',
  nykaa: 'bg-pink-600/90',
  amazon: 'bg-orange-600/90',
  flipkart: 'bg-yellow-600/90',
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

const PLATFORM_TEXT_COLORS: Record<string, string> = {
  caratlane: 'text-amber-400',
  tanishq: 'text-rose-400',
  bluestone: 'text-blue-400',
  voylla: 'text-purple-400',
  myntra: 'text-red-400',
  nykaa: 'text-pink-400',
  amazon: 'text-orange-400',
  flipkart: 'text-yellow-400',
};

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

export function ProductCard({ product }: { product: Product }) {
  const { selectProduct, addItem } = useStore();
  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const totalImages = product.images.length;
  const currentImage = totalImages > 0
    ? getProxiedImageUrl(product.images[currentImageIndex], product.platform)
    : '/images/placeholder.jpg';
  const mainImage = totalImages > 0
    ? getProxiedImageUrl(product.images[0], product.platform)
    : '/images/placeholder.jpg';
  const isExternal = product.isExternal && product.platform;
  const platformSlug = product.platform?.toLowerCase() || '';
  const platformName = PLATFORM_DISPLAY_NAMES[platformSlug] || product.platform || '';
  const shopUrl = product.affiliateUrl || product.sourceUrl || '#';

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  // Reset to first image when unhovering
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCurrentImageIndex(0);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
    });
    setTimeout(() => setIsAdding(false), 600);
  };

  const handleShopOnPlatform = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.sourceUrl) {
      trackClick(product.id, platformSlug, product.sourceUrl, product.affiliateUrl);
    } else {
      window.open(shopUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group cursor-pointer overflow-hidden rounded-xl border border-amber-900/15 bg-stone-900/40 backdrop-blur-sm transition-all duration-300 hover:border-amber-700/30 hover:shadow-lg hover:shadow-amber-900/10"
      onClick={() => selectProduct(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Carousel */}
      <div className="relative aspect-square overflow-hidden bg-stone-800/60">
        {!imageError ? (
          <img
            key={currentImageIndex}
            src={currentImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <span className="text-3xl text-amber-600/40">💎</span>
          </div>
        )}

        {/* Carousel Dots */}
        {totalImages > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {product.images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleDotClick(e, i)}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                  i === currentImageIndex
                    ? 'bg-amber-500 scale-125'
                    : 'bg-amber-500/20 hover:bg-amber-500/40'
                }`}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

        {/* Quick View button on hover */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Eye className="h-3 w-3" />
            Quick View
          </div>
        </div>

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <span className="rounded-md bg-amber-600/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur-sm">
              {t('common.featured')}
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              -{discount}%
            </span>
          )}
        </div>

        {/* Platform Badge */}
        {isExternal && platformSlug && (
          <span className={`absolute top-2 right-2 z-10 rounded-full ${PLATFORM_BADGE_COLORS[platformSlug] || 'bg-emerald-600/90'} px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm flex items-center gap-1 backdrop-blur-sm`}>
            {platformName}
            <ExternalLink className="h-2.5 w-2.5" />
          </span>
        )}

        {/* Stock badge */}
        {product.stock <= 3 && product.stock > 0 && !isExternal && (
          <span className="absolute right-2 bottom-2 rounded bg-red-900/80 px-1.5 py-0.5 text-[9px] font-medium text-red-200 backdrop-blur-sm">
            {t('common.onlyLeft', { count: String(product.stock) })}
          </span>
        )}
        {product.stock === 0 && !isExternal && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/70">
            <span className="rounded-md bg-stone-900/90 px-3 py-1.5 text-xs font-bold text-amber-200/60 backdrop-blur-sm">
              {t('common.soldOut')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[9px] uppercase tracking-wider text-amber-500/50">
          {product.category}
        </p>
        <h3 className="mt-0.5 text-xs font-semibold text-amber-100/90 line-clamp-1 group-hover:text-amber-400 transition-colors sm:text-sm">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="mt-1 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-2.5 w-2.5 ${
                i < Math.floor(product.rating)
                  ? 'fill-amber-500 text-amber-500'
                  : 'text-amber-700/30'
              }`}
            />
          ))}
          <span className="ml-1 text-[9px] text-amber-200/30">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-amber-400 sm:text-base">
            {format(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-[10px] text-amber-200/25 line-through">
              {format(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* CTA Section */}
        {isExternal ? (
          <div className="mt-2">
            <p className={`text-[9px] font-medium ${PLATFORM_TEXT_COLORS[platformSlug] || 'text-emerald-400'} flex items-center gap-1 mb-1.5`}>
              <ExternalLink className="h-2.5 w-2.5" />
              Available on {platformName}
            </p>
            <Button
              onClick={handleShopOnPlatform}
              className={`w-full transition-all duration-300 text-stone-950 font-semibold gap-1.5 text-xs h-8 ${PLATFORM_BUTTON_COLORS[platformSlug] || 'bg-emerald-600 hover:bg-emerald-500'}`}
              size="sm"
            >
              <ExternalLink className="h-3 w-3" />
              Shop on {platformName}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`mt-2 w-full transition-all duration-300 text-xs h-8 ${
              isAdding
                ? 'bg-emerald-600 text-white scale-95'
                : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
            }`}
            size="sm"
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            {isAdding ? t('common.added') : product.stock === 0 ? t('common.soldOut') : t('common.addToCart')}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
