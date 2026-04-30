import type {
  DashboardAnalytics,
  DashboardOverview,
  MikroTikMetrics,
  BandwidthHistory,
  TopUsersResponse,
  Customer,
  Plan,
  MpesaTransaction,
  TransactionSummary,
  Router,
  RouterUptimeResponse,
  RouterUsersResponse,
  Advertiser,
  Ad,
  AdsResponse,
  AdClicksResponse,
  AdImpressionsResponse,
  AdAnalytics,
  Rating,
  RatingSummary,
  CustomerMapData,
  Voucher,
  VoucherStats,
  VouchersListResponse,
  PlanPerformanceResponse,
  PPPoEOverviewResponse,
  PPPoELogsResponse,
  PPPoESecretsResponse,
  PPPoEActiveResponse,
  HotspotOverviewResponse,
  HotspotLogsResponse,
  PortStatusResponse,
  WalledGardenResponse,
  RouterInterfacesResponse,
  PPPoECredentials,
  ProvisionToken,
  AdminDashboard,
  AdminResellersParams,
  AdminResellersResponse,
  AdminResellerDetail,
  AdminPaymentsResponse,
  AdminRoutersResponse,
  AdminPayoutsResponse,
  AdminResellerStats,
  AdminResellerStatsPeriod,
  ResellerRevenueDataPoint,
  ResellerSignupDataPoint,
  LeadSource,
  Lead,
  LeadActivity,
  LeadFollowUp,
  LeadDetail,
  LeadPipelineSummary,
  LeadPipelineStats,
  LeadsListResponse,
  ActivitiesResponse,
  FollowUpsResponse,
  UpcomingFollowUp,
  LeadStage,
  LeadBackfillRequest,
  LeadBackfillResponse,
  LeadBackfillItem,
  ShopProduct,
  ShopOrder,
  ShopDashboard,
  ShopAnalytics,
} from './types';

const now = new Date();
const iso = (daysAgo = 0, hoursAgo = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
};
const dateStr = (daysAgo = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// ─── Routers ────────────────────────────────────────────────────────
export const demoRouters: Router[] = [
  {
    id: 1, name: 'Kilimani Tower', identity: 'MikroTik-Kilimani', ip_address: '41.89.12.101', port: 8728,
    auth_method: 'DIRECT_API', payment_methods: ['mpesa', 'voucher'], pppoe_ports: ['ether2', 'ether3'],
    status: 'online', status_is_stale: false, status_age_seconds: 45, status_last_checked_at: iso(0, 0),
    last_online_at: iso(0, 0), status_source: 'health_check', availability_checks: 2880, availability_successes: 2874,
    emergency_active: false, emergency_message: null,
  },
  {
    id: 2, name: 'Westlands Hub', identity: 'MikroTik-Westlands', ip_address: '41.89.12.102', port: 8728,
    auth_method: 'DIRECT_API', payment_methods: ['mpesa'], pppoe_ports: ['ether2'],
    status: 'online', status_is_stale: false, status_age_seconds: 30, status_last_checked_at: iso(0, 0),
    last_online_at: iso(0, 0), status_source: 'health_check', availability_checks: 2880, availability_successes: 2860,
    emergency_active: false, emergency_message: null,
  },
  {
    id: 3, name: 'South-B Relay', identity: 'MikroTik-SouthB', ip_address: '41.89.12.103', port: 8728,
    auth_method: 'RADIUS', payment_methods: ['mpesa', 'voucher'], pppoe_ports: ['ether2', 'ether3', 'ether4'],
    status: 'offline', status_is_stale: false, status_age_seconds: 120, status_last_checked_at: iso(0, 0),
    last_online_at: iso(0, 2), status_source: 'health_check', availability_checks: 2880, availability_successes: 2700,
    emergency_active: false, emergency_message: null,
  },
];

// ─── Plans ──────────────────────────────────────────────────────────
export const demoPlans: Plan[] = [
  { id: 1, name: 'Daily Lite', price: 50, duration_value: 24, duration_unit: 'HOURS', download_speed: '5', upload_speed: '2', speed: '5M/2M', connection_type: 'hotspot', plan_type: 'regular', is_hidden: false, created_at: iso(60) },
  { id: 2, name: 'Daily Fast', price: 100, duration_value: 24, duration_unit: 'HOURS', download_speed: '10', upload_speed: '5', speed: '10M/5M', connection_type: 'hotspot', plan_type: 'regular', is_hidden: false, created_at: iso(60) },
  { id: 3, name: 'Weekly Standard', price: 500, duration_value: 7, duration_unit: 'DAYS', download_speed: '10', upload_speed: '5', speed: '10M/5M', connection_type: 'hotspot', plan_type: 'regular', is_hidden: false, created_at: iso(55) },
  { id: 4, name: 'Monthly Unlimited', price: 2500, duration_value: 30, duration_unit: 'DAYS', download_speed: '15', upload_speed: '10', speed: '15M/10M', connection_type: 'hotspot', plan_type: 'regular', is_hidden: false, created_at: iso(50) },
  { id: 5, name: 'PPPoE Home', price: 3000, duration_value: 30, duration_unit: 'DAYS', download_speed: '20', upload_speed: '10', speed: '20M/10M', connection_type: 'pppoe', router_profile: 'pppoe-home', plan_type: 'regular', is_hidden: false, created_at: iso(45) },
  { id: 6, name: 'PPPoE Business', price: 5000, duration_value: 30, duration_unit: 'DAYS', download_speed: '50', upload_speed: '25', speed: '50M/25M', connection_type: 'pppoe', router_profile: 'pppoe-biz', plan_type: 'regular', is_hidden: false, created_at: iso(40) },
  { id: 7, name: 'Weekend Pass', price: 150, duration_value: 48, duration_unit: 'HOURS', download_speed: '10', upload_speed: '5', speed: '10M/5M', connection_type: 'hotspot', plan_type: 'regular', is_hidden: false, created_at: iso(30), badge_text: 'Popular', original_price: 200 },
  { id: 8, name: 'Emergency 2hr', price: 20, duration_value: 2, duration_unit: 'HOURS', download_speed: '3', upload_speed: '1', speed: '3M/1M', connection_type: 'hotspot', plan_type: 'emergency', is_hidden: false, created_at: iso(20) },
];

// ─── Customers ──────────────────────────────────────────────────────
const names = ['John Kamau', 'Grace Wanjiku', 'Peter Ochieng', 'Mary Akinyi', 'James Mwangi', 'Faith Njeri', 'David Otieno', 'Susan Wambui', 'Kevin Kiprop', 'Alice Chebet', 'Samuel Mutua', 'Esther Muthoni', 'Brian Kiptoo', 'Janet Nyambura', 'Moses Ouma'];
const phones = ['254712345678', '254723456789', '254734567890', '254745678901', '254756789012', '254767890123', '254778901234', '254789012345', '254790123456', '254701234567', '254711223344', '254722334455', '254733445566', '254744556677', '254755667788'];
const macs = ['AA:BB:CC:11:22:33', 'DD:EE:FF:44:55:66', '11:22:33:AA:BB:CC', '44:55:66:DD:EE:FF', '77:88:99:00:11:22', 'AA:11:BB:22:CC:33', 'DD:44:EE:55:FF:66', '11:77:22:88:33:99', '44:00:55:11:66:22', '77:33:88:44:99:55', 'AA:DD:BB:EE:CC:FF', '11:44:22:55:33:66', '77:AA:88:BB:99:CC', '00:DD:11:EE:22:FF', '33:44:55:66:77:88'];

export const demoCustomers: Customer[] = names.map((name, i) => {
  const statuses: ('active' | 'inactive' | 'expired')[] = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'inactive', 'expired', 'active', 'active', 'inactive', 'expired'];
  const planIdx = [3, 4, 0, 1, 5, 2, 4, 3, 6, 0, 1, 5, 2, 3, 0];
  const routerIdx = [0, 0, 0, 1, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0];
  const plan = demoPlans[planIdx[i]];
  const router = demoRouters[routerIdx[i]];
  const isPPPoE = plan.connection_type === 'pppoe';
  return {
    id: i + 1, name, phone: phones[i], mac_address: macs[i],
    status: statuses[i],
    expiry: statuses[i] === 'expired' ? iso(2) : iso(-Math.floor(Math.random() * 20 + 1)),
    hours_remaining: statuses[i] === 'active' ? Math.floor(Math.random() * 500 + 24) : 0,
    plan: { id: plan.id, name: plan.name, price: plan.price, connection_type: isPPPoE ? 'pppoe' : 'hotspot' },
    router: { id: router.id, name: router.name },
    connection_type: isPPPoE ? 'pppoe' : 'hotspot',
    ...(isPPPoE ? { pppoe_username: `pppoe-${name.split(' ')[0].toLowerCase()}` } : {}),
  };
});

// ─── Transactions ───────────────────────────────────────────────────
export const demoTransactions: MpesaTransaction[] = Array.from({ length: 25 }, (_, i) => {
  const cust = demoCustomers[i % demoCustomers.length];
  const plan = demoPlans[i % demoPlans.length];
  const router = demoRouters[i % demoRouters.length];
  const statuses: ('completed' | 'pending' | 'failed' | 'expired')[] = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'pending', 'pending', 'failed', 'failed', 'completed', 'completed', 'expired', 'completed'];
  const methods: ('mobile_money' | 'cash')[] = ['mobile_money', 'mobile_money', 'mobile_money', 'cash', 'mobile_money', 'mobile_money', 'cash', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'cash', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'mobile_money', 'cash', 'mobile_money', 'mobile_money', 'mobile_money'];
  const status = statuses[i];
  const receipt = status === 'completed' ? `SJ${String(7000 + i).padStart(6, '0')}KT` : null;
  return {
    transaction_id: 5000 + i,
    checkout_request_id: `ws_CO_${dateStr(i % 7).replace(/-/g, '')}${String(i).padStart(8, '0')}`,
    phone_number: cust.phone,
    amount: plan.price,
    reference: `TX-${1000 + i}`,
    lipay_tx_no: `LP${String(2000 + i)}`,
    status,
    payment_method: methods[i],
    payment_reference: receipt,
    mpesa_receipt_number: receipt,
    transaction_date: iso(i % 7, i % 12),
    created_at: iso(i % 7, i % 12),
    failure_source: status === 'failed' ? 'timeout' : null,
    result_code: status === 'completed' ? '0' : status === 'failed' ? '1032' : null,
    result_desc: status === 'completed' ? 'Success' : status === 'failed' ? 'Request cancelled by user' : null,
    customer: { id: cust.id, name: cust.name, phone: cust.phone, mac_address: cust.mac_address, status: cust.status },
    router: { id: router.id, name: router.name, ip_address: router.ip_address, auth_method: router.auth_method as 'DIRECT_API' | 'RADIUS' },
    plan: { id: plan.id, name: plan.name, price: plan.price, duration_value: plan.duration_value, duration_unit: plan.duration_unit, connection_type: (plan.connection_type as 'hotspot' | 'pppoe') ?? null },
    manual_provision_supported: status === 'completed',
    manual_provision_reason: null,
  };
});

export const demoTransactionSummary: TransactionSummary = {
  total_transactions: 25,
  total_amount: demoTransactions.reduce((s, t) => s + t.amount, 0),
  status_breakdown: {
    completed: { count: 19, amount: 38500 },
    pending: { count: 2, amount: 600 },
    failed: { count: 2, amount: 200 },
    expired: { count: 1, amount: 500 },
  },
  method_breakdown: {
    mobile_money: { count: 20, amount: 35000 },
    cash: { count: 4, amount: 4800 },
  },
  router_breakdown: {
    'Kilimani Tower': { count: 12, amount: 18500, router_id: 1 },
    'Westlands Hub': { count: 8, amount: 14000, router_id: 2 },
    'South-B Relay': { count: 5, amount: 7300, router_id: 3 },
  },
  period: { start_date: dateStr(7), end_date: dateStr(0) },
};

// ─── Dashboard Analytics ────────────────────────────────────────────
function buildHourlyCumulative(): import('./types').HourlyCumulative[] {
  let cumRev = 0, cumTx = 0;
  return Array.from({ length: 24 }, (_, h) => {
    const tx = h >= 6 && h <= 22 ? Math.floor(Math.random() * 8 + 2) : Math.floor(Math.random() * 2);
    const rev = tx * (Math.random() * 200 + 50);
    cumRev += rev; cumTx += tx;
    return { hour: h, hourLabel: `${String(h).padStart(2, '0')}:00`, revenue: Math.round(rev), transactions: tx, cumulativeRevenue: Math.round(cumRev), cumulativeTransactions: cumTx };
  });
}

export const demoDashboardAnalytics: DashboardAnalytics = {
  extractedAt: iso(),
  periodDays: 7,
  summary: { totalTransactions: 187, totalRevenue: 142500, totalUniqueUsers: 68, uniqueCustomers: 68, avgRevenuePerDay: 20357, avgTransactionsPerDay: 27 },
  today: { date: dateStr(0), revenue: 18200, transactions: 24, hourlyCumulative: buildHourlyCumulative() },
  averages: { dailyRevenue: 20357, dailyTransactions: 27, transactionValue: 762, revenuePerCustomer: 2096, downloadSpeedMbps: 12.5, uploadSpeedMbps: 6.3 },
  activeCustomers: 48,
  dailyTrend: Array.from({ length: 7 }, (_, i) => {
    const d = 6 - i;
    return { date: dateStr(d), label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], transactions: Math.floor(Math.random() * 15 + 18), revenue: Math.floor(Math.random() * 8000 + 16000), users: Math.floor(Math.random() * 15 + 8) };
  }),
  hourlyPattern: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    transactions: h >= 6 && h <= 22 ? Math.floor(Math.random() * 10 + 3) : Math.floor(Math.random() * 3),
    revenue: h >= 6 && h <= 22 ? Math.floor(Math.random() * 3000 + 500) : Math.floor(Math.random() * 300),
  })),
  planPerformance: [
    { name: 'Daily Lite', count: 45, revenue: 2250, color: '#f59e0b' },
    { name: 'Daily Fast', count: 38, revenue: 3800, color: '#3b82f6' },
    { name: 'Weekly Standard', count: 32, revenue: 16000, color: '#10b981' },
    { name: 'Monthly Unlimited', count: 28, revenue: 70000, color: '#8b5cf6' },
    { name: 'PPPoE Home', count: 22, revenue: 66000, color: '#ef4444' },
    { name: 'PPPoE Business', count: 12, revenue: 60000, color: '#06b6d4' },
    { name: 'Weekend Pass', count: 18, revenue: 2700, color: '#f97316' },
  ],
  days: {},
};

