'use client'

import React from 'react'
import { useStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  User, ShoppingBag, Heart, CreditCard, Ticket, ArrowLeft, Mail, Shield, Loader2, Package, Clock, Truck, XCircle, ShoppingCart, MessageSquare, Plus,
  Sun, Moon, Sparkles, Gift, Headphones, TrendingUp, Star, Zap, ChevronRight, Calendar, Award, BarChart3, Crown, Target,
} from 'lucide-react'

/* ─── style constants ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null): Record<string, string> => t ? { Authorization: `Bearer ${t}` } : {}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    open: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    in_progress: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    resolved: 'bg-green-600/20 text-green-400 border-green-600/30',
    closed: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  }
  return m[s] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/* ─── Helper: time-of-day greeting ─── */
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function formatDateFull(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* ─── Mock product data for recommendations ─── */
const MOCK_RECOMMENDATIONS = [
  { id: 'rec-1', name: 'Elegant Silk Saree', price: 3499, image: '/images/hero.png', rating: 4.5, category: 'sarees' },
  { id: 'rec-2', name: 'Diamond Pendant Set', price: 12999, image: '/images/hero.png', rating: 4.8, category: 'jewelry' },
  { id: 'rec-3', name: 'Premium Watch', price: 8999, image: '/images/hero.png', rating: 4.3, category: 'watches' },
  { id: 'rec-4', name: 'Designer Clutch Bag', price: 2499, image: '/images/hero.png', rating: 4.6, category: 'leather-goods' },
]

/* ─── Main Component ─── */
export function UserDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView, selectProduct, cartItems, toggleGiftBuilder } = useStore()

  // 401 auto-logout
  React.useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'user') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have user privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Store</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner userName={authUser.name} token={authToken} email={authUser.email} cartItems={cartItems} />

      {/* Quick Actions Grid */}
      <QuickActionsGrid setView={setView} selectProduct={selectProduct} toggleGiftBuilder={toggleGiftBuilder} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-6">
          <ProfileCard user={authUser} />
          <LoyaltyPointsCard />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <ActivityFeed token={authToken} email={authUser.email} userId={authUser.id} />
        </div>
      </div>

      {/* Order Tracking Section */}
      <OrderTrackingSection token={authToken} email={authUser.email} />

      {/* Personalized Recommendations */}
      <RecommendationsSection setView={setView} selectProduct={selectProduct} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Payment Methods */}
        <PaymentMethodsSection />

        {/* Support Tickets */}
        <SupportTicketsSection token={authToken} userId={authUser.id} />
      </div>
    </motion.div>
  )
}

