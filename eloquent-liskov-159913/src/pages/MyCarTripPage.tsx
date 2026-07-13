import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  ArrowLeft, Car, Calendar, MapPin, DollarSign, Phone, Mail,
  Edit, Download, Share2, Loader2, AlertCircle, CheckCircle,
  Clock, Shield, Fuel, Users, Copy, Check, MessageCircle,
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

interface CarBookingDetail {
  id: string;
  vehicle_id: string;
  renter_id: string | null;
  pickup_date: string;
  return_date: string;
  total_days: number;
  daily_rate: number;
  subtotal: number;
  service_fee: number;
  insurance_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  pickup_location: string | null;
  notes: string | null;
  renter_license_verified: boolean;
  created_at: string;
  vehicle?: {
    year: number;
    make: string;
    model: string;
    location_city: string;
    location_address: string;
    transmission: string;
    seats: number;
    images: string[] | null;
  } | null;
}

export default function MyCarTripPage() {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<CarBookingDetail | null>(null);
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
          .from("p2p_bookings")
          .select(`
            id, vehicle_id, renter_id, pickup_date, return_date, total_days,
            daily_rate, subtotal, service_fee, insurance_fee, total_amount,
            status, payment_status, pickup_location, notes, renter_license_verified,
            created_at, vehicle:p2p_vehicles(year, make, model, location_city,
            location_address, transmission, seats, images)
          `)
          .eq("id", bookingId)
          .single();
        if (!error && data) setBooking(data as unknown as CarBookingDetail);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const copyBookingId = () => {
    navigator.clipboard.writeText(bookingId.slice(0, 8).toUpperCase());
    setCopied(true);
    toast.success("Booking ID copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = () => {
    if (!booking?.vehicle) return;
    openShareToChat({
      kind: "car",
      title: `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`,
      subtitle: `${format(parseISO(booking.pickup_date), "MMM d")} – ${format(parseISO(booking.return_date), "MMM d")}`,
      meta: formatPrice(booking.total_amount),
      deepLink: `/my-trips/cars/${bookingId}`,
      image: booking.vehicle.images?.[0] ?? null,
    });
  };

  const statusBadgeColor = {
    confirmed: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
    pending: "bg-amber-500/10 border-amber-500/30 text-amber-700",
    cancelled: "bg-red-500/10 border-red-500/30 text-red-700",
  };

  const paymentStatusInfo = {
    pending: { label: "Payment Pending", icon: Clock, color: "text-amber-600" },
    paid: { label: "Paid", icon: CheckCircle, color: "text-emerald-600" },
    failed: { label: "Payment Failed", icon: AlertCircle, color: "text-red-600" },
  };

  const image = booking?.vehicle?.images?.[0];

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEOHead
        title={loading ? "Car Rental" : `${booking?.vehicle?.year} ${booking?.vehicle?.make} Rental`}
        description={`View your car rental booking details and information.`}
      />

      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">Car Rental Details</h1>
          {booking && (
            <p className="text-[11px] text-muted-foreground truncate">
              {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
            </p>
          )}
        </div>
        <Shield className="w-4 h-4 text-emerald-600" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-48 rounded-2xl" />
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
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking ID</p>
                  <button type="button" onClick={copyBookingId} className="flex items-center gap-1.5 mt-1 group">
                    <p className="text-[15px] font-mono font-bold text-foreground">
                      {bookingId.slice(0, 8).toUpperCase()}
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

            {/* Vehicle Card */}
            {booking.vehicle && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                {image && (
                  <div className="h-40 w-full bg-muted overflow-hidden">
                    <img src={image} alt={booking.vehicle.model} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {booking.vehicle.seats || 5} seats · {booking.vehicle.transmission}
                    </p>
                  </div>
                  {booking.vehicle.location_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">{booking.vehicle.location_address}</p>
                        <p className="text-[10px] text-muted-foreground">{booking.vehicle.location_city}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Dates & Duration */}
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
                    {format(parseISO(booking.pickup_date), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Pickup</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {format(parseISO(booking.return_date), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Return</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <p className="text-[12px] font-semibold text-foreground">
                  {booking.total_days} day{booking.total_days > 1 ? "s" : ""}
                </p>
              </div>
            </motion.div>

            {/* Pricing Details */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/40 bg-card p-4 space-y-2"
            >
              <p className="text-sm font-bold text-foreground mb-3">Pricing Breakdown</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>${booking.daily_rate.toFixed(0)}/day × {booking.total_days} days</span>
                  <span>${booking.subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Service fee (10%)</span>
                  <span>${booking.service_fee.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Insurance</span>
                  <span>${booking.insurance_fee.toFixed(0)}</span>
                </div>
                <div className="h-px bg-border/30 my-1.5" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">${booking.total_amount.toFixed(0)}</span>
                </div>
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
                serviceType="car_rental"
                serviceId={bookingId}
                onWriteClick={() => setReviewSheetOpen(true)}
              />
              <ReviewsList serviceType="car_rental" serviceId={bookingId} />
            </motion.div>

            {/* Special Requests */}
            {booking.notes && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border/40 bg-card p-4"
              >
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Special Requests</p>
                <p className="text-sm text-foreground">{booking.notes}</p>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
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
        serviceType="car_rental"
        serviceId={bookingId}
        bookingReference={booking?.id}
        title={`${booking?.vehicle?.year} ${booking?.vehicle?.make} ${booking?.vehicle?.model}`}
      />

      <ZivoMobileNav />
    </div>
  );
}
