'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';
import {
  SmsFailureReason,
  SmsFailureReasonSummary,
  SmsGatewayHealthState,
  SmsGatewayStatus,
} from '../../lib/types';
import { formatTimeSinceUTC } from '../../lib/dateUtils';

// ─── SMS gateway status ───────────────────────────────────────────────────
// Answers the question a reseller actually has: "are my messages going out,
// and if not, why?" Portal credits can't answer it for someone on their own
// gateway — they pay their vendor directly, so the portal balance reads 0
// while the real balance sits with the vendor.
//
// Everything here comes from GET /messaging/gateway/status (or the admin
// variant for one reseller): health from recent sends, failure reasons in
// plain words with the fix, send counts, and the gateway's live balance.

/** Load a status report. Pass `resellerId` for the admin view of one reseller. */
export function useGatewayStatus(resellerId?: number | null, enabled = true) {
  const [status, setStatus] = useState<SmsGatewayStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = resellerId != null
        ? await api.getAdminResellerGatewayStatus(resellerId, refresh)
        : await api.getSmsGatewayStatus(refresh);
      // A backend without this endpoint (or a proxy error page) must not
      // crash the Messaging page — treat anything malformed as "no report".
      setStatus(data && data.health && data.metrics && data.balance ? data : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gateway status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resellerId]);

  useEffect(() => { if (enabled) load(false); }, [load, enabled]);

  return { status, loading, refreshing, error, reload: load };
}

const STATE_STYLE: Record<SmsGatewayHealthState, { box: string; dot: string; label: string }> = {
  ok: { box: 'border-green-500/30 bg-green-500/5', dot: 'bg-green-500', label: 'Sending normally' },
  degraded: { box: 'border-amber-500/30 bg-amber-500/5', dot: 'bg-amber-500', label: 'Some messages failing' },
  failing: { box: 'border-red-500/40 bg-red-500/5', dot: 'bg-red-500', label: 'Messages are not sending' },
  unverified: { box: 'border-amber-500/30 bg-amber-500/5', dot: 'bg-amber-500', label: 'Waiting to confirm fix' },
  idle: { box: 'border-border bg-background-secondary', dot: 'bg-foreground-muted', label: 'No recent messages' },
};

function ago(ts: string | null | undefined): string | null {
  return formatTimeSinceUTC(ts ?? null);
}

