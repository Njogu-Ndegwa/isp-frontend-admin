/**
 * What an assistant form card sends on Confirm, and whether Confirm may be tapped yet.
 * Kept apart from ActionCard so the rules can be tested without a browser.
 */
import { fieldApplies, setChanges, type FormField } from './assistant';

export type FormValue = string | boolean | string[];
export type FormValues = Record<string, FormValue>;

/** One field's value the way its input holds it: a switch is true/false, a list of ticks an array, the rest text. */
export function inputValue(f: FormField, raw: unknown): FormValue {
  if (f.kind === 'boolean') return raw === true;
  if (f.kind === 'list') {
    const items = Array.isArray(raw) ? raw.map(String) : [];
    return f.options?.length ? items : items.join(', ');
  }
  return raw === undefined || raw === null ? '' : String(raw);
}

export const initialValues = (form: FormField[]): FormValues =>
  Object.fromEntries(form.map((f): [string, FormValue] => [f.name, inputValue(f, f.value)]));

export const isEmpty = (v: FormValue | undefined) =>
  v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/** The field the card was opened for ("add her phone"), if the assistant named one. */
export const purposeField = (form: FormField[]): FormField | undefined => form.find((f) => f.purpose);

function plain(f: FormField, v: FormValue | undefined): string {
  if (v === undefined) return '';
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return JSON.stringify([...v].map((x) => x.trim()).filter(Boolean).sort());
  const text = v.trim();
  if (f.format === 'phone') return text.replace(/[\s().-]/g, '');
  return text;
}

/**
 * Confirm waits until the purpose field holds something, and something other than what
 * the record had: a rename with the old name, or a phone left blank, is not ready.
 */
export function purposeReady(form: FormField[], values: FormValues): boolean {
  const f = purposeField(form);
  if (!f) return true;
  const now = values[f.name];
  if (f.kind !== 'boolean' && isEmpty(now)) return false;
  return plain(f, now) !== plain(f, inputValue(f, f.original));
}

/**
 * The values sent on Confirm: every field the card offered a value for, and any field the
 * person changed (typed into a field that opened blank is sent too). Another kind's fields
 * are not sent; a set of ticks sends only what was ticked and unticked.
 */
export function valuesToSend(form: FormField[], values: FormValues, opened: FormValues): Record<string, unknown> {
  const live = form.filter((f) => fieldApplies(f, values, form));
  const sent = live.filter((f) => f.value !== undefined || JSON.stringify(values[f.name]) !== JSON.stringify(opened[f.name]));
  return Object.fromEntries(sent.map((f) => {
    const v = values[f.name];
    if (f.changes && f.baseline && Array.isArray(v)) return [f.name, setChanges(f.baseline, v)];
    return [f.name, v];
  }));
}

/** Required fields of the chosen kind still empty: marked, and nothing is sent. */
export const missingFields = (form: FormField[], values: FormValues): Set<string> =>
  new Set(form.filter((f) => fieldApplies(f, values, form) && f.required && isEmpty(values[f.name])).map((f) => f.name));