export const demoDashboardOverview: DashboardOverview = {
  revenue: { today: 18200, this_week: 142500, this_month: 485000, all_time: 3250000 },
  customers: { total: 68, active: 48, inactive: 20 },
  revenue_by_router: [
    { router_id: 1, router_name: 'Kilimani Tower', transaction_count: 95, revenue: 72000 },
    { router_id: 2, router_name: 'Westlands Hub', transaction_count: 62, revenue: 48000 },
    { router_id: 3, router_name: 'South-B Relay', transaction_count: 30, revenue: 22500 },
  ],
  revenue_by_plan: demoPlans.slice(0, 6).map(p => ({
    plan_id: p.id, plan_name: p.name, plan_price: p.price,
    sales_count: Math.floor(Math.random() * 30 + 10), revenue: p.price * Math.floor(Math.random() * 30 + 10),
  })),
  recent_transactions: demoTransactions.slice(0, 5).map(t => ({
    payment_id: t.transaction_id, amount: t.amount, customer_name: t.customer.name,
    customer_phone: t.phone_number, plan_name: t.plan.name, payment_date: t.transaction_date ?? t.created_at,
    payment_method: t.payment_method,
  })),
  expiring_soon: demoCustomers.filter(c => c.status === 'active').slice(0, 5).map(c => ({
    id: c.id, name: c.name, phone: c.phone, expiry: c.expiry, plan_name: c.plan.name,
  })),
  generated_at: iso(),
};

// ─── MikroTik Metrics ───────────────────────────────────────────────
export const demoMikroTikMetrics: MikroTikMetrics = {
  system: { uptime: '14d 07:32:18', version: '7.14.3', platform: 'MikroTik', boardName: 'RB4011iGS+', architecture: 'arm', cpu: 'ARM', cpuCount: 4, cpuFrequencyMhz: 1400 },
  cpuLoadPercent: 23,
  memory: { totalBytes: 1073741824, freeBytes: 644245094, usedBytes: 429496730, usedPercent: 40 },
  storage: { totalBytes: 536870912, freeBytes: 375809638, usedBytes: 161061274, usedPercent: 30 },
  healthSensors: { temperature: 47, voltage: 24.1, fan_speed: 'N/A' },
  activeSessions: Array.from({ length: 8 }, (_, i) => ({
    user: demoCustomers[i].name, address: `10.10.${i + 1}.${Math.floor(Math.random() * 250 + 2)}`,
    uptime: `${Math.floor(Math.random() * 12)}h ${Math.floor(Math.random() * 59)}m`,
    bytesIn: Math.floor(Math.random() * 500000000), bytesOut: Math.floor(Math.random() * 2000000000),
  })),
  activeSessionCount: 42,
  activeHotspotUsers: 42,
  activePppoeSessions: Array.from({ length: 5 }, (_, i) => ({
    user: demoCustomers[(i + 8) % demoCustomers.length].name.toLowerCase().replace(/\s+/g, '_'),
    address: `10.20.${i + 1}.${Math.floor(Math.random() * 250 + 2)}`,
    uptime: `${Math.floor(Math.random() * 6 + 1)}d ${Math.floor(Math.random() * 23)}h`,
    service: 'pppoe',
    callerId: `AA:BB:CC:${(i + 10).toString(16).padStart(2, '0').toUpperCase()}:${(i + 20).toString(16).padStart(2, '0').toUpperCase()}:${(i + 30).toString(16).padStart(2, '0').toUpperCase()}`,
    sessionId: `0x8100001${i}`,
  })),
  activePppoeCount: 17,
  activePppoeUsers: 17,
  activeTotalUsers: 59,
  sessionsTruncated: false,
  interfaces: [
    { name: 'ether1-WAN', type: 'ether', running: true, disabled: false, rx_byte: 85000000000, tx_byte: 12000000000, rx_packet: 65000000, tx_packet: 9800000, rx_error: 0, tx_error: 0 },
    { name: 'ether2-LAN', type: 'ether', running: true, disabled: false, rx_byte: 11000000000, tx_byte: 78000000000, rx_packet: 8500000, tx_packet: 60000000, rx_error: 2, tx_error: 0 },
    { name: 'ether3-PPPoE', type: 'ether', running: true, disabled: false, rx_byte: 5000000000, tx_byte: 35000000000, rx_packet: 4000000, tx_packet: 28000000, rx_error: 0, tx_error: 0 },
    { name: 'wlan1', type: 'wlan', running: true, disabled: false, rx_byte: 2000000000, tx_byte: 18000000000, rx_packet: 1500000, tx_packet: 14000000, rx_error: 5, tx_error: 1 },
  ],
  generatedAt: iso(),
  uptime: '14d 07:32:18',
  routerId: 1,
  routerName: 'Kilimani Tower',
  bandwidth: { downloadMbps: 45.2, uploadMbps: 12.8 },
  snapshotAgeSeconds: 15,
  cached: false,
  cacheAgeSeconds: 0,
};

// ─── Bandwidth History ──────────────────────────────────────────────
export const demoBandwidthHistory: BandwidthHistory = {
  history: Array.from({ length: 48 }, (_, i) => {
    const t = new Date(now);
    t.setMinutes(t.getMinutes() - (47 - i) * 30);
    const hour = t.getHours();
    const isPeak = hour >= 18 && hour <= 23;
    const base = isPeak ? 35 : hour >= 8 && hour <= 17 ? 20 : 5;
    return {
      timestamp: t.toISOString(),
      totalDownloadMbps: base + Math.random() * 15,
      totalUploadMbps: (base + Math.random() * 15) * 0.3,
      avgDownloadMbps: base * 0.8 + Math.random() * 10,
      avgUploadMbps: (base * 0.8 + Math.random() * 10) * 0.3,
      activeQueues: Math.floor(Math.random() * 20 + 15),
      activeSessions: Math.floor(Math.random() * 15 + 25),
    };
  }),
  count: 48,
  periodHours: 24,
  generatedAt: iso(),
};

// ─── Top Users ──────────────────────────────────────────────────────
export const demoTopUsers: TopUsersResponse = {
  topUsers: demoCustomers.filter(c => c.status === 'active').slice(0, 10).map((c, i) => {
    const dlGB = parseFloat((Math.random() * 15 + 1).toFixed(2));
    const ulMB = Math.floor(Math.random() * 2000 + 200);
    return {
      name: `queue-${c.name.split(' ')[0].toLowerCase()}`, target: `10.10.1.${10 + i}/32`,
      mac: c.mac_address, uploadBytes: ulMB * 1048576, downloadBytes: Math.floor(dlGB * 1073741824),
      totalBytes: Math.floor(dlGB * 1073741824) + ulMB * 1048576,
      uploadMB: ulMB, downloadMB: Math.floor(dlGB * 1024), totalMB: Math.floor(dlGB * 1024) + ulMB,
      downloadGB: dlGB, maxLimit: c.plan.name.includes('Business') ? '50M/25M' : '15M/10M',
      currentRate: `${(Math.random() * 8 + 0.5).toFixed(1)}M/${(Math.random() * 2 + 0.1).toFixed(1)}M`,
      disabled: false, customerName: c.name, customerPhone: c.phone, customerId: c.id,
    };
  }),
  totalQueues: 42,
  generatedAt: iso(),
};

// ─── Vouchers ───────────────────────────────────────────────────────
const voucherStatuses: ('available' | 'used' | 'disabled' | 'expired')[] = ['available', 'available', 'available', 'available', 'available', 'used', 'used', 'used', 'disabled', 'expired', 'available', 'used', 'available', 'available', 'used', 'available', 'expired', 'used', 'available', 'available'];

export const demoVouchers: Voucher[] = voucherStatuses.map((status, i) => {
  const plan = demoPlans[i % 4];
  const router = demoRouters[i % 3];
  return {
    id: 100 + i,
    code: `BW${String.fromCharCode(65 + (i % 26))}${String(Math.floor(Math.random() * 9000 + 1000))}`,
    status,
    plan_id: plan.id,
    plan: { id: plan.id, name: plan.name, price: plan.price, speed: plan.speed, duration: `${plan.duration_value} ${plan.duration_unit}` },
    router_id: router.id,
    router: { id: router.id, name: router.name },
    batch_id: `BATCH-${String(Math.floor(i / 5) + 1).padStart(3, '0')}`,
    redeemed_by: status === 'used' ? phones[i % phones.length] : null,
    redeemed_at: status === 'used' ? iso(Math.floor(Math.random() * 5)) : null,
    expires_at: iso(-30),
    used_at: status === 'used' ? iso(Math.floor(Math.random() * 5)) : null,
    created_at: iso(10),
  };
});

export const demoVoucherStats: VoucherStats = {
  total: 20, available: 9, used: 6, disabled: 1, expired: 2,
};

export const demoVouchersListResponse: VouchersListResponse = {
  vouchers: demoVouchers, total: 20, page: 1, per_page: 50, pages: 1,
};

// ─── Ratings ────────────────────────────────────────────────────────
export const demoRatings: Rating[] = demoCustomers.slice(0, 12).map((c, i) => ({
  id: 200 + i, phone: c.phone, rating: [5, 4, 5, 3, 5, 4, 2, 5, 4, 5, 3, 4][i],
  comment: [
    'Great speeds, very reliable!', 'Good service overall', 'Best ISP in the area',
    'Sometimes slow in the evenings', 'Excellent customer support', 'Happy with the service',
    'Outage last week was frustrating', 'Fast and affordable!', 'Decent for the price',
    'Love the auto-reconnect feature', 'Could be faster', 'Very satisfied',
  ][i],
  latitude: -1.286 + (Math.random() - 0.5) * 0.05,
  longitude: 36.817 + (Math.random() - 0.5) * 0.05,
  created_at: iso(i * 2), customer_id: c.id, customer_name: c.name,
}));

export const demoRatingSummary: RatingSummary = {
  total_ratings: 12, average_rating: 4.1,
  rating_distribution: { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5 },
  ratings_with_comments: 12, ratings_with_location: 12,
};

export const demoCustomerMapData: CustomerMapData[] = demoCustomers.slice(0, 10).map((c, i) => ({
  id: c.id, phone: c.phone, name: c.name,
  latitude: -1.286 + (Math.random() - 0.5) * 0.06,
  longitude: 36.817 + (Math.random() - 0.5) * 0.06,
  rating: demoRatings[i]?.rating, last_rating_comment: demoRatings[i]?.comment,
  total_ratings: Math.floor(Math.random() * 5 + 1), average_rating: 3.5 + Math.random() * 1.5,
}));

// ─── Advertisers & Ads ──────────────────────────────────────────────
export const demoAdvertisers: Advertiser[] = [
  { id: 1, name: 'Jane Waweru', business_name: 'Nairobi Electronics', phone_number: '254700111222', email: 'jane@nairobielectronics.co.ke', is_active: true, created_at: iso(30) },
  { id: 2, name: 'Tom Maina', business_name: 'Kilimani Hardware', phone_number: '254700333444', email: 'tom@kilimanihw.co.ke', is_active: true, created_at: iso(25) },
  { id: 3, name: 'Lucy Odhiambo', business_name: 'Westlands Fresh Market', phone_number: '254700555666', email: 'lucy@westlandsfresh.co.ke', is_active: true, created_at: iso(20) },
];

export const demoAds: Ad[] = [
  { id: 1, title: 'Samsung Galaxy A15 - Special Offer', description: 'Brand new Samsung Galaxy A15 at unbeatable price. 128GB, dual SIM.', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', seller_name: 'Nairobi Electronics', seller_location: 'Kilimani, Nairobi', phone_number: '254700111222', whatsapp_number: '254700111222', price: 'KES 18,999', price_value: 18999, badge_type: 'hot', badge_text: 'Hot Deal', category: 'electronics', is_active: true, priority: 1, views_count: 1250, clicks_count: 89, created_at: iso(10), expires_at: iso(-30), advertiser_id: 1 },
  { id: 2, title: 'Home WiFi Router Setup', description: 'Professional home WiFi setup and configuration. Coverage guaranteed.', image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', seller_name: 'Kilimani Hardware', seller_location: 'Westlands, Nairobi', phone_number: '254700333444', whatsapp_number: '254700333444', price: 'KES 3,500', price_value: 3500, badge_type: 'new', badge_text: null, category: 'services', is_active: true, priority: 2, views_count: 820, clicks_count: 56, created_at: iso(8), expires_at: iso(-25), advertiser_id: 2 },
  { id: 3, title: 'Fresh Organic Vegetables - Delivered', description: 'Weekly box of fresh organic vegetables delivered to your door.', image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', seller_name: 'Westlands Fresh Market', seller_location: 'South B, Nairobi', phone_number: '254700555666', whatsapp_number: '254700555666', price: 'KES 1,200/week', price_value: 1200, badge_type: 'featured', badge_text: 'Featured', category: 'food', is_active: true, priority: 3, views_count: 640, clicks_count: 42, created_at: iso(5), expires_at: iso(-20), advertiser_id: 3 },
];

export const demoAdsResponse: AdsResponse = {
  ads: demoAds, pagination: { page: 1, per_page: 20, total: 3, total_pages: 1 },
};

export const demoAdClicksResponse: AdClicksResponse = {
  ad_id: 1, ad_title: 'Samsung Galaxy A15 - Special Offer',
  clicks: Array.from({ length: 10 }, (_, i) => ({
    id: 300 + i, click_type: (['view_details', 'call', 'whatsapp'] as const)[i % 3],
    device_id: `dev-${1000 + i}`, mac_address: macs[i % macs.length],
    session_id: `sess-${2000 + i}`, created_at: iso(i % 5, i * 2),
  })),
  pagination: { page: 1, per_page: 50, total: 10 },
};

export const demoAdImpressionsResponse: AdImpressionsResponse = {
  ad_id: 1, ad_title: 'Samsung Galaxy A15 - Special Offer',
  impressions: Array.from({ length: 15 }, (_, i) => ({
    id: 400 + i, device_id: `dev-${1000 + i}`, session_id: `sess-${3000 + i}`,
    placement: 'captive_portal', ad_ids: [1, 2, 3], created_at: iso(i % 7, i * 3),
  })),
  pagination: { page: 1, per_page: 50, total: 15 },
};

export const demoAdAnalytics: AdAnalytics = {
  period_days: 30, total_ads: 3, active_ads: 3, total_clicks: 187,
  clicks_by_type: { view_details: 95, call: 52, whatsapp: 40 },
  total_impressions: 2710,
  top_ads_by_clicks: demoAds.map(a => ({ id: a.id, title: a.title, clicks_count: a.clicks_count, views_count: a.views_count })),
};

// ─── Plan Performance ───────────────────────────────────────────────
export const demoPlanPerformance: PlanPerformanceResponse = {
  plans: demoPlans.map(p => ({
    plan_id: p.id, plan_name: p.name, plan_price: p.price,
    duration: `${p.duration_value} ${p.duration_unit}`,
    total_customers: Math.floor(Math.random() * 25 + 5),
    total_sales: Math.floor(Math.random() * 40 + 10),
    total_revenue: p.price * Math.floor(Math.random() * 40 + 10),
    average_revenue_per_sale: p.price,
    active_customers: Math.floor(Math.random() * 15 + 3),
  })),
  period: { start_date: dateStr(30), end_date: dateStr(0) },
};

// ─── Router Uptime ──────────────────────────────────────────────────
export function demoRouterUptime(routerId: number): RouterUptimeResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, generated_at: iso(),
    current_status: {
      status: router.status ?? 'online', status_is_stale: false, status_age_seconds: 30,
      status_last_checked_at: iso(), last_online_at: iso(), status_source: 'health_check',
      availability_checks: 2880, availability_successes: 2870,
    },
    overall: { total_checks: 2880, online_checks: 2870, uptime_percentage: 99.65 },
    window: {
      hours: 24, from: iso(1), to: iso(), first_check_at: iso(1), last_check_at: iso(),
      total_checks: 288, online_checks: 286, uptime_percentage: 99.31,
    },
    recent_checks: Array.from({ length: 90 }, (_, i) => ({
      checked_at: iso(0, (89 - i) * 0.5), is_online: i !== 23 && i !== 24 && i !== 61, source: 'health_check',
    })),
  };
}

// ─── Router Users ───────────────────────────────────────────────────
export function demoRouterUsers(routerId: number): RouterUsersResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  const users = demoCustomers.filter(c => c.router.id === routerId).slice(0, 8).map(c => ({
    username: c.mac_address, profile: c.plan.name, disabled: c.status !== 'active',
    comment: c.name, uptime_limit: `${c.plan.price <= 100 ? '1d' : '30d'}`,
    active: c.status === 'active',
    session: c.status === 'active' ? {
      address: `10.10.${routerId}.${Math.floor(Math.random() * 250 + 2)}`,
      login_time: iso(0, Math.floor(Math.random() * 6)),
      uptime: `${Math.floor(Math.random() * 8)}h ${Math.floor(Math.random() * 59)}m`,
      bytes_in: String(Math.floor(Math.random() * 500000000)),
      bytes_out: String(Math.floor(Math.random() * 2000000000)),
    } : undefined,
  }));
  return { router_id: router.id, router_name: router.name, users, total_users: users.length, active_sessions: users.filter(u => u.active).length };
}

