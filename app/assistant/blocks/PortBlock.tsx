'use client';

import { useMemo } from 'react';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { formatMoney } from '../../lib/format';
import { Panel, Pill } from '../ui';

type Ask = ((q: string) => void) | undefined;

const obj = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const int = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** One port as a reseller thinks of it: is it alive, what is behind it, what needs doing. */
export interface PortFacts {
  name: string;
  state: 'active' | 'silent' | 'down';
  rate: string;
  drops: number;
  devices: number;
  paying: number;
  online: number;
  today: number;
  equipment: { name: string; detail: string; routerMode: boolean }[];
  warnings: string[];
}

export function portFacts(r: Row): PortFacts {
  const link = obj(r.link);
  const health = obj(r.health);
  const counts = obj(r.counts);
  const revenue = obj(r.revenue);
  const status = str(health.status);
  const state = status === 'active' ? 'active' : status === 'silent_link' ? 'silent' : link.up === true ? 'active' : 'down';
  const infra = Array.isArray(r.infrastructure) ? (r.infrastructure as Row[]) : [];
  const recognised = Array.isArray(r.downstream_devices_sample)
    ? (r.downstream_devices_sample as Row[]).filter((d) => d.device_class === 'infrastructure')
    : [];
  const seen = new Map<string, Row>();
  for (const d of [...recognised, ...infra]) seen.set(str(d.mac) || str(d.name), { ...seen.get(str(d.mac)), ...d });
  const equipment = [...seen.values()].map((d) => ({
    name: str(d.name) || str(d.vendor) || str(d.mac),
    detail: [str(d.vendor) !== str(d.name) ? str(d.vendor) : '', str(d.board), str(d.ip)].filter(Boolean).join(' · '),
    routerMode: d.router_mode_suspect === true,
  }));
  return {
    name: str(r.port) || str(r.name),
    state,
    rate: str(link.rate),
    drops: int(link.link_downs),
    devices: int(counts.learned_macs),
    paying: int(revenue.paying_customers),
    online: int(counts.known_customers_connected) || int(counts.active_hotspot_sessions) + int(counts.active_ppp_sessions),
    today: int(revenue.today),
    equipment,
    warnings: Array.isArray(health.warnings) ? (health.warnings as unknown[]).map(str).filter(Boolean) : [],
  };
}

const STATE: Record<PortFacts['state'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'good' },
  silent: { label: 'Link up, nothing talking', tone: 'warn' },
  down: { label: 'No link', tone: 'muted' },
};

/**
 * What is on each port: a card per port with its state and speed, how many devices and
 * paying customers sit behind it, the equipment found there (an AP that looks like it is in
 * router mode is flagged), and its warnings in plain words. Ports that need attention first.
 */
export function PortBlock({ title, rows, currency, onAsk }: { title: string; rows: Row[]; currency?: string | null; onAsk: Ask }) {
  const ports = useMemo(() => rows.map(portFacts).filter((p) => p.name).sort((a, b) =>
    (b.warnings.length ? 1 : 0) - (a.warnings.length ? 1 : 0)
    || ['active', 'silent', 'down'].indexOf(a.state) - ['active', 'silent', 'down'].indexOf(b.state)
    || a.name.localeCompare(b.name, undefined, { numeric: true })), [rows]);
  const active = ports.filter((p) => p.state === 'active').length;
  const flagged = ports.filter((p) => p.warnings.length).length;
  const money = (v: number) => formatMoney(v, currency || 'KES');
  return (
    <Panel eyebrow={<>Ports · {ports.length}</>} title={title} tone={flagged ? 'warn' : undefined}
      note={<>{active} active{flagged ? <> · <b className="font-semibold text-[var(--ai-text-warn)]">{flagged} need a look</b></> : ''}</>}>
      <ul className="m-0 grid list-none gap-2.5 p-0 @xl:grid-cols-2">
        {ports.map((p) => {
          const s = STATE[p.state];
          return (
            <li key={p.name} className={`ai-well min-w-0 px-3.5 py-3 ${p.warnings.length ? '!border-warn/40' : ''}`}>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <button type="button" disabled={!onAsk} onClick={() => onAsk?.(`What is on ${p.name}, and is anything wrong with it?`)}
                  className="ai-mono text-[15px] font-semibold text-ink-1 enabled:hover:text-accent">{p.name}</button>
                <Pill tone={s.tone}>{s.label}</Pill>
                {p.rate ? <span className="ai-mono text-[12px] text-ink-3">{p.rate}</span> : null}
                {p.drops > 0 ? <span className="text-[12px] text-ink-3">dropped {p.drops}×</span> : null}
              </div>
              {p.state !== 'down' ? (
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {p.devices} {p.devices === 1 ? 'device' : 'devices'}
                  {p.paying ? <> · {p.paying} paying</> : null}
                  {p.online ? <> · {p.online} online now</> : null}
                  {p.today ? <> · {money(p.today)} today</> : null}
                </p>
              ) : null}
              {p.equipment.length ? (
                <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
                  {p.equipment.slice(0, 6).map((e, i) => (
                    <li key={i} className={`ai-chip !cursor-default !py-1 text-[12px] ${e.routerMode ? '!border-bad/50 text-[var(--ai-text-bad)]' : ''}`}
                      title={e.detail || undefined}>
                      {e.name}{e.routerMode ? ' · router mode?' : ''}
                    </li>
                  ))}
                  {p.equipment.length > 6 ? <li className="text-[12px] text-ink-3">+{p.equipment.length - 6} more</li> : null}
                </ul>
              ) : null}
              {p.warnings.length ? (
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
                  {p.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-[var(--ai-text-warn)]">
                      <span aria-hidden>!</span><span className="min-w-0 break-words">{w}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
