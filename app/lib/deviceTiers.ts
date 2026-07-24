// Shared device-tier logic for every surface that renders per-port device
// lists from GET /routers/{id}/port-analytics (diagnostics Port Map tab and
// the dashboard Ports & Usage card).
//
// Product decision (Dennis, 2026-07-24): these views render ONLY
//  - APs / network equipment, and
//  - devices that map to a paying billing customer (recorded revenue > 0).
// Every other device (never-paid registered customers, unknown/visitor
// devices) is omitted entirely — no rows and no counts of them — and raw
// full MAC addresses are never a device row's visible label.

import type {
  DownstreamDeviceSample,
  PortAnalyticsPort,
  PortAnalyticsResponse,
} from './types';

// The backend gained computed device classification (device_class / vendor /
// router_mode_suspect on device rows, hotspot_subnets_inferred at top level)
// in 2026-07. Older backends and cached responses lack these fields — when
// they are absent, consuming views must render exactly as they did before
// the tiered device view existed.
export function responseHasDeviceTiers(data: PortAnalyticsResponse): boolean {
  return (
    data.hotspot_subnets_inferred !== undefined
    || data.ports.some((p) => p.downstream_devices_sample.some((d) => d.device_class !== undefined))
  );
}

// One row in a per-port "Equipment" group: union of the port's
// infrastructure[] entries and downstream samples classified as infrastructure.
// The API's router_mode_suspect field is intentionally NOT carried here —
// product decision 2026-07-24: nothing about router mode is shown to users.
export interface EquipmentEntry {
  mac: string;
  name: string;
  ip: string;
  vendor?: string | null;
  board?: string;
  platform?: string;
  version?: string;
  source?: string;
  last_seen?: string;
}

// Split a port's devices into the tiers the redesigned views render:
//  - equipment: device_class=="infrastructure" or present in infrastructure[]
//  - paying: devices that map to a billing customer with recorded revenue
// Customer-class devices with no paying signal are deliberately NOT returned
// and never rendered.
export function splitDeviceTiers(port: PortAnalyticsPort): {
  equipment: EquipmentEntry[];
  paying: DownstreamDeviceSample[];
} {
  const equipmentByMac = new Map<string, EquipmentEntry>();
  for (const device of port.infrastructure) {
    equipmentByMac.set(device.mac, {
      mac: device.mac,
      name: device.name,
      ip: device.ip,
      vendor: device.vendor,
      board: device.board,
      platform: device.platform,
      version: device.version,
      source: device.source,
      last_seen: device.last_seen,
    });
  }
  const paying: DownstreamDeviceSample[] = [];
  for (const device of port.downstream_devices_sample) {
    const isEquipment =
      device.device_class === 'infrastructure'
      || device.kind === 'infrastructure'
      || equipmentByMac.has(device.mac);
    if (isEquipment) {
      const existing = equipmentByMac.get(device.mac);
      if (existing) {
        // The sample row may carry classification the infrastructure[] entry lacks.
        if (existing.vendor == null && device.vendor != null) existing.vendor = device.vendor;
      } else {
        equipmentByMac.set(device.mac, {
          mac: device.mac,
          name: device.name,
          ip: device.ip,
          vendor: device.vendor,
          last_seen: device.last_seen,
        });
      }
    } else if (device.customer_id != null && (device.revenue_total ?? 0) > 0) {
      paying.push(device);
    }
  }
  // Simple, neutral ordering: vendor name, then MAC tail.
  const equipment = [...equipmentByMac.values()].sort((a, b) => {
    const byVendor = (a.vendor ?? '').localeCompare(b.vendor ?? '');
    if (byVendor !== 0) return byVendor;
    return macTail(a.mac, 6).localeCompare(macTail(b.mac, 6));
  });
  return { equipment, paying };
}

// Last N hex digits of a MAC, re-grouped in pairs ("DC:B0"). Used so raw full
// MACs are never the visible label of a device row.
export function macTail(mac: string, hexDigits: number): string {
  const hex = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  const tail = hex.slice(-hexDigits);
  return (tail.match(/.{1,2}/g) ?? [tail]).join(':');
}

// Identity resolution for device rows (product decision 2026-07-24):
// billing customer name → customer phone (not carried by this endpoint yet) →
// DHCP hostname/identity → vendor + last-4 (equipment) → shortened MAC.
// The backend already folds steps 1 and 3 into `name` (customer name for
// known customers, DHCP hostname / neighbor identity otherwise).
export function deviceDisplayName(device: DownstreamDeviceSample): string {
  if (device.name) return device.name;
  return `Device · …${macTail(device.mac, 6)}`;
}

export function equipmentDisplayName(device: EquipmentEntry): string {
  if (device.name) return device.name;
  if (device.vendor) return `${device.vendor} AP · ${macTail(device.mac, 4)}`;
  return `Equipment · …${macTail(device.mac, 6)}`;
}
