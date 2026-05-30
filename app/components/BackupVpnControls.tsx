'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import {
  InsuranceWireGuardApplyResponse,
  InsuranceWireGuardConfigureResponse,
  InsuranceWireGuardPlanResponse,
  InsuranceWireGuardStatus,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';

type LoadingAction = 'status' | 'preview' | 'apply' | null;

interface BackupVpnControlsProps {
  routerId: number;
  routerName: string;
  compact?: boolean;
  className?: string;
}

const isPlanResponse = (
  result: InsuranceWireGuardConfigureResponse | null
): result is InsuranceWireGuardPlanResponse => Boolean(result && result.applied === false);

const isApplyResponse = (
  result: InsuranceWireGuardConfigureResponse | null
): result is InsuranceWireGuardApplyResponse => Boolean(result && result.applied === true);

function statusTone(status: InsuranceWireGuardStatus | null) {
  if (!status) {
    return {
      label: 'Unchecked',
      className: 'bg-background-tertiary text-foreground-muted border-border',
      dotClass: 'bg-foreground-muted',
      title: 'Backup VPN status has not been checked',
    };
  }

  if (status.active) {
    return {
      label: 'Backup active',
      className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      title: `${status.backup_ip} reachable from new server`,
    };
  }

  if (status.missing_settings?.length) {
    return {
      label: 'Config missing',
      className: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      dotClass: 'bg-amber-500',
      title: status.missing_settings.join(', '),
    };
  }

  if (status.verification?.ping_success && !status.verification?.tcp_success) {
    return {
      label: 'API blocked',
      className: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      dotClass: 'bg-amber-500',
      title: status.verification.tcp_error || 'Router ping works, API TCP check failed',
    };
  }

  return {
    label: 'Not active',
    className: 'bg-red-500/10 text-red-500 border-red-500/30',
    dotClass: 'bg-red-500',
    title: status.error || status.verification?.tcp_error || 'Backup VPN is not reachable',
  };
}

export default function BackupVpnControls({
  routerId,
  routerName,
  compact = false,
  className = '',
}: BackupVpnControlsProps) {
  const { showAlert } = useAlert();
  const [status, setStatus] = useState<InsuranceWireGuardStatus | null>(null);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [preview, setPreview] = useState<InsuranceWireGuardPlanResponse | null>(null);
  const [applyResult, setApplyResult] = useState<InsuranceWireGuardApplyResponse | null>(null);

  const tone = statusTone(status);
  const isBusy = loading !== null;

  const checkStatus = async () => {
    try {
      setLoading('status');
      const result = await api.getInsuranceWireGuardStatus(routerId);
      setStatus(result);
      if (result.active) {
        showAlert('success', `${routerName} backup VPN is active`);
      } else if (result.missing_settings?.length) {
        showAlert('warning', `Backup VPN config missing: ${result.missing_settings.join(', ')}`);
      } else {
        showAlert('warning', `${routerName} backup VPN is not active`);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to check backup VPN');
    } finally {
      setLoading(null);
    }
  };

  const openPreview = async () => {
    try {
      setLoading('preview');
      setApplyResult(null);
      const result = await api.configureInsuranceWireGuard(routerId, false);
      if (isPlanResponse(result)) {
        setPreview(result);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to preview backup VPN setup');
    } finally {
      setLoading(null);
    }
  };

  const applyBackup = async () => {
    try {
      setLoading('apply');
      const result = await api.configureInsuranceWireGuard(routerId, true);
      if (!isApplyResponse(result)) return;

      setApplyResult(result);
      setPreview(null);
      setStatus({
        success: result.success,
        active: Boolean(result.verification?.ping_success && result.verification?.tcp_success),
        router_id: result.router_id,
        router_name: result.router_name,
        current_ip: result.current_ip,
        backup_ip: result.backup_ip,
        verification: result.verification,
      });

      if (result.verification?.ping_success && result.verification?.tcp_success) {
        showAlert('success', `${result.router_name} backup VPN is active`);
      } else {
        showAlert('warning', `${result.router_name} backup VPN was configured, but verification is incomplete`);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to create backup VPN');
    } finally {
      setLoading(null);
    }
  };

  const hasMissingSettings = Boolean(preview?.missing_settings?.length);

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'flex-wrap'} ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${tone.className}`}
        title={tone.title}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dotClass}`} />
        {!compact && tone.label}
      </span>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); checkStatus(); }}
        disabled={isBusy}
        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-foreground-muted hover:text-emerald-500 transition-colors active:opacity-70 disabled:opacity-50"
        title="Check backup VPN"
      >
        {loading === 'status' ? (
          <span className="block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openPreview(); }}
        disabled={isBusy}
        className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-foreground-muted hover:text-accent-primary transition-colors active:opacity-70 disabled:opacity-50"
        title="Create backup VPN"
      >
        {loading === 'preview' || loading === 'apply' ? (
          <span className="block w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        )}
      </button>

      {preview && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isBusy && setPreview(null)} />
          <div className="relative w-full max-w-lg bg-background-secondary border border-border rounded-2xl p-5 shadow-xl animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Backup VPN Setup</h3>
                <p className="text-sm text-foreground-muted">{preview.router_name}</p>
              </div>
              <span className="text-xs font-mono rounded-lg bg-background-tertiary px-2 py-1 text-foreground-muted">
                {preview.backup_ip}
              </span>
            </div>

            {hasMissingSettings && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
                Missing: {preview.missing_settings.join(', ')}
              </div>
            )}

            <div className="mb-5 max-h-64 overflow-y-auto rounded-xl border border-border bg-background-tertiary/50 p-3">
              <ol className="space-y-2 text-sm text-foreground-muted">
                {preview.plan.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-background-secondary text-[11px] text-foreground">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={isBusy}
                className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:bg-background-tertiary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyBackup}
                disabled={isBusy || hasMissingSettings}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {loading === 'apply' ? 'Creating...' : 'Create Backup VPN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {applyResult && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApplyResult(null)} />
          <div className="relative w-full max-w-lg bg-background-secondary border border-border rounded-2xl p-5 shadow-xl animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Backup VPN Result</h3>
                <p className="text-sm text-foreground-muted">{applyResult.router_name}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                applyResult.verification.ping_success && applyResult.verification.tcp_success
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {applyResult.verification.ping_success && applyResult.verification.tcp_success ? 'Active' : 'Needs check'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="rounded-xl bg-background-tertiary p-3">
                <p className="text-xs text-foreground-muted">Backup IP</p>
                <p className="font-mono text-foreground">{applyResult.backup_ip}</p>
              </div>
              <div className="rounded-xl bg-background-tertiary p-3">
                <p className="text-xs text-foreground-muted">API Check</p>
                <p className={applyResult.verification.tcp_success ? 'text-emerald-500' : 'text-amber-500'}>
                  {applyResult.verification.tcp_success ? 'Reachable' : 'Failed'}
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background-tertiary/50 p-3">
              <ul className="space-y-1.5 text-sm text-foreground-muted">
                {applyResult.router_actions.map((action, index) => (
                  <li key={`${action}-${index}`} className="flex gap-2">
                    <span className="text-emerald-500">OK</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end mt-5">
              <button type="button" onClick={() => setApplyResult(null)} className="btn-primary text-sm px-4 py-2">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
