import { describe, expect, it } from 'vitest';
import { displayFor } from '../assistantTables';
import { visualFor } from '../assistantVisual';

// "Which router earned the most?" / "sales per router" were answered as text (2026-11-25);
// GET /api/mpesa/transactions/by-router is drawn as bars, router names against the money.
describe('money per router', () => {
  const payload = {
    routers: [
      { router_id: 2, router: 'Big', amount: 300, payments: 2, failed_attempts: 1 },
      { router_id: 1, router: 'Small', amount: 50, payments: 1, failed_attempts: 1 },
    ],
    total_amount: 350,
    period: { date: null, start_date: '2026-11-01', end_date: '2026-11-25' },
  };

  it('is a ranking, drawn as bars (a table when asked)', () => {
    expect(displayFor('/api/mpesa/transactions/by-router', {}, 'auto')).toBe('bars');
    expect(displayFor('/api/mpesa/transactions/by-router', {}, 'table')).toBe('table');
  });

  it('draws each router with its money', () => {
    const v = visualFor(payload, 'bars', null, '/api/mpesa/transactions/by-router');
    expect(v.kind).toBe('bars');
    const drawn = JSON.stringify(v);
    expect(drawn).toContain('Big');
    expect(drawn).toContain('Small');
    expect(drawn).toMatch(/300/);
  });
});
