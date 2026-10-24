'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import Tabs from '../../components/Tabs';
import FilterPills from '../../components/FilterPills';
import SearchInput from '../../components/SearchInput';
import MobileDataCard from '../../components/MobileDataCard';
import { SkeletonCard } from '../../components/LoadingSpinner';
import {
  CUSTOMER_STATUSES,
  CustomerScope,
  DECISION_NOTE_MAX,
  DecisionAction,
  DennisItem,
  SupportDecision,
  STALE_AFTER_MINUTES,
  SupportCustomerRow,
  SupportCustomerStatus,
  SupportDeskResponse,
  SupportWorkEntry,
  WORK_CATEGORIES,
  categoryLabel,
  countByStatus,
  customerStatusMeta,
  decisionBlocksButtons,
  decisionStatusLabel,
  filterCustomers,
  formatAge,
  freshness,
  groupByCategory,
  isOpenEntry,
  isWaitingOnDennis,
  latestDecisions,
  mergeDecisions,
  openPromises,
  outcomeClassName,
  scopeCustomers,
  sortEntries,
  validateDecisionNote,
  waitingOnDennis,
} from '../../lib/supportDesk';

type TabValue = 'customers' | 'worklog' | 'dennis';
type StatusFilter = SupportCustomerStatus | 'all';

const PAGE_SIZE = 40;
const REFRESH_MS = 2 * 60 * 1000;
const TZ = 'Africa/Nairobi';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDateTime = (value: string | null | undefined): string => {
  try {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-KE', {
      timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch {
    return '-';
  }
};

// "09:40" today, "23 Oct 09:40" on another day (Nairobi time).
const formatClock = (value: string | null | undefined): string => {
  try {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const day = (x: Date) => x.toLocaleDateString('en-KE', { timeZone: TZ });
    const time = d.toLocaleTimeString('en-KE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    if (day(d) === day(new Date())) return time;
    return `${d.toLocaleDateString('en-KE', { timeZone: TZ, day: 'numeric', month: 'short' })} ${time}`;
  } catch {
    return '-';
  }
};

// Work log entries carry a local (Nairobi) date "2026-10-23" and time "13:26".
const formatEntryWhen = (e: SupportWorkEntry): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date || '');
  const day = m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ''}` : '';
  return [day, e.at].filter(Boolean).join(' · ') || '-';
};

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

function WorkEntryRow({ entry, showCategory = true, who }: { entry: SupportWorkEntry; showCategory?: boolean; who?: string }) {
  const open = (entry.category === 'promise' && isOpenEntry(entry)) || isWaitingOnDennis(entry);
  const meta = [who, entry.ticket].filter(Boolean).join(' · ');
  return (
    <li className={`py-3 ${open ? 'pl-3 border-l-2 border-amber-500/60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[11px] text-foreground-muted tabular-nums">{formatEntryWhen(entry)}</span>
            {showCategory && (
              <Chip label={categoryLabel(entry.category)} className="bg-background-tertiary text-foreground-muted border-border" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground break-words">{entry.title || '-'}</p>
          {meta && <p className="text-xs text-foreground-muted mt-0.5">{meta}</p>}
          {entry.detail && <p className="text-xs text-foreground-muted mt-1 break-words">{entry.detail}</p>}
          {entry.ref && /^https:\/\//.test(entry.ref) && (
            <a href={entry.ref} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary mt-1 inline-block">
              Open link
            </a>
          )}
        </div>
        <Chip
          label={(entry.outcome || 'open') + (entry.note ? ` · ${entry.note}` : '')}
          className={`${outcomeClassName(entry.outcome)} flex-shrink-0 max-w-[45%] truncate`}
        />
      </div>
    </li>
  );
}

