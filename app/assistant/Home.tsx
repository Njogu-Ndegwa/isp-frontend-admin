'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { assistantApi, type Briefing, type NetworkRouter } from '../lib/assistant';
import { bpsText, uptimeText } from '../lib/assistantEntities';
import type { Tone } from '../lib/assistantVisual';
import { copyText } from '../lib/clipboard';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';
import type { AdminDashboard } from '../lib/types';
import { Delta, MiniBars } from './charts/Mini';
import { RankedBars } from './charts/RankedBars';
import { SegmentsBar } from './charts/SegmentsBar';
import { toneColor } from './charts/shared';
import { ArrowRightIcon, CameraIcon, CheckIcon } from './icons';

/*
 * The home screen: one sentence that says how things stand, then four questions
 * answered at a glance, and what is coming up next. Every figure, row and bar is a
 * question: a tap asks it, and the conversation carries on from there. The static
 * picture of the business lives here; anything else is asked in the box below.
 *
 * It adapts to the account: a new account sees the steps to get its first router
 * online, a reseller sees money, customers, routers and what needs them, and the
 * platform owner sees the whole platform.
 */

export type Ask = (question: string) => void;

const n = (v: number) => v.toLocaleString('en-US');
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
const asUtc = (iso: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) || iso.length <= 10 ? iso : `${iso}Z`);
const clockFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function span(ms: number): string {
  const h = Math.abs(ms) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
}

/* ---------------- pieces ---------------- */

/** One of the questions: a numbered header, the answer, and where to go next. */
function Question({ num, title, more, onAsk, children }: { num: number; title: string; more?: { label: string; ask: string }; onAsk: Ask; children: React.ReactNode }) {
  return (
    <section className="ai-card flex min-w-0 flex-col p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[11.5px] font-bold text-ink-2">{num}</span>
        <h2 className="ai-display min-w-0 flex-1 text-[15px] font-bold text-ink-1">{title}</h2>
        {more ? (
          <button type="button" onClick={() => onAsk(more.ask)} className="ai-tap shrink-0 text-[12.5px] font-bold text-accent underline-offset-4 hover:underline">{more.label}</button>
        ) : null}
      </header>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function Panel({ title, qualifier, more, onAsk, children }: { title: string; qualifier?: string; more?: { label: string; ask: string }; onAsk: Ask; children: React.ReactNode }) {
  return (
    <section className="ai-card min-w-0 p-4 sm:p-5">
      <header className="mb-2 flex items-baseline gap-2">
        <h2 className="ai-display shrink-0 text-[15px] font-bold text-ink-1">{title}</h2>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{qualifier}</span>
        {more ? (
          <button type="button" onClick={() => onAsk(more.ask)} className="ai-tap shrink-0 text-[12.5px] font-bold text-accent underline-offset-4 hover:underline">{more.label}</button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** A row that is a question: the arrow shows on hover, a tap asks it. */
function AskRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="ai-tap group -mx-2 flex w-[calc(100%+1rem)] min-w-0 items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-surface-2">
      {children}
      <ArrowRightIcon width={12} height={12} className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100 [@media(pointer:coarse)]:opacity-60" />
    </button>
  );
}

const Big = ({ value, label }: { value: string; label: React.ReactNode }) => (
  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <span className={`ai-num ai-display font-bold leading-none text-ink-1 ${value.length > 11 ? 'text-[23px]' : 'text-[28px]'}`}>{value}</span>
    <span className="text-[13px] text-ink-2">{label}</span>
  </div>
);

type Item = { tone: Tone; text: string; ask: string };
function Items({ items, onAsk }: { items: Item[]; onAsk: Ask }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map((it) => (
        <li key={it.text}>
          <AskRow onClick={() => onAsk(it.ask)}>
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: toneColor(it.tone) }} />
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-1">{it.text}</span>
          </AskRow>
        </li>
      ))}
    </ul>
  );
}

/** A figure with its share of a whole drawn under it: the rows of "are my customers connected?". */
function MeterRow({ value, label, note, tone, of, noteTone, onClick }: { value: number; label: string; note?: string; tone: Tone; of: number; noteTone?: 'bad' | 'warn'; onClick: () => void }) {
  return (
    <AskRow onClick={onClick}>
      <span className="ai-num ai-display w-[34px] shrink-0 text-right text-[17px] font-bold text-ink-1">{n(value)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
          <span className="truncate text-ink-2">{label}</span>
          {note ? <span className={`shrink-0 ${noteTone === 'bad' ? 'text-[var(--ai-text-bad)]' : noteTone === 'warn' ? 'text-[var(--ai-text-warn)]' : 'text-ink-3'}`}>{note}</span> : null}
        </span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-3">
          <span className="block h-full rounded-full" style={{ width: `${of > 0 ? Math.max(value > 0 ? 2 : 0, Math.min(100, (value / of) * 100)) : 0}%`, background: toneColor(tone) }} />
        </span>
      </span>
    </AskRow>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your figures">
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="ai-card h-[250px] animate-pulse" />)}
      </div>
    </div>
  );
}

