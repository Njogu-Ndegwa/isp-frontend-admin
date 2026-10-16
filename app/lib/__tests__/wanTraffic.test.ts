import { describe, expect, it } from 'vitest';
import { configuredWanPorts, wanTraffic, withWanRoles } from '../wanTraffic';
import { demoPortAnalytics } from '../demoData';
import type { RouterLive } from '../types';

const report = {
  router_id: 606, report_age_seconds: 12, interval_seconds: 60,
  ports: [
    { name: 'ether1', rx_bps: 80_000_000, tx_bps: 4_000_000 },
    { name: 'ether2', rx_bps: 76_000_000, tx_bps: 3_900_000 },
  ],
} as RouterLive;

describe('WAN traffic attribution', () => {
  it('uses the selected interface and never another router or router-wide rate', () => {
    expect(wanTraffic(report, 606, 'ether2')?.rxBps).toBe(76_000_000);
    expect(wanTraffic(report, 606, 'ether1')?.rxBps).toBe(80_000_000);
    expect(wanTraffic(report, 354, 'ether2')).toBeNull();
    expect(wanTraffic(report, 606, 'ether3')).toBeNull();
  });
  it('distinguishes zero, missing, invalid, and stale readings', () => {
    expect(wanTraffic(null, 606, 'ether2')).toBeNull();
    const sample = { ...report, ports: [{ ...report.ports![1], rx_bps: 0, tx_bps: null }] };
    expect(wanTraffic(sample, 606, 'ether2')).toMatchObject({ rxBps: 0, txBps: null, stale: false });
    expect(wanTraffic({ ...report, report_age_seconds: 600 }, 606, 'ether2')?.stale).toBe(true);
    sample.ports[0].rx_bps = NaN;
    expect(wanTraffic(sample, 606, 'ether2')?.rxBps).toBeNull();
  });
  it('recognizes configured unbridged WANs without guessing every ether2 is a WAN', () => {
    const ports = demoPortAnalytics(1).ports;
    const second = { ...ports[0], port: 'ether2', bridge: '' };
    expect(withWanRoles([second], ['ether1', 'ether2'])[0].uplink).toBe(true);
    expect(withWanRoles([{ ...second, bridge: 'bridge' }], ['ether2'])[0].uplink).toBe(false);
    expect(configuredWanPorts({ lb_enabled: false, lb_config: { wan_ports: ['ether1', 'ether2'] } })).toEqual(['ether1']);
  });
});
