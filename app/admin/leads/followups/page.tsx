'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import Header from '../../../components/Header';
import LeadsSubNav from '../../../components/LeadsSubNav';
import { getStageMeta } from '../../../components/LeadStageBadge';
import { api } from '../../../lib/api';
import type { FollowUpsResponse, UpcomingFollowUp } from '../../../lib/types';

type RangeFilter = '1' | '7' | '30';
type StatusFilter = 'all' | 'overdue' | 'due_today' | 'upcoming';

const RANGE_LABELS: Record<RangeFilter, string> = {
  '1': 'Today',
  '7': 'This week',
  '30': 'This month',
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return '-'; }
}

function isDueToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
  } catch { return false; }
}

export default function LeadFollowUpsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<FollowUpsResponse | null>(null);
  const [range, setRange] = useState<RangeFilter>('7');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getUpcomingFollowUps(Number(range));
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { visible, counts } = useMemo(() => {
    const all = data?.followups ?? [];
    const buckets = {
      overdue: all.filter(f => f.is_overdue),
      due_today: all.filter(f => !f.is_overdue && isDueToday(f.due_at)),
      upcoming: all.filter(f => !f.is_overdue && !isDueToday(f.due_at)),
    };
    const filtered: UpcomingFollowUp[] =
      status === 'all' ? all
      : status === 'overdue' ? buckets.overdue
      : status === 'due_today' ? buckets.due_today
      : buckets.upcoming;
    return {
      visible: [...filtered].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()),
      counts: {
        all: all.length,
        overdue: buckets.overdue.length,
        due_today: buckets.due_today.length,
        upcoming: buckets.upcoming.length,
      },
    };
  }, [data, status]);

  const handleComplete = async (id: number) => {
    setCompleting(id);
    try {
      await api.completeFollowUp(id);
      await fetchData();
    } catch (err) {
      console.error('Complete follow-up failed:', err);
    } finally {
      setCompleting(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center"><p className="text-foreground-muted">Admin Access Required</p></div>
      </div>
    );
  }

  const statusTabs: Array<{ key: StatusFilter; label: string; count: number; tone: string }> = [
    { key: 'all', label: 'All', count: counts.all, tone: 'text-foreground' },
    { key: 'overdue', label: 'Overdue', count: counts.overdue, tone: 'text-red-400' },
    { key: 'due_today', label: 'Due today', count: counts.due_today, tone: 'text-amber-400' },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming, tone: 'text-foreground-muted' },
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      <Header
        title="Follow-ups"
        subtitle={data ? `${data.total} scheduled in the next ${RANGE_LABELS[range].toLowerCase()}` : 'Track every conversation to close'}
        action={
          <div className="hidden md:flex items-center gap-2">
            <div className="flex bg-background-tertiary rounded-lg p-0.5">
              {(Object.keys(RANGE_LABELS) as RangeFilter[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    range === r ? 'bg-accent-primary text-black' : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <LeadsSubNav counts={{ '/admin/leads/followups': counts.overdue + counts.due_today }} />

      {/* Mobile range switcher */}
      <div className="md:hidden flex bg-background-tertiary rounded-lg p-0.5 w-fit">
        {(Object.keys(RANGE_LABELS) as RangeFilter[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              range === r ? 'bg-accent-primary text-black' : 'text-foreground-muted'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {statusTabs.map(tab => {
          const active = status === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                active
                  ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                  : 'bg-background-secondary border-border text-foreground-muted hover:text-foreground hover:border-border-hover'
              }`}
            >
              <span className={active ? '' : tab.tone}>{tab.label}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-accent-primary/20' : 'bg-background-tertiary'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-background-tertiary rounded w-1/3 mb-2" />
              <div className="h-3 bg-background-tertiary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={fetchData} className="btn-primary text-sm">Retry</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-foreground">All caught up</p>
          <p className="text-sm text-foreground-muted mt-1">No follow-ups in this bucket.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(fup => {
            const dueToday = !fup.is_overdue && isDueToday(fup.due_at);
            return (
              <div
                key={fup.id}
                className={`card p-3 sm:p-4 flex items-start gap-3 transition-colors ${
                  fup.is_overdue
                    ? 'border-red-500/30 bg-red-500/5'
                    : dueToday
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : ''
                }`}
              >
                <button
                  onClick={() => handleComplete(fup.id)}
                  disabled={completing === fup.id}
                  title="Mark complete"
                  className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    completing === fup.id
                      ? 'bg-accent-primary border-accent-primary'
                      : 'border-border hover:border-accent-primary hover:bg-accent-primary/10'
                  }`}
                >
                  {completing === fup.id && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <Link href={`/admin/leads/${fup.lead_id}`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{fup.title}</p>
                    <span className={`text-[10px] flex-shrink-0 font-semibold uppercase tracking-wider ${
                      fup.is_overdue ? 'text-red-400' : dueToday ? 'text-amber-400' : 'text-foreground-muted'
                    }`}>
                      {fup.is_overdue ? 'Overdue' : dueToday ? 'Today' : formatDateTime(fup.due_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground-muted min-w-0">
                    <span className="truncate">{fup.lead_name}</span>
                    <span className="opacity-50">&middot;</span>
                    <span className={`badge ${getStageMeta(fup.lead_stage).variant} text-[10px]`}>
                      {getStageMeta(fup.lead_stage).label}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
