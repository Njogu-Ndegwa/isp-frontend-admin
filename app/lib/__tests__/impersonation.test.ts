import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser, ImpersonationResponse } from '../types';

// Minimal browser globals (vitest runs in node here).
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

type FakeWindow = EventTarget & { localStorage: Storage; location: { href: string; assign: ReturnType<typeof vi.fn> } };
let win: FakeWindow;
let store: MemoryStorage;

const ADMIN: AuthUser = { id: 1, email: 'admin@example.test', role: 'admin', organization_name: 'Bitwave' };
const RESELLER: AuthUser = { id: 42, email: 'net@example.test', role: 'reseller', organization_name: 'Net Net ISP' };

function session(over: Partial<ImpersonationResponse> = {}): ImpersonationResponse {
  return {
    access_token: 'imp-token',
    token_type: 'bearer',
    session_id: 9,
    expires_at: '2026-10-13T10:30:00Z',
    read_only: true,
    user: RESELLER,
    impersonator: { id: 1, email: ADMIN.email },
    ...over,
  };
}

function loginAsAdmin() {
  store.setItem('auth_token', 'admin-token');
  store.setItem('auth_user', JSON.stringify(ADMIN));
}

beforeEach(() => {
  vi.resetModules();
  store = new MemoryStorage();
  const location = { href: 'http://localhost/dashboard', assign: vi.fn() };
  win = Object.assign(new EventTarget(), { localStorage: store as unknown as Storage, location });
  vi.stubGlobal('window', win);
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('document', { cookie: '' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('impersonation helpers', () => {
  it('beginImpersonation parks the admin session and switches auth to the reseller', async () => {
    const imp = await import('../impersonation');
    loginAsAdmin();
    const origin = imp.beginImpersonation(session(), 42, 'Net Net ISP');

    expect(origin).toMatchObject({ adminToken: 'admin-token', sessionId: 9, resellerId: 42, resellerName: 'Net Net ISP' });
    expect(store.getItem('auth_token')).toBe('imp-token');
    expect(JSON.parse(store.getItem('auth_user')!)).toMatchObject({ id: 42, role: 'reseller' });
    expect(imp.getImpersonation()).toMatchObject({ adminUser: { role: 'admin' }, expiresAt: '2026-10-13T10:30:00Z' });
  });

  it('restoreAdmin puts the admin back and forgets the session', async () => {
    const imp = await import('../impersonation');
    loginAsAdmin();
    imp.beginImpersonation(session(), 42, 'Net Net ISP');

    const restored = imp.restoreAdmin();
    expect(restored?.resellerId).toBe(42);
    expect(store.getItem('auth_token')).toBe('admin-token');
    expect(JSON.parse(store.getItem('auth_user')!)).toMatchObject({ role: 'admin' });
    expect(store.getItem(imp.IMPERSONATION_KEY)).toBeNull();
    expect(imp.getImpersonation()).toBeNull();
    expect(imp.restoreAdmin()).toBeNull();
  });

  it('refuses to start a second session over an active one', async () => {
    const imp = await import('../impersonation');
    loginAsAdmin();
    imp.beginImpersonation(session(), 42, 'Net Net ISP');
    expect(() => imp.beginImpersonation(session({ access_token: 'other' }), 43, 'Other')).toThrow(/Already viewing/);
    expect(imp.getImpersonation()?.adminToken).toBe('admin-token');
  });

  it('does not swap tokens without a readable admin session', async () => {
    const imp = await import('../impersonation');
    expect(() => imp.beginImpersonation(session(), 42, 'Net')).toThrow();
    expect(store.getItem('auth_token')).toBeNull();
  });

  it('ignores corrupt or partial stored sessions', async () => {
    const imp = await import('../impersonation');
    store.setItem(imp.IMPERSONATION_KEY, '{not json');
    expect(imp.getImpersonation()).toBeNull();
    store.setItem(imp.IMPERSONATION_KEY, JSON.stringify({ resellerId: 42 }));
    expect(imp.getImpersonation()).toBeNull();
  });

  it('survives storage that throws', async () => {
    const imp = await import('../impersonation');
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    };
    vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: broken }));
    expect(imp.getImpersonation()).toBeNull();
    expect(imp.restoreAdmin()).toBeNull();
    expect(() => imp.clearImpersonation()).not.toThrow();
    expect(() => imp.beginImpersonation(session(), 42, 'Net')).toThrow();
  });

  it('counts down to the server expiry and formats mm:ss', async () => {
    const imp = await import('../impersonation');
    const now = Date.parse('2026-10-13T10:00:00Z');
    expect(imp.impersonationMsLeft({ expiresAt: '2026-10-13T10:30:00Z' }, now)).toBe(30 * 60_000);
    // Naive timestamps are treated as UTC.
    expect(imp.impersonationMsLeft({ expiresAt: '2026-10-13T10:01:05' }, now)).toBe(65_000);
    expect(imp.impersonationMsLeft({ expiresAt: '2026-10-13T09:00:00Z' }, now)).toBe(0);
    expect(imp.impersonationMsLeft({ expiresAt: 'garbage' }, now)).toBe(0);
    expect(imp.formatCountdown(30 * 60_000)).toBe('30:00');
    expect(imp.formatCountdown(65_000)).toBe('01:05');
    expect(imp.formatCountdown(500)).toBe('00:01');
    expect(imp.formatCountdown(0)).toBe('00:00');
  });

  it('builds the admin return path', async () => {
    const imp = await import('../impersonation');
    expect(imp.adminReturnPath({ resellerId: 42 })).toBe('/admin/resellers/42');
    expect(imp.adminReturnPath({ resellerId: 42 }, true)).toBe('/admin/resellers/42?viewas=ended');
    expect(imp.adminReturnPath(null, true)).toBe('/admin/resellers');
  });
});

