/**
 * EatsLanding - Food delivery hub page with full ordering flow
 * Connected to Supabase: restaurants, menu_items, food_orders
 */
import { useState, useMemo, useEffect } from "react";
import Star from "lucide-react/dist/esm/icons/star";
import Clock from "lucide-react/dist/esm/icons/clock";
import Truck from "lucide-react/dist/esm/icons/truck";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import Search from "lucide-react/dist/esm/icons/search";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Plus from "lucide-react/dist/esm/icons/plus";
import Minus from "lucide-react/dist/esm/icons/minus";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Package from "lucide-react/dist/esm/icons/package";
import Timer from "lucide-react/dist/esm/icons/timer";
import Heart from "lucide-react/dist/esm/icons/heart";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Percent from "lucide-react/dist/esm/icons/percent";
import Leaf from "lucide-react/dist/esm/icons/leaf";
import Award from "lucide-react/dist/esm/icons/award";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import X from "lucide-react/dist/esm/icons/x";
import Flame from "lucide-react/dist/esm/icons/flame";
import Zap from "lucide-react/dist/esm/icons/zap";
import CalendarCheck from "lucide-react/dist/esm/icons/calendar-check";
import Car from "lucide-react/dist/esm/icons/car";
import Banknote from "lucide-react/dist/esm/icons/banknote";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import Smartphone from "lucide-react/dist/esm/icons/smartphone";
import Store from "lucide-react/dist/esm/icons/store";
import WheatOff from "lucide-react/dist/esm/icons/wheat-off";
import Beef from "lucide-react/dist/esm/icons/beef";
import Mic from "lucide-react/dist/esm/icons/mic";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import HelpCircle from "lucide-react/dist/esm/icons/help-circle";
import Phone from "lucide-react/dist/esm/icons/phone";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { zivoRouteUrl } from "@/lib/maps/openInZivoMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEatsRestaurants, useEatsMenu, type EatsCartItem } from "@/hooks/useEatsData";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { useEatsOrder, type PlaceOrderParams } from "@/hooks/useEatsOrder";
import { getWalletBalance } from "@/hooks/useWalletPayment";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PartnerBadge from "@/components/shared/PartnerBadge";
import { useNetworkFavorites } from "@/hooks/useNetworkFavorites";

// ─── Types ───────────────────────────────────────────────────────────
type Step = "browse" | "restaurant" | "cart" | "checkout";

