'use client';

import React, { JSX, useState } from 'react';
import RouterSelector from '../../components/RouterSelector';
import MobileSidebar from '../../components/MobileSidebar';
import AccountMenu from '../../components/AccountMenu';
import type { Router } from '../../lib/types';
import { DateFilter, DATE_FILTER_OPTIONS, isFilterEqual } from '../dateFilter';

export default function DashboardToolbar(props: {
  selectedRouterId: number | null;
  onRouterChange: (id: number | null) => void;
  onRoutersLoaded: (r: unknown[]) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  showCustomRange: boolean;
  onToggleCustomRange: (v: boolean) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  onApplyCustomRange: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}): JSX.Element {
  const {
    selectedRouterId,
    onRouterChange,
    onRoutersLoaded,
    dateFilter,
    onDateFilterChange,
    showCustomRange,
    onToggleCustomRange,
    customStartDate,
    customEndDate,
    onCustomStartChange,
    onCustomEndChange,
    onApplyCustomRange,
    onRefresh,
    refreshing,
  } = props;

  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
      <div className="px-4 sm:px-6 py-3 space-y-2">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
          {/* Hamburger — only below `md`, where the desktop sidebar is hidden */}
          <button
            onClick={() => setShowSidebar(true)}
            aria-label="Open navigation menu"
            className="md:hidden -ml-1 p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors active:opacity-70 touch-manipulation flex-none"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <h1 className="text-lg font-semibold text-foreground flex-none">Dashboard</h1>

          {/* Account — top-right on mobile, far-right on desktop */}
          <div className="order-1 md:order-last ml-auto md:ml-0 flex-none">
            <AccountMenu />
          </div>

          {/* Controls — own full-width row on mobile, inline (pushed right) on desktop */}
          <div className="order-2 md:order-none w-full md:w-auto md:ml-auto flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap min-w-0">
            <RouterSelector
              selectedRouterId={selectedRouterId}
              onRouterChange={onRouterChange}
              onRoutersLoaded={onRoutersLoaded as (r: Router[]) => void}
              userId={1}
              fullWidthOnMobile
            />

            {/* Period pills (scrollable when cramped) */}
            <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg overflow-x-auto no-scrollbar min-w-0 flex-1 md:flex-none">
              {DATE_FILTER_OPTIONS.map(({ filter, label }) => (
                <button
                  key={label}
                  onClick={() => {
                    onDateFilterChange(filter);
                    onToggleCustomRange(false);
                  }}
                  className={`period-pill whitespace-nowrap flex-shrink-0 ${
                    isFilterEqual(dateFilter, filter) && !showCustomRange
                      ? 'period-pill-active'
                      : 'period-pill-inactive'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => onToggleCustomRange(!showCustomRange)}
                className={`period-pill whitespace-nowrap flex-shrink-0 ${
                  dateFilter.type === 'custom' || showCustomRange
                    ? 'period-pill-active'
                    : 'period-pill-inactive'
                }`}
              >
                Custom
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="btn-secondary flex items-center gap-2 flex-none"
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {showCustomRange && (
          <div className="flex items-center gap-2 p-2 bg-background-tertiary rounded-lg animate-fade-in flex-wrap sm:flex-nowrap">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
            />
            <span className="text-foreground-muted text-sm">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 min-w-0"
            />
            <button
              onClick={onApplyCustomRange}
              disabled={!customStartDate || !customEndDate}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <MobileSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
}
