import type { Customer, CustomerRegisterFieldsInput } from './types';

/** Form state for the optional customer-register fields (all strings). */
export interface RegisterFieldsForm {
  location: string;
  latitude: string;
  longitude: string;
  id_number: string;
  house: string;
  email: string;
  install_date: string;
  notes: string;
}

const TEXT_FIELDS = ['location', 'id_number', 'house', 'email', 'notes'] as const;

export const EMPTY_REGISTER_FIELDS: RegisterFieldsForm = {
  location: '', latitude: '', longitude: '', id_number: '', house: '', email: '', install_date: '', notes: '',
};

export function registerFieldsFromCustomer(c: Partial<Customer> | null | undefined): RegisterFieldsForm {
  if (!c) return { ...EMPTY_REGISTER_FIELDS };
  return {
    location: c.location || '',
    latitude: c.latitude != null ? String(c.latitude) : '',
    longitude: c.longitude != null ? String(c.longitude) : '',
    id_number: c.id_number || '',
    house: c.house || '',
    email: c.email || '',
    install_date: c.install_date || '',
    notes: c.notes || '',
  };
}

function parseCoord(value: string, limit: number): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
}

/** Problem with the form, or null. Latitude and longitude go together. */
export function registerFieldsError(form: RegisterFieldsForm): string | null {
  const email = form.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email address';
  const hasLat = form.latitude.trim() !== '';
  const hasLng = form.longitude.trim() !== '';
  if (hasLat !== hasLng) return 'Enter both latitude and longitude, or neither';
  if (hasLat && (parseCoord(form.latitude, 90) === undefined || parseCoord(form.longitude, 180) === undefined)) {
    return 'Latitude must be between -90 and 90, longitude between -180 and 180';
  }
  return null;
}

/** Register payload: only filled fields are sent. */
export function registerFieldsPayload(form: RegisterFieldsForm): CustomerRegisterFieldsInput {
  const out: CustomerRegisterFieldsInput = {};
  for (const f of TEXT_FIELDS) {
    const v = form[f].trim();
    if (v) out[f] = v;
  }
  if (form.install_date) out.install_date = form.install_date;
  const lat = parseCoord(form.latitude, 90);
  const lng = parseCoord(form.longitude, 180);
  if (lat !== undefined && lng !== undefined) {
    out.latitude = lat;
    out.longitude = lng;
  }
  return out;
}

/**
 * Edit payload: only fields that changed. A cleared text field is sent as ''
 * (the backend clears it); a cleared install date as null.
 */
export function registerFieldsChanges(
  form: RegisterFieldsForm,
  customer: Partial<Customer>,
): CustomerRegisterFieldsInput {
  const before = registerFieldsFromCustomer(customer);
  const out: CustomerRegisterFieldsInput = {};
  for (const f of TEXT_FIELDS) {
    if (form[f].trim() !== before[f].trim()) out[f] = form[f].trim();
  }
  if (form.install_date !== before.install_date) out.install_date = form.install_date || null;
  const lat = parseCoord(form.latitude, 90);
  const lng = parseCoord(form.longitude, 180);
  if (lat !== undefined && lng !== undefined && (lat !== customer.latitude || lng !== customer.longitude)) {
    out.latitude = lat;
    out.longitude = lng;
  }
  return out;
}
