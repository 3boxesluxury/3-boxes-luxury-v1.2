'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GraduationCap, Video, FileCheck, Shield, BookOpen, Plus, Pencil, Trash2,
  Search, Upload, Eye, Download, Share2, Play, Clock, Users, Lock, Globe,
  CheckCircle, X, Loader2, ChevronDown, FileText, Scale,
} from 'lucide-react'

/* ─── style constants (matching admin-dashboard) ─── */
const cardCls = 'border-amber-900/30 bg-stone-900/80'
const inputCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100 placeholder:text-amber-200/30'
const btnPrimary = 'bg-amber-600 text-stone-950 hover:bg-amber-500'
const btnOutline = 'border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400'
const lblCls = 'text-amber-200/60 text-xs'
const selCls = 'border-amber-900/40 bg-stone-800/50 text-amber-100'
const selContentCls = 'border-amber-900/40 bg-stone-950'
const defCls = 'bg-stone-600/20 text-stone-400 border-stone-600/30'

/* ─── apiFetch ─── */
async function apiFetch(url: string, opts: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers as Record<string, string>) } })
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Unauthorized') }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.json()
}

/* ─── Types ─── */
interface WikiDoc {
  id: string
  title: string
  slug: string
  content?: string
  category: string | null
  version: string
  isPublished: boolean
  accessRoles: string
  docType?: string
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  docShares?: any[]
  trainingShares?: any[]
}

interface TrainingTabProps {
  token: string | null
  onMutate: () => void
}

/* ─── Constants ─── */
const DOC_TYPES = ['wiki', 'sop', 'workflow', 'patent', 'training', 'video'] as const
const CATEGORIES = ['architecture', 'api', 'technical', 'general', 'sop', 'workflow', 'patent', 'training'] as const
const ALL_ROLES = ['admin', 'team', 'agent', 'user', 'corporate'] as const
const VIDEO_CATEGORIES = ['onboarding', 'feature-tutorial', 'admin-training', 'corporate-training', 'agent-training'] as const
const PATENT_STATUSES = ['Draft', 'Under Review', 'Filed', 'Granted', 'Rejected'] as const

const docTypeColor: Record<string, string> = {
  wiki: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  sop: 'bg-green-600/20 text-green-400 border-green-600/30',
  workflow: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  patent: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  training: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  video: 'bg-rose-600/20 text-rose-400 border-rose-600/30',
}

const roleColor: Record<string, string> = {
  admin: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  team: 'bg-green-600/20 text-green-400 border-green-600/30',
  agent: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  user: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  corporate: 'bg-rose-600/20 text-rose-400 border-rose-600/30',
}

