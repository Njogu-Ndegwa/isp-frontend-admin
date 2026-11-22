'use client';

import { useLayoutEffect, type RefObject } from 'react';

/** A field that brings up the on-screen keyboard while it has focus. */
export function opensKeyboard(el: Element | null): boolean {
  if (!el) return false;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
  return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type);
}

/**
 * The height the frame takes, in its own (zoomed) pixels, or null for its CSS height
 * (100dvh): only while someone types does it follow the visible area above the keyboard.
 */
export function frameHeight(typing: boolean, visibleHeight: number, zoom: number): number | null {
  return typing && visibleHeight > 0 ? Math.round(visibleHeight / (zoom || 1)) : null;
}

/**
 * Put the keyboard away before leaving a page (sign-in, sign-up): blur the field and wait,
 * at most `maxMs`, until the visible area is back to the full screen. Navigating with the
 * keyboard still up left phones painting only the top half of the next page until a scroll.
 */
export async function closeKeyboard(maxMs = 700): Promise<void> {
  if (typeof document === 'undefined') return;
  const active = document.activeElement as HTMLElement | null;
  if (opensKeyboard(active)) active?.blur();
  const vv = window.visualViewport;
  if (!vv) return;
  const started = Date.now();
  while (Date.now() - started < maxMs && vv.height < window.innerHeight - 60) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Re-measure a little after opening: a keyboard still closing (the login page's) reports a short screen. */
const SETTLE_MS = [120, 400, 1000];

/**
 * Keep a full-screen app inside the part of the screen the person can see.
 *
 * On a phone the browser scrolls the whole page when the keyboard opens (and as
 * Safari's toolbar grows and shrinks), so a header at the top of a 100dvh page
 * slides out of view. While a field in the app is being typed in, the frame is
 * pinned with position: fixed and sized to the visual viewport instead, so it
 * shrinks above the keyboard: the header stays at the top, the composer sits on
 * the keyboard, and only the conversation scrolls.
 *
 * Without a focused field it keeps its CSS height (the whole screen). Following the
 * visual viewport then too is what left half the screen black after signing in: the
 * password field's keyboard was still closing when the app first measured, and
 * nothing re-measured until the person scrolled.
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
        // follow the visible area; never scroll the page ourselves: on iPhones a scroll while a
        // field is being focused drops the focus, so the keyboard never opens on the composer
        const active = document.activeElement;
        const typing = opensKeyboard(active) && el.contains(active);
        // a frame drawn at a scale (80% on laptops) takes its height in its own, scaled pixels
        const zoom = parseFloat(getComputedStyle(el).getPropertyValue('zoom')) || 1;
        const height = frameHeight(typing, vv.height, zoom);
        el.style.height = height === null ? '' : `${height}px`;
        el.style.transform = typing && vv.offsetTop > 0 ? `translateY(${Math.round(vv.offsetTop / zoom)}px)` : '';
        // a page left scrolled by a keyboard that has gone (the sign-in one): put it back, as the
        // person's own scroll would. Only when nobody is typing: then a scroll cannot drop a focus.
        if (!typing && (window.scrollY !== 0 || vv.offsetTop > 0)) window.scrollTo(0, 0);
      });
    };
    apply();
    const timers = SETTLE_MS.map((ms) => setTimeout(apply, ms));
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.addEventListener('pageshow', apply);
    // the keyboard comes and goes with a field's focus
    document.addEventListener('focusin', apply);
    document.addEventListener('focusout', apply);
    const root = document.documentElement;
    const before = root.style.overscrollBehavior;
    root.style.overscrollBehavior = 'none';  // no rubber-band pull of the whole app
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.removeEventListener('pageshow', apply);
      document.removeEventListener('focusin', apply);
      document.removeEventListener('focusout', apply);
      root.style.overscrollBehavior = before;
      el.style.height = '';
      el.style.transform = '';
    };
  }, [ref, enabled]);
}
