'use client';

import { useId, useState } from 'react';
import { compactNumber } from '../../lib/assistantVisual';
import { EmptyChart, FloatingTip, niceTicks, useWidth, type Tip } from './shared';

export type ColumnSeries = { key: string; label: string; color: string };
export type ColumnPoint = { label: string; title: string; values: number[]; partial?: boolean };

/** A column with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Vertical columns over time, one series or a few side by side. Marks stay thin
 * (never wider than 24px), the grid is a quiet hairline, x labels are thinned so
 * neighbours never collide, and values are printed on the columns only while
 * there is room. A period that is still filling in is drawn as an outline.
 */
export function ColumnChart({ points, series, format, height = 240 }: {
  points: ColumnPoint[];
  series: ColumnSeries[];
  /** a value as shown in the tooltip */
  format: (v: number, seriesIndex: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  if (points.length === 0 || series.length === 0) return <EmptyChart>No data to chart.</EmptyChart>;

  const max = Math.max(0, ...points.flatMap((p) => p.values));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const leftPad = Math.max(30, Math.max(...ticks.map((t) => compactNumber(t).length)) * 7 + 12);
  const m = { top: 18, right: 6, bottom: 26, left: leftPad };
  const plotW = Math.max(0, width - m.left - m.right);
  const plotH = height - m.top - m.bottom;
  const step = points.length ? plotW / points.length : 0;
  const band = step * 0.72;
  const y = (v: number) => plotH - (top > 0 ? (v / top) * plotH : 0);

  // thin the x labels so neighbours never collide
  const longest = Math.max(...points.map((p) => p.label.length));
  const labelEvery = Math.max(1, Math.ceil((longest * 6.6 + 14) / Math.max(step, 1)));
  const single = series.length === 1;
  const showValues = single && points.length <= 16 && step >= 34;

  const tip: Tip | null = active === null || width === 0 ? null : {
    x: m.left + active * step + step / 2,
    y: 4,
    title: points[active].title + (points[active].partial ? ' (so far)' : ''),
    rows: series.map((s, k) => ({ color: s.color, label: s.label, value: format(points[active].values[k] ?? 0, k) })),
  };

  return (
    <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setActive(null)}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Column chart. The table view has the exact values.">
          {/* each series fades from its colour at the data end towards the baseline */}
          <defs>
            {series.map((s, k) => (
              <linearGradient key={s.key} id={`c${gid}-${k}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.35} />
              </linearGradient>
            ))}
          </defs>
          <g transform={`translate(${m.left},${m.top})`}>
            {active !== null ? <rect x={active * step + 1} y={0} width={Math.max(0, step - 2)} height={plotH} rx={6} fill="var(--ai-track)" /> : null}
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={0} x2={plotW} stroke={t === 0 ? 'var(--ai-axis)' : 'var(--ai-grid)'} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={-8} dy="0.32em" textAnchor="end" className="ai-mono" fill="var(--ai-ink3)" fontSize={10.5}>{compactNumber(t)}</text>
              </g>
            ))}

            {points.map((p, i) => {
              const bx = i * step + (step - band) / 2;
              const n = series.length;
              const w = Math.max(2, Math.min(24, (band - (n - 1) * 2) / n));
              const groupW = n * w + (n - 1) * 2;
              const gx = bx + (band - groupW) / 2;
              const dim = active !== null && active !== i ? 0.45 : 1;
              return (
                <g key={i} opacity={dim}>
                  {series.map((s, k) => {
                    const v = p.values[k] ?? 0;
                    const h = v > 0 ? Math.max(1, plotH - y(v)) : 0;
                    const d = columnPath(gx + k * (w + 2), plotH - h, w, h);
                    return p.partial
                      ? <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="3 2" />
                      : <path key={s.key} d={d} fill={`url(#c${gid}-${k})`} />;
                  })}
                  {showValues && (p.values[0] ?? 0) > 0 ? (
                    <text x={i * step + step / 2} y={y(p.values[0]) - 6} textAnchor="middle" fill="var(--ai-ink2)" fontSize={10.5} className="ai-mono">
                      {compactNumber(p.values[0])}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {points.map((p, i) => (i % labelEvery === 0 ? (
              <text key={i} x={i * step + step / 2} y={plotH + 17} textAnchor="middle" fill={active === i ? 'var(--ai-ink1)' : 'var(--ai-ink3)'} fontSize={11}>{p.label}</text>
            ) : null))}

            {/* the hit target is the whole band, not just the painted bar */}
            {points.map((_, i) => (
              <rect key={i} x={i * step} y={-m.top} width={step} height={plotH + m.top} fill="transparent"
                onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} onPointerMove={() => setActive(i)} />
            ))}
          </g>
        </svg>
      ) : null}
      <FloatingTip tip={tip} containerWidth={width} />
    </div>
  );
}
