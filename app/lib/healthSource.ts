/**
 * Where a router's health numbers came from, as a short caption for the
 * Router Health card. Lets an operator see at a glance that a router is
 * reporting its own health (push agent) — or that it is not yet.
 *
 * Backend contract (`GET /api/mikrotik/health`): `health_source` is
 * 'push' | 'snmp' | 'routeros'; `health_sampled_at` is a naive-UTC ISO time,
 * present when the router's own report was used.
 */
export type HealthSource = 'push' | 'snmp' | 'routeros';

function ageText(sampledAt: string | undefined, now: Date): string | null {
  if (!sampledAt) return null;
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(sampledAt) ? sampledAt : `${sampledAt}Z`;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} h ago`;
}

export function healthSourceCaption(
  source: HealthSource | string | undefined,
  sampledAt: string | undefined,
  now: Date = new Date(),
): { text: string; tone: 'good' | 'info' | 'muted' } | null {
  if (!source) return null;
  const age = ageText(sampledAt, now);
  if (source === 'push') {
    return { text: age ? `Reported by router · ${age}` : 'Reported by router', tone: 'good' };
  }
  if (source === 'snmp') {
    return { text: age ? `CPU via SNMP · ${age}` : 'CPU via SNMP', tone: 'info' };
  }
  return { text: 'Checked directly (router not pushing)', tone: 'muted' };
}
