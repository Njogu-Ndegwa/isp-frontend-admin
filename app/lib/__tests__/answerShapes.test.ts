/**
 * Shape contract for the chat's answers: the payloads the assistant gets back most
 * often (taken from the demo data, which mirrors the API's shapes), each checked to
 * render as something that says what it holds.
 *
 * Two rules every answer must keep, whatever it is:
 *  - a chart is drawn only when what it plots moves (no flat line of zeros, no equal bars);
 *  - a kind of record with a component of its own is recognised as that record.
 * A new endpoint shape that breaks either fails here instead of reaching a reseller as an
 * empty chart (an uptime answer once came back as a flat "downtime seconds" line).
 */
import { describe, expect, it } from 'vitest';
import { entityOf } from '../assistantEntities';
import { varies, visualFor, type Visual } from '../assistantVisual';
import {
  demoAccessPoints, demoAdAnalytics, demoBandwidthHistory, demoCustomers, demoDashboardAnalytics, demoDashboardOverview,
  demoHotspotLogs, demoPlanPerformance, demoPlans, demoPortAnalytics, demoPortStatus, demoPPPoEActiveSessions, demoPPPoELogs,
  demoPPPoESecrets, demoRouterUptime, demoRouterUsers, demoRouters, demoTopUsers, demoTransactionSummary, demoTransactions,
  demoVouchersListResponse,
} from '../demoData';

const r = demoRouters[0];
const id = typeof r.id === 'number' ? r.id : 1;

/** What the chat gets back, by the question that usually brings it. */
const ANSWERS: [string, unknown][] = [
  ['routers', demoRouters],
  ['customers', { customers: demoCustomers, total: demoCustomers.length }],
  ['plans', demoPlans],
  ['payments', { transactions: demoTransactions, total: demoTransactions.length }],
  ['payment summary', demoTransactionSummary],
  ['vouchers', demoVouchersListResponse],
  ['dashboard', demoDashboardOverview],
  ['analytics', demoDashboardAnalytics],
  ['plan performance', demoPlanPerformance],
  ['top users', demoTopUsers],
  ['bandwidth', demoBandwidthHistory],
  ['uptime (week)', demoRouterUptime(id, 168)],
  ['uptime (day)', demoRouterUptime(id, 24)],
  ['router users', demoRouterUsers(id)],
  ['pppoe secrets', demoPPPoESecrets(id)],
  ['pppoe sessions', demoPPPoEActiveSessions(id)],
  ['pppoe logs', demoPPPoELogs(id)],
  ['hotspot logs', demoHotspotLogs(id)],
  ['ports', demoPortStatus(id)],
  ['port analytics', demoPortAnalytics(id)],
  ['access points', demoAccessPoints(id)],
  ['ad analytics', demoAdAnalytics()],
  // ids only (the Customers page's online filter): nothing a person can read
  ['realtime online ids', { router_ids: [12], online_customer_ids: [34733, 1850, 2889] }],
];

const HINTS = ['auto', 'trend', 'bars', 'table', 'tiles', 'card'];

function cardIsBlank(v: Visual): boolean {
  if (v.kind !== 'record') return false;
  return !v.commands.length && !v.fields.some(([, x]) => x !== null && x !== undefined && x !== '' && typeof x !== 'object');
}

function chartIsFlat(v: Visual): boolean {
  if (v.kind !== 'trend' && v.kind !== 'bars') return false;
  return v.chart.series.every((s) => !varies(v.chart.rows, s.key));
}

describe('every common answer draws something that says what it holds', () => {
  for (const [name, payload] of ANSWERS) {
    it(`${name}: no flat chart, whatever the model hints`, () => {
      for (const hint of HINTS) {
        const v = visualFor(payload, hint);
        if (name !== 'realtime online ids') expect(v.kind, `${name} / ${hint}`).not.toBe('empty');
        expect(chartIsFlat(v), `${name} / ${hint} drew a chart of nothing`).toBe(false);
        expect(cardIsBlank(v), `${name} / ${hint} drew a card with nothing to read`).toBe(false);
      }
    });
  }
});

describe('records with a component of their own are recognised', () => {
  const cases: [string, unknown, string][] = [
    ['routers', demoRouters, 'router'],
    ['customers', { customers: demoCustomers }, 'customer'],
    ['plans', demoPlans, 'plan'],
    ['payments', { transactions: demoTransactions }, 'payment'],
    ['vouchers', demoVouchersListResponse, 'voucher'],
    ['uptime', demoRouterUptime(id, 168), 'uptime'],
    ['pppoe secrets', demoPPPoESecrets(id), 'pppoe_user'],
    ['port analytics', demoPortAnalytics(id), 'port'],
  ];
  for (const [name, payload, entity] of cases) {
    it(`${name} -> ${entity}`, () => {
      expect(entityOf(payload)?.entity).toBe(entity);
    });
  }
});

describe('an uptime answer', () => {
  it('is one uptime record, not its timeline as a list', () => {
    const e = entityOf(demoRouterUptime(id, 168));
    expect(e).toMatchObject({ entity: 'uptime', single: true });
    expect(e?.rows).toHaveLength(1);
  });

  it('with no downtime at all is never a flat chart of zeros', () => {
    const quiet = { ...demoRouterUptime(id, 168) };
    quiet.timeline = (quiet.timeline ?? []).map((s) => ({ ...s, status: 'up' as const, downtime_seconds: 0 }));
    expect(entityOf(quiet)?.entity).toBe('uptime');
    // even drawn without its component, the timeline alone says "0 throughout" in words
    const v = visualFor({ timeline: quiet.timeline }, 'trend');
    expect(v.kind).toBe('text');
    if (v.kind === 'text') expect(v.text).toMatch(/0 throughout/);
  });
});

describe('a flat series', () => {
  const flat = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'].map((date) => ({ date, revenue: 0, transactions: 0 }));

  it('is said in words, not drawn as a line', () => {
    const v = visualFor({ data: flat }, 'auto');
    expect(v.kind).toBe('text');
    if (v.kind === 'text') expect(v.text).toMatch(/throughout/);
  });

  it('gives way to a measure that moves', () => {
    const v = visualFor({ data: flat.map((x, i) => ({ ...x, transactions: i * 3 })) }, 'trend');
    expect(v.kind).toBe('trend');
    if (v.kind === 'trend') expect(v.chart.series.map((s) => s.key)).toEqual(['transactions']);
  });

  it('as equal bars is a table, not a ranking', () => {
    const v = visualFor([{ name: 'A', customers: 4 }, { name: 'B', customers: 4 }, { name: 'C', customers: 4 }], 'bars');
    expect(v.kind).toBe('table');
  });
});

describe('a new router setup code', () => {
  it('is recognised by its command and token, not by the question', async () => {
    const { isRouterSetup } = await import('../../assistant/blocks/RouterSetupBlock');
    expect(isRouterSetup({ token: 'abc', command: '/tool fetch url=...', expires_in_hours: 24, vpn_type: 'wireguard' })).toBe(true);
    expect(isRouterSetup({ token: 'abc', status: 'pending' })).toBe(false);
    expect(isRouterSetup([{ command: 'x', token: 'y', expires_in_hours: 1 }])).toBe(false);
  });
});
