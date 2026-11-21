'use client';

import { useId, useState } from 'react';
import { compactNumber } from '../../lib/assistantVisual';
import { ArrowRightIcon } from '../icons';
import { useInView } from '../ui';
import { EmptyChart, FloatingTip, niceTicks, useWidth, type Tip } from './shared';

export type ColumnSeries = { key: string; label: string; color: string };
export type ColumnPoint = { label: string; title: string; values: number[]; partial?: boolean };
/** A line over the columns: the previous period, or a total that the columns do not stack to. */
export type ColumnLine = { key: string; label: string; color: string; values: (number | null)[]; dashed?: boolean };

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
 * there is room. A period that is still filling in is drawn as an outline. Parts of
 * one whole (download and upload, M-Pesa and paybill) stack into one column whose top
 * is the total; a line over the columns compares them with another period.
 */
export function ColumnChart({ points, series, format, height: tall = 240, onPick, stacked = false, lines = [], pickHint, valueLabels = true }: {
  points: ColumnPoint[];
  series: ColumnSeries[];
  /** a value as shown in the tooltip */
  format: (v: number, seriesIndex: number) => string;
  height?: number;
  /** makes a period a question: a tap selects it and offers "More on <period>" */
  onPick?: (index: number) => void;
  /** the series are parts of one whole: one column per period, the parts on top of each other */
  stacked?: boolean;
  lines?: ColumnLine[];
  /** print each column's figure on it, while there is room */
  valueLabels?: boolean;
  /** the words under the chart that say a tap is a question */
  pickHint?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  // a phone gets a shorter plot: the same bars, less scrolling past them
  const height = width > 0 && width < 420 ? Math.min(tall, 180) : tall;
  const [box, seen] = useInView<HTMLDivElement>({ threshold: 0.4 });
  if (points.length === 0 || series.length === 0) return <EmptyChart>No data to chart.</EmptyChart>;

  const stack = stacked && series.length > 1;
  const sumOf = (p: ColumnPoint) => p.values.reduce((a, v) => a + Math.max(0, v ?? 0), 0);
  const max = Math.max(0, ...points.flatMap((p) => (stack ? [sumOf(p)] : p.values)), ...lines.flatMap((l) => l.values.map((v) => v ?? 0)));
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
  const single = series.length === 1 || stack;
  const showValues = valueLabels && single && points.length <= 16 && step >= 34;
  const headline = (p: ColumnPoint) => (stack ? sumOf(p) : p.values[0] ?? 0);

  const tip: Tip | null = active === null || width === 0 ? null : {
    x: m.left + active * step + step / 2,
    y: 4,
    title: points[active].title + (points[active].partial ? ' (so far)' : ''),
    rows: [
      ...series.map((s, k) => ({ color: s.color, label: s.label, value: format(points[active].values[k] ?? 0, k) })),
      ...lines.filter((l) => l.values[active] !== null && l.values[active] !== undefined).map((l) => ({ color: l.color, label: l.label, value: format(l.values[active] ?? 0, 0) })),
    ],
    footer: stack ? `Total ${format(sumOf(points[active]), 0)}` : undefined,
  };

  return (
    <div ref={box}>
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
            {picked !== null && picked !== active ? <rect x={picked * step + 1} y={0} width={Math.max(0, step - 2)} height={plotH} rx={6} fill="var(--ai-accent-soft)" /> : null}
            {active !== null ? <rect x={active * step + 1} y={0} width={Math.max(0, step - 2)} height={plotH} rx={6} fill="var(--ai-track)" /> : null}
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x1={0} x2={plotW} stroke={t === 0 ? 'var(--ai-axis)' : 'var(--ai-grid)'} strokeWidth={1} strokeDasharray={t === 0 ? undefined : '2 4'} />
                <text x={-8} dy="0.32em" textAnchor="end" className="ai-mono" fill="var(--ai-ink3)" fontSize={11}>{compactNumber(t)}</text>
              </g>
            ))}

            {stack ? points.map((p, i) => {
              const w = Math.max(2, Math.min(24, band));
              const x = i * step + (step - w) / 2;
              const dim = active !== null && active !== i ? 0.45 : 1;
              const grow = { transform: seen ? 'none' : 'scaleY(0)', transformBox: 'fill-box' as const, transformOrigin: '50% 100%', transition: `transform 760ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 24) * 32}ms` };
              const topIndex = p.values.reduce((t, v, k) => ((v ?? 0) > 0 ? k : t), -1);
              let base = 0;
              const total = sumOf(p);
              return (
                <g key={i} opacity={dim} style={grow}>
                  {series.map((s, k) => {
                    const v = Math.max(0, p.values[k] ?? 0);
                    if (v <= 0) return null;
                    const y0 = y(base);
                    base += v;
                    const y1 = y(base);
                    const h = Math.max(1, y0 - y1);
                    // only the top part gets the rounded end; a 1px gap keeps the parts apart
                    const d = k === topIndex ? columnPath(x, y1, w, h) : `M${x},${y1 + h}V${y1 + 1}H${x + w}V${y1 + h}Z`;
                    return p.partial
                      ? <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="3 2" />
                      : <path key={s.key} d={d} fill={s.color} fillOpacity={0.9} />;
                  })}
                  {showValues && total > 0 ? (
                    <text x={i * step + step / 2} y={y(total) - 6} textAnchor="middle" fill="var(--ai-ink2)" fontSize={11} className="ai-mono">{compactNumber(total)}</text>
                  ) : null}
                </g>
              );
            }) : points.map((p, i) => {
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
                    const grow = { transform: seen ? 'none' : 'scaleY(0)', transformBox: 'fill-box' as const, transformOrigin: '50% 100%', transition: `transform 760ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 24) * 32}ms` };
                    return p.partial
                      ? <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="3 2" style={grow} />
                      : <path key={s.key} d={d} fill={`url(#c${gid}-${k})`} style={grow} />;
                  })}
                  {showValues && headline(p) > 0 ? (
                    <text x={i * step + step / 2} y={y(headline(p)) - 6} textAnchor="middle" fill="var(--ai-ink2)" fontSize={11} className="ai-mono">
                      {compactNumber(headline(p))}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* a comparison over the columns: a line through each period's centre, broken where it has no value */}
            {lines.map((l) => {
              const pts = l.values.map((v, i) => (v === null || v === undefined ? null : [i * step + step / 2, y(v)] as const));
              const d = pts.reduce((acc, pt, i) => (pt ? `${acc}${i > 0 && pts[i - 1] ? 'L' : 'M'}${pt[0]},${pt[1]}` : acc), '');
              return (
                <g key={l.key} pointerEvents="none" opacity={seen ? 1 : 0} style={{ transition: 'opacity 600ms ease 400ms' }}>
                  <path d={d} fill="none" stroke={l.color} strokeWidth={1.75} strokeDasharray={l.dashed ? '4 3' : undefined} strokeLinejoin="round" />
                  {pts.map((pt, i) => (pt ? <circle key={i} cx={pt[0]} cy={pt[1]} r={2.25} fill="var(--ai-s1)" stroke={l.color} strokeWidth={1.5} /> : null))}
                </g>
              );
            })}

            {points.map((p, i) => (i % labelEvery === 0 ? (
              <text key={i} x={i * step + step / 2} y={plotH + 17} textAnchor="middle" fill={active === i ? 'var(--ai-ink1)' : 'var(--ai-ink3)'} fontSize={11}>{p.label}</text>
            ) : null))}

            {/* the hit target is the whole band, not just the painted bar */}
            {points.map((_, i) => (
              <rect key={i} x={i * step} y={-m.top} width={step} height={plotH + m.top} fill="transparent" className={onPick ? 'cursor-pointer' : undefined}
                onPointerEnter={() => setActive(i)} onPointerDown={() => { setActive(i); setPicked(i); }} onPointerMove={() => setActive(i)} />
            ))}
          </g>
        </svg>
      ) : null}
      <FloatingTip tip={tip} containerWidth={width} />
    </div>
    {onPick && picked !== null && points[picked] ? (
      <div className="ai-rise mt-2 flex items-center gap-2">
        <button type="button" className="ai-chip group !py-1.5 text-[12.5px] font-medium" onClick={() => onPick(picked)}>
          More on {points[picked].title}
          <ArrowRightIcon width={12} height={12} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
        </button>
        <button type="button" className="ai-tap text-[12px] text-ink-3 hover:text-ink-1" onClick={() => setPicked(null)}>Clear</button>
      </div>
    ) : onPick ? <p className="mt-2 text-[12px] text-ink-3">{pickHint ?? 'Tap a column for more on that day.'}</p> : null}
    </div>
  );
}
