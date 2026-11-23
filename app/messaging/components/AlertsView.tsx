'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { AlertContacts, Router, RouterAlertDelayMinutes, SmsCreditInfo } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';
import { useT } from '../../lib/i18n';
import { AlertContactsCard } from './AlertContactsCard';

// ─── Router status alerts ──────────────────────────────────────────────────
// Per-router opt-in: an inbox message when the router stays offline past the
// backend debounce threshold, and again when it comes back online. The same
// toggle also sends the alert by SMS (1 credit) when the account has a phone
// on file and credits to cover it; otherwise it degrades to inbox-only.
const alertDelays: RouterAlertDelayMinutes[] = [5, 10, 15, 30, 60];

interface AlertsViewProps {
  credits: SmsCreditInfo | null;
  onBuyCredits: () => void;
}

export function AlertsView({ credits, onBuyCredits }: AlertsViewProps) {
  const t = useT();
  const { showAlert } = useAlert();
  const [routers, setRouters] = useState<Router[]>([]);
  const [supportPhone, setSupportPhone] = useState<string | null | undefined>(undefined);
  // Numbers alert SMS go to now (alert contacts, else the support phone).
  const [alertRecipients, setAlertRecipients] = useState<string[] | undefined>(undefined);
  const handleContactsChange = useCallback((contacts: AlertContacts) => {
    setAlertRecipients(contacts.recipients);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRouters(await api.getRouters());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Phone gate is informational only — don't block the tab if it fails.
  useEffect(() => {
    api.getProfile()
      .then((p) => setSupportPhone(p.support_phone ?? null))
      .catch(() => setSupportPhone(null));
  }, []);

  const updateAlerts = async (router: Router, change: { enabled?: boolean; delay_minutes?: RouterAlertDelayMinutes }) => {
    try {
      setTogglingId(router.id);
      const result = await api.updateRouterStatusAlerts(router.id, change);
      setRouters((prev) => prev.map((r) => (
        r.id === router.id ? {
          ...r,
          status_alerts_enabled: result.status_alerts_enabled,
          status_alert_delay_minutes: result.status_alert_delay_minutes ?? r.status_alert_delay_minutes,
        } : r
      )));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to update notification setting');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-sm text-danger mb-3">{error}</p>
        <button onClick={load} className="btn-secondary text-sm">Retry</button>
      </div>
    );
  }

  const balance = credits?.balance ?? 0;
  const noCredits = balance === 0;
  const noPhone = alertRecipients !== undefined
    ? alertRecipients.length === 0
    : supportPhone === null || supportPhone === '';

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-medium text-foreground mb-1">Router status alerts</h3>
        <p className="text-xs text-foreground-muted">
          Get a message in your inbox — and an SMS to your alert contacts — when a router stays
          offline long enough to reach its selected delay, and again when it comes back online.
          The delay is a minimum. Detection and delivery can take longer.
          Inbox alerts are free; each SMS costs 1 credit per recipient from your messaging balance
          (refunded automatically if delivery fails).
        </p>
      </div>

      {noCredits && (
        <div className="card p-4 border-warning/30 bg-warning/10 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">You have 0 SMS credits</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Alerts will arrive in your inbox only — no SMS will be sent until you top up.
            </p>
          </div>
          <button onClick={onBuyCredits} className="btn-primary text-xs shrink-0">
            Buy credits
          </button>
        </div>
      )}

      {noPhone && (
        <div className="card p-4 border-warning/30 bg-warning/10 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{t('No phone number for alerts')}</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              {t('Add a mobile number under Alert contacts below, or a support phone on your profile. Until then, alerts are inbox-only.')}
            </p>
          </div>
          <Link href="/settings/profile" className="btn-secondary text-xs shrink-0">
            {t('Add phone')}
          </Link>
        </div>
      )}

      <AlertContactsCard onChange={handleContactsChange} />

      {routers.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">No routers yet. Add a router first to enable alerts.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {routers.map((router) => (
            <div key={router.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{router.name}</p>
                <span className={`badge mt-1 ${
                  router.status === 'online' ? 'badge-success'
                    : router.status === 'offline' ? 'badge-danger'
                    : 'badge-neutral'
                }`}>
                  {router.status === 'online' ? 'Online' : router.status === 'offline' ? 'Offline' : 'Unknown'}
                </span>
              </div>
              <div className="flex shrink-0 flex-wrap items-end justify-end gap-2">
                <label className="grid gap-1 text-xs text-foreground-muted">
                  Notify after
                  <select
                    aria-label={`Offline alert delay for ${router.name}`}
                    value={router.status_alert_delay_minutes ?? 15}
                    disabled={togglingId !== null}
                    onChange={(event) => updateAlerts(router, {
                      delay_minutes: Number(event.target.value) as RouterAlertDelayMinutes,
                    })}
                    className="rounded-md border border-border bg-background-secondary px-2 py-1 text-foreground"
                  >
                    {alertDelays.map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes} min</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!router.status_alerts_enabled}
                  aria-label={`Status alerts for ${router.name}`}
                  disabled={togglingId !== null}
                  onClick={() => updateAlerts(router, { enabled: !router.status_alerts_enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    router.status_alerts_enabled ? 'bg-success' : 'bg-background-tertiary border border-border'
                  } ${togglingId === router.id ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      router.status_alerts_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
