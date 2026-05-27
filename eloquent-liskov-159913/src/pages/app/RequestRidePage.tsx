import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Navigation, Loader2, Car, Receipt, ChevronRight, DollarSign, CreditCard, Lock, Shield, CheckCircle, Zap, Plus, Users, Clock, Sparkles, Leaf, Crown, Volume2, VolumeX, Thermometer, Music, Tag, Gift, Heart, Star, Share2, UserPlus, Phone, AlertTriangle, Copy, ExternalLink, MessageSquare, History, RotateCcw, Headphones, Baby, Briefcase, Home, Building2, Bookmark, Route, Info, X, Bell, ThumbsUp, ThumbsDown, Award, Plane, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useGoogleMapsGeocode } from "@/hooks/useGoogleMapsGeocode";
import type { Suggestion } from "@/hooks/useGoogleMapsGeocode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRideNotifications } from "@/hooks/useRideNotifications";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import RideMap from "@/components/maps/RideMap";

const stripePromise = getStripe();

interface PricingBreakdown {
  base_fare: number;
  per_mile: number;
  per_minute: number;
  airport_fee: number;
  final_multiplier: number;
  total: number;
}

const rideCategories = [
  { id: "economy", label: "Economy", icon: Car },
  { id: "premium", label: "Premium", icon: Sparkles },
  { id: "elite", label: "Elite", icon: Crown },
  { id: "shared", label: "Shared", icon: Users },
];

// Route alternatives
const routeAlternatives = [
  { id: "fastest", label: "Fastest", time: "12 min", distance: "4.2 mi", toll: false },
  { id: "cheapest", label: "Cheapest", time: "18 min", distance: "5.1 mi", toll: false },
  { id: "scenic", label: "Scenic", time: "22 min", distance: "6.8 mi", toll: false },
  { id: "toll", label: "Via Highway", time: "10 min", distance: "3.9 mi", toll: true },
];

// Corporate billing profiles
const corporateProfiles = [
  { id: "personal", label: "Personal", icon: CreditCard },
  { id: "business", label: "Business Expense", icon: Building2 },
];

const vehicleOptions: Record<string, Array<{
  id: string; name: string; badge?: string; badgeColor?: string;
  eta: string; capacity: number; price: string; priceCents: number; multiplier: number;
  description?: string;
}>> = {
  economy: [
    { id: "wait-save", name: "Wait & Save", badge: "Save", badgeColor: "text-primary", eta: "10-15 min", capacity: 4, price: "$13.55", priceCents: 1355, multiplier: 0.85, description: "Cheaper, longer wait" },
    { id: "standard", name: "Standard", eta: "3-5 min", capacity: 4, price: "$16.29", priceCents: 1629, multiplier: 1.0, description: "Everyday rides" },
    { id: "green", name: "Green", badge: "Eco", badgeColor: "text-emerald-500", eta: "5-8 min", capacity: 4, price: "$15.55", priceCents: 1555, multiplier: 0.95, description: "Electric & hybrid" },
    { id: "priority", name: "Priority", badge: "Fast", badgeColor: "text-orange-500", eta: "1-3 min", capacity: 4, price: "$18.29", priceCents: 1829, multiplier: 1.15, description: "Nearest driver" },
    { id: "xl", name: "XL", eta: "5-10 min", capacity: 6, price: "$22.99", priceCents: 2299, multiplier: 1.4, description: "Extra seats" },
  ],
  premium: [
    { id: "comfort", name: "Comfort", eta: "4-8 min", capacity: 4, price: "$24.99", priceCents: 2499, multiplier: 1.5, description: "Newer cars, top drivers" },
    { id: "comfort-xl", name: "Comfort XL", eta: "6-10 min", capacity: 6, price: "$32.50", priceCents: 3250, multiplier: 2.0, description: "Spacious premium" },
    { id: "black", name: "Black", badge: "Top Rated", badgeColor: "text-amber-500", eta: "5-10 min", capacity: 4, price: "$38.99", priceCents: 3899, multiplier: 2.4, description: "Professional drivers" },
  ],
  elite: [
    { id: "black-suv", name: "Black SUV", badge: "Luxury", badgeColor: "text-amber-500", eta: "8-15 min", capacity: 6, price: "$52.99", priceCents: 5299, multiplier: 3.2, description: "Premium SUV" },
    { id: "limo", name: "Limo", badge: "VIP", badgeColor: "text-violet-500", eta: "15-25 min", capacity: 4, price: "$89.99", priceCents: 8999, multiplier: 5.5, description: "Red-carpet experience" },
  ],
  shared: [
    { id: "share-ride", name: "Share Ride", badge: "Save 40%", badgeColor: "text-emerald-500", eta: "5-12 min", capacity: 2, price: "$9.75", priceCents: 975, multiplier: 0.6, description: "Share with others going your way" },
    { id: "share-xl", name: "Share XL", badge: "Save 30%", badgeColor: "text-emerald-500", eta: "8-15 min", capacity: 3, price: "$13.50", priceCents: 1350, multiplier: 0.7, description: "Larger shared vehicle" },
  ],
};

const ridePreferences = [
  { id: "quiet", icon: VolumeX, label: "Quiet Ride", description: "Minimal conversation" },
  { id: "ac", icon: Thermometer, label: "Cool AC", description: "Extra air conditioning" },
  { id: "music", icon: Music, label: "Music On", description: "Driver plays music" },
  { id: "pet", icon: Heart, label: "Pet Friendly", description: "Traveling with a pet" },
  { id: "child-seat", icon: Baby, label: "Child Seat", description: "Car seat needed" },
  { id: "luggage", icon: Briefcase, label: "Luggage", description: "Extra trunk space" },
  { id: "accessibility", icon: Users, label: "Accessible", description: "Wheelchair accessible" },
  { id: "wifi", icon: Zap, label: "Wi-Fi", description: "In-car Wi-Fi access" },
  { id: "charger", icon: CreditCard, label: "Charger", description: "Phone charging cable" },
  { id: "no-stops", icon: Route, label: "Direct Route", description: "No detours" },
];

const tipOptions = [
  { id: "none", label: "No tip", amount: 0 },
  { id: "15", label: "15%", amount: 0.15 },
  { id: "20", label: "20%", amount: 0.20 },
  { id: "25", label: "25%", amount: 0.25 },
  { id: "custom", label: "Custom", amount: 0 },
];

const savedPlaces = [
  { id: "home", label: "Home", icon: Home, address: "" },
  { id: "work", label: "Work", icon: Building2, address: "" },
];

const safetyFeatures = [
  { id: "share-trip", icon: Share2, label: "Share Trip", description: "Share live location with contacts" },
  { id: "emergency", icon: Phone, label: "Emergency", description: "Quick access to 911" },
  { id: "report", icon: AlertTriangle, label: "Report Issue", description: "Report a safety concern" },
  { id: "audio-record", icon: Headphones, label: "Audio Recording", description: "Record ride audio for safety" },
];


// Carbon offset data
const carbonOffsetInfo = {
  treesPerRide: 0.02,
  co2PerMile: 0.41, // lbs
  offsetCostPerRide: 0.25,
};

// Ride pass subscription
const ridePassTiers = [
  { id: "basic", name: "ZIVO Pass", price: "$9.99/mo", savings: "Save up to 15%", features: ["Priority matching", "No surge pricing", "Free cancellations"] },
  { id: "premium", name: "ZIVO Pass+", price: "$24.99/mo", savings: "Save up to 30%", features: ["All Basic perks", "Free upgrades", "Airport lounge access", "Dedicated support"] },
];

// Inner payment form using Stripe Elements
function PaymentForm({ 
  onSuccess, isProcessing, setIsProcessing, totalCents,
}: { 
  onSuccess: () => void; isProcessing: boolean;
  setIsProcessing: (v: boolean) => void; totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements, confirmParams: { return_url: window.location.href }, redirect: "if_required",
    });
    if (error) { toast.error(error.message || "Payment authorization failed"); setIsProcessing(false); }
    else if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) { onSuccess(); }
    else { toast.error("Unexpected payment status"); setIsProcessing(false); }
  };

  const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-5 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/30 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Payment Details</span>
        </div>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
        <Shield className="w-3.5 h-3.5 text-primary/60" />
        <span>Secured by Stripe · TLS 1.3 encrypted</span>
      </div>
      <Button type="submit" disabled={!stripe || isProcessing}
        className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200" size="lg">
        {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" />Processing...</> : <><Lock className="w-5 h-5" />Authorize {formatUSD(totalCents)}</>}
      </Button>
    </form>
  );
}

