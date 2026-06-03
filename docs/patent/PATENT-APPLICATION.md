# PATENT APPLICATION

**Application Type:** Provisional / Complete Patent Application  
**Date of Filing:** [To be determined]  
**Applicant:** 3 BOXES GIFTS Private Limited  
**Inventors:** [To be listed]  
**Jurisdiction:** India (primary), with PCT and USPTO designations  
**Document Version:** 2.0  
**Last Updated:** March 5, 2026  

---

## 1. TITLE OF INVENTION

**System and Method for AI-Powered Multi-Strategy Virtual Try-On with Vision Language Model Verification and Color Accuracy Refinement for Non-Wearable Luxury Presentation Items**

---

## 2. ABSTRACT

A system and method for generating photorealistic virtual try-on images for luxury e-commerce products is disclosed. The invention employs a multi-strategy pipeline that generates candidate try-on images using four distinct strategies—dual-image edit, selfie-edit, product-edit, and text-to-image generation—and selects the optimal result through a Vision Language Model (VLM) verification process that scores each candidate against the original product image for color accuracy, product fidelity, and realistic placement. The dual-image edit strategy is specifically novel in passing both the user's selfie image and the product reference image simultaneously to an AI image editing model, enabling the model to perceive actual product colors rather than relying on text descriptions, which is critical for luxury product color fidelity. When VLM verification identifies color accuracy below a predefined threshold, the system initiates a color accuracy refinement loop that extracts hex-code-level color specifications from the VLM analysis and performs a targeted refinement pass to correct product colors while preserving the user's facial features and body. The system further incorporates category-aware prompt engineering that dynamically adjusts generation prompts based on product category and sub-category (e.g., jewelry sub-classified into earrings, necklace, bracelet, ring, and set; luxury gift boxes sub-classified by occasion, size, and wrapping style), cross-platform deployment with an intelligent proxy architecture, canvas overlay fallback when AI services are unavailable, and automatic watermarking of generated images. Critically, the invention extends beyond traditional wearable virtual try-on to encompass non-wearable luxury presentation items—specifically luxury gift boxes, gift packaging, and presentation cases—enabling users to visualize themselves holding, receiving, or presenting luxury gift packaging through AI-generated imagery, a capability entirely absent from the existing patent landscape. The invention addresses critical limitations in existing virtual try-on systems including color inaccuracy, absence of quality verification, reliance on single generation strategies, lack of iterative refinement mechanisms, and the complete absence of gift packaging visualization in any prior art.

---

## 3. BACKGROUND OF THE INVENTION

### 3.1 Field of the Invention

The present invention relates generally to the field of computer-implemented virtual try-on systems for electronic commerce. More specifically, the invention relates to an artificial intelligence-powered multi-strategy virtual try-on system that utilizes Vision Language Model verification, hex-code-based color extraction, category-aware prompt engineering, and iterative color accuracy refinement for generating photorealistic product visualization images in the luxury e-commerce domain, with particular application to both wearable products (jewelry, sarees, watches) and non-wearable luxury presentation items (gift boxes, gift packaging, and presentation cases).

The invention finds particular application in luxury e-commerce platforms where color accuracy of products such as jewelry, sarees, watches, and luxury gift packaging is of paramount importance, and where existing virtual try-on systems fail to maintain product color fidelity sufficient for high-value purchase decisions. The invention further addresses a critical gap in the art: the complete absence of any virtual try-on or visualization system for luxury gift packaging, a category of luxury goods for which no prior art exists.

### 3.2 Description of Related Art

Virtual try-on technology has been the subject of significant research and patent activity. The following prior art is relevant to the present invention, organized by assignee and technology domain:

#### 3.2.1 Snap Inc. — Augmented Reality Virtual Try-On

**US 11,830,118** (Snap Inc.) — "Virtual Clothing Try-On." This patent discloses systems and methods for virtual clothing try-on using augmented reality. The system captures a user's image via a device camera and overlays virtual clothing items onto the user's body using AR technology. The system employs body tracking and garment modeling to position virtual clothing. However, the patent is limited to wearable clothing items and does not employ AI-based generative image editing, multi-strategy selection, VLM-based quality verification, or any form of color accuracy refinement. The system is fundamentally an AR overlay approach rather than an AI generation approach.

**US 2019/0130649 A1** (Snap Inc.) — "Clothing Model Generation and Display System." This patent application discloses generating and displaying clothing models on a user's image. The system creates a three-dimensional clothing model and displays it on the user's body in a captured image. The approach relies on 3D model generation and AR overlay, which fundamentally differs from the present invention's AI image generation approach. The patent does not address color accuracy verification, multi-strategy generation, or non-wearable product categories. The system is specifically directed to clothing and does not contemplate gift packaging or presentation items.

#### 3.2.2 Amazon — Blended Reality and Virtual Store Systems

**US 11,315,162 / US 2016/0292917 A1** (Amazon) — "Blended Reality Systems." This patent discloses a blended reality system that combines physical and virtual elements for product visualization. The system captures a user's image and generates a blended image showing the user with virtual products. While the system allows for product visualization on a user's image, it relies on blending techniques rather than AI generative image editing. The patent does not disclose VLM verification, multi-strategy generation with automated selection, color accuracy refinement, or any application to non-wearable presentation items. The focus is exclusively on wearable products such as clothing and accessories.

**US 11,580,592 B2** (Amazon) — "Customized Virtual Store." This patent discloses a system for providing a customized virtual store experience. The system generates personalized virtual store environments and product displays based on user preferences and behavior. While it addresses personalization in virtual shopping, it does not involve AI-generated virtual try-on images, VLM verification, color accuracy refinement, or any visualization of products on a user's person. The patent is directed to virtual store layout and product presentation rather than virtual try-on.

#### 3.2.3 Google/Alphabet — AI-Based Clothing Generation

**US 11,158,121 B1** (Google/Alphabet) — "Generating Accurate and Realistic Clothing for Body Pose" (TryOnDiffusion). This patent focuses on generating clothing that accurately conforms to a user's body pose using diffusion models. The system employs a parallel diffusion architecture to generate realistic clothing try-on images. While it addresses realism through diffusion-based generation, it employs a single generation approach without quality verification, does not address color accuracy as a specific concern with hex-code precision, and does not incorporate category-specific prompt engineering or iterative refinement loops. The system optimizes for body pose accuracy and garment fit rather than product color accuracy. Critically, the patent is entirely directed to clothing/wearable garments and does not contemplate non-wearable product visualization.

#### 3.2.4 Zugara — AR Overlay Patents (Active Litigation)

**US 8,275,590** (Zugara) — "Simulation of Trying on Virtual-Wearable Items Within a Video Feed." This patent discloses a system for simulating the trying on of virtual wearable items within a live video feed. The system uses augmented reality to overlay virtual wearable items (primarily clothing) onto a user's live video feed, tracking the user's movements to maintain alignment. The system relies on AR overlay technology rather than AI generative image editing. It does not employ VLM verification, multi-strategy generation, color accuracy refinement, or any quality scoring mechanism. The patent is directed to wearable items within a video feed context.

**US 10,482,517 B2** (Zugara) — "Real-Time Augmented Reality Overlays for Virtual Product Try-On." This patent discloses systems and methods for real-time AR overlays for virtual product try-on. The system overlays virtual products onto a user's image in real-time using augmented reality. This patent has been asserted in litigation against Warby Parker, Estée Lauder, and Chanel (filed July 2024, W.D. Texas). The claims are broadly directed to AR overlay systems for virtual product try-on and could potentially be construed to cover any AR overlay on a user image. However, the patent does not employ AI generative techniques, does not include VLM verification, multi-strategy generation, color accuracy refinement, or any application to non-wearable gift packaging. The system is fundamentally an AR overlay approach rather than an AI generation approach, and it operates in real-time on video feeds rather than generating static photorealistic images.

#### 3.2.5 Deep Learning-Based Virtual Try-On

**US 2022/0318892 A1** — "Clothing Virtual Try-On Based on Deep Learning." This patent application discloses a deep learning-based approach for clothing virtual try-on. While it employs neural networks for image generation, it uses a single generation model without quality verification, does not address color accuracy as a specific concern, and does not incorporate category-specific prompt engineering or refinement loops. The patent is specifically directed to clothing virtual try-on.

#### 3.2.6 Real-Time Calibration Systems

**US 12,017,142 B2** — "Real-Time Calibration of Virtual Try-On." This patent discloses an augmented reality and AI-based virtual try-on system with real-time calibration capabilities. While it uses AI for try-on generation, it relies on a single generation approach, does not employ VLM-based quality verification, and does not include color accuracy refinement or category-aware prompt engineering. The real-time calibration addresses spatial positioning accuracy rather than color fidelity.

#### 3.2.7 Image Processing-Based Virtual Dressing

**US 2020/0183969 A1** — "Virtual Dressing Utilizing Image Processing." This patent discloses a virtual dressing system using image processing techniques. The system processes a single generation pathway without quality verification, does not address color accuracy specifically, and does not employ iterative refinement or VLM-based scoring. The patent is directed to wearable clothing items.

#### 3.2.8 Hierarchical Text-Driven Virtual Try-On

**US 11,922,550 B1** — "Hierarchical Text-Driven Virtual Try-On." This patent discloses a system for hierarchical text-driven virtual try-on that uses text prompts at multiple levels of detail to guide image generation. While the system uses text-driven generation (which shares a conceptual similarity with the present invention's prompt engineering), it does not employ VLM verification, multi-strategy generation with automated best-result selection, color accuracy refinement, or hex-code-based color extraction. The hierarchical text approach is fundamentally different from the present invention's category-aware prompt engineering combined with VLM verification and iterative color refinement.

#### 3.2.9 Hybrid Virtual and Physical Shopping

**US 10,810,647 B2** — "Hybrid Virtual and Physical Jewelry Shopping Experience." This patent discloses a hybrid shopping system combining virtual and physical jewelry shopping experiences. The system allows users to browse jewelry virtually and then transition to a physical store experience. While the patent addresses jewelry as a product category, it does not involve AI-generated virtual try-on images, VLM verification, color accuracy refinement, or any form of generative visualization. The system is a shopping workflow management tool rather than a virtual try-on system.

#### 3.2.10 Virtual Try-On for Spectacles

**US 2021/0049830 A1** — "Virtual Try-On for Spectacles." This patent discloses a virtual try-on system specifically for eyeglasses and spectacles. The system uses face tracking and 3D model rendering to overlay virtual eyeglasses onto a user's face. The patent is specifically directed to spectacles and does not employ AI generative image editing, VLM verification, multi-strategy generation, color accuracy refinement, or any application beyond eyewear. It represents another example of the wearable-specific nature of existing virtual try-on patents.

#### 3.2.11 Additional Prior Art

**CN104021590A** — "Virtual try-on system using AR technology" (China). This patent discloses a virtual try-on system employing augmented reality technology to overlay clothing items onto a user's image. The system uses AR markers and tracking to position virtual garments. However, the system relies on predetermined cloth models and does not employ AI-based generation, multi-strategy selection, or any form of quality verification.

**US12205209B1** — "Virtual try-on based on predetermined cloth." This patent discloses a system that uses an input image combined with text descriptions and a clothing image to generate virtual try-on results. The system processes a single input path and does not employ multiple generation strategies, VLM-based verification, or iterative refinement. It relies on predetermined cloth models rather than AI-generated visualizations.

**US6546309B1** — "Virtual fitting room." This patent discloses a virtual fitting room using a mathematical body model to simulate clothing fit on a user's body. The system uses geometric transformations based on body measurements rather than AI-generated imagery. It does not address color accuracy, does not employ VLM verification, and is limited to geometric fitting without photorealistic rendering.

**US5930769A** — "Fashion shopping system with virtual mannequin." This patent discloses a fashion shopping system that uses a virtual mannequin for product visualization. The system is template-based and does not use AI generation, does not verify output quality, and does not address color accuracy for luxury products.

**GB2488237A** — "Body model of user to show fit of clothing." This patent discloses creating a body model of the user to visualize clothing fit. The system focuses on fit visualization using body modeling rather than AI-generated photorealistic imagery, and does not employ VLM verification, multi-strategy generation, or color refinement.

**US20150154691A1** — "Online virtual fitting room with 3D scanning." This patent discloses a virtual fitting room using 3D body scanning technology. The system requires specialized 3D scanning hardware and uses 3D model-based visualization rather than AI-generated images. It does not address color accuracy, VLM verification, or multi-strategy generation.

**EP3877954A4** — "Learning-based animation of clothes" (Meta). This patent, assigned to Meta, discloses learning-based techniques for animating clothing on virtual avatars. While it employs deep learning for clothing simulation, it focuses on animation rather than static try-on visualization, does not use VLM verification, does not address color accuracy refinement, and is directed at avatar animation rather than e-commerce try-on.

### 3.3 Patent Landscape Analysis and Gap Identification

A comprehensive analysis of the patent landscape reveals a critical gap in the existing art that the present invention uniquely addresses.

#### 3.3.1 What EXISTS in the Patent Landscape

The following virtual try-on domains have extensive or growing patent coverage:

| Domain | Patent Coverage | Key Patents | Saturation Level |
|---|---|---|---|
| Virtual try-on for clothing | Extensive | US 11,830,118; US 11,158,121 B1; US 2022/0318892 A1 | **HIGH** — Heavily patented by major technology companies |
| Virtual try-on for spectacles/eyewear | Multiple | US 2021/0049830 A1; US 10,482,517 B2 | **HIGH** — Well-covered domain |
| Virtual try-on for makeup/cosmetics | Multiple | Zugara patents (asserted against Estée Lauder) | **MODERATE-HIGH** |
| Virtual try-on for jewelry | Limited | US 10,810,647 B2; US 10,482,517 B2 | **MODERATE** — Growing but limited specific coverage |
| AI generative product visualization | Growing | US 11,158,121 B1 (TryOnDiffusion) | **MODERATE** — Emerging field |
| AR overlay on user image | Broad | US 8,275,590; US 10,482,517 B2 (Zugara) | **HIGH** — Broad foundational patents exist |
| Gift box physical wrapping | Tangential | Various packaging patents | **LOW** — Only physical wrapping, no virtual visualization |

#### 3.3.2 What does NOT Exist in the Patent Landscape (WHITE SPACE)

The following domains have **zero patent coverage** and represent clear white space in the patent landscape:

| Domain | Patent Coverage | Status |
|---|---|---|
| Virtual try-on for gift boxes | **NONE** | **WHITE SPACE** |
| AR/AI visualization of gift packaging on user | **NONE** | **WHITE SPACE** |
| AI-generated images of user holding/receiving luxury gift box | **NONE** | **WHITE SPACE** |
| Luxury gift box virtual try-on using AI image generation | **NONE** | **WHITE SPACE** |
| Non-wearable luxury presentation item virtual visualization | **NONE** | **WHITE SPACE** |
| Gift packaging virtual try-on with color accuracy verification | **NONE** | **WHITE SPACE** |

**CRITICAL FINDING:** The concept of "luxury gift box virtual try-on using AI image generation" is not patented by any entity. This represents a significant white space in the patent landscape that the present invention uniquely occupies. No prior art reference—among the 13 key patents identified or any other reference found in comprehensive searches—discloses or suggests the visualization of non-wearable luxury presentation items (gift boxes, gift packaging, presentation cases) on a user's person using AI-generated imagery.

#### 3.3.3 Significance of the White Space

The absence of any patent covering virtual try-on for gift packaging is significant for several reasons:

1. **Market Need:** Luxury gift boxes are high-value products where the visual presentation and unboxing experience are critical purchase drivers. Customers purchasing luxury gift boxes want to visualize the gift presentation before buying.

2. **Technical Distinction:** Gift boxes are non-wearable items that are held, presented, or received—fundamentally different from wearable items (clothing, jewelry, spectacles) that are placed on the body. This distinction requires entirely different generation strategies, placement logic, and prompt engineering.

3. **Emotional Dimension:** Unlike wearable try-on (which focuses on "how does this look on me"), gift box visualization addresses an emotional dimension—"how would I look receiving this gift?" or "how would this look when I present it?"—that requires different AI generation approaches focusing on expressions, gestures, and contextual scene generation.

4. **Category Novelty:** No existing virtual try-on system contemplates gift packaging as a product category, meaning the category-aware prompt engineering, placement instructions, and framing rules for gift boxes are entirely novel.

### 3.4 Problems with Existing Solutions

The existing art suffers from several critical deficiencies that the present invention addresses:

**a) Color Inaccuracy:** None of the existing patents specifically address the problem of color fidelity in virtual try-on. In luxury e-commerce, where a deep maroon (#8B1A1A) must not be rendered as bright red (#FF0000), color inaccuracy directly impacts purchase decisions and return rates. Existing systems treat color as a secondary concern or rely on text-based color descriptions that fail to capture the nuanced color palettes of luxury products.

**b) Absence of Quality Verification:** No existing patent discloses the use of a Vision Language Model to independently verify and score the quality of generated try-on images against the original product. Existing systems generate a single output and present it to the user without any automated quality assessment, resulting in inconsistent user experiences.

