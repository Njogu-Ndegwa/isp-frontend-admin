'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { SmsCreditInfo, SmsCreditTransaction } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import BuySmsCreditsModal from '../../components/BuySmsCreditsModal';

// ─── Date helper ─────────────────────────────────────────────────────────
function fmtDate(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

// ─── Kind chip ────────────────────────────────────────────────────────────
type SmsTxnKind = SmsCreditTransaction['kind'];

function KindChip({ kind }: { kind: SmsTxnKind }) {
  const map: Record<SmsTxnKind, { cls: string; label: string }> = {
    purchase: { cls: 'bg-emerald-500/10 text-success border-emerald-500/20', label: 'Purchase' },
    send_debit: { cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Send' },
    refund: { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Refund' },
    admin_adjustment: { cls: 'bg-background-tertiary text-foreground-muted border-border', label: 'Admin' },
  };
  const { cls, label } = map[kind] ?? { cls: 'bg-background-tertiary text-foreground-muted border-border', label: kind };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

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
          {/* Mobile: stacked cards */}
          <div className="space-y-2 lg:hidden">
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
          <div className="hidden lg:block overflow-x-auto">
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
