# Architecture Deep-Dive: Virtual Try-On Feature

> **Version:** 2.0 (Pipeline v2 — Concrete & Reliable)
> **Last Updated:** 2025-03-05
> **Total Source Lines:** 4,035 across 6 files

---

## 1. Overview

This document provides a comprehensive, code-level technical reference for the **AI Virtual Try-On** feature in the 3BOXES GIFTS platform. It traces every function call, data transformation, error branch, and architectural decision from the moment a user clicks "Try On" to the final watermarked result displayed on screen.

### Audience

| Who | Why They Need This |
|-----|-------------------|
| **New developers** | Onboarding — understand the full pipeline without reading 4,000 lines |
| **Senior engineers** | Architecture review, performance optimization, incident debugging |
| **Patent attorneys** | Detailed invention disclosure with exact function signatures, data flows, and novel dual-image strategy |
| **QA engineers** | Understand every error path for test coverage |

### Key Innovations

1. **Dual-Image Edit** — Both selfie and product images are passed to the AI edit API simultaneously, enabling the model to *see* exact colors rather than relying on text descriptions.
2. **Multi-Strategy Generation** — Up to 4 generation strategies attempted sequentially; best result selected via VLM verification.
3. **Refinement Loop** — If color accuracy < 7/10, a targeted refinement pass corrects the product colors.
4. **Three-Tier Fallback** — Proxy → Direct SDK → Canvas overlay ensures the feature degrades gracefully.

---

## 2. Source File Map

| File | Path | Lines | Responsibility |
|------|------|------:|---------------|
| try-on-pipeline.ts | `src/lib/try-on-pipeline.ts` | 762 | Core AI pipeline: job storage, VLM analysis, multi-strategy generation, VLM verification, refinement, watermark |
| zai.ts | `src/lib/zai.ts` | 260 | ZAI SDK configuration, health checks, proxy detection, SDK instance creation |
| watermark.ts | `src/lib/watermark.ts` | 152 | Server-side watermark compositing (logo+text or text-only) via Sharp |
| route.ts | `src/app/api/try-on/route.ts` | 535 | Next.js API route: POST (create job), GET (poll job), product image resolution, proxy orchestration |
| product-detail.tsx | `src/components/product-detail.tsx` | 1,769 | Frontend: TryOnDialog component, image compression, canvas fallback, poll loop, background job pill |
| ai-proxy/index.ts | `mini-services/ai-proxy/index.ts` | 557 | Standalone proxy service: 4-strategy generation, VLM analysis, watermark, CORS, job storage |

---

## 3. Data Flow Traces

### 3.1 Complete Request Trace (Happy Path — Local AI)

```
User clicks "Create Preview"
  │
  ▼
[product-detail.tsx:470] handleGenerate()
  ├─ [line 480-486] Pre-fetch product image as base64 via fetchImageAsBase64()
  ├─ [line 489-500] POST /api/try-on with { productId, selfieData, productImageUrl, productImageBase64, productName, categorySlug }
  │
  ▼
[route.ts:146] POST handler
  ├─ [line 156-157] Detect Vercel vs local
  ├─ [line 268] Non-Vercel → handleLocalAIGeneration()
  │   ├─ [line 299] isZAIAvailable() → check health
  │   ├─ [line 335-349] Resolve product from DB
  │   ├─ [line 352-360] Fallback to client-provided details
  │   ├─ [line 363-378] Fallback to Shopify
  │   ├─ [line 384-393] Resolve product image base64
  │   ├─ [line 402-456] Build suggestionsPromise (DB or Shopify)
  │   ├─ [line 458] Generate jobId: `job_{timestamp}_{random6}`
  │   ├─ [line 461-464] createJob(jobId, { categorySlug, productName })
  │   ├─ [line 467-474] runPipeline({...}) — fired and forgotten
  │   └─ [line 476-481] Return { jobId, status: 'processing' }
  │
  ▼
[product-detail.tsx:655-693] Poll loop
  ├─ GET /api/try-on?jobId=xxx every 2 seconds
  ├─ [route.ts:486] GET handler → getJob(jobId) → return job state
  ├─ Update progressMessage from pollData.progress
  └─ When status='completed' → display result
  │
  ▼
[try-on-pipeline.ts:550] runPipeline() — background execution
  ├─ Phase 0 [line 559-569]: Await suggestionsPromise
  ├─ Phase 1 [line 572-588]: VLM product analysis + person description (parallel)
  ├─ Phase 2 [line 591-654]: Multi-strategy generation (A→B→C→D)
  ├─ Phase 3 [line 657-686]: VLM verification of each result
  ├─ Phase 4 [line 689-722]: Refinement pass if colorScore < 7
  ├─ Phase 5 [line 725]: Log final scores
  └─ Phase 6 [line 728-749]: Watermark via addWatermark() → update job
```

### 3.2 Error Handling Branches

```
POST /api/try-on
  ├─ AI unavailable on Vercel?
  │   ├─ Try proxy (Strategy 1) [line 168-225]
  │   ├─ Try direct SDK (Strategy 2) [line 228-242]
  │   └─ Canvas fallback (Strategy 3) [line 244-264]
  ├─ AI unavailable locally?
  │   └─ handleLocalAIGeneration [line 299-312] → canvas mode
  ├─ Product not found?
  │   └─ [line 380-382] → 404
  ├─ Product image unavailable?
  │   └─ [line 395-399] → 400
  └─ Pipeline exception?
      └─ [line 750-761] → job.status = 'failed', user-friendly error

Client-side fallback chain:
  ├─ Server returns canvas mode [line 505-619]
  │   ├─ Try direct proxy call [line 523-602]
  │   └─ generateCanvasFallback() [line 606-615]
  ├─ Server returns 503 [line 623-636]
  │   └─ generateCanvasFallback()
  ├─ Any catch block [line 694-709]
  │   └─ generateCanvasFallback()
  └─ Canvas also fails? → setError() [line 616, 706]
```

### 3.3 Vercel Proxy Trace

```
User on Vercel → POST /api/try-on
  │
  ▼
[route.ts:166-265] Vercel branch
  ├─ [line 168] ZAI_PROXY_URL configured?
  │   ├─ Yes → fetch(proxyUrl/api/try-on, POST) [line 198-203]
  │   │   ├─ 200 → return proxy result [line 206-214]
  │   │   └─ Error → fall through
  │   └─ No → skip
  ├─ [line 228-242] ZAI_BASE_URL + ZAI_API_KEY configured?
  │   ├─ isZAIAvailable() → true → handleLocalAIGeneration()
  │   └─ false → fall through
  └─ [line 244-264] Canvas mode response
```

---

## 4. Core Module: try-on-pipeline.ts

**File:** `src/lib/try-on-pipeline.ts` | **762 lines**

### 4.1 Exported Functions

| Function | Signature | Line | Description |
|----------|-----------|-----:|-------------|
| `createJob` | `(id: string, data: Partial<TryOnJob>): TryOnJob` | 56 | Creates a new job in the Map, merges defaults, returns the job object |
| `getJob` | `(id: string): TryOnJob \| undefined` | 67 | Retrieves a job by ID |
| `deleteJob` | `(id: string): boolean` | 71 | Removes a job from the Map |
| `runPipeline` | `(input: PipelineInput): Promise<void>` | 550 | Main pipeline — runs all phases asynchronously |

### 4.2 Types

#### `TryOnJob` (line 26-40)

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

#### `PipelineInput` (line 541-548)

```typescript
export interface PipelineInput {
  jobId: string
  productName: string
  categorySlug: string
  selfieData: string
  productImageBase64: string
  suggestionsPromise: Promise<any>
}
```

### 4.3 Job Storage System

**Location:** Lines 44-54

The pipeline uses an in-memory `Map<string, TryOnJob>` for job storage:

```typescript
const jobs = new Map<string, TryOnJob>()
```

**TTL & Cleanup:**
- Jobs older than **15 minutes** are deleted (line 50: `15 * 60 * 1000`)
- Cleanup runs every **5 minutes** via `setInterval` (line 47-54)
- No persistence — jobs are lost on server restart (acceptable for a stateless API route)

**Design Rationale:** In-memory Map was chosen over Redis/database because:
1. Jobs are short-lived (max ~4 minutes active + 15 min TTL)
2. The server is typically a single instance (sandbox or Vercel serverless)
3. Avoids external dependency for transient data

### 4.4 Rate Limiting

**Location:** Line 77-81

```typescript
const API_CALL_DELAY = 1200  // ms between API calls

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
```

Every AI API call is followed by `await delay(API_CALL_DELAY)` to respect rate limits. This 1.2-second delay is applied between:
- VLM analysis calls (Phase 1 → Phase 2 transition, line 588)
- Each generation strategy (Phase 2, lines 609, 622, 636)
- Each VLM verification (Phase 3, line 664)
- Refinement pass (Phase 4, lines 705, 711)

### 4.5 CATEGORY_CONFIG Object

**Location:** Lines 85-157

```typescript
interface CategoryConfig {
  placement: string      // How the product is worn/positioned
  size: ImageSize        // Output image dimensions
  colorFocus: string     // What colors must match exactly
  bodyType: string       // Camera framing instruction
  useProductEdit: boolean // Whether product-first edit makes sense
}
```

| Category | placement | size | colorFocus (abbreviated) | bodyType | useProductEdit |
|----------|-----------|------|--------------------------|----------|:-:|
| `jewelry` | "wearing the jewelry piece" | `864x1152` | jewelry metal tone + stone colors must match EXACTLY | Close-up beauty photograph from chest up | ✅ |
| `sarees` | "draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist" | `768x1344` | saree fabric color, border color, and zari/work color must match EXACTLY | Full-body professional fashion photograph | ❌ |
| `watches` | "wearing the watch on the left wrist" | `864x1152` | watch dial color, case metal color, and strap color must match EXACTLY | Close-up photograph from waist up | ✅ |
| `fashion` | "wearing the outfit" | `768x1344` | outfit fabric color, print pattern, and accent colors must match EXACTLY | Full-body professional fashion photograph | ❌ |
| `mens-shirts` | "wearing the shirt" | `768x1344` | shirt fabric color, pattern, and collar/cuff details must match EXACTLY | Full-body professional fashion photograph | ❌ |
| `mens-shirts-t-shirts` | "wearing the shirt" | `768x1344` | shirt fabric color, pattern, and details must match EXACTLY | Full-body professional fashion photograph | ❌ |
| `leather-goods` | "holding the leather product" | `864x1152` | leather color, grain texture, and hardware metal color must match EXACTLY | Professional product-in-use photograph | ✅ |
| `fragrances` | "holding the fragrance bottle" | `864x1152` | bottle shape, cap color, and liquid color must match EXACTLY | Professional product-in-use photograph | ✅ |
| `home-living` | "with the home decor product" | `1344x768` | product colors, materials, and finish must match EXACTLY | Professional lifestyle photograph | ✅ |

#### Dynamic Jewelry Placement Override

**Location:** Lines 165-177

The `getCategoryConfig()` function (line 159) performs keyword matching on the product name for jewelry sub-categories:

| Keywords in product name | Override placement |
|--------------------------|--------------------|
| `earring`, `jhumka`, `stud` | "wearing earrings on both earlobes" |
| `necklace`, `choker`, `pendant`, `temple`, `haar`, `mala` | "wearing a necklace around the neck" |
| `bracelet`, `cuff`, `bangle`, `kada` | "wearing a bracelet on the wrist" |
| `ring` | "wearing a ring on the finger" |
| `set`, `bridal` | "wearing a matching jewelry set — necklace around the neck and earrings on both earlobes" |

If no category matches, `CATEGORY_CONFIG.jewelry` is used as the default (line 162).

### 4.6 VLM Helper Functions

#### `vlmAnalyze` (line 184-203)

```typescript
async function vlmAnalyze(
  prompt: string,
  imageUrl: string,
  timeoutMs = 30000
): Promise<string>
```

- Creates a ZAI SDK instance via `createZAI()` (line 186)
- Calls `zai.chat.completions.createVision()` with model `glm-4v-plus` (line 188-195)
- Uses `Promise.race()` with a timeout (default 30s) to prevent hanging (line 187-197)
- Returns the text content from `result.choices[0]?.message?.content` or empty string on failure
- Catches all errors, logs first 200 chars, returns empty string (line 199-202)

#### `vlmCompare` (line 205-225)

```typescript
async function vlmCompare(
  prompt: string,
  image1Url: string,
  image2Url: string,
  timeoutMs = 45000
): Promise<string>
```

- Same as `vlmAnalyze` but passes **two** image URLs in the messages array (line 211-214)
- Longer default timeout (45s) since dual-image comparison is more compute-intensive
- Used exclusively in Phase 3 (verification) and Phase 4 (refinement verification)

### 4.7 Image Generation Helpers

#### `safeImageEdit` — Single Image (line 233-250)

```typescript
async function safeImageEdit(
  prompt: string,
  imageUrl: string,
  size: ImageSize
): Promise<string | null>
```

- Calls `zai.images.generations.edit()` with `images: [{ url: imageUrl }]` (line 236-240)
- Cast to `any` to bypass TypeScript — the SDK types don't include the `images` field (line 240)
- Returns `data:image/png;base64,{base64}` on success, `null` on failure
- Used by: Strategy B (selfie edit), Strategy C (product edit), Phase 4 (refinement)

#### `safeImageEditDual` — Dual Image (line 259-284)

```typescript
async function safeImageEditDual(
  prompt: string,
  selfieUrl: string,
  productUrl: string,
  size: ImageSize
): Promise<string | null>
```

- **Key innovation:** Passes BOTH selfie and product in the `images` array (line 269-273)
- The AI model can SEE both images, enabling exact color matching
- Used exclusively by Strategy A (the primary strategy)
- This is the most accurate generation method

#### `safeImageCreate` — Text-to-Image (line 286-302)

```typescript
async function safeImageCreate(
  prompt: string,
  size: ImageSize
): Promise<string | null>
```

- Calls `zai.images.generations.create()` — no input images, purely text-based
- Used by: Strategy D (last resort fallback)

### 4.8 VLM Prompts

#### PRODUCT_ANALYSIS_PROMPT (line 306-316)

```
Analyze this luxury product for a virtual try-on system. I need EXACT visual details.

Respond EXACTLY in this format:
TYPE: [specific product type, e.g. "diamond bib necklace", "maroon kanjeevaram silk saree"]
MAIN_COLOR: [the dominant color with hex code, e.g. "deep maroon red #8B1A1A"]
SECONDARY_COLOR: [secondary/accent color with hex, e.g. "gold zari #CFB53B"]
METAL_COLOR: [metal tone if applicable, e.g. "warm yellow gold #DAA520", or "none"]
MATERIALS: [comma-separated, e.g. "18k white gold, round brilliant-cut diamonds"]
KEY_DETAILS: [2-3 most visible design elements that must be preserved]

CRITICAL: Color accuracy is #1 priority. Use specific color names with hex codes.
```

**Design:** Structured format with hex codes ensures precise color extraction. The `MAIN_COLOR` field is used in all generation prompts as a specific color anchor.

#### VERIFICATION_PROMPT (line 318-337)

