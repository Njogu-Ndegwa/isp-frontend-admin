'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SectionCard, { SectionError } from './SectionCard';
import PortFaceplate, { isUplinkPort, portVisualStatus } from '../../components/PortFaceplate';
import { formatKESCompact } from '../../lib/format';
import { DownloadUsageBody } from './DownloadUsageSection';
import type { PortAnalyticsResponse, PortAnalyticsPort, DownstreamDeviceSample, BandwidthHistory } from '../../lib/types';
import type { DownloadUsageServiceFilter } from '../DownloadUsageChart';
import {
  responseHasDeviceTiers,
  splitDeviceTiers,
  deviceDisplayName,
  equipmentDisplayName,
  type EquipmentEntry,
} from '../../lib/deviceTiers';

type Mode = 'ports' | 'usage';

const STATUS_BADGES: Record<string, { label: string; badge: string }> = {
  uplink: { label: 'Uplink', badge: 'bg-sky-500/20 text-sky-500' },
  active: { label: 'Active', badge: 'badge-success' },
  silent_link: { label: 'Silent link', badge: 'bg-amber-500/20 text-amber-400' },
  down: { label: 'Down', badge: 'bg-foreground-muted/20 text-foreground-muted' },
};

function defaultPortSelection(ports: PortAnalyticsPort[]): string | null {
  if (ports.length === 0) return null;
  const busiest = [...ports]
    .filter((p) => portVisualStatus(p) === 'active')
    .sort((a, b) => b.counts.learned_macs - a.counts.learned_macs)[0];
  return (busiest ?? ports[0]).port;
}

// Most interesting devices first: infrastructure, then active clients.
function sortDevices(devices: DownstreamDeviceSample[]): DownstreamDeviceSample[] {
  const rank = (d: DownstreamDeviceSample) =>
    d.kind === 'infrastructure' ? 0 : d.hotspot_active || d.ppp_active ? 1 : d.kind === 'known_customer' ? 2 : 3;
  return [...devices].sort((a, b) => rank(a) - rank(b));
}

// Combined "Ports & Usage" card: a switch-faceplate port view (with a
// per-port connected-device list) and the download-usage view, toggled
// UniFi-style with pills — two router lenses in one bento slot.
export default function PortsUsageCard({
  routerId,
  portMap,
  portMapLoading,
  portMapError,
  onRetryPortMap,
  usage,
  usageLoading,
  usageError,
  onRetryUsage,
  hours,
  onHoursChange,
  service,
  onServiceChange,
}: {
  routerId: number;
  portMap: PortAnalyticsResponse | null;
  portMapLoading: boolean;
  portMapError: string | null;
  onRetryPortMap: () => void;
  usage: BandwidthHistory | null;
  usageLoading: boolean;
  usageError: string | null;
  onRetryUsage: () => void;
  hours: number;
  onHoursChange: (h: number) => void;
  service: DownloadUsageServiceFilter;
  onServiceChange: (s: DownloadUsageServiceFilter) => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('ports');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  const controls = (
    <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg">
      {(['ports', 'usage'] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`period-pill whitespace-nowrap ${
            mode === m ? 'period-pill-active' : 'period-pill-inactive'
          }`}
        >
          {m === 'ports' ? 'Ports' : 'Usage'}
        </button>
      ))}
    </div>
  );

  const meta =
    mode === 'ports' && portMap?.cache_age_seconds != null ? (
      <span>Updated {Math.round(portMap.cache_age_seconds)}s ago</span>
    ) : undefined;

  return (
    <SectionCard
      title="Ports & Usage"
      accent="purple"
      loading={mode === 'ports' ? portMapLoading : usageLoading}
      meta={meta}
      controls={controls}
    >
      {mode === 'usage' ? (
        <DownloadUsageBody
          data={usage}
          loading={usageLoading}
          error={usageError}
          onRetry={onRetryUsage}
          hours={hours}
          onHoursChange={onHoursChange}
          service={service}
          onServiceChange={onServiceChange}
        />
      ) : (
        <PortsBody
          data={portMap}
          error={portMapError}
          onRetry={onRetryPortMap}
          routerId={routerId}
          selectedPort={selectedPort}
          onSelectPort={setSelectedPort}
        />
      )}
    </SectionCard>
  );
}

