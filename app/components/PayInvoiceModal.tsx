'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { SubscriptionInvoice } from '../lib/types';
import { useAuth } from '../context/AuthContext';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice;
  onPaymentComplete: () => void;
}

type PayStep = 'form' | 'waiting' | 'success' | 'timeout';

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function PayInvoiceModal({ isOpen, onClose, invoice, onPaymentComplete }: PayInvoiceModalProps) {
  const { user } = useAuth();
  const remainingBalance = invoice.balance_remaining ?? invoice.final_charge;
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(remainingBalance.toString());
  const [step, setStep] = useState<PayStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError(null);
      setPhone(user?.support_phone || '');
      setAmount(remainingBalance.toString());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, user, remainingBalance]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 5000;
      try {
        const inv = await api.getSubscriptionInvoice(invoice.id);
        if (inv.status === 'paid') {
          stopPolling();
          setStep('success');
          onPaymentComplete();
        }
      } catch {
        // keep polling
      }
      if (elapsed >= 60000) {
        stopPolling();
        setStep('timeout');
      }
    }, 5000);
  }, [invoice.id, onPaymentComplete, stopPolling]);

  const handlePay = async () => {
    if (!phone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (parsedAmount > remainingBalance) {
      setError(`Amount cannot exceed the remaining balance of ${formatKES(remainingBalance)}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.paySubscriptionInvoice({
        invoice_id: invoice.id,
        phone_number: phone.trim(),
        amount: parsedAmount,
      });
      setStep('waiting');
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-xl">
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
            <h3 className="text-lg font-semibold text-foreground mb-1">Pay Invoice</h3>
            <p className="text-sm text-foreground-muted mb-4">
              {invoice.period_label} &mdash; {formatKES(invoice.final_charge)}
            </p>

            {(invoice.amount_paid != null && invoice.amount_paid > 0) && (
              <div className="mb-4 p-3 rounded-xl bg-background-tertiary/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Invoice Total</span>
                  <span className="text-foreground font-medium">{formatKES(invoice.final_charge)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Already Paid</span>
                  <span className="text-emerald-500 font-medium">{formatKES(invoice.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-border pt-1.5">
                  <span className="text-foreground-muted font-medium">Balance Remaining</span>
                  <span className="text-amber-500 font-semibold">{formatKES(remainingBalance)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mb-4">
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

            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground-muted mb-1.5">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
                placeholder={remainingBalance.toString()}
                min="1"
                max={remainingBalance}
                step="1"
              />
              <p className="text-xs text-foreground-muted/60 mt-1">
                Pay the full balance or enter a partial amount
              </p>
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                `Pay ${formatKES(parseFloat(amount) || 0)}`
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
              An M-Pesa payment prompt has been sent to your phone. Please enter your PIN to complete the payment.
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
            <h3 className="text-lg font-semibold text-foreground mb-2">Payment Successful</h3>
            <p className="text-sm text-foreground-muted mb-5">
              Your subscription has been updated. Thank you!
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
              Your payment is being processed. It may take a moment to reflect.
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
