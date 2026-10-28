import { describe, expect, it } from 'vitest';
import { buildCredRate, formatCredRate, parseCredRate } from './credRate';

describe('buildCredRate', () => {
  it('sends RouterOS upload/download with an M unit', () => {
    // 5 down, 2 up: RouterOS order is upload first.
    expect(buildCredRate('5', '2')).toEqual({ ok: true, rate: '2M/5M' });
    expect(buildCredRate('50', '10')).toEqual({ ok: true, rate: '10M/50M' });
  });

  it('keeps fractions for the backend to step down', () => {
    expect(buildCredRate('1.5', '0.5')).toEqual({ ok: true, rate: '0.5M/1.5M' });
  });

  it('treats both empty as unlimited and one value as both ways', () => {
    expect(buildCredRate('', '')).toEqual({ ok: true, rate: null });
    expect(buildCredRate('8', '')).toEqual({ ok: true, rate: '8M/8M' });
    expect(buildCredRate(' ', '3')).toEqual({ ok: true, rate: '3M/3M' });
  });

  it('rejects zero, negatives and words', () => {
    for (const [down, up] of [['0', '2'], ['-5', '2'], ['fast', '2'], ['5', 'abc'], ['20000', '1']]) {
      expect(buildCredRate(down, up).ok).toBe(false);
    }
  });
});

describe('parseCredRate', () => {
  it('reads stored rows seen in production', () => {
    expect(parseCredRate('5M/2M')).toEqual({ upload: '5', download: '2' });
    expect(parseCredRate('5m/2m')).toEqual({ upload: '5', download: '2' });
    expect(parseCredRate('50/10')).toEqual({ upload: '50', download: '10' });
    expect(parseCredRate('10/10M')).toEqual({ upload: '10', download: '10' });
    expect(parseCredRate('512k/1500k')).toEqual({ upload: '0.512', download: '1.5' });
    expect(parseCredRate('5000000/2000000')).toEqual({ upload: '5', download: '2' });
    expect(parseCredRate('1G/1G')).toEqual({ upload: '1000', download: '1000' });
    expect(parseCredRate('8M')).toEqual({ upload: '8', download: '8' });
    expect(parseCredRate(null)).toEqual({ upload: '', download: '' });
  });

  it('round-trips through buildCredRate', () => {
    const { download, upload } = parseCredRate('5m/2m');
    expect(buildCredRate(download, upload)).toEqual({ ok: true, rate: '5M/2M' });
  });
});

describe('formatCredRate', () => {
  it('labels download and upload in Mbps', () => {
    expect(formatCredRate('2M/5M')).toBe('↓5 ↑2 Mbps');
    expect(formatCredRate(null)).toBe('Unlimited');
    expect(formatCredRate('weird burst')).toBe('weird burst');
  });
});
