import { describe, it, expect } from 'vitest';
import { buildRecipientSelection, SelectionState } from './recipientSelection';

describe('buildRecipientSelection', () => {
  it('segment default: count = total, no exclude field, filter set', () => {
    const state: SelectionState = {
      mode: 'active',
      baseAll: true,
      overrides: [],
      totalCount: 62,
    };
    const sel = buildRecipientSelection(state);
    expect(sel.filter).toBe('active');
    expect(sel.count).toBe(62);
    expect(sel.exclude_customer_ids).toBeUndefined();
    expect(sel.customer_ids).toBeUndefined();
    expect(sel.summaryLabel).toBe('Active · 62');
  });

  it('by_plan maps to filter "by_plan" and carries planId', () => {
    const sel = buildRecipientSelection({
      mode: 'by_plan',
      planId: 7,
      baseAll: true,
      overrides: [],
      totalCount: 10,
    });
    expect(sel.filter).toBe('by_plan');
    expect(sel.planId).toBe(7);
  });

  it('segment with 2 excludes: count = total - 2, exclude list present', () => {
    const sel = buildRecipientSelection({
      mode: 'all',
      baseAll: true,
      overrides: [101, 202],
      totalCount: 62,
    });
    expect(sel.count).toBe(60);
    expect(sel.exclude_customer_ids).toEqual([101, 202]);
    expect(sel.customer_ids).toBeUndefined();
    expect(sel.summaryLabel).toBe('All · 60 of 62');
  });

  it('segment select-none: baseAll false, count 0, customer_ids empty', () => {
    const sel = buildRecipientSelection({
      mode: 'active',
      baseAll: false,
      overrides: [],
      totalCount: 200,
    });
    expect(sel.count).toBe(0);
    expect(sel.customer_ids).toEqual([]);
    expect(sel.exclude_customer_ids).toBeUndefined();
    expect(sel.filter).toBeUndefined();
  });

  it('specific mode with 3 includes: count 3, customer_ids set', () => {
    const sel = buildRecipientSelection({
      mode: 'specific',
      baseAll: false,
      overrides: [1, 2, 3],
      totalCount: 0,
    });
    expect(sel.count).toBe(3);
    expect(sel.customer_ids).toEqual([1, 2, 3]);
    expect(sel.exclude_customer_ids).toBeUndefined();
    expect(sel.filter).toBeUndefined();
    expect(sel.summaryLabel).toBe('Specific · 3 selected');
  });

  it('exclusions persist regardless of which rows are "loaded" (pure fn of state)', () => {
    // Same state, called twice — there is no concept of a loaded page slice in
    // the helper, so the descriptor is identical whether 10 or 10000 rows are
    // currently displayed. Excludes survive search/pagination by construction.
    const state: SelectionState = {
      mode: 'expiring',
      baseAll: true,
      overrides: [55],
      totalCount: 200,
    };
    const a = buildRecipientSelection(state);
    const b = buildRecipientSelection({ ...state, overrides: [...state.overrides] });
    expect(a).toEqual(b);
    expect(a.count).toBe(199);
    expect(a.exclude_customer_ids).toEqual([55]);
    // The excluded id is honored even though it is not part of any "page".
    expect(a.exclude_customer_ids).toContain(55);
  });
});
