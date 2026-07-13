import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CheckCircle, Car, CalendarRange, Users, MapPin, Copy,
  ChevronRight, Share2, Sparkles, DollarSign, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import SEOHead from "@/components/SEOHead";

const formatPrice = (amount: number) =>
  amount > 0 ? `$${amount.toFixed(0)}` : "—";

interface BookingSummary {
  id: string;
  vehicle_id: string;
  renter_id: string | null;
  owner_id: string | null;
  pickup_date: string;
  return_date: string;
  pickup_location: string | null;
  total_days: number;
  daily_rate: number;
  subtotal: number;
  service_fee: number;
  insurance_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  vehicle?: { year: number; make: string; model: string; images: string[] | null } | null;
}

export default function CarRentalConfirmedPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bookingId = params.get("booking_id") || "";

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("p2p_bookings")
          .select(`
            id, vehicle_id, renter_id, owner_id, pickup_date, return_date,
            pickup_location, total_days, daily_rate, subtotal, service_fee,
            insurance_fee, total_amount, status, payment_status, notes, created_at,
            vehicle:p2p_vehicles(year, make, model, images)
          `)
          .eq("id", bookingId)
          .single();
        if (!error && data) setBooking(data as unknown as BookingSummary);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const copyRef = () => {
    const ref = bookingId.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(ref);
    toast.success("Reference copied");
  };

  const handleShare = () => {
    if (!booking) return;
    const vehicle = booking.vehicle;
    openShareToChat({
      kind: "car",
      title: `${vehicle?.year} ${vehicle?.make} ${vehicle?.model}` || "Car Rental",
      subtitle: `${format(parseISO(booking.pickup_date), "MMM d")} – ${format(parseISO(booking.return_date), "MMM d")} · ${booking.total_days}d`,
      meta: formatPrice(booking.total_amount),
      deepLink: `/cars/${id}`,
      image: vehicle?.images?.[0] ?? null,
    });
  };

  const isCash = booking?.payment_status === "pending";
  const days = booking?.total_days ?? 1;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-28 safe-area-top">
      <SEOHead
        title={loading ? "Car Booking – ZIVO" : `Car Rental Confirmed – ZIVO`}
        description="Your car rental booking has been confirmed. View your reservation details and pickup information."
      />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-blue-500/10 blur-[80px]" />
      </div>

      <div className="relative max-w-md mx-auto px-5 pt-12 flex flex-col items-center">

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.1 }}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/25 to-blue-400/10 flex items-center justify-center mb-5 ring-4 ring-blue-500/10 shadow-2xl shadow-blue-500/20"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-12 w-12 text-blue-500" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-extrabold mb-1 tracking-tight"
        >
          Booking Confirmed!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[13px] text-muted-foreground text-center max-w-xs mb-6"
        >
          {isCash
            ? "Your car is reserved. Complete payment at pickup."
            : "Your payment was received. Your car is ready to go!"}
        </motion.p>

        {/* Booking reference */}
        {loading ? (
          <Skeleton className="h-16 w-full rounded-2xl mb-5" />
        ) : booking ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl bg-muted/20 border border-border/20 px-5 py-4 mb-5 w-full"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Booking</p>
                <button type="button" onClick={copyRef} className="flex items-center gap-1.5 mt-0.5 group">
                  <p className="text-[15px] font-mono font-bold text-foreground">
                    {bookingId.slice(0, 8).toUpperCase()}
                  </p>
                  <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </button>
                {booking.pickup_location && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{booking.pickup_location}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15">
                  <span className="text-[10px] font-bold text-blue-600">
                    {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                  </span>
                </div>
                <span className="text-[13px] font-bold text-foreground">{formatPrice(booking.total_amount)}</span>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Rental details */}
        {booking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-2xl bg-card border border-border/20 p-4 mb-5 space-y-3"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" /> Rental Summary
            </p>

            {booking.vehicle && (
              <div className="flex items-start gap-2.5">
                <Car className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
                  </p>
                  {booking.pickup_location && (
                    <p className="text-[10px] text-muted-foreground">{booking.pickup_location}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[12px] font-semibold text-foreground">
                  {format(parseISO(booking.pickup_date), "EEE, MMM d")} → {format(parseISO(booking.return_date), "EEE, MMM d")}
                </p>
                <p className="text-[10px] text-muted-foreground">{days} day{days > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <div className="text-[12px]">
                <p className="font-semibold text-foreground">${booking.daily_rate.toFixed(0)}/day × {days} day{days > 1 ? "s" : ""}</p>
                <p className="text-[10px] text-muted-foreground">+ fees</p>
              </div>
            </div>

            {isCash && (
              <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2">
                <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Pay {formatPrice(booking.total_amount)} at pickup
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Price breakdown */}
        {booking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="w-full rounded-2xl bg-card border border-border/20 p-4 mb-5 space-y-2"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Price Breakdown</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-muted-foreground">
                <span>Daily rate</span>
                <span>${booking.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service fee</span>
                <span>${booking.service_fee.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Insurance</span>
                <span>${booking.insurance_fee.toFixed(0)}</span>
              </div>
              <div className="h-px bg-border/30 my-1" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">${booking.total_amount.toFixed(0)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-2.5 w-full mb-5"
        >
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
            <Car className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-[11px] font-bold">{days}D</p>
            <p className="text-[8px] text-muted-foreground">Days</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-center">
            <CheckCircle className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <p className="text-[11px] font-bold">Ready</p>
            <p className="text-[8px] text-muted-foreground">Status</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <ShoppingBag className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[11px] font-bold">{formatPrice(booking?.total_amount ?? 0)}</p>
            <p className="text-[8px] text-muted-foreground">Total</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-2.5 w-full"
        >
          {bookingId && (
            <Button
              onClick={() => navigate(`/my-trips/cars/${bookingId}`)}
              className="w-full rounded-2xl h-12 font-bold gap-2"
            >
              <MapPin className="h-4 w-4" />
              View My Booking
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate("/cars")}
              className="flex-1 rounded-2xl h-11"
            >
              <Car className="h-4 w-4 mr-1.5" />
              Browse Cars
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="rounded-2xl h-11 px-4"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

      </div>

      <ZivoMobileNav />
    </div>
  );
}
