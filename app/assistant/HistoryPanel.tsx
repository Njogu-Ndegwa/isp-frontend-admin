'use client';

import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../lib/assistant';
import { useT } from '../lib/i18n';
import { CloseIcon, PlusIcon, TrashIcon } from './icons';

const whenFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
const when = (iso: string) => {
  const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : whenFmt.format(d);
};

/**
 * Saved conversations: a side panel on a wide screen, a full-height sheet on a
 * phone. Deleting asks once more on the row itself rather than in a dialog.
 */
export default function HistoryPanel({ open, conversations, activeId, retentionDays, onClose, onOpen, onNew, onDelete }: {
  open: boolean;
  conversations: ConversationSummary[];
  activeId: string | null;
  retentionDays?: number;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useT();
  const [armed, setArmed] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={t('Your chats')}
        className="ai-root flex h-full w-full max-w-[420px] flex-col border-l border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          <h2 className="ai-display flex-1 text-[15px] font-bold text-ink-1">{t('Your chats')}</h2>
          <button type="button" className="ai-btn ai-btn-ghost px-3" onClick={() => { onNew(); onClose(); }}>
            <PlusIcon width={14} height={14} /> {t('New chat')}
          </button>
          <button type="button" className="ai-btn ai-btn-quiet" onClick={onClose} aria-label={t('Close')}><CloseIcon /></button>
        </header>
        <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {conversations.length === 0 ? <li className="px-3 py-6 text-[14px] text-ink-3">{t('No chats yet.')}</li> : null}
          {conversations.map((c) => (
            <li key={c.id} className={`flex items-center gap-1 rounded-[10px] ${c.id === activeId ? 'bg-surface-2' : 'hover:bg-surface-2/60 active:bg-surface-2/60'}`}>
              <button type="button" className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => { onOpen(c.id); onClose(); }}>
                <span className="block truncate text-[14px] text-ink-1">{c.title}</span>
                <span className="block text-[12px] text-ink-3">{when(c.updated_at)}</span>
              </button>
              <button type="button"
                className={`ai-btn ai-btn-quiet mr-1 shrink-0 ${armed === c.id ? '!bg-bad !text-white' : ''}`}
                aria-label={armed === c.id ? t('Delete?') : t('Delete')}
                onBlur={() => setArmed((cur) => (cur === c.id ? null : cur))}
                onClick={async () => {
                  if (armed !== c.id) { setArmed(c.id); return; }
                  setArmed(null);
                  await onDelete(c.id);
                }}>
                {armed === c.id ? <span className="text-[12.5px] font-semibold">{t('Delete?')}</span> : <TrashIcon width={15} height={15} />}
              </button>
            </li>
          ))}
        </ul>
        {retentionDays ? <p className="shrink-0 border-t border-line px-4 py-2.5 text-[12px] text-ink-3">{t('Chats are kept for {n} days.', { n: retentionDays })}</p> : null}
      </aside>
    </div>
  );
}
