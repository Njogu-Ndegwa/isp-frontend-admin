'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PPPoEMonitorUser } from '../lib/types';
import { useAlert } from '../context/AlertContext';
import PPPoECleanupDialog from '../components/PPPoECleanupDialog';

// PPPoE logins on this router that no billing customer owns — usually a
// customer who was deleted or imported but whose secret survived on the
// router. They can still connect without paying, so list them with a way to
// remove them.
export default function RouterUnbilledLogins({ routerId, routerName }: { routerId: number; routerName: string }) {
  const { showAlert } = useAlert();
  const [logins, setLogins] = useState<PPPoEMonitorUser[] | null>(null);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<PPPoEMonitorUser | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPPPoEUsers(routerId, refresh);
      setLive(data.router_reachable !== false && !data.fallback_reason);
      setLogins(data.users.filter((u) => !u.customer));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the router');
    } finally {
      setLoading(false);
    }
  }, [routerId]);

  useEffect(() => { load(false); }, [load]);

  if (loading && !logins) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="router-unbilled-logins">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-foreground-muted">
          PPPoE logins on this router with no customer in billing. They can still connect without paying.
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); load(true); }}
          disabled={loading}
          className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && !live && (
        <p className="text-xs text-warning">The router did not answer, so this list may be out of date.</p>
      )}

      {logins && logins.length === 0 && !error && (
        <p className="text-center text-foreground-muted text-xs py-3">Every PPPoE login on this router belongs to a customer.</p>
      )}

      {logins && logins.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border max-h-80 overflow-y-auto">
          {logins.map((u) => (
            <li key={u.username} className="p-3 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-mono text-foreground truncate">{u.username}</p>
                <p className="text-xs text-foreground-muted truncate">
                  {u.online ? (
                    <span className="text-emerald-500 font-medium">Online{u.address ? ` · ${u.address}` : ''}</span>
                  ) : (
                    <>Offline{u.last_logged_out ? ` · last seen ${u.last_logged_out}` : ''}</>
                  )}
                  {u.disabled && <span className="text-warning"> · disabled</span>}
                </p>
                {u.comment && <p className="text-xs text-foreground-muted truncate" title={u.comment}>{u.comment}</p>}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setRemoving(u); }}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors active:opacity-70"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {removing && (
        <PPPoECleanupDialog
          user={removing}
          routerId={routerId}
          routerName={routerName}
          onClose={() => setRemoving(null)}
          onSuccess={(msg) => {
            showAlert('success', msg);
            setRemoving(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}
