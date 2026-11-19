'use client';

import { useMemo, useState } from 'react';
import {
  asUtc, customerFacts, paymentFacts, planDuration, planSpeed, routerFacts, span,
  type CustomerState,
} from '../../lib/assistantEntities';
import type { Row } from '../../lib/assistantView';
import { copyText } from '../../lib/clipboard';
import { formatMoney } from '../../lib/format';
import { toneColor } from '../charts/shared';
import { ArrowRightIcon, CheckIcon, CopyIcon } from '../icons';

/*
 * The billing parts of an answer. A list of customers is not a table of columns: it
 * is people with a plan and time left. A router is up or down. A payment went
 * through or it did not, and a voucher is a code to hand over. Each kind gets a
 * component made for it, and every row or button is a next step: a tap asks the
 * assistant, which looks it up or prepares the change for a Confirm.
 */

type Ask = ((question: string) => void) | undefined;
type Tone = 'good' | 'info' | 'warn' | 'bad' | 'muted';
const PAGE = 8;
const n = (v: number) => v.toLocaleString('en-US');
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const PILL: Record<Tone, string> = {
  good: 'bg-good/15 text-[var(--ai-text-good)]',
  warn: 'bg-warn/20 text-[var(--ai-text-warn)]',
  bad: 'bg-bad/15 text-[var(--ai-text-bad)]',
  info: 'bg-accent-soft text-accent',
  muted: 'bg-surface-3 text-ink-2',
};
const Pill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span className={`ai-num inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-bold ${PILL[tone]}`}>{children}</span>
);

