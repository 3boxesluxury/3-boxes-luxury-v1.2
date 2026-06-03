import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
  Header, Footer, PageNumber, NumberFormat,
  TableOfContents, SectionType
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

// ── Color Palette ──────────────────────────────────────────────
const GOLD = 'B8860B';
const DARK_GOLD = '8B6914';
const LIGHT_GOLD = 'D4A437';
const CREAM = 'FFF8E7';
const DARK_BG = '1C1917';
const STONE_800 = '292524';
const STONE_900 = '1C1917';
const AMBER_100 = 'FEF3C7';
const AMBER_400 = 'FBBF24';
const AMBER_600 = 'D97706';
const WHITE = 'FFFFFF';
const BLACK = '000000';
const GRAY = '6B7280';
const LIGHT_GRAY = 'F3F4F6';
const MEDIUM_GRAY = '9CA3AF';

// ── Helper Functions ───────────────────────────────────────────

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 36,
        color: DARK_GOLD,
        font: 'Calibri',
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: LIGHT_GOLD,
        font: 'Calibri',
      }),
    ],
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        color: GOLD,
        font: 'Calibri',
      }),
    ],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 312 },
    children: [
      new TextRun({
        text,
        size: 22,
        color: '333333',
        font: 'Calibri',
      }),
    ],
  });
}

function boldBodyText(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    children: [
      new TextRun({
        text: label,
        bold: true,
        size: 22,
        color: DARK_GOLD,
        font: 'Calibri',
      }),
      new TextRun({
        text: value,
        size: 22,
        color: '333333',
        font: 'Calibri',
      }),
    ],
  });
}

function bulletPoint(text: string, level = 0): Paragraph {
  return new Paragraph({
    spacing: { after: 60, line: 312 },
    indent: { left: 720 + level * 360 },
    children: [
      new TextRun({
        text: '• ',
        size: 22,
        color: LIGHT_GOLD,
        font: 'Calibri',
      }),
      new TextRun({
        text,
        size: 22,
        color: '333333',
        font: 'Calibri',
      }),
    ],
  });
}

function codeBlock(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    indent: { left: 360 },
    shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
    children: [
      new TextRun({
        text,
        size: 20,
        font: 'Consolas',
        color: '1F2937',
      }),
    ],
  });
}

function separator(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_GOLD } },
    children: [],
  });
}

function emptyPara(): Paragraph {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

// Table helper with alternating row shading
function createTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: STONE_800 },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: h, bold: true, size: 20, color: AMBER_400, font: 'Calibri' })],
          }),
        ],
      })
    ),
  });

  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
            shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: 'FAFAFA' } : undefined,
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: cell, size: 20, color: '333333', font: 'Calibri' })],
              }),
            ],
          })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ── Main Document Generation ───────────────────────────────────
