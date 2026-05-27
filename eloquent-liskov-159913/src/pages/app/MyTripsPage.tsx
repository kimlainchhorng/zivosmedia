/**
 * My Trips Page — 3D/4D Spatial UI
 */

import { useCallback, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronRight,
  Plane, Car, UtensilsCrossed, Package, MapPin, BedDouble, Compass,
  CarFront, CarTaxiFront, Building2, CreditCard, type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnifiedTrips, type UnifiedTrip, type ServiceType } from "@/hooks/useUnifiedTrips";
import { getServiceMeta } from "@/hooks/useZivoWallet";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/* ── Bokeh Particle ── */
const BokehParticle = ({ delay, size, x, y, color }: { delay: number; size: number; x: string; y: string; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, left: x, top: y, background: color, filter: `blur(${size * 0.4}px)` }}
    animate={{ opacity: [0.12, 0.35, 0.12], scale: [0.8, 1.2, 0.8], y: [0, -15, 0] }}
    transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

/* ── Glass Card ── */
const GlassCard3D = ({ children, className = "", allowOverflow = false }: { children: React.ReactNode; className?: string; allowOverflow?: boolean }) => (
  <div className={`relative ${allowOverflow ? '' : 'overflow-hidden'} rounded-2xl ${className}`}>
    <div className="absolute inset-0 bg-card/65 backdrop-blur-2xl rounded-2xl" />
    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.015] rounded-2xl" />
    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
    <div className="relative z-10">{children}</div>
  </div>
);

const serviceFilters: Array<{ id: ServiceType | "all"; label: string; icon?: React.ElementType }> = [
  { id: "all", label: "All" },
  { id: "flights", label: "Flights", icon: Plane },
  { id: "hotels", label: "Hotels", icon: BedDouble },
  { id: "p2p_cars", label: "Cars", icon: CarFront },
  { id: "rides", label: "Ride", icon: CarTaxiFront },
];

const statusFilters = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
];

const tripIconMap: Record<string, LucideIcon> = {
  "plane": Plane,
  "car": Car,
  "car-front": CarFront,
  "car-taxi-front": CarTaxiFront,
  "utensils-crossed": UtensilsCrossed,
  "package": Package,
  "building-2": Building2,
  "target": MapPin,
  "credit-card": CreditCard,
};

