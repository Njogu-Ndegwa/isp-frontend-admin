'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatKES } from '../lib/format';

function Reveal({ children, className = '' }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}

const MIN_SUBSCRIPTION = 500;
const HOTSPOT_RATE = 0.03;
const PPPOE_RATE = 25;

type ServiceType = 'hotspot' | 'pppoe' | 'both';

export default function PricingCalculator() {
  const [serviceType, setServiceType] = useState<ServiceType>('pppoe');
  const [hotspotRevenue, setHotspotRevenue] = useState(50000);
  const [pppoeUsers, setPppoeUsers] = useState(30);

  const hotspotCost = serviceType !== 'pppoe' ? Math.round(hotspotRevenue * HOTSPOT_RATE) : 0;
  const pppoeCost = serviceType !== 'hotspot' ? pppoeUsers * PPPOE_RATE : 0;
  const rawTotal = hotspotCost + pppoeCost;
  const total = Math.max(rawTotal, MIN_SUBSCRIPTION);
  const minimumApplied = rawTotal < MIN_SUBSCRIPTION;

  const tabs: { key: ServiceType; label: string; desc: string }[] = [
    { key: 'hotspot', label: 'Hotspot', desc: '3% of revenue' },
    { key: 'pppoe', label: 'PPPoE', desc: 'KES 25/user' },
    { key: 'both', label: 'Both', desc: 'Combined' },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 px-4">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Pricing</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3">
              Simple, <span className="gradient-text">transparent pricing</span>
            </h2>
            <p className="mt-4 text-foreground-muted max-w-xl mx-auto">
              Pay based on what you use. No setup fees, no hidden costs. Use the calculator to estimate your monthly bill.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="card p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>
              </div>
              <p className="text-2xl font-bold gradient-text">3%</p>
              <p className="text-sm text-foreground-muted mt-1">of monthly revenue</p>
              <p className="text-xs text-foreground-muted mt-0.5">Hotspot</p>
            </div>
            <div className="card p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <p className="text-2xl font-bold gradient-text">KES 25</p>
              <p className="text-sm text-foreground-muted mt-1">per user / month</p>
              <p className="text-xs text-foreground-muted mt-0.5">PPPoE</p>
            </div>
            <div className="card p-5 text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              </div>
              <p className="text-2xl font-bold gradient-text">KES 500</p>
              <p className="text-sm text-foreground-muted mt-1">minimum / month</p>
              <p className="text-xs text-foreground-muted mt-0.5">Guaranteed floor</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="card-glass rounded-2xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-border">
              <h3 className="text-lg font-semibold mb-1">Cost Calculator</h3>
              <p className="text-sm text-foreground-muted">Select your service type and adjust the values to see your estimated monthly cost.</p>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex rounded-xl bg-background-tertiary p-1 mb-8">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setServiceType(t.key)}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      serviceType === t.key
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] shadow-md'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span className="block">{t.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${serviceType === t.key ? 'text-[#09090b]/70' : 'text-foreground-muted'}`}>{t.desc}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-8">
                {serviceType !== 'pppoe' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Monthly Hotspot Revenue</label>
                      <span className="text-sm font-semibold text-accent-primary">{formatKES(hotspotRevenue)}</span>
                    </div>
                    <input
                      type="range"
                      min={5000}
                      max={500000}
                      step={5000}
                      value={hotspotRevenue}
                      onChange={e => setHotspotRevenue(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-background-tertiary accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1.5">
                      <span>KES 5,000</span>
                      <span>KES 500,000</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Or enter directly:</span>
                      <input
                        type="number"
                        min={0}
                        value={hotspotRevenue}
                        onChange={e => setHotspotRevenue(Math.max(0, Number(e.target.value)))}
                        className="w-32 px-3 py-1.5 text-sm rounded-lg border border-border bg-background-secondary focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {serviceType !== 'hotspot' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Number of PPPoE Users</label>
                      <span className="text-sm font-semibold text-accent-primary">{pppoeUsers.toLocaleString()} users</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={1000}
                      step={1}
                      value={pppoeUsers}
                      onChange={e => setPppoeUsers(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-background-tertiary accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-foreground-muted mt-1.5">
                      <span>1 user</span>
                      <span>1,000 users</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-foreground-muted">Or enter directly:</span>
                      <input
                        type="number"
                        min={1}
                        value={pppoeUsers}
                        onChange={e => setPppoeUsers(Math.max(1, Number(e.target.value)))}
                        className="w-32 px-3 py-1.5 text-sm rounded-lg border border-border bg-background-secondary focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-background-secondary/50 p-6 md:p-8 border-t border-border">
              <div className="space-y-3">
                {serviceType !== 'pppoe' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">Hotspot fee ({formatKES(hotspotRevenue)} &times; 3%)</span>
                    <span className="font-medium">{formatKES(hotspotCost)}</span>
                  </div>
                )}
                {serviceType !== 'hotspot' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">PPPoE fee ({pppoeUsers} users &times; KES 25)</span>
                    <span className="font-medium">{formatKES(pppoeCost)}</span>
                  </div>
                )}

                {minimumApplied && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      Minimum subscription applied
                    </span>
                    <span className="font-medium text-amber-500">{formatKES(MIN_SUBSCRIPTION)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="font-semibold">Estimated Monthly Cost</span>
                  <span className="text-2xl md:text-3xl font-bold gradient-text">{formatKES(total)}</span>
                </div>

                {serviceType !== 'pppoe' && hotspotRevenue > 0 && (
                  <p className="text-xs text-foreground-muted text-right">
                    That&apos;s just {((total / hotspotRevenue) * 100).toFixed(1)}% of your hotspot revenue
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-center text-sm text-foreground-muted mt-6">
            No setup fees &middot; No contracts &middot; Cancel anytime
          </p>
        </Reveal>
      </div>
    </section>
  );
}
