'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { CustomerEventSmsSettings, CustomerSmsEvent, CustomerSmsPreview } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';
import { SettingsToggle } from './ExpiryRemindersView';
import {
  CUSTOMER_SMS_EVENTS,
  EVENT_LABELS,
  PLACEHOLDER_LABELS,
  customerEventSettingsAreEqual,
  insertPlaceholder,
  normalizeCustomerEventSettings,
  toCustomerEventInput,
  validateCustomerEventSettings,
  validateTemplate,
} from '../lib/customerEvents';

const FALLBACK: CustomerEventSmsSettings = {
  payment_receipt_enabled: false,
  receipt_include_hotspot: false,
  welcome_enabled: false,
  templates: { payment_receipt: null, welcome: null, reminder: null, expiry: null },
  defaults: { payment_receipt: '', welcome: '', reminder: '', expiry: '' },
  placeholders: { payment_receipt: [], welcome: [], reminder: [], expiry: [] },
  max_length: 480,
};

function usePreview(event: CustomerSmsEvent, body: string | null, valid: boolean) {
  const [preview, setPreview] = useState<CustomerSmsPreview | null>(null);
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.previewCustomerEventSms(event, body);
        if (!cancelled) setPreview(result);
      } catch {
        if (!cancelled) setPreview(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [event, body, valid]);
  return valid ? preview : null;
}

function WordingRow({
  event,
  settings,
  onChange,
}: {
  event: CustomerSmsEvent;
  settings: CustomerEventSmsSettings;
  onChange: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const custom = settings.templates[event];
  const allowed = settings.placeholders[event] ?? [];
  const error = validateTemplate(custom, allowed, settings.max_length);
  const preview = usePreview(event, custom, error === null);
  const label = EVENT_LABELS[event];

  const startEditing = () => {
    if (custom === null) onChange(settings.defaults[event]);
    setEditing(true);
  };

  const addPlaceholder = (name: string) => {
    const text = custom ?? settings.defaults[event];
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = insertPlaceholder(text, name, start, end);
    onChange(next.text);
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{label.title}</p>
            <span className={`badge ${custom === null ? 'badge-neutral' : 'badge-success'}`}>
              {custom === null ? 'Default' : 'Custom'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-foreground-muted">{label.hint}</p>
        </div>
        {!editing ? (
          <button type="button" onClick={startEditing} className="btn-secondary shrink-0 text-xs">
            Edit<span className="sr-only"> {label.title} message</span>
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <label className="sr-only" htmlFor={`template-${event}`}>{label.title} message text</label>
          <textarea
            id={`template-${event}`}
            ref={textareaRef}
            value={custom ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            maxLength={settings.max_length + 50}
            className="input w-full text-sm leading-6"
          />
          <div className="flex flex-wrap gap-1.5" aria-label="Insert a field">
            {allowed.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addPlaceholder(name)}
                title={PLACEHOLDER_LABELS[name] ?? name}
                className="rounded-md border border-border bg-background-secondary px-2 py-1 font-mono text-[11px] text-foreground-muted hover:border-accent-primary/50 hover:text-foreground"
              >
                {`{${name}}`}
              </button>
            ))}
          </div>
          {error ? <p className="text-xs text-danger" role="alert">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { onChange(null); setEditing(false); }}
              className="btn-secondary text-xs"
            >
              Use default
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={error !== null}
              className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
            What a customer receives
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{preview.text}</p>
          <p className="mt-1 text-[11px] text-foreground-muted tabular-nums">
            {preview.characters} chars · {preview.segments} SMS credit{preview.segments === 1 ? '' : 's'} per customer
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CustomerEventsView({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { showAlert } = useAlert();
  const [saved, setSaved] = useState<CustomerEventSmsSettings | null>(null);
  const [settings, setSettings] = useState<CustomerEventSmsSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = normalizeCustomerEventSettings(await api.getCustomerEventSmsSettings(), FALLBACK);
      setSettings(result);
      setSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer message settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validationError = validateCustomerEventSettings(settings);
  const dirty = saved !== null && !customerEventSettingsAreEqual(settings, saved);

  const setTemplate = (event: CustomerSmsEvent, value: string | null) => {
    setSettings((current) => ({ ...current, templates: { ...current.templates, [event]: value } }));
  };

  const save = async () => {
    if (validationError) return;
    try {
      setSaving(true);
      const result = normalizeCustomerEventSettings(
        await api.updateCustomerEventSmsSettings(toCustomerEventInput(settings)),
        settings,
      );
      setSettings(result);
      setSaved(result);
      showAlert('success', 'Customer message settings saved');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save customer message settings');
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
            <h3 className="text-sm font-semibold text-foreground">Payment receipts</h3>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              Text customers when their payment is received, with the plan and the new expiry time.
              Works for M-Pesa, vouchers and payments you record yourself.
            </p>
          </div>
          <SettingsToggle
            checked={settings.payment_receipt_enabled}
            label="Payment receipts"
            onChange={() => setSettings((current) => ({
              ...current,
              payment_receipt_enabled: !current.payment_receipt_enabled,
            }))}
          />
        </div>
        <div className={`mt-5 flex items-center justify-between gap-4 border-t border-border pt-5 ${settings.payment_receipt_enabled ? '' : 'opacity-50'}`}>
          <div>
            <p className="text-sm font-medium text-foreground">Include hotspot customers</p>
            <p className="mt-0.5 text-xs text-foreground-muted">
              Hotspot sales are small and frequent, and every receipt uses SMS credits. PPPoE customers always get one.
            </p>
          </div>
          <SettingsToggle
            checked={settings.receipt_include_hotspot}
            disabled={!settings.payment_receipt_enabled}
            label="Send receipts to hotspot customers"
            onChange={() => setSettings((current) => ({
              ...current,
              receipt_include_hotspot: !current.receipt_include_hotspot,
            }))}
          />
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Welcome message for new PPPoE customers</h3>
            <p className="mt-1 text-xs leading-5 text-foreground-muted">
              When you add a PPPoE customer, text them their username, password and how to pay.
              Customers you import in bulk are not messaged.
            </p>
          </div>
          <SettingsToggle
            checked={settings.welcome_enabled}
            label="Welcome message for new PPPoE customers"
            onChange={() => setSettings((current) => ({ ...current, welcome_enabled: !current.welcome_enabled }))}
          />
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Message wording</h3>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">
          Use the built-in messages or write your own. Fields in braces, like {'{name}'} or {'{expiry}'}, are filled in for each customer.
        </p>
        <div className="mt-4">
          {CUSTOMER_SMS_EVENTS.map((event) => (
            <WordingRow
              key={event}
              event={event}
              settings={settings}
              onChange={(value) => setTemplate(event, value)}
            />
          ))}
        </div>
      </div>

      <div className="card border-accent-primary/20 bg-accent-primary/5 p-4">
        <p className="text-xs leading-5 text-foreground-muted">
          Each SMS uses normal messaging credits, except on your own SMS gateway. Customers without a valid phone number are skipped.
        </p>
        <button type="button" onClick={onBuyCredits} className="mt-2 text-xs font-medium text-accent-primary hover:underline">
          View or buy SMS credits
        </button>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {dirty ? <p className="text-xs text-foreground-muted sm:mr-auto">You have unsaved changes.</p> : null}
        {validationError && dirty ? <p className="text-xs text-danger sm:mr-auto" role="alert">{validationError}</p> : null}
        <button
          type="button"
          disabled={!dirty || saving || validationError !== null}
          onClick={save}
          className="btn-primary min-h-11 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save customer messages'}
        </button>
      </div>
    </div>
  );
}
