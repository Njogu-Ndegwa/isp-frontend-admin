'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import type { Ad, Router } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useT } from '../lib/i18n';
import Header from '../components/Header';
import Tabs from '../components/Tabs';
import SearchInput from '../components/SearchInput';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageLoader } from '../components/LoadingSpinner';
import { AdStatusChip, AdThumb } from './components/AdBits';
import AdPreview from './components/AdPreview';
import RejectAdDialog from './components/RejectAdDialog';
import { adToForm, adDisplayStatus, formatCount, PLACEMENT_LABEL, slotLabel, STATUS_META, type AdDisplayStatus } from './adModel';
import { formatTimeSinceUTC } from '../lib/dateUtils';

type View = 'all' | 'review';
const STATUS_ORDER: AdDisplayStatus[] = ['live', 'pending', 'scheduled', 'paused', 'ended', 'rejected'];

const PlusIcon = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

function ownerLabel(ad: Ad, owners: Map<number, string>): string {
  if (ad.owner_user_id === null) return 'Bitwave';
  return owners.get(ad.owner_user_id) ?? `Reseller #${ad.owner_user_id}`;
}

function routerScope(ad: Ad, routers: Router[], isAdmin: boolean): string {
  if (!ad.router_ids || ad.router_ids.length === 0) {
    return ad.owner_user_id === null ? 'All routers' : isAdmin ? "All the reseller's routers" : 'All my routers';
  }
  if (ad.router_ids.length === 1) return routers.find((r) => r.id === ad.router_ids![0])?.name ?? '1 router';
  return `${ad.router_ids.length} routers`;
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const points = isAdmin
    ? [
        ['Sell space network-wide', 'Platform ads show on every Bitwave portal, or on the routers you pick.'],
        ['Review reseller ads', 'Resellers’ ads wait here until you approve them.'],
        ['Customers can call before they pay', 'Every hero ad gets a Call button, so it works with no internet.'],
      ]
    : [
        ['Promote yourself for free', 'Advertise your weekly packages, a new hotspot or your other business.'],
        ['Earn from local shops', 'Sell the space to a kiosk, salon or hotel near your hotspot.'],
        ['Customers can call before they pay', 'Every ad gets a green Call button that works with no internet.'],
      ];
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-background-secondary p-6 sm:p-10">
      <div className="grid items-center gap-8 md:grid-cols-[1fr_300px]">
        <div>
          <span className="badge badge-warning">{t('New')}</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {isAdmin ? t('No ads yet') : t('Put ads on your WiFi login page')}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {t('Everyone who connects to your WiFi sees the top of your portal. An ad there rotates with the photo and plays while customers wait for M-Pesa.')}
          </p>
          <ul className="mt-5 space-y-3">
            {points.map(([title, desc]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{t(title)}</span>
                  <span className="block text-foreground-muted">{t(desc)}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/ads/new" className="btn-primary mt-6 inline-flex min-h-[44px] items-center gap-2">
            {PlusIcon}
            {isAdmin ? t('Create a Bitwave ad') : t('Create your first ad')}
          </Link>
          {!isAdmin && (
            <p className="mt-3 text-xs text-foreground-muted">{t('Bitwave checks each ad before it goes live.')}</p>
          )}
        </div>
        <div className="hidden md:block" aria-hidden="true">
          <AdPreview
            compact
            wifiName={t('Your WiFi')}
            ad={{
              ...adToForm({
                id: 0, advertiser_id: null, title: 'Fresh chapati & beans', description: null, seller_name: "Mama Njeri's Kitchen",
                seller_location: null, phone_number: '0712 445 210', whatsapp_number: null, price: 'KSH 80', price_value: null,
                category: null, badge_type: null, badge_text: null, placement: 'hero', media_type: 'image',
                image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70&auto=format&fit=crop',
                video_url: null, poster_url: null, image_fit: 'cover', bg_color: '#7C2D12', slot: 'reseller',
                owner_user_id: 0, router_ids: null, status: 'approved', review_note: null, reviewed_at: null, is_active: true,
                priority: 0, starts_at: null, expires_at: null, created_at: null, views_count: 0, clicks_count: 0,
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background-secondary p-4">
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-foreground-muted">{hint}</p>}
    </div>
  );
}

export default function AdsClient() {
  const t = useT();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isAdmin = user?.role === 'admin';

  const [ads, setAds] = useState<Ad[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | AdDisplayStatus>('');
  const [placementFilter, setPlacementFilter] = useState<'' | 'hero' | 'local'>('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Ad | null>(null);
  const [rejecting, setRejecting] = useState<Ad | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [{ ads: list }, routerList] = await Promise.all([
        api.getAllManagedAds(),
        api.getRouters().catch(() => [] as Router[]),
      ]);
      setAds(list);
      setRouters(routerList);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('Could not load your ads.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  // Admins: name each reseller from the routers they own.
  const owners = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of routers) if (r.owner_user_id && r.owner_name) map.set(r.owner_user_id, r.owner_name);
    return map;
  }, [routers]);

  const withStatus = useMemo(() => ads.map((ad) => ({ ad, status: adDisplayStatus(ad, now) })), [ads, now]);
  const pending = useMemo(
    () => withStatus.filter((x) => x.status === 'pending')
      .sort((a, b) => String(a.ad.created_at).localeCompare(String(b.ad.created_at))),
    [withStatus],
  );

  const ownerOptions = useMemo(() => {
    const ids = Array.from(new Set(ads.map((a) => a.owner_user_id).filter((x): x is number => x !== null)));
    return ids
      .map((id) => ({ value: String(id), label: owners.get(id) ?? `Reseller #${id}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [ads, owners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter(({ ad, status }) => {
      if (statusFilter && status !== statusFilter) return false;
      if (placementFilter && ad.placement !== placementFilter) return false;
      if (ownerFilter === 'bitwave' && ad.owner_user_id !== null) return false;
      if (ownerFilter === 'resellers' && ad.owner_user_id === null) return false;
      if (ownerFilter && !['bitwave', 'resellers'].includes(ownerFilter) && String(ad.owner_user_id) !== ownerFilter) return false;
      if (q && ![ad.title, ad.seller_name, ad.phone_number, ad.seller_location].some((v) => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [withStatus, search, statusFilter, placementFilter, ownerFilter]);

  const totals = useMemo(() => ({
    live: withStatus.filter((x) => x.status === 'live').length,
    views: ads.reduce((s, a) => s + (a.views_count || 0), 0),
    taps: ads.reduce((s, a) => s + (a.clicks_count || 0), 0),
  }), [ads, withStatus]);

  const replace = (updated: Ad) => setAds((list) => list.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));

  const togglePause = async (ad: Ad) => {
    setBusyId(ad.id);
    try {
      const updated = await api.updateAd(ad.id, { is_active: !ad.is_active });
      replace(updated);
      showAlert('success', updated.is_active ? t('Ad resumed.') : t('Ad paused. It no longer shows on portals.'));
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not update the ad.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api.deleteAd(deleting.id);
      setAds((list) => list.filter((a) => a.id !== deleting.id));
      showAlert('success', t('Ad deleted.'));
      setDeleting(null);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not delete the ad.'));
    } finally {
      setBusyId(null);
    }
  };

  const review = async (ad: Ad, action: 'approve' | 'reject', note?: string) => {
    setBusyId(ad.id);
    try {
      const updated = await api.reviewAd(ad.id, action, note);
      replace(updated);
      showAlert('success', action === 'approve' ? t('Approved. The ad is now live.') : t('Ad rejected. The reseller will see your reason.'));
      setRejecting(null);
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save the review.'));
    } finally {
      setBusyId(null);
    }
  };

  const newButton = (
    <Link href="/ads/new" className="btn-primary inline-flex min-h-[44px] items-center gap-2">
      {PlusIcon}
      {t('New ad')}
    </Link>
  );

  if (loading) return <PageLoader />;

  if (loadError) {
    return (
      <div>
        <Header title={t('Ads')} />
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-background-secondary p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">{t('Could not load your ads')}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{loadError}</p>
          <button onClick={() => void load()} className="btn-primary mt-4 min-h-[44px]">{t('Try again')}</button>
        </div>
      </div>
    );
  }

  const subtitle = isAdmin
    ? t('Every ad on Bitwave portals, and the reseller ads waiting for review')
    : t('Ads on your WiFi login page: your own promos and ads you sell');

  const filtersActive = !!(search || statusFilter || placementFilter || ownerFilter);
  const selectCls = 'input !py-2.5 min-h-[44px] sm:!w-auto';

  return (
    <div className="pb-6">
      <Header title={t('Ads')} subtitle={subtitle} action={ads.length > 0 ? newButton : undefined} />

      {ads.length === 0 ? (
        <EmptyState isAdmin={isAdmin} />
      ) : (
        <>
          <div className="mb-4 md:hidden">
            <Link href="/ads/new" className="btn-primary flex min-h-[44px] w-full items-center justify-center gap-2">
              {PlusIcon}
              {t('New ad')}
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t('Live now')} value={String(totals.live)} hint={t('{n} ads in total', { n: ads.length })} />
            <StatTile label={t('Waiting for review')} value={String(pending.length)} hint={isAdmin ? t('Oldest first in Review') : t('Bitwave checks each ad')} />
            <StatTile label={t('Views')} value={formatCount(totals.views)} hint={t('Phones that saw an ad, last 30 days')} />
            <StatTile label={t('Taps')} value={formatCount(totals.taps)} hint={t('Calls and other taps, last 30 days')} />
          </div>

          {isAdmin && (
            <Tabs<View>
              className="mb-5"
              value={view}
              onChange={setView}
              ariaLabel={t('Ads view')}
              tabs={[
                { value: 'all', label: t('All ads'), count: ads.length },
                { value: 'review', label: t('Review'), count: pending.length },
              ]}
            />
          )}

          {isAdmin && view === 'review' ? (
            pending.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background-secondary p-10 text-center">
                <p className="text-base font-semibold text-foreground">{t('Nothing to review')}</p>
                <p className="mt-1 text-sm text-foreground-muted">{t('New and edited reseller ads show up here.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map(({ ad }) => (
                  <article key={ad.id} className="grid gap-5 rounded-2xl border border-border bg-background-secondary p-4 sm:p-5 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <AdPreview compact ad={adToForm(ad)} wifiName={owners.get(ad.owner_user_id ?? -1) ?? t('WiFi name')} />
                    <div className="flex min-w-0 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdStatusChip status="pending" />
                        <span className="badge badge-neutral">{t(slotLabel(ad.slot))}</span>
                        <span className="badge badge-neutral">{t(PLACEMENT_LABEL[ad.placement])}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">
                        <Link href={`/ads/${ad.id}`} className="hover:underline">{ad.title}</Link>
                      </h3>
                      <p className="text-sm text-foreground-muted">
                        {ad.seller_name}{ad.price ? ` · ${ad.price}` : ''}
                      </p>
                      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs text-foreground-muted">{t('Reseller')}</dt><dd className="text-foreground">{ownerLabel(ad, owners)}</dd></div>
                        <div>
                          <dt className="text-xs text-foreground-muted">{t('Call button dials')}</dt>
                          <dd><a href={`tel:${ad.phone_number.replace(/\s+/g, '')}`} className="font-medium text-accent-primary hover:underline">{ad.phone_number}</a></dd>
                        </div>
                        <div><dt className="text-xs text-foreground-muted">{t('Shows on')}</dt><dd className="text-foreground">{t(routerScope(ad, routers, true))}</dd></div>
                        <div><dt className="text-xs text-foreground-muted">{t('Sent')}</dt><dd className="text-foreground">{formatTimeSinceUTC(ad.created_at) ?? '–'}</dd></div>
                        {ad.description && (
                          <div className="sm:col-span-2"><dt className="text-xs text-foreground-muted">{t('Description')}</dt><dd className="text-foreground">{ad.description}</dd></div>
                        )}
                      </dl>
                      <div className="mt-5 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:justify-end sm:pt-5">
                        <button
                          type="button" disabled={busyId === ad.id} onClick={() => setRejecting(ad)}
                          className="min-h-[44px] rounded-[10px] border border-danger/40 px-5 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          {t('Reject')}
                        </button>
                        <button
                          type="button" disabled={busyId === ad.id} onClick={() => void review(ad, 'approve')}
                          className="min-h-[44px] rounded-[10px] bg-success px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === ad.id ? t('Saving…') : t('Approve')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder={t('Search ads')} className="sm:min-w-[220px] sm:flex-1" />
                <select aria-label={t('Status')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AdDisplayStatus | '')} className={selectCls}>
                  <option value="">{t('Any status')}</option>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{t(STATUS_META[s].label)}</option>)}
                </select>
                <select aria-label={t('Placement')} value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value as '' | 'hero' | 'local')} className={selectCls}>
                  <option value="">{t('Anywhere')}</option>
                  <option value="hero">{t('Top of portal')}</option>
                  <option value="local">{t('Shops row')}</option>
                </select>
                {isAdmin && (
                  <select aria-label={t('Owner')} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={selectCls}>
                    <option value="">{t('Any owner')}</option>
                    <option value="bitwave">Bitwave</option>
                    <option value="resellers">{t('All resellers')}</option>
                    {ownerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background-secondary p-10 text-center">
                  <p className="text-base font-semibold text-foreground">{t('No ads match')}</p>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setStatusFilter(''); setPlacementFilter(''); setOwnerFilter(''); }}
                      className="mt-3 min-h-[44px] text-sm font-medium text-accent-primary hover:underline"
                    >
                      {t('Clear filters')}
                    </button>
                  )}
                </div>
              ) : (
                <ul className="grid gap-3 xl:grid-cols-2">
                  {filtered.map(({ ad, status }) => (
                    <li key={ad.id} className="rounded-2xl border border-border bg-background-secondary p-3.5 transition-colors hover:border-foreground-muted/40 sm:p-4">
                      <div className="flex gap-3.5">
                        <Link href={`/ads/${ad.id}`} className="flex-shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary" aria-label={t('Open {title}', { title: ad.title })} tabIndex={-1}>
                          <AdThumb ad={ad} className="h-[72px] w-[72px] sm:h-24 sm:w-24" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/ads/${ad.id}`} className="min-w-0 hover:underline">
                              <h3 className="truncate text-[15px] font-semibold text-foreground">{ad.title}</h3>
                            </Link>
                            <AdStatusChip status={status} />
                          </div>
                          <p className="truncate text-sm text-foreground-muted">
                            {ad.seller_name}
                            {isAdmin && <> · <span className="text-foreground">{ownerLabel(ad, owners)}</span></>}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-muted">
                            <span>{t(PLACEMENT_LABEL[ad.placement])}</span>
                            <span aria-hidden="true">·</span>
                            <span>{t(slotLabel(ad.slot))}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums"><strong className="font-semibold text-foreground">{formatCount(ad.views_count)}</strong> {t('views')}</span>
                            <span className="tabular-nums"><strong className="font-semibold text-foreground">{formatCount(ad.clicks_count)}</strong> {t('taps')}</span>
                          </p>
                        </div>
                      </div>

                      {status === 'rejected' && ad.review_note && (
                        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-foreground">
                          <span className="font-semibold text-danger">{t('Why:')} </span>{ad.review_note}
                        </p>
                      )}
                      {status === 'pending' && !isAdmin && (
                        <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-xs text-foreground-muted">
                          {t('Bitwave is checking this ad. It starts showing once approved.')}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2.5">
                        <Link href={`/ads/${ad.id}/edit`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-background-tertiary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                          {t('Edit')}
                        </Link>
                        <button
                          type="button" disabled={busyId === ad.id} onClick={() => void togglePause(ad)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-background-tertiary disabled:opacity-50"
                        >
                          {ad.is_active ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                          )}
                          {ad.is_active ? t('Pause') : t('Resume')}
                        </button>
                        <Link href={`/ads/${ad.id}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-background-tertiary">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                          {t('Stats')}
                        </Link>
                        <button
                          type="button" disabled={busyId === ad.id} onClick={() => setDeleting(ad)}
                          className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          {t('Delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t('Delete this ad?')}
        message={deleting ? t('“{title}” comes off every portal straight away. This can’t be undone.', { title: deleting.title }) : ''}
        confirmLabel={t('Delete ad')}
        variant="danger"
        loading={busyId === deleting?.id}
      />
      <RejectAdDialog
        open={!!rejecting}
        adTitle={rejecting?.title ?? ''}
        loading={busyId === rejecting?.id}
        onCancel={() => setRejecting(null)}
        onReject={(note) => rejecting && void review(rejecting, 'reject', note)}
      />
    </div>
  );
}
