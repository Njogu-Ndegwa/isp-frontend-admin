'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { beginImpersonation } from '../lib/impersonation';
import { useT } from '../lib/i18n';

export const VIEW_AS_REASON_MIN = 5;
export const VIEW_AS_REASON_MAX = 300;

interface ViewAsResellerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resellerId: number;
  resellerName: string;
}

export function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/**
 * Starts a read-only "View as reseller" session. On success the admin's
 * session is parked (see lib/impersonation) and the page hard-navigates to the
 * reseller's dashboard so every context reloads as the reseller.
 */
export default function ViewAsResellerDialog({ isOpen, onClose, resellerId, resellerName }: ViewAsResellerDialogProps) {
  const t = useT();
  const inputId = useId();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= VIEW_AS_REASON_MIN && trimmed.length <= VIEW_AS_REASON_MAX;

  const close = () => {
    if (submitting) return;
    setError('');
    onClose();
  };

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reasonValid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const session = await api.startImpersonation(resellerId, trimmed);
      beginImpersonation(session, resellerId, resellerName);
      // Hard navigation: AuthContext, caches and every page reload as the reseller.
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('Could not start View as. Try again.'));
      setSubmitting(false);
    }
  };

  const dialog = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-as-dialog-title"
        onSubmit={start}
        className="relative bg-background-secondary border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-warning/15 text-warning flex-shrink-0">
            <EyeIcon className="w-5 h-5" />
          </span>
          <h3 id="view-as-dialog-title" className="text-lg font-semibold text-foreground">
            {t('View as reseller')}
          </h3>
        </div>
        <p className="text-sm text-foreground-muted mb-4">
          {t("You'll see {name}'s full dashboard, read-only, for 30 minutes. This is logged.", { name: resellerName })}
        </p>
        <ul className="text-xs text-foreground-muted mb-4 space-y-1 list-disc pl-4">
          <li>{t('Saving, sending or deleting anything is blocked.')}</li>
          <li>{t('Use Exit in the banner to return to your admin account.')}</li>
        </ul>
        <label htmlFor={inputId} className="block text-sm font-medium mb-1 text-foreground">
          {t('Reason')} *
        </label>
        <input
          id={inputId}
          type="text"
          className="input w-full"
          value={reason}
          autoFocus
          maxLength={VIEW_AS_REASON_MAX}
          disabled={submitting}
          onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
          placeholder={t('e.g. Support ticket: customers not showing')}
        />
        <p className="text-xs text-foreground-muted mt-1">
          {t('At least {min} characters. Saved in the audit log.', { min: VIEW_AS_REASON_MIN })}
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">{error}</p>
        )}
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={close} disabled={submitting} className="btn-secondary flex-1 py-2.5">
            {t('Cancel')}
          </button>
          <button
            type="submit"
            disabled={!reasonValid || submitting}
            className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {t('Starting...')}
              </>
            ) : (
              t('Start')
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
