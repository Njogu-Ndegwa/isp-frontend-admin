'use client';

import { useEffect, useState } from 'react';
import { formatValue, humanizeKey } from '../lib/assistantView';
import type { ActionStatus } from '../lib/assistant';
import { useT } from '../lib/i18n';
import ResultBlock from './ResultBlock';

export interface ActionCardData {
  action_id: string;
  title: string;
  summary: string;
  method: string;
  path: string;
  query?: Record<string, unknown> | null;
  body?: unknown;
  sensitive?: boolean;
  expires_at?: string;
  status: ActionStatus;
  detail?: string;
  payload?: unknown;
}

function fields(value: unknown): [string, unknown][] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value === undefined || value === null ? [] : [['value', value]];
  return Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
}

const VERB: Record<string, string> = { POST: 'Create / run', PUT: 'Update', PATCH: 'Update', DELETE: 'Delete' };

export default function ActionCard({ action, busy, readOnly, onDecide }: {
  action: ActionCardData;
  busy: boolean;
  readOnly?: boolean;
  onDecide: (approve: boolean) => void;
}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (action.status !== 'pending') return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [action.status]);
  const expired = action.status === 'pending' && !!action.expires_at && new Date(action.expires_at).getTime() < now;
  const status: ActionStatus = expired ? 'expired' : action.status;
  const params = [...fields(action.query), ...fields(action.body)];
  const danger = action.method === 'DELETE' || action.sensitive;

  const badge: Record<ActionStatus, { label: string; cls: string }> = {
    pending: { label: t('Waiting for you'), cls: 'bg-warning/15 text-warning' },
    running: { label: t('Running…'), cls: 'bg-info/15 text-info' },
    done: { label: t('Done'), cls: 'bg-success/15 text-success' },
    failed: { label: t('Failed'), cls: 'bg-danger/15 text-danger' },
    declined: { label: t('Cancelled'), cls: 'bg-background-tertiary text-foreground-muted' },
    expired: { label: t('Expired'), cls: 'bg-background-tertiary text-foreground-muted' },
  };

  return (
    <div className={`rounded-xl border ${danger && status === 'pending' ? 'border-danger/40' : 'border-accent-primary/40'} bg-background-secondary overflow-hidden`}
      data-testid="assistant-action">
      <div className="px-3 py-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">{t(VERB[action.method] ?? 'Change')}</p>
          <p className="text-sm font-semibold text-foreground break-words">{action.summary || action.title}</p>
          <p className="text-[11px] text-foreground-muted mt-0.5 break-all">
            {action.title} · <span className="font-mono">{action.method} {action.path}</span>
          </p>
        </div>
        <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge[status].cls}`}>{badge[status].label}</span>
      </div>

      {params.length > 0 && (
        <dl className="px-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {params.slice(0, 24).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 min-w-0 border-b border-border/60 pb-1">
              <dt className="text-[11px] text-foreground-muted flex-shrink-0">{humanizeKey(k)}</dt>
              <dd className="text-xs text-foreground text-right break-words min-w-0">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {action.sensitive && status === 'pending' && (
        <p className="mx-3 mb-2 text-xs text-danger bg-danger/10 rounded-lg px-2 py-1.5">
          {t('This moves money or changes where it goes. Check the amount and destination before you confirm.')}
        </p>
      )}

      {status === 'pending' && !readOnly && (
        <div className="px-3 pb-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => onDecide(true)}
            className={`${danger ? 'bg-danger text-white hover:opacity-90' : 'btn-primary'} flex-1 sm:flex-none rounded-lg px-5 py-2 text-sm font-semibold min-h-[44px] disabled:opacity-50`}>
            {t('Confirm')}
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide(false)}
            className="btn-secondary flex-1 sm:flex-none min-h-[44px] disabled:opacity-50">
            {t('Cancel')}
          </button>
        </div>
      )}

      {status === 'failed' && action.detail && (
        <p className="mx-3 mb-3 text-xs text-danger break-words">{action.detail}</p>
      )}
      {status === 'expired' && (
        <p className="mx-3 mb-3 text-xs text-foreground-muted">{t('Not run. Ask again if you still want this.')}</p>
      )}
      {status === 'done' && action.payload !== undefined && action.payload !== null && (
        <div className="px-3 pb-3"><ResultBlock title={t('Result')} payload={action.payload} compact /></div>
      )}
    </div>
  );
}
