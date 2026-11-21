/**
 * Decides how one assistant result is drawn: headline tiles, a trend chart,
 * ranked bars, a part-of-whole bar, a table or a detail card.
 *
 * The model may give a hint (`show`, and optionally which fields to use), but the
 * page works out the picture from the data itself, so every number on screen
 * comes from the API result and never from the model's text. No React here: these
 * are pure functions with unit tests (app/lib/__tests__/assistantVisual.test.ts).
 */
import type { ShowFields, ShowHint } from './assistant';
import { findRows, formatValue, humanizeKey, pickColumns, viewFor, type Row } from './assistantView';
import { formatMoney } from './format';

export type Kind = 'text' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'bool';
export type Tone = 'good' | 'info' | 'warn' | 'bad' | 'muted';

export interface Column { key: string; label: string; kind: Kind }
export interface TileItem { key: string; label: string; value: number; kind: Kind }
export interface Segment { label: string; value: number; tone?: Tone }
export interface ChartModel {
  labelKey: string;
  labelKind: Kind;
  series: Column[];
  rows: Row[];
  /** every usable column, for the chart's table view */
  columns: Column[];
  /** rows left out of the picture (still in the table view) */
  folded?: number;
  /** each drawn row's place in the full ranking (1 = most), when rows were skipped to reach the one asked about */
  ranks?: number[];
  /** the row the question is about, set against the rest */
  focus?: { label: string; rank: number; of: number; average: number; top: number; bottom: number };
}

export type Visual =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'tiles'; items: TileItem[]; rest: [string, unknown][] }
  | { kind: 'trend'; chart: ChartModel }
  | { kind: 'bars'; chart: ChartModel }
  | { kind: 'share'; segments: Segment[]; valueKind: Kind; chart?: ChartModel }
  | { kind: 'table'; rows: Row[]; columns: Column[]; total?: number; meta: [string, unknown][]; status?: { label: string; segments: Segment[] } }
  | { kind: 'record'; fields: [string, unknown][]; commands: [string, string][] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const NUMERIC_TEXT = /^-?\d+(\.\d+)?$/;

/** Keys whose numbers identify something rather than measure it. */
const NOT_A_MEASURE = /(^|_)(id|ids|pk|uuid|phone|msisdn|shortcode|till|paybill|account|port|year|mac|ip|identity|lat|lng|latitude|longitude|number|code|priority|position|page|per_page)$/i;
const MONEY_KEY = /(amount|revenue|price|balance|paid|cost|fee|earning|income|payout|charge|profit|debt|due|commission|spend|spent|arpu|sales_value)/i;
const COUNT_KEY = /(count|customers|users|transactions|payments|sales|qty|quantity|devices|routers|vouchers|sessions|messages)$/i;
const PERCENT_KEY = /(percent|pct|percentage|share|ratio|rate)$/i;
const DATE_NAME = /^(date|day|month|period|week|hour|label|bucket)$/i;
const STATUS_KEY = /^(status|state|is_online|online|is_active|active|payment_status|subscription_status|connection_type|type|method|payment_method|tier)$/i;
const LABEL_PRIORITY = [
  'name', 'label', 'title', 'plan_name', 'plan', 'router_name', 'router', 'customer_name', 'organization_name',
  'full_name', 'reseller', 'method', 'payment_method', 'status', 'type', 'category', 'identity', 'phone', 'code',
];

const isPlainObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);

/** A number from a number or from numeric text (the API sends money as text now and then). */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && NUMERIC_TEXT.test(v.trim())) return Number(v);
  return null;
}

function kindOfValues(key: string, values: unknown[]): Kind | null {
  const present = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (present.length === 0) return null;
  if (present.every((v) => typeof v === 'boolean')) return 'bool';
  if (present.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    if (PERCENT_KEY.test(key)) return 'percent';
    if (MONEY_KEY.test(key) && !COUNT_KEY.test(key)) return 'money';
    return 'number';
  }
  if (present.every((v) => typeof v === 'string')) {
    const texts = present as string[];
    if (texts.every((s) => ISO_DATE.test(s))) return texts.some((s) => s.length > 10) ? 'datetime' : 'date';
    if (texts.every((s) => ISO_MONTH.test(s))) return 'date';
    if (MONEY_KEY.test(key) && !COUNT_KEY.test(key) && texts.every((s) => NUMERIC_TEXT.test(s.trim()))) return 'money';
    return 'text';
  }
  if (present.every((v) => typeof v === 'string' || typeof v === 'number')) return 'text';
  return null; // nested values: not a column
}

