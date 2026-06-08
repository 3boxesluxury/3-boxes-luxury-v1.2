'use client'

import React from 'react'
import { useStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, Package, ShoppingBag, BookOpen, ArrowLeft, Shield, Loader2,
  BarChart3, TrendingUp, FolderOpen, FileText, PenTool, LayoutGrid,
} from 'lucide-react'

/* ─── style constants ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  }
  return m[s] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/* ─── Main Component ─── */
export function TeamDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()

  // 401 auto-logout
  React.useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'team') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have team privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Store</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6 space-y-6">
      {/* Header - Green themed */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-700/30 to-emerald-600/20 border border-green-600/20 shrink-0">
            <Users className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-green-100">3Boxes Team Dashboard</h1>
            <p className="text-xs text-green-300/50">Welcome, {authUser.name}</p>
          </div>
          <Badge className="ml-2 bg-green-600/20 text-green-400 border-green-600/30">Team</Badge>
        </div>
        <Button variant="outline" className={btnOutline} onClick={() => setView('home')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
        </Button>
      </div>

      {/* Quick-Access: Content Editor & Product Manager */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Content Editor Quick-Access */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-green-700/30 bg-gradient-to-br from-green-950/40 to-stone-900/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600/20">
                  <PenTool className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-200">Content Editor</p>
                  <p className="text-xs text-green-300/50">Quick access to content tools</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  📝 Blog Posts
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  🖼️ Media Library
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  📋 Wiki Pages
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  🔔 Announcements
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Product Manager Quick-Access */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-green-700/30 bg-gradient-to-br from-green-950/40 to-stone-900/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600/20">
                  <LayoutGrid className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-200">Product Manager</p>
                  <p className="text-xs text-green-300/50">Quick access to product tools</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  📦 Catalog Review
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  🏷️ Pricing Updates
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  📊 Inventory Alerts
                </button>
                <button className="rounded-md border border-green-700/20 bg-green-900/10 px-3 py-2 text-xs text-green-300/70 hover:bg-green-900/20 hover:text-green-200 transition-colors text-left">
                  ✏️ Descriptions
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <TeamQuickStats token={authToken} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Product Catalog Overview */}
        <ProductCatalogOverview token={authToken} />

        {/* Recent Orders Summary */}
        <RecentOrdersSummary token={authToken} />
      </div>

      {/* Content / Wiki Access */}
      <ContentWikiAccess />
    </motion.div>
  )
}

/* ─── Quick Stats ─── */
function TeamQuickStats({ token }: { token: string | null }) {
  const { data: productsData } = useQuery({
    queryKey: ['team-products-count'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1', { headers: authH(token) })
      if (!res.ok) return { products: [], pagination: { total: 0 } }
      return res.json()
    },
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['team-categories-count'],
    queryFn: async () => {
      const res = await fetch('/api/categories', { headers: authH(token) })
      if (!res.ok) return { categories: [] }
      return res.json()
    },
  })

  const totalProducts = productsData?.pagination?.total || productsData?.products?.length || 0
  const totalCategories = categoriesData?.categories?.length || 0

  const stats = [
    { title: 'Products', value: totalProducts.toString(), icon: Package, color: 'text-amber-400', bg: 'bg-amber-600/10' },
    { title: 'Categories', value: totalCategories.toString(), icon: FolderOpen, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { title: 'Active Orders', value: '12', icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-600/10' },
    { title: 'Wiki Pages', value: '24', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-600/10' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-amber-200/50">{s.title}</p>
                  <p className="text-lg font-bold text-amber-100">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Product Catalog Overview ─── */
function ProductCatalogOverview({ token }: { token: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=10', { headers: authH(token) })
      if (!res.ok) return { products: [] }
      return res.json()
    },
  })

  const products = data?.products || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Product Catalog</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Product</TableHead>
                    <TableHead className="text-amber-200/50">Price</TableHead>
                    <TableHead className="text-amber-200/50">Stock</TableHead>
                    <TableHead className="text-amber-200/50">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => (
                    <TableRow key={p.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-stone-700/50">
                              <Package className="h-3 w-3 text-amber-200/30" />
                            </div>
                          )}
                          <span className="text-sm text-amber-100">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(p.price)}</TableCell>
                      <TableCell>
                        <Badge className={p.stock <= 5 ? 'bg-red-600/20 text-red-400 border-red-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}>
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{p.category?.name || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Recent Orders Summary ─── */
function RecentOrdersSummary({ token }: { token: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders?email=all', { headers: authH(token) })
      if (!res.ok) return { orders: [] }
      return res.json()
    },
  })

  const orders = data?.orders || []

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Recent Orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-sm text-amber-200/40">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Order #</TableHead>
                    <TableHead className="text-amber-200/50">Customer</TableHead>
                    <TableHead className="text-amber-200/50">Total</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 8).map((o: any) => (
                    <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell className="text-sm font-medium text-amber-100">{o.orderNumber}</TableCell>
                      <TableCell className="text-sm text-amber-200/60">{o.email}</TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(o.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColor(o.status)}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ─── Content / Wiki Access ─── */
function ContentWikiAccess() {
  const wikiPages = [
    { id: 'w1', title: 'Brand Guidelines', category: 'Design', updated: '2 days ago' },
    { id: 'w2', title: 'Product Photography Standards', category: 'Content', updated: '5 days ago' },
    { id: 'w3', title: 'Customer Service Protocols', category: 'Operations', updated: '1 week ago' },
    { id: 'w4', title: 'Inventory Management Guide', category: 'Operations', updated: '2 weeks ago' },
    { id: 'w5', title: 'Social Media Playbook', category: 'Marketing', updated: '3 weeks ago' },
  ]

  const categoryColor = (cat: string) => {
    const m: Record<string, string> = {
      Design: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
      Content: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      Operations: 'bg-green-600/20 text-green-400 border-green-600/30',
      Marketing: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    }
    return m[cat] || 'bg-stone-600/20 text-stone-400 border-stone-600/30'
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-sm font-semibold text-amber-100">Content & Wiki</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {wikiPages.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/10">
                  <FileText className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-amber-100">{w.title}</p>
                  <p className="text-xs text-amber-200/50">Updated {w.updated}</p>
                </div>
                <Badge className={categoryColor(w.category)}>{w.category}</Badge>
                <Button size="sm" variant="ghost" className="text-amber-200/40 hover:text-amber-400">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
