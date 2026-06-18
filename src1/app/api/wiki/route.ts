import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth-api'

// GET /api/wiki — return wiki documents based on user role
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('all') === 'true'

    let docs

    if (user.role === 'admin') {
      // Admin can see all docs (including unpublished) if ?all=true
      docs = await db.wikiDocument.findMany({
        where: includeUnpublished ? {} : { isPublished: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          version: true,
          isPublished: true,
          accessRoles: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else if (user.role === 'team') {
      // Team can see all published docs
      docs = await db.wikiDocument.findMany({
        where: { isPublished: true },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          version: true,
          isPublished: true,
          accessRoles: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else if (user.role === 'agent') {
      // Agent can see:
      // 1. Docs where their role is in accessRoles
      // 2. Docs shared with them via AgentDocShare
      const [accessRoleDocs, sharedDocs] = await Promise.all([
        db.wikiDocument.findMany({
          where: {
            isPublished: true,
            accessRoles: { contains: 'agent' },
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            version: true,
            isPublished: true,
            accessRoles: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        db.wikiDocument.findMany({
          where: {
            isPublished: true,
            docShares: {
              some: { agentId: user.id },
            },
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            version: true,
            isPublished: true,
            accessRoles: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ])

      // Merge and deduplicate
      const seen = new Set<string>()
      docs = [...accessRoleDocs, ...sharedDocs].filter((doc) => {
        if (seen.has(doc.id)) return false
        seen.add(doc.id)
        return true
      })
    } else {
      // Regular user can see docs with accessRoles containing 'user'
      docs = await db.wikiDocument.findMany({
        where: {
          isPublished: true,
          accessRoles: { contains: 'user' },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          version: true,
          isPublished: true,
          accessRoles: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    return NextResponse.json({ documents: docs })
  } catch (error) {
    console.error('Wiki GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wiki documents' }, { status: 500 })
  }
}

// POST /api/wiki — admin: create a new wiki document
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, category, slug, version, isPublished, accessRoles } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    // Auto-generate slug from title if not provided
    const docSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check for slug uniqueness
    const existing = await db.wikiDocument.findUnique({ where: { slug: docSlug } })
    if (existing) {
      return NextResponse.json({ error: 'A document with this slug already exists' }, { status: 409 })
    }

    const doc = await db.wikiDocument.create({
      data: {
        title,
        slug: docSlug,
        content,
        category: category || 'general',
        version: version || '1.0',
        isPublished: isPublished ?? false,
        accessRoles: accessRoles || 'admin,team,agent,user',
        createdBy: user.id,
      },
    })

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    console.error('Wiki POST error:', error)
    return NextResponse.json({ error: 'Failed to create wiki document' }, { status: 500 })
  }
}
