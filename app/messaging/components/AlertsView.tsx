'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Router, SmsCreditInfo } from '../../lib/types';
import { useAlert } from '../../context/AlertContext';
import { PageLoader } from '../../components/LoadingSpinner';

// ─── Router status alerts ──────────────────────────────────────────────────
// Per-router opt-in: an inbox message when the router stays offline past the
// backend debounce threshold, and again when it comes back online. The same
// toggle also sends the alert by SMS (1 credit) when the account has a phone
// on file and credits to cover it; otherwise it degrades to inbox-only.
interface AlertsViewProps {
  credits: SmsCreditInfo | null;
  onBuyCredits: () => void;
}

export function AlertsView({ credits, onBuyCredits }: AlertsViewProps) {
  const { showAlert } = useAlert();
  const [routers, setRouters] = useState<Router[]>([]);
  const [supportPhone, setSupportPhone] = useState<string | null | undefined>(undefined);
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

  const toggle = async (router: Router) => {
    try {
      setTogglingId(router.id);
      const result = await api.setRouterStatusAlerts(router.id, !router.status_alerts_enabled);
      setRouters((prev) => prev.map((r) => (
        r.id === router.id ? { ...r, status_alerts_enabled: result.status_alerts_enabled } : r
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
  const noPhone = supportPhone === null || supportPhone === '';

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-medium text-foreground mb-1">Router status alerts</h3>
        <p className="text-xs text-foreground-muted">
          Get a message in your inbox — and an SMS to your phone — when a router stays
          offline for more than 15 minutes, and again when it comes back online.
          Inbox alerts are free; each SMS costs 1 credit from your messaging balance
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
            <p className="text-sm font-medium text-foreground">No phone number on your profile</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Add a support phone so alert SMS have somewhere to go. Until then, alerts are inbox-only.
            </p>
          </div>
          <Link href="/settings/profile" className="btn-secondary text-xs shrink-0">
            Add phone
          </Link>
        </div>
      )}

      {routers.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-foreground-muted">No routers yet. Add a router first to enable alerts.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {routers.map((router) => (
            <div key={router.id} className="flex items-center justify-between gap-3 p-4">
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
              <button
                type="button"
                role="switch"
                aria-checked={!!router.status_alerts_enabled}
                disabled={togglingId === router.id}
                onClick={() => toggle(router)}
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
          ))}
        </div>
      )}
    </div>
  );
}
