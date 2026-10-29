import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BitwaveEarningsCard from '../BitwaveEarningsCard';
import StatCard from '../../components/StatCard';
import {
  PERIOD_NOUN, STREAM_LABELS, STREAM_TOOLTIPS, TERMS, earningsRows, formatTakeRate, incomeSummary,
} from '../platformEarnings';
import { SOURCE_LABELS } from '../earnings/earningsChartData';
import { FR } from '../../lib/locales/fr';
import { translate, type TFunction } from '../../lib/i18n';
import type { AdminPlatformEarnings } from '../../lib/types';

const en: TFunction = (text, vars) => translate('en', text, vars);
const fr: TFunction = (text, vars) => translate('fr', text, vars);
const kes = (n: number) => `KES ${Math.round(n).toLocaleString('en-US')}`;

function sample(over: Partial<AdminPlatformEarnings> = {}): AdminPlatformEarnings {
  return {
    period: 'month',
    start_date: '2026-10-01',
    end_date: '2026-10-29',
    days: 29,
    comparison_label: 'vs same point last month',
    currency: 'KES',
    transaction_volume: {
      total: 1_000_000, previous_total: 800_000, change_percent: 25, payments: 4_200,
      mpesa_platform_collected: 600_000, mpesa_direct_settled: 350_000, recorded_manually: 50_000,
    },
    earnings: {
      basis: 'collected',
      total: 40_000,
      previous_total: 32_000,
      change_percent: 25,
      subscriptions: 36_000,
      sms_credits: 4_000,
      sms_orders: 12,
      // Deliberately out of display order: the card must not depend on it.
      streams: [
        { key: 'sms_credits', label: 'SMS', group: 'sms', total: 4_000, previous_total: 3_000 },
        { key: 'subscription_hotspot', label: 'Hotspot', group: 'subscriptions', total: 28_000, previous_total: 23_000 },
        { key: 'subscription_per_user', label: 'PPPoE / Static', group: 'subscriptions', total: 8_000, previous_total: 6_000 },
      ],
    },
    invoiced: {
      total: 45_000, subscription_hotspot: 34_000, subscription_per_user: 11_000,
      invoices: 30, paid_so_far: 38_000, outstanding: 7_000, waived: 1_500, waived_invoices: 2,
    },
    take_rate_percent: 4,
    not_counted: { shop_sales: 12_000, reseller_transaction_charges: 300 },
    excluded_own_accounts: [{ id: 10, organization_name: 'My ISP', email: 'me@example.com' }],
    reseller_business: {
      total: 16_000, previous_total: 20_000, change_percent: -20, payments: 1_300,
      accounts: [{ id: 10, organization_name: 'My ISP', email: 'me@example.com' }],
    },
    total_income: { total: 56_000, previous_total: 52_000, change_percent: 7.7 },
    ...over,
  };
}

describe('earningsRows', () => {
  it('is exactly Hotspot, PPPoE / Static and SMS, in that order, with shares', () => {
    const rows = earningsRows(sample());
    expect(rows.map((r) => r.key)).toEqual(['subscription_hotspot', 'subscription_per_user', 'sms_credits']);
    expect(rows.map((r) => r.label)).toEqual(['Hotspot', 'PPPoE / Static', 'SMS']);
    expect(rows.map((r) => r.share)).toEqual([70, 20, 10]);
  });

  it('shows a group at zero when the API leaves it out', () => {
    const data = sample();
    data.earnings.streams = data.earnings.streams.filter((s) => s.key !== 'sms_credits');
    expect(earningsRows(data).find((r) => r.key === 'sms_credits')?.total).toBe(0);
  });

  it('shares are zero, not NaN, when nothing was earned', () => {
    const data = sample();
    data.earnings.total = 0;
    data.earnings.streams = data.earnings.streams.map((s) => ({ ...s, total: 0 }));
    expect(earningsRows(data).every((r) => r.share === 0)).toBe(true);
  });
});

describe('incomeSummary', () => {
  it('is platform earnings + my reseller business = total income', () => {
    expect(incomeSummary(sample())).toMatchObject({ platform: 40_000, business: 16_000, total: 56_000 });
  });

  it('works against a backend that predates the regrouping', () => {
    const data = sample({ reseller_business: undefined, total_income: undefined });
    expect(incomeSummary(data)).toMatchObject({ platform: 40_000, business: 0, total: 40_000 });
  });
});

describe('formatTakeRate', () => {
  it('shows small rates with two decimals and no volume as a dash', () => {
    expect(formatTakeRate(3.456)).toBe('3.46%');
    expect(formatTakeRate(12.34)).toBe('12.3%');
    expect(formatTakeRate(null)).toBe('—');
  });
});

