'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Share2, Shield, Clock, ImageIcon, LogIn, CheckCircle, X, ChevronLeft, ChevronRight, ZoomIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStore } from '@/lib/store';
import { showToast } from '@/hooks/use-toast-notification';

/* ── Types ── */
export interface AIInfluencerImage {
  id: string;
  productId: string;
  imageDataUrl: string; // base64 data URL
  userName: string;
  userId?: string;
  isVerified?: boolean;
  createdAt: string;
  likes: number;
}

/* ── In-memory store for influencer images (shared across component instances) ── */
let _influencerImages: AIInfluencerImage[] = [];
let _likedIds: Set<string> = new Set();

function getInfluencerImages(productId: string): AIInfluencerImage[] {
  return _influencerImages.filter((img) => img.productId === productId);
}

function addInfluencerImage(image: AIInfluencerImage) {
  _influencerImages = [image, ..._influencerImages];
}

function getUserShareCount(userId: string, productId: string): number {
  return _influencerImages.filter((img) => img.userId === userId && img.productId === productId).length;
}

function toggleLike(imageId: string): number {
  const img = _influencerImages.find((i) => i.id === imageId);
  if (!img) return 0;
  if (_likedIds.has(imageId)) {
    _likedIds.delete(imageId);
    img.likes = Math.max(0, img.likes - 1);
  } else {
    _likedIds.add(imageId);
    img.likes += 1;
  }
  return img.likes;
}

function isLiked(imageId: string): boolean {
  return _likedIds.has(imageId);
}

/* ── Relative time formatter ── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ── Component ── */
interface AIInfluencerSectionProps {
  productId: string;
  productName: string;
  onShareImage?: (imageDataUrl: string) => void;
  initialShareImage?: string | null;
  onShareComplete?: () => void;
}

const MAX_SHARES_PER_USER_PER_PRODUCT = 3;

