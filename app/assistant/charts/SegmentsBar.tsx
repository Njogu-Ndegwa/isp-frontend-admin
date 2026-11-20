'use client';

import { useState } from 'react';
import { EmptyChart } from './shared';

export type Seg = { label: string; value: number; shown: string; color: string };

/**
 * One whole split into a few parts, drawn like a battery: a capsule of blocks with
 * hairline gaps, each lit in its colour, and a legend of chips that name the parts
 * with their amounts and shares. Used instead of a donut, which is harder to read
 * accurately. `slim` is the small version that sits above a table or in a home card.
 */
export function SegmentsBar({ segments, slim = false, onPick }: { segments: Seg[]; slim?: boolean; onPick?: (label: string) => void }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return slim ? null : <EmptyChart>Nothing to show.</EmptyChart>;
  const share = (v: number) => (v / total) * 100;
  const shareText = (v: number) => (share(v) >= 10 ? `${Math.round(share(v))}%` : `${share(v).toFixed(1)}%`);

  return (
    <div className="@container">
      <div className={`flex w-full gap-[3px] rounded-full bg-[var(--ai-track)] p-[3px] ${slim ? 'h-3.5' : 'h-5'}`} role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.shown}, ${shareText(s.value)}`).join('; ')}>
        {segments.map((s, i) => (s.value > 0 ? (
          <div key={s.label} className="h-full min-w-[4px] rounded-full transition-opacity first:rounded-l-full last:rounded-r-full"
            style={{
              flexGrow: s.value, flexBasis: 0,
              background: `linear-gradient(180deg, color-mix(in srgb, ${s.color} 100%, white 12%), ${s.color})`,
              boxShadow: `0 0 10px -2px color-mix(in srgb, ${s.color} 55%, transparent)`,
              opacity: active !== null && active !== i ? 0.35 : 1,
            }}
            onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} />
        ) : null))}
      </div>
      <ul className={`m-0 grid list-none grid-cols-1 gap-x-4 p-0 @md:grid-cols-2 ${slim ? 'mt-2.5 gap-y-0.5' : 'mt-3 gap-y-1'}`}>
        {segments.map((s, i) => {
          const row = (
            <>
              <span aria-hidden className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-2" title={s.label}>{s.label}</span>
              <span className="ai-mono font-medium text-ink-1">{s.shown}</span>
              <span className="ai-mono w-11 text-right text-[11.5px] text-ink-3">{shareText(s.value)}</span>
            </>
          );
          const cls = `flex w-full items-center gap-2 rounded-[8px] px-1.5 py-1 text-left ${slim ? 'text-[12.5px]' : 'text-[13px]'}`;
          return (
            <li key={s.label} style={{ opacity: active !== null && active !== i ? 0.5 : 1 }}
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
              {onPick ? <button type="button" className={`${cls} ai-tap hover:bg-surface-2`} onClick={() => onPick(s.label)}>{row}</button> : <div className={cls}>{row}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
