'use client';

import { useMemo, useState } from 'react';
import {
  asUtc, customerCounts, customerFacts, eatTime, inCustomerFilter, paymentFacts, paymentTotals, planDuration, planSpeed, routerFacts, span,
  type ConnectionFilter, type CustomerFacts, type CustomerFilter, type CustomerState, type OnlineNow, type PaymentFacts, type TierFilter,
} from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { copyText } from '../../lib/clipboard';
import { formatMoney } from '../../lib/format';
import { useT, type TFunction } from '../../lib/i18n';
import { mbText } from './LoginsBlock';
import { toneColor } from '../charts/shared';
import { ArrowRightIcon, CheckIcon, CopyIcon } from '../icons';
import { FilterChips, Led, Notice, Panel, Pill } from '../ui';
import { DeviceCard } from './DeviceCard';
import { CustomerProfile } from './CustomerProfile';
import { FactLine, LiveAvatar, LiveState, Rates, UsageMark } from './LoginsBlock';
import { useCustomerLive, useCustomerUsage, usageFacts, type CustomerLive, type RouterRead } from '../../lib/useCustomerLive';
import { MONEY_VIEW, PERMISSIONS, useOffer } from './access';
import { Action, CUSTOMER_STATE } from './parts';

/*
 * The billing parts of an answer. A list of customers is not a table of columns: it
 * is people with a plan and time left. A router is a device that is up or down. A
 * payment went through or it did not, and a voucher is a ticket to hand over. Each
 * kind gets a component made for it, and every row or button is a next step: a tap
 * asks the assistant, which looks it up or prepares the change for a Confirm. A step
 * the reader may not take (a view-only staff member, a read-only view) is not shown.
 * Times are in EAT.
 */

type Ask = ((question: string) => void) | undefined;
const PAGE = 8;
const n = (v: number) => v.toLocaleString('en-US');

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
  const t = useT();
  if (total <= PAGE) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 text-[12px] text-ink-3">
      <span className="ai-mono">{n(shown)} / {n(total)}</span>
      <button type="button" className="ai-tap font-semibold text-accent hover:underline" onClick={onToggle}>{expanded ? t('Show fewer') : t('Show all {n}', { n: n(total) })}</button>
    </div>
  );
}

/* ---------------- customers ---------------- */

const timeLeft = (t: TFunction, left: number | null, state: CustomerState) =>
  left === null ? '' : state === 'paused' ? t('{time} kept', { time: span(left) }) : left <= 0 ? t('ended {time} ago', { time: span(left) }) : t('{time} left', { time: span(left) });

export function CustomerBlock({ title, rows, total, single, currency, onAsk }: { title: string; rows: Row[]; total?: number; single: boolean; currency?: string | null; onAsk: Ask }) {
  if (single && rows.length === 1) return <CustomerProfile row={rows[0]} currency={currency} onAsk={onAsk} />;
  return <CustomerList title={title} rows={rows} total={total} onAsk={onAsk} />;
}

/** The customers' routers that did not answer, with when each was last seen. */
function RouterDownNotice({ people, routers, now }: { people: CustomerFacts[]; routers: Map<number, RouterRead>; now: number }) {
  const t = useT();
  const down = [...routers.values()].filter((r) => r.reachable === false);
  const old = [...routers.values()].filter((r) => r.reachable !== false && r.stale);
  if (!down.length && !old.length) return null;
  return (
    <>
      {down.map((r) => {
        const on = people.filter((p) => p.routerId === r.id && p.connection !== 'Static IP');
        const name = on[0]?.router ?? t('Router {id}', { id: r.id });
        const ago = r.lastOnline ? span(now - r.lastOnline.getTime()) : null;
        return (
          <Notice key={r.id} tone="bad" title={t('{router} is not answering', { router: name })}>
            {ago ? t('Last seen {ago} ago ({time} EAT).', { ago, time: eatTime(r.lastOnline) }) : t('It has not answered our checks.')}{' '}
            {t('Nobody on it can be online, so its {n} customers here show "Router offline", not offline.', { n: n(on.length) })}
          </Notice>
        );
      })}
      {old.map((r) => {
        const name = people.find((p) => p.routerId === r.id)?.router ?? t('Router {id}', { id: r.id });
        return (
          <Notice key={`s${r.id}`} tone="warn">
            {t('Who is online on {router} is from {ago} ago, not live.', { router: name, ago: span((r.ageSeconds ?? 0) * 1000) })}
          </Notice>
        );
      })}
    </>
  );
}

