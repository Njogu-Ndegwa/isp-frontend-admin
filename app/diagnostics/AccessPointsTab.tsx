'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { apActionState, canManageAccessPoints, modeLabel, safeApReason } from '../lib/apControl';
import type { AccessPoint, AccessPointsResponse, AuthUser } from '../lib/types';

/**
 * "Access points" on Diagnostics: the Tenda (and other) APs behind the router.
 * Save each AP's admin password once (write-only), then Reboot / Make safe AP /
 * Refresh status. The password is never shown back. Reboot and Make safe need
 * "Manage routers"; everyone with "View routers" can see the list and refresh.
 */
export default function AccessPointsTab({
  routerId,
  user,
}: {
  routerId: number | null;
  user: AuthUser | null;
}) {
  const t = useT();
  const canManage = canManageAccessPoints(user);
  const [data, setData] = useState<AccessPointsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!routerId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getAccessPoints(routerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not load access points'));
    } finally {
      setLoading(false);
    }
  }, [routerId, t]);

  useEffect(() => { void load(); }, [load]);

  if (!routerId) {
    return <p className="text-foreground-muted text-sm">{t('Select a router to see its access points.')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('Access points')}</h3>
          {data?.gateway && (
            <p className="text-xs text-foreground-muted">
              {t('Router gateway')}: <span className="font-mono">{data.gateway}</span>
              {data.subnet ? ` · ${data.subnet}` : ''}
            </p>
          )}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="btn-ghost text-xs px-2 py-1 disabled:opacity-40">
          {loading ? t('Loading...') : t('Refresh list')}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !loading && (data?.access_points.length ?? 0) === 0 && (
        <p className="text-sm text-foreground-muted">{t('No access points found behind this router.')}</p>
      )}

      <div className="space-y-3">
        {data?.access_points.map((ap) => (
          <AccessPointCard
            key={ap.mac}
            routerId={routerId}
            ap={ap}
            canManage={canManage}
            busy={busy || data.ap_write_in_progress}
            onBusyChange={setBusy}
            onChanged={() => void load()}
          />
        ))}
      </div>
    </div>
  );
}

