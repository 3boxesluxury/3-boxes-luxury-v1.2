'use client'

/* Family Shopping - curated luxury packages for every occasion */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Users,
  Baby,
  Wallet,
  Gift,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Star,
  Tag,
  Heart,
  Home,
  CheckCircle2,
  PartyPopper,
  Loader2,
  IndianRupee,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Types ────────────────────────────────────────────────────────────────────

type OccasionId =
  | 'diwali'
  | 'wedding'
  | 'birthday'
  | 'anniversary'
  | 'holi'
  | 'raksha-bandhan'
  | 'eid'
  | 'christmas'
  | 'housewarming'
  | 'navratri'

interface Occasion {
  id: OccasionId
  name: string
  emoji: string
  description: string
}

type BudgetRange = 'under-5k' | '5k-10k' | '10k-25k' | '25k-50k' | '50k-plus'

type GiftPreference = 'fashion' | 'accessories' | 'home-decor' | 'fragrances' | 'watches' | 'leather'

type FamilyMemberType = 'men' | 'women' | 'kids' | 'home'

interface FamilyDetails {
  adults: number
  kids: number
  adultAgeGroup: string
  kidsAgeGroup: string
  budgetRange: BudgetRange
  giftPreferences: GiftPreference[]
}

interface PackageProduct {
  id: string
  name: string
  price: number
  originalPrice: number
  image: string
  memberType: FamilyMemberType
  category: string
}

interface FamilyPackage {
  id: string
  occasion: OccasionId
  products: PackageProduct[]
  totalPrice: number
  originalPrice: number
  discountPercent: number
  memberType: FamilyMemberType
}

