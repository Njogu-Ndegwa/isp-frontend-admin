import { describe, expect, it } from 'vitest';
import { describeCut, paidTimeCutMs, shortenExpiryConfirm } from '../expiryEdit';

const now = new Date('2026-11-18T12:17:00Z');

describe('paidTimeCutMs', () => {
  it('flags the 18 Nov edit that wiped a paid month', () => {
    const cut = paidTimeCutMs('2026-12-18T12:13:00', '2026-11-18T13:12:00.000Z', now);
    expect(Math.round(cut / 86400000)).toBe(30);
    expect(shortenExpiryConfirm(cut)).toContain('removes 30 days');
  });

  it('allows extending, or editing an expiry that has already passed', () => {
    expect(paidTimeCutMs('2026-12-18T12:13:00', '2027-01-18T12:13:00.000Z', now)).toBe(0);
    expect(paidTimeCutMs('2026-11-01T00:00:00', '2026-10-01T00:00:00.000Z', now)).toBe(0);
    expect(paidTimeCutMs(null, '2026-11-18T13:12:00.000Z', now)).toBe(0);
  });

  it('counts only the paid time still to come', () => {
    const cut = paidTimeCutMs('2026-11-18T14:17:00', '2026-11-01T00:00:00.000Z', now);
    expect(cut).toBe(2 * 3600000);
    expect(describeCut(cut)).toBe('2 hours');
  });
});
