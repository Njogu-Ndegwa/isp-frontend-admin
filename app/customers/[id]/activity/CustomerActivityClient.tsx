'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  formatGMT3Date, formatTimeSinceUTC, gmt3InputToISO, parseUTCToGMT3,
} from '../../../lib/dateUtils';

type Filter = 'all' | CustomerAuditCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'session', label: 'Sessions' },
  { value: 'router_log', label: 'Router log' },
  { value: 'billing', label: 'Payments' },
  { value: 'messages', label: 'SMS' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'change', label: 'Admin actions' },
];

const CATEGORY_LABEL: Record<CustomerAuditCategory, string> = {
  session: 'Session',
  router_log: 'Router log',
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

// Machine values read better in monospace; prose and dates do not.
const MONO_LABELS = new Set(['IP', 'Caller-id (MAC)', 'MAC', 'Router time', 'Topics', 'Reference', 'Result code']);

const PAGE_SIZE = 150;
// Every control in the toolbar shares this height so they line up.
const CONTROL_H = 'h-11';

const pad = (n: number) => String(n).padStart(2, '0');

function dayKey(iso: string): string {
  const d = parseUTCToGMT3(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function dayLabel(iso: string): string {
  return formatGMT3Date(parseUTCToGMT3(iso), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(iso: string, seconds = true): string {
  const d = parseUTCToGMT3(iso);
  const hm = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return seconds ? `${hm}:${pad(d.getUTCSeconds())}` : hm;
}

function dateTimeLabel(iso: string): string {
  return `${formatGMT3Date(parseUTCToGMT3(iso), { day: 'numeric', month: 'short' })}, ${timeLabel(iso, false)}`;
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
      add('Topics', d.topics);
      add('Matched on', d.matched_on === 'mac' ? 'MAC / caller-id' : 'Username');
      if (d.time_estimated) add('Note', 'Router clock was not set; time is when the line was read');
      break;
    case 'session': {
      const prev = (d.previous ?? null) as Record<string, unknown> | null;
      const s = prev ?? d;
      if (typeof s.started_at === 'string') add(prev ? 'Previous started' : 'Started', dateTimeLabel(s.started_at));
      if (typeof s.last_seen_at === 'string') add(prev ? 'Previous last seen' : 'Last seen', dateTimeLabel(s.last_seen_at));
      add('Downloaded', formatBytes(s.download_bytes));
      add('Uploaded', formatBytes(s.upload_bytes));
      add('IP', d.ip);
      add('Caller-id (MAC)', d.caller_id);
      add('MAC', d.mac);
      break;
    }
    case 'change':
      if (d.changes && typeof d.changes === 'object') {
        for (const [field, pair] of Object.entries(d.changes as Record<string, [string, string]>)) {
          add(field.replace(/_/g, ' '), `${pair[0]} → ${pair[1]}`);
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
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => (filter === 'all' ? undefined : [filter]), [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomerAuditLog(customerId, { before: anchor, categories, limit: PAGE_SIZE });
      setData(res);
      setItems(res.items);
      setNextBefore(res.next_before);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [customerId, anchor, categories]);

  useEffect(() => { void load(); }, [load]);

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
    setLoadingMore(true);
    try {
      const res = await api.getCustomerAuditLog(customerId, { before: nextBefore, categories, limit: PAGE_SIZE });
      setItems((prev) => [...prev, ...res.items]);
      setNextBefore(res.next_before);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load older activity');
    } finally {
      setLoadingMore(false);
    }
  };

  const pullRouterLogs = async () => {
    setPulling(true);
    try {
      const res = await api.pullCustomerRouterLogs(customerId);
      const reach = res.router_log_starts_at
        ? ` The router's log goes back to ${dateTimeLabel(res.router_log_starts_at)}.`
        : '';
      showAlert(
        'success',
        res.stored > 0
          ? `Saved ${res.stored} new router log line${res.stored === 1 ? '' : 's'}.${reach}`
          : `Nothing new about this customer in the router log.${reach}`,
      );
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not read the router log');
    } finally {
      setPulling(false);
    }
  };

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

  if (loading && !data) return <PageLoader />;

  const customer = data?.customer;
  const isPPPoE = customer?.connection_type === 'pppoe';
  const canPull = Boolean(customer?.router_id && (customer?.pppoe_username || customer?.mac_address));
  const identity = isPPPoE ? customer?.pppoe_username : customer?.mac_address;

  return (
    <div>
      <Header
        title="Activity log"
        subtitle={[customer?.name || 'Customer', identity].filter(Boolean).join(' · ')}
        backHref={`/customers/${customerId}`}
      />

      <div className="max-w-4xl space-y-4 pb-8">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
        )}

        {customer && (
          <div className="card grid grid-cols-2 sm:grid-cols-4 divide-border [&>div]:p-4 sm:divide-x">
            <SummaryTile label="Connection">
              {data?.live ? (
                <span className={`inline-flex items-center gap-1.5 ${data.live.online ? 'text-emerald-500' : 'text-foreground-muted'}`}>
                  <span className={`w-2 h-2 rounded-full ${data.live.online ? 'bg-emerald-500' : 'bg-foreground-muted/40'}`} />
                  {data.live.online ? 'Online' : 'Offline'}
                </span>
              ) : (
                <span className="text-foreground-muted">Not reported</span>
              )}
              <SummaryHint>
                {data?.live?.online
                  ? [data.live.ip, data.live.uptime && `up ${data.live.uptime}`].filter(Boolean).join(' · ')
                  : data?.live?.seen_at ? `seen ${formatTimeSinceUTC(data.live.seen_at)}` : '—'}
              </SummaryHint>
            </SummaryTile>
            <SummaryTile label="Status">
              <span className="capitalize">{customer.status ?? '—'}</span>
              <SummaryHint>{customer.expiry ? `until ${dateTimeLabel(customer.expiry)}` : 'no expiry'}</SummaryHint>
            </SummaryTile>
            <SummaryTile label="Plan">
              <span className="truncate block">{customer.plan ?? '—'}</span>
              <SummaryHint>{isPPPoE ? 'PPPoE' : customer.connection_type === 'hotspot' ? 'Hotspot' : '—'}</SummaryHint>
            </SummaryTile>
            <SummaryTile label="Router">
              <span className="truncate block">{customer.router_name ?? '—'}</span>
              <SummaryHint>{identity ?? '—'}</SummaryHint>
            </SummaryTile>
          </div>
        )}

        <div className="card p-4 space-y-3">
          <FilterPills<Filter>
            value={filter}
            onChange={setFilter}
            options={FILTERS}
            ariaLabel="Filter activity"
            className="w-full"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <div className={`flex-1 min-w-0 [&_.input]:h-11 [&_.input]:py-0 [&_.input]:text-sm`}>
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
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {pulling ? 'Reading router…' : 'Pull router logs'}
              </button>
            )}
          </div>

          <p className="text-xs text-foreground-muted">
            {jumpTo
              ? 'Showing activity up to the chosen time (EAT).'
              : 'Pick a date and time (EAT) to jump to a moment.'}{' '}
            The router keeps only its last ~1000 log lines, so router log entries appear here once they have been pulled.
          </p>
        </div>

        {loading && data ? (
          <div className="card p-8 flex justify-center">
            <span className="w-5 h-5 border-2 border-foreground-muted/30 border-t-accent-primary rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-foreground">
              {jumpTo ? 'Nothing recorded before this time.' : 'Nothing recorded yet.'}
            </p>
            {canPull && !jumpTo && (
              <p className="mt-1 text-xs text-foreground-muted">
                Pull router logs to save what the router is saying about this customer.
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
                {group.items.map((item, idx) => (
                  <ActivityRow key={item.id ?? `${group.key}-${idx}`} item={item} />
                ))}
              </ol>
            </section>
          ))
        )}

        {nextBefore && !loading && (
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

function SummaryHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs font-normal text-foreground-muted truncate">{children}</p>;
}

function ActivityRow({ item }: { item: CustomerAuditItem }) {
  const rows = detailRows(item);
  const isLog = item.category === 'router_log';

  const body = (
    <div className="flex items-start gap-3 min-w-0">
      <span className="w-[4.25rem] flex-shrink-0 pt-0.5 font-mono text-xs text-foreground-muted tabular-nums">
        {item.occurred_at ? timeLabel(item.occurred_at) : '--:--:--'}
      </span>
      <span className={`mt-[7px] w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug break-words ${isLog ? 'font-mono text-[13px]' : ''} ${SEVERITY_TEXT[item.severity] ?? ''}`}>
          {item.message}
        </p>
        <p className="mt-1 text-[11px] text-foreground-muted">
          {CATEGORY_LABEL[item.category] ?? item.category}
          {item.actor && <> · by {item.actor}</>}
        </p>
      </div>
      {rows.length > 0 && (
        <svg
          className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground-muted transition-transform group-open:rotate-90"
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
      <details className="group">
        <summary className="list-none cursor-pointer px-4 py-3 hover:bg-background-tertiary/40 transition-colors [&::-webkit-details-marker]:hidden">
          {body}
        </summary>
        <dl className="mr-4 mb-3 ml-4 sm:ml-[6.5rem] rounded-lg bg-background-tertiary/60 px-3 py-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-foreground-muted capitalize whitespace-nowrap">{label}</dt>
              <dd className={`text-foreground break-words ${MONO_LABELS.has(label) ? 'font-mono' : 'whitespace-pre-wrap'}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}
