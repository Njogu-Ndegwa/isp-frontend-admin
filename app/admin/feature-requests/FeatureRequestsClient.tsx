'use client';

/*
 * What resellers asked for that the app cannot do yet, as one list to build from.
 * The assistant records a request when someone asks for something no action covers,
 * and adds a vote to an existing one when another account asks for the same thing;
 * ideas posted on the feedback board are here too. The top of the list is what to
 * build next: Bitwave's own order first (set with the arrows), then the rest by the
 * board's score (impact the AI rated, how many accounts asked, how recent). Each
 * request can be moved through planned, in progress and done, and its work packet
 * copied for whoever builds it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import { assistantApi, type FeatureRequest } from '../../lib/assistant';
import { copyText } from '../../lib/clipboard';
import { useT } from '../../lib/i18n';

const TABS: { key: string; label: string; status?: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'planned', label: 'Planned', status: 'planned' },
  { key: 'in_progress', label: 'In progress', status: 'in_progress' },
  { key: 'fixed', label: 'Done', status: 'fixed' },
  { key: 'declined', label: 'Declined', status: 'declined' },
];
const STATUS_LABEL: Record<string, string> = {
  new: 'New', under_review: 'Looking at it', planned: 'Planned', in_progress: 'In progress', fixed: 'Done', declined: 'Declined', duplicate: 'Duplicate',
};
const STATUS_TONE: Record<string, string> = {
  new: 'bg-accent-primary/15 text-accent-primary', under_review: 'bg-warning/15 text-warning', planned: 'bg-info/15 text-info',
  in_progress: 'bg-success/15 text-success', fixed: 'bg-success/15 text-success', declined: 'bg-background-tertiary text-foreground-muted',
};

const ago = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  const h = (Date.now() - d.getTime()) / 3_600_000;
  return h < 1 ? 'just now' : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`;
};

export default function FeatureRequestsClient() {
  const t = useT();
  const [tab, setTab] = useState('open');
  const [items, setItems] = useState<FeatureRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const status = TABS.find((x) => x.key === tab)?.status;
  const load = useCallback(async () => {
    try {
      setItems((await assistantApi.adminFeatureRequests(status)).items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [status]);
  useEffect(() => { void load(); }, [load]);

  const ordered = useMemo(() => (items ?? []).filter((i) => i.admin_rank !== null).length, [items]);

  // moving one sets the order of the whole list as it now stands
  const move = async (index: number, to: number) => {
    if (!items || to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(to, 0, it);
    setItems(next.map((x, i) => ({ ...x, admin_rank: i + 1 })));
    setBusy(true);
    try { await assistantApi.adminSetFeatureOrder(next.map((x) => x.id)); } catch (e) { setError((e as Error).message); await load(); }
    setBusy(false);
  };
  const resetOrder = async () => {
    setBusy(true);
    try { await assistantApi.adminSetFeatureOrder([]); await load(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const setStatus = async (id: number, value: string) => {
    setBusy(true);
    try { await assistantApi.adminSetFeedbackStatus(id, value); await load(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const copyPacket = async (id: number) => {
    try {
      const { markdown } = await assistantApi.adminWorkPacket(id);
      await copyText(markdown);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Header title={t('Feature requests')} subtitle={t('What resellers asked for that the app cannot do yet. Top of the list = build next.')} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map((x) => (
          <button key={x.key} type="button" onClick={() => setTab(x.key)}
            className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold ${tab === x.key ? 'border-accent-primary bg-accent-primary/15 text-foreground' : 'border-border text-foreground-muted hover:text-foreground'}`}>
            {t(x.label)}
          </button>
        ))}
        {ordered > 0 && tab === 'open' ? (
          <button type="button" onClick={resetOrder} disabled={busy} className="ml-auto text-xs font-medium text-foreground-muted hover:text-foreground disabled:opacity-50">
            {t('Reset to score order')}
          </button>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-foreground-muted">
        {tab === 'open'
          ? t('Use the arrows to put them in the order you want to build them. Without an order, they rank by impact (rated by the AI), how many accounts asked, and how recent.')
          : t('Requests in this state.')}
      </p>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {items === null ? <p className="text-sm text-foreground-muted">{t('Loading…')}</p> : null}
      {items && !items.length ? <p className="card p-6 text-center text-sm text-foreground-muted">{t('Nothing here yet.')}</p> : null}

      <ol className="space-y-2">
        {(items ?? []).map((r, i) => {
          const expanded = open === r.id;
          return (
            <li key={r.id} className="card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold tabular-nums ${r.admin_rank !== null ? 'bg-accent-primary/15 text-accent-primary' : 'bg-background-tertiary text-foreground-muted'}`}
                    title={r.admin_rank !== null ? t('Your order') : t('By score')}>{i + 1}</span>
                  {tab === 'open' ? (
                    <div className="flex flex-col">
                      <button type="button" aria-label={t('Move up')} disabled={busy || i === 0} onClick={() => move(i, i - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-background-tertiary hover:text-foreground disabled:opacity-30">▲</button>
                      <button type="button" aria-label={t('Move down')} disabled={busy || i === (items?.length ?? 0) - 1} onClick={() => move(i, i + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-background-tertiary hover:text-foreground disabled:opacity-30">▼</button>
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <button type="button" className="block w-full text-left" onClick={() => setOpen(expanded ? null : r.id)} aria-expanded={expanded}>
                    <p className="break-words text-sm font-semibold text-foreground">{r.title}</p>
                    {r.ai_summary ? <p className="mt-0.5 text-xs text-foreground-muted">{r.ai_summary}</p> : null}
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 font-semibold text-foreground">
                      {r.upvotes === 1 ? t('1 account asked') : t('{n} accounts asked', { n: r.upvotes })}
                    </span>
                    {r.ai_severity ? <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-foreground-muted">{t('Impact {n}/5', { n: r.ai_severity })}</span> : null}
                    {r.ai_affected_area ? <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-foreground-muted">{r.ai_affected_area}</span> : null}
                    {r.source === 'assistant' ? <span className="rounded-full bg-background-tertiary px-2 py-0.5 text-foreground-muted">{t('asked in the assistant')}</span> : null}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_TONE[r.status] ?? 'bg-background-tertiary text-foreground-muted'}`}>{t(STATUS_LABEL[r.status] ?? r.status)}</span>
                    <span className="text-foreground-muted">{r.author?.name ? `${r.author.name} · ` : ''}{ago(r.created_at)}</span>
                  </div>
                  {expanded ? (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <p className="whitespace-pre-line break-words text-sm text-foreground-muted">{r.body}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-foreground-muted" htmlFor={`st-${r.id}`}>{t('Status')}</label>
                        <select id={`st-${r.id}`} value={r.status} disabled={busy} onChange={(e) => void setStatus(r.id, e.target.value)}
                          className="min-h-[36px] rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                          {['new', 'under_review', 'planned', 'in_progress', 'fixed', 'declined'].map((s) => <option key={s} value={s}>{t(STATUS_LABEL[s])}</option>)}
                        </select>
                        <button type="button" onClick={() => void copyPacket(r.id)}
                          className="min-h-[36px] rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-background-tertiary">
                          {copied === r.id ? t('Copied') : t('Copy work packet')}
                        </button>
                      </div>
                      <p className="text-[11px] text-foreground-muted">{t('The work packet is a brief for whoever builds it: the request, what people said, duplicates and the AI notes.')}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
