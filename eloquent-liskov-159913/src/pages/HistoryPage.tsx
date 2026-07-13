/**
 * HistoryPage — Unified activity history across all ZIVO services
 * Tabs: All · Rides · Eats · Flights · Hotels
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import SEOHead from "@/components/SEOHead";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Clock from "lucide-react/dist/esm/icons/clock";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";

type HistoryTab = "all" | "rides" | "eats" | "flights" | "hotels";

interface HistoryItem {
  id: string;
  type: "ride" | "eats" | "flight" | "hotel";
  title: string;
  subtitle: string;
  amount: number | null;
  status: string | null;
  date: string;
  icon: typeof Car;
  iconColor: string;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "completed" || s === "delivered" || s === "confirmed" || s === "ticketed")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle className="h-3 w-3" />{status}</span>;
  if (s === "cancelled" || s === "failed" || s === "refunded")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive"><XCircle className="h-3 w-3" />{status}</span>;
  if (s === "pending" || s === "processing")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600"><AlertCircle className="h-3 w-3" />{status}</span>;
  return <span className="text-[10px] font-semibold text-muted-foreground capitalize">{status}</span>;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<HistoryTab>("all");

  /* ── Rides ── */
  const { data: rides = [], isLoading: loadingRides } = useQuery({
    queryKey: ["history-rides", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("rides")
        .select("id, pickup_text, dest_text, price, ride_type, status, created_at")
        .eq("rider_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((r: any): HistoryItem => ({
        id: `ride-${r.id}`,
        type: "ride",
        title: r.dest_text || "Unknown destination",
        subtitle: r.pickup_text ? `From ${r.pickup_text}` : (r.ride_type || "Standard ride"),
        amount: r.price,
        status: r.status,
        date: r.created_at,
        icon: Car,
        iconColor: "bg-emerald-500/15 text-emerald-600",
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  /* ── Eats ── */
  const { data: eats = [], isLoading: loadingEats } = useQuery({
    queryKey: ["history-eats", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("food_orders")
        .select("id, total_amount, status, created_at, store_profiles:restaurant_id(name)")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((o: any): HistoryItem => ({
        id: `eats-${o.id}`,
        type: "eats",
        title: o.store_profiles?.name || "Restaurant order",
        subtitle: o.created_at ? format(new Date(o.created_at), "MMM d, yyyy") : "",
        amount: o.total_amount,
        status: o.status,
        date: o.created_at,
        icon: UtensilsCrossed,
        iconColor: "bg-orange-500/15 text-orange-600",
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  /* ── Flights ── */
  const { data: flights = [], isLoading: loadingFlights } = useQuery({
    queryKey: ["history-flights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("flight_bookings")
        .select("id, origin, destination, departure_date, total_amount, status, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((f: any): HistoryItem => ({
        id: `flight-${f.id}`,
        type: "flight",
        title: f.origin && f.destination ? `${f.origin} → ${f.destination}` : "Flight booking",
        subtitle: f.departure_date ? `Depart ${format(new Date(f.departure_date), "MMM d, yyyy")}` : "",
        amount: f.total_amount,
        status: f.status,
        date: f.created_at,
        icon: Plane,
        iconColor: "bg-sky-500/15 text-sky-600",
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  /* ── Hotels ── */
  const { data: hotels = [], isLoading: loadingHotels } = useQuery({
    queryKey: ["history-hotels", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("hotel_bookings")
        .select("id, hotel_id, check_in_date, check_out_date, nights, total_amount, status, created_at, store_profiles:hotel_id(name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []).map((h: any): HistoryItem => ({
        id: `hotel-${h.id}`,
        type: "hotel",
        title: (h.store_profiles as any)?.name || "Hotel booking",
        subtitle: h.check_in_date && h.check_out_date
          ? `${format(new Date(h.check_in_date), "MMM d")} – ${format(new Date(h.check_out_date), "MMM d, yyyy")} · ${h.nights} night${h.nights !== 1 ? "s" : ""}`
          : "",
        amount: h.total_amount,
        status: h.status,
        date: h.created_at,
        icon: Hotel,
        iconColor: "bg-amber-500/15 text-amber-600",
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const allItems = useMemo(
    () => [...rides, ...eats, ...flights, ...hotels].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rides, eats, flights, hotels]
  );

  const displayItems: HistoryItem[] =
    tab === "rides" ? rides :
    tab === "eats" ? eats :
    tab === "flights" ? flights :
    tab === "hotels" ? hotels :
    allItems;

  const isLoading =
    tab === "rides" ? loadingRides :
    tab === "eats" ? loadingEats :
    tab === "flights" ? loadingFlights :
    tab === "hotels" ? loadingHotels :
    loadingRides || loadingEats || loadingFlights || loadingHotels;

  const tabConfig: { id: HistoryTab; label: string; icon: typeof Car }[] = [
    { id: "all", label: "All", icon: Clock },
    { id: "rides", label: "Rides", icon: Car },
    { id: "eats", label: "Eats", icon: UtensilsCrossed },
    { id: "flights", label: "Flights", icon: Plane },
    { id: "hotels", label: "Hotels", icon: Hotel },
  ];

  const tabIcons: Record<HistoryTab, typeof Car> = { all: Clock, rides: Car, eats: UtensilsCrossed, flights: Plane, hotels: Hotel };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-base font-semibold text-foreground">Sign in to view your history</p>
        <button type="button" onClick={() => navigate("/login")} className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          Sign in
        </button>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="History | ZIVO" description="Your activity history across rides, eats, flights and hotels." />

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/20 safe-area-top">
          <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
            <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted/60 transition-colors">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-ig-gradient">History</h1>
            </div>
          </div>

          {/* Tabs — horizontal scroll on mobile */}
          <div className="flex max-w-2xl mx-auto px-4 gap-2 pb-3 overflow-x-auto scrollbar-none">
            {tabConfig.map(({ id, label, icon: Icon }) => (
              <button type="button"
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all",
                  tab === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-2 p-4">
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
                ))}
              </motion.div>
            ) : displayItems.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
                {(() => { const Icon = tabIcons[tab]; return <Icon className="h-16 w-16 text-muted-foreground/20" />; })()}
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">No {tab === "all" ? "activity" : tab} history yet</p>
                  <p className="text-sm text-muted-foreground">
                    {tab === "rides" ? "Book a ride to see it here." :
                     tab === "eats" ? "Order food to see it here." :
                     tab === "flights" ? "Book a flight to see it here." :
                     tab === "hotels" ? "Book a hotel to see it here." :
                     "Your activity across all ZIVO services will appear here."}
                  </p>
                </div>
                <button type="button"
                  onClick={() => navigate(
                    tab === "rides" ? "/rides/hub" :
                    tab === "eats" ? "/eats" :
                    tab === "flights" ? "/flights" :
                    tab === "hotels" ? "/hotels" : "/"
                  )}
                  className="px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
                >
                  {tab === "all" ? "Explore ZIVO" : `Book ${tab === "eats" ? "food" : tab === "hotels" ? "a hotel" : `a ${tab.slice(0, -1)}`}`}
                </button>
              </motion.div>
            ) : (
              <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="divide-y divide-border/20">
                {displayItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button type="button"
                      key={item.id}
                      onClick={() => {
                        if (item.type === "ride") navigate("/rides/hub");
                        else if (item.type === "eats") navigate("/eats");
                        else if (item.type === "flight") navigate("/flights");
                        else if (item.type === "hotel") navigate("/hotels");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0", item.iconColor)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={item.status} />
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {item.amount != null && item.amount > 0 && (
                          <p className="text-sm font-bold text-foreground">${item.amount.toFixed(2)}</p>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
