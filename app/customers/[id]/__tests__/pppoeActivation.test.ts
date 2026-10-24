import { describe, expect, it } from 'vitest';
import {
  INACTIVE_NOT_ON_ROUTER,
  canActivatePaidUntil,
  formatPaidUntil,
  pppoeAccountProblem,
  pppoeSaveNotice,
} from '../pppoeActivation';

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

describe('canActivatePaidUntil', () => {
  const now = new Date('2026-10-24T09:00:00Z'); // 12:00 in GMT+3

  it('offers activation for an inactive PPPoE customer with a future expiry', () => {
    expect(canActivatePaidUntil({ status: 'inactive' }, true, '2026-11-20T12:00', now)).toBe(true);
  });

  it('not for active customers, hotspot customers, or a past/empty expiry', () => {
    expect(canActivatePaidUntil({ status: 'active' }, true, '2026-11-20T12:00', now)).toBe(false);
    expect(canActivatePaidUntil({ status: 'inactive' }, false, '2026-11-20T12:00', now)).toBe(false);
    expect(canActivatePaidUntil({ status: 'inactive' }, true, '2026-10-24T11:59', now)).toBe(false);
    expect(canActivatePaidUntil({ status: 'inactive' }, true, '', now)).toBe(false);
    expect(canActivatePaidUntil(null, true, '2026-11-20T12:00', now)).toBe(false);
  });

  it('reads the form value as GMT+3', () => {
    // 12:01 GMT+3 is 09:01 UTC: one minute after `now`.
    expect(canActivatePaidUntil({ status: 'inactive' }, true, '2026-10-24T12:01', now)).toBe(true);
  });
});

describe('formatPaidUntil', () => {
  it('formats the form value for the checkbox label', () => {
    expect(formatPaidUntil('2026-11-20T09:05')).toBe('20 Nov 2026, 09:05');
    expect(formatPaidUntil('')).toBe('');
  });
});

describe('pppoeSaveNotice', () => {
  it('says plainly that an activation recorded no payment', () => {
    expect(pppoeSaveNotice({ activated_paid_until: true, pppoe_reprovisioned: 'ok' })).toEqual({
      tone: 'success',
      text: 'Activated without a payment and added to the router.',
    });
    expect(pppoeSaveNotice({ activated_paid_until: true, pppoe_reprovisioned: 'retry_pending' })?.tone).toBe('warning');
  });

  it('explains a router that was not updated yet', () => {
    expect(pppoeSaveNotice({ pppoe_reprovisioned: 'retry_pending' })?.text).toContain('retries automatically');
    expect(pppoeSaveNotice({ pppoe_reprovisioned: 'failed' })?.tone).toBe('warning');
  });

  it('stays quiet when the router was updated or nothing was pushed', () => {
    expect(pppoeSaveNotice({ pppoe_reprovisioned: 'ok' })).toBeNull();
    expect(pppoeSaveNotice({ pppoe_reprovisioned: null })).toBeNull();
  });
});
