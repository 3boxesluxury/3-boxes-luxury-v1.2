'use client';

import { useStore } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, ShoppingBag, Package } from 'lucide-react';

export function OrderConfirmation() {
  const { lastOrderId, setView } = useStore();
  const { t } = useTranslation();

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  const deliveryStr = estimatedDelivery.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle className="h-20 w-20 text-emerald-400" />
      </motion.div>

      <h2 className="mt-6 text-2xl font-bold text-amber-100 sm:text-3xl">
        {t('orderConfirmation.title')}
      </h2>
      <p className="mt-2 text-amber-200/60">
        {t('orderConfirmation.thankYou')}
      </p>

      <div className="mt-8 rounded-lg border border-amber-900/20 bg-stone-900/60 p-6 text-left w-full max-w-md">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-amber-200/50">{t('orderConfirmation.orderNumber')}</span>
            <span className="font-mono text-sm text-amber-400">
              {lastOrderId || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-200/50">{t('orderConfirmation.estimatedDelivery')}</span>
            <span className="text-amber-100">{deliveryStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-200/50">{t('orderConfirmation.status')}</span>
            <span className="text-emerald-400">{t('orderConfirmation.confirmed')}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => setView('home')}
          className="bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          {t('orderConfirmation.continueShopping')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setView('orders')}
          className="border-amber-900/30 text-amber-200/70 hover:border-amber-600/40 hover:text-amber-400"
        >
          <Package className="mr-2 h-4 w-4" />
          {t('orderConfirmation.viewOrders')}
        </Button>
      </div>
    </motion.div>
  );
}
