'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { SmsCreditTransaction } from '../../../lib/types';

// ─── Date helper ─────────────────────────────────────────────────────────────
function fmtDate(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-KE', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '-'; }
}

// ─── Kind chip (mirrors CreditsView) ─────────────────────────────────────────
type SmsTxnKind = SmsCreditTransaction['kind'];

function KindChip({ kind }: { kind: SmsTxnKind }) {
  const map: Record<SmsTxnKind, { cls: string; label: string }> = {
    purchase:         { cls: 'bg-emerald-500/10 text-success border-emerald-500/20', label: 'Purchase' },
    send_debit:       { cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20',   label: 'Send' },
    refund:           { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',      label: 'Refund' },
    admin_adjustment: { cls: 'bg-background-tertiary text-foreground-muted border-border', label: 'Admin' },
  };
  const { cls, label } = map[kind] ?? { cls: 'bg-background-tertiary text-foreground-muted border-border', label: kind };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ResellerLedgerSheetProps {
  resellerId: number;
  resellerName: string;
  onClose: () => void;
}

const LIMIT = 20;

// ─── ResellerLedgerSheet ──────────────────────────────────────────────────────
export function ResellerLedgerSheet({ resellerId, resellerName, onClose }: ResellerLedgerSheetProps) {
  const [transactions, setTransactions] = useState<SmsCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const fetchTransactions = async (offset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const res = await api.getAdminResellerLedger(resellerId, LIMIT, offset);
      const rows = res.transactions;
      setHasMore(rows.length >= LIMIT);
      if (append) {
        setTransactions((prev) => [...prev, ...rows]);
      } else {
        setTransactions(rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions(0, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resellerId]);

  const handleLoadMore = () => {
    fetchTransactions(transactions.length, true);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative bg-background-secondary border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        {/* Grab handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">Credit ledger</h3>
            <p className="text-xs text-foreground-muted truncate max-w-[240px]">{resellerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-danger">{error}</p>
              <button
                type="button"
                onClick={() => fetchTransactions(0, false)}
                className="btn-primary px-4 py-1.5 text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <p className="text-sm text-foreground-muted py-8 text-center">No transactions yet.</p>
          )}

          {!loading && !error && transactions.length > 0 && (
            <>
              {/* Mobile: stacked cards */}
              <div className="space-y-2 lg:hidden pt-3">
                {transactions.map((txn) => (
                  <div key={txn.id} className="card p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <KindChip kind={txn.kind} />
                      <span className={`text-sm font-semibold ${txn.change >= 0 ? 'text-success' : 'text-danger'}`}>
                        {txn.change >= 0 ? '+' : ''}{txn.change}
                      </span>
                    </div>
                    {txn.reference && (
                      <p className="text-xs text-foreground-muted truncate">{txn.reference}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground-muted">→ {txn.balance_after}</span>
                      <span className="text-xs text-foreground-muted">{fmtDate(txn.created_at)}</span>
                    </div>
                    {txn.note && (
                      <p className="text-xs text-foreground-muted italic truncate">{txn.note}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto pt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-foreground-muted">
                      <th className="text-left pb-2 pr-4 font-medium">Kind</th>
                      <th className="text-left pb-2 pr-4 font-medium">Reference</th>
                      <th className="text-right pb-2 pr-4 font-medium">Change</th>
                      <th className="text-right pb-2 pr-4 font-medium">Balance</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-background-tertiary/30 transition-colors">
                        <td className="py-2.5 pr-4">
                          <KindChip kind={txn.kind} />
                        </td>
                        <td className="py-2.5 pr-4 max-w-[200px]">
                          <span className="text-xs text-foreground-muted truncate block">
                            {txn.reference ?? (txn.note ?? '-')}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className={`text-sm font-semibold ${txn.change >= 0 ? 'text-success' : 'text-danger'}`}>
                            {txn.change >= 0 ? '+' : ''}{txn.change}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          <span className="text-xs text-foreground-muted">→ {txn.balance_after}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs text-foreground-muted whitespace-nowrap">{fmtDate(txn.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="btn-secondary text-sm px-4 py-2 disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {loadingMore ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        Loading…
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResellerLedgerSheet;
