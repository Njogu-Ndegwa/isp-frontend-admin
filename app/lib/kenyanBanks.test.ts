import { describe, expect, it } from 'vitest';
import {
  KENYAN_BANKS,
  OTHER_BANK,
  bankForPaybill,
  bankSelectValue,
  paybillForSelection,
} from './kenyanBanks';

describe('KENYAN_BANKS', () => {
  it('has unique codes and unique paybills, so a paybill maps back to one bank', () => {
    expect(new Set(KENYAN_BANKS.map((b) => b.code)).size).toBe(KENYAN_BANKS.length);
    expect(new Set(KENYAN_BANKS.map((b) => b.paybill)).size).toBe(KENYAN_BANKS.length);
  });

  it('carries the well-known paybills', () => {
    const byCode = Object.fromEntries(KENYAN_BANKS.map((b) => [b.code, b.paybill]));
    expect(byCode.kcb).toBe('522522');
    expect(byCode.equity).toBe('247247');
    expect(byCode.coop).toBe('400200');
    expect(byCode.ncba).toBe('880100');
    expect(byCode.absa).toBe('303030');
    expect(byCode.stanchart).toBe('329329');
    expect(byCode.family).toBe('222111');
    expect(byCode.im).toBe('542542');
    expect(byCode.dtb).toBe('516600');
    expect(byCode.stanbic).toBe('600100');
  });

  it('never uses the Other sentinel as a bank code', () => {
    expect(KENYAN_BANKS.some((b) => b.code === OTHER_BANK)).toBe(false);
  });
});

describe('bankForPaybill', () => {
  it('matches a listed paybill, ignoring spaces', () => {
    expect(bankForPaybill('522522')?.code).toBe('kcb');
    expect(bankForPaybill(' 247 247 ')?.code).toBe('equity');
  });

  it('returns null for unknown, empty or masked values', () => {
    expect(bankForPaybill('123456')).toBeNull();
    expect(bankForPaybill('')).toBeNull();
    expect(bankForPaybill(undefined)).toBeNull();
    expect(bankForPaybill('****22')).toBeNull();
  });
});

describe('bankSelectValue', () => {
  it('preselects the bank when editing a saved method whose paybill is listed', () => {
    expect(bankSelectValue('880100', false)).toBe('ncba');
  });

  it('shows Other with the saved value when the paybill is not listed', () => {
    expect(bankSelectValue('999111', false)).toBe(OTHER_BANK);
  });

  it('is empty on a fresh form until the reseller chooses', () => {
    expect(bankSelectValue('', false)).toBe('');
    expect(bankSelectValue('', true)).toBe(OTHER_BANK);
  });

  it('flips to Other when a filled paybill is overridden by hand', () => {
    expect(bankSelectValue('5225229', false)).toBe(OTHER_BANK);
  });
});

describe('paybillForSelection', () => {
  it('fills the paybill of the chosen bank', () => {
    expect(paybillForSelection('equity', '')).toBe('247247');
    expect(paybillForSelection('kcb', '247247')).toBe('522522');
  });

  it('clears a listed paybill when Other is chosen so the reseller types theirs', () => {
    expect(paybillForSelection(OTHER_BANK, '522522')).toBe('');
  });

  it('keeps a hand-typed paybill when Other is chosen', () => {
    expect(paybillForSelection(OTHER_BANK, '999111')).toBe('999111');
  });
});
