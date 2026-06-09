import { describe, it, expect } from 'vitest';
import { parseUTCToGMT3, gmt3InputToISO, utcToGMT3Input, formatTimeGMT3 } from '../dateUtils';

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
