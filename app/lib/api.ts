import {
  ShopProduct,
  CreateProductRequest,
  UpdateProductRequest,
  ShopOrder,
  ShopOrderStatus,
  ShopPaymentStatus,
  ShopDashboard,
  ShopAnalytics,
  AddTrackingEventRequest,
  ShopTrackingEvent,
  PlaceOrderRequest,
  PlaceOrderResponse,
  InitiatePaymentResponse,
  ShopPaymentStatusResponse,
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
  PPPoEClientDetailsResponse,
  PPPoELogsResponse,
  PPPoESecretsResponse,
  PPPoEMonitorResponse,
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
  DeleteResellerPreview,
  DeleteResellerResponse,
  AdminResellerStats,
  AdminResellerStatsPeriod,
  B2BFeePreview,
  B2BPayoutRequest,
  B2BPayoutResponse,
  PaginatedResponse,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  SubscriptionOverview,
  SubscriptionInvoice,
  SubscriptionInvoicesResponse,
  SubscriptionPaymentsResponse,
  SubscriptionPayRequest,
  SubscriptionPayResponse,
  AdminSubscriptionsResponse,
  AdminSubscriptionRevenue,
  AdminExpiringSoon,
  AdminSubscriptionDetail,
  EditSubscriptionRequest,
  EditSubscriptionResponse,
  ActivateSubscriptionResponse,
  DeactivateSubscriptionResponse,
  WaiveInvoiceResponse,
  GenerateInvoicesResponse,
  RequestInvoiceResponse,
  GeneratePreExpiryInvoicesResponse,
  VerifyPaymentsResponse,
  AdminMRRMetrics,
  AdminChurnMetrics,
  AdminSignupsSummary,
  AdminCustomerSignupsTimeSeries,
  AdminSubscriptionRevenueHistory,
  AdminARPUMetrics,
  AdminTrialConversion,
  AdminActivationFunnel,
  AdminRevenueConcentration,
  AdminSmartAlertsResponse,
  AdminRevenueForecast,
  AdminGrowthTargetsResponse,
  GrowthTargetUpdatePayload,
  LeadSource,
  Lead,
  LeadDetail,
  LeadActivity,
  LeadFollowUp,
  LeadsListResponse,
  ActivitiesResponse,
  FollowUpsResponse,
  LeadPipelineSummary,
  LeadPipelineStats,
  CreateLeadRequest,
  UpdateLeadRequest,
  ChangeStageRequest,
  CreateSourceRequest,
  UpdateSourceRequest,
  CreateActivityRequest,
  CreateFollowUpRequest,
  ConvertLeadRequest,
  ConvertLeadResponse,
  LeadBackfillRequest,
  LeadBackfillResponse,
  LeadStage,
  AccessCredential,
  AccessCredentialsListResponse,
  AccessCredentialFilters,
  CreateAccessCredentialRequest,
  CreateAccessCredentialResponse,
  UpdateAccessCredentialRequest,
  CustomerUsageResponse,
  CustomerUsagePeriod,
  ResellerTopUsageEntry,
  PortalSettingsResponse,
  UpdatePortalSettingsRequest,
  UpdatePortalSettingsResponse,
} from './types';
import * as demo from './demoData';

const BASE_URL = 'https://isp.bitwavetechnologies.com/api';

class ApiClient {
  isDemoMode(): boolean {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('demo_mode') !== 'true') return false;
    try {
      const rawUser = localStorage.getItem('auth_user');
      if (!rawUser) return true;
      const parsed = JSON.parse(rawUser) as { role?: string };
      return parsed.role !== 'admin';
    } catch {
      return true;
    }
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
        // In demo mode, the token "demo-token" is not recognized by the real
        // backend. Any endpoint that wasn't stubbed will 401 — we must NOT
        // wipe the demo session and bounce the user back to /login. Instead,
        // throw a benign error so the calling page just shows a fallback.
        if (this.isDemoMode()) {
          throw new Error('Endpoint not available in demo mode.');
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      const errorMessage = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail) || `HTTP error! status: ${response.status}`;
      if (response.status === 403 && typeof errorMessage === 'string' && errorMessage.includes('subscription') && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscription-blocked', { detail: errorMessage }));
      }
      throw new Error(errorMessage);
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

