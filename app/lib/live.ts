// Formatting for the real-time push pilot (live router / device state).

import type { LiveQueueStatus } from './types';

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`;
  return `${Math.round(bps)} bps`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function formatAge(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
}

/** RouterOS simple-queue max-limit is "upload/download" in bits per second. */
export function formatMaxLimit(maxLimit: string | null | undefined): string {
  if (!maxLimit) return '—';
  const [up, down] = maxLimit.split('/').map((v) => Number(v));
  if (!Number.isFinite(up) || !Number.isFinite(down)) return maxLimit;
  return `${formatBps(down)} ↓ / ${formatBps(up)} ↑`;
}

export const QUEUE_STATUS_LABEL: Record<LiveQueueStatus, string> = {
  ok: 'On own speed limit',
  shadowed: "On another customer's speed limit",
  no_limit: 'No speed limit applied',
  offline: 'Offline',
};

export const QUEUE_STATUS_TONE: Record<LiveQueueStatus, string> = {
  ok: 'text-emerald-500',
  shadowed: 'text-warning',
  no_limit: 'text-danger',
  offline: 'text-foreground-muted',
};
