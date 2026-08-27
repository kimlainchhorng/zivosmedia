/**
 * ServicesPage - Compact directory of all ZIVO services
 * Matches the Home quick launch, then reveals one service category at a time.
 */
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useRef, type CSSProperties } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import {
  ArrowLeft, Briefcase, CalendarClock, Car, CarFront, CheckCircle,
  Crown, Dumbbell, FileCheck, Gift, Heart, Hotel,
  Mail, MapPin, Package, Pill, Plane, Search, Shield, Ship,
  ShoppingCart, Sparkles, Tv, UsersRound, UtensilsCrossed, Wine,
  X, type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { useRoutePrefetch } from "@/components/shared/RoutePrefetcher";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildHotelsPath } from "@/lib/lodging/hotelRoutes";
import {
  beginWaitlistRequest,
  completeWaitlistRequest,
  createWaitlistRequestGate,
  invalidateWaitlistRequest,
} from "@/pages/app/servicesWaitlistRequest";
import zivoRideIcon from "@/assets/zivo-ride-icon.webp";
import zivoEatsIcon from "@/assets/zivo-eats-icon.webp";
import zivoFlightsAircraft from "@/assets/zivo-flights-aircraft.webp";
import zivoHotelsIcon from "@/assets/zivo-hotels-icon.webp";
import zivoRentalCarIcon from "@/assets/zivo-rental-car.webp";
import zivoBusIcon from "@/assets/zivo-bus-icon.webp";
import zivoShoppingIcon from "@/assets/zivo-shopping.webp";
import zivoAeroplanePackage from "@/assets/zivo-aeroplane-package.png";
import zivoReserveCar from "@/assets/zivo-reserve-car.webp";
import zivoGroupRideIcon from "@/assets/service-group-ride.png";
import zivoAlcoholIcon from "@/assets/zivo-alcohol-icon.webp";
import zivoPharmacyIcon from "@/assets/zivo-pharmacy-icon.webp";
import zivoThingsToDo from "@/assets/zivo-things-to-do.webp";
import zivoAiPlanner from "@/assets/zivo-ai-planner.webp";
import zivoLogo from "@/assets/zivo-logo.png";

/* ── Types ── */
interface ServiceItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "discount" | "promo" | "new" | "coming_soon";
  animClass?: string;
  comingSoon?: boolean;
  imageSrc?: string;
  imageClassName?: string;
}

interface ServiceCategory {
  id: "ride" | "food" | "travel" | "more";
  title: string;
  subtitle?: string;
  services: ServiceItem[];
}

type ServiceTabId = ServiceCategory["id"] | "favorites";

interface PrimaryServiceItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  imageSrc?: string;
  imageClassName?: string;
}

function HomeParityServiceTile({
  service,
  index,
  onNavigate,
  onPrefetch,
}: {
  service: PrimaryServiceItem;
  index: number;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  const Icon = service.icon;

  return (
    <motion.button
      type="button"
      aria-label={service.label}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.08 + index * 0.035 }}
      whileTap={{ scale: 0.92 }}
      onPointerDown={() => onPrefetch(service.href)}
      onClick={() => onNavigate(service.href)}
      className="group flex min-h-[88px] min-w-0 flex-col items-center justify-start gap-2 rounded-[20px] p-0.5 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
    >
      <span className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[19px] bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),0_2px_6px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.025] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.24)] motion-reduce:transform-none">
        {service.imageSrc ? (
          <img
            src={service.imageSrc}
            alt=""
            width={64}
            height={64}
            className={cn("h-[64%] w-[64%] object-contain", service.imageClassName)}
            loading="eager"
            decoding="async"
            aria-hidden="true"
          />
        ) : Icon ? (
          <Icon className="h-7 w-7 text-zinc-950" strokeWidth={1.9} aria-hidden="true" />
        ) : null}
      </span>
      <span className="max-w-full truncate text-center text-[11px] font-semibold leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-xs">
        {service.label}
      </span>
    </motion.button>
  );
}

/* Per-service accent colours (static literal classes so Tailwind JIT keeps them).
   Keyed by href so tiles don't each need annotating; related services share a hue.
   A soft 10% tint on the icon tile + a coloured icon turns the monochrome grid into
   a vibrant, organised super-app hub without touching layout or interaction. */
