'use client';

import { useEffect, useState } from 'react';
import { assistantApi, type AssistantUsageReport } from '../../lib/assistant';
import { useT } from '../../lib/i18n';

const usd = (v: number) => (v < 0.01 && v > 0 ? '< $0.01' : `$${v.toFixed(2)}`);

/** How much the assistant is used and roughly what it costs (list-price estimate). */
export default function UsagePanel() {
  const t = useT();
  const [report, setReport] = useState<AssistantUsageReport | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    assistantApi.adminUsage(30).then(setReport).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="mb-3 text-xs text-danger">{error}</p>;
  if (!report) return null;
  const windows: [string, keyof AssistantUsageReport['summary']][] = [
    [t('Today'), 'today'], [t('7 days'), '7d'], [t('30 days'), '30d'],
  ];

  return (
    <div className="mb-4 rounded-xl border border-border bg-background-secondary p-3" data-testid="assistant-usage">
      <div className="grid grid-cols-3 gap-2">
        {windows.map(([label, key]) => {
          const w = report.summary[key];
          return (
            <div key={key} className="rounded-lg bg-background-tertiary px-3 py-2 min-w-0">
              <p className="text-[11px] text-foreground-muted">{label}</p>
              <p className="text-lg font-bold text-foreground leading-tight">{w.questions.toLocaleString()}</p>
              <p className="text-[11px] text-foreground-muted truncate">
                {w.accounts === 1 ? t('1 account') : t('{n} accounts', { n: w.accounts })}
              </p>
              <p className="text-[11px] font-medium text-foreground">{usd(w.cost_usd)}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-foreground-muted">{t('Questions asked, accounts using it, and estimated model cost.')}</p>
        {report.top_accounts.length > 0 && (
          <button type="button" className="text-xs font-semibold text-accent-primary min-h-[36px] px-2" onClick={() => setOpen((v) => !v)}>
            {open ? t('Hide') : t('Busiest accounts')}
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-1 divide-y divide-border/60">
          {report.top_accounts.map((a) => (
            <li key={a.user_id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
              <span className="truncate text-foreground">{a.organization_name || a.email || `#${a.user_id}`}</span>
              <span className="flex-shrink-0 text-foreground-muted">{t('{n} questions', { n: a.questions })} · {usd(a.cost_usd)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
