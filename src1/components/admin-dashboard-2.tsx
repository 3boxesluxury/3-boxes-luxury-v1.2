'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { PartnersTab } from '@/components/admin/partners-tab'
import { DocumentationTab } from '@/components/admin/documentation-tab'
import { StyleGalleryTab } from '@/components/admin/style-gallery-tab'
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag, FileText, Calculator,
  Truck, Users, BookOpen, Share2, Tag, Import, Plus, Pencil, Trash2,
  Search, Upload, X, ChevronDown, AlertTriangle, Check, Loader2,
  Eye, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Box, UserCheck,
  Globe, ExternalLink, Image as ImageIcon, RefreshCw, Link2, ShoppingCart,
  Handshake, Building2, Megaphone, ThumbsUp, ThumbsDown, Users as UsersIcon,
  FolderOpen, BarChart3, Download, Truck as TruckIcon, Mail, Send, Copy, CheckCircle,
  Presentation, Sun, Moon, Menu, ChevronLeft, ChevronRight, LogOut, Home, Sparkles,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

/* ─── style constants ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'

/* ─── theme constants ─── */
const darkTheme = {
  bg: 'bg-stone-950',
  cardBg: 'bg-stone-900/80',
  sidebarBg: 'bg-stone-950',
  text: 'text-amber-100',
  textMuted: 'text-amber-200/60',
  border: 'border-amber-900/30',
  input: 'bg-stone-800/50',
  hover: 'hover:bg-amber-900/20',
  activeItem: 'bg-amber-600 text-stone-950',
}

const lightTheme = {
  bg: 'bg-amber-50/30',
  cardBg: 'bg-white border-amber-200/40',
  sidebarBg: 'bg-white',
  text: 'text-stone-900',
  textMuted: 'text-stone-500',
  border: 'border-amber-200/50',
  input: 'bg-amber-50/50',
  hover: 'hover:bg-amber-100/40',
  activeItem: 'bg-amber-600 text-white',
}
const inputCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100 placeholder:text-amber-200/30'
const lblCls = 'text-amber-200/60 text-xs'
const selCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100'
const selContentCls = 'border-amber-900/40 bg-stone-950'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'
const defCls = 'bg-stone-600/20 text-stone-400 border-stone-600/30'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...authH(token), ...opts.headers } })
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    draft: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
    sent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    paid: 'bg-green-600/20 text-green-400 border-green-600/30',
    approved: 'bg-green-600/20 text-green-400 border-green-600/30',
    rejected: 'bg-red-600/20 text-red-400 border-red-600/30',
    active: 'bg-green-600/20 text-green-400 border-green-600/30',
    inactive: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  }
  return m[s] || defCls
}

const roleColor = (r: string) => {
  const m: Record<string, string> = {
    admin: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
    user: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    agent: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    team: 'bg-green-600/20 text-green-400 border-green-600/30',
  }
  return m[r] || defCls
}

