import type { AdminEarningsPoint, AdminEarningsTotals } from '../../lib/types';

/**
 * The bands on the chart. Bitwave's side is drawn as two bands so SMS credit
 * sales stand out from subscription fees and ad commission; together they are
 * "Bitwave earnings" (the API's `system` totals).
 */
export type EarningsSourceKey = 'system' | 'sms' | 'reseller';

/** Stacking order, bottom to top. */
export const SOURCE_ORDER: EarningsSourceKey[] = ['system', 'sms', 'reseller'];

export const SOURCE_LABELS: Record<EarningsSourceKey, string> = {
  system: 'Subscriptions and ad commission',
  sms: 'SMS credit sales',
  reseller: 'My own reseller accounts',
};

/** Both Bitwave bands together: what the API's `system` totals mean. */
export const BITWAVE_LABEL = 'Bitwave earnings';

/**
 * One hue per band: the same three the Bitwave earnings card uses for hotspot
 * commission, SMS credit sales and the minimum fee, validated there for 3:1
 * contrast on both the light and dark card surfaces. SMS keeps its pink so it
 * reads as the same stream on both cards.
 */
export const SOURCE_COLORS: Record<EarningsSourceKey, string> = {
  system: '#5850ec',
  sms: '#db2777',
  reseller: '#d97706',
};

/**
 * The total is a sum, not another category, so it wears text ink rather than
 * taking a categorical hue — it reads as the aggregate of the bands beneath it.
 */
export const TOTAL_COLOR = 'var(--color-foreground)';

export interface EarningsChartPoint {
  label: string;
  /** What each band brought in during this bucket — the stacked bars. */
  system: number;
  sms: number;
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

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Collapse the API's per-stream series into the chart's bands, and carry the
 * running total alongside.
 *
 * The backend splits Bitwave's side into the hotspot commission, the PPPoE
 * fee, anything unattributable, SMS credit sales and the 20% ad commission.
 * The chart keeps SMS as its own band and rolls the rest into one; the
 * breakdown table still shows every stream.
 */
export function toChartPoints(
  series: AdminEarningsPoint[],
  cumulative = false,
): EarningsChartPoint[] {
  let systemRun = 0;
  let smsRun = 0;
  let resellerRun = 0;

  return series.map((point) => {
    const daySystem = (point.saas_hotspot ?? 0) + (point.saas_pppoe ?? 0) + (point.saas_other ?? 0)
      + (point.ad_commission ?? 0);
    const daySms = point.sms_credits ?? 0;
    const dayReseller = point.reseller ?? 0;
    systemRun += daySystem;
    smsRun += daySms;
    resellerRun += dayReseller;

    return {
      label: point.label,
      system: round2(cumulative ? systemRun : daySystem),
      sms: round2(cumulative ? smsRun : daySms),
      reseller: round2(cumulative ? resellerRun : dayReseller),
      runningTotal: round2(systemRun + smsRun + resellerRun),
    };
  });
}

/** A period's totals split into the chart's bands. */
export function bandTotals(totals: AdminEarningsTotals): Record<EarningsSourceKey, number> {
  const sms = totals.sms_credits ?? 0;
  return {
    system: round2(totals.system - sms),
    sms,
    reseller: totals.reseller,
  };
}

/** Same rule as the backend's change_percent. */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}