/** Every scalar column of a list, with what kind of value it holds. */
export function describeColumns(rows: Row[]): Column[] {
  const keys: string[] = [];
  for (const row of rows.slice(0, 40)) for (const k of Object.keys(row)) if (!k.startsWith('_') && !keys.includes(k)) keys.push(k);
  const sample = rows.slice(0, 60);
  const out: Column[] = [];
  for (const key of keys) {
    const kind = kindOfValues(key, sample.map((r) => r[key]));
    if (kind) out.push({ key, label: humanizeKey(key), kind });
  }
  return out;
}

const isMeasure = (c: Column) => (c.kind === 'number' || c.kind === 'money' || c.kind === 'percent') && !NOT_A_MEASURE.test(c.key);
const isDateColumn = (c: Column) => c.kind === 'date' || c.kind === 'datetime';

function labelColumn(columns: Column[], rows: Row[], allowDate: boolean): Column | null {
  const texty = columns.filter((c) => c.kind === 'text' || (allowDate && isDateColumn(c)));
  for (const key of LABEL_PRIORITY) {
    const found = texty.find((c) => c.key === key);
    if (found) return found;
  }
  // else the text column that tells rows apart best
  let best: Column | null = null;
  let bestDistinct = 0;
  for (const c of texty) {
    const distinct = new Set(rows.map((r) => String(r[c.key] ?? ''))).size;
    if (distinct > bestDistinct) { best = c; bestDistinct = distinct; }
  }
  return best;
}

function dateColumn(columns: Column[], rows: Row[]): Column | null {
  const named = columns.find((c) => isDateColumn(c) && DATE_NAME.test(c.key));
  if (named) return named;
  const anyDate = columns.find(isDateColumn);
  if (anyDate) return anyDate;
  // "label": "Mon 12" style buckets beside a real date are handled above; a bare day name is not a date
  void rows;
  return null;
}

/** The figure a chart leads with: money first (revenue before other amounts), then counts. */
function leadMeasures(columns: Column[]): Column[] {
  const measures = columns.filter(isMeasure);
  const rank = (c: Column) => (/(revenue|amount)/i.test(c.key) ? 0 : c.kind === 'money' ? 1 : /total/i.test(c.key) ? 2 : 3);
  return [...measures].sort((a, b) => rank(a) - rank(b));
}

const GOOD = /^(online|active|completed|complete|success|successful|paid|delivered|sent|verified|connected|yes|true|up|done)$/i;
const BAD = /^(offline|expired|failed|inactive|suspended|cancelled|canceled|rejected|blocked|down|no|false|overdue|error)$/i;
const WARN = /^(pending|trial|expiring|queued|processing|paused|partial|stale|unpaid|waiting)$/i;

export function toneFor(label: string): Tone | undefined {
  const s = label.trim();
  if (GOOD.test(s)) return 'good';
  if (BAD.test(s)) return 'bad';
  if (WARN.test(s)) return 'warn';
  if (/^(unknown|other|none|n\/a|-)$/i.test(s)) return 'muted';
  return undefined;
}

const statusText = (v: unknown) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v === null || v === undefined || v === '' ? 'Unknown' : humanizeKey(String(v)));

/** A list's rows counted by its status-like column, when it has one worth showing. */
export function statusSummary(rows: Row[]): { label: string; segments: Segment[] } | null {
  if (rows.length < 4) return null;
  const keys = Object.keys(rows[0] ?? {}).filter((k) => STATUS_KEY.test(k));
  for (const key of keys) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const v = row[key];
      if (isPlainObject(v) || Array.isArray(v)) { counts.clear(); break; }
      const label = statusText(key.startsWith('is_') || key === 'online' || key === 'active' ? (v === true ? key.replace(/^is_/, '') : v === false ? `not ${key.replace(/^is_/, '')}` : v) : v);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    if (counts.size >= 2 && counts.size <= 5) {
      const segments = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, tone: toneFor(label.replace(/^Not /, 'in')) ?? toneFor(label) }));
      return { label: humanizeKey(key.replace(/^is_/, '')), segments };
    }
  }
  return null;
}

function resolveFields(columns: Column[], fields?: ShowFields | null): { label: Column | null; values: Column[] } {
  const label = fields?.label ? columns.find((c) => c.key === fields.label) ?? null : null;
  const values = (fields?.value ?? []).map((k) => columns.find((c) => c.key === k)).filter((c): c is Column => !!c && (c.kind === 'number' || c.kind === 'money' || c.kind === 'percent'));
  return { label, values: values.slice(0, 4) };
}

