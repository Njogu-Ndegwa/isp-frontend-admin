'use client';

import { useState } from 'react';
import {
  formFromLatLng,
  geolocationErrorText,
  googleMapsUrl,
  parseLocationText,
  readLocationForm,
  type LocationForm,
} from '../lib/customerLocation';
import { useT } from '../lib/i18n';
import { formatDateGMT3 } from '../lib/dateUtils';

interface Props {
  value: LocationForm;
  onChange: (value: LocationForm) => void;
  /** Prefix for input ids, so two forms on one page never share an id. */
  idPrefix?: string;
  /** When the stored location was captured (edit form only). */
  capturedAt?: string | null;
  /** View-only staff: show the location and the map link, no controls. */
  readOnly?: boolean;
}

/**
 * Optional install location: "Use my current location" (installer on site),
 * a paste box for a Google Maps link or "lat, lng", and the two numbers.
 * Shows an "Open in Google Maps" link once the pair is valid.
 */
export default function CustomerLocationFields({
  value,
  onChange,
  idPrefix = 'location',
  capturedAt,
  readOnly = false,
}: Props) {
  const t = useT();
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const state = readLocationForm(value);
  const hasAny = Boolean(value.latitude.trim() || value.longitude.trim());

  const useCurrentLocation = () => {
    setGpsError(null);
    setPasteError(null);
    setAccuracy(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError(t(geolocationErrorText(null)));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setAccuracy(Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null);
        onChange(formFromLatLng({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        }));
      },
      (err) => {
        setLocating(false);
        setGpsError(t(geolocationErrorText(err?.code ?? null)));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  // Read on paste, Enter or leaving the box, never per keystroke: half-typed
  // "-1.2, 3" would otherwise be taken as a location.
  const applyPaste = (text: string) => {
    setPaste(text);
    setGpsError(null);
    if (!text.trim()) {
      setPasteError(null);
      return;
    }
    const parsed = parseLocationText(text);
    if (parsed.ok) {
      setPasteError(null);
      setAccuracy(null);
      onChange(formFromLatLng(parsed.value));
      setPaste('');
    } else {
      setPasteError(t(parsed.error));
    }
  };

  const mapLink = state.kind === 'valid' ? (
    <a
      href={googleMapsUrl(state.value)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-primary hover:underline"
      data-testid="customer-location-map-link"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {t('Open in Google Maps')}
    </a>
  ) : null;

  const captured = capturedAt ? (
    <p className="text-xs text-foreground-muted">
      {t('Captured {date}', { date: formatDateGMT3(capturedAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) })}
    </p>
  ) : null;

  if (readOnly) {
    return (
      <div className="space-y-2" data-testid="customer-location-fields">
        {state.kind === 'valid' ? (
          <>
            <p className="text-sm text-foreground font-mono">{state.value.lat}, {state.value.lng}</p>
            {mapLink}
            {captured}
          </>
        ) : (
          <p className="text-sm text-foreground-muted">{t('No location saved')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="customer-location-fields">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="btn-secondary text-sm inline-flex items-center gap-2"
          data-testid="use-current-location"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          {locating ? t('Getting location...') : t('Use my current location')}
        </button>
        {hasAny && (
          <button
            type="button"
            onClick={() => {
              setAccuracy(null);
              setGpsError(null);
              setPasteError(null);
              onChange({ latitude: '', longitude: '' });
            }}
            className="text-sm text-foreground-muted hover:text-foreground"
            data-testid="clear-location"
          >
            {t('Clear location')}
          </button>
        )}
      </div>
      <p className="text-xs text-foreground-muted -mt-2">
        {t("Use this when you are at the customer's place. Your browser will ask to share your location.")}
      </p>
      {accuracy !== null && state.kind === 'valid' && (
        <p className="text-xs text-foreground-muted">{t('GPS accuracy about {meters} m', { meters: accuracy })}</p>
      )}
      {gpsError && <p className="text-sm text-danger" role="alert">{gpsError}</p>}

      <div>
        <label htmlFor={`${idPrefix}_paste`} className="block text-sm font-medium text-foreground-muted mb-1.5">
          {t('Or paste a Google Maps link or coordinates')}
        </label>
        <input
          id={`${idPrefix}_paste`}
          type="text"
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            setPasteError(null);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (!pasted) return;
            e.preventDefault();
            applyPaste(pasted);
          }}
          onBlur={() => {
            if (paste.trim()) applyPaste(paste);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault(); // not a form submit
              applyPaste(paste);
            }
          }}
          className="input"
          placeholder="https://www.google.com/maps/@-1.2195,36.8869,17z"
          autoComplete="off"
          data-testid="location-paste"
        />
        {pasteError && <p className="mt-1 text-sm text-danger" role="alert">{pasteError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}_latitude`} className="block text-sm font-medium text-foreground-muted mb-1.5">
            {t('Latitude')}
          </label>
          <input
            id={`${idPrefix}_latitude`}
            type="text"
            value={value.latitude}
            onChange={(e) => {
              setAccuracy(null);
              onChange({ ...value, latitude: e.target.value });
            }}
            className="input font-mono"
            placeholder="-1.2195"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}_longitude`} className="block text-sm font-medium text-foreground-muted mb-1.5">
            {t('Longitude')}
          </label>
          <input
            id={`${idPrefix}_longitude`}
            type="text"
            value={value.longitude}
            onChange={(e) => {
              setAccuracy(null);
              onChange({ ...value, longitude: e.target.value });
            }}
            className="input font-mono"
            placeholder="36.8869"
            autoComplete="off"
          />
        </div>
      </div>
      {state.kind === 'invalid' && <p className="text-sm text-danger">{t(state.error)}</p>}
      {(mapLink || captured) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {mapLink}
          {captured}
        </div>
      )}
    </div>
  );
}