// ─── PPPoE Diagnostics ──────────────────────────────────────────────
export function demoPPPoEOverview(routerId: number): PPPoEOverviewResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, generated_at: iso(),
    cached: false, success: true, healthy: true, active_sessions: 12,
    checks: [
      { check: 'pppoe_server', description: 'PPPoE server is running', passed: true, detail: { enabled: true, service_name: 'pppoe-service' } },
      { check: 'pppoe_ports', description: 'PPPoE ports are configured', passed: true, detail: { ports: ['ether2', 'ether3'] }, any_port_up: true },
      { check: 'ip_pool', description: 'IP pool has available addresses', passed: true, detail: { pool: 'pppoe-pool', used: 12, total: 254 } },
      { check: 'firewall_nat', description: 'NAT masquerade rule exists', passed: true, detail: {}, any_masquerade: true },
      { check: 'dns', description: 'DNS is configured', passed: true, detail: { servers: ['8.8.8.8', '1.1.1.1'] } },
    ],
  };
}

export function demoPPPoELogs(routerId: number): PPPoELogsResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, filter_username: null,
    generated_at: iso(), notable_entries_persisted: 0, success: true,
    data: Array.from({ length: 15 }, (_, i) => ({
      time: iso(0, i * 0.5),
      topics: 'pppoe,info',
      message: [`pppoe-user-${i + 1} logged in`, `pppoe-user-${i} logged out`, `pppoe-user-${i + 2} authentication successful`][i % 3],
    })),
    count: 15,
  };
}

export function demoPPPoESecrets(routerId: number): PPPoESecretsResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  const pppoeCustomers = demoCustomers.filter(c => c.connection_type === 'pppoe').slice(0, 6);
  return {
    router_id: router.id, router_name: router.name, generated_at: iso(), success: true,
    data: pppoeCustomers.map(c => ({
      name: c.pppoe_username ?? `pppoe-${c.name.split(' ')[0].toLowerCase()}`,
      service: 'pppoe-service', profile: c.plan.name.includes('Business') ? 'pppoe-biz' : 'pppoe-home',
      disabled: c.status !== 'active', comment: c.name,
      last_logged_out: iso(0, Math.floor(Math.random() * 24)),
      last_disconnect_reason: 'admin-reset', last_caller_id: c.mac_address,
      online: c.status === 'active', session: null, profile_detail: null,
      db_customer: { id: c.id, name: c.name, status: c.status, expiry: c.expiry },
    })),
    count: pppoeCustomers.length,
  };
}

export function demoPPPoEActiveSessions(routerId: number): PPPoEActiveResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  const activePPPoE = demoCustomers.filter(c => c.connection_type === 'pppoe' && c.status === 'active').slice(0, 4);
  return {
    router_id: router.id, router_name: router.name,
    sessions: activePPPoE.map((c, i) => ({
      user: c.pppoe_username ?? '', address: `10.20.${routerId}.${10 + i}`,
      uptime: `${Math.floor(Math.random() * 72)}h ${Math.floor(Math.random() * 59)}m`,
      bytes_in: Math.floor(Math.random() * 2000000000), bytes_out: Math.floor(Math.random() * 8000000000),
    })),
    total_sessions: activePPPoE.length,
  };
}

// ─── Hotspot Diagnostics ────────────────────────────────────────────
export function demoHotspotOverview(routerId: number): HotspotOverviewResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, generated_at: iso(),
    cached: false, success: true, healthy: true, active_sessions: 28,
    checks: [
      { check: 'hotspot_server', description: 'Hotspot server is running', passed: true, detail: { interface: 'bridge-hotspot' } },
      { check: 'dhcp_server', description: 'DHCP server is active', passed: true, detail: { pool: 'hotspot-pool', leases: 45 } },
      { check: 'walled_garden', description: 'Walled garden is configured', passed: true, detail: { entries: 8 } },
      { check: 'dns', description: 'DNS is configured', passed: true, detail: { servers: ['8.8.8.8', '1.1.1.1'] } },
    ],
  };
}

export function demoHotspotLogs(routerId: number): HotspotLogsResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, filter_search: null,
    generated_at: iso(), notable_entries_persisted: 0, success: true,
    data: Array.from({ length: 12 }, (_, i) => ({
      time: iso(0, i * 0.3),
      topics: 'hotspot,info',
      message: [`${macs[i % macs.length]} connected via hotspot`, `session timeout for ${macs[(i + 1) % macs.length]}`, `new DHCP lease for 10.10.1.${100 + i}`][i % 3],
    })),
    count: 12,
  };
}

// ─── Port Status ────────────────────────────────────────────────────
export function demoPortStatus(routerId: number): PortStatusResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name, pppoe_ports: router.pppoe_ports ?? [],
    generated_at: iso(), cached: false,
    ports: ['ether1', 'ether2', 'ether3', 'ether4', 'ether5'].map((port, i) => ({
      port, bridge: i === 0 ? '' : i <= 2 ? 'bridge-hotspot' : 'bridge-pppoe',
      service: (i === 0 ? 'unassigned' : i <= 2 ? 'hotspot' : 'pppoe') as 'hotspot' | 'pppoe' | 'dual' | 'unassigned',
      link_up: i < 4, disabled: false,
      rx_byte: Math.floor(Math.random() * 50000000000), tx_byte: Math.floor(Math.random() * 80000000000),
      rx_error: Math.floor(Math.random() * 5), tx_error: 0,
      rx_drop: Math.floor(Math.random() * 10), tx_drop: 0, link_downs: Math.floor(Math.random() * 3),
      last_link_up_time: iso(Math.floor(Math.random() * 5)), actual_mtu: 1500,
    })),
    bridges: [
      { name: 'bridge-hotspot', running: true, disabled: false, port_count: 2 },
      { name: 'bridge-pppoe', running: true, disabled: false, port_count: 2 },
    ],
  };
}

// ─── Walled Garden ──────────────────────────────────────────────────
export const demoWalledGarden: WalledGardenResponse = {
  domain_entries: [
    { '.id': '*1', 'dst-host': '*.safaricom.co.ke', action: 'allow', comment: 'M-Pesa payment' },
    { '.id': '*2', 'dst-host': '*.google.com', action: 'allow', comment: 'Captive portal redirect' },
    { '.id': '*3', 'dst-host': '*.bitwavetechnologies.com', action: 'allow', comment: 'Billing portal' },
  ],
  ip_entries: [
    { '.id': '*1', 'dst-address': '196.201.214.0/24', action: 'accept', comment: 'Safaricom M-Pesa API' },
    { '.id': '*2', 'dst-address': '41.89.12.100/32', action: 'accept', comment: 'Billing server' },
  ],
};

// ─── Router Interfaces ──────────────────────────────────────────────
export function demoRouterInterfaces(routerId: number): RouterInterfacesResponse {
  const router = demoRouters.find(r => r.id === routerId) ?? demoRouters[0];
  return {
    router_id: router.id, router_name: router.name,
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, disabled: false, default_name: 'ether1', mac_address: 'AA:BB:CC:00:01:01' },
      { name: 'ether2', type: 'ether', running: true, disabled: false, default_name: 'ether2', mac_address: 'AA:BB:CC:00:01:02' },
      { name: 'ether3', type: 'ether', running: true, disabled: false, default_name: 'ether3', mac_address: 'AA:BB:CC:00:01:03' },
      { name: 'ether4', type: 'ether', running: true, disabled: false, default_name: 'ether4', mac_address: 'AA:BB:CC:00:01:04' },
      { name: 'ether5', type: 'ether', running: false, disabled: false, default_name: 'ether5', mac_address: 'AA:BB:CC:00:01:05' },
      { name: 'wlan1', type: 'wlan', running: true, disabled: false, mac_address: 'AA:BB:CC:00:02:01' },
    ],
    pppoe_ports: router.pppoe_ports ?? [],
    plain_ports: router.plain_ports ?? [],
    dual_ports: router.dual_ports ?? [],
  };
}

// ─── PPPoE Credentials ──────────────────────────────────────────────
export function demoPPPoECredentials(customerId: number): PPPoECredentials {
  const c = demoCustomers.find(cu => cu.id === customerId) ?? demoCustomers[0];
  return {
    pppoe_username: c.pppoe_username ?? `pppoe-${c.name.split(' ')[0].toLowerCase()}`,
    pppoe_password: '••••••••',
    customer_name: c.name,
    status: c.status,
  };
}

// ─── Provision Tokens ───────────────────────────────────────────────
export const demoProvisionTokens: ProvisionToken[] = [
  { id: 1, token: 'demo-prov-abc123', router_name: 'New Router', identity: 'MikroTik-New', vpn_type: 'wireguard', vpn_ip: '10.99.0.5', status: 'pending', expired: false, command: '/tool fetch url="https://isp.bitwavetechnologies.com/api/provision/demo-prov-abc123" dst-path=provision.rsc;:delay 2s;/import provision.rsc;', created_at: iso(1), provisioned_at: null, router_id: null },
  { id: 2, token: 'demo-prov-def456', router_name: 'V6 Router', identity: 'MikroTik-V6', vpn_type: 'l2tp', vpn_ip: '10.0.0.100', status: 'provisioned', expired: false, command: null, created_at: iso(3), provisioned_at: iso(2), router_id: 2 },
];

// ─── Admin Reseller Management ───────────────────────────────────────

const demoAdminResellersList = [
  {
    id: 1, email: 'acme@wifi.co.ke', organization_name: 'Acme WiFi', business_name: 'Acme Networks Ltd',
    support_phone: '+254700111222', mpesa_shortcode: '174379', created_at: iso(90),
    last_login_at: iso(0, 2), total_revenue: 245000, mpesa_revenue: 196000, total_customers: 420, active_customers: 280,
    last_payment_date: iso(0, 1), router_count: 4, unpaid_balance: 65000,
  },
  {
    id: 2, email: 'speednet@isp.co.ke', organization_name: 'SpeedNet Kenya', business_name: 'SpeedNet Solutions',
    support_phone: '+254711333444', mpesa_shortcode: '600987', created_at: iso(60),
    last_login_at: iso(1, 5), total_revenue: 182000, mpesa_revenue: 145600, total_customers: 310, active_customers: 195,
    last_payment_date: iso(0, 3), router_count: 3, unpaid_balance: 42000,
  },
  {
    id: 3, email: 'connect@fibre.ke', organization_name: 'FibreConnect', business_name: 'FibreConnect ISP Ltd',
    support_phone: '+254722555666', mpesa_shortcode: '123456', created_at: iso(45),
    last_login_at: iso(0, 8), total_revenue: 98000, mpesa_revenue: 78400, total_customers: 175, active_customers: 110,
    last_payment_date: iso(0, 6), router_count: 2, unpaid_balance: 28000,
  },
  {
    id: 4, email: 'admin@cloudwifi.ke', organization_name: 'CloudWifi', business_name: 'CloudWifi Technologies',
    support_phone: '+254733777888', mpesa_shortcode: '654321', created_at: iso(15),
    last_login_at: iso(35), total_revenue: 12000, mpesa_revenue: 9600, total_customers: 45, active_customers: 20,
    last_payment_date: iso(5), router_count: 1, unpaid_balance: 8000,
  },
];

