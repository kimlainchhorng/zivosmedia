/**
 * CheckoutRouteMap – Inline Google Map showing route from store to delivery address
 * with directions polyline, store marker, and delivery marker.
 */
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Navigation, MapPin, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutRouteMapProps {
  storeCoords: { lat: number; lng: number };
  deliveryCoords: { lat: number; lng: number };
  storeName?: string;
}

async function getApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("maps-api-key");
    if (!error && data?.key) return data.key;
  } catch {}
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
}

async function loadGoogleMaps(apiKey: string): Promise<boolean> {
  if (window.google?.maps) return true;
  const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existing) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve(true); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(!!window.google?.maps); }, 8000);
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

export function CheckoutRouteMap({ storeCoords, deliveryCoords, storeName }: CheckoutRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const key = await getApiKey();
      if (!key || cancelled) { setError(true); setLoading(false); return; }
      const loaded = await loadGoogleMaps(key);
      if (!loaded || cancelled) { setError(true); setLoading(false); return; }

      await new Promise((r) => setTimeout(r, 100));
      if (!mapContainerRef.current || cancelled) { setLoading(false); return; }

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(storeCoords);
      bounds.extend(deliveryCoords);

      const map = new google.maps.Map(mapContainerRef.current, {
        center: bounds.getCenter(),
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "cooperative",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      mapRef.current = map;
      map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });

      // Store marker (green)
      new google.maps.Marker({
        map,
        position: storeCoords,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: storeName || "Store",
        zIndex: 80,
      });

      // Delivery marker (primary/blue)
      new google.maps.Marker({
        map,
        position: deliveryCoords,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        title: "Delivery",
        zIndex: 80,
      });

      // Draw route
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#22c55e",
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });

      directionsService.route(
        {
          origin: storeCoords,
          destination: deliveryCoords,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (cancelled) return;
          if (status === "OK" && result) {
            directionsRenderer.setDirections(result);
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) {
              setRouteInfo({
                distance: leg.distance?.text || "",
                duration: leg.duration?.text || "",
              });
            }
          }
        }
      );

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [storeCoords.lat, storeCoords.lng, deliveryCoords.lat, deliveryCoords.lng]);

  if (error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-border/20 shadow-sm mb-4"
    >
      <div className="relative" style={{ height: 160 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30 backdrop-blur-sm rounded-t-2xl">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" style={{ touchAction: "none" }} />
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/10">
        <div className="flex items-center gap-2">
          <Bike className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-foreground">ZIVO Ride Delivery</span>
        </div>
        {routeInfo && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{routeInfo.distance}</span>
            <span className="text-[10px] font-semibold text-primary">{routeInfo.duration}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
