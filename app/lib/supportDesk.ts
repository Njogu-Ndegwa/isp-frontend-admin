// WhatsApp support desk snapshot (GET /api/admin/support-desk, platform admin
// only). The snapshot is built on Dennis's laptop by build-support-dashboard.py
// and pushed to the backend; every field is optional here because the builder
// evolves independently of this page.

export type SupportCustomerStatus = 'us' | 'customer' | 'dennis' | 'done';

export interface SupportWorkEntry {
  date?: string;
  at?: string;
  category?: string;
  title?: string;
  detail?: string;
  outcome?: string;
  contact?: string;
  customer?: string;
  ticket?: string;
  note?: string;
  ref?: string;
}

export interface SupportCustomerRow {
  id: string;
  name?: string;
  status?: string;
  class?: string;
  snippet?: string;
  last_at?: string;
  last_from?: string;
  open_promises?: number;
  open_dennis?: boolean;
  handover?: boolean;
  billing_role?: string | null;
  tickets?: string[];
  work?: SupportWorkEntry[];
  window?: { messages?: number; last?: string };
}

export interface SupportDeskSnapshot {
  generated_at?: string;
  customers?: {
    rows?: SupportCustomerRow[];
    window_label?: string;
    window_start?: string;
    notes?: string;
  };
  worklog?: { entries?: SupportWorkEntry[] };
  [key: string]: unknown;
}

export interface SupportDeskResponse {
  received_at: string;
  size_bytes: number;
  sha256: string;
  snapshot: SupportDeskSnapshot;
}

export const STALE_AFTER_MINUTES = 30;

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export const CUSTOMER_STATUSES: { value: SupportCustomerStatus; label: string; variant: BadgeVariant }[] = [
  { value: 'us', label: 'Waiting on us', variant: 'warning' },
  { value: 'customer', label: 'Waiting on customer', variant: 'info' },
  { value: 'dennis', label: 'With Dennis', variant: 'danger' },
  { value: 'done', label: 'Done', variant: 'success' },
];

const NEUTRAL_CHIP = 'bg-foreground/5 text-foreground-muted border-border';

export function customerStatusMeta(status: string | undefined): { value: string; label: string; variant: BadgeVariant } {
  return (
    CUSTOMER_STATUSES.find((s) => s.value === status) ?? {
      value: status ?? 'unknown',
      label: status || 'Unknown',
      variant: 'neutral',
    }
  );
}

// Same categories and wording as the laptop dashboard's work log.
export const WORK_CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'support', label: 'Customer support', hint: 'Answers and explanations sent to customers' },
  { value: 'customer_task', label: 'Customer tasks', hint: 'Changes made for a customer (router, account, settings)' },
  { value: 'bug_fix', label: 'Bugs fixed', hint: 'Faults fixed in our own systems' },
  { value: 'feature', label: 'Features built', hint: 'New product capability, usually asked for by a customer' },
  { value: 'promise', label: 'Promises', hint: 'Commitments made to customers' },
  { value: 'needs_dennis', label: 'Waiting on Dennis', hint: 'Needs a decision or approval' },
  { value: 'agent', label: 'Agent & setup', hint: 'Building and running the support agent itself' },
];

export function categoryLabel(category: string | undefined): string {
  return WORK_CATEGORIES.find((c) => c.value === category)?.label ?? (category || 'Other');
}

/** An entry with no outcome, or outcome "open", is still open (as on the laptop). */
export function isOpenEntry(entry: SupportWorkEntry): boolean {
  return !entry.outcome || entry.outcome === 'open';
}

