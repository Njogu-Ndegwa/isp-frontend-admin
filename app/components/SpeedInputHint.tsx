'use client';

import { PLAN_SPEED_HELP, parsePlanSpeed } from '../plans/speed';
import { useT } from '../lib/i18n';

export const SPEED_NOT_RECOGNISED = 'Speed not recognised.';

/**
 * Reads a plan speed back to the reseller under its input, so the
 * download/upload order is never in doubt: "5M/2M" shows
 * "↓ 5 Mbps download · ↑ 2 Mbps upload". Text it cannot read is flagged
 * before save; the router would otherwise not know the speed.
 */
export default function SpeedInputHint({ value }: { value: string | null | undefined }) {
  const t = useT();
  const speed = parsePlanSpeed(value);
  if (!speed) {
    if (String(value ?? '').trim()) {
      return (
        <p className="mt-1 text-xs text-warning" role="alert" data-testid="speed-not-recognised">
          {t(SPEED_NOT_RECOGNISED)} {t(PLAN_SPEED_HELP)}
        </p>
      );
    }
    return (
      <p className="mt-1 text-xs text-foreground-muted">
        Download first, then upload: 5M/2M = 5 Mbps download, 2 Mbps upload. One value (5M) sets both.
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-foreground-muted" aria-live="polite">
      ↓ {speed.download} download · ↑ {speed.upload} upload
    </p>
  );
}
