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
  router: CustomerRouter;
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
}

export interface TransactionPlan {
  id: number;
  name: string;
  price: number;
  duration_value: number;
  duration_unit: string;
}

export interface MpesaTransaction {
  transaction_id: number;
  checkout_request_id: string;
  phone_number: string;
  amount: number;
  reference: string;
  lipay_tx_no: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  mpesa_receipt_number: string;
  transaction_date: string;
  created_at: string;
  // Failure detail fields (present on failed transactions)
  failure_source?: 'client' | 'server' | 'timeout' | 'mpesa' | string;
  result_code?: string;
  result_desc?: string;
  customer: TransactionCustomer;
  router: TransactionRouter;
  plan: TransactionPlan;
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
  router_breakdown: Record<string, RouterBreakdown>;
  period: {
    start_date: string;
    end_date: string;
  };
}

// Router Types
export interface Router {
  id: number;
  name: string;
  ip_address: string;
  port: number;
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

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
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
