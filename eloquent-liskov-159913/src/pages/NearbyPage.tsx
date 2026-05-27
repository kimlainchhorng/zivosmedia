import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users, Coffee, ShoppingBag, Star, Navigation, Loader2, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

interface NearbyItem {
  id: string;
  type: "place" | "checkin";
  name: string;
  description: string;
  distanceKm?: number;
  slug?: string;
  category?: string;
}

function categoryIcon(cat: string) {
  if (/cafe|coffee|drink/i.test(cat)) return { icon: Coffee, color: "text-amber-500 bg-amber-500/10" };
  if (/shop|retail|market|grocery/i.test(cat)) return { icon: ShoppingBag, color: "text-green-500 bg-green-500/10" };
  if (/hotel|lodge|resort/i.test(cat)) return { icon: Star, color: "text-yellow-500 bg-yellow-500/10" };
  if (/restaurant|food|eats/i.test(cat)) return { icon: Coffee, color: "text-red-500 bg-red-500/10" };
  return { icon: Store, color: "text-primary bg-primary/10" };
}

function fmtDistance(km?: number) {
  if (!km) return "";
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

const FILTERS = ["all", "places", "check-ins"];

export default function NearbyPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError(true),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // Nearby stores — if no user location, load recently active ones
  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ["nearby-stores", userCoords?.lat, userCoords?.lng],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("id, name, slug, category, latitude, longitude, rating, is_active")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .limit(30);
      if (!data) return [];
      return data.map(s => {
        let distanceKm: number | undefined;
        if (userCoords && s.latitude && s.longitude) {
          const R = 6371;
          const dLat = ((s.latitude - userCoords.lat) * Math.PI) / 180;
          const dLon = ((s.longitude - userCoords.lng) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos((userCoords.lat * Math.PI) / 180) * Math.cos((s.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
          distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return {
          id: s.id,
          type: "place" as const,
          name: s.name,
          description: s.category + (s.rating ? ` · ⭐ ${s.rating}` : ""),
          distanceKm,
          slug: s.slug,
          category: s.category,
        };
      }).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
    },
    enabled: true,
  });

  // Recent public check-ins
  const { data: checkins = [], isLoading: loadingCheckins } = useQuery({
    queryKey: ["nearby-checkins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("id, location_name, caption, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data ?? []).map(c => ({
        id: c.id,
        type: "checkin" as const,
        name: c.location_name || "Unknown location",
        description: c.caption || "Check-in",
        category: "checkin",
      }));
    },
  });

  const allItems: NearbyItem[] = [
    ...(filter !== "check-ins" ? stores : []),
    ...(filter !== "places" ? checkins : []),
  ];

  const filtered = filter === "all" ? allItems
    : filter === "places" ? stores
    : checkins;

  const isLoading = loadingStores || loadingCheckins;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Nearby – ZIVO | Discover Places & People Around You"
        description="Find nearby stores, restaurants, hotels, and check-ins in your area on ZIVO."
        canonical="/nearby"
      />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <Navigation className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-ig-gradient">Nearby</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0" onClick={() => setFilter(f)}>
              {f}
            </Badge>
          ))}
        </div>
      </div>

      {/* Location status */}
      <div className="h-40 bg-muted/50 flex items-center justify-center relative border-b border-border">
        {userCoords ? (
          <div className="text-center">
            <MapPin className="h-8 w-8 text-primary mx-auto mb-1" />
            <p className="text-sm font-medium">Location active</p>
            <p className="text-xs text-muted-foreground">{userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}</p>
          </div>
        ) : geoError ? (
          <div className="text-center px-4">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-sm text-muted-foreground mb-2">Location unavailable</p>
            <Button size="sm" variant="outline" onClick={requestLocation}>Try again</Button>
          </div>
        ) : (
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-primary mx-auto mb-1 animate-spin" />
            <p className="text-sm text-muted-foreground">Getting your location…</p>
          </div>
        )}
        <Badge className="absolute top-3 right-3 gap-1"><Navigation className="h-3 w-3" /> {filtered.length} nearby</Badge>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
            Nothing nearby yet
          </div>
        )}

        {filtered.map((item, i) => {
          const { icon: Icon, color } = categoryIcon(item.category || "");
          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => item.slug ? navigate(`/s/${item.slug}`) : undefined}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  {item.type === "checkin" ? <MapPin className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {item.distanceKm !== undefined && (
                  <Badge variant="outline" className="text-xs shrink-0 gap-1">
                    <MapPin className="h-2 w-2" /> {fmtDistance(item.distanceKm)}
                  </Badge>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
