'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from '@/hooks/useTranslation';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ShoppingCart, Star, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600/90',
  tanishq: 'bg-rose-600/90',
  bluestone: 'bg-blue-600/90',
  voylla: 'bg-purple-600/90',
  myntra: 'bg-red-600/90',
  nykaa: 'bg-pink-600/90',
  amazon: 'bg-orange-600/90',
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  caratlane: 'CaratLane',
  tanishq: 'Tanishq',
  bluestone: 'BlueStone',
  voylla: 'Voylla',
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  amazon: 'Amazon',
  flipkart: 'Flipkart',
};

// Performance: Resize Shopify CDN images to 400px for faster loading (10x smaller file size)
function optimizeImageUrl(url: string, size: number = 400): string {
  if (!url) return url;
  // Only optimize Shopify CDN URLs
  if (url.includes('cdn.shopify.com')) {
    // Shopify supports _WIDTHxWIDTH suffix for resizing
    if (url.includes('.jpg')) return url.replace('.jpg', `_${size}x${size}.jpg`);
    if (url.includes('.jpeg')) return url.replace('.jpeg', `_${size}x${size}.jpeg`);
    if (url.includes('.png')) return url.replace('.png', `_${size}x${size}.png`);
    if (url.includes('.webp')) return url.replace('.webp', `_${size}x${size}.webp`);
  }
  return url;
}

export function ProductCard({ product }: { product: Product }) {
  const { selectProduct, addItem, selectedCategory } = useStore();
  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = Array.isArray(product.images) ? product.images : [];
  const totalImages = images.length;
  const currentImage = totalImages > 0
    ? optimizeImageUrl(getProxiedImageUrl(images[currentImageIndex], product.platform))
    : '/images/placeholder.jpg';
  const mainImage = totalImages > 0
    ? optimizeImageUrl(getProxiedImageUrl(images[0], product.platform))
    : '/images/placeholder.jpg';
  const isExternal = product.isExternal && product.platform;
  const platformSlug = product.platform?.toLowerCase() || '';
  const platformName = PLATFORM_DISPLAY_NAMES[platformSlug] || product.platform || '';
  const shopUrl = product.affiliateUrl || product.sourceUrl || '#';

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

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
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleCardClick = () => {
    if (isExternal) {
      trackClick(product.id, platformSlug, shopUrl);
      window.open(shopUrl, '_blank');
    } else {
      selectProduct(product.id);
    }
  };

  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60 transition-all hover:border-amber-700/40 hover:shadow-lg hover:shadow-amber-900/10"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-stone-800">
                <Image
          src={imageError ? '/images/placeholder.jpg' : currentImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImageError(true)}
        />

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-950">
              Featured
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              -{discount}%
            </span>
          )}
        </div>

        {isExternal && (
          <div className="absolute right-2 top-2">
            <span className={`flex items-center gap-1 rounded-md ${PLATFORM_BADGE_COLORS[platformSlug] || 'bg-stone-700'} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white`}>
              <ExternalLink className="h-3 w-3" />
              {platformName}
            </span>
          </div>
        )}

        {/* Image Dots */}
        {totalImages > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                        {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => handleDotClick(e, i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentImageIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-amber-100/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Hover Add to Cart */}
        {!isExternal && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              disabled={isAdding || product.stock === 0}
              className="flex w-full items-center justify-center gap-2 bg-amber-600 py-2.5 text-xs font-semibold text-stone-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? (
                <>Added!</>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-amber-100">
          {product.name}
        </h3>

        <div className="mt-1 flex items-center gap-1">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-amber-200/60">{product.rating.toFixed(1)} ({product.reviewCount})</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-amber-300">
            {format(product.price)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-amber-200/40 line-through">
              {format(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}