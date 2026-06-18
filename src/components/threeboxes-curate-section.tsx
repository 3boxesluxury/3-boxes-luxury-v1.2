'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Crown,
  Palette,
  Gem,
  Watch,
  Flower2,
  Shirt,
  Home,
  ArrowRight,
  Eye,
  Star,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

interface CuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  curator: string;
  curatorTitle: string;
  items: number;
  accentFrom: string;
  accentTo: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'timeless-jewelry',
    title: 'Timeless Jewelry',
    subtitle: 'Handpicked Elegance',
    description: 'A curated selection of fine jewelry that transcends trends — from classic diamond studs to artisanal gold pieces.',
    icon: Gem,
    curator: 'Priya Sharma',
    curatorTitle: 'Jewelry Curator',
    items: 42,
    accentFrom: 'from-amber-500/10',
    accentTo: 'to-amber-900/5',
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    id: 'modern-watches',
    title: 'Modern Watches',
    subtitle: 'Precision Meets Style',
    description: 'From Swiss movements to smart luxury — timepieces that make a statement on every wrist.',
    icon: Watch,
    curator: 'Arjun Malhotra',
    curatorTitle: 'Watch Specialist',
    items: 28,
    accentFrom: 'from-rose-500/10',
    accentTo: 'to-rose-900/5',
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/50',
  },
  {
    id: 'artisan-fragrances',
    title: 'Artisan Fragrances',
    subtitle: 'Signature Scents',
    description: 'Discover niche perfumeries and luxury houses. Each fragrance tells a story of craftsmanship and allure.',
    icon: Flower2,
    curator: 'Neha Kapoor',
    curatorTitle: 'Fragrance Expert',
    items: 35,
    accentFrom: 'from-teal-500/10',
    accentTo: 'to-teal-900/5',
    accentColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
    accentBorder: 'border-teal-500/30 hover:border-teal-500/50',
  },
  {
    id: 'couture-edit',
    title: 'Couture Edit',
    subtitle: 'Fashion Forward',
    description: 'The latest in designer fashion — sarees, lehengas, and contemporary wear handpicked from top ateliers.',
    icon: Shirt,
    curator: 'Riya Singh',
    curatorTitle: 'Fashion Director',
    items: 56,
    accentFrom: 'from-pink-500/10',
    accentTo: 'to-pink-900/5',
    accentColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/30 hover:border-pink-500/50',
  },
  {
    id: 'luxury-home',
    title: 'Luxury Home',
    subtitle: 'Living Artfully',
    description: 'Elevate your living space with premium décor, artisanal candles, and handcrafted accessories.',
    icon: Home,
    curator: 'Vikram Patel',
    curatorTitle: 'Home & Living Curator',
    items: 31,
    accentFrom: 'from-orange-500/10',
    accentTo: 'to-orange-900/5',
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30 hover:border-orange-500/50',
  },
  {
    id: 'gift-edit',
    title: 'The Gift Edit',
    subtitle: 'Curated by 3BOXES',
    description: 'Our signature collection of the most giftable luxury items — approved by our style experts for every occasion.',
    icon: Palette,
    curator: '3BOXES Team',
    curatorTitle: 'Expert Panel',
    items: 78,
    accentFrom: 'from-cyan-500/10',
    accentTo: 'to-cyan-900/5',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/50',
  },
];

export function ThreeboxesCurateSection() {
  const { setView, setCategory } = useStore();

  return (
    <section className="relative overflow-hidden border-t border-amber-900/20 bg-gradient-to-b from-stone-950 via-stone-900/30 to-stone-950 py-12 sm:py-16">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-48 w-48 rounded-full bg-rose-500/5 blur-3xl" />
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
            <Crown className="h-3.5 w-3.5" />
            Expertly Curated by 3BOXES
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="luxury-text">3BOXES </span>
            <span className="text-amber-50">Curate</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
            Every piece is handpicked by our expert curators. Explore collections that reflect the finest in luxury, taste, and craftsmanship.
          </p>
        </motion.div>

        {/* Collections Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CURATED_COLLECTIONS.map((collection, i) => {
            const Icon = collection.icon;
            return (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${collection.accentFrom} ${collection.accentTo} to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 ${collection.accentBorder}`}
              >
                {/* Decorative corner accent */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl transition-all group-hover:bg-amber-500/10" />

                {/* Top row */}
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${collection.accentBg} ${collection.accentBorder}`}>
                    <Icon className={`h-5 w-5 ${collection.accentColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1">
                    <Eye className="h-3 w-3 text-amber-400/60" />
                    <span className="text-[10px] font-medium text-amber-200/50">{collection.items} items</span>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${collection.accentColor} opacity-70`}>
                    {collection.subtitle}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-amber-100">{collection.title}</h3>

                {/* Description */}
                <p className="mb-4 text-xs leading-relaxed text-amber-200/50">{collection.description}</p>

                {/* Curator info */}
                <div className="mb-4 flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${collection.accentBg} ${collection.accentBorder}`}>
                    <BadgeCheck className={`h-3.5 w-3.5 ${collection.accentColor}`} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-amber-100">{collection.curator}</p>
                    <p className="text-[10px] text-amber-200/40">{collection.curatorTitle}</p>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => {
                    setCategory(null);
                    setView('coming-soon' as any);
                  }}
                  variant="outline"
                  className={`w-full gap-2 border-amber-500/30 bg-amber-600/10 text-amber-200 hover:bg-amber-600/20 hover:text-amber-100 hover:border-amber-500/50 transition-all duration-300`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Explore Collection
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-amber-200/40"
        >
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            6 Expert Curators
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-amber-400" />
            270+ Handpicked Items
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />
            Quality Guaranteed
          </span>
        </motion.div>
      </div>
    </section>
  );
}
