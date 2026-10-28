'use client';

import { useT } from '../../lib/i18n';
import type { StaffPermissionCatalog } from '../../lib/types';
import { applyPreset, groupPermissions, matchingPreset, togglePermission } from '../../lib/staffEditor';

/**
 * Grouped permission checkboxes with preset quick-picks. A preset replaces
 * the selection. Sensitive permissions (money, payout and account settings)
 * are marked and never pre-selected.
 */
export default function StaffPermissionEditor({
  catalog,
  value,
  onChange,
  disabled = false,
}: {
  catalog: StaffPermissionCatalog;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const groups = groupPermissions(catalog);
  const activePreset = matchingPreset(value, catalog.presets);

  return (
    <div className="space-y-4">
      {catalog.presets?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground-muted mb-2">{t('Quick pick (replaces the selection)')}</p>
          <div className="flex flex-wrap gap-2">
            {catalog.presets.map((preset) => {
              const active = activePreset?.key === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(applyPreset(preset, catalog))}
                  title={preset.description ? t(preset.description) : undefined}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors touch-manipulation disabled:opacity-50 ${
                    active
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-border text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
                  }`}
                >
                  {t(preset.label)}
                </button>
              );
            })}
            <button
              type="button"
              disabled={disabled || value.length === 0}
              onClick={() => onChange([])}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors touch-manipulation disabled:opacity-50"
            >
              {t('Clear')}
            </button>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <fieldset key={group.group} className="space-y-1.5">
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-foreground-muted/70 mb-1">
            {t(group.group)}
          </legend>
          {group.permissions.map((permission) => {
            const checked = value.includes(permission.key);
            return (
              <label
                key={permission.key}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  permission.sensitive
                    ? checked
                      ? 'border-warning/50 bg-warning/10'
                      : 'border-warning/25 hover:bg-warning/5'
                    : checked
                      ? 'border-accent-primary/40 bg-accent-primary/5'
                      : 'border-border hover:bg-background-tertiary'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-amber-500"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(togglePermission(value, permission.key))}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{t(permission.label)}</span>
                    {permission.sensitive && (
                      <span className="badge badge-warning text-[10px]">{t('Sensitive')}</span>
                    )}
                  </span>
                  {permission.description && (
                    <span className="block text-xs text-foreground-muted mt-0.5">{t(permission.description)}</span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}

      {value.some((key) => catalog.permissions.find((p) => p.key === key)?.sensitive) && (
        <p className="text-xs text-warning">
          {t('Sensitive permissions let this person move money or change where payments go. Only grant them to someone you fully trust.')}
        </p>
      )}
    </div>
  );
}
