/**
 * LocationShareBubble — Telegram-style shared-location card.
 * - OpenStreetMap static tile preview (no API key) with graceful fallback UI
 * - Persistent reverse-geocode cache (opt-in via Privacy settings)
 * - Optional distance + ETA from user's current location (opt-in)
 * - Explicit "Open in Maps" button + tap-anywhere fallback
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ImageOff from "lucide-react/dist/esm/icons/image-off";
import { useLocationSharePrefs } from "@/hooks/useLocationSharePrefs";
import { resolveMapsKey } from "@/lib/mapsKey";
import { zivoRouteUrl } from "@/lib/maps/openInZivoMap";
import {
  reverseGeocode,
  getCachedAddress,
  haversineMeters,
  formatDistance,
  formatDriveEta,
} from "@/lib/geocodeCache";

interface LocationShareBubbleProps {
  lat: number;
  lng: number;
  label?: string;
  isMe: boolean;
  time: string;
}

export default function LocationShareBubble({ lat, lng, label, isMe, time }: LocationShareBubbleProps) {
  const { prefs } = useLocationSharePrefs();
  const [address, setAddress] = useState<string | null>(() =>
    prefs.showAddress ? getCachedAddress(lat, lng) : null
  );
  const [route, setRoute] = useState<{ meters: number } | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  // Reverse geocode — only when user opted in
  useEffect(() => {
    if (!prefs.showAddress) { setAddress(null); return; }
    let cancelled = false;
    const cached = getCachedAddress(lat, lng);
    if (cached) { setAddress(cached); return; }
    reverseGeocode(lat, lng).then((a) => { if (!cancelled) setAddress(a); });
    return () => { cancelled = true; };
  }, [lat, lng, prefs.showAddress]);

  // Distance + ETA — only when user opted in
  useEffect(() => {
    if (!prefs.showRoute || typeof navigator === "undefined" || !navigator.geolocation) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const m = haversineMeters(pos.coords.latitude, pos.coords.longitude, lat, lng);
        setRoute({ meters: m });
      },
      () => { if (!cancelled) setRoute(null); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, [lat, lng, prefs.showRoute]);

  const navigate = useNavigate();
  // Open shared locations inside ZIVO's own ride-hub map so the chat
  // experience stays in-app. The user can decide to book a ride from there.
  const mapUrl = zivoRouteUrl({ lat, lng, label: label || "Shared Location" });

  // Prefer Google Static Maps when a key is available — it's the most
  // reliable. Resolved async via env var or the maps-api-key edge function;
  // until it loads we show the dotted-grid placeholder. The previous
  // staticmap.openstreetmap.de fallback was removed because the service went
  // offline (returns broken-image icons).
  const [googleKey, setGoogleKey] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void resolveMapsKey().then((k) => { if (!cancelled) setGoogleKey(k); });
    return () => { cancelled = true; };
  }, []);

  const staticMapUrl = googleKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=520x280&scale=2&markers=color:red%7C${lat},${lng}&key=${googleKey}`
    : null;

  // Reset failure state when the URL flips (e.g. OSM fallback → Google Maps
  // once the key resolves) so the bubble can render the better preview.
  useEffect(() => { setImgFailed(false); }, [staticMapUrl]);

  const title = label || "Shared Location";
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="block max-w-[80%] min-w-[260px] rounded-2xl overflow-hidden border border-border/30 bg-card shadow-sm">
        {/* Map preview (whole area is a tap target → opens ZIVO map) */}
        <button
          type="button"
          onClick={() => navigate(mapUrl)}
          aria-label="Open in ZIVO map"
          className="relative block w-full h-[140px] bg-muted overflow-hidden group text-left"
        >
          {staticMapUrl && !imgFailed ? (
            <img
	              src={staticMapUrl}
	              alt="Map preview"
	              loading="lazy"
	              decoding="async"
	              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImgFailed(true)}
            />
          ) : (
            // Fallback placeholder — clean dotted grid + muted pin
            <div className="absolute inset-0 bg-muted">
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full opacity-40"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="map-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="1" fill="currentColor" className="text-muted-foreground/40" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#map-dots)" />
              </svg>
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <ImageOff className="w-3 h-3" />
                Map preview unavailable
              </div>
            </div>
          )}

          {/* Subtle gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />

          {/* Center pin */}
          <div className="absolute inset-0 flex items-start justify-center pt-[44px] pointer-events-none">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-primary/25 blur-md animate-pulse" />
              <div className="relative w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-2 ring-background">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
          </div>
        </button>

        {/* Info */}
        <div className="px-3 pt-2.5 pb-3 bg-card">
          <p className="text-[13.5px] font-semibold text-foreground leading-tight line-clamp-2 break-words">
            {title}
          </p>

          {prefs.showAddress && address && (
            <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug line-clamp-2 break-words">
              {address}
            </p>
          )}

          {/* Route pill */}
          {prefs.showRoute && route && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              <Navigation className="w-3 h-3" />
              <span>{formatDistance(route.meters)} · ~{formatDriveEta(route.meters)}</span>
            </div>
          )}

          {/* Open in Maps button + meta row */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(mapUrl)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11.5px] font-semibold active:scale-95 transition-transform shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5" />
              Open in ZIVO
              <ChevronRight className="w-3.5 h-3.5 -mr-1 opacity-80" />
            </button>
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[10px] text-muted-foreground/80 font-mono truncate max-w-[120px]">
                {coords}
              </span>
              <span className="text-[10px] text-muted-foreground">{time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
