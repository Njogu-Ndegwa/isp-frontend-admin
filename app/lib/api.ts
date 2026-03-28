import {
  DashboardOverview,
  DashboardAnalytics,
  MikroTikMetrics,
  BandwidthHistory,
  TopUsersResponse,
  Customer,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanPerformanceResponse,
  MpesaTransaction,
  ManualProvisionResponse,
  TransactionSummary,
  Router,
  CreateRouterRequest,
  UpdateRouterRequest,
  RouterUsersResponse,
  ProvisionTokenResponse,
  ProvisionToken,
  VpnType,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  Advertiser,
  CreateAdvertiserRequest,
  Ad,
  CreateAdRequest,
  AdsResponse,
  AdClicksResponse,
  AdImpressionsResponse,
  AdAnalytics,
  Rating,
  RatingSummary,
  CustomerMapData,
  Voucher,
  VoucherStats,
  GenerateVouchersRequest,
  VouchersListResponse,
  VoucherFilters,
  RegisterCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerResponse,
  DeleteCustomerResponse,
  ActivatePPPoERequest,
  PPPoECredentials,
  PPPoEActiveResponse,
  RouterInterfacesResponse,
  UpdatePPPoEPortsRequest,
  UpdatePPPoEPortsResponse,
  UpdatePlainPortsRequest,
  UpdatePlainPortsResponse,
  UpdateDualPortsRequest,
  UpdateDualPortsResponse,
  PPPoEOverviewResponse,
  PPPoEDiagnoseResponse,
  PPPoELogsResponse,
  PPPoESecretsResponse,
  HotspotOverviewResponse,
  HotspotLogsResponse,
  PortStatusResponse,
  MacDiagnoseResponse,
  RouterUptimeResponse,
  WalledGardenResponse,
  AddWalledGardenDomainRequest,
  AddWalledGardenIpRequest,
  ActivateEmergencyRequest,
  DeactivateEmergencyRequest,
  EmergencyModeResponse,
  AdminDashboard,
  AdminResellersParams,
  AdminResellersResponse,
  AdminResellerDetail,
  AdminPaymentsResponse,
  AdminRoutersResponse,
  AdminCreatePayoutRequest,
  AdminPayoutResponse,
  AdminPayoutsResponse,
  PaymentMethodConfig,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  PaymentMethodTestResult,
  AdminCreateTransactionChargeRequest,
  AdminTransactionChargeResponse,
  AdminTransactionChargesResponse,
  ResellerAccountStatement,
  PaginatedResponse,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from './types';
import * as demo from './demoData';

const BASE_URL = 'https://isp.bitwavetechnologies.com/api';

class ApiClient {
  isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('demo_mode') === 'true';
  }

  private demoBlock(): never {
    throw new Error(demo.DEMO_WRITE_ERROR);
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private getHeaders(authenticated = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authenticated) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response, skipAuthRedirect = false): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined' && !skipAuthRedirect) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Dashboard Analytics (new endpoint with flexible date filtering)
  async getDashboardAnalytics(
    userId = 1,
    options: {
      preset?: 'today' | 'this_month';
      days?: number;
      startDate?: string;
      endDate?: string;
      routerId?: number;
    } = { days: 7 }
  ): Promise<DashboardAnalytics> {
    if (this.isDemoMode()) return demo.demoDashboardAnalytics;
    const params = new URLSearchParams();
    params.append('user_id', userId.toString());
    
    if (options.routerId) {
      params.append('router_id', options.routerId.toString());
    }
    
    if (options.preset) {
      params.append('preset', options.preset);
    } else if (options.startDate && options.endDate) {
      params.append('start_date', options.startDate);
      params.append('end_date', options.endDate);
    } else if (options.days) {
      params.append('days', options.days.toString());
    }
    
    const response = await fetch(
      `${BASE_URL}/dashboard/analytics?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<DashboardAnalytics>(response);
  }

  // MikroTik Metrics
  async getMikroTikMetrics(routerId?: number): Promise<MikroTikMetrics> {
    if (this.isDemoMode()) return demo.demoMikroTikMetrics;
    const params = new URLSearchParams();
    if (routerId) {
      params.append('router_id', routerId.toString());
    }
    const url = routerId 
      ? `${BASE_URL}/mikrotik/health?${params.toString()}`
      : `${BASE_URL}/dashboard/mikrotik`;
    const response = await fetch(url, { headers: this.getHeaders() });
    const data = await this.handleResponse<Record<string, unknown>>(response);
    
    // Transform snake_case API response to camelCase for frontend
    return this.transformMikroTikResponse(data);
  }

  // Transform MikroTik API response from snake_case to camelCase
  private transformMikroTikResponse(data: Record<string, unknown>): MikroTikMetrics {
    const system = data.system as Record<string, unknown> | undefined;
    const memory = data.memory as Record<string, unknown> | undefined;
    const storage = data.storage as Record<string, unknown> | undefined;
    const bandwidth = data.bandwidth as Record<string, unknown> | undefined;
    
    return {
      system: {
        uptime: (system?.uptime as string) ?? '',
        version: (system?.version as string) ?? '',
        platform: (system?.platform as string) ?? '',
        boardName: (system?.board_name as string) ?? '',
        architecture: (system?.architecture as string) ?? '',
        cpu: (system?.cpu as string) ?? '',
        cpuCount: (system?.cpu_count as number) ?? 0,
        cpuFrequencyMhz: (system?.cpu_frequency_mhz as number) ?? 0,
      },
      cpuLoadPercent: (data.cpu_load_percent as number) ?? 0,
      memory: {
        totalBytes: (memory?.total_bytes as number) ?? 0,
        freeBytes: (memory?.free_bytes as number) ?? 0,
        usedBytes: (memory?.used_bytes as number) ?? 0,
        usedPercent: (memory?.used_percent as number) ?? 0,
      },
      storage: {
        totalBytes: (storage?.total_bytes as number) ?? 0,
        freeBytes: (storage?.free_bytes as number) ?? 0,
        usedBytes: (storage?.used_bytes as number) ?? 0,
        usedPercent: (storage?.used_percent as number) ?? 0,
      },
      healthSensors: (data.health_sensors as Record<string, unknown>) ?? {},
      activeSessions: (data.active_sessions as Array<unknown>) ?? [],
      activeSessionCount: (data.active_users as number) ?? (data.active_hotspot_sessions as number) ?? (data.active_session_count as number) ?? 0,
      interfaces: (data.interfaces as Array<unknown>) ?? [],
      generatedAt: (data.generated_at as string) ?? '',
      uptime: (system?.uptime as string) ?? '',
      // Additional fields
      routerId: (data.router_id as number) ?? 0,
      routerName: (data.router_name as string) ?? '',
      bandwidth: bandwidth ? {
        downloadMbps: (bandwidth.download_mbps as number) ?? 0,
        uploadMbps: (bandwidth.upload_mbps as number) ?? 0,
      } : undefined,
      snapshotAgeSeconds: (data.snapshot_age_seconds as number) ?? 0,
      cached: (data.cached as boolean) ?? false,
      cacheAgeSeconds: (data.cache_age_seconds as number) ?? 0,
    } as MikroTikMetrics;
  }

  // Bandwidth History
  async getBandwidthHistory(hours = 24, routerId?: number): Promise<BandwidthHistory> {
    if (this.isDemoMode()) return demo.demoBandwidthHistory;
    const params = new URLSearchParams();
    params.append('hours', hours.toString());
    if (routerId) {
      params.append('router_id', routerId.toString());
    }
    const response = await fetch(
      `${BASE_URL}/mikrotik/bandwidth-history?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<BandwidthHistory>(response);
  }

  // Top Users by Bandwidth
  async getTopUsers(limit = 10, routerId?: number): Promise<TopUsersResponse> {
    if (this.isDemoMode()) return demo.demoTopUsers;
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (routerId) {
      params.append('router_id', routerId.toString());
    }
    const response = await fetch(
      `${BASE_URL}/mikrotik/top-users?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<TopUsersResponse>(response);
  }

  // Dashboard Overview (legacy)
  async getDashboardOverview(userId = 1): Promise<DashboardOverview> {
    if (this.isDemoMode()) return demo.demoDashboardOverview;
    const response = await fetch(
      `${BASE_URL}/dashboard/overview?user_id=${userId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<DashboardOverview>(response);
  }

  // Customers
  async getCustomers(userId?: number): Promise<Customer[]>;
  async getCustomers(userId: number, page: number, perPage: number): Promise<PaginatedResponse<Customer>>;
  async getCustomers(userId = 1, page?: number, perPage?: number): Promise<Customer[] | PaginatedResponse<Customer>> {
    if (this.isDemoMode()) {
      const all = demo.demoCustomers;
      if (page && perPage) {
        const start = (page - 1) * perPage;
        return { data: all.slice(start, start + perPage), page, per_page: perPage, total: all.length, total_pages: Math.ceil(all.length / perPage) };
      }
      return all;
    }
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    const response = await fetch(
      `${BASE_URL}/customers?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    const result = await this.handleResponse<Customer[] | PaginatedResponse<Customer>>(response);
    if (page && perPage && Array.isArray(result)) {
      const total = result.length;
      const start = (page - 1) * perPage;
      return { data: result.slice(start, start + perPage), page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 };
    }
    return result;
  }

  async getActiveCustomers(userId?: number): Promise<Customer[]>;
  async getActiveCustomers(userId: number, page: number, perPage: number): Promise<PaginatedResponse<Customer>>;
  async getActiveCustomers(userId = 1, page?: number, perPage?: number): Promise<Customer[] | PaginatedResponse<Customer>> {
    if (this.isDemoMode()) {
      const all = demo.demoCustomers.filter(c => c.status === 'active');
      if (page && perPage) {
        const start = (page - 1) * perPage;
        return { data: all.slice(start, start + perPage), page, per_page: perPage, total: all.length, total_pages: Math.ceil(all.length / perPage) };
      }
      return all;
    }
    const params = new URLSearchParams({ user_id: userId.toString() });
    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());
    const response = await fetch(
      `${BASE_URL}/customers/active?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    const result = await this.handleResponse<Customer[] | PaginatedResponse<Customer>>(response);
    if (page && perPage && Array.isArray(result)) {
      const total = result.length;
      const start = (page - 1) * perPage;
      return { data: result.slice(start, start + perPage), page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) || 1 };
    }
    return result;
  }

  // Plans
  async getPlans(userId?: number, connectionType?: string): Promise<Plan[]> {
    if (this.isDemoMode()) return connectionType ? demo.demoPlans.filter(p => p.connection_type === connectionType) : demo.demoPlans;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (connectionType) params.append('connection_type', connectionType);
    
    const response = await fetch(
      `${BASE_URL}/plans?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<Plan[]>(response);
  }

  async createPlan(plan: CreatePlanRequest): Promise<Plan> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/plans/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plan),
    });
    return this.handleResponse<Plan>(response);
  }

  async updatePlan(planId: number, updates: UpdatePlanRequest): Promise<Plan> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/plans/${planId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse<Plan>(response);
  }

  async deletePlan(planId: number, userId = 1): Promise<{ success: boolean; message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(
      `${BASE_URL}/plans/${planId}?user_id=${userId}`,
      { method: 'DELETE', headers: this.getHeaders() }
    );
    return this.handleResponse(response);
  }

  async activateEmergencyMode(data: ActivateEmergencyRequest): Promise<EmergencyModeResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/plans/activate-emergency`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deactivateEmergencyMode(data: DeactivateEmergencyRequest): Promise<EmergencyModeResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/plans/deactivate-emergency`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getPlanPerformance(
    userId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<PlanPerformanceResponse> {
    if (this.isDemoMode()) return demo.demoPlanPerformance;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await fetch(
      `${BASE_URL}/plans/performance?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<PlanPerformanceResponse>(response);
  }

  // Transactions (Mobile + Cash)
  async getTransactions(
    userId?: number,
    routerId?: number,
    startDate?: string,
    endDate?: string,
    status?: string,
    signal?: AbortSignal,
    paymentMethod?: string,
    date?: string,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<MpesaTransaction>> {
    if (this.isDemoMode()) {
      const all = demo.demoTransactions;
      const start = (page - 1) * perPage;
      return {
        data: all.slice(start, start + perPage),
        page,
        per_page: perPage,
        total: all.length,
        total_pages: Math.ceil(all.length / perPage),
      };
    }
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (routerId) params.append('router_id', routerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (status) params.append('status', status);
    if (paymentMethod) params.append('payment_method', paymentMethod);
    if (date) params.append('date', date);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const response = await fetch(
      `${BASE_URL}/mpesa/transactions?${params.toString()}`,
      { headers: this.getHeaders(), signal }
    );
    const result = await this.handleResponse<MpesaTransaction[] | PaginatedResponse<MpesaTransaction>>(response);
    if (Array.isArray(result)) {
      const total = result.length;
      const start = (page - 1) * perPage;
      return {
        data: result.slice(start, start + perPage),
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage) || 1,
      };
    }
    return result;
  }

  async getTransactionSummary(
    userId?: number,
    routerId?: number,
    startDate?: string,
    endDate?: string,
    signal?: AbortSignal,
    paymentMethod?: string,
    date?: string
  ): Promise<TransactionSummary> {
    if (this.isDemoMode()) return demo.demoTransactionSummary;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (routerId) params.append('router_id', routerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (paymentMethod) params.append('payment_method', paymentMethod);
    if (date) params.append('date', date);

    const response = await fetch(
      `${BASE_URL}/mpesa/transactions/summary?${params.toString()}`,
      { headers: this.getHeaders(), signal }
    );
    return this.handleResponse<TransactionSummary>(response);
  }

  async manualProvisionTransaction(
    paymentMethod: string,
    transactionId: number
  ): Promise<ManualProvisionResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(
      `${BASE_URL}/transactions/${paymentMethod}/${transactionId}/manual-provision`,
      { method: 'POST', headers: this.getHeaders() }
    );
    return this.handleResponse<ManualProvisionResponse>(response);
  }

  // Routers
  async getRouters(): Promise<Router[]> {
    if (this.isDemoMode()) return demo.demoRouters;
    const response = await fetch(`${BASE_URL}/routers`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<Router[]>(response);
  }

  async createRouter(router: CreateRouterRequest): Promise<Router> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(router),
    });
    return this.handleResponse<Router>(response);
  }

  async updateRouter(routerId: number, updates: UpdateRouterRequest): Promise<Router> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse<Router>(response);
  }

  async deleteRouter(routerId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}?force=true`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async getRoutersByUserId(userId: number): Promise<Router[]> {
    if (this.isDemoMode()) return demo.demoRouters;
    const response = await fetch(`${BASE_URL}/routers?user_id=${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Router[]>(response);
  }

  async getRouterUptime(routerId: number, hours = 24, recentChecks = 50): Promise<RouterUptimeResponse> {
    if (this.isDemoMode()) return demo.demoRouterUptime(routerId);
    const response = await fetch(`${BASE_URL}/routers/${routerId}/uptime?hours=${hours}&recent_checks=${recentChecks}`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<RouterUptimeResponse>(response);
  }

  async getRouterUsers(routerId: number): Promise<RouterUsersResponse> {
    if (this.isDemoMode()) return demo.demoRouterUsers(routerId);
    const response = await fetch(`${BASE_URL}/routers/${routerId}/users`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<RouterUsersResponse>(response);
  }

  // Provisioning
  async createProvisionToken(vpnType: VpnType = 'wireguard'): Promise<ProvisionTokenResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/provision/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ vpn_type: vpnType }),
    });
    return this.handleResponse<ProvisionTokenResponse>(response);
  }

  async getProvisionTokens(): Promise<ProvisionToken[]> {
    if (this.isDemoMode()) return demo.demoProvisionTokens;
    const response = await fetch(`${BASE_URL}/provision/tokens`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ProvisionToken[]>(response);
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(credentials),
    });
    return this.handleResponse<LoginResponse>(response, true);
  }

  async register(data: RegisterRequest): Promise<{ message: string }> {
    const response = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string }>(response, true);
  }

  // Advertisers
  async getAdvertisers(): Promise<Advertiser[]> {
    if (this.isDemoMode()) return demo.demoAdvertisers;
    const response = await fetch(`${BASE_URL}/advertisers`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<Advertiser[]>(response);
  }

  async createAdvertiser(advertiser: CreateAdvertiserRequest): Promise<Advertiser> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/advertisers`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(advertiser),
    });
    return this.handleResponse<Advertiser>(response);
  }

  // Ads
  async getAds(
    page = 1,
    perPage = 20,
    category?: string
  ): Promise<AdsResponse> {
    if (this.isDemoMode()) return demo.demoAdsResponse;
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (category) params.append('category', category);

    const response = await fetch(
      `${BASE_URL}/ads?${params.toString()}`,
      { headers: this.getHeaders(true) }
    );
    return this.handleResponse<AdsResponse>(response);
  }

  async createAd(ad: CreateAdRequest): Promise<Ad> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/ads`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(ad),
    });
    return this.handleResponse<Ad>(response);
  }

  async deleteAd(adId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/ads/${adId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async updateAd(adId: number, updates: Partial<Ad>): Promise<Ad> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/ads/${adId}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(updates),
    });
    return this.handleResponse<Ad>(response);
  }

  async getAdClicks(
    adId: number,
    page = 1,
    perPage = 50,
    clickType?: 'view_details' | 'call' | 'whatsapp'
  ): Promise<AdClicksResponse> {
    if (this.isDemoMode()) return demo.demoAdClicksResponse;
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    if (clickType) params.append('click_type', clickType);

    const response = await fetch(
      `${BASE_URL}/ads/${adId}/clicks?${params.toString()}`,
      { headers: this.getHeaders(true) }
    );
    return this.handleResponse<AdClicksResponse>(response);
  }

  async getAdImpressions(
    adId: number,
    page = 1,
    perPage = 50
  ): Promise<AdImpressionsResponse> {
    if (this.isDemoMode()) return demo.demoAdImpressionsResponse;
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const response = await fetch(
      `${BASE_URL}/ads/${adId}/impressions?${params.toString()}`,
      { headers: this.getHeaders(true) }
    );
    return this.handleResponse<AdImpressionsResponse>(response);
  }

  async getAdAnalytics(days = 30): Promise<AdAnalytics> {
    if (this.isDemoMode()) return demo.demoAdAnalytics;
    const response = await fetch(
      `${BASE_URL}/ads/analytics?days=${days}`,
      { headers: this.getHeaders(true) }
    );
    return this.handleResponse<AdAnalytics>(response);
  }

  // Ratings
  async getRatings(
    userId?: number,
    includeLocation = true
  ): Promise<Rating[]> {
    if (this.isDemoMode()) return demo.demoRatings;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (includeLocation) params.append('include_location', 'true');

    const response = await fetch(
      `${BASE_URL}/ratings?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<Rating[]>(response);
  }

  async getRatingsSummary(userId?: number): Promise<RatingSummary> {
    if (this.isDemoMode()) return demo.demoRatingSummary;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());

    const response = await fetch(
      `${BASE_URL}/ratings/summary?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<RatingSummary>(response);
  }

  async getCustomersMapData(
    userId?: number,
    withRatings = true
  ): Promise<CustomerMapData[]> {
    if (this.isDemoMode()) return demo.demoCustomerMapData;
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (withRatings) params.append('with_ratings', 'true');

    const response = await fetch(
      `${BASE_URL}/customers/map?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<CustomerMapData[]>(response);
  }

  async getRatingsByLocation(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    userId?: number
  ): Promise<Rating[]> {
    if (this.isDemoMode()) return demo.demoRatings;
    const params = new URLSearchParams();
    params.append('min_lat', minLat.toString());
    params.append('max_lat', maxLat.toString());
    params.append('min_lng', minLng.toString());
    params.append('max_lng', maxLng.toString());
    if (userId) params.append('user_id', userId.toString());

    const response = await fetch(
      `${BASE_URL}/ratings/by-location?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<Rating[]>(response);
  }

  // Vouchers
  async generateVouchers(request: GenerateVouchersRequest): Promise<Voucher[]> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/vouchers/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<Voucher[]>(response);
  }

  async getVouchers(filters: VoucherFilters = {}): Promise<VouchersListResponse> {
    if (this.isDemoMode()) return demo.demoVouchersListResponse;
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.plan_id) params.append('plan_id', filters.plan_id.toString());
    if (filters.router_id) params.append('router_id', filters.router_id.toString());
    if (filters.batch_id) params.append('batch_id', filters.batch_id);
    params.append('page', (filters.page ?? 1).toString());
    params.append('per_page', (filters.per_page ?? 50).toString());

    const response = await fetch(
      `${BASE_URL}/vouchers?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<VouchersListResponse>(response);
  }

  async getVoucherStats(): Promise<VoucherStats> {
    if (this.isDemoMode()) return demo.demoVoucherStats;
    const response = await fetch(`${BASE_URL}/vouchers/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<VoucherStats>(response);
  }

  async disableVoucher(voucherId: number): Promise<Voucher> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/vouchers/${voucherId}/disable`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Voucher>(response);
  }

  getVouchersDownloadUrl(filters: { status?: string; batch_id?: string; plan_id?: number } = {}): string {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.batch_id) params.append('batch_id', filters.batch_id);
    if (filters.plan_id) params.append('plan_id', filters.plan_id.toString());
    const query = params.toString();
    return `${BASE_URL}/vouchers/download${query ? `?${query}` : ''}`;
  }

  async downloadVouchersCSV(filters: { status?: string; batch_id?: string; plan_id?: number } = {}): Promise<void> {
    if (this.isDemoMode()) this.demoBlock();
    const url = this.getVouchersDownloadUrl(filters);
    const response = await fetch(url, { headers: this.getHeaders() });
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'vouchers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  async updateCustomer(customerId: number, data: UpdateCustomerRequest): Promise<UpdateCustomerResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UpdateCustomerResponse>(response);
  }

  async deleteCustomer(customerId: number): Promise<DeleteCustomerResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/${customerId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<DeleteCustomerResponse>(response);
  }

  // PPPoE Customer Management
  async registerCustomer(data: RegisterCustomerRequest): Promise<Customer> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Customer>(response);
  }

  async activatePPPoE(customerId: number, data: ActivatePPPoERequest = {}): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/${customerId}/activate-pppoe`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async deactivatePPPoE(customerId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/${customerId}/deactivate-pppoe`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async getPPPoECredentials(customerId: number): Promise<PPPoECredentials> {
    if (this.isDemoMode()) return demo.demoPPPoECredentials(customerId);
    const response = await fetch(`${BASE_URL}/customers/${customerId}/pppoe-credentials`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoECredentials>(response);
  }

  async regeneratePPPoEPassword(customerId: number): Promise<PPPoECredentials> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/customers/${customerId}/regenerate-pppoe-password`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoECredentials>(response);
  }

  // Router Interfaces & PPPoE Port Provisioning
  async getRouterInterfaces(routerId: number): Promise<RouterInterfacesResponse> {
    if (this.isDemoMode()) return demo.demoRouterInterfaces(routerId);
    const response = await fetch(`${BASE_URL}/routers/${routerId}/interfaces`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<RouterInterfacesResponse>(response);
  }

  async updatePPPoEPorts(routerId: number, data: UpdatePPPoEPortsRequest): Promise<UpdatePPPoEPortsResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}/pppoe-ports`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UpdatePPPoEPortsResponse>(response);
  }

  async updatePlainPorts(routerId: number, data: UpdatePlainPortsRequest): Promise<UpdatePlainPortsResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}/plain-ports`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UpdatePlainPortsResponse>(response);
  }

  async updateDualPorts(routerId: number, data: UpdateDualPortsRequest): Promise<UpdateDualPortsResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}/dual-ports`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UpdateDualPortsResponse>(response);
  }

  // MikroTik PPPoE Monitoring
  async getPPPoEActiveSessions(routerId: number): Promise<PPPoEActiveResponse> {
    if (this.isDemoMode()) return demo.demoPPPoEActiveSessions(routerId);
    const response = await fetch(`${BASE_URL}/mikrotik/${routerId}/pppoe/active`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoEActiveResponse>(response);
  }

  // Network Diagnostics - PPPoE
  async getPPPoEOverview(routerId: number, refresh = false): Promise<PPPoEOverviewResponse> {
    if (this.isDemoMode()) return demo.demoPPPoEOverview(routerId);
    const params = refresh ? '?refresh=true' : '';
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/overview${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoEOverviewResponse>(response);
  }

  async diagnosePPPoE(routerId: number, username: string): Promise<PPPoEDiagnoseResponse> {
    if (this.isDemoMode()) return {
      router_id: routerId, router_name: 'Demo Router', generated_at: new Date().toISOString(),
      customer: null, success: true, username, status: 'connected', issues_count: 0,
      has_critical: false, issues: [], info: {},
    };
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/diagnose/${encodeURIComponent(username)}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoEDiagnoseResponse>(response);
  }

  async getPPPoELogs(routerId: number, username?: string, limit = 50): Promise<PPPoELogsResponse> {
    if (this.isDemoMode()) return demo.demoPPPoELogs(routerId);
    const params = new URLSearchParams({ limit: limit.toString() });
    if (username) params.set('username', username);
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/logs?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoELogsResponse>(response);
  }

  async getPPPoESecrets(routerId: number): Promise<PPPoESecretsResponse> {
    if (this.isDemoMode()) return demo.demoPPPoESecrets(routerId);
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/secrets`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoESecretsResponse>(response);
  }

  // Network Diagnostics - Hotspot
  async getHotspotOverview(routerId: number, refresh = false): Promise<HotspotOverviewResponse> {
    if (this.isDemoMode()) return demo.demoHotspotOverview(routerId);
    const params = refresh ? '?refresh=true' : '';
    const response = await fetch(`${BASE_URL}/hotspot/${routerId}/overview${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<HotspotOverviewResponse>(response);
  }

  async getHotspotLogs(routerId: number, search?: string, limit = 50): Promise<HotspotLogsResponse> {
    if (this.isDemoMode()) return demo.demoHotspotLogs(routerId);
    const params = new URLSearchParams({ limit: limit.toString() });
    if (search) params.set('search', search);
    const response = await fetch(`${BASE_URL}/hotspot/${routerId}/logs?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<HotspotLogsResponse>(response);
  }

  // Network Diagnostics - Shared
  async getPortStatus(routerId: number, refresh = false): Promise<PortStatusResponse> {
    if (this.isDemoMode()) return demo.demoPortStatus(routerId);
    const params = refresh ? '?refresh=true' : '';
    const response = await fetch(`${BASE_URL}/routers/${routerId}/ports${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PortStatusResponse>(response);
  }

  async diagnoseMac(routerId: number, macAddress: string): Promise<MacDiagnoseResponse> {
    if (this.isDemoMode()) return {
      mac_address: macAddress, normalized: macAddress.toUpperCase(), username_format: macAddress.replace(/:/g, ''),
      database_info: null, infrastructure: {}, infrastructure_issues: [],
      router_entries: {}, diagnosis: ['Demo mode - MAC diagnosis unavailable'], recommendations: [],
      can_access_internet: true, total_router_entries: 0, total_issues: 0,
    };
    const response = await fetch(`${BASE_URL}/routers/${routerId}/diagnose/${encodeURIComponent(macAddress)}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<MacDiagnoseResponse>(response);
  }

  // Walled Garden
  async getWalledGarden(routerId: number): Promise<WalledGardenResponse> {
    if (this.isDemoMode()) return demo.demoWalledGarden;
    const response = await fetch(`${BASE_URL}/mikrotik/walled-garden?router_id=${routerId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<WalledGardenResponse>(response);
  }

  async addWalledGardenDomain(data: AddWalledGardenDomainRequest): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/mikrotik/walled-garden/domain?router_id=${data.router_id}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ dst_host: data.dst_host, comment: data.comment }),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async addWalledGardenIp(data: AddWalledGardenIpRequest): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/mikrotik/walled-garden/ip?router_id=${data.router_id}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ dst_address: data.dst_address, comment: data.comment }),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async removeWalledGardenDomain(entryId: string, routerId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/mikrotik/walled-garden/domain/${encodeURIComponent(entryId)}?router_id=${routerId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async removeWalledGardenIp(entryId: string, routerId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/mikrotik/walled-garden/ip/${encodeURIComponent(entryId)}?router_id=${routerId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // Admin Reseller Management

  async getAdminDashboard(): Promise<AdminDashboard> {
    if (this.isDemoMode()) return demo.demoAdminDashboard;
    const response = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminDashboard>(response);
  }

  async getAdminResellers(params?: AdminResellersParams): Promise<AdminResellersResponse> {
    if (this.isDemoMode()) return demo.demoAdminResellers(params);
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.filter) qs.set('filter', params.filter);
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    if (params?.sort_order) qs.set('sort_order', params.sort_order);
    if (params?.date) qs.set('date', params.date);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/resellers${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminResellersResponse>(response);
  }

  async getAdminResellerDetail(resellerId: number, params?: { date?: string; start_date?: string; end_date?: string }): Promise<AdminResellerDetail> {
    if (this.isDemoMode()) return demo.demoAdminResellerDetail(resellerId);
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminResellerDetail>(response);
  }

  async getAdminResellerPayments(
    resellerId: number,
    params?: { page?: number; per_page?: number; date?: string; start_date?: string; end_date?: string }
  ): Promise<AdminPaymentsResponse> {
    if (this.isDemoMode()) return demo.demoAdminResellerPayments(resellerId, params?.page, params?.per_page);
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.per_page) qs.set('per_page', params.per_page.toString());
    if (params?.date) qs.set('date', params.date);
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/payments${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminPaymentsResponse>(response);
  }

  async getAdminResellerRouters(resellerId: number): Promise<AdminRoutersResponse> {
    if (this.isDemoMode()) return demo.demoAdminResellerRouters(resellerId);
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/routers`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminRoutersResponse>(response);
  }

  async createAdminPayout(resellerId: number, data: AdminCreatePayoutRequest): Promise<AdminPayoutResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/payouts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AdminPayoutResponse>(response);
  }

  async getAdminPayouts(
    resellerId: number,
    params?: { page?: number; per_page?: number; start_date?: string; end_date?: string }
  ): Promise<AdminPayoutsResponse> {
    if (this.isDemoMode()) return demo.demoAdminPayouts(resellerId, params?.page, params?.per_page);
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.per_page) qs.set('per_page', params.per_page.toString());
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/payouts${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminPayoutsResponse>(response);
  }

  // Admin Transaction Charges

  async createAdminTransactionCharge(
    resellerId: number,
    data: AdminCreateTransactionChargeRequest
  ): Promise<AdminTransactionChargeResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/transaction-charges`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AdminTransactionChargeResponse>(response);
  }

  async getAdminTransactionCharges(
    resellerId: number,
    params?: { page?: number; per_page?: number; start_date?: string; end_date?: string }
  ): Promise<AdminTransactionChargesResponse> {
    if (this.isDemoMode()) {
      return {
        reseller_id: resellerId, page: 1, per_page: 50,
        total_count: 0, total_pages: 1,
        summary: { total_charges: 0, total_amount: 0 },
        charges: [],
      };
    }
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.per_page) qs.set('per_page', params.per_page.toString());
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/transaction-charges${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminTransactionChargesResponse>(response);
  }

  // Reseller Account Statement

  async getResellerAccountStatement(
    params?: { page?: number; per_page?: number; start_date?: string; end_date?: string }
  ): Promise<ResellerAccountStatement> {
    if (this.isDemoMode()) {
      return {
        balance: { total_system_collected: 0, total_paid_to_you: 0, total_transaction_charges: 0, unpaid_balance: 0 },
        period_summary: { total_payouts: 0, total_charges: 0, net: 0 },
        page: 1, per_page: 50, total_entries: 0, total_pages: 1,
        entries: [],
      };
    }
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.per_page) qs.set('per_page', params.per_page.toString());
    if (params?.start_date) qs.set('start_date', params.start_date);
    if (params?.end_date) qs.set('end_date', params.end_date);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/reseller/account-statement${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ResellerAccountStatement>(response);
  }

  // Payment Methods CRUD

  async getPaymentMethods(includeInactive = false): Promise<PaymentMethodConfig[]> {
    if (this.isDemoMode()) return [];
    const params = includeInactive ? '?include_inactive=true' : '';
    const response = await fetch(`${BASE_URL}/payment-methods${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PaymentMethodConfig[]>(response);
  }

  async getPaymentMethod(id: number): Promise<PaymentMethodConfig> {
    if (this.isDemoMode()) throw new Error('Not available in demo mode');
    const response = await fetch(`${BASE_URL}/payment-methods/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PaymentMethodConfig>(response);
  }

  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethodConfig> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/payment-methods`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PaymentMethodConfig>(response);
  }

  async updatePaymentMethod(id: number, data: UpdatePaymentMethodRequest): Promise<PaymentMethodConfig> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/payment-methods/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<PaymentMethodConfig>(response);
  }

  async deletePaymentMethod(id: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/payment-methods/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async testPaymentMethod(id: number): Promise<PaymentMethodTestResult> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/payment-methods/${id}/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<PaymentMethodTestResult>(response);
  }

  // Router Payment Method Assignment

  async assignRouterPaymentMethod(
    routerId: number,
    paymentMethodId: number | null
  ): Promise<{ message: string; router_id: number; payment_method_id: number | null }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/routers/${routerId}/payment-method`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });
    return this.handleResponse<{ message: string; router_id: number; payment_method_id: number | null }>(response);
  }

  // Profile

  async getProfile(): Promise<UserProfile> {
    if (this.isDemoMode()) {
      return {
        id: 0,
        user_code: 100000,
        email: 'demo@bitwave.co.ke',
        role: 'reseller',
        organization_name: 'Demo ISP Network',
        business_name: 'Demo Business',
        support_phone: '+254700000000',
        mpesa_shortcode: '600000',
        created_at: '2025-01-01T00:00:00',
        last_login_at: new Date().toISOString(),
      };
    }
    const response = await fetch(`${BASE_URL}/profile`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UserProfile>(response);
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/profile`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UserProfile>(response);
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/profile/password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async deleteAccount(): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/profile`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }
}

export const api = new ApiClient();

