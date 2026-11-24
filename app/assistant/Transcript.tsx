'use client';

import { useEffect, useState } from 'react';
import { splitNext, type ActionRecord, type TranscriptItem } from '../lib/assistant';
import { cardTitle } from '../lib/assistantVisual';
import { useT } from '../lib/i18n';
import ActionCard, { type ActionCardData } from './ActionCard';
import ResultBlock, { visualNoun } from './blocks/ResultBlock';
import { AnswerAccess } from './blocks/access';
import { AlertIcon, ArrowRightIcon, BitwaveMark, ChartIcon, CheckIcon, SpinnerIcon, TableIcon } from './icons';
import Markdown from './Markdown';
import { Signal } from './ui';

type Of<T extends TranscriptItem['type']> = Extract<TranscriptItem, { type: T }>;

/** Fold action results into their cards; the server's action table wins for status. */
export function actionCards(items: TranscriptItem[], records: Record<string, ActionRecord>): Map<string, ActionCardData> {
  const cards = new Map<string, ActionCardData>();
  for (const item of items) {
    if (item.type === 'action') {
      cards.set(item.action_id, {
        action_id: item.action_id, title: item.title, summary: item.summary, method: item.method,
        path: item.path, query: item.query, body: item.body, sensitive: item.sensitive,
        expires_at: item.expires_at, status: item.status, form: item.form,
        previews: item.previews, retry_of: item.retry_of, reason: item.reason,
      });
    } else if (item.type === 'action_result') {
      const card = cards.get(item.action_id);
      if (card) Object.assign(card, { status: item.status, detail: item.detail, payload: item.payload, awaiting: item.awaiting,
        preview: item.preview, preview_of: item.preview_of });
    }
  }
  for (const [id, rec] of Object.entries(records)) {
    const card = cards.get(id);
    if (!card) continue;
    if (rec.status !== 'pending' || card.status === 'pending') card.status = rec.status;
    if (rec.status === 'failed' && !card.detail && rec.result_summary) card.detail = rec.result_summary;
  }
  return cards;
}

/*
 * The transcript is a flat list. For reading, it is grouped twice:
 *  - an exchange: one question and everything that answers it;
 *  - inside an answer, a run: the lookups, the words written from them and the results
 *    to draw. A run is shown as steps, then the words, then the visuals, so the page
 *    reads top to bottom even though the data arrived before the sentence about it.
 */
type Run = { kind: 'run'; key: number; steps: Of<'step'>[]; data: Of<'data'>[]; text?: Of<'assistant'>; textIndex?: number };
type Part = Run | { kind: 'action'; key: number; item: Of<'action'> } | { kind: 'notice'; key: number; item: Of<'notice'> } | { kind: 'support'; key: number; item: Of<'support'> };
type Exchange = { key: number; user?: Of<'user'>; parts: Part[] };

export function groupExchanges(items: TranscriptItem[]): Exchange[] {
  const out: Exchange[] = [];
  // a lookup drawn again in the same answer replaces the earlier drawing
  const replaced = new Set(items.flatMap((it) => (it.type === 'data' && it.replaces ? [it.replaces] : [])));
  let run: Run | null = null;
  const current = (i: number) => {
    if (!out.length) out.push({ key: i, parts: [] });
    return out[out.length - 1];
  };
  const openRun = (i: number) => {
    if (!run || run.text) {
      run = { kind: 'run', key: i, steps: [], data: [] };
      current(i).parts.push(run);
    }
    return run;
  };
  items.forEach((item, i) => {
    switch (item.type) {
      case 'user':
        out.push({ key: i, user: item, parts: [] });
        run = null;
        break;
      case 'step':
        openRun(i).steps.push(item);
        break;
      case 'data':
        if (item.show !== 'none' && !replaced.has(item.call_id)) openRun(i).data.push(item);
        break;
      case 'assistant': {
        const r = openRun(i);
        r.text = item;
        r.textIndex = i;
        break;
      }
      case 'action':
        current(i).parts.push({ kind: 'action', key: i, item });
        run = null;
        break;
      case 'notice':
        current(i).parts.push({ kind: 'notice', key: i, item });
        run = null;
        break;
      case 'support':
        current(i).parts.push({ kind: 'support', key: i, item });
        run = null;
        break;
      default:
        break; // action_result is shown on its card
    }
  });
  return out;
}

/** If the words have not even started this long after the visuals were ready, show them anyway. */
const REVEAL_FAILSAFE_MS = 9000;

/**
 * What the assistant did to answer, as a trace. While it works, each lookup ticks
 * through live; once the words are written it folds into one line ("Checked 3
 * things") that opens again on a tap, so the answer leads and the working stays
 * one tap away.
 */
