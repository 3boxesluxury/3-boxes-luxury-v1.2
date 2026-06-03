# 3 BOXES LUXURY — Training Videos Documentation

> **Comprehensive video training scripts and recording guides for the AI Virtual Try-On feature**

**Document Version:** 3.0
**Last Updated:** March 2026
**Classification:** Internal — All Teams
**Total Videos:** 10 | **Total Duration:** ~162 min

---

## Series Overview & Learning Path

This training series covers all aspects of the AI Virtual Try-On feature, from setup to deployment, targeted at developers, content managers, QA testers, legal teams, and DevOps professionals.

### Learning Path Diagram

```
                                    ┌─────────────────────┐
                                    │  SERIES START        │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  Video 1: Getting    │
                                    │  Started (15 min)    │
                                    └──────────┬──────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        │                      │                      │
             ┌──────────▼──────────┐  ┌────────▼────────┐  ┌────────▼────────┐
             │  Video 2: AI        │  │  Video 3:       │  │  Video 9:       │
             │  Pipeline (20 min)  │  │  Customizing    │  │  Content Mgrs   │
             │  [Developers]       │  │  Products       │  │  (10 min)       │
             └──────────┬──────────┘  │  (12 min)       │  │  [Non-tech]     │
                        │             └────────┬────────┘  └────────┬────────┘
                        │                      │                     │
             ┌──────────▼──────────┐           │                     │
             │  Video 7: Code      │           │                     │
             │  Architecture       │           │                     │
             │  Deep Dive (25 min) │           │                     │
             │  [Sr. Developers]   │           │                     │
             └──────────┬──────────┘           │                     │
                        │                      │                     │
             ┌──────────▼──────────┐  ┌────────▼────────┐           │
             │  Video 10: Advanced │  │  Video 4:       │           │
             │  Customization      │  │  Deploying to   │           │
             │  (18 min)           │  │  Production     │           │
             │  [Sr. Developers]   │  │  (15 min)       │           │
             └──────────┬──────────┘  │  [DevOps]       │           │
                        │             └────────┬────────┘           │
                        │                      │                     │
             ┌──────────▼──────────────────────▼─────────────────────▼──┐
             │                                                          │
             │  ┌────────────────┐  ┌────────────────┐                 │
             │  │  Video 5:      │  │  Video 6:      │                 │
             │  │  Troubleshoot  │  │  QA Testing    │                 │
             │  │  (12 min)      │  │  (15 min)      │                 │
             │  │  [All]         │  │  [QA Testers]  │                 │
             │  └────────────────┘  └────────────────┘                 │
             │                                                          │
             │  ┌────────────────────────────────────┐                 │
             │  │  Video 8: Patent Overview &        │                 │
             │  │  Filing Guide (20 min)             │                 │
             │  │  [Legal / Founders]                │                 │
             │  └────────────────────────────────────┘                 │
             │                                                          │
             └──────────────────────────────────────────────────────────┘
```

### Video Index

| # | Video Title | Duration | Target Audience | Status | Prerequisites |
|---|-------------|----------|-----------------|--------|---------------|
| 1 | Getting Started with AI Virtual Try-On | 15 min | Developers | Script Ready | Node.js 18+, Git |
| 2 | Understanding the AI Pipeline | 20 min | Developers | Script Ready | Video 1 |
| 3 | Customizing for Your Products | 12 min | Content Managers, Developers | Script Ready | Video 1 |
| 4 | Deploying to Production | 15 min | DevOps, Developers | Script Ready | Video 1 |
| 5 | Troubleshooting Guide | 12 min | All Teams | Script Ready | Video 1 |
| 6 | QA Testing Procedures | 15 min | QA Testers | Script Ready | Videos 1, 2 |
| 7 | Code Architecture Deep Dive | 25 min | Senior Developers | Script Ready | Videos 1, 2 |
| 8 | Patent Overview & Filing Guide | 20 min | Legal, Founders | Script Ready | None |
| 9 | Training Content Managers | 10 min | Content Managers | Script Ready | None |
| 10 | Advanced Customization | 18 min | Senior Developers | Script Ready | Videos 1, 2, 7 |

---

## Video 1: Getting Started with AI Virtual Try-On

**Duration:** 15 minutes
**Target Audience:** Developers
**Prerequisites:** Node.js 18+, bun installed, Git

### Learning Objectives

- Set up the complete development environment for the AI Virtual Try-On feature
- Configure the ZAI SDK with three different methods
- Run the development server and trigger the first virtual try-on
- Understand the high-level system architecture and component relationships
- Navigate the project file structure and locate key AI-related files

### Detailed Script

**[0:00 - 1:30] Introduction**

*Screen: Title card with 3 BOXES LUXURY branding, amber/gold gradient background*

> "Welcome to 3 BOXES LUXURY training. I'm [name], and today we'll cover getting started with the AI Virtual Try-On feature. By the end of this video, you'll have a fully working development environment and have generated your first AI try-on image."

*Key talking points:*
- The AI Virtual Try-On is the flagship feature of the 3 BOXES GIFTS luxury e-commerce platform
- It uses a multi-strategy AI pipeline with VLM verification to generate photorealistic images
- Works across 8+ product categories: jewelry, sarees, watches, fashion, men's shirts, leather goods, fragrances, and home & living
- This video covers setup through first demo — later videos go deeper into each component

**[1:30 - 4:00] Project Setup & Architecture Overview**

*Screen: Terminal (dark mode), then switch to diagram view*

```
# Screen recording: Terminal
git clone <repo-url>
cd my-project
bun install
```

*Screen: Show architecture diagram*

> "Before we dive into setup, let me show you the high-level architecture. The system has four main layers: the Frontend — React components including the TryOnDialog with its 4-step flow; the API Layer — Next.js API routes that accept try-on requests and manage job lifecycle; the AI Pipeline — the core multi-phase generation engine with VLM verification; and the ZAI SDK — our bridge to the AI service for VLM analysis and image generation."

*Key talking points:*
- The architecture uses Next.js 16 with App Router as the foundation
- The frontend sends requests to `/api/try-on` which creates background jobs
- Jobs are polled every 2 seconds for up to 4 minutes
- When AI is unavailable, a client-side canvas fallback provides a degraded experience
- The system runs identically in local sandbox and Vercel serverless via a proxy architecture

*Screen: Project file tree*

```
src/
├── app/api/try-on/
│   ├── route.ts          # Main try-on API endpoint (POST + GET)
│   ├── status/route.ts   # Health check endpoint
│   └── remote/route.ts   # Proxy forwarding route
├── components/
│   └── product-detail.tsx  # TryOnDialog + ProductDetail (1769 lines)
├── lib/
│   ├── zai.ts              # ZAI SDK config & health checks (261 lines)
│   ├── try-on-pipeline.ts  # Core AI pipeline (763 lines)
│   └── watermark.ts        # Image watermarking with Sharp (153 lines)
└── hooks/
    └── usePWAInstall.ts    # PWA install hook (Android)
```

**[4:00 - 7:00] ZAI SDK Configuration**

*Screen: Terminal + code editor, zoomed to 150%*

> "Now let's configure the ZAI SDK, which is our connection to the AI service. There are three methods, in order of priority."

*Method 1: Environment variables (highest priority)*

```bash
# In your .env.local or shell environment
ZAI_BASE_URL=http://172.25.136.193:8080/v1
ZAI_API_KEY=your-api-key
# Optional:
ZAI_CHAT_ID=optional-chat-id
ZAI_TOKEN=optional-token
ZAI_USER_ID=optional-user-id
```

*Method 2: .z-ai-config file*

```json
{
  "baseUrl": "http://172.25.136.193:8080/v1",
  "apiKey": "your-api-key",
  "chatId": "optional",
  "token": "optional",
  "userId": "optional"
}
```

> "The config file can be placed in three locations, checked in this order: your project's current working directory, your home directory `~/.z-ai-config`, or the system directory `/etc/.z-ai-config`. On Vercel, only environment variables work since there's no filesystem access."

*Method 3: Auto-detection via ZAI.create()*

> "If neither environment variables nor config files are found, the SDK attempts auto-detection using its built-in file-based config. This is the simplest method but least explicit — good for sandbox environments where the SDK is pre-configured."

**[7:00 - 9:00] Running the Development Server**

*Screen: Terminal*

```bash
bun run dev
```

> "Let's start the development server. Once it's running on port 3000, navigate to the homepage and browse to any product. You'll see a prominent 'Style Preview' button with a sparkle icon — that's our entry point to the virtual try-on."

*Screen: Browser — show product detail page, zoom into the Style Preview button*

> "The Style Preview button is located below the product image gallery, next to 'Add to Cart'. It uses a gradient amber background — `from-amber-700 to-amber-600` — with a Sparkles icon from Lucide. This button is available for ALL product categories."

**[9:00 - 12:00] First Try-On Demo**

*Screen: Browser — click Style Preview, walk through the 4-step flow*

> "Now let's try it. When you click 'Style Preview', the TryOnDialog opens with a 4-step flow: Upload, Preview, Generate, and Result."

*Step 1: Upload*
> "Upload a selfie. For best results, use good lighting and face the camera directly. For jewelry, a chest-up photo works best. For sarees, a full-body shot is ideal. The system accepts JPG, PNG, or WebP up to 10MB, and compresses the image client-side to max 1536px with JPEG quality 0.92."

*Step 2: Preview*
> "After upload, you see a preview of your compressed selfie alongside the product thumbnail. You can retake or proceed."

*Step 3: Generate*
> "When you click 'Create Preview', the system compresses the image, sends it to `/api/try-on`, and starts polling. Watch the progress messages — they update in real-time: 'AI is analyzing the product...', 'Creating your virtual try-on...', 'Verifying product match...'. This typically takes 30-60 seconds."

*Step 4: Result*
> "Here's our result! You can see the AI-generated image with the product worn on the person. The result shows accuracy scores — Color Match and Face Match out of 10 — the strategy used (in this case 'Dual-Image Edit'), and AI style suggestions for complementary products."

**[12:00 - 14:00] Understanding What Just Happened**

*Screen: Diagram of the 5-phase pipeline*

> "Behind the scenes, here's what happened in those 30-60 seconds. The AI pipeline ran through 5 phases: Phase 1 — VLM Product Analysis, where the AI extracted exact colors, materials, and design details from the product image. Phase 2 — Multi-Strategy Generation, where up to 4 different generation strategies were attempted. Phase 3 — VLM Verification, where each result was scored against the original product. Phase 4 — Color Refinement, triggered only if the best score was below 7. And Phase 5 — Watermarking, where the '3BOXES GIFTS - AI Style Preview' brand mark was applied. We'll deep-dive into this pipeline in Video 2."

**[14:00 - 15:00] Summary & Next Steps**

> "To recap: we set up the development environment, configured the ZAI SDK with environment variables, ran the server, and generated our first virtual try-on image. In the next video, we'll take a deep dive into how the AI pipeline works, including all 4 generation strategies and the VLM verification process."

*Screen: End card with next video preview*

### Screen Recording Instructions

- **[0:00 - 1:30]**: Title card only — no screen recording needed
- **[1:30 - 4:00]**: Show terminal commands, then switch to prepared architecture diagram (dark background, amber/gold accents)
- **[4:00 - 7:00]**: Split screen — terminal on left, code editor on right. Highlight config file content with amber border annotation
- **[7:00 - 9:00]**: Terminal for `bun run dev`, then browser navigation. Use zoom on the Style Preview button
- **[9:00 - 12:00]**: Full browser recording. Show the complete 4-step flow with a real try-on generation. Highlight progress messages and accuracy scores
- **[12:00 - 14:00]**: Prepared pipeline diagram. Annotate each phase as discussed
- **[14:00 - 15:00]**: End card with summary bullet points

### Key Talking Points

1. The ZAI SDK configuration priority order: env vars → project config → home config → system config → auto-detect
2. Client-side image compression (1536px, 0.92 JPEG quality) happens before upload to optimize performance
3. The 4-step dialog flow: Upload → Preview → Generate → Result
4. The pipeline runs 5 phases automatically, typically completing in 30-60 seconds
5. When AI is unavailable, a canvas overlay fallback provides a degraded but functional experience

### Quiz Questions / Knowledge Checks

1. **What are the three methods for configuring the ZAI SDK, and which has the highest priority?**
   - Answer: Environment variables (highest), .z-ai-config file (project/home/system), and auto-detection via ZAI.create() (lowest)

2. **What is the maximum image size and quality setting used for client-side selfie compression?**
   - Answer: 1536px maximum dimension, JPEG quality 0.92

3. **What are the 5 phases of the AI pipeline, and which phase is conditional?**
   - Answer: (1) Product Analysis, (2) Multi-Strategy Generation, (3) VLM Verification, (4) Color Refinement (conditional — only if colorScore < 7), (5) Watermarking

### Resources & Links Mentioned

- [Technical Documentation](./TECHNICAL-DOCUMENTATION.md) — Complete code-level docs
- [Functional Documentation](./FUNCTIONAL-DOCUMENTATION.md) — Feature guide and training
- ZAI SDK configuration: `src/lib/zai.ts`
- Pipeline source: `src/lib/try-on-pipeline.ts`

---

## Video 2: Understanding the AI Pipeline

**Duration:** 20 minutes
**Target Audience:** Developers
**Prerequisites:** Video 1 completed

### Learning Objectives

- Understand the complete 5-phase AI pipeline with all 4 generation strategies
- Explain how VLM analysis extracts structured product data with hex-code colors
- Describe the multi-strategy generation approach and when each strategy is used
- Understand VLM verification scoring and the early-stop optimization
- Explain the color refinement loop and how it improves results

### Detailed Script

**[0:00 - 2:00] Pipeline Overview**

*Screen: Animated pipeline diagram showing the 5 phases flowing left to right*

> "Welcome back. In this video, we're taking a deep dive into the AI Pipeline — the brain of the Virtual Try-On system. This is a 5-phase multi-strategy pipeline that lives in `try-on-pipeline.ts`, which is about 763 lines of code."

*Key talking points:*
- The pipeline is async and runs as a background job after the API returns a `jobId`
- Jobs are stored in-memory with a 15-minute TTL and cleaned up every 5 minutes
- A 1.2-second delay (`API_CALL_DELAY = 1200`) is enforced between AI API calls to prevent rate limiting
- The pipeline always produces a result — even if all AI strategies fail, canvas fallback is available

*Code snippet to display:*

```typescript
// Job lifecycle
const jobs = new Map<string, TryOnJob>()

// 15-minute TTL cleanup
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 15 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)
```

