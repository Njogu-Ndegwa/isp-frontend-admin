'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Tone } from '../../lib/assistantVisual';
import { useT } from '../../lib/i18n';
import type { RouterUptimeResponse, UptimeTimelineSlice } from '../../lib/types';
import { toneColor } from '../charts/shared';
import { ArrowRightIcon } from '../icons';
import { Cells, Dial, Led, Meter, Pill, Throughput, useInView } from '../ui';

/*
 * One MikroTik, drawn like a device in a network console: a status light and its
 * name, the board and RouterOS version in mono, CPU and memory as arc gauges, people
 * online and paying, and live traffic. A router that is down says so first, with who
 * it cuts off. Used on the home screen and in answers, so a router looks the same
 * wherever it appears.
 */

export interface Device {
  id: number | string | null;
  name: string;
  /** board · RouterOS version, or the identity when it sends no report */
  model?: string | null;
  state: 'online' | 'offline' | 'unknown';
  /** how long it has been down, already worded ("3 h") */
  downFor?: string | null;
  cpu?: number | null;
  memory?: number | null;
  down?: string | null;
  up?: string | null;
  uptime?: string | null;
  hotspot?: number | null;
  pppoe?: number | null;
  /** customers with paid time on it */
  customers?: number | null;
  /** share of checks that reached it */
  reach?: number | null;
  emergency?: boolean;
}

const UPTIME_HOURS = 168;
const SLICES = 42;   // a week in 4-hour slices, as a status page draws it

/** A week of uptime for one router, read once the card is on screen (the classic Routers page's data). */
function useUptime(id: Device['id'], seen: boolean): RouterUptimeResponse | null {
  const [data, setData] = useState<RouterUptimeResponse | null>(null);
  const routerId = typeof id === 'number' ? id : Number(id);
  useEffect(() => {
    if (!seen || !Number.isFinite(routerId) || routerId <= 0) return;
    let on = true;
    api.getRouterUptime(routerId, UPTIME_HOURS, 1).then((r) => { if (on) setData(r); }).catch(() => { /* the card works without it */ });
    return () => { on = false; };
  }, [seen, routerId]);
  return data;
}

/** The timeline in a fixed number of slices: a slice is as bad as the worst moment in it. */
export function weekSlices(timeline: UptimeTimelineSlice[], count = SLICES): UptimeTimelineSlice[] {
  if (timeline.length <= count) return timeline;
  const rank = { down: 3, partial: 2, up: 1, no_data: 0 } as const;
  const out: UptimeTimelineSlice[] = [];
  const per = timeline.length / count;
  for (let i = 0; i < count; i++) {
    const part = timeline.slice(Math.floor(i * per), Math.floor((i + 1) * per));
    if (!part.length) continue;
    const known = part.filter((x) => x.status !== 'no_data');
    const worst = known.reduce<UptimeTimelineSlice['status']>((w, x) => (rank[x.status] > rank[w] ? x.status : w), known.length ? 'up' : 'no_data');
    // down only when it was down throughout; a short drop inside a slice is "partly down"
    const status = worst === 'down' && known.some((x) => x.status !== 'down') ? 'partial' : worst;
    out.push({ from: part[0].from, to: part[part.length - 1].to, status, downtime_seconds: part.reduce((a, x) => a + (x.downtime_seconds || 0), 0) });
  }
  return out;
}

