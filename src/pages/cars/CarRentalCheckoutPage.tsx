import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Car,
  Banknote,
  MapPin,
  Loader2,
  CheckCircle,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import TravelPageFrame from "@/components/travel/TravelPageFrame";
import { TravelFlowHeader } from "@/components/zivo-travel";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { resolveRentalDateWindow } from "@/lib/cars/rentalDateWindow";
import { useGoBack } from "@/hooks/useGoBack";

const formatPrice = (amount: number) =>
  amount > 0 ? `$${amount.toFixed(0)}` : "—";

export default function CarRentalCheckoutPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const [params] = useSearchParams();
  const isTravelHost = typeof window !== "undefined" && isZivoTravelHost();

  const dateWindow = resolveRentalDateWindow(
    params.get("pickup"),
    params.get("return"),
  );
  const pickupDate = dateWindow.ok ? dateWindow.pickup : null;
  const returnDate = dateWindow.ok ? dateWindow.return : null;
  const totalDays = dateWindow.ok ? dateWindow.totalDays : 0;
  const dateWindowMessage =
    dateWindow.ok === false
      ? {
          missing:
            "Choose both a pickup date and a return date before booking this car.",
          unparseable:
            "These rental dates are not valid. Choose the dates again from the car page.",
          reversed:
            "The return date must be after the pickup date. Choose a valid rental window.",
          past: "The pickup date has already passed. Choose new dates before booking this car.",
        }[dateWindow.reason]
      : "";

  const vehicleQ = useQuery({
    queryKey: ["car-checkout-vehicle", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("p2p_vehicles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const vehicle = vehicleQ.data;

  const dailyRate = vehicle?.daily_rate ?? 0;
  const subtotal = dailyRate * totalDays;
  const serviceFee = Math.round(subtotal * 0.1);
  const insuranceFee = 15 * totalDays;
  const totalAmount = subtotal + serviceFee + insuranceFee;

  const [licenseNumber, setLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLoading = vehicleQ.isLoading;
  const vehicleUnavailable = !isLoading && !vehicle;

  const handleConfirm = async () => {
    if (!vehicle) {
      toast.error("Car details unavailable. No booking was created.");
      return;
    }
    if (dateWindow.ok === false) {
      toast.error(
        "Choose a valid future rental date window. No booking was created.",
      );
      return;
    }
    const confirmedDateWindow = dateWindow;
    if (!licenseNumber.trim()) {
      toast.error("Please enter your driver license number");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: any = {
        vehicle_id: id,
        renter_id: user?.id ?? null,
        owner_id: vehicle?.owner_id ?? null,
        pickup_date: confirmedDateWindow.pickup.toISOString(),
        return_date: confirmedDateWindow.return.toISOString(),
        pickup_location: vehicle?.location_address,
        total_days: totalDays,
        daily_rate: dailyRate,
        subtotal: subtotal,
        service_fee: serviceFee,
        insurance_fee: insuranceFee,
        total_amount: totalAmount,
        owner_payout: subtotal,
        status: "pending",
        payment_status: "pending",
        renter_license_verified: false,
        insurance_accepted: true,
        terms_accepted: true,
        notes: notes.trim() || null,
      };

      const { data: res, error } = await (supabase as any)
        .from("p2p_bookings")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Booking request sent");
      navigate(`/cars/${id}/booking-confirmed?booking_id=${res.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const image = vehicle?.images?.[0];

  return (
    <TravelPageFrame>
      <SEOHead
        title={
          isTravelHost
            ? "Car Rental Checkout | Zivo Travel"
            : "Car Rental Checkout – ZIVO"
        }
        description="Complete your car rental booking. Review pricing, enter driver information, and choose your payment method."
      />
      <div className="min-h-screen bg-background pb-[calc(var(--zivo-safe-bottom,0px)+1.5rem)] sm:pb-8">
        {isTravelHost ? (
          <TravelFlowHeader
            title="Confirm Booking"
            subtitle={
              vehicle
                ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                : "Car rental"
            }
            onBack={() => navigate(-1)}
            backLabel="Back"
          />
        ) : (
          <div
            className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3"
            style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
          >
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate">Confirm Booking</h1>
              {vehicle && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
              )}
            </div>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : vehicle ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-card overflow-hidden flex gap-0"
            >
              <div className="w-28 shrink-0 relative">
                {image ? (
                  <img
                    src={image}
                    alt={vehicle.model}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full min-h-[96px] bg-muted flex items-center justify-center">
                    <Car className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {vehicle.seats || 5} seats · {vehicle.transmission}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{vehicle.location_city}</span>
                </div>
              </div>
            </motion.div>
          ) : null}

          {vehicleUnavailable && (
            <div
              role="alert"
              aria-labelledby="car-checkout-unavailable-title"
              className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4"
            >
              <h2
                id="car-checkout-unavailable-title"
                className="text-sm font-bold text-foreground"
              >
                Car details unavailable
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                We could not verify this car&apos;s current rate, availability,
                or owner. No price or booking is shown until the service
                responds.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void vehicleQ.refetch()}
                  className="rounded-xl"
                >
                  Retry details
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/cars")}
                  className="rounded-xl bg-background"
                >
                  Back to cars
                </Button>
              </div>
            </div>
          )}

          {vehicle && !dateWindow.ok && (
            <div
              role="alert"
              aria-labelledby="car-checkout-date-window-title"
              className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4"
            >
              <h2
                id="car-checkout-date-window-title"
                className="text-sm font-bold text-foreground"
              >
                Choose valid rental dates
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {dateWindowMessage} No price or booking form is shown until the
                rental window is valid.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/cars/${id}`)}
                  className="rounded-xl"
                >
                  Choose dates
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/cars")}
                  className="rounded-xl bg-background"
                >
                  Back to cars
                </Button>
              </div>
            </div>
          )}

          {vehicle && dateWindow.ok && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  {
                    label: "Pickup",
                    value: pickupDate ? format(pickupDate, "MMM d") : "—",
                  },
                  {
                    label: "Return",
                    value: returnDate ? format(returnDate, "MMM d") : "—",
                  },
                  { label: "Duration", value: `${totalDays}d` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-muted/30 border border-border/30 p-2.5 text-center"
                  >
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {item.label}
                    </p>
                    <p className="text-[11px] font-bold mt-0.5 text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <p className="text-sm font-bold text-foreground">
                  Rental Details
                </p>
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">
                      Driver License Number *
                    </Label>
                    <Input
                      placeholder="E.g., 1234567"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground mb-1 block">
                      Special Requests (optional)
                    </Label>
                    <Textarea
                      placeholder="Early pickup, specific location, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl text-sm resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-2"
              >
                <p className="text-sm font-bold text-foreground">
                  Price Breakdown
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      ${dailyRate.toFixed(0)} × {totalDays} day
                      {totalDays > 1 ? "s" : ""}
                    </span>
                    <span>${subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service fee (10%)</span>
                    <span>${serviceFee.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Insurance fee</span>
                    <span>${insuranceFee.toFixed(0)}</span>
                  </div>
                  <Separator className="my-1 bg-border/30" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-primary">
                      ${totalAmount.toFixed(0)}
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border/40 bg-card p-4 space-y-3"
              >
                <p className="text-sm font-bold text-foreground">
                  Payment Method
                </p>
                <div
                  role="note"
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Banknote className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Cash at pickup
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      Online payment is not available for this peer-to-peer car
                      yet. Nothing is charged now; payment remains pending until
                      pickup.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3"
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 mt-1 rounded border-border/40"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    I agree to the rental terms, insurance coverage, and
                    cancellation policy
                  </span>
                </label>

                <Button
                  size="lg"
                  className="w-full h-13 rounded-2xl font-bold gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
                  disabled={
                    submitting ||
                    !vehicle ||
                    isLoading ||
                    !dateWindow.ok ||
                    !termsAccepted
                  }
                  onClick={handleConfirm}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Send Booking Request
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Your booking is protected by ZIVO
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </TravelPageFrame>
  );
}
