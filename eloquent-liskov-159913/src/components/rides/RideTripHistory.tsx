/**
 * RideTripHistory — Real trip list from ride_requests + drivers tables
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Car, Star, DollarSign, RotateCcw, ChevronRight, Filter, Search, CheckCircle, X, ChevronDown, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RequestRefundDialog from "./RequestRefundDialog";
import ReceiptDownloadButton from "./ReceiptDownloadButton";

type TripStatus = "completed" | "cancelled" | "disputed";

interface Trip {
  id: string;
  realId: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  dropoffLat?: number;
  dropoffLng?: number;
  driver: string;
  driverInitials: string;
  driverRating: number;
  vehicle: string;
  amount: number;
  amountCents: number;
  distance: string;
  duration: string;
  status: TripStatus;
  rating?: number;
  paymentMethod: string;
}

const statusColors: Record<TripStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-destructive/10 text-destructive",
  disputed: "bg-amber-500/10 text-amber-500",
};

interface RideTripHistoryProps {
  onRebook?: (dropoffAddress: string, dropoffLat?: number, dropoffLng?: number) => void;
}

export default function RideTripHistory({ onRebook }: RideTripHistoryProps = {}) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<Trip | null>(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetchTrips = async () => {
      const { data: rides } = await supabase
        .from("ride_requests")
        .select("id, created_at, pickup_address, dropoff_address, dropoff_lat, dropoff_lng, assigned_driver_id, payment_amount, distance_miles, duration_minutes, status, payment_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!rides || rides.length === 0) { setTrips([]); setLoading(false); return; }

      // Fetch driver details for assigned rides
      const driverIds = [...new Set(rides.map(r => r.assigned_driver_id).filter(Boolean))] as string[];
      let driversMap: Record<string, any> = {};
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from("drivers")
          .select("id, full_name, rating, vehicle_model, vehicle_color")
          .in("id", driverIds);
        if (drivers) {
          driversMap = Object.fromEntries(drivers.map(d => [d.id, d]));
        }
      }

      const mapped: Trip[] = rides.map(r => {
        const driver = r.assigned_driver_id ? driversMap[r.assigned_driver_id] : null;
        const driverName = driver?.full_name || "—";
        const initials = driverName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
        const created = new Date(r.created_at);
        const mapStatus = (s: string): TripStatus => {
          if (s === "completed") return "completed";
          if (s === "cancelled") return "cancelled";
          if (s === "disputed") return "disputed";
          return "completed";
        };

        return {
          id: r.id.slice(0, 8).toUpperCase(),
          realId: r.id,
          date: created.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          time: created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          pickup: r.pickup_address,
          dropoff: r.dropoff_address,
          driver: driverName,
          driverInitials: initials || "—",
          driverRating: driver?.rating ?? 0,
          vehicle: [driver?.vehicle_color, driver?.vehicle_model].filter(Boolean).join(" ") || "—",
          amount: r.payment_amount ?? 0,
          amountCents: Math.round((r.payment_amount ?? 0) * 100),
          distance: r.distance_miles ? `${r.distance_miles.toFixed(1)} mi` : "—",
          duration: r.duration_minutes ? `${r.duration_minutes} min` : "—",
          status: mapStatus(r.status),
          paymentMethod: r.payment_status === "paid" ? "Card on file" : r.payment_status || "—",
          dropoffLat: r.dropoff_lat ?? undefined,
          dropoffLng: r.dropoff_lng ?? undefined,
        };
      });

      setTrips(mapped);
      setLoading(false);
    };

    fetchTrips();
  }, [user?.id]);

  const filtered = trips.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search && !t.pickup.toLowerCase().includes(search.toLowerCase()) && !t.dropoff.toLowerCase().includes(search.toLowerCase()) && !t.driver.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="px-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl text-sm" />
        </div>
      </div>

      {/* Status filter */}
      <div className="px-4 flex gap-2">
        {(["all", "completed", "cancelled"] as const).map(s => (
          <button type="button"
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
              statusFilter === s ? "bg-foreground text-background" : "bg-muted/30 text-muted-foreground"
            )}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Trip list */}
      <div className="px-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading trips...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No trips found</div>
        ) : (
          <AnimatePresence>
            {filtered.map(trip => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-card border border-border/30 overflow-hidden"
              >
                <button type="button"
                  onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-foreground/5 text-foreground font-bold text-xs">{trip.driverInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground truncate">{trip.dropoff}</span>
                      <span className="text-sm font-bold text-foreground ml-2">${trip.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{trip.date} · {trip.time}</span>
                      <Badge className={cn("text-[8px] font-bold px-1.5 py-0 h-4 border-0", statusColors[trip.status])}>{trip.status}</Badge>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedTrip === trip.id && "rotate-180")} />
                </button>

                {expandedTrip === trip.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="px-3 pb-3 border-t border-border/20 pt-2 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Pickup</span><span className="text-foreground text-right max-w-[60%] truncate">{trip.pickup}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dropoff</span><span className="text-foreground text-right max-w-[60%] truncate">{trip.dropoff}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Driver</span><span className="text-foreground">{trip.driver} {trip.driverRating > 0 && `· ⭐ ${trip.driverRating.toFixed(1)}`}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="text-foreground">{trip.vehicle}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="text-foreground">{trip.distance}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="text-foreground">{trip.duration}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="text-foreground">{trip.paymentMethod}</span></div>
                    {trip.status === "completed" && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                          <ReceiptDownloadButton rideRequestId={trip.realId} className="flex-1" />
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-xl" onClick={() => setRefundFor(trip)}>
                            Request refund
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs rounded-xl gap-1.5"
                          onClick={() => {
                            if (onRebook) {
                              onRebook(trip.dropoff, trip.dropoffLat, trip.dropoffLng);
                            } else {
                              toast.info("Rebooking this route...");
                            }
                          }}
                        >
                          <RotateCcw className="w-3 h-3" /> Rebook this trip
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {refundFor && (
        <RequestRefundDialog
          open={!!refundFor}
          onOpenChange={(o) => !o && setRefundFor(null)}
          rideRequestId={refundFor.realId}
          tripTotalCents={refundFor.amountCents}
        />
      )}
    </div>
  );
}
