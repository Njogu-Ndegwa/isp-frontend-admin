'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useAlert } from '../../context/AlertContext';
import { formatDateGMT3 } from '../../lib/dateUtils';
import { matchingPreset } from '../../lib/staffEditor';
import type { StaffMember, StaffPermissionCatalog } from '../../lib/types';
import { PageLoader } from '../../components/LoadingSpinner';
import DataTable, { DataTableColumn } from '../../components/DataTable';
import MobileDataCard from '../../components/MobileDataCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import Tabs from '../../components/Tabs';
import StaffPermissionEditor from './StaffPermissionEditor';
import StaffActivity from './StaffActivity';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch (e) {
    console.error('Date error:', e);
    return '-';
  }
};

const inputClass =
  'w-full h-[42px] px-3.5 rounded-xl bg-background-tertiary border border-border text-foreground text-sm placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all';

type FormMode = { kind: 'create' } | { kind: 'edit'; member: StaffMember };

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  permissions: string[];
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', password: '', permissions: [] };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Settings -> Staff (owner only; ClientLayout keeps staff out). */
export default function StaffClient() {
  const t = useT();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'members' | 'activity'>('members');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [catalog, setCatalog] = useState<StaffPermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [removeFor, setRemoveFor] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [list, perms] = await Promise.all([api.listStaff(), api.getStaffPermissionCatalog()]);
      setStaff(Array.isArray(list?.staff) ? list.staff : []);
      setCatalog(perms);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load staff'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const replaceMember = (member: StaffMember) =>
    setStaff((prev) => prev.map((s) => (s.id === member.id ? member : s)));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormMode({ kind: 'create' });
  };

  const openEdit = (member: StaffMember) => {
    setForm({
      name: member.name ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      password: '',
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
    });
    setFormMode({ kind: 'edit', member });
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMode) return;
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email) {
      showAlert('error', t('Name and email are required'));
      return;
    }
    if (formMode.kind === 'create' && form.password.length < 6) {
      showAlert('error', t('Password must be at least 6 characters'));
      return;
    }
    try {
      setSaving(true);
      if (formMode.kind === 'create') {
        const created = await api.createStaff({
          name,
          email,
          ...(phone ? { phone } : {}),
          password: form.password,
          permissions: form.permissions,
        });
        setStaff((prev) => [...prev, created]);
        showAlert('success', t('{name} can now sign in with their email and password', { name: created.name || name }));
      } else {
        const updated = await api.updateStaff(formMode.member.id, {
          name,
          email,
          phone,
          permissions: form.permissions,
        });
        replaceMember(updated);
        showAlert('success', t('Saved. {name} was signed out and must sign in again.', { name: updated.name || name }));
      }
      setFormMode(null);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      showAlert('error', status === 409
        ? t('That email is already used by another account')
        : err instanceof Error ? err.message : t('Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    try {
      setTogglingId(member.id);
      const updated = await api.updateStaff(member.id, { is_active: !member.is_active });
      replaceMember(updated);
      showAlert('success', updated.is_active
        ? t('{name} can sign in again', { name: updated.name })
        : t('{name} was deactivated and signed out', { name: updated.name }));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Failed to save'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    if (resetPassword.length < 6) {
      showAlert('error', t('Password must be at least 6 characters'));
      return;
    }
    try {
      setResetting(true);
      await api.resetStaffPassword(resetFor.id, resetPassword);
      showAlert('success', t('Password changed. {name} was signed out.', { name: resetFor.name }));
      setResetFor(null);
      setResetPassword('');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Failed to reset password'));
    } finally {
      setResetting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeFor) return;
    try {
      setRemoving(true);
      await api.deleteStaff(removeFor.id);
      setStaff((prev) => prev.filter((s) => s.id !== removeFor.id));
      showAlert('success', t('{name} no longer has access', { name: removeFor.name }));
      setRemoveFor(null);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Failed to remove'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error || !catalog) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground-muted mb-4">{error || t('Failed to load staff')}</p>
        <button type="button" onClick={() => { setLoading(true); void load(); }} className="btn-primary">
          {t('Try Again')}
        </button>
      </div>
    );
  }

  const permissionSummary = (member: StaffMember) => {
    const perms = Array.isArray(member.permissions) ? member.permissions : [];
    const preset = matchingPreset(perms, catalog.presets);
    if (preset) return t(preset.label);
    if (perms.length === 0) return t('No access');
    return t('{count} permissions', { count: perms.length });
  };

  const hasSensitive = (member: StaffMember) =>
    (member.permissions ?? []).some((key) => catalog.permissions.find((p) => p.key === key)?.sensitive);

  const columns: DataTableColumn[] = [
    { key: 'name', label: t('Name') },
    { key: 'permissions', label: t('Access') },
    { key: 'status', label: t('Status') },
    { key: 'last_login', label: t('Last login'), className: 'whitespace-nowrap' },
    { key: 'actions', label: t('Actions') },
  ];

  const actionButtons = (member: StaffMember) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openEdit(member); }}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors touch-manipulation"
      >
        {t('Edit')}
      </button>
      <button
        type="button"
        disabled={togglingId === member.id}
        onClick={(e) => { e.stopPropagation(); void toggleActive(member); }}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors touch-manipulation disabled:opacity-50"
      >
        {member.is_active ? t('Deactivate') : t('Activate')}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setResetPassword(''); setResetFor(member); }}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors touch-manipulation"
      >
        {t('Reset password')}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setRemoveFor(member); }}
        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-danger/10 transition-colors touch-manipulation"
      >
        {t('Remove')}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('Staff')}</h2>
          <p className="text-sm text-foreground-muted mt-0.5">
            {t('Give technicians and cashiers their own login, with only the access they need.')}
          </p>
        </div>
        {tab === 'members' && (
          <button type="button" onClick={openCreate} className="btn-primary px-4 py-2 text-sm flex-shrink-0 self-start">
            {t('Add staff')}
          </button>
        )}
      </div>

      <div className="p-3 rounded-xl bg-info/10 border border-info/20 text-xs text-foreground">
        {t('Changing permissions, deactivating, resetting a password or removing a staff member signs them out everywhere immediately.')}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'members', label: t('Staff members'), count: staff.length },
          { value: 'activity', label: t('Activity') },
        ]}
      />

      {tab === 'activity' ? (
        <StaffActivity staff={staff} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={staff}
            rowKey={(member) => member.id}
            emptyState={{ message: t('No staff yet. Add one to give your team their own login.') }}
            renderCell={(member, key) => {
              if (key === 'name') {
                return (
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name || '-'}</p>
                    <p className="text-xs text-foreground-muted truncate">{member.email}</p>
                    {member.phone && <p className="text-xs text-foreground-muted truncate">{member.phone}</p>}
                  </div>
                );
              }
              if (key === 'permissions') {
                return (
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                    {permissionSummary(member)}
                    {hasSensitive(member) && <span className="badge badge-warning text-[10px]">{t('Sensitive')}</span>}
                  </span>
                );
              }
              if (key === 'status') {
                return (
                  <span className={`badge ${member.is_active ? 'badge-success' : 'badge-neutral'} text-[11px]`}>
                    {member.is_active ? t('Active') : t('Inactive')}
                  </span>
                );
              }
              if (key === 'last_login') {
                return <span className="text-sm text-foreground-muted">{member.last_login_at ? formatSafeDate(member.last_login_at) : t('Never')}</span>;
              }
              if (key === 'actions') return actionButtons(member);
              return null;
            }}
          />

          <div className="md:hidden space-y-2">
            {staff.length === 0 ? (
              <div className="card p-6 text-center text-sm text-foreground-muted">
                {t('No staff yet. Add one to give your team their own login.')}
              </div>
            ) : (
              staff.map((member) => (
                <MobileDataCard
                  key={member.id}
                  id={member.id}
                  title={member.name || member.email}
                  subtitle={member.email}
                  avatar={{ text: (member.name || member.email || '?').charAt(0).toUpperCase(), color: member.is_active ? 'primary' : 'secondary' }}
                  status={{ label: member.is_active ? t('Active') : t('Inactive'), variant: member.is_active ? 'success' : 'neutral' }}
                  fields={[
                    ...(member.phone ? [{ label: t('Phone'), value: member.phone }] : []),
                    { label: t('Access'), value: permissionSummary(member) },
                    { label: t('Last login'), value: member.last_login_at ? formatSafeDate(member.last_login_at) : t('Never') },
                  ]}
                  expandableContent={actionButtons(member)}
                />
              ))
            )}
          </div>
        </>
      )}

      {formMode && (
        <Modal title={formMode.kind === 'create' ? t('Add staff') : t('Edit {name}', { name: formMode.member.name })} onClose={closeForm}>
          <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-name">{t('Name')}</label>
              <input id="staff-name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-email">{t('Email')}</label>
              <input id="staff-email" type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" />
              <p className="text-xs text-foreground-muted mt-1">{t('They sign in with this email on the normal login page.')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-phone">{t('Phone (optional)')}</label>
              <input id="staff-phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" />
            </div>
            {formMode.kind === 'create' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-password">{t('Initial password')}</label>
                <input
                  id="staff-password"
                  type="password"
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore
                />
                <p className="text-xs text-foreground-muted mt-1">{t('At least 6 characters. Share it with them privately.')}</p>
              </div>
            )}
            <div>
              <p className="block text-sm font-medium text-foreground mb-2">{t('Permissions')}</p>
              <StaffPermissionEditor
                catalog={catalog}
                value={form.permissions}
                onChange={(permissions) => setForm((prev) => ({ ...prev, permissions }))}
                disabled={saving}
              />
            </div>
            {formMode.kind === 'edit' && (
              <p className="text-xs text-foreground-muted">{t('Saving signs this staff member out. They sign in again with the same password.')}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors disabled:opacity-50">
                {t('Cancel')}
              </button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                {saving ? t('Saving...') : formMode.kind === 'create' ? t('Add staff') : t('Save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetFor && (
        <Modal title={t('Reset password for {name}', { name: resetFor.name })} onClose={() => { if (!resetting) setResetFor(null); }}>
          <form onSubmit={handleResetPassword} autoComplete="off" className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="staff-reset-password">{t('New password')}</label>
              <input
                id="staff-reset-password"
                type="password"
                className={inputClass}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore
              />
              <p className="text-xs text-foreground-muted mt-1">{t('They are signed out now and sign in with the new password.')}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setResetFor(null)} disabled={resetting} className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors disabled:opacity-50">
                {t('Cancel')}
              </button>
              <button type="submit" disabled={resetting} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                {resetting ? t('Saving...') : t('Reset password')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!removeFor}
        onClose={() => { if (!removing) setRemoveFor(null); }}
        onConfirm={() => void handleRemove()}
        loading={removing}
        variant="danger"
        title={t('Remove {name}?', { name: removeFor?.name ?? '' })}
        message={t('They lose access and are signed out immediately. Their activity history is kept.')}
        confirmLabel={t('Remove')}
        cancelLabel={t('Cancel')}
      />
    </div>
  );
}
