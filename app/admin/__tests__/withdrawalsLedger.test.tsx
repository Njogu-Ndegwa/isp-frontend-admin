import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WithdrawalsLedger, { formatLedgerDate } from '../WithdrawalsLedger';
import {
  BUCKET_LABELS, LEDGER, METHOD_LABELS, availableFor, formatLedgerKES, parseAmount, todayEat,
  validateWithdrawal, type WithdrawalForm,
} from '../platformEarnings';
import { FR } from '../../lib/locales/fr';
import { translate, type TFunction } from '../../lib/i18n';
import type { PlatformWithdrawalLedger } from '../../lib/types';

const en: TFunction = (text, vars) => translate('en', text, vars);
const fr: TFunction = (text, vars) => translate('fr', text, vars);
const noop = async () => {};

function ledger(over: Partial<PlatformWithdrawalLedger> = {}): PlatformWithdrawalLedger {
  return {
    start_date: '2026-10-01',
    currency: 'KES',
    buckets: {
      platform: { collected: 69_829.02, withdrawn: 20_000, available: 49_829.02 },
      reseller_business: { collected: 16_642, withdrawn: 0, available: 16_642 },
    },
    withdrawn_from_all: 0,
    total: { collected: 86_471.02, withdrawn: 20_000, available: 66_471.02 },
    records_only: true,
    withdrawals: [
      {
        id: 2, amount: 20_000, currency: 'KES', date: '2026-10-20', method: 'mpesa',
        reference: 'QAB12CD34', note: 'October rent', bucket: 'platform',
        created_by: 1, created_by_name: 'Bitwave', created_at: '2026-10-20T10:00:00',
        voided: false, voided_at: null, voided_by: null, voided_by_name: null, void_reason: null,
      },
      {
        id: 1, amount: 900, currency: 'KES', date: '2026-10-05', method: 'cash',
        reference: null, note: null, bucket: 'all',
        created_by: 1, created_by_name: 'Bitwave', created_at: '2026-10-05T10:00:00',
        voided: true, voided_at: '2026-10-06T10:00:00', voided_by: 1, voided_by_name: 'Bitwave',
        void_reason: 'Typed the wrong amount',
      },
    ],
    ...over,
  };
}

function form(over: Partial<WithdrawalForm> = {}): WithdrawalForm {
  return { amount: '1000', date: '2026-10-29', method: 'mpesa', bucket: 'platform', reference: '', note: '', ...over };
}

const TODAY = '2026-10-29';
const check = (f: WithdrawalForm, l = ledger()) => validateWithdrawal(f, l, { today: TODAY, money: formatLedgerKES });

describe('validateWithdrawal', () => {
  it('accepts a normal withdrawal, up to exactly what is available', () => {
    expect(check(form())).toBeNull();
    expect(check(form({ amount: '49829.02' }))).toBeNull();
    expect(check(form({ amount: '49,829.02' }))).toBeNull();
  });

  it('refuses more than the bucket has', () => {
    expect(check(form({ amount: '49829.03' }))).toEqual({
      message: 'That is more than the {amount} available to withdraw',
      vars: { amount: 'KES 49,829.02' },
    });
    expect(check(form({ bucket: 'reseller_business', amount: '16643' }))?.message).toMatch(/more than/);
  });

  it('checks "all income" against the total', () => {
    expect(check(form({ bucket: 'all', amount: '66471.02' }))).toBeNull();
    expect(check(form({ bucket: 'all', amount: '66472' }))?.message).toMatch(/more than/);
  });

  it('refuses empty, zero, negative and non-numeric amounts', () => {
    for (const amount of ['', '0', '-5', 'abc']) {
      expect(check(form({ amount }))?.message).toBe('Enter an amount more than zero');
    }
  });

  it('only takes dates from 1 Oct 2026 up to today', () => {
    expect(check(form({ date: '2026-09-30' }))?.message).toBe('Tracking starts on {date}; pick a later date');
    expect(check(form({ date: '2026-10-01' }))).toBeNull();
    expect(check(form({ date: '2026-10-30' }))?.message).toBe('The date cannot be in the future');
    expect(check(form({ date: '' }))?.message).toBe('Choose the date');
  });

  it('limits reference and note length', () => {
    expect(check(form({ reference: 'x'.repeat(101) }))?.message).toMatch(/Reference is too long/);
    expect(check(form({ note: 'x'.repeat(501) }))?.message).toMatch(/Note is too long/);
  });
});

describe('ledger helpers', () => {
  it('available for "all" is the total', () => {
    expect(availableFor(ledger(), 'all')).toBe(66_471.02);
    expect(availableFor(ledger(), 'reseller_business')).toBe(16_642);
  });

  it('formats KES with cents only when there are any', () => {
    expect(formatLedgerKES(49_829.02)).toBe('KES 49,829.02');
    expect(formatLedgerKES(16_642)).toBe('KES 16,642');
  });

  it('parses amounts typed with commas', () => {
    expect(parseAmount('1,234.567')).toBe(1234.57);
  });

  it('dates without a timezone shift', () => {
    expect(formatLedgerDate('2026-10-01')).toBe('1 Oct 2026');
  });

  it('today is Kenyan time', () => {
    expect(todayEat(new Date('2026-10-29T22:30:00Z'))).toBe('2026-10-30');
    expect(todayEat(new Date('2026-10-29T20:59:00Z'))).toBe('2026-10-29');
  });
});

