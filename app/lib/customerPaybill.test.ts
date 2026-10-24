import { describe, expect, it } from 'vitest';
import type { PaymentMethodConfig } from './types';
import {
  PLATFORM_PAYBILL,
  customerPaybill,
  ownC2BPaybill,
  paybillAccountLabel,
} from './customerPaybill';

function method(overrides: Partial<PaymentMethodConfig>): PaymentMethodConfig {
  return {
    id: 1,
    user_id: 713,
    method_type: 'mpesa_paybill_with_keys',
    label: 'Own paybill',
    is_active: true,
    created_at: '2026-10-01T00:00:00',
    updated_at: '2026-10-01T00:00:00',
    mpesa_shortcode: '1365970',
    c2b_registered_at: '2026-10-02T00:00:00',
    ...overrides,
  };
}

describe('customerPaybill', () => {
  it("uses the reseller's own active C2B-registered paybill", () => {
    expect(customerPaybill([method({})])).toBe('1365970');
  });

  it('uses the platform paybill when the reseller has no payment methods', () => {
    expect(customerPaybill([])).toBe(PLATFORM_PAYBILL);
    expect(customerPaybill(null)).toBe(PLATFORM_PAYBILL);
    expect(customerPaybill(undefined)).toBe(PLATFORM_PAYBILL);
  });

  it('uses the platform paybill when the own paybill is not C2B-registered', () => {
    // Safaricom would not tell us about the payment, so it could not renew the customer.
    expect(customerPaybill([method({ c2b_registered_at: null })])).toBe(PLATFORM_PAYBILL);
    expect(customerPaybill([method({ c2b_registered_at: undefined })])).toBe(PLATFORM_PAYBILL);
  });

  it('uses the platform paybill when the own paybill is inactive', () => {
    expect(customerPaybill([method({ is_active: false })])).toBe(PLATFORM_PAYBILL);
  });

  it('uses the platform paybill when the method has no shortcode', () => {
    expect(customerPaybill([method({ mpesa_shortcode: '  ' })])).toBe(PLATFORM_PAYBILL);
    expect(customerPaybill([method({ mpesa_shortcode: undefined })])).toBe(PLATFORM_PAYBILL);
  });

  it('ignores payout-only methods (paybill without keys, till, bank, others)', () => {
    expect(
      customerPaybill([
        method({ method_type: 'mpesa_paybill', mpesa_shortcode: undefined, mpesa_paybill_number: '600000' }),
        method({ method_type: 'mpesa_till', mpesa_shortcode: undefined, mpesa_till_number: '123456' }),
        method({ method_type: 'bank_account', mpesa_shortcode: undefined, bank_paybill_number: '522522' }),
        method({ method_type: 'zenopay', mpesa_shortcode: undefined }),
      ]),
    ).toBe(PLATFORM_PAYBILL);
  });

  it('picks the registered paybill among other methods and trims it', () => {
    expect(
      customerPaybill([
        method({ id: 1, method_type: 'mpesa_till', mpesa_shortcode: undefined, mpesa_till_number: '123456' }),
        method({ id: 2, mpesa_shortcode: ' 1365970 ' }),
      ]),
    ).toBe('1365970');
  });

  it('prefers the newest registered paybill when there are several', () => {
    expect(
      ownC2BPaybill([
        method({ id: 1, mpesa_shortcode: '111111', created_at: '2026-09-01T00:00:00' }),
        method({ id: 2, mpesa_shortcode: '222222', created_at: '2026-10-01T00:00:00' }),
      ]),
    ).toBe('222222');
  });
});

describe('paybillAccountLabel', () => {
  it('shows "paybill — account"', () => {
    expect(paybillAccountLabel('1365970', '12345674')).toBe('1365970 — 12345674');
    expect(paybillAccountLabel(PLATFORM_PAYBILL, '12345674')).toBe('4159825 — 12345674');
  });

  it('shows only the account number while the paybill is unknown', () => {
    expect(paybillAccountLabel(null, '12345674')).toBe('12345674');
  });
});
