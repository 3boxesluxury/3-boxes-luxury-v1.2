# 3 BOXES LUXURY — AI Virtual Try-On Wiki

> **Complete documentation hub for the AI Virtual Try-On feature by 3 BOXES GIFTS**

---

## 📋 Documentation Index

| # | Document | Description | Audience |
|---|----------|-------------|----------|
| 1 | [Technical Documentation](./TECHNICAL-DOCUMENTATION.md) | Complete code-level documentation covering architecture, pipeline, API specs, and implementation details | Developers, Patent Attorneys |
| 2 | [Functional Documentation & Training Guide](./FUNCTIONAL-DOCUMENTATION.md) | User-facing feature guide, test cases, training scripts, and QA procedures | Product Managers, QA, Content Managers |
| 3 | [Training Videos](./TRAINING-VIDEOS.md) | Video walkthroughs and screencast tutorials for the AI Virtual Try-On feature | Content Managers, Marketing, New Team Members |
| 4 | [Patent Research & Prior Art Analysis](./PATENT-RESEARCH.md) | Comprehensive patent landscape analysis, prior art review, white space identification, and litigation context | Patent Attorneys, Legal, Executives |
| 5 | [Architecture Deep Dive](./ARCHITECTURE-DEEP-DIVE.md) | In-depth architectural analysis covering system design decisions, data flow internals, deployment topology, and scalability considerations | Senior Developers, Architects, CTO |
| 6 | [Patent Application](../patent/PATENT-APPLICATION.md) | Draft patent application with claims, prior art analysis, and filing guide | Patent Attorneys, Legal |
| 7 | [Vercel Deployment Wiki](../VERCEL-WIKI.md) | Quick reference for deploying to Vercel | DevOps, Developers |
| 8 | [Vercel Deployment Guide](../VERCEL-DEPLOYMENT-GUIDE.md) | Detailed Vercel deployment instructions | DevOps, Developers |

---

## 🤖 AI Virtual Try-On — Feature Summary

The **3 BOXES LUXURY AI Virtual Try-On** is a multi-strategy AI image generation system that allows users to upload selfies and see luxury products (jewelry, sarees, watches, etc.) virtually worn on them. It is the **first virtual try-on system purpose-built for luxury gift boxes and non-wearable gift items**, representing a significant white space in the patent landscape.

### Key Capabilities

- **4 AI Generation Strategies** with automatic best-result selection
- **VLM Verification** — Vision Language Model scores each result for color/shape/face accuracy
- **Color Accuracy Refinement** — automatic refinement when color matching is below threshold
- **8 Product Categories** — Jewelry, Sarees, Watches, Fashion, Men's Shirts, Leather Goods, Fragrances, Home & Living
- **Cross-Platform** — Works on Web, Vercel serverless, and Android PWA
- **Fallback Mechanism** — Canvas overlay when AI service is unavailable
- **Watermarking** — "3BOXES GIFTS - AI Style Preview" branding on all generated images
- **Product Pairing Suggestions** — AI-recommended complementary products
- **Luxury Gift Box VTO** — Virtual try-on for non-wearable gift items and luxury gift boxes (unique in the market)

### How It Works

1. **User uploads a selfie** and selects a luxury product
2. **The system analyzes** the product colors, materials, and category using VLM
3. **Four AI strategies** generate candidate try-on images in priority order
4. **VLM verification** scores each candidate on color accuracy, product fidelity, face preservation, and overall quality
5. **The best result** is selected; if color accuracy is below 7/10, a refinement loop activates
6. **The final image** is watermarked and delivered to the user with AI quality scores

---

