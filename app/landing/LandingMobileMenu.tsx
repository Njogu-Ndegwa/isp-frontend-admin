'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import DemoButton from './DemoButton';
import { SHOP_VISIBLE_ON_LANDING } from './shopVisibility';

type NavLink = { label: string; href: string };

/**
 * The landing page's burger menu.
 *
 * A bare <details> opens and closes itself, but nothing closes it when you pick
 * something from inside it. On a phone that reads as a dead menu: tapping
 * Pricing does scroll the page to the pricing section, but the panel stays
 * open on top of it, so the visitor sees the same menu they just tapped and
 * concludes the link is broken.
 *
 * So the panel has to be told to close — on a link tap, on Escape, and on a tap
 * outside it.
 */
export default function LandingMobileMenu({ navLinks }: { navLinks: NavLink[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (el?.open && event.target instanceof Node && !el.contains(event.target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="md:hidden group relative">
      <summary
        className="list-none p-2 rounded-lg hover:bg-background-tertiary text-foreground cursor-pointer [&::-webkit-details-marker]:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 group-open:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg className="w-6 h-6 hidden group-open:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </summary>
      {/* One handler on the panel rather than one per link: anything actionable
          in here dismisses the menu, including links added later. */}
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a, button')) close();
        }}
        className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-xl p-4 space-y-3"
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block text-sm font-medium text-foreground-muted hover:text-foreground py-2 transition-colors"
          >
            {link.label}
          </a>
        ))}
        {SHOP_VISIBLE_ON_LANDING && (
          <Link href="/store" className="flex items-center gap-2 py-2 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Equipment Shop
          </Link>
        )}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex gap-3">
            <Link href="/signup" className="btn-primary text-sm flex-1 text-center">Sign Up</Link>
            <Link href="/login" className="btn-secondary text-sm flex-1 text-center">Log In</Link>
          </div>
          <DemoButton
            onBeforeNavigate={close}
            className="w-full text-sm text-foreground-muted hover:text-foreground py-2 transition-colors text-center"
          >
            Explore Live Demo
          </DemoButton>
        </div>
      </div>
    </details>
  );
}