function Starters({ groups, onAsk }: { groups: { title: string; questions: string[] }[]; onAsk: Ask }) {
  const t = useT();
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{t('Or start with one of these')}</h2>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="min-w-0">
            <h3 className="mb-2 text-[13px] font-bold text-ink-2">{group.title}</h3>
            <div className="flex flex-col items-start gap-1.5">
              {group.questions.map((question) => (
                <button key={question} type="button" className="ai-chip !rounded-[16px]" onClick={() => onAsk(question)}>{question}</button>
              ))}
            </div>
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
      <div className="h-1 bg-surface-3" aria-hidden>
        <div className="h-full bg-accent-fill transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-[280px]">
            <h2 className="ai-display text-[18px] font-bold text-ink-1">{t('Get your network online')}</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">{t('{done} of {total} steps done. We do each one together, right here in the chat.', { done, total: steps.length })}</p>
          </div>
          {next ? (
            <button type="button" className="ai-btn ai-btn-primary min-h-[44px] px-5 text-[14px]" onClick={() => onAsk(next.ask)}>
              {done === 0 ? t('Start setup') : t('Continue setup')} <ArrowRightIcon width={15} height={15} />
            </button>
          ) : null}
        </div>
        <ol className="m-0 mt-4 grid list-none gap-2 p-0 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button type="button" onClick={() => onAsk(s.ask)}
                className={`flex h-full w-full items-start gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors hover:bg-surface-2 ${s === next ? 'border-accent/60 bg-accent-soft' : 'border-line'}`}>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${s.done ? 'bg-good text-white' : 'border border-line-strong text-ink-2'}`}>
                  {s.done ? <CheckIcon width={13} height={13} strokeWidth={2.6} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14.5px] font-bold ${s.done ? 'text-ink-3 line-through decoration-1' : 'text-ink-1'}`}>{s.title}</span>
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

/* ---------------- a reseller's four questions ---------------- */

type Ctx = { b: Briefing; money: (v: number) => string; onAsk: Ask };

/* ---------------- the network: every MikroTik, as it is right now ---------------- */

const loadTone = (pct: number): Tone => (pct >= 85 ? 'bad' : pct >= 65 ? 'warn' : 'good');

/** `load` gauges (CPU, memory) turn red when high; a `reach` gauge turns red when low. */
function Gauge({ label, pct, kind = 'load' }: { label: string; pct: number; kind?: 'load' | 'reach' }) {
  const tone: Tone = kind === 'load' ? loadTone(pct) : pct >= 98 ? 'good' : pct >= 90 ? 'warn' : 'bad';
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-[12px] text-ink-3"><span>{label}</span><span className="ai-num font-bold text-ink-1">{Math.round(pct)}%</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: toneColor(tone) }} /></div>
    </div>
  );
}