**[2:00 - 6:00] Phase 1: VLM Product Analysis & Person Description**

*Screen: Code walkthrough — `vlmAnalyze()` function, then VLM output examples*

> "Phase 1 runs two VLM calls in parallel. The first analyzes the product image, and the second describes the person in the selfie. Both use the `glm-4v-plus` model."

*Code snippet — vlmAnalyze function:*

```typescript
async function vlmAnalyze(prompt: string, imageUrl: string, timeoutMs = 30000): Promise<string> {
  const zai = createZAI()
  const result = await Promise.race([
    zai.chat.completions.createVision({
      model: 'glm-4v-plus',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      thinking: { type: 'disabled' }  // Faster responses
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('VLM timeout')), timeoutMs)
    )
  ])
  return result.choices?.[0]?.message?.content || ''
}
```

*VLM Product Analysis output example:*

```
TYPE: diamond bib necklace
MAIN_COLOR: deep maroon red #8B1A1A
SECONDARY_COLOR: gold zari #CFB53B
METAL_COLOR: warm yellow gold #DAA520
MATERIALS: 18k white gold, round brilliant-cut diamonds
KEY_DETAILS: intricate floral motif, teardrop centerpiece, cascading drops
```

> "Notice the hex codes — `#8B1A1A` for deep maroon red. This is a critical innovation. Rather than saying 'red', the VLM provides specific hex codes that we can use in prompts for precise color matching. This is Feature 5 in our patent: Hex-Code-Based Color Extraction."

*The `parseProductAnalysis()` function converts this into a structured `ProductInfo` object:*

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

> "The `colorSummary` field is particularly important — it's used in all subsequent generation prompts to maintain color consistency."

**[6:00 - 12:00] Phase 2: Multi-Strategy Generation**

*Screen: Split view — strategy diagram on left, code snippets on right*

> "Phase 2 is where the magic happens. The system generates candidate try-on images using up to 4 strategies, attempted in priority order. Let's walk through each one."

**Strategy A: Dual-Image Edit (PRIMARY)**

*Screen: Show dual-image diagram with selfie and product as inputs*

> "Strategy A is our primary approach and a key patent innovation. It passes BOTH the selfie AND the product image to the AI. The model can literally SEE the product's actual colors instead of guessing from text."

```typescript
// safeImageEditDual — the PRIMARY generation strategy
const response = await zai.images.generations.edit({
  prompt: dualPrompt,
  images: [
    { url: selfieUrl },    // First image: the person
    { url: productUrl },   // Second image: the product
  ],
  size: config.size,
})
```

*Prompt structure:*

```
Professional fashion photograph. [bodyType].

FIRST IMAGE: A person's selfie — this is the person who will wear the product.
SECOND IMAGE: The product "[productName]" ([productType]).

Show this EXACT person [placement]. The product must match the SECOND IMAGE exactly —
same colors, same materials, same design.

CRITICAL RULES:
1. Keep the person's EXACT face, skin tone, hair, and body from the FIRST image
2. The product's [colorFocus] — refer to the SECOND image for exact colors
3. Match the MAIN color especially: [mainColor]
4. Match the METAL color: [metalColor] (if applicable)
5. The product must look realistic and properly fitted on the person

Studio lighting, photorealistic, 8K quality.
```

> "This strategy is enabled for jewelry, watches, leather goods, fragrances, and home & living. It's disabled for sarees and fashion because the AI model struggles with complex outfit draping when given two input images."

**Strategy B: Selfie-Edit**

> "Strategy B passes only the selfie as an image, with the product described in text including hex-code colors. It preserves the person's face better but color accuracy depends on text description quality."

**Strategy C: Product-Edit**

> "Strategy C passes only the product as an image, with the person described in text. This preserves product colors perfectly since the model can see the product, but the face won't match the user. It's only used for categories with `useProductEdit: true`."

**Strategy D: Text-to-Image**

> "Strategy D is the last resort — pure text-to-image with no input images. It produces the lowest quality because neither the person's face nor the product's exact appearance is preserved. But it ensures the system ALWAYS produces some output."

*Screen: Strategy comparison table*

| Strategy | Input | Color Accuracy | Face Preservation | When Used |
|----------|-------|---------------|-------------------|-----------|
| A: Dual-Image | Selfie + Product | 7-9/10 | 8-9/10 | Primary — always tried first |
| B: Selfie-Edit | Selfie + Text | 5-8/10 | 9-10/10 | Always as backup |
| C: Product-Edit | Product + Text | 8-9/10 | 3-5/10 | Only `useProductEdit: true` categories |
| D: Text-to-Image | Text only | 3-6/10 | 2-4/10 | Last resort fallback |

**[12:00 - 15:30] Phase 3: VLM Verification & Selection**

*Screen: VLM verification prompt, then scoring example*

> "Every generated result is independently verified by the VLM. This is another key innovation — most virtual try-on systems just present whatever the AI generates without quality checking."

*VLM verification prompt:*

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

*Verification example output:*

```
COLOR: 9
SHAPE: 8
FACE: 7
OVERALL: 8
ISSUE: none
VERDICT: PASS
```

> "The selection logic picks the result with the highest `overallScore`. But there's an important optimization: if any result has `colorScore >= 8` and passes verification, we stop checking remaining results. This early-stop saves VLM API calls when a clearly good result is found."

*Code snippet — parseVerification:*

```typescript
// Parsing verification — scores clamped to 0-10, defaulting to 5 if parsing fails
// Pass criteria: explicit VERDICT: PASS OR (colorScore >= 7 AND overallScore >= 6)
```

**[15:30 - 18:00] Phase 4: Color Refinement (Conditional)**

*Screen: Refinement flow diagram*

> "If the best result has a colorScore below 7, the system automatically triggers a refinement pass. This is Feature 4 in our patent: the Color Accuracy Refinement Loop."

*Refinement process:*
1. VLM describes the specific color mismatch from the `ISSUE` field
2. A correction prompt is built using the mismatch description and `productInfo.colorSummary`
3. The best result is re-edited with the correction prompt
4. The refined result is re-verified by VLM
5. The refinement is used ONLY if it scores higher than the original

*Example correction prompt:*

```
Professional fashion photograph refinement. The necklace is silver but should be
gold #DAA520. The jewelry metal tone (gold/silver/rose-gold) and stone colors
must match EXACTLY. Keep the person's face, body, and pose EXACTLY the same.
Only adjust the product to match its correct colors and materials.
Studio lighting, photorealistic, 8K quality.
```

> "The pipeline is limited to a maximum of 1 refinement pass to avoid infinite loops. So `totalPasses` in the job result will be either 1 (no refinement needed) or 2 (refinement was applied)."

**[18:00 - 19:30] Phase 5: Watermark & Deliver**

*Screen: Watermark code walkthrough in watermark.ts*

> "The final phase applies the '3BOXES GIFTS - AI Style Preview' watermark using Sharp image processing. There are two modes: if a logo PNG exists at `public/images/logo.png`, it composites the logo alongside text at 60% opacity. Otherwise, it generates an SVG watermark with gold gradient text against a semi-transparent black background. The watermark is always positioned at the bottom-right corner with 2% padding."

**[19:30 - 20:00] Summary & Key Takeaways**

> "To recap: the AI pipeline runs 5 phases — Analysis, Generation with 4 strategies, VLM Verification with early-stop, conditional Color Refinement, and Watermarking. The dual-image edit strategy and hex-code color extraction are key innovations that give us superior color accuracy. In the next video, we'll look at how product data affects the pipeline and how to customize it for your products."

### Screen Recording Instructions

- **[0:00 - 2:00]**: Animated pipeline diagram — highlight each phase as discussed. Use amber arrows between phases
- **[2:00 - 6:00]**: Code editor showing `vlmAnalyze()` and `parseProductAnalysis()`. Zoom to 150%. Show example VLM output in a side panel
- **[6:00 - 12:00]**: Split view — strategy flow diagram on left, code + prompt on right. Use color coding: green for Strategy A (primary), blue for B, yellow for C, red for D (fallback)
- **[12:00 - 15:30]**: Show VLM verification prompt and response. Highlight the early-stop condition with a callout annotation
- **[15:30 - 18:00]**: Refinement flow diagram. Show the conditional trigger (colorScore < 7) with a red border highlight
- **[18:00 - 19:30]**: Watermark.ts code. Show example watermark output on a sample image
- **[19:30 - 20:00]**: End card with key takeaways as bullet points

### Key Talking Points

1. The `colorSummary` field with hex-code colors is the foundation for color accuracy across all strategies
2. Dual-image edit (Strategy A) is the PRIMARY strategy because the AI can directly observe product colors
3. VLM verification with early-stop optimization saves API calls while ensuring quality
4. The refinement loop is limited to 1 pass max to prevent infinite loops
5. `API_CALL_DELAY = 1200ms` between consecutive API calls prevents rate limiting

### Quiz Questions / Knowledge Checks

1. **Why is the dual-image edit strategy (Strategy A) the primary approach, and for which categories is it disabled?**
   - Answer: It's primary because the AI can directly observe both the person and product colors. It's disabled for sarees and fashion because the AI struggles with complex outfit draping when given two input images.

2. **What triggers the color refinement loop, and what is the maximum number of refinement passes?**
   - Answer: It's triggered when `colorScore < 7`. Maximum 1 refinement pass (totalPasses is either 1 or 2).

3. **What is the early-stop optimization in VLM verification, and why does it matter?**
   - Answer: If any result has `colorScore >= 8` and passes verification, we stop checking remaining results. This saves VLM API calls when a clearly good result is found.

### Resources & Links Mentioned

