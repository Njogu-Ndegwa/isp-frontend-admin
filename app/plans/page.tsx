'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plan, CreatePlanRequest, UpdatePlanRequest, PlanPerformanceDetail } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';

type FilterTab = 'all' | 'regular' | 'emergency' | 'hidden';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [performance, setPerformance] = useState<PlanPerformanceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, performanceData] = await Promise.all([
        api.getPlans(),
        api.getPlanPerformance(),
      ]);
      setPlans(plansData);
      setPerformance(performanceData.plans);
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

  const handleEmergencyMode = async (activate: boolean) => {
    try {
      setEmergencyLoading(true);
      setEmergencyMessage(null);
      const result = activate
        ? await api.activateEmergencyMode()
        : await api.deactivateEmergencyMode();
      setEmergencyMessage(result.message);
      await loadData();
      setTimeout(() => setEmergencyMessage(null), 5000);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to toggle emergency mode');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const getPlanPerformance = (planId: number) => {
    return performance.find((p) => p.plan_id === planId);
  };

  const hasEmergencyPlans = plans.some((p) => p.plan_type === 'emergency');
  const isEmergencyActive = plans.some(
    (p) => p.plan_type === 'emergency' && !p.is_hidden
  ) && plans.some(
    (p) => p.plan_type === 'regular' && p.is_hidden
  );

  const filteredPlans = plans.filter((plan) => {
    switch (activeTab) {
      case 'regular':
        return plan.plan_type !== 'emergency';
      case 'emergency':
        return plan.plan_type === 'emergency';
      case 'hidden':
        return plan.is_hidden;
      default:
        return true;
    }
  });

  const tabCounts = {
    all: plans.length,
    regular: plans.filter((p) => p.plan_type !== 'emergency').length,
    emergency: plans.filter((p) => p.plan_type === 'emergency').length,
    hidden: plans.filter((p) => p.is_hidden).length,
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

      {/* Emergency Mode Banner */}
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
          {hasEmergencyPlans && (
            <button
              onClick={() => handleEmergencyMode(!isEmergencyActive)}
              disabled={emergencyLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isEmergencyActive
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
              {isEmergencyActive ? 'Deactivate Emergency' : 'Activate Emergency'}
            </button>
          )}
          <button onClick={loadData} className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 animate-fade-in">
        {([
          { key: 'all', label: 'All Plans' },
          { key: 'regular', label: 'Regular' },
          { key: 'emergency', label: 'Emergency' },
          { key: 'hidden', label: 'Hidden' },
        ] as { key: FilterTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-accent-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-white/20'
                  : 'bg-background-tertiary'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
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
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredPlans.map((plan, index) => {
              const perf = getPlanPerformance(plan.id);
              const isExpired = plan.valid_until && new Date(plan.valid_until) < new Date();
              return (
                <div
                  key={plan.id}
                  className={`card p-6 relative overflow-hidden animate-fade-in group ${
                    plan.is_hidden ? 'opacity-60 border-dashed' : ''
                  } ${plan.plan_type === 'emergency' ? 'ring-1 ring-warning/40' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s`, opacity: 0 }}
                >
                  {/* Background accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full ${
                    plan.plan_type === 'emergency'
                      ? 'bg-gradient-to-br from-warning/10 to-transparent'
                      : 'bg-gradient-to-br from-accent-primary/10 to-transparent'
                  }`} />

                  {/* Badges row */}
                  <div className="relative flex flex-wrap gap-1.5 mb-3">
                    {plan.plan_type === 'emergency' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Emergency
                      </span>
                    )}
                    {plan.is_hidden && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-foreground-muted/10 text-foreground-muted border border-foreground-muted/20">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" />
                        </svg>
                        Hidden
                      </span>
                    )}
                    {plan.badge_text && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/15 text-accent-primary border border-accent-primary/30">
                        {plan.badge_text}
                      </span>
                    )}
                    {isExpired && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger/15 text-danger border border-danger/30">
                        Expired
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="text-3xl font-bold text-accent-primary">
                            KES {plan.price}
                          </p>
                          {plan.original_price != null && plan.original_price > plan.price && (
                            <p className="text-lg text-foreground-muted line-through">
                              KES {plan.original_price}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Actions dropdown */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingPlan(plan)}
                          className="p-2 rounded-lg text-foreground-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                          title="Edit plan"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleHidden(plan)}
                          disabled={actionLoading === plan.id}
                          className="p-2 rounded-lg text-foreground-muted hover:text-warning hover:bg-warning/10 transition-colors"
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
                          className="p-2 rounded-lg text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors"
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
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3 text-foreground-muted">
                        <svg className="w-5 h-5 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {plan.duration_value} {plan.duration_unit.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-foreground-muted">
                        <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>↓ {plan.download_speed} / ↑ {plan.upload_speed}</span>
                      </div>
                      {plan.valid_until && (
                        <div className="flex items-center gap-3 text-foreground-muted">
                          <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">
                            Valid until {formatValidUntil(plan.valid_until)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Performance Stats */}
                    {perf && (
                      <div className="pt-4 border-t border-border">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-foreground">{perf.total_sales}</p>
                            <p className="text-xs text-foreground-muted">Sales</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-success">{perf.active_customers}</p>
                            <p className="text-xs text-foreground-muted">Active</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-accent-primary">
                              {(perf.total_revenue / 1000).toFixed(1)}K
                            </p>
                            <p className="text-xs text-foreground-muted">Revenue</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPlans.length === 0 && (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {activeTab === 'all' ? 'No Plans Yet' : `No ${activeTab} plans`}
              </h3>
              <p className="text-foreground-muted mb-4">
                {activeTab === 'all'
                  ? 'Create your first internet plan to get started'
                  : `No plans match the "${activeTab}" filter`}
              </p>
              {activeTab === 'all' && (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                  Create Plan
                </button>
              )}
            </div>
          )}
        </PullToRefresh>
      )}

      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-KE', {
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

function CreatePlanModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePlanRequest>({
    name: '',
    speed: '5M/2M',
    price: 50,
    duration_value: 1,
    duration_unit: 'HOURS',
    connection_type: 'hotspot',
    router_profile: 'default',
    plan_type: 'regular',
    is_hidden: false,
    badge_text: null,
    original_price: null,
    valid_until: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const payload = { ...formData };
      if (!payload.badge_text) payload.badge_text = null;
      if (!payload.original_price) payload.original_price = null;
      if (!payload.valid_until) payload.valid_until = null;
      await api.createPlan(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Create New Plan</h2>
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
            <label className="block text-sm font-medium text-foreground mb-2">Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., 1 Hour Plan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Price (KES)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="input"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Speed (Down/Up)</label>
              <input
                type="text"
                value={formData.speed}
                onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                className="input"
                placeholder="e.g., 5M/2M"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Duration Value</label>
              <input
                type="number"
                value={formData.duration_value}
                onChange={(e) => setFormData({ ...formData, duration_value: parseInt(e.target.value) || 1 })}
                className="input"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Duration Unit</label>
              <select
                value={formData.duration_unit}
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
                value={formData.connection_type}
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

          {/* New fields section */}
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
              <label className="block text-sm font-medium text-foreground mb-2">Valid Until</label>
              <input
                type="datetime-local"
                value={formData.valid_until ? formData.valid_until.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="input"
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
                'Create Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
    valid_until: plan.valid_until || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const payload = { ...formData };
      if (!payload.badge_text) payload.badge_text = null;
      if (!payload.original_price) payload.original_price = null;
      if (!payload.valid_until) payload.valid_until = null;
      await api.updatePlan(plan.id, payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Edit Plan</h2>
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
                value={formData.price ?? ''}
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
                value={formData.duration_value ?? ''}
                onChange={(e) => setFormData({ ...formData, duration_value: parseInt(e.target.value) || 1 })}
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

          {/* Enhanced fields */}
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
              <label className="block text-sm font-medium text-foreground mb-2">Valid Until</label>
              <input
                type="datetime-local"
                value={formData.valid_until ? formData.valid_until.slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="input"
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
