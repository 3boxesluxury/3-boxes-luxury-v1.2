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
import { useTranslation } from '@/hooks/useTranslation';

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

function getFamilyPacks(t: any): FamilyPack[] { return [
  {
    id: 'parents-pack',
    name: t('familyPack.parentsPack'),
    description: t('familyPack.parentsDesc'),
    icon: Heart,
    items: [t('familyPack.silkSaree'), t('familyPack.premiumWatch'), t('familyPack.leatherWallet'), t('familyPack.designerFragrance')],
    price: '₹12,999',
    originalPrice: '₹18,499',
    badge: t('familyPack.mostLoved'),
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/50',
  },
  {
    id: 'kids-pack',
    name: t('familyPack.kidsPack'),
    description: t('familyPack.kidsDesc'),
    icon: Baby,
    items: [t('familyPack.eduToy'), t('familyPack.kidsFashion'), t('familyPack.storybook'), t('familyPack.artCraft')],
    price: '₹4,999',
    originalPrice: '₹7,499',
    badge: t('familyPack.bestValue'),
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/50',
  },
  {
    id: 'couple-pack',
    name: t('familyPack.couplePack'),
    description: t('familyPack.coupleDesc'),
    icon: Users,
    items: [t('familyPack.watchSet'), t('familyPack.fragranceDuo'), t('familyPack.chocolateBox'), t('familyPack.photoFrame')],
    price: '₹15,999',
    originalPrice: '₹22,999',
    badge: t('familyPack.premium'),
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    id: 'home-pack',
    name: t('familyPack.homePack'),
    description: t('familyPack.homeDesc'),
    icon: Home,
    items: [t('familyPack.candleSet'), t('familyPack.bedSheet'), t('familyPack.crystalVase'), t('familyPack.wallArt')],
    price: '₹8,999',
    originalPrice: '₹12,499',
    badge: t('familyPack.newBadge'),
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30 hover:border-orange-500/50',
  },
]};

export function FamilyPackSection() {
  const { toggleGiftBuilder, setView, appTheme } = useStore();
  const { t } = useTranslation();
  const headerTextClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-50'
  const subheaderTextClass = appTheme === 'light' ? 'text-stone-600' : 'text-amber-200/60'

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
          {t('familyPack.pill')}
        </div>
        <h2 className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl ${headerTextClass}`}>
          <span className={headerTextClass}>{t('familyPack.title1')} </span>
          <span className="luxury-text">{t('familyPack.title2')}</span>
        </h2>
        <p className={`mx-auto mt-3 max-w-xl text-sm ${subheaderTextClass} sm:text-base`}>
          {t('familyPack.subtitle')}
        </p>
      </motion.div>

      {/* Pack Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {getFamilyPacks(t).map((pack, i) => {
          const Icon = pack.icon;
          const baseDarkClass = 'group relative overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-b from-stone-900/80 to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10'
          const baseLightClass = 'group relative overflow-hidden rounded-2xl border border-[#e5d4b3] bg-gradient-to-b from-[#f8efe1] via-[#fbf4ea] to-[#f5e6cf] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#d4b884] hover:bg-[#f4e4c8] hover:shadow-lg hover:shadow-amber-200/25'
          const cardClass = appTheme === 'light' ? `${baseLightClass} ${pack.accentBorder}` : `${baseDarkClass} ${pack.accentBorder}`
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
              <h3 className={`mb-2 text-lg font-bold ${textColorClass}`}>{pack.name}</h3>

              {/* Description */}
              <p className={`mb-4 text-xs leading-relaxed ${descriptionTextClass}`}>{pack.description}</p>

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
                <span className={`text-xl font-bold ${priceColorClass}`}>{pack.price}</span>
                <span className="text-sm text-stone-500/70 line-through">{pack.originalPrice}</span>
                <span className={`text-xs font-semibold ${pack.accentColor}`}>{t('familyPack.save30')}</span>
              </div>

              {/* CTA — "Explore Collection" now opens the Coming Soon page (v3 fix) */}
              <Button
                onClick={() => setView('coming-soon' as any)}
                className={`w-full gap-2 bg-amber-600 text-stone-950 hover:bg-amber-500 transition-all duration-300 hover:shadow-md hover:shadow-amber-600/20`}
              >
                <Sparkles className="h-4 w-4" />
                {t('familyPack.exploreCollection')}
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
          {t('familyPack.giftWrap')}
        </p>
      </motion.div>
    </section>
  );
}
