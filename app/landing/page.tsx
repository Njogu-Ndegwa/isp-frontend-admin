'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ------------------------------------------------------------------ */
/*  Scroll-reveal                                                      */
/* ------------------------------------------------------------------ */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    }}>{children}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard screenshot in browser frame                              */
/* ------------------------------------------------------------------ */
const DASHBOARD_SCREENSHOT = 'https://res.cloudinary.com/dhffnvn2d/image/upload/v1771735509/Screenshot_2026-02-22_074227_iwysqz.png';

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#1a1a1d] border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 mx-4 sm:mx-8">
            <div className="flex items-center gap-2 bg-[#09090b] rounded-md px-3 py-1 max-w-sm mx-auto">
              <svg className="w-3 h-3 text-zinc-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span className="text-[10px] sm:text-xs text-zinc-500 truncate">isp.bitwavetechnologies.com</span>
            </div>
          </div>
        </div>
        {/* Screenshot */}
        <Image
          src={DASHBOARD_SCREENSHOT}
          alt="Bitwave ISP Billing Dashboard showing revenue analytics, router health monitoring, bandwidth stats, and customer management"
          width={1920}
          height={891}
          className="w-full h-auto block"
          priority
        />
      </div>
      <div className="absolute -inset-4 bg-gradient-to-b from-amber-500/8 via-transparent to-transparent rounded-2xl -z-10 blur-2xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const HERO_PHOTO = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80';
const TOWER_PHOTO = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80';

const PHONE_NUMBER = '+254795635364';
const PHONE_DISPLAY = '0795 635 364';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
];

