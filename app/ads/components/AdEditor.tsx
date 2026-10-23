'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { Ad, Advertiser, AdPlacement, AdSlot, Router } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useT } from '../../lib/i18n';
import Header from '../../components/Header';
import AdPreview from './AdPreview';
import AdRouterPicker from './AdRouterPicker';
import MediaUploadField from './MediaUploadField';
import {
  adToForm,
  changesNeedReview,
  diffInput,
  emptyAdForm,
  formToInput,
  validateAdForm,
  type AdFormErrors,
  type AdFormState,
} from '../adModel';

const SWATCHES = ['#0F172A', '#14532D', '#7C2D12', '#1E3A8A', '#581C87', '#FFFFFF'];

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background-secondary">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-foreground-muted">{desc}</p>}
      </div>
      <div className="space-y-5 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({
  id, label, hint, error, required, children, counter,
}: {
  id: string; label: string; hint?: React.ReactNode; error?: string; required?: boolean;
  children: React.ReactNode; counter?: string;
}) {
  return (
    <div data-field={id}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
        {counter && <span className="text-[11px] tabular-nums text-foreground-muted">{counter}</span>}
      </div>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-foreground-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

function Choice({
  name, checked, onSelect, title, desc, icon,
}: {
  name: string; checked: boolean; onSelect: () => void; title: string; desc: string; icon?: React.ReactNode;
}) {
  return (
    <label
      className={`relative flex min-h-[44px] flex-1 cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-accent-primary ${
        checked ? 'border-accent-primary bg-accent-primary/10' : 'border-border hover:border-foreground-muted'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {icon && <span className={`mt-0.5 flex-shrink-0 ${checked ? 'text-accent-primary' : 'text-foreground-muted'}`}>{icon}</span>}
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${checked ? 'text-accent-primary' : 'text-foreground'}`}>{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-foreground-muted">{desc}</span>
      </span>
      <span
        className={`absolute right-3 top-3 h-4 w-4 rounded-full border-2 ${checked ? 'border-accent-primary bg-accent-primary shadow-[inset_0_0_0_2px_var(--background-secondary)]' : 'border-border'}`}
        aria-hidden="true"
      />
    </label>
  );
}

const HeroIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
    <rect x="6" y="2.5" width="12" height="19" rx="2" /><rect x="7.5" y="4.5" width="9" height="6" rx="0.5" fill="currentColor" opacity="0.35" />
  </svg>
);
const ShopsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
    <rect x="6" y="2.5" width="12" height="19" rx="2" /><rect x="7.5" y="13" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.35" /><rect x="12.5" y="13" width="4" height="5" rx="0.5" fill="currentColor" opacity="0.35" />
  </svg>
);

export default function AdEditor({ ad }: { ad?: Ad }) {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const isAdmin = user?.role === 'admin';
  const isEdit = !!ad;
  // A Bitwave ad (owner null). An admin editing a reseller's ad keeps its slot.
  const platform = ad ? ad.owner_user_id === null : isAdmin;
  const businessName = user?.business_name || user?.organization_name || '';
  const isDesktop = useIsDesktop();

  const initial = useMemo(() => (ad ? adToForm(ad) : emptyAdForm(isAdmin, businessName)), [ad, isAdmin, businessName]);
  const [form, setForm] = useState<AdFormState>(initial);
  const [errors, setErrors] = useState<AdFormErrors>({});
  const [routers, setRouters] = useState<Router[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [uploadsOff, setUploadsOff] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getRouters().then(setRouters).catch(() => setRouters([]));
    if (isAdmin && platform) {
      api.getAdvertisers().then(setAdvertisers).catch(() => setAdvertisers([]));
    }
  }, [isAdmin, platform]);

  const set = <K extends keyof AdFormState>(key: K, value: AdFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Own promo prefills the reseller's business; switching to a sold ad clears it.
  const pickSlot = (slot: AdSlot) => {
    setForm((f) => {
      let seller = f.seller_name;
      if (slot === 'reseller' && seller === businessName) seller = '';
      if (slot === 'house' && !seller) seller = businessName;
      return { ...f, slot, seller_name: seller };
    });
  };

  const diff = useMemo(() => {
    if (!ad) return null;
    // advertiser_id is only in the body for Bitwave ads (formToInput), which
    // is exactly when PUT accepts it.
    return diffInput(formToInput(initial, platform), formToInput(form, platform));
  }, [ad, initial, form, platform]);

  const willNeedReview = !isAdmin && (!isEdit || (diff !== null && changesNeedReview(diff) && ad?.status !== 'pending'));
  const wifiName = isAdmin ? t('WiFi name') : (businessName || t('Your WiFi'));
  const isVideo = form.media_type === 'video';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateAdForm(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      const el = document.querySelector(`[data-field="ad-${first}"]`) ?? document.getElementById(`ad-${first}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (document.getElementById(`ad-${first}`) as HTMLElement | null)?.focus({ preventScroll: true });
      return;
    }
    setSaving(true);
    try {
      if (ad) {
        if (!diff || Object.keys(diff).length === 0) {
          showAlert('info', t('Nothing changed.'));
          router.push(`/ads/${ad.id}`);
          return;
        }
        await api.updateAd(ad.id, diff);
        showAlert('success', willNeedReview ? t('Saved. Sent to Bitwave for review.') : t('Ad saved.'));
        router.push(`/ads/${ad.id}`);
      } else {
        const created = await api.createAd(formToInput(form, platform));
        showAlert('success', isAdmin ? t('Ad published.') : t('Ad sent to Bitwave for review.'));
        router.push(`/ads/${created.id}`);
      }
    } catch (err) {
      showAlert('error', err instanceof Error ? err.message : t('Could not save the ad.'));
    } finally {
      setSaving(false);
    }
  };

  const preview = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('What customers see')}</h2>
        {form.placement === 'hero' && (
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-foreground-muted">
            <input type="checkbox" checked={showSafeArea} onChange={(e) => setShowSafeArea(e.target.checked)} className="h-4 w-4 accent-amber-500" />
            {t('Show covered areas')}
          </label>
        )}
      </div>
      <AdPreview ad={form} wifiName={wifiName} showSafeArea={showSafeArea} />
      <p className="text-center text-xs text-foreground-muted">
        {form.placement === 'hero'
          ? (form.slot === 'house'
            ? t('Rotates in the photo at the top of your login page, with up to 2 other ads.')
            : t('Rotates at the top of the login page, and plays while customers wait for M-Pesa.'))
          : t('Shows in the shops row once the customer has paid and is online.')}
      </p>
    </div>
  );

  const nameLabel = form.slot === 'house' ? t('Your business name') : t('Advertiser name');
  const inputCls = (key: keyof AdFormState) => `input ${errors[key] ? '!border-danger' : ''}`;
  const aria = (key: keyof AdFormState, hasHint = false) => ({
    id: `ad-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': [hasHint ? `ad-${key}-hint` : '', errors[key] ? `ad-${key}-error` : ''].filter(Boolean).join(' ') || undefined,
  });

  return (
    <div>
      <Header
        title={isEdit ? t('Edit ad') : t('New ad')}
        subtitle={isEdit ? ad?.title : (isAdmin ? t('A Bitwave ad. It goes live as soon as you publish it.') : t('Put your offer in front of everyone who connects to your WiFi'))}
        backHref={isEdit ? `/ads/${ad?.id}` : '/ads'}
      />

      {ad?.status === 'rejected' && ad.review_note && (
        <div className="mb-5 rounded-2xl border border-danger/30 bg-danger/10 p-4" role="note">
          <p className="text-sm font-semibold text-danger">{t('Bitwave rejected this ad')}</p>
          <p className="mt-1 text-sm text-foreground">{ad.review_note}</p>
          <p className="mt-1 text-xs text-foreground-muted">{t('Fix it below and save. It goes back to Bitwave for review.')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" autoComplete="off">
        <div className="min-w-0 space-y-5">
          <Section title={t('Where should it show?')}>
            <fieldset>
              <legend className="sr-only">{t('Placement')}</legend>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Choice
                  name="placement" checked={form.placement === 'hero'} onSelect={() => set('placement', 'hero' as AdPlacement)}
                  icon={HeroIcon}
                  title={t('Top of the portal')}
                  desc={t('The big photo at the top of the login page. Seen by everyone before they buy.')}
                />
                <Choice
                  name="placement" checked={form.placement === 'local'} onSelect={() => set('placement', 'local' as AdPlacement)}
                  icon={ShopsIcon}
                  title={t('Shops row')}
                  desc={t('A small card customers see after they pay and are online.')}
                />
              </div>
            </fieldset>

            {!platform ? (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">{t('Whose ad is it?')}</legend>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Choice
                    name="slot" checked={form.slot === 'house'} onSelect={() => pickSlot('house')}
                    title={isAdmin ? t("Reseller's own promo") : t('My own promo')}
                    desc={t('Free. Promote your WiFi packages or your own business.')}
                  />
                  <Choice
                    name="slot" checked={form.slot === 'reseller'} onSelect={() => pickSlot('reseller')}
                    title={isAdmin ? t('Sold by the reseller') : t('An ad I sold')}
                    desc={t('For a shop or business near your hotspot that pays you to advertise.')}
                  />
                </div>
              </fieldset>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl bg-background-tertiary/60 p-3 text-xs text-foreground-muted">
                  <span className="badge badge-info flex-shrink-0">{t('Bitwave ad')}</span>
                  <span>{t('Platform ads go live as soon as you save and show before resellers’ own ads.')}</span>
                </div>
                {isAdmin && (
                  <Field id="ad-advertiser_id" label={t('Advertiser (optional)')} hint={<>{t('Who paid for this ad.')} <Link href="/advertisers" className="text-accent-primary hover:underline">{t('Manage advertisers')}</Link></>}>
                    <select
                      {...aria('advertiser_id', true)}
                      value={form.advertiser_id ?? ''}
                      onChange={(e) => set('advertiser_id', e.target.value ? Number(e.target.value) : null)}
                      className="input"
                    >
                      <option value="">{t('No advertiser')}</option>
                      {advertisers.map((a) => (
                        <option key={a.id} value={a.id}>{a.business_name ? `${a.business_name} (${a.name})` : a.name}</option>
                      ))}
                      {form.advertiser_id !== null && !advertisers.some((a) => a.id === form.advertiser_id) && (
                        <option value={form.advertiser_id}>{t('Advertiser #{id}', { id: form.advertiser_id })}</option>
                      )}
                    </select>
                  </Field>
                )}
              </div>
            )}
          </Section>

          <Section title={t('Photo or video')} desc={t('Wide pictures work best. The portal crops to roughly 3 by 2.')}>
            <div className="inline-flex rounded-xl bg-background-tertiary p-1" role="radiogroup" aria-label={t('Media type')}>
              {(['image', 'video'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={form.media_type === m}
                  onClick={() => set('media_type', m)}
                  className={`min-h-[40px] rounded-lg px-5 text-sm font-semibold transition-colors ${
                    form.media_type === m ? 'bg-accent-primary text-[#1c1917]' : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {m === 'image' ? t('Photo') : t('Video')}
                </button>
              ))}
            </div>

            {isVideo ? (
              <>
                <MediaUploadField
                  kind="video" inputId="ad-video_url" label={t('Video')} required
                  value={form.video_url} onChange={(u) => set('video_url', u)} error={errors.video_url}
                  uploadsOff={uploadsOff} onUploadsOff={() => setUploadsOff(true)}
                />
                <MediaUploadField
                  kind="image" inputId="ad-poster_url" label={t('Cover photo')}
                  hint={t('Shows while the video loads, and on phones that don’t play video. Use a frame from the video.')}
                  value={form.poster_url} onChange={(u) => set('poster_url', u)}
                  uploadsOff={uploadsOff} onUploadsOff={() => setUploadsOff(true)}
                />
              </>
            ) : (
              <MediaUploadField
                kind="image" inputId="ad-image_url" label={t('Photo')} required
                value={form.image_url} onChange={(u) => set('image_url', u)} error={errors.image_url}
                uploadsOff={uploadsOff} onUploadsOff={() => setUploadsOff(true)}
              />
            )}

            {!isVideo && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">{t('How the photo sits')}</legend>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Choice
                    name="fit" checked={form.image_fit === 'cover'} onSelect={() => set('image_fit', 'cover')}
                    title={t('Photo fills the frame')}
                    desc={t('For a photo of your shop, food or people. The bar at the bottom shows your offer.')}
                  />
                  <Choice
                    name="fit" checked={form.image_fit === 'contain'} onSelect={() => set('image_fit', 'contain')}
                    title={t('Product cut-out')}
                    desc={t('For one product on a plain background. Your headline and price show big beside it.')}
                  />
                </div>
              </fieldset>
            )}

            <Field
              id="ad-bg_color" label={t('Background colour')} error={errors.bg_color}
              hint={isVideo ? t('Shows behind the video while it loads.') : t('Shows behind a cut-out product, or while the photo loads.')}
            >
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('bg_color', c)}
                    aria-label={t('Use colour {c}', { c })}
                    aria-pressed={form.bg_color.toUpperCase() === c}
                    className={`h-11 w-11 rounded-xl border-2 transition-transform ${
                      form.bg_color.toUpperCase() === c ? 'scale-105 border-accent-primary' : 'border-border'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(form.bg_color) ? form.bg_color : '#14532d'}
                  onChange={(e) => set('bg_color', e.target.value.toUpperCase())}
                  className="h-11 w-11 cursor-pointer rounded-xl border-2 border-border bg-transparent p-0.5"
                  aria-label={t('Pick any colour')}
                />
                <input
                  {...aria('bg_color', true)}
                  value={form.bg_color}
                  onChange={(e) => set('bg_color', e.target.value)}
                  className={`${inputCls('bg_color')} !w-28 font-mono uppercase`}
                  maxLength={7}
                />
              </div>
            </Field>

            <div className="rounded-xl border border-accent-primary/25 bg-accent-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">{t('Tips for an ad that works')}</p>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-foreground-muted">
                <li>• {t('Put the offer first: “Chapati KSH 20” beats a logo.')}</li>
                <li>• {t('Keep any words in the middle of the picture. The WiFi name covers the top fifth and the Call bar covers the bottom third.')}</li>
                {isVideo ? (
                  <>
                    <li>• {t('Keep videos to 15 seconds or less, and show the offer in the first 2 seconds.')}</li>
                    <li>• {t('Assume no sound: videos play muted.')}</li>
                  </>
                ) : (
                  <li>• {t('Use a bright, sharp photo. Phones show it small.')}</li>
                )}
              </ul>
            </div>
          </Section>

          {!isDesktop && (
            <section className="rounded-2xl border border-border bg-background-secondary p-4">{preview}</section>
          )}

          <Section title={t('What does it say?')}>
            <Field id="ad-seller_name" label={nameLabel} required error={errors.seller_name} hint={t('Shown in bold next to the AD tag.')} counter={`${form.seller_name.length}/100`}>
              <input
                {...aria('seller_name', true)} className={inputCls('seller_name')} maxLength={100}
                value={form.seller_name} onChange={(e) => set('seller_name', e.target.value)}
                placeholder={form.slot === 'house' ? t('e.g. Kilimani WiFi') : t("e.g. Mama Njeri's Kitchen")}
              />
            </Field>
            <Field id="ad-title" label={t('Headline')} required error={errors.title} hint={t('What you are offering. Short is better: about 30 letters fit on one line.')} counter={`${form.title.length}/150`}>
              <input
                {...aria('title', true)} className={inputCls('title')} maxLength={150}
                value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder={t('e.g. Fresh chapati & beans')}
              />
            </Field>
            <Field id="ad-price" label={t('Offer or price (optional)')} hint={t('e.g. KSH 80 a plate, or 2 for 1 on Fridays')} counter={`${form.price.length}/50`}>
              <input {...aria('price', true)} className="input" maxLength={50} value={form.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="ad-seller_location" label={t('Location (optional)')} hint={t('So people can find them.')}>
                <input {...aria('seller_location', true)} className="input" maxLength={200} value={form.seller_location} onChange={(e) => set('seller_location', e.target.value)} placeholder={t('e.g. Next to the matatu stage')} />
              </Field>
              <Field id="ad-description" label={t('Short description (optional)')} hint={t('Used in the shops row and beside a cut-out product.')}>
                <input {...aria('description', true)} className="input" maxLength={500} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title={t('How do customers reach them?')}>
            <Field
              id="ad-phone_number" label={t('Phone number')} required error={errors.phone_number}
              hint={t('This is what the green Call button dials. Customers haven’t paid yet, so they have no internet: a phone call is the only way they can reach you from the login page.')}
            >
              <input
                {...aria('phone_number', true)} type="tel" inputMode="tel" className={`${inputCls('phone_number')} text-base`}
                value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder={t('e.g. 0712 345 678')} maxLength={16}
              />
            </Field>
            <Field id="ad-whatsapp_number" label={t('WhatsApp (optional)')} error={errors.whatsapp_number} hint={t('Only shown after the customer has paid and is online.')}>
              <input
                {...aria('whatsapp_number', true)} type="tel" inputMode="tel" className={inputCls('whatsapp_number')}
                value={form.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} placeholder={t('e.g. 0712 345 678')} maxLength={16}
              />
            </Field>
          </Section>

          <Section title={t('Where and when')}>
            <div data-field="ad-router_ids" id="ad-router_ids" tabIndex={-1}>
              <AdRouterPicker routers={routers} value={form.router_ids} onChange={(v) => set('router_ids', v)} isAdmin={isAdmin && platform} error={errors.router_ids} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="ad-start_date" label={t('Start (optional)')} hint={t('Empty = start as soon as it is approved.')}>
                <input {...aria('start_date', true)} type="date" className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </Field>
              <Field id="ad-last_day" label={t('Last day (optional)')} error={errors.last_day} hint={t('Empty = runs until you pause or delete it.')}>
                <input {...aria('last_day', true)} type="date" className={inputCls('last_day')} min={form.start_date || undefined} value={form.last_day} onChange={(e) => set('last_day', e.target.value)} />
              </Field>
            </div>
          </Section>

          <div className="space-y-3 pb-6">
            {willNeedReview && (
              <div className="flex gap-3 rounded-xl border border-info/30 bg-info/10 p-4" role="note">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">{isEdit ? t('These changes go to Bitwave for review') : t('Bitwave checks every ad first')}</p>
                  <p className="mt-0.5 text-foreground-muted">
                    {isEdit && ad?.status === 'approved'
                      ? t('The ad stops showing until Bitwave approves it again. Pausing, dates and routers don’t need a review.')
                      : t('Your ad shows as “Pending review” and starts on your portal once it is approved.')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link href={isEdit ? `/ads/${ad?.id}` : '/ads'} className="btn-secondary flex min-h-[44px] items-center justify-center">
                {t('Cancel')}
              </Link>
              <button type="submit" disabled={saving} className="btn-primary flex min-h-[44px] items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden="true" />}
                {isEdit
                  ? (willNeedReview ? t('Save and send for review') : t('Save changes'))
                  : (isAdmin ? t('Publish ad') : t('Send for review'))}
              </button>
            </div>
          </div>
        </div>

        {isDesktop && (
          <aside className="sticky top-6 rounded-2xl border border-border bg-background-secondary p-5">
            {preview}
          </aside>
        )}
      </form>
    </div>
  );
}
