'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import {
  CustomerAuditCategory, CustomerAuditItem, CustomerAuditLogResponse,
} from '../../../lib/types';
import { useAlert } from '../../../context/AlertContext';
import Header from '../../../components/Header';
import { PageLoader } from '../../../components/LoadingSpinner';
import FilterPills from '../../../components/FilterPills';
import DateTimePicker from '../../../components/DateTimePicker';
import { explainRouterLog } from '../../../lib/routerLogHints';
import { formatAmount } from '../../../lib/format';
import { connectionTypeLabel } from '../../../lib/connectionType';
import {
  formatGMT3Date, formatTimeSinceUTC, gmt3InputToISO, parseUTCToGMT3,
} from '../../../lib/dateUtils';

type Filter = 'all' | CustomerAuditCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'session', label: 'Sessions' },
  { value: 'router_log', label: 'Router messages' },
  { value: 'router', label: 'Site online/offline' },
  { value: 'billing', label: 'Payments' },
  { value: 'messages', label: 'SMS' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'change', label: 'Admin actions' },
];

const CATEGORY_LABEL: Record<CustomerAuditCategory, string> = {
  session: 'Session',
  router_log: 'Router message',
  router: 'Site',
  billing: 'Payment',
  messages: 'SMS',
  provisioning: 'Provisioning',
  change: 'Admin',
};

const SEVERITY_DOT: Record<CustomerAuditItem['severity'], string> = {
  info: 'bg-foreground-muted/40',
  warning: 'bg-warning',
  error: 'bg-danger',
};

const SEVERITY_TEXT: Record<CustomerAuditItem['severity'], string> = {
  info: 'text-foreground',
  warning: 'text-warning',
  error: 'text-danger',
};

// Read out by screen readers; the colour alone means nothing to them.
const SEVERITY_SR: Record<CustomerAuditItem['severity'], string> = {
  info: '',
  warning: 'Warning: ',
  error: 'Problem: ',
};

// Field names in the backend's edit diff, as a reseller would say them.
const FIELD_LABEL: Record<string, string> = {
  name: 'Name',
  phone: 'Phone',
  plan_id: 'Plan',
  router_id: 'Router',
  mac_address: 'MAC',
  pppoe_username: 'PPPoE username',
  pppoe_password: 'PPPoE password',
  static_ip: 'Static IP',
  expiry: 'Expiry',
};

// Machine values read better in monospace; prose and dates do not.
const MONO_LABELS = new Set(['IP', 'Previous IP', 'Device MAC', 'MAC', 'Router time', 'Reference', 'Result code']);

const PAGE_SIZE = 150;
// Every control in the toolbar shares this height so they line up.
const CONTROL_H = 'h-11';

const pad = (n: number) => String(n).padStart(2, '0');

