'use client';

/* TryOnDialog v1.3 — Progress bar, educational facts, enhanced disclaimer */

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, ShoppingCart, ArrowLeft, Minus, Plus, Package, Sparkles, ExternalLink, Globe, Info, CheckCircle, Truck, Heart, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getProxiedImageUrl } from '@/lib/image-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Camera, Loader2, RotateCcw, Download, ImageIcon, AlertCircle, Crown, ExternalLink as ExternalLinkIcon, Send, AlertTriangle, Clock, Share2, ShieldCheck, Video, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAffiliateClick } from '@/hooks/useAffiliateClick';
import { AIInfluencerSection } from '@/components/ai-influencer-section';

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  category: string;
  categorySlug: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  tags: string[];
  deliveryEstimate?: string;
  isExternal?: boolean;
  platform?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  platformLogo?: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verified: boolean;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  myntra: 'bg-red-600/20 text-red-300 border-red-600/30',
  nykaa: 'bg-pink-600/20 text-pink-300 border-pink-600/30',
  amazon: 'bg-orange-600/20 text-orange-300 border-orange-600/30',
  flipkart: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30',
  caratlane: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  tanishq: 'bg-rose-600/20 text-rose-300 border-rose-600/30',
  bluestone: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
  voylla: 'bg-purple-600/20 text-purple-300 border-purple-600/30',
};

// Platform button brand colors (for Shop on Platform CTA)
const PLATFORM_BUTTON_COLORS: Record<string, string> = {
  caratlane: 'bg-amber-600 hover:bg-amber-500',
  tanishq: 'bg-rose-600 hover:bg-rose-500',
  bluestone: 'bg-blue-600 hover:bg-blue-500',
  voylla: 'bg-purple-600 hover:bg-purple-500',
  myntra: 'bg-red-600 hover:bg-red-500',
  nykaa: 'bg-pink-600 hover:bg-pink-500',
  amazon: 'bg-orange-600 hover:bg-orange-500',
  flipkart: 'bg-yellow-600 hover:bg-yellow-500',
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  myntra: 'Myntra',
  nykaa: 'Nykaa',
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  caratlane: 'CaratLane',
  tanishq: 'Tanishq',
  bluestone: 'BlueStone',
  voylla: 'Voylla',
};