export const demoAdminDashboard: AdminDashboard = {
  resellers: { total: 4, active_last_30_days: 3 },
  revenue: { today: 18500, today_mpesa: 14800, this_week: 95000, this_week_mpesa: 76000, this_month: 385000, this_month_mpesa: 308000, all_time: 537000, all_time_mpesa: 429600 },
  customers: { total: 950, active: 605, inactive: 345 },
  routers: { total: 10, online: 8, offline: 2 },
  top_resellers_this_month: [
    { id: 1, email: 'acme@wifi.co.ke', organization_name: 'Acme WiFi', month_revenue: 68000 },
    { id: 2, email: 'speednet@isp.co.ke', organization_name: 'SpeedNet Kenya', month_revenue: 52000 },
    { id: 3, email: 'connect@fibre.ke', organization_name: 'FibreConnect', month_revenue: 31000 },
  ],
  payouts: { total_paid: 394000, total_unpaid: 143000 },
  recent_signups: [
    { id: 4, email: 'admin@cloudwifi.ke', organization_name: 'CloudWifi', created_at: iso(15), last_login_at: iso(35) },
    { id: 3, email: 'connect@fibre.ke', organization_name: 'FibreConnect', created_at: iso(45), last_login_at: iso(0, 8) },
  ],
  generated_at: iso(0),
};

export function demoAdminResellers(params?: AdminResellersParams): AdminResellersResponse {
  let list = [...demoAdminResellersList];
  const search = params?.search;
  const filter = params?.filter;
  const sortBy = params?.sort_by;
  const sortOrder = params?.sort_order || 'desc';

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r => r.email.toLowerCase().includes(q) || r.organization_name.toLowerCase().includes(q));
  }

  if (filter) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    switch (filter) {
      case 'unpaid': list = list.filter(r => r.unpaid_balance > 0); break;
      case 'paid_up': list = list.filter(r => r.unpaid_balance <= 0); break;
      case 'active': list = list.filter(r => r.last_login_at && new Date(r.last_login_at).getTime() > thirtyDaysAgo); break;
      case 'inactive': list = list.filter(r => !r.last_login_at || new Date(r.last_login_at).getTime() <= thirtyDaysAgo); break;
      case 'has_routers': list = list.filter(r => r.router_count > 0); break;
      case 'no_routers': list = list.filter(r => r.router_count === 0); break;
      case 'has_revenue': list = list.filter(r => r.total_revenue > 0); break;
      case 'no_revenue': list = list.filter(r => r.total_revenue === 0); break;
    }
  }

  const dir = sortOrder === 'asc' ? 1 : -1;
  switch (sortBy) {
    case 'unpaid_balance': list.sort((a, b) => dir * (a.unpaid_balance - b.unpaid_balance)); break;
    case 'revenue': list.sort((a, b) => dir * (a.total_revenue - b.total_revenue)); break;
    case 'mpesa_revenue': list.sort((a, b) => dir * (a.mpesa_revenue - b.mpesa_revenue)); break;
    case 'customers': list.sort((a, b) => dir * (a.active_customers - b.active_customers)); break;
    case 'router_count': list.sort((a, b) => dir * (a.router_count - b.router_count)); break;
    case 'last_login': list.sort((a, b) => dir * ((a.last_login_at ?? '').localeCompare(b.last_login_at ?? ''))); break;
    case 'created_at':
    default:
      list.sort((a, b) => dir * (a.created_at.localeCompare(b.created_at))); break;
  }

  return {
    total: list.length,
    filters_applied: {
      sort_by: sortBy || null,
      sort_order: sortOrder,
      filter: filter || null,
      search: search || null,
    },
    resellers: list,
  };
}

export function demoAdminResellerDetail(resellerId: number): AdminResellerDetail {
  const r = demoAdminResellersList.find(x => x.id === resellerId) ?? demoAdminResellersList[0];
  return {
    id: r.id, email: r.email, organization_name: r.organization_name, business_name: r.business_name,
    support_phone: r.support_phone, mpesa_shortcode: r.mpesa_shortcode,
    created_at: r.created_at, last_login_at: r.last_login_at,
    revenue: {
      today: Math.round(r.total_revenue * 0.02),
      today_mpesa: Math.round(r.mpesa_revenue * 0.02),
      this_week: Math.round(r.total_revenue * 0.12),
      this_week_mpesa: Math.round(r.mpesa_revenue * 0.12),
      this_month: Math.round(r.total_revenue * 0.35),
      this_month_mpesa: Math.round(r.mpesa_revenue * 0.35),
      all_time: r.total_revenue,
      all_time_mpesa: r.mpesa_revenue,
    },
    customers: {
      active: r.active_customers,
      inactive: r.total_customers - r.active_customers - 10,
      pending: 10,
      total: r.total_customers,
    },
    routers: Array.from({ length: r.router_count }, (_, i) => ({
      id: r.id * 100 + i + 1,
      name: `Router ${i + 1}`,
      identity: `${r.organization_name.toLowerCase().replace(/\s+/g, '-')}-r${i + 1}`,
      ip_address: `10.${r.id}.0.${i + 1}`,
      is_online: i < r.router_count - (r.id === 4 ? 1 : 0),
      last_checked_at: iso(0, i),
    })),
    recent_payments: Array.from({ length: 5 }, (_, i) => ({
      id: r.id * 1000 + i + 1,
      amount: [100, 200, 500, 50, 300][i],
      payment_method: 'mobile_money',
      customer_name: ['John Doe', 'Jane Smith', 'Peter Ouma', 'Mary Wanjiku', 'Ali Hassan'][i],
      customer_phone: `25471${String(r.id)}${String(i).padStart(6, '0')}`,
      plan_name: ['Daily 50MB', 'Weekly 1GB', 'Monthly 5GB', 'Daily 100MB', 'Weekly 3GB'][i],
      created_at: iso(0, i + 1),
    })),
    payouts: {
      total_paid: r.total_revenue - r.unpaid_balance,
      last_payout_date: iso(7),
      unpaid_balance: r.unpaid_balance,
    },
    payment_methods: [
      {
        id: r.id * 10 + 1,
        method_type: 'bank_account' as const,
        label: 'KCB Business Account',
        is_active: true,
        bank_paybill_number: '522522',
        bank_account_number: `${r.id}2345678`,
      },
      {
        id: r.id * 10 + 2,
        method_type: 'mpesa_paybill' as const,
        label: 'Safaricom Paybill',
        is_active: true,
        mpesa_paybill_number: r.mpesa_shortcode,
      },
      {
        id: r.id * 10 + 3,
        method_type: 'mpesa_paybill_with_keys' as const,
        label: 'Till Number',
        is_active: r.id !== 4,
        mpesa_shortcode: `${987654 + r.id}`,
      },
      {
        id: r.id * 10 + 4,
        method_type: 'zenopay' as const,
        label: 'ZenoPay Gateway',
        is_active: false,
        zenopay_account_id: `zen_${r.organization_name.toLowerCase().replace(/\s+/g, '_')}_${r.id}`,
      },
      {
        id: r.id * 10 + 5,
        method_type: 'mtn_momo' as const,
        label: 'MTN Uganda (Sandbox)',
        is_active: false,
        mtn_api_user: `64f8c775-6dff-45c0-93e0-39a9cd78df8${r.id}`,
        mtn_target_environment: 'sandbox',
        mtn_currency: 'EUR',
      },
    ],
  };
}

export function demoAdminResellerPayments(resellerId: number, page = 1, perPage = 50): AdminPaymentsResponse {
  const r = demoAdminResellersList.find(x => x.id === resellerId) ?? demoAdminResellersList[0];
  const totalCount = 127;
  const names = ['John Doe', 'Jane Smith', 'Peter Ouma', 'Mary Wanjiku', 'Ali Hassan', 'Grace Muthoni', 'David Kamau', 'Sarah Njeri'];
  const plans = ['Daily 50MB', 'Weekly 1GB', 'Monthly 5GB', 'Daily 100MB', 'Weekly 3GB', 'Monthly 10GB'];
  const payments = Array.from({ length: Math.min(perPage, totalCount - (page - 1) * perPage) }, (_, i) => ({
    id: r.id * 10000 + (page - 1) * perPage + i + 1,
    amount: [100, 200, 500, 50, 300, 1000, 150, 250][i % 8],
    payment_method: 'mobile_money',
    payment_reference: `SH${String(r.id)}K${String((page - 1) * perPage + i).padStart(4, '0')}`,
    customer_name: names[i % names.length],
    customer_phone: `25471${String(r.id)}${String(i).padStart(6, '0')}`,
    plan_name: plans[i % plans.length],
    created_at: iso(Math.floor(i / 5), (i % 5) + 1),
  }));
  return {
    reseller_id: r.id, page, per_page: perPage,
    total_count: totalCount, total_pages: Math.ceil(totalCount / perPage),
    summary: { total_transactions: totalCount, total_amount: 18500, mpesa_amount: 15200 },
    payments,
  };
}

export function demoAdminResellerRouters(resellerId: number): AdminRoutersResponse {
  const r = demoAdminResellersList.find(x => x.id === resellerId) ?? demoAdminResellersList[0];
  return {
    reseller_id: r.id, total: r.router_count,
    routers: Array.from({ length: r.router_count }, (_, i) => ({
      id: r.id * 100 + i + 1,
      name: `Router ${i + 1}`,
      identity: `${r.organization_name.toLowerCase().replace(/\s+/g, '-')}-r${i + 1}`,
      ip_address: `10.${r.id}.0.${i + 1}`,
      auth_method: 'DIRECT_API',
      is_online: i < r.router_count - (r.id === 4 ? 1 : 0),
      last_checked_at: iso(0, i),
      customer_count: Math.round(r.active_customers / r.router_count),
      total_revenue: Math.round(r.total_revenue / r.router_count),
    })),
  };
}

export function demoAdminPayouts(resellerId: number, page = 1, perPage = 50): AdminPayoutsResponse {
  const r = demoAdminResellersList.find(x => x.id === resellerId) ?? demoAdminResellersList[0];
  const totalPaid = r.total_revenue - r.unpaid_balance;
  const payouts = Array.from({ length: 6 }, (_, i) => ({
    id: r.id * 100 + i + 1,
    reseller_id: r.id,
    amount: Math.round(totalPaid / 6),
    payment_method: i % 2 === 0 ? 'mpesa' : 'bank',
    reference: i % 2 === 0 ? `SH${String(r.id)}PAY${String(i).padStart(3, '0')}` : `BNK-${r.id}-${i}`,
    notes: `Week ${i + 1} payout`,
    period_start: iso(42 - i * 7),
    period_end: iso(35 - i * 7),
    created_at: iso(35 - i * 7, 2),
  }));
  return {
    reseller_id: r.id, page, per_page: perPage,
    total_count: 6, total_pages: 1,
    summary: { total_payouts: 6, total_amount: totalPaid },
    payouts,
  };
}

// ─── Admin Reseller Stats (Charts) ──────────────────────────────────

function generateResellerStatsData(period: AdminResellerStatsPeriod): {
  days: number;
  revenueData: ResellerRevenueDataPoint[];
  signupData: ResellerSignupDataPoint[];
} {
  const periodDays: Record<AdminResellerStatsPeriod, number> = {
    '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'all': 365,
  };
  const days = periodDays[period];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const revenueData: ResellerRevenueDataPoint[] = [];
  const signupData: ResellerSignupDataPoint[] = [];

  const useMonthly = days > 90;
  const step = useMonthly ? 30 : (days > 30 ? 7 : 1);
  const pointCount = Math.ceil(days / step);

  for (let i = pointCount - 1; i >= 0; i--) {
    const daysAgo = i * step;
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const dateKey = d.toISOString().split('T')[0];

    let label: string;
    if (useMonthly) {
      label = `${months[d.getMonth()]} ${d.getFullYear()}`;
    } else if (step === 7) {
      label = `${d.getDate()} ${months[d.getMonth()]}`;
    } else {
      label = `${d.getDate()} ${months[d.getMonth()]}`;
    }

    const baseRevenue = 8000 + Math.random() * 15000;
    const growthFactor = 1 + ((pointCount - i) / pointCount) * 0.5;
    const revenue = Math.round(baseRevenue * growthFactor * (step === 7 ? 7 : 1) * (useMonthly ? 30 : 1));
    const mpesaRatio = 0.7 + Math.random() * 0.15;

    revenueData.push({
      date: dateKey,
      label,
      revenue,
      mpesa_revenue: Math.round(revenue * mpesaRatio),
    });

    const signupBase = useMonthly ? 1 + Math.floor(Math.random() * 3) :
      step === 7 ? (Math.random() > 0.5 ? 1 : 0) :
      (Math.random() > 0.85 ? 1 : 0);
    signupData.push({
      date: dateKey,
      label,
      count: signupBase,
    });
  }

  return { days, revenueData, signupData };
}

export function demoAdminResellerStats(period: AdminResellerStatsPeriod = '30d'): AdminResellerStats {
  const { revenueData, signupData } = generateResellerStatsData(period);

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalMpesa = revenueData.reduce((sum, d) => sum + d.mpesa_revenue, 0);
  const totalSignups = signupData.reduce((sum, d) => sum + d.count, 0);

  return {
    period,
    revenue_over_time: revenueData,
    signups_over_time: signupData,
    totals: {
      revenue: totalRevenue,
      mpesa_revenue: totalMpesa,
      new_resellers: totalSignups,
    },
  };
}

// ─── Lead Pipeline / CRM ─────────────────────────────────────────────

export const demoLeadSources: LeadSource[] = [
  { id: 1, name: 'Instagram', description: 'Leads from Instagram DMs and comments', is_active: true, created_at: iso(60) },
  { id: 2, name: 'TikTok', description: 'Leads from TikTok videos and comments', is_active: true, created_at: iso(60) },
  { id: 3, name: 'WhatsApp', description: 'Leads from WhatsApp messages', is_active: true, created_at: iso(60) },
  { id: 4, name: 'Referral', description: 'Referred by existing resellers', is_active: true, created_at: iso(60) },
  { id: 5, name: 'Phone Call', description: 'Called in after seeing an ad', is_active: true, created_at: iso(60) },
  { id: 6, name: 'Walk-in', description: 'Visited office in person', is_active: true, created_at: iso(60) },
  { id: 7, name: 'Website', description: 'Registered or enquired via website', is_active: true, created_at: iso(60) },
  { id: 8, name: 'Facebook', description: 'Leads from Facebook posts and groups', is_active: true, created_at: iso(60) },
  { id: 9, name: 'Other', description: 'Uncategorized sources', is_active: true, created_at: iso(60) },
];