- Pipeline source: `src/lib/try-on-pipeline.ts` (763 lines)
- ZAI SDK config: `src/lib/zai.ts` (261 lines)
- Watermark system: `src/lib/watermark.ts` (153 lines)
- [Technical Documentation — Pipeline Phase Details](./TECHNICAL-DOCUMENTATION.md#5-pipeline-phase-details)
- [Technical Documentation — Prompt Engineering](./TECHNICAL-DOCUMENTATION.md#6-prompt-engineering-details)

---

## Video 3: Customizing for Your Products

**Duration:** 12 minutes
**Target Audience:** Content Managers, Developers
**Prerequisites:** Video 1 completed

### Learning Objectives

- Understand how product names, categories, and images directly affect AI output quality
- Apply jewelry naming best practices for optimal sub-type detection
- Configure category settings including placement, size, colorFocus, and body framing
- Optimize product images for the best AI color accuracy
- Troubleshoot common product configuration issues

### Detailed Script

**[0:00 - 2:00] How Products Affect AI Output**

*Screen: Before/after comparison showing product naming impact*

> "The product data you enter has a direct and significant impact on the AI output quality. There are three key factors: the product name, which drives jewelry sub-type detection; the category, which determines prompt engineering, image size, and body framing; and the product image quality, which directly affects color accuracy in the generated result."

*Key talking points:*
- Product name is parsed for keywords to determine placement (e.g., "necklace" → "wearing a necklace around the neck")
- Category determines the entire generation configuration — image size, body framing, color focus, and which strategies to use
- A low-quality product image means the VLM can't extract accurate colors, which cascades through the entire pipeline

**[2:00 - 5:00] Jewelry Naming Best Practices**

*Screen: Table showing keyword detection rules with examples*

> "For jewelry products, the naming convention is critical. Our system analyzes the product name to detect sub-types and adjusts the placement prompt accordingly."

*Keyword detection table:*

| Keyword in Product Name | Placement Prompt |
|---|---|
| `earring`, `jhumka`, `stud` | "wearing earrings on both earlobes" |
| `necklace`, `choker`, `pendant`, `temple`, `haar`, `mala` | "wearing a necklace around the neck" |
| `bracelet`, `cuff`, `bangle`, `kada` | "wearing a bracelet on the wrist" |
| `ring` | "wearing a ring on the finger" |
| `set`, `bridal` | "wearing a matching jewelry set — necklace around the neck and earrings on both earlobes" |

*Good vs. Bad examples:*

| ❌ Bad Name | ✅ Good Name | Detected Type |
|---|---|---|
| "Diamond Jewelry" | "Diamond Temple Necklace" | Necklace |
| "Gold Set" | "Gold Bridal Set" | Set (necklace + earrings) |
| "Pearl Accessories" | "Pearl Jhumka Earrings" | Earrings |
| "Ruby Item" | "Ruby Kada Bracelet" | Bracelet |
| "Emerald Product" | "Emerald Ring" | Ring |

> "The rule is simple: always include the specific jewelry sub-type in the product name. Generic names like 'Jewelry' or 'Accessories' produce generic results because the AI doesn't know where to place the product."

**[5:00 - 7:30] Category Configuration**

*Screen: CATEGORY_CONFIG table from try-on-pipeline.ts*

> "Each category has a configuration object that controls 5 parameters. Let me walk through each one."

```typescript
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  jewelry: {
    placement: 'wearing the jewelry piece',
    size: '864x1152',         // Portrait 3:4
    colorFocus: 'jewelry metal tone (gold/silver/rose-gold) and stone colors must match EXACTLY',
    bodyType: 'Close-up beauty photograph from chest up',
    useProductEdit: true       // Strategy C enabled
  },
  sarees: {
    placement: 'draped in the saree in traditional Indian style with pallu elegantly over the left shoulder, matching blouse, properly pleated at the waist',
    size: '768x1344',         // Tall portrait 4:7
    colorFocus: 'saree fabric color, border color, and zari/work color must match EXACTLY — a maroon saree must stay maroon, not become red or burgundy',
    bodyType: 'Full-body professional fashion photograph',
    useProductEdit: false      // Strategy C disabled
  },
  // ... other categories
}
```

*Configuration parameter explanation:*

| Parameter | What It Controls | Example |
|---|---|---|
| `placement` | Where the product appears on the person | "wearing a necklace around the neck" |
| `size` | Output image dimensions | `864x1152` for jewelry, `768x1344` for sarees |
| `colorFocus` | What colors the AI must match exactly | "jewelry metal tone and stone colors" |
| `bodyType` | Camera framing / body visibility | "Close-up beauty photograph from chest up" |
| `useProductEdit` | Whether Strategy C (product-edit) is enabled | `true` for jewelry, `false` for sarees |

> "Notice the saree colorFocus — it includes the specific instruction 'a maroon saree must stay maroon, not become red or burgundy'. This prevents a common AI error where dark warm colors shift during generation."

**[7:30 - 10:00] Product Image Tips**

*Screen: Side-by-side comparison of good vs. bad product images*

> "The product image is the VLM's reference for color extraction. If the image is poor, the entire pipeline suffers. Here are the guidelines:"

*Image quality checklist:*
- ✅ **Minimum resolution**: 500x500 pixels — below this, color extraction degrades
- ✅ **White or neutral background** — eliminates color contamination in VLM analysis
- ✅ **Single product visible** — no props, models, or competing items
- ✅ **Accurate color representation** — the photo must match the real product color
- ❌ **Avoid**: Dark shadows, heavy reflections, colored backgrounds, multiple products

*Category-specific tips:*

| Category | Best Practice |
|---|---|
| Jewelry | Show the piece against a dark background; ensure metal tone is clearly visible |
| Sarees | Show the full drape if possible; include pallu and border detail |
| Watches | Show the dial clearly; ensure strap color is accurately represented |
| Fragrances | Show the bottle shape and liquid color; cap and label must be visible |

**[10:00 - 11:30] Common Product Configuration Issues**

*Screen: Troubleshooting examples with fixes*

> "Let me show you some common issues and how to fix them."

| Issue | Cause | Fix |
|---|---|---|
| Jewelry placed on wrong body part | Product name missing sub-type keyword | Add "necklace", "earring", "bracelet", etc. to the name |
| Saree color shifts from maroon to red | No specific color instruction in category config | Already handled — the colorFocus includes the anti-shift instruction |
| Product appears distorted | Low-resolution product image | Use at least 500x500 product images |
| Wrong image aspect ratio | Wrong category assigned | Ensure category slug matches the product type |

**[11:30 - 12:00] Summary**

> "Product data quality directly drives AI output quality. Name your jewelry with specific sub-types, assign the correct category, and use high-quality product images with neutral backgrounds. In Video 10, we'll cover advanced customization including adding new categories and modifying prompts."

### Screen Recording Instructions

- **[0:00 - 2:00]**: Before/after images showing impact of product naming. Use amber callouts to highlight the differences
- **[2:00 - 5:00]**: Show the keyword detection table. Then demonstrate in the browser — create two products with different names and show the different AI results
- **[5:00 - 7:30]**: Code editor showing CATEGORY_CONFIG. Zoom into each parameter as discussed. Highlight the saree colorFocus anti-shift instruction with a red annotation
- **[7:30 - 10:00]**: Side-by-side product images — good vs. bad. Use green checkmarks and red X annotations
- **[10:00 - 11:30]**: Troubleshooting examples. Show real browser screenshots of each issue
- **[11:30 - 12:00]**: Summary card with 3 key takeaways

### Key Talking Points

1. Product name → jewelry sub-type detection → correct placement prompt — this chain is critical for jewelry
2. The category determines EVERYTHING about how the pipeline runs: size, framing, strategies, color focus
3. The saree colorFocus includes an explicit anti-shift instruction for maroon→red, a common AI error
4. Product image quality directly impacts VLM color extraction quality
5. `useProductEdit: false` for sarees/fashion means Strategy C is skipped for those categories

### Quiz Questions / Knowledge Checks

1. **What happens if you name a necklace product simply "Diamond Jewelry"?**
   - Answer: The system can't detect the sub-type, so it uses the generic placement "wearing the jewelry piece" instead of the specific "wearing a necklace around the neck", resulting in less accurate placement.

2. **Why is `useProductEdit` set to `false` for the sarees category?**
   - Answer: The AI model struggles with the complexity of saree draping when given two input images (product-edit passes the product as the only image). Single-image edit (selfie-only) produces better results for complex outfits.

3. **What specific color shift does the saree colorFocus instruction prevent?**
   - Answer: It prevents maroon from becoming red or burgundy — a common AI error where dark warm colors shift during generation.

### Resources & Links Mentioned

- Category config source: `src/lib/try-on-pipeline.ts` — `CATEGORY_CONFIG` object
- [Functional Documentation — Category Configuration Reference](./FUNCTIONAL-DOCUMENTATION.md#appendix-a--category-configuration-reference)
- [Functional Documentation — Image Quality Requirements](./FUNCTIONAL-DOCUMENTATION.md#32-image-quality-requirements)

---

## Video 4: Deploying to Production

**Duration:** 15 minutes
**Target Audience:** DevOps, Developers
**Prerequisites:** Video 1 completed

### Learning Objectives

- Understand the deployment architecture including the proxy pattern for Vercel
- Configure the ZAI proxy URL and environment variables for production
- Deploy to Vercel with correct environment variable setup
- Set up Android PWA deployment
- Understand the canvas fallback behavior when AI is unavailable on Vercel

### Detailed Script

**[0:00 - 2:30] Deployment Architecture Overview**

*Screen: Architecture diagram showing Local, Vercel, and PWA paths*

> "The deployment architecture has two modes. In the local sandbox, the Next.js server has direct access to the ZAI AI service at the internal IP address. On Vercel, the serverless functions can't reach internal IPs, so we need a proxy — the `ZAI_PROXY_URL` — that routes requests back to the sandbox where the AI service lives."

*Key talking points:*
- Local sandbox: Direct SDK access → `ZAI_BASE_URL` (internal IP like `172.25.x.x:8080`)
- Vercel serverless: Proxy access → `ZAI_PROXY_URL` (public URL like `https://your-sandbox.space-z.ai`)
- The `.space-z.ai` gateway handles authentication via the `Abc` header
- Both modes produce identical results — the proxy is transparent to the pipeline

**[2:30 - 5:30] Setting Up the Proxy**

*Screen: Terminal + configuration file*

> "The proxy URL points to the sandbox's public gateway. The Caddy gateway running on port 81 forwards requests to Next.js on port 3000. Let me show you how to configure it."

*Environment variables for Vercel:*

```bash
# Required for Vercel deployment
ZAI_PROXY_URL=https://your-sandbox.space-z.ai   # Public proxy URL

# Product data source
DATA_SOURCE=shopify                               # or 'local' for Prisma

# Shopify integration (if DATA_SOURCE=shopify)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxxxxxxxxxx

# Optional: Direct AI access (if available on Vercel)
# ZAI_BASE_URL=https://your-ai-endpoint.com/v1
# ZAI_API_KEY=your-api-key
```

> "The proxy flow works like this: when a try-on request comes in on Vercel, the POST handler first checks if a proxy URL is configured. If it is, it resolves the product image to base64 — because Vercel can't access internal image URLs — then forwards the entire request to the sandbox's `/api/try-on` endpoint. The sandbox runs the pipeline and returns the `jobId`. Subsequent polls are also proxied."

*Proxy data flow diagram:*

```
CLIENT → VERCEL → PROXY → SANDBOX (runs pipeline)
CLIENT ← VERCEL ← PROXY ← SANDBOX (returns job state)
```

**[5:30 - 9:00] Vercel Deployment Steps**

*Screen: Terminal — live deployment demo*

> "Now let's deploy. First, make sure you have the Vercel CLI installed and are logged in."

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
npx vercel env add ZAI_PROXY_URL production
# Enter: https://your-sandbox.space-z.ai

npx vercel env add DATA_SOURCE production
# Enter: shopify

npx vercel env add SHOPIFY_STORE_DOMAIN production
# Enter: your-store.myshopify.com

npx vercel env add SHOPIFY_ADMIN_API_TOKEN production
# Enter: shpat_xxxxxxxxxxxxx

# Deploy to production
npx vercel --prod --token YOUR_TOKEN --yes
```

> "After deployment, verify the try-on status endpoint:"

```bash
curl https://your-app.vercel.app/api/try-on/status
# Expected: {"available":true,"mode":"proxy","reason":null}
```

> "If you see `mode: "proxy"`, the proxy is working. If you see `mode: "unavailable"`, check that `ZAI_PROXY_URL` is set correctly and the sandbox is reachable."

**[9:00 - 11:30] Canvas Fallback on Vercel**

*Screen: Browser — demonstrate canvas fallback behavior*

> "When the AI service is completely unreachable on Vercel — for example, if the sandbox is down — the system gracefully degrades to a client-side canvas overlay."

*Three-tier strategy on Vercel:*

1. **Tier 1: Proxy** — Forward request to sandbox via `ZAI_PROXY_URL`
2. **Tier 2: Direct SDK** — If `ZAI_BASE_URL` and `ZAI_API_KEY` are configured on Vercel
3. **Tier 3: Canvas Fallback** — Client-side canvas overlay composite

*Canvas fallback demo:*
> "The canvas fallback creates a premium-looking style preview by: drawing the user's selfie as the base, applying a vignette overlay, adding a 'STYLE PREVIEW' badge in the top-left, overlaying a branded product panel in the bottom-right with a gold border, and adding a '3BOXES GIFTS · AI Style Preview' footer. It's not AI-generated, but it provides a useful visual that maintains user engagement."

**[11:30 - 13:30] Android PWA Deployment**

*Screen: Browser — demonstrate PWA install on Android emulator*

> "The same Vercel URL works as a Progressive Web App on Android. No separate build is needed."

*PWA setup:*
1. Users visit the Vercel URL on their Android phone
2. Chrome shows an "Install" banner or the user can select "Install app" from the menu
3. The app installs with a home screen icon and runs in a standalone window
4. The AI try-on works identically to the browser version

> "The `usePWAInstall.ts` hook handles the install prompt. It detects when the browser supports PWA installation and shows a contextual prompt to the user."

**[13:30 - 15:00] Summary & Deployment Checklist**

> "Here's your deployment checklist:"

- [ ] Set `ZAI_PROXY_URL` to the sandbox's public URL
- [ ] Set `DATA_SOURCE` to `shopify` or `local`
- [ ] Configure Shopify credentials if using Shopify
- [ ] Deploy with `npx vercel --prod`
- [ ] Verify `/api/try-on/status` returns `mode: "proxy"`
- [ ] Test a full try-on generation on the deployed URL
- [ ] Test canvas fallback by temporarily misconfiguring the proxy
- [ ] Test PWA install on an Android device
- [ ] Set up monitoring for the `/api/try-on/status` endpoint

### Screen Recording Instructions

- **[0:00 - 2:30]**: Architecture diagram with animated data flow arrows. Highlight the proxy path with amber color
- **[2:30 - 5:30]**: Terminal for env var configuration. Show the `.space-z.ai` gateway URL with annotation
- **[5:30 - 9:00]**: Live Vercel deployment. Show the full terminal output. Then browser to verify the status endpoint
- **[9:00 - 11:30]**: Deliberately misconfigure the proxy to show canvas fallback. Then fix it. Show the canvas result vs. AI result side-by-side
- **[11:30 - 13:30]**: Android emulator showing PWA install flow. Then demonstrate try-on in the installed PWA
- **[13:30 - 15:00]**: Deployment checklist displayed as a checklist graphic with green checkmarks

### Key Talking Points

1. The proxy pattern is essential because Vercel serverless functions can't reach internal AI service IPs
2. The `ZAI_PROXY_URL` must be set as a Vercel environment variable, not in the code
3. Three-tier strategy on Vercel: Proxy → Direct SDK → Canvas Fallback
4. Canvas fallback provides a degraded but functional experience — always produce a result
5. PWA deployment requires no additional build — the same Vercel URL works

### Quiz Questions / Knowledge Checks

1. **Why can't Vercel serverless functions access the AI service directly?**
   - Answer: The AI service runs on internal IP addresses (like 172.25.x.x) that are not reachable from Vercel's serverless infrastructure. A proxy URL is needed to route requests through the public internet back to the sandbox.

2. **What are the three tiers of the Vercel deployment strategy, in order?**
   - Answer: (1) Proxy — forward to sandbox via ZAI_PROXY_URL, (2) Direct SDK — if ZAI_BASE_URL and ZAI_API_KEY are configured, (3) Canvas Fallback — client-side composite.

3. **How do you verify that the proxy is working after deployment?**
   - Answer: Call `GET /api/try-on/status` and check that it returns `{"available": true, "mode": "proxy"}`.

### Resources & Links Mentioned

- [Vercel Deployment Guide](../VERCEL-DEPLOYMENT-GUIDE.md)
- [Vercel Deployment Wiki](../VERCEL-WIKI.md)
- API route source: `src/app/api/try-on/route.ts` (536 lines)
- ZAI SDK config: `src/lib/zai.ts` — `isZAIAvailable()` and `isProxyReachable()`
- [Technical Documentation — Deployment Topology](./TECHNICAL-DOCUMENTATION.md#11-deployment-topology)

---

## Video 5: Troubleshooting Guide

**Duration:** 12 minutes
**Target Audience:** All Teams
**Prerequisites:** Video 1 completed

### Learning Objectives

- Diagnose the 5 most common issues with the AI Virtual Try-On
- Use debug logging and the status API to identify root causes
- Fix AI generation failures, color mismatches, and canvas fallback triggering
- Understand the proxy health check system and its caching behavior
- Know when to escalate issues to the development team

### Detailed Script

**[0:00 - 2:00] Common Issues Overview**

*Screen: Issue overview dashboard with 5 common problems*

> "Here are the 5 most common issues you'll encounter with the AI Virtual Try-On, ranked by frequency:"

| # | Issue | Symptoms | Typical Cause |
|---|---|---|---|
| 1 | AI not generating images | Stuck on "Creating your virtual try-on..." | ZAI service down or misconfigured |
| 2 | Color mismatch | Product appears wrong color (e.g., gold → silver) | Low-quality product image or wrong category |
| 3 | Face distortion | Person's face looks different from selfie | Strategy C or D producing poor face preservation |
| 4 | Canvas fallback triggering | Getting overlay instead of AI-generated image | Proxy misconfiguration or AI service unreachable |
| 5 | Proxy connection errors | 502/504 errors on Vercel | Sandbox down or network issues |

**[2:00 - 4:30] Issue 1: AI Not Generating Images**

*Screen: Terminal — checking status and logs*

> "When the try-on seems stuck, the first thing to check is the AI service status."

```bash
# Check AI service health
curl http://localhost:3000/api/try-on/status
# Expected: {"available":true,"mode":"ai","reason":null}

# On Vercel:
curl https://your-app.vercel.app/api/try-on/status
```

*If `mode: "unavailable"`:*

```bash
# Check .z-ai-config exists and is valid
cat .z-ai-config
# Should contain: {"baseUrl":"http://172.25.x.x:8080/v1","apiKey":"..."}

# Check environment variables
echo $ZAI_BASE_URL
echo $ZAI_API_KEY

# Test direct connectivity to AI endpoint
curl http://172.25.136.193:8080/v1/models
```

*Debug logging:*

```bash
# Enable verbose logging
NODE_ENV=development bun run dev

# Look for these log prefixes:
# [try-on] — API route logs
# [pipeline] — Pipeline phase logs
# [zai] — ZAI SDK configuration logs
```

**[4:30 - 6:30] Issue 2: Color Mismatch**

*Screen: Side-by-side comparison of product image vs. AI result with color mismatch*

> "Color mismatch is the most common quality issue. Here's the diagnostic flow:"

1. **Check product image quality** — Is it at least 500x500 with a neutral background?
2. **Check product name** — Does it include the correct jewelry sub-type?
3. **Review VLM scores** — What's the `colorAccuracy` in the job result?
4. **Check category** — Is the correct `categorySlug` being sent?
5. **Try different strategy** — If Strategy A produces poor color, Strategy C (product-edit) may be better

*Code snippet — checking job scores:*

```bash
# Poll job status with scores
curl "http://localhost:3000/api/try-on?jobId=job_xxx"
# Look for:
#   "strategy": "dual-image-edit"
#   "colorAccuracy": 5    ← Low score indicates color issue
#   "faceAccuracy": 9
#   "totalPasses": 2       ← Refinement was attempted
```

**[6:30 - 8:30] Issue 3: Canvas Fallback Triggering Unexpectedly**

*Screen: Browser — showing canvas fallback, then fixing it*

> "If you're getting canvas overlays instead of AI-generated images, it means the AI service is unreachable. Let me walk you through the checks:"

*Local development:*
```bash
# 1. Verify ZAI config exists
ls -la .z-ai-config ~/.z-ai-config

# 2. Verify AI endpoint is reachable
curl http://172.25.136.193:8080/v1/models

# 3. Check server logs for [zai] errors
```

*Vercel deployment:*
```bash
# 1. Verify ZAI_PROXY_URL is set
npx vercel env ls production

# 2. Verify proxy is reachable
curl https://your-sandbox.space-z.ai/api/try-on/status

# 3. Check that the Abc header is being sent for .space-z.ai URLs
```

> "The health check system caches results — 30 seconds for direct AI checks, 60 seconds for proxy checks. This means if the AI service goes down, it may take up to 60 seconds for the system to detect it, and up to 60 seconds to recover after it comes back."

**[8:30 - 10:30] Issue 4: Proxy Connection Errors**

*Screen: Terminal — showing 502/504 errors and diagnostics*

> "Proxy errors on Vercel typically indicate the sandbox is down or the network path is broken."

```bash
# Check if sandbox is reachable
curl -I https://your-sandbox.space-z.ai

# Check gateway authentication
# For .space-z.ai URLs, the hostname prefix is sent as the Abc header
# Verify the prefix matches the expected sandbox identifier

# Check Vercel function logs
npx vercel logs --prod
```

*Common proxy error codes:*

| Error | Meaning | Fix |
|---|---|---|
| 502 Bad Gateway | Sandbox's Next.js not running | Restart the sandbox dev server |
| 504 Gateway Timeout | Pipeline taking too long | Check AI service health |
| 401/403 | Gateway auth failure | Verify .space-z.ai hostname prefix |

**[10:30 - 11:30] Issue 5: Face Distortion**

*Screen: Examples of face distortion with explanations*

> "Face distortion happens when Strategy C (product-edit) or Strategy D (text-to-image) produces the final result. These strategies don't preserve the user's face because they don't have the selfie as a direct image input."

*Fix:*
- Check if Strategy A (dual-image) or B (selfie-edit) is working — these preserve faces
- If only C/D are producing results, the ZAI image edit service may be partially failing
- Check server logs for `[pipeline] Strategy A failed: ...` messages

**[11:30 - 12:00] Summary & Escalation Guide**

> "Quick escalation guide: If the status API returns `unavailable` and you've verified the config → escalate to DevOps. If color accuracy is consistently below 5 → escalate with product image and VLM output. If canvas fallback triggers on Vercel but local works fine → check proxy configuration. In the next video, we'll cover systematic QA testing procedures."

### Screen Recording Instructions

- **[0:00 - 2:00]**: Dashboard-style issue overview with icons for each problem. Use color coding: red for critical, yellow for moderate
- **[2:00 - 4:30]**: Terminal commands for diagnostics. Highlight the `curl` commands and expected outputs with green/red annotations
- **[4:30 - 6:30]**: Side-by-side images showing color mismatch. Show the VLM scores in a callout box
- **[6:30 - 8:30]**: Live demo — deliberately break the config, show canvas fallback, then fix it. Show the health check caching behavior
- **[8:30 - 10:30]**: Terminal showing 502/504 errors. Walk through the diagnostic steps
- **[10:30 - 11:30]**: Examples of face distortion. Show which strategy produced each result
- **[11:30 - 12:00]**: Escalation flowchart. End card

### Key Talking Points

1. Always start troubleshooting by checking `/api/try-on/status` — it tells you the AI mode
2. Health checks are cached: 30s for direct, 60s for proxy — there's a recovery delay
3. Color mismatch → check product image quality, name, and category first
4. Canvas fallback on Vercel → check `ZAI_PROXY_URL` and proxy reachability
5. Face distortion → indicates Strategy C/D was used; check why A/B failed

### Quiz Questions / Knowledge Checks

1. **What is the first diagnostic step when the AI try-on seems stuck?**
   - Answer: Check the AI service health via `GET /api/try-on/status` — it returns the current mode (ai/proxy/unavailable) and reason.

2. **What are the cache TTLs for the health check system, and why do they matter?**
   - Answer: 30 seconds for direct AI checks, 60 seconds for proxy checks. They matter because there's a delay (up to 60s) before the system detects a service outage or recovery.

3. **When does face distortion typically occur, and which strategies avoid it?**
   - Answer: Face distortion occurs with Strategy C (product-edit) and Strategy D (text-to-image) because they don't have the selfie as a direct image input. Strategies A (dual-image) and B (selfie-edit) preserve faces because they use the selfie as a primary input.

### Resources & Links Mentioned

- Status API: `GET /api/try-on/status`
- Config API: `GET /api/config`
- Pipeline source: `src/lib/try-on-pipeline.ts` — job storage and cleanup
- ZAI SDK config: `src/lib/zai.ts` — health checks and availability
- [Technical Documentation — Error Handling & Fallback](./TECHNICAL-DOCUMENTATION.md#8-error-handling--fallback-mechanisms)

---

## Video 6: QA Testing Procedures

**Duration:** 15 minutes
**Target Audience:** QA Testers
**Prerequisites:** Videos 1 and 2 completed

### Learning Objectives

- Set up a comprehensive QA testing environment with test accounts and test images
- Execute systematic category test cases across all 8 product categories
- Verify fallback behavior under various failure conditions
- Perform cross-platform testing across local, Vercel, and Android PWA
- Measure and compare performance benchmarks against target thresholds

### Detailed Script

**[0:00 - 3:00] Test Setup**

*Screen: Test environment checklist*

> "Before testing, you need to set up your test environment. Here's what you need:"

*Test accounts and products:*
- Access to the local development environment (running `bun run dev`)
- Access to the Vercel deployment URL
- At least one product from each of the 8 categories in the catalog
- Test images covering various conditions:

| Test Image Type | Description | Why Needed |
|---|---|---|
| Good lighting selfie | Well-lit, face-forward, neutral background | Baseline quality test |
| Poor lighting selfie | Dim lighting, shadows on face | Edge case — AI may struggle |
| Side angle selfie | Face turned to the side | Edge case — face distortion risk |
| Full body selfie | Head-to-toe photo | Required for sarees/fashion categories |
| Chest-up selfie | Shoulders and above | Required for jewelry/watches |
| Low resolution selfie | Under 512px | Edge case — AI quality degrades |
| Large file selfie | Over 5MB | Test compression behavior |

*Platform checklist:*
- [ ] Local development (localhost:3000)
- [ ] Vercel deployment (production URL)
- [ ] Android PWA (installed from Vercel URL)

**[3:00 - 8:00] Category Test Cases**

*Screen: Test case spreadsheet / table*

> "For each of the 8 product categories, run through this standard test case:"

*Standard test case template:*

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| 1 | Navigate to product detail page | Product loads with Style Preview button visible | |
| 2 | Click "Style Preview" | TryOnDialog opens showing product info | |
| 3 | Upload test selfie | Selfie appears in preview step | |
| 4 | Click "Create Preview" | Progress messages appear, then result | |
| 5 | Check product placement | Product appears on correct body part | |
| 6 | Check color accuracy | Product colors match the catalog image | |
| 7 | Record AI scores | `colorAccuracy`, `faceAccuracy`, `strategy` | |
| 8 | Check suggestions | "Complete Your Look" shows 0-4 items | |
| 9 | Click "Try Again" | Dialog resets to upload step | |
| 10 | Click "Save Image" | Image downloads as PNG | |

*Category-specific checks:*

| Category | Specific Check | Expected Placement |
|---|---|---|
| Jewelry (necklace) | Product on neck | "wearing a necklace around the neck" |
| Jewelry (earring) | Product on ears | "wearing earrings on both earlobes" |
| Jewelry (set) | Both necklace and earrings | "wearing a matching jewelry set" |
| Sarees | Full drape visible | "draped in the saree... pallu over left shoulder" |
| Watches | Watch on wrist | "wearing the watch on the left wrist" |
| Fashion | Full outfit visible | "wearing the outfit" |
| Leather Goods | Product being held | "holding the leather product" |
| Fragrances | Bottle in hand | "holding the fragrance bottle" |
| Home & Living | Product in scene | "with the home decor product" |

*Score recording template:*

```
Category: jewelry (necklace)
Product: Ruby Emerald Necklace Set
Selfie: good-lighting-chest-up.jpg
Strategy: dual-image-edit
Color Accuracy: 8/10
Face Accuracy: 9/10
Total Passes: 1
Time: 35 seconds
Notes: Necklace color matches well, face preserved perfectly
```

**[8:00 - 10:00] Fallback Testing**

*Screen: Browser — demonstrate fallback scenarios*

> "Fallback testing verifies the system degrades gracefully when AI is unavailable."

*Test cases:*

| # | Scenario | How to Simulate | Expected Result |
|---|---|---|---|
| 1 | ZAI service down (local) | Stop ZAI service / invalid config | Canvas fallback with product overlay |
| 2 | Proxy down (Vercel) | Misconfigure `ZAI_PROXY_URL` | Canvas fallback after proxy timeout |
| 3 | Invalid selfie upload | Upload non-image file | Error message: "Please upload an image file" |
| 4 | Oversized selfie | Upload > 10MB image | Error message: "Image must be less than 10MB" |
| 5 | Missing product | Invalid `productId` | 404 error response |
| 6 | Job timeout | Wait for pipeline to exceed 4 min | "Failed" status with error message |
| 7 | AI generates but fails verification | All strategies produce poor results | Best available result with low scores |

**[10:00 - 12:30] Cross-Platform Testing**

*Screen: Three browser windows side-by-side — local, Vercel, PWA*

> "Cross-platform testing ensures the try-on works consistently across all platforms. Run the SAME product + SAME selfie on all three platforms and compare results."

*Comparison template:*

| Metric | Local Dev | Vercel | Android PWA |
|---|---|---|---|
| Try-on initiated? | ✅ | ✅ | ✅ |
| Result generated? | ✅ | ✅ | ✅ |
| Strategy used | dual-image-edit | dual-image-edit | dual-image-edit |
| Color accuracy | 8/10 | 8/10 | 8/10 |
| Face accuracy | 9/10 | 9/10 | 9/10 |
| Total time | 35s | 38s | 40s |
| Image quality | Same | Same | Same |
| Suggestions shown | 4 items | 4 items | 4 items |

> "The results should be identical or very close. Small timing differences (2-5 seconds) are normal due to proxy overhead. If the Vercel result shows canvas fallback while local shows AI generation, there's a proxy issue."

**[12:30 - 14:00] Performance Benchmarks**

*Screen: Performance metrics dashboard*

> "Here are the performance targets you should measure against:"

| Metric | Target | Acceptable | Failing |
|---|---|---|---|
| End-to-end try-on time | < 60s | 60-90s | > 90s |
| Canvas fallback generation | < 5s | 5-10s | > 10s |
| Job polling interval | 2s | 2-3s | > 3s |
| Max polling retries | 120 (4 min) | 120-150 | > 150 |
| Image compression | < 2s | 2-5s | > 5s |
| Dialog open/close | < 500ms | 500ms-1s | > 1s |
| Result image download | < 3s | 3-5s | > 5s |

**[14:00 - 15:00] Summary & Test Report Template**

> "When you complete testing, create a test report with:"

1. Test environment details (platform, browser, date)
2. Category test results with scores
3. Fallback test results
4. Cross-platform comparison table
5. Performance benchmark measurements
6. Any bugs or issues found
7. Screenshots of failures

### Screen Recording Instructions

- **[0:00 - 3:00]**: Show the test setup checklist. Display test images with annotations. Show the platform checklist
- **[3:00 - 8:00]**: Walk through a complete test case for jewelry (necklace). Show each step in the browser. Highlight the accuracy scores and strategy label
- **[8:00 - 10:00]**: Deliberately break the config to trigger canvas fallback. Show the fallback result. Fix the config and retry
- **[10:00 - 12:30]**: Three browser windows side-by-side. Run the same try-on on all three. Show timing differences
- **[12:30 - 14:00]**: Performance benchmarks displayed as a table. Show how to measure timing using browser DevTools Network tab
- **[14:00 - 15:00]**: Test report template. End card

### Key Talking Points

1. Always test with multiple selfie types — good lighting, poor lighting, different angles
2. Category-specific placement checks are critical — a necklace on the wrist is a failure
3. Cross-platform results should be nearly identical; differences indicate proxy issues
4. Canvas fallback must be tested explicitly — it's the safety net for production
5. Record all scores in a structured format for regression comparison

### Quiz Questions / Knowledge Checks

1. **What are the 3 specific checks you must verify for the jewelry "set" sub-type?**
   - Answer: (1) Both necklace and earrings appear in the result, (2) Necklace is placed around the neck, (3) Earrings appear on both earlobes.

2. **What performance threshold indicates a failing end-to-end try-on time?**
   - Answer: > 90 seconds is failing. Target is < 60 seconds, acceptable is 60-90 seconds.

3. **How do you simulate a proxy failure on Vercel for fallback testing?**
   - Answer: Misconfigure the `ZAI_PROXY_URL` environment variable (e.g., set it to an invalid URL), then trigger a try-on. The system should fall back to canvas overlay mode.

### Resources & Links Mentioned

- [Functional Documentation — User Journey](./FUNCTIONAL-DOCUMENTATION.md#2-user-journey-step-by-step)
- [Technical Documentation — Error Handling](./TECHNICAL-DOCUMENTATION.md#8-error-handling--fallback-mechanisms)
- Status API: `GET /api/try-on/status`
- Job polling API: `GET /api/try-on?jobId=<id>`

---

## Video 7: Code Architecture Deep Dive

**Duration:** 25 minutes
**Target Audience:** Senior Developers
**Prerequisites:** Videos 1 and 2 completed

### Learning Objectives

- Read and understand the 4 core source files line-by-line
- Trace the complete data flow from user click to delivered result
- Understand the type system and data structures used throughout the pipeline
- Identify extension points for adding new features
- Debug production issues by reading source code

### Detailed Script

**[0:00 - 2:00] Architecture Recap & File Map**

*Screen: File map with line counts and responsibilities*

> "In this deep dive, we'll walk through the 4 core source files line-by-line. These files contain all the logic for the AI Virtual Try-On feature."

| File | Lines | Responsibility |
|---|---|---|
| `try-on-pipeline.ts` | 763 | Core AI pipeline — job management, VLM helpers, generation helpers, pipeline orchestration |
| `route.ts` | 536 | API endpoint — request handling, product resolution, proxy forwarding |
| `zai.ts` | 261 | ZAI SDK configuration, health checks, availability detection |
| `product-detail.tsx` | 1769 | Frontend UI — TryOnDialog, ProductDetail, canvas fallback, image compression |

> "We'll start with the foundational layer (zai.ts), move up through the pipeline (try-on-pipeline.ts), then the API (route.ts), and finally the frontend (product-detail.tsx)."

**[2:00 - 6:00] File 1: zai.ts — ZAI SDK Configuration**

*Screen: Code editor — zai.ts, zoomed to 150%*

> "Let's start with `zai.ts` — the bridge between our application and the AI service. This file handles configuration resolution, health checks, and SDK instance creation."

*Section 1: Gateway Authentication (lines 16-26)*

```typescript
// For .space-z.ai URLs, extract hostname prefix for gateway auth
// The hostname prefix is sent as the 'Abc' header
// e.g., "c-abc123-def456-ghi789" from "c-abc123-def456-ghi789.space-z.ai"
```

> "When the proxy URL uses the `.space-z.ai` domain, the system extracts the hostname prefix and sends it as the `Abc` header for gateway authentication. This is critical for Vercel deployments where the gateway needs to identify which sandbox to route to."

*Section 2: Health Check System (lines 30-120)*

```typescript
// Two cached health checks:
// 1. isAIReachable(baseUrl) — 30 second cache, checks /dashboard/ or /api/try-on/status
// 2. isProxyReachable(proxyUrl) — 60 second cache, checks <proxyUrl>/api/try-on/status

// Internal IP detection:
// URLs containing 172.25., 192.168., 10., localhost, 127.0.0.1
// → Checked against /dashboard/ (internal health endpoint)
// External URLs → Checked against /api/try-on/status
```

> "The health check system uses in-memory caching to avoid hammering the AI service. The 30-second cache for direct checks and 60-second cache for proxy checks mean there's a brief window where the system might not detect an outage immediately."

*Section 3: Configuration Resolution — `getZAIConfig()` (lines 125-180)*

```typescript
// Priority order:
// 1. Environment variables: ZAI_BASE_URL + ZAI_API_KEY (+ optional ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID)
// 2. Config file — project directory: <cwd>/.z-ai-config
// 3. Config file — home directory: ~/.z-ai-config
// 4. Config file — system: /etc/.z-ai-config
//
// On Vercel: Only environment variables are checked (no filesystem access)
```

*Section 4: Availability Check — `isZAIAvailable()` (lines 185-230)*

```typescript
// Returns: { available: boolean, mode: 'ai' | 'proxy' | 'unavailable', reason?: string }
//
// Decision tree:
// 1. No config → Check for proxy → proxy reachable? { available: true, mode: 'proxy' } : { available: false }
// 2. Config found → Direct reachable? { available: true, mode: 'ai' }
// 3. Config found but unreachable → Proxy reachable? { available: true, mode: 'proxy' }
// 4. Both unreachable → { available: false, mode: 'unavailable' }
```

> "This decision tree is what powers the three-tier Vercel strategy. The API route calls `isZAIAvailable()` to determine whether to use the proxy, direct SDK, or canvas fallback."

**[6:00 - 14:00] File 2: try-on-pipeline.ts — Core AI Pipeline**

*Screen: Code editor — try-on-pipeline.ts, zoomed to 150%*

> "Now let's dive into the pipeline itself — the 763-line brain of the system."

*Section 1: Type Definitions (lines 1-50)*

```typescript
type ImageSize = '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440'

export interface TryOnJob {
  status: 'processing' | 'completed' | 'failed'
  imageUrl?: string           // Base64 data URL of final result
  productName?: string
  categorySlug?: string
  error?: string
  createdAt: number           // Timestamp for TTL cleanup
  progress?: string           // Current progress message
  suggestions?: any[]         // Paired product suggestions
  pipelinePhase?: string      // 'product-analysis' | 'generation' | 'verification' | 'refinement' | 'watermark' | 'complete'
  colorAccuracy?: number      // VLM-verified score (0-10)
  faceAccuracy?: number       // VLM-verified score (0-10)
  strategy?: string           // e.g., 'dual-image-edit', 'edit-selfie-refined'
  totalPasses?: number        // 1 or 2 (if refinement was applied)
}
```

> "The `TryOnJob` interface is the central data structure. Every field is optional except `status` and `createdAt`, because the job is progressively populated as the pipeline runs. The `pipelinePhase` field is particularly useful for progress reporting to the client."

*Section 2: Job Storage System (lines 52-95)*

```typescript
const jobs = new Map<string, TryOnJob>()

// 15-minute TTL with 5-minute cleanup interval
setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 15 * 60 * 1000) {
      jobs.delete(id)
    }
  }
}, 5 * 60 * 1000)

