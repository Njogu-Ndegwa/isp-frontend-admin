'use client';

/*
 * The real captive portal in a phone-sized frame, scaled uniformly to fit its
 * box. See app/lib/livePortalPreview.ts for how the portal is driven.
 *
 * Every change of settings loads a fresh frame behind the one on screen and
 * swaps when it has rendered, so the preview always shows the portal's own
 * first render (the one customers get) without flashing. If the portal can't
 * be shown (no router yet, offline, an older portal build), `fallback` is.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import {
  PHONE_HEIGHT, PHONE_WIDTH, PORTAL_PREVIEW_SRC, phoneSize, portalOrigin, portalPreviewData, previewMessageType,
  previewScale,
} from '../lib/livePortalPreview';
import type { PublicPortalResponse } from '../lib/types';

const RENDER_TIMEOUT_MS = 12_000;
/** The card the preview may widen into on a phone (the assistant's cards). */
const BLEED_INTO = '.ai-card';
const SETTLE_MS = 350;

let baseOnce: Promise<PublicPortalResponse | null> | null = null;
/** The reseller's portal as customers get it today, from one of their routers. */
function loadBase(): Promise<PublicPortalResponse | null> {
  baseOnce ??= api.getRouters()
    .then((routers) => {
      const router = routers.find((r) => r.identity?.trim());
      return router ? api.getPublicPortal(router.identity) : null;
    })
    .catch(() => null);
  return baseOnce;
}

/** Test hook: forget the cached portal response. */
export function resetLivePortalPreview() { baseOnce = null; }

type Frame = { id: number; data: PublicPortalResponse };

export default function LivePortalPreview({ settings, fallback, base: givenBase }: {
  /** Portal settings to show, laid over the saved ones. */
  settings: Record<string, unknown>;
  /** Shown when the real portal can't be. */
  fallback: ReactNode;
  /** Portal data to use instead of loading the reseller's own. */
  base?: PublicPortalResponse | null;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const iframes = useRef(new Map<number, HTMLIFrameElement>());
  const nextId = useRef(1);
  const [width, setWidth] = useState(0);
  const [bleed, setBleed] = useState({ left: 0, right: 0 });
  const [phone, setPhone] = useState({ width: PHONE_WIDTH, height: PHONE_HEIGHT });
  const [base, setBase] = useState<PublicPortalResponse | null | undefined>(givenBase);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [shown, setShown] = useState<number | null>(null);
  const shownRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (givenBase !== undefined) { setBase(givenBase); return; }
    let on = true;
    loadBase().then((b) => { if (on) setBase(b); });
    return () => { on = false; };
  }, [givenBase]);

  useEffect(() => {
    const el = box.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const measure = () => {
      // On a phone, use the card's padding too, so the page is drawn as large
      // as the card allows (about 90% of real size on a 360-390 px phone).
      const card = window.innerWidth < 640 ? parent.closest(BLEED_INTO) : null;
      let left = 0, right = 0;
      if (card) {
        const c = card.getBoundingClientRect(), p = parent.getBoundingClientRect(), cs = getComputedStyle(card);
        left = Math.max(0, p.left - c.left - parseFloat(cs.borderLeftWidth || '0'));
        right = Math.max(0, c.right - p.right - parseFloat(cs.borderRightWidth || '0'));
      }
      setBleed((b) => (b.left === left && b.right === right ? b : { left, right }));
      setWidth(parent.clientWidth + left + right);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(parent);
    // The phone is fixed once shown: changing it would reflow the portal.
    setPhone(phoneSize(window.innerWidth, window.innerHeight));
    return () => ro?.disconnect();
  }, []);

  const key = useMemo(() => JSON.stringify(settings), [settings]);
  const data = useMemo(() => (base ? portalPreviewData(base, JSON.parse(key)) : null), [base, key]);

  // A new frame per change, after the typing settles.
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      const id = nextId.current++;
      // Keep the frame on screen; drop any still loading an older change.
      setFrames((fs) => [...fs.filter((f) => f.id === shownRef.current), { id, data }]);
    }, frames.length ? SETTLE_MS : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a data change starts a frame
  }, [data]);

  const framesRef = useRef(frames);
  framesRef.current = frames;

  /** Hand a frame its data (on its "ready", and again on load in case that was missed). */
  const send = (id: number) => {
    const win = iframes.current.get(id)?.contentWindow;
    const frame = framesRef.current.find((f) => f.id === id);
    // The frame is sandboxed (opaque origin), so it can only be addressed as '*';
    // it is our own iframe of PORTAL_PREVIEW_SRC and the data is the reseller's public portal.
    if (win && frame) win.postMessage({ type: 'bw-portal-preview:data', data: frame.data }, '*');
  };

  useEffect(() => {
    const origin = portalOrigin();
    const onMessage = (e: MessageEvent) => {
      // A sandboxed frame has an opaque origin ("null"); match it by its window.
      if (e.origin !== 'null' && e.origin !== origin) return;
      const type = previewMessageType(e.data);
      if (!type) return;
      for (const [id, el] of iframes.current) {
        if (!el.contentWindow || e.source !== el.contentWindow) continue;
        if (type === 'ready') send(id);
        else if (shownRef.current === null || id > shownRef.current) {
          shownRef.current = id;
          setShown(id);
          setFrames((fs) => fs.filter((f) => f.id >= id));
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Nothing rendered in time: the portal isn't reachable (or predates preview mode).
  useEffect(() => {
    if (shown !== null || base === undefined) return;
    if (base === null) { setFailed(true); return; }
    const timer = setTimeout(() => setFailed(true), RENDER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [base, shown]);

  if (base === null) return <>{fallback}</>;

  // Slow to render (a slow line): show the fallback, but keep the frame loading
  // and switch to the real page as soon as it has rendered.
  const waiting = failed && shown === null;
  const scale = previewScale(width, phone.width);
  return (
    <div ref={box} style={{ marginLeft: -bleed.left, marginRight: -bleed.right }}>
      {waiting && fallback}
      <div
        hidden={waiting}
        className="relative mx-auto overflow-hidden rounded-[22px] ring-1 ring-line"
        style={{ width: phone.width * scale, height: phone.height * scale }}
        data-testid="live-portal-preview"
        data-scale={scale.toFixed(4)}
        data-phone={`${phone.width}x${phone.height}`}
      >
        {frames.map((f) => (
          <iframe
            key={f.id}
            ref={(el) => {
              if (el) iframes.current.set(f.id, el);
              else iframes.current.delete(f.id);
            }}
            onLoad={() => send(f.id)}
            data-frame={f.id}
            src={PORTAL_PREVIEW_SRC}
            title={t('Customer login page preview')}
            // No allow-same-origin: the portal runs with an opaque origin, so it
            // can't touch the real portal's storage. No forms, popups or top
            // navigation either.
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            loading="eager"
            tabIndex={f.id === shown ? 0 : -1}
            aria-hidden={f.id === shown ? undefined : true}
            className="absolute left-0 top-0 border-0 bg-white"
            style={{
              width: phone.width, height: phone.height,
              transform: `scale(${scale})`, transformOrigin: '0 0',
              visibility: f.id === shown ? 'visible' : 'hidden',
            }}
          />
        ))}
        {shown === null && <div className="absolute inset-0 animate-pulse bg-line/40" aria-hidden />}
      </div>
    </div>
  );
}
