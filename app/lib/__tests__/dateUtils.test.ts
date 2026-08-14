import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseUTCToGMT3,
  gmt3InputToISO,
  utcToGMT3Input,
  formatTimeGMT3,
  formatTimeSinceUTC,
} from '../dateUtils';

describe('parseUTCToGMT3', () => {
  it('shifts a Z-suffixed UTC timestamp by +3h', () => {
    const d = parseUTCToGMT3('2026-06-09T10:00:00Z');
    expect(d.getUTCHours()).toBe(13);
  });
  it('treats a naive timestamp as UTC', () => {
    const d = parseUTCToGMT3('2026-06-09T10:00:00');
    expect(d.getUTCHours()).toBe(13);
  });
  it('crosses date boundary correctly', () => {
    const d = parseUTCToGMT3('2026-06-09T22:30:00Z');
    expect(d.getUTCDate()).toBe(10);
    expect(d.getUTCHours()).toBe(1);
  });
});

describe('gmt3InputToISO / utcToGMT3Input round-trip', () => {
  it('round-trips a wall-clock value', () => {
    const iso = gmt3InputToISO('2026-06-09T15:30');
    expect(iso).toBe('2026-06-09T12:30:00.000Z');
    expect(utcToGMT3Input(iso)).toBe('2026-06-09T15:30');
  });
});

describe('formatTimeGMT3', () => {
  it('converts a UTC HH:MM to GMT+3 12h display', () => {
    expect(formatTimeGMT3('10:00', '2026-06-09')).toBe('01:00 PM');
  });
  it('passes through "-" placeholder', () => {
    expect(formatTimeGMT3('-')).toBe('-');
  });
});

// "last seen" on a router that has stopped answering. Naive timestamps from the
// API are UTC, and the answer must not shift with the GMT+3 display offset.
describe('formatTimeSinceUTC', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const at = (now: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  };

  it('returns null for a missing timestamp', () => {
    expect(formatTimeSinceUTC(null)).toBeNull();
    expect(formatTimeSinceUTC(undefined)).toBeNull();
    expect(formatTimeSinceUTC('')).toBeNull();
  });

  it('returns null for an unparseable timestamp', () => {
    expect(formatTimeSinceUTC('yesterday')).toBeNull();
  });

  it('reads a naive timestamp as UTC, not local time', () => {
    at('2026-08-14T12:07:00Z');
    expect(formatTimeSinceUTC('2026-08-14T12:00:00')).toBe('7m ago');
  });

  it('collapses the first minute to "just now"', () => {
    at('2026-08-14T12:00:30Z');
    expect(formatTimeSinceUTC('2026-08-14T12:00:00Z')).toBe('just now');
  });

  it('steps up through hours and days', () => {
    at('2026-08-14T12:00:00Z');
    expect(formatTimeSinceUTC('2026-08-14T09:30:00Z')).toBe('2h ago');
    expect(formatTimeSinceUTC('2026-08-11T12:00:00Z')).toBe('3d ago');
  });

  it('never reports a future timestamp as negative', () => {
    at('2026-08-14T12:00:00Z');
    expect(formatTimeSinceUTC('2026-08-14T12:05:00Z')).toBe('just now');
  });
});