// Job lifecycle functions:
export function createJob(id: string, data: Partial<TryOnJob>): void
export function getJob(id: string): TryOnJob | undefined
export function deleteJob(id: string): void
```

> "The in-memory Map is sufficient because the system runs on a single server instance. The 15-minute TTL prevents memory leaks from abandoned jobs. Note that on Vercel, jobs live on the sandbox, not the serverless function, so this in-memory store persists correctly."

*Section 3: VLM Helper Functions (lines 184-230)*

```typescript
// vlmAnalyze(prompt, imageUrl, timeoutMs = 30000)
// - Single-image VLM analysis using glm-4v-plus
// - Promise.race() with timeout to prevent hanging
// - thinking: { type: 'disabled' } for faster responses
// - Returns text response or empty string on failure

// vlmCompare(prompt, image1Url, image2Url, timeoutMs = 45000)
// - Dual-image VLM comparison
// - Same structure but accepts TWO images and has longer timeout
// - Used for verification (Phase 3) and refinement verification (Phase 4)
```

> "Both functions have graceful error handling — they return empty strings on failure. This allows the pipeline to continue with degraded information rather than crashing. The `thinking: { type: 'disabled' }` option is important — it disables chain-of-thought reasoning in the VLM for faster responses."

*Section 4: Image Generation Helpers (lines 233-302)*

```typescript
// safeImageEdit(prompt, imageUrl, size)
// → zai.images.generations.edit({ images: [{ url: imageUrl }] })
// → Returns base64 data URL or null on failure

