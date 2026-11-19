'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '../../components/Header';
import { assistantApi, type ConversationDetail, type ConversationSummary } from '../../lib/assistant';
import { useT } from '../../lib/i18n';
import Transcript from '../../assistant/Transcript';

const when = (iso: string) => new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString();

/**
 * Bitwave support view: every account's assistant chats, newest first. Open one
 * to see where someone is stuck (photos included) and write a note into it; the
 * account gets an inbox message and the assistant reads the note next turn.
 */
export default function AssistantSupportClient() {
  const t = useT();
  const [list, setList] = useState<ConversationSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<ConversationDetail | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const id = Number(filter);
      setList((await assistantApi.adminConversations(Number.isFinite(id) && id > 0 ? id : undefined)).conversations);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openChat = async (id: string) => {
    try {
      setOpen(await assistantApi.adminConversation(id));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const sendNote = async () => {
    if (!open || !note.trim()) return;
    setSending(true);
    try {
      await assistantApi.adminNote(open.id, note.trim());
      setNote('');
      setOpen(await assistantApi.adminConversation(open.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Header title={t('Assistant chats')} subtitle={t('See where resellers are stuck, and guide them inside their chat.')} />
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">
        <div className={`${open ? 'hidden lg:block' : ''}`}>
          <div className="flex gap-2 mb-2">
            <input value={filter} onChange={(e) => setFilter(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
              placeholder={t('Reseller ID (optional)')}
              className="flex-1 rounded-lg border border-border bg-background-secondary px-3 py-2 text-base sm:text-sm text-foreground min-h-[44px]" />
            <button type="button" className="btn-secondary min-h-[44px]" onClick={load}>{t('Refresh')}</button>
          </div>
          <ul className="rounded-xl border border-border bg-background-secondary divide-y divide-border max-h-[70dvh] overflow-y-auto">
            {loading && <li className="px-3 py-4 text-sm text-foreground-muted">{t('Loading…')}</li>}
            {!loading && list.length === 0 && <li className="px-3 py-4 text-sm text-foreground-muted">{t('No chats yet.')}</li>}
            {list.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => openChat(c.id)}
                  className={`w-full text-left px-3 py-2.5 min-h-[56px] hover:bg-background-tertiary ${open?.id === c.id ? 'bg-background-tertiary' : ''}`}>
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-[11px] text-foreground-muted truncate">
                    {c.organization_name || c.email || `#${c.user_id}`}
                    {c.staff_name ? ` · ${c.staff_name}` : ''}{c.view_as ? ` · ${t('View-as')}` : ''} · {when(c.updated_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${open ? '' : 'hidden lg:block'}`}>
          {!open ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-foreground-muted">{t('Pick a chat to read it.')}</div>
          ) : (
            <div className="rounded-xl border border-border bg-background-secondary">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{open.title}</p>
                  <p className="text-xs text-foreground-muted truncate">{open.organization_name || open.email}</p>
                </div>
                <button type="button" className="btn-ghost lg:hidden min-h-[40px]" onClick={() => setOpen(null)}>{t('Back')}</button>
              </div>
              <div className="p-4 max-h-[60dvh] overflow-y-auto">
                <Transcript items={open.transcript} records={open.actions} readOnly />
              </div>
              <div className="border-t border-border p-3">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000}
                  placeholder={t('Write a note into this chat. The reseller sees it and the assistant follows it.')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground" />
                <div className="mt-2 flex justify-end">
                  <button type="button" className="btn-primary min-h-[44px] disabled:opacity-50" disabled={sending || !note.trim()} onClick={sendNote}>
                    {sending ? t('Sending…') : t('Send note')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
