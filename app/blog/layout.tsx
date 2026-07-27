import Link from 'next/link';
import LandingHeader from '../landing/LandingHeader';

// Blog pages share the landing chrome so every article carries the nav and
// Sign Up CTA (the blog previously rendered with no header/footer at all).
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingHeader />
      <div className="pt-16 flex-1">{children}</div>
      <footer className="border-t border-border bg-background-secondary/50">
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-orange-500" />
            <span className="text-sm font-bold gradient-text">Bitwave Technologies</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-foreground-muted">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/store" className="hover:text-foreground transition-colors">Shop</Link>
            <Link href="/signup" className="text-amber-500 hover:text-amber-400 transition-colors font-semibold">Start free</Link>
          </div>
          <p className="text-xs text-foreground-muted">
            © {new Date().getFullYear()} Bitwave Technologies
          </p>
        </div>
      </footer>
    </div>
  );
}
