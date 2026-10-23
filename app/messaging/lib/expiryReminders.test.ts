import { describe, expect, it } from 'vitest';
import {
  expirySettingsAreEqual,
  normalizeExpirySettings,
  normalizeReminderOffsets,
  validateExpirySettings,
} from './expiryReminders';

describe('expiry reminder settings', () => {
  it('deduplicates and orders offsets from longest to shortest', () => {
    expect(normalizeReminderOffsets([60, 1440, 60, 30])).toEqual([1440, 60, 30]);
  });

  it('requires at least one pre-expiry reminder when enabled', () => {
    expect(validateExpirySettings({
      enabled: true,
      reminder_offsets_minutes: [],
      send_at_expiry: true,
      expiry_include_hotspot: true,
    })).toBe('Choose at least one reminder before expiry.');
  });

  it('allows disabled settings to preserve an empty selection', () => {
    expect(validateExpirySettings({
      enabled: false,
      reminder_offsets_minutes: [],
      send_at_expiry: false,
      expiry_include_hotspot: true,
    })).toBeNull();
  });

  it('compares normalized selections rather than array order', () => {
    expect(expirySettingsAreEqual(
      { enabled: true, reminder_offsets_minutes: [30, 1440], send_at_expiry: false, expiry_include_hotspot: true },
      { enabled: true, reminder_offsets_minutes: [1440, 30, 30], send_at_expiry: false, expiry_include_hotspot: true },
    )).toBe(true);
  });

  it('treats a changed hotspot toggle as unsaved', () => {
    const base = { enabled: true, reminder_offsets_minutes: [1440], send_at_expiry: true, expiry_include_hotspot: true };
    expect(expirySettingsAreEqual(base, { ...base, expiry_include_hotspot: false })).toBe(false);
  });

  it('includes hotspot customers when an older backend omits the flag', () => {
    expect(normalizeExpirySettings({
      enabled: true,
      reminder_offsets_minutes: [60, 1440],
      send_at_expiry: true,
    })).toEqual({
      enabled: true,
      reminder_offsets_minutes: [1440, 60],
      send_at_expiry: true,
      expiry_include_hotspot: true,
    });
  });

  it('keeps hotspot customers off when the reseller turned them off', () => {
    expect(normalizeExpirySettings({
      enabled: true,
      reminder_offsets_minutes: [1440],
      send_at_expiry: false,
      expiry_include_hotspot: false,
    }).expiry_include_hotspot).toBe(false);
  });
});