function PortsBody({
  data,
  error,
  onRetry,
  routerId,
  selectedPort,
  onSelectPort,
}: {
  data: PortAnalyticsResponse | null;
  error: string | null;
  onRetry: () => void;
  routerId: number;
  selectedPort: string | null;
  onSelectPort: (port: string) => void;
}) {
  if (error) {
    return <SectionError message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-40 skeleton rounded-xl" />
      </div>
    );
  }

  if (data.ports.length === 0) {
    return <p className="text-sm text-foreground-muted text-center py-6">No bridge ports found on this router</p>;
  }

  const effectiveSelected = selectedPort && data.ports.some((p) => p.port === selectedPort)
    ? selectedPort
    : defaultPortSelection(data.ports);
  const selected = data.ports.find((p) => p.port === effectiveSelected) ?? null;
  const detailsHref = `/diagnostics?tab=analytics&router=${routerId}${effectiveSelected ? `&port=${effectiveSelected}` : ''}`;
  // New-backend responses carry device classification; without it the panel
  // renders the pre-redesign (legacy) markup unchanged.
  const tiered = responseHasDeviceTiers(data);

  const uplinkNames = new Set(data.ports.filter(isUplinkPort).map((p) => p.port));
  const warningPorts = data.warnings.map((w) => w.port).filter((p) => !uplinkNames.has(p));

  return (
    <div>
      <PortFaceplate
        ports={data.ports}
        selectedPort={effectiveSelected}
        onSelect={onSelectPort}
        size="sm"
      />

      {warningPorts.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400 mt-3">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="truncate">
            {warningPorts.length} port warning{warningPorts.length !== 1 ? 's' : ''}: <span className="font-mono">{warningPorts.join(', ')}</span>
          </span>
        </div>
      )}

      {selected && <SelectedPortPanel key={selected.port} port={selected} detailsHref={detailsHref} tiered={tiered} />}
    </div>
  );
}

