import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BitwaveEarningsCard from '../BitwaveEarningsCard';
import StatCard from '../../components/StatCard';
import {
  PERIOD_NOUN, STREAM_LABELS, TERMS, earningsRows, formatTakeRate,
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
        { key: 'sms_credits', label: 'SMS credit sales', group: 'sms', total: 4_000, previous_total: 3_000 },
        { key: 'subscription_hotspot', label: 'Hotspot commission', group: 'subscriptions', total: 24_000, previous_total: 20_000 },
        { key: 'subscription_per_user', label: 'PPPoE / static per-user fees', group: 'subscriptions', total: 8_000, previous_total: 6_000 },
        { key: 'subscription_minimum', label: 'Minimum / flat subscription fee', group: 'subscriptions', total: 4_000, previous_total: 3_000 },
      ],
    },
    invoiced: {
      total: 45_000, subscription_hotspot: 27_000, subscription_per_user: 9_000, subscription_minimum: 9_000,
      invoices: 30, paid_so_far: 38_000, outstanding: 7_000, waived: 1_500, waived_invoices: 2,
    },
    take_rate_percent: 4,
    not_counted: { shop_sales: 12_000, reseller_transaction_charges: 300 },
    excluded_own_accounts: [],
    ...over,
  };
}

describe('earningsRows', () => {
  it('lists streams in a fixed order with their share of the total', () => {
    const rows = earningsRows(sample());
    expect(rows.map((r) => r.key)).toEqual([
      'subscription_hotspot', 'subscription_per_user', 'subscription_minimum', 'sms_credits',
    ]);
    expect(rows.map((r) => r.share)).toEqual([60, 20, 10, 10]);
  });

  it('shares are zero, not NaN, when nothing was earned', () => {
    const data = sample();
    data.earnings.total = 0;
    data.earnings.streams = data.earnings.streams.map((s) => ({ ...s, total: 0 }));
    expect(earningsRows(data).every((r) => r.share === 0)).toBe(true);
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
    const labels = [...Object.values(TERMS), ...Object.values(STREAM_LABELS), ...Object.values(SOURCE_LABELS)];
    for (const label of labels) expect(label).not.toMatch(/revenue|system sales/i);
  });

  it('has a French translation for every term, stream and period', () => {
    const keys = [
      ...Object.values(TERMS), ...Object.values(STREAM_LABELS), ...Object.values(PERIOD_NOUN),
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

  it('shows the total, take rate, every stream and invoiced vs collected', () => {
    const html = render(sample());
    expect(html).toContain('Bitwave earnings');
    expect(html).toContain('KES 40,000');
    expect(html).toContain('4.00%');
    expect(html).toContain('of KES 1,000,000 transaction volume');
    for (const label of ['Hotspot commission', 'PPPoE / static per-user fees', 'Minimum / flat subscription fee', 'SMS credit sales']) {
      expect(html).toContain(label);
    }
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

  it('shows the unattributed line only when the API sends it', () => {
    expect(render(sample())).not.toContain('without an invoice');
    const data = sample();
    data.earnings.streams.push({
      key: 'subscription_unattributed', label: 'Subscription payments without an invoice',
      group: 'subscriptions', total: 500, previous_total: 0,
    });
    expect(render(data)).toContain('Subscription payments without an invoice');
  });

  it('renders in French', () => {
    const html = render(sample(), fr);
    expect(html).toContain('Gains de Bitwave');
    expect(html).toContain('Commission hotspot');
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
