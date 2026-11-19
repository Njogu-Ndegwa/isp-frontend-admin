'use client';

import { useEffect, useRef, useState } from 'react';
import { preparePhoto, type OutgoingImage } from '../lib/assistant';
import { useT } from '../lib/i18n';
import { ArrowUpIcon, CameraIcon, CloseIcon, SpinnerIcon } from './icons';

const MAX_PHOTOS = 4;

/*
 * The question box: a roomy card whose text area grows with what is typed (up to
 * about 40% of the screen, then it scrolls), with a toolbar row underneath. Photos
 * attach on the left (a router label, an error on a screen); Send is on the right.
 * It stays at the bottom of the screen, clear of the phone's home bar.
 */
export default function Composer({ busy, disabled, placeholder, note, onSend }: {
  busy: boolean;
  /** why nothing can be sent (the assistant is off), if so */
  disabled?: string | null;
  placeholder: string;
  note?: React.ReactNode;
  onSend: (text: string, photos: OutgoingImage[]) => void;
}) {
  const t = useT();
  const [value, setValue] = useState('');
  const [photos, setPhotos] = useState<OutgoingImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, Math.max(120, Math.round(window.innerHeight * 0.4)))}px`;
  }, [value]);

  // Keep the cursor in the box on a desktop. On a phone that would pop the keyboard over the answer.
  useEffect(() => {
    if (!busy && !disabled && window.matchMedia('(pointer: fine)').matches) ref.current?.focus();
  }, [busy, disabled]);

  const canSend = !busy && !disabled && !preparing && (value.trim().length > 0 || photos.length > 0);
  const submit = () => {
    if (!canSend) return;
    const text = value.trim();
    const sent = photos;
    setValue('');
    setPhotos([]);
    setError(null);
    if (!window.matchMedia('(pointer: fine)').matches) ref.current?.blur();
    onSend(text, sent);
  };

  const attach = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPreparing(true);
    setError(null);
    try {
      const room = MAX_PHOTOS - photos.length;
      const ready = await Promise.all(Array.from(files).slice(0, Math.max(0, room)).map(preparePhoto));
      setPhotos((prev) => [...prev, ...ready].slice(0, MAX_PHOTOS));
      if (files.length > room) setError(t('Up to {n} photos per message.', { n: MAX_PHOTOS }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="shrink-0 border-t border-line bg-[color:var(--ai-bg)]/95 backdrop-blur">
      <div className="mx-auto max-w-[1040px] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-6 sm:pb-4 sm:pt-3">
        {note}
        {error ? <p className="mb-1.5 text-[12.5px] text-[var(--ai-text-bad)]">{error}</p> : null}
        <form
          className="ai-card flex cursor-text flex-col !rounded-[24px] px-4 pb-2.5 pt-3 focus-within:!border-accent/60"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          // a tap anywhere on the card (not just the text line) puts the cursor in the box
          onClick={(e) => { if (!(e.target as HTMLElement).closest('button, textarea, input')) ref.current?.focus(); }}
        >
          {photos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={t('Photo')} className="h-16 w-16 rounded-[10px] border border-line object-cover" />
                  <button type="button" aria-label={t('Remove photo')} onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-surface-1 text-ink-1 shadow">
                    <CloseIcon width={11} height={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label htmlFor="ai-ask" className="sr-only">{placeholder}</label>
          <textarea
            id="ai-ask"
            ref={ref}
            rows={1}
            value={value}
            maxLength={6000}
            disabled={!!disabled}
            enterKeyHint="send"
            placeholder={disabled || placeholder}
            className="ai-ask max-h-[40vh] min-h-[48px] w-full resize-none bg-transparent py-1 text-[16px] leading-relaxed text-ink-1 placeholder:text-ink-3 focus:outline-none"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends with a keyboard; on a phone Enter is a new line and the button sends
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => attach(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || preparing || photos.length >= MAX_PHOTOS || !!disabled}
              aria-label={t('Add a photo')} title={t('Add a photo')}
              className="-ml-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1 disabled:opacity-40">
              {preparing ? <SpinnerIcon width={17} height={17} className="text-accent" /> : <CameraIcon width={19} height={19} />}
            </button>
            <span className="hidden min-w-0 flex-1 truncate text-[12px] text-ink-3 [@media(pointer:fine)]:block">{t('Enter to send · Shift + Enter for a new line')}</span>
            <span className="flex-1 [@media(pointer:fine)]:hidden" />
            <button type="submit" disabled={!canSend} aria-label={t('Send')} title={t('Send')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-fill text-accent-ink transition-opacity disabled:opacity-35">
              {busy ? <SpinnerIcon width={17} height={17} /> : <ArrowUpIcon width={19} height={19} strokeWidth={2.4} />}
            </button>
          </div>
        </form>
        <p className="mt-1.5 hidden text-center text-[11.5px] text-ink-3 sm:block">
          {t('Figures come from your account, not from the AI. Nothing is changed until you tap Confirm.')}
        </p>
      </div>
    </div>
  );
}
