/**
 * Bitwave AI as a product of its own.
 *
 * The assistant replaces the dashboard. On its own address (ai.bitwavetechnologies.com)
 * it is the whole app: the address opens the chat, signing in comes back to the chat,
 * the marketing site and the classic dashboard are never shown, and nothing on the
 * screen sends people to them. The same build still serves the dashboard on the main
 * address, so both run from one deployment while resellers move over.
 *
 * NEXT_PUBLIC_ASSISTANT_HOSTS adds addresses (comma separated) to the defaults, for a
 * staging host or a custom domain.
 */

export const ASSISTANT_PATH = '/assistant';

const DEFAULT_HOSTS = ['ai.bitwavetechnologies.com', 'ai.bitwavetechnologies.net', 'ai.localhost'];

export const ASSISTANT_HOSTS: ReadonlySet<string> = new Set([
  ...DEFAULT_HOSTS,
  ...(process.env.NEXT_PUBLIC_ASSISTANT_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
]);

/** Whether a Host header (or hostname) is one of the assistant's own addresses. */
export function isAssistantHost(host: string | null | undefined): boolean {
  const name = (host ?? '').toLowerCase().split(':')[0];
  return ASSISTANT_HOSTS.has(name);
}

/** In the browser: is this page being served on the assistant's own address? */
export function isStandalone(): boolean {
  return typeof window !== 'undefined' && isAssistantHost(window.location.hostname);
}

/**
 * Where to go after signing in when the person came for the assistant: the address
 * is the assistant's own, or the sign-in link carries ?next=/assistant. Only the
 * assistant's own path is honoured, so the parameter cannot send anyone elsewhere.
 */
export function wantsAssistant(search: string): boolean {
  if (isStandalone()) return true;
  const next = new URLSearchParams(search).get('next');
  return next === ASSISTANT_PATH || (next ?? '').startsWith(`${ASSISTANT_PATH}?`);
}
