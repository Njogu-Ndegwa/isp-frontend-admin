'use client';

import type { PortAnalyticsPort, RouterLive } from '../../lib/types';
import { wanTraffic } from '../../lib/wanTraffic';
import { useT } from '../../lib/i18n';

function bitrate(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Gbps`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mbps`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} Kbps`;
  return `${Math.round(value)} bps`;
}

export default function WanLinksPanel({ routerId, wanPorts, ports, report, onSelect }: {
  routerId: number;
  wanPorts: string[];
  ports: PortAnalyticsPort[];
  report: RouterLive | null;
  onSelect: (port: string) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t('Internet links')} className="mb-4">
      <p className="mb-2 text-xs font-medium text-foreground">{t('Internet links')}</p>
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
        {wanPorts.map((name, index) => {
          const port = ports.find((item) => item.port === name);
          const traffic = wanTraffic(report, routerId, name);
          const stale = traffic?.stale;
          const down = port && !port.link.up;
          const misconfigured = Boolean(port?.bridge);
          const hasReading = traffic?.rxBps != null && traffic?.txBps != null;
          const flowing = !stale && hasReading && (traffic.rxBps! > 0 || traffic.txBps! > 0);
          const status = !port ? t('Port unavailable') : misconfigured ? t('Check WAN configuration')
            : down ? t('Link down') : stale ? t('Report is stale')
              : flowing ? t('Traffic flowing') : hasReading ? t('No traffic in latest report')
                : t('Waiting for traffic report');
          const tone = down || misconfigured ? 'text-red-400' : flowing ? 'text-emerald-500' : 'text-foreground-muted';
          return (
            <div key={name} aria-label={`WAN ${index + 1} · ${name}`} className="min-w-0 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
              <button type="button" onClick={() => onSelect(name)} className="text-sm font-semibold text-sky-500 hover:underline">
                WAN {index + 1} · {name}
              </button>
              <p className={`mt-1 text-[11px] ${tone}`}>{status}</p>
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <dt className="text-foreground-muted">{t('Download')} ↓</dt>
                  <dd className="font-mono font-semibold text-foreground" data-testid={`${name}-wan-download`}>
                    {bitrate(down || misconfigured ? null : traffic?.rxBps)}
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <dt className="text-foreground-muted">{t('Upload')} ↑</dt>
                  <dd className="font-mono font-semibold text-foreground" data-testid={`${name}-wan-upload`}>
                    {bitrate(down || misconfigured ? null : traffic?.txBps)}
                  </dd>
                </div>
              </dl>
              {port?.link.up && port.link.rate && <p className="mt-2 text-[10px] text-foreground-muted">{t('Ethernet link')}: {port.link.rate}</p>}
              {traffic && Number.isFinite(traffic.ageSeconds) && <p className="mt-1 text-[10px] text-foreground-muted">
                {t('Reported {seconds}s ago', { seconds: Math.max(0, Math.round(traffic.ageSeconds)) })}
              </p>}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-foreground-muted">{t('Traffic from each internet modem. Use Refresh for the latest report.')}</p>
    </section>
  );
}
