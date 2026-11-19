'use client';

import { useEffect, useState } from 'react';
import { formatValue, humanizeKey } from '../lib/assistantView';
import type { ActionStatus } from '../lib/assistant';
import { planDuration, planSpeed } from '../lib/assistantEntities';
import { formatMoney } from '../lib/format';
import { useT } from '../lib/i18n';
import ResultBlock from './blocks/ResultBlock';
import { AlertIcon, CheckIcon, SpinnerIcon } from './icons';

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
  return Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null && v !== '');
}

const MONEY_FIELD = /(^|_)(price|amount|balance|fee|cost|original_price)$/i;

/**
 * The values of a change, said the way the dashboard says them: a price with its
 * currency, a plan's length as "7 days" instead of two fields, a speed in Mbps.
 */
function readable(params: [string, unknown][], currency?: string | null): [string, string][] {
  const map = new Map(params);
  const out: [string, string][] = [];
  const hasDuration = map.has('duration_value') && map.has('duration_unit');
  for (const [k, v] of params) {
    if (hasDuration && k === 'duration_unit') continue;
    if (hasDuration && k === 'duration_value') {
      out.push(['Duration', planDuration({ duration_value: v, duration_unit: map.get('duration_unit') })]);
    } else if (MONEY_FIELD.test(k) && typeof v === 'number') {
      out.push([humanizeKey(k), formatMoney(v, currency ?? 'KES')]);
    } else if (k === 'speed') {
      out.push(['Speed', planSpeed(v) ?? formatValue(v)]);
    } else {
      out.push([humanizeKey(k), typeof v === 'string' && /^[a-z]+(_[a-z]+)*$/.test(v) && k.endsWith('_type') ? humanizeKey(v) : formatValue(v)]);
    }
  }
  return out;
}

const VERB: Record<string, string> = { POST: 'Create / run', PUT: 'Update', PATCH: 'Update', DELETE: 'Delete' };

/**
 * A change the assistant proposes. Nothing runs until the person taps Confirm:
 * the card says in plain words what will happen and with which values.
 */
export default function ActionCard({ action, busy, readOnly, currency, onDecide }: {
  action: ActionCardData;
  busy: boolean;
  readOnly?: boolean;
  currency?: string | null;
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
  const params = readable([...fields(action.query), ...fields(action.body)], currency);
  const danger = action.method === 'DELETE' || action.sensitive;
  const waiting = status === 'pending';

  const badge: Record<ActionStatus, { label: string; cls: string; icon?: React.ReactNode }> = {
    pending: { label: t('Waiting for you'), cls: 'bg-accent-soft text-accent' },
    running: { label: t('Running…'), cls: 'bg-surface-3 text-ink-2', icon: <SpinnerIcon width={11} height={11} /> },
    done: { label: t('Done'), cls: 'bg-good/15 text-[var(--ai-text-good)]', icon: <CheckIcon width={11} height={11} /> },
    failed: { label: t('Failed'), cls: 'bg-bad/15 text-[var(--ai-text-bad)]', icon: <AlertIcon width={11} height={11} /> },
    declined: { label: t('Cancelled'), cls: 'bg-surface-3 text-ink-3' },
    expired: { label: t('Expired'), cls: 'bg-surface-3 text-ink-3' },
  };

  return (
    <section data-testid="assistant-action"
      className={`@container ai-card overflow-hidden ${waiting ? (danger ? '!border-bad/50' : '!border-accent/50') : ''}`}>
      <div className={`h-1 ${waiting ? (danger ? 'bg-bad' : 'bg-accent-fill') : status === 'done' ? 'bg-good' : status === 'failed' ? 'bg-bad' : 'bg-surface-3'}`} aria-hidden />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t(VERB[action.method] ?? 'Change')}</p>
            <p className="ai-display mt-0.5 break-words text-[16px] font-bold leading-snug text-ink-1">{action.summary || action.title}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${badge[status].cls}`}>
            {badge[status].icon}{badge[status].label}
          </span>
        </div>

        {params.length > 0 && (
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 text-[13px] @2xl:grid-cols-2">
            {params.slice(0, 24).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-x-3 border-b border-line pb-1.5">
                <dt className="text-ink-3">{k}</dt>
                <dd className="min-w-0 break-words text-ink-1">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {action.sensitive && waiting && (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad/40 bg-bad/10 px-3 py-2 text-[13px] text-ink-1">
            <AlertIcon className="mt-0.5 shrink-0 text-bad" />
            {t('This moves money or changes where it goes. Check the amount and destination before you confirm.')}
          </p>
        )}

        {waiting && !readOnly && (
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={() => onDecide(true)}
              className={`ai-btn ${danger ? 'ai-btn-danger' : 'ai-btn-primary'} min-h-[44px] flex-1 px-6 text-[14px] @md:flex-none`}>
              {t('Confirm')}
            </button>
            <button type="button" disabled={busy} onClick={() => onDecide(false)} className="ai-btn ai-btn-ghost min-h-[44px] flex-1 px-5 text-[14px] @md:flex-none">
              {t('Cancel')}
            </button>
          </div>
        )}
        {waiting && readOnly && <p className="mt-3 text-[12.5px] text-ink-3">{t('View-as is read-only: changes are disabled.')}</p>}

        {status === 'failed' && action.detail && <p className="mt-3 break-words text-[13px] text-[var(--ai-text-bad)]">{action.detail}</p>}
        {status === 'expired' && <p className="mt-3 text-[12.5px] text-ink-3">{t('Not run. Ask again if you still want this.')}</p>}

        <p className="mt-3 break-all font-mono text-[11px] text-ink-3">{action.title} · {action.method} {action.path}</p>
      </div>
      {status === 'done' && action.payload !== undefined && action.payload !== null && (
        <div className="border-t border-line bg-surface-2/40 p-3 sm:p-4">
          <ResultBlock title={t('Result')} payload={action.payload} currency={currency} />
        </div>
      )}
    </section>
  );
}
