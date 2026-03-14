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
  },
  {
    id: 2, name: 'Westlands Hub', identity: 'MikroTik-Westlands', ip_address: '41.89.12.102', port: 8728,
    auth_method: 'DIRECT_API', payment_methods: ['mpesa'], pppoe_ports: ['ether2'],
    status: 'online', status_is_stale: false, status_age_seconds: 30, status_last_checked_at: iso(0, 0),
    last_online_at: iso(0, 0), status_source: 'health_check', availability_checks: 2880, availability_successes: 2860,
  },
  {
    id: 3, name: 'South-B Relay', identity: 'MikroTik-SouthB', ip_address: '41.89.12.103', port: 8728,
    auth_method: 'RADIUS', payment_methods: ['mpesa', 'voucher'], pppoe_ports: ['ether2', 'ether3', 'ether4'],
    status: 'offline', status_is_stale: false, status_age_seconds: 120, status_last_checked_at: iso(0, 0),
    last_online_at: iso(0, 2), status_source: 'health_check', availability_checks: 2880, availability_successes: 2700,
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
      service: (i === 0 ? 'unassigned' : i <= 2 ? 'hotspot' : 'pppoe') as 'hotspot' | 'pppoe' | 'unassigned',
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
    { '.id': '*3', 'dst-host': '*.bitwavetechnologies.net', action: 'allow', comment: 'Billing portal' },
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
  { id: 1, token: 'demo-prov-abc123', router_name: 'New Router', identity: 'MikroTik-New', wireguard_ip: '10.99.0.5', status: 'pending', expired: false, command: '/system/script/run provision', created_at: iso(1), provisioned_at: null, router_id: null },
];

// ─── Error message for write operations ─────────────────────────────
export const DEMO_WRITE_ERROR = 'This action is not available in demo mode. Sign up for a free account to get started!';
