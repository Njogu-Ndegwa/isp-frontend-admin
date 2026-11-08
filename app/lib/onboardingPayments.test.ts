import { describe, expect, it } from 'vitest';
import { allRoutersVoucherOnly, paymentsStepDone } from './onboardingPayments';

describe('paymentsStepDone', () => {
  it('is done when the reseller has a payment method', () => {
    expect(paymentsStepDone(1, [{ payment_methods: ['mpesa', 'voucher'] }])).toBe(true);
  });

  it('is done without a payment method when every router is vouchers only', () => {
    expect(paymentsStepDone(0, [{ payment_methods: ['voucher'] }, { payment_methods: ['voucher'] }])).toBe(true);
  });

  it('is not done when any router collects M-Pesa', () => {
    expect(paymentsStepDone(0, [{ payment_methods: ['voucher'] }, { payment_methods: ['mpesa', 'voucher'] }])).toBe(false);
  });

  it('treats a router with no list as collecting M-Pesa (backend default)', () => {
    expect(paymentsStepDone(0, [{}])).toBe(false);
    expect(paymentsStepDone(0, [{ payment_methods: [] }])).toBe(false);
    expect(paymentsStepDone(0, [{ payment_methods: null }])).toBe(false);
  });

  it('is not done with no routers and no payment method', () => {
    expect(paymentsStepDone(0, [])).toBe(false);
    expect(allRoutersVoucherOnly([])).toBe(false);
  });
});
