'use client';

import React from 'react';

export interface DataTableColumn {
  key: string;
  label: string;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn[];
  data: T[];
  rowKey: (item: T) => string | number;
  renderCell: (item: T, columnKey: string) => React.ReactNode;
  emptyState?: {
    icon?: React.ReactNode;
    message: string;
  };
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T, index: number) => string;
  rowStyle?: (item: T, index: number) => React.CSSProperties;
  footer?: React.ReactNode;
  className?: string;
  animateRows?: boolean;
  /**
   * When true, the table keeps cells on a single line and grows to its
   * natural width, letting the surrounding scroll container scroll
   * horizontally instead of squeezing columns. Use this for wide tables
   * (≥ 7 columns, or tables with technical/numeric data that doesn't
   * compress well — e.g. customers, monitoring views, transactions).
   */
  scrollable?: boolean;
  /**
   * Optional explicit min-width for the table when `scrollable` is true.
   * Defaults to a sensible value based on the column count. Accepts any
   * valid CSS length (e.g. `'1100px'`, `'72rem'`).
   */
  minWidth?: string;
  /**
   * When true, renders shimmering skeleton rows in place of `data` so the
   * column structure stays visible during the initial fetch. Pages that
   * have async data should pass their own loading flag here instead of
   * unmounting the table behind a page-wide spinner — that way per-cell
   * skeletons (live data, etc.) can transition smoothly once the main
   * payload arrives.
   */
  loading?: boolean;
  /** Number of skeleton rows to render while `loading` is true. Defaults to 8. */
  loadingRows?: number;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  renderCell,
  emptyState,
  onRowClick,
  rowClassName,
  rowStyle,
  footer,
  className,
  animateRows = true,
  scrollable = false,
  minWidth,
  loading = false,
  loadingRows = 8,
}: DataTableProps<T>) {
  const outerClass = className !== undefined
    ? className
    : 'hidden md:block card animate-fade-in';

  const resolvedMinWidth = scrollable
    ? minWidth ?? `${Math.max(720, columns.length * 140)}px`
    : undefined;

  const tableStyle: React.CSSProperties | undefined = scrollable
    ? { minWidth: resolvedMinWidth, width: '100%' }
    : undefined;

  const innerScrollClass = scrollable
    ? 'overflow-x-auto [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap'
    : 'overflow-x-auto';

  return (
    <div className={outerClass}>
      <div className={innerScrollClass}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <tr key={`__skeleton-${i}`} className="animate-fade-in" aria-hidden="true">
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      <div className="h-4 rounded skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-foreground-muted py-12">
                  {emptyState?.icon && (
                    <div className="flex justify-center mb-4">{emptyState.icon}</div>
                  )}
                  {emptyState?.message ?? 'No data found'}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={rowKey(item)}
                  className={[
                    animateRows ? 'animate-fade-in' : '',
                    rowClassName ? rowClassName(item, index) : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={rowStyle ? rowStyle(item, index) : undefined}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {renderCell(item, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}
