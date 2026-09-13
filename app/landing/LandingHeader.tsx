import Link from 'next/link';
import DemoButton from './DemoButton';
import LandingMobileMenu from './LandingMobileMenu';
import { SHOP_VISIBLE_ON_LANDING } from './shopVisibility';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Blog', href: '/blog' },
  // Last in the list but present: a stuck visitor needs a link to tap, not
  // nine screens of scrolling to find the number.
  { label: 'Contact', href: '#contact' },
];

export default function LandingHeader() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
            <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <span className="text-lg font-bold gradient-text hidden sm:block">Bitwave</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
          {SHOP_VISIBLE_ON_LANDING && (
            <Link href="/store" className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Shop
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <DemoButton className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors">Demo</DemoButton>
          <Link href="/login" className="btn-ghost text-sm text-foreground-muted hover:text-foreground">Log In</Link>
          <Link href="/signup" className="btn-primary text-sm">Sign Up</Link>
        </div>

        <LandingMobileMenu navLinks={NAV_LINKS} />
      </div>
    </nav>
  );
}
