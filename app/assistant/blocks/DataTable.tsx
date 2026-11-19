'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatCell, isBlank, num, type Column } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { SortIcon } from '../icons';

/*
 * A table that fits the space it is given, at any width, and never makes the reader
 * scroll sideways (the fit / fold / cards table from the make-responsive work):
 *
 *  - everything fits: a plain table;
 *  - it does not (most tables, even on a desktop): the descriptive text columns fold
 *    into a quieter second line under each row's name, and the figures keep their
 *    own columns;
 *  - still too narrow (a phone, or a figure-heavy table): each row becomes a card,
 *    its name and leading figure on one line, the descriptive fields under it, the
 *    other figures as label/value pairs, and a "Sort by" menu replaces the headers.
 *
 * The choice follows the width of the table's own box, not the screen's. An estimate
 * can be wrong (bigger text settings, long words), so after drawing the real table
 * is measured and, if it is wider than its box, the layout steps down once more.
 * Empty values are left out of the folded line and the cards rather than shown as dashes.
 */

type Sort = { key: string; dir: 'asc' | 'desc' } | null;
type Layout = 'table' | 'folded' | 'cards';

const PAGE = 10;
/** average width of a character at 13px, and a cell's horizontal padding */
const CHAR_PX = 7.3;
const CELL_PAD = 26;
/** a text column wider than this is truncated in table view (the full text is in its title) */
const MAX_TEXT_PX = 260;
/** below this the table becomes cards whatever the columns */
const CARDS_BELOW = 540;
/** the name column keeps at least this much room once other columns fold into it */
const NAME_MIN_PX = 200;

