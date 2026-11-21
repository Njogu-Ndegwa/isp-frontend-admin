/**
 * The depth an answer needs to match the classic pages: money that is not revenue is
 * never summed as revenue, an expired prompt is not a failure, times read in EAT, an
 * old status is not shown as live, a down router is said, view-only staff are offered
 * only what they can use, and a trend says its takeaway.
 */
import { describe, expect, it } from 'vitest';
import {
  customerCounts, customerFacts, eatClockTime, eatTime, freshness, inCustomerFilter, isLapsed, paymentFacts, paymentTotals, routerFacts,
} from '../assistantEntities';
import { periodWord, trendPlan, trendTakeaway, type ChartModel } from '../assistantVisual';
import { formatValue } from '../assistantView';
import { canOffer, PERMISSIONS } from '../permissions';
import { periodCap, routerRead, usageFacts } from '../useCustomerLive';
import { loginFacts, readFreshness, routerTime } from '../../assistant/blocks/LoginsBlock';
import { mergeRouterStates, planFacts } from '../../assistant/blocks/BillingBlocks';
import { portFacts, portMoney } from '../../assistant/blocks/PortBlock';

const NOW = Date.parse('2026-11-21T09:00:00Z'); // 12:00 EAT

describe('times are EAT', () => {
  it('reads naive API datetimes as UTC and shows them in Nairobi time', () => {
    expect(eatTime('2026-11-21T06:30:00')).toBe('21 Nov, 09:30');
    expect(eatClockTime('2026-11-20T22:15:00Z')).toBe('01:15');
    expect(eatTime(null)).toBe('–');
    expect(eatTime('not a date')).toBe('–');
  });

  it('shows table datetimes in EAT too', () => {
    expect(formatValue('2026-11-19T07:00:00', 'en-GB')).toContain('10:00');
  });

  it('reads a router clock (EAT) the same whatever the phone zone', () => {
    expect(routerTime('nov/20/2026 14:22:10')?.toISOString()).toBe('2026-11-20T11:22:10.000Z');
    expect(routerTime('2026-11-20 14:22:10')?.toISOString()).toBe('2026-11-20T11:22:10.000Z');
  });
});

describe('payments', () => {
  it('keep an expired prompt apart from a failure', () => {
    expect(paymentFacts({ amount: 50, phone_number: '07', status: 'expired' }).state).toBe('expired');
    expect(paymentFacts({ amount: 50, phone_number: '07', status: 'failed', result_desc: 'Cancelled' })).toMatchObject({ state: 'failed', reason: 'Cancelled' });
    expect(paymentFacts({ amount: 50, phone_number: '07', status: 'expired', result_desc: 'x' }).reason).toBeNull();
  });

  it('never sum money that does not count as revenue', () => {
    const rows = [
      { amount: 300, phone_number: '07', status: 'completed' },
      { amount: 50, phone_number: '07', status: 'completed', counts_as_revenue: false, source: 'voucher' },
      { amount: 100, phone_number: '07', status: 'failed' },
      { amount: 20, phone_number: '07', status: 'expired' },
      { amount: 20, phone_number: '07', status: 'pending' },
    ].map(paymentFacts);
    expect(rows[1]).toMatchObject({ revenue: false, source: 'Voucher' });
    expect(paymentTotals(rows)).toEqual({ received: 300, receivedCount: 1, freeCount: 1, failed: 1, expired: 1, pending: 1 });
  });
});

describe('staleness', () => {
  it('marks a router status that was not checked lately, or that the API flags', () => {
    const base = { id: 1, name: 'Shop', identity: 'r1', ip_address: '10.0.0.1', status: 'online' };
    expect(routerFacts({ ...base, status_last_checked_at: '2026-11-21T08:55:00' }, NOW).stale).toBe(false);
    expect(routerFacts({ ...base, status_last_checked_at: '2026-11-21T06:00:00' }, NOW).stale).toBe(true);
    expect(routerFacts({ ...base, status_is_stale: true }, NOW).stale).toBe(true);
    expect(routerFacts({ ...base, status_age_seconds: 4000 }, NOW).stale).toBe(true);
    expect(routerFacts({ ...base, status: 'unknown', status_is_stale: true }, NOW).stale).toBe(false);
  });

  it('says how old a reading is', () => {
    expect(freshness(new Date(NOW - 20 * 60_000), NOW)).toEqual({ stale: true, ageMs: 20 * 60_000 });
    expect(freshness(null, NOW)).toEqual({ stale: false, ageMs: null });
  });

  it('reads the monitor endpoints: a router that did not answer, an old cached list', () => {
    expect(readFreshness({ router_reachable: false, router_last_online_at: '2026-11-21T06:00:00', cache_age_seconds: 5 }))
      .toMatchObject({ routerDown: true, stale: false, lastOnline: new Date('2026-11-21T06:00:00Z') });
    expect(readFreshness({ router_reachable: true, cache_age_seconds: 1800 }).stale).toBe(true);
    expect(readFreshness(null)).toMatchObject({ routerDown: false, stale: false });
  });

  it("gathers one router's state from its PPPoE and hotspot reads", () => {
    expect(routerRead(3, { router_reachable: false, router_last_online_at: '2026-11-21T06:00:00' }, { router_reachable: true }))
      .toMatchObject({ id: 3, reachable: false, lastOnline: new Date('2026-11-21T06:00:00Z') });
    expect(routerRead(3, null, { router_reachable: true, cache_age_seconds: 900 })).toMatchObject({ reachable: true, stale: true });
    expect(routerRead(3, null, null)).toMatchObject({ reachable: null, stale: false });
  });
});

