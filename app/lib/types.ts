// Dashboard Analytics Types
export interface AnalyticsSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalUniqueUsers: number;
  uniqueCustomers: number;
  avgRevenuePerDay: number;
  avgTransactionsPerDay: number;
}

export interface TodayStats {
  date: string;
  revenue: number;
  transactions: number;
  hourlyCumulative: HourlyCumulative[];
}

export interface Averages {
  dailyRevenue: number;
  dailyTransactions: number;
  transactionValue: number;
  revenuePerCustomer: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
}

export interface DailyTrend {
  date: string;
  label: string;
  transactions: number;
  revenue: number;
  users: number;
}

export interface HourlyPattern {
  hour: number;
  transactions: number;
  revenue: number;
}

export interface HourlyCumulative {
  hour: number;
  hourLabel: string;
  revenue: number;
  transactions: number;
  cumulativeRevenue: number;
  cumulativeTransactions: number;
}

export interface PlanPerformance {
  name: string;
  count: number;
  revenue: number;
  color?: string;
}

export interface TopSpender {
  phone: string;
  amount: number;
}

export interface UserPurchaseCounts {
  "1_purchase": number;
  "2_purchases": number;
  "3_purchases": number;
  "4plus_purchases": number;
}

export interface DayDetail {
  date: string;
  dateLabel: string;
  totalTransactions: number;
  totalRevenue: number;
  uniqueUsers: number;
  avgDailySpendPerUser: number;
  repeatCustomers: number;
  repeatCustomerPercent: number;
  plans: PlanPerformance[];
  hourlyActivity: Record<string, number>;
  hourlyRevenue: Record<string, number>;
  hourlyCumulative: HourlyCumulative[];
  hourlyByPlan: Record<string, Record<string, number>>;
  topSpenders: TopSpender[];
  firstTransaction: string;
  lastTransaction: string;
  userPurchaseCounts: UserPurchaseCounts;
}

export interface DashboardAnalytics {
  extractedAt: string;
  periodDays: number;
  summary: AnalyticsSummary;
  today: TodayStats;
  averages: Averages;
  activeCustomers: number;
  dailyTrend: DailyTrend[];
  hourlyPattern: HourlyPattern[];
  planPerformance: PlanPerformance[];
  days: Record<string, DayDetail>;
  mikrotik?: unknown;
}

// Legacy Dashboard Types (kept for compatibility)
export interface Revenue {
  today: number;
  this_week: number;
  this_month: number;
  all_time: number;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
}

export interface RevenueByRouter {
  router_id: number;
  router_name: string;
  transaction_count: number;
  revenue: number;
}

export interface RevenueByPlan {
  plan_id: number;
  plan_name: string;
  plan_price: number;
  sales_count: number;
  revenue: number;
}

export interface RecentTransaction {
  payment_id: number;
  amount: number;
  customer_name: string;
  customer_phone: string;
  plan_name: string;
  payment_date: string;
  payment_method: string;
}

export interface ExpiringCustomer {
  id: number;
  name: string;
  phone: string;
  expiry: string;
  plan_name: string;
}

export interface DashboardOverview {
  revenue: Revenue;
  customers: CustomerStats;
  revenue_by_router: RevenueByRouter[];
  revenue_by_plan: RevenueByPlan[];
  recent_transactions: RecentTransaction[];
  expiring_soon: ExpiringCustomer[];
  generated_at: string;
}

// Customer Types
export interface CustomerPlan {
  id: number;
  name: string;
  price: number;
  connection_type?: 'hotspot' | 'pppoe';
}

export interface CustomerRouter {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  mac_address: string;
  status: 'active' | 'inactive' | 'expired';
  expiry: string;
  hours_remaining?: number;
  plan: CustomerPlan;
  plan_id?: number;
  router: CustomerRouter;
  router_id?: number;
  connection_type?: 'hotspot' | 'pppoe';
  pppoe_username?: string;
  static_ip?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  plan_id?: number;
  router_id?: number;
  mac_address?: string;
  pppoe_username?: string;
  pppoe_password?: string;
  static_ip?: string;
  expiry?: string;
}

export interface UpdateCustomerResponse {
  success: boolean;
  customer: Customer;
  pppoe_reprovisioned: 'ok' | 'failed' | null;
}

export interface DeleteCustomerResponse {
  success: boolean;
  message: string;
  customer_id: number;
  pppoe_deprovisioned: 'ok' | 'failed' | null;
}

// PPPoE Types
export interface RegisterCustomerRequest {
  name: string;
  phone: string;
  plan_id: number;
  router_id: number;
  pppoe_username?: string;
  pppoe_password?: string;
  mac_address?: string | null;
  static_ip?: string | null;
}

export interface ActivatePPPoERequest {
  payment_method?: 'cash' | 'mpesa' | 'voucher';
  payment_reference?: string;
  notes?: string;
}

export interface PPPoECredentials {
  pppoe_username: string;
  pppoe_password: string;
  customer_name: string;
  status: string;
}

export interface PPPoESession {
  user: string;
  address: string;
  uptime: string;
  bytes_in: number;
  bytes_out: number;
  caller_id?: string;
  service?: string;
}

export interface PPPoEActiveResponse {
  router_id: number;
  router_name: string;
  sessions: PPPoESession[];
  total_sessions: number;
}

export interface RouterInterfaceInfo {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  comment?: string;
  mac_address?: string;
  default_name?: string;
}

export interface RouterInterfacesResponse {
  router_id: number;
  router_name: string;
  interfaces: RouterInterfaceInfo[];
  pppoe_ports: string[];
  plain_ports?: string[];
  dual_ports?: string[];
}

export interface UpdatePPPoEPortsRequest {
  ports: string[];
}

export interface UpdatePPPoEPortsResponse {
  router_id: number;
  router_name: string;
  pppoe_ports: string[];
  message: string;
}

export interface UpdatePlainPortsRequest {
  ports: string[];
}

export interface UpdatePlainPortsResponse {
  success: boolean;
  router_id: number;
  plain_ports: string[];
  warnings: string[];
  message: string;
}

export interface UpdateDualPortsRequest {
  ports: string[];
}

export interface UpdateDualPortsResponse {
  success: boolean;
  router_id: number;
  dual_ports: string[];
  warnings: string[];
  message: string;
  migrated_from_pppoe?: string[];
  pppoe_ports?: string[];
  migrated_from_plain?: string[];
  plain_ports?: string[] | null;
}

