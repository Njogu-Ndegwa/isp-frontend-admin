'use client';

import { useState } from 'react';
import { EmptyChart } from './shared';

export type Seg = { label: string; value: number; shown: string; color: string };

/**
 * One whole split into a few parts: a single bar, each part its own block with a
 * 2px gap, and a legend that names the parts and gives the amounts and shares.
 * Used instead of a donut, which is harder to read accurately. `slim` is the
 * small version that sits above a table or inside a home card.
 */
export function SegmentsBar({ segments, slim = false, onPick }: { segments: Seg[]; slim?: boolean; onPick?: (label: string) => void }) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return slim ? null : <EmptyChart>Nothing to show.</EmptyChart>;
  const share = (v: number) => (v / total) * 100;
  const shareText = (v: number) => (share(v) >= 10 ? `${Math.round(share(v))}%` : `${share(v).toFixed(1)}%`);

  return (
    <div className="@container">
      <div className={`flex w-full gap-[2px] ${slim ? 'h-2.5' : 'h-6'}`} role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.shown}, ${shareText(s.value)}`).join('; ')}>
        {segments.map((s, i) => (s.value > 0 ? (
          <div key={s.label} className={`h-full min-w-[3px] transition-opacity ${slim ? 'first:rounded-l-full last:rounded-r-full' : 'rounded-[4px]'}`}
            style={{ flexGrow: s.value, flexBasis: 0, background: s.color, opacity: active !== null && active !== i ? 0.45 : 1 }}
            onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} />
        ) : null))}
      </div>
      <ul className={`m-0 grid list-none grid-cols-1 gap-x-6 p-0 @md:grid-cols-2 ${slim ? 'mt-2 gap-y-0.5' : 'mt-3 gap-y-1'}`}>
        {segments.map((s, i) => {
          const row = (
            <>
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[3px]" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-2" title={s.label}>{s.label}</span>
              <span className="ai-num font-bold text-ink-1">{s.shown}</span>
              <span className="ai-num w-11 text-right text-ink-3">{shareText(s.value)}</span>
            </>
          );
          const cls = `flex w-full items-baseline gap-2 rounded-md px-1 text-left ${slim ? 'text-[12.5px]' : 'text-[13px]'}`;
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
