/**
 * PublicTripSharePage — read-only live tracker, accessible without auth.
 *
 * Mounted at /share/trip/:tripId. Designed for the "I'm on my way, here's
 * a link to follow my ride" use case. Polls every 8s for live status updates
 * and shows pickup → dropoff progress without exposing any personal info
 * beyond the driver's first name.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Clock from "lucide-react/dist/esm/icons/clock";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { useShareWatchlist } from "@/hooks/useShareWatchlist";

interface PublicTrip {
  id: string;
  status: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  driver_first_name?: string | null;
  vehicle?: string | null;
  vehicle_color?: string | null;
  /** Server-side timestamp of the most recent status change. */
  updated_at?: string | null;
}

const SHARE_TTL_AFTER_COMPLETION_MS = 30 * 60_000;

const STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  accepted: 25,
  driver_assigned: 25,
  en_route: 55,
  arriving: 80,
  arrived: 85,
  in_progress: 90,
  completed: 100,
  cancelled: 0,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Looking for a driver",
  accepted: "Driver assigned",
  driver_assigned: "Driver assigned",
  en_route: "Driver on the way",
  arriving: "Driver arriving now",
  arrived: "Driver has arrived",
  in_progress: "On the trip",
  completed: "Arrived safely",
  cancelled: "Trip cancelled",
};

export default function PublicTripSharePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<PublicTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchlist = useShareWatchlist();

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const { data, error } = await supabase
        .from("ride_requests")
        .select("id,status,pickup_address,dropoff_address,assigned_driver_id,updated_at")
        .eq("id", tripId)
        .maybeSingle();

      if (error || !data) {
        if (!cancelled) {
          setError("Trip not found or not viewable.");
          setLoading(false);
        }
        return;
      }

      let driverFirst: string | null = null;
      let vehicle: string | null = null;
      let vehicleColor: string | null = null;
      if ((data as any).assigned_driver_id) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("full_name,vehicle_model,vehicle_color")
          .eq("id", (data as any).assigned_driver_id)
          .maybeSingle();
        if (driver) {
          driverFirst = (driver.full_name ?? "").split(" ")[0] || null;
          vehicle = driver.vehicle_model ?? null;
          vehicleColor = driver.vehicle_color ?? null;
        }
      }

      if (!cancelled) {
        setTrip({
          id: data.id,
          status: data.status,
          pickup_address: data.pickup_address,
          dropoff_address: data.dropoff_address,
          driver_first_name: driverFirst,
          vehicle,
          vehicle_color: vehicleColor,
          updated_at: (data as any).updated_at ?? null,
        });
        setLoading(false);
      }
    };

    load();
    // Realtime channel — instant updates the moment status changes server-side.
    // 60s heartbeat covers any dropped events when the browser tab was hidden.
    const channel = supabase
      .channel(`share-trip:${tripId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${tripId}` },
        () => load(),
      )
      .subscribe();
    timer = setInterval(load, 60_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  if (loading && !trip) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border/50 p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Car className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">Trip not available</p>
          <p className="text-xs text-muted-foreground mt-1">
            {error ?? "This share link may have expired."}
          </p>
        </div>
      </div>
    );
  }

  const progress = STATUS_PROGRESS[trip.status ?? ""] ?? 0;
  const label = STATUS_LABELS[trip.status ?? ""] ?? "Tracking trip";
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";

  // Auto-expire: once a ride is completed for >30 min, the share link
  // shouldn't keep advertising the rider's location/identity. Render an
  // "ended" state instead.
  const completedAt = isCompleted && trip.updated_at ? new Date(trip.updated_at).getTime() : null;
  const isExpired = !!completedAt && Date.now() - completedAt > SHARE_TTL_AFTER_COMPLETION_MS;
  if (isExpired) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
        <div className="rounded-2xl border border-border/50 p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-foreground">Trip ended</p>
          <p className="text-xs text-muted-foreground mt-1">
            This share link has automatically expired. Ask the rider for a new link if you'd like to
            track another trip.
          </p>
        </div>
      </div>
    );
  }

  const ogTitle = `Live ZIVO ride · ${label}`;
  const ogDescription = trip.dropoff_address
    ? `Heading to ${trip.dropoff_address}. Auto-refreshing every 8s.`
    : `Following a ride live on ZIVO.`;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-500/10 via-background to-background">
      <SEOHead
        title={ogTitle}
        description={ogDescription}
        canonical={`/share/trip/${trip.id}`}
        ogImage="/og-rides.jpg"
        appLink={`zivo://share/trip/${trip.id}`}
      />
      <header className="pt-safe">
        <div className="max-w-screen-sm mx-auto px-5 pt-6 pb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">
            Shared by ZIVO
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mt-0.5">
            Live trip
          </h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 pt-3 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-emerald-500/20 bg-card p-5 shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Car className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Status
              </div>
              <div className="text-base font-extrabold text-foreground">{label}</div>
            </div>
            {!isCompleted && !isCancelled && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE
              </div>
            )}
          </div>

          <Progress value={progress} className="h-2 mb-4" />

          <div className="space-y-3">
            <Row
              icon={<Navigation className="w-4 h-4 text-emerald-600" />}
              label="Pickup"
              value={trip.pickup_address ?? "—"}
            />
            <Row
              icon={<MapPin className="w-4 h-4 text-foreground" />}
              label="Drop-off"
              value={trip.dropoff_address ?? "—"}
            />
            {(trip.driver_first_name || trip.vehicle) && (
              <Row
                icon={<Car className="w-4 h-4 text-foreground" />}
                label="Driver"
                value={[
                  trip.driver_first_name,
                  trip.vehicle && [trip.vehicle_color, trip.vehicle].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
          </div>
        </motion.div>

        {tripId && (
          <button type="button"
            onClick={() => {
              if (watchlist.has("trip", tripId))
                watchlist.remove("trip", tripId);
              else watchlist.add("trip", tripId, trip.driver_first_name ? `${trip.driver_first_name}'s ride` : null);
            }}
            className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[0.99] transition-transform touch-manipulation ${
              watchlist.has("trip", tripId)
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-border/50 bg-card hover:bg-muted/40"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              👁️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                {watchlist.has("trip", tripId) ? "Tracking" : "Track this"}
              </div>
              <div className="text-[12px] font-bold text-foreground">
                {watchlist.has("trip", tripId)
                  ? "Saved to your watchlist — tap to remove"
                  : "Save this link to /share/with-me to check back later"}
              </div>
            </div>
          </button>
        )}

        <div className="rounded-2xl border border-border/40 bg-card/80 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-[11px] text-muted-foreground">
            This is a public read-only view. The rider can stop sharing at any time. No personal
            info beyond first name and vehicle is shown.
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
          <Clock className="w-3 h-3" /> Updates live as the trip changes
        </div>
      </main>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-bold text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}
