'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { PayoutFrequency, ResellerPayoutSettings } from '../lib/types';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatKES } from '../lib/format';
import { formatDateGMT3 } from '../lib/dateUtils';

const FREQUENCY_OPTIONS: { value: PayoutFrequency; label: string; hint: string }[] = [
  { value: 'daily', label: 'Daily', hint: 'Your balance is paid out automatically every night.' },
  { value: 'weekly', label: 'Weekly', hint: 'Paid out automatically about once a week.' },
  { value: 'monthly', label: 'Monthly', hint: 'Paid out automatically about once a month.' },
  { value: 'manual', label: 'Manual only', hint: 'No automatic payouts — money only moves when you withdraw here.' },
];

export default function WithdrawCard({ onWithdrawn }: { onWithdrawn?: () => void }) {
  const [settings, setSettings] = useState<ResellerPayoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingFrequency, setSavingFrequency] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const s = await api.getResellerPayoutSettings();
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      setError(null);
      setNotice(null);
      const result = await api.resellerWithdraw();
      setNotice(
        `Withdrawal initiated: ${formatKES(result.net_payout)} to ${result.destination_label} ` +
        `(${formatKES(result.fee)} transaction fee). It usually completes within a few minutes.`
      );
      onWithdrawn?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
      setConfirmOpen(false);
      await load();
    }
  };

  const handleFrequencyChange = async (freq: PayoutFrequency) => {
    if (!settings || savingFrequency || freq === settings.payout_frequency) return;
    const prev = settings.payout_frequency;
    setSettings({ ...settings, payout_frequency: freq });
    try {
      setSavingFrequency(true);
      await api.updateResellerPayoutSettings(freq);
    } catch (err) {
      setSettings((s) => (s ? { ...s, payout_frequency: prev } : s));
      setError(err instanceof Error ? err.message : 'Failed to update payout schedule');
    } finally {
      setSavingFrequency(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-4 sm:p-5">
        <div className="h-24 rounded-xl bg-background-tertiary/60 animate-pulse" />
      </div>
    );
  }

  if (!settings) {
    return error ? (
      <div className="card p-4 sm:p-5">
        <p className="text-sm text-danger">{error}</p>
        <button onClick={() => { setLoading(true); load(); }} className="text-xs text-accent-primary hover:underline mt-1">
          Retry
        </button>
      </div>
    ) : null;
  }

  const selectedOption = FREQUENCY_OPTIONS.find((o) => o.value === settings.payout_frequency);

  return (
    <div className="card p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Withdraw */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Withdraw Funds</h3>

          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground-muted">Available balance</span>
              <span className="font-bold text-lg">{formatKES(settings.unpaid_balance)}</span>
            </div>
            {settings.unpaid_balance >= settings.minimum_withdrawal && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Transaction fee</span>
                  <span className="font-medium text-orange-500">- {formatKES(settings.fee_preview.total_fee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-1.5">
                  <span className="text-foreground-muted">You&apos;ll receive</span>
                  <span className="font-semibold text-emerald-500">{formatKES(settings.fee_preview.net_payout)}</span>
                </div>
              </>
            )}
            {settings.payment_method && (
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted">Paid to</span>
                <span className="font-medium">
                  {settings.payment_method.label}
                  {settings.payment_method.destination ? ` (${settings.payment_method.destination})` : ''}
                </span>
              </div>
            )}
          </div>

          {notice && (
            <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs">{notice}</div>
          )}
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-500/10 text-danger text-xs">{error}</div>
          )}

          {settings.blocked_reason === 'pending_withdrawal' && settings.pending_withdrawal ? (
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 text-xs">
              A payout of {formatKES(settings.pending_withdrawal.amount)} started{' '}
              {settings.pending_withdrawal.created_at
                ? formatDateGMT3(settings.pending_withdrawal.created_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                : 'recently'}{' '}
              is still being confirmed with Safaricom. You can withdraw again once it completes
              (usually within ~10 minutes).
            </div>
          ) : settings.blocked_reason === 'no_payment_method' ? (
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 text-xs">
              Add a bank account or M-Pesa paybill in{' '}
              <Link href="/settings/payment-methods" className="underline font-medium">
                Payment Methods
              </Link>{' '}
              to enable withdrawals.
            </div>
          ) : settings.blocked_reason === 'balance_too_low' ? (
            <p className="text-xs text-foreground-muted">
              Withdrawals are available once your balance reaches {formatKES(settings.minimum_withdrawal)}.
            </p>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={withdrawing}
              className="btn-primary w-full sm:w-auto px-5 py-2 text-sm disabled:opacity-50"
            >
              {withdrawing ? 'Processing...' : `Withdraw ${formatKES(settings.unpaid_balance)}`}
            </button>
          )}
        </div>

        {/* Payout schedule */}
        <div className="md:border-l md:border-border md:pl-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Automatic Payout Schedule</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFrequencyChange(opt.value)}
                disabled={savingFrequency}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
                  settings.payout_frequency === opt.value
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border text-foreground-muted hover:bg-background-tertiary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-foreground-muted">
            {savingFrequency ? 'Saving...' : selectedOption?.hint}
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!withdrawing) setConfirmOpen(false); }}
        onConfirm={handleWithdraw}
        loading={withdrawing}
        title="Confirm Withdrawal"
        message={
          `Withdraw ${formatKES(settings.unpaid_balance)} to ` +
          `${settings.payment_method?.label ?? 'your payout account'}? ` +
          `A ${formatKES(settings.fee_preview.total_fee)} transaction fee applies — ` +
          `you'll receive ${formatKES(settings.fee_preview.net_payout)}.`
        }
        confirmLabel="Withdraw"
      />
    </div>
  );
}
