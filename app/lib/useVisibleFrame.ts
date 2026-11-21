'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * Keep a full-screen app inside the part of the screen the person can see.
 *
 * On a phone the browser scrolls the whole page when the keyboard opens (and as
 * Safari's toolbar grows and shrinks), so a header at the top of a 100dvh page
 * slides out of view. Pinned with position: fixed and sized to the visual
 * viewport instead, the app shrinks above the keyboard: the header stays at the
 * top, the composer sits on the keyboard, and only the conversation scrolls.
 * Without visualViewport (old browsers) the element keeps its CSS height.
 */
export function useVisibleFrame(ref: RefObject<HTMLElement | null>, enabled = true): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!enabled || !el || !vv) return;
    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.height = `${Math.round(vv.height)}px`;
        el.style.transform = vv.offsetTop > 0 ? `translateY(${Math.round(vv.offsetTop)}px)` : '';
        // the page itself never scrolls: only the conversation inside does
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    window.addEventListener('orientationchange', apply);
    const root = document.documentElement;
    const before = root.style.overscrollBehavior;
    root.style.overscrollBehavior = 'none';  // no rubber-band pull of the whole app
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      window.removeEventListener('orientationchange', apply);
      root.style.overscrollBehavior = before;
      el.style.height = '';
      el.style.transform = '';
    };
  }, [ref, enabled]);
}