```
Compare these two images for a virtual try-on:
IMAGE 1: AI-generated try-on result
IMAGE 2: Original product image

Rate on 0-10 scale:
1. COLOR: How well do the product colors match?
2. SHAPE: How well does the product shape/design match?
3. FACE: How well is the person's face preserved?
4. OVERALL: Overall product accuracy

Respond EXACTLY:
COLOR: [score]
SHAPE: [score]
FACE: [score]
OVERALL: [score]
ISSUE: [if COLOR<7, describe the specific color mismatch]
VERDICT: PASS or FAIL
```

**Design:** The `ISSUE` field is critical for the refinement phase — it provides specific color correction instructions (e.g., "necklace is silver but should be gold #DAA520").

### 4.9 Parsing Helpers

#### `parseProductAnalysis` (line 351-382)

```typescript
function parseProductAnalysis(raw: string): ProductInfo
```

Parses the structured VLM response into a `ProductInfo` object:

```typescript
interface ProductInfo {
  type: string            // e.g., "diamond bib necklace"
  mainColor: string       // e.g., "deep maroon red #8B1A1A"
  secondaryColor: string  // e.g., "gold zari #CFB53B"
  metalColor: string      // e.g., "warm yellow gold #DAA520" or "none"
  materials: string[]     // e.g., ["18k white gold", "round brilliant-cut diamonds"]
  keyDetails: string[]    // e.g., ["intricate floral motif", "teardrop centerpiece"]
  colorSummary: string    // Compact: "MAIN: deep maroon red #8B1A1A. ACCENT: gold zari #CFB53B. METAL: warm yellow gold #DAA520"
}
```

**Logic:** Line-by-line parsing with `startsWith()` matching. The `colorSummary` field (line 374-379) is a compact representation used in prompts where image context is unavailable (Strategies B and D).

#### `parseVerification` (line 393-432)

```typescript
function parseVerification(raw: string): VerificationResult
```

```typescript
interface VerificationResult {
  colorScore: number    // 0-10, default 5
  shapeScore: number    // 0-10, default 5
  faceScore: number     // 0-10, default 5
  overallScore: number  // 0-10, default 5
  issue: string         // Specific color mismatch description
  passed: boolean       // Explicit PASS or implicit (colorScore >= 7 && overallScore >= 6)
}
```

**Implicit pass logic (line 430):** Even if VLM says "FAIL", the result is treated as passing if `colorScore >= 7 && overallScore >= 6`. This handles cases where the VLM is overly strict.

### 4.10 Prompt Construction Functions

#### `buildDualImagePrompt` (line 449-469)

Used by **Strategy A** (dual-image edit). Both images are passed as API parameters, so the prompt focuses on *instructions* rather than descriptions:

```
Professional fashion photograph. {bodyType}.

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "{productName}" ({productInfo.type}).

Show this EXACT person {placement}. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's {colorFocus} — refer to the SECOND image for exact colors
3. Match the MAIN color especially: {mainColor}
4. Match the METAL color: {metalColor}    [conditional — only if metalColor !== "none"]
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

**Example substitution** for a gold necklace:
```
3. Match the MAIN color especially: warm yellow gold #DAA520
4. Match the METAL color: warm yellow gold #DAA520
```

#### `buildSelfieEditPrompt` (line 475-494)

Used by **Strategy B** (selfie-only edit). Only the selfie image is passed; product colors are described in text:

```
Professional fashion photograph. {bodyType} of this EXACT person {placement}.
The product is "{productName}" — a {productInfo.type}.

PRODUCT COLOR SCHEMA: {colorSummary}
MATERIALS: {materials joined}
KEY DETAILS: {keyDetails joined}

CRITICAL RULES:
1. Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them at all
2. The product's {colorFocus}
3. Match the MAIN color especially: {mainColor}
4. Match the METAL color: {metalColor}    [conditional]
5. The product must look realistic, natural, and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

**Trade-off:** Better face preservation than Strategy A (only selfie is edited), but worse color accuracy since colors are text-described.

#### `buildProductEditPrompt` (line 500-517)

Used by **Strategy C** (product-only edit). Only the product image is passed; the person is described in text:

```
Professional fashion photograph. {bodyType} showing this EXACT product "{productName}" being worn by a person who is {placement}.

PERSON: {personDesc}

CRITICAL RULES:
1. The product's colors, materials, and design MUST match EXACTLY as shown in this image
2. {colorFocus}
3. The person should look natural and realistic wearing the product
4. The product must be the focal point and clearly visible

Studio lighting, photorealistic, 8K quality.
```

**Trade-off:** Best product color preservation (product is the input image), but the generated person won't match the user's face.

#### `buildTextToImagePrompt` (line 523-537)

Used by **Strategy D** (text-to-image). No images are passed; everything is text-described:

```
{bodyType} of a person {placement}. The product is "{productName}" — a {productInfo.type}.

PRODUCT: {colorSummary}. Materials: {materials}. Key details: {keyDetails}
PERSON: {personDesc}

Show the product being worn with EXACT colors, materials, and details as described.
The {colorFocus}.

Photorealistic, studio lighting, 8K, high detail.
```

**Trade-off:** Last resort. Neither face nor colors are guaranteed, but always produces some output.

### 4.11 Main Pipeline: `runPipeline()` — Phase by Phase

**Location:** Lines 550-762

#### Phase 0: Fetch Suggestions (line 558-569)

```typescript
const suggestions = await suggestionsPromise
const formattedSuggestions = suggestions.map((s: any) => ({
  id: s.id, name: s.name, price: s.price,
  image: JSON.parse(s.images || '[]')[0] || '/images/placeholder.jpg',
  category: s.category?.name || '', categorySlug: s.category?.slug || '',
}))
job.suggestions = formattedSuggestions
```

The `suggestionsPromise` was created in `route.ts` and resolves in parallel with Phase 1. It fetches complementary products from paired categories.

#### Phase 1: Product Analysis (line 571-588)

```typescript
const [analysisRaw, personDesc] = await Promise.all([
  vlmAnalyze(PRODUCT_ANALYSIS_PROMPT, productImageBase64),   // line 577
  vlmAnalyze('Describe this person briefly...', selfieData),  // line 578-581
])
const productInfo = parseProductAnalysis(analysisRaw)  // line 584
```

**Two VLM calls in parallel:**
1. Product analysis → extracts colors, materials, key details
2. Person description → 1-2 sentence appearance description

**Result:** `productInfo` object with hex-coded colors; `personDesc` string for text-based strategies.

#### Phase 2: Multi-Strategy Generation (line 590-654)

Strategies are attempted **sequentially** (not in parallel) with rate-limit delays:

| Strategy | Line | Function | Input Images | Expected Accuracy |
|----------|-----:|----------|-------------|-------------------|
| A (Primary) | 598-606 | `safeImageEditDual()` | Selfie + Product | Color: 9/10, Face: 8/10 |
| B (Selfie Edit) | 610-618 | `safeImageEdit()` | Selfie only | Color: 6/10, Face: 9/10 |
| C (Product Edit) | 621-632 | `safeImageEdit()` | Product only | Color: 9/10, Face: 4/10 |
| D (Text-to-Image) | 635-644 | `safeImageCreate()` | None | Color: 5/10, Face: 3/10 |

**Strategy C** is conditional — only attempted if `config.useProductEdit === true` (line 621). Categories like `sarees` and `fashion` disable this because the product image alone doesn't convey how the outfit should look on a person.

**Strategy D** is only attempted if all previous strategies failed (line 635: `results.length === 0`).

**Canvas fallback** (line 646-654): If all AI strategies fail, `job.strategy = 'canvas-fallback'` and `job.imageUrl = ''` (empty string).

