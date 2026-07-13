/**
 * DeliveryPage - Package delivery booking flow
 * Premium ZIVO super-app style with map, scheduling, and confirmation
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Package, Loader2, Clock, DollarSign, CreditCard, Shield, CheckCircle, Zap, Scale, Ruler, Box, Truck, Navigation, AlertTriangle, Calendar, Camera, PartyPopper, Phone, MessageSquare, Gift, Tag, Copy, Share2, Star, RefreshCw, Bell, Users, RotateCcw, Percent, ThumbsUp, Award, ChevronRight, History, X, Info, Plus, Thermometer, Lock as LockIcon, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEatsNotifications } from "@/hooks/useEatsNotifications";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const packageSizes = [
  { id: "envelope", name: "Envelope", description: "Documents, letters", icon: "📄", maxWeight: "0.5 lb", price: 5.99 },
  { id: "small", name: "Small Box", description: "Books, small items", icon: "📦", maxWeight: "5 lbs", price: 8.99 },
  { id: "medium", name: "Medium Box", description: "Clothing, electronics", icon: "📦", maxWeight: "20 lbs", price: 14.99 },
  { id: "large", name: "Large Box", description: "Furniture, large boxes", icon: "📦", maxWeight: "50 lbs", price: 24.99 },
  { id: "custom", name: "Custom", description: "Oversized or unusual", icon: "📐", maxWeight: "100+ lbs", price: 39.99 },
  { id: "pallet", name: "Pallet", description: "Bulk freight shipment", icon: "🏗️", maxWeight: "500+ lbs", price: 89.99 },
];

// Insurance tiers
const insuranceTiers = [
  { id: "none", label: "No Insurance", coverage: "$0", cost: 0 },
  { id: "basic", label: "Basic", coverage: "Up to $100", cost: 1.99 },
  { id: "standard", label: "Standard", coverage: "Up to $500", cost: 4.99 },
  { id: "premium", label: "Premium", coverage: "Up to $2,000", cost: 9.99 },
  { id: "full", label: "Full Value", coverage: "Declared value", cost: 14.99 },
];

// Delivery categories
const deliveryCategories = [
  { id: "standard", label: "Standard", icon: Package },
  { id: "fragile", label: "Fragile", icon: AlertTriangle },
  { id: "perishable", label: "Perishable", icon: Clock },
  { id: "hazmat", label: "Hazmat", icon: Shield },
];

const deliverySpeed = [
  { id: "standard", name: "Standard", time: "2-4 hours", multiplier: 1.0, badge: null, icon: Truck },
  { id: "express", name: "Express", time: "60-90 min", multiplier: 1.5, badge: "Fast", icon: Zap },
  { id: "rush", name: "Rush", time: "30-45 min", multiplier: 2.2, badge: "Fastest", icon: AlertTriangle },
  { id: "same-day", name: "Same Day", time: "By 9 PM", multiplier: 1.2, badge: "Value", icon: Clock },
];

const scheduleTimes = [
  { id: "now", label: "Now", description: "ASAP delivery" },
  { id: "today-2pm", label: "Today 2 PM", description: "Scheduled" },
  { id: "today-5pm", label: "Today 5 PM", description: "Scheduled" },
  { id: "tomorrow-9am", label: "Tomorrow 9 AM", description: "Next day" },
  { id: "tomorrow-2pm", label: "Tomorrow 2 PM", description: "Next day" },
];

const previousDeliveries = [
  { id: "pd1", from: "123 Main St", to: "456 Oak Ave", pkg: "Small Box", date: "3 days ago", price: "$12.48" },
  { id: "pd2", from: "Office", to: "Home", pkg: "Envelope", date: "Last week", price: "$5.99" },
  { id: "pd3", from: "Warehouse", to: "Client HQ", pkg: "Large Box", date: "2 weeks ago", price: "$28.50" },
  { id: "pd4", from: "Home", to: "Post Office", pkg: "Medium Box", date: "3 weeks ago", price: "$16.99" },
];

// Recurring delivery schedules
const recurringOptions = [
  { id: "none", label: "One-time", description: "Single delivery" },
  { id: "daily", label: "Daily", description: "Same time every day" },
  { id: "weekly", label: "Weekly", description: "Same day each week" },
  { id: "biweekly", label: "Bi-weekly", description: "Every 2 weeks" },
  { id: "monthly", label: "Monthly", description: "Once a month" },
];

// Live delivery tracking timeline
function DeliveryTrackingTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setActiveStep(1), 2000),
      setTimeout(() => setActiveStep(2), 5000),
      setTimeout(() => setActiveStep(3), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { label: "Order confirmed", icon: CheckCircle, time: "Just now" },
    { label: "Finding courier", icon: Navigation, time: "~2 min" },
    { label: "Courier en route to pickup", icon: Truck, time: "~10 min" },
    { label: "Package picked up & delivering", icon: Package, time: "~30 min" },
  ];

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isDone = i <= activeStep;
        const isActive = i === activeStep;
        return (
          <motion.div key={s.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
            className={cn("flex items-center gap-3 p-2.5 rounded-xl", isDone ? "opacity-100" : "opacity-40")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              isDone ? "bg-violet-500/10" : "bg-muted/30")}>
              <Icon className={cn("w-4 h-4", isDone ? "text-violet-500" : "text-muted-foreground", isActive && "animate-pulse")} />
            </div>
            <div className="flex-1">
              <p className={cn("text-xs font-bold", isDone ? "text-foreground" : "text-muted-foreground")}>{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.time}</p>
            </div>
            {isDone && i < activeStep && <CheckCircle className="w-3.5 h-3.5 text-foreground" />}
            {isActive && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </motion.div>
        );
      })}
    </div>
  );
}

// Courier preview card
function CourierPreviewCard() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 3000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border p-4 space-y-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-foreground bg-secondary">J</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Jamie R.</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 4.95 · 1,204 deliveries
          </div>
        </div>
        <span className="text-[10px] font-bold text-foreground bg-secondary px-2 py-1 rounded-full animate-pulse">Assigning...</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">On-time</p>
          <p className="text-xs font-bold text-foreground">98%</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">Careful</p>
          <p className="text-xs font-bold text-foreground flex items-center justify-center gap-0.5"><ThumbsUp className="w-3 h-3 text-emerald-500" /> 99%</p>
        </div>
      </div>
    </motion.div>
  );
}

function DeliveryRoutePreview() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_32%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))]">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[18%] top-[56%] h-3 w-3 rounded-full bg-foreground shadow-[0_0_0_8px_hsl(var(--foreground)/0.08)]" />
      <div className="absolute right-[18%] top-[32%] h-3 w-3 rounded-full bg-primary shadow-[0_0_0_8px_hsl(var(--primary)/0.12)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 20 58 C 34 38, 54 76, 80 34" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="5 4" opacity="0.85" />
      </svg>
      <div className="absolute left-[46%] top-[43%] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-lg">
        <Truck className="h-5 w-5 text-foreground" />
      </div>
      <div className="absolute left-4 right-4 top-[calc(var(--zivo-safe-top,0px)+3.75rem)] rounded-2xl border border-border/60 bg-background/88 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">Delivery route preview</p>
            <p className="truncate text-[11px] text-muted-foreground">Enter pickup and dropoff to estimate courier timing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Price estimate preview
function PriceEstimate({ basePrice, speed, fragile, signature, insurance, packages, promo }: {
  basePrice: number; speed: number; fragile: boolean; signature: boolean; insurance: boolean; packages: number; promo: boolean;
}) {
  const total = (basePrice * packages * speed) + (fragile ? 2.99 : 0) + (signature ? 1.99 : 0) + (insurance ? 1.99 * packages : 0);
  const discount = promo ? total * 0.1 : 0;
  const final = total - discount;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-xl bg-secondary border border-border p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-foreground" />
        <span className="text-xs font-bold text-foreground">Estimated total</span>
      </div>
      <span className="text-base font-bold text-foreground">${final.toFixed(2)}</span>
    </motion.div>
  );
}

export default function DeliveryPage() {
  const navigate = useNavigate();
  const { notify: notifyEats } = useEatsNotifications();
  const { user } = useAuth();
  const [step, setStep] = useState<"address" | "package" | "review" | "confirmation">("address");

  // Address
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhoneOld, setRecipientPhoneOld] = useState("");
  const [notifyRecipientOld, setNotifyRecipientOld] = useState(true);
  const [showPreviousDeliveries, setShowPreviousDeliveries] = useState(false);

  // Package
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState("standard");
  const [packageDescription, setPackageDescription] = useState("");
  const [isFragile, setIsFragile] = useState(false);
  const [requireSignature, setRequireSignature] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("now");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [includeInsurance, setIncludeInsurance] = useState(true);
  const [packageWeight, setPackageWeight] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [packageCount, setPackageCount] = useState(1);
  const [priorityHandling, setPriorityHandling] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [rateDelivery, setRateDelivery] = useState<number | null>(null);
  const [returnShipping, setReturnShipping] = useState(false);
  const [declaredValueOld, setDeclaredValueOld] = useState("");
  const [temperatureSensitive, setTemperatureSensitive] = useState(false);
  const [businessAccount, setBusinessAccount] = useState(false);
  const [multiStop, setMultiStop] = useState(false);
  const [additionalStops, setAdditionalStops] = useState<string[]>([]);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [selectedInsuranceTier, setSelectedInsuranceTier] = useState("basic");
  const [recurringSchedule, setRecurringSchedule] = useState("none");
  const [requirePhotoId, setRequirePhotoId] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("standard");
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [carbonNeutral, setCarbonNeutral] = useState(false);
  const [deliveryWindow, setDeliveryWindow] = useState("anytime");
  const [batchMode, setBatchMode] = useState(false);
  const [batchPackages, setBatchPackages] = useState<Array<{size: string; weight: string}>>([]);
  const [deliveryProofRequired, setDeliveryProofRequired] = useState(false);
  const [qrTracking, setQrTracking] = useState(true);
  const [customsDeclaration, setCustomsDeclaration] = useState(false);
  const [contentDescription, setContentDescription] = useState("");
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [signatureType, setSignatureType] = useState<"any" | "recipient" | "adult">("any");
  const [showDeliveryAnalytics, setShowDeliveryAnalytics] = useState(false);
  const [deliveryCount] = useState(12);
  const [avgDeliveryTime] = useState("2.4 hrs");
  const [onTimeRate] = useState(96);
  const [packageDimensions, setPackageDimensions] = useState({ length: "", width: "", height: "" });
  const [whiteGloveService, setWhiteGloveService] = useState(false);
  const [slaGuarantee, setSlaGuarantee] = useState(false);
  const [senderVerification, setSenderVerification] = useState(false);
  const [showShipmentComparison, setShowShipmentComparison] = useState(false);
  const [specialHandling, setSpecialHandling] = useState<"none" | "top-load" | "keep-dry" | "this-side-up">("none");
  const [deliveryAttempts, setDeliveryAttempts] = useState(1);
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState(false);
  const [neighborDelivery, setNeighborDelivery] = useState(false);
  const [packageTrackerShared, setPackageTrackerShared] = useState(false);
  const [deliveryRating] = useState(4.8);
  const [totalShipments] = useState(47);
  const [smartRouting, setSmartRouting] = useState(false);
  const [packageLocker, setPackageLocker] = useState(false);
  const [lockerLocation, setLockerLocation] = useState("");
  const [deliveryCalendar, setDeliveryCalendar] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [tempControl, setTempControl] = useState<"none" | "cold" | "frozen" | "warm">("none");
  const [multiAddress, setMultiAddress] = useState(false);
  const [extraAddresses, setExtraAddresses] = useState<string[]>([""]);
  const [packageContents, setPackageContents] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [returnLabel, setReturnLabel] = useState(false);
  const [showTrackingPreview, setShowTrackingPreview] = useState(false);
  const [notifyRecipient, setNotifyRecipient] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);
  const { data: pastDeliveries = [] } = useQuery({
    queryKey: ["past-deliveries", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("id, dropoff_location, status, created_at")
        .eq("customer_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []).map((d: any) => ({
        id: d.id,
        to: (d.dropoff_location as any)?.address ?? "—",
        status: d.status === "delivered" ? "Delivered" : d.status === "pending" ? "Pending" : d.status ?? "—",
        date: d.created_at ? new Date(d.created_at).toLocaleDateString() : "—",
        tracking: d.id.slice(0, 8).toUpperCase(),
      }));
    },
  });
  const [expressPickup, setExpressPickup] = useState(false);
  const [holdAtFacility, setHoldAtFacility] = useState(false);
  const [saturdayDelivery, setSaturdayDelivery] = useState(false);
  const [hazmatDeclare, setHazmatDeclare] = useState(false);

  // === NEW: Roadie-inspired features ===
  const [peerDelivery, setPeerDelivery] = useState(false);
  const [showDriverBids, setShowDriverBids] = useState(false);
  const [driverBids] = useState<Array<{ id: string; name: string; rating: number; vehicle: string; price: number; eta: string; trips: number }>>([]);
  const [selectedBid, setSelectedBid] = useState<string | null>(null);
  const [vehicleTypeForDelivery, setVehicleTypeForDelivery] = useState<"any" | "sedan" | "suv" | "truck" | "van">("any");
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [communityDriverRating, setCommunityDriverRating] = useState(true);
  const [largeItemDelivery, setLargeItemDelivery] = useState(false);
  const [assemblyRequired, setAssemblyRequired] = useState(false);
  const [twoPersonLift, setTwoPersonLift] = useState(false);
  const [stairDelivery, setStairDelivery] = useState(false);
  const [floorNumber, setFloorNumber] = useState("");
  const [curbsideOnly, setCurbsideOnly] = useState(false);
  const [deliveryBudget, setDeliveryBudget] = useState("");
  const [showPriceNegotiation, setShowPriceNegotiation] = useState(false);
  const [bidExpiry] = useState(15);
  const [showItemMarketplace, setShowItemMarketplace] = useState(false);
  const [returnPickup, setReturnPickup] = useState(false);
  const [specialVehicleNeeded, setSpecialVehicleNeeded] = useState(false);
  const [showDeliveryBudgetCalc, setShowDeliveryBudgetCalc] = useState(false);
  const [scheduledPickupWindow, setScheduledPickupWindow] = useState<"flexible" | "morning" | "afternoon" | "evening">("flexible");
  const [backgroundCheckedDriver, setBackgroundCheckedDriver] = useState(true);
  const [photoOnPickup, setPhotoOnPickup] = useState(true);
  const [photoOnDelivery, setPhotoOnDeliveryNew] = useState(true);

  // === WAVE 3: Analytics & Smart Shipping ===
  const [showShippingAnalytics, setShowShippingAnalytics] = useState(false);
  const [showBulkDiscounts, setShowBulkDiscounts] = useState(false);
  const [showShippingCalendar, setShowShippingCalendar] = useState(false);
  const [showCarrierComparison, setShowCarrierComparison] = useState(false);
  const [showPackagingGuide, setShowPackagingGuide] = useState(false);
  const [showDeliveryZones, setShowDeliveryZones] = useState(false);

  // Shipping analytics
  const shippingAnalytics = {
    totalShipments: 47,
    avgDeliveryTime: "2.4 hrs",
    onTimeRate: 96,
    avgCost: "$14.20",
    monthlySpend: [
      { month: "Oct", amount: 89 },
      { month: "Nov", amount: 134 },
      { month: "Dec", amount: 212 },
      { month: "Jan", amount: 98 },
      { month: "Feb", amount: 76 },
    ],
    topDestinations: ["Downtown", "Airport", "Warehouse District"],
  };

  // Bulk discounts
  const bulkDiscountTiers = [
    { qty: "1-4", discount: "0%", perPkg: "$14.99", label: "Standard" },
    { qty: "5-9", discount: "10%", perPkg: "$13.49", label: "Bronze" },
    { qty: "10-24", discount: "20%", perPkg: "$11.99", label: "Silver" },
    { qty: "25+", discount: "30%", perPkg: "$10.49", label: "Gold" },
  ];

  // Carrier comparison
  const carrierOptions = [
    { name: "ZIVO Express", time: "1-2 hrs", price: "$14.99", rating: 4.8, tracking: true, insurance: true },
    { name: "ZIVO Standard", time: "2-4 hrs", price: "$8.99", rating: 4.6, tracking: true, insurance: false },
    { name: "ZIVO Overnight", time: "Next AM", price: "$19.99", rating: 4.9, tracking: true, insurance: true },
    { name: "Peer Delivery", time: "1-3 hrs", price: "$12.99", rating: 4.5, tracking: true, insurance: false },
  ];

  // Packaging guide
  const packagingTips = [
    { item: "Electronics", tip: "Double box with 2\" foam padding", icon: "📱" },
    { item: "Fragile items", tip: "Wrap individually, fill all gaps", icon: "🏺" },
    { item: "Documents", tip: "Use rigid mailer, mark 'Do Not Bend'", icon: "📄" },
    { item: "Perishables", tip: "Insulated box + ice packs required", icon: "🧊" },
  ];

  // Delivery zones
  const deliveryZones = [
    { zone: "Zone 1 (0-5 mi)", time: "30-60 min", baseFee: "$5.99", color: "text-emerald-500" },
    { zone: "Zone 2 (5-15 mi)", time: "1-2 hrs", baseFee: "$8.99", color: "text-sky-500" },
    { zone: "Zone 3 (15-30 mi)", time: "2-4 hrs", baseFee: "$14.99", color: "text-amber-500" },
    { zone: "Zone 4 (30+ mi)", time: "Same day", baseFee: "$24.99", color: "text-violet-500" },
  ];

  const trackingId = `ZD-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  const currentSize = packageSizes.find(s => s.id === selectedSize);
  const currentSpeed = deliverySpeed.find(s => s.id === selectedSpeed);
  const basePrice = (currentSize?.price ?? 0) * packageCount;
  const speedMultiplier = currentSpeed?.multiplier ?? 1;
  const fragileFee = isFragile ? 2.99 : 0;
  const signatureFee = requireSignature ? 1.99 : 0;
  const insuranceFee = includeInsurance ? 1.99 * packageCount : 0;
  const priorityFee = priorityHandling ? 4.99 : 0;
  const subtotal = basePrice * speedMultiplier + fragileFee + signatureFee + insuranceFee + priorityFee;
  const promoDiscount = promoApplied ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
  const totalPrice = Math.round((subtotal - promoDiscount) * 100) / 100;

  const steps = ["address", "package", "review"] as const;
  const stepLabels = ["Route", "Package", "Review"];
  const currentStepIndex = step === "confirmation" ? 3 : steps.indexOf(step as any);

  const handleBack = () => {
    if (step === "confirmation") navigate("/");
    else if (step === "review") setStep("package");
    else if (step === "package") setStep("address");
    else navigate(-1);
  };

  const handleContinueToPackage = () => {
    if (!pickupAddress.trim()) { toast.error("Enter pickup address"); return; }
    if (!dropoffAddress.trim()) { toast.error("Enter delivery address"); return; }
    if (!recipientName.trim()) { toast.error("Enter recipient name"); return; }
    if (!recipientPhone.trim()) { toast.error("Enter recipient phone"); return; }
    setStep("package");
  };

  const handleContinueToReview = () => {
    if (!selectedSize) { toast.error("Select a package size"); return; }
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    if (!user) { toast.error("Please sign in to place a delivery"); return; }
    try {
      const { data: inserted, error } = await supabase
        .from("deliveries")
        .insert({
          customer_user_id: user.id,
          pickup_location: { address: pickupAddress, name: senderName, phone: senderPhone },
          dropoff_location: { address: dropoffAddress, name: recipientName, phone: recipientPhone },
          delivery_fee: totalPrice,
          status: "requested",
          package_size: selectedSize ?? null,
          notes: deliveryNote || packageDescription || null,
          notify_recipient: notifyRecipient,
        })
        .select("id")
        .single();
      if (error) throw error;
      notifyEats("order_placed");
      if (inserted?.id) navigate(`/delivery/track/${inserted.id}`);
      else setStep("confirmation");
    } catch {
      toast.error("Failed to place order. Please try again.");
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "DELIVER15") {
      setPromoApplied(true);
      toast.success("15% off applied!");
    } else {
      toast.error("Invalid promo code");
    }
  };

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingId);
    toast.success("Tracking ID copied!");
  };

  const handleShareTracking = () => {
    if (navigator.share) {
      navigator.share({ title: "ZIVO Delivery", text: `Track my package: ${trackingId}`, url: `${getPublicOrigin()}/delivery/track/${trackingId}` });
    } else {
      handleCopyTracking();
    }
  };

  const handleLoadPrevious = (d: typeof previousDeliveries[0]) => {
    setPickupAddress(d.from);
    setDropoffAddress(d.to);
    toast.success("Previous route loaded");
  };

  const handlePhotoUpload = () => {
    setPhotoAdded(true);
    toast.success("Photo added to package");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Package Delivery – ZIVO | Same-Day & Scheduled Delivery"
        description="Send packages across town or schedule a delivery with ZIVO. Real-time tracking, secure delivery, and fast couriers available 24/7."
        canonical="/delivery"
        ogImage="/og-delivery.jpg"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": "ZIVO Package Delivery",
          "description": "Same-day and scheduled package delivery service",
          "provider": { "@type": "Organization", "name": "ZIVO" },
          "areaServed": "Worldwide",
          "serviceType": "Package Delivery",
        }}
      />
      {/* Map Preview */}
      {step === "address" && (
        <div className="relative h-[25vh] min-h-[180px]">
          <DeliveryRoutePreview />
          <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-3 safe-area-top">
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
              className="h-10 px-4 rounded-full bg-card/90 backdrop-blur-lg border border-border/40 flex items-center gap-2 touch-manipulation text-sm font-medium text-foreground shadow-lg">
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Header */}
      {step !== "address" && step !== "confirmation" && (
        <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/30">
          <div className="px-4 py-3 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary">
                <Package className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-base font-bold text-ig-gradient">Send a Package</h1>
                <p className="text-[10px] text-muted-foreground">Fast & reliable delivery</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      {step !== "confirmation" && (
        <div className="px-4 pt-4 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300",
                    i <= currentStepIndex
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-primary-foreground shadow-md shadow-violet-500/20"
                      : "bg-muted/50 text-muted-foreground border border-border/40"
                  )}>
                    {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={cn("text-[10px] font-bold", i <= currentStepIndex ? "text-violet-500" : "text-muted-foreground/50")}>
                    {stepLabels[i]}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-[2px] flex-1 rounded-full transition-all duration-300 -mt-5", i < currentStepIndex ? "bg-violet-500" : "bg-border/40")} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-5 max-w-lg mx-auto w-full pb-28">
        <AnimatePresence mode="wait">
          {/* ADDRESS STEP */}
          {step === "address" && (
            <motion.div key="address" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 -mt-4">
              <h2 className="text-xl font-bold text-foreground">Where to deliver?</h2>

              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border-2 border-border bg-secondary shrink-0" />
                  <Input placeholder="Pickup address" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className="h-11 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 shadow-none" />
                </div>
                <div className="ml-1.5 border-l-2 border-dashed border-border/40 h-3" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-orange-500/20 shrink-0" />
                  <Input placeholder="Delivery address" value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} className="h-11 border-0 bg-transparent px-0 text-sm font-medium focus-visible:ring-0 shadow-none" />
                </div>
              </div>

              {/* Previous deliveries */}
              <div className="space-y-2">
                <button type="button" onClick={() => setShowPreviousDeliveries(!showPreviousDeliveries)}
                  className="-ml-1 flex min-h-[44px] items-center gap-2 px-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
                  <History className="w-3.5 h-3.5" /> Recent Deliveries
                  <ChevronRight className={cn("w-3 h-3 transition-transform", showPreviousDeliveries && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {showPreviousDeliveries && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden">
                      {previousDeliveries.map(d => (
                        <button type="button" key={d.id} onClick={() => handleLoadPrevious(d)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 hover:border-border transition-all touch-manipulation active:scale-[0.98] text-left">
                          <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{d.from} → {d.to}</p>
                            <p className="text-[10px] text-muted-foreground">{d.date} · {d.pkg}</p>
                          </div>
                          <span className="text-xs font-bold text-foreground shrink-0">{d.price}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Phone className="w-4 h-4 text-foreground" /> Contact Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Sender name" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="h-12 rounded-xl" />
                  <Input placeholder="Sender phone" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="h-12 rounded-xl" type="tel" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="h-12 rounded-xl" />
                  <Input placeholder="Recipient phone" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="h-12 rounded-xl" type="tel" />
                </div>
              </div>

              {/* Notify recipient toggle */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" aria-label="Notify recipient" aria-pressed={notifyRecipient} onClick={() => setNotifyRecipient(!notifyRecipient)}
                  className={cn("relative h-11 w-14 rounded-full transition-all shrink-0 touch-manipulation", notifyRecipient ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-2.5 h-6 w-6 rounded-full bg-white shadow transition-all", notifyRecipient ? "left-[26px]" : "left-1.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-foreground" /> Notify recipient</p>
                  <p className="text-[10px] text-muted-foreground">Send SMS updates to recipient</p>
                </div>
              </div>

              <Button onClick={handleContinueToPackage} className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl hover:hover:text-primary-foreground shadow-lg active:scale-[0.98] transition-all bg-foreground" size="lg">
                Continue <Zap className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* PACKAGE STEP */}
          {step === "package" && (
            <motion.div key="package" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Package Details</h2>

              {/* Package count */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Number of Packages</h3>
                    <p className="text-[10px] text-muted-foreground">Same size & destination</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPackageCount(Math.max(1, packageCount - 1))}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold touch-manipulation active:scale-90">−</button>
                    <span className="text-lg font-bold w-6 text-center">{packageCount}</span>
                    <button type="button" onClick={() => setPackageCount(Math.min(10, packageCount + 1))}
                      className="w-8 h-8 rounded-full bg-foreground text-primary-foreground flex items-center justify-center font-bold touch-manipulation active:scale-90">+</button>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Box className="w-4 h-4 text-foreground" /> Package Size</h3>
                {packageSizes.map((size, i) => (
                  <motion.button key={size.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedSize(size.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all touch-manipulation active:scale-[0.98]",
                      selectedSize === size.id ? "border-violet-500 bg-violet-500/5 shadow-sm shadow-violet-500/10" : "border-border/40 bg-card hover:border-violet-500/20"
                    )}>
                    <span className="text-2xl">{size.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-foreground">{size.name}</p>
                      <p className="text-xs text-muted-foreground">{size.description} · Up to {size.maxWeight}</p>
                    </div>
                    <span className={cn("font-bold", selectedSize === size.id ? "text-violet-500" : "text-foreground")}>${size.price.toFixed(2)}{packageCount > 1 && <span className="text-[10px] text-muted-foreground"> ×{packageCount}</span>}</span>
                  </motion.button>
                ))}
              </div>

              {/* Speed */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-foreground" /> Delivery Speed</h3>
                <div className="grid grid-cols-2 gap-2">
                  {deliverySpeed.map(speed => {
                    const Icon = speed.icon;
                    return (
                      <button type="button" key={speed.id} onClick={() => setSelectedSpeed(speed.id)}
                        className={cn(
                          "p-3 rounded-xl border text-center transition-all touch-manipulation active:scale-95",
                          selectedSpeed === speed.id ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card hover:border-violet-500/20"
                        )}>
                        <Icon className={cn("w-4 h-4 mx-auto mb-1", selectedSpeed === speed.id ? "text-violet-500" : "text-muted-foreground")} />
                        <p className="font-bold text-xs text-foreground">{speed.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{speed.time}</p>
                        {speed.badge && <span className="text-[9px] font-bold text-foreground mt-1 inline-block">{speed.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-foreground" /> Schedule Delivery</h3>
                <div className="grid grid-cols-2 gap-2">
                  {scheduleTimes.map(time => (
                    <button type="button" key={time.id} onClick={() => setScheduledTime(time.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all touch-manipulation active:scale-95",
                        scheduledTime === time.id ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card hover:border-violet-500/20"
                      )}>
                      <p className="font-bold text-xs text-foreground">{time.label}</p>
                      <p className="text-[10px] text-muted-foreground">{time.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Special handling toggles */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-foreground" /> Special Handling</h3>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsFragile(!isFragile)}
                    className={cn(
                      "flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all touch-manipulation active:scale-95",
                      isFragile ? "border-amber-500 bg-amber-500/5" : "border-border/40 bg-card"
                    )}>
                    <AlertTriangle className={cn("w-4 h-4", isFragile ? "text-amber-500" : "text-muted-foreground")} />
                    <div className="text-left">
                      <p className="font-bold text-xs">Fragile</p>
                      <p className="text-[10px] text-muted-foreground">+$2.99</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => setRequireSignature(!requireSignature)}
                    className={cn(
                      "flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all touch-manipulation active:scale-95",
                      requireSignature ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card"
                    )}>
                    <CheckCircle className={cn("w-4 h-4", requireSignature ? "text-violet-500" : "text-muted-foreground")} />
                    <div className="text-left">
                      <p className="font-bold text-xs">Signature</p>
                      <p className="text-[10px] text-muted-foreground">+$1.99</p>
                    </div>
                  </button>
                </div>
                {/* Priority handling */}
                <button type="button" onClick={() => setPriorityHandling(!priorityHandling)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all touch-manipulation active:scale-95",
                    priorityHandling ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card"
                  )}>
                  <Award className={cn("w-4 h-4", priorityHandling ? "text-violet-500" : "text-muted-foreground")} />
                  <div className="text-left flex-1">
                    <p className="font-bold text-xs">Priority Handling</p>
                    <p className="text-[10px] text-muted-foreground">Dedicated courier, real-time updates · +$4.99</p>
                  </div>
                  <div className={cn("w-10 h-6 rounded-full transition-all relative", priorityHandling ? "bg-violet-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", priorityHandling ? "left-[18px]" : "left-0.5")} />
                  </div>
                </button>
              </div>

              {/* Description, weight, photo, note */}
              <div className="space-y-3">
                <Input placeholder="What's inside? (optional)" value={packageDescription} onChange={(e) => setPackageDescription(e.target.value)} className="h-12 rounded-xl" />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Weight (lbs)" type="number" value={packageWeight} onChange={(e) => setPackageWeight(e.target.value)} className="h-12 rounded-xl pl-10" />
                  </div>
                  <button type="button" onClick={handlePhotoUpload}
                    className={cn("h-12 px-4 rounded-xl border flex items-center gap-2 text-xs font-medium touch-manipulation active:scale-95 transition-all",
                      photoAdded ? "border-violet-500 bg-violet-500/5 text-violet-500" : "border-dashed border-border/60 bg-card text-muted-foreground hover:border-violet-500/40 hover:text-violet-500"
                    )}>
                    <Camera className="w-4 h-4" /> {photoAdded ? "Photo ✓" : "Add Photo"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input placeholder="Delivery instructions (e.g., leave at door)" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} className="h-10 rounded-xl text-sm" />
                </div>
              </div>

              {/* Insurance toggle */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setIncludeInsurance(!includeInsurance)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", includeInsurance ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", includeInsurance ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-foreground" /> Package Insurance</p>
                  <p className="text-[10px] text-muted-foreground">Cover up to $500 for +$1.99{packageCount > 1 ? `/pkg` : ""}</p>
                </div>
              </div>

              {/* Return Shipping */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setReturnShipping(!returnShipping)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", returnShipping ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", returnShipping ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-foreground" /> Return shipping label</p>
                  <p className="text-[10px] text-muted-foreground">Include prepaid return label · +$3.99</p>
                </div>
              </div>

              {/* Temperature Sensitive */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setTemperatureSensitive(!temperatureSensitive)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", temperatureSensitive ? "bg-amber-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", temperatureSensitive ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Temperature sensitive</p>
                  <p className="text-[10px] text-muted-foreground">Keep cool/frozen during transit · +$4.99</p>
                </div>
              </div>

              {/* Declared Value */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-foreground" /> Declared value (optional)</p>
                <Input placeholder="Enter package value in USD" type="number" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} className="h-10 rounded-xl text-sm" />
                <p className="text-[10px] text-muted-foreground">Higher declared value may increase insurance coverage</p>
              </div>

              {/* Multi-Stop Delivery */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setMultiStop(!multiStop)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", multiStop ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", multiStop ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-foreground" /> Multi-stop delivery</p>
                  <p className="text-[10px] text-muted-foreground">Add multiple drop-off locations</p>
                </div>
              </div>
              <AnimatePresence>
                {multiStop && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden">
                    {additionalStops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Input placeholder={`Stop ${i + 2} address`} value={stop}
                          onChange={(e) => setAdditionalStops(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                          className="h-10 rounded-xl text-sm flex-1" />
                        <button type="button" onClick={() => setAdditionalStops(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-destructive hover:text-destructive/80 touch-manipulation active:scale-90">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setAdditionalStops(prev => [...prev, ""])}
                      className="w-full rounded-xl text-xs font-bold gap-1.5" disabled={additionalStops.length >= 4}>
                      <Plus className="w-3.5 h-3.5" /> Add stop ({additionalStops.length}/4)
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Updates Toggle */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setLiveUpdates(!liveUpdates)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", liveUpdates ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", liveUpdates ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-foreground" /> Live tracking updates</p>
                  <p className="text-[10px] text-muted-foreground">Real-time SMS & push notifications</p>
                </div>
              </div>

              {/* Business Account Banner */}
              <button type="button" onClick={() => { setBusinessAccount(!businessAccount); toast.info(businessAccount ? "Switched to personal" : "Business receipts enabled"); }}
                className="w-full rounded-2xl border border-border p-3 flex items-center gap-3 touch-manipulation active:scale-[0.98] transition-all bg-secondary">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-secondary">
                  <Award className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-foreground">{businessAccount ? "Business Account ✓" : "Business Account"}</p>
                  <p className="text-[10px] text-muted-foreground">Get itemized receipts & tax invoices</p>
                </div>
                <div className={cn("w-10 h-6 rounded-full transition-all relative", businessAccount ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", businessAccount ? "left-[18px]" : "left-0.5")} />
                </div>
              </button>

              {/* Insurance tiers */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Insurance Coverage
                </h3>
                <div className="space-y-2">
                  {insuranceTiers.map(tier => (
                    <button type="button" key={tier.id} onClick={() => setSelectedInsuranceTier(tier.id)}
                      className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all touch-manipulation active:scale-[0.98]",
                        selectedInsuranceTier === tier.id ? "bg-violet-500/10 border border-violet-500/30" : "bg-muted/30 border border-border/30")}>
                      <div>
                        <span className="text-xs font-bold text-foreground">{tier.label}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{tier.coverage}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{tier.cost === 0 ? "Free" : `+$${tier.cost.toFixed(2)}`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurring delivery */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Delivery Schedule
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {recurringOptions.map(opt => (
                    <button type="button" key={opt.id} onClick={() => setRecurringSchedule(opt.id)}
                      className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                        recurringSchedule === opt.id ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {recurringSchedule !== "none" && (
                  <p className="text-[10px] text-foreground mt-2 font-medium">📅 {recurringOptions.find(o => o.id === recurringSchedule)?.description}</p>
                )}
              </div>

              {/* Require Photo ID */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setRequirePhotoId(!requirePhotoId)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", requirePhotoId ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", requirePhotoId ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-foreground" /> Require photo ID on delivery</p>
                  <p className="text-[10px] text-muted-foreground">Recipient must show valid ID · +$1.99</p>
                </div>
              </div>

              {/* Gift Wrapping */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setGiftWrapping(!giftWrapping)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", giftWrapping ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", giftWrapping ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-foreground" /> Gift wrapping</p>
                  <p className="text-[10px] text-muted-foreground">Premium gift wrap & card · +$3.99</p>
                </div>
              </div>

              {/* Carbon Neutral */}

              {/* === ROADIE-INSPIRED FEATURES === */}

              {/* Peer Delivery / Driver Bids */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setPeerDelivery(!peerDelivery); if (!peerDelivery) { setShowDriverBids(true); toast.info("🚗 Finding nearby drivers for your delivery..."); } }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", peerDelivery ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", peerDelivery ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-foreground" /> Peer Delivery (Roadie-style)</p>
                  <p className="text-[10px] text-muted-foreground">Match with nearby drivers already going your way</p>
                </div>
              </div>

              {/* Driver Bids */}
              <AnimatePresence>
                {peerDelivery && showDriverBids && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">🚗 Driver Offers ({driverBids.length})</p>
                      <span className="text-[10px] text-amber-500 font-bold animate-pulse">Expires in {bidExpiry} min</span>
                    </div>
                    {driverBids.length === 0 && (
                      <div className="rounded-xl bg-muted/30 border border-border/30 p-4 text-center">
                        <p className="text-xs text-muted-foreground">Waiting for nearby drivers to bid…</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">First offers usually arrive within a few minutes.</p>
                      </div>
                    )}
                    {driverBids.map(bid => (
                      <button type="button" key={bid.id} onClick={() => { setSelectedBid(bid.id); toast.success(`Selected ${bid.name}'s offer!`); }}
                        className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all touch-manipulation active:scale-[0.98] text-left",
                          selectedBid === bid.id ? "border-violet-500 bg-violet-500/5" : "border-border/40 bg-card")}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-foreground bg-secondary">
                          {bid.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{bid.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {bid.rating}</span>
                            <span>· {bid.vehicle}</span>
                            <span>· {bid.trips} trips</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">${bid.price.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">{bid.eta}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vehicle Type for Delivery (Roadie) */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Truck className="w-3.5 h-3.5 text-foreground" /> Vehicle Type Needed</p>
                <div className="flex gap-2 flex-wrap">
                  {(["any", "sedan", "suv", "truck", "van"] as const).map(v => (
                    <button type="button" key={v} onClick={() => setVehicleTypeForDelivery(v)}
                      className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95 capitalize",
                        vehicleTypeForDelivery === v ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {v === "any" ? "🚗 Any" : v === "sedan" ? "🚙 Sedan" : v === "suv" ? "🚐 SUV" : v === "truck" ? "🛻 Truck" : "🚐 Van"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Large Item Options (Roadie) */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setLargeItemDelivery(!largeItemDelivery); if (!largeItemDelivery) toast.info("📦 Large item mode — we'll match you with drivers who can handle big deliveries"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", largeItemDelivery ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", largeItemDelivery ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">📦 Large / Heavy Item</p>
                  <p className="text-[10px] text-muted-foreground">Furniture, appliances, bulky items</p>
                </div>
              </div>
              {largeItemDelivery && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTwoPersonLift(!twoPersonLift)}
                      className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                        twoPersonLift ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      👥 2-Person Lift (+$15)
                    </button>
                    <button type="button" onClick={() => setAssemblyRequired(!assemblyRequired)}
                      className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                        assemblyRequired ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      🔧 Assembly (+$25)
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStairDelivery(!stairDelivery)}
                      className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                        stairDelivery ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      🪜 Stair Delivery (+$10)
                    </button>
                    <button type="button" onClick={() => setCurbsideOnly(!curbsideOnly)}
                      className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                        curbsideOnly ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      🏠 Curbside Only (Free)
                    </button>
                  </div>
                  {stairDelivery && (
                    <Input placeholder="Floor number" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} className="h-10 rounded-xl text-sm" type="number" />
                  )}
                </motion.div>
              )}

              {/* Pickup Window (Roadie) */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Clock className="w-3.5 h-3.5 text-foreground" /> Pickup Window</p>
                <div className="flex gap-2 flex-wrap">
                  {(["flexible", "morning", "afternoon", "evening"] as const).map(w => (
                    <button type="button" key={w} onClick={() => setScheduledPickupWindow(w)}
                      className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95 capitalize",
                        scheduledPickupWindow === w ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {w === "flexible" ? "🕐 Flexible" : w === "morning" ? "🌅 Morning" : w === "afternoon" ? "☀️ Afternoon" : "🌙 Evening"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Verification (Roadie) */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2">
                <p className="text-xs font-bold text-foreground">📸 Photo Verification</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPhotoOnPickup(!photoOnPickup)}
                    className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                      photoOnPickup ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                    📷 Photo on Pickup
                  </button>
                  <button type="button" onClick={() => setPhotoOnDeliveryNew(!photoOnDelivery)}
                    className={cn("flex-1 p-2 rounded-xl text-[10px] font-bold text-center transition-all touch-manipulation",
                      photoOnDelivery ? "bg-violet-500/10 border border-violet-500/30 text-violet-500" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                    📷 Photo on Delivery
                  </button>
                </div>
              </div>

              {/* Background Checked Badge */}
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">Background-Checked Drivers</p>
                  <p className="text-[10px] text-muted-foreground">All ZIVO couriers pass background checks & vehicle inspections</p>
                </div>
              </div>

              {/* Package Dimensions */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Ruler className="w-3.5 h-3.5 text-foreground" /> Package Dimensions (optional)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Length</label>
                    <Input value={packageDimensions.length} onChange={e => setPackageDimensions(prev => ({...prev, length: e.target.value}))}
                      placeholder="in" className="h-8 text-xs mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Width</label>
                    <Input value={packageDimensions.width} onChange={e => setPackageDimensions(prev => ({...prev, width: e.target.value}))}
                      placeholder="in" className="h-8 text-xs mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase font-bold">Height</label>
                    <Input value={packageDimensions.height} onChange={e => setPackageDimensions(prev => ({...prev, height: e.target.value}))}
                      placeholder="in" className="h-8 text-xs mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Special Handling */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Special Handling</p>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: "none" as const, label: "None" },
                    { id: "top-load" as const, label: "⬆️ Top Load" },
                    { id: "keep-dry" as const, label: "💧 Keep Dry" },
                    { id: "this-side-up" as const, label: "📦 This Side Up" },
                  ]).map(h => (
                    <button type="button" key={h.id} onClick={() => setSpecialHandling(h.id)}
                      className={cn("px-3 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                        specialHandling === h.id ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* White Glove Service */}
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setWhiteGloveService(!whiteGloveService); if (!whiteGloveService) toast.success("🤵 White-glove service added — premium handling & setup!"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", whiteGloveService ? "bg-amber-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", whiteGloveService ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">🤵 White-glove service</p>
                  <p className="text-[10px] text-muted-foreground">Premium handling, unpacking & setup · +$19.99</p>
                </div>
              </div>

              {/* SLA Guarantee */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setSlaGuarantee(!slaGuarantee); if (!slaGuarantee) toast.info("✅ On-time guarantee — full refund if late!"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", slaGuarantee ? "bg-emerald-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", slaGuarantee ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> On-time guarantee</p>
                  <p className="text-[10px] text-muted-foreground">Full refund if delivery is late · +$2.99</p>
                </div>
              </div>

              {/* Leave at Door / Neighbor */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setLeaveAtDoor(!leaveAtDoor)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", leaveAtDoor ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", leaveAtDoor ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">🚪 Leave at door</p>
                  <p className="text-[10px] text-muted-foreground">Safe spot delivery with photo proof</p>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setNeighborDelivery(!neighborDelivery)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", neighborDelivery ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", neighborDelivery ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-foreground" /> Allow neighbor delivery</p>
                  <p className="text-[10px] text-muted-foreground">If not home, deliver to a neighbor</p>
                </div>
              </div>

              {/* Delivery Attempts */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><RefreshCw className="w-3.5 h-3.5 text-foreground" /> Delivery attempts</p>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button type="button" key={n} onClick={() => setDeliveryAttempts(n)}
                      className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation",
                        deliveryAttempts === n ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {n} {n === 1 ? "attempt" : "attempts"}
                    </button>
                  ))}
                </div>
                {deliveryAttempts > 1 && <p className="text-[10px] text-foreground mt-2 font-medium">+${((deliveryAttempts - 1) * 2.99).toFixed(2)} per additional attempt</p>}
              </div>

              {/* Shipment Stats */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <button type="button" onClick={() => setShowDeliveryAnalytics(!showDeliveryAnalytics)}
                  className="w-full flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-500" /> Your shipping stats</p>
                  <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showDeliveryAnalytics && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {showDeliveryAnalytics && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                          <p className="text-lg font-bold text-foreground">{totalShipments}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Shipments</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                          <p className="text-lg font-bold text-foreground">{avgDeliveryTime}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Avg Time</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                          <p className="text-lg font-bold text-emerald-500">{onTimeRate}%</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">On-Time</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 p-2.5 text-center">
                          <p className="text-lg font-bold text-amber-500">⭐ {deliveryRating}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Rating</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => setCarbonNeutral(!carbonNeutral)}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", carbonNeutral ? "bg-emerald-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", carbonNeutral ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-emerald-500" /> Carbon neutral delivery</p>
                  <p className="text-[10px] text-muted-foreground">Offset emissions · +$0.50</p>
                </div>
              </div>

              {/* Temperature Control */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2"><Thermometer className="w-3.5 h-3.5 text-foreground" /> Temperature control</p>
                <div className="flex gap-2">
                  {([
                    { id: "none" as const, label: "None" },
                    { id: "cold" as const, label: "❄️ Cold" },
                    { id: "frozen" as const, label: "🧊 Frozen" },
                    { id: "warm" as const, label: "🔥 Warm" },
                  ]).map(t => (
                    <button type="button" key={t.id} onClick={() => setTempControl(t.id)}
                      className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                        tempControl === t.id ? "bg-sky-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {tempControl !== "none" && <p className="text-[10px] text-foreground mt-2 font-medium">+$4.99 for temperature-controlled shipping</p>}
              </div>

              {/* Package Locker */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => setPackageLocker(!packageLocker)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", packageLocker ? "bg-violet-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", packageLocker ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><LockIcon className="w-3.5 h-3.5 text-foreground" /> Deliver to package locker</p>
                    <p className="text-[10px] text-muted-foreground">Secure pickup at your convenience</p>
                  </div>
                </div>
                {packageLocker && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                    <Input value={lockerLocation} onChange={e => setLockerLocation(e.target.value)} placeholder="Locker location or ID" className="h-9 text-xs" />
                  </motion.div>
                )}
              </div>

              {/* Multi-Address Delivery */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => setMultiAddress(!multiAddress)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", multiAddress ? "bg-violet-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", multiAddress ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-foreground" /> Multi-address delivery</p>
                    <p className="text-[10px] text-muted-foreground">Split package to multiple addresses</p>
                  </div>
                </div>
                {multiAddress && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                    {extraAddresses.map((addr, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-foreground shrink-0" />
                        <Input value={addr} onChange={(e) => { const na = [...extraAddresses]; na[i] = e.target.value; setExtraAddresses(na); }}
                          placeholder={`Address ${i + 2}`} className="h-9 text-xs flex-1" />
                      </div>
                    ))}
                    {extraAddresses.length < 4 && (
                      <button type="button" onClick={() => setExtraAddresses([...extraAddresses, ""])}
                        className="text-[10px] text-foreground font-bold flex items-center gap-1 touch-manipulation"><Plus className="w-3 h-3" /> Add address</button>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Notify Recipient */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" aria-label="Notify recipient" aria-pressed={notifyRecipient} onClick={() => setNotifyRecipient(!notifyRecipient)}
                    className={cn("relative h-11 w-14 rounded-full transition-all shrink-0 touch-manipulation", notifyRecipient ? "bg-violet-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-2.5 h-6 w-6 rounded-full bg-white shadow transition-all", notifyRecipient ? "left-[26px]" : "left-1.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-foreground" /> Notify recipient</p>
                    <p className="text-[10px] text-muted-foreground">Send tracking updates to the receiver</p>
                  </div>
                </div>
                {notifyRecipient && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                    <Input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="Recipient phone" className="h-9 text-xs" />
                    <Input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient email" className="h-9 text-xs" />
                  </motion.div>
                )}
              </div>

              {/* Return Label */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setReturnLabel(!returnLabel); if (!returnLabel) toast.info("📦 Return label will be included!"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", returnLabel ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", returnLabel ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5 text-foreground" /> Include return label</p>
                  <p className="text-[10px] text-muted-foreground">Prepaid return shipping · +$5.99</p>
                </div>
              </div>

              {/* Saturday Delivery & Express Pickup */}
              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setSaturdayDelivery(!saturdayDelivery); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", saturdayDelivery ? "bg-violet-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", saturdayDelivery ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-foreground" /> Saturday delivery</p>
                  <p className="text-[10px] text-muted-foreground">Deliver on weekends · +$3.99</p>
                </div>
              </div>

              <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                <button type="button" onClick={() => { setExpressPickup(!expressPickup); if (!expressPickup) toast.success("⚡ Express pickup — courier arrives in 15 min!"); }}
                  className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", expressPickup ? "bg-amber-500" : "bg-muted/60")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", expressPickup ? "left-[18px]" : "left-0.5")} />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Express pickup</p>
                  <p className="text-[10px] text-muted-foreground">Courier arrives in 15 min · +$4.99</p>
                </div>
              </div>

              {/* Past Deliveries */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <button type="button" onClick={() => setShowDeliveryHistory(!showDeliveryHistory)} className="w-full flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-foreground" /> Recent deliveries</p>
                  <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showDeliveryHistory && "rotate-90")} />
                </button>
                <AnimatePresence>
                  {showDeliveryHistory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="space-y-2 mt-3">
                        {pastDeliveries.length === 0 && (
                          <div className="rounded-xl bg-muted/30 p-4 text-center">
                            <p className="text-xs text-muted-foreground">No past deliveries yet.</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">Your delivery history will appear here.</p>
                          </div>
                        )}
                        {pastDeliveries.map(d => (
                          <div key={d.id} className="rounded-xl bg-muted/30 p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-foreground">{d.to}</p>
                                <p className="text-[10px] text-muted-foreground">{d.tracking} · {d.date}</p>
                              </div>
                              <Badge className={d.status === "Delivered" ? "bg-emerald-500/20 text-emerald-500" : "bg-sky-500/20 text-sky-500"}>
                                {d.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Delivery Window */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Preferred delivery window
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: "anytime", label: "Anytime" },
                    { id: "morning", label: "Morning (8-12)" },
                    { id: "afternoon", label: "Afternoon (12-5)" },
                    { id: "evening", label: "Evening (5-9)" },
                  ].map(w => (
                    <button type="button" key={w.id} onClick={() => setDeliveryWindow(w.id)}
                      className={cn("px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                        deliveryWindow === w.id ? "bg-violet-500 text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live price estimate */}
              {selectedSize && (
                <PriceEstimate basePrice={currentSize?.price ?? 0} speed={speedMultiplier} fragile={isFragile} signature={requireSignature} insurance={includeInsurance} packages={packageCount} promo={promoApplied} />
              )}

              <Button onClick={handleContinueToReview} disabled={!selectedSize} className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl hover:hover:text-primary-foreground shadow-lg active:scale-[0.98] transition-all bg-foreground" size="lg">
                Review Order <Zap className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {/* REVIEW STEP */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <h2 className="text-xl font-bold text-foreground">Review & Confirm</h2>

              {/* Route */}
              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <div className="w-3 h-3 rounded-full bg-foreground shadow-sm" />
                    <div className="w-0.5 h-10 bg-secondary" />
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Pickup</p>
                      <p className="text-sm font-bold text-foreground truncate">{pickupAddress}</p>
                      {senderName && <p className="text-xs text-muted-foreground">{senderName}{senderPhone ? ` · ${senderPhone}` : ""}</p>}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Delivery</p>
                      <p className="text-sm font-bold text-foreground truncate">{dropoffAddress}</p>
                      {recipientName && <p className="text-xs text-muted-foreground">{recipientName} · {recipientPhone}</p>}
                    </div>
                  </div>
                </div>
                {notifyRecipient && (
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-xs text-foreground">
                    <Bell className="w-3 h-3" /> Recipient will receive SMS updates
                  </div>
                )}
              </div>

              {/* Package info */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currentSize?.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{currentSize?.name}{packageCount > 1 ? ` × ${packageCount}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{currentSize?.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-foreground" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{currentSpeed?.name} Delivery</p>
                    <p className="text-xs text-muted-foreground">
                      {scheduledTime === "now" ? `Est. ${currentSpeed?.time}` : scheduleTimes.find(t => t.id === scheduledTime)?.label}
                    </p>
                  </div>
                </div>
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  {isFragile && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Fragile
                    </span>
                  )}
                  {requireSignature && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Signature
                    </span>
                  )}
                  {priorityHandling && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Award className="w-3 h-3" /> Priority
                    </span>
                  )}
                  {photoAdded && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Camera className="w-3 h-3" /> Photo
                    </span>
                  )}
                  {deliveryNote && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                      <MessageSquare className="w-3 h-3" /> Note
                    </span>
                  )}
                  {requirePhotoId && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Users className="w-3 h-3" /> Photo ID
                    </span>
                  )}
                  {giftWrapping && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Gift className="w-3 h-3" /> Gift Wrapped
                    </span>
                  )}
                  {carbonNeutral && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      <Zap className="w-3 h-3" /> Carbon Neutral
                    </span>
                  )}
                  {contactlessDelivery && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Shield className="w-3 h-3" /> Contactless
                    </span>
                  )}
                  {recurringSchedule !== "none" && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <RefreshCw className="w-3 h-3" /> {recurringSchedule}
                    </span>
                  )}
                  {packageCount > 1 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-foreground bg-secondary px-2.5 py-1 rounded-full">
                      <Package className="w-3 h-3" /> {packageCount} packages
                    </span>
                  )}
                </div>
              </div>

              {/* Promo code */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Gift className="w-3 h-3" /> Promo Code
                </h3>
                <div className="flex gap-2">
                  <Input placeholder="Enter code (try DELIVER15)" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied} className="h-10 rounded-xl flex-1 text-sm" />
                  <Button variant={promoApplied ? "outline" : "default"} size="sm" onClick={handleApplyPromo}
                    disabled={promoApplied || !promoCode.trim()} className="rounded-xl h-10 px-4 text-xs font-bold">
                    {promoApplied ? <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Applied</> : "Apply"}
                  </Button>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Base price ({currentSize?.name}{packageCount > 1 ? ` ×${packageCount}` : ""})</span><span className="font-bold">${basePrice.toFixed(2)}</span></div>
                {speedMultiplier !== 1 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">{currentSpeed?.name} speed ({speedMultiplier}x)</span><span className="font-bold">${(basePrice * speedMultiplier - basePrice).toFixed(2)}</span></div>
                )}
                {fragileFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Fragile handling</span><span className="font-bold">${fragileFee.toFixed(2)}</span></div>}
                {signatureFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Signature required</span><span className="font-bold">${signatureFee.toFixed(2)}</span></div>}
                {includeInsurance && <div className="flex justify-between"><span className="text-muted-foreground">Insurance{packageCount > 1 ? ` (×${packageCount})` : ""}</span><span className="font-bold">${insuranceFee.toFixed(2)}</span></div>}
                {priorityFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Priority handling</span><span className="font-bold">${priorityFee.toFixed(2)}</span></div>}
                {promoDiscount > 0 && <div className="flex justify-between text-foreground"><span className="font-bold flex items-center gap-1"><Tag className="w-3 h-3" /> DELIVER15</span><span className="font-bold">-${promoDiscount.toFixed(2)}</span></div>}
                <div className="flex justify-between pt-3 border-t border-border/30">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-xl text-foreground">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Shield className="w-3.5 h-3.5 text-foreground/60" />
                <span>{includeInsurance ? "Package insured up to $500" : "No insurance"} · Secured by ZIVO</span>
              </div>

              <Button onClick={handlePlaceOrder} className="w-full h-14 text-base font-bold gap-2.5 rounded-2xl hover:hover:text-primary-foreground shadow-lg active:scale-[0.98] transition-all bg-foreground" size="lg">
                <CheckCircle className="w-5 h-5" /> Confirm Delivery · ${totalPrice.toFixed(2)}
              </Button>
            </motion.div>
          )}

          {/* CONFIRMATION */}
          {step === "confirmation" && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="max-w-md w-full text-center space-y-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl bg-secondary">
                  <PartyPopper className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h1 className="text-2xl font-bold text-ig-gradient mb-2">Delivery Confirmed! 📦</h1>
                  <p className="text-muted-foreground">A courier will be assigned shortly.</p>
                  <button type="button" onClick={handleCopyTracking}
                    className="text-xs font-mono text-foreground/80 mt-2 bg-secondary px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 hover:bg-secondary transition-all touch-manipulation">
                    Tracking: {trackingId} <Copy className="w-3 h-3" />
                  </button>
                </motion.div>

                {/* Live tracking */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="rounded-2xl bg-card border border-border/40 p-4 text-left">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Navigation className="w-4 h-4 text-foreground" /> Live Tracking</h3>
                  <DeliveryTrackingTimeline />
                </motion.div>

                {/* Courier preview */}
                <CourierPreviewCard />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="rounded-2xl bg-card border border-border/40 p-5 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><Package className="w-5 h-5 text-foreground" /></div>
                    <div><p className="text-xs text-muted-foreground">{currentSize?.name}{packageCount > 1 ? ` × ${packageCount}` : ""}</p><p className="text-sm font-bold text-foreground">{packageDescription || "Package delivery"}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><Navigation className="w-5 h-5 text-orange-500" /></div>
                    <div><p className="text-xs text-muted-foreground">To</p><p className="text-sm font-bold text-foreground truncate">{recipientName} · {dropoffAddress}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-emerald-500" /></div>
                    <div><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-bold text-foreground">${totalPrice.toFixed(2)}</p></div>
                  </div>
                  {notifyRecipient && (
                    <div className="pt-2 border-t border-border/30 flex items-center gap-2 text-xs text-foreground">
                      <Bell className="w-3 h-3" /> Recipient notified via SMS
                    </div>
                  )}
                  <div className="pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Photo proof of delivery will appear here</span>
                    </div>
                  </div>
                </motion.div>

                {/* Rate delivery */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                  className="rounded-2xl bg-card border border-border/40 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Rate this delivery</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button type="button" key={s} onClick={() => { setRateDelivery(s); toast.success(`Rated ${s} stars!`); }}
                        className="touch-manipulation active:scale-90 transition-transform">
                        <Star className={cn("w-8 h-8 transition-all", rateDelivery && s <= rateDelivery ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-3">
                  <Button variant="outline" onClick={handleShareTracking} className="flex-1 h-12 rounded-xl font-bold gap-2">
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                  <Button onClick={() => navigate("/")} className="flex-1 h-12 rounded-xl font-bold text-primary-foreground gap-2 bg-foreground">
                    <Navigation className="w-4 h-4" /> Track Live
                  </Button>
                </motion.div>
                <Button variant="ghost" onClick={() => navigate("/")} className="text-sm text-muted-foreground">
                  Back to Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* === WAVE 3: Analytics & Smart Shipping (address step) === */}
      {step === "address" && (
        <div className="px-4 pb-4 space-y-3">
          {/* Shipping Analytics */}
          <button type="button" onClick={() => setShowShippingAnalytics(!showShippingAnalytics)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <BarChart3 className="w-3.5 h-3.5 text-foreground" /> Shipping Analytics
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showShippingAnalytics && "rotate-90")} />
          </button>
          {showShippingAnalytics && (
            <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl bg-muted/30"><p className="text-sm font-bold text-foreground">{shippingAnalytics.totalShipments}</p><p className="text-[9px] text-muted-foreground">Total</p></div>
                <div className="text-center p-2 rounded-xl bg-muted/30"><p className="text-sm font-bold text-foreground">{shippingAnalytics.avgDeliveryTime}</p><p className="text-[9px] text-muted-foreground">Avg time</p></div>
                <div className="text-center p-2 rounded-xl bg-emerald-500/10"><p className="text-sm font-bold text-emerald-500">{shippingAnalytics.onTimeRate}%</p><p className="text-[9px] text-muted-foreground">On-time</p></div>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {shippingAnalytics.monthlySpend.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(m.amount / 250) * 100}%` }} className="w-full rounded-t bg-secondary" />
                    <span className="text-[8px] text-muted-foreground">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Discounts */}
          <button type="button" onClick={() => setShowBulkDiscounts(!showBulkDiscounts)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <Percent className="w-3.5 h-3.5 text-emerald-500" /> Bulk Discounts
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showBulkDiscounts && "rotate-90")} />
          </button>
          {showBulkDiscounts && (
            <div className="grid grid-cols-2 gap-2">
              {bulkDiscountTiers.map(t => (
                <div key={t.qty} className="rounded-xl bg-card border border-border/40 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t.qty} packages</p>
                  <p className="text-sm font-bold text-emerald-500">{t.discount} off</p>
                  <p className="text-[10px] font-bold text-foreground">{t.perPkg}/pkg</p>
                  <Badge className="mt-1 bg-muted/50 text-muted-foreground border-0 text-[8px]">{t.label}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Carrier Comparison */}
          <button type="button" onClick={() => setShowCarrierComparison(!showCarrierComparison)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <Truck className="w-3.5 h-3.5 text-foreground" /> Compare Carriers
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showCarrierComparison && "rotate-90")} />
          </button>
          {showCarrierComparison && (
            <div className="space-y-2">
              {carrierOptions.map(c => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                  <div className="flex-1"><p className="text-xs font-bold text-foreground">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.time} · ★ {c.rating}</p></div>
                  <span className="text-sm font-bold text-foreground">{c.price}</span>
                </div>
              ))}
            </div>
          )}

          {/* Packaging Guide */}
          <button type="button" onClick={() => setShowPackagingGuide(!showPackagingGuide)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <Box className="w-3.5 h-3.5 text-amber-500" /> Packaging Guide
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showPackagingGuide && "rotate-90")} />
          </button>
          {showPackagingGuide && (
            <div className="space-y-2">
              {packagingTips.map(t => (
                <div key={t.item} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                  <span className="text-lg">{t.icon}</span>
                  <div><p className="text-xs font-bold text-foreground">{t.item}</p><p className="text-[10px] text-muted-foreground">{t.tip}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Delivery Zones */}
          <button type="button" onClick={() => setShowDeliveryZones(!showDeliveryZones)}
            className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation">
            <MapPin className="w-3.5 h-3.5 text-foreground" /> Delivery Zones & Pricing
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showDeliveryZones && "rotate-90")} />
          </button>
          {showDeliveryZones && (
            <div className="space-y-2">
              {deliveryZones.map(z => (
                <div key={z.zone} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                  <div className="flex-1"><p className={cn("text-xs font-bold", z.color)}>{z.zone}</p><p className="text-[10px] text-muted-foreground">{z.time}</p></div>
                  <span className="text-sm font-bold text-foreground">{z.baseFee}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step !== "confirmation" && <ZivoMobileNav />}
    </div>
  );
}
