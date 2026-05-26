/**
 * RideTrackingPage - Live driver en-route tracking with real-time location
 * Also broadcasts customer's live GPS so the driver can see pickup location
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import DriverEnRouteTracker from "@/components/rides/DriverEnRouteTracker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerLocationBroadcast } from "@/hooks/useCustomerLocationBroadcast";
import { useRideNotifications } from "@/hooks/useRideNotifications";
import TripChatFab from "@/components/rides/TripChatFab";
import CrossServiceCTAs from "@/components/shared/CrossServiceCTAs";
import { useMultiLegQueue } from "@/hooks/useMultiLegQueue";
import SavePlaceInline from "@/components/rides/SavePlaceInline";

function shortenAddress(s: string, n = 32) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function RideTrackingPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [tripData, setTripData] = useState<any>(null);
  const { notify } = useRideNotifications();
  const prevStatusRef = useRef<string | null>(null);

  // Broadcast customer's live GPS to the driver while ride is active
  const isRideActive = tripData?.status && ["driver_assigned", "en_route", "arrived", "in_progress"].includes(tripData.status);
  useCustomerLocationBroadcast({
    tripId: isRideActive ? tripId ?? null : null,
    enabled: Boolean(isRideActive),
  });

  // Send push notifications when ride status changes
  useEffect(() => {
    if (!tripData?.status || tripData.status === prevStatusRef.current) return;
    prevStatusRef.current = tripData.status;

    const statusToEvent: Record<string, string> = {
      driver_assigned: "driver_assigned",
      en_route: "driver_en_route",
      arrived: "driver_arrived",
      in_progress: "trip_started",
      completed: "trip_completed",
      cancelled: "trip_cancelled",
    };

    const event = statusToEvent[tripData.status];
    if (event) {
      notify(event as any, { jobId: tripId });
    }
  }, [tripData?.status, notify]);

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("id, status, assigned_driver_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
        .eq("id", tripId)
        .maybeSingle();

      if (data) {
        setTripData(data);

        // Fetch driver info if assigned
        if (data.assigned_driver_id) {
          const { data: driver } = await supabase
            .from("drivers")
            .select("full_name, rating, total_trips, vehicle_plate, vehicle_model, vehicle_color, phone")
            .eq("id", data.assigned_driver_id)
            .maybeSingle();

          if (driver) {
            setTripData((prev: any) => ({ ...prev, driver }));
          }
        }
      }
    };

    fetchTrip();

    // Subscribe to ride_requests changes
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${tripId}`,
      }, (payload) => {
        setTripData((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  const statusMap: Record<string, "arriving" | "waiting" | "in_transit" | "almost_there"> = {
    driver_assigned: "arriving",
    en_route: "arriving",
    arrived: "waiting",
    in_progress: "in_transit",
    completing: "almost_there",
  };

  const driverInfo = tripData?.driver
    ? {
        name: tripData.driver.full_name || "",
        rating: tripData.driver.rating || 0,
        trips: tripData.driver.total_trips || 0,
        plate: tripData.driver.vehicle_plate || "",
        vehicle: tripData.driver.vehicle_model || "",
        vehicleColor: tripData.driver.vehicle_color || "",
        phone: tripData.driver.phone || "",
      }
    : undefined;

  const shareTrip = async () => {
    if (!tripId) return;
    const url = `${window.location.origin}/share/trip/${tripId}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: "Track my ZIVO ride",
          text: "I'm on my way — follow my live ride here.",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Trip share link copied");
    } catch {
      toast.error("Could not share trip");
    }
  };

  const { queue, advance, clear } = useMultiLegQueue();
  const handleNextLeg = () => {
    const lastDrop = tripData?.dropoff_address ?? queue?.current ?? "";
    const updated = advance();
    if (!updated) {
      clear();
      navigate("/rides/hub");
      return;
    }
    const sp = new URLSearchParams();
    if (lastDrop) sp.set("pickup", lastDrop);
    sp.set("destination", updated.current);
    if (updated.upcoming.length > 0) sp.set("multi", updated.upcoming.join("|"));
    navigate(`/rides/hub?${sp.toString()}`);
  };

  return (
    <AppLayout title="Live Tracking" showBack onBack={() => navigate("/rides/hub")} hideNav>
      <div className="p-4 space-y-4">
        {tripData?.status === "completed" && queue && queue.upcoming.length > 0 && (
          <button type="button"
            onClick={handleNextLeg}
            className="w-full flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 to-primary/5 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-lg">
              ➡️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Multi-stop · {queue.upcoming.length} leg{queue.upcoming.length === 1 ? "" : "s"} left
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                Book next leg → {queue.upcoming[0]}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Pickup auto-fills with where you just arrived.
              </div>
            </div>
          </button>
        )}
        {tripData?.status && tripData.status !== "completed" && tripData.status !== "cancelled" && (
          <button type="button"
            onClick={shareTrip}
            className="w-full flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-lg">
              🔗
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Share live trip
              </div>
              <div className="text-sm font-bold text-foreground">
                Send a public link so a friend can follow along
              </div>
            </div>
          </button>
        )}
        {tripData?.status === "completed" && (
          <>
            {tripData?.dropoff_address && (
              <SavePlaceInline address={tripData.dropoff_address} />
            )}
            <CrossServiceCTAs
              variant="after-ride"
              title="You've arrived — what's next?"
              context={{ dropoffAddress: tripData?.dropoff_address }}
            />
          </>
        )}
        {tripData?.status && ["en_route", "arrived", "in_progress"].includes(tripData.status) && tripData?.dropoff_address && (
          <button type="button"
            onClick={() => navigate(`/eats?q=${encodeURIComponent(tripData.dropoff_address)}`)}
            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/15 flex items-center justify-center text-lg">🍽️</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                Skip the wait
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                Pre-order food at {shortenAddress(tripData.dropoff_address)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Order now so it's ready when your ride arrives.
              </div>
            </div>
          </button>
        )}
        <DriverEnRouteTracker
          tripId={tripId || ""}
          driverId={tripData?.assigned_driver_id}
          driver={driverInfo}
          etaMinutes={5}
          pickupAddress={tripData?.pickup_address || ""}
          dropoffAddress={tripData?.dropoff_address || ""}
          pickupCoords={tripData?.pickup_lat ? { lat: tripData.pickup_lat, lng: tripData.pickup_lng } : null}
          dropoffCoords={tripData?.dropoff_lat ? { lat: tripData.dropoff_lat, lng: tripData.dropoff_lng } : null}
          status={statusMap[tripData?.status] || "arriving"}
          onContact={(type) => toast.info(type === "call" ? "Calling driver..." : "Opening chat...")}
          onShare={() => toast.success("Trip link copied!")}
          onCancel={() => toast.info("Safety center opened")}
        />
      </div>
      {isRideActive && tripId && (
        <TripChatFab rideRequestId={tripId} senderRole="rider" counterpartName={tripData?.driver?.full_name} />
      )}
    </AppLayout>
  );
}
