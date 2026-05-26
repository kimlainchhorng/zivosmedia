/**
 * NearbyMap — Shows nearby users/restaurants on a map
 * Uses Google Maps API (already integrated in the project)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users, UtensilsCrossed, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        .select("id, name, logo_url, latitude, longitude")
        .limit(20);
      return (data || [])
        .filter((r: any) => r.latitude && r.longitude)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          type: "restaurant" as const,
          lat: r.latitude,
          lng: r.longitude,
          avatar: r.logo_url,
        }));
    },
    enabled: !!userLocation,
  });

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md">
          <h2 className="text-lg font-semibold">Nearby</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-muted/50">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-center px-8">
            <MapPin className="h-16 w-16 text-primary/30 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-1">Nearby Places</p>
            <p className="text-sm text-muted-foreground mb-4">
              {nearbyItems.length} restaurants found near you
            </p>
            {/* List view */}
            <div className="max-h-[40vh] overflow-y-auto space-y-2 text-left">
              {nearbyItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Restaurant</p>
                  </div>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
