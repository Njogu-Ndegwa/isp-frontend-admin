'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { formatKES, formatMoney } from './format';

/**
 * Admin reporting currency.
 *
 * The backend reports every platform total in KES (converting international
 * resellers' money at its own rates) and sends `usd_rate` — KES per 1 USD —
 * alongside. The admin can flip those totals to USD with a toggle; the choice
 * is remembered per browser. Per-reseller amounts are NOT affected: they stay
 * in the reseller's own currency.
 */
export type ReportingCurrency = 'KES' | 'USD';

const STORAGE_KEY = 'admin_reporting_currency';
const listeners = new Set<() => void>();

function readStored(): ReportingCurrency {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'USD' ? 'USD' : 'KES';
  } catch {
    return 'KES';
  }
}

// In-memory copy so the toggle still works when storage is blocked.
let current: ReportingCurrency | null = null;

function getSnapshot(): ReportingCurrency {
  if (current === null) current = readStored();
  return current;
}

function getServerSnapshot(): ReportingCurrency {
  return 'KES';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    current = readStored();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** `[mode, setMode]` — the admin's chosen reporting currency (default KES). */
export function useReportingCurrency(): [ReportingCurrency, (mode: ReportingCurrency) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback((next: ReportingCurrency) => {
    current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode etc.) — keep the in-memory choice.
    }
    listeners.forEach((l) => l());
  }, []);
  return [mode, setMode];
}

function usable(usdRate: number | null | undefined): usdRate is number {
  return typeof usdRate === 'number' && Number.isFinite(usdRate) && usdRate > 0;
}

/** The currency a total will actually render in (KES if the rate is missing). */
export function effectiveReporting(
  mode: ReportingCurrency,
  usdRate: number | null | undefined,
): ReportingCurrency {
  return mode === 'USD' && usable(usdRate) ? 'USD' : 'KES';
}

/** A KES amount expressed in the reporting currency, as a number (for charts). */
export function convertReporting(
  kesAmount: number | null | undefined,
  mode: ReportingCurrency,
  usdRate: number | null | undefined,
): number {
  const value = typeof kesAmount === 'number' && Number.isFinite(kesAmount) ? kesAmount : 0;
  return effectiveReporting(mode, usdRate) === 'USD' ? value / (usdRate as number) : value;
}

/** A platform total (KES) in the reporting currency: "KES 1,295" / "USD 10.00". */
export function formatReporting(
  kesAmount: number | null | undefined,
  mode: ReportingCurrency,
  usdRate: number | null | undefined,
): string {
  if (effectiveReporting(mode, usdRate) === 'KES') return formatKES(kesAmount);
  return formatMoney(convertReporting(kesAmount, mode, usdRate), 'USD');
}

/**
 * Bare compact number for chart axes ("1.5K", "2.3M"), after converting to the
 * reporting currency. No prefix, matching the existing admin chart axes.
 */
export function formatReportingAxis(
  kesAmount: number | null | undefined,
  mode: ReportingCurrency,
  usdRate: number | null | undefined,
): string {
  const value = convertReporting(kesAmount, mode, usdRate);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (effectiveReporting(mode, usdRate) === 'USD' && abs > 0 && abs < 10) return value.toFixed(1);
  return String(Math.round(value));
}

/** Compact total with its currency: "KES 25K", "USD 1.2K". */
export function formatReportingCompact(
  kesAmount: number | null | undefined,
  mode: ReportingCurrency,
  usdRate: number | null | undefined,
): string {
  const code = effectiveReporting(mode, usdRate);
  const value = convertReporting(kesAmount, mode, usdRate);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${code} ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${code} ${(value / 1_000).toFixed(code === 'USD' ? 1 : 0)}K`;
  if (code === 'USD') return formatMoney(value, 'USD');
  return `KES ${value.toLocaleString('en-KE')}`;
}

/**
 * An amount in its own currency with the KES equivalent beside it:
 * "USD 10.00 (≈ KES 1,295)". KES amounts render plain.
 */
export function formatWithKes(
  amount: number | null | undefined,
  currency: string | null | undefined,
  amountKes: number | null | undefined,
): string {
  const code = (currency || 'KES').toUpperCase();
  if (code === 'KES') return formatKES(amount);
  const own = formatMoney(amount, code);
  if (typeof amountKes !== 'number' || !Number.isFinite(amountKes)) return own;
  return `${own} (≈ ${formatKES(amountKes)})`;
}

/**
 * Sum amounts that may be in different currencies into KES, using the
 * backend's `kes_rates` (KES per 1 unit). An unknown currency counts at 0 and
 * is reported so the UI can flag the total as partial.
 */
export function sumToKes<T>(
  rows: T[],
  amount: (row: T) => number | null | undefined,
  currency: (row: T) => string | null | undefined,
  kesRates: Record<string, number> | null | undefined,
): { total: number; missing: string[] } {
  let total = 0;
  const missing = new Set<string>();
  for (const row of rows) {
    const value = amount(row);
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) continue;
    const code = (currency(row) || 'KES').toUpperCase();
    const rate = code === 'KES' ? 1 : kesRates?.[code];
    if (typeof rate === 'number' && Number.isFinite(rate)) total += value * rate;
    else missing.add(code);
  }
  return { total, missing: [...missing] };
}

/** "KES | USD" segmented control for admin money pages. */
export function ReportingCurrencyToggle({
  value,
  onChange,
  className = '',
}: {
  value: ReportingCurrency;
  onChange: (mode: ReportingCurrency) => void;
  className?: string;
}) {
  const options: ReportingCurrency[] = ['KES', 'USD'];
  return (
    <div
      role="group"
      aria-label="Reporting currency"
      className={`flex items-center gap-1 bg-background-tertiary/50 rounded-xl p-1 ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === opt
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