  // MikroTik Metrics - GET /api/mikrotik/health[?router_id=<id>][&include_sessions=true]
  // The default response is slim (no per-session arrays). Pass `includeSessions=true` only for
  // legacy/backward-compat consumers — the array is capped at 50 entries; for full drill-down
  // use getPPPoEActiveSessions(routerId) / getActiveSessions(routerId).
  async getMikroTikMetrics(
    routerId?: number,
    options: { includeSessions?: boolean } = {}
  ): Promise<MikroTikMetrics> {
    if (this.isDemoMode()) return demo.demoMikroTikMetrics;
    const params = new URLSearchParams();
    if (routerId) {
      params.append('router_id', routerId.toString());
    }
    if (options.includeSessions) {
      params.append('include_sessions', 'true');
    }
    const qs = params.toString();
    const url = qs
      ? `${BASE_URL}/mikrotik/health?${qs}`
      : `${BASE_URL}/mikrotik/health`;
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

    // User counts. The backend now exposes hotspot/pppoe/total explicitly and guarantees
    // total == hotspot + pppoe. We fall back to legacy fields only if the new ones are absent
    // (e.g. older backend deployments) and re-compute total locally as a last resort.
    const hotspotRaw = data.active_hotspot_users ?? data.active_users;
    const pppoeRaw = data.active_pppoe_users;
    const activeHotspotUsers = (hotspotRaw as number) ?? 0;
    const activePppoeUsers = (pppoeRaw as number) ?? 0;
    const activeTotalUsers =
      (data.active_total_users as number) ?? activeHotspotUsers + activePppoeUsers;

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
      activeSessionCount: activeHotspotUsers,
      activeHotspotUsers,
      activePppoeUsers,
      activeTotalUsers,
      activePppoeSessions: (data.active_pppoe_sessions as Array<unknown>) ?? [],
      activePppoeCount: activePppoeUsers,
      sessionsTruncated: (data.sessions_truncated as boolean) ?? false,
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
      stale: (data.stale as boolean) ?? false,
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

  // PPPoE User Monitoring (bandwidth & online status)
  async getPPPoEUsers(routerId: number, refresh = false): Promise<PPPoEMonitorResponse> {
    const params = refresh ? '?refresh=true' : '';
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/users${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoEMonitorResponse>(response);
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

  async getPPPoEClientDetails(routerId: number, username: string): Promise<PPPoEClientDetailsResponse> {
    if (this.isDemoMode()) {
      return {
        router_id: routerId,
        router_name: 'Demo Router',
        username,
        generated_at: new Date().toISOString(),
        connection_state: 'offline',
        disconnect_reason: 'peer-not-responding',
        cause_hints: {
          category: 'physical_or_cpe',
          probable_cause: 'Client CPE is unreachable or link is unstable',
          technician_action: 'Check cable, switch port, CPE power, and link flaps',
        },
        summary: {
          issues_count: 0,
          has_critical: false,
          log_entries: 0,
        },
        technician_checklist: [],
        diagnostic: {
          success: true,
          username,
          status: 'offline',
          issues_count: 0,
          has_critical: false,
          issues: [],
          info: {
            ports: [],
            pppoe_servers: [],
            pppoe_access: {},
            bridge_pppoe: null,
            pool: [],
            secret: { name: username, last_disconnect_reason: 'peer-not-responding' },
            active_session: null,
            status: 'offline',
            last_disconnect_reason: 'peer-not-responding',
            recent_logs: [],
          },
        },
        recent_logs: [],
      };
    }
    const response = await fetch(`${BASE_URL}/pppoe/${routerId}/client-details/${encodeURIComponent(username)}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PPPoEClientDetailsResponse>(response);
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

  async getAdminResellerStats(period: AdminResellerStatsPeriod = '30d'): Promise<AdminResellerStats> {
    if (this.isDemoMode()) return demo.demoAdminResellerStats(period);
    const response = await fetch(`${BASE_URL}/admin/resellers/stats?period=${period}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminResellerStats>(response);
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

  // B2B Payout (backend-triggered M-Pesa payout)

  async getB2BFeePreview(resellerId: number): Promise<B2BFeePreview> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/b2b-fee-preview`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<B2BFeePreview>(response);
  }

  async triggerB2BPayout(resellerId: number, data?: B2BPayoutRequest): Promise<B2BPayoutResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}/b2b-payout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data || {}),
    });
    return this.handleResponse<B2BPayoutResponse>(response);
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

  async previewDeleteAdminReseller(resellerId: number): Promise<DeleteResellerPreview> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<DeleteResellerPreview>(response);
  }

  async confirmDeleteAdminReseller(resellerId: number): Promise<DeleteResellerResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/resellers/${resellerId}?confirm=true`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<DeleteResellerResponse>(response);
  }

  // Payment Methods CRUD

  async getPaymentMethods(includeInactive = false): Promise<PaymentMethodConfig[]> {
    if (this.isDemoMode()) {
      return includeInactive ? demo.demoPaymentMethods : demo.demoPaymentMethods.filter(p => p.is_active);
    }
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

  // Reseller Subscription
  async getSubscription(): Promise<SubscriptionOverview> {
    const response = await fetch(`${BASE_URL}/subscription`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionOverview>(response);
  }

  async getCurrentInvoice(): Promise<{ current_invoice: SubscriptionInvoice | null }> {
    const response = await fetch(`${BASE_URL}/subscription/current-invoice`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ current_invoice: SubscriptionInvoice | null }>(response);
  }

  async getSubscriptionInvoices(page = 1, perPage = 20, status?: string): Promise<SubscriptionInvoicesResponse> {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    if (status) params.set('status', status);
    const response = await fetch(`${BASE_URL}/subscription/invoices?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionInvoicesResponse>(response);
  }

  async getSubscriptionInvoice(invoiceId: number): Promise<SubscriptionInvoice> {
    const response = await fetch(`${BASE_URL}/subscription/invoices/${invoiceId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionInvoice>(response);
  }

  async paySubscriptionInvoice(data: SubscriptionPayRequest): Promise<SubscriptionPayResponse> {
    const response = await fetch(`${BASE_URL}/subscription/pay`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<SubscriptionPayResponse>(response);
  }

  async requestInvoice(): Promise<RequestInvoiceResponse> {
    const response = await fetch(`${BASE_URL}/subscription/request-invoice`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<RequestInvoiceResponse>(response);
  }

  async getSubscriptionPayments(page = 1, perPage = 20): Promise<SubscriptionPaymentsResponse> {
    const params = new URLSearchParams({ page: page.toString(), per_page: perPage.toString() });
    const response = await fetch(`${BASE_URL}/subscription/payments?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SubscriptionPaymentsResponse>(response);
  }

  // Admin Subscription Management
  async getAdminSubscriptions(params?: {
    status?: string;
    sort_by?: string;
    sort_order?: string;
    search?: string;
  }): Promise<AdminSubscriptionsResponse> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    if (params?.sort_order) qs.set('sort_order', params.sort_order);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/admin/subscriptions${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminSubscriptionsResponse>(response);
  }

  async getAdminSubscriptionRevenue(): Promise<AdminSubscriptionRevenue> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/revenue`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminSubscriptionRevenue>(response);
  }

  async getAdminExpiringSoon(days = 7): Promise<AdminExpiringSoon> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/expiring-soon?days=${days}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminExpiringSoon>(response);
  }

  async getAdminSubscriptionDetail(resellerId: number): Promise<AdminSubscriptionDetail> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AdminSubscriptionDetail>(response);
  }

  async editAdminSubscription(resellerId: number, data: EditSubscriptionRequest): Promise<EditSubscriptionResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<EditSubscriptionResponse>(response);
  }

  async activateSubscription(resellerId: number, months = 1): Promise<ActivateSubscriptionResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}/activate?months=${months}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<ActivateSubscriptionResponse>(response);
  }

  async deactivateSubscription(resellerId: number): Promise<DeactivateSubscriptionResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}/deactivate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<DeactivateSubscriptionResponse>(response);
  }

  async waiveInvoice(resellerId: number, invoiceId: number): Promise<WaiveInvoiceResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}/waive/${invoiceId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<WaiveInvoiceResponse>(response);
  }

  async generateInvoices(): Promise<GenerateInvoicesResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/generate-invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<GenerateInvoicesResponse>(response);
  }

  async generatePreExpiryInvoices(): Promise<GeneratePreExpiryInvoicesResponse> {
    const response = await fetch(`${BASE_URL}/admin/subscriptions/generate-pre-expiry-invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<GeneratePreExpiryInvoicesResponse>(response);
  }

  async verifySubscriptionPayments(resellerId: number): Promise<VerifyPaymentsResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/admin/subscriptions/${resellerId}/verify-payments`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<VerifyPaymentsResponse>(response);
  }

  // Admin Dashboard Metrics (new endpoints — gracefully return null until backend implements)

  async getAdminMRR(): Promise<AdminMRRMetrics | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/mrr`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminMRRMetrics>(response);
    } catch { return null; }
  }

  async getAdminChurn(period: string = 'month'): Promise<AdminChurnMetrics | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/churn?period=${period}`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminChurnMetrics>(response);
    } catch { return null; }
  }

  async getAdminSignupsSummary(period: string = '30d'): Promise<AdminSignupsSummary | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/signups-summary?period=${period}`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminSignupsSummary>(response);
    } catch { return null; }
  }

  async getAdminCustomerSignups(period: string = '30d'): Promise<AdminCustomerSignupsTimeSeries | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/customer-signups?period=${period}`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminCustomerSignupsTimeSeries>(response);
    } catch { return null; }
  }

  async getAdminSubscriptionRevenueHistory(period: string = '30d'): Promise<AdminSubscriptionRevenueHistory | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/subscription-revenue-history?period=${period}`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminSubscriptionRevenueHistory>(response);
    } catch { return null; }
  }

  async getAdminARPU(): Promise<AdminARPUMetrics | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/arpu`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminARPUMetrics>(response);
    } catch { return null; }
  }

  async getAdminTrialConversion(): Promise<AdminTrialConversion | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/trial-conversion`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminTrialConversion>(response);
    } catch { return null; }
  }

  async getAdminActivationFunnel(): Promise<AdminActivationFunnel | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/activation-funnel`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminActivationFunnel>(response);
    } catch { return null; }
  }

  async getAdminRevenueConcentration(): Promise<AdminRevenueConcentration | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/revenue-concentration`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminRevenueConcentration>(response);
    } catch { return null; }
  }

  async getAdminSmartAlerts(): Promise<AdminSmartAlertsResponse | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/smart-alerts`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminSmartAlertsResponse>(response);
    } catch { return null; }
  }

  async getAdminRevenueForecast(period: string = '30d', forecastDays: number = 30): Promise<AdminRevenueForecast | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/revenue-forecast?period=${period}&forecast_days=${forecastDays}`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminRevenueForecast>(response);
    } catch { return null; }
  }

  async getAdminGrowthTargets(): Promise<AdminGrowthTargetsResponse | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/growth-targets`, { headers: this.getHeaders() });
      return await this.handleResponse<AdminGrowthTargetsResponse>(response);
    } catch { return null; }
  }

  async updateAdminGrowthTargets(targets: GrowthTargetUpdatePayload[]): Promise<AdminGrowthTargetsResponse | null> {
    try {
      const response = await fetch(`${BASE_URL}/admin/metrics/growth-targets`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ targets }),
      });
      return await this.handleResponse<AdminGrowthTargetsResponse>(response);
    } catch { return null; }
  }

  // ─── Lead Pipeline / CRM ─────────────────────────────────────────

  async getLeadSources(activeOnly = true): Promise<LeadSource[]> {
    if (this.isDemoMode()) return demo.demoLeadSources.filter(s => !activeOnly || s.is_active);
    const params = new URLSearchParams({ active_only: String(activeOnly) });
    const response = await fetch(`${BASE_URL}/leads/sources?${params}`, { headers: this.getHeaders() });
    return this.handleResponse<LeadSource[]>(response);
  }

  async createLeadSource(data: CreateSourceRequest): Promise<LeadSource> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/sources`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<LeadSource>(response);
  }

  async updateLeadSource(id: number, data: UpdateSourceRequest): Promise<LeadSource> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/sources/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<LeadSource>(response);
  }

  async deleteLeadSource(id: number): Promise<{ detail: string; id: number }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/sources/${id}`, {
      method: 'DELETE', headers: this.getHeaders(),
    });
    return this.handleResponse<{ detail: string; id: number }>(response);
  }

  async getLeads(params?: {
    stage?: LeadStage; source_id?: number; search?: string; page?: number; per_page?: number;
  }): Promise<LeadsListResponse> {
    if (this.isDemoMode()) return demo.demoLeadsListResponse(params);
    const q = new URLSearchParams();
    if (params?.stage) q.append('stage', params.stage);
    if (params?.source_id) q.append('source_id', String(params.source_id));
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const response = await fetch(`${BASE_URL}/leads?${q}`, { headers: this.getHeaders() });
    return this.handleResponse<LeadsListResponse>(response);
  }

  async getLead(id: number): Promise<LeadDetail> {
    if (this.isDemoMode()) {
      const d = demo.demoLeadDetail(id);
      if (!d) throw new Error('Lead not found');
      return d;
    }
    const response = await fetch(`${BASE_URL}/leads/${id}`, { headers: this.getHeaders() });
    return this.handleResponse<LeadDetail>(response);
  }

  async createLead(data: CreateLeadRequest): Promise<Lead> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<Lead>(response);
  }

  async updateLead(id: number, data: UpdateLeadRequest): Promise<Lead> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PUT', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<Lead>(response);
  }

  async changeLeadStage(id: number, data: ChangeStageRequest): Promise<Lead> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${id}/stage`, {
      method: 'PATCH', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<Lead>(response);
  }

  async deleteLead(id: number): Promise<{ detail: string; id: number }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'DELETE', headers: this.getHeaders(),
    });
    return this.handleResponse<{ detail: string; id: number }>(response);
  }

  async getLeadPipelineSummary(): Promise<LeadPipelineSummary> {
    if (this.isDemoMode()) return demo.demoLeadPipelineSummary;
    const response = await fetch(`${BASE_URL}/leads/pipeline/summary`, { headers: this.getHeaders() });
    return this.handleResponse<LeadPipelineSummary>(response);
  }

  async getLeadPipelineStats(): Promise<LeadPipelineStats> {
    if (this.isDemoMode()) return demo.demoLeadPipelineStats;
    const response = await fetch(`${BASE_URL}/leads/pipeline/stats`, { headers: this.getHeaders() });
    return this.handleResponse<LeadPipelineStats>(response);
  }

  async logLeadActivity(leadId: number, data: CreateActivityRequest): Promise<LeadActivity> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${leadId}/activities`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<LeadActivity>(response);
  }

  async getLeadActivities(leadId: number): Promise<ActivitiesResponse> {
    if (this.isDemoMode()) {
      const d = demo.demoLeadDetail(leadId);
      return { activities: d?.activities || [] };
    }
    const response = await fetch(`${BASE_URL}/leads/${leadId}/activities`, { headers: this.getHeaders() });
    return this.handleResponse<ActivitiesResponse>(response);
  }

  async createLeadFollowUp(leadId: number, data: CreateFollowUpRequest): Promise<LeadFollowUp> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${leadId}/followups`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<LeadFollowUp>(response);
  }

  async getUpcomingFollowUps(days = 7): Promise<FollowUpsResponse> {
    if (this.isDemoMode()) return demo.demoUpcomingFollowUps(days);
    const params = new URLSearchParams({ days: String(days) });
    const response = await fetch(`${BASE_URL}/leads/followups/upcoming?${params}`, { headers: this.getHeaders() });
    return this.handleResponse<FollowUpsResponse>(response);
  }

  async completeFollowUp(followUpId: number): Promise<{ detail: string; id: number }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/followups/${followUpId}/complete`, {
      method: 'PATCH', headers: this.getHeaders(),
    });
    return this.handleResponse<{ detail: string; id: number }>(response);
  }

  async convertLead(leadId: number, data: ConvertLeadRequest): Promise<ConvertLeadResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/leads/${leadId}/convert`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<ConvertLeadResponse>(response);
  }

  async backfillLeads(data: LeadBackfillRequest = {}): Promise<LeadBackfillResponse> {
    if (this.isDemoMode()) return demo.demoBackfillLeads(data);
    const response = await fetch(`${BASE_URL}/leads/backfill`, {
      method: 'POST', headers: this.getHeaders(), body: JSON.stringify(data),
    });
    return this.handleResponse<LeadBackfillResponse>(response);
  }

  // ─── Access Credentials (perpetual hotspot logins) ────────────────

  async getAccessCredentials(filters: AccessCredentialFilters = {}): Promise<AccessCredentialsListResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.router_id) params.append('router_id', filters.router_id.toString());
    if (filters.q) params.append('q', filters.q);
    params.append('page', (filters.page ?? 1).toString());
    params.append('per_page', (filters.per_page ?? 50).toString());
    const response = await fetch(
      `${BASE_URL}/access-credentials?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<AccessCredentialsListResponse>(response);
  }

  async getAccessCredential(id: number, reveal = false): Promise<AccessCredential> {
    const params = reveal ? '?reveal=true' : '';
    const response = await fetch(`${BASE_URL}/access-credentials/${id}${params}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async createAccessCredential(data: CreateAccessCredentialRequest): Promise<CreateAccessCredentialResponse> {
    const response = await fetch(`${BASE_URL}/access-credentials`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<CreateAccessCredentialResponse>(response);
  }

  async updateAccessCredential(id: number, data: UpdateAccessCredentialRequest): Promise<AccessCredential> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async rotateAccessCredentialPassword(id: number): Promise<AccessCredential> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}/rotate-password`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async revokeAccessCredential(id: number): Promise<AccessCredential> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}/revoke`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async restoreAccessCredential(id: number): Promise<AccessCredential> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}/restore`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async forceLogoutAccessCredential(id: number): Promise<AccessCredential> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}/force-logout`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AccessCredential>(response);
  }

  async deleteAccessCredential(id: number): Promise<{ message: string }> {
    const response = await fetch(`${BASE_URL}/access-credentials/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  // ─── FUP / Per-Customer Usage Tracking ─────────────────────────────

  async getCustomerUsage(customerId: number): Promise<CustomerUsageResponse> {
    const response = await fetch(`${BASE_URL}/customers/${customerId}/usage`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<CustomerUsageResponse>(response);
  }

  async getCustomerUsageHistory(customerId: number, limit = 6): Promise<CustomerUsagePeriod[]> {
    const response = await fetch(
      `${BASE_URL}/customers/${customerId}/usage/history?limit=${limit}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<CustomerUsagePeriod[]>(response);
  }

  async getResellerTopUsage(limit = 20): Promise<ResellerTopUsageEntry[]> {
    if (this.isDemoMode()) return demo.demoResellerTopUsage(limit);
    const response = await fetch(
      `${BASE_URL}/resellers/me/usage/top?limit=${limit}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<ResellerTopUsageEntry[]>(response);
  }

  // ─── Shop ────────────────────────────────────────────────────────

  async getShopAdminProducts(): Promise<ShopProduct[]> {
    if (this.isDemoMode()) return demo.demoShopProducts;
    const response = await fetch(`${BASE_URL}/shop/admin/products`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ShopProduct[]>(response);
  }

  async createShopProduct(data: CreateProductRequest): Promise<ShopProduct> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/shop/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ShopProduct>(response);
  }

  async updateShopProduct(productId: number, data: UpdateProductRequest): Promise<ShopProduct> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/shop/products/${productId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ShopProduct>(response);
  }

  async deleteShopProduct(productId: number): Promise<{ message: string }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/shop/products/${productId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async getShopAdminOrders(params?: {
    status?: ShopOrderStatus;
    payment_status?: ShopPaymentStatus;
  }): Promise<ShopOrder[]> {
    if (this.isDemoMode()) {
      let orders = demo.demoShopOrders;
      if (params?.status) orders = orders.filter(o => o.status === params.status);
      if (params?.payment_status) orders = orders.filter(o => o.payment_status === params.payment_status);
      return orders;
    }
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.payment_status) qs.set('payment_status', params.payment_status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await fetch(`${BASE_URL}/shop/admin/orders${query}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ShopOrder[]>(response);
  }

  async getShopAdminOrder(orderId: number): Promise<ShopOrder> {
    if (this.isDemoMode()) {
      const order = demo.demoShopOrders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');
      return order;
    }
    const response = await fetch(`${BASE_URL}/shop/admin/orders/${orderId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ShopOrder>(response);
  }

  async updateShopOrderStatus(orderId: number, status: ShopOrderStatus): Promise<{ message: string; status: ShopOrderStatus }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/shop/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse<{ message: string; status: ShopOrderStatus }>(response);
  }

  async addShopTrackingEvent(orderId: number, data: AddTrackingEventRequest): Promise<ShopTrackingEvent> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/shop/admin/orders/${orderId}/tracking`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<ShopTrackingEvent>(response);
  }

  async getShopDashboard(): Promise<ShopDashboard> {
    if (this.isDemoMode()) return demo.demoShopDashboard;
    const response = await fetch(`${BASE_URL}/shop/dashboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ShopDashboard>(response);
  }

  async getShopAnalytics(preset = 'this_month'): Promise<ShopAnalytics> {
    if (this.isDemoMode()) return demo.demoShopAnalytics;
    const response = await fetch(`${BASE_URL}/shop/analytics?preset=${preset}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ShopAnalytics>(response);
  }

  // ─── Shop Public (no auth required) ──────────────────────────────

  async getShopPublicProduct(id: number): Promise<ShopProduct> {
    if (this.isDemoMode()) {
      const product = demo.demoShopProducts.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      return product;
    }
    const response = await fetch(`${BASE_URL}/shop/products/${id}`);
    return this.handleResponse<ShopProduct>(response);
  }

  async getShopPublicProducts(category?: string): Promise<ShopProduct[]> {
    if (this.isDemoMode()) {
      const products = demo.demoShopProducts.filter(p => p.is_active);
      if (category) return products.filter(p => p.category === category);
      return products;
    }
    const url = category
      ? `${BASE_URL}/shop/products?category=${encodeURIComponent(category as string)}`
      : `${BASE_URL}/shop/products`;
    const response = await fetch(url);
    return this.handleResponse<ShopProduct[]>(response);
  }

  async placeShopOrder(data: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    if (this.isDemoMode()) {
      const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
      return {
        order_id: Math.floor(Math.random() * 900) + 100,
        order_number: orderNum,
        total_amount: data.items.reduce((sum, item) => {
          const product = demo.demoShopProducts.find(p => p.id === item.product_id);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0),
        status: 'pending',
        payment_status: 'unpaid',
      };
    }
    const response = await fetch(`${BASE_URL}/shop/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<PlaceOrderResponse>(response);
  }

  async initiateShopPayment(orderId: number, phone: string): Promise<InitiatePaymentResponse> {
    if (this.isDemoMode()) {
      return {
        message: 'STK Push sent. Enter your M-Pesa PIN to complete payment.',
        checkout_request_id: `ws_CO_${Date.now()}`,
        order_number: `ORD-${orderId}`,
      };
    }
    const response = await fetch(`${BASE_URL}/shop/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return this.handleResponse<InitiatePaymentResponse>(response);
  }

  async checkShopPaymentStatus(orderId: number): Promise<ShopPaymentStatusResponse> {
    if (this.isDemoMode()) {
      return {
        payment_status: 'paid',
        status: 'confirmed',
        mpesa_receipt_number: `QJK${Math.floor(Math.random() * 900000 + 100000)}`,
      };
    }
    const response = await fetch(`${BASE_URL}/shop/orders/${orderId}/payment-status`);
    return this.handleResponse<ShopPaymentStatusResponse>(response);
  }

  async trackShopOrder(orderNumber: string, phone: string): Promise<ShopOrder> {
    if (this.isDemoMode()) {
      const order = demo.demoShopOrders[0];
      return {
        ...order,
        order_number: orderNumber,
        buyer_phone: phone,
      };
    }
    const response = await fetch(
      `${BASE_URL}/shop/orders/track/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`
    );
    return this.handleResponse<ShopOrder>(response);
  }

  // ─── Portal Customization ─────────────────────────────────────────

  async getPortalSettings(): Promise<PortalSettingsResponse> {
    if (this.isDemoMode()) {
      return {
        settings: {
          id: 1,
          user_id: 1,
          color_theme: 'sunset_orange',
          header_style: 'standard',
          show_ads: true,
          show_welcome_banner: true,
          welcome_title: 'Demo ISP',
          welcome_subtitle: 'Fast internet for everyone',
          company_logo_url: null,
          header_bg_image_url: null,
          footer_text: null,
          portal_support_phone: '+254700000000',
          portal_support_whatsapp: null,
          show_ratings: true,
          show_reconnect_button: true,
          show_social_links: false,
          facebook_url: null,
          whatsapp_group_url: null,
          instagram_url: null,
          show_announcement: false,
          announcement_type: 'info',
          announcement_text: null,
          portal_language: 'en',
          plans_section_title: null,
          featured_plan_ids: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        available_themes: ['ocean_blue', 'emerald_green', 'sunset_orange', 'midnight_purple', 'rose_gold', 'slate_gray'],
        available_header_styles: ['standard', 'minimal', 'hero', 'compact'],
        available_languages: ['en', 'sw', 'fr'],
        available_announcement_types: ['info', 'warning', 'success'],
      };
    }
    const response = await fetch(`${BASE_URL}/portal/settings`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<PortalSettingsResponse>(response);
  }

  async updatePortalSettings(data: UpdatePortalSettingsRequest): Promise<UpdatePortalSettingsResponse> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/portal/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UpdatePortalSettingsResponse>(response);
  }

  async resetPortalSettings(): Promise<{ message: string; settings: PortalSettingsResponse['settings'] }> {
    if (this.isDemoMode()) this.demoBlock();
    const response = await fetch(`${BASE_URL}/portal/settings/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<{ message: string; settings: PortalSettingsResponse['settings'] }>(response);
  }
}

export const api = new ApiClient();

