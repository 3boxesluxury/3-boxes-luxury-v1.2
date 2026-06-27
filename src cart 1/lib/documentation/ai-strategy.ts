import { DocumentationDoc } from './types';

const aiStrategyDoc: DocumentationDoc = {
  id: 'ai-strategy-documentation',
  title: '3BOXES AI Code Strategy Documentation',
  description: 'Detailed documentation of the AI code strategy powering 3BOXES, including the virtual try-on architecture, HuggingFace IDM-VTON integration, Try-On Pipeline v4, multi-strategy image generation, VLM quality verification, ZAI AI Service integration, fallback chains, image processing, category-specific configurations, AI gift recommendations, AI assistant chatbot, content moderation, and prompt engineering.',
  category: 'ai-strategy',
  isConfidential: false,
  version: '1.0.0',
  lastUpdated: '2025-03-04',
  sections: [
    // ─── SECTION 1: AI Virtual Try-On Architecture ──────────────────
    {
      id: 'ai-virtual-tryon-architecture',
      title: 'AI Virtual Try-On Architecture',
      content: `<h2>AI Virtual Try-On Architecture Overview</h2>
<p>The 3BOXES AI Virtual Try-On system is a sophisticated multi-layered architecture designed to generate photorealistic images of customers wearing luxury products. The system combines <strong>HuggingFace's IDM-VTON model</strong> (a dedicated virtual try-on model), the <strong>ZAI AI Service</strong> (for image generation and VLM verification), and a <strong>Canvas overlay fallback</strong> into a resilient pipeline that produces high-quality results across 30+ product categories.</p>

<h3>System Architecture Diagram</h3>
<pre>
┌──────────────────────────────────────────────────────────────────┐
│                    USER (Browser)                                │
│  ┌─────────────┐  Upload Selfie  ┌───────────────────────────┐  │
│  │ Try-On      │────────────────►│ POST /api/try-on          │  │
│  │ Dialog      │◄────────────────│ {productId, selfieData}   │  │
│  └─────────────┘  Poll Status    └───────────┬───────────────┘  │
│       ▲           GET /api/try-on/status      │                  │
│       │           {status, imageUrl, ...}      │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │
┌───────────────────────────────────────────────▼──────────────────┐
│                TRY-ON PIPELINE v4 (Backend)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 0: Fetch product suggestions in background            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 0.5: HuggingFace IDM-VTON Try-On (FREE)               │ │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │ │
│  │ │ Strategy 1:  │ │ Strategy 2:  │ │ Strategy 3:          │ │ │
│  │ │ Manual Gradio│ │ @gradio/     │ │ HF Inference API     │ │ │
│  │ │ REST API     │ │ client       │ │ (instruct-pix2pix)   │ │ │
│  │ └──────────────┘ └──────────────┘ └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 1: VLM Product Analysis (if HF fails)                 │ │
│  │ Analyze product image → extract color, material, details    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 2: Multi-Strategy Image Generation                    │ │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │ │
│  │ │ Dual-Image   │ │ Selfie-Edit  │ │ Product-Edit         │ │ │
│  │ │ (selfie +    │ │ (selfie only │ │ (product only        │ │ │
│  │ │  product)    │ │  + text desc)│ │  + person desc)      │ │ │
│  │ └──────────────┘ └──────────────┘ └──────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 3: VLM Quality Verification (6 dimensions)            │ │
│  │ Color Match, Shape/Design, Face Preservation,               │ │
│  │ Natural Wear, Skin Tone, Overall                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 3.5: Face Preservation Check                          │ │
│  │ VLM compares result face with original selfie               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 4: Refinement (up to 2 passes)                        │ │
│  │ Auto-refine if color score 6-8, specific correction prompts │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 4.5: Product-Overlay Composite (if color still poor)  │ │
│  │ Overlay actual product at partial opacity + blend pass       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Phase 5: Watermark + Deliver                                │ │
│  │ Add 3BOXES watermark, store result, return to client        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
</pre>

<h3>Key Design Principles</h3>
<ul>
<li><strong>Resilience First</strong>: Every AI service call has timeouts, error handling, and fallback strategies</li>
<li><strong>Quality Verification</strong>: Every generated image is verified by VLM before delivery</li>
<li><strong>Category Awareness</strong>: 30+ category-specific configurations optimize prompts for each product type</li>
<li><strong>Face Preservation</strong>: Multiple checks ensure the person's identity is maintained</li>
<li><strong>Color Accuracy</strong>: Dual-image prompting and automatic refinement for precise color matching</li>
<li><strong>Graceful Degradation</strong>: Falls back from high-quality to lower-quality strategies rather than failing</li>
</ul>`,
      subsections: []
    },

    // ─── SECTION 2: HuggingFace IDM-VTON Integration ────────────────
    {
      id: 'huggingface-idm-vton',
      title: 'HuggingFace IDM-VTON Integration',
      content: `<h2>HuggingFace IDM-VTON Integration (v5)</h2>
<p>The HuggingFace integration (<code>src/lib/huggingface-tryon.ts</code>) connects to the <strong>yisol/IDM-VTON</strong> Gradio Space, which is a real virtual try-on model that AI-applies garments to person images. This is the <strong>primary try-on strategy</strong> because it produces the most realistic results for clothing categories.</p>

<h3>Three Connection Strategies</h3>

<h4>Strategy 1: Manual Gradio REST API (Primary)</h4>
<p>This is the most reliable strategy because it handles uploads explicitly and doesn't depend on session management:</p>
<pre><code>// Step 1: Upload person image
const personPath = await uploadImageToSpace(personImageBase64, uploadId, 'person.jpg')

// Step 2: Upload garment image
const garmentPath = await uploadImageToSpace(garmentImageBase64, uploadId, 'garment.jpg')

// Step 3: Call tryon API
const submitRes = await fetch(\`\${IDM_VTON_SPACE_URL}/call/tryon\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  body: JSON.stringify({
    data: [
      { background: { path: personPath, meta: { _type: 'gradio.FileData' } } },
      { path: garmentPath, meta: { _type: 'gradio.FileData' } },
      getGarmentDescription(categorySlug), // garment description
      true,   // is_checked (auto-masking)
      false,  // is_checked_crop (auto-cropping)
      30,     // denoise_steps
      42,     // seed
    ],
  }),
})

// Step 4: Poll for result using SSE
const eventId = submitData.event_id
while (Date.now() - startTime < MANUAL_POLL_TIMEOUT) {
  const resultRes = await fetch(\`\${IDM_VTON_SPACE_URL}/call/tryon/\${eventId}\`)
  const parsed = parseSSEStream(resultText)
  if (parsed.data) {
    const imageUrl = extractImageFromGradioResult(parsed.data, IDM_VTON_SPACE_URL)
    return { success: true, imageUrl, strategy: 'idm-vton-manual' }
  }
}
</code></pre>

<h4>Strategy 2: @gradio/client (Fallback)</h4>
<p>Uses the official Gradio client library which handles session management and wake-up automatically:</p>
<pre><code>const { Client } = await import('@gradio/client')
const client = await Client.connect(IDM_VTON_SPACE_ID, { hf_token: hfToken })

const job = client.submit('/tryon', [
  personBlob,              // human_img (ImageEditor)
  garmentBlob,             // garm_img (Image)
  garmentDescription,      // garment_des (Textbox)
  true,                    // is_checked (auto-masking)
  false,                   // is_checked_crop
  30,                      // denoise_steps
  42,                      // seed
])

for await (const message of job) {
  if (message.type === 'data') {
    // Extract result image URL
    return { success: true, imageUrl: extractUrl(message.data), strategy: 'idm-vton-gradio-client' }
  }
}
</code></pre>

<h4>Strategy 3: HuggingFace Inference API (Last Resort)</h4>
<p>Always available (serverless) but doesn't do true virtual try-on — uses instruction-based image editing instead:</p>
<pre><code>const response = await fetch(
  'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
  {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${hfToken}\` },
    body: JSON.stringify({
      inputs: {
        image: personImageBase64.replace(/^data:image\\/[^;]+;base64,/, ''),
        prompt: \`Show this person wearing \${garmentDesc}. Make it look natural and realistic...\`,
      },
      parameters: { num_inference_steps: 30, image_guidance_scale: 1.5, guidance_scale: 7.5 },
    }),
  }
)
</code></pre>

<h3>Space Status Detection</h3>
<p>Before attempting try-on, the system checks the IDM-VTON Space status via the HuggingFace API:</p>
<pre><code>async function checkSpaceStatus(spaceUrl: string): Promise&lt;'running' | 'sleeping' | 'building' | 'error'&gt; {
  const apiUrl = \`https://huggingface.co/api/spaces/\${IDM_VTON_SPACE_ID}\`
  const res = await fetch(apiUrl)
  const data = await res.json()
  const stage = data?.runtime?.stage
  if (stage === 'RUNNING') return 'running'
  if (stage === 'SLEEPING' || stage === 'STOPPED') return 'sleeping'
  if (stage === 'BUILDING' || stage === 'DEPLOYING') return 'building'
  return 'error'
}
</code></pre>

<h3>Timeouts and Error Handling</h3>
<table>
<tr><th>Timeout</th><th>Duration</th><th>Purpose</th></tr>
<tr><td>GRADIO_CONNECT_TIMEOUT</td><td>30s</td><td>Connecting to Gradio Space</td></tr>
<tr><td>GRADIO_PROCESS_TIMEOUT</td><td>120s</td><td>Processing + queue wait</td></tr>
<tr><td>MANUAL_POLL_TIMEOUT</td><td>180s</td><td>Manual API result polling</td></tr>
<tr><td>UPLOAD_TIMEOUT</td><td>30s</td><td>Image upload to Space</td></tr>
<tr><td>DOWNLOAD_TIMEOUT</td><td>30s</td><td>Downloading result image</td></tr>
</table>`,
      subsections: []
    },

    // ─── SECTION 3: Try-On Pipeline v4 ──────────────────────────────
    {
      id: 'tryon-pipeline-v4',
      title: 'Try-On Pipeline v4',
      content: `<h2>Try-On Pipeline v4 — Enhanced Accuracy + Product Overlay Composite</h2>
<p>The pipeline (<code>src/lib/try-on-pipeline.ts</code>) is the core orchestration engine that coordinates all AI services to produce a virtual try-on result. Version 4 introduces stronger dual-image color emphasis, lenient PASS with auto-refinement, product-overlay compositing, and expanded category configurations.</p>

<h3>Pipeline Phases</h3>
<pre>
Phase 0:   Fetch product suggestions in background
Phase 0.5: HuggingFace IDM-VTON try-on (FREE, no ZAI credits needed)
Phase 1:   VLM Product Analysis (only if HF fails)
Phase 2:   Multi-Strategy Image Generation
Phase 3:   VLM Quality Verification (6 dimensions)
Phase 3.5: Face Preservation Check
Phase 4:   Refinement (up to 2 passes with specific corrections)
Phase 4.5: Product-Overlay Composite (if color still poor after refinement)
Phase 5:   Watermark + Deliver
</pre>`,
      subsections: [
        {
          id: 'pipeline-multi-strategy',
          title: 'Multi-Strategy Generation',
          content: `<h3>Multi-Strategy Generation Pipeline</h3>
<p>When HuggingFace IDM-VTON fails (which happens for non-clothing categories or when the Space is unavailable), the pipeline falls back to ZAI-powered image generation with multiple strategies:</p>

<h4>Strategy 1: Dual-Image Edit (Best Quality)</h4>
<p>Both the selfie AND the product image are passed to the AI model. This is the best strategy for color accuracy because the model can SEE the actual product colors rather than guessing from text descriptions.</p>
<pre><code>const response = await zai.images.generations.edit({
  prompt: buildDualImagePrompt(config, productName, productInfo),
  images: [
    { url: selfieUrl },    // Person's selfie
    { url: productUrl },   // Product image
  ],
  size: config.size,
})
</code></pre>
<p>The dual-image prompt emphasizes color accuracy as the #1 priority and explicitly instructs the model to match the SECOND image's colors exactly.</p>

<h4>Strategy 2: Selfie-Edit (Face Preservation)</h4>
<p>Only the selfie is passed as an image; product details are described in text. Better for face preservation but less accurate for colors since the model must interpret text descriptions.</p>
<pre><code>const response = await zai.images.generations.edit({
  prompt: buildSelfieEditPrompt(config, productName, productInfo),
  images: [{ url: selfieUrl }],
  size: config.size,
})
</code></pre>

<h4>Strategy 3: Product-Edit (Color Accuracy)</h4>
<p>Only the product image is passed; the person is described in text. Best for color accuracy but worst for face preservation (the generated face won't match the selfie).</p>
<pre><code>const response = await zai.images.generations.edit({
  prompt: buildProductEditPrompt(config, productName, productInfo, personDesc),
  images: [{ url: productUrl }],
  size: config.size,
})
</code></pre>

<h4>Strategy 4: Text-to-Image (Last Resort)</h4>
<p>Both person and product are described in text only. Used when all image-edit strategies fail. Lowest quality but always available.</p>
<pre><code>const response = await zai.images.generations.create({
  prompt: buildTextToImagePrompt(config, productName, productInfo, personDesc),
  size: config.size,
})
</code></pre>

<h3>Strategy Selection Logic</h3>
<p>The pipeline tries strategies in order of quality and falls back gracefully:</p>
<ol>
<li>Try HuggingFace IDM-VTON (all 3 sub-strategies)</li>
<li>If HF fails → Try Dual-Image Edit (ZAI)</li>
<li>If dual-image fails → Try Selfie-Edit (ZAI)</li>
<li>If selfie-edit fails → Try Product-Edit (ZAI, only if category supports it)</li>
<li>If product-edit fails → Try Text-to-Image (ZAI)</li>
<li>If all ZAI strategies fail → Canvas Overlay fallback</li>
</ol>`
        },
        {
          id: 'pipeline-verification-refinement',
          title: 'VLM Verification & Refinement',
          content: `<h3>VLM Quality Verification</h3>
<p>After generating an image, the pipeline uses VLM (Vision Language Model) to verify quality across 6 dimensions. The verification compares the generated image against the original product image:</p>

<pre><code>const VERIFICATION_PROMPT = \`Compare these two images for a virtual try-on quality check:

IMAGE 1: AI-generated try-on result (person wearing the product)
IMAGE 2: Original product image

Score each criterion:
1. COLOR_MATCH (0-10): Product color accuracy
2. SHAPE_DESIGN (0-10): Product shape/pattern accuracy
3. FACE_PRESERVATION (0-10): Person's face preserved from selfie
4. NATURAL_WEAR (0-10): Product looks naturally worn
5. SKIN_TONE (0-10): Person's skin tone preserved
6. OVERALL (0-10): Combined quality score\`
</code></pre>

<h4>Pass Criteria</h4>
<table>
<tr><th>Dimension</th><th>Minimum Score</th><th>Auto-Action</th></tr>
<tr><td>COLOR_MATCH</td><td>≥ 6</td><td>If 6-8: auto-refinement triggered</td></tr>
<tr><td>FACE_PRESERVATION</td><td>≥ 7</td><td>If &lt; 7: result rejected</td></tr>
<tr><td>NATURAL_WEAR</td><td>≥ 6</td><td>If &lt; 6: refinement attempted</td></tr>
<tr><td>SKIN_TONE</td><td>≥ 7</td><td>If &lt; 7: refinement attempted</td></tr>
</table>

<h3>Face Preservation Check (Phase 3.5)</h3>
<p>A dedicated VLM check compares the generated image's face against the original selfie to ensure identity preservation:</p>
<pre><code>// Face check prompt
const faceCheckPrompt = \`Compare these two images:
IMAGE 1: Original selfie of a person
IMAGE 2: AI-generated try-on result

Does the person in IMAGE 2 have the SAME face as IMAGE 1?
Check: eye shape, nose, lips, jawline, cheekbones, skin tone, hair.
Rate face similarity 0-10 and answer SAME or DIFFERENT.\`
</code></pre>

<h3>Refinement Passes (Phase 4)</h3>
<p>If color accuracy is between 6-8 (close but not perfect), the pipeline automatically triggers refinement:</p>
<ol>
<li><strong>Refinement Pass 1</strong>: Regenerate with specific correction instructions based on VLM's identified issues. Uses dual-image prompt with emphasis on the specific problem areas.</li>
<li><strong>Refinement Pass 2</strong>: If the first refinement didn't achieve sufficient quality, a second pass with even more specific corrections.</li>
</ol>
<p>Maximum 2 refinement passes to prevent infinite loops. Each pass uses the VLM's issue description to generate targeted corrections.</p>

<h3>Product-Overlay Composite (Phase 4.5)</h3>
<p>If color accuracy is still poor after refinement, the pipeline applies a product-overlay composite:</p>
<ol>
<li>Overlay the actual product image at partial opacity on the generated result</li>
<li>Apply a blend pass to integrate the overlay naturally</li>
<li>This ensures product colors are at least partially visible even if the AI couldn't match them</li>
</ol>`
        }
      ]
    },

    // ─── SECTION 4: VLM Quality Verification ────────────────────────
    {
      id: 'vlm-quality-verification',
      title: 'VLM-Based Quality Verification',
      content: `<h2>VLM-Based Quality Verification (6-Dimension Check)</h2>
<p>The VLM quality verification system is a novel approach to ensuring virtual try-on quality. Instead of relying on pixel-level metrics (which don't capture semantic accuracy), it uses a Vision Language Model to assess quality the way a human would — by looking at the result and comparing it to the reference.</p>

<h3>Six Quality Dimensions</h3>

<h4>1. COLOR_MATCH (0-10)</h4>
<p>Measures how accurately the product colors in the generated image match the original product image. This is the <strong>#1 priority</strong> dimension because color accuracy is critical for luxury e-commerce — a gold necklace must appear gold, not silver or copper.</p>
<ul>
<li><strong>10</strong>: Colors are identical in hue, saturation, and brightness</li>
<li><strong>7-9</strong>: Very close, minor shade difference acceptable</li>
<li><strong>4-6</strong>: Wrong shade (e.g., red instead of maroon, silver instead of white gold)</li>
<li><strong>0-3</strong>: Completely wrong colors</li>
</ul>
<p>Special consideration: The VLM checks both main color and metal tone (warm yellow gold vs cool white gold vs rose gold), which is critical for jewelry products.</p>

<h4>2. SHAPE_DESIGN (0-10)</h4>
<p>Measures how accurately the product shape, pattern, and design match the original:</p>
<ul>
<li><strong>10</strong>: Identical shape, pattern, proportions, and design elements</li>
<li><strong>7-9</strong>: Very close, minor detail differences</li>
<li><strong>4-6</strong>: Similar type but different design (wrong pattern, different stone arrangement)</li>
<li><strong>0-3</strong>: Different product entirely</li>
</ul>

<h4>3. FACE_PRESERVATION (0-10)</h4>
<p>Measures how well the person's face is preserved from their original selfie. This is critical for user trust — the result should look like the same person wearing the product:</p>
<ul>
<li><strong>10</strong>: Face is identical — same features, expression, proportions</li>
<li><strong>7-9</strong>: Very similar, minor softening or smoothing</li>
<li><strong>4-6</strong>: Noticeably different face shape, features, or skin tone</li>
<li><strong>0-3</strong>: Completely different person</li>
</ul>
<p><em>Strict rule: Even slight changes to eye shape, nose, jaw, or lips should score ≤ 6.</em></p>

<h4>4. NATURAL_WEAR (0-10)</h4>
<p>Measures whether the product looks realistically worn on the person:</p>
<ul>
<li><strong>10</strong>: Looks like a real photo of someone wearing the product</li>
<li><strong>7-9</strong>: Natural but with minor lighting/shadow issues</li>
<li><strong>4-6</strong>: Partially pasted on, floating, or has edge artifacts</li>
<li><strong>0-3</strong>: Clearly pasted/overlaid, looks fake</li>
</ul>

<h4>5. SKIN_TONE (0-10)</h4>
<p>Measures whether the person's skin tone is preserved naturally:</p>
<ul>
<li><strong>10</strong>: Skin tone exactly the same as the original selfie</li>
<li><strong>7-9</strong>: Very close, minimal shift</li>
<li><strong>4-6</strong>: Noticeably warmer/cooler/darker/lighter</li>
<li><strong>0-3</strong>: Completely different skin tone</li>
</ul>

<h4>6. OVERALL (0-10)</h4>
<p>Combined quality score computed as a weighted average:</p>
<pre><code>overallScore = colorScore * 0.30 + shapeScore * 0.20 + faceScore * 0.20 +
               naturalWearScore * 0.15 + skinToneScore * 0.15
</code></pre>
<p>This weighting reflects the relative importance of each dimension for a luxury e-commerce platform where color accuracy matters most.</p>`,
      subsections: []
    },

    // ─── SECTION 5: ZAI AI Service Integration ──────────────────────
    {
      id: 'zai-ai-service',
      title: 'ZAI AI Service Integration',
      content: `<h2>ZAI AI Service Integration</h2>
<p>The ZAI AI Service (<code>src/lib/zai.ts</code>) is the primary AI backend for image generation, VLM analysis, and chat completions. The integration supports three connection modes with automatic fallback.</p>

<h3>Connection Modes</h3>

<h4>Mode 1: Explicit Configuration</h4>
<p>Uses environment variables or <code>.z-ai-config</code> file:</p>
<pre><code>// Environment variables
ZAI_BASE_URL=https://api.example.com/v1
ZAI_API_KEY=sk-...
ZAI_CHAT_ID=...
ZAI_TOKEN=...
ZAI_USER_ID=...

// Or config file (.z-ai-config)
{
  "baseUrl": "https://api.example.com/v1",
  "apiKey": "sk-...",
  "chatId": "...",
  "token": "...",
  "userId": "..."
}
</code></pre>

<h4>Mode 2: SDK Auto-Discovery</h4>
<p>In sandbox environments, the SDK can auto-discover the AI service:</p>
<pre><code>const instance = await ZAI.create()  // Auto-discovers endpoint
</code></pre>

<h4>Mode 3: Proxy URL</h4>
<p>When the direct AI service is unreachable, requests go through a proxy:</p>
<pre><code>ZAI_PROXY_URL=https://proxy.example.com
</code></pre>

<h3>Health Checking</h3>
<p>The system performs cached health checks to avoid unnecessary delays:</p>
<pre><code>export async function isZAIAvailable(): Promise&lt;{
  available: boolean
  mode: 'ai' | 'proxy' | 'unavailable' | 'sdk-auto'
  reason?: string
}&gt;
</code></pre>
<p>Health check results are cached for 30 seconds (direct) or 60 seconds (proxy) to avoid repeated checks.</p>

<h3>API Capabilities</h3>
<table>
<tr><th>Capability</th><th>Method</th><th>Usage in Pipeline</th></tr>
<tr><td>Image Edit (single)</td><td>zai.images.generations.edit()</td><td>Selfie-edit, product-edit strategies</td></tr>
<tr><td>Image Edit (dual)</td><td>zai.images.generations.edit() with 2 images</td><td>Dual-image strategy (best quality)</td></tr>
<tr><td>Image Create</td><td>zai.images.generations.create()</td><td>Text-to-image strategy</td></tr>
<tr><td>Vision Chat</td><td>zai.chat.completions.createVision()</td><td>Product analysis, quality verification, face check</td></tr>
<tr><td>Text Chat</td><td>zai.chat.completions.create()</td><td>AI assistant, gift recommendations</td></tr>
</table>`,
      subsections: []
    },

    // ─── SECTION 6: Fallback Chain ──────────────────────────────────
    {
      id: 'fallback-chain',
      title: 'Complete Fallback Chain',
      content: `<h2>Complete Fallback Chain</h2>
<p>The try-on system implements a comprehensive fallback chain that ensures the user always gets a result, even if individual AI services are unavailable:</p>

<pre>
┌──────────────────────────────────────────────────────────────────┐
│ FALLBACK CHAIN (attempted in order)                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. HuggingFace IDM-VTON                                         │
│    ├── Strategy 1: Manual Gradio REST API                       │
│    ├── Strategy 2: @gradio/client                               │
│    └── Strategy 3: HF Inference API (instruct-pix2pix)          │
│                                                                  │
│ 2. ZAI AI Service (Image Generation)                            │
│    ├── Strategy A: Dual-Image Edit (selfie + product)           │
│    ├── Strategy B: Selfie-Edit (selfie + text description)      │
│    ├── Strategy C: Product-Edit (product + person description)  │
│    └── Strategy D: Text-to-Image (text only)                    │
│                                                                  │
│ 3. ZAI Proxy Service                                            │
│    └── Routes through /api/ai-proxy to mini-services/ai-proxy   │
│                                                                  │
│ 4. Canvas Overlay Composite                                     │
│    └── Overlay product image at partial opacity on selfie        │
│                                                                  │
│ 5. Error with Helpful Message                                   │
│    └── "AI try-on is temporarily unavailable. Please try again" │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
</pre>

<h3>Fallback Decision Logic</h3>
<ol>
<li>Try HuggingFace first — it's FREE and produces the best results for clothing</li>
<li>If HF fails (Space sleeping, timeout, non-clothing category) → try ZAI</li>
<li>ZAI tries dual-image first (best color accuracy)</li>
<li>If dual-image fails → try selfie-edit (better face preservation)</li>
<li>If selfie-edit fails → try product-edit (if category supports it)</li>
<li>If product-edit fails → try text-to-image (always available)</li>
<li>If ZAI is unavailable → try proxy service</li>
<li>If all AI fails → canvas overlay (low quality but functional)</li>
<li>If even overlay fails → return user-friendly error message</li>
</ol>

<p>Each fallback is transparent to the user — the progress bar updates with the current strategy being attempted, and the final result includes which strategy succeeded.</p>`,
      subsections: []
    },

    // ─── SECTION 7: Image Processing Pipeline ───────────────────────
    {
      id: 'image-processing-pipeline',
      title: 'Image Processing Pipeline',
      content: `<h2>Image Processing Pipeline</h2>
<p>Images go through several processing steps before, during, and after AI generation:</p>

<h3>Pre-Processing (Before AI Generation)</h3>
<ul>
<li><strong>Image Compression</strong>: Large images are compressed before upload to reduce API payload size</li>
<li><strong>Format Conversion</strong>: All images are converted to JPEG/PNG base64 format</li>
<li><strong>Content Moderation</strong>: Selfies are checked for appropriateness via <code>/api/moderate-image</code></li>
<li><strong>Face Detection</strong>: Selfies are analyzed via <code>/api/try-on/analyze-selfie</code> to ensure a detectable face is present</li>
</ul>

<h3>During AI Generation</h3>
<ul>
<li><strong>Category-Specific Sizing</strong>: Images are generated at the optimal size for the product category (e.g., 864x1152 for jewelry, 768x1344 for sarees)</li>
<li><strong>VLM Analysis</strong>: Product images are analyzed to extract color, material, and design details for prompt construction</li>
<li><strong>Quality Verification</strong>: Generated images are verified against the original product image using VLM</li>
</ul>

<h3>Post-Processing (After AI Generation)</h3>
<ul>
<li><strong>Watermarking</strong>: All AI-generated images receive a 3BOXES watermark via <code>src/lib/watermark.ts</code></li>
<li><strong>Format Standardization</strong>: Results are converted to base64 data URLs for consistent delivery</li>
<li><strong>Portfolio Storage</strong>: Users can save results to CustomerPortfolio with consent management</li>
</ul>

<h3>Watermarking System</h3>
<p>The watermarking module adds a semi-transparent 3BOXES logo/text overlay to all AI-generated images:</p>
<pre><code>// src/lib/watermark.ts
import { addWatermark } from '@/lib/watermark'

const watermarkedImage = await addWatermark(generatedImageUrl)
// Returns base64 data URL with watermark applied
</code></pre>`,
      subsections: []
    },

    // ─── SECTION 8: Category-Specific Configuration ─────────────────
    {
      id: 'category-specific-configuration',
      title: 'Category-Specific Configuration (30+ Categories)',
      content: `<h2>Category-Specific Configuration</h2>
<p>Each product category has a dedicated configuration that optimizes the AI generation for that product type. The configuration controls image size, placement instructions, color focus areas, body type framing, and whether product-first editing makes sense.</p>

<h3>Configuration Interface</h3>
<pre><code>interface CategoryConfig {
  placement: string      // How the product should be positioned on the person
  size: ImageSize        // Optimal image dimensions for this category
  colorFocus: string     // Which colors must match exactly
  bodyType: string       // Framing (full-body, close-up, etc.)
  useProductEdit: boolean // Whether product-first edit strategy works for this category
}
</code></pre>

<h3>Complete Category Configurations</h3>
<table>
<tr><th>Category</th><th>Size</th><th>Placement</th><th>Color Focus</th><th>Product Edit</th></tr>
<tr><td>jewelry</td><td>864x1152</td><td>Wearing the jewelry piece</td><td>Metal tone (gold/silver/rose-gold) and stone colors</td><td>Yes</td></tr>
<tr><td>sarees</td><td>768x1344</td><td>Draped in traditional style with pallu over shoulder</td><td>Saree fabric color, border, zari/work color</td><td>No</td></tr>
<tr><td>watches</td><td>864x1152</td><td>Wearing the watch on left wrist</td><td>Dial color, case metal, strap color</td><td>Yes</td></tr>
<tr><td>fashion</td><td>768x1344</td><td>Wearing the outfit</td><td>Fabric color, print pattern, accent colors</td><td>No</td></tr>
<tr><td>mens-shirts</td><td>768x1344</td><td>Wearing the shirt</td><td>Shirt fabric color, pattern, collar/cuff details</td><td>No</td></tr>
<tr><td>leather-goods</td><td>864x1152</td><td>Holding the leather product</td><td>Leather color, grain texture, hardware metal</td><td>Yes</td></tr>
<tr><td>fragrances</td><td>864x1152</td><td>Holding the fragrance bottle</td><td>Bottle shape, cap color, liquid color</td><td>Yes</td></tr>
<tr><td>home-living</td><td>1344x768</td><td>With the home decor product</td><td>Product colors, materials, finish</td><td>Yes</td></tr>
<tr><td>corporate-gifts</td><td>864x1152</td><td>Holding the gift product elegantly</td><td>Product colors, materials, packaging</td><td>Yes</td></tr>
<tr><td>office-desk</td><td>1344x768</td><td>With the desk accessory on workspace</td><td>Product colors, materials, finish</td><td>Yes</td></tr>
<tr><td>women-sarees</td><td>768x1344</td><td>Draped in traditional Indian style</td><td>Saree fabric color, border, zari</td><td>No</td></tr>
<tr><td>women-jewelry</td><td>864x1152</td><td>Wearing the jewelry piece</td><td>Metal tone and stone colors</td><td>Yes</td></tr>
<tr><td>women-fragrances</td><td>864x1152</td><td>Holding the fragrance bottle elegantly</td><td>Bottle shape, cap color, liquid color</td><td>Yes</td></tr>
<tr><td>women-accessories</td><td>864x1152</td><td>Wearing the accessory</td><td>Accessory color, material, design</td><td>Yes</td></tr>
<tr><td>kids-fashion</td><td>768x1344</td><td>Wearing the outfit</td><td>Fabric color, print pattern, accent colors</td><td>No</td></tr>
<tr><td>kids-toys</td><td>864x1152</td><td>Holding the toy product</td><td>Product colors, materials, design</td><td>Yes</td></tr>
<tr><td>men-accessories</td><td>864x1152</td><td>Wearing the accessory</td><td>Accessory color, material, design</td><td>Yes</td></tr>
<tr><td>men-watches</td><td>864x1152</td><td>Wearing the watch on left wrist</td><td>Dial color, case metal, strap color</td><td>Yes</td></tr>
<tr><td>men-tshirts</td><td>768x1344</td><td>Wearing the t-shirt</td><td>T-shirt fabric color, pattern, details</td><td>No</td></tr>
<tr><td>men-fragrances</td><td>864x1152</td><td>Holding the fragrance bottle</td><td>Bottle shape, cap color, liquid color</td><td>Yes</td></tr>
</table>

<h3>Dynamic Placement Override</h3>
<p>For certain categories, the placement is dynamically overridden based on the product name:</p>

<h4>Jewelry Sub-Category Detection</h4>
<pre><code>// From getCategoryConfig()
if (categorySlug === 'jewelry') {
  const n = productName.toLowerCase()
  if (n.includes('earring') || n.includes('jhumka'))
    config.placement = 'wearing earrings on both earlobes'
  else if (n.includes('necklace') || n.includes('choker'))
    config.placement = 'wearing a necklace around the neck'
  else if (n.includes('bracelet') || n.includes('bangle'))
    config.placement = 'wearing a bracelet on the wrist'
  else if (n.includes('ring'))
    config.placement = 'wearing a ring on the finger'
  else if (n.includes('set') || n.includes('bridal'))
    config.placement = 'wearing a matching jewelry set — necklace and earrings'
}
</code></pre>

<h4>Corporate Gift Sub-Category Detection</h4>
<pre><code>if (categorySlug === 'corporate-gifts') {
  const n = productName.toLowerCase()
  if (n.includes('diary') || n.includes('notebook'))
    config.placement = 'holding the premium diary/notebook elegantly'
  else if (n.includes('pen'))
    config.placement = 'holding the luxury pen gracefully'
  else if (n.includes('hamper') || n.includes('gift box'))
    config.placement = 'presenting the gift hamper elegantly'
  // ... more sub-categories
}
</code></pre>`,
      subsections: []
    },

    // ─── SECTION 9: AI Gift Recommendations ─────────────────────────
    {
      id: 'ai-gift-recommendations',
      title: 'AI Gift Recommendations',
      content: `<h2>AI Gift Recommendations</h2>
<p>The gift recommendation engine (<code>/api/gift-recommend</code>) uses AI to suggest personalized gift ideas based on the recipient, occasion, relationship, and budget. The system combines rule-based filtering with AI-powered selection.</p>

<h3>Recommendation Flow</h3>
<ol>
<li>User provides: recipient type, occasion, relationship, budget range</li>
<li>System filters products by:
  <ul>
    <li>Matching occasions (stored as JSON array on Product)</li>
    <li>Matching recipient types</li>
    <li>Matching relationships</li>
    <li>Price within budget range</li>
  </ul>
</li>
<li>AI ranks the filtered products based on:
  <ul>
    <li>Relevance to the specific occasion</li>
    <li>Popularity (review count, rating)</li>
    <li>Seasonal appropriateness</li>
  </ul>
</li>
<li>Returns ranked product suggestions with AI-generated explanations</li>
</ol>

<h3>Combo Suggestions</h3>
<p>The <code>/api/combo-suggestions</code> endpoint recommends product combinations that work well together (e.g., necklace + earrings, shirt + watch, saree + jewelry set).</p>

<h3>Smart Bundle Creation</h3>
<p>Users can create smart bundles (<code>/api/smartbundle/create</code>) that combine multiple products into a gift package with an overall discount.</p>`,
      subsections: []
    },

    // ─── SECTION 10: AI Assistant Chatbot ────────────────────────────
    {
      id: 'ai-assistant-chatbot',
      title: 'AI Assistant Chatbot',
      content: `<h2>AI Assistant Chatbot</h2>
<p>The AI shopping assistant (<code>/api/ai-assistant</code>) provides a conversational interface for customers to find products, get recommendations, answer questions about policies, and get help with orders.</p>

<h3>Capabilities</h3>
<ul>
<li><strong>Product Search</strong>: Find products by description, category, or features</li>
<li><strong>Gift Recommendations</strong>: Personalized suggestions based on criteria</li>
<li><strong>Policy Questions</strong>: Shipping, returns, exchange policies</li>
<li><strong>Order Help</strong>: Track orders, explain delivery timelines</li>
<li><strong>Styling Advice</strong>: Suggest outfit combinations and accessories</li>
<li><strong>Try-On Guidance</strong>: Help users get the best AI try-on results</li>
</ul>

<h3>Implementation</h3>
<pre><code>// POST /api/ai-assistant
{
  "message": "I need a gift for my wife's birthday under ₹5000",
  "context": { "userId": "...", "sessionId": "..." }
}

// Response
{
  "response": "Here are some wonderful birthday gift ideas for your wife under ₹5,000...",
  "suggestions": [
    { "productId": "...", "name": "...", "price": 4500, "reason": "..." }
  ]
}
</code></pre>

<p>The assistant uses the ZAI chat completions API with a system prompt that includes product catalog data, policies, and conversation context.</p>`,
      subsections: []
    },

    // ─── SECTION 11: Content Moderation ──────────────────────────────
    {
      id: 'content-moderation',
      title: 'Content Moderation',
      content: `<h2>Content Moderation for Selfies</h2>
<p>User-uploaded selfies for AI try-on are moderated before processing to ensure content safety and optimal results.</p>

<h3>Moderation Pipeline</h3>
<ol>
<li><strong>Format Validation</strong>: Check image format, size, and dimensions</li>
<li><strong>Face Detection</strong>: Verify that the image contains exactly one detectable face</li>
<li><strong>Content Safety</strong>: Check for inappropriate or explicit content using VLM</li>
<li><strong>Quality Check</strong>: Verify image is not too blurry, dark, or low resolution</li>
</ol>

<h3>Implementation</h3>
<pre><code>// POST /api/moderate-image
{
  "imageData": "data:image/jpeg;base64,..."
}

// Response
{
  "approved": true,
  "reason": "Image passed all checks",
  "faceDetected": true,
  "qualityScore": 8
}

// If rejected
{
  "approved": false,
  "reason": "No face detected in the image. Please upload a clear selfie.",
  "faceDetected": false
}
</code></pre>

<h3>Selfie Analysis</h3>
<p>The <code>/api/try-on/analyze-selfie</code> endpoint provides detailed analysis of the uploaded selfie before try-on generation:</p>
<ul>
<li>Face position and orientation</li>
<li>Lighting quality</li>
<li>Background complexity</li>
<li>Recommended adjustments for better results</li>
</ul>`,
      subsections: []
    },

    // ─── SECTION 12: Prompt Engineering ──────────────────────────────
    {
      id: 'prompt-engineering',
      title: 'Prompt Engineering',
      content: `<h2>Prompt Engineering for Try-On Strategies</h2>
<p>Each generation strategy uses carefully engineered prompts that maximize color accuracy, face preservation, and natural appearance. The prompts follow a hierarchical priority system where color accuracy is always the #1 rule.</p>

<h3>Dual-Image Prompt Structure</h3>
<pre><code>Professional fashion photograph. {bodyType}.

FIRST IMAGE: A person's selfie — this is the EXACT person who will wear the product.
SECOND IMAGE: The product "{productName}" ({productType}).

Show this EXACT person {placement}. The product must match the SECOND IMAGE exactly.

FACE & PERSON PRESERVATION (HIGHEST PRIORITY):
- The person's face MUST be identical to the FIRST image
- Do NOT change skin tone, hair color, body proportions
- Preserve ALL visible marks, features, characteristics

PRODUCT COLOR ACCURACY (#1 PRIORITY — MOST IMPORTANT RULE):
- COLOR IS THE #1 PRIORITY
- The product's {colorFocus} — refer to the SECOND IMAGE for EXACT colors
- Match the MAIN color precisely: {mainColor}
- If the product is gold, it MUST be gold — not silver, not rose gold
- Colors must match in HUE, SATURATION, and BRIGHTNESS
- A maroon product must stay maroon, NOT become red or burgundy
- EVEN A SLIGHT COLOR SHIFT IS UNACCEPTABLE

NATURAL WEAR & FIT:
- The product must look realistically worn — NOT pasted or floating
- Proper shadows and highlights where product meets body
- Product proportions realistic relative to person's body size

LIGHTING & REALISM:
- Match lighting from the FIRST image (person's selfie)
- Do NOT add dramatic studio lighting

ANTI-HALLUCINATION (STRICT):
- Do NOT invent product details not visible in SECOND IMAGE
- Do NOT remove details that ARE visible
- When in doubt, ALWAYS refer back to the SECOND IMAGE

Studio-quality photorealistic result, 8K quality.
</code></pre>

<h3>Selfie-Edit Prompt Structure</h3>
<p>When only the selfie is available as an image, the prompt includes detailed text descriptions of the product:</p>
<pre><code>Professional fashion photograph. {bodyType} of this EXACT person {placement}.

PRODUCT VISUAL DESCRIPTION:
- COLOR SCHEMA: {colorSummary}
- MAIN COLOR: {mainColor} — MUST be the dominant color, do NOT shift shade
- METAL COLOR: {metalColor} — match warmth/coolness precisely
- MATERIALS: {materials}
- KEY DETAILS: {keyDetails}

FACE & PERSON PRESERVATION (HIGHEST PRIORITY):
1. Keep this person's EXACT face
2. Preserve skin tone EXACTLY
3. Do NOT change hair color, style, or length
4. Preserve body proportions

PRODUCT ACCURACY:
6. The product's {colorFocus}
7. Match the MAIN color: {mainColor}
8. Be precise about the shade (maroon ≠ red ≠ burgundy)
9. Product must look genuinely WORN, not pasted on

LIGHTING: Match from this person's original selfie
</code></pre>

<h3>Product-Edit Prompt Structure</h3>
<p>When only the product is available as an image, the person is described in text:</p>
<pre><code>Professional fashion photograph. {bodyType} showing this EXACT product
"{productName}" ({productType}) being worn by a person.

PERSON DESCRIPTION: {personDescription}

PRODUCT DETAILS (must match EXACTLY as shown in this image):
- MAIN COLOR: {mainColor}
- METAL COLOR: {metalColor}
- MATERIALS: {materials}
- KEY DETAILS: {keyDetails}

CRITICAL RULES:
1. Product colors, materials, and design MUST match EXACTLY
2. {colorFocus}
3. Person should look natural and realistic
4. Product must be the focal point
5. Proper shadows and highlights
6. Realistic proportions relative to person's body
</code></pre>

<h3>Key Prompt Engineering Principles</h3>
<ol>
<li><strong>Priority Hierarchy</strong>: Color accuracy (#1) → Face preservation → Natural wear → Lighting</li>
<li><strong>Explicit Color Matching</strong>: Never use vague terms; specify exact colors with warmth/coolness</li>
<li><strong>Anti-Hallucination Rules</strong>: Explicitly tell the model not to invent or remove details</li>
<li><strong>Reference to Source Images</strong>: Always tell the model which image is the source of truth for colors vs. face</li>
<li><strong>Negative Instructions</strong>: "Do NOT change skin tone", "Do NOT make colors more vivid"</li>
<li><strong>Category-Specific Language</strong>: Jewelry uses "metal tone", sarees use "zari/work color", fragrances use "bottle shape"</li>
</ol>`,
      subsections: []
    }
  ]
};

export default aiStrategyDoc;
