'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  User,
  UserCircle,
  Baby,
  Home,
  Briefcase,
  Sparkles,
  Gem,
  Watch,
  Shirt,
  Flower2,
  ToyBrick,
  Pen,
  Flame,
  Building2,
  LayoutGrid,
  Ribbon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Types ───

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount: number;
  parentId: string | null;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productCount: number;
  parentId: string | null;
  order: number;
  children: Subcategory[];
}

// ─── Icon Maps ───

const parentCategoryIcons: Record<string, LucideIcon> = {
  couple: Heart,
  men: User,
  women: UserCircle,
  kids: Baby,
  home: Home,
  office: Briefcase,
  'new-arrivals': Sparkles,
};

const subcategoryIcons: Record<string, LucideIcon> = {
  'couple-friendly': Heart,
  'men-accessories': Gem,
  'men-shirts': Shirt,
  'men-tshirts': Shirt,
  'men-fragrances': Flower2,
  'men-watches': Watch,
  'men-leather': Briefcase,
  'women-jewelry': Gem,
  'women-sarees': Ribbon,
  'women-fashion': Shirt,
  'women-fragrances': Flower2,
  'women-accessories': Gem,
  'kids-toys': ToyBrick,
  'kids-fashion': Shirt,
  'kids-shirts': Shirt,
  'kids-dresses': Ribbon,
  'home-decor': Home,
  'home-candles': Flame,
  'home-living': Home,
  'office-corporate-gifts': Building2,
  'office-desk': LayoutGrid,
  'office-stationery': Pen,
};

// ─── Accent colors for categories ───

const categoryAccentBg: Record<string, string> = {
  couple: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50',
  men: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50',
  women: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/50',
  kids: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50',
  home: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50',
  office: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50',
  'new-arrivals': 'bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/20 hover:border-amber-400/50',
};

const categoryAccentIcon: Record<string, string> = {
  couple: 'text-rose-400',
  men: 'text-amber-400',
  women: 'text-pink-400',
  kids: 'text-cyan-400',
  home: 'text-orange-400',
  office: 'text-yellow-400',
  'new-arrivals': 'text-amber-300',
};

// ─── Component ───

export function CategoryGrid() {
  const { selectedCategory, setCategory } = useStore();
  const { t } = useTranslation();

  const { data } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  });

  const categories = (data?.categories ?? []).map((cat: Category) => ({
    ...cat,
    children: cat.children ?? [],
  }));

  // Find the parent category that matches the selected category
  const activeParent = selectedCategory
    ? categories.find(
        (cat) =>
          cat.slug === selectedCategory ||
          cat.children.some((sub) => sub.slug === selectedCategory)
      )
    : null;

  const subcategories = activeParent?.children ?? [];

  // Don't render if no category selected or no subcategories
  if (!selectedCategory || !activeParent || subcategories.length === 0) {
    return null;
  }

  const ParentIcon = parentCategoryIcons[activeParent.slug] || Gem;
  const accentBg = categoryAccentBg[activeParent.slug] || 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50';
  const accentIcon = categoryAccentIcon[activeParent.slug] || 'text-amber-400';

  return (
    <section className="py-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeParent.slug}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-r from-stone-950/90 via-stone-900/70 to-stone-950/90 backdrop-blur-sm"
        >
          {/* Header row with parent category */}
          <div className="flex items-center gap-3 border-b border-amber-900/15 px-5 py-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${accentBg}`}>
              <ParentIcon className={`h-4 w-4 ${accentIcon}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-100">
                {activeParent.name}
              </h3>
              <p className="text-[11px] text-amber-200/40">
                Browse subcategories
              </p>
            </div>
            <button
              onClick={() => setCategory(null)}
              className="text-[11px] text-amber-200/40 hover:text-amber-200/70 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Subcategory chips */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-3">
            {/* "All" chip */}
            <button
              onClick={() => setCategory(activeParent.slug)}
              className={`
                inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
                text-xs font-medium transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                ${selectedCategory === activeParent.slug
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10'
                  : 'border-stone-700/50 bg-stone-900/50 text-amber-200/50 hover:border-amber-600/30 hover:bg-stone-900/80 hover:text-amber-200/80'
                }
              `}
            >
              <LayoutGrid className="h-3 w-3" />
              All {activeParent.name}
            </button>

            {/* Individual subcategory chips */}
            {subcategories.map((sub, i) => {
              const SubIcon = subcategoryIcons[sub.slug] || Gem;
              const isActive = selectedCategory === sub.slug;

              return (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.15 }}
                  onClick={() => setCategory(sub.slug)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
                    text-xs font-medium transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50
                    ${isActive
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-500/10'
                      : 'border-stone-700/50 bg-stone-900/50 text-amber-200/50 hover:border-amber-600/30 hover:bg-stone-900/80 hover:text-amber-200/80'
                    }
                  `}
                >
                  <SubIcon className="h-3 w-3" />
                  {sub.name}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