function safeParse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    const d = parseUTCToGMT3(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function dayKey(iso: string): string {
  const d = safeParse(iso);
  return d ? `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}` : 'unknown';
}

function dayLabel(iso: string): string {
  const d = safeParse(iso);
  return d ? formatGMT3Date(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date';
}

function timeLabel(iso: string | null | undefined, seconds = true): string {
  const d = safeParse(iso);
  if (!d) return seconds ? '--:--:--' : '--:--';
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return seconds ? `${hm}:${pad(d.getUTCSeconds())}` : hm;
}

function dateTimeLabel(iso: string | null | undefined): string {
  const d = safeParse(iso);
  return d ? `${formatGMT3Date(d, { day: 'numeric', month: 'short' })}, ${timeLabel(iso, false)}` : '—';
}

function fullStamp(iso: string | null | undefined): string {
  const d = safeParse(iso);
  return d
    ? `${formatGMT3Date(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, ${timeLabel(iso)} EAT`
    : '';
}

// Three or more of these in a row (a flapping line) fold into one row.
const COLLAPSIBLE = new Set(['session_disconnected', 'session_reconnected', 'session_connected', 'router_log', 'device_offline', 'device_online']);
const COLLAPSE_MIN = 3;

type Row = { kind: 'item'; item: CustomerAuditItem } | { kind: 'run'; items: CustomerAuditItem[] };

function runKey(item: CustomerAuditItem): string {
  return item.event_type === 'router_log'
    ? `log:${explainRouterLog(item.message)?.meaning ?? item.message}`
    : item.event_type;
}

function collapseRuns(items: CustomerAuditItem[]): Row[] {
  const out: Row[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    let j = i + 1;
    if (COLLAPSIBLE.has(item.event_type)) {
      while (j < items.length && runKey(items[j]) === runKey(item)) j += 1;
    }
    if (j - i >= COLLAPSE_MIN) out.push({ kind: 'run', items: items.slice(i, j) });
    else for (let k = i; k < j; k += 1) out.push({ kind: 'item', item: items[k] });
    i = j;
  }
  return out;
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  // A cell starting with = + - @ is a formula to Excel; hotspot log lines
  // often start with "->:". A leading apostrophe makes it plain text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(items: CustomerAuditItem[], name: string) {
  const header = ['Time (EAT)', 'Category', 'What happened', 'Plain meaning', 'By', 'Severity'];
  const lines = items.map((i) => [
    fullStamp(i.occurred_at),
    CATEGORY_LABEL[i.category] ?? i.category,
    i.message,
    i.category === 'router_log' ? explainRouterLog(i.message)?.meaning ?? '' : '',
    i.actor ?? '',
    i.severity,
  ].map(csvCell).join(','));
  // The BOM tells Excel on Windows the file is UTF-8 (otherwise "—" shows as "â€”").
  const blob = new Blob(['\uFEFF', [header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, '_') || 'customer'}-activity.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// The live tile is the router's last report; older than this it is history.
const LIVE_STALE_MS = 5 * 60_000;

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ts = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  const t = new Date(ts).getTime();
  return isNaN(t) ? null : Date.now() - t;
}

function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  const t = new Date(ts).getTime();
  return !isNaN(t) && t < Date.now();
}

function formatBytes(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
  return `${i < 2 ? size.toFixed(0) : size.toFixed(1)} ${units[i]}`;
}

function detailRows(item: CustomerAuditItem): [string, string][] {
  const d = item.details || {};
  const rows: [string, string][] = [];
  const add = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    rows.push([label, String(value)]);
  };
  switch (item.category) {
    case 'router_log':
      add('Router time', d.router_time);
      if (d.time_estimated) add('Note', 'The router clock was not set, so this is when the line was read');
      break;
    case 'session': {
      const prev = (d.previous ?? null) as Record<string, unknown> | null;
      const s = prev ?? d;
      if (typeof s.started_at === 'string') add(prev ? 'Previous started' : 'Started', dateTimeLabel(s.started_at));
      if (typeof s.last_seen_at === 'string') add(prev ? 'Previous last seen' : 'Last seen', dateTimeLabel(s.last_seen_at));
      add('Downloaded', formatBytes(s.download_bytes));
      add('Uploaded', formatBytes(s.upload_bytes));
      add('IP', d.ip);
      if (prev) add('Previous IP', prev.ip);
      add('Device MAC', d.caller_id);
      add('MAC', d.mac);
      break;
    }
    case 'change':
      if (d.changes && typeof d.changes === 'object') {
        for (const [field, pair] of Object.entries(d.changes as Record<string, [string, string]>)) {
          add(
            FIELD_LABEL[field] ?? field.replace(/_/g, ' '),
            field === 'pppoe_password' ? 'changed' : `${pair?.[0] ?? '—'} → ${pair?.[1] ?? '—'}`,
          );
        }
      }
      break;
    case 'billing':
      add('Reference', d.reference);
      add('Phone', d.phone);
      add('Result code', d.result_code);
      add('Notes', d.notes);
      break;
    case 'messages':
      add('Message', d.body);
      add('Gateway', d.provider);
      break;
    case 'provisioning':
      add('State', d.state);
      add('Delivered via', d.delivered_via);
      add('MAC', d.mac);
      add('Reference', d.reference);
      break;
  }
  return rows;
}

export default function CustomerActivityClient() {
  const params = useParams();
  const customerId = Number(params.id);
  const { showAlert } = useAlert();

  const [data, setData] = useState<CustomerAuditLogResponse | null>(null);
  const [items, setItems] = useState<CustomerAuditItem[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [jumpTo, setJumpTo] = useState('');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (reloadTimer.current) clearTimeout(reloadTimer.current); }, []);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => (filter === 'all' ? undefined : [filter]), [filter]);

  // Every load bumps this and a response from an older request is dropped,
  // so a slow answer for the previous filter never overwrites the current one.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    try {
      const res = await api.getCustomerAuditLog(customerId, { before: anchor, categories, limit: PAGE_SIZE });
      if (seq !== requestSeq.current) return;
      setData(res);
      setItems(res.items);
      setNextBefore(res.next_before);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setItems([]);
      setNextBefore(null);
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [customerId, anchor, categories]);

  useEffect(() => { void load(); }, [load]);

  // Read the router's log once when the page opens, so "Router messages" is not
  // empty just because nobody pressed the button. Quiet: a failure only
  // shows as a note, never as an error toast.
  const [autoRead, setAutoRead] = useState<'idle' | 'reading' | 'done' | 'failed'>('idle');
  const autoReadStarted = useRef(false);

  // The pull waits several seconds on the router; by then the filter may have
  // changed, so it reloads through this ref to use the current one.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  // The picker reports every click (day, hour, minute); wait for it to settle
  // before reloading. The chosen minute itself is included.
  useEffect(() => {
    if (!jumpTo) { setAnchor(null); return; }
    const t = setTimeout(() => {
      setAnchor(new Date(new Date(gmt3InputToISO(jumpTo)).getTime() + 60_000).toISOString());
    }, 500);
    return () => clearTimeout(t);
  }, [jumpTo]);

  const loadMore = async () => {
    if (!nextBefore) return;
    const seq = requestSeq.current;
    setLoadingMore(true);
    try {
      // The cursor is inclusive so rows sharing the boundary second are not
      // skipped; the ones already on screen are dropped by id.
      const res = await api.getCustomerAuditLog(customerId, { cursor: nextBefore, categories, limit: PAGE_SIZE });
      if (seq !== requestSeq.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...res.items.filter((i) => !i.id || !seen.has(i.id))];
      });
      setNextBefore(res.next_before);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      showAlert('error', err instanceof Error ? err.message : 'Failed to load older activity');
    } finally {
      if (seq === requestSeq.current) setLoadingMore(false);
    }
  };

  const resetButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogConfirmRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!confirmReset) return;
    dialogConfirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !resetting) setConfirmReset(false);
    };
    document.addEventListener('keydown', onKey);
    const opener = resetButtonRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [confirmReset, resetting]);

  const resetSession = async () => {
    setResetting(true);
    try {
      const res = await api.resetCustomerSession(customerId);
      showAlert(
        'success',
        res.disconnected > 0
          ? "Session reset. The customer's router should reconnect within a minute."
          : 'The customer had no active session to reset.',
      );
      setConfirmReset(false);
      // Give the router a moment to report the new session before reloading.
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => { void loadRef.current(); }, 4000);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not reset the session');
    } finally {
      setResetting(false);
    }
  };

  const pullRouterLogs = async () => {
    setPulling(true);
    try {
      const res = await api.pullCustomerRouterLogs(customerId);
      const reach = res.router_log_starts_at
        ? ` The router's log goes back to ${dateTimeLabel(res.router_log_starts_at)}.`
        : '';
      const hidden = anchor && res.stored > 0 ? ' Clear the chosen time to see the newest lines.' : '';
      showAlert(
        'success',
        res.stored > 0
          ? `Saved ${res.stored} new router message${res.stored === 1 ? '' : 's'}.${reach}${hidden}`
          : `The router has nothing new about this customer.${reach}`,
      );
      await loadRef.current();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not reach the router');
    } finally {
      setPulling(false);
    }
  };

  const customerForRead = data?.customer;
  useEffect(() => {
    const c = customerForRead;
    if (!c || autoReadStarted.current || api.isDemoMode()) return;
    if (!c.router_id || !(c.pppoe_username || c.mac_address)) return;
    autoReadStarted.current = true;
    setAutoRead('reading');
    api.pullCustomerRouterLogs(c.id)
      .then((res) => {
        setAutoRead('done');
        if (res.stored > 0) void loadRef.current();
      })
      .catch(() => setAutoRead('failed'));
  }, [customerForRead]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: CustomerAuditItem[] }[] = [];
    for (const item of items) {
      if (!item.occurred_at) continue;
      const key = dayKey(item.occurred_at);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, label: dayLabel(item.occurred_at), items: [item] });
    }
    return out;
  }, [items]);

  if (loading && !data && !error) return <PageLoader />;

  const customer = data?.customer;
  const isPPPoE = customer?.connection_type === 'pppoe';
  const canPull = Boolean(customer?.router_id && (customer?.pppoe_username || customer?.mac_address));
  const canReset = Boolean(isPPPoE && customer?.router_id && customer?.pppoe_username);
  const identity = isPPPoE ? customer?.pppoe_username : customer?.mac_address;
  const reportAge = ageMs(data?.router_reported_at);
  // A router that stopped reporting leaves its last state in memory; past a
  // few minutes that is history, not "now".
  const live = data?.live && reportAge !== null && reportAge <= LIVE_STALE_MS ? data.live : null;
  const liveIsStale = Boolean(data?.live) && !live;
  const summary = data?.summary;

  return (
    <div>
      <Header
        title="Activity log"
        subtitle={[customer?.name || 'Customer', identity].filter(Boolean).join(' · ')}
        backHref={`/customers/${customerId}`}
      />

      {/* Phones: summary on top, then the timeline. From 1024px: the
          timeline fills the width and the summary sits in a sidebar that
          stays in view while you scroll. */}
      <div className="pb-8 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
        <aside className="space-y-4 min-w-0 lg:order-2 lg:sticky lg:top-4">
          {customer && (
            <div className="card grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 [&>div]:p-4 sm:divide-x lg:divide-x-0 divide-border">
              <SummaryTile label="Connection">
                {live ? (
                  <span className={`inline-flex items-center gap-1.5 ${live.online ? 'text-success' : 'text-foreground-muted'}`}>
                    <span className={`w-2 h-2 rounded-full ${live.online ? 'bg-success' : 'bg-foreground-muted/40'}`} />
                    {live.online ? 'Online' : 'Offline'}
                  </span>
                ) : (
                  <span className="text-foreground-muted">{liveIsStale ? 'Unknown' : 'Not reported'}</span>
                )}
                <SummaryHint>
                  {liveIsStale
                    ? `router silent since ${formatTimeSinceUTC(data?.router_reported_at) ?? '—'}`
                    : live?.online
                      ? [live.ip, live.uptime && `up ${live.uptime}`].filter(Boolean).join(' · ') || '—'
                      : live?.seen_at ? `seen ${formatTimeSinceUTC(live.seen_at) ?? '—'}` : '—'}
                </SummaryHint>
              </SummaryTile>
              <SummaryTile label="Status">
                <span className="capitalize">{customer.status ?? '—'}</span>
                <SummaryHint>
                  {!customer.expiry
                    ? 'no expiry'
                    : `${isPast(customer.expiry) ? 'expired' : 'until'} ${dateTimeLabel(customer.expiry)}`}
                </SummaryHint>
              </SummaryTile>
              <SummaryTile label="Plan">
                <span className="truncate block">{customer.plan ?? '—'}</span>
                <SummaryHint>{customer.connection_type ? connectionTypeLabel(customer.connection_type) : '—'}</SummaryHint>
              </SummaryTile>
              <SummaryTile label="Router">
                <span className="truncate block">{customer.router_name ?? '—'}</span>
                <SummaryHint>
                  {data?.router_reported_at
                    ? `reported ${formatTimeSinceUTC(data.router_reported_at) ?? '—'}`
                    : 'no live reports'}
                </SummaryHint>
              </SummaryTile>
            </div>
          )}

          {summary && (
            <dl className="card divide-y divide-border text-sm">
              <QuickFact label="Drops in last 24 h">
                <span className={summary.drops_24h >= 3 ? 'text-warning font-medium' : 'text-foreground'}>
                  {summary.drops_24h}
                </span>
                {summary.drops_24h >= 3 && (
                  <span className="text-foreground-muted"> — the line is unstable; see the router messages below</span>
                )}
              </QuickFact>
              <QuickFact label="Last drop">
                {summary.last_drop ? (
                  <>
                    <span title={fullStamp(summary.last_drop.at)}>{dateTimeLabel(summary.last_drop.at)}</span>
                    <span className="text-foreground-muted"> · {summary.last_drop.message}</span>
                  </>
                ) : 'None recorded'}
              </QuickFact>
              <QuickFact label="Last router warning">
                {summary.last_problem ? (
                  <>
                    <span title={fullStamp(summary.last_problem.at)}>{dateTimeLabel(summary.last_problem.at)}</span>
                    <span className="text-foreground-muted">
                      {' · '}
                      {explainRouterLog(summary.last_problem.message)?.meaning ?? summary.last_problem.message}
                    </span>
                  </>
                ) : 'None recorded'}
              </QuickFact>
              <QuickFact label="Last payment">
                {summary.last_payment?.at ? (
                  <>
                    <span title={fullStamp(summary.last_payment.at)}>{dateTimeLabel(summary.last_payment.at)}</span>
                    <span className="text-foreground-muted"> · {formatAmount(summary.last_payment.amount)}</span>
                  </>
                ) : 'None recorded'}
              </QuickFact>
            </dl>
          )}

        </aside>

        <div className="space-y-4 min-w-0 lg:order-1">
          <div className="card p-4 space-y-3">
            <FilterPills<Filter>
              value={filter}
              onChange={setFilter}
              options={FILTERS}
              ariaLabel="Filter activity"
              className="w-full flex-wrap"
            />

            <div className="flex flex-col xl:flex-row gap-2">
              <div className="flex-1 min-w-0 xl:min-w-[14rem] [&_.input]:h-11 [&_.input]:py-0 [&_.input]:text-sm">
                <DateTimePicker value={jumpTo} onChange={setJumpTo} />
              </div>
              {jumpTo && (
                <button
                  type="button"
                  onClick={() => setJumpTo('')}
                  className={`btn-secondary ${CONTROL_H} py-0 inline-flex items-center justify-center whitespace-nowrap`}
                >
                  Back to latest
                </button>
              )}
              {canReset && (
                <button
                  ref={resetButtonRef}
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className={`btn-secondary ${CONTROL_H} py-0 inline-flex items-center justify-center gap-2 whitespace-nowrap`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                  </svg>
                  Reset session
                </button>
              )}
              {canPull && (
                <button
                  type="button"
                  onClick={pullRouterLogs}
                  disabled={pulling}
                  className={`btn-primary ${CONTROL_H} py-0 inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50`}
                >
                  {pulling ? (
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {pulling ? 'Checking router…' : 'Check router again'}
                </button>
              )}
            </div>

            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-2">
              <p className="text-xs text-foreground-muted">
                {anchor
                  ? 'Showing activity up to the chosen time (EAT).'
                  : 'Pick a date and time (EAT) to jump to a moment.'}{' '}
                {autoRead === 'reading' && <span className="text-foreground">Checking the router… </span>}
              {autoRead === 'done' && <span className="text-foreground">Router checked just now. </span>}
              {autoRead === 'failed' && <span className="text-warning">Could not reach the router right now. </span>}
              Routers only remember their last ~1000 messages; each check saves them here.
                Sessions and router messages are kept for 60 days, site online/offline for 14 days,
                payments and changes for good.
              </p>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadCsv(items, customer?.name || `customer-${customerId}`)}
                  className="text-xs font-medium text-accent-primary hover:underline whitespace-nowrap self-start"
                >
                  Export {items.length} row{items.length === 1 ? '' : 's'} (CSV)
                </button>
              )}
            </div>
          </div>

          {error ? (
            <div className="card p-6 text-center space-y-3" role="alert">
              <p className="text-sm text-danger">Could not load the activity log. {error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className={`btn-secondary ${CONTROL_H} py-0 px-6 inline-flex items-center justify-center`}
              >
                Try again
              </button>
            </div>
          ) : loading && items.length === 0 ? (
            <div className="card p-8 flex justify-center">
              <span className="w-5 h-5 border-2 border-foreground-muted/30 border-t-accent-primary rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-foreground">
                {anchor
                  ? 'Nothing recorded before this time.'
                  : filter === 'router_log'
                    ? 'The router has said nothing about this customer yet.'
                    : 'Nothing recorded yet.'}
              </p>
              {canPull && !anchor && (
                <p className="mt-1 text-xs text-foreground-muted">
                  {autoRead === 'reading'
                    ? 'Checking the router now…'
                    : filter === 'router_log'
                      ? 'The router only logs logins, failed logins and drops. Its messages appear here when the router is checked, which happens each time this page opens.'
                      : 'Check the router to save what it is saying about this customer.'}
                </p>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="card overflow-hidden">
                <h3 className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted border-b border-border">
                  {group.label}
                </h3>
                <ol className="divide-y divide-border">
                  {collapseRuns(group.items).map((row, idx) => (
                    row.kind === 'item'
                      ? <ActivityRow key={row.item.id ?? `${group.key}-${idx}`} item={row.item} />
                      : <RepeatedRow key={`run-${row.items[0].id ?? idx}`} items={row.items} />
                  ))}
                </ol>
              </section>
            ))
          )}

          {nextBefore && !loading && !error && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={`btn-secondary ${CONTROL_H} py-0 px-6 inline-flex items-center justify-center disabled:opacity-50`}
              >
                {loadingMore ? 'Loading…' : 'Load older activity'}
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !resetting && setConfirmReset(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="card p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reset-title" className="text-lg font-semibold text-foreground">Reset this session?</h3>
            <p className="text-sm text-foreground-muted">
              {customer?.name || 'The customer'} will be disconnected for a few seconds while their router dials
              again. Their account is not changed. Use this when they are connected but have no internet.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className={`btn-secondary ${CONTROL_H} py-0 flex-1`}
              >
                Cancel
              </button>
              <button
                ref={dialogConfirmRef}
                type="button"
                onClick={() => void resetSession()}
                disabled={resetting}
                className={`btn-primary ${CONTROL_H} py-0 flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {resetting && <span className="w-4 h-4 border-2 border-black/20 border-t-black/70 rounded-full animate-spin" />}
                {resetting ? 'Resetting…' : 'Reset session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-1">{label}</p>
      <div className="text-sm font-medium text-foreground min-w-0">{children}</div>
    </div>
  );
}

function QuickFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:gap-4 lg:flex-col lg:gap-0.5">
      <dt className="sm:w-44 lg:w-auto flex-shrink-0 text-xs text-foreground-muted sm:pt-0.5 lg:pt-0">{label}</dt>
      <dd className="min-w-0 break-words [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function SummaryHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs font-normal text-foreground-muted truncate">{children}</p>;
}

function ActivityRow({ item }: { item: CustomerAuditItem }) {
  const rows = detailRows(item);
  // Raw router lines read as code; our own sentences (last disconnect) do not.
  const isRawLine = item.event_type === 'router_log';
  const hint = isRawLine ? explainRouterLog(item.message) : null;

  const body = (
    <div className="flex items-start gap-3 min-w-0">
      <time
        dateTime={item.occurred_at ?? undefined}
        title={fullStamp(item.occurred_at)}
        className="w-[4.25rem] flex-shrink-0 pt-0.5 font-mono text-xs text-foreground-muted tabular-nums"
      >
        {timeLabel(item.occurred_at)}
      </time>
      <span
        className={`mt-[7px] w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug break-words [overflow-wrap:anywhere] ${isRawLine ? 'font-mono text-[13px]' : ''} ${SEVERITY_TEXT[item.severity] ?? ''}`}>
          {SEVERITY_SR[item.severity] && <span className="sr-only">{SEVERITY_SR[item.severity]}</span>}
          {item.message}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-foreground-muted leading-snug">
            {hint.meaning}{hint.action && <> {hint.action}</>}
          </p>
        )}
        <p className="mt-1 text-[11px] text-foreground-muted">
          {CATEGORY_LABEL[item.category] ?? item.category}
          {item.actor && <> · by {item.actor}</>}
        </p>
      </div>
      {rows.length > 0 && (
        <svg
          className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground-muted transition-transform group-open/row:rotate-90"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (rows.length === 0) {
    return <li className="px-4 py-3">{body}</li>;
  }
  return (
    <li>
      <details className="group/row">
        <summary className="list-none cursor-pointer px-4 py-3 hover:bg-background-tertiary/40 transition-colors [&::-webkit-details-marker]:hidden">
          {body}
        </summary>
        <dl className="mr-4 mb-3 ml-4 sm:ml-[6.5rem] rounded-lg bg-background-tertiary/60 px-3 py-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-foreground-muted whitespace-nowrap">{label}</dt>
              <dd className={`min-w-0 text-foreground break-words [overflow-wrap:anywhere] ${MONO_LABELS.has(label) ? 'font-mono' : 'whitespace-pre-wrap'}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}

const RUN_LABEL: Record<string, string> = {
  session_reconnected: 'Dropped and reconnected',
  session_disconnected: 'Session ended',
  session_connected: 'Connected',
  device_offline: 'Left the hotspot',
  device_online: 'Came online',
};

function RepeatedRow({ items }: { items: CustomerAuditItem[] }) {
  // Newest first, so the run spans from the last item to the first.
  const first = items[items.length - 1];
  const last = items[0];
  const worst = items.some((i) => i.severity === 'error') ? 'error' : items.some((i) => i.severity === 'warning') ? 'warning' : 'info';
  const isRawLine = first.event_type === 'router_log';
  const label = RUN_LABEL[first.event_type] ?? (isRawLine ? 'Similar router lines' : 'Repeated');
  const what = isRawLine ? `Latest: ${last.message}` : 'Each one is listed when you open this row.';
  const hint = isRawLine ? explainRouterLog(last.message) : null;
  return (
    <li>
      <details className="group/run">
        <summary className="list-none cursor-pointer px-4 py-3 hover:bg-background-tertiary/40 transition-colors [&::-webkit-details-marker]:hidden">
          <div className="flex items-start gap-3 min-w-0">
            <time
              dateTime={last.occurred_at ?? undefined}
              title={fullStamp(last.occurred_at)}
              className="w-[4.25rem] flex-shrink-0 pt-0.5 font-mono text-xs text-foreground-muted tabular-nums"
            >
              {timeLabel(last.occurred_at)}
            </time>
            <span className={`mt-[7px] w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[worst]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`text-sm leading-snug break-words [overflow-wrap:anywhere] ${SEVERITY_TEXT[worst]}`}>
                {SEVERITY_SR[worst] && <span className="sr-only">{SEVERITY_SR[worst]}</span>}
                {label} {items.length}× between {timeLabel(first.occurred_at, false)} and {timeLabel(last.occurred_at, false)}
              </p>
              <p className={`mt-1 text-xs text-foreground-muted leading-snug break-words [overflow-wrap:anywhere] ${isRawLine ? 'font-mono' : ''}`}>{what}</p>
              {hint && <p className="mt-1 text-xs text-foreground-muted leading-snug">{hint.meaning}{hint.action && <> {hint.action}</>}</p>}
              <p className="mt-1 text-[11px] text-foreground-muted">
                {CATEGORY_LABEL[first.category] ?? first.category} · tap to see each
              </p>
            </div>
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground-muted transition-transform group-open/run:rotate-90"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </summary>
        <ol className="border-t border-border bg-background-tertiary/30 divide-y divide-border">
          {items.map((item, idx) => <ActivityRow key={item.id ?? idx} item={item} />)}
        </ol>
      </details>
    </li>
  );
}
