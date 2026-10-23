'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../../lib/i18n';

const QUICK_REASONS = [
  "The phone number didn't go through when we called.",
  'The text is hard to read on a phone. Use bigger words in the middle of the photo.',
  'The photo is blurry or stretched.',
  "This product or service isn't allowed on Bitwave portals.",
];

/** Reject needs a reason: the reseller sees it on their ad and fixes it. */
export default function RejectAdDialog({
  open,
  adTitle,
  loading,
  onCancel,
  onReject,
}: {
  open: boolean;
  adTitle: string;
  loading: boolean;
  onCancel: () => void;
  onReject: (note: string) => void;
}) {
  const t = useT();
  const [note, setNote] = useState('');
  // Start empty each time the dialog opens (state adjusted during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setNote('');
  }
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Kept in refs so a parent re-render doesn't reset what the admin typed.
  const cancelRef = useRef(onCancel);
  const loadingRef = useRef(loading);
  useEffect(() => { cancelRef.current = onCancel; loadingRef.current = loading; });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => textRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loadingRef.current) cancelRef.current(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const trimmed = note.trim();

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-ad-title"
        className="relative w-full max-w-md rounded-t-2xl border border-border bg-background-secondary p-5 shadow-xl animate-fade-in sm:rounded-2xl sm:p-6"
        onSubmit={(e) => { e.preventDefault(); if (trimmed) onReject(trimmed); }}
      >
        <h3 id="reject-ad-title" className="text-lg font-semibold text-foreground">{t('Reject this ad?')}</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          {t('“{title}” will not show on any portal. The reseller sees your reason and can fix the ad.', { title: adTitle })}
        </p>

        <label htmlFor="reject-reason" className="mt-4 block text-sm font-medium text-foreground">
          {t('Reason')} <span className="text-danger">*</span>
        </label>
        <textarea
          id="reject-reason"
          ref={textRef}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          rows={3}
          required
          className="input mt-1.5 resize-none"
          placeholder={t('Tell them what to change')}
        />
        <div className="mt-1 text-right text-[11px] text-foreground-muted tabular-nums">{note.length}/300</div>

        <div className="mt-1 flex flex-wrap gap-1.5" aria-label={t('Common reasons')}>
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setNote(t(r))}
              className="min-h-[36px] rounded-full border border-border px-3 py-1 text-left text-xs text-foreground-muted hover:border-foreground-muted hover:text-foreground"
            >
              {t(r)}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary min-h-[44px]">
            {t('Cancel')}
          </button>
          <button
            type="submit"
            disabled={!trimmed || loading}
            className="min-h-[44px] rounded-[10px] bg-red-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? t('Rejecting…') : t('Reject ad')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
