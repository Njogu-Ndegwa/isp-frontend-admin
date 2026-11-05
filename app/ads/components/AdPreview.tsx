'use client';

/**
 * How an ad looks on a customer's phone. Mirrors the portal's hero slide
 * (isp-landing-page ads.js heroSlideHtml + styles003.css .hero-*): story
 * segments on top, the WiFi's name chip, the photo or video, and one bottom
 * bar with the tag, the business, the offer and a green Call button.
 * Approximate on purpose: it is there so the reseller sees what customers see.
 */
import type { AdImageFit, AdMediaType, AdPlacement, AdSlot } from '../../lib/types';
import { portalTag } from '../adModel';

export interface AdPreviewData {
  placement: AdPlacement;
  slot: AdSlot;
  media_type: AdMediaType;
  image_url: string;
  video_url: string;
  poster_url: string;
  image_fit: AdImageFit;
  bg_color: string;
  seller_name: string;
  title: string;
  price: string;
  description: string;
  seller_location: string;
  phone_number: string;
  whatsapp_number: string;
}

const PhoneIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ChatIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z" />
  </svg>
);

const WifiIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.55a11 11 0 0 1 14 0" /><path d="M8.5 16.1a6 6 0 0 1 7 0" /><path d="M2 8.82a15 15 0 0 1 20 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const MutedIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

