'use client';

/*
 * One customer, the way the classic customer page lays them out, in the chat's
 * design: who they are and how they connect, the paid time left, whether they are
 * on right now (address, live speed, the speed limit the router applies) and, for a
 * PPPoE login that is not, why not; what they used this week and this period against
 * the plan's cap, their devices, their recent payments, how they pay by M-Pesa, and
 * the details people look up. The answer brings the customer record; the parts the
 * record does not carry are fetched here from the same endpoints the classic page
 * uses, and a part that cannot be read is left out rather than shown empty. A part
 * the reader may not see (payments, for a staff member without them) is not asked for.
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { customerFacts, eatTime, EAT_ZONE, paymentFacts, planSpeed, span, type CustomerFacts } from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { copyText } from '../../lib/clipboard';
import { payByMpesaFor, payByMpesaMessage, whatsappShareUrl } from '../../lib/customerPaybill';
import { formatMoney } from '../../lib/format';
import { useT, type TFunction } from '../../lib/i18n';
import { QUEUE_STATUS_LABEL, formatMaxLimit } from '../../lib/live';
import { periodCap } from '../../lib/useCustomerLive';
import type {
  Customer, CustomerDevicesResponse, CustomerPaymentSummary, CustomerUsageResponse, CustomerUsageTimeline, MpesaTransaction, PayByMpesa,
  PPPoECustomerPresenceResponse,
} from '../../lib/types';
import { ColumnChart } from '../charts/ColumnChart';
import { Legend, seriesColor } from '../charts/shared';
import { CheckIcon, CopyIcon } from '../icons';
import { Battery, Led, Meter, Panel, Pill } from '../ui';
import { PERMISSIONS, useOffer } from './access';
import { Action, CUSTOMER_STATE } from './parts';
import { LiveAvatar, LiveState, mbText, Rates } from './LoginsBlock';

type Ask = ((q: string) => void) | undefined;

const WEEK = 7 * 86_400_000;
/** A push report older than this is a last-known state, not "right now". */
const REPORT_MAX_AGE_S = 10 * 60;
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: EAT_ZONE });

interface Extra {
  usage?: CustomerUsageResponse | null;
  payments?: CustomerPaymentSummary | null;
  devices?: CustomerDevicesResponse | null;
  presence?: PPPoECustomerPresenceResponse | null;
  history?: MpesaTransaction[] | null;
  week?: CustomerUsageTimeline | null;
}

