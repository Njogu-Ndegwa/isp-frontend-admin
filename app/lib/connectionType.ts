import type { ConnectionType } from './types';

/** Human label for a plan/customer connection type. Unknown values read as Hotspot. */
export function connectionTypeLabel(type: string | null | undefined): string {
  if (type === 'pppoe') return 'PPPoE';
  if (type === 'static_ip') return 'Static IP';
  return 'Hotspot';
}

/** Narrow whatever the backend sent to a known type (hotspot when unknown). */
export function toConnectionType(type: string | null | undefined): ConnectionType {
  return type === 'pppoe' || type === 'static_ip' ? type : 'hotspot';
}

export const CONNECTION_TYPES: ConnectionType[] = ['hotspot', 'pppoe', 'static_ip'];
