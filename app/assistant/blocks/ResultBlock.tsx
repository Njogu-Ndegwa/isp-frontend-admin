'use client';

import { useMemo, useState } from 'react';
import type { ShowFields } from '../../lib/assistant';
import { cardTitle, formatCell, num, shortDate, toCsv, visualFor, type ChartModel, type Column, type TileItem, type Visual } from '../../lib/assistantVisual';
import { entityOf } from '../../lib/assistantEntities';
import { formatValue, humanizeKey, type Row } from '../../lib/assistantView';
import { ColumnChart } from '../charts/ColumnChart';
import { RankedBars } from '../charts/RankedBars';
import { SegmentsBar } from '../charts/SegmentsBar';
import { Legend, seriesColor, toneColor } from '../charts/shared';
import { ChartIcon, DownloadIcon, TableIcon } from '../icons';
import { CountUp, Panel } from '../ui';
import { CodeBox } from '../Markdown';
import { CustomerBlock, PaymentBlock, PlanBlock, RouterBlock, VoucherBlock } from './BillingBlocks';
import { DataTable } from './DataTable';

function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'data'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/*
 * How many readouts sit side by side, from the width the row has (container
 * queries), so none is ever left alone on a row: two in narrow space, three in
 * medium, all of them when wide. Six make two rows of three.
 */
const TILE_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 @md:grid-cols-3',
  4: 'grid-cols-2 @2xl:grid-cols-4',
  5: 'grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-5',
  6: 'grid-cols-2 @lg:grid-cols-3',
  7: 'grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-4',
  8: 'grid-cols-2 @2xl:grid-cols-4',
};

/**
 * Headline figures as one strip of readouts, divided by hairlines like the panel of
 * an instrument: a small label over each figure. The number is the chart.
 */
