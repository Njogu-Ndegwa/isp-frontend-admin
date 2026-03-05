'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Router, RouterUsersResponse, HotspotUser, CreateRouterRequest, UpdateRouterRequest, PaymentMethod } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import PullToRefresh from '../components/PullToRefresh';

export default function RoutersPage() {
  const { isAuthenticated } = useAuth();
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouter, setSelectedRouter] = useState<number | null>(null);
  const [routerUsers, setRouterUsers] = useState<RouterUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingRouter, setDeletingRouter] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingRouter, setEditingRouter] = useState<Router | null>(null);

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

  const handleDeleteRouter = async (routerId: number) => {
    try {
      setDeletingRouter(routerId);
      await api.deleteRouter(routerId);
      if (selectedRouter === routerId) {
        setSelectedRouter(null);
        setRouterUsers(null);
      }
      setDeleteConfirm(null);
      await loadRouters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete router');
    } finally {
      setDeletingRouter(null);
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
        <div className="flex items-center gap-2">
          <button onClick={loadRouters} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Router
          </button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <PullToRefresh onRefresh={loadRouters}>
          {/* Routers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
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
                        {router.identity && (
                          <p className="text-foreground-muted text-xs mt-0.5">
                            Identity: <span className="text-foreground">{router.identity}</span>
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {(router.payment_methods ?? ['mpesa', 'voucher']).map((method) => (
                            <span
                              key={method}
                              className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                method === 'mpesa'
                                  ? 'bg-success/10 text-success'
                                  : 'bg-accent-primary/10 text-accent-primary'
                              }`}
                            >
                              {method === 'mpesa' ? 'M-Pesa' : 'Voucher'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success">Online</span>
                      <span className="badge badge-neutral text-xs">
                        {router.auth_method?.replace(/_/g, ' ') || 'API'}
                      </span>
                      <button
                          onClick={() => setEditingRouter(router)}
                          className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-foreground-muted hover:text-accent-primary transition-colors"
                          title="Edit router"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      {deleteConfirm === router.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteRouter(router.id)}
                            disabled={deletingRouter === router.id}
                            className="p-1.5 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger transition-colors"
                            title="Confirm delete"
                          >
                            {deletingRouter === router.id ? (
                              <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
                            title="Cancel"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(router.id)}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-foreground-muted hover:text-danger transition-colors"
                          title="Delete router"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
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
              <p className="text-foreground-muted mb-4">No routers are configured for your account</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Add Router
              </button>
            </div>
          )}
        </PullToRefresh>
      )}

      {showCreateModal && (
        <CreateRouterModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRouters();
          }}
        />
      )}

      {editingRouter && (
        <EditRouterModal
          router={editingRouter}
          onClose={() => setEditingRouter(null)}
          onSuccess={() => {
            setEditingRouter(null);
            loadRouters();
          }}
        />
      )}
    </div>
  );
}

function CreateRouterModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateRouterRequest>({
    name: '',
    identity: '',
    ip_address: '',
    username: 'admin',
    password: '',
    port: 8728,
    payment_methods: ['mpesa', 'voucher'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.createRouter(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create router');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add New Router</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Router Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., My Router"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">MikroTik Identity</label>
            <input
              type="text"
              value={formData.identity}
              onChange={(e) => setFormData({ ...formData, identity: e.target.value })}
              className="input"
              placeholder="e.g., MikroTik-Office"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">IP Address</label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                className="input"
                placeholder="e.g., 192.168.1.1"
                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                title="Enter a valid IP address (e.g., 192.168.1.1)"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">API Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8728 })}
                className="input"
                min={1}
                max={65535}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="input"
              placeholder="e.g., admin"
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input pr-10"
                placeholder="Router API password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <PaymentMethodsField
            value={formData.payment_methods ?? ['mpesa', 'voucher']}
            onChange={(methods) => setFormData({ ...formData, payment_methods: methods })}
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Add Router'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRouterModal({
  router,
  onClose,
  onSuccess,
}: {
  router: Router;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UpdateRouterRequest & { password: string }>({
    name: router.name,
    ip_address: router.ip_address,
    username: '',
    password: '',
    port: router.port,
    payment_methods: router.payment_methods ?? ['mpesa', 'voucher'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const updates: UpdateRouterRequest = {
        name: formData.name,
        ip_address: formData.ip_address,
        port: formData.port,
        payment_methods: formData.payment_methods,
      };
      if (formData.username) updates.username = formData.username;
      if (formData.password) updates.password = formData.password;
      await api.updateRouter(router.id, updates);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update router');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Edit Router</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Router Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., My Router"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">IP Address</label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                className="input"
                placeholder="e.g., 192.168.1.1"
                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                title="Enter a valid IP address (e.g., 192.168.1.1)"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">API Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 8728 })}
                className="input"
                min={1}
                max={65535}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <PaymentMethodsField
            value={formData.payment_methods ?? ['mpesa', 'voucher']}
            onChange={(methods) => setFormData({ ...formData, payment_methods: methods })}
          />

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-foreground-muted mb-3">Leave blank to keep current credentials</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  placeholder="Leave blank to keep current"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input pr-10"
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

function PaymentMethodsField({
  value,
  onChange,
}: {
  value: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
}) {
  const toggle = (method: PaymentMethod) => {
    const has = value.includes(method);
    if (has && value.length === 1) return; // must keep at least one
    onChange(has ? value.filter((m) => m !== method) : [...value, method]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Payment Methods</label>
      <div className="flex gap-3">
        {([
          { key: 'mpesa' as PaymentMethod, label: 'M-Pesa (STK Push)', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
          { key: 'voucher' as PaymentMethod, label: 'Voucher / Cash', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          )},
        ]).map(({ key, label, icon }) => {
          const active = value.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                active
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-border bg-background-secondary text-foreground-muted hover:text-foreground'
              }`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-foreground-muted mt-1.5">At least one method must be selected</p>
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