// Step progress indicator
function RideStepIndicator({ currentStep }: { currentStep: "address" | "pricing" | "payment" | "finding" }) {
  const steps = [
    { id: "address", label: "Route", icon: MapPin },
    { id: "pricing", label: "Price", icon: DollarSign },
    { id: "payment", label: "Pay", icon: CreditCard },
  ] as const;
  const idx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex-1 flex items-center gap-2">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300",
                i <= idx
                  ? "bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground border border-border/40"
              )}>
                {i < idx ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={cn("text-[10px] font-bold", i <= idx ? "text-primary" : "text-muted-foreground/50")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-[2px] flex-1 rounded-full transition-all duration-300 -mt-5", i < idx ? "bg-primary" : "bg-border/40")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Live ETA countdown in finding step
function LiveETACounter() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span className="font-mono text-sm text-primary font-bold">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

// Fare split component
function FareSplitSection({ totalCents, formatUSD }: { totalCents: number; formatUSD: (c: number) => string }) {
  const [splitCount, setSplitCount] = useState(1);
  const [showSplit, setShowSplit] = useState(false);
  const perPerson = Math.ceil(totalCents / splitCount);

  if (!showSplit) {
    return (
      <button type="button" onClick={() => setShowSplit(true)}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-card hover:border-primary/20 transition-all touch-manipulation active:scale-[0.98]">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground">Split Fare</p>
          <p className="text-[10px] text-muted-foreground">Split the cost with fellow riders</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Split Fare</h3>
        <button type="button" onClick={() => { setShowSplit(false); setSplitCount(1); }} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg touch-manipulation active:scale-90">−</button>
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{splitCount}</p>
          <p className="text-[10px] text-muted-foreground">{splitCount === 1 ? "person" : "people"}</p>
        </div>
        <button type="button" onClick={() => setSplitCount(Math.min(6, splitCount + 1))}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg touch-manipulation active:scale-90">+</button>
      </div>
      {splitCount > 1 && (
        <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">Each person pays</p>
          <p className="text-lg font-bold text-primary">{formatUSD(perPerson)}</p>
        </div>
      )}
    </div>
  );
}

// Driver preview card shown during finding
function DriverPreviewCard() {
  const [showDriver, setShowDriver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowDriver(true), 3500);
    return () => clearTimeout(t);
  }, []);

  if (!showDriver) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xs rounded-2xl bg-card border border-primary/20 p-4 space-y-3 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center text-lg font-bold text-primary">M</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Marcus T.</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.92 · 2,341 trips
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px] font-bold">Matching...</Badge>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Car className="w-3 h-3" /> Toyota Camry · White</span>
        <span>· ABC 1234</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Rating</p>
          <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.92</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Trips</p>
          <p className="text-xs font-bold text-foreground">2,341</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Years</p>
          <p className="text-xs font-bold text-foreground">3+</p>
        </div>
      </div>
    </motion.div>
  );
}

// Ride estimate card
function RideEstimateCard({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  if (!pickup || !dropoff) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
      className="rounded-2xl bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
      <Route className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground">Estimated trip</p>
        <p className="text-[10px] text-muted-foreground">~12 min · 4.2 miles · via Highway 101</p>
      </div>
      <Info className="w-4 h-4 text-muted-foreground" />
    </motion.div>
  );
}

