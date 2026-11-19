import { describe, expect, it } from 'vitest';
import { splitNext } from '../assistant';
import { customerFacts, bpsText, entityOf, paymentFacts, planDuration, planSpeed, routerFacts, uptimeText } from '../assistantEntities';
import { cardTitle, compactNumber, formatCell, statusSummary, toCsv, visualFor } from '../assistantVisual';

const days = [
  { date: '2026-11-13', label: 'Fri', revenue: 4920, transactions: 20 },
  { date: '2026-11-14', label: 'Sat', revenue: 650, transactions: 9 },
  { date: '2026-11-15', label: 'Sun', revenue: 530, transactions: 7 },
];

describe('how a result is drawn', () => {
  it('draws per-day figures as a trend, money first, one series so two scales never share an axis', () => {
    const v = visualFor({ data: [days[2], days[0], days[1]], totals: { revenue: 6100 } }, 'auto');
    expect(v.kind).toBe('trend');
    if (v.kind !== 'trend') return;
    expect(v.chart.labelKey).toBe('date');
    expect(v.chart.series.map((s) => s.key)).toEqual(['revenue']);
    expect(v.chart.rows.map((r) => r.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15']); // oldest first
  });

  it('follows the fields the model named, when they exist', () => {
    const v = visualFor({ data: days }, 'trend', { label: 'date', value: ['transactions'] });
    expect(v.kind === 'trend' && v.chart.series[0].key).toBe('transactions');
    // a field that is not in the data is ignored rather than drawn as zeros
    const w = visualFor({ data: days }, 'trend', { label: 'date', value: ['profit'] });
    expect(w.kind === 'trend' && w.chart.series[0].key).toBe('revenue');
  });

  it('ranks a small aggregate as bars, largest first, and never treats an id as a figure', () => {
    const v = visualFor({ plans: [
      { plan_id: 1, plan_name: 'Hourly 10', total_sales: 53, total_revenue: 530 },
      { plan_id: 2, plan_name: 'Monthly 1500', total_sales: 9, total_revenue: 13500 },
    ] }, 'bars', { label: 'plan_name', value: ['total_revenue'] });
    expect(v.kind).toBe('bars');
    if (v.kind !== 'bars') return;
    expect(v.chart.rows[0].plan_name).toBe('Monthly 1500');
    expect(v.chart.series.map((s) => s.kind)).toEqual(['money']);
  });

  it('keeps a list of records a table, even with numbers and dates in it', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `C${i}`, phone: '2547', amount: 50, created_at: '2026-11-19T10:00:00' }));
    expect(visualFor(rows, 'auto').kind).toBe('table');
  });

  it('counts rows by status for a share when no figure is named', () => {
    const v = visualFor([{ name: 'A', status: 'online' }, { name: 'B', status: 'online' }, { name: 'C', status: 'offline' }], 'share', { label: 'status' });
    expect(v.kind).toBe('share');
    if (v.kind !== 'share') return;
    expect(v.segments).toEqual([{ label: 'Online', value: 2, tone: 'good' }, { label: 'Offline', value: 1, tone: 'bad' }]);
  });

  it('shows a handful of totals as tiles and a wordy record as a detail card', () => {
    const tiles = visualFor({ balance: 85, total_purchased: 500, total_spent: 415, enabled: true }, 'auto');
    expect(tiles.kind).toBe('tiles');
    expect(tiles.kind === 'tiles' && tiles.items.map((t) => t.key)).toEqual(['balance', 'total_purchased', 'total_spent']);
    expect(visualFor({ name: 'Jane', phone: '2547', status: 'active', plan: 'Daily' }, 'auto').kind).toBe('record');
  });

  it('draws nothing for an empty result or when the model says none', () => {
    expect(visualFor(null).kind).toBe('empty');
    expect(visualFor({ data: days }, 'none').kind).toBe('empty');
  });

  it('summarises a status column only when it splits the rows', () => {
    const rows = [{ status: 'active' }, { status: 'active' }, { status: 'expired' }, { status: 'active' }];
    expect(statusSummary(rows)?.segments.map((s) => [s.label, s.value])).toEqual([['Active', 3], ['Expired', 1]]);
    expect(statusSummary(rows.map(() => ({ status: 'active' })))).toBeNull();
  });
});

describe('formatting', () => {
  it('formats money, percentages and big numbers', () => {
    expect(formatCell(1500, 'money', 'KES')).toBe('KES 1,500');
    expect(formatCell('1200.00', 'money', 'KES')).toBe('KES 1,200');
    expect(formatCell(12.345, 'percent')).toBe('12.3%');
    expect(compactNumber(4920)).toBe('4.9K');
    expect(compactNumber(2_400_000)).toBe('2.4M');
  });

  it('turns a route name into a card title', () => {
    expect(cardTitle('Get Revenue Over Time')).toBe('Revenue over time');
    expect(cardTitle('List Routers Api')).toBe('Routers');
    expect(cardTitle('Get SMS Credits')).toBe('SMS credits');
  });

  it('keeps a spreadsheet from running a cell as a formula', () => {
    const csv = toCsv([{ key: 'name', label: 'Name', kind: 'text' }], [{ name: '=HYPERLINK("x")' }, { name: 'a,b' }]);
    expect(csv.split('\n')).toEqual(['Name', '"\'=HYPERLINK(""x"")"', '"a,b"']);
  });
});