/** The parts of a customer the record does not carry, from the classic page's endpoints. */
function useExtra(p: CustomerFacts, row: Row, seePayments: boolean): Extra & { loaded: boolean } {
  const [extra, setExtra] = useState<(Extra & { id: unknown }) | null>(null);
  const id = typeof p.id === 'number' ? p.id : null;
  const hotspot = p.connection === 'Hotspot';
  const pppoe = p.connection === 'PPPoE' && !!p.pppoeUsername;
  // an answer that already holds a part (a usage read, say) is not asked again
  const has = (k: string) => k in row;
  useEffect(() => {
    if (id === null) return;
    let on = true;
    Promise.all([
      has('period') || has('live') ? Promise.resolve(row as unknown as CustomerUsageResponse) : api.getCustomerUsage(id).catch(() => null),
      api.getCustomerPaymentSummary(id).catch(() => null),
      hotspot ? api.getCustomerDevices(id).catch(() => null) : Promise.resolve(null),
      pppoe ? api.getPPPoECustomerPresence(id).catch(() => null) : Promise.resolve(null),
      seePayments ? api.getCustomerPayments(id, 6).catch(() => null) : Promise.resolve(null),
      api.getCustomerUsageTimeline(id, 7, 'day').catch(() => null),
    ]).then(([usage, payments, devices, presence, history, week]) => { if (on) setExtra({ id, usage, payments, devices, presence, history, week }); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hotspot, pppoe, seePayments]);
  return { ...(extra ?? {}), loaded: id === null || extra?.id === id };
}

/** A titled part of the profile. */
function Part({ title, aside, tone, children, wide = false }: { title: string; aside?: React.ReactNode; tone?: Tone; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`ai-well min-w-0 px-3.5 py-3 ${tone === 'bad' ? '!border-bad/35' : tone === 'warn' ? '!border-warn/35' : ''} ${wide ? '@xl:col-span-2' : ''}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h4 className="ai-eyebrow m-0">{title}</h4>
        {aside ? <span className="min-w-0 truncate text-[11.5px] text-ink-3">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

const ageWords = (t: TFunction, seconds: number | null | undefined) => (typeof seconds !== 'number' ? '' : seconds < 60 ? t('just now') : t('{ago} ago', { ago: span(seconds * 1000) }));

function LiveNow({ usage }: { usage: CustomerUsageResponse }) {
  const t = useT();
  const live = usage.live;
  if (!live) return null;
  // an old report says what was true then: never a pulsing "Online" for it
  const stale = typeof live.report_age_seconds === 'number' && live.report_age_seconds > REPORT_MAX_AGE_S;
  return (
    <Part title={stale ? t('Last router report') : t('Right now')} tone={stale ? 'warn' : undefined} aside={`${t('router report')} ${ageWords(t, live.report_age_seconds)}`}>
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-1">
          <Led tone={stale ? 'muted' : live.online ? 'live' : 'muted'} pulse={live.online && !stale} size={7} />
          {stale ? (live.online ? t('Was online') : t('Was offline')) : live.online ? t('Online') : t('Offline')}
        </span>
        {live.ip ? <span className="ai-mono text-[12.5px] text-ink-3">{live.ip}</span> : null}
      </p>
      {stale ? <p className="m-0 mt-1.5 text-[12px] text-ink-3">{t('Not live: the router has not reported for a while.')}</p> : null}
      {live.online && !stale ? (
        <>
          <p className="ai-mono m-0 mt-2 flex flex-wrap gap-x-4 text-[17px] font-medium"><Rates down={live.rate_down_bps ?? 0} up={live.rate_up_bps ?? 0} /></p>
          <p className={`m-0 mt-1.5 text-[12px] ${live.queue_status === 'ok' ? 'text-ink-3' : 'text-[var(--ai-text-warn)]'}`}>
            {t(QUEUE_STATUS_LABEL[live.queue_status])}{live.max_limit ? ` · ${t('limit')} ${formatMaxLimit(live.max_limit)}` : ''}
          </p>
        </>
      ) : null}
    </Part>
  );
}

/** A PPPoE login as the router has it, and when it is not on, why not and what to do. */
function Connection({ presence }: { presence: PPPoECustomerPresenceResponse }) {
  const t = useT();
  const mk = presence.mikrotik;
  const last = presence.last_disconnect;
  const fine = mk.state === 'online';
  const tone: Tone | undefined = mk.state === 'missing' || mk.state === 'disabled' ? 'bad' : mk.state === 'offline' ? 'warn' : undefined;
  const word: Record<string, string> = { online: 'Connected', offline: 'Not connected', missing: 'Login missing on the router', disabled: 'Login disabled on the router', session_unknown: 'Router did not say' };
  const sessions = mk.session_count ?? mk.active_sessions?.length ?? 0;
  return (
    <Part title={t('PPPoE connection')} tone={tone} aside={mk.secret?.profile ? `${t('profile')} ${mk.secret.profile}` : undefined}>
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium text-ink-1">
        <Led tone={fine ? 'live' : tone ?? 'muted'} size={7} />{t(word[mk.state] ?? mk.state)}
        {fine && sessions > 1 ? <span className="text-[12px] font-medium text-[var(--ai-text-warn)]">{t('{n} devices on one login', { n: sessions })}</span> : null}
      </p>
      {!fine && presence.verdict?.message ? <p className="m-0 mt-1.5 text-[12.5px] leading-snug text-ink-2">{presence.verdict.message}</p> : null}
      {!fine && last ? (
        <dl className="m-0 mt-2 grid gap-1.5 text-[12.5px]">
          <div className="flex flex-wrap gap-x-2"><dt className="text-ink-3">{t('Dropped')}</dt><dd className="ai-mono m-0 text-ink-1">{last.at} EAT{last.caller_id ? ` · ${last.caller_id}` : ''}</dd></div>
          {last.probable_cause ? <div className="flex flex-wrap gap-x-2"><dt className="text-ink-3">{t('Likely cause')}</dt><dd className="m-0 text-ink-1">{last.probable_cause}</dd></div> : null}
          {last.technician_action ? <div className="flex flex-wrap gap-x-2"><dt className="text-ink-3">{t('What to do')}</dt><dd className="m-0 text-ink-1">{last.technician_action}</dd></div> : null}
        </dl>
      ) : null}
      {presence.auth_failures && presence.auth_failures.count > 0 ? (
        <p className="m-0 mt-2 text-[12px] text-[var(--ai-text-warn)]">{t('{n} failed sign-ins on the router, last {time}', { n: presence.auth_failures.count, time: presence.auth_failures.last_at ?? '–' })}</p>
      ) : null}
    </Part>
  );
}

function Usage({ usage, planCap }: { usage: CustomerUsageResponse; planCap?: number | null }) {
  const t = useT();
  const period = usage.period;
  const action = (a: string | null | undefined) => (a === 'block' ? t('blocked') : a === 'throttle' ? t('slowed down') : t('flagged'));
  // the period's cap, else the plan's (a period opened before the cap was set has none)
  const { cap, known } = periodCap(usage, planCap);
  if (!period) {
    // a capped plan with no period yet: the cap is still worth knowing
    if (!cap) return null;
    return (
      <Part title={t('Data cap')} aside={usage.plan_fup_period === 'daily' ? t('per day') : t('per period')}>
        <p className="ai-mono m-0 text-[20px] font-medium leading-none text-ink-1">{mbText(cap)}</p>
        <p className="m-0 mt-1.5 text-[12px] text-ink-3">{t('Counting starts at the next renewal')}{usage.plan_fup_action ? `; ${t('over it they are {what}', { what: action(usage.plan_fup_action) })}` : ''}.</p>
      </Part>
    );
  }
  const daily = usage.plan_fup_period === 'daily' && period.fup_window_used_mb != null;
  const used = daily ? period.fup_window_used_mb ?? 0 : period.total_mb;
  const own = period.cap_mb ? (daily ? period.fup_window_percent_used : period.percent_used) : null;
  const pct = cap ? Math.max(0, Math.min(100, own || (used / cap) * 100)) : 0;
  const tone: Tone = period.fup_active ? 'bad' : pct >= 90 ? 'warn' : 'info';
  return (
    <Part title={daily ? t("Today's usage") : t('Used this period')} aside={cap != null ? t('{pct}% of the cap', { pct: pct.toFixed(0) }) : undefined}>
      <p className="m-0 flex items-baseline justify-between gap-3">
        <span className="ai-mono text-[20px] font-medium leading-none text-ink-1">{mbText(used)}</span>
        <span className="text-[12px] text-ink-3">{cap != null ? t('of {cap}', { cap: mbText(cap) }) : known ? t('unlimited') : t('cap not known')}</span>
      </p>
      {cap != null ? <div className="mt-2"><Meter value={used} max={cap} tone={tone} label={`${mbText(used)} / ${mbText(cap)}`} /></div> : null}
      <p className="ai-mono m-0 mt-1.5 text-[11.5px] text-ink-3">{daily ? `${t('this period')} ${mbText(period.total_mb)}` : `↓ ${mbText(period.download_mb)} · ↑ ${mbText(period.upload_mb)}`}</p>
      {period.fup_active ? (
        <p className="m-0 mt-2 rounded-[9px] border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[12.5px] text-ink-1">
          {t('Over the cap: {what} until {when}.', { what: action(period.fup_action_taken || period.fup_action || usage.plan_fup_action), when: daily ? t('midnight') : t('the next renewal') })}
        </p>
      ) : null}
    </Part>
  );
}

/** The last seven days of use, a column a day, download and upload stacked. */
function Week({ week }: { week: CustomerUsageTimeline }) {
  const t = useT();
  const pts = week.points ?? [];
  if (!pts.length || !pts.some((x) => x.total_mb > 0)) return null;
  const peak = week.peak;
  const series = [{ key: 'down', label: t('Download'), color: seriesColor(0) }, { key: 'up', label: t('Upload'), color: seriesColor(1) }];
  const day = (iso: string) => dayFmt.format(new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`));
  return (
    <Part wide title={t('Last 7 days')} aside={`${mbText(week.total_mb)}${peak && peak.total_mb > 0 ? ` · ${t('busiest {day} ({mb})', { day: day(peak.start), mb: mbText(peak.total_mb) })}` : ''}`}>
      <Legend items={series} />
      {/* drawn in GB so the axis reads like the figures beside it */}
      <ColumnChart height={150} stacked series={series} valueLabels={false}
        points={pts.map((x, i) => ({ label: day(x.start), title: day(x.start), values: [x.download_mb / 1024, x.upload_mb / 1024], partial: i === pts.length - 1 }))}
        format={(v) => mbText(v * 1024)} />
    </Part>
  );
}

function Devices({ devices }: { devices: CustomerDevicesResponse }) {
  const t = useT();
  if (!devices.devices.length) return null;
  const on = devices.devices.filter((d) => d.live?.online).length;
  return (
    <Part title={t('Devices')} aside={t('{a} of {b} · {c} online', { a: devices.devices.length, b: devices.max_devices, c: on })}>
      <ul className="m-0 list-none space-y-2 p-0">
        {devices.devices.slice(0, 6).map((d) => (
          <li key={d.device_mac} className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px]">
            <Led tone={d.live?.online ? 'live' : 'muted'} size={6} />
            {/* the speeds sit beside the device when there is room, under it on a phone */}
            <span className="min-w-0 flex-1 basis-[150px]">
              <span className="block truncate text-ink-1">{d.device_name || (d.is_main_device ? t('Main phone') : d.device_type) || t('Device')}</span>
              <span className="ai-mono block truncate text-[11px] text-ink-3">{[d.device_mac, d.live?.ip, d.period_usage_mb ? mbText(d.period_usage_mb) : null].filter(Boolean).join(' · ')}</span>
            </span>
            {d.live?.online ? <span className="ai-mono ml-[16px] flex shrink-0 gap-2 text-[11px] @md:ml-0"><Rates down={d.live.rate_down_bps ?? 0} up={d.live.rate_up_bps ?? 0} /></span> : null}
          </li>
        ))}
      </ul>
    </Part>
  );
}

