import { describe, expect, it } from 'vitest';
import { INACTIVE_NOT_ON_ROUTER, pppoeAccountProblem } from '../pppoeActivation';

describe('pppoeAccountProblem', () => {
  it('tells the reseller to activate an inactive customer instead of re-saving', () => {
    expect(pppoeAccountProblem('missing_from_mikrotik', 'inactive', 'api')).toBe(INACTIVE_NOT_ON_ROUTER);
    expect(pppoeAccountProblem('missing_from_mikrotik', 'pending', 'api')).toBe(INACTIVE_NOT_ON_ROUTER);
    expect(INACTIVE_NOT_ON_ROUTER).toBe('Customer is inactive – press Activate to put them on the router.');
  });

  it('keeps the re-save advice for an active customer whose login is missing', () => {
    expect(pppoeAccountProblem('missing_from_mikrotik', 'active', 'api')).toContain('Re-save the customer');
  });

  it('keeps the re-save advice when the status is unknown (older API)', () => {
    expect(pppoeAccountProblem('missing_from_mikrotik', undefined, 'api')).toContain('Re-save the customer');
  });

  it('other verdicts are unchanged and unknown codes fall back to the API message', () => {
    expect(pppoeAccountProblem('present_but_disabled', 'inactive', 'api')).toContain('disabled');
    expect(pppoeAccountProblem('something_new', 'active', 'from the API')).toBe('from the API');
  });
});
