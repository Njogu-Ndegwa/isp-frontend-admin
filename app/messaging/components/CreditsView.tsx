'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { SmsCreditInfo, SmsCreditTransaction } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import BuySmsCreditsModal from '../../components/BuySmsCreditsModal';
import { LedgerList } from './LedgerList';

// ─── Transaction ledger ───────────────────────────────────────────────────
const LIMIT = 20;

function TransactionLedger() {
  const [transactions, setTransactions] = useState<SmsCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchTransactions = async (offset: number, append: boolean) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      const res = await api.getSmsCreditLedger(LIMIT, offset);
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
  }, []);

  const handleLoadMore = () => {
    fetchTransactions(transactions.length, true);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Transaction history</p>

      {loading && (
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto my-4" />
      )}

      {error && !loading && (
        <div className="card p-4 text-center space-y-2">
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
        <p className="text-sm text-foreground-muted">No transactions yet.</p>
      )}

      {!loading && !error && transactions.length > 0 && (
        <>
          <LedgerList transactions={transactions} />

          {hasMore && (
            <div className="pt-2 text-center">
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
  );
}

// ─── CreditsView ──────────────────────────────────────────────────────────
export default function CreditsView({ credits, onRefresh }: { credits: SmsCreditInfo; onRefresh: () => void }) {
  const { user } = useAuth();
  const [buyModal, setBuyModal] = useState<{ quantity: number; amountKes: number } | null>(null);
  const [customQty, setCustomQty] = useState('');

  const pricePerCredit = credits.price_per_sms_kes;

  const openBuy = (qty: number) => {
    setBuyModal({ quantity: qty, amountKes: Math.round(qty * pricePerCredit) });
  };

  const handleCustomBuy = () => {
    const qty = parseInt(customQty, 10);
    if (!qty || qty < (credits.min_purchase_credits || 1)) return;
    openBuy(qty);
  };

  return (
    <div className="space-y-6">
      {/* Balance summary */}
      <div className="card p-5 space-y-3">
        <p className="text-sm font-medium text-foreground-muted">Current Balance</p>
        <p className="text-4xl font-bold text-foreground">{credits.balance.toLocaleString()}</p>
        <p className="text-sm text-foreground-muted">SMS credits</p>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-foreground-muted">Total purchased</p>
            <p className="text-sm font-semibold text-foreground">{credits.total_purchased.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-muted">Total spent</p>
            <p className="text-sm font-semibold text-foreground">{credits.total_spent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Price info */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        KES {pricePerCredit} per SMS credit · min {credits.min_purchase_credits} credits per purchase
      </div>

      {/* Bundle buttons */}
      {credits.bundles.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Choose a bundle</p>
          <div className="grid grid-cols-2 gap-3">
            {credits.bundles.map((bundle) => (
              <button
                key={bundle.credits}
                type="button"
                onClick={() => openBuy(bundle.credits)}
                className="card p-4 text-left hover:border-accent-primary/50 transition-colors"
              >
                <p className="text-lg font-bold text-foreground">{bundle.credits.toLocaleString()}</p>
                <p className="text-xs text-foreground-muted">{bundle.label}</p>
                <p className="text-sm font-semibold text-accent-primary mt-1">
                  KES {Math.round(bundle.credits * pricePerCredit).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom quantity */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Custom quantity</p>
        <div className="flex gap-2">
          <input
            type="number"
            className="input flex-1"
            placeholder={`Min ${credits.min_purchase_credits}`}
            min={credits.min_purchase_credits}
            value={customQty}
            onChange={(e) => setCustomQty(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCustomBuy}
            className="btn-primary px-4 text-sm font-semibold"
            disabled={!customQty || parseInt(customQty, 10) < (credits.min_purchase_credits || 1)}
          >
            Buy
          </button>
        </div>
        {customQty && parseInt(customQty, 10) >= (credits.min_purchase_credits || 1) && (
          <p className="text-xs text-foreground-muted mt-1">
            Total: KES {Math.round(parseInt(customQty, 10) * pricePerCredit).toLocaleString()}
          </p>
        )}
      </div>

      {buyModal && (
        <BuySmsCreditsModal
          open={true}
          onClose={() => setBuyModal(null)}
          quantity={buyModal.quantity}
          amountKes={buyModal.amountKes}
          phoneDefault={user?.support_phone || ''}
          onPurchased={() => {
            setBuyModal(null);
            onRefresh();
          }}
        />
      )}

      {/* Transaction ledger */}
      <TransactionLedger />
    </div>
  );
}
