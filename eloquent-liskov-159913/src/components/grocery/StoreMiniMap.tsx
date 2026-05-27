/**
 * StoreMiniMap — Interactive Google Map thumbnail for the store profile rail.
 * Features: light tile style matching the main store map, user location blue
 * dot, zoom/recenter controls, and distance label.
 */
import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink, Plus, Minus, Locate, Timer, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { distanceMiles } from "@/hooks/useStorePins";
import { zivoRouteUrl } from "@/lib/maps/openInZivoMap";

interface StoreMiniMapProps {
  latitude?: number | null;
  longitude?: number | null;
  storeId?: string;
  storeName: string;
  slug: string;
  address?: string | null;
  userLoc?: { lat: number; lng: number } | null;
  isLodging?: boolean;
}

let cachedKey: string | null = null;

async function getMapsKey(): Promise<string> {
  if (cachedKey !== null) return cachedKey;
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
  try {
    const { data, error } = await supabase.functions.invoke("maps-api-key");
    if (!error && data?.key) { cachedKey = data.key; return data.key; }
  } catch { /* fallthrough */ }
  cachedKey = envKey;
  return envKey;
}

async function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if ((window as any).google?.maps) return true;
  const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existing) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(check); resolve(true); }
      }, 150);
      setTimeout(() => { clearInterval(check); resolve(!!(window as any).google?.maps); }, 8000);
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

const LIGHT_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#eef5f2" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#dfe7e3" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cfd8d3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#cfdad5" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8fc" }] },
];

