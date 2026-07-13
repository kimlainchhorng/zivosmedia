/**
 * RideMap - Google Maps component for ride booking
 * Fetches API key from edge function, shows pickup/dropoff markers and route.
 */
/// <reference types="google.maps" />
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { decodePolyline, type TrafficSegment } from "@/services/mapsApi";

const DEFAULT_CENTER = { lat: 40.7128, lng: -73.9857 };
const MAP_INIT_TIMEOUT_MS = 5000;

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a5a6e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8888a0" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#252540" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e1e36" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6a6a80" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#2d2d4a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e1e36" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8888a0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#141428" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3a3a55" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#1a2a20" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const lightMapStyle: google.maps.MapTypeStyle[] = [
  // Base: very light gray land
  { elementType: "geometry", stylers: [{ color: "#f2f2f2" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 3 }] },
  // Administrative
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  // Land / landscape
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#efefef" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  // Roads — clean whites with subtle strokes
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#ebebeb" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b0b0b0" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  // Highways — slightly darker for hierarchy
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#e8e8e8" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d5d5d5" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
  // Water — soft blue
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e5f0" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#92c3d8" }] },
  // POIs — completely hidden
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#e6f0e0" }] },
  // Transit — hidden
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

function getMapStyle(): google.maps.MapTypeStyle[] {
  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? darkMapStyle : lightMapStyle;
}

interface RideMapProps {
  pickupCoords?: { lat: number; lng: number } | null;
  dropoffCoords?: { lat: number; lng: number } | null;
  stopCoords?: { lat: number; lng: number }[];
  routePolyline?: string | { lat: number; lng: number }[] | null;
  trafficSegments?: { startPolylinePointIndex: number; endPolylinePointIndex: number; speed: string }[] | null;
  driverCoords?: { lat: number; lng: number } | null;
  /** Target for driver navigation line (pickup during en-route, dropoff during trip) */
  driverNavigationTarget?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  /** Real nearby driver positions to show on the map (replaces ambient cars when provided) */
  nearbyDrivers?: { lat: number; lng: number }[];
  showUserLocationDot?: boolean;
  className?: string;
  onMapReady?: (map: google.maps.Map) => void;
  /** Fires with center lat/lng when the map stops moving (idle event) */
  onCenterChanged?: (center: { lat: number; lng: number }) => void;
  /** Prevent automatic pan/fit while the user is manually positioning a pin */
  suppressAutoViewport?: boolean;
  /** Disable user dragging/gestures when the view is in a locked confirmation state */
  mapInteractive?: boolean;
}

// Delegate to unified loader (handles gm_authFailure, single SDK fetch site-wide)
import { loadGoogleMaps as loadGoogleMapsScript } from "@/lib/maps/loadGoogleMaps";
let googleMapsAuthFailed = false;
window.addEventListener("gmaps-auth-failure", () => { googleMapsAuthFailed = true; });
window.addEventListener("gmaps-auth-retry", () => { googleMapsAuthFailed = false; });