const patentStatusColor: Record<string, string> = {
  Draft: 'bg-stone-600/20 text-stone-400 border-stone-600/30',
  'Under Review': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  Filed: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  Granted: 'bg-green-600/20 text-green-400 border-green-600/30',
  Rejected: 'bg-red-600/20 text-red-400 border-red-600/30',
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

/* ─── Pre-built Document Templates ─── */
const PREBUILT_DOCS: Record<string, { title: string; category: string; docType: string; content: string }> = {
  'tech-functional': {
    title: 'Technical & Functional Documentation',
    category: 'architecture',
    docType: 'wiki',
    content: `# Technical & Functional Documentation — 3 Boxes Luxury

## 1. System Architecture Overview
The 3 Boxes Luxury platform is built on a modern **Next.js 16** full-stack architecture with the following layers:

- **Frontend**: React 19 + Tailwind CSS 4 + shadcn/ui
- **API Layer**: Next.js App Router API routes
- **Database**: SQLite via Prisma ORM
- **Authentication**: JWT-based auth with role-based access control
- **File Storage**: Cloud image proxy + local uploads

## 2. Core Modules
### 2.1 Product Management
- CRUD operations for luxury products
- Multi-image support with variant management
- Category hierarchy with parent/child relationships
- Inventory tracking with reorder alerts

### 2.2 Order Processing
- Order lifecycle: Pending → Processing → Shipped → Delivered
- Payment session management (Razorpay/Stripe)
- Invoice generation and tracking
- Refund processing workflow

### 2.3 User Management
- Role-based access: Admin, Team, Agent, User, Corporate
- Multi-factor authentication (2FA)
- Session management with IP/device tracking
- Approval workflow for new registrations

### 2.4 Corporate Gifting Portal
- Corporate account management with credit limits
- Campaign creation and recipient management
- Custom branding and packaging options
- Budget tracking and reporting

## 3. API Endpoints
All API endpoints follow RESTful conventions under \`/api/\` prefix.
Authentication requires Bearer token in Authorization header.

## 4. Security Considerations
- All endpoints validate authentication tokens
- Role-based permission checks on admin routes
- Rate limiting on sensitive endpoints
- CORS configuration for cross-origin requests
`,
  },
  'sop-documents': {
    title: 'Standard Operating Procedures (SOPs)',
    category: 'sop',
    docType: 'sop',
    content: `# Standard Operating Procedures — 3 Boxes Luxury

## SOP-001: Order Processing
### Purpose
To ensure consistent and efficient processing of customer orders.

### Scope
All customer orders placed through the 3 Boxes Luxury platform.

### Procedure
1. **Order Receipt**: Orders are received via the platform and appear in the admin dashboard.
2. **Verification**: Verify payment status and shipping details.
3. **Fulfillment**: Assign order to warehouse for packing and dispatch.
4. **Shipping**: Generate tracking number and update order status.
5. **Delivery Confirmation**: Mark order as delivered upon confirmation.

### Escalation
- If payment fails → Route to finance team
- If stock unavailable → Notify inventory manager
- If delivery delayed → Contact logistics partner

---

## SOP-002: Product Listing & Quality Control
### Purpose
Maintain luxury product standards for all listings.

### Procedure
1. **Product Onboarding**: Verify product details, images, and pricing.
2. **Image Standards**: Minimum 1000x1000px, white background, multiple angles.
3. **Description Review**: Ensure descriptions highlight luxury attributes.
4. **Pricing Verification**: Cross-reference with vendor pricing.
5. **Category Assignment**: Assign to appropriate category hierarchy.

---

## SOP-003: Customer Support Handling
### Purpose
Provide premium customer support matching luxury brand standards.

### Procedure
1. **Response Time**: Initial response within 2 hours during business hours.
2. **Priority Levels**: Urgent (1hr), High (4hr), Medium (24hr), Low (48hr).
3. **Resolution**: Aim for first-contact resolution when possible.
4. **Escalation**: Route complex issues to senior support or management.
`,
  },
  'workflow-docs': {
    title: 'Workflow Documentation',
    category: 'workflow',
    docType: 'workflow',
    content: `# Workflow Documentation — 3 Boxes Luxury

## WF-001: New Product Launch Workflow
\`\`\`
Vendor Onboarding → Product Data Entry → Image Upload → Quality Review
→ Pricing Approval → Category Assignment → SEO Optimization → Publish
\`\`\`

### Step Details
1. **Vendor Onboarding**: Register vendor in system, verify credentials
2. **Product Data Entry**: Enter product details, specifications, SKU
3. **Image Upload**: Upload product images meeting quality standards
4. **Quality Review**: Admin reviews all details for accuracy
5. **Pricing Approval**: Finance team approves pricing and margins
6. **Category Assignment**: Map product to appropriate categories
7. **SEO Optimization**: Add meta tags, descriptions, search keywords
8. **Publish**: Make product live on the platform

---

## WF-002: Corporate Gift Order Workflow
\`\`\`
Corporate Inquiry → Account Creation → Campaign Setup → Product Selection
→ Recipient Upload → Budget Approval → Order Processing → Delivery Tracking
\`\`\`

---

## WF-003: Return & Refund Workflow
\`\`\`
Customer Request → Support Review → Pickup Scheduled → Product Inspection
→ Refund Approved → Payment Processed → Account Credited
\`\`\`

### Refund Timelines
- Credit Card: 5-7 business days
- UPI: 2-3 business days
- Wallet: Instant
`,
  },
  'patent-application': {
    title: 'Patent Application — Smart Bundle & AI Gift Recommendation',
    category: 'patent',
    docType: 'patent',
    content: `# PATENT APPLICATION

## Title: System and Method for AI-Powered Luxury Gift Recommendation and Smart Bundle Generation

### Field of the Invention
The present invention relates to electronic commerce systems, and more specifically to systems and methods for providing AI-powered gift recommendations and automated product bundling in luxury retail environments.

### Background of the Invention
Traditional e-commerce platforms rely on basic filtering and search functionality for product discovery. In the luxury gifting segment, customers often struggle to find appropriate gifts that match the recipient's preferences, occasion, and cultural context.

### Summary of the Invention
The present disclosure describes a system that:
1. Analyzes recipient preferences using machine learning models
2. Generates context-aware gift recommendations based on occasion, relationship, and budget
3. Creates optimized product bundles ("Smart Bundles") that maximize value and aesthetic appeal
4. Provides AI-powered virtual try-on capabilities for jewelry and accessories

### Detailed Description
#### System Architecture
The system comprises:
- **Recommendation Engine**: ML model trained on gifting patterns and luxury preferences
- **Bundle Generator**: Optimization algorithm for creating product combinations
- **Style Analyzer**: Computer vision module for virtual try-on
- **Context Processor**: NLP module for understanding occasion and relationship context

#### Claims
1. A method for generating personalized gift recommendations comprising: receiving recipient information; analyzing gifting context; generating ranked product suggestions; and presenting optimized bundles.
2. The method of claim 1, wherein said analyzing includes processing cultural and social gifting norms.
3. The method of claim 1, wherein said generating includes applying collaborative filtering with luxury-specific features.

### Abstract
A system and method for providing AI-powered luxury gift recommendations and smart product bundling, incorporating cultural context, relationship analysis, and aesthetic optimization for the premium gifting market.
`,
  },
  'training-videos': {
    title: 'Training Video Library — Getting Started',
    category: 'training',
    docType: 'video',
    content: `# Training Video Library — 3 Boxes Luxury

## Onboarding Series
1. **Platform Overview** (15:30) — Introduction to the 3 Boxes Luxury admin dashboard
2. **Product Management** (22:45) — Adding, editing, and managing luxury products
3. **Order Processing** (18:20) — Complete order lifecycle management
4. **Customer Support** (12:10) — Handling customer inquiries and support tickets

## Feature Tutorials
1. **Smart Bundle Creator** (10:45) — Creating AI-powered gift bundles
2. **Corporate Portal** (20:30) — Managing corporate gifting accounts
3. **Inventory Management** (14:15) — Stock tracking and reorder management
4. **Reports & Analytics** (16:00) — Generating and interpreting business reports

## Admin Training
1. **User & Role Management** (18:00) — Managing access levels and permissions
2. **Wiki & Documentation** (12:30) — Creating and sharing training content
3. **Integration Setup** (15:45) — Connecting partner platforms and APIs

---

*Videos are embedded from YouTube/Vimeo. Contact admin for access to restricted training content.*
`,
  },
}

/* ════════════════════════════════════════════
   MAIN TRAINING TAB
   ════════════════════════════════════════════ */
export function TrainingTab({ token, onMutate }: TrainingTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'documents' | 'videos' | 'share' | 'patents'>('documents')

  const subTabs = [
    { value: 'documents' as const, icon: BookOpen, label: 'Documents' },
    { value: 'videos' as const, icon: Video, label: 'Training Videos' },
    { value: 'share' as const, icon: Share2, label: 'Share Content' },
    { value: 'patents' as const, icon: Scale, label: 'Patent Docs' },
  ]

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-amber-900/20 bg-stone-900/40 p-1.5">
        {subTabs.map(tab => {
          const isActive = activeSubTab === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setActiveSubTab(tab.value)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-600 text-stone-950'
                  : 'text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeSubTab === 'documents' && <DocumentsSubTab token={token} onMutate={onMutate} />}
          {activeSubTab === 'videos' && <TrainingVideosSubTab token={token} onMutate={onMutate} />}
          {activeSubTab === 'share' && <ShareContentSubTab token={token} onMutate={onMutate} />}
          {activeSubTab === 'patents' && <PatentDocsSubTab token={token} onMutate={onMutate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ════════════════════════════════════════════
   1. DOCUMENTS SUB-TAB
   ════════════════════════════════════════════ */
function DocumentsSubTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterDocType, setFilterDocType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState<WikiDoc | null>(null)
  const [showDelete, setShowDelete] = useState<WikiDoc | null>(null)
  const [showImport, setShowImport] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-docs', 'all'],
    queryFn: () => apiFetch('/api/wiki?all=true', undefined, token),
  })

  const docs: WikiDoc[] = data?.documents || []

  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
      const matchSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.slug.toLowerCase().includes(search.toLowerCase())
      const matchType = filterDocType === 'all' || doc.docType === filterDocType
      const matchCat = filterCategory === 'all' || doc.category === filterCategory
      return matchSearch && matchType && matchCat
    })
  }, [docs, search, filterDocType, filterCategory])

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/wiki/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowDelete(null) },
  })

  const importMut = useMutation({
    mutationFn: (template: { title: string; slug: string; category: string; docType: string; content: string; accessRoles: string; isPublished: boolean; version: string }) =>
      apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(template) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowImport(false) },
  })

  const handleImport = (key: string) => {
    const template = PREBUILT_DOCS[key]
    if (!template) return
    const slug = template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    importMut.mutate({
      title: template.title,
      slug,
      category: template.category,
      docType: template.docType,
      content: template.content,
      accessRoles: 'admin,team',
      isPublished: false,
      version: '1.0',
    })
  }

  const parseAccessRoles = (roles: string): string[] => {
    if (!roles) return []
    return roles.split(',').map(r => r.trim()).filter(Boolean)
  }

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
          <Input className={`${inputCls} pl-9`} placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterDocType} onValueChange={setFilterDocType}>
          <SelectTrigger className={`${selCls} w-[160px]`}>
            <SelectValue placeholder="Doc Type" />
          </SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className={`${selCls} w-[160px]`}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <DropdownMenu open={showImport} onOpenChange={setShowImport}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={btnOutline}>
              <Upload className="mr-1 h-4 w-4" /> Load from File
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={selContentCls}>
            <DropdownMenuItem onClick={() => handleImport('tech-functional')} className="text-amber-200/80 focus:bg-amber-900/20 focus:text-amber-200">
              <FileText className="mr-2 h-4 w-4 text-blue-400" /> Technical & Functional Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport('sop-documents')} className="text-amber-200/80 focus:bg-amber-900/20 focus:text-amber-200">
              <FileCheck className="mr-2 h-4 w-4 text-green-400" /> SOP Documents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport('workflow-docs')} className="text-amber-200/80 focus:bg-amber-900/20 focus:text-amber-200">
              <BookOpen className="mr-2 h-4 w-4 text-purple-400" /> Workflow Documentation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport('patent-application')} className="text-amber-200/80 focus:bg-amber-900/20 focus:text-amber-200">
              <Scale className="mr-2 h-4 w-4 text-amber-400" /> Patent Application
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport('training-videos')} className="text-amber-200/80 focus:bg-amber-900/20 focus:text-amber-200">
              <Video className="mr-2 h-4 w-4 text-rose-400" /> Training Videos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button className={btnPrimary} onClick={() => { setEditDoc(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Create Document
        </Button>
      </div>

      {importMut.isPending && (
        <div className="flex items-center gap-2 rounded-md bg-amber-600/10 px-3 py-2 text-xs text-amber-400">
          <Loader2 className="h-3 w-3 animate-spin" /> Importing document...
        </div>
      )}

      {/* Documents Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : (
        <Card className={cardCls}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Title</TableHead>
                    <TableHead className="text-amber-200/50">Category</TableHead>
                    <TableHead className="text-amber-200/50">Doc Type</TableHead>
                    <TableHead className="text-amber-200/50">Version</TableHead>
                    <TableHead className="text-amber-200/50">Published</TableHead>
                    <TableHead className="text-amber-200/50">Access Roles</TableHead>
                    <TableHead className="text-amber-200/50">Updated</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map(doc => {
                    const roles = parseAccessRoles(doc.accessRoles)
                    return (
                      <TableRow key={doc.id} className="border-amber-900/10 hover:bg-amber-900/5">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {doc.docType === 'video' ? <Video className="h-3.5 w-3.5 text-rose-400 shrink-0" /> :
                             doc.docType === 'sop' ? <FileCheck className="h-3.5 w-3.5 text-green-400 shrink-0" /> :
                             doc.docType === 'patent' ? <Scale className="h-3.5 w-3.5 text-amber-400 shrink-0" /> :
                             <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                            <div>
                              <p className="text-sm font-medium text-amber-100 truncate max-w-[200px]">{doc.title}</p>
                              <p className="text-[10px] text-amber-200/30">{doc.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-stone-700/30 text-stone-300 border-stone-600/30 text-[10px]">
                            {doc.category || 'general'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${docTypeColor[doc.docType || 'wiki'] || defCls} text-[10px]`}>
                            {(doc.docType || 'wiki').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-amber-200/60">v{doc.version}</TableCell>
                        <TableCell>
                          {doc.isPublished ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <X className="h-4 w-4 text-stone-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-0.5">
                            {roles.map(r => (
                              <Badge key={r} className={`${roleColor[r] || defCls} text-[8px] px-1 py-0`}>
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-amber-200/40">{fmtDate(doc.updatedAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-200/40 hover:text-amber-400" onClick={() => { setEditDoc(doc); setShowForm(true) }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(doc)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        <BookOpen className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
                        <p className="text-amber-200/40">No documents found</p>
                        <p className="mt-1 text-xs text-amber-200/30">Create a new document or import from pre-built templates</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editDoc ? 'Edit Document' : 'Create Document'}</DialogTitle>
          </DialogHeader>
          <DocumentForm
            token={token}
            doc={editDoc}
            onClose={() => { setShowForm(false); setEditDoc(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowForm(false); setEditDoc(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">
            Are you sure you want to delete <strong className="text-amber-100">{showDelete?.title}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => showDelete && deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Document Create/Edit Form ─── */
function DocumentForm({ token, doc, onClose, onSaved }: {
  token: string | null; doc: WikiDoc | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    slug: '',
    category: 'general',
    docType: 'wiki',
    version: '1.0',
    isPublished: false,
    accessRoles: ['admin', 'team'] as string[],
    content: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (doc) {
      const roles = doc.accessRoles ? doc.accessRoles.split(',').map(r => r.trim()).filter(Boolean) : []
      setForm({
        title: doc.title || '',
        slug: doc.slug || '',
        category: doc.category || 'general',
        docType: doc.docType || 'wiki',
        version: doc.version || '1.0',
        isPublished: doc.isPublished ?? false,
        accessRoles: roles,
        content: doc.content || '',
      })
    }
  }, [doc])

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      accessRoles: f.accessRoles.includes(role)
        ? f.accessRoles.filter(r => r !== role)
        : [...f.accessRoles, role],
    }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.slug.trim()) { setError('Slug is required'); return }
    setSaving(true)
    setError('')
    try {
      const body = {
        ...form,
        accessRoles: form.accessRoles.join(','),
      }
      if (doc) {
        await apiFetch(`/api/wiki/${doc.id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className={lblCls}>Title *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="Document title" value={form.title} onChange={e => handleTitleChange(e.target.value)} />
        </div>
        <div>
          <Label className={lblCls}>Slug</Label>
          <Input className={`${inputCls} mt-1`} placeholder="auto-generated-from-title" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        </div>
        <div>
          <Label className={lblCls}>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lblCls}>Doc Type</Label>
          <Select value={form.docType} onValueChange={v => setForm(f => ({ ...f, docType: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={lblCls}>Version</Label>
          <Input className={`${inputCls} mt-1`} placeholder="1.0" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
          <Label className={lblCls}>Published</Label>
        </div>
      </div>

      {/* Access Roles */}
      <div>
        <Label className={lblCls}>Access Roles</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.accessRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
                className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <Badge className={`${roleColor[role]} text-[10px]`}>{role}</Badge>
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <Label className={lblCls}>Content (Markdown)</Label>
        <Textarea
          className={`${inputCls} mt-1 min-h-[300px] font-mono text-xs`}
          placeholder="# Document Content&#10;&#10;Write your markdown content here..."
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {doc ? 'Update' : 'Create'} Document
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   2. TRAINING VIDEOS SUB-TAB
   ════════════════════════════════════════════ */
function TrainingVideosSubTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editVideo, setEditVideo] = useState<WikiDoc | null>(null)
  const [showDelete, setShowDelete] = useState<WikiDoc | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-docs', 'all'],
    queryFn: () => apiFetch('/api/wiki?all=true', undefined, token),
  })

  const allDocs: WikiDoc[] = data?.documents || []
  const videoDocs = allDocs.filter(d => d.docType === 'video')

  const filteredVideos = useMemo(() => {
    return videoDocs.filter(doc => {
      const meta = parseVideoMeta(doc)
      const matchCat = filterCat === 'all' || meta.videoCategory === filterCat
      const matchRole = filterRole === 'all' || meta.targetRoles.includes(filterRole)
      return matchCat && matchRole
    })
  }, [videoDocs, filterCat, filterRole])

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/wiki/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowDelete(null) },
  })

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className={`${selCls} w-[180px]`}>
            <SelectValue placeholder="Video Category" />
          </SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Categories</SelectItem>
            {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className={`${selCls} w-[160px]`}>
            <SelectValue placeholder="Target Role" />
          </SelectTrigger>
          <SelectContent className={selContentCls}>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button className={btnPrimary} onClick={() => { setEditVideo(null); setShowForm(true) }}>
            <Plus className="mr-1 h-4 w-4" /> Add Video
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : filteredVideos.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Video className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-amber-200/40">No training videos found</p>
            <p className="mt-1 text-xs text-amber-200/30">Add video entries or import the training video template</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((doc, i) => {
            const meta = parseVideoMeta(doc)
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`${cardCls} transition-all hover:border-amber-600/30`}>
                  <CardContent className="p-4">
                    {/* Video thumbnail / preview area */}
                    <div className="relative mb-3 h-40 rounded-lg bg-stone-800/50 overflow-hidden flex items-center justify-center border border-amber-900/20">
                      {meta.videoUrl ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            size="sm"
                            className="bg-amber-600/80 text-stone-950 hover:bg-amber-500 h-10 w-10 rounded-full p-0"
                            onClick={() => setPreviewUrl(meta.videoUrl)}
                          >
                            <Play className="h-5 w-5 ml-0.5" />
                          </Button>
                        </div>
                      ) : (
                        <Video className="h-10 w-10 text-amber-200/20" />
                      )}
                      {meta.duration && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          <Clock className="h-3 w-3" /> {meta.duration}
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-semibold text-amber-100 line-clamp-1">{doc.title}</h3>
                    <p className="mt-1 text-xs text-amber-200/40 line-clamp-2">{meta.description || 'No description'}</p>

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {meta.videoCategory && (
                        <Badge className="bg-cyan-600/20 text-cyan-400 border-cyan-600/30 text-[9px]">
                          {meta.videoCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Badge>
                      )}
                      {meta.targetRoles.map(r => (
                        <Badge key={r} className={`${roleColor[r] || defCls} text-[8px] px-1 py-0`}>{r}</Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <Separator className="bg-amber-900/20 my-3" />
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className={`${btnOutline} h-7 text-[10px] px-2`} onClick={() => { setEditVideo(doc); setShowForm(true) }}>
                        <Pencil className="mr-0.5 h-3 w-3" /> Edit
                      </Button>
                      {meta.videoUrl && (
                        <Button size="sm" variant="outline" className={`${btnOutline} h-7 text-[10px] px-2`} onClick={() => setPreviewUrl(meta.videoUrl)}>
                          <Eye className="mr-0.5 h-3 w-3" /> Preview
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400 ml-auto" onClick={() => setShowDelete(doc)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Video Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editVideo ? 'Edit Training Video' : 'Add Training Video'}</DialogTitle>
          </DialogHeader>
          <VideoForm
            token={token}
            doc={editVideo}
            onClose={() => { setShowForm(false); setEditVideo(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowForm(false); setEditVideo(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <Play className="h-4 w-4" /> Video Preview
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-amber-900/20 bg-black">
              <iframe
                src={getEmbedUrl(previewUrl)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Video</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">
            Are you sure you want to delete <strong className="text-amber-100">{showDelete?.title}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => showDelete && deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Video Form ─── */
function VideoForm({ token, doc, onClose, onSaved }: {
  token: string | null; doc: WikiDoc | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    videoUrl: '',
    duration: '',
    videoCategory: 'onboarding',
    targetRoles: ['admin', 'team'] as string[],
    isPublished: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (doc) {
      const meta = parseVideoMeta(doc)
      const roles = doc.accessRoles ? doc.accessRoles.split(',').map(r => r.trim()).filter(Boolean) : []
      setForm({
        title: doc.title || '',
        slug: doc.slug || '',
        description: meta.description || '',
        videoUrl: meta.videoUrl || '',
        duration: meta.duration || '',
        videoCategory: meta.videoCategory || 'onboarding',
        targetRoles: meta.targetRoles.length > 0 ? meta.targetRoles : roles,
        isPublished: doc.isPublished ?? false,
      })
    }
  }, [doc])

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter(r => r !== role)
        : [...f.targetRoles, role],
    }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      // Store video metadata in the content field as JSON
      const videoMeta = {
        description: form.description,
        videoUrl: form.videoUrl,
        duration: form.duration,
        videoCategory: form.videoCategory,
        targetRoles: form.targetRoles,
      }
      const body = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: 'training',
        docType: 'video',
        version: '1.0',
        isPublished: form.isPublished,
        accessRoles: form.targetRoles.join(','),
        content: JSON.stringify(videoMeta),
      }
      if (doc) {
        await apiFetch(`/api/wiki/${doc.id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save video')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className={lblCls}>Title *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="Video title" value={form.title} onChange={e => handleTitleChange(e.target.value)} />
        </div>
        <div>
          <Label className={lblCls}>Duration</Label>
          <Input className={`${inputCls} mt-1`} placeholder="mm:ss (e.g. 15:30)" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label className={lblCls}>Video URL (YouTube/Vimeo/Loom Embed)</Label>
          <Input className={`${inputCls} mt-1`} placeholder="https://www.youtube.com/embed/..." value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <Label className={lblCls}>Description</Label>
          <Textarea className={`${inputCls} mt-1 min-h-[80px]`} placeholder="Brief description of the video content..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <Label className={lblCls}>Category</Label>
          <Select value={form.videoCategory} onValueChange={v => setForm(f => ({ ...f, videoCategory: v }))}>
            <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
            <SelectContent className={selContentCls}>
              {VIDEO_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
          <Label className={lblCls}>Published</Label>
        </div>
      </div>

      {/* Target Roles */}
      <div>
        <Label className={lblCls}>Target Roles</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.targetRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
                className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <Badge className={`${roleColor[role] || defCls} text-[10px]`}>{role}</Badge>
            </label>
          ))}
        </div>
      </div>

      {/* Inline Preview */}
      {form.videoUrl && (
        <div>
          <Label className={lblCls}>Preview</Label>
          <div className="mt-1 aspect-video w-full overflow-hidden rounded-lg border border-amber-900/20 bg-black">
            <iframe
              src={getEmbedUrl(form.videoUrl)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video Preview"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {doc ? 'Update' : 'Add'} Video
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   3. SHARE CONTENT SUB-TAB
   ════════════════════════════════════════════ */
function ShareContentSubTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [shareRoles, setShareRoles] = useState<string[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [canView, setCanView] = useState(true)
  const [canDownload, setCanDownload] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['wiki-docs', 'all'],
    queryFn: () => apiFetch('/api/wiki?all=true', undefined, token),
  })

  const { data: sharesData, isLoading: sharesLoading } = useQuery({
    queryKey: ['admin-shares'],
    queryFn: () => apiFetch('/api/admin/share-doc', undefined, token),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/api/admin/users?limit=100', undefined, token),
  })

  const allDocs: WikiDoc[] = docsData?.documents || []
  const shares = sharesData?.shares || []
  const allUsers = usersData?.users || []

  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers.slice(0, 20)
    const q = userSearch.toLowerCase()
    return allUsers.filter((u: any) =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [allUsers, userSearch])

  const toggleShareRole = (role: string) => {
    setShareRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  const handleShare = async () => {
    if (!selectedDocId) { setError('Please select a document'); return }
    if (shareRoles.length === 0 && !selectedUserId) { setError('Please select at least one role or user'); return }
    setSharing(true)
    setError('')
    setSuccess('')
    try {
      if (selectedUserId) {
        // Share with specific user via AgentDocShare
        await apiFetch('/api/admin/share-doc', {
          method: 'POST',
          body: JSON.stringify({
            docId: selectedDocId,
            agentId: selectedUserId,
            canDownload,
            canShare: false,
            message: `Shared with role access: ${shareRoles.join(', ')}`,
          }),
        }, token)
      }

      // Share with roles via TrainingShare
      for (const role of shareRoles) {
        await apiFetch(`/api/wiki/${selectedDocId}/share`, {
          method: 'POST',
          body: JSON.stringify({
            targetRole: role,
            targetUserId: selectedUserId || null,
            canView,
            canDownload,
          }),
        }, token)
      }

      setSuccess('Content shared successfully!')
      qc.invalidateQueries({ queryKey: ['admin-shares'] })
      onMutate()
      setSelectedDocId('')
      setShareRoles([])
      setSelectedUserId('')
      setCanDownload(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to share content')
    } finally {
      setSharing(false)
    }
  }

  const revokeMut = useMutation({
    mutationFn: (shareId: string) => apiFetch(`/api/admin/share-doc`, { method: 'DELETE', body: JSON.stringify({ shareId }) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-shares'] }); onMutate() },
  })

  return (
    <div className="space-y-6">
      {/* Share Form Card */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-amber-400" /> Share Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}
          {success && <div className="rounded-md bg-green-600/10 p-3 text-sm text-green-400 flex items-center gap-2"><CheckCircle className="h-4 w-4" />{success}</div>}

          {/* Select Document */}
          <div>
            <Label className={lblCls}>Select Document / Video</Label>
            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
              <SelectTrigger className={`${selCls} mt-1`}>
                <SelectValue placeholder="Choose a document to share..." />
              </SelectTrigger>
              <SelectContent className={selContentCls}>
                {allDocs.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <span className="flex items-center gap-2">
                      {doc.docType === 'video' ? <Video className="h-3 w-3 text-rose-400" /> : <FileText className="h-3 w-3 text-blue-400" />}
                      {doc.title}
                      <span className="text-[10px] text-amber-200/30">({doc.docType || 'wiki'})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Share with Roles */}
          <div>
            <Label className={lblCls}>Share with Role</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {ALL_ROLES.map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={shareRoles.includes(role)}
                    onCheckedChange={() => toggleShareRole(role)}
                    className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <Badge className={`${roleColor[role] || defCls} text-[10px]`}>{role}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* Share with Specific User */}
          <div>
            <Label className={lblCls}>Share with Specific User</Label>
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
              <Input
                className={`${inputCls} pl-9`}
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
            {userSearch && filteredUsers.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-amber-900/20 bg-stone-800/50">
                {filteredUsers.map((u: any) => (
                  <button
                    key={u.id}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-amber-900/20 ${
                      selectedUserId === u.id ? 'bg-amber-900/30 text-amber-400' : 'text-amber-200/60'
                    }`}
                    onClick={() => { setSelectedUserId(u.id); setUserSearch(u.name || u.email) }}
                  >
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="truncate">{u.name || u.email}</span>
                    <Badge className={`${roleColor[u.role] || defCls} text-[8px] ml-auto`}>{u.role}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={canView}
                onCheckedChange={(v) => setCanView(v === true)}
                className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <span className="text-xs text-amber-200/60 flex items-center gap-1"><Eye className="h-3 w-3" /> Can View</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={canDownload}
                onCheckedChange={(v) => setCanDownload(v === true)}
                className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <span className="text-xs text-amber-200/60 flex items-center gap-1"><Download className="h-3 w-3" /> Can Download</span>
            </label>
          </div>

          <Button className={btnPrimary} onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Share2 className="mr-1 h-4 w-4" />}
            Share Content
          </Button>
        </CardContent>
      </Card>

      {/* Existing Shares Table */}
      <Card className={cardCls}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" /> Existing Shares
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sharesLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>
          ) : shares.length === 0 ? (
            <div className="py-8 text-center">
              <Lock className="mx-auto mb-2 h-8 w-8 text-amber-200/20" />
              <p className="text-xs text-amber-200/40">No shares created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-900/20 hover:bg-transparent">
                    <TableHead className="text-amber-200/50">Document</TableHead>
                    <TableHead className="text-amber-200/50">Shared With</TableHead>
                    <TableHead className="text-amber-200/50">Role</TableHead>
                    <TableHead className="text-amber-200/50">Can View</TableHead>
                    <TableHead className="text-amber-200/50">Can Download</TableHead>
                    <TableHead className="text-amber-200/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((share: any) => (
                    <TableRow key={share.id} className="border-amber-900/10 hover:bg-amber-900/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span className="text-sm text-amber-100 truncate max-w-[150px]">{share.document?.title || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-amber-200/60">
                        {share.agent?.name || share.agent?.email || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColor[share.agent?.role] || defCls} text-[10px]`}>
                          {share.agent?.role || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      </TableCell>
                      <TableCell>
                        {share.canDownload ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <X className="h-4 w-4 text-stone-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400"
                          onClick={() => revokeMut.mutate(share.id)}
                          disabled={revokeMut.isPending}
                        >
                          {revokeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ════════════════════════════════════════════
   4. PATENT DOCS SUB-TAB
   ════════════════════════════════════════════ */
function PatentDocsSubTab({ token, onMutate }: { token: string | null; onMutate: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editDoc, setEditDoc] = useState<WikiDoc | null>(null)
  const [showDelete, setShowDelete] = useState<WikiDoc | null>(null)
  const [showImport, setShowImport] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-docs', 'all'],
    queryFn: () => apiFetch('/api/wiki?all=true', undefined, token),
  })

  const allDocs: WikiDoc[] = data?.documents || []
  const patentDocs = allDocs.filter(d => d.docType === 'patent')

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/wiki/${id}`, { method: 'DELETE' }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowDelete(null) },
  })

  const importPatentMut = useMutation({
    mutationFn: (template: { title: string; slug: string; category: string; docType: string; content: string; accessRoles: string; isPublished: boolean; version: string }) =>
      apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(template) }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowImport(false) },
  })

  const handleImportPatent = () => {
    const template = PREBUILT_DOCS['patent-application']
    if (!template) return
    const slug = template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    importPatentMut.mutate({
      title: template.title,
      slug,
      category: template.category,
      docType: template.docType,
      content: template.content,
      accessRoles: 'admin',
      isPublished: false,
      version: '1.0',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button className={btnPrimary} onClick={() => { setEditDoc(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> New Patent Doc
        </Button>
        <Button variant="outline" className={btnOutline} onClick={handleImportPatent} disabled={importPatentMut.isPending}>
          {importPatentMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          Import Patent Template
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-amber-200/40">
          <Scale className="h-4 w-4" /> {patentDocs.length} patent document{patentDocs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Patent Status Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PATENT_STATUSES.map(status => {
          const count = patentDocs.filter(d => {
            const meta = parsePatentMeta(d)
            return meta.filingStatus === status
          }).length
          return (
            <Card key={status} className={cardCls}>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-amber-100">{count}</p>
                <Badge className={`${patentStatusColor[status] || defCls} text-[9px] mt-1`}>{status}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Patent Documents */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
      ) : patentDocs.length === 0 ? (
        <Card className={cardCls}>
          <CardContent className="py-12 text-center">
            <Scale className="mx-auto mb-3 h-10 w-10 text-amber-200/20" />
            <p className="text-amber-200/40">No patent documents found</p>
            <p className="mt-1 text-xs text-amber-200/30">Create a new patent document or import the template</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patentDocs.map((doc, i) => {
            const meta = parsePatentMeta(doc)
            return (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`${cardCls} transition-all hover:border-amber-600/30`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="h-4 w-4 text-amber-400 shrink-0" />
                          <h3 className="text-sm font-semibold text-amber-100 truncate">{doc.title}</h3>
                        </div>
                        <p className="text-[10px] text-amber-200/30 mb-3">{doc.slug}</p>

                        {/* Patent-specific fields */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className={lblCls}>Filing Status</p>
                            <Badge className={`${patentStatusColor[meta.filingStatus] || defCls} text-[10px] mt-0.5`}>
                              {meta.filingStatus || 'Draft'}
                            </Badge>
                          </div>
                          <div>
                            <p className={lblCls}>Patent Number</p>
                            <p className="text-xs text-amber-100 mt-0.5">{meta.patentNumber || '—'}</p>
                          </div>
                          <div>
                            <p className={lblCls}>Filing Date</p>
                            <p className="text-xs text-amber-100 mt-0.5">{meta.filingDate ? fmtDate(meta.filingDate) : '—'}</p>
                          </div>
                          <div>
                            <p className={lblCls}>Priority Date</p>
                            <p className="text-xs text-amber-100 mt-0.5">{meta.priorityDate ? fmtDate(meta.priorityDate) : '—'}</p>
                          </div>
                        </div>

                        {/* Access Roles & Version */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] text-amber-200/30">v{doc.version}</span>
                          <span className="text-amber-200/20">|</span>
                          {doc.isPublished ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[9px]">Published</Badge>
                          ) : (
                            <Badge className="bg-stone-600/20 text-stone-400 border-stone-600/30 text-[9px]">Draft</Badge>
                          )}
                          <span className="text-amber-200/20">|</span>
                          <div className="flex gap-0.5">
                            {doc.accessRoles.split(',').map(r => r.trim()).filter(Boolean).map(r => (
                              <Badge key={r} className={`${roleColor[r] || defCls} text-[8px] px-1 py-0`}>{r}</Badge>
                            ))}
                          </div>
                          <span className="text-amber-200/20">|</span>
                          <span className="text-[10px] text-amber-200/30">Updated {fmtDate(doc.updatedAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className={`${btnOutline} h-7 text-[10px] px-2`} onClick={() => { setEditDoc(doc); setShowForm(true) }}>
                          <Pencil className="mr-0.5 h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/40 hover:text-red-400" onClick={() => setShowDelete(doc)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Patent Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/30 bg-stone-950 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{editDoc ? 'Edit Patent Document' : 'New Patent Document'}</DialogTitle>
          </DialogHeader>
          <PatentForm
            token={token}
            doc={editDoc}
            onClose={() => { setShowForm(false); setEditDoc(null) }}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['wiki-docs'] }); onMutate(); setShowForm(false); setEditDoc(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Delete Patent Document</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-200/60">
            Are you sure you want to delete <strong className="text-amber-100">{showDelete?.title}</strong>?
            This may contain important filing information.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className={btnOutline} onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 text-white hover:bg-red-500" onClick={() => showDelete && deleteMut.mutate(showDelete.id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Patent Form ─── */
function PatentForm({ token, doc, onClose, onSaved }: {
  token: string | null; doc: WikiDoc | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    slug: '',
    version: '1.0',
    isPublished: false,
    accessRoles: ['admin'] as string[],
    content: '',
    // Patent-specific fields (stored in content as JSON)
    filingStatus: 'Draft',
    patentNumber: '',
    filingDate: '',
    priorityDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (doc) {
      const meta = parsePatentMeta(doc)
      const roles = doc.accessRoles ? doc.accessRoles.split(',').map(r => r.trim()).filter(Boolean) : ['admin']
      setForm({
        title: doc.title || '',
        slug: doc.slug || '',
        version: doc.version || '1.0',
        isPublished: doc.isPublished ?? false,
        accessRoles: roles,
        content: meta.rawContent || '',
        filingStatus: meta.filingStatus || 'Draft',
        patentNumber: meta.patentNumber || '',
        filingDate: meta.filingDate || '',
        priorityDate: meta.priorityDate || '',
      })
    }
  }, [doc])

  const handleTitleChange = (title: string) => {
    setForm(f => ({
      ...f,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }))
  }

  const toggleRole = (role: string) => {
    setForm(f => ({
      ...f,
      accessRoles: f.accessRoles.includes(role)
        ? f.accessRoles.filter(r => r !== role)
        : [...f.accessRoles, role],
    }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const patentMeta = {
        filingStatus: form.filingStatus,
        patentNumber: form.patentNumber,
        filingDate: form.filingDate,
        priorityDate: form.priorityDate,
      }
      const body = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category: 'patent',
        docType: 'patent',
        version: form.version,
        isPublished: form.isPublished,
        accessRoles: form.accessRoles.join(','),
        content: form.content + '\n\n<!-- PATENT_META:' + JSON.stringify(patentMeta) + ' -->',
      }
      if (doc) {
        await apiFetch(`/api/wiki/${doc.id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
      } else {
        await apiFetch('/api/wiki', { method: 'POST', body: JSON.stringify(body) }, token)
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save patent document')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-600/10 p-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className={lblCls}>Title *</Label>
          <Input className={`${inputCls} mt-1`} placeholder="Patent title" value={form.title} onChange={e => handleTitleChange(e.target.value)} />
        </div>
        <div>
          <Label className={lblCls}>Slug</Label>
          <Input className={`${inputCls} mt-1`} placeholder="auto-generated" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        </div>
        <div>
          <Label className={lblCls}>Version</Label>
          <Input className={`${inputCls} mt-1`} placeholder="1.0" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
          <Label className={lblCls}>Published</Label>
        </div>
      </div>

      {/* Patent-specific fields */}
      <Separator className="bg-amber-900/20" />
      <div className="rounded-lg border border-amber-900/20 bg-amber-900/5 p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-200/80 flex items-center gap-2">
          <Scale className="h-4 w-4 text-amber-400" /> Patent Filing Details
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className={lblCls}>Filing Status</Label>
            <Select value={form.filingStatus} onValueChange={v => setForm(f => ({ ...f, filingStatus: v }))}>
              <SelectTrigger className={`${selCls} mt-1`}><SelectValue /></SelectTrigger>
              <SelectContent className={selContentCls}>
                {PATENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={lblCls}>Patent Number</Label>
            <Input className={`${inputCls} mt-1`} placeholder="e.g. IN/2024/00XXXX" value={form.patentNumber} onChange={e => setForm(f => ({ ...f, patentNumber: e.target.value }))} />
          </div>
          <div>
            <Label className={lblCls}>Filing Date</Label>
            <Input type="date" className={`${inputCls} mt-1`} value={form.filingDate} onChange={e => setForm(f => ({ ...f, filingDate: e.target.value }))} />
          </div>
          <div>
            <Label className={lblCls}>Priority Date</Label>
            <Input type="date" className={`${inputCls} mt-1`} value={form.priorityDate} onChange={e => setForm(f => ({ ...f, priorityDate: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Access Roles */}
      <div>
        <Label className={lblCls}>Access Roles</Label>
        <div className="mt-2 flex flex-wrap gap-3">
          {ALL_ROLES.map(role => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.accessRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
                className="border-amber-900/40 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <Badge className={`${roleColor[role] || defCls} text-[10px]`}>{role}</Badge>
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <Label className={lblCls}>Patent Content (Markdown)</Label>
        <Textarea
          className={`${inputCls} mt-1 min-h-[300px] font-mono text-xs`}
          placeholder="# Patent Application&#10;&#10;## Title: ...&#10;## Field of the Invention: ..."
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" className={btnOutline} onClick={onClose}>Cancel</Button>
        <Button className={btnPrimary} onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {doc ? 'Update' : 'Create'} Patent Doc
        </Button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   HELPER FUNCTIONS
   ════════════════════════════════════════════ */

/** Parse video metadata from document content (stored as JSON) */
function parseVideoMeta(doc: WikiDoc) {
  const defaults = { videoUrl: '', duration: '', videoCategory: '', description: '', targetRoles: [] as string[] }
  if (!doc.content) return defaults
  try {
    const parsed = JSON.parse(doc.content)
    return {
      videoUrl: parsed.videoUrl || '',
      duration: parsed.duration || '',
      videoCategory: parsed.videoCategory || '',
      description: parsed.description || '',
      targetRoles: Array.isArray(parsed.targetRoles) ? parsed.targetRoles : [],
    }
  } catch {
    return defaults
  }
}

/** Parse patent metadata from document content */
function parsePatentMeta(doc: WikiDoc) {
  const defaults = { filingStatus: 'Draft', patentNumber: '', filingDate: '', priorityDate: '', rawContent: '' }
  if (!doc.content) return defaults
  try {
    // Look for patent metadata in HTML comment at end of content
    const metaMatch = doc.content.match(/<!-- PATENT_META:(.+?) -->/s)
    if (metaMatch) {
      const meta = JSON.parse(metaMatch[1])
      const rawContent = doc.content.replace(/<!-- PATENT_META:.+? -->/s, '').trim()
      return {
        filingStatus: meta.filingStatus || 'Draft',
        patentNumber: meta.patentNumber || '',
        filingDate: meta.filingDate || '',
        priorityDate: meta.priorityDate || '',
        rawContent,
      }
    }
    return { ...defaults, rawContent: doc.content }
  } catch {
    return { ...defaults, rawContent: doc.content }
  }
}

/** Convert YouTube/Vimeo URL to embed URL */
function getEmbedUrl(url: string): string {
  if (!url) return ''

  // YouTube various URL formats
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo various URL formats
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/)
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`

  // Already an embed URL or other — return as-is
  return url
}
