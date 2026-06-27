'use client'

import jsPDF from 'jspdf'

interface PdfDocumentData {
  title: string
  content: string
  category: string
  version: string
  updatedAt: string
  slug: string
}

/**
 * Generate a PDF from a wiki document and trigger download
 */
export async function generateWikiPdf(doc: PdfDocumentData) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // ── Header with brand ──
  pdf.setFillColor(28, 25, 23) // stone-950
  pdf.rect(0, 0, pageWidth, 40, 'F')

  pdf.setFillColor(217, 119, 6) // amber-600
  pdf.rect(0, 38, pageWidth, 2, 'F')

  pdf.setTextColor(251, 191, 36) // amber-400
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('3BOXES LUXURY', margin, 16)

  pdf.setTextColor(168, 162, 158) // stone-400
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Knowledge Hub — Technical Documentation', margin, 23)

  y = 50

  // ── Document Title ──
  pdf.setTextColor(28, 25, 23) // stone-950
  pdf.setFontSize(18)
  pdf.setFont('helvetica', 'bold')

  const titleLines = pdf.splitTextToSize(doc.title, contentWidth)
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 8 + 4

  // ── Meta info ──
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 113, 108) // stone-500

  const categoryLabel = doc.category.charAt(0).toUpperCase() + doc.category.slice(1)
  const metaLine = `Category: ${categoryLabel}  |  Version: v${doc.version}  |  Updated: ${new Date(doc.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
  pdf.text(metaLine, margin, y)
  y += 6

  // Separator line
  pdf.setDrawColor(217, 119, 6) // amber-600
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 8

  // ── Content ──
  pdf.setTextColor(28, 25, 23) // stone-950
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')

  const lines = doc.content.split('\n')
  const lineHeight = 5

  for (const line of lines) {
    // Check if we need a new page
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage()
      y = margin

      // Add subtle header on continuation pages
      pdf.setTextColor(168, 162, 158)
      pdf.setFontSize(7)
      pdf.text(`${doc.title} — v${doc.version}`, margin, y)
      pdf.setDrawColor(217, 119, 6)
      pdf.setLineWidth(0.3)
      pdf.line(margin, y + 2, pageWidth - margin, y + 2)
      y += 8

      pdf.setTextColor(28, 25, 23)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
    }

    if (line.trim() === '') {
      y += lineHeight * 0.5
      continue
    }

    // Heading detection
    if (line.startsWith('# ')) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(180, 83, 9) // amber-700
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 6 + 2
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('## ')) {
      y += 2
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(180, 83, 9)
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 5.5 + 2
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('### ')) {
      y += 1
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(120, 53, 15) // amber-800
      const headingLines = pdf.splitTextToSize(line.replace(/^#+\s*/, ''), contentWidth)
      pdf.text(headingLines, margin, y)
      y += headingLines.length * 5 + 1
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      const bulletText = line.replace(/^[-*]\s*/, '')
      pdf.text('•', margin + 2, y)
      const wrappedLines = pdf.splitTextToSize(bulletText, contentWidth - 6)
      pdf.text(wrappedLines, margin + 6, y)
      y += wrappedLines.length * lineHeight
    } else if (line.startsWith('> ')) {
      // Blockquote
      pdf.setFillColor(254, 243, 199) // amber-100
      const quoteText = line.replace(/^>\s*/, '')
      const wrappedLines = pdf.splitTextToSize(quoteText, contentWidth - 8)
      const quoteHeight = wrappedLines.length * lineHeight + 4
      pdf.roundedRect(margin, y - 3, contentWidth, quoteHeight, 1, 1, 'F')
      pdf.setDrawColor(217, 119, 6)
      pdf.setLineWidth(1)
      pdf.line(margin, y - 3, margin, y - 3 + quoteHeight)
      pdf.setTextColor(120, 53, 15)
      pdf.text(wrappedLines, margin + 4, y)
      y += quoteHeight + 2
      pdf.setTextColor(28, 25, 23)
    } else if (line.startsWith('```')) {
      // Code block marker - skip
      y += 2
    } else if (line.match(/^\d+\.\s/)) {
      // Numbered list
      const numText = line.replace(/^\d+\.\s*/, '')
      const num = line.match(/^(\d+)\./)?.[1] || '1'
      pdf.text(`${num}.`, margin, y)
      const wrappedLines = pdf.splitTextToSize(numText, contentWidth - 8)
      pdf.text(wrappedLines, margin + 8, y)
      y += wrappedLines.length * lineHeight
    } else {
      // Regular paragraph text
      const wrappedLines = pdf.splitTextToSize(line, contentWidth)
      pdf.text(wrappedLines, margin, y)
      y += wrappedLines.length * lineHeight
    }
  }

  // ── Footer on last page ──
  y = pageHeight - 12
  pdf.setDrawColor(217, 119, 6)
  pdf.setLineWidth(0.3)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 4
  pdf.setTextColor(168, 162, 158)
  pdf.setFontSize(7)
  pdf.text(`3Boxes Luxury — Knowledge Hub  |  ${doc.slug}-v${doc.version}  |  Generated: ${new Date().toLocaleDateString()}`, margin, y)

  // Download
  const fileName = `${doc.slug || 'document'}-v${doc.version}.pdf`
  pdf.save(fileName)

  return fileName
}

/**
 * Share a document - copy link to clipboard
 */
export async function shareDocumentLink(docId: string, docTitle: string): Promise<'copied' | 'shared' | 'failed'> {
  const url = `${window.location.origin}/?wiki=${docId}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: docTitle,
        text: `Check out this document: ${docTitle}`,
        url,
      })
      return 'shared'
    } catch (err) {
      // User cancelled or share failed, fall back to clipboard
      if ((err as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          return 'copied'
        } catch {
          return 'failed'
        }
      }
      return 'failed'
    }
  } else {
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      return 'failed'
    }
  }
}

/**
 * Share via specific channels
 */
export function shareViaEmail(docId: string, docTitle: string) {
  const url = `${window.location.origin}/?wiki=${docId}`
  const subject = encodeURIComponent(`3Boxes Knowledge Hub: ${docTitle}`)
  const body = encodeURIComponent(`Check out this document on 3Boxes Knowledge Hub:\n\n${docTitle}\n${url}`)
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
}

export function shareViaWhatsApp(docId: string, docTitle: string) {
  const url = `${window.location.origin}/?wiki=${docId}`
  const text = encodeURIComponent(`📖 ${docTitle}\n\nCheck it out: ${url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

export function shareViaLinkedIn(docId: string, docTitle: string) {
  const url = `${window.location.origin}/?wiki=${docId}`
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
}

export function shareViaTwitter(docId: string, docTitle: string) {
  const url = `${window.location.origin}/?wiki=${docId}`
  const text = encodeURIComponent(`📖 ${docTitle}`)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank')
}
