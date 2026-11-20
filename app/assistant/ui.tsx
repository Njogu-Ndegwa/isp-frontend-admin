'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Tone } from '../lib/assistantVisual';
import { toneColor, useWidth } from './charts/shared';

/*
 * The instrument kit: the few marks every part of the assistant is drawn with, so the
 * home and the answers read as one console. Numbers sit in the mono face, status is a
 * lit dot with a word next to it (never colour alone), and anything that fills (a
 * gauge, a meter) fills once when it first appears.
 */

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- status ---------------- */

/** A lit status dot. `pulse` sends out a ring, for things that are live right now. */
export function Led({ tone, pulse = false, size = 8 }: { tone: Tone | 'live'; pulse?: boolean; size?: number }) {
  const color = tone === 'live' ? 'var(--ai-live)' : toneColor(tone);
  const lit = tone !== 'muted';
  return (
    <span aria-hidden className={pulse ? 'ai-live' : 'inline-block shrink-0 rounded-full'}
      style={{ width: size, height: size, background: color, boxShadow: lit ? `0 0 0 3px color-mix(in srgb, ${color} 16%, transparent), 0 0 10px color-mix(in srgb, ${color} 45%, transparent)` : undefined }} />
  );
}

const PILL: Record<Tone, string> = {
  good: 'bg-good/12 text-[var(--ai-text-good)]',
  warn: 'bg-warn/15 text-[var(--ai-text-warn)]',
  bad: 'bg-bad/12 text-[var(--ai-text-bad)]',
  info: 'bg-accent-soft text-accent',
  muted: 'bg-surface-3 text-ink-2',
};

/** A status in words, with its dot. */
export function Pill({ tone, dot = true, children }: { tone: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`ai-pill ${PILL[tone]}`}>
      {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor(tone) }} /> : null}
      {children}
    </span>
  );
}

/** Four bars rising in turn: the assistant is working. */
export const Signal = () => <span className="ai-signal" aria-hidden><i /><i /><i /><i /></span>;

/* ---------------- panel ---------------- */

/**
 * The frame every block sits in: a small instrument label over a title, actions on
 * the right, and the content. `eyebrow` names what kind of thing this is.
 */
export function Panel({ eyebrow, icon, title, note, actions, children, className = '', flush = false, tone }: {
  eyebrow?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** no padding around the content (a list that runs edge to edge) */
  flush?: boolean;
  /** a coloured top edge: trouble, or something waiting for a decision */
  tone?: Tone;
}) {
  return (
    <section className={`@container ai-card relative min-w-0 overflow-hidden ${className}`}>
      {tone ? <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${toneColor(tone)}, transparent 85%)` }} /> : null}
      {eyebrow || title || actions ? (
        <header className={`flex flex-wrap items-start gap-x-3 gap-y-2 ${flush ? 'px-4 pt-4 sm:px-5' : 'px-4 pt-4 sm:px-5 sm:pt-5'}`}>
          <div className="min-w-0 flex-1 basis-[180px]">
            {eyebrow ? <p className="ai-eyebrow flex items-center gap-1.5">{icon}{eyebrow}</p> : null}
            {title ? <h3 className={`ai-display text-[15.5px] font-semibold leading-snug text-ink-1 ${eyebrow ? 'mt-1.5' : ''}`}>{title}</h3> : null}
            {note ? <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{note}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? 'pt-3' : 'px-4 pb-4 pt-3 sm:px-5 sm:pb-5'}>{children}</div>
    </section>
  );
}

/* ---------------- numbers ---------------- */

/**
 * A figure that counts up to its value the first time it is shown (and glides to a
 * new value after that), then stays still. The final text is always the exact value.
 */
export function CountUp({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const [shown, setShown] = useState(() => (reduceMotion() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    const instant = reduceMotion() || !Number.isFinite(value);
    const start = performance.now();
    const a = from.current;
    const dur = 750;
    let raf = 0;
    const tick = (now: number) => {
      const p = instant ? 1 : Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      const v = p >= 1 ? value : a + (value - a) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  // integers count in whole steps; money and the like keep their own rounding
  const v = Number.isInteger(value) ? Math.round(shown) : shown;
  return <span className={className} aria-label={format(value)}>{format(v)}</span>;
}

/* ---------------- gauges and meters ---------------- */

/** Load (CPU, memory) is fine low and bad high; reach (share of checks answered) the other way round. */
export const loadTone = (pct: number): Tone => (pct >= 85 ? 'bad' : pct >= 65 ? 'warn' : 'good');
export const reachTone = (pct: number): Tone => (pct >= 98 ? 'good' : pct >= 90 ? 'warn' : 'bad');

/**
 * A 270° arc gauge, the way system monitors draw CPU and memory: a quiet track, a
 * coloured arc that fills on first sight, and the value in the middle.
 */
export function ArcGauge({ value, label, tone, size = 76, stroke = 6 }: { value: number; label: string; tone?: Tone; size?: number; stroke?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = useState(() => (reduceMotion() ? v : 0));
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(v));
    return () => cancelAnimationFrame(raf);
  }, [v]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const color = toneColor(tone ?? loadTone(v));
  return (
    <div className="flex min-w-0 flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${Math.round(v)}%`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ai-track)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
          <circle className="ai-fill" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${(drawn / 100) * arc} ${c}`} style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${color} 45%, transparent))` }} />
        </g>
        <text x="50%" y="50%" dy="0.1em" textAnchor="middle" dominantBaseline="middle" className="ai-mono" fontSize={size * 0.22} fontWeight={600} fill="var(--ai-ink1)">
          {Math.round(v)}<tspan fontSize={size * 0.13} fill="var(--ai-ink3)">%</tspan>
        </text>
      </svg>
      <span className="ai-eyebrow -mt-2.5">{label}</span>
    </div>
  );
}

