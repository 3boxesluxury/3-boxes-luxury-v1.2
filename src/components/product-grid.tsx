'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from './product-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';

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

// Platform chip dot colors
const PLATFORM_DOT_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-500',
  tanishq: 'bg-rose-500',
  bluestone: 'bg-blue-500',
  voylla: 'bg-purple-500',
  myntra: 'bg-red-500',
  nykaa: 'bg-pink-500',
  amazon: 'bg-orange-500',
  flipkart: 'bg-yellow-500',
};

const PLATFORM_CHIP_ACTIVE_BG: Record<string, string> = {
  caratlane: 'bg-amber-600/20 border-amber-500/50 text-amber-300',
  tanishq: 'bg-rose-600/20 border-rose-500/50 text-rose-300',
  bluestone: 'bg-blue-600/20 border-blue-500/50 text-blue-300',
  voylla: 'bg-purple-600/20 border-purple-500/50 text-purple-300',
  myntra: 'bg-red-600/20 border-red-500/50 text-red-300',
  nykaa: 'bg-pink-600/20 border-pink-500/50 text-pink-300',
  amazon: 'bg-orange-600/20 border-orange-500/50 text-orange-300',
  flipkart: 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300',
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

const PLATFORM_OPTIONS = [
  { value: 'myntra', label: 'Myntra' },
  { value: 'nykaa', label: 'Nykaa' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'caratlane', label: 'CaratLane' },
  { value: 'tanishq', label: 'Tanishq' },
  { value: 'bluestone', label: 'BlueStone' },
  { value: 'voylla', label: 'Voylla' },
];

const OCCASION_OPTIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'diwali', label: 'Diwali' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'valentines', label: "Valentine's" },
  { value: 'housewarming', label: 'Housewarming' },
  { value: 'thank-you', label: 'Thank You' },
  { value: 'congratulations', label: 'Congratulations' },
  { value: 'just-because', label: 'Just Because' },
];

const RECIPIENT_OPTIONS = [
  { value: 'him', label: 'Him' },
  { value: 'her', label: 'Her' },
  { value: 'couple', label: 'Couple' },
  { value: 'kids', label: 'Kids' },
  { value: 'parents', label: 'Parents' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'boss', label: 'Boss' },
];

const PRICE_RANGE_OPTIONS = [
  { value: 'under-50', label: 'Under $50', min: 0, max: 50 },
  { value: '50-100', label: '$50 - $100', min: 50, max: 100 },
  { value: '100-250', label: '$100 - $250', min: 100, max: 250 },
  { value: '250-500', label: '$250 - $500', min: 250, max: 500 },
  { value: '500+', label: '$500+', min: 500, max: null },
];

// Proper display names for category slugs (avoids "Men Tshirts" etc.)
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'couple': 'Couple',
  'couple-friendly': 'Couple Friendly',
  'men': 'Men',
  'men-accessories': 'Men Accessories',
  'men-shirts': 'Men Shirts',
  'men-tshirts': 'Men T-Shirts & Polos',
  'men-fragrances': 'Men Fragrances',
  'men-watches': 'Men Watches',
  'men-leather': 'Men Leather Goods',
  'women': 'Women',
  'women-jewelry': 'Women Jewelry',
  'women-sarees': 'Women Sarees',
  'women-fashion': 'Women Fashion',
  'women-fragrances': 'Women Fragrances',
  'women-accessories': 'Women Accessories',
  'kids': 'Kids',
  'kids-toys': 'Kids Toys & Games',
  'kids-fashion': 'Kids Fashion',
  'kids-shirts': 'Kids Shirts',
  'kids-dresses': 'Kids Dresses',
  'home': 'Home',
  'home-decor': 'Home Décor',
  'home-candles': 'Home Candles & Fragrances',
  'home-living': 'Home Living',
  'office': 'Office',
  'office-corporate-gifts': 'Office Corporate Gifts',
  'office-desk': 'Office Desk Accessories',
  'office-stationery': 'Office Stationery',
  'new-arrivals': 'New Arrivals',
};

