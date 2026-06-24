'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../../lib/api';
import { SmsCreditTransaction } from '../../../lib/types';
import { LedgerList } from '../../../messaging/components/LedgerList';

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

  if (typeof document === 'undefined') return null;
  return createPortal(
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
              <div className="pt-3">
                <LedgerList transactions={transactions} />
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
    </div>,
    document.body,
  );
}

export default ResellerLedgerSheet;