#### Phase 3: VLM Verification & Selection (line 657-686)

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

  // Early exit: if colorScore >= 8 and passed, stop checking
  if (verification.colorScore >= 8 && verification.passed) break
}
```

**Key behaviors:**
- Results are verified one at a time with delays
- The best result is tracked by `overallScore`
- **Early exit optimization:** If a result scores `colorScore >= 8` AND `passed`, we skip verifying remaining results (line 676)
- If no verification succeeds, defaults to `results[0]` with score 5/5/5/5 (line 680-686)

#### Phase 4: Refinement Pass (line 689-722)

Only triggered if `bestVerification.colorScore < 7` (line 692):

```typescript
let correction = bestVerification.issue
if (!correction || correction.length < 10) {
  correction = `The product colors don't match. It should be: ${productInfo.colorSummary}. Fix the product to match these exact colors.`
}

const refinementPrompt = `Professional fashion photograph refinement.
${correction}. The ${config.colorFocus}.
Keep the person's face, body, and pose EXACTLY the same.
Only adjust the product to match its correct colors and materials.
Studio lighting, photorealistic, 8K quality.`

const refined = await safeImageEdit(refinementPrompt, bestResult.imageUrl, config.size)
```

**Refinement logic:**
1. Uses the `ISSUE` field from verification as the correction instruction (line 697)
2. If the issue is too vague (< 10 chars), falls back to a generic correction based on `colorSummary` (line 698-701)
3. The refinement is itself verified via `vlmCompare()` (line 712)
4. Only uses the refined result if `overallScore` improved (line 717)
5. Refined strategy name is appended with `-refined` (e.g., `"dual-image-edit-refined"`)

#### Phase 5: Record Final Scores (line 724-725)

Logs the final strategy, color score, face score, and overall score.

#### Phase 6: Watermark + Deliver (line 728-749)

```typescript
let finalImageUrl = finalResult.imageUrl
try {
  finalImageUrl = await addWatermark(finalResult.imageUrl)
} catch (wmErr) {
  // Watermark failure is non-fatal — original image is used
}

job.status = 'completed'
job.imageUrl = finalImageUrl
job.strategy = finalResult.strategy
job.colorAccuracy = bestVerification.colorScore
job.faceAccuracy = bestVerification.faceScore
job.totalPasses = totalPasses
job.pipelinePhase = 'complete'
```

**Key design:** Watermark failure is caught and silently ignored — the unwatermarked image is still delivered.

---

## 5. Core Module: zai.ts

**File:** `src/lib/zai.ts` | **260 lines**

### 5.1 Configuration Resolution Chain

`getZAIConfig()` (line 127-174) resolves configuration in this priority order:

| Priority | Source | Conditions |
|:--------:|--------|------------|
| 1 | `process.env.ZAI_BASE_URL` + `process.env.ZAI_API_KEY` | Both must be present |
| 2 | `{cwd}/.z-ai-config` file | Not on Vercel (`!process.env.VERCEL`) |
| 3 | `~/.z-ai-config` file | Not on Vercel |
| 4 | `/etc/.z-ai-config` file | Not on Vercel |
| 5 | Return `null` | No config found |

**Config file format:**
```json
{
  "baseUrl": "http://172.25.x.x:3001/v1",
  "apiKey": "sk-...",
  "chatId": "...",
  "token": "...",
  "userId": "..."
}
```

**Vercel optimization (line 141-143):** File-based config is skipped entirely on Vercel to avoid unnecessary filesystem access in serverless functions.

### 5.2 Health Check Caching

#### `isAIReachable()` (line 31-81)

**Cache:** `healthCache` with 30-second TTL (`HEALTH_CACHE_TTL = 30_000`, line 8)

**Logic:**
1. Return cached result if within TTL (line 33-35)
2. Detect internal IP vs external URL (line 38)
3. **Internal IP:** Fetch `{baseUrl}/dashboard/` with 4s timeout (line 42-52)
4. **External URL:** Fetch `{baseUrl}/api/try-on/status` with 5s timeout, including `Abc` header for `.space-z.ai` gateway (line 54-76)
5. On failure: cache `reachable: false` to avoid repeated failing checks

#### `isProxyReachable()` (line 86-122)

**Cache:** `proxyHealthCache` with 60-second TTL (`PROXY_HEALTH_CACHE_TTL = 60_000`, line 11)

- Always checks `{proxyUrl}/api/try-on/status`
- Includes `Abc` header for `.space-z.ai` authentication
- 5s timeout

### 5.3 Gateway Authentication for .space-z.ai

`getAbcHeader()` (line 16-26):

```typescript
function getAbcHeader(urlStr: string): string | undefined {
  const hostname = new URL(urlStr).hostname
  if (hostname.includes('.space-z.ai')) {
    return hostname.split('.')[0]  // Extract subdomain as auth token
  }
  return undefined
}
```

The `.space-z.ai` gateway uses the subdomain prefix as an authentication token in the `Abc` header. For example, if the URL is `https://abc123.space-z.ai`, the `Abc` header is set to `abc123`.

### 5.4 SDK Instance Creation Flow

`createZAI()` (line 230-260):

```
createZAI()
  ├─ getZAIConfig() → config found?
  │   ├─ Yes → new ZAI({ baseUrl, apiKey, chatId, token, userId })  [line 235-241]
  │   └─ No →
  │       ├─ On Vercel? → throw Error('AI_STYLE_SERVICE_UNAVAILABLE')  [line 249]
  │       └─ Not Vercel → ZAI.create() (file-based)  [line 254]
  │           ├─ Success → return instance
  │           └─ Failure → throw Error('AI_STYLE_SERVICE_UNAVAILABLE')  [line 259]
```

### 5.5 Availability Check

`isZAIAvailable()` (line 179-225) returns:

```typescript
{ available: boolean, mode: 'ai' | 'proxy' | 'unavailable', reason?: string }
```

**Resolution chain:**
1. No config → try proxy → return `mode: 'proxy'` or `'unavailable'`
2. Config exists → `isAIReachable()` → return `mode: 'ai'`
3. Config exists but unreachable → try proxy → return `mode: 'proxy'` or `'unavailable'`

---

## 6. Core Module: route.ts

**File:** `src/app/api/try-on/route.ts` | **535 lines**

### 6.1 POST Handler — Three-Tier Strategy (line 146-294)

```
POST /api/try-on
  │
  ├─ Is Vercel?
  │   ├─ YES → Strategy 1: Proxy [line 168-225]
  │   │         Strategy 2: Direct SDK [line 228-242]
  │   │         Strategy 3: Canvas fallback [line 244-264]
  │   └─ NO → handleLocalAIGeneration() [line 268]
  │
  └─ Catch → Error handling [line 269-293]
      ├─ AI_STYLE_SERVICE_UNAVAILABLE → Canvas mode response
      └─ Other → 500 error
```

### 6.2 Product Image Resolution — 6 Source Types

`getProductImageBase64()` (line 32-103) handles these URL formats:

| # | Pattern | Resolution Method | Line |
|:-:|---------|-------------------|-----:|
| 1 | `https://...` or `http://...` | Direct fetch with Mozilla User-Agent | 36-53 |
| 2 | `//cdn.example.com/...` | Prepend `https:` and recurse | 56-58 |
| 3 | `/api/image-proxy?url=...` | Extract original URL, fetch directly; fallback to local HTTP | 60-81 |
| 4 | `/images/product.jpg` (local path) | HTTP fetch from `NEXT_PUBLIC_BASE_URL` | 83-84 |
| 5 | Same local path (Vercel fallback) | Skip filesystem on Vercel | 87 |
| 6 | Same local path (dev fallback) | Direct `fs.readFileSync()` from `public/` dir | 87-100 |

**Important:** The HTTP fetch method (`getProductImageBase64ViaHttp`, line 12-30) is preferred over filesystem reads because it works identically on both local dev (Next.js serves `/public`) and Vercel (CDN serves assets).

### 6.3 `handleLocalAIGeneration()` — Complete Walkthrough (line 298-482)

