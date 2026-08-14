'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, OutageOverlapError } from '../lib/api';
import {
  OutageApplyResponse,
  OutagePreviewResponse,
  Router,
} from '../lib/types';
import DateTimePicker from '../components/DateTimePicker';
import { formatDuration } from '../lib/format';
import { formatDateGMT3 } from '../lib/dateUtils';

interface OutageCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  routers: Router[];
  onApplied: () => void;
}

type Step = 'window' | 'preview' | 'done';

const pad = (n: number) => String(n).padStart(2, '0');

const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const formatSafeWhen = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
};

const QUICK_WINDOWS = [
  { label: 'Last 1h', hours: 1 },
  { label: 'Last 3h', hours: 3 },
  { label: 'Last 6h', hours: 6 },
  { label: 'Last 12h', hours: 12 },
  { label: 'Last 24h', hours: 24 },
];

export default function OutageCompensationModal({
  isOpen,
  onClose,
  routers,
  onApplied,
}: OutageCompensationModalProps) {
  const [step, setStep] = useState<Step>('window');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allRouters, setAllRouters] = useState(true);
  const [selectedRouterIds, setSelectedRouterIds] = useState<Set<number>>(new Set());
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<OutagePreviewResponse | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState<string | null>(null);
  const [result, setResult] = useState<OutageApplyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setStep('window');
      setStart(toLocalInput(new Date(now.getTime() - 3 * 3600_000)));
      setEnd(toLocalInput(now));
      setAllRouters(true);
      setSelectedRouterIds(new Set());
      setNote('');
      setPreview(null);
      setExcluded(new Set());
      setAllowDuplicate(false);
      setOverlapMessage(null);
      setResult(null);
      setError(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const windowValid = useMemo(() => {
    if (!start || !end) return false;
    const s = new Date(start);
    const e = new Date(end);
    return !isNaN(s.getTime()) && !isNaN(e.getTime()) && s < e;
  }, [start, end]);

  const includedCustomers = useMemo(
    () => (preview ? preview.customers.filter((c) => !excluded.has(c.customer_id)) : []),
    [preview, excluded]
  );
  const includedSeconds = useMemo(
    () => includedCustomers.reduce((sum, c) => sum + c.credited_seconds, 0),
    [includedCustomers]
  );

  const applyQuickWindow = (hours: number) => {
    const now = new Date();
    setStart(toLocalInput(new Date(now.getTime() - hours * 3600_000)));
    setEnd(toLocalInput(now));
  };

  const toggleRouter = (id: number) => {
    setSelectedRouterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCustomer = (id: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildWindowRequest = () => ({
    outage_start: new Date(start).toISOString(),
    outage_end: new Date(end).toISOString(),
    ...(allRouters ? {} : { router_ids: Array.from(selectedRouterIds) }),
  });

  const handlePreview = async () => {
    if (!windowValid) {
      setError('Pick a valid outage window — the start must be before the end.');
      return;
    }
    if (!allRouters && selectedRouterIds.size === 0) {
      setError('Select at least one router, or switch back to all routers.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.previewOutageCompensation(buildWindowRequest());
      setPreview(res);
      setExcluded(new Set());
      setAllowDuplicate(false);
      setOverlapMessage(null);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview compensation');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.applyOutageCompensation({
        ...buildWindowRequest(),
        ...(excluded.size > 0 ? { exclude_customer_ids: Array.from(excluded) } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        allow_duplicate: allowDuplicate,
      });
      setResult(res);
      setStep('done');
      onApplied();
    } catch (err) {
      if (err instanceof OutageOverlapError) {
        setOverlapMessage(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to apply compensation');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const showOverlapWarning =
    overlapMessage !== null || (preview !== null && preview.already_compensated.length > 0);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between p-5 pb-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {step === 'window' && 'Compensate an Outage'}
              {step === 'preview' && 'Preview — Who Gets Time Back'}
              {step === 'done' && 'Compensation Applied'}
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              {step === 'window' && 'Pick the downtime window; everyone with an active package gets it back.'}
              {step === 'preview' && 'Untick anyone who should not be extended, then apply.'}
              {step === 'done' && 'Every affected customer just got their lost time back.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {step === 'window' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Quick pick</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_WINDOWS.map((w) => (
                    <button
                      key={w.hours}
                      onClick={() => applyQuickWindow(w.hours)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary hover:text-foreground transition-colors"
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1.5">Outage started</label>
                  <DateTimePicker value={start} onChange={setStart} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1.5">Outage ended</label>
                  <DateTimePicker value={end} onChange={setEnd} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Routers affected</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setAllRouters(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      allRouters
                        ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                        : 'border-border text-foreground-muted hover:bg-background-tertiary'
                    }`}
                  >
                    All routers
                  </button>
                  <button
                    onClick={() => setAllRouters(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      !allRouters
                        ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                        : 'border-border text-foreground-muted hover:bg-background-tertiary'
                    }`}
                  >
                    Only some routers
                  </button>
                </div>
                {!allRouters && (
                  <div className="border border-border rounded-xl max-h-44 overflow-y-auto divide-y divide-border">
                    {routers.length === 0 ? (
                      <p className="text-sm text-foreground-muted p-3">No routers found</p>
                    ) : (
                      routers.map((r) => (
                        <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background-tertiary/50">
                          <input
                            type="checkbox"
                            checked={selectedRouterIds.has(r.id)}
                            onChange={() => toggleRouter(r.id)}
                            className="w-4 h-4 rounded accent-emerald-500"
                          />
                          <span className="text-sm text-foreground truncate">{r.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                  Note <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. KPLC power cut, fiber repair"
                  className="input"
                />
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Downtime</p>
                  <p className="text-lg font-bold">{formatDuration(preview.outage_seconds)}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Customers</p>
                  <p className="text-lg font-bold">{includedCustomers.length}</p>
                </div>
                <div className="card p-3 bg-background-tertiary/50">
                  <p className="text-xs text-foreground-muted mb-0.5">Time to credit</p>
                  <p className="text-lg font-bold text-emerald-500">{formatDuration(includedSeconds)}</p>
                </div>
              </div>

              <p className="text-xs text-foreground-muted">
                {formatSafeWhen(preview.outage_start)} → {formatSafeWhen(preview.outage_end)}
                {preview.routers.length > 0 && (
                  <> · {preview.routers.map((r) => r.name).join(', ')}</>
                )}
              </p>

              {showOverlapWarning && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p className="text-sm text-amber-500 font-medium">
                    {overlapMessage || 'Part of this window was already compensated:'}
                  </p>
                  {preview.already_compensated.map((run) => (
                    <p key={run.id} className="text-xs text-amber-500/90">
                      {formatSafeWhen(run.outage_start)} → {formatSafeWhen(run.outage_end)} · {run.customers_credited} customers
                      {run.created_at ? ` · applied ${formatSafeWhen(run.created_at)}` : ''}
                    </p>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={allowDuplicate}
                      onChange={(e) => setAllowDuplicate(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span className="text-sm text-amber-500">Compensate anyway (credit on top of the previous run)</span>
                  </label>
                </div>
              )}

              {preview.customers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-foreground-muted text-sm">
                    No customers had an active package during this window.
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-background-tertiary/50 border-b border-border">
                    <span className="text-xs font-medium text-foreground-muted">
                      {includedCustomers.length} of {preview.customers.length} selected
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExcluded(new Set())}
                        className="text-xs text-accent-primary hover:underline"
                      >
                        All
                      </button>
                      <button
                        onClick={() => setExcluded(new Set(preview.customers.map((c) => c.customer_id)))}
                        className="text-xs text-accent-primary hover:underline"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {preview.customers.map((c) => (
                      <label
                        key={c.customer_id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-background-tertiary/50"
                      >
                        <input
                          type="checkbox"
                          checked={!excluded.has(c.customer_id)}
                          onChange={() => toggleCustomer(c.customer_id)}
                          className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.name || `Customer #${c.customer_id}`}
                          </p>
                          <p className="text-xs text-foreground-muted truncate">
                            {c.phone || '—'}
                            {c.plan_name ? ` · ${c.plan_name}` : ''}
                            {c.connection_type ? ` · ${c.connection_type}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-emerald-500">+{formatDuration(c.credited_seconds)}</p>
                          {c.new_expiry && (
                            <p className="text-[11px] text-foreground-muted hidden sm:block">
                              to {formatSafeWhen(c.new_expiry)}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {preview.skipped_expired.length > 0 && (
                <details className="border border-border rounded-xl px-3 py-2">
                  <summary className="text-xs text-foreground-muted cursor-pointer select-none">
                    {preview.skipped_expired.length} already-expired customer{preview.skipped_expired.length === 1 ? '' : 's'} skipped
                    (expired before the outage ended — nothing to give back)
                  </summary>
                  <div className="mt-2 space-y-1">
                    {preview.skipped_expired.map((c) => (
                      <p key={c.customer_id} className="text-xs text-foreground-muted truncate">
                        {c.name || `Customer #${c.customer_id}`} · {c.phone || '—'}
                        {c.expiry ? ` · expired ${formatSafeWhen(c.expiry)}` : ''}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {result.customers_credited} customer{result.customers_credited === 1 ? '' : 's'} credited
              </p>
              <p className="text-sm text-foreground-muted">
                {formatDuration(result.total_seconds_credited)} of lost time given back automatically.
              </p>
              {result.companion_devices_updated > 0 && (
                <p className="text-xs text-foreground-muted mt-2">
                  {result.companion_devices_updated} shared device{result.companion_devices_updated === 1 ? '' : 's'} moved with their owner.
                </p>
              )}
              {result.skipped_expired.length > 0 && (
                <p className="text-xs text-foreground-muted mt-1">
                  {result.skipped_expired.length} already-expired customer{result.skipped_expired.length === 1 ? '' : 's'} skipped.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end p-5 pt-0">
          {step === 'window' && (
            <>
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={loading || !windowValid}
                className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Preview affected customers'}
              </button>
            </>
          )}
          {step === 'preview' && preview && (
            <>
              <button
                onClick={() => { setStep('window'); setError(null); setOverlapMessage(null); }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleApply}
                disabled={loading || includedCustomers.length === 0 || (showOverlapWarning && !allowDuplicate)}
                className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {loading
                  ? 'Applying...'
                  : `Extend ${includedCustomers.length} customer${includedCustomers.length === 1 ? '' : 's'}`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="btn-primary px-4 py-2 text-sm font-semibold">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
