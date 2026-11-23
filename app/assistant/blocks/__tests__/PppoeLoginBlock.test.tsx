import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../../lib/i18n', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/i18n')>('../../../lib/i18n');
  return {
    ...actual,
    useT: () => (text: string, vars?: Record<string, string | number>) => actual.translate('en', text, vars),
  };
});
vi.mock('../../../lib/api', () => ({ api: { getPPPoECredentials: vi.fn() } }));
let signedIn: unknown = { role: 'reseller' };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: signedIn }) }));

const { PppoeLoginBlock, pppoeLoginOf } = await import('../PppoeLoginBlock');
const { AnswerAccess } = await import('../access');
const { default: ResultBlock } = await import('../ResultBlock');

const SECRET = 'Kq7-zebra-41';
const live = {
  customer_id: 62, name: 'Home One', pppoe_username: 'HOME ONE', pppoe_password: SECRET,
  router_id: 7, router_name: 'Hill Top', pppoe_ports: ['ether2', 'ether3'], status: 'active',
};
const reopened = { ...live, pppoe_password: undefined, password_on_request: true };

describe('pppoeLoginOf', () => {
  it('reads the live answer with its password', () => {
    expect(pppoeLoginOf(live)).toMatchObject({ username: 'HOME ONE', password: SECRET, onRequest: false, routerName: 'Hill Top', ports: ['ether2', 'ether3'] });
  });

  it('never takes the mask for a password, and knows a reopened chat must ask', () => {
    expect(pppoeLoginOf({ ...live, pppoe_password: '•••• (hidden — open the page to see it)' })?.password).toBeNull();
    expect(pppoeLoginOf(reopened)).toMatchObject({ password: null, onRequest: true });
    expect(pppoeLoginOf({ name: 'x' })).toBeNull();
    expect(pppoeLoginOf(null)).toBeNull();
  });
});

describe('PppoeLoginBlock', () => {
  it('shows the login with the password behind Show, and where their router plugs in', () => {
    const html = renderToStaticMarkup(<PppoeLoginBlock title="Get Pppoe Credentials" login={pppoeLoginOf(live)!} />);
    expect(html).toContain('HOME ONE');
    expect(html).not.toContain(SECRET); // hidden until tapped
    expect(html).toContain('data-testid="pppoe-login-show"');
    expect(html).toContain('ether2 / ether3');
    expect(html).toContain('router mode');
    expect(html).toContain('PPPoE');
  });

  it('is what a pppoe_login result draws', () => {
    const html = renderToStaticMarkup(<ResultBlock title="Get Pppoe Credentials" payload={live} show="pppoe_login" />);
    expect(html).toContain('data-testid="pppoe-login-card"');
  });

  it('offers no Show in a read-only view or to staff who cannot manage customers', () => {
    const ro = renderToStaticMarkup(
      <AnswerAccess readOnly><PppoeLoginBlock title="x" login={pppoeLoginOf(reopened)!} /></AnswerAccess>,
    );
    expect(ro).not.toContain('pppoe-login-show');
    expect(ro).toContain('Not shown in this view');

    signedIn = { role: 'reseller', staff: { id: 3, permissions: ['customers.view'] } };
    const staff = renderToStaticMarkup(<PppoeLoginBlock title="x" login={pppoeLoginOf(reopened)!} />);
    expect(staff).not.toContain('pppoe-login-show');
    signedIn = { role: 'reseller' };
  });
});
