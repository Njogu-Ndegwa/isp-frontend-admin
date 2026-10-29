'use client';

import { useState, type FormEvent } from 'react';
import type {
  PlatformWithdrawal,
  PlatformWithdrawalCreate,
  PlatformWithdrawalLedger,
  WithdrawalBucket,
  WithdrawalMethod,
} from '../lib/types';
import type { TFunction } from '../lib/i18n';
import LabelWithInfo from '../components/InfoTip';
import {
  BUCKET_LABELS, BUCKET_ORDER, LEDGER, METHOD_LABELS, METHOD_ORDER,
  availableFor, parseAmount, todayEat, validateWithdrawal, type WithdrawalForm,
} from './platformEarnings';

/** "2026-10-01" → "1 Oct 2026" (date only, no timezone shift). */
export function formatLedgerDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

function emptyForm(today: string): WithdrawalForm {
  return { amount: '', date: today, method: 'mpesa', bucket: 'platform', reference: '', note: '' };
}

/**
 * Withdrawals since the ledger start: earned / withdrawn / available per
 * bucket and in total, a "Record withdrawal" form and the past records.
 *
 * Records only — saving a withdrawal moves no money; the copy says so.
 * Presentational apart from its own form state: the dashboard passes the
 * ledger and the two actions.
 */
export default function WithdrawalsLedger({
  data,
  loading,
  failed,
  money,
  t,
  onCreate,
  onVoid,
  initialFormOpen = false,
  today = todayEat(),
}: {
  data: PlatformWithdrawalLedger | null;
  loading: boolean;
  failed: boolean;
  money: (kes: number) => string;
  t: TFunction;
  onCreate: (payload: PlatformWithdrawalCreate) => Promise<void>;
  onVoid: (id: number, reason: string) => Promise<void>;
  initialFormOpen?: boolean;
  today?: string;
}) {
  const [formOpen, setFormOpen] = useState(initialFormOpen);

  return (
    <section className="mt-4 pt-4 border-t border-border" data-testid="withdrawals-ledger" aria-label={t(LEDGER.title)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t(LEDGER.title)}</h3>
          {data && (
            <p className="text-[11px] text-foreground-muted">
              {t(LEDGER.since, { date: formatLedgerDate(data.start_date) })}
            </p>
          )}
        </div>
        {data && !formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="btn-primary text-xs px-3 py-2 min-h-[36px]"
          >
            {t(LEDGER.record)}
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-foreground-muted flex gap-1.5">
        <svg className="w-3.5 h-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t(LEDGER.recordsOnly)}</span>
      </p>

      {loading ? (
        <div className="mt-3 h-[120px] rounded-xl bg-background-tertiary/60 animate-pulse" />
      ) : failed || !data ? (
        <div className="mt-3 flex items-center justify-center h-[60px] text-foreground-muted text-xs">
          {t(LEDGER.unavailable)}
        </div>
      ) : (
        <>
          <Balances data={data} money={money} t={t} />
          {formOpen && (
            <RecordForm
              data={data}
              money={money}
              t={t}
              today={today}
              onCancel={() => setFormOpen(false)}
              onSave={async (payload) => {
                await onCreate(payload);
                setFormOpen(false);
              }}
            />
          )}
          <History rows={data.withdrawals} money={money} t={t} onVoid={onVoid} />
        </>
      )}
    </section>
  );
}

function Balances({ data, money, t }: { data: PlatformWithdrawalLedger; money: (kes: number) => string; t: TFunction }) {
  const rows: { key: string; label: string; figures: PlatformWithdrawalLedger['total']; strong?: boolean }[] = [
    { key: 'platform', label: BUCKET_LABELS.platform, figures: data.buckets.platform },
    { key: 'reseller_business', label: BUCKET_LABELS.reseller_business, figures: data.buckets.reseller_business },
    { key: 'total', label: 'Total', figures: data.total, strong: true },
  ];
  return (
    <div className="mt-3 text-xs" data-testid="ledger-balances">
      <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-foreground-muted pb-1">
        <LabelWithInfo
          label={t(LEDGER.earned)}
          info={t(LEDGER.earnedTooltip, { date: formatLedgerDate(data.start_date) })}
        />
        <span>{t(LEDGER.withdrawn)}</span>
        <span>{t(LEDGER.available)}</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className={`py-1.5 border-t border-border ${row.strong ? 'font-semibold' : ''}`}>
          <p className="text-foreground">{t(row.label)}</p>
          <div className="grid grid-cols-3 gap-2 tabular-nums">
            <span className="text-foreground">{money(row.figures.collected)}</span>
            <span className="text-foreground-muted">{money(row.figures.withdrawn)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{money(row.figures.available)}</span>
          </div>
        </div>
      ))}
      {data.withdrawn_from_all > 0 && (
        <p className="text-[10px] text-foreground-muted mt-1">
          {t(LEDGER.fromAll, { amount: money(data.withdrawn_from_all) })}
        </p>
      )}
    </div>
  );
}

