import Link from 'next/link';
import SolutionLinks from '../solutions/SolutionLinks';

// The posts Google already sends readers to (Search Console, Oct 2026). A
// homepage link is the strongest internal link the blog can get.
const POPULAR_GUIDES = [
  { href: '/blog/connect-smart-tv-hotspot-wifi', label: 'Pay for hotspot WiFi on a smart TV' },
  { href: '/blog/best-isp-billing-system-kenya-2026', label: 'Best ISP billing system in Kenya' },
  { href: '/blog/how-to-start-wifi-hotspot-business-kenya', label: 'Start a WiFi hotspot business' },
];

/**
 * Server-rendered so its links are crawlable without JavaScript, and so the
 * FAQ can sit above it while the sections before it stay deferred.
 */
export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background-secondary/50">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
            </div>
            <span className="text-lg font-bold gradient-text">Bitwave</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/pricing" className="text-sm text-foreground-muted hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/blog" className="text-sm text-foreground-muted hover:text-foreground transition-colors">Blog</Link>
            <p className="text-sm text-foreground-muted">&copy; 2026 Bitwave Technologies. All rights reserved.</p>
          </div>
        </div>
        <SolutionLinks className="mt-8 pt-8 border-t border-border" />
        <nav aria-label="Popular guides" className="mt-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {POPULAR_GUIDES.map((guide) => (
              <li key={guide.href}>
                <Link href={guide.href} className="text-sm text-foreground-muted hover:text-foreground transition-colors">
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
