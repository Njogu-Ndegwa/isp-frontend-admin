'use client';

import { useMemo, useState } from 'react';
import type { Tone } from '../../lib/assistantVisual';
import type { Row } from '../../lib/assistantView';
import { formatMoney } from '../../lib/format';
import { Panel, Pill } from '../ui';

type Ask = ((q: string) => void) | undefined;

const obj = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {});
const int = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

export type PortState = 'uplink' | 'active' | 'silent' | 'down';

/** One port as a reseller thinks of it: is it alive, what is behind it, what needs doing. */
export interface PortFacts {
  name: string;
  short: string;
  state: PortState;
  rate: string;
  drops: number;
  errors: boolean;
  devices: number;
  paying: number;
  online: number;
  today: number;
  equipment: { name: string; detail: string; routerMode: boolean }[];
  customers: string[];
  warnings: string[];
}

/** "ether7" -> "7", "sfp-sfpplus1" -> "S+1": the number printed on the router's faceplate. */
export function portShort(name: string): string {
  const ether = /^ether(\d+)$/i.exec(name);
  if (ether) return ether[1];
  const sfpPlus = /^sfp-sfpplus(\d+)$/i.exec(name);
  if (sfpPlus) return `S+${sfpPlus[1]}`;
  const sfp = /^sfp(\d+)$/i.exec(name);
  return sfp ? `S${sfp[1]}` : name.slice(0, 4);
}

export function portFacts(r: Row): PortFacts {
  const link = obj(r.link);
  const health = obj(r.health);
  const counts = obj(r.counts);
  const revenue = obj(r.revenue);
  const traffic = obj(r.traffic);
  const name = str(r.port) || str(r.name);
  // the internet line has no devices behind it by nature (as the classic diagnostics page reads it)
  const uplink = r.uplink === true || (r.uplink === undefined && !str(r.bridge) && name.toLowerCase() === 'ether1');
  const status = str(health.status);
  const up = link.up === true || status === 'active' || status === 'silent_link';
  const state: PortState = !up ? 'down' : uplink ? 'uplink' : status === 'silent_link' ? 'silent' : 'active';
  const infra = Array.isArray(r.infrastructure) ? (r.infrastructure as Row[]) : [];
  const samples = Array.isArray(r.downstream_devices_sample) ? (r.downstream_devices_sample as Row[]) : [];
  const seen = new Map<string, Row>();
  for (const d of [...samples.filter((d) => d.device_class === 'infrastructure'), ...infra]) {
    const key = str(d.mac) || str(d.name);
    seen.set(key, { ...seen.get(key), ...d });
  }
  const equipment = [...seen.values()].map((d) => ({
    name: str(d.name) || str(d.vendor) || str(d.mac),
    detail: [str(d.vendor) !== str(d.name) ? str(d.vendor) : '', str(d.board), str(d.ip)].filter(Boolean).join(' · '),
    routerMode: d.router_mode_suspect === true,
  }));
  // a customer is a device matched to a billing customer, not any device with a name
  const customers = samples.filter((d) => (d.kind === 'known_customer' || d.customer_id != null) && d.device_class !== 'infrastructure' && str(d.name))
    .map((d) => str(d.name));
  // a dead or silent internet line is a finding, "no devices behind it" is not
  const warnings = (Array.isArray(health.warnings) ? (health.warnings as unknown[]).map(str).filter(Boolean) : [])
    .filter((w) => !(uplink && /no downstream MACs/i.test(w)))
    .map((w) => w.replace(/\s*\(known issue [^)]*\)/gi, ''));  // the tag is for the assistant, not for people
  return {
    name, short: portShort(name), state,
    rate: str(link.rate),
    drops: int(link.link_downs),
    errors: int(traffic.rx_error) + int(traffic.tx_error) > 0,
    devices: int(counts.learned_macs),
    paying: int(revenue.paying_customers),
    online: int(counts.known_customers_connected) || int(counts.active_hotspot_sessions) + int(counts.active_ppp_sessions),
    today: int(revenue.today),
    equipment, customers, warnings,
  };
}

const STATE: Record<PortState, { label: string; tone: Tone; cell: string }> = {
  uplink: { label: 'Internet line', tone: 'info', cell: 'border-sig-down/50 bg-sig-down/10 text-ink-1' },
  active: { label: 'Active', tone: 'good', cell: 'border-good/50 bg-good/10 text-ink-1' },
  silent: { label: 'Link up, nothing talking', tone: 'warn', cell: 'border-warn/60 bg-warn/10 text-ink-1' },
  down: { label: 'No link', tone: 'muted', cell: 'border-line bg-surface-2 text-ink-3' },
};

/**
 * What is on each port, the way the router's front looks: one square per port, lit by its
 * state, with how many devices sit behind it and a mark where something needs a look. Tap a
 * square for that port: its link, the equipment found there (an AP that looks like it is in
 * router mode flagged), the customers on it, and its warnings in plain words. It opens on the
 * port that most needs a look.
 */