function HeroSlide({ ad, wifiName, showSafeArea }: { ad: AdPreviewData; wifiName: string; showSafeArea: boolean }) {
  const isVideo = ad.media_type === 'video';
  const contain = !isVideo && ad.image_fit === 'contain';
  const media = isVideo ? ad.poster_url : ad.image_url;
  const name = ad.seller_name.trim() || ad.title.trim() || 'Business name';
  const offer = contain
    ? (ad.description.trim() || ad.seller_location.trim())
    : [ad.title.trim(), ad.price.trim()].filter(Boolean).join(' · ');
  const bg = /^#[0-9A-Fa-f]{6}$/.test(ad.bg_color) ? ad.bg_color : '#0f172a';
  const hasMedia = isVideo ? !!(ad.video_url || ad.poster_url) : !!ad.image_url;

  return (
    <div className="relative overflow-hidden" style={{ background: bg, aspectRatio: '360 / 240' }}>
      {isVideo && ad.video_url ? (
        <video
          key={ad.video_url}
          className="absolute inset-0 h-full w-full object-cover"
          src={ad.video_url}
          poster={ad.poster_url || undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      ) : media ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media}
          alt=""
          className={contain
            ? 'absolute object-contain'
            : 'absolute inset-0 h-full w-full object-cover'}
          style={contain ? { top: 46, right: 6, width: '44%', height: 'calc(100% - 110px)' } : undefined}
        />
      ) : null}

      {!hasMedia && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] font-medium text-white/55" style={contain ? { left: '52%' } : undefined}>
          {isVideo ? 'Your video plays here' : 'Your photo goes here'}
        </div>
      )}

      {contain && (
        <div
          className="absolute z-[3] text-white font-bold"
          style={{ top: 62, left: 16, right: '48%', fontSize: 21, lineHeight: 1.15, textWrap: 'balance' } as React.CSSProperties}
        >
          {ad.title.trim() || 'Your headline'}
          {ad.price.trim() && (
            <span className="mt-1.5 inline-block rounded-lg px-2 text-[17px]" style={{ background: '#FACC15', color: '#1A2E05' }}>
              {ad.price.trim()}
            </span>
          )}
        </div>
      )}

      {/* Story-style segments: this ad is slide 2 of 3. */}
      <div className="absolute left-2.5 right-2.5 top-[11px] z-[5] flex gap-1" aria-hidden="true">
        {[1, 0.55, 0].map((fill, i) => (
          <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-sm" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <span className="block h-full bg-white" style={{ width: `${fill * 100}%` }} />
          </span>
        ))}
      </div>

      <div className="absolute left-3 right-2 top-6 z-[3] flex items-center justify-between gap-2">
        <span
          className="inline-flex max-w-[70%] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ background: 'rgba(15,23,42,0.55)' }}
        >
          <WifiIcon />
          <span className="truncate">{wifiName}</span>
        </span>
        {isVideo && (
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: 'rgba(15,23,42,0.55)' }}>
            <MutedIcon />
          </span>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-[3] flex items-center gap-3 text-white"
        style={{
          padding: '30px 12px 12px 14px',
          background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.75) 55%, rgba(15,23,42,0) 100%)',
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-[7px]">
            <span
              className="flex-shrink-0 rounded px-1.5 text-[10.5px] font-extrabold uppercase tracking-wider"
              style={{ background: '#FACC15', color: '#1F1A05' }}
            >
              {portalTag(ad.slot)}
            </span>
            <span className="truncate text-[15px] font-bold">{name}</span>
          </div>
          {offer && <div className="truncate text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{offer}</div>}
        </div>
        <span
          className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-full pl-4 pr-5 text-[15px] font-bold text-white"
          style={{ background: '#15803D', boxShadow: '0 4px 14px rgba(21,128,61,0.35)', opacity: ad.phone_number.trim() ? 1 : 0.55 }}
        >
          <PhoneIcon />
          Call
        </span>
      </div>

      {showSafeArea && (
        <div className="pointer-events-none absolute inset-0 z-[6]" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 flex items-end justify-end border-b-2 border-dashed border-red-400 bg-red-500/25" style={{ height: '20%' }}>
            <span className="mb-0.5 mr-1.5 rounded bg-red-600 px-1.5 text-[10px] font-semibold text-white">Covered by the WiFi name</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-start justify-start border-t-2 border-dashed border-red-400 bg-red-500/25" style={{ height: '30%' }}>
            <span className="mt-0.5 ml-1.5 rounded bg-red-600 px-1.5 text-[10px] font-semibold text-white">Covered by the Call bar</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ShopCard({ ad }: { ad: AdPreviewData }) {
  const media = ad.media_type === 'video' ? ad.poster_url : ad.image_url;
  const bg = /^#[0-9A-Fa-f]{6}$/.test(ad.bg_color) ? ad.bg_color : '#0f172a';
  return (
    <div className="w-[62%] flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3]" style={{ background: bg }}>
        {media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media} alt="" className={`absolute inset-0 h-full w-full ${ad.image_fit === 'contain' ? 'object-contain' : 'object-cover'}`} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">Your photo</div>
        )}
        <span className="absolute left-2 top-2 rounded px-1.5 text-[10px] font-extrabold uppercase" style={{ background: '#FACC15', color: '#1F1A05' }}>
          {portalTag(ad.slot)}
        </span>
      </div>
      <div className="space-y-0.5 p-2.5">
        <div className="truncate text-[13px] font-bold text-slate-900">{ad.title.trim() || 'Your headline'}</div>
        {ad.price.trim() && <div className="truncate text-[13px] font-bold" style={{ color: '#15803D' }}>{ad.price.trim()}</div>}
        <div className="truncate text-[11px] text-slate-500">
          {[ad.seller_name.trim() || 'Business name', ad.seller_location.trim()].filter(Boolean).join(' · ')}
        </div>
        <div className="flex gap-1.5 pt-1.5">
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold text-white" style={{ background: '#15803D' }}>
            <PhoneIcon size={14} /> Call
          </span>
          {(ad.whatsapp_number.trim() || ad.phone_number.trim()) && (
            <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold text-white" style={{ background: '#16A34A' }}>
              <ChatIcon /> Chat
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdPreview({
  ad,
  wifiName,
  showSafeArea = false,
  compact = false,
}: {
  ad: AdPreviewData;
  wifiName: string;
  showSafeArea?: boolean;
  /** Just the ad, without the phone frame and portal context. */
  compact?: boolean;
}) {
  if (compact) {
    return ad.placement === 'local'
      ? <div className="flex rounded-xl bg-slate-100 p-3"><ShopCard ad={ad} /></div>
      : <div className="overflow-hidden rounded-xl"><HeroSlide ad={ad} wifiName={wifiName} showSafeArea={showSafeArea} /></div>;
  }

  return (
    <div
      className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] border-zinc-800 bg-white shadow-xl dark:border-zinc-700"
      role="img"
      aria-label={ad.placement === 'local'
        ? 'Preview of the ad in the shops row after payment'
        : 'Preview of the ad at the top of the WiFi login page'}
    >
      {ad.placement === 'local' ? (
        <div className="bg-slate-50 pb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div className="px-4 pb-3 pt-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="text-base font-bold text-slate-900">You&apos;re online</div>
            <div className="text-xs text-slate-500">Enjoy your internet</div>
          </div>
          <div className="px-4 pb-2 text-[13px] font-bold text-slate-800">Shops near you</div>
          <div className="flex gap-2.5 overflow-hidden px-4">
            <ShopCard ad={ad} />
            <div className="w-[62%] flex-shrink-0 rounded-xl border border-slate-200 bg-white">
              <div className="aspect-[4/3] rounded-t-xl bg-slate-200" />
              <div className="space-y-1.5 p-2.5">
                <div className="h-2.5 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>
          <HeroSlide ad={ad} wifiName={wifiName} showSafeArea={showSafeArea} />
          <div className="space-y-2 bg-slate-50 px-4 pb-5 pt-4" aria-hidden="true">
            <div className="text-[13px] font-bold text-slate-800">Choose a package</div>
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-24 rounded bg-slate-200" />
                  <div className="h-2 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-7 w-14 rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