describe('follow-up questions', () => {
  it('splits the NEXT line off the answer', () => {
    expect(splitNext('You made KES 16,200.\nNEXT: Which plans sell most? | Who expires today?')).toEqual({
      text: 'You made KES 16,200.', next: ['Which plans sell most?', 'Who expires today?'],
    });
  });

  it('hides a marker that is still being typed, and leaves other text alone', () => {
    expect(splitNext('Done.\nNEX')).toEqual({ text: 'Done.', next: [] });
    expect(splitNext('The NEXT step is to add a plan.')).toEqual({ text: 'The NEXT step is to add a plan.', next: [] });
  });
});

describe('billing things', () => {
  const now = Date.parse('2026-11-19T20:00:00Z');

  it('recognises customers, routers, plans, payments and vouchers by their shape', () => {
    expect(entityOf({ data: [{ id: 1, name: 'Jane', phone: '2547', status: 'active', expiry: '2026-11-20T00:00:00' }], total: 40 })).toMatchObject({ entity: 'customer', single: false, total: 40 });
    expect(entityOf([{ id: 1, name: 'Shop', identity: 'r1', ip_address: '10.0.0.2' }])?.entity).toBe('router');
    expect(entityOf([{ id: 1, name: 'Daily', price: 50, duration_value: 1, duration_unit: 'DAYS' }])?.entity).toBe('plan');
    expect(entityOf({ transactions: [{ amount: 50, phone_number: '2547', status: 'failed' }] })?.entity).toBe('payment');
    expect(entityOf({ vouchers: [{ code: 'AB12', voucher_type: 'single', status: 'active' }] })?.entity).toBe('voucher');
    expect(entityOf({ id: 1, name: 'Jane', phone: '2547', status: 'active', expiry: '2026-11-20T00:00:00' })).toMatchObject({ entity: 'customer', single: true });
    expect(entityOf([{ date: '2026-11-19', revenue: 10 }])).toBeNull();
  });

  it('says where a customer stands from the paid time left', () => {
    const base = { id: 7, name: 'Jane', phone: '2547', status: 'active' };
    expect(customerFacts({ ...base, expiry: '2026-11-19T22:00:00' }, now)).toMatchObject({ state: 'expiring', left: 2 * 3_600_000 });
    expect(customerFacts({ ...base, expiry: '2026-11-25T22:00:00', plan: { name: 'Daily 50' }, router: { name: 'Shop' } }, now)).toMatchObject({ state: 'active', plan: 'Daily 50', router: 'Shop' });
    expect(customerFacts({ ...base, expiry: '2026-11-18T22:00:00' }, now).state).toBe('expired');
    expect(customerFacts({ ...base, expiry: '2026-11-18T22:00:00', is_paused: true }, now).state).toBe('paused');
    expect(customerFacts({ ...base, expiry: '2026-11-25T22:00:00', pppoe_username: 'jane' }, now).connection).toBe('PPPoE');
  });

  it('reads routers, plans and payments', () => {
    expect(routerFacts({ id: 1, name: 'Shop', identity: 'r1', status: 'offline', last_online_at: '2026-11-19T17:00:00', availability_checks: 200, availability_successes: 171 })).toMatchObject({ state: 'offline', uptime: 85.5 });
    expect(planDuration({ duration_value: 1, duration_unit: 'HOURS' })).toBe('1 hour');
    expect(planDuration({ duration_value: 30, duration_unit: 'DAYS' })).toBe('30 days');
    expect(planSpeed('5M/5M')).toBe('5 Mbps');
    expect(planSpeed('2M/10M')).toBe('10 Mbps down, 2 Mbps up');
    expect(paymentFacts({ amount: 50, phone_number: '2547', status: 'failed', result_desc: 'Request cancelled by user', customer: { name: 'David' } })).toMatchObject({ state: 'failed', who: 'David', reason: 'Request cancelled by user' });
    expect(paymentFacts({ amount: 50, customer_phone: '2547', payment_date: '2026-11-19T10:00:00' }).state).toBe('paid');
  });

  it('says router uptime and traffic in plain units', () => {
    expect(uptimeText('3d04:14:07')).toBe('3 d 4 h');
    expect(uptimeText('1w5d00:00:10')).toBe('12 d');
    expect(uptimeText('05:12:44')).toBe('5 h');
    expect(bpsText(12_400_000)).toBe('12 Mbps');
    expect(bpsText(2_300_000)).toBe('2.3 Mbps');
    expect(bpsText(640_000)).toBe('640 Kbps');
    expect(bpsText(null)).toBeNull();
  });
});
