/**
 * TripStatusPage - Real-time ride tracking page
 * Subscribes to job row updates via Supabase Realtime and renders
 * DriverEnRouteTracker once a driver is assigned.
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, Car } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DriverEnRouteTracker from "@/components/rides/DriverEnRouteTracker";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type JobStatus =
  | "created"
  | "requested"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

interface JobRow {
  id: string;
  status: JobStatus;
  driver_id: string | null;
  customer_id: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  assigned_at: string | null;
  total_price: number | null;
}

interface DriverProfile {
  full_name: string | null;
  rating: number | null;
  trips_count: number | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  phone: string | null;
  avatar_url: string | null;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapToTrackerStatus(
  status: JobStatus
): "arriving" | "waiting" | "in_transit" | "almost_there" {
  switch (status) {
    case "accepted":
    case "en_route":
      return "arriving";
    case "arrived":
      return "waiting";
    case "in_progress":
      return "in_transit";
    default:
      return "arriving";
  }
}

const FINDING_STATUSES: JobStatus[] = ["created", "requested"];
const DRIVER_STATUSES: JobStatus[] = [
  "accepted",
  "en_route",
  "arrived",
  "in_progress",
];

// ─── Finding driver animation ─────────────────────────────────────────────────

function FindingDriverScreen() {
  return (
    <motion.div
      key="finding"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center gap-6 py-20 px-6 text-center"
    >
      {/* Pulsing car icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Car className="w-10 h-10 text-primary" />
        </div>
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
      </div>

      <div className="space-y-1">
        <p className="text-lg font-bold text-foreground">Finding your driver</p>
        <p className="text-sm text-muted-foreground">
          We're matching you with a nearby driver&hellip;
        </p>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-medium">Usually under 2 minutes</span>
      </div>
    </motion.div>
  );
}

// ─── Trip complete screen ─────────────────────────────────────────────────────

function TripCompleteScreen({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-6 py-20 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
        className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center"
      >
        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
      </motion.div>

      <div className="space-y-1">
        <p className="text-2xl font-black text-foreground">You've arrived!</p>
        <p className="text-sm text-muted-foreground">
          Thanks for riding with ZIVO. Have a great day!
        </p>
      </div>

      <button type="button"
        onClick={onDone}
        className="mt-2 w-full max-w-xs rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 active:scale-95 transition-transform"
      >
        Done
      </button>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TripStatusPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<JobRow | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(5);
  const [isCancelling, setIsCancelling] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const etaIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchedDriverRef = useRef<string | null>(null);

  // ── Fetch job on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      const { data, error } = await (supabase as any)
        .from("jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast.error("Could not load trip details");
        return;
      }
      if (data) {
        setJob(data as JobRow);
      }
    };

    fetchJob();
  }, [id]);

  // ── Subscribe to realtime job changes ──────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`trip-status-${id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setJob((prev) => ({ ...(prev as JobRow), ...(payload.new as JobRow) }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id]);

  // ── Fetch driver profile when driver_id becomes available ──────────────────
  useEffect(() => {
    if (!job?.driver_id) return;
    if (fetchedDriverRef.current === job.driver_id) return;
    fetchedDriverRef.current = job.driver_id;

    const fetchDriver = async () => {
      const { data } = await (supabase as any)
        .from("driver_profiles")
        .select(
          "full_name,rating,trips_count,vehicle_model,vehicle_color,license_plate,phone,avatar_url"
        )
        .eq("id", job.driver_id)
        .maybeSingle();

      if (data) {
        setDriverProfile(data as DriverProfile);
      }
    };

    fetchDriver();
  }, [job?.driver_id]);

  // ── Decrement ETA each minute while ride is active ─────────────────────────
  useEffect(() => {
    const isActive =
      job?.status && DRIVER_STATUSES.includes(job.status as JobStatus);

    if (!isActive) {
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
        etaIntervalRef.current = null;
      }
      return;
    }

    if (etaIntervalRef.current) return; // already running

    etaIntervalRef.current = setInterval(() => {
      setEtaMinutes((prev) => Math.max(0, prev - 1));
    }, 60_000);

    return () => {
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
        etaIntervalRef.current = null;
      }
    };
  }, [job?.status]);

  // ── Redirect when completed ────────────────────────────────────────────────
  useEffect(() => {
    if (job?.status === "completed") {
      // Show success screen briefly then auto-redirect after 4s
      const timer = setTimeout(() => navigate("/"), 4000);
      return () => clearTimeout(timer);
    }
  }, [job?.status, navigate]);

  // ── Cancel trip ────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!id || isCancelling) return;
    setIsCancelling(true);
    try {
      const { error } = await (supabase as any)
        .from("jobs")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Trip cancelled");
      navigate(-1);
    } catch {
      toast.error("Could not cancel trip. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Contact driver ─────────────────────────────────────────────────────────
  const handleContact = (type: "call" | "message") => {
    if (type === "call" && driverProfile?.phone) {
      window.location.href = `tel:${driverProfile.phone}`;
    } else {
      toast.info(type === "call" ? "Calling driver…" : "Opening chat…");
    }
  };

  // ── Share trip ─────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = `${window.location.origin}/share/trip/${id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: "Track my ZIVO ride",
          text: "Follow my live ride here.",
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

  // ── Derived values ─────────────────────────────────────────────────────────
  const driverInfo = driverProfile
    ? {
        name: driverProfile.full_name ?? "",
        rating: driverProfile.rating ?? 4.8,
        trips: driverProfile.trips_count ?? 0,
        plate: driverProfile.license_plate ?? "",
        vehicle: driverProfile.vehicle_model ?? "",
        vehicleColor: driverProfile.vehicle_color ?? "",
        phone: driverProfile.phone ?? undefined,
      }
    : undefined;

  const pickupCoords =
    job?.pickup_lat != null && job?.pickup_lng != null
      ? { lat: job.pickup_lat, lng: job.pickup_lng }
      : null;

  const dropoffCoords =
    job?.dropoff_lat != null && job?.dropoff_lng != null
      ? { lat: job.dropoff_lat, lng: job.dropoff_lng }
      : null;

  const trackerStatus = job?.status
    ? mapToTrackerStatus(job.status as JobStatus)
    : "arriving";

  const isFinding =
    !job?.status || FINDING_STATUSES.includes(job.status as JobStatus);
  const hasDriver =
    job?.status && DRIVER_STATUSES.includes(job.status as JobStatus);
  const isComplete = job?.status === "completed";
  const isCancelled = job?.status === "cancelled";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col overscroll-none">
      {/* Safe-area aware header */}
      <div
        className="flex items-center gap-3 px-4 pb-3 pt-[calc(var(--zivo-safe-top,0px)+12px)] bg-background/95 backdrop-blur-sm border-b border-border/30 sticky top-0 z-20"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)" }}
      >
        <button type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ig-gradient leading-tight">
            Live Tracking
          </h1>
          {job?.status && (
            <p className="text-[11px] text-muted-foreground capitalize">
              {job.status.replace(/_/g, " ")}
            </p>
          )}
        </div>

        {/* Live indicator dot */}
        {hasDriver && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-600">Live</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            {isCancelled && (
              <motion.div
                key="cancelled"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 py-20 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Car className="w-10 h-10 text-red-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-foreground">
                    Trip Cancelled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your trip has been cancelled.
                  </p>
                </div>
                <button type="button"
                  onClick={() => navigate("/")}
                  className="mt-2 rounded-2xl bg-primary text-primary-foreground font-bold py-3 px-8 active:scale-95 transition-transform"
                >
                  Go Home
                </button>
              </motion.div>
            )}

            {isComplete && (
              <TripCompleteScreen onDone={() => navigate("/")} />
            )}

            {!isCancelled && !isComplete && isFinding && (
              <FindingDriverScreen />
            )}

            {!isCancelled && !isComplete && hasDriver && (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <DriverEnRouteTracker
                  tripId={id ?? ""}
                  driverId={job?.driver_id}
                  driver={driverInfo}
                  etaMinutes={etaMinutes}
                  pickupAddress={job?.pickup_address ?? ""}
                  dropoffAddress={job?.dropoff_address ?? ""}
                  pickupCoords={pickupCoords}
                  dropoffCoords={dropoffCoords}
                  status={trackerStatus}
                  onCancel={handleCancel}
                  onContact={handleContact}
                  onShare={handleShare}
                />

                {/* Cancel trip button — only shown while not yet in transit */}
                {(trackerStatus === "arriving" || trackerStatus === "waiting") && (
                  <button type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className={cn(
                      "w-full py-3 rounded-2xl border border-red-500/30 text-red-500 text-sm font-bold",
                      "bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] transition-all",
                      isCancelling && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isCancelling ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cancelling…
                      </span>
                    ) : (
                      "Cancel Trip"
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
