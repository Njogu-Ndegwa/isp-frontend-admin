import { describe, expect, it } from 'vitest';
import { MpesaTransaction } from '../../../lib/types';
import {
  buildTimeline, describePayment, formatCreditedTime, phoneKey, summarizePayments, walletChange,
} from '../paymentHistory';

const tx = (over: Partial<MpesaTransaction>): MpesaTransaction => ({
  transaction_id: 1,
  checkout_request_id: null,
  phone_number: '254700000000',
  amount: 0,
  reference: null,
  lipay_tx_no: null,
  status: 'completed',
  payment_method: 'mobile_money',
  payment_reference: null,
  mpesa_receipt_number: null,
  transaction_date: null,
  created_at: '2026-10-01T10:00:00',
  customer: null as unknown as MpesaTransaction['customer'],
  router: null as unknown as MpesaTransaction['router'],
  plan: null as unknown as MpesaTransaction['plan'],
  manual_provision_supported: false,
  manual_provision_reason: null,
  ...over,
});

describe('summarizePayments', () => {
  it('totals only completed, revenue-counting payments', () => {
    const summary = summarizePayments([
      tx({ amount: 100, created_at: '2026-10-01T10:00:00' }),
      tx({ amount: 50, payment_method: 'cash', created_at: '2026-10-05T09:00:00' }),
      tx({ amount: 200, status: 'failed', created_at: '2026-10-09T09:00:00' }),
      tx({ amount: 30, counts_as_revenue: false, created_at: '2026-10-10T09:00:00' }),
    ]);
    expect(summary).toEqual({ totalPaid: 150, paidCount: 2, lastPaidAt: '2026-10-05T09:00:00' });
  });

  it('handles a customer with no payments', () => {
    expect(summarizePayments([])).toEqual({ totalPaid: 0, paidCount: 0, lastPaidAt: null });
  });
});

describe('describePayment', () => {
  it('labels by source before payment method', () => {
    expect(describePayment(tx({ payment_method: 'cash', source: 'voucher' })).label).toBe('Voucher');
    expect(describePayment(tx({ source: 'c2b_paybill' })).label).toBe('M-Pesa Paybill');
    expect(describePayment(tx({ payment_method: 'cash', source: null })).label).toBe('Cash');
  });

  it('flags underpaid paybill money and keeps it out of the total', () => {
    const d = describePayment(tx({ source: 'c2b_paybill', status: 'unmatched' as MpesaTransaction['status'] }));
    expect(d.tags).toEqual([{ kind: 'underpaid' }]);
    expect(d.counted).toBe(false);
  });

  it('offers provisioning only for pending or undelivered payments', () => {
    const delivered = tx({ manual_provision_supported: true, delivery: { attempt_id: 1, delivery_status: 'online' } });
    expect(describePayment(delivered).canProvision).toBe(false);
    const stuck = tx({
      manual_provision_supported: true,
      delivery: { attempt_id: 2, delivery_status: 'needs_attention', last_error: 'router offline' },
    });
    expect(describePayment(stuck).canProvision).toBe(true);
    expect(describePayment(stuck).tags).toEqual([{ kind: 'not_delivered', error: 'router offline' }]);
    expect(describePayment(tx({ manual_provision_supported: true, status: 'pending' })).canProvision).toBe(true);
  });
});

describe('buildTimeline', () => {
  it('merges payments and outage credits newest first', () => {
    const timeline = buildTimeline(
      [tx({ transaction_id: 1, created_at: '2026-10-01T10:00:00' }), tx({ transaction_id: 2, created_at: '2026-10-05T10:00:00' })],
      [{
        id: 9, credited_at: '2026-10-03T10:00:00', seconds_credited: 7200, expiry_before: null,
        expiry_after: null, reprovision_state: 'succeeded', reprovision_error: null, note: null,
      }],
    );
    expect(timeline.map((e) => (e.kind === 'payment' ? e.tx.transaction_id : `c${e.credit.id}`))).toEqual([2, 'c9', 1]);
  });
});

describe('formatCreditedTime / phoneKey', () => {
  it('formats credited seconds', () => {
    expect(formatCreditedTime(45 * 60)).toBe('45m');
    expect(formatCreditedTime(2 * 3600 + 30 * 60)).toBe('2h 30m');
    expect(formatCreditedTime(26 * 3600)).toBe('1d 2h');
  });

  it('matches phone numbers across saved prefixes', () => {
    expect(phoneKey('0712345678')).toBe(phoneKey('+254 712 345 678'));
    expect(phoneKey('123')).toBeNull();
  });
});

describe('walletChange', () => {
  it('reports the wallet move on paybill rows', () => {
    expect(walletChange(tx({ wallet_before_kes: 0, wallet_after_kes: 300 })))
      .toEqual({ before: 0, after: 300, estimated: false });
    expect(walletChange(tx({ wallet_before_kes: 300, wallet_after_kes: 0, wallet_estimated: true })))
      .toEqual({ before: 300, after: 0, estimated: true });
  });

  it('stays quiet when the wallet never moved or is unknown', () => {
    expect(walletChange(tx({ wallet_before_kes: 0, wallet_after_kes: 0 }))).toBeNull();
    expect(walletChange(tx({}))).toBeNull();
  });
});
