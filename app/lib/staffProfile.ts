/**
 * Pure helpers for the staff member's own profile page (no React, unit tested).
 */
import { DEMO_STAFF_CATALOG } from './staffCatalog';

const LABELS: Record<string, string> = Object.fromEntries(
  DEMO_STAFF_CATALOG.permissions.map((p) => [p.key, p.label]),
);

/** Human labels for a staff member's permissions, in catalog order; unknown
 *  keys (a newer backend) are shown as-is at the end. */
export function staffPermissionLabels(permissions: readonly string[]): string[] {
  const granted = new Set(permissions);
  const known = DEMO_STAFF_CATALOG.permissions.filter((p) => granted.has(p.key)).map((p) => p.label);
  const unknown = permissions.filter((key) => !(key in LABELS) && key !== 'staff.manage');
  return [...known, ...unknown];
}

/** The first problem with a change-password form, or null when it is fine.
 *  Mirrors the backend rules (6+ characters, at most 72 bytes, must change). */
export function validateNewPassword(form: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): string | null {
  const { current_password, new_password, confirm_password } = form;
  if (!current_password || !new_password || !confirm_password) return 'Please fill in all password fields';
  if (new_password.length < 6) return 'New password must be at least 6 characters';
  if (new TextEncoder().encode(new_password).length > 72) return 'New password is too long';
  if (new_password === current_password) return 'New password must be different from the current password';
  if (new_password !== confirm_password) return 'New passwords do not match';
  return null;
}