describe('money vocabulary', () => {
  it('calls GMV "Transaction volume" and says it is not our income', () => {
    expect(TERMS.volume).toBe('Transaction volume');
    expect(TERMS.volumeTooltip).toBe(
      "Total customer payments processed through Bitwave for all resellers — not Bitwave's income",
    );
    expect(TERMS.earnings).toBe('Bitwave earnings');
  });

  it('never calls Bitwave money "revenue" or "sales"', () => {
    const labels = [...Object.values(TERMS), ...Object.values(STREAM_LABELS), ...Object.values(STREAM_TOOLTIPS), ...Object.values(SOURCE_LABELS)];
    for (const label of labels) expect(label).not.toMatch(/revenue|system sales/i);
  });

  it('has a French translation for every term, stream and period', () => {
    const keys = [
      ...Object.values(TERMS), ...Object.values(STREAM_LABELS), ...Object.values(STREAM_TOOLTIPS), ...Object.values(PERIOD_NOUN),
      ...Object.values(SOURCE_LABELS),
      'vs same point last week', 'vs same point last month', 'vs same point last quarter', 'vs same point last year',
    ];
    const missing = keys.filter((k) => !(k in FR));
    expect(missing).toEqual([]);
  });
});

describe('BitwaveEarningsCard', () => {
  const render = (data: AdminPlatformEarnings | null, t: TFunction = en, state = { loading: false, failed: false }) =>
    renderToStaticMarkup(<BitwaveEarningsCard data={data} money={kes} t={t} {...state} />);

  it('shows the total, take rate, the three groups and invoiced vs collected', () => {
    const html = render(sample());
    expect(html).toContain('Bitwave earnings');
    expect(html).toContain('KES 40,000');
    expect(html).toContain('4.00%');
    expect(html).toContain('of KES 1,000,000 transaction volume');
    const groups = html.slice(html.indexOf('data-testid="earnings-groups"'), html.indexOf('data-testid="income-summary"'));
    expect(groups.match(/<li/g)).toHaveLength(3);
    for (const label of ['Hotspot', 'PPPoE / Static', 'SMS']) expect(groups).toContain(label);
    expect(groups).toContain('KES 28,000');
    expect(html).not.toMatch(/minimum \/ flat|without an invoice|Other subscription/i);
    expect(html).toContain('Invoiced');
    expect(html).toContain('KES 45,000');
    expect(html).toContain('Outstanding');
    expect(html).toContain('KES 7,000');
    expect(html).toContain('2 invoices');
    expect(html).toContain('this month');
    expect(html).not.toMatch(/revenue/i);
  });

  it('reports shop sales and recovered charges as not counted', () => {
    expect(render(sample())).toContain('Not counted as earnings: shop sales KES 12,000');
    const none = sample({ not_counted: { shop_sales: 0, reseller_transaction_charges: 0 } });
    expect(render(none)).not.toContain('Not counted');
  });

  it('explains each group in plain words behind its (i)', () => {
    const html = render(sample());
    expect(html).toContain('aria-label="The hotspot % charge on resellers&#x27; hotspot sales');
    expect(html).toContain('aria-label="The monthly fee for each active PPPoE or static-IP customer');
    expect(html).toContain('aria-label="SMS credits resellers bought."');
  });

  it('adds my reseller business to platform earnings for total income', () => {
    const html = render(sample());
    const summary = html.slice(html.indexOf('data-testid="income-summary"'));
    const order = ['Platform earnings', 'KES 40,000', 'My reseller business', 'KES 16,000', 'Total income', 'KES 56,000']
      .map((s) => summary.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(summary).toContain('Customer payments taken by your own reseller accounts (My ISP)');
  });

  it('says where to pick your accounts when none are marked', () => {
    const html = render(sample({
      reseller_business: { total: 0, previous_total: 0, change_percent: 0, payments: 0, accounts: [] },
      excluded_own_accounts: [],
      total_income: { total: 40_000, previous_total: 32_000, change_percent: 25 },
    }));
    expect(html).toContain('No reseller accounts are marked as yours');
  });

  it('renders the ledger slot at the bottom', () => {
    const html = renderToStaticMarkup(
      <BitwaveEarningsCard data={sample()} money={kes} t={en} loading={false} failed={false} ledger={<p>LEDGER</p>} />,
    );
    expect(html.indexOf('LEDGER')).toBeGreaterThan(html.indexOf('Total income'));
  });

  it('renders in French', () => {
    const html = render(sample(), fr);
    expect(html).toContain('Gains de Bitwave');
    expect(html).toContain('PPPoE / IP fixe');
    expect(html).toContain('Gains de la plateforme');
    expect(html).toContain('Mon activité de revendeur');
    expect(html).toContain('Revenu total');
    expect(html).toContain('Taux de prélèvement');
    expect(html).toContain('Facturé');
  });

  it('has loading and failure states', () => {
    expect(render(null, en, { loading: true, failed: false })).toContain('animate-pulse');
    expect(render(null, en, { loading: false, failed: true })).toContain('Earnings unavailable');
  });
});

describe('StatCard tooltip', () => {
  it('puts the explanation behind an (i) next to the title', () => {
    const html = renderToStaticMarkup(
      <StatCard title={TERMS.volume} tooltip={TERMS.volumeTooltip} value="KES 1" icon={null} />,
    );
    expect(html).toContain('Transaction volume');
    expect(html).toContain('aria-label="Total customer payments processed through Bitwave');
  });

  it('renders a plain title without one', () => {
    const html = renderToStaticMarkup(<StatCard title="MRR" value="KES 1" icon={null} />);
    expect(html).not.toContain('aria-label');
  });
});
