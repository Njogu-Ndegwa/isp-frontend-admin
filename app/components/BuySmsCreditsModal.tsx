'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

interface BuySmsCreditsModalProps {
  open: boolean;
  onClose: () => void;
  quantity: number;
  amountKes: number;
  phoneDefault?: string;
  onPurchased: () => void;
}

type PayStep = 'form' | 'waiting' | 'success' | 'timeout';

export default function BuySmsCreditsModal({
  open,
  onClose,
  quantity,
  amountKes,
  phoneDefault,
  onPurchased,
}: BuySmsCreditsModalProps) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<PayStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balanceBeforeRef = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setStep('form');
      setError(null);
      setPhone(phoneDefault || user?.support_phone || '');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, user, phoneDefault]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    let elapsed = 0;
    const before = balanceBeforeRef.current;
    pollRef.current = setInterval(async () => {
      elapsed += 5000;
      try {
        const credits = await api.getSmsCredits();
        if (credits.balance >= before + quantity) {
          stopPolling();
          setStep('success');
          onPurchased();
          showAlert('success', `${quantity} SMS credits added to your account!`);
        }
      } catch {
        // keep polling
      }
      if (elapsed >= 60000) {
        stopPolling();
        setStep('timeout');
      }
    }, 5000);
  }, [quantity, onPurchased, showAlert, stopPolling]);

  const handleBuy = async () => {
    if (!phone.trim()) {
      setError('Please enter an M-Pesa phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Record balance before purchase for polling comparison
      const creditsBefore = await api.getSmsCredits();
      balanceBeforeRef.current = creditsBefore.balance;
      await api.purchaseSmsCredits(quantity, phone.trim());
      setStep('waiting');
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-xl max-h-[85vh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 'form' && (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-1">Buy SMS Credits</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Pay via M-Pesa STK push to top up your messaging balance.
            </p>

            {/* Order summary */}
            <div className="mb-4 p-3 rounded-xl bg-background-tertiary/50 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Credits</span>
                <span className="text-foreground font-medium">{quantity.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border pt-1.5">
                <span className="text-foreground-muted font-medium">Amount</span>
                <span className="text-accent-primary font-semibold">KES {amountKes.toLocaleString()}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="0712345678"
              />
              <p className="text-xs text-foreground-muted/60 mt-1">
                An STK push will be sent to this number
              </p>
            </div>

            <button
              onClick={handleBuy}
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                `Pay KES ${amountKes.toLocaleString()}`
              )}
            </button>
          </>
        )}

        {step === 'waiting' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <div className="w-8 h-8 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Check Your Phone</h3>
            <p className="text-sm text-foreground-muted">
              An M-Pesa payment prompt has been sent to your phone. Please enter your PIN to complete the purchase.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Credits Added!</h3>
            <p className="text-sm text-foreground-muted mb-5">
              {quantity.toLocaleString()} SMS credits have been added to your account.
            </p>
            <button onClick={onClose} className="btn-primary px-6 py-2 text-sm font-semibold">
              Done
            </button>
          </div>
        )}

        {step === 'timeout' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Payment Processing</h3>
            <p className="text-sm text-foreground-muted mb-5">
              Your payment may still be processing. Credits will appear in your balance once confirmed.
            </p>
            <button onClick={onClose} className="btn-primary px-6 py-2 text-sm font-semibold">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
