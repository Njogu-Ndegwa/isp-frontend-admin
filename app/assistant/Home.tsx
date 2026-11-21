'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { assistantApi, type Briefing, type NetworkRouter } from '../lib/assistant';
import { bpsText, span, uptimeText } from '../lib/assistantEntities';
import type { Tone } from '../lib/assistantVisual';
import { copyText } from '../lib/clipboard';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';
import type { AdminDashboard } from '../lib/types';
import { DeviceCard, type Device } from './blocks/DeviceCard';
import { Delta } from './charts/Mini';
import { RankedBars } from './charts/RankedBars';
import { SegmentsBar } from './charts/SegmentsBar';
import { toneColor } from './charts/shared';
import { ArrowRightIcon, CameraIcon, CheckIcon, CopyIcon } from './icons';
import { AreaSpark, CountUp, Led, Meter, Panel, Pill, Readout, ReadoutGrid, useInView } from './ui';

/*
 * The home screen, drawn like a network console: a sentence that says how things
 * stand, one band of vital signs, the money trend beside what needs attention, every
 * MikroTik as a device with its gauges, then customers and plans. Every figure, row
 * and bar is a question: a tap asks it, and the conversation carries on from there.
 *
 * It adapts to the account: a new account sees the steps to get its first router
 * online, a reseller sees money, customers, routers and what needs them, and the
 * platform owner sees the whole platform.
 */

export type Ask = (question: string) => void;

const n = (v: number) => v.toLocaleString('en-US');
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
const asUtc = (iso: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) || iso.length <= 10 ? iso : `${iso}Z`);
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Nairobi' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' });

/* ---------------- pieces ---------------- */

/** A text link that asks something: "All routers →". */
function More({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ai-tap group inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-ink-2 hover:text-accent">
      {label}<ArrowRightIcon width={12} height={12} className="transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
    </button>
  );
}

/** A row that is a question: the arrow shows on hover, a tap asks it. */
function AskRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="ai-tap group flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2">
      {children}
      <ArrowRightIcon width={12} height={12} className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-active:translate-x-0.5 group-hover:text-accent group-active:text-accent group-hover:opacity-100 group-active:opacity-100 [@media(pointer:coarse)]:opacity-60" />
    </button>
  );
}

/** Rows in an inset well, divided by hairlines. */
const Rows = ({ children }: { children: React.ReactNode }) => (
  <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">{children}</ul>
);

const Big = ({ value, format, label }: { value: number; format: (v: number) => string; label?: React.ReactNode }) => (
  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
    <span className="ai-mono text-[30px] font-medium leading-none tracking-tight text-ink-1">{format(value)}</span>
    {label ? <span className="text-[13px] text-ink-3">{label}</span> : null}
  </div>
);

type Item = { tone: Tone; text: string; ask: string };

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your figures" className="flex flex-col gap-3">
      <div className="ai-shimmer h-[132px] rounded-[18px]" />
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="ai-shimmer h-[300px] rounded-[18px] lg:col-span-7" />
        <div className="ai-shimmer h-[300px] rounded-[18px] lg:col-span-5" />
      </div>
    </div>
  );
}

