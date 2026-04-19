'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'currentLeadConversation';
const EVENT_NAME = 'currentLeadChanged';

export interface CurrentLeadRef {
  id: number;
  name: string;
  startedAt: string;
}

function readStorage(): CurrentLeadRef | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentLeadRef;
    if (!parsed || typeof parsed.id !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(ref: CurrentLeadRef | null) {
  if (typeof window === 'undefined') return;
  try {
    if (ref) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

/**
 * Tracks which lead the user is currently having a conversation with.
 * Persists across tabs via localStorage and broadcasts changes via a
 * custom event + the standard `storage` event.
 */
export function useCurrentLead() {
  const [current, setCurrent] = useState<CurrentLeadRef | null>(null);

  useEffect(() => {
    setCurrent(readStorage());
    const sync = () => setCurrent(readStorage());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const startConversation = useCallback((id: number, name: string) => {
    writeStorage({ id, name, startedAt: new Date().toISOString() });
  }, []);

  const endConversation = useCallback(() => {
    writeStorage(null);
  }, []);

  return { current, startConversation, endConversation };
}