// Canonicalize merchant-typed cuisine labels so common typos / aliases
// collapse into one chip (e.g. "Asain food" + "Asian" → "Asian"). The DB
// keeps the original value; this only affects the display label.
const CUISINE_ALIASES: Record<string, string> = {
  "asain": "Asian",
  "asain food": "Asian",
  "asian food": "Asian",
  "italan": "Italian",
  "itialian": "Italian",
  "japenese": "Japanese",
  "chineese": "Chinese",
  "mexican food": "Mexican",
  "thai food": "Thai",
  "indian food": "Indian",
};
function canonicalCuisine(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const key = trimmed.toLowerCase();
  if (CUISINE_ALIASES[key]) return CUISINE_ALIASES[key];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Cuisine emoji for empty-image fallbacks so cards look intentional
// rather than broken when a merchant hasn't uploaded a cover photo.
const CUISINE_EMOJI: Record<string, string> = {
  asian: "🥢", chinese: "🥡", japanese: "🍱", thai: "🍜", korean: "🍲",
  indian: "🍛", italian: "🍝", mexican: "🌮", american: "🍔", french: "🥖",
  greek: "🥙", mediterranean: "🥗", vietnamese: "🍲", pizza: "🍕",
  burger: "🍔", coffee: "☕", dessert: "🍰", bakery: "🥐", seafood: "🦐",
  vegan: "🥗", vegetarian: "🥗", bbq: "🍖", breakfast: "🥞", sushi: "🍣",
};
function cuisineEmoji(raw: string): string {
  const key = (raw || "").toLowerCase().trim();
  for (const k of Object.keys(CUISINE_EMOJI)) {
    if (key.includes(k)) return CUISINE_EMOJI[k];
  }
  return "🍽️";
}

const tipOptions = [
  { id: "none", label: "No tip", pct: 0 },
  { id: "15", label: "15%", pct: 0.15 },
  { id: "20", label: "20%", pct: 0.20 },
  { id: "25", label: "25%", pct: 0.25 },
  { id: "custom", label: "Custom", pct: 0 },
];

const deliverySpeedOptions = [
  { id: "standard", label: "Standard", time: "25-40 min", extraCost: 0 },
  { id: "priority", label: "Priority", time: "15-25 min", extraCost: 2.99, badge: "Faster" },
];

// ─── Sub-components ──────────────────────────────────────────────────
function EatsStepIndicator({ currentStep }: { currentStep: string }) {
  const steps = [
    { id: "browse",     label: "Browse", icon: UtensilsCrossed },
    { id: "restaurant", label: "Menu",   icon: Store },
    { id: "cart",       label: "Cart",   icon: ShoppingCart },
    { id: "checkout",   label: "Pay",    icon: CreditCard },
  ] as const;
  const idx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="px-3 pb-2.5 pt-0.5">
      <motion.div layout className="flex items-center">
        {steps.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          const Icon = s.icon;
          return (
            <div key={s.id} className={cn("flex items-center", i < steps.length - 1 ? "flex-1" : "")}>
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full select-none overflow-hidden shrink-0",
                  active
                    ? "h-7 px-3 bg-foreground text-background shadow-[0_2px_10px_rgba(0,0,0,0.18)]"
                    : done
                    ? "w-7 h-7 justify-center bg-emerald-500 text-white"
                    : "w-7 h-7 justify-center bg-muted/50 text-muted-foreground/40 border border-border/30",
                )}
              >
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <>
                    <Icon className={cn("shrink-0", active ? "w-3.5 h-3.5" : "w-3 h-3")} strokeWidth={active ? 2.5 : 2} />
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          key={s.id + "-label"}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="text-[11px] font-black tracking-wide whitespace-nowrap overflow-hidden"
                        >
                          {s.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>

              {i < steps.length - 1 && (
                <div className="flex-1 mx-1 h-[2px] rounded-full bg-border/25 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}


// ─── Main Component ──────────────────────────────────────────────────
const ORDER_STAGES = [
  { label: "Order Placed", icon: CheckCircle },
  { label: "Confirmed", icon: CheckCircle },
  { label: "Preparing", icon: Package },
  { label: "Out for Delivery", icon: Truck },
  { label: "Delivered", icon: CheckCircle },
] as const;

// Map the real food_orders.status enum onto the inline ORDER_STAGES index.
const EATS_STATUS_TO_STEP: Record<string, number> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 2,
  picked_up: 3, out_for_delivery: 3, delivered: 4,
};

export default function EatsLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { placeOrder, placing: placingOrder } = useEatsOrder();

  // Order status tracker
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [statusStep, setStatusStep] = useState(0);
  const [cancelCountdown, setCancelCountdown] = useState(60);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Reflect the REAL order status (no fake timer): fetch once, then subscribe to
  // realtime updates — mirrors EatsTrackingPage. Monotonic so a slow initial fetch
  // can't regress a newer realtime value. Closes the overlay if the order is cancelled.
  useEffect(() => {
    if (!trackedOrderId) return;
    let active = true;
    const apply = (status?: string | null) => {
      if (!active || !status) return;
      if (status === "cancelled") { setTrackedOrderId(null); return; }
      const step = EATS_STATUS_TO_STEP[status];
      if (typeof step === "number") setStatusStep((prev) => Math.max(prev, step));
    };
    supabase
      .from("food_orders")
      .select("status")
      .eq("id", trackedOrderId)
      .single()
      .then(({ data }) => apply((data as { status?: string } | null)?.status));
    const channel = supabase
      .channel(`eats-inline-${trackedOrderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "food_orders", filter: `id=eq.${trackedOrderId}` },
        (payload) => apply((payload.new as { status?: string } | null)?.status),
      )
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [trackedOrderId]);

  useEffect(() => {
    if (!trackedOrderId || cancelCountdown <= 0) return;
    const t = setInterval(() => setCancelCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [trackedOrderId, cancelCountdown]);

  useEffect(() => {
    if (!trackedOrderId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTrackedOrderId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trackedOrderId]);

  // Wallet balance for checkout
  const [walletBalanceCents, setWalletBalanceCents] = useState<number>(0);
  useEffect(() => {
    if (user?.id) {
      getWalletBalance(user.id).then(setWalletBalanceCents);
    }
  }, [user?.id]);
  // Data from Supabase
  const { data: restaurants = [], isLoading: loadingRestaurants } = useEatsRestaurants();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const { data: menuItems = [], isLoading: loadingMenu } = useEatsMenu(selectedRestaurantId);

  // UI State
  const [searchParams] = useSearchParams();
  // Honor share-card / deep-link query params on mount: ?cuisine= / ?city=
  // (matches the shape produced by ZivoCardPicker's eats composer). City is
  // poured into searchQuery because EatsLanding doesn't have a separate
  // location filter — its filtering is text-based across name+cuisine+city.
  const initialEats = useMemo(() => {
    const cuisine = searchParams.get("cuisine") || "";
    const city = searchParams.get("city") || "";
    return {
      category: cuisine || "All",
      query: city,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [step, setStep] = useState<Step>("browse");
  const CART_STORAGE_KEY = "zivo:eats:cart";
  const [cart, setCart] = useState<EatsCartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch {}
  }, [cart]);
  const [searchQuery, setSearchQuery] = useState(initialEats.query);
  const [activeCategory, setActiveCategory] = useState(initialEats.category);
  const [sortBy, setSortBy] = useState<"recommended" | "rating" | "time" | "nearby">("recommended");
  const [voiceListening, setVoiceListening] = useState(false);
  const RECENT_SEARCHES_KEY = "zivo:eats:recentSearches";
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]"); } catch { return []; }
  });
  const persistSearch = (q: string) => {
    const t = (q || "").trim();
    if (!t) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
      try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const CURRENCY_KEY = "zivo:eats:currency";
  const [currency, setCurrency] = useState<"USD" | "KHR">(() => {
    try { return (localStorage.getItem(CURRENCY_KEY) as "USD" | "KHR") || "USD"; } catch { return "USD"; }
  });
  useEffect(() => { try { localStorage.setItem(CURRENCY_KEY, currency); } catch {} }, [currency]);
  const KHR_RATE = 4000;
  const fmtPrice = (usd: number) => currency === "USD"
    ? `$${usd.toFixed(2)}`
    : `៛${Math.round(usd * KHR_RATE).toLocaleString()}`;
  const startVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search not supported in this browser"); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.maxAlternatives = 1;
    setVoiceListening(true);
    r.onresult = (e: any) => { setSearchQuery(e.results[0][0].transcript); };
    r.onerror = () => { toast.error("Voice search failed"); setVoiceListening(false); };
    r.onend = () => setVoiceListening(false);
    r.start();
  };
  const ORDER_MODE_KEY = "zivo:eats:orderMode";
  const [orderMode, setOrderMode] = useState<"delivery" | "pickup">(() => {
    try { return (localStorage.getItem(ORDER_MODE_KEY) as "delivery" | "pickup") || "delivery"; } catch { return "delivery"; }
  });
  useEffect(() => { try { localStorage.setItem(ORDER_MODE_KEY, orderMode); } catch {} }, [orderMode]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [showCartRestore, setShowCartRestore] = useState(false);
  const NOTIF_DISMISS_KEY = "zivo:eats:notifPromptDismiss";
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  useEffect(() => {
    try {
      if (typeof Notification === "undefined") return;
      const dismissed = localStorage.getItem(NOTIF_DISMISS_KEY) === "1";
      if (!dismissed && Notification.permission === "default") setShowNotifPrompt(true);
    } catch {}
  }, []);
  const requestNotifications = async () => {
    try {
      const r = await Notification.requestPermission();
      setShowNotifPrompt(false);
      if (r === "granted") toast.success("Notifications enabled — we'll keep you posted on every order");
    } catch {}
  };
  useEffect(() => {
    // Show the restore banner once on mount if we hydrated a non-empty cart from storage.
    try {
      const saved = JSON.parse(localStorage.getItem("zivo:eats:cart") || "[]");
      if (Array.isArray(saved) && saved.length > 0) setShowCartRestore(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const DIETARY_KEY = "zivo:eats:dietaryPref";
  const [activeDietary, setActiveDietary] = useState<string | null>(() => {
    try { return localStorage.getItem(DIETARY_KEY); } catch { return null; }
  });
  useEffect(() => {
    try {
      if (activeDietary) localStorage.setItem(DIETARY_KEY, activeDietary);
      else localStorage.removeItem(DIETARY_KEY);
    } catch {}
  }, [activeDietary]);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const SAVED_ADDRESSES_KEY = "zivo:eats:savedAddresses";
  const [savedAddresses, setSavedAddresses] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_ADDRESSES_KEY) || "[]"); } catch { return []; }
  });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const requestLocation = () => {
    if (!navigator.geolocation) { toast.error("Location not available in this browser"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Sorting by distance"); },
      () => toast.error("Couldn't get your location"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const detectAddressFromGPS = () => {
    if (!navigator.geolocation) { toast.error("Location not available"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserCoords({ lat, lng });
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setDeliveryAddress(addr);
          persistAddress(addr);
          toast.success("Address detected");
        } catch {
          toast.error("Could not resolve address");
        } finally {
          setGpsLoading(false);
          setAddressFocused(false);
        }
      },
      () => { toast.error("Couldn't get your location"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };
  const PWA_DISMISS_KEY = "zivo:eats:pwaDismiss";
  const [pwaPrompt, setPwaPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [pwaDismissed, setPwaDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(PWA_DISMISS_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPromoIndex(i => (i + 1) % 3), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const RECENTLY_VIEWED_KEY = "zivo:eats:recentlyViewed";
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]"); } catch { return []; }
  });
  const trackRecentlyViewed = (id: string) => {
    setRecentlyViewedIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 8);
      try { localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const persistAddress = (addr: string) => {
    const a = (addr || "").trim();
    if (!a) return;
    setSavedAddresses(prev => {
      const next = [a, ...prev.filter(x => x !== a)].slice(0, 4);
      try { localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Checkout state
  const ADDRESS_KEY = "zivo:eats:lastAddress";
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    try { return localStorage.getItem(ADDRESS_KEY) || ""; } catch { return ""; }
  });
  useEffect(() => { try { localStorage.setItem(ADDRESS_KEY, deliveryAddress); } catch {} }, [deliveryAddress]);
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const CONTACTLESS_KEY = "zivo:eats:contactless";
  const [contactlessDelivery, setContactlessDelivery] = useState<boolean>(() => {
    try { return localStorage.getItem(CONTACTLESS_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem(CONTACTLESS_KEY, contactlessDelivery ? "1" : "0"); } catch {} }, [contactlessDelivery]);
  const TIP_PREF_KEY = "zivo:eats:tipPref";
  const [selectedTip, setSelectedTip] = useState<string>(() => {
    try { return localStorage.getItem(TIP_PREF_KEY) || "20"; } catch { return "20"; }
  });
  useEffect(() => { try { localStorage.setItem(TIP_PREF_KEY, selectedTip); } catch {} }, [selectedTip]);
  const CUSTOM_TIP_KEY = "zivo:eats:customTip";
  const [customTipAmount, setCustomTipAmount] = useState<string>(() => {
    try { return localStorage.getItem(CUSTOM_TIP_KEY) || ""; } catch { return ""; }
  });
  useEffect(() => { try { localStorage.setItem(CUSTOM_TIP_KEY, customTipAmount); } catch {} }, [customTipAmount]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoData, setPromoData] = useState<{ discount_percent: number | null; discount_amount_cents: number | null } | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState("standard");
  const [noUtensils, setNoUtensils] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState<Record<string, string>>({});
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "wallet" | "paypal" | "square" | "applepay" | "googlepay">("card");

  // Favorites — persisted via localStorage and shared across the app
  const { favorites, toggle: toggleFavoriteHook } = useNetworkFavorites("restaurant");

  // Recent orders for "Order again" strip
  const [recentOrders, setRecentOrders] = useState<Array<{ store_id: string; store_name: string; cuisine: string }>>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("food_orders")
        .select("store_id, store_profiles!inner(name, cuisine_type)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      const seen = new Set<string>();
      const unique: typeof recentOrders = [];
      for (const o of (data || [])) {
        if (!seen.has(o.store_id)) {
          seen.add(o.store_id);
          unique.push({ store_id: o.store_id, store_name: o.store_profiles?.name || "Restaurant", cuisine: o.store_profiles?.cuisine_type || "" });
        }
        if (unique.length >= 4) break;
      }
      setRecentOrders(unique);
    })();
  }, [user]);

  // ─── Derived Data ────────────────────────────────────────────────
  const currentRestaurant = useMemo(
    () => restaurants.find(r => r.id === selectedRestaurantId) ?? null,
    [restaurants, selectedRestaurantId]
  );

  // Normalize cuisine types: canonicalize known aliases (Asain → Asian)
  // then dedupe by display label so each chip appears once.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const r of restaurants) {
      const display = canonicalCuisine(r.cuisine_type || "");
      if (display) seen.add(display);
    }
    return ["All", ...Array.from(seen).sort()];
  }, [restaurants]);

  const filtered = useMemo(() => {
    return restaurants
      .filter(r => {
        if (favoritesOnly && !favorites.has(r.id)) return false;
        if (openNowOnly && !r.is_open) return false;
        if (
          activeCategory !== "All" &&
          canonicalCuisine(r.cuisine_type || "") !== activeCategory
        ) return false;
        if (activeDietary) {
          const haystack = `${r.name || ""} ${r.cuisine_type || ""} ${(r as { description?: string | null }).description || ""} ${((r as { tags?: string[] | null }).tags || []).join(" ")}`.toLowerCase();
          const needles = activeDietary === "glutenfree" ? ["gluten-free", "gluten free", "gf"] : [activeDietary];
          if (!needles.some(n => haystack.includes(n))) return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const tokens = q.split(/\s+/).filter(Boolean);
          const haystack = [
            r.name,
            r.cuisine_type,
            (r as { description?: string | null }).description ?? "",
            (r as { address?: string }).address ?? "",
          ].join(" ").toLowerCase();
          return tokens.every(t => haystack.includes(t));
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === "time") return (a.avg_prep_time ?? 30) - (b.avg_prep_time ?? 30);
        if (sortBy === "nearby" && userCoords) {
          const ar = (a as { lat?: number | null; lng?: number | null });
          const br = (b as { lat?: number | null; lng?: number | null });
          const da = (ar.lat != null && ar.lng != null) ? haversineKm(userCoords, { lat: ar.lat, lng: ar.lng }) : Infinity;
          const db = (br.lat != null && br.lng != null) ? haversineKm(userCoords, { lat: br.lat, lng: br.lng }) : Infinity;
          return da - db;
        }
        return (b.rating ?? 0) - (a.rating ?? 0); // recommended = rating
      });
  }, [restaurants, activeCategory, activeDietary, searchQuery, sortBy, userCoords, favoritesOnly, favorites, openNowOnly]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = currentRestaurant?.delivery_fee_cents ? currentRestaurant.delivery_fee_cents / 100 : 3.99;
  const serviceFeeRate = currentRestaurant?.service_fee_percent ?? 5;
  const serviceFee = Math.round(cartTotal * (serviceFeeRate / 100) * 100) / 100;
  const tipPct = tipOptions.find(t => t.id === selectedTip)?.pct ?? 0;
  const tipAmount = selectedTip === "custom"
    ? Math.max(0, Math.round((parseFloat(customTipAmount) || 0) * 100) / 100)
    : Math.round(cartTotal * tipPct * 100) / 100;
  const speedExtra = deliverySpeedOptions.find(o => o.id === selectedSpeed)?.extraCost ?? 0;
  const promoDiscount = useMemo(() => {
    if (!promoApplied || !promoData) return 0;
    if (promoData.discount_amount_cents) return Math.min(promoData.discount_amount_cents / 100, cartTotal);
    if (promoData.discount_percent) return Math.round(cartTotal * (promoData.discount_percent / 100) * 100) / 100;
    return 0;
  }, [promoApplied, promoData, cartTotal]);
  const taxRate = 0.10;
  const taxAmount = Math.round(cartTotal * taxRate * 100) / 100;
  const grandTotal = Math.round((cartTotal + deliveryFee + serviceFee + taxAmount + tipAmount + speedExtra - promoDiscount) * 100) / 100;

  // ─── Cart Actions ────────────────────────────────────────────────
  const addToCart = (item: { id: string; name: string; price: number; image_url?: string | null }, restaurantId: string) => {
    if (cart.length > 0 && cart[0].restaurantId !== restaurantId) {
      toast.error("You can only order from one restaurant at a time. Clear your cart first.");
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, restaurantId, imageUrl: item.image_url }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItemId === menuItemId) {
        const newQty = c.quantity + delta;
        return newQty <= 0 ? null! : { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  // ─── Navigation ──────────────────────────────────────────────────
  const handleBack = () => {
    if (step === "checkout") setStep("cart");
    else if (step === "cart") setStep(selectedRestaurantId ? "restaurant" : "browse");
    else if (step === "restaurant") { setStep("browse"); setSelectedRestaurantId(null); }
    else navigate(-1);
  };

  // ─── Place Order ─────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user) { toast.error("Please sign in to place an order"); navigate("/login?redirect=/eats"); return; }
    if (orderMode === "delivery" && !deliveryAddress.trim()) { toast.error("Please enter a delivery address"); return; }
    if (cart.length === 0) { toast.error("Your cart is empty"); return; }
    if (scheduleMode === "later") {
      if (!scheduleTime) { toast.error("Please pick a delivery time"); return; }
      if (new Date(scheduleTime).getTime() <= Date.now()) { toast.error("Scheduled time must be in the future"); return; }
    }
    const minOrderCents = (currentRestaurant as { min_order_cents?: number | null } | null)?.min_order_cents ?? 0;
    if (minOrderCents > 0 && cartTotal * 100 < minOrderCents) {
      toast.error(`Minimum order ${fmtPrice(minOrderCents / 100)}`); return;
    }
    // Free-delivery threshold (subtotal ≥ $20) waives the fee
    const effectiveDeliveryFee = (orderMode === "pickup" || cartTotal >= 20) ? 0 : deliveryFee;
    const effectiveTotal = Math.round((cartTotal + effectiveDeliveryFee + serviceFee + taxAmount + tipAmount + speedExtra - promoDiscount) * 100) / 100;
    // Map UI-only payment types to API-supported ones
    const apiPaymentType: PlaceOrderParams["paymentType"] =
      paymentType === "applepay" || paymentType === "googlepay" ? "card" : paymentType;

    const result = await placeOrder({
      restaurantId: cart[0].restaurantId,
      items: cart.map((c) => ({ ...c, specialInstructions: specialInstructions[c.menuItemId] || undefined })),
      deliveryAddress: orderMode === "pickup" ? (currentRestaurant?.address || "Pickup at restaurant") : deliveryAddress,
      deliveryLat: userCoords?.lat ?? 0,
      deliveryLng: userCoords?.lng ?? 0,
      subtotal: cartTotal,
      deliveryFee: effectiveDeliveryFee,
      serviceFee,
      tipAmount,
      totalAmount: effectiveTotal,
      paymentType: apiPaymentType,
      specialInstructions: [
        orderMode === "pickup" ? "[Pickup]" : null,
        scheduleMode === "later" && scheduleTime ? `[Scheduled: ${new Date(scheduleTime).toLocaleString()}]` : null,
        contactlessDelivery ? "[Contactless]" : null,
        noUtensils ? "[No utensils]" : null,
        deliveryInstructions || null,
      ].filter(Boolean).join(" ") || undefined,
      isScheduled: scheduleMode === "later",
      scheduledFor: scheduleMode === "later" && scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
      isExpress: selectedSpeed === "priority",
      expressFee: speedExtra,
      promoCode: promoApplied ? promoCode : undefined,
      discountAmount: promoDiscount > 0 ? promoDiscount : undefined,
      restaurantName: currentRestaurant?.name,
      pickupLat: currentRestaurant?.lat ?? undefined,
      pickupLng: currentRestaurant?.lng ?? undefined,
    });
    if (result) {
      setTrackedOrderId(result.orderId);
      setStatusStep(0);
      setCancelCountdown(60);
      setCart([]);
      try { localStorage.removeItem(CART_STORAGE_KEY); } catch {}
      toast.success("Order placed!", {
        description: `Estimated arrival in ${(currentRestaurant?.avg_prep_time ?? 25) + 10}–${(currentRestaurant?.avg_prep_time ?? 25) + 20} min`,
        action: { label: "Track", onClick: () => navigate(`/eats/track/${result.orderId}`) },
        duration: 6000,
      });
    }
  };

  // ─── Cancel just-placed order (grace window) ─────────────────────────
  // Reuses the REAL cancel + refund path (cancel-eats-order edge function),
  // the same one EatsTrackingPage's CancelOrderButton calls. This actually
  // cancels the live food_orders row and triggers the provider refund — it is
  // NOT a cosmetic overlay close. On failure (e.g. restaurant already
  // confirmed / driver assigned → 409) we surface the error and KEEP the
  // overlay open so the order stays trackable.
  const handleCancelTrackedOrder = async () => {
    if (!trackedOrderId || cancellingOrder) return;
    setCancellingOrder(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-eats-order", {
        body: { order_id: trackedOrderId, reason: "customer_initiated" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as { refund_cents?: number; payment_status?: string; provider?: string };
      if (r?.refund_cents && r.refund_cents > 0) {
        toast.success("Order cancelled", {
          description: `$${(r.refund_cents / 100).toFixed(2)} refund ${r.payment_status === "refunded" ? "issued" : "in progress"} via ${r.provider || "your payment method"}.`,
        });
      } else {
        toast.success("Order cancelled");
      }
      setTrackedOrderId(null);
      setStep("browse");
    } catch (e: any) {
      toast.error(e?.message || "Cancellation failed");
    } finally {
      setCancellingOrder(false);
    }
  };

  const toggleFavorite = (id: string) => {
    const wasFav = favorites.has(id);
    toggleFavoriteHook(id);
    toast.success(wasFav ? "Removed from favorites" : "Added to favorites");
  };

  const renderMenuItem = (item: typeof menuItems[number], i: number) => {
    const inCart = cart.find(c => c.menuItemId === item.id);
    return (
      <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
        className="p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 space-y-2">
        <div className="flex items-center gap-4">
          {item.image_url ? (
	            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
          ) : (
            <div className="w-16 h-16 rounded-xl shrink-0 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-rose-500/10 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
              {item.is_featured && <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />}
            </div>
            {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
            <p className="text-sm font-bold text-primary mt-1">{fmtPrice(item.price)}</p>
          </div>
          {inCart ? (
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" aria-label="Decrease" onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center touch-manipulation active:scale-90 hover:bg-muted/80 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
              <motion.span key={inCart.quantity} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="text-sm font-bold w-5 text-center tabular-nums">{inCart.quantity}</motion.span>
              <button type="button" aria-label="Increase" onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full bg-ig-gradient text-white flex items-center justify-center touch-manipulation active:scale-90 hover:shadow-md hover:shadow-primary/30 transition-shadow"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => addToCart(item, currentRestaurant!.id)} className="rounded-xl h-9 px-4 gap-1.5 font-bold text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 hover:shadow-sm hover:shadow-primary/20 shrink-0 transition-all">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          )}
        </div>
        {inCart && (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Input placeholder="Special instructions (e.g., no onions)" value={specialInstructions[item.id] || ""}
              onChange={(e) => setSpecialInstructions(prev => ({ ...prev, [item.id]: e.target.value }))}
              className="h-8 text-xs rounded-lg border-border/30 bg-muted/30" />
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-orange-500/[0.02] relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),transparent_60%)]" />
      <SEOHead
        title="ZIVO Eats – Order Food Delivery from Local Restaurants"
        description="Order from your favorite local restaurants. Fast delivery, real-time tracking, and exclusive deals on ZIVO Eats."
        canonical="/eats"
      />
      {/* In-app top bar for browse step */}
      {step === "browse" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/20 safe-area-top overflow-hidden">
          <div className="flex items-center gap-2 px-3 h-14 w-full max-w-6xl mx-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-base tracking-tight truncate">ZIVO <span className="text-ig-gradient">Eats</span></span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => setStep("cart")}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-xl border touch-manipulation shrink-0 transition-all",
                cartCount > 0
                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30"
                  : "bg-card/80 border-border/40 text-foreground"
              )}
              aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <motion.span
                key={cartCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="text-[11px] font-black leading-none"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </motion.span>
            </motion.button>
          </div>
        </div>
      )}
      <ZivoMobileNav />

      {/* Safe-area top backdrop — occludes scrolled content under the
          dynamic island so partner badges, cards, etc. don't peek under
          the system clock. Mirrors AppHome's strip. */}
      <div
        aria-hidden
        className="zivo-safe-top-none fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl pointer-events-none [height:var(--zivo-safe-top-sticky)]"
      />

      <AnimatePresence mode="wait">
        {/* ═══ BROWSE ═══ */}
        {step === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {showCartRestore && cart.length > 0 && !trackedOrderId && (
              <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 text-xs font-bold">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Welcome back — {cartCount} item{cartCount !== 1 ? "s" : ""} saved in your cart</span>
                <button type="button" onClick={() => setStep("cart")} className="px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">View</button>
                <button type="button" onClick={() => setShowCartRestore(false)} aria-label="Dismiss" className="opacity-80 hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
            {trackedOrderId && (
              <motion.button type="button"
                initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                onClick={() => navigate(`/eats/track/${trackedOrderId}`)}
                className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-foreground text-background shadow-xl shadow-foreground/20 text-xs font-bold touch-manipulation active:scale-[0.97]">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>{ORDER_STAGES[statusStep]?.label} — track order</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </motion.button>
            )}
            <section className="safe-area-top relative pb-8 sm:pb-12 overflow-x-hidden">
              {/* Background blobs */}
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/8 via-primary/4 to-transparent" />
              <div className="pointer-events-none absolute -top-20 -right-4 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-rose-500/8 blur-3xl" />

              <div className="pt-16 sm:pt-28 lg:pt-32 relative">
                <div className="container mx-auto px-4 relative z-10 max-w-6xl">
                  {/* Desktop: side-by-side. Mobile/tablet: stacked */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 lg:min-h-[260px]">

                    {/* Brand column */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="lg:flex-1 lg:text-left mb-4 lg:mb-0"
                    >
                      {/* Mobile / tablet — hidden (fixed header handles branding) */}
                      <div className="hidden">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                          <UtensilsCrossed className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight leading-none">
                          ZIVO <span className="text-ig-gradient">Eats</span>
                        </h1>
                        <p className="text-xs text-muted-foreground leading-snug ml-1 hidden sm:block">
                          Local food, fast delivery.
                        </p>
                      </div>

                      {/* Desktop — full stacked layout */}
                      <div className="hidden lg:block">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 shadow-2xl shadow-orange-500/30">
                          <UtensilsCrossed className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-7xl font-black tracking-tight mb-3 leading-[1.05]">
                          ZIVO <span className="text-ig-gradient">Eats</span>
                        </h1>
                        <p className="text-muted-foreground text-xl max-w-xs">
                          Delicious food from local restaurants, delivered fast.
                        </p>
                        <div className="flex items-center gap-4 mt-5">
                          {[
                            { icon: Truck, label: "Fast delivery", sub: "25–45 min avg" },
                            { icon: Percent, label: "Best prices", sub: "No hidden fees" },
                            { icon: Flame, label: "Top picks", sub: "Curated daily" },
                          ].map(b => (
                            <div key={b.label} className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <b.icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold leading-tight">{b.label}</p>
                                <p className="text-[10px] text-muted-foreground">{b.sub}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Search column */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.1 }}
                      className="w-full lg:w-[420px] xl:w-[480px] space-y-3"
                    >
                      {/* Delivery / Pickup toggle + currency */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex bg-muted/40 rounded-2xl p-1">
                          <button type="button" onClick={() => setOrderMode("delivery")}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                              orderMode === "delivery" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                            <Truck className="w-3.5 h-3.5" /> Delivery
                          </button>
                          <button type="button" onClick={() => setOrderMode("pickup")}
                            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                              orderMode === "pickup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                            <Store className="w-3.5 h-3.5" /> Pickup
                          </button>
                        </div>
                        <button type="button"
                          onClick={() => setCurrency(c => c === "USD" ? "KHR" : "USD")}
                          aria-label="Toggle currency"
                          className="shrink-0 px-3 h-11 rounded-2xl bg-card border border-border/50 text-xs font-bold text-foreground touch-manipulation active:scale-95">
                          {currency === "USD" ? "$ USD" : "៛ KHR"}
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search restaurants or dishes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") persistSearch(searchQuery); }} onBlur={() => persistSearch(searchQuery)} className={cn("pl-10 h-12 rounded-xl bg-card border-border/50 shadow-sm", searchQuery ? "pr-20" : "pr-12")} />
                        {searchQuery && (
                          <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search"
                            className="absolute right-12 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center bg-muted/60 text-muted-foreground hover:text-foreground touch-manipulation active:scale-90">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={startVoiceSearch} aria-label="Voice search"
                          className={cn("absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all touch-manipulation active:scale-90",
                            voiceListening ? "bg-red-500 text-white animate-pulse" : "bg-muted/60 text-muted-foreground hover:text-foreground")}>
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>
                      {orderMode === "delivery" && (
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 z-10 pointer-events-none" />
                          <Input
                            placeholder="Enter your delivery address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            onFocus={() => setAddressFocused(true)}
                            onBlur={(e) => { persistAddress(e.target.value); setTimeout(() => setAddressFocused(false), 200); }}
                            className="pl-10 pr-11 h-12 rounded-xl bg-card border-border/50 shadow-sm focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-500/40 transition-all"
                          />
                          <button type="button"
                            onMouseDown={(e) => { e.preventDefault(); detectAddressFromGPS(); }}
                            disabled={gpsLoading}
                            aria-label="Use my location"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 touch-manipulation active:scale-90 transition-all">
                            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                          </button>

                          {/* Suggestions dropdown */}
                          <AnimatePresence>
                            {addressFocused && (savedAddresses.length > 0 || !deliveryAddress) && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-2xl bg-card border border-border/40 shadow-2xl shadow-black/10 overflow-hidden">
                                {/* Use current location row */}
                                <button type="button"
                                  onMouseDown={(e) => { e.preventDefault(); detectAddressFromGPS(); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors border-b border-border/20 touch-manipulation">
                                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                    {gpsLoading ? <Loader2 className="w-4 h-4 text-orange-500 animate-spin" /> : <Navigation className="w-4 h-4 text-orange-500" />}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-extrabold text-foreground">Use current location</p>
                                    <p className="text-[10px] text-muted-foreground">Detect address automatically</p>
                                  </div>
                                </button>
                                {/* Saved addresses */}
                                {savedAddresses
                                  .filter(a => !deliveryAddress || a.toLowerCase().includes(deliveryAddress.toLowerCase()))
                                  .slice(0, 4)
                                  .map((a, i) => (
                                    <motion.button type="button" key={a}
                                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: i * 0.04 }}
                                      onMouseDown={(e) => { e.preventDefault(); setDeliveryAddress(a); setAddressFocused(false); }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 active:bg-muted/60 transition-colors touch-manipulation border-b border-border/10 last:border-0">
                                      <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                      <p className="text-sm font-medium text-foreground truncate text-left">{a}</p>
                                    </motion.button>
                                  ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {!searchQuery && recentSearches.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 self-center">Recent:</span>
                          {recentSearches.map(q => (
                            <button type="button" key={q}
                              onClick={() => setSearchQuery(q)}
                              className="px-2.5 py-1 rounded-full bg-muted/40 text-[11px] font-medium text-muted-foreground hover:text-foreground touch-manipulation active:scale-95">
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-2 pb-8">
              <div className="container mx-auto px-4 max-w-6xl">
                {/* Order again strip */}
                {recentOrders.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-400 text-rose-400" /> Order again
                    </p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {recentOrders.map(o => (
                        <button type="button" key={o.store_id}
                          onClick={() => { trackRecentlyViewed(o.store_id); setSelectedRestaurantId(o.store_id); setStep("restaurant"); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-rose-500/10 to-orange-500/5 border border-rose-500/20 text-left shrink-0 active:scale-95 hover:border-rose-500/40 hover:shadow-sm hover:shadow-rose-500/10 transition-all touch-manipulation">
                          <span className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <UtensilsCrossed className="w-4 h-4" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold truncate max-w-[100px]">{o.store_name}</p>
                            <p className="text-[10px] text-rose-500 font-bold">Reorder →</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* For you (based on past cuisines) */}
                {(() => {
                  if (loadingRestaurants || recentOrders.length === 0) return null;
                  const likedCuisines = new Set(recentOrders.map(o => (o.cuisine || "").toLowerCase()).filter(Boolean));
                  if (!likedCuisines.size) return null;
                  const recentIds = new Set(recentOrders.map(o => o.store_id));
                  const recs = restaurants
                    .filter(r => !recentIds.has(r.id) && likedCuisines.has((r.cuisine_type || "").toLowerCase()))
                    .slice(0, 6);
                  if (!recs.length) return null;
                  return (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-violet-500" /> For you
                      </p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {recs.map(r => (
                          <button type="button" key={r.id}
                            onClick={() => { trackRecentlyViewed(r.id); setSelectedRestaurantId(r.id); setStep("restaurant"); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-violet-500/20 text-left shrink-0 active:scale-95 hover:border-violet-500/40 hover:shadow-sm hover:shadow-violet-500/10 transition-all touch-manipulation">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[120px]">{r.name}</p>
                              <p className="text-[10px] text-violet-500 font-bold">{canonicalCuisine(r.cuisine_type)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Trending now strip */}
                {!loadingRestaurants && restaurants.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="mb-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-extrabold flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" /> Trending now
                      </p>
                      <button type="button" onClick={() => setSortBy("rating")}
                        className="text-[10px] font-bold text-primary hover:underline">See all →</button>
                    </div>
                    <div className="relative">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory overscroll-x-contain">
                      {[...restaurants]
                        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                        .slice(0, 6)
                        .map(r => (
                          <button type="button" key={r.id}
                            onClick={() => { trackRecentlyViewed(r.id); setSelectedRestaurantId(r.id); setStep("restaurant"); }}
                            className="snap-start flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 text-left shrink-0 active:scale-95 hover:scale-105 transition-all duration-200 touch-manipulation hover:border-primary/30 hover:shadow-md hover:shadow-primary/10">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/15 to-rose-500/10 flex items-center justify-center text-base leading-none shrink-0" aria-hidden>
                              {cuisineEmoji(r.cuisine_type || "")}
                            </div>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[120px]">{r.name}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                {r.rating != null && r.rating > 0 ? (
                                  <><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}</>
                                ) : (
                                  <span className="text-emerald-600 font-bold">NEW</span>
                                )}
                                {r.delivery_fee_cents === 0 && <span className="text-emerald-600 font-bold">· Free</span>}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                    <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-background to-transparent" />
                    </div>
                  </motion.div>
                )}

                {/* Recently viewed */}
                {recentlyViewedIds.length > 0 && (() => {
                  const recents = recentlyViewedIds
                    .map(id => restaurants.find(r => r.id === id))
                    .filter((r): r is typeof restaurants[number] => Boolean(r))
                    .slice(0, 6);
                  if (!recents.length) return null;
                  return (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recently viewed
                      </p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {recents.map(r => (
                          <button type="button" key={r.id}
                            onClick={() => { trackRecentlyViewed(r.id); setSelectedRestaurantId(r.id); setStep("restaurant"); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/30 text-left shrink-0 active:scale-95 transition-transform touch-manipulation hover:border-primary/30">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/15 to-rose-500/10 flex items-center justify-center text-base leading-none shrink-0" aria-hidden>
                              {cuisineEmoji(r.cuisine_type || "")}
                            </div>
                            <div>
                              <p className="text-xs font-semibold truncate max-w-[110px]">{r.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[110px]">{canonicalCuisine(r.cuisine_type)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Promo banners */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="relative -mx-4 px-4"
                >
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 mb-1 snap-x snap-mandatory overscroll-x-contain">
                  <button type="button"
                    onClick={() => { setPromoCode("ZIVO10"); toast.success("Code ZIVO10 ready — apply at checkout"); }}
                    className="snap-start relative overflow-hidden shrink-0 min-w-[260px] sm:min-w-[320px] rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-3 active:scale-[0.98] transition-all duration-300 touch-manipulation text-left">
                    <div className="pointer-events-none absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-90">First order</p>
                      <p className="text-sm font-bold">Save $10 — tap to use <span className="bg-white/20 px-1.5 py-0.5 rounded">ZIVO10</span></p>
                    </div>
                  </button>
                  <button type="button" onClick={() => { setSortBy("recommended"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="relative overflow-hidden shrink-0 min-w-[260px] sm:min-w-[320px] rounded-2xl p-4 bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] transition-all duration-300 flex items-center gap-3 text-left">
                    <div className="pointer-events-none absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-90">Free delivery</p>
                      <p className="text-sm font-bold">On orders over {fmtPrice(20)} today</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => navigate("/zivo-plus")}
                    className="snap-start relative overflow-hidden shrink-0 min-w-[260px] sm:min-w-[320px] rounded-2xl p-4 bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:shadow-violet-500/30 active:scale-[0.98] transition-all duration-300 flex items-center gap-3 text-left">
                    <div className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-90">ZIVO Plus</p>
                      <p className="text-sm font-bold">Unlimited free delivery</p>
                    </div>
                  </button>
                </div>
                <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent" />
                </motion.div>
                <div className="flex justify-center gap-1.5 mb-4">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={cn("h-1.5 rounded-full transition-all duration-500",
                      promoIndex === i ? "w-6 bg-primary" : "w-1.5 bg-muted")} />
                  ))}
                </div>

                {/* Categories */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="relative"
                >
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-3 snap-x overscroll-x-contain">
                  {categories.map(c => (
                    <button type="button" key={c}
                      onClick={() => { setActiveCategory(c); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={cn(
                      "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 touch-manipulation active:scale-95",
                      activeCategory === c
                        ? "bg-ig-gradient text-white shadow-md shadow-primary/30 scale-105"
                        : "bg-muted/50 text-muted-foreground border border-border/40 hover:border-primary/40 hover:text-foreground"
                    )}>{c}</button>
                  ))}
                </div>

                  <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-background to-transparent" />
                </motion.div>
                {/* Dietary filters */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
                  <button type="button"
                    onClick={() => setFavoritesOnly(v => !v)}
                    className={cn(
                      "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 touch-manipulation active:scale-95",
                      favoritesOnly
                        ? "bg-rose-500/15 text-rose-600 border border-rose-500/40 shadow-sm shadow-rose-500/20"
                        : "bg-muted/30 text-muted-foreground border border-border/30 hover:border-rose-500/40 hover:text-foreground"
                    )}>
                    <Heart className={cn("w-3 h-3", favoritesOnly && "fill-rose-500")} /> Favorites
                  </button>
                  <button type="button"
                    onClick={() => setOpenNowOnly(v => !v)}
                    className={cn(
                      "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 touch-manipulation active:scale-95",
                      openNowOnly
                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                        : "bg-muted/30 text-muted-foreground border border-border/30 hover:border-emerald-500/40 hover:text-foreground"
                    )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", openNowOnly ? "bg-emerald-500" : "bg-muted-foreground/40")} /> Open now
                  </button>
                  {([
                    { id: "vegan", label: "Vegan", Icon: Leaf },
                    { id: "vegetarian", label: "Vegetarian", Icon: Leaf },
                    { id: "halal", label: "Halal", Icon: Beef },
                    { id: "glutenfree", label: "Gluten-free", Icon: WheatOff },
                  ]).map(d => {
                    const active = activeDietary === d.id;
                    return (
                      <button type="button" key={d.id}
                        onClick={() => setActiveDietary(active ? null : d.id)}
                        className={cn(
                          "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 touch-manipulation active:scale-95",
                          active
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                            : "bg-muted/30 text-muted-foreground border border-border/30 hover:border-emerald-500/40 hover:text-foreground"
                        )}
                      >
                        {active ? <CheckCircle className="w-3 h-3" /> : <d.Icon className="w-3 h-3" />} {d.label}
                      </button>
                    );
                  })}
                </div>

                {/* Active filters bar (sticky) */}
                {(activeCategory !== "All" || activeDietary || searchQuery || sortBy !== "recommended" || orderMode !== "delivery") && (
                  <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-md border-b border-border/30 flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Filters:</span>
                    {orderMode !== "delivery" && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">{orderMode}</span>
                    )}
                    {activeCategory !== "All" && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">{activeCategory}</span>
                    )}
                    {activeDietary && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">{activeDietary}</span>
                    )}
                    {searchQuery && (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] font-bold">"{searchQuery}"</span>
                    )}
                    <button type="button"
                      onClick={() => { setSearchQuery(""); setActiveCategory("All"); setActiveDietary(null); setSortBy("recommended"); setOrderMode("delivery"); }}
                      className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-bold active:scale-95 touch-manipulation">
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  </div>
                )}

                {/* List / Map view toggle */}
                <div className="flex items-center mb-3">
                  <div className="flex bg-muted/40 rounded-xl p-1 ml-auto">
                    <button type="button" onClick={() => setViewMode("list")}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all touch-manipulation active:scale-95",
                        viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                      <Package className="w-3 h-3" /> List
                    </button>
                    <button type="button" onClick={() => { setViewMode("map"); if (!userCoords) requestLocation(); }}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all touch-manipulation active:scale-95",
                        viewMode === "map" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                      <MapPin className="w-3 h-3" /> Map
                    </button>
                  </div>
                </div>

                {/* Sort */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  {(["recommended", "rating", "time", "nearby"] as const).map(s => {
                    const Icon = s === "recommended" ? Flame : s === "rating" ? Star : s === "time" ? Zap : Navigation;
                    const label = s === "recommended" ? "Recommended" : s === "rating" ? "Top Rated" : s === "time" ? "Fastest" : "Nearby";
                    return (
                      <button type="button" key={s}
                        onClick={() => { setSortBy(s); if (s === "nearby" && !userCoords) requestLocation(); }}
                        className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                          sortBy === s ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground"
                        )}><Icon className="w-3 h-3" /> {label}</button>
                    );
                  })}
                </div>

                {/* Loading skeletons */}
                {loadingRestaurants && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                        <div className="aspect-[16/10] bg-muted/40 animate-pulse" />
                        <div className="p-4 space-y-2">
                          <div className="h-4 w-2/3 rounded bg-muted/40 animate-pulse" />
                          <div className="h-3 w-1/3 rounded bg-muted/30 animate-pulse" />
                          <div className="flex gap-2 mt-2">
                            <div className="h-3 w-12 rounded bg-muted/30 animate-pulse" />
                            <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
                            <div className="h-3 w-12 rounded bg-muted/30 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty */}
                {!loadingRestaurants && filtered.length === 0 && (
                  <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border/60 bg-muted/20">
                    <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-foreground font-bold mb-1">No restaurants match your filters</p>
                    <p className="text-xs text-muted-foreground mb-4">Try clearing filters or searching for something else</p>
                    <button type="button"
                      onClick={() => { setSearchQuery(""); setActiveCategory("All"); setActiveDietary(null); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-xs font-bold active:scale-95 transition-transform touch-manipulation">
                      <X className="w-3.5 h-3.5" /> Clear filters
                    </button>
                  </div>
                )}

                {/* Map view (placeholder) */}
                {viewMode === "map" && !loadingRestaurants && (
                  <div className="relative rounded-2xl overflow-hidden border border-border/40 mb-5 h-[420px] bg-gradient-to-br from-emerald-500/5 via-primary/5 to-orange-500/5">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.4) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
                    {/* Pins */}
                    {filtered.slice(0, 12).map((r, i) => {
                      const x = 10 + ((i * 23) % 80);
                      const y = 10 + ((i * 37) % 75);
                      return (
                        <button type="button" key={r.id}
                          onClick={() => { trackRecentlyViewed(r.id); setSelectedRestaurantId(r.id); setStep("restaurant"); }}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-full group flex flex-col items-center touch-manipulation">
                          <div className="px-2 py-1 rounded-lg bg-background shadow-lg border border-border/40 text-[10px] font-bold text-foreground whitespace-nowrap mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{r.name}</div>
                          <div className="w-9 h-9 rounded-full bg-ig-gradient text-white shadow-lg shadow-primary/30 flex items-center justify-center ring-4 ring-background hover:scale-110 transition-transform">
                            <UtensilsCrossed className="w-4 h-4" />
                          </div>
                        </button>
                      );
                    })}
                    {userCoords && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping w-6 h-6" />
                          <div className="relative w-6 h-6 rounded-full bg-blue-500 ring-4 ring-background shadow-lg" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur border border-border/40 text-[10px] font-bold text-muted-foreground">
                      {filtered.length} restaurants
                    </div>
                  </div>
                )}

                {/* Restaurant List */}
                {viewMode === "list" && (
                <div className="flex flex-col gap-2">
                  {filtered.map((restaurant, i) => (
                    <motion.div key={restaurant.id} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ type: "spring", stiffness: 340, damping: 28, delay: Math.min(i, 5) * 0.04 }}>
                      <div className="group relative rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/8 transition-all duration-200">
                        <button type="button" onClick={() => { trackRecentlyViewed(restaurant.id); setSelectedRestaurantId(restaurant.id); setStep("restaurant"); }} className="flex items-center gap-3 w-full text-left px-3 py-3 touch-manipulation active:scale-[0.99]">
                          {/* Thumbnail */}
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted/30 shrink-0">
                            {restaurant.cover_image_url ? (
                              <img src={restaurant.cover_image_url} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-rose-500/10">
                                <UtensilsCrossed className="w-6 h-6 text-foreground/40" />
                              </div>
                            )}
                            {!restaurant.is_open && (
                              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="text-[8px] font-black uppercase tracking-wider text-destructive">Closed</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-extrabold text-sm truncate leading-tight">{restaurant.name}</span>
                              {restaurant.is_open && ((restaurant.rating_count ?? 0) > 5 || (restaurant.rating ?? 0) >= 4.5) && (
                                <Flame className="w-3 h-3 text-rose-500 shrink-0" />
                              )}
                              {restaurant.delivery_fee_cents === 0 && (
                                <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">Free</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                              <span className="truncate max-w-[80px]">{canonicalCuisine(restaurant.cuisine_type)}</span>
                              <span className="text-border">·</span>
                              {restaurant.rating != null && restaurant.rating > 0 && (restaurant.rating_count ?? 0) > 0 ? (
                                <span className="flex items-center gap-0.5 shrink-0"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><span className="font-semibold text-foreground/80">{restaurant.rating.toFixed(1)}</span></span>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">New</span>
                              )}
                              <span className="text-border">·</span>
                              <span className="flex items-center gap-0.5 shrink-0"><Clock className="w-3 h-3" />{restaurant.avg_prep_time ?? 25}–{(restaurant.avg_prep_time ?? 25) + 15}m</span>
                              <span className="text-border">·</span>
                              <span className="flex items-center gap-0.5 shrink-0">
                                <Truck className="w-3 h-3" />
                                {restaurant.delivery_fee_cents === 0
                                  ? <span className="text-emerald-600 font-semibold">Free</span>
                                  : fmtPrice((restaurant.delivery_fee_cents ?? 399) / 100)}
                              </span>
                              {userCoords && (restaurant as { lat?: number | null; lng?: number | null }).lat != null && (
                                <>
                                  <span className="text-border">·</span>
                                  <span className="shrink-0">{haversineKm(userCoords, { lat: (restaurant as { lat: number }).lat, lng: (restaurant as { lng: number }).lng }).toFixed(1)} km</span>
                                </>
                              )}
                            </div>
                          </div>
                          {/* Chevron */}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                        </button>
                        {/* Hover action buttons */}
                        <div className="absolute top-1/2 -translate-y-1/2 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(restaurant.id); }}
                            className="w-7 h-7 rounded-full bg-card/90 backdrop-blur border border-border/40 flex items-center justify-center touch-manipulation active:scale-90 shadow-sm">
                            <Heart className={cn("w-3.5 h-3.5 transition-all", favorites.has(restaurant.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                          </button>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(`/eats/reserve?restaurantId=${restaurant.id}&restaurantName=${encodeURIComponent(restaurant.name)}`); }}
                            className="h-7 px-2 rounded-full bg-orange-500/90 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 touch-manipulation active:scale-95">
                            <CalendarCheck className="w-3 h-3" /> Reserve
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
            </section>

            {/* Become a partner CTA */}
            {!loadingRestaurants && filtered.length > 0 && (
              <section className="pb-12 pt-4">
                <div className="container mx-auto px-4 max-w-6xl">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  >
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-primary p-6 sm:p-10 text-white shadow-xl shadow-primary/20">
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-amber-300/20 blur-3xl" />
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">For Restaurants</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-1">Grow your restaurant with ZIVO</h3>
                        <p className="text-sm opacity-90 max-w-md">Reach new customers, manage orders in one place, and get paid weekly with zero setup fees.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("/become-partner")}
                        className="group px-5 py-3 rounded-2xl bg-white text-foreground font-bold text-sm shadow-lg active:scale-[0.97] transition-transform touch-manipulation whitespace-nowrap inline-flex items-center gap-2"
                      >
                        Become a partner
                        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </button>
                    </div>
                  </div>
                  </motion.div>
                </div>
              </section>
            )}

            {cartCount > 0 && (
              <motion.button initial={{ y: 100 }} animate={{ y: 0 }} whileHover={{ y: -2 }} onClick={() => setStep("cart")}
                className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 font-bold text-sm touch-manipulation active:scale-[0.97] transition-shadow">
                <div className="flex -space-x-2">
                  {cart.slice(0, 3).map((it, idx) => (
                    <div key={it.menuItemId} className="w-8 h-8 rounded-full bg-white/30 ring-2 ring-primary overflow-hidden flex items-center justify-center" style={{ zIndex: 3 - idx }}>
                      {it.imageUrl
	                        ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        : <UtensilsCrossed className="w-3.5 h-3.5 text-white" />}
                    </div>
                  ))}
                  {cart.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-white/20 ring-2 ring-primary flex items-center justify-center text-[10px] font-bold">+{cart.length - 3}</div>
                  )}
                </div>
                <span>View Cart</span>
                <motion.span key={cartCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[11px] tabular-nums">{cartCount}</motion.span>
                <motion.span key={`t-${cartTotal}`} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="font-bold tabular-nums">{fmtPrice(cartTotal)}</motion.span>
              </motion.button>
            )}

            {/* Notification opt-in banner */}
            {showNotifPrompt && cartCount === 0 && (
              <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40 w-[min(560px,calc(100%-2rem))] rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-xl shadow-violet-500/30 px-4 py-3 flex items-center gap-3"
                style={{ bottom: `calc(var(--zivo-safe-bottom,0px) + 24px)` }}>
                <Sparkles className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">Get order updates</p>
                  <p className="text-[10px] opacity-90">Know exactly when your food arrives</p>
                </div>
                <button type="button" onClick={requestNotifications}
                  className="px-3 py-1.5 rounded-lg bg-white text-foreground text-xs font-bold active:scale-95 transition-transform">
                  Enable
                </button>
                <button type="button"
                  onClick={() => { setShowNotifPrompt(false); try { localStorage.setItem(NOTIF_DISMISS_KEY, "1"); } catch {} }}
                  aria-label="Dismiss" className="opacity-70 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PWA install banner */}
            {pwaPrompt && !pwaDismissed && (
              <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40 w-[min(560px,calc(100%-2rem))] rounded-2xl bg-foreground text-background shadow-xl shadow-foreground/30 px-4 py-3 flex items-center gap-3"
                style={{ bottom: `calc(var(--zivo-safe-bottom,0px) + ${cartCount > 0 ? 96 : 24}px)` }}>
                <Sparkles className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">Install ZIVO Eats</p>
                  <p className="text-[10px] opacity-80">Faster checkout, save items, push updates</p>
                </div>
                <button type="button"
                  onClick={async () => { try { await pwaPrompt.prompt(); } catch {} setPwaPrompt(null); }}
                  className="px-3 py-1.5 rounded-lg bg-background text-foreground text-xs font-bold active:scale-95 transition-transform">
                  Install
                </button>
                <button type="button"
                  onClick={() => { setPwaDismissed(true); try { localStorage.setItem(PWA_DISMISS_KEY, "1"); } catch {} }}
                  aria-label="Dismiss"
                  className="opacity-60 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Floating help button — group lets us reveal label on hover */}
            <div className="fixed right-4 z-30 group flex flex-col items-end"
              style={{ bottom: `calc(var(--zivo-safe-bottom,0px) + ${cartCount > 0 ? 96 : 24}px)` }}>
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-foreground text-background text-[11px] font-bold shadow-lg shadow-foreground/20 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
                Need help?
              </div>
              <button type="button"
                onClick={() => navigate("/help")}
                aria-label="Help"
                className="w-12 h-12 rounded-full bg-foreground text-background shadow-xl shadow-foreground/20 flex items-center justify-center active:scale-90 hover:scale-110 transition-all touch-manipulation">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Back to top */}
            <AnimatePresence>
              {showBackToTop && (
                <motion.button type="button"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  aria-label="Back to top"
                  style={{ bottom: `calc(var(--zivo-safe-bottom,0px) + ${cartCount > 0 ? 156 : 84}px)` }}
                  className="fixed right-4 z-30 w-10 h-10 rounded-full bg-card border border-border/40 shadow-lg flex items-center justify-center text-muted-foreground active:scale-90 transition-transform touch-manipulation">
                  <ArrowLeft className="w-4 h-4 rotate-90" />
                </motion.button>
              )}
            </AnimatePresence>
            <Footer />
          </motion.div>
        )}

        {/* ═══ RESTAURANT DETAIL ═══ */}
        {step === "restaurant" && currentRestaurant && (
          <motion.div key="restaurant" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="min-h-screen pb-32">
            <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/30">
              <div className="px-4 py-3 flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack} className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </motion.button>
                <div className="flex-1">
                  <h1 className="text-base font-bold text-ig-gradient">{currentRestaurant.name}</h1>
                  <p className="text-[10px] text-muted-foreground">{canonicalCuisine(currentRestaurant.cuisine_type)} · {currentRestaurant.avg_prep_time ?? 25}-{(currentRestaurant.avg_prep_time ?? 25) + 15} min</p>
                </div>
                <button type="button" onClick={() => toggleFavorite(currentRestaurant.id)}
                  className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
                  <Heart className={cn("w-5 h-5", favorites.has(currentRestaurant.id) ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                </button>
                <button type="button"
                  onClick={() => openShareToChat({
                    kind: "eats",
                    title: currentRestaurant.name,
                    subtitle: `${canonicalCuisine(currentRestaurant.cuisine_type)} · ${currentRestaurant.avg_prep_time ?? 25}-${(currentRestaurant.avg_prep_time ?? 25) + 15} min`,
                    meta: (currentRestaurant as { delivery_fee?: number | null }).delivery_fee != null ? ((currentRestaurant as { delivery_fee?: number | null }).delivery_fee === 0 ? "Free delivery" : `$${(currentRestaurant as { delivery_fee?: number | null }).delivery_fee} delivery`) : undefined,
                    deepLink: "/eats",
                    image: currentRestaurant.cover_image_url ?? null,
                  })}
                  aria-label="Share to chat"
                  className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation"
                >
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                </button>
                {currentRestaurant.rating != null && currentRestaurant.rating > 0 && (currentRestaurant.rating_count ?? 0) > 0 ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {currentRestaurant.rating.toFixed(1)}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">New</span>
                )}
                <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  currentRestaurant.is_open
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-destructive/10 text-destructive")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", currentRestaurant.is_open ? "bg-emerald-500" : "bg-destructive")} />
                  {currentRestaurant.is_open ? "Open" : "Closed"}
                </span>
              </div>
              <EatsStepIndicator currentStep="restaurant" />
            </div>

            {/* Cover image */}
            <div className="relative h-48 overflow-hidden bg-muted/20">
              {currentRestaurant.cover_image_url ? (
	                <img src={currentRestaurant.cover_image_url} alt={currentRestaurant.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-rose-500/10 relative">
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full bg-white/30 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full bg-orange-300/30 blur-3xl" />
                  <UtensilsCrossed className="w-16 h-16 text-foreground/40 relative" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/60 relative">{canonicalCuisine(currentRestaurant.cuisine_type)}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                {currentRestaurant.delivery_fee_cents === 0 && (
                  <Badge className="bg-ig-gradient text-white text-[10px] font-bold gap-1"><Truck className="w-3 h-3" /> Free Delivery</Badge>
                )}
                <Badge variant="outline" className="bg-card/80 backdrop-blur text-[10px] font-bold gap-1"><Timer className="w-3 h-3" /> {currentRestaurant.avg_prep_time ?? 25}m prep</Badge>
              </div>
            </div>

            {/* Quick actions: Reserve · Ride · Call (if phone) */}
            <div className="px-4 pt-4 max-w-lg mx-auto">
              <div className={cn("grid gap-2", (currentRestaurant as { phone?: string | null }).phone ? "grid-cols-3" : "grid-cols-2")}>
                <button type="button"
                  onClick={() =>
                    navigate(
                      `/eats/reserve?restaurantId=${currentRestaurant.id}&restaurantName=${encodeURIComponent(currentRestaurant.name)}`,
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 active:scale-[0.98] transition-all py-3 touch-manipulation"
                >
                  <CalendarCheck className="w-4 h-4 text-foreground" />
                  <span className="text-[11px] font-bold text-foreground">Reserve</span>
                </button>
                <button type="button"
                  onClick={() =>
                    navigate(
                      `/rides/hub?destination=${encodeURIComponent(currentRestaurant.name)}`,
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 active:scale-[0.98] transition-all py-3 touch-manipulation"
                >
                  <Car className="w-4 h-4 text-foreground" />
                  <span className="text-[11px] font-bold text-foreground">Ride here</span>
                </button>
                {(currentRestaurant as { phone?: string | null }).phone && (
                  <a
                    href={`tel:${(currentRestaurant as { phone?: string | null }).phone}`}
                    className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 active:scale-[0.98] transition-all py-3 touch-manipulation"
                  >
                    <Phone className="w-4 h-4 text-foreground" />
                    <span className="text-[11px] font-bold text-foreground">Call</span>
                  </a>
                )}
              </div>
            </div>

            {/* Description */}
            {currentRestaurant.description && (
              <div className="px-4 pt-4 max-w-lg mx-auto">
                <p className="text-xs text-muted-foreground">{currentRestaurant.description}</p>
              </div>
            )}

            {/* Hours row */}
            {((currentRestaurant as { hours?: string | null }).hours) && (
              <div className="px-4 pt-4 max-w-lg mx-auto">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hours</p>
                    <p className="text-xs text-foreground">{(currentRestaurant as { hours?: string | null }).hours}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Address row → opens in ZIVO map (not external Google Maps) */}
            {currentRestaurant.address && (
              <div className="px-4 pt-4 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => navigate(zivoRouteUrl({
                    lat: (currentRestaurant as { latitude?: number | null }).latitude,
                    lng: (currentRestaurant as { longitude?: number | null }).longitude,
                    label: currentRestaurant.name,
                    address: currentRestaurant.address,
                  }))}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-colors touch-manipulation"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</p>
                    <p className="text-xs text-foreground truncate">{currentRestaurant.address}</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary">Open map →</span>
                </button>
              </div>
            )}

            {/* Ratings & reviews */}
            <div className="px-4 pt-5 max-w-lg mx-auto">
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Ratings & reviews
                  </h3>
                  {(currentRestaurant.rating_count ?? 0) > 0 && (
                    <span className="text-[11px] font-bold text-muted-foreground">{currentRestaurant.rating_count} reviews</span>
                  )}
                </div>
                {(currentRestaurant.rating_count ?? 0) > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl font-bold text-foreground">{(currentRestaurant.rating ?? 0).toFixed(1)}</div>
                      <div className="flex-1">
                        <div className="flex gap-0.5 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={cn("w-3.5 h-3.5", i <= Math.round(currentRestaurant.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Based on {currentRestaurant.rating_count} customer reviews</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No reviews yet — be the first to order and rate.</p>
                )}
              </div>
            </div>

            {/* Menu */}
            <div className="px-4 py-6 max-w-lg mx-auto space-y-3">
              <h2 className="text-lg font-bold text-foreground mb-4">Menu</h2>

              {loadingMenu && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-card border border-border/40 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-muted/40 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-3/4 rounded bg-muted/30 animate-pulse" />
                        <div className="h-4 w-12 rounded bg-muted/30 animate-pulse" />
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-muted/40 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {!loadingMenu && menuItems.length === 0 && (
                <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-border/60 bg-muted/20">
                  <UtensilsCrossed className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground mb-1">Menu coming soon</p>
                  <p className="text-xs text-muted-foreground mb-4">{currentRestaurant.name} hasn't published their menu yet.</p>
                  <button type="button" onClick={handleBack}
                    className="text-xs font-bold text-primary hover:underline">
                    ← Browse other restaurants
                  </button>
                </div>
              )}

              {(() => {
                const featuredItems = menuItems.filter(m => m.is_featured).slice(0, 6);
                if (!featuredItems.length || loadingMenu) return null;
                return (
                  <div className="-mx-4 px-4 mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Featured
                    </p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                      {featuredItems.map(item => {
                        const inCart = cart.find(c => c.menuItemId === item.id);
                        return (
                          <div key={`feat-${item.id}`}
                            className="shrink-0 w-40 rounded-2xl bg-card border border-border/40 p-3 text-left transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 relative">
                            {item.image_url ? (
	                              <img src={item.image_url} alt={item.name} className="w-full h-20 rounded-lg object-cover mb-2" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-full h-20 rounded-lg mb-2 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-rose-500/10 flex items-center justify-center">
                                <UtensilsCrossed className="w-6 h-6 text-foreground/40" />
                              </div>
                            )}
                            <p className="text-xs font-bold text-foreground line-clamp-1">{item.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs font-bold text-primary">{fmtPrice(item.price)}</p>
                              {inCart ? (
                                <div className="flex items-center gap-1">
                                  <button type="button" aria-label="Decrease" onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center active:scale-90"><Minus className="w-3 h-3" /></button>
                                  <span className="text-xs font-bold w-4 text-center tabular-nums">{inCart.quantity}</span>
                                  <button type="button" aria-label="Increase" onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full bg-ig-gradient text-white flex items-center justify-center active:scale-90"><Plus className="w-3 h-3" /></button>
                                </div>
                              ) : (
                                <button type="button"
                                  onClick={() => addToCart(item, currentRestaurant!.id)}
                                  aria-label="Add"
                                  className="w-7 h-7 rounded-full bg-ig-gradient text-white flex items-center justify-center active:scale-90 hover:shadow-md hover:shadow-primary/30 transition-shadow">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                if (loadingMenu) return null;
                const groups = new Map<string, typeof menuItems>();
                for (const m of menuItems) {
                  const cat = (m.category || "Menu").trim() || "Menu";
                  if (!groups.has(cat)) groups.set(cat, []);
                  groups.get(cat)!.push(m);
                }
                const ordered = Array.from(groups.entries());
                if (ordered.length <= 1) {
                  return menuItems.map((item, i) => renderMenuItem(item, i));
                }
                return ordered.map(([cat, items]) => (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-2 sticky top-[88px] bg-background/95 backdrop-blur-sm py-2 z-10 -mx-4 px-4 border-b border-border/20">{cat}</h3>
                    {items.map((item, i) => renderMenuItem(item, i))}
                  </div>
                ));
              })()}
            </div>

            {cartCount > 0 && (
              <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-2xl border-t border-border/30 safe-area-bottom">
                <Button onClick={() => setStep("cart")} className="w-full h-14 text-base font-bold gap-3 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]">
                  <ShoppingCart className="w-5 h-5" /> View Cart · {cartCount} items <span className="ml-auto">{fmtPrice(cartTotal)}</span>
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ CART ═══ */}
        {step === "cart" && (
          <motion.div key="cart" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="min-h-screen pb-36">

            {/* Header */}
            <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/20">
              <div className="px-3 h-14 flex items-center gap-2 max-w-6xl mx-auto">
                <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack}
                  className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation shrink-0">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </motion.button>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-base tracking-tight">
                    Your <span className="text-ig-gradient">Cart</span>
                  </span>
                  {cartCount > 0 && (
                    <motion.span key={cartCount} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-orange-500 px-1.5 text-[10px] font-black text-white">
                      {cartCount}
                    </motion.span>
                  )}
                </div>
                {cart.length > 0 && (
                  <button type="button"
                    onClick={() => {
                      const snapshot = cart;
                      setCart([]);
                      toast.success("Cart cleared", { action: { label: "Undo", onClick: () => setCart(snapshot) } });
                    }}
                    aria-label="Clear cart"
                    className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-destructive touch-manipulation active:scale-90">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <EatsStepIndicator currentStep="cart" />
            </div>

            {cart.length === 0 ? (
              /* ── EMPTY STATE ── */
              <div className="px-4 pb-8 max-w-lg mx-auto">
                <div className="relative mt-10 mb-6 flex justify-center">
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full bg-orange-500/10 blur-3xl" />
                  </div>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-orange-500/15 to-rose-500/10 border border-orange-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-orange-500/60" />
                  </motion.div>
                </div>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-black text-foreground mb-1">Nothing here yet</h2>
                  <p className="text-sm text-muted-foreground">Pick a restaurant and add your favorites</p>
                </div>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep("browse")}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mb-8">
                  <UtensilsCrossed className="w-4 h-4" /> Browse Restaurants
                </motion.button>
                {restaurants.length > 0 && (
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">Popular near you</p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 overscroll-x-contain">
                      {restaurants.slice(0, 6).map((r, i) => (
                        <motion.button type="button" key={r.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { trackRecentlyViewed(r.id); setSelectedRestaurantId(r.id); setStep("restaurant"); }}
                          className="snap-start shrink-0 w-44 rounded-2xl bg-card border border-border/40 overflow-hidden active:scale-[0.97] touch-manipulation text-left">
                          {r.cover_image_url ? (
                            <img src={r.cover_image_url} alt={r.name} className="w-full h-24 object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-orange-500/20 to-rose-500/10 flex items-center justify-center">
                              <UtensilsCrossed className="w-8 h-8 text-orange-500/40" />
                            </div>
                          )}
                          <div className="p-2.5">
                            <p className="text-xs font-extrabold text-foreground truncate">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{canonicalCuisine(r.cuisine_type)} · {r.avg_prep_time ?? 25}–{(r.avg_prep_time ?? 25) + 15} min</p>
                            {r.rating != null && r.rating > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-600">{r.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── FILLED STATE ── */
              <div className="px-4 pt-4 pb-4 max-w-lg mx-auto space-y-3">

                {/* Restaurant banner */}
                {currentRestaurant && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-orange-500/8 to-rose-500/5 border border-orange-500/20">
                    {currentRestaurant.cover_image_url ? (
                      <img src={currentRestaurant.cover_image_url} alt={currentRestaurant.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5 text-orange-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm text-foreground truncate">{currentRestaurant.name}</p>
                      <p className="text-[10px] text-muted-foreground">{canonicalCuisine(currentRestaurant.cuisine_type)} · {currentRestaurant.avg_prep_time ?? 25}–{(currentRestaurant.avg_prep_time ?? 25) + 15} min</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Timer className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-primary">{(currentRestaurant.avg_prep_time ?? 25) + 10}–{(currentRestaurant.avg_prep_time ?? 25) + 20} min</span>
                    </div>
                  </motion.div>
                )}

                {/* Free-delivery progress */}
                {deliveryFee > 0 && (() => {
                  const threshold = 20;
                  const remaining = Math.max(0, threshold - cartTotal);
                  const pct = Math.min(100, (cartTotal / threshold) * 100);
                  return (
                    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-bold text-foreground flex-1">
                          {remaining > 0
                            ? <>Add <span className="text-emerald-600">{fmtPrice(remaining)}</span> for free delivery</>
                            : <span className="text-emerald-600">Free delivery unlocked!</span>}
                        </p>
                        <span className="text-[10px] font-black text-emerald-600">{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-emerald-500/15 overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Cart items */}
                <AnimatePresence>
                  {cart.map((item, i) => {
                    const note = specialInstructions[item.menuItemId];
                    return (
                      <motion.div key={item.menuItemId}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        transition={{ delay: i * 0.04 }}
                        layout
                        className="p-3 rounded-2xl bg-card border border-border/40">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name}
                              className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br from-orange-500/15 to-rose-500/10 flex items-center justify-center">
                              <UtensilsCrossed className="w-5 h-5 text-foreground/30" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-foreground truncate">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtPrice(item.price)} each</p>
                            {note && note.trim() && (
                              <p className="text-[10px] text-muted-foreground italic mt-0.5 flex items-center gap-1 truncate">
                                <MessageSquare className="w-3 h-3 shrink-0" /> {note}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="font-extrabold text-sm text-foreground">{fmtPrice(item.price * item.quantity)}</span>
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label="Decrease" onClick={() => updateQuantity(item.menuItemId, -1)}
                                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center touch-manipulation active:scale-90">
                                <Minus className="w-3 h-3" />
                              </button>
                              <motion.span key={item.quantity} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                className="text-sm font-black w-5 text-center">{item.quantity}</motion.span>
                              <button type="button" aria-label="Increase" onClick={() => updateQuantity(item.menuItemId, 1)}
                                className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center touch-manipulation active:scale-90">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add more */}
                <button type="button" onClick={() => setStep("restaurant")}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-border/50 text-xs font-extrabold text-muted-foreground hover:text-foreground hover:border-orange-500/40 transition-all touch-manipulation active:scale-[0.98]">
                  <Plus className="w-3.5 h-3.5" /> Add more items
                </button>

                {/* Skip utensils */}
                <div className="rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3">
                  <button type="button" onClick={() => setNoUtensils(!noUtensils)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", noUtensils ? "bg-emerald-500" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", noUtensils ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Skip utensils
                    </p>
                    <p className="text-[10px] text-muted-foreground">Reduce plastic waste</p>
                  </div>
                </div>

                {/* Upsell */}
                {(() => {
                  const threshold = 20;
                  const remaining = Math.max(0, threshold - cartTotal);
                  if (remaining === 0 || remaining > 8 || cart.length === 0) return null;
                  const popularExtras = menuItems
                    .filter(m => m.price <= remaining + 1 && !cart.some(c => c.menuItemId === m.id))
                    .slice(0, 3);
                  if (!popularExtras.length) return null;
                  return (
                    <div className="rounded-2xl bg-amber-500/5 border border-amber-500/25 p-3 space-y-2">
                      <p className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Add {fmtPrice(remaining)} more for free delivery
                      </p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 overscroll-x-contain">
                        {popularExtras.map(m => (
                          <button type="button" key={m.id}
                            onClick={() => addToCart(m, cart[0].restaurantId)}
                            className="snap-start shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 hover:border-amber-500/40 active:scale-95 transition-all touch-manipulation">
                            <Plus className="w-3 h-3 text-amber-600" />
                            <div className="text-left">
                              <p className="text-xs font-extrabold text-foreground truncate max-w-[100px]">{m.name}</p>
                              <p className="text-[10px] text-amber-600 font-bold">{fmtPrice(m.price)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Order summary */}
                <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/20 bg-muted/20">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">Order summary</p>
                  </div>
                  <div className="p-4 space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-extrabold">{fmtPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery</span>
                      <span className="font-extrabold">{deliveryFee === 0 ? <span className="text-emerald-600">Free</span> : fmtPrice(deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="font-extrabold">{fmtPrice(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border/20">
                      <span className="font-extrabold text-base">Total</span>
                      <motion.span key={cartTotal + deliveryFee + serviceFee} initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                        className="font-black text-xl text-primary">{fmtPrice(cartTotal + deliveryFee + serviceFee)}</motion.span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Checkout CTA */}
            {cart.length > 0 && (() => {
              const minOrderCents = (currentRestaurant as { min_order_cents?: number | null } | null)?.min_order_cents ?? 0;
              const minOrder = minOrderCents / 100;
              const belowMin = minOrder > 0 && cartTotal < minOrder;
              return (
                <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] bg-background/95 backdrop-blur-2xl border-t border-border/20">
                  {belowMin && (
                    <p className="text-center text-xs font-extrabold text-amber-600 mb-2 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Add {fmtPrice(minOrder - cartTotal)} more (min {fmtPrice(minOrder)})
                    </p>
                  )}
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => belowMin ? toast.error(`Minimum order is $${minOrder.toFixed(2)}`) : setStep("checkout")}
                    disabled={belowMin}
                    className={cn("w-full h-14 rounded-2xl font-extrabold text-base flex items-center justify-between px-5 shadow-lg",
                      belowMin ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-orange-500/30"
                    )}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      <span>{belowMin ? "Min required" : "Checkout"}</span>
                    </div>
                    <span className="font-black">{fmtPrice(cartTotal + deliveryFee + serviceFee)}</span>
                  </motion.button>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ═══ CHECKOUT ═══ */}
        {step === "checkout" && (
          <motion.div key="checkout" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="min-h-screen pb-32">
            <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/30">
              <div className="px-4 py-3 flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.88 }} onClick={handleBack} className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </motion.button>
                <h1 className="text-base font-bold text-ig-gradient">Checkout</h1>
              </div>
              <EatsStepIndicator currentStep="checkout" />
            </div>

            <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
              {/* Delivery Address */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Delivery Address</h3>
                {savedAddresses.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
                    {savedAddresses.map(a => (
                      <button type="button" key={a} onClick={() => setDeliveryAddress(a)}
                        className={cn("shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all touch-manipulation active:scale-95 max-w-[200px] truncate",
                          deliveryAddress === a ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/30")}>
                        <MapPin className="w-3 h-3 inline mr-1" />{a}
                      </button>
                    ))}
                  </div>
                )}
                <Input placeholder="Enter delivery address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} onBlur={(e) => persistAddress(e.target.value)} className="h-12 rounded-xl" />
                <Input placeholder="Delivery instructions (e.g., buzz #204)" value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} className="h-10 rounded-xl text-sm" />
                <div className="flex items-center gap-3 pt-1">
                  <button type="button" onClick={() => setContactlessDelivery(!contactlessDelivery)}
                    className={cn("w-10 h-6 rounded-full transition-all relative shrink-0", contactlessDelivery ? "bg-primary" : "bg-muted/60")}>
                    <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", contactlessDelivery ? "left-[18px]" : "left-0.5")} />
                  </button>
                  <p className="text-xs font-medium text-foreground">Contactless delivery</p>
                </div>
              </div>

              {/* Schedule order */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarCheck className="w-3 h-3" /> When</h3>
                <div className="flex bg-muted/40 rounded-xl p-1 mb-2">
                  <button type="button" onClick={() => setScheduleMode("now")}
                    className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation active:scale-95",
                      scheduleMode === "now" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                    ASAP
                  </button>
                  <button type="button" onClick={() => setScheduleMode("later")}
                    className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation active:scale-95",
                      scheduleMode === "later" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                    Schedule
                  </button>
                </div>
                {scheduleMode === "later" && (() => {
                  const slots: { iso: string; label: string }[] = [];
                  const now = new Date();
                  // 30-min slots starting 1h from now, next 8 slots
                  const next = new Date(Math.ceil((now.getTime() + 60 * 60 * 1000) / (30 * 60 * 1000)) * 30 * 60 * 1000);
                  for (let i = 0; i < 8; i++) {
                    const d = new Date(next.getTime() + i * 30 * 60 * 1000);
                    slots.push({
                      iso: d.toISOString().slice(0, 16),
                      label: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                    });
                  }
                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pick a slot</p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {slots.map(s => (
                          <button type="button" key={s.iso}
                            onClick={() => setScheduleTime(s.iso)}
                            className={cn("shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                              scheduleTime === s.iso
                                ? "bg-ig-gradient text-white shadow-md"
                                : "bg-muted/40 text-muted-foreground border border-border/30")}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <Input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-10 rounded-xl text-sm" />
                    </div>
                  );
                })()}
              </div>

              {/* Delivery Speed */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Truck className="w-3 h-3" /> Delivery speed</h3>
                <div className="space-y-2">
                  {deliverySpeedOptions.map(opt => (
                    <button type="button" key={opt.id} onClick={() => setSelectedSpeed(opt.id)}
                      className={cn("w-full flex items-center justify-between p-3 rounded-xl transition-all touch-manipulation active:scale-[0.98]",
                        selectedSpeed === opt.id ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-border/30")}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{opt.label}</span>
                        {opt.badge && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{opt.badge}</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">{opt.time}</span>
                        {opt.extraCost > 0 && <span className="text-[10px] text-primary font-bold block">+{fmtPrice(opt.extraCost)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Payment method</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {([
                    { id: "card" as const, label: "Card", Icon: CreditCard },
                    { id: "applepay" as const, label: "Apple Pay", Icon: Smartphone },
                    { id: "googlepay" as const, label: "Google Pay", Icon: Smartphone },
                    { id: "cash" as const, label: "Cash", Icon: Banknote },
                    { id: "wallet" as const, label: fmtPrice(walletBalanceCents / 100), Icon: Wallet },
                    { id: "paypal" as const, label: "PayPal", Icon: CreditCard },
                    { id: "square" as const, label: "Square", Icon: CreditCard },
                  ]).map(p => (
                    <button type="button" key={p.id} onClick={() => {
                      if (p.id === "wallet" && walletBalanceCents < Math.round(grandTotal * 100)) {
                        toast.error(`Insufficient wallet balance ($${(walletBalanceCents / 100).toFixed(2)})`);
                        return;
                      }
                      setPaymentType(p.id);
                    }}
                      className={cn("flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95",
                        paymentType === p.id ? "bg-ig-gradient text-white shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40",
                        p.id === "wallet" && walletBalanceCents < Math.round(grandTotal * 100) && "opacity-50")}>
                      <p.Icon className="w-4 h-4" />
                      {p.label}
                    </button>
                  ))}
                </div>
                {(paymentType === "paypal" || paymentType === "square") && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    You'll be redirected to {paymentType === "paypal" ? "PayPal" : "Square"} to confirm payment, then come right back to track your order.
                  </p>
                )}
              </div>

              {/* Tip */}
              <div className="rounded-2xl bg-card border border-border/40 p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Driver tip</h3>
                <div className="flex gap-2">
                  {tipOptions.map(t => {
                    const tipPreviewAmt = t.id === "custom" ? null : Math.round(cartTotal * t.pct * 100) / 100;
                    return (
                      <button type="button" key={t.id} onClick={() => setSelectedTip(t.id)}
                        className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation active:scale-95 flex flex-col items-center gap-0.5",
                          selectedTip === t.id ? "bg-ig-gradient text-white shadow-md" : "bg-muted/50 text-muted-foreground border border-border/40")}>
                        <span>{t.label}</span>
                        {tipPreviewAmt != null && tipPreviewAmt > 0 && (
                          <span className={cn("text-[9px] font-medium", selectedTip === t.id ? "opacity-90" : "opacity-60")}>{fmtPrice(tipPreviewAmt)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedTip === "custom" && (
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                    <Input
                      type="number" inputMode="decimal" min="0" step="0.50" placeholder="0.00"
                      value={customTipAmount}
                      onChange={(e) => setCustomTipAmount(e.target.value)}
                      className="pl-7 h-10 rounded-xl text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Promo Code */}
              <div className={cn("rounded-2xl border p-4 transition-colors",
                promoApplied ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card border-border/40")}>
                <h3 className={cn("text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5",
                  promoApplied ? "text-emerald-600" : "text-muted-foreground")}>
                  {promoApplied ? <CheckCircle className="w-3 h-3" /> : <Percent className="w-3 h-3" />}
                  {promoApplied ? "Promo applied" : "Promo code"}
                </h3>
                <div className="flex gap-2">
                  <Input placeholder="Enter promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)}
                    disabled={promoApplied} className="h-10 rounded-xl flex-1 text-sm" />
                  {promoApplied ? (
                    <Button variant="outline" size="sm"
                      onClick={() => { setPromoApplied(false); setPromoData(null); setPromoCode(""); }}
                      className="rounded-xl h-10 px-4 text-xs font-bold">
                      <X className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  ) : (
                    <Button variant="default" size="sm"
                      onClick={async () => {
                        if (!promoCode.trim()) return;
                        // Validate promo code against DB
                        const { data: promo } = await (supabase as any)
                          .from("promo_codes")
                          .select("id, discount_type, discount_value, is_active, min_fare, expires_at")
                          .eq("code", promoCode.trim().toUpperCase())
                          .eq("is_active", true)
                          .maybeSingle() as { data: any };
                        if (!promo) {
                          toast.error("Invalid or expired promo code");
                          return;
                        }
                        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                          toast.error("This promo code has expired");
                          return;
                        }
                        if (promo.min_fare && cartTotal < promo.min_fare) {
                          toast.error(`Minimum order $${Number(promo.min_fare).toFixed(2)} required`);
                          return;
                        }
                        setPromoApplied(true);
                        // promo_codes stores discount_type + discount_value (dollars), not the
                        // percent/cents pair this used to select.
                        setPromoData(
                          promo.discount_type === "percent"
                            ? { discount_percent: Number(promo.discount_value), discount_amount_cents: null }
                            : { discount_percent: null, discount_amount_cents: Math.round(Number(promo.discount_value) * 100) },
                        );
                        toast.success("Promo applied!");
                      }}
                      disabled={!promoCode.trim()} className="rounded-xl h-10 px-4 text-xs font-bold">
                      Apply
                    </Button>
                  )}
                </div>
              </div>

              {/* Final Total */}
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-bold">{fmtPrice(cartTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-bold">{deliveryFee === 0 ? <span className="text-primary">Free</span> : fmtPrice(deliveryFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="font-bold">{fmtPrice(serviceFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (10%)</span><span className="font-bold">{fmtPrice(taxAmount)}</span></div>
                {speedExtra > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Priority fee</span><span className="font-bold">{fmtPrice(speedExtra)}</span></div>}
                {tipAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Driver tip</span><span className="font-bold">{fmtPrice(tipAmount)}</span></div>}
                {promoDiscount > 0 && <div className="flex justify-between text-primary"><span className="font-bold flex items-center gap-1"><Percent className="w-3 h-3" /> Promo</span><span className="font-bold">-{fmtPrice(promoDiscount)}</span></div>}
                <div className="flex justify-between pt-3 border-t border-border/30">
                  <span className="font-bold text-base">Total</span>
                  <span className="font-bold text-xl text-primary">{fmtPrice(grandTotal)}</span>
                </div>
              </div>

              {/* ETA */}
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
                <Timer className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Estimated delivery: {currentRestaurant ? `${(currentRestaurant.avg_prep_time ?? 25) + 10}-${(currentRestaurant.avg_prep_time ?? 25) + 20} min` : "25-35 min"}
                  </p>
                  <p className="text-xs text-muted-foreground">Your order will be prepared fresh</p>
                </div>
              </div>

              {/* Place Order Button */}
              {(() => {
                const minOrderCents = (currentRestaurant as { min_order_cents?: number | null } | null)?.min_order_cents ?? 0;
                const blockers: string[] = [];
                if (!user) blockers.push("Sign in required");
                if (orderMode === "delivery" && !deliveryAddress.trim()) blockers.push("Enter delivery address");
                if (cart.length === 0) blockers.push("Your cart is empty");
                if (scheduleMode === "later" && (!scheduleTime || new Date(scheduleTime).getTime() <= Date.now())) blockers.push("Pick a future time");
                if (minOrderCents > 0 && cartTotal * 100 < minOrderCents) blockers.push(`Min ${fmtPrice(minOrderCents / 100)}`);
                if (paymentType === "wallet" && walletBalanceCents < Math.round(grandTotal * 100)) blockers.push("Wallet balance too low");
                const blocked = blockers.length > 0 || placingOrder;
                return (
                  <>
                    {blockers.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {blockers.map(b => (
                          <li key={b} className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button onClick={handlePlaceOrder} disabled={blocked}
                      className={cn("w-full h-14 text-base font-bold gap-3 rounded-2xl text-primary-foreground shadow-lg active:scale-[0.98] transition-all",
                        blocked ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-gradient-to-r from-primary to-emerald-500 shadow-primary/25"
                      )}>
                      {placingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {placingOrder ? "Placing order..." : `Place Order · ${fmtPrice(grandTotal)}`}
                    </Button>
                  </>
                );
              })()}
            </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Placing-order overlay */}
      <AnimatePresence>
        {placingOrder && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">Placing your order…</p>
            <p className="text-xs text-muted-foreground">Confirming with the restaurant</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ORDER STATUS OVERLAY ═══ */}
      <AnimatePresence>
        {trackedOrderId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
            {statusStep >= ORDER_STAGES.length - 1 && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => {
                  const colors = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];
                  const left = (i * 13) % 100;
                  const delay = (i % 8) * 0.1;
                  const dur = 1.6 + ((i * 7) % 10) / 10;
                  return (
                    <motion.span key={i}
                      initial={{ y: -20, x: 0, opacity: 0, rotate: 0 }}
                      animate={{ y: "110vh", x: ((i % 2 === 0) ? 1 : -1) * (40 + (i * 11) % 80), opacity: [0, 1, 1, 0], rotate: 720 }}
                      transition={{ duration: dur, delay, ease: "easeIn", repeat: Infinity, repeatDelay: 1.2 }}
                      style={{ left: `${left}%`, background: colors[i % colors.length], width: 8, height: 12, borderRadius: 2 }}
                      className="absolute" />
                  );
                })}
              </div>
            )}
            {/* Animated ring */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-primary/40 ring-4 ring-primary/10"
            >
              <div className="pointer-events-none absolute inset-0 rounded-full animate-ping bg-primary/20" />
              {statusStep >= ORDER_STAGES.length - 1 ? (
                <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
              ) : statusStep === 0 ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5, times: [0, 0.6, 1] }}>
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <Timer className="w-10 h-10 text-white" />
              )}
            </motion.div>

            <h2 className="text-xl font-bold mb-1 text-center">
              {ORDER_STAGES[statusStep].label}
            </h2>
            <p className="text-sm text-muted-foreground mb-8 text-center">
              {statusStep === 0 && "Your order is on its way to the restaurant."}
              {statusStep === 1 && "The restaurant has accepted your order."}
              {statusStep === 2 && "Your food is being freshly prepared."}
              {statusStep === 3 && "Your rider is heading to you now."}
              {statusStep === 4 && "Enjoy your meal!"}
            </p>

            {/* Stage timeline */}
            <div className="w-full max-w-xs space-y-3 mb-8">
              {ORDER_STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const done = i <= statusStep;
                const active = i === statusStep;
                return (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all",
                      done ? "bg-emerald-500" : "bg-muted"
                    )}>
                      <Icon className={cn("w-3.5 h-3.5", done ? "text-white" : "text-muted-foreground")} />
                    </div>
                    <span className={cn(
                      "text-[13px] font-medium transition-colors",
                      active ? "text-foreground font-bold" : done ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {stage.label}
                    </span>
                    {active && statusStep < ORDER_STAGES.length - 1 && (
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="ml-auto w-2 h-2 rounded-full bg-primary"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <button type="button"
                onClick={() => { setTrackedOrderId(null); navigate(`/eats/track/${trackedOrderId}`); }}
                className="w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm active:scale-[0.98] transition-transform">
                {statusStep >= ORDER_STAGES.length - 1 ? "View receipt" : "View Full Tracking"}
              </button>
              <button type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/eats/track/${trackedOrderId}`;
                  const text = `Track my ZIVO Eats order — ETA in ${(currentRestaurant?.avg_prep_time ?? 25) + 10}–${(currentRestaurant?.avg_prep_time ?? 25) + 20} min`;
                  if ((navigator as any).share) {
                    try { await (navigator as any).share({ title: "My ZIVO order", text, url }); } catch {}
                  } else {
                    try { await navigator.clipboard.writeText(url); toast.success("Tracking link copied"); } catch {}
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-card border border-border/40 text-foreground font-bold py-3 text-sm active:scale-[0.98] transition-transform">
                <Share2 className="w-4 h-4" /> Share live ETA
              </button>
              {cancelCountdown > 0 && statusStep === 0 && (
                <button type="button"
                  onClick={handleCancelTrackedOrder}
                  disabled={cancellingOrder}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground underline-offset-2 hover:underline disabled:opacity-60 disabled:no-underline">
                  {cancellingOrder && <Loader2 className="w-3 h-3 animate-spin" />}
                  {cancellingOrder ? "Cancelling…" : `Cancel order (${cancelCountdown}s)`}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
