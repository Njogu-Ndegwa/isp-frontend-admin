'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  CustomerAuditCategory, CustomerAuditItem, CustomerAuditLogResponse,
} from '../../../lib/types';
import { useAlert } from '../../../context/AlertContext';
import Header from '../../../components/Header';
import { PageLoader } from '../../../components/LoadingSpinner';
import {
  formatGMT3Date, formatTimeSinceUTC, gmt3InputToISO, parseUTCToGMT3,
} from '../../../lib/dateUtils';

type Filter = 'all' | CustomerAuditCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'session', label: 'Connection' },
  { key: 'router_log', label: 'Router says' },
  { key: 'billing', label: 'Payments' },
  { key: 'provisioning', label: 'Provisioning' },
  { key: 'change', label: 'Changes' },
];

const CATEGORY_LABEL: Record<CustomerAuditCategory, string> = {
  session: 'Connection',
  router_log: 'Router log',
  billing: 'Payment',
  provisioning: 'Provisioning',
  change: 'Change',
};

const SEVERITY_DOT: Record<CustomerAuditItem['severity'], string> = {
  info: 'bg-foreground-muted/40',
  warning: 'bg-warning',
  error: 'bg-danger',
};

const PAGE_SIZE = 150;

function dayKey(iso: string): string {
  const d = parseUTCToGMT3(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function dayLabel(iso: string): string {
  return formatGMT3Date(parseUTCToGMT3(iso), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(iso: string): string {
  const d = parseUTCToGMT3(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function detailRows(item: CustomerAuditItem): [string, string][] {
  const d = item.details || {};
  const rows: [string, string][] = [];
  const add = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    rows.push([label, String(value)]);
  };
  if (item.category === 'router_log') {
    add('Router time', d.router_time);
    add('Topics', d.topics);
    add('Matched on', d.matched_on === 'mac' ? 'MAC / caller-id' : 'PPPoE username');
    if (d.time_estimated) add('Note', 'Router clock was not set; time is when the line was read');
  } else if (item.category === 'session') {
    add('IP', d.ip);
    add('Previous IP', d.previous_ip);
    add('Caller-id (MAC)', d.caller_id);
    add('MAC', d.mac);
  } else if (item.category === 'change' && d.changes && typeof d.changes === 'object') {
    for (const [field, pair] of Object.entries(d.changes as Record<string, [string, string]>)) {
      add(field.replace(/_/g, ' '), `${pair[0]} → ${pair[1]}`);
    }
  } else if (item.category === 'billing') {
    add('Reference', d.reference);
    add('Phone', d.phone);
    add('Result code', d.result_code);
    add('Notes', d.notes);
  } else if (item.category === 'provisioning') {
    add('State', d.state);
    add('Delivered via', d.delivered_via);
    add('MAC', d.mac);
    add('Reference', d.reference);
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
        ? ` The router's log currently goes back to ${dayLabel(res.router_log_starts_at)} ${timeLabel(res.router_log_starts_at)}.`
        : '';
      showAlert(
        'success',
        res.stored > 0
          ? `Saved ${res.stored} new router log line${res.stored === 1 ? '' : 's'} about this customer.${reach}`
          : `No new lines about this customer in the router log (${res.lines_read} lines checked).${reach}`,
      );
      await load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Could not read the router log');
    } finally {
      setPulling(false);
    }
  };

  const applyJump = () => {
    if (!jumpTo) return;
    // Show the chosen minute and everything before it.
    const iso = new Date(new Date(gmt3InputToISO(jumpTo)).getTime() + 60_000).toISOString();
    setAnchor(iso);
  };

  const clearJump = () => {
    setJumpTo('');
    setAnchor(null);
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
  const subtitleParts = [
    customer?.name || 'Customer',
    isPPPoE ? (customer?.pppoe_username ? `PPPoE ${customer.pppoe_username}` : 'PPPoE') : customer?.mac_address,
    customer?.router_name,
  ].filter(Boolean);

  return (
    <div>
      <Header
        title="Activity log"
        subtitle={subtitleParts.join(' · ')}
        backHref={`/customers/${customerId}`}
      />

      <div className="max-w-3xl mx-auto space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
        )}

        {customer && (
          <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {data?.live ? (
              data.live.online ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online now
                  {data.live.ip && <span className="font-mono text-xs text-foreground-muted">{data.live.ip}</span>}
                  {data.live.uptime && <span className="text-xs text-foreground-muted">up {data.live.uptime}</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-foreground-muted font-medium">
                  <span className="w-2 h-2 rounded-full bg-foreground-muted/40" /> Offline
                  {data.live.seen_at && (
                    <span className="text-xs">last seen {formatTimeSinceUTC(data.live.seen_at)}</span>
                  )}
                </span>
              )
            ) : (
              <span className="text-foreground-muted text-xs">Live status not reported by this router</span>
            )}
            <span className="text-foreground-muted">
              Status <span className="text-foreground font-medium">{customer.status ?? '-'}</span>
            </span>
            {customer.expiry && (
              <span className="text-foreground-muted">
                Expires <span className="text-foreground font-medium">
                  {dayLabel(customer.expiry)} {timeLabel(customer.expiry).slice(0, 5)}
                </span>
              </span>
            )}
            {customer.plan && (
              <span className="text-foreground-muted">
                Plan <span className="text-foreground font-medium">{customer.plan}</span>
              </span>
            )}
          </div>
        )}

        <div className="card p-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter activity">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === f.key
                    ? 'bg-accent-primary text-background border-accent-primary'
                    : 'border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label htmlFor="jump-to" className="block text-xs font-medium text-foreground-muted mb-1">
                Go to a moment (EAT)
              </label>
              <div className="flex gap-2">
                <input
                  id="jump-to"
                  type="datetime-local"
                  value={jumpTo}
                  onChange={(e) => setJumpTo(e.target.value)}
                  className="input flex-1 min-w-0"
                />
                <button type="button" onClick={applyJump} disabled={!jumpTo} className="btn-secondary disabled:opacity-50">
                  Go
                </button>
              </div>
            </div>
            {canPull && (
              <button
                type="button"
                onClick={pullRouterLogs}
                disabled={pulling}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                title="Read the router's log now and save every line about this customer"
              >
                {pulling && <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />}
                {pulling ? 'Reading router…' : 'Pull router logs now'}
              </button>
            )}
          </div>

          {anchor && (
            <div className="flex items-center justify-between text-xs text-foreground-muted bg-background-tertiary rounded-lg px-3 py-2">
              <span>Showing activity up to {dayLabel(anchor)} {timeLabel(anchor).slice(0, 5)} EAT</span>
              <button type="button" onClick={clearJump} className="text-accent-primary hover:underline">
                Back to latest
              </button>
            </div>
          )}

          <p className="text-[11px] text-foreground-muted leading-relaxed">
            The router keeps only its last ~1000 log lines in memory. Lines about this customer are saved
            whenever they are pulled, so older &ldquo;Router says&rdquo; entries are only here if they were saved
            at the time. Connection events come from the router&rsquo;s live reports.
          </p>
        </div>

        {loading && data && (
          <div className="text-center text-xs text-foreground-muted">Loading…</div>
        )}

        {!loading && groups.length === 0 && (
          <div className="card p-8 text-center text-sm text-foreground-muted">
            {anchor ? 'Nothing recorded before this moment.' : 'Nothing recorded for this customer yet.'}
            {canPull && !anchor && (
              <p className="mt-2 text-xs">Use &ldquo;Pull router logs now&rdquo; to save what the router is saying about them.</p>
            )}
          </div>
        )}

        {groups.map((group) => (
          <section key={group.key} className="card overflow-hidden">
            <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted bg-background-tertiary/60 border-b border-border">
              {group.label}
            </h3>
            <ol className="divide-y divide-border">
              {group.items.map((item, idx) => (
                <ActivityRow key={item.id ?? `${group.key}-${idx}`} item={item} />
              ))}
            </ol>
          </section>
        ))}

        {nextBefore && (
          <div className="flex justify-center pb-6">
            <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-secondary disabled:opacity-50">
              {loadingMore ? 'Loading…' : 'Load older activity'}
            </button>
          </div>
        )}

        {customer && (
          <div className="text-center pb-6">
            <Link href={`/customers/${customerId}`} className="text-xs text-accent-primary hover:underline">
              ← Back to customer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: CustomerAuditItem }) {
  const rows = detailRows(item);
  const isLog = item.category === 'router_log';
  const body = (
    <div className="flex gap-3 min-w-0">
      <div className="flex flex-col items-center pt-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-mono text-xs text-foreground-muted tabular-nums">
            {item.occurred_at ? timeLabel(item.occurred_at) : '--:--:--'}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted">
            {CATEGORY_LABEL[item.category] ?? item.category}
          </span>
          {item.actor && <span className="text-[11px] text-foreground-muted">by {item.actor}</span>}
        </div>
        <p
          className={`mt-0.5 text-sm break-words ${isLog ? 'font-mono text-[13px]' : ''} ${
            item.severity === 'error' ? 'text-danger' : item.severity === 'warning' ? 'text-warning' : 'text-foreground'
          }`}
        >
          {item.message}
        </p>
      </div>
    </div>
  );

  if (rows.length === 0) {
    return <li className="px-4 py-3">{body}</li>;
  }
  return (
    <li className="px-4 py-3">
      <details className="group">
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{body}</summary>
        <dl className="mt-2 ml-5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-foreground-muted capitalize">{label}</dt>
              <dd className="font-mono text-foreground break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}
