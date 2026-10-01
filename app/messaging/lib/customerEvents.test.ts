import { describe, expect, it } from 'vitest';
import { CustomerEventSmsSettings } from '../../lib/types';
import {
  customerEventSettingsAreEqual,
  insertPlaceholder,
  normalizeCustomerEventSettings,
  validateCustomerEventSettings,
  validateTemplate,
} from './customerEvents';

const BASE: CustomerEventSmsSettings = {
  payment_receipt_enabled: false,
  receipt_include_hotspot: false,
  welcome_enabled: false,
  templates: { payment_receipt: null, welcome: null, reminder: null, expiry: null },
  defaults: {
    payment_receipt: 'Payment of {amount} received.',
    welcome: 'Welcome to {brand}!',
    reminder: 'Reminder.',
    expiry: 'Expired.',
  },
  placeholders: {
    payment_receipt: ['name', 'amount'],
    welcome: ['name', 'username', 'password'],
    reminder: ['name'],
    expiry: ['name'],
  },
  max_length: 480,
};

describe('customer event SMS settings', () => {
  it('fills a partial payload with safe defaults', () => {
    const settings = normalizeCustomerEventSettings({ payment_receipt_enabled: true }, BASE);
    expect(settings.payment_receipt_enabled).toBe(true);
    expect(settings.welcome_enabled).toBe(false);
    expect(settings.templates.expiry).toBeNull();
    expect(settings.placeholders.welcome).toContain('password');
  });

  it('treats blank custom text as the default', () => {
    const settings = normalizeCustomerEventSettings(
      { templates: { payment_receipt: '   ', welcome: null, reminder: 'Hi {name}', expiry: null } },
      BASE,
    );
    expect(settings.templates.payment_receipt).toBeNull();
    expect(settings.templates.reminder).toBe('Hi {name}');
  });

  it('flags placeholders the event cannot fill', () => {
    expect(validateTemplate('Paid {amount}', ['name'], 480)).toContain('{amount}');
    expect(validateTemplate('Hi {name}', ['name'], 480)).toBeNull();
    expect(validateTemplate(null, ['name'], 480)).toBeNull();
    expect(validateTemplate('  ', ['name'], 480)).not.toBeNull();
    expect(validateTemplate('x'.repeat(481), ['name'], 480)).not.toBeNull();
  });

  it('names the message with the problem', () => {
    const error = validateCustomerEventSettings({
      ...BASE,
      templates: { ...BASE.templates, expiry: 'Paid {amount}' },
    });
    expect(error).toMatch(/^Expired:/);
  });

  it('ignores whitespace-only differences when detecting changes', () => {
    const edited = { ...BASE, templates: { ...BASE.templates, welcome: 'Hi {name} ' } };
    const saved = { ...BASE, templates: { ...BASE.templates, welcome: 'Hi {name}' } };
    expect(customerEventSettingsAreEqual(edited, saved)).toBe(true);
    expect(customerEventSettingsAreEqual({ ...saved, welcome_enabled: true }, saved)).toBe(false);
  });

  it('inserts a placeholder at the cursor, replacing a selection', () => {
    expect(insertPlaceholder('Hi !', 'name', 3, 3)).toEqual({ text: 'Hi {name}!', caret: 9 });
    expect(insertPlaceholder('Hi you!', 'name', 3, 6)).toEqual({ text: 'Hi {name}!', caret: 9 });
  });
});
