'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Sparkles,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { showToast } from '@/hooks/use-toast-notification';

/* ─── Interfaces ─── */
interface GalleryImage {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  aiGeneratedImage: string;
  originalSelfie?: string;
  rating: number;
  reviewTitle?: string;
  reviewComment?: string;
  consentGiven: boolean;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: string[];
  };
}

type Tab = 'pending' | 'approved' | 'rejected';

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

// Derive status from the existing isApproved/isActive fields
function deriveStatus(item: GalleryImage): 'pending' | 'approved' | 'rejected' {
  if (item.isActive && item.isApproved) return 'approved';
  if (item.isActive && !item.isApproved) return 'pending';
  return 'rejected';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-600/20 text-amber-300 border-amber-600/30', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-600/20 text-red-300 border-red-600/30', icon: XCircle },
};

export function StyleGalleryTab() {
  const { authUser } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pendingItems, setPendingItems] = useState<GalleryImage[]>([]);
  const [approvedItems, setApprovedItems] = useState<GalleryImage[]>([]);
  const [rejectedItems, setRejectedItems] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAllItems = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build auth headers from store
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = (useStore.getState() as any)?.authToken
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Fetch all 3 categories in parallel
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/style-gallery?status=pending&limit=100', { headers }),
        fetch('/api/style-gallery?status=approved&limit=100', { headers }),
        fetch('/api/style-gallery?status=rejected&limit=100', { headers }),
      ]);

      const pendingData = pendingRes.ok ? await pendingRes.json() : { images: [] };
      const approvedData = approvedRes.ok ? await approvedRes.json() : { images: [] };
      const rejectedData = rejectedRes.ok ? await rejectedRes.json() : { images: [] };

      setPendingItems(pendingData.images || []);
      setApprovedItems(approvedData.images || []);
      setRejectedItems(rejectedData.images || []);
    } catch {
      showToast('error', 'Failed to load gallery items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = (useStore.getState() as any)?.authToken
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/style-gallery/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isApproved: true, isActive: true }),
      });
      if (res.ok) {
        showToast('success', 'Style approved and now visible in the gallery!');
        fetchAllItems();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.error || 'Failed to approve');
      }
    } catch {
      showToast('error', 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = (useStore.getState() as any)?.authToken
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/style-gallery/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: false, reviewComment: rejectReasonInput || 'Does not meet community guidelines' }),
      });
      if (res.ok) {
        showToast('success', 'Style rejected');
        setRejectReasonInput('');
        setExpandedId(null);
        fetchAllItems();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('error', data.error || 'Failed to reject');
      }
    } catch {
      showToast('error', 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gallery item permanently?')) return;
    setActionLoading(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = (useStore.getState() as any)?.authToken
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/style-gallery/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast('success', 'Gallery item deleted');
        fetchAllItems();
      }
    } catch {
      showToast('error', 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingItems.length },
    { key: 'approved', label: 'Approved', count: approvedItems.length },
    { key: 'rejected', label: 'Rejected', count: rejectedItems.length },
  ];

  const currentItems = activeTab === 'pending' ? pendingItems : activeTab === 'approved' ? approvedItems : rejectedItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-100">AI Style Gallery</h2>
            <p className="text-xs text-amber-200/40">Review and approve user-submitted AI styles</p>
          </div>
        </div>
        <Button onClick={fetchAllItems} variant="outline" size="sm" className="border-amber-900/30 text-amber-200/60 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs — Pending / Approved / Rejected */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30'
                : 'text-amber-200/40 hover:text-amber-200/60 border border-transparent hover:border-amber-900/20'
            }`}
          >
            {STATUS_CONFIG[tab.key]?.icon && (() => {
              const TabIcon = STATUS_CONFIG[tab.key].icon
              return <TabIcon className="h-3.5 w-3.5" />
            })()}
            {tab.label}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              tab.key === 'pending' ? 'bg-amber-600/30 text-amber-300' :
              tab.key === 'approved' ? 'bg-emerald-600/30 text-emerald-300' :
              'bg-red-600/30 text-red-300'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ImageIcon className="h-12 w-12 text-amber-200/20 mb-3" />
          <p className="text-sm text-amber-200/40">No {activeTab} submissions</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          <AnimatePresence>
            {currentItems.map(item => {
              const isExpanded = expandedId === item.id;
              const status = deriveStatus(item);
              const statusCfg = STATUS_CONFIG[status];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border border-amber-900/20 bg-stone-900/60 overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* Image preview */}
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-stone-800">
                      <img
                        src={item.aiGeneratedImage}
                        alt={`Style by ${item.userName}`}
                        className="h-full w-full object-cover"
                      />
                      <Badge className={`absolute top-1 left-1 text-[8px] px-1 py-0 ${statusCfg.color}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-amber-100 truncate">
                            {item.product?.name || item.reviewTitle || 'AI Style Preview'}
                          </p>
                          <p className="text-xs text-amber-200/40">by {item.userName}</p>
                        </div>
                        <span className="text-[10px] text-amber-200/25 whitespace-nowrap">{relativeTime(item.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {item.rating > 0 && (
                          <span className="text-[10px] text-amber-200/30">&#11088; {item.rating}</span>
                        )}
                        {item.reviewComment && (
                          <span className="text-[10px] text-amber-200/25 truncate max-w-[200px]">{item.reviewComment}</span>
                        )}
                      </div>

                      {/* Actions for pending items */}
                      {status === 'pending' && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-500 gap-1.5 h-8 text-xs"
                          >
                            {actionLoading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            Approve
                          </Button>
                          <Button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-600/30 text-red-300 hover:bg-red-600/10 gap-1.5 h-8 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleDelete(item.id)}
                            variant="ghost"
                            size="sm"
                            className="text-amber-200/30 hover:text-red-400 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Actions for approved/rejected items */}
                      {status !== 'pending' && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[10px] text-amber-200/25">
                            {status === 'approved' ? 'Approved' : 'Rejected'} {relativeTime(item.updatedAt)}
                          </span>
                          {status === 'rejected' && item.reviewComment && (
                            <span className="text-[10px] text-red-300/50 truncate max-w-[180px]">— {item.reviewComment}</span>
                          )}
                          <Button
                            onClick={() => handleDelete(item.id)}
                            variant="ghost"
                            size="sm"
                            className="text-amber-200/30 hover:text-red-400 h-7 w-7 p-0 ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded reject reason input */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0">
                          <div className="rounded-lg border border-red-900/20 bg-red-950/20 p-3">
                            <label className="text-xs font-medium text-red-300/70 mb-1 block">Rejection Reason</label>
                            <textarea
                              value={rejectReasonInput}
                              onChange={e => setRejectReasonInput(e.target.value)}
                              placeholder="e.g. Image quality too low, inappropriate content..."
                              className="w-full rounded-md border border-red-900/30 bg-stone-800/50 px-3 py-2 text-xs text-amber-50 placeholder:text-amber-200/20 focus:outline-none focus:ring-1 focus:ring-red-600 resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <Button
                                onClick={() => { setExpandedId(null); setRejectReasonInput(''); }}
                                variant="ghost"
                                size="sm"
                                className="text-amber-200/40 h-7 text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleReject(item.id)}
                                disabled={actionLoading === item.id}
                                size="sm"
                                className="bg-red-600 text-white hover:bg-red-500 h-7 text-xs gap-1"
                              >
                                {actionLoading === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Confirm Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Show rejection reason if already rejected */}
                  {status === 'rejected' && item.reviewComment && !isExpanded && (
                    <div className="px-4 pb-3">
                      <div className="rounded-md border border-red-900/15 bg-red-950/10 p-2">
                        <p className="text-[10px] text-red-300/50">
                          <span className="font-medium">Rejection reason:</span> {item.reviewComment}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
