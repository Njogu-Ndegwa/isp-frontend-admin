import { describe, expect, it } from 'vitest';
import type { Router } from './types';
import { displayRouterName, pickDefaultRouterId, routerOptionLabel } from './routerPick';

const r = (id: number, name: string, extra: Partial<Router> = {}): Router => ({
  id,
  name,
  identity: `Router-${id}`,
  ip_address: `10.0.0.${id % 250}`,
  port: 8728,
  auth_method: 'hotspot',
  ...extra,
});

// The 2026-09-27 case: same name, old router offline, new router online.
const oldDead = r(536, 'MtaaniNet Hotspot  #3', { identity: 'Router-1201', status: 'offline' });
const newLive = r(539, 'MtaaniNet Hotspot  #3', { identity: 'Router-1215', status: 'online' });

describe('pickDefaultRouterId', () => {
  it('prefers the newest online router over the oldest', () => {
    expect(pickDefaultRouterId([oldDead, newLive])).toBe(539);
    expect(pickDefaultRouterId([r(1, 'a', { status: 'online' }), r(5, 'b', { status: 'offline' }), r(3, 'c', { status: 'online' })])).toBe(3);
  });
  it('falls back to the newest router when none is online', () => {
    expect(pickDefaultRouterId([r(2, 'a', { status: 'offline' }), r(7, 'b')])).toBe(7);
  });
  it('uses the remembered router when it is still in the list', () => {
    expect(pickDefaultRouterId([oldDead, newLive], 536)).toBe(536);
    expect(pickDefaultRouterId([oldDead, newLive], 999)).toBe(539);
  });
  it('returns null for an empty list', () => {
    expect(pickDefaultRouterId([])).toBeNull();
  });
});

describe('routerOptionLabel', () => {
  it('disambiguates routers that share a name and shows status', () => {
    const all = [oldDead, newLive];
    expect(routerOptionLabel(newLive, all)).toBe('MtaaniNet Hotspot #3 · Router-1215 · ● online');
    expect(routerOptionLabel(oldDead, all)).toBe('MtaaniNet Hotspot #3 · Router-1201 · ○ offline');
  });
  it('keeps unique names short', () => {
    expect(routerOptionLabel(r(1, 'Home', { status: 'online' }), [r(1, 'Home'), r(2, 'Shop')])).toBe('Home · ● online');
    expect(routerOptionLabel(r(1, 'Home'), [r(1, 'Home')])).toBe('Home');
  });
  it('falls back to IP when identity does not tell the twins apart', () => {
    const a = r(10, 'Shop', { identity: 'Shop' });
    const b = r(11, 'Shop', { identity: 'Shop' });
    expect(routerOptionLabel(a, [a, b])).toBe('Shop · 10.0.0.10');
  });
});

describe('displayRouterName', () => {
  it('collapses repeated whitespace', () => {
    expect(displayRouterName('  MtaaniNet Hotspot  #3 ')).toBe('MtaaniNet Hotspot #3');
  });
});
