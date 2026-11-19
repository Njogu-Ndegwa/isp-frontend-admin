'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  assistantApi, AssistantError, preparePhoto,
  type ActionRecord, type AssistantEvent, type AssistantStatus, type ConversationSummary,
  type OutgoingImage, type TranscriptItem,
} from '../lib/assistant';
import { isStaffUser } from '../lib/permissions';
import { useT } from '../lib/i18n';
import Transcript, { actionCards } from './Transcript';

const MAX_PHOTOS = 4;
const POLL_MS = 20_000;

function useSuggestions(role: 'admin' | 'owner' | 'staff', t: ReturnType<typeof useT>) {
  return useMemo(() => {
    if (role === 'admin') {
      return [
        t('Which resellers signed up this week?'),
        t('Show platform revenue for this month'),
        t('Which routers are offline right now?'),
        t('Show unpaid subscription invoices'),
      ];
    }
    return [
      t('Help me set up my account'),
      t('Who expires today?'),
      t('How much did I make this week?'),
      t('Generate 10 one-day vouchers'),
      t('Which customers are online now?'),
      t('A customer paid but has no internet'),
    ];
  }, [role, t]);
}

export default function AssistantClient() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();

  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [records, setRecords] = useState<Record<string, ActionRecord>>({});
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState<OutgoingImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  const liveText = useRef<number | null>(null);
  const serverLen = useRef(0);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const role: 'admin' | 'owner' | 'staff' = user?.role === 'admin' ? 'admin' : isStaffUser(user) ? 'staff' : 'owner';
  const suggestions = useSuggestions(role, t);
  const demo = typeof window !== 'undefined' && api.isDemoMode();

  // -- loading ----------------------------------------------------------------

  const loadConversation = useCallback(async (id: string) => {
    const conv = await assistantApi.conversation(id);
    setConversationId(conv.id);
    setItems(conv.transcript);
    setRecords(conv.actions);
    serverLen.current = conv.transcript.length;
    liveText.current = null;
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory((await assistantApi.conversations()).conversations);
    } catch {
      /* the list is a convenience */
    }
  }, []);

  useEffect(() => {
    if (demo) return;
    assistantApi.status()
      .then((s) => {
        setStatus(s);
        if (!s.enabled && params.get('start') === 'setup') router.replace('/setup');
      })
      .catch((e: Error) => setStatusError(e.message));
    refreshHistory();
    const c = params.get('c');
    if (c) loadConversation(c).catch(() => setError(t('That chat could not be opened.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items.length, busy]);

  // Pick up Bitwave support notes written while the chat is open.
  useEffect(() => {
    if (!conversationId || busy) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const conv = await assistantApi.conversation(conversationId);
        if (conv.transcript.length !== serverLen.current) {
          setItems(conv.transcript);
          setRecords(conv.actions);
          serverLen.current = conv.transcript.length;
        }
      } catch {
        /* next tick */
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [conversationId, busy]);

  // -- streaming events ---------------------------------------------------------

  const apply = useCallback((e: AssistantEvent) => {
    switch (e.type) {
      case 'conversation':
        setConversationId((prev) => {
          if (prev !== e.id) {
            const qs = new URLSearchParams(window.location.search);
            qs.set('c', e.id);
            qs.delete('start');
            window.history.replaceState(null, '', `${pathname}?${qs.toString()}`);
          }
          return e.id;
        });
        return;
      case 'text':
        setItems((prev) => {
          const idx = liveText.current;
          if (idx !== null && prev[idx]?.type === 'assistant') {
            const next = prev.slice();
            const cur = next[idx] as Extract<TranscriptItem, { type: 'assistant' }>;
            next[idx] = { ...cur, text: cur.text + e.delta };
            return next;
          }
          liveText.current = prev.length;
          return [...prev, { type: 'assistant', text: e.delta }];
        });
        return;
      case 'step':
        liveText.current = null;
        setItems((prev) => {
          if (e.phase === 'start') return [...prev, { type: 'step', call_id: e.call_id, label: e.label }];
          return prev.map((it) => (it.type === 'step' && it.call_id === e.call_id ? { ...it, done: true, ok: e.ok } : it));
        });
        return;
      case 'action_result':
        liveText.current = null;
        setItems((prev) => [...prev, e]);
        setRecords((prev) => ({ ...prev, [e.action_id]: { ...(prev[e.action_id] ?? { id: e.action_id, title: '' }), status: e.status } }));
        return;
      case 'data':
      case 'action':
      case 'notice':
        liveText.current = null;
        setItems((prev) => [...prev, e]);
        return;
      case 'done':
        liveText.current = null;
        return;
    }
  }, [pathname]);

  const finishTurn = useCallback(async (id: string | null) => {
    setBusy(false);
    liveText.current = null;
    if (id) {
      try { await loadConversation(id); } catch { /* keep what is on screen */ }
    }
    refreshHistory();
  }, [loadConversation, refreshHistory]);

  const run = useCallback(async (work: (onEvent: (e: AssistantEvent) => void) => Promise<void>) => {
    setBusy(true);
    setError(null);
    let id = conversationId;
    try {
      await work((e) => {
        if (e.type === 'conversation') id = e.id;
        apply(e);
      });
    } catch (err) {
      const message = err instanceof AssistantError && err.code === 'assistant_not_configured'
        ? t('The assistant is not switched on for this server yet.')
        : (err as Error).message || t('Could not reach the assistant. Check your connection and try again.');
      setItems((prev) => [...prev, { type: 'notice', level: 'error', message }]);
    } finally {
      await finishTurn(id);
    }
  }, [apply, conversationId, finishTurn, t]);

  // -- actions --------------------------------------------------------------------

  const send = useCallback(async (text: string, images: OutgoingImage[] = []) => {
    const message = text.trim();
    if ((!message && images.length === 0) || busy) return;
    setDraft('');
    setPhotos([]);
    setItems((prev) => [...prev, { type: 'user', text: message, images: images.map((i) => i.thumbnail) }]);
    liveText.current = null;
    await run((onEvent) => assistantApi.chat({ message, conversation_id: conversationId, images }, onEvent));
  }, [busy, conversationId, run]);

  const decide = useCallback(async (decisions: { action_id: string; approve: boolean }[]) => {
    if (!conversationId || busy || decisions.length === 0) return;
    setRecords((prev) => {
      const next = { ...prev };
      for (const d of decisions) next[d.action_id] = { ...(next[d.action_id] ?? { id: d.action_id, title: '' }), status: d.approve ? 'running' : 'declined' };
      return next;
    });
    await run((onEvent) => assistantApi.decide(conversationId, decisions, onEvent));
  }, [busy, conversationId, run]);

  const pending = useMemo(() => {
    const cards = actionCards(items, records);
    return [...cards.values()].filter((c) => c.status === 'pending' && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()));
  }, [items, records]);

  // Onboarding entry: /assistant?start=setup opens a chat that starts the setup.
  useEffect(() => {
    if (started.current || !status?.enabled || params.get('c')) return;
    if (params.get('start') === 'setup') {
      started.current = true;
      send(t('Help me set up my account'));
    }
  }, [status, params, send, t]);

  const newChat = () => {
    if (busy) return;
    setConversationId(null);
    setItems([]);
    setRecords({});
    serverLen.current = 0;
    window.history.replaceState(null, '', pathname);
    inputRef.current?.focus();
  };

  const attach = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPreparing(true);
    setError(null);
    try {
      const room = MAX_PHOTOS - photos.length;
      const picked = Array.from(files).slice(0, Math.max(0, room));
      const ready = await Promise.all(picked.map(preparePhoto));
      setPhotos((prev) => [...prev, ...ready].slice(0, MAX_PHOTOS));
      if (files.length > room) setError(t('Up to {n} photos per message.', { n: MAX_PHOTOS }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !coarse) {
      e.preventDefault();
      send(draft, photos);
    }
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  // -- render -------------------------------------------------------------------

  if (demo) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">{t('Assistant')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{t('The assistant works on real accounts. Sign up to try it.')}</p>
      </div>
    );
  }

  const disabledReason = statusError || (status && !status.enabled ? (status.reason || t('The assistant is not switched on for this server yet.')) : null);
  const empty = items.length === 0;

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{t('Assistant')}</h1>
          <p className="text-xs text-foreground-muted truncate">
            {status?.read_only
              ? t('View-as: it can look things up but not change anything.')
              : t('Ask anything, or tell it what to do. Changes wait for your Confirm.')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button type="button" onClick={() => { setHistoryOpen(true); refreshHistory(); }}
            className="btn-secondary !px-3 min-h-[40px] text-sm">{t('Chats')}</button>
          <button type="button" onClick={newChat} disabled={busy}
            className="btn-secondary !px-3 min-h-[40px] text-sm disabled:opacity-50">{t('New')}</button>
        </div>
      </div>

      {disabledReason && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 mb-3 text-sm text-foreground">
          {disabledReason}
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 pb-4">
        {empty ? (
          <div className="pt-6 sm:pt-12">
            <p className="text-2xl font-bold text-foreground">{t('What do you need?')}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {t('Everything you can do on the dashboard, you can do here: setup, customers, plans, vouchers, routers, payments and messages. Send a photo of an error and it will help you fix it.')}
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s, i) => (
                <button key={s} type="button" disabled={busy || !!disabledReason} onClick={() => send(s)}
                  className={`text-left rounded-xl border px-3 py-2.5 text-sm min-h-[48px] transition-colors disabled:opacity-50 ${i === 0 && role !== 'admin' ? 'border-accent-primary/50 bg-accent-primary/10 text-foreground font-medium' : 'border-border bg-background-secondary text-foreground hover:border-accent-primary/40'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Transcript items={items} records={records} busy={busy} readOnly={status?.read_only}
            onDecide={(id, approve) => decide([{ action_id: id, approve }])} />
        )}
        {busy && liveText.current === null && (
          <div className="flex items-center gap-2 pl-9 mt-3 text-xs text-foreground-muted">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-bounce [animation-delay:240ms]" />
            </span>
            {t('Working…')}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-0 z-10 bg-background pt-2 pb-1 md:pb-4 shadow-[0_-12px_16px_-8px_var(--background)]">
        {pending.length > 1 && !status?.read_only && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-accent-primary/40 bg-background-secondary px-3 py-2 shadow-sm">
            <span className="text-xs text-foreground">{t('{n} changes are waiting for you.', { n: pending.length })}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={busy} onClick={() => decide(pending.map((p) => ({ action_id: p.action_id, approve: true })))}
                className="btn-primary !px-3 !py-1.5 text-xs min-h-[36px] disabled:opacity-50">{t('Confirm all')}</button>
              <button type="button" disabled={busy} onClick={() => decide(pending.map((p) => ({ action_id: p.action_id, approve: false })))}
                className="btn-secondary !px-3 !py-1.5 text-xs min-h-[36px] disabled:opacity-50">{t('Cancel all')}</button>
            </div>
          </div>
        )}
        {error && <p className="mb-1.5 text-xs text-danger">{error}</p>}
        <form
          onSubmit={(e) => { e.preventDefault(); send(draft, photos); }}
          className="rounded-2xl border border-border bg-background-secondary shadow-lg focus-within:border-accent-primary/50"
        >
          {photos.length > 0 && (
            <div className="flex gap-2 px-3 pt-3 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbnail} alt={t('Photo')} className="h-16 w-16 object-cover rounded-lg border border-border" />
                  <button type="button" aria-label={t('Remove photo')} onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-xs leading-6 text-center">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5 p-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => attach(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || preparing || photos.length >= MAX_PHOTOS || !!disabledReason}
              aria-label={t('Add a photo')} title={t('Add a photo')}
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-tertiary disabled:opacity-40">
              {preparing ? (
                <span className="w-4 h-4 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )}
            </button>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={6000}
              disabled={!!disabledReason}
              placeholder={t('Ask or tell the assistant…')}
              className="flex-1 resize-none bg-transparent text-foreground placeholder:text-foreground-muted text-base sm:text-sm py-2.5 px-1 outline-none max-h-[200px]"
            />
            <button type="submit" disabled={busy || (!draft.trim() && photos.length === 0) || !!disabledReason}
              aria-label={t('Send')}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-accent-primary text-[#1c1917] flex items-center justify-center disabled:opacity-40">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </form>
        <p className="mt-1.5 text-[11px] text-foreground-muted text-center">
          {t('It can make mistakes. Check each change before you tap Confirm.')}
        </p>
      </div>

      {/* Chat history */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setHistoryOpen(false)}>
          <div className="w-full sm:max-w-md max-h-[80dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-background-secondary border border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold text-foreground">{t('Your chats')}</p>
              <button type="button" className="btn-ghost min-h-[40px]" onClick={() => setHistoryOpen(false)}>{t('Close')}</button>
            </div>
            <ul className="overflow-y-auto divide-y divide-border pb-[env(safe-area-inset-bottom)]">
              {history.length === 0 && <li className="px-4 py-6 text-sm text-foreground-muted">{t('No chats yet.')}</li>}
              {history.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-2">
                  <button type="button" className="flex-1 text-left px-2 py-3 min-w-0"
                    onClick={async () => {
                      setHistoryOpen(false);
                      try {
                        await loadConversation(c.id);
                        window.history.replaceState(null, '', `${pathname}?c=${c.id}`);
                      } catch {
                        setError(t('That chat could not be opened.'));
                      }
                    }}>
                    <p className="text-sm text-foreground truncate">{c.title}</p>
                    <p className="text-[11px] text-foreground-muted">{new Date(`${c.updated_at}`.endsWith('Z') ? c.updated_at : `${c.updated_at}Z`).toLocaleString()}</p>
                  </button>
                  <button type="button"
                    className={`text-xs px-2 py-2 rounded-lg min-h-[40px] ${armedDelete === c.id ? 'text-white bg-danger' : 'text-foreground-muted hover:text-danger'}`}
                    onClick={async () => {
                      if (armedDelete !== c.id) { setArmedDelete(c.id); return; }
                      setArmedDelete(null);
                      try {
                        await assistantApi.remove(c.id);
                        setHistory((prev) => prev.filter((h) => h.id !== c.id));
                        if (conversationId === c.id) newChat();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}>
                    {armedDelete === c.id ? t('Delete?') : t('Delete')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