export function outcomeClassName(outcome: string | undefined): string {
  const o = outcome || 'open';
  if (o === 'open' || o === 'waiting') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  if (['done', 'deployed', 'delivered'].includes(o)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (['running', 'in_progress', 'sent', 'read'].includes(o)) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return NEUTRAL_CHIP;
}

function entryKey(e: SupportWorkEntry): string {
  return `${e.date ?? ''}|${e.at ?? ''}|${e.title ?? ''}`;
}

/** Newest first: date, then HH:MM time. */
export function sortEntries(entries: SupportWorkEntry[]): SupportWorkEntry[] {
  return [...entries].sort((a, b) =>
    `${b.date ?? ''} ${b.at ?? ''}`.localeCompare(`${a.date ?? ''} ${a.at ?? ''}`),
  );
}

export function openPromises(row: SupportCustomerRow): SupportWorkEntry[] {
  return (row.work ?? []).filter((e) => e.category === 'promise' && isOpenEntry(e));
}

function rowLast(row: SupportCustomerRow): string {
  return row.window?.last || row.last_at || '';
}

export function filterCustomers(
  rows: SupportCustomerRow[],
  opts: { status: SupportCustomerStatus | 'all'; query: string; promisesOnly?: boolean },
): SupportCustomerRow[] {
  const q = opts.query.trim().toLowerCase();
  return rows
    .filter((r) => opts.status === 'all' || r.status === opts.status)
    .filter((r) => !opts.promisesOnly || (r.open_promises ?? 0) > 0)
    .filter((r) => {
      if (!q) return true;
      const haystack = [
        r.name,
        r.snippet,
        r.billing_role,
        r.class,
        ...(r.tickets ?? []),
        ...(r.work ?? []).flatMap((e) => [e.title, e.detail, e.ticket]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => rowLast(b).localeCompare(rowLast(a)));
}

/**
 * 'window' = customers with at least one message since the intake start
 * (snapshot.customers.window_start, 22 Oct 2026); 'all' = every business/lead
 * chat ever. Same default and toggle as the laptop dashboard.
 */
export type CustomerScope = 'window' | 'all';

export function scopeCustomers(rows: SupportCustomerRow[], scope: CustomerScope): SupportCustomerRow[] {
  return scope === 'all' ? rows : rows.filter((r) => (r.window?.messages ?? 0) > 0);
}

export function countByStatus(rows: SupportCustomerRow[]): Record<SupportCustomerStatus | 'all', number> {
  const counts = { all: rows.length, us: 0, customer: 0, dennis: 0, done: 0 };
  for (const r of rows) {
    if (r.status && r.status in counts) counts[r.status as SupportCustomerStatus] += 1;
  }
  return counts;
}

export function groupByCategory(entries: SupportWorkEntry[]): { category: string; entries: SupportWorkEntry[] }[] {
  const order = WORK_CATEGORIES.map((c) => c.value);
  const map = new Map<string, SupportWorkEntry[]>();
  for (const e of entries) {
    const key = e.category || 'other';
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.localeCompare(b);
    })
    .map(([category, list]) => ({ category, entries: sortEntries(list) }));
}

export interface DennisItem extends SupportWorkEntry {
  customerName?: string;
}

/**
 * Open needs_dennis items. The work log is the full list; customer rows hold
 * copies of the entries linked to them, which is where the customer name
 * comes from.
 */
export function waitingOnDennis(snapshot: SupportDeskSnapshot): DennisItem[] {
  const names = new Map<string, string>();
  for (const row of snapshot.customers?.rows ?? []) {
    for (const e of row.work ?? []) {
      if (row.name) names.set(entryKey(e), row.name);
    }
  }
  const seen = new Set<string>();
  const items: DennisItem[] = [];
  const all = [
    ...(snapshot.worklog?.entries ?? []),
    ...(snapshot.customers?.rows ?? []).flatMap((r) => r.work ?? []),
  ];
  for (const e of all) {
    if (e.category !== 'needs_dennis' || !isOpenEntry(e)) continue;
    const key = entryKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ ...e, customerName: names.get(key) || e.customer || e.contact });
  }
  return sortEntries(items) as DennisItem[];
}

function parseTime(value: string | undefined | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Freshness of the data: when the laptop built it (generated_at), falling
 * back to when the server received it.
 */
export function freshness(
  data: Pick<SupportDeskResponse, 'received_at' | 'snapshot'>,
  now: number = Date.now(),
  staleAfterMinutes: number = STALE_AFTER_MINUTES,
): { updatedAt: string | null; ageMinutes: number | null; stale: boolean } {
  const generated = parseTime(data.snapshot?.generated_at);
  const received = parseTime(data.received_at);
  const ts = generated ?? received;
  if (ts === null) return { updatedAt: null, ageMinutes: null, stale: true };
  const ageMinutes = Math.max(0, Math.floor((now - ts) / 60000));
  return {
    updatedAt: new Date(ts).toISOString(),
    ageMinutes,
    stale: ageMinutes > staleAfterMinutes,
  };
}

export function formatAge(minutes: number | null): string {
  if (minutes === null) return 'unknown';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
