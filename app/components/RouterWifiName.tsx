'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../lib/permissions';
import type { RouterWifiResponse } from '../lib/types';
import { WIFI_NAME_MAX, wifiErrorMessage, wifiNameError, wifiReasonLabel } from '../lib/wifiName';

/**
 * Router settings row: "Wi-Fi name". Reads the hotspot SSID(s) live from the
 * router and, for users who can manage routers, renames them straight away
 * (independent of the Edit Router form's Save button).
 */
export default function RouterWifiName({ routerId }: { routerId: number }) {
  const t = useT();
  const { showAlert } = useAlert();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.routersManage);
  const [data, setData] = useState<RouterWifiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api.getRouterWifi(routerId));
    } catch (err) {
      setLoadError(wifiErrorMessage(t, err));
    } finally {
      setLoading(false);
    }
  }, [routerId, t]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    setValue(data?.ssids[0] ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const invalid = wifiNameError(t, value);
    if (invalid) {
      setError(invalid);
      return;
    }
    const name = value.trim();
    setSaving(true);
    setError(null);
    try {
      const res = await api.renameRouterWifi(routerId, name);
      setData((prev) => (prev ? { ...prev, ssids: [res.ssid] } : prev));
      setEditing(false);
      showAlert('success', t('Wi-Fi renamed to "{name}". Devices must now join "{name}".', { name: res.ssid }));
    } catch (err) {
      setError(wifiErrorMessage(t, err));
    } finally {
      setSaving(false);
    }
  };

  const skipped = (data?.interfaces ?? []).filter((i) => !i.renameable && i.reason);

  return (
    <div className="pt-2 border-t border-border" data-testid="router-wifi-name">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={`router-wifi-name-${routerId}`} className="block text-sm font-medium text-foreground">
            {t('Wi-Fi name')}
          </label>
          {loading ? (
            <p className="text-xs text-foreground-muted mt-0.5">{t('Reading from the router...')}</p>
          ) : loadError ? (
            <p className="text-xs text-danger mt-0.5" role="alert">{loadError}</p>
          ) : data && !data.has_wireless ? (
            <p className="text-xs text-foreground-muted mt-0.5">
              {t('This router has no built-in Wi-Fi. Change the name on your separate access point (for example a Tenda).')}
            </p>
          ) : data && data.ssids.length > 0 ? (
            <p className="text-sm text-foreground mt-0.5 break-words" data-testid="router-wifi-current">
              {data.ssids.join(', ')}
            </p>
          ) : (
            <p className="text-xs text-foreground-muted mt-0.5">
              {t('No hotspot Wi-Fi on this router can be renamed safely.')}
            </p>
          )}
        </div>
        {loadError ? (
          <button type="button" onClick={load} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
            {t('Retry')}
          </button>
        ) : canManage && data?.can_rename && !editing ? (
          <button type="button" onClick={startEdit} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
            {t('Change')}
          </button>
        ) : null}
      </div>

      {editing && (
        <div className="mt-3 space-y-2 animate-fade-in">
          <input
            id={`router-wifi-name-${routerId}`}
            type="text"
            value={value}
            maxLength={WIFI_NAME_MAX}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            onKeyDown={(e) => {
              // Inside the Edit Router form: Enter renames, it must not submit the form.
              if (e.key === 'Enter') { e.preventDefault(); if (!saving) save(); }
            }}
            className="input"
            placeholder={t('e.g. Mama Mboga WiFi')}
            autoComplete="off"
            disabled={saving}
          />
          <p className="text-xs text-warning">
            {t('Everyone on Wi-Fi is disconnected and must join the new name. The Wi-Fi password and security stay the same.')}
          </p>
          {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              disabled={saving}
              className="btn-secondary flex-1 text-sm"
            >
              {t('Cancel')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
            >
              {saving ? t('Renaming...') : t('Rename Wi-Fi')}
            </button>
          </div>
        </div>
      )}

      {!loading && !loadError && skipped.length > 0 && (
        <p className="text-xs text-foreground-muted mt-1.5">
          {skipped.map((i) => `${i.name}: ${wifiReasonLabel(t, i.reason)}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
