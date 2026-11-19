'use client';

import { EmptyChart, useWidth } from './shared';

export type RankedRow = { label: string; detail?: string; value: number; shown: string; share?: string };

/**
 * Ranked horizontal bars: one row per item, largest first, bars on a shared
 * baseline so close values can be compared exactly. The value is printed at the
 * end of every row; in narrow space the label and value sit above the bar.
 */
export function RankedBars({ rows, color = 'var(--ai-series-1)', onPick }: {
  rows: RankedRow[];
  color?: string;
  /** makes each row a button (a question about that item) */
  onPick?: (label: string) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  if (rows.length === 0) return <EmptyChart>No data to chart.</EmptyChart>;
  const max = Math.max(...rows.map((r) => r.value), 0);
  const narrow = width > 0 && width < 480;

  return (
    <div ref={ref}>
      <ul className="m-0 list-none p-0">
        {rows.map((row, i) => {
          const body = (
            <>
              <div className="min-w-0">
                <div className="truncate text-[13px] text-ink-1" title={row.label}>{row.label}</div>
                {row.detail ? <div className="truncate text-[11.5px] text-ink-3">{row.detail}</div> : null}
              </div>
              {narrow ? <div className="ai-num text-right text-[13px] font-bold text-ink-1">{row.shown}</div> : null}
              <div className={narrow ? 'col-span-2 mt-1' : ''}>
                <div className="h-4 min-w-[2px] rounded-r-[4px]" style={{ width: `${max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 0.8 : 0) : 0}%`, background: color }} />
              </div>
              {narrow ? null : (
                <div className="ai-num min-w-[4.5rem] text-right text-[13px] font-bold text-ink-1">
                  {row.shown}
                  {row.share ? <span className="ml-1.5 font-normal text-ink-3">{row.share}</span> : null}
                </div>
              )}
            </>
          );
          const cls = 'grid w-full items-center gap-x-3 rounded-md px-1.5 py-[5px] text-left';
          const style = { gridTemplateColumns: narrow ? 'minmax(0,1fr) auto' : 'minmax(110px, 30%) minmax(0,1fr) auto' };
          return (
            <li key={`${row.label}-${i}`}>
              {onPick ? (
                <button type="button" className={`${cls} ai-tap transition-colors hover:bg-surface-2`} style={style} onClick={() => onPick(row.label)}>{body}</button>
              ) : (
                <div className={cls} style={style}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
