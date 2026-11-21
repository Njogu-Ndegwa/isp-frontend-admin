import { describe, expect, it } from 'vitest';
import { fieldApplies, fieldSpans } from './assistant';

describe('fieldApplies', () => {
  const till = { when: { method_type: ['mpesa_till'] } };
  it('shows a kind’s field only while that kind is picked', () => {
    expect(fieldApplies(till, { method_type: 'mpesa_till' })).toBe(true);
    expect(fieldApplies(till, { method_type: 'MPESA_TILL' })).toBe(true);
    expect(fieldApplies(till, { method_type: 'fapshi' })).toBe(false);
  });
  it('hides kind fields until a kind is chosen', () => {
    expect(fieldApplies(till, { method_type: '' })).toBe(false);
    expect(fieldApplies(till, {})).toBe(false);
  });
  it('always shows a field that belongs to no kind', () => {
    expect(fieldApplies({}, {})).toBe(true);
  });
  it('shows a cap’s FUP fields once any cap is filled in, not for 0 or empty', () => {
    const fup = { when: { data_cap_mb: ['*'] } };
    expect(fieldApplies(fup, { data_cap_mb: '5000' })).toBe(true);
    expect(fieldApplies(fup, { data_cap_mb: '' })).toBe(false);
    expect(fieldApplies(fup, { data_cap_mb: '0' })).toBe(false);
  });
  it('needs every condition: a slow speed only for a capped plan that throttles', () => {
    const slow = { when: { data_cap_mb: ['*'], fup_action: ['throttle'] } };
    expect(fieldApplies(slow, { data_cap_mb: '5000', fup_action: 'throttle' })).toBe(true);
    expect(fieldApplies(slow, { data_cap_mb: '5000', fup_action: 'block' })).toBe(false);
    expect(fieldApplies(slow, { data_cap_mb: '', fup_action: 'throttle' })).toBe(false);
  });
  it('reads the picked plan’s own type for customer fields', () => {
    const form = [{ name: 'plan_id', option_attrs: { connection_type: { '1': 'hotspot', '2': 'pppoe' } } }];
    const login = { when: { 'plan_id.connection_type': ['pppoe'] } };
    expect(fieldApplies(login, { plan_id: '2' }, form)).toBe(true);
    expect(fieldApplies(login, { plan_id: '1' }, form)).toBe(false);
    expect(fieldApplies(login, { plan_id: '' }, form)).toBe(false);
  });
  it('reads a switch as on or off', () => {
    expect(fieldApplies({ when: { enabled: ['true'] } }, { enabled: true })).toBe(true);
    expect(fieldApplies({ when: { enabled: ['true'] } }, { enabled: false })).toBe(false);
  });
});

describe('fieldSpans', () => {
  const f = (name: string, kind: string) => ({ name, label: name, kind, required: false }) as never;
  it('gives a short field the whole row when nothing short sits beside it', () => {
    const s = fieldSpans([f('method_type', 'select'), f('label', 'text'), f('mpesa_till_number', 'text')]);
    expect(s.method_type).toContain('col-span-2');
    expect(s.method_type).not.toMatch(/(^| )col-span-1/);
  });
  it('pairs two short fields side by side on a phone', () => {
    const s = fieldSpans([f('price', 'integer'), f('duration_value', 'integer'), f('name', 'text')]);
    expect(s.price.split(' ')[0]).toBe('col-span-1');
    expect(s.duration_value.split(' ')[0]).toBe('col-span-1');
    expect(s.name.split(' ')[0]).toBe('col-span-2');
  });
  it('never pairs across a switch, which takes its own row', () => {
    const s = fieldSpans([f('plan_type', 'select'), f('is_hidden', 'boolean'), f('max_shared_users', 'integer')]);
    expect(s.plan_type.split(' ')[0]).toBe('col-span-2');
    expect(s.max_shared_users.split(' ')[0]).toBe('col-span-2');
  });
  it('lets text share a row on a wide card, but not an odd one out', () => {
    const s = fieldSpans([f('name', 'text'), f('phone', 'text'), f('email', 'text')]);
    expect(s.name).toContain('@md:col-span-1');
    expect(s.phone).toContain('@md:col-span-1');
    expect(s.email).toContain('@md:col-span-2');
  });
});
