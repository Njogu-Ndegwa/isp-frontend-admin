import { describe, expect, it } from 'vitest';
import catalog from './fixtures/assistantCatalogGets.json';
import { TABLE_FIXTURES } from '../../assistant/preview/tableFixtures';
import { entityOf } from '../assistantEntities';
import { findRows, type Row } from '../assistantView';
import { formatCell, visualFor, type Column, type Visual } from '../assistantVisual';
import { applySpec, fallbackTable, macTail, nameFromRouterComment, specFor, TABLE_SPECS, tableFor } from '../assistantTables';

const FULL_MAC = /\b([0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/i;
const RAW_ISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
/** keys that must never be a column, whatever the route */
const FORBIDDEN = /(^|[_-])(id|ids|uuid|pk)$|^\.|mac|^comment$|^address|^profile$|-/i;

type Table = Extract<Visual, { kind: 'table' }>;

/** Every cell of a table as the reader sees it. */
const cells = (t: { rows: Row[]; columns: Column[] }) => t.rows.flatMap((r) => t.columns.map((c) => formatCell(r[c.key], c.kind, 'KES')));

/** The rules every assistant table keeps, spec or fallback. */
function expectHumanTable(t: { rows: Row[]; columns: Column[] }, where: string) {
  expect(t.columns.length, where).toBeGreaterThan(0);
  expect(t.columns.length, where).toBeLessThanOrEqual(6);
  for (const c of t.columns) {
    if (c.key !== '__name') expect(c.key, `${where}: column ${c.key}`).not.toMatch(FORBIDDEN);
    expect(c.label, `${where}: label of ${c.key}`).not.toMatch(/_/);
    expect(c.label.charAt(0), `${where}: label of ${c.key}`).toBe(c.label.charAt(0).toUpperCase());
  }
  for (const text of cells(t)) {
    expect(text, where).not.toMatch(FULL_MAC);
    expect(text, where).not.toMatch(RAW_ISO);
    expect(text, where).not.toMatch(/^(null|undefined|\[object Object\])$/);
  }
  // a column empty on every row is left out (the name always stays)
  for (const c of t.columns.slice(1)) expect(t.rows.some((r) => r[c.key] !== null && r[c.key] !== undefined && r[c.key] !== ''), `${where}: ${c.key} empty`).toBe(true);
}

describe('router hotspot accounts read as people (OPIC, 24 Nov)', () => {
  const f = TABLE_FIXTURES.routerUsers;
  const v = visualFor(f.payload, 'table', null, f.path) as Table;

  it('is a table from its spec, names first, accounts that are no one left out and counted', () => {
    expect(v.kind).toBe('table');
    expect(v.columns.map((c) => c.label)).toEqual(['Name', 'Status', 'Plan', 'Time left', 'Online for', 'Data used']);
    expect(v.rows.map((r) => r.name)).toEqual(['Amina Hassan', 'Brian Kiptoo', 'Device ··00:C8', 'Guest 7824', 'Esther Moraa']);
    expect(v.dropped).toEqual({ n: 1, what: 'router accounts that are not customers ({n})' });
    expect(v.total).toBe(5);
    expectHumanTable(v, 'routerUsers');
  });

  it('shows status as a chip value, plan from the customer or the profile, uptime and data in words', () => {
    const amina = v.rows[0];
    const col = (k: string) => v.columns.find((c) => c.key === k)!;
    expect(amina.status).toBe('online');
    expect(v.rows[4].status).toBe('offline');
    expect(col('status').kind).toBe('status');
    expect(v.rows[2].plan).toBe('3M');
    expect(formatCell(amina.uptime, 'duration')).toBe('3h 12m');
    expect(formatCell(amina.data, 'bytes')).toBe('535 MB');
    expect(formatCell(amina.left, 'until')).toMatch(/^in (4h 5\dm|5h)$/);
    expect(formatCell(v.rows[4].left, 'until')).toMatch(/^ended 2h/);
  });

  it('keeps no hidden id or MAC in the shown columns; the meta line drops ids', () => {
    expect(v.meta.map(([k]) => k)).toEqual(['router_name', 'active_sessions']);
  });
});

describe('the table fixtures, as the chat draws them', () => {
  for (const [key, f] of Object.entries(TABLE_FIXTURES)) {
    it(`${key}: a component of its own, or a human table`, () => {
      const entity = entityOf(f.payload);
      const v = visualFor(f.payload, f.show, null, f.path);
      if (entity && !specFor(f.path, findRows(f.payload)?.rows ?? [])) {
        // customers, routers, plans, payments, PPPoE users: drawn by their own components
        expect(['customer', 'router', 'plan', 'payment', 'pppoe_user', 'hotspot_user']).toContain(entity.entity);
        return;
      }
      expect(v.kind).toBe('table');
      expectHumanTable(v as Table, key);
    });
  }

  it('reads router logs with MACs cut to their tail', () => {
    const f = TABLE_FIXTURES.hotspotLogs;
    const v = visualFor(f.payload, 'table', null, f.path) as Table;
    expect(v.columns.map((c) => c.label)).toEqual(['Event', 'Topic', 'Time']);
    expect(v.rows[0].event).toBe('··00:01 (10.5.50.11): logged in');
    expect(v.rows[0].topic).toBe('hotspot');
    expect(formatCell(v.rows[0].time, 'clock')).toBe('14:52');
  });
});

describe('every GET route the assistant can draw as a table', () => {
  // A row of the kind that leaked before: ids, a MAC, RouterOS fields, an address list, nulls, raw times.
  const hostile = (n: number): Row => ({
    id: n, router_id: 4, customer_id: 90 + n, '.id': `*${n}`, 'bytes-in': '1200', 'mac-address': `02:00:00:00:00:0${n}`,
    mac_address: `02:00:00:00:00:0${n}`, comment: `MACLOGIN|MAC:02:00:00:00:00:0${n}|EXP:1795545969`, address: '10.5.50.2',
    addresses: ['10.0.0.1/24'], nothing: null, created_at: '2026-11-24T10:15:00', status: n % 2 ? 'active' : 'expired',
    name: `Sample ${n}`, amount: 50 * n, uptime: '1h20m4s', total_bytes: 52_428_800 * n,
  });

  const concrete = (template: string) => template.replace(/\{[^}]+\}/g, '7');

  for (const route of catalog as { template: string; title: string; sample: Row | null }[]) {
    it(`${route.template}`, () => {
      const path = concrete(route.template);
      const rows = [1, 2, 3].map((n) => ({ ...hostile(n), ...(route.sample ?? {}) }));
      const spec = specFor(path, rows);
      const model = tableFor(path, rows);
      if (spec) expect(model.spec).toBe(spec.id);
      // a spec reads its own fields, so it is checked on its own fixture; the fallback must pass on anything
      const checked = spec ? null : model;
      if (checked) expectHumanTable(checked, route.template);
    });
  }

  it('every spec has a route the API index lists, and the routes drawn today have a spec or a component', () => {
    const templates = new Set((catalog as { template: string }[]).map((r) => r.template));
    for (const spec of TABLE_SPECS) {
      for (const p of spec.paths) expect(templates.has(p), `${spec.id}: ${p} is not a GET route the assistant sees`).toBe(true);
    }
    // the show=table routes of 24 Nov: each has a spec, or a component (entity), or reads well through the fallback
    const drawnToday = ['/api/routers/{router_id}/offline-customers', '/api/messaging/campaigns', '/api/routers/{router_id}/blocked-devices',
      '/api/routers/{router_id}/users', '/api/routers/{router_id}/illegal-connections', '/api/hotspot/{router_id}/logs',
      '/api/plans/performance', '/api/messaging/inbox', '/api/ads/{ad_id}/clicks'];
    for (const t of drawnToday) expect(specFor(concrete(t), []), t).not.toBeNull();
  });
});

describe('the fallback', () => {
  it('hides ids, MACs, RouterOS fields, address lists and empty columns, and humanises keys', () => {
    const rows: Row[] = [
      { id: 1, '.id': '*1', router_id: 2, mac_address: '02:00:00:00:00:01', 'bytes-in': '12', comment: 'x', address: '10.0.0.2', interface: 'ether2', list: ['a'], nothing: null, plan_name: 'Weekly', status: 'active', amount_paid: 300, created_at: '2026-11-20T08:00:00' },
      { id: 2, '.id': '*2', router_id: 2, mac_address: '02:00:00:00:00:02', 'bytes-in': '14', comment: 'y', address: '10.0.0.3', interface: 'ether2', list: ['b'], nothing: null, plan_name: 'Daily', status: 'expired', amount_paid: 50, created_at: '2026-11-21T08:00:00' },
    ];
    const t = fallbackTable(rows);
    expect(t.columns.map((c) => [c.key, c.label, c.kind])).toEqual([
      ['plan_name', 'Plan name', 'text'], ['status', 'Status', 'status'], ['amount_paid', 'Amount paid', 'money'], ['created_at', 'Created', 'when'],
    ]);
  });

  it('names a device known only by its MAC by the MAC tail', () => {
    const t = fallbackTable([{ mac_address: '02:00:00:00:C8:47', reason: 'bypass', blocked_at: '2026-11-20T08:00:00Z' }]);
    expect(t.columns[0].label).toBe('Name');
    expect(formatCell(t.rows[0][t.columns[0].key], t.columns[0].kind)).toBe('Device ··C8:47');
    expectHumanTable(t, 'mac only');
  });

  it('reads nested customer, plan and router records by their names', () => {
    const t = fallbackTable([{ customer: { id: 1, name: 'Amina' }, plan: { id: 3, name: 'Daily' }, router: { id: 1, name: 'Tower' }, amount: 50 }]);
    expect(t.rows[0].customer).toBe('Amina');
    expect(t.columns.map((c) => c.label)).toEqual(['Customer', 'Plan', 'Router', 'Amount']);
  });
});

describe('values as every table shows them', () => {
  const now = Date.UTC(2026, 10, 24, 12, 0, 0); // 15:00 in Nairobi
  it('data, durations, paid time and moments', () => {
    expect(formatCell(536_870_912, 'bytes')).toBe('512 MB');
    expect(formatCell(2.5 * 1024 ** 3, 'bytes')).toBe('2.50 GB');
    expect(formatCell(812.5, 'mb')).toBe('813 MB');
    expect(formatCell('1w2d03:04:05', 'duration')).toBe('9d 3h');
    expect(formatCell('2h5m1s', 'duration')).toBe('2h 5m');
    expect(formatCell(45, 'duration')).toBe('45s');
    expect(formatCell('2026-11-24T15:20:00', 'until', null, undefined, now)).toBe('in 3h 20m');
    expect(formatCell('2026-11-22T12:00:00', 'until', null, undefined, now)).toBe('ended 2d ago');
    expect(formatCell('2026-11-24T08:30:00', 'when', null, undefined, now)).toBe('today 11:30');
    expect(formatCell('2026-11-23T08:30:00', 'when', null, undefined, now)).toBe('yesterday 11:30');
    expect(formatCell('2026-11-20T08:30:00', 'when', null, undefined, now)).toBe('20 Nov, 11:30');
    expect(formatCell('nov/24/2026 14:22:10', 'clock', null, undefined, now)).toBe('today 14:22');
    expect(formatCell('02:00:00:00:C8:47', 'device')).toBe('··C8:47');
    expect(formatCell('payment_failed', 'status')).toBe('Payment failed');
    expect(formatCell('seen 02:00:00:00:C8:47 again', 'text')).toBe('seen ··C8:47 again');
  });

  it('translates the words it adds', () => {
    const fr = (s: string, v?: Record<string, string | number>) => ({ 'in {span}': 'dans {span}', Online: 'En ligne' } as Record<string, string>)[s]?.replace('{span}', String(v?.span ?? '')) ?? s;
    expect(formatCell('2026-11-24T15:20:00', 'until', null, fr, Date.UTC(2026, 10, 24, 12))).toBe('dans 3h 20m');
    expect(formatCell('online', 'status', null, fr)).toBe('En ligne');
  });
});

describe('router comments', () => {
  it('give the name our provisioning wrote, and nothing for our own tags', () => {
    expect(nameFromRouterComment('MACLOGIN|MAC:02:00:00:00:00:01|T:1|EXP:1795545969|CID:9|Esther Moraa')).toBe('Esther Moraa');
    expect(nameFromRouterComment('MACLOGIN|MAC:x|EXP:1|Voucher SAMPLE7 redeemed for Guest 7824')).toBe('Guest 7824');
    expect(nameFromRouterComment('CID:12|Jane Wanjiru|2026-11-02')).toBe('Jane Wanjiru');
    expect(nameFromRouterComment('MACLOGIN|MAC:02:00:00:00:00:01|T:1|EXP:2|CHECKIN')).toBe('');
    expect(nameFromRouterComment('office printer')).toBe('office printer');
    expect(macTail('02-00-00-00-c8-47')).toBe('··C8:47');
  });

  it('a spec applied to rows keeps its own columns only', () => {
    const spec = TABLE_SPECS.find((s) => s.id === 'blocked-devices')!;
    const t = applySpec(spec, [{ mac_address: '02:00:00:00:00:09', reason: 'bypass', blocked_at: null, disabled: false }]);
    expect(t.columns.map((c) => c.key)).toEqual(['name', 'status', 'reason']);
    expect(t.rows[0].name).toBe('Device ··00:09');
  });
});
