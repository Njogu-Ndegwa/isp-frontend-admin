import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FR } from '../../../lib/locales/fr';
import { emptySaleTerms } from '../../adSale';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../../lib/i18n', () => ({
  useT: () => (text: string, vars?: Record<string, string | number>) =>
    text.replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m)),
}));

const { default: SaleTermsFields } = await import('../SaleTermsFields');

const render = (price = '') => renderToStaticMarkup(
  <SaleTermsFields value={{ ...emptySaleTerms(), weeks: '1', price_per_week: price }} errors={{}} onChange={() => {}} />,
);

describe('SaleTermsFields price', () => {
  it('tells the reseller they set the price, with no old limits', () => {
    const html = render();
    expect(html).toContain('Charge what you want, from KES 1. One M-Pesa payment can be up to KES 250,000.');
    expect(html).not.toContain('12,500');
    expect(html).not.toMatch(/KES 200\b/);
  });

  it('lets the browser take any whole number from 1, not steps of 50', () => {
    const input = /<input[^>]*id="sale-price_per_week"[^>]*>/.exec(render())?.[0] ?? '';
    expect(input).toContain('min="1"');
    expect(input).toContain('step="1"');
    expect(input).toContain('value=""');
  });

  it('shows no Bitwave fee on KES 4', () => {
    const html = render('4');
    expect(html.match(/KES 4/g)).toHaveLength(2);
    expect(html).toContain('KES 0');
  });

  it('has the French for every new message', () => {
    for (const key of [
      'Charge what you want, from KES {min}. One M-Pesa payment can be up to KES {max}.',
      'Enter a price in whole shillings, KES 1 or more.',
      'M-Pesa takes at most KES 250,000 in one payment. Lower the price or the weeks.',
    ]) {
      expect(FR[key]).toBeTruthy();
    }
    expect(FR['KES {min} to {max}.']).toBeUndefined();
  });
});
