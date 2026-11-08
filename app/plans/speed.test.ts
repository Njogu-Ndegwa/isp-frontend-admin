import { describe, expect, it } from 'vitest';
import { PLAN_SPEED_HELP, parsePlanSpeed, planSpeedError } from './speed';
import { FR } from '../lib/locales/fr';

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

describe('reseller speed spellings (8 Nov 2026: "5mbs" was saved and given 10 Mbps)', () => {
  it.each([
    ['5mbs', '5 Mbps', '5 Mbps'],
    ['5MBS', '5 Mbps', '5 Mbps'],
    ['5mbps', '5 Mbps', '5 Mbps'],
    ['5 Mbps', '5 Mbps', '5 Mbps'],
    ['5M', '5 Mbps', '5 Mbps'],
    ['5m', '5 Mbps', '5 Mbps'],
    ['5MB', '5 Mbps', '5 Mbps'],
    ['5mb/s', '5 Mbps', '5 Mbps'],
    ['5 Mbit/s', '5 Mbps', '5 Mbps'],
    ['5mps', '5 Mbps', '5 Mbps'],
    ['5/5', '5 Mbps', '5 Mbps'],
    ['5M/2M', '5 Mbps', '2 Mbps'],
    ['5mb/s/2mb/s', '5 Mbps', '2 Mbps'],
    ['512k', '512 Kbps', '512 Kbps'],
    ['1.5M', '1.5 Mbps', '1.5 Mbps'],
    ['2/.3', '2 Mbps', '0.3 Mbps'],
    ['4M/4/', '4 Mbps', '4 Mbps'],
  ])('reads %s', (value, download, upload) => {
    expect(parsePlanSpeed(value)).toEqual({ download, upload });
    expect(planSpeedError(value)).toBeNull();
  });

  it.each(['', 'Unlimited', 'mbps', '1om/10m', '10m/10mm', '2mg', '3M3M', '7M(tv and laptops)'])(
    'refuses %j before save',
    (value) => {
      expect(parsePlanSpeed(value)).toBeNull();
      expect(planSpeedError(value)).toBe(PLAN_SPEED_HELP);
    },
  );

  it('has French for the message', () => {
    expect(FR[PLAN_SPEED_HELP]).toBeTruthy();
    expect(FR['Speed not recognised.']).toBeTruthy();
    expect(FR['Edit the plan to fix it.']).toBeTruthy();
  });
});
