import { describe, expect, it } from 'vitest';
import { subscriptionAlertMessage } from '../subscriptionAlert';
import { translate, type TFunction } from '../i18n';
import type { SubscriptionInvoice } from '../types';

const tFor = (lang: string): TFunction => (text, vars) => translate(lang, text, vars);

const invoice = (overrides: Partial<SubscriptionInvoice>): SubscriptionInvoice => ({
  id: 1,
  period_label: 'March 2026',
  final_charge: 10,
  currency: 'USD',
  status: 'pending',
  due_date: '2026-09-22T14:00:00',
  amount_paid: 0,
  balance_remaining: 10,
  days_until_due: 2,
  is_due_soon: true,
  is_overdue: false,
  ...overrides,
});

describe('subscriptionAlertMessage', () => {
  it('states a USD invoice in USD, never KES (the login pop-up bug)', () => {
    const msg = subscriptionAlertMessage('trial', invoice({}), null, tFor('en'));
    expect(msg).toBe('Your March 2026 invoice of USD 10.00 is due in 2 days.');
    expect(msg).not.toContain('KES');
  });

  it('speaks French for Cameroon resellers', () => {
    const msg = subscriptionAlertMessage('trial', invoice({}), null, tFor('fr'));
    expect(msg).toBe('Votre facture de March 2026 de USD 10.00 est due dans 2 jours.');
  });

  it('keeps Kenyan messages exactly as before', () => {
    const msg = subscriptionAlertMessage(
      'active',
      invoice({ final_charge: 1500, currency: 'KES', balance_remaining: 1500 }),
      null,
      tFor('en'),
    );
    expect(msg).toBe('Your March 2026 invoice of KES 1,500 is due in 2 days.');
  });

  it('handles overdue and partial payments in the invoice currency', () => {
    const msg = subscriptionAlertMessage(
      'active',
      invoice({ is_overdue: true, is_due_soon: false, amount_paid: 4, balance_remaining: 6 }),
      null,
      tFor('en'),
    );
    expect(msg).toBe('Your March 2026 invoice of USD 10.00 is overdue. USD 4.00 paid, USD 6.00 remaining.');
  });

  it('suspended wins over invoice details', () => {
    expect(subscriptionAlertMessage('suspended', invoice({}), null, tFor('fr'))).toBe(
      'Votre abonnement est suspendu. Veuillez régler votre facture pour continuer à utiliser le service.',
    );
  });

  it('returns null when there is nothing to warn about', () => {
    expect(subscriptionAlertMessage('active', null, null, tFor('en'))).toBeNull();
  });
});
