/**
 * CancelRideModal — Comprehensive ride cancellation with reasons, fees, and role-based flows
 * Supports customer cancel (with fee), driver cancel (no fee), no-show, passenger mismatch
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, AlertTriangle, Clock, Users, MapPin, Car,
  DollarSign, ChevronRight, Shield, Ban, UserX,
  Timer, CircleDollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CancelRole = "customer" | "driver";

interface CancelReason {
  id: string;
  labelKey: string;
  label: string;
  icon: React.ElementType;
  fee: boolean;
  description?: string;
}

interface CancelRideModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string, fee: number) => void;
  role?: CancelRole;
  tripPrice: number;
  driverWaitMinutes?: number;
  bookedPassengers?: number;
  tripPhase: "searching" | "driver-assigned" | "driver-en-route" | "trip-in-progress";
  t?: (key: string) => string;
}

const CUSTOMER_REASONS: CancelReason[] = [
  { id: "changed_mind", labelKey: "ride.changed_mind", label: "Changed my mind", icon: Ban, fee: true },
  { id: "wrong_pickup", labelKey: "ride.wrong_pickup", label: "Wrong pickup location", icon: MapPin, fee: false },
  { id: "driver_too_far", labelKey: "ride.driver_too_far", label: "Driver is too far away", icon: Clock, fee: false },
  { id: "found_other_ride", labelKey: "ride.found_other_ride", label: "Found another ride", icon: Car, fee: true },
  { id: "plans_changed", labelKey: "ride.plans_changed", label: "Plans changed", icon: AlertTriangle, fee: true },
  { id: "safety_concern", labelKey: "ride.safety_concern", label: "Safety concern", icon: Shield, fee: false },
  { id: "price_too_high", labelKey: "ride.price_too_high", label: "Price is too high", icon: CircleDollarSign, fee: true },
  { id: "long_wait", labelKey: "ride.wait_too_long", label: "Wait time too long", icon: Timer, fee: false },
];

const DRIVER_REASONS: CancelReason[] = [
  { id: "no_show", labelKey: "no_show", label: "Customer no-show (5+ min wait)", icon: UserX, fee: true, description: "You'll receive a cancellation fee" },
  { id: "passenger_mismatch", labelKey: "passenger_mismatch", label: "More passengers than booked", icon: Users, fee: true, description: "Customer booked fewer seats than needed" },
  { id: "unsafe_pickup", labelKey: "unsafe_pickup", label: "Unsafe pickup location", icon: Shield, fee: false },
  { id: "wrong_address", labelKey: "wrong_address", label: "Customer gave wrong address", icon: MapPin, fee: false },
  { id: "vehicle_issue", labelKey: "vehicle_issue", label: "Vehicle issue / breakdown", icon: Car, fee: false },
  { id: "emergency", labelKey: "emergency", label: "Personal emergency", icon: AlertTriangle, fee: false },
  { id: "excessive_luggage", labelKey: "excessive_luggage", label: "Excessive luggage / items", icon: AlertTriangle, fee: true, description: "Items exceed vehicle capacity" },
  { id: "intoxicated_rider", labelKey: "intoxicated_rider", label: "Rider appears intoxicated", icon: Shield, fee: true, description: "Safety-related cancellation" },
];

function calculateCancelFee(
  role: CancelRole,
  reason: CancelReason,
  tripPrice: number,
  tripPhase: string,
  driverWaitMinutes: number
): number {
  if (!reason.fee) return 0;

  if (role === "customer") {
    if (tripPhase === "searching") return 0;
    if (tripPhase === "driver-assigned") return Math.min(3, tripPrice * 0.15);
    if (tripPhase === "driver-en-route") return Math.min(7, tripPrice * 0.25);
    if (tripPhase === "trip-in-progress") return Math.min(15, tripPrice * 0.5);
    return 0;
  }

  if (role === "driver") {
    if (reason.id === "no_show" && driverWaitMinutes >= 5) return Math.min(8, tripPrice * 0.3);
    if (reason.id === "passenger_mismatch") return Math.min(5, tripPrice * 0.2);
    if (reason.id === "intoxicated_rider" || reason.id === "excessive_luggage") return Math.min(5, tripPrice * 0.2);
    return 0;
  }

  return 0;
}

export default function CancelRideModal({
  open,
  onClose,
  onConfirmCancel,
  role = "customer",
  tripPrice,
  driverWaitMinutes = 0,
  bookedPassengers = 1,
  tripPhase,
  t: tProp,
}: CancelRideModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [step, setStep] = useState<"reasons" | "confirm">("reasons");

  // Use provided translation function or fallback to returning key
  const t = tProp || ((key: string) => key);

  const reasons = role === "customer" ? CUSTOMER_REASONS : DRIVER_REASONS;

  const fee = selectedReason
    ? calculateCancelFee(role, selectedReason, tripPrice, tripPhase, driverWaitMinutes)
    : 0;

  const getReasonLabel = (reason: CancelReason) => {
    if (tProp) {
      const translated = tProp(reason.labelKey);
      // If translation returns the key itself, fallback to English label
      return translated === reason.labelKey ? reason.label : translated;
    }
    return reason.label;
  };

  const handleSelectReason = (reason: CancelReason) => {
    setSelectedReason(reason);
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirmCancel(selectedReason.id, fee);
    }
    setStep("reasons");
    setSelectedReason(null);
  };

  const handleBack = () => {
    setStep("reasons");
    setSelectedReason(null);
  };

  const handleClose = () => {
    setStep("reasons");
    setSelectedReason(null);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cancel-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-background rounded-t-[28px] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
          </div>

          {step === "reasons" ? (
            <div className="px-5 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {role === "customer" ? t("ride.cancel_ride") : "Cancel trip"}
                </h3>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {role === "customer" && tripPhase !== "searching" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("ride.cancellation_fee_warning")}
                  </p>
                </div>
              )}

              {role === "driver" && (
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 mb-4 flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Some cancellations qualify for a fee payment to you.
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-3">{t("ride.select_reason")}</p>

              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {reasons.map((reason) => (
                  <button type="button"
                    key={reason.id}
                    onClick={() => handleSelectReason(reason)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-foreground/20 hover:bg-muted/30 transition-all active:scale-[0.98] text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                      <reason.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground block">{getReasonLabel(reason)}</span>
                      {reason.description && (
                        <span className="text-[11px] text-muted-foreground">{reason.description}</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-5 pb-6">
              {/* Confirm step */}
              <div className="flex items-center justify-between mb-4">
                <button type="button" onClick={handleBack} className="text-sm font-semibold text-primary">
                  {t("ride.back")}
                </button>
                <button type="button" onClick={handleClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  {selectedReason && <selectedReason.icon className="w-6 h-6 text-destructive" />}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {role === "customer" ? t("ride.cancel_this_ride") : "Cancel this trip?"}
                </h3>
                <p className="text-sm text-muted-foreground">{selectedReason ? getReasonLabel(selectedReason) : ""}</p>
              </div>

              {/* Fee breakdown */}
              <div className="rounded-xl border border-border/30 p-4 mb-4 space-y-2">
                {fee > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t("ride.cancellation_fee")}</span>
                      <span className="text-sm font-bold text-destructive">${fee.toFixed(2)}</span>
                    </div>
                    {role === "customer" && (
                      <p className="text-[11px] text-muted-foreground">
                        {t("ride.fee_compensates_driver")}
                      </p>
                    )}
                    {role === "driver" && (
                      <p className="text-[11px] text-primary">
                        You will receive ${fee.toFixed(2)} for this cancellation.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t("ride.no_cancellation_fee")}</span>
                  </div>
                )}

                {/* Driver wait time info */}
                {role === "driver" && selectedReason?.id === "no_show" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Wait time: {driverWaitMinutes} min
                      {driverWaitMinutes < 5 && " — Fee applies after 5 min"}
                    </span>
                  </div>
                )}

                {/* Passenger mismatch info */}
                {role === "driver" && selectedReason?.id === "passenger_mismatch" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Booked: {bookedPassengers} passenger{bookedPassengers !== 1 ? "s" : ""} — More showed up
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full h-12 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleConfirm}
                >
                  {fee > 0 && role === "customer"
                    ? t("ride.cancel_and_pay_fee").replace("{fee}", `$${fee.toFixed(2)}`)
                    : fee > 0 && role === "driver"
                    ? `Cancel & receive $${fee.toFixed(2)}`
                    : t("ride.confirm_cancellation")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl text-sm font-bold"
                  onClick={handleClose}
                >
                  {t("ride.keep_my_ride")}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