**c) Single-Strategy Generation:** All existing patents rely on a single generation approach. If that approach fails to produce a satisfactory result for a particular product category, body type, or image composition, there is no alternative path. The present invention's multi-strategy pipeline with automated best-result selection provides significantly higher success rates.

**d) No Iterative Refinement:** Existing systems lack any mechanism for iterative refinement of generated images. When the output has identifiable deficiencies (such as color mismatch), the user must accept the flawed result or abandon the try-on entirely. The present invention's color accuracy refinement loop addresses this deficiency.

**e) Lack of Category-Specific Intelligence:** Existing systems treat all product categories identically, using the same generation parameters for jewelry as for sarees. The present invention recognizes that different product categories require fundamentally different generation strategies, placement instructions, and framing rules.

**f) No Fallback Mechanisms:** Existing systems fail entirely when AI services are unavailable. The present invention provides a canvas overlay fallback that maintains user engagement even during service outages.

**g) Insufficient Cross-Platform Support:** Existing patents do not address the challenges of deploying virtual try-on across local development, serverless cloud, and mobile PWA environments with intelligent proxy routing.

**h) Complete Absence of Non-Wearable Product Visualization:** Most critically, every existing virtual try-on patent is directed to wearable items—clothing, jewelry, spectacles, or makeup. No patent addresses the visualization of non-wearable luxury presentation items such as gift boxes, gift packaging, or presentation cases. The present invention uniquely extends virtual try-on technology to this entirely uncovered product domain, requiring novel generation strategies (e.g., "user holding a gift box," "user receiving a gift," "gift box on a table beside the user"), placement logic, and emotional context rendering that have no precedent in the prior art.

---

## 4. SUMMARY OF THE INVENTION

### 4.1 Key Novel Features

The present invention introduces the following novel features not found in the prior art:

**Feature 1: Multi-Strategy Pipeline with VLM Verification.** The system generates candidate try-on images using four distinct strategies (dual-image edit, selfie-edit, product-edit, and text-to-image) and then employs a Vision Language Model (VLM) to independently verify and score each result against the original product image. The VLM evaluates each candidate on dimensions including color accuracy, product fidelity, realistic placement, and overall quality, and the highest-scoring candidate is selected as the final output. No existing patent discloses the use of VLM-based verification for virtual try-on quality assurance.

**Feature 2: Dual-Image Edit with Product Color Fidelity.** The system passes both the user's selfie image and the product reference image simultaneously to the AI image editing API. This "dual-image edit" strategy enables the generative model to directly perceive the actual colors of the product from the reference image, rather than relying on text descriptions of color, which are inherently imprecise for luxury product color nuances. This is specifically designed for and critical to luxury product color accuracy.

**Feature 3: Category-Aware Prompt Engineering Including Non-Wearable Categories.** The system dynamically adjusts generation prompts based on the product's category (jewelry, saree, watch, luxury gift box, etc.) with specific placement instructions, body type framing, and color focus rules. Jewelry is further sub-classified into earrings, necklace, bracelet, ring, and set categories, each receiving distinct placement instructions. Luxury gift boxes are sub-classified by occasion (birthday, anniversary, wedding, festival), size (small, medium, large), and wrapping style (ribbon, floral, minimalist), each receiving distinct generation instructions (e.g., "user holding a medium luxury gift box with ribbon wrapping" vs. "user receiving a large anniversary gift box"). This category-specific intelligence significantly improves generation quality and, critically, extends to non-wearable product categories not contemplated by any prior art.

**Feature 4: Color Accuracy Refinement Loop.** When the VLM verification scores color accuracy below a predefined threshold (e.g., 7 out of 10), the system automatically initiates a refinement pass. The refinement uses the specific color mismatch description extracted by the VLM (e.g., "the product appears bright red instead of deep maroon") to generate a targeted correction prompt that adjusts only the product colors while preserving the user's facial features and body composition.

**Feature 5: Hex-Code-Based Color Extraction.** The VLM analysis extracts product colors with specific hex code specifications (e.g., "deep maroon red #8B1A1A" rather than simply "red"). These hex-code-level color specifications are incorporated into generation and refinement prompts, enabling precise color matching that text-only descriptions cannot achieve.

**Feature 6: Non-Wearable Luxury Presentation Item Visualization.** The system generates AI images of users holding, receiving, or presenting luxury gift boxes and gift packaging—a capability entirely absent from the patent landscape. This feature includes: (a) gift-box-specific placement logic (held in hands, placed on surface, being opened); (b) emotional context rendering (surprise, joy, anticipation expressions); (c) occasion-aware scene generation (birthday setting, anniversary dinner, wedding venue); and (d) packaging detail fidelity (ribbon texture, box material, wrapping pattern accuracy). No prior art discloses or suggests virtual try-on for non-wearable luxury presentation items.

**Feature 7: Luxury E-Commerce Integration.** The system is fully integrated with Shopify headless commerce, supporting affiliate platform products from multiple e-commerce platforms (Amazon, Flipkart, Myntra, etc.), and includes AI-generated product pairing suggestions based on category relationships (e.g., suggesting a necklace to pair with earrings, suggesting a gift box to pair with a jewelry item).

**Feature 8: Cross-Platform Deployment with Proxy Architecture.** The system deploys across local development environments, Vercel serverless functions, and Android PWA with an intelligent proxy architecture that automatically detects the optimal AI service access path based on the deployment environment, including fallback routing when direct API access is unavailable.

**Feature 9: Canvas Overlay Fallback.** When AI generation services are completely unavailable, a client-side canvas compositing system creates a premium-looking style preview by overlaying the product image on the user's selfie with sophisticated visual effects including product overlay with opacity blending, vignette effect, brand watermark, and decorative elements, maintaining user engagement even during service outages.

**Feature 10: Automatic Watermarking.** All generated try-on images are automatically watermarked with the "3BOXES GIFTS - AI Style Preview" branding using Sharp image processing library, including semi-transparent overlay text with brand identification, protecting intellectual property and maintaining brand consistency across all generated outputs.

### 4.2 Advantages Over Prior Art

The present invention provides the following advantages over existing solutions:

1. **Higher Color Accuracy:** The dual-image edit strategy combined with VLM verification and hex-code-based color extraction produces try-on images with significantly higher color fidelity than text-prompt-based systems.

2. **Higher Success Rate:** The multi-strategy pipeline ensures that if one generation strategy fails to produce a quality result, alternative strategies are automatically attempted, resulting in a dramatically higher overall success rate compared to single-strategy systems.

3. **Quality Assurance:** VLM-based verification ensures that every output meets minimum quality standards before presentation to the user, eliminating the inconsistent experiences common in existing systems.

4. **Iterative Improvement:** The color accuracy refinement loop allows the system to improve suboptimal results rather than accepting them, a capability absent from all prior art.

5. **Category Optimization:** Category-aware prompt engineering produces results that are specifically optimized for each product type, rather than using a one-size-fits-all approach.

6. **Resilience:** The canvas overlay fallback and cross-platform proxy architecture ensure the system degrades gracefully rather than failing completely.

7. **Brand Protection:** Automatic watermarking protects generated content and maintains brand consistency.

8. **Unprecedented Product Category Coverage:** The extension to non-wearable luxury presentation items (gift boxes, gift packaging) provides a capability that no existing virtual try-on system offers, addressing an entirely unserved market need in luxury e-commerce.

### 4.3 Brief Description of the System

The system comprises: (a) a frontend user interface for selfie upload and product selection; (b) a multi-strategy generation pipeline that produces multiple candidate images; (c) a VLM verification module that scores each candidate; (d) a color accuracy refinement loop; (e) category-aware prompt engineering logic including non-wearable luxury presentation item categories; (f) a cross-platform proxy architecture; (g) a canvas overlay fallback system; (h) an automatic watermarking module; and (i) e-commerce integration with Shopify and affiliate platforms.

---

## 5. DETAILED DESCRIPTION

### 5.1 System Architecture

The system architecture comprises the following principal components:

**5.1.1 Frontend Layer**

The frontend layer consists of a Next.js 16 web application with server-side rendering capabilities, providing:
- Selfie upload interface with camera capture and file upload options
- Product browsing and selection interface integrated with product catalog
- Try-on result display with before/after comparison
- Style pairing suggestion display
- Progressive web app (PWA) capabilities for Android deployment

**5.1.2 API Layer**

The API layer consists of Next.js API routes handling:
- Image upload and preprocessing
- Multi-strategy generation orchestration
- VLM verification requests
- Color refinement loop management
- Proxy routing for AI service access
- Watermarking and image post-processing
- E-commerce platform integration

**5.1.3 AI Service Layer**

The AI service layer interfaces with:
- Image editing AI models (for dual-image edit, selfie-edit, and product-edit strategies)
- Text-to-image AI models (for text-to-image strategy)
- Vision Language Models (for verification and scoring)
- AI assistant models (for product pairing suggestions)

**5.1.4 Integration Layer**

The integration layer provides:
- Shopify Storefront API integration for product data and checkout
- Affiliate platform API integration (Amazon Associates, Flipkart, Myntra, etc.)
- Image proxy service for cross-origin product images
- Currency and geo-location services

**5.1.5 Fallback Layer**

The fallback layer provides:
- Canvas overlay compositing engine (client-side)
- Degraded-mode style preview generation
- Service health monitoring and automatic fallback triggering

### 5.2 Pipeline Phases

The virtual try-on pipeline operates in five distinct phases:

**Phase 1: Input Acquisition and Preprocessing**

The system receives the following inputs:
- User selfie image (uploaded or camera-captured)
- Product identifier referencing a product in the catalog
- Product metadata including category, sub-category, name, description, and price
- Product reference image (from product catalog)

Preprocessing steps include:
- Selfie image validation (minimum resolution, face detection confirmation)
- Selfie image resizing to optimal generation dimensions
- Product image retrieval and format normalization
- Category and sub-category classification lookup
- Color extraction from product image using VLM analysis

**Phase 2: Multi-Strategy Generation**

The system generates candidate try-on images using four distinct strategies, executed in parallel or sequentially based on configuration:

a) **Strategy 1 — Dual-Image Edit:** Both the user's selfie and the product reference image are passed simultaneously to the AI image editing API. The prompt instructs the model to overlay the product from the reference image onto the person in the selfie. This strategy maximizes color accuracy because the model directly observes the product's actual colors from the reference image. For non-wearable items (e.g., gift boxes), the prompt instructs the model to show the person holding, receiving, or presenting the product.

b) **Strategy 2 — Selfie-Edit:** The user's selfie image is passed to the AI image editing API along with a text-based description of the product (including extracted hex-code colors). The prompt instructs the model to add the described product to the person in the selfie. This strategy provides an alternative when the dual-image approach does not produce optimal results.

c) **Strategy 3 — Product-Edit:** The product reference image is passed to the AI image editing API along with a text-based description of the user (derived from selfie analysis). The prompt instructs the model to place a person matching the described features wearing/holding the product. This strategy is particularly effective for products that dominate the visual frame, such as sarees, and for gift boxes where the packaging detail is critical.

d) **Strategy 4 — Text-to-Image:** A comprehensive text prompt combining descriptions of both the user (from selfie analysis) and the product (from catalog data and VLM color extraction) is passed to a text-to-image generation model. This strategy serves as the final fallback when image-based strategies are unavailable.

**Phase 3: VLM Verification and Scoring**

Each candidate image generated in Phase 2 is submitted to a Vision Language Model for independent verification and scoring. The VLM is provided with:
- The generated try-on candidate image
- The original product reference image
- A structured evaluation prompt

The VLM evaluates each candidate on the following dimensions, each scored on a scale of 1-10:
- **Color Accuracy:** How accurately do the product colors in the try-on image match the original product reference image?
- **Product Fidelity:** How faithfully does the product in the try-on image replicate the design, pattern, and details of the original product?
- **Placement Realism:** How naturally and realistically is the product positioned on the person?
- **Face Preservation:** How well are the person's facial features preserved?
- **Overall Quality:** The overall photorealistic quality of the composite image.

The VLM also provides:
- A textual description of any color mismatches identified
- Specific hex-code-level color corrections needed
- A recommendation on whether refinement would improve the result

**Phase 4: Selection and Optional Refinement**

Based on the VLM scores, the system selects the highest-scoring candidate. If the selected candidate's color accuracy score falls below a configurable threshold (default: 7 out of 10), the system initiates the Color Accuracy Refinement Loop:

a) The VLM's color mismatch description and hex-code corrections are extracted.
b) A refinement prompt is constructed that specifically instructs the model to correct the identified color issues while preserving all other elements (face, body, background).
c) The selected candidate image is passed back to the AI image editing API with the refinement prompt.
d) The refined image is re-submitted to the VLM for verification.
e) If the refined image scores higher than the original, it replaces the original as the final output.
f) The refinement loop is limited to a configurable maximum number of iterations (default: 2) to prevent infinite loops.

**Phase 5: Post-Processing and Delivery**

The final selected image undergoes the following post-processing:
- Automatic watermarking with "3BOXES GIFTS - AI Style Preview" branding using Sharp image processing
- Image optimization for web delivery (compression, format conversion)
- Caching of the result for future retrieval
- Delivery to the frontend for display with before/after comparison

### 5.3 Multi-Strategy Generation — Detailed Description

**5.3.1 Dual-Image Edit Strategy**

The dual-image edit strategy represents a key innovation of the present invention. Traditional virtual try-on systems pass either the user's image with a text description of the product, or the product image with instructions to place it on a generic model. The dual-image edit strategy passes BOTH images simultaneously to the AI image editing model.

