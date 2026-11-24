/*
 * Made-up API results for the tables the assistant draws, in the shapes the backend
 * returns them (field names copied from the routes). Nothing here is a real reseller,
 * customer, router or device: names are invented and MACs are locally administered
 * 02:00:00:… addresses. Used by the preview page (?view=tables) and the table tests.
 */

const H = 3_600_000;
const D = 24 * H;
/** a naive UTC time like the API sends, `ms` from now */
export const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString().replace('Z', '').slice(0, 19);
const unix = (ms: number) => Math.round((Date.now() + ms) / 1000);
const mac = (n: number) => `02:00:00:00:00:${n.toString(16).toUpperCase().padStart(2, '0')}`;

export interface TableFixture { title: string; path: string; query?: Record<string, unknown>; show: string; payload: unknown }

const customer = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, phone: `0700 000 ${String(id).padStart(3, '0')}`, mac_address: mac(id), pppoe_username: null, pppoe_password: null,
  static_ip: null, static_mac: null, status: 'active', expiry: isoIn((id % 5 + 1) * 3 * H), created_at: isoIn(-40 * D),
  plan_id: 3, router_id: 1, account_number: `BW10${id}`, wallet_credit_kes: 0, grace_period_minutes: 0, in_grace: false,
  effective_expiry: null, is_paused: false, has_paid: true, tier: 'customer',
  plan: { id: 3, name: '1 day · 50', price: 50, connection_type: 'hotspot', speed: '5M/5M', data_cap_mb: null },
  router: { id: 1, name: 'Sample Tower' }, ...extra,
});

