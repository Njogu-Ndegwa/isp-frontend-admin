'use client';

import { SmsCreditTransaction } from '../../lib/types';

// ─── Date helper ──────────────────────────────────────────────────────────────
export function fmtDate(dateStr: string | null | undefined): string {
  try {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

// ─── Kind chip ────────────────────────────────────────────────────────────────
type SmsTxnKind = SmsCreditTransaction['kind'];

export function KindChip({ kind }: { kind: SmsTxnKind }) {
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

// ─── LedgerList ───────────────────────────────────────────────────────────────
// Renders the per-transaction UI (mobile cards + lg+ table) for a list of
// SmsCreditTransaction rows. Data fetching, loading/error/empty states, and the
// "Load more" button live in the consuming component.
export function LedgerList({ transactions }: { transactions: SmsCreditTransaction[] }) {
  return (
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
    </>
  );
}
