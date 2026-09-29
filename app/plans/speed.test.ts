import { describe, expect, it } from 'vitest';
import { parsePlanSpeed } from './speed';

describe('parsePlanSpeed', () => {
  it('reads plan speeds as download/upload', () => {
    expect(parsePlanSpeed('5M/2M')).toEqual({ download: '5 Mbps', upload: '2 Mbps' });
    expect(parsePlanSpeed('10M/5M')).toEqual({ download: '10 Mbps', upload: '5 Mbps' });
  });

  it('uses one value for both directions', () => {
    expect(parsePlanSpeed('5M')).toEqual({ download: '5 Mbps', upload: '5 Mbps' });
    expect(parsePlanSpeed('5 Mbps')).toEqual({ download: '5 Mbps', upload: '5 Mbps' });
  });

  it('understands units, bare numbers and raw bps', () => {
    expect(parsePlanSpeed('512k/1.5m')).toEqual({ download: '512 Kbps', upload: '1.5 Mbps' });
    expect(parsePlanSpeed('5/2')).toEqual({ download: '5 Mbps', upload: '2 Mbps' });
    expect(parsePlanSpeed('5000000/2000000')).toEqual({ download: '5 Mbps', upload: '2 Mbps' });
  });

  it('returns null for text it cannot read', () => {
    expect(parsePlanSpeed('')).toBeNull();
    expect(parsePlanSpeed('fast')).toBeNull();
    expect(parsePlanSpeed('5M/2M/1M')).toBeNull();
  });
});
