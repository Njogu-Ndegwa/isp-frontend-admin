'use client';

import React from 'react';

export interface FilterPillOption<V extends string = string> {
  value: V;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterPillsProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  options: FilterPillOption<V>[];
  className?: string;
  ariaLabel?: string;
}

/**
 * Segmented pill control. Use for short, mutually exclusive filter
 * sets (≤ ~5 options) where the user benefits from seeing all choices
 * at a glance. Falls back to horizontal scroll on narrow viewports.
 */
export default function FilterPills<V extends string = string>({
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
}: FilterPillsProps<V>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={`period-pill whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5 ${
              isActive ? 'period-pill-active' : 'period-pill-inactive'
            }`}
          >
            {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-black/15 text-black/70'
                    : 'bg-background-secondary text-foreground-muted'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
