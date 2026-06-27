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
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
  return res.json()
}

// ── Category icons and colors ───────────────────────────────────────

const categoryConfig: Record<string, { icon: typeof FileText; color: string; bg: string; label: string }> = {
  'technical': { icon: Cpu, color: 'text-blue-400', bg: 'bg-blue-600/10', label: 'Technical' },
  'sop': { icon: Users, color: 'text-green-400', bg: 'bg-green-600/10', label: 'SOP' },
  'ai-strategy': { icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-600/10', label: 'AI Strategy' },
  'deployment': { icon: Rocket, color: 'text-amber-400', bg: 'bg-amber-600/10', label: 'Deployment' },
  'patent': { icon: Shield, color: 'text-red-400', bg: 'bg-red-600/10', label: 'Patent' },
}

// ── PDF Generation ──────────────────────────────────────────────────

function generateDocumentationPdf(doc: {
  title: string
  content: string
  category: string
  version: string
  isConfidential: boolean
}) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ── Brand Header ──
  pdf.setFillColor(28, 25, 23)
  pdf.rect(0, 0, pageWidth, 44, 'F')
  pdf.setFillColor(217, 119, 6)
  pdf.rect(0, 42, pageWidth, 2, 'F')

  pdf.setTextColor(251, 191, 36)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('3BOXES LUXURY', margin, 16)

  pdf.setTextColor(168, 162, 158)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Documentation Hub — Confidential Internal Use Only', margin, 24)

  if (doc.isConfidential) {
    pdf.setTextColor(239, 68, 68)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CONFIDENTIAL — ADMIN ACCESS ONLY — DO NOT DISTRIBUTE', margin, 32)
  }

  y = 52

  // ── Document Title ──
  pdf.setTextColor(28, 25, 23)
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')
  const titleLines = pdf.splitTextToSize(doc.title, contentWidth)
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 8 + 4

  // ── Meta ──
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 113, 108)
  const categoryLabel = doc.category.charAt(0).toUpperCase() + doc.category.slice(1)
  const metaLine = `Category: ${categoryLabel}  |  Version: v${doc.version}  |  Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
  pdf.text(metaLine, margin, y)
  y += 4

  // Confidential banner
  if (doc.isConfidential) {
    y += 2
    pdf.setFillColor(254, 226, 226)
    pdf.roundedRect(margin, y - 3, contentWidth, 8, 1, 1, 'F')
    pdf.setTextColor(185, 28, 28)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CONFIDENTIAL — This document contains proprietary information. Unauthorized distribution is prohibited.', margin + 3, y + 2)
    y += 10
    pdf.setFont('helvetica', 'normal')
  }

  // Separator
  pdf.setDrawColor(217, 119, 6)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 8

  // ── Content ──
  pdf.setTextColor(28, 25, 23)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  const lines = doc.content.split('\n')
  const lineHeight = 5

  for (const line of lines) {
    if (y + lineHeight > pageHeight - margin - 10) {
      pdf.addPage()
      y = margin
      pdf.setTextColor(168, 162, 158)
      pdf.setFontSize(7)
      pdf.text(`${doc.title} — v${doc.version}${doc.isConfidential ? ' — CONFIDENTIAL' : ''}`, margin, y)
      pdf.setDrawColor(217, 119, 6)
      pdf.setLineWidth(0.3)
      pdf.line(margin, y + 2, pageWidth - margin, y + 2)
      y += 8
      pdf.setTextColor(28, 25, 23)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
    }

    if (line.trim() === '') { y += lineHeight * 0.4; continue }

    if (line.startsWith('# ')) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(180, 83, 9)
      const hl = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(hl, margin, y); y += hl.length * 6 + 3
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('## ')) {
      y += 2
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(180, 83, 9)
      const hl = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(hl, margin, y); y += hl.length * 5.5 + 2
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('### ')) {
      y += 1
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(120, 53, 15)
      const hl = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(hl, margin, y); y += hl.length * 5 + 1
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('#### ')) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(120, 53, 15)
      const hl = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(hl, margin, y); y += hl.length * 5 + 1
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bt = line.replace(/^[-*]\s*/, '')
      pdf.text('\u2022', margin + 2, y)
      const wl = pdf.splitTextToSize(bt, contentWidth - 6)
      pdf.text(wl, margin + 6, y); y += wl.length * lineHeight
    } else if (line.startsWith('> ')) {
      pdf.setFillColor(254, 243, 199)
      const qt = line.replace(/^>\s*/, '')
      const wl = pdf.splitTextToSize(qt, contentWidth - 8)
      const qh = wl.length * lineHeight + 4
      pdf.roundedRect(margin, y - 3, contentWidth, qh, 1, 1, 'F')
      pdf.setDrawColor(217, 119, 6); pdf.setLineWidth(1)
      pdf.line(margin, y - 3, margin, y - 3 + qh)
      pdf.setTextColor(120, 53, 15); pdf.text(wl, margin + 4, y); y += qh + 2
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('```')) { y += 2
    } else if (line.match(/^\d+\.\s/)) {
      const nt = line.replace(/^\d+\.\s*/, '')
      const num = line.match(/^(\d+)\./)?.[1] || '1'
      pdf.text(`${num}.`, margin, y)
      const wl = pdf.splitTextToSize(nt, contentWidth - 8)
      pdf.text(wl, margin + 8, y); y += wl.length * lineHeight
    } else if (line.startsWith('|')) {
      const wl = pdf.splitTextToSize(line, contentWidth)
      pdf.setFont('courier', 'normal'); pdf.setFontSize(8)
      pdf.text(wl, margin, y); y += wl.length * 4
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10)
    } else {
      const wl = pdf.splitTextToSize(line, contentWidth)
      pdf.text(wl, margin, y); y += wl.length * lineHeight
    }
  }

  // ── Footer ──
  y = pageHeight - 12
  pdf.setDrawColor(217, 119, 6); pdf.setLineWidth(0.3)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 4
  pdf.setTextColor(168, 162, 158); pdf.setFontSize(7)
  const footerText = `3Boxes Luxury — Documentation Hub  |  ${doc.category}-v${doc.version}  |  ${doc.isConfidential ? 'CONFIDENTIAL' : 'Internal Use'}  |  Generated: ${new Date().toLocaleDateString()}`
  pdf.text(footerText, margin, y)

  const fileName = `${doc.category}-documentation-v${doc.version}.pdf`
  pdf.save(fileName)
  return fileName
}

