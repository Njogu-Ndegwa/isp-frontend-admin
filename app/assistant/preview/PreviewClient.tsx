'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Briefing, TranscriptItem } from '../../lib/assistant';
import Composer from '../Composer';
import Home from '../Home';
import { BitwaveMark, MoonIcon, SunIcon } from '../icons';
import Transcript from '../Transcript';
import { Led } from '../ui';

/* Made-up figures only: nothing here is a real reseller, customer or router. */

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString().replace('Z', '');
const H = 3_600_000;
const D = 24 * H;

function briefing(): Briefing {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * D);
    const base = 5200 + Math.round(Math.sin(i / 2) * 1400) + i * 160;
    return { day: d.toISOString().slice(0, 10), revenue: i === 13 ? 3120 : base, payments: Math.round(base / 45), partial: i === 13 };
  });
  return {
    as_of: iso(0),
    audience: 'reseller',
    name: 'Sample Networks',
    currency: 'KES',
    money: { today: 3120, yesterday: 7480, last7: 49_870, prev7: 43_210, month: 168_400, payments_today: 71, daily: days },
    customers: {
      total: 612, active: 438, expiring_today: 14, expiring_3d: 52, expired_7d: 23, new_7d: 31,
      expiring: [
        { id: 1, name: 'Grace Wanjiku', phone: '0712 000 001', expiry: iso(2 * H), plan: '1 day · 50' },
        { id: 2, name: 'Brian Otieno', phone: '0712 000 002', expiry: iso(9 * H), plan: 'Weekly 300' },
        { id: 3, name: null, phone: '0712 000 003', expiry: iso(30 * H), plan: 'Monthly PPPoE 10M' },
        { id: 4, name: 'Faith Achieng', phone: '0712 000 004', expiry: iso(55 * H), plan: 'Weekly 300' },
      ],
    },
    routers: {
      total: 4, online: 3, offline: 1, unknown: 0,
      down: [{ id: 14, name: 'Kahawa West AP', last_online_at: iso(-3 * H) }],
      list: [
        { id: 14, name: 'Kahawa West AP', status: 'offline', last_online_at: iso(-3 * H), active_customers: 37, identity: 'KW-AP' },
        { id: 11, name: 'Main Tower', status: 'online', active_customers: 212, live: { cpu: 34, memory_pct: 48, uptime: '2w3d04:12:10', version: '7.14.3', board: 'RB4011', down_bps: 182_400_000, up_bps: 24_900_000, hotspot_online: 164, pppoe_online: 38 } },
        { id: 12, name: 'Zimmerman Block C', status: 'online', active_customers: 121, live: { cpu: 88, memory_pct: 71, uptime: '3d11:02:44', version: '7.12', board: 'hAP ac²', down_bps: 61_200_000, up_bps: 8_400_000, hotspot_online: 92, pppoe_online: 0 } },
        { id: 13, name: 'Githurai Shops', status: 'online', active_customers: 68, reachable_pct: 99.2, identity: 'GT-SHOPS' },
      ],
    },
    plans: [
      { name: 'Weekly 300', revenue: 21_600, sales: 72 },
      { name: '1 day · 50', revenue: 12_850, sales: 257 },
      { name: 'Monthly PPPoE 10M', revenue: 9_000, sales: 6 },
      { name: '3 hours · 20', revenue: 4_420, sales: 221 },
    ],
    attention: { failed_payments_24h: 2, unmatched_payments: 1, sms_credits: 34, subscription: { status: 'active', amount_due: 0 } },
    setup: { routers: 4, plans: 6, payment_methods: 1, customers: 612 },
    unavailable: [],
  };
}

