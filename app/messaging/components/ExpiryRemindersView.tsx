'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ExpirySmsSettings } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';
import {
  EXPIRY_REMINDER_PRESETS,
  MAX_EXPIRY_REMINDERS,
  expirySettingsAreEqual,
  normalizeReminderOffsets,
  validateExpirySettings,
} from '../lib/expiryReminders';

const FALLBACK_SETTINGS: ExpirySmsSettings = {
  enabled: false,
  reminder_offsets_minutes: [1440],
  send_at_expiry: true,
};

function SettingsToggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-success' : 'bg-background-tertiary border border-border'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function ExpiryRemindersView({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { showAlert } = useAlert();
  const [savedSettings, setSavedSettings] = useState<ExpirySmsSettings | null>(null);
  const [settings, setSettings] = useState<ExpirySmsSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getExpirySmsSettings();
      const normalized = {
        ...result,
        reminder_offsets_minutes: normalizeReminderOffsets(result.reminder_offsets_minutes),
      };
      setSettings(normalized);
      setSavedSettings(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expiry reminder settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validationError = validateExpirySettings(settings);
  const dirty = savedSettings !== null && !expirySettingsAreEqual(settings, savedSettings);
  const selectedCount = settings.reminder_offsets_minutes.length;
  const totalMessages = settings.enabled
    ? selectedCount + (settings.send_at_expiry ? 1 : 0)
    : 0;

  const toggleOffset = (minutes: number) => {
    setSettings((current) => {
      const selected = current.reminder_offsets_minutes.includes(minutes);
      if (!selected && current.reminder_offsets_minutes.length >= MAX_EXPIRY_REMINDERS) return current;
      const nextOffsets = selected
        ? current.reminder_offsets_minutes.filter((offset) => offset !== minutes)
        : [...current.reminder_offsets_minutes, minutes];
      return { ...current, reminder_offsets_minutes: normalizeReminderOffsets(nextOffsets) };
    });
  };

  const save = async () => {
    if (validationError) return;
    try {
      setSaving(true);
      const payload = {
        ...settings,
        reminder_offsets_minutes: normalizeReminderOffsets(settings.reminder_offsets_minutes),
      };
      const result = await api.updateExpirySmsSettings(payload);
      const normalized = {
        ...result,
        reminder_offsets_minutes: normalizeReminderOffsets(result.reminder_offsets_minutes),
      };
      setSettings(normalized);
      setSavedSettings(normalized);
      showAlert('success', 'Expiry reminder settings saved');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save expiry reminder settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button type="button" onClick={load} className="btn-secondary text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Automatic expiry messages</h3>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              Remind hotspot and PPPoE customers before their plan ends, with an optional final message when it expires.
            </p>
          </div>
          <SettingsToggle
            checked={settings.enabled}
            label="Automatic expiry messages"
            onChange={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}
          />
        </div>

        <div className={`mt-5 border-t border-border pt-5 ${settings.enabled ? '' : 'opacity-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Remind before expiry</p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                Choose 1–{MAX_EXPIRY_REMINDERS} times · {selectedCount} selected
              </p>
            </div>
            <span className="badge badge-neutral tabular-nums">{selectedCount}/{MAX_EXPIRY_REMINDERS}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Reminder times">
            {EXPIRY_REMINDER_PRESETS.map((preset) => {
              const selected = settings.reminder_offsets_minutes.includes(preset.minutes);
              const selectionLimitReached = !selected && selectedCount >= MAX_EXPIRY_REMINDERS;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  aria-pressed={selected}
                  disabled={!settings.enabled || selectionLimitReached}
                  onClick={() => toggleOffset(preset.minutes)}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    selected
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-border bg-background-secondary text-foreground-muted hover:border-accent-primary/50 hover:text-foreground disabled:hover:border-border disabled:hover:text-foreground-muted'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {validationError && settings.enabled ? (
            <p className="mt-2 text-xs text-danger" role="alert">{validationError}</p>
          ) : null}
        </div>

        <div className={`mt-5 flex items-center justify-between gap-4 border-t border-border pt-5 ${settings.enabled ? '' : 'opacity-50'}`}>
          <div>
            <p className="text-sm font-medium text-foreground">Message at expiry</p>
            <p className="mt-0.5 text-xs text-foreground-muted">
              Tell the customer immediately after their service expires.
            </p>
          </div>
          <SettingsToggle
            checked={settings.send_at_expiry}
            disabled={!settings.enabled}
            label="Message customers at expiry"
            onChange={() => setSettings((current) => ({ ...current, send_at_expiry: !current.send_at_expiry }))}
          />
        </div>
      </div>

      <div className="card border-accent-primary/20 bg-accent-primary/5 p-4">
        <p className="text-sm font-medium text-foreground">
          {settings.enabled
            ? `${totalMessages} automatic message${totalMessages === 1 ? '' : 's'} per customer expiry`
            : 'Automatic expiry messages are off'}
        </p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">
          Each SMS uses normal messaging credits. Customers without a valid phone number are skipped, and provider failures are refunded automatically.
        </p>
        <button type="button" onClick={onBuyCredits} className="mt-2 text-xs font-medium text-accent-primary hover:underline">
          View or buy SMS credits
        </button>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {dirty ? <p className="text-xs text-foreground-muted sm:mr-auto">You have unsaved changes.</p> : null}
        <button
          type="button"
          disabled={!dirty || saving || validationError !== null}
          onClick={save}
          className="btn-primary min-h-11 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
