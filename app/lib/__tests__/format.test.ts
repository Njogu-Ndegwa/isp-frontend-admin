import { describe, it, expect } from 'vitest';
import { formatKES, formatKESCompact } from '../format';

describe('formatKESCompact', () => {
  it('abbreviates millions', () => {
    expect(formatKESCompact(1_500_000)).toBe('KES 1.5M');
  });
  it('abbreviates thousands', () => {
    expect(formatKESCompact(25_000)).toBe('KES 25K');
  });
  it('leaves small amounts unabbreviated', () => {
    expect(formatKESCompact(850)).toBe('KES 850');
  });
  it('falls back for null/undefined', () => {
    expect(formatKESCompact(null)).toBe('KES 0');
  });
});

describe('formatKES', () => {
  it('formats whole amounts with grouping and no decimals', () => {
    expect(formatKES(1500)).toBe('KES 1,500');
  });
  it('rounds fractional amounts to whole shillings', () => {
    expect(formatKES(1500.6)).toBe('KES 1,501');
  });
  it('handles zero', () => {
    expect(formatKES(0)).toBe('KES 0');
  });
  it('handles negative amounts', () => {
    expect(formatKES(-250)).toBe('KES -250');
  });
  it('falls back gracefully for null/undefined/NaN', () => {
    expect(formatKES(undefined)).toBe('KES 0');
    expect(formatKES(null)).toBe('KES 0');
    expect(formatKES(NaN)).toBe('KES 0');
  });
});
