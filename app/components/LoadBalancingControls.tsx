'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import {
  Router,
  RouterInterfaceInfo,
  RouterInterfacesResponse,
  LoadBalancingStatus,
  LoadBalancingPreflightResponse,
  LoadBalancingEnableResponse,
  LoadBalancingDisableResponse,
  LoadBalancingVerifyResponse,
  LoadBalancingStep,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';
import ConfirmDialog from './ConfirmDialog';
import { formatDateGMT3 } from '../lib/dateUtils';

type LoadingAction =
  | 'status'
  | 'interfaces'
  | 'preflight'
  | 'enable'
  | 'disable'
  | 'verify'
  | null;

const PRIMARY_WAN = 'ether1';
const MAX_EXTRA_WANS = 3;

interface LoadBalancingControlsProps {
  router: Router;
  /** Called after enable/disable succeeds so the parent can refresh the list. */
  onChanged?: () => void;
  className?: string;
}

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

/** FastAPI HTTPException detail can be a structured dict; api.ts stringifies it. */
function parseStructuredError(message: string): {
  blockers?: string[];
  warnings?: string[];
  steps?: LoadBalancingStep[];
  message?: string;
  detail?: string;
} | null {
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    /* plain string error */
  }
  return null;
}

function formatDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function SplitArrowsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <span className={`block border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />;
}

function LinkDot({ up }: { up: boolean }) {
  return (
    <span className="flex items-center gap-1.5 flex-shrink-0">
      <span className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-foreground-muted/50'}`} />
      <span className={`text-[10px] font-medium ${up ? 'text-emerald-500' : 'text-foreground-muted'}`}>
        {up ? 'Link up' : 'No link'}
      </span>
    </span>
  );
}

