'use client';

/*
 * One customer, the way the classic customer page lays them out, in the chat's
 * design: who they are and how they connect, the paid time left, whether they are
 * on right now (address, live speed, the speed limit the router applies), what they
 * used this period against the plan's cap, their devices, what they have paid, and
 * the details people look up. The answer brings the customer record; the parts the
 * record does not carry (live state, usage, devices, payments) are fetched here
 * from the same endpoints the classic page uses, and a part that cannot be read is
 * left out rather than shown empty.
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { customerFacts, planSpeed, span, type CustomerFacts, type CustomerState } from '../../lib/assistantEntities';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { formatMoney } from '../../lib/format';
import { QUEUE_STATUS_LABEL, formatAge, formatMaxLimit } from '../../lib/live';
import type { CustomerDevicesResponse, CustomerPaymentSummary, CustomerUsageResponse } from '../../lib/types';
import { Battery, Led, Meter, Panel, Pill } from '../ui';
import { LiveAvatar, LiveState, Rates } from './LoginsBlock';

type Ask = ((q: string) => void) | undefined;

const CUSTOMER: Record<CustomerState, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  expiring: { label: 'Expires soon', tone: 'warn' },
  grace: { label: 'In grace', tone: 'warn' },
  expired: { label: 'Expired', tone: 'bad' },
  paused: { label: 'Paused', tone: 'muted' },
  inactive: { label: 'Inactive', tone: 'muted' },
};
const WEEK = 7 * 86_400_000;
const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Nairobi' });
const mb = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(v >= 10_240 ? 0 : 1)} GB` : `${Math.round(v)} MB`);

interface Extra {
  usage?: CustomerUsageResponse | null;
  payments?: CustomerPaymentSummary | null;
  devices?: CustomerDevicesResponse | null;
}

/** The parts of a customer the record does not carry, from the classic page's endpoints. */
function useExtra(p: CustomerFacts, row: Row): Extra & { loaded: boolean } {
  const [extra, setExtra] = useState<(Extra & { id: unknown }) | null>(null);
  const id = typeof p.id === 'number' ? p.id : null;
  const hotspot = p.connection === 'Hotspot';
  // an answer that already holds a part (a usage read, say) is not asked again
  const has = (k: string) => k in row;
  useEffect(() => {
    if (id === null) return;
    let on = true;
    Promise.all([
      has('period') || has('live') ? Promise.resolve(row as unknown as CustomerUsageResponse) : api.getCustomerUsage(id).catch(() => null),
      api.getCustomerPaymentSummary(id).catch(() => null),
      hotspot ? api.getCustomerDevices(id).catch(() => null) : Promise.resolve(null),
    ]).then(([usage, payments, devices]) => { if (on) setExtra({ id, usage, payments, devices }); });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hotspot]);
  return { ...(extra ?? {}), loaded: id === null || extra?.id === id };
}