// Plan Types
export interface Plan {
  id: number;
  name: string;
  price: number;
  duration_value: number;
  duration_unit: string;
  download_speed: string;
  upload_speed: string;
  speed?: string;
  connection_type?: string;
  router_profile?: string;
  user_id?: number;
  created_at?: string;
  is_hidden?: boolean;
  plan_type?: 'regular' | 'emergency';
  badge_text?: string | null;
  original_price?: number | null;
  valid_until?: string | null;
}

export interface CreatePlanRequest {
  name: string;
  speed: string;
  price: number;
  duration_value: number;
  duration_unit: 'HOURS' | 'DAYS' | 'MINUTES';
  connection_type: 'hotspot' | 'pppoe';
  router_profile?: string;
  user_id?: number;
  plan_type?: 'regular' | 'emergency';
  is_hidden?: boolean;
  badge_text?: string | null;
  original_price?: number | null;
  valid_until?: string | null;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  is_hidden?: boolean;
}

export interface PlanPerformanceDetail {
  plan_id: number;
  plan_name: string;
  plan_price: number;
  duration: string;
  total_customers: number;
  total_sales: number;
  total_revenue: number;
  average_revenue_per_sale: number;
  active_customers: number;
}

export interface PlanPerformanceResponse {
  plans: PlanPerformanceDetail[];
  period: {
    start_date: string;
    end_date: string;
  };
}

// Generic pagination wrapper
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Transaction Types
export interface TransactionCustomer {
  id: number;
  name: string;
  phone: string;
  mac_address: string;
  status: string;
}

export interface TransactionRouter {
  id: number;
  name: string;
  ip_address: string;
  auth_method: 'DIRECT_API' | 'RADIUS' | null;
}

export interface TransactionPlan {
  id: number;
  name: string;
  price: number;
  duration_value: number;
  duration_unit: string;
  connection_type: 'hotspot' | 'pppoe' | 'static_ip' | null;
}

export interface MpesaTransaction {
  transaction_id: number;
  checkout_request_id: string | null;
  phone_number: string;
  amount: number;
  reference: string | null;
  lipay_tx_no: string | null;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  payment_method: 'mobile_money' | 'cash' | 'card' | 'bank_transfer' | 'other';
  payment_reference: string | null;
  mpesa_receipt_number: string | null;
  transaction_date: string | null;
  created_at: string;
  failure_source?: 'client' | 'server' | 'timeout' | 'mpesa' | string | null;
  result_code?: string | null;
  result_desc?: string | null;
  customer: TransactionCustomer;
  router: TransactionRouter;
  plan: TransactionPlan;
  manual_provision_supported: boolean;
  manual_provision_reason: string | null;
}

export interface ManualProvisionResponse {
  success: boolean;
  payment_method: string;
  transaction_id: number;
  reference: string | null;
  customer_id: number;
  router_id: number;
  router_name: string;
  provisioning_error: string | null;
  provisioning_result: {
    message: string;
    user_details: {
      username: string;
      mac_address: string;
      time_limit: string;
      bandwidth_limit: string;
      rate_limit: string;
      profile: string;
    };
    success: boolean;
    provisioning_error: string | null;
  } | null;
}

export interface StatusBreakdown {
  count: number;
  amount: number;
}

export interface RouterBreakdown {
  count: number;
  amount: number;
  router_id: number;
}

export interface TransactionSummary {
  total_transactions: number;
  total_amount: number;
  status_breakdown: {
    completed?: StatusBreakdown;
    pending?: StatusBreakdown;
    failed?: StatusBreakdown;
    expired?: StatusBreakdown;
  };
  method_breakdown?: Record<string, StatusBreakdown>;
  router_breakdown: Record<string, RouterBreakdown>;
  period: {
    date?: string;
    start_date: string;
    end_date: string;
  };
}

// Payment Method Configuration Types (Settings CRUD)
export type PaymentMethodType = 'bank_account' | 'mpesa_paybill' | 'mpesa_paybill_with_keys' | 'zenopay' | 'mtn_momo';

export interface PaymentMethodConfig {
  id: number;
  user_id: number;
  method_type: PaymentMethodType;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // bank_account fields
  bank_paybill_number?: string;
  bank_account_number?: string;
  // mpesa_paybill fields
  mpesa_paybill_number?: string;
  // mpesa_paybill_with_keys fields
  mpesa_shortcode?: string;
  mpesa_passkey?: string;
  mpesa_consumer_key?: string;
  mpesa_consumer_secret?: string;
  // zenopay fields
  zenopay_api_key?: string;
  zenopay_account_id?: string;
  // mtn_momo fields
  mtn_api_user?: string;
  mtn_api_key?: string;
  mtn_subscription_key?: string;
  mtn_target_environment?: string;
  mtn_base_url?: string;
  mtn_currency?: string;
}

export interface CreatePaymentMethodRequest {
  method_type: PaymentMethodType;
  label: string;
  bank_paybill_number?: string;
  bank_account_number?: string;
  mpesa_paybill_number?: string;
  mpesa_shortcode?: string;
  mpesa_passkey?: string;
  mpesa_consumer_key?: string;
  mpesa_consumer_secret?: string;
  zenopay_api_key?: string;
  zenopay_account_id?: string;
  mtn_api_user?: string;
  mtn_api_key?: string;
  mtn_subscription_key?: string;
  mtn_target_environment?: string;
  mtn_base_url?: string;
  mtn_currency?: string;
}

export interface UpdatePaymentMethodRequest {
  label?: string;
  is_active?: boolean;
  bank_paybill_number?: string;
  bank_account_number?: string;
  mpesa_paybill_number?: string;
  mpesa_shortcode?: string;
  mpesa_passkey?: string;
  mpesa_consumer_key?: string;
  mpesa_consumer_secret?: string;
  zenopay_api_key?: string;
  zenopay_account_id?: string;
  mtn_api_user?: string;
  mtn_api_key?: string;
  mtn_subscription_key?: string;
  mtn_target_environment?: string;
  mtn_base_url?: string;
  mtn_currency?: string;
}

export interface PaymentMethodTestResult {
  status: 'success' | 'failed';
  message: string;
}

// Router Types
export type PaymentMethod = 'mpesa' | 'voucher';

export type RouterStatus = 'online' | 'offline' | 'unknown';

