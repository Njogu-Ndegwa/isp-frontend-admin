'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import type {
  Plan,
  Router,
  StaticCustomerImportResponse,
  StaticCustomerImportRow,
  StaticCustomerImportAction,
} from '../lib/types';
import { useAlert } from '../context/AlertContext';
import { useT, type TFunction } from '../lib/i18n';
import { formatDateGMT3 } from '../lib/dateUtils';
import { formatAmount } from '../lib/format';
import MobileDataCard from './MobileDataCard';
import {
  canApplyImport,
  cleanPlanMapping,
  importApplied,
  importOptionsSignature,
  isAcceptedImportFile,
  mappingLabels,
  staticIpPlans,
  validateImportOptions,
} from '../lib/staticImport';

interface StaticIpImportModalProps {
  onClose: () => void;
  /** Called after a successful (non-dry-run) apply so the parent can refresh. */
  onImported: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_RENDERED_ROWS = 200;

type RowFilter = 'all' | StaticCustomerImportAction;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    console.error('Date error:', e);
    return '-';
  }
};

const EXPECTED_COLUMNS: Array<{ label: string; required: boolean; note: string }> = [
  { label: 'name', required: true, note: 'Customer name' },
  { label: 'static_ip', required: true, note: 'The IP assigned to the customer. Rows whose IP already exists on the router are skipped.' },
  { label: 'plan', required: true, note: 'Matched to one of your Static IP plans by name' },
  { label: 'mac', required: false, note: 'Device MAC to pin to the IP' },
  { label: 'phone', required: false, note: 'Customer phone number' },
  { label: 'expiry', required: false, note: 'Date access ends. It decides whether the customer starts active or inactive.' },
];

const ACTION_BADGE: Record<StaticCustomerImportAction, string> = {
  create: 'badge-success',
  skip: 'badge-neutral',
  error: 'badge-danger',
};

const ACTION_VARIANT: Record<StaticCustomerImportAction, 'success' | 'neutral' | 'danger'> = {
  create: 'success',
  skip: 'neutral',
  error: 'danger',
};

function actionLabel(t: TFunction, action: StaticCustomerImportAction): string {
  if (action === 'create') return t('Create');
  if (action === 'skip') return t('Skip');
  return t('Error');
}

function statusLabel(t: TFunction, status: StaticCustomerImportRow['status']): string {
  if (status === 'active') return t('Active');
  if (status === 'inactive') return t('Inactive');
  return '-';
}

function firstProblem(res: StaticCustomerImportResponse, t: TFunction): string {
  const errorRows = (res.rows || []).filter((r) => r.action === 'error');
  if (errorRows.length === 1) {
    return t('1 row has an error. Fix it in the file or with the options below, then preview again.');
  }
  if (errorRows.length > 1) {
    return t('{count} rows have errors. Fix them in the file or with the options below, then preview again.', { count: errorRows.length });
  }
  const warning = res.warnings?.[0]?.message;
  if (warning) return warning;
  return t('The file could not be imported');
}

