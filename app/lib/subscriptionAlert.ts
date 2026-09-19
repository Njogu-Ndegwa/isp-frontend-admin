import { formatMoney } from './format';
import type { TFunction } from './i18n';
import type { SubscriptionInvoice } from './types';

/**
 * The subscription alert sentence, translated and in the invoice's currency.
 *
 * Used by the dashboard and by SubscriptionAlertBanner, so the alert returned
 * at login (whose backend text is English) reads the same as everywhere else.
 * Returns null when there is nothing to warn about.
 */
export function subscriptionAlertMessage(
  status: string | null | undefined,
  invoice: SubscriptionInvoice | null | undefined,
  expiresAt: string | null | undefined,
  t: TFunction,
): string | null {
  if (status === 'suspended' || status === 'inactive') {
    return t('Your subscription is suspended. Please pay your outstanding invoice to continue using the service.');
  }
  if (invoice?.is_overdue) {
    const paid = invoice.amount_paid ?? 0;
    const remaining = invoice.balance_remaining ?? Math.max(invoice.final_charge - paid, 0);
    const money = (v: number) => formatMoney(v, invoice.currency);
    let message = t('Your {period} invoice of {amount} is overdue.', { period: invoice.period_label, amount: money(invoice.final_charge) });
    message += ' ' + (paid > 0
      ? t('{paid} paid, {remaining} remaining.', { paid: money(paid), remaining: money(remaining) })
      : t('Please pay to avoid suspension.'));
    return message;
  }
  if (invoice?.is_due_soon) {
    const paid = invoice.amount_paid ?? 0;
    const remaining = invoice.balance_remaining ?? Math.max(invoice.final_charge - paid, 0);
    const days = invoice.days_until_due ?? 0;
    const money = (v: number) => formatMoney(v, invoice.currency);
    const dueVars = { period: invoice.period_label, amount: money(invoice.final_charge), days };
    let message = days === 1
      ? t('Your {period} invoice of {amount} is due in 1 day.', dueVars)
      : t('Your {period} invoice of {amount} is due in {days} days.', dueVars);
    if (paid > 0) {
      message += ' ' + t('{paid} paid, {remaining} remaining.', { paid: money(paid), remaining: money(remaining) });
    }
    return message;
  }
  if (status === 'trial' && expiresAt) {
    const expires = new Date(expiresAt).getTime();
    if (!Number.isNaN(expires)) {
      const daysLeft = Math.ceil((expires - Date.now()) / 86400000);
      if (daysLeft <= 3) {
        const safeDays = Math.max(daysLeft, 0);
        return safeDays === 1
          ? t('Your free trial ends in 1 day.')
          : t('Your free trial ends in {days} days.', { days: safeDays });
      }
    }
  }
  return null;
}
