import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    requiresVaultPassword: true,
  },
]

// ── Auth Helper ─────────────────────────────────────────────────────

interface DecodedUser {
  userId: string
  email: string
  role: string
}

function getUserFromRequest(request: NextRequest): DecodedUser | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return { role: payload.role || 'user', email: payload.email || '', userId: payload.userId || payload.sub || '' }
  } catch {
    return null
  }
}

// ── GET /api/docs ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Filter docs based on user role
  let availableDocs = DOCS_REGISTRY
    .filter(doc => doc.allowedRoles.includes(user.role))
    .map(doc => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      isConfidential: doc.isConfidential,
      version: doc.version,
      lastUpdated: doc.lastUpdated,
      requiresVaultPassword: doc.requiresVaultPassword,
    }))

  // Also include docs that the user has been explicitly granted access to
  try {
    const userGrants = await db.docAccessGrant.findMany({
      where: { userId: user.userId, canView: true },
    })

    for (const grant of userGrants) {
      // Check if already included by role
      if (availableDocs.some(d => d.id === grant.docId)) continue

      // Check expiry
      if (grant.expiresAt && new Date() > grant.expiresAt) continue

      const doc = DOCS_REGISTRY.find(d => d.id === grant.docId)
      if (doc) {
        availableDocs.push({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          isConfidential: doc.isConfidential,
          version: doc.version,
          lastUpdated: doc.lastUpdated,
          requiresVaultPassword: doc.requiresVaultPassword,
        })
      }
    }
  } catch (err) {
    console.error('[docs] Access grant lookup error:', err)
    // Continue with role-based docs only
  }

  // Remove duplicates
  const seen = new Set<string>()
  availableDocs = availableDocs.filter(d => {
    if (seen.has(d.id)) return false
    seen.add(d.id)
    return true
  })

  return NextResponse.json({ documents: availableDocs })
}
