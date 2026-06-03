# 3 BOXES LUXURY — AI Virtual Try-On

## Functional Documentation & Training Guide

**Version:** 2.0  
**Last Updated:** March 2026  
**Authors:** 3 BOXES Engineering Team  
**Classification:** Internal — All Teams

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [User Journey (Step by Step)](#2-user-journey-step-by-step)
3. [Functional Specifications](#3-functional-specifications)
4. [AI Pipeline Architecture](#4-ai-pipeline-architecture)
5. [API Reference](#5-api-reference)
6. [Fallback Mechanisms](#6-fallback-mechanisms)
7. [AI Accuracy Metrics](#7-ai-accuracy-metrics)
8. [Training Guide — For Developers](#8-training-guide--for-developers)
9. [Training Guide — For Content Managers](#9-training-guide--for-content-managers)
10. [Training Guide — For QA/Testers](#10-training-guide--for-qatesters)
11. [Video Training Script Outlines](#11-video-training-script-outlines)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)
13. [Appendix A — Category Configuration Reference](#appendix-a--category-configuration-reference)
14. [Appendix B — Environment Variable Reference](#appendix-b--environment-variable-reference)
15. [Appendix C — VLM Prompt Reference](#appendix-c--vlm-prompt-reference)

---

# 1. Feature Overview

## 1.1 What Is AI Virtual Try-On?

The **AI Virtual Try-On** (also branded as **"Style Preview"** in the UI) is a feature that allows users to upload a selfie photograph and see luxury products — jewelry, sarees, watches, fashion outfits, men's shirts, leather goods, fragrances, and home & living items — virtually "worn" or "used" on them through AI-generated imagery.

### Key Value Propositions

| Value | Description |
|---|---|
| **Confidence in Purchase** | Users can visualize how a product looks on them before buying, reducing returns and increasing conversion. |
| **Luxury Experience** | High-quality, photorealistic AI output with 8K-quality studio lighting matches the luxury brand positioning. |
| **Multi-Category** | Works across 8+ product categories with category-specific optimizations for placement, framing, and color accuracy. |
| **Multi-Platform** | Works on web (Next.js), Android PWA, and Vercel serverless deployment. |
| **Graceful Degradation** | Multi-strategy AI pipeline with 4 generation strategies and a canvas overlay fallback ensures the feature always produces a result. |

## 1.2 How It Works — High Level

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────┐     ┌────────────────┐
│  User Upload │────▶│  Server API   │────▶│  AI Pipeline v2  │────▶│  VLM Verify    │
│  Selfie +    │     │  /api/try-on  │     │  (4 strategies)  │     │  + Watermark   │
│  Product     │     │               │     │                  │     │                │
└─────────────┘     └───────────────┘     └──────────────────┘     └────────────────┘
                                                  │
                           ┌──────────────────────┤
                           ▼                      ▼
                    ┌─────────────┐        ┌──────────────┐
                    │ AI Success  │        │ Canvas Fallback│
                    │ (base64 img)│        │ (overlay)     │
                    └─────────────┘        └──────────────┘
```

1. **User** uploads a selfie from the product detail page.
2. **Client** compresses the selfie (max 1536px, JPEG quality 0.92) and sends it to `/api/try-on`.
3. **Server** resolves the product image, creates a background job, and starts the AI pipeline.
4. **AI Pipeline** runs up to 4 generation strategies, verifies output quality with a Vision Language Model (VLM), and optionally refines.
5. **Result** is watermarked with the "3BOXES GIFTS · AI Style Preview" brand mark and delivered to the client.
6. **If AI fails**, the system falls back to a client-side canvas overlay composite.

## 1.3 Platform Compatibility

| Platform | AI Generation | Canvas Fallback | Proxy Support |
|---|---|---|---|
| **Local Dev (Next.js)** | ✅ Full — direct ZAI SDK | ✅ | ✅ Auto-detected Caddy gateway |
| **Sandbox Deployment** | ✅ Full — direct ZAI SDK | ✅ | ✅ Caddy gateway on port 81 |
| **Vercel Serverless** | ⚠️ Via proxy to sandbox | ✅ | ✅ `ZAI_PROXY_URL` env var |
| **Android PWA** | ✅ Same as web | ✅ | ✅ Same as web |
| **Static Export** | ❌ No server | ✅ Client-side only | ❌ No server for proxy |

---

# 2. User Journey (Step by Step)

## Step 1: User Browses Product Catalog

The user navigates to the homepage or a category page and sees the product grid. Each product card displays the product image, name, price, and category badge.

**Screenshot Description:**
> A grid of luxury product cards on a dark-themed page (stone-950 background). Each card has a product image (jewelry, sarees, watches, etc.), a product name in amber-100, price in amber-400, and a small category badge. The layout is responsive — 2 columns on mobile, 3-4 on tablet, 4-5 on desktop.

## Step 2: User Clicks "Style Preview" / "Virtual Try-On" Button

On the product detail page, the user sees a prominent **"✨ Style Preview"** button. This button is located:

- **Desktop:** Below the product image gallery, next to the "Add to Cart" button
- **Mobile:** As a fixed bottom action button when scrolling past the product image

The button uses the `Sparkles` icon from Lucide and has a gradient amber background.

```tsx
// Button appearance (from product-detail.tsx)
<Button
  onClick={() => setTryOnOpen(true)}
  className="bg-gradient-to-r from-amber-700 to-amber-600 text-white"
>
  <Sparkles className="mr-2 h-4 w-4" />
  Style Preview
</Button>
```

**Screenshot Description:**
> Product detail page showing a luxury necklace. Below the image is a row of action buttons: "Add to Cart" (outline style) and "✨ Style Preview" (amber gradient button with sparkle icon). The Style Preview button has a subtle shimmer animation on hover.

## Step 3: TryOnDialog Opens

The `TryOnDialog` opens as a modal overlay with a dark luxury theme:

- **Header:** Gradient amber/rose background with "✨ AI Virtual Try-On" title
- **Product Info:** Product thumbnail + name in a bordered card
- **Upload Area:** Large dashed-border drop zone with camera icon

```tsx
// Dialog header
<DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
  <Sparkles className="h-5 w-5 text-amber-400" />
  AI Virtual Try-On
</DialogTitle>
<DialogDescription className="text-amber-200/50">
  Upload your selfie and see how <span className="text-amber-300">{productName}</span> looks on you
</DialogDescription>
```

**Screenshot Description:**
> A modal dialog with a dark stone-950 background and amber/rose gradient header. The title "✨ AI Virtual Try-On" is in bold amber-100. Below is a product info card showing the jewelry thumbnail and name "Ruby Emerald Necklace Set". Below that is a large dashed-border area with a camera icon and text "Upload your selfie" / "Drag & drop or click to browse" / "JPG, PNG, or WebP · Max 10MB".

## Step 4: User Uploads Selfie

The user can either:
- **Click** the upload area to open a file picker
- **Drag & drop** an image file onto the upload area

**File Requirements:**
- **Formats:** JPG, PNG, WebP (checked via `file.type.startsWith('image/')`)
- **Max Size:** 10MB (checked via `file.size > 10 * 1024 * 1024`)
- **Validation:** If the file fails validation, a red error banner appears

```tsx
if (!file.type.startsWith('image/')) {
  setError('Please upload an image file (JPG, PNG, WebP)');
  return;
}
if (file.size > 10 * 1024 * 1024) {
  setError('Image must be less than 10MB');
  return;
}
```

## Step 5: Client-Side Compression

After the file is selected, it is immediately compressed client-side before being sent to the server:

```tsx
async function compressImage(file: File, maxSize = 1536, quality = 0.92): Promise<string> {
  // 1. Read file as Data URL
  // 2. Load into HTML Image element
  // 3. Scale down if width or height > maxSize (1536px)
  // 4. Draw onto canvas at new dimensions
  // 5. Export as JPEG with quality 0.92
  // 6. Return base64 data URL
}
```

**Compression Parameters:**
| Parameter | Value | Notes |
|---|---|---|
| `maxSize` | 1536px | Longest side is capped at 1536 pixels |
| `quality` | 0.92 | JPEG quality — balances file size and visual fidelity |
| Output format | JPEG | Smaller than PNG for photographic images |

**Why 1536px?** The ZAI AI image generation API works best with input images up to 1536px. Larger images don't improve AI output quality but significantly increase upload time and server memory usage.

## Step 6: Preview Step

After compression, the dialog transitions to the **Preview** step showing:

- **Left:** The compressed selfie preview in a 3:4 aspect ratio frame
- **Right:** A visual formula: Selfie + Product = Result
  - Sparkles icon
  - "+" label
  - Product thumbnail
  - "=" label
  - Placeholder result icon

**Actions Available:**
- **"Retake"** — Goes back to upload step, clears the selfie
- **"✨ Create Preview"** — Starts the AI generation process

**Screenshot Description:**
> The dialog now shows a split layout. On the left, the user's selfie fills a 3:4 portrait frame with a small X button to remove it. On the right, a vertical column shows: a sparkle icon, a "+" sign, the product thumbnail (the necklace), an "=" sign, and a generic image icon representing the expected result. Below are two buttons: "Retake" (outline) and "✨ Create Preview" (amber filled).

## Step 7: User Clicks "Create Preview"

When the user clicks "Create Preview", the following happens:

1. **Step transitions** to `'generating'`
2. **Client pre-fetches** the product image as base64 (to avoid server-side CORS issues on Vercel)
3. **POST request** is sent to `/api/try-on` with:
   ```json
   {
     "productId": "clx...",
     "selfieData": "data:image/jpeg;base64,/9j/4AAQ...",
     "productImageUrl": "/images/products/jewelry-1.jpg",
     "productImageBase64": "data:image/jpeg;base64,...",
     "productName": "Ruby Emerald Necklace Set",
     "categorySlug": "jewelry"
   }
   ```
4. **Server processes** the request (see [Section 4 — AI Pipeline Architecture](#4-ai-pipeline-architecture))

## Step 8: Generation Step

While the AI pipeline is running, the dialog shows an animated loading state:

- **Animated ping** circle effect
- **Pulsing sparkle** icon
- **Title:** "Creating Your Look"
- **Progress message:** Updates in real-time from the server:
  - "Preparing your style preview..."
  - "AI is analyzing the product..."
  - "Creating your virtual try-on..."
  - "Verifying product match..."
  - "Refining product colors..." (if needed)
  - "Adding finishing touches..."
- **Subtext:** "This may take 30–60 seconds..."

```tsx
// Progress display
<h3 className="mt-6 text-lg font-semibold text-amber-100">
  Creating Your Look
</h3>
<p className="mt-2 text-center text-sm text-amber-200/40">
  {progress || 'Our AI is analyzing your photo and generating a virtual try-on.'}
  <br />
  This may take 30–60 seconds...
</p>
```

The client polls the server every 2 seconds for job status updates:

```tsx
const pollJob = async (): Promise<void> => {
  const pollRes = await fetch(`/api/try-on?jobId=${jobId}`);
  const pollData = await pollRes.json();
  
  if (pollData.progress) setProgressMessage(pollData.progress);
  
  if (pollData.status === 'completed') { /* show result */ }
  if (pollData.status === 'failed') { /* handle error */ }
  
  await new Promise(r => setTimeout(r, 2000));
  return pollJob();
};
```

**Max poll duration:** 4 minutes (120 polls × 2 seconds)

**Screenshot Description:**
> A centered loading animation with a golden sparkles icon that pulses and pings. Below it, the text "Creating Your Look" in amber-100, and below that "AI is analyzing the product..." in amber-200/40. A small spinning loader icon with the progress message appears at the bottom.

## Step 9: Result Step

When generation completes, the dialog transitions to the **Result** step:

### 9.1 AI-Generated Result

- **Large image** display showing the AI-generated try-on in a 3:4 frame
- **"Style Preview"** badge in the top-left corner (emerald green)
- **Accuracy scores** (if available): Color, Face, and Overall accuracy displayed as scores out of 10
- **"3BOXES GIFTS — AI Style Preview"** info card with accuracy badges
- **AI Style Suggestions** — Up to 4 complementary product suggestions from paired categories
- **Disclaimer:** "This is an AI-generated visualization. Actual appearance may vary."

### 9.2 Canvas Fallback Result

If AI generation was unavailable, the result shows a canvas composite:
- User's selfie as the base image
- Product thumbnail overlaid in the bottom-right corner with a branded panel
- Vignette effect for a polished look
- "✨ STYLE PREVIEW" badge in the top-left corner

### 9.3 Actions Available

- **"Try Again"** — Resets to upload step for a new attempt
- **"Save Image"** — Downloads the result image as a PNG file
- **"Add to Cart"** (on suggestion items) — Adds suggested products to cart

**Screenshot Description:**
> The result view shows the AI-generated image of a person wearing the jewelry. In the top-left, a green "Style Preview" badge. Below the image, an info card reads "3 BOXES GIFTS — AI Style Preview" with accuracy badges: "Color 8/10" (green), "Face 9/10" (green). Below that, a "Complete Your Look" section shows 4 small product suggestion cards (matching earrings, bangles). At the bottom, "Try Again" (outline) and "Save Image" (amber filled) buttons. A small disclaimer reads "This is an AI-generated visualization. Actual appearance may vary."

## Step 10: User Can Download, Retry, or Close

- **Download:** Clicking "Save Image" triggers a browser download of the watermarked result as a PNG file
- **Retry:** Clicking "Try Again" resets the dialog to the upload step, clearing all state
- **Close:** Clicking the X button or clicking outside the dialog closes it. If a background job was running, a floating notification appears: "Style Preview Ready! Click to view"

---

# 3. Functional Specifications

## 3.1 Supported Product Categories

| Category | Slug | Output Size | Framing | Dual-Image Edit |
|---|---|---|---|---|
| Jewelry | `jewelry` | 864×1152 | Close-up beauty, chest-up | ✅ Yes |
| Sarees | `sarees` | 768×1344 | Full-body | ❌ No (too complex) |
| Watches | `watches` | 864×1152 | Close-up, waist-up | ✅ Yes |
| Fashion | `fashion` | 768×1344 | Full-body | ❌ No |
| Men's Shirts | `mens-shirts` | 768×1344 | Full-body | ❌ No |
| Men's Shirts/T-Shirts | `mens-shirts-t-shirts` | 768×1344 | Full-body | ❌ No |
| Leather Goods | `leather-goods` | 864×1152 | Product-in-use | ✅ Yes |
| Fragrances | `fragrances` | 864×1152 | Product-in-use | ✅ Yes |
| Home & Living | `home-living` | 1344×768 | Lifestyle (landscape) | ✅ Yes |

**Default fallback:** If a category is not recognized, the `jewelry` configuration is used.

### 3.1.1 Category-Specific Behavior Details

#### Jewelry

The jewelry category has the most sophisticated sub-type detection. The system analyzes the product **name** to determine the specific jewelry type and adjusts the placement prompt accordingly:

| Keyword in Product Name | Placement |
|---|---|
| `earring`, `jhumka`, `stud` | "wearing earrings on both earlobes" |
| `necklace`, `choker`, `pendant`, `temple`, `haar`, `mala` | "wearing a necklace around the neck" |
| `bracelet`, `cuff`, `bangle`, `kada` | "wearing a bracelet on the wrist" |
| `ring` | "wearing a ring on the finger" |
| `set`, `bridal` | "wearing a matching jewelry set — necklace around the neck and earrings on both earlobes" |
| (no keyword match) | "wearing the jewelry piece" (generic) |

**Color Focus:** "jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY"

**Example — Product naming impact:**

| Product Name | Detected Sub-Type | Placement Prompt |
|---|---|---|
| "Gold Temple Necklace" | Necklace | "wearing a necklace around the neck" |
| "Pearl Jhumka Earrings" | Earrings | "wearing earrings on both earlobes" |
| "Diamond Bridal Set" | Set | "wearing a matching jewelry set — necklace around the neck and earrings on both earlobes" |
| "Ruby Kada Bracelet" | Bracelet | "wearing a bracelet on the wrist" |
| "Emerald Ring" | Ring | "wearing a ring on the finger" |

#### Sarees

Sarees require special handling due to their complex draping:

- **Placement:** "draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist"
- **Framing:** Full-body professional fashion photograph
- **Color Focus:** "saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy"
- **Dual-Image Edit:** Disabled — the AI model struggles with the complexity of saree draping when given two input images. Single-image edit (selfie-only) produces better results.

**Example prompt fragment:**
> "saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy"

This specific color instruction prevents a common AI error where maroon sarees get rendered as red or burgundy.

#### Watches

- **Placement:** "wearing the watch on the left wrist"
- **Framing:** Close-up photograph from waist up
- **Color Focus:** "watch dial color, case metal color, and strap color must match EXACTLY"
- **Dual-Image Edit:** Enabled — the model can see both the person and the watch for accurate color matching

#### Fashion (Women's Outfits)

- **Placement:** "wearing the outfit"
- **Framing:** Full-body professional fashion photograph
- **Color Focus:** "outfit fabric color, print pattern, and accent colors must match EXACTLY"
- **Dual-Image Edit:** Disabled — complex outfits work better with selfie-only editing

#### Men's Shirts

- **Placement:** "wearing the shirt"
- **Framing:** Full-body professional fashion photograph
- **Color Focus:** "shirt fabric color, pattern, and collar/cuff details must match EXACTLY"
- **Dual-Image Edit:** Disabled

#### Leather Goods

- **Placement:** "holding the leather product"
- **Framing:** Professional product-in-use photograph
- **Color Focus:** "leather color, grain texture, and hardware metal color must match EXACTLY"
- **Dual-Image Edit:** Enabled

#### Fragrances

- **Placement:** "holding the fragrance bottle"
- **Framing:** Professional product-in-use photograph
- **Color Focus:** "bottle shape, cap color, and liquid color must match EXACTLY"
- **Dual-Image Edit:** Enabled

#### Home & Living

- **Placement:** "with the home decor product"
- **Framing:** Professional lifestyle photograph
- **Output Size:** 1344×768 (landscape — unique among categories)
- **Dual-Image Edit:** Enabled

## 3.2 Image Quality Requirements

### 3.2.1 Selfie Requirements

| Requirement | Specification | Why |
|---|---|---|
| **Lighting** | Good, even lighting on face/body | Poor lighting causes AI to hallucinate features |
| **Camera Angle** | Face the camera directly | Side angles produce distorted results |
| **Body Visibility** | Appropriate body part visible for the category | Jewelry needs chest-up; sarees need full-body |
| **Background** | Plain or uncluttered preferred | Busy backgrounds can confuse the AI |
| **Resolution** | At least 512px on the longest side | Below this, AI output quality degrades significantly |
| **Format** | JPG, PNG, or WebP | These are the only formats accepted |
| **File Size** | Max 10MB before compression | Larger files are rejected at upload |

### 3.2.2 Client-Side Compression

The compression function resizes and re-encodes the selfie before uploading:

```typescript
function compressImage(file: File, maxSize = 1536, quality = 0.92): Promise<string>
```

**Process:**
1. Read the file as a Data URL using `FileReader`
2. Create an `HTMLImageElement` and load the data URL
3. Calculate new dimensions maintaining aspect ratio:
   - If `width > maxSize`: scale down, `height = (height * maxSize) / width`
   - If `height > maxSize`: scale down, `width = (width * maxSize) / height`
4. Draw onto an HTML Canvas at the new dimensions
5. Export as JPEG using `canvas.toDataURL('image/jpeg', 0.92)`
6. Return the base64 data URL string

**Example — 4000×3000 selfie:**
- Longest side is 4000px, exceeds 1536px limit
- New dimensions: 1536×1152
- Output: ~200-400KB JPEG (down from ~5-10MB original)

### 3.2.3 Output Image Sizes

| Category | Size (W×H) | Aspect Ratio | Orientation |
|---|---|---|---|
| Jewelry | 864×1152 | 3:4 | Portrait |
| Sarees | 768×1344 | 4:7 | Tall Portrait |
| Watches | 864×1152 | 3:4 | Portrait |
| Fashion | 768×1344 | 4:7 | Tall Portrait |
| Men's Shirts | 768×1344 | 4:7 | Tall Portrait |
| Leather Goods | 864×1152 | 3:4 | Portrait |
| Fragrances | 864×1152 | 3:4 | Portrait |
| Home & Living | 1344×768 | 7:4 | Landscape |

These sizes are optimized for the ZAI image generation API and ensure the output matches the expected framing (e.g., full-body needs a taller image, close-up jewelry needs a squarer portrait).

## 3.3 Product Image Resolution

Product images are resolved server-side through a multi-strategy approach:

1. **Client-provided base64** (`productImageBase64`): If the client pre-fetches the product image, this is used directly (preferred on Vercel to avoid CORS issues)
2. **External URL** (`http://` or `https://`): Fetched directly with appropriate headers
3. **Protocol-relative URL** (`//`): Prefixed with `https:` and fetched
4. **Image proxy URL** (`/api/image-proxy?url=...`): Original URL extracted and fetched directly, or fetched through the proxy
5. **Local path** (`/images/products/...`): Fetched via HTTP from the app's own base URL (works on both local and Vercel)
6. **Filesystem read** (local dev only): Direct file read from `public/` directory as a last resort

---

# 4. AI Pipeline Architecture

## 4.1 Pipeline v2 Overview

The pipeline (`src/lib/try-on-pipeline.ts`) is an async, multi-phase, multi-strategy system:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AI Pipeline v2                                │
│                                                                      │
│  Phase 0: Fetch suggestions (background)                             │
│     │                                                                │
│  Phase 1: Product Analysis (VLM) + Person Description (VLM)          │
│     │                        [parallel]                               │
│     ▼                                                                │
│  Phase 2: Generate — Try multiple strategies                         │
│     │                                                                │
│     ├─ Strategy A: Dual-image edit (selfie + product) ─── PRIMARY   │
│     ├─ Strategy B: Selfie edit (text-described product)             │
│     ├─ Strategy C: Product edit (text-described person) ── optional │
│     └─ Strategy D: Text-to-image (fallback)                        │
│     │                                                                │
│  Phase 3: VLM Verification & Selection                              │
│     │  Compare each result against product image                     │
│     │  Score: Color, Shape, Face, Overall (0-10)                    │
│     │  Select best result; early-stop if color ≥ 8                  │
│     ▼                                                                │
│  Phase 4: Refinement (only if color accuracy < 7)                   │
│     │  Re-edit the best result with specific color correction        │
│     │  Re-verify the refined result                                  │
│     ▼                                                                │
│  Phase 5: Record final scores                                       │
│     │                                                                │
│  Phase 6: Watermark + Deliver                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 4.2 Phase Details

### Phase 0: Background Suggestions

While the AI pipeline runs, product suggestions are fetched in parallel from the database:

```typescript
const pairingCategories = getPairingCategory(product.category.slug)
// e.g., jewelry → ['sarees', 'fashion']
// e.g., watches → ['mens-shirts', 'leather-goods']

const suggestionsPromise = db.product.findMany({
  where: {
    category: { slug: { in: pairingCategories } },
    id: { not: productId },
    stock: { gt: 0 },
  },
  take: 4,
  orderBy: { rating: 'desc' },
})
```

**Pairing Map:**
| Category | Paired With |
|---|---|
| Sarees | Jewelry |
| Jewelry | Sarees, Fashion |
| Watches | Men's Shirts, Leather Goods |
| Men's Shirts | Watches, Leather Goods |
| Fashion | Jewelry, Watches |
| Fragrances | Jewelry, Fashion |
| Leather Goods | Watches, Fashion |

### Phase 1: Product Analysis (VLM)

Two VLM calls run **in parallel**:

1. **Product Analysis** — Extracts exact visual details from the product image
2. **Person Description** — Describes the user's appearance from the selfie

**Product Analysis Output Format:**
```
TYPE: diamond bib necklace
MAIN_COLOR: deep maroon red #8B1A1A
SECONDARY_COLOR: gold zari #CFB53B
METAL_COLOR: warm yellow gold #DAA520
MATERIALS: 18k white gold, round brilliant-cut diamonds
KEY_DETAILS: intricate floral motif, teardrop centerpiece, cascading drops
```

**Person Description Output (1-2 sentences):**
> "Oval face shape, medium brown skin tone, long black wavy hair, slim build."

These are parsed into structured objects for use in prompt construction:

```typescript
interface ProductInfo {
  type: string           // "diamond bib necklace"
  mainColor: string      // "deep maroon red #8B1A1A"
  secondaryColor: string // "gold zari #CFB53B"
  metalColor: string     // "warm yellow gold #DAA520"
  materials: string[]    // ["18k white gold", "round brilliant-cut diamonds"]
  keyDetails: string[]   // ["intricate floral motif", "teardrop centerpiece"]
  colorSummary: string   // "MAIN: deep maroon red #8B1A1A. ACCENT: gold zari #CFB53B. METAL: warm yellow gold #DAA520"
}
```

### Phase 2: Generation Strategies

#### Strategy A — Dual-Image Edit (PRIMARY)

**When:** Always attempted first  
**How:** Passes BOTH the selfie AND the product image to the ZAI image edit API  
**Why best:** The AI model can literally SEE the product's colors instead of guessing from text

```typescript
const response = await zai.images.generations.edit({
  prompt: dualPrompt,
  images: [
    { url: selfieUrl },    // First image: the person
    { url: productUrl },   // Second image: the product
  ],
  size: config.size,
})
```

**Prompt structure:**
```
Professional fashion photograph. [bodyType].

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "[productName]" ([productType]).

Show this EXACT person [placement]. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's [colorFocus] — refer to the SECOND image for exact colors
3. Match the MAIN color especially: [mainColor]
4. Match the METAL color: [metalColor] (if applicable)
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

**Example — Jewelry dual-image prompt:**
```
Professional fashion photograph. Close-up beauty photograph from chest up.

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "Ruby Emerald Necklace Set" (ruby emerald necklace).

Show this EXACT person wearing a necklace around the neck. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY — refer to the SECOND image for exact colors
3. Match the MAIN color especially: deep maroon red #8B1A1A
4. Match the METAL color: warm yellow gold #DAA520
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

#### Strategy B — Selfie Edit (Single Image)

**When:** Always attempted as backup  
**How:** Passes only the selfie to the edit API; product colors described in text  
**Why:** Preserves the person's face better (the model edits an image it can see), but color accuracy depends on text description quality

```typescript
const response = await zai.images.generations.edit({
  prompt: selfiePrompt,
  images: [{ url: selfieUrl }],  // Only selfie
  size: config.size,
})
```

#### Strategy C — Product Edit (Single Image)

**When:** Only for categories with `useProductEdit: true` (jewelry, watches, leather goods, fragrances, home & living)  
**How:** Passes only the product image to the edit API; person described in text  
**Why:** Preserves product colors perfectly (model can see the product), but face won't match the user

```typescript
const response = await zai.images.generations.edit({
  prompt: productPrompt,
  images: [{ url: productUrl }],  // Only product
  size: config.size,
})
```

#### Strategy D — Text-to-Image (Fallback)

**When:** Only if ALL image-edit strategies failed (A, B, and C)  
**How:** Generates an image entirely from text description — no input images  
**Why:** Last resort; produces the lowest quality (face won't match, colors approximate) but ensures SOME output

```typescript
const response = await zai.images.generations.create({
  prompt: createPrompt,
  size: config.size,
})
```

### Phase 3: VLM Verification & Selection

Each generated result is compared against the original product image using a VLM:

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
ISSUE: [if COLOR<7, describe the specific color mismatch]
VERDICT: PASS or FAIL
```

**Selection Logic:**
1. Verify each result against the product image
2. Track the result with the highest `overallScore`
3. **Early stop:** If any result has `colorScore >= 8` AND passes verification, stop checking remaining results
4. This optimization saves VLM API calls when a clearly good result is found

**Example verification output:**
```
COLOR: 9
SHAPE: 8
FACE: 7
OVERALL: 8
ISSUE: none
VERDICT: PASS
```

### Phase 4: Refinement (Conditional)

**Triggered only if:** The best result's `colorScore < 7`

**Process:**
1. Build a correction instruction from the verification `ISSUE` field
2. If no specific issue, use a generic correction based on `productInfo.colorSummary`
3. Re-edit the best result with the correction prompt
4. Re-verify the refined result
5. Use the refinement ONLY if it scores higher than the original

```typescript
// Example correction prompt
"Professional fashion photograph refinement. The necklace is silver but should be gold #DAA520. The jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY. Keep the person's face, body, and pose EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality."
```

**Maximum refinement passes:** 1 (the pipeline does at most one refinement to avoid infinite loops)

### Phase 5: Record Final Scores

The final scores are recorded on the job object:

```typescript
job.strategy = finalResult.strategy     // e.g., "dual-image-edit"
job.colorAccuracy = bestVerification.colorScore  // 0-10
job.faceAccuracy = bestVerification.faceScore    // 0-10
job.totalPasses = totalPasses            // 1 or 2 (if refined)
```

### Phase 6: Watermark + Deliver

The final image is watermarked using the `sharp` library (server-side):

**Watermark Design:**
- **Primary:** Logo image from `public/images/logo.png` (if available)
- **Fallback:** SVG text "3BOXES GIFTS" with "AI Style Preview" subtitle
- **Position:** Bottom-right corner with padding
- **Opacity:** Logo at 60%, text at 85%
- **Colors:** Golden amber gradient (#B8860B → #DAA520 → #B8860B)

**Sharp processing:**
1. Decode the base64 result image
2. Get image dimensions
3. Create watermark buffer (logo + text composite, or text-only fallback)
4. Composite watermark at bottom-right with padding
5. Re-encode as PNG base64

## 4.3 API Call Rate Limiting

The pipeline enforces a **1.2-second delay** between consecutive AI API calls:

```typescript
const API_CALL_DELAY = 1200
```

This prevents rate-limiting from the ZAI API and ensures stable operation.

## 4.4 Job Lifecycle

Jobs are stored in an in-memory `Map<string, TryOnJob>`:

```typescript
interface TryOnJob {
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

**Job cleanup:** A `setInterval` runs every 5 minutes and deletes jobs older than 15 minutes:

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

**Important:** Since jobs are in-memory, they are lost when the server restarts. This is by design — the virtual try-on is an ephemeral feature and results don't need to persist.

---

# 5. API Reference

## 5.1 POST /api/try-on

Creates a new virtual try-on job.

**Request:**
```json
{
  "productId": "clx123abc",
  "selfieData": "data:image/jpeg;base64,/9j/4AAQ...",
  "productImageUrl": "/images/products/jewelry-1.jpg",
  "productImageBase64": "data:image/jpeg;base64,...",  // Optional, preferred on Vercel
  "productName": "Ruby Emerald Necklace Set",
  "categorySlug": "jewelry"
}
```

**Response (job created):**
```json
{
  "jobId": "job_1710000000000_abc123",
  "status": "processing",
  "productName": "Ruby Emerald Necklace Set",
  "categorySlug": "jewelry"
}
```

**Response (AI unavailable — canvas mode):**
```json
{
  "mode": "canvas",
  "message": "AI style preview is temporarily unavailable. Showing style overlay with product image instead.",
  "code": "AI_CANVAS_MODE",
  "productName": "Ruby Emerald Necklace Set",
  "categorySlug": "jewelry",
  "productImageBase64": "data:image/jpeg;base64,...",
  "productImageUrl": "/images/products/jewelry-1.jpg"
}
```

**Error Responses:**
| Status | Code | Meaning |
|---|---|---|
| 400 | — | Missing `productId` or `selfieData`, or invalid image format |
| 404 | — | Product not found in database, Shopify, or client-provided details |
| 500 | — | Unexpected server error |

## 5.2 GET /api/try-on?jobId=xxx

Polls the status of a try-on job.

**Response (processing):**
```json
{
  "jobId": "job_1710000000000_abc123",
  "status": "processing",
  "progress": "Creating your virtual try-on...",
  "pipelinePhase": "generation",
  "productName": "Ruby Emerald Necklace Set",
  "categorySlug": "jewelry"
}
```

**Response (completed):**
```json
{
  "jobId": "job_1710000000000_abc123",
  "status": "completed",
  "imageUrl": "data:image/png;base64,iVBOR...",
  "productName": "Ruby Emerald Necklace Set",
  "categorySlug": "jewelry",
  "strategy": "dual-image-edit",
  "colorAccuracy": 8,
  "faceAccuracy": 9,
  "totalPasses": 1,
  "suggestions": [
    {
      "id": "clx456",
      "name": "Pearl Drop Earrings",
      "price": 2499,
      "image": "/images/products/jewelry-5.jpg",
      "category": "Jewelry",
      "categorySlug": "jewelry"
    }
  ],
  "progress": "Complete!"
}
```

**Response (failed):**
```json
{
  "jobId": "job_1710000000000_abc123",
  "status": "failed",
  "error": "Virtual try-on is temporarily unavailable. Our AI style service could not be reached."
}
```

## 5.3 GET /api/try-on/status

Health check endpoint for the AI service.

**Response:**
```json
{
  "available": true,
  "mode": "ai",
  "reason": null
}
```

| `mode` | Meaning |
|---|---|
| `ai` | ZAI SDK is configured and reachable |
| `proxy` | Using proxy to sandbox AI service |
| `unavailable` | AI service is not available |

## 5.4 POST /api/try-on/remote

Forwards a try-on request to the sandbox proxy. Used on Vercel when the server cannot reach the AI service directly.

**Request/Response:** Same as `POST /api/try-on`

## 5.5 GET /api/config

Returns runtime configuration including the AI proxy URL.

**Response:**
```json
{
  "aiProxyUrl": "http://c-abc123-def456-ghi789:81",
  "isVercel": false
}
```

---

# 6. Fallback Mechanisms

The system implements a **5-tier fallback chain** to ensure the user always gets a result:

```
Tier 1: AI Generation (Primary) — Dual-image edit
   │ (fails)
   ▼
Tier 2: AI Generation (Secondary) — Selfie edit with text description
   │ (fails)
   ▼
Tier 3: AI Generation (Tertiary) — Product edit or text-to-image
   │ (all AI strategies fail)
   ▼
Tier 4: Canvas Overlay — Client-side composite
   │ (canvas fails)
   ▼
Tier 5: Error Message with Retry Option
```

## Tier 1: Dual-Image Edit (Primary)

- **Method:** `safeImageEditDual(prompt, selfieUrl, productUrl, size)`
- **API Call:** `zai.images.generations.edit({ images: [selfie, product] })`
- **Quality:** Best — model sees both person and product
- **Typical color accuracy:** 7-9/10

## Tier 2: Selfie Edit (Secondary)

- **Method:** `safeImageEdit(prompt, selfieUrl, size)`
- **API Call:** `zai.images.generations.edit({ images: [selfie] })`
- **Quality:** Good — preserves face, text-described colors
- **Typical color accuracy:** 5-8/10

## Tier 3: Product Edit / Text-to-Image

- **Product Edit:** `safeImageEdit(prompt, productUrl, size)` — only for `useProductEdit: true` categories
- **Text-to-Image:** `safeImageCreate(prompt, size)` — only if all image-edit strategies failed
- **Quality:** Variable — product edit preserves colors but not face; text-to-image preserves neither

## Tier 4: Canvas Overlay (Client-Side)

When all AI strategies are unavailable, the system falls back to a client-side canvas composite:

**Process:**
1. Draw the user's selfie as the base image
2. Apply a vignette overlay (radial gradient, 0→30% black)
3. Draw a "✨ STYLE PREVIEW" badge in the top-left corner
4. Load the product image (with 5-second timeout)
5. Draw a branded product panel in the bottom-right corner:
   - Dark stone background (#1c1917) with golden border (#DAA520)
   - Product image thumbnail
   - Product name in golden text
6. Add "3BOXES GIFTS · AI Style Preview" footer text

**Canvas fallback handles image loading issues:**
- External URLs are routed through `/api/image-proxy`
- Protocol-relative URLs are prefixed with `https:`
- Local paths use `window.location.origin`
- If the product image fails to load within 5 seconds, the panel is drawn without it

## Tier 5: Error Message

If even the canvas overlay fails (e.g., canvas context unavailable), the user sees:

> "Could not generate style preview. Please try again later."

With a "Try Again" button to restart the process.

## 6.1 Vercel-Specific Fallback Chain

On Vercel, the AI service (172.25.136.193:8080) is not directly accessible. The server-side fallback chain is:

```
1. Try proxy (ZAI_PROXY_URL env var) → forward to sandbox
   │ (proxy unavailable)
   ▼
2. Try direct ZAI SDK (ZAI_BASE_URL + ZAI_API_KEY env vars)
   │ (SDK not configured or unreachable)
   ▼
3. Return canvas mode (AI_CANVAS_MODE) → client tries direct proxy
   │ (client proxy also fails)
   ▼
4. Client-side canvas overlay composite
   │ (canvas fails)
   ▼
5. Error message
```

---

# 7. AI Accuracy Metrics

## 7.1 Scoring System

The VLM verification phase produces four scores on a **0-10 scale**:

| Metric | What It Measures | 0 (Worst) | 10 (Best) |
|---|---|---|---|
| **Color Accuracy** | How well product colors match the original | Completely wrong colors | Perfect color match |
| **Shape Accuracy** | How well product shape/design matches | Different product entirely | Exact same design |
| **Face Accuracy** | How well the person's face is preserved | Unrecognizable | Perfect face match |
| **Overall Score** | Combined product accuracy | Total mismatch | Perfect match |

## 7.2 Pass/Fail Criteria

```
PASS: colorScore >= 7 AND overallScore >= 6
     OR verdict from VLM is "PASS"
```

```
FAIL: colorScore < 7
     OR overallScore < 6
```

**The most critical metric is Color Accuracy.** A try-on where the product shape is slightly off but colors are correct is much more useful than one where the shape is perfect but colors are wrong. Users will notice a gold necklace rendered as silver far more than a slightly different pendant shape.

## 7.3 Refinement Trigger

If the best result has `colorScore < 7`, the pipeline enters Phase 4 (Refinement). This is a single additional pass that attempts to correct color inaccuracies.

**Refinement success rate:** Typically improves color accuracy by 1-2 points.

## 7.4 Typical Accuracy by Strategy

| Strategy | Color Accuracy | Face Accuracy | Overall |
|---|---|---|---|
| A: Dual-image edit | 7-9 | 6-8 | 7-9 |
| B: Selfie edit | 5-8 | 7-9 | 5-8 |
| C: Product edit | 8-10 | 3-6 | 5-7 |
| D: Text-to-image | 4-7 | 2-5 | 3-6 |
| Canvas overlay | N/A | 10 (untouched) | N/A |

## 7.5 Accuracy by Category

| Category | Typical Color Score | Notes |
|---|---|---|
| Jewelry | 7-9 | Strong — distinct metal tones and stone colors |
| Watches | 7-9 | Strong — clear dial/strap colors |
| Sarees | 5-8 | Moderate — complex draping can confuse AI |
| Fashion | 5-7 | Moderate — pattern accuracy varies |
| Men's Shirts | 6-8 | Good — simpler garment structure |
| Leather Goods | 6-8 | Good — leather texture is distinctive |
| Fragrances | 7-9 | Good — bottle is a clear, simple object |
| Home & Living | 6-8 | Good — product is shown alongside person |

---

# 8. Training Guide — For Developers

## 8.1 Setting Up the Development Environment

### Prerequisites

- **Node.js** 20+ (or Bun 1.0+)
- **Git** for version control
- **ZAI SDK** access (see Section 8.2)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <repo-url> my-project
cd my-project

# 2. Install dependencies
bun install
# OR
npm install

# 3. Set up the database
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. Create environment file
cp .env.example .env
# Edit .env with your configuration

# 5. Start the development server
bun run dev
# OR
npm run dev

# 6. Verify the app is running
# Open http://localhost:3000 in your browser
```

### Verifying Try-On Feature

1. Navigate to any product detail page
2. Click the "✨ Style Preview" button
3. Upload a selfie
4. Click "Create Preview"
5. Verify that:
   - The loading animation appears with progress messages
   - The result image appears within 60 seconds
   - Accuracy scores are displayed
   - The "Save Image" button downloads the result

## 8.2 Configuring ZAI SDK

The ZAI SDK connects to an AI service for image generation and VLM analysis. There are three configuration methods:

### Method 1: Environment Variables (Recommended for Production)

Add to `.env`:
```env
ZAI_BASE_URL=http://172.25.136.193:8080/v1
ZAI_API_KEY=your-api-key-here
ZAI_CHAT_ID=optional-chat-id
ZAI_TOKEN=optional-token
ZAI_USER_ID=optional-user-id
```

### Method 2: Configuration File (Recommended for Local Dev)

Create `.z-ai-config` in the project root:
```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "your-api-key-here",
  "chatId": "optional-chat-id",
  "token": "optional-token",
  "userId": "optional-user-id"
}
```

**Config file search order:**
1. `<project-root>/.z-ai-config`
2. `~/.z-ai-config` (home directory)
3. `/etc/.z-ai-config` (system-wide)

### Method 3: Proxy URL (For Vercel / Remote Access)

If the AI service is not directly reachable (e.g., on Vercel), configure a proxy:
```env
ZAI_PROXY_URL=https://your-sandbox.space-z.ai
```

### Verifying ZAI Configuration

```bash
# Check if the AI service is reachable
curl http://localhost:3000/api/try-on/status
# Expected: {"available":true,"mode":"ai"}

# Check the config endpoint
curl http://localhost:3000/api/config
# Expected: {"aiProxyUrl":"http://localhost:81","isVercel":false}
```

### ZAI SDK Initialization Flow

```typescript
// src/lib/zai.ts

// 1. Check environment variables first
if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
  return new ZAI({ baseUrl, apiKey, chatId, token, userId })
}

// 2. Check config files (local dev only)
// Search: .z-ai-config → ~/.z-ai-config → /etc/.z-ai-config

// 3. Try ZAI.create() auto-detection (local dev only)
return await ZAI.create()

// 4. On Vercel without config → throw error
throw new Error('AI_STYLE_SERVICE_UNAVAILABLE')
```

## 8.3 Adding a New Product Category

To add support for a new product category (e.g., "Sunglasses"):

### Step 1: Add Category Configuration

Edit `src/lib/try-on-pipeline.ts`:

```typescript
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // ... existing categories ...
  
  'sunglasses': {
    placement: 'wearing the sunglasses on their face',
    size: '864x1152',           // Portrait close-up
    colorFocus: 'frame color, lens tint, and temple color must match EXACTLY',
    bodyType: 'Close-up beauty photograph from chest up',
    useProductEdit: true,        // Sunglasses are simple enough for dual-image
  },
}
```

### Step 2: Add Pairing Category (for Suggestions)

Edit `src/app/api/try-on/route.ts`:

```typescript
function getPairingCategory(categorySlug: string): string[] {
  const pairs: Record<string, string[]> = {
    // ... existing pairs ...
    'sunglasses': ['watches', 'leather-goods', 'fashion'],
  }
  return pairs[categorySlug] || ['jewelry']
}
```

### Step 3: Add Category to Database

If the category doesn't exist in the database:

```sql
INSERT INTO Category (id, name, slug, description, image)
VALUES (
  'clx_sunglasses_cat',
  'Sunglasses',
  'sunglasses',
  'Designer sunglasses and eyewear',
  '/images/categories/sunglasses.jpg'
);
```

### Step 4: Test the New Category

1. Create a test product in the sunglasses category
2. Open the product detail page
3. Click "Style Preview"
4. Verify that:
   - The category is detected correctly (check server logs for `[pipeline] Product: sunglasses item, Colors: ...`)
   - The placement prompt mentions "wearing the sunglasses on their face"
   - The output image size is 864×1152
   - Suggestion products come from watches, leather-goods, and fashion categories

## 8.4 Customizing Prompts for Better Results

The pipeline uses several prompt templates that can be customized:

### Product Analysis Prompt

Located in `src/lib/try-on-pipeline.ts`:

```typescript
const PRODUCT_ANALYSIS_PROMPT = `Analyze this luxury product for a virtual try-on system...`
```

**Tips for improvement:**
- Add category-specific instructions (e.g., "For jewelry, note the clasp type")
- Request additional color codes (e.g., tertiary color)
- Request specific dimensions or scale information

### Verification Prompt

```typescript
const VERIFICATION_PROMPT = `Compare these two images for a virtual try-on...`
```

**Tips for improvement:**
- Add category-specific verification criteria
- Adjust the pass threshold (currently color ≥ 7)
- Add specific instructions for common failure modes

### Generation Prompts

Four prompt builders that you can customize:

| Function | When Used | Customization Tips |
|---|---|---|
| `buildDualImagePrompt()` | Strategy A | Focus on placement; let the images speak for colors |
| `buildSelfieEditPrompt()` | Strategy B | Be very specific about colors in text; include hex codes |
| `buildProductEditPrompt()` | Strategy C | Describe person clearly; focus on product placement |
| `buildTextToImagePrompt()` | Strategy D | Be as detailed as possible about everything |

**Example — Improving saree prompts:**

```typescript
// Before (generic)
placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder'

// After (more specific)
placement: 'draped in the saree in traditional Indian style with pallu elegantly draped over the left shoulder, matching blouse with proper neckline, properly pleated at the waist with the pleats tucked into the petticoat'
```

## 8.5 Deploying to Vercel with Proxy

### Architecture

```
┌────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   Vercel CDN   │────▶│  Vercel Serverless   │────▶│  Sandbox AI Service  │
│   (Static)     │     │  /api/try-on         │     │  (ZAI SDK + Pipeline)│
│                │     │  (proxy forward)     │     │                      │
└────────────────┘     └──────────────────────┘     └──────────────────────┘
                                │
                                │ (proxy fails)
                                ▼
                       ┌────────────────┐
                       │ Canvas Fallback│
                       │ (client-side)  │
                       └────────────────┘
```

### Step-by-Step Deployment

```bash
# 1. Set up Vercel project
vercel init

# 2. Configure environment variables in Vercel dashboard:
# ZAI_PROXY_URL=https://your-sandbox.space-z.ai
# NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
# DATABASE_URL=file:./dev.db  (or use a managed SQLite provider)
# VERCEL=1  (automatically set by Vercel)

# 3. Deploy
vercel --prod

# 4. Verify
# Visit https://your-app.vercel.app/api/try-on/status
# Should return: {"available":true,"mode":"proxy"}
```

### Proxy Configuration

The proxy URL must point to a running sandbox instance that has direct ZAI SDK access. On the sandbox, a Caddy reverse proxy routes `/api/try-on` requests to the Next.js server.

**Sandbox Caddy configuration (port 81):**
```
:81 {
  reverse_proxy /api/try-on* localhost:3000
  reverse_proxy /api/try-on/* localhost:3000
}
```

**Auto-detection:** The `/api/config` endpoint automatically detects the Caddy gateway on port 81 by checking the sandbox hostname (format: `c-xxxxx-xxxxx-xxxxx`).

## 8.6 Debugging AI Generation Issues

### Enable Verbose Logging

The pipeline logs detailed information to the server console:

```
[pipeline:job_123] Phase 1: Analyzing product "Ruby Emerald Necklace Set"
[pipeline:job_123] Product: ruby emerald necklace, Colors: MAIN: deep maroon red #8B1A1A. ACCENT: gold zari #CFB53B
[pipeline:job_123] Person: Oval face, medium brown skin, long black wavy hair
[pipeline:job_123] Phase 2: Generating try-on images
[pipeline:job_123] Strategy A: Dual-image edit (selfie + product)
[pipeline:job_123] Strategy A succeeded
[pipeline:job_123] Strategy B: Selfie-edit with text description
[pipeline:job_123] Strategy B succeeded
[pipeline:job_123] Phase 3: Verifying 2 results
[pipeline:job_123] dual-image-edit: color=9 shape=8 face=7 overall=8 PASS
[pipeline:job_123] Phase 4: Refinement needed (colorScore=9) → SKIPPED
[pipeline:job_123] Final: dual-image-edit, color=9/10, face=7/10, overall=8/10
[pipeline:job_123] Watermark applied
```

### Common Issues and Fixes

| Issue | Log Pattern | Fix |
|---|---|---|
| ZAI SDK not configured | `AI_STYLE_SERVICE_UNAVAILABLE` | Create `.z-ai-config` or set `ZAI_BASE_URL`/`ZAI_API_KEY` env vars |
| AI service unreachable | `AI service unreachable` | Check that the ZAI service is running; verify `ZAI_BASE_URL` |
| Product image not found | `Product image not available` | Verify the product's image path; check external URL accessibility |
| VLM analysis failed | `VLM analysis failed:` | Check ZAI API key and model availability |
| Image edit failed | `Image edit (dual) failed:` | API might be rate-limited; check logs for 429 errors |
| All strategies failed | `Strategy D: Text-to-image fallback` then `Strategy D failed` | AI service is completely unavailable; canvas fallback will be used |
| Timeout | `Generation timed out` | Pipeline took more than 4 minutes; retry |

### Testing the Pipeline Locally

```bash
# 1. Start the dev server
bun run dev

# 2. Test the health endpoint
curl http://localhost:3000/api/try-on/status

# 3. Test a try-on generation (replace values)
curl -X POST http://localhost:3000/api/try-on \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-product-1",
    "selfieData": "data:image/jpeg;base64,/9j/4AAQ...",
    "productImageUrl": "/images/products/jewelry-1.jpg",
    "productName": "Test Necklace",
    "categorySlug": "jewelry"
  }'

# 4. Poll for result (use jobId from step 3 response)
curl "http://localhost:3000/api/try-on?jobId=job_123_abc"
```

### Simulating AI Unavailability

To test the canvas fallback:

```bash
# Temporarily rename the ZAI config
mv .z-ai-config .z-ai-config.bak

# Restart the server
bun run dev

# Try a virtual try-on — should fall back to canvas mode
# Check logs for: "AI unavailable" or "AI_STYLE_SERVICE_UNAVAILABLE"

# Restore config
mv .z-ai-config.bak .z-ai-config
```

---

# 9. Training Guide — For Content Managers

## 9.1 How Product Names Affect AI Output

The virtual try-on system analyzes the **product name** to determine how to place the product on the user. This is especially critical for the **Jewelry** category.

### Jewelry Sub-Type Detection Rules

The system scans the product name (case-insensitive) for specific keywords:

| Keyword(s) | Detected As | Placement |
|---|---|---|
| earring, jhumka, stud | Earrings | "wearing earrings on both earlobes" |
| necklace, choker, pendant, temple, haar, mala | Necklace | "wearing a necklace around the neck" |
| bracelet, cuff, bangle, kada | Bracelet | "wearing a bracelet on the wrist" |
| ring | Ring | "wearing a ring on the finger" |
| set, bridal | Set | "wearing a matching jewelry set — necklace and earrings" |

### Best Practices for Product Naming

**DO:**
- ✅ Include the jewelry type in the name: "Gold Temple **Necklace**"
- ✅ Use specific terms: "**Jhumka** Earrings" (not just "Traditional Earrings")
- ✅ For sets, include the word "**Set**": "Ruby Bridal **Set**"
- ✅ Include color words: "**Gold** Temple Necklace", "**Silver** Pearl **Choker**"
- ✅ Include material words: "**Diamond** Stud Earrings", "**Kundan** Bridal Set"

**DON'T:**
- ❌ Use vague names: "Beautiful Jewelry" (no sub-type detected)
- ❌ Omit the type: "Ruby Elegance" (is it a necklace? earrings?)
- ❌ Use only English if the product is known by Hindi names: use "**Kada**" not just "Bracelet"
- ❌ Put the type at the very end after many adjectives: "Elegant Sparkling Traditional Gold Plated Temple Design Necklace" — the word "necklace" is there but the AI might miss it in context

### Examples of Good vs. Bad Product Names

| ❌ Bad Name | ✅ Good Name | Why |
|---|---|---|
| "Ruby Elegance" | "Ruby Emerald Necklace Set" | Type is detected, placement is correct |
| "Traditional Gold" | "Gold Jhumka Earrings" | Specific sub-type, correct earlobe placement |
| "Designer Piece" | "Diamond Cuff Bracelet" | Clear type, correct wrist placement |
| "Wedding Special" | "Kundan Bridal Set" | "Set" keyword triggers necklace+earrings placement |
| "Stunning Accessory" | "Pearl Choker Necklace" | Type detected, choker goes around neck |

## 9.2 How Product Images Affect AI Accuracy

The AI pipeline uses the **product image** as a reference for color matching. The quality of this image directly impacts the accuracy of the virtual try-on result.

### Image Requirements for Best Results

| Requirement | Specification | Impact |
|---|---|---|
| **White/Clean background** | Product on a plain white or light background | AI can extract colors without background interference |
| **Single product** | Only the product in the frame | AI analyzes the correct product, not surrounding items |
| **Good lighting** | Even, well-lit product photo | True colors are captured for matching |
| **High resolution** | At least 500×500px | AI can see fine details like stone settings, fabric weave |
| **Accurate colors** | No heavy filters or color correction | AI matches the actual product color, not a filtered version |
| **Front-facing** | Product shown from the front | AI generates the correct orientation on the person |

### Common Image Issues and Their Impact

| Image Issue | Impact on AI | Example |
|---|---|---|
| Dark/moody lighting | Colors appear darker in the try-on | Maroon saree looks black |
| Color cast (blue/warm) | Colors shift in the try-on | Silver jewelry looks blue-tinted |
| Multiple products | AI may render the wrong item | Necklace set image but AI renders only earrings |
| Model wearing product | AI may copy the model's appearance | Try-on looks like the product photo's model |
| Low resolution | Fine details lost | Kundan work appears as plain gold |

### Image Resolution Chain

The product image goes through this chain before reaching the AI:

1. **Original image** on the product page (may be high-res, 2000×2000+)
2. **Server-side fetch** — downloaded and converted to base64
3. **VLM analysis** — analyzed at original resolution for color extraction
4. **AI generation** — passed as input to the image edit API

The product image is **NOT** compressed or resized before being sent to the AI. This is intentional — the AI needs the full resolution to extract accurate colors.

## 9.3 Setting Up Product Categories Correctly

### Category Slug Convention

Categories use kebab-case slugs:

| Category Name | Slug | 
|---|---|
| Jewelry | `jewelry` |
| Sarees | `sarees` |
| Watches | `watches` |
| Fashion | `fashion` |
| Men's Shirts | `mens-shirts` |
| Leather Goods | `leather-goods` |
| Fragrances | `fragrances` |
| Home & Living | `home-living` |

### Adding a New Category

1. **Database:** Create a new `Category` record with the correct slug
2. **Pipeline config:** Add an entry to `CATEGORY_CONFIG` in `try-on-pipeline.ts`
3. **Pairing map:** Add an entry to `getPairingCategory()` in `try-on/route.ts`
4. **Category image:** Add a thumbnail to `/public/images/categories/<slug>.jpg`

### Category Image Best Practices

- **Size:** 400×400px or larger
- **Content:** Representative product from the category
- **Background:** Clean, consistent with other category images
- **Format:** JPG, optimized for web

---

# 10. Training Guide — For QA/Testers

## 10.1 Test Cases for Each Product Category

### Jewelry Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| J-001 | Earrings try-on | Upload selfie + "Gold Jhumka Earrings" | Image shows earrings on both earlobes |
| J-002 | Necklace try-on | Upload selfie + "Temple Necklace" | Image shows necklace around neck |
| J-003 | Bracelet try-on | Upload selfie + "Diamond Cuff Bracelet" | Image shows bracelet on wrist |
| J-004 | Ring try-on | Upload selfie + "Emerald Ring" | Image shows ring on finger |
| J-005 | Set try-on | Upload selfie + "Bridal Set" | Image shows necklace + earrings |
| J-006 | Generic jewelry | Upload selfie + "Ornate Adornment" (no type keyword) | Image shows jewelry piece (generic placement) |
| J-007 | Color accuracy — gold | Gold jewelry product | Gold metal tone in result matches product |
| J-008 | Color accuracy — silver | Silver jewelry product | Silver metal tone in result matches product |
| J-009 | Color accuracy — rose gold | Rose gold jewelry product | Rose gold tone in result matches product |

### Saree Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| S-001 | Basic saree | Upload full-body selfie + saree product | Full-body image with saree draped |
| S-002 | Pallu placement | Upload selfie + saree product | Pallu visible over left shoulder |
| S-003 | Maroon color | Maroon saree product | Result shows maroon, not red or burgundy |
| S-004 | Gold border | Saree with gold zari border | Gold border visible and accurate |
| S-005 | Blouse matching | Saree with matching blouse | Blouse color matches saree |

### Watch Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| W-001 | Watch on wrist | Upload selfie + watch product | Watch visible on left wrist |
| W-002 | Dial color | Blue dial watch | Blue dial in result |
| W-003 | Strap color | Brown leather strap | Brown strap in result |
| W-004 | Metal case | Gold case watch | Gold case color preserved |

### Fashion Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| F-001 | Full-body outfit | Upload full-body selfie + dress | Full-body try-on with outfit |
| F-002 | Print pattern | Floral print dress | Pattern visible and matches product |
| F-003 | Color accuracy | Red dress | Red color, not pink or orange |

### Men's Shirts Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| M-001 | Shirt try-on | Upload selfie + shirt product | Full-body with shirt worn |
| M-002 | Collar style | Button-down collar shirt | Collar style preserved |
| M-003 | Pattern | Striped shirt | Stripes visible and match direction |

### Cross-Category Test Cases

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| X-001 | Unknown category | Product with uncategorized slug | Falls back to jewelry config |
| X-002 | Large selfie | Upload 8000×6000 selfie | Compressed to 1536px max |
| X-003 | PNG selfie | Upload PNG format selfie | Accepted and processed |
| X-004 | WebP selfie | Upload WebP format selfie | Accepted and processed |
| X-005 | Oversized file | Upload 15MB image | Error: "Image must be less than 10MB" |
| X-006 | Non-image file | Upload PDF file | Error: "Please upload an image file" |

## 10.2 How to Verify Color Accuracy

### Visual Inspection Method

1. Open the product image and the try-on result side by side
2. Compare the main product color — it should be indistinguishable
3. Compare secondary colors — borders, accents, hardware
4. For jewelry: compare metal tone (gold/silver/rose-gold) and stone colors
5. For sarees: compare fabric color, border color, and zari color

### Using the Accuracy Scores

The system provides quantitative accuracy scores:

- **Color ≥ 8:** Excellent — colors are very accurate
- **Color 7:** Good — colors are close but may have slight shifts
- **Color 5-6:** Fair — noticeable color difference
- **Color < 5:** Poor — colors are wrong

### Common Color Issues to Look For

| Product | Common AI Error | What to Check |
|---|---|---|
| Gold jewelry | Rendered as silver | Gold vs. silver metal tone |
| Maroon saree | Rendered as red | Maroon vs. red fabric color |
| Rose gold | Rendered as yellow gold | Rose gold vs. yellow gold |
| Navy blue | Rendered as black | Navy vs. black |
| Champagne | Rendered as white | Champagne vs. white |
| Emerald green | Rendered as teal | Green vs. blue-green |

## 10.3 How to Test Fallback Mechanisms

### Testing Canvas Fallback

1. Temporarily disable the AI service (rename `.z-ai-config`)
2. Restart the server
3. Try a virtual try-on
4. Verify:
   - Loading animation appears
   - Progress shows "Creating style preview overlay..."
   - Result shows selfie with product overlay panel
   - "✨ STYLE PREVIEW" badge visible
   - Product thumbnail in bottom-right panel
   - Product name displayed in golden text

### Testing Vercel Canvas Mode

1. Deploy to Vercel without `ZAI_PROXY_URL`
2. Try a virtual try-on
3. Verify the server returns `AI_CANVAS_MODE`
4. Verify the client shows the canvas overlay

### Testing Proxy Fallback (Vercel)

1. Deploy to Vercel with `ZAI_PROXY_URL` pointing to sandbox
2. Ensure sandbox is running
3. Try a virtual try-on
4. Verify the request is proxied and AI generation succeeds
5. Stop the sandbox
6. Try another try-on
7. Verify it falls back to canvas mode

### Testing All-Strategies-Fail Scenario

1. Block all AI API endpoints (firewall or hosts file)
2. Try a virtual try-on
3. Verify:
   - Strategy A fails
   - Strategy B fails
   - Strategy C fails (if applicable)
   - Strategy D fails
   - Canvas fallback activates
   - If canvas also fails, error message appears with "Try Again" button

## 10.4 How to Test Across Platforms

### Web (Desktop)

- **Browser:** Chrome, Firefox, Safari, Edge
- **Resolution:** 1920×1080, 1440×900, 1280×720
- **Check:** Dialog layout, button positions, image display, download functionality

### Web (Mobile)

- **Devices:** iPhone 14, Samsung Galaxy S23, Pixel 7
- **Browsers:** Safari iOS, Chrome Android
- **Check:** Touch interactions, file picker, drag-and-drop alternative, responsive layout

### Android PWA

- **Installation:** Add to Home Screen from Chrome
- **Check:** Full-screen mode, file picker for camera/gallery, offline behavior

### Vercel Deployment

- **Check:** Proxy connection, canvas fallback, performance (cold starts)

## 10.5 Performance Benchmarks

### Expected Processing Times

| Phase | Time (seconds) | Notes |
|---|---|---|
| Selfie compression | 0.5-1.0 | Client-side, depends on image size |
| Product image resolution | 0.5-2.0 | Server-side, depends on image source |
| Product analysis (VLM) | 3-8 | Depends on image complexity |
| Person description (VLM) | 2-5 | Runs in parallel with product analysis |
| Strategy A generation | 10-25 | Dual-image edit |
| Strategy B generation | 8-20 | Single-image edit |
| Strategy C generation | 8-20 | Single-image edit (optional) |
| Strategy D generation | 10-25 | Text-to-image (fallback only) |
| VLM verification (per result) | 3-8 | One call per generated result |
| Refinement (if needed) | 15-30 | Re-edit + re-verify |
| Watermark | 0.5-1.0 | Server-side Sharp processing |
| **Total (best case)** | **25-45** | Strategy A passes on first try |
| **Total (typical)** | **40-70** | Multiple strategies + verification |
| **Total (worst case)** | **90-120** | All strategies + refinement |

### Client-Side Polling

- **Poll interval:** 2 seconds
- **Max poll duration:** 4 minutes (120 polls × 2s)
- **UI timeout:** 2 minutes (standalone dialog) or 4 minutes (embedded dialog)

---

# 11. Video Training Script Outlines

## Video 1: "Getting Started with AI Virtual Try-On" — Setup and First Run

**Duration:** 10 minutes  
**Audience:** Developers

### Script Outline

**[0:00-1:00] Introduction**
- "Welcome to the 3 BOXES LUXURY AI Virtual Try-On training series."
- Explain what the feature does: upload selfie → see product on you
- Show a quick demo of the end result

**[1:00-3:00] Prerequisites and Setup**
- Show the project repository and clone command
- Install dependencies with `bun install`
- Set up the database with `npx prisma db push && npx prisma db seed`
- Create `.env` file from template

**[3:00-5:00] ZAI SDK Configuration**
- Explain the three configuration methods
- Show creating a `.z-ai-config` file
- Verify with `curl http://localhost:3000/api/try-on/status`
- Show the "available: true" response

**[5:00-7:00] First Run**
- Start the dev server with `bun run dev`
- Navigate to a product page
- Click "Style Preview"
- Upload a selfie
- Click "Create Preview"
- Show the loading animation and progress messages
- Show the result with accuracy scores

**[7:00-9:00] Understanding the Result**
- Explain accuracy scores (Color, Shape, Face, Overall)
- Show the "Save Image" download
- Show the "Try Again" retry
- Explain the product suggestions

**[9:00-10:00] Summary and Next Steps**
- Recap: setup → config → first run
- Preview next video: "Understanding the AI Pipeline"

---

## Video 2: "Understanding the AI Pipeline" — How the 4 Strategies Work

**Duration:** 15 minutes  
**Audience:** Developers, Technical QA

### Script Outline

**[0:00-2:00] Pipeline Overview**
- Show the pipeline diagram (Phase 0-6)
- Explain the async, multi-strategy approach
- Why multiple strategies? (API reliability, quality optimization)

**[2:00-5:00] Phase 1: Product Analysis**
- Explain the VLM call for product analysis
- Show example VLM output (TYPE, MAIN_COLOR, etc.)
- Explain how colors with hex codes improve accuracy
- Show the parallel person description call

**[5:00-10:00] Phase 2: Generation Strategies**
- **Strategy A (Dual-image):** Show how both selfie + product are passed
  - Diagram: `[selfie image] + [product image] → AI → [result]`
  - Why it's best: AI can SEE the product colors
- **Strategy B (Selfie edit):** Show how only selfie is passed with text description
  - Diagram: `[selfie image] + text → AI → [result]`
  - When to use: When dual-image fails or for complex categories
- **Strategy C (Product edit):** Show how only product is passed with text description
  - Diagram: `[product image] + text → AI → [result]`
  - When to use: For simple products where color accuracy is critical
- **Strategy D (Text-to-image):** Show pure text generation
  - Diagram: `text → AI → [result]`
  - When to use: Last resort when all image edits fail

**[10:00-12:00] Phase 3: VLM Verification**
- Explain the verification prompt
- Show example verification output (COLOR, SHAPE, FACE, OVERALL scores)
- Explain early-stop optimization (color ≥ 8)

**[12:00-14:00] Phase 4: Refinement**
- Explain when refinement triggers (color < 7)
- Show how correction instructions are built from VLM feedback
- Show the refinement result comparison

**[14:00-15:00] Canvas Fallback**
- Explain when canvas fallback activates
- Show what the canvas overlay looks like
- Explain its limitations (not AI-generated, just a composite)

---

## Video 3: "Customizing for Your Products" — Category Configuration

**Duration:** 12 minutes  
**Audience:** Developers, Content Managers

### Script Outline

**[0:00-2:00] Category Configuration Overview**
- Show the `CATEGORY_CONFIG` object
- Explain each field: placement, size, colorFocus, bodyType, useProductEdit

**[2:00-5:00] Jewelry Sub-Type Detection**
- Show the keyword detection code
- Live demo: change a product name from "Ruby Elegance" to "Ruby Necklace" and show the different placement
- Explain Hindi/Indian terms: jhumka, kada, haar, mala

**[5:00-8:00] Adding a New Category**
- Step-by-step walkthrough of adding "Sunglasses"
- Show the code changes in try-on-pipeline.ts
- Show adding the pairing category
- Show testing the new category

**[8:00-10:00] Customizing Prompts**
- Show the prompt builder functions
- Explain how to improve prompts for specific categories
- Live demo: improve the saree prompt with more specific draping instructions

**[10:00-12:00] Product Naming Best Practices**
- For content managers: how to name products for best results
- Show examples of good vs. bad product names
- Explain the impact of missing type keywords

---

## Video 4: "Deploying to Production" — Vercel + Proxy Setup

**Duration:** 10 minutes  
**Audience:** Developers, DevOps

### Script Outline

**[0:00-2:00] Deployment Architecture**
- Show the Vercel ↔ Proxy ↔ Sandbox diagram
- Explain why the proxy is needed (AI service not accessible from Vercel)

**[2:00-5:00] Vercel Setup**
- Create Vercel project
- Configure environment variables
- Show the Vercel dashboard with env vars
- Deploy with `vercel --prod`

**[5:00-7:00] Proxy Configuration**
- Explain the sandbox Caddy proxy
- Show the `ZAI_PROXY_URL` configuration
- Test the proxy connection with `/api/try-on/status`
- Explain the `.space-z.ai` gateway and `Abc` header

**[7:00-9:00] Fallback Testing**
- Simulate proxy failure
- Show canvas fallback activation
- Show client-side direct proxy attempt
- Verify the complete fallback chain

**[9:00-10:00] Monitoring and Maintenance**
- How to check AI service health
- How to monitor try-on success rates
- How to update proxy URLs

---

## Video 5: "Troubleshooting Guide" — Common Issues and Fixes

**Duration:** 12 minutes  
**Audience:** All Teams

### Script Outline

**[0:00-2:00] Common Error Messages**
- "AI_STYLE_SERVICE_UNAVAILABLE" → Config issue
- "AI service unreachable" → Network issue
- "Product image not available" → Image path issue
- "Generation timed out" → Performance issue

**[2:00-5:00] Diagnosing AI Issues**
- Check `/api/try-on/status` endpoint
- Read server logs for pipeline phases
- Identify which strategy succeeded/failed
- Check accuracy scores

**[5:00-8:00] Color Accuracy Issues**
- Show examples of color mismatches
- Explain how to improve product images
- How to adjust colorFocus prompts
- When to expect refinement to help

**[8:00-10:00] Platform-Specific Issues**
- Vercel: proxy not configured
- Mobile: file picker issues
- Safari: canvas rendering differences
- Android PWA: camera access permissions

**[10:00-12:00] Performance Optimization**
- How to reduce generation time
- Understanding the API call delay (1.2s)
- When to disable certain strategies
- Caching strategies (future improvement)

---

# 12. Troubleshooting & FAQ

## Frequently Asked Questions

### Q: Why does the try-on sometimes show wrong colors?

**A:** Color accuracy depends on several factors:
1. **Product image quality** — Dark or filtered product photos lead to inaccurate color extraction
2. **Strategy used** — Dual-image edit (Strategy A) has the best color accuracy because the AI can SEE the product; text-described colors (Strategy B) are less accurate
3. **AI model limitations** — The image generation model sometimes "drifts" colors, especially with subtle shades like rose gold or champagne
4. **Refinement pass** — If color accuracy < 7, the pipeline automatically attempts a refinement

### Q: How long should a virtual try-on take?

**A:** Typical times:
- **Best case:** 25-45 seconds (Strategy A passes immediately)
- **Typical:** 40-70 seconds (multiple strategies + verification)
- **Worst case:** 90-120 seconds (all strategies + refinement)
- **Canvas fallback:** 2-5 seconds (no AI, just composite)

### Q: What happens if I upload a very large image?

**A:** The client automatically compresses the image to max 1536px on the longest side with JPEG quality 0.92 before uploading. This ensures consistent upload times and server processing regardless of the original image size.

### Q: Can users try on multiple products at once?

**A:** No. Each try-on is for a single product. However, the result step shows **up to 4 product suggestions** from paired categories that the user can also try on.

### Q: Is the selfie stored on the server?

**A:** No. The selfie is processed in-memory during the pipeline execution and is not written to disk. Jobs are automatically cleaned up after 15 minutes. The client shows a privacy notice: "Your photo is processed securely and not stored permanently."

### Q: Why does the feature show a "Style Preview" overlay instead of an AI try-on?

**A:** This happens when the AI service is unavailable (canvas fallback mode). Common causes:
- ZAI SDK not configured (missing `.z-ai-config` or environment variables)
- AI service unreachable (network issue)
- Running on Vercel without a proxy configured

### Q: Can I use the virtual try-on on products from external platforms (Myntra, Nykaa, etc.)?

**A:** Yes. The system handles external product images through the image proxy. External URLs are fetched server-side and converted to base64 for the AI pipeline.

### Q: What's the difference between "Style Preview" and "Virtual Try-On"?

**A:** They're the same feature. "Style Preview" is the user-facing brand name (appears on buttons and badges), while "Virtual Try-On" is the technical/developer term used in documentation and code.

---

# Appendix A — Category Configuration Reference

Complete `CATEGORY_CONFIG` from `src/lib/try-on-pipeline.ts`:

```typescript
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  jewelry: {
    placement: 'wearing the jewelry piece',
    size: '864x1152',
    colorFocus: 'jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY',
    bodyType: 'Close-up beauty photograph from chest up',
    useProductEdit: true,
  },
  sarees: {
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist',
    size: '768x1344',
    colorFocus: 'saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  watches: {
    placement: 'wearing the watch on the left wrist',
    size: '864x1152',
    colorFocus: 'watch dial color, case metal color, and strap color must match EXACTLY',
    bodyType: 'Close-up photograph from waist up',
    useProductEdit: true,
  },
  fashion: {
    placement: 'wearing the outfit',
    size: '768x1344',
    colorFocus: 'outfit fabric color, print pattern, and accent colors must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'mens-shirts': {
    placement: 'wearing the shirt',
    size: '768x1344',
    colorFocus: 'shirt fabric color, pattern, and collar/cuff details must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'mens-shirts-t-shirts': {
    placement: 'wearing the shirt',
    size: '768x1344',
    colorFocus: 'shirt fabric color, pattern, and details must match EXACTLY',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false,
  },
  'leather-goods': {
    placement: 'holding the leather product',
    size: '864x1152',
    colorFocus: 'leather color, grain texture, and hardware metal color must match EXACTLY',
    bodyType: 'Professional product-in-use photograph',
    useProductEdit: true,
  },
  fragrances: {
    placement: 'holding the fragrance bottle',
    size: '864x1152',
    colorFocus: 'bottle shape, cap color, and liquid color must match EXACTLY',
    bodyType: 'Professional product-in-use photograph',
    useProductEdit: true,
  },
  'home-living': {
    placement: 'with the home decor product',
    size: '1344x768',
    colorFocus: 'product colors, materials, and finish must match EXACTLY',
    bodyType: 'Professional lifestyle photograph',
    useProductEdit: true,
  },
}
```

---

# Appendix B — Environment Variable Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `ZAI_BASE_URL` | Yes* | ZAI AI service base URL | `http://172.25.136.193:8080/v1` |
| `ZAI_API_KEY` | Yes* | ZAI API key for authentication | `sk-xxxxx` |
| `ZAI_CHAT_ID` | No | ZAI chat session ID | `chat-123` |
| `ZAI_TOKEN` | No | ZAI authentication token | `tok-xxxxx` |
| `ZAI_USER_ID` | No | ZAI user ID | `user-123` |
| `ZAI_PROXY_URL` | Vercel** | URL of the sandbox proxy | `https://c-abc.space-z.ai` |
| `NEXT_PUBLIC_AI_PROXY_URL` | No | Client-accessible proxy URL | `https://c-abc.space-z.ai` |
| `NEXT_PUBLIC_BASE_URL` | No | App's public base URL | `https://3boxes.vercel.app` |
| `DATABASE_URL` | Yes | SQLite database path | `file:./db/custom.db` |
| `VERCEL` | Auto | Set automatically by Vercel | `1` |

\* Required for AI generation. Without these, the system falls back to canvas mode.  
\** Required on Vercel for AI generation via proxy.

### Config File (.z-ai-config)

```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "your-api-key",
  "chatId": "",
  "token": "",
  "userId": ""
}
```

**Search order:**
1. `{project-root}/.z-ai-config`
2. `{home-dir}/.z-ai-config`
3. `/etc/.z-ai-config`

---

# Appendix C — VLM Prompt Reference

## Product Analysis Prompt

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

## Person Description Prompt

```
Describe this person briefly for a virtual try-on: face shape, skin tone, hair color/style, body build. 1-2 sentences only.
```

## Verification Prompt

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

## Dual-Image Prompt Template

```
Professional fashion photograph. {bodyType}.

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "{productName}" ({productType}).

Show this EXACT person {placement}. The product must match the SECOND IMAGE exactly — same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's {colorFocus} — refer to the SECOND image for exact colors
3. Match the MAIN color especially: {mainColor}
4. Match the METAL color: {metalColor}
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

## Selfie Edit Prompt Template

```
Professional fashion photograph. {bodyType} of this EXACT person {placement}. The product is "{productName}" — a {productType}.

PRODUCT COLOR SCHEMA: {colorSummary}
MATERIALS: {materials}
KEY DETAILS: {keyDetails}

CRITICAL RULES:
1. Keep this person's EXACT face, skin tone, hair, and body — do NOT alter them at all
2. The product's {colorFocus}
3. Match the MAIN color especially: {mainColor}
4. Match the METAL color: {metalColor}
5. The product must look realistic, natural, and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

## Product Edit Prompt Template

```
Professional fashion photograph. {bodyType} showing this EXACT product "{productName}" being worn by a person who is {placement}.

PERSON: {personDescription}

CRITICAL RULES:
1. The product's colors, materials, and design MUST match EXACTLY as shown in this image — do NOT change any color or detail
2. {colorFocus}
3. The person should look natural and realistic wearing the product
4. The product must be the focal point and clearly visible

Studio lighting, photorealistic, 8K quality.
```

## Text-to-Image Prompt Template

```
{bodyType} of a person {placement}. The product is "{productName}" — a {productType}.

PRODUCT: {colorSummary}. Materials: {materials}. Key details: {keyDetails}
PERSON: {personDescription}

Show the product being worn with EXACT colors, materials, and details as described. The {colorFocus}.

Photorealistic, studio lighting, 8K, high detail.
```

## Refinement Prompt Template

```
Professional fashion photograph refinement. {correctionInstruction}. The {colorFocus}. Keep the person's face, body, and pose EXACTLY the same. Only adjust the product to match its correct colors and materials. Studio lighting, photorealistic, 8K quality.
```

---

*End of Document*

*Document generated from source code analysis of the 3 BOXES LUXURY platform. For questions or updates, contact the engineering team.*
