'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Heart,
  Users,
  Baby,
  Briefcase,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  X,
  ShoppingCart,
  Check,
  Sparkles,
  PartyPopper,
  Cake,
  Gem,
  Home,
  TreePine,
  HeartHandshake,
  ThumbsUp,
  Star,
  User,
  UserPlus,
  UsersRound,
  Crown,
  Package,
  Info,
  HelpCircle,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useStore } from '@/lib/store';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';

// Helper: pick the right product name from the translations array based on locale
function getLocalizedName(product: { name: string; translations?: Array<{ locale: string; name: string | null }> }, locale: string): string {
  if (!product.translations || product.translations.length === 0) return product.name;
  const tr = product.translations.find(t => t.locale === locale);
  return tr?.name || product.name;
}
// useDynamicTranslation removed — using getLocalizedName with translations array instead

// ─── Step definitions ───

const OCCASIONS = [
  { value: 'birthday', labelKey: 'giftBuilder.occasions.birthday', icon: Cake, emoji: '🎂' },
  { value: 'anniversary', labelKey: 'giftBuilder.occasions.anniversary', icon: Heart, emoji: '💕' },
  { value: 'wedding', labelKey: 'giftBuilder.occasions.wedding', icon: Gem, emoji: '💒' },
  { value: 'diwali', labelKey: 'giftBuilder.occasions.diwali', icon: Sparkles, emoji: '🪔' },
  { value: 'christmas', labelKey: 'giftBuilder.occasions.christmas', icon: TreePine, emoji: '🎄' },
  { value: 'valentine', labelKey: 'giftBuilder.occasions.valentine', icon: HeartHandshake, emoji: '💝' },
  { value: 'housewarming', labelKey: 'giftBuilder.occasions.housewarming', icon: Home, emoji: '🏠' },
  { value: 'thank-you', labelKey: 'giftBuilder.occasions.thankYou', icon: ThumbsUp, emoji: '🙏' },
  { value: 'congratulations', labelKey: 'giftBuilder.occasions.congratulations', icon: PartyPopper, emoji: '🎉' },
  { value: 'just-because', labelKey: 'giftBuilder.occasions.justBecause', icon: Star, emoji: '✨' },
];

const RECIPIENTS = [
  { value: 'him', labelKey: 'giftBuilder.recipients.him', icon: User, emoji: '👨' },
  { value: 'her', labelKey: 'giftBuilder.recipients.her', icon: Heart, emoji: '👩' },
  { value: 'couple', labelKey: 'giftBuilder.recipients.couple', icon: UsersRound, emoji: '👫' },
  { value: 'kids', labelKey: 'giftBuilder.recipients.kids', icon: Baby, emoji: '👶' },
  { value: 'parents', labelKey: 'giftBuilder.recipients.parents', icon: Users, emoji: '👨‍👩‍👧' },
  { value: 'friend', labelKey: 'giftBuilder.recipients.friend', icon: UserPlus, emoji: '🤝' },
  { value: 'colleague', labelKey: 'giftBuilder.recipients.colleague', icon: Briefcase, emoji: '💼' },
  { value: 'boss', labelKey: 'giftBuilder.recipients.boss', icon: Crown, emoji: '👑' },
];

const RELATIONSHIPS = [
  { value: 'spouse', labelKey: 'giftBuilder.relationships.spouse', emoji: '💍' },
  { value: 'parent', labelKey: 'giftBuilder.relationships.parent', emoji: '👨‍👩' },
  { value: 'sibling', labelKey: 'giftBuilder.relationships.sibling', emoji: '👫' },
  { value: 'friend', labelKey: 'giftBuilder.relationships.friend', emoji: '🤝' },
  { value: 'colleague', labelKey: 'giftBuilder.relationships.colleague', emoji: '💼' },
  { value: 'boss', labelKey: 'giftBuilder.relationships.boss', emoji: '👑' },
  { value: 'other', labelKey: 'giftBuilder.relationships.other', emoji: '🌟' },
];

const BUDGETS = [
  { value: 'under-2000', labelKey: 'giftBuilder.budgets.under2000', emoji: '💵' },
  { value: '2000-5000', labelKey: 'giftBuilder.budgets.2000to5000', emoji: '💰' },
  { value: '5000-10000', labelKey: 'giftBuilder.budgets.5000to10000', emoji: '💎' },
  { value: '10000-25000', labelKey: 'giftBuilder.budgets.10000to25000', emoji: '👑' },
  { value: '25000-plus', labelKey: 'giftBuilder.budgets.25000plus', emoji: '🏆' },
];