interface FamilyOffer {
  id: string
  title: string
  description: string
  discount: string
  tag: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OCCASIONS: Occasion[] = [
  { id: 'diwali', name: 'Diwali', emoji: '🪔', description: 'Festival of Lights — illuminate every home' },
  { id: 'wedding', name: 'Wedding', emoji: '💒', description: 'Celebrate the union with curated luxury' },
  { id: 'birthday', name: 'Birthday', emoji: '🎂', description: 'Make their special day unforgettable' },
  { id: 'anniversary', name: 'Anniversary', emoji: '💝', description: 'Mark milestones with timeless gifts' },
  { id: 'holi', name: 'Holi', emoji: '🎨', description: 'Colors of joy — vibrant family hampers' },
  { id: 'raksha-bandhan', name: 'Raksha Bandhan', emoji: '🧵', description: 'Bond of love — sibling special combos' },
  { id: 'eid', name: 'Eid', emoji: '🌙', description: 'Festive elegance for the entire family' },
  { id: 'christmas', name: 'Christmas', emoji: '🎄', description: 'Merry bundles — joy for every member' },
  { id: 'housewarming', name: 'Housewarming', emoji: '🏠', description: 'Grace new beginnings with premium gifts' },
  { id: 'navratri', name: 'Navratri', emoji: '🪘', description: 'Nine nights of divine celebrations' },
]

const BUDGET_LABELS: Record<BudgetRange, string> = {
  'under-5k': 'Under ₹5,000',
  '5k-10k': '₹5,000 – ₹10,000',
  '10k-25k': '₹10,000 – ₹25,000',
  '25k-50k': '₹25,000 – ₹50,000',
  '50k-plus': '₹50,000+',
}

const BUDGET_RANGE_MAP: Record<BudgetRange, [number, number]> = {
  'under-5k': [0, 5000],
  '5k-10k': [5000, 10000],
  '10k-25k': [10000, 25000],
  '25k-50k': [25000, 50000],
  '50k-plus': [50000, 100000],
}

const GIFT_PREFERENCE_OPTIONS: { id: GiftPreference; label: string; icon: typeof Sparkles }[] = [
  { id: 'fashion', label: 'Fashion', icon: ShoppingBag },
  { id: 'accessories', label: 'Accessories', icon: Gift },
  { id: 'home-decor', label: 'Home Décor', icon: Home },
  { id: 'fragrances', label: 'Fragrances', icon: Sparkles },
  { id: 'watches', label: 'Watches', icon: Star },
  { id: 'leather', label: 'Leather', icon: Tag },
]

const ADULT_AGE_GROUPS = ['18-25', '26-35', '36-45', '46-55', '55+']
const KIDS_AGE_GROUPS = ['0-2', '3-5', '6-8', '9-12', '13-17']

const MEMBER_TYPE_LABELS: Record<FamilyMemberType, string> = {
  men: 'Men',
  women: 'Women',
  kids: 'Kids',
  home: 'Home',
}

const MEMBER_TYPE_ICONS: Record<FamilyMemberType, typeof Users> = {
  men: Users,
  women: Heart,
  kids: Baby,
  home: Home,
}

const MEMBER_TYPE_COLORS: Record<FamilyMemberType, string> = {
  men: 'text-amber-400',
  women: 'text-rose-400',
  kids: 'text-sky-400',
  home: 'text-emerald-400',
}

const FAMILY_OFFERS: FamilyOffer[] = [
  {
    id: 'fo-1',
    title: 'Diwali Dhamaka Family Box',
    description: 'Complete family hamper with gifts for everyone — Men, Women, Kids & Home Décor',
    discount: 'Extra 10% off',
    tag: 'Best Seller',
  },
  {
    id: 'fo-2',
    title: 'Wedding Season Couple Combo',
    description: 'His & Hers luxury set — watches, fragrances & accessories bundled together',
    discount: '15% off',
    tag: 'Top Pick',
  },
  {
    id: 'fo-3',
    title: 'Kids Carnival Pack',
    description: 'Fashion, toys & accessories for the little ones — perfect for birthdays & festivals',
    discount: '₹2,000 off',
    tag: 'Popular',
  },
  {
    id: 'fo-4',
    title: 'Home Décor Deluxe',
    description: 'Premium candles, vases, wall art & more to elevate any celebration space',
    discount: 'Free Gift Wrap',
    tag: 'New',
  },
]

// ─── Mock Data Generator ──────────────────────────────────────────────────────

function generateMockPackages(occasion: OccasionId, details: FamilyDetails): FamilyPackage[] {
  const discount = details.adults + details.kids >= 5 ? 15 : details.adults + details.kids >= 3 ? 10 : details.adults + details.kids >= 2 ? 5 : 0

  const [budgetMin, budgetMax] = BUDGET_RANGE_MAP[details.budgetRange]
  const perPersonBudget = Math.floor((budgetMin + budgetMax) / 2 / Math.max(details.adults + details.kids, 1))

  const productPool: Record<FamilyMemberType, { name: string; price: number; category: string }[]> = {
    men: [
      { name: 'Silk Kurta Set — Banarasi', price: 4999, category: 'Fashion' },
      { name: 'Royal Oud Eau de Parfum 100ml', price: 3499, category: 'Fragrances' },
      { name: 'Heritage Leather Wallet — Epi Grain', price: 2999, category: 'Leather' },
      { name: 'Chronograph Gold Watch', price: 12999, category: 'Watches' },
      { name: 'Premium Linen Blazer', price: 6499, category: 'Fashion' },
      { name: 'Italian Leather Belt — Tan', price: 1999, category: 'Leather' },
      { name: 'Noir Silk Evening Shirt', price: 3499, category: 'Fashion' },
      { name: 'Sandalwood & Vetiver Cologne', price: 2799, category: 'Fragrances' },
    ],
    women: [
      { name: 'Kanjeevaram Silk Saree — Temple Border', price: 8999, category: 'Fashion' },
      { name: 'Polki Diamond Jhumka Earrings', price: 14999, category: 'Accessories' },
      { name: 'Jardin Secret Eau de Parfum 75ml', price: 4299, category: 'Fragrances' },
      { name: 'Emerald Tennis Bracelet', price: 11999, category: 'Accessories' },
      { name: 'Chanderi Mint Elegance Saree', price: 5499, category: 'Fashion' },
      { name: 'Designer Clutch — Pearl Finish', price: 3299, category: 'Accessories' },
      { name: 'Rose Gold Watch — Mother of Pearl', price: 9999, category: 'Watches' },
      { name: 'Artisan Scented Candle Collection', price: 1999, category: 'Home Décor' },
    ],
    kids: [
      { name: 'Premium Wooden Train Set', price: 2499, category: 'Fashion' },
      { name: 'Kids Designer Lehenga Set', price: 3999, category: 'Fashion' },
      { name: 'Fun Fragrance Gift Set — Berry Blast', price: 1299, category: 'Fragrances' },
      { name: 'Kids Fashion Watch — Sparkle', price: 1599, category: 'Watches' },
      { name: 'Ethnic Kurta Pajama Set — Boys', price: 1899, category: 'Fashion' },
      { name: 'Princess Party Dress — Sequin', price: 2299, category: 'Fashion' },
      { name: 'Mini Leather Backpack — Pink', price: 1799, category: 'Leather' },
      { name: 'Candy Collection Perfume Set', price: 999, category: 'Fragrances' },
    ],
    home: [
      { name: 'Murano Crystal Vase — Amber', price: 6999, category: 'Home Décor' },
      { name: 'Luxury Scented Candle Triptych', price: 3499, category: 'Home Décor' },
      { name: 'Brass Diya Set — Handcrafted', price: 2499, category: 'Home Décor' },
      { name: 'Marble Jaali Photo Frame Set', price: 3999, category: 'Home Décor' },
      { name: 'Artisan Potpourri Bowl — Gold Leaf', price: 1899, category: 'Home Décor' },
      { name: 'Heritage Tea Set — Bone China', price: 5499, category: 'Home Décor' },
      { name: 'Embroidered Silk Cushion Set', price: 2999, category: 'Home Décor' },
      { name: 'Designer Incense Holder — Rosewood', price: 1499, category: 'Home Décor' },
    ],
  }

  const packages: FamilyPackage[] = []
  let pkgIndex = 0

  const typesToInclude: FamilyMemberType[] = []
  if (details.adults > 0) {
    typesToInclude.push('men', 'women')
  }
  if (details.kids > 0) {
    typesToInclude.push('kids')
  }
  typesToInclude.push('home')

  for (const memberType of typesToInclude) {
    if (memberType === 'men' && details.adults === 0) continue
    if (memberType === 'kids' && details.kids === 0) continue

    const pool = productPool[memberType]
    // pick products that fit budget and preferences
    const filtered = pool.filter((p) => {
      const inBudget = p.price <= perPersonBudget * 2
      const inPref =
        details.giftPreferences.length === 0 ||
        details.giftPreferences.some((pref) => {
          const prefCategoryMap: Record<GiftPreference, string> = {
            fashion: 'Fashion',
            accessories: 'Accessories',
            'home-decor': 'Home Décor',
            fragrances: 'Fragrances',
            watches: 'Watches',
            leather: 'Leather',
          }
          return prefCategoryMap[pref] === p.category
        })
      return inBudget && inPref
    })

    const selected = filtered.length > 0 ? filtered.slice(0, 3) : pool.slice(0, 2)
    const totalOriginal = selected.reduce((s, p) => s + p.price, 0)
    const totalDiscounted = discount > 0 ? Math.floor(totalOriginal * (1 - discount / 100)) : totalOriginal

    packages.push({
      id: `fp-${occasion}-${memberType}-${pkgIndex++}`,
      occasion,
      products: selected.map((p, i) => ({
        id: `prod-${occasion}-${memberType}-${i}`,
        name: p.name,
        price: discount > 0 ? Math.floor(p.price * (1 - discount / 100)) : p.price,
        originalPrice: p.price,
        image: `/images/products/placeholder-${memberType}-${i}.jpg`,
        memberType,
        category: p.category,
      })),
      totalPrice: totalDiscounted,
      originalPrice: totalOriginal,
      discountPercent: discount,
      memberType,
    })
  }

  return packages
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FamilyShopping() {
  const { authUser, setAuthView, addItem } = useStore()

  // Step management
  const [step, setStep] = useState<'occasion' | 'details' | 'results'>('occasion')
  const [direction, setDirection] = useState(1)

  // Occasion selection
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null)

  // Family details form
  const [familyDetails, setFamilyDetails] = useState<FamilyDetails>({
    adults: 2,
    kids: 0,
    adultAgeGroup: '26-35',
    kidsAgeGroup: '6-8',
    budgetRange: '10k-25k',
    giftPreferences: [],
  })

  // Results
  const [packages, setPackages] = useState<FamilyPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [addedPackages, setAddedPackages] = useState<Set<string>>(new Set())

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectOccasion = useCallback((id: OccasionId) => {
    setSelectedOccasion(id)
  }, [])

  const handleNext = useCallback(() => {
    if (step === 'occasion' && selectedOccasion) {
      setDirection(1)
      setStep('details')
    }
  }, [step, selectedOccasion])

  const handleBack = useCallback(() => {
    if (step === 'details') {
      setDirection(-1)
      setStep('occasion')
    } else if (step === 'results') {
      setDirection(-1)
      setStep('details')
    }
  }, [step])

  const handleTogglePreference = useCallback((pref: GiftPreference) => {
    setFamilyDetails((prev) => ({
      ...prev,
      giftPreferences: prev.giftPreferences.includes(pref)
        ? prev.giftPreferences.filter((p) => p !== pref)
        : [...prev.giftPreferences, pref],
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!selectedOccasion) return
    setLoading(true)
    setDirection(1)

    try {
      const res = await fetch('/api/family-shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion: selectedOccasion, ...familyDetails }),
      })

      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages ?? [])
      } else {
        // Fallback to mock data
        setPackages(generateMockPackages(selectedOccasion, familyDetails))
      }
    } catch {
      // Fallback to mock data on network error
      setPackages(generateMockPackages(selectedOccasion, familyDetails))
    }

    setLoading(false)
    setStep('results')
  }, [selectedOccasion, familyDetails])