## 🏛️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                                │
│              TryOnDialog (4-step flow)                                │
│   Upload → Preview → Generating → Result                             │
│   + Canvas Fallback (client-side overlay when AI unavailable)        │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   API Route      │
                   │  /api/try-on     │
                   │  POST + GET      │
                   └────┬───────┬────┘
                        │       │
          ┌─────────────▼──┐ ┌──▼──────────────┐
          │  Direct ZAI    │ │  Proxy to       │
          │  SDK (Local)   │ │  Sandbox        │
          │                │ │  (Vercel)       │
          └────┬───────────┘ └──┬──────────────┘
               │                │
          ┌────▼────────────────▼────┐
          │   AI Pipeline (6 Phases)  │
          │  0. Suggestions (bg)      │
          │  1. Product Analysis (VLM)│
          │  2. Multi-Strategy Gen    │
          │     A: Dual-Image Edit    │
          │     B: Selfie-Edit        │
          │     C: Product-Edit       │
          │     D: Text-to-Image      │
          │  3. VLM Verification      │
          │  4. Color Refinement       │
          │  5. Watermark + Deliver    │
          └────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   ZAI SDK            │
          │   glm-4v-plus (VLM)  │
          │   images.generations │
          │     .edit()          │
          │     .create()        │
          └─────────────────────┘
