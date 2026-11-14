'use client';

/**
 * Lightweight UI translation.
 *
 * Keys are the English text itself, so untranslated strings simply render in
 * English and wrapping a string never breaks a screen. Placeholders use
 * `{name}`: t('Due in {days} days', { days: 3 }).
 *
 * Language = the reseller's chosen language, else their market's default
 * (Cameroon: French), else English. Only languages with a dictionary below
 * are translated; others (e.g. Swahili for now) fall back to English.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from './types';

/**
 * Dictionaries load on demand. French alone is ~27 KB compressed, and every
 * reseller downloaded it on every page although almost none use it. A
 * language's dictionary is fetched the first time a screen needs it; until it
 * arrives, text shows in English (the keys), then re-renders translated.
 */
const LOADERS: Record<string, () => Promise<Record<string, string>>> = {
  fr: () => import('./locales/fr').then((m) => m.FR),
};

export const DICTIONARIES: Record<string, Record<string, string>> = {};

const pending: Record<string, Promise<void> | undefined> = {};
const listeners = new Set<() => void>();

/** Load a language's dictionary (no-op for English or one already loaded). */
export function loadLanguage(lang: string): Promise<void> {
  const key = lang.toLowerCase();
  if (DICTIONARIES[key] || !LOADERS[key]) return Promise.resolve();
  pending[key] ??= LOADERS[key]()
    .then((dict) => {
      DICTIONARIES[key] = dict;
      listeners.forEach((notify) => notify());
    })
    .catch(() => {
      // Offline or a failed chunk: stay in English and allow a later retry.
      pending[key] = undefined;
    });
  return pending[key] as Promise<void>;
}

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  sw: 'Kiswahili',
};

export function resolveLanguage(user: AuthUser | null | undefined): string {
  const lang = user?.preferred_language || user?.market?.language || 'en';
  return lang.toLowerCase();
}

export function translate(
  lang: string,
  text: string,
  vars?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[lang]?.[text] ?? text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

export function useT(): TFunction {
  const { user } = useAuth();
  const lang = resolveLanguage(user);
  const loaded = Boolean(DICTIONARIES[lang]);
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (loaded || !LOADERS[lang]) return;
    const notify = () => setVersion((v) => v + 1);
    listeners.add(notify);
    void loadLanguage(lang);
    return () => {
      listeners.delete(notify);
    };
  }, [lang, loaded]);
  // `loaded` in the deps hands consumers a new t() once the dictionary lands,
  // so memoised children re-render in the new language.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `loaded` is the re-render trigger
  return useCallback((text, vars) => translate(lang, text, vars), [lang, loaded]);
}

export function useLanguage(): string {
  const { user } = useAuth();
  return resolveLanguage(user);
}
