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
