'use client';
import React from 'react';

const ACCENT: Record<string, string> = {
  amber: 'bg-amber-500', emerald: 'bg-emerald-500', cyan: 'bg-cyan-500',
  violet: 'bg-violet-500', orange: 'bg-orange-500', purple: 'bg-purple-500',
};

interface SectionCardProps {
  title: string;
  accent?: keyof typeof ACCENT;
  meta?: React.ReactNode;
  controls?: React.ReactNode;
  loading?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export default function SectionCard({
  title, accent = 'amber', meta, controls, loading, className = '', bodyClassName = '', children,
}: SectionCardProps) {
  return (
    <section className={`card p-4 sm:p-5 animate-fade-in min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base min-w-0">
          <span className={`w-1.5 h-5 rounded-full flex-shrink-0 ${ACCENT[accent]}`} />
          <span className="truncate">{title}</span>
          {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />}
        </h3>
        {(meta || controls) && (
          <div className="flex items-center gap-2 flex-shrink-0 text-[10px] sm:text-xs text-foreground-muted">
            {meta}
            {controls}
          </div>
        )}
      </div>
      <div className={`min-w-0 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function SectionError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-danger">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost text-xs">Retry</button>}
    </div>
  );
}

export function SectionEmpty({ message }: { message: string }) {
  return <div className="text-center py-8 text-foreground-muted text-sm">{message}</div>;
}