/** One series by default: two measures of different scale never share an axis. */
function chartSeries(columns: Column[], wanted: Column[]): Column[] {
  if (wanted.length) {
    const kind = wanted[0].kind;
    return wanted.filter((c) => c.kind === kind).slice(0, 3);
  }
  const lead = leadMeasures(columns);
  return lead.length ? [lead[0]] : [];
}

/** Whether a column says anything as a chart: at least two different values among the rows. */
export function varies(rows: Row[], key: string): boolean {
  let first: number | null = null;
  for (const r of rows) {
    const n = num(r[key]);
    if (n === null) continue;
    if (first === null) first = n;
    else if (n !== first) return true;
  }
  return false;
}

/**
 * The series worth drawing: the ones asked for or chosen that move, else the first other
 * measure that does. Empty when every measure is flat (all zero, or the same throughout):
 * a flat line or equal bars carry no picture, so the caller says it in words instead.
 */
function movingSeries(columns: Column[], wanted: Column[], rows: Row[]): Column[] {
  const chosen = chartSeries(columns, wanted).filter((c) => varies(rows, c.key));
  if (chosen.length) return chosen;
  const other = leadMeasures(columns).find((c) => varies(rows, c.key));
  return other ? [other] : [];
}

/** "Downtime seconds was 0 throughout (42 readings, 14 Nov – 21 Nov)." */
function flatStatement(columns: Column[], wanted: Column[], rows: Row[], date: Column): string | null {
  const series = chartSeries(columns, wanted);
  if (!series.length) return null;
  const times = rows.map((r) => r[date.key]).filter((v) => v !== null && v !== undefined);
  const range = times.length ? ` (${rows.length} readings, ${shortDate(times[0])} – ${shortDate(times[times.length - 1])})` : '';
  const parts = series.map((c) => {
    const v = rows.map((r) => r[c.key]).find((x) => num(x) !== null);
    return `${c.label} was ${formatCell(v ?? 0, c.kind)} throughout`;
  });
  return `${parts.join('; ')}${range}.`;
}

const timeOf = (v: unknown): number => {
  if (typeof v !== 'string') return NaN;
  const iso = ISO_MONTH.test(v) ? `${v}-01` : v.length > 10 && !/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? `${v}Z` : v;
  return new Date(iso).getTime();
};

const MAX_BARS = 12;

/** Where the row a question is about stands: its rank, and the average, top and bottom it is set against. */
function focusOf(sorted: Row[], labelKey: string, by: string, highlight?: string | null) {
  const want = (highlight ?? '').trim().toLowerCase();
  if (!want || sorted.length < 2) return null;
  const at = sorted.findIndex((r) => String(r[labelKey] ?? '').trim().toLowerCase() === want);
  const i = at >= 0 ? at : sorted.findIndex((r) => String(r[labelKey] ?? '').toLowerCase().includes(want));
  if (i < 0) return null;
  const values = sorted.map((r) => num(r[by]) ?? 0);
  return { label: '', rank: i + 1, of: sorted.length, average: values.reduce((a, b) => a + b, 0) / values.length,
           top: values[0], bottom: values[values.length - 1] };
}
const MAX_SEGMENTS = 6;

