import type { PaymentMethodConfig } from './types';

/** The platform's M-Pesa paybill. Payments to it are routed by account number. */
export const PLATFORM_PAYBILL = '4159825';

/**
 * The reseller's own paybill that customers can pay with their account
 * number, or null when there is none.
 *
 * Only an active `mpesa_paybill_with_keys` method whose C2B URLs are
 * registered qualifies. Without the C2B registration Safaricom never tells us
 * about the payment, so the customer would pay and not be renewed. This is
 * the same rule the backend uses before advertising a reseller's paybill in
 * expiry reminders (customer_expiry_notifications._paybill_for_method).
 *
 * With several registered paybills the newest one wins, matching the order
 * GET /payment-methods returns.
 */
export function ownC2BPaybill(
  methods: readonly PaymentMethodConfig[] | null | undefined,
): string | null {
  if (!methods) return null;
  const candidates = methods
    .filter(
      (m) =>
        m.is_active &&
        m.method_type === 'mpesa_paybill_with_keys' &&
        Boolean(m.c2b_registered_at) &&
        Boolean(m.mpesa_shortcode?.trim()),
    )
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return candidates[0]?.mpesa_shortcode?.trim() ?? null;
}

/** The paybill this reseller's customers should pay into. */
export function customerPaybill(
  methods: readonly PaymentMethodConfig[] | null | undefined,
): string {
  return ownC2BPaybill(methods) ?? PLATFORM_PAYBILL;
}

/**
 * "paybill — account" for the customer list. While the paybill is still
 * loading (null) only the account number is shown, so a reseller with their
 * own paybill never sees the platform one flash up.
 */
export function paybillAccountLabel(paybill: string | null, accountNumber: string): string {
  return paybill ? `${paybill} — ${accountNumber}` : accountNumber;
}
