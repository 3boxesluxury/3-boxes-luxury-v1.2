import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Extended DB with models that may not be in the Prisma schema yet
// Use `edb` for models like oTP, corporate, corporateRecipient, exchangeRate, etc.
export const edb = db as PrismaClient & {
  oTP: any
  corporate: any
  corporateRecipient: any
  exchangeRate: any
  aIRecommendation: any
  trainingShare: any
  // Style Gallery models — auto-detect which one exists in your Prisma schema
  styleGallery: any
  customerPortfolio: any
}

// Auto-detect the correct Prisma model for style gallery
// styleGallery = newer schema with status field
// customerPortfolio = older schema with isApproved/isActive fields
export function getGalleryModel() {
  if ((db as any).styleGallery) return (db as any).styleGallery
  if ((db as any).customerPortfolio) return (db as any).customerPortfolio
  // Fallback: if neither model exists in generated Prisma client, use the extended db
  if ((edb as any).styleGallery) return (edb as any).styleGallery
  if ((edb as any).customerPortfolio) return (edb as any).customerPortfolio
  return undefined
}