The technical implementation is as follows:
- The user's selfie image is provided as the primary input image
- The product reference image is provided as a secondary reference image
- The generation prompt includes instructions such as: "Look at the product shown in the reference image. Place this exact product on the person in the selfie photo. Match the exact colors, design, and details from the reference image. The product colors must precisely match what you see in the reference image."
- For non-wearable luxury presentation items, the generation prompt includes instructions such as: "Look at the luxury gift box shown in the reference image. Show the person in the selfie photo holding this exact gift box. Match the exact colors, ribbon design, wrapping pattern, and box material from the reference image. The person should be holding the gift box with both hands, with a warm, pleased expression."

The key advantage is that the generative model directly observes the product's actual colors and design from the reference image, eliminating the information loss that occurs when converting visual color information to text descriptions. For luxury products where subtle color differences (e.g., rose gold vs. yellow gold, deep maroon vs. burgundy, ivory white vs. pearl white gift box) significantly impact product perception and purchase decisions, this direct visual reference is critical.

**5.3.2 Selfie-Edit Strategy**

The selfie-edit strategy uses the user's selfie as the base image with a text prompt describing the product:
- The user's selfie image is provided as the input image
- A text prompt is constructed incorporating: product name, product category, extracted hex-code colors, design description, and placement instructions
- The prompt follows the category-aware template for the specific product category

This strategy is advantageous when the product reference image is low quality or when the AI model better handles text-based product descriptions for certain product types.

**5.3.3 Product-Edit Strategy**

The product-edit strategy uses the product image as the base with text describing the user:
- The product reference image is provided as the input image
- A text prompt describes the target person's characteristics derived from selfie analysis (gender presentation, skin tone, hair style, body type)
- The prompt instructs the model to show a person with the described characteristics wearing/holding the product

This strategy is particularly effective for full-body products like sarees where the product dominates the visual composition, and for gift boxes where the packaging detail is critical and must be preserved accurately.

**5.3.4 Text-to-Image Strategy**

The text-to-image strategy generates an entirely new image from text:
- A comprehensive text prompt combines descriptions of both the person and the product
- The prompt includes category-specific styling, lighting, and composition instructions
- No input image is required, making this strategy available even when image-based APIs are inaccessible

This strategy serves as the ultimate fallback and is also useful for generating inspirational style images when the user has not provided a selfie.

### 5.4 VLM Verification and Scoring — Detailed Description

**5.4.1 Verification Prompt Structure**

The VLM verification uses a structured evaluation prompt that presents the VLM with both the generated candidate image and the original product reference image. The evaluation prompt is structured as follows:

```
You are a quality verification system for AI-generated virtual try-on images. 
Compare the TRY-ON RESULT image with the ORIGINAL PRODUCT image.

Evaluate on these criteria (1-10 scale):

1. COLOR_ACCURACY: How precisely do the product colors in the try-on match the original?
   - Focus specifically on the product's primary color, secondary colors, and metallic tones
   - For gift boxes: evaluate box color, ribbon color, wrapping pattern colors, and material finish
   - A score below 7 indicates significant color deviation

2. PRODUCT_FIDELITY: How faithfully does the product design/pattern replicate the original?
   - Evaluate design details, patterns, textures, and structural elements
   - For gift boxes: evaluate ribbon style, bow shape, wrapping pattern, box proportions

3. PLACEMENT_REALISM: How naturally and realistically is the product placed on the person?
   - Consider proportional accuracy, lighting consistency, and physical plausibility
   - For gift boxes: consider natural hand positioning, grip realism, and spatial proportion

4. FACE_PRESERVATION: How well are the person's original facial features preserved?
   - Face should remain recognizable and unaltered
   - Expression should be appropriate (e.g., pleased, surprised for gift receiving)

5. OVERALL_QUALITY: Overall photorealistic quality of the composite image

For COLOR_ACCURACY specifically:
- If below 7, describe the color mismatch in detail
- Provide the correct hex codes for the product colors as seen in the original
- Provide the incorrect hex codes for the colors as they appear in the try-on
- Describe what correction is needed

Output format: JSON with scores, color_analysis, and refinement_recommendation fields.
```

**5.4.2 Scoring and Selection Algorithm**

The selection algorithm operates as follows:

1. Each candidate receives a composite score calculated as a weighted average:
   - Color Accuracy: weight 0.35 (highest priority for luxury products)
   - Product Fidelity: weight 0.25
   - Placement Realism: weight 0.20
   - Face Preservation: weight 0.10
   - Overall Quality: weight 0.10

2. The candidate with the highest composite score is selected as the primary result.

3. If the selected candidate's Color Accuracy score is below the threshold (default: 7/10), the refinement process is triggered.

4. If multiple candidates have composite scores within a configurable margin (default: 0.5 points), the candidate with the higher Color Accuracy score is preferred.

### 5.5 Color Accuracy Refinement Loop — Detailed Description

The color accuracy refinement loop is a novel iterative process that uses VLM-derived color analysis to improve generated images. The process operates as follows:

**Iteration 1:**

a) Extract the VLM's color mismatch analysis from the verification phase, including:
   - Description of the color deviation (e.g., "The necklace appears bright gold #FFD700 instead of rose gold #B76E79"; "The gift box ribbon appears bright red #FF0000 instead of deep burgundy #800020")
   - Target hex codes from the original product image
   - Current incorrect hex codes from the generated image

b) Construct a refinement prompt incorporating the extracted color information:
   ```
   Edit this image to correct the product colors. The [PRODUCT] should be 
   [TARGET_COLOR_NAME] with hex code [TARGET_HEX], but currently appears as 
   [CURRENT_COLOR_NAME] with hex code [CURRENT_HEX]. Change ONLY the product 
   colors to match the target. Do NOT alter the person's face, skin tone, 
   body, or background. The corrected color should be exactly [TARGET_HEX].
   ```

c) Submit the current best candidate image and the refinement prompt to the AI image editing API.

d) Submit the refined result to the VLM for re-verification.

e) If the refined image's composite score exceeds the original's, accept the refinement. Otherwise, discard it and retain the original.

**Iteration 2 (if needed):**

f) If the first refinement improved the result but color accuracy remains below the threshold, a second refinement iteration is attempted using the updated VLM analysis from step (d).

g) The maximum number of refinement iterations is configurable (default: 2).

h) After the maximum number of iterations, the best available result is selected regardless of color accuracy score.

### 5.6 Category-Aware Prompt Engineering — Detailed Description

**5.6.1 Category Configuration Structure**

The system maintains a configuration data structure that maps product categories to generation parameters:

```
Category: JEWELRY
  Sub-categories:
    EARRINGS:
      Placement: "on the ears"
      Framing: "close-up face and neck, ears clearly visible"
      Focus: "earring design, gemstone colors, metallic finish"
      ColorPriority: "gemstone_primary, metal_tone"
    
    NECKLACE:
      Placement: "draped around the neck"
      Framing: "upper body portrait, neck and collarbone area"
      Focus: "pendant design, chain style, clasp detail"
      ColorPriority: "pendant_color, chain_metal_tone"
    
    BRACELET:
      Placement: "on the wrist"
      Framing: "hand and wrist close-up, arm visible"
      Focus: "bracelet design, clasp, band material"
      ColorPriority: "band_color, gemstone_accents"
    
    RING:
      Placement: "on the finger"
      Framing: "hand close-up, ring finger prominently displayed"
      Focus: "ring design, stone setting, band width"
      ColorPriority: "stone_color, metal_band_tone"
    
    SET:
      Placement: "wearing matching earrings, necklace, and bracelet"
      Framing: "upper body portrait showing all pieces"
      Focus: "coordinated design, matching elements"
      ColorPriority: "primary_gemstone, metal_tone_across_pieces"

Category: SAREE
  Placement: "wrapped elegantly around the body in traditional drape"
  Framing: "full body portrait, showing pallu, pleats, and blouse"
  Focus: "fabric texture, border design, pallu pattern"
  ColorPriority: "primary_fabric_color, border_color, pallu_accent"

Category: WATCH
  Placement: "on the wrist, strap fastened, face visible"
  Framing: "wrist and forearm close-up, watch face clearly visible"
  Focus: "dial design, strap material, case finish"
  ColorPriority: "dial_color, strap_color, case_metal_tone"

Category: LUXURY_GIFT_BOX
  ProductType: NON_WEARABLE
  Sub-categories:
    BY_OCCASION:
      BIRTHDAY:
        Placement: "person holding gift box with both hands, slightly elevated"
        Framing: "upper body portrait, gift box prominently displayed at chest level"
        Expression: "warm smile, excited anticipation"
        Focus: "box exterior, ribbon design, wrapping pattern, bow style"
        ColorPriority: "box_primary_color, ribbon_color, accent_color"
        SceneContext: "birthday celebration setting, festive atmosphere"
      
      ANNIVERSARY:
        Placement: "person holding or receiving gift box, intimate gesture"
        Framing: "upper body portrait, focus on hands holding the gift box"
        Expression: "touched, appreciative, romantic"
        Focus: "luxury packaging detail, ribbon texture, box material finish"
        ColorPriority: "box_primary_color, ribbon_color, metallic_accents"
        SceneContext: "elegant dinner setting, romantic atmosphere"
      
      WEDDING:
        Placement: "person presenting or receiving gift box with both hands"
        Framing: "upper body portrait, gift box centered"
        Expression: "graceful, ceremonial"
        Focus: "premium packaging, gold/silver accents, ornate wrapping"
        ColorPriority: "box_primary_color, metallic_accents, wrapping_pattern"
        SceneContext: "wedding venue, ceremonial atmosphere"
      
      FESTIVAL:
        Placement: "person holding gift box with festive excitement"
        Framing: "upper body to three-quarter body portrait"
        Expression: "joyful, celebratory"
        Focus: "festive wrapping, traditional patterns, vibrant colors"
        ColorPriority: "box_primary_color, wrapping_pattern_colors, ribbon_color"
        SceneContext: "festive decoration, cultural celebration setting"
    
    BY_SIZE:
      SMALL:
        Placement: "person holding gift box in one hand or both hands cupped"
        Framing: "close-up of hands and gift box, face visible above"
        Focus: "delicate packaging, fine details, small bow"
      
      MEDIUM:
        Placement: "person holding gift box with both hands at chest level"
        Framing: "upper body portrait, gift box prominently visible"
        Focus: "box design, ribbon pattern, wrapping quality"
      
      LARGE:
        Placement: "person holding or resting large gift box, both hands"
        Framing: "full upper body, gift box size clearly visible"
        Focus: "grand packaging, elaborate wrapping, premium presentation"
    
    BY_WRAPPING_STYLE:
      RIBBON:
        Focus: "ribbon material, bow style, ribbon color accuracy"
        ColorPriority: "ribbon_color, box_color, bow_accent"
      
      FLORAL:
        Focus: "floral arrangement on box, flower types, arrangement style"
        ColorPriority: "floral_primary_color, box_color, greenery_accents"
      
      MINIMALIST:
        Focus: "clean lines, premium material texture, subtle branding"
        ColorPriority: "box_primary_color, material_texture_tone, branding_color"
```

**5.6.2 Dynamic Prompt Construction**

The prompt construction process:

1. Identify the product's category from catalog metadata
2. If category is "jewelry", further classify into sub-category using product attributes (title keywords, description, tags)
3. If category is "luxury_gift_box", further classify into sub-categories by occasion, size, and wrapping style using product attributes
4. Retrieve the category-specific configuration
5. Construct the generation prompt by combining:
   - Base instruction template
   - Category-specific placement instruction
   - Category-specific framing instruction
   - Category-specific focus areas
   - Color priority order with extracted hex codes
   - Product-specific details (name, material, design features)
   - For non-wearable items: expression guidance, scene context, and gesture instructions

**5.6.3 Color Focus Rules**

Each category defines color priority rules that determine which colors are most critical to match:

- **Jewelry:** Primary gemstone color is highest priority, followed by metal tone. For rose gold jewelry, the rose gold tone (#B76E79) takes precedence over all other colors.
- **Sarees:** Primary fabric color is highest priority, followed by border color and pallu accent color. The border must maintain its contrast against the fabric.
- **Watches:** Dial color is highest priority, followed by strap color and case metal tone.
- **Luxury Gift Boxes:** Box primary color is highest priority, followed by ribbon color and accent/wrapping pattern colors. For a burgundy gift box with gold ribbon, the burgundy (#800020) and gold (#D4AF37) must be precisely matched.

### 5.7 Dual-Image Edit Technique — Detailed Description

**5.7.1 Technical Implementation**

The dual-image edit technique is implemented through a specific API call structure:

```
API Endpoint: AI Image Edit API
Parameters:
  - image: user_selfie_image (primary base image)
  - reference_image: product_reference_image (secondary visual reference)
  - prompt: "Look at the [PRODUCT_CATEGORY] shown in the reference image. 
            Place this exact [PRODUCT_CATEGORY] on the person in the selfie 
            photo. The [PRODUCT_CATEGORY] must precisely match the reference 
            image in: color (especially [PRIMARY_COLOR] with hex code [HEX]), 
            design, pattern, material appearance, and size proportion. 
            [CATEGORY_PLACEMENT_INSTRUCTION]. 
            Preserve the person's face, skin tone, and body exactly as is."
  - category_config: dynamically loaded category parameters
```

For non-wearable luxury gift boxes, the prompt structure is adapted:

```
API Endpoint: AI Image Edit API
Parameters:
  - image: user_selfie_image (primary base image)
  - reference_image: gift_box_reference_image (secondary visual reference)
  - prompt: "Look at the luxury gift box shown in the reference image. 
            Show the person in the selfie photo holding this exact gift box 
            with both hands. The gift box must precisely match the reference 
            image in: color (especially [PRIMARY_COLOR] with hex code [HEX] 
            and ribbon color [RIBBON_HEX]), box material, ribbon style, 
            wrapping pattern, and size proportion. The person should have 
            a [EXPRESSION] expression. The gift box should be held at 
            [PLACEMENT_POSITION]. Preserve the person's face, skin tone, 
            and body exactly as is."
  - category_config: dynamically loaded gift box category parameters
```

**5.7.2 Why Dual-Image Edit is Superior for Color Fidelity**

In traditional text-prompt-based systems, color information undergoes a lossy transformation:
1. Product color (visual, continuous spectrum) → Text description (discrete, imprecise) → AI interpretation (approximation of approximation)

This double approximation results in significant color drift. For example:
- Actual product color: Deep rose gold (#B76E79)
- Text description: "rose gold"
- AI interpretation: Generic gold (#FFD700) — a completely different color

- Actual gift box color: Deep burgundy (#800020) with gold ribbon (#D4AF37)
- Text description: "burgundy box with gold ribbon"
- AI interpretation: Red box (#FF0000) with yellow ribbon (#FFFF00) — completely different colors

The dual-image edit approach eliminates one layer of approximation:
1. Product color (visual) → AI direct visual perception → AI reproduction

The AI model directly perceives the actual color from the reference image and attempts to replicate it, resulting in significantly higher color fidelity. Our testing shows color accuracy improvements of 40-60% compared to text-only description approaches for luxury products with nuanced color palettes.

### 5.8 Cross-Platform Deployment Architecture — Detailed Description

**5.8.1 Deployment Environments**

The system supports three deployment environments:

a) **Local Development:** The application runs on a local development server with direct access to AI service APIs. The proxy architecture routes requests directly to AI service endpoints.

b) **Vercel Serverless:** The application deploys as serverless functions on Vercel. Due to Vercel's request size limitations and potential API access restrictions, the proxy architecture routes AI requests through a separate proxy server or directly to AI APIs depending on availability.

c) **Android PWA:** The application is accessed as a Progressive Web App on Android devices. The proxy architecture detects the mobile environment and routes requests through the most performant available path.

**5.8.2 Intelligent Proxy Architecture**

The proxy architecture operates as follows:

1. **Environment Detection:** On initialization, the system detects the current deployment environment by checking for environment-specific variables and runtime characteristics.

2. **Path Selection:** Based on the detected environment:
   - Local development: Route directly to AI API endpoints
   - Vercel serverless: Route through the ai-proxy service (if available) or directly to AI APIs
   - Android PWA: Route through the remote try-on endpoint

3. **Fallback Chain:** If the primary path fails:
   - Primary: Direct AI API access
   - Secondary: Proxy server (ai-proxy service)
   - Tertiary: Remote try-on endpoint
   - Quaternary: Client-side canvas overlay fallback

4. **Health Monitoring:** The system periodically checks the health of each AI service path and updates the routing table based on availability.

**5.8.3 Request Routing Flow**

```
Client Request → Environment Detector → Path Selector → Primary Path
                                                       ↓ (if failure)
                                                    Secondary Path
                                                       ↓ (if failure)
                                                    Tertiary Path
                                                       ↓ (if failure)
                                                    Canvas Fallback
```

### 5.9 Fallback Mechanisms — Detailed Description

**5.9.1 Canvas Overlay Fallback System**

When all AI generation services are unavailable, the system activates the client-side canvas overlay fallback. This system creates a premium-looking style preview using HTML5 Canvas compositing:

a) **Layer 1 — Base Layer:** The user's selfie image is drawn as the base layer, resized to fill the canvas.

b) **Layer 2 — Vignette Effect:** A radial gradient vignette is applied, darkening the edges of the image to create a professional studio-like appearance.

c) **Layer 3 — Product Overlay:** The product reference image is composited onto the canvas at a position determined by the product category:
   - Jewelry: Upper portion of the image (near face/neck area)
   - Saree: Center of the image (body area)
   - Watch: Lower-center (wrist area)
   - Luxury Gift Box: Center-chest area (held in hands position)
   The product image is rendered with reduced opacity (60-80%) and a soft-edge blending mask.