function formatAmount(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null) return '—';
  const n = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${unit} ${n}` : n;
}

function ReasonDetail({ reason }: { reason: SmsFailureReason }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-foreground">{reason.explanation}</p>
      <p className="text-sm text-foreground">
        <span className="font-semibold">How to fix: </span>{reason.action}
      </p>
      {reason.raw_error && (
        <p className="text-xs text-foreground-muted">
          Gateway said: <span className="font-mono break-all">{reason.raw_error}</span>
        </p>
      )}
    </div>
  );
}

/** Compact red banner for the top of the Messaging page. Renders nothing unless failing. */
export function GatewayFailureBanner({
  status,
  onOpenDetails,
}: {
  status: SmsGatewayStatus | null;
  onOpenDetails?: () => void;
}) {
  if (!status || status.health.state !== 'failing') return null;
  const { health } = status;
  // The title already names the reason; don't repeat it as the first sentence.
  const lead = health.reason ? `${health.reason.title}. ` : '';
  const message = lead && health.message.startsWith(lead)
    ? health.message.slice(lead.length)
    : health.message;
  return (
    <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            SMS not sending{health.reason ? ` — ${health.reason.title}` : ''}
          </p>
          {message && <p className="text-sm text-foreground-muted">{message}</p>}
          {health.reason && (
            <p className="text-sm text-foreground">
              <span className="font-semibold">How to fix: </span>{health.reason.action}
            </p>
          )}
        </div>
      </div>
      {onOpenDetails && (
        <button
          type="button"
          onClick={onOpenDetails}
          className="ml-4 text-sm font-medium text-accent-primary hover:underline"
        >
          See details
        </button>
      )}
    </div>
  );
}

function BalanceTile({
  status,
  refreshing,
  onRefresh,
}: {
  status: SmsGatewayStatus;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { balance, gateway } = status;
  const label = gateway.provider_label ?? gateway.provider ?? 'Your gateway';

  let body: ReactNode;
  if (!balance.available) {
    body = (
      <p className="text-sm text-foreground-muted">
        {balance.unavailable_reason === 'not_supported'
          ? `${label} does not report its balance to us. Check it on your ${label} dashboard.`
          : balance.unavailable_reason === 'config_error'
            ? 'Your gateway settings could not be loaded. Save them again under Gateway.'
            : 'Balance not available.'}
      </p>
    );
  } else if (!balance.ok) {
    body = (
      <p className="text-sm text-danger">
        {balance.failure?.title ?? 'Could not read the balance'}
        {balance.error && (
          <span className="block text-xs text-foreground-muted mt-0.5 font-mono break-all">{balance.error}</span>
        )}
      </p>
    );
  } else {
    const low = (balance.balance ?? 0) <= 0;
    body = (
      <p className={`text-3xl font-bold ${low ? 'text-danger' : 'text-foreground'}`}>
        {formatAmount(balance.balance, balance.unit)}
      </p>
    );
  }

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground-muted">{label} balance</p>
        {balance.available && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50"
          >
            {refreshing ? 'Checking…' : 'Check now'}
          </button>
        )}
      </div>
      {body}
      <p className="text-xs text-foreground-muted">
        Read live from {label}, where your SMS credit is held.
        {balance.checked_at && ` Checked ${ago(balance.checked_at)}.`}
      </p>
    </div>
  );
}

function MetricsGrid({ status }: { status: SmsGatewayStatus }) {
  const { windows, last_sent_at, last_failed_at } = status.metrics;
  const cols: [string, keyof typeof windows][] = [
    ['Last 24 hours', '24h'],
    ['Last 7 days', '7d'],
    ['Last 30 days', '30d'],
  ];
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Messages sent</p>
      <div className="grid grid-cols-3 gap-3">
        {cols.map(([label, key]) => {
          const w = windows[key];
          return (
            <div key={key} className="min-w-0">
              <p className="text-xs text-foreground-muted">{label}</p>
              <p className="text-lg font-semibold text-foreground">{w.sent.toLocaleString()}</p>
              <p className="text-xs">
                <span className={w.failed ? 'text-danger' : 'text-foreground-muted'}>
                  {w.failed.toLocaleString()} failed
                </span>
                {w.success_rate != null && (
                  <span className="text-foreground-muted"> · {Math.round(w.success_rate * 100)}% ok</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border text-xs text-foreground-muted">
        <span>Last sent: {ago(last_sent_at) ?? 'none in 30 days'}</span>
        <span>Last failure: {ago(last_failed_at) ?? 'none in 30 days'}</span>
      </div>
    </div>
  );
}

const SEVERITY_LABEL: Record<SmsFailureReason['severity'], string> = {
  blocking: 'Stops all messages',
  per_message: 'One customer only',
  temporary: 'Usually temporary',
};

function ReasonList({ reasons }: { reasons: SmsFailureReasonSummary[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Why messages failed (last 30 days)</p>
      <ul className="space-y-3">
        {reasons.map((r) => (
          <li key={r.code} className="border-t border-border pt-3 first:border-0 first:pt-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{r.title}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-danger">
                {r.count.toLocaleString()} failed
              </span>
              <span className="text-xs text-foreground-muted">{SEVERITY_LABEL[r.severity]}</span>
              {r.last_seen && (
                <span className="text-xs text-foreground-muted">· last {ago(r.last_seen)}</span>
              )}
            </div>
            <ReasonDetail reason={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The full status card: health, live gateway balance, send counts, failure reasons. */
export default function GatewayStatusCard({
  resellerId,
  status: given,
  onReload,
}: {
  /** Admin: show this reseller's status. Omit for the signed-in reseller. */
  resellerId?: number | null;
  /** Use an already-loaded report (and its reload) instead of fetching. */
  status?: SmsGatewayStatus | null;
  onReload?: (refresh: boolean) => void | Promise<void>;
}) {
  const controlled = given !== undefined;
  const own = useGatewayStatus(resellerId, !controlled);
  const status = controlled ? given : own.status;
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (controlled) {
      setRefreshing(true);
      try { await onReload?.(true); } finally { setRefreshing(false); }
    } else {
      await own.reload(true);
    }
  };

  if (!controlled && own.loading) {
    return (
      <div className="card p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!controlled && own.error) {
    return (
      <div className="card p-4 space-y-2 text-center">
        <p className="text-sm text-danger">{own.error}</p>
        <button type="button" onClick={() => own.reload(false)} className="btn-secondary px-4 py-1.5 text-sm">
          Retry
        </button>
      </div>
    );
  }
  if (!status) return null;

  const { health, gateway } = status;
  const style = STATE_STYLE[health.state] ?? STATE_STYLE.idle;
  const onOwnGateway = gateway.source === 'reseller';

  return (
    <section className="space-y-3" aria-label="SMS gateway status">
      <div className={`rounded-xl border p-4 space-y-2 ${style.box}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} />
          <p className="text-sm font-semibold text-foreground">{style.label}</p>
          <span className="text-xs text-foreground-muted ml-auto">
            {onOwnGateway
              ? `${gateway.provider_label ?? gateway.provider}${gateway.sender_id ? ` · ${gateway.sender_id}` : ''}`
              : 'Platform gateway'}
          </span>
        </div>
        <p className="text-sm text-foreground-muted">{health.message}</p>
        {health.failing_since && health.state !== 'ok' && (
          <p className="text-xs text-foreground-muted">Failing since {ago(health.failing_since)}</p>
        )}
        {health.reason && health.state !== 'ok' && (
          <div className="pt-2 border-t border-border/60">
            <p className="text-sm font-semibold text-foreground mb-1">{health.reason.title}</p>
            <ReasonDetail reason={health.reason} />
          </div>
        )}
      </div>

      {onOwnGateway && (
        <BalanceTile status={status} refreshing={controlled ? refreshing : own.refreshing} onRefresh={refresh} />
      )}
      <MetricsGrid status={status} />
      <ReasonList reasons={status.failure_reasons} />
    </section>
  );
}
