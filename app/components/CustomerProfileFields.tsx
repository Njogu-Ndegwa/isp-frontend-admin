'use client';

import { PROFILE_FIELDS, type CustomerProfileForm, type ProfileField } from '../lib/customerProfile';
import { useT } from '../lib/i18n';

interface Props {
  value: CustomerProfileForm;
  onChange: (field: ProfileField, value: string) => void;
  /** Prefix for input ids, so two forms on one page never share an id. */
  idPrefix?: string;
  /**
   * Edit form only: the full ID / passport number could not be loaded. The
   * field shows the masked number read-only instead of an empty box that
   * would look like "no ID".
   */
  nationalIdMasked?: string | null;
  nationalIdUnavailable?: boolean;
}

/**
 * The optional register details (ID / passport, email, alternative phone,
 * house / unit, building / estate, installation date, notes). Used by the
 * register form and the customer page, for hotspot, PPPoE and static-IP
 * customers alike.
 */
export default function CustomerProfileFields({
  value,
  onChange,
  idPrefix = 'profile',
  nationalIdMasked,
  nationalIdUnavailable = false,
}: Props) {
  const t = useT();
  return (
    <div className="space-y-4" data-testid="customer-profile-fields">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROFILE_FIELDS.map((def) => {
          const id = `${idPrefix}_${def.field}`;
          const wide = def.type === 'textarea';
          const lockedId = def.field === 'national_id' && nationalIdUnavailable;
          return (
            <div key={def.field} className={wide ? 'sm:col-span-2' : undefined}>
              <label htmlFor={id} className="block text-sm font-medium text-foreground-muted mb-1.5">
                {t(def.label)}
              </label>
              {wide ? (
                <textarea
                  id={id}
                  value={value[def.field]}
                  onChange={(e) => onChange(def.field, e.target.value)}
                  className="input min-h-[80px]"
                  placeholder={def.placeholder ? t(def.placeholder) : undefined}
                  maxLength={def.maxLength}
                  rows={3}
                />
              ) : (
                <input
                  id={id}
                  type={def.type}
                  value={lockedId ? (nationalIdMasked || '') : value[def.field]}
                  onChange={(e) => onChange(def.field, e.target.value)}
                  className={`input${def.field === 'national_id' ? ' font-mono' : ''}`}
                  placeholder={def.placeholder}
                  maxLength={def.maxLength}
                  readOnly={lockedId}
                  autoComplete="off"
                  inputMode={def.type === 'tel' ? 'tel' : undefined}
                />
              )}
              {def.field === 'national_id' && (
                <p className="mt-1 text-xs text-foreground-muted">
                  {lockedId
                    ? t('Could not load the full number. Reload the page to change it.')
                    : t('Shown in full only here. Lists and exports show the last 3 characters.')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