describe("a customer's router, from the record or from asking it", () => {
  const rec = (router: Record<string, unknown>) => customerFacts({ id: 1, name: 'A', phone: '07', status: 'active', expiry: '2026-11-25T00:00:00', router_id: 3, router: { id: 3, name: 'South-B', ...router } }, NOW);

  it('reads the router state newer backends put on each customer', () => {
    expect(rec({ status: 'offline', status_is_stale: false, last_online_at: '2026-11-21T06:00:00' }).routerState)
      .toEqual({ status: 'offline', stale: false, lastOnline: new Date('2026-11-21T06:00:00Z') });
    expect(rec({}).routerState).toBeNull();
  });

  it('prefers the record, and keeps asking the router for older responses', () => {
    const asked = new Map([[3, { id: 3, reachable: true, lastOnline: null, stale: false, ageSeconds: 5 }]]);
    const down = mergeRouterStates([rec({ status: 'offline', last_online_at: '2026-11-21T06:00:00' })], asked).get(3);
    expect(down).toMatchObject({ reachable: false, lastOnline: new Date('2026-11-21T06:00:00Z'), ageSeconds: 5 });
    expect(mergeRouterStates([rec({})], asked).get(3)).toEqual(asked.get(3));
    expect(mergeRouterStates([rec({ status: 'online', status_is_stale: true })], new Map()).get(3)).toMatchObject({ reachable: true, stale: true });
  });
});

describe('customer list filters, as on the classic page', () => {
  const c = (over: Record<string, unknown>) => customerFacts({ id: 1, name: 'A', phone: '07', status: 'active', expiry: '2026-11-25T00:00:00', ...over }, NOW);
  const active = c({});
  const overdue = c({ status: 'expired', expiry: '2026-11-19T00:00:00' });
  const grace = c({ in_grace: true, effective_expiry: '2026-11-21T10:00:00', expiry: '2026-11-21T08:00:00' });
  const paused = c({ is_paused: true, status: 'inactive' });
  const visitor = c({ has_paid: false, tier: 'visitor' });

  it('puts each customer where the classic page does', () => {
    expect(inCustomerFilter(active, 'active', null)).toBe(true);
    expect(inCustomerFilter(overdue, 'overdue', null)).toBe(true);
    expect(inCustomerFilter(grace, 'overdue', null)).toBe(true);
    expect(inCustomerFilter(paused, 'overdue', null)).toBe(false);
    expect(inCustomerFilter(paused, 'paused', null)).toBe(true);
    expect(inCustomerFilter(active, 'offline', false)).toBe(true);
    expect(inCustomerFilter(overdue, 'offline', false)).toBe(false);
    expect(inCustomerFilter(active, 'online', null)).toBe(false);
  });

  it('never calls a visitor, or someone who never had paid time, overdue', () => {
    const lapsedVisitor = c({ status: 'expired', expiry: '2026-11-19T00:00:00', has_paid: false, tier: 'visitor' });
    const neverHadTime = c({ status: 'expired', expiry: null });
    expect(inCustomerFilter(lapsedVisitor, 'overdue', null)).toBe(false);
    expect(inCustomerFilter(neverHadTime, 'overdue', null)).toBe(false);
    expect(isLapsed(overdue)).toBe(true);
    // so "Win back" (the overdue count) leaves them out
    expect(customerCounts([overdue, lapsedVisitor, neverHadTime], () => null).filters.overdue).toBe(1);
  });

  it('counts paying customers and visitors', () => {
    expect(visitor.tier).toBe('visitor');
    expect(c({ has_paid: true }).tier).toBe('customer');
    expect(active.tier).toBeNull();
    const counts = customerCounts([active, overdue, visitor, paused], (p) => (p === active ? true : null));
    expect(counts.filters).toMatchObject({ all: 4, online: 1, overdue: 1, paused: 1 });
    expect(counts.tiers).toEqual({ all: 4, customer: 0, visitor: 1 });
    expect(counts.connections.Hotspot).toBe(4);
  });
});

