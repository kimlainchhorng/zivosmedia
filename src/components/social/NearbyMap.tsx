/**
 * NearbyMap — Shows nearby users/restaurants on a map
 * Uses Google Maps API (already integrated in the project)
 */
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Compass, Layers3, MapPin, Navigation, Radar, Sparkles, UtensilsCrossed, X, Loader2 } from "lucide-react";

interface NearbyMapProps {
  onClose: () => void;
}

interface NearbyItem {
  id: string;
  name: string;
  type: "user" | "restaurant";
  lat: number;
  lng: number;
  avatar?: string;
}

const distanceInMiles = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (miles: number) => {
  if (miles < 0.1) return "Nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
};

export default function NearbyMap({ onClose }: NearbyMapProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoading(false);
        },
        () => {
          // Default to NYC if no permission
          setUserLocation({ lat: 40.7128, lng: -74.006 });
          setLoading(false);
        }
      );
    } else {
      setUserLocation({ lat: 40.7128, lng: -74.006 });
      setLoading(false);
    }
  }, []);

  // Nearby restaurants from DB
  const { data: nearbyItems = [] } = useQuery({
    queryKey: ["nearby-restaurants", userLocation],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, logo_url, lat, lng")
        .limit(20);
      return (data || [])
        .filter((r: any) => r.lat && r.lng)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          type: "restaurant" as const,
          lat: r.lat,
          lng: r.lng,
          avatar: r.logo_url,
        }));
    },
    enabled: !!userLocation,
  });
  const coordinateLabel = userLocation
    ? `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`
    : "Locating";
  const nearbyItemsWithDistance = useMemo(() => {
    if (!userLocation) return nearbyItems.map((item) => ({ ...item, distanceMiles: null }));
    return nearbyItems
      .map((item) => ({
        ...item,
        distanceMiles: distanceInMiles(userLocation, { lat: item.lat, lng: item.lng }),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [nearbyItems, userLocation]);
  const nearestItem = nearbyItemsWithDistance[0];
  const localDensity =
    nearbyItems.length >= 10
      ? { label: "Strong local cluster", detail: `${nearbyItems.length} places in range`, width: "100%" }
      : nearbyItems.length > 0
        ? { label: "Nearby signal", detail: `${nearbyItems.length} place${nearbyItems.length === 1 ? "" : "s"} found`, width: `${Math.max(34, nearbyItems.length * 9)}%` }
        : { label: "Quiet map", detail: "Waiting for nearby places", width: "22%" };

  return (
    <div className="zivo-social-surface fixed inset-0 z-50">
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="zivo-social-header-glass m-3 flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
              <Compass className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-primary">Local signal</p>
              <h2 className="truncate text-lg font-black tracking-tight text-foreground">Nearby</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="zivo-social-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-4 pb-8 pt-24">
        <div className="absolute inset-0 opacity-70">
          <div className="absolute left-1/2 top-1/2 h-[72vmin] w-[72vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20" />
          <div className="absolute left-1/2 top-1/2 h-[48vmin] w-[48vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/20" />
          <div className="absolute left-1/2 top-1/2 h-[24vmin] w-[24vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/20" />
        </div>
        {loading ? (
          <div className="zivo-social-module relative flex min-h-[300px] w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-[1.5rem] px-6 text-center">
            <span className="zivo-social-share-orb mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-primary">
              <Loader2 className="h-7 w-7 animate-spin" />
            </span>
            <span className="zivo-social-chip mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <Navigation className="h-3.5 w-3.5" />
              Permission aware
            </span>
            <h3 className="text-xl font-black tracking-tight text-foreground">Finding your local map</h3>
            <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
              Checking your location so nearby restaurants can appear around you.
            </p>
          </div>
        ) : (
          <div className="zivo-social-module relative w-full max-w-md px-5 py-6 text-center">
            <span className="zivo-social-share-orb mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl text-primary">
              <Radar className="h-7 w-7" />
            </span>
            <span className="zivo-social-chip mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Map signal ready
            </span>
            <h3 className="text-2xl font-black tracking-tight text-foreground">Nearby Places</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-muted-foreground">
              {nearbyItems.length > 0
                ? `${nearbyItems.length} restaurants found near you`
                : "Restaurants with live location data will show here when they are available nearby."}
            </p>

            {nearestItem && (
              <div className="zivo-social-share-preview mt-5 flex items-center gap-3 rounded-3xl p-3 text-left">
                <span className="zivo-social-share-orb relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-primary">
                  {nearestItem.avatar ? (
                    <img src={nearestItem.avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-primary">Nearest signal</p>
                  <p className="truncate text-sm font-black text-foreground">{nearestItem.name}</p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {nearestItem.distanceMiles === null ? "Distance loading" : `${formatDistance(nearestItem.distanceMiles)} from you`}
                  </p>
                </div>
                <span className="zivo-social-chip-active shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black">
                  Closest
                </span>
              </div>
            )}

            <div className="zivo-social-module-tile mt-5 rounded-3xl px-3 py-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                    <Radar className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-foreground">{localDensity.label}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-foreground">{localDensity.detail}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                  Local
                </span>
              </div>
              <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-primary to-emerald-400 transition-[width] duration-300"
                  style={{ width: localDensity.width }}
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="zivo-social-module-tile p-3 text-left">
                <Navigation className="mb-2 h-4 w-4 text-cyan-500" />
                <p className="text-sm font-black text-foreground">Location ready</p>
                <p className="text-xs font-semibold text-muted-foreground">Permission aware</p>
              </div>
              <div className="zivo-social-module-tile p-3 text-left">
                <UtensilsCrossed className="mb-2 h-4 w-4 text-fuchsia-500" />
                <p className="text-sm font-black text-foreground">{nearbyItems.length}</p>
                <p className="text-xs font-semibold text-muted-foreground">Restaurants</p>
              </div>
              <div className="zivo-social-module-tile p-3 text-left">
                <Layers3 className="mb-2 h-4 w-4 text-emerald-500" />
                <p className="truncate text-sm font-black text-foreground">{coordinateLabel}</p>
                <p className="text-xs font-semibold text-muted-foreground">Signal</p>
              </div>
            </div>

            <div className="mt-5 max-h-[40vh] space-y-2 overflow-y-auto pr-1 text-left">
              {nearbyItemsWithDistance.map((item) => (
                <div key={item.id} className="zivo-social-module-tile flex items-center gap-3 rounded-2xl p-3 transition-transform hover:-translate-y-0.5">
                  <div className="zivo-social-share-orb relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary">
                    {item.avatar ? (
                      <img src={item.avatar} alt="" className="h-full w-full rounded-2xl object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-foreground">{item.name}</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {item.distanceMiles === null ? "Restaurant near your map" : `${formatDistance(item.distanceMiles)} away`}
                    </p>
                    <p className="mt-1 truncate text-[10px] font-bold text-muted-foreground">
                      {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                    </p>
                  </div>
                  <span className="zivo-social-chip flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-black text-primary">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Live
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
