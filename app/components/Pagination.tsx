'use client';

import React from 'react';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

interface PaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  loading?: boolean;
  noun?: string;
}

export default function Pagination({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  loading,
  noun = 'items',
}: PaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.ceil(total / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <>
      {/* Mobile pagination */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-2 py-3">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-background-tertiary active:bg-background-tertiary text-foreground-muted touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <p className="text-xs text-foreground-muted tabular-nums text-center">
            <span className="text-foreground font-medium">{page}</span> of {totalPages}
            <span className="mx-1.5 text-border">&middot;</span>
            {total.toLocaleString()} {noun}
          </p>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-background-tertiary active:bg-background-tertiary text-foreground-muted touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/* Spacer to clear bottom nav and floating action buttons */}
        <div className="h-20" aria-hidden="true" />
      </div>

      {/* Desktop pagination */}
      <div className="hidden md:flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <span>Rows per page:</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            disabled={loading}
            className="bg-background-secondary border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-primary disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-foreground-muted">
          {from}&ndash;{to} of {total.toLocaleString()} {noun}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background-tertiary text-foreground-muted"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <span className="text-sm text-foreground-muted tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-background-tertiary text-foreground-muted"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
