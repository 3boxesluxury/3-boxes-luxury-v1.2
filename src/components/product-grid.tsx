'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { ProductCard } from './product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

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
  occasions: string[];
  recipientTypes: string[];
  relationships: string[];
  deliveryEstimate: string | null;
  isExternal?: boolean;
  platform?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  platformLogo?: string;
}

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'own', label: '3 Boxes Luxury' },
  { value: 'external', label: 'External Partners' },
];

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
  { value: 'valentines', label: "Valentine's" },
  { value: 'housewarming', label: 'Housewarming' },
];

const RECIPIENT_OPTIONS = [
  { value: 'him', label: 'For Him' },
  { value: 'her', label: 'For Her' },
  { value: 'couple', label: 'For Couple' },
  { value: 'kids', label: 'For Kids' },
  { value: 'parents', label: 'For Parents' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'husband', label: 'Husband' },
  { value: 'wife', label: 'Wife' },
  { value: 'boyfriend', label: 'Boyfriend' },
  { value: 'girlfriend', label: 'Girlfriend' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'friend', label: 'Friend' },
];

const PRICE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Prices', min: null, max: null },
  { value: 'under-1000', label: 'Under ₹1,000', min: null, max: 1000 },
  { value: '1000-5000', label: '₹1,000 - ₹5,000', min: 1000, max: 5000 },
  { value: '5000-10000', label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
  { value: 'over-10000', label: 'Over ₹10,000', min: 10000, max: null },
];

export function ProductGrid() {
  const { searchQuery, selectedCategory, setCategory, _scrollToProducts } = useStore();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [occasionFilter, setOccasionFilter] = useState('all');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [relationshipFilter, setRelationshipFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, sort, sourceFilter, platformFilter, occasionFilter, recipientFilter, relationshipFilter, priceRangeFilter]);

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
    // Performance: cache results for 5 minutes so repeated category clicks are instant
    staleTime: 5 * 60 * 1000,    // 5 min — data stays fresh
    cacheTime: 10 * 60 * 1000,   // 10 min — cache kept in memory
    refetchOnWindowFocus: false,  // don't refetch when switching tabs
  });

  const products: Product[] = data?.products ?? [];

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

  return (
    <section id="products" className="scroll-mt-20 py-8">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-amber-100">
              {searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory ? selectedCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All Products'}
            </h2>
            <p className="mt-1 text-sm text-amber-200/50">
              {data?.total ?? 0} products found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-amber-900/40 bg-stone-900/50 text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-300"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[160px] border-amber-900/40 bg-stone-900/50 text-amber-200/70">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-amber-900/20 bg-stone-900/50 p-3">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                {SOURCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {availablePlatforms.length > 0 && (
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                  <SelectItem value="all">All Platforms</SelectItem>
                  {availablePlatforms.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={occasionFilter} onValueChange={setOccasionFilter}>
              <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Occasion" /></SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                <SelectItem value="all">All Occasions</SelectItem>
                {OCCASION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={recipientFilter} onValueChange={setRecipientFilter}>
              <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Recipient" /></SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                <SelectItem value="all">All Recipients</SelectItem>
                {RECIPIENT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
              <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Relationship" /></SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                <SelectItem value="all">All Relationships</SelectItem>
                {RELATIONSHIP_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
              <SelectTrigger className="w-[140px] border-amber-900/40 bg-stone-900/50 text-amber-200/70"><SelectValue placeholder="Price Range" /></SelectTrigger>
              <SelectContent className="border-amber-900/40 bg-stone-950 text-amber-100">
                {PRICE_RANGE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-amber-300/70 hover:bg-amber-900/20 hover:text-amber-200">
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        )}
      </div>

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
          <h3 className="mt-4 text-lg font-semibold text-amber-100">No products found</h3>
          <p className="mt-2 text-sm text-amber-200/40">Try adjusting your search or filters.</p>
          <Button onClick={clearFilters} className="mt-6 bg-amber-600 text-stone-950 hover:bg-amber-500">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}