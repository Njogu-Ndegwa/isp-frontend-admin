/**
 * Pure helpers for the static-IP customer import
 * (POST /routers/{router_id}/static-customers/import). Kept out of the modal
 * so the request shape and the preview rules can be unit tested.
 */

import type { Plan, StaticCustomerImportOptions, StaticCustomerImportResponse } from './types';

export const STATIC_IMPORT_DEFAULT_TIMEZONE = 'Africa/Nairobi';
export const STATIC_IMPORT_ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'] as const;

export function isAcceptedImportFile(name: string): boolean {
  const lower = name.toLowerCase();
  return STATIC_IMPORT_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Drop unmapped labels (empty select) and anything that isn't a positive plan id. */
export function cleanPlanMapping(mapping: Record<string, number | string | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [label, raw] of Object.entries(mapping)) {
    if (!label.trim()) continue;
    const id = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isInteger(id) && id > 0) out[label] = id;
  }
  return out;
}

/** Multipart body for the import endpoint. Field names follow the backend contract. */
export function buildStaticImportFormData(file: Blob & { name?: string }, options: StaticCustomerImportOptions): FormData {
  const form = new FormData();
  if (file instanceof File) form.append('file', file);
  else form.append('file', file, file.name || 'import.csv');
  form.append('apply', options.apply ? 'true' : 'false');
  form.append('create_missing_plans', options.createMissingPlans ? 'true' : 'false');
  form.append('default_plan_price', String(options.createMissingPlans ? Math.round(options.defaultPlanPrice || 0) : 0));
  const mapping = cleanPlanMapping(options.planMapping || {});
  if (Object.keys(mapping).length > 0) {
    form.append('plan_mapping_json', JSON.stringify(mapping));
  }
  form.append('source_timezone', options.sourceTimezone || STATIC_IMPORT_DEFAULT_TIMEZONE);
  return form;
}

/**
 * Validates the options before a preview/apply is sent. Returns an English
 * message (an i18n key) or null when the options are fine.
 */
export function validateImportOptions(options: { createMissingPlans: boolean; defaultPlanPrice: string | number }): string | null {
  if (!options.createMissingPlans) return null;
  const raw = typeof options.defaultPlanPrice === 'number' ? options.defaultPlanPrice : options.defaultPlanPrice.trim();
  if (raw === '') return 'Enter a price for the new plans';
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) return 'The plan price must be greater than 0';
  if (!Number.isInteger(price)) return 'Use a whole number for the plan price';
  return null;
}

/**
 * Plan labels from the sheet that the backend could not match to a plan, in
 * first-seen order. Labels the backend will create (plans_to_create) are
 * included too so the reseller can map them to an existing plan instead.
 */
export function unmatchedPlanLabels(preview: StaticCustomerImportResponse | null | undefined): string[] {
  if (!preview) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (label: string | null | undefined) => {
    const value = (label || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  for (const row of preview.rows || []) {
    if (row.plan_id == null && row.action !== 'skip') push(row.plan_label);
  }
  for (const plan of preview.plans_to_create || []) push(plan.label);
  return out;
}

/** Labels to show in the mapping UI: what is unmatched now plus what is already mapped. */
export function mappingLabels(preview: StaticCustomerImportResponse | null | undefined, mapping: Record<string, unknown>): string[] {
  const labels = unmatchedPlanLabels(preview);
  for (const label of Object.keys(mapping)) {
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

export function staticIpPlans(plans: Plan[]): Plan[] {
  return plans.filter((plan) => plan.connection_type === 'static_ip');
}

/** Stable key of the options a preview was run with, to tell when it went stale. */
export function importOptionsSignature(input: {
  routerId: string | number;
  fileKey: string;
  createMissingPlans: boolean;
  defaultPlanPrice: string | number;
  planMapping: Record<string, number | string | null | undefined>;
}): string {
  const mapping = cleanPlanMapping(input.planMapping);
  const sorted = Object.keys(mapping).sort().map((k) => [k, mapping[k]]);
  return JSON.stringify([
    String(input.routerId),
    input.fileKey,
    input.createMissingPlans,
    input.createMissingPlans ? String(input.defaultPlanPrice).trim() : '',
    sorted,
  ]);
}

/** The apply button unlocks only for a clean dry run that would create someone. */
export function canApplyImport(preview: StaticCustomerImportResponse | null | undefined): boolean {
  return Boolean(
    preview
    && preview.success
    && preview.dry_run
    && (preview.summary?.to_create ?? 0) > 0
    && (preview.summary?.errors ?? 0) === 0,
  );
}

export function importApplied(result: StaticCustomerImportResponse | null | undefined): boolean {
  return Boolean(result && result.success && result.dry_run === false);
}

/** Filename from a Content-Disposition header, falling back to the given default. */
export function filenameFromDisposition(header: string | null | undefined, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')) || fallback; } catch { /* fall through */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}
