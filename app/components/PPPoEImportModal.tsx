'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type {
  Router,
  PPPoECustomerImportResponse,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';

interface PPPoEImportModalProps {
  onClose: () => void;
  /** Called after a successful (non-dry-run) apply so the parent can refresh. */
  onImported: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Expected workbook schema — mirrors the backend parser
// (services/pppoe_customer_import.py: normalize_workbook_rows). Kept here as
// the single source of in-app guidance so admins know what to upload before
// they hit a row-level error.
const EXPECTED_COLUMNS: Array<{
  label: string;
  requirement: 'required' | 'recommended' | 'optional';
  aliases: string;
  note?: string;
}> = [
  { label: 'Username', requirement: 'required', aliases: 'or "PPPoE Username", "User Name"', note: 'Must be unique within the sheet' },
  { label: 'Package', requirement: 'required', aliases: 'or "Plan"', note: 'Matched to an existing PPPoE plan by name or speed' },
  { label: 'Status', requirement: 'required', aliases: '', note: 'active / expired / pending (see accepted values)' },
  { label: 'Name', requirement: 'recommended', aliases: 'or "Names", "Customer Name"', note: 'Falls back to the username if blank' },
  { label: 'Phone', requirement: 'recommended', aliases: 'or "Phone Number", "MSISDN"' },
  { label: 'Expiry', requirement: 'recommended', aliases: 'or "Expires At"', note: 'Several date formats accepted' },
  { label: 'Activity', requirement: 'optional', aliases: '' },
  { label: 'Location', requirement: 'optional', aliases: 'or "Address"' },
];

const REQUIREMENT_BADGE: Record<'required' | 'recommended' | 'optional', string> = {
  required: 'badge-danger',
  recommended: 'badge-warning',
  optional: 'badge-neutral',
};

export default function PPPoEImportModal({ onClose, onImported }: PPPoEImportModalProps) {
  const { showAlert } = useAlert();

  const [routers, setRouters] = useState<Router[]>([]);
  const [routersLoading, setRoutersLoading] = useState(true);
  const [routerId, setRouterId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PPPoECustomerImportResponse | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const report = result?.report ?? result?.parse_report ?? null;
  // A preview (dry-run) succeeded → the apply button is unlocked.
  const previewReady = Boolean(result?.success && report?.dry_run === true);
  // A real import committed → swap the form out for the success state.
  const applied = Boolean(result?.success && report?.dry_run === false);

  // Load the user's routers once when the modal mounts. The modal is
  // conditionally rendered by the parent, so a fresh mount also guarantees a
  // clean slate (no stale file/report from a previous open).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getRouters();
        if (cancelled) return;
        setRouters(list);
        if (list.length > 0) setRouterId(String(list[0].id));
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

  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const acceptFile = useCallback((candidate: File | null) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.xlsx')) {
      setError('Unsupported file type — export the workbook as .xlsx (Excel).');
      return;
    }
    if (candidate.size === 0) {
      setError('That file is empty.');
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setError(`File is ${formatBytes(candidate.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    setFile(candidate);
    setResult(null);
    setError(null);
    setShowGuide(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (busy) return;
    acceptFile(e.dataTransfer.files?.[0] ?? null);
  }, [acceptFile, busy]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!busy) setDragActive(true);
  }, [busy]);

  const clearFile = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const runImport = useCallback(async (apply: boolean) => {
    if (!routerId) { showAlert('error', 'Select a router'); return; }
    if (!file) { showAlert('error', 'Select an Excel file'); return; }

    setBusy(true);
    setError(null);
    try {
      const res = await api.importPPPoECustomers(Number(routerId), { file, apply });
      setResult(res);
      const rep = res.report ?? res.parse_report;
      if (!res.success) {
        const firstError = rep?.errors?.[0] || 'Import has errors';
        setError(firstError);
        showAlert('error', firstError);
        return;
      }
      const created = rep?.created ?? 0;
      const updated = rep?.updated ?? 0;
      showAlert(
        'success',
        apply
          ? `Imported ${created} new and updated ${updated} customers`
          : `Preview ready: ${created} new, ${updated} updates`,
      );
      if (apply) onImported();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      showAlert('error', message);
    } finally {
      setBusy(false);
    }
  }, [file, routerId, onImported, showAlert]);

  const closeIfIdle = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

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
            <h3 className="text-lg font-semibold text-foreground">Import PPPoE Customers</h3>
            <p className="text-sm text-foreground-muted">
              {file?.name || 'Upload an exported Excel workbook (.xlsx)'}
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
                <h4 className="text-base font-semibold text-foreground">Import complete</h4>
                <p className="text-sm text-foreground-muted">
                  Created {report?.created ?? 0} new and updated {report?.updated ?? 0} customers
                  {result?.router_name ? ` on ${result.router_name}` : ''}.
                </p>
              </div>
            </div>

            {report && <ReportStats report={report} />}

            <button
              onClick={onClose}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        ) : (
          /* ---------- Form state ---------- */
          <>
            {/* Router + file picker */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Router</label>
                <select
                  value={routerId}
                  onChange={(e) => { setRouterId(e.target.value); resetResult(); }}
                  className="select"
                  disabled={busy || routersLoading}
                >
                  {routersLoading ? (
                    <option value="">Loading routers…</option>
                  ) : (
                    <>
                      <option value="">Select router</option>
                      {routers.map((router) => (
                        <option key={router.id} value={router.id}>{router.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1.5">Workbook</label>
                {/* Drop zone doubles as the file picker trigger */}
                <label
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={() => setDragActive(false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-accent-primary bg-accent-primary/5'
                      : 'border-border hover:border-accent-primary/50 hover:bg-background-tertiary/50'
                  } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx"
                    disabled={busy}
                    onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                  </svg>
                  <span className="text-xs text-foreground-muted">
                    <span className="text-accent-primary font-medium">Click to browse</span> or drag a .xlsx file here
                  </span>
                </label>
              </div>
            </div>

            {/* Selected-file chip */}
            {file && (
              <div className="flex items-center gap-3 rounded-lg bg-background-tertiary px-3 py-2">
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-foreground-muted">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={clearFile}
                  disabled={busy}
                  className="p-1 rounded-md hover:bg-background-secondary text-foreground-muted hover:text-danger disabled:opacity-40 shrink-0"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Expected-format guidance */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-background-tertiary/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What should the file contain?
                </span>
                <svg
                  className={`w-4 h-4 text-foreground-muted transition-transform ${showGuide ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showGuide && (
                <div className="px-4 py-3 border-t border-border space-y-3 text-sm">
                  <p className="text-foreground-muted">
                    Upload the <span className="font-medium text-foreground">.xlsx</span> export with a sheet named{' '}
                    <code className="px-1 py-0.5 rounded bg-background-tertiary text-foreground text-xs font-mono">Items</code>.
                    The first row must be the column headers. Each remaining row is one customer.
                  </p>

                  <div className="space-y-1.5">
                    {EXPECTED_COLUMNS.map((col) => (
                      <div key={col.label} className="flex items-start gap-2">
                        <span className={`badge ${REQUIREMENT_BADGE[col.requirement]} shrink-0 mt-0.5 capitalize`}>
                          {col.requirement}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-foreground">{col.label}</span>
                          {col.aliases && (
                            <span className="text-xs text-foreground-muted"> {col.aliases}</span>
                          )}
                          {col.note && (
                            <p className="text-xs text-foreground-muted">{col.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-md bg-background-tertiary px-3 py-2 space-y-1.5 text-xs text-foreground-muted">
                    <p>
                      <span className="font-medium text-foreground">Accepted Status values: </span>
                      <code className="font-mono">active</code>, <code className="font-mono">enabled</code>, <code className="font-mono">paid</code> →
                      active · <code className="font-mono">expired</code>, <code className="font-mono">inactive</code>,{' '}
                      <code className="font-mono">disabled</code>, <code className="font-mono">suspended</code> → inactive ·{' '}
                      <code className="font-mono">pending</code>, <code className="font-mono">provisioning</code> → pending
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Expiry formats: </span>
                      e.g. <code className="font-mono">25 Dec 2026 02:30 PM</code>, <code className="font-mono">2026-12-25 14:30</code>,{' '}
                      <code className="font-mono">25/12/2026</code>
                    </p>
                    <p>
                      Each <span className="font-mono text-foreground">Username</span> must be unique in the sheet. Passwords aren&apos;t
                      read from the file — existing RouterOS secrets keep their current passwords.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Inline error */}
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Preview report */}
            {report && <ReportStats report={report} />}

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
                onClick={() => runImport(false)}
                disabled={busy || !file || !routerId}
                className="btn-secondary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : 'Preview'}
              </button>
              <button
                onClick={() => runImport(true)}
                disabled={busy || !previewReady}
                className="btn-primary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                title={previewReady ? undefined : 'Run a preview first'}
              >
                Apply Import
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Shared stats block — used by both the preview and the success state. */
function ReportStats({ report }: { report: NonNullable<PPPoECustomerImportResponse['report']> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([
          ['Rows', report.total_rows],
          ['Create', report.created],
          ['Update', report.updated],
          ['Skip', report.skipped],
          ['No Phone', report.missing_phone],
        ] as Array<[string, number]>).map(([label, value]) => (
          <div key={label} className="rounded-lg bg-background-tertiary px-3 py-2">
            <div className="text-xs text-foreground-muted">{label}</div>
            <div className="text-lg font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {Object.keys(report.packages || {}).length > 0 && (
        <div className="rounded-lg bg-background-tertiary px-4 py-3">
          <div className="text-sm font-medium text-foreground mb-2">Packages</div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(report.packages).slice(0, 8).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <span className="truncate text-foreground-muted">{name}</span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(report.warnings.length > 0 || report.errors.length > 0) && (
        <div className="space-y-2">
          {report.errors.slice(0, 4).map((err) => (
            <div key={err} className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {err}
            </div>
          ))}
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
