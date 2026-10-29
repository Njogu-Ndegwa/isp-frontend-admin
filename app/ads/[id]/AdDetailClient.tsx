'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import type { Ad, AdStats, Router } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../lib/permissions';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import Header from '../../components/Header';
import ConfirmDialog from '../../components/ConfirmDialog';
import { PageLoader } from '../../components/LoadingSpinner';
import { utcToGMT3DateOnly } from '../../lib/dateUtils';
import { AdStatusChip } from '../components/AdBits';
import AdPreview from '../components/AdPreview';
import RejectAdDialog from '../components/RejectAdDialog';
import {
  adDisplayStatus,
  adToForm,
  EVENT_PLACEMENTS,
  expiresToLastDay,
  formatCount,
  formatDay,
  PLACEMENT_LABEL,
  slotLabel,
  tapRate,
} from '../adModel';

const VIEWS_COLOR = '#f59e0b';
const TAPS_COLOR = '#16a34a';

function fillDays(stats: AdStats | null, days: number) {
  const byDay = new Map((stats?.daily ?? []).map((d) => [d.day, d]));
  const out: { day: string; label: string; impressions: number; clicks: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    out.push({
      day: key,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      impressions: row?.impressions ?? 0,
      clicks: row?.clicks ?? 0,
    });
  }
  return out;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const views = payload.find((p) => p.dataKey === 'impressions')?.value ?? 0;
  const taps = payload.find((p) => p.dataKey === 'clicks')?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <p className="flex items-center gap-2 text-foreground-muted"><span className="h-2 w-2 rounded-sm" style={{ background: VIEWS_COLOR }} />{t('Views')}: <strong className="text-foreground">{views}</strong></p>
      <p className="flex items-center gap-2 text-foreground-muted"><span className="h-2 w-2 rounded-full" style={{ background: TAPS_COLOR }} />{t('Taps')}: <strong className="text-foreground">{taps}</strong></p>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-foreground-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function AdDetailClient() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isAdmin = user?.role === 'admin';
  // "View dashboard" staff see the ad and its stats; changing it needs "Captive portal".
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.portalManage);
  const adId = Number(params.id);

  const [ad, setAd] = useState<Ad | null>(null);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loaded, routerList] = await Promise.all([
        api.getManagedAd(adId),
        api.getRouters().catch(() => [] as Router[]),
      ]);
      setAd(loaded);
      setRouters(routerList);
      api.getAdStats(adId, 30)
        .then((s) => { setStats(s); setStatsError(false); })
        .catch(() => setStatsError(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not load this ad.'));
    } finally {
      setLoading(false);
    }
  }, [adId, t]);

  useEffect(() => { if (Number.isFinite(adId)) void load(); }, [adId, load]);

  const days = useMemo(() => fillDays(stats, 30), [stats]);

  if (loading) return <PageLoader />;
  if (error || !ad) {
    return (
      <div>
        <Header title={t('Ad')} backHref="/ads" />
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background-secondary p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">{t('Ad not found')}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{error}</p>
          <Link href="/ads" className="btn-primary mt-4 inline-flex min-h-[44px] items-center">{t('Back to ads')}</Link>
        </div>
      </div>
    );
  }

  const status = adDisplayStatus(ad, now);
  const views = stats?.impressions ?? ad.views_count;
  const taps = stats?.clicks ?? ad.clicks_count;
  const ownerName = ad.owner_user_id === null
    ? 'Bitwave'
    : ad.owner_name || (isAdmin ? `Reseller #${ad.owner_user_id}` : t('You'));
  const wifiName = isAdmin
    ? (ad.owner_user_id === null ? t('WiFi name') : ownerName)
    : (user?.business_name || user?.organization_name || t('Your WiFi'));
  const placementRows = EVENT_PLACEMENTS.filter((p) =>
    ad.placement === 'local' ? p.key === 'local' : p.key !== 'local' || (stats?.by_placement?.local?.impressions ?? 0) > 0);
  const routerNames = ad.router_ids?.length
    ? ad.router_ids.map((id) => routers.find((r) => r.id === id)?.name ?? `#${id}`).join(', ')
    : ad.owner_user_id === null ? t('Every router') : t('All the owner’s routers');
  const lastDay = expiresToLastDay(ad.expires_at);

  const run = async (fn: () => Promise<Ad>, ok: string) => {
    setBusy(true);
    try {
      const updated = await fn();
      setAd((prev) => ({ ...(prev as Ad), ...updated }));
      showAlert('success', ok);
      setRejecting(false);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.deleteAd(ad.id);
      showAlert('success', t('Ad deleted.'));
      router.push('/ads');
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not delete the ad.'));
      setBusy(false);
    }
  };

  const editLink = canManage ? (
    <Link href={`/ads/${ad.id}/edit`} className="btn-primary inline-flex min-h-[44px] items-center gap-2">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
      {t('Edit')}
    </Link>
  ) : undefined;

  return (
    <div className="pb-8">
      <Header title={ad.title} subtitle={`${ad.seller_name} · ${t(PLACEMENT_LABEL[ad.placement])}`} backHref="/ads" action={editLink} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <AdStatusChip status={status} />
        <span className="badge badge-neutral">{t(slotLabel(ad.slot))}</span>
        {isAdmin && <span className="badge badge-neutral">{ownerName}</span>}
        {canManage && (
          <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
            <Link href={`/ads/${ad.id}/edit`} className="btn-secondary flex min-h-[44px] flex-1 items-center justify-center md:hidden">{t('Edit')}</Link>
            <button
              type="button" disabled={busy}
              onClick={() => void run(() => api.updateAd(ad.id, { is_active: !ad.is_active }), ad.is_active ? t('Ad paused.') : t('Ad resumed.'))}
              className="btn-secondary min-h-[44px] flex-1 disabled:opacity-50 sm:flex-none"
            >
              {ad.is_active ? t('Pause') : t('Resume')}
            </button>
            <button
              type="button" disabled={busy} onClick={() => setConfirmDelete(true)}
              className="min-h-[44px] flex-1 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground-muted hover:border-danger/40 hover:text-danger disabled:opacity-50 sm:flex-none"
            >
              {t('Delete')}
            </button>
          </div>
        )}
      </div>

      {status === 'rejected' && ad.review_note && (
        <div className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-danger">{t('Bitwave rejected this ad')}</p>
          <p className="mt-1 text-sm text-foreground">{ad.review_note}</p>
          {!isAdmin && canManage && (
            <Link href={`/ads/${ad.id}/edit`} className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent-primary hover:underline">
              {t('Fix it and send again')} →
            </Link>
          )}
        </div>
      )}
      {status === 'pending' && (
        <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          {isAdmin ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">
                {t('Waiting for review. Check the phone number works before approving:')}{' '}
                <a href={`tel:${ad.phone_number.replace(/\s+/g, '')}`} className="font-semibold text-accent-primary hover:underline">{ad.phone_number}</a>
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="min-h-[44px] flex-1 rounded-[10px] border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50 sm:flex-none">
                  {t('Reject')}
                </button>
                <button type="button" disabled={busy} onClick={() => void run(() => api.reviewAd(ad.id, 'approve'), t('Approved. The ad is now live.'))} className="min-h-[44px] flex-1 rounded-[10px] bg-success px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:flex-none">
                  {t('Approve')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground">{t('Bitwave is checking this ad. It starts showing on your portal once it is approved.')}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          <AdPreview ad={adToForm(ad)} wifiName={wifiName} />
          <section className="rounded-2xl border border-border bg-background-secondary px-4">
            <dl className="divide-y divide-border">
              <Detail label={t('Call button dials')}>
                <a href={`tel:${ad.phone_number.replace(/\s+/g, '')}`} className="font-medium text-accent-primary hover:underline">{ad.phone_number}</a>
              </Detail>
              {ad.whatsapp_number && <Detail label={t('WhatsApp')}>{ad.whatsapp_number}</Detail>}
              {ad.seller_location && <Detail label={t('Location')}>{ad.seller_location}</Detail>}
              <Detail label={t('Shows on')}><span className="break-words">{routerNames}</span></Detail>
              <Detail label={t('Runs')}>
                {ad.starts_at ? formatDay(utcToGMT3DateOnly(ad.starts_at)) : t('Now')}
                {' → '}
                {lastDay ? formatDay(lastDay) : t('until stopped')}
              </Detail>
              {ad.created_at && <Detail label={t('Created')}>{formatDay(utcToGMT3DateOnly(ad.created_at))}</Detail>}
            </dl>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('Views'), value: formatCount(views), hint: t('Different phones per day') },
              { label: t('Taps'), value: formatCount(taps), hint: t('Mostly calls') },
              { label: t('Tap rate'), value: tapRate(taps, views), hint: t('Taps per view') },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-background-secondary p-3.5 sm:p-4">
                <p className="text-xs font-medium text-foreground-muted">{s.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-foreground sm:text-2xl">{s.value}</p>
                <p className="mt-0.5 hidden text-[11px] text-foreground-muted sm:block">{s.hint}</p>
              </div>
            ))}
          </div>
          <p className="-mt-2 text-xs text-foreground-muted">{t('Last 30 days. A phone that sees the ad several times in a day counts once.')}</p>

          <section className="rounded-2xl border border-border bg-background-secondary p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{t('Day by day')}</h2>
              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: VIEWS_COLOR }} />{t('Views')}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TAPS_COLOR }} />{t('Taps')}</span>
              </div>
            </div>
            {statsError ? (
              <p className="py-10 text-center text-sm text-foreground-muted">{t('Stats are not available right now.')}</p>
            ) : views === 0 && taps === 0 ? (
              <p className="py-10 text-center text-sm text-foreground-muted">
                {status === 'live' ? t('No views yet. They appear here as customers open your portal.') : t('No views yet. Views start once the ad is live.')}
              </p>
            ) : (
              <div className="h-56 sm:h-64" role="img" aria-label={t('Daily views and taps for the last 30 days')}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={days} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis yAxisId="v" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
                    <YAxis yAxisId="c" orientation="right" hide allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--background-tertiary)', opacity: 0.5 }} />
                    <Bar yAxisId="v" dataKey="impressions" fill={VIEWS_COLOR} radius={[3, 3, 0, 0]} maxBarSize={18} />
                    <Line yAxisId="c" dataKey="clicks" stroke={TAPS_COLOR} strokeWidth={2} dot={false} type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-background-secondary">
            <h2 className="border-b border-border px-4 py-3.5 text-base font-semibold text-foreground sm:px-5">{t('Where customers saw it')}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">{t('Place')}</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">{t('Views')}</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">{t('Taps')}</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell sm:px-5">{t('Tap rate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {placementRows.map((p) => {
                  const c = stats?.by_placement?.[p.key] ?? { impressions: 0, clicks: 0 };
                  return (
                    <tr key={p.key}>
                      <th scope="row" className="!bg-transparent px-4 py-3 text-left !text-sm font-normal !normal-case !tracking-normal sm:px-5">
                        <span className="block font-medium text-foreground">{t(p.label)}</span>
                        <span className="block text-xs text-foreground-muted">{t(p.hint)}</span>
                      </th>
                      <td className="px-2 py-3 text-right tabular-nums text-foreground">{formatCount(c.impressions)}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-foreground">{formatCount(c.clicks)}</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-foreground-muted sm:table-cell sm:px-5">{tapRate(c.clicks, c.impressions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ad.placement === 'hero' && ad.slot === 'house' && (
              <p className="border-t border-border px-4 py-3 text-xs text-foreground-muted sm:px-5">
                {t('Your own promos show at the top of the portal only. Paid ads also play on the M-Pesa wait screen and the “You’re online” page.')}
              </p>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void doDelete()}
        title={t('Delete this ad?')}
        message={t('“{title}” comes off every portal straight away. This can’t be undone.', { title: ad.title })}
        confirmLabel={t('Delete ad')}
        variant="danger"
        loading={busy}
      />
      <RejectAdDialog
        open={rejecting}
        adTitle={ad.title}
        loading={busy}
        onCancel={() => setRejecting(false)}
        onReject={(note) => void run(() => api.reviewAd(ad.id, 'reject', note), t('Ad rejected. The reseller will see your reason.'))}
      />
    </div>
  );
}
