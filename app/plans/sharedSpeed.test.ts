import { describe, expect, it } from 'vitest';
import {
  pppoeDevicesHint,
  pppoeSessionsSpeedNote,
  sharedSpeedForPayload,
  showsSharedSpeedToggle,
} from './sharedSpeed';

describe('shared speed switch', () => {
  it('only shows for PPPoE plans with 2+ devices', () => {
    expect(showsSharedSpeedToggle('pppoe', 4)).toBe(true);
    expect(showsSharedSpeedToggle('pppoe', 1)).toBe(false);
    expect(showsSharedSpeedToggle('hotspot', 4)).toBe(false);
    expect(showsSharedSpeedToggle('static_ip', 4)).toBe(false);
  });

  it('is never sent as on where it is hidden', () => {
    expect(sharedSpeedForPayload('pppoe', 4, true)).toBe(true);
    expect(sharedSpeedForPayload('pppoe', 4, false)).toBe(false);
    expect(sharedSpeedForPayload('pppoe', 1, true)).toBe(false);
    expect(sharedSpeedForPayload('hotspot', 4, true)).toBe(false);
    expect(sharedSpeedForPayload('pppoe', 4, undefined)).toBe(false);
  });

  it('describes the device count to match the switch', () => {
    expect(pppoeDevicesHint(false)).toContain('Each gets the full plan speed');
    expect(pppoeDevicesHint(true)).toContain('share the plan speed');
  });
});

describe('connected sessions note', () => {
  it('keeps the current text when sessions do not share', () => {
    expect(pppoeSessionsSpeedNote(false, 2, '30M/30M')).toBe(
      'Each session has its own speed limit, so together they can use up to 2× the plan speed.',
    );
  });

  it('says sessions share the plan speed when they do', () => {
    expect(pppoeSessionsSpeedNote(true, 4, '30M/30M')).toBe(
      'Sessions share the plan speed: together they use up to 30M/30M.',
    );
    expect(pppoeSessionsSpeedNote(true, 4)).toBe('Sessions share the plan speed.');
  });
});
