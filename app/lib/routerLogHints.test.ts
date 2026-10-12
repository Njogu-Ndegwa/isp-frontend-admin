import { describe, expect, it } from 'vitest';
import { explainRouterLog } from './routerLogHints';

const meaning = (line: string) => explainRouterLog(line)?.meaning ?? null;

describe('explainRouterLog', () => {
  it('explains the PPPoE lines technicians ask about', () => {
    expect(meaning('<pppoe-jane_w>: terminating... - peer is not responding')).toMatch(/stopped answering/);
    expect(meaning('<pppoe-3C:52:82:AA:BB:CC>: user jane_w authentication failed')).toMatch(/rejected/);
    expect(meaning('<pppoe-jane_w>: authenticated')).toMatch(/accepted/);
    expect(meaning('jane_w logged in, 10.10.0.23 from 3C:52:82:AA:BB:CC')).toMatch(/connected/);
    expect(meaning('jane_w logged out, 3600 1024 2048 10 20 from 3C:52:82:AA:BB:CC')).toMatch(/time online/);
    expect(meaning('<pppoe-3C:52:82:AA:BB:CC>: waiting for call...')).toMatch(/starting to connect/);
    expect(meaning('<pppoe-jane_w>: terminating... - administrator request')).toMatch(/billing system/);
    expect(meaning('<pppoe-jane_w>: terminating... - hungup')).toMatch(/restarted/);
  });

  it('puts the specific cause before the generic "session ended"', () => {
    expect(meaning('<pppoe-jane_w>: disconnected')).toBe('The session ended.');
    expect(meaning('AA:BB:CC:DD:EE:FF@wlan1: disconnected, extensive data loss')).toMatch(/Wi-Fi/);
    expect(meaning('AA:BB:CC:DD:EE:FF@wlan1: connected, signal strength -61')).toMatch(/set up/);
  });

  it('separates DHCP assign from deassign', () => {
    expect(meaning('dhcp1 assigned 10.5.50.9 for AA:BB:CC:DD:EE:FF phone')).toMatch(/got an IP/);
    expect(meaning('dhcp1 deassigned 10.5.50.9 for AA:BB:CC:DD:EE:FF phone')).toMatch(/gave back/);
  });

  it('returns null for lines it does not know', () => {
    expect(explainRouterLog('something entirely different')).toBeNull();
    expect(explainRouterLog('')).toBeNull();
    expect(explainRouterLog(undefined)).toBeNull();
  });
});
