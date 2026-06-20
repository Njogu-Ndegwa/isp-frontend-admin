'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import DemoButton from './DemoButton';
import PricingCalculator from './PricingCalculator';

const DASHBOARD_SCREENSHOT = 'https://res.cloudinary.com/dhffnvn2d/image/upload/v1771735509/Screenshot_2026-02-22_074227_iwysqz.png';
const TOWER_PHOTO = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80';
const PHONE_NUMBER = '+254795635364';
const PHONE_DISPLAY = '0795 635 364';

const pains = [
  'Chasing payments after customers claim they paid',
  'Disconnecting and reconnecting users across routers',
  'Losing revenue to expired accounts that stay online',
  'Reconciling mobile payment transactions by spreadsheet',
];

const features = [
  ['Automated Billing', 'Invoices, mobile money payments, reconciliation, and expiry handling run without spreadsheet work.'],
  ['MikroTik Control', 'Monitor router health, bandwidth, interfaces, and user sessions from one operational view.'],
  ['Customer Management', 'Subscriber profiles, plans, payment history, usage, and connection state stay searchable.'],
  ['Real-Time Analytics', 'Revenue, plan performance, and daily trends update as operations change.'],
  ['Instant Connect / Disconnect', 'Paid users connect automatically, expired users disconnect automatically.'],
  ['Multi-Router Support', 'Manage multiple sites and routers from a single account.'],
];

const shopProducts = [
  { name: 'Mikrotik hAP ac2', category: 'Routers', price: 'KES 4,500', tag: 'Best Seller' },
  { name: 'Cat6 Outdoor Cable', category: 'Cables', price: 'KES 3,800', tag: 'Popular' },
  { name: 'Ubiquiti airGrid M5 HP', category: 'Antennas', price: 'KES 9,200', tag: 'Long Range' },
  { name: 'TP-Link 24-Port Switch', category: 'Switches', price: 'KES 6,500', tag: 'In Stock' },
];

const steps = [
  ['We Configure Your Router', 'Share MikroTik access. Our engineers configure PPPoE, queues, firewall rules, and API connectivity.'],
  ['Import Your Customers', 'Bring subscriber names, plans, and payment details from spreadsheets or your existing system.'],
  ['Start Collecting Revenue', 'Billing runs on autopilot with payments tracked and analytics visible from day one.'],
];

const testimonials = [
  ['Erick K.', 'CEO, AfriQ Networks', 'Before Bitwave, billing was a nightmare. Now payment comes in and the customer connects.'],
  ['Leigh B.', 'CTO, CRISP Wireless', 'Router monitoring alone is worth it. I can see CPU load and bandwidth from my phone.'],
  ['David M.', 'Founder, Mango Net', 'Setup took less than two hours and we were live the same day.'],
];

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: ReactNode; copy?: string }) {
  return (
    <div className="text-center mb-12">
      <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">{eyebrow}</span>
      <h2 className="text-3xl md:text-4xl font-bold mt-3">{title}</h2>
      {copy && <p className="mt-4 text-foreground-muted max-w-xl mx-auto">{copy}</p>}
    </div>
  );
}

