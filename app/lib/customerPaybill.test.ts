import { describe, expect, it } from 'vitest';
import type { PaymentMethodConfig } from './types';
import {
  PLATFORM_PAYBILL,
  customerPaybill,
  ownC2BPaybill,
  paybillAccountLabel,
  paybillForCustomer,
  payByMpesaFor,
  payByMpesaMessage,
  whatsappShareUrl,
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

describe('paybillForCustomer', () => {
  it("shows the reseller's own C2B paybill the backend resolved for the customer", () => {
    expect(paybillForCustomer({ payment_paybill: '1365970' }, PLATFORM_PAYBILL)).toBe('1365970');
  });

  it('shows the platform paybill the backend sends for a platform-collected customer', () => {
    // The value comes from the API (settings.MPESA_SHORTCODE), not this file.
    expect(paybillForCustomer({ payment_paybill: '4159825' }, '1365970')).toBe('4159825');
  });

  it("trusts the backend's null: no account-number paybill on that router", () => {
    expect(paybillForCustomer({ payment_paybill: null }, PLATFORM_PAYBILL)).toBeNull();
    expect(paybillForCustomer({ payment_paybill: '  ' }, PLATFORM_PAYBILL)).toBeNull();
  });

  it('falls back to the reseller-wide paybill only when the API sent no field', () => {
    expect(paybillForCustomer({}, '1365970')).toBe('1365970');
    expect(paybillForCustomer({}, customerPaybill([]))).toBe(PLATFORM_PAYBILL);
    expect(paybillForCustomer({}, null)).toBeNull();
  });
});

describe('payByMpesaFor', () => {
  const card = {
    paybill: '4159825', account_number: '48201503', amount: 1500, unavailable_reason: null,
  } as const;

  it("uses the backend's card as is, even when it says no paybill", () => {
    expect(payByMpesaFor({ pay_by_mpesa: card, connection_type: 'hotspot' }, '999')).toBe(card);
    const none = { paybill: null, account_number: null, amount: null, unavailable_reason: 'no_paybill' as const };
    expect(payByMpesaFor({ pay_by_mpesa: none, payment_paybill: '4159825', account_number: '48201503', connection_type: 'pppoe', pppoe_username: 'a' }, PLATFORM_PAYBILL)).toBe(none);
  });

  it('derives PPPoE and static IP cards when the backend sends none', () => {
    expect(payByMpesaFor({
      account_number: '48201503', connection_type: 'pppoe', pppoe_username: 'jk',
      plan: { id: 5, name: 'Home', price: 3000, connection_type: 'pppoe' },
    }, PLATFORM_PAYBILL)).toEqual({ paybill: PLATFORM_PAYBILL, account_number: '48201503', amount: 3000, unavailable_reason: null });
    expect(payByMpesaFor({
      account_number: '48201503', payment_paybill: '555111',
      plan: { id: 9, name: 'Static', price: 4000, connection_type: 'static_ip' },
    }, PLATFORM_PAYBILL).paybill).toBe('555111');
  });

  it('never offers a paybill to hotspot customers, or where the backend said none', () => {
    expect(payByMpesaFor({ account_number: '48201503', connection_type: 'hotspot' }, PLATFORM_PAYBILL).unavailable_reason).toBe('hotspot');
    expect(payByMpesaFor({ account_number: '48201503', connection_type: 'pppoe', pppoe_username: 'a', payment_paybill: null }, PLATFORM_PAYBILL).unavailable_reason).toBe('no_paybill');
    expect(payByMpesaFor({ connection_type: 'pppoe', pppoe_username: 'a' }, PLATFORM_PAYBILL).unavailable_reason).toBe('no_account_number');
    expect(payByMpesaFor({ account_number: '48201503', connection_type: 'pppoe' }, PLATFORM_PAYBILL).unavailable_reason).toBe('no_pppoe_login');
  });
});

describe('payByMpesaMessage', () => {
  const t = (text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m));
  const kes = (n: number) => `KES ${n.toLocaleString('en-US')}`;

  it('reads like the message resellers send', () => {
    expect(payByMpesaMessage(
      { paybill: '4159825', account_number: '48201503', amount: 1500, unavailable_reason: null }, t, kes,
    )).toBe('Pay via M-Pesa: Paybill 4159825, Account 48201503. Amount KES 1,500');
  });

  it('leaves the amount out when there is no plan price', () => {
    expect(payByMpesaMessage(
      { paybill: '4159825', account_number: '48201503', amount: null, unavailable_reason: null }, t, kes,
    )).toBe('Pay via M-Pesa: Paybill 4159825, Account 48201503.');
  });
});

describe('whatsappShareUrl', () => {
  it('opens a chat with the customer in international format', () => {
    expect(whatsappShareUrl('0712345678', 'hi there')).toBe('https://wa.me/254712345678?text=hi%20there');
    expect(whatsappShareUrl('+254 712 345 678', 'x')).toBe('https://wa.me/254712345678?text=x');
    expect(whatsappShareUrl('712345678', 'x')).toBe('https://wa.me/254712345678?text=x');
  });

  it('lets the reseller pick the chat when the phone is not a number', () => {
    expect(whatsappShareUrl('AA:BB:CC:11:22:33', 'x')).toBe('https://wa.me/?text=x');
    expect(whatsappShareUrl(null, 'x')).toBe('https://wa.me/?text=x');
  });
});