  const handleAddPackageToCart = useCallback(
    (pkg: FamilyPackage) => {
      if (!authUser) {
        setAuthView('login')
        return
      }

      for (const product of pkg.products) {
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
        })
      }

      setAddedPackages((prev) => new Set(prev).add(pkg.id))
    },
    [authUser, setAuthView, addItem]
  )

  const familySize = familyDetails.adults + familyDetails.kids
  const familyDiscount = familySize >= 5 ? 15 : familySize >= 3 ? 10 : familySize >= 2 ? 5 : 0

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="w-full bg-stone-950 text-amber-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-amber-500">Family</span> Shopping
          </h2>
          <p className="mt-2 text-sm text-amber-200/60 sm:text-base">
            Curated luxury packages for every occasion — shop for the whole family in one go
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {(['occasion', 'details', 'results'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s
                    ? 'bg-amber-600 text-stone-950'
                    : i < ['occasion', 'details', 'results'].indexOf(step)
                      ? 'bg-amber-800 text-amber-100'
                      : 'bg-stone-800 text-amber-200/40'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  step === s ? 'text-amber-400' : 'text-amber-200/40'
                }`}
              >
                {s === 'occasion' ? 'Choose Occasion' : s === 'details' ? 'Family Details' : 'Packages'}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-amber-200/20" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={direction}>
          {/* ─── Step 1: Occasion Selection ──────────────────────────────── */}
          {step === 'occasion' && (
            <motion.div
              key="occasion"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5"
              >
                {OCCASIONS.map((occ) => (
                  <motion.div key={occ.id} variants={itemVariants}>
                    <Card
                      onClick={() => handleSelectOccasion(occ.id)}
                      className={`cursor-pointer border transition-all duration-200 ${
                        selectedOccasion === occ.id
                          ? 'border-amber-500 bg-amber-900/30 shadow-lg shadow-amber-900/20'
                          : 'border-amber-900/30 bg-stone-900/80 hover:border-amber-700/50 hover:bg-stone-900'
                      }`}
                    >
                      <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                        <span className="text-3xl sm:text-4xl">{occ.emoji}</span>
                        <span className="text-sm font-semibold text-amber-100">{occ.name}</span>
                        <span className="text-[10px] leading-tight text-amber-200/50 sm:text-xs">
                          {occ.description}
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Next Button */}
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!selectedOccasion}
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-40"
                >
                  Continue
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Family Details Form ──────────────────────────────── */}
          {step === 'details' && (
            <motion.div
              key="details"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              <Card className="border-amber-900/30 bg-stone-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-100">
                    <Users className="h-5 w-5 text-amber-500" />
                    Family Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Adults & Kids Count */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Adults */}
                    <div className="space-y-2">
                      <Label className="text-amber-200/80">
                        <Users className="mr-1 inline h-4 w-4" />
                        Number of Adults
                      </Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-amber-900/30 bg-stone-800 p-0 text-amber-100 hover:bg-stone-700"
                          onClick={() =>
                            setFamilyDetails((p) => ({ ...p, adults: Math.max(1, p.adults - 1) }))
                          }
                        >
                          −
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={familyDetails.adults}
                          onChange={(e) =>
                            setFamilyDetails((p) => ({
                              ...p,
                              adults: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)),
                            }))
                          }
                          className="h-8 w-16 border-amber-900/30 bg-stone-800 text-center text-amber-100"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-amber-900/30 bg-stone-800 p-0 text-amber-100 hover:bg-stone-700"
                          onClick={() =>
                            setFamilyDetails((p) => ({ ...p, adults: Math.min(10, p.adults + 1) }))
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Kids */}
                    <div className="space-y-2">
                      <Label className="text-amber-200/80">
                        <Baby className="mr-1 inline h-4 w-4" />
                        Number of Kids
                      </Label>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-amber-900/30 bg-stone-800 p-0 text-amber-100 hover:bg-stone-700"
                          onClick={() =>
                            setFamilyDetails((p) => ({ ...p, kids: Math.max(0, p.kids - 1) }))
                          }
                        >
                          −
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={familyDetails.kids}
                          onChange={(e) =>
                            setFamilyDetails((p) => ({
                              ...p,
                              kids: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)),
                            }))
                          }
                          className="h-8 w-16 border-amber-900/30 bg-stone-800 text-center text-amber-100"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 border-amber-900/30 bg-stone-800 p-0 text-amber-100 hover:bg-stone-700"
                          onClick={() =>
                            setFamilyDetails((p) => ({ ...p, kids: Math.min(10, p.kids + 1) }))
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Age Groups */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-amber-200/80">Adult Age Group</Label>
                      <Select
                        value={familyDetails.adultAgeGroup}
                        onValueChange={(v) => setFamilyDetails((p) => ({ ...p, adultAgeGroup: v }))}
                      >
                        <SelectTrigger className="w-full border-amber-900/30 bg-stone-800 text-amber-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-amber-900/30 bg-stone-900 text-amber-100">
                          {ADULT_AGE_GROUPS.map((ag) => (
                            <SelectItem key={ag} value={ag}>
                              {ag} years
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-amber-200/80">Kids Age Group</Label>
                      <Select
                        value={familyDetails.kidsAgeGroup}
                        onValueChange={(v) => setFamilyDetails((p) => ({ ...p, kidsAgeGroup: v }))}
                        disabled={familyDetails.kids === 0}
                      >
                        <SelectTrigger className="w-full border-amber-900/30 bg-stone-800 text-amber-100 disabled:opacity-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-amber-900/30 bg-stone-900 text-amber-100">
                          {KIDS_AGE_GROUPS.map((ag) => (
                            <SelectItem key={ag} value={ag}>
                              {ag} years
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-3">
                    <Label className="text-amber-200/80">
                      <Wallet className="mr-1 inline h-4 w-4" />
                      Budget Range
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {(Object.keys(BUDGET_LABELS) as BudgetRange[]).map((br) => (
                        <Button
                          key={br}
                          variant="outline"
                          onClick={() => setFamilyDetails((p) => ({ ...p, budgetRange: br }))}
                          className={`text-xs ${
                            familyDetails.budgetRange === br
                              ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                              : 'border-amber-900/30 bg-stone-800 text-amber-200/60 hover:bg-stone-700'
                          }`}
                        >
                          {BUDGET_LABELS[br]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Gift Preferences */}
                  <div className="space-y-3">
                    <Label className="text-amber-200/80">
                      <Gift className="mr-1 inline h-4 w-4" />
                      Gift Preferences
                    </Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                      {GIFT_PREFERENCE_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        const checked = familyDetails.giftPreferences.includes(opt.id)
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleTogglePreference(opt.id)}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                              checked
                                ? 'border-amber-500 bg-amber-900/30'
                                : 'border-amber-900/30 bg-stone-800 hover:bg-stone-700'
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleTogglePreference(opt.id)}
                              className="border-amber-700 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                            />
                            <Icon className={`h-4 w-4 ${checked ? 'text-amber-400' : 'text-amber-200/50'}`} />
                            <span
                              className={`text-xs font-medium ${
                                checked ? 'text-amber-300' : 'text-amber-200/50'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Discount Preview */}
                  {familyDiscount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <PartyPopper className="h-5 w-5 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-300">
                          Family Discount: {familyDiscount}% off!
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-amber-200/60">
                        Family of {familySize} — {familyDiscount === 5
                          ? '5% off your entire package'
                          : familyDiscount === 10
                            ? '10% off — bigger family, bigger savings!'
                            : '15% off — maximum savings for the whole family!'}
                      </p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-amber-900/30 bg-stone-900 text-amber-100 hover:bg-stone-800"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finding Packages…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Results ──────────────────────────────────────────── */}
          {step === 'results' && (
            <motion.div
              key="results"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
            >
              {/* Occasion & Discount Banner */}
              <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {OCCASIONS.find((o) => o.id === selectedOccasion)?.emoji}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-amber-100">
                      {OCCASIONS.find((o) => o.id === selectedOccasion)?.name} Packages
                    </h3>
                    <p className="text-xs text-amber-200/50">
                      {familyDetails.adults} adult{familyDetails.adults > 1 ? 's' : ''},{' '}
                      {familyDetails.kids} kid{familyDetails.kids !== 1 ? 's' : ''} ·{' '}
                      {BUDGET_LABELS[familyDetails.budgetRange]}
                    </p>
                  </div>
                </div>
                {familyDiscount > 0 && (
                  <Badge className="border-amber-500/30 bg-amber-900/30 px-3 py-1 text-amber-300">
                    <Tag className="mr-1 h-3 w-3" />
                    {familyDiscount}% Family Discount Applied
                  </Badge>
                )}
              </div>

              {/* Package Groups by Member Type */}
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="space-y-8">
                  {(['men', 'women', 'kids', 'home'] as FamilyMemberType[]).map((memberType) => {
                    const typePkgs = packages.filter((p) => p.memberType === memberType)
                    if (typePkgs.length === 0) return null
                    if (memberType === 'kids' && familyDetails.kids === 0) return null

                    const TypeIcon = MEMBER_TYPE_ICONS[memberType]
                    const typeColor = MEMBER_TYPE_COLORS[memberType]

                    return (
                      <motion.div
                        key={memberType}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <TypeIcon className={`h-5 w-5 ${typeColor}`} />
                          <h4 className={`text-base font-semibold ${typeColor}`}>
                            {MEMBER_TYPE_LABELS[memberType]}
                          </h4>
                          <Separator className="flex-1 bg-amber-900/20" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {typePkgs.map((pkg) => {
                            const isAdded = addedPackages.has(pkg.id)
                            return (
                              <motion.div
                                key={pkg.id}
                                variants={itemVariants}
                                initial="hidden"
                                animate="show"
                              >
                                <Card className="border-amber-900/30 bg-stone-900/80 transition-all hover:border-amber-800/50">
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <Badge
                                        variant="outline"
                                        className="border-amber-700/40 text-[10px] text-amber-300"
                                      >
                                        {pkg.products.length} items
                                      </Badge>
                                      {pkg.discountPercent > 0 && (
                                        <Badge className="bg-amber-600 text-[10px] text-stone-950">
                                          {pkg.discountPercent}% OFF
                                        </Badge>
                                      )}
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    {/* Product List */}
                                    <ul className="space-y-1.5">
                                      {pkg.products.map((prod) => (
                                        <li
                                          key={prod.id}
                                          className="flex items-start justify-between text-xs"
                                        >
                                          <span className="flex-1 text-amber-100/80">
                                            {prod.name}
                                          </span>
                                          <span className="ml-2 shrink-0 text-amber-200/50">
                                            <IndianRupee className="inline h-3 w-3" />
                                            {prod.price.toLocaleString('en-IN')}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>

                                    <Separator className="bg-amber-900/20" />

                                    {/* Pricing */}
                                    <div className="flex items-end justify-between">
                                      <div>
                                        <p className="text-xs text-amber-200/50">Package Total</p>
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-lg font-bold text-amber-100">
                                            <IndianRupee className="inline h-4 w-4" />
                                            {pkg.totalPrice.toLocaleString('en-IN')}
                                          </span>
                                          {pkg.originalPrice > pkg.totalPrice && (
                                            <span className="text-xs text-amber-200/40 line-through">
                                              <IndianRupee className="inline h-3 w-3" />
                                              {pkg.originalPrice.toLocaleString('en-IN')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-amber-200/40">
                                        Save <IndianRupee className="inline h-2.5 w-2.5" />
                                        {(pkg.originalPrice - pkg.totalPrice).toLocaleString('en-IN')}
                                      </span>
                                    </div>

                                    {/* Add to Cart */}
                                    <Button
                                      onClick={() => handleAddPackageToCart(pkg)}
                                      disabled={isAdded}
                                      className={`w-full ${
                                        isAdded
                                          ? 'bg-emerald-700 text-emerald-100 hover:bg-emerald-700'
                                          : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                                      }`}
                                    >
                                      {isAdded ? (
                                        <>
                                          <CheckCircle2 className="mr-1 h-4 w-4" />
                                          Added to Cart
                                        </>
                                      ) : (
                                        <>
                                          <ShoppingBag className="mr-1 h-4 w-4" />
                                          Add Package to Cart
                                        </>
                                      )}
                                    </Button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Family Offers Section */}
              <div className="mt-10">
                <div className="mb-4 flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-amber-100">Family Offers</h3>
                  <Separator className="flex-1 bg-amber-900/20" />
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {FAMILY_OFFERS.map((offer) => (
                    <motion.div key={offer.id} variants={itemVariants}>
                      <Card className="border-amber-900/30 bg-stone-900/80 transition-all hover:border-amber-700/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-amber-100">
                                  {offer.title}
                                </h4>
                                <Badge className="bg-amber-600 text-[10px] text-stone-950">
                                  {offer.tag}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-amber-200/50">{offer.description}</p>
                            </div>
                            <div className="shrink-0 rounded-md border border-amber-500/30 bg-amber-900/30 px-2.5 py-1 text-xs font-bold text-amber-400">
                              {offer.discount}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Discount Tiers Info */}
              <div className="mt-8">
                <Card className="border-amber-900/30 bg-stone-900/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-amber-100">
                      <Tag className="h-4 w-4 text-amber-500" />
                      Family Package Discounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div
                        className={`rounded-lg border p-3 transition-all ${
                          familyDiscount === 5
                            ? 'border-amber-500 bg-amber-900/30'
                            : 'border-amber-900/30 bg-stone-800/50'
                        }`}
                      >
                        <p className="text-lg font-bold text-amber-400">5%</p>
                        <p className="text-[10px] text-amber-200/50">Family of 2</p>
                      </div>
                      <div
                        className={`rounded-lg border p-3 transition-all ${
                          familyDiscount === 10
                            ? 'border-amber-500 bg-amber-900/30'
                            : 'border-amber-900/30 bg-stone-800/50'
                        }`}
                      >
                        <p className="text-lg font-bold text-amber-400">10%</p>
                        <p className="text-[10px] text-amber-200/50">Family of 3–4</p>
                      </div>
                      <div
                        className={`rounded-lg border p-3 transition-all ${
                          familyDiscount === 15
                            ? 'border-amber-500 bg-amber-900/30'
                            : 'border-amber-900/30 bg-stone-800/50'
                        }`}
                      >
                        <p className="text-lg font-bold text-amber-400">15%</p>
                        <p className="text-[10px] text-amber-200/50">Family of 5+</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Back Button */}
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-amber-900/30 bg-stone-900 text-amber-100 hover:bg-stone-800"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Modify Details
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
