'use client';

import { useMemo, useState } from 'react';
import { asUtc, bpsText, eatTime, span, uptimeText } from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { formatBytes } from '../../lib/live';
import { useCustomerUsage, usageFacts, type UsageFacts } from '../../lib/useCustomerLive';
import { seriesColor, toneColor } from '../charts/shared';
import { ArrowRightIcon } from '../icons';
import { FilterChips, Led, Notice, Panel, Pill } from '../ui';
import { useT } from '../../lib/i18n';

/*
 * Who is logged in on a router, PPPoE or hotspot, drawn the way the classic
 * Customers page draws a customer: who it is (the billing customer's name, the
 * login or device under it), whether it is online right now, and the paid status
 * beside it. Online logins show their live speed, address and how long they have
 * been on; offline ones when they dropped and why, in plain words. On a hotspot,
 * a device let through without paying (bypassed, or online with no customer
 * behind it) is said so, since that is free internet.
 */

type Ask = ((q: string) => void) | undefined;
export type LoginKind = 'pppoe' | 'hotspot';
const PAGE = 8;
const n = (v: number) => v.toLocaleString('en-US');
const obj = (v: unknown): Row | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const yes = (v: unknown) => v === true || v === 'true' || v === 'yes';

export type LoginState = 'online' | 'offline' | 'disabled' | 'router_down';

export interface LoginFacts {
  kind: LoginKind;
  /** the login (PPPoE username, hotspot user) or the device's MAC */
  key: string;
  login: string;
  mac: string;
  name: string;
  customerId: number | null;
  plan: string;
  paid: { label: string; tone: Tone } | null;
  state: LoginState;
  down: number;
  up: number;
  address: string;
  uptime: string;
  idle: string;
  devices: number;
  limit: string;
  usedBytes: number;
  lastSeen: Date | null;
  reason: string;
  /** hotspot: let through without a login (a bypass binding): free internet */
  free: 'bypassed' | null;
  /** a PPPoE login on the router with no billing customer behind it: nobody is billed for it */
  unbilled: boolean;
  how: string;
}

/** "CID:123|Jane Wanjiru|2026-11-02" (how our provisioning writes a comment) -> "Jane Wanjiru". */
export function nameFromComment(comment: string): string {
  const parts = comment.split('|').map((p) => p.trim());
  if (parts.length >= 2 && /^CID:/i.test(parts[0]) && parts[1]) return parts[1];
  // a note someone wrote on the router ("office printer") names the device; our own notes do not
  const plain = comment.trim();
  return plain && plain.length <= 40 && !/^CID:|fallback|^\d+$/i.test(plain) ? plain : '';
}

/** EAT is UTC+3 all year (no daylight saving). */
const EAT_OFFSET_MS = 3 * 3_600_000;

/** RouterOS "nov/20/2026 14:22:10" (v6) or "2026-11-20 14:22:10" (v7): the router's clock, which is EAT, whatever the phone's zone. */
export function routerTime(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  const eat = (y: number, mo: number, d: number, h: number, mi: number, se: number) => new Date(Date.UTC(y, mo, d, h, mi, se) - EAT_OFFSET_MS);
  const v6 = /^([a-z]{3})\/(\d{1,2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/i.exec(s);
  if (v6) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(v6[1].toLowerCase());
    if (month < 0) return null;
    return eat(Number(v6[3]), month, Number(v6[2]), Number(v6[4]), Number(v6[5]), Number(v6[6]));
  }
  const v7 = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (v7) return eat(Number(v7[1]), Number(v7[2]) - 1, Number(v7[3]), Number(v7[4]), Number(v7[5]), Number(v7[6]));
  return null;
}

const REASONS: Record<string, string> = {
  'peer-not-responding': 'device stopped answering',
  'lost-carrier': 'cable or link dropped',
  'hung-up': 'device hung up',
  'user-request': 'device logged out',
  'nas-request': 'router ended it',
  'admin-reset': 'kicked off',
  'session-timeout': 'session time ran out',
  'port-error': 'a port error',
};
/** The router's disconnect reason as people would say it. */
export function reasonText(v: string): string {
  const key = v.trim().toLowerCase();
  return REASONS[key] ?? key.replace(/-/g, ' ');
}

const PAID: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expired: { label: 'Expired', tone: 'bad' },
  inactive: { label: 'Inactive', tone: 'muted' },
  suspended: { label: 'Suspended', tone: 'warn' },
  pending: { label: 'Pending', tone: 'muted' },
};

