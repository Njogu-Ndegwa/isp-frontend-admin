import { describe, expect, it } from 'vitest';
import {
  EMPTY_REGISTER_FIELDS,
  registerFieldsChanges,
  registerFieldsError,
  registerFieldsFromCustomer,
  registerFieldsPayload,
} from './customerRegister';

describe('customer register fields', () => {
  it('sends only filled fields on register', () => {
    expect(registerFieldsPayload({
      ...EMPTY_REGISTER_FIELDS, id_number: ' 1234 ', house: 'Hse 4', install_date: '2026-11-01',
      latitude: '-1.47', longitude: '36.96',
    })).toEqual({ id_number: '1234', house: 'Hse 4', install_date: '2026-11-01', latitude: -1.47, longitude: 36.96 });
    expect(registerFieldsPayload(EMPTY_REGISTER_FIELDS)).toEqual({});
  });

  it('round-trips a customer with nothing set (no undefined/null text)', () => {
    const form = registerFieldsFromCustomer({ id: 1, location: null, latitude: null, install_date: null });
    expect(form).toEqual(EMPTY_REGISTER_FIELDS);
    expect(registerFieldsChanges(form, { location: null, latitude: null })).toEqual({});
  });

  it('edit sends changed fields only, cleared text as empty string, cleared date as null', () => {
    const customer = { notes: 'old', house: 'Hse 1', install_date: '2026-10-01', latitude: 1, longitude: 2 };
    const form = { ...registerFieldsFromCustomer(customer), notes: '', house: 'Hse 1', install_date: '' };
    expect(registerFieldsChanges(form, customer)).toEqual({ notes: '', install_date: null });
  });

  it('validates email and coordinate pairs', () => {
    expect(registerFieldsError({ ...EMPTY_REGISTER_FIELDS, email: 'nope' })).toMatch(/email/);
    expect(registerFieldsError({ ...EMPTY_REGISTER_FIELDS, latitude: '1' })).toMatch(/both/);
    expect(registerFieldsError({ ...EMPTY_REGISTER_FIELDS, latitude: '100', longitude: '1' })).toMatch(/between/);
    expect(registerFieldsError({ ...EMPTY_REGISTER_FIELDS, email: 'a@b.co', latitude: '-1', longitude: '36' })).toBeNull();
  });
});
