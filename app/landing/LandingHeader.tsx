import Link from 'next/link';
import DemoButton from './DemoButton';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
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
          <Link href="/store" className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Shop
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <DemoButton className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors">Demo</DemoButton>
          <Link href="/login" className="btn-ghost text-sm text-foreground-muted hover:text-foreground">Log In</Link>
          <Link href="/signup" className="btn-primary text-sm">Sign Up</Link>
        </div>

        <details className="md:hidden group relative">
          <summary className="list-none p-2 rounded-lg hover:bg-background-tertiary text-foreground cursor-pointer [&::-webkit-details-marker]:hidden" aria-label="Toggle menu">
            <svg className="w-6 h-6 group-open:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg className="w-6 h-6 hidden group-open:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </summary>
          <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-xl p-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="block text-sm font-medium text-foreground-muted hover:text-foreground py-2 transition-colors">
                {link.label}
              </a>
            ))}
            <Link href="/store" className="flex items-center gap-2 py-2 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Equipment Shop
            </Link>
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex gap-3">
                <Link href="/signup" className="btn-primary text-sm flex-1 text-center">Sign Up</Link>
                <Link href="/login" className="btn-secondary text-sm flex-1 text-center">Log In</Link>
              </div>
              <DemoButton className="w-full text-sm text-foreground-muted hover:text-foreground py-2 transition-colors text-center">
                Explore Live Demo
              </DemoButton>
            </div>
          </div>
        </details>
      </div>
    </nav>
  );
}