export interface Router {
  id: number;
  name: string;
  identity: string;
  ip_address: string;
  port: number;
  auth_method: string;
  payment_methods?: PaymentMethod[];
  payment_method_id?: number | null;
  pppoe_ports?: string[];
  plain_ports?: string[];
  dual_ports?: string[] | null;
  status?: RouterStatus;
  status_is_stale?: boolean;
  status_age_seconds?: number;
  status_last_checked_at?: string;
  last_online_at?: string;
  status_source?: string;
  availability_checks?: number;
  availability_successes?: number;
  emergency_active?: boolean;
  emergency_message?: string | null;
}

export interface UptimeCheck {
  checked_at: string;
  is_online: boolean;
  source: string;
}

export interface RouterUptimeResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  current_status: {
    status: RouterStatus;
    status_is_stale: boolean;
    status_age_seconds: number;
    status_last_checked_at: string;
    last_online_at: string;
    status_source: string;
    availability_checks: number;
    availability_successes: number;
  };
  overall: {
    total_checks: number;
    online_checks: number;
    uptime_percentage: number;
  };
  window: {
    hours: number;
    from: string;
    to: string;
    first_check_at: string;
    last_check_at: string;
    total_checks: number;
    online_checks: number;
    uptime_percentage: number;
  };
  recent_checks: UptimeCheck[];
}

export interface CreateRouterRequest {
  name: string;
  identity: string;
  ip_address: string;
  username: string;
  password: string;
  port: number;
  payment_methods?: PaymentMethod[];
}

export interface UpdateRouterRequest {
  name?: string;
  ip_address?: string;
  username?: string;
  password?: string;
  port?: number;
  payment_methods?: PaymentMethod[];
  emergency_active?: boolean;
  emergency_message?: string | null;
}

export interface ActivateEmergencyRequest {
  router_id: number;
  message?: string;
}

export interface DeactivateEmergencyRequest {
  router_id: number;
}

export interface EmergencyModeResponse {
  success: boolean;
  message: string;
  router_id: number;
  emergency_message?: string;
  regular_plans_hidden?: number;
  emergency_plans_shown?: number;
  regular_plans_shown?: number;
  emergency_plans_hidden?: number;
}

export interface HotspotSession {
  address: string;
  login_time: string;
  uptime: string;
  bytes_in: string;
  bytes_out: string;
}

export interface HotspotUser {
  username: string;
  profile: string;
  disabled: boolean;
  comment: string;
  uptime_limit: string;
  active: boolean;
  session?: HotspotSession;
}

export interface RouterUsersResponse {
  router_id: number;
  router_name: string;
  users: HotspotUser[];
  total_users: number;
  active_sessions: number;
}

// Provisioning Types
export type VpnType = 'wireguard' | 'l2tp';

export interface ProvisionTokenResponse {
  token: string;
  router_name: string;
  identity: string;
  vpn_type: VpnType;
  vpn_ip: string;
  command: string;
  note: string;
  created_at: string;
  expires_in_hours: number;
}

export interface ProvisionToken {
  id: number;
  token: string;
  router_name: string;
  identity: string;
  vpn_type: VpnType;
  vpn_ip: string;
  status: 'pending' | 'provisioned' | 'expired';
  expired: boolean;
  command: string | null;
  created_at: string;
  provisioned_at: string | null;
  router_id: number | null;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'reseller';
  organization_name: string;
  business_name: string;
  support_phone?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  organization_name: string;
  business_name?: string;
  support_phone?: string;
  mpesa_shortcode?: string;
  subscription_status?: string;
  subscription_expires_at?: string | null;
}

