import { describe, expect, it } from 'vitest';
import { ApiError } from '../api';
import {
  MANUAL_PAYMENT_OPTIONS,
  activationConflict,
  activationConflictMessage,
} from '../manualActivation';

const paidDetail = {
  code: 'customer_already_paid',
  message: 'This customer already paid at 2026-10-27 12:49 UTC ...',
  customer_id: 47890,
  status: 'active',
  expiry: '2026-11-26T12:49:41',
  last_payment_at: '2026-10-27T12:49:41',
  last_payment_amount: 1000,
  last_payment_method: 'mobile_money',
};

describe('MANUAL_PAYMENT_OPTIONS', () => {
  it('offers only honest manual methods (no M-Pesa or Voucher that were saved as cash)', () => {
    expect(MANUAL_PAYMENT_OPTIONS.map((o) => o.value)).toEqual(['cash', 'other']);
    expect(MANUAL_PAYMENT_OPTIONS.map((o) => o.label)).toEqual(['Cash received', 'Paid outside the system']);
  });
});

describe('activationConflict', () => {
  it('recognises the 409 the backend sends for an already-paid customer', () => {
    const err = new ApiError('{...}', 409, paidDetail);
    expect(activationConflict(err)?.code).toBe('customer_already_paid');
  });

  it('ignores other errors, including unrelated 409s', () => {
    expect(activationConflict(new ApiError('nope', 400))).toBeNull();
    expect(activationConflict(new ApiError('limit', 409, { code: 'device_limit_reached' }))).toBeNull();
    expect(activationConflict(new Error('network'))).toBeNull();
    expect(activationConflict(null)).toBeNull();
  });
});

describe('activationConflictMessage', () => {
  it('says the customer already paid and until when, in GMT+3', () => {
    expect(activationConflictMessage(paidDetail as never)).toBe(
      'This customer already paid (M-Pesa) at Oct 27, 2026, 03:49 PM and is active until Nov 26, 2026, 03:49 PM.',
    );
  });

  it('says the customer is already active when there was no recent payment', () => {
    expect(
      activationConflictMessage({
        ...paidDetail,
        code: 'customer_already_active',
        last_payment_at: null,
        last_payment_method: null,
      } as never),
    ).toBe('This customer is already active until Nov 26, 2026, 03:49 PM.');
  });
});