const demoLeadsList: Lead[] = [
  {
    id: 1, name: 'John Doe', phone: '+254712345678', email: 'john@example.com',
    social_platform: 'tiktok', social_handle: '@johndoe_isp', source: 'TikTok', source_id: 2,
    source_detail: 'Commented on router setup video', stage: 'talking',
    stage_changed_at: iso(2), next_followup_at: iso(-2), notes: 'Interested in becoming a reseller in Nairobi',
    converted_user_id: null, lost_reason: null, created_at: iso(10), updated_at: iso(2),
  },
  {
    id: 2, name: 'Mary Wanjiku', phone: '+254700111222', email: 'mary@gmail.com',
    social_platform: 'instagram', social_handle: '@mary_net', source: 'Instagram', source_id: 1,
    source_detail: 'DMed asking about pricing', stage: 'new_lead',
    stage_changed_at: iso(1), next_followup_at: iso(-1), notes: 'Runs a cyber café in Thika',
    converted_user_id: null, lost_reason: null, created_at: iso(1), updated_at: iso(1),
  },
  {
    id: 3, name: 'Peter Ochieng', phone: '+254733444555', email: null,
    social_platform: 'whatsapp', social_handle: null, source: 'WhatsApp', source_id: 3,
    source_detail: null, stage: 'contacted',
    stage_changed_at: iso(3), next_followup_at: iso(-1), notes: null,
    converted_user_id: null, lost_reason: null, created_at: iso(5), updated_at: iso(3),
  },
  {
    id: 4, name: 'Alice Muthoni', phone: '+254711222333', email: 'alice@ispke.co.ke',
    social_platform: null, social_handle: null, source: 'Referral', source_id: 4,
    source_detail: 'Referred by Reseller #12 (James)', stage: 'installation_help',
    stage_changed_at: iso(1), next_followup_at: iso(0), notes: 'Needs help configuring MikroTik',
    converted_user_id: null, lost_reason: null, created_at: iso(14), updated_at: iso(1),
  },
  {
    id: 5, name: 'Mike Reseller', phone: '+254700555666', email: 'mike@example.com',
    social_platform: 'tiktok', social_handle: '@mike_wifi', source: 'TikTok', source_id: 2,
    source_detail: 'Saw video on earning with WiFi', stage: 'talking',
    stage_changed_at: iso(8), next_followup_at: null, notes: 'Has 3 apartments, wants to offer WiFi',
    converted_user_id: null, lost_reason: null, created_at: iso(14), updated_at: iso(8),
  },
  {
    id: 6, name: 'Sarah Kimani', phone: '+254722333444', email: 'sarah.k@gmail.com',
    social_platform: 'facebook', social_handle: null, source: 'Facebook', source_id: 8,
    source_detail: 'Commented on ISP reseller group', stage: 'signed_up',
    stage_changed_at: iso(3), next_followup_at: null, notes: 'Converted after 2 calls',
    converted_user_id: 15, lost_reason: null, created_at: iso(20), updated_at: iso(3),
  },
  {
    id: 7, name: 'David Njoroge', phone: '+254711666777', email: 'david.n@hotmail.com',
    social_platform: null, social_handle: null, source: 'Phone Call', source_id: 5,
    source_detail: 'Called after seeing a flyer', stage: 'paying',
    stage_changed_at: iso(5), next_followup_at: null, notes: 'Happy customer, paying monthly',
    converted_user_id: 8, lost_reason: null, created_at: iso(45), updated_at: iso(5),
  },
  {
    id: 8, name: 'Grace Achieng', phone: '+254733888999', email: 'grace@achieng.co.ke',
    social_platform: 'instagram', social_handle: '@grace_connects', source: 'Instagram', source_id: 1,
    source_detail: 'Responded to story ad', stage: 'paying',
    stage_changed_at: iso(10), next_followup_at: null, notes: 'Running in Kisumu',
    converted_user_id: 10, lost_reason: null, created_at: iso(60), updated_at: iso(10),
  },
  {
    id: 9, name: 'Kevin Omondi', phone: '+254700123456', email: null,
    social_platform: 'tiktok', social_handle: '@kevin_tech', source: 'TikTok', source_id: 2,
    source_detail: null, stage: 'lost',
    stage_changed_at: iso(7), next_followup_at: null, notes: null,
    converted_user_id: null, lost_reason: 'Went with a competitor', created_at: iso(30), updated_at: iso(7),
  },
  {
    id: 10, name: 'Faith Nyambura', phone: '+254722111222', email: 'faith@example.com',
    social_platform: 'whatsapp', social_handle: null, source: 'Referral', source_id: 4,
    source_detail: 'Friend of Grace Achieng', stage: 'new_lead',
    stage_changed_at: iso(0), next_followup_at: iso(-1), notes: 'Just reached out today',
    converted_user_id: null, lost_reason: null, created_at: iso(0), updated_at: iso(0),
  },
  {
    id: 11, name: 'Brian Kipchoge', phone: '+254733222111', email: 'brian@kipchoge.net',
    social_platform: null, social_handle: null, source: 'Walk-in', source_id: 6,
    source_detail: 'Walked into Nairobi office', stage: 'contacted',
    stage_changed_at: iso(2), next_followup_at: iso(0, 4), notes: 'Interested but unsure about costs',
    converted_user_id: null, lost_reason: null, created_at: iso(4), updated_at: iso(2),
  },
  {
    id: 12, name: 'Jane Wambui', phone: '+254712345999', email: null,
    social_platform: 'instagram', social_handle: '@jane_wambui', source: 'Instagram', source_id: 1,
    source_detail: 'Reel about ISP business', stage: 'talking',
    stage_changed_at: iso(14), next_followup_at: null, notes: 'Was very keen but went quiet',
    converted_user_id: null, lost_reason: null, created_at: iso(21), updated_at: iso(14),
  },
  {
    id: 13, name: 'Tom Mwangi', phone: '+254700987654', email: 'tom.m@gmail.com',
    social_platform: null, social_handle: null, source: 'Referral', source_id: 4,
    source_detail: 'Referred by David Njoroge', stage: 'paying',
    stage_changed_at: iso(15), next_followup_at: null, notes: 'Solid reseller in Nakuru',
    converted_user_id: 22, lost_reason: null, created_at: iso(90), updated_at: iso(15),
  },
  {
    id: 14, name: 'Lucy Chebet', phone: '+254711999888', email: 'lucy@example.com',
    social_platform: 'facebook', social_handle: null, source: 'Facebook', source_id: 8,
    source_detail: null, stage: 'churned',
    stage_changed_at: iso(5), next_followup_at: null, notes: 'Stopped paying after 2 months',
    converted_user_id: 18, lost_reason: 'Too expensive', created_at: iso(75), updated_at: iso(5),
  },
  {
    id: 15, name: 'Hassan Ali', phone: '+254733555444', email: 'hassan@ali.co.ke',
    social_platform: 'whatsapp', social_handle: null, source: 'WhatsApp', source_id: 3,
    source_detail: 'Found us on WhatsApp status', stage: 'new_lead',
    stage_changed_at: iso(0), next_followup_at: null, notes: 'Mombasa-based, wants to start ISP',
    converted_user_id: null, lost_reason: null, created_at: iso(0), updated_at: iso(0),
  },
];

const demoLeadActivitiesMap: Record<number, LeadActivity[]> = {
  1: [
    { id: 5, activity_type: 'call', description: 'Called to discuss pricing, agreed on Silver plan', old_stage: null, new_stage: null, created_at: iso(2, 1) },
    { id: 4, activity_type: 'stage_change', description: 'Had first call, very interested', old_stage: 'contacted', new_stage: 'talking', created_at: iso(2) },
    { id: 3, activity_type: 'dm', description: 'Sent intro DM on TikTok', old_stage: null, new_stage: null, created_at: iso(8) },
    { id: 2, activity_type: 'stage_change', description: 'Reached out via TikTok DM', old_stage: 'new_lead', new_stage: 'contacted', created_at: iso(8) },
    { id: 1, activity_type: 'stage_change', description: 'Lead created', old_stage: null, new_stage: 'new_lead', created_at: iso(10) },
  ],
  4: [
    { id: 12, activity_type: 'stage_change', description: 'Helping with router config', old_stage: 'talking', new_stage: 'installation_help', created_at: iso(1) },
    { id: 11, activity_type: 'meeting', description: 'Virtual meeting to demo setup', old_stage: null, new_stage: null, created_at: iso(3) },
    { id: 10, activity_type: 'stage_change', description: 'Started talking about plans', old_stage: 'contacted', new_stage: 'talking', created_at: iso(5) },
    { id: 9, activity_type: 'call', description: 'Intro call from referral', old_stage: null, new_stage: null, created_at: iso(12) },
    { id: 8, activity_type: 'stage_change', description: 'Lead created via referral', old_stage: null, new_stage: 'new_lead', created_at: iso(14) },
  ],
};

const demoLeadFollowUpsMap: Record<number, LeadFollowUp[]> = {
  1: [
    { id: 1, title: 'Call back about router installation', due_at: iso(-2), is_completed: false, completed_at: null, created_at: iso(2) },
  ],
  2: [
    { id: 2, title: 'Send pricing info via DM', due_at: iso(-1), is_completed: false, completed_at: null, created_at: iso(1) },
  ],
  3: [
    { id: 3, title: 'Follow up on WhatsApp message', due_at: iso(-1), is_completed: false, completed_at: null, created_at: iso(3) },
  ],
  4: [
    { id: 4, title: 'Check if MikroTik is configured', due_at: iso(0), is_completed: false, completed_at: null, created_at: iso(1) },
    { id: 5, title: 'Initial call completed', due_at: iso(12), is_completed: true, completed_at: iso(12), created_at: iso(14) },
  ],
  11: [
    { id: 6, title: 'Send cost breakdown email', due_at: iso(0, 4), is_completed: false, completed_at: null, created_at: iso(2) },
  ],
};

export function demoLeadDetail(id: number): LeadDetail | null {
  const lead = demoLeadsList.find(l => l.id === id);
  if (!lead) return null;
  return {
    ...lead,
    activities: demoLeadActivitiesMap[id] || [
      { id: 100 + id, activity_type: 'stage_change', description: 'Lead created', old_stage: null, new_stage: lead.stage, created_at: lead.created_at },
    ],
    follow_ups: demoLeadFollowUpsMap[id] || [],
  };
}

export function demoLeadsListResponse(params?: {
  stage?: LeadStage;
  source_id?: number;
  search?: string;
  page?: number;
  per_page?: number;
}): LeadsListResponse {
  let filtered = [...demoLeadsList];

  if (params?.stage) filtered = filtered.filter(l => l.stage === params.stage);
  if (params?.source_id) filtered = filtered.filter(l => l.source_id === params.source_id);
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.social_handle && l.social_handle.toLowerCase().includes(q))
    );
  }

  const page = params?.page || 1;
  const perPage = params?.per_page || 50;
  const start = (page - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  return { total: filtered.length, page, per_page: perPage, leads: paged };
}

export const demoLeadPipelineSummary: LeadPipelineSummary = {
  stages: {
    new_lead: demoLeadsList.filter(l => l.stage === 'new_lead').length,
    contacted: demoLeadsList.filter(l => l.stage === 'contacted').length,
    talking: demoLeadsList.filter(l => l.stage === 'talking').length,
    installation_help: demoLeadsList.filter(l => l.stage === 'installation_help').length,
    signed_up: demoLeadsList.filter(l => l.stage === 'signed_up').length,
    paying: demoLeadsList.filter(l => l.stage === 'paying').length,
    churned: demoLeadsList.filter(l => l.stage === 'churned').length,
    lost: demoLeadsList.filter(l => l.stage === 'lost').length,
  },
  total: demoLeadsList.length,
};

export const demoLeadPipelineStats: LeadPipelineStats = {
  total_leads: 41,
  active_pipeline: 18,
  conversion_rate: 39.0,
  loss_rate: 17.1,
  by_stage: { new_lead: 5, contacted: 3, talking: 8, installation_help: 2, signed_up: 4, paying: 12, churned: 1, lost: 6 },
  by_source: {
    'TikTok': { total: 12, converted: 5, conversion_rate: 41.7 },
    'Instagram': { total: 15, converted: 4, conversion_rate: 26.7 },
    'Referral': { total: 8, converted: 6, conversion_rate: 75.0 },
    'WhatsApp': { total: 6, converted: 1, conversion_rate: 16.7 },
  },
  funnel: [
    { stage: 'new_lead', reached: 35, percent_of_total: 85.4, dropped_off: 0, drop_off_percent: 0 },
    { stage: 'contacted', reached: 30, percent_of_total: 73.2, dropped_off: 5, drop_off_percent: 14.3 },
    { stage: 'talking', reached: 27, percent_of_total: 65.9, dropped_off: 3, drop_off_percent: 10.0 },
    { stage: 'installation_help', reached: 19, percent_of_total: 46.3, dropped_off: 8, drop_off_percent: 29.6 },
    { stage: 'signed_up', reached: 17, percent_of_total: 41.5, dropped_off: 2, drop_off_percent: 10.5 },
    { stage: 'paying', reached: 13, percent_of_total: 31.7, dropped_off: 4, drop_off_percent: 23.5 },
  ],
  avg_days_in_stage: { new_lead: 2.3, contacted: 4.1, talking: 8.5, installation_help: 3.2, signed_up: 6.0 },
  health: {
    stale_leads: 4,
    no_followup_scheduled: 7,
    overdue_followups: 2,
    stale_lead_previews: [
      { id: 12, name: 'Jane Wambui', stage: 'talking', days_since_update: 14, phone: '+254712345999' },
      { id: 5, name: 'Mike Reseller', stage: 'talking', days_since_update: 8, phone: '+254700555666' },
    ],
  },
  advice: [
    { priority: 'high', category: 'follow_up', title: '4 lead(s) have gone cold', detail: 'You have 4 leads in active stages with no update for 7+ days. These are at high risk of being lost. Reach out today.' },
    { priority: 'high', category: 'funnel', title: 'Biggest drop-off: 29.6% lost before "Installation Help"', detail: '29.6% of leads in conversation don\'t move to installation. They may be unsure about the technical side. Create a simple guide or short video showing how easy setup is.' },
    { priority: 'medium', category: 'follow_up', title: '7 active lead(s) with no follow-up scheduled', detail: 'Every active lead should have a next step. Schedule follow-ups so nothing slips through the cracks.' },
    { priority: 'low', category: 'source', title: 'Best source: Referral (75.0% conversion)', detail: '"Referral" converts at 75.0% (6 of 8 leads). Consider doubling down on this channel.' },
  ],
};

export function demoUpcomingFollowUps(days = 7): FollowUpsResponse {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);
  const allFollowups: UpcomingFollowUp[] = [];

  for (const lead of demoLeadsList) {
    const fups = demoLeadFollowUpsMap[lead.id];
    if (!fups) continue;
    for (const f of fups) {
      if (f.is_completed) continue;
      const dueDate = new Date(f.due_at);
      if (dueDate <= cutoff) {
        allFollowups.push({
          id: f.id, title: f.title, due_at: f.due_at,
          is_overdue: dueDate < now,
          lead_id: lead.id, lead_name: lead.name, lead_stage: lead.stage,
          created_at: f.created_at,
        });
      }
    }
  }

  allFollowups.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  return { followups: allFollowups, total: allFollowups.length };
}

