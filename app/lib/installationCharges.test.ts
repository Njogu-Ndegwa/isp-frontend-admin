import { afterEach, describe, expect, it, vi } from 'vitest';
import { chargeDate, clearPendingChargeKey, installationChargesEnabled, parseChargeAmount, pendingChargeKey } from './installationCharges';
import type { AuthUser } from './types';

const owner: AuthUser = { id: 597, role: 'reseller', email: 'owner@example.test', organization_name: 'Test' };
afterEach(() => vi.unstubAllGlobals());

describe('installation tracking boundaries', () => {
  it('defaults on for the verified reseller outside demo and supports an explicit off switch', () => {
    expect(installationChargesEnabled(owner, false, 'true')).toBe(true);
    expect(installationChargesEnabled(owner, false, undefined)).toBe(true);
    for (const flag of ['', 'false', 'TRUE']) expect(installationChargesEnabled(owner, false, flag)).toBe(false);
    expect(installationChargesEnabled({ ...owner, id: 598 }, false, 'true')).toBe(false);
    expect(installationChargesEnabled({ ...owner, role: 'admin' }, false, 'true')).toBe(false);
    expect(installationChargesEnabled(owner, true, 'true')).toBe(false);
  });

  it('parses exact decimal minor units and rejects rounding, exponent and over-limit inputs', () => {
    expect(parseChargeAmount('0.29')).toBe(29);
    expect(parseChargeAmount('1.1')).toBe(110);
    expect(parseChargeAmount('1000000.00')).toBe(100_000_000);
    for (const text of ['0', '-1', '0.001', '1.999', '1e3', '1,000', 'Infinity', '1000000.01', '', '.50']) {
      expect(() => parseChargeAmount(text)).toThrow();
    }
  });

  it('reuses exact unknown attempts across reloads, but not changed payloads or customers', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    const memory = new Map<string, string>();
    const original = pendingChargeKey('597:1', '{"amount":29}', memory);
    expect(pendingChargeKey('597:1', '{"amount":29}', new Map())).toBe(original);
    expect(pendingChargeKey('597:1', '{"amount":30}', memory)).not.toBe(original);
    expect(pendingChargeKey('597:2', '{"amount":29}', memory)).not.toBe(original);
    clearPendingChargeKey('597:1', '{"amount":29}', memory);
    expect(pendingChargeKey('597:1', '{"amount":29}', memory)).not.toBe(original);
  });

  it('tolerates blocked or malformed browser storage and invalid dates', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => 'null', setItem: () => { throw new Error('blocked'); } });
    const memory = new Map<string, string>();
    const key = pendingChargeKey('597:1', '{}', memory);
    expect(pendingChargeKey('597:1', '{}', memory)).toBe(key);
    expect(chargeDate(null)).toBe('Date unavailable');
    expect(chargeDate('bad')).toBe('Date unavailable');
  });
});