function Starters({ groups, onAsk }: { groups: { title: string; questions: string[] }[]; onAsk: Ask }) {
  const t = useT();
  const [tab, setTab] = useState(0);
  const chip = (question: string) => (
    <button key={question} type="button" className="ai-chip group !rounded-[12px] !py-2 text-[13px] max-sm:w-full max-sm:justify-between max-sm:!py-2.5" onClick={() => onAsk(question)}>
      <span className="min-w-0">{question}</span>
      <ArrowRightIcon width={12} height={12} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5 group-hover:text-accent group-active:text-accent" />
    </button>
  );
  const current = groups[Math.min(tab, groups.length - 1)];
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="ai-eyebrow shrink-0">{t('Or start with one of these')}</h2>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      {/* a phone: one group at a time, chosen with tabs */}
      <div className="sm:hidden">
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
          {groups.map((g, i) => (
            <button key={g.title} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
              className={`ai-tap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${i === tab ? 'bg-surface-3 text-ink-1' : 'text-ink-3'}`}>{g.title}</button>
          ))}
        </div>
        {current ? <div key={current.title} className="ai-rise flex flex-col gap-1.5">{current.questions.map(chip)}</div> : null}
      </div>
      <div className="hidden gap-x-8 gap-y-6 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group) => (
          <div key={group.title} className="min-w-0">
            <h3 className="mb-2.5 text-[13px] font-semibold text-ink-1">{group.title}</h3>
            <div className="flex flex-col items-start gap-1.5">{group.questions.map(chip)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- a new account: get the first router online ---------------- */

function SetupCard({ setup, onAsk }: { setup: NonNullable<Briefing['setup']>; onAsk: Ask }) {
  const t = useT();
  const all = [
    { seen: setup.routers, done: (setup.routers ?? 0) > 0, title: t('Connect your MikroTik router'), hint: t('I give you one command to paste into the router. It does the rest.'), ask: 'Help me add my router' },
    { seen: setup.plans, done: (setup.plans ?? 0) > 0, title: t('Create your first internet plan'), hint: t('For example 1 hour for KES 10, or a monthly PPPoE package.'), ask: 'Help me create my first plan' },
    { seen: setup.payment_methods, done: (setup.payment_methods ?? 0) > 0, title: t('Choose how you get paid'), hint: t('M-Pesa till, paybill or bank: where customers send the money.'), ask: 'Help me set up how I get paid' },
    { seen: setup.customers, done: (setup.customers ?? 0) > 0, title: t('Connect your first customer'), hint: t('Test with your own phone, then you are open for business.'), ask: 'How do I connect my first customer?' },
  ];
  // a step this person may not see (a cashier and payment methods) is left out
  const steps = all.filter((s) => s.seen !== null && s.seen !== undefined);
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section className="ai-card overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-[280px]">
            <p className="ai-eyebrow">{t('Setup')} · {done}/{steps.length}</p>
            <h2 className="ai-display mt-1.5 text-[19px] font-semibold text-ink-1">{t('Get your network online')}</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">{t('{done} of {total} steps done. We do each one together, right here in the chat.', { done, total: steps.length })}</p>
          </div>
          {next ? (
            <button type="button" className="ai-btn ai-btn-primary min-h-[44px] px-5 text-[14px]" onClick={() => onAsk(next.ask)}>
              {done === 0 ? t('Start setup') : t('Continue setup')} <ArrowRightIcon width={15} height={15} />
            </button>
          ) : null}
        </div>
        {/* progress as segments, one per step */}
        <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }} aria-hidden>
          {steps.map((s) => <span key={s.title} className="h-1 rounded-full" style={{ background: s.done ? 'var(--ai-accent-fill)' : 'var(--ai-track)' }} />)}
        </div>
        <ol className="m-0 mt-4 grid list-none gap-2 p-0 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => onAsk(s.ask)}
                className={`flex h-full w-full items-start gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-2 ${s === next ? 'border-accent/50 bg-accent-soft' : 'border-line'}`}>
                <span className={`ai-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] ${s.done ? 'bg-good text-white' : 'border border-line-strong text-ink-2'}`}>
                  {s.done ? <CheckIcon width={13} height={13} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14.5px] font-semibold ${s.done ? 'text-ink-3 line-through decoration-1' : 'text-ink-1'}`}>{s.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{s.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-ink-3">
          <CameraIcon width={15} height={15} className="mt-0.5 shrink-0 text-accent" />
          {t('Stuck? Send a photo of the router, its label or the error on your screen, and I will tell you what to do next.')}
        </p>
      </div>
    </section>
  );
}

/* ---------------- a reseller's console ---------------- */

type Ctx = { b: Briefing; money: (v: number) => string; onAsk: Ask };

const reporting = (list: NetworkRouter[]) => list.filter((x) => x.status === 'online' && x.live);
const peopleOnline = (list: NetworkRouter[]) => reporting(list).reduce((a, x) => a + (x.live?.hotspot_online ?? 0) + (x.live?.pppoe_online ?? 0), 0);

/**
 * Today's paying customers as one bar: green for those paid beyond today, amber for
 * those whose time ends today, with the two counts in words under it.
 */
function PaidSplit({ active, endsToday }: { active: number; endsToday: number }) {
  const t = useT();
  const ends = Math.min(active, Math.max(0, endsToday));
  const more = Math.max(0, active - ends);
  const [box, seen] = useInView<HTMLDivElement>({ threshold: 0.6 });
  if (active <= 0) return <p className="mt-1.5 text-[12px] leading-snug text-ink-3">{t('Nobody has paid time right now')}</p>;
  return (
    <div>
      <div ref={box} className="flex h-[30px] items-end pb-1">
        <div className="flex h-2 w-full gap-[3px]" role="img" aria-label={`${more} with more time, ${ends} ending today`}>
          {[{ v: more, c: 'var(--ai-good)' }, { v: ends, c: 'var(--ai-warn)' }].filter((p) => p.v > 0).map((p, i) => (
            <span key={i} className="block h-full min-w-[4px] rounded-full"
              style={{ flexGrow: seen ? p.v : 0.0001, flexBasis: 0, background: p.c, boxShadow: `0 0 8px -2px ${p.c}`, transition: `flex-grow 900ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 120}ms` }} />
          ))}
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-3">
        {ends > 0 ? <><span className="text-[var(--ai-text-warn)]">{n(ends)} end today</span> · {n(more)} {t('have more time')}</> : t('all paid beyond today')}
      </p>
    </div>
  );
}

/**
 * The vital signs, in one band: money today, people online with the traffic they
 * pull, paying customers, routers up. The one place figures are shouted; each cell
 * carries a small picture of the same thing and is a question.
 */
function Vitals({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const list = b.routers?.list ?? [];
  const live = reporting(list);
  const people = peopleOnline(list);
  const downBps = live.reduce((a, x) => a + (x.live?.down_bps ?? 0), 0);
  const upBps = live.reduce((a, x) => a + (x.live?.up_bps ?? 0), 0);

  type Cell = { key: string; label: string; value: number; format: (v: number) => string; ask: string; accent?: boolean; live?: boolean; picture: React.ReactNode };
  const cells: Cell[] = [];
  if (b.money) cells.push({
    key: 'money', label: t('Money today'), value: b.money.today, format: money, ask: "Show today's payments", accent: true,
    picture: (
      <div>
        <AreaSpark points={b.money.daily.map((d) => ({ label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)), value: d.revenue, partial: d.partial }))} height={30} format={money} empty=" " />
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-3">{n(b.money.payments_today)} {plural(b.money.payments_today, 'payment', 'payments')} {t('so far')}</p>
      </div>
    ),
  });
  if (live.length) cells.push({
    key: 'online', label: t('Online now'), value: people, format: n, ask: 'Who is online right now?', live: true,
    picture: (
      <div>
        <div className="flex h-[30px] items-end"><span className="ai-mono flex flex-wrap gap-x-2.5 text-[11.5px] leading-tight sm:text-[12.5px]"><span className="whitespace-nowrap"><span className="text-[var(--ai-down)]">↓</span> {bpsText(downBps) ?? '0 bps'}</span><span className="whitespace-nowrap"><span className="text-[var(--ai-up)]">↑</span> {bpsText(upBps) ?? '0 bps'}</span></span></div>
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-ink-3">{t('people on your network')}</p>
      </div>
    ),
  });
  if (b.customers) cells.push({
    key: 'customers', label: t('Paying'), value: b.customers.active, format: n, ask: 'List my active customers',
    picture: (
      <div>
        <PaidSplit active={b.customers.active} endsToday={b.customers.expiring_today} />
      </div>
    ),
  });
  if (b.routers && b.routers.total > 0) cells.push({
    key: 'routers', label: t('Routers up'), value: b.routers.online, format: (v) => `${n(v)}/${n(b.routers!.total)}`, ask: 'Show my routers and their status',
    picture: (
      <div>
        {/* one cell per router: the network at a glance */}
        <div className="flex h-[30px] flex-wrap content-end items-end gap-1" aria-hidden>
          {(list.length ? list : []).slice(0, 16).map((x) => (
            <span key={x.id} title={x.name} className="h-3.5 w-2.5 rounded-[3px]"
              style={{ background: toneColor(x.status === 'online' ? 'good' : x.status === 'offline' ? 'bad' : 'muted'), boxShadow: x.status === 'offline' ? `0 0 8px ${toneColor('bad')}` : undefined }} />
          ))}
        </div>
        <p className="mt-1.5 truncate text-[12px] text-ink-3">{b.routers.offline > 0 ? <b className="font-semibold text-[var(--ai-text-bad)]">{n(b.routers.offline)} {t('down')}</b> : b.routers.unknown ? `${n(b.routers.unknown)} ${t('not checked yet')}` : t('all reachable')}</p>
      </div>
    ),
  });
  if (cells.length < 2) return null;
  // three tiles: the third spans the row on two columns instead of sitting alone at half width
  const cols = cells.length >= 4 ? 'lg:grid-cols-4'
    : cells.length === 3 ? 'lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1' : '';
  return (
    <section aria-label={t('Right now')} className="ai-card overflow-hidden">
      <div className={`grid grid-cols-2 ${cols}`}>
        {cells.map((c, i) => (
          <button key={c.key} type="button" onClick={() => onAsk(c.ask)}
            className={`group relative min-w-0 px-4 py-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2/60 sm:px-5 sm:py-5
              ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l lg:border-line' : ''}
              ${cells.length === 3 && i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}>
            {c.accent ? <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 0% 0%, var(--ai-accent-soft), transparent 60%)' }} /> : null}
            <span className="relative flex items-center gap-2">
              {c.live ? <Led tone="live" size={6} /> : null}
              <span className="ai-eyebrow">{c.label}</span>
            </span>
            <CountUp value={c.value} format={c.format}
              className={`ai-mono relative mt-2.5 block truncate font-medium leading-none tracking-tight ${c.format(c.value).length > 10 ? 'text-[17px] min-[380px]:text-[19px] sm:text-[28px]' : c.format(c.value).length > 6 ? 'text-[19px] min-[380px]:text-[23px] sm:text-[34px]' : 'text-[30px] sm:text-[36px]'} ${c.accent ? 'text-accent' : 'text-ink-1'}`} />
            <div className="relative mt-3">{c.picture}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RevenuePanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const m = b.money;
  if (!m) return null;
  return (
    <Panel eyebrow={t('Revenue · last 14 days')} title={t('Is money growing?')} actions={<More label={t('Payments')} onClick={() => onAsk("Show today's payments")} />}>
      <Big value={m.last7} format={money} label={t('in the last 7 days')} />
      <div className="mt-2"><Delta now={m.last7} before={m.prev7} label={t('the week before')} /></div>
      <div className="mt-4">
        <AreaSpark readout points={m.daily.map((d) => ({ label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)), value: d.revenue, partial: d.partial }))}
          height={112} format={money} empty={t('No payments in the last two weeks.')} />
      </div>
      <ReadoutGrid cols={3}>
        <Readout label={t('Today')} onClick={() => onAsk("Show today's payments")}>{money(m.today)}</Readout>
        <Readout label={t('Yesterday')} onClick={() => onAsk('How much did I make yesterday?')}>{money(m.yesterday)}</Readout>
        <Readout label={t('This month')} onClick={() => onAsk('How much have I made this month, and from which plans?')}>{money(m.month)}</Readout>
      </ReadoutGrid>
    </Panel>
  );
}