// ─── Payment methods (reseller settings) ────────────────────────────
export const demoPaymentMethods: import('./types').PaymentMethodConfig[] = [
  {
    id: 1, user_id: 0, method_type: 'mpesa_paybill', label: 'Safaricom Paybill',
    is_active: true, mpesa_paybill_number: '600000',
    created_at: iso(50), updated_at: iso(2),
  },
  {
    id: 2, user_id: 0, method_type: 'bank_account', label: 'KCB Business Account',
    is_active: true, bank_paybill_number: '522522', bank_account_number: '1234567890',
    created_at: iso(45), updated_at: iso(5),
  },
  {
    id: 3, user_id: 0, method_type: 'mpesa_paybill_with_keys', label: 'Till Number',
    is_active: false, mpesa_shortcode: '987654',
    created_at: iso(20), updated_at: iso(20),
  },
];

// ─── Reseller-wide top usage (FUP) ──────────────────────────────────
export function demoResellerTopUsage(limit = 20): import('./types').ResellerTopUsageEntry[] {
  const pppoeCustomers = demoCustomers.filter(c => c.connection_type === 'pppoe');
  const entries = pppoeCustomers.slice(0, limit).map((c, i) => {
    const cap = c.plan.name.includes('Business') ? 200_000 : 100_000;
    const totalMb = Math.floor(cap * (0.3 + Math.random() * 0.85));
    return {
      customer_id: c.id,
      customer_name: c.name,
      pppoe_username: c.pppoe_username ?? `pppoe-${c.name.split(' ')[0].toLowerCase()}`,
      plan_name: c.plan.name,
      cap_mb: cap,
      total_mb: totalMb,
      percent_used: Math.round((totalMb / cap) * 100),
      fup_active: totalMb > cap,
    };
  });
  return entries.sort((a, b) => b.total_mb - a.total_mb).slice(0, limit);
}

// ─── Demo reseller users available for backfill ─────────────────────
const demoBackfillCandidates: Array<{
  user_id: number;
  email: string | null;
  name: string;
  stage: LeadStage;
  reason: string;
  signup_date: string;
}> = [
  { user_id: 101, email: 'active@demo-isp.co', name: 'Active Networks', stage: 'paying', reason: 'subscription.status=active, has completed payments', signup_date: iso(45).slice(0, 10) },
  { user_id: 102, email: 'cityfiber@demo-isp.co', name: 'CityFiber Solutions', stage: 'paying', reason: 'subscription.status=active, has completed payments', signup_date: iso(38).slice(0, 10) },
  { user_id: 103, email: 'speedlink@demo-isp.co', name: 'SpeedLink ISP', stage: 'paying', reason: 'has completed payments', signup_date: iso(30).slice(0, 10) },
  { user_id: 104, email: 'suspended@demo-isp.co', name: 'Old Towers Net', stage: 'churned', reason: 'subscription.status=suspended, has completed payments', signup_date: iso(120).slice(0, 10) },
  { user_id: 105, email: 'techsetup@demo-isp.co', name: 'Tech Setup Kenya', stage: 'installation_help', reason: 'has 2 router(s), no paying signal', signup_date: iso(14).slice(0, 10) },
  { user_id: 106, email: 'startup@demo-isp.co', name: 'Startup Reseller', stage: 'installation_help', reason: 'has 1 customer record, no paying signal', signup_date: iso(10).slice(0, 10) },
  { user_id: 107, email: 'newjoin1@demo-isp.co', name: 'New Join Networks', stage: 'signed_up', reason: 'registered, no routers/customers/payments yet', signup_date: iso(6).slice(0, 10) },
  { user_id: 108, email: 'newjoin2@demo-isp.co', name: 'Fresh Fiber', stage: 'signed_up', reason: 'registered, no routers/customers/payments yet', signup_date: iso(4).slice(0, 10) },
  { user_id: 109, email: 'newjoin3@demo-isp.co', name: 'Hello Net', stage: 'signed_up', reason: 'registered, no routers/customers/payments yet', signup_date: iso(2).slice(0, 10) },
];

let demoBackfillLeadCounter = 1000;

export function demoBackfillLeads(req: LeadBackfillRequest = {}): LeadBackfillResponse {
  const since = req.since && req.since !== 'all' ? req.since : null;
  const dryRun = !!req.dry_run;

  let candidates = demoBackfillCandidates;
  if (since) {
    candidates = candidates.filter(c => c.signup_date >= since);
  }

  const stageCounts: Partial<Record<LeadStage, number>> = {};
  const items: LeadBackfillItem[] = candidates.map(c => {
    stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
    return {
      user_id: c.user_id,
      email: c.email,
      name: c.name,
      stage: c.stage,
      reason: c.reason,
      signup_date: c.signup_date,
      lead_id: dryRun ? null : ++demoBackfillLeadCounter,
    };
  });

  const count = items.length;
  const message = dryRun
    ? `Dry run — ${count} reseller(s) would be backfilled.`
    : `Backfill complete — ${count} lead(s) created.`;

  return {
    since,
    dry_run: dryRun,
    admin_owner_id: 1,
    admin_owner_email: 'admin@demo-isp.co',
    source_id: 7,
    source_name: 'Website',
    candidates: count,
    leads_created: dryRun ? 0 : count,
    stage_counts: stageCounts,
    items,
    message,
  };
}

// ─── Shop Demo Data ──────────────────────────────────────────────────

