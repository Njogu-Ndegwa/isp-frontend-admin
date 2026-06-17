'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import type { PublicPortalResponse, ShareSubscriptionRequest, ShareSubscriptionResponse } from '../../../lib/types';
import { getThemePalette, type PortalColorTheme } from '../../../lib/portalThemes';

type DeviceTypeValue = NonNullable<ShareSubscriptionRequest['device_type']>;

const DEVICE_TYPES: Array<{ value: DeviceTypeValue; label: string }> = [
  { value: 'tv', label: 'TV' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'console', label: 'Console' },
  { value: 'iot', label: 'Smart device' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  owner_phone: '',
  owner_mac: '',
  device_mac: '',
  device_name: '',
  device_type: 'tv' as DeviceTypeValue,
};

function formatExpiry(value?: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function RouterSharePage() {
  const params = useParams();
  const identity = normalizeParam(params.identity);
  const [portal, setPortal] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ShareSubscriptionResponse | null>(null);

  useEffect(() => {
    if (!identity) {
      setLoadError('Router link is missing an identity.');
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadError(null);
    api.getPublicPortal(identity)
      .then((data) => {
        if (!mounted) return;
        setPortal(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load this router.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [identity]);

  const palette = useMemo(() => {
    const theme = (portal?.portal_settings?.color_theme ?? 'slate_gray') as PortalColorTheme;
    return getThemePalette(theme);
  }, [portal?.portal_settings?.color_theme]);

  const businessName = portal?.portal_settings?.welcome_title || portal?.router.business_name || portal?.router.name || 'Internet Service';
  const supportPhone = portal?.portal_settings?.portal_support_phone || portal?.router.support_phone || null;
  const shareLimit = useMemo(() => {
    const planLimits = (portal?.plans ?? [])
      .filter((plan) => plan.connection_type === 'hotspot')
      .map((plan) => Math.max(1, Number(plan.max_shared_users) || 1));
    return Math.max(1, Number(portal?.plan_flags?.max_shared_users) || 1, ...planLimits);
  }, [portal?.plan_flags?.max_shared_users, portal?.plans]);
  const sharingEnabled = Boolean(portal?.plan_flags?.sharing_enabled) || shareLimit > 1;
  const companionSlots = Math.max(0, shareLimit - 1);
  const expiry = formatExpiry(result?.expiry);
  const backgroundImage = portal?.portal_settings?.header_bg_image_url;

  const pageStyle: CSSProperties = {
    background: palette.background,
    color: palette.text,
  };
  const heroStyle: CSSProperties = backgroundImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.42)), url(${JSON.stringify(backgroundImage)})`,
      }
    : {
        background: `linear-gradient(135deg, ${palette.primaryDark}, ${palette.primary})`,
      };
  const panelStyle: CSSProperties = {
    background: palette.surface,
    borderColor: palette.border,
    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.16)',
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!portal || !sharingEnabled) return;

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const payload: ShareSubscriptionRequest = {
        owner_phone: formData.owner_phone.trim(),
        router_id: portal.router.router_id,
        device_mac: formData.device_mac.trim(),
        owner_mac: formData.owner_mac.trim() || null,
        device_name: formData.device_name.trim() || null,
        device_type: formData.device_type,
      };
      const response = await api.shareSubscriptionDevice(payload);
      setResult(response);
      setFormData((prev) => ({
        ...prev,
        owner_mac: '',
        device_mac: '',
        device_name: '',
      }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add this device.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden" style={pageStyle}>
      <div className="absolute inset-x-0 top-0 h-[340px] bg-cover bg-center" style={heroStyle} />
      <div className="absolute inset-x-0 top-[260px] h-32" style={{ background: `linear-gradient(to bottom, transparent, ${palette.background})` }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 py-2 text-white">
          <div className="flex min-w-0 items-center gap-3">
            {portal?.portal_settings?.company_logo_url ? (
              <img
                src={portal.portal_settings.company_logo_url}
                alt=""
                className="h-10 w-10 flex-shrink-0 rounded-lg object-cover bg-white"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold ring-1 ring-white/20">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{businessName}</p>
              <p className="truncate text-xs text-white/70">{portal?.router.name || identity}</p>
            </div>
          </div>
          {supportPhone && (
            <a
              href={`tel:${supportPhone}`}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/25 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 5.5A3.5 3.5 0 015.5 2h1.2c.8 0 1.5.6 1.6 1.4l.5 3a2 2 0 01-.5 1.7l-.7.7a13 13 0 006.6 6.6l.7-.7a2 2 0 011.7-.5l3 .5c.8.1 1.4.8 1.4 1.6v1.2A3.5 3.5 0 0117.5 21h-.5C8.7 21 2 14.3 2 6v-.5z" />
              </svg>
              Support
            </a>
          )}
        </header>

        <section className="grid flex-1 items-start gap-6 py-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)] lg:py-12">
          <div className="pt-4 text-white lg:pt-12">
            <p className="mb-3 inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20">
              Existing subscription
            </p>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Connect another device to your internet
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
              Use the phone number on the paid subscription to add a TV, laptop, console, or another device.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-lg bg-black/20 px-3 py-2 text-xs font-medium ring-1 ring-white/15">
                {sharingEnabled ? `Up to ${shareLimit} devices per subscription` : 'Sharing not enabled'}
              </span>
              {sharingEnabled && companionSlots > 0 && (
                <span className="rounded-lg bg-black/20 px-3 py-2 text-xs font-medium ring-1 ring-white/15">
                  {companionSlots} extra {companionSlots === 1 ? 'device' : 'devices'}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4 sm:p-5" style={panelStyle}>
            {loading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-3" style={{ borderColor: `${palette.primary}33`, borderTopColor: palette.primary }} />
                <p className="text-sm" style={{ color: palette.textSecondary }}>Loading router details...</p>
              </div>
            ) : loadError ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: `${palette.error}14`, color: palette.error }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.01M10.3 4.3l-8 13.8A2 2 0 004 21h16a2 2 0 001.7-2.9l-8-13.8a2 2 0 00-3.4 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Link unavailable</h2>
                  <p className="mt-1 text-sm" style={{ color: palette.textSecondary }}>{loadError}</p>
                </div>
              </div>
            ) : !sharingEnabled ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ background: `${palette.warning}16`, color: palette.warning }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M4.9 19h14.2a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0L3.2 16a2 2 0 001.7 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Sharing is not enabled</h2>
                  <p className="mt-1 text-sm" style={{ color: palette.textSecondary }}>
                    This hotspot is not accepting shared subscription devices right now.
                  </p>
                </div>
                {supportPhone && (
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: palette.primary }}
                  >
                    Call support
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-xl font-semibold">Add device</h2>
                  <p className="mt-1 text-sm" style={{ color: palette.textSecondary }}>
                    The device will share the paid subscription until the subscription expires.
                  </p>
                </div>

                {result && (
                  <div className="mb-4 rounded-lg border p-4" style={{ borderColor: `${palette.success}55`, background: `${palette.success}12` }}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: palette.success, color: palette.textInverse }}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">
                          {result.auth_method === 'RADIUS' ? 'Device connected' : 'Device queued'}
                        </h3>
                        <p className="mt-1 text-sm" style={{ color: palette.textSecondary }}>{result.message}</p>
                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                          <span className="rounded-md px-2 py-1 font-mono" style={{ background: `${palette.success}12` }}>
                            {result.device_mac}
                          </span>
                          <span className="rounded-md px-2 py-1" style={{ background: `${palette.success}12` }}>
                            {result.active_shared_devices}/{Math.max(1, result.max_shared_users - 1)} extra used
                          </span>
                          {expiry && (
                            <span className="rounded-md px-2 py-1 sm:col-span-2" style={{ background: `${palette.success}12` }}>
                              Active until {expiry}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: `${palette.error}55`, background: `${palette.error}10`, color: palette.error }}>
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <label htmlFor="owner_phone" className="mb-1.5 block text-sm font-medium">
                      Subscription phone number
                    </label>
                    <input
                      id="owner_phone"
                      type="tel"
                      inputMode="tel"
                      value={formData.owner_phone}
                      onChange={(event) => setFormData({ ...formData, owner_phone: event.target.value })}
                      className="w-full rounded-lg border px-3 py-3 text-sm outline-none transition focus:ring-2"
                      style={{ borderColor: palette.border, background: palette.surface, color: palette.text }}
                      placeholder="07..."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="owner_mac" className="mb-1.5 block text-sm font-medium">
                      Current device MAC <span style={{ color: palette.textSecondary }}>(optional)</span>
                    </label>
                    <input
                      id="owner_mac"
                      type="text"
                      value={formData.owner_mac}
                      onChange={(event) => setFormData({ ...formData, owner_mac: event.target.value })}
                      className="w-full rounded-lg border px-3 py-3 font-mono text-sm outline-none transition focus:ring-2"
                      style={{ borderColor: palette.border, background: palette.surface, color: palette.text }}
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </div>

                  <div>
                    <label htmlFor="device_mac" className="mb-1.5 block text-sm font-medium">
                      New device MAC
                    </label>
                    <input
                      id="device_mac"
                      type="text"
                      value={formData.device_mac}
                      onChange={(event) => setFormData({ ...formData, device_mac: event.target.value })}
                      className="w-full rounded-lg border px-3 py-3 font-mono text-sm uppercase outline-none transition focus:ring-2"
                      style={{ borderColor: palette.border, background: palette.surface, color: palette.text }}
                      placeholder="AA:BB:CC:DD:EE:FF"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="device_name" className="mb-1.5 block text-sm font-medium">
                        Device name
                      </label>
                      <input
                        id="device_name"
                        type="text"
                        value={formData.device_name}
                        onChange={(event) => setFormData({ ...formData, device_name: event.target.value })}
                        className="w-full rounded-lg border px-3 py-3 text-sm outline-none transition focus:ring-2"
                        style={{ borderColor: palette.border, background: palette.surface, color: palette.text }}
                        placeholder="Living room TV"
                      />
                    </div>
                    <div>
                      <label htmlFor="device_type" className="mb-1.5 block text-sm font-medium">
                        Device type
                      </label>
                      <select
                        id="device_type"
                        value={formData.device_type}
                        onChange={(event) => setFormData({ ...formData, device_type: event.target.value as DeviceTypeValue })}
                        className="w-full rounded-lg border px-3 py-3 text-sm outline-none transition focus:ring-2"
                        style={{ borderColor: palette.border, background: palette.surface, color: palette.text }}
                      >
                        {DEVICE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: palette.primary }}
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Adding device
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add device
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