describe('WithdrawalsLedger', () => {
  const render = (
    data: PlatformWithdrawalLedger | null,
    opts: { t?: TFunction; loading?: boolean; failed?: boolean; open?: boolean } = {},
  ) => renderToStaticMarkup(
    <WithdrawalsLedger
      data={data}
      loading={opts.loading ?? false}
      failed={opts.failed ?? false}
      money={formatLedgerKES}
      t={opts.t ?? en}
      onCreate={noop}
      onVoid={noop}
      initialFormOpen={opts.open}
      today={TODAY}
    />,
  );

  it('shows earned, withdrawn and available per bucket and in total since 1 Oct', () => {
    const html = render(ledger());
    expect(html).toContain('Since 1 Oct 2026');
    const balances = html.slice(html.indexOf('data-testid="ledger-balances"'));
    for (const s of ['Earned', 'Withdrawn', 'Available to withdraw', 'Platform earnings', 'My reseller business', 'Total']) {
      expect(balances).toContain(s);
    }
    expect(balances).toContain('KES 69,829.02');
    expect(balances).toContain('KES 49,829.02');
    expect(balances).toContain('KES 16,642');
    expect(balances).toContain('KES 66,471.02');
  });

  it('says it only records and never sends money', () => {
    expect(render(ledger())).toContain(LEDGER.recordsOnly);
    expect(LEDGER.recordsOnly).toMatch(/does not send money or call M-Pesa/);
  });

  it('has a Record withdrawal button that opens the form', () => {
    expect(render(ledger())).toContain('Record withdrawal');
    expect(render(ledger())).not.toContain('data-testid="withdrawal-form"');
    const html = render(ledger(), { open: true });
    expect(html).toContain('data-testid="withdrawal-form"');
    for (const id of ['wd-amount', 'wd-bucket', 'wd-date', 'wd-method', 'wd-reference', 'wd-note']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('min="2026-10-01"');
    expect(html).toContain('max="2026-10-29"');
    expect(html).toContain('Available: KES 49,829.02');
    expect(html).toContain('inputMode="decimal"');
    for (const label of [...Object.values(METHOD_LABELS), ...Object.values(BUCKET_LABELS)]) expect(html).toContain(label);
  });

  it('lists past withdrawals, voided ones struck through with the reason', () => {
    const html = render(ledger());
    const list = html.slice(html.indexOf('data-testid="withdrawal-list"'));
    expect(list).toContain('KES 20,000');
    expect(list).toContain('20 Oct 2026 · M-Pesa · Platform earnings');
    expect(list).toContain('QAB12CD34 — October rent');
    expect(list).toContain('line-through');
    expect(list).toContain('Voided: Typed the wrong amount');
    // Only the live row can be voided.
    expect(list.match(/>Void</g)).toHaveLength(1);
  });

  it('says when nothing has been recorded', () => {
    expect(render(ledger({ withdrawals: [] }))).toContain('No withdrawals recorded yet');
  });

  it('notes money withdrawn from all income', () => {
    expect(render(ledger({ withdrawn_from_all: 5_000 }))).toContain('Withdrawn from all: KES 5,000');
  });

  it('has loading and failure states', () => {
    expect(render(null, { loading: true })).toContain('animate-pulse');
    expect(render(null, { failed: true })).toContain('Withdrawals unavailable');
  });

  it('renders in French', () => {
    const html = render(ledger(), { t: fr, open: true });
    expect(html).toContain('Retraits');
    expect(html).toContain('Disponible au retrait');
    expect(html).toContain('Enregistrer le retrait');
    expect(html).toContain('Aucun argent n&#x27;est envoyé');
  });

  it('has a French translation for every ledger string', () => {
    const keys = [
      ...Object.values(LEDGER), ...Object.values(BUCKET_LABELS), ...Object.values(METHOD_LABELS),
      'Enter an amount more than zero', 'That is more than the {amount} available to withdraw', 'Choose the date',
      'Tracking starts on {date}; pick a later date', 'The date cannot be in the future',
      'Reference is too long (100 characters max)', 'Note is too long (500 characters max)',
      'Amount (KES)', 'Available: {amount}', 'From', 'Date', 'Method', 'Reference (optional)', 'Note (optional)',
      'e.g. M-Pesa code', 'Save withdrawal', 'Saving…', 'Cancel', 'Void', 'Voided', 'Voided: {reason}',
      'Void withdrawal', 'Reason for voiding', 'Why void it? e.g. typed the wrong amount', 'Say why you are voiding it',
      'Could not save the withdrawal', 'Could not void the withdrawal', 'Withdrawal recorded', 'Withdrawal voided', 'Total',
    ];
    expect(keys.filter((k) => !(k in FR))).toEqual([]);
  });
});
