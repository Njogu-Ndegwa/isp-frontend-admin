'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Ad, Advertiser, CreateAdRequest } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';

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

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingAdId, setDeletingAdId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adsData, advertisersData] = await Promise.all([
        api.getAds(page, 20, categoryFilter || undefined),
        api.getAdvertisers(),
      ]);
      setAds(adsData.ads);
      setTotalPages(adsData.pagination.total_pages);
      setAdvertisers(advertisersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (adId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeletingAdId(adId);
      setDeleteError(null);
      await api.deleteAd(adId);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete ad');
    } finally {
      setDeletingAdId(null);
    }
  };

  const filteredAds = ads.filter((ad) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ad.title.toLowerCase().includes(query) ||
      ad.seller_name.toLowerCase().includes(query) ||
      ad.description.toLowerCase().includes(query)
    );
  });

  const activeCount = ads.filter((a) => a.is_active).length;
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks_count, 0);
  const totalViews = ads.reduce((sum, ad) => sum + ad.views_count, 0);

  const getBadgeStyle = (badgeType: string | null) => {
    switch (badgeType) {
      case 'hot':
        return 'bg-red-500/20 text-red-400';
      case 'new':
        return 'bg-blue-500/20 text-blue-400';
      case 'sale':
        return 'bg-green-500/20 text-green-400';
      case 'featured':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Ads</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Ads" 
        subtitle="Manage advertisements shown on your captive portal" 
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search ads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="select w-auto min-w-[160px]"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>

        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ad
        </button>
      </div>

      {/* Delete Error */}
      {deleteError && (
        <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-danger flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-danger">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="ml-auto text-danger hover:text-danger/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <PullToRefresh onRefresh={loadData}>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Total Ads</p>
                <p className="text-2xl font-bold text-foreground">{ads.length}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Active</p>
                <p className="text-2xl font-bold text-success">{activeCount}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10 text-info">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Total Views</p>
                <p className="text-2xl font-bold text-info">{totalViews.toLocaleString()}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10 text-warning">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-warning">{totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Ads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAds.map((ad, index) => (
              <Link
                key={ad.id}
                href={`/ads/${ad.id}`}
                className="card overflow-hidden group animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
              >
                {/* Image */}
                <div className="relative h-48 bg-background-tertiary overflow-hidden">
                  {ad.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-foreground-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Badge */}
                  {ad.badge_text && (
                    <span className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium ${getBadgeStyle(ad.badge_type)}`}>
                      {ad.badge_text}
                    </span>
                  )}
                  
                  {/* Status & Delete */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${ad.is_active ? 'bg-success/20 text-success' : 'bg-gray-500/20 text-gray-400'}`}>
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteAd(ad.id, e)}
                      disabled={deletingAdId === ad.id}
                      className="p-1.5 rounded-md bg-danger/20 text-danger hover:bg-danger/40 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete ad"
                    >
                      {deletingAdId === ad.id ? (
                        <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent-primary transition-colors">
                      {ad.title}
                    </h3>
                    <span className="text-lg font-bold text-accent-primary whitespace-nowrap">{ad.price}</span>
                  </div>
                  
                  <p className="text-sm text-foreground-muted line-clamp-2 mb-3">{ad.description}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-foreground-muted mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{ad.seller_location}</span>
                    <span className="mx-1">•</span>
                    <span className="capitalize">{ad.category.replace('_', ' ')}</span>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm">
                      <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-foreground">{ad.views_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <span className="text-foreground">{ad.clicks_count}</span>
                    </div>
                    <div className="ml-auto text-xs text-foreground-muted">
                      {ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(1) : '0'}% CTR
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredAds.length === 0 && !loading && (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Ads Found</h3>
              <p className="text-foreground-muted mb-4">
                {searchQuery || categoryFilter ? 'Try adjusting your filters' : 'Create your first ad to get started'}
              </p>
              {!searchQuery && !categoryFilter && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Ad
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-foreground-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </PullToRefresh>
      )}

      {/* Create Ad Modal */}
      {showCreateModal && (
        <CreateAdModal
          advertisers={advertisers}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function CreateAdModal({
  advertisers,
  onClose,
  onSuccess,
}: {
  advertisers: Advertiser[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAdRequest>({
    advertiser_id: advertisers[0]?.id || 0,
    title: '',
    description: '',
    image_url: '',
    seller_name: '',
    seller_location: '',
    phone_number: '',
    whatsapp_number: '',
    price: '',
    price_value: 0,
    category: 'electronics',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Auto-fill seller details when advertiser changes
  useEffect(() => {
    const advertiser = advertisers.find((a) => a.id === formData.advertiser_id);
    if (advertiser) {
      setFormData((prev) => ({
        ...prev,
        seller_name: advertiser.business_name,
        phone_number: advertiser.phone_number,
        whatsapp_number: advertiser.phone_number,
      }));
    }
  }, [formData.advertiser_id, advertisers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.createAd({
        ...formData,
        expires_at: new Date(formData.expires_at).toISOString(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad');
    } finally {
      setLoading(false);
    }
  };

  if (advertisers.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md card p-6 animate-fade-in text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Advertisers Found</h3>
          <p className="text-foreground-muted mb-4">
            You need to create an advertiser before creating ads.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <Link href="/advertisers" className="btn-primary flex-1 text-center">
              Add Advertiser
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Create New Ad</h2>
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
          {/* Advertiser Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Advertiser</label>
            <select
              value={formData.advertiser_id}
              onChange={(e) => setFormData({ ...formData, advertiser_id: parseInt(e.target.value) })}
              className="select"
              required
            >
              {advertisers.map((advertiser) => (
                <option key={advertiser.id} value={advertiser.id}>
                  {advertiser.business_name} - {advertiser.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="e.g., Samsung Galaxy A54"
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
              placeholder="Describe the product or service..."
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
              placeholder="https://example.com/image.jpg"
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
                placeholder="KES 45,000"
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
                placeholder="45000"
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
                placeholder="Business name"
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
                placeholder="e.g., Nairobi CBD"
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
                placeholder="0712345678"
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
                placeholder="0712345678"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Badge (Optional)</label>
              <select
                value={formData.badge_type || ''}
                onChange={(e) => {
                  const badge = BADGE_TYPES.find((b) => b.value === e.target.value);
                  setFormData({
                    ...formData,
                    badge_type: e.target.value as 'hot' | 'new' | 'sale' | 'featured' | undefined,
                    badge_text: badge?.label || undefined,
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
                  Creating...
                </>
              ) : (
                'Create Ad'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