function AccessPointCard({
  routerId, ap, canManage, busy, onBusyChange, onChanged,
}: {
  routerId: number;
  ap: AccessPoint;
  canManage: boolean;
  busy: boolean;
  onBusyChange: (b: boolean) => void;
  onChanged: () => void;
}) {
  const t = useT();
  const { showAlert } = useAlert();
  const [password, setPassword] = useState('');
  const model = ap.credential?.model ?? 'OAP1200V2';
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<'reboot' | 'make_safe' | 'status' | null>(null);
  const [confirm, setConfirm] = useState<null | 'reboot' | 'make_safe'>(null);

  const status = ap.credential?.last_status ?? null;
  const reason = safeApReason(t, ap);
  const action = apActionState(t, ap, { busy });

  const savePassword = async () => {
    if (!password) return;
    try {
      setSaving(true);
      await api.saveApCredential(routerId, ap.mac, { password, model, ap_ip: ap.ip ?? undefined });
      setPassword('');
      showAlert('success', t('Password saved for {mac}.', { mac: ap.mac }), 6000);
      onChanged();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save the password'), 9000);
    } finally {
      setSaving(false);
    }
  };

  const refreshStatus = async () => {
    try {
      setRunning('status');
      onBusyChange(true);
      const res = await api.getApStatus(routerId, ap.mac);
      showAlert('success', res.status
        ? t('{model} · {mode}', { model: res.status.model ?? t('AP'), mode: modeLabel(t, res.status.mode) })
        : t('Status read.'), 6000);
      onChanged();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not read status'), 9000);
    } finally {
      setRunning(null);
      onBusyChange(false);
    }
  };

  const runAction = async (which: 'reboot' | 'make_safe') => {
    try {
      setRunning(which);
      onBusyChange(true);
      const res = which === 'reboot'
        ? await api.rebootAccessPoint(routerId, ap.mac)
        : await api.makeAccessPointSafe(routerId, ap.mac);
      showAlert('success', res.message ?? t('Done.'), 9000);
      setConfirm(null);
      onChanged();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('The action failed'), 9000);
    } finally {
      setRunning(null);
      onBusyChange(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {ap.vendor}{ap.hostname ? ` · ${ap.hostname}` : ''}
            {ap.offline && <span className="ml-2 text-xs text-foreground-muted">({t('offline')})</span>}
          </p>
          <p className="text-xs text-foreground-muted font-mono">
            {ap.mac}{ap.ip ? ` · ${ap.ip}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {status?.mode && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              status.mode === 'ap' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
              {modeLabel(t, status.mode)}
            </span>
          )}
          {ap.detector.needs_safe_ap && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning">
              {t('Needs fixing')}
            </span>
          )}
        </div>
      </div>

      {reason && <p className="text-xs text-warning">{reason}</p>}
      {status && (
        <p className="text-xs text-foreground-muted">
          {[status.model, status.firmware, status.dhcp_server_on != null
            ? (status.dhcp_server_on ? t('DHCP on') : t('DHCP off')) : null,
            status.client_count != null ? t('{n} clients', { n: status.client_count }) : null,
          ].filter(Boolean).join(' · ')}
        </p>
      )}
      {ap.credential?.locked && (
        <p className="text-xs text-danger">{t('Locked after too many wrong passwords. Save the password again.')}</p>
      )}
      {ap.credential?.last_error && !ap.credential.locked && (
        <p className="text-xs text-danger">{ap.credential.last_error}</p>
      )}

      {canManage && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <label className="flex flex-col text-[11px] text-foreground-muted">
            {ap.credential?.has_password ? t('Replace admin password') : t('AP admin password')}
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ap.credential?.has_password ? '••••••••' : t('Set once')}
              className="input text-sm w-44 mt-0.5"
            />
          </label>
          <button type="button" onClick={() => void savePassword()} disabled={!password || saving}
            className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">
            {saving ? t('Saving...') : t('Save password')}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" onClick={() => void refreshStatus()}
          disabled={action.disabled || running !== null}
          title={action.hint ?? undefined}
          className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
          {running === 'status' ? t('Checking...') : t('Refresh status')}
        </button>
        {canManage && (
          <>
            <button type="button" onClick={() => setConfirm('reboot')}
              disabled={action.disabled || running !== null}
              title={action.hint ?? undefined}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {running === 'reboot' ? t('Rebooting...') : t('Reboot AP')}
            </button>
            <button type="button" onClick={() => setConfirm('make_safe')}
              disabled={action.disabled || running !== null}
              title={action.hint ?? undefined}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {running === 'make_safe' ? t('Working...') : t('Make it a safe AP')}
            </button>
          </>
        )}
      </div>
      {action.disabled && action.hint && (
        <p className="text-[10px] text-foreground-muted">{action.hint}</p>
      )}

      <ConfirmDialog
        isOpen={confirm === 'reboot'}
        onClose={() => { if (!running) setConfirm(null); }}
        onConfirm={() => runAction('reboot')}
        title={t('Reboot this access point?')}
        message={t('Wi-Fi on this AP drops for about a minute while it restarts.')}
        confirmLabel={t('Reboot AP')}
        cancelLabel={t('Cancel')}
        variant="warning"
        loading={running === 'reboot'}
      />
      <ConfirmDialog
        isOpen={confirm === 'make_safe'}
        onClose={() => { if (!running) setConfirm(null); }}
        onConfirm={() => runAction('make_safe')}
        title={t('Make it a safe AP?')}
        message={t('Switches the AP to plain AP mode, turns its DHCP server off and gives it a fixed address outside the router pool. Devices reconnect once it settles.')}
        confirmLabel={t('Make safe')}
        cancelLabel={t('Cancel')}
        variant="warning"
        loading={running === 'make_safe'}
      />
    </div>
  );
}
