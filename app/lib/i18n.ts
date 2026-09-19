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

import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from './types';
import { FR } from './locales/fr';

export const DICTIONARIES: Record<string, Record<string, string>> = {
  fr: FR,
};

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
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
}

export function useLanguage(): string {
  const { user } = useAuth();
  return resolveLanguage(user);
}
