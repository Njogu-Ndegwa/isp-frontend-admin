'use client';

import { useEffect, useState } from 'react';
import { assistantApi, type AssistantRollout } from '../../lib/assistant';
import { useT } from '../../lib/i18n';

const STEPS = [0, 5, 10, 25, 50, 100];

/**
 * How many paying reseller accounts start on the AI home instead of the classic
 * dashboard. Trial and suspended accounts are never moved. Each account lands on the
 * same side every time (it is not a coin toss per visit), and a person's own choice
 * always wins over this share.
 */
export default function RolloutPanel() {
  const t = useT();
  const [rollout, setRollout] = useState<AssistantRollout | null>(null);
  const [percent, setPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    assistantApi.adminRollout()
      .then((r) => { setRollout(r); setPercent(r.percent); })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error && !rollout) return <p className="mb-3 text-xs text-danger">{error}</p>;
  if (!rollout) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await assistantApi.adminSetRollout(percent);
      setRollout(r);
      setPercent(r.percent);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const changed = percent !== rollout.percent;

  return (
    <div className="mb-4 rounded-xl border border-border bg-background-secondary p-3 sm:p-4" data-testid="assistant-rollout">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('Who starts on the AI home')}</p>
          <p className="text-xs text-foreground-muted">
            {t('Share of paying reseller accounts (active subscription) that open the chat-first home instead of the classic dashboard when they sign in. Trial and suspended accounts stay on the dashboard; everyone still has the chat in the menu.')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground tabular-nums">{percent}%</p>
          {rollout.paying_accounts !== undefined && percent === rollout.percent ? (
            <p className="text-[11px] text-foreground-muted tabular-nums">{t('{n} of {m} paying accounts', { n: rollout.paying_inside ?? 0, m: rollout.paying_accounts })}</p>
          ) : null}
        </div>
      </div>

      <input type="range" min={0} max={100} step={5} value={percent} onChange={(e) => setPercent(Number(e.target.value))}
        aria-label={t('Share of accounts')} className="mt-3 w-full accent-[var(--accent-primary)]" />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {STEPS.map((s) => (
          <button key={s} type="button" onClick={() => setPercent(s)}
            className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold ${percent === s ? 'border-accent-primary bg-accent-primary/15 text-foreground' : 'border-border text-foreground-muted hover:text-foreground'}`}>
            {s === 0 ? t('Nobody') : s === 100 ? t('Everyone') : `${s}%`}
          </button>
        ))}
        <button type="button" onClick={save} disabled={!changed || saving}
          className="btn-primary ml-auto min-h-[40px] !py-2 disabled:opacity-50">
          {saving ? t('Saving…') : changed ? t('Save') : t('Saved')}
        </button>
      </div>

      <p className="mt-2 text-[11px] text-foreground-muted">
        {rollout.classic_closed
          ? t('Everyone: every reseller account, trial and suspended included, starts on the AI home and the classic dashboard is closed to them. Their own choice no longer counts. Admins are not affected.')
          : t('{a} people chose the AI home themselves and {c} chose the classic dashboard. Their choice wins over this share.', { a: rollout.chose_assistant, c: rollout.chose_classic })}
      </p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