```

### Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                     3 BOXES GIFTS Platform                          │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Frontend (React)│───▶│  API Routes       │───▶│  AI Pipeline  │  │
│  │  product-detail  │    │  /api/try-on      │    │  try-on-pipe  │  │
│  │  TryOnDialog     │    │  /api/try-on/     │    │               │  │
│  │                  │◀───│  /api/config       │◀───│  VLM Helpers  │  │
│  │  Canvas Fallback │    │  /api/try-on/      │    │  Gen Helpers  │  │
│  │  Image Compress  │    │  /api/remote       │    │  Watermark    │  │
│  └─────────────────┘    └──────────────────┘    └───────┬───────┘  │
│                                                          │          │
│                                  ┌───────────────────────┘          │
│                                  ▼                                  │
│                         ┌─────────────────┐                         │
│                         │   ZAI SDK        │                         │
│                         │   (z-ai-web-     │                         │
│                         │    dev-sdk)      │                         │
│                         │                  │                         │
│                         │  ▶ glm-4v-plus   │  (VLM analysis &       │
│                         │    (Vision LM)   │   verification)        │
│                         │                  │                         │
│                         │  ▶ images.       │  (Image generation &   │
│                         │    generations   │   editing)             │
│                         └────────┬─────────┘                        │
│                                  │                                  │
│              ┌───────────────────┼───────────────────────┐          │
│              ▼                   ▼                       ▼          │
│     ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐      │
│     │  Local Sandbox│  │  Vercel Serverless│  │  Sharp Image │      │
│     │  Direct Access│  │  Proxy → Sandbox │  │  Watermark   │      │
│     │  (172.25.x.x) │  │  (.space-z.ai)   │  │  Processing  │      │
│     └──────────────┘  └──────────────────┘  └──────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Pipeline Performance Summary

| Strategy | Typical Color Score | Typical Face Score | Speed | Best For |
|----------|-------------------:|-------------------:|-------|----------|
| Dual-Image Edit (A) | 7–9 | 8–9 | ~30s | Jewelry, Watches (highest color fidelity) |
| Selfie-Edit (B) | 5–7 | 9–10 | ~25s | Face-preserving results, simpler products |
| Product-Edit (C) | 8–9 | 3–5 | ~25s | Sarees, full-body products (best color, lower face match) |
| Text-to-Image (D) | 3–6 | 2–4 | ~20s | Ultimate fallback, inspirational images |
| Canvas Overlay | N/A | N/A | <1s | Service outage fallback (no AI generation) |

### VLM Scoring Weights

| Criterion | Weight | Rationale |
|-----------|--------|-----------|
| Color Accuracy | 0.35 | Highest priority for luxury products |
| Product Fidelity | 0.25 | Design and pattern accuracy |
| Placement Realism | 0.20 | Natural product positioning |
| Face Preservation | 0.10 | User recognition |
| Overall Quality | 0.10 | Photorealistic composite quality |

### Refinement Loop

- **Trigger**: Color Accuracy score < 7/10 on best candidate
- **Max iterations**: 2
- **Typical improvement**: +1.5 to +3.0 points on color accuracy
- **Mechanism**: VLM extracts hex-code-level color mismatches → targeted correction prompt → re-verify

---

## 🔬 Patent Status — Comprehensive Analysis

### Executive Summary

Our patent research has identified **13 existing patents** in the virtual try-on space. **Critically, no existing patent covers virtual try-on for luxury gift boxes or non-wearable gift items.** This represents a significant **white space** in the patent landscape that our system uniquely occupies.

### White Space Finding

> **"Luxury gift box virtual try-on using AI image generation" is NOT patented.**
>
> This is a clear WHITE SPACE in the patent landscape. All existing VTO patents focus exclusively on wearable products (clothing, jewelry, eyewear, makeup). No patents exist for VTO of non-wearable gift items or gift boxes.

### Existing Patents Identified (13 Patents)

| # | Patent | Assignee | Title | Focus Area | Relevance to Our System |
|---|--------|----------|-------|------------|------------------------|
| 1 | US 11,830,118 | Snap Inc. | AR-based virtual try-on using camera overlay | Wearable AR try-on (clothing, accessories) | AR overlay approach; no AI image generation, no VLM verification, no color refinement |
| 2 | US 11,315,162 | Amazon | Virtual try-on with generative AI for clothing | AI-generated clothing try-on | Single-strategy (clothing only); no multi-strategy pipeline, no VLM verification, no gift boxes |
| 3 | US 11,158,121 B1 | Google | Generating realistic clothing for body pose | Single-image clothing generation | Optimizes for body pose; no multi-strategy, no color accuracy focus, no VLM scoring |
| 4 | US 8,275,590 | Zugara | AR virtual try-on system with video overlay | Real-time AR video overlay for clothing | **KEY RISK**: Broad AR overlay patent; active litigation (see below) |
| 5 | US 10,482,517 B2 | Zugara | Social shopping with AR virtual try-on | AR try-on with social sharing | **KEY RISK**: Extends AR overlay to social commerce; active litigation |
| 6 | CN104021590A | — | Virtual try-on system using AR technology | AR-based clothing try-on | AR approach; no AI generation, no VLM verification |
| 7 | US 12,205,209 B1 | — | Virtual try-on based on predetermined cloth | Single-strategy with cloth models | No multi-strategy, no color refinement, no VLM |
| 8 | US 2022/0318892 A1 | — | Clothing virtual try-on based on deep learning | Deep learning clothing try-on | Single model; no quality verification, no color refinement |
| 9 | US 6,546,309 B1 | — | Virtual fitting room | Mathematical body model | Geometric fitting; no AI generation, no VLM |
| 10 | US 12,017,142 B2 | — | AR/AI-based virtual try-on with real-time calibration | Real-time AR+AI try-on | Single strategy, no VLM verification, no color refinement |
| 11 | US 2020/0183969 A1 | — | Virtual dressing utilizing image | Basic image overlay | No AI pipeline, no verification, no refinement |
| 12 | US 5,930,769 A | — | Fashion shopping system with virtual mannequin | 2D mannequin display | Template-based; no generative AI |
| 13 | GB 2488237 A | — | Body model of user to show fit of clothing | Body model for fit visualization | Body modeling approach; no AI generation |

### Prior Art Also Reviewed

| Patent | Title | Relevance |
|--------|-------|-----------|
| EP 3,877,954 A4 | Learning-based animation of clothes (Meta) | Avatar animation, not e-commerce try-on; no VLM, no color refinement |
| US 2015/0154691 A1 | Online virtual fitting room with 3D scanning | Requires 3D scanning hardware; not AI image generation |

### Litigation Context — Active VTO Patent Enforcement

Zugara Inc. is actively enforcing its VTO patents, creating the most significant risk in the space:

| Case | Date | Defendant | Alleged Infringement | Status |
|------|------|-----------|----------------------|--------|
| Zugara vs Chanel | 2024 | Chanel | AR virtual try-on of beauty/makeup products | Active — significant industry attention |
| Zugara vs Warby Parker | Filed | Warby Parker | AR eyewear virtual try-on | Active |
| Zugara vs Estée Lauder | Filed | Estée Lauder | AR beauty product try-on | Active |

**Key observation**: All Zugara enforcement actions target **wearable product try-on** (makeup, eyewear, clothing). None involve non-wearable items or gift boxes, further confirming the white space.

### Risk Assessment

| Risk Factor | Level | Details |
|-------------|-------|---------|
| Zugara AR overlay patents (US 8,275,590 & US 10,482,517 B2) | **Medium** | Broad AR overlay claims; however, our system uses AI image generation (not real-time AR overlay), operates on different technical principles, and targets different product categories |
| Snap Inc. (US 11,830,118) | **Low** | Focused on AR camera overlay; our system is AI image generation-based, not real-time AR |
| Amazon (US 11,315,162) | **Low** | Clothing-specific generative AI; our system covers non-wearable gift items with multi-strategy pipeline |
| Google (US 11,158,121 B1) | **Low** | Body pose optimization for clothing; our system addresses different problem (color accuracy + luxury gift boxes) |
| Other patents | **Very Low** | Older, narrower, or irrelevant technology approaches |

### Patentability of Our System

Our system contains **9 novel aspects** not found in any existing patent:

1. **Multi-Strategy Pipeline with VLM Verification** — No existing patent uses VLM to independently verify and score try-on results
2. **Dual-Image Edit with Product Color Fidelity** — Simultaneously passing selfie + product image to AI model is novel
3. **Category-Aware Prompt Engineering** — Dynamic prompt adjustment by product category/sub-category
4. **Color Accuracy Refinement Loop** — Iterative refinement based on VLM-extracted hex-code color mismatches
5. **Hex-Code-Based Color Extraction** — VLM extracts specific hex codes for color correction
6. **Luxury E-Commerce Integration** — Shopify + affiliate platform integration with pairing suggestions
7. **Cross-Platform Deployment with Proxy Architecture** — Intelligent proxy routing for local/Vercel/mobile
8. **Canvas Overlay Fallback** — Premium client-side fallback when AI services are unavailable
9. **Automatic Watermarking** — Sharp-based watermarking for brand protection

**Additionally novel (white space):**
- **Virtual try-on for luxury gift boxes** — No patent exists for VTO of non-wearable gift items
- **AI image generation for gift presentation preview** — Completely unpatented territory

**Conclusion**: Our system's combination of multi-strategy generation + VLM verification + color refinement loop + luxury gift box VTO is novel and patentable. The gift box application represents an entirely new use case for VTO technology.

For full patent analysis and draft application, see:
- [Patent Research & Prior Art Analysis](./PATENT-RESEARCH.md)
- [Patent Application Document](../patent/PATENT-APPLICATION.md)

---

## 🛠️ Quick Start

### Local Development

```bash
# 1. Clone the repository
git clone <repo-url>
cd my-project

