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
import { useTranslation } from '@/hooks/useTranslation';

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

const getCuratedCollections = (t: (key: string, params?: Record<string, string | number>) => string): CuratedCollection[] => [
  {
    id: 'timeless-jewelry',
    title: t('curate.timelessJewelry'),
    subtitle: t('curate.handpickedElegance'),
    description: t('curate.timelessJewelryDesc'),
    icon: Gem,
    curator: t('curate.curatorPriya'),
    curatorTitle: t('curate.jewelryCurator'),
    items: 42,
    accentFrom: 'from-amber-500/10',
    accentTo: 'to-amber-900/5',
    accentColor: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30 hover:border-amber-500/50',
  },
  {
    id: 'modern-watches',
    title: t('curate.modernWatches'),
    subtitle: t('curate.precisionMeetsStyle'),
    description: t('curate.modernWatchesDesc'),
    icon: Watch,
    curator: t('curate.curatorArjun'),
    curatorTitle: t('curate.watchSpecialist'),
    items: 28,
    accentFrom: 'from-rose-500/10',
    accentTo: 'to-rose-900/5',
    accentColor: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30 hover:border-rose-500/50',
  },
  {
    id: 'artisan-fragrances',
    title: t('curate.artisanFragrances'),
    subtitle: t('curate.signatureScents'),
    description: t('curate.artisanFragrancesDesc'),
    icon: Flower2,
    curator: t('curate.curatorNeha'),
    curatorTitle: t('curate.fragranceExpert'),
    items: 35,
    accentFrom: 'from-teal-500/10',
    accentTo: 'to-teal-900/5',
    accentColor: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
    accentBorder: 'border-teal-500/30 hover:border-teal-500/50',
  },
  {
    id: 'couture-edit',
    title: t('curate.coutureEdit'),
    subtitle: t('curate.fashionForward'),
    description: t('curate.coutureEditDesc'),
    icon: Shirt,
    curator: t('curate.curatorRiya'),
    curatorTitle: t('curate.fashionDirector'),
    items: 56,
    accentFrom: 'from-pink-500/10',
    accentTo: 'to-pink-900/5',
    accentColor: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/30 hover:border-pink-500/50',
  },
  {
    id: 'luxury-home',
    title: t('curate.luxuryHome'),
    subtitle: t('curate.livingArtfully'),
    description: t('curate.luxuryHomeDesc'),
    icon: Home,
    curator: t('curate.curatorVikram'),
    curatorTitle: t('curate.homeLivingCurator'),
    items: 31,
    accentFrom: 'from-orange-500/10',
    accentTo: 'to-orange-900/5',
    accentColor: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30 hover:border-orange-500/50',
  },
  {
    id: 'gift-edit',
    title: t('curate.giftEdit'),
    subtitle: t('curate.curatedBy3Boxes'),
    description: t('curate.giftEditDesc'),
    icon: Palette,
    curator: t('curate.curator3BoxesTeam'),
    curatorTitle: t('curate.expertPanel'),
    items: 78,
    accentFrom: 'from-cyan-500/10',
    accentTo: 'to-cyan-900/5',
    accentColor: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-500/50',
  },
];

export function ThreeboxesCurateSection() {
  const { setView, setCategory, appTheme } = useStore();
  const { t } = useTranslation();

  const sectionClass = appTheme === 'light'
    ? 'relative overflow-hidden border-t border-stone-200 bg-amber-50 py-12 sm:py-16'
    : 'relative overflow-hidden border-t border-amber-900/20 bg-gradient-to-b from-stone-950 via-stone-900/30 to-stone-950 py-12 sm:py-16'

  return (
    <section className={sectionClass}>
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
            {t('curate.expertlyCurated')}
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            <span className="luxury-text">{t('curate.3boxes')} </span>
            <span className="text-amber-50">{t('curate.curate')}</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-amber-200/60 sm:text-base">
            {t('curate.description')}
          </p>
        </motion.div>

        {/* Collections Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {getCuratedCollections(t).map((collection, i) => {
            const Icon = collection.icon;
            const baseDarkClass = `group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${collection.accentFrom} ${collection.accentTo} to-stone-950/90 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 ${collection.accentBorder}`
            const baseLightClass = 'group relative overflow-hidden rounded-2xl border border-[#e5d4b3] bg-gradient-to-br from-[#f8efe1] via-[#fbf4ea] to-[#f5e6cf] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#d4b884] hover:bg-[#f4e4c8] hover:shadow-lg hover:shadow-amber-200/25'
            const cardClass = appTheme === 'light' ? `${baseLightClass} ${collection.accentBorder}` : baseDarkClass
            const titleTextClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
            const subtitleTextClass = appTheme === 'light' ? 'text-stone-600' : `${collection.accentColor} opacity-70`
            const descriptionTextClass = appTheme === 'light' ? 'text-stone-700' : 'text-amber-200/50'
            const curatorNameClass = appTheme === 'light' ? 'text-stone-900' : 'text-amber-100'
            const curatorTitleClass = appTheme === 'light' ? 'text-stone-600' : 'text-amber-200/40'

            return (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={cardClass}
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
                    <span className="text-[10px] font-medium text-amber-200/50">{collection.items} {t('common.items')}</span>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${subtitleTextClass}`}>
                    {collection.subtitle}
                  </span>
                </div>
                <h3 className={`mb-2 text-lg font-bold ${titleTextClass}`}>{collection.title}</h3>

                {/* Description */}
                <p className={`mb-4 text-xs leading-relaxed ${descriptionTextClass}`}>{collection.description}</p>

                {/* Curator info */}
                <div className="mb-4 flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${collection.accentBg} ${collection.accentBorder}`}>
                    <BadgeCheck className={`h-3.5 w-3.5 ${collection.accentColor}`} />
                  </div>
                  <div>
                    <p className={`text-[11px] font-semibold ${curatorNameClass}`}>{collection.curator}</p>
                    <p className={`text-[10px] ${curatorTitleClass}`}>{collection.curatorTitle}</p>
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
                  {t('curate.exploreCollection')}
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
            {t('curate.expertCurators')}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-amber-400" />
            {t('curate.handpickedItems')}
          </span>
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />
            {t('curate.qualityGuaranteed')}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
