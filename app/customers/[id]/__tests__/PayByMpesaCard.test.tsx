import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PayByMpesaCard from '../PayByMpesaCard';
import { FR } from '../../../lib/locales/fr';
import type { PayByMpesa } from '../../../lib/types';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
const tr = (dict: Record<string, string>) => (text: string, vars?: Record<string, string | number>) =>
  (dict[text] ?? text).replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m));
const en = tr({});
const fr = tr(FR);
const kes = (n: number) => `KES ${n.toLocaleString('en-US')}`;

const ready: PayByMpesa = {
  paybill: '4159825', account_number: '48201875', amount: 3000, unavailable_reason: null,
};

const render = (card: PayByMpesa, t = en, extra: { phone?: string; walletCredit?: number } = {}) =>
  renderToStaticMarkup(
    <PayByMpesaCard
      card={card}
      t={t}
      formatAmount={kes}
      onCopy={() => {}}
      phone={extra.phone ?? '254723456789'}
      walletCredit={extra.walletCredit}
    />,
  );

describe('PayByMpesaCard', () => {
  it('shows the paybill and account, each with a copy button, and the amount', () => {
    const html = render(ready);
    expect(html).toContain('Pay by M-Pesa');
    expect(html).toContain('>4159825<');
    expect(html).toContain('>48201875<');
    expect(html).toContain('aria-label="Copy paybill"');
    expect(html).toContain('aria-label="Copy account number"');
    expect(html).toContain('KES 3,000');
  });

  it('shares a ready message by copy or WhatsApp to the customer', () => {
    const html = render(ready);
    const message = 'Pay via M-Pesa: Paybill 4159825, Account 48201875. Amount KES 3,000';
    expect(html).toContain(message);
    expect(html).toContain('Copy message');
    expect(html).toContain(`href="https://wa.me/254723456789?text=${encodeURIComponent(message)}"`);
  });

  it('mentions wallet credit when the customer has some', () => {
    expect(render(ready, en, { walletCredit: 500 })).toContain('KES 500 wallet credit counts towards the next payment.');
    expect(render(ready)).not.toContain('wallet credit');
  });

  it('renders nothing for hotspot customers', () => {
    expect(render({ paybill: null, account_number: null, amount: null, unavailable_reason: 'hotspot' })).toBe('');
  });

  it('explains instead of showing a paybill that would not renew the customer', () => {
    const html = render({ paybill: null, account_number: null, amount: null, unavailable_reason: 'no_paybill' });
    expect(html).toContain('collect by paybill and account number');
    expect(html).not.toContain('4159825');
    expect(html).not.toContain('wa.me');
  });

  it('is translated for French-speaking resellers', () => {
    const html = render(ready, fr);
    expect(html).toContain('Payer par M-Pesa');
    expect(html).toContain('Payez par M-Pesa : Paybill 4159825, compte 48201875. Montant KES 3,000');
    expect(html).toContain('Partager sur WhatsApp');
  });
});
