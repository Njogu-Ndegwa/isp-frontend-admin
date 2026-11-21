'use client';

/*
 * A place picked on a map, for a form's latitude/longitude pair (fields the backend
 * marks x-geo): an OpenStreetMap map to tap or drag a pin on, "Use my location" for
 * someone standing at the customer's door, and a search for a place name. The two
 * numbers stay visible underneath, small, for anyone who wants to check them.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n';
import { CloseIcon, SpinnerIcon } from './icons';

type LatLng = { lat: number; lng: number };
const NAIROBI: LatLng = { lat: -1.2864, lng: 36.8172 };
const round = (v: number) => Math.round(v * 1e6) / 1e6;

const PIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40"><path fill="#f5a524" stroke="#111" stroke-opacity=".35" d="M14 1C7 1 1.5 6.5 1.5 13.4 1.5 22.5 14 39 14 39s12.5-16.5 12.5-25.6C26.5 6.5 21 1 14 1z"/><circle cx="14" cy="13.5" r="5" fill="#111"/></svg>`;

type Hit = { display_name: string; lat: string; lon: string };

export default function LocationPicker({ value, onChange, disabled, label }: {
  value: LatLng | null;
  onChange: (v: LatLng | null) => void;
  disabled?: boolean;
  label: string;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<import('leaflet').Map | null>(null);
  const marker = useRef<import('leaflet').Marker | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);

  // the map, once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import('leaflet');
      if (cancelled || !box.current || map.current) return;
      L.current = leaflet;
      const start = value ?? NAIROBI;
      const m = leaflet.map(box.current, { center: [start.lat, start.lng], zoom: value ? 17 : 12, zoomControl: true, attributionControl: true });
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(m);
      m.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        if (!disabled) change.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
      });
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the pin follows the value; dragging it sets the value
  useEffect(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!ready || !leaflet || !m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const icon = leaflet.divIcon({ html: PIN, className: '', iconSize: [28, 40], iconAnchor: [14, 39] });
      marker.current = leaflet.marker([value.lat, value.lng], { icon, draggable: !disabled }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        change.current({ lat: round(p.lat), lng: round(p.lng) });
      });
    } else {
      marker.current.setLatLng([value.lat, value.lng]);
    }
  }, [ready, value, disabled]);

  const goTo = (p: LatLng, zoom = 17) => map.current?.setView([p.lat, p.lng], zoom);

  const here = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setError(t('This phone cannot share its location.')); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        onChange(p);
        goTo(p, 18);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(err.code === 1 ? t('Location is blocked for this site. Allow it in the browser, or tap the map.') : t('Could not get your location. Tap the map instead.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ke,ug,tz,rw,ng,gh,zm&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'en' } });
      const rows = (await r.json()) as Hit[];
      setHits(Array.isArray(rows) ? rows : []);
    } catch {
      setError(t('Search is not answering. Move the map and tap the place instead.'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        <span className="text-[11.5px] text-ink-3">{t('optional')}</span>
      </div>
      <div className="mb-2 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} disabled={disabled}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
          placeholder={t('Search a place, e.g. Wangige market')} enterKeyHint="search"
          className="w-full min-w-0 rounded-[12px] border border-line-strong bg-[var(--ai-bg)] px-3.5 py-2.5 text-[16px] text-ink-1 outline-none placeholder:text-ink-3 focus:border-accent/70" />
        <button type="button" className="ai-btn ai-btn-ghost shrink-0 px-3.5" disabled={disabled || searching || query.trim().length < 3} onClick={() => void search()}>
          {searching ? <SpinnerIcon /> : t('Find')}
        </button>
      </div>
      {hits ? (
        <ul className="ai-well m-0 mb-2 list-none divide-y divide-line p-0 text-[13px]">
          {hits.length ? hits.map((h) => (
            <li key={`${h.lat},${h.lon}`}>
              <button type="button" className="block w-full px-3 py-2 text-left text-ink-2 hover:bg-surface-2"
                onClick={() => { const p = { lat: round(Number(h.lat)), lng: round(Number(h.lon)) }; goTo(p); onChange(p); setHits(null); }}>
                {h.display_name}
              </button>
            </li>
          )) : <li className="px-3 py-2 text-ink-3">{t('Nothing found. Move the map and tap the place instead.')}</li>}
        </ul>
      ) : null}
      {/* touch-pan-y off inside the map so a finger moves the map, not the chat */}
      <div ref={box} role="application" aria-label={t('Map: tap where the customer is')}
        className="relative z-0 h-[260px] w-full overflow-hidden rounded-[14px] border border-line-strong bg-surface-2 @md:h-[300px]" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="ai-chip !py-1.5 text-[12.5px] font-medium" disabled={disabled || locating} onClick={here}>
          {locating ? <SpinnerIcon width={12} height={12} /> : null}{t('Use my location')}
        </button>
        {value ? (
          <>
            <span className="ai-mono text-[12px] text-ink-3">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
            <button type="button" className="ai-btn ai-btn-quiet ml-auto !min-h-0 px-2 py-1 text-[12px]" disabled={disabled} onClick={() => onChange(null)}>
              <CloseIcon width={12} height={12} /> {t('Clear')}
            </button>
          </>
        ) : <span className="text-[12px] text-ink-3">{t('Tap the map where the customer is.')}</span>}
      </div>
      {error ? <p role="alert" className="mt-1.5 text-[12px] text-[var(--ai-text-bad)]">{error}</p> : null}
    </div>
  );
}
