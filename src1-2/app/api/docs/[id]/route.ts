import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// ── Documentation Registry ──────────────────────────────────────────

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
  requiresVaultPassword: boolean
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
    requiresVaultPassword: false,
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
    requiresVaultPassword: false,
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
    requiresVaultPassword: false,
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
    requiresVaultPassword: false,
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
    requiresVaultPassword: true,  // Requires vault password to access
  },
]

// ── Auth Helper ─────────────────────────────────────────────────────

interface DecodedUser {
  userId: string
  email: string
  role: string
  adminRole?: string
}

function getUserFromRequest(request: NextRequest): DecodedUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return {
      userId: payload.userId || payload.sub || '',
      email: payload.email || '',
      role: payload.role || 'user',
      adminRole: payload.adminRole || undefined,
    }
  } catch {
    return null
  }
}

// ── GET /api/docs/[id] ──────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = getUserFromRequest(request)

  // Find the document
  const doc = DOCS_REGISTRY.find(d => d.id === id)
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Auth check - all docs require login
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Role check - confidential docs are admin-only
  if (doc.isConfidential && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied — this document requires admin privileges' }, { status: 403 })
  }

  // Check allowed roles
  if (!doc.allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Access denied — insufficient privileges' }, { status: 403 })
  }

  // ── Vault Password Check for confidential docs ──
  if (doc.requiresVaultPassword) {
    const vaultPassword = request.nextUrl.searchParams.get('vaultKey')
    if (!vaultPassword) {
      return NextResponse.json(
        { error: 'Vault password required', requiresVaultPassword: true },
        { status: 403 }
      )
    }

    // Verify vault password
    try {
      const vault = await db.docVaultPassword.findUnique({ where: { docId: doc.id } })
      if (!vault) {
        // No vault password set yet — super admin can access without one
        // But we should inform the frontend that a password needs to be set
        return NextResponse.json(
          { error: 'Vault password not configured. Super admin must set a vault password first.', vaultNotConfigured: true },
          { status: 403 }
        )
      }

      const isValid = await bcrypt.compare(vaultPassword, vault.password)
      if (!isValid) {
        // Audit failed attempt
        await db.auditLog.create({
          data: {
            userId: user.userId,
            action: 'vault_access_failed',
            entity: 'documentation',
            entityId: doc.id,
            details: JSON.stringify({ attemptedBy: user.email }),
          },
        })
        return NextResponse.json({ error: 'Incorrect vault password' }, { status: 401 })
      }

      // Audit successful access
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'vault_access_granted',
          entity: 'documentation',
          entityId: doc.id,
          details: JSON.stringify({ accessedBy: user.email }),
        },
      })
    } catch (err) {
      console.error('[docs/[id]] Vault check error:', err)
      return NextResponse.json({ error: 'Vault verification failed' }, { status: 500 })
    }
  }

  // ── Access Grant Check (non-admin users) ──
  if (user.role !== 'admin') {
    try {
      const grant = await db.docAccessGrant.findUnique({
        where: { docId_userId: { docId: doc.id, userId: user.userId } },
      })

      if (!grant || !grant.canView) {
        return NextResponse.json({ error: 'Access denied — you have not been granted access to this document' }, { status: 403 })
      }

      // Check expiry
      if (grant.expiresAt && new Date() > grant.expiresAt) {
        return NextResponse.json({ error: 'Access expired — your access to this document has expired' }, { status: 403 })
      }
    } catch (err) {
      console.error('[docs/[id]] Access grant check error:', err)
      // If DB check fails, fall through to allow for admins
    }
  }

  // Read the markdown file
  try {
    const docsDir = join(process.cwd(), 'docs')
    const filePath = join(docsDir, doc.filename)
    const content = await readFile(filePath, 'utf-8')

    // Check download permission for the canDownload flag
    let canDownload = true
    if (user.role !== 'admin') {
      try {
        const grant = await db.docAccessGrant.findUnique({
          where: { docId_userId: { docId: doc.id, userId: user.userId } },
        })
        canDownload = grant?.canDownload ?? false
      } catch {
        canDownload = false
      }
    }

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
      requiresVaultPassword: doc.requiresVaultPassword,
      canDownload,
    })
  } catch (err) {
    console.error(`[docs] Failed to read ${doc.filename}:`, err)
    return NextResponse.json({ error: 'Document file not found on server' }, { status: 500 })
  }
}
