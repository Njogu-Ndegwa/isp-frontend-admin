'use client';

import { SubscriptionInvoice } from '../lib/types';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';

interface InvoiceChargeBreakdownProps {
  invoice: SubscriptionInvoice;
}


export default function InvoiceChargeBreakdown({ invoice }: InvoiceChargeBreakdownProps) {
  const t = useT();
  // Every amount on an invoice is in the invoice's currency (USD for
  // international resellers); the rates come from the pricing rule the
  // invoice was computed with, falling back to Kenya's for old invoices.
  const currency = invoice.currency || 'KES';
  const money = (value: number | null | undefined) => formatMoney(value, currency);
  const rule = invoice.pricing_rule;
  const ratePct = Math.round((rule?.hotspot_rate ?? 0.03) * 1000) / 10;
  const perPppoe = rule?.per_pppoe_user ?? 25;
  const minimum = rule?.kind === 'flat' ? 0 : (rule?.minimum ?? 500);
  const localRevenueNote =
    rule?.revenue_currency && rule.revenue_currency !== currency && rule.fx_rate
      ? t('{amount} at {rate} {from}/{to}', {
          amount: formatMoney(rule.hotspot_revenue_local ?? 0, rule.revenue_currency),
          rate: rule.fx_rate.toLocaleString('en-US'),
          from: rule.revenue_currency,
          to: currency,
        })
      : null;

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{t('Charge Breakdown')}</h3>

      <div className="space-y-3">
        {/* Hotspot charges */}
        {(invoice.hotspot_revenue != null && invoice.hotspot_revenue > 0) && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">{t('Hotspot Revenue')}</p>
              <p className="text-xs text-foreground-muted">
                {money(invoice.hotspot_revenue)} x {ratePct}%
              </p>
              {localRevenueNote && (
                <p className="text-[11px] text-foreground-muted/70">{localRevenueNote}</p>
              )}
            </div>
            <span className="font-medium text-foreground">
              {money(invoice.hotspot_charge ?? 0)}
            </span>
          </div>
        )}

        {/* PPPoE charges */}
        {(invoice.pppoe_user_count != null && invoice.pppoe_user_count > 0) && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">{t('PPPoE Users')}</p>
              <p className="text-xs text-foreground-muted">
                {t('{count} users x {price}', { count: invoice.pppoe_user_count, price: money(perPppoe) })}
              </p>
            </div>
            <span className="font-medium text-foreground">
              {money(invoice.pppoe_charge ?? 0)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-2">
          {/* Gross charge */}
          {invoice.gross_charge != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">{t('Gross Charge')}</span>
              <span className="text-foreground">{money(invoice.gross_charge)}</span>
            </div>
          )}

          {/* Minimum note */}
          {invoice.gross_charge != null && invoice.gross_charge < minimum && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">{t('Minimum charge applied')}</span>
              <span className="text-amber-500">{money(minimum)}</span>
            </div>
          )}

          {/* Final charge */}
          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
            <span className="text-foreground">{t('Total Due')}</span>
            <span className="text-amber-500 text-base">{money(invoice.final_charge)}</span>
          </div>

          {(invoice.amount_paid != null && invoice.amount_paid > 0) && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">{t('Amount Paid')}</span>
                <span className="text-emerald-500 font-medium">{money(invoice.amount_paid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">{t('Balance Remaining')}</span>
                <span className={`text-base ${(invoice.balance_remaining ?? 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {money(invoice.balance_remaining ?? 0)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
