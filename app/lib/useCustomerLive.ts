'use client';

/*
 * Whether each customer in a list is on right now, the way the classic Customers
 * page finds out: it asks each router for its PPPoE logins and hotspot devices
 * (both cached on the server for a few seconds) and matches them to customers by
 * PPPoE username, customer id or MAC. A router that does not answer marks every
 * customer on it "router offline", since none of them can be on through it.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { CustomerFacts } from './assistantEntities';
import type { CustomerUsageResponse } from './types';

export interface CustomerLive {
  state: 'online' | 'offline' | 'disabled' | 'router_down';
  down: number;
  up: number;
  address: string | null;
}

/** Routers asked at most, so a long list never turns into a storm of router calls. */
const MAX_ROUTERS = 4;

type Users = { users?: Record<string, unknown>[]; router_reachable?: boolean | null } | null;
const mac = (v: unknown) => (typeof v === 'string' ? v.replace(/[^0-9a-f]/gi, '').toLowerCase() : '');
const rate = (v: unknown) => Number(v) || 0;

/** Match one router's PPPoE and hotspot users to the customers on it. Pure, for tests. */
export function matchLive(people: CustomerFacts[], pppoe: Users, hotspot: Users): Map<string | number, CustomerLive> {
  const out = new Map<string | number, CustomerLive>();
  const byLogin = new Map<string, Record<string, unknown>>();
  const byCustomer = new Map<number, Record<string, unknown>>();
  const byMac = new Map<string, Record<string, unknown>>();
  for (const u of pppoe?.users ?? []) {
    if (typeof u.username === 'string') byLogin.set(u.username, u);
    const c = u.customer as { id?: number } | null;
    if (c?.id !== undefined) byCustomer.set(c.id, u);
  }
  for (const u of hotspot?.users ?? []) {
    const c = u.customer as { id?: number } | null;
    // a customer can have several devices: the one that is on wins
    if (c?.id !== undefined && (!byCustomer.has(c.id) || u.online === true)) byCustomer.set(c.id, u);
    if (mac(u.mac_address)) byMac.set(mac(u.mac_address), u);
  }
  for (const p of people) {
    // a static IP customer is not a PPPoE login or a hotspot session
    if (p.id === null || p.connection === 'Static IP') continue;
    const pppoeDown = p.connection === 'PPPoE' && pppoe?.router_reachable === false;
    const hotspotDown = p.connection === 'Hotspot' && hotspot?.router_reachable === false;
    if (pppoeDown || hotspotDown) { out.set(p.id, { state: 'router_down', down: 0, up: 0, address: null }); continue; }
    const u = (p.pppoeUsername ? byLogin.get(p.pppoeUsername) : undefined)
      ?? (typeof p.id === 'number' ? byCustomer.get(p.id) : undefined)
      ?? (p.mac ? byMac.get(mac(p.mac)) : undefined);
    if (!u) continue;
    const disabled = u.disabled === true || u.disabled === 'true';
    out.set(p.id, {
      state: disabled ? 'disabled' : u.online === true ? 'online' : 'offline',
      down: rate(u.download_rate), up: rate(u.upload_rate),
      address: typeof u.address === 'string' && u.address ? u.address : null,
    });
  }
  return out;
}

export function useCustomerLive(people: CustomerFacts[]): { live: Map<string | number, CustomerLive>; loaded: boolean } {
  type Answer = { id: number; pppoe: Users; hotspot: Users };
  const [state, setState] = useState<{ key: string; answers: Answer[] } | null>(null);
  // the routers to ask and whether each has PPPoE or hotspot customers, as a stable key
  const plan = new Map<number, { pppoe: boolean; hotspot: boolean }>();
  for (const p of people) {
    if (p.routerId === null || p.connection === 'Static IP') continue;
    const entry = plan.get(p.routerId) ?? { pppoe: false, hotspot: false };
    if (p.connection === 'PPPoE') entry.pppoe = true; else entry.hotspot = true;
    plan.set(p.routerId, entry);
  }
  const key = [...plan.entries()].slice(0, MAX_ROUTERS).map(([id, e]) => `${id}${e.pppoe ? 'p' : ''}${e.hotspot ? 'h' : ''}`).join(',');

  useEffect(() => {
    if (!key) return;
    let on = true;
    const routers = key.split(',').map((k) => ({ id: Number(k.replace(/[ph]/g, '')), pppoe: k.includes('p'), hotspot: k.includes('h') }));
    Promise.all(routers.map(async (r) => {
      const [pppoe, hotspot] = await Promise.all([
        r.pppoe ? api.getPPPoEUsers(r.id).catch(() => null) : null,
        r.hotspot ? api.getHotspotUsers(r.id).catch(() => null) : null,
      ]);
      return { id: r.id, pppoe: pppoe as unknown as Users, hotspot: hotspot as unknown as Users };
    })).then((answers) => {
      if (on) setState({ key, answers });
    });
    return () => { on = false; };
  }, [key]);

  const answers = state?.answers;
  const live = useMemo(() => {
    const out = new Map<string | number, CustomerLive>();
    for (const a of answers ?? []) {
      for (const [id, v] of matchLive(people.filter((p) => p.routerId === a.id), a.pppoe, a.hotspot)) out.set(id, v);
    }
    return out;
  }, [answers, people]);
  return { live, loaded: !key || state?.key === key };
}

/** This period's use against the plan's cap, as a list row shows it. */
export interface UsageFacts {
  used: number;
  cap: number | null;
  pct: number | null;
  over: boolean;
  daily: boolean;
}

/** One customer's usage read (the bulk endpoint's row) in the few numbers a row needs. Pure, for tests. */
export function usageFacts(u: CustomerUsageResponse | null | undefined): UsageFacts | null {
  const period = u?.period;
  if (!period) return null;
  const daily = u?.plan_fup_period === 'daily' && period.fup_window_used_mb != null;
  const used = daily ? period.fup_window_used_mb ?? 0 : period.total_mb;
  const cap = period.cap_mb ?? null;
  const pct = cap ? Math.max(0, (daily ? period.fup_window_percent_used : period.percent_used) || (used / cap) * 100) : null;
  return { used, cap, pct, over: period.fup_active || (cap !== null && used >= cap), daily };
}

/** Usage this period (and the router's last push report) for up to 100 customers, in one call. */
export function useCustomerUsage(ids: number[]): Map<number, CustomerUsageResponse> {
  const key = [...new Set(ids)].slice(0, 100).join(',');
  const [state, setState] = useState<{ key: string; rows: CustomerUsageResponse[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    let on = true;
    api.getCustomersUsage(key.split(',').map(Number))
      .then((rows) => { if (on) setState({ key, rows: Array.isArray(rows) ? rows : [] }); })
      .catch(() => { if (on) setState({ key, rows: [] }); });
    return () => { on = false; };
  }, [key]);
  return useMemo(() => new Map((state?.rows ?? []).map((r) => [r.customer_id, r])), [state]);
}
