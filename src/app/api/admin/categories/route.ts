import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helper'

// GET /api/admin/categories - List all categories with product counts (admin only)
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    const transformed = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      productCount: cat._count.products,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }))

    return NextResponse.json({ categories: transformed })
  } catch (err) {
    console.error('Error fetching categories:', err)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categories - Create category (admin only)
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { name, slug, description, image } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name if not provided
    const categorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check if slug already exists
    const existing = await db.category.findUnique({ where: { slug: categorySlug } })
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        name,
        slug: categorySlug,
        description: description || undefined,
        image: image || undefined,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({
      category: {
        ...category,
        productCount: category._count.products,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('Error creating category:', err)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categories - Update category (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const category = await db.category.findUnique({ where: { id } })
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.slug !== undefined) {
      // Check slug uniqueness if changing
      if (fields.slug !== category.slug) {
        const existing = await db.category.findUnique({ where: { slug: fields.slug } })
        if (existing) {
          return NextResponse.json(
            { error: 'A category with this slug already exists' },
            { status: 409 }
          )
        }
      }
      updateData.slug = fields.slug
    }
    if (fields.description !== undefined) updateData.description = fields.description || null
    if (fields.image !== undefined) updateData.image = fields.image || null

    const updatedCategory = await db.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({
      category: {
        ...updatedCategory,
        productCount: updatedCategory._count.products,
      },
    })
  } catch (err) {
    console.error('Error updating category:', err)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categories - Delete category (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const category = await db.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Only allow deletion if no products are in this category
    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${category._count.products} product(s). Move or delete products first.` },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { id } })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (err) {
    console.error('Error deleting category:', err)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
