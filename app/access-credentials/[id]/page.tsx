'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { AccessCredential, UpdateAccessCredentialRequest, Router as RouterType } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDateGMT3 } from '../../lib/dateUtils';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

function safeFormatDate(d: string | null | undefined): string {
  try {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(d, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function formatRate(bps: number | null | undefined): string {
  if (!bps) return '-';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  return `${bps} bps`;
}

export default function AccessCredentialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useAlert();
  const id = Number(params.id);

  const [credential, setCredential] = useState<AccessCredential | null>(null);
  const [routers, setRouters] = useState<RouterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [forceLogoutConfirm, setForceLogoutConfirm] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState<UpdateAccessCredentialRequest>({});

  const load = useCallback(async (reveal = false) => {
    try {
      setLoading(true);
      const data = await api.getAccessCredential(id, reveal);
      setCredential(data);
      setForm({
        rate_limit: data.rate_limit ?? '',
        data_cap_mb: data.data_cap_mb ?? null,
        label: data.label ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credential');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.getRouters().then(setRouters).catch(() => {});
  }, [load]);

  const handleReveal = async () => {
    try {
      setActionLoading(true);
      const data = await api.getAccessCredential(id, true);
      setCredential(data);
      setShowPassword(true);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to reveal password');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showAlert('success', `${label} copied`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) return;
    try {
      setSaving(true);
      const payload: UpdateAccessCredentialRequest = {};

      const formRate = (form.rate_limit ?? '').toString().trim();
      const currentRate = credential.rate_limit ?? '';
      if (formRate !== currentRate) {
        if (formRate === '') {
          payload.clear_rate_limit = true;
        } else {
          payload.rate_limit = formRate;
        }
      }

      const formCap = form.data_cap_mb;
      if ((formCap ?? null) !== (credential.data_cap_mb ?? null)) {
        if (formCap == null) {
          payload.clear_data_cap = true;
        } else {
          payload.data_cap_mb = formCap;
        }
      }

      const formLabel = (form.label ?? '').toString();
      const currentLabel = credential.label ?? '';
      if (formLabel !== currentLabel) {
        if (formLabel === '') {
          payload.clear_label = true;
        } else {
          payload.label = formLabel;
        }
      }

      if (Object.keys(payload).length === 0) {
        showAlert('info', 'No changes to save');
        return;
      }

      const updated = await api.updateAccessCredential(id, payload);
      setCredential(updated);
      setForm({
        rate_limit: updated.rate_limit ?? '',
        data_cap_mb: updated.data_cap_mb ?? null,
        label: updated.label ?? '',
      });
      showAlert('success', 'Credential updated');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    try {
      setActionLoading(true);
      const updated = await api.rotateAccessCredentialPassword(id);
      setCredential(updated);
      setShowPassword(true);
      setRotateConfirm(false);
      showAlert('success', 'Password rotated');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to rotate password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setActionLoading(true);
      const updated = await api.revokeAccessCredential(id);
      setCredential(updated);
      setRevokeConfirm(false);
      showAlert('success', 'Credential revoked');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to revoke');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setActionLoading(true);
      const updated = await api.restoreAccessCredential(id);
      setCredential(updated);
      setRestoreConfirm(false);
      showAlert('success', 'Credential restored');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceLogout = async () => {
    try {
      setActionLoading(true);
      const updated = await api.forceLogoutAccessCredential(id);
      setCredential(updated);
      setForceLogoutConfirm(false);
      showAlert('success', 'Device logged out');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to force-logout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await api.deleteAccessCredential(id);
      showAlert('success', 'Credential deleted');
      router.push('/access-credentials');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to delete');
      setActionLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  if (error || !credential) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">{error || 'Credential not found'}</h2>
          <Link href="/access-credentials" className="btn-primary mt-4 inline-block">Back</Link>
        </div>
      </div>
    );
  }

  const routerName = routers.find((r) => r.id === credential.router_id)?.name || `Router #${credential.router_id}`;
  const isRevoked = credential.status === 'revoked';
  const inUse = credential.status === 'active' && !!credential.bound_mac_address;

  return (
    <div>
      <Header
        title={credential.username}
        subtitle={credential.label || routerName}
        backHref="/access-credentials"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status banner */}
        <div className={`card p-4 flex items-center gap-3 ${
          isRevoked ? 'border-danger/30 bg-danger/5'
          : inUse ? 'border-info/30 bg-info/5'
          : 'border-success/30 bg-success/5'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            isRevoked ? 'bg-danger' : inUse ? 'bg-info animate-pulse' : 'bg-success'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">
              {isRevoked ? 'Revoked' : inUse ? 'In use' : 'Available'}
            </p>
            {inUse && (
              <p className="text-xs text-foreground-muted">
                Bound to {credential.bound_mac_address}{credential.last_seen_ip ? ` · ${credential.last_seen_ip}` : ''}
              </p>
            )}
            {!inUse && credential.status === 'active' && (
              <p className="text-xs text-foreground-muted">Idle — no device currently bound</p>
            )}
            {isRevoked && credential.revoked_at && (
              <p className="text-xs text-foreground-muted">Revoked {safeFormatDate(credential.revoked_at)}</p>
            )}
          </div>
        </div>

        {/* Credentials box */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Credentials</h3>

          <div className="bg-background-tertiary rounded-lg p-3">
            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Username</label>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-sm text-foreground">{credential.username}</span>
              <button onClick={() => copyToClipboard(credential.username, 'Username')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="bg-background-tertiary rounded-lg p-3">
            <label className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Password</label>
            <div className="flex items-center justify-between mt-1 gap-2">
              {showPassword && credential.password ? (
                <span className="font-mono text-sm text-foreground break-all">{credential.password}</span>
              ) : (
                <span className="font-mono text-sm text-foreground-muted">••••••••</span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {showPassword && credential.password ? (
                  <>
                    <button onClick={() => setShowPassword(false)} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground" title="Hide">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" />
                      </svg>
                    </button>
                    <button onClick={() => copyToClipboard(credential.password!, 'Password')} className="p-1.5 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-foreground" title="Copy">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReveal}
                    disabled={actionLoading}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-background-secondary hover:bg-background text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {actionLoading ? '…' : 'Reveal'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => setRotateConfirm(true)}
              disabled={actionLoading || isRevoked}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rotate Password
            </button>
            {inUse && (
              <button
                onClick={() => setForceLogoutConfirm(true)}
                disabled={actionLoading}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Force Logout
              </button>
            )}
            {isRevoked ? (
              <button
                onClick={() => setRestoreConfirm(true)}
                disabled={actionLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore
              </button>
            ) : (
              <button
                onClick={() => setRevokeConfirm(true)}
                disabled={actionLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Revoke
              </button>
            )}
          </div>
        </div>

        {/* Live status */}
        {credential.live && (
          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Live</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-foreground-muted text-xs">Status</p>
                <p className={`font-medium ${credential.live.is_online ? 'text-success' : 'text-foreground-muted'}`}>
                  {credential.live.is_online ? '● Online' : '○ Offline'}
                </p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Session uptime</p>
                <p className="font-mono text-foreground">{credential.live.uptime_this_session || '-'}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Bound MAC</p>
                <p className="font-mono text-foreground break-all">{credential.live.bound_mac_address || '-'}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Bound IP</p>
                <p className="font-mono text-foreground">{credential.live.bound_ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Download rate</p>
                <p className="font-mono text-foreground">{formatRate(credential.live.current_rx_rate_bps)}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Upload rate</p>
                <p className="font-mono text-foreground">{formatRate(credential.live.current_tx_rate_bps)}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Idle</p>
                <p className="font-mono text-foreground">{credential.live.idle_time || '-'}</p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Last seen</p>
                <p className="text-foreground text-xs">{safeFormatDate(credential.last_seen_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Editable settings */}
        <form onSubmit={handleSave} className="card p-6 space-y-4" autoComplete="off">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Settings</h3>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Label</label>
            <input
              type="text"
              value={form.label ?? ''}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="input"
              placeholder='e.g., "Front desk laptop"'
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">Rate Limit</label>
              <input
                type="text"
                value={form.rate_limit ?? ''}
                onChange={(e) => setForm({ ...form, rate_limit: e.target.value })}
                className="input font-mono"
                placeholder="e.g. 5M/2M (empty = unlimited)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">Lifetime Cap (MB)</label>
              <input
                type="number"
                value={form.data_cap_mb ?? ''}
                onChange={(e) => setForm({ ...form, data_cap_mb: e.target.value ? parseInt(e.target.value) : null })}
                className="input"
                placeholder="Unlimited"
                min={0}
              />
            </div>
          </div>

          <p className="text-xs text-foreground-muted">
            Rate-limit changes push to the router immediately and update the per-MAC queue if a device is bound.
          </p>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Usage / metadata */}
        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Usage</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-foreground-muted text-xs">Total downloaded</p>
              <p className="font-mono text-foreground">{formatBytes(credential.total_bytes_in)}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">Total uploaded</p>
              <p className="font-mono text-foreground">{formatBytes(credential.total_bytes_out)}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">Last login</p>
              <p className="text-foreground text-xs">{safeFormatDate(credential.last_login_at)}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">Bound at</p>
              <p className="text-foreground text-xs">{safeFormatDate(credential.bound_at)}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">Created</p>
              <p className="text-foreground text-xs">{safeFormatDate(credential.created_at)}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">Updated</p>
              <p className="text-foreground text-xs">{safeFormatDate(credential.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card p-6 border-danger/30">
          <h3 className="text-sm font-semibold text-danger uppercase tracking-wider mb-2">Danger Zone</h3>
          <p className="text-xs text-foreground-muted mb-4">
            Hard-deleting also removes the router-side artifacts. Prefer revoke unless you really want it gone.
          </p>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Credential
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={rotateConfirm}
        onClose={() => setRotateConfirm(false)}
        onConfirm={handleRotate}
        title="Rotate password"
        message={`Generate a new password for ${credential.username}? The next login attempt with the old password will fail.`}
        confirmLabel="Rotate"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={revokeConfirm}
        onClose={() => setRevokeConfirm(false)}
        onConfirm={handleRevoke}
        title="Revoke credential"
        message={`This removes ${credential.username} from the router and kicks any active session. You can restore it later.`}
        confirmLabel="Revoke"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="Restore credential"
        message={`Re-activate ${credential.username} and re-push it to the router?`}
        confirmLabel="Restore"
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={forceLogoutConfirm}
        onClose={() => setForceLogoutConfirm(false)}
        onConfirm={handleForceLogout}
        title="Force logout"
        message={`Disconnect the device currently using ${credential.username}. The credential stays active so it can be used on another device.`}
        confirmLabel="Force Logout"
        variant="warning"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete credential"
        message={`Permanently delete ${credential.username}? This also removes the router-side artifacts. Prefer revoke unless you really want it gone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
