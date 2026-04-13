'use client';

import { SubscriptionInvoice } from '../lib/types';

interface InvoiceChargeBreakdownProps {
  invoice: SubscriptionInvoice;
}

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function InvoiceChargeBreakdown({ invoice }: InvoiceChargeBreakdownProps) {
  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Charge Breakdown</h3>

      <div className="space-y-3">
        {/* Hotspot charges */}
        {(invoice.hotspot_revenue != null && invoice.hotspot_revenue > 0) && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">Hotspot Revenue</p>
              <p className="text-xs text-foreground-muted">
                {formatKES(invoice.hotspot_revenue)} x 3%
              </p>
            </div>
            <span className="font-medium text-foreground">
              {formatKES(invoice.hotspot_charge ?? 0)}
            </span>
          </div>
        )}

        {/* PPPoE charges */}
        {(invoice.pppoe_user_count != null && invoice.pppoe_user_count > 0) && (
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">PPPoE Users</p>
              <p className="text-xs text-foreground-muted">
                {invoice.pppoe_user_count} users x KES 25
              </p>
            </div>
            <span className="font-medium text-foreground">
              {formatKES(invoice.pppoe_charge ?? 0)}
            </span>
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-2">
          {/* Gross charge */}
          {invoice.gross_charge != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Gross Charge</span>
              <span className="text-foreground">{formatKES(invoice.gross_charge)}</span>
            </div>
          )}

          {/* Minimum note */}
          {invoice.gross_charge != null && invoice.gross_charge < 500 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">Minimum charge applied</span>
              <span className="text-amber-500">KES 500</span>
            </div>
          )}

          {/* Final charge */}
          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
            <span className="text-foreground">Total Due</span>
            <span className="text-amber-500 text-base">{formatKES(invoice.final_charge)}</span>
          </div>

          {(invoice.amount_paid != null && invoice.amount_paid > 0) && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Amount Paid</span>
                <span className="text-emerald-500 font-medium">{formatKES(invoice.amount_paid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">Balance Remaining</span>
                <span className={`text-base ${(invoice.balance_remaining ?? 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {formatKES(invoice.balance_remaining ?? 0)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
