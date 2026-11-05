import { describe, expect, it } from 'vitest';
import {
  ROUTER_QUIET_MS,
  codeHoursLeft,
  isCodeExpired,
  isCodeLive,
  parseUtcMs,
  routerWaitState,
} from './routerWait';

const CREATED = '2026-11-05T08:00:00.123456';
const CREATED_MS = Date.UTC(2026, 10, 5, 8, 0, 0, 123);

describe('parseUtcMs', () => {
  it('reads the naive timestamps the backend sends as UTC', () => {
    expect(parseUtcMs(CREATED)).toBe(CREATED_MS);
  });

  it('respects a zone when there is one', () => {
    expect(parseUtcMs('2026-11-05T08:00:00Z')).toBe(Date.UTC(2026, 10, 5, 8));
    expect(parseUtcMs('2026-11-05T11:00:00+03:00')).toBe(Date.UTC(2026, 10, 5, 8));
  });

  it('returns null for nothing or rubbish', () => {
    expect(parseUtcMs(null)).toBeNull();
    expect(parseUtcMs(undefined)).toBeNull();
    expect(parseUtcMs('not a date')).toBeNull();
  });
});

describe('routerWaitState', () => {
  it('waits quietly while the script could still be running', () => {
    expect(routerWaitState(CREATED, CREATED_MS, false)).toBe('waiting');
    expect(routerWaitState(CREATED, CREATED_MS + ROUTER_QUIET_MS - 1, false)).toBe('waiting');
  });

  it('says we have not heard once the quiet time is over', () => {
    expect(routerWaitState(CREATED, CREATED_MS + ROUTER_QUIET_MS, false)).toBe('not_heard');
  });

  it('answers straight away when the owner asks and nothing has come in', () => {
    expect(routerWaitState(CREATED, CREATED_MS + 1000, true)).toBe('not_heard');
  });

  it('does not call the router late when the browser clock is behind', () => {
    expect(routerWaitState(CREATED, CREATED_MS - 3600_000, false)).toBe('waiting');
  });

  it('does not call the router late when the time is unusable', () => {
    expect(routerWaitState(null, CREATED_MS, false)).toBe('waiting');
  });
});

describe('codeHoursLeft', () => {
  it('counts down from 24 hours, rounded down', () => {
    expect(codeHoursLeft(CREATED, CREATED_MS)).toBe(24);
    expect(codeHoursLeft(CREATED, CREATED_MS + 1)).toBe(23);
    expect(codeHoursLeft(CREATED, CREATED_MS + 23.5 * 3600_000)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(codeHoursLeft(CREATED, CREATED_MS + 48 * 3600_000)).toBe(0);
  });

  it('is null when the time is unusable', () => {
    expect(codeHoursLeft(null, CREATED_MS)).toBeNull();
  });
});

describe('code state', () => {
  it('treats a pending code past its time as expired', () => {
    const token = { status: 'pending' as const, expired: true };
    expect(isCodeExpired(token)).toBe(true);
    expect(isCodeLive(token)).toBe(false);
  });

  it('treats a code the nightly job has marked as expired', () => {
    const token = { status: 'expired' as const, expired: false };
    expect(isCodeExpired(token)).toBe(true);
    expect(isCodeLive(token)).toBe(false);
  });

  it('treats a fresh pending code as live', () => {
    const token = { status: 'pending' as const, expired: false };
    expect(isCodeExpired(token)).toBe(false);
    expect(isCodeLive(token)).toBe(true);
  });

  it('does not treat a used code as live or expired', () => {
    const token = { status: 'provisioned' as const, expired: false };
    expect(isCodeExpired(token)).toBe(false);
    expect(isCodeLive(token)).toBe(false);
  });
});
