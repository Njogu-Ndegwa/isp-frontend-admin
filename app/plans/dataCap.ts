import type { FupPeriod } from '../lib/types';

export type DataCapUnit = 'MB' | 'GB';

export function dataCapInputToMb(value: string, unit: DataCapUnit): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const mb = unit === 'GB' ? parsed * 1024 : parsed;
  return Math.round(mb);
}

export function splitDataCapMb(mb?: number | null): { value: string; unit: DataCapUnit } {
  if (!mb || mb <= 0) return { value: '', unit: 'GB' };
  if (mb >= 1024) {
    return { value: formatDataCapValue(mb / 1024), unit: 'GB' };
  }
  return { value: String(mb), unit: 'MB' };
}

function formatDataCapValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export const FUP_PERIOD_OPTIONS: { value: FupPeriod; label: string; hint: string }[] = [
  {
    value: 'plan',
    label: 'Per plan period',
    hint: 'The cap covers the whole paid period and starts again when the customer renews.',
  },
  {
    value: 'daily',
    label: 'Daily',
    hint: 'The cap starts again every day at midnight (EAT); slowed customers get full speed back then.',
  },
];

/** Anything missing or unknown is the original per-period cap. */
export function normalizeFupPeriod(value?: string | null): FupPeriod {
  return value === 'daily' ? 'daily' : 'plan';
}

export function fupPeriodHint(value?: string | null): string {
  const period = normalizeFupPeriod(value);
  return FUP_PERIOD_OPTIONS.find((o) => o.value === period)!.hint;
}

/** "1 GB" -> "1 GB/day" for daily plans; unchanged for per-period plans. */
export function withFupPeriod(capLabel: string, value?: string | null): string {
  return normalizeFupPeriod(value) === 'daily' ? `${capLabel}/day` : capLabel;
}
