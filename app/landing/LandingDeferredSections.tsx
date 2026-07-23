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

function scrollToWhenMounted(id: string) {
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (tries++ < 300) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function LandingDeferredSections() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && DEFERRED_SECTION_IDS.has(hash)) {
      setShouldLoad(true);
      scrollToWhenMounted(hash);
      return;
    }

    const node = ref.current;
    if (!node) return;

    if (typeof window.IntersectionObserver === 'undefined') {
      const id = globalThis.setTimeout(() => setShouldLoad(true), 1200);
      return () => globalThis.clearTimeout(id);
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
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {shouldLoad ? <LandingSections /> : <LandingSectionsPlaceholder />}
    </div>
  );
}
