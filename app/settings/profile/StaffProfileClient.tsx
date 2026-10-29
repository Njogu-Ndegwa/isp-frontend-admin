'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../lib/i18n';
import { staffBusinessName } from '../../lib/permissions';
import { staffPermissionLabels, validateNewPassword } from '../../lib/staffProfile';

/**
 * Profile for a staff sub-user: who they are, what the owner lets them do,
 * change their own password, log out. The owner's business details live on
 * the owner's profile and are not editable here.
 */
export default function StaffProfileClient() {
  const { user, logout, setSessionToken } = useAuth();
  const { showAlert } = useAlert();
  const t = useT();
  const staff = user?.staff ?? null;

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!staff) return null;

  const business = staffBusinessName(user);
  const labels = staffPermissionLabels(staff.permissions ?? []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateNewPassword(form);
    if (problem) {
      showAlert('error', t(problem));
      return;
    }
    try {
      setSaving(true);
      const result = await api.changeOwnStaffPassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      // Other sessions were signed out; keep this tab on the reissued token.
      if (result?.access_token) setSessionToken(result.access_token);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setShow(false);
      showAlert('success', t('Password changed. You were signed out on your other devices.'));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof form; label: string; autoComplete: string }[] = [
    { key: 'current_password', label: t('Current Password'), autoComplete: 'current-password' },
    { key: 'new_password', label: t('New Password'), autoComplete: 'new-password' },
    { key: 'confirm_password', label: t('Confirm New Password'), autoComplete: 'new-password' },
  ];

  return (
    <div className="space-y-6" data-testid="staff-profile">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('My profile')}</h2>
        <p className="text-xs text-foreground-muted mt-0.5">
          {business ? t('Staff of {business}', { business }) : t('Staff account')}
        </p>
      </div>

      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('My details')}</h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            {t('Only the account owner can change these.')}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-500/20">
              {(staff.name || staff.email)?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate" data-testid="staff-profile-name">{staff.name || '-'}</h3>
              <p className="text-sm text-foreground-muted truncate">{staff.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: t('Name'), value: staff.name },
              { label: t('Email'), value: staff.email },
              { label: t('Phone'), value: staff.phone },
              { label: t('Business'), value: business },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="text-xs font-medium text-foreground-muted">{f.label}</span>
                <span className="text-sm text-foreground font-medium truncate">{f.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('What I can do')}</h2>
          <p className="text-xs text-foreground-muted mt-0.5">{t('Ask the account owner if you need more access.')}</p>
        </div>
        <div className="p-5">
          {labels.length === 0 ? (
            <p className="text-sm text-foreground-muted">{t('No pages assigned yet')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2" data-testid="staff-profile-permissions">
              {labels.map((label) => (
                <li key={label} className="px-2.5 py-1 rounded-lg bg-background-tertiary text-xs font-medium text-foreground">
                  {t(label)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('Change Password')}</h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            {t('You stay signed in here; your other devices are signed out.')}
          </p>
        </div>
        <form className="p-5 space-y-3" onSubmit={handleChangePassword}>
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`staff-${f.key}`} className="block text-xs font-medium text-foreground-muted mb-1.5">{f.label}</label>
              <input
                id={`staff-${f.key}`}
                type={show ? 'text' : 'password'}
                className="input"
                autoComplete={f.autoComplete}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-xs text-foreground-muted">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            {t('Show passwords')}
          </label>
          <button type="submit" disabled={saving} className="btn-primary w-full mt-1">
            {saving ? t('Changing Password...') : t('Change Password')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t('Log out')}</p>
            <p className="text-xs text-foreground-muted mt-0.5">{t('Sign out of this device.')}</p>
          </div>
          <button
            type="button"
            onClick={() => { logout(); window.location.assign('/login'); }}
            className="btn-secondary text-sm px-4 py-2 flex-shrink-0"
            data-testid="staff-profile-logout"
          >
            {t('Log out')}
          </button>
        </div>
      </section>
    </div>
  );
}
