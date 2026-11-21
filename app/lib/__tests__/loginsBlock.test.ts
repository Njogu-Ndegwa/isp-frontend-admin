import { describe, expect, it } from 'vitest';
import { loginFacts, nameFromComment, reasonText, routerTime, subLine } from '../../assistant/blocks/LoginsBlock';

const pppoeFacts = (r: Record<string, unknown>, down = false) => loginFacts(r, 'pppoe', down);
import { entityOf } from '../assistantEntities';

const login = (over: Record<string, unknown> = {}) => ({
  username: 'jane01', service: 'pppoe', profile: '10M', disabled: false, comment: 'CID:41|Jane Wanjiru|2026-11-02',
  online: true, address: '10.10.0.5', uptime: '1d02:04:05', caller_id: 'AA:BB', upload_bytes: 2e8, download_bytes: 1e9,
  upload_rate: '800000', download_rate: '6400000', max_limit: '10M/10M', last_logged_out: 'nov/20/2026 14:22:10',
  last_disconnect_reason: 'peer-not-responding', last_caller_id: 'AA:BB', session_count: 1, sessions: [{}], customer: null,
  ...over,
});

describe('PPPoE logins', () => {
  it('are recognised from the users list, ahead of customers', () => {
    const e = entityOf({ success: true, users: [login(), login({ username: 'b' })], summary: { total: 2 } });
    expect(e?.entity).toBe('pppoe_user');
    expect(e?.rows).toHaveLength(2);
  });

  it('are named after the billing customer, else the comment, else the login', () => {
    expect(pppoeFacts(login({ customer: { id: 41, name: 'Jane W.', status: 'active', plan: 'Home 10' } })).name).toBe('Jane W.');
    expect(pppoeFacts(login()).name).toBe('Jane Wanjiru');
    expect(pppoeFacts(login({ comment: '' })).name).toBe('jane01');
    expect(nameFromComment('office printer')).toBe('office printer');
    expect(nameFromComment('DB fallback; live RouterOS state not queried')).toBe('');
  });

  it('read their state the way the classic card does', () => {
    expect(pppoeFacts(login()).state).toBe('online');
    expect(pppoeFacts(login({ online: false })).state).toBe('offline');
    expect(pppoeFacts(login({ disabled: true })).state).toBe('disabled');
    expect(pppoeFacts(login(), true).state).toBe('router_down');
    const p = pppoeFacts(login({ customer: { id: 41, name: 'J', status: 'expired' } }));
    expect(p.paid).toEqual({ label: 'Expired', tone: 'bad' });
    expect(p.down).toBe(6_400_000);
    expect(p.uptime).toBe('1 d 2 h');
  });

  it('on a hotspot: named by customer or MAC, a bypass flagged as free', () => {
    const dev = { username: 'AA:BB:CC:00:00:01', mac_address: 'AA:BB:CC:00:00:01', profile: 'default', disabled: false, comment: '',
      online: true, online_source: 'active', address: '10.5.0.9', uptime: '2h3m', idle_time: '0s', login_by: 'mac-cookie',
      upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '', binding_type: '', bypassed: false,
      authorized: true, has_queue: true, customer: null };
    expect(entityOf({ users: [dev] })?.entity).toBe('hotspot_user');
    const p = loginFacts(dev, 'hotspot');
    expect(p.name).toBe('AA:BB:CC:00:00:01');
    expect(p.free).toBeNull();
    expect(p.how).toBe('remembered');
    expect(subLine(loginFacts({ ...dev, username: 'K7Q2M9', mac_address: '9A:11' }, 'hotspot'))).toBe('9A:11 · default · remembered');
    expect(loginFacts({ ...dev, bypassed: true, binding_type: 'bypassed' }, 'hotspot').free).toBe('bypassed');
    expect(loginFacts({ ...dev, customer: { id: 3, name: 'Mama Mboga', status: 'active' } }, 'hotspot').name).toBe('Mama Mboga');
  });

  it('say router times and disconnect reasons plainly', () => {
    expect(routerTime('nov/20/2026 14:22:10')?.getDate()).toBe(20);
    expect(routerTime('2026-11-20 14:22:10')?.getMonth()).toBe(10);
    expect(routerTime('')).toBeNull();
    expect(reasonText('peer-not-responding')).toMatch(/stopped answering/);
    expect(reasonText('something-new')).toBe('something new');
  });
});

describe('uptime in words', () => {
  it('reads both RouterOS ways', async () => {
    const { uptimeText } = await import('../assistantEntities');
    expect(uptimeText('3d04:14:07')).toBe('3 d 4 h');
    expect(uptimeText('2h3m4s')).toBe('2 h');
    expect(uptimeText('1d5h')).toBe('1 d 5 h');
    expect(uptimeText('45m10s')).toBe('45 min');
    expect(uptimeText('12s')).toBe('12 s');
  });
});

describe('live state for a customer list', () => {
  it('matches PPPoE by login, hotspot by customer or MAC, and a dead router marks everyone', async () => {
    const { matchLive } = await import('../useCustomerLive');
    const { customerFacts } = await import('../assistantEntities');
    const now = Date.now();
    const people = [
      customerFacts({ id: 6, name: 'Mercy', phone: '1', status: 'active', expiry: '2099-01-01', pppoe_username: 'mercy', router_id: 1 }, now),
      customerFacts({ id: 1, name: 'Grace', phone: '2', status: 'active', expiry: '2099-01-01', mac_address: '3c-22-fb-10-00-01', router_id: 1 }, now),
      customerFacts({ id: 2, name: 'Brian', phone: '3', status: 'active', expiry: '2099-01-01', router_id: 1 }, now),
    ];
    const live = matchLive(people,
      { users: [{ username: 'mercy', online: true, download_rate: '8400000', upload_rate: '1', address: '10.0.0.1' }] },
      { users: [{ mac_address: '3C:22:FB:10:00:01', online: false, customer: null }, { mac_address: 'X', online: true, customer: { id: 2 } }] });
    expect(live.get(6)).toMatchObject({ state: 'online', down: 8_400_000 });
    expect(live.get(1)?.state).toBe('offline');
    expect(live.get(2)?.state).toBe('online');
    const down = matchLive(people, { users: [], router_reachable: false }, { users: [], router_reachable: false });
    expect(down.get(1)?.state).toBe('router_down');
  });
});