const ACCENT_BY_HREF: Record<string, { bg: string; icon: string }> = {
  "/rides/hub": { bg: "bg-[hsl(var(--rides)/0.12)]", icon: "text-[hsl(var(--rides))]" },
  "/delivery": { bg: "bg-violet-500/10 dark:bg-violet-400/15", icon: "text-violet-500 dark:text-violet-400" },
  "/flights": { bg: "bg-[hsl(var(--flights)/0.12)]", icon: "text-[hsl(var(--flights))]" },
  "/rent-car": { bg: "bg-[hsl(var(--cars)/0.12)]", icon: "text-[hsl(var(--cars))]" },
  "/eats": { bg: "bg-[hsl(var(--eats)/0.12)]", icon: "text-[hsl(var(--eats))]" },
  "/grocery": { bg: "bg-emerald-500/10 dark:bg-emerald-400/15", icon: "text-emerald-500 dark:text-emerald-400" },
  "/hotels": { bg: "bg-[hsl(var(--hotels)/0.12)]", icon: "text-[hsl(var(--hotels))]" },
  "/travel-insurance": { bg: "bg-teal-500/10 dark:bg-teal-400/15", icon: "text-teal-500 dark:text-teal-400" },
  "/explore": { bg: "bg-pink-500/10 dark:bg-pink-400/15", icon: "text-pink-500 dark:text-pink-400" },
  "/wellness": { bg: "bg-green-500/10 dark:bg-green-400/15", icon: "text-green-500 dark:text-green-400" },
  "/ai-trip-planner": { bg: "bg-purple-500/10 dark:bg-purple-400/15", icon: "text-purple-500 dark:text-purple-400" },
  "/support": { bg: "bg-slate-500/10 dark:bg-slate-400/15", icon: "text-slate-500 dark:text-slate-400" },
  "/drive": { bg: "bg-cyan-500/10 dark:bg-cyan-400/15", icon: "text-cyan-500 dark:text-cyan-400" },
  "/zivo-plus": { bg: "bg-yellow-500/10 dark:bg-yellow-400/15", icon: "text-yellow-600 dark:text-yellow-400" },
  "/rewards": { bg: "bg-amber-500/10 dark:bg-amber-400/15", icon: "text-amber-600 dark:text-amber-400" },
  "/deals": { bg: "bg-red-500/10 dark:bg-red-400/15", icon: "text-red-500 dark:text-red-400" },
  "/live": { bg: "bg-rose-500/10 dark:bg-rose-400/15", icon: "text-rose-500 dark:text-rose-400" },
  "/creator-dashboard": { bg: "bg-cyan-500/10 dark:bg-cyan-400/15", icon: "text-cyan-500 dark:text-cyan-400" },
};

function ServiceGlyph({
  service,
  className,
  isRunning = false,
}: {
  service: ServiceItem;
  className?: string;
  isRunning?: boolean;
}) {
  const Icon = service.icon;

  if (service.imageSrc) {
    return (
      <img
        src={service.imageSrc}
        alt=""
        width={64}
        height={64}
        loading="eager"
        decoding="async"
        aria-hidden="true"
        className={cn(
          "h-[72%] w-[76%] object-contain transition-transform duration-200 motion-reduce:animate-none motion-reduce:transform-none",
          service.imageClassName,
          isRunning && service.animClass,
          className
        )}
      />
    );
  }

  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.9}
      className={cn(
        "h-7 w-7 transition-transform duration-200 group-hover:scale-110 motion-reduce:animate-none motion-reduce:transform-none",
        ACCENT_BY_HREF[service.href]?.icon ?? "text-muted-foreground",
        isRunning && service.animClass,
        className
      )}
    />
  );
}

