import type { PaymentMethod } from './types';

/** The part of a router the payments check needs. */
export interface RouterPaymentMethods {
  payment_methods?: PaymentMethod[] | null;
}

/**
 * True when every router sells by voucher only, so there is nothing for a
 * payment method to collect. A router with no list collects M-Pesa too (the
 * backend default is ["mpesa", "voucher"]).
 */
export function allRoutersVoucherOnly(routers: RouterPaymentMethods[]): boolean {
  return (
    routers.length > 0 &&
    routers.every((r) => {
      const methods = r.payment_methods && r.payment_methods.length > 0 ? r.payment_methods : ['mpesa'];
      return !methods.includes('mpesa');
    })
  );
}

/**
 * Whether the onboarding "Set up payments" step is done: the reseller has a
 * payment method, or none is needed because every router is vouchers only
 * (e.g. a market with no mobile-money gateway, like Zambia).
 */
export function paymentsStepDone(paymentMethodCount: number, routers: RouterPaymentMethods[]): boolean {
  return paymentMethodCount > 0 || allRoutersVoucherOnly(routers);
}