function needsItems(b: Briefing, money: (v: number) => string): Item[] {
  const a = b.attention;
  const sub = a?.subscription;
  const items: Item[] = [];
  if (b.routers && b.routers.offline > 0) {
    const only = b.routers.offline === 1 ? b.routers.down[0] : null;
    items.push(only
      ? { tone: 'bad', text: `${only.name} is offline. Find out why`, ask: `Why is router ${only.name} (ID ${only.id}) offline, and how do I fix it?` }
      : { tone: 'bad', text: `${n(b.routers.offline)} routers are offline`, ask: 'Which routers are offline right now, and since when?' });
  }
  for (const x of b.routers?.list ?? []) {
    if (x.status === 'online' && typeof x.live?.cpu === 'number' && x.live.cpu >= 85) {
      items.push({ tone: 'warn', text: `${x.name} is working hard: CPU at ${Math.round(x.live.cpu)}%`, ask: `Why is the CPU of router ${x.name} (ID ${x.id}) high, and what should I do?` });
    }
  }
  if (sub && /suspend|inactive|expired/i.test(sub.status)) items.push({ tone: 'bad', text: `Your Bitwave subscription is ${sub.status}`, ask: 'What do I owe on my Bitwave subscription?' });
  else if (sub?.amount_due && sub.amount_due > 0) items.push({ tone: 'warn', text: `Bitwave subscription: ${money(sub.amount_due)} is due`, ask: 'What do I owe on my Bitwave subscription?' });
  if (a?.failed_payments_24h) items.push({ tone: 'bad', text: `${n(a.failed_payments_24h)} ${plural(a.failed_payments_24h, 'payment', 'payments')} failed in the last 24 hours`, ask: 'Show the payments that failed in the last 24 hours' });
  if (b.customers && b.customers.expiring_today > 0) {
    const k = b.customers.expiring_today;
    items.push({ tone: 'info', text: `${n(k)} ${plural(k, "customer's internet time ends", "customers' internet time ends")} today. Remind them to buy again`,
      ask: 'Send a reminder SMS to the customers whose internet time ends today, asking them to buy again' });
  }
  if (a?.unmatched_payments) items.push({ tone: 'warn', text: `${n(a.unmatched_payments)} ${plural(a.unmatched_payments, 'payment is', 'payments are')} not matched to a customer`, ask: 'Show my unmatched payments' });
  if (typeof a?.sms_credits === 'number' && a.sms_credits < 50) items.push({ tone: 'warn', text: `Only ${n(a.sms_credits)} SMS ${plural(a.sms_credits, 'credit', 'credits')} left`, ask: 'How many SMS credits do I have, and how do I buy more?' });
  if (sub && /trial/i.test(sub.status) && sub.expires_at) items.push({ tone: 'info', text: `Free trial ends ${dateFmt.format(asUtc(sub.expires_at))}`, ask: 'When does my trial end and what happens then?' });
  return items;
}

