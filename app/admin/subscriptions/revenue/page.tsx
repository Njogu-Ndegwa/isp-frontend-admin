'use client';

import { useEffect, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../../../lib/api';
import { AdminSubscriptionRevenue } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { SkeletonCard } from '../../../components/LoadingSpinner';

const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#ef4444'];

export default function SubscriptionRevenuePage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminSubscriptionRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminSubscriptionRevenue();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateInvoices = async () => {
    setGenerateLoading(true);
    try {
      const result = await api.generateInvoices();
      setGenerateResult(`${result.generated} invoices generated, ${result.skipped} skipped`);
      setShowGenerateDialog(false);
      fetchData();
    } catch (err) {
      setGenerateResult(err instanceof Error ? err.message : 'Failed to generate invoices');
    } finally {
      setGenerateLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
        </div>
      </div>
    );
  }

  const pieData = data ? [
    { name: 'Active', value: data.resellers.active },
    { name: 'Trial', value: data.resellers.trial },
    { name: 'Suspended', value: data.resellers.suspended },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Subscription Revenue"
        subtitle="Revenue from reseller subscriptions"
        backHref="/admin/subscriptions"
        action={
          <button
            onClick={() => setShowGenerateDialog(true)}
            className="text-sm px-4 py-2 rounded-xl border border-border text-foreground-muted hover:bg-background-tertiary transition-colors"
          >
            Generate Invoices
          </button>
        }
      />

      {generateResult && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 flex items-center justify-between">
          <span>{generateResult}</span>
          <button onClick={() => setGenerateResult(null)} className="text-blue-400/60 hover:text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* Revenue Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Collected"
              value={formatKES(data.total_collected)}
              subtitle="All time"
              accent="success"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="This Month"
              value={formatKES(data.this_month_collected)}
              subtitle="Current month"
              accent="primary"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            />
            <StatCard
              title="Outstanding"
              value={formatKES(data.total_outstanding)}
              subtitle={`${data.overdue_invoices} overdue`}
              accent="warning"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
            />
            <StatCard
              title="Total Invoices"
              value={data.total_invoices}
              subtitle={`${data.overdue_invoices} overdue`}
              accent="info"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          </div>

          {/* Reseller Breakdown */}
          <div className="card p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Reseller Breakdown</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {pieData.length > 0 && (
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-background-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                        labelStyle={{ color: 'var(--color-foreground)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-foreground flex-1">Active</span>
                  <span className="text-sm font-semibold text-foreground">{data.resellers.active}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-foreground flex-1">Trial</span>
                  <span className="text-sm font-semibold text-foreground">{data.resellers.trial}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-foreground flex-1">Suspended</span>
                  <span className="text-sm font-semibold text-foreground">{data.resellers.suspended}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Generate Invoices Dialog */}
      <ConfirmDialog
        isOpen={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onConfirm={handleGenerateInvoices}
        title="Generate Monthly Invoices"
        message="This will generate invoices for all eligible resellers for last month. This runs automatically on the 1st of each month."
        confirmLabel="Generate"
        variant="warning"
        loading={generateLoading}
      />
    </div>
  );
}
