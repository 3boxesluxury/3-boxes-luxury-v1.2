import { DocumentationDoc } from './types';

const technicalDoc: DocumentationDoc = {
  id: 'technical-documentation',
  title: '3BOXES Technical Documentation',
  description: 'Comprehensive technical reference for the 3BOXES luxury e-commerce platform, covering system architecture, components, APIs, database schema, authentication, state management, internationalization, image handling, PWA support, security, payments, and Shopify integration.',
  category: 'technical',
  isConfidential: false,
  version: '1.0.0',
  lastUpdated: '2025-03-04',
  sections: [
    // ─── SECTION 1: System Architecture ──────────────────────────────
    {
      id: 'system-architecture',
      title: 'System Architecture',
      content: `<h2>3BOXES System Architecture Overview</h2>
<p>The 3BOXES platform (3boxes.in) is a luxury e-commerce SPA (Single Page Application) built on <strong>Next.js 16</strong> with the <strong>App Router</strong> paradigm. The entire frontend is rendered client-side as a single-page application, with all view transitions managed by <strong>Zustand</strong> state rather than Next.js file-based routing. This architecture was chosen to provide a seamless, app-like experience for luxury shoppers while leveraging Next.js API routes for the backend.</p>

<h3>High-Level Architecture Diagram</h3>
<pre>
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │ React      │  │ Zustand     │  │ TanStack      │  │ i18n     │ │
│  │ Components │◄─┤ Store       │  │ Query Cache   │  │ System   │ │
│  │ (60+)      │  │ (AppState)  │  │ (Server State)│  │ (10 langs│ │
│  └─────┬──────┘  └──────┬──────┘  └───────┬───────┘  └──────────┘ │
│        │                │                  │                        │
│  ┌─────▼────────────────▼──────────────────▼──────────────────────┐ │
│  │              Next.js 16 App Router (SPA Mode)                  │ │
│  │  src/app/page.tsx → Single entry point, all views rendered    │ │
│  └──────────────────────────┬────────────────────────────────────┘ │
└─────────────────────────────┼──────────────────────────────────────┘
                              │ fetch() / REST API
┌─────────────────────────────▼──────────────────────────────────────┐
│                    NEXT.JS API ROUTES (Backend)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ /api/auth│ │/api/prod │ │/api/ord  │ │/api/tryon│ │/api/shop│ │
│  │ (14 ep)  │ │(4 ep)    │ │(5 ep)    │ │(3 ep)    │ │(9 ep)   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │             │            │             │             │       │
│  ┌────▼─────────────▼────────────▼─────────────▼─────────────▼────┐ │
│  │              Prisma ORM (Database Access Layer)                │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    DATABASE LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ SQLite (Dev) │  │PostgreSQL    │  │ Prisma Client             │ │
│  │ db/custom.db │  │(Prod/Vercel) │  │ (Type-safe queries)       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ HuggingFace  │ │ ZAI AI SDK   │ │ Razorpay /   │ │ Shopify    │ │
│  │ IDM-VTON     │ │ (z-ai-sdk)   │ │ Stripe       │ │ Admin API  │ │
│  │ (Try-On AI)  │ │ (Image Gen)  │ │ (Payments)   │ │ (Sync)     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
</pre>

<h3>Key Architectural Decisions</h3>
<ul>
<li><strong>SPA with Zustand</strong>: The application uses a single <code>page.tsx</code> that renders different views based on Zustand state (<code>view: View</code>). This provides instant view transitions without page reloads, critical for luxury UX where fluidity matters. The View union type supports 30+ views: <code>'home' | 'product' | 'cart' | 'checkout' | 'orders' | ...</code></li>
<li><strong>Next.js 16 App Router</strong>: API routes use the App Router pattern (<code>src/app/api/</code>) with route handlers exporting <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>PATCH</code>, <code>DELETE</code> functions. Server components are not used for the main app; everything is client-rendered.</li>
<li><strong>Prisma ORM with SQLite/PostgreSQL</strong>: Development uses SQLite (<code>db/custom.db</code>) for zero-config setup; production uses PostgreSQL via Vercel Postgres or Neon. The <code>prisma/schema.prisma</code> defines 35+ models with full type safety.</li>
<li><strong>Multi-Service Architecture</strong>: An AI proxy mini-service runs on port 3030 (<code>mini-services/ai-proxy/</code>), auto-started by <code>src/instrumentation.ts</code>. The Caddy gateway routes requests via <code>XTransformPort</code> query parameter.</li>
<li><strong>Client-Side Only Rendering</strong>: The main app is fully client-side rendered. <code>src/app/page.tsx</code> is a <code>'use client'</code> component that dynamically renders the current view from Zustand state.</li>
</ul>`,
      subsections: [
        {
          id: 'spa-routing-model',
          title: 'SPA Routing Model',
          content: `<h3>View-Based SPA Routing</h3>
<p>Unlike traditional Next.js applications that use file-based routing, 3BOXES uses a <strong>state-driven SPA routing model</strong>. The entire application lives in a single page (<code>src/app/page.tsx</code>), and navigation is handled by changing the <code>view</code> state in the Zustand store.</p>

<pre><code>// From src/lib/store.ts
export type View = 'home' | 'product' | 'cart' | 'checkout' | 'orders' |
  'order-confirmation' | 'user-dashboard' | 'admin-dashboard' |
  'agent-dashboard' | 'team-dashboard' | 'corporate-dashboard' |
  'wiki' | 'downloads' | 'security-policy' | 'shop' | 'contact' |
  'about' | 'divisions' | 'careers' | 'press' | 'sustainability' |
  'shipping' | 'faq' | 'size-guide' | 'track-order' |
  'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'refund-policy'
</code></pre>

<p>Navigation is performed by calling <code>useStore.getState().setView('cart')</code> or <code>selectProduct(productId)</code> which sets both the product ID and view. The main page component conditionally renders the appropriate view component:</p>

<pre><code>// Simplified rendering logic in page.tsx
const view = useStore(state => state.view)
switch (view) {
  case 'home': return &lt;HomeView /&gt;
  case 'product': return &lt;ProductDetail /&gt;
  case 'cart': return &lt;CartView /&gt;
  case 'checkout': return &lt;CheckoutView /&gt;
  case 'admin-dashboard': return &lt;AdminDashboard /&gt;
  // ... 30+ views
}
</code></pre>

<h4>Advantages of This Approach</h4>
<ul>
<li><strong>Zero page reloads</strong>: Instant transitions between views</li>
<li><strong>Shared state</strong>: Cart, auth, and preferences persist across views</li>
<li><strong>Deep linking</strong>: URL hash can be used to restore views</li>
<li><strong>Mobile-like UX</strong>: Feels like a native app with smooth transitions</li>
</ul>`
        },
        {
          id: 'technology-stack',
          title: 'Technology Stack',
          content: `<h3>Complete Technology Stack</h3>
<table>
<tr><th>Layer</th><th>Technology</th><th>Version</th><th>Purpose</th></tr>
<tr><td>Framework</td><td>Next.js</td><td>16.x</td><td>Full-stack React framework with App Router</td></tr>
<tr><td>Language</td><td>TypeScript</td><td>5.x</td><td>Strict typing throughout the codebase</td></tr>
<tr><td>Styling</td><td>Tailwind CSS</td><td>4.x</td><td>Utility-first CSS with custom design tokens</td></tr>
<tr><td>UI Components</td><td>shadcn/ui</td><td>Latest</td><td>New York style variant with Radix UI primitives</td></tr>
<tr><td>State Management</td><td>Zustand</td><td>4.x</td><td>Client state (view, auth, cart, locale)</td></tr>
<tr><td>Server State</td><td>TanStack Query</td><td>5.x</td><td>API data caching, background refetch</td></tr>
<tr><td>ORM</td><td>Prisma</td><td>5.x</td><td>Type-safe database access</td></tr>
<tr><td>Database (Dev)</td><td>SQLite</td><td>3.x</td><td>Local development database</td></tr>
<tr><td>Database (Prod)</td><td>PostgreSQL</td><td>15+</td><td>Production database via Vercel/Neon</td></tr>
<tr><td>AI SDK</td><td>z-ai-web-dev-sdk</td><td>Latest</td><td>Image generation, VLM, chat completions</td></tr>
<tr><td>AI Try-On</td><td>HuggingFace IDM-VTON</td><td>Public Space</td><td>Virtual try-on via Gradio API</td></tr>
<tr><td>Payments</td><td>Razorpay / Stripe</td><td>Latest</td><td>Payment processing for INR and multi-currency</td></tr>
<tr><td>E-Commerce</td><td>Shopify Admin/Storefront API</td><td>2024-01</td><td>Product sync, order management</td></tr>
<tr><td>Icons</td><td>Lucide React</td><td>Latest</td><td>Consistent icon system</td></tr>
<tr><td>Animations</td><td>Framer Motion</td><td>11.x</td><td>Page transitions, hover effects</td></tr>
<tr><td>Notifications</td><td>Sonner</td><td>Latest</td><td>Toast notifications</td></tr>
<tr><td>Forms</td><td>React Hook Form + Zod</td><td>Latest</td><td>Form validation and submission</td></tr>
<tr><td>PDF Generation</td><td>jsPDF</td><td>Latest</td><td>Invoice and report generation</td></tr>
<tr><td>Encryption</td><td>Node.js crypto</td><td>Built-in</td><td>AES-256-GCM for sensitive fields</td></tr>
<tr><td>Runtime</td><td>Bun</td><td>1.x</td><td>Fast JavaScript runtime and package manager</td></tr>
<tr><td>Gateway</td><td>Caddy</td><td>2.x</td><td>Reverse proxy with automatic HTTPS</td></tr>
</table>`
        },
        {
          id: 'project-structure',
          title: 'Project Directory Structure',
          content: `<h3>Project Directory Layout</h3>
<pre>
3boxes-luxury/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Single page entry (SPA)
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── globals.css           # Global styles + Tailwind
│   │   ├── error.tsx             # Error boundary
│   │   ├── global-error.tsx      # Global error handler
│   │   ├── instrumentation.ts    # Auto-start mini-services
│   │   └── api/                  # 120+ API route handlers
│   │       ├── auth/             # Authentication (14 endpoints)
│   │       ├── products/         # Product CRUD (3 endpoints)
│   │       ├── orders/           # Order management (5 endpoints)
│   │       ├── cart/             # Cart operations (1 endpoint)
│   │       ├── checkout/         # Checkout flow (2 endpoints)
│   │       ├── payments/         # Payment processing (2 endpoints)
│   │       ├── try-on/           # AI try-on (3 endpoints)
│   │       ├── shopify/          # Shopify integration (9 endpoints)
│   │       ├── admin/            # Admin operations (16 endpoints)
│   │       ├── corporate/        # Corporate portal (12 endpoints)
│   │       ├── ai-assistant/     # AI chatbot (1 endpoint)
│   │       ├── ai-proxy/         # AI proxy service (1 endpoint)
│   │       ├── wishlist/         # Wishlist (1 endpoint)
│   │       ├── reviews/          # Product reviews (1 endpoint)
│   │       ├── search/           # Search (1 endpoint)
│   │       ├── categories/       # Categories (1 endpoint)
│   │       ├── geo/              # Geo-detection (1 endpoint)
│   │       ├── currency/         # Currency rates (1 endpoint)
│   │       ├── exchange-rates/   # Exchange rates (1 endpoint)
│   │       ├── image-proxy/      # Image proxy (1 endpoint)
│   │       ├── inventory/        # Inventory (2 endpoints)
│   │       ├── invoices/         # Invoice management (2 endpoints)
│   │       ├── vendors/          # Vendor management (2 endpoints)
│   │       ├── partners/         # Partner integrations (3 endpoints)
│   │       ├── coupons/          # Coupon validation (1 endpoint)
│   │       ├── offers/           # Offers (2 endpoints)
│   │       ├── support/          # Support tickets (2 endpoints)
│   │       ├── support-tickets/  # Support ticket details (3 endpoints)
│   │       ├── affiliate/        # Affiliate tracking (2 endpoints)
│   │       ├── wiki/             # Wiki documents (3 endpoints)
│   │       ├── dashboard/        # User dashboard (1 endpoint)
│   │       ├── gift-recommend/   # AI gift recommendations (1 endpoint)
│   │       ├── combo-suggestions/# Combo suggestions (1 endpoint)
│   │       ├── family-shopping/  # Family packages (1 endpoint)
│   │       ├── family/packages/  # Family package details (1 endpoint)
│   │       ├── smartbundle/      # Smart bundle creation (1 endpoint)
│   │       ├── style-gallery/    # Style gallery (2 endpoints)
│   │       ├── social/           # Social analysis (1 endpoint)
│   │       ├── social-style/     # Social style (1 endpoint)
│   │       ├── product-import/   # Product import (3 endpoints)
│   │       ├── threebox-curate/  # Curated collections (1 endpoint)
│   │       ├── payment-methods/  # Payment methods (1 endpoint)
│   │       ├── accounting/       # Accounting entries (1 endpoint)
│   │       ├── moderate-image/   # Image moderation (1 endpoint)
│   │       ├── config/           # App configuration (1 endpoint)
│   │       ├── integrations/     # Platform integrations (4 endpoints)
│   │       └── invoices/         # Invoice PDFs (2 endpoints)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components (40+)
│   │   ├── admin/                # Admin-specific sub-components
│   │   ├── header.tsx            # Main navigation header
│   │   ├── footer.tsx            # Site footer
│   │   ├── hero-section.tsx      # Landing page hero
│   │   ├── product-grid.tsx      # Product listing grid
│   │   ├── product-card.tsx      # Product card component
│   │   ├── product-detail.tsx    # Product detail view
│   │   ├── try-on-dialog.tsx     # AI try-on modal
│   │   ├── cart-view.tsx         # Shopping cart view
│   │   ├── checkout-view.tsx     # Checkout flow view
│   │   ├── wishlist-view.tsx     # Wishlist view
│   │   ├── auth-dialog.tsx       # Login/Register dialog
│   │   ├── admin-dashboard.tsx   # Admin dashboard
│   │   ├── agent-dashboard.tsx   # Agent dashboard
│   │   ├── team-dashboard.tsx    # Team dashboard
│   │   ├── corporate-dashboard.tsx # Corporate portal
│   │   ├── user-dashboard.tsx    # User dashboard
│   │   ├── gift-builder.tsx      # Gift builder tool
│   │   ├── gift-assistant.tsx    # AI gift assistant
│   │   ├── ai-assistant.tsx      # AI chatbot
│   │   ├── category-grid.tsx     # Category browsing
│   │   ├── order-tracking.tsx    # Order tracking view
│   │   ├── order-history.tsx     # Order history view
│   │   ├── reviews-section.tsx   # Product reviews
│   │   ├── wiki-section.tsx      # Wiki/documentation
│   │   └── ... (60+ total components)
│   ├── lib/
│   │   ├── store.ts              # Zustand global state
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # Auth utilities
│   │   ├── auth-helper.ts        # Auth helper functions
│   │   ├── auth-api.ts           # Auth API client
│   │   ├── auth-fetch.ts         # Authenticated fetch wrapper
│   │   ├── session.ts            # Session management
│   │   ├── sessions.ts           # Session storage
│   │   ├── encryption.ts         # AES-256-GCM encryption
│   │   ├── try-on-pipeline.ts    # AI try-on pipeline v4
│   │   ├── huggingface-tryon.ts  # HuggingFace IDM-VTON client
│   │   ├── zai.ts                # ZAI SDK wrapper
│   │   ├── shopify.ts            # Shopify integration
│   │   ├── shopify/client.ts     # Shopify Storefront API client
│   │   ├── shopify/admin-client.ts # Shopify Admin API client
│   │   ├── shopify/store.ts      # Shopify store config
│   │   ├── i18n/index.ts         # i18n translation system
│   │   ├── rate-limiter.ts       # API rate limiting
│   │   ├── api-logger.ts         # API request logging
│   │   ├── watermark.ts          # Image watermarking
│   │   ├── image-utils.ts        # Image utility functions
│   │   ├── image-downloader.ts   # Image download helper
│   │   ├── email.ts              # Email sending utility
│   │   ├── currency.ts           # Currency conversion
│   │   ├── currency/config.ts    # Currency configuration
│   │   ├── currency/formatter.ts # Currency formatting
│   │   ├── geo/country-map.ts    # Country-to-currency mapping
│   │   ├── pdf-utils.ts          # PDF generation utilities
│   │   ├── utils.ts              # General utilities (cn, etc.)
│   │   ├── ensure-array.ts       # Array safety utility
│   │   ├── password-validator.ts # Password strength validation
│   │   ├── demo-otp-store.ts     # Demo OTP storage
│   │   ├── client-style-preview.ts # Client-side style preview
│   │   ├── static-products.ts    # Static product data
│   │   ├── validations/auth.ts   # Auth validation schemas
│   │   ├── query-provider.tsx    # TanStack Query provider
│   │   └── documentation/        # Documentation content
│   ├── hooks/
│   │   ├── use-mobile.ts         # Mobile detection hook
│   │   ├── use-toast.ts          # Toast notification hook
│   │   ├── useTranslation.ts     # Translation hook
│   │   ├── useLocale.ts          # Locale management hook
│   │   ├── useCurrency.ts        # Currency hook
│   │   ├── useGeoDetection.ts    # Geo-detection hook
│   │   ├── usePWAInstall.ts      # PWA install prompt hook
│   │   ├── useAffiliateClick.ts  # Affiliate tracking hook
│   │   └── use-toast-notification.tsx # Toast notification component
│   └── i18n/
│       ├── config.ts             # i18n configuration
│       └── messages/             # Translation message files
│           ├── en.json           # English (base)
│           ├── hi.json           # Hindi
│           ├── ar.json           # Arabic
│           ├── fr.json           # French
│           ├── de.json           # German
│           ├── es.json           # Spanish
│           ├── zh.json           # Chinese (Simplified)
│           └── ja.json           # Japanese
├── prisma/
│   ├── schema.prisma             # Database schema (35+ models)
│   ├── seed.ts                   # Database seeder
│   └── seed-users.ts             # User seed data
├── mini-services/
│   ├── ai-proxy/                 # AI proxy service (port 3030)
│   │   ├── index.ts              # Proxy server entry
│   │   ├── package.json          # Dependencies
│   │   ├── keep-alive.js         # Keep-alive ping
│   │   └── start.sh              # Start script
│   └── app-web/                  # App web service
│       ├── index.ts              # Service entry
│       └── package.json          # Dependencies
├── db/
│   ├── custom.db                 # SQLite database file
│   └── custom.db.bak             # Database backup
├── public/                       # Static assets
├── Caddyfile                     # Caddy gateway configuration
├── next.config.ts                # Next.js configuration
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
└── vercel.json                   # Vercel deployment config
</pre>`
        }
      ]
    },

    // ─── SECTION 2: Frontend Components ──────────────────────────────
    {
      id: 'frontend-components',
      title: 'Frontend Components',
      content: `<h2>Frontend Component Library</h2>
<p>The 3BOXES frontend consists of <strong>60+ React components</strong> organized into three categories: shadcn/ui primitives (40+), application components (25+), and admin sub-components (3). All components are written in TypeScript with strict typing and use Tailwind CSS for styling.</p>

<h3>Component Architecture Principles</h3>
<ul>
<li><strong>Client-Side Only</strong>: All application components use <code>'use client'</code> directive since the app is a SPA</li>
<li><strong>Zustand Integration</strong>: Components read from and write to the Zustand store for navigation, auth, cart, and preferences</li>
<li><strong>Responsive Design</strong>: All components are mobile-first with Tailwind responsive prefixes</li>
<li><strong>Accessibility</strong>: ARIA labels, keyboard navigation, screen reader support</li>
<li><strong>Dark/Light Theme</strong>: Full theme support via CSS variables and <code>next-themes</code></li>
<li><strong>Internationalization</strong>: All user-facing text uses the i18n system</li>
</ul>`,
      subsections: [
        {
          id: 'ui-components-shadcn',
          title: 'shadcn/ui Component Library (40+ Components)',
          content: `<h3>shadcn/ui Components</h3>
<p>The project uses the <strong>shadcn/ui</strong> component library in the New York style variant. All components are in <code>src/components/ui/</code> and are built on top of <strong>Radix UI</strong> primitives for accessibility. They are fully customizable and use Tailwind CSS for styling.</p>

<table>
<tr><th>Component</th><th>File</th><th>Primary Usage</th></tr>
<tr><td>Accordion</td><td>accordion.tsx</td><td>FAQ page, product details</td></tr>
<tr><td>Alert</td><td>alert.tsx</td><td>Notification banners, error messages</td></tr>
<tr><td>AlertDialog</td><td>alert-dialog.tsx</td><td>Confirmation dialogs (delete, cancel order)</td></tr>
<tr><td>AspectRatio</td><td>aspect-ratio.tsx</td><td>Product image containers</td></tr>
<tr><td>Avatar</td><td>avatar.tsx</td><td>User profile avatars, review avatars</td></tr>
<tr><td>Badge</td><td>badge.tsx</td><td>Product tags, order status, category labels</td></tr>
<tr><td>Breadcrumb</td><td>breadcrumb.tsx</td><td>Navigation breadcrumbs</td></tr>
<tr><td>Button</td><td>button.tsx</td><td>Primary action component (7 variants)</td></tr>
<tr><td>Calendar</td><td>calendar.tsx</td><td>Date pickers for delivery scheduling</td></tr>
<tr><td>Card</td><td>card.tsx</td><td>Product cards, dashboard cards, info panels</td></tr>
<tr><td>Carousel</td><td>carousel.tsx</td><td>Product image galleries, hero banners</td></tr>
<tr><td>Checkbox</td><td>checkbox.tsx</td><td>Gift wrapping, preferences, filters</td></tr>
<tr><td>Collapsible</td><td>collapsible.tsx</td><td>Expandable sections in product details</td></tr>
<tr><td>Command</td><td>command.tsx</td><td>Search command palette (Cmd+K)</td></tr>
<tr><td>ContextMenu</td><td>context-menu.tsx</td><td>Right-click actions on products</td></tr>
<tr><td>Dialog</td><td>dialog.tsx</td><td>Auth dialog, try-on dialog, quick view</td></tr>
<tr><td>Drawer</td><td>drawer.tsx</td><td>Mobile cart drawer, filter panel</td></tr>
<tr><td>DropdownMenu</td><td>dropdown-menu.tsx</td><td>User menu, language/currency switcher</td></tr>
<tr><td>Form</td><td>form.tsx</td><td>Checkout form, profile settings, registration</td></tr>
<tr><td>HoverCard</td><td>hover-card.tsx</td><td>Product preview on hover</td></tr>
<tr><td>Input</td><td>input.tsx</td><td>Search, form fields, quantity inputs</td></tr>
<tr><td>InputOTP</td><td>input-otp.tsx</td><td>OTP verification input</td></tr>
<tr><td>Label</td><td>label.tsx</td><td>Form labels, section labels</td></tr>
<tr><td>Menubar</td><td>menubar.tsx</td><td>Admin dashboard menu</td></tr>
<tr><td>NavigationMenu</td><td>navigation-menu.tsx</td><td>Category navigation in header</td></tr>
<tr><td>Pagination</td><td>pagination.tsx</td><td>Product listing pagination</td></tr>
<tr><td>Popover</td><td>popover.tsx</td><td>Calendar picker, color picker, tooltips</td></tr>
<tr><td>Progress</td><td>progress.tsx</td><td>Try-on progress bar, upload progress</td></tr>
<tr><td>RadioGroup</td><td>radio-group.tsx</td><td>Delivery type, payment method selection</td></tr>
<tr><td>Resizable</td><td>resizable.tsx</td><td>Admin dashboard panel resizing</td></tr>
<tr><td>ScrollArea</td><td>scroll-area.tsx</td><td>Custom scrollable areas, chat messages</td></tr>
<tr><td>Select</td><td>select.tsx</td><td>Category filters, sort options, variant selection</td></tr>
<tr><td>Separator</td><td>separator.tsx</td><td>Visual dividers in menus and cards</td></tr>
<tr><td>Sheet</td><td>sheet.tsx</td><td>Mobile navigation, cart sidebar</td></tr>
<tr><td>Skeleton</td><td>skeleton.tsx</td><td>Loading placeholders for product cards</td></tr>
<tr><td>Slider</td><td>slider.tsx</td><td>Price range filter, rating filter</td></tr>
<tr><td>Sonner</td><td>sonner.tsx</td><td>Toast notification system</td></tr>
<tr><td>Switch</td><td>switch.tsx</td><td>Theme toggle, notification preferences</td></tr>
<tr><td>Table</td><td>table.tsx</td><td>Admin data tables (orders, products, users)</td></tr>
<tr><td>Tabs</td><td>tabs.tsx</td><td>Product detail tabs, admin dashboard tabs</td></tr>
<tr><td>Textarea</td><td>textarea.tsx</td><td>Review comments, support messages</td></tr>
<tr><td>Toast</td><td>toast.tsx</td><td>In-app notifications</td></tr>
<tr><td>Toaster</td><td>toaster.tsx</td><td>Toast container component</td></tr>
<tr><td>Toggle</td><td>toggle.tsx</td><td>Filter toggles, view mode switches</td></tr>
<tr><td>ToggleGroup</td><td>toggle-group.tsx</td><td>Size/color variant selectors</td></tr>
<tr><td>Tooltip</td><td>tooltip.tsx</td><td>Icon button tooltips, feature hints</td></tr>
<tr><td>Chart</td><td>chart.tsx</td><td>Admin dashboard charts (recharts wrapper)</td></tr>
<tr><td>Sidebar</td><td>sidebar.tsx</td><td>Admin dashboard sidebar navigation</td></tr>
</table>`
        },
        {
          id: 'application-components',
          title: 'Application Components (25+ Components)',
          content: `<h3>Application Components</h3>
<p>These are the main application components that implement the business logic and views of the 3BOXES platform. Each component is a <code>'use client'</code> component that reads from and writes to the Zustand store.</p>

<table>
<tr><th>Component</th><th>File</th><th>Description</th><th>Key Props / Store Dependencies</th></tr>
<tr><td>Header</td><td>header.tsx</td><td>Main navigation with search, cart, auth, language/currency switchers</td><td>Store: view, authUser, cartItems, locale, currency</td></tr>
<tr><td>Footer</td><td>footer.tsx</td><td>Site footer with links, social media, app download</td><td>Store: view (for navigation)</td></tr>
<tr><td>HeroSection</td><td>hero-section.tsx</td><td>Landing page hero with carousel, category highlights</td><td>Store: setCategory, setView</td></tr>
<tr><td>CategoryGrid</td><td>category-grid.tsx</td><td>Category browsing with images and product counts</td><td>Store: setCategory</td></tr>
<tr><td>ProductGrid</td><td>product-grid.tsx</td><td>Product listing with filters, sort, pagination</td><td>Store: searchQuery, selectedCategory, giftFilter</td></tr>
<tr><td>ProductCard</td><td>product-card.tsx</td><td>Individual product card with image, price, rating, actions</td><td>Props: product data; Store: addItem, selectProduct</td></tr>
<tr><td>ProductDetail</td><td>product-detail.tsx</td><td>Full product view with images, variants, reviews, try-on</td><td>Store: selectedProductId, addItem, setView</td></tr>
<tr><td>QuickViewDialog</td><td>quick-view-dialog.tsx</td><td>Quick product preview modal</td><td>Props: productId; Store: selectProduct</td></tr>
<tr><td>TryOnDialog</td><td>try-on-dialog.tsx</td><td>AI virtual try-on modal with selfie upload and progress</td><td>Store: selectedProductId; API: /api/try-on</td></tr>
<tr><td>CartView</td><td>cart-view.tsx</td><td>Shopping cart with quantities, coupons, checkout CTA</td><td>Store: cartItems, updateQuantity, removeItem</td></tr>
<tr><td>CheckoutView</td><td>checkout-view.tsx</td><td>Multi-step checkout: address, delivery, payment</td><td>Store: cartItems, authUser; API: /api/checkout</td></tr>
<tr><td>WishlistView</td><td>wishlist-view.tsx</td><td>Saved products with move-to-cart functionality</td><td>Store: authUser; API: /api/wishlist</td></tr>
<tr><td>AuthDialog</td><td>auth-dialog.tsx</td><td>Login/Register with 2FA, social login, OTP</td><td>Store: authView, authTwoFAStep, setAuth, clearAuth</td></tr>
<tr><td>AdminDashboard</td><td>admin-dashboard.tsx</td><td>Admin panel with tabs: products, orders, users, corporate</td><td>Store: authUser (role=admin); API: /api/admin/*</td></tr>
<tr><td>AgentDashboard</td><td>agent-dashboard.tsx</td><td>Customer support agent interface</td><td>Store: authUser (role=agent); API: /api/support/*</td></tr>
<tr><td>TeamDashboard</td><td>team-dashboard.tsx</td><td>Team member inventory/order management</td><td>Store: authUser (role=team); API: /api/inventory/*</td></tr>
<tr><td>CorporateDashboard</td><td>corporate-dashboard.tsx</td><td>Corporate gifting portal with campaigns</td><td>Store: authUser (role=corporate); API: /api/corporate/*</td></tr>
<tr><td>UserDashboard</td><td>user-dashboard.tsx</td><td>User profile, orders, wishlist, reviews</td><td>Store: authUser; API: /api/dashboard, /api/orders</td></tr>
<tr><td>GiftBuilder</td><td>gift-builder.tsx</td><td>Custom gift assembly with AI suggestions</td><td>Store: smartBundleItems; API: /api/gift-recommend</td></tr>
<tr><td>GiftAssistant</td><td>gift-assistant.tsx</td><td>AI-powered gift recommendation chatbot</td><td>API: /api/ai-assistant</td></tr>
<tr><td>AIAssistant</td><td>ai-assistant.tsx</td><td>General AI shopping assistant</td><td>API: /api/ai-assistant</td></tr>
<tr><td>OrderTracking</td><td>order-tracking.tsx</td><td>Real-time order tracking with timeline</td><td>API: /api/orders/[id]/tracking</td></tr>
<tr><td>OrderHistory</td><td>order-history.tsx</td><td>Past orders with details and re-order</td><td>Store: authUser; API: /api/orders</td></tr>
<tr><td>ReviewsSection</td><td>reviews-section.tsx</td><td>Product reviews with ratings and submission</td><td>API: /api/reviews</td></tr>
<tr><td>WikiSection</td><td>wiki-section.tsx</td><td>Documentation and training content</td><td>API: /api/wiki</td></tr>
<tr><td>CurrencySwitcher</td><td>currency-switcher.tsx</td><td>Currency selection dropdown with flags</td><td>Store: currency, setCurrency, currencyRates</td></tr>
<tr><td>LanguageSwitcher</td><td>language-switcher.tsx</td><td>Language selection with native names</td><td>Store: locale, setLocale</td></tr>
<tr><td>FormattedPrice</td><td>formatted-price.tsx</td><td>Price display with currency conversion</td><td>Props: amount; Store: currency, currencyRates</td></tr>
<tr><td>GiftFilterBar</td><td>gift-filter-bar.tsx</td><td>Occasion/recipient/relationship filter bar</td><td>Store: giftFilter, setGiftFilter</td></tr>
<tr><td>SmartBundle</td><td>smart-bundle.tsx</td><td>AI-suggested product bundles</td><td>Store: smartBundleItems; API: /api/combo-suggestions</td></tr>
<tr><td>FamilyShopping</td><td>family-shopping.tsx</td><td>Family package browsing and selection</td><td>API: /api/family-shopping</td></tr>
<tr><td>SocialStyleIntegration</td><td>social-style-integration.tsx</td><td>Social media style analysis</td><td>API: /api/social/analyze</td></tr>
<tr><td>AppDownloadSection</td><td>app-download-section.tsx</td><td>Mobile app download banners</td><td>Store: usePWAInstall hook</td></tr>
<tr><td>SupportView</td><td>support-view.tsx</td><td>Support ticket submission and tracking</td><td>API: /api/support/tickets</td></tr>
</table>`
        },
        {
          id: 'admin-sub-components',
          title: 'Admin Sub-Components',
          content: `<h3>Admin Dashboard Sub-Components</h3>
<p>The Admin Dashboard (<code>admin-dashboard.tsx</code>) uses tab-based navigation with dedicated sub-components for complex sections:</p>

<table>
<tr><th>Component</th><th>File</th><th>Description</th></tr>
<tr><td>ShopifyTab</td><td>admin/shopify-tab.tsx</td><td>Shopify integration management: sync status, product import, webhook configuration</td></tr>
<tr><td>PartnersTab</td><td>admin/partners-tab.tsx</td><td>Platform partner management: Myntra, Nykaa, Amazon integration with category mapping</td></tr>
<tr><td>TrainingTab</td><td>admin/training-tab.tsx</td><td>Training document management: wiki docs, video links, onboarding materials</td></tr>
</table>

<h4>ShopifyTab Component</h4>
<p>Provides a comprehensive interface for managing Shopify integration:</p>
<ul>
<li>Display current sync status and last sync timestamp</li>
<li>Trigger manual product sync from Shopify</li>
<li>Configure webhook endpoints for order/product events</li>
<li>Map Shopify collections to local categories</li>
<li>View sync logs and error details</li>
<li>Manage Shopify Admin API token</li>
</ul>

<h4>PartnersTab Component</h4>
<p>Manages external platform integrations:</p>
<ul>
<li>Add/edit/remove platform integrations (Myntra, Nykaa, etc.)</li>
<li>Configure category mapping between partner and local categories</li>
<li>Set sync intervals and product limits</li>
<li>View sync history and error logs</li>
<li>Manage affiliate tags and commission rates</li>
</ul>

<h4>TrainingTab Component</h4>
<p>Manages internal training and documentation:</p>
<ul>
<li>Create and edit wiki documents</li>
<li>Share documents with agents</li>
<li>Embed training video links</li>
<li>Organize documents by category</li>
<li>Track document sharing and access</li>
</ul>`
        }
      ]
    },

    // ─── SECTION 3: Backend API Routes ───────────────────────────────
    {
      id: 'backend-api-routes',
      title: 'Backend API Routes',
      content: `<h2>Backend API Routes (120+ Endpoints)</h2>
<p>All backend API routes are implemented using Next.js 16 App Router route handlers in <code>src/app/api/</code>. Each route exports HTTP method functions (<code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>PATCH</code>, <code>DELETE</code>) that receive a <code>Request</code> object and return a <code>Response</code>.</p>

<h3>API Architecture</h3>
<ul>
<li><strong>Authentication</strong>: Most endpoints require a valid JWT token in the <code>Authorization: Bearer &lt;token&gt;</code> header</li>
<li><strong>Authorization</strong>: Role-based access control checks user role and permissions</li>
<li><strong>Validation</strong>: Input validation using Zod schemas where applicable</li>
<li><strong>Error Handling</strong>: Consistent error response format: <code>{ error: string, details?: string }</code></li>
<li><strong>Rate Limiting</strong>: Applied per-endpoint via <code>src/lib/rate-limiter.ts</code></li>
<li><strong>Logging</strong>: All API calls logged via <code>src/lib/api-logger.ts</code></li>
<li><strong>CORS</strong>: Handled by Caddy gateway configuration</li>
</ul>`,
      subsections: [
        {
          id: 'auth-api',
          title: 'Authentication API (14 Endpoints)',
          content: `<h3>Authentication Endpoints</h3>
<p>Located in <code>src/app/api/auth/</code>, these endpoints handle user authentication, registration, 2FA, OTP, social login, and session management.</p>

<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>POST</td><td>/api/auth/register</td><td>Register new user with email, name, password</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/login</td><td>Login with email + password, returns JWT</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/logout</td><td>Invalidate session and clear token</td><td>Yes</td></tr>
<tr><td>GET</td><td>/api/auth/me</td><td>Get current user profile</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/auth/refresh</td><td>Refresh JWT token</td><td>Yes</td></tr>
<tr><td>GET</td><td>/api/auth/session</td><td>Get current session details</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/auth/2fa/setup</td><td>Setup TOTP-based 2FA, returns QR code</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/auth/2fa/verify</td><td>Verify TOTP code during login</td><td>Partial</td></tr>
<tr><td>POST</td><td>/api/auth/2fa/email-otp</td><td>Send OTP to email for 2FA verification</td><td>Partial</td></tr>
<tr><td>POST</td><td>/api/auth/otp/send</td><td>Send OTP to phone number</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/otp/verify</td><td>Verify phone OTP</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/otp-login</td><td>Login with phone + OTP (no password)</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/social</td><td>Social login (Google, Facebook, LinkedIn)</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/forgot-password</td><td>Send password reset email/OTP</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/reset-password</td><td>Reset password with token</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/verify-email</td><td>Verify email address with token</td><td>No</td></tr>
<tr><td>POST</td><td>/api/auth/verify-phone</td><td>Verify phone number with code</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/auth/approve</td><td>Admin approves/rejects user registration</td><td>Admin</td></tr>
<tr><td>GET</td><td>/api/auth/users</td><td>Get users list (for admin/agent lookup)</td><td>Admin/Agent</td></tr>
</table>

<h4>Authentication Flow</h4>
<pre>
1. Register → POST /api/auth/register
   ├── User creates account (email, name, password)
   ├── approvalStatus set to "pending"
   └── Email verification token sent

2. Login → POST /api/auth/login
   ├── Validate email + password
   ├── Check if 2FA enabled → return { requires2FA: true, userId, method }
   │   ├── TOTP: POST /api/auth/2fa/verify { code }
   │   └── Email OTP: POST /api/auth/2fa/email-otp → verify
   ├── Generate JWT token + create Session
   ├── Update lastLoginAt, lastLoginIp, lastLoginDevice
   ├── Create AuditLog entry
   └── Return { user, token }

3. Social Login → POST /api/auth/social
   ├── Validate social provider token
   ├── Find or create user
   └── Return { user, token }

4. OTP Login → POST /api/auth/otp-login
   ├── Send OTP to phone
   ├── Verify OTP
   └── Return { user, token }
</pre>`
        },
        {
          id: 'products-api',
          title: 'Products API (3 Endpoints)',
          content: `<h3>Products Endpoints</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET</td><td>/api/products</td><td>List products with filters, search, pagination, sorting</td><td>No</td></tr>
<tr><td>GET</td><td>/api/products/[id]</td><td>Get single product with variants, images, reviews</td><td>No</td></tr>
<tr><td>POST</td><td>/api/products/fix-images</td><td>Fix broken product images (admin utility)</td><td>Admin</td></tr>
</table>

<h4>GET /api/products Query Parameters</h4>
<table>
<tr><th>Parameter</th><th>Type</th><th>Description</th></tr>
<tr><td>search</td><td>string</td><td>Full-text search on name, description, tags</td></tr>
<tr><td>category</td><td>string</td><td>Filter by category slug</td></tr>
<tr><td>occasion</td><td>string</td><td>Filter by occasion (birthday, anniversary, diwali...)</td></tr>
<tr><td>recipient</td><td>string</td><td>Filter by recipient type (him, her, couple, kids...)</td></tr>
<tr><td>relationship</td><td>string</td><td>Filter by relationship (spouse, parent, friend...)</td></tr>
<tr><td>minPrice</td><td>number</td><td>Minimum price filter</td></tr>
<tr><td>maxPrice</td><td>number</td><td>Maximum price filter</td></tr>
<tr><td>featured</td><td>boolean</td><td>Only featured products</td></tr>
<tr><td>sort</td><td>string</td><td>Sort: price_asc, price_desc, rating, newest, popular</td></tr>
<tr><td>page</td><td>number</td><td>Page number (default: 1)</td></tr>
<tr><td>limit</td><td>number</td><td>Items per page (default: 20, max: 100)</td></tr>
</table>`
        },
        {
          id: 'orders-cart-checkout-api',
          title: 'Orders, Cart, and Checkout API',
          content: `<h3>Orders API (5 Endpoints)</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET</td><td>/api/orders</td><td>List user's orders with pagination</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/orders</td><td>Create new order</td><td>Yes</td></tr>
<tr><td>GET</td><td>/api/orders/[id]</td><td>Get order details with items and tracking</td><td>Yes (owner/admin)</td></tr>
<tr><td>GET</td><td>/api/orders/[id]/tracking</td><td>Get order tracking events timeline</td><td>Yes (owner/admin)</td></tr>
<tr><td>POST</td><td>/api/orders/[id]/refund</td><td>Request order refund</td><td>Yes (owner/admin)</td></tr>
<tr><td>GET</td><td>/api/orders/[id]/invoice</td><td>Get/generate order invoice PDF</td><td>Yes (owner/admin)</td></tr>
</table>

<h3>Cart API (1 Endpoint)</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET/POST/PUT/DELETE</td><td>/api/cart</td><td>Cart CRUD operations</td><td>Optional (guest cart)</td></tr>
</table>

<h3>Checkout API (2 Endpoints)</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>POST</td><td>/api/checkout</td><td>Create checkout session (Razorpay/Stripe)</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/checkout/estimate</td><td>Estimate shipping and tax before checkout</td><td>No</td></tr>
</table>

<h3>Payments API (2 Endpoints)</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>POST</td><td>/api/payments/create-session</td><td>Create Razorpay/Stripe payment session</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/payments/verify</td><td>Verify payment after completion</td><td>Yes</td></tr>
</table>

<h3>Payment Methods API (1 Endpoint)</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET</td><td>/api/payment-methods</td><td>List available payment methods for user's region</td><td>Yes</td></tr>
</table>`
        },
        {
          id: 'ai-tryon-api',
          title: 'AI Try-On API (3 Endpoints)',
          content: `<h3>AI Try-On Endpoints</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>POST</td><td>/api/try-on</td><td>Start AI virtual try-on job</td><td>Yes</td></tr>
<tr><td>GET</td><td>/api/try-on/status</td><td>Check try-on job status / AI availability</td><td>No</td></tr>
<tr><td>POST</td><td>/api/try-on/analyze-selfie</td><td>Analyze selfie for quality/face detection</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/try-on/remote</td><td>Remote try-on via ZAI proxy</td><td>Yes</td></tr>
</table>

<h4>POST /api/try-on Request Body</h4>
<pre><code>{
  "productId": "clx...",
  "selfieData": "data:image/jpeg;base64,/9j/4AAQ...",
  "categorySlug": "jewelry"
}
</code></pre>

<h4>POST /api/try-on Response</h4>
<pre><code>{
  "jobId": "tryon_1709551234_abc123",
  "status": "processing",
  "message": "AI style preview started"
}
</code></pre>

<h4>GET /api/try-on/status?jobId=... Response</h4>
<pre><code>{
  "status": "completed",
  "imageUrl": "data:image/png;base64,...",
  "productName": "Diamond Temple Necklace",
  "categorySlug": "jewelry",
  "suggestions": [...],
  "pipelinePhase": "complete",
  "colorAccuracy": 8,
  "faceAccuracy": 9,
  "strategy": "dual-image-zai",
  "totalPasses": 2
}
</code></pre>`
        },
        {
          id: 'admin-api',
          title: 'Admin API (16 Endpoints)',
          content: `<h3>Admin Endpoints</h3>
<p>All admin endpoints require admin role authentication. Located in <code>src/app/api/admin/</code>.</p>

<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET</td><td>/api/admin/dashboard</td><td>Dashboard statistics (revenue, orders, users, products)</td></tr>
<tr><td>GET</td><td>/api/admin/stats</td><td>Detailed platform statistics with time ranges</td></tr>
<tr><td>GET/POST</td><td>/api/admin/products</td><td>List/Create products</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/admin/products/[id]</td><td>Get/Update/Delete product</td></tr>
<tr><td>GET/POST</td><td>/api/admin/orders</td><td>List/Update orders</td></tr>
<tr><td>GET/POST</td><td>/api/admin/users</td><td>List/Update users</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/admin/users/[id]</td><td>Get/Update/Delete user</td></tr>
<tr><td>GET/POST</td><td>/api/admin/corporate</td><td>List/Manage corporate accounts</td></tr>
<tr><td>GET/PUT</td><td>/api/admin/corporate/[id]</td><td>Get/Update corporate account</td></tr>
<tr><td>PUT</td><td>/api/admin/corporate/[id]/status</td><td>Approve/reject/suspend corporate account</td></tr>
<tr><td>GET/POST</td><td>/api/admin/campaigns</td><td>List/Create corporate campaigns</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/admin/campaigns/[id]</td><td>Get/Update/Delete campaign</td></tr>
<tr><td>GET/POST</td><td>/api/admin/coupons</td><td>List/Create coupons</td></tr>
<tr><td>GET/POST</td><td>/api/admin/categories</td><td>List/Create categories</td></tr>
<tr><td>GET</td><td>/api/admin/audit-logs</td><td>View audit trail</td></tr>
<tr><td>GET/POST</td><td>/api/admin/permissions</td><td>View/Manage user permissions</td></tr>
<tr><td>GET</td><td>/api/admin/role-permissions</td><td>Get role-based permission matrix</td></tr>
<tr><td>GET</td><td>/api/admin/sessions</td><td>View active user sessions</td></tr>
<tr><td>GET/POST</td><td>/api/admin/smtp</td><td>Get/Configure SMTP settings</td></tr>
<tr><td>GET</td><td>/api/admin/reports</td><td>Generate business reports</td></tr>
<tr><td>POST</td><td>/api/admin/share-doc</td><td>Share document with agent</td></tr>
<tr><td>GET</td><td>/api/admin/api-logs</td><td>View API call logs</td></tr>
</table>`
        },
        {
          id: 'corporate-api',
          title: 'Corporate API (12 Endpoints)',
          content: `<h3>Corporate Gifting Portal Endpoints</h3>
<p>Located in <code>src/app/api/corporate/</code>. Corporate users can manage their accounts, branding, campaigns, and recipients.</p>

<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>POST</td><td>/api/corporate/register</td><td>Register corporate account</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/corporate/login</td><td>Corporate login</td><td>No</td></tr>
<tr><td>GET</td><td>/api/corporate/profile</td><td>Get corporate profile</td><td>Yes (corporate)</td></tr>
<tr><td>GET/POST</td><td>/api/corporate/branding</td><td>Get/Update corporate branding</td><td>Yes (corporate)</td></tr>
<tr><td>GET/POST</td><td>/api/corporate/members</td><td>List/Add corporate members</td><td>Yes (corp_admin)</td></tr>
<tr><td>PUT/DELETE</td><td>/api/corporate/members/[memberId]</td><td>Update/Remove member</td><td>Yes (corp_admin)</td></tr>
<tr><td>GET/POST</td><td>/api/corporate/campaigns</td><td>List/Create campaigns</td><td>Yes (corporate)</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/corporate/campaigns/[id]</td><td>Get/Update/Delete campaign</td><td>Yes (corporate)</td></tr>
<tr><td>POST</td><td>/api/corporate/campaigns/[id]/submit</td><td>Submit campaign for approval</td><td>Yes (corporate)</td></tr>
<tr><td>GET/POST</td><td>/api/corporate/campaigns/[id]/recipients</td><td>List/Add campaign recipients</td><td>Yes (corporate)</td></tr>
<tr><td>PUT/DELETE</td><td>/api/corporate/campaigns/[id]/recipients/[recipientId]</td><td>Update/Remove recipient</td><td>Yes (corporate)</td></tr>
<tr><td>POST</td><td>/api/corporate/recipients/import-csv</td><td>Import recipients from CSV</td><td>Yes (corporate)</td></tr>
</table>`
        },
        {
          id: 'shopify-api',
          title: 'Shopify Integration API (9 Endpoints)',
          content: `<h3>Shopify Integration Endpoints</h3>
<p>Located in <code>src/app/api/shopify/</code>. These endpoints handle Shopify product sync, checkout integration, webhook processing, and status monitoring.</p>

<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET</td><td>/api/shopify/products</td><td>Fetch products from Shopify Storefront API</td><td>No</td></tr>
<tr><td>GET</td><td>/api/shopify/products/[handle]</td><td>Get single Shopify product by handle</td><td>No</td></tr>
<tr><td>GET</td><td>/api/shopify/collections</td><td>Fetch collections from Shopify</td><td>No</td></tr>
<tr><td>GET</td><td>/api/shopify/cart</td><td>Get/create Shopify cart</td><td>No</td></tr>
<tr><td>POST</td><td>/api/shopify/checkout</td><td>Create Shopify checkout</td><td>No</td></tr>
<tr><td>POST</td><td>/api/shopify/checkout/verify</td><td>Verify Shopify checkout completion</td><td>No</td></tr>
<tr><td>POST</td><td>/api/shopify/checkout/complete</td><td>Complete checkout and create local order</td><td>Yes</td></tr>
<tr><td>POST</td><td>/api/shopify/sync</td><td>Sync products from Shopify to local DB</td><td>Admin</td></tr>
<tr><td>GET</td><td>/api/shopify/status</td><td>Get Shopify integration status</td><td>Admin</td></tr>
<tr><td>POST</td><td>/api/shopify/admin-token</td><td>Set/update Shopify Admin API token</td><td>Admin</td></tr>
<tr><td>POST</td><td>/api/shopify/webhooks</td><td>Receive Shopify webhook events</td><td>Shopify (HMAC verified)</td></tr>
<tr><td>POST</td><td>/api/shopify/webhooks/register</td><td>Register webhook endpoints with Shopify</td><td>Admin</td></tr>
</table>`
        },
        {
          id: 'other-api-endpoints',
          title: 'Other API Endpoints',
          content: `<h3>Support & Communication</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET/POST</td><td>/api/support/tickets</td><td>List/Create support tickets</td></tr>
<tr><td>GET/PUT</td><td>/api/support/tickets/[id]</td><td>Get/Update ticket</td></tr>
<tr><td>GET/POST</td><td>/api/support/tickets/[id]/messages</td><td>List/Send ticket messages</td></tr>
<tr><td>GET/POST</td><td>/api/support-tickets</td><td>Alternative ticket endpoints</td></tr>
<tr><td>POST</td><td>/api/ai-assistant</td><td>AI shopping assistant chat</td></tr>
</table>

<h3>Wishlist, Reviews & Portfolio</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET/POST/DELETE</td><td>/api/wishlist</td><td>Wishlist CRUD</td></tr>
<tr><td>GET/POST</td><td>/api/reviews</td><td>List/Create product reviews</td></tr>
<tr><td>GET/POST</td><td>/api/portfolio</td><td>Customer portfolio (AI style previews)</td></tr>
<tr><td>GET/POST</td><td>/api/style-gallery</td><td>Style gallery entries</td></tr>
</table>

<h3>Search, Categories & Discovery</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET</td><td>/api/search</td><td>Full-text product search</td></tr>
<tr><td>GET</td><td>/api/categories</td><td>List categories with product counts</td></tr>
<tr><td>GET</td><td>/api/threebox-curate</td><td>Curated collection data</td></tr>
<tr><td>GET</td><td>/api/combo-suggestions</td><td>Product combo suggestions</td></tr>
<tr><td>POST</td><td>/api/gift-recommend</td><td>AI-powered gift recommendations</td></tr>
</table>

<h3>Currency, Geo & Internationalization</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET</td><td>/api/currency/rates</td><td>Get exchange rates</td></tr>
<tr><td>GET</td><td>/api/exchange-rates</td><td>Alternative exchange rate endpoint</td></tr>
<tr><td>GET</td><td>/api/geo</td><td>Detect user's country from IP</td></tr>
</table>

<h3>Inventory, Vendors & Partners</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET/POST</td><td>/api/inventory</td><td>List/Update inventory</td></tr>
<tr><td>GET/PUT</td><td>/api/inventory/[productId]</td><td>Get/Update product inventory</td></tr>
<tr><td>GET/POST</td><td>/api/vendors</td><td>List/Create vendors</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/vendors/[id]</td><td>Get/Update/Delete vendor</td></tr>
<tr><td>GET/POST</td><td>/api/partners</td><td>List/Create platform partners</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/partners/[id]</td><td>Get/Update/Delete partner</td></tr>
<tr><td>POST</td><td>/api/partners/[id]/sync</td><td>Trigger partner product sync</td></tr>
<tr><td>GET/POST</td><td>/api/partners/[id]/category-maps</td><td>Partner category mapping</td></tr>
</table>

<h3>Integrations, Invoices & Accounting</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET/POST</td><td>/api/integrations</td><td>List/Create platform integrations</td></tr>
<tr><td>GET/PUT/DELETE</td><td>/api/integrations/[id]</td><td>Get/Update/Delete integration</td></tr>
<tr><td>POST</td><td>/api/integrations/sync</td><td>Trigger integration sync</td></tr>
<tr><td>POST</td><td>/api/integrations/discover</td><td>Discover available integrations</td></tr>
<tr><td>GET/POST</td><td>/api/invoices</td><td>List/Create invoices</td></tr>
<tr><td>GET</td><td>/api/invoices/[id]</td><td>Get invoice with PDF</td></tr>
<tr><td>GET/POST</td><td>/api/accounting</td><td>Accounting entries</td></tr>
</table>

<h3>Other Utilities</h3>
<table>
<tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>
<tr><td>GET</td><td>/api/image-proxy</td><td>Proxy and optimize external images</td></tr>
<tr><td>POST</td><td>/api/moderate-image</td><td>AI content moderation for images</td></tr>
<tr><td>GET</td><td>/api/config</td><td>Get public app configuration</td></tr>
<tr><td>GET/POST</td><td>/api/wiki</td><td>Wiki document CRUD</td></tr>
<tr><td>GET/PUT</td><td>/api/wiki/[id]</td><td>Get/Update wiki document</td></tr>
<tr><td>POST</td><td>/api/wiki/[id]/share</td><td>Share wiki document</td></tr>
<tr><td>GET</td><td>/api/dashboard</td><td>User dashboard data</td></tr>
<tr><td>GET</td><td>/api/affiliate/stats</td><td>Affiliate click statistics</td></tr>
<tr><td>POST</td><td>/api/affiliate/click</td><td>Record affiliate click</td></tr>
<tr><td>GET/POST</td><td>/api/coupons/validate</td><td>Validate coupon code</td></tr>
<tr><td>GET/POST</td><td>/api/offers</td><td>List/Create offers</td></tr>
<tr><td>POST</td><td>/api/offers/validate</td><td>Validate offer eligibility</td></tr>
<tr><td>GET</td><td>/api/family-shopping</td><td>Family shopping packages</td></tr>
<tr><td>GET</td><td>/api/family/packages</td><td>Family package details</td></tr>
<tr><td>POST</td><td>/api/smartbundle/create</td><td>Create smart product bundle</td></tr>
<tr><td>POST</td><td>/api/social/analyze</td><td>Analyze social media style</td></tr>
<tr><td>GET/POST</td><td>/api/social-style</td><td>Social style data</td></tr>
<tr><td>POST</td><td>/api/product-import/search</td><td>Search products for import</td></tr>
<tr><td>POST</td><td>/api/product-import/scrape</td><td>Scrape product data</td></tr>
<tr><td>POST</td><td>/api/product-import/import</td><td>Import product to catalog</td></tr>
</table>`
        }
      ]
    },

    // ─── SECTION 4: Database Schema ──────────────────────────────────
    {
      id: 'database-schema',
      title: 'Database Schema',
      content: `<h2>Database Schema (35+ Prisma Models)</h2>
<p>The database is defined in <code>prisma/schema.prisma</code> using Prisma ORM. The schema supports both SQLite (development) and PostgreSQL (production) via the <code>provider</code> setting. The Prisma Client is accessed through a singleton in <code>src/lib/db.ts</code>.</p>

<h3>Database Access Pattern</h3>
<pre><code>// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
</code></pre>

<h3>Usage in API Routes</h3>
<pre><code>import { db } from '@/lib/db'

// Example: Get product with category
const product = await db.product.findUnique({
  where: { id: productId },
  include: { category: true, variants: true, images: true, reviews: true }
})
</code></pre>`,
      subsections: [
        {
          id: 'core-product-models',
          title: 'Core Product Models',
          content: `<h3>Category Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id @default(cuid())</td><td>Unique identifier</td></tr>
<tr><td>name</td><td>String</td><td>Category display name (e.g. "Jewelry", "Sarees")</td></tr>
<tr><td>slug</td><td>String @unique</td><td>URL-friendly slug (e.g. "jewelry", "sarees")</td></tr>
<tr><td>description</td><td>String?</td><td>Category description</td></tr>
<tr><td>image</td><td>String?</td><td>Category image URL</td></tr>
<tr><td>parentId</td><td>String?</td><td>Parent category ID for hierarchy</td></tr>
<tr><td>order</td><td>Int @default(0)</td><td>Display order</td></tr>
<tr><td>children</td><td>Category[]</td><td>Child categories (self-relation)</td></tr>
<tr><td>products</td><td>Product[]</td><td>Products in this category</td></tr>
</table>

<h3>Product Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id @default(cuid())</td><td>Unique identifier</td></tr>
<tr><td>productNumber</td><td>String @unique</td><td>Business product number</td></tr>
<tr><td>name</td><td>String</td><td>Product display name</td></tr>
<tr><td>slug</td><td>String @unique</td><td>URL-friendly slug</td></tr>
<tr><td>description</td><td>String</td><td>Full product description</td></tr>
<tr><td>price</td><td>Float</td><td>Current selling price (INR)</td></tr>
<tr><td>compareAtPrice</td><td>Float?</td><td>Original price for showing discounts</td></tr>
<tr><td>costPrice</td><td>Float?</td><td>Cost price for margin calculation</td></tr>
<tr><td>sku</td><td>String?</td><td>Stock keeping unit</td></tr>
<tr><td>images</td><td>String</td><td>JSON array of image URLs</td></tr>
<tr><td>categoryId</td><td>String</td><td>Foreign key to Category</td></tr>
<tr><td>stock</td><td>Int @default(0)</td><td>Current stock quantity</td></tr>
<tr><td>stockStatus</td><td>String @default("in_stock")</td><td>Stock status: in_stock, low_stock, out_of_stock, preorder</td></tr>
<tr><td>reorderLevel</td><td>Int @default(5)</td><td>Threshold for low stock alert</td></tr>
<tr><td>rating</td><td>Float @default(0)</td><td>Average rating (1-5)</td></tr>
<tr><td>reviewCount</td><td>Int @default(0)</td><td>Number of reviews</td></tr>
<tr><td>featured</td><td>Boolean @default(false)</td><td>Show in featured section</td></tr>
<tr><td>tags</td><td>String?</td><td>JSON array of tags</td></tr>
<tr><td>occasions</td><td>String?</td><td>JSON array: birthday, anniversary, wedding, diwali, etc.</td></tr>
<tr><td>recipientTypes</td><td>String?</td><td>JSON array: him, her, couple, kids, parents, friend</td></tr>
<tr><td>relationships</td><td>String?</td><td>JSON array: spouse, parent, sibling, friend, colleague</td></tr>
<tr><td>deliveryEstimate</td><td>String?</td><td>e.g. "3-5 business days"</td></tr>
<tr><td>vendorId</td><td>String?</td><td>Foreign key to Vendor</td></tr>
<tr><td>sourceUrl</td><td>String?</td><td>Original product URL on source platform</td></tr>
<tr><td>platform</td><td>String?</td><td>Source platform: myntra, nykaa, amazon, etc.</td></tr>
<tr><td>affiliateUrl</td><td>String?</td><td>Affiliate tracking link</td></tr>
<tr><td>affiliateId</td><td>String?</td><td>Affiliate network ID</td></tr>
<tr><td>commission</td><td>Float?</td><td>Commission percentage</td></tr>
<tr><td>isExternal</td><td>Boolean @default(false)</td><td>True = product lives on another platform</td></tr>
<tr><td>syncStatus</td><td>String @default("active")</td><td>Sync status: active, paused, error, removed</td></tr>
<tr><td>variants</td><td>ProductVariant[]</td><td>Product variants (size, color, etc.)</td></tr>
<tr><td>productImages</td><td>ProductImage[]</td><td>Product images with sorting</td></tr>
<tr><td>reviews</td><td>Review[]</td><td>Product reviews</td></tr>
<tr><td>portfolioItems</td><td>CustomerPortfolio[]</td><td>AI-generated style previews</td></tr>
</table>

<h3>ProductVariant Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id @default(cuid())</td><td>Unique identifier</td></tr>
<tr><td>productId</td><td>String</td><td>Foreign key to Product</td></tr>
<tr><td>name</td><td>String</td><td>Variant display name (e.g. "Red / Large")</td></tr>
<tr><td>sku</td><td>String?</td><td>Variant-specific SKU</td></tr>
<tr><td>price</td><td>Float</td><td>Variant price (overrides product price if > 0)</td></tr>
<tr><td>compareAtPrice</td><td>Float?</td><td>Variant compare-at price</td></tr>
<tr><td>stock</td><td>Int @default(0)</td><td>Variant stock quantity</td></tr>
<tr><td>attributes</td><td>String</td><td>JSON: {"color": "Red", "size": "Large"}</td></tr>
<tr><td>image</td><td>String?</td><td>Variant-specific image URL</td></tr>
<tr><td>isActive</td><td>Boolean @default(true)</td><td>Variant availability</td></tr>
</table>

<h3>ProductImage Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id @default(cuid())</td><td>Unique identifier</td></tr>
<tr><td>productId</td><td>String</td><td>Foreign key to Product</td></tr>
<tr><td>url</td><td>String</td><td>Image URL</td></tr>
<tr><td>alt</td><td>String?</td><td>Alt text for accessibility</td></tr>
<tr><td>sort</td><td>Int @default(0)</td><td>Sort order</td></tr>
<tr><td>isActive</td><td>Boolean @default(true)</td><td>Image visibility</td></tr>
</table>`
        },
        {
          id: 'order-cart-models',
          title: 'Order & Cart Models',
          content: `<h3>Cart Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>sessionId</td><td>String @unique</td><td>Session-based cart identifier</td></tr>
<tr><td>userId</td><td>String?</td><td>Optional link to authenticated user</td></tr>
<tr><td>couponCode</td><td>String?</td><td>Applied coupon code</td></tr>
<tr><td>items</td><td>CartItem[]</td><td>Cart items</td></tr>
</table>

<h3>CartItem Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>cartId</td><td>String</td><td>Foreign key to Cart</td></tr>
<tr><td>productId</td><td>String</td><td>Foreign key to Product</td></tr>
<tr><td>quantity</td><td>Int @default(1)</td><td>Item quantity</td></tr>
<tr><td>variantId</td><td>String?</td><td>Selected product variant</td></tr>
<tr><td>giftWrapping</td><td>Boolean @default(false)</td><td>Gift wrapping requested</td></tr>
<tr><td>greetingMessage</td><td>String?</td><td>Custom greeting message</td></tr>
<tr><td>hidePrice</td><td>Boolean @default(false)</td><td>Hide price on gift receipt</td></tr>
</table>

<h3>Order Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>orderNumber</td><td>String @unique</td><td>Business order number</td></tr>
<tr><td>email</td><td>String</td><td>Customer email</td></tr>
<tr><td>firstName / lastName</td><td>String</td><td>Customer name</td></tr>
<tr><td>address / city / state / zipCode / country</td><td>String</td><td>Shipping address</td></tr>
<tr><td>phone</td><td>String?</td><td>Customer phone</td></tr>
<tr><td>subtotal / shipping / tax / discount / total</td><td>Float</td><td>Order amounts</td></tr>
<tr><td>status</td><td>String</td><td>pending, processing, shipped, delivered, cancelled</td></tr>
<tr><td>paymentMethod</td><td>String</td><td>card, upi, netbanking, wallet</td></tr>
<tr><td>paymentStatus</td><td>String</td><td>pending, paid, failed, refunded</td></tr>
<tr><td>deliveryType</td><td>String</td><td>standard, express, same-day, scheduled</td></tr>
<tr><td>occasion</td><td>String?</td><td>birthday, anniversary, wedding, etc.</td></tr>
<tr><td>giftWrapping</td><td>Boolean</td><td>Gift wrapping enabled</td></tr>
<tr><td>giftWrapStyle</td><td>String?</td><td>classic, premium, luxury</td></tr>
<tr><td>trackingNumber / trackingUrl</td><td>String?</td><td>Shipment tracking</td></tr>
<tr><td>couponCode</td><td>String?</td><td>Applied coupon</td></tr>
<tr><td>cancelReason / refundStatus</td><td>String?</td><td>Cancellation/refund info</td></tr>
<tr><td>items</td><td>OrderItem[]</td><td>Order line items</td></tr>
<tr><td>trackingEvents</td><td>OrderTrackingEvent[]</td><td>Tracking timeline</td></tr>
<tr><td>paymentSessions</td><td>PaymentSession[]</td><td>Payment provider sessions</td></tr>
<tr><td>invoice</td><td>OrderInvoice?</td><td>Generated invoice</td></tr>
</table>

<h3>PaymentSession Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>orderId</td><td>String</td><td>Foreign key to Order</td></tr>
<tr><td>provider</td><td>String</td><td>razorpay or stripe</td></tr>
<tr><td>providerSessionId</td><td>String?</td><td>Provider session/order ID</td></tr>
<tr><td>amount</td><td>Float</td><td>Payment amount</td></tr>
<tr><td>currency</td><td>String @default("INR")</td><td>Payment currency</td></tr>
<tr><td>status</td><td>String</td><td>created, attempted, paid, failed, expired</td></tr>
<tr><td>paymentId</td><td>String?</td><td>Provider payment ID after success</td></tr>
<tr><td>method</td><td>String?</td><td>card, upi, netbanking, wallet</td></tr>
<tr><td>metadata</td><td>String?</td><td>JSON: provider-specific data</td></tr>
</table>`
        },
        {
          id: 'user-auth-models',
          title: 'User & Auth Models',
          content: `<h3>User Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>email</td><td>String @unique</td><td>User email (unique)</td></tr>
<tr><td>name</td><td>String</td><td>Display name</td></tr>
<tr><td>password</td><td>String?</td><td>Hashed password (nullable for social login)</td></tr>
<tr><td>role</td><td>String @default("user")</td><td>admin, user, agent, team, corporate</td></tr>
<tr><td>adminRole</td><td>String?</td><td>super_admin, product_manager, order_manager, etc.</td></tr>
<tr><td>corporateRole</td><td>String?</td><td>corporate_admin, finance_user, campaign_manager</td></tr>
<tr><td>avatar</td><td>String?</td><td>Profile image URL</td></tr>
<tr><td>phone</td><td>String?</td><td>Phone number (AES-256-GCM encrypted)</td></tr>
<tr><td>isActive</td><td>Boolean @default(true)</td><td>Account active status</td></tr>
<tr><td>emailVerified</td><td>Boolean @default(false)</td><td>Email verification status</td></tr>
<tr><td>phoneVerified</td><td>Boolean @default(false)</td><td>Phone verification status</td></tr>
<tr><td>twoFactorSecret</td><td>String?</td><td>TOTP secret for 2FA</td></tr>
<tr><td>twoFactorEnabled</td><td>Boolean @default(false)</td><td>2FA user preference</td></tr>
<tr><td>twoFactorRequired</td><td>Boolean @default(false)</td><td>Admin-enforced 2FA</td></tr>
<tr><td>approvalStatus</td><td>String @default("pending")</td><td>pending, approved, rejected, suspended</td></tr>
<tr><td>socialProvider</td><td>String?</td><td>google, facebook, linkedin</td></tr>
<tr><td>socialId</td><td>String?</td><td>Social provider user ID</td></tr>
<tr><td>resetToken / resetTokenExpiry</td><td>String? / DateTime?</td><td>Password reset token</td></tr>
<tr><td>otpCode / otpExpiry</td><td>String? / DateTime?</td><td>OTP for phone login</td></tr>
<tr><td>lastLoginAt / lastLoginIp / lastLoginDevice</td><td>DateTime? / String? / String?</td><td>Login tracking</td></tr>
<tr><td>preferredLanguage</td><td>String? @default("en")</td><td>ISO 639-1 language code</td></tr>
<tr><td>preferredCurrency</td><td>String? @default("INR")</td><td>ISO 4217 currency code</td></tr>
<tr><td>detectedCountry</td><td>String?</td><td>Auto-detected country code</td></tr>
<tr><td>permissions</td><td>UserPermission[]</td><td>Fine-grained permissions</td></tr>
<tr><td>sessions</td><td>Session[]</td><td>Active sessions</td></tr>
<tr><td>corporateAccount</td><td>CorporateAccount?</td><td>Linked corporate account</td></tr>
<tr><td>auditLogs</td><td>AuditLog[]</td><td>User's audit trail</td></tr>
</table>

<h3>UserPermission Model</h3>
<p>Fine-grained permission system. Each permission is a string like <code>"products.manage"</code>, <code>"orders.manage"</code>, <code>"accounting.view"</code>. Unique constraint on (userId, permission) prevents duplicates.</p>

<h3>Session Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>token</td><td>String @unique</td><td>JWT session token</td></tr>
<tr><td>userId</td><td>String</td><td>Foreign key to User</td></tr>
<tr><td>ipAddress</td><td>String?</td><td>Login IP address</td></tr>
<tr><td>userAgent</td><td>String?</td><td>Browser user agent</td></tr>
<tr><td>deviceInfo</td><td>String?</td><td>Parsed device information</td></tr>
<tr><td>expiresAt</td><td>DateTime</td><td>Session expiration time</td></tr>
<tr><td>lastActivity</td><td>DateTime @default(now())</td><td>Last activity timestamp</td></tr>
</table>

<h3>AuditLog Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>userId</td><td>String?</td><td>Foreign key to User (nullable if system action)</td></tr>
<tr><td>action</td><td>String</td><td>login, logout, password_change, role_change, etc.</td></tr>
<tr><td>entity</td><td>String?</td><td>user, order, product, corporate, campaign</td></tr>
<tr><td>entityId</td><td>String?</td><td>ID of affected entity</td></tr>
<tr><td>details</td><td>String?</td><td>JSON: additional details</td></tr>
<tr><td>ipAddress / userAgent</td><td>String?</td><td>Request context</td></tr>
</table>`
        },
        {
          id: 'corporate-models',
          title: 'Corporate Gifting Models',
          content: `<h3>CorporateAccount Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>companyName</td><td>String</td><td>Company name</td></tr>
<tr><td>slug</td><td>String @unique</td><td>URL-friendly slug</td></tr>
<tr><td>industry</td><td>String?</td><td>Industry sector</td></tr>
<tr><td>gstNumber</td><td>String?</td><td>GST number (encrypted)</td></tr>
<tr><td>billingAddress/City/State/ZipCode/Country</td><td>String?</td><td>Billing address</td></tr>
<tr><td>contactName / contactEmail / contactPhone</td><td>String</td><td>Primary contact</td></tr>
<tr><td>logo</td><td>String?</td><td>Company logo URL</td></tr>
<tr><td>userId</td><td>String @unique</td><td>Linked User account</td></tr>
<tr><td>approvalStatus</td><td>String</td><td>pending, approved, rejected, suspended</td></tr>
<tr><td>creditLimit / creditUsed</td><td>Float</td><td>Credit management</td></tr>
<tr><td>discountPercent</td><td>Float @default(0)</td><td>Default corporate discount</td></tr>
<tr><td>branding</td><td>CorporateBranding?</td><td>Custom branding config</td></tr>
<tr><td>members</td><td>CorporateMember[]</td><td>Team members</td></tr>
<tr><td>campaigns</td><td>CorporateCampaign[]</td><td>Gifting campaigns</td></tr>
</table>

<h3>CorporateBranding Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>logoUrl</td><td>String?</td><td>Custom logo for gift packaging</td></tr>
<tr><td>primaryColor / secondaryColor</td><td>String?</td><td>Hex colors for branding</td></tr>
<tr><td>customMessage</td><td>String?</td><td>Default greeting message</td></tr>
<tr><td>packagingType</td><td>String @default("standard")</td><td>standard, premium, luxury</td></tr>
<tr><td>giftWrapStyle</td><td>String?</td><td>Ribbon color, wrapping style</td></tr>
<tr><td>includeBranding</td><td>Boolean @default(true)</td><td>Include corporate branding on package</td></tr>
<tr><td>hidePrice</td><td>Boolean @default(true)</td><td>Hide price on gift</td></tr>
<tr><td>cardTemplate</td><td>String?</td><td>Custom card template</td></tr>
</table>

<h3>CorporateCampaign Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>id</td><td>String @id</td><td>Unique identifier</td></tr>
<tr><td>corporateId</td><td>String</td><td>Foreign key to CorporateAccount</td></tr>
<tr><td>name</td><td>String</td><td>Campaign name</td></tr>
<tr><td>occasion</td><td>String?</td><td>diwali, christmas, onboarding, etc.</td></tr>
<tr><td>budgetPerRecipient / totalBudget</td><td>Float?</td><td>Budget allocation</td></tr>
<tr><td>status</td><td>String</td><td>draft, pending_approval, approved, in_progress, completed</td></tr>
<tr><td>deliveryType</td><td>String</td><td>bulk, individual</td></tr>
<tr><td>deliveryDate</td><td>DateTime?</td><td>Target delivery date</td></tr>
<tr><td>productId</td><td>String?</td><td>Selected product for all recipients</td></tr>
<tr><td>recipients</td><td>CampaignRecipient[]</td><td>Campaign recipients</td></tr>
</table>

<h3>CampaignRecipient Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>name / email / phone</td><td>String / String / String?</td><td>Recipient contact info</td></tr>
<tr><td>designation / department</td><td>String?</td><td>Professional details</td></tr>
<tr><td>address / city / state / zipCode</td><td>String?</td><td>Delivery address</td></tr>
<tr><td>productId</td><td>String?</td><td>Override campaign-level product</td></tr>
<tr><td>budget</td><td>Float?</td><td>Override campaign budget</td></tr>
<tr><td>message</td><td>String?</td><td>Override campaign message</td></tr>
<tr><td>giftStatus</td><td>String @default("pending")</td><td>pending, ordered, shipped, delivered</td></tr>
<tr><td>orderId</td><td>String?</td><td>Linked order once placed</td></tr>
</table>`
        },
        {
          id: 'other-database-models',
          title: 'Other Database Models',
          content: `<h3>CurrencyRate Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>code</td><td>String @unique</td><td>ISO 4217 code (USD, EUR, INR, GBP)</td></tr>
<tr><td>name</td><td>String</td><td>Currency name (US Dollar, Euro)</td></tr>
<tr><td>symbol</td><td>String</td><td>Display symbol ($, €, ₹, £)</td></tr>
<tr><td>rate</td><td>Float</td><td>Exchange rate relative to INR base</td></tr>
</table>

<h3>GeoCountry Model</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Description</th></tr>
<tr><td>code</td><td>String @unique</td><td>ISO 3166-1 alpha-2 (US, IN, GB)</td></tr>
<tr><td>name</td><td>String</td><td>Country name</td></tr>
<tr><td>currencyCode</td><td>String</td><td>ISO 4217 currency code</td></tr>
<tr><td>languageCode</td><td>String @default("en")</td><td>ISO 639-1 language code</td></tr>
<tr><td>flagEmoji</td><td>String?</td><td>Country flag emoji</td></tr>
</table>

<h3>PlatformIntegration Model</h3>
<p>Manages external platform connections (Myntra, Nykaa, CaratLane, etc.) with sync configuration and category mapping.</p>

<h3>Vendor Model</h3>
<p>Vendor management with GST numbers, contact details, and product/invoice relationships.</p>

<h3>Invoice / InvoiceItem Models</h3>
<p>Invoice generation with line items, linking to vendors and orders.</p>

<h3>AccountEntry Model</h3>
<p>Double-entry accounting with debit/credit types and categories (sales, purchase, expense, refund, tax).</p>

<h3>InventoryLog Model</h3>
<p>Stock movement tracking: in, out, adjustment, return with quantity and notes.</p>

<h3>WishlistItem Model</h3>
<p>User wishlist with unique constraint on (userId, productId).</p>

<h3>Coupon Model</h3>
<p>Coupon system with percentage/fixed/free_shipping types, usage limits, and validity periods.</p>

<h3>Offer Model</h3>
<p>Promotional offers with min/max order requirements and usage tracking.</p>

<h3>SupportTicket / SupportTicketMessage Models</h3>
<p>Customer support ticketing system with status tracking and threaded messages.</p>

<h3>Review Model</h3>
<p>Product reviews with verified purchase tracking, linked to orders and products.</p>

<h3>CustomerPortfolio Model</h3>
<p>AI-generated style preview images with consent management, admin approval, and public display controls.</p>

<h3>WikiDocument Model</h3>
<p>Internal documentation with categories and sharing.</p>

<h3>AgentDocShare Model</h3>
<p>Document sharing between admins and agents with download/share permissions.</p>

<h3>AffiliateClick Model</h3>
<p>Affiliate link click tracking with IP, user agent, and referral code.</p>

<h3>PartnerCategoryMap Model</h3>
<p>Mapping between partner platform categories and local categories.</p>

<h3>SyncLog Model</h3>
<p>Integration sync history with product counts and error tracking.</p>

<h3>PaymentMethod Model</h3>
<p>Saved payment methods with type, provider, and default status.</p>`
        }
      ]
    },

    // ─── SECTION 5: Authentication System ────────────────────────────
    {
      id: 'authentication-system',
      title: 'Authentication System',
      content: `<h2>Authentication & Authorization</h2>
<p>The 3BOXES authentication system supports multiple login methods, two-factor authentication, role-based access control, and comprehensive audit logging. Authentication state is managed via JWT tokens stored in localStorage and validated on every API request.</p>`,
      subsections: [
        {
          id: 'auth-methods',
          title: 'Authentication Methods',
          content: `<h3>Supported Authentication Methods</h3>

<h4>1. Email + Password</h4>
<p>Standard registration and login flow with bcrypt password hashing. Passwords are validated using <code>src/lib/password-validator.ts</code> which enforces minimum length, uppercase, lowercase, numbers, and special characters.</p>

<h4>2. Phone OTP Login</h4>
<p>Passwordless login via phone number and one-time password. OTPs are stored in the User model (<code>otpCode</code>, <code>otpExpiry</code>) and verified against a 5-minute expiry window.</p>

<h4>3. Social Login</h4>
<p>OAuth2 login via Google, Facebook, or LinkedIn. The <code>/api/auth/social</code> endpoint validates the social provider token, finds or creates the user, and returns a JWT session.</p>

<h4>4. Two-Factor Authentication (2FA)</h4>
<p>TOTP-based 2FA using authenticator apps (Google Authenticator, Authy). Setup generates a QR code via <code>/api/auth/2fa/setup</code>. Verification during login via <code>/api/auth/2fa/verify</code>. Email OTP fallback via <code>/api/auth/2fa/email-otp</code>.</p>

<h4>5. Admin-Enforced 2FA</h4>
<p>Administrators can require 2FA for specific users by setting <code>twoFactorRequired: true</code> on the User model.</p>`
        },
        {
          id: 'auth-flow-jwt',
          title: 'JWT Token & Session Management',
          content: `<h3>JWT Token Flow</h3>
<ol>
<li>User authenticates (login/OTP/social) → server generates JWT token</li>
<li>JWT token stored in <code>localStorage</code> as <code>3boxes_auth</code> (JSON: { user, token })</li>
<li>All API requests include <code>Authorization: Bearer &lt;token&gt;</code> header</li>
<li>Server validates token on each request, extracts userId and role</li>
<li>Token refresh via <code>/api/auth/refresh</code> extends session</li>
<li>Logout invalidates session server-side and clears localStorage</li>
</ol>

<h3>Session Storage</h3>
<p>Sessions are stored in the database (Session model) with IP address, user agent, device info, and expiration time. The <code>src/lib/session.ts</code> and <code>src/lib/sessions.ts</code> modules handle session creation, validation, and cleanup.</p>

<h3>Client-Side Auth State</h3>
<pre><code>// From src/lib/store.ts
interface AppState {
  authUser: AuthUser | null
  authToken: string | null
  authView: 'login' | 'register' | null
  authTwoFAStep: boolean
  authPendingUserId: string | null
  authTwoFAMethod: 'email' | 'totp' | null
  authPendingEmail: string | null
  showAuthDialog: boolean
  authMode: 'login' | 'register' | null

  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setShowAuthDialog: (show: boolean) => void
  setAuthMode: (mode: 'login' | 'register' | null) => void
}
</code></pre>

<h3>Authenticated Fetch Wrapper</h3>
<p>The <code>src/lib/auth-fetch.ts</code> module provides an authenticated fetch function that automatically includes the JWT token:</p>
<pre><code>import { authFetch } from '@/lib/auth-fetch'

// Automatically includes Authorization header
const response = await authFetch('/api/orders', {
  method: 'GET',
})
</code></pre>`
        },
        {
          id: 'role-based-access',
          title: 'Role-Based Access Control',
          content: `<h3>User Roles</h3>
<table>
<tr><th>Role</th><th>Access Level</th><th>Dashboard</th></tr>
<tr><td>admin</td><td>Full platform access with sub-roles</td><td>AdminDashboard</td></tr>
<tr><td>user</td><td>Standard shopping access</td><td>UserDashboard</td></tr>
<tr><td>agent</td><td>Support ticket management</td><td>AgentDashboard</td></tr>
<tr><td>team</td><td>Inventory and order processing</td><td>TeamDashboard</td></tr>
<tr><td>corporate</td><td>Corporate gifting portal</td><td>CorporateDashboard</td></tr>
</table>

<h3>Admin Sub-Roles</h3>
<table>
<tr><th>Admin Role</th><th>Permissions</th></tr>
<tr><td>super_admin</td><td>All permissions, user management, system settings</td></tr>
<tr><td>product_manager</td><td>Product CRUD, category management, inventory</td></tr>
<tr><td>order_manager</td><td>Order management, refunds, shipping</td></tr>
<tr><td>inventory_manager</td><td>Stock monitoring, inventory logs, vendor management</td></tr>
<tr><td>finance_manager</td><td>Accounting, invoices, payment reports</td></tr>
<tr><td>support_agent</td><td>Support tickets, customer lookup, document sharing</td></tr>
<tr><td>corporate_account_manager</td><td>Corporate accounts, campaigns, approvals</td></tr>
</table>

<h3>Permission System</h3>
<p>Fine-grained permissions are stored in the <code>UserPermission</code> model. Each permission is a dot-notation string:</p>
<ul>
<li><code>products.manage</code> — Create, edit, delete products</li>
<li><code>orders.manage</code> — Process, cancel, refund orders</li>
<li><code>accounting.view</code> — View financial reports</li>
<li><code>users.manage</code> — Manage user accounts</li>
<li><code>corporate.manage</code> — Manage corporate accounts</li>
<li><code>campaigns.manage</code> — Manage corporate campaigns</li>
<li><code>reports.view</code> — View analytics and reports</li>
<li><code>settings.manage</code> — System configuration</li>
</ul>

<p>The <code>/api/admin/role-permissions</code> endpoint returns the full permission matrix for the admin UI.</p>`
        }
      ]
    },

    // ─── SECTION 6: State Management ─────────────────────────────────
    {
      id: 'state-management',
      title: 'State Management',
      content: `<h2>Zustand Store Architecture</h2>
<p>The entire client-side state is managed by a single Zustand store defined in <code>src/lib/store.ts</code>. The store follows a flat state design with explicit setter actions, making it predictable and easy to debug.</p>

<h3>Store Overview</h3>
<pre><code>import { create } from 'zustand'

export const useStore = create&lt;AppState&gt;((set, get) =&gt; ({
  // View state
  view: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,

  // Cart
  cartItems: [],

  // Auth
  authUser: null,
  authToken: null,

  // i18n
  locale: 'en',
  currency: 'INR',
  currencyRates: {},

  // ... etc
}))
</code></pre>`,
      subsections: [
        {
          id: 'store-state-shape',
          title: 'Complete State Shape',
          content: `<h3>AppState Interface</h3>
<pre><code>interface AppState {
  // ── Navigation ──
  view: View                              // Current view (30+ views)
  selectedProductId: string | null        // Selected product for detail view
  searchQuery: string                     // Active search query
  selectedCategory: string | null         // Active category filter

  // ── Cart ──
  cartItems: CartItem[]                   // Shopping cart items
  lastOrderId: string | null              // Last completed order ID

  // ── Authentication ──
  authUser: AuthUser | null               // Current user (or null)
  authToken: string | null                // JWT token
  authView: 'login' | 'register' | null   // Auth dialog mode
  authTwoFAStep: boolean                  // Whether in 2FA verification step
  authPendingUserId: string | null        // User ID awaiting 2FA
  authTwoFAMethod: 'email' | 'totp' | null // 2FA method
  authPendingEmail: string | null         // Email awaiting 2FA
  showAuthDialog: boolean                 // Auth dialog visibility
  authMode: 'login' | 'register' | null   // Auth mode alias

  // ── Gift Features ──
  giftBuilderView: boolean                // Gift builder modal state
  giftFilter: GiftFilter                  // Active gift filters
  smartBundleItems: SmartBundleItem[]     // Smart bundle selections

  // ── Internationalization ──
  locale: string                          // Current locale (en, hi, ar, etc.)
  language: string                        // Alias for locale
  country: string | null                  // Detected country
  messages: Record&lt;string, any&gt; | null    // Loaded translation messages

  // ── Currency ──
  currency: string                        // Current currency code (INR, USD, etc.)
  currencySymbol: string                  // Currency symbol (₹, $, etc.)
  currencyRates: Record&lt;string, CurrencyInfo&gt;  // Exchange rates
  exchangeRates: Record&lt;string, any&gt; | null    // Alternative rates store
  geoInfo: GeoInfo | null                 // Geo-detection result
  geoDetected: boolean                    // Whether geo has been detected

  // ── Theme ──
  appTheme: 'dark' | 'light'             // Current theme

  // ── User alias ──
  user: AuthUser | null                   // Alias for authUser
}
</code></pre>`
        },
        {
          id: 'store-persistence',
          title: 'State Persistence',
          content: `<h3>LocalStorage Persistence</h3>
<p>Key state values are persisted to localStorage so they survive page refreshes:</p>

<table>
<tr><th>Storage Key</th><th>State Field</th><th>Default</th></tr>
<tr><td>3boxes_auth</td><td>authUser, authToken</td><td>null, null</td></tr>
<tr><td>3boxes_locale</td><td>locale, language</td><td>'en'</td></tr>
<tr><td>3boxes_currency</td><td>currency</td><td>'INR'</td></tr>
<tr><td>3boxes_theme</td><td>appTheme</td><td>'dark'</td></tr>
</table>

<p>Persistence is handled by dedicated loader functions that run on store initialization:</p>
<pre><code>function loadAuthFromStorage(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const stored = localStorage.getItem('3boxes_auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { user: parsed.user ?? null, token: parsed.token ?? null }
    }
  } catch { /* ignore parse errors */ }
  return { user: null, token: null }
}
</code></pre>

<h3>Hydration Safety</h3>
<p>All localStorage access is guarded with <code>typeof window !== 'undefined'</code> checks to prevent SSR hydration mismatches. Default values are used when window is not available.</p>`
        }
      ]
    },

    // ─── SECTION 7: Internationalization ─────────────────────────────
    {
      id: 'internationalization',
      title: 'Internationalization (i18n)',
      content: `<h2>Internationalization System</h2>
<p>The 3BOXES platform supports <strong>10 languages</strong> with a custom i18n system built on JSON translation files. The system handles text translation, RTL layout, currency formatting, and locale-specific content.</p>

<h3>Supported Languages</h3>
<table>
<tr><th>Code</th><th>Language</th><th>RTL</th><th>Native Name</th></tr>
<tr><td>en</td><td>English</td><td>No</td><td>English</td></tr>
<tr><td>hi</td><td>Hindi</td><td>No</td><td>हिन्दी</td></tr>
<tr><td>ar</td><td>Arabic</td><td>Yes</td><td>العربية</td></tr>
<tr><td>fr</td><td>French</td><td>No</td><td>Français</td></tr>
<tr><td>de</td><td>German</td><td>No</td><td>Deutsch</td></tr>
<tr><td>es</td><td>Spanish</td><td>No</td><td>Español</td></tr>
<tr><td>zh</td><td>Chinese (Simplified)</td><td>No</td><td>简体中文</td></tr>
<tr><td>ja</td><td>Japanese</td><td>No</td><td>日本語</td></tr>
<tr><td>ko</td><td>Korean</td><td>No</td><td>한국어</td></tr>
<tr><td>pt</td><td>Portuguese</td><td>No</td><td>Português</td></tr>
</table>`,
      subsections: [
        {
          id: 'i18n-architecture',
          title: 'i18n Architecture',
          content: `<h3>Translation System (src/lib/i18n/)</h3>
<p>The i18n system uses a simple key-value approach with dot-notation lookup:</p>

<pre><code>// src/lib/i18n/index.ts
export function t(locale: string, key: TranslationKey, vars?: Record&lt;string, string | number&gt;): string {
  const translations = translationCache[locale] || translationCache.en
  const value = getNestedValue(translations, key)
  if (!value) {
    const fallback = getNestedValue(translationCache.en, key)
    if (!fallback) return key
    return vars ? interpolate(fallback, vars) : fallback
  }
  return vars ? interpolate(value, vars) : value
}
</code></pre>

<h4>Key Features</h4>
<ul>
<li><strong>Dot-notation keys</strong>: <code>t('en', 'common.shopNow')</code> → "Shop Now"</li>
<li><strong>Variable interpolation</strong>: <code>t('en', 'cart.itemCount', { count: 5 })</code> → "5 items"</li>
<li><strong>English fallback</strong>: Missing translations fall back to English</li>
<li><strong>Dynamic loading</strong>: Translation files are loaded on demand and cached</li>
<li><strong>RTL support</strong>: <code>isRTL(locale)</code> returns true for Arabic, Hebrew, Farsi, Urdu</li>
</ul>

<h4>Translation File Structure</h4>
<pre><code>// src/lib/i18n/translations/en.json (example)
{
  "common": {
    "shopNow": "Shop Now",
    "addToCart": "Add to Cart",
    "viewDetails": "View Details"
  },
  "cart": {
    "itemCount": "{count} items",
    "empty": "Your cart is empty"
  },
  "product": {
    "tryOn": "AI Style Preview",
    "reviews": "Reviews"
  }
}
</code></pre>

<h3>Geo-Detection</h3>
<p>The <code>/api/geo</code> endpoint detects the user's country from their IP address. The <code>useGeoDetection</code> hook automatically detects location and suggests language/currency:</p>
<pre><code>// Auto-detection flow:
// 1. GET /api/geo → { country: "US", countryName: "United States", currency: "USD", language: "en", flagEmoji: "🇺🇸" }
// 2. Store: setGeoInfo(info) → auto-sets currency if not manually changed
// 3. User sees USD prices and English UI by default
</code></pre>

<h3>Currency Formatting</h3>
<p>The <code>FormattedPrice</code> component and <code>src/lib/currency/formatter.ts</code> handle multi-currency display:</p>
<pre><code>// Price conversion and formatting
import { formatPrice } from '@/lib/currency/formatter'

// formatPrice(5000, 'INR', 'USD', 83.5) → "$59.88"
// formatPrice(5000, 'INR', 'INR', 1) → "₹5,000"
</code></pre>`
        }
      ]
    },

    // ─── SECTION 8: Image Handling ───────────────────────────────────
    {
      id: 'image-handling',
      title: 'Image Handling',
      content: `<h2>Image Handling System</h2>
<p>3BOXES handles images through multiple pathways: direct product images, Shopify CDN images, AI-generated images, and an image proxy service for external URLs. All images are optimized and served efficiently.</p>`,
      subsections: [
        {
          id: 'image-proxy',
          title: 'Image Proxy & CDN',
          content: `<h3>Image Proxy (/api/image-proxy)</h3>
<p>The image proxy endpoint fetches external images, optimizes them, and serves them with proper caching headers. This is used for:</p>
<ul>
<li>External product images from partner platforms (Myntra, Nykaa, Amazon)</li>
<li>Shopify CDN images that need format conversion</li>
<li>Affiliate product images from external sources</li>
<li>User-uploaded images that need server-side processing</li>
</ul>

<h3>Shopify CDN Images</h3>
<p>Shopify product images are served from the Shopify CDN (<code>cdn.shopify.com</code>). The <code>src/lib/shopify/client.ts</code> handles image URL construction with Shopify's image size parameters:</p>
<pre><code>// Shopify image URL with size parameters
const imageUrl = product.images.edges[0].node.url
// Can append size: ?width=400&height=400
</code></pre>

<h3>AI-Generated Images</h3>
<p>AI try-on results are returned as base64 data URLs. For portfolio display, they are stored in the CustomerPortfolio model. Watermarking is applied via <code>src/lib/watermark.ts</code> to protect generated content.</p>

<h3>Image Download Utility</h3>
<p>The <code>src/lib/image-downloader.ts</code> module handles downloading images from external URLs with timeout handling, proper headers, and content-type detection.</p>`
        },
        {
          id: 'image-moderation',
          title: 'Image Moderation',
          content: `<h3>Content Moderation (/api/moderate-image)</h3>
<p>User-uploaded selfies for AI try-on are moderated for content safety before processing. The moderation endpoint uses the ZAI VLM to check for:</p>
<ul>
<li>Inappropriate or explicit content</li>
<li>Images that don't contain a person</li>
<li>Multiple people (try-on works best with single person)</li>
<li>Very low quality or blurry images</li>
<li>Non-face images (landscapes, objects, etc.)</li>
</ul>

<p>The selfie analysis endpoint (<code>/api/try-on/analyze-selfie</code>) also validates that the image contains a detectable face before starting the try-on pipeline.</p>`
        }
      ]
    },

    // ─── SECTION 9: PWA Support ──────────────────────────────────────
    {
      id: 'pwa-support',
      title: 'PWA Support',
      content: `<h2>Progressive Web App Support</h2>
<p>3BOXES is a PWA-capable application with install prompts, offline support, and app-like behavior on mobile devices.</p>`,
      subsections: [
        {
          id: 'pwa-features',
          title: 'PWA Features',
          content: `<h3>Install Prompt</h3>
<p>The <code>usePWAInstall</code> hook handles the beforeinstallprompt event and provides an install button in the header and app download section:</p>
<pre><code>// src/hooks/usePWAInstall.ts
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    })
  }, [])

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const result = await installPrompt.userChoice
      setIsInstallable(false)
    }
  }

  return { isInstallable, installApp }
}
</code></pre>

<h3>Web App Manifest</h3>
<p>The PWA manifest defines the app name, icons, theme colors, and display mode. Located in the public directory.</p>

<h3>Mobile App</h3>
<p>A companion Flutter app is available in <code>flutter_app/</code> with screens for product browsing, try-on, cart, checkout, and admin dashboard. It connects to the same API endpoints.</p>`
        }
      ]
    },

    // ─── SECTION 10: Security ────────────────────────────────────────
    {
      id: 'security',
      title: 'Security',
      content: `<h2>Security Architecture</h2>
<p>3BOXES implements multiple layers of security to protect user data, prevent abuse, and ensure platform integrity.</p>`,
      subsections: [
        {
          id: 'encryption',
          title: 'AES-256-GCM Encryption',
          content: `<h3>Sensitive Field Encryption</h3>
<p>The <code>src/lib/encryption.ts</code> module provides AES-256-GCM encryption for sensitive database fields:</p>

<pre><code>import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

// Encrypt a phone number before storing
const encrypted = encrypt('+91 98765 43210')
// → "a1b2c3d4e5f6...:112233445566...:778899aabbcc..."

// Decrypt when reading
const decrypted = decrypt(encrypted)
// → "+91 98765 43210"

// Check if a value is already encrypted
const isEnc = isEncrypted(encrypted) // true
</code></pre>

<h4>Encrypted Fields</h4>
<ul>
<li><strong>Phone numbers</strong> — User phone, corporate contact phone</li>
<li><strong>GST numbers</strong> — Corporate GST numbers</li>
<li><strong>Billing addresses</strong> — Corporate billing details</li>
</ul>

<h4>Encryption Details</h4>
<ul>
<li><strong>Algorithm</strong>: AES-256-GCM (authenticated encryption)</li>
<li><strong>Key</strong>: 32 bytes from <code>ENCRYPTION_KEY</code> env var or development default</li>
<li><strong>IV</strong>: 16-byte random IV per encryption</li>
<li><strong>Auth Tag</strong>: 16-byte GCM authentication tag</li>
<li><strong>Format</strong>: <code>iv:tag:encrypted</code> (all hex-encoded)</li>
</ul>`
        },
        {
          id: 'rate-limiting-audit',
          title: 'Rate Limiting & Audit Logging',
          content: `<h3>API Rate Limiting</h3>
<p>The <code>src/lib/rate-limiter.ts</code> module provides configurable rate limiting for API endpoints to prevent abuse:</p>
<pre><code>// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.'
})
</code></pre>

<h4>Rate-Limited Endpoints</h4>
<ul>
<li><strong>Auth endpoints</strong>: 5 attempts per 15 minutes (login, OTP)</li>
<li><strong>Try-on endpoint</strong>: 3 requests per 5 minutes</li>
<li><strong>AI assistant</strong>: 20 messages per hour</li>
<li><strong>General API</strong>: 100 requests per 15 minutes</li>
</ul>

<h3>Audit Logging</h3>
<p>The <code>src/lib/api-logger.ts</code> and AuditLog model track all significant actions:</p>

<h4>Logged Actions</h4>
<ul>
<li><strong>Authentication</strong>: login, logout, failed_login, password_change</li>
<li><strong>Role changes</strong>: role_change, permission_change</li>
<li><strong>Account management</strong>: approval_change, mfa_setup, account_suspension</li>
<li><strong>Data access</strong>: sensitive_data_access, export</li>
<li><strong>Admin actions</strong>: product_update, order_update, corporate_status_change</li>
</ul>

<h4>Audit Log Entry</h4>
<pre><code>{
  userId: "clx...",
  action: "login",
  entity: "user",
  entityId: "clx...",
  details: "{\"method\":\"email_password\",\"2fa\":true}",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
</code></pre>`
        }
      ]
    },

    // ─── SECTION 11: Payment Integration ─────────────────────────────
    {
      id: 'payment-integration',
      title: 'Payment Integration',
      content: `<h2>Payment Integration</h2>
<p>3BOXES supports dual payment providers — <strong>Razorpay</strong> (primary for India) and <strong>Stripe</strong> (for international payments). The payment flow handles multi-currency, order verification, and webhook processing.</p>`,
      subsections: [
        {
          id: 'razorpay-integration',
          title: 'Razorpay Integration',
          content: `<h3>Razorpay Payment Flow</h3>
<ol>
<li><strong>Create Order</strong>: <code>POST /api/payments/create-session</code> creates a Razorpay order with the order amount in INR</li>
<li><strong>Checkout</strong>: Razorpay checkout.js opens the payment modal (cards, UPI, netbanking, wallets)</li>
<li><strong>Verify</strong>: <code>POST /api/payments/verify</code> verifies the Razorpay signature using HMAC-SHA256</li>
<li><strong>Webhook</strong>: Razorpay webhooks update payment status asynchronously</li>
</ol>

<h3>Supported Payment Methods (India)</h3>
<ul>
<li>Credit/Debit Cards (Visa, Mastercard, RuPay)</li>
<li>UPI (Google Pay, PhonePe, Paytm)</li>
<li>Net Banking (all major Indian banks)</li>
<li>Wallets (Paytm, Amazon Pay, Mobikwik)</li>
<li>EMI Options (card and cardless)</li>
</ul>`
        },
        {
          id: 'stripe-integration',
          title: 'Stripe Integration',
          content: `<h3>Stripe Payment Flow (International)</h3>
<ol>
<li><strong>Create Session</strong>: <code>POST /api/payments/create-session</code> creates a Stripe Checkout Session with multi-currency support</li>
<li><strong>Redirect</strong>: User is redirected to Stripe Checkout (hosted page)</li>
<li><strong>Webhook</strong>: <code>checkout.session.completed</code> webhook confirms payment</li>
<li><strong>Verify</strong>: <code>POST /api/payments/verify</code> confirms the payment with Stripe API</li>
</ol>

<h3>Multi-Currency Support</h3>
<p>Stripe supports 135+ currencies. The currency is determined by the user's geo-detected location or manual selection. Exchange rates are fetched from <code>/api/exchange-rates</code> and stored in the CurrencyRate model.</p>`
        }
      ]
    },

    // ─── SECTION 12: Shopify Integration ─────────────────────────────
    {
      id: 'shopify-integration',
      title: 'Shopify Integration',
      content: `<h2>Shopify Integration</h2>
<p>3BOXES integrates with Shopify for product catalog management, order synchronization, and checkout. The integration uses both the <strong>Shopify Admin API</strong> (for product/order sync) and the <strong>Storefront API</strong> (for customer-facing product browsing and checkout).</p>`,
      subsections: [
        {
          id: 'shopify-apis',
          title: 'Shopify API Clients',
          content: `<h3>Shopify Admin API Client</h3>
<p>Located in <code>src/lib/shopify/admin-client.ts</code>, the Admin API client handles:</p>
<ul>
<li>Product creation, updates, and deletion</li>
<li>Collection management</li>
<li>Order retrieval and updates</li>
<li>Inventory sync</li>
<li>Webhook registration</li>
</ul>
<p>Authentication: Shopify Admin API access token (stored in env or set via <code>/api/shopify/admin-token</code>)</p>

<h3>Shopify Storefront API Client</h3>
<p>Located in <code>src/lib/shopify/client.ts</code>, the Storefront API client handles:</p>
<ul>
<li>Product listing and detail retrieval</li>
<li>Collection browsing</li>
<li>Cart creation and management</li>
<li>Checkout creation</li>
</ul>
<p>Authentication: Shopify Storefront API access token (public token for read operations)</p>

<h3>Shopify Store Configuration</h3>
<p>Located in <code>src/lib/shopify/store.ts</code>, manages the store domain, API versions, and token configuration.</p>`
        },
        {
          id: 'shopify-sync-webhooks',
          title: 'Sync & Webhooks',
          content: `<h3>Product Sync Flow</h3>
<pre>
1. Admin triggers sync → POST /api/shopify/sync
2. Fetch products from Shopify Storefront API
3. For each product:
   a. Check if product exists locally (by Shopify ID or handle)
   b. If exists → update price, stock, images
   c. If new → create local product with Shopify data
4. Update sync status and timestamp
5. Return sync results (added, updated, errors)
</pre>

<h3>Webhook Integration</h3>
<p>Shopify webhooks are registered via <code>POST /api/shopify/webhooks/register</code> and received at <code>POST /api/shopify/webhooks</code>. Supported events:</p>
<ul>
<li><code>products/create</code> — New product added to Shopify</li>
<li><code>products/update</code> — Product details changed</li>
<li><code>products/delete</code> — Product removed</li>
<li><code>orders/create</code> — New Shopify order</li>
<li><code>orders/updated</code> — Order status change</li>
<li><code>inventory_levels/update</code> — Stock level change</li>
</ul>

<p>Webhook verification uses HMAC-SHA256 signature validation to ensure authenticity.</p>`
        }
      ]
    }
  ]
};

export default technicalDoc;
