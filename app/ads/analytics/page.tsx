'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { AdAnalytics } from '../../lib/types';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';

const PERIOD_OPTIONS = [
  { value: 1, label: '1 Day' },
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
];

export default function AdAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getAdAnalytics(period);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Analytics</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadAnalytics} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Ad Analytics" 
        subtitle="Track the performance of your advertising campaigns" 
      />

      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`period-pill ${
                period === option.value ? 'period-pill-active' : 'period-pill-inactive'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button onClick={loadAnalytics} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-6 animate-fade-in delay-1">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-accent-primary/10">
                  <svg className="w-6 h-6 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-xs text-foreground-muted">Active</span>
                  <p className="text-lg font-semibold text-success">{analytics.active_ads}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{analytics.total_ads}</p>
              <p className="text-sm text-foreground-muted">Total Ads</p>
            </div>

            <div className="card p-6 animate-fade-in delay-2">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{analytics.total_impressions.toLocaleString()}</p>
              <p className="text-sm text-foreground-muted">Total Impressions</p>
            </div>

            <div className="card p-6 animate-fade-in delay-3">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{analytics.total_clicks.toLocaleString()}</p>
              <p className="text-sm text-foreground-muted">Total Clicks</p>
            </div>

            <div className="card p-6 animate-fade-in delay-4">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {analytics.total_impressions > 0 
                  ? ((analytics.total_clicks / analytics.total_impressions) * 100).toFixed(2) 
                  : '0'}%
              </p>
              <p className="text-sm text-foreground-muted">Overall CTR</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Clicks by Type */}
            <div className="card p-6 animate-fade-in delay-5">
              <h3 className="text-lg font-semibold text-foreground mb-6">Clicks by Type</h3>
              
              <div className="space-y-4">
                {/* View Details */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-info/10 text-info">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <span className="text-foreground">View Details</span>
                    </div>
                    <span className="font-semibold text-foreground">{analytics.clicks_by_type.view_details.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-info rounded-full transition-all"
                      style={{ 
                        width: `${analytics.total_clicks > 0 
                          ? (analytics.clicks_by_type.view_details / analytics.total_clicks) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Call */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-foreground">Call</span>
                    </div>
                    <span className="font-semibold text-foreground">{analytics.clicks_by_type.call.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full transition-all"
                      style={{ 
                        width: `${analytics.total_clicks > 0 
                          ? (analytics.clicks_by_type.call / analytics.total_clicks) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-success/10 text-success">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <span className="text-foreground">WhatsApp</span>
                    </div>
                    <span className="font-semibold text-foreground">{analytics.clicks_by_type.whatsapp.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full transition-all"
                      style={{ 
                        width: `${analytics.total_clicks > 0 
                          ? (analytics.clicks_by_type.whatsapp / analytics.total_clicks) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Most popular action</span>
                  <span className="font-medium text-accent-primary">
                    {analytics.clicks_by_type.view_details >= analytics.clicks_by_type.call &&
                     analytics.clicks_by_type.view_details >= analytics.clicks_by_type.whatsapp
                      ? 'View Details'
                      : analytics.clicks_by_type.call >= analytics.clicks_by_type.whatsapp
                        ? 'Call'
                        : 'WhatsApp'}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Performing Ads */}
            <div className="card p-6 animate-fade-in delay-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Top Performing Ads</h3>
              
              {analytics.top_ads_by_clicks.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-foreground-muted">No ad performance data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.top_ads_by_clicks.map((ad, index) => {
                    const ctr = ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(1) : '0';
                    return (
                      <Link
                        key={ad.id}
                        href={`/ads/${ad.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl bg-background-tertiary/50 hover:bg-background-tertiary transition-colors group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-primary/10 text-accent-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate group-hover:text-accent-primary transition-colors">
                            {ad.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-foreground-muted mt-0.5">
                            <span>{ad.views_count.toLocaleString()} views</span>
                            <span>•</span>
                            <span>{ad.clicks_count.toLocaleString()} clicks</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-success">{ctr}%</p>
                          <p className="text-xs text-foreground-muted">CTR</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {analytics.top_ads_by_clicks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Link 
                    href="/ads" 
                    className="text-sm text-accent-primary hover:text-accent-primary-hover transition-colors flex items-center gap-1"
                  >
                    View all ads
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="card p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-foreground mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {analytics.total_impressions > 0 
                    ? Math.round(analytics.total_impressions / analytics.period_days).toLocaleString()
                    : 0}
                </p>
                <p className="text-sm text-foreground-muted">Avg. Daily Impressions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {analytics.total_clicks > 0 
                    ? Math.round(analytics.total_clicks / analytics.period_days).toLocaleString()
                    : 0}
                </p>
                <p className="text-sm text-foreground-muted">Avg. Daily Clicks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {analytics.total_ads > 0 
                    ? Math.round(analytics.total_clicks / analytics.total_ads).toLocaleString()
                    : 0}
                </p>
                <p className="text-sm text-foreground-muted">Avg. Clicks per Ad</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {analytics.total_ads > 0 
                    ? Math.round(analytics.total_impressions / analytics.total_ads).toLocaleString()
                    : 0}
                </p>
                <p className="text-sm text-foreground-muted">Avg. Views per Ad</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}