# 2. Install dependencies
bun install

# 3. Ensure ZAI SDK is configured
cat .z-ai-config  # Should contain baseUrl and apiKey
# Expected format:
# {
#   "baseUrl": "http://172.25.x.x:8080/v1",
#   "apiKey": "<your-api-key>"
# }

# 4. Set up the database (if using Prisma)
bun run db:push

# 5. Start the development server
bun run dev

# 6. Navigate to any product → Click "Style Preview"
#    The app runs at http://localhost:3000
```

### Vercel Deployment

```bash
# 1. Set environment variables in Vercel dashboard or CLI
ZAI_PROXY_URL=https://your-sandbox.space-z.ai  # Public proxy URL to sandbox
DATA_SOURCE=shopify                              # Product data source

# Optional: Direct AI access (if available on Vercel)
ZAI_BASE_URL=https://your-ai-endpoint/v1
ZAI_API_KEY=your-api-key

# 2. Deploy
npx vercel --prod --token YOUR_TOKEN --yes

# 3. Verify deployment
# - Check /api/try-on/status endpoint
# - Test a virtual try-on request
```

For detailed Vercel instructions, see the [Vercel Deployment Wiki](../VERCEL-WIKI.md) or [Vercel Deployment Guide](../VERCEL-DEPLOYMENT-GUIDE.md).

---

## 📁 Project File Structure (AI Try-On Related)

```
src/
├── app/
│   ├── api/
│   │   ├── try-on/
│   │   │   ├── route.ts          # Main try-on API endpoint (POST + GET)
│   │   │   ├── status/route.ts   # Health check endpoint
│   │   │   └── remote/route.ts   # Proxy forwarding route
│   │   ├── config/
│   │   │   └── route.ts          # Configuration endpoint (proxy URL, AI availability)
│   │   └── image-proxy/
│   │       └── route.ts          # CORS-safe product image proxy
│   ├── page.tsx                   # Main application page
│   └── layout.tsx                 # Root layout with providers
├── components/
│   ├── product-detail.tsx         # TryOnDialog + ProductDetail components
│   └── ui/                        # shadcn/ui components (Dialog, Button, Badge, etc.)
├── lib/
│   ├── zai.ts                     # ZAI SDK configuration and health checks
│   ├── try-on-pipeline.ts         # Core AI pipeline (6 phases, 4 strategies)
│   ├── watermark.ts               # Image watermarking with Sharp
│   └── db.ts                      # Prisma database client
├── hooks/
│   └── usePWAInstall.ts           # PWA install hook (Android)
└── stores/
    └── ...                        # Zustand client state stores

