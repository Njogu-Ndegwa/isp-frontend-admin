'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Ad, AdClick, AdImpression, AdsResponse, AdClicksResponse, AdImpressionsResponse } from '../../lib/types';
import { formatDateGMT3 } from '../../lib/dateUtils';
import Header from '../../components/Header';
import { PageLoader } from '../../components/LoadingSpinner';

type TabType = 'overview' | 'clicks' | 'impressions';

export default function AdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const adId = parseInt(params.id as string);
  
  const [ad, setAd] = useState<Ad | null>(null);
  const [clicks, setClicks] = useState<AdClick[]>([]);
  const [impressions, setImpressions] = useState<AdImpression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [clicksPage, setClicksPage] = useState(1);
  const [impressionsPage, setImpressionsPage] = useState(1);
  const [clicksTotal, setClicksTotal] = useState(0);
  const [impressionsTotal, setImpressionsTotal] = useState(0);
  const [clickTypeFilter, setClickTypeFilter] = useState<'view_details' | 'call' | 'whatsapp' | ''>('');
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadAdData();
  }, [adId]);

  useEffect(() => {
    if (activeTab === 'clicks') {
      loadClicks();
    } else if (activeTab === 'impressions') {
      loadImpressions();
    }
  }, [activeTab, clicksPage, impressionsPage, clickTypeFilter]);

  const loadAdData = async () => {
    try {
      setLoading(true);
      // Get ad from the ads list
      const adsResponse: AdsResponse = await api.getAds(1, 100);
      const foundAd = adsResponse.ads.find((a) => a.id === adId);
      if (foundAd) {
        setAd(foundAd);
      } else {
        setError('Ad not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ad');
    } finally {
      setLoading(false);
    }
  };

  const loadClicks = async () => {
    try {
      const response: AdClicksResponse = await api.getAdClicks(
        adId,
        clicksPage,
        50,
        clickTypeFilter || undefined
      );
      setClicks(response.clicks);
      setClicksTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to load clicks:', err);
    }
  };

  const loadImpressions = async () => {
    try {
      const response: AdImpressionsResponse = await api.getAdImpressions(adId, impressionsPage, 50);
      setImpressions(response.impressions);
      setImpressionsTotal(response.pagination.total);
    } catch (err) {
      console.error('Failed to load impressions:', err);
    }
  };

  const handleDeleteAd = async () => {
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      await api.deleteAd(adId);
      router.push('/ads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ad');
      setDeleting(false);
    }
  };

  const getClickTypeIcon = (clickType: string) => {
    switch (clickType) {
      case 'call':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        );
      case 'view_details':
      default:
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
    }
  };

  const getClickTypeBadge = (clickType: string) => {
    switch (clickType) {
      case 'call':
        return 'badge-info';
      case 'whatsapp':
        return 'badge-success';
      case 'view_details':
      default:
        return 'badge-warning';
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error || !ad) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Ad</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <Link href="/ads" className="btn-primary">
            Back to Ads
          </Link>
        </div>
      </div>
    );
  }

  const ctr = ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2) : '0';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/ads" className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ads
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Ad
          </button>
          <button
            onClick={handleDeleteAd}
            disabled={deleting}
            className="btn-danger flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Ad
              </>
            )}
          </button>
        </div>
      </div>

      <Header 
        title={ad.title} 
        subtitle={`${ad.seller_name} • ${ad.seller_location}`} 
      />

      {/* Ad Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-fade-in">
        {/* Image Preview */}
        <div className="card overflow-hidden">
          <div className="aspect-video bg-background-tertiary">
            {ad.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-foreground-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${ad.is_active ? 'badge-success' : 'badge-neutral'}`}>
                {ad.is_active ? 'Active' : 'Inactive'}
              </span>
              {ad.badge_text && (
                <span className="badge badge-warning">{ad.badge_text}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-accent-primary mb-2">{ad.price}</p>
            <p className="text-sm text-foreground-muted">{ad.description}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-info/10 text-info">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{ad.views_count.toLocaleString()}</p>
            <p className="text-sm text-foreground-muted">Total Views</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-warning/10 text-warning">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{ad.clicks_count.toLocaleString()}</p>
            <p className="text-sm text-foreground-muted">Total Clicks</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{ctr}%</p>
            <p className="text-sm text-foreground-muted">Click Rate (CTR)</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatDateGMT3(ad.expires_at, { month: 'short', day: 'numeric' })}
            </p>
            <p className="text-sm text-foreground-muted">Expires</p>
          </div>

          {/* Contact Details */}
          <div className="col-span-2 md:col-span-4 card p-4">
            <h3 className="text-sm font-medium text-foreground-muted mb-3">Contact Details</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-foreground font-mono text-sm">{ad.phone_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-foreground font-mono text-sm">{ad.whatsapp_number}</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-foreground-muted text-sm">Category:</span>
                <span className="badge badge-neutral capitalize">{ad.category.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          {(['overview', 'clicks', 'impressions'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Ad Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Created</dt>
                <dd className="text-foreground">
                  {formatDateGMT3(ad.created_at, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Expires</dt>
                <dd className="text-foreground">
                  {formatDateGMT3(ad.expires_at, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Priority</dt>
                <dd className="text-foreground">{ad.priority}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground-muted">Advertiser ID</dt>
                <dd className="text-foreground">{ad.advertiser_id}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-foreground-muted text-sm">Engagement Rate</span>
                  <span className="text-foreground font-medium">{ctr}%</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-primary rounded-full transition-all"
                    style={{ width: `${Math.min(parseFloat(ctr) * 10, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-foreground-muted">
                This ad has received {ad.views_count.toLocaleString()} impressions and {ad.clicks_count.toLocaleString()} clicks, 
                resulting in a {ctr}% click-through rate.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clicks' && (
        <div className="animate-fade-in">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <select
              value={clickTypeFilter}
              onChange={(e) => {
                setClickTypeFilter(e.target.value as typeof clickTypeFilter);
                setClicksPage(1);
              }}
              className="select w-auto"
            >
              <option value="">All Click Types</option>
              <option value="view_details">View Details</option>
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <span className="text-foreground-muted text-sm">
              {clicksTotal} total clicks
            </span>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Device ID</th>
                    <th>MAC Address</th>
                    <th>Session</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-foreground-muted py-12">
                        No clicks recorded yet
                      </td>
                    </tr>
                  ) : (
                    clicks.map((click) => (
                      <tr key={click.id}>
                        <td>
                          <span className={`badge ${getClickTypeBadge(click.click_type)} flex items-center gap-1.5 w-fit`}>
                            {getClickTypeIcon(click.click_type)}
                            <span className="capitalize">{click.click_type.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="font-mono text-xs text-foreground-muted">{click.device_id}</td>
                        <td className="font-mono text-xs text-foreground-muted">{click.mac_address}</td>
                        <td className="font-mono text-xs text-foreground-muted">{click.session_id}</td>
                        <td className="text-sm text-foreground-muted">
                          {formatDateGMT3(click.created_at, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {clicksTotal > 50 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setClicksPage(Math.max(1, clicksPage - 1))}
                disabled={clicksPage === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-foreground-muted">
                Page {clicksPage}
              </span>
              <button
                onClick={() => setClicksPage(clicksPage + 1)}
                disabled={clicks.length < 50}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'impressions' && (
        <div className="animate-fade-in">
          <div className="mb-4">
            <span className="text-foreground-muted text-sm">
              {impressionsTotal} total impression records
            </span>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Session</th>
                    <th>Placement</th>
                    <th>Co-displayed Ads</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {impressions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-foreground-muted py-12">
                        No impressions recorded yet
                      </td>
                    </tr>
                  ) : (
                    impressions.map((impression) => (
                      <tr key={impression.id}>
                        <td className="font-mono text-xs text-foreground-muted">{impression.device_id}</td>
                        <td className="font-mono text-xs text-foreground-muted">{impression.session_id}</td>
                        <td>
                          <span className="badge badge-neutral">{impression.placement}</span>
                        </td>
                        <td className="text-sm text-foreground-muted">
                          {impression.ad_ids.length} ads
                        </td>
                        <td className="text-sm text-foreground-muted">
                          {formatDateGMT3(impression.created_at, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {impressionsTotal > 50 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setImpressionsPage(Math.max(1, impressionsPage - 1))}
                disabled={impressionsPage === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-foreground-muted">
                Page {impressionsPage}
              </span>
              <button
                onClick={() => setImpressionsPage(impressionsPage + 1)}
                disabled={impressions.length < 50}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Ad Modal */}
      {showEditModal && ad && (
        <EditAdModal
          ad={ad}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadAdData();
          }}
        />
      )}
    </div>
  );
}

const CATEGORIES = [
  'electronics',
  'fashion',
  'real_estate',
  'automotive',
  'services',
  'food',
  'health',
  'education',
  'entertainment',
  'other',
];

const BADGE_TYPES = [
  { value: '', label: 'None' },
  { value: 'hot', label: '🔥 Hot' },
  { value: 'new', label: '✨ New' },
  { value: 'sale', label: '💰 Sale' },
  { value: 'featured', label: '⭐ Featured' },
];

function EditAdModal({
  ad,
  onClose,
  onSuccess,
}: {
  ad: Ad;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: ad.title,
    description: ad.description,
    image_url: ad.image_url,
    seller_name: ad.seller_name,
    seller_location: ad.seller_location,
    phone_number: ad.phone_number,
    whatsapp_number: ad.whatsapp_number,
    price: ad.price,
    price_value: ad.price_value,
    category: ad.category,
    badge_type: ad.badge_type || '',
    badge_text: ad.badge_text || '',
    is_active: ad.is_active,
    priority: ad.priority,
    expires_at: ad.expires_at.split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Build the updates object with only changed fields
      const updates: Partial<Ad> = {};
      
      if (formData.title !== ad.title) updates.title = formData.title;
      if (formData.description !== ad.description) updates.description = formData.description;
      if (formData.image_url !== ad.image_url) updates.image_url = formData.image_url;
      if (formData.seller_name !== ad.seller_name) updates.seller_name = formData.seller_name;
      if (formData.seller_location !== ad.seller_location) updates.seller_location = formData.seller_location;
      if (formData.phone_number !== ad.phone_number) updates.phone_number = formData.phone_number;
      if (formData.whatsapp_number !== ad.whatsapp_number) updates.whatsapp_number = formData.whatsapp_number;
      if (formData.price !== ad.price) updates.price = formData.price;
      if (formData.price_value !== ad.price_value) updates.price_value = formData.price_value;
      if (formData.category !== ad.category) updates.category = formData.category;
      if (formData.is_active !== ad.is_active) updates.is_active = formData.is_active;
      if (formData.priority !== ad.priority) updates.priority = formData.priority;
      
      // Handle badge
      const newBadgeType = formData.badge_type || null;
      if (newBadgeType !== ad.badge_type) {
        updates.badge_type = newBadgeType as Ad['badge_type'];
        updates.badge_text = formData.badge_text || null;
      }
      
      // Handle expiry date
      const newExpiresAt = new Date(formData.expires_at).toISOString();
      if (!ad.expires_at.startsWith(formData.expires_at)) {
        updates.expires_at = newExpiresAt;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      await api.updateAd(ad.id, updates);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Edit Ad</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-background-tertiary">
            <div>
              <p className="font-medium text-foreground">Ad Status</p>
              <p className="text-sm text-foreground-muted">
                {formData.is_active ? 'Ad is currently visible' : 'Ad is hidden from users'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_active ? 'bg-success' : 'bg-foreground-muted/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[80px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Image URL</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Price Display</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Price Value</label>
              <input
                type="number"
                value={formData.price_value}
                onChange={(e) => setFormData({ ...formData, price_value: parseInt(e.target.value) || 0 })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Seller Name</label>
              <input
                type="text"
                value={formData.seller_name}
                onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Location</label>
              <input
                type="text"
                value={formData.seller_location}
                onChange={(e) => setFormData({ ...formData, seller_location: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">WhatsApp Number</label>
              <input
                type="tel"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Badge</label>
              <select
                value={formData.badge_type}
                onChange={(e) => {
                  const badge = BADGE_TYPES.find((b) => b.value === e.target.value);
                  setFormData({
                    ...formData,
                    badge_type: e.target.value,
                    badge_text: badge?.label || '',
                  });
                }}
                className="select"
              >
                {BADGE_TYPES.map((badge) => (
                  <option key={badge.value} value={badge.value}>
                    {badge.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="input"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Expires At</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

