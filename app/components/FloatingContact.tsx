'use client';

import { useEffect, useState } from 'react';
import { PHONE_DISPLAY, TEL_HREF, WHATSAPP_DEFAULT_MESSAGE, whatsappHref } from '../landing/contact';

/**
 * A always-reachable way to talk to a human, pinned to the corner of every
 * public page.
 *
 * The reason it exists: the contact details used to live nine screens down the
 * landing page with no link in the nav, so a visitor who got stuck had nothing
 * to tap. With paid traffic arriving — nearly all of it from TikTok, so nearly
 * all of it on a phone — that is the moment the money is lost. This market
 * closes in conversation, not on a signup form.
 *
 * It hides itself while the contact section is on screen, so it never sits on
 * top of the very details it is shortcutting to.
 */
export default function FloatingContact({ whatsappMessage = WHATSAPP_DEFAULT_MESSAGE }: { whatsappMessage?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Deliberately not an IntersectionObserver holding a node reference. The
    // contact section is lazily mounted and React can hand us a different
    // element than the one we started observing, which silently leaves the
    // observer watching a detached node — the button then never hides. Looking
    // the element up fresh on every check cannot go stale that way.
    let frame = 0;

    const update = () => {
      frame = 0;
      const target = document.getElementById('contact');
      if (!target) {
        setHidden(false);
        return;
      }
      const rect = target.getBoundingClientRect();
      const overlap = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      setHidden(overlap > Math.min(rect.height, window.innerHeight) * 0.3);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // The section can appear without any scroll of its own — a deep link, or
    // the deferred bundle finishing — so keep looking for a while after mount.
    const poll = setInterval(schedule, 500);
    const stopPolling = setTimeout(() => clearInterval(poll), 20000);
    schedule();

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      clearInterval(poll);
      clearTimeout(stopPolling);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed right-4 bottom-4 z-40 flex flex-col items-stretch gap-3 pb-[env(safe-area-inset-bottom)] transition-opacity duration-200 ${
        hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Labelled, not an icon on its own: an unlabelled phone glyph asks the
          visitor to guess, and the whole point of this pair is that a stuck
          visitor never has to. Same size and shape as the WhatsApp pill so the
          two read as one choice with two answers. */}
      <a
        href={TEL_HREF}
        aria-label={`Call Bitwave on ${PHONE_DISPLAY}`}
        title={`Call ${PHONE_DISPLAY}`}
        className="h-14 px-5 rounded-full bg-background/95 backdrop-blur border border-amber-500/50 text-amber-500 font-semibold text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-amber-500/10 active:scale-95 transition-all"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        Call us
      </a>

      <a
        href={whatsappHref(whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp Bitwave on ${PHONE_DISPLAY}`}
        title={`WhatsApp ${PHONE_DISPLAY}`}
        className="h-14 px-5 rounded-full bg-[#25D366] text-[#062e18] font-semibold text-sm shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
      >
        <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.886 9.885M20.52 3.449A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.304-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
        </svg>
        Chat with us
      </a>
    </div>
  );
}
