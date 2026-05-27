/**
 * CheckoutPinMap – Inline mini Google Map with a draggable pin
 * for adjusting delivery location in checkout.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/services/mapsApi";

interface CheckoutPinMapProps {
  coords: { lat: number; lng: number } | null;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

const DEFAULT_CENTER = { lat: 30.4583, lng: -90.9563 }; // fallback

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

export function CheckoutPinMap({ coords, onLocationChange }: CheckoutPinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const geocodeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const movePin = useCallback(async (lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
    // Debounced reverse geocode
    if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
    geocodeTimeout.current = setTimeout(async () => {
      try {
        const addr = await reverseGeocode(lat, lng);
        if (addr && addr !== "Unknown location") {
          onLocationChange(lat, lng, addr);
        }
      } catch {}
    }, 400);
  }, [onLocationChange]);

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

      const center = coords ?? DEFAULT_CENTER;
      const map = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom: coords ? 16 : 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });
      mapInstance.current = map;

      const marker = new google.maps.Marker({
        map,
        position: center,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      markerRef.current = marker;

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        movePin(e.latLng.lat(), e.latLng.lng());
      });

      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) movePin(pos.lat(), pos.lng());
      });

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // Update marker if coords change externally
  useEffect(() => {
    if (coords && mapInstance.current && markerRef.current) {
      markerRef.current.setPosition(coords);
      mapInstance.current.panTo(coords);
    }
  }, [coords?.lat, coords?.lng]);

  if (error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 rounded-2xl overflow-hidden border border-border/20 shadow-sm"
    >
      <div className="relative" style={{ height: 180 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30 backdrop-blur-sm rounded-2xl">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" style={{ touchAction: "none" }} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/10">
        <Navigation className="h-3 w-3 text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground">
          Drag the pin or tap to adjust your delivery location
        </p>
      </div>
    </motion.div>
  );
}
