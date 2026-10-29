'use client';

import type { Ad } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { STATUS_META, type AdDisplayStatus } from '../adModel';

const BADGE: Record<string, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
  info: 'badge-info',
};

export function AdStatusChip({ status }: { status: AdDisplayStatus }) {
  const t = useT();
  const meta = STATUS_META[status];
  return (
    <span className={`badge ${BADGE[meta.variant]} gap-1.5 whitespace-nowrap`}>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'live' ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {t(meta.label)}
    </span>
  );
}

/** Photo, or the video's cover, on the ad's background colour. */
export function AdThumb({ ad, className = 'h-20 w-20' }: { ad: Pick<Ad, 'media_type' | 'image_url' | 'poster_url' | 'image_fit' | 'bg_color'>; className?: string }) {
  const src = ad.media_type === 'video' ? ad.poster_url : ad.image_url;
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-xl ${className}`}
      style={{ background: ad.bg_color || '#0f172a' }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${ad.image_fit === 'contain' ? 'object-contain p-1' : 'object-cover'}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.16-5.16a2.25 2.25 0 013.18 0l5.16 5.16m-1.5-1.5l1.41-1.41a2.25 2.25 0 013.18 0l2.91 2.91M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
          </svg>
        </div>
      )}
      {ad.media_type === 'video' && (
        <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Video">
          <svg className="ml-0.5 h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </span>
      )}
    </div>
  );
}