function CustomerDetails({ row }: { row: SupportCustomerRow }) {
  const promises = openPromises(row);
  const work = sortEntries(row.work ?? []);
  return (
    <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
      {row.snippet && <p className="text-foreground-muted text-xs break-words">&ldquo;{row.snippet}&rdquo;</p>}
      <div className="flex flex-wrap gap-1.5">
        {row.class && <Chip label={row.class} className="bg-background-tertiary text-foreground-muted border-border" />}
        {row.billing_role && <Chip label={row.billing_role} className="bg-background-tertiary text-foreground-muted border-border" />}
        {row.handover && <Chip label="Handover" className="bg-orange-500/10 text-orange-500 border-orange-500/20" />}
        {(row.tickets ?? []).map((t) => (
          <Chip key={t} label={t} className="bg-background-tertiary text-foreground-muted border-border" />
        ))}
      </div>
      {promises.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
            Open promises ({promises.length})
          </h4>
          <ul className="divide-y divide-border/50">
            {promises.map((e, i) => <WorkEntryRow key={`p-${i}`} entry={e} showCategory={false} />)}
          </ul>
        </div>
      )}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-1">
          Work log ({work.length})
        </h4>
        {work.length === 0 ? (
          <p className="text-xs text-foreground-muted">No work logged for this customer yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {work.map((e, i) => <WorkEntryRow key={`w-${i}`} entry={e} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function CustomersTab({ rows, scopeLabel, notes }: { rows: SupportCustomerRow[]; scopeLabel: string; notes?: string }) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [promisesOnly, setPromisesOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const counts = useMemo(() => countByStatus(rows), [rows]);
  const filtered = useMemo(
    () => filterCustomers(rows, { status, query, promisesOnly }),
    [rows, status, query, promisesOnly],
  );
  // Changing a filter starts the list from the top again.
  const changeStatus = (v: StatusFilter) => { setStatus(v); setLimit(PAGE_SIZE); };
  const changeQuery = (v: string) => { setQuery(v); setLimit(PAGE_SIZE); };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <SearchInput value={query} onChange={changeQuery} placeholder="Search name, ticket or work" />
        <FilterPills<StatusFilter>
          value={status}
          onChange={changeStatus}
          ariaLabel="Customer status"
          className="max-w-full"
          options={[
            { value: 'all', label: 'All', count: counts.all },
            ...CUSTOMER_STATUSES.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] })),
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-foreground-muted select-none">
          <input type="checkbox" checked={promisesOnly} onChange={(e) => { setPromisesOnly(e.target.checked); setLimit(PAGE_SIZE); }} className="w-4 h-4" />
          Only customers with open promises
        </label>
        <p className="text-xs text-foreground-muted">
          {filtered.length} of {rows.length} customers · {scopeLabel}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-sm text-foreground-muted">No customers match.</div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, limit).map((row) => {
            const meta = customerStatusMeta(row.status);
            const isOpen = expanded === row.id;
            return (
              <MobileDataCard
                key={row.id}
                id={row.id}
                layout="compact"
                title={row.name || 'Unnamed chat'}
                subtitle={formatDateTime(row.window?.last || row.last_at)}
                avatar={{ text: (row.name || '?').trim().charAt(0).toUpperCase() || '?', color: meta.variant === 'danger' ? 'danger' : meta.variant === 'warning' ? 'warning' : meta.variant === 'success' ? 'success' : 'info' }}
                status={{ label: meta.label, variant: meta.variant }}
                badge={row.open_promises ? { label: `${row.open_promises} promise${row.open_promises === 1 ? '' : 's'}`, variant: 'warning' } : undefined}
                secondary={{
                  left: <span className="text-xs text-foreground-muted">{row.snippet ? row.snippet.slice(0, 90) : `${row.work?.length ?? 0} work entries`}</span>,
                  right: isOpen ? 'Hide' : 'Details',
                }}
                onClick={() => setExpanded(isOpen ? null : row.id)}
                expandableContent={isOpen ? <CustomerDetails row={row} /> : undefined}
              />
            );
          })}
          {filtered.length > limit && (
            <button type="button" className="btn-secondary w-full" onClick={() => setLimit(limit + PAGE_SIZE)}>
              Show more ({filtered.length - limit} left)
            </button>
          )}
        </div>
      )}
      {notes && <p className="text-xs text-foreground-muted">{notes}</p>}
    </div>
  );
}

