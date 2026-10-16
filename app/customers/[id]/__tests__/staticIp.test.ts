import { describe, expect, it } from 'vitest';
import { gatewayGuess, looksLikeIPv4, staticFindings, staticRate, staticTraffic } from '../staticIp';
import { connectionTypeLabel, toConnectionType } from '../../../lib/connectionType';
import type { StaticStatusResponse } from '../../../lib/types';

function status(overrides: Partial<StaticStatusResponse> = {}, router: Partial<StaticStatusResponse['router']> = {}): StaticStatusResponse {
  return {
    customer_id: 1,
    static_ip: '192.168.2.24',
    static_mac: '50:0F:F5:C1:07:50',
    status: 'active',
    expiry: '2026-11-12T00:00:00',
    expected_access: 'enabled',
    actual_access: 'enabled',
    in_sync: true,
    plan_speed: '10M/10M',
    router_id: 602,
    router_name: 'SwapNet Solutions #1',
    router: {
      reachable: true,
      gateway_ok: true,
      binding: { enabled: true, type: 'bypassed', comment: '' },
      queue: { name: 'plan_static:192.168.2.24', max_limit: '10M/10M', rate: '0/0', bytes: '0/0', disabled: false, shadowed: false },
      pinned_mac: '50:0F:F5:C1:07:50',
      observed_mac: '50:0F:F5:C1:07:50',
      ...router,
    },
    ...overrides,
  };
}

describe('staticFindings', () => {
  it('all good', () => {
    expect(staticFindings(status())).toEqual([
      { tone: 'success', text: expect.stringContaining('Router matches') },
    ]);
  });

  it('unreachable router short-circuits', () => {
    const f = staticFindings(status({}, { reachable: false, error: 'timed out' }));
    expect(f).toHaveLength(1);
    expect(f[0].text).toContain('timed out');
  });

  it('flags paid customer without access', () => {
    const f = staticFindings(status({ actual_access: 'suspended' }));
    expect(f[0]).toMatchObject({ tone: 'danger' });
    expect(f[0].text).toContain('Paid up');
  });

  it('flags unpaid customer still online', () => {
    const f = staticFindings(status({ expected_access: 'suspended' }));
    expect(f[0].text).toContain('Not paid up');
  });

  it('flags a spoofing device', () => {
    const f = staticFindings(status({}, { observed_mac: 'AA:AA:AA:AA:AA:AA' }));
    expect(f.map((x) => x.text).join(' ')).toContain('AA:AA:AA:AA:AA:AA');
  });

  it('missing gateway and queue', () => {
    const f = staticFindings(status({}, { gateway_ok: false, queue: null }));
    expect(f[0].text).toContain('192.168.2.1/24');
    expect(f.some((x) => x.text.includes('No speed limit'))).toBe(true);
  });

  it('unpinned is informational', () => {
    const f = staticFindings(status({ static_mac: null }, { pinned_mac: null }));
    expect(f).toEqual([{ tone: 'neutral', text: expect.stringContaining('Not pinned') }]);
  });
});

describe('helpers', () => {
  it('shows static link traffic in upload/download order from the router queue', () => {
    const live = status({}, { queue: {
      name: 'plan_static:192.168.2.24', max_limit: '10M/10M', rate: '1000/2000',
      bytes: '1048576/2097152', disabled: false, shadowed: false,
    } });
    expect(staticTraffic(live)).toEqual({ upload: 1048576, download: 2097152, source: 'queue' });
    expect(staticRate(live)).toEqual({ upload: 1000, download: 2000 });
  });
  it('uses host counters only when a queue counter is unavailable', () => {
    const live = status({}, {
      queue: null,
      host: { mac: '50:0F:F5:C1:07:50', bypassed: true, idle_time: null, uptime: '2h', bytes_in: '1200', bytes_out: '2400' },
    });
    expect(staticTraffic(live)).toEqual({ upload: 1200, download: 2400, source: 'host' });
    expect(staticTraffic(status({}, { reachable: false }))).toBeNull();
    expect(staticTraffic(status({}, { queue: null }))).toBeNull();
  });
  it('gatewayGuess', () => {
    expect(gatewayGuess('10.5.7.99')).toBe('10.5.7.1/24');
  });
  it('looksLikeIPv4', () => {
    expect(looksLikeIPv4('192.168.2.24')).toBe(true);
    expect(looksLikeIPv4('192.168.2.256')).toBe(false);
    expect(looksLikeIPv4('192.168.2')).toBe(false);
  });
  it('connection type labels', () => {
    expect(connectionTypeLabel('static_ip')).toBe('Static IP');
    expect(connectionTypeLabel('pppoe')).toBe('PPPoE');
    expect(connectionTypeLabel(undefined)).toBe('Hotspot');
    expect(toConnectionType('weird')).toBe('hotspot');
  });
});
