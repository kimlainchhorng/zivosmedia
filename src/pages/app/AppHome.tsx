/**
 * App Home Screen - 2026 Travel Super-App Layout
 * Premium scrollable design with saved places, quick estimate, popular services,
 * quick actions, service navigation, and personalized content.
 * @module AppHome
 */
import { useState, useMemo, lazy, Suspense, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import { useNavigate } from "react-router-dom";
import { useRoutePrefetch } from "@/components/shared/RoutePrefetcher";
import { useI18n } from "@/hooks/useI18n";
import { useCountry } from "@/hooks/useCountry";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Plane from "lucide-react/dist/esm/icons/plane";
import Car from "lucide-react/dist/esm/icons/car";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Package from "lucide-react/dist/esm/icons/package";
import Star from "lucide-react/dist/esm/icons/star";
import Heart from "lucide-react/dist/esm/icons/heart";
import Home from "lucide-react/dist/esm/icons/home";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { HomeRestaurant } from "@/hooks/usePersonalizedHome";
import { useUserProfile } from "@/hooks/useUserProfile";
import zivoRideIcon from "@/assets/zivo-ride-icon.webp";
import zivoEatsIcon from "@/assets/zivo-eats-icon.webp";
import zivoFlightsAircraft from "@/assets/zivo-flights-aircraft.webp";
import zivoHotelsIcon from "@/assets/zivo-hotels-icon.webp";
import zivoRentalCarIcon from "@/assets/zivo-rental-car.webp";
import zivoBusIcon from "@/assets/zivo-bus-icon.webp";
import zivoShoppingIcon from "@/assets/zivo-shopping.webp";

// Lazy-load below-fold heavy components
const LiveTripTracker = lazy(() => import("@/components/home/widgets/LiveTripTracker"));
const QuickReorderCarousel = lazy(() => import("@/components/home/widgets/QuickReorderCarousel"));
const PriceAlertsWidget = lazy(() => import("@/components/home/widgets/PriceAlertsWidget"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));
const PlanTripBundle = lazy(() => import("@/components/home/PlanTripBundle"));
const NetworkPromoStrip = lazy(() => import("@/components/home/NetworkPromoStrip"));
const ConciergeLauncher = lazy(() => import("@/components/home/ConciergeLauncher"));
const TodayPlanWidget = lazy(() => import("@/components/home/TodayPlanWidget"));

// Icons used below-fold (still small, but needed)
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Gift from "lucide-react/dist/esm/icons/gift";
import Clock from "lucide-react/dist/esm/icons/clock";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import Globe from "lucide-react/dist/esm/icons/globe";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Bell from "lucide-react/dist/esm/icons/bell";
import Coffee from "lucide-react/dist/esm/icons/coffee";
import Target from "lucide-react/dist/esm/icons/target";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Flame from "lucide-react/dist/esm/icons/flame";
import Sunrise from "lucide-react/dist/esm/icons/sunrise";
import Sun from "lucide-react/dist/esm/icons/sun";
import Sunset from "lucide-react/dist/esm/icons/sunset";
import Moon from "lucide-react/dist/esm/icons/moon";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import { useScheduledBookingsQuery } from "@/hooks/useScheduledBookings";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import { useRecommendedDeals } from "@/hooks/useRecommendedDeals";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { destinationPhotos } from "@/config/photos";
import PartnerBadge from "@/components/shared/PartnerBadge";
import { useDestinationPrices } from "@/hooks/useDestinationPrices";
import { getRestaurantPhoto } from "@/config/restaurantPhotos";
import { formatDistanceToNow, format } from "date-fns";
import AdSenseUnit from "@/components/ads/AdSenseUnit";
import { AD_SLOTS } from "@/config/adSlots";
import { useDeviceIntegrityCheck } from "@/hooks/useDeviceIntegrityCheck";
import { buildHotelsPath } from "@/lib/lodging/hotelRoutes";

const DEFAULT_HOTELS_PATH = buildHotelsPath();
// ─── Saved Places Icon Map ───

const savedPlaceIconMap: Record<string, LucideIcon> = {
  home: Home,
  work: Briefcase,
  star: Star,
  pin: MapPin,
};

type HomeServiceTileConfig = {
  label: string;
  href: string;
  Icon?: LucideIcon;
  imageSrc?: string;
  imageClassName?: string;
};

function HomeServiceTile({
  service,
  index,
  onNavigate,
  onPrefetch,
}: {
  service: HomeServiceTileConfig;
  index: number;
  onNavigate: (href: string) => void;
  onPrefetch: (href: string) => void;
}) {
  const { Icon } = service;

  return (
    <motion.button
      type="button"
      aria-label={service.label}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.12 + index * 0.045 }}
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

// ─── Restaurant Card (Premium) ───
const RestaurantCard = ({ restaurant, onNavigate }: { restaurant: HomeRestaurant; onNavigate: () => void }) => (
  <motion.button
    onClick={onNavigate}
    whileTap={{ scale: 0.97 }}
    className="shrink-0 w-[170px] rounded-2xl overflow-hidden bg-background/92 border border-border/30 shadow-sm hover:border-border/50 transition-colors touch-manipulation text-left group"
    
  >
    <div className="relative h-[120px] overflow-hidden">
      <img
        src={restaurant.cover_image_url || restaurant.logo_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400"}
        alt={restaurant.name}
        width={170}
        height={120}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {restaurant.rating && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-bold text-primary-foreground">{restaurant.rating.toFixed(1)}</span>
        </div>
      )}
      <PartnerBadge size="xs" className="absolute top-2 left-2" />
      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Heart className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
    </div>
    <div className="p-3">
      <div className="text-xs font-bold text-foreground truncate">{restaurant.name}</div>
      {restaurant.cuisine_type && (
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{restaurant.cuisine_type}</div>
      )}
    </div>
  </motion.button>
);

// ─── Section Header (Premium) ───
type SmartNowConfig = {
  icon: LucideIcon;
  greeting: string;
  primary: { label: string; to: string };
  chips: { label: string; to: string }[];
  gradient: string;
  iconBg: string;
  iconColor: string;
};

const getSmartNow = (hour: number): SmartNowConfig => {
  if (hour >= 5 && hour < 11) return {
    icon: Sunrise,
    greeting: "Good morning",
    primary: { label: "Order coffee nearby", to: "/eats?q=coffee" },
    chips: [
      { label: "Ride to work", to: "/rides/hub" },
      { label: "Breakfast", to: "/eats?q=breakfast" },
    ],
    gradient: "from-amber-500/15 via-orange-500/8 to-transparent",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500",
  };
  if (hour >= 11 && hour < 14) return {
    icon: UtensilsCrossed,
    greeting: "Lunchtime",
    primary: { label: "Lunch deals near you", to: "/eats?q=lunch" },
    chips: [
      { label: "Quick bite", to: "/eats?q=fast" },
      { label: "Reserve a table", to: "/eats" },
    ],
    gradient: "from-foreground to-foreground/80",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-500",
  };
  if (hour >= 14 && hour < 17) return {
    icon: Sun,
    greeting: "Afternoon",
    primary: { label: "Plan your evening", to: "/things-to-do" },
    chips: [
      { label: "Coffee break", to: "/eats?q=coffee" },
      { label: "Trip ideas", to: "/flights" },
    ],
    gradient: "from-foreground to-foreground/80",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-500",
  };
  if (hour >= 17 && hour < 21) return {
    icon: Sunset,
    greeting: "Evening",
    primary: { label: "Order dinner", to: "/eats?q=dinner" },
    chips: [
      { label: "Ride home", to: "/rides/hub" },
      { label: "Reserve a table", to: "/eats" },
    ],
    gradient: "from-foreground to-foreground/80",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-500",
  };
  return {
    icon: Moon,
    greeting: "Tonight",
    primary: { label: "Plan tomorrow", to: "/trips" },
    chips: [
      { label: "Late-night eats", to: "/eats" },
      { label: "Hotel stays", to: DEFAULT_HOTELS_PATH },
    ],
    gradient: "from-foreground to-foreground/80",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
  };
};

const SmartNowCard = ({ onNavigate }: { onNavigate: (to: string) => void }) => {
  const cfg = useMemo(() => getSmartNow(new Date().getHours()), []);
  const Icon = cfg.icon;
  return (
    <div className="px-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/30 bg-background/92 shadow-sm hover:border-border/50 p-4"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.iconBg)}>
            <Icon className={cn("w-5 h-5", cfg.iconColor)} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground">{cfg.greeting}</p>
            <button
              type="button"
              onClick={() => onNavigate(cfg.primary.to)}
              className="mt-0.5 flex min-h-[40px] items-center gap-1 text-sm font-semibold text-foreground active:opacity-70 transition-opacity touch-manipulation"
            >
              {cfg.primary.label}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {cfg.chips.map((chip) => (
            <motion.button
              key={chip.label}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate(chip.to)}
              className="min-h-[40px] text-[11px] font-semibold text-foreground bg-muted/20 border border-border/30 rounded-full px-3 py-2 touch-manipulation active:bg-muted/40 transition-colors"
            >
              {chip.label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

type QuickPick = {
  icon: LucideIcon;
  label: string;
  to: string;
  iconColor: string;
  iconBg: string;
};

const QUICK_PICKS: QuickPick[] = [
  { icon: Coffee,          label: "Coffee",     to: "/eats?q=coffee",     iconColor: "text-amber-600",   iconBg: "bg-amber-500/10" },
  { icon: UtensilsCrossed, label: "Pizza",      to: "/eats?q=pizza",      iconColor: "text-orange-500",  iconBg: "bg-orange-500/10" },
  { icon: Plane,           label: "Flights",    to: "/flights",            iconColor: "text-indigo-500",  iconBg: "bg-indigo-500/10" },
  { icon: Hotel,           label: "Hotels",     to: DEFAULT_HOTELS_PATH,    iconColor: "text-violet-500",  iconBg: "bg-violet-500/10" },
  { icon: Car,             label: "Ride",       to: "/rides/hub",          iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  { icon: Package,         label: "Delivery",   to: "/delivery",           iconColor: "text-sky-500",     iconBg: "bg-sky-500/10" },
];

type DailyMission = {
  icon: LucideIcon;
  title: string;
  cta: string;
  to: string;
  accent: string;
};

const DAILY_MISSIONS: DailyMission[] = [
  // Sunday → adventurous start
  { icon: Plane, title: "Browse a new flight destination", cta: "Explore", to: "/flights", accent: "sky" },
  // Monday → commute / ride
  { icon: Target, title: "Take a ride this week", cta: "Book a ride", to: "/rides/hub", accent: "emerald" },
  // Tuesday → eats
  { icon: UtensilsCrossed, title: "Try a new restaurant on Eats", cta: "Order now", to: "/eats", accent: "orange" },
  // Wednesday → social
  { icon: Gift, title: "Refer a friend today", cta: "Share invite", to: "/refer", accent: "violet" },
  // Thursday → reservations
  { icon: Calendar, title: "Reserve a table for the weekend", cta: "Find a spot", to: "/eats", accent: "rose" },
  // Friday → hotels / stays
  { icon: Hotel, title: "Plan a weekend stay", cta: "Browse hotels", to: DEFAULT_HOTELS_PATH, accent: "indigo" },
  // Saturday → bundle
  { icon: Trophy, title: "Bundle a flight + hotel", cta: "See bundles", to: "/flights?bundle=1", accent: "amber" },
];

const ACCENT_STYLES: Record<string, { iconBg: string; iconColor: string; gradient: string; ringColor: string; ctaBg: string }> = {
  sky:      { iconBg: "bg-sky-500/15",     iconColor: "text-sky-500",     gradient: "from-foreground to-foreground/80",         ringColor: "border-sky-500/25",     ctaBg: "bg-sky-500 text-white" },
  emerald:  { iconBg: "bg-emerald-500/15", iconColor: "text-emerald-500", gradient: "from-emerald-500/12 via-emerald-500/5 to-transparent", ringColor: "border-emerald-500/25", ctaBg: "bg-emerald-500 text-white" },
  orange:   { iconBg: "bg-orange-500/15",  iconColor: "text-orange-500",  gradient: "from-orange-500/12 via-orange-500/5 to-transparent",   ringColor: "border-orange-500/25",  ctaBg: "bg-orange-500 text-white" },
  violet:   { iconBg: "bg-violet-500/15",  iconColor: "text-violet-500",  gradient: "from-foreground to-foreground/80",   ringColor: "border-violet-500/25",  ctaBg: "bg-violet-500 text-white" },
  rose:     { iconBg: "bg-rose-500/15",    iconColor: "text-rose-500",    gradient: "from-foreground to-foreground/80",       ringColor: "border-rose-500/25",    ctaBg: "bg-rose-500 text-white" },
  indigo:   { iconBg: "bg-indigo-500/15",  iconColor: "text-indigo-500",  gradient: "from-foreground to-foreground/80",   ringColor: "border-indigo-500/25",  ctaBg: "bg-indigo-500 text-white" },
  amber:    { iconBg: "bg-amber-500/15",   iconColor: "text-amber-600",   gradient: "from-amber-500/12 via-amber-500/5 to-transparent",     ringColor: "border-amber-500/25",   ctaBg: "bg-amber-500 text-white" },
};

const DailyMissionCard = ({ onNavigate }: { onNavigate: (to: string) => void }) => {
  const mission = useMemo(() => DAILY_MISSIONS[new Date().getDay()], []);
  const Icon = mission.icon;
  const dayLabel = useMemo(() =>
    new Date().toLocaleDateString("en-US", { weekday: "long" }),
  []);

  return (
    <div className="px-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-border/30 bg-background/92 shadow-sm hover:border-border/50 p-4"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", ACCENT_STYLES[mission.accent].iconBg)}>
            <Icon className={cn("w-5 h-5", ACCENT_STYLES[mission.accent].iconColor)} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">{dayLabel} mission</p>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{mission.title}</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate(mission.to)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
        >
          {mission.cta}
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      </motion.div>
    </div>
  );
};

const STREAK_KEY = "zivo:streak:v1";
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // Sun → Sat to match getDay()

type StreakState = { count: number; lastVisitISO: string };
type ScheduledBookingCard = {
  id: string;
  status?: string | null;
  type?: string | null;
  service?: string | null;
  scheduledDate?: string | null;
  scheduled_date?: string | null;
  scheduledTime?: string | null;
  scheduled_time?: string | null;
  pickupAddress?: string | null;
  pickup_address?: string | null;
  dropoffAddress?: string | null;
  dropoff_address?: string | null;
};
type RecentItemCard = {
  id: string;
  item_id: string;
  item_type: "restaurant" | "hotel" | "flight" | "ride" | string;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
};

const readStreak = (): StreakState => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STREAK_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, lastVisitISO: "" };
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const StreakCard = ({ onNavigate }: { onNavigate: (to: string) => void }) => {
  const [state] = useState<StreakState>(() => {
    const current = readStreak();
    const todayKey = startOfDay(new Date());
    const last = current.lastVisitISO ? startOfDay(new Date(current.lastVisitISO)) : 0;
    if (todayKey === last) return current;
    const diffDays = last ? Math.round((todayKey - last) / 86_400_000) : Infinity;
    const next: StreakState = {
      count: diffDays === 1 ? current.count + 1 : 1,
      lastVisitISO: new Date().toISOString(),
    };
    try { window.localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const todayDow = new Date().getDay(); // 0..6, Sun..Sat
  const completedThisWeek = Math.min(state.count, todayDow + 1);
  const earliestCompletedIdx = todayDow - completedThisWeek + 1;
  const nextMilestone = STREAK_MILESTONES.find((m) => m > state.count) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const toGo = Math.max(0, nextMilestone - state.count);

  return (
    <div className="px-4 pb-3">
      <motion.button
        type="button"
        onClick={() => onNavigate("/rewards")}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-left relative overflow-hidden rounded-2xl border border-border/30 bg-background/92 p-4 shadow-sm hover:border-border/50 touch-manipulation"
      >
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/12 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-600">Daily streak</p>
            <p className="text-base font-semibold text-foreground leading-tight">
              {state.count} {state.count === 1 ? "day" : "days"} <span className="text-xs font-semibold text-muted-foreground">in a row</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-muted-foreground">Next</p>
            <p className="text-xs font-bold text-amber-600">{toGo === 0 ? "Reached!" : `${toGo}d → ${nextMilestone}d`}</p>
          </div>
        </div>

        {/* 7-day dots */}
        <div className="relative mt-3 flex items-center justify-between">
          {DAY_LABELS.map((d, i) => {
            const isToday = i === todayDow;
            const isFuture = i > todayDow;
            const isComplete = !isFuture && i >= earliestCompletedIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all",
                    isFuture
                      ? "bg-muted/40 text-muted-foreground/50"
                      : isComplete
                        ? "bg-orange-500 text-white"
                        : "bg-muted/60 text-muted-foreground border border-dashed border-orange-500/40",
                    isToday && "ring-2 ring-orange-500/40 ring-offset-2 ring-offset-background scale-110",
                  )}
                >
                  {isComplete && !isFuture ? "✓" : d}
                </div>
                <span className={cn("text-[9px] font-semibold", isToday ? "text-orange-600" : "text-muted-foreground/60")}>{d}</span>
              </div>
            );
          })}
        </div>
      </motion.button>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, iconColor, title, badge, actionLabel, onSeeAll }: { icon: LucideIcon; iconColor: string; title: string; badge?: string; actionLabel?: string; onSeeAll: () => void }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-muted/20 border border-border/30 flex items-center justify-center">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      {title}
      {badge && (
        <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border-0 px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </h2>
    <button type="button" onClick={onSeeAll} className="text-xs text-primary font-semibold touch-manipulation active:scale-95 min-w-[44px] min-h-[32px] flex items-center gap-0.5 hover:gap-1.5 transition-all">
      {actionLabel}
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ─── Promo banners ───
// Promos and trending rides are built inside the component for translation

// ─── Trending Rides (static) ───
// trendingRides built inside component for translation

// ─── Popular Destinations (expanded with real photos) ───
const popularDestKeysUS = [
  "miami", "las-vegas", "new-york", "cancun", "los-angeles",
  "orlando", "san-francisco", "chicago", "barcelona", "paris",
  "san-diego", "dallas", "atlanta", "phoenix",
  "honolulu", "nashville", "denver", "seattle", "boston", "san-juan",
  "tampa", "charlotte", "minneapolis", "portland", "austin",
  "fort-lauderdale", "new-orleans", "washington",
  "toronto", "mexico-city", "london", "tokyo", "dubai",
  "rome", "istanbul", "seoul", "kuala-lumpur", "bali",
  "singapore", "sydney", "manila", "taipei", "mumbai",
  "phuket", "hanoi", "bangkok", "amsterdam",
] as const;

// Cambodia destinations (using local photos from config)
const cambodiaDestKeysKH = [
  "phnom-penh", "siem-reap", "sihanoukville", "kampot", "battambang", "kep",
  "bangkok", "ho-chi-minh", "hanoi", "phuket", "kuala-lumpur", "bali",
  "seoul", "tokyo", "singapore", "manila", "taipei", "mumbai",
] as const;


// ─── Recently viewed type config ───

const AppHome = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, currentLanguage } = useI18n();
  const { isCambodia: isKH } = useCountry();
  useDeviceIntegrityCheck();

  // Prefetch the route a tab/search-button leads to on touch-down so the
  // chunk is in memory by the time the click fires (~80–150 ms head-start
  // on mobile).
  const { prefetch } = useRoutePrefetch();
  const hotelsPath = useMemo(() => buildHotelsPath(), []);
  const homeServices: HomeServiceTileConfig[] = [
    { label: t("home.ride"), href: "/rides/hub", imageSrc: zivoRideIcon, imageClassName: "w-[70%]" },
    { label: t("home.eats"), href: "/eats", imageSrc: zivoEatsIcon },
    { label: t("home.flights"), href: "/flights", imageSrc: zivoFlightsAircraft, imageClassName: "h-[76%] w-[94%]" },
    { label: t("home.hotels"), href: hotelsPath, imageSrc: zivoHotelsIcon, imageClassName: "h-[68%] w-[68%]" },
    { label: t("home.rental_cars"), href: "/rent-car", imageSrc: zivoRentalCarIcon, imageClassName: "h-[72%] w-[72%]" },
    { label: t("home.bus"), href: "/bus", imageSrc: zivoBusIcon, imageClassName: "h-[68%] w-[86%]" },
    { label: t("home.shopping"), href: "/grocery", imageSrc: zivoShoppingIcon },
    { label: "Delivery", href: "/delivery", Icon: Package },
  ];
  const { data: profile, isError: hasProfileError } = useUserProfile();
  const { data: deals = [], isError: hasDealsError } = useRecommendedDeals("all", 6);
  const { items: recentItems } = useRecentlyViewed();
  const { data: savedLocations, isError: hasSavedLocationsError } = useSavedLocations(user?.id);
  const destKeys = isKH ? [...cambodiaDestKeysKH] : [...popularDestKeysUS];
  const { data: destPrices = {}, isLoading: destPricesLoading } = useDestinationPrices(destKeys, isKH);
  const { data: allBookings = [] } = useScheduledBookingsQuery();
  const upcomingBookings = (allBookings as ScheduledBookingCard[]).filter((b) => {
    if (b.status !== "scheduled" && b.status !== "confirmed" && b.status !== "pending") return false;
    const sd = b.scheduledDate || b.scheduled_date;
    const st = b.scheduledTime || b.scheduled_time;
    if (!sd || !st) return false;
    const bookingDate = new Date(`${sd}T${st}`);
    return bookingDate > new Date();
  }).sort((a, b) => {
    const ad = a.scheduledDate || a.scheduled_date;
    const at2 = a.scheduledTime || a.scheduled_time;
    const bd = b.scheduledDate || b.scheduled_date;
    const bt = b.scheduledTime || b.scheduled_time;
    return new Date(`${ad}T${at2}`).getTime() - new Date(`${bd}T${bt}`).getTime();
  });
  const { balanceDollars } = useCustomerWallet();

  const hasAnyHomeData =
    Boolean(profile) ||
    deals.length > 0 ||
    (savedLocations?.length ?? 0) > 0 ||
    recentItems.length > 0 ||
    Object.keys(destPrices).length > 0;

  const hasHomeRefreshError =
    hasAnyHomeData && (hasProfileError || hasDealsError || hasSavedLocationsError);

  const shouldShowHomeRecovery =
    Boolean(user) && !hasAnyHomeData && !destPricesLoading && (hasProfileError || hasDealsError || hasSavedLocationsError);

  const retryHomeQueries = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["travel-deals", "all", 6] }),
      queryClient.invalidateQueries({ queryKey: ["saved-locations", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["destination-prices"] }),
    ]);
  }, [queryClient, user?.id]);

  const estimate = (() => {
    const hour = new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    if (isKH) {
      return {
        pickupEta: isPeak ? "~៨ នាទី" : "~៤ នាទី",
        priceRange: isPeak ? "៛61,000-៛89,000" : "៛49,000-៛73,000",
        label: isPeak ? t("home.peak_hours") : t("home.normal"),
        surge: isPeak,
      };
    }
    return {
      pickupEta: isPeak ? "~8 min" : "~4 min",
      priceRange: isPeak ? "$15-22" : "$12-18",
      label: isPeak ? t("home.peak_hours") : t("home.normal"),
      surge: isPeak,
    };
  })();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.good_morning");
    if (hour < 17) return t("home.good_afternoon");
    return t("home.good_evening");
  };

  const userName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Traveler";
  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.full_name || user?.email || "Z").charAt(0).toUpperCase();

  // The notch / Dynamic-Island safe-area padding is only needed inside the
  // installed native app. In a regular browser there's no notch under the web
  // content, so the forced 64px `pt-safe` floor just leaves an empty gap — drop
  // it on the website and use normal header padding instead.
  const isNativeApp = typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.() === true;

  return (
    <div>
    <SEOHead title="ZIVO – Your Travel Super-App" description="Book rides, flights, hotels, and grocery delivery — all in one app." />
    <div className="relative min-h-[100dvh] bg-background font-sans text-foreground selection:bg-primary/30 overflow-x-hidden" role="main">
      {/* Safe-area top backdrop — Capacitor's `overlaysWebView: true` lets web
          content paint up to the very top of the screen for full-bleed cover
          photos. Without this strip, scrolled content slides BEHIND the Dynamic
          Island / status bar and the clock, battery, and signal icons collide
          with whatever cards happen to be at the top of the viewport. A fixed
          blurred bar covering exactly var(--zivo-safe-top,0px) keeps that area
          legible without forcing the rest of the page to lose the edge-to-edge
          feel. */}
      {isNativeApp && (
        <div
          aria-hidden
          className="zivo-safe-top-none fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl pointer-events-none [height:var(--zivo-safe-top-sticky)]"
        />
      )}

      {/* 3D Ambient orbs — contained within scrollable area only */}

      {/* Scrollable content */}
      <div className="scroll-momentum relative z-10 mx-auto w-full max-w-5xl lg:pt-[83px] [padding-bottom:calc(56px+var(--zivo-safe-bottom,0px))]">
        {shouldShowHomeRecovery ? (
          <LoadFailureCard
            className="px-4 pt-safe pb-6"
            title="Home refresh failed"
            description="We couldn&apos;t load your home updates right now. Retry to restore recommendations and account shortcuts."
            onRetry={retryHomeQueries}
            onSecondary={() => navigate("/feed")}
            secondaryLabel="Go Feed"
            trackingContext="home"
          />
        ) : (
          <div>
        {hasHomeRefreshError && (
          <DegradedDataBanner
            className="px-4 pt-safe pb-2"
            message="Showing cached home data. Refresh failed."
            onRetry={retryHomeQueries}
            trackingContext="home"
          />
        )}
        {/* Ambient orbs removed on mobile — they triggered CLS and constant repaints. */}
        {/* ─── HEADER ─── */}
        <div className="relative">

          {/* ─── GREETING HEADER ─── */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex items-center justify-between bg-background px-5 pb-5 ${isNativeApp ? "pt-safe" : "pt-4"}`}
            >
              <button type="button" onClick={() => navigate("/profile")} className="flex items-center gap-3 touch-manipulation active:opacity-75 transition-opacity">
                <div className="shrink-0 p-[2px] rounded-full bg-ig-gradient">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} width={44} height={44} className="h-11 w-11 rounded-full object-cover block" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/12">
                      <span className="text-base font-semibold text-primary">{initials}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-none mb-1">{greeting()}</p>
                  <p className="text-[17px] font-bold text-foreground leading-none tracking-tight">{userName}</p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {balanceDollars != null && balanceDollars > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/account/wallet")}
                    className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5 touch-manipulation active:scale-95 transition-transform"
                  >
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary">${balanceDollars.toFixed(2)}</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Activity"
                  onClick={() => navigate("/activity")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/35 bg-background shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition-transform touch-manipulation active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Bell className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ─── ALL SERVICES (moved to top) ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.1 }}
            className={cn("px-4 pb-7", user ? "pt-4" : "pt-safe")}
          >
            <section aria-labelledby="home-services-heading">
              <div className="mb-5 flex items-center justify-between px-0.5">
                <h2 id="home-services-heading" className="bg-ig-gradient bg-clip-text text-[18px] font-extrabold tracking-tight text-transparent">{t("home.more_services")}</h2>
                <button type="button" aria-label="View all services" onClick={() => navigate("/services")} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors touch-manipulation hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <ArrowRight className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-8">
                {homeServices.map((service, index) => (
                  <HomeServiceTile
                    key={service.href}
                    service={service}
                    index={index}
                    onNavigate={navigate}
                    onPrefetch={prefetch}
                  />
                ))}
              </div>
            </section>
          </motion.div>

          {/* ─── TODAY'S PLAN ─── */}
          <Suspense fallback={null}>
            <TodayPlanWidget />
          </Suspense>


          {/* ─── LIVE TRIP TRACKER (moved up — surface active trip ASAP) ─── */}
          <Suspense fallback={null}><LiveTripTracker /></Suspense>

          {/* ─── UPCOMING BOOKINGS (moved up — show personal trips before browse) ─── */}
          {user && upcomingBookings.length > 0 && (
            <div className="px-5 pb-3">
              <SectionHeader icon={Calendar} iconColor="text-sky-500" title="Upcoming Trips" badge={String(upcomingBookings.length)} actionLabel="See all" onSeeAll={() => navigate("/trips")} />
              <div className="space-y-2">
                {upcomingBookings.slice(0, 2).map((booking) => {
                  const sd = booking.scheduledDate || booking.scheduled_date;
                  const st = booking.scheduledTime || booking.scheduled_time;
                  const bookingDate = new Date(`${sd}T${st}`);
                  return (
                    <motion.button
                      key={booking.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate("/trips")}
                      className="w-full flex items-center gap-3 bg-background/92 border border-border/30 hover:border-border/50 rounded-2xl p-4 shadow-sm text-left touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center shrink-0 border border-border/30">
                        <Calendar className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate capitalize">{(booking.type || booking.service || "Trip").replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{format(bookingDate, "MMM d 'at' h:mm a")}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-semibold text-foreground border-border/30 bg-muted/20 shrink-0 capitalize">
                        {booking.status || "Scheduled"}
                      </Badge>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── QUICK REBOOK (moved up — personal cluster) ─── */}
          <Suspense fallback={null}><QuickReorderCarousel /></Suspense>

          {/* ─── RECENTLY VIEWED (moved up — personal cluster) ─── */}
          {user && recentItems.length > 0 && (
            <div className="px-5 pb-3">
              <SectionHeader icon={Clock} iconColor="text-muted-foreground" title="Recently Viewed" actionLabel="Clear" onSeeAll={() => navigate("/more")} />
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                {(recentItems as RecentItemCard[]).slice(0, 8).map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (item.item_type === "restaurant") navigate(`/eats/restaurant/${item.item_id}`);
                      else if (item.item_type === "store") navigate(`/store/${item.item_id}`);
                      else if (item.item_type === "hotel") navigate(`/hotel/${item.item_id}`);
                      else navigate("/more");
                    }}
                    className="shrink-0 flex flex-col items-center gap-1.5 touch-manipulation group"
                  >
                    <div className="w-[60px] h-[60px] rounded-2xl bg-background/92 border border-border/30 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-border/50 transition-colors">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.title || "Item"} width={60} height={60} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <Globe className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground text-center truncate max-w-[64px]">{item.title || item.item_type}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* ─── ZIVO CONCIERGE ─── */}
          <Suspense fallback={<div className="h-[140px] mx-4 my-2 rounded-2xl bg-muted/40 animate-pulse" />}>
            <ConciergeLauncher />
          </Suspense>

          {/* ─── PLAN A TRIP BUNDLE ─── */}
          <Suspense fallback={<div className="h-[140px] mx-4 my-2 rounded-2xl bg-muted/40 animate-pulse" />}>
            <PlanTripBundle />
          </Suspense>

          {/* ─── ZIVO NETWORK PROMO ─── */}
          <Suspense fallback={<div className="h-[68px] mx-4 my-2 rounded-xl bg-muted/40 animate-pulse" />}>
            <NetworkPromoStrip />
          </Suspense>

          {/* ─── SPONSORED (Google AdSense) — renders nothing until AD_SLOTS.homeFeed + publisher id are set ─── */}
          <div className="px-5 pb-3">
            <AdSenseUnit slot={AD_SLOTS.homeFeed} />
          </div>

          {/* "What's New" widget removed — was a hardcoded marketing block
              (4 cards with fake "X NEW" badges and made-up feature lists).
              No release-notes feed backed it, so badges never updated and the
              same "new" features would stay marked NEW indefinitely. Reclaims
              ~250px of home-screen real estate. Wire to a real release-notes
              table later if a fresh-features rail is desired. */}





        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="px-5 space-y-8">

          {/* ─── PRICE ALERTS WIDGET ─── */}
          <Suspense fallback={null}><PriceAlertsWidget /></Suspense>



          {/* ─── GUEST SIGN-UP CTA ─── */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="rounded-2xl bg-primary/10 border border-primary/20 p-6 relative overflow-hidden shadow-sm"
            >
              <div className="relative z-10">
                <h3 className="text-base font-bold text-foreground mb-1">{t("home.join_free")}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("home.join_desc")}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate("/signup")}
                    size="sm"
                    className="flex-1 h-11 rounded-xl font-semibold"
                  >
                    {t("home.sign_up_free")}
                  </Button>
                  <Button
                    onClick={() => navigate("/login")}
                    variant="outline"
                    size="sm"
                    className="h-11 px-5 rounded-xl font-medium"
                  >
                    {t("home.log_in")}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
          {/* Spacer for fixed bottom nav */}
          <div className="h-24 md:h-8" aria-hidden="true" />
          </div>
          </div>
        )}
        </div>
      </div>

    {/* Bottom Nav */}
    <Suspense fallback={<div className="fixed inset-x-0 bottom-0 h-16 bg-background border-t border-border lg:hidden pb-safe" />}><ZivoMobileNav /></Suspense>
      </div>
  );
};

export default AppHome;