/** Choose how to draw one result. `show` is the model's hint; "auto" lets the data decide. */
export function visualFor(payload: unknown, show: ShowHint | string = 'auto', fields?: ShowFields | null): Visual {
  if (payload === null || payload === undefined || show === 'none') return { kind: 'empty' };
  if (typeof payload === 'string') return payload.trim() ? { kind: 'text', text: payload } : { kind: 'empty' };

  const found = show === 'card' || show === 'tiles' ? null : findRows(payload);
  const rows = found ? found.rows.filter((r) => !('_note' in r && Object.keys(r).length === 1)) : null;

  if (rows && rows.length > 0) {
    const columns = describeColumns(rows);
    const wanted = resolveFields(columns, fields);
    const measures = columns.filter(isMeasure);
    const hasIdentity = columns.some((c) => /^(id|uuid)$/i.test(c.key));
    const aggregate = !hasIdentity && columns.length <= 8;
    const date = wanted.label && isDateColumn(wanted.label) ? wanted.label : dateColumn(columns, rows);

    // values over time
    if ((show === 'trend' || (show === 'auto' && aggregate && rows.length >= 3)) && date && measures.length > 0) {
      const series = movingSeries(columns, wanted.values, rows);
      const distinct = new Set(rows.map((r) => String(r[date.key]))).size;
      const sorted = [...rows].sort((a, b) => (timeOf(a[date.key]) || 0) - (timeOf(b[date.key]) || 0));
      if (series.length && (show === 'trend' || distinct >= 3)) {
        return { kind: 'trend', chart: { labelKey: date.key, labelKind: date.kind, series, rows: sorted, columns } };
      }
      // nothing moved: never a flat line, say it
      if (!series.length && (show === 'trend' || distinct >= 3)) {
        const said = flatStatement(columns, wanted.values, sorted, date);
        if (said) return { kind: 'text', text: said };
      }
    }

    const label = wanted.label ?? labelColumn(columns, rows, show !== 'auto');

    // a split of one whole
    if (show === 'share' && label) {
      const value = (wanted.values[0] ?? leadMeasures(columns)[0]) as Column | undefined;
      let segments: Segment[];
      if (value) {
        segments = rows.map((r) => ({ label: statusText(r[label.key]), value: num(r[value.key]) ?? 0 }));
      } else {
        const counts = new Map<string, number>();
        for (const r of rows) counts.set(statusText(r[label.key]), (counts.get(statusText(r[label.key])) ?? 0) + 1);
        segments = [...counts.entries()].map(([l, v]) => ({ label: l, value: v }));
      }
      segments = segments.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
      if (segments.length > MAX_SEGMENTS) {
        const rest = segments.slice(MAX_SEGMENTS - 1);
        segments = [...segments.slice(0, MAX_SEGMENTS - 1), { label: `Other (${rest.length})`, value: rest.reduce((a, s) => a + s.value, 0), tone: 'muted' }];
      }
      segments = segments.map((s) => ({ ...s, tone: s.tone ?? toneFor(s.label) }));
      if (segments.length >= 2) {
        return { kind: 'share', segments, valueKind: value?.kind ?? 'number', chart: { labelKey: label.key, labelKind: label.kind, series: value ? [value] : [], rows, columns } };
      }
    }

    // a ranking
    const rankable = label && measures.length > 0 && rows.length >= 2;
    if (rankable && (show === 'bars' || !!fields?.highlight || (show === 'auto' && aggregate && !date && columns.length <= 6 && rows.length <= 20 && measures.length <= 3))) {
      // equal bars rank nothing: those rows read better as the table below
      const series = movingSeries(columns, wanted.values, rows);
      if (series.length) {
        const by = series[0].key;
        const sorted = [...rows].sort((a, b) => (num(b[by]) ?? 0) - (num(a[by]) ?? 0));
        const focus = focusOf(sorted, label.key, by, fields?.highlight);
        if (focus) {
          // the one asked about among the rest: the leaders, it in its own place, and the last
          const keep = new Set<number>(sorted.length <= MAX_BARS ? sorted.map((_, i) => i)
            : [...Array(MAX_BARS - 3).keys(), focus.rank - 1, sorted.length - 1]);
          const idx = [...keep].sort((a, b) => a - b);
          return { kind: 'bars', chart: { labelKey: label.key, labelKind: label.kind, series, rows: idx.map((i) => sorted[i]), columns,
            folded: sorted.length - idx.length, ranks: idx.map((i) => i + 1), focus: { ...focus, label: String(sorted[focus.rank - 1][label.key]) } } };
        }
        const shownRows = sorted.slice(0, MAX_BARS);
        return { kind: 'bars', chart: { labelKey: label.key, labelKind: label.kind, series, rows: shownRows, columns, folded: sorted.length - shownRows.length } };
      }
    }

    // a hinted chart that the data cannot carry falls through to the table
    let total: number | undefined;
    const meta: [string, unknown][] = [];
    if (isPlainObject(payload)) {
      for (const [k, v] of Object.entries(payload)) {
        if (k === found?.key || k.startsWith('_') || (typeof v === 'object' && v !== null)) continue;
        if (['total', 'count', 'total_count', 'total_items'].includes(k) && typeof v === 'number') total = v;
        else meta.push([k, v]);
      }
    }
    const picked = pickColumns(rows);
    const tableColumns = picked.map((key) => columns.find((c) => c.key === key) ?? { key, label: humanizeKey(key), kind: 'text' as Kind });
    return { kind: 'table', rows, columns: tableColumns, total, meta: meta.slice(0, 8), status: statusSummary(rows) ?? undefined };
  }

  if (rows && rows.length === 0 && (show === 'table' || !isPlainObject(payload) || Object.keys(payload).length <= 4)) {
    return { kind: 'table', rows: [], columns: [], meta: [] };
  }

  if (isPlainObject(payload)) {
    const record = viewFor(payload, 'card');
    if (record.kind !== 'record') return { kind: 'empty' };
    const numeric: TileItem[] = [];
    const rest: [string, unknown][] = [];
    // a figure is named by its own last word, unless two figures share it
    const leaves = record.fields.map(([k]) => k.split('.').pop() ?? k);
    const shared = new Set(leaves.filter((l, i) => leaves.indexOf(l) !== i));
    for (const [key, value] of record.fields) {
      const leaf = key.split('.').pop() ?? key;
      const n = typeof value === 'number' && Number.isFinite(value) ? value : MONEY_KEY.test(leaf) && !COUNT_KEY.test(leaf) ? num(value) : null;
      if (n !== null && !NOT_A_MEASURE.test(leaf)) {
        const kind: Kind = PERCENT_KEY.test(leaf) ? 'percent' : MONEY_KEY.test(key) && !COUNT_KEY.test(leaf) ? 'money' : 'number';
        numeric.push({ key, label: humanizeKey(shared.has(leaf) ? key.replace(/\./g, ' ') : leaf), value: n, kind });
      } else if (!(typeof value === 'object' && value !== null) && !/^currency$/i.test(leaf)) {
        rest.push([key, value]);  // ids and empty values are already left out of the record
      }
    }
    if (show === 'share' && numeric.length >= 2) {
      const parts = numeric.filter((t) => !/(^|\.)(total|all|count)$/i.test(t.key) && t.value > 0);
      if (parts.length >= 2) {
        const segments = parts.slice(0, MAX_SEGMENTS).map((t) => ({ label: t.label, value: t.value, tone: toneFor(t.key.split('.').pop() ?? '') }));
        return { kind: 'share', segments, valueKind: parts[0].kind };
      }
    }
    const scalars = numeric.length + rest.length;
    if (record.commands.length === 0 && numeric.length >= 2 && (show === 'tiles' || (show === 'auto' && numeric.length <= 8 && numeric.length * 2 >= scalars))) {
      return { kind: 'tiles', items: numeric.slice(0, 8), rest: rest.slice(0, 8) };
    }
    // a card with nothing to read (only ids or lists of ids) is never drawn: the words say it
    if (!record.commands.length && !record.fields.some(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')) {
      return { kind: 'empty' };
    }
    return record;
  }
  return { kind: 'text', text: formatValue(payload) };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** A date as a short axis label: "12 Nov", or "Nov 2026" for a month. */
export function shortDate(v: unknown): string {
  if (typeof v !== 'string') return formatValue(v);
  if (ISO_MONTH.test(v)) return monthFmt.format(new Date(`${v}-01T00:00:00Z`));
  if (ISO_DATE.test(v)) {
    const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) return dayFmt.format(d);
  }
  return v;
}

/** 1,250 -> "1.3K", 2,400,000 -> "2.4M": for axis ticks and labels on bars. */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}K`;
  if (abs >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** A value as it is shown in a cell, a tile or a tooltip. */
export function formatCell(value: unknown, kind: Kind, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return '–';
  if (kind === 'money') {
    const n = num(value);
    return n === null ? formatValue(value) : formatMoney(n, currency ?? 'KES');
  }
  if (kind === 'percent') {
    const n = num(value);
    return n === null ? formatValue(value) : `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  }
  if (kind === 'number') {
    const n = num(value);
    return n === null ? formatValue(value) : n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (kind === 'date' && typeof value === 'string' && ISO_MONTH.test(value)) return shortDate(value);
  return formatValue(value);
}

