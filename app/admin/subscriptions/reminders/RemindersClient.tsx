'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { AdminSubscriptionReminders } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import Header from '../../../components/Header';
import SubscriptionStatusBadge from '../../../components/SubscriptionStatusBadge';
import DataTable from '../../../components/DataTable';
import MobileDataCard from '../../../components/MobileDataCard';
import { SkeletonCard } from '../../../components/LoadingSpinner';
import {
  ReminderSmsBadge,
  STAGE_SHORT,
  formatRelative,
  formatWhen,
  reminderSummary,
} from './reminderDisplay';

// Reseller subscription reminders: who is about to expire, which texts they
// got, and what goes out next. Sending is done by the backend scheduler every
// 10 minutes; this page only reads it and flips the on/off switch.

const RANGES = [3, 7, 14, 30];

const TONE_CLASS = {
  muted: 'text-foreground-muted',
  info: 'text-foreground',
  warning: 'text-amber-500',
} as const;

export default function RemindersClient() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AdminSubscriptionReminders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const requestSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    try {
      setLoading(true);
      setError(null);
      const result = await api.getAdminSubscriptionReminders(days);
      if (requestSeqRef.current !== seq) return;
      setData(result);
    } catch (err) {
      if (requestSeqRef.current !== seq) return;
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      if (requestSeqRef.current === seq) setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const toggle = async () => {
    if (!data) return;
    const next = !data.enabled;
    setToggling(true);
    try {
      await api.updateMessagingSettings({ subscription_reminders_enabled: next });
      setData({ ...data, enabled: next });
      showAlert('success', next ? 'Subscription reminders turned on' : 'Subscription reminders turned off');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : 'Failed to update the setting');
    } finally {
      setToggling(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Admin Access Required</h2>
          <p className="text-foreground-muted text-sm">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Header
        title="Subscription reminders"
        subtitle="Texts and inbox messages to resellers before their subscription expires"
        action={
          <Link href="/admin/subscriptions" className="btn-secondary text-sm px-4 py-2">
            Subscriptions
          </Link>
        }
      />

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error && !data ? (
        <div className="card p-8 text-center">
          <p className="text-danger mb-4">{error}</p>
          <button onClick={load} className="btn-primary px-4 py-2 text-sm">Retry</button>
        </div>
      ) : data ? (
        <>
          {/* On/off + how it works */}
          <div className="card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={data.enabled}
                aria-label="Subscription reminders"
                disabled={toggling}
                onClick={toggle}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                  data.enabled ? 'bg-emerald-500' : 'bg-background-tertiary border border-border'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  data.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className="text-sm font-medium text-foreground">
                Reminders are {data.enabled ? 'on' : 'off'}
              </span>
            </div>
            <p className="text-xs text-foreground-muted">
              Every reseller on an active or trial subscription gets an SMS and an inbox message{' '}
              {data.stages.map((s) => STAGE_SHORT[s.stage] ?? s.label).join(', ').replace(/, ([^,]*)$/, ' and $1')}{' '}
              before it expires. Texts due between 22:00 and 07:00 in the reseller&apos;s own timezone wait
              until 07:00. They go out on the platform SMS gateway and never use the reseller&apos;s SMS credits.
              Resellers without a phone number on file get the inbox message only.
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryTile label={`Expiring in ${data.days} days`} value={data.summary.upcoming} tone="amber" />
            <SummaryTile label="No phone on file" value={data.summary.upcoming_without_phone}
                         tone={data.summary.upcoming_without_phone ? 'amber' : 'muted'} />
            <SummaryTile label="Reminders sent (7 days)" value={data.summary.sent_last_7_days} tone="emerald" />
            <SummaryTile label="SMS failed (7 days)" value={data.summary.sms_failed_last_7_days}
                         tone={data.summary.sms_failed_last_7_days ? 'red' : 'muted'} />
          </div>

          {/* Upcoming */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Expiring soon</h2>
              <div className="flex gap-2">
                {RANGES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      days === d
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'border border-border text-foreground-muted hover:bg-background-tertiary'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-foreground-muted">No subscriptions expire in the next {data.days} days</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable
                    columns={[
                      { key: 'reseller', label: 'Reseller' },
                      { key: 'status', label: 'Status' },
                      { key: 'expires', label: 'Expires' },
                      { key: 'reminders', label: 'Reminders' },
                    ]}
                    data={data.upcoming}
                    rowKey={(r) => r.reseller_id}
                    renderCell={(r, col) => {
                      switch (col) {
                        case 'reseller':
                          return (
                            <div>
                              <p className="font-medium text-sm">{r.organization_name}</p>
                              <p className="text-xs text-foreground-muted">{r.phone ?? 'No phone on file'} · {r.email}</p>
                            </div>
                          );
                        case 'status':
                          return <SubscriptionStatusBadge status={r.subscription_status} />;
                        case 'expires':
                          return (
                            <div>
                              <p className="text-sm">{formatWhen(r.subscription_expires_at)}</p>
                              <p className={`text-xs ${r.hours_until_expiry < 0 ? 'text-red-500' : 'text-foreground-muted'}`}>
                                {r.hours_until_expiry < 0 ? `expired ${formatRelative(r.hours_until_expiry)}` : `in ${formatRelative(r.hours_until_expiry)}`}
                              </p>
                            </div>
                          );
                        case 'reminders': {
                          const s = reminderSummary(r, data.generated_at);
                          return <span className={`text-xs ${TONE_CLASS[s.tone]}`}>{s.text}</span>;
                        }
                        default: return null;
                      }
                    }}
                    onRowClick={(r) => { window.location.href = `/admin/subscriptions/${r.reseller_id}`; }}
                    emptyState={{ message: 'No subscriptions expiring' }}
                  />
                </div>
                <div className="md:hidden space-y-2">
                  {data.upcoming.map((r) => {
                    const s = reminderSummary(r, data.generated_at);
                    return (
                      <MobileDataCard
                        key={r.reseller_id}
                        id={r.reseller_id}
                        title={r.organization_name}
                        subtitle={r.phone ?? 'No phone on file'}
                        status={{ label: r.subscription_status, variant: r.subscription_status === 'trial' ? 'info' : 'success' }}
                        value={{ text: r.hours_until_expiry < 0 ? 'Expired' : `in ${formatRelative(r.hours_until_expiry)}` }}
                        footer={
                          <div className="space-y-0.5 text-xs">
                            <p className="text-foreground-muted">Expires {formatWhen(r.subscription_expires_at)}</p>
                            <p className={TONE_CLASS[s.tone]}>{s.text}</p>
                          </div>
                        }
                        layout="compact"
                        href={`/admin/subscriptions/${r.reseller_id}`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Log */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Recently sent</h2>
            {data.recent.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-foreground-muted">No reminders sent yet</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <DataTable
                    columns={[
                      { key: 'sent', label: 'Sent' },
                      { key: 'reseller', label: 'Reseller' },
                      { key: 'stage', label: 'Reminder' },
                      { key: 'sms', label: 'SMS' },
                      { key: 'inbox', label: 'Inbox' },
                    ]}
                    data={data.recent}
                    rowKey={(r) => r.id}
                    renderCell={(r, col) => {
                      switch (col) {
                        case 'sent':
                          return <span className="text-sm text-foreground-muted">{formatWhen(r.sent_at)}</span>;
                        case 'reseller':
                          return (
                            <div>
                              <p className="font-medium text-sm">{r.organization_name}</p>
                              <p className="text-xs text-foreground-muted">{r.phone ?? r.email}</p>
                            </div>
                          );
                        case 'stage':
                          return <span className="text-sm">{r.stage_label}</span>;
                        case 'sms':
                          return (
                            <div className="space-y-1">
                              <ReminderSmsBadge status={r.sms_status} error={r.sms_error} />
                              {r.sms_error && <p className="text-xs text-red-500 max-w-[260px] truncate" title={r.sms_error}>{r.sms_error}</p>}
                            </div>
                          );
                        case 'inbox':
                          return <span className="text-xs text-foreground-muted">{r.inbox_sent ? 'Delivered' : '—'}</span>;
                        default: return null;
                      }
                    }}
                    onRowClick={(r) => { window.location.href = `/admin/subscriptions/${r.reseller_id}`; }}
                    emptyState={{ message: 'No reminders sent yet' }}
                  />
                </div>
                <div className="md:hidden space-y-2">
                  {data.recent.map((r) => (
                    <MobileDataCard
                      key={r.id}
                      id={r.id}
                      title={r.organization_name}
                      subtitle={`${r.stage_label} · ${formatWhen(r.sent_at)}`}
                      footer={
                        <div className="space-y-1 text-xs">
                          <ReminderSmsBadge status={r.sms_status} error={r.sms_error} />
                          {r.sms_error && <p className="text-red-500">{r.sms_error}</p>}
                        </div>
                      }
                      layout="compact"
                      href={`/admin/subscriptions/${r.reseller_id}`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

const TILE_TONES = {
  amber: 'bg-amber-500/5 border-amber-500/10 text-amber-500',
  emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500',
  red: 'bg-red-500/5 border-red-500/10 text-red-500',
  muted: 'bg-gray-500/5 border-gray-500/10 text-foreground-muted',
} as const;

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: keyof typeof TILE_TONES }) {
  return (
    <div className={`p-3 rounded-xl border ${TILE_TONES[tone]}`}>
      <p className="text-xs text-foreground-muted mb-0.5">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
