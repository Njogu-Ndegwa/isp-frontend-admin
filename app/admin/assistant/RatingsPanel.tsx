'use client';

import { useEffect, useState } from 'react';
import { assistantApi, type AssistantRatingsReport } from '../../lib/assistant';
import { useT } from '../../lib/i18n';

const ago = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  const h = (Date.now() - d.getTime()) / 3_600_000;
  return h < 1 ? 'just now' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`;
};

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/**
 * What resellers think of the assistant: the average, how the stars spread, and the
 * latest reviews with whose they are. Ideas they sent with a rating are on the
 * feedback board (titled "Assistant: ..."), with votes and triage.
 */
export default function RatingsPanel() {
  const t = useT();
  const [report, setReport] = useState<AssistantRatingsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    assistantApi.adminRatings(100).then(setReport).catch((e: Error) => setError(e.message));
  }, []);

  if (error && !report) return <p className="mb-3 text-xs text-danger">{error}</p>;
  if (!report) return null;
  const max = Math.max(1, ...Object.values(report.distribution));
  const reviews = all ? report.reviews : report.reviews.slice(0, 5);

  return (
    <div className="mb-4 rounded-xl border border-border bg-background-secondary p-3 sm:p-4" data-testid="assistant-ratings">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('How resellers rate the assistant')}</p>
          <p className="text-xs text-foreground-muted">
            {t('Asked quietly under an answer after a few questions, then days apart. Ideas sent with a rating are on the feedback board.')}
          </p>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {report.average !== null ? report.average.toFixed(1) : '–'}<span className="text-sm font-medium text-foreground-muted"> / 5 · {report.count}</span>
        </p>
      </div>

      {report.count > 0 ? (
        <div className="mt-3 grid gap-1">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = report.distribution[String(s)] ?? 0;
            return (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0 tabular-nums text-foreground-muted">{s} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-background-tertiary">
                  <span className={`block h-full rounded-full ${s >= 4 ? 'bg-success' : s === 3 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-foreground-muted">{n}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-foreground-muted">{t('No ratings yet.')}</p>
      )}

      {reviews.length ? (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {reviews.map((r) => (
            <li key={`${r.user_id}-${r.staff_id ?? 0}`} className="py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="min-w-0 text-sm font-medium text-foreground">
                  <span className={r.rating >= 4 ? 'text-success' : r.rating === 3 ? 'text-warning' : 'text-danger'}>{stars(r.rating)}</span>{' '}
                  {r.account}{r.staff_name ? <span className="text-foreground-muted"> · {r.staff_name}</span> : null}
                </p>
                <span className="text-[11px] text-foreground-muted">{t('{n} questions', { n: r.questions })} · {ago(r.updated_at)}</span>
              </div>
              {r.review ? <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground-muted">{r.review}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {report.reviews.length > 5 ? (
        <button type="button" className="mt-1 text-xs font-semibold text-accent-primary hover:underline" onClick={() => setAll((v) => !v)}>
          {all ? t('Show fewer') : t('Show all {n}', { n: report.reviews.length })}
        </button>
      ) : null}
      {report.dismissed_without_rating ? (
        <p className="mt-2 text-[11px] text-foreground-muted">{t('{n} people closed the ask without rating.', { n: report.dismissed_without_rating })}</p>
      ) : null}
    </div>
  );
}
