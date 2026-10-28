'use client';

import type { CredRateMbps } from '../lib/credRate';

interface Props {
  value: CredRateMbps;
  onChange: (value: CredRateMbps) => void;
  idPrefix?: string;
}

/** Download / upload speed in Mbps for an access credential. Empty = unlimited. */
export default function CredRateFields({ value, onChange, idPrefix = 'rate' }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}_download`} className="block text-sm font-medium text-foreground-muted mb-1.5">
            Download speed
          </label>
          <div className="relative">
            <input
              id={`${idPrefix}_download`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={value.download}
              onChange={(e) => onChange({ ...value, download: e.target.value })}
              className="input pr-14"
              placeholder="e.g. 5"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-foreground-muted">
              Mbps
            </span>
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}_upload`} className="block text-sm font-medium text-foreground-muted mb-1.5">
            Upload speed
          </label>
          <div className="relative">
            <input
              id={`${idPrefix}_upload`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={value.upload}
              onChange={(e) => onChange({ ...value, upload: e.target.value })}
              className="input pr-14"
              placeholder="e.g. 2"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-foreground-muted">
              Mbps
            </span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        In Mbps. Fill one to use the same speed both ways. Leave both empty for unlimited.
      </p>
    </div>
  );
}