/* ─── Main Component ─── */
export function AdminDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  const t = theme === 'dark' ? darkTheme : lightTheme

  // 401 auto-logout
  useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Quick Actions navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail === 'string') setActiveTab(detail)
    }
    window.addEventListener('admin:navigate', handler)
    return () => window.removeEventListener('admin:navigate', handler)
  }, [])

  // Auto-scroll sidebar to show active item
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeTab])

  if (!authUser || authUser.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have admin privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invalidateAll = () => qc.invalidateQueries()

  const sidebarItems = [
    { value: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { value: 'products', icon: Package, label: 'Products' },
    { value: 'categories', icon: FolderOpen, label: 'Categories' },
    { value: 'inventory', icon: Warehouse, label: 'Inventory' },
    { value: 'orders', icon: ShoppingBag, label: 'Orders' },
    { value: 'invoices', icon: FileText, label: 'Invoices' },
    { value: 'accounting', icon: Calculator, label: 'Accounting' },
    { value: 'vendors', icon: Truck, label: 'Vendors' },
    { value: 'users', icon: Users, label: 'Users & Perms' },
    { value: 'content', icon: BookOpen, label: 'Content' },
    { value: 'sharedocs', icon: Share2, label: 'Share Docs' },
    { value: 'documentation', icon: BookOpen, label: 'Documentation' },
    { value: 'offers', icon: Tag, label: 'Offers' },
    { value: 'import', icon: Import, label: 'Import' },
    { value: 'reports', icon: BarChart3, label: 'Reports' },
    { value: 'integrations', icon: Globe, label: 'Integrations' },
    { value: 'partners', icon: Handshake, label: 'Partners' },
    { value: 'style-gallery', icon: Sparkles, label: 'AI Style Gallery' },
    { value: 'corporate', icon: Building2, label: 'Corporate' },
  ]

  const investorItems = [
    { value: 'investor', icon: Presentation, label: 'Investor Kit' },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab token={authToken} theme={theme} />
      case 'products': return <ProductsTab token={authToken} onMutate={invalidateAll} />
      case 'categories': return <CategoriesTab token={authToken} onMutate={invalidateAll} />
      case 'inventory': return <InventoryTab token={authToken} onMutate={invalidateAll} />
      case 'orders': return <OrdersTab token={authToken} onMutate={invalidateAll} />
      case 'invoices': return <InvoicesTab token={authToken} onMutate={invalidateAll} />
      case 'accounting': return <AccountingTab token={authToken} onMutate={invalidateAll} />
      case 'vendors': return <VendorsTab token={authToken} onMutate={invalidateAll} />
      case 'users': return <UsersPermsTab token={authToken} onMutate={invalidateAll} />
      case 'content': return <ContentTab token={authToken} onMutate={invalidateAll} />
      case 'sharedocs': return <ShareDocsTab token={authToken} onMutate={invalidateAll} />
      case 'offers': return <OffersTab token={authToken} onMutate={invalidateAll} />
      case 'import': return <ImportTab token={authToken} onMutate={invalidateAll} />
      case 'reports': return <ReportsTab token={authToken} />
      case 'integrations': return <IntegrationsTab token={authToken} onMutate={invalidateAll} />
      case 'partners': return <PartnersTab token={authToken} onMutate={invalidateAll} />
      case 'style-gallery': return <StyleGalleryTab />
      case 'corporate': return <CorporateTab token={authToken} onMutate={invalidateAll} />
      case 'documentation': return <DocumentationTab token={authToken} />
      case 'investor': return <InvestorKitTab token={authToken} />
      default: return <DashboardTab token={authToken} theme={theme} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex ${t.bg} ${t.text} overflow-hidden`}
    >
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2 }}
        className={`fixed lg:relative z-50 h-full ${t.sidebarBg} border-r ${t.border} flex flex-col shrink-0 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar header */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2'} px-3 py-4 border-b ${t.border}`}>
          {!sidebarCollapsed && (
            <>
              <img src="/images/logo-uploaded.png" alt="3BL" className="h-10 w-10 object-contain contrast-150 brightness-130 saturate-130 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)] shrink-0" />
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${t.text}`}>3 BOXES LUXURY</p>
                <p className={`text-[10px] truncate ${t.textMuted}`}>Management Console</p>
              </div>
            </>
          )}
          {sidebarCollapsed && (
            <img src="/images/logo-uploaded.png" alt="3BL" className="h-9 w-9 object-contain contrast-150 brightness-130 saturate-130 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`hidden lg:flex h-6 w-6 p-0 ml-auto ${t.textMuted} shrink-0`}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sidebarItems.map(item => {
            const isActive = activeTab === item.value
            return (
              <button
                key={item.value}
                ref={isActive ? activeItemRef : undefined}
                onClick={() => { setActiveTab(item.value); setMobileMenuOpen(false) }}
                className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? t.activeItem : `${t.textMuted} ${t.hover}`
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}

          {/* Separator + Investor Kit */}
          <div className={`my-2 border-t ${t.border}`} />
          {investorItems.map(item => {
            const isActive = activeTab === item.value
            return (
              <button
                key={item.value}
                ref={isActive ? activeItemRef : undefined}
                onClick={() => { setActiveTab(item.value); setMobileMenuOpen(false) }}
                className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? t.activeItem : `${t.textMuted} ${t.hover}`
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {!sidebarCollapsed && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-500 border border-amber-600/30">🔒</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Exit button */}
        <div className={`p-2 border-t ${t.border}`}>
          <button
            onClick={() => setView('home')}
            className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm ${t.textMuted} ${t.hover} transition-colors`}
            title={sidebarCollapsed ? 'Back to Home' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Exit Admin</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className={`flex items-center gap-3 px-4 py-3 border-b ${t.border} ${t.sidebarBg} shrink-0`}>
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className={`h-5 w-5 ${t.text}`} />
          </Button>

          <img src="/images/logo-uploaded.png" alt="3BL" className="h-9 w-9 object-contain contrast-150 brightness-130 saturate-130 drop-shadow-[0_0_10px_rgba(255,215,0,0.6)] lg:hidden" />

          <div className="hidden lg:block">
            <h1 className={`text-sm font-semibold ${t.text}`}>3 BOXES LUXURY — Management Console</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${t.textMuted}`}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Badge className={roleColor('admin')}>Admin</Badge>
            <span className={`text-xs ${t.textMuted} hidden sm:inline`}>{authUser.email}</span>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 gap-1.5 text-xs ${t.textMuted}`}
              onClick={() => setView('home')}
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   1. DASHBOARD TAB — Interactive with Charts
   ════════════════════════════════════════════ */

/* Fake chart data for visual appeal */
const revenueData = [
  { month: 'Oct', revenue: 420000 },
  { month: 'Nov', revenue: 580000 },
  { month: 'Dec', revenue: 890000 },
  { month: 'Jan', revenue: 720000 },
  { month: 'Feb', revenue: 930000 },
  { month: 'Mar', revenue: 1150000 },
]

const orderStatusData = [
  { name: 'Delivered', value: 42, color: '#22c55e' },
  { name: 'Processing', value: 23, color: '#3b82f6' },
  { name: 'Shipped', value: 18, color: '#a855f7' },
  { name: 'Pending', value: 12, color: '#eab308' },
  { name: 'Cancelled', value: 5, color: '#ef4444' },
]

const sparkRevenue = [
  { v: 30 }, { v: 45 }, { v: 28 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 58 }, { v: 75 },
]
const sparkOrders = [
  { v: 20 }, { v: 35 }, { v: 42 }, { v: 30 }, { v: 55 }, { v: 48 }, { v: 62 }, { v: 50 },
]
const sparkProducts = [
  { v: 40 }, { v: 38 }, { v: 42 }, { v: 45 }, { v: 43 }, { v: 50 }, { v: 48 }, { v: 52 },
]
const sparkUsers = [
  { v: 15 }, { v: 22 }, { v: 28 }, { v: 35 }, { v: 30 }, { v: 42 }, { v: 38 }, { v: 45 },
]

const recentActivityItems = [
  { icon: ShoppingBag, text: 'New order #ORD-2048 placed', time: '2 min ago', color: 'text-blue-400' },
  { icon: Users, text: 'New user Priya Sharma registered', time: '15 min ago', color: 'text-purple-400' },
  { icon: DollarSign, text: 'Payment of ₹45,000 received', time: '1 hr ago', color: 'text-green-400' },
  { icon: Package, text: 'Product "Oud Royale" stock low (3 left)', time: '2 hr ago', color: 'text-amber-400' },
  { icon: CheckCircle, text: 'Order #ORD-2035 delivered', time: '3 hr ago', color: 'text-green-400' },
  { icon: ShoppingBag, text: 'New order #ORD-2047 placed', time: '4 hr ago', color: 'text-blue-400' },
]

function DashboardTab({ token, theme }: { token: string | null; theme: 'dark' | 'light' }) {
  const t = theme === 'dark' ? darkTheme : lightTheme
  const chartStroke = theme === 'dark' ? '#d97706' : '#b45309'
  const chartFill = theme === 'dark' ? '#d97706' : '#b45309'
  const gridColor = theme === 'dark' ? '#44403c' : '#e7e5e4'
  const axisColor = theme === 'dark' ? '#a8a29e' : '#78716c'
  const tooltipBg = theme === 'dark' ? '#1c1917' : '#ffffff'
  const tooltipBorder = theme === 'dark' ? '#44403c' : '#e7e5e4'
  const tooltipText = theme === 'dark' ? '#fef3c7' : '#1c1917'

  const { data: productsData } = useQuery({ queryKey: ['admin-products'], queryFn: () => apiFetch('/api/admin/products?limit=1', undefined, token) })
  const { data: usersData } = useQuery({ queryKey: ['admin-users'], queryFn: () => apiFetch('/api/admin/users?limit=1', undefined, token) })
  const { data: ordersData } = useQuery({ queryKey: ['admin-orders'], queryFn: () => apiFetch('/api/admin/orders?limit=1', undefined, token) })
  const { data: accountingData } = useQuery({ queryKey: ['accounting-summary'], queryFn: () => apiFetch('/api/accounting?limit=1', undefined, token) })

  const totalProducts = productsData?.pagination?.total || 0
  const totalUsers = usersData?.pagination?.total || 0
  const totalOrders = ordersData?.pagination?.total || 0
  const totalRevenue = accountingData?.summary?.totalCredits || 0

  const summaryCards = [
    { title: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-600/10', sparkData: sparkRevenue, sparkColor: '#22c55e' },
    { title: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-600/10', sparkData: sparkOrders, sparkColor: '#3b82f6' },
    { title: 'Products', value: totalProducts.toString(), icon: Package, color: 'text-amber-400', bg: 'bg-amber-600/10', sparkData: sparkProducts, sparkColor: '#d97706' },
    { title: 'Users', value: totalUsers.toString(), icon: Users, color: 'text-purple-400', bg: 'bg-purple-600/10', sparkData: sparkUsers, sparkColor: '#a855f7' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards with Sparklines */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={`${t.cardBg} ${t.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                      <c.icon className={`h-5 w-5 ${c.color}`} />
                    </div>
                    <div>
                      <p className={`text-xs ${t.textMuted}`}>{c.title}</p>
                      <p className={`text-lg font-bold ${t.text}`}>{c.value}</p>
                    </div>
                  </div>
                  <div className="h-10 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={c.sparkData}>
                        <defs>
                          <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={c.sparkColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={c.sparkColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={c.sparkColor} strokeWidth={1.5} fill={`url(#spark-${i})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className={`${t.cardBg} ${t.border}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-semibold ${t.text}`}>Revenue Overview</CardTitle>
              <p className={`text-xs ${t.textMuted}`}>Last 6 months</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartFill} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartFill} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: tooltipText, fontSize: 12 }}
                      formatter={(value: any) => [fmt(value as number), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={chartStroke} strokeWidth={2} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders by Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className={`${t.cardBg} ${t.border} h-full`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-semibold ${t.text}`}>Orders by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: tooltipText, fontSize: 12 }}
                      formatter={(value: any) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {orderStatusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className={t.textMuted}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Row */}
      <Card className={`${t.cardBg} ${t.border}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-sm font-semibold ${t.text}`}>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={`rounded-lg border ${t.border} ${t.input} p-4`}>
              <p className={`text-xs ${t.textMuted}`}>Account Balance</p>
              <p className={`mt-1 text-lg font-bold ${t.text}`}>{fmt(accountingData?.summary?.balance || 0)}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                <TrendingUp className="h-3 w-3" /> Net position
              </div>
            </div>
            <div className={`rounded-lg border ${t.border} ${t.input} p-4`}>
              <p className={`text-xs ${t.textMuted}`}>Total Credits</p>
              <p className="mt-1 text-lg font-bold text-green-400">{fmt(accountingData?.summary?.totalCredits || 0)}</p>
            </div>
            <div className={`rounded-lg border ${t.border} ${t.input} p-4`}>
              <p className={`text-xs ${t.textMuted}`}>Total Debits</p>
              <p className="mt-1 text-lg font-bold text-red-400">{fmt(accountingData?.summary?.totalDebits || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className={`${t.cardBg} ${t.border}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-semibold ${t.text}`}>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {recentActivityItems.map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${t.hover} transition-colors`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-stone-800/60' : 'bg-stone-100'}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${t.text} truncate`}>{item.text}</p>
                    </div>
                    <span className={`text-xs whitespace-nowrap ${t.textMuted}`}>{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className={`${t.cardBg} ${t.border}`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-semibold ${t.text}`}>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className={`w-full justify-start gap-2 ${btnPrimary}`} onClick={() => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: 'products' }))}>
                <Plus className="h-4 w-4" /> Add Product
              </Button>
              <Button variant="outline" className={`w-full justify-start gap-2 ${btnOutline}`} onClick={() => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: 'orders' }))}>
                <ShoppingBag className="h-4 w-4" /> View Orders
              </Button>
              <Button variant="outline" className={`w-full justify-start gap-2 ${btnOutline}`} onClick={() => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: 'inventory' }))}>
                <Warehouse className="h-4 w-4" /> Manage Inventory
              </Button>
              <Button variant="outline" className={`w-full justify-start gap-2 ${btnOutline}`} onClick={() => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: 'reports' }))}>
                <BarChart3 className="h-4 w-4" /> Generate Report
              </Button>
              <Button variant="outline" className={`w-full justify-start gap-2 ${btnOutline}`} onClick={() => window.dispatchEvent(new CustomEvent('admin:navigate', { detail: 'users' }))}>
                <Users className="h-4 w-4" /> Manage Users
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   2. PRODUCTS TAB
   ════════════════════════════════════════════ */
function ProductsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => apiFetch(`/api/admin/products?search=${search}&page=${page}&limit=20`, undefined, token),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowDelete(null) },
  })

  const products = (data?.products || []).map((p: any) => ({
    ...p,
    images: typeof p.images === 'string' ? (() => { try { return JSON.parse(p.images || '[]') } catch { return [] } })() : (Array.isArray(p.images) ? p.images : []),
    tags: typeof p.tags === 'string' ? (() => { try { return JSON.parse(p.tags || '[]') } catch { return [] } })() : (Array.isArray(p.tags) ? p.tags : []),
  }))
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Button className={btnPrimary} onClick={() => { setEditProduct(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Product</TableHead>
                    <TableHead className="text-amber-200/50">SKU</TableHead>
                    <TableHead className="text-amber-200/50">Price</TableHead>
                    <TableHead className="text-amber-200/50">Stock</TableHead>
                    <TableHead className="text-amber-200/50">Category</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p: any) => (
                    <TableRow key={p.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-8 w-8 rounded object-cover" />}
                          <div>
                            <p className="text-sm font-medium text-amber-100">{p.name}</p>
                            <p className="text-xs text-amber-200/40">{p.productNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{p.sku || '—'}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-amber-100">{fmt(p.price)}</p>
                        {p.compareAtPrice && <p className="text-xs text-amber-200/40 line-through">{fmt(p.compareAtPrice)}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge className={p.stock <= (p.reorderLevel || 5) ? 'bg-red-600/20 text-red-400 border-red-600/30' : 'bg-green-600/20 text-green-400 border-green-600/30'}>
                          {p.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{p.category?.name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditProduct(p); setShowForm(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(p)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No products found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
                <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm token={token} product={editProduct} onClose={() => { setShowForm(false); setEditProduct(null) }} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowForm(false); setEditProduct(null) }} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to delete <strong className="text-amber-100">{showDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Product Form ─── */
function ProductForm({ token, product, onClose, onSaved }: { token: string | null; product: any; onClose: () => void; onSaved: () => void }) {
  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories', undefined, token) })
  const { data: vendorsData } = useQuery({ queryKey: ['vendors'], queryFn: () => apiFetch('/api/vendors', undefined, token) })

  const categories = categoriesData?.categories || []
  const vendors = vendorsData?.vendors || []

  const [form, setForm] = useState({
    name: '', description: '', price: '', compareAtPrice: '', costPrice: '', sku: '',
    categoryId: '', stock: '0', reorderLevel: '5', featured: false, tags: '', vendorId: '',
  })
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '', description: product.description || '', price: String(product.price || ''),
        compareAtPrice: String(product.compareAtPrice || ''), costPrice: String(product.costPrice || ''),
        sku: product.sku || '', categoryId: product.categoryId || '', stock: String(product.stock || 0),
        reorderLevel: String(product.reorderLevel || 5), featured: product.featured || false,
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '', vendorId: product.vendorId || '',
      })
      setImages(Array.isArray(product.images) ? product.images : [])
    }
  }, [product])

  const handleUpload = async (files: FileList) => {
    const remaining = 3 - images.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      const fd = new FormData()
      toUpload.forEach(f => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', headers: authH(token), body: fd })
      if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); return }
      const data = await res.json()
      if (data.urls) setImages(prev => [...prev, ...data.urls].slice(0, 3))
      else throw new Error(data.error || 'Upload failed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files) }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) handleUpload(e.target.files) }

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.categoryId) { setError('Name, price, and category are required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        stock: parseInt(form.stock),
        reorderLevel: parseInt(form.reorderLevel),
        images,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        vendorId: form.vendorId === 'none' ? null : form.vendorId || null,
      }
      if (product) {
        await apiFetch(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Image Upload */}
      <div>
        <Label className={lblCls}>Images (max 3)</Label>
        <div
          className={`mt-1 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${dragOver ? 'border-amber-400 bg-amber-900/10' : 'border-amber-900/30 bg-stone-800/30'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {uploading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" />
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-amber-200/30" />
              <p className="mt-2 text-xs text-amber-200/40">Drag & drop or click to upload (max 3 images, 5MB each)</p>
            </>
          )}
        </div>
        {images.length > 0 && (
          <div className="mt-2 flex gap-2">
            {images.map((img, i) => (
              <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-amber-900/30">
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-red-600/80 text-white opacity-0 group-hover:opacity-100" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Premium Gold Necklace" /></div>
        <div><Label className={lblCls}>SKU</Label><Input className={`${inputCls} mt-1`} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g., SKU-GN-001" /></div>
        <div><Label className={lblCls}>Price *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g., 5999" /></div>
        <div><Label className={lblCls}>Compare At Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} placeholder="e.g., 7999" /></div>
        <div><Label className={lblCls}>Cost Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="e.g., 3500" /></div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Stock</Label><Input type="number" className={`${inputCls} mt-1`} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
        <div><Label className={lblCls}>Reorder Level</Label><Input type="number" className={`${inputCls} mt-1`} value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Tags (comma separated)</Label><Input className={`${inputCls} mt-1`} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g., gold, luxury, necklace" /></div>
      </div>
      <div>
        <Label className={lblCls}>Description</Label>
        <Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Exquisite 22K gold necklace with traditional design..." />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
        <Label className={lblCls}>Featured Product</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{product ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   3. INVENTORY TAB
   ════════════════════════════════════════════ */
function InventoryTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [showAdjust, setShowAdjust] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, typeFilter],
    queryFn: () => apiFetch(`/api/inventory?page=${page}&limit=20${typeFilter ? `&type=${typeFilter}` : ''}`, undefined, token),
  })

  const { data: productsData } = useQuery({ queryKey: ['admin-products-low'], queryFn: () => apiFetch('/api/admin/products?limit=50', undefined, token) })
  const lowStockProducts = (productsData?.products || []).filter((p: any) => p.stock <= (p.reorderLevel || 5))

  const logs = data?.logs || []
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      {lowStockProducts.length > 0 && (
        <Card className="border-red-900/30 bg-red-950/30">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Low Stock Alerts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p: any) => (
                <Badge key={p.id} className="bg-red-600/20 text-red-400 border-red-600/30">
                  {p.name} — {p.stock} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter type" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="return">Return</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowAdjust(true)}>
          <Plus className="mr-1 h-4 w-4" /> Adjust Stock
        </Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Date</TableHead>
                  <TableHead className="text-amber-200/50">Product</TableHead>
                  <TableHead className="text-amber-200/50">Type</TableHead>
                  <TableHead className="text-amber-200/50">Qty</TableHead>
                  <TableHead className="text-amber-200/50">Current Stock</TableHead>
                  <TableHead className="text-amber-200/50">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-xs text-amber-200/60">{fmtDateTime(l.createdAt)}</TableCell>
                    <TableCell>
                      <p className="text-sm text-amber-100">{l.product?.name}</p>
                      <p className="text-xs text-amber-200/40">{l.product?.productNumber}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(l.type === 'in' || l.type === 'return' ? 'active' : l.type === 'out' ? 'cancelled' : 'pending')}>
                        {l.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{l.quantity}</TableCell>
                    <TableCell className="text-sm text-amber-100">{l.product?.stock}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-amber-200/40">{l.note || '—'}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No inventory logs</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Adjust Stock</DialogTitle></DialogHeader>
          <StockAdjustForm token={token} onClose={() => setShowAdjust(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['inventory'] }); onMutate(); setShowAdjust(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StockAdjustForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const { data: productsData } = useQuery({ queryKey: ['admin-products-all'], queryFn: () => apiFetch('/api/admin/products?limit=100', undefined, token) })
  const products = productsData?.products || []
  const [form, setForm] = useState({ productId: '', type: 'in', quantity: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.productId || !form.type || !form.quantity) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(form) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div>
        <Label className={lblCls}>Product *</Label>
        <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className={lblCls}>Type *</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="in">Stock In</SelectItem>
            <SelectItem value="out">Stock Out</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
            <SelectItem value="return">Return</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className={lblCls}>Quantity *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
      <div><Label className={lblCls}>Note</Label><Input className={`${inputCls} mt-1`} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Adjust</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   4. ORDERS TAB
   ════════════════════════════════════════════ */
function OrdersTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [showTracking, setShowTracking] = useState<any>(null)
  const [showRefund, setShowRefund] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter],
    queryFn: () => apiFetch(`/api/admin/orders?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`, undefined, token),
  })

  const orders = data?.orders || []
  const stats = data?.stats
  const pagination = data?.pagination

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); onMutate(); setViewOrder(null) },
  })

  const trackingMut = useMutation({
    mutationFn: ({ id, trackingNumber, trackingUrl }: { id: string; trackingNumber: string; trackingUrl: string }) =>
      apiFetch(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ trackingNumber, trackingUrl }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); onMutate(); setShowTracking(null) },
  })

  const refundMut = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: string; reason: string }) =>
      apiFetch(`/api/orders/${id}/refund`, { method: 'POST', body: JSON.stringify({ amount, reason }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); onMutate(); setShowRefund(null) },
  })

  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', trackingUrl: '' })
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Pending: {stats.pending}</Badge>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Processing: {stats.processing}</Badge>
            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">Shipped: {stats.shipped}</Badge>
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Delivered: {stats.delivered}</Badge>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Order #</TableHead>
                    <TableHead className="text-amber-200/50">Customer</TableHead>
                    <TableHead className="text-amber-200/50">Total</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Payment</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5 cursor-pointer" onClick={() => setViewOrder(o)}>
                      <TableCell className="text-sm font-medium text-amber-100">{o.orderNumber}</TableCell>
                      <TableCell>
                        <p className="text-sm text-amber-100">{o.firstName} {o.lastName}</p>
                        <p className="text-xs text-amber-200/40">{o.email}</p>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(o.total)}</TableCell>
                      <TableCell><Badge className={statusColor(o.status)}>{o.status}</Badge></TableCell>
                      <TableCell><Badge className={statusColor(o.paymentStatus)}>{o.paymentStatus}</Badge></TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(o.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setViewOrder(o)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No orders found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
                <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-amber-100">Order {viewOrder?.orderNumber}</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={lblCls}>Customer</p><p className="text-sm text-amber-100">{viewOrder.firstName} {viewOrder.lastName}</p></div>
                <div><p className={lblCls}>Email</p><p className="text-sm text-amber-100">{viewOrder.email}</p></div>
                <div><p className={lblCls}>Status</p><Badge className={statusColor(viewOrder.status)}>{viewOrder.status}</Badge></div>
                <div><p className={lblCls}>Payment</p><Badge className={statusColor(viewOrder.paymentStatus)}>{viewOrder.paymentStatus}</Badge></div>
                <div><p className={lblCls}>Subtotal</p><p className="text-sm text-amber-100">{fmt(viewOrder.subtotal)}</p></div>
                <div><p className={lblCls}>Shipping</p><p className="text-sm text-amber-100">{fmt(viewOrder.shipping)}</p></div>
                <div><p className={lblCls}>Tax</p><p className="text-sm text-amber-100">{fmt(viewOrder.tax)}</p></div>
                <div><p className={lblCls}>Total</p><p className="text-sm font-bold text-amber-100">{fmt(viewOrder.total)}</p></div>
              </div>
              {viewOrder.trackingNumber && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <div><p className={lblCls}>Tracking Number</p><p className="text-sm text-amber-100">{viewOrder.trackingNumber}</p></div>
                  {viewOrder.trackingUrl && <div><p className={lblCls}>Tracking URL</p><a href={viewOrder.trackingUrl} target="_blank" rel="noopener" className="text-sm text-amber-400 underline">{viewOrder.trackingUrl}</a></div>}
                </div>
              )}
              <Separator className="bg-amber-900/20" />
              <div>
                <p className={`mb-2 ${lblCls}`}>Address</p>
                <p className="text-sm text-amber-100">{viewOrder.address}, {viewOrder.city}, {viewOrder.state} {viewOrder.zipCode}</p>
              </div>
              {viewOrder.items?.length > 0 && (
                <div>
                  <p className={`mb-2 ${lblCls}`}>Items</p>
                  {(viewOrder.items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 border-b border-amber-900/10 py-2">
                      {item.image && <img src={item.image} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div className="flex-1">
                        <p className="text-sm text-amber-100">{item.name}</p>
                        <p className="text-xs text-amber-200/40">Qty: {item.quantity} × {fmt(item.price)}</p>
                      </div>
                      <p className="text-sm text-amber-100">{fmt(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="bg-amber-900/20" />
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {viewOrder.status !== 'delivered' && viewOrder.status !== 'cancelled' && (
                  <Select onValueChange={(v) => { statusMut.mutate({ id: viewOrder.id, status: v }) }} disabled={statusMut.isPending}>
                    <SelectTrigger className={`${selCls} w-44`}>
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent className={selContentCls}>
                      {viewOrder.status === 'pending' && <SelectItem value="processing">→ Processing</SelectItem>}
                      {(viewOrder.status === 'pending' || viewOrder.status === 'processing') && <SelectItem value="shipped">→ Shipped</SelectItem>}
                      {(viewOrder.status === 'pending' || viewOrder.status === 'processing' || viewOrder.status === 'shipped') && <SelectItem value="delivered">→ Delivered</SelectItem>}
                      {viewOrder.status !== 'cancelled' && <SelectItem value="cancelled">→ Cancelled</SelectItem>}
                    </SelectContent>
                  </Select>
                )}
                <Button className={btnOutline} onClick={() => { setTrackingForm({ trackingNumber: viewOrder.trackingNumber || '', trackingUrl: viewOrder.trackingUrl || '' }); setShowTracking(viewOrder) }}>
                  <TruckIcon className="mr-1 h-4 w-4" /> Add Tracking
                </Button>
                {viewOrder.paymentStatus !== 'refunded' && (
                  <Button className="border-red-900/40 text-red-400 hover:bg-red-900/20" onClick={() => { setRefundForm({ amount: String(viewOrder.total), reason: '' }); setShowRefund(viewOrder) }}>
                    <DollarSign className="mr-1 h-4 w-4" /> Process Refund
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={!!showTracking} onOpenChange={() => setShowTracking(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Add Tracking — {showTracking?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className={lblCls}>Tracking Number</Label><Input className={`${inputCls} mt-1`} value={trackingForm.trackingNumber} onChange={e => setTrackingForm(f => ({ ...f, trackingNumber: e.target.value }))} placeholder="Enter tracking number" /></div>
            <div><Label className={lblCls}>Tracking URL</Label><Input className={`${inputCls} mt-1`} value={trackingForm.trackingUrl} onChange={e => setTrackingForm(f => ({ ...f, trackingUrl: e.target.value }))} placeholder="https://..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className={btnOutline} onClick={() => setShowTracking(null)}>Cancel</Button>
              <Button className={btnPrimary} onClick={() => trackingMut.mutate({ id: showTracking.id, ...trackingForm })} disabled={trackingMut.isPending}>
                {trackingMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!showRefund} onOpenChange={() => setShowRefund(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Process Refund — {showRefund?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-amber-200/60">Order total: <strong className="text-amber-100">{fmt(showRefund?.total || 0)}</strong></p>
            <div><Label className={lblCls}>Refund Amount</Label><Input type="number" className={`${inputCls} mt-1`} value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><Label className={lblCls}>Reason</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for refund" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className={btnOutline} onClick={() => setShowRefund(null)}>Cancel</Button>
              <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => refundMut.mutate({ id: showRefund.id, ...refundForm })} disabled={refundMut.isPending}>
                {refundMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   5. INVOICES TAB
   ════════════════════════════════════════════ */
function InvoicesTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, statusFilter],
    queryFn: () => apiFetch(`/api/invoices?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`, undefined, token),
  })

  const invoices = data?.invoices || []
  const pagination = data?.pagination

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); onMutate() },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> Create Invoice</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Invoice #</TableHead>
                  <TableHead className="text-amber-200/50">Vendor</TableHead>
                  <TableHead className="text-amber-200/50">Amount</TableHead>
                  <TableHead className="text-amber-200/50">Tax</TableHead>
                  <TableHead className="text-amber-200/50">Total</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Due Date</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm font-medium text-amber-100">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm text-amber-200/60">{inv.vendor?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-amber-100">{fmt(inv.amount)}</TableCell>
                    <TableCell className="text-sm text-amber-200/60">{fmt(inv.tax)}</TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{fmt(inv.total)}</TableCell>
                    <TableCell><Badge className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                    <TableCell className="text-xs text-amber-200/60">{inv.dueDate ? fmtDate(inv.dueDate) : '—'}</TableCell>
                    <TableCell>
                      {inv.status === 'draft' && (
                        <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => updateStatusMut.mutate({ id: inv.id, status: 'sent' })}>Send</Button>
                      )}
                      {inv.status === 'sent' && (
                        <Button size="sm" variant="ghost" className="h-7 text-green-400/40 hover:text-green-400" onClick={() => updateStatusMut.mutate({ id: inv.id, status: 'paid' })}>Mark Paid</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-amber-200/40">No invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Create Invoice</DialogTitle></DialogHeader>
          <InvoiceForm token={token} onClose={() => setShowCreate(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['invoices'] }); onMutate(); setShowCreate(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvoiceForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const { data: vendorsData } = useQuery({ queryKey: ['vendors'], queryFn: () => apiFetch('/api/vendors', undefined, token) })
  const vendors = vendorsData?.vendors || []
  const [form, setForm] = useState({ vendorId: '', amount: '', tax: '0', dueDate: '', notes: '', status: 'draft' })
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: '1', unitPrice: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, j) => j !== i))
  const updateItem = (i: number, field: string, value: string) => setItems(prev => prev.map((item, j) => j === i ? { ...item, [field]: value } : item))

  const handleSubmit = async () => {
    if (!form.amount) { setError('Amount is required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          tax: parseFloat(form.tax),
          vendorId: form.vendorId || null,
          items: items.filter(i => i.description && i.unitPrice).map(i => ({
            description: i.description, quantity: parseInt(i.quantity) || 1, unitPrice: parseFloat(i.unitPrice),
          })),
        }),
      }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Amount *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
        <div><Label className={lblCls}>Tax</Label><Input type="number" className={`${inputCls} mt-1`} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
        <div><Label className={lblCls}>Due Date</Label><Input type="date" className={`${inputCls} mt-1`} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
      </div>
      <div><Label className={lblCls}>Notes</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
      <Separator className="bg-amber-900/20" />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className={lblCls}>Line Items</Label>
          <Button size="sm" variant="ghost" className="text-amber-200/40 hover:text-amber-400" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Add</Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <Input className={`${inputCls} flex-1`} placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
            <Input type="number" className={`${inputCls} w-20`} placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
            <Input type="number" className={`${inputCls} w-24`} placeholder="Price" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
            {items.length > 1 && <Button size="sm" variant="ghost" className="text-red-400/40 hover:text-red-400" onClick={() => removeItem(i)}><X className="h-4 w-4" /></Button>}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   6. ACCOUNTING TAB
   ════════════════════════════════════════════ */
function AccountingTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['accounting', page, typeFilter, catFilter],
    queryFn: () => apiFetch(`/api/accounting?page=${page}&limit=20${typeFilter ? `&type=${typeFilter}` : ''}${catFilter ? `&category=${catFilter}` : ''}`, undefined, token),
  })

  const entries = data?.entries || []
  const summary = data?.summary
  const pagination = data?.pagination

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Total Credits</p>
              <p className="text-lg font-bold text-green-400">{fmt(summary.totalCredits)}</p>
            </CardContent>
          </Card>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Total Debits</p>
              <p className="text-lg font-bold text-red-400">{fmt(summary.totalDebits)}</p>
            </CardContent>
          </Card>
          <Card className={cardCls}>
            <CardContent className="p-4">
              <p className={lblCls}>Balance</p>
              <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(summary.balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-36`}><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={v => { setCatFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-36`}><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> New Entry</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Entry #</TableHead>
                  <TableHead className="text-amber-200/50">Date</TableHead>
                  <TableHead className="text-amber-200/50">Type</TableHead>
                  <TableHead className="text-amber-200/50">Category</TableHead>
                  <TableHead className="text-amber-200/50">Amount</TableHead>
                  <TableHead className="text-amber-200/50">Balance</TableHead>
                  <TableHead className="text-amber-200/50">Description</TableHead>
                  <TableHead className="text-amber-200/50">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e: any) => (
                  <TableRow key={e.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm font-medium text-amber-100">{e.entryNumber}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{fmtDate(e.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {e.type === 'credit' ? <ArrowUpRight className="h-3 w-3 text-green-400" /> : <ArrowDownRight className="h-3 w-3 text-red-400" />}
                        <span className={`text-sm ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{e.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-amber-200/60 capitalize">{e.category}</TableCell>
                    <TableCell className={`text-sm font-medium ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{fmt(e.amount)}</TableCell>
                    <TableCell className={`text-sm font-medium ${e.runningBalance >= 0 ? 'text-amber-100' : 'text-red-400'}`}>{fmt(e.runningBalance)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-amber-200/40">{e.description}</TableCell>
                    <TableCell className="text-xs text-amber-200/40">{e.reference || '—'}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-amber-200/40">No entries</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">New Account Entry</DialogTitle></DialogHeader>
          <AccountEntryForm token={token} onClose={() => setShowCreate(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['accounting'] }); onMutate(); setShowCreate(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountEntryForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'credit', category: 'sales', amount: '', description: '', reference: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.type || !form.category || !form.amount || !form.description) { setError('All fields required except reference'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/accounting', { method: 'POST', body: JSON.stringify(form) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={lblCls}>Type *</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="tax">Tax</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className={lblCls}>Amount *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
      <div><Label className={lblCls}>Description *</Label><Input className={`${inputCls} mt-1`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div><Label className={lblCls}>Reference</Label><Input className={`${inputCls} mt-1`} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create Entry</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   7. VENDORS TAB
   ════════════════════════════════════════════ */
function VendorsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editVendor, setEditVendor] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search],
    queryFn: () => apiFetch(`/api/vendors?search=${search}&limit=50`, undefined, token),
  })

  const vendors = data?.vendors || []

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/vendors/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); onMutate(); setShowDelete(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button className={btnPrimary} onClick={() => { setEditVendor(null); setShowForm(true) }}><Plus className="mr-1 h-4 w-4" /> Add Vendor</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Vendor</TableHead>
                  <TableHead className="text-amber-200/50">Contact</TableHead>
                  <TableHead className="text-amber-200/50">GST Number</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Products</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v: any) => (
                  <TableRow key={v.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell>
                      <p className="text-sm font-medium text-amber-100">{v.name}</p>
                      <p className="text-xs text-amber-200/40">{v.email || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-amber-200/60">{v.contactName || '—'}</p>
                      <p className="text-xs text-amber-200/40">{v.phone || '—'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-amber-200/60">{v.gstNumber || '—'}</TableCell>
                    <TableCell><Badge className={statusColor(v.isActive ? 'active' : 'inactive')}>{v.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-sm text-amber-200/60">{v._count?.products || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditVendor(v); setShowForm(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(v)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No vendors</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">{editVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <VendorForm token={token} vendor={editVendor} onClose={() => { setShowForm(false); setEditVendor(null) }} onSaved={() => { qc.invalidateQueries({ queryKey: ['vendors'] }); onMutate(); setShowForm(false); setEditVendor(null) }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Delete Vendor</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-200/60">Delete <strong className="text-amber-100">{showDelete?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>{deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VendorForm({ token, vendor, onClose, onSaved }: { token: string | null; vendor: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '', gstNumber: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (vendor) setForm({ name: vendor.name || '', contactName: vendor.contactName || '', email: vendor.email || '', phone: vendor.phone || '', address: vendor.address || '', gstNumber: vendor.gstNumber || '', isActive: vendor.isActive ?? true })
  }, [vendor])

  const handleSubmit = async () => {
    if (!form.name) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      if (vendor) {
        await apiFetch(`/api/vendors/${vendor.id}`, { method: 'PUT', body: JSON.stringify(form) }, token)
      } else {
        await apiFetch('/api/vendors', { method: 'POST', body: JSON.stringify(form) }, token)
      }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Royal Jewellers Pvt. Ltd." /></div>
        <div><Label className={lblCls}>Contact Name</Label><Input className={`${inputCls} mt-1`} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="e.g., Rajesh Kumar" /></div>
        <div><Label className={lblCls}>Email</Label><Input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g., contact@royaljewellers.com" /></div>
        <div><Label className={lblCls}>Phone</Label><Input className={`${inputCls} mt-1`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g., +91-9876543210" /></div>
      </div>
      <div><Label className={lblCls}>Address</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g., 123 Business Park, Mumbai, MH 400001" /></div>
      <div><Label className={lblCls}>GST Number</Label><Input className={`${inputCls} mt-1`} value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} placeholder="e.g., 27AABCU9603R1ZM" /></div>
      <div className="flex items-center gap-2">
        <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
        <Label className={lblCls}>Active</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{vendor ? 'Update' : 'Create'}</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   8. USERS & PERMS TAB
   ════════════════════════════════════════════ */
function UsersPermsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showPerms, setShowPerms] = useState<any>(null)
  const [showAddUser, setShowAddUser] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => apiFetch(`/api/admin/users?search=${search}&page=${page}&limit=20`, undefined, token),
  })

  const users = data?.users || []
  const pagination = data?.pagination

  const approveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ approvalStatus: status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() },
  })

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiFetch(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Button className={btnPrimary} onClick={() => setShowAddUser(true)}><Plus className="mr-1 h-4 w-4" /> Add User</Button>
      </div>

      <Card className={cardCls}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">User</TableHead>
                  <TableHead className="text-amber-200/50">Role</TableHead>
                  <TableHead className="text-amber-200/50">Approval</TableHead>
                  <TableHead className="text-amber-200/50">Active</TableHead>
                  <TableHead className="text-amber-200/50">Joined</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell>
                      <p className="text-sm font-medium text-amber-100">{u.name}</p>
                      <p className="text-xs text-amber-200/40">{u.email}</p>
                    </TableCell>
                    <TableCell><Badge className={roleColor(u.role)}>{u.role}</Badge></TableCell>
                    <TableCell><Badge className={statusColor(u.approvalStatus)}>{u.approvalStatus}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={u.isActive} onCheckedChange={v => toggleActiveMut.mutate({ id: u.id, isActive: v })} />
                    </TableCell>
                    <TableCell className="text-xs text-amber-200/60">{fmtDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {u.approvalStatus === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-green-400/40 hover:text-green-400" onClick={() => approveMut.mutate({ id: u.id, status: 'approved' })}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 text-red-400/40 hover:text-red-400" onClick={() => approveMut.mutate({ id: u.id, status: 'rejected' })}><X className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => setShowPerms(u)}>
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No users</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
              <p className="text-xs text-amber-200/40">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" className={btnOutline} disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission Matrix Dialog */}
      <Dialog open={!!showPerms} onOpenChange={() => setShowPerms(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Permissions — {showPerms?.name}</DialogTitle></DialogHeader>
          {showPerms && <PermissionMatrix token={token} user={showPerms} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate() }} />}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Add User</DialogTitle></DialogHeader>
          <AddUserForm token={token} onClose={() => setShowAddUser(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onMutate(); setShowAddUser(false) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PermissionMatrix({ token, user, onSaved }: { token: string | null; user: any; onSaved: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', user.id],
    queryFn: () => apiFetch(`/api/admin/permissions?userId=${user.id}`, undefined, token),
  })

  const modules = ['products', 'orders', 'inventory', 'invoices', 'accounting', 'vendors', 'users', 'content', 'offers']
  const actions = ['read', 'write', 'edit', 'delete']
  const [perms, setPerms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.permissions) setPerms(data.permissions)
  }, [data])

  const togglePerm = (module: string, action: string) => {
    const key = `${module}.${action}`
    setPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/admin/permissions', { method: 'POST', body: JSON.stringify({ userId: user.id, permissions: perms }) }, token)
      onSaved()
    } catch (e: any) { console.error(e) } finally { setSaving(false) }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-900/20 hover:bg-transparent">
              <TableHead className="text-amber-200/50">Module</TableHead>
              {actions.map(a => <TableHead key={a} className="text-center text-amber-200/50 capitalize">{a}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map(mod => (
              <TableRow key={mod} className="border-amber-900/10 hover:bg-amber-900/5">
                <TableCell className="capitalize text-amber-100">{mod}</TableCell>
                {actions.map(act => (
                  <TableCell key={act} className="text-center">
                    <Checkbox
                      checked={perms.includes(`${mod}.${act}`)}
                      onCheckedChange={() => togglePerm(mod, act)}
                      className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button className={btnPrimary} onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save Permissions</Button>
      </div>
    </div>
  )
}

function AddUserForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.email || !form.name || !form.password) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ ...form, approvalStatus: 'approved', isActive: true }) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., John Smith" /></div>
      <div><Label className={lblCls}>Email *</Label><Input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g., admin@3boxes.com" /></div>
      <div><Label className={lblCls}>Password *</Label><Input type="password" className={`${inputCls} mt-1`} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" /></div>
      <div>
        <Label className={lblCls}>Role</Label>
        <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   9. CONTENT TAB (Wiki Documents)
   ════════════════════════════════════════════ */
function ContentTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-docs'],
    queryFn: () => apiFetch('/api/wiki', undefined, token),
  })

  const docs = (data as any)?.documents || (data as any)?.docs || []

  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.title || !form.content) { setError('Title and content required'); return }
    setSaving(true); setError('')
    try {
      if (editDoc) {
        await apiFetch(`/api/wiki/${editDoc.id}`, { method: 'PUT', body: JSON.stringify(form) }, token)
      } else {
        await apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(form) }, token)
      }
      qc.invalidateQueries({ queryKey: ['wiki-docs'] })
      setShowForm(false); setEditDoc(null); setForm({ title: '', content: '', category: '' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditDoc(null); setForm({ title: '', content: '', category: '' }); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> New Document
        </Button>
      </div>

      {showForm && (
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-100">{editDoc ? 'Edit Document' : 'New Document'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
            <div><Label className={lblCls}>Title *</Label><Input className={`${inputCls} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className={lblCls}>Category</Label><Input className={`${inputCls} mt-1`} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><Label className={lblCls}>Content *</Label><Textarea className={`${inputCls} mt-1`} rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className={btnOutline} onClick={() => { setShowForm(false); setEditDoc(null) }}>Cancel</Button>
              <Button className={btnPrimary} onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={cardCls}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">Title</TableHead>
                <TableHead className="text-amber-200/50">Category</TableHead>
                <TableHead className="text-amber-200/50">Updated</TableHead>
                <TableHead className="text-amber-200/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell className="text-sm font-medium text-amber-100">{d.title}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{d.category || '—'}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{fmtDate(d.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditDoc(d); setForm({ title: d.title, content: d.content, category: d.category || '' }); setShowForm(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-400/40 hover:text-red-400" onClick={async () => { try { await apiFetch(`/api/wiki/${d.id}`, { method: 'DELETE' }, token); qc.invalidateQueries({ queryKey: ['wiki-docs'] }) } catch {} }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-amber-200/40">No documents yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   10. SHARE DOCS TAB
   ════════════════════════════════════════════ */
function ShareDocsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const { data: usersData } = useQuery({ queryKey: ['admin-users-agents'], queryFn: () => apiFetch('/api/admin/users?role=agent&limit=100', undefined, token) })
  const agents = (usersData?.users || []).filter((u: any) => u.role === 'agent')

  const { data: sharesData, isLoading: sharesLoading } = useQuery({
    queryKey: ['admin-share-docs'],
    queryFn: () => apiFetch('/api/admin/share-doc', undefined, token),
  })
  const shares = sharesData?.shares || []

  const [form, setForm] = useState({ agentId: '', docId: '', docTitle: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (!form.agentId || !form.docId) { setError('Agent and document ID are required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/admin/share-doc', {
        method: 'POST',
        body: JSON.stringify({ docId: form.docId, agentId: form.agentId, canDownload: true, canShare: false, message: form.docTitle || '' }),
      }, token)
      qc.invalidateQueries({ queryKey: ['admin-share-docs'] })
      setForm({ agentId: '', docId: '', docTitle: '' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Share Document with Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className={lblCls}>Agent *</Label>
              <Select value={form.agentId} onValueChange={v => setForm(f => ({ ...f, agentId: v }))}>
                <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent className={selContentCls}>
                  {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className={lblCls}>Document ID *</Label><Input className={`${inputCls} mt-1`} value={form.docId} onChange={e => setForm(f => ({ ...f, docId: e.target.value }))} /></div>
            <div><Label className={lblCls}>Document Title</Label><Input className={`${inputCls} mt-1`} value={form.docTitle} onChange={e => setForm(f => ({ ...f, docTitle: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end">
            <Button className={btnPrimary} onClick={handleShare} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Share</Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Shared Documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">Document</TableHead>
                <TableHead className="text-amber-200/50">Agent</TableHead>
                <TableHead className="text-amber-200/50">Shared On</TableHead>
                <TableHead className="text-amber-200/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shares.map((s: any) => (
                <TableRow key={s.id} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell>
                    <p className="text-sm text-amber-100">{s.document?.title || s.docId}</p>
                    <p className="text-xs text-amber-200/40">{s.docId}</p>
                  </TableCell>
                  <TableCell className="text-sm text-amber-200/60">{s.agent?.name || s.agentId}</TableCell>
                  <TableCell className="text-xs text-amber-200/60">{fmtDate(s.createdAt)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-amber-200/40">{s.canDownload ? '⬇ Download' : ''} {s.canShare ? '↗ Share' : ''}</span>
                  </TableCell>
                </TableRow>
              ))}
              {shares.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-amber-200/40">No shared documents</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   11. OFFERS TAB
   ════════════════════════════════════════════ */
function OffersTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editOffer, setEditOffer] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offers'],
    queryFn: () => apiFetch('/api/offers?limit=50', undefined, token),
  })

  const offers = data?.offers || []

  const [form, setForm] = useState({
    title: '', description: '', code: '', type: 'percentage', value: '',
    minOrder: '', maxDiscount: '', validFrom: '', validTo: '', isActive: true, usageLimit: '',
  })
  const [error, setError] = useState('')

  const openEdit = (o: any) => {
    setEditOffer(o)
    setForm({
      title: o.title || '', description: o.description || '',
      code: o.code || '', type: o.type || 'percentage',
      value: String(o.value || ''), minOrder: String(o.minOrder || ''),
      maxDiscount: String(o.maxDiscount || ''),
      validFrom: o.validFrom ? new Date(o.validFrom).toISOString().split('T')[0] : '',
      validTo: o.validTo ? new Date(o.validTo).toISOString().split('T')[0] : '',
      isActive: o.isActive ?? true, usageLimit: String(o.usageLimit || ''),
    })
    setShowForm(true)
  }

  const createMut = useMutation({
    mutationFn: (body: any) => apiFetch('/api/offers', { method: 'POST', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); onMutate(); setShowForm(false); setEditOffer(null) },
  })

  const updateMut = useMutation({
    mutationFn: (body: any) => apiFetch('/api/offers', { method: 'PUT', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); onMutate(); setShowForm(false); setEditOffer(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch('/api/offers', { method: 'DELETE', body: JSON.stringify({ id }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); onMutate(); setShowDelete(null) },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiFetch('/api/offers', { method: 'PUT', body: JSON.stringify({ id, isActive }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-offers'] }); onMutate() },
  })

  const handleSave = () => {
    if (!form.title || !form.code || !form.value) { setError('Title, code, and value are required'); return }
    setError('')
    const offerData = {
      ...form,
      value: parseFloat(form.value),
      minOrder: form.minOrder ? parseFloat(form.minOrder) : null,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : new Date().toISOString(),
      validTo: form.validTo ? new Date(form.validTo).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
    }

    if (editOffer) {
      updateMut.mutate({ id: editOffer.id, ...offerData }, { onError: (e: any) => setError(e.message) })
    } else {
      createMut.mutate(offerData, { onError: (e: any) => setError(e.message) })
    }
  }

  const resetForm = () => {
    setForm({ title: '', description: '', code: '', type: 'percentage', value: '', minOrder: '', maxDiscount: '', validFrom: '', validTo: '', isActive: true, usageLimit: '' })
    setEditOffer(null)
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button className={btnPrimary} onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Create Offer
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) resetForm() }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">{editOffer ? 'Edit Offer' : 'Create Offer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={lblCls}>Title *</Label><Input className={`${inputCls} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div><Label className={lblCls}>Code *</Label><Input className={`${inputCls} mt-1 uppercase`} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
              <div>
                <Label className={lblCls}>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
                  <SelectContent className={selContentCls}>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className={lblCls}>Value *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div><Label className={lblCls}>Min Order</Label><Input type="number" className={`${inputCls} mt-1`} value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} /></div>
              <div><Label className={lblCls}>Max Discount</Label><Input type="number" className={`${inputCls} mt-1`} value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} /></div>
              <div><Label className={lblCls}>Valid From</Label><Input type="date" className={`${inputCls} mt-1`} value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))} /></div>
              <div><Label className={lblCls}>Valid To</Label><Input type="date" className={`${inputCls} mt-1`} value={form.validTo} onChange={e => setForm(f => ({ ...f, validTo: e.target.value }))} /></div>
              <div><Label className={lblCls}>Usage Limit</Label><Input type="number" className={`${inputCls} mt-1`} value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} /></div>
            </div>
            <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label className={lblCls}>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className={btnOutline} onClick={() => { setShowForm(false); resetForm() }}>Cancel</Button>
              <Button className={btnPrimary} onClick={handleSave} disabled={isPending}>{isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{editOffer ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Delete Offer</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to delete <strong className="text-amber-100">{showDelete?.title}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Offer</TableHead>
                  <TableHead className="text-amber-200/50">Code</TableHead>
                  <TableHead className="text-amber-200/50">Type</TableHead>
                  <TableHead className="text-amber-200/50">Value</TableHead>
                  <TableHead className="text-amber-200/50">Used</TableHead>
                  <TableHead className="text-amber-200/50">Status</TableHead>
                  <TableHead className="text-amber-200/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o: any) => (
                  <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell>
                      <p className="text-sm font-medium text-amber-100">{o.title}</p>
                      <p className="text-xs text-amber-200/40">{o.description}</p>
                    </TableCell>
                    <TableCell><code className="rounded bg-amber-600/10 px-2 py-0.5 text-xs text-amber-400">{o.code}</code></TableCell>
                    <TableCell className="text-sm text-amber-200/60 capitalize">{o.type}</TableCell>
                    <TableCell className="text-sm font-medium text-amber-100">{o.type === 'percentage' ? `${o.value}%` : fmt(o.value)}</TableCell>
                    <TableCell className="text-sm text-amber-200/60">{o.usedCount || 0}{o.usageLimit ? ` / ${o.usageLimit}` : ''}</TableCell>
                    <TableCell>
                      <Switch checked={o.isActive} onCheckedChange={() => toggleMut.mutate({ id: o.id, isActive: !o.isActive })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => openEdit(o)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(o)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {offers.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No offers yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   11b. CATEGORIES TAB
   ════════════════════════════════════════════ */
function CategoriesTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch('/api/admin/categories', undefined, token),
  })

  const categories = data?.categories || []

  const [form, setForm] = useState({ name: '', description: '', image: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editCategory) {
      setForm({ name: editCategory.name || '', description: editCategory.description || '', image: editCategory.image || '' })
    }
  }, [editCategory])

  const createMut = useMutation({
    mutationFn: (body: any) => apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); onMutate(); setShowForm(false); setEditCategory(null) },
  })

  const updateMut = useMutation({
    mutationFn: (body: any) => apiFetch('/api/admin/categories', { method: 'PUT', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); onMutate(); setShowForm(false); setEditCategory(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch('/api/admin/categories', { method: 'DELETE', body: JSON.stringify({ id }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); onMutate(); setShowDelete(null) },
  })

  const handleSave = async () => {
    if (!form.name) { setError('Category name is required'); return }
    setSaving(true); setError('')
    try {
      if (editCategory) {
        updateMut.mutate({ id: editCategory.id, ...form })
      } else {
        createMut.mutate(form)
      }
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const resetForm = () => { setForm({ name: '', description: '', image: '' }); setEditCategory(null) }
  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button className={btnPrimary} onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) resetForm() }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">{editCategory ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
            <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Gold Necklaces" /></div>
            <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Handcrafted gold necklaces for special occasions" /></div>
            <div><Label className={lblCls}>Image URL</Label><Input className={`${inputCls} mt-1`} value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="e.g., https://example.com/category-image.jpg" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className={btnOutline} onClick={() => { setShowForm(false); resetForm() }}>Cancel</Button>
              <Button className={btnPrimary} onClick={handleSave} disabled={isPending}>{isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{editCategory ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Delete Category</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to delete <strong className="text-amber-100">{showDelete?.name}</strong>?</p>
          {showDelete?.productCount > 0 && (
            <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">Cannot delete: {showDelete.productCount} product(s) in this category.</div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending || showDelete?.productCount > 0}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c: any) => (
            <Card key={c.id} className={cardCls}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {c.image ? <img src={c.image} alt={c.name} className="h-10 w-10 rounded-lg object-cover" /> : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10">
                        <FolderOpen className="h-5 w-5 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-amber-100">{c.name}</p>
                      <p className="text-xs text-amber-200/40">{c.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditCategory(c); setShowForm(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {c.description && <p className="mt-2 text-xs text-amber-200/50 line-clamp-2">{c.description}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">{c.productCount || 0} products</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-8 text-center text-amber-200/40">No categories found</div>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   13b. REPORTS TAB
   ════════════════════════════════════════════ */
function ReportsTab({ token }: { token: string | null }) {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders-report'],
    queryFn: () => apiFetch('/api/admin/orders?limit=200', undefined, token),
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-report'],
    queryFn: () => apiFetch('/api/admin/products?limit=200', undefined, token),
  })

  const orders: any[] = ordersData?.orders || []
  const products: any[] = productsData?.products || []

  // ── Revenue Summary ──
  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const refundedAmount = orders
    .filter((o: any) => o.paymentStatus === 'refunded')
    .reduce((s: number, o: any) => s + (o.refundAmount || o.total || 0), 0)

  // ── Orders by Status Breakdown ──
  const statusCounts: Record<string, number> = {}
  orders.forEach((o: any) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1 })

  // ── Orders per Day — Last 7 Days (div-based bar chart) ──
  const last7Days: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    const count = orders.filter((o: any) => {
      const od = new Date(o.createdAt)
      return od >= dayStart && od < dayEnd
    }).length
    last7Days.push({ date: label, count })
  }
  const maxOrdersPerDay = Math.max(...last7Days.map(d => d.count), 1)

  // ── Top 10 Products by Popularity ──
  // Build a map of product sales from order items
  const productSales: Record<string, { name: string; sold: number; rating: number; stock: number }> = {}
  orders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const key = item.productId || item.name
      if (!productSales[key]) productSales[key] = { name: item.name || key, sold: 0, rating: 0, stock: 0 }
      productSales[key].sold += item.quantity || 0
    })
  })
  // Merge product info (rating, stock)
  products.forEach((p: any) => {
    if (productSales[p.id]) {
      productSales[p.id].rating = p.rating || 0
      productSales[p.id].stock = p.stock || 0
    } else {
      // Products with no sales but with rating (show as "0 sold" with rating)
      productSales[p.id] = { name: p.name, sold: 0, rating: p.rating || 0, stock: p.stock || 0 }
    }
  })
  // Sort by sold (popularity), tiebreak by rating
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.sold - a.sold || b.rating - a.rating)
    .slice(0, 10)

  // ── CSV Export ──
  const exportCSV = () => {
    const rows = [['Date', 'Order #', 'Customer', 'Status', 'Total', 'Payment Status']]
    orders.forEach((o: any) => {
      rows.push([
        new Date(o.createdAt).toLocaleDateString(),
        o.orderNumber,
        `${o.firstName} ${o.lastName}`,
        o.status,
        String(o.total),
        o.paymentStatus,
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'orders-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (ordersLoading || productsLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  }

  const summaryCards = [
    { title: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-600/10' },
    { title: 'Avg Order Value', value: fmt(avgOrderValue), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { title: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-600/10' },
    { title: 'Refunded Amount', value: fmt(refundedAmount), icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-600/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex items-center gap-3">
        <Button className={btnOutline} onClick={exportCSV}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className={cardCls}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className={lblCls}>{c.title}</p>
                    <p className={`text-lg font-bold ${c.title === 'Refunded Amount' ? 'text-red-400' : 'text-amber-100'}`}>{c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Orders by Status — Colored Badges */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <Badge className={statusColor(status)}>{status}</Badge>
                <span className="text-sm font-medium text-amber-100">{count}</span>
              </div>
            ))}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-amber-200/40">No orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders per Day — Last 7 Days (div-based bar chart) */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-400" /> Orders per Day (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3" style={{ height: 200 }}>
            {last7Days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-amber-200/60">{d.count}</span>
                <div
                  className="w-full rounded-t-md bg-amber-600/80 transition-all duration-300 hover:bg-amber-500"
                  style={{ height: `${Math.max((d.count / maxOrdersPerDay) * 100, d.count > 0 ? 8 : 2)}%` }}
                />
                <span className="mt-1 text-[10px] text-amber-200/40 leading-tight">{d.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Products by Popularity */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Top 10 Products by Popularity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-amber-900/20 hover:bg-transparent">
                <TableHead className="text-amber-200/50">#</TableHead>
                <TableHead className="text-amber-200/50">Product</TableHead>
                <TableHead className="text-amber-200/50">Qty Sold</TableHead>
                <TableHead className="text-amber-200/50">Rating</TableHead>
                <TableHead className="text-amber-200/50">Stock Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((p: any, i: number) => (
                <TableRow key={i} className="border-amber-900/10 hover:bg-amber-900/5">
                  <TableCell className="text-xs text-amber-200/40">{i + 1}</TableCell>
                  <TableCell className="text-sm text-amber-100">{p.name}</TableCell>
                  <TableCell className="text-sm text-amber-200/60">{p.sold}</TableCell>
                  <TableCell className="text-sm text-amber-200/60">{p.rating > 0 ? `⭐ ${p.rating.toFixed(1)}` : '—'}</TableCell>
                  <TableCell className="text-sm text-amber-200/60">{p.stock}</TableCell>
                </TableRow>
              ))}
              {topProducts.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-amber-200/40">No product data available</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   12. IMPORT TAB
   ════════════════════════════════════════════ */
function ImportTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [platform, setPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [scrapedProduct, setScrapedProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [error, setError] = useState('')

  const { data: categoriesData } = useQuery({ queryKey: ['categories'], queryFn: () => apiFetch('/api/categories', undefined, token) })
  const { data: vendorsData } = useQuery({ queryKey: ['vendors-import'], queryFn: () => apiFetch('/api/vendors', undefined, token) })
  const categories = categoriesData?.categories || []
  const vendors = vendorsData?.vendors || []

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/search', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery, platform: platform || undefined }),
      }, token)
      setResults(data.results || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleScrapeUrl = async () => {
    if (!urlInput.trim()) return
    setScraping(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput, platform: platform || undefined }),
      }, token)
      setScrapedProduct(data.product)
      setResults([])
    } catch (e: any) { setError(e.message) } finally { setScraping(false) }
  }

  const handleResultClick = async (result: any) => {
    setScraping(true); setError(''); setScrapedProduct(null)
    try {
      const data = await apiFetch('/api/product-import/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: result.url, platform: platform || undefined }),
      }, token)
      setScrapedProduct(data.product)
    } catch (e: any) { setError(e.message) } finally { setScraping(false) }
  }

  return (
    <div className="space-y-6">
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-amber-100">Import Products from External Platforms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

          {/* Platform Selector */}
          <div>
            <Label className={lblCls}>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className={`${selCls} mt-1 w-48`}><SelectValue placeholder="All Platforms" /></SelectTrigger>
              <SelectContent className={selContentCls}>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="myntra">Myntra</SelectItem>
                <SelectItem value="nykaa">Nykaa</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Bar */}
          <div>
            <Label className={lblCls}>Search Products</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
                <Input
                  className={`${inputCls} pl-9`}
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button className={btnPrimary} onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Separator className="bg-amber-900/20" />

          {/* URL Import */}
          <div>
            <Label className={lblCls}>Import by URL</Label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
                <Input
                  className={`${inputCls} pl-9`}
                  placeholder="https://www.myntra.com/..."
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScrapeUrl()}
                />
              </div>
              <Button className={btnPrimary} onClick={handleScrapeUrl} disabled={scraping}>
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Grid */}
      {results.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-amber-100">Search Results</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`${cardCls} cursor-pointer transition-colors hover:border-amber-600/40`} onClick={() => handleResultClick(r)}>
                  <CardContent className="p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="line-clamp-2 text-sm text-amber-100">{r.title || r.snippet?.slice(0, 80)}</p>
                      {r.platform && <Badge className={`ml-2 shrink-0 ${r.platform === 'myntra' ? 'bg-red-600/20 text-red-400' : r.platform === 'nykaa' ? 'bg-pink-600/20 text-pink-400' : 'bg-orange-600/20 text-orange-400'}`}>{r.platform}</Badge>}
                    </div>
                    {r.snippet && <p className="line-clamp-2 text-xs text-amber-200/40">{r.snippet}</p>}
                    {r.url && <p className="mt-1 truncate text-xs text-amber-600/60">{r.url}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Scraped Product Preview */}
      {scrapedProduct && (
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-amber-100">Product Preview</CardTitle>
              <Button className={btnPrimary} size="sm" onClick={() => setShowImport(true)}>
                <Import className="mr-1 h-3.5 w-3.5" /> Import Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                {scrapedProduct.images?.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                    {scrapedProduct.images.slice(0, 5).map((img: string, i: number) => (
                      <img key={i} src={img} alt="" className="h-24 w-24 shrink-0 rounded-lg border border-amber-900/30 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ))}
                  </div>
                )}
                {!scrapedProduct.images?.length && (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-800/30">
                    <ImageIcon className="h-8 w-8 text-amber-200/20" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-amber-100">{scrapedProduct.name}</h4>
                {scrapedProduct.brand && <p className="text-sm text-amber-200/60">Brand: <span className="text-amber-100">{scrapedProduct.brand}</span></p>}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-amber-100">{fmt(scrapedProduct.price)}</span>
                  {scrapedProduct.compareAtPrice && <span className="text-sm text-amber-200/40 line-through">{fmt(scrapedProduct.compareAtPrice)}</span>}
                </div>
                {scrapedProduct.category && <Badge className={defCls}>{scrapedProduct.category}</Badge>}
                <p className="line-clamp-4 text-xs text-amber-200/50">{scrapedProduct.description}</p>
                {scrapedProduct.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {scrapedProduct.tags.map((t: string, i: number) => (
                      <Badge key={i} className="bg-amber-600/10 text-amber-400 border-amber-600/20 text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                {scrapedProduct.inStock !== undefined && (
                  <Badge className={scrapedProduct.inStock ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                    {scrapedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Import Product</DialogTitle></DialogHeader>
          {scrapedProduct && (
            <ImportProductForm
              token={token}
              product={scrapedProduct}
              sourceUrl={urlInput}
              platform={platform}
              categories={categories}
              vendors={vendors}
              onClose={() => setShowImport(false)}
              onSaved={() => { qc.invalidateQueries({ queryKey: ['admin-products'] }); onMutate(); setShowImport(false); setScrapedProduct(null); setResults([]) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImportProductForm({ token, product, sourceUrl, platform, categories, vendors, onClose, onSaved }: {
  token: string | null; product: any; sourceUrl: string; platform: string;
  categories: any[]; vendors: any[]; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', description: '', price: '', compareAtPrice: '', categoryId: '',
    stock: '10', costPrice: '', vendorId: '', sku: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        compareAtPrice: String(product.compareAtPrice || ''),
        categoryId: '',
        stock: '10',
        costPrice: '',
        vendorId: '',
        sku: product.sku || '',
      })
    }
  }, [product])

  const handleImport = async () => {
    if (!form.name || !form.price || !form.categoryId) { setError('Name, price, and category are required'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/api/product-import/import', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null,
          costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
          categoryId: form.categoryId,
          stock: parseInt(form.stock),
          images: product.images || [],
          tags: product.tags || [],
          sourceUrl,
          platform: platform || null,
          vendorId: form.vendorId || null,
          sku: form.sku || null,
        }),
      }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
        <p className="text-xs text-amber-200/50">Importing from: <span className="text-amber-400">{platform || 'Unknown'}</span></p>
        <p className="text-sm font-medium text-amber-100">{product.name}</p>
        <p className="text-sm text-amber-100">{fmt(product.price)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>Price *</Label><Input type="number" className={`${inputCls} mt-1`} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
        <div><Label className={lblCls}>Compare At Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} /></div>
        <div><Label className={lblCls}>Cost Price</Label><Input type="number" className={`${inputCls} mt-1`} value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Category *</Label>
          <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Stock</Label><Input type="number" className={`${inputCls} mt-1`} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} /></div>
        <div>
          <Label className={lblCls}>Vendor</Label>
          <Select value={form.vendorId} onValueChange={v => setForm(f => ({ ...f, vendorId: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>SKU</Label><Input className={`${inputCls} mt-1`} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
      </div>
      <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleImport} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Import Product</Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   13. INTEGRATIONS TAB
   ════════════════════════════════════════════ */
function IntegrationsTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editIntegration, setEditIntegration] = useState<any>(null)
  const [showSyncDialog, setShowSyncDialog] = useState<any>(null)
  const [syncProgress, setSyncProgress] = useState<string | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const syncPollRef = useRef<NodeJS.Timeout | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiFetch('/api/integrations', undefined, token),
  })

  const { data: integrationDetail } = useQuery({
    queryKey: ['integration-detail', selectedIntegration],
    queryFn: () => apiFetch(`/api/integrations/${selectedIntegration}`, undefined, token),
    enabled: !!selectedIntegration,
  })

  const integrations = data?.integrations || data || []
  const syncLogs = integrationDetail?.syncLogs || []

  const discoverMut = useMutation({
    mutationFn: () => apiFetch('/api/integrations/discover', { method: 'POST' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/integrations/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/integrations/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate() },
  })

  const syncMut = useMutation({
    mutationFn: ({ id, category, query }: { id: string; category?: string; query?: string }) =>
      apiFetch('/api/integrations/sync', { method: 'POST', body: JSON.stringify({ integrationId: id, category, query }) }, token),
    onSuccess: () => {
      setSyncProgress(null)
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration-detail'] })
      onMutate()
      if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null }
    },
    onError: () => {
      setSyncProgress(null)
      if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null }
    },
  })

  const handleSync = (integration: any, category?: string, query?: string) => {
    setSyncProgress(integration.id)
    syncMut.mutate({ id: integration.id, category, query })
    // Poll for sync status updates
    syncPollRef.current = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration-detail', integration.id] })
    }, 5000)
  }

  useEffect(() => {
    return () => { if (syncPollRef.current) clearInterval(syncPollRef.current) }
  }, [])

  const syncStatusColor = (s: string) => {
    const m: Record<string, string> = {
      idle: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
      syncing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      error: 'bg-red-600/20 text-red-400 border-red-600/30',
      completed: 'bg-green-600/20 text-green-400 border-green-600/30',
      failed: 'bg-red-600/20 text-red-400 border-red-600/30',
    }
    return m[s] || defCls
  }

  const platformIcon = (slug: string) => {
    const colors: Record<string, string> = {
      myntra: 'bg-pink-600/20 text-pink-400',
      nykaa: 'bg-purple-600/20 text-purple-400',
      amazon: 'bg-orange-600/20 text-orange-400',
      flipkart: 'bg-blue-600/20 text-blue-400',
      caratlane: 'bg-amber-600/20 text-amber-400',
      tanishq: 'bg-yellow-600/20 text-yellow-400',
      bluestone: 'bg-cyan-600/20 text-cyan-400',
      voylla: 'bg-rose-600/20 text-rose-400',
    }
    return colors[slug?.toLowerCase()] || 'bg-stone-600/20 text-stone-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditIntegration(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Platform
        </Button>
        <Button
          variant="outline"
          className={btnOutline}
          onClick={() => discoverMut.mutate()}
          disabled={discoverMut.isPending}
        >
          {discoverMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Globe className="mr-1 h-4 w-4" />}
          Auto-Discover Platforms
        </Button>
      </div>

      {discoverMut.isSuccess && discoverMut.data && (
        <Card className="border-green-900/30 bg-green-950/20">
          <CardContent className="p-3">
            <p className="text-sm text-green-400">
              <Check className="mr-1 inline h-4 w-4" />
              Discovered: {discoverMut.data.created?.length || 0} new, {discoverMut.data.skipped?.length || 0} existing
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : integrations.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-amber-200/40">No platform integrations yet</p>
            <p className="mt-1 text-xs text-amber-200/30">Click "Auto-Discover Platforms" to add default integrations</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((intg: any) => (
              <motion.div key={intg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`${cardCls} transition-all hover:border-amber-600/30`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platformIcon(intg.slug)}`}>
                          {intg.logo ? (
                            <img src={intg.logo} alt={intg.name} className="h-6 w-6 rounded object-contain" />
                          ) : (
                            <Globe className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-100">{intg.name}</p>
                          <p className="text-[10px] text-amber-200/40">{intg.slug}</p>
                        </div>
                      </div>
                      <Badge className={statusColor(intg.isActive ? 'active' : 'inactive')}>
                        {intg.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Products</span>
                        <span className="text-amber-100 font-medium">{intg.productCount ?? intg._count?.products ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Sync Status</span>
                        <Badge className={`${syncStatusColor(intg.syncStatus || 'idle')} text-[9px] px-1.5 py-0`}>
                          {intg.syncStatus || 'idle'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Last Synced</span>
                        <span className="text-amber-100">{intg.lastSyncedAt ? fmtDateTime(intg.lastSyncedAt) : 'Never'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/40">Commission</span>
                        <span className="text-amber-100">{intg.commission || 0}%</span>
                      </div>
                    </div>

                    {intg.categories && intg.categories.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).slice(0, 3).map((c: string, i: number) => (
                          <Badge key={i} className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).length > 3 && (
                          <Badge className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                            +{(Array.isArray(intg.categories) ? intg.categories : JSON.parse(intg.categories || '[]')).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} flex-1 h-7 text-[10px]`}
                        onClick={() => handleSync(intg)}
                        disabled={syncProgress === intg.id || !intg.isActive}
                      >
                        {syncProgress === intg.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                        {syncProgress === intg.id ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => { setEditIntegration(intg); setShowForm(true) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => toggleMut.mutate({ id: intg.id, isActive: !intg.isActive })}
                      >
                        {intg.isActive ? <Eye className="h-3 w-3" /> : <Eye className="h-3 w-3 text-red-400/60" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${btnOutline} h-7 w-7 p-0`}
                        onClick={() => { setSelectedIntegration(intg.id); setShowSyncDialog(intg) }}
                      >
                        <Link2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Sync History for Selected Integration */}
          {selectedIntegration && (
            <Card className={cardCls}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-amber-100">
                    Sync History — {integrations.find((i: any) => i.id === selectedIntegration)?.name || 'Platform'}
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setSelectedIntegration(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-amber-900/20 hover:bg-transparent">
                        <TableHead className="text-amber-200/50">Date</TableHead>
                        <TableHead className="text-amber-200/50">Type</TableHead>
                        <TableHead className="text-amber-200/50">Status</TableHead>
                        <TableHead className="text-amber-200/50">Found</TableHead>
                        <TableHead className="text-amber-200/50">Added</TableHead>
                        <TableHead className="text-amber-200/50">Updated</TableHead>
                        <TableHead className="text-amber-200/50">Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No sync history</TableCell></TableRow>
                      ) : syncLogs.map((log: any) => (
                        <TableRow key={log.id} className="border-amber-900/10 hover:bg-amber-900/5">
                          <TableCell className="text-xs text-amber-200/60">{fmtDateTime(log.startedAt)}</TableCell>
                          <TableCell className="text-xs text-amber-200/60">{log.type || 'full'}</TableCell>
                          <TableCell>
                            <Badge className={syncStatusColor(log.status)}>{log.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsFound ?? '—'}</TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsAdded ?? '—'}</TableCell>
                          <TableCell className="text-sm text-amber-100">{log.productsUpdated ?? '—'}</TableCell>
                          <TableCell className="text-xs text-red-400/60 max-w-[200px] truncate">{log.errors || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Integration Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editIntegration ? 'Edit Integration' : 'Add Platform Integration'}</DialogTitle>
          </DialogHeader>
          <IntegrationForm
            token={token}
            integration={editIntegration}
            onClose={() => { setShowForm(false); setEditIntegration(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['integrations'] }); onMutate(); setShowForm(false); setEditIntegration(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Trigger Sync Dialog */}
      <Dialog open={!!showSyncDialog} onOpenChange={() => setShowSyncDialog(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Trigger Sync — {showSyncDialog?.name}</DialogTitle>
          </DialogHeader>
          <SyncTriggerForm
            integration={showSyncDialog}
            onSync={(category, query) => { handleSync(showSyncDialog, category, query); setShowSyncDialog(null) }}
            onClose={() => setShowSyncDialog(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Integration Form ─── */
function IntegrationForm({ token, integration, onClose, onSaved }: {
  token: string | null; integration: any; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', slug: '', baseUrl: '', logo: '', categories: '', affiliateTag: '',
    commission: '5', maxProducts: '100', autoSync: true, syncInterval: '24',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (integration) {
      const cats = Array.isArray(integration.categories)
        ? integration.categories.join(', ')
        : integration.categories || ''
      setForm({
        name: integration.name || '', slug: integration.slug || '', baseUrl: integration.baseUrl || '',
        logo: integration.logo || '', categories: cats, affiliateTag: integration.affiliateTag || '',
        commission: String(integration.commission || 5), maxProducts: String(integration.maxProducts || 100),
        autoSync: integration.autoSync ?? true, syncInterval: String(integration.syncInterval || 24),
      })
    }
  }, [integration])

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { setError('Name and slug are required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        commission: parseFloat(form.commission),
        maxProducts: parseInt(form.maxProducts),
        syncInterval: parseInt(form.syncInterval),
        categories: form.categories ? form.categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      }
      if (integration) {
        await apiFetch(`/api/integrations/${integration.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/integrations', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Myntra" /></div>
        <div><Label className={lblCls}>Slug *</Label><Input className={`${inputCls} mt-1`} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g., myntra" /></div>
        <div><Label className={lblCls}>Base URL</Label><Input className={`${inputCls} mt-1`} value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="e.g., https://www.myntra.com" /></div>
        <div><Label className={lblCls}>Logo URL</Label><Input className={`${inputCls} mt-1`} value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} placeholder="e.g., https://example.com/logo.png" /></div>
        <div className="sm:col-span-2"><Label className={lblCls}>Categories (comma separated)</Label><Input className={`${inputCls} mt-1`} value={form.categories} onChange={e => setForm(f => ({ ...f, categories: e.target.value }))} placeholder="sarees, jewelry, watches" /></div>
        <div><Label className={lblCls}>Affiliate Tag</Label><Input className={`${inputCls} mt-1`} value={form.affiliateTag} onChange={e => setForm(f => ({ ...f, affiliateTag: e.target.value }))} placeholder="e.g., 3boxaffil" /></div>
        <div><Label className={lblCls}>Commission %</Label><Input type="number" className={`${inputCls} mt-1`} value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="e.g., 5" /></div>
        <div><Label className={lblCls}>Max Products</Label><Input type="number" className={`${inputCls} mt-1`} value={form.maxProducts} onChange={e => setForm(f => ({ ...f, maxProducts: e.target.value }))} placeholder="e.g., 1000" /></div>
        <div><Label className={lblCls}>Sync Interval (hrs)</Label><Input type="number" className={`${inputCls} mt-1`} value={form.syncInterval} onChange={e => setForm(f => ({ ...f, syncInterval: e.target.value }))} placeholder="e.g., 24" /></div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.autoSync} onCheckedChange={v => setForm(f => ({ ...f, autoSync: v }))} />
        <Label className={lblCls}>Auto Sync</Label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{integration ? 'Update' : 'Create'} Integration
        </Button>
      </div>
    </div>
  )
}

/* ─── Sync Trigger Form ─── */
function SyncTriggerForm({ integration, onSync, onClose }: {
  integration: any; onSync: (category?: string, query?: string) => void; onClose: () => void
}) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const categories = Array.isArray(integration?.categories)
    ? integration.categories
    : JSON.parse(integration?.categories || '[]')

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-amber-400/60" />
          <p className="text-sm font-medium text-amber-100">{integration?.name}</p>
        </div>
        <p className="text-xs text-amber-200/40">Current status: <Badge className={`${statusColor(integration?.isActive ? 'active' : 'inactive')} text-[9px]`}>{integration?.syncStatus || 'idle'}</Badge></p>
      </div>

      <div>
        <Label className={lblCls}>Category (optional — leave empty for all)</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c: string, i: number) => <SelectItem key={i} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className={lblCls}>Search Query (optional)</Label>
        <Input className={`${inputCls} mt-1`} value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. gold necklace" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={() => onSync(category === 'all' ? undefined : category || undefined, query || undefined)}>
          <RefreshCw className="mr-1 h-4 w-4" /> Start Sync
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   15. CORPORATE TAB
   ════════════════════════════════════════════ */
function CorporateTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [accountSearch, setAccountSearch] = useState('')
  const [accountStatusFilter, setAccountStatusFilter] = useState('')
  const [accountPage, setAccountPage] = useState(1)
  const [approveAccount, setApproveAccount] = useState<any>(null)
  const [rejectAccount, setRejectAccount] = useState<any>(null)
  const [viewAccount, setViewAccount] = useState<any>(null)

  const [campaignStatusFilter, setCampaignStatusFilter] = useState('')
  const [campaignPage, setCampaignPage] = useState(1)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [viewCampaign, setViewCampaign] = useState<any>(null)

  /* ─── Corporate Accounts Query ─── */
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['admin-corporate', accountSearch, accountStatusFilter, accountPage],
    queryFn: () => apiFetch(`/api/admin/corporate?search=${accountSearch}&approvalStatus=${accountStatusFilter}&page=${accountPage}&limit=20`, undefined, token),
  })

  const accounts = accountsData?.accounts || []
  const accountsPagination = accountsData?.pagination

  /* ─── Campaigns Query ─── */
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['admin-campaigns', campaignStatusFilter, campaignPage],
    queryFn: () => apiFetch(`/api/admin/campaigns?status=${campaignStatusFilter}&page=${campaignPage}&limit=20`, undefined, token),
  })

  const campaigns = campaignsData?.campaigns || []
  const campaignsPagination = campaignsData?.pagination

  /* ─── Campaign Detail Query ─── */
  const { data: campaignDetail } = useQuery({
    queryKey: ['admin-campaign-detail', expandedCampaign],
    queryFn: () => apiFetch(`/api/admin/campaigns/${expandedCampaign}`, undefined, token),
    enabled: !!expandedCampaign,
  })

  /* ─── Approve/Reject Account Mutation ─── */
  const approveMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string; approvalStatus: string; creditLimit?: number; discountPercent?: number; notes?: string }) =>
      apiFetch(`/api/admin/corporate/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-corporate'] }); onMutate(); setApproveAccount(null) },
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string; approvalStatus: string; notes?: string }) =>
      apiFetch(`/api/admin/corporate/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-corporate'] }); onMutate(); setRejectAccount(null) },
  })

  /* ─── Campaign Status Mutation ─── */
  const campaignMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/campaigns/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-campaigns'] }); onMutate(); setViewCampaign(null) },
  })

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Corporate Accounts ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-100">Corporate Accounts</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
            <Input className={`${inputCls} pl-9`} placeholder="Search companies, contacts, emails..." value={accountSearch} onChange={e => { setAccountSearch(e.target.value); setAccountPage(1) }} />
          </div>
          <Select value={accountStatusFilter || 'all'} onValueChange={v => { setAccountStatusFilter(v === 'all' ? '' : v); setAccountPage(1) }}>
            <SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {accountsLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : (
          <Card className={cardCls}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-amber-900/20 hover:bg-transparent">
                      <TableHead className="text-amber-200/50">Company</TableHead>
                      <TableHead className="text-amber-200/50">Contact</TableHead>
                      <TableHead className="text-amber-200/50">Email</TableHead>
                      <TableHead className="text-amber-200/50">Industry</TableHead>
                      <TableHead className="text-amber-200/50">Status</TableHead>
                      <TableHead className="text-amber-200/50">Credit Limit</TableHead>
                      <TableHead className="text-amber-200/50">Discount %</TableHead>
                      <TableHead className="text-amber-200/50">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a: any) => (
                      <TableRow key={a.id} className="border-amber-900/10 hover:bg-amber-900/5">
                        <TableCell>
                          <p className="text-sm font-medium text-amber-100">{a.companyName}</p>
                          <p className="text-xs text-amber-200/40">{a.slug}</p>
                        </TableCell>
                        <TableCell className="text-xs text-amber-200/60">{a.contactName}</TableCell>
                        <TableCell className="text-xs text-amber-200/60">{a.contactEmail}</TableCell>
                        <TableCell className="text-xs text-amber-200/60">{a.industry || '—'}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(a.approvalStatus)}>{a.approvalStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-amber-100">{fmt(a.creditLimit || 0)}</TableCell>
                        <TableCell className="text-sm text-amber-100">{a.discountPercent || 0}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setViewAccount(a)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {a.approvalStatus === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400/40 hover:text-green-400" onClick={() => setApproveAccount(a)}>
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setRejectAccount(a)}>
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {accounts.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="py-8 text-center text-amber-200/40">No corporate accounts found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {accountsPagination && accountsPagination.pages > 1 && (
                <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
                  <p className="text-xs text-amber-200/40">Page {accountsPagination.page} of {accountsPagination.pages} ({accountsPagination.total} total)</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className={btnOutline} disabled={accountPage <= 1} onClick={() => setAccountPage(p => p - 1)}>Prev</Button>
                    <Button size="sm" variant="outline" className={btnOutline} disabled={accountPage >= accountsPagination.pages} onClick={() => setAccountPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Section 2: Campaign Management ─── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-100">Campaign Management</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={campaignStatusFilter || 'all'} onValueChange={v => { setCampaignStatusFilter(v === 'all' ? '' : v); setCampaignPage(1) }}>
            <SelectTrigger className={`${selCls} w-44`}><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {campaignsLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : (
          <Card className={cardCls}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-amber-900/20 hover:bg-transparent">
                      <TableHead className="text-amber-200/50">Campaign</TableHead>
                      <TableHead className="text-amber-200/50">Company</TableHead>
                      <TableHead className="text-amber-200/50">Occasion</TableHead>
                      <TableHead className="text-amber-200/50">Status</TableHead>
                      <TableHead className="text-amber-200/50">Recipients</TableHead>
                      <TableHead className="text-amber-200/50">Budget</TableHead>
                      <TableHead className="text-amber-200/50">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((c: any) => (
                      <React.Fragment key={c.id}>
                        <TableRow className="border-amber-900/10 hover:bg-amber-900/5 cursor-pointer" onClick={() => setExpandedCampaign(expandedCampaign === c.id ? null : c.id)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`h-3.5 w-3.5 text-amber-200/30 transition-transform ${expandedCampaign === c.id ? 'rotate-180' : ''}`} />
                              <div>
                                <p className="text-sm font-medium text-amber-100">{c.name}</p>
                                {c.product && <p className="text-xs text-amber-200/40">Product: {c.product.name}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-amber-200/60">{c.corporate?.companyName || '—'}</TableCell>
                          <TableCell className="text-xs text-amber-200/60">{c.occasion || '—'}</TableCell>
                          <TableCell>
                            <Badge className={statusColor(c.status === 'pending_approval' ? 'pending' : c.status === 'in_progress' ? 'processing' : c.status)}>{c.status.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-amber-100">{c.recipientCount || 0}</TableCell>
                          <TableCell className="text-sm text-amber-100">{c.totalBudget ? fmt(c.totalBudget) : c.budgetPerRecipient ? `${fmt(c.budgetPerRecipient)}/person` : '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setViewCampaign(c)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {c.status === 'pending_approval' && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400/40 hover:text-green-400" onClick={() => campaignMut.mutate({ id: c.id, status: 'approved' })}>
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => campaignMut.mutate({ id: c.id, status: 'rejected' })}>
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {c.status === 'approved' && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-400/40 hover:text-blue-400" onClick={() => campaignMut.mutate({ id: c.id, status: 'in_progress' })}>
                                  Start
                                </Button>
                              )}
                              {(c.status === 'approved' || c.status === 'in_progress') && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-400/40 hover:text-red-400" onClick={() => campaignMut.mutate({ id: c.id, status: 'cancelled' })}>
                                  Cancel
                                </Button>
                              )}
                              {c.status === 'in_progress' && (
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-green-400/40 hover:text-green-400" onClick={() => campaignMut.mutate({ id: c.id, status: 'completed' })}>
                                  Complete
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Expanded Recipients Row */}
                        {expandedCampaign === c.id && (
                          <TableRow className="border-amber-900/10 bg-stone-800/20">
                            <TableCell colSpan={7} className="p-4">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-amber-200/60">Recipients</p>
                                {campaignDetail?.campaign?.recipients ? (
                                  campaignDetail.campaign.recipients.length > 0 ? (
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-amber-900/20 bg-stone-900/50">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-amber-900/10 hover:bg-transparent">
                                            <TableHead className="text-amber-200/40 text-xs">Name</TableHead>
                                            <TableHead className="text-amber-200/40 text-xs">Email</TableHead>
                                            <TableHead className="text-amber-200/40 text-xs">Phone</TableHead>
                                            <TableHead className="text-amber-200/40 text-xs">Designation</TableHead>
                                            <TableHead className="text-amber-200/40 text-xs">Department</TableHead>
                                            <TableHead className="text-amber-200/40 text-xs">City</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {(campaignDetail?.campaign?.recipients ?? []).map((r: any) => (
                                            <TableRow key={r.id} className="border-amber-900/5 hover:bg-amber-900/5">
                                              <TableCell className="text-xs text-amber-100">{r.name}</TableCell>
                                              <TableCell className="text-xs text-amber-200/60">{r.email}</TableCell>
                                              <TableCell className="text-xs text-amber-200/60">{r.phone || '—'}</TableCell>
                                              <TableCell className="text-xs text-amber-200/60">{r.designation || '—'}</TableCell>
                                              <TableCell className="text-xs text-amber-200/60">{r.department || '—'}</TableCell>
                                              <TableCell className="text-xs text-amber-200/60">{r.city || '—'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-amber-200/30">No recipients added yet</p>
                                  )
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-amber-200/30"><Loader2 className="h-3 w-3 animate-spin" /> Loading recipients...</div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {campaigns.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No campaigns found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {campaignsPagination && campaignsPagination.pages > 1 && (
                <div className="flex items-center justify-between border-t border-amber-900/20 px-4 py-3">
                  <p className="text-xs text-amber-200/40">Page {campaignsPagination.page} of {campaignsPagination.pages} ({campaignsPagination.total} total)</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className={btnOutline} disabled={campaignPage <= 1} onClick={() => setCampaignPage(p => p - 1)}>Prev</Button>
                    <Button size="sm" variant="outline" className={btnOutline} disabled={campaignPage >= campaignsPagination.pages} onClick={() => setCampaignPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Approve Account Dialog ─── */}
      <Dialog open={!!approveAccount} onOpenChange={() => setApproveAccount(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Approve Corporate Account</DialogTitle>
          </DialogHeader>
          {approveAccount && (
            <ApproveAccountForm
              account={approveAccount}
              token={token}
              onClose={() => setApproveAccount(null)}
              onApproved={(id, body) => approveMut.mutate({ id, ...body })}
              isPending={approveMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Account Dialog ─── */}
      <Dialog open={!!rejectAccount} onOpenChange={() => setRejectAccount(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Reject Corporate Account</DialogTitle>
          </DialogHeader>
          {rejectAccount && (
            <RejectAccountForm
              account={rejectAccount}
              onClose={() => setRejectAccount(null)}
              onRejected={(id, notes) => rejectMut.mutate({ id, approvalStatus: 'rejected', notes })}
              isPending={rejectMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── View Account Dialog ─── */}
      <Dialog open={!!viewAccount} onOpenChange={() => setViewAccount(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Corporate Account Details</DialogTitle>
          </DialogHeader>
          {viewAccount && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={lblCls}>Company</p><p className="text-sm text-amber-100">{viewAccount.companyName}</p></div>
                <div><p className={lblCls}>Slug</p><p className="text-sm text-amber-100">{viewAccount.slug}</p></div>
                <div><p className={lblCls}>Contact</p><p className="text-sm text-amber-100">{viewAccount.contactName}</p></div>
                <div><p className={lblCls}>Email</p><p className="text-sm text-amber-100">{viewAccount.contactEmail}</p></div>
                <div><p className={lblCls}>Phone</p><p className="text-sm text-amber-100">{viewAccount.contactPhone || '—'}</p></div>
                <div><p className={lblCls}>Industry</p><p className="text-sm text-amber-100">{viewAccount.industry || '—'}</p></div>
                <div><p className={lblCls}>GST Number</p><p className="text-sm text-amber-100">{viewAccount.gstNumber || '—'}</p></div>
                <div><p className={lblCls}>PAN Number</p><p className="text-sm text-amber-100">{viewAccount.panNumber || '—'}</p></div>
                <div><p className={lblCls}>Website</p><p className="text-sm text-amber-100">{viewAccount.website || '—'}</p></div>
                <div><p className={lblCls}>Status</p><Badge className={statusColor(viewAccount.approvalStatus)}>{viewAccount.approvalStatus}</Badge></div>
                <div><p className={lblCls}>Credit Limit</p><p className="text-sm text-amber-100">{fmt(viewAccount.creditLimit || 0)}</p></div>
                <div><p className={lblCls}>Discount %</p><p className="text-sm text-amber-100">{viewAccount.discountPercent || 0}%</p></div>
                <div><p className={lblCls}>Credit Used</p><p className="text-sm text-amber-100">{fmt(viewAccount.creditUsed || 0)}</p></div>
                <div><p className={lblCls}>Campaigns</p><p className="text-sm text-amber-100">{viewAccount.campaignCount || 0}</p></div>
              </div>
              {viewAccount.address && (
                <div><p className={lblCls}>Address</p><p className="text-sm text-amber-100">{viewAccount.address}{viewAccount.city ? `, ${viewAccount.city}` : ''}{viewAccount.state ? `, ${viewAccount.state}` : ''} {viewAccount.zipCode || ''}</p></div>
              )}
              {viewAccount.notes && (
                <div><p className={lblCls}>Notes</p><p className="text-sm text-amber-100">{viewAccount.notes}</p></div>
              )}
              <div className="flex items-center gap-2">
                <p className={lblCls}>Linked User:</p>
                <p className="text-xs text-amber-200/60">{viewAccount.user?.email || '—'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── View Campaign Dialog ─── */}
      <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Campaign Details</DialogTitle>
          </DialogHeader>
          {viewCampaign && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={lblCls}>Name</p><p className="text-sm text-amber-100">{viewCampaign.name}</p></div>
                <div><p className={lblCls}>Company</p><p className="text-sm text-amber-100">{viewCampaign.corporate?.companyName || '—'}</p></div>
                <div><p className={lblCls}>Occasion</p><p className="text-sm text-amber-100">{viewCampaign.occasion || '—'}</p></div>
                <div><p className={lblCls}>Status</p><Badge className={statusColor(viewCampaign.status === 'pending_approval' ? 'pending' : viewCampaign.status === 'in_progress' ? 'processing' : viewCampaign.status)}>{viewCampaign.status.replace(/_/g, ' ')}</Badge></div>
                <div><p className={lblCls}>Delivery Type</p><p className="text-sm text-amber-100">{viewCampaign.deliveryType || '—'}</p></div>
                <div><p className={lblCls}>Delivery Date</p><p className="text-sm text-amber-100">{viewCampaign.deliveryDate ? fmtDate(viewCampaign.deliveryDate) : '—'}</p></div>
                <div><p className={lblCls}>Budget/Recipient</p><p className="text-sm text-amber-100">{viewCampaign.budgetPerRecipient ? fmt(viewCampaign.budgetPerRecipient) : '—'}</p></div>
                <div><p className={lblCls}>Total Budget</p><p className="text-sm text-amber-100">{viewCampaign.totalBudget ? fmt(viewCampaign.totalBudget) : '—'}</p></div>
                <div><p className={lblCls}>Recipients</p><p className="text-sm text-amber-100">{viewCampaign.recipientCount || 0}</p></div>
                <div><p className={lblCls}>Product</p><p className="text-sm text-amber-100">{viewCampaign.product?.name || '—'}</p></div>
              </div>
              {viewCampaign.description && (
                <div><p className={lblCls}>Description</p><p className="text-sm text-amber-100">{viewCampaign.description}</p></div>
              )}
              {viewCampaign.message && (
                <div><p className={lblCls}>Message</p><p className="text-sm text-amber-100">{viewCampaign.message}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Approve Account Form ─── */
function ApproveAccountForm({ account, token, onClose, onApproved, isPending }: { account: any; token: string | null; onClose: () => void; onApproved: (id: string, body: { approvalStatus: string; creditLimit: number; discountPercent: number; notes?: string }) => void; isPending: boolean }) {
  const [creditLimit, setCreditLimit] = useState(String(account.creditLimit || 50000))
  const [discountPercent, setDiscountPercent] = useState(String(account.discountPercent || 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const cl = parseFloat(creditLimit)
    const dp = parseFloat(discountPercent)
    if (isNaN(cl) || cl < 0) { setError('Invalid credit limit'); return }
    if (isNaN(dp) || dp < 0 || dp > 100) { setError('Discount must be 0-100'); return }
    onApproved(account.id, { approvalStatus: 'approved', creditLimit: cl, discountPercent: dp, notes: notes.trim() || undefined })
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <p className="text-sm text-amber-200/60">Approve <strong className="text-amber-100">{account.companyName}</strong></p>
      <div><Label className={lblCls}>Credit Limit (INR) *</Label><Input type="number" className={`${inputCls} mt-1`} value={creditLimit} onChange={e => setCreditLimit(e.target.value)} /></div>
      <div><Label className={lblCls}>Discount % *</Label><Input type="number" className={`${inputCls} mt-1`} value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} min={0} max={100} /></div>
      <div><Label className={lblCls}>Notes</Label><Textarea className={`${inputCls} mt-1`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional approval notes..." /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className="bg-green-600 text-white hover:bg-green-500" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Approve
        </Button>
      </div>
    </div>
  )
}

/* ─── Reject Account Form ─── */
function RejectAccountForm({ account, onClose, onRejected, isPending }: { account: any; onClose: () => void; onRejected: (id: string, notes?: string) => void; isPending: boolean }) {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!notes.trim()) { setError('Please provide a rejection reason'); return }
    onRejected(account.id, notes.trim())
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <p className="text-sm text-amber-200/60">Reject <strong className="text-amber-100">{account.companyName}</strong></p>
      <div><Label className={lblCls}>Rejection Reason *</Label><Textarea className={`${inputCls} mt-1`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for rejection..." /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className="bg-red-600 text-white hover:bg-red-500" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Reject
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   INVESTOR KIT TAB (Admin-Only)
   ════════════════════════════════════════════ */
const INVESTOR_FILES = [
  {
    id: 'brochure',
    title: 'Investor Brochure',
    description: 'Comprehensive 6-page investor brochure covering market opportunity, AI-powered solution, product categories, business model, and growth roadmap.',
    filename: '3boxes-luxury-investor-brochure.pdf',
    url: '/downloads/3boxes-luxury-investor-brochure.pdf',
    size: '1.7 MB',
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-600/10',
  },
  {
    id: 'pitch-deck',
    title: 'Investor Pitch Deck',
    description: 'Professional 12-slide pitch deck with dark luxury aesthetic, market analysis, competitive landscape, product demo, and investment ask.',
    filename: '3boxes-luxury-pitch-deck.pptx',
    url: '/downloads/3boxes-luxury-pitch-deck.pptx',
    size: '572 KB',
    icon: Presentation,
    color: 'text-rose-400',
    bg: 'bg-rose-600/10',
  },
  {
    id: 'tech-doc',
    title: 'Technical Documentation',
    description: 'Complete technical documentation covering system architecture, API endpoints, database schema, deployment topology, and AI pipeline details.',
    filename: '3_Boxes_Luxury_Technical_Document.pdf',
    url: '/downloads/3_Boxes_Luxury_Technical_Document.pdf',
    size: '43 KB',
    icon: BookOpen,
    color: 'text-emerald-400',
    bg: 'bg-emerald-600/10',
  },
]

function InvestorKitTab({ token }: { token: string | null }) {
  const [shareEmail, setShareEmail] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [shareFile, setShareFile] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const handleDownload = (file: typeof INVESTOR_FILES[0]) => {
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.filename
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShareViaEmail = async () => {
    if (!shareEmail || !shareFile) return
    setSending(true)
    try {
      // First, find or create the user by email to get an agentId
      // Since investor docs are shared via email (not agent ID), we use mailto fallback as primary
      const file = INVESTOR_FILES.find(f => f.id === shareFile)
      const subject = encodeURIComponent(`3 Boxes Luxury — ${file?.title || 'Investor Document'}`)
      const body = encodeURIComponent(`${shareMessage || `Please find the ${file?.title} at: ${window.location.origin}${file?.url}`}\n\n— 3 Boxes Luxury`)
      window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`)
      setSent(true)
      setTimeout(() => { setSent(false); setShareEmail(''); setShareMessage(''); setShareFile(null) }, 3000)
    } catch {
      // fallback: open mailto
      const file = INVESTOR_FILES.find(f => f.id === shareFile)
      const subject = encodeURIComponent(`3 Boxes Luxury — ${file?.title || 'Investor Document'}`)
      const body = encodeURIComponent(`${shareMessage || `Please find the ${file?.title} at: ${window.location.origin}${file?.url}`}\n\n— 3 Boxes Luxury`)
      window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`)
    } finally {
      setSending(false)
    }
  }

  const handleCopyLink = (file: typeof INVESTOR_FILES[0]) => {
    const url = `${window.location.origin}${file.url}`
    navigator.clipboard.writeText(url)
    setCopied(file.id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10">
          <Building2 className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-amber-100">Investor Kit</h2>
          <p className="text-xs text-amber-200/50">Admin-only access. Share documents securely with specific users via email.</p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="rounded-lg border border-amber-600/20 bg-amber-900/10 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Restricted Access</p>
          <p className="text-xs text-amber-200/50 mt-1">These documents are confidential and only accessible to administrators. Share them with specific users via email — they will not appear on the public site.</p>
        </div>
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 gap-4">
        {INVESTOR_FILES.map((file) => {
          const Icon = file.icon
          return (
            <Card key={file.id} className={cardCls}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${file.bg} shrink-0`}>
                    <Icon className={`h-6 w-6 ${file.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-amber-100">{file.title}</h3>
                    <p className="text-xs text-amber-200/50 mt-1">{file.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-amber-200/40">
                      <span>{file.filename}</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <Button size="sm" className={btnPrimary} onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4 mr-1" />Download
                    </Button>
                    <Button size="sm" variant="outline" className={btnOutline} onClick={() => { setShareFile(file.id); setSent(false) }}>
                      <Mail className="h-4 w-4 mr-1" />Share
                    </Button>
                    <Button size="sm" variant="ghost" className="text-amber-200/40 hover:text-amber-300" onClick={() => handleCopyLink(file)}>
                      {copied === file.id ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Share via Email Dialog */}
      <Dialog open={!!shareFile} onOpenChange={() => setShareFile(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-400" />
              Share via Email
            </DialogTitle>
          </DialogHeader>
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
              <p className="text-sm font-medium text-amber-100">Document shared successfully!</p>
              <p className="text-xs text-amber-200/50 mt-1">The email has been sent to {shareEmail}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className={lblCls}>Recipient Email *</Label>
                <Input
                  className={`${inputCls} mt-1`}
                  type="email"
                  placeholder="investor@example.com"
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                />
              </div>
              <div>
                <Label className={lblCls}>Personal Message (optional)</Label>
                <Textarea
                  className={`${inputCls} mt-1`}
                  rows={3}
                  placeholder="Add a personal note to the recipient..."
                  value={shareMessage}
                  onChange={e => setShareMessage(e.target.value)}
                />
              </div>
              <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                <p className="text-xs text-amber-200/40">Document:</p>
                <p className="text-sm font-medium text-amber-100 mt-0.5">
                  {INVESTOR_FILES.find(f => f.id === shareFile)?.title}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className={btnOutline} onClick={() => setShareFile(null)}>Cancel</Button>
                <Button className={btnPrimary} onClick={handleShareViaEmail} disabled={sending || !shareEmail}>
                  {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
