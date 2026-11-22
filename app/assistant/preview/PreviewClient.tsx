'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Briefing, TranscriptItem } from '../../lib/assistant';
import { demoRouterUptime } from '../../lib/demoData';
import Composer from '../Composer';
import Home from '../Home';
import { BitwaveMark, MoonIcon, SunIcon } from '../icons';
import Transcript from '../Transcript';
import RatingAsk from '../RatingAsk';
import { Led } from '../ui';
import { BrandMark } from '../BrandMark';
import { AnswerAccess } from '../blocks/access';
import type { AuthUser } from '../../lib/types';

/* Made-up figures only: nothing here is a real reseller, customer or router. */

/** The account owner, who is offered every next step; and a staff member who may only view customers. */
const OWNER: Pick<AuthUser, 'role' | 'staff'> = { role: 'reseller', staff: null };
const VIEWER: Pick<AuthUser, 'role' | 'staff'> = { role: 'reseller', staff: { id: 9, name: 'Jo', email: 'jo@example.com', permissions: ['customers.view'] } };

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString().replace('Z', '');
const H = 3_600_000;
const D = 24 * H;

function briefing(): Briefing {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * D);
    const base = 5200 + Math.round(Math.sin(i / 2) * 1400) + i * 160;
    return { day: d.toISOString().slice(0, 10), revenue: i === 13 ? 3120 : base, payments: Math.round(base / 45), partial: i === 13 };
  });
  return {
    as_of: iso(0),
    audience: 'reseller',
    name: 'Sample Networks',
    currency: 'KES',
    money: { today: 3120, yesterday: 7480, last7: 49_870, prev7: 43_210, month: 168_400, payments_today: 71, daily: days },
    customers: {
      total: 612, active: 438, expiring_today: 14, expiring_3d: 52, expired_7d: 23, new_7d: 31,
      expiring: [
        { id: 1, name: 'Grace Wanjiku', phone: '0712 000 001', expiry: iso(2 * H), plan: '1 day · 50' },
        { id: 2, name: 'Brian Otieno', phone: '0712 000 002', expiry: iso(9 * H), plan: 'Weekly 300' },
        { id: 3, name: null, phone: '0712 000 003', expiry: iso(30 * H), plan: 'Monthly PPPoE 10M' },
        { id: 4, name: 'Faith Achieng', phone: '0712 000 004', expiry: iso(55 * H), plan: 'Weekly 300' },
      ],
    },
    routers: {
      total: 4, online: 3, offline: 1, unknown: 0,
      down: [{ id: 14, name: 'Kahawa West AP', last_online_at: iso(-3 * H) }],
      list: [
        { id: 14, name: 'Kahawa West AP', status: 'offline', last_online_at: iso(-3 * H), active_customers: 37, identity: 'KW-AP' },
        { id: 11, name: 'Main Tower', status: 'online', active_customers: 212, live: { cpu: 3, memory_pct: 48, uptime: '2w3d04:12:10', version: '7.14.3', board: 'RB4011', down_bps: 182_400_000, up_bps: 24_900_000, hotspot_online: 164, pppoe_online: 38 } },
        { id: 12, name: 'Zimmerman Block C', status: 'online', active_customers: 121, live: { cpu: 88, memory_pct: 71, uptime: '3d11:02:44', version: '7.12', board: 'hAP ac²', down_bps: 61_200_000, up_bps: 8_400_000, hotspot_online: 92, pppoe_online: 0 } },
        { id: 13, name: 'Githurai Shops', status: 'online', active_customers: 68, reachable_pct: 99.2, identity: 'GT-SHOPS' },
      ],
    },
    plans: [
      { name: 'Weekly 300', revenue: 21_600, sales: 72 },
      { name: '1 day · 50', revenue: 12_850, sales: 257 },
      { name: 'Monthly PPPoE 10M', revenue: 9_000, sales: 6 },
      { name: '3 hours · 20', revenue: 4_420, sales: 221 },
    ],
    attention: { failed_payments_24h: 2, unmatched_payments: 1, sms_credits: 34, subscription: { status: 'active', amount_due: 0 } },
    setup: { routers: 4, plans: 6, payment_methods: 1, customers: 612 },
    unavailable: [],
  };
}

