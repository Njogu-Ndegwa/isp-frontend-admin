'use client';

import { useEffect, useRef } from 'react';
import { Rating, CustomerMapData } from '../lib/types';

interface RatingsMapProps {
  ratings: Rating[];
  mapData: CustomerMapData[];
  onSelectRating: (id: number | null) => void;
  selectedRating: number | null;
}

export default function RatingsMap({ ratings, mapData, onSelectRating, selectedRating }: RatingsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  // Custom marker icons based on rating
  const createMarkerIcon = (L: typeof import('leaflet'), rating: number) => {
    const color = rating >= 4 ? '#22c55e' : rating >= 3 ? '#f59e0b' : '#ef4444';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
        <path fill="${color}" stroke="#fff" stroke-width="1" d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24C24 5.4 18.6 0 12 0z"/>
        <circle fill="#fff" cx="12" cy="12" r="6"/>
        <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${rating}</text>
      </svg>
    `;
    return L.divIcon({
      html: svg,
      className: 'custom-marker',
      iconSize: [24, 36],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36],
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    const initMap = async () => {
      const L = await import('leaflet');
      
      leafletRef.current = L;

      // Initialize map centered on Kenya (Nairobi area)
      mapRef.current = L.map(mapContainerRef.current!, {
        center: [-1.2864, 36.8172],
        zoom: 12,
        zoomControl: true,
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Add markers after map is initialized
      updateMarkers(L);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMarkers = (L: typeof import('leaflet')) => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Combine ratings with location and mapData
    const ratingsWithLocation = ratings.filter((r) => r.latitude && r.longitude);
    const bounds: [number, number][] = [];

    // Add rating markers
    ratingsWithLocation.forEach((rating) => {
      if (!rating.latitude || !rating.longitude) return;

      const marker = L.marker([rating.latitude, rating.longitude], {
        icon: createMarkerIcon(L, rating.rating),
      });

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <strong style="font-size: 14px;">${rating.phone}</strong>
            ${rating.customer_name ? `<span style="color: #666; font-size: 12px;">(${rating.customer_name})</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            ${[1, 2, 3, 4, 5].map((star) => `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= rating.rating ? '#f59e0b' : '#d1d5db'}">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            `).join('')}
          </div>
          ${rating.comment ? `<p style="margin: 0; color: #666; font-size: 13px; line-height: 1.4;">"${rating.comment}"</p>` : ''}
          <p style="margin: 8px 0 0; font-size: 11px; color: #999;">
            ${new Date(rating.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        onSelectRating(rating.id);
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
      bounds.push([rating.latitude, rating.longitude]);
    });

    // Also add customers from mapData that have location but may not have ratings in current filter
    mapData.forEach((customer) => {
      if (!customer.latitude || !customer.longitude) return;
      
      // Skip if already added from ratings
      const alreadyAdded = ratingsWithLocation.some(
        (r) => r.latitude === customer.latitude && r.longitude === customer.longitude
      );
      if (alreadyAdded) return;

      const ratingValue = customer.average_rating || 0;
      const marker = L.marker([customer.latitude, customer.longitude], {
        icon: createMarkerIcon(L, Math.round(ratingValue) || 3),
      });

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <strong style="font-size: 14px;">${customer.phone}</strong>
            ${customer.name ? `<span style="color: #666; font-size: 12px;">(${customer.name})</span>` : ''}
          </div>
          ${customer.average_rating ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              ${[1, 2, 3, 4, 5].map((star) => `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${star <= Math.round(customer.average_rating!) ? '#f59e0b' : '#d1d5db'}">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              `).join('')}
              <span style="color: #666; font-size: 12px; margin-left: 4px;">(${customer.total_ratings || 0} ratings)</span>
            </div>
          ` : '<p style="color: #999; font-size: 12px;">No ratings yet</p>'}
          ${customer.last_rating_comment ? `<p style="margin: 0; color: #666; font-size: 13px; line-height: 1.4;">"${customer.last_rating_comment}"</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
      bounds.push([customer.latitude, customer.longitude]);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  // Update markers when ratings change
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    updateMarkers(leafletRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratings, mapData]);

  // Handle selected rating change - open popup for selected marker
  useEffect(() => {
    if (!mapRef.current || !selectedRating) return;

    const selectedRatingData = ratings.find((r) => r.id === selectedRating);
    if (!selectedRatingData?.latitude || !selectedRatingData?.longitude) return;

    // Find and open the popup for the selected rating
    markersRef.current.forEach((marker) => {
      const latLng = marker.getLatLng();
      if (
        latLng.lat === selectedRatingData.latitude &&
        latLng.lng === selectedRatingData.longitude
      ) {
        marker.openPopup();
        mapRef.current?.setView(latLng, 14);
      }
    });
  }, [selectedRating, ratings]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="h-[500px] rounded-xl overflow-hidden"
        style={{ background: '#1a1a2e' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background-secondary/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-xs font-medium text-foreground mb-2">Rating Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-foreground-muted">4-5 stars (Positive)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs text-foreground-muted">3 stars (Neutral)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-xs text-foreground-muted">1-2 stars (Negative)</span>
          </div>
        </div>
      </div>

      {/* Map Controls Info */}
      <div className="absolute top-4 right-4 bg-background-secondary/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-[1000]">
        <p className="text-xs text-foreground-muted">Click markers for details</p>
      </div>
    </div>
  );
}