// ── Main Component ──────────────────────────────────────────────────

interface DocumentationTabProps {
  token: string | null
}

export function DocumentationTab({ token }: DocumentationTabProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showVaultDialog, setShowVaultDialog] = useState(false)
  const [vaultPassword, setVaultPassword] = useState('')
  const [vaultError, setVaultError] = useState('')
  const [showVaultPassword, setShowVaultPassword] = useState(false)
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)
  const [showAccessPanel, setShowAccessPanel] = useState(false)
  const [showVaultSetup, setShowVaultSetup] = useState(false)
  const [newVaultPassword, setNewVaultPassword] = useState('')
  const [vaultSetupError, setVaultSetupError] = useState('')
  const qc = useQueryClient()

  // Fetch document list
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['docs-list'],
    queryFn: () => apiFetch('/api/docs', undefined, token),
  })

  // Fetch selected document content (only when no vault dialog pending)
  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ['doc-content', selectedDocId, vaultPassword],
    queryFn: async () => {
      const doc = (docsData?.documents || []).find((d: any) => d.id === selectedDocId)
      let url = `/api/docs/${selectedDocId}`
      // If doc is confidential/patent, pass vault password
      if (doc?.isConfidential || doc?.category === 'patent') {
        url += `?vaultKey=${encodeURIComponent(vaultPassword)}`
      }
      return apiFetch(url, undefined, token)
    },
    enabled: !!selectedDocId && !showVaultDialog,
    retry: false,
  })

  // Fetch vault status
  const { data: vaultStatus } = useQuery({
    queryKey: ['vault-status'],
    queryFn: () => apiFetch('/api/docs/vault?docId=patent-documentation', undefined, token),
  })

  // Fetch users for access control
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => apiFetch('/api/admin/users?limit=100', undefined, token),
    enabled: showAccessPanel,
  })

  // Fetch access grants
  const { data: accessData } = useQuery({
    queryKey: ['doc-access'],
    queryFn: () => apiFetch('/api/docs/access', undefined, token),
    enabled: showAccessPanel,
  })

  // Mutations
  const grantAccessMut = useMutation({
    mutationFn: (data: any) => apiFetch('/api/docs/access', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-access'] }) },
  })

  const revokeAccessMut = useMutation({
    mutationFn: (data: any) => apiFetch('/api/docs/access', {
      method: 'DELETE',
      body: JSON.stringify(data),
    }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['doc-access'] }) },
  })

  const setVaultMut = useMutation({
    mutationFn: (data: any) => apiFetch('/api/docs/vault', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-status'] })
      setShowVaultSetup(false)
      setNewVaultPassword('')
      setVaultSetupError('')
    },
    onError: (err: Error) => setVaultSetupError(err.message),
  })

  const documents = docsData?.documents || []

  const filteredDocs = documents.filter((doc: any) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDocClick = (docId: string) => {
    const doc = documents.find((d: any) => d.id === docId)
    // If patent/confidential doc and vault password is set, require password
    if ((doc?.isConfidential || doc?.category === 'patent') && vaultStatus?.isPasswordSet) {
      if (!vaultPassword) {
        setPendingDocId(docId)
        setShowVaultDialog(true)
        setVaultError('')
        return
      }
    }
    setSelectedDocId(docId)
  }

  const handleVaultSubmit = () => {
    if (!vaultPassword.trim()) {
      setVaultError('Password is required')
      return
    }
    setVaultError('')
    setSelectedDocId(pendingDocId)
    setPendingDocId(null)
    setShowVaultDialog(false)
  }

  const handleDownloadPdf = () => {
    if (!docData) return
    generateDocumentationPdf({
      title: docData.title,
      content: docData.content,
      category: docData.category,
      version: docData.version,
      isConfidential: docData.isConfidential,
    })
  }

  const handleSetVaultPassword = () => {
    if (!newVaultPassword.trim() || newVaultPassword.length < 6) {
      setVaultSetupError('Password must be at least 6 characters')
      return
    }
    setVaultMut.mutate({
      docId: 'patent-documentation',
      action: 'set',
      password: newVaultPassword,
    })
  }

  // ── Document Detail View ──────────────────────────────────────
  if (selectedDocId && docData) {
    const catConfig = categoryConfig[docData.category] || categoryConfig['technical']
    const CatIcon = catConfig.icon

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className={btnOutline} onClick={() => { setSelectedDocId(null); setVaultPassword('') }}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Docs
          </Button>
          <div className="flex-1" />
          {docData.canDownload !== false && (
            <Button className={btnPrimary} onClick={handleDownloadPdf}>
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          )}
        </div>

        {/* Doc header card */}
        <Card className={cardCls}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${catConfig.bg} shrink-0`}>
                <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-amber-100">{docData.title}</h2>
                  {docData.isConfidential && (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                      <Lock className="mr-1 h-3 w-3" /> CONFIDENTIAL
                    </Badge>
                  )}
                  {docData.requiresVaultPassword && (
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
                      <KeyRound className="mr-1 h-3 w-3" /> VAULT PROTECTED
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-amber-200/50 mt-1">{docData.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-amber-200/40">
                  <span>Version: v{docData.version}</span>
                  <span>•</span>
                  <span>Updated: {new Date(docData.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>•</span>
                  <span className={catConfig.color}>{catConfig.label}</span>
                </div>
              </div>
            </div>

            {docData.isConfidential && (
              <div className="mt-3 rounded-lg border border-red-600/30 bg-red-950/20 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">
                    This document contains proprietary and confidential information of 3BOXES LUXURY.
                    Unauthorized copying, distribution, or disclosure is strictly prohibited.
                    This document is vault-protected and requires a password to access.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Markdown content */}
        <Card className={cardCls}>
          <CardContent className="p-6">
            <div className="prose prose-invert prose-amber max-w-none
              prose-headings:text-amber-100 prose-headings:font-bold
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-amber-900/30 prose-h1:pb-2
              prose-h2:text-xl prose-h2:mt-8
              prose-h3:text-lg prose-h3:mt-6
              prose-h4:text-base prose-h4:mt-4
              prose-p:text-amber-200/70 prose-p:leading-relaxed
              prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-amber-100
              prose-code:text-amber-300 prose-code:bg-amber-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-stone-950 prose-pre:border prose-pre:border-amber-900/30 prose-pre:rounded-lg
              prose-li:text-amber-200/70
              prose-table:border prose-table:border-amber-900/30
              prose-th:bg-amber-900/20 prose-th:text-amber-100 prose-th:p-2 prose-th:border prose-th:border-amber-900/30
              prose-td:text-amber-200/70 prose-td:p-2 prose-td:border prose-td:border-amber-900/30
              prose-blockquote:border-amber-600 prose-blockquote:bg-amber-900/10 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
              prose-hr:border-amber-900/30
            ">
              <ReactMarkdown>{docData.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Download button at bottom too */}
        {docData.canDownload !== false && (
          <div className="flex justify-center py-4">
            <Button className={btnPrimary} size="lg" onClick={handleDownloadPdf}>
              <Download className="mr-2 h-5 w-5" /> Download as PDF
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Document Loading View ─────────────────────────────────────
  if (selectedDocId && docLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="mt-3 text-sm text-amber-200/50">Loading document...</p>
      </div>
    )
  }

  // ── Document List View ────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-400" />
            Documentation Hub
          </h2>
          <p className="text-sm text-amber-200/50 mt-1">
            Access technical documentation, SOPs, AI strategy guides, deployment instructions, and confidential patent documents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className={btnOutline} onClick={() => setShowAccessPanel(!showAccessPanel)}>
            <Settings className="mr-1 h-4 w-4" /> Access Control
          </Button>
          {!vaultStatus?.isPasswordSet && (
            <Button className={btnPrimary} onClick={() => setShowVaultSetup(true)}>
              <KeyRound className="mr-1 h-4 w-4" /> Set Vault Password
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/30" />
        <input
          className="w-full rounded-lg border border-amber-900/40 bg-stone-800/50 pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/50 focus:outline-none focus:ring-1 focus:ring-amber-600/30"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Vault Status Banner */}
      {vaultStatus?.isPasswordSet && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-950/10 p-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300/80">
              Patent Documentation is <strong>vault-protected</strong>. You will be asked for the vault password when accessing it.
              Only the super admin who set the password can change it.
            </p>
          </div>
        </div>
      )}

      {/* Access Control Panel */}
      <AnimatePresence>
        {showAccessPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AccessControlPanel
              token={token}
              documents={documents}
              users={usersData?.users || []}
              grants={accessData?.grants || []}
              onGrant={grantAccessMut.mutate}
              onRevoke={revokeAccessMut.mutate}
              isGranting={grantAccessMut.isPending}
              isRevoking={revokeAccessMut.isPending}
              vaultStatus={vaultStatus}
              onSetVault={(pw) => setVaultMut.mutate({ docId: 'patent-documentation', action: 'set', password: pw })}
              isSettingVault={setVaultMut.isPending}
              vaultSetupError={vaultSetupError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidential notice for admins */}
      {documents.some((d: any) => d.isConfidential) && (
        <div className="rounded-lg border border-red-600/30 bg-red-950/10 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300/80">
              Documents marked <Badge className="ml-1 bg-red-600/20 text-red-400 border-red-600/30 text-[10px] px-1.5 py-0">CONFIDENTIAL</Badge>
              are vault-protected and proprietary. They must NOT be shared outside the organization or included in public repositories (Git).
              Use Access Control to manage who can view each document.
            </p>
          </div>
        </div>
      )}

      {/* Document cards */}
      {docsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <p className="mt-2 text-sm text-amber-200/50">Loading documentation...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredDocs.map((doc: any) => {
            const catConfig = categoryConfig[doc.category] || categoryConfig['technical']
            const CatIcon = catConfig.icon
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`${cardCls} cursor-pointer transition-all hover:border-amber-600/40 hover:bg-stone-900/90 ${doc.isConfidential ? 'border-red-600/30' : ''}`}
                  onClick={() => handleDocClick(doc.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${catConfig.bg} shrink-0`}>
                        <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-amber-100">{doc.title}</h3>
                          {doc.isConfidential && (
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-[10px] px-1.5 py-0">
                              <Lock className="mr-0.5 h-2.5 w-2.5" /> CONFIDENTIAL
                            </Badge>
                          )}
                          {(doc.category === 'patent' && vaultStatus?.isPasswordSet) && (
                            <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-[10px] px-1.5 py-0">
                              <KeyRound className="mr-0.5 h-2.5 w-2.5" /> VAULT
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-amber-200/40 mt-1 line-clamp-2">{doc.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`${catConfig.bg} ${catConfig.color} border-0 text-[10px]`}>
                            {catConfig.label}
                          </Badge>
                          <span className="text-[10px] text-amber-200/30">v{doc.version}</span>
                          <span className="text-[10px] text-amber-200/30">{new Date(doc.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-200/30 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}

          {filteredDocs.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-12">
              <FileText className="h-10 w-10 text-amber-200/20" />
              <p className="mt-2 text-sm text-amber-200/40">No documentation found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <Card className="border-amber-900/20 bg-amber-900/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-200">About Documentation Hub</h4>
              <p className="text-xs text-amber-200/40 mt-1">
                All documents can be downloaded as PDF files. Non-confidential documents (Technical, SOP, AI Strategy, Deployment)
                are also available in the project's <code className="text-amber-300 bg-amber-900/20 px-1 rounded text-[11px]">docs/</code> directory on Git.
                The Patent Documentation is strictly confidential and vault-protected — it is ONLY accessible through this admin panel with a vault password, and is excluded from the Git repository.
                Use <strong>Access Control</strong> to manage who can view each document.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Vault Password Dialog ── */}
      <Dialog open={showVaultDialog} onOpenChange={setShowVaultDialog}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Vault Password Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-600/30 bg-red-950/20 p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">
                  This document is vault-protected. Enter the vault password to access the confidential patent documentation.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-200/60 text-xs">Vault Password</Label>
              <div className="relative">
                <input
                  type={showVaultPassword ? 'text' : 'password'}
                  className={`w-full rounded-lg border ${inputCls} pr-10 pl-3 py-2 text-sm`}
                  placeholder="Enter vault password..."
                  value={vaultPassword}
                  onChange={e => setVaultPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVaultSubmit()}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-amber-200/40"
                  onClick={() => setShowVaultPassword(!showVaultPassword)}
                >
                  {showVaultPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {vaultError && <p className="text-xs text-red-400">{vaultError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className={btnOutline} onClick={() => { setShowVaultDialog(false); setPendingDocId(null); setVaultError('') }}>
              Cancel
            </Button>
            <Button className={btnPrimary} onClick={handleVaultSubmit}>
              <KeyRound className="mr-1 h-4 w-4" /> Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Vault Setup Dialog ── */}
      <Dialog open={showVaultSetup} onOpenChange={setShowVaultSetup}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              Set Vault Password for Patent Docs
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-600/30 bg-amber-950/10 p-3">
              <p className="text-xs text-amber-300/80">
                Set a vault password to protect the confidential patent documentation. Only users who know this password will be able to access patent docs.
                <strong className="text-amber-200"> Make sure to remember this password — it cannot be recovered.</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-200/60 text-xs">New Vault Password (min 6 characters)</Label>
              <input
                type="password"
                className={`w-full rounded-lg border ${inputCls} px-3 py-2 text-sm`}
                placeholder="Enter new vault password..."
                value={newVaultPassword}
                onChange={e => setNewVaultPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetVaultPassword()}
              />
              {vaultSetupError && <p className="text-xs text-red-400">{vaultSetupError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className={btnOutline} onClick={() => setShowVaultSetup(false)}>Cancel</Button>
            <Button className={btnPrimary} onClick={handleSetVaultPassword} disabled={setVaultMut.isPending}>
              {setVaultMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1 h-4 w-4" />}
              Set Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Access Control Panel Sub-Component ──────────────────────────────

function AccessControlPanel({
  token,
  documents,
  users,
  grants,
  onGrant,
  onRevoke,
  isGranting,
  isRevoking,
  vaultStatus,
  onSetVault,
  isSettingVault,
  vaultSetupError,
}: {
  token: string | null
  documents: any[]
  users: any[]
  grants: any[]
  onGrant: (data: any) => void
  onRevoke: (data: any) => void
  isGranting: boolean
  isRevoking: boolean
  vaultStatus?: any
  onSetVault: (password: string) => void
  isSettingVault: boolean
  vaultSetupError: string
}) {
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [canView, setCanView] = useState(true)
  const [canDownload, setCanDownload] = useState(true)
  const [canShare, setCanShare] = useState(false)
  const [vaultPw, setVaultPw] = useState('')

  const docGrants = selectedDoc ? grants.filter((g: any) => g.docId === selectedDoc) : []

  const handleGrant = () => {
    if (!selectedDoc || !selectedUser) return
    onGrant({
      docId: selectedDoc,
      userId: selectedUser,
      canView,
      canDownload,
      canShare,
    })
    setSelectedUser('')
  }

  return (
    <Card className={cardCls}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-amber-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-400" /> Document Access Control
        </CardTitle>
        <p className="text-xs text-amber-200/40">
          Manage who can access each documentation. Patent docs also require vault password.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vault Password Section */}
        <div className="rounded-lg border border-amber-600/20 bg-amber-950/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-amber-200 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" /> Patent Vault Password
              </h4>
              <p className="text-[10px] text-amber-200/40 mt-0.5">
                {vaultStatus?.isPasswordSet
                  ? 'Vault password is active. Patent docs require this password.'
                  : 'No vault password set. Set one to protect patent docs.'}
              </p>
            </div>
            {!vaultStatus?.isPasswordSet && (
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  className={`rounded border ${inputCls} px-2 py-1 text-xs w-32`}
                  placeholder="New password..."
                  value={vaultPw}
                  onChange={e => setVaultPw(e.target.value)}
                />
                <Button
                  size="sm"
                  className={`${btnPrimary} text-xs h-7`}
                  onClick={() => vaultPw.length >= 6 && onSetVault(vaultPw)}
                  disabled={isSettingVault || vaultPw.length < 6}
                >
                  {isSettingVault ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Set'}
                </Button>
              </div>
            )}
            {vaultStatus?.isPasswordSet && (
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">
                <CheckCircle className="mr-1 h-3 w-3" /> Active
              </Badge>
            )}
          </div>
        </div>

        <Separator className="bg-amber-900/20" />

        {/* Grant Access Form */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-amber-200">Grant Access</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Document Select */}
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-200/50">Document</Label>
              <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                <SelectTrigger className="h-8 text-xs border-amber-900/40 bg-stone-800/50 text-amber-100">
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/40 bg-stone-950">
                  {documents.map((doc: any) => (
                    <SelectItem key={doc.id} value={doc.id} className="text-xs text-amber-100">
                      {doc.title} {doc.isConfidential ? '🔒' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Select */}
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-200/50">User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-8 text-xs border-amber-900/40 bg-stone-800/50 text-amber-100">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="border-amber-900/40 bg-stone-950 max-h-48">
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs text-amber-100">
                      {u.name} ({u.email}) — {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions */}
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-200/50">Permissions</Label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1 text-[10px] text-amber-200/60 cursor-pointer">
                  <Checkbox checked={canView} onCheckedChange={(v) => setCanView(!!v)} className="h-3 w-3" /> View
                </label>
                <label className="flex items-center gap-1 text-[10px] text-amber-200/60 cursor-pointer">
                  <Checkbox checked={canDownload} onCheckedChange={(v) => setCanDownload(!!v)} className="h-3 w-3" /> Download
                </label>
                <label className="flex items-center gap-1 text-[10px] text-amber-200/60 cursor-pointer">
                  <Checkbox checked={canShare} onCheckedChange={(v) => setCanShare(!!v)} className="h-3 w-3" /> Share
                </label>
              </div>
            </div>
          </div>

          <Button
            className={`${btnPrimary} text-xs h-8`}
            onClick={handleGrant}
            disabled={isGranting || !selectedDoc || !selectedUser}
          >
            {isGranting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserPlus className="mr-1 h-3 w-3" />}
            Grant Access
          </Button>
        </div>

        <Separator className="bg-amber-900/20" />

        {/* Current Access Grants */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-200">Current Access Grants {selectedDoc && `(${docGrants.length})`}</h4>
          {docGrants.length === 0 ? (
            <p className="text-xs text-amber-200/30">
              {selectedDoc ? 'No access grants for this document yet.' : 'Select a document to see its access grants.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {docGrants.map((grant: any) => {
                const user = grant.user || {}
                return (
                  <div key={grant.id} className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-stone-800/30 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-amber-100 truncate">{user.name || 'Unknown'}</p>
                      <p className="text-[10px] text-amber-200/40 truncate">{user.email} — {user.role}</p>
                      <div className="flex gap-1 mt-1">
                        {grant.canView && <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[8px] px-1 py-0">View</Badge>}
                        {grant.canDownload && <Badge className="bg-green-600/10 text-green-400 border-green-600/20 text-[8px] px-1 py-0">Download</Badge>}
                        {grant.canShare && <Badge className="bg-amber-600/10 text-amber-400 border-amber-600/20 text-[8px] px-1 py-0">Share</Badge>}
                        {grant.expiresAt && (
                          <Badge className="bg-orange-600/10 text-orange-400 border-orange-600/20 text-[8px] px-1 py-0">
                            <Clock className="mr-0.5 h-2 w-2" /> Expires {new Date(grant.expiresAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-900/20 shrink-0"
                      onClick={() => onRevoke({ docId: grant.docId, userId: grant.userId })}
                      disabled={isRevoking}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