// Recent rides section
function RecentRidesSection({ onSelect, rides }: { onSelect: (from: string, to: string) => void; rides: Array<{ id: string; from: string; to: string; date: string; price: string }> }) {
  const [showRecent, setShowRecent] = useState(false);

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setShowRecent(!showRecent)}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
        <History className="w-3.5 h-3.5" /> Recent Rides
        <ChevronRight className={cn("w-3 h-3 transition-transform", showRecent && "rotate-90")} />
      </button>
      <AnimatePresence>
        {showRecent && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden">
            {rides.length === 0 && (
              <div className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">No recent rides yet.</p>
              </div>
            )}
            {rides.map((ride, i) => (
              <motion.button key={ride.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(ride.from, ride.to)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.98] text-left">
                <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{ride.from} → {ride.to}</p>
                  <p className="text-[10px] text-muted-foreground">{ride.date}</p>
                </div>
                <span className="text-xs font-bold text-foreground shrink-0">{ride.price}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Multi-stop manager
function MultiStopManager({ stops, onAddStop, onRemoveStop }: { stops: string[]; onAddStop: () => void; onRemoveStop: (i: number) => void }) {
  if (stops.length === 0) return null;
  return (
    <div className="space-y-2">
      {stops.map((stop, i) => (
        <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-3 pl-6">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-amber-500/20 shrink-0" />
          <span className="text-xs text-foreground flex-1 truncate">Stop {i + 1}: {stop || "Enter stop"}</span>
          <button type="button" onClick={() => onRemoveStop(i)} className="text-destructive hover:text-destructive/80 touch-manipulation active:scale-90">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

export default function RequestRidePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify: notifyRide } = useRideNotifications();
  const { getCurrentLocation, reverseGeocode, isGettingLocation } = useCurrentLocation();
  const { data: userSavedLocations } = useSavedLocations(user?.id);

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const pickupGeocode = useGoogleMapsGeocode();
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const dropoffGeocode = useGoogleMapsGeocode();
  const [activeInput, setActiveInput] = useState<"pickup" | "dropoff" | null>(null);
  const [additionalStops, setAdditionalStops] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState("economy");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  // Pre-fill promo code if forwarded from Stores list (?promo=… or sessionStorage)
  useEffect(() => {
    if (promoCode) return;
    try {
      const params = new URLSearchParams(window.location.search);
      let code = params.get("promo")?.trim().toUpperCase() || "";
      if (!code) {
        const raw = sessionStorage.getItem("zivo:pending-promo");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code && Date.now() - (parsed.ts || 0) < 15 * 60 * 1000) {
            code = String(parsed.code).toUpperCase();
          }
        }
      }
      if (code) setPromoCode(code);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedTip, setSelectedTip] = useState("none");
  const [customTip, setCustomTip] = useState("");
  const [rideNote, setRideNote] = useState("");
  const [showSafety, setShowSafety] = useState(false);
  const [roundTrip, setRoundTrip] = useState(false);
  const [notifyOnArrival, setNotifyOnArrival] = useState(true);
  const [carbonOffset, setCarbonOffset] = useState(false);
  const [showRidePass, setShowRidePass] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "cash" | "wallet">("card");

  // Live surge detection from surge_zones table
  const { data: surgeZones = [] } = useQuery({
    queryKey: ["surge-zones-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("surge_zones")
        .select("base_multiplier, manual_multiplier")
        .eq("is_active", true)
        .eq("surge_enabled", true);
      return data || [];
    },
    refetchInterval: 60000,
  });
  const surgeActive = surgeZones.some((z: any) => (z.manual_multiplier ?? z.base_multiplier ?? 1) > 1.0);

  // Prepare saved places from user's saved locations
  const savedPlacesList = userSavedLocations?.map((loc: any) => ({
    id: loc.id,
    label: loc.label,
    address: loc.address,
    icon: loc.icon_type === "home" ? Home : loc.icon_type === "work" ? Building2 : MapPin,
  })) || [
    { id: "home", label: "Home", icon: Home, address: "" },
    { id: "work", label: "Work", icon: Building2, address: "" },
  ];

  const [favoriteDrivers] = useState(["Marcus T.", "Sarah L.", "David K."]);
  const [requestFavoriteDriver, setRequestFavoriteDriver] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState("fastest");
  const [billingProfile, setBillingProfile] = useState("personal");
  const [shareETAOld, setShareETAOld] = useState(false);
  const [rideReminder, setRideReminder] = useState(false);
  const [rideRating, setRideRating] = useState<number | null>(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [quietZone, setQuietZone] = useState(false);
  const [autoPickupPin, setAutoPickupPin] = useState(true);
  const [estimatedCO2, setEstimatedCO2] = useState(2.3);
  const [petFriendly, setPetFriendly] = useState(false);
  const [musicPreference, setMusicPreference] = useState<"none" | "chill" | "pop" | "jazz" | "classical">("none");
  const [splitFare, setSplitFare] = useState(false);
  const [splitWith, setSplitWith] = useState(1);
  const [weatherAlert] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [safetyRecording, setSafetyRecording] = useState(false);
  const [waitTimeGuarantee, setWaitTimeGuarantee] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [rideInsurance, setRideInsurance] = useState(false);
  const [luggageSize, setLuggageSize] = useState<"none" | "small" | "medium" | "large">("none");
  const [emergencySOS, setEmergencySOS] = useState(false);
  const [showDriverChat, setShowDriverChat] = useState(false);
  const [driverChatMessages, setDriverChatMessages] = useState<Array<{from: string; text: string; time: string}>>([
    { from: "driver", text: "I'm on my way! Look for a blue Toyota.", time: "Just now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [fareLocked, setFareLocked] = useState(false);
  const [showRoutePreview, setShowRoutePreview] = useState(false);

  // Real ride stats from trips table
  const { data: userTrips = [] } = useQuery({
    queryKey: ["user-trips-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("rating, distance_km")
        .eq("rider_id", user!.id)
        .eq("status", "completed");
      return data || [];
    },
  });
  const rideStats = useMemo(() => {
    const totalRides = userTrips.length;
    const totalMiles = Math.round(userTrips.reduce((s: number, t: any) => s + ((t.distance_km ?? 0) * 0.621371), 0));
    const rated = userTrips.filter((t: any) => t.rating != null);
    const avgRating = rated.length ? (rated.reduce((s: number, t: any) => s + t.rating, 0) / rated.length).toFixed(1) : "—";
    const savedCO2 = `${Math.round(userTrips.reduce((s: number, t: any) => s + ((t.distance_km ?? 0) * 0.248), 0))} lbs`;
    return { totalRides, totalMiles, avgRating, savedCO2 };
  }, [userTrips]);
  const [tempPreference, setTempPreference] = useState<"cool" | "warm" | "no-pref">("no-pref");
  const [showRideStats, setShowRideStats] = useState(false);
  const [returnTrip, setReturnTrip] = useState(false);
  const [returnDelay, setReturnDelay] = useState("1hr");
  const [multiStop, setMultiStop] = useState(false);
  const [extraStops, setExtraStops] = useState<string[]>([""]);
  const [favoriteDriver, setFavoriteDriver] = useState(false);
  const [driverPlaylist, setDriverPlaylist] = useState<"none" | "spotify" | "apple" | "youtube">("none");
  const [vehicleColorPref, setVehicleColorPref] = useState<"any" | "black" | "white" | "silver">("any");
  const [childSeat, setChildSeat] = useState(false);
  const [childSeatType, setChildSeatType] = useState<"infant" | "toddler" | "booster">("toddler");
  const [shareETA, setShareETA] = useState(false);
  const [etaRecipient, setEtaRecipient] = useState("");
  const [rideNotes, setRideNotes] = useState("");
  const [showRideHistory, setShowRideHistory] = useState(false);

  // Load user's recent completed rides
  const { data: recentTripRows = [] } = useQuery({
    queryKey: ["user-recent-trips", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, pickup_address, dropoff_address, fare_amount, created_at")
        .eq("rider_id", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });
  const recentRides = useMemo(() => recentTripRows.map((t: any) => ({
    id: t.id,
    from: t.pickup_address,
    to: t.dropoff_address,
    price: t.fare_amount ? `$${Number(t.fare_amount).toFixed(2)}` : "—",
    date: new Date(t.created_at).toLocaleDateString(),
  })), [recentTripRows]);
  const [showQuickRebook, setShowQuickRebook] = useState(false);
  const [selectedVehicleAge, setSelectedVehicleAge] = useState<"any" | "new" | "2yr" | "5yr">("any");
  const [airFreshener, setAirFreshener] = useState(false);
  const [dashcamRequired, setDashcamRequired] = useState(false);
  const [genderPreference, setGenderPreference] = useState<"any" | "female" | "male">("any");
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  // === NEW: Uber/Lyft/Blacklane-inspired features ===
  const [airportMeetGreet, setAirportMeetGreet] = useState(false);
  const [driverLanguage, setDriverLanguage] = useState<"any" | "english" | "spanish" | "french" | "mandarin" | "arabic">("any");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [recurringRide, setRecurringRide] = useState<"none" | "daily" | "weekdays" | "weekly">("none");
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [womenSafetyMode, setWomenSafetyMode] = useState(false);
  const [rideSubscription, setRideSubscription] = useState<"none" | "basic" | "premium">("none");
  const [showSubscriptionWidget, setShowSubscriptionWidget] = useState(false);
  const [executiveChauffeur, setExecutiveChauffeur] = useState(false);
  const [flightTracking, setFlightTracking] = useState(false);
  const [flightNumber, setFlightNumber] = useState("");
  const [poolCountdown] = useState(0);
  const [upfrontPrice, setUpfrontPrice] = useState(true);
  const [rewardPoints] = useState(1247);
  const [showRewards, setShowRewards] = useState(false);
  const [postRideTip, setPostRideTip] = useState(false);
  const [commuteSchedule, setCommuteSchedule] = useState(false);
  const [commuteTime, setCommuteTime] = useState("08:00");
  const [groupRide, setGroupRide] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [carSeatCount, setCarSeatCount] = useState(0);
  const [stopDuration, setStopDuration] = useState(5);
  const [packageInTrunk, setPackageInTrunk] = useState(false);
  const [meetAtCurb, setMeetAtCurb] = useState(true);
  const [verifiedDriver, setVerifiedDriver] = useState(true);

  // === WAVE 3: Commute Intelligence & Analytics ===
  const [showCommuteInsights, setShowCommuteInsights] = useState(false);
  const [showFareHistory, setShowFareHistory] = useState(false);
  const [showDriverMemory, setShowDriverMemory] = useState(false);
  const [showRidePassCompare, setShowRidePassCompare] = useState(false);
  const [showCarbonDashboard, setShowCarbonDashboard] = useState(false);
  const [showSurgePredictor, setShowSurgePredictor] = useState(false);

  // Commute insights data
  const commuteInsights = {
    weeklyRides: 8,
    avgCost: "$16.20",
    peakHours: "8-9 AM, 5-6 PM",
    bestDay: "Tuesday",
    worstDay: "Friday",
    savingsTip: "Ride 10 min earlier to save 22% on avg",
    monthlySpend: [
      { month: "Oct", amount: 248 },
      { month: "Nov", amount: 312 },
      { month: "Dec", amount: 189 },
      { month: "Jan", amount: 276 },
      { month: "Feb", amount: 234 },
    ],
  };

  // Fare history
  const fareHistory = [
    { route: "Home → Office", avgFare: "$14.50", rides: 24, bestTime: "7:30 AM", worstTime: "8:45 AM", savings: "$3.20" },
    { route: "Office → Home", avgFare: "$15.80", rides: 22, bestTime: "4:30 PM", worstTime: "6:00 PM", savings: "$4.10" },
    { route: "Home → Airport", avgFare: "$32.00", rides: 6, bestTime: "6:00 AM", worstTime: "4:00 PM", savings: "$8.50" },
  ];

  // Driver preference memory
  const driverMemory = [
    { name: "Marcus T.", rating: 4.97, rides: 18, preferences: ["Quiet ride", "Cool AC", "Direct route"], lastRide: "2 days ago", vehicle: "Tesla Model 3" },
    { name: "Sarah L.", rating: 4.95, rides: 12, preferences: ["Music on", "Conversation OK"], lastRide: "1 week ago", vehicle: "BMW 3 Series" },
    { name: "David K.", rating: 4.92, rides: 8, preferences: ["Pet friendly", "Extra trunk"], lastRide: "3 days ago", vehicle: "Honda Accord" },
  ];

  // Surge predictor
  const surgePredictions = [
    { time: "Now", surge: 1.0, label: "No surge", color: "text-emerald-500" },
    { time: "30 min", surge: 1.2, label: "Low", color: "text-amber-500" },
    { time: "1 hour", surge: 1.8, label: "High", color: "text-red-500" },
    { time: "2 hours", surge: 1.0, label: "Normal", color: "text-emerald-500" },
  ];

  // Carbon dashboard
  const carbonDashboard = {
    totalOffset: "34 lbs CO2",
    greenRides: 28,
    greenPct: 19,
    treesPlanted: 2,
    rank: "Top 15%",
  };

  const [step, setStep] = useState<"address" | "pricing" | "payment" | "finding">("address");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [draftJobId, setDraftJobId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");

  const togglePreference = (id: string) => {
    setSelectedPreferences(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const tipAmount = useMemo(() => {
    if (!pricing) return 0;
    const total = pricing.total / 100;
    if (selectedTip === "custom") return parseFloat(customTip) || 0;
    const opt = tipOptions.find(t => t.id === selectedTip);
    return opt ? Math.round(total * opt.amount * 100) / 100 : 0;
  }, [selectedTip, customTip, pricing]);

  const handleUseMyLocation = useCallback(async () => {
    try {
      const loc = await getCurrentLocation();
      setPickupCoords({ lat: loc.lat, lng: loc.lng });
      const addr = await reverseGeocode(loc.lat, loc.lng);
      setPickupAddress(addr);
      pickupGeocode.clearSuggestions();
      setActiveInput(null);
    } catch { toast.error("Could not get your location"); }
  }, [getCurrentLocation, reverseGeocode, pickupGeocode]);

  const handleSelectSuggestion = (suggestion: Suggestion, field: "pickup" | "dropoff") => {
    if (field === "pickup") {
      setPickupAddress(suggestion.placeName); setPickupCoords(null);
      pickupGeocode.clearSuggestions();
    } else {
      setDropoffAddress(suggestion.placeName); setDropoffCoords(null);
      dropoffGeocode.clearSuggestions();
    }
    setActiveInput(null);
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { forwardGeocode } = await import("@/services/mapsApi");
      return await forwardGeocode(address);
    } catch { return null; }
  };

  const handleGetPrice = async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!pickupAddress.trim()) { toast.error("Please enter a pickup address"); return; }
    if (!dropoffAddress.trim()) { toast.error("Please enter a dropoff address for pricing"); return; }
    setIsLoadingPrice(true);
    try {
      let finalPickup = pickupCoords;
      if (!finalPickup) { finalPickup = await geocodeAddress(pickupAddress); if (!finalPickup) { toast.error("Could not resolve pickup location."); return; } setPickupCoords(finalPickup); }
      let finalDropoff = dropoffCoords;
      if (!finalDropoff) { finalDropoff = await geocodeAddress(dropoffAddress); if (!finalDropoff) { toast.error("Could not resolve dropoff location."); return; } setDropoffCoords(finalDropoff); }

      const { data: job, error } = await supabase.from("jobs").insert({
        customer_id: user.id, job_type: "ride", status: "created",
        pickup_address: pickupAddress, pickup_lat: finalPickup.lat, pickup_lng: finalPickup.lng,
        dropoff_address: dropoffAddress, dropoff_lat: finalDropoff.lat, dropoff_lng: finalDropoff.lng,
      } as any).select().single();
      if (error || !job) throw new Error(error?.message || "Failed to create draft job");
      const jobId = (job as any).id;
      setDraftJobId(jobId);

      const [estimateRes, zoneRes] = await Promise.all([
        supabase.functions.invoke("trip-estimate", { body: { job_id: jobId } }),
        supabase.rpc("assign_job_zone_and_surge_postgis" as any, { p_job_id: jobId }),
      ]);
      if (estimateRes.error) console.error("[GetPrice] trip-estimate error:", estimateRes.error);
      if (zoneRes.error) console.error("[GetPrice] zone/surge error:", zoneRes.error);

      const { error: pricingError } = await supabase.rpc("apply_pricing_to_job" as any, { p_job_id: jobId });
      if (pricingError) console.error("[GetPrice] apply_pricing error:", pricingError);

      const { data: pricedJob } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      if (pricedJob) {
        const j = pricedJob as any;
        setPricing({ base_fare: j.pricing_base_fare ?? 0, per_mile: j.pricing_per_mile ?? 0, per_minute: j.pricing_per_minute ?? 0, airport_fee: j.pricing_airport_fee ?? 0, final_multiplier: j.pricing_final_multiplier ?? 1, total: j.pricing_total_estimate ?? 0 });
      }
      setStep("pricing");
    } catch (err: any) { toast.error(err.message || "Something went wrong"); } finally { setIsLoadingPrice(false); }
  };

  const handleConfirmPrice = async () => {
    if (!draftJobId) return;
    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", { body: { job_id: draftJobId } });
      if (error) throw new Error(error.message || "Failed to create payment intent");
      const secret = data?.client_secret || data?.clientSecret;
      if (!secret) throw new Error("No client_secret returned");
      setClientSecret(secret); setStep("payment");
    } catch (err: any) { toast.error(err.message || "Failed to initialize payment"); } finally { setIsConfirming(false); }
  };

  const handlePaymentSuccess = async () => {
    if (!draftJobId) return;
    setStep("finding");
    try {
      const { error: updateError } = await supabase.from("jobs").update({ status: "requested" } as any).eq("id", draftJobId);
      if (updateError) console.error("[RequestRide] status update error:", updateError);
      const { error: dispatchError } = await supabase.functions.invoke("dispatch-start", { body: { job_id: draftJobId, offer_ttl_seconds: 25 } });
      if (dispatchError) console.error("[RequestRide] dispatch-start error:", dispatchError);
      setTimeout(() => navigate(`/trip-status/${draftJobId}`), 7000);
    } catch { setTimeout(() => navigate(`/trip-status/${draftJobId}`), 5000); }
  };

  const handleShareTrip = () => {
    const vehicle = currentVehicles.find((v) => v.id === selectedVehicle);
    openShareToChat({
      kind: "ride",
      title: pickupAddress && dropoffAddress
        ? `${pickupAddress} → ${dropoffAddress}`
        : "Ride on ZIVO",
      subtitle: vehicle
        ? `${vehicle.name} · ${vehicle.eta}`
        : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} ride`,
      meta: vehicle ? vehicle.price : undefined,
      deepLink: "/rides/hub",
      image: null,
    });
  };

  const formatUSD = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const handleBack = () => {
    if (step === "finding") return;
    if (step === "payment") setStep("pricing");
    else if (step === "pricing") setStep("address");
    else navigate(-1);
  };
  const currentVehicles = vehicleOptions[activeCategory] || [];

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "FIRST10") {
      setPromoApplied(true); toast.success("Promo code applied! 10% off");
    } else {
      toast.error("Invalid promo code");
    }
  };

  const handleSelectRecentRide = (from: string, to: string) => {
    setPickupAddress(from);
    setDropoffAddress(to);
    setPickupCoords(null);
    setDropoffCoords(null);
    toast.success("Route loaded from history");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title="Request a Ride – ZIVO" description="Book a ZIVO ride in seconds. Economy, comfort, and premium options available." />
      {/* Map area */}
      <div className="relative h-[35vh] min-h-[220px]">
        <RideMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} className="w-full h-full" />
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-3 safe-area-top flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
            className="h-10 px-4 rounded-full bg-card/90 backdrop-blur-lg border border-border/40 flex items-center gap-2 touch-manipulation text-sm font-medium text-foreground shadow-lg">
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowSafety(!showSafety)}
              className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-lg border border-border/40 flex items-center justify-center touch-manipulation shadow-lg">
              <Shield className="w-4 h-4 text-primary" />
            </motion.button>
            {pickupAddress && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-lg border border-border/40 shadow-lg">
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">ETA</span>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground truncate max-w-[120px]">{pickupAddress.split(",")[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{pickupAddress.split(",").slice(1).join(",").trim() || "Pickup"}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Safety Panel Overlay */}
      <AnimatePresence>
        {showSafety && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-[35vh] left-4 right-4 z-30 rounded-2xl bg-card border border-border/40 shadow-2xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Safety Center</h3>
              <button type="button" onClick={() => setShowSafety(false)} className="text-xs text-muted-foreground">Close</button>
            </div>
            {safetyFeatures.map(f => {
              const Icon = f.icon;
              return (
                <button type="button" key={f.id} onClick={() => {
                  if (f.id === "share-trip") handleShareTrip();
                  else if (f.id === "emergency") { window.location.href = "tel:911"; }
                  else if (f.id === "audio-record") toast.info("Audio recording started for this ride");
                  else toast.info("Issue reported. Our team will review.");
                  setShowSafety(false);
                }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:bg-muted/50 transition-all touch-manipulation active:scale-[0.98]">
                  <Icon className="w-4 h-4 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-foreground">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.description}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <div className="flex-1 -mt-6 relative z-10">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        <RideStepIndicator currentStep={step} />

        <div className="px-4 max-w-lg mx-auto w-full space-y-4 pb-28">
          <AnimatePresence mode="wait">
            {step === "address" && (
              <motion.div key="address" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Where to?</h2>
                  <div className="flex items-center gap-2">
                    {/* Billing profile toggle */}
                    <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
                      {corporateProfiles.map(cp => {
                        const CPIcon = cp.icon;
                        return (
                          <button type="button" key={cp.id} onClick={() => { setBillingProfile(cp.id); toast.info(`${cp.label} billing selected`); }}
                            className={cn("px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all",
                              billingProfile === cp.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                            <CPIcon className="w-3 h-3" /> {cp.label.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                </div>

                {/* Quick Book — last 2 rides */}
                {recentRides.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick Book</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                      {recentRides.slice(0, 2).map(ride => (
                        <button type="button" key={ride.id}
                          onClick={() => { setPickupAddress(ride.from); setDropoffAddress(ride.to); setStep("pricing"); }}
                          className="shrink-0 flex-1 min-w-[140px] rounded-2xl border border-primary/30 bg-primary/5 p-3 text-left touch-manipulation active:scale-[0.97] transition-all">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <RotateCcw className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary">Rebook</span>
                            <span className="ml-auto text-[10px] font-semibold text-muted-foreground">{ride.price}</span>
                          </div>
                          <p className="text-[11px] font-bold text-foreground truncate">{ride.to || "—"}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">from {ride.from || "—"}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ride Reminder */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setRideReminder(!rideReminder)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", rideReminder ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", rideReminder ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Set departure reminder</p>
                    <p className="text-[10px] text-muted-foreground">Get notified 15 min before scheduled ride</p>
                  </div>
                </div>

                {/* Auto pickup pin */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setAutoPickupPin(!autoPickupPin)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", autoPickupPin ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", autoPickupPin ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Smart pickup pin</p>
                    <p className="text-[10px] text-muted-foreground">Auto-adjust to nearest safe pickup spot</p>
                  </div>
                </div>

                {/* Weather Alert Banner */}
                {weatherAlert && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-amber-500">Weather Advisory</p>
                      <p className="text-[10px] text-muted-foreground">Rain expected — ETAs may be slightly longer</p>
                    </div>
                  </motion.div>
                )}

                {/* Pet Friendly */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setPetFriendly(!petFriendly); if (!petFriendly) toast.info("🐾 Pet-friendly ride selected"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", petFriendly ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", petFriendly ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">🐾 Pet-friendly ride</p>
                    <p className="text-[10px] text-muted-foreground">Bring your furry friend along · +$3.00</p>
                  </div>
                </div>

                {/* Accessibility */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setAccessibilityMode(!accessibilityMode); if (!accessibilityMode) toast.info("♿ Wheelchair-accessible vehicle requested"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", accessibilityMode ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", accessibilityMode ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">♿ Wheelchair accessible</p>
                    <p className="text-[10px] text-muted-foreground">Vehicle with ramp or lift</p>
                  </div>
                </div>

                {/* Music Preference */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <button type="button" onClick={() => setShowMusicPicker(!showMusicPicker)}
                    className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Music className="w-3.5 h-3.5 text-primary" /> Ride Music</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{musicPreference === "none" ? "No preference" : musicPreference}</span>
                      <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", showMusicPicker && "rotate-90")} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {showMusicPicker && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="flex gap-2 flex-wrap mt-3">
                          {(["none", "chill", "pop", "jazz", "classical"] as const).map(genre => (
                            <button type="button" key={genre} onClick={() => setMusicPreference(genre)}
                              className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                                musicPreference === genre ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                              {genre === "none" ? "🔇 Silent" : genre === "chill" ? "🎵 Chill" : genre === "pop" ? "🎤 Pop" : genre === "jazz" ? "🎷 Jazz" : "🎻 Classical"}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Split Fare */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setSplitFare(!splitFare)}
                      className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", splitFare ? "bg-primary" : "bg-muted/60")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", splitFare ? "left-[18px]" : "left-0.5")} />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" /> Split fare</p>
                      <p className="text-[10px] text-muted-foreground">Split the cost with fellow riders</p>
                    </div>
                  </div>
                  {splitFare && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">Split with:</span>
                      {[1, 2, 3, 4].map(n => (
                        <button type="button" key={n} onClick={() => setSplitWith(n)}
                          className={cn("w-8 h-8 rounded-full text-xs font-bold transition-all touch-manipulation",
                            splitWith === n ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground")}>
                          {n + 1}
                        </button>
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">people</span>
                    </motion.div>
                  )}
                </div>

                {/* Safety Recording */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setSafetyRecording(!safetyRecording); if (!safetyRecording) toast.success("🛡️ Trip recording enabled for safety"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", safetyRecording ? "bg-emerald-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", safetyRecording ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> Safety audio recording</p>
                    <p className="text-[10px] text-muted-foreground">Record trip audio for safety verification</p>
                  </div>
                </div>

                {/* Ride Insurance */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setRideInsurance(!rideInsurance)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", rideInsurance ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", rideInsurance ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-foreground" /> Trip protection</p>
                    <p className="text-[10px] text-muted-foreground">Personal accident cover · +$1.99</p>
                  </div>
                </div>

                {/* Wait Time Guarantee */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setWaitTimeGuarantee(!waitTimeGuarantee); if (!waitTimeGuarantee) toast.info("⏱️ Driver will wait up to 5 min free"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", waitTimeGuarantee ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", waitTimeGuarantee ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Extended wait guarantee</p>
                    <p className="text-[10px] text-muted-foreground">5 min free wait at pickup · +$0.99</p>
                  </div>
                </div>

                {/* Luggage Size */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Briefcase className="w-3.5 h-3.5 text-primary" /> Luggage</p>
                  <div className="flex gap-2">
                    {(["none", "small", "medium", "large"] as const).map(size => (
                      <button type="button" key={size} onClick={() => setLuggageSize(size)}
                        className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                          luggageSize === size ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                        {size === "none" ? "None" : size === "small" ? "🧳 Small" : size === "medium" ? "🧳🧳 Med" : "🧳🧳🧳 Large"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature Preference */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Thermometer className="w-3.5 h-3.5 text-primary" /> Car temperature</p>
                  <div className="flex gap-2">
                    {([
                      { id: "cool" as const, label: "❄️ Cool" },
                      { id: "warm" as const, label: "🔥 Warm" },
                      { id: "no-pref" as const, label: "🤷 No pref" },
                    ]).map(t => (
                      <button type="button" key={t.id} onClick={() => setTempPreference(t.id)}
                        className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                          tempPreference === t.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fare Lock */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setFareLocked(!fareLocked); if (!fareLocked) toast.success("🔒 Fare locked for 5 minutes!"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", fareLocked ? "bg-emerald-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", fareLocked ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-500" /> Lock this fare</p>
                    <p className="text-[10px] text-muted-foreground">Lock price for 5 min during surge · +$1.49</p>
                  </div>
                  {fareLocked && <span className="text-[10px] font-bold text-emerald-500">🔒 Locked</span>}
                </div>

                {/* Return Trip */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setReturnTrip(!returnTrip)}
                      className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", returnTrip ? "bg-primary" : "bg-muted/60")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", returnTrip ? "left-[18px]" : "left-0.5")} />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-primary" /> Schedule return trip</p>
                      <p className="text-[10px] text-muted-foreground">Book a ride back automatically</p>
                    </div>
                  </div>
                  {returnTrip && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mt-2">
                      {["30min", "1hr", "2hr", "3hr", "custom"].map(d => (
                        <button type="button" key={d} onClick={() => setReturnDelay(d)}
                          className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all touch-manipulation",
                            returnDelay === d ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground")}>
                          {d}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Emergency SOS */}
                <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setEmergencySOS(true); toast.error("🚨 Emergency SOS activated — sharing location with emergency contacts"); }}
                    className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 touch-manipulation active:scale-90">
                    <Phone className="w-5 h-5 text-red-500" />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-500">Emergency SOS</p>
                    <p className="text-[10px] text-muted-foreground">Share location with emergency contacts</p>
                  </div>
                </div>

                {/* Ride Stats */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <button type="button" onClick={() => setShowRideStats(!showRideStats)}
                    className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-500" /> Your ride stats</p>
                    <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showRideStats && "rotate-90")} />
                  </button>
                  <AnimatePresence>
                    {showRideStats && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{rideStats.totalRides}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Total Rides</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{rideStats.totalMiles.toLocaleString()}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Miles</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold text-amber-500">⭐ {rideStats.avgRating}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Avg Rating</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                            <p className="text-lg font-bold text-emerald-500">{rideStats.savedCO2}</p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">CO₂ Saved</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* === UBER/LYFT/BLACKLANE FEATURES === */}

                {/* Airport Meet & Greet */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setAirportMeetGreet(!airportMeetGreet); if (!airportMeetGreet) toast.success("✈️ Chauffeur will meet you at arrivals with name sign"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", airportMeetGreet ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", airportMeetGreet ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Plane className="w-3.5 h-3.5 text-foreground" /> Airport Meet & Greet</p>
                    <p className="text-[10px] text-muted-foreground">Driver waits at arrivals with name sign · +$9.99</p>
                  </div>
                </div>

                {/* Driver Language Preference */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <button type="button" onClick={() => setShowLanguagePicker(!showLanguagePicker)} className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">🌐 Driver Language</p>
                    <span className="text-[10px] text-muted-foreground capitalize">{driverLanguage === "any" ? "Any" : driverLanguage}</span>
                  </button>
                  <AnimatePresence>
                    {showLanguagePicker && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex gap-2 flex-wrap mt-3">
                          {(["any", "english", "spanish", "french", "mandarin", "arabic"] as const).map(lang => (
                            <button type="button" key={lang} onClick={() => setDriverLanguage(lang)}
                              className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                                driverLanguage === lang ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                              {lang === "any" ? "🌐 Any" : lang === "english" ? "🇺🇸 EN" : lang === "spanish" ? "🇪🇸 ES" : lang === "french" ? "🇫🇷 FR" : lang === "mandarin" ? "🇨🇳 ZH" : "🇸🇦 AR"}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Women Safety Mode */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setWomenSafetyMode(!womenSafetyMode); if (!womenSafetyMode) toast.success("🛡️ Women's safety mode — prefer female driver, auto-share trip"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", womenSafetyMode ? "bg-pink-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", womenSafetyMode ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">🛡️ Women's Safety Mode</p>
                    <p className="text-[10px] text-muted-foreground">Prefer female driver, auto-share trip with contacts</p>
                  </div>
                </div>

                {/* Recurring Ride */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <button type="button" onClick={() => setShowRecurringOptions(!showRecurringOptions)} className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Recurring Ride</p>
                    <span className="text-[10px] text-muted-foreground capitalize">{recurringRide === "none" ? "One-time" : recurringRide}</span>
                  </button>
                  <AnimatePresence>
                    {showRecurringOptions && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex gap-2 flex-wrap mt-3">
                          {(["none", "daily", "weekdays", "weekly"] as const).map(opt => (
                            <button type="button" key={opt} onClick={() => setRecurringRide(opt)}
                              className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all capitalize",
                                recurringRide === opt ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                              {opt === "none" ? "One-time" : opt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Executive Chauffeur */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setExecutiveChauffeur(!executiveChauffeur); if (!executiveChauffeur) toast.success("👔 Executive chauffeur booked"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", executiveChauffeur ? "bg-amber-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", executiveChauffeur ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-500" /> Executive Chauffeur</p>
                    <p className="text-[10px] text-muted-foreground">Professional driver, business attire, door-to-door · +$15</p>
                  </div>
                </div>

                {/* Upfront Pricing */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setUpfrontPrice(!upfrontPrice)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", upfrontPrice ? "bg-emerald-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", upfrontPrice ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Upfront pricing</p>
                    <p className="text-[10px] text-muted-foreground">Know exact fare before you ride — no surprises</p>
                  </div>
                  {upfrontPrice && <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px]">Active</Badge>}
                </div>

                {/* ZIVO Rewards */}
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4">
                  <button type="button" onClick={() => setShowRewards(!showRewards)} className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> ZIVO Rewards</p>
                    <span className="text-xs font-bold text-amber-500">{rewardPoints} pts</span>
                  </button>
                  <AnimatePresence>
                    {showRewards && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-2">
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min(100, (rewardPoints / 2000) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{2000 - rewardPoints} pts to next free ride</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ride Pass Subscription */}
                <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-500/10 border border-primary/20 p-4">
                  <button type="button" onClick={() => setShowSubscriptionWidget(!showSubscriptionWidget)} className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> ZIVO Ride Pass</p>
                    <span className="text-[10px] font-bold text-primary">{rideSubscription === "none" ? "Join" : rideSubscription}</span>
                  </button>
                  <AnimatePresence>
                    {showSubscriptionWidget && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 space-y-2">
                        {ridePassTiers.map(tier => (
                          <button type="button" key={tier.id} onClick={() => { setRideSubscription(tier.id as any); toast.success(`🎉 ${tier.name} activated!`); }}
                            className={cn("w-full p-3 rounded-xl text-left transition-all",
                              rideSubscription === tier.id ? "bg-primary/10 border border-primary/30" : "bg-card border border-border/40")}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold">{tier.name}</span>
                              <span className="text-xs font-bold text-primary">{tier.price}</span>
                            </div>
                            <p className="text-[10px] text-emerald-500 font-bold">{tier.savings}</p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Multi-Stop */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setMultiStop(!multiStop)}
                      className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", multiStop ? "bg-primary" : "bg-muted/60")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", multiStop ? "left-[18px]" : "left-0.5")} />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Route className="w-3.5 h-3.5 text-primary" /> Multi-stop trip</p>
                      <p className="text-[10px] text-muted-foreground">Add up to 3 extra stops along the way</p>
                    </div>
                  </div>
                  {multiStop && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                      {extraStops.map((stop, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          <Input value={stop} onChange={(e) => { const ns = [...extraStops]; ns[i] = e.target.value; setExtraStops(ns); }}
                            placeholder={`Stop ${i + 1}`} className="h-9 text-xs flex-1" />
                          {extraStops.length > 1 && (
                            <button type="button" onClick={() => setExtraStops(extraStops.filter((_, j) => j !== i))}
                              className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground"><X className="w-3 h-3" /></button>
                          )}
                        </div>
                      ))}
                      {extraStops.length < 3 && (
                        <button type="button" onClick={() => setExtraStops([...extraStops, ""])}
                          className="text-[10px] text-primary font-bold flex items-center gap-1 touch-manipulation"><Plus className="w-3 h-3" /> Add stop</button>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Child Seat */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setChildSeat(!childSeat)}
                      className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", childSeat ? "bg-primary" : "bg-muted/60")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", childSeat ? "left-[18px]" : "left-0.5")} />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Baby className="w-3.5 h-3.5 text-primary" /> Child car seat</p>
                      <p className="text-[10px] text-muted-foreground">Request a vehicle with child seat · +$3.99</p>
                    </div>
                  </div>
                  {childSeat && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 mt-2">
                      {(["infant", "toddler", "booster"] as const).map(t => (
                        <button type="button" key={t} onClick={() => setChildSeatType(t)}
                          className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                            childSeatType === t ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                          {t === "infant" ? "👶 Infant" : t === "toddler" ? "🧒 Toddler" : "💺 Booster"}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Vehicle Preferences */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Car className="w-3.5 h-3.5 text-primary" /> Vehicle color preference</p>
                  <div className="flex gap-2">
                    {(["any", "black", "white", "silver"] as const).map(c => (
                      <button type="button" key={c} onClick={() => setVehicleColorPref(c)}
                        className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                          vehicleColorPref === c ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                        {c === "any" ? "Any" : c === "black" ? "⬛ Black" : c === "white" ? "⬜ White" : "🩶 Silver"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Share ETA */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button type="button" onClick={() => setShareETA(!shareETA)}
                      className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", shareETA ? "bg-primary" : "bg-muted/60")}>
                      <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", shareETA ? "left-[18px]" : "left-0.5")} />
                    </button>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-primary" /> Share live ETA</p>
                      <p className="text-[10px] text-muted-foreground">Send arrival time link to someone</p>
                    </div>
                  </div>
                  {shareETA && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                      <Input value={etaRecipient} onChange={e => setEtaRecipient(e.target.value)}
                        placeholder="Phone or email" className="h-9 text-xs" />
                    </motion.div>
                  )}
                </div>

                {/* Favorite Driver */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setFavoriteDriver(!favoriteDriver); if (!favoriteDriver) toast.info("⭐ We'll try to match you with your preferred drivers!"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", favoriteDriver ? "bg-amber-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", favoriteDriver ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Request favorite driver</p>
                    <p className="text-[10px] text-muted-foreground">Priority match with drivers you've rated 5★</p>
                  </div>
                </div>

                {/* Dashcam & Air Freshener */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setDashcamRequired(!dashcamRequired)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", dashcamRequired ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", dashcamRequired ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Dashcam-equipped vehicle</p>
                    <p className="text-[10px] text-muted-foreground">Vehicles with active dashcam only</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setAirFreshener(!airFreshener); if (!airFreshener) toast.success("🌸 Air freshener requested!"); }}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", airFreshener ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", airFreshener ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">🌸 Fresh air freshener</p>
                    <p className="text-[10px] text-muted-foreground">Request a fresh-scented car</p>
                  </div>
                </div>

                {/* Ride Notes */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><MessageSquare className="w-3.5 h-3.5 text-primary" /> Notes for driver</p>
                  <Input value={rideNotes} onChange={e => setRideNotes(e.target.value)}
                    placeholder="E.g., I'll be at the main entrance wearing a red jacket" className="h-9 text-xs" />
                </div>

                {/* Recent Rides */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <button type="button" onClick={() => setShowRideHistory(!showRideHistory)}
                    className="w-full flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-primary" /> Recent rides</p>
                    <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showRideHistory && "rotate-90")} />
                  </button>
                  <AnimatePresence>
                    {showRideHistory && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="space-y-2 mt-3">
                          {recentRides.length === 0 && (
                            <div className="rounded-xl bg-muted/30 p-3 text-center">
                              <p className="text-xs text-muted-foreground">No recent rides yet.</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Your past trips will appear here.</p>
                            </div>
                          )}
                          {recentRides.map(ride => (
                            <button type="button" key={ride.id} onClick={() => { toast.info(`Rebooking: ${ride.from} → ${ride.to}`); }}
                              className="w-full rounded-xl bg-muted/30 p-3 text-left hover:bg-muted/50 transition-colors touch-manipulation">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs font-bold text-foreground">{ride.from} → {ride.to}</p>
                                  <p className="text-[10px] text-muted-foreground">{ride.date}</p>
                                </div>
                                <span className="text-xs font-bold text-primary">{ride.price}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Address inputs */}
                <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 shadow-sm">
                  <div className="relative flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
                    <Input placeholder="Enter pickup location" value={pickupAddress}
                      onChange={(e) => { setPickupAddress(e.target.value); setPickupCoords(null); pickupGeocode.fetchSuggestions(e.target.value); setActiveInput("pickup"); }}
                      onFocus={() => setActiveInput("pickup")}
                      className="h-11 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 shadow-none" />
                  </div>
                  <div className="ml-1.5 border-l-2 border-dashed border-border/40 h-3" />

                  {/* Multi-stops */}
                  <MultiStopManager stops={additionalStops}
                    onAddStop={() => setAdditionalStops(prev => [...prev, ""])}
                    onRemoveStop={(i) => setAdditionalStops(prev => prev.filter((_, idx) => idx !== i))} />

                  <div className="relative flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-orange-500/20 shrink-0" />
                    <Input placeholder="Enter destination" value={dropoffAddress}
                      onChange={(e) => { setDropoffAddress(e.target.value); setDropoffCoords(null); dropoffGeocode.fetchSuggestions(e.target.value); setActiveInput("dropoff"); }}
                      onFocus={() => setActiveInput("dropoff")}
                      className="h-11 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 shadow-none" />
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </div>

                {/* Saved places */}
                {(activeInput === "pickup" || activeInput === "dropoff") && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-2xl shadow-lg overflow-hidden">
                    {savedPlaces.map((place) => {
                      const PlaceIcon = place.icon;
                      return (
                        <button type="button"
                          key={place.id}
                          onClick={() => {
                            if (activeInput === "pickup") {
                              setPickupAddress(place.label);
                              setActiveInput(null);
                            } else {
                              setDropoffAddress(place.label);
                              setActiveInput(null);
                            }
                          }}
                          className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition border-b border-border/20 last:border-b-0 text-sm text-foreground touch-manipulation active:bg-muted/80 flex items-center gap-3"
                        >
                          <PlaceIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium">{place.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Suggestions */}
                {activeInput === "pickup" && pickupGeocode.suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-2xl shadow-lg overflow-hidden">
                    {pickupGeocode.suggestions.map((s) => (
                      <button type="button" key={s.id} onClick={() => handleSelectSuggestion(s, "pickup")} className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition border-b border-border/20 last:border-b-0 text-sm text-foreground touch-manipulation active:bg-muted/80 flex items-center gap-3">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{s.placeName}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
                {activeInput === "dropoff" && dropoffGeocode.suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-2xl shadow-lg overflow-hidden">
                    {dropoffGeocode.suggestions.map((s) => (
                      <button type="button" key={s.id} onClick={() => handleSelectSuggestion(s, "dropoff")} className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition border-b border-border/20 last:border-b-0 text-sm text-foreground touch-manipulation active:bg-muted/80 flex items-center gap-3">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{s.placeName}</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Quick actions row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={handleUseMyLocation} disabled={isGettingLocation}
                    className="gap-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5">
                    {isGettingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                    Use my location
                  </Button>
                  {savedPlaces.map(place => {
                    const PlaceIcon = place.icon;
                    return (
                      <button type="button" key={place.id} onClick={() => { if (place.address) { setPickupAddress(place.address); } else { toast.info(`Set your ${place.label} address in Settings`); } }}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30 touch-manipulation active:scale-95">
                        <PlaceIcon className="w-3 h-3" /> {place.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setAdditionalStops(prev => [...prev, ""])}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30 touch-manipulation active:scale-95">
                    <Plus className="w-3.5 h-3.5" /> Add stop
                  </button>
                </div>

                {/* Ride estimate card */}
                <RideEstimateCard pickup={pickupAddress} dropoff={dropoffAddress} />

                {/* Recent rides */}
                <RecentRidesSection onSelect={handleSelectRecentRide} rides={recentRides} />

                {/* Note to driver */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input placeholder="Note to driver (e.g., I'm at the blue door)" value={rideNote} onChange={(e) => setRideNote(e.target.value)} className="h-10 rounded-xl text-sm" />
                </div>

                {/* Round trip toggle */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setRoundTrip(!roundTrip)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", roundTrip ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", roundTrip ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-primary" /> Round trip</p>
                    <p className="text-[10px] text-muted-foreground">Book return ride at 10% discount</p>
                  </div>
                </div>

                {/* Schedule ride toggle */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setIsScheduled(!isScheduled)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", isScheduled ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", isScheduled ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Schedule for later</p>
                    {!isScheduled && <p className="text-[10px] text-muted-foreground">Ride now · ASAP pickup</p>}
                  </div>
                </div>
                {isScheduled && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-2 gap-2">
                    {["Today 2:00 PM", "Today 5:00 PM", "Tomorrow 9:00 AM", "Tomorrow 12:00 PM"].map(time => (
                      <button type="button" key={time} onClick={() => setScheduleTime(time)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all touch-manipulation active:scale-95",
                          scheduleTime === time ? "border-primary bg-primary/5" : "border-border/40 bg-card hover:border-primary/20"
                        )}>
                        <p className="font-bold text-xs text-foreground">{time.split(" ").slice(0, 1)}</p>
                        <p className="text-[10px] text-muted-foreground">{time.split(" ").slice(1).join(" ")}</p>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Notify on arrival */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setNotifyOnArrival(!notifyOnArrival)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", notifyOnArrival ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", notifyOnArrival ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-primary" /> Notify on arrival</p>
                    <p className="text-[10px] text-muted-foreground">Get a push notification when driver arrives</p>
                  </div>
                </div>

                {/* Carbon Offset */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setCarbonOffset(!carbonOffset)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", carbonOffset ? "bg-emerald-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", carbonOffset ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-emerald-500" /> Carbon Offset</p>
                    <p className="text-[10px] text-muted-foreground">+$0.25 · Plant trees to offset your trip emissions</p>
                  </div>
                </div>

                {/* Favorite Driver */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setRequestFavoriteDriver(!requestFavoriteDriver)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", requestFavoriteDriver ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", requestFavoriteDriver ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Request favorite driver</p>
                    <p className="text-[10px] text-muted-foreground">{favoriteDrivers.slice(0, 2).join(", ")} +{favoriteDrivers.length - 2} more</p>
                  </div>
                </div>

                {/* Surge Warning Banner */}
                {surgeActive && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">High demand in your area</p>
                      <p className="text-[10px] text-muted-foreground">Prices may be 1.2-1.5x higher · Wait 10 min for lower rates</p>
                    </div>
                  </motion.div>
                )}

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> Payment Method
                  </h3>
                  <div className="flex gap-2">
                    {([
                      { id: "card" as const, label: "Card", icon: CreditCard },
                      { id: "cash" as const, label: "Cash", icon: DollarSign },
                      { id: "wallet" as const, label: "ZIVO Pay", icon: Zap },
                    ]).map(pm => {
                      const PMIcon = pm.icon;
                      return (
                        <button type="button" key={pm.id} onClick={() => setSelectedPaymentMethod(pm.id)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                            selectedPaymentMethod === pm.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted"
                          )}>
                          <PMIcon className="w-3.5 h-3.5" />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ZIVO Ride Pass Banner */}
                <button type="button" onClick={() => setShowRidePass(!showRidePass)}
                  className="w-full rounded-2xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 p-3 flex items-center gap-3 touch-manipulation active:scale-[0.98] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-foreground">ZIVO Ride Pass</p>
                    <p className="text-[10px] text-muted-foreground">Save up to 30% on every ride · From $9.99/mo</p>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showRidePass && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {showRidePass && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden">
                      {ridePassTiers.map(tier => (
                        <div key={tier.id} className="rounded-xl bg-card border border-border/40 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground">{tier.name}</span>
                            <span className="text-xs font-bold text-primary">{tier.price}</span>
                          </div>
                          <p className="text-[10px] text-emerald-500 font-bold mb-1.5">{tier.savings}</p>
                          <div className="flex flex-wrap gap-1">
                            {tier.features.map(f => (
                              <span key={f} className="text-[9px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{f}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => navigate("/membership")} className="w-full rounded-xl text-xs font-bold">
                        Learn More
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Category Tabs */}
                <div className="flex gap-2 pt-2">
                  {rideCategories.map((cat) => (
                    <button type="button" key={cat.id} onClick={() => { setActiveCategory(cat.id); setSelectedVehicle(null); }}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 touch-manipulation active:scale-95",
                        activeCategory === cat.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted"
                      )}>
                      {cat.id === "premium" && <Sparkles className="w-3 h-3" />}
                      {cat.id === "elite" && <Crown className="w-3 h-3" />}
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Vehicle Options */}
                <div className="space-y-2">
                  {currentVehicles.map((vehicle, i) => (
                    <motion.button key={vehicle.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedVehicle(vehicle.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 touch-manipulation active:scale-[0.98]",
                        selectedVehicle === vehicle.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/30"
                      )}>
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", selectedVehicle === vehicle.id ? "bg-primary/15" : "bg-muted/50")}>
                        <Car className={cn("w-6 h-6", selectedVehicle === vehicle.id ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{vehicle.name}</span>
                          {vehicle.badge && <span className={cn("text-[10px] font-bold flex items-center gap-0.5", vehicle.badgeColor)}><span className="w-1.5 h-1.5 rounded-full bg-current" />{vehicle.badge}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" /><span>{vehicle.eta}</span>
                          {vehicle.description && <span className="text-muted-foreground/60">· {vehicle.description}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"><Users className="w-3.5 h-3.5" /><span>{vehicle.capacity}</span></div>
                      <span className={cn("text-base font-bold shrink-0", selectedVehicle === vehicle.id ? "text-primary" : "text-foreground")}>{vehicle.price}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Ride Preferences */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Ride Preferences
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {ridePreferences.map(pref => {
                      const Icon = pref.icon;
                      const isSelected = selectedPreferences.includes(pref.id);
                      return (
                        <button type="button" key={pref.id} onClick={() => togglePreference(pref.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all touch-manipulation active:scale-95",
                            isSelected ? "bg-primary/10 border border-primary/30 text-primary" : "bg-muted/50 border border-border/40 text-muted-foreground hover:bg-muted"
                          )}>
                          <Icon className="w-3.5 h-3.5" />
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Get Price button */}
                <Button onClick={handleGetPrice} disabled={isLoadingPrice || !pickupAddress.trim() || !dropoffAddress.trim()}
                  className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200" size="lg">
                  {isLoadingPrice ? <><Loader2 className="w-5 h-5 animate-spin" />Calculating price...</> : <><Zap className="w-5 h-5" />{selectedVehicle ? `Request ${currentVehicles.find(v => v.id === selectedVehicle)?.name || "Ride"}` : "Get Price"}</>}
                </Button>
              </motion.div>
            )}

            {step === "pricing" && (
              <motion.div key="pricing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                {/* Route summary */}
                <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-emerald-500 shadow-sm shadow-primary/30" />
                      <div className="w-0.5 h-10 bg-gradient-to-b from-primary/40 to-destructive/40" />
                      <div className="w-3 h-3 rounded-full bg-destructive shadow-sm shadow-destructive/30" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div><p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Pickup</p><p className="text-sm font-bold text-foreground truncate">{pickupAddress}</p></div>
                      <div><p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Dropoff</p><p className="text-sm font-bold text-foreground truncate">{dropoffAddress}</p></div>
                    </div>
                  </div>
                  {rideNote && (
                    <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="w-3 h-3 shrink-0" /> {rideNote}
                    </div>
                  )}
                  {roundTrip && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-bold">
                      <RotateCcw className="w-3 h-3" /> Round trip · 10% off return
                    </div>
                  )}
                </div>

                {/* Selected vehicle + preferences */}
                {selectedVehicle && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                      <Car className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">{currentVehicles.find(v => v.id === selectedVehicle)?.name}</span>
                    </div>
                    {selectedPreferences.map(p => {
                      const pref = ridePreferences.find(rp => rp.id === p);
                      if (!pref) return null;
                      const Icon = pref.icon;
                      return (
                        <div key={p} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-xs text-muted-foreground">
                          <Icon className="w-3 h-3" /> {pref.label}
                        </div>
                      );
                    })}
                    {isScheduled && scheduleTime && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-bold">
                        <Clock className="w-3 h-3" /> {scheduleTime}
                      </div>
                    )}
                  </div>
                )}

                {/* Price breakdown */}
                {pricing && (
                  <div className="rounded-2xl bg-card border border-border/40 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2.5 p-4 border-b border-border/30 bg-muted/20">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="w-4 h-4 text-primary" /></div>
                      <span className="text-sm font-bold text-foreground">Fare Breakdown</span>
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Base fare</span><span className="font-bold text-foreground">{formatUSD(pricing.base_fare)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Distance charge</span><span className="font-bold text-foreground">{formatUSD(pricing.per_mile)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Time charge</span><span className="font-bold text-foreground">{formatUSD(pricing.per_minute)}</span></div>
                      {pricing.airport_fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Airport fee</span><span className="font-bold text-foreground">{formatUSD(pricing.airport_fee)}</span></div>}
                      {pricing.final_multiplier !== 1 && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-amber-600 font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Surge ({pricing.final_multiplier.toFixed(2)}x)</span>
                          <span className="text-xs text-amber-600 font-bold">applied</span>
                        </div>
                      )}
                      {roundTrip && (
                        <div className="flex justify-between items-center text-primary">
                          <span className="text-xs font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Round trip discount</span>
                          <span className="text-xs font-bold">-10%</span>
                        </div>
                      )}
                      {promoApplied && (
                        <div className="flex justify-between items-center text-primary">
                          <span className="text-xs font-bold flex items-center gap-1"><Tag className="w-3 h-3" /> Promo FIRST10</span>
                          <span className="text-xs font-bold">-10%</span>
                        </div>
                      )}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex justify-between pt-4 border-t border-border/30">
                        <span className="font-bold text-lg text-foreground">Estimated Total</span>
                        <span className="font-bold text-2xl text-primary">{formatUSD(promoApplied ? Math.round(pricing.total * 0.9) : pricing.total)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pt-2">Final price may vary based on actual route, traffic, and wait time.</p>
                    </div>
                  </div>
                )}

                {/* Fare Split */}
                {pricing && <FareSplitSection totalCents={promoApplied ? Math.round(pricing.total * 0.9) : pricing.total} formatUSD={formatUSD} />}

                {/* Promo Code */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Gift className="w-3 h-3" /> Promo Code
                  </h3>
                  <div className="flex gap-2">
                    <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
                      disabled={promoApplied} className="h-10 rounded-xl flex-1 text-sm" />
                    <Button variant={promoApplied ? "outline" : "default"} size="sm" onClick={handleApplyPromo}
                      disabled={promoApplied || !promoCode.trim()} className="rounded-xl h-10 px-4 text-xs font-bold">
                      {promoApplied ? <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Applied</> : "Apply"}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleConfirmPrice} disabled={isConfirming}
                  className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200" size="lg">
                  {isConfirming ? <><Loader2 className="w-5 h-5 animate-spin" />Setting up payment...</> : <><CreditCard className="w-5 h-5" />Continue to Payment</>}
                </Button>
              </motion.div>
            )}

            {step === "payment" && clientSecret && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                <div className="p-4 rounded-2xl bg-card border border-border/40 flex items-center justify-between shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{pickupAddress}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />{dropoffAddress}</p>
                  </div>
                  {pricing && <span className="text-xl font-bold text-primary ml-3 shrink-0">{formatUSD(promoApplied ? Math.round(pricing.total * 0.9) : pricing.total)}</span>}
                </div>

                {/* Tip Selection */}
                <div className="rounded-2xl bg-card border border-border/40 p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Heart className="w-3 h-3" /> Add a Tip
                  </h3>
                  <div className="flex gap-2 mb-2">
                    {tipOptions.map(opt => (
                      <button type="button" key={opt.id} onClick={() => setSelectedTip(opt.id)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                          selectedTip === opt.id ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40 hover:bg-muted"
                        )}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {selectedTip === "custom" && (
                    <Input placeholder="Enter tip amount" type="number" value={customTip}
                      onChange={(e) => setCustomTip(e.target.value)} className="h-10 rounded-xl text-sm mt-2" />
                  )}
                  {tipAmount > 0 && (
                    <p className="text-xs text-primary font-medium mt-2">Tip: ${tipAmount.toFixed(2)} — Thank you for your generosity!</p>
                  )}
                </div>

                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "hsl(142, 76%, 36%)", borderRadius: "12px" } } }}>
                  <PaymentForm onSuccess={handlePaymentSuccess} isProcessing={isProcessingPayment} setIsProcessing={setIsProcessingPayment} totalCents={(pricing?.total ?? 0) + Math.round(tipAmount * 100)} />
                </Elements>
              </motion.div>
            )}

            {/* FINDING DRIVER - Enhanced with driver preview */}
            {step === "finding" && (
              <motion.div key="finding" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary flex items-center justify-center">
                    <Car className="w-8 h-8 text-primary" />
                  </motion.div>
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Finding your driver...</h2>
                  <p className="text-sm text-muted-foreground">Matching you with the nearest available driver</p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> Searching for <LiveETACounter />
                  </div>
                </div>

                {/* Live progress steps */}
                <div className="w-full max-w-xs space-y-2">
                  {[
                    { label: "Payment confirmed", done: true, icon: CheckCircle },
                    { label: "Searching nearby drivers", done: false, icon: Navigation, active: true },
                    { label: "Driver assigned", done: false, icon: Car },
                    { label: "Driver en route to you", done: false, icon: MapPin },
                  ].map((item, i) => (
                    <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}
                      className={cn("flex items-center gap-3 p-2.5 rounded-xl text-left", item.done ? "opacity-100" : item.active ? "opacity-100" : "opacity-40")}>
                      <item.icon className={cn("w-4 h-4 shrink-0", item.done ? "text-primary" : item.active ? "text-amber-500 animate-pulse" : "text-muted-foreground")} />
                      <span className={cn("text-xs font-medium", item.done ? "text-primary" : item.active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                      {item.done && <CheckCircle className="w-3 h-3 text-primary ml-auto" />}
                    </motion.div>
                  ))}
                </div>

                {/* Driver Preview Card */}
                <DriverPreviewCard />

                {/* Share ETA with contacts */}
                <div className="w-full max-w-xs space-y-2">
                  <button type="button" onClick={() => { setShareETA(true); toast.success("Live ETA shared with your contacts!"); }}
                    className={cn("w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold touch-manipulation active:scale-95 transition-all",
                      shareETA ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-card text-foreground hover:bg-muted/50")}>
                    <Navigation className="w-4 h-4" /> {shareETA ? "ETA Shared ✓" : "Share Live ETA"}
                  </button>
                </div>

                {/* Rate after ride found */}
                {rideRating === null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
                    className="w-full max-w-xs text-center space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Rate your last ride</p>
                    <div className="flex justify-center gap-1.5">
                      {[1,2,3,4,5].map(s => (
                        <button type="button" key={s} onClick={() => { setRideRating(s); toast.success(`Rated ${s} stars!`); }}
                          className="touch-manipulation active:scale-90 transition-transform">
                          <Star className={cn("w-7 h-7", rideRating && s <= rideRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Verified drivers</span>
                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> 4.8+ rated</span>
                  <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-emerald-500" /> Insured</span>
                </div>

                {/* Safety actions during finding */}
                <div className="flex gap-3 w-full max-w-xs">
                  <button type="button" onClick={handleShareTrip}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-border/40 bg-card text-xs font-bold text-foreground hover:bg-muted/50 touch-manipulation active:scale-95">
                    <Share2 className="w-4 h-4 text-primary" /> Share Trip
                  </button>
                  <button type="button" onClick={() => { notifyRide("trip_cancelled", { jobId: draftJobId ?? undefined }); toast.info("Ride cancelled. Refund will be processed."); navigate("/"); }}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive/10 touch-manipulation active:scale-95">
                    Cancel
                  </button>
                </div>

                {isScheduled && scheduleTime && (
                  <div className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" />Scheduled: {scheduleTime}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* === WAVE 3: Intelligence Sections === */}
      {step === "address" && (
        <div className="px-4 pb-4 space-y-3">
          {/* Commute Insights */}
          <button type="button" onClick={() => setShowCommuteInsights(!showCommuteInsights)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <BarChart3 className="w-3.5 h-3.5 text-foreground" /> Commute Insights
            <Badge className="bg-secondary text-foreground border-0 text-[8px] ml-auto">AI</Badge>
            <ChevronRight className={cn("w-3 h-3 transition-transform", showCommuteInsights && "rotate-90")} />
          </button>
          {showCommuteInsights && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl bg-muted/30"><p className="text-sm font-bold text-foreground">{commuteInsights.weeklyRides}</p><p className="text-[9px] text-muted-foreground">Rides/week</p></div>
                <div className="text-center p-2 rounded-xl bg-muted/30"><p className="text-sm font-bold text-foreground">{commuteInsights.avgCost}</p><p className="text-[9px] text-muted-foreground">Avg cost</p></div>
                <div className="text-center p-2 rounded-xl bg-emerald-500/10"><p className="text-sm font-bold text-emerald-500">{commuteInsights.bestDay}</p><p className="text-[9px] text-muted-foreground">Best day</p></div>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {commuteInsights.monthlySpend.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(m.amount / 350) * 100}%` }} className="w-full rounded-t bg-secondary" />
                    <span className="text-[8px] text-muted-foreground">{m.month}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-emerald-500 font-bold bg-emerald-500/5 p-2 rounded-lg">💡 {commuteInsights.savingsTip}</p>
            </motion.div>
          )}

          {/* Surge Predictor */}
          <button type="button" onClick={() => setShowSurgePredictor(!showSurgePredictor)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Surge Forecast
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showSurgePredictor && "rotate-90")} />
          </button>
          {showSurgePredictor && (
            <div className="grid grid-cols-4 gap-2">
              {surgePredictions.map(s => (
                <div key={s.time} className="text-center p-2 rounded-xl bg-card border border-border/40">
                  <p className="text-[10px] text-muted-foreground">{s.time}</p>
                  <p className={cn("text-sm font-bold", s.color)}>{s.surge}x</p>
                  <p className={cn("text-[8px] font-bold", s.color)}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Fare History */}
          <button type="button" onClick={() => setShowFareHistory(!showFareHistory)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Fare History by Route
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showFareHistory && "rotate-90")} />
          </button>
          {showFareHistory && (
            <div className="space-y-2">
              {fareHistory.map(f => (
                <div key={f.route} className="rounded-xl bg-card border border-border/40 p-3">
                  <p className="text-xs font-bold text-foreground">{f.route}</p>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Avg: <b className="text-foreground">{f.avgFare}</b></span>
                    <span>{f.rides} rides</span>
                    <span className="text-emerald-500">Best: {f.bestTime}</span>
                    <span className="text-red-500">Worst: {f.worstTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Driver Memory */}
          <button type="button" onClick={() => setShowDriverMemory(!showDriverMemory)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <Heart className="w-3.5 h-3.5 text-foreground" /> Favorite Drivers
            <Badge className="bg-secondary text-foreground border-0 text-[8px] ml-auto">{driverMemory.length}</Badge>
            <ChevronRight className={cn("w-3 h-3 transition-transform", showDriverMemory && "rotate-90")} />
          </button>
          {showDriverMemory && (
            <div className="space-y-2">
              {driverMemory.map(d => (
                <div key={d.name} className="rounded-xl bg-card border border-border/40 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{d.name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.vehicle} · ★ {d.rating} · {d.rides} rides</p>
                    </div>
                    <button type="button" onClick={() => navigate("/rides/hub", { state: { preferredDriverId: d.name, preferredDriverName: d.name } })} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">Request</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.preferences.map(p => <span key={p} className="px-2 py-0.5 rounded-full bg-muted/50 text-[8px] text-muted-foreground">{p}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Carbon Dashboard */}
          <button type="button" onClick={() => setShowCarbonDashboard(!showCarbonDashboard)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Carbon Impact
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showCarbonDashboard && "rotate-90")} />
          </button>
          {showCarbonDashboard && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="text-center"><p className="text-sm font-bold text-emerald-500">{carbonDashboard.totalOffset}</p><p className="text-[9px] text-muted-foreground">Offset</p></div>
                <div className="text-center"><p className="text-sm font-bold text-foreground">{carbonDashboard.greenRides}</p><p className="text-[9px] text-muted-foreground">Green rides</p></div>
                <div className="text-center"><p className="text-sm font-bold text-emerald-500">{carbonDashboard.rank}</p><p className="text-[9px] text-muted-foreground">Eco rank</p></div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">🌳 You've helped plant {carbonDashboard.treesPlanted} trees this month</p>
            </div>
          )}

          {/* Ride Hub Quick Access */}
          <button type="button"
            onClick={() => navigate("/rides/hub")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/30 transition-all touch-manipulation active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-foreground">ZIVO Ride</p>
              <p className="text-[10px] text-muted-foreground">Insights, Ride Pass, receipts & more</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}

      <ZivoMobileNav />

    </div>
  );
}
