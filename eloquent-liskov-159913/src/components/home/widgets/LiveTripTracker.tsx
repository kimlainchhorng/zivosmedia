/**
 * LiveTripTracker - Real-time card showing active ride/delivery with ETA countdown
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Package from "lucide-react/dist/esm/icons/package";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Clock from "lucide-react/dist/esm/icons/clock";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ActiveTrip {
  id: string;
  type: "ride" | "food" | "delivery";
  status: string;
  destination: string;
  eta_minutes: number;
  driver_name?: string;
  progress: number;
}

const typeConfig = {
  ride: { icon: Car, label: "Ride" },
  food: { icon: UtensilsCrossed, label: "Food Delivery" },
  delivery: { icon: Package, label: "Package" },
};

const statusLabels: Record<string, { label: string }> = {
  driver_assigned: { label: "Driver assigned" },
  en_route: { label: "On the way" },
  arriving: { label: "Arriving now" },
  picked_up: { label: "In transit" },
  preparing: { label: "Preparing" },
  out_for_delivery: { label: "Out for delivery" },
};

export default function LiveTripTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [countdown, setCountdown] = useState(0);
  const activeTripRef = useRef<ActiveTrip | null>(null);
  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  // Realtime for active trips, with polling as an app-resume/network fallback.
  useEffect(() => {
    if (!user?.id) return;

    const fetchActive = async () => {
      // Check active rides
      const { data: rides } = await supabase
        .from("trips")
        .select("id, status, dropoff_address, driver_id")
        .eq("rider_id", user.id)
        .in("status", ["accepted", "en_route", "arriving"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (rides?.[0]) {
        const r = rides[0];
        const progressMap: Record<string, number> = { accepted: 20, en_route: 55, arriving: 85 };
        setActiveTrip({
          id: r.id,
          type: "ride",
          status: r.status === "accepted" ? "driver_assigned" : r.status,
          destination: r.dropoff_address?.slice(0, 30) || "Destination",
          eta_minutes: r.status === "arriving" ? 2 : r.status === "en_route" ? 6 : 10,
          progress: progressMap[r.status] || 30,
        });
        return;
      }

      // Check active food orders
      const { data: orders } = await supabase
        .from("food_orders")
        .select("id, status, delivery_address")
        .eq("customer_id", user.id)
        .in("status", ["confirmed", "preparing", "ready", "out_for_delivery"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (orders?.[0]) {
        const o = orders[0];
        const progressMap: Record<string, number> = { confirmed: 10, preparing: 30, ready: 55, out_for_delivery: 85 };
        setActiveTrip({
          id: o.id,
          type: "food",
          status: o.status === "out_for_delivery" ? "out_for_delivery" : o.status,
          destination: (o.delivery_address as string)?.slice(0, 30) || "Your address",
          eta_minutes: o.status === "out_for_delivery" ? 5 : 15,
          progress: progressMap[o.status] || 20,
        });
        return;
      }

      setActiveTrip(null);
    };

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        await fetchActive();
      }
      if (cancelled) return;
      // Poll fast (15s) only when something active is on screen; otherwise back off to 60s.
      const delay = activeTripRef.current ? 15000 : 60000;
      timeout = setTimeout(tick, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timeout) clearTimeout(timeout);
        tick();
      }
    };

    const channel = supabase
      .channel(`home-live-trip-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips", filter: `rider_id=eq.${user.id}` },
        () => {
          void fetchActive();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `customer_id=eq.${user.id}` },
        () => {
          void fetchActive();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `user_id=eq.${user.id}` },
        () => {
          void fetchActive();
        },
      )
      .subscribe();

    fetchActive();
    timeout = setTimeout(tick, 15000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ETA countdown
  useEffect(() => {
    if (!activeTrip) return;
    setCountdown(activeTrip.eta_minutes * 60);
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [activeTrip]);

  if (!activeTrip) return null;

  const cfg = typeConfig[activeTrip.type];
  const Icon = cfg.icon;
  const statusInfo = statusLabels[activeTrip.status] || { label: activeTrip.status };
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(activeTrip.type === "ride" ? `/rides/track/${activeTrip.id}` : `/orders/${activeTrip.id}`)}
      className="w-full rounded-lg bg-card border border-border p-5 text-left relative active:bg-muted/50 transition-colors touch-manipulation"
    >
      {/* Live pulse — IG-gradient ring marks "active" */}
      <div className="absolute top-4 right-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ig-gradient opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-ig-gradient items-center justify-center">
            <Navigation className="w-2 h-2 text-white" />
          </span>
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-foreground" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
            <Badge variant="outline" className="text-[9px] font-bold text-foreground border-border bg-muted">
              {statusInfo.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{activeTrip.destination}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={activeTrip.progress} className="h-1.5 mb-3" />

      {/* ETA countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-foreground" />
          <span className="text-xs font-bold text-foreground">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <span className="text-[10px] text-muted-foreground">ETA</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
          Track <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.button>
  );
}
