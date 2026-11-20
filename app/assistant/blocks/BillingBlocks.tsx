'use client';

import { useMemo, useState } from 'react';
import {
  asUtc, customerFacts, paymentFacts, planDuration, planSpeed, routerFacts, span,
  type CustomerState,
} from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { copyText } from '../../lib/clipboard';
import { formatMoney } from '../../lib/format';
import { seriesColor } from '../charts/shared';
import { ArrowRightIcon, CheckIcon, CopyIcon } from '../icons';
import { Battery, Led, Panel, Pill } from '../ui';
import { DeviceCard } from './DeviceCard';

/*
 * The billing parts of an answer. A list of customers is not a table of columns: it
 * is people with a plan and time left. A router is a device that is up or down. A
 * payment went through or it did not, and a voucher is a ticket to hand over. Each
 * kind gets a component made for it, and every row or button is a next step: a tap
 * asks the assistant, which looks it up or prepares the change for a Confirm.
 */

type Ask = ((question: string) => void) | undefined;
const PAGE = 8;
const n = (v: number) => v.toLocaleString('en-US');
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** A row that is a question about the thing it shows. Without `onClick` it is plain. */
function Line({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const cls = 'flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left @md:py-3';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} group transition-colors hover:bg-surface-2 active:bg-surface-2`}>
      {children}
      <ArrowRightIcon width={13} height={13} className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-active:translate-x-0.5 group-hover:text-accent group-active:text-accent group-hover:opacity-100 group-active:opacity-100 [@media(pointer:coarse)]:opacity-60" />
    </button>
  ) : <div className={cls}>{children}</div>;
}

function More({ shown, total, expanded, onToggle }: { shown: number; total: number; expanded: boolean; onToggle: () => void }) {
  if (total <= PAGE) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 text-[12px] text-ink-3">
      <span className="ai-mono">{n(shown)} / {n(total)}</span>
      <button type="button" className="ai-tap font-semibold text-accent hover:underline" onClick={onToggle}>{expanded ? 'Show fewer' : `Show all ${n(total)}`}</button>
    </div>
  );
}

const Action = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={onClick}>{children}</button>
);

/** A soft tile with a person's initial, its colour fixed by the name. */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color = seriesColor(h % 7);
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[11px] font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4, color, background: `color-mix(in srgb, ${color} 15%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 28%, transparent)` }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/* ---------------- customers ---------------- */

const CUSTOMER: Record<CustomerState, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expiring: { label: 'Expires soon', tone: 'warn' },
  grace: { label: 'In grace', tone: 'warn' },
  expired: { label: 'Expired', tone: 'bad' },
  paused: { label: 'Paused', tone: 'muted' },
  inactive: { label: 'Inactive', tone: 'muted' },
};
const timeLeft = (left: number | null, state: CustomerState) =>
  left === null ? '' : state === 'paused' ? 'time frozen' : left <= 0 ? `ended ${span(left)} ago` : `${span(left)} left`;
/** Paid time drawn against a week, so a day left looks short and a month full. */
const WEEK = 7 * 86_400_000;

export function CustomerBlock({ title, rows, total, single, onAsk }: { title: string; rows: Row[]; total?: number; single: boolean; onAsk: Ask }) {
  const [filter, setFilter] = useState<'all' | 'on' | 'off'>('all');
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => Date.now());
  const people = useMemo(() => rows.map((r) => customerFacts(r, now)), [rows, now]);
  const isOn = (s: CustomerState) => s === 'active' || s === 'expiring' || s === 'grace';
  const on = people.filter((p) => isOn(p.state)).length;
  const off = people.filter((p) => p.state === 'expired' || p.state === 'inactive').length;
  const soon = people.filter((p) => p.state === 'expiring').length;
  const about = (p: (typeof people)[number]) => `${p.name}${p.id !== null ? ` (customer ID ${p.id})` : ''}`;

  if (single && people.length === 1) {
    const p = people[0];
    const st = CUSTOMER[p.state];
    const facts: [string, string | null][] = [
      ['Phone', p.phone], ['Plan', p.plan], ['Router', p.router], ['Connection', p.connection],
      ['Paid until', p.expiry ? whenFmt.format(p.expiry) : null],
    ];
    const remaining = p.left !== null && p.left > 0 && p.state !== 'paused' ? span(p.left) : null;
    return (
      <Panel eyebrow="Customer" tone={st.tone === 'good' ? undefined : st.tone}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <Avatar name={p.name} size={46} />
          <div className="min-w-0 flex-1 basis-[160px]">
            <h3 className="ai-display truncate text-[19px] font-semibold text-ink-1">{p.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3"><Pill tone={st.tone}>{st.label}</Pill>{p.phone && p.phone !== p.name ? <span className="ai-mono">{p.phone}</span> : null}</p>
          </div>
          {/* the paid time, read like charge left in a battery (a week is a full charge) */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="ai-eyebrow">{p.state === 'paused' ? 'Time frozen' : remaining ? 'Paid time left' : 'Paid time'}</p>
              <p className={`ai-mono mt-1 text-[24px] font-medium leading-none ${st.tone === 'bad' ? 'text-[var(--ai-text-bad)]' : st.tone === 'warn' ? 'text-[var(--ai-text-warn)]' : 'text-ink-1'}`}>
                {remaining ?? (p.left !== null && p.left <= 0 ? 'Ended' : '–')}
              </p>
            </div>
            {p.left !== null && p.state !== 'paused' ? <Battery value={Math.max(0, p.left)} max={WEEK} tone={st.tone === 'muted' ? 'info' : st.tone} label={remaining ? `${remaining} of paid time left` : 'No paid time left'} /> : null}
          </div>
        </div>
        <dl className="ai-well mt-4 grid grid-cols-2 gap-x-6 gap-y-3 px-3.5 py-3 @2xl:grid-cols-3">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="min-w-0"><dt className="ai-eyebrow">{k}</dt><dd className="mt-1 truncate text-[13.5px] text-ink-1">{v}</dd></div>
          ))}
        </dl>
        {onAsk ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Action onClick={() => onAsk(`Renew ${about(p)} on their current plan`)}>Renew</Action>
            <Action onClick={() => onAsk(`Give ${about(p)} extra time`)}>Add time</Action>
            <Action onClick={() => onAsk(`Send an SMS to ${about(p)}`)}>Send SMS</Action>
            <Action onClick={() => onAsk(`Show the payments of ${about(p)}`)}>Payments</Action>
            <Action onClick={() => onAsk(`${about(p)} has paid but has no internet. Check why.`)}>No internet?</Action>
          </div>
        ) : null}
      </Panel>
    );
  }

  const order = (s: CustomerState) => (s === 'expiring' || s === 'grace' ? 0 : s === 'active' ? 1 : s === 'expired' ? 2 : 3);
  const list = people
    .filter((p) => filter === 'all' || (filter === 'on' ? isOn(p.state) : !isOn(p.state)))
    .sort((a, b) => order(a.state) - order(b.state) || (order(a.state) === 2 ? (b.left ?? 0) - (a.left ?? 0) : (a.left ?? Infinity) - (b.left ?? Infinity)));
  const visible = expanded ? list : list.slice(0, PAGE);
  const all = total ?? people.length;
  return (
    <Panel eyebrow={<>Customers · {n(all)}</>} title={title}
      note={<>{all > people.length ? `${n(people.length)} loaded · ` : ''}<span className="text-[var(--ai-text-good)]">{n(on)} connected</span> · {n(off)} not</>}
      actions={onAsk ? (
        <>
          {soon > 0 ? <Action onClick={() => onAsk('Send an expiry reminder SMS to the customers who expire in the next 24 hours')}>Remind {n(soon)} expiring</Action> : null}
          {off > 0 ? <Action onClick={() => onAsk('Send a renewal reminder SMS to the customers who expired in the last 7 days')}>Win back {n(off)}</Action> : null}
        </>
      ) : null}>
      {on > 0 && off > 0 ? (
        <div className="mb-3 inline-flex rounded-full border border-line p-0.5 text-[12.5px]" role="group" aria-label="Filter">
          {([['all', `All ${n(people.length)}`], ['on', `Connected ${n(on)}`], ['off', `Not connected ${n(people.length - on)}`]] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setExpanded(false); }}
              className={`ai-tap rounded-full px-3 py-1 font-medium transition-colors ${filter === key ? 'bg-surface-3 text-ink-1' : 'text-ink-3 hover:text-ink-1'}`}>{label}</button>
          ))}
        </div>
      ) : null}
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">
        {visible.map((p, i) => {
          const st = CUSTOMER[p.state];
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={onAsk ? () => onAsk(`Tell me about ${about(p)}`) : undefined}>
                <Avatar name={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink-1">{p.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{[p.name !== p.phone ? p.phone : null, p.plan, p.router, p.connection !== 'Hotspot' ? p.connection : null].filter(Boolean).join(' · ')}</span>
                </span>
                {/* narrow: the dot and the time left; with room, the state in words too */}
                <span className="flex shrink-0 flex-col items-end gap-1 @md:w-[104px]">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2" title={st.label}><Led tone={st.tone} size={6} /><span className="hidden @md:inline">{st.label}</span></span>
                  <span className="ai-mono text-[11.5px] text-ink-3">{timeLeft(p.left, p.state)}</span>
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      <More shown={visible.length} total={list.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- routers ---------------- */


export function RouterBlock({ title, rows, onAsk }: { title: string; rows: Row[]; onAsk: Ask }) {
  const [now] = useState(() => Date.now());
  const routers = useMemo(() => rows.map(routerFacts).sort((a, b) => (a.state === 'offline' ? 0 : 1) - (b.state === 'offline' ? 0 : 1)), [rows]);
  const online = routers.filter((r) => r.state === 'online').length;
  const offline = routers.filter((r) => r.state === 'offline').length;
  return (
    <Panel eyebrow={<>Network · {n(routers.length)} {routers.length === 1 ? 'router' : 'routers'}</>} title={title} tone={offline ? 'bad' : undefined}
      note={<>{n(online)} of {n(routers.length)} online{offline ? <> · <b className="font-semibold text-[var(--ai-text-bad)]">{n(offline)} offline</b></> : ''}</>}>
      <ul className="m-0 grid list-none gap-3 p-0 @xl:grid-cols-2">
        {routers.map((r, i) => {
          const named = `router ${r.name}${r.id !== null ? ` (ID ${r.id})` : ''}`;
          return (
            <DeviceCard key={`${r.id}-${i}`}
              d={{ id: r.id, name: r.name, model: r.identity, state: r.state, downFor: r.state === 'offline' && r.since ? span(now - r.since.getTime()) : null, reach: r.uptime, emergency: r.emergency }}
              onOpen={onAsk ? () => onAsk(r.state === 'offline' ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`) : undefined}
              actions={onAsk ? (
                <>
                  <Action onClick={() => onAsk(r.state === 'offline' ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`)}>{r.state === 'offline' ? 'Why is it down?' : 'Check health'}</Action>
                  <Action onClick={() => onAsk(`Which customers are on ${named}, and who is online now?`)}>Customers</Action>
                  <Action onClick={() => onAsk(`How much did ${named} make in the last 7 days?`)}>Revenue</Action>
                </>
              ) : null} />
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------------- plans ---------------- */

/** Plans as spec cards: the price large, then what it buys, then what to do with it. */
export function PlanBlock({ title, rows, currency, onAsk }: { title: string; rows: Row[]; currency?: string | null; onAsk: Ask }) {
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const plans = rows.map((r, i) => {
    const type = String(r.connection_type ?? 'hotspot').toLowerCase();
    const price = typeof r.price === 'number' ? r.price : Number(r.price) || 0;
    return {
      key: `${r.id}-${i}`,
      name: String(r.name ?? 'Plan'),
      type,
      typeLabel: type === 'pppoe' ? 'PPPoE' : type === 'static_ip' ? 'Static IP' : 'Hotspot',
      price: price > 0 ? formatMoney(price, currency ?? 'KES') : 'Free',
      speed: planSpeed(r.speed),
      duration: planDuration(r),
      hidden: r.is_hidden === true,
      badge: typeof r.badge_text === 'string' && r.badge_text ? r.badge_text : null,
    };
  });
  const actions = (p: (typeof plans)[number]) => onAsk ? (
    <>
      {p.type === 'hotspot' ? <Action onClick={() => onAsk(`Generate 10 vouchers for the ${p.name} plan`)}>Vouchers</Action> : null}
      <Action onClick={() => onAsk(`How is the ${p.name} plan selling?`)}>Sales</Action>
      <Action onClick={() => onAsk(`Change the ${p.name} plan`)}>Edit</Action>
      <Action onClick={() => onAsk(`Tell me everything about the ${p.name} plan: who is on it and how it sells`)}>Details</Action>
    </>
  ) : null;
  const visible = expanded ? plans : plans.slice(0, PAGE);
  return (
    <Panel eyebrow={<>Plans · {n(rows.length)}</>} title={title}
      actions={onAsk ? <Action onClick={() => onAsk('Create a new plan')}>New plan</Action> : null}>
      {/* narrow (a phone): one compact row per plan; a tap opens it in place */}
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0 @xl:hidden">
        {visible.map((p, i) => {
          const isOpen = open === i;
          return (
            <li key={p.key}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-ink-1">{p.name}</span>
                    {p.hidden ? <Pill tone="muted" dot={false}>Hidden</Pill> : null}
                    {p.badge ? <Pill tone="info" dot={false}>{p.badge}</Pill> : null}
                  </span>
                  <span className="ai-mono mt-0.5 block truncate text-[11.5px] text-ink-3">{[p.duration, p.speed, p.typeLabel].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="ai-mono shrink-0 text-[15px] font-medium text-ink-1">{p.price}</span>
                <ArrowRightIcon width={12} height={12} className={`shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90 text-accent' : ''}`} />
              </button>
              {isOpen && onAsk ? <div className="ai-rise flex flex-wrap gap-1.5 px-3.5 pb-3">{actions(p)}</div> : null}
            </li>
          );
        })}
      </ul>
      {/* with room: a spec card per plan */}
      <ul className="m-0 hidden list-none grid-cols-2 gap-2.5 p-0 @xl:grid @3xl:grid-cols-3">
        {visible.map((p) => (
          <li key={p.key} className="ai-well flex flex-col p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="ai-eyebrow">{p.typeLabel}</span>
              <span className="flex-1" />
              {p.hidden ? <Pill tone="muted" dot={false}>Hidden</Pill> : null}
              {p.badge ? <Pill tone="info" dot={false}>{p.badge}</Pill> : null}
            </div>
            <p className="mt-2 truncate text-[14px] font-medium text-ink-1">{p.name}</p>
            <p className="ai-mono mt-1 text-[24px] font-medium leading-tight tracking-tight text-ink-1">{p.price}</p>
            {p.duration || p.speed ? (
              <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                {p.duration ? <div className="min-w-0"><dt className="ai-eyebrow">Time</dt><dd className="ai-mono mt-0.5 truncate text-[12.5px] text-ink-1">{p.duration}</dd></div> : null}
                {p.speed ? <div className="min-w-0"><dt className="ai-eyebrow">Speed</dt><dd className="ai-mono mt-0.5 truncate text-[12.5px] text-ink-1">{p.speed}</dd></div> : null}
              </dl>
            ) : null}
            {onAsk ? <div className="mt-auto flex flex-wrap gap-1.5 pt-3">{actions(p)}</div> : null}
          </li>
        ))}
      </ul>
      <More shown={visible.length} total={plans.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- payments ---------------- */

/** Payments as a ledger: the amount in mono, who paid and for what, and whether it went through. */
export function PaymentBlock({ title, rows, total, currency, onAsk }: { title: string; rows: Row[]; total?: number; currency?: string | null; onAsk: Ask }) {
  const [expanded, setExpanded] = useState(false);
  const payments = useMemo(() => rows.map(paymentFacts), [rows]);
  const money = (v: number) => formatMoney(v, currency ?? 'KES');
  const paid = payments.filter((p) => p.state === 'paid');
  const failed = payments.filter((p) => p.state === 'failed').length;
  const visible = expanded ? payments : payments.slice(0, PAGE);
  const all = total ?? payments.length;
  return (
    <Panel eyebrow={<>Payments · {n(all)}</>} title={title} tone={failed ? 'warn' : undefined}
      note={<>{paid.length ? <><span className="ai-mono text-ink-1">{money(paid.reduce((a, p) => a + p.amount, 0))}</span> received</> : ''}{failed ? <> · <b className="font-semibold text-[var(--ai-text-bad)]">{n(failed)} failed</b></> : ''}</>}>
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">
        {visible.map((p, i) => {
          const tone: Tone = p.state === 'paid' ? 'good' : p.state === 'failed' ? 'bad' : 'warn';
          const ask = onAsk ? () => onAsk(p.state === 'failed'
            ? `Why did the payment of ${money(p.amount)} from ${p.phone ?? p.who} fail, and what should I do?`
            : `Tell me about the payment of ${money(p.amount)} from ${p.phone ?? p.who}${p.receipt ? ` (receipt ${p.receipt})` : ''}`) : undefined;
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={ask}>
                <Led tone={tone} size={7} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink-1">{p.who}</span>
                  <span className={`block truncate text-[12px] ${p.reason ? 'text-[var(--ai-text-bad)]' : 'text-ink-3'}`}>
                    {p.reason ?? [p.plan, p.who !== p.phone ? p.phone : null, p.receipt].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`ai-mono text-[14px] font-medium ${p.state === 'failed' ? 'text-ink-3 line-through decoration-1' : 'text-ink-1'}`}>{money(p.amount)}</span>
                  <span className="ai-mono text-[11px] text-ink-3">{p.when ? whenFmt.format(p.when) : p.state === 'paid' ? 'Paid' : p.state === 'failed' ? 'Failed' : 'Pending'}</span>
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      <More shown={visible.length} total={payments.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- vouchers ---------------- */

/** Vouchers as tickets: a code in mono over a perforated edge, tap to copy. */
export function VoucherBlock({ title, rows, currency }: { title: string; rows: Row[]; currency?: string | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const flash = (key: string) => { setCopied(key); window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600); };
  const codes = rows.map((r) => String(r.code ?? '')).filter(Boolean);
  const plan = (r: Row) => (r.plan && typeof r.plan === 'object' ? (r.plan as Row) : null);
  const first = rows[0] ? plan(rows[0]) : null;
  const label = first ? [first.name, typeof first.duration === 'string' ? first.duration.toLowerCase() : null, typeof first.price === 'number' ? formatMoney(first.price, currency ?? 'KES') : null].filter(Boolean).join(' · ') : '';
  const share = `${label ? `${label}\n` : ''}${codes.join('\n')}`;
  return (
    <Panel eyebrow={<>Vouchers · {n(codes.length)}</>} title={title} note={`${label ? `${label}. ` : ''}Tap a code to copy it.`}
      actions={
        <>
          <button type="button" className="ai-btn ai-btn-ghost !py-1.5 px-3 text-[12.5px]" onClick={async () => { if (await copyText(share)) flash('all'); }}>
            {copied === 'all' ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />} {copied === 'all' ? 'Copied' : 'Copy all'}
          </button>
          <a className="ai-btn ai-btn-ghost !py-1.5 px-3 text-[12.5px]" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </>
      }>
      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 @lg:grid-cols-3 @3xl:grid-cols-4">
        {rows.map((r, i) => {
          const code = String(r.code ?? '');
          const used = String(r.status ?? '').toLowerCase() !== 'active' && String(r.status ?? '').toLowerCase() !== 'unused' && !!r.status && !!asUtc(r.redeemed_at);
          return (
            <li key={`${code}-${i}`}>
              <button type="button" onClick={async () => { if (await copyText(code)) flash(code); }}
                className={`group relative w-full overflow-hidden rounded-[12px] border text-center transition-colors hover:border-accent/50 ${used ? 'border-line opacity-55' : 'border-line-strong'}`}
                style={{ background: used ? undefined : 'linear-gradient(180deg, var(--ai-accent-soft), transparent 70%)' }}>
                <span className={`ai-mono block truncate px-2 pb-2 pt-3 text-[16px] font-medium tracking-[0.12em] ${used ? 'text-ink-3 line-through' : 'text-ink-1'}`}>{code}</span>
                {/* the perforation: a dashed line with a notch cut into each side */}
                <span aria-hidden className="relative block border-t border-dashed border-line-strong">
                  <span className="absolute -left-[7px] -top-[6px] h-3 w-3 rounded-full bg-[var(--ai-s1)] shadow-[inset_-1px_0_0_var(--ai-line2)]" />
                  <span className="absolute -right-[7px] -top-[6px] h-3 w-3 rounded-full bg-[var(--ai-s1)] shadow-[inset_1px_0_0_var(--ai-line2)]" />
                </span>
                <span className={`ai-eyebrow block py-1.5 ${copied === code ? '!text-[var(--ai-text-good)]' : ''}`}>{copied === code ? 'Copied' : used ? 'Used' : 'Ready'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
