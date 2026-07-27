'use client';
import React from 'react';

// Radial dial for a single 0–100% metric (CPU / Memory / Storage),
// colored by warning/danger thresholds. Restored from the original dashboard design.
export default function RadialGauge({
  value,
  label,
  icon,
  size = 110,
  thresholds = { warning: 60, danger: 80 },
  subtitle,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  size?: number;
  thresholds?: { warning: number; danger: number };
  subtitle?: string;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 8;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;

  const getColor = () => {
    if (normalizedValue >= thresholds.danger)
      return { stroke: '#ef4444', text: 'text-red-500', bg: 'from-red-500/20 to-red-500/5' };
    if (normalizedValue >= thresholds.warning)
      return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'from-amber-500/20 to-amber-500/5' };
    return { stroke: '#10b981', text: 'text-emerald-500', bg: 'from-emerald-500/20 to-emerald-500/5' };
  };

  const color = getColor();
  const riskLevel =
    normalizedValue >= thresholds.danger
      ? 'Critical'
      : normalizedValue >= thresholds.warning
        ? 'Warning'
        : 'Normal';

  return (
    <div className={`relative flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${color.bg}`}>
      <div
        className="relative w-[80px] h-[80px] sm:w-[110px] sm:h-[110px]"
        style={{ maxWidth: size, maxHeight: size }}
      >
        <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-background-tertiary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`mb-0.5 sm:mb-1 ${color.text}`}>{icon}</div>
          <span className={`text-base sm:text-2xl font-bold stat-value ${color.text}`}>
            {normalizedValue.toFixed(0)}%
          </span>
          <span className={`text-[9px] sm:text-[10px] font-medium ${color.text}`}>{riskLevel}</span>
        </div>
      </div>

      <div className="mt-1.5 sm:mt-2 text-center">
        <p className="text-xs sm:text-sm font-medium text-foreground">{label}</p>
        {subtitle && (
          <p className="text-[9px] sm:text-[10px] text-foreground-muted mt-0.5 truncate max-w-full">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
