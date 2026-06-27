import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

async function main() {
  console.log('🌱 Seeding users and related data...\n')

  // ── 1. Create Users ──────────────────────────────────────────────
  console.log('Creating users...')

  const [adminHash, userHash, agentHash, teamHash] = await Promise.all([
    bcrypt.hash('admin123', SALT_ROUNDS),
    bcrypt.hash('user123', SALT_ROUNDS),
    bcrypt.hash('agent123', SALT_ROUNDS),
    bcrypt.hash('team123', SALT_ROUNDS),
  ])

  const admin = await db.user.upsert({
    where: { email: 'admin@3boxesluxury.com' },
    update: {},
    create: {
      email: 'admin@3boxesluxury.com',
      name: 'Admin',
      password: adminHash,
      role: 'admin',
      isActive: true,
      phone: '+919876543210',
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      approvalStatus: 'approved',
    },
  })

  const demoUser = await db.user.upsert({
    where: { email: 'user@3boxesluxury.com' },
    update: {},
    create: {
      email: 'user@3boxesluxury.com',
      name: 'Demo User',
      password: userHash,
      role: 'user',
      isActive: true,
      phone: '+919876543211',
      emailVerified: true,
      phoneVerified: false,
      twoFactorEnabled: false,
      approvalStatus: 'approved',
    },
  })

  const agent = await db.user.upsert({
    where: { email: 'agent@3boxesluxury.com' },
    update: {},
    create: {
      email: 'agent@3boxesluxury.com',
      name: 'Sales Agent',
      password: agentHash,
      role: 'agent',
      isActive: true,
      phone: '+919876543212',
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      approvalStatus: 'approved',
    },
  })

  const team = await db.user.upsert({
    where: { email: 'team@3boxesluxury.com' },
    update: {},
    create: {
      email: 'team@3boxesluxury.com',
      name: 'Support Team',
      password: teamHash,
      role: 'team',
      isActive: true,
      phone: '+919876543213',
      emailVerified: true,
      phoneVerified: false,
      twoFactorEnabled: false,
      approvalStatus: 'approved',
    },
  })

  console.log(`  ✓ Admin:   ${admin.email}`)
  console.log(`  ✓ User:    ${demoUser.email}`)
  console.log(`  ✓ Agent:   ${agent.email}`)
  console.log(`  ✓ Team:    ${team.email}\n`)

  // ── 2. Create User Permissions ───────────────────────────────────
  console.log('Creating user permissions...')

  const modules = ['products', 'orders', 'users', 'accounting', 'inventory', 'wiki', 'offers', 'vendors', 'invoices', 'dashboard', 'support']

  const roleDefaults: Record<string, { canRead: boolean; canWrite: boolean; canEdit: boolean; canDelete: boolean }> = {
    admin: { canRead: true, canWrite: true, canEdit: true, canDelete: true },
    user: { canRead: true, canWrite: false, canEdit: false, canDelete: false },
    agent: { canRead: true, canWrite: true, canEdit: true, canDelete: false },
    team: { canRead: true, canWrite: true, canEdit: false, canDelete: false },
  }

  for (const u of [admin, demoUser, agent, team]) {
    const defaults = roleDefaults[u.role] || roleDefaults.user
    for (const mod of modules) {
      await db.userPermission.upsert({
        where: { userId_module: { userId: u.id, module: mod } },
        update: {},
        create: {
          userId: u.id,
          module: mod,
          canRead: defaults.canRead,
          canWrite: defaults.canWrite,
          canEdit: defaults.canEdit,
          canDelete: defaults.canDelete,
        },
      })
    }
  }

  console.log(`  ✓ Permissions for 4 users across ${modules.length} modules\n`)

  // ── 3. Create Vendors ────────────────────────────────────────────
  console.log('Creating vendors...')

  const vendor1 = await db.vendor.create({
    data: {
      name: 'Swiss Watch Co.',
      email: 'orders@swisswatchco.ch',
      phone: '+41441234567',
      address: 'Bahnhofstrasse 42, 8001 Zurich, Switzerland',
      gstNumber: null,
      panNumber: null,
      bankName: 'UBS AG',
      bankAccount: 'CH93-0076-2011-6238-5298-7',
      ifscCode: null,
      isActive: true,
    },
  })

  const vendor2 = await db.vendor.create({
    data: {
      name: 'Italian Leather Atelier',
      email: 'supply@italianleather.it',
      phone: '+390612345678',
      address: 'Via dei Tornabuoni 15, 50123 Florence, Italy',
      gstNumber: null,
      panNumber: null,
      bankName: 'UniCredit SpA',
      bankAccount: 'IT60-X054-2811-1010-0000-0123-456',
      ifscCode: null,
      isActive: true,
    },
  })

  const vendor3 = await db.vendor.create({
    data: {
      name: 'Rajasthan Handloom House',
      email: 'info@rajhandloom.in',
      phone: '+911412345678',
      address: 'Johari Bazaar, Jaipur, Rajasthan 302003, India',
      gstNumber: '08AABCR1234F1ZP',
      panNumber: 'AABCR1234F',
      bankName: 'State Bank of India',
      bankAccount: '30212345678',
      ifscCode: 'SBIN0031234',
      isActive: true,
    },
  })

  const vendor4 = await db.vendor.create({
    data: {
      name: 'Maison de Parfum',
      email: 'wholesale@maisondparfum.fr',
      phone: '+33142345678',
      address: '8 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
      gstNumber: null,
      panNumber: null,
      bankName: 'BNP Paribas',
      bankAccount: 'FR76-3000-6000-0112-3456-7890-189',
      ifscCode: null,
      isActive: true,
    },
  })

  console.log(`  ✓ Vendor: ${vendor1.name}`)
  console.log(`  ✓ Vendor: ${vendor2.name}`)
  console.log(`  ✓ Vendor: ${vendor3.name}`)
  console.log(`  ✓ Vendor: ${vendor4.name}\n`)

  // ── 4. Create Offers ─────────────────────────────────────────────
  console.log('Creating offers...')

  const now = new Date()
  const oneMonthFromNow = new Date(now)
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
  const threeMonthsFromNow = new Date(now)
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  const offers = await Promise.all([
    db.offer.upsert({
      where: { code: 'WELCOME20' },
      update: {},
      create: {
        title: 'Welcome Discount',
        description:
          'Enjoy 20% off your first order! Welcome to 3 BOXES LUXURY — treat yourself to our curated collection of premium products.',
        code: 'WELCOME20',
        discount: 20,
        minOrder: 0,
        maxDiscount: null,
        validFrom: now,
        validTo: threeMonthsFromNow,
        isActive: true,
      },
    }),
    db.offer.upsert({
      where: { code: 'LUXURY10' },
      update: {},
      create: {
        title: 'Luxury Spend Bonus',
        description:
          'Spend $500 or more and receive 10% off your entire order. Our way of rewarding your taste for the finer things.',
        code: 'LUXURY10',
        discount: 10,
        minOrder: 500,
        maxDiscount: null,
        validFrom: now,
        validTo: threeMonthsFromNow,
        isActive: true,
      },
    }),
    db.offer.upsert({
      where: { code: 'VIP30' },
      update: {},
      create: {
        title: 'VIP Exclusive',
        description:
          'VIP members get 30% off — capped at $200 in savings. Because you deserve the very best, within reason.',
        code: 'VIP30',
        discount: 30,
        minOrder: 0,
        maxDiscount: 200,
        validFrom: now,
        validTo: oneMonthFromNow,
        isActive: true,
      },
    }),
  ])

  offers.forEach((o) => console.log(`  ✓ Offer: ${o.code} — ${o.title}`))
  console.log()

  // ── 5. Create Wiki Documents ─────────────────────────────────────
  console.log('Creating wiki documents...')

  const techArchContent = `# 3 BOXES LUXURY — Technical Architecture

## Overview

3 BOXES LUXURY is a full-stack e-commerce platform built with modern web technologies.

## Technology Stack

| Layer          | Technology                        | Version  |
|----------------|-----------------------------------|----------|
| Framework      | Next.js (App Router)              | 16.x     |
| Language       | TypeScript                        | 5.x      |
| Styling        | Tailwind CSS + shadcn/ui          | 4.x      |
| Database       | SQLite via Prisma ORM             | 6.x      |
| Authentication | Custom Session-based              | -        |
| State          | Zustand (client) + TanStack Query | 5.x      |
| Runtime        | Bun                               | 1.x      |
`

  const apiDocContent = `# API Documentation

## Authentication

All protected endpoints require a Bearer token in the Authorization header.

\`\`\`
Authorization: Bearer <token>
\`\`\`

### POST /api/auth/login
Sign in with email and password.

### POST /api/auth/register
Register a new account. New accounts require admin approval.

### POST /api/auth/verify-email
Verify email address with token.

### POST /api/auth/verify-phone
Verify phone number with code.

### POST /api/auth/2fa/setup
Set up two-factor authentication.

### POST /api/auth/2fa/verify
Verify TOTP code.

### POST /api/auth/approve
Admin approves or rejects pending users.

### POST /api/auth/social
Handle social login (Google/Facebook/LinkedIn).
`

  const frontendGuideContent = `# Frontend Component Guide

## Overview

The 3 BOXES LUXURY frontend is built with React 19, shadcn/ui components, and Tailwind CSS 4.

## Component Architecture

- **shadcn/ui Components**: Base UI components in src/components/ui/
- **Application Components**: Feature-specific components organized by domain

## State Management

- Server State: TanStack Query
- Client State: Zustand
`

  const wikiDocs = await Promise.all([
    db.wikiDocument.upsert({
      where: { slug: 'technical-architecture' },
      update: {},
      create: {
        title: '3 BOXES LUXURY - Technical Architecture',
        slug: 'technical-architecture',
        category: 'architecture',
        content: techArchContent,
        version: '2.0',
        isPublished: true,
        accessRoles: 'admin,agent,team',
      },
    }),
    db.wikiDocument.upsert({
      where: { slug: 'api-documentation' },
      update: {},
      create: {
        title: 'API Documentation',
        slug: 'api-documentation',
        category: 'api',
        content: apiDocContent,
        version: '2.0',
        isPublished: true,
        accessRoles: 'admin,agent,team',
      },
    }),
    db.wikiDocument.upsert({
      where: { slug: 'frontend-guide' },
      update: {},
      create: {
        title: 'Frontend Component Guide',
        slug: 'frontend-guide',
        category: 'technical',
        content: frontendGuideContent,
        version: '2.0',
        isPublished: true,
        accessRoles: 'admin,agent,team',
      },
    }),
  ])

  wikiDocs.forEach((d) => console.log(`  ✓ Wiki: ${d.slug} — ${d.title}`))
  console.log()

  // ── 6. Create Payment Methods ────────────────────────────────────
  console.log('Creating payment methods...')

  const paymentMethods = await Promise.all([
    db.paymentMethod.upsert({
      where: { id: 'pm-visa-4242-demo' },
      update: {},
      create: {
        id: 'pm-visa-4242-demo',
        userId: demoUser.id,
        type: 'card',
        label: 'Visa ending 4242',
        last4: '4242',
        isDefault: true,
      },
    }),
    db.paymentMethod.upsert({
      where: { id: 'pm-upi-demo' },
      update: {},
      create: {
        id: 'pm-upi-demo',
        userId: demoUser.id,
        type: 'upi',
        label: 'UPI: demo@paytm',
        last4: null,
        isDefault: false,
      },
    }),
  ])

  paymentMethods.forEach((pm) => console.log(`  ✓ Payment: ${pm.label} (${pm.type})`))
  console.log()

  // ── 7. Create Support Tickets ────────────────────────────────────
  console.log('Creating support tickets...')

  const openTicket = await db.supportTicket.create({
    data: {
      title: 'Order delivery delayed',
      description:
        'I placed order #ORD-2024-001 over a week ago and it still shows as "processing". Could someone look into this?',
      category: 'general',
      priority: 'high',
      status: 'open',
      creatorId: demoUser.id,
    },
  })

  const inProgressTicket = await db.supportTicket.create({
    data: {
      title: 'Wrong item received in order',
      description:
        'I received a different product than what I ordered. My order was for the Premium Leather Tote (black), but I received the Mini Crossbody (brown).',
      category: 'returns',
      priority: 'urgent',
      status: 'in_progress',
      creatorId: demoUser.id,
      assigneeId: team.id,
    },
  })

  console.log(`  ✓ Ticket: "${openTicket.title}" [${openTicket.status}]`)
  console.log(`  ✓ Ticket: "${inProgressTicket.title}" [${inProgressTicket.status}]`)
  console.log()

  // ── 8. Create Ticket Messages ────────────────────────────────────
  console.log('Creating ticket messages...')

  const messages = await Promise.all([
    db.supportTicketMessage.create({
      data: {
        ticketId: inProgressTicket.id,
        senderId: team.id,
        senderName: 'Support Team',
        content:
          "Hi there! I'm so sorry about the mix-up. I've located the correct item in our warehouse and we're preparing a replacement shipment.",
      },
    }),
    db.supportTicketMessage.create({
      data: {
        ticketId: inProgressTicket.id,
        senderId: demoUser.id,
        senderName: 'Demo User',
        content:
          "Thank you for the quick response! I'll keep the wrong item packaged and ready for return.",
      },
    }),
  ])

  messages.forEach((m) =>
    console.log(`  ✓ Message from ${m.senderName}: "${m.content.substring(0, 60)}..."`)
  )
  console.log()

  // ── 9. Create Sample Invoices ────────────────────────────────────
  console.log('Creating sample invoices...')

  const invoice1 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-00001',
      userId: demoUser.id,
      customerName: 'Demo User',
      customerEmail: 'user@3boxesluxury.com',
      customerPhone: '+919876543211',
      billingAddress: '123 Luxury Lane, New York, NY 10001, US',
      subtotal: 12500,
      tax: 1000,
      shipping: 0,
      discount: 0,
      total: 13500,
      status: 'paid',
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productName: 'Royal Chronograph Gold', productNumber: 'PRD-00001', quantity: 1, unitPrice: 12500, total: 12500 },
        ],
      },
    },
  })

  const invoice2 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-00002',
      userId: demoUser.id,
      customerName: 'Demo User',
      customerEmail: 'user@3boxesluxury.com',
      billingAddress: '123 Luxury Lane, New York, NY 10001, US',
      subtotal: 2800,
      tax: 224,
      shipping: 0,
      discount: 0,
      total: 3024,
      status: 'sent',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productName: 'Murano Crystal Vase', productNumber: 'PRD-00025', quantity: 1, unitPrice: 2800, total: 2800 },
        ],
      },
    },
  })

  const invoice3 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-00003',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      subtotal: 1850,
      tax: 148,
      shipping: 0,
      discount: 185,
      total: 1813,
      status: 'draft',
      items: {
        create: [
          { productName: 'Heritage Leather Briefcase', productNumber: 'PRD-00016', quantity: 1, unitPrice: 1850, total: 1850 },
        ],
      },
    },
  })

  console.log(`  ✓ Invoice: ${invoice1.invoiceNumber} - ${invoice1.status}`)
  console.log(`  ✓ Invoice: ${invoice2.invoiceNumber} - ${invoice2.status}`)
  console.log(`  ✓ Invoice: ${invoice3.invoiceNumber} - ${invoice3.status}`)
  console.log()

  // ── 10. Create Sample Account Entries ─────────────────────────────
  console.log('Creating sample account entries...')

  const accountEntries = await Promise.all([
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00001',
        type: 'debit',
        category: 'sales',
        amount: 13500,
        description: 'Sale - Invoice INV-00001 - Royal Chronograph Gold',
        referenceId: invoice1.id,
        referenceType: 'invoice',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00002',
        type: 'credit',
        category: 'vendor_payment',
        amount: 8500,
        description: 'Payment to Swiss Watch Co. for inventory purchase',
        referenceId: vendor1.id,
        referenceType: 'vendor',
        vendorId: vendor1.id,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00003',
        type: 'debit',
        category: 'sales',
        amount: 3024,
        description: 'Sale - Invoice INV-00002 - Murano Crystal Vase',
        referenceId: invoice2.id,
        referenceType: 'invoice',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    }),
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00004',
        type: 'credit',
        category: 'expense',
        amount: 2500,
        description: 'Monthly office rent payment',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00005',
        type: 'credit',
        category: 'salary',
        amount: 5000,
        description: 'Staff salary - February 2025',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    db.accountEntry.create({
      data: {
        entryNumber: 'ACC-00006',
        type: 'credit',
        category: 'vendor_payment',
        amount: 3200,
        description: 'Payment to Rajasthan Handloom House for saree inventory',
        referenceId: vendor3.id,
        referenceType: 'vendor',
        vendorId: vendor3.id,
        date: new Date(),
      },
    }),
  ])

  accountEntries.forEach((e) => console.log(`  ✓ Entry: ${e.entryNumber} - ${e.type} ${e.category} $${e.amount}`))
  console.log()

  // ── Done ─────────────────────────────────────────────────────────
  console.log('✅ Seed completed successfully!\n')
  console.log('Summary:')
  console.log('  4 users (admin, user, agent, team)')
  console.log(`  ${modules.length * 4} user permissions`)
  console.log('  4 vendors')
  console.log('  3 offers (WELCOME20, LUXURY10, VIP30)')
  console.log('  3 wiki documents')
  console.log('  2 payment methods')
  console.log('  2 support tickets + 2 messages')
  console.log('  3 invoices')
  console.log('  6 account entries')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
