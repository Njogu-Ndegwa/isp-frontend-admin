'use client';

import React from 'react';

export interface TabItem<V extends string = string> {
  value: V;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  tabs: TabItem<V>[];
  className?: string;
  ariaLabel?: string;
  /** Tabs grow to fill the row equally. Useful for narrow containers. */
  fullWidth?: boolean;
}

/**
 * Underline tab strip. Matches the existing tab pattern used on
 * `/admin/resellers/[id]` and `/admin/leads/[id]` so it doesn't feel
 * out of place. Use for primary view switching (e.g. Hotspot vs PPPoE,
 * Payments vs Routers, Domains vs IPs). For secondary in-view filters
 * (e.g. status), prefer `FilterPills`.
 */
export default function Tabs<V extends string = string>({
  value,
  onChange,
  tabs,
  className = '',
  ariaLabel,
  fullWidth = false,
}: TabsProps<V>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1 border-b border-border overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${fullWidth ? 'flex-1 justify-center' : 'flex-shrink-0'}
              ${isActive
                ? 'text-accent-primary'
                : 'text-foreground-muted hover:text-foreground'
              }
            `}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'bg-background-tertiary text-foreground-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
