'use client';

import { useId } from 'react';

/**
 * Chooses how often a customer may claim a free-trial plan
 * (`trial_once_per_customer`). Styled like PlanRouterScope's toggle.
 */
export default function TrialFrequencyPicker({
  value,
  onChange,
  disabled = false,
  labelClassName = 'block text-sm font-medium text-foreground mb-2',
}: {
  /** true = once per customer, false = every time their trial ends */
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  labelClassName?: string;
}) {
  const labelId = useId();
  const options = [
    { once: true, label: 'Once per customer' },
    { once: false, label: 'Every time their trial ends' },
  ];

  return (
    <div>
      <p id={labelId} className={labelClassName}>
        How often can a customer use this trial?
      </p>

      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-2 sm:flex-row">
        {options.map((option) => {
          const selected = value === option.once;
          return (
            <button
              key={String(option.once)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.once)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-foreground-muted hover:border-foreground-muted'
              } disabled:opacity-50`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-foreground-muted">
        &ldquo;Once&rdquo; is tracked per device, and per phone number if the customer gives one.
      </p>
    </div>
  );
}
