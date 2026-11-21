'use client';

import { useInView } from '../ui';
import { EmptyChart } from './shared';

export type RankedRow = { label: string; detail?: string; value: number; shown: string; share?: string;
  /** its place in the full ranking, when rows in between were left out */
  rank?: number; focus?: boolean };

/**
 * A ranking: one row per item, largest first. Each row carries its rank, a faint bar
 * behind it in proportion to its value (all on one baseline, so close values compare
 * exactly), and the value right-aligned in the mono face. The leader alone is lit in
 * the accent; the rest stay quiet, so the eye lands on the top.
 */
export function RankedBars({ rows, color = 'var(--ai-accent-fill)', onPick }: {
  rows: RankedRow[];
  color?: string;
  /** makes each row a button (a question about that item) */
  onPick?: (label: string) => void;
}) {
  const [box, seen] = useInView<HTMLUListElement>({ threshold: 0.3 });
  if (rows.length === 0) return <EmptyChart>No data to chart.</EmptyChart>;
  const max = Math.max(...rows.map((r) => r.value), 0);

  return (
    <ul ref={box} className="m-0 flex list-none flex-col gap-0.5 p-0">
      {rows.map((row, i) => {
        const pct = max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 1.5 : 0) : 0;
        // the one asked about is lit; without one, the leader
        const lead = rows.some((r) => r.focus) ? !!row.focus : i === 0;
        const rank = row.rank ?? i + 1;
        const gap = i > 0 && rows[i - 1].rank !== undefined && rank - (rows[i - 1].rank ?? 0) > 1;
        const body = (
          <>
            <span className="flex w-full min-w-0 items-baseline gap-3">
              <span className={`ai-mono w-6 shrink-0 text-[11px] ${lead && row.focus ? 'text-accent' : 'text-ink-3'}`}>{String(rank).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-1" title={row.label}>
                {row.label}{row.detail ? <span className="ml-2 hidden text-[11.5px] text-ink-3 @sm:inline">{row.detail}</span> : null}
                {row.detail ? <span className="block truncate text-[11.5px] text-ink-3 @sm:hidden">{row.detail}</span> : null}
              </span>
              <span className="ai-mono shrink-0 text-[13px] font-medium text-ink-1">{row.shown}</span>
              {row.share ? <span className="ai-mono w-9 shrink-0 text-right text-[11px] text-ink-3">{row.share}</span> : null}
            </span>
            {/* the bar: a capsule on a shared track, the leader lit */}
            <span aria-hidden className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full bg-[var(--ai-track)] pl-0">
              <span className="block h-full rounded-full" style={{
                width: `${seen ? pct : 0}%`,
                transition: `width 900ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms`,
                background: lead ? `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})` : 'color-mix(in srgb, var(--ai-ink3) 60%, transparent)',
                boxShadow: lead ? `0 0 10px -1px color-mix(in srgb, ${color} 60%, transparent)` : undefined,
              }} />
            </span>
          </>
        );
        const cls = 'block w-full min-w-0 rounded-[9px] px-2 py-2 text-left';
        return (
          <li key={`${row.label}-${i}`} className={gap ? 'mt-2 border-t border-dashed border-line pt-1.5' : undefined}>
            {onPick ? (
              <button type="button" className={`${cls} ai-tap transition-colors hover:bg-surface-2 active:bg-surface-2`} onClick={() => onPick(row.label)}>{body}</button>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
