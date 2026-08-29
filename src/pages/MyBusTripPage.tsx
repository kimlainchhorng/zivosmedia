/**
 * MyBusTripPage — detail view for a single bus booking.
 *
 * My Trips gained bus cards but had nowhere to send them, so they rendered
 * without a link. This is that destination.
 *
 * Follows MyCarTripPage's structure so the trip detail screens match, with two
 * deliberate differences:
 *  - the fare is formatted from its Stripe minor-unit integer with the
 *    booking's own currency (bus fares are quoted in Riel, and KHR is
 *    zero-decimal, so a blanket /100 would show a hundredth of the fare);
 *  - a missing or non-matching booking renders a real "not found" state
 *    rather than a blank screen.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, BusFront, Calendar, Clock, MapPin, Users, Copy, Check,
  Share2, Shield, CheckCircle, AlertCircle, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { formatStripeAmount } from "@/lib/currency";
import TravelPageFrame from "@/components/travel/TravelPageFrame";

interface BusTripDetail {
  id: string;
  trip_id: string;
  status: string;
  payment_status: string;
  amount_cents: number;
  currency: string;
  booking_ref: string | null;
  passenger_count: number;
  seats: unknown;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  trip?: {
    depart_date: string;
    depart_time: string;
    arrive_time: string | null;
    bus_type: string;
  } | null;
  route?: { origin: string; destination: string; duration_mins: number | null } | null;
}

const statusBadgeColor: Record<string, string> = {
  confirmed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
  paid: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
  pending: "bg-amber-500/10 border-amber-500/30 text-amber-700",
  cancelled: "bg-red-500/10 border-red-500/30 text-red-700",
};

/** `seats` is stored as JSON; accept an array or a comma string. */
function seatLabels(seats: unknown): string[] {
  if (Array.isArray(seats)) return seats.map((s) => String(s)).filter(Boolean);
  if (typeof seats === "string" && seats.trim()) return seats.split(",").map((s) => s.trim());
  return [];
}

export default function MyBusTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BusTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingId || !user?.id) {
      if (!user?.id) return;
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Scoped to the signed-in customer as well as the id, so a guessed
        // booking id cannot surface someone else's ticket even if RLS changes.
        const { data: row } = await supabase
          .from("bus_bookings")
          .select("id, trip_id, status, payment_status, amount_cents, currency, booking_ref, passenger_count, seats, contact_name, contact_phone, created_at")
          .eq("id", bookingId)
          .eq("customer_id", user.id)
          .maybeSingle();

        if (cancelled || !row) {
          if (!cancelled) setBooking(null);
          return;
        }

        const { data: trip } = await supabase
          .from("bus_trips")
          .select("id, depart_date, depart_time, arrive_time, bus_type, route_id")
          .eq("id", (row as { trip_id: string }).trip_id)
          .maybeSingle();

        const { data: route } = trip
          ? await supabase
              .from("bus_routes")
              .select("id, origin, destination, duration_mins")
              .eq("id", (trip as { route_id: string }).route_id)
              .maybeSingle()
          : { data: null };

        if (!cancelled) {
          setBooking({ ...(row as unknown as BusTripDetail), trip: trip as never, route: route as never });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId, user?.id]);

  const reference = booking?.booking_ref || bookingId.slice(0, 8).toUpperCase();

  const copyReference = () => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    toast.success("Booking reference copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const journey = booking?.route
    ? `${booking.route.origin} → ${booking.route.destination}`
    : "Bus journey";

  const fare = booking
    ? formatStripeAmount(Number(booking.amount_cents) || 0, booking.currency || "USD")
    : "—";

  const handleShare = () => {
    if (!booking) return;
    openShareToChat({
      kind: "bus",
      title: journey,
      subtitle: booking.trip?.depart_date
        ? format(parseISO(booking.trip.depart_date), "EEE, MMM d")
        : "Bus ticket",
      meta: fare,
      deepLink: `/my-trips/bus/${bookingId}`,
      image: null,
    });
  };

  const seats = seatLabels(booking?.seats);

  return (
    <TravelPageFrame>
      <div className="min-h-screen bg-background pb-32">
        <SEOHead
          title={booking ? `${journey} – Bus Ticket` : "Bus Ticket"}
          description="View your ZIVO bus booking details, seats and fare."
        />

        <div
          className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3"
          style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Bus Ticket</h1>
            {booking && <p className="text-[11px] text-muted-foreground truncate">{journey}</p>}
          </div>
          <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        </div>

        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </>
          ) : booking ? (
            <>
              {/* Reference + status */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-muted/20 border border-border/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Booking reference
                    </p>
                    <button
                      type="button"
                      onClick={copyReference}
                      aria-label="Copy booking reference"
                      className="flex items-center gap-1.5 mt-1 group transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-[15px] font-mono font-bold text-foreground">{reference}</span>
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase",
                        statusBadgeColor[booking.status] || statusBadgeColor.pending,
                      )}
                    >
                      {booking.status || "pending"}
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      {booking.payment_status === "paid" ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Paid
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" /> Payment {booking.payment_status || "pending"}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Journey */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl bg-card border border-border/30 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <BusFront className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-bold">{journey}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Departs</p>
                      <p className="font-semibold">
                        {booking.trip?.depart_date
                          ? format(parseISO(booking.trip.depart_date), "EEE, MMM d")
                          : "—"}
                      </p>
                      {booking.trip?.depart_time && (
                        <p className="text-xs text-muted-foreground">{booking.trip.depart_time.slice(0, 5)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Passengers</p>
                      <p className="font-semibold">{booking.passenger_count || 1}</p>
                      {booking.trip?.bus_type && (
                        <p className="text-xs text-muted-foreground">{booking.trip.bus_type}</p>
                      )}
                    </div>
                  </div>
                </div>

                {seats.length > 0 && (
                  <div className="flex items-start gap-2 pt-1">
                    <Ticket className="w-4 h-4 text-muted-foreground mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seats</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {seats.map((s) => (
                          <span key={s} className="rounded-lg bg-muted px-2 py-0.5 text-xs font-bold">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {booking.route?.duration_mins ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    About {Math.round(booking.route.duration_mins / 60)}h journey
                  </p>
                ) : null}
              </motion.div>

              {/* Fare */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-card border border-border/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total fare</span>
                  <span className="text-2xl font-bold tabular-nums">{fare}</span>
                </div>
                {booking.contact_name && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Booked for {booking.contact_name}
                    {booking.contact_phone ? ` · ${booking.contact_phone}` : ""}
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex gap-2.5 pt-2"
              >
                <Button variant="outline" onClick={handleShare} className="flex-1 rounded-2xl h-11">
                  <Share2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Share
                </Button>
                <Button variant="outline" onClick={() => navigate("/my-trips")} className="flex-1 rounded-2xl h-11">
                  Back to Trips
                </Button>
              </motion.div>
            </>
          ) : (
            /* Sibling detail pages render nothing when the booking is missing,
               which reads as a broken screen. Say what happened instead. */
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 font-semibold">Ticket not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This bus booking either does not exist or belongs to another account.
              </p>
              <Button onClick={() => navigate("/my-trips")} className="mt-5 rounded-2xl">
                Back to My Trips
              </Button>
            </div>
          )}
        </div>

        <ZivoMobileNav />
      </div>
    </TravelPageFrame>
  );
}
