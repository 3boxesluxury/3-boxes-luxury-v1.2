'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';

export function CartView() {
  const { cartItems, updateQuantity, removeItem, setView } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

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
        {t('common.continueShopping')}
      </Button>

      <h2 className="text-2xl font-bold text-amber-100">{t('cart.title')}</h2>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="h-16 w-16 text-amber-700/30" />
          <h3 className="mt-4 text-lg font-semibold text-amber-100">
            {t('cart.empty')}
          </h3>
          <p className="mt-2 text-sm text-amber-200/40">
            {t('cart.emptyDescription')}
          </p>
          <Button
            onClick={() => setView('home')}
            className="mt-6 bg-amber-600 text-stone-950 hover:bg-amber-500"
          >
            {t('cart.shopNow')}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="flex gap-4 rounded-lg border border-amber-900/20 bg-stone-900/60 p-4"
                >
                  {/* Image */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-stone-800">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-100">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-sm text-amber-400">
                        {format(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center rounded-md border border-amber-900/30 bg-stone-900/50">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center text-amber-200/60 hover:text-amber-400"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm text-amber-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center text-amber-200/60 hover:text-amber-400"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-amber-100">
                          {format(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-amber-200/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6 h-fit">
            <h3 className="text-lg font-semibold text-amber-100">{t('cart.orderSummary')}</h3>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.subtotal')}</span>
                <span className="text-amber-100">
                  {format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.shipping')}</span>
                <span className="text-amber-100">
                  {shipping === 0 ? (
                    <span className="text-emerald-400">{t('common.free')}</span>
                  ) : (
                    format(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.tax')}</span>
                <span className="text-amber-100">
                  {format(tax)}
                </span>
              </div>

              <Separator className="bg-amber-900/30" />

              <div className="flex justify-between">
                <span className="font-semibold text-amber-100">{t('cart.total')}</span>
                <span className="text-lg font-bold text-amber-400">
                  {format(total)}
                </span>
              </div>

              {shipping === 0 && (
                <p className="text-xs text-emerald-400/60">
                  🎉 {t('cart.freeShippingOver', { amount: format(500) })}
                </p>
              )}
            </div>

            <Button
              onClick={() => setView('checkout')}
              className="mt-6 w-full bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
              size="lg"
            >
              {t('common.proceedToCheckout')}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
