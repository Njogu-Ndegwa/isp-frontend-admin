'use client';

import { useState } from 'react';
import { useWidth } from './shared';

/**
 * Small trend marks for the home cards. Context in a quiet tone, the latest full
 * period in the accent, a period still filling in as an outline, and a readout on
 * hover or touch so no value is locked inside a picture.
 */
export type MiniPoint = { label: string; value: number; partial?: boolean };

export function MiniBars({ points, height = 56, format = (v: number) => v.toLocaleString('en-US'), empty }: {
  points: MiniPoint[];
  height?: number;
  format?: (v: number) => string;
  empty?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  // a row of empty columns says nothing; say so in words instead
  if (points.every((p) => p.value === 0)) return <p className="text-[12.5px] leading-snug text-ink-3">{empty ?? 'Nothing in this period.'}</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  const gap = points.length > 20 ? 2 : 3;
  const barW = Math.max(2, Math.min(26, (width - gap * (points.length - 1)) / Math.max(points.length, 1)));
  const used = barW * points.length + gap * (points.length - 1);
  const x0 = Math.max(0, width - used); // hug the right edge: the newest value is what matters
  const lastComplete = points.reduce((last, p, i) => (p.partial ? last : i), -1);
  const shown = active ?? (points[points.length - 1]?.partial ? points.length - 1 : lastComplete);

  return (
    <div>
      <div className="mb-1 flex h-4 items-baseline justify-between text-[11.5px] text-ink-3">
        <span>{shown >= 0 && points[shown] ? points[shown].label : ''}</span>
        <span className="ai-num font-bold text-ink-2">
          {shown >= 0 && points[shown] ? format(points[shown].value) : ''}
          {shown >= 0 && points[shown]?.partial ? ' so far' : ''}
        </span>
      </div>
      <div ref={ref} style={{ height }} onPointerLeave={() => setActive(null)}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label={points.map((p) => `${p.label}: ${format(p.value)}`).join(', ')}>
            <line x1={0} x2={width} y1={height - 0.5} y2={height - 0.5} stroke="var(--ai-grid)" />
            {points.map((p, i) => {
              const h = p.value > 0 ? Math.max(2, (p.value / max) * (height - 4)) : 0;
              const x = x0 + i * (barW + gap);
              const y = height - h;
              const r = Math.min(3, barW / 2, h);
              const d = h > 0 ? `M${x},${height}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${height}Z` : '';
              const isActive = active === i;
              return (
                <g key={i}>
                  {p.partial ? (
                    <path d={d} fill="none" stroke="var(--ai-series-1)" strokeWidth={1.5} strokeDasharray="3 2" />
                  ) : (
                    <path d={d} fill={i === lastComplete || isActive ? 'var(--ai-accent-fill)' : 'var(--ai-series-quiet)'} opacity={active !== null && !isActive ? 0.55 : 1} />
                  )}
                  {/* the whole column is the touch target */}
                  <rect x={x - gap / 2} y={0} width={barW + gap} height={height} fill="transparent"
                    onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} />
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

/** Change against a named period: a tinted chip with the arrow and the share, then the words. */
export function Delta({ now, before, label, upIsGood = true }: { now: number; before: number; label: string; upIsGood?: boolean }) {
  if (before <= 0) return null;
  const change = (now - before) / before;
  const flat = Math.abs(change) < 0.005;
  const up = change > 0;
  const good = flat ? null : up === upIsGood;
  const color = good === null ? 'var(--ai-ink3)' : good ? 'var(--ai-good)' : 'var(--ai-warn)';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-3">
      <span className="ai-mono inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11.5px] font-medium"
        style={{ color: good === null ? 'var(--ai-ink2)' : good ? 'var(--ai-text-good)' : 'var(--ai-text-warn)', background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
        <span aria-hidden>{flat ? '■' : up ? '▲' : '▼'}</span>{flat ? 'level' : `${Math.round(Math.abs(change) * 100)}%`}
      </span>
      <span>{flat ? 'with' : up ? 'up on' : 'down on'} {label}</span>
    </span>
  );
}
