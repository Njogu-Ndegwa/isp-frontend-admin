import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROFILE,
  customersCsv,
  nationalIdQuery,
  profileChanges,
  profileForRegister,
  profileFromCustomer,
  profileMatchesSearch,
} from './customerProfile';
import { customerMatchesSearch } from './customerFilters';
import type { Customer } from './types';

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    name: 'Wanjiru',
    phone: '254712345678',
    mac_address: '',
    status: 'active',
    expiry: '2026-11-20T10:00:00',
    plan: { id: 1, name: 'Home 10M', price: 2000, connection_type: 'pppoe' },
    router: { id: 1, name: 'R1' },
    ...overrides,
  } as Customer;
}

describe('profileFromCustomer', () => {
  it('reads the fields and turns missing ones into empty strings', () => {
    const form = profileFromCustomer(customer({ email: 'w@example.com', building: null, national_id: '30981776' }));
    expect(form.email).toBe('w@example.com');
    expect(form.building).toBe('');
    expect(form.national_id).toBe('30981776');
    expect(form.notes).toBe('');
  });

  it('never fills the ID field from the masked value', () => {
    const form = profileFromCustomer(customer({ national_id_masked: '***776' }));
    expect(form.national_id).toBe('');
  });
});

describe('profileForRegister', () => {
  it('sends only filled-in fields, trimmed', () => {
    expect(profileForRegister({ ...EMPTY_PROFILE, email: ' w@example.com ', building: '  ' })).toEqual({
      email: 'w@example.com',
    });
  });
});

describe('profileChanges', () => {
  const original = { ...EMPTY_PROFILE, email: 'old@example.com', national_id: '30981776' };

  it('sends changed fields and "" for a cleared one', () => {
    const form = { ...original, email: '', building: 'Kahawa Sukari' };
    expect(profileChanges(form, original)).toEqual({ email: '', building: 'Kahawa Sukari' });
  });

  it('sends nothing when nothing changed', () => {
    expect(profileChanges({ ...original, email: ' old@example.com ' }, original)).toEqual({});
  });

  it('never sends the ID when the full number was not loaded', () => {
    const form = { ...original, national_id: '', email: 'new@example.com' };
    expect(profileChanges(form, original, false)).toEqual({ email: 'new@example.com' });
  });
});

describe('search', () => {
  const c = customer({
    id: 7, email: 'jane@kahawa.co.ke', alt_phone: '0722 000 111', building: 'Kahawa Sukari Estate', address_line: 'House B4',
  });

  it('matches email, alternative phone, building and house', () => {
    expect(profileMatchesSearch(c, 'JANE@')).toBe(true);
    expect(profileMatchesSearch(c, '254722000111')).toBe(true);
    expect(profileMatchesSearch(c, 'sukari')).toBe(true);
    expect(profileMatchesSearch(c, 'b4')).toBe(true);
    expect(profileMatchesSearch(c, 'westlands')).toBe(false);
  });

  it('is part of the customer list search, with ID matches from the backend', () => {
    expect(customerMatchesSearch(c, 'sukari')).toBe(true);
    expect(customerMatchesSearch(c, '30981776')).toBe(false);
    expect(customerMatchesSearch(c, '30981776', new Set([7]))).toBe(true);
    expect(customerMatchesSearch(customer({ id: 8 }), '30981776', new Set([7]))).toBe(false);
  });

  it('asks the backend only for ID-like queries', () => {
    expect(nationalIdQuery('3098 1776')).toBe('30981776');
    expect(nationalIdQuery('ak-9988')).toBe('AK9988');
    expect(nationalIdQuery('123')).toBeNull();
    expect(nationalIdQuery('Wanjiru')).toBeNull();
  });
});

describe('customersCsv', () => {
  it('exports the ID masked, never the full number', () => {
    const csv = customersCsv([
      customer({ national_id: '30981776', national_id_masked: '***776', email: 'w@example.com', notes: 'Gate, "blue"\nsecond line' }),
    ]);
    expect(csv).toContain('***776');
    expect(csv).not.toContain('30981776');
    expect(csv).toContain('w@example.com');
    // Quotes, commas and line breaks are escaped.
    expect(csv).toContain('"Gate, ""blue""\nsecond line"');
  });

  it('defuses spreadsheet formulas but keeps phone numbers as they are', () => {
    const csv = customersCsv([customer({ name: '=HYPERLINK("x")', alt_phone: '+254 722 000 111' })]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(',+254 722 000 111,');
  });

  it('has a header row with the register columns', () => {
    const [header] = customersCsv([]).replace('﻿', '').split('\r\n');
    expect(header).toContain('ID / passport (masked)');
    expect(header).toContain('Building / estate');
    expect(header).toContain('Installation date');
  });
});