function Shell({ title, note, actions, children }: { title: string; note?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="@container ai-card p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-[200px]">
          <h3 className="ai-display text-[15px] font-bold leading-snug text-ink-1">{title}</h3>
          {note ? <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{note}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-1.5">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** A row that is a question about the thing it shows. Without `onClick` it is plain. */
function Line({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const cls = 'flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} group transition-colors hover:bg-surface-2`}>
      {children}
      <ArrowRightIcon width={13} height={13} className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100 [@media(pointer:coarse)]:opacity-60" />
    </button>
  ) : <div className={cls}>{children}</div>;
}

function More({ shown, total, expanded, onToggle }: { shown: number; total: number; expanded: boolean; onToggle: () => void }) {
  if (total <= PAGE) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 text-[12px] text-ink-3">
      <span>Showing {n(shown)} of {n(total)}</span>
      <button type="button" className="ai-tap font-bold text-accent hover:underline" onClick={onToggle}>{expanded ? 'Show fewer' : `Show all ${n(total)}`}</button>
    </div>
  );
}

const Action = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-semibold" onClick={onClick}>{children}</button>
);

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
    return (
      <section className="@container ai-card overflow-hidden">
        <div className="h-1" style={{ background: toneColor(st.tone) }} aria-hidden />
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[17px] font-bold text-accent">{p.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <h3 className="ai-display truncate text-[18px] font-bold text-ink-1">{p.name}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3"><Pill tone={st.tone}>{st.label}</Pill>{timeLeft(p.left, p.state)}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 @2xl:grid-cols-3">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="min-w-0"><dt className="text-[11.5px] text-ink-3">{k}</dt><dd className="truncate text-[14px] text-ink-1">{v}</dd></div>
            ))}
          </dl>
          {onAsk ? (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3.5">
              <Action onClick={() => onAsk(`Renew ${about(p)} on their current plan`)}>Renew</Action>
              <Action onClick={() => onAsk(`Give ${about(p)} extra time`)}>Add time</Action>
              <Action onClick={() => onAsk(`Send an SMS to ${about(p)}`)}>Send SMS</Action>
              <Action onClick={() => onAsk(`Show the payments of ${about(p)}`)}>Payments</Action>
              <Action onClick={() => onAsk(`${about(p)} has paid but has no internet. Check why.`)}>No internet?</Action>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const order = (s: CustomerState) => (s === 'expiring' || s === 'grace' ? 0 : s === 'active' ? 1 : s === 'expired' ? 2 : 3);
  const list = people
    .filter((p) => filter === 'all' || (filter === 'on' ? isOn(p.state) : !isOn(p.state)))
    .sort((a, b) => order(a.state) - order(b.state) || (order(a.state) === 2 ? (b.left ?? 0) - (a.left ?? 0) : (a.left ?? Infinity) - (b.left ?? Infinity)));
  const visible = expanded ? list : list.slice(0, PAGE);
  const all = total ?? people.length;
  return (
    <Shell title={title}
      note={<>{n(all)} {all === 1 ? 'customer' : 'customers'}{all > people.length ? ` (${n(people.length)} loaded)` : ''} · {n(on)} connected · {n(off)} not</>}
      actions={onAsk ? (
        <>
          {soon > 0 ? <Action onClick={() => onAsk('Send an expiry reminder SMS to the customers who expire in the next 24 hours')}>Remind {n(soon)} expiring</Action> : null}
          {off > 0 ? <Action onClick={() => onAsk('Send a renewal reminder SMS to the customers who expired in the last 7 days')}>Win back {n(off)}</Action> : null}
        </>
      ) : null}>
      {on > 0 && off > 0 ? (
        <div className="mb-2.5 inline-flex rounded-full border border-line p-0.5 text-[12.5px]" role="group" aria-label="Filter">
          {([['all', `All ${n(people.length)}`], ['on', `Connected ${n(on)}`], ['off', `Not connected ${n(people.length - on)}`]] as const).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setExpanded(false); }}
              className={`ai-tap rounded-full px-3 py-1 font-semibold ${filter === key ? 'bg-surface-3 text-ink-1' : 'text-ink-3 hover:text-ink-1'}`}>{label}</button>
          ))}
        </div>
      ) : null}
      <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[10px] border border-line p-0">
        {visible.map((p, i) => {
          const st = CUSTOMER[p.state];
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={onAsk ? () => onAsk(`Tell me about ${about(p)}`) : undefined}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[14px] font-bold text-ink-2">{p.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink-1">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{[p.name !== p.phone ? p.phone : null, p.plan, p.router, p.connection !== 'Hotspot' ? p.connection : null].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Pill tone={st.tone}>{st.label}</Pill>
                  <span className="ai-num text-[12px] text-ink-3">{timeLeft(p.left, p.state)}</span>
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      <More shown={visible.length} total={list.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Shell>
  );
}

/* ---------------- routers ---------------- */

export function RouterBlock({ title, rows, onAsk }: { title: string; rows: Row[]; onAsk: Ask }) {
  const [now] = useState(() => Date.now());
  const routers = useMemo(() => rows.map(routerFacts).sort((a, b) => (a.state === 'offline' ? 0 : 1) - (b.state === 'offline' ? 0 : 1)), [rows]);
  const online = routers.filter((r) => r.state === 'online').length;
  const offline = routers.filter((r) => r.state === 'offline').length;
  return (
    <Shell title={title} note={<>{n(online)} of {n(routers.length)} online{offline ? <> · <b className="text-[var(--ai-text-bad)]">{n(offline)} offline</b></> : ''}</>}>
      <ul className="m-0 grid list-none gap-2.5 p-0 @xl:grid-cols-2">
        {routers.map((r, i) => {
          const tone: Tone = r.state === 'online' ? 'good' : r.state === 'offline' ? 'bad' : 'muted';
          const named = `router ${r.name}${r.id !== null ? ` (ID ${r.id})` : ''}`;
          return (
            <li key={`${r.id}-${i}`} className={`rounded-[12px] border p-3.5 ${r.state === 'offline' ? 'border-bad/40 bg-bad/5' : 'border-line'}`}>
              <div className="flex items-start gap-2.5">
                <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: toneColor(tone), boxShadow: r.state === 'online' ? '0 0 0 4px color-mix(in srgb, var(--ai-good) 18%, transparent)' : undefined }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink-1">{r.name}</p>
                  <p className="truncate font-mono text-[11.5px] text-ink-3">{r.identity}</p>
                </div>
                <Pill tone={tone}>{r.state === 'online' ? 'Online' : r.state === 'offline' ? (r.since ? `Down ${span(now - r.since.getTime())}` : 'Offline') : 'Not checked'}</Pill>
              </div>
              {r.uptime !== null ? (
                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-[12px] text-ink-3"><span>Reachable</span><span className="ai-num font-bold text-ink-1">{r.uptime}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${Math.max(2, r.uptime)}%`, background: toneColor(r.uptime >= 98 ? 'good' : r.uptime >= 90 ? 'warn' : 'bad') }} /></div>
                </div>
              ) : null}
              {r.emergency ? <p className="mt-2 text-[12.5px] text-[var(--ai-text-warn)]">Emergency free access is on.</p> : null}
              {onAsk ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Action onClick={() => onAsk(r.state === 'offline' ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`)}>{r.state === 'offline' ? 'Why is it down?' : 'Check health'}</Action>
                  <Action onClick={() => onAsk(`Which customers are on ${named}, and who is online now?`)}>Customers</Action>
                  <Action onClick={() => onAsk(`How much did ${named} make in the last 7 days?`)}>Revenue</Action>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/* ---------------- plans ---------------- */

export function PlanBlock({ title, rows, currency, onAsk }: { title: string; rows: Row[]; currency?: string | null; onAsk: Ask }) {
  return (
    <Shell title={title} note={`${n(rows.length)} ${rows.length === 1 ? 'plan' : 'plans'}`}
      actions={onAsk ? <Action onClick={() => onAsk('Create a new plan')}>New plan</Action> : null}>
      <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 @md:grid-cols-2 @3xl:grid-cols-3">
        {rows.map((r, i) => {
          const name = String(r.name ?? 'Plan');
          const type = String(r.connection_type ?? 'hotspot').toLowerCase();
          const price = typeof r.price === 'number' ? r.price : Number(r.price) || 0;
          const speed = planSpeed(r.speed);
          return (
            <li key={`${r.id}-${i}`} className="flex flex-col rounded-[12px] border border-line p-3.5">
              <div className="flex items-center gap-1.5">
                <Pill tone={type === 'pppoe' ? 'info' : 'muted'}>{type === 'pppoe' ? 'PPPoE' : type === 'static_ip' ? 'Static IP' : 'Hotspot'}</Pill>
                {r.is_hidden === true ? <Pill tone="muted">Hidden</Pill> : null}
                {typeof r.badge_text === 'string' && r.badge_text ? <Pill tone="warn">{r.badge_text}</Pill> : null}
              </div>
              <p className="mt-2 truncate text-[14px] text-ink-2">{name}</p>
              <p className="ai-num ai-display text-[24px] font-bold leading-tight text-ink-1">{price > 0 ? formatMoney(price, currency ?? 'KES') : 'Free'}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{[planDuration(r) ? `for ${planDuration(r)}` : null, speed].filter(Boolean).join(' · ')}</p>
              {onAsk ? (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {type === 'hotspot' ? <Action onClick={() => onAsk(`Generate 10 vouchers for the ${name} plan`)}>Vouchers</Action> : null}
                  <Action onClick={() => onAsk(`How is the ${name} plan selling?`)}>Sales</Action>
                  <Action onClick={() => onAsk(`Change the ${name} plan`)}>Edit</Action>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

/* ---------------- payments ---------------- */

export function PaymentBlock({ title, rows, total, currency, onAsk }: { title: string; rows: Row[]; total?: number; currency?: string | null; onAsk: Ask }) {
  const [expanded, setExpanded] = useState(false);
  const payments = useMemo(() => rows.map(paymentFacts), [rows]);
  const money = (v: number) => formatMoney(v, currency ?? 'KES');
  const paid = payments.filter((p) => p.state === 'paid');
  const failed = payments.filter((p) => p.state === 'failed').length;
  const visible = expanded ? payments : payments.slice(0, PAGE);
  const all = total ?? payments.length;
  return (
    <Shell title={title}
      note={<>{n(all)} {all === 1 ? 'payment' : 'payments'}{paid.length ? <> · <b className="text-ink-1">{money(paid.reduce((a, p) => a + p.amount, 0))}</b> received</> : ''}{failed ? <> · <b className="text-[var(--ai-text-bad)]">{n(failed)} failed</b></> : ''}</>}>
      <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-[10px] border border-line p-0">
        {visible.map((p, i) => {
          const tone: Tone = p.state === 'paid' ? 'good' : p.state === 'failed' ? 'bad' : 'warn';
          const ask = onAsk ? () => onAsk(p.state === 'failed'
            ? `Why did the payment of ${money(p.amount)} from ${p.phone ?? p.who} fail, and what should I do?`
            : `Tell me about the payment of ${money(p.amount)} from ${p.phone ?? p.who}${p.receipt ? ` (receipt ${p.receipt})` : ''}`) : undefined;
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={ask}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="ai-num text-[15px] font-bold text-ink-1">{money(p.amount)}</span>
                    <span className="min-w-0 truncate text-[13px] text-ink-2">{p.who}</span>
                  </span>
                  <span className={`block truncate text-[12.5px] ${p.reason ? 'text-[var(--ai-text-bad)]' : 'text-ink-3'}`}>
                    {p.reason ?? [p.plan, p.who !== p.phone ? p.phone : null, p.receipt].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <Pill tone={tone}>{p.state === 'paid' ? 'Paid' : p.state === 'failed' ? 'Failed' : 'Pending'}</Pill>
                  <span className="ai-num text-[12px] text-ink-3">{p.when ? whenFmt.format(p.when) : ''}</span>
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      <More shown={visible.length} total={payments.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Shell>
  );
}

/* ---------------- vouchers ---------------- */

export function VoucherBlock({ title, rows, currency }: { title: string; rows: Row[]; currency?: string | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const flash = (key: string) => { setCopied(key); window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600); };
  const codes = rows.map((r) => String(r.code ?? '')).filter(Boolean);
  const plan = (r: Row) => (r.plan && typeof r.plan === 'object' ? (r.plan as Row) : null);
  const first = rows[0] ? plan(rows[0]) : null;
  const label = first ? [first.name, typeof first.duration === 'string' ? first.duration.toLowerCase() : null, typeof first.price === 'number' ? formatMoney(first.price, currency ?? 'KES') : null].filter(Boolean).join(' · ') : '';
  const share = `${label ? `${label}\n` : ''}${codes.join('\n')}`;
  return (
    <Shell title={title} note={`${n(codes.length)} ${codes.length === 1 ? 'code' : 'codes'}${label ? ` · ${label}` : ''}. Tap a code to copy it.`}
      actions={
        <>
          <button type="button" className="ai-btn ai-btn-ghost px-3" onClick={async () => { if (await copyText(share)) flash('all'); }}>
            {copied === 'all' ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />} {copied === 'all' ? 'Copied' : 'Copy all'}
          </button>
          <a className="ai-btn ai-btn-ghost px-3" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </>
      }>
      <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 @lg:grid-cols-3 @3xl:grid-cols-4">
        {rows.map((r, i) => {
          const code = String(r.code ?? '');
          const used = String(r.status ?? '').toLowerCase() !== 'active' && String(r.status ?? '').toLowerCase() !== 'unused' && !!r.status && !!asUtc(r.redeemed_at);
          return (
            <li key={`${code}-${i}`}>
              <button type="button" onClick={async () => { if (await copyText(code)) flash(code); }}
                className={`w-full rounded-[10px] border border-dashed px-2 py-2.5 text-center transition-colors hover:bg-surface-2 ${used ? 'border-line opacity-55' : 'border-line-strong'}`}>
                <span className={`ai-num block truncate font-mono text-[16px] font-bold tracking-wider ${used ? 'text-ink-3 line-through' : 'text-ink-1'}`}>{code}</span>
                <span className="block text-[11.5px] text-ink-3">{copied === code ? 'Copied' : used ? 'Used' : 'Ready'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
