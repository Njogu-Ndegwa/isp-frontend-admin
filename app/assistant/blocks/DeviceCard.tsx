'use client';

import type { Tone } from '../../lib/assistantVisual';
import { useT } from '../../lib/i18n';
import { toneColor } from '../charts/shared';
import { ArrowRightIcon } from '../icons';
import { Cells, Dial, Led, Pill, Throughput, useInView } from '../ui';

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
          <div className={`min-w-0 ${gauges
            ? 'col-span-2 grid grid-cols-3 gap-3 border-t border-line pt-3 @min-[440px]:col-span-1 @min-[440px]:flex @min-[440px]:flex-col @min-[440px]:gap-3 @min-[440px]:border-l @min-[440px]:border-t-0 @min-[440px]:pl-4 @min-[440px]:pt-0 @min-[640px]:grid @min-[640px]:grid-cols-3 @min-[640px]:gap-4'
            : 'col-span-2 grid grid-cols-3 gap-3'}`}>
            {hasOnline ? (
              <button type="button" disabled={!onPeople} onClick={onPeople} className="min-w-0 text-left">
                <span className="ai-mono block text-[24px] font-medium leading-none text-ink-1">{online.toLocaleString('en-US')}</span>
                <span className="mt-1 block truncate text-[11.5px] text-ink-3">{t('online now')}{d.pppoe ? ` · ${d.pppoe} PPPoE` : ''}</span>
              </button>
            ) : null}
            {typeof d.customers === 'number' ? (
              <button type="button" disabled={!onCustomers} onClick={onCustomers} className="min-w-0 text-left">
                <span className="ai-mono block text-[24px] font-medium leading-none text-ink-1">{d.customers.toLocaleString('en-US')}</span>
                <span className="mt-1 block truncate text-[11.5px] text-ink-3">{t('paying')}</span>
              </button>
            ) : null}
            {/* how long since it last restarted: a short one after a quiet spell explains drops */}
            {d.uptime ? (
              <div className="min-w-0" title={t('Time since the router last restarted')}>
                <span className="ai-mono block text-[24px] font-medium leading-none text-ink-1">{d.uptime}</span>
                <span className="mt-1 block truncate text-[11.5px] text-ink-3">{t('up since restart')}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {!gauges && !down && typeof d.reach === 'number' ? (
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
