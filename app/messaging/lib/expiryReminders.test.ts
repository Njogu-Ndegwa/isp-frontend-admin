import { describe, expect, it } from 'vitest';
import {
  expirySettingsAreEqual,
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
    })).toBe('Choose at least one reminder before expiry.');
  });

  it('allows disabled settings to preserve an empty selection', () => {
    expect(validateExpirySettings({
      enabled: false,
      reminder_offsets_minutes: [],
      send_at_expiry: false,
    })).toBeNull();
  });

  it('compares normalized selections rather than array order', () => {
    expect(expirySettingsAreEqual(
      { enabled: true, reminder_offsets_minutes: [30, 1440], send_at_expiry: false },
      { enabled: true, reminder_offsets_minutes: [1440, 30, 30], send_at_expiry: false },
    )).toBe(true);
  });
});
