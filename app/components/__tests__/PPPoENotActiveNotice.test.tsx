import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FR } from '../../lib/locales/fr';
import { translate } from '../../lib/i18n';
import {
  AUTH_FAILURES_MESSAGE,
  AUTH_FAILURES_MESSAGE_NO_TIME,
  EXPIRED_NO_ACCOUNT,
  EXPIRED_WITH_ACCOUNT,
  NOT_ACTIVE_NO_ACCOUNT,
  NOT_ACTIVE_WITH_ACCOUNT,
  NOW_ACTIVE_MESSAGE,
  authFailuresNotice,
  pppoeNotActiveNotice,
} from '../../customers/[id]/pppoeActivation';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../lib/i18n', async () => {
  const actual = await vi.importActual<typeof import('../../lib/i18n')>('../../lib/i18n');
  return {
    ...actual,
    useT: () => (text: string, vars?: Record<string, string | number>) => actual.translate('en', text, vars),
  };
});
vi.mock('../../context/AlertContext', () => ({ useAlert: () => ({ showAlert: () => {} }) }));
vi.mock('../../lib/api', () => ({ api: {} }));

const { default: PPPoENotActiveNotice } = await import('../PPPoENotActiveNotice');

const NOW = new Date('2026-11-08T12:00:00Z');

// LKR0101 right after "Add customer" (8 Nov 2026): inactive, no expiry yet.
const fresh = {
  id: 54051,
  name: 'LKR0101',
  status: 'inactive' as const,
  connection_type: 'pppoe' as const,
  account_number: 'LKR0101',
  expiry: '',
  is_paused: false,
};

describe('pppoeNotActiveNotice', () => {
  it('names the account to pay to for a customer never activated', () => {
    expect(pppoeNotActiveNotice(fresh, NOW)).toEqual({ key: NOT_ACTIVE_WITH_ACCOUNT, vars: { account: 'LKR0101' } });
    expect(pppoeNotActiveNotice({ ...fresh, account_number: '' }, NOW)).toEqual({ key: NOT_ACTIVE_NO_ACCOUNT, vars: {} });
  });

  it('says expired when the plan ran out (naive UTC from the API)', () => {
    const lapsed = { ...fresh, expiry: '2026-11-01T09:00:00' };
    expect(pppoeNotActiveNotice(lapsed, NOW)?.key).toBe(EXPIRED_WITH_ACCOUNT);
    expect(pppoeNotActiveNotice({ ...lapsed, account_number: null }, NOW)?.key).toBe(EXPIRED_NO_ACCOUNT);
  });

  it('says nothing for active or paused customers', () => {
    expect(pppoeNotActiveNotice({ ...fresh, status: 'active' }, NOW)).toBeNull();
    expect(pppoeNotActiveNotice({ ...fresh, is_paused: true }, NOW)).toBeNull();
    expect(pppoeNotActiveNotice(null, NOW)).toBeNull();
  });

  it('reads the exact message the reseller needs', () => {
    const n = pppoeNotActiveNotice(fresh, NOW)!;
    expect(translate('en', n.key, n.vars)).toBe(
      "Not active yet: this login won't work until the customer pays to account LKR0101 or you press Activate.",
    );
  });
});

describe('authFailuresNotice', () => {
  it('reports the router refusing the login', () => {
    expect(authFailuresNotice({ lookup_success: true, count: 457, last_at: '19:14:50' })).toEqual({
      key: AUTH_FAILURES_MESSAGE, vars: { count: '457', time: '19:14:50' },
    });
    expect(authFailuresNotice({ lookup_success: true, count: 3, last_at: null })?.key).toBe(AUTH_FAILURES_MESSAGE_NO_TIME);
  });

  it('stays quiet with no failures, an unread log or an older backend', () => {
    expect(authFailuresNotice({ lookup_success: true, count: 0, last_at: null })).toBeNull();
    expect(authFailuresNotice({ lookup_success: false, count: 0, last_at: null })).toBeNull();
    expect(authFailuresNotice(null)).toBeNull();
    expect(authFailuresNotice(undefined)).toBeNull();
  });
});

describe('PPPoENotActiveNotice', () => {
  it('shows the warning, the refused tries and an Activate button', () => {
    const html = renderToStaticMarkup(
      <PPPoENotActiveNotice
        customer={fresh}
        canActivate
        authFailures={{ lookup_success: true, count: 457, last_at: '19:14:50' }}
        onActivated={() => {}}
      />,
    );
    expect(html).toContain('data-testid="pppoe-not-active"');
    expect(html).toContain('pays to account LKR0101 or you press Activate');
    expect(html).toContain('tried this login 457 times recently');
    expect(html).toContain('data-testid="pppoe-not-active-activate"');
  });

  it('hides Activate from staff who cannot manage customers', () => {
    const html = renderToStaticMarkup(
      <PPPoENotActiveNotice customer={fresh} canActivate={false} onActivated={() => {}} />,
    );
    expect(html).toContain('pppoe-not-active');
    expect(html).not.toContain('pppoe-not-active-activate');
    expect(html).not.toContain('pppoe-auth-failures');
  });

  it('renders nothing once the customer is active', () => {
    const html = renderToStaticMarkup(
      <PPPoENotActiveNotice customer={{ ...fresh, status: 'active' }} canActivate onActivated={() => {}} />,
    );
    expect(html).toBe('');
  });
});

describe('French', () => {
  it.each([
    NOT_ACTIVE_WITH_ACCOUNT, NOT_ACTIVE_NO_ACCOUNT, EXPIRED_WITH_ACCOUNT, EXPIRED_NO_ACCOUNT,
    AUTH_FAILURES_MESSAGE, AUTH_FAILURES_MESSAGE_NO_TIME, NOW_ACTIVE_MESSAGE,
  ])('translates %j and keeps its placeholders', (key) => {
    const fr = FR[key];
    expect(fr).toBeTruthy();
    for (const placeholder of key.match(/\{\w+\}/g) ?? []) expect(fr).toContain(placeholder);
  });
});