function transcript(): TranscriptItem[] {
  const customers = [
    { id: 1, name: 'Grace Wanjiku', phone: '0712 000 001', status: 'active', expiry: iso(2 * H), plan: { name: '1 day · 50' }, router: { name: 'Main Tower' } },
    { id: 2, name: 'Brian Otieno', phone: '0712 000 002', status: 'active', expiry: iso(4 * D), plan: { name: 'Weekly 300' }, router: { name: 'Zimmerman Block C' } },
    { id: 5, name: 'Kevin Mutua', phone: '0712 000 005', status: 'expired', expiry: iso(-2 * D), plan: { name: 'Weekly 300' }, router: { name: 'Main Tower' } },
    { id: 6, name: 'Mercy Njeri', phone: '0712 000 006', status: 'active', expiry: iso(19 * D), plan: { name: 'Monthly PPPoE 10M' }, router: { name: 'Main Tower' }, pppoe_username: 'mercy' },
  ];
  return [
    { type: 'user', text: 'How did this week go, and is anything broken?' },
    { type: 'step', call_id: 's1', label: 'Read revenue for the last 14 days', done: true, ok: true },
    { type: 'step', call_id: 's2', label: 'Checked every router', done: true, ok: true },
    { type: 'step', call_id: 's3', label: 'Looked up customers on Kahawa West AP', done: true, ok: true },
    {
      type: 'assistant',
      text: 'A good week: **KES 49,870** came in over the last 7 days, **15% up** on the week before. One thing needs you: **Kahawa West AP** has been down for about 3 hours and **37 paying customers** on it are cut off.\n\n- Zimmerman Block C is busy: CPU at 88%.\n- 14 customers run out today.\n\nNEXT: Why is Kahawa West AP offline? | Remind the 14 who expire today | Which plan made the most this week?',
    },
    { type: 'data', call_id: 'd1', title: 'This week', method: 'GET', path: '/api/x', show: 'tiles', payload: { revenue: 49870, payments: 1104, new_customers: 31, avg_payment: 45.2 } },
    { type: 'data', call_id: 'd2', title: 'Revenue per day', method: 'GET', path: '/api/x', show: 'trend', payload: { days: briefing().money!.daily.map((d) => ({ date: d.day, revenue: d.revenue, partial: d.partial })) } },
    { type: 'data', call_id: 'd3', title: 'Revenue by plan', method: 'GET', path: '/api/x', show: 'bars', payload: { plans: [{ plan_name: 'Weekly 300', revenue: 21600, sales: 72 }, { plan_name: '1 day · 50', revenue: 12850, sales: 257 }, { plan_name: 'Monthly PPPoE 10M', revenue: 9000, sales: 6 }, { plan_name: '3 hours · 20', revenue: 4420, sales: 221 }] } },
    { type: 'data', call_id: 'd4', title: 'Payments by method', method: 'GET', path: '/api/x', show: 'share', payload: { methods: [{ method: 'M-Pesa till', amount: 38100 }, { method: 'Paybill', amount: 9200 }, { method: 'Voucher', amount: 2570 }] } },
    { type: 'data', call_id: 'd5', title: 'Your routers', method: 'GET', path: '/api/x', show: 'auto', payload: [
      { id: 14, name: 'Kahawa West AP', identity: 'KW-AP', ip_address: '10.0.0.14', status: 'offline', last_online_at: iso(-3 * H), availability_checks: 1000, availability_successes: 861 },
      { id: 11, name: 'Main Tower', identity: 'MAIN-TOWER', ip_address: '10.0.0.11', status: 'online', availability_checks: 1000, availability_successes: 998 },
    ] },
    { type: 'data', call_id: 'd6', title: 'Customers on Main Tower', method: 'GET', path: '/api/x', show: 'auto', payload: { customers, total: 212 } },
    { type: 'data', call_id: 'd7', title: 'Grace Wanjiku', method: 'GET', path: '/api/x', show: 'auto', payload: customers[0] },
    { type: 'data', call_id: 'd8', title: 'Payments today', method: 'GET', path: '/api/x', show: 'auto', payload: { transactions: [
      { id: 1, amount: 300, phone_number: '0712 000 002', customer_name: 'Brian Otieno', plan_name: 'Weekly 300', status: 'completed', mpesa_receipt_number: 'SKD1X2Y3Z4', transaction_date: iso(-1 * H) },
      { id: 2, amount: 50, phone_number: '0712 000 009', status: 'failed', result_desc: 'The customer cancelled the request', transaction_date: iso(-2 * H) },
      { id: 3, amount: 1500, phone_number: '0712 000 006', customer_name: 'Mercy Njeri', plan_name: 'Monthly PPPoE 10M', status: 'completed', mpesa_receipt_number: 'SKD9A8B7C6', transaction_date: iso(-5 * H) },
    ], total: 71 } },
    { type: 'data', call_id: 'd9', title: 'Plans', method: 'GET', path: '/api/x', show: 'auto', payload: [
      { id: 1, name: 'Weekly 300', price: 300, duration_value: 7, duration_unit: 'days', speed: '5M/5M', connection_type: 'hotspot', badge_text: 'Popular' },
      { id: 2, name: 'Monthly PPPoE 10M', price: 1500, duration_value: 30, duration_unit: 'days', speed: '10M/10M', connection_type: 'pppoe' },
      { id: 3, name: '3 hours · 20', price: 20, duration_value: 3, duration_unit: 'hours', speed: '3M/3M', connection_type: 'hotspot' },
    ] },
    { type: 'data', call_id: 'd10', title: '6 one-day vouchers', method: 'GET', path: '/api/x', show: 'auto', payload: ['K7Q2M9', 'P3X8B1', 'H6N4T2', 'W9C5R7', 'D2L8F3', 'Z4V1J6'].map((code, i) => ({ code, batch_id: 9, status: i === 5 ? 'used' : 'active', redeemed_at: i === 5 ? iso(-H) : null, plan: { name: '1 day · 50', duration: '1 Day', price: 50 } })) },
    { type: 'data', call_id: 'd11', title: 'Failed payments', method: 'GET', path: '/api/x', show: 'table', payload: { rows: [{ date: iso(-2 * H), phone: '0712 000 009', amount: 50, reason: 'Cancelled by customer' }, { date: iso(-7 * H), phone: '0712 000 010', amount: 300, reason: 'Insufficient funds' }] } },
    { type: 'action', action_id: 'a1', title: 'send_sms', summary: 'Send an expiry reminder SMS to 14 customers who run out today', method: 'POST', path: '/api/sms/bulk', body: { recipients: 14, template: 'expiry_reminder' }, status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString() },
  ];
}