function Steps({ steps, working, first }: { steps: Of<'step'>[]; working: boolean; first: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!first && steps.length === 0 && !working) return null;
  const allDone = steps.length > 0 && steps.every((s) => s.done);
  const failed = steps.filter((s) => s.done && s.ok === false).length;
  const current = [...steps].reverse().find((s) => !s.done);
  const expanded = working || open;

  let summary: React.ReactNode;
  if (working && steps.length === 0) summary = <span className="flex items-center gap-2 text-ink-2"><Signal />{t('Working…')}</span>;
  else if (working && allDone) summary = <span className="flex items-center gap-2 text-ink-2"><Signal />{t('Writing the answer…')}</span>;
  else if (working && current) summary = <span className="flex min-w-0 items-center gap-2 text-ink-2"><Signal /><span className="truncate">{current.label}</span></span>;
  else if (steps.length > 0) {
    summary = (
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="ai-tap group inline-flex items-center gap-1.5 rounded-full text-ink-3 transition-colors hover:text-ink-1">
        {failed ? <AlertIcon width={12} height={12} className="text-warn" /> : <CheckIcon width={12} height={12} className="text-good" />}
        <span>{t('Checked {n}', { n: steps.length })} {steps.length === 1 ? t('thing') : t('things')}</span>
        <ArrowRightIcon width={11} height={11} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
    );
  } else summary = <span className="ai-display font-semibold text-ink-1">Bitwave</span>;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-6 items-center gap-2.5 text-[13px]">
        {first ? <BitwaveMark size={26} live={working} /> : <span className="w-6 shrink-0" aria-hidden />}
        {summary}
      </div>
      {expanded && steps.length > 0 ? (
        <ul className="m-0 ml-[11px] flex list-none flex-col gap-1.5 border-l border-line py-0.5 pl-[22px] text-[12.5px] text-ink-3">
          {steps.map((s) => (
            <li key={s.call_id} className="relative flex items-center gap-2">
              <span aria-hidden className="absolute -left-[26px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full border border-line-strong"
                style={{ background: !s.done ? 'var(--ai-accent-fill)' : s.ok === false ? 'var(--ai-warn)' : 'var(--ai-s3)' }} />
              {!s.done ? <SpinnerIcon width={11} height={11} className="shrink-0 text-accent" />
                : s.ok === false ? <AlertIcon width={11} height={11} className="shrink-0 text-warn" />
                  : <CheckIcon width={11} height={11} className="shrink-0 text-good" />}
              <span className={`min-w-0 break-words ${!s.done ? 'text-ink-2' : ''}`}>{s.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** While the answer is being written, the finished visuals wait here as shimmering placeholders instead of jumping in above it. */
function PendingVisuals({ data }: { data: Of<'data'>[] }) {
  const rows = data.map((d) => ({ d, noun: visualNoun(d.payload, d.show, d.fields) })).filter((r) => r.noun);
  if (!rows.length) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Results ready, shown once the answer is written">
      {rows.map(({ d, noun }) => (
        <li key={d.call_id} className="ai-shimmer flex items-center gap-2.5 rounded-[14px] border border-line px-3.5 py-3 text-[13px] text-ink-3">
          {noun === 'Chart' ? <ChartIcon width={14} height={14} className="shrink-0" /> : <TableIcon width={14} height={14} className="shrink-0" />}
          <span className="ai-eyebrow shrink-0 !text-ink-2">{noun}</span>
          <span className="truncate">{cardTitle(d.title)}</span>
        </li>
      ))}
    </ul>
  );
}

function RunView({ run, first, live, streaming, currency, onAsk }: {
  run: Run;
  first: boolean;
  /** the run still being worked on: its visuals wait for the words */
  live: boolean;
  streaming: boolean;
  currency?: string | null;
  onAsk?: (q: string) => void;
}) {
  const [forced, setForced] = useState(false);
  const waiting = live && run.data.length > 0 && !forced;
  useEffect(() => {
    if (!waiting || run.text) return;
    const timer = setTimeout(() => setForced(true), REVEAL_FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, [waiting, run.text]);
  const text = run.text ? splitNext(run.text.text).text : '';
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Steps steps={run.steps} working={live && !streaming} first={first} />
      {text ? <Markdown text={text} streaming={streaming} /> : null}
      {run.data.length > 0 ? (
        waiting ? <PendingVisuals data={run.data} /> : (
          <div className="flex flex-col gap-3">
            {run.data.map((d, i) => (
              <div key={d.call_id} className="ai-rise" style={{ animationDelay: `${Math.min(i, 5) * 70}ms` }}>
                <ResultBlock title={d.title} payload={d.payload} show={d.show} fields={d.fields} path={d.path} currency={currency} onAsk={onAsk} />
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

export default function Transcript({ items, records = {}, busy = false, readOnly = false, liveIndex = null, currency, onDecide, onAsk, lastRef, lastMinHeight }: {
  items: TranscriptItem[];
  records?: Record<string, ActionRecord>;
  busy?: boolean;
  readOnly?: boolean;
  /** index of the assistant text that is arriving right now */
  liveIndex?: number | null;
  currency?: string | null;
  onDecide?: (actionId: string, approve: boolean, values?: Record<string, unknown>) => void;
  /** asks a follow-up question (suggestion chips, rows that are questions) */
  onAsk?: (q: string) => void;
  /** the newest exchange: brought to the top of the view and kept one screen tall */
  lastRef?: React.Ref<HTMLDivElement>;
  lastMinHeight?: number;
}) {
  const t = useT();
  const cards = actionCards(items, records);
  const exchanges = groupExchanges(items);
  return (
    <AnswerAccess readOnly={readOnly}>
      {exchanges.map((ex, e) => {
        const last = e === exchanges.length - 1;
        const lastPart = ex.parts[ex.parts.length - 1];
        // the question was just sent and nothing has come back yet
        const waitingForFirst = busy && last && ex.parts.length === 0;
        const lastText = [...ex.parts].reverse().find((p): p is Run => p.kind === 'run' && !!p.text);
        const next = last && !busy && onAsk && lastText?.text ? splitNext(lastText.text.text).next : [];
        const stillPending = [...cards.values()].some((c) => c.status === 'pending');
        let firstRun = true;
        return (
          <div key={ex.key} ref={last ? lastRef : undefined} className="flex flex-col gap-4 py-5 sm:gap-5 sm:py-6"
            style={last && lastMinHeight ? { minHeight: lastMinHeight } : undefined}>
            {ex.user ? (
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-[20px] rounded-br-[6px] border border-line bg-surface-2 px-4 py-2.5 shadow-[inset_0_1px_0_var(--ai-edge)] sm:max-w-[72%]">
                  {ex.user.images && ex.user.images.length > 0 && (
                    <div className={`flex flex-wrap justify-end gap-1.5 ${ex.user.text ? 'mb-2' : ''}`}>
                      {ex.user.images.map((src, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} src={src} alt={t('Photo')} className="h-24 w-24 rounded-[10px] border border-line object-cover" />
                      ))}
                    </div>
                  )}
                  {ex.user.text ? <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-1">{ex.user.text}</p> : null}
                </div>
              </div>
            ) : null}

            {(ex.parts.length > 0 || waitingForFirst) ? (
              <article aria-live={busy && last ? 'polite' : 'off'} className="flex min-w-0 flex-col gap-4">
                {waitingForFirst ? <Steps steps={[]} working first /> : null}
                {ex.parts.map((part) => {
                  switch (part.kind) {
                    case 'run': {
                      const first = firstRun;
                      firstRun = false;
                      const live = busy && last && part === lastPart;
                      return <RunView key={part.key} run={part} first={first} live={live} streaming={live && part.textIndex === liveIndex && liveIndex !== null}
                        currency={currency} onAsk={onAsk} />;
                    }
                    case 'action': {
                      const card = cards.get(part.item.action_id);
                      if (!card) return null;
                      return <ActionCard key={part.key} action={card} busy={busy} readOnly={readOnly || !onDecide} currency={currency}
                        onDecide={(approve, values) => onDecide?.(part.item.action_id, approve, values)} />;
                    }
                    case 'support':
                      return (
                        <div key={part.key} className="ai-card relative overflow-hidden px-4 py-3">
                          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-[var(--ai-info)]" />
                          <p className="ai-eyebrow">{t('Bitwave support')} · {part.item.author}</p>
                          <p className="mt-1.5 whitespace-pre-wrap break-words text-[14.5px] text-ink-1">{part.item.text}</p>
                        </div>
                      );
                    case 'notice':
                      return part.item.level === 'error' ? (
                        <div key={part.key} role="alert" className="flex items-start gap-2.5 rounded-[14px] border border-bad/35 bg-bad/8 px-3.5 py-3 text-[14px] text-ink-1">
                          <AlertIcon className="mt-0.5 shrink-0 text-bad" />
                          <span>{part.item.message}</span>
                        </div>
                      ) : (
                        <p key={part.key} className="text-[13px] text-ink-3">{part.item.message}</p>
                      );
                  }
                })}
                {/* between a lookup and the next thing: say that work goes on */}
                {busy && last && lastPart && lastPart.kind !== 'run' ? <Steps steps={[]} working first={false} /> : null}

                {next.length > 0 && !stillPending ? (
                  <div className="mt-1">
                    <p className="ai-eyebrow mb-2">{t('Ask next')}</p>
                    <div className="flex flex-wrap gap-2">
                      {next.map((q) => (
                        <button key={q} type="button" className="ai-chip group max-sm:w-full max-sm:justify-between max-sm:!rounded-[14px] max-sm:!py-2.5" onClick={() => onAsk?.(q)}>
                          <span className="min-w-0">{q}</span>
                          <ArrowRightIcon width={12} height={12} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-active:translate-x-0.5 group-hover:text-accent group-active:text-accent" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </div>
        );
      })}
    </AnswerAccess>
  );
}
