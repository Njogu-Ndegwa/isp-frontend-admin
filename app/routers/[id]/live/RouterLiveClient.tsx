'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import type { RouterLive } from '../../../lib/types';
import Header from '../../../components/Header';
import {
  QUEUE_STATUS_LABEL, QUEUE_STATUS_TONE,
  formatAge, formatBps, formatBytes, formatMaxLimit,
} from '../../../lib/live';

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] uppercase tracking-wider text-foreground-muted">{label}</p>
      <p className="text-xl font-semibold text-foreground tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[11px] text-foreground-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RouterLiveClient() {
  const params = useParams();
  const routerId = Number(params.id);
  const [live, setLive] = useState<RouterLive | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetched on open and on Refresh only — no timer. The router reports every
  // few seconds and the server answers from memory, so each fetch is current.
  const [loading, setLoading] = useState(false);
  const fetchLive = useCallback(() => {
    if (!routerId) return Promise.resolve();
    return api.getRouterLive(routerId)
      .then((data) => { setLive(data); setError(null); })
      .catch((e: Error) => setError(e.message || 'Not reporting live'));
  }, [routerId]);
  useEffect(() => { void fetchLive(); }, [fetchLive]);
  const load = () => {
    setLoading(true);
    void fetchLive().finally(() => setLoading(false));
  };

  const memUsed = live && live.total_memory && live.free_memory !== null
    ? Math.round(((live.total_memory - live.free_memory) / live.total_memory) * 100)
    : null;
  const online = live ? live.devices.filter((d) => d.online) : [];
  const problems = live ? live.shadowed + live.no_limit : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header
        title="Router live view"
        subtitle={live ? `${live.board || 'Router'} · RouterOS ${live.version}` : 'Real-time push'}
        backHref="/routers"
        action={
          <button type="button" onClick={load} disabled={loading} className="btn-primary text-sm disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error && !live && (
        <div className="card p-4 text-sm text-foreground-muted">{error}</div>
      )}

      {live && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted" data-testid="live-freshness">
            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
            <span>Last report {formatAge(live.report_age_seconds)}</span>
            <span>· reports every {live.interval_seconds}s</span>
            <span>· {live.pushes_since_restart} reports since server start</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Internet download" value={formatBps(live.wan_rx_bps)} sub={`Upload ${formatBps(live.wan_tx_bps)}`} />
            <Stat label="Customers online" value={`${online.length}`} sub={`${live.devices.length} with a live plan`} />
            <Stat label="CPU" value={live.cpu_load !== null ? `${live.cpu_load}%` : '—'} sub={`Uptime ${live.uptime || '—'}`} />
            <Stat label="Memory used" value={memUsed !== null ? `${memUsed}%` : '—'} sub={`${live.queue_count} speed queues`} />
          </div>

          <div className="card p-4 space-y-1 text-sm">
            <p className="font-medium text-foreground">Speed limits</p>
            {problems === 0 && live.orphan_queues === 0 ? (
              <p className="text-emerald-500">Every online customer is on their own speed limit.</p>
            ) : (
              <>
                {live.shadowed > 0 && <p className="text-warning">{live.shadowed} online customer(s) on another customer&apos;s speed limit</p>}
                {live.no_limit > 0 && <p className="text-danger">{live.no_limit} online customer(s) with no speed limit</p>}
                {live.orphan_queues > 0 && <p className="text-foreground-muted">{live.orphan_queues} leftover queue(s) not belonging to a live customer</p>}
              </>
            )}
            {live.last_repair_at && (
              <p className="text-xs text-foreground-muted">
                Last automatic repair: {new Date(live.last_repair_at + 'Z').toLocaleTimeString()}
                {live.last_repair_result?.status ? ` (${String(live.last_repair_result.status)})` : ''}
              </p>
            )}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm" data-testid="live-devices">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-foreground-muted border-b border-border">
                  <th className="p-3">Customer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Download now</th>
                  <th className="p-3">Upload now</th>
                  <th className="p-3">This session</th>
                  <th className="p-3">Speed limit</th>
                </tr>
              </thead>
              <tbody>
                {live.devices.map((d) => (
                  <tr key={d.mac} className="border-b border-border/50">
                    <td className="p-3">
                      {d.customer_id ? (
                        <Link href={`/customers/${d.customer_id}`} className="text-foreground hover:text-accent-primary">
                          {d.customer_name || `Customer ${d.customer_id}`}
                        </Link>
                      ) : d.mac}
                      <p className="font-mono text-[11px] text-foreground-muted">{d.ip || d.mac}</p>
                    </td>
                    <td className="p-3">
                      {d.online ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-foreground-muted text-xs">
                          <span className="w-2 h-2 rounded-full bg-foreground-muted/40" /> Offline
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums text-accent-primary">{d.online ? formatBps(d.rate_down_bps) : '—'}</td>
                    <td className="p-3 tabular-nums text-teal-500">{d.online ? formatBps(d.rate_up_bps) : '—'}</td>
                    <td className="p-3 tabular-nums text-foreground-muted">
                      {d.online ? `${formatBytes(d.session_download_bytes)} ↓ · ${formatBytes(d.session_upload_bytes)} ↑` : '—'}
                    </td>
                    <td className="p-3 text-xs">
                      <p className={QUEUE_STATUS_TONE[d.queue_status]}>{QUEUE_STATUS_LABEL[d.queue_status]}</p>
                      {d.online && d.max_limit && <p className="text-foreground-muted">{formatMaxLimit(d.max_limit)}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
