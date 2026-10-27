import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

beforeEach(() => {
  vi.resetModules();
  store = new MemoryStorage();
  win = Object.assign(new EventTarget(), {
    localStorage: store as unknown as Storage,
    location: { href: '/customers', assign: vi.fn() },
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('document', { cookie: '' });
  store.setItem('auth_token', 'staff-token');
  store.setItem('auth_user', JSON.stringify({ id: 652, role: 'reseller', email: 'jane@example.test', organization_name: 'Kwetu' }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('API client: staff errors', () => {
  it('403 staff_permission_denied: raises the notice, keeps the session', async () => {
    vi.stubGlobal('fetch', respond(403, {
      detail: 'You do not have permission to withdraw money.',
      code: 'staff_permission_denied',
      permission: 'money.withdraw',
    }));
    const { api, ApiError } = await import('../api');
    const { STAFF_PERMISSION_DENIED_EVENT } = await import('../permissions');
    const seen: unknown[] = [];
    win.addEventListener(STAFF_PERMISSION_DENIED_EVENT, (e) => seen.push((e as CustomEvent).detail));

    const err = await api.resellerWithdraw().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('You do not have permission to withdraw money.');
    expect(err.status).toBe(403);
    expect(err.detail).toMatchObject({ code: 'staff_permission_denied', permission: 'money.withdraw' });
    expect(seen).toEqual([{ message: 'You do not have permission to withdraw money.', permission: 'money.withdraw' }]);
    expect(store.getItem('auth_token')).toBe('staff-token');
    expect(win.location.href).toBe('/customers');
  });

  it('401 staff_session_revoked: clears the session and explains on the login page', async () => {
    vi.stubGlobal('fetch', respond(401, { detail: 'Your access changed', code: 'staff_session_revoked' }));
    const { api } = await import('../api');

    await expect(api.getCustomers()).rejects.toThrow();
    expect(store.getItem('auth_token')).toBeNull();
    expect(store.getItem('auth_user')).toBeNull();
    expect(win.location.href).toBe('/login?reason=access_changed');
  });

  it('401 session_revoked (owner): same handling with its own reason', async () => {
    vi.stubGlobal('fetch', respond(401, { detail: 'Signed out', code: 'session_revoked' }));
    const { api } = await import('../api');

    await expect(api.getCustomers()).rejects.toThrow();
    expect(store.getItem('auth_token')).toBeNull();
    expect(win.location.href).toBe('/login?reason=session_revoked');
  });

  it('plain 401 still goes to /login as before', async () => {
    vi.stubGlobal('fetch', respond(401, { detail: 'Not authenticated' }));
    const { api } = await import('../api');

    await expect(api.getCustomers()).rejects.toThrow('Session expired. Please log in again.');
    expect(win.location.href).toBe('/login');
  });

  it('View-as 401 still restores the admin instead of logging out', async () => {
    store.setItem('impersonation_origin', JSON.stringify({
      adminToken: 'admin-token',
      adminUser: { id: 1, role: 'admin', email: 'a@example.test', organization_name: 'Bitwave' },
      sessionId: 9,
      expiresAt: '2026-10-13T10:30:00Z',
      resellerId: 652,
      resellerName: 'Kwetu',
    }));
    vi.stubGlobal('fetch', respond(401, { detail: 'Gone', code: 'staff_session_revoked' }));
    const { api } = await import('../api');

    await expect(api.getCustomers()).rejects.toThrow('View-as session ended');
    expect(store.getItem('auth_token')).toBe('admin-token');
    expect(win.location.assign).toHaveBeenCalledWith('/admin/resellers/652?viewas=ended');
  });

  it('password change stores the reissued token', async () => {
    vi.stubGlobal('fetch', respond(200, { message: 'Password changed', access_token: 'fresh-token' }));
    const { api } = await import('../api');

    const result = await api.changePassword({ current_password: 'old-pass', new_password: 'new-pass' });
    expect(result.access_token).toBe('fresh-token');
    expect(store.getItem('auth_token')).toBe('fresh-token');
  });
});