function CustomerList({ title, rows, total, onAsk }: { title: string; rows: Row[]; total?: number; onAsk: Ask }) {
  const t = useT();
  const offer = useOffer();
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const [conn, setConn] = useState<ConnectionFilter>('all');
  const [tier, setTier] = useState<TierFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => Date.now());
  const people = useMemo(() => rows.map((r) => customerFacts(r, now)), [rows, now]);
  const { live: monitored, routers, loaded } = useCustomerLive(people);
  const usage = useCustomerUsage(people.flatMap((p) => (typeof p.id === 'number' ? [p.id] : [])));
  // the router's own push report wins (as on the classic page); it also covers static IP customers
  const live = useMemo(() => {
    const out = new Map<string | number, CustomerLive>(monitored);
    for (const [id, u] of usage) {
      if (!u.live || out.get(id)?.state === 'router_down') continue;
      out.set(id, { state: u.live.online ? 'online' : 'offline', down: u.live.rate_down_bps ?? 0, up: u.live.rate_up_bps ?? 0, address: u.live.ip ?? out.get(id)?.address ?? null });
    }
    return out;
  }, [monitored, usage]);
  const isOn = (s: CustomerState) => s === 'active' || s === 'expiring' || s === 'grace';
  const liveOf = (p: CustomerFacts) => (p.id !== null ? live.get(p.id) : undefined);
  // anything not positively on is not on; behind a router that is down nobody can be, so they are not counted "offline" (the banner says why)
  const onlineOf = (p: CustomerFacts): OnlineNow => { const s = liveOf(p)?.state; return s === undefined || s === 'router_down' ? null : s === 'online'; };
  const counts = customerCounts(people, onlineOf);
  const paid = people.filter((p) => isOn(p.state)).length;
  const soon = people.filter((p) => p.state === 'expiring').length;
  const lapsed = counts.filters.overdue;
  const onlineNow = counts.filters.online;
  // paid up but not on (a down router aside): the ones who will call
  const paidOff = people.filter((p) => isOn(p.state) && liveOf(p)?.state === 'offline').length;
  const routerDown = people.filter((p) => liveOf(p)?.state === 'router_down').length;
  const lastSeen = (p: CustomerFacts) => (p.routerId !== null ? routers.get(p.routerId)?.lastOnline ?? null : null);
  const about = (p: CustomerFacts) => `${p.name}${p.id !== null ? ` (customer ID ${p.id})` : ''}`;

  const order = (s: CustomerState) => (s === 'expiring' || s === 'grace' ? 0 : s === 'active' ? 1 : s === 'expired' ? 2 : 3);
  const list = people
    .filter((p) => inCustomerFilter(p, filter, onlineOf(p)) && (conn === 'all' || p.connection === conn) && (tier === 'all' || p.tier === tier))
    .sort((a, b) => order(a.state) - order(b.state) || (order(a.state) === 2 ? (b.left ?? 0) - (a.left ?? 0) : (a.left ?? Infinity) - (b.left ?? Infinity)));
  const visible = expanded ? list : list.slice(0, PAGE);
  const all = total ?? people.length;
  const reset = () => setExpanded(false);
  const statusOptions: { key: CustomerFilter; label: string; count: number; tone?: Tone }[] = [
    { key: 'all', label: t('All'), count: counts.filters.all },
    { key: 'active', label: t('Active'), count: counts.filters.active, tone: 'good' },
    { key: 'online', label: t('Online now'), count: counts.filters.online, tone: 'info' },
    { key: 'offline', label: t('Paid, offline'), count: counts.filters.offline, tone: 'warn' },
    { key: 'overdue', label: t('Overdue'), count: counts.filters.overdue, tone: 'bad' },
    { key: 'paused', label: t('Paused'), count: counts.filters.paused, tone: 'muted' },
    { key: 'inactive', label: t('Inactive'), count: counts.filters.inactive, tone: 'muted' },
  ];
  const connOptions: { key: ConnectionFilter; label: string; count: number }[] = [
    { key: 'all', label: t('Every connection'), count: counts.connections.all },
    { key: 'Hotspot', label: t('Hotspot'), count: counts.connections.Hotspot },
    { key: 'PPPoE', label: 'PPPoE', count: counts.connections.PPPoE },
    { key: 'Static IP', label: t('Static IP'), count: counts.connections['Static IP'] },
  ];
  const tierOptions: { key: TierFilter; label: string; count: number }[] = [
    { key: 'all', label: t('Paying and visitors'), count: counts.tiers.all },
    { key: 'customer', label: t('Paying'), count: counts.tiers.customer },
    { key: 'visitor', label: t('Visitors'), count: counts.tiers.visitor },
  ];
  // a filter row that narrows nothing is left out
  const showConn = connOptions.filter((o) => o.key !== 'all' && o.count > 0).length >= 2;
  const showTier = counts.tiers.customer > 0 && counts.tiers.visitor > 0;
  const remind = soon > 0 && offer.change(PERMISSIONS.messagingSend);
  const winBack = lapsed > 0 && offer.change(PERMISSIONS.messagingSend);

  return (
    <Panel eyebrow={<>{t('Customers')} · {n(all)}</>} title={title} tone={routerDown ? 'bad' : undefined}
      note={<>{all > people.length ? `${t('{n} loaded', { n: n(people.length) })} · ` : ''}<span className="text-[var(--ai-text-good)]">{t('{n} paid up', { n: n(paid) })}</span> · {t('{n} not', { n: n(people.length - paid) })}
        {onlineNow ? <> · <span style={{ color: toneColor('info') }}>{t('{n} online now', { n: n(onlineNow) })}</span></> : null}
        {showTier ? <> · {t('{n} never paid', { n: n(counts.tiers.visitor) })}</> : null}</>}
      actions={onAsk && (paidOff > 0 || remind || winBack) ? (
        <>
          {paidOff > 0 ? <Action onClick={() => onAsk('Which paid customers are offline right now, and why?')}>{t('{n} paid but offline', { n: n(paidOff) })}</Action> : null}
          {remind ? <Action onClick={() => onAsk('Send an expiry reminder SMS to the customers who expire in the next 24 hours')}>{t('Remind {n} expiring', { n: n(soon) })}</Action> : null}
          {winBack ? <Action onClick={() => onAsk('Send a renewal reminder SMS to the customers who expired in the last 7 days')}>{t('Win back {n}', { n: n(lapsed) })}</Action> : null}
        </>
      ) : null}>
      {loaded ? <RouterDownNotice people={people} routers={routers} now={now} /> : null}
      <div className="mb-3 flex flex-col gap-2 empty:hidden">
        <FilterChips label={t('Filter by status')} value={filter} options={statusOptions} onChange={(k) => { setFilter(k); reset(); }} />
        {showConn || showTier ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {showConn ? <FilterChips size="sm" label={t('Filter by connection')} value={conn} options={connOptions} onChange={(k) => { setConn(k); reset(); }} /> : null}
            {showTier ? <FilterChips size="sm" label={t('Paying or visitor')} value={tier} options={tierOptions} onChange={(k) => { setTier(k); reset(); }} /> : null}
          </div>
        ) : null}
      </div>
      {list.length === 0 ? <p className="ai-well px-3.5 py-3 text-[13px] text-ink-3">{t('No customers under this filter.')}</p> : (
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">
        {visible.map((p, i) => {
          const st = CUSTOMER_STATE[p.state];
          const lv = liveOf(p);
          const used = typeof p.id === 'number' ? usageFacts(usage.get(p.id)) : null;
          // under the name, as on the classic card: how the router knows them, then the plan and router
          const known = p.connection === 'Static IP' ? `${t('Static IP')} ${p.staticIp ?? ''}`.trim() : p.account ? `acc ${p.account}` : p.pppoeUsername ?? (p.name !== p.phone ? p.phone : null);
          const checking = !loaded && p.routerId !== null && p.connection !== 'Static IP';
          const seen = lv?.state === 'router_down' ? lastSeen(p) : null;
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={onAsk ? () => onAsk(lv?.state === 'router_down' ? `Why is ${p.router ?? 'the router'} of ${about(p)} offline?`
                : lv?.state === 'offline' && isOn(p.state) ? `Why is ${about(p)} offline?` : `Tell me about ${about(p)}`) : undefined}>
                <LiveAvatar name={p.name} state={lv ? lv.state : 'unknown'} />
                <span className="min-w-0 flex-1">
                  {/* the name, and on its line the paid state and the time left, so the lines under it get the full width */}
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="break-words text-[14px] font-medium text-ink-1">{p.name}</span>
                      {p.connection === 'PPPoE' ? <span className="text-[11px] font-medium text-ink-3">PPPoE</span> : null}
                      {p.tier === 'visitor' ? <span className="text-[11px] font-medium text-ink-3" title={t('Registered, never paid')}>{t('Visitor')}</span> : null}
                    </span>
                    <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-3" title={t(st.label)}>
                      <Led tone={st.tone} size={6} /><span className="hidden font-medium text-ink-2 @md:inline">{t(st.label)} ·</span>
                      <span className="ai-mono">{timeLeft(t, p.state === 'paused' ? p.pausedLeft : p.left, p.state) || t(st.label)}</span>
                    </span>
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">{[known, p.plan, p.router].filter(Boolean).join(' · ')}</span>
                  {lv || used ? (
                    <FactLine>
                      {lv ? <LiveState state={lv.state} /> : null}
                      {seen ? <span>{t('last seen {ago} ago', { ago: span(now - seen.getTime()) })}</span> : null}
                      {used?.cap != null ? <UsageMark u={used} /> : null}
                      {lv?.state === 'online' ? <span className="ai-mono"><Rates down={lv.down} up={lv.up} /></span> : null}
                      {used && used.cap == null ? <UsageMark u={used} /> : null}
                      {lv?.state === 'online' && lv.address ? <span className="ai-mono">{lv.address}</span> : null}
                    </FactLine>
                  ) : checking ? <span className="mt-1.5 block h-2.5 w-24 animate-pulse rounded bg-surface-3" aria-label={t('Checking who is online')} /> : null}
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      )}
      <More shown={visible.length} total={list.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- routers ---------------- */

export function RouterBlock({ title, rows, onAsk }: { title: string; rows: Row[]; onAsk: Ask }) {
  const t = useT();
  const offer = useOffer();
  const [now] = useState(() => Date.now());
  const routers = useMemo(() => rows.map((r) => routerFacts(r, now)).sort((a, b) => (a.state === 'offline' ? 0 : 1) - (b.state === 'offline' ? 0 : 1)), [rows, now]);
  const online = routers.filter((r) => r.state === 'online').length;
  const offline = routers.filter((r) => r.state === 'offline').length;
  const stale = routers.filter((r) => r.stale).length;
  return (
    <Panel eyebrow={<>{t('Network')} · {n(routers.length)} {routers.length === 1 ? t('router') : t('routers')}</>} title={title} tone={offline ? 'bad' : undefined}
      note={<>{t('{a} of {b} online', { a: n(online), b: n(routers.length) })}{offline ? <> · <b className="font-semibold text-[var(--ai-text-bad)]">{t('{n} offline', { n: n(offline) })}</b></> : ''}
        {stale ? <> · <span className="text-[var(--ai-text-warn)]">{t('{n} not checked recently', { n: n(stale) })}</span></> : null}</>}>
      <ul className="m-0 grid list-none gap-3 p-0 @xl:grid-cols-2">
        {routers.map((r, i) => {
          const named = `router ${r.name}${r.id !== null ? ` (ID ${r.id})` : ''}`;
          const why = r.state === 'offline' ? `Why is ${named} offline, and how do I fix it?` : `Check the health of ${named}`;
          return (
            <DeviceCard key={`${r.id}-${i}`}
              d={{ id: r.id, name: r.name, model: r.identity, state: r.state, downFor: r.state === 'offline' && r.since ? span(now - r.since.getTime()) : null, reach: r.uptime, emergency: r.emergency,
                stale: r.stale, checkedAgo: r.checkedAt ? span(now - r.checkedAt.getTime()) : null, checkedAt: r.checkedAt, lastOnline: r.lastOnline }}
              onOpen={onAsk ? () => onAsk(why) : undefined}
              actions={onAsk ? (
                <>
                  <Action onClick={() => onAsk(why)}>{r.state === 'offline' ? t('Why is it down?') : t('Check health')}</Action>
                  {offer.see(PERMISSIONS.customersView) ? <Action onClick={() => onAsk(`Which customers are on ${named}, and who is online now?`)}>{t('Customers')}</Action> : null}
                  {offer.see(MONEY_VIEW) ? <Action onClick={() => onAsk(`How much did ${named} make in the last 7 days?`)}>{t('Revenue')}</Action> : null}
                </>
              ) : null} />
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---------------- plans ---------------- */

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

/** A plan record in the facts its card shows. Pure, for tests. */
export function planFacts(r: Row, currency?: string | null) {
  const type = String(r.connection_type ?? 'hotspot').toLowerCase();
  const price = num(r.price) ?? 0;
  const router = r.router && typeof r.router === 'object' ? (r.router as Row).name : r.router_name;
  const cap = num(r.data_cap_mb);
  const fup = typeof r.fup_period === 'string' ? r.fup_period : null;
  return {
    name: String(r.name ?? 'Plan'),
    type,
    typeLabel: type === 'pppoe' ? 'PPPoE' : type === 'static_ip' ? 'Static IP' : 'Hotspot',
    price: price > 0 ? formatMoney(price, currency ?? 'KES') : 'Free',
    speed: planSpeed(r.speed),
    duration: planDuration(r),
    hidden: r.is_hidden === true,
    badge: typeof r.badge_text === 'string' && r.badge_text ? r.badge_text : null,
    cap: cap && cap > 0 ? `${mbText(cap)}${fup === 'daily' ? ' a day' : ''}` : null,
    devices: num(r.max_devices),
    router: typeof router === 'string' && router ? router : null,
    customers: num(r.active_customers) ?? num(r.customer_count) ?? num(r.customers),
    description: typeof r.description === 'string' && r.description.trim() ? r.description.trim() : null,
  };
}

/** Plans as spec cards: the price large, then what it buys, then what to do with it. */
export function PlanBlock({ title, rows, currency, onAsk }: { title: string; rows: Row[]; currency?: string | null; onAsk: Ask }) {
  const t = useT();
  const offer = useOffer();
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const plans = rows.map((r, i) => ({ key: `${r.id}-${i}`, ...planFacts(r, currency) }));
  const canEdit = offer.change(PERMISSIONS.plansManage);
  const actions = (p: (typeof plans)[number]) => onAsk ? (
    <>
      {p.type === 'hotspot' && offer.change(PERMISSIONS.vouchersGenerate) ? <Action onClick={() => onAsk(`Generate 10 vouchers for the ${p.name} plan`)}>{t('Vouchers')}</Action> : null}
      {offer.see(MONEY_VIEW) ? <Action onClick={() => onAsk(`How is the ${p.name} plan selling?`)}>{t('Sales')}</Action> : null}
      {canEdit ? <Action onClick={() => onAsk(`Change the ${p.name} plan`)}>{t('Edit')}</Action> : null}
      <Action onClick={() => onAsk(`Tell me everything about the ${p.name} plan: who is on it and how it sells`)}>{t('Details')}</Action>
    </>
  ) : null;
  const specs = (p: (typeof plans)[number]): [string, string][] => [
    [t('Time'), p.duration], [t('Speed'), p.speed ?? ''], [t('Data'), p.cap ?? (p.type === 'hotspot' || p.type === 'pppoe' ? t('Unlimited') : '')],
    [t('Devices'), p.devices ? String(p.devices) : ''], [t('Router'), p.router ?? ''], [t('Customers'), p.customers !== null ? n(p.customers) : ''],
  ].filter(([, v]) => v) as [string, string][];
  const visible = expanded ? plans : plans.slice(0, PAGE);
  const hidden = plans.filter((p) => p.hidden).length;
  return (
    <Panel eyebrow={<>{t('Plans')} · {n(rows.length)}</>} title={title}
      note={hidden ? t('{n} hidden from the login page', { n: n(hidden) }) : undefined}
      actions={onAsk && canEdit ? <Action onClick={() => onAsk('Create a new plan')}>{t('New plan')}</Action> : null}>
      {/* narrow (a phone): one compact row per plan; a tap opens it in place */}
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0 @xl:hidden">
        {visible.map((p, i) => {
          const isOpen = open === i;
          return (
            <li key={p.key}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="min-w-0 break-words text-[14px] font-medium text-ink-1">{p.name}</span>
                    {p.hidden ? <Pill tone="muted" dot={false}>{t('Hidden')}</Pill> : null}
                    {p.badge ? <Pill tone="info" dot={false}>{p.badge}</Pill> : null}
                  </span>
                  <span className="ai-mono mt-0.5 block truncate text-[11.5px] text-ink-3">{[p.duration, p.speed, p.cap, t(p.typeLabel)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="ai-mono shrink-0 text-[15px] font-medium text-ink-1">{p.price === 'Free' ? t('Free') : p.price}</span>
                <ArrowRightIcon width={12} height={12} className={`shrink-0 text-ink-3 transition-transform ${isOpen ? 'rotate-90 text-accent' : ''}`} />
              </button>
              {isOpen ? (
                <div className="ai-rise px-3.5 pb-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-2.5">
                    {specs(p).map(([k, v]) => <div key={k} className="min-w-0"><dt className="ai-eyebrow">{k}</dt><dd className="ai-mono mt-0.5 break-words text-[12.5px] text-ink-1">{v}</dd></div>)}
                  </dl>
                  {p.description ? <p className="mt-2 text-[12.5px] text-ink-3">{p.description}</p> : null}
                  {onAsk ? <div className="mt-2.5 flex flex-wrap gap-1.5">{actions(p)}</div> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {/* with room: a spec card per plan */}
      <ul className="m-0 hidden list-none grid-cols-2 gap-2.5 p-0 @xl:grid @3xl:grid-cols-3">
        {visible.map((p) => (
          <li key={p.key} className="ai-well flex flex-col p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="ai-eyebrow">{t(p.typeLabel)}</span>
              <span className="flex-1" />
              {p.hidden ? <Pill tone="muted" dot={false}>{t('Hidden')}</Pill> : null}
              {p.badge ? <Pill tone="info" dot={false}>{p.badge}</Pill> : null}
            </div>
            <p className="mt-2 break-words text-[14px] font-medium text-ink-1">{p.name}</p>
            <p className="ai-mono mt-1 text-[24px] font-medium leading-tight tracking-tight text-ink-1">{p.price === 'Free' ? t('Free') : p.price}</p>
            <dl className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5">
              {specs(p).map(([k, v]) => <div key={k} className="min-w-0"><dt className="ai-eyebrow">{k}</dt><dd className="ai-mono mt-0.5 truncate text-[12.5px] text-ink-1" title={v}>{v}</dd></div>)}
            </dl>
            {p.description ? <p className="mt-2 line-clamp-2 text-[12px] text-ink-3">{p.description}</p> : null}
            {onAsk ? <div className="mt-auto flex flex-wrap gap-1.5 pt-3">{actions(p)}</div> : null}
          </li>
        ))}
      </ul>
      <More shown={visible.length} total={plans.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- payments ---------------- */

type PaymentFilter = 'all' | PaymentFacts['state'] | 'free';
const PAYMENT_TONE = (p: PaymentFacts): Tone => (p.state === 'paid' ? (p.revenue ? 'good' : 'muted') : p.state === 'failed' ? 'bad' : p.state === 'pending' ? 'warn' : 'muted');
const PAYMENT_WORD: Record<PaymentFacts['state'], string> = { paid: 'Paid', failed: 'Failed', pending: 'Pending', expired: 'Expired' };

/** Payments as a ledger: the amount in mono, who paid and for what, and whether it went through. */
export function PaymentBlock({ title, rows, total, currency, onAsk }: { title: string; rows: Row[]; total?: number; currency?: string | null; onAsk: Ask }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const payments = useMemo(() => rows.map(paymentFacts), [rows]);
  const money = (v: number) => formatMoney(v, currency ?? 'KES');
  const sum = paymentTotals(payments);
  const list = payments.filter((p) => filter === 'all' || (filter === 'free' ? p.state === 'paid' && !p.revenue : filter === 'paid' ? p.state === 'paid' && p.revenue : p.state === filter));
  const visible = expanded ? list : list.slice(0, PAGE);
  const all = total ?? payments.length;
  const parts = [
    sum.freeCount ? t('{n} free (not revenue)', { n: n(sum.freeCount) }) : null,
    sum.pending ? t('{n} pending', { n: n(sum.pending) }) : null,
    sum.expired ? (sum.expired === 1 ? t('1 prompt expired') : t('{n} prompts expired', { n: n(sum.expired) })) : null,
  ].filter(Boolean);
  return (
    <Panel eyebrow={<>{t('Payments')} · {n(all)}</>} title={title} tone={sum.failed ? 'warn' : undefined}
      note={<>
        {sum.receivedCount ? <><span className="ai-mono text-ink-1">{money(sum.received)}</span> {t('received')}</> : t('No money in')}
        {all > payments.length ? ` ${t('in the {n} loaded', { n: n(payments.length) })}` : ''}
        {sum.failed ? <> · <b className="font-semibold text-[var(--ai-text-bad)]">{t('{n} failed', { n: n(sum.failed) })}</b></> : ''}
        {parts.length ? ` · ${parts.join(' · ')}` : ''}
      </>}>
      <div className="mb-3 empty:hidden">
        <FilterChips label={t('Filter by status')} value={filter} onChange={(k) => { setFilter(k); setExpanded(false); }} options={[
          { key: 'all', label: t('All'), count: payments.length },
          { key: 'paid', label: t('Paid'), count: sum.receivedCount, tone: 'good' },
          { key: 'free', label: t('Free'), count: sum.freeCount, tone: 'muted' },
          { key: 'failed', label: t('Failed'), count: sum.failed, tone: 'bad' },
          { key: 'pending', label: t('Pending'), count: sum.pending, tone: 'warn' },
          { key: 'expired', label: t('Expired'), count: sum.expired, tone: 'muted' },
        ]} />
      </div>
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">
        {visible.map((p, i) => {
          const from = p.phone ?? p.who;
          const ask = onAsk ? () => onAsk(p.state === 'failed'
            ? `Why did the payment of ${money(p.amount)} from ${from} fail, and what should I do?`
            : p.state === 'expired' ? `The M-Pesa prompt for ${money(p.amount)} to ${from} expired. Did they pay another way, and are they still connected?`
              : `Tell me about the payment of ${money(p.amount)} from ${from}${p.receipt ? ` (receipt ${p.receipt})` : ''}`) : undefined;
          const free = p.state === 'paid' && !p.revenue;
          const sub = p.reason ?? (p.state === 'expired' ? t('Prompt not answered in time') : [p.plan, p.who !== p.phone ? p.phone : null, p.source ?? p.method, p.receipt].filter(Boolean).join(' · '));
          return (
            <li key={`${p.id}-${i}`}>
              <Line onClick={ask}>
                <Led tone={PAYMENT_TONE(p)} size={7} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="break-words text-[13.5px] text-ink-1">{p.who}</span>
                    {free ? <Pill tone="muted" dot={false}>{p.source ?? t('Free')}</Pill> : null}
                    {p.state === 'expired' ? <Pill tone="muted" dot={false}>{t('Expired')}</Pill> : null}
                  </span>
                  <span className={`block truncate text-[12px] ${p.reason ? 'text-[var(--ai-text-bad)]' : 'text-ink-3'}`}>{sub}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`ai-mono text-[14px] font-medium ${p.state === 'failed' || p.state === 'expired' ? 'text-ink-3 line-through decoration-1' : free ? 'text-ink-3' : 'text-ink-1'}`}
                    title={free ? t('Not counted as revenue') : undefined}>{money(p.amount)}</span>
                  <span className="ai-mono text-[11px] text-ink-3">{p.when ? eatTime(p.when) : t(PAYMENT_WORD[p.state])}</span>
                </span>
              </Line>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11.5px] text-ink-3">{t('Times in EAT')}</p>
      <More shown={visible.length} total={list.length} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
    </Panel>
  );
}

/* ---------------- vouchers ---------------- */

/** Vouchers as tickets: a code in mono over a perforated edge, tap to copy. */
export function VoucherBlock({ title, rows, currency }: { title: string; rows: Row[]; currency?: string | null }) {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);
  const flash = (key: string) => { setCopied(key); window.setTimeout(() => setCopied((cur) => (cur === key ? null : cur)), 1600); };
  const plan = (r: Row) => (r.plan && typeof r.plan === 'object' ? (r.plan as Row) : null);
  const isUsed = (r: Row) => {
    const status = String(r.status ?? '').toLowerCase();
    return status === 'used' || status === 'redeemed' || (!!status && status !== 'active' && status !== 'unused' && !!asUtc(r.redeemed_at));
  };
  const tickets = rows.map((r) => ({ code: String(r.code ?? ''), used: isUsed(r), redeemed: asUtc(r.redeemed_at), plan: plan(r) })).filter((x) => x.code);
  const ready = tickets.filter((x) => !x.used);
  const first = tickets[0]?.plan ?? null;
  const label = first ? [first.name, typeof first.duration === 'string' ? first.duration.toLowerCase() : null, typeof first.price === 'number' ? formatMoney(first.price, currency ?? 'KES') : null].filter(Boolean).join(' · ') : '';
  // what is handed over is the codes that still work
  const share = `${label ? `${label}\n` : ''}${(ready.length ? ready : tickets).map((x) => x.code).join('\n')}`;
  const used = tickets.length - ready.length;
  return (
    <Panel eyebrow={<>{t('Vouchers')} · {n(tickets.length)}</>} title={title}
      note={`${label ? `${label}. ` : ''}${used ? `${t('{a} ready, {b} used', { a: n(ready.length), b: n(used) })}. ` : ''}${t('Tap a code to copy it.')}`}
      actions={
        <>
          <button type="button" className="ai-btn ai-btn-ghost !py-1.5 px-3 text-[12.5px]" onClick={async () => { if (await copyText(share)) flash('all'); }}>
            {copied === 'all' ? <CheckIcon width={13} height={13} /> : <CopyIcon width={13} height={13} />} {copied === 'all' ? t('Copied') : used && ready.length ? t('Copy {n} ready', { n: n(ready.length) }) : t('Copy all')}
          </button>
          <a className="ai-btn ai-btn-ghost !py-1.5 px-3 text-[12.5px]" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </>
      }>
      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 @lg:grid-cols-3 @3xl:grid-cols-4">
        {tickets.map((x, i) => (
          <li key={`${x.code}-${i}`}>
            <button type="button" onClick={async () => { if (await copyText(x.code)) flash(x.code); }}
              title={x.used && x.redeemed ? `${t('Used')} ${eatTime(x.redeemed)} EAT` : undefined}
              className={`group relative w-full overflow-hidden rounded-[12px] border text-center transition-colors hover:border-accent/50 ${x.used ? 'border-line opacity-55' : 'border-line-strong'}`}
              style={{ background: x.used ? undefined : 'linear-gradient(180deg, var(--ai-accent-soft), transparent 70%)' }}>
              <span className={`ai-mono block truncate px-2 pb-2 pt-3 text-[16px] font-medium tracking-[0.12em] ${x.used ? 'text-ink-3 line-through' : 'text-ink-1'}`}>{x.code}</span>
              {/* the perforation: a dashed line with a notch cut into each side */}
              <span aria-hidden className="relative block border-t border-dashed border-line-strong">
                <span className="absolute -left-[7px] -top-[6px] h-3 w-3 rounded-full bg-[var(--ai-s1)] shadow-[inset_-1px_0_0_var(--ai-line2)]" />
                <span className="absolute -right-[7px] -top-[6px] h-3 w-3 rounded-full bg-[var(--ai-s1)] shadow-[inset_1px_0_0_var(--ai-line2)]" />
              </span>
              <span className={`ai-eyebrow block truncate px-1 py-1.5 ${copied === x.code ? '!text-[var(--ai-text-good)]' : ''}`}>
                {copied === x.code ? t('Copied') : x.used ? (x.redeemed ? `${t('Used')} ${eatTime(x.redeemed)}` : t('Used')) : t('Ready')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
