/**
 * Pure helpers that turn assistant results into tables, cards and text.
 * No React here, so they are unit tested (app/lib/__tests__/assistantView.test.ts).
 */

export type Row = Record<string, unknown>;

export interface TableView {
  kind: 'table';
  rows: Row[];
  columns: string[];
  total?: number;
  meta: [string, unknown][];
}

export interface RecordView {
  kind: 'record';
  fields: [string, unknown][];
  commands: [string, string][];
}

export interface EmptyView {
  kind: 'empty' | 'text';
  text?: string;
}

export type ResultView = TableView | RecordView | EmptyView;

const PREFERRED_LIST_KEYS = [
  'items', 'results', 'data', 'customers', 'routers', 'plans', 'transactions', 'vouchers',
  'payments', 'invoices', 'users', 'devices', 'sessions', 'logs', 'messages', 'rows', 'records',
];

const COLUMN_PRIORITY = [
  'name', 'customer_name', 'full_name', 'title', 'label', 'identity', 'code', 'phone', 'phone_number',
  'status', 'plan', 'plan_name', 'router', 'router_name', 'amount', 'price', 'balance', 'speed',
  'expiry', 'expires_at', 'expiry_date', 'online', 'is_online', 'created_at', 'transaction_date', 'id',
];

const isPlainObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const isScalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

function rowsIn(value: unknown): Row[] | null {
  if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) return value as Row[];
  if (Array.isArray(value) && value.length === 0) return [];
  return null;
}

/** Find the list worth tabling in a result, if any. */
export function findRows(payload: unknown): { rows: Row[]; key?: string } | null {
  const direct = rowsIn(payload);
  if (direct) return { rows: direct };
  if (!isPlainObject(payload)) return null;
  for (const key of PREFERRED_LIST_KEYS) {
    const rows = rowsIn(payload[key]);
    if (rows) return { rows, key };
  }
  let best: { rows: Row[]; key: string } | null = null;
  for (const [key, value] of Object.entries(payload)) {
    const rows = rowsIn(value);
    if (rows && (!best || rows.length > best.rows.length)) best = { rows, key };
  }
  return best;
}

export function pickColumns(rows: Row[], max = 7): string[] {
  const seen = new Map<string, number>();
  for (const row of rows.slice(0, 30)) {
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith('_')) continue;
      const usable = isScalar(v) || (isPlainObject(v) && labelOf(v) !== null);
      if (usable && v !== null && v !== '') seen.set(k, (seen.get(k) ?? 0) + 1);
      else if (!seen.has(k) && usable) seen.set(k, 0);
    }
  }
  const keys = [...seen.keys()].filter((k) => (seen.get(k) ?? 0) > 0);
  const rank = (k: string) => {
    const i = COLUMN_PRIORITY.indexOf(k);
    return i === -1 ? COLUMN_PRIORITY.length : i;
  };
  return keys.sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

function labelOf(v: Row): string | null {
  for (const k of ['name', 'label', 'title', 'identity', 'phone', 'code']) {
    if (typeof v[k] === 'string' || typeof v[k] === 'number') return String(v[k]);
  }
  if (typeof v.id === 'number' || typeof v.id === 'string') return `#${v.id}`;
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** A cell or field as display text. Naive API datetimes are UTC, and are shown in EAT. */
export function formatValue(v: unknown, locale?: string): string {
  if (v === null || v === undefined || v === '') return '–';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString(locale) : v.toLocaleString(locale, { maximumFractionDigits: 2 });
  if (typeof v === 'string') {
    if (ISO_DATE.test(v) && v.length >= 10) {
      const hasTime = v.length > 10;
      const iso = hasTime && !/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? `${v}Z` : v;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        return hasTime
          ? d.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })
          : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      }
    }
    return v;
  }
  if (Array.isArray(v)) {
    if (v.every(isScalar)) return v.map((x) => formatValue(x, locale)).join(', ');
    return `${v.length} items`;
  }
  if (isPlainObject(v)) return labelOf(v) ?? JSON.stringify(v).slice(0, 80);
  return String(v);
}

export function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
    // units read as units: "total mb" -> "total MB", "rate mbps" -> "rate Mbps"
    .replace(/\b(kb|mb|gb|tb)\b/gi, (u) => u.toUpperCase()).replace(/\b([kmg])bps\b/gi, (_, p: string) => `${p.toUpperCase()}bps`);
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const COMMAND_KEYS = /(^|_)(command|script|setup_command|commands)$/i;
const looksLikeRouterCommand = (s: string) => /^\s*\/(tool|import|system|ip|interface|ping)\b/.test(s);

