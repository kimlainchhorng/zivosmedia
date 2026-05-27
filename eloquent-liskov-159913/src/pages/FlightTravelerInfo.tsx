/**
 * Passenger Details Page — /flights/traveler-info
 * Premium 3D spatial traveler form with depth, perspective, glassmorphism
 */

import { useState, useEffect, useMemo } from "react";
import { calculateFlightPricing } from "@/utils/flightPricing";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plane, ChevronRight, Shield, Users, Lock, User,
  CreditCard, CheckCircle2, Fingerprint, Luggage, PackageCheck, RefreshCw,
  Clock, AlertCircle, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { type DuffelOffer, useDuffelOffer } from "@/hooks/useDuffelFlights";
import { FLIGHT_CONSENT, FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";
import { cn } from "@/lib/utils";
import DuffelSeatPicker from "@/components/flight/DuffelSeatPicker";

import { FlightSummaryCompact } from "@/components/flight/traveler/FlightSummaryCompact";
import {
  PassengerFormCard,
  emptyPassenger,
  type PassengerForm,
} from "@/components/flight/traveler/PassengerFormCard";
import {
  SavedTravelerPicker,
  profileToPassenger,
} from "@/components/flight/traveler/SavedTravelerPicker";
import type { TravelerProfile } from "@/hooks/useTravelerProfiles";

/* ── 3D Step indicator ────────────────────────── */
function StepIndicator3D({ current = 2 }: { current?: number }) {
  const steps = [
    { label: "Search", icon: Plane },
    { label: "Review", icon: CheckCircle2 },
    { label: "Travelers", icon: Users },
    { label: "Checkout", icon: CreditCard },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-center gap-1 mb-6"
      style={{ perspective: "400px" }}
    >
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={s.label} className="flex items-center gap-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-semibold transition-all",
                isDone && "text-[hsl(var(--flights))]",
                isActive && "text-primary-foreground",
                !isDone && !isActive && "text-muted-foreground/50"
              )}
              style={{
                background: isActive
                  ? "hsl(var(--flights))"
                  : isDone
                    ? "hsl(var(--flights) / 0.08)"
                    : "hsl(var(--muted) / 0.3)",
                boxShadow: isActive
                  ? "0 6px 20px -4px hsl(var(--flights) / 0.4), 0 2px 6px -2px hsl(var(--flights) / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                  : isDone
                    ? "0 2px 8px -2px hsl(var(--flights) / 0.1), inset 0 1px 0 hsl(0 0% 100% / 0.05)"
                    : "inset 0 1px 2px hsl(var(--foreground) / 0.04)",
                transform: isActive ? "translateZ(4px)" : "none",
              }}
            >
              {/* Shine effect on active */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.15) 50%, transparent 60%)",
                    }}
                  />
                </div>
              )}
              <Icon className="w-3 h-3 relative z-10" />
              <span className="hidden sm:inline relative z-10">{s.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <ChevronRight className={cn(
                "w-3 h-3 shrink-0 transition-colors",
                isDone ? "text-[hsl(var(--flights))]/60" : "text-muted-foreground/20"
              )} />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────── */
const FlightTravelerInfo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const offerRaw = sessionStorage.getItem("zivo_selected_offer");
  const snapshotRaw = sessionStorage.getItem("zivo_selected_offer_snapshot");
  const searchRaw = sessionStorage.getItem("zivo_search_params");
  const storedOfferBase: DuffelOffer | null = offerRaw ? JSON.parse(offerRaw) : null;
  const snapshotOffer: DuffelOffer | null = snapshotRaw ? JSON.parse(snapshotRaw) : null;
  const storedOffer: DuffelOffer | null = storedOfferBase?.fareVariants || !snapshotOffer?.fareVariants
    ? storedOfferBase
    : storedOfferBase
      ? { ...storedOfferBase, fareVariants: snapshotOffer.fareVariants }
      : snapshotOffer;
  const search = searchRaw ? JSON.parse(searchRaw) : null;
  const { data: liveOffer } = useDuffelOffer(storedOffer?.id ?? null);
  const offer = liveOffer && storedOffer?.fareVariants && !liveOffer.fareVariants
    ? { ...liveOffer, fareVariants: storedOffer.fareVariants }
    : (liveOffer ?? storedOffer);

  const totalPassengers = search ? (search.adults || 1) + (search.children || 0) + (search.infants || 0) : 1;

  const isInternational = useMemo(() => {
    if (!search) return true;
    return search.origin !== search.destination;
  }, [search]);

  const [passengers, setPassengers] = useState<PassengerForm[]>(() => {
    const saved = sessionStorage.getItem("zivo_passengers");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => ({ ...emptyPassenger(), ...p }));
    }
    const list = Array.from({ length: totalPassengers }, () => emptyPassenger());
    if (user?.email) list[0].email = user.email;
    return list;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<Record<number, string>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (offer) {
      sessionStorage.setItem("zivo_selected_offer", JSON.stringify(offer));
      if (offer.fareVariants?.length) {
        sessionStorage.setItem("zivo_selected_offer_snapshot", JSON.stringify(offer));
      }
    }
  }, [offer]);

  useEffect(() => {
    if (!offer) navigate("/flights", { replace: true });
  }, [offer, navigate]);

  if (!offer || !search) return null;

  const getPassengerType = (idx: number): string => {
    if (idx < (search.adults || 1)) return "Adult";
    if (idx < (search.adults || 1) + (search.children || 0)) return "Child";
    return "Infant";
  };

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[`${index}.${field}`];
      return next;
    });
  };

  const handleSelectProfile = (index: number, profile: TravelerProfile) => {
    const mapped = profileToPassenger(profile);
    setPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...mapped };
      return copy;
    });
    setSelectedProfiles(prev => ({ ...prev, [index]: profile.id }));
    toast({
      title: "Profile applied",
      description: `${profile.first_name} ${profile.last_name}'s details filled.`,
    });
  };

  const fieldLabels: Record<string, string> = {
    given_name: "First name",
    family_name: "Last name",
    gender: "Gender",
    born_on: "Date of birth",
    email: "Email",
    consent: "Terms & conditions",
  };

  const validate = (): boolean => {
    const nameRegex = /^[a-zA-Z\s\-']{2,}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const newErrors: Record<string, string> = {};

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!nameRegex.test(p.given_name)) newErrors[`${i}.given_name`] = "Enter a valid first name";
      if (!nameRegex.test(p.family_name)) newErrors[`${i}.family_name`] = "Enter a valid last name";
      if (!p.gender) newErrors[`${i}.gender`] = "Select gender";
      if (!p.born_on) newErrors[`${i}.born_on`] = "Enter date of birth";
      if (i === 0 && !emailRegex.test(p.email)) newErrors[`${i}.email`] = "Enter a valid email";
    }

    if (!consentChecked) newErrors["consent"] = "Accept terms to continue";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Build a human-readable summary of missing fields */
  const getMissingFieldsSummary = (errs: Record<string, string>): string => {
    const missing: string[] = [];
    for (const key of Object.keys(errs)) {
      if (key === "consent") {
        missing.push("Terms & conditions");
        continue;
      }
      const parts = key.split(".");
      if (parts.length === 2) {
        const field = parts[1];
        const label = fieldLabels[field] || field;
        if (!missing.includes(label)) missing.push(label);
      }
    }
    if (missing.length === 0) return "Please check the form for errors.";
    if (missing.length === 1) return `Missing: ${missing[0]}`;
    if (missing.length <= 3) return `Missing: ${missing.join(", ")}`;
    return `Missing ${missing.length} required fields: ${missing.slice(0, 2).join(", ")} and ${missing.length - 2} more`;
  };

  const handleContinue = () => {
    if (!validate()) {
      const summary = getMissingFieldsSummary(errors.consent ? errors : (() => {
        // Re-run to get fresh errors for summary
        const nameRegex = /^[a-zA-Z\s\-']{2,}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const freshErrors: Record<string, string> = {};
        for (let i = 0; i < passengers.length; i++) {
          const p = passengers[i];
          if (!nameRegex.test(p.given_name)) freshErrors[`${i}.given_name`] = "x";
          if (!nameRegex.test(p.family_name)) freshErrors[`${i}.family_name`] = "x";
          if (!p.gender) freshErrors[`${i}.gender`] = "x";
          if (!p.born_on) freshErrors[`${i}.born_on`] = "x";
          if (i === 0 && !emailRegex.test(p.email)) freshErrors[`${i}.email`] = "x";
        }
        if (!consentChecked) freshErrors["consent"] = "x";
        return freshErrors;
      })());
      toast({ title: "Complete Your Details", description: summary, variant: "destructive" });
      return;
    }
    const withContact = passengers.map((p, i) => ({
      ...p,
      email: i === 0 ? p.email : passengers[0].email,
      phone_number: i === 0 ? p.phone_number : passengers[0].phone_number,
    }));
    sessionStorage.setItem("zivo_passengers", JSON.stringify(withContact));
    navigate("/flights/checkout");
  };

  const pageContent = (
    <div className={cn("mx-auto px-3 sm:px-4", isMobile ? "max-w-lg pb-36" : "max-w-2xl pb-36")}>
      {/* Sticky 3D header for mobile */}
      {isMobile && (
        <div className="sticky top-0 safe-area-top z-20 -mx-3 px-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-b-2xl"
            style={{
              background: "hsl(var(--card) / 0.85)",
              backdropFilter: "blur(24px) saturate(1.4)",
              boxShadow: "0 8px 32px -8px hsl(var(--flights) / 0.12), 0 2px 8px -2px hsl(var(--foreground) / 0.06), inset 0 -1px 0 hsl(var(--border) / 0.1)",
            }}
          >
            {/* Top glow line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg, transparent 10%, hsl(var(--flights)) 50%, transparent 90%)" }}
            />
            <div className="p-3 flex items-center gap-3">
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="shrink-0 w-9 h-9 rounded-xl"
                  style={{
                    background: "hsl(var(--muted) / 0.5)",
                    boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.04), 0 1px 3px hsl(var(--foreground) / 0.06)",
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">Traveler Details</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {offer.departure.code} → {offer.arrival.code} · {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Desktop header */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-5 pt-4"
        >
          <motion.div whileTap={{ scale: 0.92 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0 rounded-xl"
              style={{
                background: "hsl(var(--muted) / 0.4)",
                boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.04), 0 2px 6px hsl(var(--foreground) / 0.06)",
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Traveler Details</h1>
            <p className="text-sm text-muted-foreground">
              {offer.departure.code} → {offer.arrival.code} · {offer.airline}
            </p>
          </div>
        </motion.div>
      )}

      {/* 3D Step indicator */}
      <StepIndicator3D current={2} />

      {/* Flight summary */}
      <FlightSummaryCompact offer={offer} search={search} />

      {/* Passenger Forms with saved traveler pickers */}
      <div className="space-y-4">
        {passengers.map((p, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.15 + idx * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Saved traveler picker per passenger */}
            {user && (
              <SavedTravelerPicker
                passengerIndex={idx}
                onSelect={(profile) => handleSelectProfile(idx, profile)}
                selectedProfileId={selectedProfiles[idx]}
              />
            )}
            <PassengerFormCard
              passenger={p}
              index={idx}
              type={getPassengerType(idx)}
              errors={errors}
              isInternational={isInternational}
              onUpdate={(field, value) => updatePassenger(idx, field, value)}
            />
          </motion.div>
        ))}
      </div>

      {/* Seat Selection */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-5"
      >
        <DuffelSeatPicker
          offerId={offer?.id ?? null}
          passengerIds={Array.from({ length: totalPassengers }, (_, i) => `passenger_${i}`)}
          onSeatsSelected={(seats) => {
            sessionStorage.setItem("zivo_selected_seats", JSON.stringify(seats));
          }}
        />
      </motion.div>

      {/* Consent + compliance — 3D styled */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-5 space-y-3"
      >
        {/* Consent checkbox — 3D recessed */}
        <div
          className={cn(
            "relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all",
            errors.consent ? "border-destructive/40" : "border-border/30"
          )}
          style={{
            background: errors.consent
              ? "hsl(var(--destructive) / 0.04)"
              : "hsl(var(--muted) / 0.2)",
            boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 0 hsl(0 0% 100% / 0.04)",
          }}
        >
          <Checkbox
            id="consent"
            checked={consentChecked}
            onCheckedChange={(v) => {
              setConsentChecked(!!v);
              if (v) setErrors(prev => { const n = { ...prev }; delete n.consent; return n; });
            }}
            className="mt-0.5"
          />
          <label htmlFor="consent" className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer">
            {FLIGHT_CONSENT.checkboxLabel}{" "}
            I agree to share my information with the travel partner to complete this booking.{" "}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="text-[hsl(var(--flights))] hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn more
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4 max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[hsl(var(--flights))]" />
                    Partner Disclosure
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[55vh] pr-3">
                  <div className="space-y-4 text-sm text-muted-foreground">
                    {/* Important notice */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        ZIVO does NOT issue airline tickets and does NOT collect payment for flights.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">How ZIVO Works</h3>
                      <p>ZIVO is a travel search and referral platform. We help you find and compare flights, but the actual booking, ticketing, and payment are handled by our licensed travel partner (the merchant of record).</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Booking Flow</h3>
                      <ul className="space-y-1.5 mt-1">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--flights))] mt-0.5 shrink-0" />
                          <span>You are redirected to the travel partner's secure checkout</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--flights))] mt-0.5 shrink-0" />
                          <span>The partner processes payment and issues your ticket</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--flights))] mt-0.5 shrink-0" />
                          <span>Final price and terms are confirmed at checkout</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Your Information</h3>
                      <p>With your consent, we securely share your traveler details (name, contact, date of birth) with the travel partner solely to complete your booking. We do not store payment card information. We do not sell your personal information.</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Pricing & Fees</h3>
                      <p>Prices shown are estimates from our partners. The final price and terms are confirmed during checkout. Cancellation, change, and baggage policies are set by the airline and partner.</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Support</h3>
                      <p>For booking changes, cancellations, or refunds, contact the travel partner listed in your confirmation email. ZIVO provides support only for website and navigation issues.</p>
                      <a
                        href="mailto:support@hizivo.com"
                        className="inline-flex items-center gap-1.5 text-[hsl(var(--flights))] hover:underline font-medium text-xs mt-1.5"
                      >
                        support@hizivo.com
                      </a>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <Link
                        to="/partner-disclosure"
                        className="text-[hsl(var(--flights))] hover:underline font-medium text-xs"
                      >
                        View full Partner Disclosure →
                      </Link>
                      <Link
                        to="/privacy-policy"
                        className="text-muted-foreground hover:underline text-xs"
                      >
                        Privacy Policy
                      </Link>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </label>
        </div>

        {/* Cancellation & baggage summary */}
        <div className="space-y-2">
          {/* Cancellation policy */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{
              background: offer.conditions?.refundable
                ? "hsl(142 71% 45% / 0.06)"
                : "hsl(var(--muted) / 0.3)",
              border: `1px solid ${offer.conditions?.refundable ? "hsl(142 71% 45% / 0.15)" : "hsl(var(--border) / 0.3)"}`,
            }}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", offer.conditions?.refundable ? "text-emerald-500" : "text-muted-foreground")} />
            <div className="text-[10px]">
              <p className="font-semibold text-foreground">
                {offer.conditions?.refundable ? "Refundable fare" : "Non-refundable fare"}
                {offer.conditions?.changeable && " · Changeable"}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {offer.conditions?.refundable
                  ? `Refund available${offer.conditions.refundPenalty ? ` (${offer.currency || "USD"} ${offer.conditions.refundPenalty} penalty)` : ""}`
                  : "24-hour free cancellation may apply for US departures (DOT regulation)"}
                {offer.conditions?.changeable && offer.conditions.changePenalty
                  ? ` · Change fee: ${offer.currency || "USD"} ${offer.conditions.changePenalty}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Baggage summary */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{
              background: "hsl(var(--muted) / 0.3)",
              border: "1px solid hsl(var(--border) / 0.3)",
            }}
          >
            <Luggage className="w-3.5 h-3.5 text-[hsl(var(--flights))] mt-0.5 shrink-0" />
            <div className="text-[10px]">
              <p className="font-semibold text-foreground">Baggage included</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-muted-foreground">
                {offer.baggageDetails?.carryOnIncluded && (
                  <span className="flex items-center gap-1">
                    <PackageCheck className="w-2.5 h-2.5" />
                    {offer.baggageDetails.carryOnQuantity}× carry-on
                    {offer.baggageDetails.carryOnWeightKg ? ` (${offer.baggageDetails.carryOnWeightKg}kg)` : ""}
                  </span>
                )}
                {offer.baggageDetails?.checkedBagsIncluded ? (
                  <span className="flex items-center gap-1">
                    <Luggage className="w-2.5 h-2.5" />
                    {offer.baggageDetails.checkedBagQuantity}× checked bag
                    {offer.baggageDetails.checkedBagWeightKg ? ` (${offer.baggageDetails.checkedBagWeightKg}kg)` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">No checked bag</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Partner disclosure — 3D elevated */}
        <div
          className="relative flex items-start gap-3 p-3.5 rounded-2xl overflow-hidden"
          style={{
            background: "hsl(var(--flights) / 0.04)",
            border: "1px solid hsl(var(--flights) / 0.12)",
            boxShadow: "0 4px 16px -4px hsl(var(--flights) / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.06)",
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, hsl(var(--flights)), hsl(var(--flights) / 0.3))" }}
          />
          <Shield className="w-4 h-4 text-[hsl(var(--flights))] shrink-0 mt-0.5 ml-1" />
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-0.5">Secure booking</p>
            <p>{FLIGHT_DISCLAIMERS.ticketing}</p>
          </div>
        </div>

        {/* Fare lock note */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "hsl(var(--muted) / 0.2)" }}>
          <Clock className="w-3 h-3 text-[hsl(var(--flights))] shrink-0" />
          <p className="text-[9px] text-muted-foreground">
            <span className="font-semibold text-foreground">Price held during checkout.</span>{" "}
            Final price confirmed by the travel partner at payment.
          </p>
        </div>

        {/* Trust signals — 3D chips */}
        <div className="flex items-center justify-center gap-2.5 py-1">
          {[
            { icon: Lock, label: "256-bit encryption" },
            { icon: Fingerprint, label: "PCI compliant" },
            { icon: User, label: "GDPR ready" },
          ].map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-1 text-[9px] text-muted-foreground/60 px-2 py-1 rounded-lg"
              style={{
                background: "hsl(var(--muted) / 0.25)",
                boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.03)",
              }}
            >
              <t.icon className="w-2.5 h-2.5" />
              <span>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Legal links — tappable */}
        <p className="text-[9px] text-center text-muted-foreground/60">
          By continuing, you agree to our{" "}
          <Link to="/terms-of-service" className="text-[hsl(var(--flights))]/70 hover:underline">Terms</Link>,{" "}
          <Link to="/privacy-policy" className="text-[hsl(var(--flights))]/70 hover:underline">Privacy</Link>, and{" "}
          <Link to="/partner-disclosure" className="text-[hsl(var(--flights))]/70 hover:underline">Partner Disclosure</Link>
        </p>
      </motion.div>
    </div>
  );

  /* Sticky bottom CTA — 3D elevated with price breakdown */
  const stickyPricing = calculateFlightPricing(offer.pricePerPerson || offer.price, totalPassengers, offer.currency || "USD");
  const totalPrice = stickyPricing.totalAllPassengers;
  const basePrice = stickyPricing.baseFare * totalPassengers;
  const taxesFees = stickyPricing.taxesFeesCharges * totalPassengers;

  const stickyCTA = (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom"
      style={{
        background: "hsl(var(--card) / 0.8)",
        backdropFilter: "blur(24px) saturate(1.4)",
        borderTop: "1px solid hsl(var(--flights) / 0.1)",
        boxShadow: "0 -8px 32px -8px hsl(var(--flights) / 0.1), 0 -2px 8px hsl(var(--foreground) / 0.04)",
      }}
    >
      {/* Flight reminder strip */}
      <div className="border-b border-border/10 px-4 py-1.5" style={{ background: "hsl(var(--muted) / 0.15)" }}>
        <p className="text-[9px] text-muted-foreground text-center truncate">
          <Plane className="w-2.5 h-2.5 inline mr-1 -mt-px" />
          {offer.airline} · {offer.departure.code} → {offer.arrival.code} · {offer.departure.time} – {offer.arrival.time}
        </p>
      </div>

      <div className={cn("mx-auto px-4 py-3", isMobile ? "max-w-lg" : "max-w-2xl")}>
        {/* Expandable price breakdown */}
        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-1 mb-2.5 pb-2.5 border-b border-border/20">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Base fare × {totalPassengers}</span>
                  <span className="text-foreground tabular-nums">${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Taxes & fees</span>
                  <span className="text-foreground tabular-nums">${taxesFees.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setShowBreakdown(!showBreakdown)} className="text-left active:scale-[0.98] transition-transform">
            <p className="text-[9px] text-muted-foreground font-medium flex items-center gap-0.5">
              Total
              <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", showBreakdown && "rotate-180")} />
            </p>
            <p className="text-xl font-bold text-[hsl(var(--flights))] tabular-nums leading-tight tracking-tight">
              ${totalPrice.toFixed(2)}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""} · {offer.currency || "USD"}
            </p>
          </button>
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              size="lg"
              onClick={handleContinue}
              className="relative h-12 px-7 text-sm font-bold rounded-2xl text-primary-foreground gap-1.5 overflow-hidden"
              style={{
                background: "hsl(var(--flights))",
                boxShadow: "0 8px 24px -4px hsl(var(--flights) / 0.4), 0 2px 8px hsl(var(--flights) / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.2)",
              }}
            >
              {/* Shine sweep */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.12) 50%, transparent 60%)",
                }}
              />
              <span className="relative z-10">Continue to Checkout</span>
              <ChevronRight className="w-4 h-4 relative z-10" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <SEOHead title="Traveler Details – ZIVO Flights" description="Enter passenger information for your flight booking." />
        <AppLayout hideHeader hideNav>
          <div className="relative overflow-hidden min-h-[100dvh]">
            {/* 3D ambient background orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-24 right-[-40px] w-72 h-72 rounded-full blur-3xl"
                style={{ background: "hsl(var(--flights) / 0.06)" }}
              />
              <div
                className="absolute bottom-40 left-[-60px] w-48 h-48 rounded-full blur-3xl"
                style={{ background: "hsl(var(--flights) / 0.04)" }}
              />
            </div>
            <div className="relative z-10">
              {pageContent}
            </div>
          </div>
        </AppLayout>
        {stickyCTA}
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col">
      <SEOHead title="Traveler Details – ZIVO Flights" description="Enter passenger information for your flight booking." />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 right-0 w-80 h-80 rounded-full blur-3xl"
          style={{ background: "hsl(var(--flights) / 0.06)" }}
        />
        <div
          className="absolute bottom-40 left-[-60px] w-56 h-56 rounded-full blur-3xl"
          style={{ background: "hsl(var(--flights) / 0.03)" }}
        />
      </div>
      <Header />
      <main className="flex-1 pt-16 pb-8 relative z-10">
        {pageContent}
      </main>
      {stickyCTA}
      <Footer />
    </div>
  );
};

export default FlightTravelerInfo;
