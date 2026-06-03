const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableOfContents, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── Palette: Ink Gold (luxury brand) ──────────────────────────────
const P = {
  primary: "1A1A1A",
  body: "2C2C2C",
  secondary: "6E6560",
  accent: "C9A84C",
  surface: "F5F2E8",
  bg: "1A1A1A",
  white: "FFFFFF",
  lightGray: "F7F5F0",
};

// ── Helpers ──────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Times New Roman", color: P.primary })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Times New Roman", color: P.primary })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Times New Roman", color: P.primary })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    ...opts,
    children: [new TextRun({ text, size: 22, font: "Calibri", color: P.body })],
  });
}
function pBold(label, text) {
  return new Paragraph({
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: "Calibri", color: P.primary }),
      new TextRun({ text, size: 22, font: "Calibri", color: P.body }),
    ],
  });
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: 312, after: 40 },
    children: [new TextRun({ text, size: 22, font: "Calibri", color: P.body })],
  });
}

// ── Table builder ─────────────────────────────────────────────────
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
      left: noBorder, right: noBorder,
      insideHorizontal: thinBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((h, i) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Calibri", color: P.white })] })],
            shading: { type: ShadingType.CLEAR, fill: P.accent },
            margins: cellMargins,
            width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          })
        ),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          cantSplit: true,
          children: row.map((cell, ci) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, font: "Calibri", color: P.body })] })],
              shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? P.surface : P.white },
              margins: cellMargins,
              width: colWidths ? { size: colWidths[ci], type: WidthType.PERCENTAGE } : undefined,
            })
          ),
        })
      ),
    ],
  });
}

// ── Cover Section ─────────────────────────────────────────────────
function buildCover() {
  const coverPalette = { bg: P.bg, primary: P.white, accent: P.accent };
  return [
    new Paragraph({ spacing: { before: 3600 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "3 BOXES LUXURY", size: 60, bold: true, font: "Times New Roman", color: coverPalette.accent })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "______________________________", size: 24, font: "Times New Roman", color: coverPalette.accent })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: "Technical Documentation", size: 36, font: "Times New Roman", color: coverPalette.primary })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Comprehensive Feature List, Architecture,", size: 24, font: "Calibri", color: "B0B8C0" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: "Frontend & Backend Technical Details", size: 24, font: "Calibri", color: "B0B8C0" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Version 1.0", size: 22, font: "Calibri", color: "90989F" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, size: 22, font: "Calibri", color: "90989F" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Confidential", size: 20, font: "Calibri", color: "687078", italics: true })],
    }),
  ];
}

