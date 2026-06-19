'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import type {
  DeliveryAttemptStatus,
  PublicDeviceStatusResponse,
  PublicPortalResponse,
  ShareOwnerStatusResponse,
  ShareSubscriptionRequest,
  ShareSubscriptionResponse,
} from '../../../lib/types';
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
  device_mac: '',
  device_name: '',
  device_type: 'tv' as DeviceTypeValue,
};

type SavedShareState = {
  owner_phone: string;
  device_mac: string;
  result: ShareSubscriptionResponse | null;
  saved_at: number;
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
  return cleanMac(value).length;
}

function cleanMac(value: string): string {
  return value.replace(/[^0-9a-f]/gi, '').toUpperCase().slice(0, 12);
}

function formatMac(value: string): string {
  const hex = cleanMac(value);
  return (hex.match(/.{1,2}/g) || []).join(':');
}

function isValidMac(value: string): boolean {
  return /^[0-9A-F]{12}$/.test(cleanMac(value));
}

function deliveryText(delivery?: DeliveryAttemptStatus | null) {
  const status = delivery?.delivery_status;
  if (status === 'online') {
    return {
      tone: 'success' as const,
      title: 'Device Online',
      message: 'The shared device has been seen online on this hotspot.',
    };
  }
  if (status === 'access_ready') {
    return {
      tone: 'success' as const,
      title: 'Device Added',
      message: 'Access is ready. Reconnect WiFi on the device if it does not start browsing.',
    };
  }
  if (status === 'needs_attention') {
    return {
      tone: 'error' as const,
      title: 'Needs Attention',
      message: delivery?.last_error || 'The router could not finish adding this device. Try again or contact support.',
    };
  }
  return {
    tone: 'pending' as const,
    title: 'Activating Device',
    message: 'The router is adding this device. This usually finishes in a few seconds.',
  };
}

function storageKey(routerId: number | undefined, identity: string): string | null {
  if (!routerId) return null;
  return `bitwave_share_status:${routerId}:${identity}`;
}