d) **Layer 4 — Branding Overlay:** A semi-transparent branding bar is rendered at the bottom with "3BOXES GIFTS" branding and "AI Style Preview" subtitle.

e) **Layer 5 — Decorative Elements:** Optional decorative elements such as golden border lines, sparkle effects, or gradient overlays enhance the premium feel.

f) **Watermark:** A diagonal watermark is rendered across the image.

The canvas overlay fallback ensures that users always receive a visual response, maintaining engagement and preventing the frustration of a blank error screen during service outages.

**5.9.2 Degraded Mode Operation**

The system defines three operational modes:

- **Full Mode:** All AI services available, multi-strategy generation with VLM verification
- **Partial Mode:** Some AI services available, limited strategy selection with simplified verification
- **Fallback Mode:** No AI services available, canvas overlay only

The system automatically transitions between modes based on service availability, providing a graceful degradation experience.

### 5.10 Watermarking System — Detailed Description

**5.10.1 Watermarking Implementation**

All generated try-on images are automatically watermarked using the Sharp image processing library (Node.js). The watermarking process:

a) **Watermark Text:** "3BOXES GIFTS - AI Style Preview"
b) **Position:** Diagonal across the image, repeated in a tile pattern
c) **Opacity:** 25-30% transparency to be visible but not obstruct product visualization
d) **Font:** Sans-serif, bold, appropriate sizing relative to image dimensions
e) **Color:** White with slight opacity variation for visibility across both light and dark image areas
f) **Rotation:** 30-45 degree angle for diagonal placement

**5.10.2 Technical Process**

```
1. Load generated image into Sharp
2. Create SVG watermark template with text, position, rotation, and opacity
3. Composite SVG watermark onto the generated image using Sharp's composite function
4. Apply alpha blending for semi-transparent overlay
5. Output final watermarked image in WebP format (with JPEG fallback)
6. Store in cache and deliver to client
```

**5.10.3 Brand Protection Rationale**

The watermarking serves multiple purposes:
- Intellectual property protection for generated content
- Brand attribution for shared images on social media
- Deterrence against unauthorized commercial use of generated images
- Compliance indication that the image is AI-generated

### 5.11 Product Pairing Suggestions — Detailed Description

**5.11.1 Category-Based Pairing Logic**

The system generates product pairing suggestions based on category relationships:

- **Earrings** → Suggest: matching necklace, bracelet from same collection
- **Necklace** → Suggest: matching earrings, ring from same collection
- **Bracelet** → Suggest: matching necklace, ring from same collection
- **Ring** → Suggest: matching bracelet, earrings from same collection
- **Jewelry Set** → Suggest: complementary watch, saree, luxury gift box
- **Saree** → Suggest: complementary jewelry set, matching watch, luxury gift box
- **Watch** → Suggest: complementary bracelet, leather accessory, luxury gift box
- **Luxury Gift Box** → Suggest: jewelry item to place inside, complementary greeting card, matching flowers

**5.11.2 AI-Generated Pairing Descriptions**

The pairing suggestions include AI-generated descriptions explaining why the products complement each other, generated using an AI assistant model with context about both products' attributes, colors, and style characteristics.

---

## 6. CLAIMS

### Independent Claims

**Claim 1.** A computer-implemented method for generating virtual try-on images for e-commerce products, the method comprising:

(a) receiving, at a computing system, a user selfie image and a product identifier corresponding to a product in an e-commerce catalog, wherein the product identifier is associated with a product reference image and product metadata including at least a product category, wherein the product category includes non-wearable luxury presentation items comprising gift boxes and gift packaging;

(b) generating, by the computing system, a plurality of candidate try-on images using at least two distinct image generation strategies, wherein a first strategy comprises providing both the user selfie image and the product reference image simultaneously to an AI image editing model with a prompt instructing the model to overlay the product from the reference image onto the person in the selfie image, and wherein for non-wearable luxury presentation items, the prompt instructs the model to show the person holding, receiving, or presenting the non-wearable item;

(c) submitting, by the computing system, each candidate try-on image to a Vision Language Model (VLM) for verification, wherein the VLM compares each candidate image against the product reference image and generates a score for at least a color accuracy dimension;

(d) selecting, by the computing system, the candidate try-on image with the highest composite score as the primary result; and

(e) outputting, by the computing system, the selected candidate try-on image for display to the user.

**Claim 2.** A system for generating virtual try-on images for e-commerce products, the system comprising:

(a) a frontend module configured to receive a user selfie image and a product selection, wherein the product selection may correspond to a non-wearable luxury presentation item comprising a gift box or gift packaging;

(b) a multi-strategy generation module configured to generate a plurality of candidate try-on images using a plurality of distinct image generation strategies, including a dual-image edit strategy that provides both the user selfie image and a product reference image simultaneously to an AI image editing model, and including generation strategies adapted for non-wearable luxury presentation items that generate images of the user holding, receiving, or presenting the non-wearable item;

(c) a VLM verification module configured to submit each candidate try-on image to a Vision Language Model for scoring against the product reference image, including scoring for color accuracy;

(d) a selection module configured to select the highest-scoring candidate try-on image; and

(e) a delivery module configured to output the selected candidate try-on image.

**Claim 3.** A non-transitory computer-readable storage medium storing instructions that, when executed by a processor, cause the processor to perform the method of Claim 1.

**Claim 4.** A computer-implemented method for generating virtual visualization images of non-wearable luxury presentation items, the method comprising:

(a) receiving, at a computing system, a user selfie image and a product identifier corresponding to a luxury gift box or gift packaging in an e-commerce catalog, wherein the product identifier is associated with a product reference image and product metadata including gift box attributes selected from the group consisting of: occasion type, box size, wrapping style, box color, ribbon color, and wrapping pattern;

(b) generating, by the computing system, a plurality of candidate visualization images using at least two distinct image generation strategies, wherein each strategy generates an image of the user holding, receiving, or presenting the luxury gift box, and wherein the generated images include expression guidance and scene context appropriate to the occasion type;

(c) submitting, by the computing system, each candidate visualization image to a Vision Language Model (VLM) for verification, wherein the VLM compares each candidate image against the product reference image and generates scores for color accuracy of the gift box, ribbon, and wrapping elements;

(d) selecting, by the computing system, the candidate visualization image with the highest composite score; and

(e) outputting, by the computing system, the selected candidate visualization image for display to the user.

### Dependent Claims — Multi-Strategy Generation

**Claim 5.** The method of Claim 1, wherein the plurality of distinct image generation strategies further comprises at least one of:

(a) a selfie-edit strategy wherein the user selfie image is provided to the AI image editing model with a text description of the product;

(b) a product-edit strategy wherein the product reference image is provided to the AI image editing model with a text description of the user; or

(c) a text-to-image strategy wherein a text prompt describing both the user and the product is provided to a text-to-image generation model.

**Claim 6.** The method of Claim 5, wherein the plurality of distinct image generation strategies comprises all four of the dual-image edit strategy, the selfie-edit strategy, the product-edit strategy, and the text-to-image strategy.

**Claim 7.** The method of Claim 1, wherein the plurality of candidate try-on images are generated in parallel.

**Claim 8.** The method of Claim 1, wherein the plurality of candidate try-on images are generated sequentially in a priority order, and generation is terminated early if a candidate exceeding a quality threshold is obtained.

### Dependent Claims — VLM Verification

**Claim 9.** The method of Claim 1, wherein the VLM generates scores for a plurality of dimensions including color accuracy, product fidelity, placement realism, face preservation, and overall quality.

**Claim 10.** The method of Claim 1, wherein the composite score is calculated as a weighted average of the plurality of dimension scores, and wherein the color accuracy dimension is assigned the highest weight.

**Claim 11.** The method of Claim 1, wherein the VLM further generates a textual description of any color mismatches between the candidate try-on image and the product reference image.

### Dependent Claims — Color Accuracy Refinement

**Claim 12.** The method of Claim 1, further comprising:

(f) determining, by the computing system, whether the selected candidate try-on image's color accuracy score is below a predefined threshold;

(g) when the color accuracy score is below the threshold, extracting the VLM-generated color mismatch description and target color specifications;

(h) generating, by the computing system, a refined try-on image by submitting the selected candidate try-on image and a refinement prompt incorporating the extracted color mismatch description to the AI image editing model; and

(i) re-submitting the refined try-on image to the VLM for verification.

**Claim 13.** The method of Claim 12, wherein the target color specifications extracted from the VLM include specific hex code color values.

**Claim 14.** The method of Claim 12, wherein the refinement prompt instructs the AI image editing model to correct only the product colors while preserving the person's facial features, skin tone, and body composition.

**Claim 15.** The method of Claim 12, wherein the refinement process is repeated for a maximum of N iterations, where N is a configurable parameter.

**Claim 16.** The method of Claim 12, wherein the refined try-on image replaces the selected candidate try-on image only if the refined try-on image's composite score exceeds the selected candidate try-on image's composite score.

### Dependent Claims — Category-Aware Prompt Engineering

**Claim 17.** The method of Claim 1, further comprising:

(j) identifying, by the computing system, the product category from the product metadata; and

(k) constructing the prompt for at least one of the image generation strategies based on the product category, wherein the prompt includes category-specific placement instructions and category-specific framing instructions.

**Claim 18.** The method of Claim 17, wherein the product category is jewelry, and the method further comprises:

(l) sub-classifying the jewelry product into one of a plurality of jewelry sub-categories including earrings, necklace, bracelet, ring, and set; and

(m) selecting sub-category-specific placement instructions, wherein earrings receive "place on ears" instructions, necklaces receive "drape around neck" instructions, bracelets receive "place on wrist" instructions, rings receive "place on finger" instructions, and sets receive instructions to place all matching pieces.

**Claim 19.** The method of Claim 17, wherein the product category is a non-wearable luxury presentation item, and the method further comprises:

(n) sub-classifying the luxury gift box product by at least one of: occasion type (birthday, anniversary, wedding, festival), box size (small, medium, large), or wrapping style (ribbon, floral, minimalist); and

(o) selecting sub-category-specific visualization instructions, wherein the instructions include at least: positioning guidance for how the user holds or presents the gift box, expression guidance appropriate to the occasion type, and scene context for the visualization.

**Claim 20.** The method of Claim 19, wherein the sub-category-specific visualization instructions for a birthday occasion include: "person holding gift box with both hands, slightly elevated, with a warm smile and excited anticipation expression," and the instructions for an anniversary occasion include: "person holding or receiving gift box with an intimate gesture, with a touched and appreciative expression."

**Claim 21.** The method of Claim 17, wherein the category-specific prompt includes color priority rules that define an order of color importance for the product category.

### Dependent Claims — Hex-Code Color Extraction

**Claim 22.** The method of Claim 1, wherein the VLM extracts product color specifications including at least one hex code color value from the product reference image, and wherein the extracted hex code color values are incorporated into the prompt for at least one image generation strategy.

**Claim 23.** The method of Claim 22, wherein the VLM extracts color specifications in the format of "[color name] [hex code]" (e.g., "deep maroon red #8B1A1A") rather than color name alone.

### Dependent Claims — Dual-Image Edit

**Claim 24.** The method of Claim 1, wherein the first strategy's prompt instructs the AI image editing model to match the exact colors, design, and details from the product reference image when overlaying the product onto the person in the selfie image.

**Claim 25.** The method of Claim 1, wherein the first strategy is particularly configured for luxury e-commerce products where color fidelity is critical for purchase decisions.

### Dependent Claims — Non-Wearable Luxury Presentation Items

**Claim 26.** The method of Claim 4, wherein the non-wearable luxury presentation item is a gift box, and the generated visualization images depict the user in one of: holding the gift box with both hands, receiving the gift box from another person, presenting the gift box to another person, or the gift box resting on a surface beside the user.

**Claim 27.** The method of Claim 4, wherein the gift box attributes include occasion type, and the expression guidance varies based on the occasion type, such that a birthday gift box visualization includes an excited expression and a wedding gift box visualization includes a graceful, ceremonial expression.

**Claim 28.** The method of Claim 4, wherein the VLM verification for non-wearable luxury presentation items includes evaluation of gift box color accuracy, ribbon color accuracy, wrapping pattern fidelity, and proportional accuracy of the gift box relative to the user's body.

**Claim 29.** The method of Claim 4, wherein the product pairing suggestions for a luxury gift box include at least one of: a jewelry item to place inside the gift box, a complementary greeting card, or matching floral arrangements.

### Dependent Claims — Fallback and Watermarking

**Claim 30.** The method of Claim 1, further comprising:

(p) detecting, by the computing system, that all AI image generation services are unavailable; and

(q) in response, generating a client-side canvas overlay image comprising the user selfie image as a base layer, the product reference image composited at a category-determined position with reduced opacity, a vignette effect, and a branding overlay.

**Claim 31.** The method of Claim 1, further comprising applying a watermark to the selected candidate try-on image using image processing, wherein the watermark includes brand identification text rendered in a semi-transparent overlay.

**Claim 32.** The method of Claim 31, wherein the watermark is rendered diagonally across the image at a specified opacity.

