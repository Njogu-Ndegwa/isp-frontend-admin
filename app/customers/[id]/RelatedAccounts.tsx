'use client';

import Link from 'next/link';
import { Customer } from '../../lib/types';
import { phoneKey } from './paymentHistory';

// Payments live on one customer record, but one person can own several:
// a companion TV riding their subscription, or an older record left behind
// when their phone reconnected with a new MAC. Point the reseller at them so
// an empty or short payment history isn't misread.
export default function RelatedAccounts({ customer, customers }: { customer: Customer; customers: Customer[] }) {
  const owner = customer.subscription_owner_id
    ? customers.find((c) => c.id === customer.subscription_owner_id)
    : undefined;
  const companions = customers.filter((c) => c.subscription_owner_id === customer.id);
  const key = phoneKey(customer.phone);
  const samePhone = key
    ? customers.filter((c) => c.id !== customer.id
      && c.id !== owner?.id
      && c.subscription_owner_id !== customer.id
      && phoneKey(c.phone) === key)
    : [];

  if (!customer.subscription_owner_id && companions.length === 0 && samePhone.length === 0) return null;

  const linkTo = (c: Customer) => (
    <Link key={c.id} href={`/customers/${c.id}`} className="text-accent-primary hover:underline">
      {c.name || c.mac_address || `#${c.id}`}
    </Link>
  );
  const joinLinks = (list: Customer[]) => list.flatMap((c, i) => (i ? [', ', linkTo(c)] : [linkTo(c)]));

  return (
    <div className="card p-4 space-y-2 text-sm" data-testid="related-accounts">
      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Linked Accounts</h3>
      {customer.subscription_owner_id && (
        <p className="text-foreground">
          Covered by {owner ? linkTo(owner) : `customer #${customer.subscription_owner_id}`}&apos;s subscription — renewals
          for this device are paid on that account.
        </p>
      )}
      {companions.length > 0 && (
        <p className="text-foreground">
          Subscription shared with {companions.length} device{companions.length === 1 ? '' : 's'}: {joinLinks(companions)}
        </p>
      )}
      {samePhone.length > 0 && (
        <p className="text-foreground">
          Same phone number on {samePhone.length} other account{samePhone.length === 1 ? '' : 's'}: {joinLinks(samePhone)}
        </p>
      )}
    </div>
  );
}
