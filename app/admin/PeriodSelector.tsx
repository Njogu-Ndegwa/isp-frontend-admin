'use client';

export type PeriodFilter = '7d' | '30d' | '90d' | '1y';

export const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: 'Week' },
  { value: '30d', label: 'Month' },
  { value: '90d', label: 'Quarter' },
  { value: '1y', label: 'Year' },
];

/**
 * Range chips shared by the admin dashboard cards. Extracted so the earnings
 * card filters identically to the charts beside it rather than growing its own
 * near-copy.
 */
export default function PeriodSelector({
  value,
  onChange,
  options = PERIOD_OPTIONS,
}: {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
  options?: { value: PeriodFilter; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1 bg-background-tertiary/50 rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            value === opt.value
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
