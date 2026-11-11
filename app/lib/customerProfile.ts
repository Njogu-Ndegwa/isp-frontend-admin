// Customer register details: ID / passport number, email, alternative phone,
// house / unit, building / estate, installation date and notes. All optional.
// Kept free of React so the rules can be unit tested.
//
// The national ID is personal data. List responses only carry
// `national_id_masked` (last three characters); the full number comes from the
// single-customer endpoint and is shown only on that customer's page. Exports
// use the masked form.
//
// To add a field: add it to PROFILE_FIELDS (and the backend's PROFILE_FIELDS).

import type { Customer } from './types';
import { phoneMatches } from './phoneSearch';

export type ProfileField =
  | 'national_id'
  | 'email'
  | 'alt_phone'
  | 'address_line'
  | 'building'
  | 'installation_date'
  | 'notes';

export type CustomerProfileForm = Record<ProfileField, string>;

export interface ProfileFieldDef {
  field: ProfileField;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea';
  maxLength?: number;
}

export const PROFILE_FIELDS: ProfileFieldDef[] = [
  { field: 'national_id', label: 'ID / passport number', placeholder: '12345678', type: 'text', maxLength: 32 },
  { field: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email', maxLength: 254 },
  { field: 'alt_phone', label: 'Alternative phone', placeholder: '0722 000 111', type: 'tel', maxLength: 32 },
  { field: 'address_line', label: 'House / unit', placeholder: 'House B4', type: 'text', maxLength: 200 },
  { field: 'building', label: 'Building / estate', placeholder: 'Kahawa Sukari Estate', type: 'text', maxLength: 120 },
  { field: 'installation_date', label: 'Installation date', type: 'date' },
  { field: 'notes', label: 'Notes', placeholder: 'Anything useful about this customer or installation', type: 'textarea', maxLength: 2000 },
];

export const EMPTY_PROFILE: CustomerProfileForm = {
  national_id: '',
  email: '',
  alt_phone: '',
  address_line: '',
  building: '',
  installation_date: '',
  notes: '',
};

/** Form values from a customer (the full national ID only if the API sent it). */
export function profileFromCustomer(customer: Partial<Customer> | null | undefined): CustomerProfileForm {
  const out = { ...EMPTY_PROFILE };
  if (!customer) return out;
  for (const { field } of PROFILE_FIELDS) {
    const value = customer[field];
    out[field] = typeof value === 'string' ? value : '';
  }
  return out;
}

/** Register payload: only the fields that were filled in. */
export function profileForRegister(form: CustomerProfileForm): Partial<CustomerProfileForm> {
  const out: Partial<CustomerProfileForm> = {};
  for (const { field } of PROFILE_FIELDS) {
    const value = form[field].trim();
    if (value) out[field] = field === 'notes' ? form[field] : value;
  }
  return out;
}

/**
 * Edit payload: only fields that changed. A cleared field is sent as '' (the
 * backend stores NULL). `nationalIdKnown` is false when the full number could
 * not be loaded — the ID field is then never sent, so a masked or empty value
 * cannot overwrite the real one.
 */
export function profileChanges(
  form: CustomerProfileForm,
  original: CustomerProfileForm,
  nationalIdKnown = true,
): Partial<CustomerProfileForm> {
  const out: Partial<CustomerProfileForm> = {};
  for (const { field } of PROFILE_FIELDS) {
    if (field === 'national_id' && !nationalIdKnown) continue;
    const next = form[field].trim();
    const prev = original[field].trim();
    if (next !== prev) out[field] = next;
  }
  return out;
}

/** "***678" — what lists and exports show. */
export function maskedNationalId(customer: Pick<Customer, 'national_id_masked'>): string {
  return customer.national_id_masked || '';
}

/** Search across the register details a list row carries (not the ID: see nationalIdQuery). */
export function profileMatchesSearch(customer: Customer, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return false;
  return (
    (customer.email?.toLowerCase() || '').includes(query) ||
    phoneMatches(customer.alt_phone, rawQuery.trim()) ||
    (customer.building?.toLowerCase() || '').includes(query) ||
    (customer.address_line?.toLowerCase() || '').includes(query)
  );
}

/** Shortest ID fragment worth asking the backend about (same as the backend). */
export const NATIONAL_ID_SEARCH_MIN = 4;

/**
 * The query to send to the national-ID lookup, or null when it can't be an ID
 * fragment (too short, or has no digits — names are matched locally).
 */
export function nationalIdQuery(rawQuery: string): string | null {
  const cleaned = rawQuery.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length < NATIONAL_ID_SEARCH_MIN || !/\d/.test(cleaned)) return null;
  return cleaned;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Spreadsheet formula injection: a cell starting with = + - @ runs as a
  // formula. Plain numbers such as +254 712 345 678 are left alone.
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d\s()-]+$/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS: { header: string; value: (c: Customer) => unknown }[] = [
  { header: 'Name', value: (c) => c.name },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Account number', value: (c) => c.account_number },
  { header: 'Status', value: (c) => c.status },
  { header: 'Connection', value: (c) => c.connection_type ?? c.plan?.connection_type },
  { header: 'Plan', value: (c) => c.plan?.name },
  { header: 'Router', value: (c) => c.router?.name },
  { header: 'Expiry', value: (c) => c.expiry },
  { header: 'PPPoE username', value: (c) => c.pppoe_username },
  { header: 'MAC address', value: (c) => c.mac_address },
  { header: 'Static IP', value: (c) => c.static_ip },
  // Masked on purpose: an export travels; the full number stays in the app.
  { header: 'ID / passport (masked)', value: (c) => c.national_id_masked },
  { header: 'Email', value: (c) => c.email },
  { header: 'Alternative phone', value: (c) => c.alt_phone },
  { header: 'House / unit', value: (c) => c.address_line },
  { header: 'Building / estate', value: (c) => c.building },
  { header: 'Installation date', value: (c) => c.installation_date },
  { header: 'Notes', value: (c) => c.notes },
  { header: 'Registered', value: (c) => c.created_at },
];

export function customersCsv(customers: Customer[], translate: (s: string) => string = (s) => s): string {
  const header = CSV_COLUMNS.map((col) => csvCell(translate(col.header))).join(',');
  const rows = customers.map((c) => CSV_COLUMNS.map((col) => csvCell(col.value(c))).join(','));
  // BOM so Excel opens accented names correctly.
  return '﻿' + [header, ...rows].join('\r\n') + '\r\n';
}