const HOW: Record<string, string> = { cookie: 'remembered', 'mac-cookie': 'remembered', mac: 'by MAC', http_chap: 'login page', 'http-chap': 'login page', http_pap: 'login page', 'http-pap': 'login page', trial: 'trial' };

export function loginFacts(r: Row, kind: LoginKind, routerDown = false): LoginFacts {
  // the router's own secrets list says "name" and "last_caller_id", and its customer as db_customer
  const c = obj(r.customer) ?? obj(r.db_customer);
  const login = str(r.username) || (kind === 'pppoe' ? str(r.name) : '');
  const mac = str(r.mac_address) || str(r.caller_id) || str(r.last_caller_id);
  const status = str(c?.status).toLowerCase();
  const sessions = Array.isArray(r.sessions) ? r.sessions.length : 0;
  const online = r.online === true;
  const bypassed = kind === 'hotspot' && (yes(r.bypassed) || str(r.binding_type).toLowerCase() === 'bypassed');
  const paid = status ? PAID[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), tone: 'muted' as Tone } : null;
  return {
    kind,
    key: login || mac,
    login, mac,
    // a hotspot "user" is often the MAC itself: then the MAC is not a name worth showing twice
    name: str(c?.name) || nameFromComment(str(r.comment)) || login || mac,
    customerId: typeof c?.id === 'number' ? c.id : null,
    plan: str(c?.plan) || str(r.profile),
    paid,
    // a router that is not answering outranks every login's state: none can be on through it
    state: routerDown ? 'router_down' : yes(r.disabled) ? 'disabled' : online ? 'online' : 'offline',
    down: num(r.download_rate),
    up: num(r.upload_rate),
    address: str(r.address),
    uptime: uptimeText(r.uptime) ?? '',
    idle: uptimeText(r.idle_time) ?? '',
    devices: num(r.session_count) || sessions,
    limit: str(r.max_limit),
    usedBytes: num(r.download_bytes) + num(r.upload_bytes),
    lastSeen: routerTime(str(r.last_logged_out)) ?? asUtc(r.last_logged_out),
    reason: str(r.last_disconnect_reason),
    // a session with no customer behind it may be a voucher, so only a bypass is called free
    free: bypassed ? 'bypassed' : null,
    // a hotspot session with no customer may be a voucher, so only a PPPoE login is called unbilled
    unbilled: kind === 'pppoe' && !c,
    how: HOW[str(r.login_by).toLowerCase()] ?? str(r.login_by).replace(/[-_]/g, ' '),
  };
}

const STATE: Record<LoginState, { label: string; tone: Tone }> = {
  online: { label: 'Online', tone: 'info' },
  offline: { label: 'Offline', tone: 'muted' },
  disabled: { label: 'Disabled', tone: 'warn' },
  router_down: { label: 'Router offline', tone: 'warn' },
};

/** The avatar the classic card uses: the initial, coloured by the login's live state. */
export function LiveAvatar({ name, state, size = 36 }: { name: string; state: LoginState | 'unknown'; size?: number }) {
  const color = state === 'unknown' ? toneColor('info') : toneColor(state === 'online' ? 'good' : state === 'offline' ? 'bad' : 'warn');
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[11px] font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4, color, background: `color-mix(in srgb, ${color} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 30%, transparent)` }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Whether something is on right now, in one mark used everywhere: a dot and the word, online in the live colour. */
export function LiveState({ state }: { state: LoginState }) {
  const t = useT();
  const st = STATE[state];
  return (
    <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: state === 'online' ? toneColor('info') : undefined }}>
      <Led tone={st.tone} size={6} />{t(st.label)}
    </span>
  );
}

