'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Router, TransferPPPoEReport, TransferPPPoEResponse } from '../lib/types';
import {
  eligibleTargetRouters,
  transferApplied,
  transferHasErrors,
  transferPreviewReady,
} from '../lib/pppoeTransfer';
import { useAlert } from '../context/AlertContext';

interface TransferPPPoEModalProps {
  /**
   * The router whose PPPoE customers are being moved. When provided the source
   * is locked (e.g. launched from a specific router). When omitted, the user
   * picks the source from a selector (e.g. launched from the Customers page).
   */
  sourceRouter?: Router;
  onClose: () => void;
  /** Called after a successful (applied) transfer so the parent can refresh. */
  onTransferred: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  inactive: 'badge-neutral',
  pending: 'badge-warning',
};

export default function TransferPPPoEModal({
  sourceRouter,
  onClose,
  onTransferred,
}: TransferPPPoEModalProps) {
  const { showAlert } = useAlert();

  const lockedSource = !!sourceRouter;

  const [routers, setRouters] = useState<Router[]>(sourceRouter ? [sourceRouter] : []);
  const [routersLoading, setRoutersLoading] = useState(true);
  const [sourceRouterId, setSourceRouterId] = useState(sourceRouter ? String(sourceRouter.id) : '');
  const [targetRouterId, setTargetRouterId] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [skipTargetProvision, setSkipTargetProvision] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransferPPPoEResponse | null>(null);

  // The source router object — either the locked prop or the user's selection.
  const source = sourceRouter ?? routers.find((r) => String(r.id) === sourceRouterId) ?? null;
  const sourceId = source?.id ?? null;
  const targets = source ? eligibleTargetRouters(routers, source) : [];
  const report = result?.report ?? null;
  const previewReady = result ? transferPreviewReady(result) : false;
  const applied = result ? transferApplied(result) : false;

  // Picking a new source invalidates the current target/preview.
  const handleSourceChange = (value: string) => {
    setSourceRouterId(value);
    setTargetRouterId('');
    setResult(null);
    setError(null);
  };

  // Load routers once on mount (fresh mount === clean slate).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getRouters();
        if (!cancelled) setRouters(list);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load routers';
        setError(message);
        showAlert('error', message);
      } finally {
        if (!cancelled) setRoutersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showAlert]);

  // Auto-preview whenever the target or options change (guide: "on target
  // selection, call preview with apply: false"). A per-run cancel flag drops
  // stale responses if the user changes the selection mid-flight.
  useEffect(() => {
    if (!sourceId || !targetRouterId) {
      setResult(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setResult(null);
    setError(null);
    setBusy(true);
    (async () => {
      try {
        const res = await api.transferPPPoECustomers(sourceId, {
          targetRouterId: Number(targetRouterId),
          apply: false,
          activeOnly,
          skipTargetProvision,
        });
        if (cancelled) return;
        setResult(res);
        if (transferHasErrors(res)) {
          setError(res.report?.errors?.[0] || 'Preview reported errors');
        }
      } catch (err) {
        if (cancelled) return;
        setResult(null);
        setError(err instanceof Error ? err.message : 'Preview failed');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceId, targetRouterId, activeOnly, skipTargetProvision]);

  const handleApply = useCallback(async () => {
    const targetId = Number(targetRouterId);
    if (!sourceId) { showAlert('error', 'Select a source router'); return; }
    if (!targetId) { showAlert('error', 'Select a target router'); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await api.transferPPPoECustomers(sourceId, {
        targetRouterId: targetId,
        apply: true,
        activeOnly,
        skipTargetProvision,
      });
      setResult(res);
      if (transferHasErrors(res)) {
        const firstError = res.report?.errors?.[0] || 'Transfer reported errors';
        setError(firstError);
        showAlert('error', firstError);
        return;
      }
      const moved = res.report?.moved ?? 0;
      showAlert('success', `Moved ${moved} PPPoE customer${moved === 1 ? '' : 's'} to ${res.target_router_name}`);
      onTransferred();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transfer failed';
      setError(message);
      showAlert('error', message);
    } finally {
      setBusy(false);
    }
  }, [sourceId, targetRouterId, activeOnly, skipTargetProvision, onTransferred, showAlert]);

  const closeIfIdle = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  const targetRouterName = report?.target_router_name
    ?? targets.find((r) => String(r.id) === targetRouterId)?.name
    ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={closeIfIdle}
    >
      <div
        className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Move PPPoE Customers</h3>
            <p className="text-sm text-foreground-muted">
              {source ? (
                <>
                  From <span className="font-medium text-foreground">{source.name}</span>
                  {targetRouterName ? <> to <span className="font-medium text-foreground">{targetRouterName}</span></> : ' to a replacement router'}
                </>
              ) : (
                'Move all PPPoE customers from one router to a replacement'
              )}
            </p>
          </div>
          <button
            onClick={closeIfIdle}
            disabled={busy}
            className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted disabled:opacity-40"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {applied ? (
          /* ---------- Success state ---------- */
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">Transfer complete</h4>
                <p className="text-sm text-foreground-muted">
                  Moved {report?.moved ?? 0} PPPoE customer{(report?.moved ?? 0) === 1 ? '' : 's'} from{' '}
                  {result?.source_router_name} to {result?.target_router_name}.
                </p>
              </div>
            </div>

            {report && <TransferStats report={report} />}

            <button onClick={onClose} className="btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          /* ---------- Form state ---------- */
          <>
            {/* Source (locked) + target selector */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Source router</label>
                {lockedSource ? (
                  <input className="input opacity-80 cursor-not-allowed" value={source?.name ?? ''} disabled readOnly />
                ) : (
                  <select
                    value={sourceRouterId}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="select"
                    disabled={busy || routersLoading}
                  >
                    {routersLoading ? (
                      <option value="">Loading routers…</option>
                    ) : (
                      <>
                        <option value="">Select source router</option>
                        {routers.map((router) => (
                          <option key={router.id} value={router.id}>{router.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Target router</label>
                <select
                  value={targetRouterId}
                  onChange={(e) => setTargetRouterId(e.target.value)}
                  className="select"
                  disabled={busy || routersLoading || !source}
                >
                  {routersLoading ? (
                    <option value="">Loading routers…</option>
                  ) : !source ? (
                    <option value="">Select a source router first</option>
                  ) : targets.length === 0 ? (
                    <option value="">No eligible target routers</option>
                  ) : (
                    <>
                      <option value="">Select target router</option>
                      {targets.map((router) => (
                        <option key={router.id} value={router.id}>{router.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <ToggleRow
                checked={activeOnly}
                onChange={setActiveOnly}
                disabled={busy}
                label="Move active customers only"
                hint="Leave off to also move inactive and pending customers (recommended for router replacement)."
              />

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Advanced
              </button>

              {showAdvanced && (
                <ToggleRow
                  checked={skipTargetProvision}
                  onChange={setSkipTargetProvision}
                  disabled={busy}
                  label="Skip target router provisioning"
                  hint="Move ownership in the database only, without creating PPPoE secrets on the target MikroTik. Use only if the target is already provisioned."
                />
              )}
            </div>

            {/* Inline error */}
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Loading / preview */}
            {busy && !report && (
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Loading preview…
              </div>
            )}

            {report && (
              <>
                <TransferStats report={report} />
                {report.target_provision_failures.length > 0 && (
                  <ProvisionFailures failures={report.target_provision_failures} />
                )}
                {report.samples.length > 0 && <SampleList samples={report.samples} />}
              </>
            )}

            {!routersLoading && !source && (
              <p className="text-sm text-foreground-muted">
                Select a source router to begin.
              </p>
            )}

            {!targetRouterId && !routersLoading && source && targets.length > 0 && (
              <p className="text-sm text-foreground-muted">
                Select a target router to preview which customers will move.
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={closeIfIdle}
                disabled={busy}
                className="btn-secondary sm:flex-1 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={busy || !previewReady}
                className="btn-primary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                title={previewReady ? undefined : 'Run a preview first'}
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : report?.selected != null ? (
                  `Move ${report.selected} ${report.selected === 1 ? 'customer' : 'customers'}`
                ) : (
                  'Move customers'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* A labelled on/off toggle row. */
function ToggleRow({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {hint && <p className="text-xs text-foreground-muted mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-accent-primary' : 'bg-background-tertiary border border-border'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

/* Count grid shared by the preview and the success state. */
function TransferStats({ report }: { report: TransferPPPoEReport }) {
  const counts: Array<[string, number]> = [
    ['Selected', report.selected],
    ['Active', report.active],
    ['Inactive', report.inactive],
    ['Pending', report.pending],
    ['Missing PW', report.missing_passwords],
  ];
  const provisionLabel = report.dry_run ? 'Provision req.' : 'Provisioned';
  const provisionValue = report.dry_run ? report.target_provision_required : report.target_provisioned;
  const provision: Array<[string, number]> = [
    report.dry_run ? ['Will move', report.selected] : ['Moved', report.moved],
    [provisionLabel, provisionValue],
    ['Prov. skipped', report.target_provision_skipped],
    ['Prov. failed', report.target_provision_failed],
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-background-tertiary px-3 py-2">
            <div className="text-xs text-foreground-muted">{label}</div>
            <div className="text-lg font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {provision.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-background-tertiary px-3 py-2">
            <div className="text-xs text-foreground-muted">{label}</div>
            <div className="text-base font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {report.warnings.length > 0 && (
        <div className="space-y-2">
          {report.warnings.slice(0, 4).map((warning) => (
            <div key={warning} className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Per-customer provisioning failures — shown so the operator can fix the router
 * and retry. The backend does not move ownership when these are present. */
function ProvisionFailures({ failures }: { failures: TransferPPPoEReport['target_provision_failures'] }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 space-y-2">
      <div className="text-sm font-medium text-danger">
        Target provisioning failed for {failures.length} customer{failures.length === 1 ? '' : 's'}
      </div>
      <div className="space-y-1.5">
        {failures.slice(0, 6).map((f, i) => (
          <div key={`${f.customer_id ?? 'na'}-${i}`} className="text-xs text-danger/90">
            <span className="font-mono">{f.pppoe_username || `#${f.customer_id ?? '?'}`}</span>: {f.error}
          </div>
        ))}
        {failures.length > 6 && (
          <div className="text-xs text-danger/70">…and {failures.length - 6} more</div>
        )}
      </div>
    </div>
  );
}

/* A short preview of the customers that will move. */
function SampleList({ samples }: { samples: TransferPPPoEReport['samples'] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2.5 bg-background-tertiary/50 text-sm font-medium text-foreground">
        Sample customers
      </div>
      <div className="divide-y divide-border">
        {samples.slice(0, 8).map((s) => (
          <div key={s.customer_id} className="flex items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.name || s.pppoe_username}</p>
              <p className="text-xs text-foreground-muted truncate font-mono">{s.pppoe_username}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {s.plan_name && <span className="text-xs text-foreground-muted hidden sm:inline">{s.plan_name}</span>}
              <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-neutral'} capitalize`}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