```
handleLocalAIGeneration(body, isVercel)
  │
  ├─ [line 299-313] Check AI availability → canvas mode if unavailable
  │
  ├─ [line 315-322] Validate required fields + selfie format
  │
  ├─ [line 325-378] Resolve product info (3-tier):
  │   ├─ Tier 1: DB lookup (Prisma) [line 335-349]
  │   ├─ Tier 2: Client-provided details [line 352-360]
  │   └─ Tier 3: Shopify fallback [line 363-378]
  │
  ├─ [line 384-399] Resolve product image base64
  │   ├─ Prefer client-provided base64 [line 388-389]
  │   └─ Fallback: server-side resolution [line 390-393]
  │
  ├─ [line 402-456] Build suggestionsPromise
  │   ├─ Vercel: Shopify products filtered by pairing categories [line 405-423]
  │   └─ Local: DB query with rating sort, Shopify fallback [line 424-456]
  │
  ├─ [line 458-464] Create job: jobId = `job_{timestamp}_{random6}`
  │
  ├─ [line 467-474] Fire-and-forget runPipeline()
  │
  └─ [line 476-481] Return { jobId, status: 'processing', productName, categorySlug }
```

### 6.4 GET Handler — Job Polling with Proxy Fallback (line 486-535)

```
GET /api/try-on?jobId=xxx
  │
  ├─ [line 491] getJob(jobId) → found?
  │   ├─ YES → Return full job state [line 520-534]
  │   └─ NO → Try proxy [line 494-516]
  │       ├─ ZAI_PROXY_URL configured?
  │       │   ├─ YES → Fetch proxyUrl/api/try-on?jobId=xxx [line 498-504]
  │       │   │   ├─ Success → Return proxy result [line 510-511]
  │       │   │   └─ Error → 404 [line 514]
  │       │   └─ NO → 404 [line 517]
  │       └─ Return 404
```

### 6.5 Category Pairing Logic (line 131-142)

`getPairingCategory()` defines which product categories complement each other:

| Category | Paired With |
|----------|-------------|
| `sarees` | `jewelry` |
| `jewelry` | `sarees`, `fashion` |
| `watches` | `mens-shirts`, `leather-goods` |
| `mens-shirts` | `watches`, `leather-goods` |
| `fashion` | `jewelry`, `watches` |
| `fragrances` | `jewelry`, `fashion` |
| `leather-goods` | `watches`, `fashion` |
| *(default)* | `jewelry` |

These pairings drive the "Complete the Look" suggestions shown in the result step.

### 6.6 Proxy Helpers (line 107-127)

**`getProxyHeaders()`** (line 107-118): Sets `Content-Type: application/json` and conditionally adds `Abc` header for `.space-z.ai` URLs.

**`buildProxyUrl()`** (line 120-127): Concatenates base URL + path + optional query parameters.

---

## 7. Core Module: product-detail.tsx

**File:** `src/components/product-detail.tsx` | **1,769 lines** (TryOnDialog: lines 384-1094)

### 7.1 TryOnDialog Component — 4-Step State Machine

**Location:** Lines 384-1094

```typescript
type Step = 'upload' | 'preview' | 'generating' | 'result'
```

| Step | Description | UI Elements | Transitions |
|------|-------------|-------------|-------------|
| `upload` | User selects a selfie | File drop zone, product preview, tips | → `preview` (on file select) |
| `preview` | User confirms selfie | Selfie + product side-by-side, Retake/Create buttons | → `upload` (retake) or `generating` (create) |
| `generating` | AI processing in progress | Animated spinner, progress messages, product gallery | → `result` (success) or `preview` (error) |
| `result` | Final try-on image displayed | Watermarked result, match scores, suggestions, Save/Try Again | → `upload` (reset) |

**State variables** (lines 407-418):

| Variable | Type | Purpose |
|----------|------|---------|
| `step` | `Step` | Current state machine position |
| `selfiePreview` | `string \| null` | Compressed selfie for display |
| `selfieData` | `string \| null` | Compressed selfie base64 for API |
| `resultImage` | `string \| null` | Raw AI-generated image |
| `watermarkedResult` | `string \| null` | Watermarked version displayed to user |
| `error` | `string \| null` | Error message |
| `strategy` | `string \| null` | Generation strategy name |
| `suggestions` | `SuggestionItem[]` | Complementary products |
| `addedIds` | `Set<string>` | Cart-added suggestion IDs (for UI feedback) |
| `colorAccuracy` | `number \| null` | Color match score (0-10) |
| `faceAccuracy` | `number \| null` | Face match score (0-10) |
| `progressMessage` | `string` | Current pipeline progress text |

### 7.2 `compressImage()` — Client-Side Compression (line 96-128)

```typescript
function compressImage(
  file: File,
  maxSize = 1536,    // Max dimension in pixels
  quality = 0.92     // JPEG quality
): Promise<string>
```

**Algorithm:**
1. Read file as data URL via `FileReader` (line 98-126)
2. Create `<img>` element, load the data URL (line 100)
3. Scale down if either dimension exceeds `maxSize` (1,536px) while preserving aspect ratio (line 104-112)
4. Draw to canvas with `imageSmoothingQuality: 'high'` (line 117-119)
5. Export as JPEG at 92% quality via `canvas.toDataURL()` (line 120)

**Result:** A base64 data URL string like `data:image/jpeg;base64,/9j/4AAQ...`

**Why 1,536px?** The AI API accepts images up to ~2,048px. 1,536px provides good quality while keeping the base64 payload manageable (~200-500KB vs 2-5MB for a 4K selfie).

### 7.3 `generateCanvasFallback()` — Canvas Composite (line 140-344)

```typescript
function generateCanvasFallback(
  selfieData: string,
  productImageUrl: string,
  productName: string,
  productImageBase64?: string
): Promise<string | null>
```

**Composite layers (in draw order):**

| Layer | Description | Position |
|-------|-------------|----------|
| 1. Selfie base | User's selfie scaled to canvas size | Full canvas |
| 2. Vignette | Radial gradient darkening edges | Full canvas |
| 3. Product panel | Dark rounded rectangle with gold border | Bottom-right |
| 4. Product image | Product photo inside panel (or 👗 emoji fallback) | Inside panel |
| 5. Product label | Truncated product name in gold | Below product image in panel |
| 6. "STYLE PREVIEW" badge | Dark badge with gold text and ✨ | Top-left |
| 7. "3BOXES GIFTS" watermark | Bottom-right text | Bottom-right |

**Product image loading:**
- Prefers `productImageBase64` (data URL) to avoid CORS (line 291-293)
- Falls back to `/api/image-proxy?url=...` for external URLs (line 297-298)
- 5-second timeout for product image loading (line 288)
- If product image fails, panel still renders with emoji placeholder (line 206-219)

**Selfie load failure** (line 307-337): Creates a minimal dark gradient canvas with just "Style Preview" text and product name.

### 7.4 `handleGenerate()` — Multi-Path Generation Flow (line 470-710)

```
handleGenerate()
  │
  ├─ [line 479-486] Pre-fetch product image as base64
  │
  ├─ [line 489-500] POST /api/try-on
  │
  ├─ [line 505-619] Canvas mode response?
  │   ├─ Extract server-provided productImageBase64 [line 507]
  │   ├─ Try direct proxy call [line 523-602]
  │   │   ├─ Get proxy URL from /api/config or env var [line 512-522]
  │   │   ├─ POST proxyUrl/api/try-on [line 530-542]
  │   │   ├─ Poll proxy for results (120 polls × 2s = 4min) [line 550-586]
  │   │   └─ On success → set result, return
  │   └─ generateCanvasFallback() [line 606-615]
  │
  ├─ [line 623-636] 503 / AI_SERVICE_UNAVAILABLE → canvas fallback
  │
  ├─ [line 639-653] No jobId → canvas fallback
  │
  ├─ [line 655-693] Poll local server for job completion
  │   ├─ GET /api/try-on?jobId=xxx every 2 seconds
  │   ├─ Max 120 polls (4 minutes)
  │   ├─ Update progressMessage from pollData.progress
  │   └─ On completed → display result
  │
  └─ [line 694-709] Catch-all → canvas fallback
```

