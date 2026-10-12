import type { StaticStatusResponse } from '../../lib/types';

export type StaticTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StaticFinding {
  tone: StaticTone;
  text: string;
}

/**
 * Turn the router's view of a static-IP customer into plain findings, worst
 * first. Pure so it can be tested without rendering.
 */
export function staticFindings(status: StaticStatusResponse): StaticFinding[] {
  const r = status.router;
  const out: StaticFinding[] = [];
  if (!r.reachable || r.error) {
    out.push({
      tone: 'warning',
      text: `Router ${status.router_name} could not be reached${r.error ? `: ${r.error}` : ''}. Changes are applied automatically when it is back.`,
    });
    return out;
  }
  if (r.gateway_ok === false) {
    out.push({
      tone: 'danger',
      text: `The router has no address in ${status.static_ip}'s network, so the device has no gateway. Add one (e.g. ${gatewayGuess(status.static_ip)}) on the LAN bridge.`,
    });
  }
  if (status.actual_access !== status.expected_access) {
    out.push({
      tone: 'danger',
      text: status.expected_access === 'enabled'
        ? 'Paid up but the router is not giving access yet. Press Re-sync.'
        : 'Not paid up but the router still gives access. Press Re-sync or Suspend.',
    });
  }
  if (!r.queue) {
    out.push({ tone: 'warning', text: 'No speed limit on the router for this IP. Press Re-sync.' });
  } else if (r.queue.shadowed) {
    out.push({ tone: 'warning', text: 'Another queue sits above this one, so the plan speed is not enforced. Press Re-sync.' });
  }
  if (r.pinned_mac && r.observed_mac && r.pinned_mac !== r.observed_mac) {
    out.push({
      tone: 'danger',
      text: `A different device (${r.observed_mac}) is using this IP and is being blocked. If the customer replaced their router, reset the pin.`,
    });
  }
  if (!r.pinned_mac && !status.static_mac) {
    out.push({
      tone: 'neutral',
      text: 'Not pinned to a device yet. It is pinned automatically the first time the device is seen while paid up.',
    });
  }
  if (out.length === 0) {
    out.push({ tone: 'success', text: 'Router matches the account: access, speed and device pin are all in place.' });
  }
  return out;
}

/** "192.168.2.24" -> "192.168.2.1/24": the usual gateway for a /24. */
export function gatewayGuess(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4) return 'x.x.x.1/24';
  return `${parts[0]}.${parts[1]}.${parts[2]}.1/24`;
}

/** Light check before sending; the backend validates for real. */
export function looksLikeIPv4(value: string): boolean {
  const m = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return !!m && m.slice(1).every((n) => Number(n) <= 255);
}