### Dependent Claims — Cross-Platform Deployment

**Claim 33.** The system of Claim 2, further comprising a proxy architecture module configured to:

(a) detect a current deployment environment from among a plurality of deployment environments including local development, serverless cloud, and mobile PWA;

(b) select an AI service access path based on the detected deployment environment; and

(c) route AI service requests through the selected access path.

**Claim 34.** The system of Claim 33, wherein the proxy architecture module further implements a fallback chain of access paths, such that if a primary access path fails, requests are automatically routed to a secondary access path.

### Dependent Claims — E-Commerce Integration

**Claim 35.** The system of Claim 2, further comprising an e-commerce integration module configured to:

(a) retrieve product data from a Shopify Storefront API;

(b) support affiliate platform products from a plurality of external e-commerce platforms; and

(c) generate product pairing suggestions based on category relationships.

**Claim 36.** The method of Claim 1, further comprising generating, by the computing system, product pairing suggestions based on the product category, wherein the suggestions identify complementary products from the e-commerce catalog and include AI-generated descriptions explaining the complementarity.

### Method Claims — Full Pipeline

**Claim 37.** A computer-implemented method for generating and refining virtual try-on images with color accuracy verification, the method comprising:

(a) receiving a user selfie image, a product reference image, and product category information, wherein the product category includes non-wearable luxury presentation items;

(b) extracting product color specifications from the product reference image using a Vision Language Model, wherein the color specifications include hex code color values;

(c) generating a plurality of candidate try-on images using a multi-strategy pipeline comprising at least a dual-image edit strategy that provides both the user selfie image and the product reference image simultaneously to an AI image editing model with category-specific prompt instructions, and for non-wearable items, instructions to show the user holding, receiving, or presenting the item;

(d) verifying each candidate try-on image using the Vision Language Model by comparing against the product reference image and generating scores for color accuracy, product fidelity, placement realism, face preservation, and overall quality;

(e) selecting the candidate try-on image with the highest weighted composite score, wherein color accuracy receives the highest weight;

(f) when the selected candidate's color accuracy score is below a threshold, performing a color accuracy refinement loop comprising:
   (i) extracting the VLM-generated color mismatch description with hex code specifications;
   (ii) generating a refinement prompt incorporating the color mismatch description;
   (iii) submitting the selected candidate and the refinement prompt to the AI image editing model;
   (iv) re-verifying the refined image with the VLM; and
   (v) accepting the refined image if it scores higher than the original;

(g) applying a brand watermark to the final image; and

(h) outputting the final watermarked image for display.

---

## 7. DRAWINGS

**Figure 1: System Architecture Diagram**

Figure 1 illustrates the overall system architecture showing the interconnection between the frontend layer (user interface with selfie upload, product selection, and result display), the API layer (multi-strategy orchestrator, VLM verification, refinement loop, and proxy router), the AI service layer (image editing models, text-to-image models, and VLM), the integration layer (Shopify API, affiliate platform APIs, image proxy), and the fallback layer (canvas overlay engine and service health monitor). Arrows indicate the flow of data between components.

**Figure 2: Pipeline Flow Diagram**

Figure 2 is a flowchart illustrating the five-phase pipeline: Phase 1 (Input Acquisition and Preprocessing) showing selfie validation, product image retrieval, and category classification; Phase 2 (Multi-Strategy Generation) showing the four parallel generation strategies; Phase 3 (VLM Verification and Scoring) showing each candidate being submitted to the VLM; Phase 4 (Selection and Optional Refinement) showing the selection of the highest-scoring candidate and the conditional refinement loop; and Phase 5 (Post-Processing and Delivery) showing watermarking, optimization, and delivery.

**Figure 3: Multi-Strategy Generation Diagram**

Figure 3 illustrates the four generation strategies in detail. The dual-image edit strategy shows the selfie image and product reference image being passed simultaneously to the AI model. The selfie-edit strategy shows the selfie image with a text prompt being passed. The product-edit strategy shows the product image with a user description being passed. The text-to-image strategy shows a combined text prompt being passed. All four strategies feed into a common candidate pool for VLM evaluation. For non-wearable items (gift boxes), the dual-image edit strategy shows the prompt adapted to "show person holding the gift box."

**Figure 4: VLM Verification Process**

Figure 4 illustrates the VLM verification process. A candidate image and the original product reference image are presented side-by-side to the VLM. The VLM produces a structured JSON output containing scores for five dimensions (color accuracy, product fidelity, placement realism, face preservation, overall quality), a textual color mismatch analysis, hex code specifications, and a refinement recommendation. The scoring and selection algorithm is shown processing the VLM output to compute weighted composite scores.

**Figure 5: Color Refinement Loop**

Figure 5 is a flowchart illustrating the color accuracy refinement loop. It shows: the selected candidate image being checked against the color accuracy threshold; the VLM color mismatch analysis being extracted; the refinement prompt being constructed with hex code specifications; the refined image being generated; the refined image being re-verified by the VLM; the comparison of refined vs. original scores; and the iteration limit check. Decision points are shown for threshold checking and iteration counting.

**Figure 6: Category Configuration Diagram**

Figure 6 illustrates the category configuration structure as a hierarchical tree. The root node is "Product Categories," branching into Jewelry, Saree, Watch, and Luxury Gift Box categories. The Jewelry category further branches into Earrings, Necklace, Bracelet, Ring, and Set sub-categories. The Luxury Gift Box category branches into By Occasion (Birthday, Anniversary, Wedding, Festival), By Size (Small, Medium, Large), and By Wrapping Style (Ribbon, Floral, Minimalist) sub-categories. Each leaf node shows the configuration parameters: placement instructions, framing rules, focus areas, and color priority order.

**Figure 7: Cross-Platform Deployment Architecture**

Figure 7 illustrates the three deployment environments (Local Development, Vercel Serverless, Android PWA) connected to the intelligent proxy architecture. The proxy architecture shows the environment detector, path selector, and fallback chain (Primary: Direct API → Secondary: Proxy Server → Tertiary: Remote Endpoint → Quaternary: Canvas Fallback). Data flow arrows show how requests are routed based on environment detection.

**Figure 8: Fallback Mechanism Flowchart**

Figure 8 is a flowchart showing the fallback mechanism. Starting from a try-on request, the system checks AI service availability. If available, the full multi-strategy pipeline is executed. If partially available, a limited strategy pipeline is executed. If completely unavailable, the canvas overlay fallback is triggered, showing the five canvas layers (base selfie, vignette, product overlay, branding, watermark) being composited.

**Figure 9: Gift Box Virtual Try-On Flow Diagram**

Figure 9 illustrates the specific flow for non-wearable luxury presentation item visualization. The flow shows: product category identification as "Luxury Gift Box"; sub-classification by occasion, size, and wrapping style; prompt construction with expression guidance and scene context; generation of images showing the user holding/receiving/presenting the gift box; VLM verification including gift box color accuracy, ribbon color accuracy, and proportional accuracy; and delivery of the final visualization image.

---

## 8. PATENT LANDSCAPE ANALYSIS AND FREEDOM-TO-OPERATE

### 8.1 Comprehensive Patent Landscape Summary

Based on an exhaustive search of the USPTO, WIPO, EPO, and Indian Patent Office databases, 13 key existing patents were identified and analyzed in the virtual try-on domain. The following table summarizes the landscape:

| Patent No. | Assignee | Title | Domain | Risk Level |
|---|---|---|---|---|
| US 11,830,118 | Snap Inc. | Virtual Clothing Try-On | Clothing AR try-on | LOW |
| US 2019/0130649 A1 | Snap Inc. | Clothing Model Generation and Display | Clothing AR model | LOW |
| US 11,315,162 | Amazon | Blended Reality Systems | Blended reality | LOW |
| US 2016/0292917 A1 | Amazon | Blended Reality Systems (application) | Blended reality | LOW |
| US 11,580,592 B2 | Amazon | Customized Virtual Store | Virtual store | LOW |
| US 11,158,121 B1 | Google/Alphabet | TryOnDiffusion | Clothing diffusion models | LOW |
| US 8,275,590 | Zugara | Virtual Wearable Items in Video Feed | AR overlay on video | MEDIUM |
| US 10,482,517 B2 | Zugara | Real-Time AR Overlays for VTO | AR overlay (litigated) | MEDIUM |
| US 2022/0318892 A1 | Unassigned | Clothing VTO Based on Deep Learning | Clothing DL | LOW |
| US 12,017,142 B2 | Unassigned | Real-Time Calibration of VTO | Calibration | LOW |
| US 2020/0183969 A1 | Unassigned | Virtual Dressing Utilizing Image Processing | Image processing | LOW |
| US 11,922,550 B1 | Unassigned | Hierarchical Text-Driven VTO | Text-driven | LOW |
| US 10,810,647 B2 | Unassigned | Hybrid Virtual/Physical Jewelry Shopping | Jewelry shopping | LOW |
| US 2021/0049830 A1 | Unassigned | Virtual Try-On for Spectacles | Eyewear | LOW |

### 8.2 Freedom-to-Operate Risk Assessment

#### 8.2.1 Risk Classification

**MEDIUM RISK — Zugara Patents (US 8,275,590; US 10,482,517 B2)**

Zugara's patents represent the highest risk in the landscape due to their broad claims directed to AR overlay systems for virtual product try-on. US 10,482,517 B2, in particular, has claims that could potentially be construed to cover any AR overlay on a user image for product try-on purposes. This patent has been actively asserted against major companies:

- **Zugara v. Warby Parker** — Asserted for virtual eyewear try-on
- **Zugara v. Estée Lauder** — Asserted for virtual makeup try-on
- **Zugara v. Chanel** — Filed July 2024, W.D. Texas — Asserted for virtual makeup/eyewear try-on

**Risk Mitigation:** The present invention fundamentally differs from Zugara's patents in several key aspects:
1. **Technology Approach:** Zugara uses AR overlay on live video feeds; the present invention uses AI generative image editing to create entirely new composite images. This is a fundamentally different technical approach.
2. **Real-Time vs. Static:** Zugara's system operates in real-time on video; the present invention generates static photorealistic images through a multi-step pipeline.
3. **Quality Verification:** Zugara has no VLM verification, no multi-strategy generation, and no color accuracy refinement—features that are central to the present invention.
4. **Non-Wearable Extension:** Zugara's patents are directed to "wearable items"; the present invention's extension to non-wearable luxury presentation items is outside the scope of Zugara's claims.

**Recommended Action:** Obtain a formal freedom-to-operate opinion from a US patent attorney specifically addressing Zugara's patent claims. Consider designing around by emphasizing that the present invention uses AI generative image editing rather than AR overlay technology.

**LOW RISK — Snap Inc. Patents (US 11,830,118; US 2019/0130649 A1)**

Snap's patents are specifically directed to clothing try-on using AR technology. They employ 3D garment modeling and AR overlay, fundamentally different from the present invention's AI generative approach. The claims are narrowly directed to clothing-specific implementations and do not cover:
- AI image generation (as opposed to AR overlay)
- VLM verification
- Non-wearable product categories
- Color accuracy refinement

**LOW RISK — Amazon Patents (US 11,315,162; US 2016/0292917 A1; US 11,580,592 B2)**

Amazon's patents cover blended reality systems and virtual store customization. These are directed to wearable product visualization and store layout, respectively. They do not employ AI generative image editing, VLM verification, multi-strategy generation, or color accuracy refinement. The customized virtual store patent is directed to store layout personalization, not product try-on.

**LOW RISK — Google Patent (US 11,158,121 B1 — TryOnDiffusion)**

Google's TryOnDiffusion patent is specifically directed to generating clothing that accurately conforms to body pose using diffusion models. It focuses on body pose accuracy rather than color accuracy, employs a single generation strategy, and is limited to clothing/wearable garments. It does not cover VLM verification, multi-strategy generation, color refinement, or non-wearable product categories.

**LOW RISK — Remaining Patents**

The remaining identified patents (US 2022/0318892 A1, US 12,017,142 B2, US 2020/0183969 A1, US 11,922,550 B1, US 10,810,647 B2, US 2021/0049830 A1) are each directed to specific aspects of wearable virtual try-on (clothing, jewelry shopping workflow, spectacles) and do not employ the combination of VLM verification, multi-strategy generation, color accuracy refinement, or non-wearable product visualization that characterizes the present invention.

#### 8.2.2 Overall FTO Assessment

| Risk Category | Patents | Assessment |
|---|---|---|
| **MEDIUM** | Zugara (US 8,275,590; US 10,482,517 B2) | Requires careful claim analysis; different technical approach provides strong distinction |
| **LOW** | Snap Inc. (2 patents) | Clothing-specific AR; different technology |
| **LOW** | Amazon (3 patents) | Blended reality/virtual store; different technology and scope |
| **LOW** | Google (1 patent) | Clothing diffusion models; different focus |
| **LOW** | Other (6 patents) | Specific wearable domains; no overlapping claims |
| **NONE** | Gift box/packaging VTO | **No patents exist in this domain** |

**Overall FTO Conclusion:** The present invention has a strong freedom-to-operate position. The primary risk area (Zugara patents) is mitigated by the fundamental technological distinction between AR overlay (Zugara) and AI generative image editing (present invention). The extension to non-wearable luxury presentation items operates in a complete patent white space with no existing patents to navigate.

### 8.3 Active Litigation Context

The following active litigation is relevant to the virtual try-on patent landscape:

**Zugara v. Chanel, Inc.**
- **Court:** U.S. District Court, Western District of Texas
- **Filed:** July 2024
- **Patent at Issue:** US 10,482,517 B2 ("Real-Time Augmented Reality Overlays for Virtual Product Try-On")
- **Status:** Active litigation
- **Relevance:** This case demonstrates that Zugara is actively enforcing its patent rights against major companies in the virtual try-on space. The outcome of this case may influence the scope and enforceability of broad AR overlay patents.
- **Impact on Present Invention:** The present invention's use of AI generative image editing (rather than AR overlay) provides a clear technological distinction from the patented technology. Monitoring this case is recommended to understand how courts interpret the scope of Zugara's claims.

**Zugara v. Warby Parker**
- **Relevance:** Asserted against virtual eyewear try-on features
- **Impact:** Demonstrates Zugara's enforcement strategy extends to eyewear-specific try-on

**Zugara v. Estée Lauder**
- **Relevance:** Asserted against virtual makeup try-on features
- **Impact:** Demonstrates enforcement extends to cosmetics try-on

**Strategic Implication:** The active litigation by Zugara underscores the importance of the present invention's technological distinction from AR overlay approaches. By using AI generative image editing rather than AR overlay, and by extending to non-wearable product categories, the present invention avoids the technology at issue in the Zugara litigation.

---

## 9. PATENT FILING STRATEGY

### 9.1 Recommended Filing Approach

Based on the patent landscape analysis and freedom-to-operate assessment, the following filing strategy is recommended:

#### 9.1.1 Phase 1: Provisional Patent Application (Immediate — Within 30 Days)

**Objective:** Establish a priority date for the invention as quickly as possible.

**Action:** File a provisional patent application with the USPTO and/or Indian Patent Office containing:
- The complete specification as drafted in this document
- All claims (broad independent claims and detailed dependent claims)
- Drawing descriptions
- Particular emphasis on the non-wearable luxury presentation item features (the white space)