describe('what an answer offers', () => {
  const owner = { role: 'reseller' as const, staff: null };
  const viewer = { role: 'reseller' as const, staff: { permissions: ['customers.view'] } } as never;

  it('offers a view-only staff member only what they can use', () => {
    expect(canOffer(owner, false, PERMISSIONS.messagingSend)).toBe(true);
    expect(canOffer(viewer, false, PERMISSIONS.messagingSend)).toBe(false);
    expect(canOffer(viewer, false, PERMISSIONS.customersManage)).toBe(false);
    expect(canOffer(viewer, false, PERMISSIONS.customersView, false)).toBe(true);
    expect(canOffer(viewer, false, [PERMISSIONS.dashboardView, PERMISSIONS.transactionsView], false)).toBe(false);
  });

  it('offers no change at all in a read-only view, but still lets it read', () => {
    expect(canOffer(owner, true, PERMISSIONS.customersManage)).toBe(false);
    expect(canOffer(owner, true, PERMISSIONS.transactionsView, false)).toBe(true);
    expect(canOffer(owner, true, undefined, false)).toBe(true);
  });
});

describe('logins with no billing customer', () => {
  it('are unbilled on PPPoE; a hotspot session without one may be a voucher', () => {
    expect(loginFacts({ username: 'x', online: true, profile: '5M', customer: null }, 'pppoe').unbilled).toBe(true);
    expect(loginFacts({ username: 'x', online: true, profile: '5M', customer: { id: 2, name: 'B' } }, 'pppoe').unbilled).toBe(false);
    expect(loginFacts({ mac_address: 'AA', online: true, login_by: 'http-chap', customer: null }, 'hotspot').unbilled).toBe(false);
  });
});

describe('port revenue', () => {
  it('reads each port’s week and month, and how much of the router’s money the ports explain', () => {
    expect(portFacts({ port: 'ether3', link: { up: true }, health: { status: 'active' }, revenue: { today: 100, this_week: 700, this_month: 2800, paying_customers: 4 } }))
      .toMatchObject({ today: 100, week: 700, month: 2800 });
    expect(portMoney({ router_this_month: 10000, attributed_this_month: 7000, unattributed_this_month: 3000 })).toEqual({ month: 10000, attributed: 7000, unattributed: 3000, share: 70 });
    expect(portMoney({ router_this_month: 0, attributed_this_month: 0 })).toMatchObject({ share: null });
    expect(portMoney(undefined)).toBeNull();
  });
});

describe('data caps', () => {
  const period = (cap_mb: number | null) => ({ cap_mb, total_mb: 6000, download_mb: 5000, upload_mb: 1000, percent_used: 0, fup_active: false });
  const usage = (cap: number | null | undefined, plan: number | null | undefined) =>
    ({ period: period(cap ?? null), ...(plan !== undefined ? { plan_data_cap_mb: plan } : {}) }) as never;

  it("fall back to the plan's cap when the usage read has none", () => {
    expect(periodCap(usage(null, 10240))).toEqual({ cap: 10240, known: true });
    expect(periodCap(usage(null, undefined), 51200)).toEqual({ cap: 51200, known: true });
    expect(periodCap(usage(20480, 10240))).toEqual({ cap: 20480, known: true });
    const u = usageFacts(usage(null, undefined), 5120);
    expect(u).toMatchObject({ cap: 5120, over: true, capKnown: true });
  });

  it('are "unlimited" only when the plan says so, else unknown', () => {
    expect(periodCap(usage(null, null))).toEqual({ cap: null, known: true });
    expect(periodCap(usage(null, undefined))).toEqual({ cap: null, known: false });
    expect(usageFacts(usage(null, undefined))?.capKnown).toBe(false);
  });

  it('come from the customer record’s plan when it carries one', () => {
    expect(customerFacts({ id: 1, phone: '07', status: 'active', expiry: null, plan: { name: 'P', data_cap_mb: 51200 } }, NOW).planCap).toBe(51200);
    expect(customerFacts({ id: 1, phone: '07', status: 'active', expiry: null, plan: { name: 'P', data_cap_mb: null } }, NOW).planCap).toBeNull();
    expect(customerFacts({ id: 1, phone: '07', status: 'active', expiry: null, plan: { name: 'P' } }, NOW).planCap).toBeUndefined();
  });
});