export function PortBlock({ title, rows, currency, onAsk }: { title: string; rows: Row[]; currency?: string | null; onAsk: Ask }) {
  const ports = useMemo(() => rows.map(portFacts).filter((p) => p.name), [rows]);
  const flagged = ports.filter((p) => p.warnings.length);
  // open on what most needs a look: equipment in router mode, then the most warnings
  const weight = (x: PortFacts) => (x.equipment.some((e) => e.routerMode) ? 10 : 0) + x.warnings.length + (x.errors ? 1 : 0);
  const first = [...flagged].sort((a, b) => weight(b) - weight(a))[0] ?? ports.find((p) => p.state === 'active') ?? ports[0];
  const [picked, setPicked] = useState<string | null>(null);
  const p = ports.find((x) => x.name === picked) ?? first;
  if (!p) return null;
  const s = STATE[p.state];
  const money = (v: number) => formatMoney(v, currency || 'KES');
  const active = ports.filter((x) => x.state === 'active').length;

  return (
    <Panel eyebrow={<>Ports · {ports.length}</>} title={title} tone={flagged.length ? 'warn' : undefined}
      note={<>{active} active{flagged.length ? <> · <b className="font-semibold text-[var(--ai-text-warn)]">{flagged.length} need a look</b></> : null}</>}>
      {/* the faceplate */}
      <div className="ai-well p-2.5">
        <div role="tablist" aria-label="Ports" className="flex flex-wrap gap-2">
          {ports.map((x) => {
            const on = x.name === p.name;
            return (
              <button key={x.name} type="button" role="tab" aria-selected={on} onClick={() => setPicked(x.name)}
                title={`${x.name} · ${STATE[x.state].label}`}
                className={`ai-tap relative flex h-11 w-11 items-center justify-center rounded-[10px] border font-mono text-[13px] font-semibold transition-transform ${STATE[x.state].cell} ${on ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--ai-bg)]' : 'active:scale-95'}`}>
                {x.state === 'uplink' ? <span aria-hidden>↧</span> : x.short}
                {x.state !== 'down' && x.state !== 'uplink' && x.devices > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-line bg-[var(--ai-bg)] px-1 text-[9.5px] font-medium leading-none text-ink-1">
                    {x.devices > 99 ? '99+' : x.devices}
                  </span>
                ) : null}
                {x.warnings.length ? <span aria-label="needs a look" className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[var(--ai-bg)] bg-warn" /> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
          {(['uplink', 'active', 'silent', 'down'] as PortState[]).filter((k) => ports.some((x) => x.state === k)).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full border ${STATE[k].cell}`} />{STATE[k].label}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />needs a look</span>
        </div>
      </div>

      {/* the port picked */}
      <section className="mt-3" aria-live="polite">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h4 className="ai-mono m-0 text-[16px] font-semibold text-ink-1">{p.name}</h4>
          <Pill tone={s.tone}>{s.label}</Pill>
          {p.rate && p.state !== 'down' ? <span className="ai-mono text-[12px] text-ink-3">{p.rate}</span> : null}
          {p.drops > 0 ? <span className={`text-[12px] ${p.drops >= 5 ? 'text-[var(--ai-text-warn)]' : 'text-ink-3'}`}>link dropped {p.drops}×</span> : null}
          {p.errors ? <span className="text-[12px] text-[var(--ai-text-bad)]">errors on the cable</span> : null}
        </div>

        {p.state === 'uplink' ? (
          <p className="mt-1.5 text-[13px] text-ink-2">Your internet comes in here. It has no customers behind it by design.</p>
        ) : p.state !== 'down' ? (
          <dl className="m-0 mt-2.5 grid grid-cols-2 gap-2 @md:grid-cols-4">
            {[['Devices', String(p.devices)], ['Paying here', String(p.paying)], ['Online now', String(p.online)], ['Today', money(p.today)]].map(([k, v]) => (
              <div key={k} className="ai-well px-3 py-2">
                <dt className="ai-eyebrow">{k}</dt>
                <dd className="ai-mono m-0 mt-0.5 text-[15px] font-medium text-ink-1">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 text-[13px] text-ink-3">Nothing is plugged in, or the cable or the device at the other end has no power.</p>
        )}

        {p.warnings.length ? (
          <ul className="m-0 mt-3 list-none space-y-1.5 p-0">
            {p.warnings.map((w, i) => (
              <li key={i} className="flex gap-2 rounded-[10px] border border-warn/30 bg-warn/10 px-3 py-2 text-[13px] leading-snug text-ink-1">
                <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-warn" /><span className="min-w-0 break-words">{w}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {p.equipment.length ? (
          <div className="mt-3">
            <p className="ai-eyebrow mb-1.5">Equipment here</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {p.equipment.slice(0, 8).map((e, i) => (
                <li key={i} className={`ai-chip !cursor-default !py-1 text-[12.5px] ${e.routerMode ? '!border-bad/50 text-[var(--ai-text-bad)]' : ''}`} title={e.detail || undefined}>
                  {e.name}{e.routerMode ? ' · router mode?' : ''}
                </li>
              ))}
              {p.equipment.length > 8 ? <li className="self-center text-[12px] text-ink-3">+{p.equipment.length - 8} more</li> : null}
            </ul>
          </div>
        ) : null}

        {p.customers.length ? (
          <p className="mt-3 break-words text-[12.5px] text-ink-3">
            <span className="ai-eyebrow mr-1.5">Customers</span>{p.customers.slice(0, 8).join(', ')}{p.customers.length > 8 ? ` and ${p.customers.length - 8} more` : ''}
          </p>
        ) : null}

        {onAsk && p.state !== 'uplink' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={() => onAsk(`Who is on ${p.name} right now?`)}>Who is on it</button>
            {p.warnings.length ? <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" onClick={() => onAsk(`How do I fix what is wrong on ${p.name}?`)}>How do I fix it</button> : null}
          </div>
        ) : null}
      </section>
    </Panel>
  );
}
