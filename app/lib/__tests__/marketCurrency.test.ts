import { afterEach, describe, expect, it } from 'vitest';
import { formatAmount, formatAmountCompact, formatMoney, getDisplayCurrency, setDisplayCurrency } from '../format';
import { previewCurrencyCode } from '../../components/PortalPreview';

// A Zambian reseller's market currency is ZMW: his plans, vouchers, revenue and
// portal preview render in Kwacha. Kenyan resellers stay on KES / "KSH".

afterEach(() => setDisplayCurrency(null));

describe('reseller money in the market currency', () => {
  it('renders a Zambian reseller in ZMW', () => {
    setDisplayCurrency('zmw');
    expect(getDisplayCurrency()).toBe('ZMW');
    expect(formatAmount(1500)).toBe('ZMW 1,500');
    expect(formatAmountCompact(25_000)).toBe('ZMW 25K');
    expect(previewCurrencyCode()).toBe('ZMW');
  });

  it('keeps Kenya on KES and the portal preview on KSH', () => {
    setDisplayCurrency('KES');
    expect(formatAmount(1500)).toBe('KES 1,500');
    expect(previewCurrencyCode()).toBe('KSH');
  });

  it('defaults to KES before the market is known', () => {
    setDisplayCurrency(undefined);
    expect(formatAmount(50)).toBe('KES 50');
    expect(previewCurrencyCode()).toBe('KSH');
  });

  it('formats ZMW amounts that carry their own currency', () => {
    expect(formatMoney(20, 'ZMW')).toBe('ZMW 20');
  });
});
