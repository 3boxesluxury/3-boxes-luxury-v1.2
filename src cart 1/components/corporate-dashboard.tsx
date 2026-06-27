'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
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
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, Megaphone, Users, Palette, Building2,
  Plus, Pencil, Trash2, Search, Loader2, AlertTriangle,
  Send, Eye, CreditCard, Gift, ChevronLeft, X,
  Package, Calendar, CheckCircle2, Clock, IndianRupee,
  Percent, TrendingUp, Mail, Phone, MapPin, Globe,
  FileText, ArrowUpRight, ShoppingBag, Upload as UploadIcon, Download,
} from 'lucide-react'

/* ─── style constants ─── */
const tabCls = 'data-[state=active]:bg-amber-600 data-[state=active]:text-stone-950 text-amber-200/60 text-xs'
const cardCls = 'border-amber-900/30 bg-stone-900/80'
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

const campaignStatusColor = (s: string) => {
  const m: Record<string, string> = {
    draft: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
    pending_approval: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    approved: 'bg-green-600/20 text-green-400 border-green-600/30',
    in_progress: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    completed: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  }
  return m[s] || defCls
}

const giftStatusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    ordered: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  }
  return m[s] || defCls
}

const approvalStatusColor = (s: string) => {
  const m: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    approved: 'bg-green-600/20 text-green-400 border-green-600/30',
    rejected: 'bg-red-600/20 text-red-400 border-red-600/30',
  }
  return m[s] || defCls
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */
export function CorporateDashboard() {
  const { authUser, authToken, setView, clearAuth, setAuthView } = useStore()
  const [activeTab, setActiveTab] = useState('overview')

  // 401 auto-logout
  useEffect(() => {
    const handler = () => { clearAuth(); setAuthView('login') }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [clearAuth, setAuthView])

  if (!authUser || authUser.role !== 'corporate') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className={`${cardCls} w-full max-w-md`}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-bold text-amber-100">Access Denied</h2>
            <p className="mb-4 text-sm text-amber-200/60">You do not have corporate privileges to view this page.</p>
            <Button className={btnPrimary} onClick={() => setView('home')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabItems = [
    { value: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { value: 'campaigns', icon: Megaphone, label: 'Campaigns' },
    { value: 'recipients', icon: Users, label: 'Recipients' },
    { value: 'orders', icon: ShoppingBag, label: 'Orders' },
    { value: 'invoices', icon: FileText, label: 'Invoices' },
    { value: 'branding', icon: Palette, label: 'Branding' },
    { value: 'profile', icon: Building2, label: 'Profile' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-6">
      {/* Corporate Discount Banner */}
      <div className="mb-4 rounded-lg border border-blue-700/30 bg-gradient-to-r from-blue-950/60 via-blue-900/40 to-teal-900/30 p-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 shrink-0">
          <Percent className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-200">Corporate Discount Active</p>
          <p className="text-xs text-blue-300/60">Enjoy exclusive bulk pricing &amp; priority delivery for all corporate orders</p>
        </div>
        <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 shrink-0">Up to 25% OFF</Badge>
      </div>

      {/* Header with Blue/Teal branding */}
      <div className="mb-6 flex items-center gap-3">
        {/* Company Logo Placeholder */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700/30 to-teal-700/20 border border-blue-600/20 shrink-0">
          <Building2 className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-blue-100">Corporate Dashboard</h1>
          <p className="text-xs text-teal-300/50">3 BOXES LUXURY &mdash; Corporate Gifting Portal</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">Corporate</Badge>
          <span className="text-xs text-blue-200/50">{authUser.email}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-6 overflow-x-auto">
          <TabsList className="inline-flex h-auto w-max gap-1 bg-stone-900/60 p-1">
            {tabItems.map(t => (
              <TabsTrigger key={t.value} value={t.value} className={tabCls}>
                <t.icon className="mr-1 h-3 w-3" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview"><OverviewTab token={authToken} onNavigate={setActiveTab} /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTab token={authToken} /></TabsContent>
        <TabsContent value="recipients"><RecipientsTab token={authToken} /></TabsContent>
        <TabsContent value="orders"><CorporateOrdersTab token={authToken} /></TabsContent>
        <TabsContent value="invoices"><CorporateInvoicesTab token={authToken} /></TabsContent>
        <TabsContent value="branding"><BrandingTab token={authToken} /></TabsContent>
        <TabsContent value="profile"><ProfileTab token={authToken} /></TabsContent>
      </Tabs>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   1. OVERVIEW TAB
   ════════════════════════════════════════════ */
function OverviewTab({ token, onNavigate }: { token: string | null; onNavigate: (tab: string) => void }) {
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['corporate-profile'],
    queryFn: () => apiFetch('/api/corporate/profile', undefined, token),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['corporate-campaigns'],
    queryFn: () => apiFetch('/api/corporate/campaigns?limit=20', undefined, token),
  })

  const corporate = profileData?.corporate
  const campaigns = campaignsData?.campaigns || []

  const activeCampaigns = campaigns.filter((c: any) => ['approved', 'in_progress'].includes(c.status)).length
  const totalRecipients = campaigns.reduce((sum: number, c: any) => sum + (c.recipientCount || 0), 0)
  const totalBudget = campaigns.reduce((sum: number, c: any) => sum + (c.totalBudget || 0), 0)
  const discountPercent = corporate?.discountPercent || 0

  const summaryCards = [
    { title: 'Active Campaigns', value: activeCampaigns.toString(), icon: Megaphone, color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { title: 'Total Recipients', value: totalRecipients.toString(), icon: Users, color: 'text-teal-400', bg: 'bg-teal-600/10' },
    { title: 'Total Budget', value: fmt(totalBudget), icon: IndianRupee, color: 'text-sky-400', bg: 'bg-sky-600/10' },
    { title: 'Corporate Discount', value: `${discountPercent}%`, icon: Percent, color: 'text-cyan-400', bg: 'bg-cyan-600/10' },
  ]

  const recentCampaigns = campaigns.slice(0, 3)

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className={cardCls}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className={lblCls}>{c.title}</p>
                    <p className="text-lg font-bold text-amber-100">{c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Credit Info */}
      {corporate && (
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-400" /> Credit Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
                <p className={lblCls}>Credit Limit</p>
                <p className="mt-1 text-lg font-bold text-amber-100">{fmt(corporate.creditLimit || 0)}</p>
              </div>
              <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
                <p className={lblCls}>Credit Used</p>
                <p className="mt-1 text-lg font-bold text-red-400">{fmt(corporate.creditUsed || 0)}</p>
              </div>
              <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
                <p className={lblCls}>Available Credit</p>
                <p className="mt-1 text-lg font-bold text-green-400">{fmt((corporate.creditLimit || 0) - (corporate.creditUsed || 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Campaigns + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Campaigns */}
        <Card className={`${cardCls} lg:col-span-2`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" /> Recent Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="py-8 text-center">
                <Gift className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
                <p className="text-sm text-amber-200/40">No campaigns yet. Create your first campaign!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/20 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-amber-100 truncate">{c.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-amber-200/40">
                        {c.occasion && <span>{c.occasion}</span>}
                        <span>{c.recipientCount} recipients</span>
                        {c.totalBudget && <span>{fmt(c.totalBudget)}</span>}
                      </div>
                    </div>
                    <Badge className={campaignStatusColor(c.status)}>{c.status.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-100">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className={`${btnPrimary} w-full justify-start`} onClick={() => onNavigate('campaigns')}>
              <Plus className="mr-2 h-4 w-4" /> Create Campaign
            </Button>
            <Button className={`${btnOutline} w-full justify-start`} onClick={() => onNavigate('branding')}>
              <Palette className="mr-2 h-4 w-4" /> Manage Branding
            </Button>
            <Button className={`${btnOutline} w-full justify-start`} onClick={() => onNavigate('profile')}>
              <Building2 className="mr-2 h-4 w-4" /> Update Profile
            </Button>
            <Button className={`${btnOutline} w-full justify-start`} onClick={() => onNavigate('recipients')}>
              <Users className="mr-2 h-4 w-4" /> View Recipients
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   2. CAMPAIGNS TAB
   ════════════════════════════════════════════ */
function CampaignsTab({ token }: { token: string | null }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-campaigns', statusFilter],
    queryFn: () => apiFetch(`/api/corporate/campaigns?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`, undefined, token),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/corporate/campaigns/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corporate-campaigns'] }); setShowDelete(null) },
  })

  const submitMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/corporate/campaigns/${id}/submit`, { method: 'POST' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corporate-campaigns'] }); qc.invalidateQueries({ queryKey: ['corporate-campaign-detail'] }) },
  })

  const campaigns = data?.campaigns || []

  // Filter by search locally
  const filtered = campaigns.filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.occasion?.toLowerCase().includes(search.toLowerCase())
  )

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['corporate-campaigns'] })
    qc.invalidateQueries({ queryKey: ['corporate-campaign-detail'] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className={`${selCls} w-44`}><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button className={btnPrimary} onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : selectedCampaign ? (
        <CampaignDetailView token={token} campaignId={selectedCampaign.id} onBack={() => setSelectedCampaign(null)} />
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Campaign</TableHead>
                    <TableHead className="text-amber-200/50">Occasion</TableHead>
                    <TableHead className="text-amber-200/50">Recipients</TableHead>
                    <TableHead className="text-amber-200/50">Budget</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Delivery Date</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any) => (
                    <TableRow key={c.id} className="border-amber-900/10 hover:bg-amber-900/5 cursor-pointer" onClick={() => setSelectedCampaign(c)}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-amber-100">{c.name}</p>
                          {c.product && <p className="text-xs text-amber-200/40">Product: {c.product.name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60 capitalize">{c.occasion || '—'}</TableCell>
                      <TableCell className="text-sm text-amber-100">{c.recipientCount || 0}</TableCell>
                      <TableCell className="text-sm text-amber-100">{c.totalBudget ? fmt(c.totalBudget) : '—'}</TableCell>
                      <TableCell><Badge className={campaignStatusColor(c.status)}>{c.status.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-xs text-amber-200/60">{c.deliveryDate ? fmtDate(c.deliveryDate) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setSelectedCampaign(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {c.status === 'draft' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400/40 hover:text-green-400" onClick={() => submitMut.mutate(c.id)} disabled={submitMut.isPending}>
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(c)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No campaigns found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Create Campaign</DialogTitle>
          </DialogHeader>
          <CreateCampaignForm token={token} onClose={() => setShowCreate(false)} onSaved={() => { invalidateAll(); setShowCreate(false) }} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to delete <strong className="text-amber-100">{showDelete?.name}</strong>? This action cannot be undone.</p>
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

/* ─── Create Campaign Form ─── */
function CreateCampaignForm({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', occasion: '', description: '', budgetPerRecipient: '', totalBudget: '',
    deliveryType: 'bulk', deliveryDate: '', message: '', productId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['products-for-campaign'],
    queryFn: () => apiFetch('/api/products?limit=100', undefined, token),
  })
  const products = productsData?.products || []

  const handleSubmit = async () => {
    if (!form.name) { setError('Campaign name is required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        budgetPerRecipient: form.budgetPerRecipient ? parseFloat(form.budgetPerRecipient) : null,
        totalBudget: form.totalBudget ? parseFloat(form.totalBudget) : null,
        productId: form.productId || null,
      }
      await apiFetch('/api/corporate/campaigns', { method: 'POST', body: JSON.stringify(body) }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Diwali 2025 Gift Campaign" /></div>
        <div>
          <Label className={lblCls}>Occasion</Label>
          <Select value={form.occasion} onValueChange={v => setForm(f => ({ ...f, occasion: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select occasion" /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="diwali">Diwali</SelectItem>
              <SelectItem value="christmas">Christmas</SelectItem>
              <SelectItem value="new_year">New Year</SelectItem>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="anniversary">Anniversary</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="farewell">Farewell</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Budget per Recipient</Label><Input type="number" className={`${inputCls} mt-1`} value={form.budgetPerRecipient} onChange={e => setForm(f => ({ ...f, budgetPerRecipient: e.target.value }))} placeholder="e.g., 5000" /></div>
        <div><Label className={lblCls}>Total Budget</Label><Input type="number" className={`${inputCls} mt-1`} value={form.totalBudget} onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))} placeholder="e.g., 50000" /></div>
        <div>
          <Label className={lblCls}>Delivery Type</Label>
          <Select value={form.deliveryType} onValueChange={v => setForm(f => ({ ...f, deliveryType: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              <SelectItem value="bulk">Bulk</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lblCls}>Delivery Date</Label><Input type="date" className={`${inputCls} mt-1`} value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} /></div>
      </div>
      <div>
        <Label className={lblCls}>Product</Label>
        <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
          <SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select a product" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="none">No product selected</SelectItem>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.price)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className={lblCls}>Description</Label>
        <Textarea className={`${inputCls} mt-1`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Annual corporate gifting for Diwali celebrations..." />
      </div>
      <div>
        <Label className={lblCls}>Custom Message</Label>
        <Textarea className={`${inputCls} mt-1`} rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="e.g., Wishing you a prosperous Diwali from our team!" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create Campaign
        </Button>
      </div>
    </div>
  )
}

/* ─── Campaign Detail View ─── */
function CampaignDetailView({ token, campaignId, onBack }: { token: string | null; campaignId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['corporate-campaign-detail', campaignId],
    queryFn: () => apiFetch(`/api/corporate/campaigns/${campaignId}`, undefined, token),
  })

  const submitMut = useMutation({
    mutationFn: () => apiFetch(`/api/corporate/campaigns/${campaignId}/submit`, { method: 'POST' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['corporate-campaign-detail', campaignId] }); qc.invalidateQueries({ queryKey: ['corporate-campaigns'] }) },
  })

  const campaign = data?.campaign

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  }

  if (!campaign) {
    return <div className="py-8 text-center text-amber-200/40">Campaign not found</div>
  }

  const recipients = campaign.recipients || []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className={btnOutline} onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-amber-100 truncate">{campaign.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={campaignStatusColor(campaign.status)}>{campaign.status.replace(/_/g, ' ')}</Badge>
            {campaign.occasion && <span className="text-xs text-amber-200/40 capitalize">{campaign.occasion}</span>}
          </div>
        </div>
        {campaign.status === 'draft' && (
          <Button className={btnPrimary} onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
            {submitMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            <Send className="mr-1 h-4 w-4" /> Submit for Approval
          </Button>
        )}
      </div>

      {/* Campaign Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={cardCls}>
          <CardContent className="p-4">
            <p className={lblCls}>Total Budget</p>
            <p className="mt-1 text-lg font-bold text-amber-100">{campaign.totalBudget ? fmt(campaign.totalBudget) : '—'}</p>
          </CardContent>
        </Card>
        <Card className={cardCls}>
          <CardContent className="p-4">
            <p className={lblCls}>Budget / Recipient</p>
            <p className="mt-1 text-lg font-bold text-amber-100">{campaign.budgetPerRecipient ? fmt(campaign.budgetPerRecipient) : '—'}</p>
          </CardContent>
        </Card>
        <Card className={cardCls}>
          <CardContent className="p-4">
            <p className={lblCls}>Recipients</p>
            <p className="mt-1 text-lg font-bold text-amber-100">{campaign.recipientCount || recipients.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card className={cardCls}>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className={lblCls}>Delivery Type:</span> <span className="text-amber-100 capitalize">{campaign.deliveryType}</span></div>
            <div><span className={lblCls}>Delivery Date:</span> <span className="text-amber-100">{campaign.deliveryDate ? fmtDate(campaign.deliveryDate) : '—'}</span></div>
            {campaign.product && (
              <div className="col-span-2">
                <span className={lblCls}>Product:</span> <span className="text-amber-100">{campaign.product.name} ({fmt(campaign.product.price)})</span>
              </div>
            )}
          </div>
          {campaign.description && (
            <div><span className={lblCls}>Description:</span><p className="mt-1 text-sm text-amber-200/60">{campaign.description}</p></div>
          )}
          {campaign.message && (
            <div><span className={lblCls}>Message:</span><p className="mt-1 text-sm text-amber-200/60 italic">&ldquo;{campaign.message}&rdquo;</p></div>
          )}
        </CardContent>
      </Card>

      {/* Recipients Table */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100">Recipients ({recipients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50">Name</TableHead>
                  <TableHead className="text-amber-200/50">Email</TableHead>
                  <TableHead className="text-amber-200/50">Phone</TableHead>
                  <TableHead className="text-amber-200/50">Designation</TableHead>
                  <TableHead className="text-amber-200/50">Department</TableHead>
                  <TableHead className="text-amber-200/50">Gift Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r: any) => (
                  <TableRow key={r.id} className="border-amber-900/10 hover:bg-amber-900/5">
                    <TableCell className="text-sm text-amber-100">{r.name}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.email}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.phone || '—'}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.designation || '—'}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.department || '—'}</TableCell>
                    <TableCell><Badge className={giftStatusColor(r.giftStatus)}>{r.giftStatus}</Badge></TableCell>
                  </TableRow>
                ))}
                {recipients.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-amber-200/40">No recipients added yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   3. RECIPIENTS TAB
   ════════════════════════════════════════════ */
function RecipientsTab({ token }: { token: string | null }) {
  const qc = useQueryClient()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [editRecipient, setEditRecipient] = useState<any>(null)
  const [showDeleteRecipient, setShowDeleteRecipient] = useState<any>(null)

  const { data: campaignsData } = useQuery({
    queryKey: ['corporate-campaigns'],
    queryFn: () => apiFetch('/api/corporate/campaigns?limit=50', undefined, token),
  })
  const campaigns = campaignsData?.campaigns || []

  const { data: recipientsData, isLoading: recipientsLoading } = useQuery({
    queryKey: ['campaign-recipients', selectedCampaignId],
    queryFn: () => selectedCampaignId ? apiFetch(`/api/corporate/campaigns/${selectedCampaignId}/recipients?limit=100`, undefined, token) : null,
    enabled: !!selectedCampaignId,
  })
  const recipients = recipientsData?.recipients || []

  const deleteRecipientMut = useMutation({
    mutationFn: ({ campaignId, recipientId }: { campaignId: string; recipientId: string }) =>
      apiFetch(`/api/corporate/campaigns/${campaignId}/recipients/${recipientId}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-recipients', selectedCampaignId] }); setShowDeleteRecipient(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
          <SelectTrigger className={`${selCls} w-64`}><SelectValue placeholder="Select a campaign" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            {campaigns.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.recipientCount})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCampaignId && (
          <>
            <Button className={btnPrimary} onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Recipient
            </Button>
            <Button className={btnOutline} onClick={() => setShowBulkAdd(true)}>
              <Users className="mr-1 h-4 w-4" /> Bulk Add
            </Button>
          </>
        )}
      </div>

      {!selectedCampaignId ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-sm text-amber-200/40">Select a campaign to view and manage recipients</p>
          </CardContent>
        </Card>
      ) : recipientsLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Name</TableHead>
                    <TableHead className="text-amber-200/50">Email</TableHead>
                    <TableHead className="text-amber-200/50">Phone</TableHead>
                    <TableHead className="text-amber-200/50">Designation</TableHead>
                    <TableHead className="text-amber-200/50">Department</TableHead>
                    <TableHead className="text-amber-200/50">Gift Status</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r: any) => (
                    <TableRow key={r.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell className="text-sm font-medium text-amber-100">{r.name}</TableCell>
                      <TableCell className="text-xs text-amber-200/60">{r.email}</TableCell>
                      <TableCell className="text-xs text-amber-200/60">{r.phone || '—'}</TableCell>
                      <TableCell className="text-xs text-amber-200/60">{r.designation || '—'}</TableCell>
                      <TableCell className="text-xs text-amber-200/60">{r.department || '—'}</TableCell>
                      <TableCell><Badge className={giftStatusColor(r.giftStatus)}>{r.giftStatus}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => setEditRecipient(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDeleteRecipient(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recipients.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-amber-200/40">No recipients found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Recipient Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Add Recipient</DialogTitle></DialogHeader>
          <RecipientForm
            token={token}
            campaignId={selectedCampaignId}
            onClose={() => setShowAdd(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['campaign-recipients', selectedCampaignId] }); setShowAdd(false) }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Bulk Add Recipients</DialogTitle></DialogHeader>
          <BulkAddForm
            token={token}
            campaignId={selectedCampaignId}
            onClose={() => setShowBulkAdd(false)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['campaign-recipients', selectedCampaignId] }); qc.invalidateQueries({ queryKey: ['corporate-campaigns'] }); setShowBulkAdd(false) }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Recipient Dialog */}
      <Dialog open={!!editRecipient} onOpenChange={() => setEditRecipient(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-amber-100">Edit Recipient</DialogTitle></DialogHeader>
          <RecipientForm
            token={token}
            campaignId={selectedCampaignId}
            recipient={editRecipient}
            onClose={() => setEditRecipient(null)}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['campaign-recipients', selectedCampaignId] }); setEditRecipient(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Recipient Confirmation */}
      <Dialog open={!!showDeleteRecipient} onOpenChange={() => setShowDeleteRecipient(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-amber-100">Remove Recipient</DialogTitle></DialogHeader>
          <p className="text-sm text-amber-200/60">Are you sure you want to remove <strong className="text-amber-100">{showDeleteRecipient?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDeleteRecipient(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => deleteRecipientMut.mutate({ campaignId: selectedCampaignId, recipientId: showDeleteRecipient.id })} disabled={deleteRecipientMut.isPending}>
              {deleteRecipientMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Recipient Form ─── */
function RecipientForm({ token, campaignId, recipient, onClose, onSaved }: {
  token: string | null; campaignId: string; recipient?: any; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', designation: '', department: '', address: '', city: '', state: '', zipCode: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (recipient) {
      setForm({
        name: recipient.name || '', email: recipient.email || '', phone: recipient.phone || '',
        designation: recipient.designation || '', department: recipient.department || '',
        address: recipient.address || '', city: recipient.city || '', state: recipient.state || '',
        zipCode: recipient.zipCode || '',
      })
    }
  }, [recipient])

  const handleSubmit = async () => {
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    setSaving(true); setError('')
    try {
      if (recipient) {
        await apiFetch(`/api/corporate/campaigns/${campaignId}/recipients/${recipient.id}`, {
          method: 'PUT', body: JSON.stringify(form),
        }, token)
      } else {
        await apiFetch(`/api/corporate/campaigns/${campaignId}/recipients`, {
          method: 'POST', body: JSON.stringify(form),
        }, token)
      }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label className={lblCls}>Email *</Label><Input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><Label className={lblCls}>Phone</Label><Input className={`${inputCls} mt-1`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div><Label className={lblCls}>Designation</Label><Input className={`${inputCls} mt-1`} value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} /></div>
        <div><Label className={lblCls}>Department</Label><Input className={`${inputCls} mt-1`} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
        <div><Label className={lblCls}>City</Label><Input className={`${inputCls} mt-1`} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
      </div>
      <div>
        <Label className={lblCls}>Address</Label>
        <Input className={`${inputCls} mt-1`} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className={lblCls}>State</Label><Input className={`${inputCls} mt-1`} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
        <div><Label className={lblCls}>ZIP Code</Label><Input className={`${inputCls} mt-1`} value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{recipient ? 'Update' : 'Add'} Recipient
        </Button>
      </div>
    </div>
  )
}

/* ─── Bulk Add Form ─── */
function BulkAddForm({ token, campaignId, onClose, onSaved }: {
  token: string | null; campaignId: string; onClose: () => void; onSaved: () => void
}) {
  const [csvInput, setCsvInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string) => {
    let lines = text.trim().split('\n').filter(l => l.trim())
    // Skip header row if present
    if (lines.length > 0 && /^(name|Name)/.test(lines[0].split(',')[0]?.trim())) {
      lines = lines.slice(1)
    }
    const recipients = lines.map(line => {
      const parts = line.split(',').map(s => s.trim())
      return {
        name: parts[0] || '',
        email: parts[1] || '',
        phone: parts[2] || '',
        designation: parts[3] || '',
        department: parts[4] || '',
        address: parts[5] || '',
        city: parts[6] || '',
        state: parts[7] || '',
        zipCode: parts[8] || '',
        budget: parts[9] || '',
        message: parts[10] || '',
      }
    }).filter(r => r.name && r.email)
    return recipients
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvInput(text)
      const parsed = parseCSV(text)
      setParsedPreview(parsed.length > 0 ? parsed : null)
    }
    reader.readAsText(file)
  }

  const handleTextChange = (text: string) => {
    setCsvInput(text)
    if (text.trim()) {
      const parsed = parseCSV(text)
      setParsedPreview(parsed.length > 0 ? parsed : null)
    } else {
      setParsedPreview(null)
    }
  }

  const handleSubmit = async () => {
    const recipients = parsedPreview || parseCSV(csvInput)
    if (recipients.length === 0) { setError('No valid recipients found. Format: name, email, phone, designation, department, address, city, state, zipCode, budget, message'); return }
    setSaving(true); setError('')

    try {
      await apiFetch(`/api/corporate/campaigns/${campaignId}/recipients`, {
        method: 'POST',
        body: JSON.stringify({ recipients }),
      }, token)
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div>
        <Label className={lblCls}>CSV Data (one recipient per line)</Label>
        <p className="mt-1 text-xs text-amber-200/40">Format: name, email, phone, designation, department, address, city, state, zipCode, budget, message</p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" className={btnOutline} onClick={() => fileRef.current?.click()}>
            <UploadIcon className="mr-1 h-4 w-4" /> Upload CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" className={btnOutline} onClick={() => {
            const template = 'name,email,phone,designation,department,address,city,state,zipCode,budget,message\nJohn Doe,john@company.com,+91-9876543210,Manager,Engineering,123 Business Park,Mumbai,MH,400001,5000,Happy Diwali\nJane Smith,jane@company.com,+91-9876543211,Director,Marketing,456 Tech Hub,Bangalore,KA,560001,7500,Seasons Greetings'
            const blob = new Blob([template], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = 'recipient-template.csv'; a.click()
            URL.revokeObjectURL(url)
          }}>
            <Download className="mr-1 h-4 w-4" /> Download Template
          </Button>
        </div>
        <Textarea
          className={`${inputCls} mt-2 font-mono text-xs`}
          rows={8}
          value={csvInput}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={`John Doe, john@company.com, +91-9876543210, Manager, Engineering, 123 St, Mumbai, MH, 400001, 5000, Happy Diwali\nJane Smith, jane@company.com, +91-9876543211, Director, Marketing`}
        />
      </div>

      {/* Parsed Preview */}
      {parsedPreview && parsedPreview.length > 0 && (
        <div>
          <Label className={lblCls}>Preview ({parsedPreview.length} recipients)</Label>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-amber-900/20 bg-stone-800/30 p-2">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-900/20 hover:bg-transparent">
                  <TableHead className="text-amber-200/50 text-xs">Name</TableHead>
                  <TableHead className="text-amber-200/50 text-xs">Email</TableHead>
                  <TableHead className="text-amber-200/50 text-xs">Dept</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedPreview.slice(0, 10).map((r: any, i: number) => (
                  <TableRow key={i} className="border-amber-900/10">
                    <TableCell className="text-xs text-amber-100">{r.name}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.email}</TableCell>
                    <TableCell className="text-xs text-amber-200/60">{r.department || '—'}</TableCell>
                  </TableRow>
                ))}
                {parsedPreview.length > 10 && (
                  <TableRow><TableCell colSpan={3} className="text-xs text-amber-200/40 text-center">... and {parsedPreview.length - 10} more</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Add Recipients
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   4. BRANDING TAB
   ════════════════════════════════════════════ */
function BrandingTab({ token }: { token: string | null }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['corporate-branding'],
    queryFn: () => apiFetch('/api/corporate/branding', undefined, token),
  })

  const branding = data?.branding

  const [form, setForm] = useState({
    logoUrl: '', primaryColor: '', secondaryColor: '', customMessage: '',
    packagingType: 'standard', giftWrapStyle: '', includeBranding: true, hidePrice: true, cardTemplate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (branding) {
      setForm({
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '',
        secondaryColor: branding.secondaryColor || '',
        customMessage: branding.customMessage || '',
        packagingType: branding.packagingType || 'standard',
        giftWrapStyle: branding.giftWrapStyle || '',
        includeBranding: branding.includeBranding ?? true,
        hidePrice: branding.hidePrice ?? true,
        cardTemplate: branding.cardTemplate || '',
      })
    }
  }, [branding])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await apiFetch('/api/corporate/branding', {
        method: 'PUT',
        body: JSON.stringify(form),
      }, token)
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['corporate-branding'] })
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  }

  return (
    <div className="space-y-6">
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Palette className="h-4 w-4 text-amber-400" /> Company Branding Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
          {saved && <div className="rounded-md bg-green-600/10 p-3 text-sm text-green-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Branding settings saved successfully!</div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className={lblCls}>Logo URL</Label>
              <Input className={`${inputCls} mt-1`} value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" />
            </div>
            <div>
              <Label className={lblCls}>Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primaryColor || '#d97706'} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="h-9 w-9 rounded border border-amber-900/40 bg-transparent cursor-pointer" />
                <Input className={`${inputCls} flex-1`} value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} placeholder="#d97706" />
              </div>
            </div>
            <div>
              <Label className={lblCls}>Secondary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.secondaryColor || '#78350f'} onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} className="h-9 w-9 rounded border border-amber-900/40 bg-transparent cursor-pointer" />
                <Input className={`${inputCls} flex-1`} value={form.secondaryColor} onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} placeholder="#78350f" />
              </div>
            </div>
            <div>
              <Label className={lblCls}>Packaging Type</Label>
              <Select value={form.packagingType} onValueChange={v => setForm(f => ({ ...f, packagingType: v }))}>
                <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
                <SelectContent className={selContentCls}>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lblCls}>Gift Wrap Style</Label>
              <Input className={`${inputCls} mt-1`} value={form.giftWrapStyle} onChange={e => setForm(f => ({ ...f, giftWrapStyle: e.target.value }))} placeholder="e.g. Gold ribbon, Black matte wrap" />
            </div>
            <div>
              <Label className={lblCls}>Card Template</Label>
              <Input className={`${inputCls} mt-1`} value={form.cardTemplate} onChange={e => setForm(f => ({ ...f, cardTemplate: e.target.value }))} placeholder="e.g. Classic, Modern, Festive" />
            </div>
          </div>

          <div>
            <Label className={lblCls}>Custom Greeting Message</Label>
            <Textarea className={`${inputCls} mt-1`} rows={3} value={form.customMessage} onChange={e => setForm(f => ({ ...f, customMessage: e.target.value }))} placeholder="Default greeting message for all gifts..." />
          </div>

          <Separator className="bg-amber-900/20" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/20 p-4">
              <div>
                <Label className="text-sm text-amber-100">Include Branding</Label>
                <p className="text-xs text-amber-200/40 mt-1">Add company branding on gift packages</p>
              </div>
              <Switch checked={form.includeBranding} onCheckedChange={v => setForm(f => ({ ...f, includeBranding: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/20 p-4">
              <div>
                <Label className="text-sm text-amber-100">Hide Price</Label>
                <p className="text-xs text-amber-200/40 mt-1">Remove price tags from gift packages</p>
              </div>
              <Switch checked={form.hidePrice} onCheckedChange={v => setForm(f => ({ ...f, hidePrice: v }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button className={btnPrimary} onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save Branding Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400" /> Branding Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-900/30 bg-stone-800/30 p-6 text-center">
            {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="mx-auto mb-3 h-12 w-auto object-contain" />}
            <div className="mb-2 flex items-center justify-center gap-2">
              {form.primaryColor && <div className="h-6 w-6 rounded-full border border-amber-900/40" style={{ backgroundColor: form.primaryColor }} />}
              {form.secondaryColor && <div className="h-6 w-6 rounded-full border border-amber-900/40" style={{ backgroundColor: form.secondaryColor }} />}
            </div>
            <p className="text-xs text-amber-200/40">Packaging: <span className="text-amber-100 capitalize">{form.packagingType}</span></p>
            {form.giftWrapStyle && <p className="text-xs text-amber-200/40">Wrap: <span className="text-amber-100">{form.giftWrapStyle}</span></p>}
            {form.customMessage && (
              <div className="mt-3 rounded-md border border-amber-900/20 bg-stone-900/50 p-3">
                <p className="text-sm italic text-amber-200/60">&ldquo;{form.customMessage}&rdquo;</p>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-3 text-xs">
              <Badge className={form.includeBranding ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-stone-600/20 text-stone-400 border-stone-600/30'}>
                {form.includeBranding ? 'Branding ON' : 'Branding OFF'}
              </Badge>
              <Badge className={form.hidePrice ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-stone-600/20 text-stone-400 border-stone-600/30'}>
                {form.hidePrice ? 'Price Hidden' : 'Price Visible'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   3b. CORPORATE ORDERS TAB
   ════════════════════════════════════════════ */
function CorporateOrdersTab({ token }: { token: string | null }) {
  const { authUser } = useStore()
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // Fetch corporate profile to get contact email
  const { data: profileData } = useQuery({
    queryKey: ['corporate-profile'],
    queryFn: () => apiFetch('/api/corporate/profile', undefined, token),
  })
  const corporateEmail = profileData?.corporate?.contactEmail || authUser?.email || ''
  const emailDomain = authUser?.email?.split('@')[1] || ''

  const { data, isLoading } = useQuery({
    queryKey: ['corporate-orders', corporateEmail],
    queryFn: () => apiFetch(`/api/orders?email=${encodeURIComponent(corporateEmail)}`, undefined, token),
    enabled: !!corporateEmail,
  })

  const allOrders = data?.orders || []
  // Also include orders matching the email domain
  const orders = allOrders.length > 0 ? allOrders : (() => {
    // Fallback: try fetching all and filter by domain
    return []
  })()

  const orderStatusColor = (s: string) => {
    const m: Record<string, string> = {
      pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
      processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
      delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
      cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
    }
    return m[s] || defCls
  }

  const estimatedDelivery = (o: any) => {
    if (o.estimatedDelivery) return fmtDate(o.estimatedDelivery)
    if (o.status === 'delivered') return 'Delivered'
    if (o.status === 'cancelled') return '—'
    // Rough estimate: 5-7 business days from order date
    const d = new Date(o.createdAt)
    d.setDate(d.getDate() + 7)
    return fmtDate(d.toISOString())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-xs text-amber-200/40">Showing orders for {corporateEmail || `@${emailDomain}`}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : orders.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-sm text-amber-200/40">No orders found for your account</p>
          </CardContent>
        </Card>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Order #</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                    <TableHead className="text-amber-200/50">Items</TableHead>
                    <TableHead className="text-amber-200/50">Total</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Delivery Type</TableHead>
                    <TableHead className="text-amber-200/50">Tracking</TableHead>
                    <TableHead className="text-amber-200/50">Est. Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id} className="border-amber-900/10 hover:bg-amber-900/5 cursor-pointer" onClick={() => setSelectedOrder(o)}>
                      <TableCell className="text-sm font-medium text-amber-100">{o.orderNumber}</TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(o.createdAt)}</TableCell>
                      <TableCell>
                        <p className="text-sm text-amber-100">{o.items?.length || 0} items</p>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(o.total)}</TableCell>
                      <TableCell><Badge className={orderStatusColor(o.status)}>{o.status}</Badge></TableCell>
                      <TableCell className="text-xs text-amber-200/60 capitalize">{o.deliveryType || 'standard'}</TableCell>
                      <TableCell>
                        {o.trackingNumber ? (
                          <div>
                            <p className="text-xs text-amber-400">{o.trackingNumber}</p>
                            {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noopener" className="text-xs text-amber-600 underline" onClick={e => e.stopPropagation()}>Track</a>}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-200/30">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">{estimatedDelivery(o)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" /> Order {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status & Date */}
              <div className="flex items-center gap-3">
                <Badge className={orderStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                <span className="text-xs text-amber-200/40">Placed on {fmtDateTime(selectedOrder.createdAt)}</span>
              </div>

              {/* Order Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <p className={lblCls}>Total</p>
                  <p className="mt-1 text-sm font-bold text-amber-100">{fmt(selectedOrder.total)}</p>
                </div>
                <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <p className={lblCls}>Delivery Type</p>
                  <p className="mt-1 text-sm font-medium text-amber-100 capitalize">{selectedOrder.deliveryType || 'Standard'}</p>
                </div>
                <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <p className={lblCls}>Est. Delivery</p>
                  <p className="mt-1 text-sm font-medium text-amber-100">{estimatedDelivery(selectedOrder)}</p>
                </div>
                <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                  <p className={lblCls}>Payment</p>
                  <p className="mt-1 text-sm font-medium text-amber-100 capitalize">{selectedOrder.paymentMethod || selectedOrder.paymentStatus || '—'}</p>
                </div>
              </div>

              {/* Tracking Info */}
              {(selectedOrder.trackingNumber || selectedOrder.trackingUrl) && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-2 flex items-center gap-1'}><Package className="h-3.5 w-3.5" /> Tracking Information</p>
                    {selectedOrder.trackingNumber && (
                      <p className="text-sm text-amber-100">Tracking #: <span className="text-amber-400">{selectedOrder.trackingNumber}</span></p>
                    )}
                    {selectedOrder.trackingUrl && (
                      <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 underline hover:text-amber-400">
                        <ArrowUpRight className="h-3 w-3" /> Track Shipment
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              <div>
                <p className={lblCls + ' mb-2'}>Items ({selectedOrder.items?.length || 0})</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/20 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-amber-100 truncate">{item.name || item.productName || `Item ${idx + 1}`}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-amber-200/40">
                          <span>Qty: {item.quantity || 1}</span>
                          {item.price && <span>{fmt(item.price)} each</span>}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-amber-100">{fmt((item.price || 0) * (item.quantity || 1))}</p>
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <p className="text-xs text-amber-200/40">No item details available</p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-2 flex items-center gap-1'}><MapPin className="h-3.5 w-3.5" /> Shipping Address</p>
                    <p className="text-sm text-amber-100">
                      {typeof selectedOrder.shippingAddress === 'string'
                        ? selectedOrder.shippingAddress
                        : [
                            selectedOrder.shippingAddress.name,
                            selectedOrder.shippingAddress.line1,
                            selectedOrder.shippingAddress.line2,
                            selectedOrder.shippingAddress.city,
                            selectedOrder.shippingAddress.state,
                            selectedOrder.shippingAddress.zip,
                            selectedOrder.shippingAddress.country,
                          ].filter(Boolean).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Gift Wrapping Info */}
              {selectedOrder.giftWrapping && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-2 flex items-center gap-1'}><Gift className="h-3.5 w-3.5" /> Gift Wrapping</p>
                    <div className="space-y-1">
                      {typeof selectedOrder.giftWrapping === 'string' ? (
                        <p className="text-sm text-amber-100">{selectedOrder.giftWrapping}</p>
                      ) : (
                        <>
                          {selectedOrder.giftWrapping.type && <p className="text-sm text-amber-100">Style: <span className="capitalize">{selectedOrder.giftWrapping.type}</span></p>}
                          {selectedOrder.giftWrapping.message && <p className="text-sm text-amber-200/60 italic">&ldquo;{selectedOrder.giftWrapping.message}&rdquo;</p>}
                          {selectedOrder.giftWrapping.from && <p className="text-xs text-amber-200/40">From: {selectedOrder.giftWrapping.from}</p>}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gift Message */}
              {selectedOrder.giftMessage && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-2 flex items-center gap-1'}><Gift className="h-3.5 w-3.5" /> Gift Message</p>
                    <p className="text-sm italic text-amber-200/60">&ldquo;{selectedOrder.giftMessage}&rdquo;</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   3c. CORPORATE INVOICES TAB
   ════════════════════════════════════════════ */
function CorporateInvoicesTab({ token }: { token: string | null }) {
  const { authUser } = useStore()
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  // Fetch corporate profile to get contact email for order lookup
  const { data: profileData } = useQuery({
    queryKey: ['corporate-profile'],
    queryFn: () => apiFetch('/api/corporate/profile', undefined, token),
  })
  const corporateEmail = profileData?.corporate?.contactEmail || authUser?.email || ''

  const { data: ordersData } = useQuery({
    queryKey: ['corporate-orders-invoices', corporateEmail],
    queryFn: () => apiFetch(`/api/orders?email=${encodeURIComponent(corporateEmail)}`, undefined, token),
    enabled: !!corporateEmail,
  })

  const emailDomain = authUser?.email?.split('@')[1] || ''
  const allOrders = ordersData?.orders || []
  const corporateOrderIds = allOrders
    .filter((o: any) => o.email?.endsWith(`@${emailDomain}`) || o.email === authUser?.email)
    .map((o: any) => o.id)

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['corporate-invoices'],
    queryFn: () => apiFetch('/api/invoices', undefined, token),
    enabled: !!token,
  })

  const allInvoices = invoicesData?.invoices || []
  const invoices = allInvoices.filter((inv: any) =>
    corporateOrderIds.includes(inv.orderId) || inv.orderId === null
  )

  const invoiceStatusColor = (s: string) => {
    const m: Record<string, string> = {
      draft: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
      sent: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
      paid: 'bg-green-600/20 text-green-400 border-green-600/30',
      overdue: 'bg-red-600/20 text-red-400 border-red-600/30',
    }
    return m[s] || defCls
  }

  const downloadInvoice = (inv: any) => {
    const rows = [['Invoice #', inv.invoiceNumber], ['Date', fmtDate(inv.createdAt)], ['Amount', fmt(inv.amount)], ['Tax', fmt(inv.tax)], ['Total', fmt(inv.total)], ['Status', inv.status]]
    if (inv.dueDate) rows.push(['Due Date', fmtDate(inv.dueDate)])
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `invoice-${inv.invoiceNumber}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Find the related order for the selected invoice
  const selectedInvoiceOrder = selectedInvoice
    ? allOrders.find((o: any) => o.id === selectedInvoice.orderId)
    : null

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : invoices.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-sm text-amber-200/40">No invoices found for your account</p>
          </CardContent>
        </Card>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Invoice #</TableHead>
                    <TableHead className="text-amber-200/50">Amount</TableHead>
                    <TableHead className="text-amber-200/50">Status</TableHead>
                    <TableHead className="text-amber-200/50">Date</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id} className="border-amber-900/10 hover:bg-amber-900/5 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <TableCell className="text-sm font-medium text-amber-100">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm font-medium text-amber-100">{fmt(inv.total || inv.amount)}</TableCell>
                      <TableCell><Badge className={invoiceStatusColor(inv.status)}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-xs text-amber-200/60">{fmtDate(inv.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => setSelectedInvoice(inv)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-amber-200/40 hover:text-amber-400" onClick={() => downloadInvoice(inv)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" /> Invoice {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3">
                <Badge className={invoiceStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                <span className="text-xs text-amber-200/40">Issued on {fmtDate(selectedInvoice.createdAt)}</span>
              </div>

              {/* Amount Breakdown */}
              <Card className={cardCls}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={lblCls}>Subtotal</span>
                    <span className="text-sm text-amber-100">{fmt(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={lblCls}>Tax</span>
                    <span className="text-sm text-amber-200/60">{fmt(selectedInvoice.tax)}</span>
                  </div>
                  <Separator className="bg-amber-900/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-100">Total</span>
                    <span className="text-lg font-bold text-amber-100">{fmt(selectedInvoice.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-3">
                {selectedInvoice.dueDate && (
                  <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                    <p className={lblCls}>Due Date</p>
                    <p className="mt-1 text-sm font-medium text-amber-100">{fmtDate(selectedInvoice.dueDate)}</p>
                  </div>
                )}
                {selectedInvoice.paidDate && (
                  <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                    <p className={lblCls}>Paid Date</p>
                    <p className="mt-1 text-sm font-medium text-green-400">{fmtDate(selectedInvoice.paidDate)}</p>
                  </div>
                )}
                {selectedInvoice.paymentMethod && (
                  <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                    <p className={lblCls}>Payment Method</p>
                    <p className="mt-1 text-sm font-medium text-amber-100 capitalize">{selectedInvoice.paymentMethod}</p>
                  </div>
                )}
                {selectedInvoice.invoiceNumber && (
                  <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                    <p className={lblCls}>Invoice #</p>
                    <p className="mt-1 text-sm font-medium text-amber-100">{selectedInvoice.invoiceNumber}</p>
                  </div>
                )}
              </div>

              {/* Related Order */}
              {selectedInvoiceOrder && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-2 flex items-center gap-1'}><ShoppingBag className="h-3.5 w-3.5" /> Related Order</p>
                    <div className="space-y-1">
                      <p className="text-sm text-amber-100">Order #: <span className="font-medium">{selectedInvoiceOrder.orderNumber}</span></p>
                      <p className="text-xs text-amber-200/60">Placed: {fmtDate(selectedInvoiceOrder.createdAt)}</p>
                      <p className="text-xs text-amber-200/60">Status: <Badge className={(() => {
                        const m: Record<string, string> = {
                          pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
                          processing: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
                          shipped: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
                          delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
                          cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
                        }
                        return m[selectedInvoiceOrder.status] || defCls
                      })()}>{selectedInvoiceOrder.status}</Badge></p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedInvoice.notes && (
                <Card className={cardCls}>
                  <CardContent className="p-4">
                    <p className={lblCls + ' mb-1'}>Notes</p>
                    <p className="text-sm text-amber-200/60">{selectedInvoice.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Download Button */}
              <div className="flex justify-end">
                <Button className={btnOutline} onClick={() => downloadInvoice(selectedInvoice)}>
                  <Download className="mr-1 h-4 w-4" /> Download CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   5. PROFILE TAB
   ════════════════════════════════════════════ */
function ProfileTab({ token }: { token: string | null }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['corporate-profile'],
    queryFn: () => apiFetch('/api/corporate/profile', undefined, token),
  })

  const corporate = data?.corporate

  const [form, setForm] = useState({
    industry: '', website: '', contactName: '', contactPhone: '',
    address: '', city: '', state: '', zipCode: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (corporate) {
      setForm({
        industry: corporate.industry || '',
        website: corporate.website || '',
        contactName: corporate.contactName || '',
        contactPhone: corporate.contactPhone || '',
        address: corporate.address || '',
        city: corporate.city || '',
        state: corporate.state || '',
        zipCode: corporate.zipCode || '',
      })
    }
  }, [corporate])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      await apiFetch('/api/corporate/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      }, token)
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['corporate-profile'] })
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  }

  if (!corporate) {
    return <div className="py-8 text-center text-amber-200/40">Corporate profile not found</div>
  }

  const isApproved = corporate.approvalStatus === 'approved'
  const isPending = corporate.approvalStatus === 'pending'

  return (
    <div className="space-y-6">
      {/* Approval Status Banner */}
      <Card className={`border-amber-900/30 ${isPending ? 'bg-yellow-950/20 border-yellow-900/30' : isApproved ? 'bg-green-950/20 border-green-900/30' : 'bg-red-950/20 border-red-900/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isPending && <Clock className="h-5 w-5 text-yellow-400" />}
            {isApproved && <CheckCircle2 className="h-5 w-5 text-green-400" />}
            {corporate.approvalStatus === 'rejected' && <AlertTriangle className="h-5 w-5 text-red-400" />}
            <div>
              <p className="text-sm font-medium text-amber-100">Account Status: <Badge className={approvalStatusColor(corporate.approvalStatus)}>{corporate.approvalStatus}</Badge></p>
              {isPending && <p className="mt-1 text-xs text-amber-200/40">Your account is pending approval. Some features may be limited.</p>}
              {isApproved && <p className="mt-1 text-xs text-amber-200/40">Your account is approved. You have full access to all features.</p>}
              {corporate.approvalStatus === 'rejected' && <p className="mt-1 text-xs text-amber-200/40">Your account was rejected. Please contact support.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info (Read-only) */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-400" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className={lblCls}>Company Name</p>
              <p className="mt-1 text-sm font-medium text-amber-100">{corporate.companyName}</p>
            </div>
            <div>
              <p className={lblCls}>GST Number</p>
              <p className="mt-1 text-sm font-medium text-amber-100">{corporate.gstNumber || '—'}</p>
            </div>
            <div>
              <p className={lblCls}>PAN Number</p>
              <p className="mt-1 text-sm font-medium text-amber-100">{corporate.panNumber || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Profile Fields */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Pencil className="h-4 w-4 text-amber-400" /> Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
          {saved && <div className="rounded-md bg-green-600/10 p-3 text-sm text-green-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Profile updated successfully!</div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className={lblCls}>Industry</Label>
              <Input className={`${inputCls} mt-1`} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g., Technology, Finance" />
            </div>
            <div>
              <Label className={lblCls}>Website</Label>
              <Input className={`${inputCls} mt-1`} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="e.g., https://techcorp.in" />
            </div>
            <div>
              <Label className={lblCls}>Contact Name</Label>
              <Input className={`${inputCls} mt-1`} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="e.g., Anil Mehta" />
            </div>
            <div>
              <Label className={lblCls}>Contact Phone</Label>
              <Input className={`${inputCls} mt-1`} value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="e.g., +91-9876543210" />
            </div>
          </div>

          <div>
            <Label className={lblCls}>Address</Label>
            <Input className={`${inputCls} mt-1`} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g., 123 Business Park, Mumbai" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label className={lblCls}>City</Label>
              <Input className={`${inputCls} mt-1`} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g., Mumbai" />
            </div>
            <div>
              <Label className={lblCls}>State</Label>
              <Input className={`${inputCls} mt-1`} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="e.g., Maharashtra" />
            </div>
            <div>
              <Label className={lblCls}>ZIP Code</Label>
              <Input className={`${inputCls} mt-1`} value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} placeholder="e.g., 400001" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button className={btnPrimary} onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Stats */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" /> Account Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3 text-center">
              <p className={lblCls}>Credit Limit</p>
              <p className="mt-1 text-sm font-bold text-amber-100">{fmt(corporate.creditLimit || 0)}</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3 text-center">
              <p className={lblCls}>Credit Used</p>
              <p className="mt-1 text-sm font-bold text-red-400">{fmt(corporate.creditUsed || 0)}</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3 text-center">
              <p className={lblCls}>Discount</p>
              <p className="mt-1 text-sm font-bold text-green-400">{corporate.discountPercent}%</p>
            </div>
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3 text-center">
              <p className={lblCls}>Member Since</p>
              <p className="mt-1 text-sm font-bold text-amber-100">{fmtDate(corporate.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
