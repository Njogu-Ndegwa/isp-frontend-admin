'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Plan, CreatePlanRequest, PlanPerformanceDetail } from '../lib/types';
import Header from '../components/Header';
import { PageLoader } from '../components/LoadingSpinner';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [performance, setPerformance] = useState<PlanPerformanceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  const getPlanPerformance = (planId: number) => {
    return performance.find((p) => p.plan_id === planId);
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

      {/* Actions */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-2 text-foreground-muted">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>{plans.length} plans available</span>
        </div>
        <div className="flex gap-3">
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
            Create Plan
          </button>
        </div>
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
        <>
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const perf = getPlanPerformance(plan.id);
              return (
                <div
                  key={plan.id}
                  className="card p-6 relative overflow-hidden animate-fade-in group"
                  style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
                >
                  {/* Background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-primary/10 to-transparent rounded-bl-full" />
                  
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        <p className="text-3xl font-bold text-accent-primary mt-1">
                          KES {plan.price}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={actionLoading === plan.id}
                        className="p-2 rounded-lg text-foreground-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {actionLoading === plan.id ? (
                          <div className="w-5 h-5 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
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

          {plans.length === 0 && (
            <div className="card p-12 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-foreground-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Plans Yet</h3>
              <p className="text-foreground-muted mb-4">Create your first internet plan to get started</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                Create Plan
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await api.createPlan(formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, duration_value: parseInt(e.target.value) })}
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







