import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DemoButton from './DemoButton';
import LandingDeferredSections from './LandingDeferredSections';
import LandingHeader from './LandingHeader';

const HERO_PHOTO = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80';

const STATS = [
  { value: '200+', label: 'ISPs Deployed' },
  { value: '50K+', label: 'Subscribers Managed' },
  { value: '99.9%', label: 'Billing Uptime' },
  { value: '<2hr', label: 'Avg Setup Time' },
];

function Reveal({ children, className = '' }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingHeader />

      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        <Image
          src={HERO_PHOTO}
          alt="Data center with glowing server racks"
          fill
          className="object-cover"
          sizes="100vw"
          quality={80}
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-[#09090b]/65" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-white/70">Trusted by 200+ ISPs across East Africa</span>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.06] tracking-tight text-white">
              The Billing System<br />
              <span className="gradient-text">Your ISP Deserves</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              We configure your MikroTik routers and install a complete billing platform so you can focus on growing your network, not chasing payments.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-10 py-4 text-base rounded-xl hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Sign Up Free
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Log In
              </Link>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <DemoButton className="text-sm text-white/50 hover:text-white/80 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/50">
                or explore the live demo
              </DemoButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-10 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold gradient-text stat-value">{stat.value}</div>
                <div className="text-xs md:text-sm text-foreground-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingDeferredSections />
    </div>
  );
}