/** A titled part of the profile. */
function Part({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ai-well min-w-0 px-3.5 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="ai-eyebrow m-0">{title}</h4>
        {aside ? <span className="truncate text-[11.5px] text-ink-3">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function LiveNow({ usage }: { usage: CustomerUsageResponse }) {
  const live = usage.live;
  if (!live) return null;
  return (
    <Part title="Right now" aside={`router report ${formatAge(live.report_age_seconds)}`}>
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-1"><Led tone={live.online ? 'live' : 'muted'} pulse={live.online} size={7} />{live.online ? 'Online' : 'Offline'}</span>
        {live.ip ? <span className="ai-mono text-[12.5px] text-ink-3">{live.ip}</span> : null}
      </p>
      {live.online ? (
        <>
          <p className="ai-mono m-0 mt-2 flex flex-wrap gap-x-4 text-[17px] font-medium"><Rates down={live.rate_down_bps ?? 0} up={live.rate_up_bps ?? 0} /></p>
          <p className={`m-0 mt-1.5 text-[12px] ${live.queue_status === 'ok' ? 'text-ink-3' : 'text-[var(--ai-text-warn)]'}`}>
            {QUEUE_STATUS_LABEL[live.queue_status]}{live.max_limit ? ` · limit ${formatMaxLimit(live.max_limit)}` : ''}
          </p>
        </>
      ) : null}
    </Part>
  );
}

function Usage({ usage }: { usage: CustomerUsageResponse }) {
  const period = usage.period;
  if (!period) {
    // a capped plan with no period yet: the cap is still worth knowing
    if (!usage.plan_data_cap_mb) return null;
    const over = usage.plan_fup_action === 'block' ? 'blocked' : usage.plan_fup_action === 'throttle' ? 'slowed down' : 'flagged';
    return (
      <Part title="Data cap" aside={usage.plan_fup_period === 'daily' ? 'per day' : 'per period'}>
        <p className="ai-mono m-0 text-[20px] font-medium leading-none text-ink-1">{mb(usage.plan_data_cap_mb)}</p>
        <p className="m-0 mt-1.5 text-[12px] text-ink-3">Counting starts at the next renewal{usage.plan_fup_action ? `; over it they are ${over}` : ''}.</p>
      </Part>
    );
  }
  const daily = usage.plan_fup_period === 'daily' && period.fup_window_used_mb != null;
  const used = daily ? period.fup_window_used_mb ?? 0 : period.total_mb;
  const cap = period.cap_mb;
  const pct = Math.max(0, Math.min(100, (daily ? period.fup_window_percent_used : period.percent_used) || 0));
  const tone: Tone = period.fup_active ? 'bad' : pct >= 90 ? 'warn' : 'info';
  const action = period.fup_action_taken || period.fup_action || usage.plan_fup_action;
  return (
    <Part title={daily ? "Today's usage" : 'Used this period'} aside={cap != null ? `${pct.toFixed(0)}% of the cap` : undefined}>
      <p className="m-0 flex items-baseline justify-between gap-3">
        <span className="ai-mono text-[20px] font-medium leading-none text-ink-1">{mb(used)}</span>
        <span className="text-[12px] text-ink-3">{cap != null ? `of ${mb(cap)}` : 'unlimited'}</span>
      </p>
      {cap != null ? <div className="mt-2"><Meter value={used} max={cap} tone={tone} label={`${mb(used)} of ${mb(cap)}`} /></div> : null}
      <p className="ai-mono m-0 mt-1.5 text-[11.5px] text-ink-3">{daily ? `this period ${mb(period.total_mb)}` : `↓ ${mb(period.download_mb)} · ↑ ${mb(period.upload_mb)}`}</p>
      {period.fup_active ? (
        <p className="m-0 mt-2 rounded-[9px] border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[12.5px] text-ink-1">
          Over the cap: {action === 'block' ? 'blocked' : action === 'throttle' ? 'slowed down' : 'flagged'} until {daily ? 'midnight' : 'the next renewal'}.
        </p>
      ) : null}
    </Part>
  );
}

function Devices({ devices }: { devices: CustomerDevicesResponse }) {
  if (!devices.devices.length) return null;
  const on = devices.devices.filter((d) => d.live?.online).length;
  return (
    <Part title="Devices" aside={`${devices.devices.length} of ${devices.max_devices} · ${on} online`}>
      <ul className="m-0 list-none space-y-2 p-0">
        {devices.devices.slice(0, 6).map((d) => (
          <li key={d.device_mac} className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px]">
            <Led tone={d.live?.online ? 'live' : 'muted'} size={6} />
            {/* the speeds sit beside the device when there is room, under it on a phone */}
            <span className="min-w-[170px] flex-1">
              <span className="block truncate text-ink-1">{d.device_name || (d.is_main_device ? 'Main phone' : d.device_type) || 'Device'}</span>
              <span className="ai-mono block truncate text-[11px] text-ink-3">{[d.device_mac, d.live?.ip, d.period_usage_mb ? mb(d.period_usage_mb) : null].filter(Boolean).join(' · ')}</span>
            </span>
            {d.live?.online ? <span className="ai-mono ml-[16px] flex shrink-0 gap-2 text-[11px] @md:ml-0"><Rates down={d.live.rate_down_bps ?? 0} up={d.live.rate_up_bps ?? 0} /></span> : null}
          </li>
        ))}
      </ul>
    </Part>
  );
}

function Money({ payments, wallet, currency, now }: { payments: CustomerPaymentSummary; wallet: number | null; currency: string; now: number }) {
  if (!payments.paid_count && !wallet) return null;
  const last = payments.last_paid_at ? new Date(/Z|[+-]\d{2}:?\d{2}$/.test(payments.last_paid_at) ? payments.last_paid_at : `${payments.last_paid_at}Z`) : null;
  return (
    <Part title="Payments" aside={last ? `last ${span(now - last.getTime())} ago` : undefined}>
      <p className="m-0 flex items-baseline justify-between gap-3">
        <span className="ai-mono text-[20px] font-medium leading-none text-ink-1">{formatMoney(payments.total_paid, currency)}</span>
        <span className="text-[12px] text-ink-3">{payments.paid_count} {payments.paid_count === 1 ? 'payment' : 'payments'}</span>
      </p>
      {wallet || payments.not_charged_count ? (
        <p className="m-0 mt-1.5 text-[12px] text-ink-3">
          {[wallet ? `${formatMoney(wallet, currency)} credit waiting` : null,
            payments.not_charged_count ? `${payments.not_charged_count} not charged (${formatMoney(payments.not_charged_total, currency)})` : null].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </Part>
  );
}

export function CustomerProfile({ row, currency, onAsk }: { row: Row; currency?: string | null; onAsk: Ask }) {
  const [now] = useState(() => Date.now());
  const p = customerFacts(row, now);
  const extra = useExtra(p, row);
  const st = CUSTOMER[p.state];
  const live = extra.usage?.live;
  const devicesOn = extra.devices ? extra.devices.devices.some((d) => d.live?.online) : null;
  const online = live ? live.online : devicesOn;
  const cur = currency || 'KES';
  const plan = row.plan && typeof row.plan === 'object' ? (row.plan as Row) : null;
  const cap = extra.usage?.period?.cap_mb ?? extra.usage?.plan_data_cap_mb ?? (typeof plan?.data_cap_mb === 'number' ? plan.data_cap_mb : null);
  const about = `${p.name}${p.id !== null ? ` (customer ID ${p.id})` : ''}`;
  const kept = p.state === 'paused' ? p.pausedLeft : p.left !== null && p.left > 0 ? p.left : null;
  const how = p.connection === 'PPPoE' ? p.pppoeUsername : p.connection === 'Static IP' ? p.staticIp : p.mac;
  const facts: [string, string | null][] = [
    ['Plan', [p.plan, planSpeed(p.planSpeed), p.planPrice !== null ? formatMoney(p.planPrice, cur) : null,
      cap ? `${mb(cap)} cap${extra.usage?.plan_fup_period === 'daily' ? ' a day' : ''}` : null].filter(Boolean).join(' · ') || null],
    ['Paid until', p.expiry ? whenFmt.format(p.expiry) : null],
    ['Router', p.router],
    [p.connection === 'PPPoE' ? 'PPPoE login' : p.connection === 'Static IP' ? 'Static IP' : 'Device MAC', how],
    ['Phone', p.phone],
    ['Account number', p.account],
    ['Grace period', p.graceMinutes ? (p.graceMinutes >= 60 ? `${Math.round(p.graceMinutes / 60)} h` : `${p.graceMinutes} min`) : null],
  ];

  return (
    <Panel eyebrow={<>Customer · {p.connection}</>} tone={st.tone === 'good' ? undefined : st.tone}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <LiveAvatar name={p.name} size={46} state={online === null ? 'unknown' : online ? 'online' : 'offline'} />
        <div className="min-w-0 flex-1 basis-[160px]">
          <h3 className="ai-display break-words text-[19px] font-semibold text-ink-1">{p.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
            <Pill tone={st.tone}>{st.label}</Pill>
            {online !== null ? <LiveState state={online ? 'online' : 'offline'} /> : null}
            {[p.phone && p.phone !== p.name ? p.phone : null, p.account ? `acc ${p.account}` : null].filter(Boolean).map((t) => <span key={t} className="ai-mono">{t}</span>)}
          </p>
        </div>
        {/* the paid time, read like charge left in a battery (a week is a full charge) */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="ai-eyebrow">{p.state === 'paused' ? 'Time kept' : p.state === 'grace' ? 'In grace' : kept ? 'Paid time left' : 'Paid time'}</p>
            <p className={`ai-mono mt-1 text-[24px] font-medium leading-none ${st.tone === 'bad' ? 'text-[var(--ai-text-bad)]' : st.tone === 'warn' ? 'text-[var(--ai-text-warn)]' : 'text-ink-1'}`}>
              {kept ? span(kept) : p.left !== null && p.left <= 0 ? 'Ended' : '–'}
            </p>
            {p.left !== null && p.left <= 0 && p.expiry ? <p className="mt-1 text-[11.5px] text-ink-3">{span(p.left)} ago</p> : null}
          </div>
          {kept !== null || (p.left !== null && p.state !== 'paused')
            ? <Battery value={Math.max(0, kept ?? 0)} max={WEEK} tone={st.tone === 'muted' ? 'info' : st.tone} label={kept ? `${span(kept)} of paid time` : 'No paid time left'} />
            : null}
        </div>
      </div>

      {/* what is happening with them, then what they have; side by side when there is room */}
      <div className="mt-4 grid gap-2.5 @xl:grid-cols-2">
        {extra.usage ? <LiveNow usage={extra.usage} /> : null}
        {extra.usage ? <Usage usage={extra.usage} /> : null}
        {extra.devices ? <Devices devices={extra.devices} /> : null}
        {extra.payments ? <Money payments={extra.payments} wallet={p.wallet} currency={cur} now={now} /> : null}
        {!extra.loaded ? <div className="ai-well h-[92px] animate-pulse @xl:col-span-2" aria-label="Loading live state, usage and payments" /> : null}
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line px-0.5 pt-3 @2xl:grid-cols-3">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="min-w-0"><dt className="ai-eyebrow">{k}</dt><dd className="mt-1 break-words text-[13.5px] text-ink-1">{v}</dd></div>
        ))}
      </dl>

      {onAsk ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.state === 'expired' || p.state === 'expiring' || p.state === 'grace'
            ? <Action onClick={() => onAsk(`Renew ${about} on their current plan`)}>Renew</Action> : null}
          {p.state === 'paused' ? <Action onClick={() => onAsk(`Resume ${about}`)}>Resume</Action> : null}
          <Action onClick={() => onAsk(`Give ${about} extra time`)}>Add time</Action>
          {online === false && p.state !== 'expired' ? <Action onClick={() => onAsk(`${about} has paid but has no internet. Check why.`)}>Why offline?</Action>
            : <Action onClick={() => onAsk(`${about} has paid but has no internet. Check why.`)}>No internet?</Action>}
          <Action onClick={() => onAsk(`Show the payments of ${about}`)}>Payments</Action>
          <Action onClick={() => onAsk(`Show the usage of ${about} over the last 7 days`)}>Usage chart</Action>
          <Action onClick={() => onAsk(`Send an SMS to ${about}`)}>Send SMS</Action>
        </div>
      ) : null}
    </Panel>
  );
}

const Action = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={onClick}>{children}</button>
);