// safeImageEditDual(prompt, selfieUrl, productUrl, size)  ← KEY INNOVATION
// → zai.images.generations.edit({ images: [{ url: selfieUrl }, { url: productUrl }] })
// → Passes BOTH selfie + product to the AI
// → Returns base64 data URL or null on failure

// safeImageCreate(prompt, size)
// → zai.images.generations.create({ prompt, size })
// → Text-to-image, no input images
// → Returns base64 data URL or null on failure
```

> "The `safeImageEditDual` function is the implementation of our key patent innovation — the dual-image edit strategy. By passing both images in the `images` array, the AI model can directly observe the product's actual colors. Note the `as any` type assertion — the SDK's TypeScript definitions don't fully support the `images` array parameter yet."

*Section 5: Parsing Helpers (lines 351-432)*

```typescript
// parseProductAnalysis(raw) → ProductInfo
// Extracts: type, mainColor (with hex), secondaryColor, metalColor, materials[], keyDetails[]
// Builds colorSummary: "MAIN: deep maroon red #8B1A1A. ACCENT: gold zari #CFB53B. METAL: warm yellow gold #DAA520"

// parseVerification(raw) → VerificationResult
// Extracts numeric scores (clamped 0-10, defaulting to 5 if parsing fails)
// Pass criteria: explicit VERDICT: PASS OR (colorScore >= 7 AND overallScore >= 6)
```

> "The parsing functions are defensive — they handle malformed VLM output by defaulting to safe values. If the VLM returns something unexpected, scores default to 5 (middle of range) rather than crashing. The dual pass criteria for verification ensures quality even when the VLM doesn't output an explicit verdict."

*Section 6: The Pipeline — `runPipeline()` (lines 440-700+)*

> "The main pipeline function ties everything together. Let me trace the execution flow:"

```
1. Update job progress → "Analyzing product..."
2. Run Phase 1a + 1b in parallel (product analysis + person description)
3. Parse product analysis → ProductInfo
4. Update progress → "Creating your virtual try-on..."
5. Phase 2: Try strategies A, B, C, D in order
   - Each strategy updates progress with its attempt
   - Results are collected in a candidates array
6. Phase 3: Verify each candidate with vlmCompare()
   - Track best result by overallScore
   - Early stop if colorScore >= 8
7. Phase 4: If best colorScore < 7 → Refinement pass
   - Build correction prompt from ISSUE description
   - Re-edit and re-verify
   - Use refinement only if it scores higher
8. Update job with final scores and strategy
9. Phase 5: Apply watermark via Sharp
10. Update job status → 'completed'
```

**[14:00 - 19:00] File 3: route.ts — API Endpoint**

*Screen: Code editor — route.ts, zoomed to 150%*

> "Now let's look at the API route that ties the frontend to the pipeline."

*Section 1: Product Image Resolution — `getProductImageBase64()` (lines 45-100)*

```typescript
// Four image source types:
// 1. External HTTP(S) URL → Direct fetch with AbortSignal.timeout(15000)
// 2. Protocol-relative URL → Prepend https: and fetch
// 3. Image proxy URL → Extract original URL, fetch directly; fallback through own server
// 4. Local path → HTTP fetch via NEXT_PUBLIC_BASE_URL; fallback to fs.readFileSync on non-Vercel
```

> "The filesystem fallback is critical for local sandbox environments where HTTP self-requests may not work reliably. On Vercel, there's no filesystem access, so only the HTTP methods are available."

*Section 2: POST Handler — Three-Tier Strategy (lines 165-265)*

```typescript
// On Vercel:
//   Tier 1: Proxy → Forward to sandbox's /api/try-on
//   Tier 2: Direct SDK → If ZAI_BASE_URL + ZAI_API_KEY configured
//   Tier 3: Canvas Fallback → Return { mode: 'canvas', code: 'AI_CANVAS_MODE' }

// On non-Vercel (local sandbox):
//   → handleLocalAIGeneration() directly
```

*Section 3: `handleLocalAIGeneration()` (lines 298-482)*

> "This is the core server-side handler. It: (1) Checks AI availability, (2) Falls back to canvas if unavailable, (3) Resolves product info from 3 sources in order — Database (Prisma), Client-provided, or Shopify API, (4) Resolves product image to base64, (5) Fetches pairing suggestions, (6) Creates a job with `job_<timestamp>_<random>` ID, (7) Starts the pipeline async, (8) Returns `{ jobId, status: 'processing' }` immediately."

*Category pairing logic:*

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

*Section 4: GET Handler — Job Polling (lines 486-535)*

```typescript
// GET /api/try-on?jobId=<id>
// Returns complete job state including imageUrl, scores, suggestions
// If job not found locally → Attempt proxy to sandbox (for Vercel)
```

**[19:00 - 24:00] File 4: product-detail.tsx — Frontend UI**

*Screen: Code editor — product-detail.tsx, zoomed to 150%*

> "The frontend is the largest file at 1769 lines. Let me walk through the key sections."

*Section 1: Image Compression — `compressImage()` (lines 96-128)*

```typescript
async function compressImage(file: File, maxSize = 1536, quality = 0.92): Promise<string> {
  // 1. Read file as Data URL
  // 2. Load into HTMLImageElement
  // 3. Scale down if > maxSize (maintain aspect ratio)
  // 4. Draw onto canvas at new dimensions
  // 5. imageSmoothingEnabled = true, imageSmoothingQuality = 'high'
  // 6. Export as JPEG with quality 0.92
  // 7. Return base64 data URL
}
```

*Section 2: Canvas Fallback — `generateCanvasFallback()` (lines 140-343)*

```typescript
// Client-side composite generation when AI is unavailable:
// 1. Base layer: User's selfie at full canvas size
// 2. Vignette overlay: Radial gradient (0% → 30% opacity)
// 3. Product panel (bottom-right): Dark panel, gold border, product thumbnail
// 4. "STYLE PREVIEW" badge (top-left)
// 5. "3BOXES GIFTS · AI Style Preview" footer
//
// Product image loading strategy:
// - Prefer base64 data URL (no CORS)
// - Route external URLs through /api/image-proxy
// - Fall back to same-origin for relative paths
// - 5-second timeout — continue without product image if it fails
//
// Selfie failure fallback (lines 307-338):
// If even the selfie fails → Minimal dark gradient canvas with text
```

*Section 3: TryOnDialog Component (lines 384-1093)*

> "The TryOnDialog is a 4-step state machine. Let me trace the state transitions:"

```
'upload' → (file selected) → 'preview' → (click Create Preview) → 'generating' → (job completes) → 'result'
   ↑                                                          ↓
   └────────────────── (click Try Again) ─────────────────────┘
