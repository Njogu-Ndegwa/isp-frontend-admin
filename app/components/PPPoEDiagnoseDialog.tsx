'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PPPoEDiagnoseResponse } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';

// Runs the router-side PPPoE checks (server, profile, pool, NAT, secret) for one
// username and lists what is wrong.
export default function DiagnoseDialog({
  username,
  routerId,
  onClose,
}: {
  username: string;
  routerId: number;
  onClose: () => void;
}) {
  const [result, setResult] = useState<PPPoEDiagnoseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.diagnosePPPoE(routerId, username);
        if (!cancelled) setResult(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Diagnosis failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [routerId, username]);

  const formatExpiry = (dateStr: string | null) => {
    try {
      if (!dateStr) return '—';
      return formatDateGMT3(dateStr, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Diagnose: {username}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-[3px] rounded-full border-amber-500/30 border-t-amber-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`badge ${result.status === 'online' ? 'badge-success' : 'badge-danger'}`}>
                {result.status}
              </span>
              {result.has_critical && (
                <span className="badge badge-danger">Critical Issues</span>
              )}
              <span className="text-xs text-foreground-muted">
                {result.issues_count} issue{result.issues_count !== 1 ? 's' : ''} found
              </span>
            </div>

            {result.customer && (
              <div className="p-3 rounded-lg bg-background-tertiary text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-foreground-muted text-xs">Customer</span>
                    <p className="font-medium text-foreground">{result.customer.name}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Status</span>
                    <p className="font-medium text-foreground">{result.customer.status}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Plan</span>
                    <p className="font-medium text-foreground">{result.customer.plan || '—'}</p>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-xs">Expiry</span>
                    <p className="font-medium text-foreground">{formatExpiry(result.customer.expiry)}</p>
                  </div>
                </div>
              </div>
            )}

            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-sm border ${
                      issue.severity === 'critical'
                        ? 'bg-danger/10 border-danger/20'
                        : issue.severity === 'warning'
                        ? 'bg-warning/10 border-warning/20'
                        : 'bg-info/10 border-info/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-xs font-semibold uppercase mt-0.5 ${
                        issue.severity === 'critical' ? 'text-danger' :
                        issue.severity === 'warning' ? 'text-warning' : 'text-info'
                      }`}>
                        {issue.severity}
                      </span>
                      <div>
                        <p className="text-foreground">{issue.message}</p>
                        {issue.recommendation && (
                          <p className="text-foreground-muted text-xs mt-1">{issue.recommendation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm text-center">
                No issues found — connection looks healthy.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  // Portalled: a transformed ancestor (fade-in cards) would otherwise
  // trap this fixed overlay inside its own box.
  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
