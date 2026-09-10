'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

function LandingSectionsPlaceholder() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-4">
        <div className="h-24 rounded-xl bg-background-secondary animate-pulse" />
        <div className="h-24 rounded-xl bg-background-secondary animate-pulse" />
        <div className="h-24 rounded-xl bg-background-secondary animate-pulse" />
      </div>
    </section>
  );
}

const LandingSections = dynamic(() => import('./LandingSections'), {
  ssr: false,
  loading: LandingSectionsPlaceholder,
});

// Anchors that live inside the deferred bundle. Arriving at /#pricing (etc.)
// must bypass the viewport gate, or the browser tries to scroll to an element
// that doesn't exist yet and the visitor is left at the hero.
const DEFERRED_SECTION_IDS = new Set([
  'platform',
  'features',
  'shop',
  'how-it-works',
  'pricing',
  'testimonials',
  'contact',
]);

/** How long to keep waiting for a deferred section to appear. */
const MOUNT_TIMEOUT_MS = 12000;
/** How long a section's position must hold still before we stop re-anchoring. */
const SETTLE_MS = 600;

/** Polling interval while waiting for a deferred section to mount and settle. */
const POLL_MS = 60;

/**
 * Scroll to a section that may not exist yet.
 *
 * Three problems make the naive version unreliable. The section lives in a
 * dynamically imported bundle, so it can take seconds to appear — a fixed retry
 * count runs out on a slow connection. Once it does appear the rest of the
 * bundle is still laying out above it, so whatever we scrolled to immediately
 * slides out from under the viewport. And requestAnimationFrame does not fire
 * at all while the page isn't being painted, so a link opened in a background
 * tab would never scroll — hence a timer rather than rAF.
 */
function scrollToSection(id: string) {
  const present = document.getElementById(id);
  if (present) {
    // Already laid out — an ordinary in-page jump.
    present.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const deadline = Date.now() + MOUNT_TIMEOUT_MS;
  let settleUntil = 0;
  let lastTop = Number.NaN;

  const timer = globalThis.setInterval(() => {
    const el = document.getElementById(id);

    if (!el) {
      if (Date.now() >= deadline) globalThis.clearInterval(timer);
      return;
    }

    const top = Math.round(el.getBoundingClientRect().top + window.scrollY);
    if (top !== lastTop) {
      lastTop = top;
      settleUntil = Date.now() + SETTLE_MS;
      // 'instant' because html sets scroll-behavior: smooth, and a correction
      // issued mid-animation would fight the one already running.
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }

    // Position has held still long enough — we're anchored.
    if (Date.now() >= settleUntil) globalThis.clearInterval(timer);
  }, POLL_MS);
}

export default function LandingDeferredSections() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const jumpToHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash || !DEFERRED_SECTION_IDS.has(hash)) return false;
      setShouldLoad(true);
      scrollToSection(hash);
      return true;
    };

    // Clicking a nav anchor while these sections are still unmounted only
    // changes the hash — the browser finds no target and nothing moves. Listen
    // for that and mount the section the link is pointing at.
    window.addEventListener('hashchange', jumpToHash);

    if (jumpToHash()) {
      return () => window.removeEventListener('hashchange', jumpToHash);
    }

    const node = ref.current;
    if (!node) return () => window.removeEventListener('hashchange', jumpToHash);

    if (typeof window.IntersectionObserver === 'undefined') {
      const id = globalThis.setTimeout(() => setShouldLoad(true), 1200);
      return () => {
        globalThis.clearTimeout(id);
        window.removeEventListener('hashchange', jumpToHash);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', jumpToHash);
    };
  }, []);

  return (
    <div ref={ref}>
      {shouldLoad ? <LandingSections /> : <LandingSectionsPlaceholder />}
    </div>
  );
}
