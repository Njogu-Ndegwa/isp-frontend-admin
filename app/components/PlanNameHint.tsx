'use client';

import React from 'react';
import {
  MAX_PLAN_NAME_LENGTH,
  isPlanNameTooLong,
  planNameLength,
  planNameWarning,
} from '../lib/planName';

/**
 * Character counter and message for a plan-name field. Sits directly under the
 * input so the reseller sees the limit while typing rather than on submit.
 */
export default function PlanNameHint({ name }: { name: string | null | undefined }) {
  const len = planNameLength(name);
  const tooLong = isPlanNameTooLong(name);
  const message = planNameWarning(name);

  return (
    <div className="mt-1.5 flex items-start justify-between gap-3">
      <p className={`text-xs ${tooLong ? 'text-danger' : 'text-foreground-muted'}`}>
        {message || 'Shown to customers on the WiFi portal, exactly as typed.'}
      </p>
      <span
        className={`text-xs tabular-nums shrink-0 ${tooLong ? 'text-danger font-semibold' : 'text-foreground-muted'}`}
        aria-live="polite"
      >
        {len}/{MAX_PLAN_NAME_LENGTH}
      </span>
    </div>
  );
}