export const TABLE_FIXTURES: Record<string, TableFixture> = {
  onlineCustomers: {
    title: 'Get Customers', path: '/api/customers', query: { online: true }, show: 'table',
    payload: { data: [
      customer(1, 'Amina Hassan'),
      customer(2, 'Brian Kiptoo', { expiry: isoIn(40 * 60_000) }),
      customer(3, 'Carol Wambui', { pppoe_username: 'carol-w', mac_address: null, plan: { id: 9, name: 'Monthly PPPoE 10M', price: 1500, connection_type: 'pppoe', speed: '10M/10M' }, expiry: isoIn(19 * D) }),
      customer(4, 'Guest 4821', { tier: 'visitor', has_paid: false }),
    ], total: 4, live_router_ids: [1], not_live_routers: [] },
  },
  customers: {
    title: 'Get Customers', path: '/api/customers', query: { status: 'active' }, show: 'table',
    payload: [
      customer(11, 'Daniel Omondi'), customer(12, 'Esther Moraa', { status: 'inactive', expiry: isoIn(-3 * D) }),
      customer(13, 'Felix Barasa', { expiry: isoIn(6 * D) }), customer(14, 'Gladys Chebet', { expiry: isoIn(2 * H) }),
    ],
  },
  routers: {
    title: 'Get Routers', path: '/api/routers', show: 'table',
    payload: [
      { id: 1, name: 'Sample Tower', identity: 'SAMPLE-TOWER', ip_address: '10.0.0.201', status: 'online', status_last_checked_at: isoIn(-2 * 60_000), availability_checks: 1000, availability_successes: 996 },
      { id: 2, name: 'River Road AP', identity: 'RIVER-AP', ip_address: '10.0.0.202', status: 'offline', last_online_at: isoIn(-5 * H), availability_checks: 1000, availability_successes: 870 },
    ],
  },
  mpesa: {
    title: 'Get Mpesa Transactions', path: '/api/mpesa/transactions', query: { date: '2026-11-24' }, show: 'table',
    payload: [1, 2, 3, 4].map((i) => ({
      transaction_id: 900 + i, checkout_request_id: `ws_CO_${i}`, phone_number: `25470000000${i}`, amount: [50, 20, 300, 50][i - 1], reference: `REF${i}`,
      status: i === 3 ? 'pending' : 'completed', payment_method: 'mobile_money', mpesa_receipt_number: `SAMPLE00${i}`, result_code: 0, result_desc: 'ok',
      transaction_date: isoIn(-i * H), created_at: isoIn(-i * H), counts_as_revenue: true, source: 'mpesa_stk',
      customer: { id: i, name: ['Amina Hassan', 'Brian Kiptoo', 'Carol Wambui', 'Daniel Omondi'][i - 1], phone: `07000000${i}`, mac_address: mac(i), status: 'active' },
      router: { id: 1, name: 'Sample Tower', ip_address: '10.0.0.201' }, plan: { id: 3, name: '1 day · 50', price: 50 },
    })),
  },
  failed: {
    title: 'Get Failed Mpesa Transactions', path: '/api/mpesa/transactions/failed', show: 'table',
    payload: { total_failed: 2, total_amount_lost: 70, transactions: [
      { transaction_id: 801, checkout_request_id: 'ws_CO_a', phone_number: '254700000011', amount: 50, reference: 'R1', status: 'failed', failure_source: 'customer', result_code: 1032, result_desc: 'Request cancelled by user', failure_fault: 'customer', failure_explained: 'The customer cancelled the M-Pesa prompt.', created_at: isoIn(-2 * H), customer: { id: 11, name: 'Daniel Omondi', phone: '0700000011', mac_address: mac(11), status: 'active' }, router: { id: 1, name: 'Sample Tower' }, plan: { id: 3, name: '1 day · 50', price: 50 } },
      { transaction_id: 802, checkout_request_id: 'ws_CO_b', phone_number: '254700000012', amount: 20, reference: 'R2', status: 'failed', failure_source: 'customer', result_code: 1, result_desc: 'Insufficient balance', failure_fault: 'customer', failure_explained: 'Not enough money on M-Pesa.', created_at: isoIn(-5 * H), customer: null, router: { id: 1, name: 'Sample Tower' }, plan: { id: 4, name: '3 hours · 20', price: 20 } },
    ] },
  },
  plans: {
    title: 'Get Plans', path: '/api/plans', show: 'table',
    payload: [
      { id: 3, name: '1 day · 50', price: 50, duration_value: 1, duration_unit: 'days', speed: '5M/5M', connection_type: 'hotspot', router_id: 1, is_hidden: false },
      { id: 4, name: '3 hours · 20', price: 20, duration_value: 3, duration_unit: 'hours', speed: '3M/3M', connection_type: 'hotspot', router_id: 1, is_hidden: false },
      { id: 9, name: 'Monthly PPPoE 10M', price: 1500, duration_value: 30, duration_unit: 'days', speed: '10M/10M', connection_type: 'pppoe', router_id: 1, is_hidden: false },
    ],
  },
  // GET /api/routers/{id}/users: the router's own hotspot user list (router_operations._get_router_users_sync)
  routerUsers: {
    title: 'Get Router Users', path: '/api/routers/1/users', show: 'table',
    payload: { router_id: 1, router_name: 'Sample Tower', total_users: 6, active_sessions: 4, users: [
      { username: mac(1), profile: 'plan_5M_5M', disabled: false, comment: `MACLOGIN|MAC:${mac(1)}|T:${unix(-3 * H)}|EXP:${unix(5 * H)}|CID:1|Amina Hassan`, uptime_limit: '', active: true,
        session: { address: '10.5.50.11', login_time: 'nov/24/2026 12:02:10', uptime: '3h12m4s', bytes_in: '48211234', bytes_out: '512334102' },
        customer: { id: 1, name: 'Amina Hassan', plan: '1 day · 50', status: 'active', expiry: isoIn(5 * H) } },
      { username: mac(2), profile: 'plan_5M_5M', disabled: false, comment: `MACLOGIN|MAC:${mac(2)}|T:${unix(-H)}|EXP:${unix(40 * 60_000)}`, uptime_limit: '', active: true,
        session: { address: '10.5.50.12', login_time: 'nov/24/2026 14:40:00', uptime: '52m10s', bytes_in: '2211234', bytes_out: '90334102' },
        customer: { id: 2, name: 'Brian Kiptoo', plan: '1 day · 50', status: 'active', expiry: isoIn(40 * 60_000) } },
      { username: mac(0xc8), profile: 'plan_3M_3M', disabled: false, comment: `MACLOGIN|MAC:${mac(0xc8)}|T:${unix(-2 * H)}|EXP:${unix(H)}`, uptime_limit: '', active: true,
        session: { address: '10.5.50.13', login_time: 'nov/24/2026 13:30:00', uptime: '2h5m1s', bytes_in: '1211234', bytes_out: '20334102' } },
      { username: mac(7), profile: 'plan_3M_3M', disabled: false, comment: `MACLOGIN|MAC:${mac(7)}|T:${unix(-H)}|EXP:${unix(2 * H)}|Voucher SAMPLE7 redeemed for Guest 7824`, uptime_limit: '', active: true,
        session: { address: '10.5.50.14', login_time: 'nov/24/2026 14:10:00', uptime: '1h20m', bytes_in: '311234', bytes_out: '8334102' } },
      { username: mac(9), profile: 'plan_5M_5M', disabled: false, comment: `MACLOGIN|MAC:${mac(9)}|T:${unix(-D)}|EXP:${unix(-2 * H)}|CID:9|Esther Moraa`, uptime_limit: '', active: false },
      { username: 'default-trial', profile: 'default', disabled: false, comment: '', uptime_limit: '30m', active: false },
    ] },
  },
  // GET /api/pppoe/{id}/users (pppoe_monitor): drawn by the logins component
  pppoeUsers: {
    title: 'Pppoe Users', path: '/api/pppoe/1/users', show: 'table',
    payload: { router_id: 1, router_name: 'Sample Tower', summary: { total: 2, online: 1, offline: 1 }, users: [
      { username: 'carol-w', service: 'pppoe', profile: 'plan_10M', disabled: false, comment: 'CID:3|Carol Wambui', online: true, address: '10.20.0.5', uptime: '1d4h2m', caller_id: mac(0x31), upload_bytes: 120_000_000, download_bytes: 2_400_000_000, upload_rate: '250000', download_rate: '3400000', max_limit: '10M/10M', session_count: 1, sessions: [], last_logged_out: '', last_disconnect_reason: '', last_caller_id: mac(0x31),
        customer: { id: 3, name: 'Carol Wambui', phone: '0700000003', status: 'active', expiry: isoIn(19 * D), plan: 'Monthly PPPoE 10M', plan_speed: '10M/10M', account_number: 'BW103' } },
      { username: 'esther-m', service: 'pppoe', profile: 'plan_10M', disabled: false, comment: '', online: false, address: null, uptime: null, caller_id: null, upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '', session_count: 0, sessions: [], last_logged_out: 'nov/24/2026 14:05:00', last_disconnect_reason: 'peer-request', last_caller_id: mac(0x32),
        customer: { id: 12, name: 'Esther Moraa', phone: '0700000012', status: 'active', expiry: isoIn(4 * D), plan: 'Monthly PPPoE 10M', plan_speed: '10M/10M', account_number: 'BW112' } },
    ] },
  },
  hotspotLogs: {
    title: 'Hotspot Logs', path: '/api/hotspot/1/logs', show: 'table',
    payload: { router_id: 1, router_name: 'Sample Tower', filter_search: null, generated_at: isoIn(0), notable_entries_persisted: 0, success: true, count: 4, data: [
      { time: '14:52:10', topics: 'hotspot,account,info,debug', message: `${mac(1)} (10.5.50.11): logged in` },
      { time: '14:40:02', topics: 'hotspot,info,debug', message: `${mac(2)} (10.5.50.12): trying to log in by mac` },
      { time: '14:31:44', topics: 'dhcp,info', message: `defconf assigned 10.5.50.13 to ${mac(0xc8)}` },
      { time: '14:05:00', topics: 'hotspot,account,info,debug', message: `${mac(9)} (10.5.50.19): logged out: session timeout` },
    ] },
  },
  offline: {
    title: 'Offline Customers', path: '/api/routers/1/offline-customers', show: 'table',
    payload: { router_id: 1, router_name: 'Sample Tower', checked_at: isoIn(0), live: true, counts: { paid: 3, online: 1, offline: 2 }, note: '', offline: [
      { customer_id: 12, name: 'Esther Moraa', connection_type: 'pppoe', offline_since: isoIn(-50 * 60_000), since_source: 'last_logout', since_note: null, reason_code: 'peer_request', reason: 'The router at their home disconnected', plan: 'Monthly PPPoE 10M', expiry: isoIn(4 * D), in_grace: false, pppoe_username: 'esther-m' },
      { customer_id: 13, name: 'Felix Barasa', connection_type: 'hotspot', offline_since: null, since_source: null, since_note: 'Not seen since the router restarted', reason_code: 'not_connected', reason: null, plan: '1 day · 50', expiry: isoIn(6 * D), in_grace: false, mac_address: mac(13) },
    ] },
  },
  campaigns: {
    title: 'Get Campaigns', path: '/api/messaging/campaigns', show: 'table',
    payload: { campaigns: [
      { id: 41, body: 'Your internet ends today. Pay 50 on the usual till to stay online.', recipient_count: 14, segments_per_message: 1, total_credits: 14, sent_count: 13, failed_count: 1, refunded_credits: 1, status: 'sent', created_at: isoIn(-6 * H) },
      { id: 40, body: 'Maintenance tonight from 23:00 to 01:00.', recipient_count: 120, segments_per_message: 1, total_credits: 120, sent_count: 0, failed_count: 0, refunded_credits: 0, status: 'queued', created_at: isoIn(-20 * 60_000) },
    ] },
  },
  illegal: {
    title: 'Illegal Connections', path: '/api/routers/1/illegal-connections', show: 'table',
    payload: { router_id: 1, router_name: 'Sample Tower', scan_time: isoIn(0), filter_mode: 'only_bypassing', summary: { total_issues: 2 }, note: '', recommendation: '', protected_devices: [], issues: [
      { type: 'UNAUTHORIZED', severity: 'CRITICAL', mac_address: mac(0x51), ip_address: '10.5.50.90', source: 'ARP+DHCP+HOTSPOT', interface: 'bridge', hostname: 'android-sample', uptime: '2h1m', is_bypassing: true, bytes_downloaded: 812_000_000, bytes_uploaded: 40_000_000, bytes_total_mb: 812.5, has_queue: false, issue: 'Using internet with no payment' },
      { type: 'EXPIRED_CONNECTED', severity: 'HIGH', mac_address: mac(9), ip_address: '10.5.50.19', source: 'HOTSPOT', customer_id: 9, customer_name: 'Esther Moraa', customer_status: 'inactive', expiry: isoIn(-2 * H), plan_name: '1 day · 50', uptime: '25m', is_bypassing: false, bytes_downloaded: 12_000_000, bytes_uploaded: 1_000_000, bytes_total_mb: 12.4, has_queue: true, issue: 'Paid time ended but still connected' },
    ] },
  },
};
