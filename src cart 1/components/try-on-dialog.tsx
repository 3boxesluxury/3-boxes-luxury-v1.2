'use client';

/**
 * @deprecated This standalone TryOnDialog is STALE and should NOT be used.
 * The active TryOnDialog is embedded in product-detail.tsx which has:
 *   - productImageBase64 support for CORS-free canvas fallback
 *   - Better error handling and selfieImg loading
 *   - onBackgroundJob / onResetBackground callbacks
 *   - watermarkedResult, strategy, faceScore, productScore state
 *   - AI style suggestions in the result step
 *
 * Do not import or use this component. It will be removed in a future cleanup.
 * If you need TryOnDialog, use the one in product-detail.tsx instead.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Loader2,
  X,
  RotateCcw,
  Download,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';

interface TryOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string;
  categorySlug?: string;
  rawProductImage?: string;
}

type Step = 'upload' | 'preview' | 'generating' | 'result';

/**
 * Compress an image file to reduce payload size before sending to the API.
 * Resizes to max 1024px on the longest side and reduces quality.
 */
function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if needed
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for smaller size
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Educational facts shown during AI generation to keep users informed.
 */
const AI_EDUCATION_FACTS = [
  "📸 AI analyzes your facial features to create a personalized try-on experience",
  "🎨 Our AI preserves your skin tone and facial features while adding the product",
  "⚡ The AI processes over 1 million pixels to generate your style preview",
  "🔍 Each try-on goes through a multi-step quality verification process",
  "👤 Face preservation is our top priority — your features stay authentic",
  "🌈 Color accuracy is verified against the original product image",
  "✨ The AI uses dual-image technology for maximum product accuracy",
  "🛡️ Your photos are processed securely and never stored permanently",
  "🎯 Our AI considers product type, material, and fit for natural results",
  "💡 Try-on works best with clear, well-lit selfies facing the camera",
];