const FEATURES = [
  {
    title: 'Automated Billing',
    desc: 'Auto-generate invoices, integrate M-Pesa & bank payments, and reconcile in real time. No more spreadsheets or 2 AM disconnect calls.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    title: 'MikroTik Router Control',
    desc: 'We configure your routers and connect them to the platform. Monitor CPU, memory, bandwidth, and interfaces from one dashboard.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
  },
  {
    title: 'Customer Management',
    desc: 'Complete subscriber profiles with plan history, payment records, usage stats, and connection status — all searchable and exportable.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    title: 'Real-Time Analytics',
    desc: 'Revenue trends, plan performance, daily breakdowns, and top-user reports — the numbers you need to grow, updated live.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    title: 'Instant Connect / Disconnect',
    desc: 'Subscribers auto-connect on payment and auto-disconnect on expiry. No manual intervention, no revenue leakage.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    title: 'Multi-Router Support',
    desc: 'Manage multiple MikroTik routers across different sites from a single account. Scale from one tower to fifty.',
    icon: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ============================================================ */}
      {/*  NAVBAR                                                       */}
      {/* ============================================================ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">Bitwave</span>
          </button>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (<button key={l.href} onClick={() => scrollTo(l.href.slice(1))} className="text-sm font-medium text-white/70 hover:text-white transition-colors">{l.label}</button>))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm text-white/70 hover:text-white">Sign In</Link>
            <button onClick={() => scrollTo('contact')} className="btn-primary text-sm">Request Demo</button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-80 border-b border-border' : 'max-h-0'}`} style={{ background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="px-4 py-4 space-y-3">
            {NAV_LINKS.map(l => (<button key={l.href} onClick={() => scrollTo(l.href.slice(1))} className="block w-full text-left text-sm font-medium text-white/70 hover:text-white py-2 transition-colors">{l.label}</button>))}
            <div className="pt-3 border-t border-border flex gap-3">
              <Link href="/login" className="btn-secondary text-sm flex-1 text-center">Sign In</Link>
              <button onClick={() => scrollTo('contact')} className="btn-primary text-sm flex-1">Request Demo</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  HERO — Full-bleed photo                                      */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image src={HERO_PHOTO} alt="Data center with glowing server racks" fill className="object-cover" sizes="100vw" quality={85} priority />
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
              We configure your MikroTik routers and install a complete billing platform — so you can focus on growing your network, not chasing payments.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => scrollTo('contact')} className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-10 py-4 text-base rounded-xl hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto">Request a Demo</button>
              <button onClick={() => scrollTo('platform')} className="inline-flex items-center justify-center px-10 py-4 text-base font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto">See the Platform</button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SOCIAL PROOF BAR                                             */}
      {/* ============================================================ */}
      <section className="py-12 px-4 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
              {[
                { value: '200+', label: 'ISPs Deployed' },
                { value: '50K+', label: 'Subscribers Managed' },
                { value: '99.9%', label: 'Billing Uptime' },
                { value: '<2hr', label: 'Avg Setup Time' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-bold gradient-text stat-value">{s.value}</div>
                  <div className="text-xs md:text-sm text-foreground-muted mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PROBLEM STATEMENT                                            */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-8">
              Manual billing is <span className="gradient-text">killing your margins</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              {[
                'Chasing payments at 2 AM because a customer claims they paid',
                'Disconnecting and reconnecting users one by one across multiple routers',
                'Losing revenue to expired accounts that stay connected for days',
                'Spending hours reconciling M-Pesa transactions with spreadsheets',
              ].map((pain, i) => (
                <div key={i} className="flex items-start gap-3 card p-4">
                  <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  <p className="text-sm text-foreground-muted leading-relaxed">{pain}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-8 text-lg text-foreground font-medium">Bitwave automates all of this — and more.</p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PLATFORM SHOWCASE                                            */}
      {/* ============================================================ */}
      <section id="platform" className="py-20 md:py-28 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">The Platform</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">Everything you need, <span className="gradient-text">one dashboard</span></h2>
              <p className="mt-4 text-foreground-muted max-w-xl mx-auto">Real-time revenue, router health, bandwidth monitoring, customer management — all in a single pane of glass.</p>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Features</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">Built for the way <span className="gradient-text">ISPs actually work</span></h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={0.08 * i}>
                <div className="card p-6 h-full group">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">{f.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PHOTO BREAK — single dramatic image                          */}
      {/* ============================================================ */}
      <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
        <Image src={TOWER_PHOTO} alt="Earth at night showing global network connectivity" fill className="object-cover" sizes="100vw" quality={80} />
        <div className="absolute inset-0 bg-[#09090b]/50" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Built for ISPs who want to<br /><span className="gradient-text">scale without limits</span>
            </h2>
            <p className="mt-4 text-white/50 text-lg">From 50 subscribers to 50,000 — the platform grows with you.</p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">How It Works</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">Go live in <span className="gradient-text">under 2 hours</span></h2>
              <p className="mt-4 text-foreground-muted max-w-xl mx-auto">No complex setup. No IT team required. We handle the technical work.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-border" />
            {[
              { title: 'We Configure Your Router', desc: 'Share your MikroTik access. Our engineers configure PPPoE, queues, firewall rules, and connect it to the billing API.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg> },
              { title: 'Import Your Customers', desc: 'Add your subscriber list — names, plans, and payment info. We help you migrate from spreadsheets or an existing system.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
              { title: 'Start Collecting Revenue', desc: 'Billing runs on autopilot. Payments are tracked, users are managed, and you get real-time analytics from day one.', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
            ].map((s, i) => (
              <Reveal key={i} delay={0.12 * i}>
                <div className="text-center relative">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-background shadow-lg shadow-amber-500/20 relative z-10">{s.icon}</div>
                  <h3 className="text-lg font-semibold mt-6 mb-2">{s.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                 */}
      {/* ============================================================ */}
      <section id="testimonials" className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Testimonials</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">ISPs that <span className="gradient-text">transformed</span> their business</h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'Before Bitwave, billing was a nightmare. We had spreadsheets everywhere and customers disputing payments daily. Now everything is automated — payment comes in, customer connects. Done.', name: 'Erick K.', role: 'CEO, AfriQ Networks', stars: 5 },
              { quote: 'The router monitoring alone is worth it. I can see CPU load and bandwidth from my phone. When something goes wrong, I know before my customers call me.', name: 'Leigh B.', role: 'CTO, CRISP Wireless', stars: 5 },
              { quote: 'Setup took less than two hours. Their team configured our three MikroTik routers and migrated 400 customers from our old system. We were live the same day.', name: 'David M.', role: 'Founder, Mango Net', stars: 5 },
            ].map((t, i) => (
              <Reveal key={i} delay={0.1 * i}>
                <div className="card-glass p-6 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <svg key={si} className={`w-4 h-4 ${si < t.stars ? 'text-accent-primary' : 'text-background-tertiary'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-foreground-muted">{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CONTACT / CTA                                                */}
      {/* ============================================================ */}
      <section id="contact" className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Get Started</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-3">Ready to automate <span className="gradient-text">your ISP</span>?</h2>
              <p className="mt-4 text-foreground-muted max-w-lg mx-auto text-lg">Get in touch and we&apos;ll have you up and running in under 2 hours.</p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {/* Phone card */}
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="group card p-6 flex items-center gap-4 hover:border-amber-500/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Call or text us</p>
                  <p className="text-lg font-semibold text-foreground">{PHONE_DISPLAY}</p>
                </div>
                <svg className="w-5 h-5 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </a>

              {/* WhatsApp card */}
              <a
                href={`https://wa.me/${PHONE_NUMBER.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group card p-6 flex items-center gap-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">WhatsApp us</p>
                  <p className="text-lg font-semibold text-foreground">{PHONE_DISPLAY}</p>
                </div>
                <svg className="w-5 h-5 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="text-center">
              <p className="text-sm text-foreground-muted mb-4">Already have an account?</p>
              <Link href="/login" className="btn-ghost text-sm">Sign In to your dashboard</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-border bg-background-secondary/50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                </div>
                <span className="text-lg font-bold gradient-text">Bitwave</span>
              </div>
              <p className="text-sm text-foreground-muted leading-relaxed">ISP billing and network management by Bitwave Technologies. Configure routers. Automate billing. Grow your network.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Billing System', 'Router Management', 'Customer Portal', 'Analytics Dashboard'].map(item => (<li key={item}><span className="text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer">{item}</span></li>))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">Support</h4>
              <ul className="space-y-2.5">
                {['Help Center', 'Contact Us', 'System Status', 'Documentation'].map(item => (<li key={item}><span className="text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer">{item}</span></li>))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About Bitwave', 'Careers', 'Privacy Policy', 'Terms of Service'].map(item => (<li key={item}><span className="text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer">{item}</span></li>))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-foreground-muted">&copy; 2026 Bitwave Technologies. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-foreground-muted hover:text-foreground transition-colors" aria-label="Twitter"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
              <a href="#" className="text-foreground-muted hover:text-foreground transition-colors" aria-label="Facebook"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg></a>
              <a href="#" className="text-foreground-muted hover:text-foreground transition-colors" aria-label="LinkedIn"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