**Cost Estimate:**
- USPTO provisional filing: USD 75-300 (micro/small entity)
- IPO provisional filing: INR 1,600 (startup/natural person) / INR 4,000 (small entity)
- Attorney fees for provisional: INR 30,000-60,000 / USD 2,000-5,000

**Critical Rationale:** Filing quickly establishes a priority date for the white space innovation (luxury gift box virtual try-on). Given that this is an identified gap in the patent landscape, competitors may independently develop similar solutions. Early filing provides first-mover advantage.

#### 9.1.2 Phase 2: Freedom-to-Operate Analysis (Within 60 Days)

**Objective:** Obtain a formal legal opinion on freedom-to-operate, particularly regarding Zugara patents.

**Action:** Engage a US patent attorney to:
1. Conduct a detailed claim-by-claim analysis of US 8,275,590 and US 10,482,517 B2
2. Prepare a formal FTO opinion letter
3. Identify any claim elements that could be construed to cover the present invention
4. Recommend claim modifications or design-arounds if necessary
5. Monitor the Zugara v. Chanel litigation for developments

**Cost Estimate:** USD 5,000-15,000 for a comprehensive FTO analysis

#### 9.1.3 Phase 3: Complete Patent Application (Within 12 Months of Provisional)

**Objective:** Convert the provisional application to a complete specification with refined claims based on FTO analysis.

**Action:**
1. Refine claims based on FTO analysis findings
2. Strengthen emphasis on AI generative approach (vs. AR overlay) to clearly distinguish from Zugara
3. Add any additional embodiments or examples developed during the provisional period
4. File complete specification claiming priority from the provisional

#### 9.1.4 Phase 4: PCT International Filing (Within 12 Months of Priority Date)

**Objective:** Secure international patent protection in key markets.

**Target Countries:** India, United States, European Union (via EPO), China, Japan, UAE, Singapore

### 9.2 Claim Drafting Focus Areas

Based on the patent landscape analysis, claims should be specifically drafted to emphasize the following distinguishing features:

#### 9.2.1 AI Generative Approach vs. AR Overlay

Claims should explicitly recite "AI image editing model" and "generative image editing" rather than "overlay" or "augmented reality" to clearly distinguish from Zugara's AR overlay patents. Key claim language:

- **Use:** "generating, by an AI image editing model, a composite image" 
- **Avoid:** "overlaying a virtual product onto a user image"
- **Use:** "AI generative image editing that creates a new composite photorealistic image"
- **Avoid:** "augmented reality overlay on a video feed"

#### 9.2.2 Non-Wearable Luxury Presentation Items

Claims should explicitly include non-wearable luxury presentation items as a product category to secure the white space:

- **Include:** "non-wearable luxury presentation items comprising gift boxes and gift packaging"
- **Include:** "generating images of a user holding, receiving, or presenting a non-wearable luxury item"
- **Include:** "occasion-specific expression guidance and scene context for non-wearable items"
- **Distinguish from:** All existing patents that are limited to wearable items

#### 9.2.3 VLM Verification as Key Differentiator

Claims should emphasize VLM verification as a quality assurance mechanism, which no prior art discloses:

- **Include:** "Vision Language Model verification that independently scores each candidate image"
- **Include:** "hex-code-level color extraction and iterative color accuracy refinement"
- **Distinguish from:** All existing patents that lack any automated quality verification

#### 9.2.4 Multi-Strategy Pipeline

Claims should emphasize the multi-strategy generation approach:

- **Include:** "at least two distinct image generation strategies"
- **Include:** "selecting the highest-scoring candidate from a plurality of strategy results"
- **Distinguish from:** All existing patents that use a single generation approach

### 9.3 Recommended Patent Portfolio Strategy

| Patent Application | Scope | Priority | Estimated Cost |
|---|---|---|---|
| Core VTO with VLM Verification | Multi-strategy pipeline + VLM verification + color refinement | HIGH | INR 1,00,000-3,00,000 (India) |
| Non-Wearable Luxury Item Visualization | Gift box VTO + occasion-specific generation | HIGH (white space) | INR 1,00,000-3,00,000 (India) |
| Category-Aware Prompt Engineering | Category/sub-category prompt system | MEDIUM | INR 1,00,000-3,00,000 (India) |

**Recommendation:** File at least two patent applications:
1. **Core Application:** Covering the multi-strategy pipeline with VLM verification and color accuracy refinement (broad protection)
2. **White Space Application:** Specifically covering non-wearable luxury presentation item visualization with occasion-specific generation (securing the identified patent gap)

This dual-filing strategy provides both broad protection for the core technology and specific protection for the white space innovation.

---

## 10. PATENT FILING GUIDE

### 10.1 Filing in India (Indian Patent Office — IPO)

**Step 1: Patentability Search**
- Conduct a comprehensive patentability search on the Indian Patent Office database (ipindia.gov.in) and international databases (WIPO, Espacenet, USPTO)
- Analyze search results for novelty and non-obviousness
- Document the search strategy and findings
- **Cost:** INR 15,000 - 30,000 (if performed by a patent agent)

**Step 2: Draft the Patent Application**
- Prepare the complete specification including title, abstract, background, summary, detailed description, claims, and drawings
- Ensure claims are precisely drafted with appropriate scope
- Include all required forms
- **Key Forms:**
  - Form 1: Application for Grant of Patent
  - Form 2: Provisional or Complete Specification
  - Form 3: Statement and Undertaking under Section 8
  - Form 5: Declaration as to Inventorship
  - Form 26: Power of Authority (if filing through agent)
- **Cost:** INR 50,000 - 150,000 (drafting by patent attorney)

**Step 3: File the Application**
- File electronically through the Indian Patent Office online portal (ipindia.gov.in)
- Pay the filing fee:
  - **Provisional Specification:** INR 1,600 (natural person/startup) / INR 4,000 (small entity) / INR 8,000 (large entity)
  - **Complete Specification:** INR 4,000 (natural person/startup) / INR 10,000 (small entity) / INR 20,000 (large entity)

**Step 4: Request for Publication**
- Application is automatically published after 18 months from filing date
- For early publication, file Form 9 with fee of INR 2,500 (natural person) / INR 6,250 (small entity) / INR 12,500 (large entity)

**Step 5: Request for Examination**
- File Form 18 within 48 months from filing date (priority date)
- Examination fee: INR 4,000 (natural person/startup) / INR 10,000 (small entity) / INR 20,000 (large entity)
- The application is assigned to an Examiner who reviews for novelty, inventive step, and industrial applicability

**Step 6: Respond to Examination Report**
- First Examination Report (FER) is typically issued within 6-12 months of examination request
- Respond to FER within 6 months (extendable by 3 months)
- **Cost:** INR 20,000 - 50,000 (for response drafting by patent agent)

**Step 7: Grant of Patent**
- If the Examiner is satisfied with the response, the patent is granted
- Grant fee: INR 2,500 (natural person/startup) / INR 6,250 (small entity) / INR 12,500 (large entity)
- Patent is valid for 20 years from the filing date

**Timeline:** 2-5 years from filing to grant  
**Total Estimated Cost (India):** INR 1,00,000 - 3,00,000 (including attorney fees)

### 10.2 Filing in the United States (USPTO)

**Step 1: Determine Filing Strategy**
- If filing in India first, claim priority within 12 months for US filing
- Alternatively, file directly with USPTO

**Step 2: Prepare the Application**
- Convert the Indian application format to USPTO requirements
- Ensure claims comply with US patent law (35 U.S.C. § 112)
- Include an Information Disclosure Statement (IDS) citing all known prior art including all 13 identified patents
- **Key Documents:**
  - Specification (description, claims, drawings)
  - Oath or Declaration (Form AIA/01)
  - Application Data Sheet (ADS)
  - IDS (Form AIA/14) — Must cite: US 11,830,118; US 2019/0130649 A1; US 11,315,162; US 2016/0292917 A1; US 11,580,592 B2; US 11,158,121 B1; US 8,275,590; US 10,482,517 B2; US 2022/0318892 A1; US 12,017,142 B2; US 2020/0183969 A1; US 11,922,550 B1; US 10,810,647 B2; US 2021/0049830 A1
  - Power of Attorney (if applicable)

**Step 3: File the Application**
- File electronically through USPTO's Patent Center or EFS-Web
- **Filing Fees (Utility Patent):**
  - Basic filing fee: USD 300 (micro entity) / USD 600 (small entity) / USD 1,200 (large entity)
  - Search fee: USD 140 (micro entity) / USD 280 (small entity) / USD 560 (large entity)
  - Examination fee: USD 160 (micro entity) / USD 320 (small entity) / USD 640 (large entity)
  - Total filing: ~USD 600 (micro entity) / ~USD 1,200 (small entity) / ~USD 2,400 (large entity)

**Step 4: Prosecution**
- Office Action typically issued within 1-3 years
- Respond to Office Action within 3-6 months
- May require multiple rounds of prosecution
- **Cost per response:** USD 2,000 - 5,000 (attorney fees)

**Step 5: Notice of Allowance and Grant**
- Pay issue fee: USD 200 (micro entity) / USD 400 (small entity) / USD 800 (large entity)
- Patent granted approximately 3-6 months after payment

**Step 6: Maintenance Fees**
- Due at 3.5, 7.5, and 11.5 years after grant
- Large entity: USD 2,000 / USD 3,760 / USD 7,700
- Small entity: 50% discount
- Micro entity: 25% of large entity fee

**Timeline:** 2-4 years from filing to grant  
**Total Estimated Cost (US):** USD 10,000 - 25,000 (including attorney fees)

### 10.3 Filing PCT (International — Patent Cooperation Treaty)

**Step 1: File PCT Application**
- File within 12 months of the priority date (Indian filing date)
- Can file through IPO as Receiving Office or directly with WIPO
- **Key Documents:**
  - PCT Request Form (PCT/RO/101)
  - Specification, claims, abstract, drawings
  - Priority document (if claiming priority)

**Step 2: International Search**
- International Searching Authority (ISA) conducts a prior art search
- International Search Report (ISR) and Written Opinion issued within 3-6 months
- **Cost:** Included in PCT filing fee (approximately CHF 2,500 - 4,000)

**Step 3: International Publication**
- Application published by WIPO after 18 months from priority date
- Published in PCT Gazette

**Step 4: International Preliminary Examination (Optional)**
- File demand within 22 months from priority date
- Receive International Preliminary Report on Patentability (IPRP)

**Step 5: National Phase Entry**
- Enter national phase in desired countries within 30/31 months from priority date
- Must file translations, appoint local agents, and pay national fees in each country
- **Key countries to consider:** US, EU (via EPO), China, Japan, South Korea, UAE, Singapore

**PCT Filing Fees:**
- International filing fee: CHF 1,330 (reduced for electronic filing)
- Search fee: CHF 2,045 (ISA/EPO) or varies by ISA
- Transmittal fee: Varies by Receiving Office
- **Total PCT phase cost:** CHF 4,000 - 6,000 + attorney fees

**National Phase Entry Costs (per country):** USD 3,000 - 10,000

**Timeline:** PCT phase: ~30 months; National phase: additional 2-5 years per country  
**Total Estimated Cost (PCT + 5 national phases):** USD 30,000 - 80,000

### 10.4 Cost Summary

| Filing Route | Estimated Total Cost | Timeline |
|---|---|---|
| India only | INR 1,00,000 - 3,00,000 | 2-5 years |
| India + US | INR 1,00,000 - 3,00,000 + USD 10,000 - 25,000 | 2-5 years |
| India + PCT (5 countries) | INR 1,00,000 - 3,00,000 + USD 30,000 - 80,000 | 4-8 years |

### 10.5 Required Documents Checklist

- [ ] Complete patent specification (title, abstract, background, summary, detailed description, claims, drawings)
- [ ] Form 1 (India) / Application Data Sheet (US)
- [ ] Form 2 (India) / Specification (US)
- [ ] Form 5 — Declaration as to Inventorship (India) / Oath or Declaration (US)
- [ ] Form 3 — Statement and Undertaking (India) / IDS citing all 13 identified patents (US)
- [ ] Form 26 — Power of Authority (India) / Power of Attorney (US)
- [ ] Priority documents (if claiming priority)
- [ ] Proof of right to file (assignment from inventors to company)
- [ ] Entity status proof (startup certificate / small entity certificate for reduced fees)
- [ ] Drawing figures (formal drawings meeting IPO/USPTO requirements)
- [ ] Sequence listing (if applicable — not applicable for this invention)
- [ ] Certified English translation (if any reference is in a foreign language)
- [ ] Freedom-to-Operate analysis report (recommended before commercial launch)

### 10.6 Recommended Patent Attorneys/Agents in India

**Tier 1 — Full-Service IP Firms:**

1. **Remfry & Sagar** — One of India's largest IP firms with offices in New Delhi, Mumbai, and Bangalore. Strong patent prosecution practice. Website: remfry.com

2. **Anand and Anand** — Leading IP firm with offices in New Delhi, Noida, and Mumbai. Known for patent prosecution and litigation. Website: anandandanand.com

3. **K&S Partners** — Full-service IP firm with offices in Gurgaon, Bangalore, Chennai, and Hyderabad. Strong patent practice for technology companies. Website: knspartners.com

4. **Lakshmikumaran & Sridharan** — Leading IP law firm with offices in New Delhi, Mumbai, Bangalore, and Chennai. Strong in patent prosecution and litigation. Website: lksr.com

5. **shrinkingworld Legal** — Technology-focused IP law firm. Cost-effective for startups. Website: shrinkingworldlegal.com

**Tier 2 — Specialized Patent Agents:**

6. **BRAINOVISION Solutions India Pvt. Ltd.** — Patent analytics and prosecution services. Cost-effective for startups. Website: brainovision.com

7. **Intepat IP Services** — Patent prosecution and IP strategy for startups and SMEs. Offices in Bangalore and Pune. Website: intepat.com

8. **Patentwire Advisors** — IP consulting and patent prosecution services. Based in New Delhi. Website: patentwire.in

**Startup-Specific Programs:**

- **Startup India** — Startups recognized under the Startup India initiative receive 80% fee rebate on patent filing fees and expedited examination
- **National Intellectual Property Awareness Mission (NIPAM)** — Free IP awareness and guidance programs

**Recommendation:** For 3 BOXES GIFTS, if recognized as a startup, file through a Tier 2 agent for cost efficiency and leverage the Startup India fee rebate. Budget approximately INR 1,00,000 - 1,50,000 for India filing including attorney fees with startup rebate.

---

## 11. PRIOR ART ANALYSIS

### 11.1 Detailed Comparison with Each Existing Patent

**CN104021590A — Virtual try-on system using AR technology**

| Aspect | CN104021590A | Present Invention |
|---|---|---|
| Technology | AR overlay with markers | AI image generation |
| Color Accuracy | Not addressed | Hex-code-based color extraction with VLM verification |
| Quality Verification | None | VLM-based multi-dimensional scoring |
| Generation Strategy | Single (AR overlay) | Multi-strategy (4 strategies) |
| Refinement | None | Iterative color accuracy refinement loop |
| Category Awareness | None | Category and sub-category specific prompts |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |
| Fallback | None | Canvas overlay fallback |
| E-Commerce Integration | None | Shopify + affiliate platforms |

**Differentiation:** The present invention fundamentally differs by using AI image generation rather than AR overlay, and introduces VLM verification, multi-strategy generation, and color refinement — none of which are taught or suggested by CN104021590A.

**US12205209B1 — Virtual try-on based on predetermined cloth**

