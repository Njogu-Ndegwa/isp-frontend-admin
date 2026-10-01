import {
  CustomerEventSmsSettings,
  CustomerEventSmsSettingsInput,
  CustomerSmsEvent,
} from '../../lib/types';

export const CUSTOMER_SMS_EVENTS: CustomerSmsEvent[] = ['payment_receipt', 'welcome', 'reminder', 'expiry'];

export const EVENT_LABELS: Record<CustomerSmsEvent, { title: string; hint: string }> = {
  payment_receipt: {
    title: 'Payment receipt',
    hint: 'Sent when a payment is recorded for a customer.',
  },
  welcome: {
    title: 'Welcome (new PPPoE customer)',
    hint: 'Sent when you add a PPPoE customer, with their login details.',
  },
  reminder: {
    title: 'Reminder before expiry',
    hint: 'Sent at the reminder times chosen under Automatic expiry messages.',
  },
  expiry: {
    title: 'Expired',
    hint: 'Sent right after the customer’s plan ends.',
  },
};

export const PLACEHOLDER_LABELS: Record<string, string> = {
  name: 'First name',
  brand: 'Your business name',
  plan: 'Plan name',
  expiry: 'Expiry date & time',
  account: 'Account number',
  paybill: 'Paybill',
  support_phone: 'Support phone',
  amount: 'Amount paid',
  reference: 'Payment reference',
  username: 'PPPoE username',
  password: 'PPPoE password',
};

const EMPTY_TEMPLATES: Record<CustomerSmsEvent, string | null> = {
  payment_receipt: null,
  welcome: null,
  reminder: null,
  expiry: null,
};

/** Tolerates a partial or missing server payload. */
export function normalizeCustomerEventSettings(
  raw: Partial<CustomerEventSmsSettings> | null | undefined,
  fallback: CustomerEventSmsSettings,
): CustomerEventSmsSettings {
  const source = raw ?? {};
  const templates = { ...EMPTY_TEMPLATES };
  for (const event of CUSTOMER_SMS_EVENTS) {
    const value = source.templates?.[event];
    templates[event] = typeof value === 'string' && value.trim() ? value : null;
  }
  return {
    payment_receipt_enabled: Boolean(source.payment_receipt_enabled),
    receipt_include_hotspot: Boolean(source.receipt_include_hotspot),
    welcome_enabled: Boolean(source.welcome_enabled),
    templates,
    defaults: { ...fallback.defaults, ...(source.defaults ?? {}) },
    placeholders: { ...fallback.placeholders, ...(source.placeholders ?? {}) },
    max_length: source.max_length ?? fallback.max_length,
  };
}

export function toCustomerEventInput(settings: CustomerEventSmsSettings): CustomerEventSmsSettingsInput {
  return {
    payment_receipt_enabled: settings.payment_receipt_enabled,
    receipt_include_hotspot: settings.receipt_include_hotspot,
    welcome_enabled: settings.welcome_enabled,
    templates: { ...settings.templates },
  };
}

export function customerEventSettingsAreEqual(a: CustomerEventSmsSettings, b: CustomerEventSmsSettings): boolean {
  if (
    a.payment_receipt_enabled !== b.payment_receipt_enabled
    || a.receipt_include_hotspot !== b.receipt_include_hotspot
    || a.welcome_enabled !== b.welcome_enabled
  ) return false;
  return CUSTOMER_SMS_EVENTS.every(
    (event) => (a.templates[event]?.trim() || null) === (b.templates[event]?.trim() || null),
  );
}

export function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\{([A-Za-z_]+)\}/g)].map((match) => match[1]))];
}

/** Mirrors the backend check so the reseller sees the problem before saving. */
export function validateTemplate(
  text: string | null,
  allowed: string[],
  maxLength: number,
): string | null {
  if (text === null) return null;
  const trimmed = text.trim();
  if (!trimmed) return 'Message text cannot be empty. Use “Use default” to go back to the built-in message.';
  if (trimmed.length > maxLength) return `Keep the message under ${maxLength} characters.`;
  const unknown = placeholdersIn(trimmed).filter((name) => !allowed.includes(name));
  if (unknown.length) {
    return `${unknown.map((name) => `{${name}}`).join(', ')} can’t be used in this message.`;
  }
  return null;
}

export function validateCustomerEventSettings(settings: CustomerEventSmsSettings): string | null {
  for (const event of CUSTOMER_SMS_EVENTS) {
    const error = validateTemplate(settings.templates[event], settings.placeholders[event] ?? [], settings.max_length);
    if (error) return `${EVENT_LABELS[event].title}: ${error}`;
  }
  return null;
}

/** Insert `{name}` at the cursor, returning the new text and caret position. */
export function insertPlaceholder(
  text: string,
  name: string,
  selectionStart: number,
  selectionEnd: number,
): { text: string; caret: number } {
  const token = `{${name}}`;
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  return { text: text.slice(0, start) + token + text.slice(end), caret: start + token.length };
}
