'use client';

import { useState } from 'react';
import {
  PortAnalyticsResponse,
  PortAnalyticsPort,
  InfrastructureDevice,
  DownstreamDeviceSample,
} from '../lib/types';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const SKIP_REASON_LABELS: Record<string, string> = {
  recent_cache: 'refreshed moments ago',
  db_pool_pressure: 'server is busy',
  refresh_already_running: 'a refresh is already running',
  busy: 'router is busy',
  timeout: 'router timed out',
};

const HEALTH_CONFIG: Record<PortAnalyticsPort['health']['status'], { label: string; badge: string; icon: string }> = {
  active: { label: 'Active', badge: 'badge-success', icon: '●' },
  silent_link: { label: 'Silent Link', badge: 'bg-amber-500/20 text-amber-400', icon: '◐' },
  down: { label: 'Down', badge: 'bg-foreground-muted/20 text-foreground-muted', icon: '○' },
};

export default function PortAnalyticsTab({
  data, loading, error, onRefresh,
}: {
  data: PortAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [expandedPorts, setExpandedPorts] = useState<Set<string>>(new Set());

  const togglePort = (port: string) => {
    setExpandedPorts((prev) => {
      const next = new Set(prev);
      if (next.has(port)) next.delete(port);
      else next.add(port);
      return next;
    });
  };

  if (error) {
    return (
      <div className="card p-5 border-red-500/30 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground">Port Analytics</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button onClick={onRefresh} className="btn-ghost text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="card p-5">
          <div className="w-48 h-4 skeleton mb-2" />
          <div className="w-32 h-3 skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 skeleton rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const memoryUsedPct = data.system.total_memory > 0
    ? Math.round(((data.system.total_memory - data.system.free_memory) / data.system.total_memory) * 100)
    : null;

  return (
    <div className="space-y-4">
      {/* Cache / freshness indicator */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {data.cached && <span className="badge bg-blue-500/20 text-blue-400 text-[10px]">Cached</span>}
          {data.stale && <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">Stale</span>}
          {(data.refresh_pending || data.refresh_skipped) && (
            <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">
              {data.refresh_pending ? 'Refresh pending' : 'Refresh skipped'}
              {data.refresh_skip_reason ? ` — ${SKIP_REASON_LABELS[data.refresh_skip_reason] ?? data.refresh_skip_reason}` : ''}
            </span>
          )}
          {data.cache_age_seconds != null && (
            <span className="text-[10px] text-foreground-muted">Updated {Math.round(data.cache_age_seconds)}s ago</span>
          )}
          {loading && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
        </div>
        <button onClick={onRefresh} disabled={loading} className="btn-ghost text-xs">
          Refresh
        </button>
      </div>

      {/* Router system summary */}
      <div className="card p-4 sm:p-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                {data.router.identity_live || data.router.name}
              </p>
              <p className="text-xs text-foreground-muted truncate">
                {data.router.ip}
                {data.system.board_name && ` · ${data.system.board_name}`}
                {data.system.version && ` · RouterOS ${data.system.version}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-foreground-muted flex-shrink-0">
            {data.system.uptime && (
              <span>Uptime <span className="text-foreground font-medium">{data.system.uptime}</span></span>
            )}
            <span>CPU <span className="text-foreground font-medium">{data.system.cpu_load}%</span></span>
            {memoryUsedPct != null && (
              <span>Memory <span className="text-foreground font-medium">{memoryUsedPct}%</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Totals stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
        <StatTile label="Devices Seen" value={data.totals.bridge_hosts} hint="learned MACs" />
        <StatTile label="Hotspot Hosts" value={data.totals.hotspot_hosts} hint={`${data.totals.hotspot_active} active`} />
        <StatTile label="PPPoE Active" value={data.totals.ppp_active} />
        <StatTile label="DHCP Leases" value={data.totals.dhcp_leases} />
        <StatTile label="Infra Neighbors" value={data.totals.neighbors} />
        <StatTile label="Customers w/ MAC" value={data.totals.db_customers_with_mac} hint="in database" />
      </div>

      {/* Warnings strip */}
      {data.warnings.length > 0 && (
        <div className="card p-4 border-amber-500/30 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium text-foreground">Port Warnings</p>
          </div>
          <div className="space-y-1">
            {data.warnings.map((w) => (
              w.warnings.map((text, i) => (
                <p key={`${w.port}-${i}`} className="text-xs text-foreground-muted">
                  <span className="font-mono text-amber-400">{w.port}</span> — {text}
                </p>
              ))
            ))}
          </div>
        </div>
      )}

      {/* Infrastructure candidates */}
      {data.infrastructure_candidates.length > 0 && (
        <div className="card p-4 sm:p-5 animate-fade-in">
          <p className="text-sm font-medium text-foreground mb-1">Infrastructure Devices</p>
          <p className="text-xs text-foreground-muted mb-3">
            Access points, switches and other network gear detected behind this router
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.infrastructure_candidates.map((device) => (
              <InfrastructureCard key={`${device.port ?? ''}-${device.mac}`} device={device} showPort />
            ))}
          </div>
        </div>
      )}

      {/* Ports */}
      <div className="space-y-2 animate-fade-in">
        <p className="text-sm font-medium text-foreground">
          Ports <span className="text-foreground-muted font-normal">({data.ports.length})</span>
        </p>
        {data.ports.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-foreground-muted">No bridge ports found on this router</p>
          </div>
        ) : (
          data.ports.map((port) => (
            <PortCard
              key={port.port}
              port={port}
              expanded={expandedPorts.has(port.port)}
              onToggle={() => togglePort(port.port)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] uppercase tracking-wide text-foreground-muted mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-foreground leading-tight">{formatCount(value)}</p>
      {hint && <p className="text-[10px] text-foreground-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function PortCard({
  port, expanded, onToggle,
}: {
  port: PortAnalyticsPort;
  expanded: boolean;
  onToggle: () => void;
}) {
  const health = HEALTH_CONFIG[port.health.status] ?? HEALTH_CONFIG.down;
  const hasErrors = port.traffic.rx_error > 0 || port.traffic.tx_error > 0;
  const isDown = port.health.status === 'down';
  const infraNames = port.infrastructure.map((d) => d.name || d.board || d.mac).filter(Boolean);

  return (
    <div
      className={`card overflow-hidden ${
        isDown ? 'opacity-60' : port.health.status === 'silent_link' || hasErrors ? 'border-amber-500/30' : ''
      }`}
    >
      {/* Header row (click to expand) */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 sm:p-4 hover:bg-background-tertiary/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono font-medium text-foreground text-sm">{port.port}</span>
            <span className={`badge text-[10px] ${health.badge}`}>{health.label}</span>
            {port.link.up && port.link.rate && (
              <span className="text-xs text-foreground-muted">
                {port.link.rate}{port.link.full_duplex ? ' FD' : ''}
              </span>
            )}
            {port.bridge && (
              <span className="text-xs text-foreground-muted hidden sm:inline">· {port.bridge}</span>
            )}
            {hasErrors && (
              <span className="badge bg-red-500/20 text-red-400 text-[10px]">Errors</span>
            )}
            {port.link.link_downs > 0 && (
              <span className="text-[10px] text-foreground-muted">{port.link.link_downs} flaps</span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-foreground-muted flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Summary line */}
        {!isDown && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-xs text-foreground-muted">
            {infraNames.length > 0 && (
              <span className="inline-flex items-center gap-1 text-purple-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                {infraNames.join(', ')}
              </span>
            )}
            <span>
              <span className="text-foreground font-medium">{port.counts.known_customers_seen}</span> customers seen
            </span>
            <span>
              <span className="text-foreground font-medium">{port.counts.known_customers_connected}</span> connected
            </span>
            {port.counts.hotspot_hosts_seen > 0 && (
              <span>
                <span className="text-foreground font-medium">{port.counts.hotspot_hosts_seen}</span> hotspot
              </span>
            )}
            {port.counts.unknown_devices > 0 && (
              <span>
                <span className="text-foreground font-medium">{port.counts.unknown_devices}</span> unknown
              </span>
            )}
            {port.health.status === 'silent_link' && (
              <span className="text-amber-400">No downstream devices talking</span>
            )}
          </div>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border p-3 sm:p-4 space-y-4">
          {/* Warnings */}
          {port.health.warnings.length > 0 && (
            <div className="space-y-1">
              {port.health.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 text-xs text-amber-400">
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {warning}
                </div>
              ))}
            </div>
          )}

          {/* Counts grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <DetailStat label="Learned MACs" value={port.counts.learned_macs} />
            <DetailStat label="Customers Seen" value={port.counts.known_customers_seen} />
            <DetailStat label="Connected" value={port.counts.known_customers_connected} />
            <DetailStat label="Hotspot Auth" value={port.counts.hotspot_authorized} />
            <DetailStat label="Unknown" value={port.counts.unknown_devices} />
          </div>

          {/* Infrastructure on this port */}
          {port.infrastructure.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">Infrastructure</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {port.infrastructure.map((device) => (
                  <InfrastructureCard key={device.mac} device={device} />
                ))}
              </div>
            </div>
          )}

          {/* Downstream devices */}
          {port.downstream_devices_sample.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">
                Downstream Devices <span className="normal-case">(sample of {port.downstream_devices_sample.length})</span>
              </p>
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-3 text-xs font-medium text-foreground-muted">Device</th>
                      <th className="text-left py-2 pr-3 text-xs font-medium text-foreground-muted">Type</th>
                      <th className="text-left py-2 pr-3 text-xs font-medium text-foreground-muted">IP</th>
                      <th className="text-left py-2 pr-3 text-xs font-medium text-foreground-muted">Activity</th>
                      <th className="text-left py-2 text-xs font-medium text-foreground-muted">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {port.downstream_devices_sample.map((device) => (
                      <DownstreamDeviceRow key={device.mac} device={device} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Traffic counters */}
          <div>
            <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">Traffic</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <DetailStat label="RX" value={formatBytes(port.traffic.rx_byte)} />
              <DetailStat label="TX" value={formatBytes(port.traffic.tx_byte)} />
              <DetailStat label="RX Errors" value={port.traffic.rx_error} alert={port.traffic.rx_error > 0} />
              <DetailStat label="TX Errors" value={port.traffic.tx_error} alert={port.traffic.tx_error > 0} />
              <DetailStat label="RX Drops" value={port.traffic.rx_drop} />
              <DetailStat label="TX Drops" value={port.traffic.tx_drop} />
              <DetailStat label="Link Flaps" value={port.link.link_downs} />
              <DetailStat label="Last Link Up" value={port.link.last_link_up_time || '—'} small />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailStat({
  label, value, alert = false, small = false,
}: {
  label: string;
  value: number | string;
  alert?: boolean;
  small?: boolean;
}) {
  return (
    <div className="p-2 rounded-lg bg-background-tertiary/50">
      <p className="text-[10px] text-foreground-muted mb-0.5">{label}</p>
      <p className={`font-mono ${small ? 'text-xs' : 'text-sm'} font-medium ${alert ? 'text-red-400' : 'text-foreground'}`}>
        {typeof value === 'number' ? formatCount(value) : value}
      </p>
    </div>
  );
}

function InfrastructureCard({ device, showPort = false }: { device: InfrastructureDevice; showPort?: boolean }) {
  return (
    <div className="p-2.5 rounded-lg bg-background-tertiary/50 flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{device.name || device.board || 'Unnamed device'}</p>
          {showPort && device.port && (
            <span className="badge bg-foreground-muted/20 text-foreground-muted text-[10px] font-mono">{device.port}</span>
          )}
        </div>
        <p className="text-xs text-foreground-muted truncate">
          {[device.platform, device.board, device.version && `v${device.version}`].filter(Boolean).join(' · ') || 'Unknown hardware'}
        </p>
        <p className="text-[10px] text-foreground-muted font-mono mt-0.5">
          {[device.ip, device.mac].filter(Boolean).join(' · ')}
          {device.source && <span className="ml-1 font-sans">({device.source})</span>}
        </p>
      </div>
    </div>
  );
}

function DownstreamDeviceRow({ device }: { device: DownstreamDeviceSample }) {
  const kindBadge =
    device.kind === 'known_customer' ? 'bg-blue-500/20 text-blue-400' :
    device.kind === 'infrastructure' ? 'bg-purple-500/20 text-purple-400' :
    'bg-foreground-muted/20 text-foreground-muted';
  const kindLabel =
    device.kind === 'known_customer' ? 'Customer' :
    device.kind === 'infrastructure' ? 'Infra' :
    'Unknown';

  const activity: { label: string; className: string }[] = [];
  if (device.hotspot_active) activity.push({ label: 'Hotspot active', className: 'badge-success' });
  if (device.ppp_active) activity.push({ label: 'PPPoE active', className: 'badge-success' });
  if (!device.hotspot_active && device.hotspot_authorized) activity.push({ label: 'Authorized', className: 'bg-blue-500/20 text-blue-400' });
  if (device.hotspot_bypassed) activity.push({ label: 'Bypassed', className: 'bg-amber-500/20 text-amber-400' });

  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3">
        <p className="text-xs font-medium text-foreground">{device.name || '—'}</p>
        <p className="text-[10px] font-mono text-foreground-muted">{device.mac}</p>
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`badge text-[10px] ${kindBadge}`}>{kindLabel}</span>
          {device.customer_status && (
            <span className={`badge text-[10px] ${
              device.customer_status === 'active' ? 'badge-success' :
              device.customer_status === 'expired' ? 'bg-red-500/20 text-red-400' :
              'bg-foreground-muted/20 text-foreground-muted'
            }`}>{device.customer_status}</span>
          )}
        </div>
      </td>
      <td className="py-2 pr-3 font-mono text-xs text-foreground-muted">{device.ip || '—'}</td>
      <td className="py-2 pr-3">
        {activity.length === 0 ? (
          <span className="text-xs text-foreground-muted">—</span>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            {activity.map((a) => (
              <span key={a.label} className={`badge text-[10px] ${a.className}`}>{a.label}</span>
            ))}
          </div>
        )}
      </td>
      <td className="py-2 font-mono text-xs text-foreground-muted whitespace-nowrap">{device.last_seen || '—'}</td>
    </tr>
  );
}