```

*Key state variables:*

```typescript
const [step, setStep] = useState<'upload' | 'preview' | 'generating' | 'result'>('upload')
const [selfieFile, setSelfieFile] = useState<File | null>(null)
const [selfieData, setSelfieData] = useState<string>('')
const [progressMessage, setProgressMessage] = useState('')
const [resultImage, setResultImage] = useState<string>('')
const [strategy, setStrategy] = useState<string>('')
const [colorAccuracy, setColorAccuracy] = useState<number>(0)
const [faceAccuracy, setFaceAccuracy] = useState<number>(0)
const [suggestions, setSuggestions] = useState<any[]>([])
```

*Section 4: Generation Flow — `handleGenerate()` (lines 470-709)*

> "This is the most complex function in the frontend. It handles multiple paths:"

```
1. Pre-fetch product image as base64 (client-side)
2. POST to /api/try-on
3. If server returns { mode: 'canvas' }:
   a. Try direct client-to-proxy call
   b. If proxy succeeds → poll proxy for results
   c. If proxy fails → generateCanvasFallback()
4. Normal flow → poll /api/try-on?jobId=<id> (120 retries / 2s)
5. Error fallback → attempt canvas fallback before showing error
```

> "The floating pill component handles background jobs — when the user closes the dialog during generation, a pill appears at the bottom of the screen showing 'Creating preview...' (while generating) or 'Style Preview Ready! Click to view' (when complete)."

*Section 5: Result Display (lines 952-1088)*

> "The result step shows: the AI-generated image, accuracy scores, strategy label with human-readable mapping, product reference card, 3BOXES GIFTS info card, AI style suggestions, and action buttons."

*Strategy label mapping:*

```typescript
const strategyLabels: Record<string, string> = {
  'dual-image-edit': 'Dual-Image Edit',
  'edit-selfie': 'Selfie-Edit + Verify',
  'edit-selfie-refined': 'Selfie-Edit + Refined',
  'edit-product': 'Product-Edit + Verify',
  'edit-product-refined': 'Product-Edit + Refined',
  'create-text': 'AI Generate',
  'canvas-overlay': 'Style Overlay'
}
```

**[24:00 - 25:00] Extension Points Summary**

> "Here are the key extension points in the codebase:"

| Where | What | How to Extend |
|---|---|---|
| `CATEGORY_CONFIG` in pipeline | Add new product categories | Add new entry with placement, size, colorFocus, bodyType, useProductEdit |
| `runPipeline()` in pipeline | Add new generation strategies | Add Strategy E before Strategy D |
| `getProductImageBase64()` in route | Support new image sources | Add new URL pattern handling |
| `generateCanvasFallback()` in frontend | Customize fallback appearance | Modify canvas drawing code |
| `watermark.ts` | Change watermark design | Modify SVG template or logo compositing |

### Screen Recording Instructions

- **[0:00 - 2:00]**: File map with line counts. Use amber highlights for the 4 files
- **[2:00 - 6:00]**: Code editor showing zai.ts. Walk through each section with scroll and zoom. Use callout annotations for key decisions (caching, priority order, gateway auth)
- **[6:00 - 14:00]**: Code editor showing try-on-pipeline.ts. This is the longest section — take time to show the type definitions, the dual-image edit function, and the pipeline flow. Use animated arrows to trace the data flow
- **[14:00 - 19:00]**: Code editor showing route.ts. Show the three-tier POST handler strategy with a flow diagram overlay. Walk through product image resolution
- **[19:00 - 24:00]**: Code editor showing product-detail.tsx. Focus on compressImage, generateCanvasFallback, TryOnDialog states, and handleGenerate flow. Use state machine diagram
- **[24:00 - 25:00]**: Extension points table. End card

### Key Talking Points

1. The `TryOnJob` interface is progressively populated — fields are optional because the job state evolves as the pipeline runs
2. `safeImageEditDual` is the key innovation — passing both images in the `images` array
3. Parsing functions are defensive — they handle malformed VLM output gracefully
4. The frontend `handleGenerate()` has the most complex control flow — 5 different paths depending on AI availability
5. Extension points are clearly identifiable in each file — CATEGORY_CONFIG, generation strategies, image sources, canvas fallback, watermark

### Quiz Questions / Knowledge Checks

1. **What is the TTL for the in-memory job store, and how often does cleanup run?**
   - Answer: 15-minute TTL, cleanup runs every 5 minutes. This means a job can survive up to 20 minutes (15 min TTL + 5 min interval).

2. **Why does `safeImageEditDual` use `as any` type assertion?**
   - Answer: The ZAI SDK's TypeScript definitions don't fully support the `images` array parameter yet. The `as any` assertion bypasses the type checker to allow passing multiple images.

3. **What are the three sources for resolving product information in `handleLocalAIGeneration()`, and in what order?**
   - Answer: (1) Database (Prisma) — `db.product.findUnique()`, (2) Client-provided — `clientProductName` + `clientCategorySlug`, (3) Shopify API — `fetchShopifyProducts()` fallback.

### Resources & Links Mentioned

- `src/lib/try-on-pipeline.ts` (763 lines)
- `src/app/api/try-on/route.ts` (536 lines)
- `src/lib/zai.ts` (261 lines)
- `src/components/product-detail.tsx` (1769 lines)
- `src/lib/watermark.ts` (153 lines)
- [Technical Documentation — Complete Code Walkthrough](./TECHNICAL-DOCUMENTATION.md#13-code-walkthrough-with-line-by-line-explanations)

---

## Video 8: Patent Overview & Filing Guide

**Duration:** 20 minutes
**Target Audience:** Legal, Founders
**Prerequisites:** None (background context helpful from Videos 1-2)

### Learning Objectives

- Understand the 10 novel features that make the AI Virtual Try-On system patentable
- Review the 13 prior art patents identified in the landscape research
- Understand the patent gap analysis and why the system is novel
- Navigate the patent filing process for India (IPO), US (USPTO), and PCT
- Understand the key patent claims and dependent claims strategy

### Detailed Script

**[0:00 - 3:00] What Makes Our System Patentable**

*Screen: Patent innovation summary with 10 novel features*

> "Our AI Virtual Try-On system contains 10 novel features that are not found in existing patents. Let me walk through each one and explain why it's patentable."

*10 Novel Features:*

| # | Feature | Why Novel |
|---|---|---|
| 1 | Multi-Strategy Pipeline with VLM Verification | No existing patent uses VLM to independently verify and score virtual try-on results |
| 2 | Dual-Image Edit with Product Color Fidelity | No patent passes both selfie + product images to AI for color-accurate generation |
| 3 | Category-Aware Prompt Engineering Including Non-Wearable Categories | No patent dynamically adjusts prompts by product category with sub-type detection |
| 4 | Color Accuracy Refinement Loop | No patent discloses iterative refinement when VLM verification finds color mismatch |
| 5 | Hex-Code-Based Color Extraction | No patent uses VLM-extracted hex codes for precise color matching in prompts |
| 6 | Non-Wearable Luxury Presentation Item Visualization | No patent covers virtual try-on for gift boxes, gift packaging, or presentation cases |
| 7 | Luxury E-Commerce Integration | No patent integrates multi-strategy VTO with Shopify + affiliate platforms |
| 8 | Cross-Platform Deployment with Proxy Architecture | No patent addresses Vercel serverless proxy routing for AI services |
| 9 | Canvas Overlay Fallback | No patent discloses client-side canvas compositing as degradation strategy |
| 10 | Automatic Watermarking | No patent covers server-side Sharp-based watermarking for VTO images |

> "Feature 6 is particularly significant. We've identified a clear white space in the patent landscape — no patent anywhere covers virtual visualization of non-wearable luxury presentation items like gift boxes."

**[3:00 - 8:00] The 13 Prior Art Patents**

*Screen: Patent landscape table with risk assessment*

> "Our patent research identified 13 relevant patents in the virtual try-on space. Let me categorize them by assignee and risk level."

*Apparel Virtual Try-On Patents:*

| # | Patent | Assignee | Title | Risk Level |
|---|--------|----------|-------|------------|
| 1 | US 11,830,118 | Snap Inc. | Virtual Clothing Try-On | LOW — wearable garment overlay |
| 2 | US 2019/0130649 A1 | Snap Inc. | Clothing Model Generation | VERY LOW — 3D garment modeling |
| 3 | US 11,315,162 | Amazon | Blended Reality Systems | LOW — AR body overlay with depth |
| 4 | US 11,580,592 B2 | Amazon | Customized Virtual Store | MEDIUM — e-commerce VTO pipeline |
| 5 | US 11,158,121 B1 | Google | Generating Clothing for Body Pose | LOW-MEDIUM — conditional generation |
| 6 | US 8,275,590 | Zugara | Virtual-Wearable Items in Video Feed | LOW — "wearable" limitation |
| 7 | US 10,482,517 B2 | Zugara | Real-Time AR Overlays for VTO | LOW — real-time AR calibration |
| 8 | US 2022/0318892 A1 | Alibaba | Clothing VTO Based on Deep Learning | VERY LOW — GAN garment fitting |
| 9 | US 12,017,142 B2 | Fit Analytics/Snap | Real-Time Calibration of VTO | VERY LOW — body measurement |
| 10 | US 2020/0183969 A1 | Zeekit/Walmart | Virtual Dressing Utilizing Image Processing | LOW — image processing |
| 11 | US 11,922,550 B1 | Google | Hierarchical Text-Driven VTO | MEDIUM — diffusion model generation |

*Jewelry Virtual Try-On Patents:*

| # | Patent | Assignee | Title | Risk Level |
|---|--------|----------|-------|------------|
| 12 | US 10,810,647 B2 | James Avery | Hybrid Virtual and Physical Jewelry Shopping | LOW — jewelry AR body-part overlay |
| 13 | US 2021/0049830 A1 | Essilor | Virtual Try-On for Spectacles | VERY LOW — eyewear face overlay |

> "The key takeaway is that ALL 13 patents are directed to wearable items — clothing, jewelry, eyewear, or makeup. None covers non-wearable items like gift boxes. And none uses our combination of multi-strategy generation + VLM verification + color refinement."

**[8:00 - 12:00] Gap Analysis & White Space**

*Screen: White space diagram — what exists vs. what doesn't*

> "The gap analysis reveals a clear and substantial opportunity. Here's what EXISTS in the patent landscape:"

*What EXISTS:*
- Virtual clothing try-on on body (Snap, Google, Amazon, Alibaba)
- AR overlay of wearable items in real-time video (Zugara)
- 3D garment model generation (Snap)
- Diffusion-model text-driven garment generation (Google)
- Virtual jewelry try-on via AR (James Avery)
- E-commerce integration with VTO (Amazon)

*What does NOT EXIST (WHITE SPACE):*
- Virtual try-on for gift boxes — **NOT PATENTED**
- AI generation of non-wearable luxury items in user photos — **NOT PATENTED**
- Virtual preview of curated gift assortments — **NOT PATENTED**
- Diffusion-model-based gift packaging visualization — **NOT PATENTED**
- Gift presentation item compositing onto user photographs — **NOT PATENTED**
- Non-wearable luxury product scene composition via AI — **NOT PATENTED**

> "This is our opportunity. The intersection of AI image generation + non-wearable luxury items + user photograph compositing is completely unclaimed."

**[12:00 - 16:00] Filing Process**

*Screen: Filing process flowchart with costs and timelines*

*India (IPO):*

| Step | Timeline | Cost |
|---|---|---|
| Patentability search | Already done | Included in docs |
| Draft patent specification | 2-4 weeks | ₹20,000-50,000 (attorney fees) |
| File provisional application | Day of filing | ₹4,000-8,000 (filing fees) |
| File complete specification | Within 12 months | Additional attorney fees |
| Publication | 18 months from filing | No additional cost |
| Examination & hearing | 2-4 years | ₹10,000-25,000 |
| Grant | 3-5 years total | — |

*US (USPTO):*

| Step | Timeline | Cost |
|---|---|---|
| File provisional application | Day of filing | $300-800 (micro entity) |
| File non-provisional | Within 12 months | $700-2,000 |
| Examination | 1-2 years | — |
| Grant | 2-3 years total | — |

*PCT (International):*

| Step | Timeline | Cost |
|---|---|---|
| File PCT application | Within 12 months of priority | ~$4,000 |
| International search report | 3-6 months | Included |
| National phase entry | By 30-month deadline | Per-country fees |

> "My recommendation: File a provisional patent in India first to establish priority. This protects us for 12 months. Then file the complete specification and consider PCT for international protection."

**[16:00 - 18:30] Key Claims Overview**

*Screen: Claims structure diagram*

> "Our patent application includes 30 claims organized as follows:"

*Independent Claims:*

| Claim | What It Covers |
|---|---|
| Claim 1 | Multi-strategy pipeline with VLM verification — the core system |
| Claim 2 | Dual-image edit for product color fidelity — passing both selfie + product |
| Claim 3 | Color accuracy refinement with hex-code extraction — the refinement loop |
| Claim 4 | Category-aware prompt engineering — dynamic prompt adjustment by category |

*Dependent Claims (5-30):*

| Claims | What They Cover |
|---|---|
| 5-8 | Jewelry sub-type detection (earring, necklace, bracelet, ring, set) |
| 9-12 | Non-wearable luxury item visualization (gift boxes, packaging) |
| 13-16 | Hex-code color extraction and colorSummary construction |
| 17-20 | Cross-platform proxy architecture and canvas fallback |
| 21-24 | Automatic watermarking with Sharp |
| 25-28 | E-commerce integration (Shopify, pairing suggestions) |
| 29-30 | PWA deployment and mobile optimization |

**[18:30 - 20:00] Next Steps & Recommendations**

> "Here are the recommended next steps:"

1. **Immediately**: Engage a patent attorney with experience in AI/software patents
2. **Within 2 weeks**: Review and finalize the patent specification draft
3. **Within 1 month**: File the provisional patent application in India
4. **Within 12 months**: File the complete specification and consider PCT
5. **Ongoing**: Monitor the Zugara vs. Chanel case (filed July 2024, W.D. Texas) for precedent impact

*Important: Monitor active litigation by Zugara against Chanel (filed July 2024). This case could establish precedent that broadens the scope of virtual try-on patents. Our system's focus on non-wearable items provides clear differentiation, but this case must be watched closely.*

### Screen Recording Instructions

- **[0:00 - 3:00]**: Title card with patent icon. Show the 10 features as a numbered list with icons. Highlight Feature 6 (non-wearable) with a gold star annotation
- **[3:00 - 8:00]**: Patent landscape table. Color-code by risk level: green (LOW/VERY LOW), yellow (MEDIUM). Show the assignee logos
- **[8:00 - 12:00]**: White space diagram. Show "What EXISTS" in gray and "What does NOT EXIST" in gold/amber. Emphasize the gap
- **[12:00 - 16:00]**: Filing process flowchart with cost annotations. Show India, US, and PCT timelines side-by-side
- **[16:00 - 18:30]**: Claims structure as a tree diagram. Independent claims at the top, dependent claims branching below
- **[18:30 - 20:00]**: Next steps checklist. End card with "Contact patent attorney" call-to-action

### Key Talking Points

1. Feature 6 (non-wearable luxury items) is the strongest differentiator — zero prior art exists
2. All 13 identified patents are directed to wearable items — our gift box visualization is completely novel
3. The Zugara vs. Chanel case must be monitored — it could broaden VTO patent scope
4. File provisional in India first for cost efficiency and 12-month priority protection
5. The 30-claim structure covers all 10 novel features with dependent claims for specific implementations

### Quiz Questions / Knowledge Checks

1. **What is the key finding from the patent landscape research regarding non-wearable luxury items?**
   - Answer: Zero patents exist covering virtual try-on for gift boxes, gift packaging, or non-wearable luxury presentation items. This is a clear white space in the patent landscape.

2. **Which two patents are rated MEDIUM risk, and why?**
   - Answer: US 11,580,592 (Amazon — e-commerce VTO pipeline, structural similarity in purchase flow) and US 11,922,550 (Google — diffusion model product generation, most technically similar patent).

3. **Why is the Zugara vs. Chanel case important to monitor?**
   - Answer: Chanel is a luxury brand with both wearable and non-wearable products. If the court interprets VTO patents broadly to cover luxury product visualization beyond wearable items, it could increase risk for our system.

### Resources & Links Mentioned

- [Patent Research Report](../patent/PATENT-RESEARCH.md) — Full landscape analysis
- [Patent Application Draft](../patent/PATENT-APPLICATION.md) — Draft specification with 30 claims
- [Technical Documentation](./TECHNICAL-DOCUMENTATION.md) — Complete code-level documentation for patent reference
- [HOME.md](./HOME.md) — Patent status summary

---

## Video 9: Training Content Managers

**Duration:** 10 minutes
**Target Audience:** Content Managers (non-technical staff)
**Prerequisites:** None

### Learning Objectives

- Understand the AI Virtual Try-On feature from a non-technical perspective
- Know which products work best with virtual try-on and why
- Apply product naming best practices to improve AI output quality
- Upload and manage product images that produce optimal AI results
- Handle common issues and know when to escalate

### Detailed Script

**[0:00 - 2:00] What Is AI Virtual Try-On?**

*Screen: Simple diagram showing User + Product = Try-On Result*

> "The AI Virtual Try-On — also called 'Style Preview' in our app — lets customers see how a product looks on them before buying. When a customer uploads a selfie, our AI generates a photorealistic image of them wearing or holding the product. This increases customer confidence, reduces returns, and makes the shopping experience more engaging."

*Key talking points:*
- Think of it as a virtual mirror — the customer sees themselves with the product
- It works for jewelry, sarees, watches, fashion, leather goods, fragrances, and home & living
- The AI generates the image in about 30-60 seconds
- If the AI is unavailable, the system shows a style overlay instead

**[2:00 - 4:00] Which Products Work Best**

*Screen: Category comparison with quality ratings*

> "Not all products produce equally good results. Here's how each category performs:"

| Category | AI Quality | Tips for Best Results |
|---|---|---|
| 🟢 Jewelry | Excellent | Name the sub-type (necklace, earring, bracelet, ring, set) |
| 🟢 Watches | Very Good | Clear dial photo, accurate strap color |
| 🟡 Sarees | Good | Full drape image, correct color name |
| 🟡 Fashion | Good | Full outfit photo, clear pattern details |
| 🟡 Men's Shirts | Good | Clear fabric color and pattern |
| 🟢 Leather Goods | Very Good | Show leather grain and hardware clearly |
| 🟡 Fragrances | Moderate | Clear bottle shape and liquid color |
| 🟡 Home & Living | Moderate | Product in a lifestyle setting helps |

> "Jewelry and watches produce the best results because the AI can clearly see the product colors and place them precisely. Sarees and fashion are good but more complex — the AI has to render the full outfit, which is harder."

**[4:00 - 6:30] Product Naming Best Practices**

*Screen: Before/After examples with product names*

> "The product name is CRITICAL for jewelry. Our AI reads the name to decide where to place the product. If you name a necklace 'Diamond Jewelry', the AI doesn't know it's a necklace and might place it incorrectly."

*The golden rule: Always include the specific sub-type in the product name.*

| ❌ Don't Name It | ✅ Do Name It | Where AI Places It |
|---|---|---|
| "Gold Jewelry" | "Gold Temple Necklace" | Around the neck |
| "Pearl Set" | "Pearl Jhumka Earrings" | On the earlobes |
| "Ruby Accessories" | "Ruby Bridal Set" | Necklace on neck + earrings on ears |
| "Diamond Item" | "Diamond Kada Bracelet" | On the wrist |
| "Emerald Product" | "Emerald Solitaire Ring" | On the finger |

*Magic keywords the AI recognizes:*
- **Earrings**: earring, jhumka, stud
- **Necklace**: necklace, choker, pendant, temple, haar, mala
- **Bracelet**: bracelet, cuff, bangle, kada
- **Ring**: ring
- **Full set**: set, bridal

**[6:30 - 8:30] Product Image Best Practices**

*Screen: Side-by-side good vs. bad product images*

> "The product image is what the AI uses as a color reference. If the image has wrong colors, the AI will produce wrong colors in the result. Here are the guidelines:"

*✅ DO:*
- Use high-resolution images (at least 500x500 pixels)
- Use white or neutral backgrounds
- Show the product clearly without props or models
- Ensure the photo color matches the real product color
- For sarees: show the full drape with pallu visible
- For jewelry: show the piece against a dark background for contrast

*❌ DON'T:*
- Use images with colored backgrounds (contaminates color extraction)
- Use blurry or low-resolution images
- Include multiple products in one image
- Use heavy shadows or reflections
- Use images where the product color looks different from reality

**[8:30 - 9:30] Common Issues & When to Escalate**

*Screen: Issue/escalation matrix*

| Issue | Try This First | Escalate If... |
|---|---|---|
| Product placed on wrong body part | Check product name for sub-type keyword | Still wrong after name fix |
| Wrong product color in result | Check product image quality and accuracy | Still wrong with good image |
| Poor quality result | Check selfie quality and category | Consistently poor for multiple users |
| Canvas overlay instead of AI image | Normal when AI is temporarily down | Persists for more than 10 minutes |
| No suggestions shown | Check product has a valid category | Consistently missing for a category |

> "For most issues, the fix is in the product data — the name and the image. If you've verified both and still have problems, escalate to the development team with the product name, category, and a screenshot of the result."

**[9:30 - 10:00] Summary**

> "Three key takeaways: First, name your jewelry products with specific sub-types — necklace, earring, bracelet, ring, or set. Second, use high-quality product images with neutral backgrounds and accurate colors. Third, when results aren't right, check the name and image first before escalating."

### Screen Recording Instructions

- **[0:00 - 2:00]**: Simple, non-technical diagram. Use large icons and minimal text. Avoid code or technical jargon
- **[2:00 - 4:00]**: Category comparison with color-coded quality ratings (green/yellow). Use product category icons
- **[4:00 - 6:30]**: Before/after product name examples. Use large, clear text with green checkmarks and red X marks
- **[6:30 - 8:30]**: Side-by-side product images — good vs. bad. Use simple annotations with ✅ and ❌
- **[8:30 - 9:30]**: Issue/escalation table. Use a friendly, non-technical tone
- **[9:30 - 10:00]**: Summary card with 3 key takeaways as large icons

### Key Talking Points

1. Product name = placement accuracy for jewelry — include the sub-type keyword
2. Product image = color accuracy — use high-quality, neutral-background images
3. Jewelry and watches produce the best AI results; fragrances and home & living are more challenging
4. Most issues are fixable by improving product data (name + image)
5. The AI typically takes 30-60 seconds to generate a result

### Quiz Questions / Knowledge Checks

1. **What are the 5 jewelry sub-type keywords, and what does the AI do differently for each?**
   - Answer: (1) earring/jhumka/stud → places on earlobes, (2) necklace/choker/pendant → places around neck, (3) bracelet/bangle/kada → places on wrist, (4) ring → places on finger, (5) set/bridal → places necklace on neck AND earrings on ears.

2. **Why is a neutral background important for product images?**
   - Answer: The AI reads the product image to extract exact colors. A colored background contaminates the color extraction, causing the AI to generate the product in the wrong color.

3. **What should you do first when the AI places a jewelry product on the wrong body part?**
   - Answer: Check the product name — it likely doesn't include a sub-type keyword (necklace, earring, bracelet, ring, or set). Adding the correct keyword usually fixes the placement.

### Resources & Links Mentioned

- [Functional Documentation — Category Configuration Reference](./FUNCTIONAL-DOCUMENTATION.md#appendix-a--category-configuration-reference)
- [Functional Documentation — Image Quality Requirements](./FUNCTIONAL-DOCUMENTATION.md#32-image-quality-requirements)
- Internal product management system (for updating product names and images)

---

## Video 10: Advanced Customization

**Duration:** 18 minutes
**Target Audience:** Senior Developers
**Prerequisites:** Videos 1, 2, and 7 completed

### Learning Objectives

- Add a new product category with full configuration
- Modify and optimize AI generation prompts for specific use cases
- Implement custom watermarks with logo and text compositing
- Extend the pipeline with new generation strategies
- Understand the complete extension architecture and best practices

### Detailed Script

**[0:00 - 2:00] Extension Architecture Overview**

*Screen: Extension points diagram*

> "In this video, we'll cover advanced customization — adding new categories, modifying prompts, custom watermarks, and extending the pipeline. The system is designed with clear extension points that allow customization without modifying core logic."

*Extension point map:*

```
try-on-pipeline.ts:
  ├── CATEGORY_CONFIG ← Add new categories here
  ├── Generation strategies ← Add Strategy E here
  ├── Parsing helpers ← Customize VLM output parsing
  └── Watermark integration ← Customize post-processing

