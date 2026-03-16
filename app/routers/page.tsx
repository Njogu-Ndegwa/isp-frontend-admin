'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import {
  Router,
  RouterUsersResponse,
  HotspotUser,
  CreateRouterRequest,
  UpdateRouterRequest,
  PaymentMethod,
  ProvisionToken,
  ProvisionTokenResponse,
  PPPoEActiveResponse,
  PPPoESession,
  RouterInterfaceInfo,
  RouterUptimeResponse,
  UptimeCheck,
} from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import PullToRefresh from '../components/PullToRefresh';
import DataTable, { DataTableColumn } from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';

type Tab = 'routers' | 'provision';

const formatSafeDate = (dateStr: string | null | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
};

const ROUTER_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Router' },
  { key: 'ip', label: 'IP Address' },
  { key: 'identity', label: 'Identity' },
  { key: 'payment', label: 'Payment' },
  { key: 'auth', label: 'Auth' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

const PROVISION_COLUMNS: DataTableColumn[] = [
  { key: 'router_name', label: 'Router' },
  { key: 'identity', label: 'Identity' },
  { key: 'wireguard_ip', label: 'WireGuard IP' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
  { key: 'provisioned_at', label: 'Provisioned' },
  { key: 'command', label: 'Command' },
];

export default function RoutersPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('routers');

  // Router state
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

  // Provision state
  const [tokens, setTokens] = useState<ProvisionToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newTokenResult, setNewTokenResult] = useState<ProvisionTokenResponse | null>(null);
  const [expandedToken, setExpandedToken] = useState<number | null>(null);

  // PPPoE sessions state
  const [pppoeData, setPppoeData] = useState<PPPoEActiveResponse | null>(null);
  const [pppoeLoading, setPppoeLoading] = useState(false);
  const [usersSubTab, setUsersSubTab] = useState<'hotspot' | 'pppoe'>('hotspot');

  // PPPoE port provisioning state
  const [portsRouter, setPortsRouter] = useState<Router | null>(null);

  // Uptime state
  const [uptimeRouter, setUptimeRouter] = useState<number | null>(null);
  const [uptimeData, setUptimeData] = useState<RouterUptimeResponse | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(false);
  const [uptimeHours, setUptimeHours] = useState(168); // 7 days default

  useEffect(() => {
    if (isAuthenticated) {
      loadRouters();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'provision' && tokens.length === 0 && !tokensLoading) {
      loadTokens();
    }
  }, [activeTab, isAuthenticated]);

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

  const loadTokens = async () => {
    try {
      setTokensLoading(true);
      setTokensError(null);
      const data = await api.getProvisionTokens();
      setTokens(data);
    } catch (err) {
      setTokensError(err instanceof Error ? err.message : 'Failed to load provisioning tokens');
    } finally {
      setTokensLoading(false);
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

  const loadPPPoESessions = async (routerId: number) => {
    try {
      setPppoeLoading(true);
      const data = await api.getPPPoEActiveSessions(routerId);
      setPppoeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PPPoE sessions');
    } finally {
      setPppoeLoading(false);
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

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setTokensError(null);
      const result = await api.createProvisionToken();
      setNewTokenResult(result);
      await loadTokens();
    } catch (err) {
      setTokensError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  const loadUptime = useCallback(async (routerId: number, hours = uptimeHours) => {
    try {
      setUptimeLoading(true);
      setUptimeRouter(routerId);
      const data = await api.getRouterUptime(routerId, hours, 200);
      setUptimeData(data);
    } catch (err) {
      setUptimeData(null);
    } finally {
      setUptimeLoading(false);
    }
  }, [uptimeHours]);

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

  return (
    <div>
      <Header title="Routers" subtitle="Manage your MikroTik routers and hotspot users" />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-background-secondary rounded-xl w-fit animate-fade-in">
        <button
          onClick={() => setActiveTab('routers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'routers'
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            Routers
            {routers.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'routers' ? 'bg-white/20' : 'bg-foreground-muted/20'
              }`}>{routers.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('provision')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'provision'
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto-Provision
            {tokens.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'provision' ? 'bg-white/20' : 'bg-foreground-muted/20'
              }`}>{tokens.length}</span>
            )}
          </span>
        </button>
      </div>

      {activeTab === 'routers' ? (
        <RoutersTab
          routers={routers}
          loading={loading}
          error={error}
          selectedRouter={selectedRouter}
          routerUsers={routerUsers}
          usersLoading={usersLoading}
          deleteConfirm={deleteConfirm}
          deletingRouter={deletingRouter}
          loadRouters={loadRouters}
          loadRouterUsers={loadRouterUsers}
          handleDeleteRouter={handleDeleteRouter}
          setShowCreateModal={setShowCreateModal}
          setDeleteConfirm={setDeleteConfirm}
          setEditingRouter={setEditingRouter}
          setPortsRouter={setPortsRouter}
          formatBytes={formatBytes}
          pppoeData={pppoeData}
          pppoeLoading={pppoeLoading}
          loadPPPoESessions={loadPPPoESessions}
          usersSubTab={usersSubTab}
          setUsersSubTab={setUsersSubTab}
          uptimeRouter={uptimeRouter}
          uptimeData={uptimeData}
          uptimeLoading={uptimeLoading}
          uptimeHours={uptimeHours}
          setUptimeHours={setUptimeHours}
          loadUptime={loadUptime}
          setUptimeRouter={setUptimeRouter}
        />
      ) : (
        <ProvisionTab
          tokens={tokens}
          loading={tokensLoading}
          error={tokensError}
          generating={generating}
          expandedToken={expandedToken}
          setExpandedToken={setExpandedToken}
          loadTokens={loadTokens}
          handleGenerate={handleGenerate}
        />
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

      {newTokenResult && (
        <NewTokenModal
          result={newTokenResult}
          onClose={() => setNewTokenResult(null)}
        />
      )}

      {portsRouter && (
        <PPPoEPortsModal
          router={portsRouter}
          onClose={() => setPortsRouter(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routers Tab
// ---------------------------------------------------------------------------

function RoutersTab({
  routers,
  loading,
  error,
  selectedRouter,
  routerUsers,
  usersLoading,
  deleteConfirm,
  deletingRouter,
  loadRouters,
  loadRouterUsers,
  handleDeleteRouter,
  setShowCreateModal,
  setDeleteConfirm,
  setEditingRouter,
  setPortsRouter,
  formatBytes,
  pppoeData,
  pppoeLoading,
  loadPPPoESessions,
  usersSubTab,
  setUsersSubTab,
  uptimeRouter,
  uptimeData,
  uptimeLoading,
  uptimeHours,
  setUptimeHours,
  loadUptime,
  setUptimeRouter,
}: {
  routers: Router[];
  loading: boolean;
  error: string | null;
  selectedRouter: number | null;
  routerUsers: RouterUsersResponse | null;
  usersLoading: boolean;
  deleteConfirm: number | null;
  deletingRouter: number | null;
  loadRouters: () => Promise<void>;
  loadRouterUsers: (id: number) => Promise<void>;
  handleDeleteRouter: (id: number) => Promise<void>;
  setShowCreateModal: (v: boolean) => void;
  setDeleteConfirm: (v: number | null) => void;
  setEditingRouter: (r: Router | null) => void;
  setPortsRouter: (r: Router | null) => void;
  formatBytes: (b: string) => string;
  pppoeData: PPPoEActiveResponse | null;
  pppoeLoading: boolean;
  loadPPPoESessions: (routerId: number) => Promise<void>;
  usersSubTab: 'hotspot' | 'pppoe';
  setUsersSubTab: (tab: 'hotspot' | 'pppoe') => void;
  uptimeRouter: number | null;
  uptimeData: RouterUptimeResponse | null;
  uptimeLoading: boolean;
  uptimeHours: number;
  setUptimeHours: (h: number) => void;
  loadUptime: (routerId: number, hours?: number) => Promise<void>;
  setUptimeRouter: (id: number | null) => void;
}) {
  const [emergencyLoading, setEmergencyLoading] = useState<number | null>(null);
  const [emergencyModalRouter, setEmergencyModalRouter] = useState<Router | null>(null);
  const [emergencyMsg, setEmergencyMsg] = useState('');

  const handleToggleEmergency = async (router: Router, message?: string) => {
    try {
      setEmergencyLoading(router.id);
      if (router.emergency_active) {
        await api.deactivateEmergencyMode({ router_id: router.id });
      } else {
        await api.activateEmergencyMode({ router_id: router.id, message });
      }
      await loadRouters();
    } catch (err) {
      console.error('Emergency toggle failed:', err);
    } finally {
      setEmergencyLoading(null);
      setEmergencyModalRouter(null);
      setEmergencyMsg('');
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Routers</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadRouters} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  const renderActions = (router: Router) => (
    <div className="flex items-center gap-1 justify-end">
      <button
        onClick={(e) => { e.stopPropagation(); loadRouterUsers(router.id); }}
        className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-foreground-muted hover:text-accent-primary transition-colors"
        title="View hotspot users"
      >
        {usersLoading && selectedRouter === router.id ? (
          <div className="w-4 h-4 border-2 border-foreground-muted/30 border-t-foreground-muted rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setPortsRouter(router); }}
        className="p-1.5 rounded-lg hover:bg-info/10 text-foreground-muted hover:text-info transition-colors"
        title="Configure PPPoE ports"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); loadUptime(router.id); }}
        className={`p-1.5 rounded-lg hover:bg-emerald-500/10 text-foreground-muted hover:text-emerald-500 transition-colors ${uptimeRouter === router.id ? 'bg-emerald-500/10 text-emerald-500' : ''}`}
        title="View uptime"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (router.emergency_active) {
            handleToggleEmergency(router);
          } else {
            setEmergencyModalRouter(router);
            setEmergencyMsg('');
          }
        }}
        disabled={emergencyLoading === router.id}
        className={`p-1.5 rounded-lg transition-colors ${
          router.emergency_active
            ? 'bg-danger/10 text-danger hover:bg-danger/20'
            : 'text-foreground-muted hover:bg-warning/10 hover:text-warning'
        }`}
        title={router.emergency_active ? 'Deactivate emergency mode' : 'Activate emergency mode'}
      >
        {emergencyLoading === router.id ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setEditingRouter(router); }}
        className="p-1.5 rounded-lg hover:bg-accent-primary/10 text-foreground-muted hover:text-accent-primary transition-colors"
        title="Edit router"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      {deleteConfirm === router.id ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteRouter(router.id); }}
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
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
            className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
            title="Cancel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(router.id); }}
          className="p-1.5 rounded-lg hover:bg-danger/10 text-foreground-muted hover:text-danger transition-colors"
          title="Delete router"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <>
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

      {/* Emergency Mode Banner */}
      {routers.some(r => r.emergency_active) && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 animate-fade-in">
          <div className="flex items-center gap-2 text-danger">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <span className="font-semibold text-sm">Emergency Mode Active</span>
              <span className="text-sm text-danger/80 ml-2">
                {routers.filter(r => r.emergency_active).map(r => r.name).join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : (
        <PullToRefresh onRefresh={loadRouters}>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {routers.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                No routers configured yet
              </div>
            ) : (
              routers.map((router) => (
                <MobileDataCard
                  key={router.id}
                  id={router.id}
                  title={router.name}
                  subtitle={`${router.ip_address}:${router.port}`}
                  avatar={{
                    text: router.name.charAt(0).toUpperCase(),
                    color: router.emergency_active ? 'danger' : router.status === 'online' ? 'success' : router.status === 'offline' ? 'danger' : 'primary',
                  }}
                  status={{
                    label: router.status === 'online' ? 'Online' : router.status === 'offline' ? 'Offline' : 'Unknown',
                    variant: router.status === 'online' ? 'success' : router.status === 'offline' ? 'danger' : 'neutral',
                  }}
                  badge={router.emergency_active ? { label: 'EMERGENCY', color: 'bg-danger/10 text-danger border border-danger/30' } : undefined}
                  highlight={router.emergency_active}
                  highlightColor="danger"
                  value={{
                    text: router.identity || '-',
                  }}
                  secondary={{
                    left: (
                      <span className="flex items-center gap-1">
                        {router.emergency_active && (
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/30">Emergency</span>
                        )}
                        {(router.payment_methods ?? ['mpesa', 'voucher']).map((m) => (
                          <span key={m} className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${
                            m === 'mpesa' ? 'bg-success/10 text-success' : 'bg-accent-primary/10 text-accent-primary'
                          }`}>{m === 'mpesa' ? 'Mobile' : 'Voucher'}</span>
                        ))}
                      </span>
                    ),
                    right: router.auth_method?.replace(/_/g, ' ') || 'API',
                  }}
                  rightAction={renderActions(router)}
                  expandableContent={
                    selectedRouter === router.id ? (
                      <div className="border-t border-border pt-3">
                        {/* Sub-tab toggle */}
                        <div className="flex items-center gap-1 mb-3 p-0.5 bg-background-tertiary rounded-lg w-fit">
                          <button
                            onClick={(e) => { e.stopPropagation(); setUsersSubTab('hotspot'); }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${usersSubTab === 'hotspot' ? 'bg-background-secondary text-foreground shadow-sm' : 'text-foreground-muted'}`}
                          >
                            Hotspot Users
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setUsersSubTab('pppoe'); if (!pppoeData || pppoeData.router_id !== router.id) loadPPPoESessions(router.id); }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${usersSubTab === 'pppoe' ? 'bg-background-secondary text-foreground shadow-sm' : 'text-foreground-muted'}`}
                          >
                            PPPoE Sessions
                          </button>
                        </div>

                        {usersSubTab === 'hotspot' ? (
                          routerUsers ? (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-3 text-xs text-foreground-muted">
                                  <span>Total: <span className="font-semibold text-foreground">{routerUsers.total_users}</span></span>
                                  <span>Active: <span className="font-semibold text-success">{routerUsers.active_sessions}</span></span>
                                </div>
                              </div>
                              {routerUsers.users.length === 0 ? (
                                <p className="text-center text-foreground-muted text-xs py-3">No hotspot users found</p>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {routerUsers.users.map((user, i) => (
                                    <UserCard key={i} user={user} formatBytes={formatBytes} />
                                  ))}
                                </div>
                              )}
                            </>
                          ) : usersLoading ? (
                            <div className="flex justify-center py-4">
                              <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                            </div>
                          ) : null
                        ) : (
                          pppoeLoading ? (
                            <div className="flex justify-center py-4">
                              <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                            </div>
                          ) : pppoeData && pppoeData.router_id === router.id ? (
                            <>
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-xs text-foreground-muted">
                                  Active: <span className="font-semibold text-success">{pppoeData.total_sessions}</span>
                                </div>
                              </div>
                              {pppoeData.sessions.length === 0 ? (
                                <p className="text-center text-foreground-muted text-xs py-3">No active PPPoE sessions</p>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {pppoeData.sessions.map((session, i) => (
                                    <PPPoESessionCard key={i} session={session} />
                                  ))}
                                </div>
                              )}
                            </>
                          ) : null
                        )}
                      </div>
                    ) : undefined
                  }
                  onClick={() => loadRouterUsers(router.id)}
                  layout="compact"
                  className="animate-fade-in"
                />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <DataTable<Router>
            columns={ROUTER_COLUMNS}
            data={routers}
            rowKey={(r) => r.id}
            onRowClick={(router) => loadRouterUsers(router.id)}
            renderCell={(router, key) => {
              switch (key) {
                case 'name':
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-medium text-sm">
                        {router.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{router.name}</span>
                    </div>
                  );
                case 'ip':
                  return <span className="font-mono text-sm text-foreground-muted">{router.ip_address}:{router.port}</span>;
                case 'identity':
                  return <span className="text-sm text-foreground-muted">{router.identity || '-'}</span>;
                case 'payment':
                  return (
                    <div className="flex items-center gap-1">
                      {(router.payment_methods ?? ['mpesa', 'voucher']).map((method) => (
                        <span
                          key={method}
                          className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            method === 'mpesa'
                              ? 'bg-success/10 text-success'
                              : 'bg-accent-primary/10 text-accent-primary'
                          }`}
                        >
                          {method === 'mpesa' ? 'Mobile' : 'Voucher'}
                        </span>
                      ))}
                    </div>
                  );
                case 'auth':
                  return (
                    <span className="badge badge-neutral text-xs">
                      {router.auth_method?.replace(/_/g, ' ') || 'API'}
                    </span>
                  );
                case 'status':
                  return (
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        router.status === 'online' ? 'badge-success' :
                        router.status === 'offline' ? 'badge-danger' :
                        'badge-neutral'
                      }`}>
                        {router.status === 'online' ? 'Online' : router.status === 'offline' ? 'Offline' : 'Unknown'}
                      </span>
                      {router.status_is_stale && (
                        <span className="text-[10px] text-amber-400" title="Status data is stale">Stale</span>
                      )}
                      {router.emergency_active && (
                        <span className="badge bg-danger/10 text-danger border border-danger/30 text-[10px]" title={router.emergency_message || 'Emergency mode active'}>
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  );
                case 'actions':
                  return renderActions(router);
                default:
                  return null;
              }
            }}
            rowStyle={(_, index) => ({ animationDelay: `${index * 0.05}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              ),
              message: 'No routers configured yet',
            }}
          />

          {/* Users/Sessions Detail (below table when a router is selected) */}
          {selectedRouter && (routerUsers || pppoeData) && (
            <div className="hidden md:block card mt-4 p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h4 className="font-semibold text-foreground">
                    {routers.find(r => r.id === selectedRouter)?.name}
                  </h4>
                  {/* Sub-tab toggle */}
                  <div className="flex items-center gap-1 p-0.5 bg-background-tertiary rounded-lg">
                    <button
                      onClick={() => setUsersSubTab('hotspot')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${usersSubTab === 'hotspot' ? 'bg-background-secondary text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}
                    >
                      Hotspot Users
                    </button>
                    <button
                      onClick={() => { setUsersSubTab('pppoe'); if (!pppoeData || pppoeData.router_id !== selectedRouter) loadPPPoESessions(selectedRouter); }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${usersSubTab === 'pppoe' ? 'bg-background-secondary text-foreground shadow-sm' : 'text-foreground-muted hover:text-foreground'}`}
                    >
                      PPPoE Sessions
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {usersSubTab === 'hotspot' && routerUsers && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-foreground-muted">
                        Total: <span className="font-semibold text-foreground">{routerUsers.total_users}</span>
                      </span>
                      <span className="text-foreground-muted">
                        Active: <span className="font-semibold text-success">{routerUsers.active_sessions}</span>
                      </span>
                    </div>
                  )}
                  {usersSubTab === 'pppoe' && pppoeData && pppoeData.router_id === selectedRouter && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-foreground-muted">
                        Active: <span className="font-semibold text-success">{pppoeData.total_sessions}</span>
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => { loadRouterUsers(selectedRouter); }}
                    className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
                    title="Close"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {usersSubTab === 'hotspot' ? (
                routerUsers ? (
                  routerUsers.users.length === 0 ? (
                    <p className="text-center text-foreground-muted py-4">No hotspot users found</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {routerUsers.users.map((user, i) => (
                        <UserCard key={i} user={user} formatBytes={formatBytes} />
                      ))}
                    </div>
                  )
                ) : usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                  </div>
                ) : null
              ) : (
                pppoeLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                  </div>
                ) : pppoeData && pppoeData.router_id === selectedRouter ? (
                  pppoeData.sessions.length === 0 ? (
                    <p className="text-center text-foreground-muted py-4">No active PPPoE sessions</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {pppoeData.sessions.map((session, i) => (
                        <PPPoESessionCard key={i} session={session} />
                      ))}
                    </div>
                  )
                ) : null
              )}
            </div>
          )}
          {/* Uptime Detail Panel */}
          {uptimeRouter && (
            <div className="card mt-4 p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    uptimeData?.current_status.status === 'online' ? 'bg-emerald-500/10' :
                    uptimeData?.current_status.status === 'offline' ? 'bg-red-500/10' :
                    'bg-foreground-muted/10'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      uptimeData?.current_status.status === 'online' ? 'text-emerald-500' :
                      uptimeData?.current_status.status === 'offline' ? 'text-red-500' :
                      'text-foreground-muted'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {routers.find(r => r.id === uptimeRouter)?.name} — Uptime
                    </h4>
                    {uptimeData && (
                      <p className="text-xs text-foreground-muted">
                        Currently {uptimeData.current_status.status} &middot; checked {Math.round(uptimeData.current_status.status_age_seconds)}s ago
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={uptimeHours}
                    onChange={(e) => {
                      const h = parseInt(e.target.value);
                      setUptimeHours(h);
                      loadUptime(uptimeRouter, h);
                    }}
                    className="text-xs bg-background-tertiary border border-border rounded-lg px-2 py-1.5 text-foreground"
                  >
                    <option value={24}>Last 24 hours</option>
                    <option value={72}>Last 3 days</option>
                    <option value={168}>Last 7 days</option>
                    <option value={720}>Last 30 days</option>
                  </select>
                  <button
                    onClick={() => setUptimeRouter(null)}
                    className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
                    title="Close"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {uptimeLoading && !uptimeData ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                </div>
              ) : uptimeData ? (
                <UptimePanel data={uptimeData} />
              ) : (
                <p className="text-center text-foreground-muted py-6 text-sm">Failed to load uptime data</p>
              )}
            </div>
          )}
        </PullToRefresh>
      )}

      {/* Emergency Activation Modal */}
      {emergencyModalRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setEmergencyModalRouter(null); setEmergencyMsg(''); }} />
          <div className="relative w-full max-w-md card p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Activate Emergency Mode</h3>
                <p className="text-sm text-foreground-muted">{emergencyModalRouter.name}</p>
              </div>
            </div>
            <p className="text-sm text-foreground-muted mb-4">
              This will hide regular plans and show emergency plans on the captive portal for this router.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Emergency Message (optional)</label>
              <textarea
                value={emergencyMsg}
                onChange={(e) => setEmergencyMsg(e.target.value)}
                className="input min-h-[80px] resize-y"
                placeholder="e.g., Sorry for the disruption, enjoy free deals!"
                rows={2}
                autoFocus
              />
              <p className="text-xs text-foreground-muted mt-1">Displayed as a banner on the captive portal</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setEmergencyModalRouter(null); setEmergencyMsg(''); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleEmergency(emergencyModalRouter, emergencyMsg || undefined)}
                disabled={emergencyLoading === emergencyModalRouter.id}
                className="flex-1 px-4 py-2 rounded-lg bg-warning text-white font-medium hover:bg-warning/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {emergencyLoading === emergencyModalRouter.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate Emergency'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Uptime Kuma-style Bar Chart
// ---------------------------------------------------------------------------

function UptimePanel({ data }: { data: RouterUptimeResponse }) {
  const checks = [...data.recent_checks].sort(
    (a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
  );

  const uptimePct = data.window.uptime_percentage;
  const overallPct = data.overall.uptime_percentage;

  const getBarColor = (check: UptimeCheck) =>
    check.is_online ? 'bg-emerald-500' : 'bg-red-500';

  const getBarHoverColor = (check: UptimeCheck) =>
    check.is_online ? 'hover:bg-emerald-400' : 'hover:bg-red-400';

  const formatCheckTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '-'; }
  };

  const pctColor = (pct: number) =>
    pct >= 99 ? 'text-emerald-500' :
    pct >= 95 ? 'text-emerald-400' :
    pct >= 90 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-background-tertiary">
          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">Window Uptime</p>
          <p className={`text-xl font-bold ${pctColor(uptimePct)}`}>{uptimePct.toFixed(2)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-background-tertiary">
          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">Overall Uptime</p>
          <p className={`text-xl font-bold ${pctColor(overallPct)}`}>{overallPct.toFixed(2)}%</p>
        </div>
        <div className="p-3 rounded-lg bg-background-tertiary">
          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">Checks (Window)</p>
          <p className="text-xl font-bold text-foreground">
            <span className="text-emerald-500">{data.window.online_checks}</span>
            <span className="text-foreground-muted text-sm font-normal"> / {data.window.total_checks}</span>
          </p>
        </div>
        <div className="p-3 rounded-lg bg-background-tertiary">
          <p className="text-[10px] uppercase tracking-wider text-foreground-muted mb-1">Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${
              data.current_status.status === 'online' ? 'bg-emerald-500 animate-pulse' :
              data.current_status.status === 'offline' ? 'bg-red-500' :
              'bg-foreground-muted'
            }`} />
            <span className="text-lg font-bold text-foreground capitalize">{data.current_status.status}</span>
          </div>
        </div>
      </div>

      {/* Uptime bar (Uptime Kuma style) */}
      {checks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-foreground-muted">
              {formatCheckTime(checks[0].checked_at)}
            </p>
            <p className="text-xs font-medium text-foreground-muted">
              {formatCheckTime(checks[checks.length - 1].checked_at)}
            </p>
          </div>
          <div className="flex gap-[2px] h-10 items-end">
            {checks.map((check, i) => (
              <div
                key={i}
                className={`flex-1 min-w-[3px] max-w-[8px] rounded-sm transition-all cursor-pointer ${getBarColor(check)} ${getBarHoverColor(check)} group relative`}
                style={{ height: '100%' }}
                title={`${formatCheckTime(check.checked_at)} — ${check.is_online ? 'Online' : 'Offline'} (${check.source})`}
              >
                <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
                  <div className="bg-background-secondary border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">{check.is_online ? 'Online' : 'Offline'}</p>
                    <p className="text-foreground-muted">{formatCheckTime(check.checked_at)}</p>
                    <p className="text-foreground-muted">{check.source}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" /> Online
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-red-500" /> Offline
              </span>
            </div>
            <p className="text-[10px] text-foreground-muted">{checks.length} checks</p>
          </div>
        </div>
      )}

      {checks.length === 0 && (
        <div className="text-center py-6 text-foreground-muted text-sm">
          No check data available for this time window
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provision Tab
// ---------------------------------------------------------------------------

function StatusBadge({ status, expired }: { status: string; expired: boolean }) {
  if (expired && status === 'pending') {
    return <span className="badge badge-danger">Expired</span>;
  }
  switch (status) {
    case 'provisioned':
      return <span className="badge badge-success">Provisioned</span>;
    case 'pending':
      return <span className="badge badge-warning">Pending</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
}

function CopyButton({ text, label }: { text: string; label?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
        copied
          ? 'bg-success/20 text-success'
          : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {label !== false && 'Copied!'}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label !== false && 'Copy'}
        </>
      )}
    </button>
  );
}

function ProvisionTab({
  tokens,
  loading,
  error,
  generating,
  expandedToken,
  setExpandedToken,
  loadTokens,
  handleGenerate,
}: {
  tokens: ProvisionToken[];
  loading: boolean;
  error: string | null;
  generating: boolean;
  expandedToken: number | null;
  setExpandedToken: (id: number | null) => void;
  loadTokens: () => Promise<void>;
  handleGenerate: () => Promise<void>;
}) {
  const pendingCount = tokens.filter(t => t.status === 'pending' && !t.expired).length;
  const provisionedCount = tokens.filter(t => t.status === 'provisioned').length;

  if (error && !tokens.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Tokens</h2>
          <p className="text-foreground-muted mb-4">{error}</p>
          <button onClick={loadTokens} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Actions */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <span>{tokens.length} tokens</span>
          {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} pending</span>}
          {provisionedCount > 0 && <span className="badge badge-success">{provisionedCount} provisioned</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadTokens} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Token
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : tokens.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent-primary/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Provisioning Tokens</h2>
          <p className="text-foreground-muted mb-6 max-w-md mx-auto">
            Generate your first token to auto-provision a MikroTik router with one click.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate First Token
          </button>
        </div>
      ) : (
        <PullToRefresh onRefresh={loadTokens}>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3 animate-fade-in">
            {tokens.map((token) => (
              <MobileDataCard
                key={token.id}
                id={token.id}
                title={token.router_name}
                subtitle={token.identity}
                avatar={{
                  text: token.router_name.charAt(0),
                  color: token.status === 'provisioned' ? 'success' : token.expired ? 'danger' : 'warning',
                }}
                status={{
                  label: token.expired && token.status === 'pending' ? 'Expired' : token.status,
                  variant: token.status === 'provisioned' ? 'success' : token.expired ? 'danger' : 'warning',
                }}
                value={{
                  text: token.wireguard_ip,
                  highlight: false,
                }}
                secondary={{
                  left: formatSafeDate(token.created_at),
                  right: token.provisioned_at ? formatSafeDate(token.provisioned_at) : '',
                }}
                expandableContent={
                  token.status === 'pending' && !token.expired && token.command ? (
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground-muted">MikroTik Command</span>
                        <CopyButton text={token.command} />
                      </div>
                      <div className="bg-background-tertiary rounded-lg p-3 overflow-x-auto">
                        <code className="text-xs font-mono text-foreground break-all whitespace-pre-wrap">{token.command}</code>
                      </div>
                    </div>
                  ) : undefined
                }
                onClick={
                  token.status === 'pending' && !token.expired && token.command
                    ? () => setExpandedToken(expandedToken === token.id ? null : token.id)
                    : undefined
                }
                layout="compact"
              />
            ))}
          </div>

          {/* Desktop table */}
          <DataTable<ProvisionToken>
            columns={PROVISION_COLUMNS}
            data={tokens}
            rowKey={(t) => t.id}
            renderCell={(token, key) => {
              switch (key) {
                case 'router_name':
                  return <span className="font-medium text-foreground">{token.router_name}</span>;
                case 'identity':
                  return <span className="font-mono text-sm text-foreground-muted">{token.identity}</span>;
                case 'wireguard_ip':
                  return <span className="font-mono text-sm text-foreground-muted">{token.wireguard_ip}</span>;
                case 'status':
                  return <StatusBadge status={token.status} expired={token.expired} />;
                case 'created_at':
                  return <span className="text-sm text-foreground-muted">{formatSafeDate(token.created_at)}</span>;
                case 'provisioned_at':
                  return token.provisioned_at
                    ? <span className="text-sm text-success">{formatSafeDate(token.provisioned_at)}</span>
                    : <span className="text-sm text-foreground-muted">-</span>;
                case 'command':
                  if (token.status === 'pending' && !token.expired && token.command) {
                    return <CopyButton text={token.command} />;
                  }
                  if (token.status === 'provisioned' && token.router_id) {
                    return (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Router #{token.router_id}
                      </span>
                    );
                  }
                  return <span className="text-sm text-foreground-muted">-</span>;
                default:
                  return null;
              }
            }}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              message: 'No provisioning tokens yet',
            }}
            rowStyle={(_, index) => ({ animationDelay: `${index * 0.05}s`, opacity: 0 })}
          />
        </PullToRefresh>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// New Token Modal
// ---------------------------------------------------------------------------

function NewTokenModal({
  result,
  onClose,
}: {
  result: ProvisionTokenResponse;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Token Generated</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-background-tertiary text-foreground-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="p-2 rounded-lg bg-success/10">
              <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">{result.router_name}</p>
              <p className="text-sm text-foreground-muted">
                {result.identity} &middot; {result.wireguard_ip}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground-muted">MikroTik Command</span>
              <CopyButton text={result.command} />
            </div>
            <div className="bg-background-tertiary rounded-lg p-3 overflow-x-auto">
              <code className="text-xs font-mono text-foreground break-all whitespace-pre-wrap">{result.command}</code>
            </div>
          </div>

          {result.note && (
            <div className="flex gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-foreground-muted leading-relaxed">{result.note}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Expires in {result.expires_in_hours} hours
          </div>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-5">
          Done
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit Router Modals + helpers (unchanged)
// ---------------------------------------------------------------------------

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
    emergency_active: router.emergency_active ?? false,
    emergency_message: router.emergency_message ?? '',
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
        emergency_active: formData.emergency_active,
        emergency_message: formData.emergency_active ? (formData.emergency_message || null) : null,
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

          {/* Emergency Mode */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-foreground">Emergency Mode</label>
                <p className="text-xs text-foreground-muted mt-0.5">Activates emergency plans and shows a banner on the captive portal</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, emergency_active: !formData.emergency_active, emergency_message: !formData.emergency_active ? formData.emergency_message : '' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.emergency_active ? 'bg-danger' : 'bg-background-tertiary border border-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.emergency_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {formData.emergency_active && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-foreground mb-2">Emergency Message</label>
                <textarea
                  value={formData.emergency_message ?? ''}
                  onChange={(e) => setFormData({ ...formData, emergency_message: e.target.value })}
                  className="input min-h-[80px] resize-y"
                  placeholder="e.g., Sorry for the disruption, enjoy free deals!"
                  rows={2}
                />
                <p className="text-xs text-foreground-muted mt-1">Displayed as a banner on the captive portal when active</p>
              </div>
            )}
          </div>

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
    if (has && value.length === 1) return;
    onChange(has ? value.filter((m) => m !== method) : [...value, method]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Payment Methods</label>
      <div className="flex gap-3">
        {([
          { key: 'mpesa' as PaymentMethod, label: 'Mobile Money (STK Push)', icon: (
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

// ---------------------------------------------------------------------------
// PPPoE Ports Modal
// ---------------------------------------------------------------------------

function PPPoEPortsModal({
  router,
  onClose,
}: {
  router: Router;
  onClose: () => void;
}) {
  const [interfaces, setInterfaces] = useState<RouterInterfaceInfo[]>([]);
  const [currentPorts, setCurrentPorts] = useState<string[]>([]);
  const [selectedPorts, setSelectedPorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTeardownConfirm, setShowTeardownConfirm] = useState(false);

  useEffect(() => {
    loadInterfaces();
  }, [router.id]);

  const loadInterfaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRouterInterfaces(router.id);
      setInterfaces(data.interfaces);
      setCurrentPorts(data.pppoe_ports);
      setSelectedPorts([...data.pppoe_ports]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interfaces');
    } finally {
      setLoading(false);
    }
  };

  const etherPorts = interfaces.filter(
    (iface) => iface.type === 'ether' && iface.name !== 'ether1'
  );

  const togglePort = (portName: string) => {
    setSelectedPorts((prev) =>
      prev.includes(portName)
        ? prev.filter((p) => p !== portName)
        : [...prev, portName]
    );
    setSuccess(null);
  };

  const hasChanges =
    selectedPorts.length !== currentPorts.length ||
    selectedPorts.some((p) => !currentPorts.includes(p)) ||
    currentPorts.some((p) => !selectedPorts.includes(p));

  const isTeardown = selectedPorts.length === 0 && currentPorts.length > 0;

  const handleApply = async () => {
    if (isTeardown && !showTeardownConfirm) {
      setShowTeardownConfirm(true);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setShowTeardownConfirm(false);
      const result = await api.updatePPPoEPorts(router.id, { ports: selectedPorts });
      setCurrentPorts(result.pppoe_ports);
      setSelectedPorts([...result.pppoe_ports]);
      setSuccess(result.message || 'PPPoE ports updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PPPoE ports');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">PPPoE Port Configuration</h3>
            <p className="text-sm text-foreground-muted mt-0.5">{router.name} &middot; {router.ip_address}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-foreground-muted">Loading interfaces...</p>
          </div>
        ) : etherPorts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-foreground-muted/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-foreground-muted">No configurable ethernet ports found</p>
            <button onClick={loadInterfaces} className="btn-secondary mt-4 text-sm">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="mb-4 p-3 rounded-lg bg-info/5 border border-info/20 text-xs text-foreground-muted flex gap-2">
              <svg className="w-4 h-4 text-info flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Select which ethernet ports should serve PPPoE connections.
                Unchecked ports remain on hotspot. Deselecting all ports restores every port to hotspot mode.
              </span>
            </div>

            {/* Port grid */}
            <div className="space-y-2 mb-5">
              {etherPorts.map((port) => {
                const isSelected = selectedPorts.includes(port.name);
                const wasPrevious = currentPorts.includes(port.name);
                const changed = isSelected !== wasPrevious;

                return (
                  <label
                    key={port.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border bg-background-secondary hover:border-foreground-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePort(port.name)}
                      className="w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary/30 focus:ring-2"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{port.name}</span>
                        {port.running ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="text-[10px] text-success font-medium">UP</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-foreground-muted" />
                            <span className="text-[10px] text-foreground-muted font-medium">DOWN</span>
                          </span>
                        )}
                        {wasPrevious && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-info/10 text-info">PPPoE</span>
                        )}
                        {changed && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                          }`}>
                            {isSelected ? '+ adding' : '- removing'}
                          </span>
                        )}
                      </div>
                      {(port.comment || port.mac_address) && (
                        <p className="text-xs text-foreground-muted mt-0.5">
                          {port.comment && <span>{port.comment}</span>}
                          {port.comment && port.mac_address && <span> &middot; </span>}
                          {port.mac_address && <span className="font-mono">{port.mac_address}</span>}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Summary */}
            <div className="flex items-center gap-3 mb-4 text-xs text-foreground-muted">
              <span>
                {selectedPorts.length} of {etherPorts.length} ports selected for PPPoE
              </span>
              {hasChanges && (
                <span className="badge badge-warning">Unsaved changes</span>
              )}
            </div>

            {/* Teardown confirmation */}
            {showTeardownConfirm && (
              <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-warning">Remove all PPPoE ports?</p>
                    <p className="text-foreground-muted mt-1">
                      This will tear down all PPPoE configuration and restore every port to hotspot mode.
                      Active PPPoE sessions will be disconnected.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleApply}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-warning text-white text-xs font-medium hover:bg-warning/90 transition-colors flex items-center gap-1.5"
                      >
                        {saving ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        Yes, restore to hotspot
                      </button>
                      <button
                        onClick={() => setShowTeardownConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-background-tertiary text-foreground-muted text-xs font-medium hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Close
              </button>
              <button
                onClick={handleApply}
                disabled={!hasChanges || saving || showTeardownConfirm}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  !hasChanges || saving || showTeardownConfirm
                    ? 'bg-background-tertiary text-foreground-muted cursor-not-allowed'
                    : isTeardown
                      ? 'bg-warning text-white hover:bg-warning/90'
                      : 'bg-accent-primary text-white hover:bg-accent-primary/90'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying...
                  </>
                ) : isTeardown ? (
                  'Remove All PPPoE'
                ) : (
                  'Apply Changes'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PPPoESessionCard({ session }: { session: PPPoESession }) {
  const formatBytesNum = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="p-4 rounded-lg border border-info/30 bg-info/5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <div>
            <p className="font-medium text-foreground">{session.user}</p>
            <p className="text-xs font-mono text-foreground-muted">{session.address}</p>
          </div>
        </div>
        <span className="badge badge-success">Connected</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-foreground-muted text-xs">Uptime</p>
          <p className="text-foreground font-medium">{session.uptime}</p>
        </div>
        {session.caller_id && (
          <div>
            <p className="text-foreground-muted text-xs">Caller ID</p>
            <p className="text-foreground font-mono text-xs">{session.caller_id}</p>
          </div>
        )}
        {session.service && (
          <div>
            <p className="text-foreground-muted text-xs">Service</p>
            <p className="text-foreground font-medium">{session.service}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-foreground-muted">&darr; {formatBytesNum(session.bytes_in)}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-foreground-muted">&uarr; {formatBytesNum(session.bytes_out)}</span>
        </div>
      </div>
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
            <span className="text-foreground-muted">&darr; {formatBytes(user.session.bytes_in)}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-foreground-muted">&uarr; {formatBytes(user.session.bytes_out)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
