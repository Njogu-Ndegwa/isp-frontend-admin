'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Plan, UpdatePlanRequest, Router } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';
import DataTable, { DataTableColumn } from '../components/DataTable';
import MobileDataCard from '../components/MobileDataCard';
import SearchInput from '../components/SearchInput';
import FilterSelect from '../components/FilterSelect';
import DateTimePicker from '../components/DateTimePicker';
import { formatDateGMT3, utcToGMT3Input, gmt3InputToISO } from '../lib/dateUtils';

type FilterTab = 'all' | 'regular' | 'emergency';
type ConnectionFilter = 'all' | 'hotspot' | 'pppoe';
type VisibilityFilter = 'all' | 'visible' | 'hidden';

const PLAN_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Plan', className: 'max-w-[200px]' },
  { key: 'price', label: 'Price' },
  { key: 'duration', label: 'Duration' },
  { key: 'speed', label: 'Speed' },
  { key: 'connection', label: 'Connection' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);
  const [routers, setRouters] = useState<Router[]>([]);
  const [selectedEmergencyRouter, setSelectedEmergencyRouter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    loadRouters();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const plansData = await api.getPlans();
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      setActionLoading(planId);
      setDeleteError(null);
      await api.deletePlan(planId);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete plan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleHidden = async (plan: Plan) => {
    try {
      setActionLoading(plan.id);
      await api.updatePlan(plan.id, { is_hidden: !plan.is_hidden });
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setActionLoading(null);
    }
  };

  const loadRouters = async () => {
    try {
      const data = await api.getRouters();
      setRouters(data);
      if (data.length > 0 && !selectedEmergencyRouter) {
        setSelectedEmergencyRouter(data[0].id);
      }
    } catch {
      // Non-critical, routers are only needed for emergency
    }
  };

  const handleEmergencyMode = async (activate: boolean) => {
    if (!selectedEmergencyRouter) return;
    try {
      setEmergencyLoading(true);
      setEmergencyMessage(null);
      const result = activate
        ? await api.activateEmergencyMode({ router_id: selectedEmergencyRouter })
        : await api.deactivateEmergencyMode({ router_id: selectedEmergencyRouter });
      setEmergencyMessage(result.message);
      await loadData();
      await loadRouters();
      setTimeout(() => setEmergencyMessage(null), 5000);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to toggle emergency mode');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const getPlanSpeed = (plan: Plan) => {
    if (plan.speed) {
      const parts = plan.speed.split('/');
      return { down: parts[0] || '-', up: parts[1] || parts[0] || '-' };
    }
    return {
      down: plan.download_speed || '-',
      up: plan.upload_speed || '-',
    };
  };

  const hasEmergencyPlans = plans.some((p) => p.plan_type === 'emergency');
  const anyRouterInEmergency = routers.some((r) => r.emergency_active);
  const selectedRouterInEmergency = routers.find((r) => r.id === selectedEmergencyRouter)?.emergency_active ?? false;

  const filteredPlans = plans.filter((plan) => {
    if (activeTab === 'regular' && plan.plan_type === 'emergency') return false;
    if (activeTab === 'emergency' && plan.plan_type !== 'emergency') return false;
    if (connectionFilter !== 'all' && plan.connection_type !== connectionFilter) return false;
    if (visibilityFilter === 'visible' && plan.is_hidden) return false;
    if (visibilityFilter === 'hidden' && !plan.is_hidden) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        plan.name.toLowerCase().includes(q) ||
        String(plan.price).includes(q) ||
        (plan.speed?.toLowerCase() || '').includes(q) ||
        (plan.connection_type?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Plans</h2>
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
      <Header title="Plans" subtitle="Manage your internet plans and pricing" />

      {/* Emergency Active Indicator */}
      {anyRouterInEmergency && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-danger flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <span className="text-danger font-semibold text-sm">Emergency Mode Active</span>
            <span className="text-danger/80 text-sm ml-2">
              {routers.filter(r => r.emergency_active).map(r => r.name).join(', ')}
            </span>
            {routers.find(r => r.emergency_active)?.emergency_message && (
              <p className="text-danger/70 text-xs mt-0.5">
                {routers.find(r => r.emergency_active)?.emergency_message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Success/Feedback Banner */}
      {emergencyMessage && (
        <div className="mb-4 p-4 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-warning font-medium">{emergencyMessage}</p>
          <button onClick={() => setEmergencyMessage(null)} className="ml-auto text-warning hover:text-warning/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2 text-foreground-muted">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>{filteredPlans.length} plans{activeTab !== 'all' ? ` (${activeTab})` : ''}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasEmergencyPlans && routers.length > 0 && (
            <div className="flex items-center gap-2">
              {routers.length > 1 && (
                <select
                  value={selectedEmergencyRouter ?? ''}
                  onChange={(e) => setSelectedEmergencyRouter(parseInt(e.target.value, 10))}
                  className="appearance-none px-2 py-2 pr-7 text-sm bg-background-tertiary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  {routers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.emergency_active ? '(emergency)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => handleEmergencyMode(!selectedRouterInEmergency)}
                disabled={emergencyLoading || !selectedEmergencyRouter}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRouterInEmergency
                    ? 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20'
                    : 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20'
                }`}
              >
                {emergencyLoading ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {selectedRouterInEmergency ? 'Deactivate Emergency' : 'Activate Emergency'}
              </button>
            </div>
          )}
          <button onClick={loadData} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link href="/plans/create" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by plan name, price, or speed..."
            />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <FilterSelect
              value={activeTab}
              onChange={(v) => setActiveTab(v as FilterTab)}
              options={[
                { value: 'all', label: 'All Plans' },
                { value: 'regular', label: 'Regular' },
                { value: 'emergency', label: 'Emergency' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
            <FilterSelect
              value={connectionFilter}
              onChange={(v) => setConnectionFilter(v as ConnectionFilter)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'hotspot', label: 'Hotspot' },
                { value: 'pppoe', label: 'PPPoE' },
              ]}
            />
            <FilterSelect
              value={visibilityFilter}
              onChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'visible', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
          </div>
        </div>

        {/* Active Filters */}
        {(activeTab !== 'all' || connectionFilter !== 'all' || visibilityFilter !== 'all') && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-foreground-muted">Filters:</span>
            {activeTab !== 'all' && (
              <button
                onClick={() => setActiveTab('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors capitalize"
              >
                {activeTab}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {connectionFilter !== 'all' && (
              <button
                onClick={() => setConnectionFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors"
              >
                {connectionFilter === 'pppoe' ? 'PPPoE' : 'Hotspot'}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {visibilityFilter !== 'all' && (
              <button
                onClick={() => setVisibilityFilter('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-colors capitalize"
              >
                {visibilityFilter}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            <button
              onClick={() => { setActiveTab('all'); setConnectionFilter('all'); setVisibilityFilter('all'); }}
              className="text-xs text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
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
          {/* Desktop Table */}
          <DataTable<Plan>
            columns={PLAN_COLUMNS}
            data={filteredPlans}
            rowKey={(plan) => plan.id}
            renderCell={(plan, key) => {
              switch (key) {
                case 'name':
                  return (
                    <div className="flex items-center gap-3 max-w-[200px]">
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-medium text-sm ${
                        plan.plan_type === 'emergency'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-accent-primary/10 text-accent-primary'
                      }`}>
                        {plan.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-foreground block truncate" title={plan.name}>{plan.name}</span>
                        {plan.badge_text && (
                          <p className="text-xs text-accent-primary truncate">{plan.badge_text}</p>
                        )}
                      </div>
                    </div>
                  );
                case 'price':
                  return (
                    <div>
                      <span className="font-semibold text-foreground">KES {plan.price}</span>
                      {plan.original_price != null && plan.original_price > plan.price && (
                        <p className="text-xs text-foreground-muted line-through">KES {plan.original_price}</p>
                      )}
                    </div>
                  );
                case 'duration':
                  return (
                    <span className="text-foreground-muted">
                      {plan.duration_value} {plan.duration_unit.toLowerCase()}
                    </span>
                  );
                case 'speed': {
                  const spd = getPlanSpeed(plan);
                  return (
                    <span className="text-foreground-muted text-sm font-mono">
                      ↓{spd.down} / ↑{spd.up}
                    </span>
                  );
                }
                case 'connection':
                  return (
                    <span className={`badge ${
                      plan.connection_type === 'pppoe' ? 'badge-info' : 'badge-neutral'
                    }`}>
                      {plan.connection_type === 'pppoe' ? 'PPPoE' : 'Hotspot'}
                    </span>
                  );
                case 'type':
                  return (
                    <span className={`badge ${
                      plan.plan_type === 'emergency' ? 'badge-warning' : 'badge-success'
                    } capitalize`}>
                      {plan.plan_type || 'regular'}
                    </span>
                  );
                case 'status': {
                  const isExpired = plan.valid_until && new Date(plan.valid_until) < new Date();
                  if (isExpired) return <span className="badge badge-danger">Expired</span>;
                  if (plan.is_hidden) return <span className="badge badge-neutral">Hidden</span>;
                  return <span className="badge badge-success">Visible</span>;
                }
                case 'actions':
                  return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="p-1.5 rounded-md hover:bg-accent-primary/10 transition-colors text-foreground-muted hover:text-accent-primary"
                        title="Edit plan"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleHidden(plan)}
                        disabled={actionLoading === plan.id}
                        className="p-1.5 rounded-md hover:bg-warning/10 transition-colors text-foreground-muted hover:text-warning"
                        title={plan.is_hidden ? 'Show plan' : 'Hide plan'}
                      >
                        {actionLoading === plan.id ? (
                          <div className="w-4 h-4 border-2 border-warning/30 border-t-warning rounded-full animate-spin" />
                        ) : plan.is_hidden ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={actionLoading === plan.id}
                        className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
                        title="Delete plan"
                      >
                        {actionLoading === plan.id ? (
                          <div className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                default:
                  return null;
              }
            }}
            rowClassName={(plan) =>
              plan.is_hidden ? 'opacity-60' : ''
            }
            rowStyle={(_plan, index) => ({ animationDelay: `${index * 0.05}s`, opacity: 0 })}
            emptyState={{
              icon: (
                <svg className="w-12 h-12 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              message: searchQuery ? 'No plans match your search' : activeTab === 'all' ? 'No plans yet' : `No ${activeTab} plans`,
            }}
          />

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredPlans.length === 0 ? (
              <div className="card p-8 text-center text-foreground-muted">
                <svg className="w-12 h-12 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {searchQuery ? 'No plans match your search' : activeTab === 'all' ? 'No plans yet' : `No ${activeTab} plans`}
              </div>
            ) : (
              filteredPlans.map((plan) => (
                  <MobileDataCard
                    key={plan.id}
                    id={plan.id}
                    title={plan.name}
                    subtitle={`↓${getPlanSpeed(plan).down} / ↑${getPlanSpeed(plan).up}`}
                    avatar={{
                      text: plan.name.charAt(0).toUpperCase(),
                      color: plan.plan_type === 'emergency' ? 'warning' : 'primary',
                    }}
                    badge={{ label: plan.connection_type === 'pppoe' ? 'PPPoE' : 'Hotspot' }}
                    status={{
                      label: plan.is_hidden ? 'Hidden' : 'Visible',
                      variant: plan.is_hidden ? 'neutral' : 'success',
                    }}
                    value={{
                      text: `KES ${plan.price}`,
                      highlight: true,
                    }}
                    secondary={{
                      left: `${plan.duration_value} ${plan.duration_unit.toLowerCase()}`,
                      right: plan.plan_type === 'emergency' ? 'Emergency' : 'Regular',
                    }}
                    onClick={() => setEditingPlan(plan)}
                    rightAction={
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleHidden(plan); }}
                          className="p-1.5 rounded-md hover:bg-warning/10 transition-colors text-foreground-muted hover:text-warning"
                          title={plan.is_hidden ? 'Show' : 'Hide'}
                        >
                          {plan.is_hidden ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePlan(plan.id); }}
                          className="p-1.5 rounded-md hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    }
                    layout="compact"
                    className="animate-fade-in"
                  />
              ))
            )}
          </div>
        </PullToRefresh>
      )}

      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSuccess={() => {
            setEditingPlan(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function formatValidUntil(dateStr: string): string {
  try {
    return formatDateGMT3(dateStr, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function EditPlanModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdatePlanRequest>({
    name: plan.name,
    speed: plan.speed || `${plan.download_speed}/${plan.upload_speed}`,
    price: plan.price,
    duration_value: plan.duration_value,
    duration_unit: plan.duration_unit as 'HOURS' | 'DAYS' | 'MINUTES',
    connection_type: (plan.connection_type as 'hotspot' | 'pppoe') || 'hotspot',
    router_profile: plan.router_profile || '',
    plan_type: plan.plan_type || 'regular',
    is_hidden: plan.is_hidden || false,
    badge_text: plan.badge_text || null,
    original_price: plan.original_price ?? null,
    valid_until: utcToGMT3Input(plan.valid_until) || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const payload = { ...formData };
      if (!payload.badge_text) payload.badge_text = null;
      if (!payload.original_price) payload.original_price = null;
      payload.valid_until = payload.valid_until ? gmt3InputToISO(payload.valid_until) : null;
      await api.updatePlan(plan.id, payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg card animate-fade-in max-h-[90vh] flex flex-col"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-foreground">Edit Plan</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm shrink-0">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 px-6" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
          <form id="edit-plan-form" onSubmit={handleSubmit} className="space-y-4 pb-2" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Plan Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., 1 Hour Plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price (KES)</label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  className="input"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Speed (Down/Up)</label>
                <input
                  type="text"
                  value={formData.speed || ''}
                  onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                  className="input"
                  placeholder="e.g., 5M/2M"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Duration Value</label>
                <input
                  type="number"
                  value={formData.duration_value || ''}
                  onChange={(e) => setFormData({ ...formData, duration_value: e.target.value === '' ? 0 : (parseInt(e.target.value) || 1) })}
                  onBlur={() => { if (!formData.duration_value) setFormData(prev => ({ ...prev, duration_value: 1 })); }}
                  className="input"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Duration Unit</label>
                <select
                  value={formData.duration_unit || 'HOURS'}
                  onChange={(e) => setFormData({ ...formData, duration_unit: e.target.value as 'HOURS' | 'DAYS' | 'MINUTES' })}
                  className="select"
                >
                  <option value="MINUTES">Minutes</option>
                  <option value="HOURS">Hours</option>
                  <option value="DAYS">Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Connection Type</label>
                <select
                  value={formData.connection_type || 'hotspot'}
                  onChange={(e) => setFormData({ ...formData, connection_type: e.target.value as 'hotspot' | 'pppoe' })}
                  className="select"
                >
                  <option value="hotspot">Hotspot</option>
                  <option value="pppoe">PPPoE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Router Profile</label>
                <input
                  type="text"
                  value={formData.router_profile || ''}
                  onChange={(e) => setFormData({ ...formData, router_profile: e.target.value })}
                  className="input"
                  placeholder="default"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">Advanced Options</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Plan Type</label>
                  <select
                    value={formData.plan_type || 'regular'}
                    onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as 'regular' | 'emergency' })}
                    className="select"
                  >
                    <option value="regular">Regular</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Original Price</label>
                  <input
                    type="number"
                    value={formData.original_price ?? ''}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value ? parseInt(e.target.value) : null })}
                    className="input"
                    placeholder="For strikethrough"
                    min={0}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Badge Text</label>
                <input
                  type="text"
                  value={formData.badge_text || ''}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value || null })}
                  className="input"
                  placeholder='e.g., "Hot Deal", "New"'
                />
              </div>

              <div className="mb-4">
                <DateTimePicker
                  label="Valid Until"
                  value={formData.valid_until || ''}
                  onChange={(v) => setFormData({ ...formData, valid_until: v || null })}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_hidden || false}
                  onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-foreground">Hidden from public portal</span>
              </label>
            </div>
          </form>
        </div>

        <div className="flex gap-3 p-6 pt-4 shrink-0 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" form="edit-plan-form" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}
