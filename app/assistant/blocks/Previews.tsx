'use client';

/*
 * Previews of what customers will see, built from the dashboard's own preview
 * components: the hotspot login page (PortalPreview) and an ad (AdPreview).
 * Used under a form while it is being filled in (the preview follows every
 * change), after it is confirmed, and for a read of the portal settings or ads.
 */
import { useEffect, useState } from 'react';
import AdPreview, { type AdPreviewData } from '../../ads/components/AdPreview';
import PortalPreview, { type PreviewPlan } from '../../components/PortalPreview';
import { api } from '../../lib/api';
import { planDuration } from '../../lib/assistantEntities';
import type { Row } from '../../lib/assistantView';
import { getThemePalette } from '../../lib/portalThemes';
import type { PortalSettings } from '../../lib/types';

type Values = Record<string, unknown>;

/** Which preview a form or a record wants, from its own fields. */
export function previewKind(names: Iterable<string>): 'portal' | 'ad' | null {
  const has = new Set(names);
  if (has.has('color_theme') || has.has('header_style') || has.has('show_announcement')) return 'portal';
  if (has.has('title') && (has.has('media_type') || has.has('image_url') || has.has('video_url'))) return 'ad';
  return null;
}

const PORTAL_DEFAULTS: Partial<PortalSettings> = {
  color_theme: 'ocean_blue' as PortalSettings['color_theme'], header_style: 'standard' as PortalSettings['header_style'],
  show_ads: true, show_welcome_banner: false, show_ratings: false, show_reconnect_button: true,
  show_social_links: false, show_announcement: false, show_plan_speed: true,
  announcement_type: 'info' as PortalSettings['announcement_type'], portal_language: 'en' as PortalSettings['portal_language'],
};

const truthy = (v: unknown) => v === true || v === 'true';
const text = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** Form values (strings from inputs) as portal settings: switches as booleans, blanks left to the record. */
function asPortal(values: Values): Partial<PortalSettings> {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined || v === null) continue;
    out[k] = typeof v === 'boolean' || v === 'true' || v === 'false' ? truthy(v) : v;
  }
  return out as Partial<PortalSettings>;
}

let plansOnce: Promise<PreviewPlan[]> | null = null;
function realPlans(): Promise<PreviewPlan[]> {
  plansOnce ??= api.getPlans().then((plans) => plans
    .filter((p) => !p.is_hidden && p.plan_type !== 'emergency' && (p.connection_type ?? 'hotspot') === 'hotspot')
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, free: Number(p.price) === 0,
                   duration: planDuration(p as unknown as Row).toUpperCase(), speed: String(p.speed ?? ''), popular: false })))
    .catch(() => []);
  return plansOnce;
}

/** The hotspot login page as customers will see it, from saved settings plus the values on the form. */
export function PortalPreviewBlock({ values, saved }: { values: Values; saved?: Values | null }) {
  const [plans, setPlans] = useState<PreviewPlan[]>([]);
  useEffect(() => { let on = true; realPlans().then((p) => { if (on) setPlans(p); }); return () => { on = false; }; }, []);
  const settings = { ...PORTAL_DEFAULTS, ...asPortal(saved ?? {}), ...asPortal(values) } as PortalSettings;
  return (
    <figure className="m-0 mt-4">
      <figcaption className="ai-eyebrow mb-2">What customers see</figcaption>
      <div className="mx-auto max-w-[300px] overflow-hidden rounded-[22px] border border-line">
        <PortalPreview settings={settings} palette={getThemePalette(settings.color_theme)} plans={plans} />
      </div>
    </figure>
  );
}

/** One ad as customers will see it. */
export function AdPreviewBlock({ values, wifiName }: { values: Values; wifiName?: string }) {
  const ad: AdPreviewData = {
    placement: (text(values.placement) || 'local') as AdPreviewData['placement'],
    slot: (text(values.slot) || 'house') as AdPreviewData['slot'],
    media_type: (text(values.media_type) || 'image') as AdPreviewData['media_type'],
    image_url: text(values.image_url), video_url: text(values.video_url), poster_url: text(values.poster_url),
    image_fit: (text(values.image_fit) || 'cover') as AdPreviewData['image_fit'], bg_color: text(values.bg_color),
    seller_name: text(values.seller_name || values.business_name), title: text(values.title),
    price: text(values.price), description: text(values.description), seller_location: text(values.seller_location),
    phone_number: text(values.phone_number || values.business_phone), whatsapp_number: text(values.whatsapp_number),
  };
  return (
    <figure className="m-0 mt-4">
      <figcaption className="ai-eyebrow mb-2">What customers see</figcaption>
      <div className="mx-auto max-w-[320px]">
        <AdPreview ad={ad} wifiName={wifiName || 'Your WiFi'} compact />
      </div>
    </figure>
  );
}

/** A form's or a record's preview, when it has one. */
export function PreviewFor({ values, saved }: { values: Values; saved?: Values | null }) {
  const kind = previewKind([...Object.keys(values), ...Object.keys(saved ?? {})]);
  if (kind === 'portal') return <PortalPreviewBlock values={values} saved={saved} />;
  if (kind === 'ad') return <AdPreviewBlock values={{ ...(saved ?? {}), ...values }} />;
  return null;
}
