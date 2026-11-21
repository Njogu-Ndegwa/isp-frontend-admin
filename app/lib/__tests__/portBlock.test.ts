import { describe, expect, it } from 'vitest';
import { portFacts, portShort } from '../../assistant/blocks/PortBlock';
import { entityOf } from '../assistantEntities';

const port = (over: Record<string, unknown> = {}) => ({
  port: 'ether3', bridge: 'bridge', link: { up: true, rate: '100Mbps', link_downs: 7 },
  health: { status: 'active', warnings: ['2 access points or switches share this port (a chain)'] },
  counts: { learned_macs: 23, known_customers_connected: 9 },
  revenue: { paying_customers: 11, today: 450 },
  traffic: { rx_error: 0, tx_error: 0 },
  infrastructure: [{ mac: 'AA:01', name: 'Kitchen AP', vendor: 'TP-Link' }],
  downstream_devices_sample: [
    { mac: 'AA:02', vendor: 'Tenda', device_class: 'infrastructure', router_mode_suspect: true },
    { mac: 'AA:03', name: 'Amina', kind: 'known_customer' },
  ],
  ...over,
});

describe('ports, as port-analytics reads them', () => {
  it('finds the ports even when another list in the answer is longer', () => {
    const payload = { warnings: [{ port: 'ether3', warnings: ['x'] }], infrastructure_candidates: Array.from({ length: 30 }, (_, i) => ({ port: 'ether3', mac: `M${i}` })), ports: [port(), port({ port: 'ether4' })] };
    const found = entityOf(payload);
    expect(found?.entity).toBe('port');
    expect(found?.rows).toHaveLength(2);
  });
  it('reads what a reseller needs', () => {
    const p = portFacts(port());
    expect(p).toMatchObject({ name: 'ether3', short: '3', state: 'active', rate: '100Mbps', drops: 7, devices: 23, paying: 11, online: 9, today: 450 });
    expect(p.equipment.map((e) => [e.name, e.routerMode])).toEqual([['Tenda', true], ['Kitchen AP', false]]);
    expect(p.customers).toEqual(['Amina']);
  });
  it('treats ether1 as the internet line, without the "no devices" warning', () => {
    const p = portFacts(port({ port: 'ether1', bridge: '', health: { status: 'silent_link', warnings: ['Link is up but no downstream MACs are currently learned'] } }));
    expect(p.state).toBe('uplink');
    expect(p.warnings).toEqual([]);
  });
  it('reads a silent link, a dead one, and faceplate numbers', () => {
    expect(portFacts(port({ port: 'ether4', health: { status: 'silent_link', warnings: [] } })).state).toBe('silent');
    expect(portFacts(port({ port: 'ether5', link: { up: false }, health: { status: 'down', warnings: [] } })).state).toBe('down');
    expect([portShort('ether10'), portShort('sfp-sfpplus1'), portShort('sfp2')]).toEqual(['10', 'S+1', 'S2']);
  });
});
