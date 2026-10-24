import { describe, expect, it } from 'vitest';
import { customerMatchesSearch, isOnlineNow, isOverdue, isPaidOffline } from '../customerFilters';
import type { Customer } from '../types';

const NOW = Date.parse('2026-10-22T12:00:00Z');

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    name: 'Jane Wanjiku',
    phone: '254712345678',
    mac_address: 'AA:BB:CC:DD:EE:01',
    status: 'active',
    expiry: '2026-10-30T12:00:00',
    plan: { id: 3, name: 'Gold 10Mbps Monthly', price: 2500 } as Customer['plan'],
    router: { id: 9, name: 'Main' } as Customer['router'],
    router_id: 9,
    ...overrides,
  } as Customer;
}

describe('isOverdue', () => {
  it('is false while paid time remains', () => {
    expect(isOverdue(customer({ expiry: '2026-10-22T12:00:01' }), NOW)).toBe(false);
  });

  it('is true once paid expiry has passed', () => {
    expect(isOverdue(customer({ expiry: '2026-10-22T11:59:59', status: 'inactive' }), NOW)).toBe(true);
  });

  it('reads naive backend timestamps as UTC', () => {
    // 14:00 naive = 14:00Z, two hours after NOW: not overdue in any timezone.
    expect(isOverdue(customer({ expiry: '2026-10-22T14:00:00' }), NOW)).toBe(false);
    expect(isOverdue(customer({ expiry: '2026-10-22T11:00:00+00:00' }), NOW)).toBe(true);
  });

  it('counts a customer inside a grace window as overdue', () => {
    expect(isOverdue(customer({ expiry: '2026-10-21T12:00:00', in_grace: true }), NOW)).toBe(true);
  });

  it('counts a customer the backend marked expired as overdue', () => {
    expect(isOverdue(customer({ expiry: null as unknown as string, status: 'expired' }), NOW)).toBe(true);
  });

  it('is false for a customer who never had paid time', () => {
    expect(isOverdue(customer({ expiry: null as unknown as string }), NOW)).toBe(false);
    expect(isOverdue(customer({ expiry: '' }), NOW)).toBe(false);
  });
});

describe('isPaidOffline', () => {
  it('is an active, paid-up customer with no live session', () => {
    expect(isPaidOffline(customer(), false, NOW)).toBe(true);
  });

  it('is never someone who is connected', () => {
    expect(isPaidOffline(customer(), true, NOW)).toBe(false);
  });

  it('leaves overdue customers to the Overdue group', () => {
    expect(isPaidOffline(customer({ expiry: '2026-10-21T12:00:00', status: 'inactive' }), false, NOW)).toBe(false);
    expect(isPaidOffline(customer({ expiry: '2026-10-21T12:00:00', in_grace: true }), false, NOW)).toBe(false);
  });

  it('leaves out inactive customers who never paid', () => {
    expect(isPaidOffline(customer({ expiry: null as unknown as string, status: 'inactive' }), false, NOW)).toBe(false);
  });
});

describe('customerMatchesSearch', () => {
  it('matches the plan name, case-insensitively and in part', () => {
    expect(customerMatchesSearch(customer(), 'gold')).toBe(true);
    expect(customerMatchesSearch(customer(), '10mbps monthly')).toBe(true);
    expect(customerMatchesSearch(customer(), 'Silver')).toBe(false);
  });

  it('still matches the existing fields', () => {
    expect(customerMatchesSearch(customer(), 'wanjiku')).toBe(true);
    expect(customerMatchesSearch(customer(), '0712345678')).toBe(true);
    expect(customerMatchesSearch(customer(), 'aa:bb:cc')).toBe(true);
    expect(customerMatchesSearch(customer({ pppoe_username: 'techmid-07' }), 'TECHMID')).toBe(true);
    expect(customerMatchesSearch(customer({ static_ip: '10.20.0.5' }), '10.20.0')).toBe(true);
  });

  it('matches everyone on an empty query and survives a missing plan', () => {
    expect(customerMatchesSearch(customer(), '   ')).toBe(true);
    expect(customerMatchesSearch(customer({ plan: null as unknown as Customer['plan'] }), 'gold')).toBe(false);
  });
});

describe('isOnlineNow', () => {
  const base = { routerDown: false, realtimeCovered: false, realtimeOnline: false, monitorLive: null };

  it('uses the real-time push answer for routers on push', () => {
    expect(isOnlineNow({ ...base, realtimeCovered: true, realtimeOnline: true })).toBe(true);
    // A stale monitor record does not override the push.
    expect(isOnlineNow({ ...base, realtimeCovered: true, monitorLive: { online: true } })).toBe(false);
  });

  it('uses the router monitor for other routers', () => {
    expect(isOnlineNow({ ...base, monitorLive: { online: true } })).toBe(true);
    expect(isOnlineNow({ ...base, monitorLive: { online: false } })).toBe(false);
    expect(isOnlineNow({ ...base, monitorLive: { online: true, disabled: true } })).toBe(false);
    expect(isOnlineNow(base)).toBe(false);
  });

  it('treats everyone behind an unreachable router as offline', () => {
    expect(isOnlineNow({ ...base, routerDown: true, realtimeCovered: true, realtimeOnline: true })).toBe(false);
    expect(isOnlineNow({ ...base, routerDown: true, monitorLive: { online: true } })).toBe(false);
  });
});