### 7.5 Background Job Support — Floating Pill Notification

**Location:** Lines 744-748, 1106-1107

When the user closes the dialog during the `generating` step:

```typescript
onOpenChange={(isOpen) => {
  if (!isOpen) {
    if (step === 'generating') {
      onOpenChange(false);  // Close dialog but generation continues
      return;
    }
    reset();  // Only reset if not generating
  }
}}
```

The parent component tracks `backgroundJobStep` state (`'generating' | 'result' | null`, line 1107). When the job completes, a floating pill notification appears (not shown in the TryOnDialog code but managed by the parent `ProductDetail` component via `onBackgroundJob` callback).

### 7.6 `fetchImageAsBase64()` (line 347-370)

Client-side utility to fetch an image URL and convert to base64:

```typescript
async function fetchImageAsBase64(url: string): Promise<string | null>
```

- Data URLs: return as-is (line 350)
- Relative paths: prepend `window.location.origin` (line 353-354)
- Protocol-relative: prepend `https:` (line 355-356)
- 10-second timeout (line 358)
- Returns `null` on any error

---

## 8. Core Module: watermark.ts

**File:** `src/lib/watermark.ts` | **152 lines**

### 8.1 Two Watermark Modes

#### Mode 1: Logo + Text (line 40-99)

Triggered when `public/images/logo.png` exists on the filesystem.

**Pipeline:**
1. Read logo PNG from `public/images/logo.png` (line 42-45)
2. Get logo metadata (width, height) via Sharp (line 46-48)
3. Resize logo to `targetHeight = max(height * 0.08, 36)` with aspect ratio preserved (line 51-52)
4. Apply 60% opacity via `.ensureAlpha(0.6)` (line 58)
5. Generate SVG text overlay: "3BOXES GIFTS" (bold, gold gradient) + "AI Style Preview" (smaller, 50% opacity gold) (line 71-73)
6. Render SVG text to PNG via Sharp (line 77)
7. Composite logo + text side by side on a transparent canvas (line 80-93)
8. Return the composite watermark buffer

**Layout:** `[Logo] [8px gap] [3BOXES GIFTS / AI Style Preview]`

#### Mode 2: Text-Only (line 12-34)

Fallback when logo file is unavailable.

**SVG generation:**
```xml
<svg width="{wmWidth}" height="{wmHeight}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#b8860b;stop-opacity:0.85" />
      <stop offset="50%" style="stop-color:#daa520;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#b8860b;stop-opacity:0.85" />
    </linearGradient>
  </defs>
  <rect rx="4" fill="rgba(0,0,0,0.55)" />
  <text fill="url(#grad)">3BOXES GIFTS</text>
  <text fill="rgba(218,165,32,0.6)">AI Style Preview</text>
</svg>
```