const downtimeText = (seconds: number): string => {
  const m = Math.round(seconds / 60);
  if (m < 1) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${Math.round(h / 24)} d`;
};
const SLICE: Record<string, string> = { up: 'var(--ai-good)', partial: 'var(--ai-warn)', down: 'var(--ai-bad)', no_data: 'var(--ai-track)' };

/** The week as the classic Routers page shows it: one bar per slice, green up, amber partly down, red down. */
function UptimeStrip({ data, restart }: { data: RouterUptimeResponse; restart?: string | null }) {
  const t = useT();
  const slices = weekSlices(data.timeline ?? []);
  const pct = data.window.uptime_percentage;
  const outages = data.window.outage_count ?? 0;
  const down = downtimeText(data.window.downtime_seconds ?? 0);
  const tone = pct === null ? 'text-ink-3' : pct >= 99 ? 'text-[var(--ai-text-good)]' : pct >= 95 ? 'text-ink-1' : pct >= 90 ? 'text-[var(--ai-text-warn)]' : 'text-[var(--ai-text-bad)]';
  if (!slices.length) return null;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="ai-eyebrow">{t('Uptime · 7 days')}</span>
        <span className={`ai-mono text-[15px] font-medium ${tone}`}>{pct === null ? '–' : `${pct.toFixed(pct >= 99.95 ? 0 : 1)}%`}</span>
      </div>
      <div className="mt-1.5 flex h-7 items-stretch gap-[2px]" role="img"
        aria-label={`${t('Uptime · 7 days')} ${pct === null ? '' : `${pct.toFixed(1)}%`}, ${outages} ${t('outages')}`}>
        {slices.map((x) => (
          <span key={x.from} className="min-w-[2px] flex-1 rounded-[2px]" style={{ background: SLICE[x.status] ?? SLICE.no_data, opacity: x.status === 'no_data' ? 1 : 0.9 }}
            title={`${new Date(x.from).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}: ${x.status === 'up' ? t('up') : x.status === 'down' ? t('down') : x.status === 'partial' ? `${t('down')} ${downtimeText(x.downtime_seconds)}` : t('no data')}`} />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-ink-3">
        <span>{outages ? `${outages} ${outages === 1 ? t('outage') : t('outages')}${down ? ` · ${down} ${t('down')}` : ''}` : t('No outages this week')}</span>
        {restart ? <span>{t('up {time} since restart', { time: restart })}</span> : <span>{t('now')}</span>}
      </div>
    </div>
  );
}

export function DeviceCard({ d, actions, onOpen, onPeople, onCustomers }: {
  d: Device;
  actions?: React.ReactNode;
  /** the name is a question about this router */
  onOpen?: () => void;
  onPeople?: () => void;
  onCustomers?: () => void;
}) {
  const t = useT();
  const [box, seen] = useInView<HTMLLIElement>({ threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  const down = d.state === 'offline';
  const tone: Tone = down ? 'bad' : d.state === 'online' ? 'good' : 'muted';
  const gauges = typeof d.cpu === 'number' || typeof d.memory === 'number';
  const online = (d.hotspot ?? 0) + (d.pppoe ?? 0);
  const hasOnline = typeof d.hotspot === 'number' || typeof d.pppoe === 'number';
  const week = useUptime(d.id, seen);
  const name = (
    <span className="min-w-0 flex-1">
      <span className={`block break-words text-[15px] font-semibold text-ink-1 ${onOpen ? 'group-hover:text-accent group-active:text-accent' : ''}`}>{d.name}</span>
      {d.model ? <span className="ai-mono block truncate text-[11.5px] text-ink-3">{d.model}</span> : null}
    </span>
  );

  return (
    <li ref={box} className={`@container ai-card ai-reveal relative flex min-w-0 list-none flex-col overflow-hidden ${seen ? 'is-in' : ''} ${down ? '!border-bad/35' : ''}`}>
      {down ? <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${toneColor('bad')}, transparent 85%)` }} /> : null}
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="mt-[7px]"><Led tone={down ? 'bad' : d.state === 'online' ? 'live' : 'muted'} blink={down} /></span>
        {onOpen ? <button type="button" onClick={onOpen} className="group flex min-w-0 flex-1 text-left">{name}</button> : name}
        <Pill tone={tone}>{down ? (d.downFor ? `${t('Down')} ${d.downFor}` : t('Offline')) : d.state === 'online' ? t('Online') : t('Not checked')}</Pill>
      </div>

      {down ? (
        <div className="px-4 pb-1 pt-3">
          {typeof d.customers === 'number' ? (
            <button type="button" disabled={!onCustomers} onClick={onCustomers} className="block text-left">
              <span className={`ai-mono block text-[28px] font-medium leading-none ${d.customers > 0 ? 'text-[var(--ai-text-bad)]' : 'text-ink-1'}`}>{d.customers.toLocaleString('en-US')}</span>
              <span className="mt-1 block text-[12.5px] text-ink-3">{d.customers > 0 ? t('paying customers cut off') : t('paying customers on it')}</span>
            </button>
          ) : <p className="text-[13px] text-ink-3">{t('Not answering our checks.')}</p>}
          {onOpen ? (
            <button type="button" onClick={onOpen} className="ai-chip group mt-4 !border-bad/30 !py-1.5 text-[12.5px] font-medium hover:!border-bad/60 hover:!bg-bad/10">
              {t('Find out why')}<ArrowRightIcon width={12} height={12} className="transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className={`grid items-center gap-x-3 gap-y-3 px-4 pt-3 ${gauges ? 'grid-cols-2 @min-[440px]:grid-cols-[auto_auto_minmax(0,1fr)]' : 'grid-cols-2'}`}>
          {typeof d.cpu === 'number' ? <div className="flex justify-center"><Dial value={d.cpu} label="CPU" size={116} /></div> : null}
          {typeof d.memory === 'number' ? <div className="flex justify-center"><Dial value={d.memory} label={t('Memory')} size={116} /></div> : null}
          <div className={`min-w-0 ${gauges ? 'col-span-2 border-t border-line pt-3 @min-[440px]:col-span-1 @min-[440px]:border-l @min-[440px]:border-t-0 @min-[440px]:pl-4 @min-[440px]:pt-0' : 'col-span-2'}`}>
            {/* who is on it: online now against the customers who have paid time on it */}
            {hasOnline || typeof d.customers === 'number' ? (
              <button type="button" disabled={!onPeople && !onCustomers} onClick={onPeople ?? onCustomers} className="group block w-full min-w-0 text-left">
                <span className="ai-eyebrow block">{t('Customers')}</span>
                <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                  {hasOnline ? <span className="ai-mono text-[26px] font-medium leading-none text-ink-1 group-hover:text-accent">{online.toLocaleString('en-US')}</span> : null}
                  <span className="text-[12.5px] text-ink-3">
                    {hasOnline ? t('online now') : null}
                    {typeof d.customers === 'number' ? <>{hasOnline ? ' · ' : ''}<span className="ai-mono text-ink-2">{d.customers.toLocaleString('en-US')}</span> {t('paying')}</> : null}
                  </span>
                </span>
                {hasOnline && typeof d.customers === 'number' && d.customers > 0 ? (
                  <span className="mt-2 block"><Meter value={Math.min(online, d.customers)} max={d.customers} tone="info" height={5} label={`${online} ${t('online now')} / ${d.customers} ${t('paying')}`} /></span>
                ) : null}
                {d.pppoe ? <span className="mt-1.5 block text-[11.5px] text-ink-3">{d.hotspot ?? 0} {t('hotspot')} · {d.pppoe} PPPoE</span> : null}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {week ? <div className="px-4 pt-3.5"><UptimeStrip data={week} restart={down ? null : d.uptime} /></div> : null}

      {!week && !gauges && !down && typeof d.reach === 'number' ? (
        <div className="px-4 pt-3">
          <div className="mb-1.5 flex items-baseline justify-between text-[11.5px] text-ink-3">
            <span className="ai-eyebrow">{t('Reachable')}</span>
            <span className="ai-mono text-ink-1">{d.reach}%</span>
          </div>
          <Cells value={d.reach} scale="reach" count={30} height={14} label={`${t('Reachable')} ${d.reach}%`} />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pb-4 pt-3.5">
        {!down ? <Throughput down={d.down ?? null} up={d.up ?? null} size="sm" /> : null}
        {d.state === 'online' && !gauges && !hasOnline && typeof d.reach !== 'number' ? (
          <span className="text-[12px] leading-snug text-ink-3">{t('Reachable, but it sends no live report (CPU, people online).')}</span>
        ) : null}
        {d.emergency ? <span className="text-[12px] text-[var(--ai-text-warn)]">{t('Emergency free access is on.')}</span> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">{actions}</div> : null}
    </li>
  );
}
