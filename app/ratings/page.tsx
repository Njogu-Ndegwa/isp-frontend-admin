'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';
import { Rating, RatingSummary, CustomerMapData } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';

// Dynamically import the map component to avoid SSR issues with Leaflet
const RatingsMap = dynamic(() => import('./RatingsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-background-secondary rounded-xl flex items-center justify-center">
      <div className="text-foreground-muted">Loading map...</div>
    </div>
  ),
});

export default function RatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [mapData, setMapData] = useState<CustomerMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ratingsData, summaryData, customersMapData] = await Promise.all([
        api.getRatings(),
        api.getRatingsSummary(),
        api.getCustomersMapData(),
      ]);
      // Ensure ratings is always an array
      const ratingsArray = Array.isArray(ratingsData) ? ratingsData : 
        (ratingsData && typeof ratingsData === 'object' && 'ratings' in ratingsData) 
          ? (ratingsData as { ratings: Rating[] }).ratings 
          : [];
      setRatings(ratingsArray);
      setSummary(summaryData);
      // Ensure mapData is always an array
      const mapDataArray = Array.isArray(customersMapData) ? customersMapData :
        (customersMapData && typeof customersMapData === 'object' && 'customers' in customersMapData)
          ? (customersMapData as { customers: CustomerMapData[] }).customers
          : [];
      setMapData(mapDataArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  };

  const filteredRatings = Array.isArray(ratings) 
    ? (filterRating ? ratings.filter((r) => r.rating === filterRating) : ratings)
    : [];

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-success';
    if (rating >= 3) return 'text-warning';
    return 'text-danger';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 4) return 'bg-success/10 border-success/30';
    if (rating >= 3) return 'bg-warning/10 border-warning/30';
    return 'bg-danger/10 border-danger/30';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number, size = 'w-4 h-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    );
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Ratings</h2>
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
      <Header title="Customer Ratings" subtitle="View customer feedback and their locations to improve service" />

      {/* Actions */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-2 text-foreground-muted">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>{ratings.length} ratings collected</span>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <PullToRefresh onRefresh={loadData}>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in">
              {/* Average Rating */}
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-muted">Average Rating</p>
                    <p className="text-2xl font-bold text-foreground">{(summary.average_rating || 0).toFixed(1)}</p>
                    <div className="mt-1">{renderStars(Math.round(summary.average_rating || 0), 'w-3 h-3')}</div>
                  </div>
                </div>
              </div>

              {/* Total Ratings */}
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-muted">Total Ratings</p>
                    <p className="text-2xl font-bold text-foreground">{summary.total_ratings || 0}</p>
                  </div>
                </div>
              </div>

              {/* With Comments */}
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-muted">With Comments</p>
                    <p className="text-2xl font-bold text-foreground">{summary.ratings_with_comments || 0}</p>
                  </div>
                </div>
              </div>

              {/* With Location */}
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-muted">With Location</p>
                    <p className="text-2xl font-bold text-foreground">{summary.ratings_with_location || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rating Distribution */}
          {summary && summary.rating_distribution && (
            <div className="card p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Rating Distribution</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const distribution = summary.rating_distribution || {};
                  const count = (distribution as Record<number, number>)[star] || 0;
                  const totalRatings = summary.total_ratings || 0;
                  const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                  const isActive = filterRating === star;
                  return (
                    <button
                      key={star}
                      onClick={() => setFilterRating(isActive ? null : star)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isActive ? 'bg-amber-500/10' : 'hover:bg-background-tertiary'
                      }`}
                    >
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-sm font-medium text-foreground">{star}</span>
                        <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="flex-1 h-3 bg-background-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            star >= 4 ? 'bg-success' : star >= 3 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-foreground-muted w-16 text-right">{count} ({percentage.toFixed(0)}%)</span>
                    </button>
                  );
                })}
              </div>
              {filterRating && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => setFilterRating(null)}
                    className="text-sm text-accent-primary hover:underline"
                  >
                    Clear filter - Show all ratings
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Map Section */}
          <div className="card p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Customer Locations</h3>
            <p className="text-sm text-foreground-muted mb-4">
              View where your customers are located and their feedback. Click on markers to see details.
            </p>
            <RatingsMap
              ratings={filteredRatings}
              mapData={mapData}
              onSelectRating={setSelectedRating}
              selectedRating={selectedRating}
            />
          </div>

          {/* Ratings List */}
          <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {filterRating ? `${filterRating}-Star Reviews` : 'All Ratings'}
              </h3>
              <p className="text-sm text-foreground-muted">
                {filteredRatings.length} {filteredRatings.length === 1 ? 'rating' : 'ratings'}
                {filterRating && ` (filtered by ${filterRating} stars)`}
              </p>
            </div>

            {filteredRatings.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Ratings Yet</h3>
                <p className="text-foreground-muted">Customer ratings will appear here once they start submitting feedback.</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {filteredRatings.map((rating, index) => (
                  <div
                    key={rating.id}
                    className={`p-4 hover:bg-background-tertiary/50 transition-colors cursor-pointer ${
                      selectedRating === rating.id ? 'bg-amber-500/5' : ''
                    }`}
                    onClick={() => setSelectedRating(selectedRating === rating.id ? null : rating.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRatingBgColor(rating.rating)}`}>
                        <span className={`font-bold ${getRatingColor(rating.rating)}`}>{rating.rating}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{rating.phone}</span>
                          {rating.customer_name && (
                            <span className="text-sm text-foreground-muted">({rating.customer_name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          {renderStars(rating.rating)}
                          <span className="text-xs text-foreground-muted">{formatDate(rating.created_at)}</span>
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-foreground-muted">{rating.comment}</p>
                        )}
                        {(rating.latitude && rating.longitude) && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-foreground-muted/70">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span>{rating.latitude.toFixed(4)}, {rating.longitude.toFixed(4)}</span>
                          </div>
                        )}
                      </div>

                      {/* Rating Badge */}
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getRatingBgColor(rating.rating)} ${getRatingColor(rating.rating)}`}>
                        {rating.rating >= 4 ? 'Positive' : rating.rating >= 3 ? 'Neutral' : 'Negative'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      )}
    </div>
  );
}