// ── Body Content ──────────────────────────────────────────────────
function buildBody() {
  const children = [];

  // === 1. EXECUTIVE SUMMARY ===
  children.push(h1("1. Executive Summary"));
  children.push(p("3 BOXES LUXURY is a premium e-commerce platform built with Next.js 16, designed for luxury goods retail with a focus on delivering an immersive shopping experience. The platform features a comprehensive product catalog spanning 11 categories, AI-powered virtual try-on capabilities, intelligent combo suggestions, and a full shopping cart and checkout flow."));
  children.push(p("The application leverages modern web technologies including React 19, TypeScript, Tailwind CSS 4, Prisma ORM with SQLite, and the z-ai-web-dev-sdk for AI features. The architecture follows a single-page application pattern with client-side routing managed by Zustand state management and server-side API routes for data and AI operations."));
  children.push(p("Key differentiators include the AI Virtual Try-On feature that allows customers to upload selfies and visualize products on themselves, and the AI Style Suggestions engine that recommends complementary products from other categories, creating a personalized luxury shopping experience."));

  // === 2. FEATURES LIST ===
  children.push(h1("2. Complete Features List"));

  children.push(h2("2.1 Core E-Commerce Features"));
  const coreFeatures = [
    ["Product Catalog", "55 luxury products across 11 categories with rich metadata (images, pricing, ratings, stock, tags)"],
    ["Category Browsing", "Visual category grid with 11 categories: Watches, Jewelry, Leather Goods, Fragrances, Fashion, Home & Living, Sarees, Toys, Romantic Gifts, Couple Gifts, Men's Shirts"],
    ["Product Search", "Real-time search filtering across product names and descriptions"],
    ["Product Detail View", "Full product page with image gallery, thumbnails, pricing, ratings, stock status, tags, and quantity selector"],
    ["Shopping Cart", "Full cart management with add/remove, quantity adjustment, and running totals"],
    ["Checkout Flow", "Complete checkout form with address, payment method selection, and order summary"],
    ["Order Management", "Order placement with confirmation, order history view, and status tracking"],
    ["Responsive Design", "Mobile-first responsive layout adapting from mobile to desktop"],
  ];
  children.push(makeTable(["Feature", "Description"], coreFeatures, [30, 70]));

  children.push(h2("2.2 AI-Powered Features"));
  const aiFeatures = [
    ["AI Virtual Try-On", "Upload selfie + select product to generate AI visualization of product on the user, with 4-strategy generation and VLM quality scoring"],
    ["Multi-Strategy Generation", "4 strategies: Edit-Both (selfie+product), Edit-Selfie, Edit-Product, Create-Detailed; with retry logic and fallback"],
    ["Category-Aware Prompts", "Product-type specific prompt templates for 11+ categories (saree draping, jewelry placement, watch wrist, etc.)"],
    ["VLM Analysis", "Dual VLM analysis of person and product before generation for richer prompt context"],
    ["AI Style Suggestions", "Complementary product recommendations from other categories with AI-generated pairing reasons"],
    ["Logo Watermark on Download", "Canvas-drawn 3 BOXES GIFTS logo watermark on all downloaded AI-generated images"],
    ["Async Job Processing", "POST/GET polling pattern with jobId for long-running AI generation (3s poll interval, 60 max attempts)"],
  ];
  children.push(makeTable(["Feature", "Description"], aiFeatures, [30, 70]));

  children.push(h2("2.3 UI/UX Features"));
  const uiFeatures = [
    ["Dark Luxury Theme", "Stone-950 background with amber/gold accent system throughout the application"],
    ["Gold Shimmer Logo", "Animated gold shimmer effect on the 3 BOXES LUXURY brand name"],
    ["Animated Transitions", "Framer Motion page transitions, hover effects, and micro-animations"],
    ["Image Error Fallbacks", "Graceful fallback to decorative emoji placeholders for broken images"],
    ["Toast Notifications", "User feedback via toast notifications for cart additions and errors"],
    ["Loading Skeletons", "Skeleton loading states for products, suggestions, and content areas"],
    ["Mobile Navigation", "Sheet-based mobile menu with search, cart, and navigation"],
    ["Sticky Header", "Fixed header with search, cart badge, and navigation"],
    ["Sticky Footer", "Footer with brand info, shop links, company links, and support"],
  ];
  children.push(makeTable(["Feature", "Description"], uiFeatures, [30, 70]));

  // === 3. ARCHITECTURE ===
  children.push(h1("3. System Architecture"));

  children.push(h2("3.1 Architecture Overview"));
  children.push(p("The application follows a Next.js App Router architecture with a single-page application (SPA) pattern. The frontend uses client-side routing managed by Zustand state, while the backend provides RESTful API routes for data operations and AI features. The architecture diagram below illustrates the high-level system design:"));

  children.push(h3("3.1.1 High-Level Architecture"));
  const archLayers = [
    ["Presentation Layer", "Next.js App Router (React 19 + TypeScript + Tailwind CSS 4)", "Client-side SPA with Zustand routing, Framer Motion animations"],
    ["API Layer", "Next.js API Routes (App Router /api/*)", "RESTful endpoints for products, categories, cart, checkout, orders, try-on, combo-suggestions"],
    ["AI Service Layer", "z-ai-web-dev-sdk (VLM + Image Generation)", "AI virtual try-on with multi-strategy generation, VLM analysis, async job processing"],
    ["Data Layer", "Prisma ORM + SQLite", "Product catalog, categories, cart items, orders with relational schema"],
    ["State Management", "Zustand + TanStack React Query", "Client state (cart, navigation) + server state (products, suggestions) caching"],
  ];
  children.push(makeTable(["Layer", "Technology", "Responsibility"], archLayers, [20, 40, 40]));

  children.push(h2("3.2 Data Flow"));
  children.push(p("The application data flow follows a unidirectional pattern:"));
  children.push(bullet("User interactions trigger Zustand store actions (navigation, cart operations)"));
  children.push(bullet("TanStack React Query manages server state with automatic caching and refetching"));
  children.push(bullet("API routes handle business logic, database queries, and AI service orchestration"));
  children.push(bullet("AI try-on uses an async job pattern: POST creates job, GET polls for completion"));
  children.push(bullet("Prisma ORM translates TypeScript queries to SQL for the SQLite database"));

  children.push(h2("3.3 Project Structure"));
  const projectStructure = [
    ["src/app/page.tsx", "Main application entry point with view routing and error boundary"],
    ["src/app/layout.tsx", "Root layout with providers (QueryClient, fonts)"],
    ["src/app/api/products/", "Product listing and detail API routes"],
    ["src/app/api/categories/", "Category listing API route"],
    ["src/app/api/cart/", "Cart management API route"],
    ["src/app/api/checkout/", "Checkout and order placement API route"],
    ["src/app/api/orders/", "Order listing and detail API routes"],
    ["src/app/api/try-on/", "AI virtual try-on API with async job processing"],
    ["src/app/api/combo-suggestions/", "AI style suggestion recommendations API"],
    ["src/lib/store.ts", "Zustand store (cart, navigation, search state)"],
    ["src/lib/db.ts", "Prisma client singleton"],
    ["src/lib/query-provider.tsx", "TanStack React Query provider"],
    ["src/components/header.tsx", "Sticky header with search, cart, navigation"],
    ["src/components/hero-section.tsx", "Landing page hero banner"],
    ["src/components/category-grid.tsx", "Category browsing grid"],
    ["src/components/product-grid.tsx", "Product listing with filters and sorting"],
    ["src/components/product-card.tsx", "Individual product card component"],
    ["src/components/product-detail.tsx", "Full product detail + TryOn dialog + AI suggestions"],
    ["src/components/cart-view.tsx", "Shopping cart view with quantity management"],
    ["src/components/checkout-view.tsx", "Checkout form with validation"],
    ["src/components/order-history.tsx", "Order listing and detail view"],
    ["src/components/order-confirmation.tsx", "Order confirmation page"],
    ["src/components/footer.tsx", "Footer with brand, links, and support"],
    ["prisma/schema.prisma", "Database schema definition"],
    ["prisma/seed.ts", "Database seeding script (11 categories, 55 products)"],
  ];
  children.push(makeTable(["File", "Description"], projectStructure, [40, 60]));

  // === 4. FRONTEND TECHNICAL DETAILS ===
  children.push(h1("4. Frontend Technical Details"));

  children.push(h2("4.1 Technology Stack"));
  const frontendStack = [
    ["Framework", "Next.js 16 with App Router"],
    ["Language", "TypeScript 5 (strict mode)"],
    ["UI Library", "React 19"],
    ["Styling", "Tailwind CSS 4 with custom theme"],
    ["Component Library", "shadcn/ui (New York style)"],
    ["Icons", "Lucide React"],
    ["Animations", "Framer Motion"],
    ["State Management", "Zustand (client state) + TanStack React Query (server state)"],
    ["Image Handling", "Next.js Image component with optimization"],
    ["Toast Notifications", "shadcn/ui toast with custom hooks"],
  ];
  children.push(makeTable(["Technology", "Implementation"], frontendStack, [30, 70]));

  children.push(h2("4.2 Component Architecture"));
  children.push(p("The frontend uses a component-based architecture with clear separation of concerns. All components are client-side rendered ('use client') due to the interactive nature of the SPA pattern. The main AppContent component in page.tsx serves as the router, switching between views based on Zustand state."));

  children.push(h3("4.2.1 View Routing System"));
  children.push(p("Navigation is managed entirely by the Zustand store's 'view' state. The View type union defines six views:"));
  const viewTypes = [
    ["home", "Landing page with hero, categories, and product grid"],
    ["product", "Product detail view with image gallery, AI try-on, and suggestions"],
    ["cart", "Shopping cart with quantity management and totals"],
    ["checkout", "Checkout form with address and payment information"],
    ["orders", "Order history listing with status tracking"],
    ["order-confirmation", "Post-purchase confirmation with order details"],
  ];
  children.push(makeTable(["View", "Description"], viewTypes, [25, 75]));

  children.push(h3("4.2.2 Product Detail Component"));
  children.push(p("The ProductDetail component is the most complex frontend component, integrating multiple features:"));
  children.push(bullet("Image gallery with thumbnail navigation and error fallbacks"));
  children.push(bullet("Product info display with pricing, ratings, stock, tags, and quantity selector"));
  children.push(bullet("AI Virtual Try-On button opening the TryOnDialog"));
  children.push(bullet("AI Style Suggestions section with auto-scroll and add-to-cart for suggestions"));
  children.push(bullet("Add to Cart functionality with visual feedback animation"));

  children.push(h3("4.2.3 Try-On Dialog Component"));
  children.push(p("The TryOnDialog is a multi-step dialog implementing the AI virtual try-on flow:"));
  const tryOnSteps = [
    ["upload", "Initial step - user selects product, sees upload area with tips for best results"],
    ["preview", "Shows selfie preview alongside product image with generate button"],
    ["generating", "Loading state with animated progress bar and rotating status messages"],
    ["result", "Side-by-side comparison of selfie and AI result with download (with logo) and retry buttons"],
  ];
  children.push(makeTable(["Step", "Description"], tryOnSteps, [20, 80]));

  children.push(h3("4.2.4 Logo Watermark System"));
  children.push(p("The download watermark is implemented via the addLogoWatermark() function using the HTML5 Canvas API. The function draws the AI result image onto a canvas, then renders a semi-transparent rounded background bar at the bottom-left corner containing three stylized gift box icons and '3 BOXES' / 'GIFTS' text in gold colors. This approach uses no external image dependencies, ensuring reliable rendering across all browsers."));

  children.push(h2("4.3 Styling System"));
  children.push(h3("4.3.1 Color Palette"));
  const colorPalette = [
    ["Background", "stone-950 (#0c0a09)", "Primary dark background"],
    ["Surface", "stone-900/60", "Card and panel backgrounds"],
    ["Primary Accent", "amber-600 (#d97706)", "Buttons, highlights, active states"],
    ["Gold Shimmer", "amber-400/amber-500", "Logo text and premium accents"],
    ["Text Primary", "amber-100/amber-200", "Headings and primary text"],
    ["Text Secondary", "amber-200/40-60", "Descriptions and secondary text"],
    ["Success", "emerald-400/600", "In-stock, confirmed states"],
    ["Error", "red-400/900", "Out of stock, error states"],
    ["Border", "amber-900/20-30", "Subtle borders and dividers"],
  ];
  children.push(makeTable(["Token", "Value", "Usage"], colorPalette, [20, 30, 50]));

  children.push(h3("4.3.2 Typography"));
  children.push(p("The application uses a combination of the Geist font family (system default from Next.js) for body text and a custom gold shimmer effect for the brand name. Font sizes follow a hierarchical scale from text-[8px] for micro-labels to text-3xl for page headings."));

  children.push(h3("4.3.3 Animation System"));
  children.push(p("Framer Motion is used for page transitions (AnimatePresence with fade + slide), hover effects (scale transforms), and loading states (pulse animations). The animation durations are kept short (0.25-0.3s) to maintain responsiveness."));

  children.push(h2("4.4 State Management"));
  children.push(h3("4.4.1 Zustand Store"));
  children.push(p("The Zustand store manages client-side state including:"));
  const storeState = [
    ["view", "View", "'home'", "Current active view/page"],
    ["selectedProductId", "string | null", "null", "ID of the selected product for detail view"],
    ["searchQuery", "string", "''", "Current search filter"],
    ["selectedCategory", "string | null", "null", "Active category filter"],
    ["cartItems", "CartItem[]", "[]", "Shopping cart items with product info and quantity"],
    ["lastOrderId", "string | null", "null", "Most recent order ID for confirmation"],
  ];
  children.push(makeTable(["Field", "Type", "Default", "Description"], storeState, [18, 20, 15, 47]));

  children.push(h3("4.4.2 React Query"));
  children.push(p("TanStack React Query manages server state with the following query patterns:"));
  const queryPatterns = [
    ["products", "Product listing with category filter and sort", "Stale-while-revalidate"],
    ["product/:id", "Individual product details", "Cache-first"],
    ["categories", "Category listing", "Stale-while-revalidate"],
    ["combo-suggestions", "AI product recommendations", "Cache-first per product"],
    ["orders", "Order listing", "Stale-while-revalidate"],
  ];
  children.push(makeTable(["Query Key", "Description", "Strategy"], queryPatterns, [25, 45, 30]));

  // === 5. BACKEND TECHNICAL DETAILS ===
  children.push(h1("5. Backend Technical Details"));

  children.push(h2("5.1 Technology Stack"));
  const backendStack = [
    ["Runtime", "Next.js API Routes (Node.js)"],
    ["Database", "SQLite via Prisma ORM"],
    ["AI SDK", "z-ai-web-dev-sdk (VLM + Image Generation)"],
    ["API Pattern", "RESTful with JSON request/response"],
    ["Async Processing", "In-memory job map with polling"],
  ];
  children.push(makeTable(["Technology", "Implementation"], backendStack, [30, 70]));

  children.push(h2("5.2 API Routes"));
  children.push(h3("5.2.1 Product APIs"));
  const productAPIs = [
    ["GET /api/products", "List products with optional category filter and sort order", "category, sort, limit"],
    ["GET /api/products/:id", "Get single product with category details", "id (path)"],
  ];
  children.push(makeTable(["Endpoint", "Description", "Parameters"], productAPIs, [25, 50, 25]));

  children.push(h3("5.2.2 Category API"));
  children.push(makeTable(["Endpoint", "Description", "Parameters"], [
    ["GET /api/categories", "List all categories with product counts", "none"],
  ], [25, 50, 25]));

  children.push(h3("5.2.3 Cart API"));
  children.push(makeTable(["Endpoint", "Description", "Parameters"], [
    ["GET /api/cart", "Get cart items with product details", "sessionId"],
    ["POST /api/cart", "Add item to cart", "sessionId, productId, quantity"],
    ["DELETE /api/cart", "Remove item from cart", "sessionId, productId"],
  ], [25, 50, 25]));

  children.push(h3("5.2.4 Checkout API"));
  children.push(makeTable(["Endpoint", "Description", "Parameters"], [
    ["POST /api/checkout", "Process checkout and create order", "email, address, payment, cartItems"],
  ], [25, 50, 25]));

  children.push(h3("5.2.5 Order APIs"));
  children.push(makeTable(["Endpoint", "Description", "Parameters"], [
    ["GET /api/orders", "List orders with items", "email"],
    ["GET /api/orders/:id", "Get order detail with items", "id (path)"],
  ], [25, 50, 25]));

  children.push(h3("5.2.6 AI Try-On API"));
  const tryOnAPIs = [
    ["POST /api/try-on", "Start AI virtual try-on job (returns jobId)", "productId, selfieData (base64), productImageUrl"],
    ["GET /api/try-on?jobId=xxx", "Poll job status (3s interval)", "jobId (query)"],
  ];
  children.push(makeTable(["Endpoint", "Description", "Parameters"], tryOnAPIs, [25, 50, 25]));

  children.push(h3("5.2.7 AI Combo Suggestions API"));
  children.push(makeTable(["Endpoint", "Description", "Parameters"], [
    ["GET /api/combo-suggestions", "Get complementary product suggestions", "productId, category (query)"],
  ], [25, 50, 25]));

  children.push(h2("5.3 AI Virtual Try-On Engine"));
  children.push(p("The AI virtual try-on is the most technically complex feature, implementing a multi-strategy generation pipeline with quality-focused retry logic."));

  children.push(h3("5.3.1 Generation Pipeline"));
  children.push(p("The pipeline follows these steps for each try-on request:"));
  children.push(bullet("1. Receive POST request with productId and selfie base64 data"));
  children.push(bullet("2. Look up product details and load product image as base64"));
  children.push(bullet("3. Create an in-memory job with 'processing' status"));
  children.push(bullet("4. Launch background processing (non-blocking response with jobId)"));
  children.push(bullet("5. Run parallel VLM analysis on selfie (person description) and product (product description)"));
  children.push(bullet("6. Build enhanced prompt with VLM context + category-specific placement instructions"));
  children.push(bullet("7. Call image edit API with both selfie and product images as references"));
  children.push(bullet("8. Adjust strength and guidance_scale parameters per attempt"));
  children.push(bullet("9. On success: store result in job, client polls and receives imageUrl"));
  children.push(bullet("10. On failure: retry with adjusted parameters, or fall back to create API"));

  children.push(h3("5.3.2 Strategy Configuration"));
  children.push(p("Each product category has tailored generation parameters:"));
  const strategyConfig = [
    ["Jewelry (earrings)", "0.15", "20", "864x1152", "Very low strength to preserve face, add only earrings"],
    ["Jewelry (necklace)", "0.18", "18", "864x1152", "Low strength, preserve face and add necklace"],
    ["Sarees (bridal)", "0.40", "22", "768x1344", "High strength for full outfit replacement"],
    ["Sarees (silk)", "0.40", "21", "768x1344", "High strength with traditional drape instructions"],
    ["Watches", "0.18", "18", "864x1152", "Low strength, add watch on wrist only"],
    ["Fragrances", "0.15", "16", "864x1152", "Very low strength, hold bottle near chest"],
    ["Leather Goods", "0.20", "16", "864x1152", "Low-medium strength, carry bag"],
    ["Men's Shirts (dress)", "0.38", "20", "768x1344", "High strength for shirt replacement"],
    ["Men's Shirts (t-shirt)", "0.35", "18", "768x1344", "Medium-high strength, casual fit"],
    ["Romantic/Couple Gifts", "0.18", "16", "864x1152", "Low strength, hold gift in hands"],
    ["Home & Living", "0.25", "16", "1344x768", "Medium strength, landscape orientation"],
  ];
  children.push(makeTable(
    ["Category", "Strength", "Guidance", "Image Size", "Strategy"],
    strategyConfig, [20, 10, 10, 15, 45]
  ));

  children.push(h3("5.3.3 Retry Logic"));
  children.push(p("The generation pipeline implements adaptive retry with parameter adjustment:"));
  children.push(bullet("Attempt 1: Base parameters (category-specific strength and guidance_scale)"));
  children.push(bullet("Attempt 2: Reduced strength (-0.03), increased guidance (+2) for more precision"));
  children.push(bullet("Attempt 3: Further reduced strength (-0.05), increased guidance (+4)"));
  children.push(bullet("If image size is < 20KB on attempt 1, retry immediately (likely poor quality)"));
  children.push(bullet("After all attempts fail: Fallback to image create API with text prompt only"));

  children.push(h3("5.3.4 VLM Analysis Prompts"));
  children.push(p("Two VLM prompts run in parallel before generation:"));
  children.push(bullet("Person Analysis: Extracts skin tone, body type, current outfit, pose/framing, hair style, and lighting from the selfie"));
  children.push(bullet("Product Analysis: Extracts type/placement, size/proportions, dominant colors, material/texture, and key visual details from the product image"));
  children.push(p("Both analyses are injected into the generation prompt as context, enabling the AI model to produce more accurate and contextual results."));

  children.push(h2("5.4 AI Combo Suggestions Engine"));
  children.push(p("The combo suggestions engine uses a category-complementarity mapping to recommend products from related categories:"));
  const comboMapping = [
    ["Watches", "Jewelry, Leather Goods"],
    ["Jewelry", "Sarees, Fashion, Watches"],
    ["Leather Goods", "Watches, Fashion"],
    ["Fragrances", "Jewelry, Fashion"],
    ["Fashion", "Jewelry, Fragrances, Leather Goods"],
    ["Home & Living", "Fragrances, Jewelry"],
    ["Sarees", "Jewelry, Fragrances"],
    ["Toys", "Fragrances, Home & Living"],
    ["Romantic Gifts", "Jewelry, Fragrances, Couple Gifts"],
    ["Couple Gifts", "Romantic Gifts, Jewelry, Fragrances"],
    ["Men's Shirts", "Watches, Leather Goods, Fragrances"],
  ];
  children.push(makeTable(["Category", "Complementary Categories"], comboMapping, [30, 70]));
  children.push(p("The engine fetches top-rated products from complementary categories (excluding the current product) and generates pairing reasons based on the category combination (e.g., 'Perfect jewelry to complement your saree look'). Results are limited to 6 suggestions."));

  // === 6. DATABASE DESIGN ===
  children.push(h1("6. Database Design"));

  children.push(h2("6.1 Schema Overview"));
  children.push(p("The database uses SQLite via Prisma ORM with 6 models forming a relational structure centered around the Product-Category relationship and the Order lifecycle."));

  children.push(h3("6.1.1 Entity Relationship"));
  children.push(p("Category (1) ---> (N) Product: Each product belongs to one category"));
  children.push(p("Product (1) ---> (N) CartItem: Products can be in multiple cart items"));
  children.push(p("Cart (1) ---> (N) CartItem: Each cart contains multiple items"));
  children.push(p("Order (1) ---> (N) OrderItem: Each order contains multiple line items"));
  children.push(p("Product (1) ---> (N) OrderItem: Products can appear in multiple orders"));

  children.push(h2("6.2 Model Definitions"));

  children.push(h3("6.2.1 Category Model"));
  const categoryFields = [
    ["id", "String", "@id @default(cuid())", "Unique identifier"],
    ["name", "String", "-", "Category display name"],
    ["slug", "String", "@unique", "URL-friendly identifier"],
    ["description", "String?", "-", "Optional category description"],
    ["image", "String?", "-", "Category image URL"],
    ["createdAt", "DateTime", "@default(now())", "Creation timestamp"],
    ["updatedAt", "DateTime", "@updatedAt", "Last update timestamp"],
    ["products", "Product[]", "-", "Related products"],
  ];
  children.push(makeTable(["Field", "Type", "Constraints", "Description"], categoryFields, [15, 15, 25, 45]));

  children.push(h3("6.2.2 Product Model"));
  const productFields = [
    ["id", "String", "@id @default(cuid())", "Unique identifier"],
    ["name", "String", "-", "Product name"],
    ["slug", "String", "@unique", "URL-friendly identifier"],
    ["description", "String", "-", "Product description"],
    ["price", "Float", "-", "Current price"],
    ["compareAtPrice", "Float?", "-", "Original price (for discount display)"],
    ["images", "String", "-", "JSON array of image URLs"],
    ["categoryId", "String", "-", "Foreign key to Category"],
    ["stock", "Int", "@default(0)", "Available inventory"],
    ["rating", "Float", "@default(0)", "Average rating (0-5)"],
    ["reviewCount", "Int", "@default(0)", "Number of reviews"],
    ["featured", "Boolean", "@default(false)", "Featured product flag"],
    ["tags", "String?", "-", "JSON array of tag strings"],
    ["createdAt", "DateTime", "@default(now())", "Creation timestamp"],
    ["updatedAt", "DateTime", "@updatedAt", "Last update timestamp"],
  ];
  children.push(makeTable(["Field", "Type", "Constraints", "Description"], productFields, [15, 12, 25, 48]));

  children.push(h3("6.2.3 Cart & CartItem Models"));
  const cartFields = [
    ["Cart.id", "String", "@id @default(cuid())", "Cart identifier"],
    ["Cart.sessionId", "String", "@unique", "Session identifier"],
    ["CartItem.id", "String", "@id @default(cuid())", "Item identifier"],
    ["CartItem.cartId", "String", "FK -> Cart", "Parent cart"],
    ["CartItem.productId", "String", "FK -> Product", "Referenced product"],
    ["CartItem.quantity", "Int", "@default(1)", "Item quantity"],
  ];
  children.push(makeTable(["Field", "Type", "Constraints", "Description"], cartFields, [20, 15, 25, 40]));

  children.push(h3("6.2.4 Order & OrderItem Models"));
  const orderFields = [
    ["Order.id", "String", "@id @default(cuid())", "Order identifier"],
    ["Order.orderNumber", "String", "@unique", "Human-readable order number"],
    ["Order.email", "String", "-", "Customer email"],
    ["Order.firstName/lastName", "String", "-", "Customer name"],
    ["Order.address/city/state/zipCode/country", "String", "-", "Shipping address"],
    ["Order.phone", "String?", "-", "Optional phone number"],
    ["Order.subtotal/shipping/tax/total", "Float", "-", "Order amounts"],
    ["Order.status", "String", "@default('pending')", "pending/processing/shipped/delivered/cancelled"],
    ["Order.paymentMethod", "String", "@default('card')", "Payment method"],
    ["Order.paymentStatus", "String", "@default('pending')", "pending/paid/failed/refunded"],
    ["OrderItem.name/price/quantity", "String/Float/Int", "-", "Snapshot of product at order time"],
    ["OrderItem.image", "String?", "-", "Product image URL snapshot"],
  ];
  children.push(makeTable(["Field", "Type", "Constraints", "Description"], orderFields, [25, 18, 25, 32]));

  children.push(h2("6.3 Seed Data"));
  children.push(p("The database is seeded with 11 categories and 55 products, providing a comprehensive luxury goods catalog. The seed data includes realistic product names, descriptions, pricing, and multiple images per product."));

  const seedCategories = [
    ["Watches", "4 products", "Luxury timepieces from premium brands"],
    ["Jewelry", "10 products", "Necklaces, earrings, bracelets, rings, and sets"],
    ["Leather Goods", "3 products", "Premium leather bags and accessories"],
    ["Fragrances", "3 products", "Designer perfumes and colognes"],
    ["Fashion", "3 products", "Designer clothing and accessories"],
    ["Home & Living", "3 products", "Luxury home decor and accessories"],
    ["Sarees", "10 products", "Traditional and designer sarees"],
    ["Toys", "3 products", "Premium toys and collectibles"],
    ["Romantic Gifts", "3 products", "Gift sets for romantic occasions"],
    ["Couple Gifts", "3 products", "Gift sets for couples"],
    ["Men's Shirts", "10 products", "Dress shirts, polos, t-shirts, and henleys"],
  ];
  children.push(makeTable(["Category", "Product Count", "Description"], seedCategories, [20, 20, 60]));

  // === 7. DEPLOYMENT & CONFIGURATION ===
  children.push(h1("7. Deployment & Configuration"));

  children.push(h2("7.1 Environment Configuration"));
  const envConfig = [
    ["DATABASE_URL", "SQLite connection string", "file:./dev.db"],
    ["NEXT_PUBLIC_*", "Client-side environment variables", "N/A"],
    [".z-ai-config", "AI SDK configuration (baseUrl, apiKey, token)", "Auto-detected"],
  ];
  children.push(makeTable(["Variable", "Description", "Example"], envConfig, [25, 45, 30]));

  children.push(h2("7.2 Build & Run Commands"));
  const buildCommands = [
    ["bun run dev", "Start development server on port 3000"],
    ["bun run lint", "Run ESLint for code quality checks"],
    ["bun run db:push", "Push Prisma schema changes to database"],
    ["bun run db:seed", "Seed database with initial data"],
    ["bun run build", "Create production build (standalone output)"],
  ];
  children.push(makeTable(["Command", "Description"], buildCommands, [30, 70]));

  children.push(h2("7.3 Performance Considerations"));
  children.push(bullet("Next.js Image component with automatic optimization and lazy loading"));
  children.push(bullet("Client-side image compression before upload (1280px max, 0.85 quality)"));
  children.push(bullet("React Query caching to minimize redundant API calls"));
  children.push(bullet("VLM analysis runs in parallel (Promise.all) to reduce latency"));
  children.push(bullet("Async job pattern prevents API timeout on long AI generation"));
  children.push(bullet("In-memory job cleanup every 5 minutes (10-minute TTL)"));

  // === 8. SECURITY ===
  children.push(h1("8. Security Considerations"));
  children.push(bullet("Input validation on all API routes (required fields, format checks)"));
  children.push(bullet("Image upload validation: type checking, size limit (10MB), format verification"));
  children.push(bullet("Base64 data URL format validation for selfie uploads"));
  children.push(bullet("Error messages sanitized to avoid leaking internal details"));
  children.push(bullet("AI SDK credentials managed via .z-ai-config file (not in source code)"));
  children.push(bullet("Selfie data processed in-memory only, not persisted to database"));
  children.push(bullet("Job data auto-cleaned after 10 minutes (privacy by design)"));
  children.push(bullet("SQL injection prevention via Prisma ORM parameterized queries"));

  // === 9. KNOWN LIMITATIONS ===
  children.push(h1("9. Known Limitations & Future Roadmap"));

  children.push(h2("9.1 Current Limitations"));
  const limitations = [
    ["AI Face Preservation", "The image edit API does not perfectly preserve facial features from the original selfie. VLM verification scores are typically 1-10 for face matching. This is an SDK-level limitation."],
    ["No User Authentication", "The application does not implement user accounts or authentication. Cart and orders are session-based."],
    ["In-Memory Job Storage", "AI try-on jobs are stored in memory and lost on server restart. A persistent queue would improve reliability."],
    ["No Payment Integration", "Checkout is simulated without real payment gateway integration."],
    ["Single-Page Architecture", "All views render in a single route (/), which limits SEO and deep-linking capabilities."],
    ["No Product Reviews", "Review data is seeded but there is no user review submission feature."],
  ];
  children.push(makeTable(["Limitation", "Details"], limitations, [25, 75]));

  children.push(h2("9.2 Future Roadmap"));
  const roadmap = [
    ["Non-Blocking Try-On", "Allow browsing other products while AI generation is in progress"],
    ["Add to Cart for Suggestions", "Direct add-to-cart button on AI suggestion cards (partially implemented)"],
    ["Product Image Carousel", "Carousel of product images during AI generation wait time"],
    ["User Authentication", "NextAuth.js integration for user accounts and saved preferences"],
    ["Persistent Job Queue", "Redis or database-backed job queue for AI try-on reliability"],
    ["Payment Gateway", "Stripe or Razorpay integration for real payment processing"],
    ["SEO Optimization", "Individual product pages with server-side rendering for search engines"],
    ["Admin Dashboard", "Product management, order fulfillment, and analytics dashboard"],
  ];
  children.push(makeTable(["Feature", "Description"], roadmap, [25, 75]));

  return children;
}