function RecordForm({
  data,
  money,
  t,
  today,
  onCancel,
  onSave,
}: {
  data: PlatformWithdrawalLedger;
  money: (kes: number) => string;
  t: TFunction;
  today: string;
  onCancel: () => void;
  onSave: (payload: PlatformWithdrawalCreate) => Promise<void>;
}) {
  const [form, setForm] = useState<WithdrawalForm>(() => emptyForm(today));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof WithdrawalForm>(key: K, value: WithdrawalForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };
  const available = availableFor(data, form.bucket);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateWithdrawal(form, data, { today, money });
    if (problem) {
      setError(t(problem.message, problem.vars));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        amount: parseAmount(form.amount),
        date: form.date,
        method: form.method,
        bucket: form.bucket,
        reference: form.reference.trim() || undefined,
        note: form.note.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not save the withdrawal'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'input w-full text-sm';
  const label = 'block text-[11px] text-foreground-muted mb-1';
  return (
    <form onSubmit={submit} className="mt-3 rounded-xl border border-border p-3 space-y-3" data-testid="withdrawal-form" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="wd-amount">{t('Amount (KES)')}</label>
          <input
            id="wd-amount"
            inputMode="decimal"
            autoComplete="off"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={field}
            placeholder="0"
          />
          <p className="text-[10px] text-foreground-muted mt-1">
            {t('Available: {amount}', { amount: money(available) })}
          </p>
        </div>
        <div>
          <label className={label} htmlFor="wd-bucket">{t('From')}</label>
          <select
            id="wd-bucket"
            value={form.bucket}
            onChange={(e) => set('bucket', e.target.value as WithdrawalBucket)}
            className={field}
          >
            {BUCKET_ORDER.map((b) => (
              <option key={b} value={b}>{t(BUCKET_LABELS[b])}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="wd-date">{t('Date')}</label>
          <input
            id="wd-date"
            type="date"
            min={data.start_date}
            max={today}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="wd-method">{t('Method')}</label>
          <select
            id="wd-method"
            value={form.method}
            onChange={(e) => set('method', e.target.value as WithdrawalMethod)}
            className={field}
          >
            {METHOD_ORDER.map((m) => (
              <option key={m} value={m}>{t(METHOD_LABELS[m])}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="wd-reference">{t('Reference (optional)')}</label>
          <input
            id="wd-reference"
            value={form.reference}
            maxLength={100}
            onChange={(e) => set('reference', e.target.value)}
            className={field}
            placeholder={t('e.g. M-Pesa code')}
          />
        </div>
        <div>
          <label className={label} htmlFor="wd-note">{t('Note (optional)')}</label>
          <input
            id="wd-note"
            value={form.note}
            maxLength={500}
            onChange={(e) => set('note', e.target.value)}
            className={field}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-2 min-h-[36px]">
          {t('Cancel')}
        </button>
        <button type="submit" disabled={saving} className="btn-primary text-xs px-3 py-2 min-h-[36px] disabled:opacity-50">
          {saving ? t('Saving…') : t('Save withdrawal')}
        </button>
      </div>
    </form>
  );
}

function History({
  rows,
  money,
  t,
  onVoid,
}: {
  rows: PlatformWithdrawal[];
  money: (kes: number) => string;
  t: TFunction;
  onVoid: (id: number, reason: string) => Promise<void>;
}) {
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">{t(LEDGER.past)}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-foreground-muted py-2">{t(LEDGER.none)}</p>
      ) : (
        <ul className="divide-y divide-border" data-testid="withdrawal-list">
          {rows.map((row) => <HistoryRow key={row.id} row={row} money={money} t={t} onVoid={onVoid} />)}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  row,
  money,
  t,
  onVoid,
}: {
  row: PlatformWithdrawal;
  money: (kes: number) => string;
  t: TFunction;
  onVoid: (id: number, reason: string) => Promise<void>;
}) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (reason.trim().length < 3) {
      setError(t('Say why you are voiding it'));
      return;
    }
    setBusy(true);
    try {
      await onVoid(row.id, reason.trim());
      setVoiding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not void the withdrawal'));
    } finally {
      setBusy(false);
    }
  };

  const details = [
    formatLedgerDate(row.date),
    t(METHOD_LABELS[row.method] ?? row.method),
    t(BUCKET_LABELS[row.bucket] ?? row.bucket),
  ].join(' · ');

  return (
    <li className="py-2 text-xs">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium tabular-nums ${row.voided ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
            {money(row.amount)}
            {row.voided && (
              <span className="ml-2 no-underline inline-block rounded px-1.5 py-px text-[10px] font-medium bg-background-tertiary text-foreground-muted">
                {t('Voided')}
              </span>
            )}
          </p>
          <p className="text-[11px] text-foreground-muted">{details}</p>
          {(row.reference || row.note) && (
            <p className="text-[11px] text-foreground-muted break-words">
              {[row.reference, row.note].filter(Boolean).join(' — ')}
            </p>
          )}
          {row.voided && row.void_reason && (
            <p className="text-[11px] text-foreground-muted break-words">
              {t('Voided: {reason}', { reason: row.void_reason })}
            </p>
          )}
        </div>
        {!row.voided && !voiding && (
          <button
            type="button"
            onClick={() => setVoiding(true)}
            className="btn-ghost text-[11px] px-2 py-1 min-h-[32px]"
          >
            {t('Void')}
          </button>
        )}
      </div>
      {voiding && (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
            maxLength={300}
            className="input w-full text-sm"
            placeholder={t('Why void it? e.g. typed the wrong amount')}
            aria-label={t('Reason for voiding')}
          />
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => { setVoiding(false); setError(null); }} className="btn-secondary text-xs px-3 py-2">
              {t('Cancel')}
            </button>
            <button type="button" onClick={confirm} disabled={busy} className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
              {t('Void withdrawal')}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1" role="alert">{error}</p>}
    </li>
  );
}
