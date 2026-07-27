'use client';

import React from 'react';
import type { PortAnalyticsPort } from '../lib/types';

// The WAN/uplink port brings the internet in — it legitimately has no
// downstream MACs, so it must not be health-checked like an access port.
// Heuristic: an unbridged ether1 is the uplink on our MikroTik deployments.
export function isUplinkPort(port: PortAnalyticsPort): boolean {
  return port.port.toLowerCase() === 'ether1' && !port.bridge;
}

export function portShortLabel(name: string): string {
  const ether = name.match(/^ether(\d+)$/i);
  if (ether) return ether[1];
  const sfpPlus = name.match(/^sfp-sfpplus(\d+)$/i);
  if (sfpPlus) return `S+${sfpPlus[1]}`;
  const sfp = name.match(/^sfp(\d+)$/i);
  if (sfp) return `S${sfp[1]}`;
  return name.slice(0, 4);
}

export type PortVisualStatus = 'uplink' | 'active' | 'silent_link' | 'down';

export function portVisualStatus(port: PortAnalyticsPort): PortVisualStatus {
  if (isUplinkPort(port)) return 'uplink';
  return port.health.status;
}

const STATUS_STYLES: Record<PortVisualStatus, { cell: string; label: string; legendDot: string }> = {
  uplink: {
    cell: 'bg-sky-500/15 border-sky-500/40 text-sky-500',
    label: 'Uplink',
    legendDot: 'bg-sky-500',
  },
  active: {
    cell: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    label: 'Active',
    legendDot: 'bg-emerald-500',
  },
  silent_link: {
    cell: 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400',
    label: 'Silent link',
    legendDot: 'bg-amber-500',
  },
  down: {
    cell: 'bg-background-secondary border-border text-foreground-muted opacity-70',
    label: 'Down',
    legendDot: 'bg-foreground-muted/40',
  },
};

function UplinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function portTooltip(port: PortAnalyticsPort, status: PortVisualStatus): string {
  const bits = [port.port, STATUS_STYLES[status].label];
  if (port.link.up && port.link.rate) bits.push(port.link.rate);
  if (port.bridge) bits.push(port.bridge);
  if (status === 'active') bits.push(`${port.counts.learned_macs} devices`);
  const infra = port.infrastructure[0]?.name;
  if (infra) bits.push(infra);
  return bits.join(' · ');
}

// Switch-faceplate visualization: one numbered square per physical port,
// colored by status, with a device-count badge — the UniFi/Meraki pattern.
export default function PortFaceplate({
  ports,
  selectedPort,
  onSelect,
  size = 'md',
}: {
  ports: PortAnalyticsPort[];
  selectedPort: string | null;
  onSelect: (port: string) => void;
  size?: 'sm' | 'md';
}): React.JSX.Element {
  const cellSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const labelSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const usedStatuses = new Set(ports.map(portVisualStatus));

  return (
    <div>
      {/* Chassis strip */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-background-tertiary/60 border border-border">
        <div className="flex flex-wrap gap-2">
          {ports.map((port) => {
            const status = portVisualStatus(port);
            const styles = STATUS_STYLES[status];
            const selected = selectedPort === port.port;
            const hasErrors = port.traffic.rx_error > 0 || port.traffic.tx_error > 0;
            return (
              <button
                key={port.port}
                type="button"
                onClick={() => onSelect(port.port)}
                aria-pressed={selected}
                aria-label={portTooltip(port, status)}
                title={portTooltip(port, status)}
                className={`relative ${cellSize} rounded-lg border flex items-center justify-center transition-all ${styles.cell} ${
                  selected
                    ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-background'
                    : 'hover:scale-105'
                }`}
              >
                {status === 'uplink' ? (
                  <UplinkIcon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
                ) : (
                  <span className={`font-mono font-semibold ${labelSize}`}>{portShortLabel(port.port)}</span>
                )}

                {/* Device-count badge */}
                {status === 'active' && port.counts.learned_macs > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-background border border-border text-foreground text-[9px] font-medium flex items-center justify-center leading-none shadow-sm">
                    {port.counts.learned_macs > 99 ? '99+' : port.counts.learned_macs}
                  </span>
                )}

                {/* Error marker */}
                {hasErrors && status !== 'down' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background" title="Interface errors" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend — only statuses actually present */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-foreground-muted">
        {(['uplink', 'active', 'silent_link', 'down'] as PortVisualStatus[])
          .filter((s) => usedStatuses.has(s))
          .map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s].legendDot}`} />
              {STATUS_STYLES[s].label}
            </span>
          ))}
        <span className="inline-flex items-center gap-1">
          <span className="w-[13px] h-[13px] rounded-full bg-background border border-border text-foreground text-[7px] font-medium flex items-center justify-center">n</span>
          devices
        </span>
      </div>
    </div>
  );
}