export interface SubscriptionAlert {
  status: string;
  message: string;
  current_invoice: SubscriptionInvoice | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  subscription_alert?: SubscriptionAlert;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

// Profile Types
export interface UserProfile {
  id: number;
  user_code: number;
  email: string;
  role: string;
  organization_name: string;
  business_name: string;
  support_phone: string;
  mpesa_shortcode: string;
  created_at: string;
  last_login_at: string;
}

export interface UpdateProfileRequest {
  support_phone?: string;
  business_name?: string;
  organization_name?: string;
  mpesa_shortcode?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// MikroTik Types
export interface MikroTikSystem {
  uptime: string;
  version: string;
  platform: string;
  boardName: string;
  architecture: string;
  cpu: string;
  cpuCount: number;
  cpuFrequencyMhz: number;
}

export interface MikroTikMemory {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export interface MikroTikStorage {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
}

export interface MikroTikInterface {
  name: string;
  type: string;
  running: boolean;
  disabled: boolean;
  rx_byte: number;
  tx_byte: number;
  rx_packet: number;
  tx_packet: number;
  rx_error: number;
  tx_error: number;
}

export interface MikroTikActiveSession {
  user: string;
  address: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  macAddress?: string;
  packetsIn?: number;
  packetsOut?: number;
  idleTime?: string;
}

export interface MikroTikPppoeSession {
  user: string;
  address: string;
  uptime: string;
  service?: string;
  callerId?: string;
  encoding?: string;
  sessionId?: string;
}

export interface MikroTikBandwidth {
  downloadMbps: number;
  uploadMbps: number;
}

export interface MikroTikMetrics {
  system: MikroTikSystem;
  cpuLoadPercent: number;
  memory: MikroTikMemory;
  storage: MikroTikStorage;
  healthSensors: Record<string, unknown>;
  activeSessions: MikroTikActiveSession[];
  activeSessionCount: number;
  activePppoeSessions: MikroTikPppoeSession[];
  activePppoeCount: number;
  interfaces: MikroTikInterface[];
  generatedAt: string;
  uptime?: string;
  // Additional fields
  routerId?: number;
  routerName?: string;
  bandwidth?: MikroTikBandwidth;
  snapshotAgeSeconds?: number;
  cached?: boolean;
  cacheAgeSeconds?: number;
  stale?: boolean;
}

// Bandwidth History Types
export interface BandwidthDataPoint {
  timestamp: string;
  totalUploadMbps: number;
  totalDownloadMbps: number;
  avgUploadMbps: number;
  avgDownloadMbps: number;
  activeQueues: number;
  activeSessions: number;
}

export interface BandwidthHistory {
  history: BandwidthDataPoint[];
  count: number;
  periodHours: number;
  generatedAt: string;
}

// Top Users Types
export interface TopUser {
  name: string;
  target: string;
  mac: string;
  uploadBytes: number;
  downloadBytes: number;
  totalBytes: number;
  uploadMB: number;
  downloadMB: number;
  totalMB: number;
  downloadGB: number;
  maxLimit: string;
  currentRate: string;
  disabled: boolean;
  customerName: string;
  customerPhone: string;
  customerId: number;
}

export interface TopUsersResponse {
  topUsers: TopUser[];
  totalQueues: number;
  generatedAt: string;
}

// Advertiser Types
export interface Advertiser {
  id: number;
  name: string;
  business_name: string;
  phone_number: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateAdvertiserRequest {
  name: string;
  business_name: string;
  phone_number: string;
  email: string;
}

// Ad Types
export interface Ad {
  id: number;
  title: string;
  description: string;
  image_url: string;
  seller_name: string;
  seller_location: string;
  phone_number: string;
  whatsapp_number: string;
  price: string;
  price_value: number;
  badge_type: 'hot' | 'new' | 'sale' | 'featured' | null;
  badge_text: string | null;
  category: string;
  is_active: boolean;
  priority: number;
  views_count: number;
  clicks_count: number;
  created_at: string;
  expires_at: string;
  advertiser_id: number;
}

export interface CreateAdRequest {
  advertiser_id: number;
  title: string;
  description: string;
  image_url: string;
  seller_name: string;
  seller_location: string;
  phone_number: string;
  whatsapp_number: string;
  price: string;
  price_value: number;
  badge_type?: 'hot' | 'new' | 'sale' | 'featured';
  badge_text?: string;
  category: string;
  expires_at: string;
}

export interface AdsResponse {
  ads: Ad[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Ad Click Types
export interface AdClick {
  id: number;
  click_type: 'view_details' | 'call' | 'whatsapp';
  device_id: string;
  mac_address: string;
  session_id: string;
  created_at: string;
}

export interface AdClicksResponse {
  ad_id: number;
  ad_title: string;
  clicks: AdClick[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

// Ad Impression Types
export interface AdImpression {
  id: number;
  device_id: string;
  session_id: string;
  placement: string;
  ad_ids: number[];
  created_at: string;
}

export interface AdImpressionsResponse {
  ad_id: number;
  ad_title: string;
  impressions: AdImpression[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

// Ad Analytics Types
export interface TopAdByClicks {
  id: number;
  title: string;
  clicks_count: number;
  views_count: number;
}

export interface AdAnalytics {
  period_days: number;
  total_ads: number;
  active_ads: number;
  total_clicks: number;
  clicks_by_type: {
    view_details: number;
    call: number;
    whatsapp: number;
  };
  total_impressions: number;
  top_ads_by_clicks: TopAdByClicks[];
}

// Rating Types
export interface Rating {
  id: number;
  phone: string;
  rating: number;
  comment?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  customer_id?: number;
  customer_name?: string;
}

export interface RatingSummary {
  total_ratings: number;
  average_rating: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  ratings_with_comments: number;
  ratings_with_location: number;
}

export interface CustomerMapData {
  id: number;
  phone: string;
  name?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  last_rating_comment?: string;
  total_ratings?: number;
  average_rating?: number;
}

// Voucher Types
export interface VoucherPlan {
  id: number;
  name: string;
  price: number;
  speed?: string;
  duration?: string;
}

export interface VoucherRouter {
  id: number;
  name: string;
}

export interface Voucher {
  id: number;
  code: string;
  status: 'available' | 'used' | 'disabled' | 'expired';
  plan_id?: number;
  plan?: VoucherPlan;
  router_id?: number;
  router?: VoucherRouter | null;
  batch_id?: string;
  redeemed_by?: string | null;
  redeemed_at?: string | null;
  expires_at?: string | null;
  used_at?: string | null;
  created_at: string;
}

export interface VoucherStats {
  total: number;
  available: number;
  used: number;
  disabled: number;
  expired: number;
}

export interface GenerateVouchersRequest {
  plan_id: number;
  quantity: number;
  router_id?: number | null;
  expires_at?: string | null;
}

export interface VouchersListResponse {
  vouchers: Voucher[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface VoucherFilters {
  status?: string;
  plan_id?: number;
  router_id?: number;
  batch_id?: string;
  page?: number;
  per_page?: number;
}

// Network Diagnostics Types

export interface HealthCheck {
  check: string;
  description: string;
  passed: boolean;
  detail: unknown;
  any_port_up?: boolean;
  specific_pppoe_rule?: boolean;
  any_masquerade?: boolean;
}

export interface DiagnosticIssue {
  severity: 'critical' | 'warning' | 'info';
  layer?: string;
  check?: string;
  message: string;
  recommendation?: string;
}

export interface LogEntry {
  time: string;
  topics: string;
  message: string;
}

export interface PPPoEOverviewResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  cached: boolean;
  cache_age_seconds?: number;
  stale?: boolean;
  success: boolean;
  healthy: boolean;
  active_sessions: number;
  checks: HealthCheck[];
}

export interface PPPoEDiagnoseCustomer {
  customer_id: number;
  name: string;
  phone: string;
  status: string;
  expiry: string | null;
  is_expired: boolean;
  plan: string | null;
  plan_speed: number | null;
}

export interface PPPoEDiagnoseResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  customer: PPPoEDiagnoseCustomer | null;
  success: boolean;
  username: string;
  status: string;
  issues_count: number;
  has_critical: boolean;
  issues: DiagnosticIssue[];
  info: Record<string, unknown>;
}

export interface PPPoEClientDetailsCauseHints {
  category: string;
  probable_cause: string;
  technician_action: string;
}

export interface PPPoEClientDetailsSummary {
  issues_count: number;
  has_critical: boolean;
  log_entries: number;
}

export interface PPPoEClientChecklistItem {
  severity: 'critical' | 'warning' | 'info';
  layer: string;
  action: string;
}

export interface PPPoEClientSecretInfo {
  name: string;
  last_disconnect_reason: string;
}

export interface PPPoEClientDiagnosticInfo {
  ports: Array<Record<string, unknown>>;
  pppoe_servers: Array<Record<string, unknown>>;
  pppoe_access: Record<string, unknown>;
  bridge_pppoe: Record<string, unknown> | null;
  pool: Array<Record<string, unknown>>;
  secret: PPPoEClientSecretInfo | null;
  active_session: Record<string, unknown> | null;
  status: string;
  last_disconnect_reason: string;
  recent_logs: LogEntry[];
}

export interface PPPoEClientDiagnostic {
  success: boolean;
  username: string;
  status: string;
  issues_count: number;
  has_critical: boolean;
  issues: DiagnosticIssue[];
  info: PPPoEClientDiagnosticInfo;
}

export interface PPPoEClientDetailsResponse {
  router_id: number;
  router_name: string;
  username: string;
  generated_at: string;
  connection_state: string;
  disconnect_reason: string;
  cause_hints: PPPoEClientDetailsCauseHints;
  summary: PPPoEClientDetailsSummary;
  technician_checklist: PPPoEClientChecklistItem[];
  diagnostic: PPPoEClientDiagnostic;
  recent_logs: LogEntry[];
}

export interface PPPoELogsResponse {
  router_id: number;
  router_name: string;
  filter_username: string | null;
  generated_at: string;
  notable_entries_persisted: number;
  success: boolean;
  data: LogEntry[];
  count: number;
}

export interface PPPoESecretEntry {
  name: string;
  service: string;
  profile: string;
  disabled: boolean;
  comment: string;
  last_logged_out: string;
  last_disconnect_reason: string;
  last_caller_id: string;
  online: boolean;
  session: Record<string, unknown> | null;
  profile_detail: Record<string, unknown> | null;
  db_customer: {
    id: number;
    name: string;
    status: string;
    expiry: string | null;
  } | null;
}

export interface PPPoESecretsResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  success: boolean;
  data: PPPoESecretEntry[];
  count: number;
}

// PPPoE User Monitoring
export interface PPPoEMonitorCustomer {
  id: number;
  name: string;
  phone: string;
  status: string;
  plan: string | null;
  plan_speed: string | null;
  expiry: string | null;
}

export interface PPPoEMonitorUser {
  username: string;
  service: string;
  profile: string;
  disabled: boolean;
  comment: string;
  online: boolean;
  address: string | null;
  uptime: string | null;
  caller_id: string | null;
  upload_bytes: number;
  download_bytes: number;
  upload_rate: string;
  download_rate: string;
  max_limit: string;
  last_logged_out: string;
  last_disconnect_reason: string;
  last_caller_id: string;
  customer: PPPoEMonitorCustomer | null;
}

export interface PPPoEMonitorSummary {
  total: number;
  online: number;
  offline: number;
  disabled: number;
  total_upload_rate_bps: number;
  total_download_rate_bps: number;
}

export interface PPPoEMonitorResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  cached: boolean;
  stale?: boolean;
  cache_age_seconds: number | null;
  success: boolean;
  summary: PPPoEMonitorSummary;
  users: PPPoEMonitorUser[];
}

export interface HotspotOverviewResponse {
  router_id: number;
  router_name: string;
  generated_at: string;
  cached: boolean;
  cache_age_seconds?: number;
  stale?: boolean;
  success: boolean;
  healthy: boolean;
  active_sessions: number;
  checks: HealthCheck[];
}

export interface HotspotLogsResponse {
  router_id: number;
  router_name: string;
  filter_search: string | null;
  generated_at: string;
  notable_entries_persisted: number;
  success: boolean;
  data: LogEntry[];
  count: number;
}

export interface PortEntry {
  port: string;
  bridge: string;
  service: 'hotspot' | 'pppoe' | 'plain' | 'dual' | 'unassigned';
  link_up: boolean;
  disabled: boolean;
  rx_byte: number;
  tx_byte: number;
  rx_error: number;
  tx_error: number;
  rx_drop: number;
  tx_drop: number;
  link_downs: number;
  last_link_up_time: string;
  actual_mtu: number;
}

export interface BridgeEntry {
  name: string;
  running: boolean;
  disabled: boolean;
  port_count: number;
}

export interface PortStatusResponse {
  router_id: number;
  router_name: string;
  pppoe_ports: string[];
  plain_ports?: string[];
  dual_ports?: string[];
  generated_at: string;
  cached: boolean;
  cache_age_seconds?: number;
  stale?: boolean;
  ports: PortEntry[];
  bridges: BridgeEntry[];
}

// Walled Garden
export interface WalledGardenDomainEntry {
  '.id': string;
  'dst-host': string;
  action: string;
  comment?: string;
}

export interface WalledGardenIpEntry {
  '.id': string;
  'dst-address': string;
  action: string;
  comment?: string;
}

export interface WalledGardenResponse {
  domain_entries: WalledGardenDomainEntry[];
  ip_entries: WalledGardenIpEntry[];
}

export interface AddWalledGardenDomainRequest {
  router_id: number;
  dst_host: string;
  comment?: string;
}

export interface AddWalledGardenIpRequest {
  router_id: number;
  dst_address: string;
  comment?: string;
}

export interface MacDiagnoseResponse {
  mac_address: string;
  normalized: string;
  username_format: string;
  database_info: {
    customer_id: number;
    name: string;
    status: string;
    router_id: number;
    expiry: string | null;
    is_expired: boolean;
  } | null;
  infrastructure: Record<string, unknown>;
  infrastructure_issues: DiagnosticIssue[];
  router_entries: Record<string, unknown[]>;
  diagnosis: string[];
  recommendations: DiagnosticIssue[];
  can_access_internet: boolean;
  total_router_entries: number;
  total_issues: number;
}

// Admin Reseller Management Types

export interface AdminReseller {
  id: number;
  email: string;
  organization_name: string;
  business_name: string;
  support_phone: string;
  mpesa_shortcode: string;
  created_at: string;
  last_login_at: string | null;
  total_revenue: number;
  mpesa_revenue: number;
  total_customers: number;
  active_customers: number;
  last_payment_date: string | null;
  router_count: number;
  unpaid_balance: number;
  total_transaction_charges?: number;
  subscription_status?: string;
  subscription_expires_at?: string | null;
}

export type AdminResellerFilter =
  | 'unpaid' | 'paid_up'
  | 'active' | 'inactive'
  | 'has_routers' | 'no_routers'
  | 'has_revenue' | 'no_revenue';

export type AdminResellerSortBy =
  | 'unpaid_balance' | 'revenue' | 'mpesa_revenue'
  | 'customers' | 'router_count' | 'created_at' | 'last_login';

export type AdminSortOrder = 'asc' | 'desc';

export interface AdminResellersParams {
  search?: string;
  filter?: AdminResellerFilter;
  sort_by?: AdminResellerSortBy;
  sort_order?: AdminSortOrder;
  date?: string;
  start_date?: string;
  end_date?: string;
}

export interface AdminResellersResponse {
  total: number;
  filters_applied?: {
    sort_by: string | null;
    sort_order: string | null;
    filter: string | null;
    search: string | null;
  };
  resellers: AdminReseller[];
}

export interface AdminResellerRevenue {
  today?: number;
  today_mpesa?: number;
  this_week?: number;
  this_week_mpesa?: number;
  this_month?: number;
  this_month_mpesa?: number;
  all_time?: number;
  all_time_mpesa?: number;
  period?: number;
  period_mpesa?: number;
}

export interface AdminResellerCustomers {
  active: number;
  inactive: number;
  pending: number;
  total: number;
}

export interface AdminResellerRouter {
  id: number;
  name: string;
  identity: string;
  ip_address: string;
  is_online: boolean;
  last_checked_at: string | null;
}

export interface AdminResellerPayment {
  id: number;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  customer_name: string;
  customer_phone: string;
  plan_name: string;
  created_at: string;
}

export interface AdminResellerPayoutsInfo {
  total_paid: number;
  last_payout_date: string | null;
  unpaid_balance: number;
  total_transaction_charges?: number;
}

export interface B2BFeePreview {
  [key: string]: unknown;
}

export interface B2BPayoutRequest {
  payment_method_id?: number;
}

export interface B2BPayoutResponse {
  [key: string]: unknown;
}

export type AdminPaymentMethodType = 'bank_account' | 'mpesa_paybill' | 'mpesa_paybill_with_keys' | 'zenopay' | 'mtn_momo';

export interface AdminPaymentMethod {
  id: number;
  method_type: AdminPaymentMethodType;
  label: string;
  is_active: boolean;
  bank_paybill_number?: string;
  bank_account_number?: string;
  mpesa_paybill_number?: string;
  mpesa_shortcode?: string;
  zenopay_account_id?: string;
  mtn_api_user?: string;
  mtn_target_environment?: string;
  mtn_currency?: string;
}

export interface AdminResellerDetail {
  id: number;
  email: string;
  organization_name: string;
  business_name: string;
  support_phone: string;
  mpesa_shortcode: string;
  created_at: string;
  last_login_at: string | null;
  revenue: AdminResellerRevenue;
  customers: AdminResellerCustomers;
  routers: AdminResellerRouter[];
  recent_payments: AdminResellerPayment[];
  payouts: AdminResellerPayoutsInfo;
  recent_transaction_charges?: AdminTransactionCharge[];
  payment_methods?: AdminPaymentMethod[];
}

export interface AdminPaymentsResponse {
  reseller_id: number;
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  summary: {
    total_transactions: number;
    total_amount: number;
    mpesa_amount: number;
  };
  payments: AdminResellerPayment[];
}

export interface AdminRouterDetail {
  id: number;
  name: string;
  identity: string;
  ip_address: string;
  auth_method: string;
  is_online: boolean;
  last_checked_at: string | null;
  customer_count: number;
  total_revenue: number;
}

export interface AdminRoutersResponse {
  reseller_id: number;
  total: number;
  routers: AdminRouterDetail[];
}

export interface AdminDashboardRevenue {
  today: number;
  today_mpesa: number;
  this_week: number;
  this_week_mpesa: number;
  this_month: number;
  this_month_mpesa: number;
  all_time: number;
  all_time_mpesa: number;
}

export interface AdminDashboard {
  resellers: {
    total: number;
    active_last_30_days: number;
    subscription_active?: number;
    subscription_trial?: number;
    subscription_suspended?: number;
    subscription_inactive?: number;
  };
  revenue: AdminDashboardRevenue;
  customers: {
    total: number;
    active: number;
    inactive: number;
  };
  routers: {
    total: number;
    online: number;
    offline: number;
  };
  top_resellers_this_month: {
    id: number;
    email: string;
    organization_name: string;
    month_revenue: number;
  }[];
  payouts: {
    total_paid: number;
    total_transaction_charges?: number;
    total_unpaid: number;
  };
  recent_signups: {
    id: number;
    email: string;
    organization_name: string;
    created_at: string;
    last_login_at: string | null;
  }[];
  growth_deltas?: {
    revenue_change_percent: number;
    resellers_change_percent: number;
    customers_change_percent: number;
    comparison_period: string;
  };
  signups_today?: number;
  signups_this_week?: number;
  signups_this_month?: number;
  generated_at: string;
}

export interface AdminCreatePayoutRequest {
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  period_start?: string;
  period_end?: string;
}

export interface AdminPayout {
  id: number;
  reseller_id: number;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface AdminPayoutResponse {
  payout: AdminPayout;
  unpaid_balance: number;
}

export interface AdminPayoutsResponse {
  reseller_id: number;
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  summary: {
    total_payouts: number;
    total_amount: number;
  };
  payouts: AdminPayout[];
}

// Transaction Charges

export interface AdminCreateTransactionChargeRequest {
  amount: number;
  description: string;
  reference?: string;
}

export interface AdminTransactionCharge {
  id: number;
  reseller_id: number;
  amount: number;
  description: string;
  reference: string | null;
  created_by: number;
  created_at: string;
}

export interface AdminTransactionChargeResponse {
  charge: AdminTransactionCharge;
  unpaid_balance: number;
}

export interface AdminTransactionChargesResponse {
  reseller_id: number;
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  summary: {
    total_charges: number;
    total_amount: number;
  };
  charges: AdminTransactionCharge[];
}

// Reseller Account Statement

export interface AccountStatementBalance {
  total_system_collected: number;
  total_paid_to_you: number;
  total_transaction_charges: number;
  unpaid_balance: number;
}

export interface AccountStatementPeriodSummary {
  total_payouts: number;
  total_charges: number;
  net: number;
}

export interface AccountStatementEntry {
  type: 'payout' | 'charge';
  id: number;
  amount: number;
  description: string;
  reference: string | null;
  notes: string | null;
  date: string;
}

export interface ResellerAccountStatement {
  balance: AccountStatementBalance;
  period_summary: AccountStatementPeriodSummary;
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
  entries: AccountStatementEntry[];
}

// Admin Reseller Stats (Charts)

export type AdminResellerStatsPeriod = '7d' | '30d' | '90d' | '1y' | 'all';

export interface ResellerRevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  mpesa_revenue: number;
}

export interface ResellerSignupDataPoint {
  date: string;
  label: string;
  count: number;
}

export interface AdminResellerStats {
  period: AdminResellerStatsPeriod;
  revenue_over_time: ResellerRevenueDataPoint[];
  signups_over_time: ResellerSignupDataPoint[];
  totals: {
    revenue: number;
    mpesa_revenue: number;
    new_resellers: number;
  };
}

export interface DeleteResellerPreview {
  reseller_id: number;
  reseller_email: string;
  organization_name: string;
  dry_run: true;
  will_delete: Record<string, number>;
  message: string;
}

export interface DeleteResellerResponse {
  success: boolean;
  message: string;
  reseller_id: number;
  deleted: Record<string, number>;
}

// Subscription Types

export interface SubscriptionInvoice {
  id: number;
  user_id?: number;
  period_start?: string;
  period_end?: string;
  period_label: string;
  hotspot_revenue?: number;
  hotspot_charge?: number;
  pppoe_user_count?: number;
  pppoe_charge?: number;
  gross_charge?: number;
  final_charge: number;
  amount_paid?: number;
  balance_remaining?: number;
  status: string;
  due_date: string;
  paid_at?: string | null;
  days_until_due?: number;
  is_overdue?: boolean;
  is_due_soon?: boolean;
  human_message?: string;
  created_at?: string;
  payments?: SubscriptionPayment[];
}

export interface SubscriptionPayment {
  id: number;
  invoice_id?: number;
  amount: number;
  payment_method: string;
  payment_reference: string;
  phone_number?: string;
  status: string;
  created_at: string;
}

export interface SubscriptionOverview {
  status: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  total_paid: number;
  invoice_count: number;
  pending_invoice: SubscriptionInvoice | null;
}

export interface SubscriptionInvoicesResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  invoices: SubscriptionInvoice[];
}

export interface SubscriptionPaymentsResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  payments: SubscriptionPayment[];
}

export interface SubscriptionPayRequest {
  invoice_id: number;
  phone_number: string;
  amount?: number;
}

export interface SubscriptionPayResponse {
  message: string;
  payment_id: number;
  checkout_request_id: string;
  amount: number;
  invoice_total: number;
  already_paid: number;
  balance_after_this: number;
  phone_number: string;
}

export interface AdminSubscription {
  id: number;
  email: string;
  organization_name: string;
  business_name?: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  total_paid: number;
  outstanding: number;
  pending_invoice?: SubscriptionInvoice | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminSubscriptionsResponse {
  total: number;
  subscriptions: AdminSubscription[];
}

export interface AdminSubscriptionRevenue {
  total_collected: number;
  this_month_collected: number;
  total_outstanding: number;
  total_invoices: number;
  overdue_invoices: number;
  resellers: {
    active: number;
    trial: number;
    suspended: number;
  };
}

export interface AdminExpiringSoon {
  days_threshold: number;
  total: number;
  resellers: {
    id: number;
    email: string;
    organization_name: string;
    subscription_status: string;
    subscription_expires_at: string;
    days_until_expiry: number;
  }[];
}

export interface AdminSubscriptionDetail {
  reseller: {
    id: number;
    email: string;
    organization_name: string;
    business_name?: string;
  };
  subscription: SubscriptionOverview;
  invoices: SubscriptionInvoice[];
  payments: SubscriptionPayment[];
}

export interface EditSubscriptionRequest {
  subscription_status?: string;
  subscription_expires_at?: string;
  adjust_days?: number;
}

export interface EditSubscriptionResponse {
  message: string;
  reseller_id: number;
  subscription_status: string;
  subscription_expires_at: string;
  days_remaining: number;
}

export interface ActivateSubscriptionResponse {
  message: string;
  reseller_id: number;
  subscription_status: string;
  subscription_expires_at: string;
}

export interface DeactivateSubscriptionResponse {
  message: string;
  reseller_id: number;
  subscription_status: string;
}

export interface WaiveInvoiceResponse {
  message: string;
  invoice_id: number;
  reseller_id: number;
}

export interface GenerateInvoicesResponse {
  message: string;
  created: number;
  skipped: number;
  errors: string[];
}

export interface RequestInvoiceResponse {
  current_invoice: SubscriptionInvoice | null;
  generated: boolean;
}

export interface GeneratePreExpiryInvoicesResponse {
  message: string;
  created: number;
  skipped: number;
  errors: string[];
}

export interface VerifyPaymentsResponse {
  message: string;
  reseller_id: number;
  verified_count: number;
  payments: SubscriptionPayment[];
}

// Admin Dashboard Metrics (new endpoints)

export interface AdminMRRMetrics {
  current_mrr: number;
  previous_period_mrr: number;
  change_percent: number;
  currency: string;
  breakdown: {
    new_mrr: number;
    churned_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
  };
  by_plan: { plan_name: string; reseller_count: number; mrr: number }[];
  period: string;
  calculated_at: string;
}

export interface AdminChurnMetrics {
  churn_rate: number;
  churned_count: number;
  total_at_period_start: number;
  previous_period_churn_rate: number;
  change_percent: number;
  net_reseller_growth: number;
  churned_resellers: {
    id: number;
    organization_name: string;
    churned_at: string | null;
    reason: string;
  }[];
  period: string;
  calculated_at: string;
}

export interface AdminSignupsSummary {
  reseller_signups: {
    today: number;
    this_week: number;
    this_month: number;
    period_total: number;
    previous_period_total: number;
    change_percent: number;
  };
  customer_signups: {
    today: number;
    this_week: number;
    this_month: number;
    period_total: number;
    previous_period_total: number;
    change_percent: number;
  };
  period: string;
  calculated_at: string;
}

export interface AdminCustomerSignupsTimeSeries {
  period: string;
  customer_signups_over_time: { date: string; label: string; count: number }[];
  previous_period: { date: string; label: string; count: number }[];
}

export interface AdminSubscriptionRevenueHistory {
  period: string;
  subscription_revenue_over_time: { date: string; label: string; revenue: number }[];
  previous_period: { date: string; label: string; revenue: number }[];
}

export interface AdminARPUMetrics {
  current_arpu: number;
  previous_period_arpu: number;
  change_percent: number;
  currency: string;
  active_resellers: number;
  total_revenue: number;
  period: string;
  calculated_at: string;
}

export interface AdminTrialConversion {
  conversion_rate: number;
  converted_count: number;
  total_trials_at_start: number;
  current_trials: number;
  previous_period_rate: number;
  change_percent: number;
  avg_days_to_convert: number;
  period: string;
  calculated_at: string;
}

export interface AdminActivationFunnel {
  funnel: {
    stage: string;
    label: string;
    count: number;
    percent: number;
  }[];
  conversion_rates: {
    signup_to_router: number;
    router_to_customer: number;
    customer_to_revenue: number;
    signup_to_revenue: number;
  };
  period: string;
  calculated_at: string;
}

export interface AdminRevenueConcentration {
  top_5_share_percent: number;
  top_10_share_percent: number;
  total_revenue: number;
  total_resellers_with_revenue: number;
  top_contributors: {
    id: number;
    organization_name: string;
    revenue: number;
    share_percent: number;
  }[];
  period: string;
  calculated_at: string;
}

export interface AdminSmartAlert {
  id: string;
  type: 'milestone' | 'warning' | 'record' | 'info';
  severity: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
  action_url?: string;
}

export interface AdminSmartAlertsResponse {
  alerts: AdminSmartAlert[];
  generated_at: string;
}

export interface AdminRevenueForecast {
  forecast: {
    date: string;
    label: string;
    projected_revenue: number;
    lower_bound: number;
    upper_bound: number;
  }[];
  projected_period_end_total: number;
  growth_rate_percent: number;
  confidence: 'high' | 'medium' | 'low';
  based_on_days: number;
  calculated_at: string;
}

export interface AdminGrowthTarget {
  id: string;
  label: string;
  current_value: number;
  target_value: number;
  progress_percent: number;
  unit: string;
  period: string;
  inverse?: boolean;
}

export interface AdminGrowthTargetsResponse {
  targets: AdminGrowthTarget[];
  updated_at: string;
}

export interface GrowthTargetUpdatePayload {
  id: string;
  target_value: number;
  period?: string;
  label?: string;
  unit?: string;
  inverse?: boolean;
}

// ─── Lead Pipeline / CRM ─────────────────────────────────────────────

export type LeadStage =
  | 'new_lead'
  | 'contacted'
  | 'talking'
  | 'installation_help'
  | 'signed_up'
  | 'paying'
  | 'churned'
  | 'lost';

export type LeadActivityType =
  | 'note'
  | 'call'
  | 'dm'
  | 'email'
  | 'meeting'
  | 'stage_change'
  | 'followup_completed'
  | 'other';

export interface LeadSource {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  social_platform: string | null;
  social_handle: string | null;
  source: string | null;
  source_id: number | null;
  source_detail: string | null;
  stage: LeadStage;
  stage_changed_at: string;
  next_followup_at: string | null;
  notes: string | null;
  converted_user_id: number | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: number;
  lead_id?: number;
  activity_type: LeadActivityType;
  description: string | null;
  old_stage: LeadStage | null;
  new_stage: LeadStage | null;
  created_at: string;
}

export interface LeadFollowUp {
  id: number;
  lead_id?: number;
  title: string;
  due_at: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface LeadDetail extends Lead {
  activities: LeadActivity[];
  follow_ups: LeadFollowUp[];
}

export interface UpcomingFollowUp {
  id: number;
  title: string;
  due_at: string;
  is_overdue: boolean;
  lead_id: number;
  lead_name: string;
  lead_stage: LeadStage;
  created_at: string;
}

export interface LeadsListResponse {
  total: number;
  page: number;
  per_page: number;
  leads: Lead[];
}

export interface ActivitiesResponse {
  activities: LeadActivity[];
}

export interface FollowUpsResponse {
  followups: UpcomingFollowUp[];
  total: number;
}

export interface LeadPipelineSummary {
  stages: Record<LeadStage, number>;
  total: number;
}

export interface LeadSourceStats {
  total: number;
  converted: number;
  conversion_rate: number;
}

export interface LeadFunnelStep {
  stage: string;
  reached: number;
  percent_of_total: number;
  dropped_off: number;
  drop_off_percent: number;
}

export interface LeadHealthAdvice {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  detail: string;
}

export interface StaleLeadPreview {
  id: number;
  name: string;
  stage: LeadStage;
  days_since_update: number;
  phone: string | null;
}

export interface LeadPipelineStats {
  total_leads: number;
  active_pipeline: number;
  conversion_rate: number;
  loss_rate: number;
  by_stage: Record<LeadStage, number>;
  by_source: Record<string, LeadSourceStats>;
  funnel: LeadFunnelStep[];
  avg_days_in_stage: Record<string, number>;
  health: {
    stale_leads: number;
    no_followup_scheduled: number;
    overdue_followups: number;
    stale_lead_previews: StaleLeadPreview[];
  };
  advice: LeadHealthAdvice[];
}

export interface CreateLeadRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  social_platform?: string | null;
  social_handle?: string | null;
  source_id?: number | null;
  source_detail?: string | null;
  stage?: LeadStage;
  notes?: string | null;
  next_followup_at?: string | null;
}

export interface UpdateLeadRequest {
  name?: string;
  phone?: string | null;
  email?: string | null;
  social_platform?: string | null;
  social_handle?: string | null;
  source_id?: number | null;
  source_detail?: string | null;
  notes?: string | null;
  next_followup_at?: string | null;
}

export interface ChangeStageRequest {
  stage: LeadStage;
  note?: string;
  lost_reason?: string | null;
}

export interface CreateSourceRequest {
  name: string;
  description?: string;
}

export interface UpdateSourceRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateActivityRequest {
  activity_type: 'note' | 'call' | 'dm' | 'email' | 'meeting' | 'other';
  description?: string;
}

export interface CreateFollowUpRequest {
  title: string;
  due_at: string;
}

export interface ConvertLeadRequest {
  email: string;
  organization_name: string;
  password: string;
  business_name?: string;
  support_phone?: string;
}

export interface ConvertLeadResponse {
  detail: string;
  lead_id: number;
  new_user_id: number;
  new_user_email: string;
  new_stage: LeadStage;
}

export interface LeadBackfillRequest {
  since?: string | null;
  dry_run?: boolean;
}

export interface LeadBackfillItem {
  user_id: number;
  email: string | null;
  name: string;
  stage: LeadStage;
  reason: string;
  signup_date: string | null;
  lead_id: number | null;
}

export interface LeadBackfillResponse {
  since: string | null;
  dry_run: boolean;
  admin_owner_id: number | null;
  admin_owner_email: string | null;
  source_id: number | null;
  source_name: string | null;
  candidates: number;
  leads_created: number;
  stage_counts: Partial<Record<LeadStage, number>>;
  items: LeadBackfillItem[];
  message: string;
}