function WorklogTab({ entries }: { entries: SupportWorkEntry[] }) {
  const [category, setCategory] = useState<string>('all');
  const groups = useMemo(() => groupByCategory(entries), [entries]);
  const shown = category === 'all' ? groups : groups.filter((g) => g.category === category);

  if (entries.length === 0) {
    return <div className="card p-6 text-center text-sm text-foreground-muted">Nothing in the work log yet.</div>;
  }
  return (
    <div className="space-y-4">
      <FilterPills<string>
        value={category}
        onChange={setCategory}
        ariaLabel="Work log category"
        className="max-w-full"
        options={[
          { value: 'all', label: 'All', count: entries.length },
          ...groups.map((g) => ({ value: g.category, label: categoryLabel(g.category), count: g.entries.length })),
        ]}
      />
      {shown.map((g) => {
        const hint = WORK_CATEGORIES.find((c) => c.value === g.category)?.hint;
        const openCount = g.entries.filter(isOpenEntry).length;
        return (
          <section key={g.category} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">{categoryLabel(g.category)}</h3>
              <span className="text-xs text-foreground-muted">
                {g.entries.length}{['promise', 'needs_dennis'].includes(g.category) && openCount ? ` · ${openCount} open` : ''}
              </span>
            </div>
            {hint && <p className="text-xs text-foreground-muted mt-0.5">{hint}</p>}
            <ul className="divide-y divide-border/50 mt-2">
              {g.entries.map((e, i) => (
                <WorkEntryRow key={i} entry={e} showCategory={false} who={e.customer || e.contact} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

type DecideFn = (itemId: string, action: DecisionAction, note: string) => Promise<void>;

const DECISION_COPY: Record<DecisionAction, { confirm: string; hint: string }> = {
  go: { confirm: 'Confirm go ahead', hint: 'The agent starts on this item on its next run.' },
  close: { confirm: 'Confirm close', hint: 'The item is closed in the work log as not relevant.' },
};

function DecisionControls({ item, decision, onDecide }: { item: DennisItem; decision?: SupportDecision; onDecide: DecideFn }) {
  const [mode, setMode] = useState<DecisionAction | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item.id) {
    return (
      <p className="text-[11px] text-foreground-muted mt-2">
        No item id in this snapshot yet. The buttons appear after the laptop rebuilds the dashboard.
      </p>
    );
  }
  const itemId = item.id;
  const blocked = decisionBlocksButtons(decision);
  const noteError = validateDecisionNote(note);

  const submit = async () => {
    if (!mode || noteError) return;
    setBusy(true);
    setError(null);
    try {
      await onDecide(itemId, mode, note.trim());
      setMode(null);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the decision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 mb-2 space-y-2">
      {decision && (
        <p className={`text-xs font-medium ${decision.consumed_at ? 'text-emerald-500' : 'text-blue-400'}`} role="status">
          {decisionStatusLabel(decision, formatClock)}
          {decision.note ? <span className="font-normal text-foreground-muted"> · &ldquo;{decision.note}&rdquo;</span> : null}
        </p>
      )}
      {!blocked && !mode && (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="btn-primary min-h-[44px] sm:min-h-0 text-sm"
            onClick={() => { setMode('go'); setError(null); }}
          >
            Go ahead
          </button>
          <button
            type="button"
            className="btn-secondary min-h-[44px] sm:min-h-0 text-sm"
            onClick={() => { setMode('close'); setError(null); }}
          >
            Close (not relevant)
          </button>
        </div>
      )}
      {!blocked && mode && (
        <div className="rounded-lg border border-border bg-background-secondary p-3 space-y-2">
          <label className="block text-xs text-foreground-muted" htmlFor={`note-${itemId}`}>
            Note for the agent (optional)
          </label>
          <textarea
            id={`note-${itemId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={DECISION_NOTE_MAX}
            rows={2}
            className="input w-full text-base sm:text-sm"
            placeholder={mode === 'go' ? 'e.g. use the 4K Net key, tell him Monday' : 'e.g. already sorted on a call'}
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-2 text-[11px] text-foreground-muted">
            <span>{DECISION_COPY[mode].hint}</span>
            <span className="tabular-nums flex-shrink-0">{note.length}/{DECISION_NOTE_MAX}</span>
          </div>
          {noteError && <p className="text-xs text-red-500">{noteError}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              className={`${mode === 'go' ? 'btn-primary' : 'btn-danger'} min-h-[44px] sm:min-h-0 text-sm`}
              onClick={submit}
              disabled={busy || !!noteError}
            >
              {busy ? 'Sending…' : DECISION_COPY[mode].confirm}
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[44px] sm:min-h-0 text-sm"
              onClick={() => { setMode(null); setError(null); }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    </div>
  );
}

function DennisTab({ items, decisions, onDecide }: { items: DennisItem[]; decisions: Map<string, SupportDecision>; onDecide: DecideFn }) {
  if (items.length === 0) {
    return <div className="card p-6 text-center text-sm text-foreground-muted">Nothing is waiting on you.</div>;
  }
  return (
    <div className="card p-4">
      <p className="text-xs text-foreground-muted">
        Open items the support agent needs a decision or approval on. Go ahead tells the agent to start; Close drops the item as not relevant.
      </p>
      <ul className="divide-y divide-border/50 mt-2">
        {items.map((e, i) => (
          <li key={e.id || i}>
            <ul><WorkEntryRow entry={e} showCategory={false} who={e.customerName} /></ul>
            <DecisionControls item={e} decision={e.id ? decisions.get(e.id) : undefined} onDecide={onDecide} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function decisionErrorMessage(err: unknown): string {
  const status = err instanceof ApiError ? err.status : undefined;
  if (status === 404) return 'This item is no longer open (closed or changed on the laptop). Refresh to see the latest list.';
  if (status === 409) return 'A different decision on this item is still waiting for the agent.';
  if (status === 403) return 'Only the platform admin can decide, and not while viewing as a reseller.';
  if (status === 422) return 'The note is too long or the item id is invalid.';
  return err instanceof Error ? err.message : 'Could not send the decision';
}

export default function SupportDeskClient() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState<SupportDeskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [tab, setTab] = useState<TabValue>('customers');
  const [now, setNow] = useState(() => Date.now());
  const [scope, setScope] = useState<CustomerScope>('window');
  // Decisions the server has not listed yet: in flight (optimistic) or just created.
  const [localDecisions, setLocalDecisions] = useState<SupportDecision[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSupportDesk();
      setData(res);
      setError(null);
    } catch (err) {
      setError({
        status: err instanceof ApiError ? err.status : undefined,
        message: err instanceof Error ? err.message : 'Failed to load the support desk',
      });
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const refresh = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => { clearInterval(refresh); clearInterval(tick); };
  }, [isAdmin, load]);

  const allRows = useMemo(() => data?.snapshot?.customers?.rows ?? [], [data]);
  // Tiles, chips and the list follow the scope: the intake window by default,
  // the full history behind the toggle (as on the laptop dashboard).
  const rows = useMemo(() => scopeCustomers(allRows, scope), [allRows, scope]);
  const windowRows = useMemo(() => scopeCustomers(allRows, 'window'), [allRows]);
  const windowLabel = data?.snapshot?.customers?.window_label || 'Since intake start';
  const scopeLabel = scope === 'all' ? 'Full history' : windowLabel;
  const entries = useMemo(() => data?.snapshot?.worklog?.entries ?? [], [data]);
  const dennis = useMemo(() => (data ? waitingOnDennis(data.snapshot ?? {}) : []), [data]);
  const decisionMap = useMemo(
    () => latestDecisions(mergeDecisions(data?.decisions ?? [], localDecisions)),
    [data, localDecisions],
  );

  const decide = useCallback(async (itemId: string, action: DecisionAction, note: string) => {
    const tempId = `local-${Date.now()}`;
    const optimistic: SupportDecision = {
      id: tempId, item_id: itemId, action, note: note || null,
      created_at: new Date().toISOString(), consumed_at: null, optimistic: true,
    };
    setLocalDecisions((prev) => [...prev, optimistic]);
    try {
      const saved = await api.createSupportDeskDecision({ item_id: itemId, action, ...(note ? { note } : {}) });
      setLocalDecisions((prev) => [...prev.filter((d) => d.id !== tempId && d.id !== saved.id), saved]);
    } catch (err) {
      setLocalDecisions((prev) => prev.filter((d) => d.id !== tempId));
      if (err instanceof ApiError && (err.status === 404 || err.status === 409)) load();
      throw new Error(decisionErrorMessage(err));
    }
  }, [load]);

  const fresh = data ? freshness(data, now) : null;
  const counts = useMemo(() => countByStatus(rows), [rows]);
  const promiseTotal = useMemo(() => rows.reduce((n, r) => n + (r.open_promises ?? 0), 0), [rows]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      <Header
        title="Support desk"
        subtitle="WhatsApp support agent: customers, work log, decisions"
        action={
          <button type="button" className="btn-secondary text-sm" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {fresh && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            fresh.stale
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              : 'bg-background-secondary border-border text-foreground-muted'
          }`}
          role={fresh.stale ? 'alert' : undefined}
        >
          <span className="font-medium">Last updated {formatAge(fresh.ageMinutes)}</span>
          <span> · {formatDateTime(fresh.updatedAt)}</span>
          {fresh.stale && (
            <p className="text-xs mt-1">
              Older than {STALE_AFTER_MINUTES} minutes. The laptop may be asleep or the push is not running, so this may not match WhatsApp right now.
            </p>
          )}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      )}

      {error && !data && (
        <div className="card p-6 text-center space-y-3">
          {error.status === 404 ? (
            <>
              <h2 className="font-semibold">No snapshot yet</h2>
              <p className="text-sm text-foreground-muted">
                Nothing has been pushed from the laptop. Run push-support-desk.py there once the ingest token is set.
              </p>
            </>
          ) : error.status === 403 ? (
            <>
              <h2 className="font-semibold">Admin Access Required</h2>
              <p className="text-sm text-foreground-muted">Only the platform admin can see the support desk.</p>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Could not load the support desk</h2>
              <p className="text-sm text-foreground-muted">{error.message}</p>
              <button type="button" className="btn-primary" onClick={load}>Try again</button>
            </>
          )}
        </div>
      )}
      {error && data && (
        <p className="text-xs text-amber-500">Refresh failed ({error.message}). Showing the last loaded snapshot.</p>
      )}

      {data && (
        <>
          <FilterPills<CustomerScope>
            value={scope}
            onChange={setScope}
            ariaLabel="Time window"
            className="max-w-full"
            options={[
              { value: 'window', label: windowLabel, count: windowRows.length },
              { value: 'all', label: 'Full history', count: allRows.length },
            ]}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Waiting on us', value: counts.us, warn: counts.us > 0, go: () => setTab('customers') },
              { label: 'With Dennis', value: counts.dennis, warn: counts.dennis > 0, go: () => setTab('customers') },
              { label: 'Open promises', value: promiseTotal, warn: promiseTotal > 0, go: () => setTab('customers') },
              { label: 'Waiting on Dennis', value: dennis.length, warn: dennis.length > 0, go: () => setTab('dennis') },
            ].map((s) => (
              <button key={s.label} type="button" onClick={s.go} className="card p-3 text-left active:opacity-70">
                <p className={`text-2xl font-semibold tabular-nums ${s.warn ? 'text-amber-500' : 'text-foreground'}`}>{s.value}</p>
                <p className="text-xs text-foreground-muted">{s.label}</p>
              </button>
            ))}
          </div>

          <Tabs<TabValue>
            value={tab}
            onChange={setTab}
            ariaLabel="Support desk sections"
            tabs={[
              { value: 'customers', label: 'Customers', count: rows.length },
              { value: 'worklog', label: 'Work log', count: entries.length },
              { value: 'dennis', label: 'Waiting on Dennis', count: dennis.length },
            ]}
          />

          {tab === 'customers' && (
            <CustomersTab
              rows={rows}
              scopeLabel={scopeLabel}
              notes={data.snapshot?.customers?.notes}
            />
          )}
          {tab === 'worklog' && <WorklogTab entries={entries} />}
          {tab === 'dennis' && <DennisTab items={dennis} decisions={decisionMap} onDecide={decide} />}
        </>
      )}
    </div>
  );
}
