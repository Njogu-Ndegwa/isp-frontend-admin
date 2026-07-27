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
  /** What each business brought in during this bucket — the stacked bars. */
  system: number;
  reseller: number;
  /** Combined earnings so far this period — the area behind the bars. */
  runningTotal: number;
}

/** Range chips map to the API's calendar periods. */
export type EarningsPeriod = 'week' | 'month' | 'quarter' | 'year';

export const PERIOD_FOR_CHIP: Record<string, EarningsPeriod> = {
  '7d': 'week',
  '30d': 'month',
  '90d': 'quarter',
  '1y': 'year',
};

export const PERIOD_NOUN: Record<EarningsPeriod, string> = {
  week: 'this week',
  month: 'this month',
  quarter: 'this quarter',
  year: 'this year',
};

export function sourceSwatchStyle(key: EarningsSourceKey | 'total'): React.CSSProperties {
  if (key === 'total') return { backgroundColor: TOTAL_COLOR, opacity: 0.45 };
  return { backgroundColor: SOURCE_COLORS[key] };
}

/**
 * Collapse the API's per-stream series into the two businesses, and carry the
 * running total alongside.
 *
 * The backend splits system revenue into the hotspot commission, the PPPoE fee
 * and anything unattributable; comparing the two businesses rolls those into
 * one. The breakdown table still shows the split.
 */
export function toChartPoints(
  series: AdminEarningsPoint[],
  cumulative = false,
): EarningsChartPoint[] {
  let systemRun = 0;
  let resellerRun = 0;

  return series.map((point) => {
    const daySystem = (point.saas_hotspot ?? 0) + (point.saas_pppoe ?? 0) + (point.saas_other ?? 0);
    const dayReseller = point.reseller ?? 0;
    systemRun += daySystem;
    resellerRun += dayReseller;

    const system = cumulative ? systemRun : daySystem;
    const reseller = cumulative ? resellerRun : dayReseller;

    return {
      label: point.label,
      system: Math.round(system * 100) / 100,
      reseller: Math.round(reseller * 100) / 100,
      runningTotal: Math.round((systemRun + resellerRun) * 100) / 100,
    };
  });
}
