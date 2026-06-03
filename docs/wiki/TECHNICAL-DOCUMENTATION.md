# 3 BOXES LUXURY — AI Virtual Try-On: Technical Documentation

**Document Version:** 2.0  
**Last Updated:** 2025-03-04  
**Classification:** Confidential — Patent Reference & Developer Guide  
**System:** 3 BOXES GIFTS E-Commerce Platform — AI Virtual Try-On Module  

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Component-by-Component Technical Breakdown](#3-component-by-component-technical-breakdown)
4. [API Specifications](#4-api-specifications)
5. [Pipeline Phase Details](#5-pipeline-phase-details)
6. [Prompt Engineering Details](#6-prompt-engineering-details)
7. [Category Configuration Details](#7-category-configuration-details)
8. [Error Handling & Fallback Mechanisms](#8-error-handling--fallback-mechanisms)
9. [Performance Considerations](#9-performance-considerations)
10. [Security Considerations](#10-security-considerations)
11. [Deployment Topology](#11-deployment-topology)
12. [Configuration Reference](#12-configuration-reference)
13. [Code Walkthrough with Line-by-Line Explanations](#13-code-walkthrough-with-line-by-line-explanations)

---

## 1. System Architecture Overview

### 1.1 High-Level Description

The AI Virtual Try-On is a **multi-strategy AI image generation system** that enables users of the 3 BOXES GIFTS luxury e-commerce platform to upload a selfie photograph and see products — including jewelry, sarees, watches, fashion apparel, leather goods, fragrances, and home-living items — virtually "worn" or "placed" on them. The system generates photorealistic composite images using a Vision-Language Model (VLM) for analysis and verification, and an image generation/editing AI service for synthesis.

### 1.2 Architectural Principles

| Principle | Implementation |
|-----------|---------------|
| **Multi-Strategy Generation** | Four distinct generation strategies (A–D) attempted in priority order, ensuring at least one produces a usable result |
| **VLM-in-the-Loop Verification** | Every generated result is scored by a VLM on color, shape, face, and overall accuracy (0–10 scale) |
| **Automatic Refinement** | If the best result scores below 7/10 on color accuracy, an automatic refinement pass is triggered with specific correction instructions |
| **Graceful Degradation** | When AI services are unavailable, the system falls back to client-side canvas overlay compositing |
| **Dual-Environment Operation** | Runs identically on local sandbox (direct AI access) and Vercel serverless (proxy-based access) |
| **Category-Aware Prompts** | Product category determines placement instructions, image dimensions, color focus areas, and body type framing |

### 1.3 System Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        3 BOXES GIFTS Platform                       │
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

### 1.4 Technology Stack

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| Framework | Next.js | 16 (App Router) |
| Language | TypeScript | Strict mode |
| AI SDK | z-ai-web-dev-sdk | ^0.0.17 |
| VLM Model | glm-4v-plus | Vision-language model for analysis & verification |
| Image Generation | ZAI images.generations | Edit (single/dual image) and Create (text-to-image) |
| Image Processing | Sharp | Server-side watermark compositing |
| Frontend | React 19, Framer Motion | Client-side UI & animations |
| State | Zustand | Client-side store |
| Data Fetching | TanStack React Query | Server state management |
| UI Library | shadcn/ui | Dialog, Button, Badge, etc. |
| Database | Prisma ORM | Product lookup (local sandbox) |
| External Products | Shopify API | Fallback product data source |

---

## 2. Data Flow Diagrams

### 2.1 Primary Data Flow — End-to-End

```
USER                    CLIENT (Browser)              SERVER (Next.js API)           AI PIPELINE
 │                           │                              │                           │
 │  1. Click "Style Preview" │                              │                           │
 │──────────────────────────▶│                              │                           │
 │                           │  2. Open TryOnDialog         │                           │
 │                           │     (upload step)            │                           │
 │  3. Upload selfie file    │                              │                           │
 │──────────────────────────▶│                              │                           │
 │                           │  4. Client-side compress     │                           │
 │                           │     1536px max, 0.92 quality │                           │
 │                           │     → base64 data URL        │                           │
 │                           │                              │                           │
 │  5. Click "Create Preview"│                              │                           │
 │──────────────────────────▶│                              │                           │
 │                           │  6. Pre-fetch product img    │                           │
 │                           │     as base64 (client-side)  │                           │
 │                           │                              │                           │
 │                           │  7. POST /api/try-on         │                           │
 │                           │     { productId, selfieData, │                           │
 │                           │       productImageBase64,    │                           │
 │                           │       productName,           │                           │
 │                           │       categorySlug }         │                           │
 │                           │─────────────────────────────▶│                           │
 │                           │                              │                           │
 │                           │                              │  8. Check deployment env   │
 │                           │                              │     ├─ Vercel: Proxy/SDK  │
 │                           │                              │     └─ Local: Direct SDK  │
 │                           │                              │                           │
 │                           │                              │  9. Resolve product image  │
 │                           │                              │     (HTTP/filesystem/URL)  │
 │                           │                              │                           │
 │                           │                              │  10. Create job ID         │
 │                           │                              │      job_<timestamp>_<rng> │
 │                           │                              │                           │
 │                           │                              │  11. Start pipeline async  │
 │                           │                              │──────────────────────────▶│
 │                           │                              │                           │
 │                           │  12. Return { jobId, status: │                           │
 │                           │      "processing" }          │                           │
 │                           │◀─────────────────────────────│                           │
 │                           │                              │                           │
 │                           │  13. Poll GET /api/try-on    │                           │
 │                           │      ?jobId=<jobId>          │                           │
 │                           │      (every 2s, max 120x)    │                           │
 │                           │─────────────────────────────▶│                           │
 │                           │                              │  14. Return job state      │
 │                           │◀─────────────────────────────│                           │
 │                           │                              │                           │
 │                           │        ... polling ...       │                           │
 │                           │                              │                           │
 │                           │                              │     PIPELINE EXECUTION:    │
 │                           │                              │     Phase 1: VLM Product  │
 │                           │                              │     Analysis + Person Desc │
 │                           │                              │                           │
 │                           │                              │     Phase 2: Multi-Strategy│
 │                           │                              │     Generation (A→B→C→D)  │
 │                           │                              │                           │
 │                           │                              │     Phase 3: VLM Verify   │
 │                           │                              │     & Select Best          │
 │                           │                              │                           │
 │                           │                              │     Phase 4: Refinement    │
 │                           │                              │     (if colorScore < 7)    │
 │                           │                              │                           │
 │                           │                              │     Phase 5: Watermark     │
 │                           │                              │                           │
 │                           │  15. Poll returns completed  │                           │
 │                           │      { imageUrl, strategy,   │                           │
 │                           │        colorAccuracy,         │                           │
 │                           │        faceAccuracy,          │                           │
 │                           │        suggestions }          │                           │
 │                           │◀─────────────────────────────│                           │
 │                           │                              │                           │
 │  16. Display result image │                              │                           │
 │◀─────────────────────────│                              │                           │
 │      with AI scores       │                              │                           │
```

### 2.2 Vercel Deployment — Proxy Data Flow

```
CLIENT (Browser)          VERCEL (Serverless)           SANDBOX (AI Host)
     │                          │                            │
     │  POST /api/try-on        │                            │
     │─────────────────────────▶│                            │
     │                          │                            │
     │                          │  Strategy 1: Proxy         │
     │                          │  POST <proxyUrl>/api/try-on│
     │                          │───────────────────────────▶│
     │                          │                            │
     │                          │  Return { jobId }          │
     │                          │◀───────────────────────────│
     │                          │                            │
     │  Return { jobId }        │                            │
     │◀─────────────────────────│                            │
     │                          │                            │
     │  Poll /api/try-on        │                            │
     │  ?jobId=<id>             │                            │
     │─────────────────────────▶│                            │
     │                          │                            │
     │                          │  Job not found locally     │
     │                          │  → Proxy GET <proxyUrl>    │
     │                          │    /api/try-on?jobId=<id>  │
     │                          │───────────────────────────▶│
     │                          │                            │
     │                          │  Return job state          │
     │                          │◀───────────────────────────│
     │                          │                            │
     │  Return job state        │                            │
     │◀─────────────────────────│                            │
```

### 2.3 Canvas Fallback Data Flow

```
CLIENT (Browser)                    SERVER (Vercel)
     │                                    │
     │  POST /api/try-on                  │
     │───────────────────────────────────▶│
     │                                    │
     │  Return { mode: "canvas",          │
     │    productImageBase64,             │
     │    code: "AI_CANVAS_MODE" }        │
     │◀───────────────────────────────────│
     │                                    │
     │  Attempt direct client→proxy:      │
     │  POST <proxyUrl>/api/try-on        │
     │──────────────┐                     │
     │              │ (direct to sandbox) │
     │◀─────────────┘                     │
     │                                    │
     │  If proxy also fails:              │
     │  generateCanvasFallback()          │
     │  → Canvas composite of             │
     │    selfie + product overlay        │
     │  → Return as base64 data URL       │
     │                                    │
```

### 2.4 Pipeline Internal Data Flow

```
                    ┌─────────────────────┐
                    │  Pipeline Input     │
                    │  jobId              │
                    │  productName        │
                    │  categorySlug       │
                    │  selfieData (base64)│
                    │  productImageBase64 │
                    │  suggestionsPromise │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │  Phase 0:           │
                    │  Fetch suggestions  │
                    │  (background)       │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼                               ▼
    ┌──────────────────┐            ┌──────────────────┐
    │  Phase 1a:       │            │  Phase 1b:        │
    │  VLM Product     │  (parallel)│  VLM Person       │
    │  Analysis        │            │  Description      │
    │  (glm-4v-plus)   │            │  (glm-4v-plus)    │
    └────────┬─────────┘            └────────┬─────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Phase 2:          │
                   │  Multi-Strategy    │
                   │  Generation        │
                   │                    │
                   │  A: Dual-image     │ ◀── PRIMARY (selfie+product)
                   │  B: Selfie-edit    │ ◀── (selfie + text desc)
                   │  C: Product-edit   │ ◀── (product + person desc)
                   │  D: Text-to-image  │ ◀── FALLBACK (text only)
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Phase 3:          │
                   │  VLM Verification  │
                   │  & Selection       │
                   │                    │
                   │  For each result:  │
                   │  vlmCompare(       │
                   │    result, product)│
                   │  → Score 0-10      │
                   │  → Pick best       │
                   │  → Early stop if   │
                   │    colorScore >= 8 │
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Phase 4:          │
                   │  Refinement Pass   │
                   │  (if colorScore<7) │
                   │                    │
                   │  Edit best result  │
                   │  with correction   │
                   │  → Re-verify      │
                   │  → Use if better   │
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Phase 5:          │
                   │  Record Scores     │
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Phase 6:          │
                   │  Watermark +       │
                   │  Deliver           │
                   │  (Sharp SVG/PNG)   │
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │  Job Complete      │
                   │  status: completed │
                   │  imageUrl: base64  │
                   │  strategy: "...-"  │
                   │  colorAccuracy: N  │
                   │  faceAccuracy: N   │
                   │  totalPasses: 1-2  │
                   └───────────────────┘
```

---

## 3. Component-by-Component Technical Breakdown

### 3.1 `src/lib/try-on-pipeline.ts` — Core AI Pipeline (763 lines)

**Purpose:** Orchestrates the entire multi-phase AI virtual try-on generation process. This is the "brain" of the system.

#### 3.1.1 Type Definitions

```typescript
type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'
```

Seven supported image dimensions corresponding to different aspect ratios:
- `1024x1024` — Square (1:1)
- `768x1344` — Tall portrait (9:16 approx) — Used for sarees, fashion
- `864x1152` — Portrait (3:4) — Used for jewelry, watches, leather goods
- `1344x768` — Landscape (16:9 approx) — Used for home-living
- `1152x864` — Landscape (4:3)
- `1440x720` — Wide landscape (2:1)
- `720x1440` — Tall portrait (1:2)

```typescript
export interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number
  progress?: string
  suggestions?: any[]
  pipelinePhase?: string
  colorAccuracy?: number
  faceAccuracy?: number
  strategy?: string
  totalPasses?: number
}
```

The `TryOnJob` interface tracks the complete lifecycle of a single virtual try-on request. Key fields:
- **`status`**: Tri-state lifecycle — `processing` → `completed` or `failed`
- **`imageUrl`**: The final watermarked result as a base64 data URL
- **`pipelinePhase`**: Current phase for progress reporting (`product-analysis`, `generation`, `verification`, `refinement`, `watermark`, `complete`)
- **`strategy`**: Which generation strategy produced the final result (e.g., `dual-image-edit`, `edit-selfie-refined`, `canvas-fallback`)
- **`colorAccuracy`/`faceAccuracy`**: VLM-verified scores (0–10) for product color matching and face preservation
- **`totalPasses`**: Number of generation passes (1 for direct, 2 if refinement was applied)

#### 3.1.2 Job Storage System

```typescript
const jobs = new Map<string, TryOnJob>()
```

An **in-memory Map** is used for job storage with a **15-minute TTL** (time-to-live) cleanup mechanism:

```typescript
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 15 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)
```

**Design rationale:** 
- The in-memory store is sufficient because the system runs on a single server instance (sandbox) or is proxied through a single gateway.
- The 15-minute TTL prevents memory leaks from abandoned jobs.
- The cleanup runs every 5 minutes, meaning a job can survive up to 20 minutes before being cleaned up (15 min TTL + 5 min interval).
- On Vercel serverless, jobs live on the sandbox, not the serverless function, so the in-memory store persists correctly.

Three exported functions manage the job lifecycle:
- `createJob(id, data)` — Initializes a new job with `status: 'processing'` and default progress message
- `getJob(id)` — Retrieves job by ID, returns `undefined` if not found or expired
- `deleteJob(id)` — Removes job from the store

#### 3.1.3 Rate Limiting

```typescript
const API_CALL_DELAY = 1200  // milliseconds
```

A 1.2-second delay between sequential AI API calls prevents rate limiting from the ZAI service. The `delay()` helper returns a `Promise<void>` that resolves after the specified duration.

#### 3.1.4 VLM Helper Functions

**`vlmAnalyze(prompt, imageUrl, timeoutMs = 30000)`** — Lines 184–203

Performs single-image VLM analysis using `glm-4v-plus`. The function:
1. Creates a ZAI SDK instance
2. Calls `zai.chat.completions.createVision()` with a user message containing text + image
3. Uses `Promise.race()` with a timeout to prevent hanging (default 30s)
4. Returns the VLM's text response, or empty string on failure/timeout
5. Uses `thinking: { type: 'disabled' }` to disable chain-of-thought for faster responses

**`vlmCompare(prompt, image1Url, image2Url, timeoutMs = 45000)`** — Lines 205–225

Performs dual-image VLM comparison. Identical structure to `vlmAnalyze` but:
- Accepts **two** image URLs in the message content array
- Has a longer default timeout (45s) because comparison is more compute-intensive
- Used for Phase 3 (verification) and Phase 4 (refinement verification)

Both functions have **graceful error handling** — they return empty strings on failure, allowing the pipeline to continue with degraded information rather than crashing.

#### 3.1.5 Image Generation Helper Functions

**`safeImageEdit(prompt, imageUrl, size)`** — Lines 233–250

Single-image edit using `zai.images.generations.edit()`:
- Passes the image in `images: [{ url: imageUrl }]` format
- Returns `data:image/png;base64,<base64>` on success
- Returns `null` on failure (logged, not thrown)
- Uses `as any` type assertion because the SDK's TypeScript definitions don't fully support the `images` array parameter

**`safeImageEditDual(prompt, selfieUrl, productUrl, size)`** — Lines 259–284

**KEY INNOVATION** — Dual-image edit, the PRIMARY generation strategy:
- Passes **both** selfie and product images in the `images` array
- The AI model can directly observe both the person and the product, dramatically improving color accuracy
- Eliminates the need for the model to "guess" colors from text descriptions
- Returns base64 data URL on success, `null` on failure

**`safeImageCreate(prompt, size)`** — Lines 286–302

Text-to-image generation using `zai.images.generations.create()`:
- No input images — pure text-to-image generation
- Used as Strategy D (last resort fallback)
- Has the lowest quality ceiling because it cannot reference the actual person or product visually

#### 3.1.6 Parsing Helpers

**`parseProductAnalysis(raw)`** — Lines 351–382

Parses the VLM's structured text output into a `ProductInfo` object:
- Extracts: `type`, `mainColor`, `secondaryColor`, `metalColor`, `materials[]`, `keyDetails[]`
- Builds a `colorSummary` string (e.g., `"MAIN: deep maroon red #8B1A1A. ACCENT: gold zari #CFB53B. METAL: warm yellow gold #DAA520"`)
- Used in prompt construction for generation strategies B, C, and D

**`parseVerification(raw)`** — Lines 393–432

Parses the VLM's verification response into a `VerificationResult`:
- Extracts numeric scores (clamped to 0–10, defaulting to 5 if parsing fails)
- Extracts the `ISSUE` description for refinement prompt construction
- Determines pass/fail: explicit `VERDICT: PASS` OR (colorScore >= 7 AND overallScore >= 6)
- The dual pass criteria ensures quality even when the VLM doesn't output a verdict

---

### 3.2 `src/lib/zai.ts` — ZAI SDK Configuration (261 lines)

**Purpose:** Manages ZAI SDK configuration, health checks, and instance creation. Acts as the bridge between the application and the AI service.

#### 3.2.1 Health Check System

Two cached health checks prevent repeated network calls:

| Check | Cache TTL | Endpoint | Purpose |
|-------|-----------|----------|---------|
| `isAIReachable(baseUrl)` | 30 seconds | Internal: `/dashboard/`, External: `/api/try-on/status` | Is the direct AI service reachable? |
| `isProxyReachable(proxyUrl)` | 60 seconds | `<proxyUrl>/api/try-on/status` | Is the sandbox proxy reachable? |

**Internal IP detection** (line 38): URLs containing `172.25.`, `192.168.`, `10.`, `localhost`, or `127.0.0.1` are treated as internal and checked against `/dashboard/`. External URLs (like `.space-z.ai`) are checked against `/api/try-on/status`.

**Gateway authentication** (lines 16–26): For `.space-z.ai` URLs, the hostname prefix is extracted and sent as the `Abc` header for gateway authentication.

#### 3.2.2 Configuration Resolution

`getZAIConfig()` resolves ZAI configuration from multiple sources in priority order:

1. **Environment variables** (highest priority): `ZAI_BASE_URL` + `ZAI_API_KEY` (+ optional `ZAI_CHAT_ID`, `ZAI_TOKEN`, `ZAI_USER_ID`)
2. **Config file — project directory**: `<cwd>/.z-ai-config`
3. **Config file — home directory**: `~/.z-ai-config`
4. **Config file — system**: `/etc/.z-ai-config`

On Vercel, only environment variables are checked (no filesystem access).

Config file format:
```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "<api-key>",
  "chatId": "<optional>",
  "token": "<optional>",
  "userId": "<optional>"
}
```

#### 3.2.3 Availability Check

`isZAIAvailable()` returns a structured result:

```typescript
{ available: boolean, mode: 'ai' | 'proxy' | 'unavailable', reason?: string }
```

Decision tree:
1. No config found → Check for proxy URL → If proxy reachable: `{ available: true, mode: 'proxy' }`, else `{ available: false, mode: 'unavailable' }`
2. Config found → Check direct reachability → If reachable: `{ available: true, mode: 'ai' }`
3. Config found but unreachable → Check proxy → If proxy reachable: `{ available: true, mode: 'proxy' }`
4. Both unreachable → `{ available: false, mode: 'unavailable' }`

#### 3.2.4 SDK Instance Creation

`createZAI()` attempts to create a ZAI SDK instance:
1. From explicit config (environment or file)
2. On Vercel: throws `AI_STYLE_SERVICE_UNAVAILABLE` if no config
3. On local: tries `ZAI.create()` (SDK's built-in file-based config)
4. Ultimate fallback: throws `AI_STYLE_SERVICE_UNAVAILABLE`

---

### 3.3 `src/app/api/try-on/route.ts` — API Route (536 lines)

**Purpose:** HTTP API endpoint that accepts try-on requests, manages job lifecycle, and serves results.

#### 3.3.1 Product Image Resolution

The `getProductImageBase64(imagePath)` function handles four image source types:

| Source Type | Example | Resolution Method |
|------------|---------|-------------------|
| External HTTP(S) URL | `https://cdn.example.com/img.jpg` | Direct fetch with `AbortSignal.timeout(15000)` |
| Protocol-relative URL | `//cdn.example.com/img.jpg` | Prepend `https:` and fetch |
| Image proxy URL | `/api/image-proxy?url=...` | Extract original URL and fetch directly; fallback to HTTP fetch through own server |
| Local path | `/images/products/necklace.jpg` | HTTP fetch via `NEXT_PUBLIC_BASE_URL`; fallback to filesystem read (`fs.readFileSync`) on non-Vercel |

The filesystem fallback (lines 87–100) is critical for local sandbox environments where HTTP self-requests may not work reliably.

#### 3.3.2 POST Handler — Job Creation

The POST handler implements a **three-tier strategy** on Vercel:

**Tier 1: Proxy** (lines 168–225)
- Forwards the entire request to the sandbox's `/api/try-on` endpoint
- Resolves product image to base64 before proxying (Vercel can't access internal URLs)
- 90-second timeout for proxy response
- Sets `Abc` header for `.space-z.ai` gateway authentication

**Tier 2: Direct SDK** (lines 228–242)
- If `ZAI_BASE_URL` and `ZAI_API_KEY` are configured on Vercel
- Checks `isZAIAvailable()` before attempting
- Delegates to `handleLocalAIGeneration()`

**Tier 3: Canvas Fallback** (lines 244–265)
- Returns `{ mode: 'canvas', code: 'AI_CANVAS_MODE', productImageBase64 }`
- Client-side canvas overlay compositing handles the rest

On non-Vercel (local sandbox), the handler goes directly to `handleLocalAIGeneration()`.

#### 3.3.3 Local AI Generation Handler

`handleLocalAIGeneration(body, isVercel)` — Lines 298–482

This is the core server-side handler that:
1. Checks AI availability via `isZAIAvailable()`
2. Falls back to canvas mode if AI is unavailable
3. Resolves product information from three sources (in order):
   - **Database** (Prisma): `db.product.findUnique()` with category include
   - **Client-provided**: `clientProductName` + `clientCategorySlug`
   - **Shopify API**: `fetchShopifyProducts()` fallback
4. Resolves product image to base64
5. Fetches AI pairing suggestions (database or Shopify)
6. Creates a job with `job_<timestamp>_<random>` ID format
7. Starts the pipeline asynchronously via `runPipeline()` (fire-and-forget with `.catch()`)
8. Returns `{ jobId, status: 'processing' }` immediately

**Category pairing logic** (lines 131–142):
```typescript
'sarees' ↔ ['jewelry']
'jewelry' ↔ ['sarees', 'fashion']
'watches' ↔ ['mens-shirts', 'leather-goods']
'mens-shirts' ↔ ['watches', 'leather-goods']
'fashion' ↔ ['jewelry', 'watches']
'fragrances' ↔ ['jewelry', 'fashion']
'leather-goods' ↔ ['watches', 'fashion']
default ↔ ['jewelry']
```

#### 3.3.4 GET Handler — Job Polling

`GET /api/try-on?jobId=<id>` — Lines 486–535

Returns the complete job state:
```json
{
  "jobId": "job_1234567890_abc123",
  "status": "completed",
  "imageUrl": "data:image/png;base64,...",
  "productName": "Diamond Necklace",
  "categorySlug": "jewelry",
  "strategy": "dual-image-edit",
  "colorAccuracy": 8,
  "faceAccuracy": 9,
  "pipelinePhase": "complete",
  "totalPasses": 1,
  "suggestions": [...],
  "progress": "Complete!"
}
```

If the job is not found locally, the handler attempts to proxy the request to the sandbox (for Vercel deployments where the job lives on the sandbox).

---

### 3.4 `src/components/product-detail.tsx` — Frontend (1769 lines)

**Purpose:** Contains the `TryOnDialog` component (4-step UI) and the `ProductDetail` component (main product page).

#### 3.4.1 Image Compression — `compressImage()` (Lines 96–128)

Client-side image compression before upload:
- **Max dimension**: 1536px (maintains aspect ratio)
- **Quality**: 0.92 JPEG
- **Method**: Canvas-based — draws the image onto a resized canvas and exports as JPEG
- Uses `imageSmoothingEnabled = true` and `imageSmoothingQuality = 'high'` for best downscale quality
- Returns a base64 data URL (`data:image/jpeg;base64,...`)

#### 3.4.2 Canvas Fallback — `generateCanvasFallback()` (Lines 140–343)

Client-side composite generation when AI is unavailable. Creates a premium-looking style preview:

1. **Base layer**: User's selfie drawn at full canvas size
2. **Vignette overlay**: Radial gradient darkening (0% → 30% opacity from center to edges)
3. **Product panel** (bottom-right):
   - Dark panel with 85% opacity (`#1c1917`)
   - Drop shadow (20px blur, 4px offset)
   - Gold border (`#daa520`, 1.5px)
   - Product image clipped with rounded corners
   - Product name label (auto-truncated with ellipsis)
4. **"STYLE PREVIEW" badge** (top-left): Dark panel with gold text and sparkle emoji
5. **Bottom watermark**: "3BOXES GIFTS · AI Style Preview" in gold

Product image loading strategy (lines 291–305):
- Prefers base64 data URL (no CORS issues)
- Routes external URLs through `/api/image-proxy` to avoid CORS
- Falls back to same-origin resolution for relative paths
- 5-second timeout — continues without product image if it fails to load

**Selfie failure fallback** (lines 307–338): If even the selfie fails to load, generates a minimal dark gradient canvas with "Style Preview" text and product name.

#### 3.4.3 TryOnDialog Component (Lines 384–1093)

A 4-step dialog component:

**Step: `upload`** (Lines 769–839)
- Shows product thumbnail + name
- File input area with drag-and-drop styling
- Category-specific tips:
  - Sarees/Fashion: "Full body or waist-up photo"
  - Jewelry: "Clear face and neck visible"
  - Watches: "Show your wrist or full upper body"
  - Default: "Upper body photo works best"
- File validation: must be image type, max 10MB
- Privacy notice: "Your photo is processed securely and not stored permanently"

**Step: `preview`** (Lines 843–901)
- Shows compressed selfie preview (3:4 aspect ratio)
- Visual formula: Selfie + Product = Result
- Two actions: "Retake" (back to upload) or "Create Preview" (trigger generation)

**Step: `generating`** (Lines 905–948)
- Animated spinner with ping effect
- Dynamic progress message from polling
- Product gallery thumbnails shown while waiting
- Dialog close during generation → background job continues

**Step: `result`** (Lines 952–1088)
- Full-size result image with "3 BOXES" and "Style Preview" badges
- AI Strategy label with human-readable mapping:
  - `dual-image-edit` → "Dual-Image Edit"
  - `edit-selfie` → "Selfie-Edit + Verify"
  - `edit-selfie-refined` → "Selfie-Edit + Refined"
  - `edit-product` → "Product-Edit + Verify"
  - `edit-product-refined` → "Product-Edit + Refined"
  - `create-text` → "AI Generate"
  - `canvas-overlay` → "Style Overlay"
- Face Match and Color Match scores (0/10)
- Product reference card
- 3 BOXES GIFTS info card explaining AI generation
- "Complete the Look" AI style suggestions (up to 4 items)
  - Each suggestion has image, name, price (₹ INR format), and "+ Cart" button
- Actions: "Try Again" (reset) or "Save" (download as PNG)

#### 3.4.4 Generation Flow — `handleGenerate()` (Lines 470–709)

Complex multi-path generation flow:

1. **Pre-fetch product image** as base64 (client-side, to avoid Vercel resolution issues)
2. **POST to `/api/try-on`** with all data
3. **Canvas mode detection**: If server returns `{ mode: 'canvas' }`:
   a. Try direct client-to-proxy call (fetch `/api/config` for proxy URL)
   b. If proxy succeeds: poll proxy for results (120 retries / 2s interval)
   c. If proxy fails: run `generateCanvasFallback()`
4. **Normal flow**: Poll `/api/try-on?jobId=<id>` (120 retries / 2s interval = max 4 minutes)
5. **Error fallback**: On any error, attempt canvas fallback before showing error message

**Background job support**: When the user closes the dialog during generation, a floating pill appears at the bottom of the screen:
- "Creating preview..." (while generating) — with spinner
- "Style Preview Ready! Click to view" (when complete) — with glow animation

#### 3.4.5 ProductDetail Component (Lines 1097–1769)

The main product page includes:
- **"Style Preview" CTA** (Lines 1451–1470): Prominent button with Crown icon, available for ALL categories
- **TryOnDialog mounting** (Lines 1729–1742): Conditional rendering that keeps the dialog alive during background jobs
- **Floating pill** (Lines 1745–1766): Background job indicator

---

### 3.5 `src/lib/watermark.ts` — Watermark System (153 lines)

**Purpose:** Applies branded "3BOXES GIFTS" watermarks to generated images using Sharp.

#### 3.5.1 Watermark Design

Two watermark modes:

**Mode 1: Logo + Text Composite** (when `public/images/logo.png` exists)
- Logo is resized to 8% of image height with aspect ratio preserved
- Logo is set to 60% opacity (`ensureAlpha(0.6)`)
- Text "3BOXES GIFTS" + "AI Style Preview" rendered alongside logo
- Logo and text composited side-by-side on a transparent canvas

**Mode 2: Text-Only Watermark** (fallback)
- SVG-generated watermark with gradient gold text
- Background: semi-transparent black rectangle (`rgba(0,0,0,0.55)`)
- Main text: "3BOXES GIFTS" in gold gradient (dark goldenrod → goldenrod → dark goldenrod)
- Sub text: "AI Style Preview" in 60% opacity gold

Both modes position the watermark at the **bottom-right corner** with 2% padding.

#### 3.5.2 `addWatermark(imageDataUrl)` (Lines 112–152)

Processing steps:
1. Strip `data:image/...;base64,` prefix via regex
2. Decode base64 to buffer
3. Read image metadata (width, height)
4. Generate watermark buffer (scaled to image dimensions)
5. Composite watermark using `sharp.composite([{ input, left, top }])`
6. Output as PNG
7. Return as base64 data URL

Error handling: If watermarking fails for any reason, the **original image is returned unmodified** — never blocks delivery.

---

### 3.6 `src/app/api/try-on/status/route.ts` — Health Check (19 lines)

**Purpose:** Provides a health check endpoint for the AI service.

Returns:
```json
{
  "available": true,
  "mode": "ai",
  "reason": "Using proxy to sandbox AI service"
}
```

Or on failure:
```json
{
  "available": false,
  "mode": "unavailable",
  "reason": "Health check failed"
}
```

This endpoint is used by both the proxy health check system and external monitoring.

---

### 3.7 `src/app/api/try-on/remote/route.ts` — Proxy Forwarding (76 lines)

**Purpose:** Dedicated proxy route that forwards try-on requests to the sandbox.

**POST handler** (Lines 14–52):
- Requires `ZAI_PROXY_URL` environment variable
- Forwards the entire request body to `<proxyUrl>/api/try-on`
- 30-second timeout for initial response
- Returns proxy result with original status code
- Error handling:
  - `TimeoutError` → 504 with `code: 'TIMEOUT'`
  - Other errors → 502 with `code: 'CONNECTION_ERROR'`

**GET handler** (Lines 54–75):
- Forwards job status queries to `<proxyUrl>/api/try-on?jobId=<id>`
- 10-second timeout
- Returns `status: 'failed'` on any error

---

### 3.8 `src/app/api/config/route.ts` — Client Configuration (69 lines)

**Purpose:** Returns the AI proxy URL and deployment information to the client.

**Caddy Gateway Auto-Detection** (Lines 10–45):
On non-Vercel deployments without an explicit `ZAI_PROXY_URL`, the system attempts to auto-detect a Caddy reverse proxy on port 81:
- Sandbox hostnames (starting with `c-`) → tries `http://<hostname>:81`
- Falls back to `http://localhost:81`
- Checks `/api/try-on/status` on each candidate with 3-second timeout
- Returns the first reachable gateway

Returns:
```json
{
  "aiProxyUrl": "https://c-xxxxx.space-z.ai",
  "isVercel": false
}
```

---

## 4. API Specifications

### 4.1 `POST /api/try-on` — Create Try-On Job

**Request:**
```json
{
  "productId": "string (required)",
  "selfieData": "string (required) — base64 data URL of user selfie",
  "productImageUrl": "string (optional) — URL of product image",
  "productImageBase64": "string (optional) — base64 data URL of product image",
  "productName": "string (optional) — product name (for Vercel/proxy)",
  "categorySlug": "string (optional) — product category (for Vercel/proxy)"
}
```

**Response — AI Mode (job created):**
```json
{
  "jobId": "job_1709548800000_a1b2c3",
  "status": "processing",
  "productName": "Diamond Necklace",
  "categorySlug": "jewelry"
}
```

**Response — Canvas Mode (AI unavailable):**
```json
{
  "mode": "canvas",
  "message": "AI style preview is temporarily unavailable. Showing style overlay with product image instead.",
  "code": "AI_CANVAS_MODE",
  "productName": "Diamond Necklace",
  "categorySlug": "jewelry",
  "productImageBase64": "data:image/jpeg;base64,...",
  "productImageUrl": "/images/products/necklace.jpg"
}
```

**Error Responses:**
| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Missing productId or selfieData | `{ error: "Product ID and selfie are required" }` |
| 400 | Invalid selfie format | `{ error: "Invalid image format" }` |
| 404 | Product not found | `{ error: "Product not found." }` |
| 500 | Unexpected error | `{ error: "An unexpected error occurred while generating your style preview." }` |

### 4.2 `GET /api/try-on?jobId=<id>` — Poll Job Status

**Response — Processing:**
```json
{
  "jobId": "job_1709548800000_a1b2c3",
  "status": "processing",
  "progress": "Verifying product match...",
  "pipelinePhase": "verification",
  "productName": "Diamond Necklace",
  "categorySlug": "jewelry"
}
```

**Response — Completed:**
```json
{
  "jobId": "job_1709548800000_a1b2c3",
  "status": "completed",
  "imageUrl": "data:image/png;base64,...",
  "productName": "Diamond Necklace",
  "categorySlug": "jewelry",
  "strategy": "dual-image-edit",
  "colorAccuracy": 8,
  "faceAccuracy": 9,
  "pipelinePhase": "complete",
  "totalPasses": 1,
  "suggestions": [
    {
      "id": "prod_456",
      "name": "Gold Bangle",
      "price": 25000,
      "image": "/images/products/bangle.jpg",
      "category": "Jewelry",
      "categorySlug": "jewelry"
    }
  ],
  "progress": "Complete!"
}
```

**Response — Failed:**
```json
{
  "jobId": "job_1709548800000_a1b2c3",
  "status": "failed",
  "error": "Virtual try-on is temporarily unavailable. Our AI style service could not be reached."
}
```

### 4.3 `GET /api/try-on/status` — Health Check

```json
{
  "available": true,
  "mode": "ai",
  "reason": null
}
```

### 4.4 `GET /api/config` — Client Configuration

```json
{
  "aiProxyUrl": "https://c-xxxxx-xxxxx-xxxxx.space-z.ai",
  "isVercel": false
}
```

### 4.5 `POST /api/try-on/remote` — Proxy Forwarding

Same request/response format as `POST /api/try-on`, with additional error codes:
- `AI_SERVICE_UNAVAILABLE` (503) — No proxy URL configured
- `TIMEOUT` (504) — Proxy took too long
- `CONNECTION_ERROR` (502) — Failed to connect to proxy

---

## 5. Pipeline Phase Details

### Phase 0: Suggestion Pre-Fetch

**Purpose:** Fetch complementary product suggestions in the background to display alongside results.

**Execution:** Runs concurrently with Phase 1 (no blocking). The `suggestionsPromise` is passed into the pipeline and awaited at the start.

**Suggestion sources:**
1. Database (Prisma): Products in pairing categories, excluding current product, ordered by rating, limited to 4
2. Shopify API: Filtered by pairing category and current product exclusion

**Output:** Array of up to 4 products with `id`, `name`, `price`, `image`, `category`, `categorySlug`.

### Phase 1: Product Analysis & Person Description

**Purpose:** Extract exact product color, material, and design details using VLM, and describe the user's appearance.

**Execution:** Two VLM calls run in **parallel**:

1. **Product Analysis** (`vlmAnalyze(PRODUCT_ANALYSIS_PROMPT, productImageBase64)`)
   - Extracts: TYPE, MAIN_COLOR (with hex), SECONDARY_COLOR (with hex), METAL_COLOR, MATERIALS, KEY_DETAILS
   - Critical for prompt engineering in generation phases
   - Hex codes ensure precise color communication

2. **Person Description** (`vlmAnalyze(personPrompt, selfieData)`)
   - Brief 1–2 sentence description: face shape, skin tone, hair color/style, body build
   - Used in Strategy C (product-edit) and Strategy D (text-to-image)

**Output:** `ProductInfo` object and `personDesc` string.

### Phase 2: Multi-Strategy Generation

**Purpose:** Generate try-on images using multiple strategies, then select the best via VLM verification.

**Strategy A: Dual-Image Edit** (PRIMARY — always attempted first)
- **API Call:** `safeImageEditDual(dualPrompt, selfieData, productImageBase64, config.size)`
- **Why it's best:** The model can directly observe both the person's appearance and the product's exact colors, materials, and design
- **Image input:** Two images in `images` array: selfie (first) + product (second)
- **Prompt focus:** Placement instructions and strict color-matching rules; no need to describe colors in text since the model sees the product
- **Typical quality:** Highest color accuracy, good face preservation

**Strategy B: Selfie-Edit with Text Description**
- **API Call:** `safeImageEdit(selfiePrompt, selfieData, config.size)`
- **Why it's useful:** Preserves the person's face well (selfie is the input image), but relies on text-described colors
- **Image input:** Single image (selfie only)
- **Prompt focus:** Detailed color schema, materials, key details from product analysis
- **Typical quality:** Good face preservation, moderate color accuracy (limited by text description fidelity)

**Strategy C: Product-Edit with Person Description** (conditional — only if `config.useProductEdit === true`)
- **API Call:** `safeImageEdit(productPrompt, productImageBase64, config.size)`
- **Why it's useful:** Preserves product colors perfectly (product is the input image), but the person's face won't match
- **Image input:** Single image (product only)
- **Prompt focus:** Person description, placement instructions, color preservation rules
- **Applicable categories:** Jewelry, watches, leather goods, fragrances, home-living
- **NOT applicable:** Sarees, fashion, mens-shirts (too complex for product-first edit)
- **Typical quality:** Excellent color accuracy, poor face preservation

**Strategy D: Text-to-Image Fallback** (only if ALL previous strategies failed)
- **API Call:** `safeImageCreate(createPrompt, config.size)`
- **Why it's a last resort:** No visual reference for either person or product; relies entirely on text descriptions
- **Image input:** None
- **Prompt focus:** Full description of both product and person
- **Typical quality:** Lowest across all metrics; neither face nor colors will match precisely

**Strategy execution order:**
```
A (always) → delay(1.2s) → B (always) → delay(1.2s) → C (if useProductEdit) → delay(1.2s) → D (if results.length === 0)
```

If all strategies fail, the job completes with `strategy: 'canvas-fallback'` and empty `imageUrl`, signaling the client to use canvas overlay.

### Phase 3: VLM Verification & Selection

**Purpose:** Score each generated image against the original product to find the best match.

**Process:**
1. For each `GenResult` in the results array:
   a. Call `vlmCompare(VERIFICATION_PROMPT, result.imageUrl, productImageBase64)`
   b. Parse the VLM response into `VerificationResult` (colorScore, shapeScore, faceScore, overallScore, issue, passed)
   c. Track the best result by `overallScore`
   d. **Early termination**: If any result scores `colorScore >= 8` AND `passed === true`, stop checking — we have a winner

2. If no results were verified (shouldn't happen but handled gracefully), assign default scores of 5/10

**Scoring criteria (from VERIFICATION_PROMPT):**
| Dimension | 0 | 5 | 10 |
|-----------|---|---|-----|
| COLOR | Wrong colors | Partially matching | Perfect match |
| SHAPE | Different product | Somewhat similar | Exact same design |
| FACE | Unrecognizable | Somewhat similar | Perfect preservation |
| OVERALL | Total mismatch | Mediocre | Perfect match |

**Pass threshold:** `VERDICT: PASS` OR (colorScore >= 7 AND overallScore >= 6)

### Phase 4: Refinement Pass (Conditional)

**Purpose:** Improve color accuracy if the best result scores below 7/10 on color.

**Trigger condition:** `bestVerification.colorScore < 7`

**Process:**
1. Build a correction instruction:
   - If the verification provided a specific issue (e.g., "necklace is silver but should be gold #DAA520"), use it
   - If no specific issue, generate a generic correction: "The product colors don't match. It should be: {colorSummary}. Fix the product to match these exact colors."
2. Call `safeImageEdit(refinementPrompt, bestResult.imageUrl, config.size)` — editing the best result with correction instructions
3. Re-verify the refined result with VLM comparison
4. Use the refined result only if `overallScore` is better than the original
5. If used, the strategy name is appended with `-refined` (e.g., `dual-image-edit-refined`)

**Total passes:** `totalPasses` is set to 2 if refinement was applied, 1 otherwise.

### Phase 5: Record Final Scores

Logs the final strategy, color score, face score, and overall score to the console for monitoring and debugging.

### Phase 6: Watermark + Deliver

**Purpose:** Apply the "3BOXES GIFTS" watermark to the final image.

1. Call `addWatermark(finalResult.imageUrl)`
2. If watermarking fails, use the unmodified image (never block delivery)
3. Update the job with final results:
   - `status: 'completed'`
   - `imageUrl: <watermarked base64>`
   - `strategy: <final strategy name>`
   - `colorAccuracy: <score>`
   - `faceAccuracy: <score>`
   - `totalPasses: <1 or 2>`
   - `pipelinePhase: 'complete'`
   - `progress: 'Complete!'`

---

## 6. Prompt Engineering Details

### 6.1 PRODUCT_ANALYSIS_PROMPT

```
Analyze this luxury product for a virtual try-on system. I need EXACT visual details.

Respond EXACTLY in this format:
TYPE: [specific product type, e.g. "diamond bib necklace", "maroon kanjeevaram silk saree"]
MAIN_COLOR: [the dominant color with hex code, e.g. "deep maroon red #8B1A1A"]
SECONDARY_COLOR: [secondary/accent color with hex, e.g. "gold zari #CFB53B"]
METAL_COLOR: [metal tone if applicable, e.g. "warm yellow gold #DAA520", or "none"]
MATERIALS: [comma-separated, e.g. "18k white gold, round brilliant-cut diamonds"]
KEY_DETAILS: [2-3 most visible design elements that must be preserved]

CRITICAL: Color accuracy is #1 priority. Use specific color names with hex codes. "Red" is not enough — say "deep maroon red #8B1A1A".
```

**Design rationale:**
- Structured output format ensures reliable parsing
- Hex codes provide unambiguous color specification
- The "CRITICAL" instruction emphasizes color precision
- KEY_DETAILS captures design elements that would be lost in color-only description
- Product type is specific (not just "necklace" but "diamond bib necklace") for better generation context

### 6.2 VERIFICATION_PROMPT

```
Compare these two images for a virtual try-on:

IMAGE 1: AI-generated try-on result
IMAGE 2: Original product image

Rate on 0-10 scale:
1. COLOR: How well do the product colors match? (0=wrong colors, 10=perfect match)
2. SHAPE: How well does the product shape/design match? (0=different product, 10=exact same)
3. FACE: How well is the person's face preserved? (0=unrecognizable, 10=perfect)
4. OVERALL: Overall product accuracy (0=total mismatch, 10=perfect match)

Respond EXACTLY:
COLOR: [score]
SHAPE: [score]
FACE: [score]
OVERALL: [score]
ISSUE: [if COLOR<7, describe the specific color mismatch, e.g. "necklace is silver but should be gold #DAA520"]
VERDICT: PASS or FAIL

A score of 7+ means clearly recognizable as the same item. Be strict.
```

**Design rationale:**
- Four-dimensional scoring provides granular quality assessment
- ISSUE field enables targeted refinement (not just "colors are wrong" but specifically what's wrong)
- "Be strict" instruction prevents overly generous scoring
- VERDICT binary (PASS/FAIL) simplifies downstream logic
- The IMAGE 1/IMAGE 2 labeling removes ambiguity about which image is which

### 6.3 buildDualImagePrompt — Strategy A

```typescript
`Professional fashion photograph. ${config.bodyType}.

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "${productName}" (${productInfo.type}).

Show this EXACT person ${config.placement}. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's ${config.colorFocus} — refer to the SECOND IMAGE for exact colors
3. Match the MAIN color especially: ${productInfo.mainColor}
${productInfo.metalColor && productInfo.metalColor !== 'none' ? `4. Match the METAL color: ${productInfo.metalColor}` : ''}
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.`
```

**Key design choices:**
- "FIRST IMAGE" / "SECOND IMAGE" labeling tells the model which image is which
- "EXACT person" and "EXACT face" with emphasis words preserve identity
- "refer to the SECOND IMAGE for exact colors" leverages the dual-image advantage
- Explicit MAIN color and METAL color (when applicable) reinforce critical color matching
- "Studio lighting, photorealistic, 8K quality" ensures professional output quality

### 6.4 buildSelfieEditPrompt — Strategy B

```typescript
`Professional fashion photograph. ${config.bodyType} of this EXACT person ${config.placement}.
The product is "${productName}" — a ${productInfo.type}.

PRODUCT COLOR SCHEMA: ${productInfo.colorSummary}
MATERIALS: ${productInfo.materials.join(', ')}
KEY DETAILS: ${productInfo.keyDetails.join(', ')}

CRITICAL RULES:
1. Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them at all
2. The product's ${config.colorFocus}
3. Match the MAIN color especially: ${productInfo.mainColor}
${productInfo.metalColor && productInfo.metalColor !== 'none' ? `4. Match the METAL color: ${productInfo.metalColor}` : ''}
5. The product must look realistic, natural, and properly fitted on the person

Studio lighting, photorealistic, 8K quality.`
```

**Key differences from dual-image prompt:**
- Color information is described in TEXT (PRODUCT COLOR SCHEMA) rather than referenced visually
- MATERIALS and KEY DETAILS are included to compensate for lack of product image
- "do NOT alter them at all" is stronger language than "Keep the person's EXACT face" because selfie-only editing is more prone to face modification

### 6.5 buildProductEditPrompt — Strategy C

```typescript
`Professional fashion photograph. ${config.bodyType} showing this EXACT product "${productName}" being worn by a person who is ${config.placement}.

PERSON: ${personDesc}

CRITICAL RULES:
1. The product's colors, materials, and design MUST match EXACTLY as shown in this image — do NOT change any color or detail
2. ${config.colorFocus}
3. The person should look natural and realistic wearing the product
4. The product must be the focal point and clearly visible

Studio lighting, photorealistic, 8K quality.`
```

**Key design choices:**
- "this EXACT product" and "do NOT change any color or detail" emphasize product preservation
- Person is described in text (from VLM analysis) — accepts face won't match perfectly
- "The product must be the focal point" ensures product visibility is prioritized

### 6.6 buildTextToImagePrompt — Strategy D

```typescript
`${config.bodyType} of a person ${config.placement}. The product is "${productName}" — a ${productInfo.type}.

PRODUCT: ${productInfo.colorSummary}. Materials: ${productInfo.materials.join(', ')}. Key details: ${productInfo.keyDetails.join(', ')}
PERSON: ${personDesc}

Show the product being worn with EXACT colors, materials, and details as described. The ${config.colorFocus}.

Photorealistic, studio lighting, 8K, high detail.`
```

**Design choices:**
- More compact than other prompts (text-to-image has limited context window effectiveness)
- Both PRODUCT and PERSON sections are fully text-based
- "EXACT colors, materials, and details as described" reinforces the text descriptions

### 6.7 Refinement Prompt Construction

```typescript
`Professional fashion photograph refinement. ${correction}. The ${config.colorFocus}. 
Keep the person's face, body, and pose EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality.`
```

**Key design choices:**
- "refinement" signals this is an edit of an existing result, not a new generation
- `${correction}` contains the specific VLM-identified issue (e.g., "necklace is silver but should be gold #DAA520")
- "Keep the person's face, body, and pose EXACTLY the same" prevents refinement from altering the person
- "Only adjust the product" scopes the edit to product-only changes

### 6.8 Person Description Prompt

```
Describe this person briefly for a virtual try-on: face shape, skin tone, hair color/style, body build. 1-2 sentences only.
```

**Design choices:**
- "briefly" and "1-2 sentences only" prevent overly long descriptions that waste tokens
- Specific attributes (face shape, skin tone, hair, body build) ensure relevant information
- Used in Strategies C and D where the person is not visible to the model

---

## 7. Category Configuration Details

### 7.1 CategoryConfig Interface

```typescript
interface CategoryConfig {
  placement: string          // How the product should be shown on the person
  size: ImageSize            // Output image dimensions
  colorFocus: string         // What colors must match EXACTLY
  bodyType: string           // Framing/cropping of the photograph
  useProductEdit: boolean    // Whether Strategy C (product-first edit) makes sense
}
```

### 7.2 Complete Category Configuration Table

| Category | Placement | Size | Color Focus | Body Type | useProductEdit |
|----------|-----------|------|-------------|-----------|----------------|
| **jewelry** | "wearing the jewelry piece" | 864x1152 | "jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY" | "Close-up beauty photograph from chest up" | true |
| **sarees** | "draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist" | 768x1344 | "saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy" | "Full-body professional fashion photograph" | false |
| **watches** | "wearing the watch on the left wrist" | 864x1152 | "watch dial color, case metal color, and strap color must match EXACTLY" | "Close-up photograph from waist up" | true |
| **fashion** | "wearing the outfit" | 768x1344 | "outfit fabric color, print pattern, and accent colors must match EXACTLY" | "Full-body professional fashion photograph" | false |
| **mens-shirts** | "wearing the shirt" | 768x1344 | "shirt fabric color, pattern, and collar/cuff details must match EXACTLY" | "Full-body professional fashion photograph" | false |
| **mens-shirts-t-shirts** | "wearing the shirt" | 768x1344 | "shirt fabric color, pattern, and details must match EXACTLY" | "Full-body professional fashion photograph" | false |
| **leather-goods** | "holding the leather product" | 864x1152 | "leather color, grain texture, and hardware metal color must match EXACTLY" | "Professional product-in-use photograph" | true |
| **fragrances** | "holding the fragrance bottle" | 864x1152 | "bottle shape, cap color, and liquid color must match EXACTLY" | "Professional product-in-use photograph" | true |
| **home-living** | "with the home decor product" | 1344x768 | "product colors, materials, and finish must match EXACTLY" | "Professional lifestyle photograph" | true |

### 7.3 Jewelry Sub-Detection Logic

The `getCategoryConfig()` function includes **product name-based sub-detection** for the jewelry category:

| Keyword Match | Override Placement |
|--------------|-------------------|
| `earring`, `jhumka`, `stud` | "wearing earrings on both earlobes" |
| `necklace`, `choker`, `pendant`, `temple`, `haar`, `mala` | "wearing a necklace around the neck" |
| `bracelet`, `cuff`, `bangle`, `kada` | "wearing a bracelet on the wrist" |
| `ring` | "wearing a ring on the finger" |
| `set`, `bridal` | "wearing a matching jewelry set — necklace around the neck and earrings on both earlobes" |

**Why sub-detection matters:** Without it, the VLM might place a necklace on the wrist or earrings on the neck. The product name contains crucial context about the specific jewelry type that the generic "wearing the jewelry piece" placement lacks.

**Fallback:** Any jewelry product not matching sub-detection keywords uses the base "wearing the jewelry piece" placement.

### 7.4 Default Category Behavior

If a category slug doesn't match any entry in `CATEGORY_CONFIG`, the system defaults to the **jewelry** configuration. This is a safe default because:
1. Jewelry is the most common luxury product category
2. The close-up portrait framing works reasonably well for most products
3. The 864x1152 size is a good default portrait aspect ratio

---

## 8. Error Handling & Fallback Mechanisms

### 8.1 Error Handling Philosophy

The system follows a **"never leave the user without a result"** principle. Every failure path has a fallback:

```
AI Generation → Canvas Fallback → Error Message (last resort)
```

### 8.2 Pipeline-Level Error Handling

**VLM call failures** (`vlmAnalyze`, `vlmCompare`):
- Return empty string on timeout or error
- `parseProductAnalysis()` handles empty/invalid input with defaults (type: "luxury item", empty colors)
- `parseVerification()` handles empty/invalid input with default scores of 5/10

**Image generation failures** (`safeImageEdit`, `safeImageEditDual`, `safeImageCreate`):
- Return `null` on failure
- Pipeline continues to the next strategy
- If all strategies fail: `strategy: 'canvas-fallback'` with empty imageUrl

**Watermark failure:**
- Original image returned unmodified
- Never blocks delivery

**Top-level pipeline error** (lines 750–761):
```typescript
catch (error) {
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || 
      msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
    job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached.'
  } else {
    job.error = msg
  }
}
```

Network-related errors are translated into user-friendly messages.

### 8.3 API Route Error Handling

**POST handler error cascade (Vercel):**
1. Proxy attempt → If fails, log and continue
2. Direct SDK attempt → If unavailable, continue
3. Canvas fallback → Always succeeds (returns product image base64)

**POST handler error cascade (Local):**
1. Direct AI generation → If unavailable, canvas fallback
2. Product resolution: Database → Client-provided → Shopify → 404

**GET handler proxy fallback:**
If job not found locally → Attempt proxy fetch → If proxy fails → 404

### 8.4 Client-Side Error Handling

**`handleGenerate()` error cascade:**
1. POST to `/api/try-on` → Canvas mode detection → Direct proxy attempt → Canvas fallback
2. Polling timeout (120 retries) → Canvas fallback → Error message
3. Any exception → Canvas fallback → Error message

**File upload validation:**
- Non-image files rejected with error message
- Files > 10MB rejected with error message
- Compression failure → Error message, stays on upload step

**Canvas fallback failures:**
- Product image load failure → Continues without product image (icon placeholder)
- Selfie load failure → Generates minimal dark canvas with text
- Complete canvas failure → Returns `null`, shows error message

### 8.5 Timeout Configuration

| Operation | Timeout | Location |
|-----------|---------|----------|
| VLM single-image analysis | 30 seconds | `vlmAnalyze()` |
| VLM dual-image comparison | 45 seconds | `vlmCompare()` |
| Server proxy POST | 90 seconds | API route |
| Server proxy GET | 15 seconds | API route |
| Remote proxy POST | 30 seconds | `/api/try-on/remote` |
| Remote proxy GET | 10 seconds | `/api/try-on/remote` |
| Health check (internal) | 4 seconds | `isAIReachable()` |
| Health check (external) | 5 seconds | `isAIReachable()` / `isProxyReachable()` |
| Product image fetch (HTTP) | 10–15 seconds | `getProductImageBase64()` |
| Client product image fetch | 10 seconds | `fetchImageAsBase64()` |
| Client canvas product image | 5 seconds | `generateCanvasFallback()` |
| Client proxy attempt | 90 seconds | `handleGenerate()` |
| Client polling | 120 × 2s = 240s | `handleGenerate()` |
| Client config fetch | 3 seconds | `handleGenerate()` |

---

## 9. Performance Considerations

### 9.1 API Call Budget

A typical successful pipeline execution (Strategy A succeeds, no refinement needed):

| Phase | API Calls | Time Estimate |
|-------|-----------|---------------|
| Phase 1: Product Analysis | 2 (parallel VLM) | ~8–15s |
| Delay | 1 | 1.2s |
| Phase 2: Strategy A | 1 (dual-image edit) | ~15–25s |
| Delay | 1 | 1.2s |
| Phase 2: Strategy B | 1 (single edit) | ~15–25s |
| Phase 3: Verify A | 1 (VLM compare) | ~8–15s |
| **Total (best case, A wins)** | **7 API calls** | **~48–82s** |

Worst case (all strategies fail, refinement needed):

| Phase | API Calls | Time Estimate |
|-------|-----------|---------------|
| Phase 1: Analysis | 2 | ~8–15s |
| Phase 2: Strategy A | 1 | ~15–25s |
| Delay + Strategy B | 2 | ~16–26s |
| Delay + Strategy C | 2 | ~16–26s |
| Phase 3: Verify all 3 | 3 | ~24–45s |
| Phase 4: Refinement | 2 (edit + verify) | ~23–40s |
| Phase 6: Watermark | 0 (local) | <1s |
| **Total (worst case)** | **12 API calls** | **~103–178s** |

### 9.2 Optimization Strategies

1. **Early termination in Phase 3**: If a result scores colorScore >= 8, verification stops immediately (saves 1–2 VLM calls)

2. **Parallel VLM calls in Phase 1**: Product analysis and person description run concurrently (saves ~8–15s)

3. **Background suggestion fetch**: Suggestions are fetched during Phase 1, not after (saves ~2–5s)

4. **Cached health checks**: 30–60 second TTL prevents repeated health check API calls

5. **Client-side image compression**: 1536px max / 0.92 quality reduces upload payload significantly (typical 5MB photo → ~200KB base64)

6. **Client-side product image pre-fetch**: Product image is resolved to base64 on the client before sending to server, avoiding server-side resolution latency on Vercel

7. **Strategy C conditional execution**: Only runs for categories where product-first editing makes sense (saves ~16–26s for sarees, fashion)

8. **Strategy D conditional execution**: Only runs if all previous strategies failed (saves time in the common case)

### 9.3 Memory Considerations

- **Job TTL**: 15-minute expiry prevents memory accumulation from abandoned jobs
- **Base64 image storage**: Each job stores two base64 images (selfie + result) in memory. For a 1536px image at ~200KB, this is ~400KB per active job
- **Watermark buffer caching**: `watermarkBufferCache` prevents repeated SVG/buffer generation (though this cache is currently not populated — see TODO)
- **Sharp processing**: Watermark compositing loads the full image into memory for processing; a 1152x864 PNG is ~3MB in memory

### 9.4 Concurrency Considerations

- The pipeline runs **asynchronously** (via `runPipeline().catch()`) — the POST handler returns immediately
- The 1.2-second API call delay between strategies creates natural back-pressure
- On Vercel serverless, the function may time out (default 10s for hobby, 60s for pro) before the pipeline completes — this is why the job-based polling architecture is essential
- Multiple concurrent jobs are supported by the Map-based job store, but the AI service may rate-limit

---

## 10. Security Considerations

### 10.1 Image Data Handling

- **Selfie images** are transmitted as base64 data URLs in POST request bodies
- Images are stored **in-memory only** (no disk persistence) with 15-minute TTL
- After TTL expiry, images are garbage-collected with no trace
- The privacy notice states: "Your photo is processed securely and not stored permanently"

### 10.2 API Security

- **No authentication required** for the `/api/try-on` endpoint — this is intentional for low-friction user experience
- **Rate limiting**: The 1.2-second API call delay between AI service calls provides implicit rate limiting
- **Input validation**: 
  - `productId` and `selfieData` are required
  - `selfieData` must start with `data:image/` prefix
  - File size is validated client-side (10MB max)
  - File type is validated client-side (must be image/*)
- **No SQL injection risk**: Prisma ORM parameterizes all database queries

### 10.3 Gateway Authentication

- The `.space-z.ai` gateway requires an `Abc` header extracted from the hostname
- This header is set automatically by `getProxyHeaders()` and `getAbcHeader()`
- No API keys are exposed to the client (proxy URL only)

### 10.4 CORS Considerations

- Client-side canvas fallback handles CORS by routing external images through `/api/image-proxy`
- Base64 data URLs bypass CORS entirely (preferred method)
- The `crossOrigin` attribute is NOT set on `<img>` elements for data URLs (would cause unnecessary preflight)

### 10.5 Potential Vulnerabilities

| Risk | Mitigation |
|------|-----------|
| Large image DoS (memory exhaustion) | Client-side 10MB limit; server-side could add body size limit |
| Repeated job creation (API abuse) | No explicit rate limiting on job creation; could add per-IP limits |
| Arbitrary URL fetching (SSRF) | `getProductImageBase64()` fetches arbitrary URLs; could whitelist domains |
| Prompt injection via product name | Product names come from trusted database/Shopify; low risk |
| Base64 bomb | Could craft malicious base64 that decompresses to huge image; mitigated by client-side compression |

---

## 11. Deployment Topology

### 11.1 Local Sandbox Deployment

```
┌──────────────────────────────────────────────────┐
│              SANDBOX SERVER                       │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Next.js App  │  │  ZAI Service  │              │
│  │  (port 3000)  │──▶│  (172.25.x    │              │
│  │               │  │   x:8080/v1)  │              │
│  │  /api/try-on  │  │               │              │
│  │  /api/config   │  │  glm-4v-plus  │              │
│  │               │  │  images.gen   │              │
│  └──────┬───────┘  └───────────────┘              │
│         │                                         │
│  ┌──────▼───────┐  ┌──────────────┐              │
│  │  Caddy Proxy  │  │  PostgreSQL   │              │
│  │  (port 81)    │  │  + Prisma     │              │
│  │               │  └──────────────┘              │
│  └──────────────┘                                │
│                                                   │
└──────────────────────────────────────────────────┘
         │
         │  .space-z.ai gateway
         ▼
    [INTERNET]
```

**Characteristics:**
- Direct access to ZAI AI service (no proxy needed)
- Database access for product lookups and suggestions
- Caddy reverse proxy on port 81 provides external access
- In-memory job store persists for the lifetime of the Node.js process

### 11.2 Vercel Serverless Deployment

```
┌──────────────────┐       ┌──────────────────────┐
│   VERCEL          │       │     SANDBOX           │
│                   │       │                       │
│  ┌─────────────┐  │       │  ┌──────────────────┐ │
│  │ Serverless   │  │       │  │  Next.js App     │ │
│  │ Function     │──┼──────▶│  │  (port 3000)     │ │
│  │ /api/try-on  │  │ proxy │  │                  │ │
│  │ /api/config   │  │       │  │  ZAI Service     │ │
│  └─────────────┘  │       │  │  (172.25.x:8080) │ │
│                   │       │  └──────────────────┘ │
│  ┌─────────────┐  │       │                       │
│  │ Static CDN   │  │       │  ┌──────────────────┐ │
│  │ (Next.js SSR)│  │       │  │  Caddy Gateway   │ │
│  └─────────────┘  │       │  │  (.space-z.ai)   │ │
│                   │       │  └──────────────────┘ │
└──────────────────┘       └──────────────────────┘
```

**Characteristics:**
- No direct AI service access — must proxy through sandbox
- No filesystem access — product images must be fetched via HTTP
- No database access — product data from Shopify API or client-provided
- Serverless function may time out during long pipeline execution
- Client-side canvas fallback is the ultimate safety net

### 11.3 Environment Variable Configuration

| Variable | Required | Local Sandbox | Vercel | Description |
|----------|----------|---------------|--------|-------------|
| `ZAI_BASE_URL` | Yes* | `http://172.25.136.193:8080/v1` | — | AI service endpoint |
| `ZAI_API_KEY` | Yes* | `<api-key>` | — | API key for ZAI service |
| `ZAI_PROXY_URL` | Vercel** | — | `https://c-xxx.space-z.ai` | Public proxy URL |
| `ZAI_CHAT_ID` | No | Optional | Optional | ZAI chat ID |
| `ZAI_TOKEN` | No | Optional | Optional | ZAI auth token |
| `ZAI_USER_ID` | No | Optional | Optional | ZAI user ID |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | `https://<vercel-url>` | App base URL |
| `VERCEL` | Auto | Not set | Set by Vercel | Deployment detection |
| `VERCEL_URL` | Auto | Not set | Set by Vercel | Vercel deployment URL |
| `NEXT_PUBLIC_AI_PROXY_URL` | No | — | Optional | Client-accessible proxy URL |

\* Required on local sandbox; can be omitted on Vercel if `ZAI_PROXY_URL` is set  
\** Required on Vercel for AI functionality without canvas fallback

---

## 12. Configuration Reference

### 12.1 `.z-ai-config` File Format

Located at one of (in priority order):
1. `<project-root>/.z-ai-config`
2. `~/.z-ai-config`
3. `/etc/.z-ai-config`

```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "chatId": "chat-optional-id",
  "token": "optional-auth-token",
  "userId": "optional-user-id"
}
```

Only `baseUrl` and `apiKey` are required.

### 12.2 Image Size Selection Guide

| Size | Aspect Ratio | Best For |
|------|-------------|----------|
| 768x1344 | 9:16 (tall portrait) | Sarees, fashion, shirts — full-body shots |
| 864x1152 | 3:4 (portrait) | Jewelry, watches, leather goods, fragrances — upper body |
| 1344x768 | 16:9 (landscape) | Home living — lifestyle/room scenes |
| 1024x1024 | 1:1 (square) | Not currently used by any category |
| 1152x864 | 4:3 (landscape) | Not currently used by any category |
| 1440x720 | 2:1 (wide) | Not currently used by any category |
| 720x1440 | 1:2 (tall) | Not currently used by any category |

### 12.3 Pipeline Timing Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `API_CALL_DELAY` | 1200ms | Delay between sequential AI API calls |
| Job TTL | 15 minutes | Maximum job lifetime before cleanup |
| Job cleanup interval | 5 minutes | How often expired jobs are cleaned up |
| Health check cache (direct) | 30 seconds | Cache TTL for direct AI health check |
| Health check cache (proxy) | 60 seconds | Cache TTL for proxy health check |
| Client polling interval | 2 seconds | Time between job status polls |
| Client max polls | 120 | Maximum poll attempts (4 minutes total) |
| Client image max dimension | 1536px | Maximum image dimension for compression |
| Client image quality | 0.92 | JPEG quality for compression |
| Client max file size | 10MB | Maximum file size for upload |

### 12.4 Category Pairing Matrix

Used for "Complete the Look" AI suggestions:

```
┌────────────────┬──────────────────────────────────┐
│ Source Category │ Suggested Categories             │
├────────────────┼──────────────────────────────────┤
│ sarees         │ jewelry                           │
│ jewelry        │ sarees, fashion                   │
│ watches        │ mens-shirts, leather-goods        │
│ mens-shirts    │ watches, leather-goods            │
│ fashion        │ jewelry, watches                  │
│ fragrances     │ jewelry, fashion                  │
│ leather-goods  │ watches, fashion                  │
│ (default)      │ jewelry                           │
└────────────────┴──────────────────────────────────┘
```

---

## 13. Code Walkthrough with Line-by-Line Explanations

### 13.1 `try-on-pipeline.ts` — Pipeline Execution

**Lines 550–553: Pipeline Entry Point**
```typescript
export async function runPipeline(input: PipelineInput): Promise<void> {
  const { jobId, productName, categorySlug, selfieData, productImageBase64, suggestionsPromise } = input
  const job = jobs.get(jobId)
  if (!job) return
```
The pipeline is a fire-and-forget async function. It retrieves the job from the in-memory store; if the job was already cleaned up (unlikely but possible), it exits silently.

**Lines 556–569: Phase 0 — Suggestion Pre-Fetch**
```typescript
if (job) job.progress = 'Preparing your style preview...'
const suggestions = await suggestionsPromise
const formattedSuggestions = suggestions.map((s: any) => ({
  id: s.id,
  name: s.name,
  price: s.price,
  image: JSON.parse(s.images || '[]')[0] || '/images/placeholder.jpg',
  category: s.category?.name || '',
  categorySlug: s.category?.slug || '',
}))
if (job) job.suggestions = formattedSuggestions
```
The suggestion promise was created in the API route handler and may already be resolved by this point. The `await` is essentially free if the promise is settled. Suggestions are formatted for the frontend, with the first product image extracted from the JSON array.

**Lines 571–588: Phase 1 — Parallel VLM Analysis**
```typescript
const [analysisRaw, personDesc] = await Promise.all([
  vlmAnalyze(PRODUCT_ANALYSIS_PROMPT, productImageBase64),
  vlmAnalyze(
    'Describe this person briefly for a virtual try-on: face shape, skin tone, hair color/style, body build. 1-2 sentences only.',
    selfieData
  ),
])
const productInfo = parseProductAnalysis(analysisRaw)
await delay(API_CALL_DELAY)
```
Two independent VLM calls run in parallel via `Promise.all()`. The product analysis extracts structured color/type information, while the person description captures appearance details. The 1.2-second delay after gives the AI service a brief rest before the generation phase.

**Lines 590–644: Phase 2 — Multi-Strategy Generation**
Strategy A is always attempted first (dual-image edit). Strategy B follows (selfie edit). Strategy C is conditional on `config.useProductEdit`. Strategy D only runs if all previous strategies produced no results. Each strategy attempt is separated by a 1.2-second delay.

**Lines 656–686: Phase 3 — VLM Verification**
```typescript
for (const result of results) {
  await delay(API_CALL_DELAY)
  const verifyRaw = await vlmCompare(VERIFICATION_PROMPT, result.imageUrl, productImageBase64)
  const verification = parseVerification(verifyRaw)
  result.verification = verification
  if (!bestVerification || verification.overallScore > bestVerification.overallScore) {
    bestResult = result
    bestVerification = verification
  }
  if (verification.colorScore >= 8 && verification.passed) break
}
```
Each result is verified sequentially. The early termination (`colorScore >= 8 && passed`) is a key optimization — if we find an excellent result, we don't waste time verifying lesser ones.

**Lines 688–722: Phase 4 — Conditional Refinement**
```typescript
if (bestVerification.colorScore < 7 && bestResult) {
  let correction = bestVerification.issue
  if (!correction || correction.length < 10) {
    correction = `The product colors don't match. It should be: ${productInfo.colorSummary}. Fix the product to match these exact colors.`
  }
  const refinementPrompt = `Professional fashion photograph refinement. ${correction}. The ${config.colorFocus}. Keep the person's face, body, and pose EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality.`
  const refined = await safeImageEdit(refinementPrompt, bestResult.imageUrl, config.size)
  if (refined) {
    const refineVerifyRaw = await vlmCompare(VERIFICATION_PROMPT, refined, productImageBase64)
    const refineVerification = parseVerification(refineVerifyRaw)
    if (refineVerification.overallScore > bestVerification.overallScore) {
      finalResult = { imageUrl: refined, strategy: `${bestResult.strategy}-refined`, verification: refineVerification }
      bestVerification = refineVerification
    }
  }
}
```
The refinement pass is targeted: it uses the VLM's specific issue description (e.g., "necklace is silver but should be gold") to create a correction prompt. The refined result is only used if it scores higher than the original — refinement can sometimes make things worse.

**Lines 724–749: Phases 5–6 — Scoring, Watermarking, and Delivery**
```typescript
let finalImageUrl = finalResult.imageUrl
try {
  finalImageUrl = await addWatermark(finalResult.imageUrl)
} catch (wmErr) {
  console.error('[pipeline] Watermark failed:', wmErr)
}
if (job) {
  job.status = 'completed'
  job.imageUrl = finalImageUrl
  job.productName = productName
  job.strategy = finalResult.strategy
  job.colorAccuracy = bestVerification.colorScore
  job.faceAccuracy = bestVerification.faceScore
  job.totalPasses = totalPasses
  job.pipelinePhase = 'complete'
  job.progress = 'Complete!'
}
```
Watermarking is wrapped in try-catch — the unwatermarked image is used if it fails. All job fields are populated atomically for the polling endpoint to return.

### 13.2 `zai.ts` — SDK Configuration Walkthrough

**Lines 31–81: `isAIReachable(baseUrl)`**
The function differentiates between internal and external URLs. For internal IPs, it hits the `/dashboard/` endpoint (Caddy management interface). For external URLs, it hits `/api/try-on/status`. The 4–5 second timeout prevents hanging on unreachable services. The cached result (30s TTL) prevents hammering the health endpoint.

**Lines 179–225: `isZAIAvailable()`**
This is the main availability check with cascading fallback:
1. No config → try proxy → unavailable
2. Config + reachable → use direct AI
3. Config + unreachable → try proxy → unavailable

The `mode` return value (`'ai'` | `'proxy'` | `'unavailable'`) is used by the API route to determine the execution path.

### 13.3 `route.ts` — API Route Walkthrough

**Lines 146–293: POST Handler**
The outer try-catch structure ensures that body parsing happens outside the main try block (line 148–153), making the body available for canvas fallback in the catch block. This is critical for the "never leave the user without a result" principle.

**Lines 298–482: `handleLocalAIGeneration()`**
This function demonstrates the three-source product resolution pattern:
1. Database (most authoritative, local sandbox only)
2. Client-provided (works everywhere but less trusted)
3. Shopify API (always available but slower)

The job ID format `job_<timestamp>_<6-char-random>` provides uniqueness and rough chronological ordering.

**Lines 460–474: Job Creation and Pipeline Launch**
```typescript
createJob(jobId, { categorySlug: product.category.slug, productName: product.name })
runPipeline({ jobId, ... }).catch((err) => console.error('[try-on] Pipeline failed:', err))
```
The pipeline is launched as a fire-and-forget promise. The `.catch()` ensures unhandled rejection doesn't crash the process.

### 13.4 `product-detail.tsx` — Frontend Walkthrough

**Lines 470–709: `handleGenerate()`**
This is the most complex client-side function in the system, implementing a five-level fallback cascade:

1. Server-side AI generation (POST → poll)
2. Server-returned canvas mode → direct client-to-proxy attempt
3. Client-to-proxy success → proxy polling
4. Client-to-proxy failure → canvas fallback
5. Any exception → canvas fallback → error message

The function maintains progress state through `setProgressMessage()`, which the UI displays in the generating step.

**Lines 740–752: Dialog Close During Generation**
```typescript
onOpenChange={(isOpen) => {
  if (!isOpen) {
    if (step === 'generating') {
      onOpenChange(false);
      return;
    }
    reset();
  }
  onOpenChange(isOpen);
}}
```
Closing the dialog during generation does NOT reset the state — the job continues in the background. The floating pill indicator keeps the user informed.

**Lines 1729–1742: Conditional Dialog Mounting**
```typescript
{(tryOnOpen || backgroundJobStep !== null) && product && (
  <TryOnDialog ... />
)}
```
The dialog is mounted when either: (a) the user opened it, or (b) a background job is active. This ensures the dialog doesn't unmount and lose state during background processing.

### 13.5 `watermark.ts` — Watermark Walkthrough

**Lines 12–34: `createWatermarkBuffer()`**
The SVG watermark uses a gradient fill (`#b8860b` → `#daa520` → `#b8860b`) for the "3BOXES GIFTS" text, creating a shimmering gold effect. The semi-transparent black background (`rgba(0,0,0,0.55)`) ensures readability on any image.

**Lines 40–103: `getWatermarkBuffer()`**
When the logo PNG exists, it's resized to 8% of image height with 60% opacity, then composited with the text watermark side-by-side. This creates a more professional branded watermark than text alone.

**Lines 112–152: `addWatermark()`**
The function parses the data URL with a regex (`/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/`), decodes the base64, applies Sharp compositing, and re-encodes. The watermark position is calculated as:
```typescript
const padding = Math.max(Math.floor(height * 0.02), 10)
const left = Math.max(width - wmWidth - padding, 0)
const top = Math.max(height - wmHeight - padding, 0)
```
This places the watermark at the bottom-right with proportional padding.

---

## Appendix A: Strategy Naming Convention

| Strategy Code | Display Name | Description |
|--------------|-------------|-------------|
| `dual-image-edit` | Dual-Image Edit | Strategy A: Both selfie and product passed as images |
| `edit-selfie` | Selfie-Edit + Verify | Strategy B: Selfie as image, product described in text |
| `edit-product` | Product-Edit + Verify | Strategy C: Product as image, person described in text |
| `create-text` | AI Generate | Strategy D: Pure text-to-image generation |
| `dual-image-edit-refined` | Dual-Image Edit + Refined | Strategy A with refinement pass |
| `edit-selfie-refined` | Selfie-Edit + Refined | Strategy B with refinement pass |
| `edit-product-refined` | Product-Edit + Refined | Strategy C with refinement pass |
| `canvas-fallback` | Style Overlay | Canvas overlay compositing (no AI) |
| `canvas-overlay` | Style Overlay | Client-side canvas fallback |
| `ai-proxy` | AI Proxy | Client-side direct proxy call succeeded |

## Appendix B: VLM Output Format Reference

### Product Analysis Response Format
```
TYPE: diamond bib necklace
MAIN_COLOR: warm yellow gold #DAA520
SECONDARY_COLOR: brilliant white diamond #F0F0F0
METAL_COLOR: warm yellow gold #DAA520
MATERIALS: 18k yellow gold, round brilliant-cut diamonds, milgrain detailing
KEY_DETAILS: cascading bib design, graduated diamond sizes, articulated links
```

### Verification Response Format
```
COLOR: 8
SHAPE: 9
FACE: 7
OVERALL: 8
ISSUE: none
VERDICT: PASS
```

Or with issues:
```
COLOR: 5
SHAPE: 7
FACE: 8
OVERALL: 6
ISSUE: necklace is silver but should be gold #DAA520
VERDICT: FAIL
```

## Appendix C: File Structure Summary

```
src/
├── lib/
│   ├── try-on-pipeline.ts    (763 lines) — Core AI pipeline
│   ├── zai.ts                (261 lines) — ZAI SDK configuration
│   └── watermark.ts          (153 lines) — Watermark compositing
├── app/
│   └── api/
│       ├── try-on/
│       │   ├── route.ts      (536 lines) — Main API endpoint
│       │   ├── status/
│       │   │   └── route.ts  (19 lines)  — Health check
│       │   └── remote/
│       │       └── route.ts  (76 lines)  — Proxy forwarding
│       └── config/
│           └── route.ts      (69 lines)  — Client configuration
└── components/
    └── product-detail.tsx    (1769 lines) — Frontend UI

Total: 3,646 lines of code
```

---

*End of Technical Documentation — 3 BOXES LUXURY AI Virtual Try-On v2.0*
