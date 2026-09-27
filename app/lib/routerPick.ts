import type { Router } from './types';

type Translate = (text: string) => string;

/** Router names are free text; collapse runs of whitespace so "Hotspot  #3" reads as "Hotspot #3". */
export function displayRouterName(name: string | null | undefined): string {
  return (name ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Label for a router <option>. Adds the router's status, and when another router
 * in the list shows the same name, its identity (or IP, or id) so the two options
 * can be told apart, e.g. "MtaaniNet Hotspot #3 · Router-1215 · ● online".
 */
export function routerOptionLabel(router: Router, all: Router[], t: Translate = (s) => s): string {
  const name = displayRouterName(router.name);
  const key = name.toLowerCase();
  const parts = [name];

  const hasTwin = all.some((r) => r.id !== router.id && displayRouterName(r.name).toLowerCase() === key);
  if (hasTwin) {
    const identity = displayRouterName(router.identity);
    if (identity && identity.toLowerCase() !== key) parts.push(identity);
    else if (router.ip_address) parts.push(router.ip_address);
    else parts.push(`#${router.id}`);
  }

  if (router.status === 'online') parts.push(`● ${t('online')}`);
  else if (router.status === 'offline') parts.push(`○ ${t('offline')}`);

  return parts.join(' · ');
}

/**
 * Default router when nothing is selected yet: the one remembered from the last
 * visit (if it still exists), else the newest online router, else the newest router.
 * Routers come back ordered by id, so a plain data[0] favoured the oldest — often
 * a dead router the reseller had replaced.
 */
export function pickDefaultRouterId(routers: Router[], rememberedId?: number | null): number | null {
  if (routers.length === 0) return null;
  if (rememberedId != null && routers.some((r) => r.id === rememberedId)) return rememberedId;
  const newest = (list: Router[]) => list.reduce((a, b) => (b.id > a.id ? b : a));
  const online = routers.filter((r) => r.status === 'online');
  return newest(online.length > 0 ? online : routers).id;
}

const storageKey = (userId: number | string | null | undefined) =>
  `routerSelector:lastRouterId:${userId ?? 'anon'}`;

export function readRememberedRouterId(userId: number | string | null | undefined): number | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const id = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export function rememberRouterId(userId: number | string | null | undefined, routerId: number): void {
  try {
    window.localStorage.setItem(storageKey(userId), String(routerId));
  } catch {
    // Storage unavailable (private mode, blocked site data) — selection just isn't remembered.
  }
}
