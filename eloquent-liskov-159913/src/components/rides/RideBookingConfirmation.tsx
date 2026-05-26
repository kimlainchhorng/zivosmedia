/**
 * RideBookingConfirmation — Premium confirmation with enhanced animations,
 * error handling, loading states, and haptic feedback
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, MapPin, Car, Star, Clock, Share2, Calendar, Navigation, Sparkles, AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface ConfirmationProps {
  pickup?: string;
  dropoff?: string;
  vehicleType?: string;
  price?: string;
  eta?: string;
  onTrackRide?: () => void;
  onAddToCalendar?: () => void;
  onCancel?: () => void;
  /** Simulate a matching failure for testing */
  simulateError?: boolean;
}

type BookingStep = "confirming" | "success" | "assigning" | "assigned" | "error";

export default function RideBookingConfirmation({
  pickup = "",
  dropoff = "",
  vehicleType = "Standard",
  price = "",
  eta = "",
  onTrackRide,
  onAddToCalendar,
  onCancel,
  simulateError = false,
}: ConfirmationProps) {
  const [step, setStep] = useState<BookingStep>("confirming");
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [searchDots, setSearchDots] = useState(0);

  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      try { await Haptics.impact({ style }); } catch {}
    }
  }, []);

  // Progress through steps
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { setStep("success"); triggerHaptic(ImpactStyle.Light); }, 1200));
    timers.push(setTimeout(() => setStep("assigning"), 2800));
    timers.push(setTimeout(() => {
      if (simulateError && matchAttempts === 0) {
        setStep("error");
      } else {
        setStep("assigned");
        triggerHaptic(ImpactStyle.Heavy);
      }
    }, 5500));
    return () => timers.forEach(clearTimeout);
  }, [matchAttempts, simulateError, triggerHaptic]);

  // Animated dots for searching
  useEffect(() => {
    if (step !== "assigning") return;
    const iv = setInterval(() => setSearchDots(d => (d + 1) % 4), 400);
    return () => clearInterval(iv);
  }, [step]);

  const handleRetry = () => {
    setMatchAttempts(a => a + 1);
    setStep("confirming");
  };

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {/* Confirming spinner */}
        {step === "confirming" && (
          <motion.div key="confirming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-8">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-14 h-14 rounded-full border-3 border-muted border-t-primary" />
            <p className="text-sm font-bold text-muted-foreground">Confirming your ride...</p>
          </motion.div>
        )}

        {/* Success checkmark */}
        {step === "success" && (
          <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex flex-col items-center gap-3 py-6">
            <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </motion.div>
            <h2 className="text-xl font-black text-foreground">Ride Confirmed!</h2>
            <p className="text-sm text-muted-foreground">Finding the best driver for you</p>
          </motion.div>
        )}

        {/* Searching for driver */}
        {step === "assigning" && (
          <motion.div key="assigning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-6">
            {/* Radar animation */}
            <div className="relative w-24 h-24">
              <motion.div animate={{ scale: [1, 2.5], opacity: [0.4, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 rounded-full border-2 border-primary/30" />
              <motion.div animate={{ scale: [1, 2], opacity: [0.3, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }} className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground text-center">
                Matching you with a driver{".".repeat(searchDots)}
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">Usually takes 15-30 seconds</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onCancel}>
              <X className="w-3 h-3 mr-1" /> Cancel Request
            </Button>
          </motion.div>
        )}

        {/* Error / no drivers */}
        {step === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-foreground">No drivers available</h3>
              <p className="text-xs text-muted-foreground mt-1">All nearby drivers are busy. Try again or adjust your pickup.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRetry} className="h-10 rounded-xl text-xs font-bold gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Driver assigned */}
        {step === "assigned" && (
          <motion.div key="assigned" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl bg-card border border-primary/20 p-4 shadow-lg shadow-primary/5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">D</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-foreground">Driver Assigned</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] font-bold">Matched</Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">Your driver is on the way</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Arriving in</p>
                <p className="text-lg font-black text-primary">{eta}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Vehicle details loading...</span>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip summary — always visible */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trip Details</h3>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Pickup</p>
              <p className="text-xs font-medium text-foreground">{pickup}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Dropoff</p>
              <p className="text-xs font-medium text-foreground">{dropoff}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">{vehicleType}</span>
          </div>
          <span className="text-base font-black text-foreground">{price}</span>
        </div>
      </div>

      {/* Actions */}
      {step === "assigned" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <Button onClick={onTrackRide} className="w-full h-12 text-sm font-bold gap-2 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-primary/20">
            <Navigation className="w-4 h-4" /> Track Your Ride
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs rounded-xl" onClick={() => { navigator.clipboard.writeText(`Ride to ${dropoff} • ETA ${eta}`); toast.success("Trip details copied!"); }}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share ETA
            </Button>
            <Button variant="outline" className="flex-1 h-10 text-xs rounded-xl" onClick={onAddToCalendar}>
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Add to Calendar
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
