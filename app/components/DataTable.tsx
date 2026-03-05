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
}: DataTableProps<T>) {
  const outerClass = className !== undefined
    ? className
    : 'hidden md:block card animate-fade-in';

  return (
    <div className={outerClass}>
      <div className="overflow-x-auto">
        <table>
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
            {data.length === 0 ? (
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