describe('plans', () => {
  it('show a customer count only from a real count field, never a price', () => {
    const base = { name: 'Weekly', price: 300, duration_value: 7, duration_unit: 'DAYS' };
    expect(planFacts({ ...base, active_customers: 42 }).customers).toBe(42);
    expect(planFacts({ ...base, customers: 300 }).customers).toBeNull();
    expect(planFacts({ ...base, customer_count: '300' }).customers).toBeNull();
    expect(planFacts({ ...base, active_customers: 12.5 }).customers).toBeNull();
  });

  it('say "unlimited" only for a plan recorded without a cap', () => {
    expect(planFacts({ name: 'A', price: 1, duration_value: 1, duration_unit: 'DAYS', data_cap_mb: null }).uncapped).toBe(true);
    expect(planFacts({ name: 'A', price: 1, duration_value: 1, duration_unit: 'DAYS' }).uncapped).toBe(false);
  });

  it('carry the cap, devices and router the classic page shows', () => {
    expect(planFacts({ name: 'Home', price: 1500, duration_value: 30, duration_unit: 'DAYS', speed: '10M/10M', connection_type: 'pppoe', data_cap_mb: 51200, max_devices: 3, router: { name: 'Main' } }, 'KES'))
      .toMatchObject({ typeLabel: 'PPPoE', duration: '30 days', speed: '10 Mbps', cap: '50 GB', devices: 3, router: 'Main' });
    expect(planFacts({ name: 'Free', price: 0, duration_value: 1, duration_unit: 'HOURS' }).price).toBe('Free');
  });
});

describe('trends', () => {
  const chart = (rows: Record<string, unknown>[], seriesKey: string, keys: string[]): ChartModel => ({
    labelKey: 'date', labelKind: 'date', rows,
    series: [{ key: seriesKey, label: seriesKey, kind: 'number' }],
    columns: [{ key: 'date', label: 'Date', kind: 'date' }, ...keys.map((k) => ({ key: k, label: k, kind: 'number' as const }))],
  });

  it('stacks the parts of a total', () => {
    const rows = [1, 2, 3].map((i) => ({ date: `2026-11-1${i}`, total_mb: 10 * i, download_mb: 8 * i, upload_mb: 2 * i }));
    const plan = trendPlan(chart(rows, 'total_mb', ['total_mb', 'download_mb', 'upload_mb']));
    expect(plan.stacked).toBe(true);
    expect(plan.bars.map((b) => b.key)).toEqual(['download_mb', 'upload_mb']);
    expect(plan.totalLine).toBeNull();
  });

  it('draws the total as a line when the parts leave some of it out', () => {
    const rows = [1, 2, 3].map((i) => ({ date: `2026-11-1${i}`, total_revenue: 100 * i, mpesa: 50 * i, paybill: 30 * i }));
    const plan = trendPlan(chart(rows, 'total_revenue', ['total_revenue', 'mpesa', 'paybill']));
    expect(plan).toMatchObject({ stacked: true, totalLine: { key: 'total_revenue' } });
  });

  it('does not stack what is not a part (counts beside money)', () => {
    const rows = [1, 2, 3].map((i) => ({ date: `2026-11-1${i}`, revenue: 100 * i, transactions: i }));
    expect(trendPlan(chart(rows, 'revenue', ['revenue', 'transactions'])).stacked).toBe(false);
  });

  it('finds the previous period to compare against', () => {
    const rows = [1, 2, 3].map((i) => ({ date: `2026-11-1${i}`, revenue: 100 * i, previous_revenue: 90 * i }));
    expect(trendPlan(chart(rows, 'revenue', ['revenue', 'previous_revenue'])).compare?.key).toBe('previous_revenue');
  });

  it('says the takeaway: total, peak, latest against the stretch before', () => {
    const said = trendTakeaway([10, 10, 10, 20, 20, 20, 5], [false, false, false, false, false, false, true]);
    expect(said.total).toBe(95);
    expect(said.peak).toEqual({ index: 3, value: 20 });
    expect(said.change).toMatchObject({ size: 3, latest: 60, before: 30, pct: 100 });
    expect(trendTakeaway([10, 20], [false, false]).change).toBeNull();
    expect(trendTakeaway([110, 90], [], [100, 100]).change).toMatchObject({ pct: 0, latest: 200, before: 200 });
    expect(periodWord('date', 'date')).toBe('days');
    expect(periodWord('week', 'text')).toBe('weeks');
  });
});
