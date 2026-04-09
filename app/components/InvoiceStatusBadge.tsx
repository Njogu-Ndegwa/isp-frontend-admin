'use client';

interface InvoiceStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  paid: { label: 'Paid', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  overdue: { label: 'Overdue', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
  waived: { label: 'Waived', classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.classes}`}>
      {config.label}
    </span>
  );
}
