import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Car, MapPin, Clock } from "lucide-react";

export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-trip?token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unable to load trip");
        return;
      }
      setData(json);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchData();
    if (!token) return;
    // Subscribe to realtime updates on ride
    const interval = setInterval(fetchData, 15000);

    let channel: any = null;
    (async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-trip?token=${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const j = await res.json();
      if (j?.ride?.id) {
        channel = supabase
          .channel(`shared-trip-${j.ride.id}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${j.ride.id}` }, () => fetchData())
          .subscribe();
      }
    })();

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-bold mb-2">Trip link unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading shared trip…</div>;
  }

  const { ride, driver } = data;
  const statusLabel = ride?.status ?? "unknown";

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Live Trip Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Shared by your contact via ZIVO</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Trip status</CardTitle>
              <Badge>{statusLabel.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ride?.eta_minutes != null && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="w-5 h-5 text-primary" />
                ETA: {ride.eta_minutes} min
              </div>
            )}
            <div className="text-sm space-y-2">
              <div className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Pickup</div><div>{ride?.pickup_address ?? "—"}</div></div></div>
              <div className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /><div><div className="text-xs text-muted-foreground">Dropoff</div><div>{ride?.dropoff_address ?? "—"}</div></div></div>
            </div>
          </CardContent>
        </Card>

        {driver && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Your driver</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="font-semibold">{driver.full_name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Car className="w-4 h-4" />
                {[driver.vehicle_color, driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(" ")} · {driver.vehicle_plate ?? "—"}
              </div>
              {driver.rating != null && <div className="text-xs text-muted-foreground">★ {Number(driver.rating).toFixed(1)}</div>}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">This link auto-expires when the trip ends.</p>
      </div>
    </div>
  );
}