prisma/
└── schema.prisma                  # Database schema (products, categories)

public/
└── images/
    └── logo.png                   # Brand logo for watermark compositing

docs/
├── wiki/
│   ├── HOME.md                        # This file — documentation hub
│   ├── TECHNICAL-DOCUMENTATION.md     # Complete technical docs
│   ├── FUNCTIONAL-DOCUMENTATION.md    # Functional docs + training
│   ├── TRAINING-VIDEOS.md             # Video walkthroughs and tutorials
│   ├── PATENT-RESEARCH.md             # Patent landscape analysis & prior art
│   └── ARCHITECTURE-DEEP-DIVE.md      # In-depth architecture analysis
├── patent/
│   └── PATENT-APPLICATION.md          # Draft patent application
├── VERCEL-WIKI.md                     # Vercel deployment quick ref
└── VERCEL-DEPLOYMENT-GUIDE.md         # Vercel deployment guide
```

---

## 📚 Documentation Links — Quick Reference

### Wiki Pages

| Page | Link | Key Topics |
|------|------|------------|
| Home (this page) | [HOME.md](./HOME.md) | Overview, patent status, architecture, quick start |
| Technical Docs | [TECHNICAL-DOCUMENTATION.md](./TECHNICAL-DOCUMENTATION.md) | Code walkthrough, API specs, pipeline phases, configuration |
| Functional Docs | [FUNCTIONAL-DOCUMENTATION.md](./FUNCTIONAL-DOCUMENTATION.md) | User guide, test cases, QA procedures, training |
| Training Videos | [TRAINING-VIDEOS.md](./TRAINING-VIDEOS.md) | Video walkthroughs, screencasts, tutorials |
| Patent Research | [PATENT-RESEARCH.md](./PATENT-RESEARCH.md) | 13-patent analysis, white space identification, litigation context, risk assessment |
| Architecture Deep Dive | [ARCHITECTURE-DEEP-DIVE.md](./ARCHITECTURE-DEEP-DIVE.md) | System design decisions, data flow internals, scalability, deployment topology |

### Other Documents

| Document | Link | Key Topics |
|----------|------|------------|
| Patent Application | [PATENT-APPLICATION.md](../patent/PATENT-APPLICATION.md) | Draft claims, prior art analysis, filing instructions |
| Vercel Wiki | [VERCEL-WIKI.md](../VERCEL-WIKI.md) | Quick Vercel deployment reference |
| Vercel Guide | [VERCEL-DEPLOYMENT-GUIDE.md](../VERCEL-DEPLOYMENT-GUIDE.md) | Detailed Vercel deployment walkthrough |

---

## 📞 Contact & Support

For questions about this documentation or the AI Virtual Try-On feature, contact the 3 BOXES LUXURY development team.

---

*Last updated: March 2025*
