import {
  DashboardOverview,
  DashboardAnalytics,
  MikroTikMetrics,
  BandwidthHistory,
  TopUsersResponse,
  Customer,
  Plan,
  CreatePlanRequest,
  PlanPerformanceResponse,
  MpesaTransaction,
  TransactionSummary,
  Router,
  RouterUsersResponse,
  LoginRequest,
  LoginResponse,
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
} from './types';

const BASE_URL = 'https://isp.bitwavetechnologies.com/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private getHeaders(authenticated = false): HeadersInit {
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

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
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
    const response = await fetch(
      `${BASE_URL}/dashboard/overview?user_id=${userId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<DashboardOverview>(response);
  }

  // Customers
  async getCustomers(userId = 1): Promise<Customer[]> {
    const response = await fetch(
      `${BASE_URL}/customers?user_id=${userId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<Customer[]>(response);
  }

  async getActiveCustomers(userId = 1): Promise<Customer[]> {
    const response = await fetch(
      `${BASE_URL}/customers/active?user_id=${userId}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<Customer[]>(response);
  }

  // Plans
  async getPlans(userId?: number, connectionType?: string): Promise<Plan[]> {
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
    const response = await fetch(`${BASE_URL}/plans/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plan),
    });
    return this.handleResponse<Plan>(response);
  }

  async deletePlan(planId: number, userId = 1): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${BASE_URL}/plans/${planId}?user_id=${userId}`,
      { method: 'DELETE', headers: this.getHeaders() }
    );
    return this.handleResponse(response);
  }

  async getPlanPerformance(
    userId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<PlanPerformanceResponse> {
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

  // M-Pesa Transactions
  async getTransactions(
    userId?: number,
    routerId?: number,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<MpesaTransaction[]> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (routerId) params.append('router_id', routerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (status) params.append('status', status);
    
    const response = await fetch(
      `${BASE_URL}/mpesa/transactions?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<MpesaTransaction[]>(response);
  }

  async getTransactionSummary(
    userId?: number,
    routerId?: number,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSummary> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (routerId) params.append('router_id', routerId.toString());
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await fetch(
      `${BASE_URL}/mpesa/transactions/summary?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return this.handleResponse<TransactionSummary>(response);
  }

  // Routers
  async getRouters(): Promise<Router[]> {
    const response = await fetch(`${BASE_URL}/routers`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<Router[]>(response);
  }

  async getRoutersByUserId(userId: number): Promise<Router[]> {
    const response = await fetch(`${BASE_URL}/routers?user_id=${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Router[]>(response);
  }

  async getRouterUsers(routerId: number): Promise<RouterUsersResponse> {
    const response = await fetch(`${BASE_URL}/routers/${routerId}/users`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<RouterUsersResponse>(response);
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });
    return this.handleResponse<LoginResponse>(response);
  }

  // Advertisers
  async getAdvertisers(): Promise<Advertiser[]> {
    const response = await fetch(`${BASE_URL}/advertisers`, {
      headers: this.getHeaders(true),
    });
    return this.handleResponse<Advertiser[]>(response);
  }

  async createAdvertiser(advertiser: CreateAdvertiserRequest): Promise<Advertiser> {
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
    const response = await fetch(`${BASE_URL}/ads`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(ad),
    });
    return this.handleResponse<Ad>(response);
  }

  async deleteAd(adId: number): Promise<{ message: string }> {
    const response = await fetch(`${BASE_URL}/ads/${adId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true),
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async updateAd(adId: number, updates: Partial<Ad>): Promise<Ad> {
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
}

export const api = new ApiClient();

