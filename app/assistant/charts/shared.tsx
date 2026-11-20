'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Tone } from '../../lib/assistantVisual';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Width of a box, tracked as it resizes and known before the first paint, so a
 * phone never sees the wide layout flash by. Charts are drawn to the pixel,
 * never stretched.
 */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Colour follows a series' position, never its rank. An eighth series folds into "other". */
export const seriesColor = (i: number) => (i < 7 ? `var(--ai-series-${i + 1})` : 'var(--ai-series-other)');

const TONE: Record<Tone, string> = {
  good: 'var(--ai-good)', info: 'var(--ai-info)', warn: 'var(--ai-warn)', bad: 'var(--ai-bad)', muted: 'var(--ai-muted)',
};
export const toneColor = (tone: Tone) => TONE[tone];

export type TipRow = { color?: string; label: string; value: string };
export type Tip = { x: number; y: number; title: string; rows: TipRow[]; footer?: string };

/**
 * The hover readout. Values lead and labels follow. Content is rendered as text
 * nodes, so labels that come from the data can never inject markup, and the box
 * is kept inside its chart.
 */
export function FloatingTip({ tip, containerWidth }: { tip: Tip | null; containerWidth: number }) {
  if (!tip) return null;
  const width = Math.min(230, Math.max(140, containerWidth - 8));
  const flip = tip.x + 14 + width > containerWidth - 4;
  const left = flip ? Math.max(4, tip.x - width - 14) : Math.max(4, Math.min(tip.x + 14, containerWidth - width - 4));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 rounded-[12px] border border-line-strong bg-[color:var(--ai-s2)]/90 px-3 py-2 text-[12px] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ left, top: Math.max(0, tip.y), width }}
    >
      <div className="ai-eyebrow mb-1.5 truncate">{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 py-[1px]">
          {r.color ? <span className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: r.color }} /> : null}
          <span className="ai-mono font-medium text-ink-1">{r.value}</span>
          <span className="truncate text-ink-3">{r.label}</span>
        </div>
      ))}
      {tip.footer ? <div className="mt-1 border-t border-line pt-1 text-ink-3">{tip.footer}</div> : null}
    </div>
  );
}

/** Legend for two or more series (one series is named by the chart's title). */
export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  if (items.length < 2) return null;
  return (
    <ul className="mb-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12px] text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** "Nice" upper bound and tick list for a zero-based axis. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

export function EmptyChart({ children }: { children: ReactNode }) {
  return <div className="flex h-28 items-center justify-center text-sm text-ink-3">{children}</div>;
}
