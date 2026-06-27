'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Package,
  Sparkles,
  ArrowRight,
  Store,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortalProduct {
  id: string
  name: string
  price: number
  image: string
  category: string
}

interface Portal {
  id: string
  name: string
  logo: string
  color: string
  isOwnPortal: boolean
  products: PortalProduct[]
}

interface BundleItem extends PortalProduct {
  portalId: string
  portalName: string
  quantity: number
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PORTALS: Portal[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    logo: '🛒',
    color: '#FF9900',
    isOwnPortal: false,
    products: [
      { id: 'amz-1', name: 'Dyson Airwrap Multi-Styler', price: 42900, image: '/placeholder-dyson.jpg', category: 'Beauty Tech' },
      { id: 'amz-2', name: 'Bose QuietComfort Ultra', price: 32900, image: '/placeholder-bose.jpg', category: 'Audio' },
      { id: 'amz-3', name: 'Kindle Scribe Premium', price: 34999, image: '/placeholder-kindle.jpg', category: 'Electronics' },
    ],
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    logo: '📦',
    color: '#2874F0',
    isOwnPortal: false,
    products: [
      { id: 'fk-1', name: 'Samsung Galaxy Watch6 Classic', price: 29999, image: '/placeholder-samsung.jpg', category: 'Wearables' },
      { id: 'fk-2', name: 'IFB Senator WXS 8kg Washer', price: 36990, image: '/placeholder-ifb.jpg', category: 'Appliances' },
    ],
  },
  {
    id: 'myntra',
    name: 'Myntra',
    logo: '👗',
    color: '#FF3F6C',
    isOwnPortal: false,
    products: [
      { id: 'my-1', name: 'Tarun Tahiliani Silk Saree', price: 28500, image: '/placeholder-saree.jpg', category: 'Ethnic Wear' },
      { id: 'my-2', name: 'Ralph Lauren Cashmere Blazer', price: 42900, image: '/placeholder-blazer.jpg', category: 'Western Wear' },
      { id: 'my-3', name: 'Jimmy Choo Romy 85 Pumps', price: 67500, image: '/placeholder-pumps.jpg', category: 'Footwear' },
    ],
  },
  {
    id: 'ajio',
    name: 'Ajio',
    logo: '🏷️',
    color: '#3B3B3B',
    isOwnPortal: false,
    products: [
      { id: 'aj-1', name: 'MK Michael Kors Jet Set Tote', price: 24990, image: '/placeholder-mk.jpg', category: 'Bags' },
      { id: 'aj-2', name: 'Superdry Vintage Windcheater', price: 6999, image: '/placeholder-superdry.jpg', category: 'Outerwear' },
    ],
  },
  {
    id: 'nykaa',
    name: 'Nykaa',
    logo: '💄',
    color: '#FC2779',
    isOwnPortal: false,
    products: [
      { id: 'nyk-1', name: 'La Mer Crème de la Mer 30ml', price: 19500, image: '/placeholder-lamer.jpg', category: 'Skincare' },
      { id: 'nyk-2', name: 'Tom Ford Lost Cherry EDP 50ml', price: 26000, image: '/placeholder-tomford.jpg', category: 'Fragrance' },
      { id: 'nyk-3', name: 'Charlotte Tilbury Pillow Talk Set', price: 7800, image: '/placeholder-ct.jpg', category: 'Makeup' },
    ],
  },
  {
    id: 'tatacliq',
    name: 'Tata Cliq',
    logo: '🏛️',
    color: '#6E2D91',
    isOwnPortal: false,
    products: [
      { id: 'tc-1', name: 'Westside Gold-Plated Necklace', price: 4999, image: '/placeholder-necklace.jpg', category: 'Jewellery' },
      { id: 'tc-2', name: 'Whirlpool 340L Frost-Free Refrigerator', price: 34990, image: '/placeholder-fridge.jpg', category: 'Appliances' },
    ],
  },
  {
    id: 'meesho',
    name: 'Meesho',
    logo: '🛍️',
    color: '#570A57',
    isOwnPortal: false,
    products: [
      { id: 'ms-1', name: 'Banarasi Silk Lehenga Set', price: 3499, image: '/placeholder-lehenga.jpg', category: 'Ethnic Wear' },
      { id: 'ms-2', name: 'Kundan Bridal Jewelry Set', price: 2199, image: '/placeholder-kundan.jpg', category: 'Jewellery' },
    ],
  },
  {
    id: 'snapdeal',
    name: 'Snapdeal',
    logo: '🔴',
    color: '#E40046',
    isOwnPortal: false,
    products: [
      { id: 'sd-1', name: 'Prestige Iris 750W Mixer Grinder', price: 3499, image: '/placeholder-mixer.jpg', category: 'Appliances' },
      { id: 'sd-2', name: 'Puma RS-X3 Sneakers', price: 5999, image: '/placeholder-puma.jpg', category: 'Footwear' },
    ],
  },
  {
    id: '3box-luxury',
    name: '3Box Luxury',
    logo: '✨',
    color: '#D4A853',
    isOwnPortal: true,
    products: [
      { id: '3bl-1', name: 'Handcrafted Rosewood Hamper Box', price: 12999, image: '/placeholder-hamper.jpg', category: 'Gift Sets' },
      { id: '3bl-2', name: 'Italian Leather Valet Tray Set', price: 8999, image: '/placeholder-valet.jpg', category: 'Accessories' },
      { id: '3bl-3', name: 'Artisan Scented Candle Collection', price: 4999, image: '/placeholder-candles.jpg', category: 'Home' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function getDiscountRate(itemCount: number): number {
  if (itemCount >= 5) return 0.15
  if (itemCount >= 3) return 0.10
  if (itemCount >= 2) return 0.05
  return 0
}

function getDiscountLabel(rate: number): string {
  if (rate === 0.15) return '15% OFF'
  if (rate === 0.10) return '10% OFF'
  if (rate === 0.05) return '5% OFF'
  return ''
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ThreeBoxCurate() {
  const { authUser, setAuthView, addItem } = useStore()
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([])
  const [bundleOpen, setBundleOpen] = useState(false)
  const [aiConsentOpen, setAiConsentOpen] = useState(false)
  const [aiConsentGiven, setAiConsentGiven] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Derived values
  const uniqueItemCount = useMemo(() => {
    return bundleItems.reduce((sum, item) => sum + item.quantity, 0)
  }, [bundleItems])

  const subtotal = useMemo(() => {
    return bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [bundleItems])

  const discountRate = getDiscountRate(uniqueItemCount)
  const discountAmount = Math.round(subtotal * discountRate)
  const finalTotal = subtotal - discountAmount

  const has3BoxItem = bundleItems.some((item) => item.portalId === '3box-luxury')

  // Group bundle items by portal
  const groupedByPortal = useMemo(() => {
    const groups: Record<string, BundleItem[]> = {}
    for (const item of bundleItems) {
      if (!groups[item.portalId]) groups[item.portalId] = []
      groups[item.portalId].push(item)
    }
    return groups
  }, [bundleItems])

  // Handlers
  const handleAddToBundle = (product: PortalProduct, portal: Portal) => {
    setValidationError(null)
    setBundleItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [
        ...prev,
        {
          ...product,
          portalId: portal.id,
          portalName: portal.name,
          quantity: 1,
        },
      ]
    })
  }

  const handleRemoveFromBundle = (productId: string) => {
    setBundleItems((prev) => prev.filter((item) => item.id !== productId))
  }

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setBundleItems((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const handleProceedToCheckout = () => {
    if (!authUser) {
      setAuthView('login')
      return
    }
    if (bundleItems.length === 0) {
      setValidationError('Your bundle cart is empty. Add products to proceed.')
      return
    }
    if (!has3BoxItem) {
      setValidationError('Your bundle must include at least 1 product from 3Box Luxury.')
      return
    }
    if (!aiConsentGiven) {
      setAiConsentOpen(true)
      return
    }
    // Add all items to the main cart
    for (const item of bundleItems) {
      addItem({
        productId: item.id,
        name: `[${item.portalName}] ${item.name}`,
        price: item.price,
        image: item.image,
      })
    }
    setBundleItems([])
    setValidationError(null)
  }

  const handleAiConsent = (consent: boolean) => {
    setAiConsentGiven(consent)
    setAiConsentOpen(false)
    if (consent) {
      // Proceed with checkout after consent
      for (const item of bundleItems) {
        addItem({
          productId: item.id,
          name: `[${item.portalName}] ${item.name}`,
          price: item.price,
          image: item.image,
        })
      }
      setBundleItems([])
      setValidationError(null)
    }
  }

  const getBundleQuantityForProduct = (productId: string): number => {
    const item = bundleItems.find((i) => i.id === productId)
    return item?.quantity ?? 0
  }

  return (
    <section className="bg-stone-950 text-amber-100 min-h-screen">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-amber-900/30 bg-stone-900/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/20 border border-amber-600/30">
                  <Package className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    3Box <span className="text-amber-400">Curate</span>
                  </h1>
                  <p className="text-sm text-amber-200/60">
                    Cross-portal luxury shopping — unified delivery
                  </p>
                </div>
              </div>
              <p className="max-w-md text-sm text-amber-200/70 leading-relaxed">
                Pick products from multiple e-commerce portals, and 3Box packages &amp; delivers them together.
                One order, one delivery, one luxurious experience.
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Discount tiers bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <span className="text-xs font-medium text-amber-300/80 uppercase tracking-wider">Bundle Discounts:</span>
            <Badge className="bg-amber-900/30 text-amber-300 border-amber-800/40 hover:bg-amber-900/40 text-xs">
              2+ items → 5% off
            </Badge>
            <Badge className="bg-amber-900/30 text-amber-300 border-amber-800/40 hover:bg-amber-900/40 text-xs">
              3+ items → 10% off
            </Badge>
            <Badge className="bg-amber-900/30 text-amber-300 border-amber-800/40 hover:bg-amber-900/40 text-xs">
              5+ items → 15% off
            </Badge>
          </motion.div>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Portal Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PORTALS.map((portal, portalIndex) => (
            <motion.div
              key={portal.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: portalIndex * 0.07, duration: 0.4 }}
            >
              <Card
                className={`relative overflow-hidden border bg-stone-900/80 ${
                  portal.isOwnPortal
                    ? 'border-amber-600/50 ring-1 ring-amber-600/20'
                    : 'border-amber-900/30'
                }`}
              >
                {/* Portal header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                        style={{ backgroundColor: `${portal.color}20`, border: `1px solid ${portal.color}40` }}
                      >
                        {portal.logo}
                      </div>
                      <div>
                        <CardTitle className="text-base text-amber-100 flex items-center gap-2">
                          {portal.name}
                          {portal.isOwnPortal && (
                            <Badge className="bg-amber-600 text-stone-950 text-[10px] font-bold px-1.5 py-0">
                              OUR PORTAL
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-amber-200/50">{portal.products.length} luxury picks</p>
                      </div>
                    </div>
                    <Store className="h-4 w-4 text-amber-200/30" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {portal.products.map((product) => {
                    const inBundle = getBundleQuantityForProduct(product.id)
                    return (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.01 }}
                        className="group flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-950/50 p-3 transition-colors hover:border-amber-800/40"
                      >
                        {/* Image placeholder */}
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-stone-800 border border-amber-900/20">
                          <div className="flex h-full w-full items-center justify-center text-amber-600/40">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          {inBundle > 0 && (
                            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-stone-950">
                              {inBundle}
                            </div>
                          )}
                        </div>

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-100 truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-amber-400">{formatINR(product.price)}</span>
                            <Badge variant="outline" className="text-[10px] border-amber-800/30 text-amber-300/60 px-1 py-0">
                              {product.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Add button */}
                        <Button
                          size="sm"
                          className={`shrink-0 h-8 px-3 text-xs font-semibold ${
                            inBundle > 0
                              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30'
                              : 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                          }`}
                          onClick={() => handleAddToBundle(product, portal)}
                        >
                          {inBundle > 0 ? (
                            <span className="flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add More
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Add
                            </span>
                          )}
                        </Button>
                      </motion.div>
                    )
                  })}
                </CardContent>

                {/* Glow for own portal */}
                {portal.isOwnPortal && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-600/5 to-transparent" />
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Floating Bundle Bar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {bundleItems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-900/30 bg-stone-950/95 backdrop-blur-lg"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-stone-950">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-100">
                    {uniqueItemCount} {uniqueItemCount === 1 ? 'item' : 'items'} in bundle
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-200/60">{formatINR(subtotal)}</span>
                    {discountRate > 0 && (
                      <>
                        <span className="text-xs text-green-400 font-medium">
                          −{formatINR(discountAmount)} ({getDiscountLabel(discountRate)})
                        </span>
                        <span className="text-xs font-semibold text-amber-400">{formatINR(finalTotal)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-800/40 text-amber-200 hover:bg-amber-900/30 hover:text-amber-100"
                  onClick={() => setBundleOpen(true)}
                >
                  View Bundle
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 text-stone-950 hover:bg-amber-500 font-semibold"
                  onClick={handleProceedToCheckout}
                >
                  Checkout <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bundle Sheet (Sidebar) ──────────────────────────────────────── */}
      <Sheet open={bundleOpen} onOpenChange={setBundleOpen}>
        <SheetContent
          side="right"
          className="bg-stone-950 border-amber-900/30 text-amber-100 w-full sm:max-w-md flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle className="text-amber-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              Your Bundle Cart
            </SheetTitle>
            <SheetDescription className="text-amber-200/60">
              Products from multiple portals, delivered as one
            </SheetDescription>
          </SheetHeader>

          {/* 3Box Luxury validation notice */}
          {!has3BoxItem && bundleItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-950/30 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">
                Add at least 1 product from <strong>3Box Luxury</strong> to proceed with checkout.
              </p>
            </motion.div>
          )}

          {has3BoxItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-green-800/40 bg-green-950/30 p-3"
            >
              <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-xs text-green-300">
                3Box Luxury product included — you&apos;re eligible for checkout!
              </p>
            </motion.div>
          )}

          {/* Validation error */}
          {validationError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-950/30 p-3"
            >
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{validationError}</p>
            </motion.div>
          )}

          {/* Bundle items grouped by portal */}
          <ScrollArea className="flex-1 px-6 py-4">
            {bundleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShoppingBag className="h-12 w-12 text-amber-200/20 mb-4" />
                <p className="text-sm text-amber-200/50">Your bundle is empty</p>
                <p className="text-xs text-amber-200/30 mt-1">
                  Add products from different portals above
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByPortal).map(([portalId, items]) => {
                  const portal = PORTALS.find((p) => p.id === portalId)!
                  return (
                    <div key={portalId}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{portal.logo}</span>
                        <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                          {portal.name}
                        </span>
                        {portal.isOwnPortal && (
                          <Badge className="bg-amber-600 text-stone-950 text-[9px] font-bold px-1 py-0">
                            REQUIRED
                          </Badge>
                        )}
                        <div className="flex-1 h-px bg-amber-900/20" />
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-900/50 p-3"
                          >
                            <div className="h-10 w-10 shrink-0 rounded-md bg-stone-800 border border-amber-900/20 flex items-center justify-center text-amber-600/40">
                              <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-amber-100 truncate">{item.name}</p>
                              <p className="text-xs text-amber-400">{formatINR(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-amber-200/60 hover:text-amber-100 hover:bg-amber-900/30"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-amber-200/60 hover:text-amber-100 hover:bg-amber-900/30"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400/60 hover:text-red-300 hover:bg-red-950/30"
                                onClick={() => handleRemoveFromBundle(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Bundle totals */}
          {bundleItems.length > 0 && (
            <SheetFooter className="border-t border-amber-900/30 px-6 pt-4 pb-6">
              <div className="w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200/60">Subtotal</span>
                  <span className="text-amber-100">{formatINR(subtotal)}</span>
                </div>
                {discountRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">
                      Bundle Discount ({getDiscountLabel(discountRate)})
                    </span>
                    <span className="text-green-400">−{formatINR(discountAmount)}</span>
                  </div>
                )}
                {discountRate === 0 && uniqueItemCount === 1 && (
                  <p className="text-xs text-amber-200/40 text-center">
                    Add 1 more item for a 5% bundle discount!
                  </p>
                )}
                <Separator className="bg-amber-900/20" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-amber-100">Total</span>
                  <span className="text-amber-400">{formatINR(finalTotal)}</span>
                </div>
                <Button
                  className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500 font-semibold mt-2"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── AI Curation Consent Dialog ──────────────────────────────────── */}
      <Dialog open={aiConsentOpen} onOpenChange={setAiConsentOpen}>
        <DialogContent className="bg-stone-950 border-amber-900/30 text-amber-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI-Powered Curation Consent
            </DialogTitle>
            <DialogDescription className="text-amber-200/60">
              To deliver your cross-portal bundle with maximum care, we use AI to:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-900/50 p-3">
              <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200/80">
                <strong className="text-amber-100">Optimize packaging</strong> — ensure fragile items from different portals are protected together
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-900/50 p-3">
              <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200/80">
                <strong className="text-amber-100">Smart scheduling</strong> — coordinate delivery timing across all portals
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-900/50 p-3">
              <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200/80">
                <strong className="text-amber-100">Personalized recommendations</strong> — suggest complementary products for future bundles
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-200/40 leading-relaxed">
            Your data is processed securely and never shared with third-party portals. You can opt out at any time from your account settings.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-amber-800/40 text-amber-200 hover:bg-amber-900/30 hover:text-amber-100"
              onClick={() => handleAiConsent(false)}
            >
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button
              className="bg-amber-600 text-stone-950 hover:bg-amber-500 font-semibold"
              onClick={() => handleAiConsent(true)}
            >
              <Sparkles className="h-4 w-4 mr-1" /> Accept & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
