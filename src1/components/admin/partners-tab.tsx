'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
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
import { Switch } from '@/components/ui/switch'
import {
  Handshake, Plus, Pencil, Trash2, Loader2, Search, ExternalLink, Building2, Mail, Globe,
} from 'lucide-react'

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

const statusColor = (s: string) => {
  const m: Record<string, string> = { active: 'bg-green-600/20 text-green-400 border-green-600/30', inactive: 'bg-stone-600/20 text-stone-400 border-stone-600/30', pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30', suspended: 'bg-red-600/20 text-red-400 border-red-600/30' }
  return m[s] || defCls
}

const typeColor = (t: string) => {
  const m: Record<string, string> = { supplier: 'bg-blue-600/20 text-blue-400 border-blue-600/30', manufacturer: 'bg-purple-600/20 text-purple-400 border-purple-600/30', distributor: 'bg-amber-600/20 text-amber-400 border-amber-600/30', logistics: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30', marketing: 'bg-pink-600/20 text-pink-400 border-pink-600/30', technology: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30' }
  return m[t] || defCls
}

interface Partner {
  id: string; name: string; type: string; status: string; email: string; phone: string; website: string;
  contactPerson: string; description: string; commission: number; isVerified: boolean;
  address: { city: string; state: string; country: string }; stats: { totalOrders: number; totalRevenue: number; rating: number }; createdAt: string; updatedAt: string
}

export function PartnersTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editPartner, setEditPartner] = useState<Partner | null>(null)
  const [viewPartner, setViewPartner] = useState<Partner | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-partners', page, search, typeFilter, statusFilter],
    queryFn: () => apiFetch(`/api/admin/partners?page=${page}&limit=20${search ? `&search=${search}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`, undefined, token),
  })

  const partners: Partner[] = data?.partners || []
  const pagination = data?.pagination
  const summary = data?.summary

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/partners/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-partners'] }); onMutate() },
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/admin/partners/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-partners'] }); onMutate() },
  })

  const verifyMut = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) => apiFetch(`/api/admin/partners/${id}`, { method: 'PATCH', body: JSON.stringify({ isVerified }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-partners'] }); onMutate() },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-amber-100">Partners</h2>
          {summary && <span className="text-xs text-amber-200/50">({summary.total} total, {summary.active} active)</span>}
        </div>
        <Button className={btnPrimary} onClick={() => { setEditPartner(null); setShowForm(true) }}><Plus className="mr-1 h-4 w-4" /> Add Partner</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className={cardCls}><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-100">{summary.total || 0}</p><p className="text-xs text-amber-200/50">Total Partners</p></CardContent></Card>
          <Card className={cardCls}><CardContent className="p-3 text-center"><p className="text-xl font-bold text-green-400">{summary.active || 0}</p><p className="text-xs text-amber-200/50">Active</p></CardContent></Card>
          <Card className={cardCls}><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-400">{summary.pending || 0}</p><p className="text-xs text-amber-200/50">Pending Approval</p></CardContent></Card>
          <Card className={cardCls}><CardContent className="p-3 text-center"><p className="text-xl font-bold text-amber-400">{summary.revenue ? `₹${(summary.revenue / 100000).toFixed(1)}L` : '₹0'}</p><p className="text-xs text-amber-200/50">Total Revenue</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/40" />
          <Input className={`${inputCls} pl-9`} placeholder="Search partners..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}><SelectTrigger className={`${selCls} w-40`}><SelectValue placeholder="All Types" /></SelectTrigger><SelectContent className={selContentCls}><SelectItem value="all">All Types</SelectItem><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="manufacturer">Manufacturer</SelectItem><SelectItem value="distributor">Distributor</SelectItem><SelectItem value="logistics">Logistics</SelectItem><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="technology">Technology</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}><SelectTrigger className={`${selCls} w-36`}><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent className={selContentCls}><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : partners.length === 0 ? (
        <Card className={cardCls}><CardContent className="flex flex-col items-center justify-center py-16 text-amber-200/50"><Handshake className="mb-3 h-12 w-12" /><p className="text-sm">No partners found. Add your first partner!</p></CardContent></Card>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="border-amber-900/30 hover:bg-transparent"><TableHead className="text-amber-200/60">Partner</TableHead><TableHead className="text-amber-200/60">Type</TableHead><TableHead className="text-amber-200/60">Status</TableHead><TableHead className="text-amber-200/60">Contact</TableHead><TableHead className="text-amber-200/60">Commission</TableHead><TableHead className="text-amber-200/60">Verified</TableHead><TableHead className="text-right text-amber-200/60">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {partners.map(p => (
                    <TableRow key={p.id} className="border-amber-900/20 hover:bg-amber-900/10 cursor-pointer" onClick={() => setViewPartner(p)}>
                      <TableCell><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600/20 text-amber-400"><Building2 className="h-4 w-4" /></div><div><p className="text-sm font-medium text-amber-100">{p.name}</p>{p.address && <p className="text-[10px] text-amber-200/40">{p.address.city}, {p.address.state}</p>}</div></div></TableCell>
                      <TableCell><Badge className={typeColor(p.type)}>{p.type}</Badge></TableCell>
                      <TableCell><Badge className={statusColor(p.status)}>{p.status}</Badge></TableCell>
                      <TableCell><div className="text-xs text-amber-200/60">{p.contactPerson && <p>{p.contactPerson}</p>}{p.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</p>}</div></TableCell>
                      <TableCell className="text-sm text-amber-100">{p.commission ? `${p.commission}%` : '—'}</TableCell>
                      <TableCell>{p.isVerified ? <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Verified</Badge> : <Badge className={defCls}>Unverified</Badge>}</TableCell>
                      <TableCell className="text-right"><div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}><Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditPartner(p); setShowForm(true) }}><Pencil className="h-3.5 w-3.5" /></Button>{p.website && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" asChild><a href={p.website} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a></Button>}<Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => { if (confirm('Delete this partner?')) deleteMut.mutate(p.id) }}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2"><Button variant="outline" className={btnOutline} size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-xs text-amber-200/50">Page {page} of {pagination.pages}</span><Button variant="outline" className={btnOutline} size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-amber-100"><Handshake className="h-5 w-5 text-amber-400" />{editPartner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle></DialogHeader>
          <PartnerForm initial={editPartner} token={token} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['admin-partners'] }); onMutate() }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPartner} onOpenChange={() => setViewPartner(null)}>
        <DialogContent className="border-amber-900/40 bg-stone-950 text-amber-100 max-w-2xl">
          <DialogHeader><DialogTitle className="text-amber-100">{viewPartner?.name}</DialogTitle></DialogHeader>
          {viewPartner && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2"><Badge className={typeColor(viewPartner.type)}>{viewPartner.type}</Badge><Badge className={statusColor(viewPartner.status)}>{viewPartner.status}</Badge>{viewPartner.isVerified && <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Verified</Badge>}</div>
              {viewPartner.description && <div><p className="text-xs text-amber-200/50">Description</p><p className="text-sm text-amber-100">{viewPartner.description}</p></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-amber-200/50">Contact Person</p><p className="text-sm text-amber-100">{viewPartner.contactPerson || '—'}</p></div>
                <div><p className="text-xs text-amber-200/50">Email</p><p className="text-sm text-amber-100">{viewPartner.email || '—'}</p></div>
                <div><p className="text-xs text-amber-200/50">Phone</p><p className="text-sm text-amber-100">{viewPartner.phone || '—'}</p></div>
                <div><p className="text-xs text-amber-200/50">Commission</p><p className="text-sm text-amber-100">{viewPartner.commission ? `${viewPartner.commission}%` : '—'}</p></div>
              </div>
              {viewPartner.website && <div><p className="text-xs text-amber-200/50">Website</p><a href={viewPartner.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-amber-400 hover:underline"><Globe className="h-3 w-3" /> {viewPartner.website}</a></div>}
              {viewPartner.address && <div><p className="text-xs text-amber-200/50">Address</p><p className="text-sm text-amber-100">{[viewPartner.address.city, viewPartner.address.state, viewPartner.address.country].filter(Boolean).join(', ')}</p></div>}
              {viewPartner.stats && (
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-amber-900/30 bg-stone-800/30 p-3">
                  <div className="text-center"><p className="text-lg font-bold text-amber-100">{viewPartner.stats.totalOrders || 0}</p><p className="text-[10px] text-amber-200/50">Orders</p></div>
                  <div className="text-center"><p className="text-lg font-bold text-amber-100">₹{viewPartner.stats.totalRevenue?.toLocaleString('en-IN') || 0}</p><p className="text-[10px] text-amber-200/50">Revenue</p></div>
                  <div className="text-center"><p className="text-lg font-bold text-amber-100">{viewPartner.stats.rating?.toFixed(1) || '—'}</p><p className="text-[10px] text-amber-200/50">Rating</p></div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-amber-900/30 pt-3">
                <p className="text-xs text-amber-200/50 mr-2">Quick Actions:</p>
                {viewPartner.status === 'pending' && <Button size="sm" className="bg-green-600 text-white hover:bg-green-500" onClick={() => { statusMut.mutate({ id: viewPartner.id, status: 'active' }); setViewPartner(null) }}>Approve</Button>}
                {viewPartner.status === 'active' && <Button size="sm" variant="outline" className="border-yellow-900/40 text-yellow-400 hover:bg-yellow-900/20" onClick={() => { statusMut.mutate({ id: viewPartner.id, status: 'suspended' }); setViewPartner(null) }}>Suspend</Button>}
                {viewPartner.status === 'suspended' && <Button size="sm" className="bg-green-600 text-white hover:bg-green-500" onClick={() => { statusMut.mutate({ id: viewPartner.id, status: 'active' }); setViewPartner(null) }}>Reactivate</Button>}
                {!viewPartner.isVerified && <Button size="sm" variant="outline" className="border-blue-900/40 text-blue-400 hover:bg-blue-900/20" onClick={() => { verifyMut.mutate({ id: viewPartner.id, isVerified: true }); setViewPartner(null) }}>Verify</Button>}
                <Button size="sm" variant="outline" className={btnOutline} onClick={() => { setViewPartner(null); setEditPartner(viewPartner); setShowForm(true) }}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PartnerForm({ initial, token, onClose, onSaved }: { initial: Partner | null; token: string | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: initial?.name || '', type: initial?.type || '', status: initial?.status || 'pending', email: initial?.email || '', phone: initial?.phone || '', website: initial?.website || '', contactPerson: initial?.contactPerson || '', description: initial?.description || '', commission: initial?.commission ? String(initial.commission) : '', isVerified: initial?.isVerified ?? false, city: initial?.address?.city || '', state: initial?.address?.state || '', country: initial?.address?.country || 'India' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.type) { setError('Name and type are required'); return }
    setSaving(true); setError('')
    try {
      const body = { name: form.name, type: form.type, status: form.status, email: form.email || null, phone: form.phone || null, website: form.website || null, contactPerson: form.contactPerson || null, description: form.description || null, commission: form.commission ? parseFloat(form.commission) : null, isVerified: form.isVerified, address: { city: form.city || null, state: form.state || null, country: form.country || null } }
      if (initial) { await apiFetch(`/api/admin/partners/${initial.id}`, { method: 'PUT', body: JSON.stringify(body) }, token) }
      else { await apiFetch('/api/admin/partners', { method: 'POST', body: JSON.stringify(body) }, token) }
      onSaved()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><Label className={lblCls}>Name *</Label><Input className={`${inputCls} mt-1`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner name" /></div>
        <div><Label className={lblCls}>Type *</Label><Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger className={`${selCls} mt-1`}><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent className={selContentCls}><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="manufacturer">Manufacturer</SelectItem><SelectItem value="distributor">Distributor</SelectItem><SelectItem value="logistics">Logistics</SelectItem><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="technology">Technology</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label className={lblCls}>Description</Label><Textarea className={`${inputCls} mt-1`} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the partner..." /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className={lblCls}>Contact Person</Label><Input className={`${inputCls} mt-1`} value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Primary contact" /></div>
        <div><Label className={lblCls}>Email</Label><Input className={`${inputCls} mt-1`} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@example.com" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className={lblCls}>Phone</Label><Input className={`${inputCls} mt-1`} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
        <div><Label className={lblCls}>Website</Label><Input className={`${inputCls} mt-1`} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.com" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label className={lblCls}>Commission (%)</Label><Input className={`${inputCls} mt-1`} type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="e.g. 10" /></div>
        <div><Label className={lblCls}>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger><SelectContent className={selContentCls}><SelectItem value="pending">Pending</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent></Select></div>
      </div>
      <div className="border-t border-amber-900/30 pt-3"><p className="text-xs text-amber-200/50 mb-2">Address</p><div className="grid grid-cols-3 gap-3"><div><Label className={lblCls}>City</Label><Input className={`${inputCls} mt-1`} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" /></div><div><Label className={lblCls}>State</Label><Input className={`${inputCls} mt-1`} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State" /></div><div><Label className={lblCls}>Country</Label><Input className={`${inputCls} mt-1`} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Country" /></div></div></div>
      {initial && <div className="flex items-center gap-3"><Label className={lblCls}>Verified</Label><Switch checked={form.isVerified} onCheckedChange={v => setForm(f => ({ ...f, isVerified: v }))} /></div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{initial ? 'Update' : 'Add'} Partner</Button>
      </div>
    </div>
  )
}
