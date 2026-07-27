'use client';
import React from 'react';

export type BulletStatus = 'normal' | 'warning' | 'critical';

export function bulletStatus(percent: number, warning: number, danger: number): BulletStatus {
  if (percent >= danger) return 'critical';
  if (percent >= warning) return 'warning';
  return 'normal';
}

const STATUS_BAR: Record<BulletStatus, string> = {
  normal: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-red-500',
};
const STATUS_TEXT: Record<BulletStatus, string> = {
  normal: 'text-emerald-500', warning: 'text-amber-500', critical: 'text-red-500',
};
const STATUS_LABEL: Record<BulletStatus, string> = {
  normal: 'Normal', warning: 'Warning', critical: 'Critical',
};

export default function BulletBar({
  label, percent, subtitle, warning = 60, danger = 80, icon,
}: { label: string; percent: number; subtitle?: string; warning?: number; danger?: number; icon?: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, percent));
  const status = bulletStatus(pct, warning, danger);
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground min-w-0">
          {icon && <span className={`${STATUS_TEXT[status]} flex-shrink-0`}>{icon}</span>}
          <span className="truncate">{label}</span>
        </span>
        <span className={`text-sm font-bold stat-value flex-shrink-0 ${STATUS_TEXT[status]}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-background-tertiary overflow-hidden">
        {/* threshold ticks */}
        <span className="absolute top-0 bottom-0 w-px bg-foreground-muted/30" style={{ left: `${warning}%` }} />
        <span className="absolute top-0 bottom-0 w-px bg-foreground-muted/40" style={{ left: `${danger}%` }} />
        <div className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[status]}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] sm:text-[10px] text-foreground-muted truncate">{subtitle}</span>
        <span className={`text-[9px] sm:text-[10px] font-medium ${STATUS_TEXT[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
    </div>
  );
}
