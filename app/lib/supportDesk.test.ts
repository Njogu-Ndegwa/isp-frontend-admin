import { describe, expect, it } from 'vitest';
import {
  SupportCustomerRow,
  SupportDecision,
  SupportDeskSnapshot,
  countByStatus,
  customerStatusMeta,
  decisionBlocksButtons,
  decisionStatusLabel,
  filterCustomers,
  formatAge,
  freshness,
  groupByCategory,
  isOpenEntry,
  isWaitingOnDennis,
  latestDecisions,
  mergeDecisions,
  openPromises,
  scopeCustomers,
  validateDecisionNote,
  waitingOnDennis,
} from './supportDesk';

const rows: SupportCustomerRow[] = [
  {
    id: 'c1', name: 'Prince', status: 'us', last_at: '2026-10-23T14:28:42+03:00',
    open_promises: 1,
    work: [
      { date: '2026-10-23', at: '13:26', category: 'promise', title: 'Send LiteBeam prices', outcome: 'open' },
      { date: '2026-10-23', at: '13:30', category: 'needs_dennis', title: 'Approve discount', outcome: 'open' },
    ],
  },
  { id: 'c2', name: 'Kwetu Net', status: 'done', last_at: '2026-10-22T09:00:00+03:00', tickets: ['BW-046'] },
  { id: 'c3', name: 'Swapnet', status: 'customer', window: { last: '2026-10-23T15:00:00+03:00' } },
];

const snapshot: SupportDeskSnapshot = {
  generated_at: '2026-10-23T12:00:00Z',
  customers: { rows },
  worklog: {
    entries: [
      { date: '2026-10-23', at: '13:30', category: 'needs_dennis', title: 'Approve discount', outcome: 'open' },
      { date: '2026-10-22', at: '10:00', category: 'needs_dennis', title: 'Refund call', outcome: 'done' },
      { date: '2026-10-22', at: '11:00', category: 'needs_dennis', title: 'Pick SMS provider' },
      { date: '2026-10-22', at: '12:00', category: 'support', title: 'Explained vouchers', outcome: 'sent' },
      { date: '2026-10-23', at: '08:00', category: 'support', title: 'Reset router', outcome: 'done' },
      { date: '2026-10-23', at: '08:30', category: 'mystery', title: 'Unknown kind' },
    ],
  },
};

describe('customer status', () => {
  it('maps the four builder statuses to the laptop labels', () => {
    expect(customerStatusMeta('us').label).toBe('Waiting on us');
    expect(customerStatusMeta('customer').label).toBe('Waiting on customer');
    expect(customerStatusMeta('dennis').label).toBe('With Dennis');
    expect(customerStatusMeta('done').label).toBe('Done');
  });
  it('never renders undefined for an unknown status', () => {
    expect(customerStatusMeta(undefined).label).toBe('Unknown');
    expect(customerStatusMeta('new_thing').label).toBe('new_thing');
  });
  it('counts rows per status', () => {
    expect(countByStatus(rows)).toEqual({ all: 3, us: 1, customer: 1, dennis: 0, done: 1 });
  });
});

describe('filterCustomers', () => {
  it('filters by status and sorts newest conversation first', () => {
    expect(filterCustomers(rows, { status: 'all', query: '' }).map((r) => r.id)).toEqual(['c3', 'c1', 'c2']);
    expect(filterCustomers(rows, { status: 'done', query: '' }).map((r) => r.id)).toEqual(['c2']);
  });
  it('searches names, tickets and work log text', () => {
    expect(filterCustomers(rows, { status: 'all', query: 'bw-046' }).map((r) => r.id)).toEqual(['c2']);
    expect(filterCustomers(rows, { status: 'all', query: 'litebeam' }).map((r) => r.id)).toEqual(['c1']);
  });
  it('can show only customers with open promises', () => {
    expect(filterCustomers(rows, { status: 'all', query: '', promisesOnly: true }).map((r) => r.id)).toEqual(['c1']);
  });
});

describe('scopeCustomers', () => {
  const scoped: SupportCustomerRow[] = [
    { id: 'w1', status: 'us', window: { messages: 4 } },
    { id: 'w2', status: 'dennis', window: { messages: 1 } },
    { id: 'h1', status: 'us', window: { messages: 0 } },
    { id: 'h2', status: 'done' },
  ];
  it('keeps only customers with messages in the intake window by default', () => {
    expect(scopeCustomers(scoped, 'window').map((r) => r.id)).toEqual(['w1', 'w2']);
    expect(countByStatus(scopeCustomers(scoped, 'window'))).toEqual({ all: 2, us: 1, customer: 0, dennis: 1, done: 0 });
  });
  it('returns the full history for the "all" scope', () => {
    expect(scopeCustomers(scoped, 'all')).toHaveLength(4);
    expect(countByStatus(scopeCustomers(scoped, 'all')).us).toBe(2);
  });
});

describe('work log', () => {
  it('treats a missing outcome as open', () => {
    expect(isOpenEntry({})).toBe(true);
    expect(isOpenEntry({ outcome: 'open' })).toBe(true);
    expect(isOpenEntry({ outcome: 'done' })).toBe(false);
  });
  it('lists open promises for a customer', () => {
    expect(openPromises(rows[0]).map((e) => e.title)).toEqual(['Send LiteBeam prices']);
  });
  it('groups by category in the laptop order, unknown kinds last, newest first', () => {
    const groups = groupByCategory(snapshot.worklog!.entries!);
    expect(groups.map((g) => g.category)).toEqual(['support', 'needs_dennis', 'mystery']);
    expect(groups[0].entries.map((e) => e.title)).toEqual(['Reset router', 'Explained vouchers']);
  });
});

