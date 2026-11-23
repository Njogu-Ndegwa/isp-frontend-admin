'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AlertContacts } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';

// ─── Alert contacts ─────────────────────────────────────────────────────────
// The mobile numbers that get router status SMS (offline / back online /
// unstable), e.g. the reseller plus a field technician. Every alert goes to
// every number and each recipient costs SMS credit. With no numbers saved the
// backend sends to the profile's support phone, so the list starts from that.

const FALLBACK_MAX = 3;

interface AlertContactsCardProps {
  /** Tells the parent which numbers alerts go to now (for its "no phone" warning). */
  onChange?: (contacts: AlertContacts) => void;
}

export function AlertContactsCard({ onChange }: AlertContactsCardProps) {
  const t = useT();
  const { showAlert } = useAlert();
  const [contacts, setContacts] = useState<AlertContacts | null>(null);
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((next: AlertContacts) => {
    setContacts(next);
    setPhones(next.recipients.length ? [...next.recipients] : ['']);
    onChange?.(next);
  }, [onChange]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      apply(await api.getAlertContacts());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('Failed to load alert contacts'));
    } finally {
      setLoading(false);
    }
  }, [apply, t]);

  useEffect(() => { load(); }, [load]);

  const max = contacts?.max_phones ?? FALLBACK_MAX;
  const cleaned = phones.map((p) => p.trim()).filter(Boolean);
  const saved = contacts?.recipients ?? [];
  const dirty = cleaned.join('|') !== saved.join('|');

  const setPhone = (index: number, value: string) => {
    setPhones((prev) => prev.map((p, i) => (i === index ? value : p)));
  };
  const removePhone = (index: number) => {
    setPhones((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [''];
    });
  };
  const addPhone = () => {
    setPhones((prev) => (prev.length < max ? [...prev, ''] : prev));
  };

  const save = async () => {
    try {
      setSaving(true);
      apply(await api.updateAlertContacts(cleaned));
      showAlert('success', t('Alert contacts saved'));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Failed to save alert contacts'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t('Alert contacts')}</h3>
        <p className="text-xs text-foreground-muted mt-0.5">
          {t('Router alert SMS go to every number below, up to {max} numbers.', { max })}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-foreground-muted">{t('Loading…')}</p>
      ) : loadError ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-danger">{loadError}</p>
          <button type="button" onClick={load} className="btn-secondary text-xs shrink-0">
            {t('Retry')}
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {phones.map((phone, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(index, event.target.value)}
                  placeholder={t('e.g. 0712 345 678')}
                  aria-label={t('Mobile number {n}', { n: index + 1 })}
                  disabled={saving}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background-secondary px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => removePhone(index)}
                  disabled={saving || (phones.length === 1 && !phone)}
                  aria-label={t('Remove mobile number {n}', { n: index + 1 })}
                  title={t('Remove')}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground-muted hover:text-danger disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          {phones.length < max && (
            <button
              type="button"
              onClick={addPhone}
              disabled={saving}
              className="text-sm font-medium text-accent-primary hover:underline disabled:opacity-50"
            >
              {t('+ Add mobile number')}
            </button>
          )}

          <p className="text-xs text-foreground-muted">
            {t('SMS credits are used for each recipient. Keep at least one mobile number.')}
          </p>
          {cleaned.length === 0 && (
            <p className="text-xs text-warning">
              {contacts?.support_phone
                ? t('With no numbers, alerts go to your support phone {phone}.', { phone: contacts.support_phone })
                : t('With no numbers, alerts arrive in your inbox only.')}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('Saving…') : t('Save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
