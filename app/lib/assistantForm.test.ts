import { describe, expect, it } from 'vitest';
import { fieldApplies } from './assistant';

describe('fieldApplies', () => {
  const till = { when: { method_type: ['mpesa_till'] } };
  it('shows a kind’s field only while that kind is picked', () => {
    expect(fieldApplies(till, { method_type: 'mpesa_till' })).toBe(true);
    expect(fieldApplies(till, { method_type: 'MPESA_TILL' })).toBe(true);
    expect(fieldApplies(till, { method_type: 'fapshi' })).toBe(false);
  });
  it('hides kind fields until a kind is chosen', () => {
    expect(fieldApplies(till, { method_type: '' })).toBe(false);
    expect(fieldApplies(till, {})).toBe(false);
  });
  it('always shows a field that belongs to no kind', () => {
    expect(fieldApplies({}, {})).toBe(true);
  });
});
