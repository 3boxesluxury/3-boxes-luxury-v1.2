'use client';

import { motion } from 'framer-motion';
import {
  Users,
  Baby,
  Heart,
  Home,
  Gift,
  Sparkles,
  Crown,
  ArrowRight,
  Star,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

interface FamilyPack {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  items: string[];
  price: string;
  originalPrice: string;
  badge: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

const FAMILY_PACKS: FamilyPack[] = [
  {
    id: 'parents-pack',
    name: 'Parents Pack',
    description: 'Show your love with a curated collection of premium gifts for mom & dad',
    icon: Heart,
    items: ['Silk Saree', 'Premium Watch', 'Leather Wallet', 'Designer Fragrance'],
    price: '₹12,999',
    originalPrice: '₹18,499',
    badge: 'Most Loved',
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/50',
  },
  {
    id: 'kids-pack',
    name: 'Kids Pack',
    description: 'Delight the little ones with fun, safe, and exciting gift combos',
    icon: Baby,
    items: ['Educational Toy Set', 'Kids Fashion Kit', 'Storybook Collection', 'Art & Craft Box'],
    price: '₹4,999',
    originalPrice: '₹7,499',
    badge: 'Best Value',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/50',
  },
  {
    id: 'couple-pack',
    name: 'Couple Pack',
    description: 'Celebrate togetherness with matching luxury gifts for both',
    icon: Users,
    items: ['His & Hers Watch Set', 'Couple Fragrance Duo', 'Premium Chocolate Box', 'Photo Frame'],
    price: '₹15,999',
    originalPrice: '₹22,999',
    badge: 'Premium',
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    id: 'home-pack',
    name: 'Home Pack',
    description: 'Transform their home with elegant décor and living essentials',
    icon: Home,
    items: ['Scented Candle Set', 'Premium Bed Sheet', 'Crystal Vase', 'Wall Art Piece'],
    price: '₹8,999',
    originalPrice: '₹12,499',
    badge: 'New',
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30 hover:border-orange-500/50',
  },
];

export function FamilyPackSection() {
  const { toggleGiftBuilder, appTheme } = useStore();

  return (
    <section className="py-12 sm:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-400">
          <Package className="h-3.5 w-3.5" />
          Curated for Every Family
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          <span className="text-amber-50">Family </span>
          <span className="luxury-text">Gift Packs</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
          Pre-curated luxury gift bundles for every member of your family. Save up to 30% with our exclusive packs.
        </p>
      </motion.div>

      {/* Pack Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FAMILY_PACKS.map((pack, i) => {
          const Icon = pack.icon;
          const baseDarkClass = 'group relative overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/80 to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10'
          const baseLightClass = 'group relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50 via-amber-100 to-amber-50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-300/70 hover:shadow-lg hover:shadow-amber-200/25'
          const cardClass = appTheme === 'light' ? `${baseLightClass} ${pack.accentBorder}` : baseDarkClass
          const textColorClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
          const descriptionTextClass = appTheme === 'light' ? 'text-stone-700' : 'text-amber-200/50'
          const priceColorClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={cardClass}
            >
              {/* Badge */}
              <div className="absolute right-3 top-3">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${pack.accentBg} ${pack.accentBorder} ${pack.accentColor}`}>
                  <Star className="h-2.5 w-2.5" />
                  {pack.badge}
                </span>
              </div>

              {/* Icon */}
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${pack.accentBg} ${pack.accentBorder}`}>
                <Icon className={`h-6 w-6 ${pack.accentColor}`} strokeWidth={1.5} />
              </div>

              {/* Name */}
              <h3 className="mb-2 text-lg font-bold text-amber-100">{pack.name}</h3>

              {/* Description */}
              <p className="mb-4 text-xs leading-relaxed text-amber-200/50">{pack.description}</p>

              {/* Items list */}
              <div className="mb-4 space-y-1.5">
                {pack.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <Sparkles className={`h-3 w-3 ${pack.accentColor} opacity-60`} />
                    <span className="text-amber-200/60">{item}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-100">{pack.price}</span>
                <span className="text-sm text-amber-200/40 line-through">{pack.originalPrice}</span>
                <span className={`text-xs font-semibold ${pack.accentColor}`}>Save 30%</span>
              </div>

              {/* CTA */}
              <Button
                onClick={toggleGiftBuilder}
                className={`w-full gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-md hover:shadow-amber-600/20`}
              >
                <Gift className="h-4 w-4" />
                Customize Pack
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <p className="text-xs text-amber-200/40">
          <Crown className="mr-1 inline-block h-3.5 w-3.5 text-amber-400" />
          All packs include free gift wrapping & premium packaging
        </p>
      </motion.div>
    </section>
  );
}
