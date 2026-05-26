/**
 * RideTripHistory — Real trip list from ride_requests + drivers tables
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, Car, Star, DollarSign, RotateCcw, ChevronRight, Filter, Search, CheckCircle, X, ChevronDown, Receipt, Copy } from "lucide-react";
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
import { formatBakongBillId } from "@/lib/khqr";

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
  amountLabel: string;
  amountCents: number;
  distance: string;
  duration: string;
  status: TripStatus;
  rating?: number;
  paymentMethod: string;
  paymentBillId?: string;
  paymentReference?: string;
  paymentVerifiedBy?: string;
  canRequestRefund: boolean;
}

const statusColors: Record<TripStatus, string> = {
  completed: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-destructive/10 text-destructive",
  disputed: "bg-amber-500/10 text-amber-500",
};

const USD_TO_KHR = 4062.5;

function formatKhr(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} KHR`;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function humanizeStatus(status?: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isBakongPayment(row: {
  payment_status?: string | null;
  payment_currency?: string | null;
  bakong_reference?: string | null;
}): boolean {
  return (
    row.payment_currency?.toUpperCase() === "KHR" ||
    row.payment_status === "bakong_paid" ||
    Boolean(row.bakong_reference)
  );
}

function formatTripAmount(row: {
  payment_amount?: number | null;
  payment_currency?: string | null;
  bakong_amount_khr?: number | null;
  payment_status?: string | null;
}): { label: string; cents: number } {
  const amount = Number(row.payment_amount ?? 0);
  if (row.payment_currency?.toUpperCase() === "KHR" || row.payment_status === "bakong_paid") {
    const amountKhr = Number(row.bakong_amount_khr ?? amount);
    return {
      label: formatKhr(amountKhr),
      cents: Math.round((amountKhr / USD_TO_KHR) * 100),
    };
  }

  return {
    label: formatUsd(amount),
    cents: Math.round(amount * 100),
  };
}

function formatPaymentMethod(row: {
  payment_status?: string | null;
  payment_currency?: string | null;
  bakong_reference?: string | null;
  bakong_verified_by?: string | null;
}): string {
  if (isBakongPayment(row)) return "Bakong KHQR";
  if (row.payment_status === "cash") return "Cash";
  if (["paid", "captured", "authorized", "requires_capture"].includes(row.payment_status ?? "")) return "Card on file";
  return humanizeStatus(row.payment_status);
}

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
        .select("id, created_at, pickup_address, dropoff_address, dropoff_lat, dropoff_lng, assigned_driver_id, payment_amount, payment_currency, payment_intent_id, stripe_payment_intent_id, captured_amount_cents, bakong_reference, bakong_amount_khr, bakong_verified_by, distance_miles, duration_minutes, status, payment_status")
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
        const payment = formatTripAmount(r);
        const bakongPayment = isBakongPayment(r);
        const canRequestRefund = !bakongPayment && Boolean(r.payment_intent_id || r.stripe_payment_intent_id || (r.captured_amount_cents ?? 0) > 0);

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
          amountLabel: payment.label,
          amountCents: payment.cents,
          distance: r.distance_miles ? `${r.distance_miles.toFixed(1)} mi` : "—",
          duration: r.duration_minutes ? `${r.duration_minutes} min` : "—",
          status: mapStatus(r.status),
          paymentMethod: formatPaymentMethod(r),
          paymentBillId: formatBakongBillId(r.bakong_reference) ?? undefined,
          paymentReference: r.bakong_reference ?? undefined,
          paymentVerifiedBy: r.bakong_verified_by ?? undefined,
          canRequestRefund,
          dropoffLat: r.dropoff_lat ?? undefined,
          dropoffLng: r.dropoff_lng ?? undefined,
        };
      });

      setTrips(mapped);
      setLoading(false);
    };

    fetchTrips();
  }, [user?.id]);

  const searchQuery = search.trim().toLowerCase();
  const filtered = trips.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchQuery && ![
      t.id,
      t.realId,
      t.pickup,
      t.dropoff,
      t.driver,
      t.vehicle,
      t.amountLabel,
      t.paymentMethod,
      t.paymentBillId,
      t.paymentReference,
      t.paymentVerifiedBy,
    ].some((value) => String(value || "").toLowerCase().includes(searchQuery))) return false;
    return true;
  });

  const copyPaymentValue = async (value: string | undefined, label: string) => {
    const text = String(value || "").trim();
    if (!text) {
      toast.info(`${label} is missing`);
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="px-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trips, Bill ID, or reference" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl text-sm" />
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
                      <span className="text-sm font-bold text-foreground ml-2 shrink-0">{trip.amountLabel}</span>
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
                    {trip.paymentBillId && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Bill ID</span>
                        <button
                          type="button"
                          onClick={() => void copyPaymentValue(trip.paymentBillId, "Bill ID")}
                          className="flex items-center gap-1 text-foreground hover:text-primary"
                        >
                          <span className="font-mono text-[11px] font-semibold">{trip.paymentBillId}</span>
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {trip.paymentReference && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">Full ref</span>
                        <button
                          type="button"
                          onClick={() => void copyPaymentValue(trip.paymentReference, "Full reference")}
                          className="flex min-w-0 items-center justify-end gap-1 text-foreground hover:text-primary"
                        >
                          <span className="font-mono text-[11px] text-right break-all">{trip.paymentReference}</span>
                          <Copy className="w-3 h-3 shrink-0" />
                        </button>
                      </div>
                    )}
                    {trip.paymentVerifiedBy && <div className="flex justify-between"><span className="text-muted-foreground">Verified by</span><span className="text-foreground">{trip.paymentVerifiedBy}</span></div>}
                    {trip.status === "completed" && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex gap-2">
                          <ReceiptDownloadButton rideRequestId={trip.realId} className={trip.canRequestRefund ? "flex-1" : "w-full"} />
                          {trip.canRequestRefund && (
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs rounded-xl" onClick={() => setRefundFor(trip)}>
                              Request refund
                            </Button>
                          )}
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
