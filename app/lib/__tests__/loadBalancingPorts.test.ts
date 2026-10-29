import { describe, expect, it } from 'vitest';
import { isSupportedWanPortName } from '../loadBalancingPorts';

describe('isSupportedWanPortName', () => {
  it.each([
    'ether1', 'ether10', 'sfp1', 'sfpplus1', 'sfp-sfpplus1', 'sfp-sfpplus12',
    'sfp28-1', 'qsfpplus1-1', 'qsfp28-2-4', 'combo1',
  ])('accepts the physical port %s', (name) => {
    expect(isSupportedWanPortName(name)).toBe(true);
  });

  it.each([
    'bridge', 'bridge1', 'vlan10', 'ether1.10', 'wlan1', 'wifi1', 'wg-aws',
    'pppoe-out1', 'l2tp-out1', 'sfp-sfpplus', 'SFP-SFPPLUS1', '', 'ether',
  ])('rejects %s', (name) => {
    expect(isSupportedWanPortName(name)).toBe(false);
  });

  it('rejects missing names', () => {
    expect(isSupportedWanPortName(undefined)).toBe(false);
    expect(isSupportedWanPortName(null)).toBe(false);
  });
});
