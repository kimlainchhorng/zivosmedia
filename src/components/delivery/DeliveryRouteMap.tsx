/**
 * DeliveryRouteMap — real Google Map for the delivery "Route" step.
 *
 * Replaces the old decorative SVG squiggle. Geocodes the typed pickup/dropoff
 * addresses (debounced + cached to spare Geocoding-API quota) and draws markers
 * plus a driving route with distance/duration. Before both addresses resolve it
 * centers on whatever is available; if Maps can't load (e.g. no API key in a
 * preview build) it shows a styled placeholder rather than an error.
 *
 * Reuses the proven loader pattern from grocery/CheckoutRouteMap (maps-api-key
 * edge function, falling back to VITE_GOOGLE_MAPS_API_KEY).
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Navigation, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 }; // Phnom Penh
const MIN_QUERY_LEN = 6;
const DEBOUNCE_MS = 1800;
const CACHE_MAX = 50;

async function getApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("maps-api-key");
    if (!error && (data as { key?: string } | null)?.key) return (data as { key: string }).key;
  } catch {
    /* fall through to env */
  }
  return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || "";
}

async function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if (window.google?.maps?.Map) return true;
  const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existing) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(check);
          resolve(true);
        }
      }, 200);
      setTimeout(() => {
        clearInterval(check);
        resolve(!!window.google?.maps?.Map);
      }, 8000);
    });
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

interface Props {
  pickupAddress?: string;
  dropoffAddress?: string;
}

export default function DeliveryRouteMap({ pickupAddress, dropoffAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const dirServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const dirRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);
  const cacheRef = useRef<Map<string, google.maps.LatLngLiteral>>(new Map());
  const geocodeSerial = useRef(0);
  const dirSerial = useRef(0);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  // Mount: load Maps, then create the map + the reusable services once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = await getApiKey();
      if (!key || cancelled) {
        if (!cancelled) setFailed(true);
        return;
      }
      const ok = await loadGoogleMaps(key);
      if (!ok || cancelled || !window.google?.maps?.Map) {
        if (!cancelled) setFailed(true);
        return;
      }
      // Wait a frame so the (min-h-[180px]) container has a layout size.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled || !containerRef.current) return;
      const map = new google.maps.Map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: "cooperative",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      mapRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();
      dirServiceRef.current = new google.maps.DirectionsService();
      dirRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: { strokeColor: "#f43f5e", strokeWeight: 4, strokeOpacity: 0.9 },
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
      pickupMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current?.setMap(null);
      if (dirRendererRef.current) {
        dirRendererRef.current.set("directions", null);
        dirRendererRef.current.setMap(null);
      }
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
    };
  }, []);

  // Resolve addresses → markers + route. Debounced + cached; serial-guarded so
  // stale async geocode / directions results never overwrite newer ones.
  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      const serialNow = ++geocodeSerial.current;
      const geocodeOne = (addr?: string): Promise<google.maps.LatLngLiteral | null> => {
        const q = (addr || "").trim();
        if (q.length < MIN_QUERY_LEN || !geocoderRef.current) return Promise.resolve(null);
        const cached = cacheRef.current.get(q);
        if (cached) return Promise.resolve(cached);
        return new Promise((resolve) => {
          geocoderRef.current!.geocode({ address: q }, (res, status) => {
            if (status === "OK" && res?.[0]) {
              const loc = res[0].geometry.location;
              const lit = { lat: loc.lat(), lng: loc.lng() };
              if (cacheRef.current.size >= CACHE_MAX) {
                const oldest = cacheRef.current.keys().next().value;
                if (oldest) cacheRef.current.delete(oldest);
              }
              cacheRef.current.set(q, lit);
              resolve(lit);
            } else {
              resolve(null);
            }
          });
        });
      };

      void (async () => {
        const [pickup, dropoff] = await Promise.all([geocodeOne(pickupAddress), geocodeOne(dropoffAddress)]);
        if (serialNow !== geocodeSerial.current) return; // a newer run started
        const map = mapRef.current;
        if (!map) return;

        // Pickup marker (dark)
        if (pickup) {
          if (!pickupMarkerRef.current) {
            pickupMarkerRef.current = new google.maps.Marker({
              map,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#0f172a", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
              title: "Pickup",
              zIndex: 90,
            });
          } else {
            pickupMarkerRef.current.setMap(map);
          }
          pickupMarkerRef.current.setPosition(pickup);
        } else {
          pickupMarkerRef.current?.setMap(null);
        }

        // Dropoff marker (brand)
        if (dropoff) {
          if (!dropoffMarkerRef.current) {
            dropoffMarkerRef.current = new google.maps.Marker({
              map,
              icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#f43f5e", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
              title: "Dropoff",
              zIndex: 90,
            });
          } else {
            dropoffMarkerRef.current.setMap(map);
          }
          dropoffMarkerRef.current.setPosition(dropoff);
        } else {
          dropoffMarkerRef.current?.setMap(null);
        }

        if (pickup && dropoff && dirServiceRef.current && dirRendererRef.current) {
          const dirNow = ++dirSerial.current;
          dirServiceRef.current.route(
            { origin: pickup, destination: dropoff, travelMode: google.maps.TravelMode.DRIVING },
            (result, status) => {
              if (dirNow !== dirSerial.current) return; // stale directions result
              if (status === "OK" && result) {
                dirRendererRef.current!.setDirections(result);
                const leg = result.routes?.[0]?.legs?.[0];
                setRouteInfo(leg ? { distance: leg.distance?.text || "", duration: leg.duration?.text || "" } : null);
              }
            },
          );
          if (containerRef.current && containerRef.current.offsetHeight > 0) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(pickup);
            bounds.extend(dropoff);
            map.fitBounds(bounds, 48);
          }
        } else {
          dirRendererRef.current?.set("directions", null);
          setRouteInfo(null);
          const single = pickup || dropoff;
          if (single) {
            map.setCenter(single);
            map.setZoom(14);
          }
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [ready, pickupAddress, dropoffAddress]);

  if (failed) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))]">
        <div className="flex flex-col items-center gap-2 px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </span>
          <p className="text-xs font-bold text-foreground">Delivery route preview</p>
          <p className="max-w-[16rem] text-[11px] text-muted-foreground">Enter pickup and dropoff to estimate courier timing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" style={{ touchAction: "none" }} />
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
          <Navigation className="h-3 w-3 text-primary" /> {routeInfo ? "Your route" : "Enter pickup & dropoff"}
        </span>
        {routeInfo && (
          <span className="inline-flex items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-[10px] shadow-sm backdrop-blur">
            <span className="text-muted-foreground">{routeInfo.distance}</span>
            <span className="font-bold text-primary">{routeInfo.duration}</span>
          </span>
        )}
      </div>
    </div>
  );
}
