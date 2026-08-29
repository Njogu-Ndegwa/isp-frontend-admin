import { ExpirySmsSettings } from '../../lib/types';

export const MAX_EXPIRY_REMINDERS = 5;

export const EXPIRY_REMINDER_PRESETS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 360, label: '6 hours' },
  { minutes: 720, label: '12 hours' },
  { minutes: 1440, label: '1 day' },
  { minutes: 2880, label: '2 days' },
  { minutes: 4320, label: '3 days' },
  { minutes: 10080, label: '7 days' },
] as const;

export function normalizeReminderOffsets(offsets: number[]): number[] {
  return [...new Set(offsets)].sort((a, b) => b - a);
}

export function expirySettingsAreEqual(a: ExpirySmsSettings, b: ExpirySmsSettings): boolean {
  if (a.enabled !== b.enabled || a.send_at_expiry !== b.send_at_expiry) return false;
  const aOffsets = normalizeReminderOffsets(a.reminder_offsets_minutes);
  const bOffsets = normalizeReminderOffsets(b.reminder_offsets_minutes);
  return aOffsets.length === bOffsets.length
    && aOffsets.every((offset, index) => offset === bOffsets[index]);
}

export function validateExpirySettings(settings: ExpirySmsSettings): string | null {
  if (!settings.enabled) return null;
  const offsets = normalizeReminderOffsets(settings.reminder_offsets_minutes);
  if (offsets.length === 0) return 'Choose at least one reminder before expiry.';
  if (offsets.length > MAX_EXPIRY_REMINDERS) return `Choose up to ${MAX_EXPIRY_REMINDERS} reminders.`;
  if (offsets.some((offset) => offset < 30 || offset > 43200)) {
    return 'Reminder times must be between 30 minutes and 30 days before expiry.';
  }
  return null;
}
