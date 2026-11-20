'use client';

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Tone } from '../lib/assistantVisual';
import { toneColor, useWidth } from './charts/shared';

/*
 * The instrument kit: the few marks every part of the assistant is drawn with, so the
 * home and the answers read as one console. Numbers sit in the mono face, status is a
 * lit dot with a word next to it (never colour alone), and anything that fills (a
 * gauge, a meter, a chart) fills when the reader scrolls to it, not on page load
 * where most of it is below the fold.
 */

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether an element is on screen. Things that move do so when the reader gets to
 * them. `once` keeps it true after the first sight; without it, it turns false again
 * once the element has left the screen completely, so it plays again on the way back.
 * Everyone gets the reveal; with reduced motion the CSS plays a calm version of it.
 */
export function useInView<T extends Element>({ once = true, threshold = 0.35, rootMargin = '0px' }: { once?: boolean; threshold?: number; rootMargin?: string } = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        // a tall element may never be 35% on screen: being on screen at all counts then
        const tall = e.boundingClientRect.height > (e.rootBounds?.height ?? Infinity) * 0.8;
        if (e.isIntersecting && (e.intersectionRatio >= threshold || (tall && e.intersectionRatio > 0))) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once && !e.isIntersecting) {
          setInView(false);
        }
      }
    }, { threshold: [0, 0.05, threshold], rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);
  return [ref, inView];
}

/* ---------------- status ---------------- */

