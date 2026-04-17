'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import StatCard from '../../../components/StatCard';
import { getStageMeta } from '../../../components/LeadStageBadge';
import { api } from '../../../lib/api';
import type { LeadPipelineStats, FollowUpsResponse, LeadStage } from '../../../lib/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const FUNNEL_COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#f97316', '#06b6d4', '#22c55e'];

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

export default function LeadAnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LeadPipelineStats | null>(null);
  const [followups, setFollowups] = useState<FollowUpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, f] = await Promise.all([
        api.getLeadPipelineStats(),
        api.getUpcomingFollowUps(7),
      ]);
      setStats(s);
      setFollowups(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center"><p className="text-foreground-muted">Admin Access Required</p></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Pipeline Analytics" backHref="/admin/leads" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 bg-background-tertiary rounded w-2/3 mb-2" />
              <div className="h-6 bg-background-tertiary rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4 pb-24 md:pb-6">
        <Header title="Pipeline Analytics" backHref="/admin/leads" />
        <div className="card p-6 text-center">
          <p className="text-red-400 mb-3">{error || 'Failed to load'}</p>
          <button onClick={fetchData} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const funnelData = stats.funnel.map((step, i) => ({
    name: getStageMeta(step.stage as LeadStage).label,
    reached: step.reached,
    dropOff: step.drop_off_percent,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  const sourceData = Object.entries(stats.by_source).map(([name, s]) => ({
    name,
    total: s.total,
    converted: s.converted,
    rate: s.conversion_rate,
  }));

  const avgDaysData = Object.entries(stats.avg_days_in_stage).map(([stage, days]) => ({
    name: getStageMeta(stage as LeadStage).label,
    days,
  }));

  const priorityColors: Record<string, string> = {
    high: 'border-red-500/30 bg-red-500/5',
    medium: 'border-yellow-500/30 bg-yellow-500/5',
    low: 'border-green-500/30 bg-green-500/5',
  };

  const priorityBadge: Record<string, string> = {
    high: 'badge-danger',
    medium: 'badge-warning',
    low: 'badge-success',
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header title="Pipeline Analytics" subtitle="Lead conversion insights" backHref="/admin/leads" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Leads"
          value={String(stats.total_leads)}
          accent="primary"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Pipeline"
          value={String(stats.active_pipeline)}
          accent="info"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversion_rate}%`}
          accent="success"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Loss Rate"
          value={`${stats.loss_rate}%`}
          accent="danger"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Stage counts */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Leads by Stage</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {Object.entries(stats.by_stage).map(([stage, count]) => {
            const meta = getStageMeta(stage as LeadStage);
            return (
              <div key={stage} className="text-center">
                <span className={`badge ${meta.variant} text-[10px] mb-1 inline-block`}>{meta.label}</span>
                <p className="text-lg font-bold stat-value">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Conversion Funnel</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} width={100} />
              <Tooltip
                contentStyle={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
                labelStyle={{ color: 'var(--foreground)' }}
                itemStyle={{ color: 'var(--foreground-muted)' }}
                formatter={(value: number | undefined) => [value ?? 0, 'Reached']}
              />
              <Bar dataKey="reached" radius={[0, 6, 6, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1">
          {stats.funnel.filter(s => s.drop_off_percent > 0).map(step => (
            <div key={step.stage} className="flex items-center justify-between text-xs">
              <span className="text-foreground-muted">
                Drop-off before {getStageMeta(step.stage as LeadStage).label}
              </span>
              <span className={`font-medium ${step.drop_off_percent > 20 ? 'text-red-400' : 'text-foreground-muted'}`}>
                {step.drop_off_percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Source performance */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Source Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-foreground-muted text-xs">
                <th className="pb-2">Source</th>
                <th className="pb-2 text-right">Leads</th>
                <th className="pb-2 text-right">Converted</th>
                <th className="pb-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {sourceData.sort((a, b) => b.rate - a.rate).map(s => (
                <tr key={s.name} className="border-t border-border">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-right text-foreground-muted">{s.total}</td>
                  <td className="py-2 text-right text-foreground-muted">{s.converted}</td>
                  <td className="py-2 text-right">
                    <span className={s.rate >= 50 ? 'text-green-400' : s.rate >= 25 ? 'text-yellow-400' : 'text-foreground-muted'}>
                      {s.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Average days in stage */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Average Days in Stage</h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgDaysData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--foreground-muted)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 12 }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: number | undefined) => [`${value ?? 0} days`, 'Avg']}
              />
              <Bar dataKey="days" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Health indicators */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3">Pipeline Health</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-background-tertiary">
            <p className={`text-2xl font-bold stat-value ${stats.health.stale_leads > 0 ? 'text-red-400' : ''}`}>
              {stats.health.stale_leads}
            </p>
            <span className="text-xs text-foreground-muted">Stale Leads</span>
          </div>
          <div className="text-center p-3 rounded-xl bg-background-tertiary">
            <p className={`text-2xl font-bold stat-value ${stats.health.overdue_followups > 0 ? 'text-red-400' : ''}`}>
              {stats.health.overdue_followups}
            </p>
            <span className="text-xs text-foreground-muted">Overdue Follow-ups</span>
          </div>
          <div className="text-center p-3 rounded-xl bg-background-tertiary">
            <p className={`text-2xl font-bold stat-value ${stats.health.no_followup_scheduled > 3 ? 'text-yellow-400' : ''}`}>
              {stats.health.no_followup_scheduled}
            </p>
            <span className="text-xs text-foreground-muted">No Follow-up</span>
          </div>
        </div>

        {stats.health.stale_lead_previews.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground-muted mb-2">Stale Lead Previews</h4>
            <div className="space-y-1">
              {stats.health.stale_lead_previews.map(lead => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium">{lead.name}</span>
                    <span className="text-xs text-foreground-muted ml-2">{lead.phone}</span>
                  </div>
                  <span className="text-xs text-red-400">{lead.days_since_update}d stale</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advice */}
      {stats.advice.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Actionable Advice</h3>
          {stats.advice.map((tip, i) => (
            <div key={i} className={`card p-4 border ${priorityColors[tip.priority] || ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${priorityBadge[tip.priority] || 'badge-neutral'} text-[10px]`}>
                  {tip.priority}
                </span>
                <span className="text-xs text-foreground-muted capitalize">{tip.category.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-sm font-medium mb-0.5">{tip.title}</p>
              <p className="text-xs text-foreground-muted">{tip.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming follow-ups */}
      {followups && followups.followups.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Upcoming Follow-ups (7 days)</h3>
            <span className="text-xs text-foreground-muted">{followups.total} total</span>
          </div>
          <div className="space-y-2">
            {followups.followups.map(fup => (
              <Link
                key={fup.id}
                href={`/admin/leads/${fup.lead_id}`}
                className={`flex items-center justify-between p-2 rounded-lg hover:bg-background-tertiary transition-colors ${
                  fup.is_overdue ? 'border border-red-500/20' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fup.title}</p>
                  <span className="text-xs text-foreground-muted">{fup.lead_name} &middot; {getStageMeta(fup.lead_stage).label}</span>
                </div>
                <span className={`text-xs flex-shrink-0 ml-2 ${fup.is_overdue ? 'text-red-400 font-medium' : 'text-foreground-muted'}`}>
                  {fup.is_overdue ? 'Overdue' : formatDateTime(fup.due_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
