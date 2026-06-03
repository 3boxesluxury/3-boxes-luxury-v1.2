import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
  Header, Footer, PageNumber, NumberFormat, TabStopType, TabStopPosition,
  TableOfContents, SectionType
} from 'docx';
import * as fs from 'fs';

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

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
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
    spacing: { before: 300, after: 150 },
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
    spacing: { before: 200, after: 100 },
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

function boldText(label: string, value: string): Paragraph {
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

// Table helper
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
    (row) =>
      new TableRow({
        children: row.map((cell) =>
          new TableCell({
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

// ── Main Document ──────────────────────────────────────────────
async function generateDocument() {
  const doc = new Document({
    creator: '3 BOXES LUXURY',
    title: '3 BOXES LUXURY - Technical Documentation',
    description: 'Comprehensive technical document for the 3 BOXES LUXURY e-commerce platform',
    styles: {
      default: {
        document: {
          run: { size: 22, font: 'Calibri', color: '333333' },
        },
      },
    },
    sections: [
      // ── COVER PAGE ──────────────────────────────────────────
      {
        properties: {
          page: {
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children: [
          new Paragraph({ spacing: { before: 3000 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '3 BOXES LUXURY',
                bold: true,
                size: 72,
                color: DARK_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
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
                size: 40,
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
                text: 'Features List · Frontend Architecture · Backend Architecture',
                size: 24,
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
                text: 'Database Schema · API Reference · AI Integration',
                size: 24,
                color: GRAY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 2000 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Version 1.0 — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                size: 20,
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
                color: GRAY,
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },

      // ── TOC SECTION ─────────────────────────────────────────
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Table of Contents',
                bold: true,
                size: 36,
                color: DARK_GOLD,
                font: 'Calibri',
              }),
            ],
          }),
          new TableOfContents('Table of Contents', {
            hyperlink: true,
            headingStyleRange: '1-3',
          }),
          new Paragraph({
            children: [new TextRun({ text: '', break: 1 })],
          }),
        ],
      },

      // ── MAIN CONTENT ────────────────────────────────────────
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
          bodyText('3 BOXES LUXURY is a full-stack e-commerce platform built with Next.js 16, React 19, and TypeScript. The application features a luxury dark theme with gold accents, an AI-powered virtual try-on system, comprehensive shopping cart and checkout functionality, and a rich product catalog spanning 11 categories with 55+ products.'),
          bodyText('The platform leverages the z-ai-web-dev-sdk for AI capabilities including Vision Language Model (VLM) analysis for product and selfie understanding, and image generation/editing for virtual try-on experiences. The backend uses Prisma ORM with SQLite for data persistence, and the frontend employs Zustand for client state management and TanStack React Query for server state management.'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 2: FEATURES LIST
          // ────────────────────────────────────────────────────────
          heading1('2. Complete Features List'),

          heading2('2.1 Core E-Commerce Features'),
          bulletPoint('Product Catalog: 55+ luxury products across 11 categories (Watches, Jewelry, Leather Goods, Fragrances, Fashion, Home & Living, Sarees, Toys, Romantic Gifts, Couple Friendly Gifts, Men\'s Shirts & T-Shirts)'),
          bulletPoint('Category Browsing: Interactive category grid with icons, gradient backgrounds, and product counts'),
          bulletPoint('Product Search: Full-text search across product names and descriptions with real-time filtering'),
          bulletPoint('Product Filtering: Filter by category, sort by Featured/Newest/Price/Rating'),
          bulletPoint('Product Detail Page: Multi-image gallery with thumbnails, star ratings, pricing with discounts, stock indicators, tags, quantity selector'),
          bulletPoint('Shopping Cart: Add/remove/update quantities, order summary with subtotal/shipping/tax calculations'),
          bulletPoint('Free Shipping: Automatic free shipping on orders over $500'),
          bulletPoint('Checkout Flow: Complete checkout with contact info, shipping address, and payment form with validation'),
          bulletPoint('Order Management: Order creation with unique order numbers (3BL-timestamp-random), stock deduction, order confirmation page'),
          bulletPoint('Order History: Email-based order lookup with expandable order details and status badges'),

          heading2('2.2 AI Features'),
          bulletPoint('AI Virtual Try-On: Upload selfie + product → AI generates image of person wearing/holding the product'),
          bulletPoint('VLM Analysis: Dual VLM analysis using glm-4v-flash for person description and product description'),
          bulletPoint('Category-Specific Prompts: 15+ category-specific prompt templates for jewelry, watches, sarees, men\'s shirts, fragrances, leather goods, etc.'),
          bulletPoint('Multi-Attempt Generation: Up to 3 attempts per try-on with parameter adjustment (strength, guidance scale) on each retry'),
          bulletPoint('Fallback Generation: Text-to-image fallback using zai.images.generations.create() when all edit attempts fail'),
          bulletPoint('Async Job System: In-memory job queue with polling-based status updates (3s interval, 3-min timeout)'),
          bulletPoint('Image Compression: Client-side image compression (max 1280px, 85% quality) before upload'),
          bulletPoint('3 BOXES Logo Watermark: Canvas-based logo watermark overlay on downloaded AI-generated images'),
          bulletPoint('AI Style Suggestions: Complementary product suggestions based on category pairing logic with "Add to Cart" buttons'),
          bulletPoint('Progress Feedback: Real-time progress messages during AI generation with animated progress bar'),

          heading2('2.3 UI/UX Features'),
          bulletPoint('Dark Luxury Theme: Stone-950 background with amber/gold accent system throughout'),
          bulletPoint('Gold Shimmer Text: Animated gradient text effect for the 3 BOXES LUXURY branding'),
          bulletPoint('Logo Glow Animation: Pulsing golden glow effect on the logo with scale animation'),
          bulletPoint('Golden Particles: 15 floating golden particles in the hero section with staggered animations'),
          bulletPoint('Bokeh Light Effects: 8 ambient bokeh lights creating a luxury showroom atmosphere'),
          bulletPoint('Golden Light Rays: 7 animated light rays emanating from the background'),
          bulletPoint('Card Hover Effects: Golden glow shadow on product card hover with subtle lift animation'),
          bulletPoint('Framer Motion Animations: Page transitions, staggered list animations, spring-based entrances'),
          bulletPoint('Responsive Design: Mobile-first with breakpoints at sm/md/lg/xl, mobile hamburger menu'),
          bulletPoint('Skeleton Loading: Custom skeleton placeholders during data loading states'),
          bulletPoint('Error Boundary: React class-based error boundary with recovery button'),
          bulletPoint('Custom Scrollbar: Styled scrollbar matching the dark theme'),
          bulletPoint('Toast Notifications: User feedback for cart additions via Sonner/Toaster'),
          bulletPoint('Image Error Fallbacks: Gem emoji placeholders when product images fail to load'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 3: FRONTEND ARCHITECTURE
          // ────────────────────────────────────────────────────────
          heading1('3. Frontend Architecture'),

          heading2('3.1 Technology Stack'),
          createTable(
            ['Technology', 'Version', 'Purpose'],
            [
              ['Next.js', '16.x', 'React framework with App Router and standalone output'],
              ['React', '19.x', 'UI library with concurrent features'],
              ['TypeScript', '5.x', 'Type-safe JavaScript with strict mode'],
              ['Tailwind CSS', '4.x', 'Utility-first CSS framework'],
              ['shadcn/ui', 'New York', 'Pre-built UI component library with Radix primitives'],
              ['Zustand', '5.x', 'Lightweight client state management'],
              ['TanStack React Query', '5.x', 'Server state management with caching'],
              ['Framer Motion', '12.x', 'Animation library for page transitions and micro-interactions'],
              ['Lucide React', '0.525+', 'Icon library with 1000+ icons'],
            ]
          ),

          heading2('3.2 Component Architecture'),
          bodyText('The application uses a single-page architecture managed by Zustand state. The current "view" determines which component is rendered, with AnimatePresence providing smooth transitions between views.'),

          heading3('3.2.1 View State Management'),
          codeBlock('type View = "home" | "product" | "cart" | "checkout" | "orders" | "order-confirmation" | "docs"'),
          bodyText('The Zustand store (src/lib/store.ts) manages:'),
          bulletPoint('view: Current active view/page'),
          bulletPoint('selectedProductId: Currently selected product for detail view'),
          bulletPoint('searchQuery: Active search term'),
          bulletPoint('selectedCategory: Active category filter'),
          bulletPoint('cartItems: Array of CartItem objects with productId, name, price, image, quantity'),
          bulletPoint('lastOrderId: Most recent order number for confirmation'),

          heading3('3.2.2 Component Tree'),
          createTable(
            ['Component', 'File', 'Description'],
            [
              ['Header', 'src/components/header.tsx', 'Sticky header with logo, search bar, cart badge, mobile menu'],
              ['HeroSection', 'src/components/hero-section.tsx', 'Full-screen hero with particles, bokeh, light rays, CTAs'],
              ['CategoryGrid', 'src/components/category-grid.tsx', '11 category cards with icons and gradient backgrounds'],
              ['ProductGrid', 'src/components/product-grid.tsx', 'Product listing with sort/filter, search integration'],
              ['ProductCard', 'src/components/product-card.tsx', 'Product card with image, rating, price, Add to Cart'],
              ['ProductDetail', 'src/components/product-detail.tsx', 'Product detail + TryOnDialog + AI Style Suggestions'],
              ['TryOnDialog', 'src/components/product-detail.tsx', '4-step dialog: upload → preview → generating → result'],
              ['CartView', 'src/components/cart-view.tsx', 'Cart items list with quantity controls, order summary'],
              ['CheckoutView', 'src/components/checkout-view.tsx', 'Contact/shipping/payment form with validation'],
              ['OrderConfirmation', 'src/components/order-confirmation.tsx', 'Success page with order number, estimated delivery'],
              ['OrderHistory', 'src/components/order-history.tsx', 'Email-based order search with expandable details'],
              ['Footer', 'src/components/footer.tsx', '4-column footer with Shop/Company/Support links'],
            ]
          ),

          heading3('3.2.3 UI Component Library (shadcn/ui)'),
          bodyText('The project includes 49 shadcn/ui components in src/components/ui/ including: accordion, alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.'),

          heading2('3.3 Styling System'),
          heading3('3.3.1 Color System'),
          bodyText('The dark luxury theme uses CSS custom properties defined in globals.css with oklch color space:'),
          bulletPoint('Background: oklch(0.145 0 0) — Deep stone-950 black'),
          bulletPoint('Foreground: oklch(0.985 0 0) — Near-white text'),
          bulletPoint('Primary: oklch(0.75 0.15 75) — Amber/Gold accent'),
          bulletPoint('Card: oklch(0.205 0 0) — Slightly lighter than background'),
          bulletPoint('Border: oklch(1 0 0 / 10%) — Subtle white border'),

          heading3('3.3.2 Custom CSS Animations'),
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

          heading3('3.3.3 Font System'),
          bodyText('Two Google Fonts loaded via next/font:'),
          bulletPoint('Geist Sans (--font-geist-sans): Primary body font, variable with Latin subset'),
          bulletPoint('Geist Mono (--font-geist-mono): Monospace font for code and technical content'),

          heading2('3.4 State Management Strategy'),
          heading3('3.4.1 Client State (Zustand)'),
          bodyText('Zustand manages local UI state including: current view, selected product, search query, category filter, cart items (with add/remove/updateQuantity/clear operations), and last order ID. The store uses a flat structure with setter functions.'),

          heading3('3.4.2 Server State (React Query)'),
          bodyText('TanStack React Query handles all API data fetching with:'),
          bulletPoint('Query keys: Structured as [entity, ...params] (e.g., ["products", searchQuery, category, sort])'),
          bulletPoint('Auto-caching and background refetching'),
          bulletPoint('Loading/error states managed via useQuery hooks'),
          bulletPoint('Mutations for checkout (useMutation with onSuccess callback)'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 4: BACKEND ARCHITECTURE
          // ────────────────────────────────────────────────────────
          heading1('4. Backend Architecture'),

          heading2('4.1 API Routes'),
          bodyText('All backend logic is implemented as Next.js App Router API routes in src/app/api/:'),

          createTable(
            ['Endpoint', 'Method', 'Description'],
            [
              ['/api/products', 'GET', 'List products with search, category, price, sort, pagination'],
              ['/api/products/[id]', 'GET', 'Single product detail with category relation'],
              ['/api/categories', 'GET', 'All categories with product count (_count aggregation)'],
              ['/api/cart', 'GET', 'Get cart by session ID with items and product details'],
              ['/api/cart', 'POST', 'Add item to cart (creates cart if needed, checks stock)'],
              ['/api/cart', 'PATCH', 'Update cart item quantity (validates stock)'],
              ['/api/cart', 'DELETE', 'Remove item from cart (validates session ownership)'],
              ['/api/checkout', 'POST', 'Create order with items, calculate totals, deduct stock'],
              ['/api/orders', 'GET', 'List orders by email with items'],
              ['/api/orders/[id]', 'GET', 'Single order detail'],
              ['/api/try-on', 'POST', 'Start AI try-on job (returns jobId for polling)'],
              ['/api/try-on', 'GET', 'Poll try-on job status by jobId'],
              ['/api/combo-suggestions', 'GET', 'AI style suggestions with complementary categories'],
            ]
          ),

          heading2('4.2 AI Virtual Try-On System'),
          heading3('4.2.1 Architecture Overview'),
          bodyText('The try-on system uses an asynchronous job-based architecture:'),
          bulletPoint('Step 1: Client POSTs selfie + productId to /api/try-on'),
          bulletPoint('Step 2: Server creates an in-memory TryOnJob, returns jobId immediately'),
          bulletPoint('Step 3: Background process runs VLM analysis + image generation'),
          bulletPoint('Step 4: Client polls GET /api/try-on?jobId=xxx every 3 seconds'),
          bulletPoint('Step 5: Server returns completed imageUrl or processing status'),

          heading3('4.2.2 VLM Analysis Phase'),
          bodyText('Two parallel VLM (Vision Language Model) calls using glm-4v-flash:'),
          bulletPoint('Person Analysis: Extracts skin tone, body type, current outfit, pose/framing, hair, lighting'),
          bulletPoint('Product Analysis: Identifies type/placement, size/proportions, dominant colors, material/texture, key visual details'),
          bulletPoint('Timeout: 25 seconds per VLM call with graceful fallback to empty string'),

          heading3('4.2.3 Category-Specific Prompt Engineering'),
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

          heading3('4.2.4 Retry and Fallback Strategy'),
          bulletPoint('Attempt 1: Base strength and guidance scale settings'),
          bulletPoint('Attempt 2: strength - 0.03, guidance + 2 (more precise)'),
          bulletPoint('Attempt 3: strength - 0.05, guidance + 4 (most conservative)'),
          bulletPoint('Quality Check: Images under 20KB base64 are rejected as poor quality'),
          bulletPoint('Fallback: If all edit attempts fail, use zai.images.generations.create() for text-to-image generation'),
          bulletPoint('Job Cleanup: Automatic cleanup of jobs older than 10 minutes (runs every 5 minutes)'),

          heading3('4.2.5 SDK Configuration'),
          bodyText('The z-ai-web-dev-sdk is initialized via ZAI.create() which reads from .z-ai-config files at:'),
          codeBlock('1. <project_root>/.z-ai-config'),
          codeBlock('2. /etc/.z-ai-config'),
          bodyText('The config must contain baseUrl and apiKey. The SDK uses X-Token authentication headers automatically.'),

          heading2('4.3 Combo Suggestions System'),
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

          heading2('4.4 Checkout and Order System'),
          heading3('4.4.1 Order Creation Flow'),
          bulletPoint('1. Validate required fields (email, name, address, city, state, zip, country)'),
          bulletPoint('2. Verify all products exist and have sufficient stock'),
          bulletPoint('3. Calculate subtotal from product prices × quantities'),
          bulletPoint('4. Calculate shipping ($0 if subtotal > $500, else $15)'),
          bulletPoint('5. Calculate tax (8% of subtotal)'),
          bulletPoint('6. Generate unique order number: 3BL-{timestamp}-{random6chars}'),
          bulletPoint('7. Create order with all items in a single Prisma transaction'),
          bulletPoint('8. Decrement stock for each product ordered'),

          heading3('4.4.2 Order Number Format'),
          codeBlock('3BL-1777861732447-BI5QGX'),
          bodyText('Format: 3BL-{epoch_milliseconds}-{6_random_alphanumeric_chars_uppercase}'),

          heading3('4.4.3 Order Status Flow'),
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
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 5: DATABASE SCHEMA
          // ────────────────────────────────────────────────────────
          heading1('5. Database Schema'),

          heading2('5.1 Overview'),
          bodyText('The database uses SQLite via Prisma ORM. The schema contains 6 models with the following relationships:'),
          bulletPoint('Category → has many Products (1:N)'),
          bulletPoint('Product → has many CartItems (1:N) and OrderItems (1:N)'),
          bulletPoint('Cart → has many CartItems (1:N, cascade delete)'),
          bulletPoint('Order → has many OrderItems (1:N, cascade delete)'),

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
          bodyText('Note: images and tags fields are stored as JSON strings (not native JSON type) because SQLite does not support JSON columns natively. They are parsed/serialized with JSON.parse() and JSON.stringify().'),

          heading2('5.4 Cart & CartItem Models'),
          createTable(
            ['Field', 'Type', 'Constraints', 'Description'],
            [
              ['Cart.id', 'String', '@id @default(cuid())', 'Cart identifier'],
              ['Cart.sessionId', 'String', '@unique', 'Session-based cart identifier'],
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
              ['Order.paymentMethod', 'String', '@default("card")', 'Payment method'],
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

          heading2('5.6 Seed Data'),
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
          // SECTION 6: INFRASTRUCTURE
          // ────────────────────────────────────────────────────────
          heading1('6. Infrastructure & Deployment'),

          heading2('6.1 Gateway Configuration'),
          bodyText('A Caddy reverse proxy listens on port 81 and routes traffic:'),
          bulletPoint('Default: All traffic → localhost:3000 (Next.js)'),
          bulletPoint('With ?XTransformPort=<port>: Traffic → localhost:<port> (for mini-services)'),
          bodyText('All API requests must use relative paths with XTransformPort query parameter for cross-service communication.'),

          heading2('6.2 Build Configuration'),
          createTable(
            ['Setting', 'Value', 'Notes'],
            [
              ['output', 'standalone', 'Optimized for containerized deployment'],
              ['typescript.ignoreBuildErrors', 'true', 'Skip type checking during build'],
              ['reactStrictMode', 'false', 'Disabled to avoid double-rendering issues'],
              ['images.remotePatterns', 'any hostname', 'Allow all external image sources'],
              ['devOrigins', 'boxes3.space.z.ai', 'Allowed dev origins'],
            ]
          ),

          heading2('6.3 Static Assets'),
          bulletPoint('Product Images: 58 JPGs in public/images/products/'),
          bulletPoint('Category Images: 5 JPGs in public/images/categories/'),
          bulletPoint('Logo: /public/images/logo.png (used for header, footer, hero, watermark)'),
          bulletPoint('Hero Background: /public/images/hero.png'),

          heading2('6.4 Package Dependencies Summary'),
          bodyText('36 production dependencies and 9 dev dependencies. Key production dependencies include:'),
          bulletPoint('Core: next, react, react-dom, typescript'),
          bulletPoint('Database: @prisma/client, prisma'),
          bulletPoint('AI: z-ai-web-dev-sdk'),
          bulletPoint('State: zustand, @tanstack/react-query'),
          bulletPoint('UI: framer-motion, lucide-react, 20+ @radix-ui/* packages'),
          bulletPoint('Forms: react-hook-form, @hookform/resolvers, zod'),
          bulletPoint('Auth: next-auth'),
          bulletPoint('Utilities: sharp, uuid, date-fns, cmdk'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 7: KEY IMPLEMENTATION DETAILS
          // ────────────────────────────────────────────────────────
          heading1('7. Key Implementation Details'),

          heading2('7.1 Image Watermark System'),
          bodyText('When a user downloads an AI-generated try-on image, a canvas-based watermark is applied:'),
          bulletPoint('1. The AI result image (base64 data URL) is loaded into a canvas'),
          bulletPoint('2. The 3 BOXES logo (/images/logo.png) is loaded and drawn at the bottom-left'),
          bulletPoint('3. Logo size is 18% of image width with aspect ratio preserved'),
          bulletPoint('4. A semi-transparent black bar (55% opacity) is drawn behind the logo for readability'),
          bulletPoint('5. "3 BOXES" text in gold (#D4A437) and "GIFTS" text in light gold (#F5E6A3) are drawn beside the logo'),
          bulletPoint('6. The canvas is exported as PNG for download'),
          bulletPoint('7. Fallback: If logo loading fails, the original image is downloaded without watermark'),

          heading2('7.2 Try-On Dialog Flow'),
          bodyText('The TryOnDialog implements a 4-step wizard:'),
          bulletPoint('Upload: File input with drag-and-drop visual, 10MB limit, image type validation, photo tips'),
          bulletPoint('Preview: Side-by-side selfie + product preview with Retake/Generate buttons'),
          bulletPoint('Generating: Animated progress with ping effect, sparkle icon, progress bar (pollCount × 5% + 10%), timeout at 3 minutes'),
          bulletPoint('Result: Side-by-side comparison (selfie vs AI), product reference card, disclaimer, Try Again/Save with Logo buttons'),

          heading2('7.3 Product Image Handling'),
          bodyText('Product images are stored as a JSON string array in the Product model:'),
          bulletPoint('Schema: images String (not a native array — SQLite limitation)'),
          bulletPoint('Storage format: "[\\"/images/products/watch1.jpg\\",\\"/images/products/watch2.jpg\\"]"'),
          bulletPoint('API transformation: JSON.parse(product.images || "[]") returns string[]'),
          bulletPoint('Client rendering: Next.js Image component with fill layout and object-cover'),
          bulletPoint('Error handling: Gem emoji placeholder on image load error, tracked per image index'),

          heading2('7.4 Cart Implementation'),
          bodyText('The cart operates in dual mode:'),
          bulletPoint('Client-side (Zustand): Immediate updates for UI responsiveness. CartItem objects stored with productId, name, price, image, quantity'),
          bulletPoint('Server-side (API + DB): Server Cart model with session-based identification. Used for persistence and cross-device scenarios'),
          bulletPoint('Add behavior: If item already in cart, increment quantity; otherwise add with quantity 1'),
          bulletPoint('Stock validation: Server-side stock checks on add (POST) and update (PATCH)'),

          heading2('7.5 Search and Filtering'),
          bodyText('Product search uses Prisma\'s contains filter:'),
          codeBlock('where.OR = [{ name: { contains: search } }, { description: { contains: search } }]'),
          bodyText('Sorting options: Featured (featured desc, createdAt desc), Newest (createdAt desc), Price Low-High, Price High-Low, Top Rated (rating desc)'),
          bodyText('Pagination: Default 12 items per page with skip/take pattern.'),
          separator(),

          // ────────────────────────────────────────────────────────
          // SECTION 8: KNOWN LIMITATIONS
          // ────────────────────────────────────────────────────────
          heading1('8. Known Limitations & Future Improvements'),

          heading2('8.1 Known Limitations'),
          bulletPoint('AI Face Preservation: The z-ai-web-dev-sdk edit API treats images as context/reference only and does not guarantee face preservation. VLM face verification scores have been consistently low (1-3/10)'),
          bulletPoint('In-Memory Job Storage: Try-on jobs are stored in a Node.js Map with 10-minute TTL. Server restarts lose all active jobs'),
          bulletPoint('No User Authentication: The app uses session-based carts without NextAuth.js integration'),
          bulletPoint('SQLite Limitations: No native JSON type, no concurrent write support, limited scalability'),
          bulletPoint('No Payment Gateway: Checkout is a demo with no real payment processing'),
          bulletPoint('No Image Optimization Pipeline: Product images are served directly without CDN or responsive image variants'),

          heading2('8.2 Recommended Improvements'),
          bulletPoint('Replace in-memory job storage with Redis or database-backed queue for persistence'),
          bulletPoint('Implement proper face-swapping or face-preserving image generation pipeline'),
          bulletPoint('Add NextAuth.js authentication for user accounts and order history'),
          bulletPoint('Migrate to PostgreSQL for production scalability'),
          bulletPoint('Integrate Stripe/Razorpay payment gateway'),
          bulletPoint('Add image CDN with responsive variants (Cloudinary, Imgix)'),
          bulletPoint('Implement real-time notifications via WebSocket for try-on completion'),
          bulletPoint('Add product reviews and rating submission'),
          bulletPoint('Implement wishlist functionality'),
          bulletPoint('Add multi-language support via next-intl'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = '/home/z/my-project/public/3BOXES-LUXURY-Technical-Documentation.docx';
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document generated: ${outputPath}`);
}

generateDocument().catch(console.error);
