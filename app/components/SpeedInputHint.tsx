'use client';

import { parsePlanSpeed } from '../plans/speed';

/**
 * Reads a plan speed back to the reseller under its input, so the
 * download/upload order is never in doubt: "5M/2M" shows
 * "↓ 5 Mbps download · ↑ 2 Mbps upload".
 */
export default function SpeedInputHint({ value }: { value: string | null | undefined }) {
  const speed = parsePlanSpeed(value);
  if (!speed) {
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
