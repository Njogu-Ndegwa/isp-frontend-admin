'use client';

import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface EditSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resellerId: number;
  currentStatus: string;
  currentExpiry: string | null;
  onSaved: () => void;
}

export default function EditSubscriptionModal({
  isOpen,
  onClose,
  resellerId,
  currentStatus,
  currentExpiry,
  onSaved,
}: EditSubscriptionModalProps) {
  const [status, setStatus] = useState(currentStatus);
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ days_remaining: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setExpiryDate(currentExpiry ? currentExpiry.split('T')[0] : '');
      setError(null);
      setResult(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, currentStatus, currentExpiry]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {};
      if (status !== currentStatus) data.subscription_status = status;
      if (expiryDate && expiryDate !== (currentExpiry?.split('T')[0] || '')) {
        data.subscription_expires_at = `${expiryDate}T12:00:00`;
      }
      if (Object.keys(data).length === 0) {
        onClose();
        return;
      }
      const res = await api.editAdminSubscription(resellerId, data);
      setResult({ days_remaining: res.days_remaining });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdjust = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.editAdminSubscription(resellerId, { adjust_days: days });
      setResult({ days_remaining: res.days_remaining });
      setExpiryDate(res.subscription_expires_at.split('T')[0]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-foreground mb-5">Edit Subscription</h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            Updated — {result.days_remaining} days remaining
          </div>
        )}

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input"
            />
          </div>

          {/* Quick adjust */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">Quick Adjust</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '-7d', days: -7 },
                { label: '-1d', days: -1 },
                { label: '+1d', days: 1 },
                { label: '+7d', days: 7 },
                { label: '+30d', days: 30 },
              ].map((btn) => (
                <button
                  key={btn.days}
                  onClick={() => handleQuickAdjust(btn.days)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-muted hover:bg-background-tertiary hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