| Aspect | US12205209B1 | Present Invention |
|---|---|---|
| Input Method | Input image + text + clothing image | Dual-image edit with simultaneous selfie + product |
| Color Accuracy | Relies on text description | Direct visual reference via dual-image edit + VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single | Multi-strategy with best-result selection |
| Refinement | None | Iterative color accuracy refinement |
| Category Awareness | None | Category and sub-category specific |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |
| Color Specification | Text-based | Hex-code-based |

**Differentiation:** While US12205209B1 uses a clothing image as input, it processes it as a predetermined cloth model rather than as a visual color reference. The present invention's dual-image edit strategy specifically uses the product image as a COLOR REFERENCE for the AI model, combined with VLM verification of color accuracy. The multi-strategy approach, refinement loop, and non-wearable item support are entirely absent from US12205209B1.

**US 11,830,118 (Snap Inc.) — Virtual Clothing Try-On**

| Aspect | US 11,830,118 | Present Invention |
|---|---|---|
| Technology | AR overlay on captured image | AI generative image editing |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (AR overlay) | Multi-strategy (4 strategies) |
| Refinement | None | Iterative color accuracy refinement |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |
| Product Category | Clothing only | Jewelry, saree, watch, gift box, etc. |

**Differentiation:** Snap's patent uses AR overlay technology specifically for clothing. The present invention uses AI generative image editing (fundamentally different technology), includes VLM verification (absent from Snap), and extends to non-wearable categories not contemplated by Snap's patent.

**US 2019/0130649 A1 (Snap Inc.) — Clothing Model Generation and Display System**

| Aspect | US 2019/0130649 A1 | Present Invention |
|---|---|---|
| Technology | 3D clothing model + AR display | AI generative image editing |
| Color Accuracy | Not specifically addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (3D model) | Multi-strategy (4 strategies) |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** Snap's system generates 3D clothing models for AR display, fundamentally different from AI generative image editing. The present invention does not require 3D model generation and uses VLM verification for quality assurance.

**US 11,315,162 / US 2016/0292917 A1 (Amazon) — Blended Reality Systems**

| Aspect | Amazon Blended Reality | Present Invention |
|---|---|---|
| Technology | Blended reality (physical + virtual) | AI generative image editing |
| Color Accuracy | Not specifically addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (blending) | Multi-strategy (4 strategies) |
| Refinement | None | Iterative color accuracy refinement |
| Non-Wearable Items | Not disclosed | Gift box and packaging visualization |

**Differentiation:** Amazon's blended reality system combines physical and virtual elements through blending, while the present invention uses AI generative image editing to create entirely new composite images with VLM-verified color accuracy.

**US 11,580,592 B2 (Amazon) — Customized Virtual Store**

| Aspect | Amazon Virtual Store | Present Invention |
|---|---|---|
| Focus | Virtual store layout customization | Virtual try-on image generation |
| Product Visualization | Store display, not on-user | AI-generated images on user |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |

**Differentiation:** Amazon's patent addresses virtual store layout, not product try-on. Entirely different technical problem and solution.

**US 11,158,121 B1 (Google) — TryOnDiffusion**

| Aspect | TryOnDiffusion | Present Invention |
|---|---|---|
| Focus | Body pose accuracy | Color accuracy |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (diffusion) | Multiple strategies |
| Refinement | None | Color accuracy refinement loop |
| Color Focus | Not primary concern | Primary concern with hex-code precision |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** TryOnDiffusion optimizes for body pose accuracy using diffusion models, while the present invention optimizes for color accuracy using VLM verification with iterative refinement. The extension to non-wearable items is not contemplated.

**US 8,275,590 (Zugara) — Virtual Wearable Items in Video Feed**

| Aspect | Zugara '590 | Present Invention |
|---|---|---|
| Technology | AR overlay on live video | AI generative image editing |
| Mode | Real-time video | Static image generation |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (AR overlay) | Multi-strategy (4 strategies) |
| Refinement | None | Iterative color accuracy refinement |
| Non-Wearable Items | Not supported (wearable only) | Gift box and packaging visualization |

**Differentiation:** Fundamental technological distinction: AR overlay on video (Zugara) vs. AI generative image editing (present invention). The present invention creates entirely new composite images through AI generation rather than overlaying virtual items on a live feed.

**US 10,482,517 B2 (Zugara) — Real-Time AR Overlays for VTO**

| Aspect | Zugara '517 | Present Invention |
|---|---|---|
| Technology | Real-time AR overlay | AI generative image editing |
| Mode | Real-time | Static image with quality pipeline |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring + refinement |
| Generation Strategy | Single (AR overlay) | Multi-strategy (4 strategies) |
| Product Type | Wearable items | Wearable + non-wearable items |
| Litigation Status | Asserted against Warby Parker, Estée Lauder, Chanel | N/A |

**Differentiation:** Same fundamental distinction as '590 patent. The present invention does not use real-time AR overlay; it uses AI generative image editing to create static photorealistic composite images with VLM-verified color accuracy. The extension to non-wearable luxury presentation items is outside the scope of Zugara's wearable-focused claims.

**US 2022/0318892 A1 — Clothing Virtual Try-On Based on Deep Learning**

| Aspect | US 2022/0318892 A1 | Present Invention |
|---|---|---|
| Technology | Deep learning (single model) | Multi-strategy with VLM verification |
| Color Accuracy | Not specifically addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based multi-dimensional scoring |
| Generation Strategy | Single model | Four distinct strategies |
| Refinement | None | Iterative color accuracy refinement |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** While both use deep learning, the present invention adds VLM verification, multi-strategy generation, category-aware prompting, and iterative refinement — none of which are taught by US20220318892A1.

**US 12,017,142 B2 — Real-Time Calibration of Virtual Try-On**

| Aspect | US 12,017,142 B2 | Present Invention |
|---|---|---|
| Technology | AR/AI with real-time calibration | Multi-strategy AI with VLM verification |
| Color Accuracy | Not specifically addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring with refinement |
| Generation Strategy | Single | Multiple strategies |
| Refinement | Real-time calibration only | Color accuracy refinement loop |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** US 12,017,142 B2's real-time calibration addresses spatial positioning accuracy, not color accuracy. The present invention's VLM verification and color refinement loop address a fundamentally different problem.

**US 2020/0183969 A1 — Virtual Dressing Utilizing Image Processing**

| Aspect | US 2020/0183969 A1 | Present Invention |
|---|---|---|
| Quality Verification | None | VLM-based multi-dimensional scoring |
| Generation Strategy | Single | Four distinct strategies |
| Refinement | None | Iterative color accuracy refinement |
| Category Awareness | None | Category-specific prompt engineering |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |
| Color Specification | Text-based | Hex-code-based |

**Differentiation:** The present invention adds VLM verification, multi-strategy generation, and color refinement on top of basic image-based virtual dressing.

**US 11,922,550 B1 — Hierarchical Text-Driven Virtual Try-On**

| Aspect | US 11,922,550 B1 | Present Invention |
|---|---|---|
| Approach | Hierarchical text prompts | Category-aware prompts + VLM verification |
| Color Accuracy | Not addressed with precision | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Generation Strategy | Single (text-driven) | Multi-strategy (4 strategies) |
| Refinement | None | Iterative color accuracy refinement |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** While both use text-driven generation, the present invention combines category-aware prompting with VLM verification and iterative color refinement, creating a closed-loop quality assurance system absent from the hierarchical text approach.

**US 10,810,647 B2 — Hybrid Virtual and Physical Jewelry Shopping**

| Aspect | US 10,810,647 B2 | Present Invention |
|---|---|---|
| Technology | Shopping workflow management | AI generative image editing |
| Virtual Try-On | Not included | Multi-strategy with VLM verification |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** This patent manages the shopping workflow between virtual and physical stores; it does not involve AI-generated virtual try-on images at all.

**US 2021/0049830 A1 — Virtual Try-On for Spectacles**

| Aspect | US 2021/0049830 A1 | Present Invention |
|---|---|---|
| Technology | Face tracking + 3D model rendering | AI generative image editing |
| Product Category | Spectacles only | Jewelry, saree, watch, gift box, etc. |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** Spectacles-specific face tracking and 3D rendering is fundamentally different from AI generative image editing with VLM verification.

**US6546309B1 — Virtual fitting room**

| Aspect | US6546309B1 | Present Invention |
|---|---|---|
| Technology | Mathematical body model | AI image generation |
| Approach | Geometric transformation | Generative AI |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |
| Photorealism | Limited (geometric overlay) | High (AI-generated) |

**Differentiation:** Entirely different technological approach. US6546309B1 uses mathematical body modeling and geometric transformations, while the present invention uses AI image generation with VLM verification.

**US5930769A — Fashion shopping system with virtual mannequin**

| Aspect | US5930769A | Present Invention |
|---|---|---|
| Technology | Template-based mannequin | AI image generation |
| Personalization | Generic mannequin | User's actual selfie image |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** Fundamentally different approach — template-based mannequin vs. AI-generated personalized try-on.

**GB2488237A — Body model of user to show fit of clothing**

| Aspect | GB2488237A | Present Invention |
|---|---|---|
| Technology | Body modeling | AI image generation |
| Focus | Fit visualization | Color accuracy + visual quality |
| Quality Verification | None | VLM-based scoring |
| Refinement | None | Color accuracy refinement loop |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** GB2488237A addresses clothing fit using body modeling, while the present invention addresses color accuracy and visual quality using AI generation with VLM verification.

**US20150154691A1 — Online virtual fitting room with 3D scanning**

| Aspect | US20150154691A1 | Present Invention |
|---|---|---|
| Technology | 3D body scanning | AI image generation |
| Hardware Required | Specialized 3D scanner | Standard smartphone camera |
| Color Accuracy | Not addressed | Hex-code-based with VLM verification |
| Accessibility | Limited (requires hardware) | Universal (any camera) |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** The present invention eliminates the need for specialized hardware and addresses color accuracy, which 3D scanning approaches do not solve.

**EP3877954A4 — Learning-based animation of clothes (Meta)**

| Aspect | EP3877954A4 | Present Invention |
|---|---|---|
| Application | Avatar animation | E-commerce try-on |
| Color Accuracy | Not specifically addressed | Hex-code-based with VLM verification |
| Quality Verification | None | VLM-based scoring |
| Refinement | None | Color accuracy refinement loop |
| Category Awareness | None | Category-specific prompting |
| E-Commerce | None | Full integration |
| Non-Wearable Items | Not supported | Gift box and packaging visualization |

**Differentiation:** Meta's patent is directed at animating clothing on virtual avatars, a fundamentally different application than e-commerce virtual try-on. The present invention addresses specific e-commerce requirements including color accuracy, product verification, and purchase-decision support that are not relevant to avatar animation.

### 11.2 Novelty and Non-Obviousness Argument

**Novelty:** The present invention is novel because no single prior art reference discloses all of the following elements in combination: (1) multi-strategy generation pipeline with VLM verification; (2) dual-image edit with product color fidelity; (3) category-aware prompt engineering with sub-category classification including non-wearable luxury presentation items; (4) color accuracy refinement loop with hex-code extraction; (5) virtual visualization of non-wearable luxury presentation items (gift boxes, gift packaging); (6) canvas overlay fallback; and (7) automatic watermarking. While individual elements may exist in isolation, the specific combination and the VLM verification mechanism are not taught by any single reference. Critically, element (5) — virtual visualization of non-wearable luxury presentation items — is not taught by ANY reference, individually or in combination.

**Non-Obviousness:** The present invention is non-obvious because:

a) The use of a VLM to independently verify and score virtual try-on results against the original product is not taught or suggested by any prior art. The idea of using a language-capable vision model as a quality assurance mechanism for AI-generated images is a creative step that none of the cited references approach.

b) The dual-image edit strategy, which passes both the selfie and product image simultaneously to leverage direct visual color perception, is not taught or suggested by any prior art. Existing systems either use the product image as a cloth model for geometric overlay (not as a color reference) or rely on text descriptions.

c) The color accuracy refinement loop with hex-code-based color extraction is not taught or suggested by any prior art. The iterative process of VLM verification → color mismatch analysis → hex-code extraction → targeted refinement → re-verification represents a novel closed-loop feedback mechanism.

d) The extension of virtual try-on technology to non-wearable luxury presentation items (gift boxes, gift packaging) is not taught or suggested by any prior art. Every existing virtual try-on patent is directed to wearable items. The concept of visualizing a user holding, receiving, or presenting a gift box through AI-generated imagery represents a non-obvious extension that requires fundamentally different generation strategies, placement logic, and emotional context rendering.

e) The combination of these elements to specifically solve the luxury e-commerce color accuracy problem, extended to include gift packaging visualization, represents a non-obvious application of AI technology to specific domain problems that existing general-purpose virtual try-on systems do not address.

---

## 12. INFRINGEMENT MONITORING GUIDE

### 12.1 Key Terms to Monitor

Monitor the following terms and phrases in patent databases, academic publications, and product announcements:

**Core Technology Terms:**
- "VLM verification" + "virtual try-on"
- "Vision Language Model" + "virtual try-on"
- "multi-strategy" + "virtual try-on" + "generation"
- "color accuracy refinement" + "virtual try-on"
- "hex code" + "color" + "virtual try-on"
- "dual-image edit" + "virtual try-on"
- "product reference image" + "color fidelity" + "try-on"
- "iterative refinement" + "color" + "virtual try-on"

**Non-Wearable / Gift Box Terms (WHITE SPACE — Highest Priority):**
- "gift box" + "virtual try-on"
- "gift packaging" + "virtual visualization"
- "non-wearable" + "virtual try-on"
- "luxury presentation" + "AI image"
- "gift box" + "AI generated image"
- "holding gift box" + "AI image generation"
- "presenting gift" + "AI visualization"
- "unboxing visualization" + "AI"
- "gift wrapping" + "virtual try-on"
- "luxury packaging" + "virtual preview"

**Feature-Specific Terms:**
- "category-aware" + "prompt" + "virtual try-on"
- "jewelry sub-category" + "virtual try-on"
- "color verification" + "AI" + "try-on"
- "candidate scoring" + "virtual try-on"
- "fallback" + "canvas overlay" + "virtual try-on"
- "watermark" + "AI generated" + "try-on"

**Commercial Terms:**
- "AI style preview"
- "virtual try-on" + "luxury"
- "virtual try-on" + "color matching"
- "try-on" + "color accuracy"
- "virtual try-on" + "Shopify"
- "virtual try-on" + "affiliate"

**Competitor Names + Try-On:**
- "Myntra" + "virtual try-on"
- "Tanishq" + "virtual try-on"
- "CaratLane" + "virtual try-on"
- "Amazon" + "virtual try-on" + "jewelry"
- "Flipkart" + "virtual try-on"
- "Nykaa" + "virtual try-on"
- "Zando" / "Zalora" + "virtual try-on"
- "Farfetch" + "virtual try-on"
- "Net-a-Porter" + "virtual try-on"
- "Zugara" + "patent" + "litigation"

### 12.2 Platforms to Watch

**Patent Databases:**
- Indian Patent Office (ipindia.gov.in) — Weekly monitoring
- USPTO Patent Database (uspto.gov) — Weekly monitoring
- WIPO PatentScope (patentscope.wipo.int) — Weekly monitoring
- Espacenet (worldwide.espacenet.com) — Weekly monitoring
- Google Patents (patents.google.com) — Weekly monitoring