function transcript(): TranscriptItem[] {
  const customers = [
    { id: 1, name: 'Grace Wanjiku', phone: '0712 000 001', status: 'active', expiry: iso(2 * H), plan: { name: '1 day · 50', speed: '5M/5M', price: 50 }, router: { id: 1, name: 'Main Tower' }, router_id: 1, mac_address: '3C:22:FB:10:00:01', grace_period_minutes: 60, wallet_credit_kes: 20 },
    { id: 2, name: 'Brian Otieno', phone: '0712 000 002', status: 'active', expiry: iso(4 * D), plan: { name: 'Weekly 300' }, router: { id: 2, name: 'Zimmerman Block C' }, router_id: 2, mac_address: '3C:22:FB:10:00:02' },
    { id: 5, name: 'Kevin Mutua', phone: '0712 000 005', status: 'expired', expiry: iso(-2 * D), plan: { name: 'Weekly 300' }, router: { id: 1, name: 'Main Tower' }, router_id: 1 },
    { id: 6, name: 'Mercy Njeri', phone: '0712 000 006', status: 'active', expiry: iso(19 * D), plan: { name: 'Monthly PPPoE 10M', connection_type: 'pppoe' }, router: { id: 1, name: 'Main Tower' }, router_id: 1, pppoe_username: 'mercy', account_number: 'BW1006' },
    { id: 7, name: 'Peter Kamau', phone: '0712 000 007', status: 'active', expiry: iso(9 * D), plan: { name: 'Monthly static 20M' }, router: { id: 1, name: 'Main Tower' }, router_id: 1, static_ip: '172.16.4.20' },
    { id: 8, name: 'Faith Achieng', phone: '0712 000 008', status: 'active', expiry: iso(5 * D), plan: { name: 'Weekly 300' }, router: { id: 1, name: 'Main Tower' }, router_id: 1, is_paused: true, paused_remaining_seconds: 3 * 86400 },
  ];
  return [
    { type: 'user', text: 'How did this week go, and is anything broken?' },
    { type: 'step', call_id: 's1', label: 'Read revenue for the last 14 days', done: true, ok: true },
    { type: 'step', call_id: 's2', label: 'Checked every router', done: true, ok: true },
    { type: 'step', call_id: 's3', label: 'Looked up customers on Kahawa West AP', done: true, ok: true },
    {
      type: 'assistant',
      text: 'A good week: **KES 49,870** came in over the last 7 days, **15% up** on the week before. One thing needs you: **Kahawa West AP** has been down for about 3 hours and **37 paying customers** on it are cut off.\n\n- Zimmerman Block C is busy: CPU at 88%.\n- 14 customers run out today.\n\nNEXT: Why is Kahawa West AP offline? | Remind the 14 who expire today | Which plan made the most this week?',
    },
    { type: 'data', call_id: 'd1', title: 'This week', method: 'GET', path: '/api/x', show: 'tiles', payload: { revenue: 49870, payments: 1104, new_customers: 31, avg_payment: 45.2 } },
    { type: 'data', call_id: 'h1', title: 'Health of Zimmerman Block C', method: 'GET', path: '/api/x', show: 'card', payload: { board_name: 'hAP ac²', version: '7.12', uptime: '3d11:02:44', cpu_load: 88, cpu_count: 4, free_memory: 37_748_736, total_memory: 134_217_728, free_hdd_space: 6_291_456, total_hdd_space: 16_777_216, hotspot_active: 92 } },
    { type: 'data', call_id: 'h2', title: 'Network right now', method: 'GET', path: '/api/x', show: 'tiles', payload: { uptime_pct: 99.2, avg_cpu: 47, online_now: 294, routers_online: 3 } },
    { type: 'data', call_id: 'd2', title: 'Revenue per day', method: 'GET', path: '/api/x', show: 'trend', payload: { days: briefing().money!.daily.map((d) => ({ date: d.day, revenue: d.revenue, partial: d.partial })) } },
    { type: 'data', call_id: 'd3', title: 'Revenue by plan', method: 'GET', path: '/api/x', show: 'bars', payload: { plans: [{ plan_name: 'Weekly 300', revenue: 21600, sales: 72 }, { plan_name: '1 day · 50', revenue: 12850, sales: 257 }, { plan_name: 'Monthly PPPoE 10M', revenue: 9000, sales: 6 }, { plan_name: '3 hours · 20', revenue: 4420, sales: 221 }] } },
    { type: 'data', call_id: 'd4', title: 'Payments by method', method: 'GET', path: '/api/x', show: 'share', payload: { methods: [{ method: 'M-Pesa till', amount: 38100 }, { method: 'Paybill', amount: 9200 }, { method: 'Voucher', amount: 2570 }] } },
    { type: 'data', call_id: 'd5', title: 'Your routers', method: 'GET', path: '/api/x', show: 'auto', payload: [
      { id: 14, name: 'Kahawa West AP', identity: 'KW-AP', ip_address: '10.0.0.14', status: 'offline', last_online_at: iso(-3 * H), availability_checks: 1000, availability_successes: 861 },
      { id: 11, name: 'Main Tower', identity: 'MAIN-TOWER', ip_address: '10.0.0.11', status: 'online', availability_checks: 1000, availability_successes: 998, status_last_checked_at: iso(-2 * 60_000) },
      // its status is three hours old: said as last known, not as a live green light
      { id: 15, name: 'Ruaka Rooftop', identity: 'RUAKA', ip_address: '10.0.0.15', status: 'online', status_is_stale: true, status_last_checked_at: iso(-3 * H), availability_checks: 1000, availability_successes: 990 },
    ] },
    { type: 'data', call_id: 'up1', title: 'Uptime of Main Tower', method: 'GET', path: '/api/routers/1/uptime', show: 'trend', payload: demoRouterUptime(1, 168) },
    { type: 'data', call_id: 'p1', title: 'What is on each port of Main Tower', method: 'GET', path: '/api/x', show: 'auto', payload: {
      warnings: [{ port: 'ether6', warnings: ['x'] }],
      infrastructure_candidates: Array.from({ length: 14 }, (_, i) => ({ port: 'ether9', mac: `AA:00:00:00:00:${10 + i}`, name: `RAP-${i}` })),
      ports: [
        { port: 'ether1', bridge: '', uplink: true, link: { up: true, rate: '1Gbps', link_downs: 43 }, health: { status: 'active', warnings: ['The link has dropped 43 times since the router started: check the cable and the power of what is plugged in (known issue router-offline-flapping)'] }, counts: { learned_macs: 0 }, revenue: { paying_customers: 0, today: 0 }, traffic: {}, infrastructure: [], downstream_devices_sample: [] },
        { port: 'ether2', bridge: 'bridge', link: { up: false }, health: { status: 'down', warnings: [] }, counts: {}, revenue: {}, traffic: {}, infrastructure: [], downstream_devices_sample: [] },
        { port: 'ether3', bridge: 'bridge', link: { up: false }, health: { status: 'down', warnings: [] }, counts: {}, revenue: {}, traffic: {}, infrastructure: [], downstream_devices_sample: [] },
        { port: 'ether6', bridge: 'bridge', link: { up: true, rate: '1Gbps', link_downs: 24 }, health: { status: 'active', warnings: ['The link has dropped 24 times since the router started: check the cable and the power of what is plugged in (known issue router-offline-flapping)'] }, counts: { learned_macs: 38, known_customers_connected: 21 }, revenue: { paying_customers: 26, today: 1300 }, traffic: {}, infrastructure: [{ mac: 'AA:01', name: 'RAP6262G-A51ACD', vendor: 'Ruijie', board: 'RAP6262G' }], downstream_devices_sample: [{ mac: 'C1', name: 'Grace Wanjiku', kind: 'known_customer' }, { mac: 'C2', name: 'Brian Otieno', kind: 'known_customer' }] },
        { port: 'ether8', bridge: 'bridge', link: { up: true, rate: '1Gbps', link_downs: 1 }, health: { status: 'active', warnings: [] }, counts: { learned_macs: 17, known_customers_connected: 9 }, revenue: { paying_customers: 12, today: 600 }, traffic: {}, infrastructure: [{ mac: 'AA:02', name: 'RAP6262G-38A987', vendor: 'Ruijie' }], downstream_devices_sample: [] },
        { port: 'ether9', bridge: 'bridge', link: { up: true, rate: '1Gbps', link_downs: 2 }, health: { status: 'active', warnings: ["3 access points or switches share this port (a chain): they share one cable's speed, and one of them in router mode hides every phone behind it (known issue ap-in-router-mode)", 'Ruijie looks like it is in router mode: phones behind it may get no login page, or all ride one paid login; set it to access point (bridge) mode with DHCP off (known issue ap-in-router-mode)'] }, counts: { learned_macs: 64, known_customers_connected: 30 }, revenue: { paying_customers: 41, today: 2050 }, traffic: { rx_error: 3 }, infrastructure: [{ mac: 'AA:03', name: 'RAP6262G-A51A35', vendor: 'Ruijie' }, { mac: 'AA:04', name: 'RAP62-OD-192485', vendor: 'Ruijie' }], downstream_devices_sample: [{ mac: 'AA:05', vendor: 'Ruijie', device_class: 'infrastructure', router_mode_suspect: true, ip: '10.44.77.254' }] },
        { port: 'ether10', bridge: 'bridge', link: { up: true, rate: '100Mbps', link_downs: 0 }, health: { status: 'silent_link', warnings: ['Link is up but the router has received 0 packets and learned no downstream MACs'] }, counts: { learned_macs: 0 }, revenue: {}, traffic: {}, infrastructure: [], downstream_devices_sample: [] },
        { port: 'sfp-sfpplus1', bridge: 'bridge', link: { up: false }, health: { status: 'down', warnings: [] }, counts: {}, revenue: {}, traffic: {}, infrastructure: [], downstream_devices_sample: [] },
      ],
    } },
    { type: 'data', call_id: 'd6', title: 'Customers on Main Tower', method: 'GET', path: '/api/x', show: 'auto', payload: { customers, total: 212 } },
    { type: 'data', call_id: 'u1', title: 'PPPoE logins on Main Tower', method: 'GET', path: '/api/x', show: 'auto', payload: { success: true, router_reachable: true, users: [
      { username: 'mercy', service: 'pppoe', profile: '10M', disabled: false, comment: 'CID:6|Mercy Njeri|2026-10-02', online: true, address: '10.20.0.14', uptime: '3d04:14:07', caller_id: 'D8:07:B6:11:22:33', upload_bytes: 1.9e9, download_bytes: 24.6e9, upload_rate: '1200000', download_rate: '8400000', max_limit: '10M/10M', session_count: 1, sessions: [{}], last_logged_out: '', last_disconnect_reason: '', last_caller_id: '', customer: { id: 6, name: 'Mercy Njeri', phone: '0712 000 006', status: 'active', plan: 'Monthly PPPoE 10M', expiry: iso(19 * D) } },
      { username: 'otieno.home', service: 'pppoe', profile: '5M', disabled: false, comment: 'CID:9|James Otieno|2026-09-14', online: false, address: null, uptime: null, caller_id: null, upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '5M/5M', session_count: 0, sessions: [], last_logged_out: '2026-11-21 06:12:40', last_disconnect_reason: 'peer-not-responding', last_caller_id: 'D8:07:B6:44:55:66', customer: { id: 9, name: 'James Otieno', phone: '0712 000 009', status: 'active', plan: 'Monthly PPPoE 5M', expiry: iso(11 * D) } },
      { username: 'shop12', service: 'pppoe', profile: '5M', disabled: true, comment: 'CID:12|Wanjiru Shop|2026-08-01', online: false, address: null, uptime: null, caller_id: null, upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '5M/5M', session_count: 0, sessions: [], last_logged_out: 'nov/02/2026 10:00:00', last_disconnect_reason: 'admin-reset', last_caller_id: '', customer: { id: 12, name: 'Wanjiru Shop', phone: '0712 000 012', status: 'expired', plan: 'Monthly PPPoE 5M', expiry: iso(-19 * D) } },
      { username: 'test1', service: 'pppoe', profile: 'default', disabled: false, comment: '', online: true, address: '10.20.0.99', uptime: '00:12:44', caller_id: 'AA:00', upload_bytes: 2e6, download_bytes: 9e6, upload_rate: '2000', download_rate: '6000', max_limit: '', session_count: 2, sessions: [{}, {}], last_logged_out: '', last_disconnect_reason: '', last_caller_id: '', customer: null },
    ], summary: { total: 4, online: 2, offline: 1, disabled: 1 } } },
    { type: 'data', call_id: 'u2', title: 'Hotspot devices on Main Tower', method: 'GET', path: '/api/x', show: 'auto', payload: { success: true, router_reachable: true, cached: true, cache_age_seconds: 1500, users: [
      { username: '3C:22:FB:10:00:01', mac_address: '3C:22:FB:10:00:01', profile: 'day', disabled: false, comment: '', online: true, online_source: 'active', address: '10.5.50.21', uptime: '5h12m3s', idle_time: '2s', login_by: 'mac-cookie', upload_bytes: 4.1e8, download_bytes: 3.2e9, upload_rate: '310000', download_rate: '4200000', max_limit: '5M/5M', binding_type: '', bypassed: false, authorized: true, has_queue: true, customer: { id: 1, name: 'Grace Wanjiku', phone: '0712 000 001', status: 'active', plan: '1 day · 50', expiry: iso(2 * H) } },
      { username: 'K7Q2M9', mac_address: '9A:11:2B:00:10:77', profile: 'day', disabled: false, comment: '', online: true, online_source: 'active', address: '10.5.50.40', uptime: '1h2m', idle_time: '14m', login_by: 'http-chap', upload_bytes: 2e6, download_bytes: 4e7, upload_rate: '0', download_rate: '400', max_limit: '5M/5M', binding_type: '', bypassed: false, authorized: true, has_queue: true, customer: null },
      { username: '', mac_address: 'F0:99:AA:01:02:03', profile: '', disabled: false, comment: 'office printer', online: true, online_source: 'host', address: '10.5.50.250', uptime: '9d2h', idle_time: '', login_by: '', upload_bytes: 1e6, download_bytes: 5e8, upload_rate: '9000', download_rate: '2100000', max_limit: '', binding_type: 'bypassed', bypassed: true, authorized: false, has_queue: false, customer: null },
      { username: '3C:22:FB:10:00:05', mac_address: '3C:22:FB:10:00:05', profile: 'week', disabled: false, comment: '', online: false, online_source: null, address: null, uptime: null, idle_time: null, login_by: '', upload_bytes: 0, download_bytes: 0, upload_rate: '0', download_rate: '0', max_limit: '', binding_type: '', bypassed: false, authorized: false, has_queue: false, customer: { id: 5, name: 'Kevin Mutua', phone: '0712 000 005', status: 'expired', plan: 'Weekly 300', expiry: iso(-2 * D) } },
    ], summary: { total: 4 } } },
    { type: 'data', call_id: 'd7', title: 'Grace Wanjiku', method: 'GET', path: '/api/x', show: 'auto', payload: customers[0] },
    // a PPPoE customer: the profile adds why they are offline, payments, Pay by M-Pesa and the week's use
    { type: 'data', call_id: 'd7b', title: 'Mercy Njeri', method: 'GET', path: '/api/x', show: 'auto', payload: {
      ...customers[3], id: 6, pay_by_mpesa: { paybill: '4159825', account_number: 'BW1006', amount: 1500, unavailable_reason: null }, payment_paybill: '4159825', has_paid: true, tier: 'customer' } },
    // the customers of a router that is down (South-B Relay in the demo data): a banner, not "offline"
    { type: 'data', call_id: 'd6b', title: 'Customers on South-B Relay', method: 'GET', path: '/api/x', show: 'auto', payload: { customers: [
      { id: 21, name: 'Achieng Odhiambo', phone: '0712 000 021', status: 'active', expiry: iso(3 * D), plan: { name: 'Weekly 300' }, router: { id: 3, name: 'South-B Relay' }, router_id: 3, mac_address: '3C:22:FB:10:00:21', has_paid: true, tier: 'customer' },
      { id: 22, name: 'Otieno Shop', phone: '0712 000 022', status: 'active', expiry: iso(12 * D), plan: { name: 'PPPoE Home', connection_type: 'pppoe' }, router: { id: 3, name: 'South-B Relay' }, router_id: 3, pppoe_username: 'otieno.shop', account_number: 'BW1022', has_paid: true, tier: 'customer' },
      { id: 23, name: 'Wanjiru K.', phone: '0712 000 023', status: 'expired', expiry: iso(-1 * D), plan: { name: 'Daily 50' }, router: { id: 3, name: 'South-B Relay' }, router_id: 3, mac_address: '3C:22:FB:10:00:23', has_paid: true, tier: 'customer' },
      { id: 24, name: '0712 000 024', phone: '0712 000 024', status: 'inactive', expiry: null, plan: null, router: { id: 3, name: 'South-B Relay' }, router_id: 3, mac_address: '3C:22:FB:10:00:24', has_paid: false, tier: 'visitor' },
      { id: 25, name: '0712 000 025', phone: '0712 000 025', status: 'inactive', expiry: null, plan: null, router: { id: 3, name: 'South-B Relay' }, router_id: 3, mac_address: '3C:22:FB:10:00:25', has_paid: false, tier: 'visitor' },
    ], total: 5 } },
    { type: 'data', call_id: 'd8', title: 'Payments today', method: 'GET', path: '/api/x', show: 'auto', payload: { transactions: [
      { id: 1, amount: 300, phone_number: '0712 000 002', customer_name: 'Brian Otieno', plan_name: 'Weekly 300', status: 'completed', mpesa_receipt_number: 'SKD1X2Y3Z4', transaction_date: iso(-1 * H), source: 'mpesa_stk' },
      { id: 2, amount: 50, phone_number: '0712 000 009', status: 'failed', result_desc: 'The customer cancelled the request', transaction_date: iso(-2 * H) },
      { id: 4, amount: 50, phone_number: '0712 000 011', customer_name: 'Faith Achieng', plan_name: '1 day · 50', status: 'completed', counts_as_revenue: false, source: 'voucher', transaction_date: iso(-3 * H) },
      { id: 5, amount: 300, phone_number: '0712 000 012', status: 'expired', transaction_date: iso(-4 * H) },
      { id: 3, amount: 1500, phone_number: '0712 000 006', customer_name: 'Mercy Njeri', plan_name: 'Monthly PPPoE 10M', status: 'completed', mpesa_receipt_number: 'SKD9A8B7C6', transaction_date: iso(-5 * H), source: 'c2b_paybill' },
    ], total: 71 } },
    // a total that is made of parts: stacked, with the takeaway said under the title
    { type: 'data', call_id: 't1', title: 'Data used per day', method: 'GET', path: '/api/x', show: 'trend', payload: { days: Array.from({ length: 14 }, (_, i) => {
      const down = Math.round(38_000 + Math.sin(i / 2) * 9_000 + i * 900);
      const up = Math.round(down * 0.18);
      return { date: new Date(Date.now() - (13 - i) * D).toISOString().slice(0, 10), total_mb: down + up, download_mb: down, upload_mb: up };
    }) } },
    // the same measure for the period before: drawn as a dashed line to compare against
    { type: 'data', call_id: 't2', title: 'Revenue this week against last week', method: 'GET', path: '/api/x', show: 'trend', payload: { days: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * D).toISOString().slice(0, 10), revenue: [5200, 6100, 4800, 7300, 6900, 8100, 3100][i], previous_revenue: [4800, 5300, 5100, 6000, 6200, 7000, 6600][i],
    })) } },
    { type: 'data', call_id: 'd9', title: 'Plans', method: 'GET', path: '/api/x', show: 'auto', payload: [
      { id: 1, name: 'Weekly 300', price: 300, duration_value: 7, duration_unit: 'days', speed: '5M/5M', connection_type: 'hotspot', badge_text: 'Popular' },
      { id: 2, name: 'Monthly PPPoE 10M', price: 1500, duration_value: 30, duration_unit: 'days', speed: '10M/10M', connection_type: 'pppoe' },
      { id: 3, name: '3 hours · 20', price: 20, duration_value: 3, duration_unit: 'hours', speed: '3M/3M', connection_type: 'hotspot' },
    ] },
    { type: 'data', call_id: 'd10', title: '6 one-day vouchers', method: 'GET', path: '/api/x', show: 'auto', payload: ['K7Q2M9', 'P3X8B1', 'H6N4T2', 'W9C5R7', 'D2L8F3', 'Z4V1J6'].map((code, i) => ({ code, batch_id: 9, status: i === 5 ? 'used' : 'active', redeemed_at: i === 5 ? iso(-H) : null, plan: { name: '1 day · 50', duration: '1 Day', price: 50 } })) },
    { type: 'data', call_id: 'd11', title: 'Failed payments', method: 'GET', path: '/api/x', show: 'table', payload: { rows: [{ date: iso(-2 * H), phone: '0712 000 009', amount: 50, reason: 'Cancelled by customer' }, { date: iso(-7 * H), phone: '0712 000 010', amount: 300, reason: 'Insufficient funds' }] } },
    { type: 'user', text: 'help me set up a pppoe package 10 mbs at ksh 2000 period 1 month package name Diamond' },
    { type: 'assistant', text: 'Here is the Diamond plan with what you told me filled in. Check it and tap Confirm.' },
    { type: 'action', action_id: 'f1', title: 'Create Plan', summary: 'New PPPoE plan: Diamond', method: 'POST', path: '/api/plans/create', status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      body: { name: 'Diamond', speed: '10M/10M', price: 2000, duration_value: 30, duration_unit: 'DAYS', connection_type: 'pppoe' },
      form: [
        { name: 'name', label: 'Name', kind: 'text', required: true, value: 'Diamond' },
        { name: 'speed', label: 'Speed', kind: 'text', required: true, value: '10M/10M' },
        { name: 'price', label: 'Price', kind: 'integer', required: true, value: 2000, minimum: 0 },
        { name: 'duration_value', label: 'Duration value', kind: 'integer', required: true, value: 30 },
        { name: 'duration_unit', label: 'Duration unit', kind: 'select', required: true, options: ['MINUTES', 'HOURS', 'DAYS'], value: 'DAYS' },
        { name: 'connection_type', label: 'Connection type', kind: 'select', required: true, options: ['hotspot', 'pppoe', 'static_ip'], value: 'pppoe' },
        { name: 'router_id', label: 'Router id', kind: 'select', required: false, options: ['1', '2'], option_labels: { 1: 'Main Tower', 2: 'Kahawa West AP' } },
        { name: 'max_devices', label: 'Max devices', kind: 'integer', required: false },
        { name: 'is_hidden', label: 'Is hidden', kind: 'boolean', required: false, value: false },
        { name: 'badge_text', label: 'Badge text', kind: 'text', required: false },
        { name: 'data_cap_mb', label: 'Data cap mb', kind: 'integer', required: false },
        { name: 'description', label: 'Description', kind: 'text', required: false, maxLength: 500 },
      ] },
    { type: 'user', text: 'Add Jo as staff, she should only see customers' },
    { type: 'action', action_id: 'f3', title: 'Update Portal Settings', summary: 'Change the hotspot login page', method: 'PUT', path: '/api/portal/settings', status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      form: [
        { name: 'header_style', label: 'Header style', kind: 'select', required: false, options: ['compact', 'hero', 'minimal', 'standard'], value: 'hero' },
        { name: 'header_bg_image_url', label: 'Header photo', kind: 'text', required: false, upload: { accept: 'image/*' }, presets: [{ label: 'City', value: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=750&h=370&fit=crop&q=80' }, { label: 'People', value: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=750&h=370&fit=crop&q=80' }, { label: 'Nature', value: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80' }, { label: 'Café', value: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=750&h=370&fit=crop&q=80' }, { label: 'Tech', value: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=750&h=370&fit=crop&q=80' }], value: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=750&h=370&fit=crop&q=80', when: { header_style: ['hero'] } },
        { name: 'company_logo_url', label: 'Logo', kind: 'text', required: false, upload: { accept: 'image/*' }, when: { header_style: ['hero'] } },
        { name: 'color_theme', label: 'Colours', kind: 'select', required: false, options: ['bright_violet', 'cherry_red', 'emerald_green', 'ocean_blue', 'rose_gold', 'royal_blue', 'slate_gray', 'sunset_orange', 'teal_lagoon'], value: 'slate_gray' },
      ] },
    { type: 'action', action_id: 'r1', title: 'Router setup code', summary: 'Set up a new router (RouterOS 7)', method: 'POST', path: '/api/provision/create', status: 'pending', body: {} },
    { type: 'action_result', action_id: 'r1', status: 'done', ok: true,
      payload: { token: 'demo-setup-1', command: '/tool fetch url="https://isp.bitwavetechnologies.net/api/provision/demo-setup-1/script" dst-path=provision.rsc; :delay 2s; /import provision.rsc;', vpn_type: 'wireguard', ssid: 'Kwetu WiFi', router_name: 'Router-0412', created_at: new Date(Date.now() - 6 * 60_000).toISOString(), expires_in_hours: 24 } },
    { type: 'action', action_id: 'm1', title: 'Purchase Credits', summary: 'Buy 500 SMS (KES 250)', method: 'POST', path: '/api/messaging/credits/purchase', status: 'pending', body: { quantity: 500, phone_number: '0712345678' } },
    { type: 'action_result', action_id: 'm1', status: 'done', ok: true, awaiting: { kind: 'mpesa', poll: '/api/messaging/credits/orders/0', message: 'Check the phone 254712345678: enter your M-Pesa PIN to pay.' } },
    { type: 'action', action_id: 'm2', title: 'Pay subscription', summary: 'Pay your Bitwave subscription (KES 500)', method: 'POST', path: '/api/subscription/pay', status: 'pending', body: { amount: 500 } },
    { type: 'action_result', action_id: 'm2', status: 'done', ok: true, awaiting: { kind: 'mpesa', poll: '/api/subscription/payments/1', message: 'Check the phone 254712345678: enter your M-Pesa PIN to pay.' } },
    { type: 'action', action_id: 'w1', title: 'Withdraw', summary: 'Withdraw KES 171 to My Bank Account (paybill 247247): net KES 166 after KES 5 fee', method: 'POST', path: '/api/reseller/withdraw', status: 'pending', body: {} },
    { type: 'action_result', action_id: 'w1', status: 'done', ok: true, awaiting: { kind: 'payout', poll: '/api/reseller/withdrawals/7833/status', message: 'Sending KES 166 to My Bank Account. This updates when M-Pesa confirms it arrived.' } },
    { type: 'action', action_id: 'c1', title: 'Register Customer', summary: 'Register a new hotspot customer', method: 'POST', path: '/api/customers/register', status: 'pending',
      form: [
        { name: 'name', label: 'Name', kind: 'text', required: true },
        { name: 'phone', label: 'Phone', kind: 'text', required: true },
        { name: 'latitude', label: 'Latitude', kind: 'number', required: false, geo: 'lat' },
        { name: 'longitude', label: 'Longitude', kind: 'number', required: false, geo: 'lng' },
        { name: 'notes', label: 'Notes', kind: 'text', required: false },
        { name: 'email', label: 'Email', kind: 'text', required: false },
        { name: 'building', label: 'Building', kind: 'text', required: false },
      ] },
    { type: 'action', action_id: 'f2', title: 'Create Staff', summary: 'New staff login: Jo', method: 'POST', path: '/api/staff', status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      body: { name: 'Jo', permissions: ['customers.view'] },
      form: [
        { name: 'name', label: 'Name', kind: 'text', required: true, value: 'Jo' },
        { name: 'email', label: 'Email', kind: 'text', required: true },
        { name: 'password', label: 'Password', kind: 'password', required: true },
        { name: 'permissions', label: 'Permissions', kind: 'list', item_kind: 'text', required: false, value: ['customers.view'],
          options: ['customers.view', 'customers.manage', 'payments.view', 'plans.manage', 'routers.view', 'vouchers.manage'] },
      ] },
    // deeper forms: a router's live ports to tick, a preview before apply, an SMS with its count, Do it anyway
    { type: 'action', action_id: 'p1', title: 'Set PPPoE Ports', summary: 'PPPoE on ether3 at Main Tower', method: 'PUT', path: '/api/routers/1/pppoe-ports', status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      body: { add: ['ether3'] },
      form: [
        { name: 'ports', label: 'Ports', kind: 'list', item_kind: 'text', required: false, value: ['ether2', 'ether3'], baseline: ['ether2'], changes: { add: 'add', remove: 'remove' },
          options: ['ether2', 'ether3', 'ether4', 'ether5'], option_labels: { ether2: 'ether2 · PPPoE', ether3: 'ether3 · Hotspot', ether4: 'ether4 · Hotspot · no cable', ether5: 'ether5 · Not in use' } },
      ] },
    { type: 'action', action_id: 'o1', title: 'Apply Outage', summary: 'Credit customers for this morning’s outage', method: 'POST', path: '/api/compensation/outage', status: 'pending', previews: true, expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      form: [
        { name: 'outage_start', label: 'Outage start', kind: 'datetime', required: true, value: '2026-11-21T08:00', zone: 'EAT' },
        { name: 'outage_end', label: 'Outage end', kind: 'datetime', required: true, value: '2026-11-21T10:30', zone: 'EAT' },
        { name: 'router_ids', label: 'Router ids', kind: 'list', item_kind: 'integer', required: false, value: ['1'], options: ['1', '2'], option_labels: { 1: 'Main Tower', 2: 'Zimmerman Block C' } },
        { name: 'exclude_customer_ids', label: 'Exclude customer ids', kind: 'list', item_kind: 'integer', required: false, value: [], options: [], option_labels: {}, pick: { from: '/api/customers', search: 'search', label: '{name} · {phone}' } },
        { name: 'note', label: 'Note', kind: 'text', required: false, multiline: true, maxLength: 500 },
      ] },
    { type: 'action_result', action_id: 'o1', status: 'pending', ok: true, preview_of: 'abc', preview: { customers: [{ name: 'Grace Wanjiku', phone: '0712 000 001', credit_minutes: 150 }, { name: 'Brian Otieno', phone: '0712 000 002', credit_minutes: 150 }], total_customers: 2 } },
    { type: 'action', action_id: 's1', title: 'Send SMS', summary: 'Remind Grace her time ends today', method: 'POST', path: '/api/messaging/send', status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString(),
      form: [
        { name: 'body', label: 'Body', kind: 'text', required: true, multiline: true, sms: true, maxLength: 1000, value: 'Hi Grace, your internet ends today at 6pm. Pay 50 to 123456 to keep browsing 😊' },
        { name: 'customer_ids', label: 'Customer ids', kind: 'list', item_kind: 'integer', required: false, value: ['1'], options: ['1'], option_labels: { 1: 'Grace Wanjiku · 0712 000 001' }, pick: { from: '/api/customers', search: 'search', label: '{name} · {phone}' } },
      ] },
    { type: 'action', action_id: 'r1', title: 'Activate PPPoE Customer', summary: 'Activate Mercy', method: 'POST', path: '/api/customers/6/activate-pppoe', status: 'pending', sensitive: true, retry_of: 'x', reason: 'Mercy is already active until 12 Dec and paid 2 minutes ago. Recording another payment would renew her twice.',
      body: { payment_method: 'cash', force: true }, expires_at: new Date(Date.now() + 20 * 60_000).toISOString() },
    { type: 'action', action_id: 'a1', title: 'send_sms', summary: 'Send an expiry reminder SMS to 14 customers who run out today', method: 'POST', path: '/api/sms/bulk', body: { recipients: 14, template: 'expiry_reminder' }, status: 'pending', expires_at: new Date(Date.now() + 20 * 60_000).toISOString() },
  ];
}

