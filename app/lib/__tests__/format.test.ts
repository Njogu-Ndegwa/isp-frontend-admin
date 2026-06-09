import { describe, it, expect } from 'vitest';
import { formatKES } from '../format';

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