/** What they have paid in all, and their last payments (expired prompts and free ones said as such). */
function Money({ payments, history, wallet, currency, now }: { payments: CustomerPaymentSummary | null | undefined; history: MpesaTransaction[] | null | undefined; wallet: number | null; currency: string; now: number }) {
  const t = useT();
  const rows = (history ?? []).slice(0, 5).map((tx) => paymentFacts(tx as unknown as Row));
  if (!payments?.paid_count && !wallet && !rows.length) return null;
  const last = payments?.last_paid_at ? new Date(/Z|[+-]\d{2}:?\d{2}$/.test(payments.last_paid_at) ? payments.last_paid_at : `${payments.last_paid_at}Z`) : null;
  const word = { paid: t('Paid'), failed: t('Failed'), pending: t('Pending'), expired: t('Expired') };
  return (
    <Part title={t('Payments')} aside={last ? t('last {ago} ago', { ago: span(now - last.getTime()) }) : undefined}>
      {payments ? (
        <p className="m-0 flex items-baseline justify-between gap-3">
          <span className="ai-mono text-[20px] font-medium leading-none text-ink-1">{formatMoney(payments.total_paid, currency)}</span>
          <span className="text-[12px] text-ink-3">{payments.paid_count === 1 ? t('1 payment') : t('{n} payments', { n: payments.paid_count })}</span>
        </p>
      ) : null}
      {wallet || payments?.not_charged_count ? (
        <p className="m-0 mt-1.5 text-[12px] text-ink-3">
          {[wallet ? t('{amount} credit waiting', { amount: formatMoney(wallet, currency) }) : null,
            payments?.not_charged_count ? t('{n} not charged ({amount})', { n: payments.not_charged_count, amount: formatMoney(payments.not_charged_total, currency) }) : null].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {rows.length ? (
        <ul className="m-0 mt-2.5 list-none divide-y divide-line border-t border-line p-0">
          {rows.map((x, i) => {
            const free = x.state === 'paid' && !x.revenue;
            const tone: Tone = x.state === 'paid' ? (free ? 'muted' : 'good') : x.state === 'failed' ? 'bad' : x.state === 'pending' ? 'warn' : 'muted';
            return (
              <li key={`${x.id}-${i}`} className="flex min-w-0 items-center gap-2.5 py-1.5 text-[12.5px]">
                <Led tone={tone} size={6} />
                <span className="ai-mono w-[92px] shrink-0 text-[11.5px] text-ink-3">{eatTime(x.when)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-3">{free ? x.source ?? t('Free') : x.state === 'paid' ? x.plan ?? x.receipt ?? word.paid : word[x.state]}</span>
                <span className={`ai-mono shrink-0 ${x.state === 'failed' || x.state === 'expired' ? 'text-ink-3 line-through' : free ? 'text-ink-3' : 'text-ink-1'}`}>{formatMoney(x.amount, currency)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Part>
  );
}

const UNAVAILABLE: Record<string, string> = {
  no_paybill: "Their router doesn't collect by paybill and account number: they pay through the M-Pesa prompt.",
  no_account_number: 'No account number yet, so a paybill payment could not be matched to them.',
  no_pppoe_login: 'Add a PPPoE username first: a paybill payment renews the PPPoE login.',
  no_router: 'Assign a router first: a paybill payment renews them on their router.',
  no_plan: 'Assign a plan first: the amount to pay comes from the plan.',
};

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <button type="button" onClick={onCopy} className="ai-tap min-w-0 rounded-[10px] border border-line px-2.5 py-1.5 text-left transition-colors hover:border-accent/50">
      <span className="ai-eyebrow flex items-center justify-between gap-2">{label}{copied ? <CheckIcon width={12} height={12} /> : <CopyIcon width={12} height={12} />}</span>
      <span className="ai-mono mt-0.5 block truncate text-[15px] font-medium text-ink-1">{value}</span>
    </button>
  );
}

/** The paybill and account number they renew with, to copy or send, as on the classic page. */
function PayByMpesa({ card, phone, wallet, currency }: { card: PayByMpesa; phone: string | null; wallet: number | null; currency: string }) {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);
  if (card.unavailable_reason === 'hotspot') return null;
  const ready = !card.unavailable_reason && card.paybill && card.account_number;
  const copy = async (key: string, value: string) => { if (await copyText(value)) { setCopied(key); window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600); } };
  return (
    <Part title={t('Pay by M-Pesa')}>
      {ready ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <CopyField label={t('Paybill')} value={card.paybill!} copied={copied === 'paybill'} onCopy={() => copy('paybill', card.paybill!)} />
            <CopyField label={t('Account')} value={card.account_number!} copied={copied === 'account'} onCopy={() => copy('account', card.account_number!)} />
          </div>
          <p className="m-0 mt-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
            {card.amount != null ? <span className="text-ink-3">{t('Amount')} <span className="ai-mono text-ink-1">{formatMoney(card.amount, currency)}</span></span> : <span />}
            <a className="ai-chip !py-1 text-[12px] font-medium" target="_blank" rel="noopener noreferrer"
              href={whatsappShareUrl(phone, payByMpesaMessage(card, t, (v) => formatMoney(v, currency)))}>{t('Send on WhatsApp')}</a>
          </p>
          {wallet ? <p className="m-0 mt-1.5 text-[12px] text-[var(--ai-text-good)]">{t('{amount} wallet credit counts towards the next payment.', { amount: formatMoney(wallet, currency) })}</p> : null}
        </>
      ) : <p className="m-0 text-[12.5px] leading-snug text-ink-3">{t(UNAVAILABLE[card.unavailable_reason ?? ''] ?? 'No paybill and account number for this customer.')}</p>}
    </Part>
  );
}

export function CustomerProfile({ row, currency, onAsk }: { row: Row; currency?: string | null; onAsk: Ask }) {
  const t = useT();
  const offer = useOffer();
  const [now] = useState(() => Date.now());
  const p = customerFacts(row, now);
  const seePayments = offer.see(PERMISSIONS.transactionsView);
  const extra = useExtra(p, row, seePayments);
  const st = CUSTOMER_STATE[p.state];
  const live = extra.usage?.live;
  const liveFresh = live && !(typeof live.report_age_seconds === 'number' && live.report_age_seconds > REPORT_MAX_AGE_S) ? live : null;
  const devicesOn = extra.devices ? extra.devices.devices.some((d) => d.live?.online) : null;
  const pppoeOn = extra.presence ? (extra.presence.mikrotik.state === 'online' ? true : extra.presence.mikrotik.state === 'session_unknown' ? null : false) : null;
  const online = liveFresh ? liveFresh.online : pppoeOn ?? devicesOn;
  const cur = currency || 'KES';
  const cap = periodCap(extra.usage, p.planCap).cap;
  const about = `${p.name}${p.id !== null ? ` (customer ID ${p.id})` : ''}`;
  const kept = p.state === 'paused' ? p.pausedLeft : p.left !== null && p.left > 0 ? p.left : null;
  const how = p.connection === 'PPPoE' ? p.pppoeUsername : p.connection === 'Static IP' ? p.staticIp : p.mac;
  // the classic page shows the card when the backend sent it (or the paybill it is made from)
  const customer = row as unknown as Customer;
  const card = customer.pay_by_mpesa !== undefined || customer.payment_paybill !== undefined ? payByMpesaFor(customer, null) : null;
  const facts: [string, string | null][] = [
    [t('Plan'), [p.plan, planSpeed(p.planSpeed), p.planPrice !== null ? formatMoney(p.planPrice, cur) : null,
      cap ? `${mbText(cap)} ${t('cap')}${extra.usage?.plan_fup_period === 'daily' ? ` ${t('a day')}` : ''}` : null].filter(Boolean).join(' · ') || null],
    [t('Paid until'), p.expiry ? `${eatTime(p.expiry)} EAT` : null],
    [t('Router'), p.router],
    [p.connection === 'PPPoE' ? t('PPPoE login') : p.connection === 'Static IP' ? t('Static IP') : t('Device MAC'), how],
    [t('Phone'), p.phone],
    [t('Account number'), p.account],
    [t('Grace period'), p.graceMinutes ? (p.graceMinutes >= 60 ? `${Math.round(p.graceMinutes / 60)} h` : `${p.graceMinutes} min`) : null],
    [t('Paying since'), p.tier === 'visitor' ? t('Never paid (visitor)') : null],
  ];
  const manage = offer.change(PERMISSIONS.customersManage);

  return (
    <Panel eyebrow={<>{t('Customer')} · {t(p.connection)}</>} tone={st.tone === 'good' ? undefined : st.tone}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <LiveAvatar name={p.name} size={46} state={online === null ? 'unknown' : online ? 'online' : 'offline'} />
        <div className="min-w-0 flex-1 basis-[160px]">
          <h3 className="ai-display break-words text-[19px] font-semibold text-ink-1">{p.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
            <Pill tone={st.tone}>{t(st.label)}</Pill>
            {online !== null ? <LiveState state={online ? 'online' : 'offline'} /> : null}
            {[p.phone && p.phone !== p.name ? p.phone : null, p.account ? `acc ${p.account}` : null].filter(Boolean).map((x) => <span key={x} className="ai-mono">{x}</span>)}
          </p>
        </div>
        {/* the paid time, read like charge left in a battery (a week is a full charge) */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="ai-eyebrow">{p.state === 'paused' ? t('Time kept') : p.state === 'grace' ? t('In grace') : kept ? t('Paid time left') : t('Paid time')}</p>
            <p className={`ai-mono mt-1 text-[24px] font-medium leading-none ${st.tone === 'bad' ? 'text-[var(--ai-text-bad)]' : st.tone === 'warn' ? 'text-[var(--ai-text-warn)]' : 'text-ink-1'}`}>
              {kept ? span(kept) : p.left !== null && p.left <= 0 ? t('Ended') : '–'}
            </p>
            {p.left !== null && p.left <= 0 && p.expiry ? <p className="mt-1 text-[11.5px] text-ink-3">{t('{ago} ago', { ago: span(p.left) })}</p> : null}
          </div>
          {kept !== null || (p.left !== null && p.state !== 'paused')
            ? <Battery value={Math.max(0, kept ?? 0)} max={WEEK} tone={st.tone === 'muted' ? 'info' : st.tone} label={kept ? `${span(kept)}` : t('No paid time left')} />
            : null}
        </div>
      </div>

      {/* what is happening with them, then what they have; side by side when there is room */}
      <div className="mt-4 grid gap-2.5 @xl:grid-cols-2">
        {extra.presence && (extra.presence.mikrotik.state !== 'online' || !extra.usage?.live) ? <Connection presence={extra.presence} /> : null}
        {extra.usage ? <LiveNow usage={extra.usage} /> : null}
        {extra.usage ? <Usage usage={extra.usage} planCap={p.planCap} /> : null}
        {extra.devices ? <Devices devices={extra.devices} /> : null}
        {extra.week ? <Week week={extra.week} /> : null}
        {extra.payments || extra.history?.length ? <Money payments={extra.payments} history={extra.history} wallet={p.wallet} currency={cur} now={now} /> : null}
        {card ? <PayByMpesa card={card} phone={p.phone} wallet={p.wallet} currency={cur} /> : null}
        {!extra.loaded ? <div className="ai-well h-[92px] animate-pulse @xl:col-span-2" aria-label={t('Loading live state, usage and payments')} /> : null}
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line px-0.5 pt-3 @2xl:grid-cols-3">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="ai-eyebrow">{k}</dt><dd className="mt-1 break-words text-[13.5px] text-ink-1">{v}</dd></div>
        ))}
      </dl>

      {onAsk ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {manage && (p.state === 'expired' || p.state === 'expiring' || p.state === 'grace')
            ? <Action onClick={() => onAsk(`Renew ${about} on their current plan`)}>{t('Renew')}</Action> : null}
          {manage && p.state === 'paused' ? <Action onClick={() => onAsk(`Resume ${about}`)}>{t('Resume')}</Action> : null}
          {manage ? <Action onClick={() => onAsk(`Give ${about} extra time`)}>{t('Add time')}</Action> : null}
          {online === false && p.state !== 'expired' ? <Action onClick={() => onAsk(`${about} has paid but has no internet. Check why.`)}>{t('Why offline?')}</Action>
            : <Action onClick={() => onAsk(`${about} has paid but has no internet. Check why.`)}>{t('No internet?')}</Action>}
          {seePayments ? <Action onClick={() => onAsk(`Show the payments of ${about}`)}>{t('All payments')}</Action> : null}
          <Action onClick={() => onAsk(`Show the usage of ${about} over the last 30 days`)}>{t('Usage, 30 days')}</Action>
          {offer.change(PERMISSIONS.messagingSend) ? <Action onClick={() => onAsk(`Send an SMS to ${about}`)}>{t('Send SMS')}</Action> : null}
        </div>
      ) : null}
    </Panel>
  );
}
