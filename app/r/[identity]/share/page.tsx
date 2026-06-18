'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import type { PublicPortalResponse, ShareSubscriptionRequest, ShareSubscriptionResponse } from '../../../lib/types';
import { getThemePalette, type PortalColorTheme } from '../../../lib/portalThemes';
import styles from './share.module.css';

type DeviceTypeValue = NonNullable<ShareSubscriptionRequest['device_type']>;

const DEVICE_TYPES: Array<{ value: DeviceTypeValue; label: string; icon: string }> = [
  { value: 'tv', label: 'TV', icon: 'TV' },
  { value: 'console', label: 'Console', icon: 'GAME' },
  { value: 'laptop', label: 'Laptop', icon: 'PC' },
  { value: 'iot', label: 'Smart', icon: 'IoT' },
  { value: 'other', label: 'Other', icon: 'NET' },
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

function hexToRgbParts(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return '232, 93, 4';
  const value = Number.parseInt(clean, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function macCharacterCount(value: string): number {
  return value.replace(/[^0-9a-f]/gi, '').slice(0, 12).length;
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
    const theme = (portal?.portal_settings?.color_theme ?? 'sunset_orange') as PortalColorTheme;
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
  const deviceMacCount = macCharacterCount(formData.device_mac);
  const ownerMacCount = macCharacterCount(formData.owner_mac);
  const backgroundImage = portal?.portal_settings?.header_bg_image_url;

  const themeStyle = {
    '--primary': palette.primary,
    '--primary-light': palette.primaryLight,
    '--primary-dark': palette.primaryDark,
    '--accent': palette.accent,
    '--primary-rgb': hexToRgbParts(palette.primary),
    '--accent-rgb': hexToRgbParts(palette.accent),
    '--bg': palette.background,
    '--bg-warm': palette.background,
    '--surface': palette.surface,
    '--text': palette.text,
    '--text-secondary': palette.textSecondary,
    '--text-inverse': palette.textInverse,
    '--success': palette.success,
    '--error': palette.error,
  } as CSSProperties;

  const welcomeStyle = backgroundImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(${hexToRgbParts(palette.primary)}, 0.86), rgba(${hexToRgbParts(palette.accent)}, 0.72)), url("${backgroundImage}")`,
      }
    : undefined;

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
    <main className={styles.app} style={themeStyle}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            {portal?.portal_settings?.company_logo_url ? (
              <img src={portal.portal_settings.company_logo_url} alt="" className={styles.brandLogo} />
            ) : (
              <span className={styles.brandIcon}>WiFi</span>
            )}
            <div className={styles.brandText}>
              <h1 className={styles.logo}>{businessName}</h1>
              <span className={styles.tagline}>{portal?.router.name || identity || 'Public WiFi'}</span>
            </div>
          </div>
          {supportPhone && (
            <a href={`tel:${supportPhone}`} className={styles.helpBtn}>
              <span className={styles.helpIcon}>Call</span>
              <span>Help</span>
            </a>
          )}
        </div>
      </header>

      <div className={styles.main}>
        <section className={styles.welcomeBanner} style={welcomeStyle}>
          <div className={styles.welcomeKicker}>Existing subscription</div>
          <h2 className={styles.welcomeTitle}>Connect a TV / Device</h2>
          <p className={styles.welcomeSub}>
            Add another device to the paid internet subscription on this hotspot.
          </p>
        </section>

        <div className={styles.quickSteps}>
          <div className={styles.step}>
            <span className={styles.stepNum}>1</span>
            <span className={styles.stepText}>Enter owner</span>
          </div>
          <div className={styles.stepArrow}>-</div>
          <div className={styles.step}>
            <span className={styles.stepNum}>2</span>
            <span className={styles.stepText}>Add device</span>
          </div>
          <div className={styles.stepArrow}>-</div>
          <div className={styles.step}>
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepText}>Connect</span>
          </div>
        </div>

        <section className={styles.deviceSection}>
          <div className={styles.deviceEntry}>
            <div className={styles.deviceEntryHeader}>
              <span className={styles.deviceEntryIcon}>TV</span>
              <div className={styles.deviceEntryText}>
                <div className={styles.deviceEntryTitle}>Share subscription</div>
                <div className={styles.deviceEntrySubtitle}>
                  {sharingEnabled
                    ? `This plan can allow up to ${shareLimit} total devices`
                    : 'Smart TVs, consoles and other browserless devices'}
                </div>
              </div>
              <span className={styles.deviceEntryChevron}>&gt;</span>
            </div>

            <div className={styles.deviceEntryBody}>
              {loading ? (
                <div className={styles.statePanel}>
                  <span className={styles.spinner} />
                  <h3 className={styles.stateTitle}>Loading router details</h3>
                  <p className={styles.stateText}>Please wait...</p>
                </div>
              ) : loadError ? (
                <div className={styles.statePanel}>
                  <span className={`${styles.stateIcon} ${styles.stateIconError}`}>!</span>
                  <h3 className={styles.stateTitle}>Link unavailable</h3>
                  <p className={styles.stateText}>{loadError}</p>
                </div>
              ) : !sharingEnabled ? (
                <div className={styles.statePanel}>
                  <span className={`${styles.stateIcon} ${styles.stateIconWarning}`}>!</span>
                  <h3 className={styles.stateTitle}>Sharing is not enabled</h3>
                  <p className={styles.stateText}>
                    This hotspot is not accepting shared subscription devices right now.
                  </p>
                  {supportPhone && (
                    <a href={`tel:${supportPhone}`} className={styles.deviceNextBtn}>
                      Call support
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.deviceTabs}>
                    <span className={`${styles.deviceTab} ${styles.deviceTabActive}`}>Add Device</span>
                    <span className={styles.deviceTab}>Shared Plan</span>
                  </div>

                  <div className={styles.deviceStepsBar}>
                    <span className={`${styles.deviceStepDot} ${styles.deviceStepDone}`}>1</span>
                    <span className={`${styles.deviceStepLine} ${styles.deviceStepLineDone}`} />
                    <span className={`${styles.deviceStepDot} ${styles.deviceStepDone}`}>2</span>
                    <span className={`${styles.deviceStepLine} ${styles.deviceStepLineDone}`} />
                    <span className={`${styles.deviceStepDot} ${styles.deviceStepActive}`}>3</span>
                  </div>

                  {result && (
                    <div className={styles.deviceSuccessWrap}>
                      <div className={styles.deviceSuccessIcon}>OK</div>
                      <h3 className={styles.deviceSuccessTitle}>
                        {result.auth_method === 'RADIUS' ? 'Device Connected!' : 'Device Queued!'}
                      </h3>
                      <div className={styles.deviceSuccessDetails}>
                        <div className={styles.deviceSummaryRow}>
                          <span className={styles.deviceSummaryLabel}>Device</span>
                          <span className={styles.deviceSummaryValue}>{result.device_mac}</span>
                        </div>
                        <div className={styles.deviceSummaryRow}>
                          <span className={styles.deviceSummaryLabel}>Shared slots</span>
                          <span className={styles.deviceSummaryValue}>
                            {result.active_shared_devices}/{Math.max(1, result.max_shared_users - 1)} used
                          </span>
                        </div>
                        {expiry && (
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Active until</span>
                            <span className={styles.deviceSummaryValue}>{expiry}</span>
                          </div>
                        )}
                      </div>
                      <p className={styles.deviceSuccessTip}>
                        If the device does not connect automatically, restart its WiFi connection.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <div className={styles.deviceErrorWrap}>
                      <div className={styles.deviceErrorIcon}>X</div>
                      <div>
                        <h3 className={styles.deviceErrorTitle}>Something went wrong</h3>
                        <p className={styles.deviceErrorMsg}>{submitError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} autoComplete="off">
                    <h3 className={styles.deviceStepTitle}>Subscription Owner</h3>

                    <label htmlFor="owner_phone" className={styles.deviceLabel}>
                      Phone Number <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="owner_phone"
                      type="tel"
                      inputMode="tel"
                      value={formData.owner_phone}
                      onChange={(event) => setFormData({ ...formData, owner_phone: event.target.value })}
                      className={styles.deviceInput}
                      placeholder="0712345678"
                      required
                    />

                    <label htmlFor="owner_mac" className={styles.deviceLabel}>
                      Current device MAC <span className={styles.optional}>(optional)</span>
                    </label>
                    <div className={styles.deviceMacWrap}>
                      <input
                        id="owner_mac"
                        type="text"
                        value={formData.owner_mac}
                        onChange={(event) => setFormData({ ...formData, owner_mac: event.target.value })}
                        className={`${styles.deviceInput} ${styles.mono}`}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={17}
                      />
                      {ownerMacCount === 12 && <span className={styles.deviceMacStatus}>OK</span>}
                    </div>

                    <h3 className={styles.deviceStepTitleAlt}>Device Info</h3>

                    <label htmlFor="device_mac" className={styles.deviceLabel}>
                      MAC Address <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.deviceMacWrap}>
                      <input
                        id="device_mac"
                        type="text"
                        value={formData.device_mac}
                        onChange={(event) => setFormData({ ...formData, device_mac: event.target.value })}
                        className={`${styles.deviceInput} ${styles.mono}`}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={17}
                        required
                      />
                      {deviceMacCount === 12 && <span className={styles.deviceMacStatus}>OK</span>}
                    </div>
                    <div className={styles.deviceMacCounter}>{deviceMacCount}/12 characters</div>

                    <details className={styles.deviceMacHelp}>
                      <summary>Where do I find the MAC address?</summary>
                      <div className={styles.macHelpList}>
                        <div className={styles.macHelpItem}><strong>Samsung TV</strong> - Settings &gt; General &gt; Network</div>
                        <div className={styles.macHelpItem}><strong>Android TV</strong> - Settings &gt; Device Preferences &gt; About &gt; Status</div>
                        <div className={styles.macHelpItem}><strong>PlayStation</strong> - Settings &gt; Network &gt; View Connection Status</div>
                        <div className={styles.macHelpItem}><strong>Other</strong> - Check WiFi or Network settings for MAC Address.</div>
                      </div>
                    </details>

                    <label className={styles.deviceLabel}>Device Type</label>
                    <div className={styles.deviceTypeGrid}>
                      {DEVICE_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, device_type: type.value })}
                          className={`${styles.deviceTypeBtn} ${formData.device_type === type.value ? styles.deviceTypeBtnActive : ''}`}
                        >
                          <span>{type.icon}</span>
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <label htmlFor="device_name" className={styles.deviceLabel}>
                      Device Name <span className={styles.optional}>(optional)</span>
                    </label>
                    <input
                      id="device_name"
                      type="text"
                      value={formData.device_name}
                      onChange={(event) => setFormData({ ...formData, device_name: event.target.value })}
                      className={styles.deviceInput}
                      placeholder="e.g. Living Room TV"
                      maxLength={40}
                    />

                    <div className={styles.deviceSummaryCard}>
                      <div className={styles.deviceSummaryRow}>
                        <span className={styles.deviceSummaryLabel}>Subscription limit</span>
                        <span className={styles.deviceSummaryValue}>{shareLimit} total devices</span>
                      </div>
                      <div className={styles.deviceSummaryRow}>
                        <span className={styles.deviceSummaryLabel}>Extra devices</span>
                        <span className={styles.deviceSummaryValue}>{companionSlots}</span>
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className={styles.devicePayBtn}>
                      {submitting ? (
                        <>
                          <span className={styles.buttonSpinner} />
                          Adding device...
                        </>
                      ) : (
                        'Add Device'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>

        <footer className={styles.portalFooter}>
          <p>{portal?.portal_settings?.footer_text || 'Powered by Bitwave Technologies'}</p>
        </footer>
      </div>
    </main>
  );
}
