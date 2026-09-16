'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import type {
  AccessCodeDevice,
  AccessCodeDeviceLimitDetail,
  AccessCodeDevicesResponse,
  DeliveryAttemptStatus,
  PublicDeviceStatusResponse,
  PublicPortalResponse,
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

// Same key the captive portal uses after a voucher / M-Pesa purchase.
const ACCESS_CODE_STORAGE_KEY = 'bitwave_access_code';

const emptyForm = {
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

function readStoredAccessCode(): string {
  try {
    return window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storeAccessCode(code: string) {
  try {
    window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
  } catch {
    /* storage unavailable (private mode, blocked site data) */
  }
}

function sameMac(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return cleanMac(a) === cleanMac(b);
}

function deviceKey(device: AccessCodeDevice): string {
  if (device.pairing_id != null) return `pairing-${device.pairing_id}`;
  return device.is_main_device ? 'main' : `mac-${cleanMac(device.device_mac)}`;
}

function deviceLabel(device: AccessCodeDevice): string {
  const name = device.device_name?.trim();
  if (name) return name;
  if (device.is_main_device) return 'Main device';
  const type = DEVICE_TYPES.find((item) => item.value === device.device_type);
  return type ? type.label : 'Shared device';
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function deviceLimitDetail(err: unknown): AccessCodeDeviceLimitDetail | null {
  if (!(err instanceof ApiError) || err.status !== 409 || !err.detail) return null;
  const detail = err.detail as Partial<AccessCodeDeviceLimitDetail>;
  if (detail.error !== 'device_limit_reached') return null;
  return {
    error: detail.error,
    message: typeof detail.message === 'string' ? detail.message : err.message,
    max_devices: detail.max_devices,
    devices: Array.isArray(detail.devices) ? detail.devices : undefined,
  };
}

const LIMIT_HINT = 'All device slots are in use. Remove a device from the list above, then try again.';

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
  const urlCode = (searchParams.get('code') || '').trim();
  const [portal, setPortal] = useState<PublicPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Step 1: prove ownership with the plan's code.
  const [codeInput, setCodeInput] = useState(urlCode);
  const [plan, setPlan] = useState<AccessCodeDevicesResponse | null>(null);
  const [verifiedCode, setVerifiedCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [autoLookupDone, setAutoLookupDone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Device list actions.
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [connectingThisDevice, setConnectingThisDevice] = useState(false);

  // Add a browserless device by MAC.
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ShareSubscriptionResponse | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<PublicDeviceStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [trackedDeviceMac, setTrackedDeviceMac] = useState('');
  const [useDetectedDevice, setUseDetectedDevice] = useState(false);

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
    if (urlCode) return;
    const stored = readStoredAccessCode();
    if (stored) setCodeInput((prev) => prev || stored);
  }, [urlCode]);

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
        setLoadError(errorMessage(err, 'Failed to load this router.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [identity]);

  const routerId = portal?.router.router_id;

  const refreshDeviceStatus = useCallback(async (macAddress: string) => {
    if (!routerId || !macAddress || !isValidMac(macAddress)) return;

    setStatusLoading(true);
    setStatusError(null);
    try {
      const status = await api.getPublicDeviceStatus(routerId, formatMac(macAddress));
      setDeviceStatus(status);
    } catch (err) {
      setStatusError(errorMessage(err, 'Failed to check device status.'));
    } finally {
      setStatusLoading(false);
    }
  }, [routerId]);

  const loadDevices = useCallback(async (code: string, options?: { keepMessages?: boolean }) => {
    if (!routerId) return false;
    const trimmed = code.trim();
    if (!trimmed) {
      setLookupError('Enter your voucher or access code first.');
      return false;
    }

    setLookingUp(true);
    setLookupError(null);
    if (!options?.keepMessages) {
      setListError(null);
      setListMessage(null);
    }
    try {
      const response = await api.accessCodeDevices({
        code: trimmed,
        router_id: routerId,
        mac_address: detectedDeviceMac || undefined,
      });
      setPlan(response);
      setVerifiedCode(trimmed);
      storeAccessCode(trimmed);
      return true;
    } catch (err) {
      setPlan(null);
      setVerifiedCode('');
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401) {
        setLookupError(errorMessage(err, 'That code was not recognised. Check it and try again.'));
      } else if (status === 410) {
        setLookupError(errorMessage(err, 'This plan has expired. Buy a new plan to reconnect.'));
      } else if (status === 429) {
        setLookupError('Too many attempts. Please wait a minute and try again.');
      } else {
        setLookupError(errorMessage(err, 'Failed to load your devices.'));
      }
      return false;
    } finally {
      setLookingUp(false);
    }
  }, [detectedDeviceMac, routerId]);

  useEffect(() => {
    if (autoLookupDone || !routerId || !urlCode) return;
    setAutoLookupDone(true);
    void loadDevices(urlCode);
  }, [autoLookupDone, loadDevices, routerId, urlCode]);

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

  const devices = plan?.devices ?? [];
  const maxDevices = Math.max(1, Number(plan?.max_devices) || 1);
  const devicesInUse = Math.max(0, Number(plan?.device_count ?? devices.length) || 0);
  const freeSlots = Math.max(0, Number(plan?.available_devices) || 0);
  const planAllowsSharing = Boolean(plan?.sharing_enabled && maxDevices > 1);
  const hasFreeSlot = Boolean(plan && freeSlots > 0);
  const planExpiry = formatExpiry(plan?.expires_at);
  const detectedDeviceOnPlan = Boolean(
    detectedDeviceMac &&
    devices.some((device) => device.is_this_device || sameMac(device.device_mac, detectedDeviceMac))
  );
  const canConnectThisDevice = Boolean(plan && detectedDeviceMac && !detectedDeviceOnPlan && hasFreeSlot);
  const canEditDevice = Boolean(plan && planAllowsSharing && hasFreeSlot);

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
    if (!trackedDeviceMac || !routerId) return;

    const status = activeDelivery?.delivery_status;
    if (status && status !== 'activating') return;

    const intervalId = window.setInterval(() => {
      void refreshDeviceStatus(trackedDeviceMac);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [activeDelivery?.delivery_status, refreshDeviceStatus, routerId, trackedDeviceMac]);

  const rememberShareResponse = useCallback((response: ShareSubscriptionResponse) => {
    setResult(response);
    setTrackedDeviceMac(response.device_mac);
    setDeviceStatus(null);
    setFormData((prev) => ({
      ...prev,
      device_mac: detectedDeviceInUse ? response.device_mac : '',
      device_name: '',
    }));
    void refreshDeviceStatus(response.device_mac);
  }, [detectedDeviceInUse, refreshDeviceStatus]);

  const resetPlan = () => {
    setPlan(null);
    setVerifiedCode('');
    setLookupError(null);
    setListError(null);
    setListMessage(null);
    setSubmitError(null);
    setCopied(false);
    clearTransientDeviceStatus();
  };

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearTransientDeviceStatus();
    setSubmitError(null);
    setCopied(false);
    await loadDevices(codeInput);
  };

  const handleCopyShareCode = async () => {
    const code = plan?.share_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      window.prompt('Copy this code', code);
    }
  };

  const handleRemoveDevice = async (device: AccessCodeDevice) => {
    if (!routerId || !verifiedCode || removingKey) return;
    if (!device.is_main_device && device.pairing_id == null) return;

    const label = deviceLabel(device);
    const warning = device.is_this_device ? ' This device will lose internet access.' : '';
    const confirmed = window.confirm(`Remove ${label} (${device.device_mac}) from this plan?${warning}`);
    if (!confirmed) return;

    const key = deviceKey(device);
    setRemovingKey(key);
    setListError(null);
    setListMessage(null);
    try {
      const response = await api.accessCodeDisconnect({
        code: verifiedCode,
        router_id: routerId,
        ...(device.is_main_device ? { main_device: true } : { pairing_id: device.pairing_id ?? undefined }),
        mac_address: detectedDeviceMac || undefined,
      });
      setListMessage(response.message || 'Device removed.');
      if (sameMac(device.device_mac, trackedDeviceMac)) clearTransientDeviceStatus();
      await loadDevices(verifiedCode, { keepMessages: true });
    } catch (err) {
      setListError(errorMessage(err, 'Failed to remove this device.'));
    } finally {
      setRemovingKey(null);
    }
  };

  const handleConnectThisDevice = async () => {
    if (!routerId || !verifiedCode || !detectedDeviceMac || connectingThisDevice) return;

    setConnectingThisDevice(true);
    setListError(null);
    setListMessage(null);
    try {
      const response = await api.accessCodeRedeem({
        code: verifiedCode,
        router_id: routerId,
        mac_address: detectedDeviceMac,
      });
      setListMessage(response.message || 'This device is now connected.');
      await loadDevices(verifiedCode, { keepMessages: true });
    } catch (err) {
      const limit = deviceLimitDetail(err);
      if (limit) {
        setListError(`${limit.message} ${LIMIT_HINT}`);
        if (limit.devices) {
          const limitDevices = limit.devices;
          setPlan((prev) => (prev
            ? { ...prev, devices: limitDevices, device_count: limitDevices.length, available_devices: 0 }
            : prev));
        }
      } else {
        setListError(errorMessage(err, 'Failed to connect this device.'));
      }
    } finally {
      setConnectingThisDevice(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!routerId || !verifiedCode) return;

    if (!hasFreeSlot) {
      setSubmitError(LIMIT_HINT);
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
        access_code: verifiedCode,
        router_id: routerId,
        device_mac: normalizedDeviceMac,
        device_name: formData.device_name.trim() || null,
        device_type: formData.device_type,
      };
      const response = await api.shareSubscriptionDevice(payload);
      rememberShareResponse(response);
      void loadDevices(verifiedCode, { keepMessages: true });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const message = errorMessage(err, 'Failed to add this device.');
      if (status === 409) {
        setSubmitError(`${message} ${LIMIT_HINT}`);
        void loadDevices(verifiedCode, { keepMessages: true });
      } else if (status === 401) {
        setSubmitError('Your code is no longer valid. Enter it again to continue.');
      } else {
        setSubmitError(message);
      }
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
          <div className={'share_welcomeKicker'}>Your plan</div>
          <h2 className={'share_welcomeTitle'}>Manage your devices</h2>
          <p className={'share_welcomeSub'}>
            See which devices use your plan, share it with another device, or remove one.
          </p>
        </section>

        <div className={'share_quickSteps'}>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>1</span>
            <span className={'share_stepText'}>Enter code</span>
          </div>
          <div className={'share_stepArrow'}>-</div>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>2</span>
            <span className={'share_stepText'}>See devices</span>
          </div>
          <div className={'share_stepArrow'}>-</div>
          <div className={'share_step'}>
            <span className={'share_stepNum'}>3</span>
            <span className={'share_stepText'}>Share or remove</span>
          </div>
        </div>

        <section className={'share_deviceSection'}>
          <div className={'share_deviceEntry'}>
            <div className={'share_deviceEntryHeader'}>
              <span className={'share_deviceEntryIcon'}>TV</span>
              <div className={'share_deviceEntryText'}>
                <div className={'share_deviceEntryTitle'}>Share your plan</div>
                <div className={'share_deviceEntrySubtitle'}>
                  {plan
                    ? `This plan allows up to ${maxDevices} device${maxDevices === 1 ? '' : 's'}`
                    : 'Phones, laptops, smart TVs and consoles'}
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
              ) : (
                <>
                  <div className={'share_deviceStepsBar'} aria-hidden="true">
                    <span className={`${'share_deviceStepDot'} ${plan ? 'share_deviceStepDone' : 'share_deviceStepActive'}`}>1</span>
                    <span className={`${'share_deviceStepLine'} ${plan ? 'share_deviceStepLineDone' : ''}`} />
                    <span className={`${'share_deviceStepDot'} ${plan ? 'share_deviceStepDone' : ''}`}>2</span>
                    <span className={`${'share_deviceStepLine'} ${plan ? 'share_deviceStepLineDone' : ''}`} />
                    <span className={`${'share_deviceStepDot'} ${plan ? 'share_deviceStepActive' : ''}`}>3</span>
                  </div>

                  <form onSubmit={handleLookup} autoComplete="off">
                    <h3 className={'share_deviceStepTitle'}>Enter your voucher or access code</h3>

                    <label htmlFor="access_code" className={'share_deviceLabel'}>
                      Voucher, access code or M-Pesa receipt <span className={'share_required'}>*</span>
                    </label>
                    <input
                      id="access_code"
                      type="text"
                      value={codeInput}
                      onChange={(event) => {
                        const next = event.target.value;
                        setCodeInput(next);
                        if (plan && next.trim() !== verifiedCode) resetPlan();
                        setLookupError(null);
                      }}
                      className={`${'share_deviceInput'} ${'share_mono'}`}
                      placeholder="e.g. ABC-DEF"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={40}
                      aria-describedby="access_code_help"
                      aria-invalid={lookupError ? true : undefined}
                      required
                    />
                    <div id="access_code_help" className={'share_deviceMacCounter'}>
                      The code shown after you paid, your voucher, or your M-Pesa receipt number.
                    </div>

                    <button
                      type="submit"
                      className={'share_ownerCheckBtn'}
                      disabled={lookingUp || !codeInput.trim()}
                    >
                      {lookingUp ? (
                        <>
                          <span className={'share_buttonSpinner'} />
                          Checking...
                        </>
                      ) : plan ? (
                        'Refresh my devices'
                      ) : (
                        'Show my devices'
                      )}
                    </button>

                    {lookupError && (
                      <p className={'share_ownerStatusError'} role="alert">{lookupError}</p>
                    )}
                  </form>

                  {plan && (
                    <div
                      className={`${'share_ownerStatusCard'} ${hasFreeSlot ? 'share_ownerStatusOk' : 'share_ownerStatusWarn'}`}
                      aria-live="polite"
                    >
                      <div className={'share_ownerStatusHeader'}>
                        <div>
                          <h3 className={'share_ownerStatusTitle'}>{plan.plan_name || 'Your plan'}</h3>
                          <p className={'share_ownerStatusText'}>
                            {devicesInUse} of {maxDevices} device{maxDevices === 1 ? '' : 's'} in use
                          </p>
                        </div>
                        <span className={'share_ownerStatusBadge'} aria-hidden="true">
                          {devicesInUse}/{maxDevices}
                        </span>
                      </div>

                      <div className={'share_ownerStatusDetails'}>
                        {planExpiry && (
                          <div className={'share_deviceSummaryRow'}>
                            <span className={'share_deviceSummaryLabel'}>Active until</span>
                            <span className={'share_deviceSummaryValue'}>{planExpiry}</span>
                          </div>
                        )}
                        <div className={'share_deviceSummaryRow'}>
                          <span className={'share_deviceSummaryLabel'}>Free slots</span>
                          <span className={'share_deviceSummaryValue'}>{freeSlots}</span>
                        </div>
                      </div>

                      {plan.share_code && planAllowsSharing && (
                        <div className={'share_shareCodeGenerateCard'}>
                          <div>
                            <div className={'share_shareCodeGenerateTitle'}>Your code</div>
                            <div className={'share_shareCodeValue'}>{plan.share_code}</div>
                            <div className={'share_shareCodeGenerateText'}>
                              Enter this code on your other devices in the WiFi login page under &apos;Voucher or access code&apos;.
                            </div>
                          </div>
                          <button
                            type="button"
                            className={'share_shareCodeGenerateBtn'}
                            onClick={() => void handleCopyShareCode()}
                            aria-label={`Copy code ${plan.share_code}`}
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {!planAllowsSharing && (
                        <p className={'share_ownerStatusText'}>This plan is for one device only.</p>
                      )}

                      {canConnectThisDevice && (
                        <div className={'share_detectedDeviceCard'} style={{ marginTop: 'var(--space-md)' }}>
                          <div>
                            <div className={'share_detectedDeviceLabel'}>This device is not on the plan</div>
                            <div className={'share_detectedDeviceMac'}>{detectedDeviceMac}</div>
                          </div>
                          <button
                            type="button"
                            className={'share_detectedDeviceBtn'}
                            onClick={() => void handleConnectThisDevice()}
                            disabled={connectingThisDevice}
                          >
                            {connectingThisDevice ? 'Connecting...' : 'Connect this device'}
                          </button>
                        </div>
                      )}

                      <div className={'share_ownerDevicesList'}>
                        <h4 className={'share_ownerDevicesTitle'} style={{ margin: 0 }}>Devices on this plan</h4>
                        {devices.length === 0 ? (
                          <p className={'share_ownerStatusText'}>No devices are connected yet.</p>
                        ) : (
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {devices.map((device) => {
                              const key = deviceKey(device);
                              const label = deviceLabel(device);
                              const removable = device.is_main_device || device.pairing_id != null;
                              const addedAt = formatExpiry(device.added_at);
                              return (
                                <li key={key} className={'share_ownerDeviceRow'}>
                                  <div>
                                    <div className={'share_ownerDeviceMeta'} style={{ color: 'var(--text)', fontWeight: 800 }}>
                                      {label}
                                    </div>
                                    <div className={'share_ownerDeviceMac'}>{device.device_mac}</div>
                                    {(device.is_main_device && device.device_name) || addedAt ? (
                                      <div className={'share_ownerDeviceMeta'}>
                                        {device.is_main_device && device.device_name ? 'Main device' : null}
                                        {device.is_main_device && device.device_name && addedAt ? ' · ' : null}
                                        {addedAt ? `Added ${addedAt}` : null}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className={'share_ownerDeviceActions'}>
                                    {device.is_this_device && (
                                      <span className={'share_ownerDeviceStatus'}>This device</span>
                                    )}
                                    {removable && (
                                      <button
                                        type="button"
                                        className={'share_ownerDeviceDisconnect'}
                                        onClick={() => void handleRemoveDevice(device)}
                                        disabled={removingKey !== null}
                                        aria-label={`Remove ${label} (${device.device_mac})`}
                                      >
                                        {removingKey === key ? 'Removing...' : 'Remove'}
                                      </button>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {listMessage && <p className={'share_ownerStatusText'} role="status">{listMessage}</p>}
                      {listError && <p className={'share_ownerStatusError'} role="alert">{listError}</p>}
                    </div>
                  )}

                  {plan && planAllowsSharing && (
                    <form onSubmit={handleSubmit} autoComplete="off">
                      <h3 className={'share_deviceStepTitleAlt'}>Add a device without a browser (TV, console)</h3>

                      {statusCopy && visibleDeviceMac && (
                        <div className={`${'share_deviceStatusWrap'} ${statusToneClass}`} aria-live="polite">
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
                        <div className={'share_deviceErrorWrap'} role="alert">
                          <div className={'share_deviceErrorIcon'}>X</div>
                          <div>
                            <h3 className={'share_deviceErrorTitle'}>Something went wrong</h3>
                            <p className={'share_deviceErrorMsg'}>{submitError || statusError}</p>
                          </div>
                        </div>
                      )}

                      {!hasFreeSlot && (
                        <p className={'share_ownerStatusError'}>{LIMIT_HINT}</p>
                      )}

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
                            disabled={!canEditDevice}
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
                            setSubmitError(null);
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
                          aria-describedby="device_mac_counter"
                          required
                        />
                        {deviceMacCount === 12 && <span className={'share_deviceMacStatus'}>OK</span>}
                      </div>
                      <div id="device_mac_counter" className={'share_deviceMacCounter'}>{deviceMacCount}/12 characters</div>

                      <details className={'share_deviceMacHelp'}>
                        <summary>Where do I find the MAC address?</summary>
                        <div className={'share_macHelpList'}>
                          <div className={'share_macHelpItem'}><strong>Samsung TV</strong> - Settings &gt; General &gt; Network</div>
                          <div className={'share_macHelpItem'}><strong>Android TV</strong> - Settings &gt; Device Preferences &gt; About &gt; Status</div>
                          <div className={'share_macHelpItem'}><strong>Phone or laptop</strong> - You don&apos;t need the MAC. Open the WiFi login page on that device and enter your code under &apos;Voucher or access code&apos;.</div>
                          <div className={'share_macHelpItem'}><strong>PlayStation</strong> - Settings &gt; Network &gt; View Connection Status</div>
                          <div className={'share_macHelpItem'}><strong>Other</strong> - Check WiFi or Network settings for MAC Address.</div>
                        </div>
                      </details>

                      <span id="device_type_label" className={'share_deviceLabel'}>Device Type</span>
                      <div className={'share_deviceTypeGrid'} role="group" aria-labelledby="device_type_label">
                        {DEVICE_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, device_type: type.value })}
                            disabled={!canEditDevice}
                            aria-pressed={formData.device_type === type.value}
                            className={`${'share_deviceTypeBtn'} ${formData.device_type === type.value ? 'share_deviceTypeBtnActive' : ''}`}
                          >
                            <span aria-hidden="true">{type.icon}</span>
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
                          <span className={'share_deviceSummaryLabel'}>Devices in use</span>
                          <span className={'share_deviceSummaryValue'}>
                            {devicesInUse}/{maxDevices}
                          </span>
                        </div>
                      </div>

                      <button type="submit" disabled={submitting || !canEditDevice || deviceMacCount !== 12} className={'share_devicePayBtn'}>
                        {submitting ? (
                          <>
                            <span className={'share_buttonSpinner'} />
                            Adding device...
                          </>
                        ) : !hasFreeSlot ? (
                          'No free slots'
                        ) : (
                          'Add Device'
                        )}
                      </button>
                    </form>
                  )}
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
