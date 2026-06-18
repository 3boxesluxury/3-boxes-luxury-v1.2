'use client';

import { useStore } from '@/lib/store';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

const OCCASIONS = [
  { label: 'Birthday', value: 'birthday' },
  { label: 'Anniversary', value: 'anniversary' },
  { label: 'Wedding', value: 'wedding' },
  { label: 'Diwali', value: 'diwali' },
  { label: "Valentine's Day", value: 'valentine' },
  { label: 'Housewarming', value: 'housewarming' },
  { label: 'Christmas', value: 'christmas' },
  { label: 'New Year', value: 'new-year' },
  { label: 'Graduation', value: 'graduation' },
  { label: 'Baby Shower', value: 'baby-shower' },
  { label: 'Retirement', value: 'retirement' },
  { label: 'Thank You', value: 'thank-you' },
];

const RECIPIENTS = [
  { label: 'For Him', value: 'for-him' },
  { label: 'For Her', value: 'for-her' },
  { label: 'For Couple', value: 'for-couple' },
  { label: 'For Kids', value: 'for-kids' },
  { label: 'For Parents', value: 'for-parents' },
  { label: 'For Boss', value: 'for-boss' },
  { label: 'For Colleague', value: 'for-colleague' },
  { label: 'For Friend', value: 'for-friend' },
];

const RELATIONSHIPS = [
  { label: 'Spouse', value: 'spouse' },
  { label: 'Friend', value: 'friend' },
  { label: 'Parent', value: 'parent' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Colleague', value: 'colleague' },
  { label: 'Boss', value: 'boss' },
  { label: 'Client', value: 'client' },
];

const PRICE_RANGES = [
  { label: 'Under ₹1,000', value: 'under-1000' },
  { label: '₹1,000–2,500', value: '1000-2500' },
  { label: '₹2,500–5,000', value: '2500-5000' },
  { label: '₹5,000–10,000', value: '5000-10000' },
  { label: 'Above ₹10,000', value: 'above-10000' },
];

function FilterChip({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        isActive
          ? 'border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
          : 'border-amber-900/30 bg-stone-900/50 text-amber-200/50 hover:border-amber-700/40 hover:text-amber-200/80 hover:bg-stone-800/60'
      }`}
    >
      {label}
    </button>
  );
}

function FilterGroup({
  title,
  icon,
  options,
  activeValue,
  onSelect,
}: {
  title: string;
  icon: string;
  options: { label: string; value: string }[];
  activeValue: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-200/40">
          {title}
        </h4>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            value={opt.value}
            isActive={activeValue === opt.value}
            onClick={() => onSelect(activeValue === opt.value ? null : opt.value)}
          />
        ))}
      </div>
    </div>
  );
}

export function GiftFilterBar() {
  const { giftFilter, setGiftFilter, clearGiftFilter } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    giftFilter.occasion !== null ||
    giftFilter.recipient !== null ||
    giftFilter.relationship !== null ||
    giftFilter.priceRange !== null;

  const activeCount = [
    giftFilter.occasion,
    giftFilter.recipient,
    giftFilter.relationship,
    giftFilter.priceRange,
  ].filter(Boolean).length;

  // Get label for active filter value
  const getFilterLabel = (type: string, value: string | null): string | null => {
    if (!value) return null;
    const allOptions = [...OCCASIONS, ...RECIPIENTS, ...RELATIONSHIPS, ...PRICE_RANGES];
    const found = allOptions.find((o) => o.value === value);
    return found?.label ?? value;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      {/* Trigger Button */}
      <CollapsibleTrigger asChild>
        <button
          className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 sm:px-5 sm:py-3.5 ${
            hasActiveFilters
              ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
              : 'border-amber-900/25 bg-stone-900/40 hover:border-amber-800/40 hover:bg-stone-900/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles
              className={`h-4 w-4 transition-colors ${
                hasActiveFilters ? 'text-amber-400' : 'text-amber-500/50 group-hover:text-amber-400'
              }`}
            />
            <span
              className={`text-sm font-semibold transition-colors ${
                hasActiveFilters ? 'text-amber-200' : 'text-amber-200/60 group-hover:text-amber-200/90'
              }`}
            >
              Find the Perfect Gift
            </span>
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/30 px-1.5 text-[10px] font-bold text-amber-300">
                {activeCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-amber-200/40 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </CollapsibleTrigger>

      {/* Expandable Content */}
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="mt-3 rounded-xl border border-amber-900/25 bg-stone-900/50 p-4 sm:p-5">
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-amber-200/40">Active:</span>
              {giftFilter.occasion && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {getFilterLabel('occasion', giftFilter.occasion)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftFilter({ occasion: null });
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {giftFilter.recipient && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {getFilterLabel('recipient', giftFilter.recipient)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftFilter({ recipient: null });
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {giftFilter.relationship && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {getFilterLabel('relationship', giftFilter.relationship)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftFilter({ relationship: null });
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {giftFilter.priceRange && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                  {getFilterLabel('priceRange', giftFilter.priceRange)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGiftFilter({ priceRange: null });
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearGiftFilter();
                }}
                className="ml-auto text-xs font-medium text-amber-200/40 underline decoration-amber-200/20 underline-offset-2 transition-colors hover:text-amber-300"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Filter Groups */}
          <div className="space-y-4">
            <FilterGroup
              title="Occasion"
              icon="🎉"
              options={OCCASIONS}
              activeValue={giftFilter.occasion}
              onSelect={(value) => setGiftFilter({ occasion: value })}
            />

            <div className="border-t border-amber-900/15" />

            <FilterGroup
              title="Recipient"
              icon="🎁"
              options={RECIPIENTS}
              activeValue={giftFilter.recipient}
              onSelect={(value) => setGiftFilter({ recipient: value })}
            />

            <div className="border-t border-amber-900/15" />

            <FilterGroup
              title="Relationship"
              icon="💕"
              options={RELATIONSHIPS}
              activeValue={giftFilter.relationship}
              onSelect={(value) => setGiftFilter({ relationship: value })}
            />

            <div className="border-t border-amber-900/15" />

            <FilterGroup
              title="Price Range"
              icon="💰"
              options={PRICE_RANGES}
              activeValue={giftFilter.priceRange}
              onSelect={(value) => setGiftFilter({ priceRange: value })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
