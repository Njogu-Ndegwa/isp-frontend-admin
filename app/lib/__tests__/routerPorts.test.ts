import { describe, expect, it } from 'vitest';
import type { NetworkPort } from '../assistant';
import { lostPortAdvice, lostPorts, portLight, portNumber, portSetupLine, portTitle } from '../routerPorts';

const port = (over: Partial<NetworkPort> = {}): NetworkPort => ({
  name: 'ether6', role: 'hotspot', up: true, disabled: false, lost_link: false, link_downs: 0, devices: 4, ...over,
});

describe('router ports on the home screen', () => {
  it('lights a socket by its link, and tells a lost link from an empty socket', () => {
    expect(portLight(port())).toBe('up');
    expect(portLight(port({ up: false, lost_link: true }))).toBe('lost');
    expect(portLight(port({ up: false }))).toBe('empty');
    expect(portLight(port({ up: false, disabled: true }))).toBe('off');
  });

  it('numbers sockets as printed on the router', () => {
    expect(portNumber('ether10')).toBe('10');
    expect(portNumber('sfp-sfpplus1')).toBe('S+1');
    expect(portNumber('sfp1')).toBe('S1');
    expect(portNumber('combo1')).toBe('C1');
  });

  it('says a port in words', () => {
    expect(portTitle(port({ devices: 1 }))).toBe('ether6 · Hotspot · connected · 1 device');
    expect(portTitle(port({ up: false, lost_link: true, link_downs: 3 }))).toBe('ether6 · Hotspot · lost its link · dropped 3×');
    expect(portTitle(port({ name: 'ether1', role: 'internet', devices: null }))).toBe('ether1 · Internet line · connected');
  });

  it('flags lost ports only while the router itself is up', () => {
    const ports = [port(), port({ name: 'ether7', up: false, lost_link: true })];
    expect(lostPorts({ status: 'online', ports }).map((p) => p.name)).toEqual(['ether7']);
    expect(lostPorts({ status: 'offline', ports })).toEqual([]);
    expect(lostPorts({ status: 'online', ports: null })).toEqual([]);
  });

  it('gives the physical thing to check', () => {
    expect(lostPortAdvice(port({ up: false, lost_link: true }))).toMatch(/^Port 6 \(hotspot\) lost its link.*access point or switch/);
    expect(lostPortAdvice(port({ name: 'ether1', role: 'internet', up: false, lost_link: true }))).toMatch(/internet line.*internet provider/);
  });

  it('says the saved setup in one line when there is no port report', () => {
    expect(portSetupLine({ internet: ['ether1'], pppoe: ['ether4', 'ether5'], both: [], free: ['ether3'] }))
      .toBe('Internet: ether1 · PPPoE: ether4, ether5 · Free, no login: ether3 · every other port: hotspot');
    expect(portSetupLine(null)).toBeNull();
    expect(portSetupLine({ internet: [], pppoe: [], both: [], free: [] })).toBeNull();
  });
});