route.ts:
  ├── Product image resolution ← Add new image source types
  ├── Category pairing map ← Add new pairing relationships
  └── Proxy configuration ← Customize proxy behavior

product-detail.tsx:
  ├── Canvas fallback ← Customize fallback appearance
  ├── Category tips ← Add category-specific upload tips
  └── Result display ← Customize result presentation

watermark.ts:
  ├── Logo compositing ← Change logo handling
  └── SVG template ← Change watermark design
```

**[2:00 - 6:00] Adding a New Product Category**

*Screen: Code editor — adding a new category to CATEGORY_CONFIG*

> "Let's add a new category: 'luxury-gift-boxes'. This category will support our patent Feature 6 — non-wearable luxury presentation item visualization."

*Step 1: Add to CATEGORY_CONFIG*

```typescript
// In try-on-pipeline.ts — CATEGORY_CONFIG object
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // ... existing categories ...

  'luxury-gift-boxes': {
    placement: 'holding a luxury gift box with both hands, warm pleased expression, gift box prominently displayed in front of the person',
    size: '864x1152',           // Portrait 3:4 — shows person + gift box
    colorFocus: 'gift box color, ribbon color, wrapping pattern, and box material must match EXACTLY',
    bodyType: 'Professional product-in-use photograph from waist up',
    useProductEdit: true         // Strategy C enabled — product color is critical
  }
}
```

> "The key decisions: `size` is 864x1152 (portrait) because we need to see both the person and the gift box clearly. `useProductEdit` is true because the gift box's color and wrapping pattern must be preserved exactly. `placement` describes the person holding the box, not wearing it."

*Step 2: Add category pairing*

```typescript
// In route.ts — category pairing map
'luxury-gift-boxes' ↔ ['jewelry', 'fragrances']
// Gift boxes pair well with jewelry and fragrances inside them
```

*Step 3: Add upload tips in the frontend*

```typescript
// In product-detail.tsx — TryOnDialog upload step
// Add to the category-specific tips:
'luxury-gift-boxes': 'Upper body photo works best — show your face and hands'
```

*Step 4: Add to the database*

```sql
-- If using Prisma
INSERT INTO Category (slug, name, description)
VALUES ('luxury-gift-boxes', 'Luxury Gift Boxes', 'Premium gift packaging and presentation boxes');
```

*Step 5: Test the new category*

```bash
# Test with a gift box product
curl -X POST http://localhost:3000/api/try-on \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "gift-box-1",
    "selfieData": "data:image/jpeg;base64,...",
    "productName": "Gold Ribbon Luxury Gift Box",
    "categorySlug": "luxury-gift-boxes"
  }'
```

**[6:00 - 10:00] Modifying AI Generation Prompts**

*Screen: Code editor — prompt construction in the pipeline*

> "Let's look at how prompts are constructed and how to modify them for specific use cases."

*Prompt construction flow:*

```
1. Get CATEGORY_CONFIG for the product's category
2. Detect jewelry sub-type from product name (if jewelry)
3. Build category-specific placement instruction
4. Inject productInfo.colorSummary (hex-code colors)
5. Assemble the full prompt with CRITICAL RULES
6. Send to the appropriate AI strategy
```

*Example: Adding a special prompt for bridal jewelry*

```typescript
// In the pipeline — after jewelry sub-type detection
if (productName.toLowerCase().includes('bridal')) {
  // Enhanced bridal prompt with additional detail
  placement = `wearing a matching bridal jewelry set — necklace around the neck, 
    earrings on both earlobes, and maang tikka on the forehead. 
    The jewelry should look ornate and ceremonial, befitting a bride.`
  
  // Increase color accuracy emphasis for bridal products
  colorFocus = `BRIDAL jewelry metal tone and stone colors must match EXACTLY. 
    Bridal jewelry color accuracy is critical — gold must be warm gold #DAA520, 
    not cool silver. Red stones must be deep red #8B0000, not pink.`
}
```

*Example: Adding language-specific prompts*

```typescript
// For Indian market — include Indian fashion terminology
if (categorySlug === 'sarees') {
  bodyType = 'Full-body professional fashion photograph in Indian style'
  placement = `draped in the saree in traditional Indian style with pallu elegantly 
    over the left shoulder, matching blouse, properly pleated at the waist. 
    The drape should look natural and graceful, as worn by a model.`
}
```

*Best practices for prompt modification:*
- Always test prompt changes across multiple product types and selfie qualities
- Keep the CRITICAL RULES section intact — it's the foundation of color accuracy
- Use the `colorSummary` field in prompts — never hardcode colors
- Document any prompt modifications with comments explaining the reasoning
- A/B test prompt changes by comparing VLM verification scores

**[10:00 - 13:00] Custom Watermarks**

*Screen: Code editor — watermark.ts*

> "The watermark system supports two modes. Let me show you how to customize each one."

*Mode 1: Logo + Text (when `public/images/logo.png` exists)*

```typescript
// In watermark.ts
// Logo is resized to 8% of image height with aspect ratio preserved
// Logo opacity is set to 60% via ensureAlpha(0.6)
// Text "3BOXES GIFTS" + "AI Style Preview" rendered alongside