/* ─── Welcome Banner ─── */
function WelcomeBanner({ userName, token, email, cartItems }: { userName: string; token: string | null; email: string; cartItems: any[] }) {
  // Fetch orders count
  const { data: ordersData } = useQuery({
    queryKey: ['user-orders-banner', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: wishlistData } = useQuery({
    queryKey: ['user-wishlist-banner'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist', { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
  })

  const totalOrders = ordersData?.orders?.length || 0
  const wishlistItems = wishlistData?.wishlist?.length || 0
  const cartCount = cartItems.length

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
      <div className="relative overflow-hidden rounded-xl border border-amber-900/30 bg-gradient-to-r from-amber-900/30 via-stone-900/80 to-rose-900/20 p-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-rose-600/5 rounded-full translate-y-1/2" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sun className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">{getGreeting()},</span>
              </div>
              <h1 className="text-2xl font-bold text-amber-100">{userName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-3.5 w-3.5 text-amber-200/40" />
                <p className="text-xs text-amber-200/50">{formatDateFull()}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center rounded-lg border border-amber-900/20 bg-stone-800/50 px-4 py-3 min-w-[80px]">
                <ShoppingBag className="h-4 w-4 text-amber-400 mb-1" />
                <span className="text-lg font-bold text-amber-100">{totalOrders}</span>
                <span className="text-[9px] text-amber-200/40">Orders</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-amber-900/20 bg-stone-800/50 px-4 py-3 min-w-[80px]">
                <Heart className="h-4 w-4 text-rose-400 mb-1" />
                <span className="text-lg font-bold text-amber-100">{wishlistItems}</span>
                <span className="text-[9px] text-amber-200/40">Wishlist</span>
              </div>
              <div className="flex flex-col items-center rounded-lg border border-amber-900/20 bg-stone-800/50 px-4 py-3 min-w-[80px]">
                <Zap className="h-4 w-4 text-amber-400 mb-1" />
                <span className="text-lg font-bold text-amber-100">2,450</span>
                <span className="text-[9px] text-amber-200/40">Points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Quick Actions Grid ─── */
function QuickActionsGrid({ setView, selectProduct, toggleGiftBuilder }: { setView: (v: any) => void; selectProduct: (id: string) => void; toggleGiftBuilder: () => void }) {
  const actions = [
    { icon: ShoppingBag, label: 'Continue Shopping', desc: 'Browse products', color: 'text-amber-400', bg: 'bg-amber-600/15', action: () => setView('home') },
    { icon: Truck, label: 'Track My Order', desc: 'View order status', color: 'text-purple-400', bg: 'bg-purple-600/15', action: () => {
      const el = document.getElementById('order-tracking-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    }},
    { icon: Gift, label: 'Build a Gift', desc: 'Create gift combos', color: 'text-rose-400', bg: 'bg-rose-600/15', action: () => toggleGiftBuilder() },
    { icon: Sparkles, label: 'AI Try-On History', desc: 'View past previews', color: 'text-cyan-400', bg: 'bg-cyan-600/15', action: () => {} },
    { icon: Heart, label: 'My Wishlist', desc: 'Saved items', color: 'text-red-400', bg: 'bg-red-600/15', action: () => {
      const el = document.getElementById('wishlist-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    }},
    { icon: Headphones, label: 'Support', desc: 'Get help', color: 'text-emerald-400', bg: 'bg-emerald-600/15', action: () => {
      const el = document.getElementById('support-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    }},
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((action, idx) => (
          <button
            key={action.label}
            onClick={action.action}
            className="group flex flex-col items-center gap-2 rounded-xl border border-amber-900/20 bg-stone-900/60 p-4 transition-all hover:border-amber-600/30 hover:bg-stone-800/60 hover:shadow-md hover:shadow-amber-900/10"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} transition-transform group-hover:scale-110`}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-amber-100">{action.label}</p>
              <p className="text-[9px] text-amber-200/30">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── Profile Card ─── */
function ProfileCard({ user }: { user: { name: string; email: string; role: string } }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600/20 text-xl font-bold text-amber-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-100">{user.name}</p>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 capitalize">{user.role}</Badge>
            </div>
          </div>
          <Separator className="bg-amber-900/20" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-amber-200/40" />
              <div>
                <p className="text-xs text-amber-200/50">Email</p>
                <p className="text-sm text-amber-100">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-amber-200/40" />
              <div>
                <p className="text-xs text-amber-200/50">Role</p>
                <p className="text-sm text-amber-100 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className={`w-full ${btnOutline}`} onClick={() => {/* could open edit profile */}}>
            <User className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Loyalty Points Card ─── */
function LoyaltyPointsCard() {
  const points = 2450
  const tier = 'Gold'
  const nextTier = 'Platinum'
  const nextTierPoints = 5000
  const progress = Math.min((points / nextTierPoints) * 100, 100)

  const recentPoints = [
    { action: 'Order #3847', points: 150, date: '2 days ago' },
    { action: 'Review bonus', points: 50, date: '5 days ago' },
    { action: 'Referral reward', points: 200, date: '1 week ago' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Loyalty Points</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Points Balance */}
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-100">{points.toLocaleString()}</p>
            <p className="text-xs text-amber-200/50">points balance</p>
          </div>

          {/* Tier Badge */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-600/20 px-3 py-1 border border-amber-600/30">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{tier} Member</span>
            </div>
          </div>

          {/* Next Tier Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-amber-200/40">Progress to {nextTier}</span>
              <span className="text-amber-400">{points.toLocaleString()} / {nextTierPoints.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-800/80 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
              />
            </div>
            <p className="text-[9px] text-amber-200/30 text-center">{(nextTierPoints - points).toLocaleString()} points to {nextTier}</p>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* Recent Points */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/40">Recent Points</p>
            {recentPoints.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-amber-200/60">{p.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400">+{p.points}</span>
                  <span className="text-[9px] text-amber-200/30">{p.date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Activity Feed ─── */
function ActivityFeed({ token, email, userId }: { token: string | null; email: string; userId: string }) {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders-activity', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: wishlistData, isLoading: wishlistLoading } = useQuery({
    queryKey: ['user-wishlist-activity'],
    queryFn: async () => {
      const res = await fetch('/api/wishlist', { headers: authH(token) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
  })

  const orders = ordersData?.orders || []
  const wishlist = wishlistData?.wishlist || []

  // Build activity items from different sources
  const activities: { type: string; icon: any; text: string; time: string; color: string }[] = []

  // Recent orders
  orders.slice(0, 3).forEach((o: any) => {
    activities.push({
      type: 'order',
      icon: ShoppingBag,
      text: `Order ${o.orderNumber} — ${fmt(o.total)}`,
      time: fmtDate(o.createdAt),
      color: 'text-amber-400',
    })
  })

  // Recent wishlist
  wishlist.slice(0, 2).forEach((w: any) => {
    activities.push({
      type: 'wishlist',
      icon: Heart,
      text: `Added "${w.product?.name?.substring(0, 30) || 'Item'}" to wishlist`,
      time: fmtDate(w.createdAt),
      color: 'text-rose-400',
    })
  })

  // Mock AI try-on activity
  activities.push({
    type: 'ai-tryon',
    icon: Sparkles,
    text: 'AI Virtual Try-On completed',
    time: 'Today',
    color: 'text-cyan-400',
  })

  // Sort by recency (just use insertion order for now)
  const isLoading = ordersLoading || wishlistLoading

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-700/50">
                    <activity.icon className={`h-4 w-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-100 truncate">{activity.text}</p>
                    <p className="text-[10px] text-amber-200/40">{activity.time}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-200/20 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Order Tracking Section ─── */
function OrderTrackingSection({ token, email }: { token: string | null; email: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-orders-tracking', email],
    queryFn: async () => {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
  })

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false)
  const [cancelOrderId, setCancelOrderId] = React.useState<string | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelLoading, setCancelLoading] = React.useState(false)
  const queryClient = useQueryClient()

  const orders = (data?.orders || []).filter((o: any) => o.trackingNumber || o.estimatedDelivery || o.status === 'pending')

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return
    setCancelLoading(true)
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authH(token) },
        body: JSON.stringify({ reason: cancelReason, email }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['user-orders-tracking', email] })
        queryClient.invalidateQueries({ queryKey: ['user-orders', email] })
      }
    } catch {
      // ignore
    } finally {
      setCancelLoading(false)
      setCancelDialogOpen(false)
      setCancelReason('')
      setCancelOrderId(null)
    }
  }

  return (
    <motion.div id="order-tracking-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Order Tracking</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-6 text-center">
              <Truck className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No tracking info available</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orders.map((o: any) => (
                <div key={o.id} className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-100">{o.orderNumber}</p>
                      <Badge className={statusColor(o.status)}>{o.status}</Badge>
                      {o.deliveryType && (
                        <Badge className="ml-2 bg-stone-600/20 text-stone-300 border-stone-600/30 capitalize text-[10px]">
                          {o.deliveryType}
                        </Badge>
                      )}
                    </div>
                    {o.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setCancelOrderId(o.id); setCancelDialogOpen(true) }}
                        className="border-red-900/30 text-red-400/60 hover:border-red-600/40 hover:text-red-400 text-xs h-7"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {o.trackingNumber && (
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-amber-200/30" />
                        <span className="text-xs text-amber-200/50">Tracking:</span>
                        {o.trackingUrl ? (
                          <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline">
                            {o.trackingNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-amber-100">{o.trackingNumber}</span>
                        )}
                      </div>
                    )}
                    {o.estimatedDelivery && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-200/30" />
                        <span className="text-xs text-amber-200/50">Est. Delivery:</span>
                        <span className="text-xs text-amber-100">{fmtDate(o.estimatedDelivery)}</span>
                      </div>
                    )}
                    {o.giftWrapping && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]">🎁</span>
                        <span className="text-xs text-amber-200/40">Gift Wrapped{o.giftWrapStyle ? ` (${o.giftWrapStyle})` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cancel Order Dialog */}
          <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Cancel Order</DialogTitle>
                <DialogDescription className="text-amber-200/50">Are you sure you want to cancel this order?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="cancel-reason" className="text-sm text-amber-200/60">Reason for cancellation</Label>
                  <Input
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Tell us why you're cancelling"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => { setCancelDialogOpen(false); setCancelReason(''); setCancelOrderId(null) }}
                    className="flex-1 border-amber-900/40 text-amber-200/60"
                  >
                    Keep Order
                  </Button>
                  <Button
                    onClick={handleCancelOrder}
                    disabled={cancelLoading}
                    className="flex-1 bg-red-600 text-white hover:bg-red-500"
                  >
                    {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Order'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Recommendations Section ─── */
function RecommendationsSection({ setView, selectProduct }: { setView: (v: any) => void; selectProduct: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm font-semibold text-amber-100">Recommended for You</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-200/40 hover:text-amber-400 text-xs" onClick={() => setView('home')}>
              View All <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOCK_RECOMMENDATIONS.map((product, idx) => (
              <button
                key={product.id}
                onClick={() => {
                  selectProduct(product.id)
                }}
                className="group flex flex-col rounded-lg border border-amber-900/20 bg-stone-800/30 overflow-hidden transition-all hover:border-amber-600/30 hover:shadow-md hover:shadow-amber-900/10 text-left"
              >
                <div className="relative aspect-square bg-stone-800 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-8 w-8 text-amber-200/15" />
                  </div>
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-stone-900/80 px-1.5 py-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[9px] text-amber-200/70">{product.rating}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-amber-100 truncate">{product.name}</p>
                  <p className="text-xs font-semibold text-amber-400 mt-0.5">{fmt(product.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Payment Methods ─── */
function PaymentMethodsSection() {
  const cards = [
    { type: 'Visa', last4: '4242', expiry: '12/26', brand: 'visa' },
    { type: 'Mastercard', last4: '8888', expiry: '06/25', brand: 'mastercard' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Payment Methods</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                <CreditCard className="h-8 w-8 text-amber-200/40" />
                <div className="flex-1">
                  <p className="text-sm text-amber-100">{c.type} •••• {c.last4}</p>
                  <p className="text-xs text-amber-200/50">Expires {c.expiry}</p>
                </div>
                <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Default</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Support Tickets ─── */
function SupportTicketsSection({ token, userId }: { token: string | null; userId: string }) {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [viewTicketDialogOpen, setViewTicketDialogOpen] = React.useState(false)
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null)
  const [ticketForm, setTicketForm] = React.useState({ subject: '', priority: 'medium', message: '' })
  const [ticketSubmitting, setTicketSubmitting] = React.useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['user-tickets', userId],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets?userId=${userId}`, { headers: authH(token) })
      if (!res.ok) throw new Error('Failed to fetch tickets')
      return res.json()
    },
    enabled: !!token && !!userId,
  })

  const tickets = data?.tickets || []

  const handleCreateTicket = async () => {
    if (!ticketForm.subject) return
    setTicketSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authH(token) },
        body: JSON.stringify({
          subject: ticketForm.subject,
          priority: ticketForm.priority,
          userId,
          message: ticketForm.message || `Ticket created: ${ticketForm.subject}`,
        }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['user-tickets', userId] })
        setCreateDialogOpen(false)
        setTicketForm({ subject: '', priority: 'medium', message: '' })
      }
    } catch {
      // ignore
    } finally {
      setTicketSubmitting(false)
    }
  }

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket)
    setViewTicketDialogOpen(true)
  }

  return (
    <motion.div id="support-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm font-semibold text-amber-100">Support Tickets</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className={`${btnPrimary} h-7 text-xs`}
            >
              <Plus className="mr-1 h-3 w-3" />
              New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="py-6 text-center">
              <Ticket className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">Sign in to view tickets</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-6 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No support tickets</p>
              <p className="mt-1 text-xs text-amber-200/30">Your support requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tickets.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => handleViewTicket(t)}
                  className="flex w-full items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/30 p-3 text-left hover:bg-stone-800/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-amber-100 truncate">{t.subject}</p>
                    <p className="text-xs text-amber-200/50">{fmtDate(t.createdAt)}</p>
                  </div>
                  <Badge className={statusColor(t.status)}>{t.status}</Badge>
                </button>
              ))}
            </div>
          )}

          {/* Create Ticket Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Create Support Ticket</DialogTitle>
                <DialogDescription className="text-amber-200/50">Describe your issue and we'll help you out</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="ticket-subject" className="text-sm text-amber-200/60">Subject</Label>
                  <Input
                    id="ticket-subject"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                </div>
                <div>
                  <Label htmlFor="ticket-priority" className="text-sm text-amber-200/60">Priority</Label>
                  <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-900/30 bg-stone-900">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ticket-message" className="text-sm text-amber-200/60">Message</Label>
                  <textarea
                    id="ticket-message"
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Describe your issue in detail"
                    rows={4}
                    className="mt-1 w-full rounded-md border border-amber-900/40 bg-stone-800/50 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-amber-600 resize-none"
                  />
                </div>
                <Button
                  onClick={handleCreateTicket}
                  disabled={ticketSubmitting || !ticketForm.subject}
                  className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500"
                >
                  {ticketSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* View Ticket Dialog */}
          <Dialog open={viewTicketDialogOpen} onOpenChange={setViewTicketDialogOpen}>
            <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-amber-100">{selectedTicket?.subject}</DialogTitle>
                <DialogDescription className="text-amber-200/50">
                  <Badge className={statusColor(selectedTicket?.status)}>{selectedTicket?.status}</Badge>
                  <span className="ml-2">{selectedTicket?.priority && `Priority: ${selectedTicket.priority}`}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2 max-h-64 overflow-y-auto">
                {selectedTicket?.messages?.map((msg: any) => (
                  <div key={msg.id} className={`rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 ${msg.senderId === userId ? 'ml-4' : 'mr-4'}`}>
                    <p className="text-xs text-amber-200/30 mb-1">
                      {msg.senderId === userId ? 'You' : 'Support'} · {fmtDate(msg.createdAt)}
                    </p>
                    <p className="text-sm text-amber-200/70">{msg.message}</p>
                  </div>
                ))}
                {(!selectedTicket?.messages || selectedTicket.messages.length === 0) && (
                  <p className="text-sm text-amber-200/40 text-center py-4">No messages yet</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  )
}