function RouterTile({ r, asOf, onAsk }: { r: NetworkRouter; asOf: number; onAsk: Ask }) {
  const t = useT();
  const live = r.status === 'online' ? r.live : null;
  const named = `router ${r.name} (ID ${r.id})`;
  const online = live ? (live.hotspot_online ?? 0) + (live.pppoe_online ?? 0) : null;
  const down = r.status === 'offline';
  const last = r.last_online_at ? asUtc(r.last_online_at).getTime() : null;
  const model = live ? [live.board, live.version ? `RouterOS ${live.version}` : null].filter(Boolean).join(' · ') : r.identity;
  return (
    <li className={`flex min-w-0 flex-col rounded-[14px] border p-3.5 sm:p-4 ${down ? 'border-bad/45 bg-bad/5' : 'border-line bg-surface-1'}`}>
      <button type="button" onClick={() => onAsk(down ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`)} className="group flex w-full items-start gap-2.5 text-left">
        <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: toneColor(down ? 'bad' : r.status === 'online' ? 'good' : 'muted'), boxShadow: r.status === 'online' ? '0 0 0 4px color-mix(in srgb, var(--ai-good) 20%, transparent)' : undefined }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-bold text-ink-1 group-hover:text-accent">{r.name}</span>
          {model ? <span className="block truncate text-[12px] text-ink-3">{model}</span> : null}
        </span>
        <span className={`ai-num shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold ${down ? 'bg-bad/15 text-[var(--ai-text-bad)]' : r.status === 'online' ? 'bg-good/15 text-[var(--ai-text-good)]' : 'bg-surface-3 text-ink-2'}`}>
          {down ? (last ? `${t('Down')} ${span(asOf - last)}` : t('Offline')) : r.status === 'online' ? t('Online') : t('Not checked')}
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {online !== null ? (
          <button type="button" className="min-w-0 text-left" onClick={() => onAsk(`Who is online on ${named} right now?`)}>
            <span className="ai-num ai-display block text-[24px] font-bold leading-none text-ink-1">{n(online)}</span>
            <span className="mt-1 block truncate text-[12px] text-ink-3">{t('online now')}{live?.pppoe_online ? ` · ${n(live.pppoe_online)} PPPoE` : ''}</span>
          </button>
        ) : null}
        {typeof r.active_customers === 'number' ? (
          <button type="button" className="min-w-0 text-left" onClick={() => onAsk(`Which customers are on ${named}?`)}>
            <span className={`ai-num ai-display block text-[24px] font-bold leading-none ${down && r.active_customers > 0 ? 'text-[var(--ai-text-bad)]' : 'text-ink-1'}`}>{n(r.active_customers)}</span>
            <span className="mt-1 block truncate text-[12px] text-ink-3">{down && r.active_customers > 0 ? t('paying customers cut off') : t('paying customers')}</span>
          </button>
        ) : null}
        {live && typeof live.cpu === 'number' ? <Gauge label="CPU" pct={live.cpu} /> : null}
        {live && typeof live.memory_pct === 'number' ? <Gauge label={t('Memory')} pct={live.memory_pct} /> : null}
        {!live && typeof r.reachable_pct === 'number' ? <div className="col-span-2"><Gauge label={t('Reachable')} pct={r.reachable_pct} kind="reach" /></div> : null}
      </div>

      {live ? (
        <p className="ai-num mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
          {bpsText(live.down_bps) ? <span className="text-ink-2">&darr; {bpsText(live.down_bps)}</span> : null}
          {bpsText(live.up_bps) ? <span className="text-ink-2">&uarr; {bpsText(live.up_bps)}</span> : null}
          {uptimeText(live.uptime) ? <span>{t('up')} {uptimeText(live.uptime)}</span> : null}
        </p>
      ) : r.status === 'online' ? (
        <p className="mt-3 text-[12px] leading-snug text-ink-3">{t('Reachable, but it sends no live report (CPU, people online).')}</p>
      ) : null}
    </li>
  );
}

function NetworkSection({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const r = b.routers;
  if (!r || !r.list || r.list.length === 0) return null;
  const asOf = asUtc(b.as_of).getTime();
  const people = r.list.reduce((a, x) => a + (x.status === 'online' && x.live ? (x.live.hotspot_online ?? 0) + (x.live.pppoe_online ?? 0) : 0), 0);
  const reporting = r.list.some((x) => x.status === 'online' && x.live);
  const cols = r.list.length === 1 ? '' : r.list.length === 2 || r.list.length === 4 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3';
  return (
    <section aria-label={t('Your network')}>
      <header className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="ai-display text-[17px] font-bold text-ink-1">{t('Your network')}</h2>
        <p className="min-w-0 flex-1 text-[13px] text-ink-3">
          {n(r.online)} {t('of')} {n(r.total)} {plural(r.total, 'MikroTik', 'MikroTiks')} {t('online')}
          {r.offline > 0 ? <> · <b className="text-[var(--ai-text-bad)]">{n(r.offline)} {t('down')}</b></> : null}
          {reporting ? <> · {n(people)} {plural(people, 'person', 'people')} {t('online now')}</> : null}
        </p>
        <button type="button" onClick={() => onAsk('Show my routers and their status')} className="ai-tap shrink-0 text-[12.5px] font-bold text-accent underline-offset-4 hover:underline">{t('All routers')}</button>
      </header>
      <ul className={`m-0 grid list-none gap-3 p-0 ${cols}`}>
        {r.list.map((x) => <RouterTile key={x.id} r={x} asOf={asOf} onAsk={onAsk} />)}
      </ul>
      {r.total > r.list.length ? <p className="mt-2 text-[12.5px] text-ink-3">{t('{n} more are not drawn here.', { n: n(r.total - r.list.length) })}</p> : null}
    </section>
  );
}

function MoneyCard({ ctx, num }: { ctx: Ctx; num: number }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const m = b.money;
  if (!m) return null;
  return (
    <Question num={num} title={t('How is money today?')} more={{ label: t('Payments'), ask: "Show today's payments" }} onAsk={onAsk}>
      <Big value={money(m.today)} label={t('so far today from {n} {payments}', { n: n(m.payments_today), payments: plural(m.payments_today, 'payment', 'payments') })} />
      <div className="mt-3">
        <MiniBars points={m.daily.map((d) => ({ label: dayFmt.format(new Date(`${d.day}T00:00:00Z`)), value: d.revenue, partial: d.partial }))}
          format={money} empty={t('No payments in the last two weeks.')} />
      </div>
      <ul className="m-0 mt-2.5 flex list-none flex-col p-0">
        {[
          { label: t('Yesterday'), value: m.yesterday, ask: 'How much did I make yesterday?', delta: null as React.ReactNode },
          { label: t('Last 7 days'), value: m.last7, ask: 'Show my revenue for each of the last 7 days', delta: <Delta now={m.last7} before={m.prev7} label={t('the week before')} /> },
          { label: t('This month'), value: m.month, ask: 'How much have I made this month, and from which plans?', delta: null },
        ].map((r) => (
          <li key={r.label}>
            <AskRow onClick={() => onAsk(r.ask)}>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] text-ink-3">{r.label}</span>
                {r.delta}
              </span>
              <span className="ai-num shrink-0 text-[14.5px] font-bold text-ink-1">{money(r.value)}</span>
            </AskRow>
          </li>
        ))}
      </ul>
    </Question>
  );
}

function CustomersCard({ ctx, num }: { ctx: Ctx; num: number }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const c = b.customers;
  if (!c) return null;
  return (
    <Question num={num} title={t('Are my customers connected?')} more={{ label: t('All customers'), ask: 'List my active customers' }} onAsk={onAsk}>
      {c.total > 0 ? (
        <>
          <div className="mb-2"><Big value={n(c.active)} label={t('active now, of {n} customers', { n: n(c.total) })} /></div>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            <li><MeterRow value={c.expiring_today} label={t('Expire today')} tone="warn" of={c.active} note={c.expiring_today ? t('remind them') : undefined} noteTone="warn" onClick={() => onAsk('Who expires today?')} /></li>
            <li><MeterRow value={c.expiring_3d} label={t('Expire in the next 3 days')} tone="info" of={c.active} onClick={() => onAsk('Who expires in the next 3 days?')} /></li>
            <li><MeterRow value={c.expired_7d} label={t('Expired this week, not renewed')} tone="bad" of={Math.max(c.active, c.expired_7d)} note={c.expired_7d ? t('win them back') : undefined} noteTone="bad" onClick={() => onAsk('Who expired in the last 7 days and has not renewed?')} /></li>
            <li><MeterRow value={c.new_7d} label={t('New this week')} tone="good" of={Math.max(c.active, c.new_7d)} onClick={() => onAsk('Which customers joined in the last 7 days?')} /></li>
          </ul>
        </>
      ) : (
        <p className="text-[13.5px] text-ink-3">{t('No customers yet. They appear here as they buy a plan or as you add them.')}</p>
      )}
    </Question>
  );
}

function RoutersCard({ ctx, num }: { ctx: Ctx; num: number }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const r = b.routers;
  if (!r) return null;
  const asOf = asUtc(b.as_of).getTime();
  return (
    <Question num={num} title={t('Are my routers up?')} more={{ label: t('Routers'), ask: 'Show my routers and their status' }} onAsk={onAsk}>
      {r.total > 0 ? (
        <>
          <div className="mb-3">
            <Big value={`${n(r.online)} of ${n(r.total)}`} label={r.offline > 0 ? <><b className="text-[var(--ai-text-bad)]">{n(r.offline)} offline</b></> : t('routers online')} />
          </div>
          <SegmentsBar slim onPick={(label) => onAsk(`Which routers are ${label.toLowerCase()} right now?`)} segments={[
            { label: 'Online', value: r.online, shown: n(r.online), color: toneColor('good') },
            { label: 'Offline', value: r.offline, shown: n(r.offline), color: toneColor('bad') },
            ...(r.unknown ? [{ label: 'Not checked yet', value: r.unknown, shown: n(r.unknown), color: toneColor('muted') }] : []),
          ]} />
          {r.down.length ? (
            <ul className="m-0 mt-2 flex list-none flex-col p-0">
              {r.down.map((d) => (
                <li key={d.id}>
                  <AskRow onClick={() => onAsk(`Why is router ${d.name} offline, and how do I fix it?`)}>
                    <span className="ai-num w-[78px] shrink-0 rounded-full bg-bad/15 px-2 py-0.5 text-center text-[11.5px] font-bold text-[var(--ai-text-bad)]">
                      {d.last_online_at ? `${span(asOf - asUtc(d.last_online_at).getTime())} ${t('down')}` : t('offline')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-ink-1">{d.name}</span>
                  </AskRow>
                </li>
              ))}
            </ul>
          ) : <p className="mt-auto pt-2.5 text-[12.5px] text-ink-3">{t('All of them are reachable.')}</p>}
        </>
      ) : (
        <div>
          <p className="text-[13.5px] text-ink-3">{t('No router is connected yet.')}</p>
          <button type="button" className="ai-chip mt-2.5" onClick={() => onAsk('Help me add my router')}>{t('Add my router')}</button>
        </div>
      )}
    </Question>
  );
}

function needsItems(b: Briefing, money: (v: number) => string): Item[] {
  const a = b.attention;
  const sub = a?.subscription;
  const items: Item[] = [];
  if (b.routers && b.routers.offline > 0) items.push({ tone: 'bad', text: `${n(b.routers.offline)} ${plural(b.routers.offline, 'router is', 'routers are')} offline`, ask: 'Which routers are offline right now, and since when?' });
  for (const x of b.routers?.list ?? []) {
    if (x.status === 'online' && typeof x.live?.cpu === 'number' && x.live.cpu >= 85) {
      items.push({ tone: 'warn', text: `${x.name} is working hard: CPU at ${Math.round(x.live.cpu)}%`, ask: `Why is the CPU of router ${x.name} (ID ${x.id}) high, and what should I do?` });
    }
  }
  if (sub && /suspend|inactive|expired/i.test(sub.status)) items.push({ tone: 'bad', text: `Your Bitwave subscription is ${sub.status}`, ask: 'What do I owe on my Bitwave subscription?' });
  else if (sub?.amount_due && sub.amount_due > 0) items.push({ tone: 'warn', text: `Bitwave subscription: ${money(sub.amount_due)} is due`, ask: 'What do I owe on my Bitwave subscription?' });
  if (a?.failed_payments_24h) items.push({ tone: 'bad', text: `${n(a.failed_payments_24h)} ${plural(a.failed_payments_24h, 'payment', 'payments')} failed in the last 24 hours`, ask: 'Show the payments that failed in the last 24 hours' });
  if (b.customers && b.customers.expiring_today > 0) items.push({ tone: 'warn', text: `${n(b.customers.expiring_today)} ${plural(b.customers.expiring_today, 'customer expires', 'customers expire')} today`, ask: 'Who expires today?' });
  if (a?.unmatched_payments) items.push({ tone: 'warn', text: `${n(a.unmatched_payments)} ${plural(a.unmatched_payments, 'payment is', 'payments are')} not matched to a customer`, ask: 'Show my unmatched payments' });
  if (typeof a?.sms_credits === 'number' && a.sms_credits < 50) items.push({ tone: 'warn', text: `Only ${n(a.sms_credits)} SMS ${plural(a.sms_credits, 'credit', 'credits')} left`, ask: 'How many SMS credits do I have, and how do I buy more?' });
  if (sub && /trial/i.test(sub.status) && sub.expires_at) items.push({ tone: 'info', text: `Free trial ends ${dateFmt.format(asUtc(sub.expires_at))}`, ask: 'When does my trial end and what happens then?' });
  return items;
}

function NeedsCard({ ctx, num }: { ctx: Ctx; num: number }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const items = needsItems(b, money);
  return (
    <Question num={num} title={t('What needs me?')} onAsk={onAsk}>
      {items.length ? (
        <>
          <div className="mb-2"><Big value={n(items.length)} label={plural(items.length, t('thing to look at'), t('things to look at'))} /></div>
          <Items items={items} onAsk={onAsk} />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-good/15 text-[var(--ai-text-good)]"><CheckIcon width={18} height={18} strokeWidth={2.4} /></span>
          <p className="ai-display text-[16px] font-bold text-ink-1">{t('Nothing needs you right now.')}</p>
          <p className="text-[13px] text-ink-3">{t('Routers are up, payments are going through and nobody expires today.')}</p>
        </div>
      )}
    </Question>
  );
}

function ExpiringPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, onAsk } = ctx;
  const list = b.customers?.expiring ?? [];
  if (!list.length) return null;
  const asOf = asUtc(b.as_of).getTime();
  return (
    <Panel title={t('Expiring next')} qualifier={t('soonest first')} more={{ label: t('All expiring'), ask: 'Who expires in the next 3 days?' }} onAsk={onAsk}>
      <ul className="m-0 flex list-none flex-col p-0">
        {list.map((c) => {
          const left = asUtc(c.expiry).getTime() - asOf;
          const name = c.name || c.phone || `#${c.id}`;
          return (
            <li key={c.id}>
              <AskRow onClick={() => onAsk(`Tell me about customer ${name} (ID ${c.id})`)}>
                <span className={`ai-num w-[74px] shrink-0 rounded-full px-2 py-0.5 text-center text-[11.5px] font-bold ${left < 86_400_000 ? 'bg-warn/20 text-[var(--ai-text-warn)]' : 'bg-surface-3 text-ink-2'}`}>
                  {left <= 0 ? t('expired') : `${t('in')} ${span(left)}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink-1">{name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{[c.plan, c.name ? c.phone : null].filter(Boolean).join(' · ')}</span>
                </span>
              </AskRow>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function PlansPanel({ ctx }: { ctx: Ctx }) {
  const t = useT();
  const { b, money, onAsk } = ctx;
  const plans = b.plans ?? [];
  if (!plans.length) return null;
  return (
    <Panel title={t('Best sellers')} qualifier={t('last 7 days')} more={{ label: t('Plans'), ask: 'How did each plan sell in the last 7 days?' }} onAsk={onAsk}>
      <RankedBars onPick={(label) => onAsk(`How is the ${label} plan selling?`)}
        rows={plans.map((p) => ({ label: p.name, detail: `${n(p.sales)} ${plural(p.sales, 'sale', 'sales')}`, value: p.revenue, shown: money(p.revenue) }))} />
    </Panel>
  );
}

/** The briefing as plain text, to paste into WhatsApp. */
function summaryText(b: Briefing, money: (v: number) => string): string {
  const lines = [`${b.name ?? 'My network'} · ${dateFmt.format(asUtc(b.as_of))} ${clockFmt.format(asUtc(b.as_of))}`];
  if (b.money) lines.push(`Money: ${money(b.money.today)} today from ${n(b.money.payments_today)} payments. ${money(b.money.last7)} in the last 7 days (${money(b.money.prev7)} the week before). ${money(b.money.month)} this month.`);
  if (b.customers) lines.push(`Customers: ${n(b.customers.active)} active of ${n(b.customers.total)}. ${n(b.customers.expiring_today)} expire today, ${n(b.customers.expired_7d)} expired this week.`);
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
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Question num={1} title={t('How is the platform doing?')} more={{ label: t('Revenue'), ask: 'Show platform revenue for each of the last 30 days' }} onAsk={onAsk}>
          <Big value={kes(d.revenue.today)} label={t('collected today, across all resellers')} />
          <ul className="m-0 mt-2.5 flex list-none flex-col p-0">
            {[
              { label: t('This week'), value: d.revenue.this_week, ask: 'Show platform revenue for this week by reseller' },
              { label: t('This month'), value: d.revenue.this_month, ask: 'Show platform revenue for this month' },
              { label: t('All time'), value: d.revenue.all_time, ask: 'How has platform revenue grown month by month?' },
            ].map((row) => (
              <li key={row.label}>
                <AskRow onClick={() => onAsk(row.ask)}>
                  <span className="min-w-0 flex-1 text-[12.5px] text-ink-3">{row.label}</span>
                  <span className="ai-num shrink-0 text-[14.5px] font-bold text-ink-1">{kes(row.value)}</span>
                </AskRow>
              </li>
            ))}
          </ul>
        </Question>
        <Question num={2} title={t('Are resellers paying?')} more={{ label: t('Unpaid'), ask: 'Show unpaid subscription invoices' }} onAsk={onAsk}>
          <div className="mb-3"><Big value={n(r.paying_subscriptions ?? r.subscription_active ?? 0)} label={t('paying, of {n} resellers', { n: n(r.total) })} /></div>
          <SegmentsBar slim onPick={(label) => onAsk(`List the resellers whose subscription is ${label.toLowerCase()}`)} segments={[
            { label: 'Active', value: r.subscription_active ?? 0, shown: n(r.subscription_active ?? 0), color: toneColor('good') },
            { label: 'Trial', value: r.subscription_trial ?? 0, shown: n(r.subscription_trial ?? 0), color: toneColor('info') },
            { label: 'Suspended', value: r.subscription_suspended ?? 0, shown: n(r.subscription_suspended ?? 0), color: toneColor('bad') },
            { label: 'Inactive', value: r.subscription_inactive ?? 0, shown: n(r.subscription_inactive ?? 0), color: toneColor('muted') },
          ]} />
          <p className="mt-auto pt-2.5 text-[12.5px] text-ink-3">{t('{n} signed in during the last 30 days.', { n: n(r.active_last_30_days) })}</p>
        </Question>
        <Question num={3} title={t('Are routers up?')} more={{ label: t('Offline'), ask: 'Which routers are offline right now?' }} onAsk={onAsk}>
          <div className="mb-3"><Big value={`${n(d.routers.online)} of ${n(d.routers.total)}`} label={t('routers online')} /></div>
          <SegmentsBar slim onPick={(label) => onAsk(`Which routers are ${label.toLowerCase()} right now?`)} segments={[
            { label: 'Online', value: d.routers.online, shown: n(d.routers.online), color: toneColor('good') },
            { label: 'Offline', value: d.routers.offline, shown: n(d.routers.offline), color: toneColor('bad') },
          ]} />
          <p className="mt-auto pt-2.5 text-[12.5px] text-ink-3">{t('{active} of {total} end customers are active.', { active: n(d.customers.active), total: n(d.customers.total) })}</p>
        </Question>
        <Question num={4} title={t('Who is growing?')} more={{ label: t('All resellers'), ask: 'Rank resellers by revenue this month' }} onAsk={onAsk}>
          {d.top_resellers_this_month.length ? (
            <RankedBars onPick={(label) => onAsk(`Tell me about reseller ${label}`)}
              rows={d.top_resellers_this_month.slice(0, 5).map((x) => ({ label: x.organization_name || x.email, value: x.month_revenue, shown: kes(x.month_revenue) }))} />
          ) : <p className="text-[13.5px] text-ink-3">{t('No reseller revenue yet this month.')}</p>}
        </Question>
      </div>
      {d.recent_signups.length ? (
        <div className="mt-3">
          <Panel title={t('Newest resellers')} qualifier={t('most recent first')} more={{ label: t('This week'), ask: 'Which resellers signed up this week?' }} onAsk={onAsk}>
            <ul className="m-0 grid list-none gap-x-6 p-0 md:grid-cols-2">
              {d.recent_signups.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <AskRow onClick={() => onAsk(`Tell me about reseller ${s.organization_name || s.email} (ID ${s.id}): are they set up and making money?`)}>
                    <span className="ai-num w-[64px] shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-center text-[11.5px] font-bold text-ink-2">{dateFmt.format(asUtc(s.created_at))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink-1">{s.organization_name || s.email}</span>
                      <span className="block truncate text-[12px] text-ink-3">{s.last_login_at ? `${t('last seen')} ${dateFmt.format(asUtc(s.last_login_at))}` : t('never signed in')}</span>
                    </span>
                  </AskRow>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </>
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

export default function Home({ userKey, name, organization, admin, readOnly, enabled, onAsk }: {
  /** who is signed in: figures cached for someone else are never shown */
  userKey: string;
  name: string | null;
  organization: string | null;
  admin: boolean;
  readOnly: boolean;
  /** the assistant can answer (when not, the figures still show) */
  enabled: boolean;
  onAsk: Ask;
}) {
  const t = useT();
  const key = `${CACHE_KEY}:${userKey}`;
  const [b, setB] = useState<Briefing | null>(() => (admin ? null : cached<Briefing>(key)));
  const [platform, setPlatform] = useState<AdminDashboard | null>(() => (admin ? cached<AdminDashboard>(key) : null));
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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
  }, [admin, key]);

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
        {platform.routers.offline > 0 ? <span className="text-[var(--ai-text-bad)]">{n(platform.routers.offline)} of {n(platform.routers.total)} routers are offline.</span> : 'Every router is online.'}
      </>
    );
  } else if (b && fresh) {
    headline = <>{t('Welcome to Bitwave. Let us get your network online.')}</>;
    sub = <>{t('Tell me what you have, or tap Start setup. I ask one thing at a time and do the configuration for you.')}</>;
  } else if (b) {
    const m = b.money;
    const offline = b.routers?.offline ?? 0;
    const expiring = b.customers?.expiring_today ?? 0;
    headline = (
      <>
        {m ? <>{money(m.today)} in so far today from {n(m.payments_today)} {plural(m.payments_today, 'payment', 'payments')}. </>
          : b.customers ? <>{n(b.customers.active)} of {n(b.customers.total)} customers are active. </> : null}
        {offline > 0 ? <span className="text-[var(--ai-text-bad)]">{n(offline)} {plural(offline, 'router is', 'routers are')} offline.</span>
          : expiring > 0 ? <span className="text-[var(--ai-text-warn)]">{n(expiring)} {plural(expiring, 'customer expires', 'customers expire')} today.</span>
            : b.routers && b.routers.total > 0 ? 'Every router is online.' : null}
      </>
    );
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
  let num = 0;
  const hasNetwork = !!b?.routers?.list?.length;
  const cards: React.ReactNode[] = ctx && b ? [
    b.money ? <MoneyCard key="money" ctx={ctx} num={++num} /> : null,
    b.customers ? <CustomersCard key="customers" ctx={ctx} num={++num} /> : null,
    // the network section above already shows every router
    b.routers && !hasNetwork ? <RoutersCard key="routers" ctx={ctx} num={++num} /> : null,
    <NeedsCard key="needs" ctx={ctx} num={++num} />,
    b.customers?.expiring.length ? <ExpiringPanel key="expiring" ctx={ctx} /> : null,
    b.plans?.length ? <PlansPanel key="plans" ctx={ctx} /> : null,
  ].filter(Boolean) : [];
  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-5 sm:mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <span>
            {t(greeting)}{who ? `, ${who}` : ''}{name && organization && !admin ? ` · ${organization}` : ''}{admin ? ` · ${t('the whole platform')}` : ''}
          </span>
          {loaded && (b || platform) ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--ai-text-good)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-good" />
              {t('Live')} · {clockFmt.format(b ? asUtc(b.as_of) : new Date())}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-3">
          <h1 className="ai-display min-w-0 flex-1 basis-[520px] text-[clamp(1.5rem,1.1rem+1.9vw,2.15rem)] font-bold leading-[1.18] text-ink-1">
            {headline ?? (failed && !loaded ? t('The figures could not be loaded just now.') : loaded ? t('Here is where things stand.') : t('Gathering your latest figures…'))}
          </h1>
          {b && !fresh ? (
            <button type="button" onClick={copy} className="ai-btn ai-btn-ghost h-9 shrink-0 px-3.5 text-[12.5px]" title={t('Copy a text summary to paste into WhatsApp')}>
              {copied ? t('Copied') : t('Copy summary')}
            </button>
          ) : null}
        </div>
        <p className="mt-2 max-w-[760px] text-[14px] leading-relaxed text-ink-3">
          {sub ?? (enabled ? <span className="text-accent">{t('Ask anything below.')}</span> : null)}
        </p>
        {b && failedSections.length > 0 && !fresh ? (
          <p role="status" className="mt-2 max-w-[760px] text-[12.5px] leading-relaxed text-ink-3">
            {t('Could not be loaded just now: {list}. Those figures are left out, not counted as zero.', { list: failedSections.join(', ') })}
          </p>
        ) : null}
      </header>

      {!loaded && !failed ? <Skeleton /> : null}
      {failed && !loaded ? <p className="ai-card px-4 py-3 text-[14px] text-ink-2">{t('The figures could not be loaded just now. You can still ask a question below.')}</p> : null}

      {admin && platform ? <div className="ai-rise"><AdminCards d={platform} onAsk={onAsk} /></div> : null}

      {ctx && b ? (
        <div className="ai-rise">
          {settingUp && setup ? <div className={fresh ? '' : 'mb-3'}><SetupCard setup={setup} onAsk={onAsk} /></div> : null}
          {!fresh ? (
            <>
              {hasNetwork ? <div className="mb-5 sm:mb-6"><NetworkSection ctx={ctx} /></div> : null}
              <div className="grid gap-3 md:grid-cols-2">
                {cards.map((card, i) => (
                  // an odd card out takes the whole row instead of sitting alone beside a gap
                  <div key={i} className={`grid min-w-0 ${cards.length % 2 === 1 && i === cards.length - 1 ? 'md:col-span-2' : ''}`}>{card}</div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {enabled ? <Starters groups={starters} onAsk={onAsk} /> : null}
    </div>
  );
}
