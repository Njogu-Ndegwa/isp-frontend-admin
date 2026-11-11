'use client';

import type { RegisterFieldsForm } from '../lib/customerRegister';

/** Optional register fields (ID number, house, email, install date, location, notes). */
export default function CustomerRegisterFields({
  value,
  onChange,
  idPrefix = 'reg',
}: {
  value: RegisterFieldsForm;
  onChange: (next: RegisterFieldsForm) => void;
  idPrefix?: string;
}) {
  const set = (field: keyof RegisterFieldsForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [field]: e.target.value });
  const label = 'block text-sm font-medium text-foreground-muted mb-1.5';

  return (
    <div className="pt-4 border-t border-border" data-testid="customer-register-fields">
      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-1">Customer details</h3>
      <p className="text-xs text-foreground-muted mb-4">Optional. Kept on file for your records.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${idPrefix}-id-number`} className={label}>ID number</label>
            <input id={`${idPrefix}-id-number`} type="text" maxLength={50} value={value.id_number} onChange={set('id_number')} className="input" placeholder="National ID / passport" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-email`} className={label}>Email</label>
            <input id={`${idPrefix}-email`} type="email" maxLength={255} value={value.email} onChange={set('email')} className="input" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-house`} className={label}>House / building</label>
            <input id={`${idPrefix}-house`} type="text" maxLength={120} value={value.house} onChange={set('house')} className="input" placeholder="e.g. Block C, House 4" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-install-date`} className={label}>Install date</label>
            <input id={`${idPrefix}-install-date`} type="date" value={value.install_date} onChange={set('install_date')} className="input" />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-location`} className={label}>Location</label>
          <input id={`${idPrefix}-location`} type="text" maxLength={255} value={value.location} onChange={set('location')} className="input" placeholder="Area, street or landmark" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${idPrefix}-lat`} className={label}>Latitude</label>
            <input id={`${idPrefix}-lat`} type="text" inputMode="decimal" value={value.latitude} onChange={set('latitude')} className="input font-mono" placeholder="-1.2921" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-lng`} className={label}>Longitude</label>
            <input id={`${idPrefix}-lng`} type="text" inputMode="decimal" value={value.longitude} onChange={set('longitude')} className="input font-mono" placeholder="36.8219" />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-notes`} className={label}>Notes</label>
          <textarea id={`${idPrefix}-notes`} rows={3} maxLength={2000} value={value.notes} onChange={set('notes')} className="input" placeholder="Anything to remember about this installation" />
        </div>
      </div>
    </div>
  );
}