/** A capsule meter: a track and a fill, for one share of a whole. */
export function Meter({ value, max = 100, color, tone, height = 6, label }: { value: number; max?: number; color?: string; tone?: Tone; height?: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [drawn, setDrawn] = useState(() => (reduceMotion() ? pct : 0));
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  const fill = color ?? toneColor(tone ?? 'good');
  return (
    <div className="w-full overflow-hidden rounded-full bg-[var(--ai-track)]" style={{ height }} role={label ? 'img' : undefined} aria-label={label}>
      <div className="ai-fill h-full rounded-full" style={{ width: `${drawn > 0 ? Math.max(drawn, 2) : 0}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 70%, transparent), ${fill})` }} />
    </div>
  );
}

/* ---------------- sparkline ---------------- */

export type SparkPoint = { label: string; value: number; partial?: boolean };

/** A smooth line through the points that never overshoots them (monotone cubic). */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/**
 * An area sparkline: the trend as a soft filled line with the newest point lit. A
 * period still filling in is drawn dashed. With `readout`, a label and value line
 * above it follows the pointer, so no figure is locked inside the picture.
 */
export function AreaSpark({ points, height = 64, color = 'var(--ai-accent-fill)', format = (v: number) => v.toLocaleString('en-US'), readout = false, empty }: {
  points: SparkPoint[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  readout?: boolean;
  empty?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const id = useId().replace(/:/g, '');
  if (points.length === 0 || points.every((p) => p.value === 0)) {
    return <p className="text-[12.5px] leading-snug text-ink-3">{empty ?? 'Nothing in this period.'}</p>;
  }
  const max = Math.max(1, ...points.map((p) => p.value));
  const pad = 4;
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i / (points.length - 1)) * Math.max(0, width - pad * 2));
  const y = (v: number) => pad + (1 - v / max) * (height - pad * 2);
  const pts: [number, number][] = points.map((p, i) => [x(i), y(p.value)]);
  const partialFrom = points.length > 1 && points[points.length - 1].partial ? points.length - 2 : null;
  const solid = monotonePath(partialFrom === null ? pts : pts.slice(0, partialFrom + 1));
  const area = `${monotonePath(pts)}L${pts[pts.length - 1][0]},${height}L${pts[0][0]},${height}Z`;
  const lastComplete = points.reduce((last, p, i) => (p.partial ? last : i), -1);
  const shown = active ?? (points[points.length - 1]?.partial ? points.length - 1 : lastComplete);
  const at = shown >= 0 ? pts[shown] : null;

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el || points.length === 0) return;
    const left = el.getBoundingClientRect().left;
    const i = Math.round(((clientX - left - pad) / Math.max(1, width - pad * 2)) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div>
      {readout ? (
        <div className="mb-1.5 flex h-4 items-baseline justify-between gap-2 text-[11.5px] text-ink-3">
          <span className="truncate">{shown >= 0 ? points[shown].label : ''}</span>
          <span className="ai-mono shrink-0 font-medium text-ink-2">
            {shown >= 0 ? format(points[shown].value) : ''}{shown >= 0 && points[shown].partial ? ' so far' : ''}
          </span>
        </div>
      ) : null}
      <div ref={ref} style={{ height }} className="touch-pan-y" onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setActive(null)}>
        {width > 0 ? (
          <svg width={width} height={height} role="img" aria-label={points.map((p) => `${p.label}: ${format(p.value)}`).join(', ')} className="overflow-visible">
            <defs>
              <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#g${id})`} />
            <path d={solid} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {partialFrom !== null ? (
              <path d={monotonePath(pts.slice(partialFrom))} fill="none" stroke={color} strokeWidth={1.75} strokeDasharray="3 3" strokeLinecap="round" opacity={0.8} />
            ) : null}
            {active !== null && at ? <line x1={at[0]} x2={at[0]} y1={0} y2={height} stroke="var(--ai-line2)" strokeDasharray="2 3" /> : null}
            {at ? (
              <>
                <circle cx={at[0]} cy={at[1]} r={6} fill={color} opacity={0.18} />
                <circle cx={at[0]} cy={at[1]} r={3} fill={color} stroke="var(--ai-s1)" strokeWidth={1.5} />
              </>
            ) : null}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- traffic ---------------- */

/** Download and upload, as a network monitor shows them: an arrow in the signal colour and the rate. */
export function Throughput({ down, up, size = 'md' }: { down: string | null; up: string | null; size?: 'sm' | 'md' }) {
  if (!down && !up) return null;
  const text = size === 'sm' ? 'text-[12px]' : 'text-[13.5px]';
  return (
    <span className={`ai-mono inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 ${text} text-ink-1`}>
      {down ? <span className="inline-flex items-center gap-1"><span aria-hidden className="text-[var(--ai-down)]">↓</span>{down}</span> : null}
      {up ? <span className="inline-flex items-center gap-1"><span aria-hidden className="text-[var(--ai-up)]">↑</span>{up}</span> : null}
    </span>
  );
}

/** A label over a figure, the unit of every readout grid. */
export function Readout({ label, children, sub, onClick }: { label: ReactNode; children: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="ai-eyebrow block truncate">{label}</span>
      <span className="ai-mono mt-1.5 block text-[15px] font-medium leading-tight text-ink-1 [overflow-wrap:anywhere] sm:text-[18px]">{children}</span>
      {sub ? <span className="mt-1 block truncate text-[12px] text-ink-3">{sub}</span> : null}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="group min-w-0 rounded-[10px] text-left transition-colors hover:[&_.ai-mono]:text-accent">{body}</button>
  ) : <div className="min-w-0">{body}</div>;
}
