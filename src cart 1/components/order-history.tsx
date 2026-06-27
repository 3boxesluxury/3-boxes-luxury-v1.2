'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Package, ArrowLeft, Truck, ExternalLink, Gift, Tag, XCircle, Loader2, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
  deliveryType?: string;
  giftWrapping?: boolean;
  giftWrapStyle?: string;
  couponCode?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  processing: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  shipped: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
  cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
};

const deliveryTypeLabels: Record<string, string> = {
  standard: 'Standard',
  express: 'Express',
  'same-day': 'Same-Day',
};

export function OrderHistory() {
  const { setView } = useStore();
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders', searchEmail],
    queryFn: () => fetch(`/api/orders?email=${encodeURIComponent(searchEmail)}`).then((r) => r.json()),
    enabled: !!searchEmail,
  });

  const orders = data?.orders ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/orders/${cancelOrderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason, email: searchEmail }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['orders', searchEmail] });
      }
    } catch {
      // ignore
    } finally {
      setCancelLoading(false);
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelOrderId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('orderHistory.backToShop')}
      </Button>

      <h2 className="text-2xl font-bold text-amber-100">{t('orderHistory.title')}</h2>
      <p className="mt-1 text-sm text-amber-200/40">
        {t('orderHistory.enterEmailLookup')}
      </p>

      {/* Email Search */}
      <form onSubmit={handleSearch} className="mt-6 flex gap-3">
        <div className="flex-1 max-w-md">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('orderHistory.enterEmailAddress')}
            className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/20"
          />
        </div>
        <Button
          type="submit"
          className="bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          <Search className="mr-2 h-4 w-4" />
          {t('orderHistory.search')}
        </Button>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Package className="h-8 w-8 animate-pulse text-amber-600/40" />
        </div>
      )}

      {searchEmail && !isLoading && orders && orders.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-amber-200/60">{t('orderHistory.noOrdersFoundFor', { email: searchEmail })}</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-amber-900/20 bg-stone-900/60 overflow-hidden"
            >
              {/* Order Header */}
              <button
                onClick={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
                className="flex w-full items-center justify-between p-4 text-left hover:bg-amber-900/10 transition-colors"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-mono text-sm font-semibold text-amber-400">
                    {order.orderNumber}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColors[order.status] || 'bg-stone-600/20 text-stone-400'}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    {order.deliveryType && (
                      <Badge variant="outline" className="bg-stone-600/20 text-stone-300 border-stone-600/30 text-[10px]">
                        <Truck className="mr-1 h-3 w-3" />
                        {t('orderHistory.' + (order.deliveryType === 'same-day' ? 'sameDay' : order.deliveryType)) || order.deliveryType}
                      </Badge>
                    )}
                    {order.giftWrapping && (
                      <Badge variant="outline" className="bg-pink-600/15 text-pink-300 border-pink-600/30 text-[10px]">
                        <Gift className="mr-1 h-3 w-3" />
                        {t('orderHistory.gift')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-100">
                      ${order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-amber-200/40">
                      {new Date(order.createdAt).toLocaleDateString()} · {t('orderHistory.itemsCount', { count: order.itemCount })}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-amber-200/40 transition-transform ${
                      expandedOrder === order.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Order Items */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Separator className="bg-amber-900/20" />
                    <div className="p-4 space-y-3">
                      {/* Tracking Info */}
                      {(order.trackingNumber || order.estimatedDelivery) && (
                        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-amber-400" />
                            <span className="text-xs font-medium text-amber-200/70">{t('orderHistory.tracking')}</span>
                          </div>
                          {order.trackingNumber && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-200/40">{t('orderHistory.number')}</span>
                              {order.trackingUrl ? (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                                >
                                  {order.trackingNumber}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-amber-100">{order.trackingNumber}</span>
                              )}
                            </div>
                          )}
                          {order.estimatedDelivery && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-amber-200/30" />
                              <span className="text-xs text-amber-200/40">{t('orderHistory.estDelivery')}</span>
                              <span className="text-xs text-amber-100">
                                {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-800 text-lg">
                              💎
                            </div>
                            <div>
                              <p className="text-sm text-amber-100">{item.name}</p>
                              <p className="text-xs text-amber-200/40">
                                {t('orderHistory.qty')} {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-amber-400">
                            ${(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}

                      <Separator className="bg-amber-900/20" />

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">{t('orderHistory.subtotal')}</span>
                          <span className="text-amber-200/60">${order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">{t('orderHistory.shipping')}</span>
                          <span className="text-amber-200/60">${order.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">{t('orderHistory.tax')}</span>
                          <span className="text-amber-200/60">${order.tax.toFixed(2)}</span>
                        </div>
                        {order.discount && order.discount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-400/70 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {t('orderHistory.discount')}{order.couponCode ? ` (${order.couponCode})` : ''}
                            </span>
                            <span className="text-emerald-400">-${order.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-amber-100">{t('orderHistory.total')}</span>
                          <span className="text-amber-400">${order.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Gift Wrapping Info */}
                      {order.giftWrapping && (
                        <div className="flex items-center gap-2 text-xs text-amber-200/40">
                          <Gift className="h-3.5 w-3.5 text-pink-400/50" />
                          <span>{t('orderHistory.giftWrapped')}{order.giftWrapStyle ? ` — ${order.giftWrapStyle.charAt(0).toUpperCase() + order.giftWrapStyle.slice(1)}` : ''}</span>
                        </div>
                      )}

                      {/* Cancel Order Button */}
                      {order.status === 'pending' && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCancelOrderId(order.id);
                              setCancelDialogOpen(true);
                            }}
                            className="border-red-900/30 text-red-400/60 hover:border-red-600/40 hover:text-red-400 text-xs"
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                            {t('orderHistory.cancelOrder')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="border-amber-900/30 bg-stone-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-100">{t('orderHistory.cancelOrderTitle')}</DialogTitle>
            <DialogDescription className="text-amber-200/50">
              {t('orderHistory.cancelOrderDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label htmlFor="cancel-reason" className="text-sm text-amber-200/60">{t('orderHistory.reasonForCancellation')}</label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('orderHistory.tellUsWhy')}
                className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason('');
                  setCancelOrderId(null);
                }}
                className="flex-1 border-amber-900/40 text-amber-200/60"
              >
                {t('orderHistory.keepOrder')}
              </Button>
              <Button
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="flex-1 bg-red-600 text-white hover:bg-red-500"
              >
                {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('orderHistory.cancelOrder')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