/** Drawn in the browser only: it reads the address (?view, ?theme) as it starts. */
export default function PreviewClient() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return mounted ? <Preview /> : null;
}

function Preview() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark'));
  const [view, setView] = useState<'home' | 'chat' | 'brand'>(() => {
    const v = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
    return v === 'chat' || v === 'brand' ? v : 'home';
  });
  const [b] = useState(briefing);
  const [items] = useState(transcript);
  const [staffItems] = useState<TranscriptItem[]>(() => [
    { type: 'user', text: 'Show me the customers on Main Tower and our plans' },
    ...items.filter((it) => it.type === 'data' && ['d6', 'd7', 'd9', 'd5'].includes(it.call_id)),
  ]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const noop = () => {};

  return (
    <div className="ai-root ai-frame fixed inset-x-0 top-0 z-[60] flex h-dvh flex-col overflow-hidden">
      <header className="z-30 shrink-0 border-b border-line bg-[color:var(--ai-bg)]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-3 sm:px-6">
          <BitwaveMark />
          <span className="ai-display text-[16.5px] font-semibold text-ink-1 max-[380px]:hidden">Bitwave</span>
          <span className="ai-mono rounded-[6px] border border-accent/35 bg-accent-soft px-1.5 py-[1px] text-[11px] font-medium tracking-[0.12em] text-accent">AI</span>
          <span className="ai-mono ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-1 text-[11px] text-ink-2 max-sm:hidden"><Led tone="live" pulse size={6} />Preview</span>
          <span className="ml-auto sm:hidden" />
          <div className="flex rounded-full border border-line p-0.5 text-[12px]">
            {(['home', 'chat', 'brand'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`ai-tap rounded-full px-3 py-1 ${view === v ? 'bg-surface-3 text-ink-1' : 'text-ink-3'}`}>{v}</button>
            ))}
          </div>
          <button type="button" className="ai-btn ai-btn-quiet" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Theme">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'brand' ? (
          <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6">
            <p className="ai-eyebrow">The logo, at every size</p>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              {[16, 24, 32, 48, 96, 160].map((s) => <div key={s} className="flex flex-col items-center gap-2"><BrandMark size={s} /><span className="ai-mono text-[11px] text-ink-3">{s}</span></div>)}
            </div>
            <p className="ai-eyebrow mt-10">Working (the assistant is answering)</p>
            <div className="mt-4 flex items-center gap-4"><BrandMark size={26} live /><span className="text-[13px] text-ink-2">Checking your routers…</span></div>
            <p className="ai-eyebrow mt-10">With the name</p>
            <div className="mt-4 flex items-center gap-2.5"><BrandMark size={30} /><span className="ai-display text-[19px] font-semibold text-ink-1">Bitwave</span></div>
          </div>
        ) : view === 'home' ? (
          <Home userKey="preview" name={null} organization="Sample Networks" admin={false} readOnly={false} enabled onAsk={() => setView('chat')} preview={{ briefing: b }} />
        ) : (
          <div className="mx-auto flex w-full max-w-[880px] flex-col px-4 sm:px-6">
            <AnswerAccess user={OWNER}>
              <Transcript items={items} currency="KES" onAsk={noop} onDecide={noop} />
            </AnswerAccess>
            {/* the same answers for a staff member who may only view customers: no chip they could not use */}
            <p className="ai-eyebrow mt-10" id="view-only">As a staff member who may only view customers</p>
            <AnswerAccess user={VIEWER}>
              <Transcript items={staffItems} currency="KES" onAsk={noop} onDecide={noop} />
            </AnswerAccess>
            <RatingAsk mode="ask" onClose={noop} />
            <RatingAsk mode="open" onClose={noop} />
          </div>
        )}
      </div>
      <Composer busy={false} placeholder="Ask, or tell me what to do…" onSend={noop} />
    </div>
  );
}
