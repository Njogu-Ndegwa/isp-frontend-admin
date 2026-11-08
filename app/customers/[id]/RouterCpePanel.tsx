'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { apControlEnabled, modeLabel } from '../../lib/apControl';
import { useT } from '../../lib/i18n';
import type { Customer, CpeResponse, CpeStatus } from '../../lib/types';

const TENDA_MODELS = ['F3', 'OAP1200V2', 'AC6', 'AC10', 'N301', 'Tenda'];

/**
 * Router (CPE) control for a PPPoE customer: the customer's own router (a Tenda
 * in router mode, WAN = PPPoE) is reached by resolving its live PPPoE session on
 * the MikroTik, then talking to its web admin through the router. Save the admin
 * password once (write-only, never shown), then Check status, Restart, or
 * Disconnect the line so it redials. Admin-only for now.
 */
export default function RouterCpePanel({ customer }: { customer: Customer }) {
  const t = useT();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [data, setData] = useState<CpeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CpeStatus | null>(null);
  const [running, setRunning] = useState<'status' | 'reboot' | 'disconnect' | null>(null);
  const [confirm, setConfirm] = useState<null | 'reboot' | 'disconnect'>(null);

  // Credential form
  const [password, setPassword] = useState('');
  const [model, setModel] = useState('F3');
  const [port, setPort] = useState<number>(80);
  const [saving, setSaving] = useState(false);

  const enabled = apControlEnabled(user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCpe(customer.id);
      setData(res);
      setStatus(res.credential?.last_status ?? null);
      if (res.credential) {
        setModel(res.credential.model ?? 'F3');
        setPort(res.credential.port ?? 80);
      } else {
        setPort(res.suggested_wan_port ?? 80);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not load router (CPE) control'), 9000);
    } finally {
      setLoading(false);
    }
  }, [customer.id, showAlert, t]);

  useEffect(() => { if (enabled) void load(); }, [enabled, load]);

  if (!enabled) return null;

  const cred = data?.credential ?? null;
  const locked = cred?.locked ?? false;
  const hasPassword = cred?.has_password ?? false;

  const savePassword = async () => {
    if (!password) return;
    try {
      setSaving(true);
      await api.saveCpeCredential(customer.id, {
        password, model, port,
        device_mac: customer.mac_address ?? undefined,
      });
      setPassword('');
      showAlert('success', t('Router (CPE) password saved.'), 6000);
      void load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save the password'), 9000);
    } finally {
      setSaving(false);
    }
  };

  const checkStatus = async () => {
    try {
      setRunning('status');
      const res = await api.getCpeStatus(customer.id);
      setStatus(res.status);
      showAlert('success', res.status
        ? t('{model} · {mode}', { model: res.status.model ?? t('Router'), mode: modeLabel(t, res.status.mode) })
        : t('Status read.'), 6000);
      void load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not read status'), 9000);
    } finally {
      setRunning(null);
    }
  };

  const runAction = async (which: 'reboot' | 'disconnect') => {
    try {
      setRunning(which);
      const res = which === 'reboot'
        ? await api.rebootCpe(customer.id)
        : await api.disconnectCpe(customer.id);
      showAlert('success', res.message ?? t('Done.'), 9000);
      setConfirm(null);
      void load();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('The action failed'), 9000);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="bg-background-secondary border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('Router (CPE) control')}</h3>
          <p className="text-xs text-foreground-muted">
            {t("The customer's own router over PPPoE. Reached live through the MikroTik session.")}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-tertiary text-foreground-muted">
          {t('Admin only')}
        </span>
      </div>

      {loading && <p className="text-xs text-foreground-muted">{t('Loading...')}</p>}

      {!loading && data && !data.is_pppoe && (
        <p className="text-xs text-foreground-muted">
          {t('Router (CPE) control is only for a PPPoE customer with a router assigned.')}
        </p>
      )}

      {!loading && data?.is_pppoe && (
        <>
          {status && (
            <div className="text-xs text-foreground-muted space-y-0.5">
              <p>
                {[status.model, status.firmware, status.mode ? modeLabel(t, status.mode) : null]
                  .filter(Boolean).join(' · ')}
              </p>
              {status.session_address && (
                <p>
                  {t('Session')}: <span className="font-mono">{status.session_address}</span>
                  {status.session_uptime ? ` · ${status.session_uptime}` : ''}
                </p>
              )}
            </div>
          )}
          {locked && (
            <p className="text-xs text-danger">
              {t('Locked after too many wrong passwords. Save the password again.')}
            </p>
          )}
          {cred?.last_error && !locked && (
            <p className="text-xs text-danger">{cred.last_error}</p>
          )}

          {/* Saved password + model + port */}
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="flex flex-col text-[11px] text-foreground-muted">
              {hasPassword ? t('Replace admin password') : t('Router admin password')}
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={hasPassword ? '••••••••' : t('Set once')}
                className="input text-sm w-44 mt-0.5"
              />
            </label>
            <label className="flex flex-col text-[11px] text-foreground-muted">
              {t('Model')}
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="input text-sm w-32 mt-0.5">
                {TENDA_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-[11px] text-foreground-muted">
              {t('Web port')}
              <input
                type="number" min={1} max={65535}
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 80)}
                className="input text-sm w-24 mt-0.5"
              />
            </label>
            <button type="button" onClick={() => void savePassword()} disabled={!password || saving}
              className="btn-secondary text-xs px-2 py-1 disabled:opacity-40">
              {saving ? t('Saving...') : t('Save password')}
            </button>
          </div>
          <p className="text-[10px] text-foreground-muted">
            {t('Use port 80 on the LAN, or the Tenda remote web-management port (often 8080/8888) over PPPoE. Remote management must allow the MikroTik.')}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" onClick={() => void checkStatus()}
              disabled={!hasPassword || locked || running !== null}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {running === 'status' ? t('Checking...') : t('Check status')}
            </button>
            <button type="button" onClick={() => setConfirm('reboot')}
              disabled={!hasPassword || locked || running !== null}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {running === 'reboot' ? t('Restarting...') : t('Restart router')}
            </button>
            <button type="button" onClick={() => setConfirm('disconnect')}
              disabled={running !== null}
              className="btn-ghost text-xs px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed">
              {running === 'disconnect' ? t('Disconnecting...') : t('Disconnect line (redial)')}
            </button>
          </div>

          <ConfirmDialog
            isOpen={confirm === 'reboot'}
            onClose={() => { if (!running) setConfirm(null); }}
            onConfirm={() => runAction('reboot')}
            title={t('Restart this router?')}
            message={t('The router reboots and drops for about a minute. The PPPoE line reconnects once it is back up.')}
            confirmLabel={t('Restart router')}
            cancelLabel={t('Cancel')}
            variant="warning"
            loading={running === 'reboot'}
          />
          <ConfirmDialog
            isOpen={confirm === 'disconnect'}
            onClose={() => { if (!running) setConfirm(null); }}
            onConfirm={() => runAction('disconnect')}
            title={t('Disconnect the line?')}
            message={t('Drops the PPPoE session so the router redials within a few seconds. This reconnects the line; it does not reboot the device.')}
            confirmLabel={t('Disconnect line')}
            cancelLabel={t('Cancel')}
            variant="warning"
            loading={running === 'disconnect'}
          />
        </>
      )}
    </div>
  );
}
