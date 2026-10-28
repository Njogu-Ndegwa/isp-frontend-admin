/**
 * Pure helpers for the Settings -> Staff permission editor.
 */
import type { StaffPermissionCatalog, StaffPermissionDef, StaffPreset } from './types';
import { OWNER_ONLY_PERMISSIONS } from './permissions';

export interface PermissionGroup {
  group: string;
  permissions: StaffPermissionDef[];
}

/** Permissions an owner may grant: the catalog minus owner-only keys. */
export function grantablePermissions(catalog: StaffPermissionCatalog | null | undefined): StaffPermissionDef[] {
  if (!catalog?.permissions) return [];
  const ownerOnly = new Set([...(catalog.owner_only ?? []), ...OWNER_ONLY_PERMISSIONS]);
  return catalog.permissions.filter((p) => !ownerOnly.has(p.key));
}

/** Grantable permissions grouped by `group`, keeping the catalog's order. */
export function groupPermissions(catalog: StaffPermissionCatalog | null | undefined): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  for (const permission of grantablePermissions(catalog)) {
    const name = permission.group || 'Other';
    let group = groups.find((g) => g.group === name);
    if (!group) {
      group = { group: name, permissions: [] };
      groups.push(group);
    }
    group.permissions.push(permission);
  }
  return groups;
}

/** A preset replaces the selection (owner-only keys are never kept). */
export function applyPreset(preset: StaffPreset, catalog?: StaffPermissionCatalog | null): string[] {
  const ownerOnly = new Set([...(catalog?.owner_only ?? []), ...OWNER_ONLY_PERMISSIONS]);
  return Array.from(new Set(preset.permissions.filter((key) => !ownerOnly.has(key))));
}

export function togglePermission(selected: readonly string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
}

/** The preset whose permissions exactly match the selection, if any. */
export function matchingPreset(
  selected: readonly string[],
  presets: readonly StaffPreset[] | null | undefined,
): StaffPreset | undefined {
  if (!presets) return undefined;
  const chosen = new Set(selected);
  return presets.find((preset) => {
    const keys = new Set(preset.permissions);
    return keys.size === chosen.size && [...keys].every((k) => chosen.has(k));
  });
}

/** Result label for an activity row's HTTP status. */
export function activityResult(statusCode: number | null | undefined): 'success' | 'denied' | 'failed' | 'unknown' {
  if (statusCode === null || statusCode === undefined) return 'unknown';
  if (statusCode >= 200 && statusCode < 400) return 'success';
  if (statusCode === 401 || statusCode === 403) return 'denied';
  return 'failed';
}
