/**
 * DriverHomePage - Professional Driver Home Screen
 * iOS 2026 style dashboard with earnings hero, quick stats, quick actions
 * Ported from Zivo Driver Connect
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, MapPin, Navigation, Clock, DollarSign, X } from "lucide-react";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import DriverEarningsHero from "@/components/driver/DriverEarningsHero";
import DriverQuickStatsBar from "@/components/driver/DriverQuickStatsBar";
import DriverQuickActions from "@/components/driver/DriverQuickActions";
import { useDriverDashboardData } from "@/hooks/useDriverDashboardData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface JobOffer {
  id: string;
  job_id: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  estimated_fare: number | null;
  expires_at: string | null;
}

const OFFER_TTL = 25;

export default function DriverHomePage() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<JobOffer | null>(null);
  const [countdown, setCountdown] = useState(OFFER_TTL);
  const [accepting, setAccepting] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { stats, isLoading, driverId } = useDriverDashboardData();

  // Sync initial online status from DB
  useEffect(() => {
    if (!driverId) return;
    (supabase as any)
      .from("driver_profiles")
      .select("is_online")
      .eq("id", driverId)
      .maybeSingle()
      .then(({ data }: { data: { is_online?: boolean } | null }) => {
        if (data?.is_online != null) setIsOnline(data.is_online);
      });
  }, [driverId]);

  const clearOffer = useCallback(() => {
    setIncomingOffer(null);
    setCountdown(OFFER_TTL);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const fetchPendingOffer = useCallback(async (dId: string) => {
    const { data } = await (supabase as any)
      .from("job_offers")
      .select("id, job_id, expires_at, jobs(pickup_address, dropoff_address, distance_km, estimated_fare)")
      .eq("driver_id", dId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const job = (data as any).jobs ?? {};
      setIncomingOffer({
        id: data.id,
        job_id: data.job_id,
        pickup_address: job.pickup_address ?? "Pickup",
        dropoff_address: job.dropoff_address ?? "Dropoff",
        distance_km: job.distance_km ?? null,
        estimated_fare: job.estimated_fare ?? null,
        expires_at: data.expires_at,
      });
      setCountdown(OFFER_TTL);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearOffer(); return 0; }
          return c - 1;
        });
      }, 1000);
    }
  }, [clearOffer]);

  // Subscribe to job offers when online
  useEffect(() => {
    if (!isOnline || !driverId) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }
    fetchPendingOffer(driverId);
    const ch = supabase
      .channel(`driver-home-offers-${driverId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_offers", filter: `driver_id=eq.${driverId}` },
        () => fetchPendingOffer(driverId))
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; } };
  }, [isOnline, driverId, fetchPendingOffer]);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const toggleOnline = async () => {
    if (!driverId || togglingOnline) return;
    setTogglingOnline(true);
    const next = !isOnline;
    const { error } = await (supabase as any)
      .from("driver_profiles")
      .update({ is_online: next })
      .eq("id", driverId);
    setTogglingOnline(false);
    if (error) { toast.error("Could not update status"); return; }
    setIsOnline(next);
    toast.success(next ? "You're online — waiting for rides" : "You're offline");
    if (!next) clearOffer();
  };

  const acceptOffer = async () => {
    if (!incomingOffer || !driverId || accepting) return;
    setAccepting(true);
    const { error } = await (supabase as any).rpc("accept_job_offer", { p_offer_id: incomingOffer.id, p_driver_id: driverId });
    setAccepting(false);
    if (error) { toast.error("Could not accept ride"); return; }
    clearOffer();
    navigate(`/driver/map?job=${incomingOffer.job_id}`);
  };

  const declineOffer = async () => {
    if (!incomingOffer) return;
    await (supabase as any).from("job_offers").update({ status: "declined" }).eq("id", incomingOffer.id);
    clearOffer();
    toast.info("Ride declined");
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Quick Stats Bar */}
      <DriverQuickStatsBar
        trips={stats.todayDeliveries}
        earnings={stats.todayEarnings}
        hoursOnline={stats.hoursOnline}
        acceptanceRate={stats.acceptanceRate}
        tips={stats.todayTips}
      />

      <main className="flex-1 flex flex-col overflow-auto px-3 gap-1.5 mt-1 pb-24 [content-visibility:auto] [contain-intrinsic-size:1px_1200px]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Earnings Hero */}
            <DriverEarningsHero
              isOnline={isOnline}
              todayEarnings={stats.todayEarnings}
              todayDeliveries={stats.todayDeliveries}
              hoursOnline={stats.hoursOnline}
              targetEarnings={stats.dailyGoal}
              rating={stats.rating}
              todayTips={stats.todayTips}
            />

            {/* Go Online / Offline toggle */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={toggleOnline}
              disabled={togglingOnline || !driverId}
              className={`w-full rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isOnline
                  ? "bg-red-500/10 border border-red-500/30 text-red-500"
                  : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              }`}
            >
              {togglingOnline ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Car className="w-4 h-4" />
              )}
              {isOnline ? "Go Offline" : "Go Online"}
            </motion.button>

            {/* Quick Actions */}
            <DriverQuickActions />
          </>
        )}
      </main>

      {/* Incoming Job Offer Sheet */}
      <AnimatePresence>
        {incomingOffer && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6"
            style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 24px)" }}
          >
            <div className="rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden">
              {/* Countdown bar */}
              <div className="h-1 bg-muted/40">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(countdown / OFFER_TTL) * 100}%` }}
                  transition={{ duration: 0.9, ease: "linear" }}
                />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Car className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">New Ride Request</p>
                      <p className="text-[11px] text-muted-foreground">Expires in {countdown}s</p>
                    </div>
                  </div>
                  <button type="button" aria-label="Dismiss offer" onClick={declineOffer} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Pickup</p>
                      <p className="text-xs font-semibold text-foreground truncate">{incomingOffer.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Dropoff</p>
                      <p className="text-xs font-semibold text-foreground truncate">{incomingOffer.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4 text-[11px] text-muted-foreground">
                  {incomingOffer.distance_km != null && (
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{incomingOffer.distance_km.toFixed(1)} km</span>
                  )}
                  {incomingOffer.estimated_fare != null && (
                    <span className="flex items-center gap-1 font-bold text-foreground"><DollarSign className="w-3 h-3 text-emerald-500" />${incomingOffer.estimated_fare.toFixed(2)}</span>
                  )}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{Math.ceil((incomingOffer.distance_km ?? 5) / 0.5)} min</span>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={declineOffer}
                    className="flex-1 py-3 rounded-2xl border border-border/60 bg-muted/20 font-bold text-sm text-foreground active:scale-97 transition-transform">
                    Decline
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={acceptOffer}
                    disabled={accepting}
                    className="flex-2 flex-[2] py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-97 transition-transform disabled:opacity-70"
                  >
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Accept Ride
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DriverBottomNav isOnline={isOnline} />
    </div>
  );
}