function TripCard({ trip, index }: { trip: UnifiedTrip; index: number }) {
  const meta = getServiceMeta(trip.service);
  const TripIcon = tripIconMap[trip.icon] || Plane;
  
  const statusStyles: Record<string, string> = {
    pending: "bg-amber-500/12 text-amber-600 border-amber-500/20",
    confirmed: "bg-sky-500/12 text-sky-600 border-sky-500/20",
    approved: "bg-sky-500/12 text-sky-600 border-sky-500/20",
    active: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
    in_progress: "bg-emerald-500/12 text-emerald-600 border-emerald-500/20",
    completed: "bg-muted text-muted-foreground border-border/40",
    delivered: "bg-muted text-muted-foreground border-border/40",
    cancelled: "bg-destructive/12 text-destructive border-destructive/20",
    rejected: "bg-destructive/12 text-destructive border-destructive/20",
    cancel_requested: "bg-orange-500/12 text-orange-600 border-orange-500/20",
  };

  const detailPath = trip.detailPath;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 25, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02, y: -3, rotateX: 1 }}
      whileTap={{ scale: 0.97 }}
      style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-primary/[0.06] ring-1 ring-border/20 group">
        {/* Glass layers */}
        <div className="absolute inset-0 bg-card/70 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01]" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />

        <div className="relative z-10 flex items-stretch">
          {/* Left accent */}
          <div className="w-1 bg-gradient-to-b from-primary via-primary/60 to-primary/20 shrink-0" />
          <div className="flex items-start gap-3.5 p-4 flex-1">
            {/* 3D Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/8 flex items-center justify-center shrink-0 mt-0.5 shadow-inner border border-primary/10">
              <TripIcon className="w-5.5 h-5.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-foreground">{trip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{trip.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <Badge variant="outline" className={`text-[10px] font-bold border rounded-full px-2 ${statusStyles[trip.status] || 'bg-muted text-muted-foreground border-border/40'}`}>
                  {trip.status.replace(/_/g, " ")}
                </Badge>
                <span className="text-[10px] text-muted-foreground/60 font-medium">
                  {format(new Date(trip.date), "MMM d, yyyy")}
                </span>
              </div>
              
              <div className="mt-2.5 pt-2.5 border-t border-border/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{meta.label}</span>
                <span className="font-bold text-foreground">${trip.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return detailPath ? <Link to={detailPath}>{cardContent}</Link> : cardContent;
}

function NextTripCard({ trips }: { trips: UnifiedTrip[] | undefined }) {
  const next = useMemo(() => {
    if (!trips) return null;
    const upcoming = trips.filter(t => t.status === "confirmed" || t.status === "pending" || t.status === "approved");
    if (!upcoming.length) return null;
    return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [trips]);

  if (!next) return null;

  const tripDate = new Date(next.date);
  const now = new Date();
  const diffMs = tripDate.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const countdownLabel = diffMs < 0 ? "Departing now" : diffH < 1 ? "In less than 1 hr" : diffH < 24 ? `In ${diffH}h` : `In ${diffD}d`;
  const meta = getServiceMeta(next.service);
  const TripIconEl = ({ className }: { className?: string }) => {
    const I = { "plane": Plane, "car": Car, "car-front": CarFront, "car-taxi-front": CarTaxiFront }[next.icon] || Plane;
    return <I className={className} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 rounded-2xl overflow-hidden shadow-lg shadow-primary/[0.08]"
    >
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 backdrop-blur-xl" />
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/20" />
        <div className="relative z-10 flex items-center gap-3.5 p-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <TripIconEl className="w-5.5 h-5.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Next Trip</p>
              <span className="text-[10px] font-bold bg-primary/20 text-primary rounded-full px-2 py-0.5">{countdownLabel}</span>
            </div>
            <p className="font-bold text-sm text-foreground truncate">{next.title}</p>
            <p className="text-[11px] text-muted-foreground">{meta.label} · {format(tripDate, "MMM d, h:mm a")}</p>
          </div>
          {next.detailPath && (
            <Link to={next.detailPath}
              className="shrink-0 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 touch-manipulation active:scale-95 transition-all">
              View
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MyTripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceFilter = (searchParams.get("service") || "all") as ServiceType | "all";
  const statusFilter = searchParams.get("status") || "all";

  const setServiceFilter = (v: ServiceType | "all") => setSearchParams(p => { const n = new URLSearchParams(p); v === "all" ? n.delete("service") : n.set("service", v); return n; }, { replace: true });
  const setStatusFilter = (v: string) => setSearchParams(p => { const n = new URLSearchParams(p); v === "all" ? n.delete("status") : n.set("status", v); return n; }, { replace: true });

  const { data: trips, isLoading, refetch } = useUnifiedTrips({
    services: serviceFilter === "all" ? undefined : [serviceFilter],
    status: statusFilter as any,
    limit: 50,
  });

  const handlePullRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden safe-area-bottom">
      {/* ── 3D Background ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <img
          src="/images/trips-bg-3d.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.1]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-primary/[0.03]" />
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.06] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-primary/[0.04] blur-[80px]" />
        <BokehParticle delay={0} size={50} x="10%" y="15%" color="hsl(var(--primary) / 0.07)" />
        <BokehParticle delay={1.5} size={35} x="80%" y="25%" color="hsl(var(--primary) / 0.05)" />
        <BokehParticle delay={2.8} size={60} x="85%" y="60%" color="hsl(var(--primary) / 0.04)" />
        <BokehParticle delay={0.8} size={40} x="15%" y="70%" color="hsl(var(--primary) / 0.06)" />
        <BokehParticle delay={3.2} size={30} x="55%" y="85%" color="hsl(var(--primary) / 0.05)" />
      </div>

      {/* ── Scrollable Content ── */}
      <PullToRefresh onRefresh={handlePullRefresh} className="relative z-10 h-screen">
        <div className="pb-24 scroll-smooth min-h-full" style={{ scrollbarWidth: "none" }}>
          {/* ── Sticky 3D Header ── */}
          <div className="sticky top-0 safe-area-top z-40">
            <div className="relative">
              <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
              <div className="relative z-10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.1, rotateY: 10 }} whileTap={{ scale: 0.88 }}>
                    <Link
                      to="/app"
                      className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/60 backdrop-blur-xl border border-border/30 flex items-center justify-center touch-manipulation shadow-lg shadow-primary/[0.05] hover:bg-card/80 transition-all"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Link>
                  </motion.div>
                  <div>
                    <h1 className="text-lg font-bold">My Trips</h1>
                    <p className="text-[10px] text-muted-foreground">All your bookings in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Next Trip Countdown ── */}
          <div className="pt-4 max-w-lg mx-auto">
            <NextTripCard trips={trips} />
          </div>

          {/* ── Filters ── */}
          <div className="px-4 space-y-3 max-w-lg mx-auto">
            {/* Service Filter — Clean Pill Chips (matching reference) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative rounded-2xl shadow-lg shadow-primary/[0.04]">
                <div className="absolute inset-0 bg-card/65 backdrop-blur-2xl rounded-2xl" />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" />
                <div className="relative z-10 flex flex-wrap items-center gap-2 p-3">
                  {serviceFilters.map((filter) => (
                    <motion.button
                      key={filter.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setServiceFilter(filter.id)}
                      className={cn(
                        "shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[11px] font-bold transition-all duration-300 touch-manipulation",
                        serviceFilter === filter.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                          : "bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                      )}
                    >
                      {filter.icon && <filter.icon className="w-3.5 h-3.5" />}
                      {filter.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Status Filter — 3D Glass Tab Bar */}
            <motion.div
              initial={{ opacity: 0, y: 15, rotateX: 5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{ perspective: '800px' }}
            >
              <GlassCard3D className="shadow-lg shadow-primary/[0.04]">
                <div className="flex gap-0.5 p-1.5">
                  {statusFilters.map((filter) => (
                    <motion.button
                      key={filter.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setStatusFilter(filter.id)}
                      className={cn(
                        "flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-300 touch-manipulation",
                        statusFilter === filter.id
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                      )}
                    >
                      {filter.label}
                    </motion.button>
                  ))}
                </div>
              </GlassCard3D>
            </motion.div>

            {/* ── Trips List ── */}
            <div className="pt-1">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="relative rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-card/50 backdrop-blur-xl" />
                        <div className="relative h-28 animate-pulse" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : trips && trips.length > 0 ? (
                <div className="space-y-3">
                  {trips.map((trip, i) => (
                    <TripCard key={trip.id} trip={trip} index={i} />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 30, rotateX: 8 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ perspective: '800px' }}
                >
                  <GlassCard3D className="shadow-xl">
                    <div className="p-10 text-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-4 shadow-inner border border-primary/10"
                      >
                        <Compass className="w-9 h-9 text-primary/30" />
                      </motion.div>
                      <h3 className="font-bold text-lg mb-1">No trips found</h3>
                      <p className="text-sm text-muted-foreground mb-5 max-w-[260px] mx-auto">
                        {statusFilter !== "all" 
                          ? `No ${statusFilter} trips in ${serviceFilter === "all" ? "any service" : serviceFilter}`
                          : "Start booking to see your trips here"}
                      </p>
                      <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.96 }}>
                        <Button asChild className="rounded-2xl h-12 font-bold text-base shadow-xl shadow-primary/25 bg-gradient-to-r from-primary to-primary/85 border border-primary/20 px-8">
                          <Link to="/app">Explore Services</Link>
                        </Button>
                      </motion.div>
                    </div>
                  </GlassCard3D>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      <MobileBottomNav />
    </div>
  );
}
