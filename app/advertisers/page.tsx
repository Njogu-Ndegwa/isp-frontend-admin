'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Advertiser, CreateAdvertiserRequest } from '../lib/types';
import { formatDateGMT3 } from '../lib/dateUtils';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAdvertisers();
  }, []);

  const loadAdvertisers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdvertisers();
      setAdvertisers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvertisers = advertisers.filter((advertiser) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      advertiser.name.toLowerCase().includes(query) ||
      advertiser.business_name.toLowerCase().includes(query) ||
      advertiser.email.toLowerCase().includes(query) ||
      advertiser.phone_number.includes(query)
    );
  });

  const activeCount = advertisers.filter((a) => a.is_active).length;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Advertisers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadAdvertisers} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title="Advertisers" 
        subtitle="Manage businesses that advertise on your captive portal" 
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in">
        {/* Search */}
        <div className="flex-1 min-w-[250px]">
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
              placeholder="Search by name, business, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <button onClick={loadAdvertisers} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Advertiser
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent-primary/10 text-accent-primary">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Total Advertisers</p>
                <p className="text-2xl font-bold text-foreground">{advertisers.length}</p>
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
              <div className="p-3 rounded-lg bg-foreground-muted/10 text-foreground-muted">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-foreground-muted text-sm">Inactive</p>
                <p className="text-2xl font-bold text-foreground">{advertisers.length - activeCount}</p>
              </div>
            </div>
          </div>

          {/* Advertisers Table */}
          <div className="card animate-fade-in">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdvertisers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-foreground-muted py-12">
                        <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {searchQuery ? 'No advertisers match your search' : 'No advertisers yet. Add your first advertiser!'}
                      </td>
                    </tr>
                  ) : (
                    filteredAdvertisers.map((advertiser, index) => (
                      <tr 
                        key={advertiser.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-500 font-bold text-sm">
                              {advertiser.business_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{advertiser.business_name}</span>
                          </div>
                        </td>
                        <td className="text-foreground">{advertiser.name}</td>
                        <td className="text-foreground-muted">{advertiser.email}</td>
                        <td className="font-mono text-sm text-foreground-muted">{advertiser.phone_number}</td>
                        <td>
                          <span className={`badge ${advertiser.is_active ? 'badge-success' : 'badge-neutral'}`}>
                            {advertiser.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-foreground-muted text-sm">
                          {formatDateGMT3(advertiser.created_at, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Advertiser Modal */}
      {showCreateModal && (
        <CreateAdvertiserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAdvertisers();
          }}
        />
      )}
    </div>
  );
}

function CreateAdvertiserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAdvertiserRequest>({
    name: '',
    business_name: '',
    phone_number: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.createAdvertiser(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create advertiser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add New Advertiser</h2>
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
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Business Name</label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="input"
              placeholder="e.g., Doe Electronics"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Contact Person</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="john@example.com"
                required
              />
            </div>
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
                'Add Advertiser'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