// ── Document Assembly ─────────────────────────────────────────────
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: P.body },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: {
          run: { font: "Times New Roman", size: 32, bold: true, color: P.primary },
          paragraph: { spacing: { before: 360, after: 160, line: 312 } },
        },
        heading2: {
          run: { font: "Times New Roman", size: 28, bold: true, color: P.primary },
          paragraph: { spacing: { before: 280, after: 120, line: 312 } },
        },
        heading3: {
          run: { font: "Times New Roman", size: 24, bold: true, color: P.primary },
          paragraph: { spacing: { before: 200, after: 100, line: 312 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [
      // Cover section
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          },
        },
        children: buildCover(),
      },
      // TOC section
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "3 BOXES LUXURY - Technical Documentation", size: 16, font: "Calibri", color: P.secondary, italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 18, font: "Calibri", color: P.secondary }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: P.secondary }),
              ],
            })],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 300 },
            children: [new TextRun({ text: "Table of Contents", size: 32, bold: true, font: "Times New Roman", color: P.primary })],
          }),
          new TableOfContents("Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-3",
          }),
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [new TextRun({ text: "Note: Right-click the TOC and select 'Update Field' to refresh page numbers.", size: 18, font: "Calibri", color: P.secondary, italics: true })],
          }),
          new Paragraph({ children: [new PageBreak()] }),
        ],
      },
      // Body section
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "3 BOXES LUXURY - Technical Documentation", size: 16, font: "Calibri", color: P.secondary, italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 18, font: "Calibri", color: P.secondary }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: P.secondary }),
              ],
            })],
          }),
        },
        children: buildBody(),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("public/3BOXES-LUXURY-Technical-Documentation.docx", buffer);
  console.log("Document generated successfully: public/3BOXES-LUXURY-Technical-Documentation.docx");
}

main().catch(console.error);
