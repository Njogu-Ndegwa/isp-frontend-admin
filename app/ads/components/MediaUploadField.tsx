'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  IMAGE_TYPES,
  VIDEO_MAX_SECONDS,
  VIDEO_TYPES,
  checkMediaFile,
  isHttpsUrl,
  type MediaKind,
} from '../adModel';

/** Reads a local video's length before it is uploaded. */
function videoSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    const done = (value: number | null) => { URL.revokeObjectURL(url); resolve(value); };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

/**
 * One photo or video for an ad. The 3-step upload from ADS_API.md:
 *   1. POST /api/ads/media/upload-url {content_type, size}
 *   2. PUT the file to upload_url
 *   3. keep public_url
 * A 503 means storage isn't set up yet; until it is, the backend accepts any
 * https:// link, so the field offers to paste one instead.
 */
export default function MediaUploadField({
  kind,
  label,
  hint,
  value,
  onChange,
  required = false,
  error,
  uploadsOff,
  onUploadsOff,
  inputId,
}: {
  kind: MediaKind;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  error?: string;
  /** Shared by every media field on the form: one 503 switches all to paste mode. */
  uploadsOff: boolean;
  onUploadsOff: () => void;
  inputId?: string;
}) {
  const t = useT();
  const autoId = useId();
  const id = inputId ?? autoId;
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState('');

  useEffect(() => () => abortRef.current?.abort(), []);

  const accept = (kind === 'image' ? IMAGE_TYPES : VIDEO_TYPES).join(',');
  const limits = kind === 'image'
    ? t('JPG, PNG or WebP · up to 2 MB · wide (landscape) works best')
    : t('MP4 · up to 12 MB · {s} seconds or less', { s: VIDEO_MAX_SECONDS });

  async function handleFile(file: File) {
    setProblem(null);
    setWarning(null);
    const bad = checkMediaFile(file, kind);
    if (bad) { setProblem(t(bad)); return; }

    if (kind === 'video') {
      const secs = await videoSeconds(file);
      if (secs !== null && secs > VIDEO_MAX_SECONDS + 0.5) {
        setWarning(t('This video is {s} seconds long. Keep it to {max} seconds or less: most people tap away before then.', { s: Math.round(secs), max: VIDEO_MAX_SECONDS }));
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setProgress(0);
      const ticket = await api.requestAdMediaUpload(file.type, file.size);
      await api.uploadAdMedia(ticket, file, setProgress, controller.signal);
      onChange(ticket.public_url);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 503) {
        onUploadsOff();
      } else {
        setProblem(err instanceof Error ? err.message : t('Upload failed. Try again.'));
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const applyPasted = () => {
    const url = pasted.trim();
    if (!isHttpsUrl(url)) { setProblem(t('Paste a link that starts with https://')); return; }
    setProblem(null);
    onChange(url);
    setPasted('');
  };

  const describedBy = `${id}-limits${error || problem ? ` ${id}-error` : ''}`;
  const uploading = progress !== null;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      </div>
      {hint && <p className="-mt-0.5 mb-2 text-xs text-foreground-muted">{hint}</p>}

      <input
        ref={fileRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-describedby={describedBy}
        disabled={uploading}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />

      {value && !uploading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background-tertiary/50 p-2.5">
          <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black">
            {kind === 'video' ? (
              <video src={value} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden="true" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {kind === 'video' ? t('Video added') : t('Photo added')}
            </p>
            <p className="truncate text-xs text-foreground-muted" title={value}>{value.split('/').pop()}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col gap-1 sm:flex-row">
            {!uploadsOff && (
              <button type="button" onClick={() => fileRef.current?.click()} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-accent-primary hover:bg-accent-primary/10">
                {t('Replace')}
              </button>
            )}
            <button type="button" onClick={() => onChange('')} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-foreground-muted hover:bg-background-tertiary hover:text-danger">
              {t('Remove')}
            </button>
          </div>
        </div>
      ) : uploading ? (
        <div className="rounded-xl border border-border bg-background-tertiary/50 p-4" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{t('Uploading…')} {Math.round((progress ?? 0) * 100)}%</span>
            <button type="button" onClick={() => abortRef.current?.abort()} className="min-h-[36px] rounded-lg px-2 text-sm text-foreground-muted hover:text-foreground">
              {t('Cancel')}
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background-tertiary">
            <div className="h-full rounded-full bg-accent-primary transition-[width] duration-200" style={{ width: `${Math.max(4, (progress ?? 0) * 100)}%` }} />
          </div>
        </div>
      ) : uploadsOff ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-foreground">{t("Uploads aren't switched on yet")}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {kind === 'video'
              ? t('Paste a link to the video instead. It must start with https://')
              : t('Paste a link to the photo instead. It must start with https://')}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPasted(); } }}
              className="input min-w-0 flex-1"
              placeholder="https://"
              aria-label={kind === 'video' ? t('Video link') : t('Photo link')}
            />
            <button type="button" onClick={applyPasted} disabled={!pasted.trim()} className="btn-secondary min-h-[44px] flex-shrink-0 disabled:opacity-50">
              {t('Use link')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          aria-describedby={describedBy}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
            dragging ? 'border-accent-primary bg-accent-primary/5' : error ? 'border-danger/60' : 'border-border hover:border-foreground-muted'
          }`}
        >
          <svg className="h-7 w-7 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            {kind === 'video'
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.16-5.16a2.25 2.25 0 013.18 0l5.16 5.16m-1.5-1.5l1.41-1.41a2.25 2.25 0 013.18 0l2.91 2.91M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />}
          </svg>
          <span className="text-sm font-semibold text-foreground">
            {kind === 'video' ? t('Choose a video') : t('Choose a photo')}
          </span>
          <span className="hidden text-xs text-foreground-muted sm:block">{t('or drag it here')}</span>
        </button>
      )}

      <p id={`${id}-limits`} className="mt-1.5 text-xs text-foreground-muted">{limits}</p>
      {warning && <p className="mt-1 text-xs text-warning">{warning}</p>}
      {(problem || error) && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger" role="alert">{problem || error}</p>
      )}
    </div>
  );
}
