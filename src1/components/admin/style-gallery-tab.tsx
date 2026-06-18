'use client'

import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sparkles, Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Upload, X, Search, Eye,
} from 'lucide-react'

/* ─── style constants (matching admin-dashboard theme) ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const inputCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100 placeholder:text-amber-200/30'
const lblCls = 'text-amber-200/60 text-xs'
const selCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100'
const selContentCls = 'border-amber-900/40 bg-stone-950'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'

const authH = (t: string | null) => t ? { Authorization: `Bearer ${t}` } : {}

async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...authH(token), ...opts.headers } })
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

interface StyleItem {
  id: string; name: string; description: string; category: string; tags: string[];
  imageUrl: string; prompt: string; isPublic: boolean; createdAt: string; updatedAt: string;
}

export function StyleGalleryTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<StyleItem | null>(null)
  const [viewItem, setViewItem] = useState<StyleItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['style-gallery', page, search, categoryFilter],
    queryFn: () => apiFetch(`/api/admin/style-gallery?page=${page}&limit=12${search ? `&search=${search}` : ''}${categoryFilter ? `&category=${categoryFilter}` : ''}`),
  })

  const styles: StyleItem[] = data?.styles || []
  const pagination = data?.pagination

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/style-gallery/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['style-gallery'] }) },
  })

  const togglePublicMut = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiFetch(`/api/admin/style-gallery/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['style-gallery'] }) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-amber-100">AI Style Gallery</h2>
        </div>
        <Button className={btnPrimary} onClick={() => { setEditItem(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Add Style
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/40" />
          <Input className={`${inputCls} pl-9`} placeholder="Search styles..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={`${selCls} w-44`}><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="traditional">Traditional</SelectItem>
            <SelectItem value="contemporary">Contemporary</SelectItem>
            <SelectItem value="fusion">Fusion</SelectItem>
            <SelectItem value="minimalist">Minimalist</SelectItem>
            <SelectItem value="bridal">Bridal</SelectItem>
            <SelectItem value="festive">Festive</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-400" /></div>
      ) : styles.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-amber-200/50">
            <Sparkles className="mb-3 h-12 w-12" />
            <p className="text-sm">No styles found. Create your first AI style!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {styles.map(style => (
              <Card key={style.id} className={`${cardCls} group overflow-hidden`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-800/50">
                  {style.imageUrl ? (
                    <img src={style.imageUrl} alt={style.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><ImageIcon className="h-12 w-12 text-amber-200/20" /></div>
                  )}
                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="outline" className={btnOutline} onClick={() => setViewItem(style)}><Eye className="mr-1 h-3 w-3" /> View</Button>
                    <Button size="sm" variant="outline" className={btnOutline} onClick={() => { setEditItem(style); setShowForm(true) }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" className="border-red-900/40 text-red-400 hover:bg-red-900/20" onClick={() => { if (confirm('Delete this style?')) deleteMut.mutate(style.id) }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  {style.isPublic && <Badge className="absolute right-2 top-2 bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">Public</Badge>}
                </div>
                <CardContent className="p-3">
                  <h3 className="truncate text-sm font-medium text-amber-100">{style.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-amber-200/50">{style.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {style.tags?.slice(0, 3).map((tag, i) => (
                      <Badge key={i} className="bg-amber-600/15 text-amber-300/70 border-amber-600/20 text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" className={btnOutline} size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-xs text-amber-200/50">Page {page} of {pagination.pages}</span>
              <Button variant="outline" className={btnOutline} size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              {editItem ? 'Edit Style' : 'Add New Style'}
            </DialogTitle>
          </DialogHeader>
          <StyleForm initial={editItem} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['style-gallery'] }) }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-2xl">
          <DialogHeader><DialogTitle className="text-amber-100">{viewItem?.name}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              {viewItem.imageUrl && <div className="overflow-hidden rounded-lg"><img src={viewItem.imageUrl} alt={viewItem.name} className="h-auto w-full object-cover" /></div>}
              <div><p className="text-xs text-amber-200/50">Description</p><p className="text-sm text-amber-100">{viewItem.description || 'No description'}</p></div>
              <div><p className="text-xs text-amber-200/50">Category</p><Badge className="bg-amber-600/15 text-amber-300/70 border-amber-600/20">{viewItem.category}</Badge></div>
              {viewItem.tags?.length > 0 && <div><p className="text-xs text-amber-200/50">Tags</p><div className="mt-1 flex flex-wrap gap-1">{viewItem.tags.map((tag, i) => (<Badge key={i} className="bg-amber-600/15 text-amber-300/70 border-amber-600/20">{tag}</Badge>))}</div></div>}
              {viewItem.prompt && <div><p className="text-xs text-amber-200/50">AI Prompt</p><div className="rounded-md border border-amber-900/30 bg-stone-800/50 p-3"><p className="text-xs text-amber-200/70 whitespace-pre-wrap">{viewItem.prompt}</p></div></div>}
              <div className="flex items-center justify-between border-t border-amber-900/30 pt-3">
                <div className="flex items-center gap-2">
                  <Badge className={viewItem.isPublic ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-stone-600/20 text-stone-400 border-stone-600/30'}>{viewItem.isPublic ? 'Public' : 'Private'}</Badge>
                  <Button size="sm" variant="outline" className={btnOutline} onClick={() => { togglePublicMut.mutate({ id: viewItem.id, isPublic: !viewItem.isPublic }); setViewItem({ ...viewItem, isPublic: !viewItem.isPublic }) }}>{viewItem.isPublic ? 'Make Private' : 'Make Public'}</Button>
                </div>
                <Button size="sm" variant="outline" className={btnOutline} onClick={() => { setViewItem(null); setEditItem(viewItem); setShowForm(true) }}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StyleForm({ initial, onClose, onSaved }: { initial: StyleItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '', description: initial?.description || '', category: initial?.category || '',
    tags: initial?.tags?.join(', ') || '', imageUrl: initial?.imageUrl || '', prompt: initial?.prompt || '',
    isPublic: initial?.isPublic ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (files: FileList) => {
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.urls?.[0]) setForm(f => ({ ...f, imageUrl: data.urls[0] }))
      else throw new Error(data.error || 'Upload failed')
    } catch (e: any) { setError(e.message) } finally { setUploading(false) }
  }

  const handleSubmit = async () => {
    if (!form.name || !form.category) { setError('Name and category are required'); return }
    setSaving(true); setError('')
    try {
      const body = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] }
      if (initial) { await apiFetch(`/api/admin/style-gallery/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) }) }
      else { await apiFetch('/api/admin/style-gallery', { method: 'POST', body: JSON.stringify(body) }) }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div>
        <Label className={lblCls}>Style Image</Label>
        <div className="mt-1 cursor-pointer rounded-lg border-2 border-dashed border-amber-900/30 bg-stone-800/30 p-4 text-center transition-colors hover:border-amber-400 hover:bg-amber-900/10" onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.length) handleUpload(e.target.files) }} />
          {uploading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-400" /> : form.imageUrl ? (
            <div className="relative"><img src={form.imageUrl} alt="Preview" className="mx-auto max-h-48 rounded-md object-cover" /><button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, imageUrl: '' })) }} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"><X className="h-3 w-3" /></button></div>
          ) : (<div className="py-4"><Upload className="mx-auto h-8 w-8 text-amber-200/30" /><p className="mt-2 text-xs text-amber-200/40">Click or drag to upload</p></div>)}
        </div>
      </div>
      <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Style name" /></div>
      <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this style..." /></div>
      <div><Label className={lblCls}>Category *</Label><Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}><SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent className={selContentCls}><SelectItem value="traditional">Traditional</SelectItem><SelectItem value="contemporary">Contemporary</SelectItem><SelectItem value="fusion">Fusion</SelectItem><SelectItem value="minimalist">Minimalist</SelectItem><SelectItem value="bridal">Bridal</SelectItem><SelectItem value="festive">Festive</SelectItem><SelectItem value="casual">Casual</SelectItem></SelectContent></Select></div>
      <div><Label className={lblCls}>Tags (comma separated)</Label><Input className={`${inputCls} mt-1`} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. silk, embroidery, bridal" /></div>
      <div><Label className={lblCls}>AI Prompt</Label><Textarea className={`${inputCls} mt-1`} rows={4} value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))} placeholder="Describe the style for AI generation..." /></div>
      <div className="flex items-center gap-3"><Label className={lblCls}>Public</Label><button className={`relative h-5 w-9 rounded-full transition-colors ${form.isPublic ? 'bg-amber-600' : 'bg-stone-700'}`} onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.isPublic ? 'left-[18px]' : 'left-0.5'}`} /></button></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{initial ? 'Update' : 'Create'} Style</Button>
      </div>
    </div>
  )
}