/** "12 GB" / "1.5 GB" from megabytes. */
export const mbText = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(v >= 10_240 ? 0 : 1)} GB` : `${Math.round(v)} MB`);

/** This period's use against the plan's cap: "12 GB of 50 GB · 24%", amber near the cap, red over it. */
export function UsageMark({ u }: { u: UsageFacts }) {
  const t = useT();
  const tone = u.over ? 'text-[var(--ai-text-bad)]' : u.pct !== null && u.pct >= 80 ? 'text-[var(--ai-text-warn)]' : '';
  const used = mbText(u.used);
  const title = u.cap !== null
    ? t(u.daily ? 'Used {used} of the {cap} cap today' : 'Used {used} of the {cap} cap this period', { used, cap: mbText(u.cap) })
    : u.capKnown ? t(u.daily ? 'Used {used} today, no cap' : 'Used {used} this period, no cap', { used })
      : t(u.daily ? 'Used {used} today; the cap is not known' : 'Used {used} this period; the cap is not known', { used });
  return (
    <span className={tone} title={title}>
      <span className="ai-mono">{used}</span>
      {u.cap !== null ? <>{` ${t('of')} `}<span className="ai-mono">{mbText(u.cap)}</span>{u.over ? ` · ${t('over cap')}` : u.pct !== null ? ` · ${Math.round(u.pct)}%` : ''}</> : u.daily ? ` ${t('today')}` : ` ${t('used')}`}
    </span>
  );
}

/** One line of facts that never grows the row: in order of importance, the end cut with an ellipsis when narrow. */
export function FactLine({ children }: { children: React.ReactNode }) {
  return <span className="mt-0.5 block truncate text-[11.5px] leading-[18px] text-ink-3 [&>*]:mr-2.5 [&>*:last-child]:mr-0">{children}</span>;
}

/** "6.0 Mbps" -> ["6.0", "Mbps"], to say the unit once when both speeds share it. */
const unitOf = (t: string) => { const i = t.lastIndexOf(' '); return [t.slice(0, i), t.slice(i + 1)]; };

/** Live speed down and up, the colours the classic pages use. */
export function Rates({ down, up }: { down: number; up: number }) {
  const d = bpsText(down) ?? '0 bps';
  const u = bpsText(up) ?? '0 bps';
  const [dv, du] = unitOf(d);
  const [uv, uu] = unitOf(u);
  if (du === uu) {
    return (
      <span className="whitespace-nowrap">
        <span className="text-accent">↓ {dv}</span> <span style={{ color: seriesColor(1) }}>↑ {uv}</span> {du}
      </span>
    );
  }
  return (
    <>
      <span className="mr-2 whitespace-nowrap text-accent">↓ {bpsText(down) ?? '0 bps'}</span>
      <span className="whitespace-nowrap" style={{ color: seriesColor(1) }}>↑ {bpsText(up) ?? '0 bps'}</span>
    </>
  );
}

/** What a login is doing, in one line that starts with its state: live speed, address, time on and
 *  what it used when on; when and why it dropped when off. */
function LiveLine({ p, now, usage }: { p: LoginFacts; now: number; usage: UsageFacts | null }) {
  const t = useT();
  const ago = p.lastSeen ? now - p.lastSeen.getTime() : null;
  return (
    <FactLine>
      <LiveState state={p.state} />
      {p.state === 'online' ? (
        <>
          {p.devices > 1 ? <span className="font-medium text-[var(--ai-text-warn)]">{t('{n} devices', { n: p.devices })}</span> : null}
          {/* use against a cap comes before the speeds (it is what needs acting on), use without one after */}
          {usage?.cap != null ? <UsageMark u={usage} /> : null}
          <span className="ai-mono"><Rates down={p.down} up={p.up} /></span>
          {usage && usage.cap == null ? <UsageMark u={usage} /> : !usage && p.usedBytes > 0 ? <span className="ai-mono" title={t('Used in this session')}>{formatBytes(p.usedBytes)}</span> : null}
          {p.address ? <span className="ai-mono">{p.address}</span> : null}
          {p.uptime ? <span>{t('on {time}', { time: p.uptime })}</span> : null}
          {p.idle && p.down < 1000 ? <span>{t('idle {time}', { time: p.idle })}</span> : null}
        </>
      ) : p.state === 'disabled' ? <span>{t('switched off on the router')}</span>
        : p.state === 'router_down' ? <span>{t('the router is not answering')}</span> : (
          <>
            {ago !== null && ago > 0 ? <span title={`${eatTime(p.lastSeen)} EAT`}>{t('dropped {time} ago', { time: span(ago) })}</span> : null}
            {p.reason ? <span title={t(reasonText(p.reason))}>{t(reasonText(p.reason))}</span> : null}
            {usage?.cap != null ? <UsageMark u={usage} /> : null}
          </>
        )}
    </FactLine>
  );
}

/** Under the name: the login or device, the plan, the speed limit. */
export function subLine(p: LoginFacts): string {
  // the login (PPPoE) or the login and the MAC (hotspot), leaving out what the name already says
  const ids = (p.kind === 'pppoe' ? [p.login] : [p.login, p.mac]).filter((x, i, all) => x && x !== p.name && all.indexOf(x) === i);
  return [...ids, p.plan, p.limit && p.state === 'online' ? p.limit : null, p.state === 'online' && p.how ? p.how : null]
    .filter(Boolean).join(' · ');
}

/** How fresh a monitor read is: the router's answer, its age, and when the router was last seen. */
export interface ReadFreshness { routerDown: boolean; stale: boolean; ageSeconds: number | null; lastOnline: Date | null }

/** The freshness fields the hotspot and PPPoE monitor endpoints send (MonitorFreshness). Pure, for tests. */
export function readFreshness(payload: unknown): ReadFreshness {
  const p = obj(payload) ?? {};
  const age = typeof p.cache_age_seconds === 'number' ? p.cache_age_seconds : null;
  return {
    routerDown: p.router_reachable === false,
    // a cached read older than ten minutes is a last-known list, not who is on now
    stale: p.stale === true || (age !== null && age > 600),
    ageSeconds: age,
    lastOnline: asUtc(p.router_last_online_at),
  };
}

export function LoginsBlock({ title, rows, kind, routerDown, fresh, onAsk }: { title: string; rows: Row[]; kind: LoginKind; routerDown?: boolean; fresh?: ReadFreshness; onAsk: Ask }) {
  const t = useT();
  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'unbilled'>('all');
  const [expanded, setExpanded] = useState(false);
  const down = routerDown || fresh?.routerDown === true;
  const logins = useMemo(() => rows.map((r) => loginFacts(r, kind, down)).filter((p) => p.key), [rows, kind, down]);
  const usage = useCustomerUsage(logins.flatMap((p) => (p.customerId !== null ? [p.customerId] : [])));
  const online = logins.filter((p) => p.state === 'online').length;
  const disabled = logins.filter((p) => p.state === 'disabled').length;
  // paid but not on: the ones a reseller gets called about; on for free: the ones that cost money
  const paidOff = logins.filter((p) => p.state === 'offline' && p.paid?.tone === 'good').length;
  const free = logins.filter((p) => p.free && p.state === 'online').length;
  const unbilled = logins.filter((p) => p.unbilled).length;
  const unbilledOn = logins.filter((p) => p.unbilled && p.state === 'online').length;
  const rank = (p: LoginFacts) => ((p.free || p.unbilled) && p.state === 'online' ? 0 : p.state === 'online' ? 1 : p.state === 'offline' && p.paid?.tone === 'good' ? 2 : p.state === 'offline' ? 3 : 4);
  const list = logins
    .filter((p) => filter === 'all' || (filter === 'unbilled' ? p.unbilled : filter === 'online' ? p.state === 'online' : p.state !== 'online'))
    .sort((a, b) => rank(a) - rank(b) || (rank(a) <= 1 ? b.down - a.down : (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0)));
  const visible = expanded ? list : list.slice(0, PAGE);
  const what = kind === 'pppoe' ? 'PPPoE login' : 'hotspot device';
  const about = (p: LoginFacts) => (p.customerId !== null
    ? `${p.name} (customer ID ${p.customerId}, ${what} ${p.login || p.mac})`
    : `the ${what} ${p.login || p.mac}${p.mac && p.login && p.login !== p.mac ? ` (MAC ${p.mac})` : ''}`);
  const question = (p: LoginFacts) => (p.free && p.state === 'online' ? `Why does ${about(p)} have internet without paying?`
    : p.unbilled ? `${about(p)} has no billing customer. Who is it, and should it be billed or removed?`
      : p.state === 'offline' && p.paid?.tone === 'good' ? `Why is ${about(p)} offline?` : `Tell me about ${about(p)}`);
  if (!logins.length) return null;
  const ago = fresh?.lastOnline ? span(now - fresh.lastOnline.getTime()) : null;
  const count = kind === 'pppoe' ? (logins.length === 1 ? t('login') : t('logins')) : (logins.length === 1 ? t('device') : t('devices'));

  return (
    <Panel eyebrow={<>{kind === 'pppoe' ? 'PPPoE' : t('Hotspot')} · {n(logins.length)} {count}</>}
      title={title} tone={down || free || unbilledOn ? 'warn' : undefined}
      note={down ? <b className="font-semibold text-[var(--ai-text-warn)]">{t('Router not answering: last known list')}</b> : (
        <><span style={{ color: toneColor('info') }}>{t('{n} online', { n: n(online) })}</span> · {t('{n} offline', { n: n(logins.length - online - disabled) })}{disabled ? ` · ${t('{n} disabled', { n: n(disabled) })}` : ''}
          {free ? <> · <b className="font-semibold text-[var(--ai-text-warn)]">{t('{n} on without paying', { n: n(free) })}</b></> : null}
          {unbilled ? <> · <b className="font-semibold text-[var(--ai-text-warn)]">{t('{n} not billed', { n: n(unbilled) })}</b></> : null}</>
      )}
      actions={onAsk && !down && (paidOff > 0 || free > 0 || unbilled > 0) ? (
        <>
          {free > 0 ? <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={() => onAsk('Which hotspot devices have internet without paying, and how do I stop it?')}>{t('{n} without paying', { n: n(free) })}</button> : null}
          {unbilled > 0 ? <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={() => onAsk('Which PPPoE logins on this router have no billing customer, and what should I do with them?')}>{t('{n} not billed', { n: n(unbilled) })}</button> : null}
          {paidOff > 0 ? <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={() => onAsk(`Which paid ${kind === 'pppoe' ? 'PPPoE' : 'hotspot'} customers are offline right now, and why?`)}>{t('{n} paid but offline', { n: n(paidOff) })}</button> : null}
        </>
      ) : null}>
      {down ? (
        <Notice tone="bad" title={t('The router is not answering')}>
          {ago ? t('Last seen {ago} ago ({time} EAT).', { ago, time: eatTime(fresh?.lastOnline) }) : null}{' '}
          {t('This is the last list it gave: nobody here can be online through it now.')}
        </Notice>
      ) : fresh?.stale ? (
        <Notice tone="warn">{fresh.ageSeconds !== null ? t('This list is from {ago} ago, not live.', { ago: span(fresh.ageSeconds * 1000) }) : t('This list is not live.')}</Notice>
      ) : null}
      <div className="mb-3 empty:hidden">
        <FilterChips label={t('Filter')} value={filter} onChange={(k) => { setFilter(k); setExpanded(false); }} options={[
          { key: 'all', label: t('All'), count: logins.length },
          { key: 'online', label: t('Online'), count: online < logins.length ? online : 0, tone: 'info' },
          { key: 'offline', label: t('Not online'), count: online > 0 ? logins.length - online : 0 },
          { key: 'unbilled', label: t('Not billed'), count: unbilled < logins.length ? unbilled : 0, tone: 'warn' },
        ]} />
      </div>
      <ul className="ai-well m-0 list-none divide-y divide-line overflow-hidden p-0">
        {visible.map((p) => {
          const body = (
            <>
              <LiveAvatar name={p.name} state={p.state} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="break-words text-[14px] font-medium text-ink-1">{p.name}</span>
                  {p.paid ? <Pill tone={p.paid.tone}>{t(p.paid.label)}</Pill> : null}
                  {p.free ? <Pill tone="warn">{t('Bypassed: free')}</Pill> : null}
                  {p.unbilled ? <Pill tone="warn">{t('Not billed')}</Pill> : null}
                </span>
                <span className="block truncate text-[12px] text-ink-3">{subLine(p)}</span>
                <LiveLine p={p} now={now} usage={p.customerId !== null ? usageFacts(usage.get(p.customerId)) : null} />
              </span>
            </>
          );
          return (
            <li key={p.key}>
              {onAsk ? (
                <button type="button" onClick={() => onAsk(question(p))}
                  className="group flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2">
                  {body}
                  <ArrowRightIcon width={13} height={13} className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100 [@media(pointer:coarse)]:opacity-60" />
                </button>
              ) : <div className="flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5">{body}</div>}
            </li>
          );
        })}
      </ul>
      {list.length > PAGE ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 text-[12px] text-ink-3">
          <span className="ai-mono">{n(visible.length)} / {n(list.length)}</span>
          <button type="button" className="ai-tap font-semibold text-accent hover:underline" onClick={() => setExpanded((v) => !v)}>{expanded ? t('Show fewer') : t('Show all {n}', { n: n(list.length) })}</button>
        </div>
      ) : null}
    </Panel>
  );
}
