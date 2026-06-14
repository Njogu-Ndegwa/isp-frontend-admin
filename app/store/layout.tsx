'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartProvider, useCart } from './cart';

/* ─── Store Nav ───────────────────────────────────────────────────── */

function StoreNav() {
  const pathname = usePathname();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: 'Products', href: '/store' },
    { label: 'Track Order', href: '/store/track' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/store" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
            <svg className="w-4 h-4 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold gradient-text block">Bitwave</span>
            <span className="text-[10px] text-foreground-muted block -mt-0.5">Equipment Shop</span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${pathname === l.href ? 'text-accent-primary' : 'text-foreground-muted hover:text-foreground'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link href="/store/checkout" className="relative p-2 rounded-lg hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-[10px] font-bold text-[#09090b] flex items-center justify-center shadow">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <Link href="/landing" className="hidden md:flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Home
          </Link>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-background-tertiary transition-colors"
          >
            <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-200 bg-background border-t border-border ${menuOpen ? 'max-h-40' : 'max-h-0'}`}>
        <div className="px-4 py-3 space-y-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-medium transition-colors ${pathname === l.href ? 'text-accent-primary' : 'text-foreground-muted hover:text-foreground'}`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/landing" onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-foreground-muted hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── Layout ──────────────────────────────────────────────────────── */

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background text-foreground">
        <StoreNav />
        <main>{children}</main>
        <footer className="border-t border-border bg-background-secondary/40 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground-muted">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <span className="font-medium text-foreground">Bitwave Equipment Shop</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/store/track" className="hover:text-foreground transition-colors">Track Order</Link>
              <a href="tel:+254795635364" className="hover:text-foreground transition-colors">+254 795 635 364</a>
              <Link href="/landing" className="hover:text-foreground transition-colors">Back to Home</Link>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