export function AIInfluencerSection({ productId, productName, onShareImage, initialShareImage, onShareComplete }: AIInfluencerSectionProps) {
  const { t } = useTranslation();
  const { authUser, authToken, setAuthView } = useStore();
  const [images, setImages] = useState<AIInfluencerImage[]>(() => getInfluencerImages(productId));
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [userName, setUserName] = useState(authUser?.name || '');
  const [submitting, setSubmitting] = useState(false);
  const pendingImageRef = useRef<string | null>(null);

  /* ── Lightbox state ── */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Auto-open share dialog when initialShareImage is provided (from try-on result)
  useEffect(() => {
    if (initialShareImage) {
      // Store the image for later use
      pendingImageRef.current = initialShareImage;
      // If not logged in, show login prompt instead
      if (!authUser) {
        setLoginPromptOpen(true);
        return;
      }
      setPendingImage(initialShareImage);
      setConsentGiven(false);
      setShareDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [initialShareImage, authUser]);

  // Refresh images from shared store + fetch approved DB images
  const refreshImages = useCallback(async () => {
    // Always include in-memory images
    const memImages = [...getInfluencerImages(productId)];
    
    // Also fetch approved images from database for this product
    try {
      const res = await fetch(`/api/style-gallery?productId=${productId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        const dbImages: AIInfluencerImage[] = (data.images || [])
          .filter((img: any) => img.isApproved && img.isActive)
          .map((img: any) => ({
            id: img.id,
            productId: img.productId,
            imageDataUrl: img.aiGeneratedImage,
            userName: img.userName,
            userId: img.userId,
            isVerified: true,
            createdAt: img.createdAt,
            likes: img.rating || 0,
          }));
        
        // Merge: deduplicate by id (DB images take precedence)
        const seenIds = new Set<string>();
        const merged = [...dbImages, ...memImages].filter(img => {
          if (seenIds.has(img.id)) return false;
          seenIds.add(img.id);
          return true;
        });
        setImages(merged);
      } else {
        setImages(memImages);
      }
    } catch {
      setImages(memImages);
    }
  }, [productId]);

  // Load DB images on mount
  useEffect(() => {
    refreshImages();
  }, [refreshImages]);

  const handleShareClick = useCallback(() => {
    if (!authUser) {
      showToast('info', 'Please sign in to share your AI style.');
      setLoginPromptOpen(true);
      return;
    }

    // Check share limit
    const shareCount = getUserShareCount(authUser.id, productId);
    if (shareCount >= MAX_SHARES_PER_USER_PER_PRODUCT) {
      showToast('error', "You've reached the maximum shares for this product.");
      return;
    }

    setPendingImage(null);
    setConsentGiven(false);
    setShareDialogOpen(true);
  }, [authUser, productId]);

  const handleShareFromTryOn = useCallback(
    (imageDataUrl: string) => {
      if (!authUser) {
        setPendingImage(imageDataUrl);
        setLoginPromptOpen(true);
        return;
      }
      setPendingImage(imageDataUrl);
      setConsentGiven(false);
      setShareDialogOpen(true);
    },
    [authUser]
  );

  const handleSubmitShare = useCallback(async () => {
    if (!consentGiven || !userName.trim() || !authUser) return;

    // Double-check share limit
    const shareCount = getUserShareCount(authUser.id, productId);
    if (shareCount >= MAX_SHARES_PER_USER_PER_PRODUCT) {
      showToast('error', "You've reached the maximum shares for this product.");
      setShareDialogOpen(false);
      return;
    }

    const imageDataUrl =
      pendingImage ||
      `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#292524" width="400" height="400"/><text x="200" y="180" text-anchor="middle" fill="#d97706" font-size="48">✨</text><text x="200" y="230" text-anchor="middle" fill="#fbbf24" font-size="16" font-family="sans-serif">AI Style Preview</text><text x="200" y="260" text-anchor="middle" fill="#78716c" font-size="12" font-family="sans-serif">${productName.substring(0, 30)}</text></svg>`)}`;

    // Save to database FIRST — only show success if API actually works
    setSubmitting(true);
    try {
      const res = await fetch('/api/style-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          productId,
          userName: userName.trim(),
          aiGeneratedImage: imageDataUrl,
          consentGiven: true,
          rating: 5,
          reviewTitle: `AI Style - ${productName}`,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log('[share-to-gallery] Submitted successfully:', result.image?.id);

        // Only add to local store and close dialog after REAL success
        const newImage: AIInfluencerImage = {
          id: result.image?.id || `inf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          productId,
          imageDataUrl: result.image?.aiGeneratedImage || imageDataUrl,
          userName: userName.trim(),
          userId: authUser.id,
          isVerified: true,
          createdAt: new Date().toISOString(),
          likes: 0,
        };

        addInfluencerImage(newImage);
        refreshImages();
        setShareDialogOpen(false);
        setConsentGiven(false);
        setPendingImage(null);
        showToast('success', 'Style submitted! It will appear in the gallery after admin approval.');

        if (onShareImage) {
          onShareImage(newImage.imageDataUrl);
        }
        if (onShareComplete) {
          onShareComplete();
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[share-to-gallery] API error:', res.status, errorData);
        if (res.status === 401) {
          showToast('error', 'Please sign in again to share your style.');
        } else {
          showToast('error', errorData.error || `Failed to submit (${res.status}). Please try again.`);
        }
      }
    } catch (err) {
      console.error('[share-to-gallery] Network error:', err);
      showToast('error', 'Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [consentGiven, userName, pendingImage, productId, productName, refreshImages, onShareImage, onShareComplete, authUser, authToken]);

  const handleLike = useCallback(
    (imageId: string) => {
      toggleLike(imageId);
      refreshImages();
    },
    [refreshImages]
  );

  const handleSignIn = useCallback(() => {
    setLoginPromptOpen(false);
    setAuthView('login');
  }, [setAuthView]);

  /* ── Lightbox helpers ── */
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setIsZoomed(false);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setIsZoomed(false);
  }, []);

  const goToPrev = useCallback(() => {
    setIsZoomed(false);
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setIsZoomed(false);
    setLightboxIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed((prev) => !prev);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrev, goToNext]);

  const isLoggedIn = !!authUser;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-12"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/20">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-100">{t('aiGallery.title')}</h3>
              <p className="text-xs text-amber-200/40">{t('aiInfluencer.seeHowOthers')}</p>
            </div>
          </div>
          <Button
            onClick={handleShareClick}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500 gap-2"
            size="sm"
          >
            <Share2 className="h-4 w-4" />
            {t('aiInfluencer.shareYourStyle')}
          </Button>
        </div>

        {/* Gallery Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {images.map((img, idx) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60 transition-all hover:border-amber-600/30 hover:shadow-lg hover:shadow-amber-900/10 cursor-pointer"
                  onClick={() => openLightbox(idx)}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={img.imageDataUrl}
                      alt={`AI style by ${img.userName}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* AI Generated badge overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm px-1.5 py-0.5">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {t('aiGallery.aiGenerated')}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-2.5">
                    <div className="flex items-center justify-between">
                      {/* User info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                          {img.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs text-amber-200/60 truncate">{img.userName}</span>
                          {img.isVerified && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-shrink-0 inline-flex items-center justify-center">
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="bg-stone-900 border-amber-900/30 text-amber-200 text-xs"
                              >
                                {t('aiInfluencer.verifiedUser')}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      {/* Like button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLike(img.id); }}
                        className="flex items-center gap-1 text-amber-200/40 hover:text-red-400 transition-colors"
                        aria-label={`Like this image. Currently ${img.likes} likes`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 transition-all ${
                            isLiked(img.id) ? 'fill-red-400 text-red-400 scale-110' : ''
                          }`}
                        />
                        <span className="text-[10px]">{img.likes > 0 ? img.likes : ''}</span>
                      </button>
                    </div>

                    {/* Timestamp */}
                    <div className="mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 text-amber-200/20" />
                      <span className="text-[9px] text-amber-200/30">{relativeTime(img.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-900/20 bg-stone-900/30 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/20 mb-3">
              <ImageIcon className="h-7 w-7 text-amber-400/40" />
            </div>
            <p className="text-sm text-amber-200/40">{t('aiInfluencer.noStylesYet')}</p>
            <p className="mt-1 text-xs text-amber-200/25">{t('aiInfluencer.beTheFirst')} {!isLoggedIn && t('aiInfluencer.signInToStart')}</p>
            {isLoggedIn ? (
              <Button
                onClick={handleShareClick}
                variant="outline"
                className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 gap-2"
                size="sm"
              >
                <Share2 className="h-4 w-4" />
                {t('aiInfluencer.shareYourStyle')}
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                variant="outline"
                className="mt-4 border-amber-900/30 text-amber-200/60 hover:border-amber-600/40 hover:text-amber-400 gap-2"
                size="sm"
              >
                <LogIn className="h-4 w-4" />
                {t('aiInfluencer.signInToShare')}
              </Button>
            )}
          </div>
        )}

        {/* Login Prompt Dialog */}
        <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
          <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-100">
                <LogIn className="h-5 w-5 text-amber-400" />
                {t('aiInfluencer.signInRequired')}
              </DialogTitle>
              <DialogDescription className="text-amber-200/50">
                {t('aiInfluencer.signInRequiredDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Info box */}
              <div className="rounded-lg border border-amber-900/15 bg-amber-950/20 p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-200/60">{t('aiInfluencer.whySignIn')}</p>
                    <ul className="text-[10px] text-amber-200/40 space-y-0.5">
                      <li>{t('aiInfluencer.verifyIdentity')}</li>
                      <li>{t('aiInfluencer.verifiedBadge')}</li>
                      <li>{t('aiInfluencer.trackManage')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setLoginPromptOpen(false)}
                  className="flex-1 border-amber-900/40 text-amber-200/60"
                >
                  {t('aiInfluencer.cancel')}
                </Button>
                <Button
                  onClick={handleSignIn}
                  className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('aiInfluencer.signIn')}
                </Button>
              </div>

              {/* Note */}
              <p className="text-center text-[10px] text-amber-200/25">
                {t('aiInfluencer.registrationFree')}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Consent Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-100">
                <Sparkles className="h-5 w-5 text-amber-400" />
                {t('aiInfluencer.shareDialogTitle')}
              </DialogTitle>
              <DialogDescription className="text-amber-200/50">
                {t('aiInfluencer.shareDialogDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Preview of the image to share */}
              {pendingImage && (
                <div className="relative aspect-square w-full max-w-[200px] mx-auto overflow-hidden rounded-xl border border-amber-900/20">
                  <img
                    src={pendingImage}
                    alt="AI style preview to share"
                    className="h-full w-full object-cover"
                  />
                  <Badge className="absolute top-2 left-2 bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                    {t('aiGallery.aiGenerated')}
                  </Badge>
                </div>
              )}

              {/* Info box */}
              <div className="rounded-lg border border-amber-900/15 bg-amber-950/20 p-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-amber-400/60 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-200/60">{t('aiInfluencer.whatHappensWhenShare')}</p>
                    <ul className="text-[10px] text-amber-200/40 space-y-0.5">
                      <li>{t('aiInfluencer.imageVisible')}</li>
                      <li>{t('aiInfluencer.onlyFirstName')}</li>
                      <li>{t('aiInfluencer.requestRemoval')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* User name input */}
              <div>
                <Label htmlFor="share-name" className="text-sm text-amber-200/60">
                  {t('aiInfluencer.displayName')}
                </Label>
                <input
                  id="share-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('aiInfluencer.yourName')}
                  className="mt-1 w-full rounded-md border border-amber-900/40 bg-stone-800/50 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              {/* Consent checkbox */}
              <div className="flex items-start gap-3 rounded-lg border border-amber-900/20 bg-stone-800/30 p-3">
                <Checkbox
                  id="consent-checkbox"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <Label
                  htmlFor="consent-checkbox"
                  className="text-xs text-amber-200/60 leading-relaxed cursor-pointer"
                >
                  {t('aiInfluencer.consentText')}
                </Label>
              </div>

              {/* Submit button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShareDialogOpen(false)}
                  className="flex-1 border-amber-900/40 text-amber-200/60"
                >
                  {t('aiInfluencer.cancel')}
                </Button>
                <Button
                  onClick={handleSubmitShare}
                  disabled={!consentGiven || !userName.trim() || submitting}
                  className="flex-1 bg-amber-600 text-stone-950 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('aiInfluencer.saving')}</>
                  ) : (
                    <><Share2 className="mr-2 h-4 w-4" /> {t('aiInfluencer.shareToGallery')}</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Lightbox Dialog ── */}
        <Dialog open={lightboxOpen} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
          <DialogContent className="border-0 bg-black/90 sm:max-w-3xl p-0 overflow-hidden [&>button]:hidden">
            <AnimatePresence mode="wait">
              {images[lightboxIndex] && (
                <motion.div
                  key={images[lightboxIndex].id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex flex-col"
                >
                  {/* Close button */}
                  <button
                    onClick={closeLightbox}
                    className="absolute top-3 right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition-colors backdrop-blur-sm"
                    aria-label="Close lightbox"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition-colors backdrop-blur-sm"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition-colors backdrop-blur-sm"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}

                  {/* Image area */}
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-t-lg"
                    style={{ minHeight: '300px', maxHeight: '70vh' }}
                  >
                    <motion.img
                      src={images[lightboxIndex].imageDataUrl}
                      alt={`AI style by ${images[lightboxIndex].userName}`}
                      className="max-h-[70vh] w-full object-contain cursor-zoom-in transition-transform duration-300"
                      style={{ transform: isZoomed ? 'scale(1.5)' : 'scale(1)', transformOrigin: 'center center' }}
                      onClick={toggleZoom}
                      layout
                    />
                  </div>

                  {/* Info bar */}
                  <div className="flex items-center justify-between bg-stone-950/90 px-5 py-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-sm font-bold text-amber-400">
                        {images[lightboxIndex].userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-amber-100 truncate">
                          {images[lightboxIndex].userName}
                        </span>
                        {images[lightboxIndex].isVerified && (
                          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Timestamp */}
                      <div className="hidden sm:flex items-center gap-1.5 text-amber-200/40">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{relativeTime(images[lightboxIndex].createdAt)}</span>
                      </div>

                      {/* Like button */}
                      <button
                        onClick={() => handleLike(images[lightboxIndex].id)}
                        className="flex items-center gap-1.5 text-amber-200/60 hover:text-red-400 transition-colors"
                        aria-label={`Like this image. Currently ${images[lightboxIndex].likes} likes`}
                      >
                        <Heart
                          className={`h-5 w-5 transition-all ${
                            isLiked(images[lightboxIndex].id) ? 'fill-red-400 text-red-400 scale-110' : ''
                          }`}
                        />
                        <span className="text-sm">{images[lightboxIndex].likes}</span>
                      </button>

                      {/* Zoom indicator */}
                      <button
                        onClick={toggleZoom}
                        className="flex items-center justify-center text-amber-200/40 hover:text-amber-200/80 transition-colors"
                        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
                      >
                        <ZoomIn className={`h-5 w-5 transition-transform ${isZoomed ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Image counter */}
                      {images.length > 1 && (
                        <span className="text-xs text-amber-200/30 tabular-nums">
                          {lightboxIndex + 1} / {images.length}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
}
