'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminReseller, CreditUnmatchedToResellerResponse, UnmatchedPayment } from '../lib/types';
import SearchInput from '../components/SearchInput';

/**
 * Bitwave admins only. Adds an unmatched platform-paybill payment to a
 * reseller's earnings, so they can withdraw it, without linking any customer
 * (no plan, no extra days). The backend refuses a second credit.
 */
export default function CreditToResellerModal({
  payment,
  onClose,
  onCredited,
}: {
  payment: UnmatchedPayment;
  onClose: () => void;
  onCredited: (result: CreditUnmatchedToResellerResponse, reseller: AdminReseller | undefined) => void;
}) {
  const [resellers, setResellers] = useState<AdminReseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAdminResellers()
      .then((res) => {
        if (!cancelled) setResellers(res.resellers || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load resellers');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = (q
    ? resellers.filter((r) =>
        [r.organization_name, r.business_name, r.email, String(r.id)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    : resellers
  ).slice(0, 50);

  const selected = resellers.find((r) => r.id === selectedId);
  const canSubmit = !!selectedId && reason.trim().length > 0 && !saving;

  const submit = async () => {
    if (!selectedId || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api.creditUnmatchedToReseller(payment.id, {
        reseller_id: selectedId,
        reason: reason.trim(),
      });
      onCredited(result, selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credit failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-background-secondary rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Credit to reseller</h2>
            <p className="text-sm text-foreground-muted truncate">
              {payment.transaction.trans_id} &mdash; KES {payment.transaction.trans_amount}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="px-5 pt-3 text-xs text-foreground-muted flex-shrink-0">
          Adds the money to the reseller&apos;s earnings so they can withdraw it. No customer gets
          days or a plan. This cannot be applied twice.
        </p>

        <div className="px-5 pt-3 flex-shrink-0">
          <label className="block text-sm font-medium text-foreground mb-1.5">Reseller</label>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or ID..." />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0" style={{ maxHeight: '35vh' }}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg skeleton" />
              ))}
            </div>
          ) : loadError ? (
            <div className="py-6 text-center text-sm text-danger">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-foreground-muted text-sm">No resellers match.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedId === r.id
                      ? 'bg-accent-primary/10 ring-1 ring-accent-primary/30'
                      : 'hover:bg-background-tertiary'
                  }`}
                >
                  <input
                    type="radio"
                    name="reseller"
                    checked={selectedId === r.id}
                    onChange={() => setSelectedId(r.id)}
                    className="w-4 h-4 text-accent-primary border-border focus:ring-accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.organization_name || r.business_name || r.email}
                    </p>
                    <p className="text-xs text-foreground-muted truncate">
                      #{r.id}
                      {r.email ? ` · ${r.email}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-3 flex-shrink-0">
          <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="e.g. Paid to wrong account (typo); customer already activated as cash"
            rows={2}
            className="input w-full resize-none"
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-background-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Crediting...' : 'Credit to reseller'}
          </button>
        </div>
      </div>
    </div>
  );
}