/** What needs the reseller, as a console of alerts, worst first. */
function AttentionPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const items = needsItems(b, money);
  const worst: Tone | undefined = items.some((i) => i.tone === 'bad') ? 'bad' : items.length ? 'warn' : undefined;
  return (
    <Panel eyebrow={t('Attention')} title={items.length ? <>{n(items.length)} {plural(items.length, t('thing needs you'), t('things need you'))}</> : t('What needs me?')} tone={worst} className="h-full">
      {items.length ? (
        <Rows>
          {[...items].sort((x, y) => (x.tone === 'bad' ? 0 : 1) - (y.tone === 'bad' ? 0 : 1)).map((it) => (
            <li key={it.text}>
              <AskRow onClick={() => onAsk(it.ask)}>
                <Led tone={it.tone} />
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-1">{it.text}</span>
              </AskRow>
            </li>
          ))}
        </Rows>
      ) : (
        <div className="flex flex-col items-start gap-2 py-4">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-good/12 text-[var(--ai-text-good)]"
            style={{ boxShadow: '0 0 24px color-mix(in srgb, var(--ai-good) 25%, transparent)' }}>
            <CheckIcon width={18} height={18} strokeWidth={2.4} />
          </span>
          <p className="ai-display text-[16px] font-semibold text-ink-1">{t('All systems normal.')}</p>
          <p className="text-[13px] text-ink-3">{t('Routers are up, payments are going through and nobody expires today.')}</p>
        </div>
      )}
    </Panel>
  );
}

