import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FR } from '../../lib/locales/fr';

// Same lookup as app/lib/i18n.ts translate(), without pulling in AuthContext.
vi.mock('../../lib/i18n', async () => {
  const actual = await vi.importActual<typeof import('../../lib/i18n')>('../../lib/i18n');
  return {
    ...actual,
    useT: () => (text: string, vars?: Record<string, string | number>) => actual.translate('en', text, vars),
  };
});

const { default: RouterSyncBadge, PENDING_LABEL, pendingWarning, routerSyncDetail } = await import('../RouterSyncBadge');

describe('RouterSyncBadge', () => {
  it('renders nothing when the router is in step', () => {
    expect(renderToStaticMarkup(<RouterSyncBadge cred={{ router_sync: null, router_sync_error: null }} />)).toBe('');
    expect(renderToStaticMarkup(<RouterSyncBadge cred={{}} />)).toBe('');
  });

  it.each(['add', 'remove', 'delete'] as const)('shows "pending: router unreachable" for %s', (kind) => {
    const html = renderToStaticMarkup(
      <RouterSyncBadge cred={{ router_sync: kind, router_sync_error: 'Failed to connect' }} showDetail />,
    );
    expect(html).toContain('Pending: router unreachable');
    expect(html).toContain('title="Failed to connect"');
    expect(html).toContain(routerSyncDetail({ router_sync: kind })!);
  });

  it('says a pending revoke is revoked here but not yet on the router', () => {
    expect(routerSyncDetail({ router_sync: 'remove' })).toMatch(/^Revoked here\./);
  });

  it('turns a pending API response into a warning, and a normal one into nothing', () => {
    expect(pendingWarning({ pending: true, warning: 'Router could not be reached. Saved.' }))
      .toBe('Router could not be reached. Saved.');
    expect(pendingWarning({ pending: true })).toBe(PENDING_LABEL);
    expect(pendingWarning({ pending: false, warning: 'x' })).toBeNull();
    expect(pendingWarning(null)).toBeNull();
  });

  it('has French strings for every label', () => {
    for (const text of [PENDING_LABEL, ...(['add', 'remove', 'delete'] as const).map((k) => routerSyncDetail({ router_sync: k })!)]) {
      expect(FR[text], text).toBeTruthy();
    }
  });
});
