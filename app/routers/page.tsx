'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Router, RouterUsersResponse, HotspotUser } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

export default function RoutersPage() {
  const { isAuthenticated } = useAuth();
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouter, setSelectedRouter] = useState<number | null>(null);
  const [routerUsers, setRouterUsers] = useState<RouterUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadRouters();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadRouters = async () => {
    try {
      setLoading(true);
      const data = await api.getRouters();
      setRouters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routers');
    } finally {
      setLoading(false);
    }
  };

  const loadRouterUsers = async (routerId: number) => {
    if (selectedRouter === routerId) {
      setSelectedRouter(null);
      setRouterUsers(null);
      return;
    }

    try {
      setUsersLoading(true);
      setSelectedRouter(routerId);
      const data = await api.getRouterUsers(routerId);
      setRouterUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load router users');
    } finally {
      setUsersLoading(false);
    }
  };

  const formatBytes = (bytes: string) => {
    const num = parseInt(bytes);
    if (isNaN(num)) return bytes;
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!isAuthenticated) {
    return (
      <div>
        <Header title="Routers" subtitle="Manage your MikroTik routers and hotspot users" />
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Authentication Required</h2>
          <p className="text-foreground-muted mb-6 max-w-md mx-auto">
            You need to be logged in to access router management. This ensures secure access to your network infrastructure.
          </p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login to Continue
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Routers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadRouters} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Routers" subtitle="Manage your MikroTik routers and hotspot users" />

      {/* Actions */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-2 text-foreground-muted">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
          <span>{routers.length} routers connected</span>
        </div>
        <button onClick={loadRouters} className="btn-secondary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Routers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {routers.map((router, index) => (
              <div
                key={router.id}
                className={`card overflow-hidden animate-fade-in ${
                  selectedRouter === router.id ? 'ring-2 ring-accent-primary' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-accent-primary/10">
                        <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{router.name}</h3>
                        <p className="text-foreground-muted font-mono text-sm">
                          {router.ip_address}:{router.port}
                        </p>
                      </div>
                    </div>
                    <span className="badge badge-success">Online</span>
                  </div>

                  <button
                    onClick={() => loadRouterUsers(router.id)}
                    className="w-full btn-secondary flex items-center justify-center gap-2"
                  >
                    {usersLoading && selectedRouter === router.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-foreground-muted/30 border-t-foreground-muted rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : selectedRouter === router.id ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Users
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        View Hotspot Users
                      </>
                    )}
                  </button>
                </div>

                {/* Users Section */}
                {selectedRouter === router.id && routerUsers && (
                  <div className="border-t border-border p-6 bg-background-tertiary/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-foreground">Hotspot Users</h4>
                      <div className="flex gap-4 text-sm">
                        <span className="text-foreground-muted">
                          Total: <span className="font-semibold text-foreground">{routerUsers.total_users}</span>
                        </span>
                        <span className="text-foreground-muted">
                          Active: <span className="font-semibold text-success">{routerUsers.active_sessions}</span>
                        </span>
                      </div>
                    </div>

                    {routerUsers.users.length === 0 ? (
                      <p className="text-center text-foreground-muted py-4">No hotspot users found</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {routerUsers.users.map((user, i) => (
                          <UserCard key={i} user={user} formatBytes={formatBytes} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {routers.length === 0 && (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Routers Found</h3>
              <p className="text-foreground-muted">No routers are configured for your account</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserCard({ user, formatBytes }: { user: HotspotUser; formatBytes: (bytes: string) => string }) {
  return (
    <div className={`p-4 rounded-lg border ${user.active ? 'border-success/30 bg-success/5' : 'border-border bg-background-secondary'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-success animate-pulse' : 'bg-foreground-muted'}`} />
          <div>
            <p className="font-medium text-foreground">{user.comment || user.username}</p>
            <p className="text-xs font-mono text-foreground-muted">{user.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${user.active ? 'badge-success' : 'badge-neutral'}`}>
            {user.active ? 'Online' : 'Offline'}
          </span>
          {user.disabled && <span className="badge badge-danger">Disabled</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-foreground-muted text-xs">Profile</p>
          <p className="text-foreground font-medium">{user.profile}</p>
        </div>
        <div>
          <p className="text-foreground-muted text-xs">Time Limit</p>
          <p className="text-foreground font-medium">{user.uptime_limit || '-'}</p>
        </div>
        {user.session && (
          <>
            <div>
              <p className="text-foreground-muted text-xs">Uptime</p>
              <p className="text-foreground font-medium">{user.session.uptime}</p>
            </div>
            <div>
              <p className="text-foreground-muted text-xs">IP Address</p>
              <p className="text-foreground font-mono text-xs">{user.session.address}</p>
            </div>
          </>
        )}
      </div>

      {user.session && (
        <div className="mt-3 pt-3 border-t border-border flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-foreground-muted">↓ {formatBytes(user.session.bytes_in)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-foreground-muted">↑ {formatBytes(user.session.bytes_out)}</span>
          </div>
        </div>
      )}
    </div>
  );
}