function NetworkSection({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const r = b.routers;
  if (!r || !r.list || r.list.length === 0) return null;
  const asOf = asUtc(b.as_of).getTime();
  const live = reporting(r.list);
  const people = peopleOnline(r.list);
  // one router takes the whole row; with an odd count the last card spans the row instead of
  // sitting alone at half width (on three columns every card is one column again)
  const cols = r.list.length === 1 ? ''
    : r.list.length === 2 || r.list.length === 4 ? 'md:grid-cols-2'
    : 'md:grid-cols-2 xl:grid-cols-3 md:[&>li:last-child:nth-child(odd)]:col-span-2 xl:[&>li:last-child:nth-child(odd)]:col-span-1';
  return (
    <section aria-label={t('Your network')}>
      <header className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="ai-eyebrow">{t('Network')}</p>
          <h2 className="ai-display mt-1 text-[18px] font-semibold text-ink-1">
            {n(r.online)} {t('of')} {n(r.total)} {plural(r.total, 'MikroTik', 'MikroTiks')} {t('online')}
            {r.offline > 0 ? <span className="text-[var(--ai-text-bad)]"> · {n(r.offline)} {t('down')}</span> : null}
          </h2>
          {live.length ? <p className="text-[13px] text-ink-3">{n(people)} {plural(people, 'person', 'people')} {t('online now')}</p> : null}
        </div>
        <More label={t('All routers')} onClick={() => onAsk('Show my routers and their status')} />
      </header>
      {(() => {
        const items = r.list.map((x) => {
          const lv = x.status === 'online' ? x.live : null;
          const named = `router ${x.name} (ID ${x.id})`;
          const last = x.last_online_at ? asUtc(x.last_online_at).getTime() : null;
          const d: Device = {
            id: x.id, name: x.name, state: x.status,
            model: lv ? [lv.board, lv.version ? `RouterOS ${lv.version}` : null].filter(Boolean).join(' · ') : x.identity,
            downFor: x.status === 'offline' && last ? span(asOf - last) : null,
            cpu: lv?.cpu, memory: lv?.memory_pct, down: bpsText(lv?.down_bps), up: bpsText(lv?.up_bps), uptime: uptimeText(lv?.uptime),
            hotspot: lv ? lv.hotspot_online ?? 0 : null, pppoe: lv ? lv.pppoe_online ?? 0 : null,
            customers: x.active_customers, reach: lv ? null : x.reachable_pct,
          };
          const handlers = {
            onOpen: () => onAsk(x.status === 'offline' ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`),
            onPeople: () => onAsk(`Who is online on ${named} right now?`),
            onCustomers: () => onAsk(`Which customers are on ${named}?`),
          };
          return { key: x.id, d, handlers, down: x.status === 'offline' };
        });
        return (
          // every router keeps its full card with the big dials, on a phone too
          <ul className={`m-0 grid list-none gap-3 p-0 ${cols}`}>
            {items.map((it) => <DeviceCard key={it.key} d={it.d} {...it.handlers} />)}
          </ul>
        );
      })()}
      {r.total > r.list.length ? <p className="mt-2 text-[12.5px] text-ink-3">{t('{n} more are not drawn here.', { n: n(r.total - r.list.length) })}</p> : null}
    </section>
  );
}

/** Routers as one panel, for an account whose routers send no list. */
function RoutersPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const r = b.routers;
  if (!r) return null;
  const asOf = asUtc(b.as_of).getTime();
  return (
    <Panel eyebrow={t('Network')} title={t('Are my routers up?')} tone={r.offline > 0 ? 'bad' : undefined} actions={<More label={t('Routers')} onClick={() => onAsk('Show my routers and their status')} />}>
      {r.total > 0 ? (
        <>
          <Big value={r.online} format={(v) => `${n(v)} / ${n(r.total)}`} label={r.offline > 0 ? <b className="font-semibold text-[var(--ai-text-bad)]">{n(r.offline)} offline</b> : t('routers online')} />
          <div className="mt-4">
            <SegmentsBar slim onPick={(label) => onAsk(`Which routers are ${label.toLowerCase()} right now?`)} segments={[
              { label: 'Online', value: r.online, shown: n(r.online), color: toneColor('good') },
              { label: 'Offline', value: r.offline, shown: n(r.offline), color: toneColor('bad') },
              ...(r.unknown ? [{ label: 'Not checked yet', value: r.unknown, shown: n(r.unknown), color: toneColor('muted') }] : []),
            ]} />
          </div>
          {r.down.length ? (
            <div className="mt-3"><Rows>
              {r.down.map((d) => (
                <li key={d.id}>
                  <AskRow onClick={() => onAsk(`Why is router ${d.name} offline, and how do I fix it?`)}>
                    <Led tone="bad" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-1">{d.name}</span>
                    <span className="ai-mono shrink-0 text-[12px] text-[var(--ai-text-bad)]">{d.last_online_at ? `${span(asOf - asUtc(d.last_online_at).getTime())} ${t('down')}` : t('offline')}</span>
                  </AskRow>
                </li>
              ))}
            </Rows></div>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-[13.5px] text-ink-3">{t('No router is connected yet.')}</p>
          <button type="button" className="ai-chip mt-2.5" onClick={() => onAsk('Help me add my router')}>{t('Add my router')}</button>
        </div>
      )}
    </Panel>
  );
}

function CustomersPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const c = b.customers;
  if (!c) return null;
  const later = Math.max(0, c.active - c.expiring_3d);
  const soon = Math.max(0, c.expiring_3d - c.expiring_today);
  const pick = (label: string) => onAsk(label === 'Run out today' ? 'Who expires today?' : label === 'Within 3 days' ? 'Who expires in the next 3 days?' : 'List my active customers');
  return (
    <Panel eyebrow={t('Customers · paid time')} title={t('How long are customers paid for?')} actions={<More label={t('All')} onClick={() => onAsk('List my active customers')} />}>
      {c.total > 0 ? (
        <>
          <Big value={c.active} format={n} label={t('have paid time left')} />
          <div className="mt-4">
            <SegmentsBar onPick={pick} segments={[
              { label: 'More than 3 days', value: later, shown: n(later), color: toneColor('good') },
              { label: 'Within 3 days', value: soon, shown: n(soon), color: toneColor('info') },
              { label: 'Run out today', value: c.expiring_today, shown: n(c.expiring_today), color: toneColor('warn') },
            ]} />
          </div>
          <ReadoutGrid cols={2}>
            <Readout label={t('Lapsed this week')} sub={t('not renewed')} onClick={() => onAsk('Who expired in the last 7 days and has not renewed?')}>
              <span className={c.expired_7d ? 'text-[var(--ai-text-bad)]' : ''}>{n(c.expired_7d)}</span>
            </Readout>
            <Readout label={t('New this week')} sub={t('joined')} onClick={() => onAsk('Which customers joined in the last 7 days?')}>{n(c.new_7d)}</Readout>
          </ReadoutGrid>
        </>
      ) : (
        <p className="text-[13.5px] text-ink-3">{t('No customers yet. They appear here as they buy a plan or as you add them.')}</p>
      )}
    </Panel>
  );
}

function ExpiringPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const list = b.customers?.expiring ?? [];
  if (!list.length) return null;
  const asOf = asUtc(b.as_of).getTime();
  const window3d = 3 * 86_400_000;
  return (
    <Panel eyebrow={t('Expiring next')} title={t('Who runs out soonest')} actions={<More label={t('All')} onClick={() => onAsk('Who expires in the next 3 days?')} />}>
      <Rows>
        {list.map((c) => {
          const left = asUtc(c.expiry).getTime() - asOf;
          const name = c.name || c.phone || `#${c.id}`;
          const urgent = left < 86_400_000;
          return (
            <li key={c.id}>
              <AskRow onClick={() => onAsk(`Tell me about customer ${name} (ID ${c.id})`)}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13.5px] font-medium text-ink-1">{name}</span>
                    <span className={`ai-mono shrink-0 text-[12px] ${urgent ? 'text-[var(--ai-text-warn)]' : 'text-ink-3'}`}>{left <= 0 ? t('expired') : `${t('in')} ${span(left)}`}</span>
                  </span>
                  {/* time left, out of the three days this list looks at */}
                  <span className="mt-1.5 block"><Meter value={Math.max(0, left)} max={window3d} tone={urgent ? 'warn' : 'info'} height={3} /></span>
                  {c.plan || (c.name && c.phone) ? <span className="mt-1 block truncate text-[11.5px] text-ink-3">{[c.plan, c.name ? c.phone : null].filter(Boolean).join(' · ')}</span> : null}
                </span>
              </AskRow>
            </li>
          );
        })}
      </Rows>
    </Panel>
  );
}

function PlansPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const plans = b.plans ?? [];
  if (!plans.length) return null;
  return (
    <Panel eyebrow={t('Best sellers · 7 days')} title={t('Which plans sell')} actions={<More label={t('Plans')} onClick={() => onAsk('How did each plan sell in the last 7 days?')} />}>
      <RankedBars onPick={(label) => onAsk(`How is the ${label} plan selling?`)}
        rows={plans.map((p) => ({ label: p.name, detail: `${n(p.sales)} ${plural(p.sales, 'sale', 'sales')}`, value: p.revenue, shown: money(p.revenue) }))} />
    </Panel>
  );
}

/** The briefing as plain text, to paste into WhatsApp. */
function summaryText(b: Briefing, money: (v: number) => string): string {
  const lines = [`${b.name ?? 'My network'} · ${dateFmt.format(asUtc(b.as_of))} ${clockFmt.format(asUtc(b.as_of))}`];
  if (b.money) lines.push(`Money: ${money(b.money.today)} today from ${n(b.money.payments_today)} payments. ${money(b.money.last7)} in the last 7 days (${money(b.money.prev7)} the week before). ${money(b.money.month)} this month.`);
  if (b.customers) lines.push(`Customers: ${n(b.customers.active)} paying right now${b.customers.expiring_today ? `; ${n(b.customers.expiring_today)} of them have internet time ending today` : ''}. ${n(b.customers.expired_7d)} ran out this week and have not bought again.`);
  if (b.routers) lines.push(`Routers: ${n(b.routers.online)} of ${n(b.routers.total)} online${b.routers.offline ? `, offline: ${b.routers.down.map((d) => d.name).join(', ')}` : ''}.`);
  const needs = needsItems(b, money).map((i) => i.text);
  if (needs.length) lines.push(`Needs a look: ${needs.join('; ')}.`);
  return lines.join('\n');
}

/* ---------------- the platform owner's view ---------------- */

function AdminCards({ d, onAsk }: { d: AdminDashboard; onAsk: Ask }) {
  const t = useT();
  const kes = (v: number) => formatMoney(v, 'KES');
  const r = d.resellers;
  const paying = r.paying_subscriptions ?? r.subscription_active ?? 0;
  const vitals = [
    { key: 'rev', label: t('Collected today'), value: d.revenue.today, format: kes, ask: 'Show platform revenue for each of the last 30 days', accent: true, sub: t('across all resellers') },
    { key: 'res', label: t('Paying resellers'), value: paying, format: n, ask: 'Show unpaid subscription invoices', sub: t('of {n} resellers', { n: n(r.total) }) },
    { key: 'rt', label: t('Routers up'), value: d.routers.online, format: (v: number) => `${n(v)}/${n(d.routers.total)}`, ask: 'Which routers are offline right now?', sub: d.routers.offline ? `${n(d.routers.offline)} ${t('offline')}` : t('all reachable'), bad: d.routers.offline > 0 },
    { key: 'cu', label: t('End customers'), value: d.customers.active, format: n, ask: 'How many end customers are active across the platform?', sub: t('active of {n}', { n: n(d.customers.total) }) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <section className="ai-card overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {vitals.map((v, i) => (
            <button key={v.key} type="button" onClick={() => onAsk(v.ask)}
              className={`relative min-w-0 px-4 py-4 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2/60 sm:px-5 sm:py-5 ${i % 2 === 1 ? 'border-l border-line' : ''} ${i >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l lg:border-line' : ''}`}>
              {v.accent ? <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 0% 0%, var(--ai-accent-soft), transparent 60%)' }} /> : null}
              <span className="ai-eyebrow relative">{v.label}</span>
              <CountUp value={v.value} format={v.format} className={`ai-mono relative mt-2.5 block truncate font-medium leading-none tracking-tight ${v.format(v.value).length > 8 ? 'text-[19px] sm:text-[28px]' : 'text-[26px] sm:text-[32px]'} ${v.accent ? 'text-accent' : 'text-ink-1'}`} />
              <span className={`relative mt-2 block truncate text-[12px] ${v.bad ? 'text-[var(--ai-text-bad)]' : 'text-ink-3'}`}>{v.sub}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel eyebrow={t('Revenue')} title={t('How is the platform doing?')} actions={<More label={t('Revenue')} onClick={() => onAsk('Show platform revenue for each of the last 30 days')} />}>
          <ReadoutGrid cols={3}>
            <Readout label={t('This week')} onClick={() => onAsk('Show platform revenue for this week by reseller')}>{kes(d.revenue.this_week)}</Readout>
            <Readout label={t('This month')} onClick={() => onAsk('Show platform revenue for this month')}>{kes(d.revenue.this_month)}</Readout>
            <Readout label={t('All time')} onClick={() => onAsk('How has platform revenue grown month by month?')}>{kes(d.revenue.all_time)}</Readout>
          </ReadoutGrid>
        </Panel>
        <Panel eyebrow={t('Subscriptions')} title={t('Are resellers paying?')} actions={<More label={t('Unpaid')} onClick={() => onAsk('Show unpaid subscription invoices')} />}>
          <SegmentsBar slim onPick={(label) => onAsk(`List the resellers whose subscription is ${label.toLowerCase()}`)} segments={[
            { label: 'Active', value: r.subscription_active ?? 0, shown: n(r.subscription_active ?? 0), color: toneColor('good') },
            { label: 'Trial', value: r.subscription_trial ?? 0, shown: n(r.subscription_trial ?? 0), color: toneColor('info') },
            { label: 'Suspended', value: r.subscription_suspended ?? 0, shown: n(r.subscription_suspended ?? 0), color: toneColor('bad') },
            { label: 'Inactive', value: r.subscription_inactive ?? 0, shown: n(r.subscription_inactive ?? 0), color: toneColor('muted') },
          ]} />
          <p className="mt-3 text-[12.5px] text-ink-3">{t('{n} signed in during the last 30 days.', { n: n(r.active_last_30_days) })}</p>
        </Panel>
        <Panel eyebrow={t('Network')} title={t('Are routers up?')} tone={d.routers.offline > 0 ? 'bad' : undefined} actions={<More label={t('Offline')} onClick={() => onAsk('Which routers are offline right now?')} />}>
          <SegmentsBar slim onPick={(label) => onAsk(`Which routers are ${label.toLowerCase()} right now?`)} segments={[
            { label: 'Online', value: d.routers.online, shown: n(d.routers.online), color: toneColor('good') },
            { label: 'Offline', value: d.routers.offline, shown: n(d.routers.offline), color: toneColor('bad') },
          ]} />
          <p className="mt-3 text-[12.5px] text-ink-3">{t('{active} of {total} end customers are active.', { active: n(d.customers.active), total: n(d.customers.total) })}</p>
        </Panel>
        <Panel eyebrow={t('Growth · this month')} title={t('Who is growing?')} actions={<More label={t('All resellers')} onClick={() => onAsk('Rank resellers by revenue this month')} />}>
          {d.top_resellers_this_month.length ? (
            <RankedBars onPick={(label) => onAsk(`Tell me about reseller ${label}`)}
              rows={d.top_resellers_this_month.slice(0, 5).map((x) => ({ label: x.organization_name || x.email, value: x.month_revenue, shown: kes(x.month_revenue) }))} />
          ) : <p className="text-[13.5px] text-ink-3">{t('No reseller revenue yet this month.')}</p>}
        </Panel>
      </div>
      {d.recent_signups.length ? (
        <Panel eyebrow={t('Newest resellers')} title={t('Who just joined')} actions={<More label={t('This week')} onClick={() => onAsk('Which resellers signed up this week?')} />}>
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {d.recent_signups.slice(0, 6).map((s) => (
              <li key={s.id} className="ai-well overflow-hidden">
                <AskRow onClick={() => onAsk(`Tell me about reseller ${s.organization_name || s.email} (ID ${s.id}): are they set up and making money?`)}>
                  <span className="ai-mono w-[52px] shrink-0 text-[11.5px] text-ink-3">{dateFmt.format(asUtc(s.created_at))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink-1">{s.organization_name || s.email}</span>
                    <span className="block truncate text-[12px] text-ink-3">{s.last_login_at ? `${t('last seen')} ${dateFmt.format(asUtc(s.last_login_at))}` : t('never signed in')}</span>
                  </span>
                </AskRow>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

/* ---------------- the page ---------------- */

// The last briefing is kept for the session, so coming back to the home screen shows
// figures at once while fresh ones load behind them.
const CACHE_KEY = 'bw_ai_briefing';
function cached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function remember(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: no cache */ }
}

export default function Home({ userKey, name, organization, admin, readOnly, enabled, onAsk, preview }: {
  /** who is signed in: figures cached for someone else are never shown */
  userKey: string;
  name: string | null;
  organization: string | null;
  admin: boolean;
  readOnly: boolean;
  /** the assistant can answer (when not, the figures still show) */
  enabled: boolean;
  onAsk: Ask;
  /** fixed figures to draw instead of loading them (the design preview) */
  preview?: { briefing?: Briefing; platform?: AdminDashboard };
}) {
  const t = useT();
  const key = `${CACHE_KEY}:${userKey}`;
  const [b, setB] = useState<Briefing | null>(() => preview?.briefing ?? (admin ? null : cached<Briefing>(key)));
  const [platform, setPlatform] = useState<AdminDashboard | null>(() => preview?.platform ?? (admin ? cached<AdminDashboard>(key) : null));
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const fixed = !!preview;

  useEffect(() => {
    if (fixed) return;
    let alive = true;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      if (admin) {
        api.getAdminDashboard().then((d) => { if (alive) { setPlatform(d); setFailed(false); remember(key, d); } }).catch(() => alive && setFailed(true));
      } else {
        assistantApi.briefing().then((j) => { if (alive) { setB(j); setFailed(false); remember(key, j); } }).catch(() => alive && setFailed(true));
      }
    };
    load();
    const timer = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(timer); };
  }, [admin, key, fixed]);

  // the viewer's own time of day, known only in the browser
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  });

  const money = (v: number) => formatMoney(v, b?.currency ?? 'KES');
  const ctx: Ctx | null = b ? { b, money, onAsk } : null;
  const setup = b?.setup;
  const fresh = !!setup && setup.routers === 0;
  const settingUp = !!setup && !readOnly && (setup.routers === 0 || setup.plans === 0 || setup.payment_methods === 0);
  const loaded = admin ? !!platform : !!b;
  // sections that failed (not the ones this person simply may not see)
  const failedSections = b ? b.unavailable.filter((x) => !(b.not_allowed ?? []).includes(x)).map((x) => x.replace(/_/g, ' ')) : [];

  // the sentence that says how things stand
  let headline: React.ReactNode = null;
  let sub: React.ReactNode = null;
  if (admin && platform) {
    headline = (
      <>
        {formatMoney(platform.revenue.today, 'KES')} collected today across {n(platform.resellers.total)} resellers.{' '}
        {platform.routers.offline > 0 ? <span className="text-[var(--ai-text-bad)]">{n(platform.routers.offline)} of {n(platform.routers.total)} routers are offline.</span> : <span className="text-ink-3">Every router is online.</span>}
      </>
    );
  } else if (b && fresh) {
    headline = <>{t('Welcome to Bitwave. Let us get your network online.')}</>;
    sub = <>{t('Tell me what you have, or tap Start setup. I ask one thing at a time and do the configuration for you.')}</>;
  } else if (b) {
    const m = b.money;
    const r = b.routers;
    const list = r?.list ?? [];
    const offline = r?.offline ?? 0;
    // paying customers on the routers that are down: who is affected, not just how many routers
    const cutOff = list.filter((x) => x.status === 'offline').reduce((a, x) => a + (x.active_customers ?? 0), 0);
    const live = reporting(list).length > 0;
    const people = peopleOnline(list);
    const change = m && m.prev7 > 0 ? Math.round(((m.last7 - m.prev7) / m.prev7) * 100) : null;
    headline = offline === 1 && r?.down[0] ? (
      <><span className="text-[var(--ai-text-bad)]">{r.down[0].name} is down.</span>{' '}
        {cutOff > 0 ? `${n(cutOff)} paying ${plural(cutOff, 'customer', 'customers')} can't get online.` : "Customers on it can't get online."}</>
    ) : offline > 1 ? (
      <><span className="text-[var(--ai-text-bad)]">{n(offline)} routers are down</span>
        {cutOff > 0 ? `, so ${n(cutOff)} paying customers can't get online.` : '.'}</>
    ) : r && r.total > 0 && r.online === 0 ? (
      // none has reported in recently: say so, never claim they are up
      <>{r.total === 1 ? "Your router hasn't reported in recently" : `None of your ${n(r.total)} routers has reported in recently`}: check {r.total === 1 ? 'that it is' : 'they are'} powered and online.</>
    ) : r && r.total > 0 && (r.unknown ?? 0) > 0 ? (
      <>{n(r.online)} of {n(r.total)} routers are up; {n(r.unknown)} {plural(r.unknown, "hasn't", "haven't")} reported in recently
        {live ? <> · <span className="text-[var(--ai-text-good)]">{n(people)} {plural(people, 'person', 'people')} online</span></> : null}.</>
    ) : r && r.total > 0 ? (
      <>All good: {r.total === 1 ? 'your router is up' : `all ${n(r.total)} routers are up`}
        {live ? <> and <span className="text-[var(--ai-text-good)]">{n(people)} {plural(people, 'person is', 'people are')} online</span> right now</> : null}.</>
    ) : <>Here is where things stand.</>;
    if (m) {
      sub = (
        <>
          You have made <b className="ai-mono font-medium text-ink-1">{money(m.today)}</b> today
          {m.payments_today ? ` from ${n(m.payments_today)} ${plural(m.payments_today, 'payment', 'payments')}` : ''}
          {change !== null && Math.abs(change) >= 1 ? (
            <>, and this week is <span className={change > 0 ? 'text-[var(--ai-text-good)]' : 'text-[var(--ai-text-warn)]'}>{Math.abs(change)}% {change > 0 ? 'ahead of' : 'behind'}</span> last week</>
          ) : null}.
        </>
      );
    }
  }
  if (loaded && !sub) sub = <>{t('Every figure below is a question: tap it and the conversation carries on from there. Or ask anything in the box.')}</>;

  const copy = async () => {
    if (!b) return;
    if (await copyText(summaryText(b, money))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const starters = admin ? [
    { title: t('Resellers'), questions: ['Which resellers signed up this week?', 'Which resellers have not signed in for 30 days?', 'Show unpaid subscription invoices'] },
    { title: t('Money'), questions: ['Show platform revenue for this month', 'Rank resellers by revenue this month', 'How much is owed in payouts?'] },
    { title: t('Network'), questions: ['Which routers are offline right now?', 'Which resellers have no router yet?'] },
    { title: t('Support'), questions: ['Which resellers are stuck in setup?', 'Show the newest feedback and bug reports'] },
  ] : fresh ? [
    { title: t('Getting started'), questions: ['Help me add my router', 'What do I need before I start?', 'Which MikroTik routers work with Bitwave?'] },
    { title: t('How it works'), questions: ['How do customers pay me?', 'How do hotspot vouchers work?', 'What does Bitwave cost?'] },
  ] : [
    { title: t('Money'), questions: ['How much did I make this week?', 'Show my revenue for each of the last 30 days', 'Which plan makes me the most money?'] },
    { title: t('Customers'), questions: ['Who expires today?', 'Which customers are online now?', 'A customer paid but has no internet'] },
    { title: t('Routers'), questions: ['Which routers are offline right now?', 'Show my routers and their status', 'Help me add a new router'] },
    ...(readOnly ? [] : [{ title: t('Get things done'), questions: ['Generate 10 one-day vouchers', 'Add a new customer', 'Create a new plan'] }]),
  ];

  const who = name || organization;
  const hasNetwork = !!b?.routers?.list?.length;
  // the second row: whatever of these this person may see, laid out so none sits alone
  const lower: React.ReactNode[] = ctx && b ? [
    b.customers ? <CustomersPanel key="customers" ctx={ctx} /> : null,
    b.customers?.expiring.length ? <ExpiringPanel key="expiring" ctx={ctx} /> : null,
    b.plans?.length ? <PlansPanel key="plans" ctx={ctx} /> : null,
    b.routers && !hasNetwork ? <RoutersPanel key="routers" ctx={ctx} /> : null,
  ].filter(Boolean) : [];
  const lowerCols = lower.length >= 3 ? 'md:grid-cols-2 xl:grid-cols-3' : lower.length === 2 ? 'md:grid-cols-2' : '';

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="ai-eyebrow">
            {t(greeting)}{who ? `, ${who}` : ''}{name && organization && !admin ? ` · ${organization}` : ''}{admin ? ` · ${t('the whole platform')}` : ''}
          </span>
          {loaded && (b || platform) ? (
            <span className="ai-mono inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1/60 px-2 py-0.5 text-[11px] text-ink-2">
              <Led tone="live" size={5} />
              {fixed ? t('Preview') : t('Live')} · {clockFmt.format(b ? asUtc(b.as_of) : new Date())}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
          <h1 className="ai-display min-w-0 flex-1 basis-[520px] text-[clamp(1.55rem,1.1rem+2vw,2.4rem)] font-semibold leading-[1.15] text-ink-1">
            {headline ?? (failed && !loaded ? t('The figures could not be loaded just now.') : loaded ? t('Here is where things stand.') : t('Gathering your latest figures…'))}
          </h1>
          {b && !fresh ? (
            <button type="button" onClick={copy} className="ai-btn ai-btn-ghost h-9 shrink-0 px-3.5 text-[12.5px]" title={t('Copy a text summary to paste into WhatsApp')}>
              {copied ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />} {copied ? t('Copied') : t('Copy summary')}
            </button>
          ) : null}
        </div>
        <p className="mt-3 max-w-[760px] text-[15px] leading-relaxed text-ink-2">
          {sub ?? (enabled ? <span className="text-accent">{t('Ask anything below.')}</span> : null)}
        </p>
        {b && failedSections.length > 0 && !fresh ? (
          <p role="status" className="mt-2 flex max-w-[760px] items-center gap-2 text-[12.5px] leading-relaxed text-ink-3">
            <Pill tone="warn">{t('Partial')}</Pill>
            {t('Could not be loaded just now: {list}. Those figures are left out, not counted as zero.', { list: failedSections.join(', ') })}
          </p>
        ) : null}
      </header>

      {!loaded && !failed ? <Skeleton /> : null}
      {failed && !loaded ? <p className="ai-card px-4 py-3 text-[14px] text-ink-2">{t('The figures could not be loaded just now. You can still ask a question below.')}</p> : null}

      {admin && platform ? <div className="ai-rise"><AdminCards d={platform} onAsk={onAsk} /></div> : null}

      {ctx && b ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          {settingUp && setup ? <div className="ai-rise"><SetupCard setup={setup} onAsk={onAsk} /></div> : null}
          {!fresh ? (
            <>
              <div className="ai-rise"><Vitals ctx={ctx} /></div>
              <div className="ai-rise grid gap-3 sm:gap-4 lg:grid-cols-12" style={{ animationDelay: '70ms' }}>
                {b.money ? <div className="min-w-0 lg:col-span-7"><RevenuePanel ctx={ctx} /></div> : null}
                <div className={`min-w-0 ${b.money ? 'lg:col-span-5' : 'lg:col-span-12'}`}><AttentionPanel ctx={ctx} /></div>
              </div>
              {hasNetwork ? <div className="ai-rise mt-4" style={{ animationDelay: '140ms' }}><NetworkSection ctx={ctx} /></div> : null}
              {lower.length ? (
                <div className={`ai-rise mt-2 grid gap-3 sm:gap-4 ${lowerCols}`} style={{ animationDelay: '210ms' }}>
                  {lower.map((card, i) => (
                    // an odd card out takes the rest of the row instead of sitting beside a gap
                    <div key={i} className={`grid min-w-0 ${lower.length === 3 && i === 2 ? 'md:col-span-2 xl:col-span-1' : ''}`}>{card}</div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {enabled ? <Starters groups={starters} onAsk={onAsk} /> : null}
    </div>
  );
}
