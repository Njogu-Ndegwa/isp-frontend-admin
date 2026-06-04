'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import {
  InsuranceWireGuardApplyResponse,
  InsuranceWireGuardConfigureResponse,
  InsuranceWireGuardPlanResponse,
  InsuranceWireGuardStatus,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';

type LoadingAction = 'status' | 'preview' | 'apply' | null;
type Tone = 'active' | 'inactive' | 'missing' | 'partial' | 'unknown';
type TunnelType = 'wireguard' | 'l2tp' | 'auto' | null | undefined;

interface BackupVpnControlsProps {
  routerId: number;
  routerName: string;
  /** Reserved for future variations of the trigger. */
  compact?: boolean;
  className?: string;
}

const isPlanResponse = (
  result: InsuranceWireGuardConfigureResponse | null
): result is InsuranceWireGuardPlanResponse => Boolean(result && result.applied === false);

const isApplyResponse = (
  result: InsuranceWireGuardConfigureResponse | null
): result is InsuranceWireGuardApplyResponse => Boolean(result && result.applied === true);

function deriveTone(status: InsuranceWireGuardStatus | null): Tone {
  if (!status) return 'unknown';
  if (status.active) return 'active';
  if (status.missing_settings && status.missing_settings.length > 0) return 'missing';
  if (status.verification?.ping_success && !status.verification?.tcp_success) return 'partial';
  return 'inactive';
}

const TONE_DOT: Record<Tone, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-red-500',
  missing: 'bg-amber-500',
  partial: 'bg-amber-500',
  unknown: 'bg-foreground-muted',
};

const TONE_RING: Record<Tone, string> = {
  active: 'ring-emerald-500/40',
  inactive: 'ring-red-500/40',
  missing: 'ring-amber-500/40',
  partial: 'ring-amber-500/40',
  unknown: 'ring-transparent',
};

const TONE_HERO: Record<Tone, { bg: string; border: string; text: string; label: string; sub: string }> = {
  active: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    label: 'Insurance tunnel is active',
    sub: 'The router is reachable through the backup tunnel.',
  },
  inactive: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-500',
    label: 'Insurance tunnel not active',
    sub: 'Create the backup configuration to enable failover.',
  },
  missing: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    label: 'Configuration incomplete',
    sub: 'Some settings are missing — review them before applying.',
  },
  partial: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    label: 'Partially reachable',
    sub: 'Ping works but the API port is not reachable.',
  },
  unknown: {
    bg: 'bg-background-tertiary',
    border: 'border-border',
    text: 'text-foreground-muted',
    label: 'Checking status...',
    sub: 'Verifying the insurance tunnel configuration.',
  },
};