function getCategoryDisplayName(slug: string): string {
  return CATEGORY_DISPLAY_NAMES[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ProductGrid() {
  const { searchQuery, selectedCategory, setCategory, _scrollToProducts } = useStore();
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [sort, setSort] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [occasionFilter, setOccasionFilter] = useState<string>('all');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('all');

  const priceRange = PRICE_RANGE_OPTIONS.find((o) => o.value === priceRangeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, sort, sourceFilter, platformFilter, occasionFilter, recipientFilter, relationshipFilter, priceRangeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sort);
      params.set('limit', '50');
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);
      if (platformFilter && platformFilter !== 'all') params.set('platform', platformFilter);
      if (occasionFilter && occasionFilter !== 'all') params.set('occasion', occasionFilter);
      if (recipientFilter && recipientFilter !== 'all') params.set('recipient', recipientFilter);
      if (relationshipFilter && relationshipFilter !== 'all') params.set('relationship', relationshipFilter);
      if (priceRange) {
        params.set('priceMin', String(priceRange.min));
        if (priceRange.max !== null) params.set('priceMax', String(priceRange.max));
      }
      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
  });

  const products: Product[] = data?.products ?? [];

  // Compute which platforms have products in current results
  const availablePlatforms = useMemo(() => {
    const prods = data?.products;
    if (!prods) return [];
    const platformSet = new Set<string>();
    for (const p of prods as Product[]) {
      if (p.isExternal && p.platform) {
        platformSet.add(p.platform.toLowerCase());
      }
    }
    return PLATFORM_OPTIONS.filter(opt => platformSet.has(opt.value));
  }, [data]);

  const clearFilters = () => {
    setCategory(null);
    useStore.getState().setSearch('');
    setSourceFilter('all');
    setPlatformFilter('all');
    setOccasionFilter('all');
    setRecipientFilter('all');
    setRelationshipFilter('all');
    setPriceRangeFilter('all');
  };

  const hasActiveFilters = selectedCategory || searchQuery || sourceFilter !== 'all' || platformFilter !== 'all' || occasionFilter !== 'all' || recipientFilter !== 'all' || relationshipFilter !== 'all' || priceRangeFilter !== 'all';

  // Scroll to this section when category changes or Shop Now is clicked
  useEffect(() => {
    if (sectionRef.current) {
      // Scroll if category is selected, or if scrollToProducts flag was toggled
      if (selectedCategory || _scrollToProducts > 0) {
        // Small delay to allow React to render the content first
        const timer = setTimeout(() => {
          sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCategory, _scrollToProducts]);

  return (
    <section id="product-grid-section" ref={sectionRef} className="relative py-6">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-amber-900/[0.03] to-transparent" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {selectedCategory === 'new-arrivals' ? (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-amber-100 sm:text-xl flex items-center gap-2">
                    New Arrivals
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                      Just In
                    </span>
                  </h2>
                  {!isLoading && (
                    <p className="mt-0.5 text-xs text-amber-200/40">
                      {data?.total ?? 0} {t('categories.items')} — Fresh picks just landed
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-amber-100 sm:text-xl">
                  {searchQuery
                    ? t('products.resultsFor', { query: searchQuery })
                    : selectedCategory
                    ? getCategoryDisplayName(selectedCategory)
                    : t('products.allProducts')}
                </h2>
                {!isLoading && (
                  <p className="mt-0.5 text-xs text-amber-200/40">
                    {data?.total ?? 0} {t('categories.items')}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Clear button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 h-8 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                {t('common.clear')}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 sm:hidden h-8"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>

            {/* Sort */}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-8">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/30 bg-stone-900">
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Filters Row */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Source</span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[120px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-7">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/30 bg-stone-900">
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="own">Our Collection</SelectItem>
                <SelectItem value="external">External Platforms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Occasion Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Occasion</span>
            <Select value={occasionFilter} onValueChange={setOccasionFilter}>
              <SelectTrigger className="w-[120px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-7">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/30 bg-stone-900">
                <SelectItem value="all">All Occasions</SelectItem>
                {OCCASION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">For</span>
            <Select value={recipientFilter} onValueChange={setRecipientFilter}>
              <SelectTrigger className="w-[100px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-7">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/30 bg-stone-900">
                <SelectItem value="all">All</SelectItem>
                {RECIPIENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">Price</span>
            <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
              <SelectTrigger className="w-[110px] border-amber-900/30 bg-stone-900/50 text-amber-200/70 text-xs h-7">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/30 bg-stone-900">
                <SelectItem value="all">Any Price</SelectItem>
                {PRICE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Platform Filter Chips */}
        {availablePlatforms.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-amber-200/40 uppercase tracking-wider mr-1">Platform</span>
            <button
              onClick={() => setPlatformFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                platformFilter === 'all'
                  ? 'border-amber-500/50 bg-amber-600/20 text-amber-300'
                  : 'border-amber-900/20 bg-stone-900/40 text-amber-200/50 hover:border-amber-600/30 hover:text-amber-200/70'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              All
            </button>
            {availablePlatforms.map((p) => {
              const slug = p.value;
              const isActive = platformFilter === slug;
              return (
                <button
                  key={slug}
                  onClick={() => setPlatformFilter(isActive ? 'all' : slug)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? PLATFORM_CHIP_ACTIVE_BG[slug] || 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                      : 'border-amber-900/20 bg-stone-900/40 text-amber-200/50 hover:border-amber-600/30 hover:text-amber-200/70'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${PLATFORM_DOT_COLORS[slug] || 'bg-emerald-500'}`} />
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-amber-900/15 bg-stone-900/40">
                <Skeleton className="aspect-square bg-stone-800/60" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16 bg-stone-800/60" />
                  <Skeleton className="h-4 w-3/4 bg-stone-800/60" />
                  <Skeleton className="h-5 w-20 bg-stone-800/60" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl">🔍</span>
            <h3 className="mt-4 text-lg font-semibold text-amber-100">{t('products.noProductsFound')}</h3>
            <p className="mt-2 text-sm text-amber-200/40">
              {t('products.tryAdjusting')}
            </p>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
            >
              {t('products.viewAllProducts')}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