function StepList({ steps }: { steps: LoadBalancingStep[] }) {
  return (
    <ul className="space-y-2 max-h-56 overflow-y-auto">
      {steps.map((s, i) => (
        <li key={`${s.step}-${i}`} className="flex items-start gap-2.5 text-sm">
          <span
            className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
              s.ok ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
            }`}
          >
            {s.ok ? (
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </span>
          <span className={`break-words ${s.ok ? 'text-foreground-muted' : 'text-red-400'}`}>
            {s.step}
            {!s.ok && s.detail != null && (
              <span className="block text-xs text-red-400/80 break-all">{formatDetail(s.detail)}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CompactKV({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).slice(0, 16);
  if (entries.length === 0) return null;
  return (
    <dl className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-foreground-muted font-mono truncate">{k}</dt>
          <dd className="text-foreground font-mono text-right break-all">
            {typeof v === 'object' && v !== null ? formatDetail(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function LoadBalancingControls({
  router,
  onChanged,
  className = '',
}: LoadBalancingControlsProps) {
  const { showAlert } = useAlert();
  const routerId = router.id;
  const routerName = router.name;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LoadBalancingStatus | null>(null);
  const [interfacesData, setInterfacesData] = useState<RouterInterfacesResponse | null>(null);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [preflight, setPreflight] = useState<LoadBalancingPreflightResponse | null>(null);
  const [serverBlockers, setServerBlockers] = useState<string[]>([]);
  const [enableResult, setEnableResult] = useState<LoadBalancingEnableResponse | null>(null);
  const [disableResult, setDisableResult] = useState<LoadBalancingDisableResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<LoadBalancingVerifyResponse | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const isBusy = loading !== null;
  const enabled = status ? status.enabled : Boolean(router.lb_enabled);
  const wanPortsConfigured =
    status?.config?.wan_ports ?? router.lb_config?.wan_ports ?? [];
  const appliedAt =
    status?.config?.applied_at ?? status?.applied_at ?? router.lb_applied_at ?? null;

  const loadStatus = useCallback(async () => {
    try {
      setLoading('status');
      const result = await api.getLoadBalancing(routerId);
      setStatus(result);
      return result;
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to check load balancing');
      return null;
    } finally {
      setLoading(null);
    }
  }, [routerId, showAlert]);

  const loadInterfaces = useCallback(async () => {
    try {
      setLoading('interfaces');
      const result = await api.getRouterInterfaces(routerId);
      setInterfacesData(result);
      return result;
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to load router ports');
      return null;
    } finally {
      setLoading(null);
    }
  }, [routerId, showAlert]);

  // When the sheet opens, fetch status, then the port list for the picker.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const result = await loadStatus();
      if (cancelled) return;
      if (result && !result.enabled) {
        await loadInterfaces();
      }
    })();
    return () => { cancelled = true; };
  }, [open, loadStatus, loadInterfaces]);

  // Lock body scroll while the sheet is open
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
      if (e.key === 'Escape' && !isBusy && !confirmDisable) handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isBusy, confirmDisable]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    if (isBusy) return;
    setOpen(false);
    // Keep status cached, clear ephemeral state
    setSelected([]);
    setPreflight(null);
    setServerBlockers([]);
    setEnableResult(null);
    setDisableResult(null);
    setVerifyResult(null);
    setConfirmDisable(false);
  };

  const wanPorts = useMemo(() => [PRIMARY_WAN, ...selected], [selected]);

  const togglePort = (name: string) => {
    setPreflight(null);
    setServerBlockers([]);
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      if (prev.length >= MAX_EXTRA_WANS) return prev;
      return [...prev, name];
    });
  };

  const runPreflight = useCallback(async () => {
    try {
      setLoading('preflight');
      setServerBlockers([]);
      const result = await api.preflightLoadBalancing(routerId, { wan_ports: wanPorts });
      setPreflight(result);
      if (result.blockers.length === 0) {
        showAlert('success', `Pre-check passed${result.warnings.length ? ' with warnings' : ''}`);
      } else {
        showAlert('warning', `Pre-check found ${result.blockers.length} blocker${result.blockers.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pre-check failed';
      const structured = parseStructuredError(message);
      if (structured?.blockers?.length) {
        setServerBlockers(structured.blockers);
        showAlert('error', structured.message || structured.detail || 'Pre-check found blockers');
      } else {
        showAlert('error', structured?.message || structured?.detail || message);
      }
    } finally {
      setLoading(null);
    }
  }, [routerId, wanPorts, showAlert]);

  const enableLb = useCallback(async () => {
    try {
      setLoading('enable');
      setDisableResult(null);
      const result = await api.enableLoadBalancing(routerId, {
        wan_ports: wanPorts,
        confirm: true,
      });
      setEnableResult(result);
      setPreflight(null);
      const now = new Date().toISOString();
      setStatus({
        success: true,
        router_id: routerId,
        enabled: true,
        config: { wan_ports: wanPorts, applied_at: now },
        applied_at: now,
      });
      if (result.success) {
        showAlert('success', result.message || `${routerName} load balancing enabled`);
      } else {
        showAlert('warning', result.message || 'Load balancing applied with issues');
      }
      onChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable load balancing';
      const structured = parseStructuredError(message);
      if (structured?.blockers?.length) {
        // Server-side preflight failed (422): surface blockers, force a new pre-check.
        setServerBlockers(structured.blockers);
        setPreflight(null);
        showAlert('error', structured.message || structured.detail || 'Enable blocked by pre-check');
      } else {
        showAlert('error', structured?.message || structured?.detail || message);
      }
    } finally {
      setLoading(null);
    }
  }, [routerId, routerName, wanPorts, showAlert, onChanged]);

  const disableLb = useCallback(async () => {
    try {
      setLoading('disable');
      const result = await api.disableLoadBalancing(routerId);
      setDisableResult(result);
      setEnableResult(null);
      setVerifyResult(null);
      setSelected([]);
      setPreflight(null);
      setStatus({
        success: true,
        router_id: routerId,
        enabled: false,
        config: null,
        applied_at: null,
      });
      setConfirmDisable(false);
      showAlert('success', result.message || `${routerName} load balancing disabled`);
      onChanged?.();
      // Refresh the port list for the picker (WAN ports are back to normal).
      loadInterfaces();
    } catch (err) {
      setConfirmDisable(false);
      showAlert('error', err instanceof Error ? err.message : 'Failed to disable load balancing');
    } finally {
      setLoading(null);
    }
  }, [routerId, routerName, showAlert, onChanged, loadInterfaces]);

  const runVerify = useCallback(async () => {
    try {
      setLoading('verify');
      const result = await api.verifyLoadBalancing(routerId);
      setVerifyResult(result);
      if (result.warnings.length > 0) {
        showAlert('warning', `Verification finished with ${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
      } else {
        showAlert('success', 'Load balancing verified');
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(null);
    }
  }, [routerId, showAlert]);

  // ── Derived picker data ────────────────────────────────────────────
  const etherPorts: RouterInterfaceInfo[] = (interfacesData?.interfaces ?? []).filter(
    (iface) => iface.type === 'ether'
  );
  const customerPorts = new Set<string>([
    ...(interfacesData?.pppoe_ports ?? []),
    ...(interfacesData?.plain_ports ?? []),
    ...(interfacesData?.dual_ports ?? []),
  ]);
  const allBlockers = [...(preflight?.blockers ?? []), ...serverBlockers];
  const canEnable =
    Boolean(preflight) &&
    (preflight?.blockers.length ?? 0) === 0 &&
    serverBlockers.length === 0 &&
    selected.length >= 1 &&
    !enableResult;
  const canPreflight = selected.length >= 1;

  const dot = enabled ? 'bg-emerald-500' : 'bg-foreground-muted';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`relative p-1.5 rounded-lg text-foreground-muted hover:text-info hover:bg-info/10 transition-colors active:opacity-70 ${className}`}
        title="Load balancing (Multi-WAN)"
        aria-label={`Load balancing for ${routerName}`}
      >
        <SplitArrowsIcon className="w-4 h-4" />
        <span className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ring-2 ring-background-secondary ${dot}`} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Load balancing"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
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
              <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-info/10 text-info ring-1 ${enabled ? 'ring-emerald-500/40' : 'ring-transparent'}`}>
                <SplitArrowsIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">Load Balancing (Multi-WAN)</h3>
                <p className="text-sm text-foreground-muted truncate">{routerName}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
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
              <div
                className={`rounded-xl border p-4 ${
                  enabled
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : loading === 'status' && !status
                    ? 'border-border bg-background-tertiary'
                    : 'border-border bg-background-tertiary/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    {enabled && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />}
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
                  </span>
                  <p className={`text-sm font-semibold ${enabled ? 'text-emerald-500' : 'text-foreground-muted'}`}>
                    {loading === 'status' && !status
                      ? 'Checking status...'
                      : enabled
                      ? 'Load balancing is active'
                      : 'Load balancing is off'}
                  </p>
                </div>
                <p className="text-xs text-foreground-muted mt-1.5 ml-5">
                  {enabled
                    ? 'Customer traffic is balanced across the WAN lines below with automatic failover.'
                    : 'This router uses a single internet line.'}
                </p>

                {enabled && (
                  <div className="mt-3 ml-5 flex flex-wrap items-center gap-1.5">
                    {wanPortsConfigured.map((p, i) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-xs font-mono text-foreground"
                      >
                        <span className="text-[10px] font-sans font-semibold text-emerald-500">WAN {i + 1}</span>
                        {p}
                      </span>
                    ))}
                    {appliedAt && (
                      <span className="text-[11px] text-foreground-muted ml-1">applied {formatSafeDate(appliedAt)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Enabled state ─────────────────────────────────────── */}
              {enabled && (
                <>
                  {/* Steps from the enable run (if we just enabled) */}
                  {enableResult && (
                    <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Setup steps</p>
                        <span className="text-[10px] text-foreground-muted">{enableResult.steps.length} steps</span>
                      </div>
                      <StepList steps={enableResult.steps} />
                      {enableResult.warnings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border space-y-1">
                          {enableResult.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-amber-500 break-words">{w}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dormant port note */}
                  {enableResult && enableResult.dormant_ports.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      {enableResult.dormant_ports.map((p) => (
                        <p key={p} className="text-xs text-foreground-muted">
                          <span className="font-mono text-amber-500">{p}</span> has no cable yet — traffic
                          fails over to the active line until it&apos;s plugged in.
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Verification result */}
                  {verifyResult && (
                    <div className="rounded-xl border border-border bg-background-tertiary/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Verification</p>
                        <span className={`text-[10px] font-medium ${verifyResult.enabled ? 'text-emerald-500' : 'text-red-500'}`}>
                          {verifyResult.enabled ? 'Active on router' : 'Not active on router'}
                        </span>
                      </div>

                      {verifyResult.wan_ips && Object.keys(verifyResult.wan_ips).length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1.5">WAN addresses</p>
                          <div className="space-y-1">
                            {Object.entries(verifyResult.wan_ips).map(([wan, ip]) => (
                              <div key={wan} className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-mono text-foreground-muted">{wan}</span>
                                <span className="font-mono text-foreground">{ip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {verifyResult.flow_attribution && Object.keys(verifyResult.flow_attribution).length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1.5">Flow attribution</p>
                          <CompactKV data={verifyResult.flow_attribution} />
                        </div>
                      )}

                      {verifyResult.counters && Object.keys(verifyResult.counters).length > 0 && (
                        <div className="pt-2 border-t border-border">
                          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1.5">Counters</p>
                          <CompactKV data={verifyResult.counters} />
                        </div>
                      )}

                      {verifyResult.lb_paid && verifyResult.lb_paid.length > 0 && (
                        <p className="text-xs text-foreground-muted pt-2 border-t border-border">
                          {verifyResult.lb_paid.length} paid customer{verifyResult.lb_paid.length > 1 ? 's' : ''} tracked on the balancer.
                        </p>
                      )}

                      {verifyResult.warnings.length > 0 && (
                        <div className="pt-2 border-t border-border space-y-1">
                          {verifyResult.warnings.map((w, i) => (
                            <p key={i} className="text-xs text-amber-500 break-words">{w}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Domain footnote */}
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Note: a single download rides one line — balancing spreads customer connections
                    across the lines, it does not split one download between them. Plan speed caps
                    still apply per customer.
                  </p>
                </>
              )}

              {/* ── Disabled state ────────────────────────────────────── */}
              {!enabled && status && (
                <>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    Combine 2+ internet lines on this router. Capacity is aggregated across customer
                    connections and failover is automatic — the hotspot login flow is not affected.
                  </p>

                  {/* Steps from a disable run */}
                  {disableResult && (
                    <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold mb-3">Teardown steps</p>
                      <StepList steps={disableResult.steps} />
                    </div>
                  )}

                  {/* WAN port picker */}
                  <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">WAN ports</p>
                      <span className="text-[10px] text-foreground-muted">
                        {wanPorts.length} of {MAX_EXTRA_WANS + 1} selected
                      </span>
                    </div>

                    {loading === 'interfaces' && !interfacesData ? (
                      <div className="flex items-center justify-center gap-3 py-6 text-sm text-foreground-muted">
                        <Spinner className="w-4 h-4" />
                        <span>Loading ports...</span>
                      </div>
                    ) : etherPorts.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-foreground-muted">No ethernet ports found.</p>
                        <button type="button" onClick={loadInterfaces} className="btn-secondary mt-3 text-xs">Retry</button>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {etherPorts.map((port) => {
                          const isPrimary = port.name === PRIMARY_WAN;
                          const servesCustomers = customerPorts.has(port.name);
                          const isSelected = selected.includes(port.name);
                          const selectionFull = selected.length >= MAX_EXTRA_WANS && !isSelected;
                          const disabledRow = isPrimary || servesCustomers || (selectionFull && !isSelected);
                          const wanIndex = isPrimary ? 1 : isSelected ? selected.indexOf(port.name) + 2 : null;
                          return (
                            <li key={port.name}>
                              <label
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                  isPrimary
                                    ? 'border-info/30 bg-info/5'
                                    : isSelected
                                    ? 'border-info/40 bg-info/10 cursor-pointer'
                                    : servesCustomers
                                    ? 'border-border bg-background-secondary/50 opacity-60'
                                    : selectionFull
                                    ? 'border-border opacity-60'
                                    : 'border-border hover:border-foreground-muted/30 cursor-pointer'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-current w-3.5 h-3.5 flex-shrink-0"
                                  checked={isPrimary || isSelected}
                                  disabled={disabledRow || isBusy}
                                  onChange={() => !isPrimary && togglePort(port.name)}
                                />
                                <span className="font-mono text-sm text-foreground flex-shrink-0">{port.name}</span>
                                {wanIndex != null && (
                                  <span className="text-[10px] font-semibold text-info bg-info/10 rounded px-1.5 py-0.5 flex-shrink-0">
                                    WAN {wanIndex}{isPrimary ? ' · primary' : ''}
                                  </span>
                                )}
                                {servesCustomers && (
                                  <span className="text-[10px] text-foreground-muted flex-shrink-0">serves customers</span>
                                )}
                                <span className="ml-auto">
                                  <LinkDot up={port.running} />
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <p className="text-[11px] text-foreground-muted mt-3">
                      {PRIMARY_WAN} is always WAN 1. Pick up to {MAX_EXTRA_WANS} more ports to plug
                      extra internet lines into.
                    </p>
                  </div>

                  {/* Blockers */}
                  {allBlockers.length > 0 && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm font-medium text-red-500">Blockers</p>
                      </div>
                      <ul className="text-xs text-foreground-muted space-y-1 ml-6 list-disc">
                        {allBlockers.map((b, i) => (
                          <li key={`${b}-${i}`} className="break-words">{b}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-foreground-muted mt-2">
                        Fix these and run the pre-check again before enabling.
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {preflight && preflight.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <p className="text-sm font-medium text-amber-500 mb-2">Warnings</p>
                      <ul className="text-xs text-foreground-muted space-y-1 ml-4 list-disc">
                        {preflight.warnings.map((w, i) => (
                          <li key={`${w}-${i}`} className="break-words">{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Per-port pre-check results */}
                  {preflight && Object.keys(preflight.per_port).length > 0 && (
                    <div className="rounded-xl border border-border bg-background-tertiary/40 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-foreground-muted font-semibold">Pre-check</p>
                        {preflight.verdict && (
                          <span className={`text-[10px] font-medium ${preflight.blockers.length === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {preflight.verdict}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {Object.entries(preflight.per_port).map(([name, check]) => (
                          <div key={name} className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-foreground w-16 flex-shrink-0">{name}</span>
                            {check.link !== undefined && (
                              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${check.link ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {check.link ? 'link up' : 'no link'}
                              </span>
                            )}
                            {check.in_bridge !== undefined && (
                              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${check.in_bridge ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {check.in_bridge ? 'in bridge' : 'not bridged'}
                              </span>
                            )}
                            {check.client_macs !== undefined && (
                              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${check.client_macs > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {check.client_macs} client{check.client_macs === 1 ? '' : 's'}
                              </span>
                            )}
                            {check.dhcp_bound !== undefined && (
                              <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${check.dhcp_bound ? 'bg-emerald-500/10 text-emerald-500' : 'bg-foreground-muted/10 text-foreground-muted'}`}>
                                {check.dhcp_bound ? 'DHCP bound' : 'no DHCP lease'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Applying */}
                  {loading === 'enable' && (
                    <div className="rounded-xl border border-border bg-background-tertiary/40 p-6 flex items-center justify-center gap-3 text-sm text-foreground-muted">
                      <Spinner className="w-4 h-4" />
                      <span>Applying load balancing configuration...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-border bg-background-secondary/95 backdrop-blur-sm flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-b-2xl">
              {enabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDisable(true)}
                    disabled={isBusy}
                    className="text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    Disable
                  </button>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={runVerify}
                      disabled={isBusy}
                      className="btn-secondary text-sm flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {loading === 'verify' ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span>Verify now</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isBusy}
                      className="btn-primary text-sm w-full sm:w-auto disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={runPreflight}
                    disabled={isBusy || !canPreflight}
                    className="btn-secondary text-sm flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                    title={canPreflight ? undefined : 'Select at least one extra WAN port first'}
                  >
                    {loading === 'preflight' ? (
                      <Spinner className="w-4 h-4" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    )}
                    <span>Run pre-check</span>
                  </button>
                  <button
                    type="button"
                    onClick={enableLb}
                    disabled={!canEnable || isBusy}
                    className="btn-primary text-sm w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={canEnable ? undefined : 'Run a clean pre-check first'}
                  >
                    {loading === 'enable' ? (
                      <>
                        <Spinner className="w-4 h-4" />
                        <span>Enabling...</span>
                      </>
                    ) : (
                      <>
                        <SplitArrowsIcon className="w-4 h-4" />
                        <span>Enable load balancing</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <ConfirmDialog
            isOpen={confirmDisable}
            onClose={() => { if (loading !== 'disable') setConfirmDisable(false); }}
            onConfirm={disableLb}
            title="Disable load balancing?"
            message={`${routerName} will go back to a single internet line on ${PRIMARY_WAN}. Customers stay online during the change.`}
            confirmLabel="Disable"
            variant="danger"
            loading={loading === 'disable'}
          />
        </div>,
        document.body
      )}
    </>
  );
}