export default function StaticIpImportModal({ onClose, onImported }: StaticIpImportModalProps) {
  const { showAlert } = useAlert();
  const t = useT();

  const [routers, setRouters] = useState<Router[]>([]);
  const [routersLoading, setRoutersLoading] = useState(true);
  const [routerId, setRouterId] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StaticCustomerImportResponse | null>(null);
  const [previewSig, setPreviewSig] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [createMissingPlans, setCreateMissingPlans] = useState(false);
  const [defaultPlanPrice, setDefaultPlanPrice] = useState('');
  const [planMapping, setPlanMapping] = useState<Record<string, string>>({});
  const [rowFilter, setRowFilter] = useState<RowFilter>('all');
  const [confirming, setConfirming] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Routers and the reseller's Static IP plans load once on mount. The parent
  // renders the modal conditionally, so every open starts clean.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [routerList, planList] = await Promise.all([
          api.getRouters(),
          api.getPlans(undefined, 'static_ip').catch(() => [] as Plan[]),
        ]);
        if (cancelled) return;
        setRouters(routerList);
        setPlans(staticIpPlans(planList));
        if (routerList.length > 0) setRouterId(String(routerList[0].id));
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

  const fileKey = file ? `${file.name}:${file.size}:${file.lastModified}` : '';
  const currentSig = importOptionsSignature({ routerId, fileKey, createMissingPlans, defaultPlanPrice, planMapping });
  // A failed apply (rows went bad between preview and apply) keeps its rows on
  // screen like a preview; canApplyImport still requires a fresh dry run.
  const preview = result && (result.dry_run || !result.success) ? result : null;
  const stale = Boolean(preview && previewSig !== currentSig);
  const applied = importApplied(result);
  const canApply = canApplyImport(preview) && !stale;
  const optionsError = validateImportOptions({ createMissingPlans, defaultPlanPrice });
  const cleanedMapping = useMemo(() => cleanPlanMapping(planMapping), [planMapping]);
  const labels = useMemo(() => mappingLabels(preview, cleanedMapping), [preview, cleanedMapping]);
  const toCreate = preview?.summary?.to_create ?? 0;
  const selectedRouterName = routers.find((r) => String(r.id) === routerId)?.name || preview?.router_name || '';

  const resetResult = useCallback(() => {
    setResult(null);
    setPreviewSig(null);
    setError(null);
    setConfirming(false);
    setPlanMapping({});
  }, []);

  const acceptFile = useCallback((candidate: File | null) => {
    if (!candidate) return;
    if (!isAcceptedImportFile(candidate.name)) {
      setError(t('Unsupported file type. Upload a .csv or .xlsx file.'));
      return;
    }
    if (candidate.size === 0) {
      setError(t('That file is empty.'));
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setError(t('File is {size}. The limit is {limit}.', { size: formatBytes(candidate.size), limit: formatBytes(MAX_FILE_BYTES) }));
      return;
    }
    setFile(candidate);
    resetResult();
    setShowGuide(false);
  }, [resetResult, t]);

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
    resetResult();
    if (inputRef.current) inputRef.current.value = '';
  }, [resetResult]);

  const downloadTemplate = useCallback(async () => {
    setTemplateBusy(true);
    try {
      await api.downloadStaticImportTemplate();
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not download the template'));
    } finally {
      setTemplateBusy(false);
    }
  }, [showAlert, t]);

  const runImport = useCallback(async (apply: boolean) => {
    if (!routerId) { showAlert('error', t('Select a router')); return; }
    if (!file) { showAlert('error', t('Select a file')); return; }
    if (optionsError) { setError(t(optionsError)); return; }

    setBusy(true);
    setError(null);
    const sig = currentSig;
    try {
      const res = await api.importStaticCustomers(Number(routerId), file, {
        apply,
        createMissingPlans,
        defaultPlanPrice: createMissingPlans ? Number(defaultPlanPrice) : 0,
        planMapping: cleanedMapping,
      });
      setResult(res);
      setPreviewSig(sig);
      setConfirming(false);
      if (res.dry_run || !res.success) setRowFilter((res.summary?.errors ?? 0) > 0 ? 'error' : 'all');
      if (!res.success) {
        const message = firstProblem(res, t);
        setError(message);
        showAlert('error', message);
        return;
      }
      if (apply) {
        const created = res.created_customer_ids?.length || res.summary?.to_create || 0;
        showAlert('success', t('Imported {count} static IP customers', { count: created }));
        onImported();
      } else {
        showAlert('success', t('Preview ready: {create} to create, {skip} skipped', {
          create: res.summary?.to_create ?? 0,
          skip: res.summary?.skipped ?? 0,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Import failed');
      setError(message);
      setConfirming(false);
      showAlert('error', message);
    } finally {
      setBusy(false);
    }
  }, [routerId, file, optionsError, currentSig, createMissingPlans, defaultPlanPrice, cleanedMapping, onImported, showAlert, t]);

  const closeIfIdle = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  const createdCount = result?.created_customer_ids?.length || result?.summary?.to_create || 0;

  // Portalled to <body> above the sidebar (z-50) and the mobile bottom nav
  // (z-[9999]): rendered in place, the wide dialog sat under the desktop
  // sidebar and its left edge could not be clicked.
  const dialog = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50"
      onClick={closeIfIdle}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="static-import-title"
        className="card p-5 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id="static-import-title" className="text-lg font-semibold text-foreground">{t('Import Static IP Customers')}</h3>
            <p className="text-sm text-foreground-muted truncate">
              {file?.name || t('Upload a .csv or .xlsx file')}
            </p>
          </div>
          <button
            onClick={closeIfIdle}
            disabled={busy}
            className="p-1 rounded-md hover:bg-background-tertiary text-foreground-muted disabled:opacity-40"
            title={t('Close')}
            aria-label={t('Close')}
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
                <h4 className="text-base font-semibold text-foreground">{t('Import complete')}</h4>
                <p className="text-sm text-foreground-muted">
                  {result?.router_name
                    ? t('Created {count} static IP customers on {router}.', { count: createdCount, router: result.router_name })
                    : t('Created {count} static IP customers.', { count: createdCount })}
                </p>
              </div>
            </div>

            {result && <SummaryChips t={t} result={result} applied />}

            <button onClick={onClose} className="btn-primary w-full">
              {t('Done')}
            </button>
          </div>
        ) : (
          /* ---------- Form state ---------- */
          <>
            {/* Router + file picker */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="static-import-router" className="block text-sm font-medium text-foreground-muted mb-1.5">{t('Router')}</label>
                <select
                  id="static-import-router"
                  value={routerId}
                  onChange={(e) => { setRouterId(e.target.value); resetResult(); }}
                  className="select"
                  disabled={busy || routersLoading}
                >
                  {routersLoading ? (
                    <option value="">{t('Loading routers…')}</option>
                  ) : (
                    <>
                      <option value="">{t('Select router')}</option>
                      {routers.map((router) => (
                        <option key={router.id} value={router.id}>{router.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="block text-sm font-medium text-foreground-muted">{t('File')}</span>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    disabled={templateBusy}
                    className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50"
                  >
                    {templateBusy ? t('Downloading…') : t('Download template')}
                  </button>
                </div>
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
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={busy}
                    onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    aria-label={t('Customer file')}
                  />
                  <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                  </svg>
                  <span className="text-xs text-foreground-muted">
                    <span className="text-accent-primary font-medium">{t('Click to browse')}</span> {t('or drag a .csv or .xlsx file here')}
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
                  title={t('Remove file')}
                  aria-label={t('Remove file')}
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
                aria-expanded={showGuide}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('What should the file contain?')}
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
                    {t('The first row must be the column headers. Each remaining row is one customer. Start from the template to get the headers right.')}
                  </p>
                  <div className="space-y-1.5">
                    {EXPECTED_COLUMNS.map((col) => (
                      <div key={col.label} className="flex items-start gap-2">
                        <span className={`badge ${col.required ? 'badge-danger' : 'badge-neutral'} shrink-0 mt-0.5`}>
                          {col.required ? t('required') : t('optional')}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-foreground">{col.label}</span>
                          <p className="text-xs text-foreground-muted">{t(col.note)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-md bg-background-tertiary px-3 py-2 text-xs text-foreground-muted">
                    {t('If any row has an error, nothing is imported. Fix the errors and preview again.')}
                  </p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="rounded-lg border border-border px-4 py-3 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createMissingPlans}
                  onChange={(e) => setCreateMissingPlans(e.target.checked)}
                  disabled={busy}
                  className="mt-1 w-4 h-4 accent-[var(--accent-primary)]"
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">{t('Create missing plans')}</span>
                  <span className="block text-xs text-foreground-muted">
                    {t('Plans named in the file that you do not have yet are created as Static IP plans.')}
                  </span>
                </span>
              </label>
              {createMissingPlans && (
                <div className="sm:pl-7">
                  <label htmlFor="static-import-price" className="block text-sm font-medium text-foreground-muted mb-1.5">
                    {t('Price for new plans')}
                  </label>
                  <input
                    id="static-import-price"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={defaultPlanPrice}
                    onChange={(e) => setDefaultPlanPrice(e.target.value)}
                    disabled={busy}
                    placeholder="1500"
                    className="input sm:max-w-[12rem]"
                    aria-invalid={Boolean(optionsError)}
                    aria-describedby={optionsError ? 'static-import-price-error' : undefined}
                  />
                  {optionsError && (
                    <p id="static-import-price-error" className="text-xs text-danger mt-1">{t(optionsError)}</p>
                  )}
                </div>
              )}

              {labels.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('Match plans')}</p>
                    <p className="text-xs text-foreground-muted">
                      {t('These plan names from the file do not match one of your Static IP plans. Pick the plan to use for each.')}
                    </p>
                  </div>
                  {plans.length === 0 && (
                    <p className="text-xs text-warning">
                      {t('You have no Static IP plans yet. Turn on "Create missing plans" or add one on the Plans page.')}
                    </p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {labels.map((label) => {
                      const id = `static-import-map-${label.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                      return (
                        <div key={label} className="flex items-center gap-2 rounded-md bg-background-tertiary px-3 py-2">
                          <label htmlFor={id} className="text-sm font-mono text-foreground truncate min-w-0 flex-1" title={label}>
                            {label}
                          </label>
                          <select
                            id={id}
                            aria-label={t('Plan for {label}', { label })}
                            value={planMapping[label] ?? ''}
                            onChange={(e) => setPlanMapping((m) => ({ ...m, [label]: e.target.value }))}
                            disabled={busy || plans.length === 0}
                            className="select !w-auto max-w-[60%] !py-1.5 text-sm"
                          >
                            <option value="">{createMissingPlans ? t('Create new plan') : t('Not matched')}</option>
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Inline error */}
            {error && (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {/* Stale preview notice */}
            {stale && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                {t('Options changed. Run Preview again before importing.')}
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className={`space-y-4 ${stale ? 'opacity-60' : ''}`}>
                <SummaryChips t={t} result={preview} />
                <PlansToCreate t={t} result={preview} />
                <Warnings t={t} result={preview} />
                <RowsPreview t={t} rows={preview.rows || []} filter={rowFilter} onFilter={setRowFilter} />
              </div>
            )}

            {/* Actions */}
            {confirming && canApply ? (
              <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 space-y-3">
                <p className="text-sm text-foreground">
                  {selectedRouterName
                    ? t('Create {count} static IP customers on {router}?', { count: toCreate, router: selectedRouterName })
                    : t('Create {count} static IP customers?', { count: toCreate })}
                </p>
                <p className="text-xs text-foreground-muted">
                  {t('Skipped rows are left as they are. This cannot be undone in bulk.')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="btn-secondary sm:flex-1 disabled:opacity-50"
                  >
                    {t('Back')}
                  </button>
                  <button
                    onClick={() => runImport(true)}
                    disabled={busy}
                    className="btn-primary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : t('Yes, import {count}', { count: toCreate })}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={closeIfIdle}
                  disabled={busy}
                  className="btn-secondary sm:flex-1 disabled:opacity-50"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={() => runImport(false)}
                  disabled={busy || !file || !routerId || Boolean(optionsError)}
                  className="btn-secondary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy ? <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : t('Preview')}
                </button>
                <button
                  onClick={() => setConfirming(true)}
                  disabled={busy || !canApply}
                  className="btn-primary sm:flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  title={canApply ? undefined : t('Run a preview with no errors first')}
                >
                  {canApply ? t('Import {count} customers', { count: toCreate }) : t('Import customers')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}

function SummaryChips({ t, result, applied = false }: { t: TFunction; result: StaticCustomerImportResponse; applied?: boolean }) {
  const s = result.summary;
  if (!s) return null;
  const created = result.created_customer_ids?.length || s.to_create;
  const chips: Array<{ key: string; label: string; value: number; tone: string }> = [
    applied
      ? { key: 'create', label: t('Created'), value: created, tone: created > 0 ? 'text-success' : 'text-foreground' }
      : { key: 'create', label: t('To create'), value: s.to_create, tone: s.to_create > 0 ? 'text-success' : 'text-foreground' },
    { key: 'skipped', label: t('Skipped'), value: s.skipped, tone: 'text-foreground' },
    { key: 'errors', label: t('Errors'), value: s.errors, tone: s.errors > 0 ? 'text-danger' : 'text-foreground' },
    { key: 'active', label: t('Active'), value: s.active, tone: 'text-foreground' },
    { key: 'inactive', label: t('Inactive'), value: s.inactive, tone: 'text-foreground' },
    { key: 'plans', label: applied ? t('Plans created') : t('Plans to create'), value: s.plans_to_create, tone: 'text-foreground' },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2" data-testid="static-import-summary">
      {chips.map((chip) => (
        <div
          key={chip.key}
          className={`rounded-lg px-3 py-2 ${chip.key === 'errors' && chip.value > 0 ? 'bg-danger/10 border border-danger/30' : 'bg-background-tertiary'}`}
        >
          <div className="text-xs text-foreground-muted">{chip.label}</div>
          <div className={`text-lg font-semibold ${chip.tone}`}>{chip.value ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

function PlansToCreate({ t, result }: { t: TFunction; result: StaticCustomerImportResponse }) {
  const plans = result.plans_to_create || [];
  if (plans.length === 0) return null;
  return (
    <div className="rounded-lg bg-background-tertiary px-4 py-3">
      <div className="text-sm font-medium text-foreground mb-2">{t('New plans')}</div>
      <div className="space-y-1 text-sm">
        {plans.map((plan) => (
          <div key={plan.label} className="flex items-center justify-between gap-3">
            <span className="truncate text-foreground-muted">
              {plan.name}{plan.speed ? ` · ${plan.speed}` : ''}
            </span>
            <span className={`font-medium ${plan.price > 0 ? 'text-foreground' : 'text-warning'}`}>{formatAmount(plan.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Warnings({ t, result }: { t: TFunction; result: StaticCustomerImportResponse }) {
  const warnings = result.warnings || [];
  if (warnings.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="static-import-warnings">
      {warnings.slice(0, 6).map((w, i) => (
        <div key={`${w.row ?? 'x'}-${i}`} className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {w.row != null ? `${t('Row {row}', { row: w.row })}: ` : ''}{w.message}
        </div>
      ))}
      {warnings.length > 6 && (
        <p className="text-xs text-foreground-muted">{t('+{count} more warnings', { count: warnings.length - 6 })}</p>
      )}
    </div>
  );
}

function RowsPreview({
  t, rows, filter, onFilter,
}: {
  t: TFunction;
  rows: StaticCustomerImportRow[];
  filter: RowFilter;
  onFilter: (f: RowFilter) => void;
}) {
  if (rows.length === 0) return null;
  const counts = {
    all: rows.length,
    create: rows.filter((r) => r.action === 'create').length,
    skip: rows.filter((r) => r.action === 'skip').length,
    error: rows.filter((r) => r.action === 'error').length,
  };
  const visible = (filter === 'all' ? rows : rows.filter((r) => r.action === filter));
  const shown = visible.slice(0, MAX_RENDERED_ROWS);
  const options: Array<{ value: RowFilter; label: string }> = [
    { value: 'all', label: t('All') },
    { value: 'error', label: t('Errors') },
    { value: 'create', label: t('Create') },
    { value: 'skip', label: t('Skip') },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Filter rows')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onFilter(o.value)}
            aria-pressed={filter === o.value}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors touch-manipulation ${
              filter === o.value
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-border text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            {o.label} ({counts[o.value]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-foreground-muted px-1">{t('No rows in this view.')}</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block table-container max-h-[22rem] overflow-y-auto" data-testid="static-import-table">
            <table>
              <thead>
                <tr>
                  <th className="!py-2.5 !px-3">{t('Row')}</th>
                  <th className="!py-2.5 !px-3">{t('Name')}</th>
                  <th className="!py-2.5 !px-3">{t('Static IP')}</th>
                  <th className="!py-2.5 !px-3">{t('MAC')}</th>
                  <th className="!py-2.5 !px-3">{t('Plan')}</th>
                  <th className="!py-2.5 !px-3">{t('Expiry')}</th>
                  <th className="!py-2.5 !px-3">{t('Status')}</th>
                  <th className="!py-2.5 !px-3">{t('Action')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.row} className={r.action === 'error' ? 'bg-danger/5' : undefined} data-action={r.action}>
                    <td className="!py-2 !px-3 text-xs text-foreground-muted tabular-nums">{r.row}</td>
                    <td className="!py-2 !px-3 text-sm">
                      <div className="font-medium text-foreground truncate max-w-[10rem]">{r.name || '-'}</div>
                      {r.phone && <div className="text-xs text-foreground-muted">{r.phone}</div>}
                    </td>
                    <td className="!py-2 !px-3 text-sm font-mono">{r.static_ip || '-'}</td>
                    <td className="!py-2 !px-3 text-xs font-mono text-foreground-muted">{r.mac || '-'}</td>
                    <td className="!py-2 !px-3 text-sm">
                      <div className="truncate max-w-[9rem]">{r.plan_name || r.plan_label || '-'}</div>
                      {r.plan_label && r.plan_name && r.plan_label !== r.plan_name && (
                        <div className="text-xs text-foreground-muted truncate max-w-[9rem]">{r.plan_label}</div>
                      )}
                    </td>
                    <td className="!py-2 !px-3 text-xs text-foreground-muted whitespace-nowrap">{formatSafeDate(r.expiry)}</td>
                    <td className="!py-2 !px-3 text-xs">{statusLabel(t, r.status)}</td>
                    <td className="!py-2 !px-3 text-sm">
                      <span className={`badge ${ACTION_BADGE[r.action]}`}>{actionLabel(t, r.action)}</span>
                      {r.reason && (
                        <div className={`text-xs mt-1 max-w-[14rem] ${r.action === 'error' ? 'text-danger' : 'text-foreground-muted'}`}>{r.reason}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2" data-testid="static-import-cards">
            {shown.map((r) => (
              <MobileDataCard
                key={r.row}
                id={r.row}
                title={r.name || t('Row {row}', { row: r.row })}
                subtitle={`${r.static_ip || '-'} · ${t('Row {row}', { row: r.row })}`}
                status={{ label: actionLabel(t, r.action), variant: ACTION_VARIANT[r.action] }}
                badge={r.status ? { label: statusLabel(t, r.status), variant: r.status === 'active' ? 'info' : 'neutral' } : undefined}
                highlight={r.action === 'error'}
                highlightColor="danger"
                className={r.action === 'error' ? 'bg-danger/5' : ''}
                fields={[
                  { label: t('Plan'), value: r.plan_name || r.plan_label || '-' },
                  ...(r.mac ? [{ label: t('MAC'), value: <span className="font-mono">{r.mac}</span> }] : []),
                  ...(r.phone ? [{ label: t('Phone'), value: r.phone }] : []),
                  { label: t('Expiry'), value: formatSafeDate(r.expiry) },
                ]}
                expandableContent={r.reason ? (
                  <p className={`text-sm ${r.action === 'error' ? 'text-danger' : 'text-foreground-muted'}`}>{r.reason}</p>
                ) : undefined}
              />
            ))}
          </div>

          {visible.length > shown.length && (
            <p className="text-xs text-foreground-muted">
              {t('Showing the first {shown} of {total} rows.', { shown: shown.length, total: visible.length })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
