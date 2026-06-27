'use client'

import { useStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'
import {
  BookOpen,
  ArrowLeft,
  Eye,
  Download,
  FileText,
  Lock,
  LogIn,
  X,
  Share2,
  Link2,
  Mail,
  CheckCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useState, useCallback, useRef } from 'react'
import { generateWikiPdf, shareDocumentLink, shareViaEmail, shareViaWhatsApp, shareViaLinkedIn, shareViaTwitter } from '@/lib/pdf-utils'
import { showToast } from '@/hooks/use-toast-notification'

// ── Types ────────────────────────────────────────────────────────

interface WikiDocListItem {
  id: string
  title: string
  slug: string
  category: string
  version: string
  accessRoles: string
  createdAt: string
  updatedAt: string
}

interface WikiDocFull {
  id: string
  title: string
  slug: string
  content: string
  category: string
  version: string
  isPublished: boolean
  accessRoles: string
  canDownload: boolean
  canShare: boolean
  createdAt: string
  updatedAt: string
}

// ── Category Badge Config ────────────────────────────────────────

const categoryConfig: Record<
  string,
  { label: string; className: string }
> = {
  architecture: {
    label: 'Architecture',
    className:
      'bg-amber-600/20 text-amber-400 border-amber-600/30',
  },
  api: {
    label: 'API',
    className:
      'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  },
  technical: {
    label: 'Technical',
    className:
      'bg-rose-600/20 text-rose-400 border-rose-600/30',
  },
  training: {
    label: 'Training',
    className:
      'bg-purple-600/20 text-purple-400 border-purple-600/30',
  },
  patent: {
    label: 'Patent',
    className:
      'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  },
  sop: {
    label: 'SOP',
    className:
      'bg-orange-600/20 text-orange-400 border-orange-600/30',
  },
  general: {
    label: 'General',
    className:
      'bg-stone-600/20 text-stone-400 border-stone-600/30',
  },
}

// ── Markdown Styles ──────────────────────────────────────────────

const markdownStyles = `
  prose-headings:text-amber-100
  prose-p:text-amber-200/70
  prose-strong:text-amber-100
  prose-code:text-amber-300
  prose-a:text-amber-400
  prose-li:text-amber-200/70
  prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-amber-900/30 prose-h1:pb-3 prose-h1:mb-4
  prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3
  prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-2
  prose-p:leading-relaxed prose-p:mb-4
  prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
  prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
  prose-li:mb-1
  prose-code:bg-stone-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
  prose-pre:bg-stone-900 prose-pre:border prose-pre:border-amber-900/20 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
  prose-blockquote:border-l-amber-600 prose-blockquote:bg-amber-900/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r
  prose-hr:border-amber-900/20
  prose-table:text-sm
  prose-th:text-amber-100 prose-th:bg-stone-800/50 prose-th:p-2
  prose-td:text-amber-200/70 prose-td:border-amber-900/20 prose-td:p-2
`

// ── Component ────────────────────────────────────────────────────

export function WikiSection() {
  const { authUser, authToken, setView, setAuthView } = useStore()
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // ── Fetch document list ──────────────────────────────────────
  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
  } = useQuery<{ documents: WikiDocListItem[] }>({
    queryKey: ['wiki-docs', authToken],
    queryFn: () =>
      fetch('/api/wiki', {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch documents')
        return r.json()
      }),
    enabled: !!authToken,
  })

  // ── Fetch single document ────────────────────────────────────
  const {
    data: docData,
    isLoading: docLoading,
    error: docError,
  } = useQuery<{ document: WikiDocFull }>({
    queryKey: ['wiki-doc', selectedDocId, authToken],
    queryFn: () =>
      fetch(`/api/wiki/${selectedDocId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to fetch document')
        return r.json()
      }),
    enabled: !!selectedDocId && !!authToken,
  })

  const documents = listData?.documents ?? []
  const selectedDoc = docData?.document ?? null

  // ── Open document viewer ─────────────────────────────────────
  const handleViewDoc = useCallback((docId: string) => {
    setSelectedDocId(docId)
    setViewerOpen(true)
  }, [])

  // ── Close document viewer ────────────────────────────────────
  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false)
    // Delay clearing to allow close animation
    setTimeout(() => setSelectedDocId(null), 200)
  }, [])

  // ── Download document as PDF ─────────────────────────────────
  const handleDownloadPdf = useCallback(
    async (doc: WikiDocFull) => {
      setPdfGenerating(true)
      try {
        await generateWikiPdf({
          title: doc.title,
          content: doc.content,
          category: doc.category,
          version: doc.version,
          updatedAt: doc.updatedAt,
          slug: doc.slug,
        })
        showToast('success', `PDF downloaded: ${doc.slug}-v${doc.version}.pdf`)
      } catch (err) {
        console.error('PDF generation failed:', err)
        showToast('error', 'Failed to generate PDF. Please try again.')
      } finally {
        setPdfGenerating(false)
      }
    },
    []
  )

  // ── Download from list (fetch then PDF) ──────────────────────
  const handleDownloadPdfFromList = useCallback(
    async (doc: WikiDocListItem) => {
      if (!authToken) return
      setDownloadingId(doc.id)
      try {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const res = await fetch(`/api/wiki/${doc.id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data: { document: WikiDocFull } = await res.json()
        const fullDoc = data.document
        await generateWikiPdf({
          title: fullDoc.title,
          content: fullDoc.content,
          category: fullDoc.category,
          version: fullDoc.version,
          updatedAt: fullDoc.updatedAt,
          slug: fullDoc.slug,
        })
        showToast('success', `PDF downloaded: ${fullDoc.slug}-v${fullDoc.version}.pdf`)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('PDF download failed:', err)
          showToast('error', 'Failed to generate PDF. Please try again.')
        }
      } finally {
        setDownloadingId(null)
      }
    },
    [authToken]
  )

  // ── Share document ───────────────────────────────────────────
  const handleShare = useCallback(async (docId: string, docTitle: string) => {
    const result = await shareDocumentLink(docId, docTitle)
    if (result === 'copied') {
      showToast('success', 'Link copied to clipboard!')
    } else if (result === 'shared') {
      showToast('success', 'Document shared successfully!')
    } else {
      showToast('error', 'Failed to share. Please try again.')
    }
  }, [])

  const handleShareCopyLink = useCallback(async (docId: string) => {
    const url = `${window.location.origin}/?wiki=${docId}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('success', 'Link copied to clipboard!')
    } catch {
      showToast('error', 'Failed to copy link.')
    }
  }, [])

  // ── Format date ──────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // ── Auth Gate ────────────────────────────────────────────────
  if (!authUser || !authToken) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16"
      >
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-amber-900/20 bg-stone-900/60 px-10 py-14 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/20">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-amber-100">
              Authentication Required
            </h3>
            <p className="max-w-sm text-sm text-amber-200/50">
              Please log in to access documentation
            </p>
          </div>
          <Button
            onClick={() => setAuthView('login')}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        </div>
      </motion.div>
    )
  }

  // ── Main View ────────────────────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="py-8"
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setView('home')}
          className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Store
        </Button>

        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-600/15">
            <BookOpen className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-100">
              Technical Documentation
            </h2>
            <p className="mt-1 text-sm text-amber-200/40">
              Access technical documents, API guides, and architecture details
            </p>
          </div>
        </div>

        <Separator className="mb-8 bg-amber-900/20" />

        {/* Loading Skeleton */}
        {listLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-900/20 bg-stone-900/60 p-5"
              >
                <Skeleton className="mb-3 h-5 w-3/4 bg-stone-800" />
                <Skeleton className="mb-2 h-4 w-1/3 bg-stone-800" />
                <Skeleton className="mb-4 h-4 w-1/2 bg-stone-800" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 bg-stone-800" />
                  <Skeleton className="h-8 w-20 bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {listError && (
          <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-8 text-center">
            <p className="text-sm text-rose-300">
              Failed to load documents. Please try again later.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!listLoading && !listError && documents.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-amber-900/20 bg-stone-900/40 py-16 text-center">
            <FileText className="h-12 w-12 text-amber-600/30" />
            <div>
              <p className="text-amber-100/80 font-medium">
                No documents available
              </p>
              <p className="mt-1 text-sm text-amber-200/40">
                Documentation will appear here when published
              </p>
            </div>
          </div>
        )}

        {/* Document Grid */}
        {!listLoading && !listError && documents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc, i) => {
              const catConfig =
                categoryConfig[doc.category] || categoryConfig.general
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="group rounded-xl border border-amber-900/20 bg-stone-900/60 p-5 transition-all duration-200 hover:border-amber-600/40 hover:bg-stone-900/80 hover:shadow-lg hover:shadow-amber-900/10"
                >
                  {/* Card Header */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-amber-100 leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${catConfig.className}`}
                    >
                      {catConfig.label}
                    </Badge>
                  </div>

                  {/* Meta */}
                  <div className="mb-4 flex items-center gap-3 text-xs text-amber-200/40">
                    <span className="font-mono">v{doc.version}</span>
                    <span className="text-amber-900/40">·</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDoc(doc.id)}
                      className="h-8 border-amber-900/30 bg-transparent text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-100 hover:border-amber-600/40"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadPdfFromList(doc)}
                      disabled={downloadingId === doc.id}
                      className="h-8 text-amber-200/40 hover:bg-amber-900/20 hover:text-amber-400 disabled:opacity-50"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      PDF
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-amber-200/40 hover:bg-amber-900/20 hover:text-amber-400"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-stone-950 border-amber-900/30">
                        <DropdownMenuItem onClick={() => handleShareCopyLink(doc.id)} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                          <Link2 className="mr-2 h-3.5 w-3.5" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareViaEmail(doc.id, doc.title)} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                          <Mail className="mr-2 h-3.5 w-3.5" />
                          Share via Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-amber-900/20" />
                        <DropdownMenuItem onClick={() => shareViaWhatsApp(doc.id, doc.title)} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                          <span className="mr-2 text-green-400">💬</span>
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareViaLinkedIn(doc.id, doc.title)} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                          <span className="mr-2 text-blue-400">💼</span>
                          LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareViaTwitter(doc.id, doc.title)} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                          <span className="mr-2 text-sky-400">🐦</span>
                          Twitter / X
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Document Viewer Dialog ────────────────────────────── */}
      <Dialog open={viewerOpen} onOpenChange={(open) => !open && handleCloseViewer()}>
        <DialogContent className="max-w-3xl max-h-[85vh] bg-stone-950 border-amber-900/30 p-0 overflow-hidden flex flex-col">
          {docLoading && (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-2/3 bg-stone-800" />
              <Skeleton className="h-4 w-1/3 bg-stone-800" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-full bg-stone-800" />
                <Skeleton className="h-4 w-5/6 bg-stone-800" />
                <Skeleton className="h-4 w-4/6 bg-stone-800" />
              </div>
            </div>
          )}

          {docError && (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-300">
                Failed to load document. Please try again.
              </p>
            </div>
          )}

          {selectedDoc && !docLoading && (
            <>
              {/* Viewer Header */}
              <div className="shrink-0 border-b border-amber-900/20 bg-stone-900/60 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <DialogHeader className="flex-1 space-y-0">
                    <DialogTitle className="text-lg font-bold text-amber-100">
                      {selectedDoc.title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Document viewer for {selectedDoc.title}
                    </DialogDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          categoryConfig[selectedDoc.category]?.className ||
                          categoryConfig.general.className
                        }`}
                      >
                        {categoryConfig[selectedDoc.category]?.label ||
                          'General'}
                      </Badge>
                      <span className="text-xs text-amber-200/40 font-mono">
                        v{selectedDoc.version}
                      </span>
                      <span className="text-xs text-amber-200/40">
                        Updated {formatDate(selectedDoc.updatedAt)}
                      </span>
                    </div>
                  </DialogHeader>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedDoc.canDownload && (
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPdf(selectedDoc)}
                        disabled={pdfGenerating}
                        className="bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                      >
                        {pdfGenerating ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {pdfGenerating ? 'Generating...' : 'PDF'}
                      </Button>
                    )}
                    {selectedDoc.canShare && (
                      <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-900/30 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-100"
                          >
                            <Share2 className="mr-1.5 h-3.5 w-3.5" />
                            Share
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-stone-950 border-amber-900/30">
                          <DropdownMenuItem onClick={() => { handleShareCopyLink(selectedDoc.id); setShareMenuOpen(false) }} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                            <Link2 className="mr-2 h-3.5 w-3.5" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { shareViaEmail(selectedDoc.id, selectedDoc.title); setShareMenuOpen(false) }} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                            <Mail className="mr-2 h-3.5 w-3.5" />
                            Share via Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-amber-900/20" />
                          <DropdownMenuItem onClick={() => { shareViaWhatsApp(selectedDoc.id, selectedDoc.title); setShareMenuOpen(false) }} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                            <span className="mr-2 text-green-400">💬</span>
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { shareViaLinkedIn(selectedDoc.id, selectedDoc.title); setShareMenuOpen(false) }} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                            <span className="mr-2 text-blue-400">💼</span>
                            LinkedIn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { shareViaTwitter(selectedDoc.id, selectedDoc.title); setShareMenuOpen(false) }} className="text-amber-200/70 focus:bg-amber-900/20 focus:text-amber-100 cursor-pointer">
                            <span className="mr-2 text-sky-400">🐦</span>
                            Twitter / X
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCloseViewer}
                      className="text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-100"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              {/* Markdown Content */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5">
                  <article
                    className={`prose prose-invert max-w-none ${markdownStyles}`}
                  >
                    <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                  </article>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