function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <span className={`block border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />;
}

function formatTunnelType(type: TunnelType): string {
  if (type === 'wireguard') return 'WireGuard';
  if (type === 'l2tp') return 'L2TP/IPsec';
  if (type === 'auto') return 'Auto detect';
  return 'Unknown';
}

export default function BackupVpnControls({
  routerId,
  routerName,
  className = '',
}: BackupVpnControlsProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<InsuranceWireGuardStatus | null>(null);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [preview, setPreview] = useState<InsuranceWireGuardPlanResponse | null>(null);
  const [applyResult, setApplyResult] = useState<InsuranceWireGuardApplyResponse | null>(null);

  const tone = deriveTone(status);
  const isBusy = loading !== null;

  const checkStatus = useCallback(async (silent = false) => {
    try {
      setLoading('status');
      const result = await api.getInsuranceWireGuardStatus(routerId);
      setStatus(result);
      if (!silent) {
        if (result.active) {
          showAlert('success', `${routerName} insurance tunnel is active`);
        } else if (result.missing_settings?.length) {
          showAlert('warning', `Missing config: ${result.missing_settings.join(', ')}`);
        }
      }
      return result;
    } catch (err) {
      if (!silent) {
        showAlert('error', err instanceof Error ? err.message : 'Failed to check insurance tunnel');
      }
      return null;
    } finally {
      setLoading(null);
    }
  }, [routerId, routerName, showAlert]);

  const loadPreview = useCallback(async () => {
    try {
      setLoading('preview');
      setApplyResult(null);
      const result = await api.configureInsuranceWireGuard(routerId, false);
      if (isPlanResponse(result)) {
        setPreview(result);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load setup plan');
    } finally {
      setLoading(null);
    }
  }, [routerId, showAlert]);

  const applyBackup = useCallback(async () => {
    try {
      setLoading('apply');
      const result = await api.configureInsuranceWireGuard(routerId, true);
      if (!isApplyResponse(result)) return;

      setApplyResult(result);
      setPreview(null);
      const active = Boolean(result.verification?.ping_success && result.verification?.tcp_success);
      setStatus({
        success: result.success,
        active,
        router_id: result.router_id,
        router_name: result.router_name,
        current_ip: result.current_ip,
        backup_ip: result.backup_ip,
        tunnel_type: result.tunnel_type,
        token_vpn_type: result.token_vpn_type,
        verification: result.verification,
      });

      if (active) {
        showAlert('success', `${result.router_name} insurance tunnel is active`);
      } else {
        showAlert('warning', `${result.router_name} configured, verification incomplete`);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create insurance tunnel');
    } finally {
      setLoading(null);
    }
  }, [routerId, showAlert]);

  // When the dialog opens, auto-check status and (if not active) load the plan
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const result = await checkStatus(true);
      if (cancelled) return;
      if (result && !result.active) {
        await loadPreview();
      }
    })();
    return () => { cancelled = true; };
  }, [open, checkStatus, loadPreview]);

  // Lock body scroll while dialog is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isBusy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    if (isBusy) return;
    setOpen(false);
    // Keep status cached, clear ephemeral state
    setPreview(null);
    setApplyResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`relative p-1.5 rounded-lg text-foreground-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors active:opacity-70 ${className}`}
        title="Insurance tunnel"
        aria-label={`Insurance tunnel for ${routerName}`}
      >
        <ShieldIcon className="w-4 h-4" />
        {status && (
          <span
            className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-2 ring-background-secondary ${TONE_DOT[tone]}`}
          />
        )}
      </button>

      {open && (
        <BackupVpnDialog
          routerName={routerName}
          status={status}
          preview={preview}
          applyResult={applyResult}
          loading={loading}
          tone={tone}
          isBusy={isBusy}
          onRecheck={() => checkStatus(false)}
          onLoadPreview={loadPreview}
          onApply={applyBackup}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

function BackupVpnDialog({
  routerName,
  status,
  preview,
  applyResult,
  loading,
  tone,
  isBusy,
  onRecheck,
  onLoadPreview,
  onApply,
  onClose,
}: {
  routerName: string;
  status: InsuranceWireGuardStatus | null;
  preview: InsuranceWireGuardPlanResponse | null;
  applyResult: InsuranceWireGuardApplyResponse | null;
  loading: LoadingAction;
  tone: Tone;
  isBusy: boolean;
  onRecheck: () => void;
  onLoadPreview: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  if (typeof window === 'undefined') return null;

  const hero = TONE_HERO[tone];
  const currentIp = applyResult?.current_ip ?? preview?.current_ip ?? status?.current_ip;
  const backupIp = applyResult?.backup_ip ?? preview?.backup_ip ?? status?.backup_ip;
  const tunnelType = applyResult?.tunnel_type ?? preview?.tunnel_type ?? status?.tunnel_type;
  const tokenVpnType = applyResult?.token_vpn_type ?? preview?.token_vpn_type ?? status?.token_vpn_type;
  const routerOsVersion = applyResult?.routeros_version;
  const verification = applyResult?.verification ?? status?.verification;
  const missingSettings = preview?.missing_settings ?? status?.missing_settings ?? [];
  const isActive = tone === 'active';
  const canApply = Boolean(preview) && missingSettings.length === 0 && !applyResult;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Insurance tunnel"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Sheet / Card */}
      <div
        className="
          relative w-full sm:max-w-lg
          bg-background-secondary border-t sm:border border-border
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl
          max-h-[92vh] sm:max-h-[88vh]
          flex flex-col
          animate-slide-up sm:animate-fade-in
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <span className="w-10 h-1 rounded-full bg-foreground-muted/40" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 sm:pt-5 pb-4 flex items-start gap-3">
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 ring-1 ${TONE_RING[tone]}`}>
            <ShieldIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">Insurance Tunnel</h3>
            <p className="text-sm text-foreground-muted truncate">{routerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Status hero */}
          <div className={`rounded-xl border ${hero.border} ${hero.bg} p-4`}>
            <div className="flex items-center gap-2.5">
              <span className={`relative flex h-2.5 w-2.5`}>
                {isActive && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${TONE_DOT[tone]}`} />
              </span>
              <p className={`text-sm font-semibold ${hero.text}`}>
                {loading === 'status' && !status ? 'Checking status...' : hero.label}
              </p>
            </div>
            <p className="text-xs text-foreground-muted mt-1.5 ml-5">{hero.sub}</p>

            {status?.error && (
              <p className="text-xs text-red-400 mt-2 ml-5 break-words">{status.error}</p>
            )}
          </div>

          {/* IP route card */}
          {(currentIp || backupIp) && (
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-foreground-muted mb-3 font-semibold">Tunnel</p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-foreground-muted">
                  Type: <span className="ml-1 font-medium text-foreground">{formatTunnelType(tunnelType)}</span>
                </span>
                {tokenVpnType && (
                  <span className="inline-flex items-center rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-foreground-muted">
                    Token: <span className="ml-1 font-medium text-foreground">{formatTunnelType(tokenVpnType)}</span>
                  </span>
                )}
                {routerOsVersion && (
                  <span className="inline-flex items-center rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-foreground-muted">
                    RouterOS: <span className="ml-1 font-medium text-foreground">{routerOsVersion}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Current</p>
                  <p className="font-mono text-sm text-foreground truncate">{currentIp || '—'}</p>
                </div>
                <svg className="w-5 h-5 text-foreground-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-muted">Backup</p>
                  <p className="font-mono text-sm text-foreground truncate">{backupIp || '—'}</p>
                </div>
              </div>

              {verification && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                  <VerifyChip
                    label="Ping"
                    ok={verification.ping_success}
                    detail={verification.ping_stderr}
                  />
                  <VerifyChip
                    label="API"
                    ok={verification.tcp_success}
                    detail={verification.tcp_error || undefined}
                  />
                </div>
              )}
            </div>
          )}

          {/* Missing settings */}
          {missingSettings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-amber-500">Missing settings</p>
              </div>
              <ul className="text-xs text-foreground-muted space-y-1 ml-6 list-disc">
                {missingSettings.map((s) => (
                  <li key={s} className="font-mono">{s}</li>
                ))}
              </ul>
              <p className="text-xs text-foreground-muted mt-2">
                Configure these in admin settings before applying the insurance tunnel setup.
              </p>
            </div>
          )}

          {/* Result (after apply) */}
          {applyResult && (
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Actions performed</p>
                <span className="text-[10px] text-foreground-muted">{applyResult.router_actions.length} steps</span>
              </div>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {applyResult.router_actions.map((action, i) => (
                  <li key={`${action}-${i}`} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mt-0.5">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="break-words">{action}</span>
                  </li>
                ))}
              </ul>

              {applyResult.router_public_key && (
                <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">Router public key</p>
                <p className="font-mono text-[11px] text-foreground break-all">{applyResult.router_public_key}</p>
              </div>
              )}
              {applyResult.l2tp_username && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">L2TP user</p>
                  <p className="font-mono text-[11px] text-foreground break-all">{applyResult.l2tp_username}</p>
                </div>
              )}
            </div>
          )}

          {/* Setup plan (before apply) */}
          {!applyResult && preview && preview.plan.length > 0 && (
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Setup plan</p>
                <span className="text-[10px] text-foreground-muted">{preview.plan.length} steps</span>
              </div>
              <ol className="space-y-2 max-h-56 overflow-y-auto">
                {preview.plan.map((step, i) => (
                  <li key={`${step}-${i}`} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary text-[11px] font-medium flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="break-words">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Loading plan state */}
          {!applyResult && !preview && !isActive && loading === 'preview' && (
            <div className="rounded-xl border border-border bg-background-tertiary/40 p-6 flex items-center justify-center gap-3 text-sm text-foreground-muted">
              <Spinner className="w-4 h-4" />
              <span>Loading setup plan...</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border bg-background-secondary/95 backdrop-blur-sm flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRecheck}
              disabled={isBusy}
              className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading === 'status' ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Re-check</span>
            </button>
            {applyResult || isActive ? null : (
              <button
                type="button"
                onClick={onLoadPreview}
                disabled={isBusy || loading === 'preview'}
                className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-50"
                title="Reload plan"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Reload plan</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {applyResult ? (
              <button
                type="button"
                onClick={onClose}
                className="btn-primary text-sm w-full sm:w-auto"
              >
                Done
              </button>
            ) : isActive ? (
              <button
                type="button"
                onClick={onLoadPreview}
                disabled={isBusy}
                className="btn-secondary text-sm w-full sm:w-auto disabled:opacity-50"
              >
                Reconfigure
              </button>
            ) : (
              <button
                type="button"
                onClick={onApply}
                disabled={!canApply || isBusy}
                className="btn-primary text-sm w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'apply' ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <ShieldIcon className="w-4 h-4" />
                    <span>Create Insurance Tunnel</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function VerifyChip({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
        ok
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-red-500/10 text-red-500'
      }`}
      title={detail || undefined}
    >
      {ok ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{label}</span>
      <span className="ml-auto opacity-80">{ok ? 'OK' : 'Fail'}</span>
    </div>
  );
}
