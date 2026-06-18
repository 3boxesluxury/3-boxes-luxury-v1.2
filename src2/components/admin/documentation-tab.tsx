'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  FileText, Download, Shield, Lock, BookOpen, Cpu, Users,
  Rocket, Lightbulb, ArrowLeft, Loader2, AlertTriangle,
  ChevronRight, Search, KeyRound, Eye, EyeOff, UserPlus,
  Trash2, Settings, X, CheckCircle, Clock,
} from 'lucide-react'
import jsPDF from 'jspdf'
import ReactMarkdown from 'react-markdown'

// ── Style constants (matching admin dashboard) ──────────────────────
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'
const btnDanger = 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30'
const inputCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100 placeholder:text-amber-200/30'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...authH(token), ...opts.headers } })
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

// ── Document categories with icons and colors ──────────────────────
const CATEGORIES = [
  { id: 'technical', label: 'Technical', icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/30' },
  { id: 'sop', label: 'SOPs', icon: BookOpen, color: 'text-green-400', bg: 'bg-green-600/10 border-green-600/30' },
  { id: 'ai-strategy', label: 'AI Strategy', icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-600/30' },
  { id: 'deployment', label: 'Deployment', icon: Rocket, color: 'text-cyan-400', bg: 'bg-cyan-600/10 border-cyan-600/30' },
  { id: 'patent', label: 'Patents', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-600/10 border-amber-600/30' },
] as const

const ACCESS_LEVELS = [
  { id: 'public', label: 'Public', color: 'bg-green-600/20 text-green-400 border-green-600/30' },
  { id: 'internal', label: 'Internal', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
  { id: 'restricted', label: 'Restricted', color: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
  { id: 'confidential', label: 'Confidential', color: 'bg-red-600/20 text-red-400 border-red-600/30' },
] as const

interface DocItem {
  id: string
  title: string
  content: string
  category: string
  accessLevel: string
  tags: string[]
  version: string
  author: { id: string; name: string }
  vaultProtected: boolean
  vaultPassword?: string
  allowedRoles: string[]
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
}

interface VaultAccess {
  docId: string
  expiresAt: number
}

/* ══════════════════════════════════════════════════════════════════════
   DOCUMENTATION TAB — Card-based Document Hub with Vault Protection
   ══════════════════════════════════════════════════════════════════════ */
export function DocumentationTab({ token }: { token: string | null }) {
  const qc = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState<DocItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [vaultAccesses, setVaultAccesses] = useState<Record<string, VaultAccess>>({})
  const [vaultInput, setVaultInput] = useState('')
  const [vaultError, setVaultError] = useState('')
  const [showVaultModal, setShowVaultModal] = useState<DocItem | null>(null)
  const [accessFilter, setAccessFilter] = useState<string>('all')
  const [showAccessManager, setShowAccessManager] = useState<DocItem | null>(null)

  // Fetch documents
  const { data: docsData, isLoading } = useQuery({
    queryKey: ['docs', selectedCategory, searchQuery, accessFilter],
    queryFn: () => {
      let url = `/api/admin/docs?limit=50`
      if (selectedCategory) url += `&category=${selectedCategory}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      if (accessFilter !== 'all') url += `&accessLevel=${accessFilter}`
      return apiFetch(url, undefined, token)
    },
  })

  const docs: DocItem[] = docsData?.docs || docsData?.documents || []

  // Mutations
  const createMut = useMutation({
    mutationFn: (body: any) => apiFetch('/api/admin/docs', { method: 'POST', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs'] }); setShowForm(false); setEditDoc(null) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: any) => apiFetch(`/api/admin/docs/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs'] }); setShowForm(false); setEditDoc(null) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/docs/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs'] }); if (selectedDoc?.id === deleteMut.variables) setSelectedDoc(null) },
  })

  // Vault password check
  const hasVaultAccess = (doc: DocItem): boolean => {
    if (!doc.vaultProtected) return true
    const access = vaultAccesses[doc.id]
    if (!access) return false
    return Date.now() < access.expiresAt
  }

  const unlockVault = (doc: DocItem) => {
    if (vaultInput === doc.vaultPassword) {
      setVaultAccesses(prev => ({ ...prev, [doc.id]: { docId: doc.id, expiresAt: Date.now() + 3600000 } }))
      setShowVaultModal(null)
      setVaultInput('')
      setVaultError('')
      setSelectedDoc(doc)
    } else {
      setVaultError('Incorrect vault password')
    }
  }

  const exportPDF = (doc: DocItem) => {
    const pdf = new jsPDF()
    pdf.setFontSize(20)
    pdf.text(doc.title, 20, 20)
    pdf.setFontSize(10)
    pdf.text(`Category: ${doc.category} | Access: ${doc.accessLevel} | Version: ${doc.version}`, 20, 30)
    pdf.setFontSize(12)
    const lines = pdf.splitTextToSize(doc.content || '', 170)
    pdf.text(lines, 20, 45)
    pdf.save(`${doc.title.replace(/\s+/g, '_')}.pdf`)
  }

  const handleDocClick = (doc: DocItem) => {
    if (doc.vaultProtected && !hasVaultAccess(doc)) {
      setShowVaultModal(doc)
    } else {
      setSelectedDoc(doc)
    }
  }

  // Filtered docs by category
  const filteredDocs = selectedCategory
    ? docs.filter(d => d.category === selectedCategory)
    : docs

  const getCategoryInfo = (catId: string) => CATEGORIES.find(c => c.id === catId)
  const getAccessInfo = (levelId: string) => ACCESS_LEVELS.find(a => a.id === levelId)

  // ── Category Hub View ──
  const renderHub = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/40" />
        <Input
          className={`${inputCls} pl-9`}
          placeholder="Search documents..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Access Level Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={accessFilter === 'all' ? 'default' : 'outline'}
          className={accessFilter === 'all' ? btnPrimary : btnOutline}
          onClick={() => setAccessFilter('all')}
        >
          All Access
        </Button>
        {ACCESS_LEVELS.map(level => (
          <Button
            key={level.id}
            size="sm"
            variant={accessFilter === level.id ? 'default' : 'outline'}
            className={accessFilter === level.id ? btnPrimary : btnOutline}
            onClick={() => setAccessFilter(level.id)}
          >
            {level.label}
          </Button>
        ))}
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CATEGORIES.map(cat => {
          const count = docs.filter(d => d.category === cat.id).length
          const Icon = cat.icon
          return (
            <Card
              key={cat.id}
              className={`${cardCls} cursor-pointer transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-900/20 ${selectedCategory === cat.id ? 'border-amber-500 ring-1 ring-amber-500/30' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${cat.bg} border`}>
                  <Icon className={`h-7 w-7 ${cat.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-amber-100">{cat.label}</h3>
                <p className="mt-1 text-2xl font-bold text-amber-400">{count}</p>
                <p className="text-xs text-amber-200/40">documents</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-amber-200/50">
            <FileText className="mb-3 h-12 w-12" />
            <p className="text-sm">No documents found. Create your first document!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map(doc => {
            const catInfo = getCategoryInfo(doc.category)
            const accessInfo = getAccessInfo(doc.accessLevel)
            const CatIcon = catInfo?.icon || FileText
            return (
              <Card
                key={doc.id}
                className={`${cardCls} cursor-pointer transition-all hover:border-amber-500/30 hover:bg-stone-800/50`}
                onClick={() => handleDocClick(doc)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${catInfo?.bg || 'bg-stone-600/10 border-stone-600/30'} border`}>
                    <CatIcon className={`h-5 w-5 ${catInfo?.color || 'text-stone-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-medium text-amber-100">{doc.title}</h4>
                      {doc.vaultProtected && <Lock className="h-3.5 w-3.5 text-amber-400" />}
                      {doc.status === 'draft' && <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-[10px]">Draft</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge className={`${accessInfo?.color || ''} text-[10px]`}>{doc.accessLevel}</Badge>
                      <span className="text-[10px] text-amber-200/40">v{doc.version}</span>
                      <span className="text-[10px] text-amber-200/40">by {doc.author?.name || 'Unknown'}</span>
                      {doc.tags?.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] text-amber-200/30">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => exportPDF(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditDoc(doc); setShowForm(true) }}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => { if (confirm('Delete this document?')) deleteMut.mutate(doc.id) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Document Button */}
      <div className="flex justify-end">
        <Button className={btnPrimary} onClick={() => { setEditDoc(null); setShowForm(true) }}>
          <FileText className="mr-2 h-4 w-4" /> Add Document
        </Button>
      </div>
    </div>
  )

  // ── Document Detail View ──
  const renderDetail = () => {
    if (!selectedDoc) return null
    const catInfo = getCategoryInfo(selectedDoc.category)
    const accessInfo = getAccessInfo(selectedDoc.accessLevel)
    const CatIcon = catInfo?.icon || FileText

    return (
      <div className="space-y-4">
        <Button variant="ghost" className={btnOutline} onClick={() => setSelectedDoc(null)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Documents
        </Button>

        <Card className={cardCls}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${catInfo?.bg || ''} border`}>
                  <CatIcon className={`h-6 w-6 ${catInfo?.color || ''}`} />
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-100">{selectedDoc.title}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className={catInfo?.bg || ''}>{selectedDoc.category}</Badge>
                    <Badge className={`${accessInfo?.color || ''} text-[10px]`}>{selectedDoc.accessLevel}</Badge>
                    <span className="text-xs text-amber-200/40">v{selectedDoc.version}</span>
                    {selectedDoc.vaultProtected && (
                      <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
                        <Lock className="mr-1 h-3 w-3" /> Vault Protected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className={btnOutline} onClick={() => exportPDF(selectedDoc)}>
                  <Download className="mr-1 h-3.5 w-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" className={btnOutline} onClick={() => { setEditDoc(selectedDoc); setShowForm(true) }}>
                  <Settings className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className={btnOutline} onClick={() => setShowAccessManager(selectedDoc)}>
                  <KeyRound className="mr-1 h-3.5 w-3.5" /> Access
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-amber-900/30" />
          <CardContent className="pt-4">
            <div className="rounded-lg border border-amber-900/20 bg-stone-800/30 p-4">
              <div className="prose prose-invert prose-amber max-w-none text-sm text-amber-100/80">
                <ReactMarkdown>{selectedDoc.content || 'No content available.'}</ReactMarkdown>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {selectedDoc.tags?.map((tag, i) => (
                <Badge key={i} className="bg-amber-600/10 text-amber-300/60 border-amber-600/20 text-[10px]">#{tag}</Badge>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-amber-200/40">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created {new Date(selectedDoc.createdAt).toLocaleDateString()}</span>
              <span>Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
              <span>by {selectedDoc.author?.name || 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selectedDoc ? renderDetail() : renderHub()}

      {/* ── Vault Unlock Modal ── */}
      <Dialog open={!!showVaultModal} onOpenChange={() => { setShowVaultModal(null); setVaultInput(''); setVaultError('') }}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <Lock className="h-5 w-5 text-amber-400" /> Vault Protected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-amber-200/60">This document is vault-protected. Enter the password to access it.</p>
            {vaultError && <p className="text-xs text-red-400">{vaultError}</p>}
            <div className="relative">
              <Input
                className={inputCls}
                type="password"
                placeholder="Vault password"
                value={vaultInput}
                onChange={e => setVaultInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && showVaultModal) unlockVault(showVaultModal) }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className={btnOutline} onClick={() => { setShowVaultModal(null); setVaultInput(''); setVaultError('') }}>Cancel</Button>
            <Button className={btnPrimary} onClick={() => showVaultModal && unlockVault(showVaultModal)}>
              <KeyRound className="mr-1 h-4 w-4" /> Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Document Form Modal ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <FileText className="h-5 w-5 text-amber-400" />
              {editDoc ? 'Edit Document' : 'Create Document'}
            </DialogTitle>
          </DialogHeader>
          <DocForm
            initial={editDoc}
            token={token}
            onClose={() => { setShowForm(false); setEditDoc(null) }}
            onSaved={(doc) => {
              setShowForm(false)
              setEditDoc(null)
              qc.invalidateQueries({ queryKey: ['docs'] })
              if (editDoc) setSelectedDoc(doc)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Access Manager Modal ── */}
      <Dialog open={!!showAccessManager} onOpenChange={() => setShowAccessManager(null)}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <KeyRound className="h-5 w-5 text-amber-400" /> Access Control
            </DialogTitle>
          </DialogHeader>
          {showAccessManager && (
            <AccessManager doc={showAccessManager} token={token} onClose={() => setShowAccessManager(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ════════════════════════════════════════════
   DOCUMENT FORM
   ════════════════════════════════════════════ */
function DocForm({ initial, token, onClose, onSaved }: {
  initial: DocItem | null
  token: string | null
  onClose: () => void
  onSaved: (doc: DocItem) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    content: initial?.content || '',
    category: initial?.category || 'technical',
    accessLevel: initial?.accessLevel || 'internal',
    tags: initial?.tags?.join(', ') || '',
    version: initial?.version || '1.0',
    status: initial?.status || 'draft' as 'draft' | 'published' | 'archived',
    vaultProtected: initial?.vaultProtected ?? false,
    vaultPassword: initial?.vaultPassword || '',
    allowedRoles: initial?.allowedRoles || ['admin'],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.title || !form.category) { setError('Title and category are required'); return }
    setSaving(true); setError('')
    try {
      const body = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        vaultPassword: form.vaultProtected ? form.vaultPassword : undefined,
      }
      let result
      if (initial) {
        result = await apiFetch(`/api/admin/docs/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) }, token)
      } else {
        result = await apiFetch('/api/admin/docs', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved(result?.doc || result?.document || { ...initial, ...body, id: initial?.id || 'new' })
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-amber-200/60 text-xs">Title *</Label>
          <Input className={`${inputCls} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" />
        </div>
        <div>
          <Label className="text-amber-200/60 text-xs">Version</Label>
          <Input className={`${inputCls} mt-1`} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-amber-200/60 text-xs">Category *</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className={`${inputCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className="border-amber-900/40 bg-stone-950">
              {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-amber-200/60 text-xs">Access Level</Label>
          <Select value={form.accessLevel} onValueChange={v => setForm(f => ({ ...f, accessLevel: v }))}>
            <SelectTrigger className={`${inputCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className="border-amber-900/40 bg-stone-950">
              {ACCESS_LEVELS.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-amber-200/60 text-xs">Content (Markdown)</Label>
        <textarea
          className={`${inputCls} mt-1 w-full rounded-md border px-3 py-2 text-sm`}
          rows={10}
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Write document content in Markdown..."
        />
      </div>

      <div>
        <Label className="text-amber-200/60 text-xs">Tags (comma separated)</Label>
        <Input className={`${inputCls} mt-1`} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. api, authentication, v2" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-amber-200/60 text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
            <SelectTrigger className={`${inputCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className="border-amber-900/40 bg-stone-950">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <div className="flex items-center gap-3 mt-5">
            <Switch checked={form.vaultProtected} onCheckedChange={v => setForm(f => ({ ...f, vaultProtected: v }))} />
            <Label className="text-amber-200/60 text-xs">Vault Protected</Label>
          </div>
        </div>
      </div>

      {form.vaultProtected && (
        <div>
          <Label className="text-amber-200/60 text-xs">Vault Password</Label>
          <Input className={`${inputCls} mt-1`} type="password" value={form.vaultPassword} onChange={e => setForm(f => ({ ...f, vaultPassword: e.target.value }))} placeholder="Set vault password" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {initial ? 'Update' : 'Create'} Document
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   ACCESS MANAGER
   ════════════════════════════════════════════ */
function AccessManager({ doc, token, onClose }: {
  doc: DocItem
  token: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [roles, setRoles] = useState<string[]>(doc.allowedRoles || ['admin'])

  const { data: usersData } = useQuery({
    queryKey: ['docs-access-users'],
    queryFn: () => apiFetch('/api/admin/users?limit=100', undefined, token),
  })

  const updateAccessMut = useMutation({
    mutationFn: (allowedRoles: string[]) => apiFetch(`/api/admin/docs/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ allowedRoles }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs'] }); onClose() },
  })

  const toggleRole = (role: string) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-amber-200/60 mb-3">Select roles that can access this document:</p>
        <div className="space-y-2">
          {['admin', 'manager', 'agent', 'team', 'viewer'].map(role => (
            <div key={role} className="flex items-center gap-2">
              <Checkbox
                checked={roles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
              />
              <span className="text-sm text-amber-100 capitalize">{role}</span>
            </div>
          ))}
        </div>
      </div>

      {doc.vaultProtected && (
        <div className="rounded-lg border border-amber-600/20 bg-amber-600/5 p-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Vault Protected</span>
          </div>
          <p className="mt-1 text-xs text-amber-200/50">Users must enter the vault password even with role access.</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={() => updateAccessMut.mutate(roles)} disabled={updateAccessMut.isPending}>
          {updateAccessMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Save Access
        </Button>
      </div>
    </div>
  )
}