function flatten(obj: Row, prefix = '', depth = 0, out: [string, unknown][] = []): [string, unknown][] {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && depth < 1) flatten(v, key, depth + 1, out);
    else out.push([key, v]);
  }
  return out;
}

/** Choose how to draw one result. ``show`` is the model's hint. */
/**
 * Fields that mean nothing to the person reading an answer: database ids (and
 * lists of them), and housekeeping times of the report itself. The assistant
 * still has them; the page does not show them.
 */
const NOISE_KEY = /(^|_)(ids?|uuids?|pk)$|^(extracted|generated|fetched|computed|cached)_at$/i;
export const isNoiseField = (key: string, value: unknown): boolean => {
  const leaf = key.split('.').pop() ?? key;
  return NOISE_KEY.test(leaf) || value === null || value === undefined || value === '';
};

export function viewFor(payload: unknown, show: string = 'auto'): ResultView {
  if (payload === null || payload === undefined) return { kind: 'empty' };
  if (typeof payload === 'string') return { kind: 'text', text: payload };
  const found = show === 'card' ? null : findRows(payload);
  if (found && (show === 'table' || found.rows.length > 0 || !isPlainObject(payload))) {
    const meta: [string, unknown][] = [];
    let total: number | undefined;
    if (isPlainObject(payload)) {
      for (const [k, v] of Object.entries(payload)) {
        if (k === found.key || !isScalar(v) || k.startsWith('_')) continue;
        if (['total', 'count', 'total_count', 'total_items'].includes(k) && typeof v === 'number') total = v;
        else meta.push([k, v]);
      }
    }
    const rows = found.rows.filter((r) => !('_note' in r && Object.keys(r).length === 1));
    return { kind: 'table', rows, columns: pickColumns(rows), total, meta: meta.slice(0, 8) };
  }
  if (isPlainObject(payload)) {
    const fields = flatten(payload);
    const commands: [string, string][] = [];
    const rest: [string, unknown][] = [];
    for (const [k, v] of fields) {
      if (typeof v === 'string' && (COMMAND_KEYS.test(k.split('.').pop() ?? '') || looksLikeRouterCommand(v))) {
        commands.push([k, v]);
      } else if (!isNoiseField(k, v)) {
        rest.push([k, v]);
      }
    }
    return { kind: 'record', fields: rest.slice(0, 40), commands };
  }
  return { kind: 'text', text: formatValue(payload) };
}

// ---------------------------------------------------------------------------
// Minimal, safe markdown: never produces HTML strings, only tokens.
// ---------------------------------------------------------------------------

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'code'; v: string }
  | { t: 'link'; v: string; href: string };

export type Block =
  | { t: 'p'; inline: Inline[] }
  | { t: 'list'; ordered: boolean; items: Inline[][] }
  | { t: 'code'; v: string }
  | { t: 'heading'; inline: Inline[] };

/** Only same-site paths and https links are allowed as hrefs. */
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^\/(?!\/)/.test(h)) return h;
  if (/^https:\/\//i.test(h)) return h;
  return null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    const s = m[0];
    if (m[1]) out.push({ t: 'code', v: s.slice(1, -1) });
    else if (m[2]) out.push({ t: 'bold', v: s.slice(2, -2) });
    else if (m[3]) {
      const label = s.slice(1, s.indexOf(']('));
      const href = safeHref(s.slice(s.indexOf('](') + 2, -1));
      out.push(href ? { t: 'link', v: label, href } : { t: 'text', v: label });
    } else if (m[4]) out.push({ t: 'italic', v: s.slice(1, -1) });
    last = m.index + s.length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: { ordered: boolean; items: Inline[][] } | null = null;
  const flushPara = () => {
    if (para.length) blocks.push({ t: 'p', inline: parseInline(para.join('\n')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ t: 'list', ...list });
    list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      flushPara(); flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      blocks.push({ t: 'code', v: code.join('\n') });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push(parseInline((bullet ?? numbered)![1]));
      continue;
    }
    const heading = /^\s*#{1,4}\s+(.*)$/.exec(line);
    if (heading) { flushPara(); flushList(); blocks.push({ t: 'heading', inline: parseInline(heading[1]) }); continue; }
    if (!line.trim()) { flushPara(); flushList(); continue; }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return blocks;
}