export default function RouterSharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const identity = normalizeParam(params.identity);
  const [portal, setPortal] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ShareSubscriptionResponse | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<PublicDeviceStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [trackedDeviceMac, setTrackedDeviceMac] = useState('');
  const [useDetectedDevice, setUseDetectedDevice] = useState(false);
  const [ownerStatus, setOwnerStatus] = useState<ShareOwnerStatusResponse | null>(null);
  const [checkedOwnerPhone, setCheckedOwnerPhone] = useState('');
  const [ownerChecking, setOwnerChecking] = useState(false);
  const [ownerStatusError, setOwnerStatusError] = useState<string | null>(null);

  const detectedDeviceMac = useMemo(() => {
    const raw =
      searchParams.get('mac') ||
      searchParams.get('device_mac') ||
      searchParams.get('client_mac') ||
      '';
    const formatted = formatMac(raw);
    return isValidMac(formatted) ? formatted : '';
  }, [searchParams]);

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

  const refreshDeviceStatus = useCallback(async (macAddress: string) => {
    if (!portal?.router.router_id || !macAddress || !isValidMac(macAddress)) return;

    setStatusLoading(true);
    setStatusError(null);
    try {
      const status = await api.getPublicDeviceStatus(portal.router.router_id, formatMac(macAddress));
      setDeviceStatus(status);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to check device status.');
    } finally {
      setStatusLoading(false);
    }
  }, [portal?.router.router_id]);

  const checkOwnerStatus = useCallback(async () => {
    if (!portal?.router.router_id) return;

    const phone = formData.owner_phone.trim();
    if (phone.length < 9) {
      setOwnerStatus(null);
      setOwnerStatusError('Enter the subscription owner phone number first.');
      return;
    }

    setOwnerChecking(true);
    setOwnerStatusError(null);
    try {
      const status = await api.getShareSubscriptionOwnerStatus(portal.router.router_id, phone);
      setOwnerStatus(status);
      setCheckedOwnerPhone(phone);
    } catch (err) {
      setOwnerStatus(null);
      setOwnerStatusError(err instanceof Error ? err.message : 'Failed to check this subscription.');
    } finally {
      setOwnerChecking(false);
    }
  }, [formData.owner_phone, portal?.router.router_id]);

  useEffect(() => {
    if (!portal?.router.router_id || !identity) return;

    const key = storageKey(portal.router.router_id, identity);
    if (!key) return;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;

      const saved = JSON.parse(raw) as SavedShareState;
      const ageMs = Date.now() - Number(saved.saved_at || 0);
      const savedMac = formatMac(saved.device_mac || '');
      if (!isValidMac(savedMac) || ageMs > 24 * 60 * 60 * 1000) return;

      setTrackedDeviceMac(savedMac);
      setResult(saved.result);
      setFormData((prev) => ({
        ...prev,
        owner_phone: prev.owner_phone || saved.owner_phone || '',
      }));
      void refreshDeviceStatus(savedMac);
    } catch {
      return;
    }
  }, [identity, portal?.router.router_id, refreshDeviceStatus]);

  useEffect(() => {
    if (!detectedDeviceMac) return;
    setUseDetectedDevice(true);
    setFormData((prev) => ({
      ...prev,
      device_mac: prev.device_mac || detectedDeviceMac,
      device_type: prev.device_type === 'tv' ? 'other' : prev.device_type,
    }));
  }, [detectedDeviceMac]);

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
  const deviceMacCount = macCharacterCount(formData.device_mac);
  const backgroundImage = portal?.portal_settings?.header_bg_image_url;
  const activeDelivery = deviceStatus?.delivery ?? result?.delivery ?? null;
  const visibleDeviceMac = deviceStatus?.pairing?.device_mac || result?.device_mac || trackedDeviceMac;
  const visibleExpiry = formatExpiry(deviceStatus?.customer?.expiry || result?.expiry);
  const statusCopy = visibleDeviceMac ? deliveryText(activeDelivery) : null;
  const statusToneClass = statusCopy?.tone === 'error'
    ? styles.deviceStatusError
    : statusCopy?.tone === 'success'
      ? styles.deviceStatusSuccess
      : styles.deviceStatusPending;
  const detectedDeviceInUse = Boolean(detectedDeviceMac && useDetectedDevice && formData.device_mac === detectedDeviceMac);
  const ownerPhone = formData.owner_phone.trim();
  const ownerStatusCurrent = Boolean(ownerStatus && checkedOwnerPhone === ownerPhone);
  const ownerHasRoom = Boolean(
    ownerStatusCurrent &&
    ownerStatus?.has_active_subscription &&
    ownerStatus?.sharing_enabled &&
    Number(ownerStatus.available_shared_devices ?? 0) > 0
  );
  const ownerDeviceRows = ownerStatusCurrent ? ownerStatus?.devices ?? [] : [];
  const ownerStatusTitle = !ownerStatusCurrent
    ? 'Check subscription first'
    : ownerStatus?.has_active_subscription
      ? ownerStatus.sharing_enabled
        ? Number(ownerStatus.available_shared_devices ?? 0) > 0
          ? 'Subscription ready to share'
          : 'Sharing limit reached'
        : 'Sharing is off for this plan'
      : 'No active subscription found';
  const ownerStatusMessage = !ownerStatusCurrent
    ? 'Enter the owner phone number and check it before adding another device.'
    : ownerStatus?.message || '';

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

  useEffect(() => {
    if (!trackedDeviceMac || !portal?.router.router_id) return;

    const status = activeDelivery?.delivery_status;
    if (status && status !== 'activating') return;

    const intervalId = window.setInterval(() => {
      void refreshDeviceStatus(trackedDeviceMac);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [activeDelivery?.delivery_status, portal?.router.router_id, refreshDeviceStatus, trackedDeviceMac]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!portal || !sharingEnabled) return;

    if (!ownerHasRoom) {
      setSubmitError('Check the owner subscription first.');
      return;
    }

    const normalizedDeviceMac = formatMac(formData.device_mac);
    if (!isValidMac(normalizedDeviceMac)) {
      setSubmitError('Enter a valid device MAC address.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setStatusError(null);
    try {
      const payload: ShareSubscriptionRequest = {
        owner_phone: formData.owner_phone.trim(),
        router_id: portal.router.router_id,
        device_mac: normalizedDeviceMac,
        device_name: formData.device_name.trim() || null,
        device_type: formData.device_type,
      };
      const response = await api.shareSubscriptionDevice(payload);
      setResult(response);
      setTrackedDeviceMac(response.device_mac);
      setDeviceStatus(null);
      const key = storageKey(portal.router.router_id, identity);
      if (key) {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            owner_phone: formData.owner_phone.trim(),
            device_mac: response.device_mac,
            result: response,
            saved_at: Date.now(),
          } satisfies SavedShareState)
        );
      }
      setFormData((prev) => ({
        ...prev,
        device_mac: detectedDeviceInUse ? response.device_mac : '',
        device_name: '',
      }));
      void refreshDeviceStatus(response.device_mac);
      void checkOwnerStatus();
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

                  {statusCopy && visibleDeviceMac && (
                    <div className={`${styles.deviceStatusWrap} ${statusToneClass}`}>
                      <div className={styles.deviceStatusHeader}>
                        <div className={styles.deviceSuccessIcon}>
                          {statusCopy.tone === 'error' ? '!' : statusCopy.tone === 'pending' ? '...' : 'OK'}
                        </div>
                        <div>
                          <h3 className={styles.deviceSuccessTitle}>{statusCopy.title}</h3>
                          <p className={styles.deviceSuccessTip}>{statusCopy.message}</p>
                        </div>
                      </div>
                      <div className={styles.deviceSuccessDetails}>
                        <div className={styles.deviceSummaryRow}>
                          <span className={styles.deviceSummaryLabel}>Device</span>
                          <span className={styles.deviceSummaryValue}>{visibleDeviceMac}</span>
                        </div>
                        {result && (
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Shared slots</span>
                            <span className={styles.deviceSummaryValue}>
                              {result.active_shared_devices}/{Math.max(1, result.max_shared_users - 1)} used
                            </span>
                          </div>
                        )}
                        {activeDelivery?.provisioning_state && (
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Router status</span>
                            <span className={styles.deviceSummaryValue}>{activeDelivery.provisioning_state}</span>
                          </div>
                        )}
                        {visibleExpiry && (
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Active until</span>
                            <span className={styles.deviceSummaryValue}>{visibleExpiry}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.deviceStatusBtn}
                        onClick={() => refreshDeviceStatus(visibleDeviceMac)}
                        disabled={statusLoading}
                      >
                        {statusLoading ? 'Checking...' : 'Check status'}
                      </button>
                    </div>
                  )}

                  {(submitError || statusError) && (
                    <div className={styles.deviceErrorWrap}>
                      <div className={styles.deviceErrorIcon}>X</div>
                      <div>
                        <h3 className={styles.deviceErrorTitle}>Something went wrong</h3>
                        <p className={styles.deviceErrorMsg}>{submitError || statusError}</p>
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
                      onChange={(event) => {
                        setOwnerStatusError(null);
                        setSubmitError(null);
                        setFormData({ ...formData, owner_phone: event.target.value });
                      }}
                      className={styles.deviceInput}
                      placeholder="0712345678"
                      required
                    />

                    <button
                      type="button"
                      className={styles.ownerCheckBtn}
                      onClick={checkOwnerStatus}
                      disabled={ownerChecking || ownerPhone.length < 9}
                    >
                      {ownerChecking ? (
                        <>
                          <span className={styles.buttonSpinner} />
                          Checking...
                        </>
                      ) : (
                        'Check subscription'
                      )}
                    </button>

                    <div className={`${styles.ownerStatusCard} ${ownerHasRoom ? styles.ownerStatusOk : styles.ownerStatusWarn}`}>
                      <div className={styles.ownerStatusHeader}>
                        <div>
                          <h3 className={styles.ownerStatusTitle}>{ownerStatusTitle}</h3>
                          {ownerStatusMessage && <p className={styles.ownerStatusText}>{ownerStatusMessage}</p>}
                          {ownerStatusError && <p className={styles.ownerStatusError}>{ownerStatusError}</p>}
                        </div>
                        {ownerStatusCurrent && ownerStatus?.has_active_subscription && (
                          <span className={styles.ownerStatusBadge}>
                            {ownerStatus.active_shared_devices ?? 0}/{ownerStatus.max_companion_devices ?? 0}
                          </span>
                        )}
                      </div>

                      {ownerStatusCurrent && ownerStatus?.has_active_subscription && (
                        <div className={styles.ownerStatusDetails}>
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Owner device</span>
                            <span className={styles.deviceSummaryValue}>{ownerStatus.owner_device_mac || '-'}</span>
                          </div>
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Plan</span>
                            <span className={styles.deviceSummaryValue}>{ownerStatus.plan?.name || '-'}</span>
                          </div>
                          <div className={styles.deviceSummaryRow}>
                            <span className={styles.deviceSummaryLabel}>Available slots</span>
                            <span className={styles.deviceSummaryValue}>{ownerStatus.available_shared_devices ?? 0}</span>
                          </div>
                          {ownerStatus.owner_expiry && (
                            <div className={styles.deviceSummaryRow}>
                              <span className={styles.deviceSummaryLabel}>Active until</span>
                              <span className={styles.deviceSummaryValue}>{formatExpiry(ownerStatus.owner_expiry)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {ownerStatusCurrent && ownerDeviceRows.length > 0 && (
                        <div className={styles.ownerDevicesList}>
                          <div className={styles.ownerDevicesTitle}>Already shared</div>
                          {ownerDeviceRows.map((device) => (
                            <div key={device.id} className={styles.ownerDeviceRow}>
                              <div>
                                <div className={styles.ownerDeviceMac}>{device.device_mac}</div>
                                <div className={styles.ownerDeviceMeta}>
                                  {device.device_name || device.customer?.name || 'Shared device'}
                                </div>
                              </div>
                              <span className={styles.ownerDeviceStatus}>
                                {device.delivery?.delivery_status || device.customer?.status || 'active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className={styles.deviceStepTitleAlt}>Device Info</h3>

                    {detectedDeviceMac && (
                      <div className={styles.detectedDeviceCard}>
                        <div>
                          <div className={styles.detectedDeviceLabel}>This device detected</div>
                          <div className={styles.detectedDeviceMac}>{detectedDeviceMac}</div>
                        </div>
                        <button
                          type="button"
                          className={styles.detectedDeviceBtn}
                          onClick={() => {
                            const nextUseDetected = !useDetectedDevice;
                            setUseDetectedDevice(nextUseDetected);
                            setFormData((prev) => ({
                              ...prev,
                              device_mac: nextUseDetected ? detectedDeviceMac : '',
                            }));
                          }}
                        >
                          {useDetectedDevice ? 'Enter MAC' : 'Use this'}
                        </button>
                      </div>
                    )}

                    <label htmlFor="device_mac" className={styles.deviceLabel}>
                      MAC Address <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.deviceMacWrap}>
                      <input
                        id="device_mac"
                        type="text"
                        value={formData.device_mac}
                        onChange={(event) => {
                          const nextMac = formatMac(event.target.value);
                          setUseDetectedDevice(Boolean(detectedDeviceMac && nextMac === detectedDeviceMac));
                          setFormData({ ...formData, device_mac: nextMac });
                        }}
                        className={`${styles.deviceInput} ${styles.mono}`}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={17}
                        disabled={!ownerHasRoom}
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
                        <div className={styles.macHelpItem}><strong>Phone or laptop</strong> - Open this page from that device on the hotspot. If the router provides the device MAC, it fills in automatically.</div>
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
                          disabled={!ownerHasRoom}
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
                      disabled={!ownerHasRoom}
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

                    <button type="submit" disabled={submitting || !ownerHasRoom || deviceMacCount !== 12} className={styles.devicePayBtn}>
                      {submitting ? (
                        <>
                          <span className={styles.buttonSpinner} />
                          Adding device...
                        </>
                      ) : !ownerHasRoom ? (
                        'Check subscription first'
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