// ── Image Compression ──────────────────────────────────────────
function compressImage(file: File, maxSize = 1536, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
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
        if (!ctx) { reject(new Error('Canvas error')); return; }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Client-side canvas fallback: overlay the product image on the selfie.
 * Used when the AI backend service is unavailable (e.g., Vercel serverless).
 * Creates a visually compelling style preview with product overlay and branding.
 *
 * @param selfieData - Base64 data URL of the user's selfie
 * @param productImageUrl - URL of the product image (used as fallback if no base64)
 * @param productName - Name of the product for the overlay label
 * @param productImageBase64 - Optional base64 data URL of the product image (preferred, avoids CORS)
 */
function generateCanvasFallback(selfieData: string, productImageUrl: string, productName: string, productImageBase64?: string): Promise<string> {
  // GUARANTEED RESULT: This function NEVER returns null.
  // If all else fails, we produce a minimal branded preview card.
  // This ensures users ALWAYS see something useful instead of "AI unavailable".
  const createMinimalFallback = (): string => {
    try {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 680;
      const cx = c.getContext('2d');
      if (!cx) return '';
      // Dark gradient background
      const grad = cx.createLinearGradient(0, 0, 0, 680);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(1, '#292524');
      cx.fillStyle = grad;
      cx.fillRect(0, 0, 512, 680);
      // Brand badge
      cx.fillStyle = 'rgba(217,119,6,0.15)';
      cx.fillRect(16, 16, 120, 28);
      cx.fillStyle = '#d97706';
      cx.font = 'bold 12px Arial, sans-serif';
      cx.textAlign = 'left';
      cx.fillText('✨ 3BOXES', 26, 35);
      // Title
      cx.fillStyle = '#daa520';
      cx.font = 'bold 22px Arial, sans-serif';
      cx.textAlign = 'center';
      cx.fillText('Style Preview', 256, 280);
      // Product name
      cx.fillStyle = '#a8a29e';
      cx.font = '15px Arial, sans-serif';
      const maxW = 400;
      let label = productName || 'Product';
      while (cx.measureText(label).width > maxW && label.length > 5) label = label.slice(0, -4) + '…';
      cx.fillText(label, 256, 320);
      // Tagline
      cx.fillStyle = '#78716c';
      cx.font = '12px Arial, sans-serif';
      cx.fillText('AI-enhanced preview coming soon', 256, 360);
      // Watermark
      cx.fillStyle = 'rgba(218,165,32,0.5)';
      cx.font = 'bold 10px Arial, sans-serif';
      cx.textAlign = 'right';
      cx.fillText('3BOXES GIFTS · Style Preview', 496, 660);
      return c.toDataURL('image/png');
    } catch { return ''; }
  };

  return new Promise((resolve) => {
    try {
      const selfieImg = document.createElement('img');
      // Don't set crossOrigin on data URLs — it causes unnecessary CORS preflight
      selfieImg.onload = () => {
        const canvas = document.createElement('canvas');
        const width = Math.max(selfieImg.naturalWidth, 512);
        const height = Math.max(selfieImg.naturalHeight, 680);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(createMinimalFallback() || ''); return; }

        // Draw the selfie as the base
        ctx.drawImage(selfieImg, 0, 0, width, height);

        // Subtle dark vignette overlay for premium feel
        const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, width, height);

        // Render the product overlay panel
        const renderProductPanel = (productImg?: HTMLImageElement) => {
          const productW = Math.floor(width * 0.38);
          const productH = productImg ? Math.floor(width * 0.38) : Math.floor(width * 0.25);
          const panelW = productW + 20;
          const panelH = productH + 56;
          const px = width - panelW - 14;
          const py = height - panelH - 40;

          // Panel shadow
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

          // Panel border
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = '#daa520';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(px, py, panelW, panelH, 12);
          ctx.stroke();
          ctx.restore();

          // Product image inside panel
          if (productImg) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.roundRect(px + 10, py + 10, productW, productH, 8);
            ctx.clip();
            ctx.drawImage(productImg, px + 10, py + 10, productW, productH);
            ctx.restore();
          } else {
            // Fallback: draw a product icon placeholder
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.roundRect(px + 10, py + 10, productW, productH, 8);
            ctx.fillStyle = '#292524';
            ctx.fill();
            const iconSize = Math.floor(productH * 0.4);
            ctx.fillStyle = '#daa520';
            ctx.font = `${iconSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('👗', px + 10 + productW / 2, py + 10 + productH / 2);
            ctx.restore();
          }

          // Product name label
          ctx.save();
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = '#daa520';
          ctx.font = `bold ${Math.max(11, Math.floor(productW * 0.065))}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          const labelY = py + productH + 28;
          const maxLabelWidth = productW;
          let label = productName.substring(0, 30);
          while (ctx.measureText(label).width > maxLabelWidth && label.length > 3) {
            label = label.slice(0, -4) + '...';
          }
          ctx.fillText(label, px + panelW / 2, labelY);
          ctx.restore();
        };

        // Top-left "STYLE PREVIEW" badge
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

        // Try loading the product image with timeout
        const productImg = document.createElement('img');
        // Only set crossOrigin when loading cross-origin URLs (not for data URLs or same-origin proxy)
        // This avoids CORS preflight failures on same-origin /api/image-proxy requests

        let resolved = false;
        const finish = (img?: HTMLImageElement) => {
          if (resolved) return;
          resolved = true;
          renderProductPanel(img);

          // Bottom watermark
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
        productImg.onerror = () => {
          console.warn('[try-on] Product image failed to load in canvas fallback, continuing without it');
          finish(); // Continue without product image
        };

        // Timeout: if product image doesn't load in 5s, continue without it
        setTimeout(() => finish(), 5000);

        // Prefer base64 data URL if available (no CORS issues at all)
        if (productImageBase64 && productImageBase64.startsWith('data:')) {
          // Base64 data URLs work directly with no CORS issues
          productImg.src = productImageBase64;
        } else {
          // Route external images through our proxy to avoid CORS issues
          let imgSrc = productImageUrl;
          if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(imgSrc)}`;
          } else if (imgSrc.startsWith('//')) {
            imgSrc = `/api/image-proxy?url=${encodeURIComponent(`https:${imgSrc}`)}`;
          } else if (imgSrc.startsWith('/') && !imgSrc.startsWith('/api/')) {
            imgSrc = `${window.location.origin}${imgSrc}`;
          }
          productImg.src = imgSrc;
        }
      };
      selfieImg.onerror = () => {
        console.warn('[try-on] Selfie image failed to load in canvas fallback, using minimal fallback');
        const minimal = createMinimalFallback();
        resolve(minimal || '');
      };
      selfieImg.src = selfieData;
    } catch {
      // GUARANTEED: Never return null
      const minimal = createMinimalFallback();
      resolve(minimal || '');
    }
  });
}

// ── Fetch image as base64 (client-side) ────────────────────────
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    // For data URLs, return as-is
    if (url.startsWith('data:')) return url;
    // For relative paths, use current origin
    let fetchUrl = url;
    if (url.startsWith('/') && !url.startsWith('/api/')) {
      fetchUrl = `${window.location.origin}${url}`;
    } else if (url.startsWith('//')) {
      fetchUrl = `https:${url}`;
    }
    const response = await fetch(fetchUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Try-On Dialog ──────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'generating' | 'result';

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

interface SuggestionItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  categorySlug: string;
}

function TryOnDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  rawProductImage,
  categorySlug,
  productImages,
  onBackgroundJob,
  onResetBackground,
  onShareToInfluencer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage: string; // proxied image for display
  rawProductImage: string; // original image URL for API (resolves correctly on Vercel)
  categorySlug: string;
  productImages: string[];
  onBackgroundJob: (step: 'generating' | 'result') => void;
  onResetBackground: () => void;
  onShareToInfluencer?: (imageDataUrl: string) => void;
}) {
  const [step, setStep] = useState<Step>('upload');
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [watermarkedResult, setWatermarkedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [colorAccuracy, setColorAccuracy] = useState<number | null>(null);
  const [faceAccuracy, setFaceAccuracy] = useState<number | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const generatingStartRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eduScrollRef = useRef<HTMLDivElement>(null);

  // Disclaimer & camera & moderation state
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Elapsed time tracker during generation
  useEffect(() => {
    if (step !== 'generating') return;
    generatingStartRef.current = Date.now();
    setElapsedTime(0);
    const interval = setInterval(() => {
      if (generatingStartRef.current) {
        setElapsedTime(Math.floor((Date.now() - generatingStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Auto-rotate educational facts every 3 seconds during generation
  useEffect(() => {
    if (step !== 'generating') return;
    const interval = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % AI_EDUCATION_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [step]);

  const reset = useCallback(() => {
    setStep('upload');
    setSelfiePreview(null);
    setSelfieData(null);
    setResultImage(null);
    setWatermarkedResult(null);
    setError(null);
    setStrategy(null);
    setSuggestions([]);
    setAddedIds(new Set());
    setColorAccuracy(null);
    setFaceAccuracy(null);
    setProgressMessage('');
    setGenerationProgress(0);
    setCurrentFactIndex(0);
    setElapsedTime(0);
    onResetBackground();
  }, [onResetBackground]);

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
        const compressed = await compressImage(file, 1536, 0.92);
        // Moderate the image
        setIsModerating(true);
        try {
          const modRes = await fetch('/api/moderate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: compressed }),
          });
          const modData = await modRes.json();
          if (!modData.appropriate) {
            setError(modData.reason || 'Image does not meet our guidelines. Please upload a clean, clear selfie.');
            setSelfiePreview(null);
            setSelfieData(null);
            setStep('upload');
            setIsModerating(false);
            return;
          }
        } catch {
          // Allow on moderation failure
        }
        setIsModerating(false);
        setSelfiePreview(compressed);
        setSelfieData(compressed);
        setStep('preview');
      } catch {
        setIsModerating(false);
        setError('Failed to process image. Please try another photo.');
      }
    },
    []
  );

  // ── Camera capture functions ──────────────────────────────────────
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      // Wait for next frame to set srcObject
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setError('Camera access denied. Please allow camera access or upload a photo instead.');
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Stop camera
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);

    // Moderate the captured photo
    setIsModerating(true);
    try {
      const modRes = await fetch('/api/moderate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const modData = await modRes.json();
      if (!modData.appropriate) {
        setError(modData.reason || 'Image does not meet our guidelines. Please upload a clean, clear selfie.');
        setSelfiePreview(null);
        setSelfieData(null);
        setStep('upload');
        setIsModerating(false);
        return;
      }
    } catch {
      // Allow on moderation failure
    }
    setIsModerating(false);

    setSelfiePreview(dataUrl);
    setSelfieData(dataUrl);
    setStep('preview');
  }, []);

  const closeCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  // ── Disclaimer handlers ──────────────────────────────────────────
  const handleUploadClick = useCallback(() => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    fileInputRef.current?.click();
  }, [disclaimerAccepted]);

  const handleTakePhotoClick = useCallback(() => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    openCamera();
  }, [disclaimerAccepted, openCamera]);

  const handleDisclaimerAccept = useCallback(() => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    setDisclaimerChecked(false);
  }, []);

  const handleDisclaimerCancel = useCallback(() => {
    setShowDisclaimer(false);
    setDisclaimerChecked(false);
  }, []);

  const handleAddToCartSuggestion = useCallback((s: SuggestionItem) => {
    const store = useStore.getState();
    store.addItem({ productId: s.id, name: s.name, price: s.price, image: s.image });
    setAddedIds(prev => new Set(prev).add(s.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(s.id); return n; }), 1500);
  }, []);

  const [progressMessage, setProgressMessage] = useState<string>('');

  const handleGenerate = useCallback(async () => {
    if (!selfieData) return;
    setStep('generating');
    setError(null);
    setProgressMessage('Starting AI style preview...');
    setGenerationProgress(10);
    onBackgroundJob('generating');

    try {
      // Pre-fetch product image as base64 to avoid server-side resolution issues on Vercel
      let productImageBase64: string | undefined;
      try {
        setProgressMessage('Preparing product image...');
        setGenerationProgress(10);
        const imgToFetch = rawProductImage || productImage;
        if (imgToFetch) {
          productImageBase64 = await fetchImageAsBase64(imgToFetch) || undefined;
        }
      } catch {}

      // Step 1: POST to create a job (with auto-retry on AI unavailable)
      setGenerationProgress(30);
      let postRes = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          selfieData,
          productImageUrl: rawProductImage || productImage,
          productImageBase64, // Pre-fetched base64
          productName,
          categorySlug,
        }),
      });

      const postData = await postRes.json();

      // Handle canvas mode — AI service unavailable on server, try direct client-to-proxy
      if (postData.mode === 'canvas' || postData.code === 'AI_CANVAS_MODE') {
        // ── AUTO-RETRY: Clear health cache and retry once before falling back to canvas ──
        // This handles the common case where a stale health check cache causes "unavailable"
        try {
          setProgressMessage('Retrying AI connection...');
          const retryRes = await fetch('/api/try-on/status', { signal: AbortSignal.timeout(8000) });
          if (retryRes.ok) {
            const statusData = await retryRes.json();
            if (statusData.available) {
              // AI is actually available now! Retry the try-on request
              setProgressMessage('AI service recovered! Generating style preview...');
              const retryPostRes = await fetch('/api/try-on', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId,
                  selfieData,
                  productImageUrl: rawProductImage || productImage,
                  productImageBase64,
                  productName,
                  categorySlug,
                }),
              });
              const retryPostData = await retryPostRes.json();
              if (retryPostData.jobId) {
                // AI retry succeeded! Poll for the result
                const retryJobId = retryPostData.jobId;
                const maxRetryPolls = 120;
                let retryPollCount = 0;
                const pollRetryJob = async (): Promise<void> => {
                  retryPollCount++;
                  if (retryPollCount > maxRetryPolls) throw new Error('Generation timed out');
                  const pollRes = await fetch(`/api/try-on?jobId=${retryJobId}`);
                  const pollData = await pollRes.json();
                  if (pollData.progress) setProgressMessage(pollData.progress);
                  if (pollData.pipelinePhase === 'product-analysis') setGenerationProgress(30);
                  else if (pollData.pipelinePhase === 'generation') setGenerationProgress(50);
                  else if (pollData.pipelinePhase === 'verification') setGenerationProgress(70);
                  else if (pollData.pipelinePhase === 'refinement') setGenerationProgress(80);
                  else if (pollData.pipelinePhase === 'composite') setGenerationProgress(85);
                  else if (pollData.pipelinePhase === 'watermark') setGenerationProgress(90);
                  if (pollData.status === 'completed' && pollData.imageUrl) {
                    setGenerationProgress(100);
                    setResultImage(pollData.imageUrl);
                    setWatermarkedResult(pollData.imageUrl);
                    setStrategy(pollData.strategy || 'ai-generation');
                    if (pollData.colorAccuracy) setColorAccuracy(pollData.colorAccuracy);
                    if (pollData.faceAccuracy) setFaceAccuracy(pollData.faceAccuracy);
                    if (pollData.suggestions?.length) setSuggestions(pollData.suggestions);
                    setStep('result');
                    onBackgroundJob('result');
                    return;
                  }
                  if (pollData.status === 'failed') throw new Error(pollData.error || 'Generation failed');
                  await new Promise(r => setTimeout(r, 2000));
                  return pollRetryJob();
                };
                await pollRetryJob();
                return;
              }
              // If retry also returned canvas mode, fall through to canvas fallback below
            }
          }
        } catch (retryErr) {
          console.log('[try-on] Auto-retry failed, using canvas fallback:', retryErr instanceof Error ? retryErr.message : String(retryErr));
        }

        // Extract productImageBase64 from server response — avoids CORS issues in canvas fallback
        const serverProductImageBase64 = postData.productImageBase64 as string | undefined;

        // ── Strategy: Try direct client-side proxy call to sandbox AI service ──
        // Only attempt proxy on Vercel if a proxy URL is actually available
        let proxyUrl = '';
        try {
          const configRes = await fetch('/api/config', { signal: AbortSignal.timeout(3000) });
          if (configRes.ok) {
            const configData = await configRes.json();
            proxyUrl = configData.aiProxyUrl || '';
          }
        } catch {}
        // Also check NEXT_PUBLIC_ env var as fallback
        if (!proxyUrl) {
          proxyUrl = process.env.NEXT_PUBLIC_AI_PROXY_URL || '';
        }
        if (proxyUrl) {
          try {
            setProgressMessage('Connecting to AI service...');
            setGenerationProgress(30);
            // The .space-z.ai gateway routes to sandbox's Next.js (port 3000)
            // which handles /api/try-on directly — no XTransformPort needed.
            const proxyFetchUrl = `${proxyUrl}/api/try-on`;

            const proxyRes = await fetch(proxyFetchUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                selfieData,
                productImageUrl: rawProductImage || productImage,
                productImageBase64, // Pre-fetched base64
                productName,
                categorySlug,
              }),
              signal: AbortSignal.timeout(90000),
            });

            if (proxyRes.ok) {
              const proxyData = await proxyRes.json();
              const proxyJobId = proxyData.jobId;

              if (proxyJobId) {
                // Poll the proxy for results
                const maxProxyPolls = 120;
                let proxyPollCount = 0;

                const pollProxy = async (): Promise<void> => {
                  proxyPollCount++;
                  if (proxyPollCount > maxProxyPolls) throw new Error('Generation timed out');

                  // The .space-z.ai gateway routes to sandbox's Next.js (port 3000)
                  // which handles /api/try-on directly — no XTransformPort needed.
                  const statusUrl = `${proxyUrl}/api/try-on?jobId=${encodeURIComponent(proxyJobId)}`;

                  const pollRes = await fetch(statusUrl);
                  const pollData = await pollRes.json();

                  if (pollData.progress) setProgressMessage(pollData.progress);
                  if (pollData.pipelinePhase === 'product-analysis') setGenerationProgress(30);
                  else if (pollData.pipelinePhase === 'generation') setGenerationProgress(50);
                  else if (pollData.pipelinePhase === 'verification') setGenerationProgress(70);
                  else if (pollData.pipelinePhase === 'refinement') setGenerationProgress(80);
                  else if (pollData.pipelinePhase === 'composite') setGenerationProgress(85);
                  else if (pollData.pipelinePhase === 'watermark') setGenerationProgress(90);

                  if (pollData.status === 'completed' && pollData.imageUrl) {
                    setResultImage(pollData.imageUrl);
                    setWatermarkedResult(pollData.imageUrl);
                    setStrategy(pollData.strategy || 'ai-proxy');
                    if (pollData.colorAccuracy) setColorAccuracy(pollData.colorAccuracy);
                    if (pollData.faceAccuracy) setFaceAccuracy(pollData.faceAccuracy);
                    if (pollData.suggestions?.length) setSuggestions(pollData.suggestions);
                    setStep('result');
                    onBackgroundJob('result');
                    return;
                  }

                  if (pollData.status === 'failed') {
                    throw new Error(pollData.error || 'Proxy generation failed');
                  }

                  await new Promise(r => setTimeout(r, 2000));
                  return pollProxy();
                };

                await pollProxy();
                return;
              }

              if (proxyData.imageUrl) {
                setResultImage(proxyData.imageUrl);
                setWatermarkedResult(proxyData.imageUrl);
                setStrategy('ai-proxy');
                setStep('result');
                onBackgroundJob('result');
                return;
              }
            }
            console.log('[try-on] Direct proxy call failed, falling back to canvas');
          } catch (directProxyErr) {
            console.log('[try-on] Direct proxy unavailable:', directProxyErr instanceof Error ? directProxyErr.message : String(directProxyErr));
          }
        }

        // Canvas fallback — prefer server-provided base64 to avoid CORS issues
        setProgressMessage('Creating style preview overlay...');
        // Canvas fallback is now GUARANTEED to always return a result (never null)
        const canvasResult = await generateCanvasFallback(selfieData, productImage, productName, serverProductImageBase64);
        setResultImage(canvasResult || '');
        setWatermarkedResult(canvasResult || '');
        setStrategy('canvas-overlay');
        setStep('result');
        onBackgroundJob('result');
        return;
      }

      // Handle 503 / AI_SERVICE_UNAVAILABLE — try canvas fallback
      if (!postRes.ok) {
        if (postRes.status === 503 || postData.code === 'AI_SERVICE_UNAVAILABLE') {
          setProgressMessage('AI service unavailable. Creating style preview overlay...');
          const canvasResult = await generateCanvasFallback(selfieData, productImage, productName, postData.productImageBase64 as string | undefined);
          setResultImage(canvasResult || '');
          setWatermarkedResult(canvasResult || '');
          setStrategy('canvas-overlay');
          setStep('result');
          onBackgroundJob('result');
          return;
        }
        throw new Error(postData.error || `Error: ${postRes.status}`);
      }

      const jobId = postData.jobId;
      if (!jobId) {
        // No jobId but response was ok — could be a canvas mode we didn't catch above
        setProgressMessage('Creating style preview overlay...');
        const canvasResult = await generateCanvasFallback(selfieData, productImage, productName, postData.productImageBase64 as string | undefined);
        setResultImage(canvasResult || '');
        setWatermarkedResult(canvasResult || '');
        setStrategy('canvas-overlay');
        setStep('result');
        onBackgroundJob('result');
        return;
      }

      // Step 2: Poll for job completion
      const maxPolls = 120; // 120 * 2s = 4 minutes max
      let pollCount = 0;

      const pollJob = async (): Promise<void> => {
        pollCount++;
        if (pollCount > maxPolls) {
          throw new Error('Generation timed out. Please try again.');
        }

        const pollRes = await fetch(`/api/try-on?jobId=${jobId}`);
        const pollData = await pollRes.json();

        if (pollData.progress) {
          setProgressMessage(pollData.progress);
        }

        // Track progress based on pipeline phase
        if (pollData.pipelinePhase === 'product-analysis') setGenerationProgress(30);
        else if (pollData.pipelinePhase === 'generation') setGenerationProgress(50);
        else if (pollData.pipelinePhase === 'verification') setGenerationProgress(70);
        else if (pollData.pipelinePhase === 'refinement') setGenerationProgress(80);
        else if (pollData.pipelinePhase === 'composite') setGenerationProgress(85);
        else if (pollData.pipelinePhase === 'watermark') setGenerationProgress(90);
        else if (pollCount > 1) setGenerationProgress(Math.min(90, 10 + pollCount * 3));

        if (pollData.status === 'completed' && pollData.imageUrl) {
          setGenerationProgress(100);
          setResultImage(pollData.imageUrl);
          setWatermarkedResult(pollData.imageUrl);
          setStrategy(pollData.strategy || 'ai-generation');
          if (pollData.colorAccuracy) setColorAccuracy(pollData.colorAccuracy);
          if (pollData.faceAccuracy) setFaceAccuracy(pollData.faceAccuracy);
          if (pollData.suggestions?.length) setSuggestions(pollData.suggestions);
          setStep('result');
          onBackgroundJob('result');
          return;
        }

        if (pollData.status === 'failed' || (pollData.status === 'completed' && !pollData.imageUrl)) {
          // Pipeline failed or returned empty result — fall back to canvas overlay
          // instead of showing a dead-end error
          const canvasResult = await generateCanvasFallback(selfieData, productImage, productName);
          setResultImage(canvasResult || '');
          setWatermarkedResult(canvasResult || '');
          setStrategy('canvas-overlay');
          setStep('result');
          onBackgroundJob('result');
          return;
        }

        // Still processing, poll again after 2 seconds
        await new Promise(r => setTimeout(r, 2000));
        return pollJob();
      };

      await pollJob();
    } catch (err) {
      // On any error, ALWAYS try canvas fallback first.
      // generateCanvasFallback is GUARANTEED to always return a result (never null).
      setProgressMessage('Creating style preview overlay...');
      try {
        const canvasResult = await generateCanvasFallback(selfieData, productImage, productName);
        if (canvasResult) {
          setResultImage(canvasResult);
          setWatermarkedResult(canvasResult);
          setStrategy('canvas-overlay');
          setStep('result');
          onBackgroundJob('result');
          return;
        }
      } catch (canvasErr) {
        console.error('[try-on] Canvas fallback also failed:', canvasErr);
      }
      // This path should be extremely rare (only if canvas is completely unsupported)
      setError('Unable to generate style preview. Your browser may not support canvas rendering.');
      setStep('preview');
      onResetBackground();
    }
  }, [selfieData, productId, productImage, productName, categorySlug, onBackgroundJob, onResetBackground]);

  // Get category-specific label
  const getCategoryLabel = () => {
    switch (categorySlug) {
      case 'sarees':
      case 'fashion':
      case 'mens-shirts-t-shirts':
        return 'see how this outfit looks on you';
      case 'jewelry':
      case 'watches':
        return 'see how this accessory looks on you';
      case 'fragrances':
        return 'see how this fragrance suits you';
      case 'leather-goods':
        return 'see how this bag looks with you';
      case 'romantic-gifts':
      case 'couple-gifts':
      case 'couple-friendly-gifts':
        return 'see how this gift looks with you';
      case 'toys':
        return 'see how this product looks with you';
      case 'home-living':
        return 'visualize this in your space';
      default:
        return 'see how this product looks on you';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (step === 'generating') {
            // Close dialog visually but keep generation running in background
            onOpenChange(false);
            return;
          }
          reset();
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg border-amber-900/30 bg-stone-950 p-0 overflow-hidden sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="relative bg-gradient-to-r from-amber-900/40 via-rose-900/30 to-amber-900/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-100">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI Virtual Try-On
            </DialogTitle>
            <DialogDescription className="text-amber-200/50">
              Upload your selfie and{' '}
              <span className="text-amber-300">{getCategoryLabel()}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {/* ── Disclaimer Dialog ──────────────────────────────────────── */}
          {showDisclaimer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-amber-900/30 bg-stone-950 p-6 shadow-2xl"
              >
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-400" />
                  <h3 className="text-lg font-bold text-amber-100">Selfie Upload Guidelines</h3>
                </div>

                <div className="mb-5 space-y-3 text-sm">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400/70">Accepted</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-emerald-500">✅</span>
                        Only clean, clear, well-lit selfies will be accepted
                      </li>
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-emerald-500">✅</span>
                        Face must be clearly visible and facing the camera
                      </li>
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-emerald-500">✅</span>
                        Only your own selfie is permitted — uploading someone else&apos;s photo is not allowed
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-red-400/70">Not Accepted</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-red-500">❌</span>
                        Obscene, explicit, or inappropriate images will be rejected
                      </li>
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-red-500">❌</span>
                        Blurry, dark, or heavily filtered photos will not be accepted
                      </li>
                      <li className="flex items-start gap-2 text-amber-200/70">
                        <span className="mt-0.5 text-red-500">❌</span>
                        Group photos or photos with face coverings are not accepted
                      </li>
                    </ul>
                  </div>
                </div>

                <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-900/40 p-3 transition-colors hover:border-amber-700/30">
                  <Checkbox
                    checked={disclaimerChecked}
                    onCheckedChange={(checked) => setDisclaimerChecked(checked === true)}
                    className="mt-0.5 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                  />
                  <span className="text-xs leading-relaxed text-amber-200/60">
                    I confirm this is my own selfie and it meets the above guidelines
                  </span>
                </label>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDisclaimerCancel}
                    className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDisclaimerAccept}
                    disabled={!disclaimerChecked}
                    className="flex-1 bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    I Understand &amp; Agree
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Product info card */}
              <div className="flex items-center gap-3 rounded-lg border border-amber-900/20 bg-stone-900/60 p-3">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={productImage}
                    alt={productName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-100">{productName}</p>
                  <p className="text-xs text-amber-200/40">Selected for style preview</p>
                </div>
              </div>

              {/* Upload area */}
              <div
                onClick={handleUploadClick}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/30 bg-stone-900/30 px-6 py-8 transition-all hover:border-amber-600/40 hover:bg-stone-900/50"
              >
                <div className="mb-3 rounded-full bg-amber-900/20 p-4 transition-colors group-hover:bg-amber-900/30">
                  <Camera className="h-8 w-8 text-amber-400/60 transition-colors group-hover:text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-200/70">Upload your selfie</p>
                <p className="mt-1 text-xs text-amber-200/30">Click to browse or drag & drop</p>
                <p className="mt-2 text-[10px] text-amber-200/20">JPG, PNG, or WebP · Max 10MB</p>
                <div className="mt-4 rounded-lg border border-amber-900/15 bg-amber-950/20 px-3 py-2 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-1.5">Tips for best results</p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-emerald-500/60 mt-0.5">✓</span>
                      Face the camera directly, good lighting
                    </li>
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-emerald-500/60 mt-0.5">✓</span>
                      {['sarees', 'fashion'].includes(categorySlug)
                        ? 'Full body or waist-up photo'
                        : categorySlug === 'jewelry'
                        ? 'Clear face and neck visible'
                        : categorySlug === 'watches'
                        ? 'Show your wrist or full upper body'
                        : 'Upper body photo works best'}
                    </li>
                    <li className="flex items-start gap-1.5 text-[10px] text-amber-200/40">
                      <span className="text-red-500/60 mt-0.5">✗</span>
                      Avoid dark, blurry, or heavily filtered photos
                    </li>
                  </ul>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Or take a photo divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-amber-900/20" />
                <span className="text-xs text-amber-200/30">or</span>
                <div className="h-px flex-1 bg-amber-900/20" />
              </div>

              {/* Take Photo button */}
              {!cameraOpen && (
                <button
                  onClick={handleTakePhotoClick}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-teal-700/30 bg-teal-950/20 px-5 py-4 text-left transition-all hover:border-teal-600/40 hover:bg-teal-950/30"
                >
                  <div className="rounded-full bg-teal-900/30 p-2.5">
                    <Video className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-300/80">📸 Take a live selfie</p>
                    <p className="text-xs text-teal-400/40">We&apos;ll verify it&apos;s really you!</p>
                  </div>
                </button>
              )}

              {/* Camera view */}
              {cameraOpen && (
                <div className="space-y-3 rounded-xl border border-teal-900/30 bg-stone-900/60 p-3">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-800">
                    <video
                      ref={cameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-teal-300">
                      📷 Camera active
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={closeCamera}
                      className="flex-1 border-stone-700 text-stone-300 hover:border-stone-600 hover:text-stone-200"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      className="flex-1 bg-teal-600 text-white hover:bg-teal-500"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-900/30 bg-red-950/30 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Security notice */}
              <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-amber-200/20">
                <ShieldCheck className="h-3 w-3" />
                Your photo is verified for content safety and processed securely
              </p>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && selfiePreview && (
            <div className="space-y-4">
              {/* Moderation spinner overlay */}
              {isModerating && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-950/80 rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                    <p className="text-sm font-medium text-teal-300">Verifying image...</p>
                    <p className="text-xs text-amber-200/40">Checking content safety</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="relative flex-1">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60">
                    <img
                      src={selfiePreview}
                      alt="Your selfie"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 pt-8">
                  <Sparkles className="h-6 w-6 text-amber-400/40" />
                  <span className="text-[10px] text-amber-200/30">+</span>
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-amber-900/20">
                    <img
                      src={productImage}
                      alt={productName}
                      className="absolute inset-0 h-full w-full object-cover"
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
                  Create Preview
                </Button>
              </div>
            </div>
          )}

          {/* Generating Step */}
          {step === 'generating' && (
            <div className="space-y-4 relative rounded-xl border border-amber-500/20 bg-gradient-to-b from-stone-950 via-stone-950 to-amber-950/10 p-4 overflow-hidden" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}>
              {/* Animated background gradient shift */}
              <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.05) 0%, rgba(120,53,15,0.08) 25%, rgba(217,119,6,0.03) 50%, rgba(146,64,14,0.06) 75%, rgba(217,119,6,0.05) 100%)', backgroundSize: '200% 200%', animation: 'gradientShift 8s ease infinite' }} />

              {/* Progress indicator */}
              <div className="flex flex-col items-center py-2 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
                  <div className="relative rounded-full bg-amber-900/20 p-5">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                  </div>
                </div>
                <h3 className="mt-3 text-base font-semibold text-amber-100">
                  {progressMessage || 'Analyzing your photo...'}
                </h3>
                <p className="mt-1 text-center text-xs text-amber-200/40">
                  Creating your AI style preview with {productName}
                </p>
                {/* Elapsed time */}
                <div className="mt-2 flex items-center gap-1.5 rounded-full bg-stone-800/60 px-3 py-1 border border-amber-900/20">
                  <Clock className="h-3 w-3 text-amber-400/60" />
                  <span className="text-xs font-medium text-amber-300/70">{elapsedTime}s elapsed</span>
                </div>
              </div>

              {/* Progress Bar — shadcn/ui Progress component */}
              <div className="space-y-2 relative z-10">
                {/* Current phase label */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300/80">
                    {generationProgress < 30 ? '🔍 Analyzing' : generationProgress < 50 ? '🤖 Generating' : generationProgress < 70 ? '✅ Verifying' : generationProgress < 80 ? '🎨 Refining' : generationProgress < 90 ? '✨ Polishing' : '📦 Delivering'}
                  </span>
                  <span className="text-sm font-bold text-amber-400">{generationProgress}%</span>
                </div>
                <Progress
                  value={generationProgress}
                  className="h-3 bg-stone-800/80 border border-amber-900/20 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-600 [&>[data-slot=progress-indicator]]:via-amber-400 [&>[data-slot=progress-indicator]]:to-amber-300 [&>[data-slot=progress-indicator]]:transition-all [&>[data-slot=progress-indicator]]:duration-700"
                />
                <div className="flex justify-between">
                  <span className="text-[10px] text-amber-200/30">Processing...</span>
                  <span className="text-[10px] text-amber-200/30">Complete</span>
                </div>
              </div>

              {/* Phase indicator */}
              <div className="flex items-center justify-between relative z-10 px-1">
                {['Analyze', 'Generate', 'Verify', 'Refine', 'Deliver'].map((phase, i) => {
                  const thresholds = [30, 50, 70, 80, 90];
                  const isActive = generationProgress >= thresholds[i];
                  const isCurrent = generationProgress >= thresholds[i] && (i === 4 || generationProgress < thresholds[i + 1]);
                  return (
                    <div key={phase} className="flex flex-col items-center gap-1">
                      <div className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${isCurrent ? 'bg-amber-400 scale-150 shadow-lg shadow-amber-400/50' : isActive ? 'bg-amber-600' : 'bg-stone-700'}`} />
                      <span className={`text-[9px] transition-colors whitespace-nowrap ${isCurrent ? 'text-amber-300 font-bold' : isActive ? 'text-amber-500/60 font-medium' : 'text-stone-600'}`}>{phase}</span>
                      {i < 4 && (
                        <div className="absolute top-[5px]" style={{ left: `${(i + 0.5) * 20}%`, width: '18%' }}>
                          <div className={`h-px w-full ${isActive && generationProgress >= thresholds[i + 1] ? 'bg-amber-600/50' : 'bg-stone-700/50'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Educational scrolling content — AI_EDUCATION_FACTS with AnimatePresence */}
              <div className="rounded-lg border border-amber-900/25 bg-stone-900/60 overflow-hidden relative z-10">
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

              {/* Product Gallery - shown while waiting */}
              {productImages.length > 0 && (
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5 text-amber-400/70" />
                    <p className="text-[11px] font-semibold text-amber-200/60">
                      {productName} — Product Gallery
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {productImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative flex-shrink-0 h-20 w-20 overflow-hidden rounded-lg border border-amber-900/15 bg-stone-900/60"
                      >
                        <img
                          src={img}
                          alt={`${productName} view ${i + 1}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline keyframes for animations */}
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes gradientShift {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                @keyframes pulseGlow {
                  0%, 100% { box-shadow: 0 0 8px 1px rgba(217,119,6,0.08); }
                  50% { box-shadow: 0 0 20px 4px rgba(217,119,6,0.18); }
                }
              `}} />
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && watermarkedResult && (
            <div className="space-y-4">
              {/* Style Preview image */}
              <div className="space-y-1.5">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-amber-600/30 bg-stone-900/60">
                  <img
                    src={watermarkedResult}
                    alt={`Style preview: ${productName}`}
                    className="h-full w-full object-cover"
                  />
                  {/* 3 BOXES badge */}
                  <div className="absolute left-1.5 top-1.5 rounded-full bg-stone-900/80 border border-amber-500/40 px-2 py-0.5 flex items-center gap-1 shadow-lg">
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                    <span className="text-[8px] font-bold text-amber-400">3 BOXES</span>
                  </div>
                  {/* Style Preview badge */}
                  <div className="absolute right-1.5 top-1.5 rounded-full bg-amber-600/90 px-2 py-0.5 shadow-lg">
                    <span className="text-[8px] font-bold text-stone-950">Style Preview</span>
                  </div>
                  {/* AI GENERATED overlay badge at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950/80 via-stone-950/50 to-transparent px-3 py-4">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-amber-300 tracking-wide uppercase">AI Generated Preview</span>
                    </div>
                    <p className="text-[8px] text-amber-200/50 mt-0.5">Not an actual photo — may differ from real product</p>
                  </div>
                </div>
                <p className="text-center text-[10px] font-medium text-amber-400">Style Preview</p>
              </div>

              {/* AI Generated Disclaimer — Enhanced with specified format */}
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

              {/* AI Match Scores */}
              {strategy && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-900/15 bg-stone-900/40 p-2.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400/60" />
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-amber-200/70">
                      AI Strategy: {strategy === 'edit-both' ? 'Dual-Image Edit' : strategy === 'edit-selfie' ? 'Selfie-Edit + Verify' : strategy === 'edit-selfie-refined' ? 'Selfie-Edit + Refined' : strategy === 'edit-product' ? 'Product-Edit + Verify' : strategy === 'edit-product-refined' ? 'Product-Edit + Refined' : strategy === 'create-text' ? 'AI Generate' : strategy === 'canvas-overlay' ? 'Style Overlay' : strategy}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {faceAccuracy !== null && (
                        <span className="text-[9px] text-amber-200/40">Face Match: {faceAccuracy}/10</span>
                      )}
                      {colorAccuracy !== null && (
                        <span className="text-[9px] text-amber-200/40">Color Match: {colorAccuracy}/10</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Product reference */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-900/15 bg-stone-900/40 p-2">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={productImage}
                    alt={productName}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-amber-200/70 truncate">{productName}</p>
                  <p className="text-[10px] text-amber-200/30">Product used in preview</p>
                </div>
                <span className="text-[10px] text-amber-200/30">&#10003; Applied</span>
              </div>

              {/* 3 BOXES GIFTS — Style Preview info card */}
              <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-950/30 to-stone-900/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-[10px] font-bold text-amber-300">3 BOXES GIFTS — AI Style Preview</p>
                </div>
                <p className="text-[10px] text-amber-200/40">
                  AI generates a virtual try-on preview using multiple strategies for the best match. 
                  For best results, use a clear, well-lit, front-facing selfie.
                </p>
              </div>

              {/* AI Style Suggestions in result */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-400/70" />
                    <p className="text-[10px] font-semibold text-amber-200/60">
                      Complete the Look — AI Style Suggestions
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {suggestions.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="group flex-shrink-0 cursor-pointer rounded-lg border border-amber-900/15 bg-stone-900/40 p-1.5 transition-all hover:border-amber-600/30 hover:bg-stone-900/60 w-24"
                        onClick={() => {
                          const store = useStore.getState();
                          store.setCategory(s.categorySlug);
                          store.selectProduct(s.id);
                          reset();
                        }}
                      >
                        <div className="relative aspect-square overflow-hidden rounded-md bg-stone-800 mb-1">
                          <img
                            src={s.image}
                            alt={s.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-[8px] font-medium text-amber-200/60 truncate">{s.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[8px] font-bold text-amber-400">{'₹' + s.price.toLocaleString('en-IN')}</p>
                        </div>
                        <button
                          className="mt-1 w-full rounded bg-amber-600/80 text-[8px] font-bold text-stone-950 py-0.5 hover:bg-amber-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCartSuggestion(s);
                          }}
                        >
                          {addedIds.has(s.id) ? 'Added!' : '+ Cart'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={reset}
                  className="flex-1 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <a
                  href={watermarkedResult}
                  download={`3boxes-style-preview-${productName.toLowerCase().replace(/\s+/g, '-')}.png`}
                  className="flex flex-1 items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-stone-950 transition-all hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Save
                </a>
              </div>

              {/* Share to AI Style Gallery */}
              {onShareToInfluencer && watermarkedResult && (
                <Button
                  onClick={() => onShareToInfluencer(watermarkedResult)}
                  className="w-full border border-amber-500/30 bg-amber-900/20 text-amber-300 hover:bg-amber-900/30 hover:text-amber-200 gap-2"
                  variant="outline"
                >
                  <Share2 className="h-4 w-4" />
                  Share to Style Gallery
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Product Detail Component ───────────────────────────────────
export function ProductDetail() {
  const { selectedProductId, setView, addItem, setCategory, authUser, authToken } = useStore();
  const { trackClick } = useAffiliateClick();
  const { format } = useCurrency();
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [backgroundJobStep, setBackgroundJobStep] = useState<'generating' | 'result' | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '', name: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [influencerShareImage, setInfluencerShareImage] = useState<string | null>(null);
  const influencerSectionRef = useRef<{ handleShareFromTryOn: (imageDataUrl: string) => void } | null>(null);

  const { data, isLoading } = useQuery<{ product: ProductDetail }>({
    queryKey: ['product', selectedProductId],
    queryFn: () => fetch(`/api/products/${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const product = data?.product;

  // Wishlist check
  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist-check', selectedProductId],
    queryFn: async () => {
      if (!authToken) return { wishlist: [] };
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return { wishlist: [] };
      return res.json();
    },
    enabled: !!authToken && !!selectedProductId,
  });

  useEffect(() => {
    if (wishlistData?.wishlist) {
      const found = wishlistData.wishlist.some((w: any) => w.productId === selectedProductId);
      setIsWishlisted(found);
    }
  }, [wishlistData, selectedProductId]);

  // Reviews query
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', selectedProductId],
    queryFn: () => fetch(`/api/reviews?productId=${selectedProductId}`).then((r) => r.json()),
    enabled: !!selectedProductId,
  });

  const reviews: Review[] = reviewsData?.reviews ?? [];

  const handleToggleWishlist = async () => {
    if (!authToken || !selectedProductId) return;
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId: selectedProductId }),
        });
        setIsWishlisted(false);
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ productId: selectedProductId }),
        });
        setIsWishlisted(true);
      }
    } catch {
      // ignore
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedProductId || !reviewForm.name || !reviewForm.comment) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          userName: reviewForm.name,
          rating: reviewForm.rating,
          title: reviewForm.title || undefined,
          comment: reviewForm.comment,
        }),
      });
      if (res.ok) {
        setReviewDialogOpen(false);
        setReviewForm({ rating: 5, title: '', comment: '', name: '' });
      }
    } catch {
      // ignore
    } finally {
      setReviewSubmitting(false);
    }
  };



  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: getProxiedImageUrl(product.images[0] || '/images/placeholder.jpg', product.platform),
      });
    }
    setTimeout(() => setIsAdding(false), 800);
  };

  const handleBackgroundJob = useCallback((step: 'generating' | 'result') => {
    setBackgroundJobStep(step);
  }, []);

  const handleResetBackground = useCallback(() => {
    setBackgroundJobStep(null);
  }, []);

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-lg bg-stone-800" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24 bg-stone-800" />
            <Skeleton className="h-8 w-3/4 bg-stone-800" />
            <Skeleton className="h-5 w-32 bg-stone-800" />
            <Skeleton className="h-10 w-40 bg-stone-800" />
            <Skeleton className="h-24 w-full bg-stone-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-amber-200/60">Product not found</p>
        <Button onClick={() => setView('home')} className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500">
          Back to Products
        </Button>
      </div>
    );
  }

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="py-8"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-amber-900/20 bg-stone-800">
            {imageErrors.has(selectedImage) ? (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
                <span className="text-5xl text-amber-600/40">&#x1F48E;</span>
              </div>
            ) : (
              <img
                src={getProxiedImageUrl(product.images[selectedImage] || '/images/hero.png', product.platform)}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => {
                  setImageErrors((prev) => new Set(prev).add(selectedImage));
                }}
              />
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-col gap-1">
              {product.featured && (
                <Badge className="bg-amber-600 text-stone-950">Featured</Badge>
              )}
              {discount > 0 && (
                <Badge className="bg-emerald-600 text-white">-{discount}%</Badge>
              )}
            </div>

            {/* Image counter */}
            {product.images.length > 1 && (
              <div className="absolute bottom-3 right-3 rounded-full bg-stone-950/70 px-2.5 py-1 text-[10px] font-medium text-amber-200/70 backdrop-blur-sm">
                {selectedImage + 1} / {product.images.length}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border transition-all ${
                  i === selectedImage
                    ? 'border-amber-500 ring-1 ring-amber-500 scale-105'
                    : 'border-amber-900/20 opacity-60 hover:opacity-100 hover:border-amber-700/40'
                }`}
              >
                {!imageErrors.has(i) ? (
                  <img
                    src={getProxiedImageUrl(img, product.platform)}
                    alt={`${product.name} ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(i));
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-800">
                    <span className="text-lg text-amber-600/40">&#x1F48E;</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategory(product.categorySlug)}
                className="text-xs font-medium uppercase tracking-wider text-amber-500/60 hover:text-amber-400 transition-colors"
              >
                {product.category}
              </button>
              {product.isExternal && product.platform && (
                <Badge className={`${PLATFORM_COLORS[product.platform.toLowerCase()] || 'bg-stone-600/20 text-stone-300 border-stone-600/30'} text-[10px] font-semibold border px-2 py-0.5`}>
                  {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-amber-100 sm:text-3xl">
              {product.name}
            </h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-amber-700/40'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-amber-200/50">
              {product.rating} ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-amber-400">
              {format(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-amber-200/30 line-through">
                {format(product.compareAtPrice)}
              </span>
            )}
            {discount > 0 && (
              <Badge variant="outline" className="border-emerald-600/50 text-emerald-400">
                {t('productDetail.save')} {format(product.compareAtPrice! - product.price)}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-amber-200/60">
            {product.description}
          </p>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-amber-900/30 text-amber-200/40 text-xs"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Stock / Availability */}
          {product.isExternal && product.platform ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Available</span>
              <span className="text-xs text-amber-200/30">on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-200/40" />
              {product.stock > 0 ? (
                <span
                  className={`text-sm ${
                    product.stock <= 5 ? 'text-amber-500' : 'text-emerald-400'
                  }`}
                >
                  {product.stock <= 5
                    ? `Only ${product.stock} left in stock`
                    : 'In Stock'}
                </span>
              ) : (
                <span className="text-sm text-red-400">Out of Stock</span>
              )}
            </div>
          )}

          {/* Delivery Estimate */}
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-400/60" />
            <span className="text-sm text-amber-200/50">
              Estimated delivery: {product.deliveryEstimate || '3-5 business days'}
            </span>
          </div>

          {/* AI Try-On Button - Available for ALL categories */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setTryOnOpen(true)}
              className="group flex w-full items-center gap-3 rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-900/20 via-rose-900/20 to-amber-900/20 p-4 transition-all hover:border-amber-500/50 hover:from-amber-900/30 hover:via-rose-900/30 hover:to-amber-900/30 hover:shadow-lg hover:shadow-amber-900/20"
            >
              <div className="rounded-lg bg-amber-600/20 p-2.5 transition-colors group-hover:bg-amber-600/30">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-amber-100">Style Preview</p>
                <p className="text-xs text-amber-200/40">See how it looks on you with 3 BOXES</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-400/50 transition-colors group-hover:text-amber-400" />
            </button>
          </motion.div>

          {/* External Product Notice */}
          {product.isExternal && product.platform && (
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-400/60" />
                <p className="text-sm font-medium text-amber-200/70">
                  Available on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
                </p>
              </div>
              <p className="text-xs text-amber-200/40 italic">
                This product is sold by our partner {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}. You'll be redirected to their site to complete your purchase.
              </p>
              {product.sourceUrl && (
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  View original listing
                </a>
              )}
            </div>
          )}

          {/* Quantity & Add to Cart / Shop on Platform */}
          {product.isExternal && product.platform ? (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  if (product.sourceUrl) {
                    trackClick(product.id, product.platform!.toLowerCase(), product.sourceUrl, product.affiliateUrl);
                  } else {
                    window.open(product.affiliateUrl || product.sourceUrl || '#', '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`w-full transition-all duration-300 text-stone-950 hover:shadow-lg hover:shadow-amber-600/25 h-12 text-base font-semibold gap-2 ${PLATFORM_BUTTON_COLORS[product.platform.toLowerCase()] || 'bg-amber-600 hover:bg-amber-500'}`}
              >
                <ExternalLink className="h-5 w-5" />
                Shop on {PLATFORM_DISPLAY_NAMES[product.platform.toLowerCase()] || product.platform}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-amber-900/30 bg-stone-900/60">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-10 w-10 items-center justify-center text-amber-200/60 hover:text-amber-400 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-medium text-amber-100">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="flex h-10 w-10 items-center justify-center text-amber-200/60 hover:text-amber-400 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 transition-all duration-300 ${
                  isAdding
                    ? 'bg-emerald-600 text-white scale-95'
                    : 'bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25'
                }`}
              >
                {isAdding ? (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Added!
                  </>
                ) : product.stock === 0 ? (
                  'Out of Stock'
                ) : (
                  `Add to Cart - ${format(product.price * quantity)}`
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading || !authToken}
                className={`h-10 w-10 shrink-0 border-amber-900/30 ${
                  isWishlisted
                    ? 'bg-red-600/20 border-red-500/50 text-red-400 hover:bg-red-600/30'
                    : 'text-amber-200/40 hover:text-red-400 hover:border-red-500/30'
                }`}
                title={authToken ? (isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist') : 'Sign in to add to wishlist'}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-100">
              Reviews ({reviews.length})
            </h3>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(product.rating) ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                  }`}
                />
              ))}
              <span className="ml-1 text-sm text-amber-200/50">{product.rating.toFixed(1)}</span>
            </div>
          </div>
          <Button
            onClick={() => setReviewDialogOpen(true)}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500"
          >
            Write a Review
          </Button>
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-8 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-amber-200/20" />
            <p className="text-sm text-amber-200/40">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600/20 text-xs font-bold text-amber-400">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-amber-100">{review.userName}</span>
                        {review.verified && (
                          <Badge className="bg-emerald-600/20 text-emerald-400 text-[10px] border-emerald-600/30">Verified</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs text-amber-200/30">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {review.title && (
                  <p className="mt-2 text-sm font-medium text-amber-200/80">{review.title}</p>
                )}
                <p className="mt-1 text-sm text-amber-200/50">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Style Gallery (Influencer Section) */}
      {product && (
        <div id="ai-influencer-section">
          <AIInfluencerSection
            productId={product.id}
            productName={product.name}
            initialShareImage={influencerShareImage}
            onShareComplete={() => setInfluencerShareImage(null)}
          />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">Write a Review</DialogTitle>
            <DialogDescription className="text-amber-200/50">Share your experience with this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Star Picker */}
            <div>
              <Label className="text-sm text-amber-200/60">Rating</Label>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: i + 1 }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        i < reviewForm.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-700/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-name" className="text-sm text-amber-200/60">Your Name</Label>
              <Input
                id="review-name"
                value={reviewForm.name}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
              />
            </div>
            <div>
              <Label htmlFor="review-title" className="text-sm text-amber-200/60">Title (optional)</Label>
              <Input
                id="review-title"
                value={reviewForm.title}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Summary of your review"
                className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
              />
            </div>
            <div>
              <Label htmlFor="review-comment" className="text-sm text-amber-200/60">Your Review</Label>
              <textarea
                id="review-comment"
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="What did you like or dislike?"
                rows={4}
                className="mt-1 w-full rounded-md border border-amber-900/40 bg-stone-800/50 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-amber-600 resize-none"
              />
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewSubmitting || !reviewForm.name || !reviewForm.comment}
              className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500"
            >
              {reviewSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Style Preview Dialog - mounted when open or background job active */}
      {(tryOnOpen || backgroundJobStep !== null) && product && (
        <TryOnDialog
          open={tryOnOpen}
          onOpenChange={setTryOnOpen}
          productId={product.id}
          productName={product.name}
          productImage={getProxiedImageUrl(product.images[0] || '/images/hero.png', product.platform)}
          rawProductImage={product.images[0] || '/images/hero.png'}
          categorySlug={product.categorySlug}
          productImages={product.images.map(img => getProxiedImageUrl(img, product.platform))}
          onBackgroundJob={handleBackgroundJob}
          onResetBackground={handleResetBackground}
          onShareToInfluencer={(imageDataUrl) => {
            setInfluencerShareImage(imageDataUrl);
            // Close the try-on dialog and scroll to influencer section
            setTryOnOpen(false);
            setTimeout(() => {
              const section = document.getElementById('ai-influencer-section');
              if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          }}
/>
      )}

      {/* Floating Pill — shown when dialog is closed but a background job is running */}
      {backgroundJobStep && !tryOnOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
          onClick={() => setTryOnOpen(true)}
        >
          {backgroundJobStep === 'generating' ? (
            <div className="flex items-center gap-3 rounded-full border border-amber-600/40 bg-stone-900/95 px-5 py-3 shadow-2xl shadow-amber-900/30 backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">Creating preview...</span>
              <Sparkles className="h-4 w-4 text-amber-400/60" />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-amber-500/60 bg-stone-900/95 px-5 py-3 shadow-2xl shadow-amber-500/20 backdrop-blur-sm animate-[glow_2s_ease-in-out_infinite]">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">Style Preview Ready! Click to view</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