const isFigure = (c: Column) => c.kind !== 'text' && c.kind !== 'bool';
const alignRight = (c: Column) => c.kind === 'number' || c.kind === 'money' || c.kind === 'percent';
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function DataTable({ columns, rows, total, currency, onPick }: {
  columns: Column[];
  rows: Row[];
  /** all matching rows, when only the first few were loaded */
  total?: number;
  currency?: string | null;
  /** makes each row's name a question about that row */
  onPick?: (row: Row) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [width, setWidth] = useState(0);
  const [sort, setSort] = useState<Sort>(null);
  const [expanded, setExpanded] = useState(false);
  // layouts that turned out too wide once drawn, per measured width
  const [tooWide, setTooWide] = useState<{ width: number; step: number }>({ width: 0, step: 0 });

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

  const shown = (row: Row, c: Column) => formatCell(row[c.key], c.kind, currency);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (isBlank(x) && isBlank(y)) return 0;
      if (isBlank(x)) return 1; // blanks last, whichever way the column is sorted
      if (isBlank(y)) return -1;
      const nx = num(x);
      const ny = num(y);
      if (nx !== null && ny !== null) return (nx - ny) * dir;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
    });
  }, [rows, sort]);

  // the width each column would like: its longest value among the first rows, or its header
  const natural = useMemo(() => {
    const sample = rows.slice(0, 40);
    return columns.map((c) => {
      const header = (c.label.length <= 12 ? c.label.length : Math.max(...c.label.split(/\s+/).map((w) => w.length), Math.ceil(c.label.length / 2))) + 2;
      const longest = Math.max(header, ...sample.map((r) => formatCell(r[c.key], c.kind, currency).length));
      const px = longest * CHAR_PX + CELL_PAD;
      return isFigure(c) ? px : Math.min(MAX_TEXT_PX, px);
    });
  }, [columns, rows, currency]);

  const layout = useMemo((): { kind: Layout; folded: number[] } => {
    const textCols = columns.map((_, i) => i).filter((i) => i > 0 && !isFigure(columns[i]));
    if (!width) return { kind: 'table', folded: [] };
    const step = tooWide.width === width ? tooWide.step : 0;
    const cards = { kind: 'cards' as Layout, folded: textCols };
    if (step >= 2) return cards;
    const sum = natural.reduce((a, b) => a + b, 0);
    if (sum <= width && step === 0) return { kind: 'table', folded: [] };
    if (width >= CARDS_BELOW && textCols.length) {
      // fold descriptive columns from the right until the rest fits beside a roomy name column
      const folded: number[] = [];
      for (const i of [...textCols].reverse()) {
        folded.push(i);
        const kept = natural.reduce((a, b, j) => (j === 0 || folded.includes(j) ? a : a + b), 0);
        if (kept + Math.max(natural[0], NAME_MIN_PX) <= width) {
          if (step === 1 && folded.length === textCols.length) return cards;
          // one step down from an estimate that proved too wide: fold everything
          return { kind: 'folded', folded: (step === 1 ? textCols : folded).slice().sort((a, b) => a - b) };
        }
      }
    }
    return cards;
  }, [columns, natural, width, tooWide]);

  // measure after drawing: an estimate can be wrong, the drawn table cannot
  useIsoLayoutEffect(() => {
    const box = ref.current;
    const table = tableRef.current;
    if (!box || !table || layout.kind === 'cards' || !width) return;
    if (table.scrollWidth > box.clientWidth + 1) {
      setTooWide((cur) => (cur.width === width ? { width, step: Math.min(2, cur.step + 1) } : { width, step: 1 }));
    }
  }, [layout, width, rows, columns]);

  if (rows.length === 0) return <p className="text-[13.5px] text-ink-3">Nothing found.</p>;
  if (columns.length === 0) return null;

  const visible = expanded ? sorted : sorted.slice(0, PAGE);
  const name = columns[0];
  const toggle = (key: string) => setSort((cur) => (cur?.key !== key ? { key, dir: 'desc' } : cur.dir === 'desc' ? { key, dir: 'asc' } : null));
  const foldedLine = (row: Row) => layout.folded.map((i) => columns[i]).filter((c) => !isBlank(row[c.key])).map((c) => shown(row, c)).join(' · ');

  const sortControl = layout.kind !== 'table' && rows.length > 1 ? (
    <div className="mb-2 flex flex-wrap items-center justify-end gap-2 text-[12.5px] text-ink-3">
      <label className="flex items-center gap-1.5">
        Sort by
        <select className="ai-tap rounded-md border border-line bg-surface-2 px-2 py-1 text-[13px] text-ink-1"
          value={sort?.key ?? ''} onChange={(e) => setSort(e.target.value ? { key: e.target.value, dir: sort?.dir ?? 'desc' } : null)}>
          <option value="">As listed</option>
          {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      {sort ? (
        <button type="button" className="ai-btn ai-btn-quiet" onClick={() => setSort({ key: sort.key, dir: sort.dir === 'desc' ? 'asc' : 'desc' })}>
          <SortIcon dir={sort.dir} />
          <span className="text-[12.5px]">{sort.dir === 'desc' ? 'High to low' : 'Low to high'}</span>
        </button>
      ) : null}
    </div>
  ) : null;

  let body: React.ReactNode;
  if (layout.kind === 'cards') {
    const figures = columns.filter((c, i) => i > 0 && isFigure(c));
    // The figure beside each card's name: the one sorted by, else a short one, so the
    // name is never cut to make room for it.
    const short = (c: Column) => visible.every((row) => shown(row, c).length <= 14);
    const leadCol = (sort ? figures.find((c) => c.key === sort.key) : undefined)
      ?? figures.find((c) => c.kind === 'money' && short(c))
      ?? figures.find((c) => c.kind !== 'date' && c.kind !== 'datetime' && short(c));
    body = (
      <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[10px] border border-line p-0">
        {visible.map((row, r) => {
          const line = foldedLine(row);
          const pairs = figures.filter((c) => c !== leadCol && !isBlank(row[c.key]));
          const content = (
            <>
              <span className="flex items-baseline gap-3">
                <span className={`min-w-0 flex-1 truncate text-[14px] font-bold ${onPick ? 'text-accent' : 'text-ink-1'}`}>{isBlank(row[name.key]) ? '–' : shown(row, name)}</span>
                {leadCol && !isBlank(row[leadCol.key]) ? (
                  <span className="flex max-w-[60%] shrink-0 items-baseline justify-end gap-1 text-[12.5px] text-ink-3">
                    <span className="min-w-0 truncate">{leadCol.label}</span>
                    <b className="ai-num shrink-0 text-[13.5px] text-ink-1">{shown(row, leadCol)}</b>
                  </span>
                ) : null}
              </span>
              {line ? <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{line}</span> : null}
              {pairs.length ? (
                <span className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 @md:grid-cols-3">
                  {pairs.map((c) => (
                    <span key={c.key} className="min-w-0">
                      <span className="block truncate text-[11.5px] text-ink-3">{c.label}</span>
                      <span className="ai-num block truncate text-[13px] text-ink-1">{shown(row, c)}</span>
                    </span>
                  ))}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={r}>
              {onPick ? (
                <button type="button" className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-2" onClick={() => onPick(row)}>{content}</button>
              ) : (
                <div className="px-3 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  } else {
    const folded = layout.kind === 'folded';
    const cols = columns.filter((_, i) => !layout.folded.includes(i));
    body = (
      <div className="overflow-hidden rounded-[10px] border border-line">
        <table ref={tableRef} className="w-full border-collapse text-[13px]">
          <thead className="bg-surface-2 text-ink-2">
            <tr>
              {cols.map((c, i) => (
                <th key={c.key} scope="col"
                  className={`px-3 py-2 align-bottom font-bold leading-tight ${alignRight(c) ? 'text-right' : 'text-left'} ${folded && i === 0 ? 'w-full max-w-0' : ''}`}
                  aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => toggle(c.key)} className={`ai-tap inline-flex items-center gap-1 hover:text-ink-1 ${alignRight(c) ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    {c.label}
                    <SortIcon dir={sort?.key === c.key ? sort.dir : null} />
                  </button>
                  {folded && i === 0 ? <span className="block truncate text-[11.5px] font-normal text-ink-3">{layout.folded.map((j) => columns[j].label).join(' · ')}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, r) => (
              <tr key={r} className="border-t border-line hover:bg-surface-2/60">
                {cols.map((c, i) => {
                  const text = shown(row, c);
                  const line = folded && i === 0 ? foldedLine(row) : '';
                  return (
                    <td key={c.key} title={!isFigure(c) && text.length > 24 ? text : undefined}
                      className={`px-3 py-1.5 align-top ${alignRight(c) ? 'ai-num whitespace-nowrap text-right text-ink-1' : isFigure(c) ? 'whitespace-nowrap text-ink-2' : 'text-ink-2'} ${folded && i === 0 ? 'w-full max-w-0' : isFigure(c) ? '' : 'max-w-[16rem]'}`}>
                      {i === 0 && onPick ? (
                        <button type="button" className="ai-tap block max-w-full truncate text-left font-bold text-accent underline-offset-2 hover:underline" onClick={() => onPick(row)}>{text}</button>
                      ) : (
                        <span className={`block truncate ${i === 0 ? 'text-ink-1' : ''}`}>{text}</span>
                      )}
                      {line ? <span className="block truncate text-[12px] text-ink-3">{line}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const all = total ?? rows.length;
  return (
    <div ref={ref} className="@container min-w-0">
      {sortControl}
      {body}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
        <span>
          Showing {visible.length.toLocaleString('en-US')} of {all.toLocaleString('en-US')}
          {all > rows.length ? ` (${rows.length.toLocaleString('en-US')} loaded)` : ''}
        </span>
        {rows.length > PAGE ? (
          <button type="button" className="ai-tap font-bold text-accent hover:underline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show fewer' : `Show all ${rows.length.toLocaleString('en-US')}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
