import { AdminEarningsPoint } from '../../lib/types';

/** The two businesses being compared. */
export type EarningsSourceKey = 'system' | 'reseller';

export const SOURCE_LABELS: Record<EarningsSourceKey, string> = {
  system: 'System sales',
  reseller: 'My reseller business',
};

/**
 * One hue per business. Validated against both the light (#ffffff) and dark
 * (#18181b) card surfaces — lightness band, chroma floor, CVD separation and
 * 3:1 contrast all pass in both modes, so one pair serves both themes. At two
 * categories the separation is ΔE 30+ on every simulated CVD type.
 */
export const SOURCE_COLORS: Record<EarningsSourceKey, string> = {
  system: '#5850ec',
  reseller: '#d97706',
};

/**
 * The total is a sum, not a third category, so it wears text ink rather than
 * taking a categorical hue — it reads as the aggregate of the two beneath it.
 */
export const TOTAL_COLOR = 'var(--color-foreground)';

export interface EarningsChartPoint {
  label: string;
  system: number;
  reseller: number;
  total: number;
}

export function sourceSwatchStyle(key: EarningsSourceKey | 'total'): React.CSSProperties {
  if (key === 'total') return { backgroundColor: TOTAL_COLOR, opacity: 0.45 };
  return { backgroundColor: SOURCE_COLORS[key] };
}

/**
 * Collapse the API's per-stream series into the two businesses.
 *
 * The backend splits system revenue into the hotspot commission, the PPPoE fee
 * and anything unattributable; for comparing the two businesses those roll up
 * into one line. The breakdown table still shows the split.
 *
 * `cumulative` turns each series into a running total, so the chart answers
 * "how much have we made so far" rather than "what came in that day".
 */
export function toChartPoints(
  series: AdminEarningsPoint[],
  cumulative = false,
): EarningsChartPoint[] {
  let systemRun = 0;
  let resellerRun = 0;

  return series.map((point) => {
    const system = (point.saas_hotspot ?? 0) + (point.saas_pppoe ?? 0) + (point.saas_other ?? 0);
    const reseller = point.reseller ?? 0;

    if (cumulative) {
      systemRun += system;
      resellerRun += reseller;
    }

    const s = Math.round((cumulative ? systemRun : system) * 100) / 100;
    const r = Math.round((cumulative ? resellerRun : reseller) * 100) / 100;

    return { label: point.label, system: s, reseller: r, total: Math.round((s + r) * 100) / 100 };
  });
}
