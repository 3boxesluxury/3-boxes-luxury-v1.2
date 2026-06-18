'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Clock, Camera, ChevronRight, Shield, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';

interface GalleryItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  userName: string;
  aiGeneratedImage: string;
  categorySlug?: string;
  likes: number;
  status: string;
  createdAt: string;
}

interface MySubmission {
  id: string;
  productName: string;
  status: string;
  rejectReason?: string;
  createdAt: string;
}

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

const STATUS_BADGE: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Under Admin Approval', color: 'bg-amber-600/20 text-amber-300 border-amber-600/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-600/20 text-red-300 border-red-600/30', icon: XCircle },
};

export function StyleGallerySection() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [showMySubmissions, setShowMySubmissions] = useState(false);

  const { authUser } = useStore();

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch('/api/style-gallery?limit=8');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    fetchGallery();
  }, []);

  // Fetch user's submissions if logged in
  useEffect(() => {
    if (!authUser?.id) return;
    async function fetchMySubmissions() {
      try {
        const res = await fetch(`/api/style-gallery/my?userId=${authUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length > 0) {
            setMySubmissions(data.items);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchMySubmissions();
  }, [authUser?.id]);

  const handleLike = useCallback(async (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds(prev => new Set(prev).add(id));
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, likes: item.likes + 1 } : item
    ));
    try {
      await fetch(`/api/style-gallery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like' }),
      });
    } catch {}
  }, [likedIds]);

  const hasPendingSubmissions = mySubmissions.some(s => s.status === 'pending' || s.status === 'rejected');

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-700/30 bg-amber-900/20 px-4 py-1.5 mb-4">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">AI Style Gallery</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-amber-100 mb-3">
            See How Others Style It
          </h2>
          <p className="text-sm text-amber-200/50 max-w-xl mx-auto">
            Real shoppers using our AI to preview how products look on them.
            Upload your selfie and share your style with the community.
          </p>
        </motion.div>

        {/* My Submissions Status — for logged-in users */}
        {authUser && hasPendingSubmissions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <button
              onClick={() => setShowMySubmissions(!showMySubmissions)}
              className="w-full flex items-center justify-between rounded-xl border border-amber-600/30 bg-amber-900/10 px-4 py-3 transition-colors hover:bg-amber-900/15"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-200">My Style Submissions</span>
                {mySubmissions.filter(s => s.status === 'pending').length > 0 && (
                  <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 text-[10px] px-1.5 py-0.5">
                    {mySubmissions.filter(s => s.status === 'pending').length} pending
                  </Badge>
                )}
              </div>
              <ChevronRight className={`h-4 w-4 text-amber-200/40 transition-transform ${showMySubmissions ? 'rotate-90' : ''}`} />
            </button>

            {showMySubmissions && (
              <div className="mt-2 space-y-2 rounded-xl border border-amber-900/20 bg-stone-900/40 p-3">
                {mySubmissions.map(sub => {
                  const statusCfg = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg bg-stone-900/60 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={`h-3.5 w-3.5 flex-shrink-0 ${sub.status === 'pending' ? 'text-amber-400' : sub.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span className="text-xs text-amber-200/70 truncate">{sub.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`${statusCfg.color} text-[9px] px-1.5 py-0`}>
                          {statusCfg.label}
                        </Badge>
                        <span className="text-[9px] text-amber-200/25">{relativeTime(sub.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-stone-900/60 animate-pulse border border-amber-900/10" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group relative overflow-hidden rounded-xl border border-amber-900/20 bg-stone-900/60 transition-all hover:border-amber-600/30 hover:shadow-lg hover:shadow-amber-900/10"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={item.aiGeneratedImage}
                    alt={`AI style by ${item.userName}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-stone-900/80 text-amber-300 border-amber-600/30 text-[9px] backdrop-blur-sm px-1.5 py-0.5">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      AI Generated
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-950/80 to-transparent p-2 pt-6">
                    <p className="text-[10px] text-amber-200/40 truncate">{item.productName}</p>
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-600/20 text-[10px] font-bold text-amber-400">
                        {item.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-amber-200/60 truncate">{item.userName}</span>
                    </div>
                    <button
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        likedIds.has(item.id) ? 'text-red-400' : 'text-amber-200/40 hover:text-red-400'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${likedIds.has(item.id) ? 'fill-current' : ''}`} />
                      <span className="text-[10px]">{item.likes > 0 ? item.likes : ''}</span>
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-amber-200/20" />
                    <span className="text-[9px] text-amber-200/30">{relativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-900/20 bg-stone-900/20 py-16 px-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/20 mb-4">
              <Camera className="h-8 w-8 text-amber-400/50" />
            </div>
            <p className="text-base font-medium text-amber-200/50 mb-1">Be the First to Share Your Style!</p>
            <p className="text-sm text-amber-200/30 max-w-md text-center mb-6">
              Upload a selfie, try on any product with AI, and share your look with the community.
              Your style will appear here after admin approval.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-200/25">
              <Shield className="h-3.5 w-3.5" />
              <span>All submissions are reviewed for quality and safety</span>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-amber-200/30 mb-3">
            ✨ AI-powered style preview — See it on you before you buy
          </p>
          <Button
            onClick={() => {
              const event = new CustomEvent('openTryOnShowcase');
              window.dispatchEvent(event);
            }}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500 gap-2"
          >
            <Camera className="h-4 w-4" />
            Try It On Any Product
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
