'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { UserProfile, UpdateProfileRequest } from '../../lib/types';
import { PageLoader } from '../../components/LoadingSpinner';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateGMT3 } from '../../lib/dateUtils';

const formatSafeDate = (dateStr: string | undefined, full = false): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, full
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { logout, updateUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpdateProfileRequest>({});

  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const startEditing = () => {
    if (!profile) return;
    setForm({
      email: profile.email,
      organization_name: profile.organization_name,
      business_name: profile.business_name,
      support_phone: profile.support_phone,
      mpesa_shortcode: profile.mpesa_shortcode,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm({});
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    const changed: UpdateProfileRequest = {};
    if (form.email !== profile.email) changed.email = form.email;
    if (form.organization_name !== profile.organization_name) changed.organization_name = form.organization_name;
    if (form.business_name !== profile.business_name) changed.business_name = form.business_name;
    if (form.support_phone !== profile.support_phone) changed.support_phone = form.support_phone;
    if (form.mpesa_shortcode !== profile.mpesa_shortcode) changed.mpesa_shortcode = form.mpesa_shortcode;

    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const updated = await api.updateProfile(changed);
      setProfile(updated);
      updateUser({ email: updated.email, organization_name: updated.organization_name });
      setEditing(false);
      showAlert('success', 'Profile updated successfully');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const { current_password, new_password, confirm_password } = passwordForm;

    if (!current_password || !new_password || !confirm_password) {
      showAlert('error', 'Please fill in all password fields');
      return;
    }
    if (new_password.length < 6) {
      showAlert('error', 'New password must be at least 6 characters');
      return;
    }
    if (new_password === current_password) {
      showAlert('error', 'New password must be different from the current password');
      return;
    }
    if (new_password !== confirm_password) {
      showAlert('error', 'New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await api.changePassword({ current_password, new_password });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      showAlert('success', 'Password changed successfully');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await api.deleteAccount();
      showAlert('success', 'Account deleted');
      logout();
      router.push('/login');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-12 h-12 text-danger mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-foreground-muted mb-4">{error}</p>
        <button onClick={loadProfile} className="btn-primary">Try Again</button>
      </div>
    );
  }

  if (!profile) return null;

  const readOnlyFields = [
    { label: 'User Code', value: String(profile.user_code) },
    { label: 'Role', value: profile.role.charAt(0).toUpperCase() + profile.role.slice(1) },
    { label: 'Member Since', value: formatSafeDate(profile.created_at) },
    { label: 'Last Login', value: formatSafeDate(profile.last_login_at, true) },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Section header -- visible on mobile where layout sidebar is hidden */}
      <div className="md:hidden">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <p className="text-xs text-foreground-muted mt-0.5">Manage your account and business details</p>
      </div>

      {/* Profile Information */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Profile Information</h2>
            <p className="text-xs text-foreground-muted mt-0.5">Your account and business details</p>
          </div>
          {!editing && (
            <button onClick={startEditing} className="btn-secondary text-xs px-3 py-1.5">
              Edit
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-amber-500/20">
              {(profile.organization_name || profile.email)?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">{profile.organization_name || '-'}</h3>
              <p className="text-sm text-foreground-muted truncate">{profile.email}</p>
            </div>
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-3">
            {readOnlyFields.map((f) => (
              <div key={f.label} className="p-3 rounded-xl bg-background-tertiary/50">
                <div className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-sm font-medium text-foreground">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email || ''}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Organization Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.organization_name || ''}
                  onChange={(e) => setForm((p) => ({ ...p, organization_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Business Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.business_name || ''}
                  onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">Support Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={form.support_phone || ''}
                  onChange={(e) => setForm((p) => ({ ...p, support_phone: e.target.value }))}
                  placeholder="+254712345678"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">M-Pesa Shortcode</label>
                <input
                  type="text"
                  className="input"
                  value={form.mpesa_shortcode || ''}
                  onChange={(e) => setForm((p) => ({ ...p, mpesa_shortcode: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={cancelEditing} className="btn-secondary flex-1" disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSaveProfile} className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {[
                { label: 'Email', value: profile.email },
                { label: 'Organization Name', value: profile.organization_name },
                { label: 'Business Name', value: profile.business_name },
                { label: 'Support Phone', value: profile.support_phone },
                { label: 'M-Pesa Shortcode', value: profile.mpesa_shortcode },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs font-medium text-foreground-muted">{f.label}</span>
                  <span className="text-sm text-foreground font-medium">{f.value || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Change Password */}
      <section className="rounded-2xl bg-background-secondary border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Update your account password</p>
        </div>
        <div className="p-5 space-y-3">
          {(['current_password', 'new_password', 'confirm_password'] as const).map((field) => {
            const labels: Record<string, string> = {
              current_password: 'Current Password',
              new_password: 'New Password',
              confirm_password: 'Confirm New Password',
            };
            const showKey = field === 'current_password' ? 'current' : field === 'new_password' ? 'new' : 'confirm';
            return (
              <div key={field}>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">{labels[field]}</label>
                <div className="relative">
                  <input
                    type={showPasswords[showKey] ? 'text' : 'password'}
                    className="input pr-10"
                    value={passwordForm[field]}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                    onClick={() => setShowPasswords((p) => ({ ...p, [showKey]: !p[showKey] }))}
                  >
                    {showPasswords[showKey] ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="btn-primary w-full mt-1"
          >
            {changingPassword ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl bg-background-secondary border border-danger/30 overflow-hidden">
        <div className="p-5 border-b border-danger/20">
          <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Irreversible actions on your account</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-foreground-muted mt-0.5">
                Permanently remove your account and all associated data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger text-sm px-4 py-2 flex-shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteModal(false)} />
          <div className="relative w-full sm:max-w-md bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center text-danger flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Delete Account</h2>
                  <p className="text-xs text-foreground-muted">This action is permanent and cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-danger/5 border border-danger/20">
                <p className="text-sm text-danger font-medium mb-1">Warning</p>
                <p className="text-xs text-foreground-muted">
                  Deleting your account will permanently remove all your data, including customers, plans, transactions, and configuration. This action cannot be reversed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                  Type <span className="font-bold text-foreground">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  className="input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-background-tertiary text-foreground-muted font-medium text-sm hover:text-foreground transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white font-medium text-sm hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
