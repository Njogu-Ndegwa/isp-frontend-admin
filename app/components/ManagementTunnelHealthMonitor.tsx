'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type {
  ManagementTunnelHealthResponse,
  ManagementTunnelServiceHealth,
} from '../lib/types';

const POLL_INTERVAL_MS = 30_000;

function formatRelative(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return 'unknown';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function statusLabel(available: boolean | null): string {
  if (available === null) return 'Unknown';
  return available ? 'Operational' : 'Down';
}

function readiness(value: boolean | undefined, ready: string): { label: string; className: string } {
  if (value === undefined) return { label: 'unknown', className: 'text-foreground-muted' };
  return value
    ? { label: ready, className: 'text-emerald-500' }
    : { label: 'down', className: 'text-red-500' };
}

function ServiceCard({
  kind,
  title,
  subtitle,
  service,
  primaryLabel,
  primaryValue,
  secondaryLabel = 'Routers online',
  secondaryValue,
  tertiaryLabel = 'Registered',
  tertiaryValue,
}: {
  kind: 'wireguard' | 'l2tp';
  title: string;
  subtitle: string;
  service: ManagementTunnelServiceHealth;
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel?: string;
  secondaryValue?: number | string;
  tertiaryLabel?: string;
  tertiaryValue?: number | string;
}) {
  const available = service.available;
  const listener = readiness(service.listener_available, 'listening');
  const ipsec = readiness(service.ipsec_available, 'ready');
  const statusClass = available === null
    ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
    : available
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
      : 'bg-red-500/10 text-red-500 border-red-500/30';

  return (
    <section className={`rounded-xl border p-3 sm:p-4 ${available === false ? 'border-red-500/30 bg-red-500/[0.03]' : 'border-border bg-background-tertiary/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-foreground-muted mt-0.5">{subtitle}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
          {statusLabel(available)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Metric label={primaryLabel} value={primaryValue} />
        <Metric label={secondaryLabel} value={secondaryValue ?? service.online_routers} />
        <Metric label={tertiaryLabel} value={tertiaryValue ?? service.registered_routers} />
      </div>

      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-foreground-muted">
        {kind === 'wireguard' ? (
          <>
            <span>Interface: <strong className="text-foreground font-medium">{service.interface || '—'}</strong></span>
            <span>Peers: <strong className="text-foreground font-medium">{service.configured_peers ?? 0}</strong></span>
            <span>Port: <strong className="text-foreground font-medium">{service.listening_port ?? '—'}</strong></span>
          </>
        ) : (
          <>
            <span>UDP 1701: <strong className={listener.className}>{listener.label}</strong></span>
            <span>IPsec: <strong className={ipsec.className}>{ipsec.label}</strong></span>
            <span>Peers: <strong className="text-foreground font-medium">{service.configured_peers ?? 0}</strong></span>
          </>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[9px] sm:text-[10px] text-foreground-muted leading-tight mt-0.5">{label}</p>
    </div>
  );
}

export default function ManagementTunnelHealthMonitor({ detailed = false }: { detailed?: boolean }) {
  const [data, setData] = useState<ManagementTunnelHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      setData(await api.getManagementTunnelHealth());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tunnel health check failed');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') void refresh(true);
      }, POLL_INTERVAL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
        start();
      } else {
        stop();
      }
    };

    void refresh();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const critical = data?.overall_status === 'critical';
  if (!detailed && !critical) return null;

  if (detailed && loading && !data) {
    return <div className="card h-32 animate-pulse bg-background-tertiary/40" aria-label="Loading management tunnel health" />;
  }

  if (detailed && error && !data) {
    return (
      <div className="card p-4 border-red-500/30" role="alert">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Management Tunnel Health</p>
            <p className="text-xs text-red-500 mt-1">Unable to verify tunnel services: {error}</p>
          </div>
          <button onClick={() => void refresh()} className="btn-secondary text-xs px-3 py-1.5">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (!detailed) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 sm:p-4" role="alert" aria-live="assertive">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-500">Management tunnel incident</p>
            <p className="text-xs text-foreground mt-1 break-words">{data.summary}</p>
          </div>
          <button onClick={() => void refresh()} className="shrink-0 btn-secondary text-xs px-3 py-1.5">Check again</button>
        </div>
      </div>
    );
  }

  const primary = data.primary;
  const insurance = data.insurance;
  const primaryWireguard = primary.services.wireguard;
  const primaryL2tp = primary.services.l2tp;
  const insuranceWireguard = insurance.services.wireguard;
  const insuranceL2tp = insurance.services.l2tp;
  return (
    <div className={`card p-4 sm:p-5 ${critical ? 'border-red-500/40' : 'border-emerald-500/20'}`} role={critical ? 'alert' : undefined}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-semibold text-foreground">Management Tunnel Health</h2>
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${critical ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
              {critical ? 'Incident' : 'Operational'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${critical ? 'text-red-500' : 'text-foreground-muted'}`}>{data.summary}</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="shrink-0 p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted disabled:opacity-50"
          aria-label="Refresh management tunnel health"
          title="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <section aria-labelledby="primary-tunnel-heading">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 id="primary-tunnel-heading" className="text-xs font-semibold text-foreground">Primary AWS management</h3>
            <p className="text-[10px] text-foreground-muted">Normal application control path · 10.0.0.0/16</p>
          </div>
          <span className={`text-[10px] font-semibold ${primary.overall_status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`}>
            {primary.overall_status === 'healthy' ? 'Operational' : 'Incident'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ServiceCard
            kind="wireguard"
            title="WireGuard"
            subtitle="RouterOS 7 primary management"
            service={primaryWireguard}
            primaryLabel="Recent handshakes"
            primaryValue={primaryWireguard.recent_handshakes ?? 0}
          />
          <ServiceCard
            kind="l2tp"
            title="L2TP / IPsec"
            subtitle="RouterOS 6 primary management"
            service={primaryL2tp}
            primaryLabel="Active sessions"
            primaryValue={primaryL2tp.active_sessions ?? 0}
          />
        </div>
      </section>

      <section aria-labelledby="insurance-tunnel-heading" className="mt-5 pt-4 border-t border-border">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 id="insurance-tunnel-heading" className="text-xs font-semibold text-foreground">Hetzner emergency tunnel</h3>
            <p className="text-[10px] text-foreground-muted">
              Rescue path · {insurance.subnet || 'backup subnet'} · {insurance.server_public_ip || 'server unknown'}
            </p>
          </div>
          <span className={`text-[10px] font-semibold ${insurance.overall_status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`}>
            {insurance.overall_status === 'healthy' ? 'Operational' : 'Incident'}
          </span>
        </div>
        {!insurance.automatic_failover_enabled && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 mb-3 text-[10px] text-amber-600 dark:text-amber-400">
            Manual rescue only: the production application does not automatically switch router operations to Hetzner.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ServiceCard
            kind="wireguard"
            title="Emergency WireGuard"
            subtitle="Hetzner wg2 management plane"
            service={insuranceWireguard}
            primaryLabel="Recent handshakes"
            primaryValue={insuranceWireguard.recent_handshakes ?? 0}
            secondaryLabel="Configured peers"
            secondaryValue={insuranceWireguard.configured_peers ?? 0}
            tertiaryLabel="Stale peers"
            tertiaryValue={insuranceWireguard.stale_handshakes ?? 0}
          />
          <ServiceCard
            kind="l2tp"
            title="Emergency L2TP / IPsec"
            subtitle="Hetzner RouterOS 6 rescue plane"
            service={insuranceL2tp}
            primaryLabel="Active sessions"
            primaryValue={insuranceL2tp.active_sessions ?? 0}
            secondaryLabel="Configured peers"
            secondaryValue={insuranceL2tp.configured_peers ?? 0}
            tertiaryLabel="API failover"
            tertiaryValue={data.automatic_failover_enabled ? 'On' : 'Off'}
          />
        </div>
      </section>

      <p className="text-[10px] text-foreground-muted mt-3 text-right">
        Checked {formatRelative(data.generated_at)} · auto-refreshes every 30s
      </p>
    </div>
  );
}