export default function LandingSections() {
  return (
    <>
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <SectionHeading
            eyebrow="The Problem"
            title={<>Manual billing is <span className="gradient-text">killing your margins</span></>}
          />
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {pains.map((pain) => (
              <div key={pain} className="flex items-start gap-3 card p-4">
                <svg className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                <p className="text-sm text-foreground-muted leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-lg text-foreground font-medium">Bitwave automates all of this and more.</p>
        </div>
      </section>

      <section id="platform" className="py-20 md:py-28 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="The Platform"
            title={<>Everything you need, <span className="gradient-text">one dashboard</span></>}
            copy="Real-time revenue, router health, bandwidth monitoring, and customer management in a single pane of glass."
          />
          <div className="relative w-full max-w-5xl mx-auto rounded-xl border border-border overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-background-secondary border-b border-border">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-background-tertiary rounded-md px-3 py-1 max-w-sm mx-auto text-xs text-foreground-muted truncate">
                  isp.bitwavetechnologies.com
                </div>
              </div>
            </div>
            <Image
              src={DASHBOARD_SCREENSHOT}
              alt="Bitwave ISP Billing Dashboard"
              width={1920}
              height={891}
              className="w-full h-auto block"
              sizes="(min-width: 1024px) 960px, 100vw"
            />
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Features"
            title={<>Built for the way <span className="gradient-text">ISPs actually work</span></>}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(([title, desc]) => (
              <div key={title} className="card p-6 h-full">
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="shop" className="py-20 md:py-28 px-4 bg-gradient-to-br from-background via-background to-amber-500/5">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Equipment Shop"
            title={<>Everything your ISP needs, <span className="gradient-text">in one place</span></>}
            copy="Shop genuine MikroTik routers, Ubiquiti antennas, Cat6 cables, and ISP accessories."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {shopProducts.map((product) => (
              <div key={product.name} className="card group hover:border-amber-500/30 transition-all">
                <div className="aspect-square bg-background-secondary rounded-t-xl flex items-center justify-center">
                  <svg className="w-12 h-12 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-foreground-muted border border-border rounded-full px-2 py-0.5">{product.category}</span>
                    <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5">{product.tag}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug">{product.name}</h3>
                  <p className="text-base font-bold gradient-text mt-2">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/store" className="inline-flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-8 py-4 rounded-xl hover:shadow-xl hover:shadow-amber-500/30 transition-all">
              Browse the Full Shop
            </Link>
          </div>
        </div>
      </section>

      <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
        <Image src={TOWER_PHOTO} alt="Earth at night showing global network connectivity" fill className="object-cover" sizes="100vw" quality={70} />
        <div className="absolute inset-0 bg-[#09090b]/50" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            Built for ISPs who want to<br /><span className="gradient-text">scale without limits</span>
          </h2>
          <p className="mt-4 text-white/50 text-lg">From 50 subscribers to 50,000, the platform grows with you.</p>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="How It Works"
            title={<>Go live in <span className="gradient-text">under 2 hours</span></>}
            copy="No complex setup. No IT team required. We handle the technical work."
          />
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(([title, desc], index) => (
              <div key={title} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-background font-bold shadow-lg shadow-amber-500/20">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold mt-6 mb-2">{title}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingCalculator />

      <section id="testimonials" className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="Testimonials"
            title={<>ISPs that <span className="gradient-text">transformed</span> their business</>}
          />
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(([name, role, quote]) => (
              <div key={name} className="card-glass p-6 h-full flex flex-col">
                <div className="flex gap-1 mb-4 text-accent-primary">★★★★★</div>
                <p className="text-sm text-foreground-muted leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-xs text-foreground-muted">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="Get Started"
            title={<>Ready to automate <span className="gradient-text">your ISP</span>?</>}
            copy="Get in touch and we'll have you up and running in under 2 hours."
          />
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <a href={`tel:${PHONE_NUMBER}`} className="group card p-6 flex items-center gap-4 hover:border-amber-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">Call or text us</p>
                <p className="text-lg font-semibold text-foreground">{PHONE_DISPLAY}</p>
              </div>
            </a>
            <a href={`https://wa.me/${PHONE_NUMBER.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="group card p-6 flex items-center gap-4 hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
              </div>
              <div>
                <p className="text-sm text-foreground-muted">WhatsApp us</p>
                <p className="text-lg font-semibold text-foreground">{PHONE_DISPLAY}</p>
              </div>
            </a>
          </div>
          <div className="card-glass rounded-2xl p-6 md:p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
            <p className="text-sm text-foreground-muted mb-6">Create your account in minutes and start managing your ISP today.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold px-8 py-3 text-sm rounded-xl w-full sm:w-auto">
                Sign Up Free
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium border border-border hover:border-foreground-muted rounded-xl w-full sm:w-auto">
                Log In
              </Link>
            </div>
            <div className="mt-4">
              <DemoButton className="text-sm text-foreground-muted hover:text-accent-primary transition-colors">
                or explore the live demo first
              </DemoButton>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background-secondary/50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
              </div>
              <span className="text-lg font-bold gradient-text">Bitwave</span>
            </div>
            <p className="text-sm text-foreground-muted">&copy; 2026 Bitwave Technologies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