function SelectedPortPanel({
  port, detailsHref, tiered,
}: {
  port: PortAnalyticsPort;
  detailsHref: string;
  tiered: boolean;
}) {
  const status = portVisualStatus(port);
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.down;

  // Tiered mode (classified response): only equipment + paying customers are
  // rendered — never-paid/unknown devices are omitted entirely, rows AND
  // counts. Legacy mode renders exactly the pre-redesign markup.
  const { equipment, paying } = tiered
    ? splitDeviceTiers(port)
    : { equipment: [] as EquipmentEntry[], paying: [] as DownstreamDeviceSample[] };
  const tieredTotal = equipment.length + paying.length;
  const tieredShownEquipment = equipment.slice(0, 5);
  const tieredShownPaying = paying.slice(0, Math.max(0, 5 - tieredShownEquipment.length));
  const tieredMoreCount = Math.max(0, tieredTotal - tieredShownEquipment.length - tieredShownPaying.length);

  const devices = tiered ? [] : sortDevices(port.downstream_devices_sample).slice(0, 5);
  const moreCount = tiered ? 0 : Math.max(0, port.counts.learned_macs - devices.length);

  return (
    <div className="mt-3 pt-3 border-t border-border animate-fade-in">
      {/* Selected port header */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-mono font-semibold text-foreground text-sm">{port.port}</span>
          <span className={`badge text-[10px] ${badge.badge}`}>{badge.label}</span>
          {port.link.up && port.link.rate && (
            <span className="text-xs text-foreground-muted">{port.link.rate}</span>
          )}
          {port.bridge && <span className="text-xs text-foreground-muted hidden sm:inline">· {port.bridge}</span>}
        </div>
        <Link href={detailsHref} className="btn-ghost text-xs whitespace-nowrap flex-shrink-0">
          Details →
        </Link>
      </div>

      {status === 'uplink' ? (
        <p className="text-xs text-sky-500">WAN uplink — brings the internet into this router.</p>
      ) : status === 'down' ? (
        <p className="text-xs text-foreground-muted">No physical link on this port.</p>
      ) : status === 'silent_link' ? (
        <p className="text-xs text-amber-400">Link is up but nothing downstream is talking.</p>
      ) : tiered ? (
        <>
          {/* Counts line — total devices is an aggregate port figure; the
              per-tier counts never surface never-paid/unknown devices */}
          <p className="text-xs text-foreground-muted mb-2">
            <span className="font-medium text-foreground">{port.counts.learned_macs}</span> devices ·{' '}
            <span className="font-medium text-foreground">{equipment.length}</span> equipment ·{' '}
            <span className="font-medium text-foreground">{paying.length}</span> customer{paying.length !== 1 ? 's' : ''}
            {port.revenue && port.revenue.this_month > 0 && (
              <> · <span className="font-medium text-foreground">{formatKESCompact(port.revenue.this_month)}</span> this month</>
            )}
          </p>

          {/* Equipment, with the port's customers grouped beneath it — the
              nesting reads: this port's equipment carries these customers. */}
          {tieredTotal > 0 ? (
            <div className="space-y-1">
              {tieredShownEquipment.map((device) => (
                <EquipmentMiniRow key={device.mac} device={device} />
              ))}
              <div className="ml-3 pl-2 border-l-2 border-border space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-foreground-muted pt-0.5">
                  {paying.length} customer{paying.length !== 1 ? 's' : ''} on this port
                </p>
                {tieredShownPaying.map((device) => (
                  <PayingMiniRow key={device.mac} device={device} />
                ))}
              </div>
              {tieredMoreCount > 0 && (
                <Link href={detailsHref} className="block text-[11px] text-foreground-muted hover:text-foreground transition-colors pt-1">
                  +{tieredMoreCount} more — see all in Port Map →
                </Link>
              )}
            </div>
          ) : port.downstream_devices_sample.length > 0 ? (
            <p className="text-xs text-foreground-muted">No paying customers are currently seen on this port.</p>
          ) : (
            <p className="text-xs text-foreground-muted">No device samples captured for this port.</p>
          )}
        </>
      ) : (
        <>
          {/* Counts line */}
          <p className="text-xs text-foreground-muted mb-2">
            <span className="font-medium text-foreground">{port.counts.learned_macs}</span> devices ·{' '}
            <span className="font-medium text-foreground">{port.counts.known_customers_connected}</span> customers online ·{' '}
            <span className="font-medium text-foreground">{port.counts.hotspot_hosts_seen}</span> hotspot
            {port.counts.unknown_devices > 0 && (
              <> · <span className="font-medium text-foreground">{port.counts.unknown_devices}</span> unknown</>
            )}
            {port.revenue && port.revenue.this_month > 0 && (
              <> · <span className="font-medium text-foreground">{formatKESCompact(port.revenue.this_month)}</span> this month</>
            )}
          </p>

          {/* Connected devices */}
          {devices.length > 0 ? (
            <div className="space-y-1">
              {devices.map((device) => (
                <DeviceRow key={device.mac} device={device} />
              ))}
              {moreCount > 0 && (
                <Link href={detailsHref} className="block text-[11px] text-foreground-muted hover:text-foreground transition-colors pt-1">
                  +{moreCount} more device{moreCount !== 1 ? 's' : ''} — see all in Port Map →
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-foreground-muted">No device samples captured for this port.</p>
          )}
        </>
      )}
    </div>
  );
}

function DeviceRow({ device }: { device: DownstreamDeviceSample }) {
  const isInfra = device.kind === 'infrastructure';
  const online = device.hotspot_active || device.ppp_active;
  const label = device.name || device.mac;

  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-background-tertiary/40 min-w-0">
      {isInfra ? (
        <svg className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ) : (
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`}
          title={online ? 'Online now' : 'Not currently active'}
        />
      )}
      <span className={`text-xs truncate min-w-0 flex-1 ${device.name ? 'text-foreground' : 'font-mono text-foreground-muted'}`}>
        {label}
      </span>
      <span className={`badge text-[9px] flex-shrink-0 ${
        isInfra ? 'bg-purple-500/20 text-purple-400' :
        device.kind === 'known_customer' ? 'bg-blue-500/20 text-blue-400' :
        'bg-foreground-muted/20 text-foreground-muted'
      }`}>
        {isInfra ? 'Infra' : device.kind === 'known_customer' ? 'Customer' : 'Unknown'}
      </span>
      {device.last_seen && (
        <span className="text-[10px] font-mono text-foreground-muted flex-shrink-0 hidden sm:inline">{device.last_seen}</span>
      )}
    </div>
  );
}

// ─── Tiered compact rows (new-backend responses only) ───────────────────────
// Labels come from deviceTiers identity resolution — never a raw full MAC.

function EquipmentMiniRow({ device }: { device: EquipmentEntry }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg min-w-0 bg-background-tertiary/40">
      <svg className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
      <span className="text-xs truncate min-w-0 flex-1 text-foreground">{equipmentDisplayName(device)}</span>
      <span className="badge text-[9px] flex-shrink-0 bg-purple-500/20 text-purple-400">Equipment</span>
      {device.last_seen && (
        <span className="text-[10px] font-mono text-foreground-muted flex-shrink-0 hidden sm:inline">{device.last_seen}</span>
      )}
    </div>
  );
}

function PayingMiniRow({ device }: { device: DownstreamDeviceSample }) {
  const online = device.hotspot_active || device.ppp_active;
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg bg-background-tertiary/40 min-w-0">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-foreground-muted/30'}`}
        title={online ? 'Online now' : 'Not currently active'}
      />
      <span className="text-xs truncate min-w-0 flex-1 text-foreground">{deviceDisplayName(device)}</span>
      <span className="badge text-[9px] flex-shrink-0 bg-blue-500/20 text-blue-400">Customer</span>
      {device.last_seen && (
        <span className="text-[10px] font-mono text-foreground-muted flex-shrink-0 hidden sm:inline">{device.last_seen}</span>
      )}
    </div>
  );
}
