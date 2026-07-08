'use client';
import React from 'react';
import Link from 'next/link';
import SectionCard, { SectionError, SectionEmpty } from './SectionCard';
import type { PortAnalyticsResponse, PortAnalyticsPort } from '../../lib/types';

const HEALTH_TILE: Record<PortAnalyticsPort['health']['status'], { dot: string; label: string; tile: string }> = {
  active: { dot: 'bg-emerald-500', label: 'Active', tile: 'bg-emerald-500/5 border-emerald-500/20' },
  silent_link: { dot: 'bg-amber-500', label: 'Silent link', tile: 'bg-amber-500/5 border-amber-500/30' },
  down: { dot: 'bg-foreground-muted/30', label: 'Down', tile: 'bg-background-tertiary border-transparent opacity-70' },
};

function PortTile({ port }: { port: PortAnalyticsPort }) {
  const cfg = HEALTH_TILE[port.health.status] ?? HEALTH_TILE.down;
  const infraName = port.infrastructure[0]?.name || port.infrastructure[0]?.board || '';
  const hasErrors = port.traffic.rx_error > 0 || port.traffic.tx_error > 0;

  return (
    <div className={`p-3 rounded-lg border ${cfg.tile}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-medium text-foreground truncate">{port.port}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      </div>
      <p className="text-[10px] text-foreground-muted">
        {cfg.label}
        {port.link.up && port.link.rate ? ` · ${port.link.rate}` : ''}
        {hasErrors && <span className="text-red-400"> · errors</span>}
      </p>
      {infraName && (
        <p className="text-[10px] text-purple-400 truncate mt-0.5" title={infraName}>{infraName}</p>
      )}
      {port.health.status === 'active' && (
        <div className="mt-1 text-[10px] text-foreground-muted space-y-0.5">
          <p>{port.counts.known_customers_connected} online · {port.counts.hotspot_hosts_seen} hotspot</p>
          {port.counts.unknown_devices > 0 && <p>{port.counts.unknown_devices} unknown device{port.counts.unknown_devices !== 1 ? 's' : ''}</p>}
        </div>
      )}
    </div>
  );
}

// "Port Map" board — a glanceable per-port summary of what the router sees
// behind each physical port (infrastructure, customers, unknown devices),
// linking to the full Port Map tab on the Diagnostics page.
export default function PortMapCard({
  data,
  loading,
  error,
  onRetry,
  routerId,
}: {
  data: PortAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  routerId: number;
}): React.JSX.Element {
  const detailsHref = `/diagnostics?tab=analytics&router=${routerId}`;
  const detailsLink = (
    <Link href={detailsHref} className="btn-ghost text-xs whitespace-nowrap">
      Open Port Map →
    </Link>
  );

  if (error) {
    return (
      <SectionCard title="Port Map" accent="purple" controls={detailsLink}>
        <SectionError message={error} onRetry={onRetry} />
      </SectionCard>
    );
  }

  if (!data) {
    return (
      <SectionCard title="Port Map" accent="purple" loading={loading} controls={detailsLink}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      </SectionCard>
    );
  }

  const connectedTotal = data.ports.reduce((sum, p) => sum + p.counts.known_customers_connected, 0);
  const unknownTotal = data.ports.reduce((sum, p) => sum + p.counts.unknown_devices, 0);
  const infraTotal = data.infrastructure_candidates.length;
  const warningPorts = data.warnings.map((w) => w.port);

  const metaNode = (
    <>
      {data.stale && <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">Stale</span>}
      {data.cache_age_seconds != null && (
        <span>Updated {Math.round(data.cache_age_seconds)}s ago</span>
      )}
    </>
  );

  return (
    <SectionCard title="Port Map" accent="purple" loading={loading} meta={metaNode} controls={detailsLink}>
      {/* Totals line */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted mb-3">
        <span><span className="font-medium text-foreground">{infraTotal}</span> infrastructure</span>
        <span><span className="font-medium text-foreground">{connectedTotal}</span> customers online</span>
        <span><span className="font-medium text-foreground">{data.totals.hotspot_active}</span> hotspot active</span>
        <span><span className="font-medium text-foreground">{data.totals.ppp_active}</span> PPPoE active</span>
        {unknownTotal > 0 && (
          <span><span className="font-medium text-foreground">{unknownTotal}</span> unknown devices</span>
        )}
      </div>

      {/* Warnings line */}
      {warningPorts.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400 mb-3">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="truncate">
            {warningPorts.length} port warning{warningPorts.length !== 1 ? 's' : ''}: <span className="font-mono">{warningPorts.join(', ')}</span>
          </span>
        </div>
      )}

      {/* Port tiles */}
      {data.ports.length === 0 ? (
        <SectionEmpty message="No bridge ports found on this router" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
          {data.ports.map((port) => (
            <PortTile key={port.port} port={port} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