/* ── Data ── */
const getServiceCategories = (t: (key: string) => string): ServiceCategory[] => [
  {
    id: "ride",
    title: t("services.category.ride"),
    subtitle: t("services.category.ride_sub"),
    services: [
      { id: "ride", label: t("services.ride"), href: "/rides/hub", icon: Car, imageSrc: zivoRideIcon, imageClassName: "h-[70%] w-[76%]", badge: t("services.badge.off_10"), badgeVariant: "discount", animClass: "animate-car-run" },
      { id: "package-delivery", label: t("services.package"), href: "/delivery", icon: Package, imageSrc: zivoAeroplanePackage, imageClassName: "h-[92%] w-[92%]", badge: t("services.badge.live"), badgeVariant: "new", animClass: "animate-pkg-bounce" },
      { id: "ride-travel", label: t("services.travel"), href: "/flights", icon: Plane, imageSrc: zivoFlightsAircraft, imageClassName: "h-[70%] w-[88%]", badge: t("services.badge.hot"), badgeVariant: "promo", animClass: "animate-plane-fly" },
      { id: "ride-reserve", label: t("services.reserve"), href: "/rides/hub", icon: CalendarClock, imageSrc: zivoReserveCar, imageClassName: "h-[86%] w-[86%]", badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { id: "ride-rental-cars", label: t("services.rental_cars"), href: "/rent-car", icon: CarFront, imageSrc: zivoRentalCarIcon, imageClassName: "h-[76%] w-[76%]", badge: t("services.badge.book"), badgeVariant: "promo", animClass: "animate-car-run" },
      { id: "group-ride", label: t("services.group_ride"), href: "/rides/hub", icon: UsersRound, imageSrc: zivoGroupRideIcon, imageClassName: "h-[82%] w-[82%]", animClass: "animate-car-run" },
    ],
  },
  {
    id: "food",
    title: t("services.category.food"),
    subtitle: t("services.category.food_sub"),
    services: [
      { id: "food", label: t("services.food"), href: "/eats", icon: UtensilsCrossed, imageSrc: zivoEatsIcon, badge: t("services.badge.order"), badgeVariant: "promo", animClass: "animate-food-wiggle" },
      { id: "grocery", label: t("services.grocery"), href: "/grocery", icon: ShoppingCart, imageSrc: zivoShoppingIcon, animClass: "animate-food-wiggle", badge: t("services.badge.shop"), badgeVariant: "promo" as const },
      { id: "alcohol", label: t("services.alcohol"), href: "/grocery", icon: Wine, imageSrc: zivoAlcoholIcon, imageClassName: "h-[84%] w-[84%]", badge: t("services.badge.new"), badgeVariant: "new", animClass: "animate-food-wiggle" },
      { id: "pharmacy", label: t("services.pharmacy"), href: "/grocery", icon: Pill, imageSrc: zivoPharmacyIcon, imageClassName: "h-[82%] w-[86%]", badge: t("services.badge.new"), badgeVariant: "new", animClass: "animate-pkg-bounce" },
    ],
  },
  {
    id: "travel",
    title: t("services.category.trip"),
    subtitle: t("services.category.trip_sub"),
    services: [
      { id: "flights", label: t("services.flights"), href: "/flights", icon: Plane, imageSrc: zivoFlightsAircraft, imageClassName: "h-[70%] w-[88%]", badge: t("services.badge.hot"), badgeVariant: "promo", animClass: "animate-plane-fly" },
      { id: "hotels", label: t("services.hotels"), href: "/hotels", icon: Hotel, imageSrc: zivoHotelsIcon, imageClassName: "h-[70%] w-[70%]", badge: t("services.badge.book"), badgeVariant: "promo", animClass: "animate-pkg-bounce" },
      { id: "car-rental", label: t("services.car_rental"), href: "/rent-car", icon: CarFront, imageSrc: zivoRentalCarIcon, imageClassName: "h-[76%] w-[76%]", badge: t("services.badge.rent"), badgeVariant: "promo", animClass: "animate-car-run" },
      { id: "travel-insurance", label: t("services.insurance"), href: "/travel-insurance", icon: Shield, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { id: "things-to-do", label: t("services.things_to_do"), href: "/explore", icon: MapPin, imageSrc: zivoThingsToDo, imageClassName: "h-[86%] w-[86%] rounded-[14px] !object-cover", badge: t("services.badge.new"), badgeVariant: "new" },
      { id: "ai-trip-planner", label: t("services.ai_planner"), href: "/ai-trip-planner", icon: Sparkles, imageSrc: zivoAiPlanner, imageClassName: "h-[84%] w-[84%]", badge: t("services.badge.ai"), badgeVariant: "new" },
      { id: "visa-help", label: t("services.visa_help"), href: "/support", icon: FileCheck, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { id: "cruise", label: t("services.cruise"), href: "/flights", icon: Ship, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
    ],
  },
  {
    id: "more",
    title: t("services.category.more"),
    subtitle: t("services.category.more_sub"),
    services: [
      { id: "drive", label: t("services.drive"), href: "/drive", icon: Car, imageSrc: zivoRideIcon, imageClassName: "h-[70%] w-[76%]" },
      { id: "zivo-plus", label: "ZIVO+", href: "/zivo-plus", icon: Crown, badge: t("services.badge.premium"), badgeVariant: "new" },
      { id: "rewards", label: t("services.rewards"), href: "/rewards", icon: Gift, badge: t("services.badge.earn"), badgeVariant: "promo" },
      { id: "deals", label: t("services.deals"), href: "/deals", icon: Sparkles, badge: t("services.badge.hot"), badgeVariant: "promo" },
      { id: "zivo-live", label: t("services.live"), href: "/live", icon: Tv, badge: t("services.badge.live"), badgeVariant: "new" },
      { id: "wellness", label: t("services.wellness"), href: "/wellness", icon: Dumbbell, badge: t("services.badge.new"), badgeVariant: "new" },
      { id: "creator-hub", label: t("services.creator"), href: "/creator-dashboard", icon: Briefcase },
    ],
  },
];

const getPrimaryServices = (
  t: (key: string) => string,
  hotelsPath: string
): PrimaryServiceItem[] => [
  { label: t("home.ride"), href: "/rides/hub", imageSrc: zivoRideIcon, imageClassName: "w-[70%]" },
  { label: t("home.eats"), href: "/eats", imageSrc: zivoEatsIcon },
  { label: t("home.flights"), href: "/flights", imageSrc: zivoFlightsAircraft, imageClassName: "h-[70%] w-[88%]" },
  { label: t("home.hotels"), href: hotelsPath, imageSrc: zivoHotelsIcon, imageClassName: "h-[68%] w-[68%]" },
  { label: t("home.rental_cars"), href: "/rent-car", imageSrc: zivoRentalCarIcon, imageClassName: "h-[72%] w-[72%]" },
  { label: t("home.bus"), href: "/bus", imageSrc: zivoBusIcon, imageClassName: "h-[68%] w-[86%]" },
  { label: t("home.shopping"), href: "/grocery", imageSrc: zivoShoppingIcon },
  { label: t("home.delivery"), href: "/delivery", imageSrc: zivoAeroplanePackage, imageClassName: "h-[88%] w-[92%]" },
];

/* ── Badge Variant Styles ── */
const badgeStyles = {
  discount: "bg-ig-gradient text-white shadow-primary/30",
  promo: "bg-primary/90 text-primary-foreground shadow-primary/20",
  new: "bg-foreground text-background shadow-foreground/20",
  coming_soon: "bg-amber-500 text-white shadow-amber-500/30",
};

const FAVORITES_KEY_PREFIX = "zivo_favorite_services";

const serviceFavoriteKey = (service: ServiceItem) => service.id;

function normalizeFavoriteServices(favorites: string[], services: ServiceItem[]): string[] {
  return [...new Set(favorites.map(value => {
    if (!value.startsWith("/")) return value;
    return services.find(service => service.href === value)?.id ?? value;
  }))];
}

function favoritesStorageKey(userId: string | null): string | null {
  return userId ? `${FAVORITES_KEY_PREFIX}:${userId}` : null;
}

function loadFavoriteServices(userId: string | null): string[] {
  const key = favoritesStorageKey(userId);
  if (!key || typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function saveFavoriteServices(favorites: string[], userId: string | null): void {
  const key = favoritesStorageKey(userId);
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(favorites));
  } catch {
    // Local storage is optional for this device-only convenience feature.
  }
}

/* ── Page ── */
export default function ServicesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { prefetch } = useRoutePrefetch();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hotelsPath = useMemo(() => buildHotelsPath(), []);
  const isStandaloneDisplay = typeof window !== "undefined"
    && (window.matchMedia?.("(display-mode: standalone)").matches ?? false);
  const servicesHeaderSafeTop = Capacitor.isNativePlatform() || isStandaloneDisplay
    ? "var(--zivo-safe-top-sticky)"
    : "max(var(--zivo-safe-top, 0px), 1rem)";
  const serviceCategories = useMemo(() => getServiceCategories(t), [t]);
  const primaryServices = useMemo(() => getPrimaryServices(t, hotelsPath), [hotelsPath, t]);
  const allServices = useMemo(
    () => serviceCategories.flatMap(category => category.services),
    [serviceCategories]
  );
  const [runningLabel, setRunningLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeTab, setActiveTab] = useState<ServiceTabId>("ride");
  const [waitlistService, setWaitlistService] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState(user?.email ?? "");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const waitlistRequestGateRef = useRef(createWaitlistRequestGate());
  const [favoriteState, setFavoriteState] = useState<{ userId: string | null; items: string[] }>(() => ({
    userId,
    items: normalizeFavoriteServices(loadFavoriteServices(userId), allServices),
  }));
  const favorites = favoriteState.userId === userId
    ? normalizeFavoriteServices(favoriteState.items, allServices)
    : normalizeFavoriteServices(loadFavoriteServices(userId), allServices);

  const toggleFavorite = (service: ServiceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = serviceFavoriteKey(service);
    setFavoriteState((previous) => {
      const stored = previous.userId === userId ? previous.items : loadFavoriteServices(userId);
      const current = normalizeFavoriteServices(stored, allServices);
      const next = current.includes(key)
        ? current.filter(f => f !== key)
        : [...current, key];
      saveFavoriteServices(next, userId);
      return { userId, items: next };
    });
  };

  const favoriteServices = useMemo(
    () => allServices.filter(s => favorites.includes(serviceFavoriteKey(s))),
    [allServices, favorites]
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return allServices.filter(service => service.label.toLocaleLowerCase().includes(query));
  }, [allServices, searchQuery]);
  const activeCategory = serviceCategories.find(category => category.id === activeTab);
  const visibleServices = searchQuery.trim()
    ? searchResults
    : activeTab === "favorites"
      ? favoriteServices
      : activeCategory?.services ?? [];
  const panelTitle = searchQuery.trim()
    ? t("services.search_results")
    : activeTab === "favorites"
      ? t("services.tab.favorites")
      : activeCategory?.title ?? "";
  const panelSubtitle = !searchQuery.trim() && activeTab !== "favorites"
    ? activeCategory?.subtitle
    : undefined;
  const tabs: Array<{ id: ServiceTabId; label: string }> = [
    { id: "ride", label: t("services.tab.ride") },
    { id: "food", label: t("services.tab.food") },
    { id: "travel", label: t("services.tab.travel") },
    { id: "more", label: t("services.tab.more") },
    { id: "favorites", label: t("services.tab.favorites") },
  ];

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const clearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const closeWaitlist = () => {
    invalidateWaitlistRequest(waitlistRequestGateRef.current);
    setWaitlistService(null);
    setWaitlistSubmitted(false);
    setWaitlistLoading(false);
  };

  const handleServiceClick = (service: ServiceItem) => {
    if (service.comingSoon) {
      invalidateWaitlistRequest(waitlistRequestGateRef.current);
      setWaitlistService(service.label);
      setWaitlistSubmitted(false);
      setWaitlistLoading(false);
      setWaitlistEmail(user?.email ?? "");
      return;
    }
    if (service.animClass) {
      setRunningLabel(service.label);
      setTimeout(() => {
        setRunningLabel(null);
        navigate(service.href);
      }, 850);
    } else {
      navigate(service.href);
    }
  };

  const submitWaitlist = async () => {
    const email = waitlistEmail.trim();
    const service = waitlistService;
    if (!email || !service) return;

    const requestId = beginWaitlistRequest(waitlistRequestGateRef.current);
    if (requestId === null) return;
    setWaitlistLoading(true);

    try {
      const { error } = await supabase.functions.invoke("service-waitlist-submit", { body: {
        email,
        service,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      } });
      if (error) throw error;
    } catch {
      if (!completeWaitlistRequest(waitlistRequestGateRef.current, requestId)) return;
      setWaitlistLoading(false);
      toast.error(t("services.waitlist.error"));
      return;
    }

    if (!completeWaitlistRequest(waitlistRequestGateRef.current, requestId)) return;
    setWaitlistLoading(false);
    setWaitlistSubmitted(true);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background pb-[6.5rem]">
      {/* Decorative background orbs */}
      <div className="pointer-events-none absolute -left-20 top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[400px] h-48 w-48 rounded-full bg-primary/5 blur-3xl" />

      {/* Compact branded header */}
      <header
        className="safe-area-top relative z-10 overflow-hidden border-b border-border/35 bg-gradient-to-br from-primary/[0.07] via-background to-fuchsia-500/[0.06] px-5 pb-2"
        style={{ "--_safe-top": servicesHeaderSafeTop } as CSSProperties}
      >
        <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="relative flex items-center gap-3"
        >
          <button
            type="button"
            aria-label={t("services.a11y.back")}
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/45 bg-card/85 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-card active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-[24px] font-black leading-tight tracking-[-0.035em] text-foreground">
              {t("services.title")}
            </h1>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{t("services.subtitle")}</p>
          </div>
          <img
            src={zivoLogo}
            alt=""
            width={44}
            height={44}
            aria-hidden="true"
            className="h-11 w-11 shrink-0 rounded-[14px] shadow-[0_10px_24px_-12px_rgba(219,39,119,0.65)]"
          />
        </motion.div>
      </header>

      {/* Search bar */}
      <div className="relative z-10 px-5 pb-1 pt-2">
        <motion.div
          role="search"
          aria-label={t("services.search_placeholder")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            role="searchbox"
            aria-label={t("services.search_placeholder")}
            aria-controls="services-category-panel"
            aria-describedby="services-search-status"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("services.search_placeholder")}
            className="h-11 rounded-full border-border/45 bg-card/90 pl-9 pr-14 text-sm shadow-sm focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label={t("services.a11y.clear_search")}
              onClick={clearSearch}
              className="group/clear absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors group-hover/clear:bg-muted-foreground/30">
                <X aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
              </span>
            </button>
          )}
        </motion.div>
        <p
          id="services-search-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {searchQuery.trim()
            ? searchResults.length === 0
              ? t("services.search_no_results")
              : `${t("services.search_results")}: ${searchResults.length}`
            : ""}
        </p>
      </div>

      {/* Same eight launchers and artwork as Home. */}
      {!searchQuery.trim() && (
        <section aria-labelledby="services-primary-heading" className="relative z-10 px-5 pt-3">
          <h2 id="services-primary-heading" className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("services.section.popular")}
          </h2>
          <div className="grid grid-cols-4 gap-x-2 gap-y-2">
            {primaryServices.map((service, index) => (
              <HomeParityServiceTile
                key={service.href}
                service={service}
                index={index}
                onNavigate={navigate}
                onPrefetch={prefetch}
              />
            ))}
          </div>
        </section>
      )}

      {/* One compact category panel replaces the former four-section long page. */}
      <section
        aria-labelledby={searchQuery.trim() ? "services-panel-heading" : "services-explore-heading"}
        className="relative z-10 px-5 pt-4"
      >
        {!searchQuery.trim() && (
          <>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 id="services-explore-heading" className="text-[16px] font-extrabold tracking-tight text-foreground">
                  {t("services.explore.title")}
                </h2>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {t("services.explore.subtitle")}
                </p>
              </div>
            </div>
            <div
              role="tablist"
              aria-label={t("services.explore.title")}
              aria-orientation="horizontal"
              className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-2"
            >
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  id={`services-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls="services-category-panel"
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={cn(
                    "h-11 shrink-0 rounded-full px-3 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    activeTab === tab.id
                      ? "bg-foreground text-background shadow-sm"
                      : "border border-border/45 bg-card/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        <motion.div
          key={searchQuery.trim() ? "search" : activeTab}
          id="services-category-panel"
          role={searchQuery.trim() ? undefined : "tabpanel"}
          aria-labelledby={searchQuery.trim() ? undefined : `services-tab-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="pt-1"
        >
          <div className="mb-3">
            <h2 id="services-panel-heading" className="text-[15px] font-extrabold tracking-tight text-foreground">{panelTitle}</h2>
            {panelSubtitle && (
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{panelSubtitle}</p>
            )}
          </div>

          {visibleServices.length === 0 ? (
            <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 px-4 text-center">
              {activeTab === "favorites" && !searchQuery.trim() ? (
                <>
                  <Heart className="mb-2 h-6 w-6 text-muted-foreground/45" aria-hidden="true" />
                  <p className="text-xs font-semibold text-foreground">{t("services.tab.favorites")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("services.favorites.empty")}</p>
                </>
              ) : (
                <>
                  <Search className="mb-2 h-6 w-6 text-muted-foreground/45" aria-hidden="true" />
                  <p className="text-xs font-semibold text-foreground">{t("services.search_no_results")}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("services.search_no_results_sub")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-3">
              {visibleServices.map((service, index) => {
                const isFavorite = favorites.includes(serviceFavoriteKey(service));

                return (
                  <motion.div
                    key={`${serviceFavoriteKey(service)}-${service.label}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025, type: "spring", stiffness: 400, damping: 26 }}
                    className={cn("group relative min-w-0", service.comingSoon && "opacity-65")}
                  >
                    <motion.button
                      type="button"
                      onClick={() => handleServiceClick(service)}
                      whileTap={{ scale: 0.92 }}
                      className="flex w-full touch-manipulation flex-col items-center gap-1.5 rounded-2xl py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "relative flex h-[60px] w-[60px] items-center justify-center overflow-visible rounded-[19px] bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18),0_2px_6px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.025] transition-all duration-200",
                          "group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.24)]",
                          "group-active:translate-y-0 group-active:shadow-sm"
                        )}
                      >
                        {service.badge && (
                          <span
                            className={cn(
                              "absolute -top-2 left-1/2 z-10 max-w-[92px] -translate-x-1/2 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[7px] font-bold shadow-sm",
                              badgeStyles[service.badgeVariant || "promo"]
                            )}
                          >
                            {service.badge}
                          </span>
                        )}
                        <ServiceGlyph
                          service={service}
                          isRunning={runningLabel === service.label}
                        />
                      </span>
                      <span className="line-clamp-2 min-h-6 max-w-full text-center text-[11px] font-semibold leading-3 text-foreground">
                        {service.label}
                      </span>
                    </motion.button>

                    <button
                      type="button"
                      aria-label={isFavorite
                        ? t("services.a11y.remove_favorite")
                        : t("services.a11y.save_favorite")}
                      aria-pressed={isFavorite}
                      onClick={(event) => toggleFavorite(service, event)}
                      className={cn(
                        "group/favorite absolute left-1/2 -top-2 z-20 ml-2 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100",
                        isFavorite && "sm:opacity-100"
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow-sm ring-1 ring-border/30 backdrop-blur-sm transition-colors group-hover/favorite:bg-card">
                        <Heart
                          aria-hidden="true"
                          className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground/45"
                          )}
                        />
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </section>

      <Sheet open={!!waitlistService} onOpenChange={(open) => { if (!open) closeWaitlist(); }}>
        <SheetContent side="bottom" hideClose className="rounded-t-3xl pb-10 max-h-[80dvh]">
          <SheetClose
            aria-label={t("services.waitlist.close")}
            className="group/sheet-close absolute right-2.5 top-1.5 z-50 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-1 ring-black/10 transition-opacity group-hover/sheet-close:opacity-90">
              <X aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="sr-only">{t("services.waitlist.close")}</span>
          </SheetClose>
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold">{t("services.waitlist.title")}</SheetTitle>
          </SheetHeader>
          {waitlistSubmitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-base">{waitlistService} — {t("services.waitlist.success")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("services.waitlist.launch_email")}</p>
              </div>
              <button type="button" onClick={closeWaitlist}
                className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold text-primary transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("services.waitlist.close")}</button>
            </div>
          ) : (
            <form
              aria-busy={waitlistLoading}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitWaitlist();
              }}
            >
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{waitlistService}</span> {t("services.waitlist.coming_soon")}{" "}
                {t("services.waitlist.prompt")}
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <label className="sr-only" htmlFor="service-waitlist-email">
                  {t("services.waitlist.email_label")}
                </label>
                <input
                  id="service-waitlist-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  disabled={waitlistLoading}
                  placeholder={t("services.waitlist.email_placeholder")}
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <button
                type="submit"
                disabled={!waitlistEmail.trim() || waitlistLoading}
                className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {waitlistLoading ? t("services.waitlist.joining") : t("services.waitlist.submit")}
              </button>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <ZivoMobileNav />
    </div>
  );
}
