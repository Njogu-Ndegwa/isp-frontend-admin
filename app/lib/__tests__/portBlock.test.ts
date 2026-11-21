import { describe, expect, it } from 'vitest';
import { portFacts } from '../../assistant/blocks/PortBlock';
import { entityOf } from '../assistantEntities';

describe('a port, as port-analytics reads it', () => {
  const row = {
    port: 'ether3', link: { up: true, rate: '100Mbps', link_downs: 7 },
    health: { status: 'active', warnings: ['2 access points or switches share this port (a chain)'] },
    counts: { learned_macs: 23, known_customers_connected: 9 },
    revenue: { paying_customers: 11, today: 450 },
    infrastructure: [{ mac: 'AA:01', name: 'Kitchen AP', vendor: 'TP-Link' }],
    downstream_devices_sample: [{ mac: 'AA:02', vendor: 'Tenda', device_class: 'infrastructure', router_mode_suspect: true }],
  };

  it('is recognised as a port and read into what a reseller needs', () => {
    expect(entityOf({ ports: [row] })?.entity).toBe('port');
    const p = portFacts(row);
    expect(p).toMatchObject({ name: 'ether3', state: 'active', rate: '100Mbps', drops: 7, devices: 23, paying: 11, online: 9, today: 450 });
    expect(p.equipment.map((e) => [e.name, e.routerMode])).toEqual([['Tenda', true], ['Kitchen AP', false]]);
    expect(p.warnings).toHaveLength(1);
  });

  it('reads a silent link and a dead one', () => {
    expect(portFacts({ port: 'ether4', link: { up: true }, health: { status: 'silent_link', warnings: [] } }).state).toBe('silent');
    expect(portFacts({ port: 'ether5', link: { up: false }, health: { status: 'down', warnings: [] } }).state).toBe('down');
  });
});
