import type { NetworkPort, NetworkRouter, PortRole } from './assistant';

/*
 * A router's ports on the home screen, in words a reseller uses: what each socket was
 * set up for in Bitwave and whether it has a link. Pure, for tests; the card draws it.
 */

export const ROLE_LABEL: Record<PortRole, string> = {
  internet: 'Internet line',
  hotspot: 'Hotspot',
  pppoe: 'PPPoE',
  both: 'Hotspot + PPPoE',
  free: 'Free, no login',
  unused: 'Not used',
};

/** The word under a socket: short enough for a 46 px square. */
export const ROLE_SHORT: Record<PortRole, string> = {
  internet: 'Internet',
  hotspot: 'Hotspot',
  pppoe: 'PPPoE',
  both: 'Both',
  free: 'Free',
  unused: '',
};

/**
 * The classic Ports page's colours (PortFaceplate): uplink blue for the internet line,
 * up green when devices talk behind it, silent amber when a cable is in but no device
 * talks (an access point that is off, frozen or not passing traffic), lost red when it
 * had a link since the router started and lost it, off switched off, empty nothing plugged in.
 */
export type PortLight = 'uplink' | 'up' | 'silent' | 'lost' | 'off' | 'empty';

export function portLight(p: NetworkPort): PortLight {
  if (p.up) {
    if (p.role === 'internet') return 'uplink';
    // devices null = not reported: say nothing rather than guess
    return p.devices === 0 ? 'silent' : 'up';
  }
  if (p.lost_link) return 'lost';
  return p.disabled ? 'off' : 'empty';
}

/** "ether7" -> "7", "sfp-sfpplus1" -> "S+1": the number printed on the router's front. */
export function portNumber(name: string): string {
  const ether = /^ether(\d+)$/i.exec(name);
  if (ether) return ether[1];
  const sfpPlus = /^sfp-sfpplus(\d+)$/i.exec(name);
  if (sfpPlus) return `S+${sfpPlus[1]}`;
  const sfp = /^sfp(\d+)$/i.exec(name);
  if (sfp) return `S${sfp[1]}`;
  const combo = /^combo(\d+)$/i.exec(name);
  return combo ? `C${combo[1]}` : name.slice(0, 4);
}

const LIGHT_WORDS: Record<PortLight, string> = {
  uplink: 'connected', up: 'connected', silent: 'cable in, no device talking', lost: 'lost its link', off: 'switched off', empty: 'nothing plugged in',
};

/** "ether6 · Hotspot · lost its link · dropped 3×" */
export function portTitle(p: NetworkPort): string {
  const light = portLight(p);
  const bits = [p.name, ROLE_LABEL[p.role], LIGHT_WORDS[light]];
  if (light === 'up' && typeof p.devices === 'number' && p.role !== 'internet') bits.push(`${p.devices} ${p.devices === 1 ? 'device' : 'devices'}`);
  if (p.link_downs > 0) bits.push(`dropped ${p.link_downs}×`);
  return bits.join(' · ');
}

/** Ports that went dark while the router itself is up: the thing to tell someone. */
export function lostPorts(r: Pick<NetworkRouter, 'status' | 'ports'>): NetworkPort[] {
  return r.status === 'online' ? (r.ports ?? []).filter((p) => p.lost_link) : [];
}

/** Ports with a cable in but no device talking on them, while the router itself is up. */
export function silentPorts(r: Pick<NetworkRouter, 'status' | 'ports'>): NetworkPort[] {
  return r.status === 'online' ? (r.ports ?? []).filter((p) => portLight(p) === 'silent') : [];
}

/** What to check on a port with a cable in but no device talking on it. */
export function silentPortAdvice(p: NetworkPort): string {
  return `Port ${portNumber(p.name)} (${ROLE_LABEL[p.role].toLowerCase()}) has a cable in but no device is talking on it: the access point or switch there may be off, frozen or not passing traffic. Check its power and restart it.`;
}

/** The plain-words fix for a port that lost its link. */
export function lostPortAdvice(p: NetworkPort): string {
  const n = portNumber(p.name);
  if (p.role === 'internet') return `Port ${n}, the internet line, has no link: check the cable from your internet provider and that their box has power.`;
  return `Port ${n} (${ROLE_LABEL[p.role].toLowerCase()}) lost its link, so what it feeds is cut off: check its cable and the power to the access point or switch on it.`;
}

/**
 * The saved setup in one line, for a router that sends no port report (offline, or an
 * older report): "Internet: ether1 · PPPoE: ether4 · every other port: hotspot".
 */
export function portSetupLine(setup: NetworkRouter['port_setup']): string | null {
  if (!setup) return null;
  const parts = ([['internet', 'Internet'], ['pppoe', 'PPPoE'], ['both', 'Hotspot + PPPoE'], ['free', 'Free, no login']] as const)
    .filter(([k]) => (setup[k] ?? []).length)
    .map(([k, label]) => `${label}: ${setup[k].join(', ')}`);
  return parts.length ? [...parts, 'every other port: hotspot'].join(' · ') : null;
}