export function TryOnDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  categorySlug,
  rawProductImage,
}: TryOnDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-rotate educational facts every 3 seconds during generation
  useEffect(() => {
    if (step !== 'generating') return;
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % AI_EDUCATION_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  const reset = useCallback(() => {
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setError(null);
    setProgress('');
    setProgressPercent(0);
    setCurrentFactIndex(0);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (JPG, PNG, WebP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }

      setError(null);

      try {
        // Compress the image to reduce payload size
        const compressed = await compressImage(file, 1024, 0.8);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        setError('Please drop an image file');
        return;
      }
      setError(null);
      try {
        const compressed = await compressImage(file, 1024, 0.8);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * Client-side canvas fallback: overlay the product image on the selfie.
   * Used when the AI backend service is unavailable (e.g., Vercel serverless).
   */
  const generateCanvasFallback = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const selfieImg = document.createElement('img');
        selfieImg.crossOrigin = 'anonymous';
        selfieImg.onload = () => {
          const canvas = document.createElement('canvas');
          const width = Math.max(selfieImg.naturalWidth, 512);
          const height = Math.max(selfieImg.naturalHeight, 680);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }

          // Draw the selfie as the base
          ctx.drawImage(selfieImg, 0, 0, width, height);

          // Vignette overlay
          const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
          vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
          vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
          ctx.fillStyle = vignetteGrad;
          ctx.fillRect(0, 0, width, height);

          // Render product panel
          const renderProductPanel = (pImg?: HTMLImageElement) => {
            const productW = Math.floor(width * 0.38);
            const productH = pImg ? Math.floor(width * 0.38) : Math.floor(width * 0.25);
            const panelW = productW + 20;
            const panelH = productH + 56;
            const px = width - panelW - 14;
            const py = height - panelH - 40;

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 4;
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.roundRect(px, py, panelW, panelH, 12);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = '#daa520';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(px, py, panelW, panelH, 12);
            ctx.stroke();
            ctx.restore();

            if (pImg) {
              ctx.save();
              ctx.globalAlpha = 1.0;
              ctx.beginPath();
              ctx.roundRect(px + 10, py + 10, productW, productH, 8);
              ctx.clip();
              ctx.drawImage(pImg, px + 10, py + 10, productW, productH);
              ctx.restore();
            } else {
              ctx.save();
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              ctx.roundRect(px + 10, py + 10, productW, productH, 8);
              ctx.fillStyle = '#292524';
              ctx.fill();
              ctx.restore();
            }

            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#daa520';
            ctx.font = `bold ${Math.max(11, Math.floor(productW * 0.065))}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            const labelY = py + productH + 28;
            let label = productName.substring(0, 30);
            while (ctx.measureText(label).width > productW && label.length > 3) {
              label = label.slice(0, -4) + '...';
            }
            ctx.fillText(label, px + panelW / 2, labelY);
            ctx.restore();
          };

          // Badge
          ctx.save();
          ctx.globalAlpha = 0.92;
          const badgeW = Math.floor(width * 0.35);
          const badgeH = Math.floor(height * 0.04);
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.roundRect(12, 12, badgeW, badgeH, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(218,165,32,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(12, 12, badgeW, badgeH, 6);
          ctx.stroke();
          ctx.fillStyle = '#daa520';
          ctx.font = `bold ${Math.max(9, Math.floor(badgeH * 0.5))}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('✨ STYLE PREVIEW', 12 + badgeW / 2, 12 + badgeH * 0.68);
          ctx.restore();

          // Try loading product image with timeout
          const productImg = document.createElement('img');
          productImg.crossOrigin = 'anonymous';

          let resolved = false;
          const finish = (img?: HTMLImageElement) => {
            if (resolved) return;
            resolved = true;
            renderProductPanel(img);

            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#daa520';
            ctx.font = `bold ${Math.max(10, Math.floor(width * 0.018))}px Arial, sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText('3BOXES GIFTS · AI Style Preview', width - 14, height - 14);
            ctx.restore();

            resolve(canvas.toDataURL('image/png'));
          };

          productImg.onload = () => finish(productImg);
          productImg.onerror = () => finish();
          setTimeout(() => finish(), 5000);

          let imgSrc = productImage;
          if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
          } else if (imgSrc.startsWith('//')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(`https:${imgSrc}`)}`;
          } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('/api/')) {
            imgSrc = `${window.location.origin}${imgSrc}`;
          }
          productImg.src = imgSrc;
        };
        selfieImg.onerror = () => resolve(null);
        selfieImg.src = selfieData!;
      } catch {
        resolve(null);
      }
    });
  }, [selfieData, productImage, productName]);

  /**
   * Poll a try-on job until completed or failed.
   * Works with both local /api/try-on and direct proxy URLs.
   */
  const pollJob = useCallback(async (
    jobId: string,
    baseUrl: string,
    onComplete: (imageUrl: string) => void,
    onFailed: (error: string) => void,
  ) => {
    setProgress('Generating your try-on look...');
    setProgressPercent(50);

    const pollInterval = setInterval(async () => {
      try {
        let statusUrl: string;
        if (baseUrl.includes('.space-z.ai')) {
          statusUrl = `${baseUrl}/api/try-on?XTransformPort=3030&jobId=${encodeURIComponent(jobId)}`;
        } else {
          statusUrl = `${baseUrl}/api/try-on?jobId=${encodeURIComponent(jobId)}`;
        }

        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();

        if (statusData.progress) {
          setProgress(statusData.progress);
        }

        // Update progress percentage based on pipeline phase
        if (statusData.pipelinePhase === 'product-analysis') setProgressPercent(30);
        else if (statusData.pipelinePhase === 'generation') setProgressPercent(50);
        else if (statusData.pipelinePhase === 'verification') setProgressPercent(70);
        else if (statusData.pipelinePhase === 'refinement') setProgressPercent(80);
        else if (statusData.pipelinePhase === 'watermark') setProgressPercent(90);

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          setProgressPercent(100);
          if (!statusData.imageUrl || statusData.strategy === 'canvas-fallback') {
            onFailed('AI generation unavailable');
            return;
          }
          onComplete(statusData.imageUrl);
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          onFailed(statusData.error || 'Generation failed. Please try again.');
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 3000);

    // Safety timeout: stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selfieData) return;

    setStep('generating');
    setError(null);
    setProgress('Uploading your photo...');
    setProgressPercent(10);

    const requestPayload = {
      productId,
      selfieData,
      productImageUrl: rawProductImage || productImage,
      productName,
      categorySlug: categorySlug || '',
    };

    try {
      // ── Strategy 1: Try the server API (works locally, may return canvas mode on Vercel) ──
      setProgress('Connecting to AI service...');
      setProgressPercent(30);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Non-JSON response:', response.status, errorText.substring(0, 200));
        throw new Error(
          response.status === 413
            ? 'Image is too large. Please try a smaller photo.'
            : response.status === 503
            ? 'AI service is currently busy. Please try again in a moment.'
            : `Server error (${response.status}). Please try again.`
        );
      }

      const data = await response.json();

      // If server returned canvas mode, try direct client-to-proxy before falling back
      if (data.mode === 'canvas' || data.code === 'AI_CANVAS_MODE') {
        console.log('[try-on] Server returned canvas mode, trying direct proxy from client...');

        // ── Strategy 2: Try direct client-side proxy call to sandbox AI service ──
        let proxyUrl = '';
        try {
          const configRes = await fetch('/api/config', { signal: AbortSignal.timeout(3000) });
          if (configRes.ok) {
            const configData = await configRes.json();
            proxyUrl = configData.aiProxyUrl || '';
          }
        } catch {}
        if (!proxyUrl) {
          proxyUrl = process.env.NEXT_PUBLIC_AI_PROXY_URL || '';
        }
        if (proxyUrl) {
          try {
            setProgress('Connecting to AI service...');
            setProgressPercent(30);
            let proxyFetchUrl: string;
            if (proxyUrl.includes('.space-z.ai')) {
              proxyFetchUrl = `${proxyUrl}/api/try-on?XTransformPort=3030`;
            } else {
              proxyFetchUrl = `${proxyUrl}/api/try-on`;
            }

            const proxyResponse = await fetch(proxyFetchUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload),
              signal: AbortSignal.timeout(90000),
            });

            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.jobId) {
                // Poll the proxy for results
                const pollBaseUrl = proxyUrl;
                await new Promise<void>((resolve, reject) => {
                  pollJob(
                    proxyData.jobId,
                    pollBaseUrl,
                    (imageUrl) => {
                      setResultImage(imageUrl);
                      setProgressPercent(100);
                      setStep('result');
                      resolve();
                    },
                    (error) => {
                      reject(new Error(error));
                    },
                  );
                });
                return;
              }
              if (proxyData.imageUrl) {
                setProgressPercent(100);
                setResultImage(proxyData.imageUrl);
                setStep('result');
                return;
              }
            }
            console.log('[try-on] Direct proxy call failed, falling back to canvas');
          } catch (directProxyErr) {
            console.log('[try-on] Direct proxy unavailable:', directProxyErr instanceof Error ? directProxyErr.message : String(directProxyErr));
          }
        }

        // ── Strategy 3: Canvas fallback ──
        setProgress('Creating style preview overlay...');
        setProgressPercent(70);
        const canvasResult = await generateCanvasFallback();
        if (canvasResult) {
          setProgressPercent(100);
          setResultImage(canvasResult);
          setStep('result');
          return;
        }
        setError('Could not generate style preview. Please try again later.');
        setStep('preview');
        return;
      }

      if (!response.ok) {
        if (response.status === 503 || data.code === 'AI_SERVICE_UNAVAILABLE') {
          setProgress('AI service unavailable. Creating style preview overlay...');
          setProgressPercent(70);
          const canvasResult = await generateCanvasFallback();
          if (canvasResult) {
            setProgressPercent(100);
            setResultImage(canvasResult);
            setStep('result');
            return;
          }
        }
        throw new Error(data.error || `Error: ${response.status}`);
      }

      // If server returned a jobId, poll for completion
      if (data.jobId) {
        setProgress('AI is analyzing your photo...');
        setProgressPercent(50);
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/try-on?jobId=${data.jobId}`);
            const statusData = await statusRes.json();

            if (statusData.progress) {
              setProgress(statusData.progress);
            }

            // Update progress percentage based on pipeline phase
            if (statusData.pipelinePhase === 'product-analysis') setProgressPercent(30);
            else if (statusData.pipelinePhase === 'generation') setProgressPercent(50);
            else if (statusData.pipelinePhase === 'verification') setProgressPercent(70);
            else if (statusData.pipelinePhase === 'refinement') setProgressPercent(80);
            else if (statusData.pipelinePhase === 'watermark') setProgressPercent(90);

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              setProgressPercent(100);
              if (!statusData.imageUrl || statusData.strategy === 'canvas-fallback') {
                setProgress('Creating style preview overlay...');
                setProgressPercent(70);
                const canvasResult = await generateCanvasFallback();
                if (canvasResult) {
                  setResultImage(canvasResult);
                  setStep('result');
                } else {
                  setError('Could not generate style preview. Please try again later.');
                  setStep('preview');
                }
                return;
              }
              setResultImage(statusData.imageUrl);
              setStep('result');
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              setProgress('AI generation failed. Trying style preview...');
              setProgressPercent(70);
              const canvasResult = await generateCanvasFallback();
              if (canvasResult) {
                setProgressPercent(100);
                setResultImage(canvasResult);
                setStep('result');
              } else {
                setError(statusData.error || 'Generation failed. Please try again.');
                setStep('preview');
              }
            }
          } catch (pollErr) {
            console.error('Polling error:', pollErr);
          }
        }, 3000);

        setTimeout(() => clearInterval(pollInterval), 120000);
        return;
      }

      // Direct imageUrl returned (immediate result)
      if (data.imageUrl) {
        setProgressPercent(100);
        setResultImage(data.imageUrl);
        setStep('result');
        return;
      }

      throw new Error('Unexpected response from server');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. The AI service may be busy — please try again.');
        setStep('preview');
      } else {
        setProgress('Trying style preview fallback...');
        setProgressPercent(70);
        const canvasResult = await generateCanvasFallback();
        if (canvasResult) {
          setProgressPercent(100);
          setResultImage(canvasResult);
          setStep('result');
        } else {
          setError(err instanceof Error ? err.message : 'Something went wrong');
          setStep('preview');
        }
      }
    }
  }, [selfieData, productId, productImage, productName, categorySlug, rawProductImage, generateCanvasFallback, pollJob]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Upload your selfie and see how{' '}
              <span className="text-amber-300">{productName}</span> looks on
              you
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Product Preview */}
                <div className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-900/60 p-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={productImage}
                      alt={productName}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-100">
                      {productName}
                    </p>
                    <p className="text-xs text-amber-200/40">
                      Selected for try-on
                    </p>
                  </div>
                </div>

                {/* Upload Area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/30 bg-stone-900/30 px-6 py-10 transition-all hover:border-amber-600/40 hover:bg-stone-900/50"
                >
                  <div className="mb-4 rounded-full bg-amber-900/20 p-4 transition-colors group-hover:bg-amber-900/30">
                    <Camera className="h-8 w-8 text-amber-400/60 transition-colors group-hover:text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-amber-200/70">
                    Upload your selfie
                  </p>
                  <p className="mt-1 text-xs text-amber-200/30">
                    Drag & drop or click to browse
                  </p>
                  <p className="mt-2 text-[10px] text-amber-200/20">
                    JPG, PNG, or WebP · Max 10MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <p className="text-center text-[10px] text-amber-200/20">
                  Your photo is processed securely and not stored permanently
                </p>
              </motion.div>
            )}

            {/* Step 2: Preview selfie before generating */}
            {step === 'preview' && selfiePreview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-4">
                  {/* Selfie Preview */}
                  <div className="relative flex-1">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60">
                      <Image
                        src={selfiePreview}
                        alt="Your selfie"
                        fill
                        className="object-cover"
                        sizes="300px"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setSelfiePreview(null);
                        setSelfieData(null);
                        setStep('upload');
                      }}
                      className="absolute right-2 top-2 rounded-full bg-stone-900/80 p-1.5 text-amber-200/60 transition-colors hover:bg-red-900/60 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Arrow + Product */}
                  <div className="flex flex-col items-center justify-center gap-2 pt-8">
                    <Sparkles className="h-6 w-6 text-amber-400/40" />
                    <span className="text-[10px] text-amber-200/30">+</span>
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-amber-900/20">
                      <Image
                        src={productImage}
                        alt={productName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <span className="text-[10px] text-amber-200/30">=</span>
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-amber-900/20 bg-stone-900/60">
                      <ImageIcon className="h-6 w-6 text-amber-400/40" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelfiePreview(null);
                      setSelfieData(null);
                      setStep('upload');
                    }}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Try-On
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Generating — Enhanced with Progress Bar + Educational Content */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 py-4"
              >
                {/* Spinner + title */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                    <div className="relative rounded-full bg-amber-900/20 p-6">
                      <Sparkles className="h-10 w-10 animate-pulse text-amber-400" />
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-amber-100">
                    Creating Your Look
                  </h3>
                  <p className="mt-1 text-center text-sm text-amber-200/50">
                    This may take 30–60 seconds...
                  </p>
                </div>

                {/* Progress Bar using shadcn/ui */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-300/80">
                      {progress || 'Processing with AI...'}
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      {progressPercent}%
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-3 bg-stone-800/80 border border-amber-900/20 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-600 [&>[data-slot=progress-indicator]]:via-amber-400 [&>[data-slot=progress-indicator]]:to-amber-300"
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-amber-200/30">Starting</span>
                    <span className="text-[10px] text-amber-200/30">Complete</span>
                  </div>
                </div>

                {/* Scrolling Educational Content with AnimatePresence */}
                <div className="rounded-lg border border-amber-900/25 bg-stone-900/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-amber-900/15 bg-amber-950/25">
                    <p className="text-[10px] font-semibold text-amber-400/80 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      How AI Style Preview Works
                    </p>
                  </div>
                  <div className="px-3 py-3 min-h-[72px] flex items-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentFactIndex}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-sm leading-relaxed text-amber-200/60">
                          {AI_EDUCATION_FACTS[currentFactIndex]}
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  {/* Fact indicator dots */}
                  <div className="flex items-center justify-center gap-1 pb-2">
                    {AI_EDUCATION_FACTS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          i === currentFactIndex
                            ? 'w-4 bg-amber-400'
                            : 'w-1 bg-amber-900/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Loader indicator */}
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400/60" />
                  <span className="text-xs text-amber-200/30">
                    {progress || 'Processing with AI...'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result — Enhanced with AI-Generated Disclaimer */}
            {step === 'result' && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-600/30 bg-stone-900/60">
                  <Image
                    src={resultImage}
                    alt={`Virtual try-on: ${productName}`}
                    fill
                    className="object-cover"
                    sizes="500px"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
                    Style Preview
                  </div>
                </div>

                {/* AI-Generated Disclaimer — Enhanced */}
                <div className="rounded-lg border border-amber-600/20 bg-amber-900/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-300">AI-Generated Image</p>
                      <p className="text-[11px] text-amber-200/50 mt-0.5">
                        This is an AI-generated style preview. Actual product appearance may vary slightly. 
                        Colors and details are approximated and there might be minor mismatches that can be 
                        rectified by consulting our style experts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <a
                    href={resultImage}
                    download
                    className="flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-stone-950 transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Save Image
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
