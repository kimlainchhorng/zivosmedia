/**
 * GroceryCheckoutDrawer - 2026 Spatial UI Checkout (v4)
 * 2-step: Delivery Details → Review & Pay
 * Real-time ETA, substitution preferences, persistent profile
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Loader2, X, ShoppingCart, Truck, Shield, User, Phone,
  ChevronDown, Lock, CheckCircle, Package, Clock, Heart,
  CreditCard, Sparkles, Timer, BadgeCheck, ArrowRight, ArrowLeft,
  MessageSquare, DoorOpen, Star, Gift, RefreshCw, AlertTriangle,
  Banknote, QrCode,
} from "lucide-react";
import { Home, Building2, Bookmark, Trash2, Plus } from "lucide-react";
import { GroceryDeliveryScheduler, DEFAULT_SCHEDULER, getPriorityFee, type SchedulerState } from "@/components/grocery/GroceryDeliveryScheduler";
import { addLoyaltyPoints } from "@/components/grocery/GroceryLoyaltyBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GroceryCartItem } from "@/hooks/useGroceryCart";
import { GroceryPromoInput } from "@/components/grocery/GroceryPromoBanner";
import GroceryInlinePaymentForm from "@/components/grocery/GroceryInlinePaymentForm";
import { getLiveEta } from "@/utils/storeStatus";
import { GROCERY_STORES } from "@/config/groceryStores";
import { SERVICE_FEE_PCT, calcServiceFee, TIP_OPTIONS, calcDeliveryFee, calcMarkup, getMarkupPct } from "@/config/groceryPricing";
import { useCityPricing } from "@/hooks/useCityPricing";
import { getRoute, getPlaceDetails, forwardGeocode } from "@/services/mapsApi";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useI18n } from "@/hooks/useI18n";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useCountry } from "@/hooks/useCountry";
import { CheckoutPinMap } from "@/components/grocery/CheckoutPinMap";
import { CheckoutRouteMap } from "@/components/grocery/CheckoutRouteMap";
import { Link } from "react-router-dom";

export type StorePaymentType = "cash" | "card" | "aba" | "paypal" | "square";

interface SavedDeliveryAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
}

function getAllSavedAddresses(): SavedDeliveryAddress[] {
  try {
    const raw = localStorage.getItem("zivo_delivery_addresses");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function persistAddresses(addresses: SavedDeliveryAddress[]) {
  localStorage.setItem("zivo_delivery_addresses", JSON.stringify(addresses));
}

interface GroceryCheckoutDrawerProps {
  items: GroceryCartItem[];
  total: number;
  onClose: () => void;
  onOrderPlaced: (orderId: string) => void;
  onRemoveItem?: (productId: string) => void;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  storeCoords?: { lat: number; lng: number } | null;
  storeName?: string;
  storePaymentTypes?: StorePaymentType[];
}

interface GroceryRouteMetrics {
  distanceMiles: number;
  durationMinutes: number;
}

type SubstitutionPref = "contact_me" | "best_match" | "refund";

function getSavedAddress(): { address: string; label: string } | null {
  try {
    const selectedId = localStorage.getItem("zivo_selected_address");
    const addressesRaw = localStorage.getItem("zivo_delivery_addresses");
    if (addressesRaw) {
      const addresses = JSON.parse(addressesRaw);
      if (Array.isArray(addresses) && addresses.length > 0) {
        const match = selectedId
          ? addresses.find((a: any) => a.id === selectedId)
          : addresses.find((a: any) => a.isDefault) || addresses[0];
        if (match) return { address: match.address || "", label: match.label || "" };
      }
    }
  } catch {}
  return null;
}

function getSavedProfile(): { name: string; phone: string; subPref: SubstitutionPref } {
  try {
    const raw = localStorage.getItem("zivo_checkout_profile");
    if (raw) return { subPref: "contact_me", ...JSON.parse(raw) };
  } catch {}
  return { name: "", phone: "", subPref: "contact_me" };
}

export function GroceryCheckoutDrawer({ items, total, onClose, onOrderPlaced, onRemoveItem, onUpdateQuantity, storeCoords, storeName: storeNameProp, storePaymentTypes = ["cash", "card"] }: GroceryCheckoutDrawerProps) {
  const { t } = useI18n();
  const { data: userProfile } = useUserProfile();
  const { getCurrentLocation, reverseGeocode, isGettingLocation } = useCurrentLocation();
  const savedAddr = getSavedAddress();
  const savedProfile = getSavedProfile();

  const [address, setAddress] = useState(savedAddr?.address || "");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<{ display: string; mainText: string; placeId: string }[]>([]);
  const [showAddrSuggestions, setShowAddrSuggestions] = useState(false);
  const [isSearchingAddr, setIsSearchingAddr] = useState(false);
  const addrDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [name, setName] = useState(savedProfile.name);
  const [phone, setPhone] = useState(savedProfile.phone);
  const [gpsAutoFilled, setGpsAutoFilled] = useState(false);
  const [profileAutoFilled, setProfileAutoFilled] = useState(false);
  const [showPinMap, setShowPinMap] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedDeliveryAddress[]>(getAllSavedAddresses);
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const [saveLabel, setSaveLabel] = useState<"home" | "work" | "other">("home");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Auto-fill contact info from user profile
  useEffect(() => {
    if (userProfile && !profileAutoFilled) {
      if (userProfile.full_name && !name) setName(userProfile.full_name);
      if (userProfile.phone && !phone) setPhone(userProfile.phone);
      setProfileAutoFilled(true);
    }
  }, [userProfile, profileAutoFilled]);

  // Auto-fill address from live GPS
  useEffect(() => {
    if (!address && !gpsAutoFilled) {
      setGpsAutoFilled(true);
      getCurrentLocation()
        .then(async (loc) => {
          setAddressCoords({ lat: loc.lat, lng: loc.lng });
          const addr = await reverseGeocode(loc.lat, loc.lng);
          if (addr && addr !== "Unknown location") {
            setAddress(addr);
          }
        })
        .catch(() => {});
    }
  }, []);
  const [tip, setTip] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentTotalCents, setPaymentTotalCents] = useState<number | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [subPref, setSubPref] = useState<SubstitutionPref>(savedProfile.subPref);
  const [scheduler, setScheduler] = useState<SchedulerState>(DEFAULT_SCHEDULER);
  const [selectedPayment, setSelectedPayment] = useState<StorePaymentType>(
    storePaymentTypes.includes("cash") ? "cash" : storePaymentTypes[0] || "card"
  );
  // Live ETA
  const storeName = items[0]?.store || "Walmart";
  const storeCfg = GROCERY_STORES.find(s => s.name.toLowerCase() === storeName.toLowerCase());
  const [liveEta, setLiveEta] = useState(storeCfg?.deliveryMin ?? 35);
  const [routeMetrics, setRouteMetrics] = useState<GroceryRouteMetrics | null>(null);
  useEffect(() => {
    const compute = () => setLiveEta(getLiveEta(storeCfg?.deliveryMin ?? 35));
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [storeCfg]);

  useEffect(() => {
    let cancelled = false;

    if (!storeCoords || !addressCoords) {
      setRouteMetrics(null);
      return;
    }

    (async () => {
      const route = await getRoute(storeCoords, addressCoords);
      if (cancelled) return;

      if (!route) {
        setRouteMetrics(null);
        return;
      }

      setRouteMetrics({
        distanceMiles: route.distance_miles,
        durationMinutes: route.duration_in_traffic_minutes ?? route.duration_minutes,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [storeCoords, addressCoords]);

  const { isPlus } = useZivoPlus();
  const { isCambodia } = useCountry();

  // Cambodia grocery uses ZIVO Moto pricing from city_pricing (stored in KHR/km and converted by useCityPricing)
  const pickupCity = useMemo(() => {
    if (isCambodia) return "Phnom Penh";
    if (!address) return "default";
    const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) return parts[parts.length - 3] || parts[parts.length - 2] || "default";
    if (parts.length >= 2) return parts[parts.length - 2] || "default";
    return "default";
  }, [address, isCambodia]);

  const { data: cityPricingMap } = useCityPricing(pickupCity);

  const priorityFee = isPlus ? 0 : getPriorityFee(scheduler.speed);
  const effectiveDurationMinutes = routeMetrics?.durationMinutes ?? liveEta;
  const effectiveDistanceMiles = routeMetrics?.distanceMiles ?? (isCambodia ? 5 * 0.621371 : 3);
  const effectiveDistanceKm = effectiveDistanceMiles * 1.609344;

  const deliveryFee = useMemo(() => {
    const motoPricing = cityPricingMap?.["moto"];

    if (isCambodia && motoPricing) {
      // In Cambodia the source data is 1000៛ base + 900៛/km with 3000៛ minimum.
      // useCityPricing already converts KHR→USD and km→mile, so we price with distance only.
      const raw = motoPricing.base_fare + motoPricing.per_mile * effectiveDistanceMiles + motoPricing.booking_fee;
      return Math.round(Math.max(motoPricing.minimum_fare, raw) * 100) / 100;
    }

    if (motoPricing) {
      const raw = motoPricing.base_fare + motoPricing.per_mile * effectiveDistanceMiles + motoPricing.per_minute * effectiveDurationMinutes + motoPricing.booking_fee;
      return Math.round(Math.max(motoPricing.minimum_fare, raw) * 100) / 100;
    }

    return calcDeliveryFee(effectiveDistanceMiles, effectiveDurationMinutes);
  }, [cityPricingMap, effectiveDistanceMiles, effectiveDurationMinutes, isCambodia]);

  const distanceLabel = isCambodia
    ? `~${effectiveDistanceKm < 10 ? effectiveDistanceKm.toFixed(1) : Math.round(effectiveDistanceKm)}km`
    : `~${effectiveDistanceMiles < 10 ? effectiveDistanceMiles.toFixed(1) : Math.round(effectiveDistanceMiles)}mi`;
  // Platform markup: 0% for Cambodia, 3-5% elsewhere
  const platformMarkup = isCambodia ? 0 : calcMarkup(total);
  const markupPct = isCambodia ? 0 : getMarkupPct(total);
  // Service fee: waived for Cambodia and ZIVO+ members
  const serviceFee = isCambodia ? 0 : (isPlus ? 0 : calcServiceFee(total));
  const grandTotal = Math.max(0, total + platformMarkup + deliveryFee + serviceFee + tip + priorityFee - promoDiscount);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const isValid = address.trim().length > 0 && name.trim().length > 0;

  // Cleanup address debounce
  useEffect(() => () => { if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current); }, []);

  // Address autocomplete via Google Maps edge function
  const searchAddressAutocomplete = useCallback((query: string) => {
    setAddress(query);
    if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setShowAddrSuggestions(false);
      return;
    }
    addrDebounceRef.current = setTimeout(async () => {
      setIsSearchingAddr(true);
      try {
        const { data, error } = await supabase.functions.invoke("maps-autocomplete", {
          body: { input: query.trim() },
        });
        if (error) throw error;
        const mapped = (data?.suggestions || []).map((s: any) => ({
          display: s.description || "",
          mainText: s.main_text || s.description?.split(",")[0] || "",
          placeId: s.place_id || "",
        }));
        setAddressSuggestions(mapped);
        setShowAddrSuggestions(mapped.length > 0);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddr(false);
      }
    }, 400);
  }, []);

  const selectAddressSuggestion = useCallback(async (s: { display: string; placeId?: string }) => {
    setAddress(s.display);
    setAddressSuggestions([]);
    setShowAddrSuggestions(false);

    if (s.placeId) {
      const details = await getPlaceDetails(s.placeId);
      if (details) {
        setAddressCoords({ lat: details.lat, lng: details.lng });
        return;
      }
    }

    const coords = await forwardGeocode(s.display);
    if (coords) setAddressCoords(coords);
  }, []);

  // Persist profile
  useEffect(() => {
    if (name || phone) {
      localStorage.setItem("zivo_checkout_profile", JSON.stringify({ name, phone, subPref }));
    }
  }, [name, phone, subPref]);

  const resetInlinePayment = useCallback(() => {
    setPaymentClientSecret(null);
    setPaymentOrderId(null);
    setPaymentTotalCents(null);
  }, []);

  const goToReview = () => {
    if (!address.trim()) { toast.error("Please enter a delivery address"); return; }
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setStep(2);
  };

  const handleBackToDetails = useCallback(() => {
    resetInlinePayment();
    setStep(1);
  }, [resetInlinePayment]);

  const handleCreateInlinePayment = async () => {
    setIsSubmitting(true);
    resetInlinePayment();

    try {
      const orderItems = items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        image: i.image,
        brand: i.brand,
        quantity: i.quantity,
        store: i.store,
      }));

      const { data, error } = await supabase.functions.invoke("create-grocery-payment-intent", {
        body: {
          items: orderItems,
          delivery_address: address.trim(),
          customer_name: name.trim(),
          customer_phone: phone.trim() || null,
          tip,
          store: items[0]?.store || "Unknown",
          priority_fee: priorityFee,
          promo_discount: promoDiscount,
        },
      });

      if (error) throw new Error(error.message || "Failed to initialize secure card checkout");
      if (data?.error) throw new Error(data.error);
      if (!data?.ok || !data?.client_secret || !data?.order_id) {
        throw new Error("Unable to start card checkout");
      }

      setPaymentClientSecret(String(data.client_secret));
      setPaymentOrderId(String(data.order_id));
      setPaymentTotalCents(Number(data.total_cents || Math.round(grandTotal * 100)));
    } catch (err: any) {
      console.error("Payment init error:", err);
      toast.error(err.message || "Failed to initialize payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlinePaymentSuccess = useCallback(async (paymentIntentId: string) => {
    if (!paymentOrderId) {
      toast.error("Missing order reference. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-grocery-payment", {
        body: {
          order_id: paymentOrderId,
          payment_intent_id: paymentIntentId,
        },
      });

      if (error) throw new Error(error.message || "Failed to confirm payment");
      if (data?.error) throw new Error(data.error);

      const earnedPoints = addLoyaltyPoints(grandTotal);
      toast.success(earnedPoints > 0 ? `Payment successful • +${earnedPoints} loyalty points` : "Payment successful");
      onOrderPlaced(paymentOrderId);
    } catch (err: any) {
      console.error("Payment confirm error:", err);
      toast.error(err.message || "Payment completed but confirmation failed. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  }, [grandTotal, onOrderPlaced, paymentOrderId]);

  // PayPal / Square — hosted redirect flows
  const handlePaypalOrSquareOrder = async (provider: "paypal" | "square") => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Please sign in to place an order");
      const orderItems = items.map((i) => ({
        productId: i.productId, name: i.name, price: i.price,
        image: i.image, brand: i.brand, quantity: i.quantity, store: i.store,
      }));
      const totalCents = Math.round(grandTotal * 100);

      // Create shopping_orders row first (mirrors create-grocery-payment-intent pattern).
      const { data: created, error: insertErr } = await supabase
        .from("shopping_orders")
        .insert({
          user_id: userData.user.id,
          store: items[0]?.store || "Unknown",
          order_type: "shopping_delivery",
          status: "pending_payment",
          items: orderItems,
          total_amount: total,
          final_total: grandTotal,
          delivery_fee: deliveryFee,
          delivery_address: address.trim(),
          customer_name: name.trim(),
          customer_phone: phone.trim() || null,
          customer_email: userData.user.email || null,
          placed_at: new Date().toISOString(),
          payment_provider: provider,
          payment_status: "pending",
        } as any)
        .select("id")
        .single();
      if (insertErr || !created) throw new Error(insertErr?.message || "Failed to create order");
      const orderId = (created as any).id;

      const fnName = provider === "paypal" ? "create-grocery-paypal-order" : "create-grocery-square-checkout";
      const returnParam = provider === "paypal" ? "grocery_paypal_return" : "grocery_square_return";
      const returnUrl = `${window.location.origin}/grocery/orders?${returnParam}=${orderId}`;
      const cancelUrl = `${window.location.origin}/grocery/orders?grocery_paypal_cancel=${orderId}`;
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { order_id: orderId, amount_cents: totalCents, return_url: returnUrl, cancel_url: cancelUrl },
      });
      if (error) throw new Error(error.message || `${provider} checkout could not start`);
      if ((data as any)?.error) throw new Error((data as any).error);
      const redirect = provider === "paypal" ? (data as any).approve_url : (data as any).url;
      if (!redirect) throw new Error(`${provider} did not return a redirect URL`);
      window.location.assign(redirect);
    } catch (err: any) {
      console.error(`[grocery] ${provider} order error:`, err);
      toast.error(err.message || `Failed to start ${provider} checkout`);
      setIsSubmitting(false);
    }
  };

  // Cash / ABA order — no Stripe
  const handleCashOrAbaOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderItems = items.map((i) => ({
        productId: i.productId, name: i.name, price: i.price,
        image: i.image, brand: i.brand, quantity: i.quantity, store: i.store,
      }));
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("grocery_orders" as any).insert({
        user_id: user?.user?.id || null,
        store: items[0]?.store || "Unknown",
        items: orderItems,
        subtotal: total,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        platform_markup: platformMarkup,
        tip,
        priority_fee: priorityFee,
        promo_discount: promoDiscount,
        total_amount: grandTotal,
        delivery_address: address.trim(),
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        delivery_note: deliveryNote || null,
        leave_at_door: leaveAtDoor,
        substitution_pref: subPref,
        payment_method: selectedPayment,
        status: "pending",
      } as any).select("id").single();
      if (error) throw new Error(error.message);
      const orderId = (data as any)?.id;
      const earnedPoints = addLoyaltyPoints(grandTotal);
      toast.success(
        selectedPayment === "cash"
          ? `Order placed! Pay $${grandTotal.toFixed(2)} cash on delivery`
          : `Order placed! Complete ABA payment`
      );
      if (orderId) {
        // Trigger driver dispatch (deployed as `dispatch-order` in the shared
        // Supabase project; the folder lives in the zivodriver repo).
        supabase.functions.invoke("dispatch-order", {
          body: { order_id: orderId, order_type: "shopping_delivery" },
        }).catch(() => {/* dispatch is best-effort */});
        onOrderPlaced(orderId);
      }
    } catch (err: any) {
      console.error("Cash/ABA order error:", err);
      toast.error(err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const SUB_OPTIONS: { value: SubstitutionPref; label: string; desc: string; icon: typeof RefreshCw }[] = [
    { value: "contact_me", label: "Contact Me", desc: "Driver will message you", icon: MessageSquare },
    { value: "best_match", label: "Best Match", desc: "Pick a similar item", icon: RefreshCw },
    { value: "refund", label: "Refund", desc: "Skip & refund", icon: AlertTriangle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[32px] max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-muted-foreground/20" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {step === 2 && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleBackToDetails}
                  className="p-1.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </motion.button>
              )}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/15"
              >
                {step === 1 ? <MapPin className="h-5 w-5 text-primary" /> : <CreditCard className="h-5 w-5 text-primary" />}
              </motion.div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {step === 1 ? t("grocery.checkout.delivery_details") : t("grocery.checkout.review_pay")}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {t("grocery.checkout.step_of")} {step} / 2 · {itemCount} {t("grocery.checkout.items_from")} {storeName}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="p-2 rounded-full bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </motion.button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? "bg-primary" : "bg-muted/40"}`} />
          </div>

          {/* ═════════ STEP 1: Delivery Details ═════════ */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Live ETA banner */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                  <div className="p-2 rounded-xl bg-primary/15 shrink-0">
                    <Timer className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-foreground">
                      {t("grocery.checkout.estimated_delivery")}:{" "}
                      <motion.span key={effectiveDurationMinutes} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary">
                        {effectiveDurationMinutes} {t("grocery.checkout.min")}
                      </motion.span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isCambodia
                        ? (t("grocery.checkout.driver_will_shop_kh") || "Driver will shop & deliver by motorcycle/tuk tuk")
                        : t("grocery.checkout.driver_will_shop")}
                    </p>
                  </div>
                </div>

                {/* Auto-filled address badge */}
                {address && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 w-fit mb-3"
                  >
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("grocery.checkout.address_autofilled")}
                    </span>
                  </motion.div>
                )}

                {/* Profile auto-filled badge */}
                {profileAutoFilled && userProfile?.full_name && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 w-fit mb-3"
                  >
                    <User className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {t("grocery.checkout.contact_autofilled") || "Contact auto-filled from your account"}
                    </span>
                  </motion.div>
                )}

                {/* Contact info */}
                <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  {t("grocery.checkout.contact_info")}
                </h3>
                <div className="space-y-2.5 mb-4">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("grocery.checkout.full_name")}
                      className="pl-10 rounded-xl h-11 bg-muted/15 border-border/15 text-[13px] focus:bg-muted/25 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("grocery.checkout.phone_optional")}
                      className="pl-10 rounded-xl h-11 bg-muted/15 border-border/15 text-[13px] focus:bg-muted/25 transition-colors"
                      type="tel"
                    />
                  </div>
                </div>

                {/* Delivery address */}
                <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {t("grocery.checkout.delivery_address")}
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSavedPicker(!showSavedPicker)}
                      className="ml-auto text-[11px] font-semibold text-primary flex items-center gap-1 hover:underline"
                    >
                      <Bookmark className="h-3 w-3" />
                      Saved ({savedAddresses.length})
                    </button>
                  )}
                </h3>

                {/* Saved address picker */}
                <AnimatePresence>
                  {showSavedPicker && savedAddresses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 space-y-1.5 overflow-hidden"
                    >
                      {savedAddresses.map((sa) => {
                        const LabelIcon = sa.label === "home" ? Home : sa.label === "work" ? Building2 : MapPin;
                        const isActive = address === sa.address;
                        return (
                          <div key={sa.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setAddress(sa.address);
                                const coords = await forwardGeocode(sa.address);
                                if (coords) setAddressCoords(coords);
                                localStorage.setItem("zivo_selected_address", sa.id);
                                setShowSavedPicker(false);
                              }}
                              className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                isActive ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-border/15 hover:bg-muted/20"
                              }`}
                            >
                              <LabelIcon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-foreground capitalize">{sa.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{sa.address}</p>
                              </div>
                              {isActive && <CheckCircle className="h-4 w-4 text-primary shrink-0" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = savedAddresses.filter((a) => a.id !== sa.id);
                                setSavedAddresses(updated);
                                persistAddresses(updated);
                                toast.success("Address removed");
                              }}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative mb-4">
                  {isGettingLocation ? (
                    <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin z-10" />
                  ) : (
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
                  )}
                  <Input
                    value={address}
                    onChange={(e) => searchAddressAutocomplete(e.target.value)}
                    onFocus={() => addressSuggestions.length > 0 && setShowAddrSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddrSuggestions(false), 200)}
                    placeholder={t("grocery.checkout.search_address")}
                    className="pl-10 rounded-xl h-11 bg-muted/15 border-border/15 text-[13px] focus:bg-muted/25 transition-colors"
                  />
                  {isSearchingAddr && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                  )}
                  {/* Autocomplete suggestions */}
                  <AnimatePresence>
                    {showAddrSuggestions && addressSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border/30 rounded-xl shadow-xl overflow-hidden max-h-[180px] overflow-y-auto"
                      >
                        {addressSuggestions.map((s, i) => (
                          <button type="button"
                            key={i}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectAddressSuggestion(s)}
                            className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left border-b border-border/10 last:border-0"
                          >
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-foreground truncate">{s.mainText}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{s.display}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Adjust pin button */}
                {address && !showPinMap && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowPinMap(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 mb-4 w-full hover:bg-primary/10 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">
                      {t("grocery.checkout.adjust_pin") || "Adjust pin on map"}
                    </span>
                  </motion.button>
                )}

                {/* Save address button */}
                {address.trim().length > 5 && !savedAddresses.some((sa) => sa.address === address) && (
                  <AnimatePresence>
                    {!showSaveForm ? (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowSaveForm(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/50 border border-border/15 mb-4 w-full hover:bg-accent/70 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-foreground">Save this address</span>
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 rounded-xl bg-muted/15 border border-border/15 space-y-2.5 overflow-hidden"
                      >
                        <p className="text-[11px] font-bold text-foreground">Label this address</p>
                        <div className="flex gap-2">
                          {(["home", "work", "other"] as const).map((label) => {
                            const Icon = label === "home" ? Home : label === "work" ? Building2 : MapPin;
                            return (
                              <button type="button"
                                key={label}
                                onClick={() => setSaveLabel(label)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-[11px] font-semibold capitalize transition-all ${
                                  saveLabel === label
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/10 border-border/15 text-muted-foreground hover:bg-muted/20"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg text-[11px] h-8"
                            onClick={() => setShowSaveForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg text-[11px] h-8"
                            onClick={() => {
                              const newAddr: SavedDeliveryAddress = {
                                id: crypto.randomUUID(),
                                label: saveLabel,
                                address: address.trim(),
                                isDefault: savedAddresses.length === 0,
                              };
                              const updated = [...savedAddresses, newAddr];
                              setSavedAddresses(updated);
                              persistAddresses(updated);
                              localStorage.setItem("zivo_selected_address", newAddr.id);
                              setShowSaveForm(false);
                              toast.success("Address saved!");
                            }}
                          >
                            <Bookmark className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                {/* Draggable pin map */}
                <AnimatePresence>
                  {showPinMap && (
                    <CheckoutPinMap
                      coords={addressCoords}
                      onLocationChange={(lat, lng, addr) => {
                        setAddressCoords({ lat, lng });
                        setAddress(addr);
                      }}
                    />
                  )}
                </AnimatePresence>

                <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  {t("grocery.checkout.delivery_preferences")}
                </h3>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setLeaveAtDoor(!leaveAtDoor)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-2.5 ${
                    leaveAtDoor ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-border/15"
                  }`}
                >
                  <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    leaveAtDoor ? "bg-primary border-primary" : "border-muted-foreground/30"
                  }`}>
                    {leaveAtDoor && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium">{t("grocery.checkout.leave_at_door")}</span>
                </motion.button>

                <Textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder={t("grocery.checkout.delivery_instructions")}
                  className="rounded-xl bg-muted/15 border-border/15 text-[12px] min-h-[60px] resize-none focus:bg-muted/25 transition-colors mb-4"
                  rows={2}
                />

                {/* Substitution preference */}
                <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" />
                  {t("grocery.checkout.if_unavailable")}
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {SUB_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSubPref(opt.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        subPref === opt.value
                          ? "bg-primary/5 border-primary/25 shadow-sm"
                          : "bg-muted/10 border-border/15 hover:bg-muted/20"
                      }`}
                    >
                      <opt.icon className={`h-4 w-4 mx-auto mb-1 ${subPref === opt.value ? "text-primary" : "text-muted-foreground/50"}`} />
                      <p className={`text-[10px] font-bold ${subPref === opt.value ? "text-primary" : "text-foreground/70"}`}>{opt.label}</p>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Delivery scheduling & gift options */}
                <GroceryDeliveryScheduler
                  state={scheduler}
                  onChange={setScheduler}
                  baseEta={effectiveDurationMinutes}
                />

                <div className="mt-4" />

                {/* Item preview */}
                <div className="rounded-2xl bg-muted/15 border border-border/20 overflow-hidden mb-4">
                  <button type="button"
                    onClick={() => setShowItems(!showItems)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-primary/10">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[13px] font-semibold">{itemCount} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-foreground">${total.toFixed(2)}</span>
                      <motion.div animate={{ rotate: showItems ? 180 : 0 }}>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {showItems && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3 space-y-2 max-h-36 overflow-y-auto">
                          {items.map((item, idx) => (
                            <motion.div
                              key={item.productId}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex items-center gap-2.5 text-xs"
                            >
                              {item.image && (
	                                <img src={item.image} alt={item.name} className="h-9 w-9 rounded-xl object-contain bg-background border border-border/15 p-0.5" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                              )}
                              <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                              {onUpdateQuantity ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button type="button"
                                    onClick={() => {
                                      if (item.quantity <= 1) {
                                        onRemoveItem?.(item.productId);
                                      } else {
                                        onUpdateQuantity(item.productId, item.quantity - 1);
                                      }
                                    }}
                                    className="h-6 w-6 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-xs font-bold transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="text-[11px] font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                                  <button type="button"
                                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                    className="h-6 w-6 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-xs font-bold transition-colors"
                                  >
                                    +
                                  </button>
                                  <span className="font-semibold tabular-nums ml-1 w-14 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ) : (
                                <>
                                  <span className="text-muted-foreground shrink-0">{item.quantity}×</span>
                                  <span className="font-semibold shrink-0 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                                </>
                              )}
                              {onRemoveItem && (
                                <button type="button"
                                  onClick={() => onRemoveItem(item.productId)}
                                  className="h-6 w-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              {/* Fee summary in Step 1 */}
                <div className="rounded-2xl bg-muted/15 border border-border/20 p-3.5 mb-4">
                  <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    {t("grocery.checkout.fee_summary") || "Fee Summary"}
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground">{t("grocery.checkout.subtotal")}</span>
                      <span className="text-foreground font-medium tabular-nums">${total.toFixed(2)}</span>
                    </div>
                    {!isCambodia && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground">Platform fee ({markupPct}%)</span>
                        <span className="text-foreground font-medium tabular-nums">${platformMarkup.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Truck className="h-3 w-3" /> {t("grocery.checkout.delivery_fee") || "Delivery Fee"} ({distanceLabel})
                      </span>
                      <span className="text-foreground font-medium tabular-nums">${deliveryFee.toFixed(2)}</span>
                    </div>
                    {!isCambodia && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        {t("grocery.checkout.service_fee") || "Service Fee"} ({SERVICE_FEE_PCT}%)
                        {isPlus && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-600">ZIVO+</span>}
                      </span>
                      {isPlus ? (
                        <span className="text-amber-600 font-bold">
                          <span className="line-through text-muted-foreground/50 mr-1">${calcServiceFee(total).toFixed(2)}</span>
                          $0.00
                        </span>
                      ) : (
                        <span className="text-foreground font-medium tabular-nums">${serviceFee.toFixed(2)}</span>
                      )}
                    </div>
                    )}
                    {priorityFee > 0 && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground flex items-center gap-1.5">⚡ {t("grocery.checkout.priority") || "Priority"}</span>
                        <span className="text-amber-600 font-medium tabular-nums">+${priorityFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border/15 pt-1.5 mt-1.5 flex justify-between text-[13px] font-bold">
                      <span>{t("grocery.checkout.estimated_total") || "Estimated Total"}</span>
                      <span className="text-primary tabular-nums">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ STEP 2: Review & Pay ═════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Delivery summary card */}
                <div className="rounded-2xl bg-muted/15 border border-border/20 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-[13px] font-bold">Delivering to</span>
                  </div>
                  <p className="text-[12px] text-foreground font-medium">{name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{address}</p>
                  {phone && <p className="text-[11px] text-muted-foreground mt-0.5">{phone}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {leaveAtDoor && (
                      <div className="flex items-center gap-1.5">
                        <DoorOpen className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-primary font-semibold">Leave at door</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Substitutions: {SUB_OPTIONS.find(o => o.value === subPref)?.label}
                      </span>
                    </div>
                  </div>
                  {deliveryNote && (
                    <div className="flex items-start gap-1.5 mt-1.5">
                      <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-[10px] text-muted-foreground">{deliveryNote}</span>
                    </div>
                  )}
                  <button type="button"
                    onClick={handleBackToDetails}
                    className="text-[10px] text-primary font-semibold mt-2 hover:underline"
                  >
                    Edit details
                  </button>
                </div>

                {/* Route map: Store → Delivery */}
                {storeCoords && addressCoords && (
                  <CheckoutRouteMap
                    storeCoords={storeCoords}
                    deliveryCoords={addressCoords}
                    storeName={storeNameProp || storeName}
                  />
                )}

                {/* Live ETA */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-primary/5 border border-primary/10 mb-4"
                >
                  <Timer className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-foreground">
                      Est. delivery:{" "}
                      <motion.span key={effectiveDurationMinutes} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary">
                        {effectiveDurationMinutes} min
                      </motion.span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[9px] font-bold text-primary">{SERVICE_FEE_PCT}% fee</span>
                  </div>
                </motion.div>

                {/* Full order summary */}
                <div className="rounded-2xl bg-muted/15 border border-border/20 overflow-hidden mb-4">
                  <button type="button"
                    onClick={() => setShowItems(!showItems)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-primary/10">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-[13px] font-semibold">Order Summary</span>
                      <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">{itemCount} items</span>
                    </div>
                    <motion.div animate={{ rotate: showItems ? 180 : 0 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {showItems && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3 space-y-2 max-h-36 overflow-y-auto">
                          {items.map((item, idx) => (
                            <motion.div
                              key={item.productId}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className="flex items-center gap-2.5 text-xs"
                            >
                              {item.image && (
	                                <img src={item.image} alt={item.name} className="h-9 w-9 rounded-xl object-contain bg-background border border-border/15 p-0.5" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                              )}
                              <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                              {onUpdateQuantity ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button type="button"
                                    onClick={() => {
                                      if (item.quantity <= 1) {
                                        onRemoveItem?.(item.productId);
                                      } else {
                                        onUpdateQuantity(item.productId, item.quantity - 1);
                                      }
                                    }}
                                    className="h-6 w-6 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-xs font-bold transition-colors"
                                  >
                                    −
                                  </button>
                                  <span className="text-[11px] font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                                  <button type="button"
                                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                    className="h-6 w-6 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-xs font-bold transition-colors"
                                  >
                                    +
                                  </button>
                                  <span className="font-semibold tabular-nums ml-1 w-14 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ) : (
                                <>
                                  <span className="text-muted-foreground shrink-0">{item.quantity}×</span>
                                  <span className="font-semibold shrink-0 tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                                </>
                              )}
                              {onRemoveItem && (
                                <button type="button"
                                  onClick={() => onRemoveItem(item.productId)}
                                  className="h-6 w-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Price breakdown */}
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-border/10 space-y-1.5">
                    <div className="flex justify-between text-[12px] text-muted-foreground">
                      <span>{t("grocery.checkout.subtotal")}</span>
                      <span className="text-foreground tabular-nums">${total.toFixed(2)}</span>
                    </div>
                    {!isCambodia && (
                      <div className="flex justify-between text-[12px] text-muted-foreground">
                        <span>Platform fee ({markupPct}%)</span>
                        <span className="text-foreground tabular-nums">${platformMarkup.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Truck className="h-3 w-3" /> {isCambodia ? "Delivery" : "Delivery"} ({distanceLabel})</span>
                      <span className="text-foreground tabular-nums">${deliveryFee.toFixed(2)}</span>
                    </div>
                    {!isCambodia && (
                    <div className="flex justify-between text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        Service fee ({SERVICE_FEE_PCT}%)
                        {isPlus && <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-600">ZIVO+</span>}
                      </span>
                      {isPlus ? (
                        <span className="text-amber-600 font-bold line-through-none">
                          <span className="line-through text-muted-foreground/50 mr-1">${calcServiceFee(total).toFixed(2)}</span>
                          $0.00
                        </span>
                      ) : (
                        <span className="text-foreground tabular-nums">${serviceFee.toFixed(2)}</span>
                      )}
                    </div>
                    )}
                    {priorityFee > 0 && (
                      <div className="flex justify-between text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">⚡ Priority</span>
                        <span className="text-foreground tabular-nums">${priorityFee.toFixed(2)}</span>
                      </div>
                    )}
                    {scheduler.isGift && (
                      <div className="flex justify-between text-[12px] text-foreground">
                        <span className="flex items-center gap-1.5">🎁 Gift order</span>
                        <span className="font-medium">Free</span>
                      </div>
                    )}
                    {tip > 0 && (
                      <div className="flex justify-between text-[12px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Heart className="h-3 w-3 text-foreground" /> Driver tip</span>
                        <span className="text-foreground tabular-nums">${tip.toFixed(2)}</span>
                      </div>
                    )}
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-[12px] text-emerald-600">
                        <span className="flex items-center gap-1.5"><Gift className="h-3 w-3" /> Promo discount</span>
                        <span className="font-semibold">-${promoDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[15px] font-bold pt-2 mt-1.5 border-t border-border/10">
                      <span>Total</span>
                      <span className="text-primary tabular-nums">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Promo code — always visible on step 2 */}
                <div className="mb-4">
                  <GroceryPromoInput
                    onApply={(code, discount) => {
                      setPromoCode(code);
                      setPromoDiscount(discount);

                      if (paymentClientSecret) {
                        resetInlinePayment();
                        toast.success("Promo applied. Total updated — tap Pay again.");
                      }
                    }}
                  />
                </div>

                {paymentClientSecret ? (
                  <div className="rounded-2xl bg-muted/10 border border-border/20 p-3.5 mb-3">
                    <p className="text-[10px] text-muted-foreground mb-3 text-center">
                      Complete card payment below without leaving this checkout.
                    </p>
                    <GroceryInlinePaymentForm
                      clientSecret={paymentClientSecret}
                      totalCents={paymentTotalCents ?? Math.round(grandTotal * 100)}
                      onCancel={resetInlinePayment}
                      onSuccess={handleInlinePaymentSuccess}
                    />
                  </div>
                ) : (
                  <>
                    {/* Payment Method Selector */}
                    {storePaymentTypes.length > 1 && (
                      <div className="mb-4">
                        <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                          Payment Method
                        </h3>
                        <div className="flex gap-2">
                          {storePaymentTypes.includes("cash") && (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setSelectedPayment("cash"); resetInlinePayment(); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                selectedPayment === "cash"
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                              }`}
                            >
                              <Banknote className="h-3.5 w-3.5" /> Cash
                            </motion.button>
                          )}
                          {storePaymentTypes.includes("card") && (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setSelectedPayment("card"); resetInlinePayment(); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                selectedPayment === "card"
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                              }`}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Card
                            </motion.button>
                          )}
                          {storePaymentTypes.includes("aba") && (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setSelectedPayment("aba"); resetInlinePayment(); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                selectedPayment === "aba"
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                              }`}
                            >
                              <QrCode className="h-3.5 w-3.5" /> ABA
                            </motion.button>
                          )}
                          {storePaymentTypes.includes("paypal") && (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setSelectedPayment("paypal"); resetInlinePayment(); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                selectedPayment === "paypal"
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                              }`}
                            >
                              🅿️ PayPal
                            </motion.button>
                          )}
                          {storePaymentTypes.includes("square") && (
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setSelectedPayment("square"); resetInlinePayment(); }}
                              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                selectedPayment === "square"
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                              }`}
                            >
                              🟦 Square
                            </motion.button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tip selection */}
                    <div className="mb-4">
                      <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
                        <Heart className="h-3.5 w-3.5 text-foreground" />
                        Driver Tip
                      </h3>
                      <div className="flex gap-2">
                        {TIP_OPTIONS.map((amount) => (
                          <motion.button
                            key={amount}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setTip(amount)}
                            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                              tip === amount
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                : "bg-muted/25 text-muted-foreground hover:bg-muted/40 border border-border/15"
                            }`}
                          >
                            {amount === 0 ? "None" : `$${amount}`}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 py-3 mb-3">
                      {[
                        { icon: Shield, label: "Protected" },
                        { icon: Lock, label: "Encrypted" },
                        { icon: BadgeCheck, label: "Verified" },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3 text-primary/70" />
                          <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] text-muted-foreground/60 text-center mb-3 leading-relaxed px-4">
                      {selectedPayment === "cash"
                        ? "Pay your driver in cash upon delivery. A verified ZIVO driver will shop your items and deliver to your door."
                        : selectedPayment === "aba"
                        ? "You'll receive an ABA QR code to scan after placing your order."
                        : "Your card is processed inline by Stripe. A verified ZIVO driver will shop your items and deliver to your door."}
                    </p>

                    {/* Policy disclosures */}
                    <div className="space-y-1.5 mb-3 px-2">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10">
                        <RefreshCw className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                        <p className="text-[9px] text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground/70">Freshness Guarantee:</span> Report quality issues within 24h for a full refund. <Link to="/grocery/returns" className="text-primary/70 underline">Returns policy</Link>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10">
                        <AlertTriangle className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                         <p className="text-[9px] text-muted-foreground leading-relaxed">
                           <span className="font-semibold text-foreground/70">Cancellation:</span> Free before driver assigned · 15–50% after. <Link to="/grocery/fees" className="text-primary/70 underline">View fees</Link>
                         </p>
                      </div>
                      <p className="text-[8px] text-muted-foreground/50 text-center px-2">
                        By placing your order, you agree to our <Link to="/grocery/terms" className="text-primary/50 underline">Terms</Link> and <Link to="/privacy" className="text-primary/50 underline">Privacy Policy</Link>
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky CTA */}
        <div className="shrink-0 px-5 pt-3 pb-20 border-t border-border/10 bg-background/95 backdrop-blur-md" style={{ paddingBottom: "max(5rem, calc(var(--zivo-safe-bottom,0px) + 5rem))" }}>
          {step === 1 ? (
            <motion.div whileTap={isValid ? { scale: 0.97 } : {}}>
              <Button
                className="w-full h-[50px] rounded-2xl text-[14px] font-bold shadow-lg shadow-primary/20 gap-2"
                disabled={!isValid}
                onClick={goToReview}
              >
                {t("grocery.checkout.review_order")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : paymentClientSecret ? (
            <div className="flex items-center justify-center text-[10px] text-muted-foreground py-1">
              Enter card details or Apple Pay above to complete checkout.
            </div>
          ) : (
            <motion.div whileTap={!isSubmitting ? { scale: 0.97 } : {}}>
              <Button
                className="w-full h-[50px] rounded-2xl text-[14px] font-bold shadow-lg shadow-primary/20 gap-2"
                disabled={isSubmitting}
                onClick={
                  selectedPayment === "card" ? handleCreateInlinePayment :
                  selectedPayment === "paypal" ? () => handlePaypalOrSquareOrder("paypal") :
                  selectedPayment === "square" ? () => handlePaypalOrSquareOrder("square") :
                  handleCashOrAbaOrder
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    {selectedPayment === "card" ? "Preparing secure payment…" : "Placing order…"}
                  </>
                ) : selectedPayment === "cash" ? (
                  <>
                    <Banknote className="h-4 w-4" />
                    Place Order · ${grandTotal.toFixed(2)} Cash
                  </>
                ) : selectedPayment === "aba" ? (
                  <>
                    <QrCode className="h-4 w-4" />
                    Place Order · ${grandTotal.toFixed(2)} ABA
                  </>
                ) : selectedPayment === "paypal" ? (
                  <>🅿️ Continue to PayPal · ${grandTotal.toFixed(2)}</>
                ) : selectedPayment === "square" ? (
                  <>🟦 Continue to Square · ${grandTotal.toFixed(2)}</>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay ${grandTotal.toFixed(2)} · Secure Checkout
                  </>
                )}
              </Button>
            </motion.div>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Lock className="h-2.5 w-2.5 text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/40">
              {selectedPayment === "cash" ? "Cash on delivery" :
               selectedPayment === "aba" ? "ABA Bank · Secure QR" :
               selectedPayment === "paypal" ? "PayPal · Secure redirect" :
               selectedPayment === "square" ? "Square · Secure redirect" :
               "Powered by Stripe · 256-bit encryption"}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
