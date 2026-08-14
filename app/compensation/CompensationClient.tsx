'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { OutageHistoryEntry, Router } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import { formatDuration } from '../lib/format';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import { SkeletonCard } from '../components/LoadingSpinner';
import OutageCompensationModal from './OutageCompensationModal';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
};

const windowSeconds = (entry: OutageHistoryEntry): number => {
  try {
    const s = new Date(entry.outage_start).getTime();
    const e = new Date(entry.outage_end).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 0;
    return Math.round((e - s) / 1000);
  } catch {
    return 0;
  }
};

export default function CompensationClient() {
  const [history, setHistory] = useState<OutageHistoryEntry[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [hist, rtrs] = await Promise.all([
        api.getOutageCompensationHistory(100),
        api.getRouters().catch(() => [] as Router[]),
      ]);
      setHistory(hist.compensations);
      setRouters(rtrs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compensation history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const routerNames = useMemo(() => {
    const map = new Map<number, string>();
    routers.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [routers]);

  const routersLabel = (entry: OutageHistoryEntry): string => {
    if (!entry.router_ids || entry.router_ids.length === 0) return 'All routers';
    return entry.router_ids.map((id) => routerNames.get(id) || `Router #${id}`).join(', ');
  };

  const totals = useMemo(
    () => ({
      runs: history.length,
      customers: history.reduce((sum, h) => sum + h.customers_credited, 0),
      seconds: history.reduce((sum, h) => sum + h.total_seconds_credited, 0),
      lastRun: history[0]?.created_at ?? null,
    }),
    [history]
  );

  const newButton = (
    <button onClick={() => setModalOpen(true)} className="btn-primary px-4 py-2 text-sm font-semibold whitespace-nowrap">
      + Compensate an outage
    </button>
  );

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Outage Compensation"
        subtitle="Power cut? Fiber down? Give every affected customer their time back."
        action={newButton}
      />

      {/* Header only renders `action` on desktop; give mobile its own entry point */}
      <div className="md:hidden">
        <button onClick={() => setModalOpen(true)} className="btn-primary w-full py-2.5 text-sm font-semibold">
          + Compensate an outage
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchAll} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Compensation Runs"
              value={totals.runs}
              accent="primary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            />
            <StatCard
              title="Customers Credited"
              value={totals.customers}
              accent="success"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              title="Time Given Back"
              value={formatDuration(totals.seconds)}
              accent="info"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Last Run"
              value={totals.lastRun ? formatSafeDate(totals.lastRun) : '—'}
              accent="secondary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
          </div>

          <div className="card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Past Compensations</h3>

            {history.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-10 h-10 mx-auto text-foreground-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <p className="text-sm font-medium text-foreground mb-1">No compensations yet</p>
                <p className="text-xs text-foreground-muted mb-4 max-w-sm mx-auto">
                  When power or fiber goes down, pick the outage window and every customer
                  who had an active package gets the lost hours back — in two clicks.
                </p>
                <button onClick={() => setModalOpen(true)} className="btn-primary px-4 py-2 text-sm font-semibold">
                  Compensate an outage
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <DataTable
                    columns={[
                      { key: 'applied', label: 'Applied' },
                      { key: 'window', label: 'Outage Window' },
                      { key: 'downtime', label: 'Downtime' },
                      { key: 'customers', label: 'Customers', className: 'text-right' },
                      { key: 'credited', label: 'Time Credited', className: 'text-right' },
                      { key: 'routers', label: 'Routers' },
                      { key: 'note', label: 'Note' },
                    ]}
                    data={history}
                    rowKey={(item) => item.id}
                    renderCell={(item, col) => {
                      switch (col) {
                        case 'applied':
                          return <span className="text-sm text-foreground-muted">{formatSafeDate(item.created_at)}</span>;
                        case 'window':
                          return (
                            <span className="text-sm">
                              {formatSafeDate(item.outage_start)} → {formatSafeDate(item.outage_end)}
                            </span>
                          );
                        case 'downtime':
                          return <span className="text-sm">{formatDuration(windowSeconds(item))}</span>;
                        case 'customers':
                          return <span className="text-sm font-medium">{item.customers_credited}</span>;
                        case 'credited':
                          return <span className="text-sm font-semibold text-emerald-500">+{formatDuration(item.total_seconds_credited)}</span>;
                        case 'routers':
                          return <span className="text-sm text-foreground-muted">{routersLabel(item)}</span>;
                        case 'note':
                          return <span className="text-sm text-foreground-muted">{item.note || '—'}</span>;
                        default:
                          return null;
                      }
                    }}
                    emptyState={{ message: 'No compensations yet' }}
                  />
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {history.map((entry) => (
                    <MobileDataCard
                      key={entry.id}
                      id={entry.id}
                      title={`+${formatDuration(entry.total_seconds_credited)} · ${entry.customers_credited} customer${entry.customers_credited === 1 ? '' : 's'}`}
                      subtitle={`${formatSafeDate(entry.outage_start)} → ${formatSafeDate(entry.outage_end)}`}
                      avatar={{ text: 'OC', color: 'success' }}
                      fields={[
                        { label: 'Downtime', value: formatDuration(windowSeconds(entry)) },
                        { label: 'Routers', value: routersLabel(entry) },
                        ...(entry.note ? [{ label: 'Note', value: entry.note }] : []),
                      ]}
                      footer={<span className="text-xs text-foreground-muted">Applied {formatSafeDate(entry.created_at)}</span>}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <OutageCompensationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        routers={routers}
        onApplied={fetchAll}
      />
    </div>
  );
}
