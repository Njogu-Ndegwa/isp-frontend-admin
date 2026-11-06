import { describe, expect, it } from 'vitest';
import {
  daysLeft,
  displayPhone,
  emptySaleTerms,
  normalizeKenyanMobile,
  promptInFlight,
  saleSplit,
  splitAmount,
  validateSaleTerms,
} from './adSale';

describe('the 80/20 split', () => {
  it('floors Bitwave’s 20% and gives the reseller the rest, like the backend', () => {
    expect(splitAmount(500)).toEqual({ amount: 500, fee: 100, share: 400 });
    expect(splitAmount(1005)).toEqual({ amount: 1005, fee: 201, share: 804 });
    expect(splitAmount(999)).toEqual({ amount: 999, fee: 199, share: 800 });
    expect(splitAmount(4)).toEqual({ amount: 4, fee: 0, share: 4 });
  });

  it('always adds up to what the shop pays', () => {
    for (let weeks = 1; weeks <= 12; weeks++) {
      for (const price of [1, 2, 3, 4, 5, 199, 200, 201, 333, 999, 12_500, 12_501, 20_833]) {
        const s = saleSplit(weeks, price);
        expect(s.fee + s.share).toBe(weeks * price);
      }
    }
  });

  it('takes no fee on KES 1 to 4, with no minimum fee', () => {
    expect(saleSplit(1, 1)).toEqual({ amount: 1, fee: 0, share: 1 });
    expect(saleSplit(1, 4)).toEqual({ amount: 4, fee: 0, share: 4 });
    expect(saleSplit(1, 5)).toEqual({ amount: 5, fee: 1, share: 4 });
  });
});

describe('sale terms', () => {
  const ok = { business_name: 'Mama Njeri', business_phone: '0722 111 222', weeks: '2', price_per_week: '250' };

  it('accepts valid terms', () => {
    expect(validateSaleTerms(ok)).toEqual({});
  });

  it('lets the reseller charge any whole amount from KES 1', () => {
    for (const price of ['1', '4', '5', '199', '12501']) {
      expect(validateSaleTerms({ ...ok, weeks: '1', price_per_week: price })).toEqual({});
    }
  });

  it('starts with no price, so the reseller has to choose one', () => {
    expect(emptySaleTerms().price_per_week).toBe('');
    expect(validateSaleTerms({ ...ok, price_per_week: '' }).price_per_week).toBeTruthy();
  });

  it('refuses a price M-Pesa can’t take', () => {
    for (const price of ['0', '-5', '250.5', 'abc']) {
      expect(validateSaleTerms({ ...ok, price_per_week: price }).price_per_week).toBe('Enter a price in whole shillings, KES 1 or more.');
    }
  });

  it('checks the total against one M-Pesa payment, not the weekly price', () => {
    expect(validateSaleTerms({ ...ok, weeks: '1', price_per_week: '250000' })).toEqual({});
    expect(validateSaleTerms({ ...ok, weeks: '12', price_per_week: '20833' })).toEqual({});
    const over = 'M-Pesa takes at most KES 250,000 in one payment. Lower the price or the weeks.';
    expect(validateSaleTerms({ ...ok, weeks: '1', price_per_week: '250001' }).price_per_week).toBe(over);
    expect(validateSaleTerms({ ...ok, weeks: '12', price_per_week: '20834' }).price_per_week).toBe(over);
  });

  it('enforces 1-12 whole weeks and an M-Pesa number', () => {
    expect(validateSaleTerms({ ...ok, weeks: '0' }).weeks).toBeTruthy();
    expect(validateSaleTerms({ ...ok, weeks: '13' }).weeks).toBeTruthy();
    expect(validateSaleTerms({ ...ok, business_phone: '+237677123456' }).business_phone).toBeTruthy();
    expect(validateSaleTerms({ ...ok, business_name: ' ' }).business_name).toBeTruthy();
    expect(validateSaleTerms({ ...ok, business_name: '' }, false).business_name).toBeUndefined();
  });
});

describe('phones', () => {
  it('normalises Kenyan mobiles the way M-Pesa needs them', () => {
    expect(normalizeKenyanMobile('0722 111 222')).toBe('254722111222');
    expect(normalizeKenyanMobile('+254 110 123 456')).toBe('254110123456');
    expect(normalizeKenyanMobile('+2540722111222')).toBe('254722111222');
    expect(normalizeKenyanMobile('722111222')).toBe('254722111222');
    expect(normalizeKenyanMobile('020 222 3333')).toBeNull();
    expect(displayPhone('254722111222')).toBe('0722 111 222');
  });
});

describe('prompt status', () => {
  it('polls only while the prompt is on the phone', () => {
    expect(promptInFlight({ prompt: { status: 'waiting_for_pin' } as never })).toBe(true);
    expect(promptInFlight({ prompt: { status: 'sending' } as never })).toBe(true);
    expect(promptInFlight({ prompt: { status: 'cancelled' } as never })).toBe(false);
    expect(promptInFlight({ prompt: null })).toBe(false);
  });

  it('counts whole days left', () => {
    const now = Date.parse('2026-11-04T10:00:00Z');
    expect(daysLeft('2026-11-06T09:00:00', now)).toBe(2);
    expect(daysLeft('2026-11-01T09:00:00', now)).toBe(0);
    expect(daysLeft(null, now)).toBeNull();
  });
});