function makeUserDot(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="10" fill="rgba(66,133,244,0.15)"/>
    <circle cx="11" cy="11" r="6" fill="#4285F4" stroke="#fff" stroke-width="2.5"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function fmtDistance(mi: number): string {
  const km = mi * 1.609344;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function fmtWalk(mi: number): string {
  const mins = Math.ceil((mi * 1.609344 / 5) * 60);
  if (mins < 2) return "< 1 min";
  if (mins >= 60) return `${Math.round(mins / 60)} h walk`;
  return `${mins} min walk`;
}

export default function StoreMiniMap({ latitude, longitude, storeId, storeName, slug, address, userLoc, isLodging }: StoreMiniMapProps) {
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";
  const focusTarget = storeId || slug;
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userDotRef = useRef<any>(null);
  const tilesLoadedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [mapsKey, setMapsKey] = useState("");

  useEffect(() => {
    if (!hasCoords) return;
    let cancelled = false;
    let tileTimer: ReturnType<typeof setTimeout> | undefined;
    tilesLoadedRef.current = false;
    setTilesLoaded(false);
    setFailed(false);
    setReady(false);
    const previousAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      previousAuthFailure?.();
      if (!cancelled) setFailed(true);
    };

    (async () => {
      const key = await getMapsKey();
      if (!key) { setFailed(true); return; }
      if (!cancelled) setMapsKey(key);
      const ok = await loadGoogleMaps(key);
      if (!ok || cancelled || !containerRef.current) { setFailed(true); return; }

      const google = (window as any).google;
      const mapsLibrary = google?.maps?.importLibrary
        ? await google.maps.importLibrary("maps")
        : google?.maps;
      const MapCtor = mapsLibrary?.Map || google?.maps?.Map;
      if (!MapCtor || cancelled || !containerRef.current) {
        setFailed(true);
        return;
      }
      const center = { lat: latitude as number, lng: longitude as number };
      const map = new MapCtor(containerRef.current, {
        center,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        clickableIcons: false,
        backgroundColor: "#f5f5f5",
        styles: LIGHT_STYLES,
      });
      mapRef.current = map;

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <defs><filter id="ps" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25"/>
          </filter></defs>
          <g filter="url(#ps)">
            <path d="M16 2C9.4 2 4 7.4 4 14c0 9 12 22 12 22s12-13 12-22C28 7.4 22.6 2 16 2z"
                  fill="#10b981" stroke="#ffffff" stroke-width="2"/>
            <circle cx="16" cy="14" r="4.5" fill="#ffffff"/>
          </g>
        </svg>`;

      const markerLibrary = google?.maps?.importLibrary
        ? await google.maps.importLibrary("marker")
        : google?.maps;
      const MarkerCtor = google?.maps?.Marker || markerLibrary?.Marker;
      if (MarkerCtor) {
        const marker = new MarkerCtor({
          position: center,
          map,
          title: storeName,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
            scaledSize: new google.maps.Size(32, 40),
            anchor: new google.maps.Point(16, 38),
          },
          animation: google.maps.Animation?.DROP,
        });

        marker.addListener?.("click", () => navigate(`/store-map?focus=${encodeURIComponent(focusTarget)}`));
      }
      google.maps.event.addListenerOnce(map, "tilesloaded", () => {
        tilesLoadedRef.current = true;
        if (!cancelled) setTilesLoaded(true);
      });
      tileTimer = setTimeout(() => {
        if (!cancelled && !tilesLoadedRef.current) setFailed(true);
      }, 7000);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (tileTimer) clearTimeout(tileTimer);
      (window as any).gm_authFailure = previousAuthFailure;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, latitude, longitude]);

  /* Update user dot whenever userLoc changes */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (userDotRef.current) { userDotRef.current.setMap(null); userDotRef.current = null; }
    if (!userLoc) return;

    const MarkerCtor = google.maps.Marker;
    if (!MarkerCtor) return;

    userDotRef.current = new MarkerCtor({
      position: userLoc,
      map,
      icon: {
        url: makeUserDot(),
        scaledSize: new google.maps.Size(22, 22),
        anchor: new google.maps.Point(11, 11),
      },
      title: "You",
      zIndex: 999,
    });
  }, [ready, userLoc]);

  const zoomIn = () => { const m = mapRef.current; if (m) m.setZoom((m.getZoom() ?? 15) + 1); };
  const zoomOut = () => { const m = mapRef.current; if (m) m.setZoom((m.getZoom() ?? 15) - 1); };
  const recenter = () => {
    const m = mapRef.current;
    if (m && hasCoords) { m.panTo({ lat: latitude as number, lng: longitude as number }); m.setZoom(17); }
  };
  const openFullMap = () => navigate(`/store-map?focus=${encodeURIComponent(focusTarget)}`);
  const directionsUrl = zivoRouteUrl({
    lat: hasCoords ? (latitude as number) : undefined,
    lng: hasCoords ? (longitude as number) : undefined,
    label: storeName,
    address,
  });

  const showFallback = !hasCoords || failed;
  const staticMapUrl = hasCoords && mapsKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=16&size=760x448&scale=2&maptype=roadmap&markers=color:green%7Clabel:%7C${latitude},${longitude}&key=${encodeURIComponent(mapsKey)}`
    : "";
  const dist = userLoc && hasCoords
    ? distanceMiles(userLoc, { lat: latitude as number, lng: longitude as number })
    : null;

  return (
    <div className="group relative block h-56 w-full overflow-hidden rounded-3xl border border-border bg-card/95 backdrop-blur-2xl shadow-xl shadow-black/10 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20">
      {!showFallback && (
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: "pan-x pan-y" }}
          aria-label={`Interactive map for ${storeName}`}
        />
      )}

      {/* Loading shimmer */}
      {!showFallback && !ready && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/15 via-emerald-500/10" />
      )}

      {/* Fallback */}
      {showFallback && (
        <>
          <div className="absolute inset-0">
            {staticMapUrl ? (
              <img
                src={staticMapUrl}
                alt={`Map location for ${storeName}`}
	                className="h-full w-full object-cover"
	                loading="lazy"
	                decoding="async"
	                referrerPolicy="no-referrer-when-downgrade"
	              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-emerald-500/15" />
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.15) 0.5px, transparent 0)`,
                    backgroundSize: "18px 18px",
                  }}
                />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/10" />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background/60">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </div>
        </>
      )}

      {!showFallback && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-background/90 px-3 py-1.5 text-[11px] font-bold text-foreground shadow-lg ring-1 ring-border backdrop-blur-xl">
            {storeName}
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-1 animate-ping rounded-full bg-emerald-500/25" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 ring-4 ring-background/80">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent z-10" />

      {/* Zoom controls */}
      {!showFallback && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          <button type="button" onClick={zoomIn} aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-xl text-foreground shadow-lg ring-1 ring-border transition-all hover:bg-background hover:scale-105 active:scale-95">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" onClick={zoomOut} aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-xl text-foreground shadow-lg ring-1 ring-border transition-all hover:bg-background hover:scale-105 active:scale-95">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" onClick={recenter} aria-label="Recenter on store"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-border transition-all hover:scale-105 active:scale-95">
            <Locate className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom action row */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openFullMap}
          aria-label={`Open ${storeName} location on map`}
          className="flex min-w-0 items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-left shadow-lg ring-1 ring-border backdrop-blur-xl transition-transform hover:scale-105"
        >
          {dist !== null ? (
            <>
              <Timer className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-bold text-foreground tracking-tight">
                {fmtDistance(dist)} · {fmtWalk(dist)}
              </span>
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground tracking-tight">
                {showFallback ? "Location" : tilesLoaded ? "Map ready" : "Loading map"}
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate(directionsUrl)}
          aria-label={`Get directions to ${storeName} in ZIVO`}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-background/90 px-3 text-[11px] font-bold text-foreground shadow-lg ring-1 ring-border backdrop-blur-xl transition-transform duration-300 hover:scale-105"
        >
          <Navigation className="h-3.5 w-3.5 text-primary" />
          Directions
        </button>
        <button
          type="button"
          onClick={openFullMap}
          aria-label={`Open full map for ${storeName}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-border transition-transform duration-300 hover:scale-110 hover:rotate-12"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
