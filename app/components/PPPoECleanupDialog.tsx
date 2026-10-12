'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import {
  PPPoEMonitorUser,
  PPPoECleanupConflictCustomer,
  PPPoECleanupConflictDetail,
  PPPoECleanupError,
} from '../lib/types';

// Removes a PPPoE login that no billing customer owns from its router. When
// the username does belong to a customer the backend answers 409 and the
// dialog points at that customer instead.
export default function CleanupDialog({
  user,
  routerId,
  routerName,
  onClose,
  onSuccess,
}: {
  user: PPPoEMonitorUser;
  routerId: number;
  routerName: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [conflict, setConflict] = useState<PPPoECleanupConflictCustomer | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const cidMatch = user.comment?.match(/CID\s*:\s*(\d+)/i);
  const customerIdHint = cidMatch ? cidMatch[1] : null;

  const runCleanup = async (force: boolean) => {
    try {
      setLoading(true);
      setErrorText(null);
      const result = await api.cleanupPPPoERouterUser(routerId, user.username, { force });
      const action = result.cleanup?.remove_result?.action;
      // not_found means the secret was already gone — treat as success per spec.
      const msg =
        action === 'not_found'
          ? `${user.username} was already absent from ${result.router_name}.`
          : force
            ? `Force removed ${user.username} from ${result.router_name}.`
            : `Removed ${user.username} from ${result.router_name}.`;
      onSuccess(msg);
    } catch (err) {
      if (err instanceof PPPoECleanupError) {
        if (err.status === 409) {
          const detail = err.body?.detail as PPPoECleanupConflictDetail | undefined;
          if (detail && typeof detail === 'object' && 'customer' in detail) {
            setConflict(detail.customer);
            setConflictMessage(detail.message ?? err.message);
            return;
          }
        }
        if (err.status === 503) {
          setErrorText('Router is unreachable. Try again when the router is online.');
          return;
        }
        if (err.status === 502) {
          setErrorText(err.message || 'Cleanup failed at the router. Try again.');
          return;
        }
        setErrorText(err.message);
        return;
      }
      setErrorText(err instanceof Error ? err.message : 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {conflict ? 'Still linked to a customer' : 'Remove from Router'}
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">{routerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!conflict && (
          <>
            <div className="rounded-lg bg-background-tertiary p-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-foreground-muted">Username</span>
                <span className="font-mono text-foreground">{user.username}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-foreground-muted">Status</span>
                <span className={user.online ? 'text-emerald-500 font-medium' : 'text-foreground-muted'}>
                  {user.online ? 'Online' : 'Offline'}
                </span>
              </div>
              {user.online && user.address && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">IP address</span>
                  <span className="font-mono text-foreground">{user.address}</span>
                </div>
              )}
              {user.online && user.caller_id && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Caller ID / MAC</span>
                  <span className="font-mono text-foreground">{user.caller_id}</span>
                </div>
              )}
              {user.comment && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Comment</span>
                  <span className="font-mono text-foreground text-right break-all">{user.comment}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-foreground-muted">
              This will disconnect the PPPoE session and remove the PPPoE secret from the router.
              It will not delete a billing customer because no matching customer was found.
            </p>

            {user.online && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
                This user is currently online and will be disconnected immediately.
              </div>
            )}

            {customerIdHint && (
              <div className="rounded-lg bg-info/10 border border-info/20 p-3 text-xs text-info">
                Router comment references customer <span className="font-mono">CID:{customerIdHint}</span>.
                If that customer still exists, open it first instead of removing the secret.
              </div>
            )}

            {errorText && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {errorText}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
                Cancel
              </button>
              <button
                onClick={() => runCleanup(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-danger text-white hover:bg-danger/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Remove from Router'
                )}
              </button>
            </div>
          </>
        )}

        {conflict && (
          <>
            <p className="text-sm text-foreground">
              {conflictMessage ??
                'PPPoE username still belongs to a customer. Delete or deactivate the customer first.'}
            </p>
            <div className="rounded-lg bg-background-tertiary p-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-foreground-muted">Customer</span>
                <span className="font-medium text-foreground">{conflict.name}</span>
              </div>
              {conflict.phone && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Phone</span>
                  <span className="font-mono text-foreground">{conflict.phone}</span>
                </div>
              )}
              {conflict.status && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Status</span>
                  <span className="text-foreground capitalize">{conflict.status}</span>
                </div>
              )}
              {conflict.plan && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Plan</span>
                  <span className="text-foreground">{conflict.plan}</span>
                </div>
              )}
              {conflict.expiry && (
                <div className="flex justify-between gap-3">
                  <span className="text-foreground-muted">Expiry</span>
                  <span className="text-foreground">{conflict.expiry}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-foreground-muted">
              Prefer opening the customer and using the normal delete or deactivate flow — that path
              also removes the PPPoE secret from the router. Force removal here will disconnect the
              customer without touching billing.
            </p>

            {errorText && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {errorText}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Link
                href={`/customers/${conflict.id}`}
                className="btn-primary flex items-center justify-center gap-2"
                onClick={onClose}
              >
                Open customer
              </Link>
              <button
                onClick={() => runCleanup(true)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-danger/40 text-danger hover:bg-danger/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                ) : (
                  'Force remove from router'
                )}
              </button>
              <button onClick={onClose} className="btn-secondary" disabled={loading}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