async function generateDocument() {
  const doc = new Document({
    creator: '3 BOXES LUXURY',
    title: '3 BOXES LUXURY — Technical Documentation',
    description: 'Comprehensive technical documentation for the 3 BOXES LUXURY e-commerce platform',
    styles: {
      default: {
        document: {
          run: { size: 22, font: 'Calibri', color: '333333' },
        },
      },
    },
    sections: [
      // ══════════════════════════════════════════════════════════
      // COVER PAGE
      // ══════════════════════════════════════════════════════════
      {
        properties: {
          page: {
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children: [
          new Paragraph({ spacing: { before: 2400 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '✦',
                size: 48,
                color: LIGHT_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '3 BOXES LUXURY',
                bold: true,
                size: 80,
                color: DARK_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                size: 24,
                color: LIGHT_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Technical Documentation',
                bold: true,
                size: 44,
                color: GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'AI-Powered Luxury E-Commerce Platform',
                size: 26,
                color: GRAY,
                font: 'Calibri',
                italics: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Features · Architecture · API · Database · AI Integration · Deployment',
                size: 22,
                color: MEDIUM_GRAY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 2000 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Version 2.0 — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                size: 22,
                color: GRAY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Confidential — For Internal Use Only',
                size: 18,
                italics: true,
                color: MEDIUM_GRAY,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },

      // ══════════════════════════════════════════════════════════
      // TABLE OF CONTENTS
      // ══════════════════════════════════════════════════════════
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: '3 BOXES LUXURY — Technical Documentation',
                    size: 16,
                    italics: true,
                    color: GRAY,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Table of Contents',
                bold: true,
                size: 40,
                color: DARK_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          separator(),
          new TableOfContents('Table of Contents', {
            hyperlink: true,
            headingStyleRange: '1-3',
          }),
          new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
          }),
        ],
      },

      // ══════════════════════════════════════════════════════════
      // MAIN CONTENT
      // ══════════════════════════════════════════════════════════
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: '3 BOXES LUXURY — Technical Documentation',
                    size: 16,
                    italics: true,
                    color: GRAY,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 16, color: GRAY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GRAY, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [

          // ────────────────────────────────────────────────────────
          // SECTION 1: EXECUTIVE SUMMARY
          // ────────────────────────────────────────────────────────
          heading1('1. Executive Summary'),
          bodyText('3 BOXES LUXURY is a comprehensive, full-stack luxury e-commerce platform built with Next.js 16, React 19, and TypeScript 5. The application features a premium dark theme with gold accents, an AI-powered virtual try-on system using z-ai-web-dev-sdk, comprehensive shopping cart and checkout functionality, and a rich product catalog spanning 11 categories with 55+ products.'),
          bodyText('The platform differentiates itself through its AI-powered virtual try-on feature, which allows customers to upload a selfie and see AI-generated visualizations of themselves wearing or using luxury products. The system uses Vision Language Models (VLM) for image analysis and advanced image generation/editing APIs for creating realistic try-on experiences.'),
          emptyPara(),
          boldBodyText('Tech Stack: ', 'Next.js 16, TypeScript 5, Tailwind CSS 4, Prisma/SQLite, Zustand, TanStack React Query v5, Framer Motion'),
          boldBodyText('Key Differentiator: ', 'AI-powered virtual try-on using z-ai-web-dev-sdk with VLM analysis and multi-strategy image generation'),
          boldBodyText('Architecture: ', 'Single-page app with Zustand view router, App Router API routes, role-based authentication with 4 user types'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 2: FEATURE LIST
          // ────────────────────────────────────────────────────────
          heading1('2. Feature List'),

          heading2('2.1 Customer Features'),
          bulletPoint('Product browsing with category filters and search'),
          bulletPoint('Product detail pages with image galleries, star ratings, pricing with discounts, stock indicators, tags, and quantity selectors'),
          bulletPoint('Shopping cart (client-side Zustand state with add/remove/update/clear operations)'),
          bulletPoint('Checkout with order creation, stock deduction, and order confirmation'),
          bulletPoint('Order history lookup by email with expandable order details and status badges'),
          bulletPoint('AI Virtual Try-On: Upload selfie, AI generates product visualization on the user'),
          bulletPoint('AI Style Suggestions: Combo products that pair with the viewed item (category-based complement mapping)'),
          bulletPoint('Downloadable AI try-on images with 3BOXES GIFTS watermark overlay'),
          bulletPoint('Active offers and discount codes with validation (min order, max discount, validity dates)'),
          bulletPoint('Free shipping on orders over $500'),

          heading2('2.2 User Account Features'),
          bulletPoint('User registration and login with 4 role types (admin, user, agent, team)'),
          bulletPoint('Session-based authentication with UUID tokens stored in localStorage'),
          bulletPoint('Purchase history linked to user account'),
          bulletPoint('Wishlist management (add/remove products, unique constraint per user+product)'),
          bulletPoint('Payment methods management (card, UPI, netbanking, wallet with last4 and default flag)'),
          bulletPoint('Active offers view with discount codes and validity periods'),

          heading2('2.3 Admin Features'),
          bulletPoint('Dashboard with revenue, orders, users, and products statistics'),
          bulletPoint('Order management and payment reports with status tracking'),
          bulletPoint('Product listing and stock management'),
          bulletPoint('User management across all roles (admin, user, agent, team)'),
          bulletPoint('Content management: Wiki documents with publish/unpublish, categories, versioning'),
          bulletPoint('Share technical docs with agents (with canDownload and canShare permissions)'),
          bulletPoint('Offer management (create discount codes with percentage, min order, max discount, validity)'),

          heading2('2.4 Agent Features'),
          bulletPoint('Product catalog for client sharing and recommendations'),
          bulletPoint('Shared technical documentation from admin with download and share permissions'),
          bulletPoint('Commission tracking overview'),

          heading2('2.5 3Boxes Team Features'),
          bulletPoint('Assigned support tickets management'),
          bulletPoint('Open ticket queue for picking up new tickets'),
          bulletPoint('Knowledge base access via Wiki documents'),

          heading2('2.6 Wiki / Technical Documentation'),
          bulletPoint('Role-based access to technical documents (admin, agent, team roles)'),
          bulletPoint('View and download markdown documents'),
          bulletPoint('Categories: Architecture, API, Technical, General'),
          bulletPoint('Document versioning and publish/unpublish controls'),
          bulletPoint('Admin can share specific documents with individual agents'),

          heading2('2.7 UI/UX Features'),
          bulletPoint('Dark Luxury Theme: Stone-950 background with amber/gold accent system'),
          bulletPoint('Gold Shimmer Text: Animated gradient text effect for branding'),
          bulletPoint('Logo Glow Animation: Pulsing golden glow with scale animation'),
          bulletPoint('Golden Particles: 15 floating golden particles with staggered animations'),
          bulletPoint('Bokeh Light Effects: 8 ambient bokeh lights creating luxury atmosphere'),
          bulletPoint('Golden Light Rays: 7 animated light rays from background'),
          bulletPoint('Card Hover Effects: Golden glow shadow with subtle lift animation'),
          bulletPoint('Framer Motion Animations: Page transitions, staggered lists, spring-based entrances'),
          bulletPoint('Responsive Design: Mobile-first with sm/md/lg/xl breakpoints'),
          bulletPoint('Skeleton Loading, Error Boundary, Custom Scrollbar, Toast Notifications'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 3: FRONTEND ARCHITECTURE
          // ────────────────────────────────────────────────────────
          heading1('3. Front-End Architecture'),

          heading2('3.1 Framework & Stack'),
          createTable(
            ['Technology', 'Version', 'Purpose'],
            [
              ['Next.js', '16.x', 'React framework with App Router and standalone output'],
              ['React', '19.x', 'UI library with concurrent features'],
              ['TypeScript', '5.x', 'Type-safe JavaScript with strict mode'],
              ['Tailwind CSS', '4.x', 'Utility-first CSS framework'],
              ['shadcn/ui', 'New York', 'Pre-built UI component library with Radix primitives'],
              ['Zustand', '5.x', 'Lightweight client state management'],
              ['TanStack React Query', '5.x', 'Server state management with caching (60s stale time)'],
              ['Framer Motion', '12.x', 'Animation library for transitions and micro-interactions'],
              ['Lucide React', '0.525+', 'Icon library with 1000+ icons'],
              ['bcryptjs', '2.x', 'Password hashing on client-side utilities'],
            ]
          ),

          heading2('3.2 Component Architecture'),
          bodyText('The application uses a single-page architecture managed by Zustand state. The current "view" determines which component is rendered, with AnimatePresence providing smooth transitions between views.'),

          heading3('3.2.1 View State Management'),
          codeBlock('type View = "home" | "product" | "cart" | "checkout" | "orders" | "order-confirmation"'),
          codeBlock('       | "user-dashboard" | "admin-dashboard" | "agent-dashboard" | "team-dashboard" | "wiki"'),
          emptyPara(),
          bodyText('The Zustand store (src/lib/store.ts) manages the following state:'),
          bulletPoint('view: Current active view/page'),
          bulletPoint('selectedProductId: Currently selected product for detail view'),
          bulletPoint('searchQuery: Active search term for product filtering'),
          bulletPoint('selectedCategory: Active category filter'),
          bulletPoint('cartItems: Array of CartItem objects (productId, name, price, image, quantity)'),
          bulletPoint('lastOrderId: Most recent order number for confirmation page'),
          bulletPoint('authUser: AuthUser object (id, email, name, role) or null'),
          bulletPoint('authToken: UUID session token or null'),
          bulletPoint('authView: Current auth dialog state (login, register, or null)'),

          heading3('3.2.2 Custom Components'),
          createTable(
            ['Component', 'File', 'Description'],
            [
              ['Header', 'src/components/header.tsx', 'Sticky header with logo, search, cart badge, auth, mobile menu'],
              ['HeroSection', 'src/components/hero-section.tsx', 'Full-screen hero with particles, bokeh, light rays, CTAs'],
              ['CategoryGrid', 'src/components/category-grid.tsx', '11 category cards with icons and gradient backgrounds'],
              ['ProductGrid', 'src/components/product-grid.tsx', 'Product listing with sort/filter and search integration'],
              ['ProductCard', 'src/components/product-card.tsx', 'Product card with image, rating, price, Add to Cart'],
              ['ProductDetail', 'src/components/product-detail.tsx', 'Product detail + TryOnDialog + AI Style Suggestions'],
              ['CartView', 'src/components/cart-view.tsx', 'Cart items list with quantity controls and order summary'],
              ['CheckoutView', 'src/components/checkout-view.tsx', 'Contact/shipping/payment form with validation'],
              ['OrderConfirmation', 'src/components/order-confirmation.tsx', 'Success page with order number and delivery estimate'],
              ['OrderHistory', 'src/components/order-history.tsx', 'Email-based order search with expandable details'],
              ['AuthDialog', 'src/components/auth-dialog.tsx', 'Login/register dialog with role-based routing'],
              ['AdminDashboard', 'src/components/admin-dashboard.tsx', 'Admin panel: stats, orders, products, users, wiki, offers'],
              ['UserDashboard', 'src/components/user-dashboard.tsx', 'User panel: purchases, wishlist, payment methods, offers'],
              ['AgentDashboard', 'src/components/agent-dashboard.tsx', 'Agent panel: catalog, shared docs, commissions'],
              ['TeamDashboard', 'src/components/team-dashboard.tsx', 'Team panel: assigned tickets, open queue, knowledge base'],
              ['WikiSection', 'src/components/wiki-section.tsx', 'Role-based document browser with categories and download'],
              ['Footer', 'src/components/footer.tsx', '4-column footer with Shop/Company/Support links'],
            ]
          ),

          heading3('3.2.3 UI Component Library (shadcn/ui)'),
          bodyText('The project includes 49 shadcn/ui components in src/components/ui/ including: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.'),

          heading2('3.3 State Management'),

          heading3('3.3.1 Client State (Zustand)'),
          bodyText('Zustand manages all local UI state including current view, selected product, search query, category filter, cart items (with add/remove/updateQuantity/clear operations), last order ID, and authentication state (authUser, authToken, authView). Auth state is persisted to localStorage under the key "3boxes_auth" and loaded on initialization.'),

          heading3('3.3.2 Server State (React Query)'),
          bodyText('TanStack React Query v5 handles all API data fetching with:'),
          bulletPoint('Query keys: Structured as [entity, ...params] (e.g., ["products", searchQuery, category, sort])'),
          bulletPoint('Stale time: 60 seconds for all queries'),
          bulletPoint('Auto-caching and background refetching'),
          bulletPoint('Loading/error states managed via useQuery hooks'),
          bulletPoint('Mutations for checkout, auth, wishlist, and support tickets (useMutation with onSuccess callbacks)'),

          heading2('3.4 Styling'),

          heading3('3.4.1 Color System'),
          bodyText('The dark luxury theme uses CSS custom properties defined in globals.css with oklch color space:'),
          bulletPoint('Background: oklch(0.145 0 0) — Deep stone-950 black'),
          bulletPoint('Foreground: oklch(0.985 0 0) — Near-white text'),
          bulletPoint('Primary: oklch(0.75 0.15 75) — Amber/Gold accent'),
          bulletPoint('Card: oklch(0.205 0 0) — Slightly lighter than background'),
          bulletPoint('Border: oklch(1 0 0 / 10%) — Subtle white border'),

          heading3('3.4.2 Custom CSS Animations'),
          createTable(
            ['Animation', 'CSS Class', 'Description'],
            [
              ['Gold Shimmer', '.gold-shimmer', '200% background-size gradient with shimmer keyframes (3s infinite)'],
              ['Logo Glow', '.logo-flashy', 'Pulsing drop-shadow with scale animation (2.5s infinite)'],
              ['Golden Particle', '.golden-particle', 'Float upward with opacity fade (7-12s infinite)'],
              ['Golden Ray', '.golden-ray', 'Opacity pulse simulating light rays (4s infinite)'],
              ['Bokeh Light', '.bokeh-light', 'Scale and translate drift with opacity changes (6-10s infinite)'],
              ['Card Glow', '.card-glow', 'Hover shadow glow using rgba(212,164,55,0.1)'],
            ]
          ),

          heading3('3.4.3 Font System'),
          bulletPoint('Geist Sans (--font-geist-sans): Primary body font, variable with Latin subset'),
          bulletPoint('Geist Mono (--font-geist-mono): Monospace font for code and technical content'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 4: BACKEND ARCHITECTURE
          // ────────────────────────────────────────────────────────
          heading1('4. Back-End Architecture'),

          heading2('4.1 API Routes'),
          bodyText('All backend logic is implemented as Next.js App Router API routes in src/app/api/. The following table lists all available endpoints:'),
          emptyPara(),

          heading3('4.1.1 Authentication Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/auth/login', 'GET/POST', 'None', 'User authentication with email/password, returns token + user'],
              ['/api/auth/register', 'POST', 'None', 'User registration with email, name, password, role'],
              ['/api/auth/session', 'GET', 'Bearer', 'Session verification, returns user if token valid'],
              ['/api/auth/users', 'GET', 'Admin', 'List all users (admin only)'],
            ]
          ),

          heading3('4.1.2 Product & Category Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/products', 'GET', 'None', 'List products with search, category, price, sort, pagination'],
              ['/api/products/[id]', 'GET', 'None', 'Single product detail with category relation'],
              ['/api/categories', 'GET', 'None', 'All categories with product count (_count aggregation)'],
            ]
          ),

          heading3('4.1.3 Cart & Checkout Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/cart', 'GET', 'Session', 'Get cart by session ID with items and product details'],
              ['/api/cart', 'POST', 'Session', 'Add item to cart (creates cart if needed, checks stock)'],
              ['/api/cart', 'PATCH', 'Session', 'Update cart item quantity (validates stock)'],
              ['/api/cart', 'DELETE', 'Session', 'Remove item from cart (validates session ownership)'],
              ['/api/checkout', 'POST', 'None', 'Create order with items, calculate totals, deduct stock'],
            ]
          ),

          heading3('4.1.4 Order Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/orders', 'GET', 'None', 'List orders by email with items'],
              ['/api/orders/[id]', 'GET', 'None', 'Single order detail'],
            ]
          ),

          heading3('4.1.5 AI & Try-On Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/try-on', 'POST', 'None', 'Start AI try-on job (returns jobId for polling)'],
              ['/api/try-on', 'GET', 'None', 'Poll try-on job status by jobId parameter'],
              ['/api/combo-suggestions', 'GET', 'None', 'AI style suggestions with complementary categories'],
            ]
          ),

          heading3('4.1.6 User Account Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/wishlist', 'GET', 'Bearer', 'Get user wishlist items'],
              ['/api/wishlist', 'POST', 'Bearer', 'Add product to wishlist'],
              ['/api/wishlist', 'DELETE', 'Bearer', 'Remove product from wishlist'],
              ['/api/payment-methods', 'GET', 'Bearer', 'List user payment methods'],
              ['/api/payment-methods', 'POST', 'Bearer', 'Add new payment method'],
              ['/api/offers', 'GET', 'None', 'List active offers with discount codes'],
            ]
          ),

          heading3('4.1.7 Wiki & Documentation Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/wiki', 'GET', 'Bearer', 'List wiki documents (role-filtered)'],
              ['/api/wiki/[id]', 'GET', 'Bearer', 'Wiki document detail with content'],
            ]
          ),

          heading3('4.1.8 Support Ticket Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/support-tickets', 'GET', 'Bearer', 'List tickets (filtered by role: creator/assignee)'],
              ['/api/support-tickets', 'POST', 'Bearer', 'Create new support ticket'],
              ['/api/support-tickets/[id]', 'GET', 'Bearer', 'Ticket detail with messages'],
              ['/api/support-tickets/[id]', 'PATCH', 'Bearer', 'Update ticket status, priority, assignee'],
              ['/api/support-tickets/[id]/messages', 'POST', 'Bearer', 'Add message to ticket'],
            ]
          ),

          heading3('4.1.9 Admin Routes'),
          createTable(
            ['Endpoint', 'Method', 'Auth', 'Description'],
            [
              ['/api/admin/dashboard', 'GET', 'Admin', 'Dashboard stats: revenue, orders, users, products counts'],
              ['/api/admin/share-doc', 'POST', 'Admin', 'Share wiki document with specific agent'],
            ]
          ),

          // ── 4.2 AI Virtual Try-On System ──
          heading2('4.2 AI Virtual Try-On System'),

          heading3('4.2.1 Architecture Overview'),
          bodyText('The try-on system uses an asynchronous job-based architecture:'),
          bulletPoint('Step 1: Client POSTs selfie (base64) + productId to /api/try-on'),
          bulletPoint('Step 2: Server creates an in-memory TryOnJob, returns jobId immediately'),
          bulletPoint('Step 3: Background process runs VLM analysis + image generation'),
          bulletPoint('Step 4: Client polls GET /api/try-on?jobId=xxx every 3 seconds'),
          bulletPoint('Step 5: Server returns completed imageUrl or processing status'),

          heading3('4.2.2 VLM Analysis Phase'),
          bodyText('Two parallel VLM (Vision Language Model) calls using glm-4v-flash:'),
          bulletPoint('Person Analysis: Extracts skin tone, body type, current outfit, pose/framing, hair, lighting'),
          bulletPoint('Product Analysis: Identifies type/placement, size/proportions, dominant colors, material/texture, key visual details'),
          bulletPoint('Timeout: 25 seconds per VLM call with graceful fallback to empty string'),
          bulletPoint('Dual Scoring: VLM quality assessment of generated images for retry decisions'),

          heading3('4.2.3 4-Strategy Image Generation'),
          bodyText('The system uses a 4-strategy approach for generating try-on images:'),
          bulletPoint('Strategy 1 — edit-both: Edit both selfie and product image together (highest quality for outfit changes)'),
          bulletPoint('Strategy 2 — edit-selfie: Edit selfie image with product as reference (best for accessories)'),
          bulletPoint('Strategy 3 — edit-product: Edit product image with selfie as reference (alternative approach)'),
          bulletPoint('Strategy 4 — create-detailed: Text-to-image fallback using detailed VLM descriptions'),
          emptyPara(),
          bodyText('The system selects strategy based on product category:'),
          bulletPoint('Jewelry, Watches, Fragrances: edit-selfie (add to person, preserve identity)'),
          bulletPoint('Sarees, Fashion, Men\'s Shirts: edit-both (outfit change, preserve face)'),
          bulletPoint('Leather Goods: edit-product (hold/wear bag)'),

          heading3('4.2.4 Category-Specific Prompt Engineering'),
          bodyText('The system includes 15+ specialized prompt templates with category-specific parameters:'),
          createTable(
            ['Category', 'Strength', 'Guidance', 'Image Size', 'Strategy'],
            [
              ['Jewelry (Earrings)', '0.15', '20', '864x1152', 'ADD ONLY earrings, preserve face'],
              ['Jewelry (Necklace)', '0.18', '18', '864x1152', 'ADD ONLY necklace, preserve face'],
              ['Jewelry (Bracelet)', '0.15', '18', '864x1152', 'ADD ONLY bracelet, preserve person'],
              ['Jewelry (Ring)', '0.18', '18', '1024x1024', 'ADD ONLY ring, close-up'],
              ['Jewelry (Set)', '0.20', '18', '864x1152', 'ADD necklace + earrings, preserve face'],
              ['Watches', '0.18', '18', '864x1152', 'ADD watch on wrist, preserve person'],
              ['Fragrances', '0.15', '16', '864x1152', 'ADD bottle near chest, preserve person'],
              ['Leather Goods', '0.20', '16', '864x1152', 'ADD bag, preserve person'],
              ['Sarees (Bridal)', '0.40', '22', '768x1344', 'CHANGE outfit, preserve face'],
              ['Sarees (Silk)', '0.40', '21', '768x1344', 'CHANGE outfit, preserve face'],
              ['Sarees (Lightweight)', '0.38', '20', '768x1344', 'CHANGE outfit, preserve face'],
              ['Fashion', '0.40', '20', '768x1344', 'CHANGE outfit, preserve face'],
              ['Men\'s Shirts (Dress)', '0.38', '20', '768x1344', 'CHANGE top, preserve face'],
              ['Men\'s Shirts (T-Shirt)', '0.35', '18', '768x1344', 'CHANGE top, preserve face'],
              ['Men\'s Shirts (Polo)', '0.36', '19', '768x1344', 'CHANGE top, preserve face'],
            ]
          ),

          heading3('4.2.5 Retry and Fallback Strategy'),
          bulletPoint('Attempt 1: Base strength and guidance scale settings'),
          bulletPoint('Attempt 2: strength - 0.03, guidance + 2 (more precise)'),
          bulletPoint('Attempt 3: strength - 0.05, guidance + 4 (most conservative)'),
          bulletPoint('Quality Check: Images under 20KB base64 are rejected as poor quality'),
          bulletPoint('Fallback: If all edit attempts fail, use zai.images.generations.create() for text-to-image generation'),
          bulletPoint('Job Cleanup: Automatic cleanup of jobs older than 10 minutes (runs every 5 minutes)'),

          heading3('4.2.6 Async Polling Architecture'),
          bulletPoint('In-memory job storage using Map<string, TryOnJob>'),
          bulletPoint('Job states: queued → processing → completed / failed'),
          bulletPoint('Polling interval: 3 seconds (client-side)'),
          bulletPoint('Timeout: 3 minutes per job'),
          bulletPoint('Progress messages sent during generation phases'),

          heading3('4.2.7 SDK Configuration'),
          bodyText('The z-ai-web-dev-sdk is initialized via ZAI.create() which reads from .z-ai-config files:'),
          codeBlock('1. <project_root>/.z-ai-config'),
          codeBlock('2. /etc/.z-ai-config'),
          bodyText('The config must contain baseUrl and apiKey. The SDK uses X-Token authentication headers automatically.'),

          // ── 4.3 Authentication System ──
          heading2('4.3 Authentication System'),

          heading3('4.3.1 Architecture'),
          bodyText('The platform uses a custom token-based authentication system:'),
          bulletPoint('Token generation: UUID v4 session tokens via crypto.randomUUID()'),
          bulletPoint('In-memory session store: Map<token, {userId, role, createdAt}>'),
          bulletPoint('Password hashing: bcryptjs with 10 salt rounds'),
          bulletPoint('4 user roles: admin, user, agent, team'),
          bulletPoint('Bearer token in Authorization header for protected routes'),

          heading3('4.3.2 Authentication Flow'),
          bulletPoint('1. User submits email + password to POST /api/auth/login'),
          bulletPoint('2. Server verifies password with bcryptjs.compare()'),
          bulletPoint('3. Server generates UUID token, stores in-memory session'),
          bulletPoint('4. Client stores {user, token} in localStorage under "3boxes_auth"'),
          bulletPoint('5. Subsequent requests include Authorization: Bearer <token> header'),
          bulletPoint('6. Protected routes validate token against in-memory session store'),

          heading3('4.3.3 Role-Based Access Control'),
          createTable(
            ['Role', 'Access Level', 'Key Permissions'],
            [
              ['admin', 'Full access', 'Dashboard stats, user management, wiki management, doc sharing, offer management'],
              ['user', 'Customer access', 'Shopping, wishlist, payment methods, order history, support tickets'],
              ['agent', 'Sales agent', 'Product catalog, shared docs, commission tracking'],
              ['team', 'Support team', 'Assigned tickets, open queue, knowledge base access'],
            ]
          ),

          // ── 4.4 Combo Suggestions ──
          heading2('4.4 Combo Suggestions System'),
          bodyText('The AI Style Suggestions feature uses a category-complement mapping system:'),
          createTable(
            ['Product Category', 'Suggested Complementary Categories'],
            [
              ['Watches', 'Jewelry, Leather Goods'],
              ['Jewelry', 'Sarees, Fashion, Watches'],
              ['Leather Goods', 'Watches, Fashion'],
              ['Fragrances', 'Jewelry, Fashion'],
              ['Fashion', 'Jewelry, Fragrances, Leather Goods'],
              ['Sarees', 'Jewelry, Fragrances'],
              ['Men\'s Shirts', 'Watches, Leather Goods, Fragrances'],
              ['Romantic Gifts', 'Jewelry, Fragrances, Couple Gifts'],
              ['Couple Gifts', 'Romantic Gifts, Jewelry, Fragrances'],
            ]
          ),
          bodyText('Each suggestion includes a contextual pairing reason (e.g., "Perfect jewelry to complement your saree look") and an "Add to Cart" button.'),

          // ── 4.5 Checkout and Order System ──
          heading2('4.5 Checkout and Order System'),

          heading3('4.5.1 Order Creation Flow'),
          bulletPoint('1. Validate required fields (email, name, address, city, state, zip, country)'),
          bulletPoint('2. Verify all products exist and have sufficient stock'),
          bulletPoint('3. Calculate subtotal from product prices × quantities'),
          bulletPoint('4. Calculate shipping ($0 if subtotal > $500, else $15)'),
          bulletPoint('5. Calculate tax (8% of subtotal)'),
          bulletPoint('6. Generate unique order number: 3BL-{timestamp}-{random6chars}'),
          bulletPoint('7. Create order with all items in a single Prisma transaction'),
          bulletPoint('8. Decrement stock for each product ordered'),

          heading3('4.5.2 Order Number Format'),
          codeBlock('3BL-1777861732447-BI5QGX'),
          bodyText('Format: 3BL-{epoch_milliseconds}-{6_random_alphanumeric_chars_uppercase}'),

          heading3('4.5.3 Order Status Flow'),
          createTable(
            ['Status', 'Color', 'Description'],
            [
              ['pending', 'Amber', 'Order created, awaiting processing'],
              ['processing', 'Yellow', 'Order being prepared'],
              ['shipped', 'Emerald', 'Order dispatched'],
              ['delivered', 'Green', 'Order delivered to customer'],
              ['cancelled', 'Red', 'Order cancelled'],
            ]
          ),

          heading3('4.5.4 Payment Status Flow'),
          createTable(
            ['Status', 'Description'],
            [
              ['pending', 'Payment not yet processed'],
              ['paid', 'Payment completed successfully'],
              ['failed', 'Payment attempt failed'],
              ['refunded', 'Payment refunded to customer'],
            ]
          ),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 5: DATABASE SCHEMA
          // ────────────────────────────────────────────────────────
          heading1('5. Database Schema'),

          heading2('5.1 Overview'),
          bodyText('The database uses SQLite via Prisma ORM. The schema contains 12 models with the following key relationships:'),
          bulletPoint('Category → has many Products (1:N)'),
          bulletPoint('Product → has many CartItems (1:N), OrderItems (1:N), WishlistItems (1:N)'),
          bulletPoint('Cart → has many CartItems (1:N, cascade delete)'),
          bulletPoint('Order → has many OrderItems (1:N, cascade delete), belongs to User (N:1)'),
          bulletPoint('User → has many Orders, WishlistItems, PaymentMethods, SupportTickets, AgentDocShares'),
          bulletPoint('WikiDocument → has many AgentDocShares (1:N, cascade delete)'),
          bulletPoint('SupportTicket → has many SupportTicketMessages (1:N, cascade delete)'),

          heading2('5.2 Category Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['name', 'String', 'required', 'Category display name'],
              ['slug', 'String', '@unique', 'URL-friendly identifier'],
              ['description', 'String?', 'optional', 'Category description'],
              ['image', 'String?', 'optional', 'Category image path'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
              ['products', 'Product[]', 'relation', 'Related products'],
            ]
          ),

          heading2('5.3 Product Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['name', 'String', 'required', 'Product name'],
              ['slug', 'String', '@unique', 'URL-friendly identifier'],
              ['description', 'String', 'required', 'Product description'],
              ['price', 'Float', 'required', 'Current price in USD'],
              ['compareAtPrice', 'Float?', 'optional', 'Original price for discount display'],
              ['images', 'String', 'JSON array', 'JSON string of image URL array'],
              ['categoryId', 'String', 'foreign key', 'Reference to Category'],
              ['stock', 'Int', '@default(0)', 'Available inventory count'],
              ['rating', 'Float', '@default(0)', 'Average rating (0-5)'],
              ['reviewCount', 'Int', '@default(0)', 'Number of reviews'],
              ['featured', 'Boolean', '@default(false)', 'Featured product flag'],
              ['tags', 'String?', 'JSON array', 'JSON string of tag array'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
            ]
          ),
          bodyText('Note: images and tags fields are stored as JSON strings because SQLite does not support JSON columns natively. They are parsed/serialized with JSON.parse() and JSON.stringify().'),

          heading2('5.4 Cart & CartItem Models'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['Cart.id', 'String', '@id @default(cuid())', 'Cart identifier'],
              ['Cart.sessionId', 'String', '@unique', 'Session-based cart identifier'],
              ['Cart.createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['CartItem.id', 'String', '@id @default(cuid())', 'Cart item identifier'],
              ['CartItem.cartId', 'String', 'foreign key', 'Reference to Cart (cascade delete)'],
              ['CartItem.productId', 'String', 'foreign key', 'Reference to Product'],
              ['CartItem.quantity', 'Int', '@default(1)', 'Item quantity in cart'],
            ]
          ),

          heading2('5.5 Order & OrderItem Models'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['Order.id', 'String', '@id @default(cuid())', 'Order identifier'],
              ['Order.orderNumber', 'String', '@unique', 'Human-readable order number (3BL-xxx-xxx)'],
              ['Order.userId', 'String?', 'foreign key', 'Reference to User (optional, for guest checkout)'],
              ['Order.email', 'String', 'required', 'Customer email'],
              ['Order.firstName', 'String', 'required', 'Customer first name'],
              ['Order.lastName', 'String', 'required', 'Customer last name'],
              ['Order.address', 'String', 'required', 'Shipping address'],
              ['Order.city', 'String', 'required', 'City'],
              ['Order.state', 'String', 'required', 'State/Province'],
              ['Order.zipCode', 'String', 'required', 'ZIP/Postal code'],
              ['Order.country', 'String', 'required', 'Country'],
              ['Order.phone', 'String?', 'optional', 'Phone number'],
              ['Order.subtotal', 'Float', 'required', 'Subtotal before shipping/tax'],
              ['Order.shipping', 'Float', 'required', 'Shipping cost'],
              ['Order.tax', 'Float', 'required', 'Tax amount'],
              ['Order.total', 'Float', 'required', 'Final total amount'],
              ['Order.status', 'String', '@default("pending")', 'pending/processing/shipped/delivered/cancelled'],
              ['Order.paymentMethod', 'String', '@default("card")', 'Payment method type'],
              ['Order.paymentStatus', 'String', '@default("pending")', 'pending/paid/failed/refunded'],
              ['OrderItem.id', 'String', '@id @default(cuid())', 'Order item identifier'],
              ['OrderItem.orderId', 'String', 'foreign key', 'Reference to Order (cascade delete)'],
              ['OrderItem.productId', 'String', 'foreign key', 'Reference to Product'],
              ['OrderItem.name', 'String', 'required', 'Product name at time of order'],
              ['OrderItem.price', 'Float', 'required', 'Product price at time of order'],
              ['OrderItem.quantity', 'Int', 'required', 'Quantity ordered'],
              ['OrderItem.image', 'String?', 'optional', 'Product image at time of order'],
            ]
          ),

          heading2('5.6 User Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['email', 'String', '@unique', 'User email address'],
              ['name', 'String', 'required', 'User display name'],
              ['password', 'String', 'required', 'Bcrypt hashed password (10 salt rounds)'],
              ['role', 'String', '@default("user")', 'User role: admin, user, agent, team'],
              ['avatar', 'String?', 'optional', 'Avatar image URL'],
              ['phone', 'String?', 'optional', 'Phone number'],
              ['isActive', 'Boolean', '@default(true)', 'Account active status'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
            ]
          ),

          heading2('5.7 WishlistItem Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['userId', 'String', 'foreign key', 'Reference to User (cascade delete)'],
              ['productId', 'String', 'foreign key', 'Reference to Product'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['@@unique', '', '[userId, productId]', 'One wishlist entry per user per product'],
            ]
          ),

          heading2('5.8 PaymentMethod Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['userId', 'String', 'foreign key', 'Reference to User (cascade delete)'],
              ['type', 'String', 'required', 'Payment type: card, upi, netbanking, wallet'],
              ['label', 'String', 'required', 'Display label (e.g., "Visa ending 4242")'],
              ['last4', 'String?', 'optional', 'Last 4 digits for cards'],
              ['isDefault', 'Boolean', '@default(false)', 'Default payment method flag'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
            ]
          ),

          heading2('5.9 Offer Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['title', 'String', 'required', 'Offer title'],
              ['description', 'String', 'required', 'Offer description'],
              ['code', 'String', '@unique', 'Discount code'],
              ['discount', 'Float', 'required', 'Discount percentage'],
              ['minOrder', 'Float', '@default(0)', 'Minimum order amount for code to apply'],
              ['maxDiscount', 'Float?', 'optional', 'Maximum discount amount cap'],
              ['validFrom', 'DateTime', 'required', 'Offer start date'],
              ['validTo', 'DateTime', 'required', 'Offer end date'],
              ['isActive', 'Boolean', '@default(true)', 'Active status flag'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
            ]
          ),

          heading2('5.10 WikiDocument Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['title', 'String', 'required', 'Document title'],
              ['slug', 'String', '@unique', 'URL-friendly identifier'],
              ['content', 'String', 'required', 'Markdown content'],
              ['category', 'String', '@default("general")', 'Category: general, technical, api, architecture'],
              ['version', 'String', '@default("1.0")', 'Document version'],
              ['isPublished', 'Boolean', '@default(true)', 'Published status'],
              ['accessRoles', 'String', '@default("admin,agent,team")', 'Comma-separated roles with access'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['updatedAt', 'DateTime', '@updatedAt', 'Last update timestamp'],
            ]
          ),

          heading2('5.11 AgentDocShare Model'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['id', 'String', '@id @default(cuid())', 'Unique identifier'],
              ['docId', 'String', 'foreign key', 'Reference to WikiDocument (cascade delete)'],
              ['agentId', 'String', 'foreign key', 'Reference to User/Agent (cascade delete)'],
              ['adminId', 'String', 'foreign key', 'Reference to User/Admin who shared'],
              ['canDownload', 'Boolean', '@default(true)', 'Agent can download the document'],
              ['canShare', 'Boolean', '@default(false)', 'Agent can share with others'],
              ['message', 'String?', 'optional', 'Message from admin to agent'],
              ['createdAt', 'DateTime', '@default(now())', 'Creation timestamp'],
              ['@@unique', '', '[docId, agentId]', 'One share per document per agent'],
            ]
          ),

          heading2('5.12 SupportTicket & SupportTicketMessage Models'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['SupportTicket.id', 'String', '@id @default(cuid())', 'Ticket identifier'],
              ['SupportTicket.title', 'String', 'required', 'Ticket title'],
              ['SupportTicket.description', 'String', 'required', 'Ticket description'],
              ['SupportTicket.category', 'String', '@default("general")', 'Category: general, technical, billing, product, returns'],
              ['SupportTicket.priority', 'String', '@default("medium")', 'Priority: low, medium, high, urgent'],
              ['SupportTicket.status', 'String', '@default("open")', 'Status: open, in_progress, resolved, closed'],
              ['SupportTicket.creatorId', 'String', 'foreign key', 'Reference to User who created ticket'],
              ['SupportTicket.assigneeId', 'String?', 'foreign key', 'Reference to User assigned to ticket'],
              ['SupportTicketMessage.id', 'String', '@id @default(cuid())', 'Message identifier'],
              ['SupportTicketMessage.ticketId', 'String', 'foreign key', 'Reference to SupportTicket (cascade delete)'],
              ['SupportTicketMessage.senderId', 'String', 'required', 'ID of message sender'],
              ['SupportTicketMessage.senderName', 'String', 'required', 'Name of message sender'],
              ['SupportTicketMessage.content', 'String', 'required', 'Message content'],
              ['SupportTicketMessage.createdAt', 'DateTime', '@default(now())', 'Message timestamp'],
            ]
          ),

          heading2('5.13 Default Accounts'),
          bodyText('The system is seeded with 4 default accounts for testing and development:'),
          createTable(
            ['Email', 'Password', 'Role', 'Purpose'],
            [
              ['admin@3boxesluxury.com', 'admin123', 'Admin', 'Full platform management'],
              ['user@3boxesluxury.com', 'user123', 'User', 'Customer shopping experience'],
              ['agent@3boxesluxury.com', 'agent123', 'Agent', 'Sales agent operations'],
              ['team@3boxesluxury.com', 'team123', 'Team', 'Support ticket management'],
            ]
          ),

          heading2('5.14 Seed Data'),
          bodyText('The database is seeded via prisma/seed.ts with 11 categories and 55+ products:'),
          createTable(
            ['Category', 'Slug', 'Product Count', 'Example Products'],
            [
              ['Watches', 'watches', '4', 'Chronograph, Moonphase, Skeleton, Dive Watch'],
              ['Jewelry', 'jewelry', '10', 'Kundan Necklace, Temple Necklace, Jhumka Earrings, Polki Set'],
              ['Leather Goods', 'leather-goods', '3', 'Briefcase, Weekend Bag, Laptop Bag'],
              ['Fragrances', 'fragrances', '3', 'Oud Noir, Rose Absolute, Amber Elixir'],
              ['Fashion', 'fashion', '3', 'Evening Gown, Cocktail Dress, Silk Blouse'],
              ['Home & Living', 'home-living', '3', 'Crystal Vase, Silk Cushion, Aromatic Candle'],
              ['Sarees', 'sarees', '10', 'Banarasi, Kanjeevaram, Chiffon, Patola, Organza'],
              ['Toys', 'toys', '3', 'Building Blocks, Train Set, Puzzle'],
              ['Romantic Gifts', 'romantic-gifts', '3', 'Rose Bouquet, Spa Set, Candle Set'],
              ['Couple Friendly Gifts', 'couple-gifts', '3', 'Watch Pair, Photo Frame, Wine Set'],
              ['Men\'s Shirts & T-Shirts', 'mens-shirts', '10', 'Dress Shirt, Oxford, Linen, Polo, Henley, Silk Evening'],
            ]
          ),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 6: DEPLOYMENT
          // ────────────────────────────────────────────────────────
          heading1('6. Deployment'),

          heading2('6.1 Build Configuration'),
          createTable(
            ['Setting', 'Value', 'Notes'],
            [
              ['Framework', 'Next.js 16', 'App Router with standalone output'],
              ['Output Mode', 'standalone', 'Optimized for containerized deployment'],
              ['TypeScript', '5.x (strict)', 'Type-safe throughout, ignoreBuildErrors: true'],
              ['React Strict Mode', 'false', 'Disabled to avoid double-rendering issues'],
              ['Database', 'SQLite (file-based)', 'Located at db/custom.db via Prisma'],
              ['Port', '3000', 'Single port for Next.js dev server'],
              ['Images', 'remotePatterns: any', 'Allow all external image sources'],
            ]
          ),

          heading2('6.2 Gateway Configuration'),
          bodyText('A Caddy reverse proxy handles external access:'),
          bulletPoint('Default: All traffic → localhost:3000 (Next.js)'),
          bulletPoint('With ?XTransformPort=<port>: Traffic → localhost:<port> (for mini-services)'),
          bodyText('All API requests must use relative paths with XTransformPort query parameter for cross-service communication.'),

          heading2('6.3 Static Assets'),
          bulletPoint('Product Images: 58 JPGs in public/images/products/'),
          bulletPoint('Category Images: 5 JPGs in public/images/categories/'),
          bulletPoint('Logo: /public/images/logo.png (used for header, footer, hero, watermark)'),
          bulletPoint('Hero Background: /public/images/hero.png'),
          bulletPoint('Technical Documentation: /public/3BOXES-LUXURY-Technical-Documentation.docx'),

          heading2('6.4 Package Dependencies'),
          bodyText('Key production dependencies:'),
          bulletPoint('Core: next, react, react-dom, typescript'),
          bulletPoint('Database: @prisma/client, prisma'),
          bulletPoint('AI: z-ai-web-dev-sdk'),
          bulletPoint('State: zustand, @tanstack/react-query'),
          bulletPoint('UI: framer-motion, lucide-react, bcryptjs, next-themes'),
          bulletPoint('Forms: react-hook-form, @hookform/resolvers, zod'),
          bulletPoint('Utilities: date-fns, nanoid, sonner'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 7: APPENDIX
          // ────────────────────────────────────────────────────────
          heading1('7. Appendix'),

          heading2('7.1 Environment Variables'),
          createTable(
            ['Variable', 'Description', 'Example'],
            [
              ['DATABASE_URL', 'SQLite database connection string', 'file:./db/custom.db'],
              ['NEXT_PUBLIC_APP_URL', 'Application public URL', 'http://localhost:3000'],
            ]
          ),

          heading2('7.2 File Structure Summary'),
          createTable(
            ['Directory', 'Contents'],
            [
              ['src/app/api/', 'All API route handlers (auth, products, cart, checkout, orders, try-on, etc.)'],
              ['src/app/', 'Next.js App Router pages and layouts'],
              ['src/components/', 'Custom application components (17 major components)'],
              ['src/components/ui/', 'shadcn/ui component library (49 components)'],
              ['src/hooks/', 'Custom React hooks (use-mobile, use-toast)'],
              ['src/lib/', 'Utilities, store, auth, db client, query provider'],
              ['prisma/', 'Schema definition, seed scripts, migrations'],
              ['public/images/', 'Product and category images'],
          ]
          ),

          heading2('7.3 API Error Response Format'),
          codeBlock('{ "error": "Error message description" }'),
          bodyText('All API errors return a JSON object with an "error" field. HTTP status codes: 200 (success), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error).'),

          heading2('7.4 Key Configuration Files'),
          bulletPoint('next.config.ts — Next.js configuration (standalone output, image patterns)'),
          bulletPoint('tailwind.config.ts — Tailwind CSS theme extensions'),
          bulletPoint('components.json — shadcn/ui component configuration'),
          bulletPoint('prisma/schema.prisma — Database schema definition'),
          bulletPoint('Caddyfile — Gateway routing configuration'),
          bulletPoint('tsconfig.json — TypeScript compiler options'),

          emptyPara(),
          emptyPara(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: LIGHT_GOLD } },
            children: [
              new TextRun({
                text: '━━━ 3 BOXES LUXURY — End of Technical Documentation ━━━',
                size: 20,
                color: DARK_GOLD,
                font: 'Calibri',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  // ── Generate and save the document ───────────────────────────
  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve('/home/z/my-project/public/3BOXES-LUXURY-Technical-Documentation.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Technical documentation generated successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📦 Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

generateDocument().catch((err) => {
  console.error('❌ Error generating documentation:', err);
  process.exit(1);
});
