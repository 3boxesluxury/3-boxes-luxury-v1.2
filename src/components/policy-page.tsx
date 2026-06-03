'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { type ReactNode } from 'react';

interface PolicyPageProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  children: ReactNode;
}

export function PolicyPage({ title, subtitle, icon: Icon, badge, children }: PolicyPageProps) {
  const setView = useStore((s) => s.setView);

  return (
    <div className="py-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('home')}
          className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-amber-600/10 border border-amber-700/20">
            <Icon className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-amber-100 flex items-center gap-3 flex-wrap">
              {title}
              {badge && (
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 text-xs">
                  {badge}
                </Badge>
              )}
            </h1>
            {subtitle && (
              <p className="text-sm text-amber-200/50 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-6"
      >
        {children}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="border-t border-amber-900/20 pt-6 text-center"
      >
        <p className="text-xs text-amber-200/30">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-xs text-amber-200/20 mt-1">
          3 Boxes Luxury — Committed to your security and privacy
        </p>
      </motion.div>
    </div>
  );
}

/* Reusable section component for policy pages */
interface PolicySectionProps {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeColor?: string;
  children: ReactNode;
  index?: number;
}

export function PolicySection({ icon: SectionIcon, title, badge, badgeColor, children, index = 0 }: PolicySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className="rounded-xl border border-amber-900/20 bg-stone-900/50 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-900/15 bg-stone-900/80">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-600/10">
          <SectionIcon className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-amber-100 flex-1">{title}</h2>
        {badge && (
          <Badge
            className={`${badgeColor || 'bg-amber-600/15 text-amber-300 border-amber-600/25'} text-xs`}
          >
            {badge}
          </Badge>
        )}
      </div>
      <div className="px-5 py-4 text-sm leading-relaxed text-amber-200/70 space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

/* Reusable bullet point */
interface PolicyBulletProps {
  icon?: LucideIcon;
  children: ReactNode;
}

export function PolicyBullet({ icon: BulletIcon, children }: PolicyBulletProps) {
  return (
    <div className="flex items-start gap-3">
      {BulletIcon ? (
        <BulletIcon className="h-4 w-4 text-amber-500/70 mt-0.5 flex-shrink-0" />
      ) : (
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500/50 mt-1.5 flex-shrink-0" />
      )}
      <span className="flex-1">{children}</span>
    </div>
  );
}

/* Highlighted callout box */
interface PolicyCalloutProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success';
}

export function PolicyCallout({ children, variant = 'info' }: PolicyCalloutProps) {
  const variantStyles = {
    info: 'bg-amber-600/5 border-amber-600/20 text-amber-200/80',
    warning: 'bg-orange-600/5 border-orange-600/20 text-orange-200/80',
    success: 'bg-emerald-600/5 border-emerald-600/20 text-emerald-200/80',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variantStyles[variant]}`}>
      {children}
    </div>
  );
}