**Litigation Databases:**
- PACER (pacer.uscourts.gov) — Monthly monitoring for Zugara litigation updates
- CourtListener (courtlistener.com) — Monthly monitoring
- Lex Machina — Quarterly monitoring for VTO patent litigation trends

**Academic Databases:**
- arXiv (arxiv.org) — Monthly monitoring for computer vision and virtual try-on papers
- Google Scholar — Monthly monitoring
- IEEE Xplore — Monthly monitoring
- CVPR, ICCV, ECCV conference proceedings — Annual monitoring

**Industry Sources:**
- TechCrunch, VentureBeat — Virtual try-on and AI fashion technology news
- Product Hunt — New virtual try-on product launches
- LinkedIn — Patent filings and product announcements by competitors
- GitHub — Open-source virtual try-on projects incorporating VLM verification

**Specific Competitor Platforms:**
- Myntra's "MyFashionGPT" and try-on features
- Amazon's virtual try-on for jewelry and watches
- CaratLane's virtual try-on features
- Tanishq's digital try-on initiatives
- Google's virtual try-on features in Search and Shopping
- Pinterest's try-on features
- Snap's AR try-on for fashion

### 12.3 How to Detect Potential Infringement

**Step 1: Automated Patent Monitoring**
- Set up automated alerts on WIPO PatentScope and Google Patents for the key terms listed in Section 12.1
- Review new patent publications weekly
- Flag any patent application that includes VLM verification + virtual try-on
- **Highest Priority:** Flag any patent application that includes gift box/packaging virtual try-on

**Step 2: Product Feature Analysis**
- Test competitor products and document their virtual try-on features
- Look for indicators of multi-strategy generation (e.g., different results on retry)
- Check for VLM verification indicators (e.g., quality scoring, color accuracy mentions)
- Analyze whether competitor systems show evidence of color refinement (improved results after initial generation)
- **Check for non-wearable item visualization** (e.g., gift box try-on features)

**Step 3: Technical Deconstruction**
- Reverse-engineer competitor implementations where possible through API analysis
- Examine network requests to identify multi-strategy generation patterns
- Check for VLM API calls (e.g., calls to GPT-4V, Gemini Vision, Claude Vision)
- Analyze image metadata for watermarking patterns

**Step 4: Patent Claim Mapping**
- When a potentially infringing product is identified, map its features against the claims of the present invention
- Document specific feature correspondences
- Prepare an infringement analysis report

**Step 5: Legal Action**
- If infringement is detected, consult with a patent attorney to assess the strength of the infringement claim
- Consider sending a cease-and-desist letter
- Evaluate the commercial impact of the infringement
- Consider licensing as an alternative to litigation

**Key Indicators of Potential Infringement:**

1. A competitor's virtual try-on system generates multiple candidate images and selects the best one using an AI model that evaluates color accuracy
2. A competitor passes both a user selfie and a product image simultaneously to an AI model for try-on generation
3. A competitor's system performs iterative color correction on try-on images based on automated color analysis
4. A competitor's system uses hex-code-level color specifications in try-on generation prompts
5. A competitor's system dynamically adjusts prompts based on product category (especially with jewelry sub-classification)
6. A competitor's system includes a canvas-based fallback when AI services are unavailable
7. A competitor's system automatically watermarks generated try-on images
8. **A competitor offers virtual try-on or visualization for gift boxes or gift packaging**
9. **A competitor generates AI images of users holding, receiving, or presenting luxury gift boxes**
10. **A competitor uses occasion-specific expression guidance and scene context for non-wearable item visualization**

**Documentation Requirements:**
- Maintain a monitoring log with dates, sources, and findings
- Take screenshots of competitor products showing potentially infringing features
- Archive patent publications with analysis notes
- Store all evidence in a secure, organized manner for potential legal proceedings

---

## APPENDIX A: GLOSSARY

| Term | Definition |
|---|---|
| VLM | Vision Language Model — an AI model capable of analyzing images and generating textual descriptions, comparisons, and evaluations |
| Dual-Image Edit | A strategy that passes both a user selfie and a product reference image simultaneously to an AI image editing model |
| Hex Code | A six-character hexadecimal code representing a specific color in the RGB color model (e.g., #8B1A1A for deep maroon) |
| Color Accuracy Refinement Loop | An iterative process that uses VLM-derived color analysis to correct color mismatches in generated try-on images |
| Category-Aware Prompt Engineering | The dynamic adjustment of AI generation prompts based on product category and sub-category |
| Canvas Overlay Fallback | A client-side compositing system that creates a style preview when AI services are unavailable |
| Multi-Strategy Pipeline | A generation approach that produces multiple candidate images using distinct strategies and selects the best result |
| Composite Score | A weighted average of multiple evaluation dimensions used to rank candidate try-on images |
| PWA | Progressive Web App — a web application that can be installed on mobile devices and works offline |
| Shopify Headless Commerce | An e-commerce architecture where the Shopify backend is decoupled from the custom frontend |
| Affiliate Platform | An external e-commerce platform whose products are listed and linked through an affiliate partnership |
| Sharp | A high-performance Node.js image processing library used for watermarking and image manipulation |
| Non-Wearable Luxury Presentation Item | A luxury product that is not worn on the body but is held, presented, or received, such as a gift box, gift packaging, or presentation case |
| Gift Box Virtual Try-On | The AI-generated visualization of a user holding, receiving, or presenting a luxury gift box, a capability not found in any prior art |
| Occasion-Specific Expression Guidance | Instructions provided to the AI model to generate appropriate facial expressions based on the gifting occasion (e.g., excited for birthday, touched for anniversary) |
| Scene Context | Environmental and atmospheric description provided to the AI model to generate an appropriate background setting for the visualization |
| FTO | Freedom-to-Operate — a legal assessment of whether a product or process can be commercialized without infringing valid intellectual property rights of others |
| White Space | A gap in the patent landscape where no existing patents cover a particular technology or application, representing an opportunity for new patent filings |

## APPENDIX B: EXEMPLARY PROMPTS

### B.1 Dual-Image Edit Prompt (Jewelry — Necklace)

```
Look at the necklace shown in the reference image. Place this exact necklace 
on the person in the selfie photo, draped around their neck. The necklace 
must precisely match the reference image in: color (especially the rose gold 
metallic tone #B76E79 and the pearl white accents #F5F5DC), pendant design, 
chain style, and overall size proportion. The necklace should rest naturally 
on the collarbone area. Preserve the person's face, skin tone, hair, and 
body exactly as is. The result should look like a professional photograph.
```

### B.2 Dual-Image Edit Prompt (Luxury Gift Box — Anniversary)

```
Look at the luxury gift box shown in the reference image. Show the person 
in the selfie photo holding this exact gift box with both hands, cradling 
it gently at chest level. The gift box must precisely match the reference 
image in: color (especially the deep burgundy box #800020 and the gold 
ribbon #D4AF37), ribbon style, bow design, wrapping pattern, and overall 
size proportion. The person should have a touched, appreciative expression 
as if receiving a meaningful anniversary gift. The setting should suggest 
an elegant, intimate atmosphere with warm lighting. Preserve the person's 
face, skin tone, hair, and body exactly as is. The result should look like 
a professional photograph capturing a genuine emotional moment.
```

### B.3 VLM Verification Prompt

```
You are a quality verification system for AI-generated virtual try-on images. 
Compare the TRY-ON RESULT image with the ORIGINAL PRODUCT image.

Evaluate on these criteria (1-10 scale):

1. COLOR_ACCURACY: How precisely do the product colors in the try-on match 
   the original? Focus on primary color, secondary colors, and metallic tones.
   For gift boxes: evaluate box color, ribbon color, wrapping pattern colors.
2. PRODUCT_FIDELITY: How faithfully does the product design/pattern replicate 
   the original?
3. PLACEMENT_REALISM: How naturally is the product placed on the person?
   For gift boxes: evaluate hand positioning, grip realism, spatial proportion.
4. FACE_PRESERVATION: How well are the person's facial features preserved?
   Expression should be appropriate for the product context.
5. OVERALL_QUALITY: Overall photorealistic quality.

If COLOR_ACCURACY is below 7, describe the color mismatch with specific hex 
codes for both the correct (original) and incorrect (try-on) colors.

Output as JSON: {scores: {color_accuracy, product_fidelity, placement_realism, 
face_preservation, overall_quality}, color_analysis: {mismatch_detected, 
original_colors: [{name, hex}], try_on_colors: [{name, hex}], correction_needed}, 
refinement_recommendation: {should_refine, reason}}
```

### B.4 Color Refinement Prompt

```
Edit this image to correct the product colors. The necklace should be rose 
gold metallic with hex code #B76E79, but currently appears as yellow gold 
with hex code #FFD700. Change ONLY the necklace colors to match the target 
rose gold (#B76E79). The pearl accents should remain pearl white (#F5F5DC). 
Do NOT alter the person's face, skin tone, hair, body, or background. The 
corrected necklace color should be exactly #B76E79 rose gold.
```

### B.5 Color Refinement Prompt (Gift Box)

```
Edit this image to correct the gift box colors. The gift box should be deep 
burgundy with hex code #800020, but currently appears as bright red with hex 
code #FF0000. The ribbon should be gold with hex code #D4AF37, but currently 
appears as yellow with hex code #FFFF00. Change ONLY the gift box and ribbon 
colors to match the target colors. Do NOT alter the person's face, skin tone, 
hair, body, expression, or background. The corrected box color should be 
exactly #800020 deep burgundy and the ribbon should be exactly #D4AF37 gold.
```

---

## APPENDIX C: FLOWCHART DESCRIPTIONS (for formal patent drawings)

### C.1 Figure 2 — Pipeline Flow (Formal Description)

```
START
  |
  v
[Receive User Selfie + Product ID]
  |
  v
[Validate Selfie: Resolution Check, Face Detection]
  |-- Invalid --> [Return Error]
  |-- Valid --> Continue
  |
  v
[Retrieve Product Data: Image, Category, Sub-category]
  |
  v
[Identify Product Category: Wearable or Non-Wearable?]
  |-- Wearable (Jewelry/Saree/Watch) --> [Load Wearable Category Config]
  |-- Non-Wearable (Gift Box/Packaging) --> [Load Gift Box Category Config 
                                              with Occasion/Size/Wrapping Style]
  |
  v
[Extract Product Colors via VLM with Hex Codes]
  |
  v
[Generate Candidates]:
  |-- Strategy 1: Dual-Image Edit (Selfie + Product Image)
  |     For Non-Wearable: "Show person holding/receiving/presenting item"
  |-- Strategy 2: Selfie-Edit (Selfie + Text Prompt)
  |-- Strategy 3: Product-Edit (Product Image + User Description)
  |-- Strategy 4: Text-to-Image (Combined Text Prompt)
  |
  v
[VLM Verify Each Candidate vs. Original Product]
  |
  v
[Calculate Weighted Composite Scores]
  |
  v
[Select Highest-Scoring Candidate]
  |
  v
[Color Accuracy >= 7/10?]
  |-- Yes --> [Apply Watermark] --> [Output Result] --> END
  |-- No --> [Extract Color Mismatch from VLM]
              |
              v
           [Generate Refinement with Hex-Code Corrections]
              |
              v
           [VLM Re-verify Refined Image]
              |
              v
           [Refined Score > Original Score?]
              |-- Yes --> [Accept Refined Image] --> [Apply Watermark] --> [Output Result] --> END
              |-- No --> [Keep Original] --> [Apply Watermark] --> [Output Result] --> END
```

### C.2 Figure 5 — Color Refinement Loop (Formal Description)

```
[Selected Candidate Image]
  |
  v
[Color Accuracy Score < Threshold?]
  |-- No --> [Proceed to Watermarking]
  |-- Yes --> [Iteration = 1]
              |
              v
           [Extract VLM Color Analysis:
            - Mismatch Description
            - Original Hex Codes
            - Current Hex Codes
            - Correction Needed]
              |
              v
           [Construct Refinement Prompt with
            Hex-Code Specifications]
              |
              v
           [Submit Candidate + Refinement Prompt
            to AI Image Editing Model]
              |
              v
           [Receive Refined Image]
              |
              v
           [VLM Re-verify Refined Image]
              |
              v
           [Refined Composite Score >
            Original Composite Score?]
              |-- Yes --> [Accept Refined Image]
              |-- No --> [Discard Refined Image,
                          Keep Original]
              |
              v
           [Color Accuracy Score >= Threshold
            OR Iteration >= Max Iterations?]
              |-- Yes --> [Proceed to Watermarking]
              |-- No --> [Iteration = Iteration + 1]
                          |
                          v
                       [Loop back to Extract VLM Color Analysis]
```

### C.3 Figure 9 — Gift Box Virtual Try-On Flow (Formal Description)

```
[Receive User Selfie + Gift Box Product ID]
  |
  v
[Identify Product Category: LUXURY_GIFT_BOX]
  |
  v
[Sub-classify Gift Box]:
  |-- Occasion: Birthday / Anniversary / Wedding / Festival
  |-- Size: Small / Medium / Large
  |-- Wrapping Style: Ribbon / Floral / Minimalist
  |
  v
[Load Gift Box Category Configuration]:
  |-- Placement: "person holding gift box with both hands"
  |-- Expression: Occasion-specific (e.g., "warm smile" for birthday)
  |-- Scene Context: Occasion-specific (e.g., "festive atmosphere")
  |-- Color Priority: box_primary_color, ribbon_color, accent_color
  |
  v
[Extract Gift Box Colors via VLM with Hex Codes]
  |
  v
[Generate Gift Box Visualization Candidates]:
  |-- Strategy 1: Dual-Image Edit 
       "Show person holding this exact gift box with [expression]"
  |-- Strategy 2: Selfie-Edit
       "Add [occasion] gift box ([box_color] with [ribbon_color] ribbon)"
  |-- Strategy 3: Product-Edit
       "Show person with [user_description] holding this gift box"
  |-- Strategy 4: Text-to-Image
       "Person holding [occasion] gift box in [scene_context]"
  |
  v
[VLM Verify Each Candidate vs. Original Gift Box]
  |-- Evaluate: box color accuracy, ribbon color accuracy, 
     wrapping pattern fidelity, hand positioning realism,
     expression appropriateness, proportional accuracy
  |
  v
[Select Highest-Scoring Candidate]
  |
  v
[Color Accuracy Refinement if Needed]
  |
  v
[Apply Watermark] --> [Output Gift Box Visualization] --> END
```

---

*End of Patent Application Document*

**CONFIDENTIAL — FOR PATENT FILING PURPOSES ONLY**

**Prepared for:** 3 BOXES GIFTS Private Limited  
**Document Version:** 2.0  
**Date:** March 5, 2026  
**Status:** Draft — Updated with Comprehensive Patent Research Findings — Ready for Patent Attorney Review

---

**DISCLAIMER:** This document is prepared as a draft patent application for review by a qualified patent attorney or agent. It does not constitute legal advice. Patent claims should be reviewed and refined by a licensed patent practitioner before filing. The prior art analysis and freedom-to-operate assessment are based on available information and should be supplemented by a professional patentability search and formal FTO opinion. The identification of white space in the patent landscape does not guarantee patentability and should be verified through professional patent search and analysis. The litigation context information is based on publicly available court filings and does not constitute a legal opinion on the validity or scope of any patent.