export default function RideMap({ pickupCoords, dropoffCoords, stopCoords, routePolyline, trafficSegments, driverCoords, driverNavigationTarget, userLocation, nearbyDrivers, showUserLocationDot = true, className, onMapReady, onCenterChanged, suppressAutoViewport = false, mapInteractive = true }: RideMapProps) {
  const [isReady, setIsReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedReason, setFailedReason] = useState<string>("");
  const [mapInitialized, setMapInitialized] = useState(false);

  const handleFailure = useCallback((reason: string, err?: unknown) => {
    if (err) {
      console.error("[RideMap]", reason, err);
    } else {
      console.error("[RideMap]", reason);
    }
    setFailedReason(reason);
    setFailed(true);
  }, []);

  useEffect(() => {
    const handleAuthFail = () => {
      setFailedReason("Google Maps authentication failed. Verify key restrictions and billing.");
      setFailed(true);
    };
    const handleAuthRetry = () => {
      setFailed(false);
      setFailedReason("");
      setIsReady(false);
      setMapInitialized(false);
    };

    window.addEventListener("gmaps-auth-failure", handleAuthFail);
    window.addEventListener("gmaps-auth-retry", handleAuthRetry);
    return () => {
      window.removeEventListener("gmaps-auth-failure", handleAuthFail);
      window.removeEventListener("gmaps-auth-retry", handleAuthRetry);
    };
  }, []);

  useEffect(() => {
    if (failed) return;
    let cancelled = false;

    (async () => {
      const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
      let key = envKey;

      if (!key) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          try {
            const { data, error } = await supabase.functions.invoke("maps-api-key");
            if (!cancelled && !error && data?.key) {
              key = data.key;
            }
          } catch (err) {
            console.warn("[RideMap] maps-api-key edge function unavailable.", err);
          }
        }
      }

      if (!key) {
        if (!cancelled) {
          setFailedReason("Map service unavailable. Please try again or contact support.");
          setFailed(true);
        }
        return;
      }

      try {
        await loadGoogleMapsScript(key);
        if (!cancelled && !googleMapsAuthFailed) {
          setIsReady(true);
        } else if (!cancelled) {
          handleFailure("Google Maps authentication failed after script load.");
        }
      } catch (err) {
        if (!cancelled) {
          handleFailure("Google Maps script failed to initialize.", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [failed, handleFailure]);

  useEffect(() => {
    if (!isReady || failed) return;
    const timer = setTimeout(() => {
      if (!mapInitialized) {
        console.warn("[RideMap] Map not initialized after timeout — container may have 0 dimensions, will keep retrying");
      }
    }, MAP_INIT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isReady, failed, mapInitialized]);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      setMapInitialized(true);
      onMapReady?.(map);
    },
    [onMapReady]
  );

  // Forward onCenterChanged to NativeGoogleMap via passthrough

  if (failed) {
    return (
      <MapFallback
        pickupCoords={pickupCoords}
        dropoffCoords={dropoffCoords}
        className={className}
        reason={failedReason || "Unable to load Google Maps"}
      />
    );
  }

  if (!isReady) {
    return (
      <div className={`w-full h-full bg-gradient-to-b from-muted/80 to-background flex items-center justify-center ${className || ""}`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <NativeGoogleMap
      pickupCoords={pickupCoords}
      dropoffCoords={dropoffCoords}
      stopCoords={stopCoords}
      routePolyline={routePolyline}
      trafficSegments={trafficSegments}
      driverCoords={driverCoords}
      driverNavigationTarget={driverNavigationTarget}
      userLocation={userLocation}
      nearbyDrivers={nearbyDrivers}
      showUserLocationDot={showUserLocationDot}
      className={className}
      onMapReady={handleMapReady}
      onCenterChanged={onCenterChanged}
      suppressAutoViewport={suppressAutoViewport}
      mapInteractive={mapInteractive}
    />
  );
}

// ─── SVG marker builders ───

function createPickupPinSvg(): string {
  // Uber-inspired: green circle with ZIVO "Z" — flat, modern pickup marker
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <defs>
        <filter id="sp" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="22" fill="#22c55e" opacity="0.12"/>
      <circle cx="24" cy="24" r="17" fill="#22c55e" filter="url(#sp)"/>
      <circle cx="24" cy="24" r="11" fill="#fff"/>
      <text x="24" y="28.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="14" fill="#22c55e">Z</text>
    </svg>
  `)}`;
}

function createDropoffPinSvg(): string {
  // Black rounded square with "D" — destination marker, distinct from green circular pickup
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <filter id="sd" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <rect x="4" y="4" width="36" height="36" rx="10" fill="#111827" filter="url(#sd)"/>
      <rect x="10" y="10" width="24" height="24" rx="6" fill="#fff"/>
      <text x="22" y="27" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="15" fill="#111827">D</text>
    </svg>
  `)}`;
}

function createStopPinSvg(): string {
  // ZIVO-branded stop marker — green diamond shape with "S"
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <filter id="stp" x="-20%" y="-15%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <circle cx="22" cy="22" r="18" fill="#6b7280" filter="url(#stp)"/>
      <circle cx="22" cy="22" r="12" fill="#fff"/>
      <text x="22" y="27" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="15" fill="#6b7280">S</text>
    </svg>
  `)}`;
}

function createCarSvg(rotation: number): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <g transform="rotate(${rotation} 14 14)">
        <rect x="8" y="4" width="12" height="20" rx="4" fill="#111827" opacity="0.85"/>
        <rect x="9.5" y="6" width="9" height="5" rx="2" fill="#374151"/>
        <rect x="9.5" y="17" width="9" height="3" rx="1.5" fill="#374151"/>
        <circle cx="9" cy="8" r="1.2" fill="#fbbf24"/>
        <circle cx="19" cy="8" r="1.2" fill="#fbbf24"/>
        <circle cx="9" cy="22" r="1.2" fill="#ef4444" opacity="0.8"/>
        <circle cx="19" cy="22" r="1.2" fill="#ef4444" opacity="0.8"/>
      </g>
    </svg>
  `)}`;
}

// ─── Animated polyline drawing ───
function animatePolyline(
  map: google.maps.Map,
  path: google.maps.LatLng[] | { lat: number; lng: number }[],
  onDone?: (polyline: google.maps.Polyline) => void
) {
  let cancelled = false;

  const bgLine = new google.maps.Polyline({
    path,
    strokeColor: "#22c55e",
    strokeWeight: 4,
    strokeOpacity: 0.15,
    geodesic: true,
    zIndex: 10,
    map,
  });

  const animatedLine = new google.maps.Polyline({
    path: [],
    strokeColor: "#22c55e",
    strokeWeight: 4,
    strokeOpacity: 0.9,
    geodesic: true,
    zIndex: 11,
    map,
  });

  const totalPoints = path.length;
  const duration = 800;
  const startTime = performance.now();

  function step(now: number) {
    if (cancelled) {
      bgLine.setMap(null);
      animatedLine.setMap(null);
      return;
    }
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const pointCount = Math.max(2, Math.floor(eased * totalPoints));
    animatedLine.setPath(path.slice(0, pointCount));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      bgLine.setMap(null);
      onDone?.(animatedLine);
    }
  }

  requestAnimationFrame(step);
  return { bgLine, animatedLine, cancel: () => { cancelled = true; } };
}

// ─── Traffic-colored route rendering ───
const TRAFFIC_COLORS: Record<string, string> = {
  NORMAL: "#22c55e",      // green
  SLOW: "#f59e0b",        // amber/orange
  TRAFFIC_JAM: "#ef4444", // red
};

function renderTrafficColoredRoute(
  map: google.maps.Map,
  path: { lat: number; lng: number }[],
  segments: { startPolylinePointIndex: number; endPolylinePointIndex: number; speed: string }[],
  polylinesRef: React.MutableRefObject<google.maps.Polyline[]>
) {
  // First draw a subtle background line
  const bgLine = new google.maps.Polyline({
    path,
    strokeColor: "#94a3b8",
    strokeWeight: 6,
    strokeOpacity: 0.2,
    geodesic: true,
    zIndex: 9,
    map,
  });
  polylinesRef.current.push(bgLine);

  // Draw each traffic segment with its color
  for (const seg of segments) {
    const start = Math.max(0, seg.startPolylinePointIndex);
    const end = Math.min(path.length, seg.endPolylinePointIndex + 1);
    if (end <= start || end - start < 2) continue;

    const segmentPath = path.slice(start, end);
    const color = TRAFFIC_COLORS[seg.speed] || TRAFFIC_COLORS.NORMAL;

    const line = new google.maps.Polyline({
      path: segmentPath,
      strokeColor: color,
      strokeWeight: 5,
      strokeOpacity: 0.9,
      geodesic: true,
      zIndex: seg.speed === "TRAFFIC_JAM" ? 13 : seg.speed === "SLOW" ? 12 : 11,
      map,
    });
    polylinesRef.current.push(line);
  }
}

// Ambient cars removed — only real driver positions are shown on map

function NativeGoogleMap({ pickupCoords, dropoffCoords, stopCoords = [], routePolyline, trafficSegments, driverCoords, driverNavigationTarget, userLocation, nearbyDrivers = [], showUserLocationDot = true, className, onMapReady, onCenterChanged, suppressAutoViewport = false, mapInteractive = true }: RideMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const pulseCircleRef = useRef<google.maps.Circle | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const bgPolylineRef = useRef<google.maps.Polyline | null>(null);
  const polylineAnimCancelRef = useRef<(() => void) | null>(null);
  const trafficPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const ambientCarsRef = useRef<google.maps.Marker[]>([]); // kept for type compat, always empty
  const realDriverMarkersRef = useRef<google.maps.Marker[]>([]);
  const driverNavLineRef = useRef<google.maps.Polyline | null>(null);
  const onCenterChangedRef = useRef<RideMapProps["onCenterChanged"]>(onCenterChanged);
  const mapInteractiveRef = useRef(mapInteractive);
  const [mapReady, setMapReady] = useState(false);
  const hasPannedToUserRef = useRef(false);

  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged;
  }, [onCenterChanged]);

  useEffect(() => {
    mapInteractiveRef.current = mapInteractive;
  }, [mapInteractive]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const touchAction = mapInteractive ? "none" : "auto";
    container.style.touchAction = touchAction;
    container.style.pointerEvents = "auto";
    container.style.userSelect = "none";
    container.style.webkitUserSelect = "none";

    const firstLayer = container.firstElementChild as HTMLElement | null;
    if (firstLayer) {
      firstLayer.style.touchAction = touchAction;
      firstLayer.style.pointerEvents = "auto";
    }
  }, [mapInteractive, mapReady]);

  // ─── Update map interactivity dynamically ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({
      gestureHandling: mapInteractive ? "greedy" : "none",
      draggable: mapInteractive,
      keyboardShortcuts: mapInteractive,
      scrollwheel: mapInteractive,
      disableDoubleClickZoom: !mapInteractive,
    });
  }, [mapInteractive, mapReady]);

  // ─── Pan to user's GPS location once it becomes available ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || hasPannedToUserRef.current) return;
    // Only auto-pan if no pickup/dropoff coords are driving the view
    if (!pickupCoords && !dropoffCoords) {
      map.panTo(userLocation);
      map.setZoom(15);
      hasPannedToUserRef.current = true;
    }
  }, [userLocation, pickupCoords, dropoffCoords, mapReady]);

  const decodedRoute = useMemo(() => {
    if (!routePolyline) return null;
    if (typeof routePolyline === "string") return decodePolyline(routePolyline);
    return routePolyline;
  }, [routePolyline]);

  const clearRoute = useCallback(() => {
    if (polylineAnimCancelRef.current) { polylineAnimCancelRef.current(); polylineAnimCancelRef.current = null; }
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (bgPolylineRef.current) { bgPolylineRef.current.setMap(null); bgPolylineRef.current = null; }
    if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }
    // Clear traffic-colored segments
    trafficPolylinesRef.current.forEach(p => p.setMap(null));
    trafficPolylinesRef.current = [];
  }, []);

  const clearAmbientCars = useCallback(() => {
    // No-op: ambient cars removed, only real drivers shown
  }, []);

  // ─── Map init ───
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    let frameCount = 0;

    const initMap = () => {
      if (cancelled) return;
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if ((rect.width === 0 || rect.height === 0) && frameCount < 600) {
        frameCount += 1;
        requestAnimationFrame(initMap);
        return;
      }

      const center = pickupCoords || userLocation || DEFAULT_CENTER;
      const map = new google.maps.Map(container, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: getMapStyle(),
        gestureHandling: mapInteractive ? "greedy" : "none",
        draggable: mapInteractive,
        keyboardShortcuts: mapInteractive,
        scrollwheel: mapInteractive,
        disableDoubleClickZoom: !mapInteractive,
      });

      mapRef.current = map;
      setMapReady(true);
      onMapReady?.(map);
      map.addListener("idle", () => {
        const c = map.getCenter();
        const latestOnCenterChanged = onCenterChangedRef.current;
        if (c && latestOnCenterChanged) {
          latestOnCenterChanged({ lat: c.lat(), lng: c.lng() });
        }
      });

      // Also fire during active dragging for smoother pin placement feedback
      // Use 300ms throttle to avoid excessive React re-renders that cause map jank
      let dragThrottleTimer: ReturnType<typeof setTimeout> | null = null;
      map.addListener("drag", () => {
        if (!mapInteractiveRef.current) return;
        if (dragThrottleTimer) return;
        dragThrottleTimer = setTimeout(() => {
          dragThrottleTimer = null;
          const c = map.getCenter();
          const latestOnCenterChanged = onCenterChangedRef.current;
          if (c && latestOnCenterChanged) {
            latestOnCenterChanged({ lat: c.lat(), lng: c.lng() });
          }
        }, 300);
      });

      // Real drivers are rendered by the nearbyDrivers effect

      setTimeout(() => {
        if (!mapRef.current) return;
        google.maps.event.trigger(mapRef.current, "resize");
        mapRef.current.setCenter(center);

        const root = mapContainerRef.current;
        const firstLayer = root?.firstElementChild as HTMLElement | null;
        if (root) {
          root.style.pointerEvents = "auto";
          root.style.touchAction = mapInteractiveRef.current ? "none" : "auto";
        }
        if (firstLayer) {
          firstLayer.style.pointerEvents = "auto";
          firstLayer.style.touchAction = mapInteractiveRef.current ? "none" : "auto";
        }
      }, 300);
    };

    requestAnimationFrame(initMap);
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Resize observer ───
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) google.maps.event.trigger(mapRef.current, "resize");
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ─── Custom pin markers + pulse + fit bounds ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers & pulse
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (pulseCircleRef.current) { pulseCircleRef.current.setMap(null); pulseCircleRef.current = null; }

    if (pickupCoords) {
      // Pulsing circle around pickup
      pulseCircleRef.current = new google.maps.Circle({
        center: pickupCoords,
        radius: 120,
        map,
        fillColor: "#22c55e",
        fillOpacity: 0.08,
        strokeColor: "#22c55e",
        strokeOpacity: 0.25,
        strokeWeight: 1.5,
        clickable: false,
        zIndex: 5,
      });

      // Animate pulse
      let growing = true;
      const pulseInterval = setInterval(() => {
        const circle = pulseCircleRef.current;
        if (!circle) { clearInterval(pulseInterval); return; }
        const r = circle.getRadius();
        if (growing) {
          circle.setRadius(r + 8);
          circle.setOptions({ fillOpacity: Math.max(0.02, 0.08 - (r - 120) * 0.0005) });
          if (r >= 220) growing = false;
        } else {
          circle.setRadius(r - 8);
          circle.setOptions({ fillOpacity: Math.min(0.08, 0.02 + (220 - r) * 0.0005) });
          if (r <= 120) growing = true;
        }
      }, 60);

      // Store interval for cleanup
      (pulseCircleRef as any).__interval = pulseInterval;

      markersRef.current.push(
        new google.maps.Marker({
          position: pickupCoords,
          map,
          icon: {
            url: createPickupPinSvg(),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          },
          title: "Pickup",
          zIndex: 80,
        })
      );
    }

    if (dropoffCoords) {
      const dropoffMarker = new google.maps.Marker({
        position: dropoffCoords,
        map,
        icon: {
          url: createDropoffPinSvg(),
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        },
        title: "Dropoff",
        zIndex: 79,
      });
      markersRef.current.push(dropoffMarker);
      // Store ref so route rendering can snap it to the actual endpoint
      (markersRef as any).__dropoffMarker = dropoffMarker;
    }

    // Stop markers
    stopCoords.forEach((coord, idx) => {
      const stopMarker = new google.maps.Marker({
        position: coord,
        map,
        icon: {
          url: createStopPinSvg(),
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        },
        title: `Stop ${idx + 1}`,
        zIndex: 78,
      });
      markersRef.current.push(stopMarker);
    });

    // Fit / pan only when auto viewport is enabled.
    // During manual destination pin placement, keep the user's dragged camera position.
    if (!suppressAutoViewport) {
      if (pickupCoords && dropoffCoords) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickupCoords);
        bounds.extend(dropoffCoords);
        stopCoords.forEach((c) => bounds.extend(c));
        if (driverCoords) bounds.extend(driverCoords);
        map.fitBounds(bounds, { top: 80, bottom: 340, left: 80, right: 80 });
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() || 20) > 15) map.setZoom(15);
        });
      } else if (pickupCoords) {
        map.panTo(pickupCoords);
        map.setZoom(15);
      } else if (dropoffCoords) {
        map.panTo(dropoffCoords);
        map.setZoom(15);
      }
    }

    // Real drivers rendered by nearbyDrivers effect

    return () => {
      if ((pulseCircleRef as any).__interval) clearInterval((pulseCircleRef as any).__interval);
    };
  }, [pickupCoords, dropoffCoords, stopCoords, clearAmbientCars, mapReady, driverCoords, suppressAutoViewport]);

  // Update driver marker position without resetting zoom/bounds
  useEffect(() => {
    if (!mapReady || !driverCoords) return;
    const existingDriver = markersRef.current.find(m => m.getTitle() === "Driver");
    if (existingDriver) {
      existingDriver.setPosition(driverCoords);
    }
  }, [driverCoords, mapReady]);

  // ─── Animated route rendering with traffic colors ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clearRoute();
    let stale = false;

    if (decodedRoute && decodedRoute.length > 1) {
      // If we have traffic segments from Routes API, render colored polylines
      if (trafficSegments && trafficSegments.length > 0) {
        renderTrafficColoredRoute(map, decodedRoute, trafficSegments, trafficPolylinesRef);
      } else {
        // Fallback: single green animated polyline
        const { bgLine, animatedLine, cancel } = animatePolyline(map, decodedRoute, (finalLine) => {
          polylineRef.current = finalLine;
        });
        bgPolylineRef.current = bgLine;
        polylineRef.current = animatedLine;
        polylineAnimCancelRef.current = cancel;
      }
      // Snap dropoff marker to actual route endpoint
      const dropoffMarker = (markersRef as any).__dropoffMarker as google.maps.Marker | undefined;
      if (dropoffMarker) {
        const lastPt = decodedRoute[decodedRoute.length - 1];
        dropoffMarker.setPosition(lastPt);
      }
      return;
    }

    if (pickupCoords && dropoffCoords) {
      const directionsService = new google.maps.DirectionsService();
      const waypointsForDirections = (stopCoords || [])
        .filter(s => s.lat && s.lng)
        .map(s => ({ location: new google.maps.LatLng(s.lat, s.lng), stopover: true }));
      directionsService.route(
        { 
          origin: pickupCoords, 
          destination: dropoffCoords, 
          waypoints: waypointsForDirections.length > 0 ? waypointsForDirections : undefined,
          travelMode: google.maps.TravelMode.DRIVING 
        },
        (result, status) => {
          if (stale) return;
          if (status === google.maps.DirectionsStatus.OK && result) {
            const path = result.routes[0]?.overview_path;
            if (path && path.length > 1) {
              const latLngs = path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
              // Snap dropoff marker to route's actual endpoint
              const dm = (markersRef as any).__dropoffMarker as google.maps.Marker | undefined;
              if (dm && latLngs.length > 0) {
                dm.setPosition(latLngs[latLngs.length - 1]);
              }
              const anim = animatePolyline(map, latLngs, (finalLine) => {
                polylineRef.current = finalLine;
              });
              bgPolylineRef.current = anim.bgLine;
              polylineRef.current = anim.animatedLine;
              polylineAnimCancelRef.current = anim.cancel;
            } else {
              const renderer = new google.maps.DirectionsRenderer({
                map, directions: result, suppressMarkers: true,
                polylineOptions: { strokeColor: "#22c55e", strokeWeight: 5, strokeOpacity: 0.85 },
              });
              directionsRendererRef.current = renderer;
            }
          } else {
            if (stale) return;
            polylineRef.current = new google.maps.Polyline({
              path: [pickupCoords, dropoffCoords],
              strokeColor: "#22c55e", strokeWeight: 3, strokeOpacity: 0.6, geodesic: true,
              zIndex: 10,
              icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "15px" }],
              map,
            });
          }
        }
      );
    }
    return () => { stale = true; };
  }, [decodedRoute, trafficSegments, pickupCoords, dropoffCoords, stopCoords, clearRoute, mapReady]);

  // ─── Driver marker (car icon) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (driverCoords) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setPosition(driverCoords);
      } else {
        driverMarkerRef.current = new google.maps.Marker({
          position: driverCoords, map,
          icon: { url: "/vehicles/map-car-icon.png", scaledSize: new google.maps.Size(52, 28), anchor: new google.maps.Point(26, 14) },
          title: "Driver", zIndex: 100,
        });
      }
      // Driver assigned — hide nearby driver markers
    } else {
      if (driverMarkerRef.current) { driverMarkerRef.current.setMap(null); driverMarkerRef.current = null; }
      // No driver — nearby drivers shown by their own effect
    }
  }, [driverCoords]);

  // ─── Real nearby drivers (replaces ambient cars when provided) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old real driver markers
    realDriverMarkersRef.current.forEach(m => m.setMap(null));
    realDriverMarkersRef.current = [];

    if (nearbyDrivers.length > 0) {
      nearbyDrivers.forEach((d) => {
        const marker = new google.maps.Marker({
          position: { lat: d.lat, lng: d.lng },
          map,
          icon: {
            url: "/vehicles/economy-car-v2.png",
            scaledSize: new google.maps.Size(40, 22),
            anchor: new google.maps.Point(20, 11),
          },
          title: "Nearby Driver",
          zIndex: 5,
        });
        realDriverMarkersRef.current.push(marker);
      });
    } else {
      // No real drivers nearby — map stays clean
    }
  }, [nearbyDrivers, mapReady, driverCoords]);

  // ─── Driver navigation line (dashed line from driver to target) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clean up previous line
    if (driverNavLineRef.current) {
      driverNavLineRef.current.setMap(null);
      driverNavLineRef.current = null;
    }

    if (driverCoords && driverNavigationTarget) {
      driverNavLineRef.current = new google.maps.Polyline({
        path: [driverCoords, driverNavigationTarget],
        strokeColor: "#22c55e",
        strokeWeight: 3,
        strokeOpacity: 0,
        geodesic: true,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, strokeColor: "#22c55e", scale: 3 },
          offset: "0",
          repeat: "12px",
        }],
        map,
        zIndex: 90,
      });
    }

    return () => {
      if (driverNavLineRef.current) {
        driverNavLineRef.current.setMap(null);
        driverNavLineRef.current = null;
      }
    };
  }, [driverCoords, driverNavigationTarget, mapReady]);

  // ─── User location dot ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showUserLocationDot && userLocation && !pickupCoords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition(userLocation);
      } else {
        userMarkerRef.current = new google.maps.Marker({
          position: userLocation, map,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2.5 },
          title: "You", zIndex: 50,
        });
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
  }, [showUserLocationDot, userLocation, pickupCoords]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearAmbientCars();
    realDriverMarkersRef.current.forEach(m => m.setMap(null));
    realDriverMarkersRef.current = [];
  }, [clearAmbientCars]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full h-full min-h-[200px] rounded-xl overflow-hidden ${className || ""}`}
      style={{ touchAction: mapInteractive ? "none" : "auto" }}
    />
  );
}

function MapFallback({
  pickupCoords,
  dropoffCoords,
  className,
  reason,
}: Pick<RideMapProps, "pickupCoords" | "dropoffCoords" | "className"> & { reason: string }) {
  return (
    <div className={`relative overflow-hidden w-full h-full ${className || ""}`}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(160 40% 12%), hsl(200 30% 14%), hsl(160 30% 10%))" }}>
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="zg" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#zg)"/>
        </svg>

        {dropoffCoords && (
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            <line x1="42%" y1="38%" x2="62%" y2="58%" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="8,4" opacity="0.4" />
          </svg>
        )}

        <div className="absolute top-[38%] left-[42%] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute -inset-3 rounded-full bg-primary/15 animate-ping" />
          <div className="absolute -inset-1.5 rounded-full bg-primary/20 animate-pulse" />
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-background relative z-10" />
        </div>

        <div className="absolute top-3 left-3 right-3 z-20 rounded-xl bg-background/90 border border-border/50 p-3 backdrop-blur-sm">
          <p className="text-xs font-semibold text-foreground">Map unavailable</p>
          <p className="text-[11px] text-muted-foreground mt-1">{reason}</p>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <div className="px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border/30 shadow-sm">
            <span className="text-[10px] font-bold text-primary">ZIVO</span>
            <span className="text-[10px] text-muted-foreground ml-1">Map</span>
          </div>
        </div>
      </div>
    </div>
  );
}
