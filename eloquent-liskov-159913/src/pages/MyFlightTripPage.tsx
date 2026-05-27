import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Plane, Calendar, MapPin, Users, Luggage,
  Loader2, CheckCircle, Clock, AlertCircle, Share2, Download,
  Copy, Check, Shield, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { ReviewSubmissionSheet } from "@/components/reviews/ReviewSubmissionSheet";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { ReviewsSummary } from "@/components/reviews/ReviewsSummary";

const formatPrice = (amount: number) =>
  amount > 0 ? `$${amount.toFixed(0)}` : "—";

interface FlightBookingDetail {
  id: string;
  booking_reference: string;
  passengers: number;
  departure_city: string;
  departure_airport: string;
  arrival_city: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  aircraft_type: string;
  total_amount_cents: number;
  status: string;
  payment_status: string;
  ticketing_status: string;
  created_at: string;
  renter_id: string | null;
}

export default function MyFlightTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<FlightBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("flight_bookings")
          .select("*")
          .eq("id", bookingId)
          .single();
        if (!error && data) setBooking(data as unknown as FlightBookingDetail);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const copyBookingRef = () => {
    if (!booking?.booking_reference) return;
    navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    toast.success("Booking reference copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    if (!booking) return;
    openShareToChat({
      kind: "flight",
      title: `${booking.departure_airport} → ${booking.arrival_airport}`,
      subtitle: `${format(parseISO(booking.departure_time), "MMM d, h:mm a")} · ${booking.airline} ${booking.flight_number}`,
      meta: formatPrice(booking.total_amount_cents / 100),
      deepLink: `/my-trips/flights/${bookingId}`,
      image: null,
    });
  };

  const statusBadgeColor = {
    confirmed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    pending: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    cancelled: "bg-red-500/10 border-red-500/30 text-red-700",
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEOHead
        title={loading ? "Flight Booking" : `${booking?.departure_airport} to ${booking?.arrival_airport}`}
        description="View your flight booking details and reservation information."
      />

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">Flight Details</h1>
          {booking && (
            <p className="text-[11px] text-muted-foreground truncate">
              {booking.departure_airport} → {booking.arrival_airport}
            </p>
          )}
        </div>
        <Shield className="w-4 h-4 text-emerald-600" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        ) : booking ? (
          <>
            {/* Booking Reference */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-muted/20 border border-border/20 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking Reference</p>
                  <button type="button" onClick={copyBookingRef} className="flex items-center gap-1.5 mt-1 group">
                    <p className="text-[15px] font-mono font-bold text-foreground">
                      {booking.booking_reference}
                    </p>
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={cn("px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase", statusBadgeColor[booking.status as keyof typeof statusBadgeColor] || statusBadgeColor.pending)}>
                    {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                  </div>
                  {booking.ticketing_status && (
                    <p className="text-[10px] font-semibold text-muted-foreground">
                      {booking.ticketing_status === "ticketed" && "✓ Ticketed"}
                      {booking.ticketing_status === "pending" && "Ticketing..."}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Flight Info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl border border-border/40 bg-card p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Departure</p>
                  <p className="text-base font-bold text-foreground mt-1">{booking.departure_airport}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{booking.departure_city}</p>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    {format(parseISO(booking.departure_time), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="text-center">
                  <Plane className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground font-semibold">{booking.airline}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Arrival</p>
                  <p className="text-base font-bold text-foreground mt-1">{booking.arrival_airport}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{booking.arrival_city}</p>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    {format(parseISO(booking.arrival_time), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/30 space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Flight</span>
                  <span className="font-semibold text-foreground">{booking.flight_number}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Aircraft</span>
                  <span className="font-semibold text-foreground">{booking.aircraft_type}</span>
                </div>
              </div>
            </motion.div>

            {/* Passengers */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Passengers</p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {booking.passengers} passenger{booking.passengers > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Price</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatPrice(booking.total_amount_cents / 100)}
                  </p>
                </div>
                {booking.payment_status === "paid" && (
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                )}
              </div>
            </motion.div>

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <ReviewsSummary
                serviceType="flight"
                serviceId={booking.id}
                onWriteClick={() => setReviewSheetOpen(true)}
              />
              <ReviewsList serviceType="flight" serviceId={booking.id} />
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2.5 pt-2"
            >
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex-1 rounded-2xl h-11"
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/my-trips")}
                className="flex-1 rounded-2xl h-11"
              >
                Back to Trips
              </Button>
            </motion.div>
          </>
        ) : null}
      </div>

      <ReviewSubmissionSheet
        isOpen={reviewSheetOpen}
        onClose={() => setReviewSheetOpen(false)}
        serviceType="flight"
        serviceId={booking?.id || bookingId}
        bookingReference={booking?.booking_reference}
        title={`${booking?.departure_airport} to ${booking?.arrival_airport}`}
      />

      <ZivoMobileNav />
    </div>
  );
}
