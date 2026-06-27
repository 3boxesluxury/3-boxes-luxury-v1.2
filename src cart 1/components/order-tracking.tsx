'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface OrderData {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  deliveryType: string;
  estimatedDelivery: string | null;
  giftWrap: boolean;
  giftMessage: string | null;
  hidePrice: boolean;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
}

const STATUS_STAGES = [
  { key: 'pending', label: 'Order Placed', icon: Clock, description: 'Your order has been placed' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2, description: 'Order confirmed & being prepared' },
  { key: 'processing', label: 'Processing', icon: Package, description: 'Your items are being packed' },
  { key: 'shipped', label: 'Shipped', icon: Truck, description: 'On the way to you' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Delivered successfully' },
];

function getStageIndex(status: string): number {
  if (status === 'cancelled') return -1;
  return STATUS_STAGES.findIndex((s) => s.key === status);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEstimatedDate(dateStr: string | null): string {
  if (!dateStr) return 'Calculating...';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function OrderTracking() {
  const { setView, user } = useStore();
  const [orderInput, setOrderInput] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<OrderData | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch user's orders if logged in
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user?.email) return null;
      const res = await fetch(`/api/orders?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!user?.email,
  });

  const searchOrder = useCallback(async () => {
    if (!orderInput.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchedOrder(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderInput.trim())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Order not found');
      }
      const data = await res.json();
      setSearchedOrder(data.order);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Order not found');
    } finally {
      setSearching(false);
    }
  }, [orderInput]);

  const cancelOrder = async (orderId: string) => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason: 'Cancelled by customer' }),
      });
      if (!res.ok) throw new Error('Failed to cancel order');
      // Refresh order data
      const data = await res.json();
      if (searchedOrder?.id === orderId) {
        setSearchedOrder((prev) => prev ? { ...prev, status: 'cancelled', cancelledAt: new Date().toISOString() } : null);
      }
    } catch {
      // Silently handle error
    } finally {
      setCancelling(false);
    }
  };

  const renderTimeline = (order: OrderData) => {
    const isCancelled = order.status === 'cancelled';
    const currentStage = getStageIndex(order.status);

    if (isCancelled) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
            <XCircle className="h-8 w-8 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-300">Order Cancelled</p>
              <p className="text-sm text-red-300/60">
                {order.cancelReason || 'This order has been cancelled'}
              </p>
              {order.cancelledAt && (
                <p className="text-xs text-red-300/40 mt-1">
                  Cancelled on {formatDate(order.cancelledAt)}
                </p>
              )}
            </div>
          </div>
          {/* Show the progress up to the point it was cancelled */}
          <div className="mt-4">
            <p className="text-sm text-amber-200/40 mb-3">Status before cancellation:</p>
            <div className="space-y-0">
              {STATUS_STAGES.slice(0, Math.max(currentStage, 1)).map((stage, index) => {
                const stageHistory = order.statusHistory.find((h) => h.status === stage.key);
                const isLast = index === Math.max(currentStage, 1) - 1;
                return (
                  <div key={stage.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 border border-stone-700">
                        <div className="h-2 w-2 rounded-full bg-amber-200/30" />
                      </div>
                      {!isLast && <div className="w-0.5 h-8 bg-stone-800" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-amber-200/40">{stage.label}</p>
                      {stageHistory && (
                        <p className="text-xs text-amber-200/25">{formatDate(stageHistory.createdAt)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {STATUS_STAGES.map((stage, index) => {
          const isCompleted = index < currentStage;
          const isCurrent = index === currentStage;
          const isFuture = index > currentStage;
          const stageHistory = order.statusHistory.find((h) => h.status === stage.key);
          const Icon = stage.icon;
          const isLast = index === STATUS_STAGES.length - 1;

          return (
            <div key={stage.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? 'border-amber-500 bg-amber-500'
                      : isCurrent
                      ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/30'
                      : 'border-stone-700 bg-stone-900'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isCompleted
                        ? 'text-stone-950'
                        : isCurrent
                        ? 'text-amber-400'
                        : 'text-stone-600'
                    }`}
                  />
                </motion.div>
                {!isLast && (
                  <div
                    className={`w-0.5 h-12 rounded-full ${
                      isCompleted ? 'bg-amber-500' : 'bg-stone-800'
                    }`}
                  />
                )}
              </div>
              <div className="pb-6 pt-1">
                <p
                  className={`font-medium ${
                    isCompleted
                      ? 'text-amber-200/60'
                      : isCurrent
                      ? 'text-amber-100'
                      : 'text-stone-600'
                  }`}
                >
                  {stage.label}
                  {isCurrent && (
                    <Badge className="ml-2 bg-amber-400/10 text-amber-400 border-amber-400/20 text-[10px]">
                      Current
                    </Badge>
                  )}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isCurrent ? 'text-amber-200/50' : 'text-stone-600'
                  }`}
                >
                  {stage.description}
                </p>
                {stageHistory && (
                  <p className="text-xs text-amber-200/30 mt-1">
                    {formatDate(stageHistory.createdAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrderCard = (order: OrderData, compact = false) => {
    const isCancelled = order.status === 'cancelled';
    const isCancellable = order.status === 'pending' || order.status === 'confirmed';

    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      processing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      shipped: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    return (
      <Card
        key={order.id}
        className={`border-amber-900/20 bg-stone-900/60 ${compact ? 'cursor-pointer hover:border-amber-900/40' : ''}`}
        onClick={compact ? () => { setOrderInput(order.orderNumber); setSearchedOrder(order); } : undefined}
      >
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-amber-100 font-semibold">#{order.orderNumber}</p>
              <p className="text-xs text-amber-200/40 mt-0.5">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={statusColors[order.status] || 'bg-stone-800 text-stone-400'}
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Items */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {order.items.slice(0, 4).map((item) => (
              <div key={item.id} className="h-14 w-14 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                )}
              </div>
            ))}
            {order.items.length > 4 && (
              <div className="h-14 w-14 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                <span className="text-xs text-amber-200/50">+{order.items.length - 4}</span>
              </div>
            )}
          </div>

          {/* Estimated Delivery */}
          {order.estimatedDelivery && !isCancelled && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span className="text-amber-200/50">Estimated delivery:</span>
              <span className="text-amber-100 font-medium">
                {formatEstimatedDate(order.estimatedDelivery)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-200/50">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
            </span>
            <span className="font-semibold text-amber-400">₹{order.total.toLocaleString()}</span>
          </div>

          {/* Actions */}
          {!compact && isCancellable && (
            <>
              <Separator className="bg-amber-900/30 my-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-200/30">
                  <AlertCircle className="h-3 w-3" />
                  <span>You can cancel this order</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancelling}
                  onClick={() => cancelOrder(order.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Cancel Order
                </Button>
              </div>
            </>
          )}

          {/* Full Timeline (only for expanded view) */}
          {!compact && (
            <>
              <Separator className="bg-amber-900/30 my-6" />
              <h4 className="text-sm font-semibold text-amber-200/60 mb-4">Order Timeline</h4>
              {renderTimeline(order)}
            </>
          )}

          {/* Compact: View details button */}
          {compact && (
            <div className="flex items-center justify-end mt-3 text-xs text-amber-400">
              <span>Track Order</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 mb-4">
            <Truck className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold text-amber-100">Track Your Order</h2>
          <p className="text-amber-200/50 mt-2">Enter your order number to see real-time updates</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-200/30" />
            <Input
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="Enter order number (e.g. 3BL-...)"
              className="pl-10 border-amber-900/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-200/20 h-12"
              onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
            />
          </div>
          <Button
            onClick={searchOrder}
            disabled={searching || !orderInput.trim()}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500 h-12 px-6"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
          </Button>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
            <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-300">{searchError}</p>
          </div>
        )}

        {/* Searched Order Details */}
        <AnimatePresence mode="wait">
          {searchedOrder && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8"
            >
              {renderOrderCard(searchedOrder)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order History (if logged in) */}
        {user?.email && (
          <div className="mt-8">
            <Separator className="bg-amber-900/20 mb-8" />
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-100">Your Orders</h3>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
              </div>
            ) : ordersData?.orders?.length ? (
              <div className="space-y-3">
                {ordersData.orders.map((order: OrderData) => renderOrderCard(order, true))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-amber-200/20 mx-auto mb-3" />
                <p className="text-amber-200/40">No orders found</p>
              </div>
            )}
          </div>
        )}

        {/* Not logged in prompt */}
        {!user?.email && (
          <div className="mt-8 text-center">
            <Separator className="bg-amber-900/20 mb-8" />
            <p className="text-amber-200/40 text-sm">
              Sign in to view your order history
            </p>
            <Button
              variant="outline"
              onClick={() => useStore.getState().setShowAuthDialog(true)}
              className="mt-3 border-amber-700/30 text-amber-300 hover:bg-amber-900/20"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