function Tiles({ title, items, rest, currency }: { title: string; items: TileItem[]; rest: [string, unknown][]; currency?: string | null }) {
  return (
    <section className="@container ai-card overflow-hidden">
      {title ? <p className="ai-eyebrow px-4 pt-3.5 sm:px-5">{title}</p> : null}
      {/* every cell draws its top and left hairline and is pulled over its neighbour's by 1px, so the strip has inner lines only */}
      <div className={`-mb-px -mr-px grid ${TILE_COLUMNS[items.length] ?? 'grid-cols-2 @lg:grid-cols-3'} ${title ? 'mt-1' : '-mt-px'}`}>
        {items.map((item) => {
          const shown = formatCell(item.value, item.kind, currency);
          // a long figure steps down a size rather than spilling out of its cell
          const size = shown.length > 12 ? 'text-[18px] @md:text-[21px]' : shown.length > 8 ? 'text-[21px] @md:text-[25px]' : 'text-[27px]';
          return (
            <div key={item.key} className="-ml-px min-w-0 border-l border-t border-line px-4 py-3.5 sm:px-5">
              <div className="truncate text-[12px] leading-tight text-ink-3">{item.label}</div>
              <CountUp value={item.value} format={(v) => formatCell(v, item.kind, currency)}
                className={`ai-mono mt-1.5 block break-words font-medium leading-tight tracking-tight text-ink-1 ${size}`} />
            </div>
          );
        })}
      </div>
      {rest.length ? (
        <p className="flex flex-wrap gap-x-4 gap-y-0.5 border-t border-line px-4 py-2.5 text-[12px] text-ink-3 sm:px-5">
          {rest.map(([k, v]) => <span key={k}>{humanizeKey(k.replace(/\./g, ' '))}: <span className="ai-mono text-ink-2">{formatValue(v)}</span></span>)}
        </p>
      ) : null}
    </section>
  );
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A chart with its title, an always-available table view, and a CSV download. */
function ChartCard({ title, visual, currency, onAsk }: {
  title: string;
  visual: Extract<Visual, { kind: 'trend' | 'bars' | 'share' }>;
  currency?: string | null;
  onAsk?: (q: string) => void;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const chart: ChartModel | undefined = visual.chart;
  const series = useMemo(() => (chart?.series ?? []).map((s, i) => ({ ...s, color: seriesColor(i) })), [chart]);
  const tableColumns: Column[] = useMemo(() => {
    if (!chart) return [];
    const first = chart.columns.find((c) => c.key === chart.labelKey);
    const others = chart.columns.filter((c) => c.key !== chart.labelKey);
    // the figures drawn come first, then whatever else the rows carry
    const drawn = others.filter((c) => chart.series.some((s) => s.key === c.key));
    return [...(first ? [first] : []), ...drawn, ...others.filter((c) => !drawn.includes(c))].slice(0, 7);
  }, [chart]);

  let picture: React.ReactNode = null;
  let subtitle = '';
  if (visual.kind === 'trend' && chart) {
    const today = todayKey();
    const points = chart.rows.map((row, i) => ({
      label: shortDate(row[chart.labelKey]),
      title: formatCell(row[chart.labelKey], chart.labelKind),
      values: chart.series.map((s) => num(row[s.key]) ?? 0),
      partial: row.partial === true || (i === chart.rows.length - 1 && String(row[chart.labelKey] ?? '').slice(0, 10) === today),
    }));
    subtitle = `${chart.series.map((s) => s.label).join(', ')} by ${humanizeKey(chart.labelKey).toLowerCase()}`;
    picture = (
      <>
        <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
        <ColumnChart points={points} series={series} format={(v, k) => formatCell(v, chart.series[k]?.kind ?? 'number', currency)} />
        {points[points.length - 1]?.partial ? <p className="mt-2 text-[12px] text-ink-3">The last period is still filling in.</p> : null}
      </>
    );
  } else if (visual.kind === 'bars' && chart) {
    const s = chart.series[0];
    const total = chart.rows.reduce((a, r) => a + (num(r[s.key]) ?? 0), 0);
    subtitle = `${s.label} by ${humanizeKey(chart.labelKey).toLowerCase()}`;
    picture = (
      <>
        <RankedBars
          rows={chart.rows.map((row) => {
            const v = num(row[s.key]) ?? 0;
            const others = chart.series.slice(1).map((o) => `${o.label} ${formatCell(row[o.key], o.kind, currency)}`).join(' · ');
            return {
              label: formatCell(row[chart.labelKey], chart.labelKind),
              detail: others || undefined,
              value: v,
              shown: formatCell(v, s.kind, currency),
              share: s.kind !== 'percent' && total > 0 && chart.rows.length > 1 ? `${Math.round((v / total) * 100)}%` : undefined,
            };
          })}
        />
        {chart.folded ? <p className="mt-2 text-[12px] text-ink-3">The top {chart.rows.length} are drawn. {chart.folded} more are in the table view.</p> : null}
      </>
    );
  } else if (visual.kind === 'share') {
    subtitle = 'Share of the whole';
    picture = (
      <SegmentsBar segments={visual.segments.map((seg, i) => ({
        label: seg.label, value: seg.value, shown: formatCell(seg.value, visual.valueKind, currency), color: seg.tone ? toneColor(seg.tone) : seriesColor(i),
      }))} />
    );
  }

  const canTable = !!chart && tableColumns.length > 0;
  void onAsk;
  const eyebrow = visual.kind === 'trend' ? 'Trend' : visual.kind === 'bars' ? 'Ranking' : 'Share';
  const seg = 'ai-btn ai-btn-quiet !rounded-full !px-2.5 !py-1.5';
  return (
    <Panel eyebrow={eyebrow} icon={<ChartIcon width={11} height={11} />} title={title} note={subtitle || undefined}
      actions={canTable ? (
          <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-line p-0.5" role="group" aria-label="View">
            <button type="button" className={seg} aria-pressed={view === 'chart'} onClick={() => setView('chart')} title="Chart">
              <ChartIcon /><span className="sr-only">Chart</span>
            </button>
            <button type="button" className={seg} aria-pressed={view === 'table'} onClick={() => setView('table')} title="Table of the same data">
              <TableIcon /><span className="sr-only">Table</span>
            </button>
            <button type="button" className={seg} title="Download as CSV" onClick={() => downloadCsv(title, toCsv(chart.columns, chart.rows))}>
              <DownloadIcon /><span className="sr-only">Download CSV</span>
            </button>
          </div>
        ) : null}>
      {view === 'chart' || !chart ? picture : <DataTable columns={tableColumns} rows={chart.rows} currency={currency} />}
    </Panel>
  );
}

const NAME_KEYS = new Set(['name', 'customer_name', 'full_name', 'router_name', 'plan_name', 'organization_name', 'identity', 'title']);

function TableCard({ title, visual, currency, onAsk }: {
  title: string;
  visual: Extract<Visual, { kind: 'table' }>;
  currency?: string | null;
  onAsk?: (q: string) => void;
}) {
  const first = visual.columns[0];
  // a row whose first column names something is a question about that thing
  const pick = onAsk && first && first.kind === 'text' && NAME_KEYS.has(first.key)
    ? (row: Row) => {
        const name = formatValue(row[first.key]);
        const id = typeof row.id === 'number' || typeof row.id === 'string' ? ` (ID ${row.id})` : '';
        onAsk(`Tell me more about ${name}${id}`);
      }
    : undefined;
  const count = visual.total ?? visual.rows.length;
  return (
    <Panel eyebrow={<>Table{visual.rows.length ? <> · {count.toLocaleString('en-US')} {count === 1 ? 'row' : 'rows'}</> : null}</>}
      icon={<TableIcon width={11} height={11} />} title={title}
      note={visual.meta.length ? visual.meta.slice(0, 3).map(([k, v]) => `${humanizeKey(k)} ${formatValue(v)}`).join(' · ') : undefined}
      actions={visual.rows.length ? (
        <button type="button" className="ai-btn ai-btn-quiet shrink-0 !rounded-full border border-line !px-2.5 !py-1.5" title="Download as CSV" onClick={() => downloadCsv(title, toCsv(visual.columns, visual.rows))}>
          <DownloadIcon /><span className="text-[12px]">CSV</span>
        </button>
      ) : null}>
      {visual.status ? (
        <div className="mb-3">
          <SegmentsBar slim segments={visual.status.segments.map((seg, i) => ({ label: seg.label, value: seg.value, shown: seg.value.toLocaleString('en-US'), color: seg.tone ? toneColor(seg.tone) : seriesColor(i) }))} />
        </div>
      ) : null}
      <DataTable columns={visual.columns} rows={visual.rows} total={visual.total} currency={currency} onPick={pick} />
    </Panel>
  );
}

/** Everything about one thing: commands to copy first, then label and value pairs. */
function DetailCard({ title, visual }: { title: string; visual: Extract<Visual, { kind: 'record' }> }) {
  return (
    <Panel eyebrow="Details" title={title}>
      <div className="flex flex-col gap-3">
        {visual.commands.map(([k, v]) => <CodeBox key={k} code={v} label={humanizeKey(k)} />)}
        {visual.fields.length ? (
          <dl className="ai-well grid grid-cols-1 gap-x-8 px-3.5 py-1 text-[13px] @2xl:grid-cols-2">
            {visual.fields.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-x-3 border-b border-line py-2 last:border-b-0">
                <dt className="text-ink-3">{humanizeKey(k.replace(/\./g, ' '))}</dt>
                <dd className="ai-num min-w-0 break-words text-ink-1">{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Panel>
  );
}

// a split by status is already what the customer and router components show
const CHART_HINTS = new Set(['trend', 'bars', 'tiles']);

/**
 * One result, drawn. The model's hint and the shape of the data pick the picture;
 * the figures always come from the data.
 */
export default function ResultBlock({ title: rawTitle, payload, show = 'auto', fields, currency, onAsk }: {
  title: string;
  payload: unknown;
  show?: string;
  fields?: ShowFields | null;
  currency?: string | null;
  onAsk?: (q: string) => void;
}) {
  const visual = useMemo(() => visualFor(payload, show, fields), [payload, show, fields]);
  // customers, routers, plans, payments and vouchers have components of their own,
  // unless the model asked for a chart of them
  const entity = useMemo(() => (CHART_HINTS.has(show) || show === 'none' ? null : entityOf(payload)), [payload, show]);
  const title = cardTitle(rawTitle);
  if (entity && visual.kind !== 'empty') {
    switch (entity.entity) {
      case 'customer':
        return <CustomerBlock title={title} rows={entity.rows} total={entity.total} single={entity.single} onAsk={onAsk} />;
      case 'router':
        return <RouterBlock title={title} rows={entity.rows} onAsk={onAsk} />;
      case 'plan':
        return <PlanBlock title={title} rows={entity.rows} currency={currency} onAsk={onAsk} />;
      case 'payment':
        return <PaymentBlock title={title} rows={entity.rows} total={entity.total} currency={currency} onAsk={onAsk} />;
      case 'voucher':
        return <VoucherBlock title={title} rows={entity.rows} currency={currency} />;
    }
  }
  switch (visual.kind) {
    case 'empty':
      return null;
    case 'text':
      return <section className="ai-card whitespace-pre-wrap break-words px-4 py-3 text-[14px] text-ink-1">{visual.text}</section>;
    case 'tiles':
      return <Tiles title={title} items={visual.items} rest={visual.rest} currency={currency} />;
    case 'trend':
    case 'bars':
    case 'share':
      return <ChartCard title={title} visual={visual} currency={currency} onAsk={onAsk} />;
    case 'table':
      return <TableCard title={title} visual={visual} currency={currency} onAsk={onAsk} />;
    case 'record':
      return <DetailCard title={title} visual={visual} />;
  }
}

/** What a result will be, as one word, for the slim "ready" rows shown while the answer is written. */
export function visualNoun(payload: unknown, show?: string, fields?: ShowFields | null): string | null {
  const kind = visualFor(payload, show, fields).kind;
  return kind === 'empty' ? null : kind === 'tiles' ? 'Figures' : kind === 'table' ? 'Table' : kind === 'record' || kind === 'text' ? 'Details' : 'Chart';
}
