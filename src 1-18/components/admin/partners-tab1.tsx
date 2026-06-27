'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import { Separator } from '@/components/ui/separator'
import {
  Globe, Plus, Pencil, Trash2, RefreshCw, Loader2, ExternalLink,
  Link2, Tag, Eye, ArrowUpRight, X, Check, AlertTriangle,
  ShoppingCart, TrendingUp, ImageIcon,
} from 'lucide-react'

/* ─── style constants (matching admin-dashboard) ─── */
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

const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const statusColor = (s: string) => {
  const m: Record<string, string> = {
    active: 'bg-green-600/20 text-green-400 border-green-600/30',
    inactive: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
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
    caratlane: 'bg-amber-600/20 text-amber-400',
    tanishq: 'bg-yellow-600/20 text-yellow-400',
    bluestone: 'bg-cyan-600/20 text-cyan-400',
    voylla: 'bg-rose-600/20 text-rose-400',
    myntra: 'bg-pink-600/20 text-pink-400',
    'nykaa-fashion': 'bg-purple-600/20 text-purple-400',
    'amazon-jewelry': 'bg-orange-600/20 text-orange-400',
    'flipkart-fashion': 'bg-blue-600/20 text-blue-400',
  }
  return colors[slug?.toLowerCase()] || 'bg-stone-600/20 text-stone-400'
}

/* ─── Quick-Add Suggestions ─── */
const QUICK_ADD_SUGGESTIONS = [
  { name: 'CaratLane', slug: 'caratlane', baseUrl: 'https://www.caratlane.com', categories: ['rings', 'necklaces', 'earrings', 'bracelets', 'bangles'], commission: 5, type: 'Jewelry' },
  { name: 'Tanishq', slug: 'tanishq', baseUrl: 'https://www.tanishq.co.in', categories: ['rings', 'necklaces', 'earrings', 'bracelets', 'bangles'], commission: 4, type: 'Jewelry' },
  { name: 'BlueStone', slug: 'bluestone', baseUrl: 'https://www.bluestone.com', categories: ['rings', 'necklaces', 'earrings', 'pendants'], commission: 5, type: 'Jewelry' },
  { name: 'Voylla', slug: 'voylla', baseUrl: 'https://www.voylla.com', categories: ['earrings', 'necklaces', 'bracelets', 'bangles', 'maang-tikka'], commission: 6, type: 'Fashion Jewelry' },
  { name: 'Myntra', slug: 'myntra', baseUrl: 'https://www.myntra.com', categories: ['sarees', 'kurtas', 'dresses', 'tops', 'jewelry'], commission: 8, type: 'Fashion' },
  { name: 'Nykaa Fashion', slug: 'nykaa-fashion', baseUrl: 'https://www.nykaafashion.com', categories: ['sarees', 'kurtas', 'jewelry', 'bags'], commission: 7, type: 'Fashion' },
  { name: 'Amazon Jewelry', slug: 'amazon-jewelry', baseUrl: 'https://www.amazon.in/s?rh=n%3A1955387031', categories: ['rings', 'necklaces', 'earrings', 'bracelets'], commission: 3, type: 'Jewelry' },
  { name: 'Flipkart Fashion', slug: 'flipkart-fashion', baseUrl: 'https://www.flipkart.com/clothing', categories: ['sarees', 'kurtas', 'dresses', 'jewelry'], commission: 4, type: 'Fashion' },
]

const SYNC_INTERVALS = [
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '24 hours', value: 86400 },
]

/* ════════════════════════════════════════════
   MAIN PARTNERS TAB
   ════════════════════════════════════════════ */