// Step labels are now resolved via t() at render time (see step tracker below)
const STEPS = ['occasion', 'recipient', 'relationship', 'budget', 'products', 'review'];

// Step-by-step instructional text
// Step info is resolved via t() at render time using stepInfoKey below
const STEP_INFO_KEY: Record<number, string> = {
  0: 'giftBuilder.stepInfo.occasion',
  1: 'giftBuilder.stepInfo.recipient',
  2: 'giftBuilder.stepInfo.relationship',
  3: 'giftBuilder.stepInfo.budget',
  4: 'giftBuilder.stepInfo.products',
  5: 'giftBuilder.stepInfo.review',
};

interface WizardSelection {
  occasion: string | null;
  recipient: string | null;
  relationship: string | null;
  budget: string | null;
  selectedProducts: string[];
}

export function GiftBuilder() {
  const { giftBuilderView, toggleGiftBuilder, addItem, selectProduct } = useStore();
  const { t, locale } = useTranslation();
  // tName removed — using getLocalizedName with translations array instead
  const [currentStep, setCurrentStep] = useState(0);
  const [selection, setSelection] = useState<WizardSelection>({
    occasion: null,
    recipient: null,
    relationship: null,
    budget: null,
    selectedProducts: [],
  });
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set());

  // Fetch products based on wizard selections
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['gift-builder-products', selection.occasion, selection.recipient, selection.budget],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('sort', 'featured');

      // Budget filter (INR ranges)
      const budgetMap: Record<string, { min: string; max: string }> = {
        'under-2000': { min: '0', max: '2000' },
        '2000-5000': { min: '2000', max: '5000' },
        '5000-10000': { min: '5000', max: '10000' },
        '10000-25000': { min: '10000', max: '25000' },
        '25000-plus': { min: '25000', max: '999999' },
      };
      const budgetRange = budgetMap[selection.budget || ''];
      if (budgetRange) {
        params.set('minPrice', budgetRange.min);
        params.set('maxPrice', budgetRange.max);
      }

      return fetch(`/api/products?${params}`).then((r) => r.json());
    },
    enabled: currentStep === 4,
  });

  const products: Array<{
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    images: string[];
    category: string;
    rating: number;
    stock: number;
    isExternal?: boolean;
    platform?: string;
    sourceUrl?: string;
    affiliateUrl?: string;
    translations?: Array<{ locale: string; name: string | null; description: string | null }>;
  }> = productsData?.products ?? [];

  // Filter products by occasion/recipient on client side
  const filteredProducts = products;

  const handleSelect = (field: keyof WizardSelection, value: string) => {
    setSelection((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      handleSelect('recipient', 'any');
    } else if (currentStep === 2) {
      handleSelect('relationship', 'any');
    }
    handleNext();
  };

  const handleAddToCart = (product: (typeof filteredProducts)[0]) => {
    const mainImage =
      product.images.length > 0
        ? getProxiedImageUrl(product.images[0], product.platform)
        : '/images/placeholder.jpg';

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
      translations: product.translations,
    });
    setAddedToCart((prev) => new Set(prev).add(product.id));
  };

  const handleClose = () => {
    toggleGiftBuilder();
    // Reset wizard state after closing
    setTimeout(() => {
      setCurrentStep(0);
      setSelection({
        occasion: null,
        recipient: null,
        relationship: null,
        budget: null,
        selectedProducts: [],
      });
      setAddedToCart(new Set());
    }, 300);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selection.occasion;
      case 1:
        return !!selection.recipient;
      case 2:
        return !!selection.relationship;
      case 3:
        return !!selection.budget;
      case 4:
        return selection.selectedProducts.length > 0;
      default:
        return true;
    }
  };

  const getSelectedProducts = () => {
    return filteredProducts.filter((p) => selection.selectedProducts.includes(p.id));
  };

  // Helper to display labels for "any" skipped values
  const getRecipientLabel = () => {
    if (selection.recipient === 'any') return t('giftBuilder.recipients.any');
    return RECIPIENTS.find((r) => r.value === selection.recipient) ? t(RECIPIENTS.find((r) => r.value === selection.recipient)!.labelKey) : '';
  };

  const getRecipientEmoji = () => {
    if (selection.recipient === 'any') return '✨';
    return RECIPIENTS.find((r) => r.value === selection.recipient)?.emoji || '';
  };

  const getRelationshipLabel = () => {
    if (selection.relationship === 'any') return t('giftBuilder.relationships.any');
    return RELATIONSHIPS.find((r) => r.value === selection.relationship) ? t(RELATIONSHIPS.find((r) => r.value === selection.relationship)!.labelKey) : '';
  };

  const getRelationshipEmoji = () => {
    if (selection.relationship === 'any') return '✨';
    return RELATIONSHIPS.find((r) => r.value === selection.relationship)?.emoji || '';
  };

  if (!giftBuilderView) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-stone-950"
    >
      {/* Header */}
      <div className="border-b border-amber-900/30 bg-stone-950/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
              <Gift className="h-5 w-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-100">{t('giftBuilder.title')}</h2>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-700/50 text-amber-400/60 transition-colors hover:border-amber-500 hover:text-amber-400 hover:bg-amber-900/30"
                      aria-label={t('giftBuilder.howItWorks')}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="border-amber-900/40 bg-stone-900 text-amber-100 w-72" side="bottom" align="start">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-amber-400">{t('giftBuilder.howItWorks')}</h4>
                      <ol className="space-y-1.5 text-xs text-amber-200/70">
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">1.</span> {t('giftBuilder.howItWorksSteps.1')}</li>
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">2.</span> {t('giftBuilder.howItWorksSteps.2')}</li>
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">3.</span> {t('giftBuilder.howItWorksSteps.3')}</li>
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">4.</span> {t('giftBuilder.howItWorksSteps.4')}</li>
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">5.</span> {t('giftBuilder.howItWorksSteps.5')}</li>
                        <li className="flex gap-2"><span className="text-amber-500 font-bold">6.</span> {t('giftBuilder.howItWorksSteps.6')}</li>
                      </ol>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-amber-400/60">{t('giftBuilder.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-amber-200/50 transition-colors hover:bg-amber-900/20 hover:text-amber-200"
            aria-label={t('giftBuilder.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="container mx-auto px-4 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      i < currentStep
                        ? 'bg-amber-600 text-stone-950'
                        : i === currentStep
                        ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400/50 ring-offset-2 ring-offset-stone-950'
                        : 'bg-stone-800 text-amber-200/40'
                    }`}
                    animate={i === currentStep ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                  </motion.div>
                  <span
                    className={`mt-1 text-[10px] ${
                      i <= currentStep ? 'text-amber-400/80' : 'text-amber-200/30'
                    }`}
                  >
                    {t(`giftBuilder.steps.${step}`)}{i === 4 && selection.selectedProducts.length > 0 ? ` (${selection.selectedProducts.length})` : ''}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 w-4 sm:w-8 rounded-full transition-colors ${
                      i < currentStep ? 'bg-amber-600' : 'bg-stone-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Occasion */}
              {currentStep === 0 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.occasion.title')}
                  subtitle={t('giftBuilder.stepTitles.occasion.subtitle')}
                  info={t(STEP_INFO_KEY[0])}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {OCCASIONS.map((occ) => (
                      <SelectionCard
                        key={occ.value}
                        selected={selection.occasion === occ.value}
                        onClick={() => handleSelect('occasion', occ.value)}
                        emoji={occ.emoji}
                        label={t(occ.labelKey)}
                      />
                    ))}
                  </div>
                </StepLayout>
              )}

              {/* Step 2: Recipient */}
              {currentStep === 1 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.recipient.title')}
                  subtitle={t('giftBuilder.stepTitles.recipient.subtitle')}
                  info={t(STEP_INFO_KEY[1])}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {RECIPIENTS.map((rec) => (
                      <SelectionCard
                        key={rec.value}
                        selected={selection.recipient === rec.value}
                        onClick={() => handleSelect('recipient', rec.value)}
                        emoji={rec.emoji}
                        label={t(rec.labelKey)}
                      />
                    ))}
                  </div>
                </StepLayout>
              )}

              {/* Step 3: Relationship */}
              {currentStep === 2 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.relationship.title')}
                  subtitle={t('giftBuilder.stepTitles.relationship.subtitle')}
                  info={t(STEP_INFO_KEY[2])}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {RELATIONSHIPS.map((rel) => (
                      <SelectionCard
                        key={rel.value}
                        selected={selection.relationship === rel.value}
                        onClick={() => handleSelect('relationship', rel.value)}
                        emoji={rel.emoji}
                        label={t(rel.labelKey)}
                      />
                    ))}
                  </div>
                </StepLayout>
              )}

              {/* Step 4: Budget */}
              {currentStep === 3 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.budget.title')}
                  subtitle={t('giftBuilder.stepTitles.budget.subtitle')}
                  info={t(STEP_INFO_KEY[3])}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {BUDGETS.map((bud) => (
                      <button
                        key={bud.value}
                        onClick={() => handleSelect('budget', bud.value)}
                        className={`flex items-center gap-4 rounded-xl border p-5 text-left transition-all ${
                          selection.budget === bud.value
                            ? 'border-amber-500 bg-amber-600/10 ring-1 ring-amber-500/30'
                            : 'border-amber-900/30 bg-stone-900/40 hover:border-amber-600/40 hover:bg-stone-900/60'
                        }`}
                      >
                        <span className="text-2xl">{bud.emoji}</span>
                        <div>
                          <p
                            className={`font-semibold ${
                              selection.budget === bud.value ? 'text-amber-400' : 'text-amber-100'
                            }`}
                          >
                            {t(`${bud.labelKey}.label`)}
                          </p>
                          <p className="text-xs text-amber-200/40">{t(`${bud.labelKey}.range`)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </StepLayout>
              )}

              {/* Step 5: Products */}
              {currentStep === 4 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.products.title')}
                  subtitle={t('giftBuilder.stepTitles.products.subtitle')}
                  info={t(STEP_INFO_KEY[4])}
                >
                  {productsLoading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="overflow-hidden rounded-lg border border-amber-900/20 bg-stone-900/60"
                        >
                          <Skeleton className="aspect-square bg-stone-800" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-4 w-3/4 bg-stone-800" />
                            <Skeleton className="h-5 w-20 bg-stone-800" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Package className="h-12 w-12 text-amber-600/40" />
                      <h3 className="mt-4 text-lg font-semibold text-amber-100">
                        {t('giftBuilder.empty.noProducts')}
                      </h3>
                      <p className="mt-2 text-sm text-amber-200/40">
                        {t('giftBuilder.empty.tryAdjusting')}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const isSelected = selection.selectedProducts.includes(product.id);
                        const mainImage =
                          product.images.length > 0
                            ? getProxiedImageUrl(product.images[0], product.platform)
                            : '/images/placeholder.jpg';

                        return (
                          <motion.div
                            key={product.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-amber-600/10 ring-1 ring-amber-500/30'
                                : 'border-amber-900/20 bg-stone-900/60 hover:border-amber-600/40'
                            }`}
                            onClick={() => {
                              setSelection((prev) => ({
                                ...prev,
                                selectedProducts: isSelected
                                  ? prev.selectedProducts.filter((id) => id !== product.id)
                                  : [...prev.selectedProducts, product.id],
                              }));
                            }}
                          >
                            {/* Selected badge overlay */}
                            {isSelected && (
                              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-stone-950 shadow-lg">
                                <Check className="h-3 w-3" />
                                {t('giftBuilder.cart.addedBadge')}
                              </div>
                            )}

                            <div className="aspect-square overflow-hidden bg-stone-800">
                              <img
                                src={mainImage}
                                alt={getLocalizedName(product, locale)}
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                              />
                            </div>

                            <div className="p-3">
                              <p className="text-[10px] uppercase tracking-wider text-amber-500/60">
                                {product.category}
                              </p>
                              <h3 className="mt-1 text-sm font-semibold text-amber-100 line-clamp-1">
                                {getLocalizedName(product, locale)}
                              </h3>
                              <div className="mt-1.5 flex items-baseline gap-2">
                                <span className="text-base font-bold text-amber-400">
                                  ₹{product.price.toLocaleString()}
                                </span>
                                {product.compareAtPrice && (
                                  <span className="text-xs text-amber-200/30 line-through">
                                    ₹{product.compareAtPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </StepLayout>
              )}

              {/* Step 6: Review */}
              {currentStep === 5 && (
                <StepLayout
                  title={t('giftBuilder.stepTitles.review.title')}
                  subtitle={t('giftBuilder.stepTitles.review.subtitle')}
                  info={t(STEP_INFO_KEY[5])}
                >
                  <div className="space-y-6">
                    {/* Selections Summary */}
                    <div className="rounded-xl border border-amber-900/30 bg-stone-900/40 p-5">
                      <h3 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3">
                        {t('giftBuilder.review.giftDetails')}
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <SummaryItem
                          label={t('giftBuilder.review.fields.occasion')}
                          value={
                            OCCASIONS.find((o) => o.value === selection.occasion) ? t(OCCASIONS.find((o) => o.value === selection.occasion)!.labelKey) : ''
                          }
                          emoji={
                            OCCASIONS.find((o) => o.value === selection.occasion)?.emoji || ''
                          }
                        />
                        <SummaryItem
                          label={t('giftBuilder.review.fields.recipient')}
                          value={getRecipientLabel()}
                          emoji={getRecipientEmoji()}
                        />
                        <SummaryItem
                          label={t('giftBuilder.review.fields.relationship')}
                          value={getRelationshipLabel()}
                          emoji={getRelationshipEmoji()}
                        />
                        <SummaryItem
                          label={t('giftBuilder.review.fields.budget')}
                          value={BUDGETS.find((b) => b.value === selection.budget) ? t(`${BUDGETS.find((b) => b.value === selection.budget)!.labelKey}.label`) : ''}
                          emoji={BUDGETS.find((b) => b.value === selection.budget)?.emoji || ''}
                        />
                      </div>
                    </div>

                    {/* Selected Products */}
                    <div className="rounded-xl border border-amber-900/30 bg-stone-900/40 p-5">
                      <h3 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3">
                        {t('giftBuilder.review.selectedItems', { count: selection.selectedProducts.length })}
                      </h3>
                      <div className="space-y-3">
                        {getSelectedProducts().map((product) => {
                          const mainImage =
                            product.images.length > 0
                              ? getProxiedImageUrl(product.images[0], product.platform)
                              : '/images/placeholder.jpg';
                          const isAdded = addedToCart.has(product.id);

                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/50 p-3"
                            >
                              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-stone-700">
                                <img
                                  src={mainImage}
                                  alt={getLocalizedName(product, locale)}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-100 truncate">
                                  {getLocalizedName(product, locale)}
                                </p>
                                <p className="text-xs text-amber-200/40">{product.category}</p>
                                <span className="text-sm font-bold text-amber-400">
                                  ₹{product.price.toLocaleString()}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(product);
                                }}
                                disabled={isAdded}
                                className={`${
                                  isAdded
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                                }`}
                              >
                                {isAdded ? (
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                ) : (
                                  <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                                )}
                                {isAdded ? t('giftBuilder.cart.added') : t('giftBuilder.cart.addToCart')}
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Total */}
                      <div className="mt-4 flex items-center justify-between border-t border-amber-900/20 pt-4">
                        <span className="text-sm text-amber-200/60">{t('giftBuilder.review.estimatedTotal')}</span>
                        <span className="text-xl font-bold text-amber-400">
                          ₹
                          {getSelectedProducts()
                            .reduce((sum, p) => sum + p.price, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* {t('giftBuilder.cart.addAllToCart')} */}
                    <Button
                      size="lg"
                      onClick={() => {
                        getSelectedProducts().forEach((product) => {
                          handleAddToCart(product);
                        });
                      }}
                      className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500 font-semibold py-6 text-base"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {t('giftBuilder.cart.addAllToCart')}
                    </Button>
                  </div>
                </StepLayout>
              )}

              {/* Navigation Buttons — Inside content area, not at bottom */}
              <div className="mt-8 flex items-center justify-between rounded-xl border border-amber-900/20 bg-stone-900/30 p-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 disabled:opacity-30"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {t('giftBuilder.nav.back')}
                </Button>

                <span className="text-xs text-amber-200/40">
                  {t('giftBuilder.stepIndicator', { current: currentStep + 1, total: STEPS.length })}
                </span>

                <div className="flex items-center gap-2">
                  {/* Skip button for optional steps */}
                  {(currentStep === 1 || currentStep === 2) && (
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="text-amber-200/50 hover:text-amber-400 hover:bg-amber-900/20 text-xs"
                    >
                      <SkipForward className="mr-1 h-3.5 w-3.5" />
                      {t('giftBuilder.nav.skip')}
                    </Button>
                  )}

                  {currentStep < STEPS.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600"
                    >
                      {t('giftBuilder.nav.next')}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleClose}
                      className="bg-amber-600 text-stone-950 hover:bg-amber-500"
                    >
                      <Check className="mr-1.5 h-4 w-4" />
                      {t('giftBuilder.nav.done')}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sub-components ───

function StepLayout({
  title,
  subtitle,
  info,
  children,
}: {
  title: string;
  subtitle: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-amber-100 sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-amber-200/50">{subtitle}</p>
      </div>
      {info && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-amber-900/20 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-200/60" />
          <p className="text-xs text-amber-200/60 leading-relaxed">{info}</p>
        </div>
      )}
      {children}
    </div>
  );
}

function SelectionCard({
  selected,
  onClick,
  emoji,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
        selected
          ? 'border-amber-500 bg-amber-600/10 ring-1 ring-amber-500/30'
          : 'border-amber-900/30 bg-stone-900/40 hover:border-amber-600/40 hover:bg-stone-900/60'
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span
        className={`text-xs font-semibold ${
          selected ? 'text-amber-400' : 'text-amber-100/80'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function SummaryItem({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div className="rounded-lg bg-stone-800/50 p-3 text-center">
      <span className="text-lg">{emoji}</span>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-amber-200/40">{label}</p>
      <p className="text-xs font-semibold text-amber-200">{value}</p>
    </div>
  );
}
