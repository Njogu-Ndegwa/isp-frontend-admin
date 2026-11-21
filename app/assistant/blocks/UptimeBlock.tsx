'use client';

import { useT } from '../../lib/i18n';
import type { RouterUptimeResponse, UptimeTimelineSlice } from '../../lib/types';
import { Led, Panel, Readout, ReadoutGrid } from '../ui';

/*
 * A router's uptime, drawn the way the classic Routers page draws it: the share of
 * time it was up, its outages and how long they lasted, a status strip (green up,
 * amber partly down, red down) and the outage list. The router card shows the same
 * strip for its last week. A flat line chart of "downtime seconds" says none of this,
 * which is why an uptime answer has a component of its own.
 */

const EAT: Intl.DateTimeFormatOptions = { timeZone: 'Africa/Nairobi' };

/** The timeline in a fixed number of slices: a slice is as bad as the worst moment in it. */
export function weekSlices(timeline: UptimeTimelineSlice[], count = 42): UptimeTimelineSlice[] {
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

/** "12 min", "3 h 5 min", "4 d"; empty under a minute. */
export function downtimeText(seconds: number | null | undefined): string {
  const m = Math.round((seconds ?? 0) / 60);
  if (m < 1) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${Math.round(h / 24)} d`;
}

/** "7 days", "24 h": the window in words. */
export function windowLabel(hours: number | null | undefined): string {
  const h = typeof hours === 'number' && hours > 0 ? hours : 168;
  return h >= 24 && h % 24 === 0 ? `${h / 24} day${h === 24 ? '' : 's'}` : `${h} h`;
}

export const pctText = (pct: number | null | undefined, digits = 1): string =>
  (typeof pct !== 'number' ? '–' : `${pct.toFixed(pct >= 99.95 ? 0 : digits)}%`);

export const pctTone = (pct: number | null | undefined): string =>
  (typeof pct !== 'number' ? 'text-ink-3' : pct >= 99 ? 'text-[var(--ai-text-good)]' : pct >= 95 ? 'text-ink-1' : pct >= 90 ? 'text-[var(--ai-text-warn)]' : 'text-[var(--ai-text-bad)]');

const when = (iso: string | null | undefined): string => {
  if (!iso) return '–';
  const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleString('en-GB', { ...EAT, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const SLICE: Record<string, string> = { up: 'var(--ai-good)', partial: 'var(--ai-warn)', down: 'var(--ai-bad)', no_data: 'var(--ai-track)' };

/** One bar per slice; the slice's moment and what happened in it on hover. */
export function StatusStrip({ slices, height = 28, label }: { slices: UptimeTimelineSlice[]; height?: number; label: string }) {
  const t = useT();
  const word = (x: UptimeTimelineSlice) => (x.status === 'up' ? t('up') : x.status === 'down' ? t('down')
    : x.status === 'partial' ? `${t('down')} ${downtimeText(x.downtime_seconds)}` : t('no data'));
  return (
    <div className="flex items-stretch gap-[2px]" style={{ height }} role="img" aria-label={label}>
      {slices.map((x) => (
        <span key={x.from} className="min-w-[2px] flex-1 rounded-[2px]" style={{ background: SLICE[x.status] ?? SLICE.no_data, opacity: x.status === 'no_data' ? 1 : 0.9 }}
          title={`${when(x.from)} – ${when(x.to)}: ${word(x)}`} />
      ))}
    </div>
  );
}

/** The router card's week: the percentage over the strip, outages and the restart under it. */
export function UptimeStrip({ data, restart }: { data: RouterUptimeResponse; restart?: string | null }) {
  const t = useT();
  const slices = weekSlices(data.timeline ?? []);
  const pct = data.window.uptime_percentage;
  const outages = data.window.outage_count ?? 0;
  const down = downtimeText(data.window.downtime_seconds);
  if (!slices.length) return null;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="ai-eyebrow">{t('Uptime · 7 days')}</span>
        <span className={`ai-mono text-[15px] font-medium ${pctTone(pct)}`}>{pctText(pct)}</span>
      </div>
      <div className="mt-1.5">
        <StatusStrip slices={slices} label={`${t('Uptime · 7 days')} ${pctText(pct)}, ${outages} ${t('outages')}`} />
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-ink-3">
        <span>{outages ? `${outages} ${outages === 1 ? t('outage') : t('outages')}${down ? ` · ${down} ${t('down')}` : ''}` : t('No outages this week')}</span>
        {restart ? <span>{t('up {time} since restart', { time: restart })}</span> : <span>{t('now')}</span>}
      </div>
    </div>
  );
}

/** A router uptime answer (GET /api/routers/{id}/uptime): the classic Routers page's uptime panel. */
export function UptimeBlock({ title, data, onAsk }: { title: string; data: RouterUptimeResponse; onAsk?: (q: string) => void }) {
  const t = useT();
  const span = windowLabel(data.window?.hours);
  const pct = data.window?.uptime_percentage ?? null;
  const days = data.overall?.days ?? 30;
  const outages = [...(data.outages ?? [])].reverse();
  const tunnel = [...(data.tunnel_outages ?? [])].reverse();
  const slices = weekSlices(data.timeline ?? [], 60);
  const status = String(data.current_status?.status ?? 'unknown').toLowerCase();
  const stillDown = outages.find((o) => !o.ended_at);
  const longest = outages.length ? Math.max(...outages.map((o) => o.duration_seconds || 0)) : 0;
  const ignored = (data.recent_checks ?? []).filter((c) => !c.is_online && c.counted_as_outage === false && !c.in_tunnel_outage).length;
  const name = data.router_name || title;
  const count = data.window?.outage_count ?? outages.length;
  const downFor = downtimeText(data.window?.downtime_seconds);

  return (
    <Panel eyebrow={<>{t('Uptime')} · {span}</>} title={name} tone={status === 'offline' || stillDown ? 'bad' : typeof pct === 'number' && pct < 95 ? 'warn' : undefined}
      note={count ? `${count} ${count === 1 ? t('outage') : t('outages')}${downFor ? `, ${downFor} ${t('down')} in all` : ''}` : t('No outages in this period')}>
      <div className="flex items-end justify-between gap-3">
        <span className={`ai-mono text-[34px] font-medium leading-none ${pctTone(pct)}`}>{pctText(pct, 2)}</span>
        <span className="flex items-center gap-1.5 pb-1 text-[13px] text-ink-2">
          <Led tone={status === 'online' ? 'good' : status === 'offline' ? 'bad' : 'muted'} pulse={status === 'online'} />
          {status === 'online' ? t('Online now') : status === 'offline' ? t('Offline now') : t('Status unknown')}
        </span>
      </div>

      {slices.length ? (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11.5px] text-ink-3"><span>{when(slices[0].from)}</span><span>{t('now')}</span></div>
          <StatusStrip slices={slices} height={36} label={`${t('Uptime')} ${span} ${pctText(pct)}, ${count} ${t('outages')}`} />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3">
            {(['up', 'partial', 'down', 'no_data'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px]" style={{ background: SLICE[k] }} />
                {k === 'up' ? t('Up') : k === 'partial' ? t('Partly down') : k === 'down' ? t('Down') : t('No data')}</span>
            ))}
            <span className="ml-auto">{t('Times in EAT')}</span>
          </div>
        </div>
      ) : <p className="mt-4 text-[13px] text-ink-3">{t('No checks recorded in this period yet.')}</p>}

      <ReadoutGrid cols={3}>
        {data.window && data.window.hours < days * 24
          ? <Readout label={`${t('Uptime')} · ${days} ${t('days')}`}><span className={pctTone(data.overall?.uptime_percentage)}>{pctText(data.overall?.uptime_percentage, 2)}</span></Readout>
          : <Readout label={t('Longest outage')}>{longest ? downtimeText(longest) || '<1 min' : t('none')}</Readout>}
        <Readout label={`${t('Outages')} · ${span}`} sub={downFor ? `${downFor} ${t('down')}` : undefined}>{count}</Readout>
        <Readout label={t('Last seen online')}>{status === 'online' ? t('now') : when(data.current_status?.last_online_at)}</Readout>
      </ReadoutGrid>

      {outages.length ? (
        <div className="mt-4">
          <p className="ai-eyebrow mb-1.5">{t('Outages')}</p>
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {outages.slice(0, 8).map((o) => (
              <li key={o.started_at} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0 text-ink-1">{when(o.started_at)} → {o.ended_at ? when(o.ended_at) : <span className="text-[var(--ai-text-bad)]">{t('still down')}</span>}</span>
                <span className={`ai-mono shrink-0 ${o.ended_at ? 'text-ink-3' : 'font-medium text-[var(--ai-text-bad)]'}`}>{downtimeText(o.duration_seconds) || '<1 min'}</span>
              </li>
            ))}
          </ul>
          {outages.length > 8 ? <p className="mt-1 text-[12px] text-ink-3">{t('and {n} more', { n: outages.length - 8 })}</p> : null}
        </div>
      ) : null}

      {tunnel.length ? (
        <div className="mt-4">
          <p className="ai-eyebrow mb-1">{t('Management tunnel down, site online')}</p>
          <p className="mb-1.5 text-[12px] leading-relaxed text-ink-3">{t('The router kept reaching Bitwave over the internet, but Bitwave could not reach it. Customers stayed online; payments and changes waited for the tunnel. Not counted as downtime.')}</p>
          <ul className="divide-y divide-line rounded-[10px] border border-line">
            {tunnel.slice(0, 5).map((o) => (
              <li key={o.started_at} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="min-w-0 text-ink-1">{when(o.started_at)} → {o.ended_at ? when(o.ended_at) : t('still down')}</span>
                <span className="ai-mono shrink-0 text-[var(--ai-text-warn)]">{downtimeText(o.duration_seconds) || '<1 min'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
        {data.judged_by === 'router_reports'
          ? t('Judged by the router’s own reports, sent every few minutes: it counts as down only when they stop for more than 15 minutes.')
          : t('Judged by Bitwave’s connection checks: the router counts as down only after two failed checks in a row.')}
        {ignored > 0 ? ` ${t('{n} failed connection attempts while it was still reporting did not count.', { n: ignored })}` : ''}
      </p>

      {onAsk && (stillDown || status === 'offline') ? (
        <button type="button" onClick={() => onAsk(`Why is ${name} down?`)} className="ai-chip mt-3 !py-1.5 text-[12.5px] font-medium">{t('Why is it down?')}</button>
      ) : null}
    </Panel>
  );
}
