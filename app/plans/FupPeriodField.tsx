'use client';

import type { FupPeriod } from '../lib/types';
import { FUP_PERIOD_OPTIONS, fupPeriodHint, normalizeFupPeriod } from './dataCap';

/** "Reset" selector in a plan's Fair Usage Policy section. */
export default function FupPeriodField({
  value,
  onChange,
}: {
  value?: FupPeriod | null;
  onChange: (value: FupPeriod) => void;
}) {
  const current = normalizeFupPeriod(value);
  return (
    <div>
      <label htmlFor="fup_period" className="block text-sm font-medium text-foreground-muted mb-1.5">
        Reset
      </label>
      <select
        id="fup_period"
        value={current}
        onChange={(e) => onChange(normalizeFupPeriod(e.target.value))}
        className="select w-full"
      >
        {FUP_PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-foreground-muted">{fupPeriodHint(current)}</p>
    </div>
  );
}
