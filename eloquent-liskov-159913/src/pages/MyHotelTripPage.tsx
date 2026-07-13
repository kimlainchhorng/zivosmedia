import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Hotel, Calendar, MapPin, Users, Share2,
  CheckCircle, Clock, AlertCircle, Copy, Check, Shield,
  MessageCircle, Star, DollarSign,
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

interface HotelBookingDetail {
  id: string;
  number: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  total_cents: number;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  room?: {
    name: string;
    photos: string[] | null;
  } | null;
  store?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
  } | null;
}

export default function MyHotelTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<HotelBookingDetail | null>(null);
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
          .from("hotel_reservations")
          .select(`
            id, number, guest_name, check_in, check_out, nights, adults, children,
            total_cents, payment_status, status, notes, created_at,
            room:hotel_rooms(name, photos),
            store:hotel_stores(id, name, address, city)
          `)
          .eq("id", bookingId)
          .single();
        if (!error && data) setBooking(data as unknown as HotelBookingDetail);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const copyBookingRef = () => {
    if (!booking?.number) return;
    navigator.clipboard.writeText(booking.number);
    setCopied(true);
    toast.success("Booking reference copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    if (!booking?.store) return;
    openShareToChat({
      kind: "hotel",
      title: booking.store.name,
      subtitle: `${format(parseISO(booking.check_in), "MMM d")} – ${format(parseISO(booking.check_out), "MMM d")}`,
      meta: formatPrice(booking.total_cents / 100),
      deepLink: `/my-trips/hotels/${bookingId}`,
      image: booking.room?.photos?.[0] ?? null,
    });
  };

  const statusBadgeColor = {
    confirmed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    pending: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    cancelled: "bg-red-500/10 border-red-500/30 text-red-700",
  };

  const image = booking?.room?.photos?.[0];

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEOHead
        title={loading ? "Hotel Booking" : `${booking?.store?.name} Reservation`}
        description="View your hotel booking details and reservation information."
      />

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">Hotel Booking</h1>
          {booking && (
            <p className="text-[11px] text-muted-foreground truncate">
              {booking.store?.name}
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
                      {booking.number}
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
                  {booking.payment_status && (
                    <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                      {booking.payment_status === "paid" && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                      {booking.payment_status === "pending" && <Clock className="w-3 h-3 text-amber-600" />}
                      {booking.payment_status === "paid" ? "Paid" : "Pending Payment"}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Hotel Info Card */}
            {booking.store && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                {image && (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img src={image} alt={booking.room?.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {booking.store.name}
                    </p>
                    {booking.room && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {booking.room.name}
                      </p>
                    )}
                  </div>
                  {booking.store.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{booking.store.address}</p>
                        {booking.store.city && (
                          <p className="text-[10px] text-muted-foreground">{booking.store.city}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Dates & Guests */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {format(parseISO(booking.check_in), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Check-in</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {format(parseISO(booking.check_out), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Check-out</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <p className="text-[12px] font-semibold text-foreground">
                  {booking.nights} night{booking.nights > 1 ? "s" : ""}
                </p>
              </div>
            </motion.div>

            {/* Guests */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Guests</p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {booking.adults} adult{booking.adults > 1 ? "s" : ""}
                    {booking.children > 0 && `, ${booking.children} child${booking.children > 1 ? "ren" : ""}`}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Price</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatPrice(booking.total_cents / 100)}
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
              transition={{ delay: 0.25 }}
              className="space-y-3"
            >
              <ReviewsSummary
                serviceType="hotel"
                serviceId={booking.store?.id || bookingId}
                onWriteClick={() => setReviewSheetOpen(true)}
              />
              <ReviewsList serviceType="hotel" serviceId={booking.store?.id || bookingId} />
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
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
        serviceType="hotel"
        serviceId={booking?.store?.id || bookingId}
        bookingReference={booking?.number}
        title={booking?.store?.name || "Hotel"}
      />

      <ZivoMobileNav />
    </div>
  );
}