export const isBlank = (v: unknown) => v === null || v === undefined || v === '' || v === '–';

/** Rows as CSV text (for the download button). */
export function toCsv(columns: Column[], rows: Row[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // a leading =, +, - or @ would run as a formula in a spreadsheet
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(','))].join('\n');
}

/** A route's name as a card title: "Get Revenue Over Time" -> "Revenue over time". */
export function cardTitle(title: string): string {
  const words = title.trim().replace(/^(get|list|fetch|read|show)\s+/i, '').replace(/\s+api$/i, '').split(/\s+/).filter(Boolean);
  if (!words.length) return title;
  const text = words.map((w, i) => (i === 0 || /^[A-Z0-9]{2,}$/.test(w) || /[a-z][A-Z]/.test(w) ? w : w.toLowerCase())).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------------- gauges ---------------- */

/** A reading that is best drawn as a dial: a share of 0-100 and what a high value means. */
export interface Gauge { key: string; label: string; value: number; scale: 'load' | 'reach' | 'plain' }

const NOT_A_LEVEL = /(count|cores|frequency|freq|mhz|ghz|bytes|bps|seconds|days|hours|minutes|price|amount|total|number|id)$/i;
const LOAD_LEVEL = /(^|_)(cpu|cpu_load|load|memory|mem|ram|disk|hdd|storage|usage|utili[sz]ation|util)(_|$)/i;
const REACH_LEVEL = /(uptime|availability|reachab|success|delivery)/i;
const PERCENT_WORD = /(^|_)(pct|percent|percentage)(_|$)/i;
const FRACTION_WORD = /(^|_)(ratio|share)$/i;
const RATE_WORD = /(^|_)rate$/i;

function gaugeLabel(key: string): string {
  const k = key.toLowerCase();
  if (/(^|_)cpu/.test(k)) return 'CPU';
  if (/(memory|(^|_)mem(_|$)|(^|_)ram(_|$))/.test(k)) return 'Memory';
  if (/(disk|hdd|storage)/.test(k)) return 'Disk';
  return humanizeKey(key.replace(/(^|_)(pct|percent|percentage|ratio|share|rate)(?=_|$)/gi, '').replace(/^_+|_+$/g, '') || key);
}

/**
 * The readings in a set of fields that are levels (CPU, memory, disk, uptime, a
 * percentage), as dials. Memory and disk are worked out from RouterOS's free_ and
 * total_ pairs when no percentage is given. `used` lists the fields a dial now shows,
 * so they are not repeated as plain figures. At most four.
 */
export function gaugesOf(entries: [string, unknown][]): { gauges: Gauge[]; used: Set<string> } {
  const map = new Map(entries.map(([k, v]) => [k.toLowerCase().replace(/-/g, '_'), { key: k, v: num(v) }]));
  const gauges: Gauge[] = [];
  const used = new Set<string>();
  const add = (g: Gauge, keys: string[]) => {
    if (gauges.length >= 4 || gauges.some((x) => x.label === g.label)) return;
    gauges.push({ ...g, value: Math.max(0, Math.min(100, Math.round(g.value * 10) / 10)) });
    keys.forEach((k) => used.add(k));
  };

  // free/used + total pairs: memory, disk
  for (const part of ['memory', 'hdd_space', 'disk', 'storage', 'ram']) {
    const total = map.get(`total_${part}`);
    const free = map.get(`free_${part}`);
    const usedV = map.get(`used_${part}`);
    if (total?.v && total.v > 0) {
      const level = free?.v !== undefined && free?.v !== null ? ((total.v - free.v) / total.v) * 100
        : usedV?.v !== undefined && usedV?.v !== null ? (usedV.v / total.v) * 100 : null;
      if (level !== null && Number.isFinite(level)) {
        add({ key: `total_${part}`, label: part === 'hdd_space' || part === 'disk' || part === 'storage' ? 'Disk' : 'Memory', value: level, scale: 'load' },
          [total.key, free?.key ?? '', usedV?.key ?? ''].filter(Boolean));
      }
    }
  }

  for (const [norm, { key, v }] of map) {
    if (v === null || used.has(key) || NOT_A_LEVEL.test(norm)) continue;
    let value: number | null = null;
    if (FRACTION_WORD.test(norm) && v >= 0 && v <= 1) value = v * 100;
    else if ((PERCENT_WORD.test(norm) || LOAD_LEVEL.test(norm) || (REACH_LEVEL.test(norm) && (RATE_WORD.test(norm) || PERCENT_WORD.test(norm) || /reachab|availability/.test(norm)))) && v >= 0 && v <= 100) value = v;
    if (value === null) continue;
    const scale: Gauge['scale'] = LOAD_LEVEL.test(norm) ? 'load' : REACH_LEVEL.test(norm) ? 'reach' : 'plain';
    add({ key, label: gaugeLabel(key), value, scale }, [key]);
  }
  // the order the router cards use: CPU, memory, disk, then the rest as found
  const rank = (g: Gauge) => (g.label === 'CPU' ? 0 : g.label === 'Memory' ? 1 : g.label === 'Disk' ? 2 : 3);
  gauges.sort((a, b) => rank(a) - rank(b));
  return { gauges, used };
}
