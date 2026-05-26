import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, UtensilsCrossed, Calendar, MapPin, Users, Share2,
  CheckCircle, Clock, Copy, Check, Shield, MessageCircle, DollarSign,
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

interface RestaurantBookingDetail {
  id: string;
  reservation_number: string;
  restaurant_name: string;
  restaurant_id: string;
  date: string;
  time: string;
  party_size: number;
  guests: number;
  special_requests: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  restaurant?: {
    name: string;
    address: string | null;
    city: string | null;
    cuisine: string | null;
    image_url: string | null;
  } | null;
}

export default function MyRestaurantTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<RestaurantBookingDetail | null>(null);
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
          .from("restaurant_reservations")
          .select(`
            id, reservation_number, restaurant_name, restaurant_id, date, time,
            party_size, guests, special_requests, total_amount, status,
            payment_status, created_at, restaurant:restaurants(
              name, address, city, cuisine, image_url
            )
          `)
          .eq("id", bookingId)
          .single();
        if (!error && data) setBooking(data as unknown as RestaurantBookingDetail);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const copyBookingRef = () => {
    if (!booking?.reservation_number) return;
    navigator.clipboard.writeText(booking.reservation_number);
    setCopied(true);
    toast.success("Reservation number copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    if (!booking?.restaurant) return;
    openShareToChat({
      kind: "restaurant",
      title: booking.restaurant.name,
      subtitle: `${format(parseISO(booking.date), "MMM d, h:mm a")} · ${booking.party_size} guests`,
      meta: formatPrice(booking.total_amount),
      deepLink: `/my-trips/restaurants/${bookingId}`,
      image: booking.restaurant.image_url,
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
        title={loading ? "Restaurant Reservation" : `${booking?.restaurant?.name} Reservation`}
        description="View your restaurant reservation details."
      />

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">Restaurant Reservation</h1>
          {booking && (
            <p className="text-[11px] text-muted-foreground truncate">
              {booking.restaurant?.name}
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
            {/* Reservation Reference */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-muted/20 border border-border/20 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Reservation Number</p>
                  <button type="button" onClick={copyBookingRef} className="flex items-center gap-1.5 mt-1 group">
                    <p className="text-[15px] font-mono font-bold text-foreground">
                      {booking.reservation_number}
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
                </div>
              </div>
            </motion.div>

            {/* Restaurant Card */}
            {booking.restaurant && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                {booking.restaurant.image_url && (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img src={booking.restaurant.image_url} alt={booking.restaurant.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {booking.restaurant.name}
                    </p>
                    {booking.restaurant.cuisine && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {booking.restaurant.cuisine}
                      </p>
                    )}
                  </div>
                  {booking.restaurant.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{booking.restaurant.address}</p>
                        {booking.restaurant.city && (
                          <p className="text-[10px] text-muted-foreground">{booking.restaurant.city}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Date & Time */}
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
                    {format(parseISO(booking.date), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{booking.time}</p>
                </div>
              </div>
            </motion.div>

            {/* Party Size */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Party Size</p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {booking.party_size} guest{booking.party_size > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Special Requests */}
            {booking.special_requests && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border/40 bg-card p-4"
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Special Requests</p>
                <p className="text-sm text-foreground">{booking.special_requests}</p>
              </motion.div>
            )}

            {/* Price */}
            {booking.total_amount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl border border-border/40 bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total</p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {formatPrice(booking.total_amount)}
                    </p>
                  </div>
                  {booking.payment_status === "paid" && (
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  )}
                </div>
              </motion.div>
            )}

            {/* Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <ReviewsSummary
                serviceType="restaurant"
                serviceId={booking.restaurant_id}
                onWriteClick={() => setReviewSheetOpen(true)}
              />
              <ReviewsList serviceType="restaurant" serviceId={booking.restaurant_id} />
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
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
        serviceType="restaurant"
        serviceId={booking?.restaurant_id || bookingId}
        bookingReference={booking?.reservation_number}
        title={booking?.restaurant?.name || "Restaurant"}
      />

      <ZivoMobileNav />
    </div>
  );
}
