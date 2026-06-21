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
  ShareSubscriptionCodeResponse,
  ShareSubscriptionRequest,
  ShareSubscriptionResponse,
} from '../../../lib/types';
import { getThemePalette, type PortalColorTheme } from '../../../lib/portalThemes';

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

function cleanShareCode(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 6);
}

function formatShareCode(value: string): string {
  const clean = cleanShareCode(value);
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

function addedDeviceCopy() {
  return {
    tone: 'success' as const,
    title: 'Device Added',
    message: 'Access is ready. Reconnect WiFi on the device if it does not start browsing.',
  };
}

function deliveryText(delivery?: DeliveryAttemptStatus | null, fallbackSuccess = false) {
  if (!delivery) {
    return fallbackSuccess ? addedDeviceCopy() : null;
  }

  const status = delivery?.delivery_status;
  if (!status) {
    return fallbackSuccess ? addedDeviceCopy() : null;
  }

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
  if (status !== 'activating') {
    return fallbackSuccess ? addedDeviceCopy() : null;
  }

  return {
    tone: 'pending' as const,
    title: 'Activating Device',
    message: 'The router is adding this device. This usually finishes in a few seconds.',
  };
}

export default function RouterSharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const identity = normalizeParam(params.identity);
  const initialRedeemCode = formatShareCode(searchParams.get('code') || searchParams.get('share_code') || '');
  const [portal, setPortal] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ShareSubscriptionResponse | null>(null);
  const [generatedCode, setGeneratedCode] = useState<ShareSubscriptionCodeResponse | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [shareCodeError, setShareCodeError] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState(initialRedeemCode);
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [redeemCodeError, setRedeemCodeError] = useState<string | null>(null);
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

  const clearTransientDeviceStatus = useCallback(() => {
    setResult(null);
    setDeviceStatus(null);
    setTrackedDeviceMac('');
    setStatusError(null);
  }, []);

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

  const generateShareCodeForPhone = useCallback(async (phone: string) => {
    if (!portal?.router.router_id) return;

    setGeneratingCode(true);
    setShareCodeError(null);
    try {
      const response = await api.createShareSubscriptionCode({
        owner_phone: phone,
        router_id: portal.router.router_id,
      });
      setGeneratedCode(response);
    } catch (err) {
      setGeneratedCode(null);
      setShareCodeError(err instanceof Error ? err.message : 'Failed to prepare share code.');
    } finally {
      setGeneratingCode(false);
    }
  }, [portal?.router.router_id]);

  const checkOwnerStatus = useCallback(async (options?: { preserveAttempt?: boolean }) => {
    if (!portal?.router.router_id) return;

    const phone = formData.owner_phone.trim();
    if (phone.length < 9) {
      setOwnerStatus(null);
      setOwnerStatusError('Enter the subscription owner phone number first.');
      return;
    }

    setOwnerChecking(true);
    setOwnerStatusError(null);
    setShareCodeError(null);
    setGeneratedCode(null);
    if (!options?.preserveAttempt) {
      clearTransientDeviceStatus();
    }
    try {
      const status = await api.getShareSubscriptionOwnerStatus(portal.router.router_id, phone);
      setOwnerStatus(status);
      setCheckedOwnerPhone(phone);
      if (
        status.has_active_subscription &&
        status.sharing_enabled &&
        Number(status.available_shared_devices ?? 0) > 0
      ) {
        await generateShareCodeForPhone(phone);
      }
    } catch (err) {
      setOwnerStatus(null);
      setOwnerStatusError(err instanceof Error ? err.message : 'Failed to check this subscription.');
    } finally {
      setOwnerChecking(false);
    }
  }, [clearTransientDeviceStatus, formData.owner_phone, generateShareCodeForPhone, portal?.router.router_id]);

  useEffect(() => {
    if (!detectedDeviceMac) return;
    setUseDetectedDevice(true);
    setFormData((prev) => ({
      ...prev,
      device_mac: prev.device_mac || detectedDeviceMac,
      device_type: prev.device_type === 'tv' ? 'other' : prev.device_type,
    }));
  }, [detectedDeviceMac]);

  useEffect(() => {
    if (initialRedeemCode && !redeemCode) {
      setRedeemCode(initialRedeemCode);
    }
  }, [initialRedeemCode, redeemCode]);

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
  const sharedDeviceLimit = sharingEnabled ? shareLimit : 0;
  const deviceMacCount = macCharacterCount(formData.device_mac);
  const backgroundImage = portal?.portal_settings?.header_bg_image_url;
  const activeDelivery = deviceStatus ? deviceStatus.delivery ?? null : result?.delivery ?? null;
  const visibleDeviceMac = deviceStatus?.pairing?.device_mac || result?.device_mac || trackedDeviceMac;
  const visibleExpiry = formatExpiry(deviceStatus?.customer?.expiry || result?.expiry);
  const statusCopy = visibleDeviceMac ? deliveryText(activeDelivery, Boolean(result && !result.delivery)) : null;
  const statusToneClass = statusCopy?.tone === 'error'
    ? 'share_deviceStatusError'
    : statusCopy?.tone === 'success'
      ? 'share_deviceStatusSuccess'
      : 'share_deviceStatusPending';
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
  const redeemCodeReady = cleanShareCode(redeemCode).length === 6;
  const canEditDevice = ownerHasRoom || redeemCodeReady;
  const generatedCodeExpiry = formatExpiry(generatedCode?.expires_at);

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

  const rememberShareResponse = useCallback((response: ShareSubscriptionResponse, ownerPhoneValue = '') => {
    setResult(response);
    setTrackedDeviceMac(response.device_mac);
    setDeviceStatus(null);
    setFormData((prev) => ({
      ...prev,
      owner_phone: prev.owner_phone || ownerPhoneValue,
      device_mac: detectedDeviceInUse ? response.device_mac : '',
      device_name: '',
    }));
    void refreshDeviceStatus(response.device_mac);
  }, [detectedDeviceInUse, refreshDeviceStatus]);

  const handleGenerateShareCode = async () => {
    if (!portal || !sharingEnabled) return;

    const phone = formData.owner_phone.trim();
    if (phone.length < 9 || !ownerHasRoom) {
      setShareCodeError('Check the owner subscription first.');
      return;
    }

    await generateShareCodeForPhone(phone);
  };

  const handleRedeemShareCode = async () => {
    if (!portal || !sharingEnabled) return;

    const normalizedDeviceMac = formatMac(formData.device_mac);
    if (!redeemCodeReady) {
      setRedeemCodeError('Enter the 6-character share code.');
      return;
    }
    if (!isValidMac(normalizedDeviceMac)) {
      setRedeemCodeError('Enter a valid device MAC address.');
      return;
    }

    setRedeemingCode(true);
    setRedeemCodeError(null);
    setSubmitError(null);
    setStatusError(null);
    try {
      const response = await api.redeemShareSubscriptionCode({
        code: redeemCode,
        router_id: portal.router.router_id,
        device_mac: normalizedDeviceMac,
        device_name: formData.device_name.trim() || null,
        device_type: formData.device_type,
      });
      rememberShareResponse(response, formData.owner_phone.trim());
      setRedeemCode('');
      if (formData.owner_phone.trim().length >= 9) {
        void checkOwnerStatus({ preserveAttempt: true });
      }
    } catch (err) {
      setRedeemCodeError(err instanceof Error ? err.message : 'Failed to redeem this code.');
    } finally {
      setRedeemingCode(false);
    }
  };

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
      rememberShareResponse(response, formData.owner_phone.trim());
      void checkOwnerStatus({ preserveAttempt: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add this device.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={'share_app'} style={themeStyle}>
      <header className={'share_header'}>
        <div className={'share_headerInner'}>
          <div className={'share_brand'}>
            {portal?.portal_settings?.company_logo_url ? (
              <img src={portal.portal_settings.company_logo_url} alt="" className={'share_brandLogo'} />
            ) : (
              <span className={'share_brandIcon'}>WiFi</span>
            )}
            <div className={'share_brandText'}>
              <h1 className={'share_logo'}>{businessName}</h1>
              <span className={'share_tagline'}>{portal?.router.name || identity || 'Public WiFi'}</span>
            </div>
          </div>
          {supportPhone && (
            <a href={`tel:${supportPhone}`} className={'share_helpBtn'}>
              <span className={'share_helpIcon'}>Call</span>
              <span>Help</span>
            </a>
          )}
        </div>
      </header>

      <div className={'share_main'}>
        <section className={'share_welcomeBanner'} style={welcomeStyle}>
          <div className={'share_welcomeKicker'}>Existing subscription</div>
          <h2 className={'share_welcomeTitle'}>Connect a TV / Device</h2>
          <p className={'share_welcomeSub'}>
            Add another device to the paid internet subscription on this hotspot.
          </p>
        </section>

        <div className={'share_quickSteps'}>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>1</span>
            <span className={'share_stepText'}>Enter owner</span>
          </div>
          <div className={'share_stepArrow'}>-</div>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>2</span>
            <span className={'share_stepText'}>Add device</span>
          </div>
          <div className={'share_stepArrow'}>-</div>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>3</span>
            <span className={'share_stepText'}>Connect</span>
          </div>
        </div>

        <section className={'share_deviceSection'}>
          <div className={'share_deviceEntry'}>
            <div className={'share_deviceEntryHeader'}>
              <span className={'share_deviceEntryIcon'}>TV</span>
              <div className={'share_deviceEntryText'}>
                <div className={'share_deviceEntryTitle'}>Share subscription</div>
                <div className={'share_deviceEntrySubtitle'}>
                  {sharingEnabled
                    ? `This plan can allow up to ${sharedDeviceLimit} shared devices`
                    : 'Smart TVs, consoles and other browserless devices'}
                </div>
              </div>
              <span className={'share_deviceEntryChevron'}>&gt;</span>
            </div>

            <div className={'share_deviceEntryBody'}>
              {loading ? (
                <div className={'share_statePanel'}>
                  <span className={'share_spinner'} />
                  <h3 className={'share_stateTitle'}>Loading router details</h3>
                  <p className={'share_stateText'}>Please wait...</p>
                </div>
              ) : loadError ? (
                <div className={'share_statePanel'}>
                  <span className={`${'share_stateIcon'} ${'share_stateIconError'}`}>!</span>
                  <h3 className={'share_stateTitle'}>Link unavailable</h3>
                  <p className={'share_stateText'}>{loadError}</p>
                </div>
              ) : !sharingEnabled ? (
                <div className={'share_statePanel'}>
                  <span className={`${'share_stateIcon'} ${'share_stateIconWarning'}`}>!</span>
                  <h3 className={'share_stateTitle'}>Sharing is not enabled</h3>
                  <p className={'share_stateText'}>
                    This hotspot is not accepting shared subscription devices right now.
                  </p>
                  {supportPhone && (
                    <a href={`tel:${supportPhone}`} className={'share_deviceNextBtn'}>
                      Call support
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className={'share_deviceTabs'}>
                    <span className={`${'share_deviceTab'} ${'share_deviceTabActive'}`}>Add Device</span>
                    <span className={'share_deviceTab'}>Shared Plan</span>
                  </div>

                  <div className={'share_deviceStepsBar'}>
                    <span className={`${'share_deviceStepDot'} ${'share_deviceStepDone'}`}>1</span>
                    <span className={`${'share_deviceStepLine'} ${'share_deviceStepLineDone'}`} />
                    <span className={`${'share_deviceStepDot'} ${'share_deviceStepDone'}`}>2</span>
                    <span className={`${'share_deviceStepLine'} ${'share_deviceStepLineDone'}`} />
                    <span className={`${'share_deviceStepDot'} ${'share_deviceStepActive'}`}>3</span>
                  </div>

                  {statusCopy && visibleDeviceMac && (
                    <div className={`${'share_deviceStatusWrap'} ${statusToneClass}`}>
                      <div className={'share_deviceStatusHeader'}>
                        <div className={'share_deviceSuccessIcon'}>
                          {statusCopy.tone === 'error' ? '!' : statusCopy.tone === 'pending' ? '...' : 'OK'}
                        </div>
                        <div>
                          <h3 className={'share_deviceSuccessTitle'}>{statusCopy.title}</h3>
                          <p className={'share_deviceSuccessTip'}>{statusCopy.message}</p>
                        </div>
                      </div>
                      <div className={'share_deviceSuccessDetails'}>
                        <div className={'share_deviceSummaryRow'}>
                          <span className={'share_deviceSummaryLabel'}>Device</span>
                          <span className={'share_deviceSummaryValue'}>{visibleDeviceMac}</span>
                        </div>
                        {result && (
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Shared slots</span>
                            <span className={'share_deviceSummaryValue'}>
                              {result.active_shared_devices}/{Math.max(0, Number(result.max_shared_users) || 0)} used
                            </span>
                          </div>
                        )}
                        {activeDelivery?.provisioning_state && (
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Router status</span>
                            <span className={'share_deviceSummaryValue'}>{activeDelivery.provisioning_state}</span>
                          </div>
                        )}
                        {visibleExpiry && (
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Active until</span>
                            <span className={'share_deviceSummaryValue'}>{visibleExpiry}</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={'share_deviceStatusBtn'}
                        onClick={() => refreshDeviceStatus(visibleDeviceMac)}
                        disabled={statusLoading}
                      >
                        {statusLoading ? 'Checking...' : 'Check status'}
                      </button>
                    </div>
                  )}

                  {(submitError || statusError) && (
                    <div className={'share_deviceErrorWrap'}>
                      <div className={'share_deviceErrorIcon'}>X</div>
                      <div>
                        <h3 className={'share_deviceErrorTitle'}>Something went wrong</h3>
                        <p className={'share_deviceErrorMsg'}>{submitError || statusError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} autoComplete="off">
                    <h3 className={'share_deviceStepTitle'}>Subscription Owner</h3>

                    <label htmlFor="owner_phone" className={'share_deviceLabel'}>
                      Phone Number <span className={'share_required'}>*</span>
                    </label>
                    <input
                      id="owner_phone"
                      type="tel"
                      inputMode="tel"
                      value={formData.owner_phone}
                      onChange={(event) => {
                        setOwnerStatusError(null);
                        setSubmitError(null);
                        setShareCodeError(null);
                        setGeneratedCode(null);
                        clearTransientDeviceStatus();
                        setFormData({ ...formData, owner_phone: event.target.value });
                      }}
                      className={'share_deviceInput'}
                      placeholder="0712345678"
                      required
                    />

                    <button
                      type="button"
                      className={'share_ownerCheckBtn'}
                      onClick={() => void checkOwnerStatus()}
                      disabled={ownerChecking || ownerPhone.length < 9}
                    >
                      {ownerChecking ? (
                        <>
                          <span className={'share_buttonSpinner'} />
                          Checking...
                        </>
                      ) : (
                        'Check subscription'
                      )}
                    </button>

                    <div className={`${'share_ownerStatusCard'} ${ownerHasRoom ? 'share_ownerStatusOk' : 'share_ownerStatusWarn'}`}>
                      <div className={'share_ownerStatusHeader'}>
                        <div>
                          <h3 className={'share_ownerStatusTitle'}>{ownerStatusTitle}</h3>
                          {ownerStatusMessage && <p className={'share_ownerStatusText'}>{ownerStatusMessage}</p>}
                          {ownerStatusError && <p className={'share_ownerStatusError'}>{ownerStatusError}</p>}
                        </div>
                        {ownerStatusCurrent && ownerStatus?.has_active_subscription && (
                          <span className={'share_ownerStatusBadge'}>
                            {ownerStatus.active_shared_devices ?? 0}/{ownerStatus.max_companion_devices ?? 0}
                          </span>
                        )}
                      </div>

                      {ownerStatusCurrent && ownerStatus?.has_active_subscription && (
                        <div className={'share_ownerStatusDetails'}>
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Owner device</span>
                            <span className={'share_deviceSummaryValue'}>{ownerStatus.owner_device_mac || '-'}</span>
                          </div>
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Plan</span>
                            <span className={'share_deviceSummaryValue'}>{ownerStatus.plan?.name || '-'}</span>
                          </div>
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Available slots</span>
                            <span className={'share_deviceSummaryValue'}>{ownerStatus.available_shared_devices ?? 0}</span>
                          </div>
                          {ownerStatus.owner_expiry && (
                            <div className={'share_deviceSummaryRow'}>
                              <span className={'share_deviceSummaryLabel'}>Active until</span>
                              <span className={'share_deviceSummaryValue'}>{formatExpiry(ownerStatus.owner_expiry)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {ownerStatusCurrent && ownerDeviceRows.length > 0 && (
                        <div className={'share_ownerDevicesList'}>
                          <div className={'share_ownerDevicesTitle'}>Already shared</div>
                          {ownerDeviceRows.map((device) => (
                            <div key={device.id} className={'share_ownerDeviceRow'}>
                              <div>
                                <div className={'share_ownerDeviceMac'}>{device.device_mac}</div>
                                <div className={'share_ownerDeviceMeta'}>
                                  {device.device_name || device.customer?.name || 'Shared device'}
                                </div>
                              </div>
                              <span className={'share_ownerDeviceStatus'}>
                                {device.delivery?.delivery_status || device.customer?.status || 'active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {ownerStatusCurrent && ownerStatus?.has_active_subscription && ownerStatus.sharing_enabled && (
                      <div className={'share_shareCodeGenerateCard'}>
                        <div>
                          <div className={'share_shareCodeGenerateTitle'}>Share by code</div>
                          {generatedCode ? (
                            <div className={'share_shareCodeValue'}>{generatedCode.code}</div>
                          ) : generatingCode ? (
                            <div className={'share_shareCodeGenerateText'}>Preparing code...</div>
                          ) : (
                            <div className={'share_shareCodeGenerateText'}>Code appears after the fresh subscription check.</div>
                          )}
                          {generatedCodeExpiry && (
                            <div className={'share_shareCodeExpiry'}>Expires {generatedCodeExpiry}</div>
                          )}
                          {shareCodeError && <p className={'share_ownerStatusError'}>{shareCodeError}</p>}
                        </div>
                        <button
                          type="button"
                          className={'share_shareCodeGenerateBtn'}
                          onClick={handleGenerateShareCode}
                          disabled={generatingCode || !ownerHasRoom}
                        >
                          {generatingCode ? 'Checking...' : generatedCode ? 'Refresh' : 'Retry'}
                        </button>
                      </div>
                    )}

                    <div className={'share_shareCodePanel'}>
                      <h3 className={'share_deviceStepTitleAlt'}>Use Share Code</h3>
                      <label htmlFor="share_code" className={'share_deviceLabel'}>
                        Code
                      </label>
                      <input
                        id="share_code"
                        type="text"
                        value={redeemCode}
                        onChange={(event) => {
                          setRedeemCode(formatShareCode(event.target.value));
                          setRedeemCodeError(null);
                          clearTransientDeviceStatus();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleRedeemShareCode();
                          }
                        }}
                        className={`${'share_deviceInput'} ${'share_shareCodeInput'}`}
                        placeholder="ABC-123"
                        autoCapitalize="characters"
                        autoComplete="one-time-code"
                        spellCheck={false}
                        maxLength={7}
                      />
                      {redeemCodeError && <p className={'share_ownerStatusError'}>{redeemCodeError}</p>}
                      {redeemCodeReady && deviceMacCount !== 12 && (
                        <p className={'share_ownerStatusText'}>Add this device MAC below.</p>
                      )}
                      <button
                        type="button"
                        className={'share_shareCodeRedeemBtn'}
                        onClick={handleRedeemShareCode}
                        disabled={redeemingCode || !redeemCodeReady || deviceMacCount !== 12}
                      >
                        {redeemingCode ? (
                          <>
                            <span className={'share_buttonSpinner'} />
                            Redeeming...
                          </>
                        ) : (
                          'Redeem Code'
                        )}
                      </button>
                    </div>

                    <h3 className={'share_deviceStepTitleAlt'}>Device Info</h3>

                    {detectedDeviceMac && (
                      <div className={'share_detectedDeviceCard'}>
                        <div>
                          <div className={'share_detectedDeviceLabel'}>This device detected</div>
                          <div className={'share_detectedDeviceMac'}>{detectedDeviceMac}</div>
                        </div>
                        <button
                          type="button"
                          className={'share_detectedDeviceBtn'}
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

                    <label htmlFor="device_mac" className={'share_deviceLabel'}>
                      MAC Address <span className={'share_required'}>*</span>
                    </label>
                    <div className={'share_deviceMacWrap'}>
                      <input
                        id="device_mac"
                        type="text"
                        value={formData.device_mac}
                        onChange={(event) => {
                          const nextMac = formatMac(event.target.value);
                          setUseDetectedDevice(Boolean(detectedDeviceMac && nextMac === detectedDeviceMac));
                          if (trackedDeviceMac && nextMac !== trackedDeviceMac) {
                            clearTransientDeviceStatus();
                          }
                          setFormData({ ...formData, device_mac: nextMac });
                        }}
                        className={`${'share_deviceInput'} ${'share_mono'}`}
                        placeholder="XX:XX:XX:XX:XX:XX"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={17}
                        disabled={!canEditDevice}
                        required
                      />
                      {deviceMacCount === 12 && <span className={'share_deviceMacStatus'}>OK</span>}
                    </div>
                    <div className={'share_deviceMacCounter'}>{deviceMacCount}/12 characters</div>

                    <details className={'share_deviceMacHelp'}>
                      <summary>Where do I find the MAC address?</summary>
                      <div className={'share_macHelpList'}>
                        <div className={'share_macHelpItem'}><strong>Samsung TV</strong> - Settings &gt; General &gt; Network</div>
                        <div className={'share_macHelpItem'}><strong>Android TV</strong> - Settings &gt; Device Preferences &gt; About &gt; Status</div>
                        <div className={'share_macHelpItem'}><strong>Phone or laptop</strong> - Open this page from that device on the hotspot. If the router provides the device MAC, it fills in automatically.</div>
                        <div className={'share_macHelpItem'}><strong>PlayStation</strong> - Settings &gt; Network &gt; View Connection Status</div>
                        <div className={'share_macHelpItem'}><strong>Other</strong> - Check WiFi or Network settings for MAC Address.</div>
                      </div>
                    </details>

                    <label className={'share_deviceLabel'}>Device Type</label>
                    <div className={'share_deviceTypeGrid'}>
                      {DEVICE_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, device_type: type.value })}
                          disabled={!canEditDevice}
                          className={`${'share_deviceTypeBtn'} ${formData.device_type === type.value ? 'share_deviceTypeBtnActive' : ''}`}
                        >
                          <span>{type.icon}</span>
                          {type.label}
                        </button>
                      ))}
                    </div>

                    <label htmlFor="device_name" className={'share_deviceLabel'}>
                      Device Name <span className={'share_optional'}>(optional)</span>
                    </label>
                    <input
                      id="device_name"
                      type="text"
                      value={formData.device_name}
                      onChange={(event) => setFormData({ ...formData, device_name: event.target.value })}
                      className={'share_deviceInput'}
                      placeholder="e.g. Living Room TV"
                      maxLength={40}
                      disabled={!canEditDevice}
                    />

                    <div className={'share_deviceSummaryCard'}>
                      <div className={'share_deviceSummaryRow'}>
                        <span className={'share_deviceSummaryLabel'}>Sharing allowance</span>
                        <span className={'share_deviceSummaryValue'}>
                          {sharedDeviceLimit} shared device{sharedDeviceLimit === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className={'share_deviceSummaryRow'}>
                        <span className={'share_deviceSummaryLabel'}>Already shared</span>
                        <span className={'share_deviceSummaryValue'}>
                          {ownerStatusCurrent && ownerStatus?.has_active_subscription
                            ? ownerStatus.active_shared_devices ?? 0
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <button type="submit" disabled={submitting || !ownerHasRoom || deviceMacCount !== 12} className={'share_devicePayBtn'}>
                      {submitting ? (
                        <>
                          <span className={'share_buttonSpinner'} />
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

        <footer className={'share_portalFooter'}>
          <p>{portal?.portal_settings?.footer_text || 'Powered by Bitwave Technologies'}</p>
        </footer>
      </div>
    </main>
  );
}
