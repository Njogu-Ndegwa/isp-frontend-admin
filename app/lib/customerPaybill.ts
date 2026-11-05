import type { Customer, PayByMpesa, PayByMpesaUnavailableReason, PaymentMethodConfig } from './types';
import type { TFunction } from './i18n';

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

/**
 * The paybill to show for one customer. The backend's per-customer
 * `payment_paybill` wins (it knows the customer's router and settlement, and
 * reads the platform paybill from config); null there means no account-number
 * paybill applies. Only when the backend did not send the field (older API,
 * demo mode) does the reseller-wide `fallback` from customerPaybill() apply.
 */
export function paybillForCustomer(
  customer: { payment_paybill?: string | null },
  fallback: string | null,
): string | null {
  if (customer.payment_paybill !== undefined) return customer.payment_paybill?.trim() || null;
  return fallback;
}

type PayByMpesaSource = Partial<Pick<
  Customer,
  'payment_paybill' | 'pay_by_mpesa' | 'account_number' | 'connection_type' | 'plan' | 'pppoe_username'
>>;

/**
 * The "Pay by M-Pesa" card for one customer. The backend's `pay_by_mpesa` is
 * the answer whenever it is sent: it checks the paybill and account number
 * against the C2B handler that renews the customer. Older backends and demo
 * mode don't send it; then it is derived the same way from what is known
 * (PPPoE and static IP pay by account number, hotspot pays on the login page).
 */
export function payByMpesaFor(
  customer: PayByMpesaSource,
  fallbackPaybill: string | null,
): PayByMpesa {
  if (customer.pay_by_mpesa) return customer.pay_by_mpesa;
  const none = (reason: PayByMpesaUnavailableReason): PayByMpesa => ({
    paybill: null, account_number: null, amount: null, unavailable_reason: reason,
  });
  const type = customer.connection_type ?? customer.plan?.connection_type ?? null;
  if (!customer.plan && !type) return none('no_plan');
  if (type === 'pppoe') {
    if (!customer.pppoe_username) return none('no_pppoe_login');
  } else if (type !== 'static_ip') {
    return none('hotspot');
  }
  const account = customer.account_number?.trim();
  if (!account) return none('no_account_number');
  const paybill = paybillForCustomer(customer, fallbackPaybill);
  if (!paybill) return none('no_paybill');
  return {
    paybill,
    account_number: account,
    amount: customer.plan?.price ?? null,
    unavailable_reason: null,
  };
}

/** The ready-to-send payment message: "Pay via M-Pesa: Paybill …, Account …. Amount KES …". */
export function payByMpesaMessage(
  card: PayByMpesa,
  t: TFunction,
  formatAmount: (amount: number) => string,
): string {
  const head = t('Pay via M-Pesa: Paybill {paybill}, Account {account}.', {
    paybill: card.paybill ?? '',
    account: card.account_number ?? '',
  });
  if (card.amount == null) return head;
  return `${head} ${t('Amount {amount}', { amount: formatAmount(card.amount) })}`;
}

/**
 * wa.me link that opens WhatsApp with `text` ready to send, to the customer
 * when their phone looks like a real number, else to a chat the reseller
 * picks (a hotspot "phone" can be a MAC or a placeholder).
 */
export function whatsappShareUrl(phone: string | null | undefined, text: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  // Paybill payments are Kenyan: 0712… / 712… become 254712….
  if (/^0[17]\d{8}$/.test(digits)) digits = `254${digits.slice(1)}`;
  else if (/^[17]\d{8}$/.test(digits)) digits = `254${digits}`;
  const to = digits.length >= 11 && digits.length <= 15 ? digits : '';
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}
