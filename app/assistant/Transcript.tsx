'use client';

import type { ActionRecord, TranscriptItem } from '../lib/assistant';
import { useT } from '../lib/i18n';
import ActionCard, { type ActionCardData } from './ActionCard';
import Markdown from './Markdown';
import ResultBlock from './ResultBlock';

/** Fold action results into their cards; the server's action table wins for status. */
export function actionCards(items: TranscriptItem[], records: Record<string, ActionRecord>): Map<string, ActionCardData> {
  const cards = new Map<string, ActionCardData>();
  for (const item of items) {
    if (item.type === 'action') {
      cards.set(item.action_id, {
        action_id: item.action_id, title: item.title, summary: item.summary, method: item.method,
        path: item.path, query: item.query, body: item.body, sensitive: item.sensitive,
        expires_at: item.expires_at, status: item.status,
      });
    } else if (item.type === 'action_result') {
      const card = cards.get(item.action_id);
      if (card) Object.assign(card, { status: item.status, detail: item.detail, payload: item.payload });
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

export default function Transcript({ items, records = {}, busy = false, readOnly = false, onDecide }: {
  items: TranscriptItem[];
  records?: Record<string, ActionRecord>;
  busy?: boolean;
  readOnly?: boolean;
  onDecide?: (actionId: string, approve: boolean) => void;
}) {
  const t = useT();
  const cards = actionCards(items, records);
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        switch (item.type) {
          case 'user':
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-accent-primary/15 border border-accent-primary/25 px-3 py-2">
                  {item.images && item.images.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                      {item.images.map((src, j) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={j} src={src} alt={t('Photo')} className="h-24 w-24 object-cover rounded-lg border border-border" />
                      ))}
                    </div>
                  )}
                  {item.text && <p className="text-sm text-foreground whitespace-pre-wrap break-words">{item.text}</p>}
                </div>
              </div>
            );
          case 'assistant':
            return (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-accent-primary/15 text-accent-primary flex items-center justify-center text-xs font-bold" aria-hidden>B</span>
                <div className="min-w-0 flex-1 pt-0.5"><Markdown text={item.text} /></div>
              </div>
            );
          case 'support':
            return (
              <div key={i} className="rounded-xl border border-info/40 bg-info/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-info">{t('Bitwave support')} · {item.author}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">{item.text}</p>
              </div>
            );
          case 'step':
            return (
              <div key={i} className="flex items-center gap-2 pl-9 text-xs text-foreground-muted">
                {item.done ? (
                  <span className={item.ok === false ? 'text-danger' : 'text-success'}>{item.ok === false ? '✕' : '✓'}</span>
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            );
          case 'data':
            return item.show === 'none' ? null : (
              <div key={i} className="pl-9"><ResultBlock title={item.title} payload={item.payload} show={item.show} /></div>
            );
          case 'action': {
            const card = cards.get(item.action_id);
            if (!card) return null;
            return (
              <div key={i} className="pl-9">
                <ActionCard action={card} busy={busy} readOnly={readOnly || !onDecide}
                  onDecide={(approve) => onDecide?.(item.action_id, approve)} />
              </div>
            );
          }
          case 'action_result':
            return null; // shown on its card
          case 'notice':
            return (
              <p key={i} className={`pl-9 text-xs ${item.level === 'error' ? 'text-danger' : 'text-foreground-muted'}`}>{item.message}</p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
