'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  assistantApi, AssistantError, markStartPageDecided, rememberHome,
  type ActionRecord, type AssistantEvent, type AssistantStatus, type ConversationSummary, type Decision,
  type OutgoingImage, type TranscriptItem,
} from '../lib/assistant';
import { isStaffUser } from '../lib/permissions';
import { isStandalone } from '../lib/standalone';
import { useT } from '../lib/i18n';
import Composer from './Composer';
import HistoryPanel from './HistoryPanel';
import Home from './Home';
import { BitwaveMark, CloseIcon, GridIcon, HistoryIcon, LogoutIcon, MoonIcon, MoreIcon, PlusIcon, StarIcon, SunIcon } from './icons';
import Transcript, { actionCards } from './Transcript';
import RatingAsk from './RatingAsk';
import { Led } from './ui';

const POLL_MS = 20_000;
const INTRO_SEEN = 'bw_ai_intro_seen';

type Theme = 'light' | 'dark';
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

/* ---------------- header ---------------- */

function Header({ status, live, canReset, busy, classicHref, standalone, onHome, onHistory, onStatus, onRate }: {
  status: AssistantStatus | null;
  /** null while checking */
  live: boolean | null;
  canReset: boolean;
  busy: boolean;
  classicHref: string;
  /** on Bitwave AI's own address: the assistant is the whole app, so nothing links to the dashboard */
  standalone: boolean;
  onHome: () => void;
  onHistory: () => void;
  onStatus: (s: AssistantStatus) => void;
  /** opens the rating panel */
  onRate: () => void;
}) {
  const t = useT();
  const { logout } = useAuth();
  const [menu, setMenu] = useState(false);
  // this screen is drawn in the browser only, so the saved theme can be read at once
  const [theme, setTheme] = useState<Theme>(() => (typeof window !== 'undefined' && localStorage.getItem('theme') === 'light' ? 'light' : 'dark'));
  const menuRef = useRef<HTMLDivElement | null>(null);

  // there is no sidebar here to apply the saved theme, so this screen does it
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);

  const flipTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    setTheme(next);
  };
  const setHome = async (choice: 'assistant' | 'classic') => {
    if (!status) return;
    try {
      const r = await assistantApi.setHome(choice);
      onStatus({ ...status, home: r.home, home_choice: r.home_choice });
    } catch {
      /* the choice is a convenience: the menu simply stays as it was */
    }
  };
  const item = 'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left text-[14px] text-ink-1 hover:bg-surface-2 active:bg-surface-2';

  return (
    <header className="z-30 shrink-0 border-b border-line bg-[color:var(--ai-bg)]/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <button type="button" onClick={onHome} disabled={busy} className="ai-tap flex shrink-0 items-center gap-2 rounded-[10px] py-1 pr-1" aria-label={t('Bitwave home')}>
          <BitwaveMark size={30} />
          <span className="ai-display text-[16.5px] font-semibold text-ink-1">Bitwave</span>
          <span className="ai-mono rounded-[6px] border border-accent/35 bg-accent-soft px-1.5 py-[1px] text-[11px] font-medium tracking-[0.12em] text-accent">AI</span>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <span className="ai-mono inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-1/60 px-2 py-1 text-[11px] text-ink-2 max-[359px]:hidden sm:px-2.5"
            title={live ? t('Answers use your live account data') : undefined}>
            <Led tone={live === null ? 'muted' : live ? 'live' : 'warn'} pulse={!!live} size={6} />
            <span className="hidden md:inline">{live === null ? t('Checking') : !live ? t('Assistant is off') : status?.read_only ? t('Live data · view only') : t('Live data')}</span>
            <span className="md:hidden">{live === false ? t('Off') : status?.read_only ? t('View only') : t('Live')}</span>
          </span>
          <button type="button" className="ai-btn ai-btn-quiet" onClick={onHistory} aria-label={t('Your chats')} title={t('Your chats')}>
            <HistoryIcon /> <span className="hidden sm:inline">{t('Chats')}</span>
          </button>
          {canReset ? (
            <button type="button" className="ai-btn ai-btn-ghost px-3" onClick={onHome} disabled={busy} aria-label={t('New chat')}>
              <PlusIcon width={14} height={14} /> <span className="hidden sm:inline">{t('New chat')}</span>
            </button>
          ) : null}
          {standalone ? null : (
            <Link href={classicHref} className="ai-btn ai-btn-quiet hidden lg:inline-flex" title={t('The dashboard you know, with every page')}>
              <GridIcon /> {t('Classic dashboard')}
            </Link>
          )}
          <div className="relative" ref={menuRef}>
            <button type="button" className="ai-btn ai-btn-quiet" onClick={() => setMenu((v) => !v)} aria-label={t('More')} aria-expanded={menu} aria-haspopup="menu">
              <MoreIcon width={18} height={18} />
            </button>
            {menu ? (
              <div role="menu" className="ai-card ai-rise absolute right-0 top-[calc(100%+8px)] z-40 w-[min(19rem,calc(100vw-1.5rem))] p-1.5">
                {standalone ? null : <Link href={classicHref} role="menuitem" className={item}><GridIcon /> {t('Classic dashboard')}</Link>}
                <button type="button" role="menuitem" className={item} onClick={flipTheme}>
                  {theme === 'dark' ? <SunIcon /> : <MoonIcon />} {theme === 'dark' ? t('Light mode') : t('Dark mode')}
                </button>
                {status && live && !status.read_only && !standalone ? (
                  <div className="my-1 border-y border-line px-3 py-2.5">
                    <p className="text-[12px] text-ink-3">{t('When I sign in, open')}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-full border border-line p-0.5" role="group">
                      <button type="button" aria-pressed={!!status.home} onClick={() => setHome('assistant')}
                        className={`rounded-full px-2 py-2 text-[13px] font-semibold ${status.home ? 'bg-accent-fill text-accent-ink' : 'text-ink-2 hover:bg-surface-2 active:bg-surface-2'}`}>{t('This chat')}</button>
                      <button type="button" aria-pressed={!status.home} onClick={() => setHome('classic')}
                        className={`rounded-full px-2 py-2 text-[13px] font-semibold ${!status.home ? 'bg-surface-3 text-ink-1' : 'text-ink-2 hover:bg-surface-2 active:bg-surface-2'}`}>{t('Classic')}</button>
                    </div>
                  </div>
                ) : null}
                {status && live && !status.read_only ? (
                  <button type="button" role="menuitem" className={item} onClick={() => { setMenu(false); onRate(); }}>
                    <StarIcon /> {t('Rate the assistant')}
                  </button>
                ) : null}
                <button type="button" role="menuitem" className={item} onClick={() => { logout(); window.location.assign('/login'); }}>
                  <LogoutIcon /> {t('Sign out')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------------- the app ---------------- */

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
  const [opening, setOpening] = useState(false);
  const [liveIndex, setLiveIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [intro, setIntro] = useState(false);
  const [viewH, setViewH] = useState(0);
  // the rating panel: 'ask' is the quiet line the server says this person is due, 'open' came from the menu
  const [rate, setRate] = useState<'ask' | 'open' | null>(null);
  const [askDone, setAskDone] = useState(false);

  const liveText = useRef<number | null>(null);
  const serverLen = useRef(0);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement | null>(null);
  const lastExchange = useRef<HTMLDivElement | null>(null);
  const readerScrolled = useRef(false);

  const admin = user?.role === 'admin';
  const staff = isStaffUser(user);
  const demo = typeof window !== 'undefined' && api.isDemoMode();
  const currency = user?.market?.currency ?? 'KES';
  const classicHref = admin ? '/admin' : '/dashboard';
  const [ownAddress] = useState(isStandalone);
  // no way back to the classic dashboard: on the assistant's own address, or when it is closed to this account
  const standalone = ownAddress || (!admin && !!status?.classic_closed);
  const userKey = `${user?.id ?? 0}:${staff ? user?.staff?.id ?? 0 : 0}`;
  const setLive = (i: number | null) => { liveText.current = i; setLiveIndex(i); };

  // -- loading ----------------------------------------------------------------

  const loadConversation = useCallback(async (id: string) => {
    const conv = await assistantApi.conversation(id);
    setConversationId(conv.id);
    setItems(conv.transcript);
    setRecords(conv.actions);
    serverLen.current = conv.transcript.length;
    liveText.current = null;
    setLiveIndex(null);
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory((await assistantApi.conversations()).conversations);
    } catch {
      /* the list is a convenience */
    }
  }, []);

  const notice = useCallback((message: string) => {
    setItems((prev) => [...prev, { type: 'notice', level: 'error', message }]);
  }, []);

  useEffect(() => {
    if (demo) return;
    markStartPageDecided();
    assistantApi.status()
      .then((s) => {
        setStatus(s);
        rememberHome(userKey, !!(s.enabled && s.home));
        if (!s.enabled && params.get('start') === 'setup') router.replace('/setup');
      })
      .catch((e: Error) => setStatusError(e.message));
    refreshHistory();
    const c = params.get('c');
    if (c) {
      setOpening(true);
      loadConversation(c).catch(() => notice(t('That chat could not be opened.'))).finally(() => setOpening(false));
    }
    try { setIntro(localStorage.getItem(INTRO_SEEN) !== '1'); } catch { /* no storage: no intro */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // The open chat is in the address bar (?c=...), so a reload or a shared link reopens it.
  useEffect(() => {
    if (!conversationId) return;
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('c') === conversationId) return;
    qs.set('c', conversationId);
    qs.delete('start');
    window.history.replaceState(null, '', `${pathname}?${qs.toString()}`);
  }, [conversationId, pathname]);

  // -- scrolling ----------------------------------------------------------------
  // The newest question is brought to the top of the view and stays there while its
  // answer arrives underneath, so nothing the reader is looking at moves. For that the
  // last exchange is at least one screen tall.

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // whether the reader has scrolled since the last question; if so, the view is theirs
    const mine = () => { readerScrolled.current = true; };
    el.addEventListener('wheel', mine, { passive: true });
    el.addEventListener('touchmove', mine, { passive: true });
    el.addEventListener('keydown', mine);
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', mine);
      el.removeEventListener('touchmove', mine);
      el.removeEventListener('keydown', mine);
    };
  }, []);

  const questions = useMemo(() => items.reduce((count, it) => count + (it.type === 'user' ? 1 : 0), 0), [items]);

  const pin = useCallback(() => {
    const el = scroller.current;
    const node = lastExchange.current;
    if (!el || !node || readerScrolled.current) return;
    const off = node.getBoundingClientRect().top - el.getBoundingClientRect().top;
    if (Math.abs(off) > 4) el.scrollTo({ top: el.scrollTop + off, behavior: 'auto' });
  }, []);

  useLayoutEffect(() => {
    if (questions === 0) return;
    readerScrolled.current = false;
    lastExchange.current?.scrollIntoView({ block: 'start', behavior: questions === 1 ? 'auto' : 'smooth' });
    // a smooth scroll can be cut short by layout work elsewhere; check once it should have landed
    const timer = setTimeout(pin, 900);
    return () => clearTimeout(timer);
  }, [questions, conversationId, pin]);

  // ...and again whenever the answer grows a block or finishes
  const shape = `${items.length}:${busy}`;
  useEffect(() => {
    const raf = requestAnimationFrame(pin);
    return () => cancelAnimationFrame(raf);
  }, [shape, pin]);

  // -- streaming events ---------------------------------------------------------

  const apply = useCallback((e: AssistantEvent) => {
    switch (e.type) {
      case 'conversation':
        setConversationId(e.id); // the address bar follows in an effect below
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
          setLiveIndex(prev.length);
          return [...prev, { type: 'assistant', text: e.delta }];
        });
        return;
      case 'retract':
        // words the assistant wrote while still looking things up: not the answer
        setItems((prev) => {
          const idx = liveText.current;
          if (idx === null || prev[idx]?.type !== 'assistant') return prev;
          const cur = prev[idx] as Extract<TranscriptItem, { type: 'assistant' }>;
          const text = cur.text.slice(0, Math.max(0, cur.text.length - e.chars));
          if (text.trim()) {
            const next = prev.slice();
            next[idx] = { ...cur, text };
            return next;
          }
          liveText.current = null;
          setLiveIndex(null);
          return prev.filter((_, i) => i !== idx);
        });
        return;
      case 'step':
        setLive(null);
        setItems((prev) => {
          if (e.phase === 'start') return [...prev, { type: 'step', call_id: e.call_id, label: e.label }];
          return prev.map((it) => (it.type === 'step' && it.call_id === e.call_id ? { ...it, done: true, ok: e.ok } : it));
        });
        return;
      case 'action_result':
        setLive(null);
        setItems((prev) => [...prev, e]);
        setRecords((prev) => ({ ...prev, [e.action_id]: { ...(prev[e.action_id] ?? { id: e.action_id, title: '' }), status: e.status } }));
        return;
      case 'data':
      case 'action':
      case 'notice':
        setLive(null);
        setItems((prev) => [...prev, e]);
        return;
      case 'done':
        setLive(null);
        return;
    }
  }, []);

  const run = useCallback(async (work: (onEvent: (e: AssistantEvent) => void) => Promise<void>) => {
    setBusy(true);
    let id = conversationId;
    try {
      await work((e) => {
        if (e.type === 'conversation') id = e.id;
        apply(e);
      });
    } catch (err) {
      notice(err instanceof AssistantError && err.code === 'assistant_not_configured'
        ? t('The assistant is not switched on for this server yet.')
        : (err as Error).message || t('Could not reach the assistant. Check your connection and try again.'));
    } finally {
      setBusy(false);
      setLive(null);
      if (id) {
        try { await loadConversation(id); } catch { /* keep what is on screen */ }
      }
      refreshHistory();
    }
  }, [apply, conversationId, loadConversation, notice, refreshHistory, t]);

  // -- actions --------------------------------------------------------------------

  const send = useCallback(async (text: string, images: OutgoingImage[] = []) => {
    const message = text.trim();
    if ((!message && images.length === 0) || busy) return;
    setItems((prev) => [...prev, { type: 'user', text: message, images: images.map((i) => i.thumbnail) }]);
    setLive(null);
    await run((onEvent) => assistantApi.chat({ message, conversation_id: conversationId, images }, onEvent));
  }, [busy, conversationId, run]);

  const decide = useCallback(async (decisions: Decision[]) => {
    if (!conversationId || busy || decisions.length === 0) return;
    // a Confirm is not a new question: the view stays on the card, which shows the result where it is
    readerScrolled.current = true;
    setRecords((prev) => {
      const next = { ...prev };
      for (const d of decisions) next[d.action_id] = { ...(next[d.action_id] ?? { id: d.action_id, title: '' }), status: d.approve ? 'running' : 'declined' };
      return next;
    });
    await run((onEvent) => assistantApi.decide(conversationId, decisions, onEvent));
  }, [busy, conversationId, run]);

  const pending = useMemo(() => {
    const cards = actionCards(items, records);
    // a form waits for its own fields, so "Confirm all" covers the plain cards only
    return [...cards.values()].filter((c) => c.status === 'pending' && !c.form?.length && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()));
  }, [items, records]);

  // Onboarding entry: /assistant?start=setup opens a chat that starts the setup.
  useEffect(() => {
    if (started.current || !status?.enabled || params.get('c')) return;
    if (params.get('start') === 'setup') {
      started.current = true;
      send(t('Help me set up my account'));
    }
  }, [status, params, send, t]);

  const goHome = useCallback(() => {
    if (busy) return;
    setConversationId(null);
    setItems([]);
    setRecords({});
    serverLen.current = 0;
    window.history.replaceState(null, '', pathname);
    scroller.current?.scrollTo({ top: 0 });
  }, [busy, pathname]);

  const openConversation = useCallback(async (id: string) => {
    if (busy) return;
    setOpening(true);
    try {
      await loadConversation(id);
      window.history.replaceState(null, '', `${pathname}?c=${id}`);
    } catch {
      notice(t('That chat could not be opened.'));
    } finally {
      setOpening(false);
    }
  }, [busy, loadConversation, notice, pathname, t]);

  // -- render -------------------------------------------------------------------

  if (demo) {
    return (
      <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 text-center">
        <BitwaveMark size={40} />
        <h1 className="ai-display mt-4 text-[22px] font-bold text-ink-1">{t('Bitwave AI works on real accounts')}</h1>
        <p className="mt-2 text-[14.5px] text-ink-3">{t('The demo has sample data only. Sign up to ask about your own network and run it by chat.')}</p>
        <div className="mt-5 flex gap-2">
          <Link href="/signup" className="ai-btn ai-btn-primary min-h-[44px] px-5">{t('Sign up')}</Link>
          <Link href="/dashboard" className="ai-btn ai-btn-ghost min-h-[44px] px-5">{t('Back to the demo')}</Link>
        </div>
      </div>
    );
  }

  const off = statusError || (status && !status.enabled ? (status.reason || t('The assistant is not switched on for this server yet.')) : null);
  const live = statusError ? false : status ? status.enabled : null;
  const empty = items.length === 0 && !opening;
  const readOnly = !!status?.read_only;
  const dismissIntro = () => {
    setIntro(false);
    try { localStorage.setItem(INTRO_SEEN, '1'); } catch { /* fine */ }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-busy={busy ? 'true' : 'false'}>
      <Header status={status} live={live} canReset={!empty} busy={busy} classicHref={classicHref} standalone={standalone}
        onHome={goHome} onHistory={() => { setHistoryOpen(true); refreshHistory(); }}
        onStatus={(next) => { setStatus(next); rememberHome(userKey, !!(next.enabled && next.home)); }}  onRate={() => setRate('open')}/>
      <HistoryPanel open={historyOpen} conversations={history} activeId={conversationId} retentionDays={status?.retention_days}
        onClose={() => setHistoryOpen(false)} onOpen={(id) => void openConversation(id)} onNew={goHome}
        onDelete={async (id) => {
          try {
            await assistantApi.remove(id);
            setHistory((prev) => prev.filter((h) => h.id !== id));
            if (conversationId === id) goHome();
          } catch (e) {
            notice((e as Error).message);
          }
        }} />

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" tabIndex={-1}>
        {off ? (
          <div className="mx-auto mt-4 w-full max-w-[1180px] px-4 sm:px-6">
            <p role="status" className="flex items-center gap-2.5 rounded-[14px] border border-warn/40 bg-warn/10 px-3.5 py-3 text-[14px] text-ink-1"><Led tone="warn" />{off}</p>
          </div>
        ) : null}
        {/* the overview is always at the top: a conversation continues under it, so scrolling up brings it back */}
        {empty && intro && live && !standalone ? (
          <div className="mx-auto mt-4 w-full max-w-[1180px] px-4 sm:px-6">
            <div className="flex items-start gap-3 rounded-[14px] border border-accent/30 bg-accent-soft px-3.5 py-3 text-[13.5px] leading-snug text-ink-1">
              <p className="min-w-0 flex-1">
                <b>{t('This is the new Bitwave.')}</b>{' '}
                {t('Ask for anything in plain words, or tap a figure. Everything the dashboard does, you can do here.')}{' '}
                <Link href={classicHref} className="font-bold text-accent underline underline-offset-2" onClick={dismissIntro}>{t('The classic dashboard is one tap away.')}</Link>
              </p>
              <button type="button" className="ai-btn ai-btn-quiet -mr-1.5 -mt-1 shrink-0" onClick={dismissIntro} aria-label={t('Got it')}><CloseIcon /></button>
            </div>
          </div>
        ) : null}
        {empty && rate === 'open' ? (
          <div className="mx-auto w-full max-w-[880px] px-4 sm:px-6">
            <RatingAsk mode="open" onClose={() => { setRate(null); setAskDone(true); }} />
          </div>
        ) : null}
        <Home userKey={userKey} name={staff ? (user?.staff?.name ?? '').split(/\s+/)[0] || null : null}
          organization={user?.organization_name || user?.business_name || null}
          admin={!!admin && !readOnly} readOnly={readOnly} enabled={!!live} onAsk={(q) => void send(q)} />
        {!empty ? (
          <div className="mx-auto flex w-full max-w-[880px] flex-col px-4 sm:px-6">
            <div className="mb-1 mt-6 flex items-center gap-3 text-[11.5px] text-ink-3" aria-hidden>
              <span className="h-px flex-1 bg-line" />{t('Your conversation')}<span className="h-px flex-1 bg-line" />
            </div>
            {opening ? <p className="mt-6 text-[13.5px] text-ink-3">{t('Opening the chat…')}</p> : null}
            <Transcript items={items} records={records} busy={busy} readOnly={readOnly} liveIndex={liveIndex} currency={currency}
              onDecide={(id, approve, values) => decide([{ action_id: id, approve, ...(values ? { values } : {}) }])} onAsk={live && !busy ? (q) => void send(q) : undefined}
              lastRef={lastExchange} lastMinHeight={viewH} />
            {rate === 'open' || (rate === null && !askDone && status?.ask_rating && !busy && !readOnly && items.some((it) => it.type === 'assistant')) ? (
              <RatingAsk key={rate ?? 'ask'} mode={rate === 'open' ? 'open' : 'ask'} onClose={() => { setRate(null); setAskDone(true); }} />
            ) : null}
          </div>
        ) : null}
      </div>

      <Composer busy={busy} disabled={off} onSend={(text, photos) => void send(text, photos)}
        placeholder={readOnly ? t('Ask about this account…') : t('Ask, or tell me what to do…')}
        note={pending.length > 1 && !readOnly ? (
          <div className="ai-card mb-2 flex flex-wrap items-center justify-between gap-2 !rounded-[16px] !border-accent/40 px-3.5 py-2">
            <span className="text-[13px] text-ink-1">{t('{n} changes are waiting for you.', { n: pending.length })}</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={busy} onClick={() => decide(pending.map((p) => ({ action_id: p.action_id, approve: true })))} className="ai-btn ai-btn-primary">{t('Confirm all')}</button>
              <button type="button" disabled={busy} onClick={() => decide(pending.map((p) => ({ action_id: p.action_id, approve: false })))} className="ai-btn ai-btn-ghost">{t('Cancel all')}</button>
            </div>
          </div>
        ) : null} />
    </div>
  );
}
