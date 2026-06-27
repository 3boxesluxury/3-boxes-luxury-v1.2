import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// ── Documentation Registry (mirrored) ──────────────────────────────

interface DocMeta {
  id: string
  title: string
  description: string
  category: string
  isConfidential: boolean
  version: string
  lastUpdated: string
  filename: string
  allowedRoles: string[]
}

const DOCS_REGISTRY: DocMeta[] = [
  {
    id: 'technical-documentation',
    title: '3BOXES Technical Documentation',
    description: 'Comprehensive technical reference covering system architecture, components, APIs, database schema, authentication, state management, and all frontend/backend code.',
    category: 'technical',
    isConfidential: false,
    version: '2.0.0',
    lastUpdated: '2026-03-05',
    filename: '01-technical-documentation.md',
    allowedRoles: ['admin', 'team', 'agent'],
  },
  {
    id: 'sop-documentation',
    title: 'Standard Operating Procedures (SOPs)',
    description: 'Role-wise and user-wise SOPs covering all platform operations for Customers, Admins, Agents, Team Members, and Corporate Users.',
    category: 'sop',
    isConfidential: false,
    version: '2.0.0',
    lastUpdated: '2026-03-05',
    filename: '02-sop-documentation.md',
    allowedRoles: ['admin', 'team', 'agent'],
  },
  {
    id: 'ai-strategy-documentation',
    title: 'AI Code Strategy & Implementation',
    description: 'Detailed documentation of AI systems architecture, virtual try-on pipeline, VLM integration, prompt engineering, and multi-strategy fallback chain with code explanations.',
    category: 'ai-strategy',
    isConfidential: false,
    version: '2.0.0',
    lastUpdated: '2026-03-05',
    filename: '03-ai-strategy-documentation.md',
    allowedRoles: ['admin', 'team'],
  },
  {
    id: 'deployment-documentation',
    title: 'Deployment Strategy & DevOps',
    description: 'Complete deployment guide for Vercel (cloud) and local environments with prerequisites, step-by-step instructions, Shopify setup, AI services, and troubleshooting.',
    category: 'deployment',
    isConfidential: false,
    version: '2.0.0',
    lastUpdated: '2026-03-05',
    filename: '04-deployment-documentation.md',
    allowedRoles: ['admin'],
  },
  {
    id: 'patent-documentation',
    title: 'Patent Documentation (CONFIDENTIAL)',
    description: 'Proprietary intellectual property documentation covering patentable inventions, claims, technical implementation details, and filing strategy. STRICTLY CONFIDENTIAL.',
    category: 'patent',
    isConfidential: true,
    version: '1.0.0',
    lastUpdated: '2026-03-05',
    filename: '05-patent-documentation.md',
    allowedRoles: ['admin'],
  },
]

// ── Auth Helper ─────────────────────────────────────────────────────

function getUserFromRequest(request: NextRequest): { role: string; email: string } | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return { role: payload.role || 'user', email: payload.email || '' }
  } catch {
    return null
  }
}

// ── GET /api/docs/pdf?id=xxx ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get('id')

  if (!docId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
  }

  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const doc = DOCS_REGISTRY.find(d => d.id === docId)
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Role check
  if (doc.isConfidential && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied — this document requires admin privileges' }, { status: 403 })
  }

  if (!doc.allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Access denied — insufficient privileges' }, { status: 403 })
  }

  // Read the markdown file
  try {
    const docsDir = join(process.cwd(), 'docs')
    const filePath = join(docsDir, doc.filename)
    const content = await readFile(filePath, 'utf-8')

    // Return the markdown content as downloadable text
    // The client-side jsPDF will handle the PDF generation
    // This endpoint provides the raw content with metadata
    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      isConfidential: doc.isConfidential,
      version: doc.version,
      lastUpdated: doc.lastUpdated,
      content,
      filename: doc.filename,
    })
  } catch (err) {
    console.error(`[docs/pdf] Failed to read ${doc.filename}:`, err)
    return NextResponse.json({ error: 'Document file not found on server' }, { status: 500 })
  }
}