// To customize:
// 1. Replace public/images/logo.png with your logo
// 2. Adjust opacity in ensureAlpha() — lower = more transparent
// 3. Adjust size percentage — currently 8% of image height
```

*Mode 2: Text-Only (fallback)*

```typescript
// SVG-generated watermark with gradient gold text
// Background: semi-transparent black rectangle (rgba(0,0,0,0.55))
// Main text: "3BOXES GIFTS" in gold gradient
// Sub text: "AI Style Preview" in 60% opacity gold

// To customize the SVG template:
const svgWatermark = `
  <svg width="${width}" height="${height}">
    <defs>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#B8860B" />     <!-- Dark goldenrod -->
        <stop offset="50%" style="stop-color:#DAA520" />    <!-- Goldenrod -->
        <stop offset="100%" style="stop-color:#B8860B" />   <!-- Dark goldenrod -->
      </linearGradient>
    </defs>
    <!-- Background -->
    <rect ... fill="rgba(0,0,0,0.55)" />
    <!-- Main text -->
    <text ... fill="url(#gold)">3BOXES GIFTS</text>
    <!-- Sub text -->
    <text ... fill="#DAA520" opacity="0.6">AI Style Preview</text>
  </svg>
`
```

*Custom watermark example — Adding a "CONFIDENTIAL" overlay:*

```typescript
// After the main watermark compositing, add a diagonal "CONFIDENTIAL" overlay
if (process.env.WATERMARK_CONFIDENTIAL === 'true') {
  const confidentialSvg = `<svg width="${imgWidth}" height="${imgHeight}">
    <text x="50%" y="50%" transform="rotate(-30, ${imgWidth/2}, ${imgHeight/2})"
          font-size="60" fill="rgba(255,0,0,0.3)" font-weight="bold"
          text-anchor="middle">CONFIDENTIAL</text>
  </svg>`
  
  const confidentialBuffer = Buffer.from(confidentialSvg)
  image = await image.composite([{
    input: confidentialBuffer,
    blend: 'over'
  }])
}
```

**[13:00 - 16:30] Extending the Pipeline — Adding Strategy E**

*Screen: Code editor — adding a new generation strategy*

> "Let's add a hypothetical Strategy E — 'reference-guided generation'. This strategy would use the product image as a style reference while generating from a detailed text prompt."

*Step 1: Define the new strategy function*

```typescript
// In try-on-pipeline.ts

async function safeImageEditWithReference(
  prompt: string,
  styleImageUrl: string,
  size: ImageSize
): Promise<string | null> {
  try {
    const zai = createZAI()
    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: styleImageUrl }],
      size,
      // Additional parameters for style guidance
      // strength: 0.7,  // How much the style image influences the output
    } as any)
    
    if (response?.data?.[0]?.b64_json) {
      return `data:image/png;base64,${response.data[0].b64_json}`
    }
    return null
  } catch (error) {
    console.error('[pipeline] Strategy E failed:', error)
    return null
  }
}
```

*Step 2: Integrate into the pipeline flow*

```typescript
// In runPipeline() — after Strategy D

// Strategy E: Reference-guided generation (experimental)
if (categorySlug === 'luxury-gift-boxes') {
  await delay(API_CALL_DELAY)
  updateProgress('Trying reference-guided generation...')
  
  const refPrompt = `Professional photograph. ${config.bodyType}. 
    A person holding a luxury gift box. 
    ${config.colorFocus}. ${productInfo.colorSummary}.
    Studio lighting, photorealistic, 8K quality.`
  
  const refResult = await safeImageEditWithReference(
    refPrompt,
    productImageBase64,
    config.size
  )
  
  if (refResult) {
    candidates.push({ image: refResult, strategy: 'reference-guided' })
  }
}
```

*Step 3: Add the strategy label mapping*

```typescript
// In product-detail.tsx — strategy labels
'reference-guided': 'Reference-Guided AI'
```

**[16:30 - 18:00] Best Practices & Summary**

> "Here are the best practices for customizing the AI Virtual Try-On system:"

1. **Always test changes with VLM verification** — Compare scores before and after modifications to ensure quality isn't degraded
2. **Use the configuration system, not hardcoded values** — CATEGORY_CONFIG and environment variables are designed for customization
3. **Test across all categories** — A change that helps jewelry might hurt sarees
4. **Document all modifications** — Future maintainers (and patent attorneys) need to understand what changed and why
5. **Keep the fallback chain intact** — Always ensure canvas fallback works even after pipeline modifications
6. **Monitor the Zugara vs. Chanel case** — Any new features should be reviewed for patent implications

*Extension point summary:*

| Extension | File | Difficulty | Risk Level |
|---|---|---|---|
| Add new category | try-on-pipeline.ts | Low | Low |
| Modify prompts | try-on-pipeline.ts | Medium | Medium (affects quality) |
| Custom watermark | watermark.ts | Low | Low |
| New generation strategy | try-on-pipeline.ts | High | High (affects reliability) |
| New image source | route.ts | Medium | Medium |
| Custom canvas fallback | product-detail.tsx | Medium | Low |
| Category pairing | route.ts | Low | Low |

### Screen Recording Instructions

- **[0:00 - 2:00]**: Extension point diagram with file locations. Use amber arrows pointing to each extension point
- **[2:00 - 6:00]**: Live coding — add the luxury-gift-boxes category. Show each step in sequence with the code change, then the test result
- **[6:00 - 10:00]**: Code walkthrough of prompt construction. Show the bridal prompt modification. Run a test with the modified prompt
- **[10:00 - 13:00]**: Watermark.ts walkthrough. Show the SVG template. Demonstrate the CONFIDENTIAL overlay addition
- **[13:00 - 16:30]**: Live coding — add Strategy E. Show the function definition, pipeline integration, and strategy label. Run a test
- **[16:30 - 18:00]**: Best practices table. Summary card

### Key Talking Points

1. New categories require changes in 4 places: CATEGORY_CONFIG, pairing map, frontend tips, and database
2. Prompt modifications must preserve the CRITICAL RULES section for color accuracy
3. The watermark system has two modes: logo+text and SVG-only — both are customizable
4. Adding new generation strategies is high-risk — always test with VLM verification scores
5. All modifications should be documented for maintainability and patent reference

### Quiz Questions / Knowledge Checks

1. **What 4 files need to be modified when adding a new product category?**
   - Answer: (1) `try-on-pipeline.ts` — CATEGORY_CONFIG, (2) `route.ts` — category pairing map, (3) `product-detail.tsx` — upload tips, (4) Database — category record via Prisma migration or SQL.

2. **Why should you never remove the CRITICAL RULES section from generation prompts?**
   - Answer: The CRITICAL RULES section is the foundation of color accuracy — it instructs the AI to preserve the person's face, match the product colors from the reference image, and maintain the hex-code color specifications. Removing it would degrade color accuracy significantly.

3. **What is the recommended approach when adding a new generation strategy?**
   - Answer: (1) Define the new strategy function with graceful error handling (return null on failure), (2) Integrate it into the pipeline flow with appropriate progress updates, (3) Add the strategy label to the frontend mapping, (4) Test with VLM verification scores to ensure quality, (5) Document the change for maintainability.

### Resources & Links Mentioned

- Pipeline source: `src/lib/try-on-pipeline.ts` — CATEGORY_CONFIG and pipeline flow
- Route source: `src/app/api/try-on/route.ts` — Category pairing map
- Frontend source: `src/components/product-detail.tsx` — Category tips and strategy labels
- Watermark source: `src/lib/watermark.ts` — SVG template and logo compositing
- [Technical Documentation — Prompt Engineering](./TECHNICAL-DOCUMENTATION.md#6-prompt-engineering-details)
- [Technical Documentation — Category Configuration](./TECHNICAL-DOCUMENTATION.md#7-category-configuration-details)
- [Patent Application](../patent/PATENT-APPLICATION.md) — For understanding what features are claimed

---

## Recording Guidelines

### Technical Setup

| Requirement | Specification | Notes |
|---|---|---|
| **Screen Resolution** | 1920x1080 minimum | 2560x1440 preferred for crisp text |
| **Frame Rate** | 30 fps minimum | 60 fps preferred for code walkthroughs |
| **Audio** | Condenser microphone, -16 LUFS | Noise gate enabled, minimal echo |
| **Background Noise** | < -40 dB | Record in quiet room; use noise reduction in post |
| **Recording Software** | OBS Studio (primary) or Loom | OBS: use Studio Mode for clean switching |
| **Output Format** | MP4, H.264 codec | AAC audio at 192kbps |
| **Bitrate** | 10 Mbps minimum | 15 Mbps for code-heavy videos |
| **Color Space** | sRGB | Ensure consistent color across editing pipeline |

### Visual Standards

- **IDE Theme**: Dark mode (VS Code "One Dark Pro" or similar)
- **Terminal Theme**: Dark mode with amber/gold prompt
- **Font Size**: 16-18pt in editor, 14-16pt in terminal — readable at 1080p
- **Zoom Level**: 150-200% for code walkthroughs; 100% for browser demos
- **Highlighting**: Use amber (#DAA520) border annotations for important lines
- **Branding**: Consistent amber/gold theme matching 3 BOXES brand (no indigo or blue)
- **Browser**: Chrome with bookmarks bar hidden; dark mode enabled
- **Cursor**: Use high-visibility cursor (large, amber); enable cursor highlight in OBS

### Intro Template (All Videos)

```
[5 seconds] 3 BOXES LUXURY logo animation (amber/gold gradient)
[3 seconds] Video title card: "Video N: [Title]"
[2 seconds] Duration and audience: "15 min · For Developers"
[Transition] Fade to content
```

*Voiceover:*
> "Welcome to 3 BOXES LUXURY training. I'm [name], and today we'll cover [topic]. By the end of this video, you'll be able to [learning objective 1], [learning objective 2], and [learning objective 3]."

### Outro Template (All Videos)

```
[5 seconds] Summary bullet points (3-5 key takeaways)
[3 seconds] Next video preview: "Next: Video N+1 — [Title]"
[2 seconds] 3 BOXES LUXURY logo + "Thanks for watching!"
```

*Voiceover:*
> "To recap: [summary point 1], [summary point 2], [summary point 3]. In the next video, we'll cover [next topic]. Thanks for watching!"

---

## Post-Production Guidelines

### Editing

| Aspect | Standard | Notes |
|---|---|---|
| **Cut dead air** | Remove pauses > 3 seconds | Keep natural rhythm; don't over-edit |
| **Error recovery** | Cut mistakes; add smooth transition | Re-record segment if error is complex |
| **Pacing** | 140-160 words per minute | Don't speed up code walkthroughs |
| **Transitions** | Simple cross-fade (0.5s) | No flashy effects; maintain professionalism |
| **Chapter markers** | Add at each timestamp section | Enables navigation in YouTube/Vimeo |
| **Zoom effects** | Smooth Ken Burns on code sections | Don't jump-cut zoom; animate over 0.3s |

### Captions

| Requirement | Standard |
|---|---|
| **Format** | SRT or VTT |
| **Language** | English (primary); Hindi subtitles for Video 9 |
| **Style** | White text on semi-transparent black background |
| **Position** | Bottom center; move to top when code overlaps |
| **Accuracy** | 99%+ word accuracy; verify technical terms |
| **Auto-generation** | Use Whisper for initial pass; manual review required |
| **Technical terms** | Spell out on first use: "VLM (Vision Language Model)" |

### Thumbnail Design

| Element | Specification |
|---|---|
| **Size** | 1280x720 pixels (YouTube standard) |
| **Background** | Dark stone-950 with amber gradient overlay |
| **Text** | Video number + short title (max 6 words) |
| **Font** | Bold, white with amber text shadow |
| **Icon** | Category-specific icon (e.g., sparkles for pipeline, shield for QA) |
| **Branding** | 3 BOXES LUXURY logo in bottom-right corner |
| **Duration badge** | "15 min" badge in top-right corner |

---

## Video Hosting Strategy

### Primary: YouTube (Unlisted)

All training videos are uploaded to YouTube as **unlisted** videos. This provides:

| Feature | Benefit |
|---|---|
| **Unlisted privacy** | Only people with the link can view — not publicly searchable |
| **Embedding** | Can be embedded in GitHub wiki and internal tools |
| **Chapter markers** | YouTube auto-detects timestamps for navigation |
| **Captions** | YouTube auto-captions as backup; upload SRT for accuracy |
| **Analytics** | View counts and audience retention data |
| **No cost** | Free hosting with unlimited storage |

### Secondary: GitHub Wiki Embedded

Training video links are embedded in the wiki documentation for context:

```markdown
### Video: Understanding the AI Pipeline
[📺 Watch on YouTube (20 min)](https://youtube.com/watch?v=XXXXX)

Key timestamps:
- [2:00] Phase 1: VLM Product Analysis
- [6:00] Phase 2: Multi-Strategy Generation
- [12:00] Phase 3: VLM Verification
```

### Access Control

| Audience | Access Method |
|---|---|
| Internal team (all) | YouTube unlisted links shared via Slack/wiki |
| New hires | Links in onboarding documentation |
| External contractors | Time-limited share links; revoke after project |
| Legal team (Video 8) | Separate unlisted link; not embedded in public wiki |

### Video Lifecycle

| Stage | Action |
|---|---|
| **Script review** | Script reviewed by subject matter expert before recording |
| **Recording** | Record in one session per video; re-record segments as needed |
| **Post-production** | Edit, add captions, create thumbnail |
| **Review** | Peer review by at least one team member |
| **Publish** | Upload to YouTube unlisted; embed in wiki |
| **Update** | Re-record when significant code changes occur; mark old video as deprecated |
| **Archive** | Keep deprecated videos as unlisted; add "OUTDATED" to title |

---

*Last updated: March 2026 · Document Version 3.0 · Total: 10 videos, ~162 minutes*
