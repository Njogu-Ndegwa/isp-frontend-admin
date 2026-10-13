/**
 * Read-only admin "View as reseller" sessions.
 *
 * While viewing as a reseller, `auth_token` / `auth_user` hold the reseller's
 * impersonation token and user, so the whole app renders their dashboard
 * unchanged. The admin's own session is parked under `impersonation_origin`
 * and put back by `restoreAdmin()` on exit, expiry, or a 401.
 *
 * Every storage access is wrapped: private windows and blocked site data make
 * localStorage throw, and a broken store must never crash the app shell.
 */
import type { AuthUser, ImpersonationResponse } from './types';

export const IMPERSONATION_KEY = 'impersonation_origin';

export interface ImpersonationOrigin {
  adminToken: string;
  adminUser: AuthUser;
  sessionId: number;
  /** ISO UTC, from the server. */
  expiresAt: string;
  resellerId: number;
  resellerName: string;
}

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Storage full or blocked; nothing else to do.
  }
}

function remove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Blocked storage; nothing to remove.
  }
}

// The API client falls back to the auth cookies when localStorage is empty, so
// keep them in step with localStorage (same format as AuthContext).
function setCookie(name: string, value: string): void {
  try {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // Cookies blocked.
  }
}

function setAuth(token: string, user: AuthUser): void {
  const userJson = JSON.stringify(user);
  write('auth_token', token);
  write('auth_user', userJson);
  setCookie('auth_token', token);
  setCookie('auth_user', userJson);
  setCookie('demo_mode', 'false');
}

function isOrigin(value: unknown): value is ImpersonationOrigin {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.adminToken === 'string' && v.adminToken.length > 0
    && !!v.adminUser && typeof v.adminUser === 'object'
    && typeof v.resellerId === 'number'
    && typeof v.expiresAt === 'string';
}

/** The active View-as session, or null when the admin is not viewing as anyone. */
export function getImpersonation(): ImpersonationOrigin | null {
  const raw = read(IMPERSONATION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isOrigin(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Milliseconds left in the session (never negative). Unparseable → 0. */
export function impersonationMsLeft(origin: Pick<ImpersonationOrigin, 'expiresAt'>, now = Date.now()): number {
  const raw = origin.expiresAt;
  // The server sends a trailing Z; tolerate a naive timestamp as UTC.
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`;
  const end = Date.parse(iso);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - now);
}

/** mm:ss for the banner countdown. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Park the admin's session and switch auth to the impersonation token/user.
 * Throws when a View-as session is already active (starting a second one
 * would overwrite the parked admin token with the reseller's).
 */
export function beginImpersonation(
  response: ImpersonationResponse,
  resellerId: number,
  resellerName: string,
): ImpersonationOrigin {
  if (getImpersonation()) {
    throw new Error('Already viewing as a reseller. Exit first.');
  }
  const adminToken = read('auth_token');
  const adminUserRaw = read('auth_user');
  let adminUser: AuthUser | null = null;
  try {
    adminUser = adminUserRaw ? (JSON.parse(adminUserRaw) as AuthUser) : null;
  } catch {
    adminUser = null;
  }
  if (!adminToken || !adminUser) {
    throw new Error('Your admin session could not be read. Log in again.');
  }
  const origin: ImpersonationOrigin = {
    adminToken,
    adminUser,
    sessionId: response.session_id,
    expiresAt: response.expires_at,
    resellerId,
    resellerName: resellerName || response.user?.organization_name || response.user?.email || `#${resellerId}`,
  };
  write(IMPERSONATION_KEY, JSON.stringify(origin));
  if (!getImpersonation()) {
    // Storage refused the write: do not swap tokens, or the admin could not
    // get back to their own session.
    throw new Error('Your browser blocked saving the session. View-as needs site storage.');
  }
  setAuth(response.access_token, response.user);
  return origin;
}

// Set once the admin's session is restored. Every caller then hard-navigates,
// so it lives until the page unloads. Until then, requests still in flight
// with the old impersonation token come back 401; those must not be treated
// as the admin's session expiring (which would log the admin out).
let returningToAdmin = false;

/** True between restoring the admin and the page navigating away. */
export function isReturningToAdmin(): boolean {
  return returningToAdmin;
}

/**
 * Put the admin's token/user back and forget the View-as session. Returns the
 * session that was active (for the redirect target), or null if none was.
 */
export function restoreAdmin(): ImpersonationOrigin | null {
  const origin = getImpersonation();
  if (origin) {
    setAuth(origin.adminToken, origin.adminUser);
    returningToAdmin = true;
  }
  remove(IMPERSONATION_KEY);
  return origin;
}

/** Forget the View-as session without restoring anything (logout). */
export function clearImpersonation(): void {
  remove(IMPERSONATION_KEY);
}

/** Where to send the admin after a View-as session ends. */
export function adminReturnPath(origin: Pick<ImpersonationOrigin, 'resellerId'> | null, ended = false): string {
  if (!origin) return '/admin/resellers';
  return `/admin/resellers/${origin.resellerId}${ended ? '?viewas=ended' : ''}`;
}

export const IMPERSONATION_READ_ONLY_EVENT = 'impersonation-read-only';