/** A lit status dot. `pulse` sends out a ring, for things that are live right now. */
export function Led({ tone, pulse = false, blink = false, size = 8 }: { tone: Tone | 'live'; pulse?: boolean; blink?: boolean; size?: number }) {
  const color = tone === 'live' ? 'var(--ai-live)' : toneColor(tone);
  const lit = tone !== 'muted';
  // motion is kept for what deserves an eye: `pulse` for the one live signal on screen,
  // `blink` (slow) for something that is down
  return (
    <span aria-hidden className={pulse ? 'ai-live' : `inline-block shrink-0 rounded-full ${blink ? 'ai-blink-soft' : ''}`}
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
  const [box, seen] = useInView<HTMLElement>({ threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  return (
    <section ref={box} className={`@container ai-card ai-reveal relative min-w-0 overflow-hidden ${seen ? 'is-in' : ''} ${className}`}>
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
  const [box, seen] = useInView<HTMLSpanElement>({ threshold: 0.6 });
  const [shown, setShown] = useState(0);
  const from = useRef(shown);
  // a figure that changes while on screen (the home refreshes every two minutes)
  // glows briefly, so a change is seen without anything else moving
  const prev = useRef(value);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    const raf = requestAnimationFrame(() => setFlash((k) => k + 1));
    return () => cancelAnimationFrame(raf);
  }, [value]);
  useEffect(() => {
    if (!seen) return;
    const instant = !Number.isFinite(value);
    const start = performance.now();
    const a = from.current;
    // small numbers count slower so each step is seen; big ones take a little longer to arrive
    const digits = String(Math.round(Math.abs(value))).length;
    const dur = Math.min(1500, Math.max(700, Math.abs(value) <= 12 ? Math.abs(value - a) * 110 : 600 + digits * 130));
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
  }, [value, seen]);
  // integers count in whole steps; money and the like keep their own rounding
  const v = Number.isInteger(value) ? Math.round(shown) : shown;
  return <span ref={box} key={flash} className={`${className ?? ''} ${flash ? 'ai-flash' : ''}`} aria-label={format(value)}>{format(v)}</span>;
}

/* ---------------- gauges and meters ---------------- */

/** Load (CPU, memory) is fine low and bad high; reach (share of checks answered) the other way round. */
export const loadTone = (pct: number): Tone => (pct >= 85 ? 'bad' : pct >= 65 ? 'warn' : 'good');
export const reachTone = (pct: number): Tone => (pct >= 98 ? 'good' : pct >= 90 ? 'warn' : 'bad');

/** What a reading means: `load` is bad when high, `reach` is bad when low, `plain` has no good or bad. */
export type Scale = 'load' | 'reach' | 'plain';

/**
 * The colour of a point on a scale, blended between the status colours so a gauge
 * runs green into amber into red the way a tachometer does, instead of jumping.
 * `f` is 0..1 along the scale.
 */
export function scaleColor(f: number, scale: Scale, plain = 'var(--ai-accent-fill)'): string {
  if (scale === 'plain') return plain;
  const x = scale === 'reach' ? 1 - f : f;
  const mix = (a: string, b: string, t: number) => `color-mix(in oklab, ${b} ${Math.round(Math.max(0, Math.min(1, t)) * 100)}%, ${a})`;
  if (scale === 'reach') {
    // reach lives near the top: 98 and up is green, below 90 is red
    const pct = (1 - x) * 100;
    if (pct >= 98) return 'var(--ai-good)';
    if (pct >= 90) return mix('var(--ai-warn)', 'var(--ai-good)', (pct - 90) / 8);
    if (pct >= 75) return mix('var(--ai-bad)', 'var(--ai-warn)', (pct - 75) / 15);
    return 'var(--ai-bad)';
  }
  if (x <= 0.5) return 'var(--ai-good)';
  if (x <= 0.72) return mix('var(--ai-good)', 'var(--ai-warn)', (x - 0.5) / 0.22);
  if (x <= 0.88) return mix('var(--ai-warn)', 'var(--ai-bad)', (x - 0.72) / 0.16);
  return 'var(--ai-bad)';
}

/**
 * How far a gauge or meter has drawn, adapted to its reading so the arrival is
 * always seen. A high reading goes straight to its mark. A low one (a router at 3%
 * CPU would move its needle a few degrees and be done before the eye finds it) does
 * a warm-up sweep first, the way an instrument cluster does when the engine starts:
 * up the scale, then back down to settle on the reading. Only on arrival: a refresh
 * while it is on screen glides straight to the new value. With reduced motion the
 * sweep is skipped and the reading is simply drawn in.
 *
 * `peak` is how far the sweep went, so ticks and cells can switch off from the top.
 */
function useSweep(v: number, active: boolean, max = 100): { drawn: number; peak: number } {
  const [state, setState] = useState({ drawn: 0, peak: 0 });
  const arrived = useRef(false);
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    if (!active) {
      arrived.current = false;
      raf = requestAnimationFrame(() => setState({ drawn: 0, peak: 0 }));
      return () => cancelAnimationFrame(raf);
    }
    const first = !arrived.current;
    arrived.current = true;
    if (first && v < max * 0.55 && !reduceMotion()) {
      const peak = Math.min(max, Math.max(v + max * 0.4, max * 0.62));
      // the settle is timed from the frame that draws the peak, never from now: on a busy
      // phone that frame can come late, and the peak must not land after the settle
      raf = requestAnimationFrame(() => {
        setState({ drawn: peak, peak });
        timer = window.setTimeout(() => setState({ drawn: v, peak }), 1000);
      });
    } else {
      raf = requestAnimationFrame(() => setState({ drawn: v, peak: v }));
    }
    return () => { cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, [v, active, max]);
  return state;
}

const STATE_WORD: Record<Scale, (v: number) => string> = {
  load: (v) => (v >= 85 ? 'high' : v >= 65 ? 'busy' : 'fine'),
  reach: (v) => (v >= 98 ? 'steady' : v >= 90 ? 'shaky' : 'poor'),
  plain: () => '',
};

/**
 * A dial, drawn like the tachometer of an instrument cluster: a 270° scale of tick
 * marks with a major tick every quarter, the ticks lighting up one after another to
 * the reading and running green into amber into red, a red line painted on the end
 * of the scale, and a needle that swings out and settles on the value with a little
 * overshoot. The reading sits in the opening at the bottom, with a word for what it
 * means under the label. It is the one mark on the page allowed to show off.
 */
export function Dial({ value, label, scale = 'load', size = 112, word }: { value: number; label: string; scale?: Scale; size?: number; word?: string }) {
  const v = Math.max(0, Math.min(100, value));
  // the dial is the one mark that plays again each time it scrolls back into view
  const [box, seen] = useInView<HTMLDivElement>({ once: false, threshold: 0.6 });
  const { drawn, peak } = useSweep(v, seen);
  const id = useId().replace(/:/g, '');
  const c = size / 2;
  const R = size / 2 - 3;
  const N = 40;
  const START = 135;
  const SWEEP = 270;
  const at = (f: number) => START + f * SWEEP;
  const pt = (r: number, deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const arcPath = (r: number, f0: number, f1: number) => {
    const [x0, y0] = pt(r, at(f0));
    const [x1, y1] = pt(r, at(f1));
    return `M${x0},${y0}A${r},${r} 0 ${(f1 - f0) * SWEEP > 180 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const color = scaleColor(v / 100, scale);
  const lit = drawn / 100;
  const small = size < 100;
  // the stretch of scale that means trouble, painted on the inside of the ticks
  const red: [number, number] | null = scale === 'load' ? [0.85, 1] : scale === 'reach' ? [0, 0.9] : null;
  const inner = R - (small ? 12 : 15);
  const shownWord = word ?? STATE_WORD[scale](v);
  // a reading in the red gets one small shake once it has settled, to draw the eye
  const danger = (scale === 'load' && v >= 85) || (scale === 'reach' && v < 90);
  const peakTick = Math.round((peak / 100) * N);
  // after a warm-up sweep the reading pulses once as the needle lands, so the eye goes to it
  const landed = seen && peak > v && Math.abs(drawn - v) < 0.01;

  return (
    <div ref={box} className="flex min-w-0 flex-col items-center">
      <svg width={size} height={size * 0.9} viewBox={`0 0 ${size} ${size * 0.9}`} role="img" aria-label={`${label} ${Math.round(v)}%${shownWord ? `, ${shownWord}` : ''}`} className="overflow-visible">
        <defs>
          <radialGradient id={`glass${id}`} cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="var(--ai-ink1)" stopOpacity={0.07} />
            <stop offset="70%" stopColor="var(--ai-ink1)" stopOpacity={0.015} />
            <stop offset="100%" stopColor="var(--ai-ink1)" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`halo${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* the face: a faint glass disc with a light from above */}
        <circle cx={c} cy={c} r={inner - 2} fill={`url(#glass${id})`} />
        <circle cx={c} cy={c} r={inner - 2} fill="none" stroke="var(--ai-line)" />

        {/* the red line on the inside of the scale */}
        {red ? <path d={arcPath(inner + 3, red[0], red[1])} fill="none" stroke="var(--ai-bad)" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" /> : null}
        {/* the reading as a thin lit arc under the ticks */}
        <path className="ai-fill" d={arcPath(inner + 3, 0, 1)} pathLength={100} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
          strokeDasharray={`${lit > 0.005 ? lit * 100 : 0} 200`} opacity={lit > 0.005 ? 1 : 0} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />

        {/* the scale: each tick lights in turn up to the reading */}
        {Array.from({ length: N + 1 }, (_, i) => {
          const f = i / N;
          const major = i % (N / 4) === 0;
          const [x1, y1] = pt(R - (major ? (small ? 9 : 11) : small ? 5 : 7), at(f));
          const [x2, y2] = pt(R, at(f));
          const on = drawn > 0 && f <= lit + 1e-6;
          const tip = on && f + 1 / N > lit;
          const off = red && f >= red[0] && f <= red[1] ? 'color-mix(in srgb, var(--ai-bad) 32%, var(--ai-track))' : 'var(--ai-track)';
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" strokeWidth={major ? 2.4 : 1.7}
              stroke={on ? scaleColor(f, scale) : off}
              className="ai-tick"
              style={{
                // up the scale one after another; when the sweep falls back, off from the top down
                transitionDelay: on ? `${i * 16}ms` : `${Math.max(0, peakTick - i) * 14}ms`,
                filter: tip ? `drop-shadow(0 0 4px ${scaleColor(f, scale)})` : undefined,
              }} />
          );
        })}

        {/* the needle: swings out from zero and settles, with a glow at its tip */}
        <circle cx={c} cy={c} r={inner * 0.55} fill={`url(#halo${id})`} />
        <g className="ai-needle" style={{ transform: `rotate(${at(lit)}deg)`, transformOrigin: `${c}px ${c}px` }}>
          <g className={seen && danger ? 'ai-quiver' : undefined} style={{ transformOrigin: `${c}px ${c}px` }}>
          <line x1={c - inner * 0.16} y1={c} x2={c + inner - 4} y2={c} stroke={color} strokeWidth={small ? 1.8 : 2.2} strokeLinecap="round" />
          <circle cx={c + inner - 4} cy={c} r={small ? 1.8 : 2.2} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        </g>
        </g>
        <circle cx={c} cy={c} r={small ? 4 : 5} fill="var(--ai-s1)" stroke={color} strokeWidth={1.6} />
        <circle cx={c} cy={c} r={1.6} fill={color} />

        {/* the reading, in the opening at the bottom */}
        <text x={c} y={c + inner * 0.78} textAnchor="middle" className={`ai-mono ${landed ? 'ai-pop' : ''}`} fontSize={size * 0.17} fontWeight={600} fill="var(--ai-ink1)">
          {Math.round(v)}<tspan fontSize={size * 0.095} fill="var(--ai-ink3)" dx={1}>%</tspan>
        </text>
      </svg>
      <span className="ai-eyebrow -mt-1 whitespace-nowrap">
        {label}{shownWord ? <span style={{ color }}> · {shownWord}</span> : null}
      </span>
    </div>
  );
}

/** The earlier ring gauge's name, kept for callers that still use it. */
export const ArcGauge = ({ value, label, size }: { value: number; label: string; tone?: Tone; size?: number }) => <Dial value={value} label={label} size={size} />;

/**
 * An LED bar, the way an audio or link meter shows a level: a row of cells that
 * light one after another up to the reading, each in the colour of its place on the
 * scale (or one colour), the last lit cell glowing. A cell that is only partly
 * reached is lit partly.
 */
export function Cells({ value, max = 100, count = 24, scale = 'plain', color = 'var(--ai-accent-fill)', height = 12, label }: {
  value: number;
  max?: number;
  count?: number;
  scale?: Scale;
  /** the colour of every lit cell when `scale` is plain */
  color?: string;
  height?: number;
  label?: string;
}) {
  const f = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [box, seen] = useInView<HTMLDivElement>({ threshold: 0.6 });
  const { drawn, peak } = useSweep(f, seen, 1);
  const level = drawn * count;
  const peakCell = Math.round(peak * count);
  const reading = scale === 'plain' ? color : scaleColor(f, scale, color);
  return (
    <div ref={box} className="flex w-full items-end gap-[2px]" style={{ height }} role={label ? 'img' : undefined} aria-label={label}>
      {Array.from({ length: count }, (_, i) => {
        const part = Math.max(0, Math.min(1, level - i));
        // cells rise a little towards the top of the scale, like a level meter
        const h = Math.round(height * (0.55 + 0.45 * ((i + 1) / count)));
        const cell = scale === 'plain' ? color : scale === 'reach' ? reading : scaleColor((i + 0.5) / count, scale, color);
        const tip = part > 0 && level - i < 1.0001;
        return (
          <span key={i} className="relative block min-w-0 flex-1 overflow-hidden rounded-[2px] bg-[var(--ai-track)]" style={{ height: h }}>
            <span className="ai-cell absolute inset-0 rounded-[2px]"
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${cell} 100%, white 18%), ${cell})`,
                opacity: part > 0 ? 0.35 + 0.65 * part : 0,
                transitionDelay: part > 0 ? `${i * 22}ms` : `${Math.max(0, peakCell - i) * 20}ms`,
                boxShadow: tip ? `0 0 8px ${cell}` : undefined,
              }} />
          </span>
        );
      })}
    </div>
  );
}

/**
 * A battery, for paid time: a case with a terminal, cells inside that fill with
 * the charge left, coloured by how it stands. Nearly empty, the last cell blinks.
 */
export function Battery({ value, max, tone, cells = 5, width = 76, height = 32, label }: { value: number; max: number; tone: Tone; cells?: number; width?: number; height?: number; label?: string }) {
  const f = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const [box, seen] = useInView<SVGSVGElement>({ threshold: 0.6 });
  const { drawn } = useSweep(f, seen, 1);
  const color = toneColor(tone);
  const pad = 3.5;
  const body = width - 6;
  const gap = 2;
  const cw = (body - pad * 2 - gap * (cells - 1)) / cells;
  const ch = height - pad * 2;
  const level = drawn * cells;
  const low = f > 0 && f < 0.2;
  return (
    <svg ref={box} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? `${Math.round(f * 100)}%`}>
      <rect x={0.75} y={0.75} width={body - 1.5} height={height - 1.5} rx={7} fill="color-mix(in srgb, var(--ai-ink1) 3%, transparent)" stroke="var(--ai-line2)" strokeWidth={1.5} />
      <rect x={body + 0.5} y={height * 0.32} width={4} height={height * 0.36} rx={1.5} fill="var(--ai-line2)" />
      {Array.from({ length: cells }, (_, i) => {
        // any charge left shows as at least a sliver of the first cell, so nearly
        // empty never looks the same as empty
        const part = i === 0 && f > 0 && drawn > 0 ? Math.max(0.28, Math.min(1, level)) : Math.max(0, Math.min(1, level - i));
        const x = pad + i * (cw + gap);
        return (
          <g key={i}>
            <rect x={x} y={pad} width={cw} height={ch} rx={3} fill="var(--ai-track)" />
            {part > 0 ? (
              <rect x={x} y={pad} width={cw * part} height={ch} rx={3} fill={color}
                className={low && i === 0 ? 'ai-blink-soft' : undefined}
                style={{ filter: level - i < 1.0001 ? `drop-shadow(0 0 4px ${color})` : undefined, transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: `${i * 90}ms` }} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** A capsule meter: a track and a fill, for one share of a whole. */
export function Meter({ value, max = 100, color, tone, height = 6, label }: { value: number; max?: number; color?: string; tone?: Tone; height?: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [box, seen] = useInView<HTMLDivElement>({ threshold: 0.6 });
  const { drawn } = useSweep(pct, seen);
  const fill = color ?? toneColor(tone ?? 'good');
  return (
    <div ref={box} className="w-full overflow-hidden rounded-full bg-[var(--ai-track)]" style={{ height }} role={label ? 'img' : undefined} aria-label={label}>
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
  const [box, seen] = useInView<HTMLDivElement>({ threshold: 0.5 });
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
    <div ref={box}>
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
            <path d={area} fill={`url(#g${id})`} className={seen ? 'ai-fade' : 'opacity-0'} />
            {/* the line draws itself in, left to right, when it comes into view */}
            <path d={solid} pathLength={1} className={seen ? 'ai-draw' : 'ai-draw-wait'} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {partialFrom !== null ? (
              <path d={monotonePath(pts.slice(partialFrom))} fill="none" stroke={color} strokeWidth={1.75} strokeDasharray="3 3" strokeLinecap="round" className={seen ? 'ai-dot-in' : 'opacity-0'} />
            ) : null}
            {active !== null && at ? <line x1={at[0]} x2={at[0]} y1={0} y2={height} stroke="var(--ai-line2)" strokeDasharray="2 3" /> : null}
            {at ? (
              <g className={seen ? 'ai-dot-in' : 'opacity-0'}>
                <circle cx={at[0]} cy={at[1]} r={6} fill={color} opacity={0.18} />
                <circle cx={at[0]} cy={at[1]} r={3} fill={color} stroke="var(--ai-s1)" strokeWidth={1.5} />
              </g>
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
/**
 * A label over a figure, the unit of every readout grid. In a narrow panel (a phone)
 * it becomes a row, the label on the left and the figure on the right, so a figure
 * like "KES 168,400" is never broken across lines; with room, the label sits over it.
 * Put readouts in a <ReadoutGrid>.
 */
export function Readout({ label, children, sub, onClick }: { label: ReactNode; children: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="min-w-0 @sm:block">
        <span className="ai-eyebrow block truncate">{label}</span>
        {sub ? <span className="mt-0.5 block truncate text-[12px] text-ink-3 @sm:hidden">{sub}</span> : null}
      </span>
      <span className="ai-mono shrink-0 whitespace-nowrap text-[16px] font-medium leading-tight text-ink-1 @sm:mt-1.5 @sm:block @sm:text-[18px]">{children}</span>
      {sub ? <span className="mt-1 hidden truncate text-[12px] text-ink-3 @sm:block">{sub}</span> : null}
    </>
  );
  const cls = 'flex min-w-0 items-center justify-between gap-3 py-2.5 text-left @sm:block @sm:py-0';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} group rounded-[10px] transition-colors hover:[&_.ai-mono]:text-accent active:[&_.ai-mono]:text-accent`}>{body}</button>
  ) : <div className={cls}>{body}</div>;
}

/** Readouts side by side when the panel has room, a divided list when it does not. */
export function ReadoutGrid({ cols, children }: { cols: 2 | 3; children: ReactNode }) {
  return (
    <div className={`mt-4 grid grid-cols-1 divide-y divide-line border-t border-line @sm:mt-4 @sm:gap-3 @sm:divide-y-0 @sm:pt-4 ${cols === 3 ? '@sm:grid-cols-3' : '@sm:grid-cols-2'}`}>
      {children}
    </div>
  );
}
