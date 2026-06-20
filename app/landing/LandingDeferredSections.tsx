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

export default function LandingDeferredSections() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