describe('api client during View-as', () => {
  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  async function startViewAs() {
    const imp = await import('../impersonation');
    loginAsAdmin();
    imp.beginImpersonation(session(), 42, 'Net Net ISP');
    return imp;
  }

  it('startImpersonation posts the reason with the admin token', async () => {
    loginAsAdmin();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, session()));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('../api');
    const res = await api.startImpersonation(42, 'Support ticket 123');
    expect(res.access_token).toBe('imp-token');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/admin\/impersonate\/42$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ reason: 'Support ticket 123' });
    expect(init.headers.Authorization).toBe('Bearer admin-token');
  });

  it('endImpersonation uses the impersonation token, or an explicit one', async () => {
    await startViewAs();
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, { ended: true })));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = await import('../api');
    await expect(api.endImpersonation()).resolves.toEqual({ ended: true });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/impersonation\/end$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer imp-token');
    await api.endImpersonation('explicit');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer explicit');
  });

  it('a 401 while viewing as restores the admin instead of logging out', async () => {
    const imp = await startViewAs();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse(401, { detail: 'View-as session ended', code: 'impersonation_ended' }))));
    const { api } = await import('../api');

    const results = await Promise.allSettled([api.getPlans(), api.getRouters(), api.getPlans()]);
    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect((r as PromiseRejectedResult).reason).toMatchObject({ status: 401 });
    }
    // Concurrent 401s: only the first restores/redirects; the admin token survives the rest.
    expect(win.location.assign).toHaveBeenCalledTimes(1);
    expect(win.location.assign).toHaveBeenCalledWith('/admin/resellers/42?viewas=ended');
    expect(win.location.href).not.toBe('/login');
    expect(store.getItem('auth_token')).toBe('admin-token');
    expect(JSON.parse(store.getItem('auth_user')!)).toMatchObject({ role: 'admin' });
    expect(imp.getImpersonation()).toBeNull();
  });

  it('a late 401 after Exit restored the admin does not log the admin out', async () => {
    const imp = await startViewAs();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'View-as session ended', code: 'impersonation_ended' })));
    const { api } = await import('../api');
    imp.restoreAdmin(); // Exit / auto-exit, before its navigation completes
    await expect(api.getPlans()).rejects.toMatchObject({ status: 401 });
    expect(store.getItem('auth_token')).toBe('admin-token');
    expect(win.location.href).not.toBe('/login');
  });

  it('a 401 without View-as still logs out to /login', async () => {
    loginAsAdmin();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Not authenticated' })));
    const { api } = await import('../api');
    await expect(api.getPlans()).rejects.toThrow(/Session expired/);
    expect(win.location.href).toBe('/login');
    expect(store.getItem('auth_token')).toBeNull();
  });

  it('a 403 impersonation_read_only surfaces the server message and flags the banner', async () => {
    await startViewAs();
    const detail = "Read-only: you are viewing this reseller's dashboard. Changes are disabled.";
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, { detail, code: 'impersonation_read_only' })));
    const { api } = await import('../api');
    const { IMPERSONATION_READ_ONLY_EVENT } = await import('../impersonation');
    const seen: string[] = [];
    win.addEventListener(IMPERSONATION_READ_ONLY_EVENT, (e) => seen.push((e as CustomEvent<string>).detail));

    await expect(api.createPlan({ name: 'X' } as never)).rejects.toMatchObject({ message: detail, status: 403 });
    expect(seen).toEqual([detail]);
    // Still viewing as: a blocked write must not end the session.
    expect(store.getItem('auth_token')).toBe('imp-token');
  });
});
