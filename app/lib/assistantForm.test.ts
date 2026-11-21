import { describe, expect, it } from 'vitest';
import { fieldApplies, fieldSpans, pickLabel, setChanges, smsSegments } from './assistant';

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

describe('pickLabel', () => {
  it('reads a record the way the server names it, leaving out parts with nothing in them', () => {
    expect(pickLabel({ id: 1, name: 'Amina', phone: '0711' }, '{name} · {phone}')).toBe('Amina · 0711');
    expect(pickLabel({ id: 1, name: 'Amina', phone: null }, '{name} · {phone}')).toBe('Amina');
    expect(pickLabel({ id: 7, period_label: 'Oct', currency: 'KES', balance_remaining: 1500 }, '{period_label} · {currency} {balance_remaining}')).toBe('Oct · KES 1,500');
  });
  it('falls back to the name, then the id', () => {
    expect(pickLabel({ id: 3, name: 'Main Tower' })).toBe('Main Tower');
    expect(pickLabel({ id: 9 }, '{name}')).toBe('#9');
  });
});

describe('setChanges', () => {
  it('sends only what was ticked and unticked, so the other ports stay as they are', () => {
    expect(setChanges(['ether2', 'ether4'], ['ether2', 'ether3'])).toEqual({ add: ['ether3'], remove: ['ether4'] });
    expect(setChanges(['ether2'], ['ether2'])).toEqual({ add: [], remove: [] });
  });
});

describe('smsSegments', () => {
  it('counts 160 plain characters as one SMS and 153 per part after that', () => {
    expect(smsSegments('')).toEqual({ chars: 0, segments: 0, unicode: false });
    expect(smsSegments('a'.repeat(160)).segments).toBe(1);
    expect(smsSegments('a'.repeat(161)).segments).toBe(2);
    expect(smsSegments('a'.repeat(306)).segments).toBe(2);
  });
  it('counts the extension characters twice and emoji as a shorter SMS', () => {
    expect(smsSegments('€').chars).toBe(2);
    const emoji = smsSegments('Hi 😀');
    expect(emoji.unicode).toBe(true);
    expect(smsSegments('a'.repeat(69) + '😀').segments).toBe(2);
  });
});
