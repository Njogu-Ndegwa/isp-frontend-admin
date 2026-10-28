import { describe, expect, it } from 'vitest';
import { canPause, canResume, formatPausedRemaining, supportsPause } from './customerPause';
import { isOverdue } from './customerFilters';
import type { Customer } from './types';

const NOW = Date.parse('2026-10-27T12:00:00Z');

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    name: 'Joe',
    phone: '0700',
    mac_address: '',
    status: 'active',
    expiry: '2026-11-08T16:00:00',
    plan: { id: 1, name: 'Home 10M', price: 2000, connection_type: 'pppoe' },
    router: { id: 1, name: 'R1' },
    ...overrides,
  } as Customer;
}

describe('canPause', () => {
  it('allows an active PPPoE or static-IP customer with paid time', () => {
    expect(canPause(customer(), NOW)).toBe(true);
    expect(canPause(customer({ plan: { id: 1, name: 'S', price: 1, connection_type: 'static_ip' } as Customer['plan'] }), NOW)).toBe(true);
  });
  it('refuses expired, inactive, already paused and hotspot customers', () => {
    expect(canPause(customer({ expiry: '2026-10-27T11:00:00' }), NOW)).toBe(false);
    expect(canPause(customer({ status: 'inactive' }), NOW)).toBe(false);
    expect(canPause(customer({ is_paused: true, status: 'inactive' }), NOW)).toBe(false);
    expect(canPause(customer({ plan: { id: 1, name: 'H', price: 1, connection_type: 'hotspot' } as Customer['plan'] }), NOW)).toBe(false);
  });
  it('refuses companion devices that share another subscription', () => {
    expect(supportsPause(customer({ subscription_owner_id: 9 }))).toBe(false);
  });
});

describe('canResume', () => {
  it('is only offered while paused', () => {
    expect(canResume(customer({ is_paused: true, status: 'inactive' }))).toBe(true);
    expect(canResume(customer())).toBe(false);
  });
});

describe('formatPausedRemaining', () => {
  it('uses days and hours, then hours and minutes, then minutes', () => {
    expect(formatPausedRemaining(12 * 86400 + 4 * 3600 + 59)).toBe('12d 4h');
    expect(formatPausedRemaining(3 * 3600 + 20 * 60)).toBe('3h 20m');
    expect(formatPausedRemaining(45 * 60)).toBe('45m');
    expect(formatPausedRemaining(null)).toBe('0m');
  });
});

describe('paused customers are not overdue', () => {
  it('ignores the frozen expiry while paused', () => {
    const paused = customer({ is_paused: true, status: 'inactive', expiry: '2026-10-20T08:00:00' });
    expect(isOverdue(paused, NOW)).toBe(false);
    expect(isOverdue({ ...paused, is_paused: false }, NOW)).toBe(true);
  });
});
