'use client';

import type { AdminPlatformEarnings } from '../lib/types';
import type { TFunction } from '../lib/i18n';
import LabelWithInfo from '../components/InfoTip';
import {
  PERIOD_NOUN, STREAM_COLORS, TERMS, earningsRows, formatChange, formatTakeRate,
} from './platformEarnings';

/**
 * What Bitwave itself earned in the dashboard's period, by income stream,
 * next to the transaction volume it was earned on. Presentational: the
 * dashboard fetches and passes `t` so this renders in tests without context.
 */
export default function BitwaveEarningsCard({
  data,
  loading,
  failed,
  money,
  t,
}: {
  data: AdminPlatformEarnings | null;
  loading: boolean;
  failed: boolean;
  money: (kes: number) => string;
  t: TFunction;
}) {
  return (
    <div className="card p-4 sm:p-5" data-testid="bitwave-earnings-card">
      <div className="mb-3">
        <LabelWithInfo
          label={t(TERMS.earnings)}
          info={t(TERMS.earningsTooltip)}
          className="text-sm font-semibold text-foreground"
        />
        <p className="text-[11px] text-foreground-muted mt-0.5">
          {data
            ? t("What Bitwave itself made {period}, by income stream", { period: t(PERIOD_NOUN[data.period]) })
            : t('What Bitwave itself made, by income stream')}
        </p>
      </div>

      {loading ? (
        <div className="h-[220px] rounded-xl bg-background-tertiary/60 animate-pulse" />
      ) : failed || !data ? (
        <div className="flex items-center justify-center h-[120px] text-foreground-muted text-xs">
          {t('Earnings unavailable')}
        </div>
      ) : (
        <Body data={data} money={money} t={t} />
      )}
    </div>
  );
}

function Body({
  data,
  money,
  t,
}: {
  data: AdminPlatformEarnings;
  money: (kes: number) => string;
  t: TFunction;
}) {
  const rows = earningsRows(data);
  const { earnings, invoiced, transaction_volume: volume, not_counted: notCounted } = data;
  const change = earnings.change_percent;

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-foreground tabular-nums">{money(earnings.total)}</span>
            <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {formatChange(change)}
            </span>
          </div>
          <p className="text-[11px] text-foreground-muted">
            {t('Collected')} · {t(data.comparison_label)}
          </p>
        </div>
        <div className="sm:text-right">
          <LabelWithInfo
            label={t(TERMS.takeRate)}
            info={t(TERMS.takeRateTooltip)}
            className="text-[10px] text-foreground-muted uppercase tracking-wider sm:justify-end"
          />
          <p className="text-lg font-semibold text-foreground tabular-nums">{formatTakeRate(data.take_rate_percent)}</p>
          <p className="text-[11px] text-foreground-muted">
            {t('of {amount} transaction volume', { amount: money(volume.total) })}
          </p>
        </div>
      </div>

      {earnings.total > 0 && (
        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-background-tertiary mt-4" aria-hidden="true">
          {rows.filter((r) => r.total > 0).map((r) => (
            <div key={r.key} style={{ width: `${r.share}%`, backgroundColor: STREAM_COLORS[r.key] }} />
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: STREAM_COLORS[r.key] }} />
            <span className="text-foreground-muted flex-1 min-w-0 truncate">{t(r.label)}</span>
            <span className="text-foreground font-medium tabular-nums">{money(r.total)}</span>
            <span className="text-foreground-muted tabular-nums w-12 text-right">{r.share.toFixed(0)}%</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Figure label={t('Invoiced')} value={money(invoiced.total)}
          note={t('{count} invoices', { count: invoiced.invoices })} />
        <Figure label={t('Paid so far')} value={money(invoiced.paid_so_far)} />
        <Figure label={t('Outstanding')} value={money(invoiced.outstanding)} />
        <Figure label={t('Waived')} value={money(invoiced.waived)}
          note={t('{count} invoices', { count: invoiced.waived_invoices })} />
      </div>
      <p className="text-[10px] text-foreground-muted mt-2 leading-snug">
        {t('Collected is the money received in the period. Invoiced is what the subscription invoices issued in the period billed; waived invoices are left out.')}
      </p>
      {(notCounted.shop_sales > 0 || notCounted.reseller_transaction_charges > 0) && (
        <p className="text-[10px] text-foreground-muted mt-1 leading-snug">
          {t('Not counted as earnings: shop sales {shop}, transaction charges recovered {charges}.', {
            shop: money(notCounted.shop_sales),
            charges: money(notCounted.reseller_transaction_charges),
          })}
        </p>
      )}
    </>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-[10px] text-foreground-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
      {note && <p className="text-[10px] text-foreground-muted">{note}</p>}
    </div>
  );
}