export const demoShopProducts: ShopProduct[] = [
  {
    id: 1,
    name: 'MikroTik hAP ac²',
    description: 'The hAP ac² is MikroTik\'s flagship home and small-office dual-band wireless router. With five Gigabit Ethernet ports, concurrent 2.4 GHz and 5 GHz radios, and built-in USB for 3G/4G backup, it delivers enterprise-grade reliability at an accessible price point. Runs RouterOS for full ISP-grade configuration.',
    price: 4500.00,
    stock_quantity: 18,
    image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(30),
    sku: 'RBD52G-5HacD2HnD',
    brand: 'MikroTik',
    rating: 4.8,
    review_count: 47,
    warranty_months: 12,
    original_price: 5200.00,
    tags: ['bestseller', 'dual-band'],
    images: [
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    ],
    highlights: [
      '2.4 GHz + 5 GHz concurrent dual-band Wi-Fi',
      '5× Gigabit Ethernet ports (1 WAN + 4 LAN)',
      'USB port for 3G/4G modem backup',
      'RouterOS v7 — full ISP-grade control',
    ],
    specifications: [
      { label: 'CPU', value: 'IPQ-4018 716 MHz quad-core' },
      { label: 'RAM', value: '128 MB DDR3' },
      { label: 'Storage', value: '16 MB NAND' },
      { label: 'Ethernet Ports', value: '5× 10/100/1000 Mbps' },
      { label: 'Wi-Fi Standards', value: '802.11a/b/g/n/ac' },
      { label: '2.4 GHz Max Speed', value: '300 Mbps' },
      { label: '5 GHz Max Speed', value: '867 Mbps' },
      { label: 'Antennas', value: '2× internal dual-band' },
      { label: 'USB', value: '1× USB 2.0' },
      { label: 'Operating System', value: 'RouterOS v7 (Level 4)' },
      { label: 'Power Input', value: '12V DC / PoE-in (802.3af/at)' },
      { label: 'Power Consumption', value: '13W max' },
      { label: 'Dimensions', value: '140 × 105 × 38 mm' },
      { label: 'Weight', value: '231 g' },
      { label: 'Operating Temp', value: '-20°C to +60°C' },
    ],
  },
  {
    id: 2,
    name: 'MikroTik RB750Gr3 hEX',
    description: 'The hEX is a five-port Gigabit Ethernet router for locations where wireless connectivity is not required. An affordable option for SOHO or small-office routing with dual-core 880 MHz CPU and full RouterOS feature set including PPPoE, OSPF, BGP, and MPLS.',
    price: 3800.00,
    stock_quantity: 24,
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(25),
    sku: 'RB750Gr3',
    brand: 'MikroTik',
    rating: 4.7,
    review_count: 63,
    warranty_months: 12,
    tags: ['popular', 'wired'],
    images: [
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    ],
    highlights: [
      '5× Gigabit Ethernet ports with SFP',
      'Dual-core 880 MHz CPU for high throughput',
      'USB port for 3G/4G backup modem',
      'Full RouterOS — BGP, OSPF, MPLS ready',
    ],
    specifications: [
      { label: 'CPU', value: '880 MHz dual-core' },
      { label: 'RAM', value: '256 MB DDR3' },
      { label: 'Storage', value: '16 MB NAND' },
      { label: 'Ethernet Ports', value: '5× Gigabit + 1× SFP combo' },
      { label: 'USB', value: '1× USB 3.0' },
      { label: 'Operating System', value: 'RouterOS v7 (Level 4)' },
      { label: 'Power Input', value: '8–30V DC or PoE-in' },
      { label: 'Power Consumption', value: '7W max' },
      { label: 'Dimensions', value: '113 × 89 × 28 mm' },
      { label: 'Operating Temp', value: '-40°C to +70°C' },
    ],
  },
  {
    id: 3,
    name: 'TP-Link TL-WR841N',
    description: '300 Mbps wireless N router — the most affordable entry-level option for home hotspot setups. Two detachable 5 dBi antennas and two LAN ports make it ideal for deploying small hotspot zones for cafés, shops, and rental houses.',
    price: 1800.00,
    stock_quantity: 32,
    image_url: 'https://images.unsplash.com/photo-1593640408182-31c228b56028?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(22),
    sku: 'TL-WR841N-V14',
    brand: 'TP-Link',
    rating: 4.2,
    review_count: 134,
    warranty_months: 12,
    tags: ['budget', 'hotspot'],
    images: [
      'https://images.unsplash.com/photo-1593640408182-31c228b56028?w=800&q=80',
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    ],
    highlights: [
      '300 Mbps Wi-Fi on 2.4 GHz band',
      '2× 5 dBi detachable antennas',
      'Works with all ISP hotspot billing systems',
      'Budget-friendly — ideal for hotspot resellers',
    ],
    specifications: [
      { label: 'Wi-Fi Standard', value: '802.11b/g/n' },
      { label: 'Max Wi-Fi Speed', value: '300 Mbps (2.4 GHz)' },
      { label: 'Antennas', value: '2× 5 dBi detachable' },
      { label: 'Ethernet Ports', value: '1× WAN + 4× LAN (100 Mbps)' },
      { label: 'Power Input', value: '9V DC 0.6A' },
      { label: 'Dimensions', value: '200 × 130 × 35 mm' },
    ],
  },
  {
    id: 4,
    name: 'CAT6 UTP Outdoor Cable (305 m)',
    description: 'Full 305-metre spool of CAT6 UTP outdoor-rated cable. Gel-filled core with UV-resistant jacket — designed for aerial or direct-burial runs between buildings and towers. Suitable for structured cabling in ISP last-mile deployments.',
    price: 3800.00,
    stock_quantity: 15,
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    category: 'Cables',
    is_active: true,
    created_at: iso(20),
    sku: 'CAT6-OUT-305M',
    brand: 'Generic ISP Grade',
    rating: 4.6,
    review_count: 29,
    warranty_months: 6,
    tags: ['outdoor', 'bulk'],
    images: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
      'https://images.unsplash.com/photo-1620921592128-c68862d6e3af?w=800&q=80',
    ],
    highlights: [
      '305 m full spool — no splices needed',
      'UV-resistant outdoor-rated jacket',
      'Gel-filled for moisture protection',
      'Supports 1 Gbps up to 100 m runs',
    ],
    specifications: [
      { label: 'Cable Type', value: 'CAT6 UTP (Unshielded)' },
      { label: 'Length per Spool', value: '305 metres' },
      { label: 'Conductor', value: '23 AWG solid bare copper' },
      { label: 'Jacket', value: 'UV-resistant PE outdoor' },
      { label: 'Max Data Rate', value: '1 Gbps @ 100 m' },
      { label: 'Bandwidth', value: '250 MHz' },
      { label: 'Temperature', value: '-20°C to +60°C' },
      { label: 'Color', value: 'Black' },
    ],
  },
  {
    id: 5,
    name: 'CAT6 Ethernet Patch Cable (20 m)',
    description: 'Pre-made CAT6 UTP patch cable, 20 metres. Snagless RJ45 connectors both ends. Suitable for indoor structured cabling between routers, switches, and equipment racks.',
    price: 650.00,
    stock_quantity: 80,
    image_url: 'https://images.unsplash.com/photo-1620921592128-c68862d6e3af?w=800&q=80',
    category: 'Cables',
    is_active: true,
    created_at: iso(18),
    sku: 'CAT6-PATCH-20M',
    brand: 'Generic ISP Grade',
    rating: 4.4,
    review_count: 87,
    warranty_months: 6,
    images: [
      'https://images.unsplash.com/photo-1620921592128-c68862d6e3af?w=800&q=80',
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    ],
    highlights: [
      'Pre-terminated — plug and play',
      'Snagless RJ45 boots both ends',
      'Supports Gigabit (1000BASE-T)',
      'Indoor use — PVC jacket',
    ],
    specifications: [
      { label: 'Cable Type', value: 'CAT6 UTP' },
      { label: 'Length', value: '20 metres' },
      { label: 'Max Data Rate', value: '1 Gbps' },
      { label: 'Connectors', value: 'RJ45 snagless both ends' },
      { label: 'Color', value: 'Blue' },
    ],
  },
  {
    id: 6,
    name: 'Ubiquiti NanoStation loco M5',
    description: 'The NanoStation loco M5 is a compact 5 GHz 13 dBi airMAX CPE ideal for point-to-point links up to 15 km and WISP last-mile deployments. Features Ubiquiti\'s airMAX TDMA protocol for real-time outdoor performance in dense RF environments.',
    price: 6800.00,
    stock_quantity: 9,
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    category: 'CPE',
    is_active: true,
    created_at: iso(14),
    sku: 'NSM5-LOCO',
    brand: 'Ubiquiti',
    rating: 4.7,
    review_count: 38,
    warranty_months: 12,
    tags: ['wisp', 'long-range'],
    images: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',
    ],
    highlights: [
      '5 GHz airMAX CPE — up to 15 km range',
      '13 dBi antenna gain built-in',
      'Passive PoE powered — single cable install',
      'IP65 weatherproof for outdoor mounting',
    ],
    specifications: [
      { label: 'Processor', value: 'Atheros MIPS 24KC 400 MHz' },
      { label: 'RAM', value: '32 MB SDRAM' },
      { label: 'Flash', value: '8 MB' },
      { label: 'Frequency', value: '5150–5875 MHz' },
      { label: 'Gain', value: '13 dBi' },
      { label: 'Max TX Power', value: '23 dBm' },
      { label: 'Link Range', value: 'Up to 15 km' },
      { label: 'Ethernet', value: '1× 10/100 Mbps (PoE-in)' },
      { label: 'Power', value: '24V Passive PoE (included)' },
      { label: 'Weatherproofing', value: 'IP65' },
      { label: 'Operating Temp', value: '-30°C to +75°C' },
      { label: 'Wind Resistance', value: '200 km/h' },
    ],
  },
  {
    id: 7,
    name: 'TP-Link TL-SG1024D 24-Port Gigabit Switch',
    description: 'Unmanaged 24-port Gigabit desktop/rack switch. Auto-negotiation on all ports, steel housing, and fanless design for silent operation in server rooms and network closets. Plug-and-play — no configuration needed.',
    price: 7200.00,
    stock_quantity: 7,
    image_url: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
    category: 'Switches',
    is_active: true,
    created_at: iso(10),
    sku: 'TL-SG1024D',
    brand: 'TP-Link',
    rating: 4.5,
    review_count: 52,
    warranty_months: 36,
    tags: ['rack-mount', 'gigabit'],
    images: [
      'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
      'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
    ],
    highlights: [
      '24× Gigabit RJ45 ports — full wire speed',
      'Fanless & silent — rackmount or desktop',
      'Plug-and-play — no configuration needed',
      '48 Gbps switching capacity',
    ],
    specifications: [
      { label: 'Ports', value: '24× 10/100/1000 Mbps RJ45' },
      { label: 'Switching Capacity', value: '48 Gbps' },
      { label: 'Forwarding Rate', value: '35.7 Mpps' },
      { label: 'MAC Table', value: '8000 entries' },
      { label: 'Jumbo Frames', value: '16 KB' },
      { label: 'Management', value: 'Unmanaged' },
      { label: 'Rackmount', value: '1U, 19" rack (ears included)' },
      { label: 'Power', value: 'Internal, 220V AC' },
      { label: 'Power Consumption', value: '17.8W max' },
      { label: 'Operating Temp', value: '0°C to +40°C' },
      { label: 'Dimensions', value: '440 × 180 × 44 mm' },
    ],
  },
  {
    id: 8,
    name: 'RJ45 Professional Crimping Kit',
    description: 'All-in-one kit for field cable termination: professional ratcheting crimping tool, cable stripper, cable tester, and 100× RJ45 CAT5e/6 connectors. Ideal for ISP technicians doing on-site installations and cable runs.',
    price: 1400.00,
    stock_quantity: 14,
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    category: 'Tools',
    is_active: true,
    created_at: iso(12),
    sku: 'CRIMP-KIT-PRO',
    brand: 'Professional Grade',
    rating: 4.6,
    review_count: 41,
    warranty_months: 6,
    tags: ['field-kit'],
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80',
    ],
    highlights: [
      'Ratcheting crimper — perfect terminations every time',
      'Includes 100× RJ45 CAT5e/6 connectors',
      'Built-in cable tester — verify each run on-site',
      'Durable carry pouch included',
    ],
    specifications: [
      { label: 'Crimper Type', value: 'Ratcheting, 8P8C (RJ45)' },
      { label: 'Connectors Included', value: '100× RJ45 CAT5e/6' },
      { label: 'Tester', value: 'Yes — 8-wire continuity tester' },
      { label: 'Compatible Cable', value: 'CAT5 / CAT5e / CAT6 UTP/STP' },
      { label: 'Tool Material', value: 'Hardened steel + ABS grip' },
      { label: 'Includes', value: 'Crimper, stripper, tester, 100 RJ45s, pouch' },
    ],
  },
  {
    id: 9,
    name: 'MikroTik CCR2004-1G-12S+2XS',
    description: 'The Cloud Core Router 2004 is a high-performance ISP-grade core router with 12× SFP+ 10G ports and 2× 25G SFP28. Powered by a quad-core 1.7 GHz ARM Cortex-A72 processor and 4 GB RAM, it handles full BGP routing tables and multi-gigabit NAT at line rate.',
    price: 98000.00,
    stock_quantity: 3,
    image_url: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(8),
    sku: 'CCR2004-1G-12S+2XS',
    brand: 'MikroTik',
    rating: 4.9,
    review_count: 12,
    warranty_months: 12,
    tags: ['enterprise', 'core-router', '10G'],
    images: [
      'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
      'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    ],
    highlights: [
      '12× SFP+ 10G + 2× SFP28 25G ports',
      'Quad-core 1.7 GHz ARM64 — line-rate forwarding',
      'Full BGP table support with 4 GB RAM',
      '1U rackmount — data center ready',
    ],
    specifications: [
      { label: 'CPU', value: 'Quad-core 1.7 GHz ARM Cortex-A72' },
      { label: 'RAM', value: '4 GB DDR4' },
      { label: 'Storage', value: '128 MB NAND' },
      { label: '10G SFP+ Ports', value: '12× SFP+' },
      { label: '25G SFP28 Ports', value: '2× SFP28' },
      { label: 'Gigabit Ports', value: '1× RJ45 management' },
      { label: 'Operating System', value: 'RouterOS v7 (Level 6)' },
      { label: 'Throughput', value: '>26 Mpps' },
      { label: 'Power Supply', value: 'Dual hot-swap PSU' },
      { label: 'Form Factor', value: '1U rackmount, 19"' },
      { label: 'Operating Temp', value: '0°C to +45°C' },
    ],
  },
  {
    id: 10,
    name: 'Outdoor Weatherproof Enclosure',
    description: 'IP67-rated ABS plastic enclosure for mounting outdoor network equipment such as switches, PoE injectors, or media converters at tower sites or building rooftops. Pre-installed cable glands and DIN rail mounting bracket.',
    price: 2800.00,
    stock_quantity: 5,
    image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',
    category: 'Accessories',
    is_active: true,
    created_at: iso(6),
    sku: 'ENC-IP67-300',
    brand: 'Generic ISP Grade',
    rating: 4.3,
    review_count: 17,
    warranty_months: 6,
    tags: ['outdoor', 'weatherproof'],
    images: [
      'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',
    ],
    highlights: [
      'IP67 — completely dust and waterproof',
      'DIN rail inside — fits standard equipment',
      '4× pre-installed cable glands',
      'UV-stabilised ABS — no rust or corrosion',
    ],
    specifications: [
      { label: 'Protection', value: 'IP67 (dust-tight, waterproof)' },
      { label: 'Internal Dimensions', value: '300 × 250 × 150 mm' },
      { label: 'Material', value: 'UV-stabilised ABS plastic' },
      { label: 'Cable Glands', value: '4× M16 pre-installed' },
      { label: 'Mounting', value: 'Wall mount + internal DIN rail' },
      { label: 'Lock', value: 'Keyed polycarbonate window latch' },
      { label: 'Operating Temp', value: '-40°C to +70°C' },
      { label: 'Color', value: 'Light grey RAL 7035' },
    ],
  },

  // ─── Starlink ─────────────────────────────────────────────────────
  {
    id: 11,
    name: 'Starlink Standard Kit (Gen 3)',
    description: 'You\'ve built your tower. You\'ve pulled the cable. But the fibre backhaul from the city still has a 3-month wait. Starlink ends that wait permanently.\n\nThe Gen 3 Standard Kit gives you 50–200 Mbps from Low Earth Orbit — no ground infrastructure, no fibre contracts, no waiting. Just point it at the sky. It self-aligns, self-heats in bad weather, and your customers notice nothing except a faster, more reliable connection.\n\nMany ISPs in Kenya are using Starlink as primary or backup backhaul at remote towers. This kit includes the dish, mounting pole, Wi-Fi router, and 15 m cable. Monthly subscription (billed separately) starts at ~KES 5,500/month for residential or ~KES 22,000/month for business.',
    price: 68000.00,
    stock_quantity: 6,
    image_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
    category: 'Starlink',
    is_active: true,
    created_at: iso(5),
    sku: 'SL-STD-GEN3',
    brand: 'SpaceX / Starlink',
    rating: 4.9,
    review_count: 31,
    warranty_months: 12,
    original_price: 75000.00,
    tags: ['bestseller', 'new'],
    images: [
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
      'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    ],
    highlights: [
      '50–200 Mbps with ~20–40 ms latency anywhere in Kenya',
      'Self-aligns automatically — no technical setup needed',
      'Works at remote towers with zero fibre infrastructure',
      'Includes dish, router, pole mount, and 15 m cable',
    ],
    specifications: [
      { label: 'Download Speed', value: '50–200 Mbps (typical)' },
      { label: 'Upload Speed', value: '10–20 Mbps (typical)' },
      { label: 'Latency', value: '20–40 ms' },
      { label: 'Dish Type', value: 'Phased array, self-aligning' },
      { label: 'Field of View', value: '100°' },
      { label: 'Cable Length', value: '15 m (included)' },
      { label: 'Wi-Fi Router', value: 'Dual-band Wi-Fi 5 (included)' },
      { label: 'Power Consumption', value: '50–75W (dish + router)' },
      { label: 'Weatherproofing', value: 'IP54, built-in snow melt' },
      { label: 'Operating Temp', value: '-30°C to +50°C' },
      { label: 'Wind Rating', value: 'Up to 130 km/h' },
      { label: 'Monthly Sub (Residential)', value: '~KES 5,500/month' },
      { label: 'Monthly Sub (Business)', value: '~KES 22,000/month' },
    ],
  },
  {
    id: 12,
    name: 'Starlink Mini',
    description: 'Field teams, mobile command units, remote clinics, and ISP installers who need internet anywhere — the Starlink Mini is the compact version of the standard dish, weighing just 1.1 kg and fitting in a backpack.\n\nAt KES 45,000, it\'s the most portable satellite internet solution available in Kenya. You can power it off a car battery or small solar panel. Same LEO satellites, same speeds, fraction of the size.',
    price: 45000.00,
    stock_quantity: 4,
    image_url: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&q=80',
    category: 'Starlink',
    is_active: true,
    created_at: iso(3),
    sku: 'SL-MINI-V1',
    brand: 'SpaceX / Starlink',
    rating: 4.7,
    review_count: 14,
    warranty_months: 12,
    tags: ['new', 'portable'],
    images: [
      'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800&q=80',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80',
    ],
    highlights: [
      'Weighs just 1.1 kg — fits in a backpack',
      '25–100 Mbps anywhere in Kenya',
      'Runs on 30W — car battery or small solar',
      'Great for mobile deployments & field teams',
    ],
    specifications: [
      { label: 'Download Speed', value: '25–100 Mbps (typical)' },
      { label: 'Upload Speed', value: '5–10 Mbps (typical)' },
      { label: 'Latency', value: '20–40 ms' },
      { label: 'Weight', value: '1.1 kg' },
      { label: 'Dimensions', value: '298 × 259 mm' },
      { label: 'Power Consumption', value: '~30W' },
      { label: 'Connector', value: 'USB-C power' },
      { label: 'Operating Temp', value: '-20°C to +40°C' },
      { label: 'Monthly Sub (Mobile)', value: '~KES 5,500/month' },
    ],
  },

  // ─── Access Points ─────────────────────────────────────────────────
  {
    id: 13,
    name: 'Ubiquiti UniFi U6 Lite',
    description: 'Wi-Fi 6 ceiling-mount access point built for venues where dozens of devices compete for bandwidth — hotels, offices, co-working spaces, and ISP customer lounges.\n\nAt 1.5 Gbps aggregate throughput and OFDMA multi-user scheduling, the U6 Lite handles the dense client environments that throttle cheaper APs. Managed centrally via UniFi Network Controller or Bitwave hotspot integration.',
    price: 9500.00,
    stock_quantity: 11,
    image_url: 'https://images.unsplash.com/photo-1525596662741-e994a3f4c43a?w=800&q=80',
    category: 'Access Points',
    is_active: true,
    created_at: iso(9),
    sku: 'U6-LITE',
    brand: 'Ubiquiti',
    rating: 4.8,
    review_count: 56,
    warranty_months: 12,
    tags: ['wifi6', 'popular'],
    images: [
      'https://images.unsplash.com/photo-1525596662741-e994a3f4c43a?w=800&q=80',
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    ],
    highlights: [
      'Wi-Fi 6 (802.11ax) — handles 300+ simultaneous clients',
      '1.5 Gbps aggregate dual-band throughput',
      'PoE-powered — single cable install, no power outlet needed',
      'Pairs with Bitwave hotspot for captive portal billing',
    ],
    specifications: [
      { label: 'Wi-Fi Standard', value: '802.11ax (Wi-Fi 6)' },
      { label: '2.4 GHz Speed', value: '300 Mbps' },
      { label: '5 GHz Speed', value: '1,200 Mbps' },
      { label: 'Aggregate Throughput', value: '1.5 Gbps' },
      { label: 'Spatial Streams', value: '2× 2 (2.4 GHz) + 2× 2 (5 GHz)' },
      { label: 'Max Clients', value: '300+' },
      { label: 'Power', value: '802.3af PoE (12W)' },
      { label: 'Mounting', value: 'Ceiling / wall (mount included)' },
      { label: 'Management', value: 'UniFi Controller (cloud or local)' },
      { label: 'Dimensions', value: '160 mm diameter × 32 mm' },
    ],
  },
  {
    id: 14,
    name: 'MikroTik wAP ax (Wi-Fi 6)',
    description: 'A compact, weatherproof Wi-Fi 6 access point that installs on walls, poles, or ceilings — indoors or outdoors. The wAP ax is what ISPs use when they need to give a customer premises-level access point that\'s managed from RouterOS along with the rest of their network.\n\nSimple to deploy, impossible to kill. IP55 rated, -40°C operating range.',
    price: 6800.00,
    stock_quantity: 15,
    image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    category: 'Access Points',
    is_active: true,
    created_at: iso(11),
    sku: 'RBwAPGax-5HaxD2HaxD',
    brand: 'MikroTik',
    rating: 4.6,
    review_count: 28,
    warranty_months: 12,
    images: [
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    ],
    highlights: [
      'Wi-Fi 6 dual-band — indoor and outdoor rated (IP55)',
      'RouterOS managed — same dashboard as your routers',
      'PoE-in for single-cable wall or pole mounting',
      'Handles 200+ concurrent hotspot clients',
    ],
    specifications: [
      { label: 'Wi-Fi Standard', value: '802.11ax (Wi-Fi 6)' },
      { label: '2.4 GHz Speed', value: '300 Mbps' },
      { label: '5 GHz Speed', value: '1,200 Mbps' },
      { label: 'Ethernet', value: '2× Gigabit RJ45 (PoE-in on port 1)' },
      { label: 'Operating System', value: 'RouterOS v7' },
      { label: 'Weatherproofing', value: 'IP55' },
      { label: 'Power', value: '24V PoE or direct DC' },
      { label: 'Operating Temp', value: '-40°C to +70°C' },
      { label: 'Dimensions', value: '142 × 53 × 30 mm' },
    ],
  },

  // ─── Tenda / Budget Routers ─────────────────────────────────────────
  {
    id: 15,
    name: 'Tenda F3 300Mbps Wireless Router',
    description: 'The cheapest router your hotspot customers will ever need — and it does the job reliably. Three 5 dBi antennas, WPA2 security, and stable 2.4 GHz Wi-Fi at a price that makes sense for rental house owners and small shops buying in bulk.\n\nWhen price matters more than raw performance, this is your router.',
    price: 1350.00,
    stock_quantity: 55,
    image_url: 'https://images.unsplash.com/photo-1593640408182-31c228b56028?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(19),
    sku: 'TENDA-F3-V9',
    brand: 'Tenda',
    rating: 4.0,
    review_count: 112,
    warranty_months: 12,
    tags: ['budget'],
    images: [
      'https://images.unsplash.com/photo-1593640408182-31c228b56028?w=800&q=80',
    ],
    highlights: [
      '3× 5 dBi antennas for wider coverage',
      '300 Mbps on 2.4 GHz — enough for 10–15 users',
      'Easiest setup: 1-minute web wizard',
      'Ideal for hotspot bulk deployments',
    ],
    specifications: [
      { label: 'Wi-Fi Standard', value: '802.11b/g/n' },
      { label: 'Max Speed', value: '300 Mbps' },
      { label: 'Antennas', value: '3× 5 dBi omni fixed' },
      { label: 'Ports', value: '1× WAN + 3× LAN (100 Mbps)' },
      { label: 'Power', value: '9V DC 0.6A' },
      { label: 'Coverage', value: '~100 m²' },
    ],
  },
  {
    id: 16,
    name: 'Tenda AC10 Pro Dual-Band AC1200',
    description: 'When your hotspot customers start complaining about buffering on YouTube, it\'s usually not your backhaul — it\'s their 2.4 GHz-only router struggling with interference from 30 neighbours.\n\nThe AC10 Pro gives them 5 GHz 802.11ac and MU-MIMO. Clean, fast, interference-free Wi-Fi at an ISP-friendly price.',
    price: 2800.00,
    stock_quantity: 23,
    image_url: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    category: 'Routers',
    is_active: true,
    created_at: iso(16),
    sku: 'TENDA-AC10PRO',
    brand: 'Tenda',
    rating: 4.3,
    review_count: 74,
    warranty_months: 12,
    tags: ['dual-band'],
    images: [
      'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=800&q=80',
    ],
    highlights: [
      'AC1200 — 300 Mbps (2.4G) + 867 Mbps (5G)',
      'MU-MIMO — serves 4 devices simultaneously',
      'Beamforming for longer range',
      'Parental controls & QoS built-in',
    ],
    specifications: [
      { label: 'Wi-Fi Standard', value: '802.11ac (Wi-Fi 5)' },
      { label: '2.4 GHz Speed', value: '300 Mbps' },
      { label: '5 GHz Speed', value: '867 Mbps' },
      { label: 'Antennas', value: '4× 6 dBi dual-band fixed' },
      { label: 'Ports', value: '1× WAN + 3× LAN (1 Gbps)' },
      { label: 'USB', value: '1× USB 2.0 (file sharing)' },
      { label: 'Power', value: '12V DC 1.5A' },
    ],
  },

  // ─── Enterprise / Tender Routers ────────────────────────────────────
  {
    id: 17,
    name: 'MikroTik CCR1036-12G-4S+ Enterprise Router',
    description: 'Tenders require performance that can be documented, tested, and justified on paper. The CCR1036 justifies itself: 36-core Tilera processor, 4 GB RAM, 12 Gigabit ports, 4× 10G SFP+.\n\nThis is the router county governments, data centres, and ISPs handling 1,000+ PPPoE sessions use when procurement specs demand serious hardware. Dual PSU slots. Full RouterOS Level 6. Documented throughput of 16+ Mpps.',
    price: 145000.00,
    stock_quantity: 2,
    image_url: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
    category: 'Enterprise Routers',
    is_active: true,
    created_at: iso(4),
    sku: 'CCR1036-12G-4S+',
    brand: 'MikroTik',
    rating: 4.9,
    review_count: 8,
    warranty_months: 12,
    tags: ['enterprise', 'tender', '10G'],
    images: [
      'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
      'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
    ],
    highlights: [
      '36-core Tilera CPU — handles 1,000+ PPPoE sessions',
      '4× 10G SFP+ uplinks for multi-gigabit WAN',
      'Dual hot-swap PSU slots — no downtime on PSU failure',
      'RouterOS Level 6 — BGP, OSPF, MPLS, full feature set',
    ],
    specifications: [
      { label: 'CPU', value: 'Tilera TILE-Gx36 1.2 GHz (36 cores)' },
      { label: 'RAM', value: '4 GB DDR3' },
      { label: 'Storage', value: '128 MB NAND' },
      { label: 'Gigabit Ports', value: '12× RJ45 10/100/1000' },
      { label: '10G SFP+ Ports', value: '4× SFP+' },
      { label: 'USB', value: '2× USB 2.0' },
      { label: 'Power Supply', value: 'Dual hot-swap (one included)' },
      { label: 'RouterOS Level', value: 'Level 6 (unlimited users)' },
      { label: 'Max Throughput', value: '16+ Mpps' },
      { label: 'Form Factor', value: '1U rackmount 19"' },
      { label: 'Operating Temp', value: '0°C to +45°C' },
    ],
  },
  {
    id: 18,
    name: 'Cisco SG350-28P 28-Port PoE Switch',
    description: 'Some tenders specifically require Cisco. This is the one to quote.\n\nThe SG350-28P is a managed Layer 3 switch with 24 PoE+ ports (195W total budget), 2× SFP uplinks, and Cisco\'s full CLI and web management. VLAN, QoS, ACL, SNMP — everything a government or enterprise network specification will ask for, at a price point that makes the tender winnable.',
    price: 89000.00,
    stock_quantity: 3,
    image_url: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
    category: 'Enterprise Routers',
    is_active: true,
    created_at: iso(2),
    sku: 'SG350-28P-K9-EU',
    brand: 'Cisco',
    rating: 4.8,
    review_count: 11,
    warranty_months: 60,
    tags: ['enterprise', 'tender', 'poe'],
    images: [
      'https://images.unsplash.com/photo-1597733336794-12d05021d510?w=800&q=80',
      'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80',
    ],
    highlights: [
      '24× PoE+ ports — 195W total power budget',
      'Layer 3 managed — VLAN, QoS, ACL, OSPF',
      'Cisco brand — meets government tender specifications',
      '5-year manufacturer warranty',
    ],
    specifications: [
      { label: 'PoE Ports', value: '24× 10/100/1000 PoE+ (IEEE 802.3at)' },
      { label: 'Uplinks', value: '2× Gigabit RJ45 + 2× SFP combo' },
      { label: 'PoE Budget', value: '195W' },
      { label: 'Switching Capacity', value: '56 Gbps' },
      { label: 'Forwarding Rate', value: '41.7 Mpps' },
      { label: 'Routing', value: 'Layer 3 static + OSPF' },
      { label: 'Management', value: 'CLI, Web GUI, SNMP v1/v2c/v3' },
      { label: 'VLANs', value: '4096' },
      { label: 'MAC Table', value: '16,384' },
      { label: 'Form Factor', value: '1U rackmount 19"' },
      { label: 'Warranty', value: '5 years' },
    ],
  },
];

export const demoShopOrders: ShopOrder[] = [
  {
    id: 42,
    order_number: 'ORD3A9F1C2B',
    buyer_name: 'Jane Doe',
    buyer_phone: '0712345678',
    buyer_email: 'jane@example.com',
    delivery_address: '123 Ngong Road, Nairobi',
    total_amount: 9000.00,
    status: 'confirmed',
    payment_status: 'paid',
    mpesa_receipt_number: 'QJK3X1Y2Z4',
    notes: null,
    created_at: iso(0, 2),
    items: [
      { id: 10, product_id: 1, product_name: 'Mikrotik hAP ac²', product_price: 4500.00, quantity: 2, subtotal: 9000.00 },
    ],
    tracking_history: [
      { id: 1, status_label: 'Payment confirmed', note: 'M-Pesa receipt: QJK3X1Y2Z4', created_at: iso(0, 2) },
    ],
  },
  {
    id: 43,
    order_number: 'ORD7B2E4D1F',
    buyer_name: 'John Kamau',
    buyer_phone: '0722111222',
    buyer_email: null,
    delivery_address: 'Westlands, Nairobi',
    total_amount: 1800.00,
    status: 'shipped',
    payment_status: 'paid',
    mpesa_receipt_number: 'PQR1234567',
    notes: 'Call before delivery',
    created_at: iso(1),
    items: [
      { id: 11, product_id: 2, product_name: 'TP-Link TL-WR841N', product_price: 1800.00, quantity: 1, subtotal: 1800.00 },
    ],
    tracking_history: [
      { id: 2, status_label: 'Payment confirmed', note: null, created_at: iso(1) },
      { id: 3, status_label: 'Dispatched from warehouse', note: 'Rider en route', created_at: iso(0, 8) },
    ],
  },
  {
    id: 44,
    order_number: 'ORD5C3F7A8E',
    buyer_name: 'Mary Wanjiku',
    buyer_phone: '0733444555',
    buyer_email: 'mary@example.com',
    delivery_address: null,
    total_amount: 1850.00,
    status: 'pending',
    payment_status: 'unpaid',
    mpesa_receipt_number: null,
    notes: null,
    created_at: iso(0, 1),
    items: [
      { id: 12, product_id: 3, product_name: 'CAT6 Ethernet Cable (20m)', product_price: 650.00, quantity: 1, subtotal: 650.00 },
      { id: 13, product_id: 4, product_name: 'RJ45 Crimping Kit', product_price: 1200.00, quantity: 1, subtotal: 1200.00 },
    ],
    tracking_history: [],
  },
  {
    id: 45,
    order_number: 'ORD8D1B9C3A',
    buyer_name: 'Peter Otieno',
    buyer_phone: '0700888999',
    buyer_email: null,
    delivery_address: 'Kisumu Town',
    total_amount: 4500.00,
    status: 'delivered',
    payment_status: 'paid',
    mpesa_receipt_number: 'XYZ9876543',
    notes: null,
    created_at: iso(3),
    items: [
      { id: 14, product_id: 1, product_name: 'Mikrotik hAP ac²', product_price: 4500.00, quantity: 1, subtotal: 4500.00 },
    ],
    tracking_history: [
      { id: 4, status_label: 'Payment confirmed', note: null, created_at: iso(3) },
      { id: 5, status_label: 'Dispatched', note: null, created_at: iso(2, 4) },
      { id: 6, status_label: 'Delivered', note: 'Customer received', created_at: iso(2) },
    ],
  },
  {
    id: 46,
    order_number: 'ORD2A4C6E8F',
    buyer_name: 'Grace Njeri',
    buyer_phone: '0711222333',
    buyer_email: null,
    delivery_address: 'Mombasa Road',
    total_amount: 1300.00,
    status: 'cancelled',
    payment_status: 'unpaid',
    mpesa_receipt_number: null,
    notes: 'Customer changed mind',
    created_at: iso(4),
    items: [
      { id: 15, product_id: 3, product_name: 'CAT6 Ethernet Cable (20m)', product_price: 650.00, quantity: 2, subtotal: 1300.00 },
    ],
    tracking_history: [],
  },
];

export const demoShopDashboard: ShopDashboard = {
  revenue: {
    today: 10800.00,
    this_week: 67200.00,
    this_month: 241000.00,
    all_time: 1850000.00,
  },
  orders: {
    total: 46,
    by_status: {
      pending: 3,
      confirmed: 5,
      processing: 2,
      shipped: 4,
      delivered: 30,
      cancelled: 2,
    },
    by_payment: {
      unpaid: 4,
      paid: 40,
      refunded: 2,
    },
    pending_payment: 4,
    needs_fulfillment: 7,
  },
  top_products: [
    { product_id: 1, product_name: 'Mikrotik hAP ac²', units_sold: 42, revenue: 189000.00 },
    { product_id: 2, product_name: 'TP-Link TL-WR841N', units_sold: 28, revenue: 50400.00 },
    { product_id: 3, product_name: 'CAT6 Ethernet Cable (20m)', units_sold: 35, revenue: 22750.00 },
    { product_id: 4, product_name: 'RJ45 Crimping Kit', units_sold: 12, revenue: 14400.00 },
  ],
  recent_orders: demoShopOrders.slice(0, 5),
  generated_at: iso(),
};

export const demoShopAnalytics: ShopAnalytics = {
  period: { label: 'Last 30 Days', start: dateStr(30), end: dateStr(0) },
  summary: {
    total_revenue: 241000.00,
    total_orders: 58,
    unique_buyers: 42,
    avg_order_value: 4155.17,
  },
  daily_trend: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    const orders = Math.floor(Math.random() * 4);
    return { date: d.toISOString().split('T')[0], label, orders, revenue: orders * 4500 };
  }),
  top_products: [
    { product_id: 1, product_name: 'Mikrotik hAP ac²', units_sold: 22, revenue: 99000.00 },
    { product_id: 2, product_name: 'TP-Link TL-WR841N', units_sold: 15, revenue: 27000.00 },
  ],
  revenue_by_status: [
    { status: 'delivered', orders: 48, revenue: 216000.00 },
    { status: 'confirmed', orders: 8, revenue: 36000.00 },
    { status: 'cancelled', orders: 2, revenue: 9000.00 },
  ],
  generated_at: iso(),
};

// ─── Error message for write operations ─────────────────────────────
export const DEMO_WRITE_ERROR = 'This action is not available in demo mode. Sign up for a free account to get started!';