describe('waitingOnDennis', () => {
  it('returns open needs_dennis items once, with the linked customer name', () => {
    const items = waitingOnDennis(snapshot);
    expect(items.map((e) => e.title)).toEqual(['Approve discount', 'Pick SMS provider']);
    expect(items[0].customerName).toBe('Prince');
    expect(items[1].customerName).toBeUndefined();
  });
  it('copes with an empty snapshot', () => {
    expect(waitingOnDennis({})).toEqual([]);
  });
});

describe('freshness', () => {
  const now = Date.parse('2026-10-23T12:20:00Z');
  it('uses generated_at and is fresh within 30 minutes', () => {
    const f = freshness({ received_at: '2026-10-23T12:01:00Z', snapshot }, now);
    expect(f).toEqual({ updatedAt: '2026-10-23T12:00:00.000Z', ageMinutes: 20, stale: false });
  });
  it('is stale after 30 minutes', () => {
    expect(freshness({ received_at: '', snapshot }, now + 11 * 60000).stale).toBe(true);
  });
  it('falls back to received_at, and treats no timestamp as stale', () => {
    expect(freshness({ received_at: '2026-10-23T12:15:00Z', snapshot: {} }, now).ageMinutes).toBe(5);
    expect(freshness({ received_at: 'garbage', snapshot: {} }, now).stale).toBe(true);
  });
  it('formats ages for people', () => {
    expect(formatAge(0)).toBe('just now');
    expect(formatAge(12)).toBe('12 min ago');
    expect(formatAge(135)).toBe('2 h 15 min ago');
    expect(formatAge(60 * 72)).toBe('3 days ago');
    expect(formatAge(null)).toBe('unknown');
  });
});

describe('waiting on Dennis with stable ids', () => {
  it('counts "waiting" needs_dennis entries as still waiting on him', () => {
    expect(isWaitingOnDennis({ category: 'needs_dennis', outcome: 'waiting' })).toBe(true);
    expect(isWaitingOnDennis({ category: 'needs_dennis' })).toBe(true);
    expect(isWaitingOnDennis({ category: 'needs_dennis', outcome: 'closed_by_dennis' })).toBe(false);
    expect(isWaitingOnDennis({ category: 'promise', outcome: 'waiting' })).toBe(false);
  });
  it('dedupes by id and keeps the customer name from the linked row', () => {
    const items = waitingOnDennis({
      worklog: {
        entries: [
          { id: 'wl-aaaaaaaaaaaa', date: '2026-10-24', at: '09:35', category: 'needs_dennis', title: 'New lead: Hey', outcome: 'waiting' },
          { id: 'wl-bbbbbbbbbbbb', date: '2026-10-24', at: '09:00', category: 'needs_dennis', title: 'Closed', outcome: 'closed_by_dennis' },
        ],
      },
      customers: {
        rows: [{
          id: 'c9', name: 'Ali',
          work: [{ id: 'wl-aaaaaaaaaaaa', date: '2026-10-24', at: '09:35', category: 'needs_dennis', title: 'New lead: Hey', outcome: 'waiting' }],
        }],
      },
    });
    expect(items.map((e) => e.id)).toEqual(['wl-aaaaaaaaaaaa']);
    expect(items[0].customerName).toBe('Ali');
  });
});

describe('decisions', () => {
  const go: SupportDecision = {
    id: 1, item_id: 'wl-a', action: 'go', note: null,
    created_at: '2026-10-24T06:40:00Z', consumed_at: '2026-10-24T06:43:00Z',
  };
  const close: SupportDecision = {
    id: 2, item_id: 'wl-a', action: 'close', note: 'sorted', created_at: '2026-10-24T07:00:00Z', consumed_at: null,
  };
  const clock = (iso: string) => new Date(iso).toISOString().slice(11, 16);

  it('keeps the newest decision per item, comparing real times', () => {
    expect(latestDecisions([go, close]).get('wl-a')?.id).toBe(2);
    expect(latestDecisions([close, go]).get('wl-a')?.id).toBe(2);
    // An optimistic copy has milliseconds; it must still win over an older server row.
    const optimistic: SupportDecision = { ...go, id: 'local-1', created_at: '2026-10-24T07:00:00.500Z', consumed_at: null, optimistic: true };
    expect(latestDecisions([close, optimistic]).get('wl-a')?.id).toBe('local-1');
  });
  it('merges local decisions the server does not list yet, without duplicates', () => {
    const merged = mergeDecisions([go], [go, close]);
    expect(merged.map((d) => d.id)).toEqual([1, 2]);
  });
  it('blocks the buttons only while a decision waits for the laptop', () => {
    expect(decisionBlocksButtons(undefined)).toBe(false);
    expect(decisionBlocksButtons(go)).toBe(false);
    expect(decisionBlocksButtons(close)).toBe(true);
  });
  it('describes pending and picked-up decisions', () => {
    expect(decisionStatusLabel(go, clock)).toBe('Go sent 06:40 · agent picked up 06:43');
    expect(decisionStatusLabel(close, clock)).toBe('Close sent 07:00 · waiting for the agent');
    expect(decisionStatusLabel({ ...close, optimistic: true }, clock)).toBe('Sending close…');
  });
  it('limits the note to 500 characters', () => {
    expect(validateDecisionNote('x'.repeat(500))).toBeNull();
    expect(validateDecisionNote('x'.repeat(501))).toMatch(/500/);
    expect(validateDecisionNote('')).toBeNull();
  });
});