export function PartnersTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editPartner, setEditPartner] = useState<any>(null)
  const [showDelete, setShowDelete] = useState<any>(null)
  const [showSyncDialog, setShowSyncDialog] = useState<string | null>(null)
  const [showCategoryMaps, setShowCategoryMaps] = useState<string | null>(null)
  const [syncingPartnerIds, setSyncingPartnerIds] = useState<Set<string>>(new Set())
  const syncPollRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => apiFetch('/api/partners', undefined, token),
  })

  const { data: affiliateStats } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: () => apiFetch('/api/affiliate/stats?period=30d', undefined, token),
  })

  const partners = data?.partners || []

  const deleteMut = useMutation({
    mutationFn: ({ id, removeProducts }: { id: string; removeProducts: boolean }) =>
      apiFetch(`/api/partners/${id}?removeProducts=${removeProducts}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); onMutate(); setShowDelete(null) },
  })

  const syncMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/partners/${id}/sync`, { method: 'POST' }, token),
    onSuccess: (_data, id) => {
      // Start polling for this partner
      setSyncingPartnerIds(prev => new Set(prev).add(id))
      const pollRef = setInterval(() => {
        qc.invalidateQueries({ queryKey: ['partners'] })
        qc.invalidateQueries({ queryKey: ['partner-detail', id] })
      }, 3000)
      syncPollRefs.current.set(id, pollRef)
    },
    onError: (_err, id) => {
      setSyncingPartnerIds(prev => { const n = new Set(prev); n.delete(id); return n })
    },
  })

  // Clean up polling intervals
  useEffect(() => {
    return () => { syncPollRefs.current.forEach(ref => clearInterval(ref)) }
  }, [])

  // Stop polling when a partner is no longer syncing
  useEffect(() => {
    partners.forEach((p: any) => {
      if (p.syncStatus !== 'syncing' && syncingPartnerIds.has(p.id)) {
        const ref = syncPollRefs.current.get(p.id)
        if (ref) { clearInterval(ref); syncPollRefs.current.delete(p.id) }
        setSyncingPartnerIds(prev => { const n = new Set(prev); n.delete(p.id); return n })
      }
    })
  }, [partners, syncingPartnerIds])

  const handleSyncAll = () => {
    partners.filter((p: any) => p.isActive && p.syncStatus !== 'syncing').forEach((p: any) => {
      syncMut.mutate(p.id)
    })
  }

  const isAnySyncing = syncingPartnerIds.size > 0 || partners.some((p: any) => p.syncStatus === 'syncing')
  const [fixingImages, setFixingImages] = useState(false)
  const [fixImagesResult, setFixImagesResult] = useState<string | null>(null)

  const handleFixImages = async () => {
    setFixingImages(true)
    setFixImagesResult(null)
    try {
      const result = await apiFetch('/api/products/fix-images', {
        method: 'POST',
        body: JSON.stringify({ all: true }),
      }, token)
      setFixImagesResult(`Fixed ${result.fixed} of ${result.total} products. ${result.failed} failed.`)
    } catch (e: any) {
      setFixImagesResult(`Error: ${e.message}`)
    } finally {
      setFixingImages(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Affiliate Stats Card */}
      <AffiliateStatsCard stats={affiliateStats} />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditPartner(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Partner
        </Button>
        <Button
          variant="outline"
          className={btnOutline}
          onClick={handleSyncAll}
          disabled={isAnySyncing || partners.filter((p: any) => p.isActive).length === 0}
        >
          {isAnySyncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Sync All Active
        </Button>
        <Button
          variant="outline"
          className={btnOutline}
          onClick={handleFixImages}
          disabled={fixingImages}
        >
          {fixingImages ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-1 h-4 w-4" />}
          Fix Missing Images
        </Button>
        {fixImagesResult && (
          <span className="text-xs text-amber-200/50">{fixImagesResult}</span>
        )}
      </div>

      {/* Partner Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : partners.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-amber-200/40">No partner portals configured</p>
            <p className="mt-1 text-xs text-amber-200/30">Click &ldquo;Add Partner&rdquo; to set up a new partner integration</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p: any, i: number) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`${cardCls} transition-all hover:border-amber-600/30`}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platformIcon(p.slug)}`}>
                        {p.logo ? (
                          <img src={p.logo} alt={p.name} className="h-6 w-6 rounded object-contain" />
                        ) : (
                          <Globe className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-100">{p.name}</p>
                        <p className="text-[10px] text-amber-200/40 max-w-[140px] truncate">{p.baseUrl}</p>
                      </div>
                    </div>
                    <Badge className={statusColor(p.isActive ? 'active' : 'inactive')}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-200/40">Products</span>
                      <span className="text-amber-100 font-medium">{p.productCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-200/40">Sync Status</span>
                      <Badge className={`${statusColor(p.syncStatus || 'idle')} text-[9px] px-1.5 py-0`}>
                        {p.syncStatus === 'syncing' && <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin inline" />}
                        {p.syncStatus || 'idle'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-200/40">Last Synced</span>
                      <span className="text-amber-100">{fmtDateTime(p.lastSyncedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-200/40">Commission</span>
                      <span className="text-amber-100">{p.commission || 0}%</span>
                    </div>
                  </div>

                  {/* Categories */}
                  {p.categories && p.categories.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {p.categories.slice(0, 3).map((c: string, ci: number) => (
                        <Badge key={ci} className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                          {c}
                        </Badge>
                      ))}
                      {p.categories.length > 3 && (
                        <Badge className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[8px] px-1.5 py-0">
                          +{p.categories.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Sync Error */}
                  {p.lastSyncError && (
                    <div className="mb-3 rounded-md bg-red-600/10 p-2 text-[10px] text-red-400 flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{p.lastSyncError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <Separator className="bg-amber-900/20 mb-3" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`${btnOutline} h-7 text-[10px] px-2`}
                      onClick={() => syncMut.mutate(p.id)}
                      disabled={p.syncStatus === 'syncing' || !p.isActive}
                    >
                      {p.syncStatus === 'syncing' ? <Loader2 className="mr-0.5 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-0.5 h-3 w-3" />}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`${btnOutline} h-7 text-[10px] px-2`}
                      onClick={() => { setEditPartner(p); setShowForm(true) }}
                    >
                      <Pencil className="mr-0.5 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`${btnOutline} h-7 text-[10px] px-2`}
                      onClick={() => setShowCategoryMaps(p.id)}
                    >
                      <Link2 className="mr-0.5 h-3 w-3" /> Maps
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400"
                      onClick={() => setShowDelete(p)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sync Progress Dialog */}
      <Dialog open={!!showSyncDialog} onOpenChange={() => setShowSyncDialog(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Sync Progress
            </DialogTitle>
          </DialogHeader>
          {showSyncDialog && <SyncProgressDialog partnerId={showSyncDialog} token={token} onClose={() => setShowSyncDialog(null)} />}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Partner Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editPartner ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
          </DialogHeader>
          <PartnerForm
            token={token}
            partner={editPartner}
            onClose={() => { setShowForm(false); setEditPartner(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['partners'] }); onMutate(); setShowForm(false); setEditPartner(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Partner</DialogTitle>
          </DialogHeader>
          {showDelete && (
            <DeletePartnerConfirm
              partner={showDelete}
              onConfirm={(removeProducts) => deleteMut.mutate({ id: showDelete.id, removeProducts })}
              isPending={deleteMut.isPending}
              onCancel={() => setShowDelete(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Maps Dialog */}
      <Dialog open={!!showCategoryMaps} onOpenChange={() => setShowCategoryMaps(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Category Maps
            </DialogTitle>
          </DialogHeader>
          {showCategoryMaps && <CategoryMapsDialog partnerId={showCategoryMaps} token={token} onClose={() => setShowCategoryMaps(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   AFFILIATE STATS CARD
   ════════════════════════════════════════════ */
function AffiliateStatsCard({ stats }: { stats: any }) {
  const totalClicks = stats?.totalClicks || 0
  const clicksByPlatform = stats?.clicksByPlatform || []
  const estimatedCommission = stats?.estimatedCommission || 0
  const maxClicks = Math.max(...clicksByPlatform.map((c: any) => c.clicks), 1)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total Clicks */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <Card className={cardCls}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10">
                <Eye className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className={lblCls}>Total Clicks</p>
                <p className="text-lg font-bold text-amber-100">{totalClicks.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Clicks by Platform */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className={cardCls}>
          <CardContent className="p-4">
            <p className={`${lblCls} mb-2`}>Clicks by Platform</p>
            {clicksByPlatform.length === 0 ? (
              <p className="text-xs text-amber-200/30">No clicks yet</p>
            ) : (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {clicksByPlatform.map((c: any) => (
                  <div key={c.platform} className="flex items-center gap-2 text-xs">
                    <span className="text-amber-200/40 w-20 truncate">{c.platform}</span>
                    <div className="flex-1 h-2 rounded-full bg-stone-800/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-600/60 transition-all"
                        style={{ width: `${(c.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                    <span className="text-amber-100 w-8 text-right">{c.clicks}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Estimated Commission */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className={cardCls}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/10">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className={lblCls}>Est. Commission</p>
                <p className="text-lg font-bold text-green-400">{fmt(estimatedCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════
   PARTNER FORM (Add/Edit)
   ════════════════════════════════════════════ */
function PartnerForm({ token, partner, onClose, onSaved }: { token: string | null; partner: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    baseUrl: '',
    logo: '',
    isActive: true,
    autoSync: true,
    syncInterval: 3600,
    categories: [] as string[],
    affiliateTag: '',
    commission: '',
    maxProducts: '500',
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(true)

  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name || '',
        slug: partner.slug || '',
        baseUrl: partner.baseUrl || '',
        logo: partner.logo || '',
        isActive: partner.isActive !== undefined ? partner.isActive : true,
        autoSync: partner.autoSync !== undefined ? partner.autoSync : true,
        syncInterval: partner.syncInterval || 3600,
        categories: Array.isArray(partner.categories) ? partner.categories : [],
        affiliateTag: partner.affiliateTag || '',
        commission: String(partner.commission ?? ''),
        maxProducts: String(partner.maxProducts ?? '500'),
      })
      setShowQuickAdd(false)
    }
  }, [partner])

  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  const handleQuickAdd = (suggestion: typeof QUICK_ADD_SUGGESTIONS[0]) => {
    setForm(f => ({
      ...f,
      name: suggestion.name,
      slug: suggestion.slug,
      baseUrl: suggestion.baseUrl,
      categories: suggestion.categories,
      commission: String(suggestion.commission),
    }))
    setShowQuickAdd(false)
  }

  const addCategory = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.categories.includes(tag)) {
      setForm(f => ({ ...f, categories: [...f.categories, tag] }))
    }
    setTagInput('')
  }

  const removeCategory = (cat: string) => {
    setForm(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.baseUrl) {
      setError('Name, slug, and base URL are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        commission: form.commission ? parseFloat(form.commission) : 0,
        maxProducts: parseInt(form.maxProducts) || 500,
      }
      if (partner) {
        await apiFetch(`/api/partners/${partner.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/partners', { method: 'POST', body: JSON.stringify(body) }, token)
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

      {/* Quick Add Suggestions */}
      {!partner && showQuickAdd && (
        <div>
          <Label className={lblCls}>Quick Add — Popular Platforms</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_ADD_SUGGESTIONS.map(s => (
              <button
                key={s.slug}
                type="button"
                className="rounded-lg border border-amber-900/30 bg-stone-800/30 p-2 text-left transition-colors hover:border-amber-600/40 hover:bg-stone-800/60"
                onClick={() => handleQuickAdd(s)}
              >
                <p className="text-xs font-medium text-amber-100">{s.name}</p>
                <p className="text-[10px] text-amber-200/30">{s.type}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-[10px] text-amber-200/30 hover:text-amber-400"
            onClick={() => setShowQuickAdd(false)}
          >
            Or fill in manually...
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className={lblCls}>Name *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="e.g. CaratLane" value={form.name} onChange={e => handleNameChange(e.target.value)} />
        </div>
        <div>
          <Label className={lblCls}>Slug *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="auto-generated" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label className={lblCls}>Base URL *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="https://www.example.com" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label className={lblCls}>Logo URL</Label>
          <Input className={`${inputCls} mt-1`} placeholder="https://..." value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          <Label className={lblCls}>Active</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.autoSync} onCheckedChange={v => setForm(f => ({ ...f, autoSync: v }))} />
          <Label className={lblCls}>Auto Sync</Label>
        </div>

        <div>
          <Label className={lblCls}>Sync Interval</Label>
          <Select value={String(form.syncInterval)} onValueChange={v => setForm(f => ({ ...f, syncInterval: parseInt(v) }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {SYNC_INTERVALS.map(si => (
                <SelectItem key={si.value} value={String(si.value)}>{si.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lblCls}>Affiliate Tag</Label>
          <Input className={`${inputCls} mt-1`} placeholder="aff_3boxes" value={form.affiliateTag} onChange={e => setForm(f => ({ ...f, affiliateTag: e.target.value }))} />
        </div>

        <div>
          <Label className={lblCls}>Commission %</Label>
          <Input type="number" className={`${inputCls} mt-1`} placeholder="5" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
        </div>
        <div>
          <Label className={lblCls}>Max Products</Label>
          <Input type="number" className={`${inputCls} mt-1`} placeholder="500" value={form.maxProducts} onChange={e => setForm(f => ({ ...f, maxProducts: e.target.value }))} />
        </div>
      </div>

      {/* Categories Multi-Tag Input */}
      <div>
        <Label className={lblCls}>Categories to Import</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            className={inputCls}
            placeholder="e.g. rings, necklaces"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
          />
          <Button type="button" size="sm" className={btnPrimary} onClick={addCategory}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {form.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.categories.map(cat => (
              <Badge key={cat} className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-xs pr-1">
                {cat}
                <button type="button" className="ml-1 hover:text-red-400" onClick={() => removeCategory(cat)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {/* Quick category suggestions */}
        <div className="mt-2 flex flex-wrap gap-1">
          {['rings', 'necklaces', 'earrings', 'bracelets', 'sarees', 'kurtas', 'bangles', 'pendants', 'dresses', 'tops']
            .filter(c => !form.categories.includes(c))
            .map(c => (
              <button
                key={c}
                type="button"
                className="rounded border border-amber-900/20 px-1.5 py-0.5 text-[10px] text-amber-200/30 hover:border-amber-600/40 hover:text-amber-400"
                onClick={() => setForm(f => ({ ...f, categories: [...f.categories, c] }))}
              >
                + {c}
              </button>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {partner ? 'Update' : 'Create'} Partner
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   SYNC PROGRESS DIALOG
   ════════════════════════════════════════════ */
function SyncProgressDialog({ partnerId, token, onClose }: { partnerId: string; token: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['partner-detail', partnerId],
    queryFn: () => apiFetch(`/api/partners/${partnerId}`, undefined, token),
    refetchInterval: 3000,
  })

  const partner = data
  const syncLogs = partner?.syncLogs || []
  const isSyncing = partner?.syncStatus === 'syncing'

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <>
          {/* Status */}
          <div className="flex items-center gap-3">
            {isSyncing ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            ) : partner?.syncStatus === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            ) : (
              <Check className="h-5 w-5 text-green-400" />
            )}
            <div>
              <p className="text-sm font-medium text-amber-100">
                {isSyncing ? 'Syncing...' : partner?.syncStatus === 'error' ? 'Sync Failed' : 'Sync Complete'}
              </p>
              <p className="text-xs text-amber-200/40">
                {isSyncing ? 'Polling for updates every 3 seconds...' : `Last synced: ${fmtDateTime(partner?.lastSyncedAt)}`}
              </p>
            </div>
          </div>

          {/* Error */}
          {partner?.lastSyncError && (
            <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{partner.lastSyncError}</span>
            </div>
          )}

          {/* Sync Logs */}
          {syncLogs.length > 0 && (
            <div>
              <Label className={lblCls}>Sync History</Label>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                {syncLogs.map((log: any) => (
                  <div key={log.id} className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${statusColor(log.status)} text-[9px] px-1.5 py-0`}>
                          {log.status}
                        </Badge>
                        <span className="text-[10px] text-amber-200/40">{fmtDateTime(log.startedAt)}</span>
                      </div>
                      {log.completedAt && (
                        <span className="text-[10px] text-amber-200/30">{fmtDateTime(log.completedAt)}</span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[10px] text-amber-200/50">
                      {log.productsFound !== null && <span>Found: {log.productsFound}</span>}
                      {log.productsAdded !== null && <span>Added: {log.productsAdded}</span>}
                      {log.productsUpdated !== null && <span>Updated: {log.productsUpdated}</span>}
                    </div>
                    {log.error && (
                      <p className="mt-1 text-[10px] text-red-400">{log.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close button */}
          {!isSyncing && (
            <div className="flex justify-end">
              <Button className={btnPrimary} onClick={onClose}>Close</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   DELETE PARTNER CONFIRM
   ════════════════════════════════════════════ */
function DeletePartnerConfirm({ partner, onConfirm, isPending, onCancel }: {
  partner: any; onConfirm: (removeProducts: boolean) => void; isPending: boolean; onCancel: () => void
}) {
  const [removeProducts, setRemoveProducts] = useState(false)

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-200/60">
        Are you sure you want to delete <strong className="text-amber-100">{partner?.name}</strong>?
      </p>

      {partner?.productCount > 0 && (
        <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
          <p className="text-xs text-amber-200/60 mb-2">
            This partner has <strong className="text-amber-100">{partner.productCount}</strong> imported products.
          </p>
          <div className="flex items-center gap-2">
            <Switch checked={removeProducts} onCheckedChange={setRemoveProducts} />
            <Label className={lblCls}>Delete imported products too</Label>
          </div>
          <p className="mt-1 text-[10px] text-amber-200/30">
            {removeProducts ? 'Products will be permanently deleted.' : 'Products will be marked as "removed" but kept in the database.'}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" className={btnOutline} onClick={onCancel}>Cancel</Button>
        <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => onConfirm(removeProducts)} disabled={isPending}>
          {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   CATEGORY MAPS DIALOG
   ════════════════════════════════════════════ */
function CategoryMapsDialog({ partnerId, token, onClose }: { partnerId: string; token: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [maps, setMaps] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: partnerData } = useQuery({
    queryKey: ['partner-detail', partnerId],
    queryFn: () => apiFetch(`/api/partners/${partnerId}`, undefined, token),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch('/api/categories', undefined, token),
  })

  const localCategories = categoriesData?.categories || []
  const partnerCategories: string[] = partnerData?.categories || []
  const existingMaps: any[] = partnerData?.categoryMaps || []

  // Initialize maps from existing + all partner categories
  useEffect(() => {
    if (partnerData && existingMaps.length >= 0) {
      const initialized = partnerCategories.map(cat => {
        const existingMap = existingMaps.find((m: any) => m.partnerCatSlug === cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        return {
          partnerCatName: cat,
          partnerCatSlug: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          localCatId: existingMap?.localCatId || '',
        }
      })
      setMaps(initialized)
    }
  }, [partnerData, existingMaps.length, partnerCategories.length])

  const handleMapChange = (partnerCatSlug: string, localCatId: string) => {
    setMaps(prev => prev.map(m => m.partnerCatSlug === partnerCatSlug ? { ...m, localCatId } : m))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Save each map
      for (const map of maps) {
        if (map.localCatId) {
          await apiFetch(`/api/partners/${partnerId}/category-maps`, {
            method: 'POST',
            body: JSON.stringify({
              partnerCatName: map.partnerCatName,
              partnerCatSlug: map.partnerCatSlug,
              localCatId: map.localCatId,
            }),
          }, token)
        }
      }
      qc.invalidateQueries({ queryKey: ['partners'] })
      qc.invalidateQueries({ queryKey: ['partner-detail', partnerId] })
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <p className="text-xs text-amber-200/40">
        Map partner categories to your local categories. Products imported from each partner category will be assigned to the corresponding local category.
      </p>

      {maps.length === 0 ? (
        <p className="py-8 text-center text-amber-200/30 text-sm">No categories configured for this partner.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {maps.map(map => (
            <div key={map.partnerCatSlug} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-100 truncate">{map.partnerCatName}</p>
                <p className="text-[10px] text-amber-200/30">{map.partnerCatSlug}</p>
              </div>
              <ArrowUpRight className="h-3 w-3 text-amber-200/20 shrink-0" />
              <div className="flex-1">
                <Select value={map.localCatId} onValueChange={v => handleMapChange(map.partnerCatSlug, v)}>
                  <SelectTrigger className={`${selCls} h-8 text-xs`}>
                    <SelectValue placeholder="Select local category" />
                  </SelectTrigger>
                  <SelectContent className={selContentCls}>
                    {localCategories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save Maps
        </Button>
      </div>
    </div>
  )
}