/** Drawn in the browser only: it reads the address (?view, ?theme) as it starts. */
export default function PreviewClient() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return mounted ? <Preview /> : null;
}

function Preview() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark'));
  const [view, setView] = useState<'home' | 'chat'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === 'chat' ? 'chat' : 'home'));
  const [b] = useState(briefing);
  const [items] = useState(transcript);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const noop = () => {};

  return (
    <div className="ai-root fixed inset-0 z-[60] flex flex-col overflow-hidden">
      <header className="z-30 shrink-0 border-b border-line bg-[color:var(--ai-bg)]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-3 sm:px-6">
          <BitwaveMark />
          <span className="ai-display text-[16.5px] font-semibold text-ink-1 max-[380px]:hidden">Bitwave</span>
          <span className="ai-mono rounded-[6px] border border-accent/35 bg-accent-soft px-1.5 py-[1px] text-[11px] font-medium tracking-[0.12em] text-accent">AI</span>
          <span className="ai-mono ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] text-ink-2 max-sm:hidden"><Led tone="live" pulse size={6} />Preview</span>
          <span className="ml-auto sm:hidden" />
          <div className="flex rounded-full border border-line p-0.5 text-[12px]">
            {(['home', 'chat'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`ai-tap rounded-full px-3 py-1 ${view === v ? 'bg-surface-3 text-ink-1' : 'text-ink-3'}`}>{v}</button>
            ))}
          </div>
          <button type="button" className="ai-btn ai-btn-quiet" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Theme">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'home' ? (
          <Home userKey="preview" name={null} organization="Sample Networks" admin={false} readOnly={false} enabled onAsk={() => setView('chat')} preview={{ briefing: b }} />
        ) : (
          <div className="mx-auto flex w-full max-w-[880px] flex-col px-4 sm:px-6">
            <Transcript items={items} currency="KES" onAsk={noop} onDecide={noop} />
          </div>
        )}
      </div>
      <Composer busy={false} placeholder="Ask, or tell me what to do…" onSend={noop} />
    </div>
  );
}