**Color scheme:** Dark goldenrod (#b8860b) → Goldenrod (#daa520) gradient for the main text, semi-transparent gold for the subtext, on a 55% black rounded rectangle.

### 8.2 Sharp Processing Pipeline

`addWatermark()` (line 112-152):

```
addWatermark(imageDataUrl)
  │
  ├─ [line 115-119] Validate data URL format: /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/
  │   └─ Invalid → return original image (non-fatal)
  │
  ├─ [line 121-124] Decode base64 → Buffer, get image metadata (width, height)
  │
  ├─ [line 127] getWatermarkBuffer(width, height) → scaled watermark
  │
  ├─ [line 128-135] Calculate position: bottom-right with padding = max(height * 0.02, 10)
  │
  ├─ [line 138-145] Sharp composite:
  │   sharp(imageBuffer).composite([{ input: wmBuffer, left, top }]).png().toBuffer()
  │
  └─ [line 147] Return `data:image/png;base64,{watermarkedBase64}`
```

**Key design:** Output is always PNG regardless of input format, because the composite with alpha channel requires it.

### 8.3 Watermark Buffer Cache

**Location:** Line 6

```typescript
let watermarkBufferCache: Buffer | null = null
```

**Note:** Although the cache variable is declared, it is **not currently used** — `getWatermarkBuffer()` regenerates the watermark on every call. This is a potential optimization point (see Section 12).

---

## 9. Core Module: ai-proxy/index.ts

**File:** `mini-services/ai-proxy/index.ts` | **557 lines**

A standalone Bun HTTP server running on port 3030 that provides AI try-on capabilities to Vercel deployments by proxying requests to the local ZAI service.

### 9.1 Four-Strategy Generation

**Location:** `backgroundProcess()` lines 250-385

| Strategy | Line | Images | Prompt Style | Face Score | Product Score |
|----------|-----:|--------|-------------|:-:|:-:|
| 1: edit-both | 278-297 | Selfie + Product | "FIRST image is person, SECOND image is product" | 8 | 9 |
| 2: edit-selfie | 303-321 | Selfie only | Product described in text from VLM analysis | 9 | 6 |
| 3: edit-product | 327-345 | Product only | Person described in text from VLM analysis | 5 | 8 |
| 4: create-detailed | 348-375 | None | Full text description | 4 | 6 |

**Key difference from pipeline.ts:** The proxy service uses **sequential first-success** strategy — it returns the first successful result immediately without VLM verification or refinement. This trades accuracy for speed, which is appropriate since the proxy is typically a fallback path.

### 9.2 VLM Analysis

**Location:** Lines 262-272

Two VLM calls (sequential with delay):

1. **Person description** (line 266):
   ```
   Describe this person's appearance for a virtual try-on: face shape, skin tone (exact shade),
   hair color and style, body type, and any visible accessories. Be specific about colors. 2-3 sentences.
   ```

2. **Product description** (line 271):
   ```
   Describe this product in detail for a virtual try-on: exact type, EXACT primary and secondary colors
   (be very specific - e.g., "deep maroon red" not just "red"), material/texture, key design elements,
   patterns, embellishments, and how it would be worn on a person. 2-3 sentences.
   ```

These are less structured than the pipeline's `PRODUCT_ANALYSIS_PROMPT` — they produce free-text descriptions rather than parsed fields with hex codes.

### 9.3 Job Storage and Cleanup

**Location:** Lines 86-96

```typescript
const jobs = new Map<string, TryOnJob>()

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {  // 10-minute TTL (vs 15 min in pipeline.ts)
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)  // Cleanup every 5 minutes
```

**Difference from pipeline.ts:** Shorter TTL (10 minutes vs 15 minutes) since the proxy is a lightweight service.

### 9.4 CORS Handling

**Location:** Lines 428-432

```typescript
res.setHeader('Access-Control-Allow-Origin', '*')
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Abc')
if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
```

Permissive CORS since the proxy is called cross-origin from Vercel deployments. The `Abc` header is explicitly allowed for `.space-z.ai` gateway authentication.

### 9.5 ZAI Configuration

**Location:** Lines 23-54

IIFE that checks three file paths in order:
1. `/etc/.z-ai-config`
2. `{cwd}/.z-ai-config`
3. `~/.z-ai-config`

Falls back to environment variables (`ZAI_BASE_URL`, `ZAI_API_KEY`, etc.).

**Difference from zai.ts:** No health check caching — the proxy service assumes the ZAI service is always reachable on the local network. If it's not, individual API calls will fail and the strategies will cascade.

### 9.6 Watermark

**Location:** Lines 133-179

A simplified text-only watermark (same SVG as watermark.ts Mode 2) implemented directly in the proxy service. This avoids importing the full watermark.ts module and its logo dependency.

### 9.7 HTTP Server Endpoints

| Endpoint | Method | Line | Response |
|----------|--------|-----:|----------|
| `/api/try-on/status` | GET | 439-444 | `{ available: boolean }` — health check |
| `/api/try-on` | GET | 447-476 | Job status — same shape as route.ts GET |
| `/api/try-on` | POST | 479-542 | Create job — returns `{ jobId, status, productName, categorySlug }` |
| Any other | * | 545-546 | 404 `{ error: 'Not found' }` |

---

## 10. Cross-Cutting Concerns

### 10.1 Error Handling Strategy

**Philosophy:** Graceful degradation — every error path has a fallback that still delivers value to the user.

| Layer | Error Type | Response |
|-------|-----------|----------|
| **Frontend** | API returns canvas mode | Try direct proxy → canvas fallback → error message |
| **Frontend** | API returns 503 | Canvas fallback → error message |
| **Frontend** | Any exception | Canvas fallback → error message |
| **route.ts** | AI unavailable on Vercel | Proxy → Direct SDK → Canvas mode response |
| **route.ts** | AI unavailable locally | Canvas mode response |
| **route.ts** | Product not found | 404 JSON error |
| **route.ts** | `AI_STYLE_SERVICE_UNAVAILABLE` | Canvas mode response |
| **pipeline.ts** | Individual strategy fails | Try next strategy |
| **pipeline.ts** | All strategies fail | `job.strategy = 'canvas-fallback'`, `job.imageUrl = ''` |
| **pipeline.ts** | Watermark fails | Return unwatermarked image |
| **pipeline.ts** | Entire pipeline throws | `job.status = 'failed'`, user-friendly error message |
| **watermark.ts** | Invalid data URL | Return original image |
| **watermark.ts** | Sharp processing error | Return original image |
| **ai-proxy** | Strategy fails | Try next strategy |
| **ai-proxy** | All strategies fail | `job.status = 'failed'` |
| **zai.ts** | SDK creation fails | Throw `AI_STYLE_SERVICE_UNAVAILABLE` |

**Network error classification** (pipeline.ts line 755):
```typescript
if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') || msg.includes('AI_STYLE_SERVICE_UNAVAILABLE')) {
  job.error = 'Virtual try-on is temporarily unavailable. Our AI style service could not be reached.'
}
```

### 10.2 Rate Limiting Implementation

| Module | Delay | Between What |
|--------|-------|-------------|
| pipeline.ts | 1,200ms | Every AI API call (VLM + generation) |
| ai-proxy | 1,500ms | Every AI API call |

**Why sequential, not parallel?** The ZAI API has rate limits. Parallel calls would trigger 429 errors. The sequential approach with delays is more reliable.

**Impact on latency:** A full pipeline run with 3 strategies and verification makes ~7-9 API calls:
- 2 VLM analysis (parallel, counted as 1 round)
- 1 delay
- 2-3 generation calls (with delays)
- 1-3 verification calls (with delays)
- Optional refinement (2 more calls)
- Total: ~10-15 seconds minimum

### 10.3 Caching

| Cache | Location | TTL | Purpose |
|-------|----------|-----|---------|
| `healthCache` | zai.ts line 7 | 30s | Avoid repeated health checks to AI service |
| `proxyHealthCache` | zai.ts line 10 | 60s | Avoid repeated health checks to proxy |
| `watermarkBufferCache` | watermark.ts line 6 | N/A (unused) | Potential: cache watermark buffer |
| Job Map | pipeline.ts line 44 | 15min | Store active job state |
| Job Map | ai-proxy line 86 | 10min | Store active job state |

### 10.4 Security

| Concern | Implementation | Location |
|---------|---------------|----------|
| **Image validation** | `selfieData.startsWith('data:image/')` check | route.ts line 320 |
| **File size limit** | 10MB client-side check | product-detail.tsx line 444 |
| **File type check** | `file.type.startsWith('image/')` | product-detail.tsx line 440 |
| **Rate limiting** | 1.2-1.5s delays between API calls | pipeline.ts line 77, ai-proxy line 100 |
| **Gateway auth** | `Abc` header for `.space-z.ai` | zai.ts line 16-26, route.ts line 107-118 |
| **CORS** | `Access-Control-Allow-Origin: *` on proxy | ai-proxy line 429 |
| **Timeout protection** | AbortSignal.timeout on all fetches | route.ts lines 17, 43, 202, 503 |
| **VLM timeout** | Promise.race with 30-45s timeout | pipeline.ts lines 196, 218 |
| **Poll limit** | 120 polls × 2s = 4 minutes max | product-detail.tsx line 656 |
| **No persistent storage** | User images are never written to disk | — |

---

## 11. Extension Points

### 11.1 Adding a New Product Category

1. **Add entry to `CATEGORY_CONFIG`** (try-on-pipeline.ts line 93):

```typescript
'shoes': {
  placement: 'wearing the shoes on their feet',
  size: '864x1152',
  colorFocus: 'shoe color, material, and sole design must match EXACTLY',
  bodyType: 'Full-body professional fashion photograph showing feet',
  useProductEdit: false,
},
```

2. **Add jewelry-like keyword overrides** (if applicable) in `getCategoryConfig()` (line 165).

3. **Add pairing category** in route.ts `getPairingCategory()` (line 132):

```typescript
'shoes': ['fashion', 'leather-goods'],
```

4. **Add proxy support** in ai-proxy `getProductPlacement()` (line 108) and `getImageSize()` (line 125).

5. **Add category label** in product-detail.tsx `getCategoryLabel()` (line 713).

### 11.2 Adding a New Generation Strategy (Strategy E)

1. **Define the strategy** in `runPipeline()` after Strategy D (line 644):

```typescript
// Strategy E: Example — Inpainting-based generation
if (results.length === 0) {
  await delay(API_CALL_DELAY)
  console.log(`[pipeline:${jobId}] Strategy E: Inpainting`)
  const inpaintPrompt = buildInpaintingPrompt(config, productName, productInfo, personDesc)
  const sE = await safeImageEdit(inpaintPrompt, selfieData, config.size)
  if (sE) {
    results.push({ imageUrl: sE, strategy: 'inpainting' })
  }
}
```

2. **Or make it a parallel strategy** (requires refactoring Phase 2 to use `Promise.allSettled()`):

```typescript
const [sA, sB, sC] = await Promise.allSettled([
  safeImageEditDual(dualPrompt, selfieData, productImageBase64, config.size),
  delay(API_CALL_DELAY).then(() => safeImageEdit(selfiePrompt, selfieData, config.size)),
  config.useProductEdit
    ? delay(API_CALL_DELAY * 2).then(() => safeImageEdit(productPrompt, productImageBase64, config.size))
    : Promise.resolve(null),
])
```

**Trade-off:** Parallel strategies reduce latency by ~60% but triple API call rate.

3. **Add prompt builder** function (similar to `buildDualImagePrompt`).

4. **Update ai-proxy** `backgroundProcess()` with the same strategy (line 250-385).

5. **Update UI** strategy name mapping in product-detail.tsx (line 981).

### 11.3 Custom Watermark Design

1. **Modify SVG** in `createWatermarkBuffer()` (watermark.ts line 20-31) or `getWatermarkBuffer()` (line 71-73).

2. **Replace logo** by providing a new `public/images/logo.png` file. The watermark system automatically detects and uses it.

3. **Add opacity control** by modifying `ensureAlpha()` parameter (watermark.ts line 58):

```typescript
.ensureAlpha(0.4)  // Change from 0.6 to 0.4 for more transparency
```

4. **Change position** by modifying the calculation in `addWatermark()` (watermark.ts line 133-135):

```typescript
// Move to bottom-left instead of bottom-right
const left = padding  // Was: width - wmWidth - padding
const top = Math.max(height - wmHeight - padding, 0)
```

5. **Enable watermark buffer caching** (optimization):

```typescript
// In getWatermarkBuffer(), add at the start:
if (watermarkBufferCache) return watermarkBufferCache
// And before return:
watermarkBufferCache = composite  // or createWatermarkBuffer result
```

### 11.4 External AI Provider Integration

To add a new AI provider (e.g., OpenAI DALL-E, Stability AI):

1. **Create a provider abstraction** in a new file `src/lib/ai-provider.ts`:

```typescript
interface AIProvider {
  editImage(prompt: string, images: { url: string }[], size: ImageSize): Promise<string | null>
  createImage(prompt: string, size: ImageSize): Promise<string | null>
  analyzeImage(prompt: string, imageUrl: string): Promise<string>
  compareImages(prompt: string, image1: string, image2: string): Promise<string>
}
```

2. **Implement ZAI provider** wrapping existing `safeImageEdit`, `safeImageEditDual`, etc.

3. **Implement new provider** (e.g., OpenAI):

```typescript
class OpenAIProvider implements AIProvider {
  async editImage(prompt, images, size) {
    // OpenAI edit API call
  }
  // ...
}
```

4. **Modify `createZAI()`** to return a provider interface, or add a provider factory.

5. **Update `runPipeline()`** to accept a provider parameter instead of calling `createZAI()` directly.

---

## 12. Performance Characteristics

### 12.1 Memory Usage Patterns

| Component | Memory Pattern | Peak Usage |
|-----------|---------------|------------|
| **Job Map** | Grows with concurrent jobs, cleaned every 5 min | ~1 KB per job × concurrent users |
| **Base64 images** | Each image is ~200-500KB (compressed selfie) or ~1-3MB (AI output) | 2-4 MB per active job |
| **Sharp buffers** | Temporary during watermark compositing | ~2-6 MB (full image + watermark) |
| **VLM responses** | Short text strings (< 1KB each) | Negligible |
| **Suggestions** | 4 product objects with image URLs | ~2 KB |

**Estimated peak per concurrent job:** ~5-10 MB (selfie + product + AI result + watermark buffer)

**Estimated total with 10 concurrent jobs:** ~50-100 MB

### 12.2 API Call Counts Per Request

| Scenario | VLM Calls | Generation Calls | Total API Calls | Approx. Time |
|----------|:---------:|:----------------:|:---------------:|:------------:|
| Strategy A succeeds, passes verification | 2 (analysis) + 1 (verify) | 1 (dual edit) | 4 | ~15-20s |
| Strategy A+B succeed, best verified | 2 + 2 | 2 | 6 | ~25-30s |
| All 3 strategies succeed, all verified | 2 + 3 | 3 | 8 | ~35-40s |
| All 3 succeed + refinement needed | 2 + 3 + 1 | 3 + 1 | 10 | ~45-55s |
| All fail, text-to-image used | 2 + 1 | 4 | 7 | ~35-40s |
| ai-proxy (no verification) | 2 | 1-4 | 3-6 | ~15-25s |

### 12.3 Timing Breakdown by Phase

| Phase | Duration | Bottleneck |
|-------|----------|------------|
| **Phase 0:** Suggestions | 0.5-2s (parallel) | DB query or Shopify API |
| **Phase 1:** VLM Analysis | 3-8s (parallel pair) | VLM inference time |
| **Phase 2:** Generation | 5-25s (sequential) | Image generation API + rate-limit delays |
| **Phase 3:** Verification | 3-15s (per result) | VLM inference time × number of results |
| **Phase 4:** Refinement | 8-15s (if needed) | Edit API + VLM verify |
| **Phase 5:** Watermark | 0.5-1s | Sharp image compositing |
| **Total (best case)** | ~12-18s | — |
| **Total (typical)** | ~25-40s | — |
| **Total (worst case)** | ~55-70s | — |

### 12.4 Bottlenecks and Optimization Opportunities

| Bottleneck | Current Impact | Optimization | Expected Improvement |
|-----------|:--------------:|-------------|:--------------------:|
| **Sequential generation** | 5-25s | Parallel strategies with `Promise.allSettled()` | 60-70% reduction in Phase 2 |
| **Rate-limit delays** | 1.2s per call × 7-10 calls | Increase delay but run in parallel; or get higher rate limit | Depends on API limits |
| **VLM verification of all results** | 3-15s | Early exit already implemented (line 676); could also sample | Minimal — early exit already helps |
| **Watermark buffer not cached** | 0.5-1s per request | Cache `watermarkBufferCache` (variable exists, line 6 of watermark.ts) | ~0.3-0.8s saved per request |
| **Product image resolution** | 0.5-3s | Client pre-fetches base64 (already implemented, line 479-486) | Already optimized |
| **Health check on every POST** | 0-5s | Cached for 30s (already implemented) | Already optimized |
| **Large base64 payloads** | Network transfer time | Compress product image client-side before sending; reduce selfie quality from 0.92 to 0.85 | ~30% payload reduction |
| **No persistent job storage** | Jobs lost on restart | Use Redis or SQLite for job storage | Reliability improvement, not performance |

---

## Appendix A: Image Size Reference

| Size | Aspect Ratio | Used For |
|------|:-----------:|----------|
| `768x1344` | 4:7 | Full-body: sarees, fashion, men's shirts |
| `864x1152` | 3:4 | Upper-body: jewelry, watches, leather, fragrances |
| `1344x768` | 7:4 | Landscape: home-living |
| `1024x1024` | 1:1 | Square (defined but not used by any category) |
| `1152x864` | 4:3 | Landscape portrait (defined but not used) |
| `1440x720` | 2:1 | Wide (defined but not used) |
| `720x1440` | 1:2 | Tall (defined but not used) |

## Appendix B: Job ID Format

```
job_{Unix timestamp in ms}_{6-char alphanumeric}
```

Example: `job_1709625600000_a3f2k1`

Generated at: route.ts line 458, ai-proxy line 521

## Appendix C: Strategy Name Glossary

| Strategy Name | Source | Meaning |
|--------------|--------|---------|
| `dual-image-edit` | pipeline.ts | Strategy A: Both selfie + product as input images |
| `edit-selfie` | pipeline.ts, ai-proxy | Strategy B: Selfie as input, product described in text |
| `edit-product` | pipeline.ts, ai-proxy | Strategy C: Product as input, person described in text |
| `create-text` | pipeline.ts | Strategy D: Text-to-image generation |
| `*-refined` | pipeline.ts | Any strategy that went through Phase 4 refinement |
| `edit-both` | ai-proxy | Same as `dual-image-edit` (proxy's naming) |
| `create-detailed` | ai-proxy | Same as `create-text` (proxy's naming) |
| `canvas-overlay` | product-detail.tsx | Client-side canvas composite (no AI) |
| `canvas-fallback` | pipeline.ts | All AI strategies failed, empty image returned |
| `ai-proxy` | product-detail.tsx | Result obtained via direct proxy call from client |

## Appendix D: Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `ZAI_BASE_URL` | zai.ts, ai-proxy | AI service endpoint URL |
| `ZAI_API_KEY` | zai.ts, ai-proxy | API authentication key |
| `ZAI_CHAT_ID` | zai.ts, ai-proxy | Optional chat session ID |
| `ZAI_TOKEN` | zai.ts, ai-proxy | Optional auth token |
| `ZAI_USER_ID` | zai.ts, ai-proxy | Optional user identifier |
| `ZAI_PROXY_URL` | route.ts, product-detail.tsx | Sandbox proxy URL for Vercel |
| `NEXT_PUBLIC_BASE_URL` | route.ts | Base URL for local HTTP image fetching |
| `NEXT_PUBLIC_AI_PROXY_URL` | product-detail.tsx | Client-side proxy URL fallback |
| `VERCEL` | zai.ts, route.ts | Detect Vercel deployment (skip file reads) |
| `VERCEL_URL` | route.ts | Vercel deployment URL for base URL construction |
