/**
 * App Home Screen - 2026 Travel Super-App Layout
 * Premium scrollable design with saved places, quick estimate, popular services,
 * quick actions, service navigation, and personalized content.
 * @module AppHome
 */
import { useState, useEffect, useMemo, lazy, Suspense, useCallback } from "react";
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
import Search from "lucide-react/dist/esm/icons/search";
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
import zivoFlightsIcon from "@/assets/zivo-flights-icon.webp";
import zivoHotelsIcon from "@/assets/zivo-hotels-icon.webp";
import zivoRentalCarIcon from "@/assets/zivo-rental-car.webp";
import zivoReserveIcon from "@/assets/zivo-reserve-car.webp";
import zivoShoppingIcon from "@/assets/zivo-shopping.webp";

// Lazy-load below-fold heavy components
const LiveTripTracker = lazy(() => import("@/components/home/widgets/LiveTripTracker"));
const QuickReorderCarousel = lazy(() => import("@/components/home/widgets/QuickReorderCarousel"));
const PriceAlertsWidget = lazy(() => import("@/components/home/widgets/PriceAlertsWidget"));
const ZivoMobileNav = lazy(() => import("@/components/app/ZivoMobileNav"));
const UniversalSearchOverlay = lazy(() => import("@/components/search/UniversalSearchOverlay"));
const PlanTripBundle = lazy(() => import("@/components/home/PlanTripBundle"));
const SmartIntentSearch = lazy(() => import("@/components/home/SmartIntentSearch"));
const StoriesRail = lazy(() => import("@/components/home/StoriesRail"));
const NetworkPromoStrip = lazy(() => import("@/components/home/NetworkPromoStrip"));
const ConciergeLauncher = lazy(() => import("@/components/home/ConciergeLauncher"));
const TodayPlanWidget = lazy(() => import("@/components/home/TodayPlanWidget"));
const SpendTrackerWidget = lazy(() => import("@/components/home/SpendTrackerWidget"));

// Icons used below-fold (still small, but needed)
import Utensils from "lucide-react/dist/esm/icons/utensils";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import Gift from "lucide-react/dist/esm/icons/gift";
import Users from "lucide-react/dist/esm/icons/users";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Copy from "lucide-react/dist/esm/icons/copy";
import Clock from "lucide-react/dist/esm/icons/clock";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Plus from "lucide-react/dist/esm/icons/plus";
import Timer from "lucide-react/dist/esm/icons/timer";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Navigation from "lucide-react/dist/esm/icons/navigation";
import Shield from "lucide-react/dist/esm/icons/shield";
import Globe from "lucide-react/dist/esm/icons/globe";
import Crown from "lucide-react/dist/esm/icons/crown";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Bell from "lucide-react/dist/esm/icons/bell";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Coffee from "lucide-react/dist/esm/icons/coffee";
import Target from "lucide-react/dist/esm/icons/target";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Flame from "lucide-react/dist/esm/icons/flame";
import Sunrise from "lucide-react/dist/esm/icons/sunrise";
import Sun from "lucide-react/dist/esm/icons/sun";
import Sunset from "lucide-react/dist/esm/icons/sunset";
import Moon from "lucide-react/dist/esm/icons/moon";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Tv from "lucide-react/dist/esm/icons/tv";
import Rocket from "lucide-react/dist/esm/icons/rocket";
import Gem from "lucide-react/dist/esm/icons/gem";
import Dumbbell from "lucide-react/dist/esm/icons/dumbbell";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useUserRewards } from "@/hooks/useUserRewards";
import { ZIVO_TIERS, getTierFromPoints, getPointsToNextTier, type ZivoTier } from "@/config/zivoPoints";
import { useReferrals } from "@/hooks/useReferrals";
import { REFERRAL_REWARDS } from "@/config/referralProgram";
import { useScheduledBookingsQuery } from "@/hooks/useScheduledBookings";
import { useCustomerWallet } from "@/hooks/useCustomerWallet";
import { useLocalPaymentMethods } from "@/hooks/useLocalPaymentMethods";
import { useRecommendedDeals } from "@/hooks/useRecommendedDeals";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useSavedLocations } from "@/hooks/useSavedLocations";
import { destinationPhotos } from "@/config/photos";
import PartnerBadge from "@/components/shared/PartnerBadge";
import { useDestinationPrices } from "@/hooks/useDestinationPrices";
import { getRestaurantPhoto } from "@/config/restaurantPhotos";
import { formatDistanceToNow, format } from "date-fns";
import { useDeviceIntegrityCheck } from "@/hooks/useDeviceIntegrityCheck";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { useLodgeReservations } from "@/hooks/lodging/useLodgeReservations";
import { useLodgingPhase5Counts } from "@/hooks/lodging/useLodgingPhase5Counts";
import { getLodgingCompletion } from "@/lib/lodging/lodgingCompletion";

import tabFlightsBg from "@/assets/tab-flights-bg.jpg";
import tabHotelsBg from "@/assets/tab-hotels-bg.jpg";
import tabCarsBg from "@/assets/tab-cars-bg.jpg";
import tabRidesBg from "@/assets/tab-rides-bg.jpg";
import tabEatsBg from "@/assets/tab-eats-bg.jpg";

const tabBgMap: Record<string, string> = {
  rides: tabRidesBg,
  eats: tabEatsBg,
  flights: tabFlightsBg,
  hotels: tabHotelsBg,
};

const tabCssVarMap: Record<string, string> = {
  rides: "var(--rides)",
  eats: "var(--eats)",
  flights: "var(--flights)",
  hotels: "var(--hotels)",
};
// ─── Saved Places Icon Map ───
// ─── Dynamic search placeholder by tab ───
// Search placeholder is now handled inside the component with t()

const savedPlaceIconMap: Record<string, LucideIcon> = {
  home: Home,
  work: Briefcase,
  star: Star,
  pin: MapPin,
};

// ─── Top service tabs (Uber-style) ───
// These are now built inside the component with t() for translation
// See homeTabs and suggestions inside AppHome component

// ─── Restaurant Card (Premium) ───
const RestaurantCard = ({ restaurant, onNavigate }: { restaurant: HomeRestaurant; onNavigate: () => void }) => (
  <motion.button
    onClick={onNavigate}
    whileTap={{ scale: 0.94, rotateX: 5 }}
    whileHover={{ y: -6, rotateX: -2 }}
    className="shrink-0 w-[170px] rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-xl transition-all duration-300 touch-manipulation text-left group card-3d"
    
  >
    <div className="relative h-[120px] overflow-hidden">
      <img
        src={restaurant.cover_image_url || restaurant.logo_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400"}
        alt={restaurant.name}
        width={170}
        height={120}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {restaurant.rating && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-2 py-0.5">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-bold text-primary-foreground">{restaurant.rating.toFixed(1)}</span>
        </div>
      )}
      <PartnerBadge size="xs" className="absolute top-2 left-2 shadow-sm" />
      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Heart className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
    </div>
    <div className="p-3 [transform:translateZ(8px)]">
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
      { label: "Hotel stays", to: "/hotels" },
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
        className="relative rounded-lg border border-border bg-card p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{cfg.greeting}</p>
            <button
              type="button"
              onClick={() => onNavigate(cfg.primary.to)}
              className="mt-0.5 flex min-h-[40px] items-center gap-1 text-sm font-bold text-foreground active:opacity-70 transition-opacity touch-manipulation"
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
              className="min-h-[40px] text-[11px] font-semibold text-foreground bg-muted border border-border rounded-full px-3 py-2 touch-manipulation active:bg-muted/70 transition-colors"
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
  { icon: Hotel,           label: "Hotels",     to: "/hotels",             iconColor: "text-violet-500",  iconBg: "bg-violet-500/10" },
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
  { icon: Hotel, title: "Plan a weekend stay", cta: "Browse hotels", to: "/hotels", accent: "indigo" },
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
    new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase(),
  []);

  return (
    <div className="px-4 pb-3">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-lg border border-border bg-card p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-foreground" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ig-gradient">{dayLabel} MISSION</p>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-foreground truncate">{mission.title}</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate(mission.to)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold bg-ig-gradient text-white shadow-sm hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
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
type LodgingRoomWithAddons = { addons?: unknown[] };
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
type LoyaltySummary = { tier?: string | null; points_balance?: number | null };

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
        className="w-full text-left relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/12 via-amber-500/6 to-transparent p-4 shadow-sm touch-manipulation"
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/15 flex items-center justify-center shrink-0 shadow-inner">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-600">Daily streak</p>
            <p className="text-base font-extrabold text-foreground leading-tight">
              {state.count} {state.count === 1 ? "day" : "days"} <span className="text-xs font-semibold text-muted-foreground">in a row</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Next</p>
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
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                        : "bg-muted/60 text-muted-foreground border border-dashed border-orange-500/40",
                    isToday && "ring-2 ring-orange-500/40 ring-offset-2 ring-offset-background scale-110",
                  )}
                >
                  {isComplete && !isFuture ? "✓" : d}
                </div>
                <span className={cn("text-[8px] font-bold", isToday ? "text-orange-600" : "text-muted-foreground/60")}>{d}</span>
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
    <h2 className="text-sm font-bold text-foreground flex items-center gap-2.5">
      <motion.div
        whileHover={{ scale: 1.1, rotateY: 10 }}
        className="w-7 h-7 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center shadow-sm icon-3d-pop"
      >
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </motion.div>
      {title}
      {badge && (
        <Badge variant="secondary" className="text-[9px] font-bold bg-primary/10 text-primary border-0 px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </h2>
    <button type="button" onClick={onSeeAll} className="text-xs text-primary font-bold touch-manipulation active:scale-95 min-w-[44px] min-h-[32px] flex items-center gap-0.5 hover:gap-1.5 transition-all">
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

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState<"rides" | "eats" | "flights" | "hotels">("rides");
  // Prefetch the route a tab/search-button leads to on touch-down so the
  // chunk is in memory by the time the click fires (~80–150 ms head-start
  // on mobile).
  const { prefetch } = useRoutePrefetch();
  const tabRoutes: Record<"rides" | "eats" | "flights" | "hotels", string> = {
    rides: "/rides/hub",
    eats: "/eats",
    flights: "/flights",
    hotels: "/hotels",
  };

  const homeTabs = [
    { id: "rides", label: t("home.rides"), icon: null, image: zivoRideIcon },
    { id: "eats", label: t("home.eats"), icon: null, image: zivoEatsIcon },
    { id: "flights", label: t("home.flights"), icon: null, image: zivoFlightsIcon },
    { id: "hotels", label: t("home.hotels"), icon: null, image: zivoHotelsIcon },
  ] as const;

  const suggestions = [
    { label: t("home.ride"), icon: null, image: zivoRideIcon, href: "/rides/hub", badge: null, badgeVariant: "promo" as const },
    { label: t("home.flights"), icon: null, image: zivoFlightsIcon, href: "/flights", badge: null, badgeVariant: "discount" as const },
    { label: t("home.rental_cars"), icon: null, image: zivoRentalCarIcon, href: "/rent-car", badge: null, badgeVariant: "promo" as const },
    ...(isKH ? [{ label: t("home.shopping"), icon: null, image: zivoShoppingIcon, href: "/grocery", badge: null, badgeVariant: "promo" as const }] : []),
  ];

  function getSearchPlaceholder(tab: string): string {
    if (tab === "rides") return t("home.book_ride");
    if (tab === "eats") {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 11) return t("home.breakfast");
      if (hour >= 11 && hour < 17) return t("home.lunch");
      if (hour >= 17 && hour < 22) return t("home.dinner");
      return t("home.late_night");
    }
    if (tab === "flights") return t("home.search_flights");
    if (tab === "hotels") return t("home.search_hotels");
    return t("home.where_to");
  }
  const { data: profile, isError: hasProfileError } = useUserProfile();
  const { data: ownerStore, isLoading: ownerStoreLoading } = useOwnerStoreProfile();
  const lodgingStoreId = ownerStore?.isLodging ? ownerStore.id : "";
  const lodgingRooms = useLodgeRooms(lodgingStoreId);
  const lodgingProfile = useLodgePropertyProfile(lodgingStoreId);
  const lodgingReservations = useLodgeReservations(lodgingStoreId, "all");
  const lodgingPhase5 = useLodgingPhase5Counts(lodgingStoreId);
  const lodgingCompletion = ownerStore?.isLodging ? getLodgingCompletion({
    rooms: lodgingRooms.data || [],
    profile: lodgingProfile.data,
    addons: ((lodgingRooms.data || []) as LodgingRoomWithAddons[]).flatMap((room) => room.addons || []),
    housekeepingCount: lodgingPhase5.housekeepingCount,
    maintenanceReady: true,
    reportsReady: Boolean((lodgingRooms.data || []).length) || (lodgingReservations.data?.length ?? 0) > 0,
    mealPlansCount: lodgingPhase5.mealPlansCount,
    staffCount: lodgingPhase5.staffCount,
    channelConnectionsCount: lodgingPhase5.channelConnectionsCount,
    promotionsCount: lodgingPhase5.promotionsCount,
    reviewsAwaitingReply: lodgingPhase5.reviewsAwaitingReply,
    reservationsCount: lodgingReservations.data?.length ?? 0,
  }) : null;
  const lodgingProgress = lodgingCompletion ? { complete: lodgingCompletion.complete, total: lodgingCompletion.total, percent: lodgingCompletion.percent } : null;
  const { data: deals = [], isError: hasDealsError } = useRecommendedDeals("all", 6);
  const { items: recentItems } = useRecentlyViewed();
  const { data: savedLocations, isError: hasSavedLocationsError } = useSavedLocations(user?.id);
  const { points, getNextTierProgress } = useLoyaltyPoints();
  const loyaltySummary = points as LoyaltySummary | null;
  const { active: activeRewards } = useUserRewards();
  const {
    referralCode,
    referrals = [],
    isLoading: referralsLoading,
    getCurrentTier,
    getNextTier,
    getShareUrl,
    copyReferralLink,
    shareReferral,
  } = useReferrals();
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
  const { getDefault } = useLocalPaymentMethods();
  const defaultCard = getDefault();
  const completedReferralCount = referrals.filter((referral) => referral.status === "qualified" || referral.status === "credited").length;
  const pendingReferralCount = referrals.filter((referral) => referral.status === "pending").length;
  const totalReferralCount = referralCode?.total_referrals ?? referrals.length;
  const referralPointsEarned = totalReferralCount * REFERRAL_REWARDS.referrer.pointsPerReferral;
  const currentReferralTier = getCurrentTier();
  const nextReferralTier = getNextTier();
  const referralsToNextTier = nextReferralTier ? Math.max(nextReferralTier.min_referrals - totalReferralCount, 0) : 0;
  const referralTierProgress = nextReferralTier
    ? Math.min((totalReferralCount / Math.max(nextReferralTier.min_referrals, 1)) * 100, 100)
    : 100;
  const referralShareUrl = referralCode?.code ? getShareUrl() : "";

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
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl pointer-events-none [height:var(--zivo-safe-top,0px)]"
      />

      {/* 3D Ambient orbs — contained within scrollable area only */}

      {/* Scrollable content */}
      <div className="scroll-momentum relative z-10 [padding-bottom:calc(56px+var(--zivo-safe-bottom,0px)+24px)]">
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
        <div className="bg-background relative">

          {/* ─── GREETING HEADER ─── */}
          {user ? (
            <div className="flex items-center justify-between px-5 pt-safe pb-3">
              <button type="button" onClick={() => navigate("/profile")} className="flex items-center gap-2.5 touch-manipulation active:opacity-75 transition-opacity">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/25" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{greeting()}</p>
                  <p className="text-sm font-bold text-foreground leading-none">{userName}</p>
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
                  className="relative w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
                >
                  <Bell className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>
          ) : null}

          {/* ─── ALL SERVICES (moved to top) ─── */}
          <div className={cn("pb-5", user ? "pt-1" : "pt-safe")}>
            <div className="flex items-center justify-between mb-3 px-5">
              <h2 className="text-base font-bold text-ig-gradient">{t("home.more_services")}</h2>
              <button type="button" aria-label="View all services" onClick={() => navigate("/services")} className="h-11 w-11 -mr-2 flex items-center justify-center touch-manipulation rounded-full hover:bg-muted/50 transition-colors">
                <ArrowRight className="w-4.5 h-4.5 text-muted-foreground" />
              </button>
            </div>
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-3 px-5 pb-3 preserve-3d">
              {([
                { label: t("home.ride"), image: zivoRideIcon, href: "/rides/hub", badge: null, badgeVariant: "promo" as const },
                { label: t("home.eats"), image: zivoEatsIcon, href: "/eats", badge: null, badgeVariant: "promo" as const },
                { label: t("home.flights"), image: zivoFlightsIcon, href: "/flights", badge: null, badgeVariant: "discount" as const },
                { label: t("home.hotels"), image: zivoHotelsIcon, href: "/hotels", badge: null, badgeVariant: "promo" as const },
              ].filter(Boolean) as Array<{ label: string; image: string; href: string; badge: string | null; badgeVariant: "promo" | "discount" }>).map((s) => (
                <motion.button
                  key={s.label}
                  whileTap={{ scale: 0.94 }}
                  onPointerDown={() => prefetch(s.href)}
                  onClick={() => navigate(s.href)}
                  className="flex flex-col items-center gap-2 touch-manipulation relative group"
                >
                  {s.badge && (
                    <div className={cn(
                      "absolute -top-2.5 -right-2 z-10 text-[8px] font-bold px-2 py-[2px] rounded-full shadow-md",
                      s.badgeVariant === "discount"
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    )}>
                      {s.badge}
                    </div>
                  )}
                  <div className="w-[60px] h-[60px] rounded-2xl bg-card border border-border/30 shadow-sm flex items-center justify-center icon-3d-pop group-active:scale-95 transition-all duration-200">
                    <img src={s.image} alt={s.label} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors">{s.label}</span>
                </motion.button>
              ))}
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-3 px-5 pb-2 preserve-3d">
              {(([
                { label: t("home.rental_cars"), image: zivoRentalCarIcon, icon: null, href: "/rent-car", badge: null },
                { label: "Reserve", image: zivoReserveIcon, icon: null, href: "/rides/hub?tab=reserve", badge: null },
                { label: t("home.shopping"), image: zivoShoppingIcon, icon: null, href: "/grocery", badge: null },
                { label: "Delivery", image: null, icon: Package, href: "/delivery", badge: null },
              ].filter(Boolean)) as Array<{ label: string; image: string | null; icon: typeof Package | null; href: string; badge: string | null }>).map((s) => {
                const SvcIcon = s.icon;
                return (
                  <motion.button
                    key={s.label}
                    whileTap={{ scale: 0.94 }}
                    onPointerDown={() => prefetch(s.href)}
                    onClick={() => navigate(s.href)}
                    className="flex flex-col items-center gap-2 touch-manipulation relative group"
                  >
                    {s.badge && (
                      <div className="absolute -top-2.5 -right-2 z-10 text-[8px] font-bold px-2 py-[2px] rounded-full shadow-md bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        {s.badge}
                      </div>
                    )}
                    <div className="w-[60px] h-[60px] rounded-2xl bg-card border border-border/30 shadow-sm flex items-center justify-center icon-3d-pop group-active:scale-95 transition-all duration-200">
                      {s.image ? (
                        <img src={s.image} alt={s.label} width={32} height={32} loading="lazy" decoding="async" className="w-8 h-8 object-contain" />
                      ) : SvcIcon ? (
                        <SvcIcon className="w-7 h-7 text-primary" />
                      ) : null}
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors">{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ─── TODAY'S PLAN ─── */}
          <Suspense fallback={null}>
            <TodayPlanWidget />
          </Suspense>

          {/* ─── QUICK PICKS + SAVED PLACES (unified pill rail) ─── */}
          <div className="px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {/* User's saved places first — one-tap to ride home/work/etc */}
              {user && savedLocations?.slice(0, 4).map((loc) => {
                const Icon = savedPlaceIconMap[loc.icon] || MapPin;
                return (
                  <motion.button
                    key={loc.id}
                    whileTap={{ scale: 0.94 }}
                    onPointerDown={() => prefetch("/rides/hub")}
                    onClick={() => navigate(`/rides/hub?destination=${encodeURIComponent(loc.address)}`)}
                    className="shrink-0 flex min-h-[44px] items-center gap-1.5 bg-card border border-primary/30 rounded-full pl-2 pr-3 py-2 touch-manipulation active:bg-muted/50 transition-colors shadow-sm"
                  >
                    <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap capitalize">{loc.label}</span>
                  </motion.button>
                );
              })}
              {/* Categorical shortcuts */}
              {QUICK_PICKS.map((p) => {
                const Icon = p.icon;
                return (
                  <motion.button
                    key={p.label}
                    whileTap={{ scale: 0.94 }}
                    onPointerDown={() => prefetch(p.to.split("?")[0])}
                    onClick={() => navigate(p.to)}
                    className="shrink-0 flex min-h-[44px] items-center gap-1.5 bg-card border border-border rounded-full pl-2 pr-3 py-2 touch-manipulation active:bg-muted/50 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-foreground" strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">{p.label}</span>
                  </motion.button>
                );
              })}
              {/* Add place */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => navigate("/account/addresses")}
                className="shrink-0 flex min-h-[44px] items-center gap-1.5 bg-muted/50 border border-dashed border-border/50 rounded-full px-3 py-2 touch-manipulation"
                aria-label="Add a saved place"
              >
                <Plus className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Add place</span>
              </motion.button>
            </div>
          </div>

          {/* ─── LIVE TRIP TRACKER (moved up — surface active trip ASAP) ─── */}
          <div className="px-5 pb-3">
            <Suspense fallback={null}><LiveTripTracker /></Suspense>
          </div>

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
                      className="w-full flex items-center gap-3 bg-card border border-border/40 rounded-2xl p-4 shadow-sm text-left touch-manipulation"
                    >
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border">
                        <Calendar className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate capitalize">{(booking.type || booking.service || "Trip").replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{format(bookingDate, "MMM d 'at' h:mm a")}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold text-foreground border-border bg-secondary shrink-0 capitalize">
                        {booking.status || "Scheduled"}
                      </Badge>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── QUICK REBOOK (moved up — personal cluster) ─── */}
          <div className="px-5 pb-3">
            <Suspense fallback={null}><QuickReorderCarousel /></Suspense>
          </div>

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
                    <div className="w-[60px] h-[60px] rounded-2xl bg-card border border-border/40 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-primary/30 transition-colors">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.title || "Item"} width={60} height={60} className="w-full h-full object-cover" loading="lazy" />
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

          {/* ─── SPEND TRACKER (this month) ─── */}
          <Suspense fallback={null}>
            <SpendTrackerWidget />
          </Suspense>

          {/* "What's New" widget removed — was a hardcoded marketing block
              (4 cards with fake "X NEW" badges and made-up feature lists).
              No release-notes feed backed it, so badges never updated and the
              same "new" features would stay marked NEW indefinitely. Reclaims
              ~250px of home-screen real estate. Wire to a real release-notes
              table later if a fresh-features rail is desired. */}

          <div className="px-5 pb-4">
            {ownerStoreLoading ? (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="h-4 w-36 rounded-full bg-muted animate-pulse" />
                <div className="mt-3 h-2 rounded-full bg-muted animate-pulse" />
              </div>
            ) : ownerStore?.isLodging ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-primary/20 bg-primary/8 shadow-sm">
                {/* Tappable preview area → public hotel detail page */}
                <button
                  type="button"
                  onClick={() => navigate(`/hotel/${ownerStore.id}`)}
                  aria-label={`Open ${ownerStore.name} hotel page`}
                  className="block w-full text-left active:opacity-90 transition"
                >
                  <div className="relative h-24 w-full overflow-hidden bg-muted">
                    {ownerStore.logo_url ? (
                      <img
                        src={ownerStore.logo_url}
                        alt={`${ownerStore.name} cover`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/15 to-transparent" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/30 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/85 backdrop-blur text-primary"><Hotel className="h-4 w-4" /></div>
                      <p className="truncate text-sm font-bold text-foreground drop-shadow-sm">{ownerStore.name}</p>
                      <Badge variant="secondary" className="ml-auto shrink-0 text-[9px]">Tap to view</Badge>
                    </div>
                  </div>
                </button>

                <div className="p-4 pt-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">Hotel / Resort Admin</p>
                    <Badge variant="secondary" className="shrink-0 text-[9px]">Ready</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {(lodgingRooms.data?.length ?? 0)} rooms · Setup {lodgingProgress?.percent || 0}%
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Rooms", "Rates", "Guest Requests"].map((label) => <span key={label} className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/15">{label}</span>)}
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-primary"><span>Setup progress</span><span>{lodgingProgress ? `${lodgingProgress.complete}/${lodgingProgress.total} ready` : "Loading"}</span></div>
                    <Progress value={lodgingProgress?.percent || 0} className="h-1.5 bg-primary/15" />
                  </div>
                  {lodgingCompletion && lodgingCompletion.percent < 100 && lodgingCompletion.nextBestAction && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/stores/${ownerStore.id}?tab=${lodgingCompletion.nextBestAction.tab}`); }}
                      className="mt-2 flex w-full items-center justify-between rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-left transition-colors hover:bg-primary/12 active:scale-[0.99]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-primary">Next best action</span>
                        <span className="block truncate text-xs font-bold text-foreground">{lodgingCompletion.nextBestAction.actionLabel}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{lodgingCompletion.nextBestAction.hint}</span>
                      </span>
                      <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-primary" />
                    </button>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Button size="sm" className="h-9 px-2 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/stores/${ownerStore.id}?tab=lodge-overview`); }}>
                      <span className="truncate">Open Ops</span>
                      <ArrowRight className="ml-1 h-3.5 w-3.5 shrink-0" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 px-2 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); navigate("/admin/lodging/qa-checklist"); }}>
                      <span className="truncate">Run QA</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 px-2 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); navigate("/hotel-admin"); }}>
                      <span className="truncate">Operations</span>
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 px-2 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); navigate("/admin/lodging/completion-verification"); }}>
                      <span className="truncate">QA Report</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <button type="button" onClick={() => navigate("/business/new")} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm active:scale-[0.99]">
                <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Briefcase className="h-5 w-5" /></span><span><span className="block text-sm font-bold text-foreground">Business Page</span><span className="block text-xs text-muted-foreground">Create your business page on Zivo</span></span></span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>




          {/* ─── DISCOVER (gradient cards) ─── */}
          <div className="pb-5">
            <div className="flex items-center justify-between mb-3 px-5">
              <h2 className="text-base font-bold text-ig-gradient">Discover</h2>
              <button type="button" aria-label="View more services" onClick={() => navigate("/more")} className="h-11 w-11 -mr-2 flex items-center justify-center touch-manipulation rounded-full hover:bg-muted/50 transition-colors">
                <ArrowRight className="w-4.5 h-4.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 px-5">
              {[
                { icon: Briefcase, label: "Workplace", desc: "Clock in, jobs & schedule", href: "/personal-dashboard", gradient: "from-foreground to-foreground/80" },
                { icon: Tv, label: "Live", desc: "Watch live", href: "/live", gradient: "from-foreground to-foreground/80" },
                { icon: Rocket, label: "Creator Hub", desc: "Grow & earn", href: "/creator-dashboard", gradient: "from-foreground to-foreground/80" },
                { icon: Heart, label: "Wellness", desc: "Stay healthy", href: "/wellness/activity", gradient: "from-foreground to-foreground/80" },
                { icon: Crown, label: "ZIVO Plus", desc: "Premium perks", href: "/zivo-plus", gradient: "from-amber-500 via-yellow-400 to-orange-400" },
                { icon: Gem, label: "Rewards", desc: "Earn points", href: "/rewards", gradient: "from-foreground to-foreground/80" },
                { icon: Sparkles, label: "Marketplace", desc: "Buy & sell", href: "/marketplace", gradient: "from-foreground to-foreground/80" },
                { icon: Dumbbell, label: "Workouts", desc: "Train daily", href: "/wellness/workouts", gradient: "from-lime-500 via-green-500 to-emerald-500" },
              ].map((card, i) => (
                <motion.button
                  key={card.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(card.href)}
                  className={cn(
                    "shrink-0 w-[128px] h-[96px] rounded-[20px] bg-gradient-to-br p-3 flex flex-col justify-between shadow-lg touch-manipulation text-left",
                    card.gradient
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <card.icon className="w-5 h-5 text-white/90" />
                  <div>
                    <p className="text-white font-bold text-[12px] leading-tight">{card.label}</p>
                    <p className="text-white/75 text-[10px] mt-0.5">{card.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 3D Section Divider */}
          <div className="h-3 relative overflow-hidden">
            <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-full bg-muted/20" />
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="px-5 space-y-8">

          {/* ─── PRICE ALERTS WIDGET ─── */}
          <Suspense fallback={null}><PriceAlertsWidget /></Suspense>

          {/* ─── LOYALTY & REWARDS CARD ─── */}
          {user && points && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/rewards")}
              className="w-full rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/8 border border-amber-500/20 p-5 text-left shadow-sm relative overflow-hidden touch-manipulation"
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-foreground">ZIVO Miles</p>
                    {loyaltySummary?.tier && (
                      <Badge variant="secondary" className="text-[9px] font-bold bg-amber-500/15 text-amber-600 border-0 px-1.5">
                        {loyaltySummary.tier}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{(loyaltySummary?.points_balance || 0).toLocaleString()}</span> pts · Earn more with every trip
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              {(loyaltySummary?.points_balance || 0) > 0 && (
                <div className="mt-3 relative z-10">
                  <Progress value={Math.min(((loyaltySummary?.points_balance || 0) / 5000) * 100, 100)} className="h-1.5 bg-amber-500/20" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {Math.max(0, 5000 - (loyaltySummary?.points_balance || 0)).toLocaleString()} pts to next tier
                  </p>
                </div>
              )}
            </motion.button>
          )}

          {/* ─── REFERRAL WORKFLOW ─── */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/70 p-3.5 relative overflow-hidden shadow-sm bg-card"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground leading-tight">Invite friends, earn rewards</p>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        Friends get {REFERRAL_REWARDS.newUser.points.toLocaleString()} pts. You earn {REFERRAL_REWARDS.referrer.pointsPerReferral.toLocaleString()} pts after they book.
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full shrink-0 px-2 py-0.5 text-[10px]">
                    {currentReferralTier?.tier_name || "Standard"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <div className="rounded-xl border border-border/40 bg-muted/25 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate text-[10px]">Joined</span>
                    </div>
                    <p className="mt-1 text-base font-black text-foreground">{totalReferralCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/25 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate text-[10px]">Points</span>
                    </div>
                    <p className="mt-1 text-base font-black text-foreground">{referralPointsEarned.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/25 px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate text-[10px]">Pending</span>
                    </div>
                    <p className="mt-1 text-base font-black text-foreground">{pendingReferralCount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {referralsLoading ? "Syncing invite" : `${completedReferralCount.toLocaleString()} qualified`}
                    </p>
                    <p className="truncate text-xs font-bold text-foreground select-all" title={referralShareUrl || undefined}>
                      {referralCode?.code ? `Code ${referralCode.code}` : referralShareUrl || "Preparing your link"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!referralShareUrl}
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyReferralLink();
                    }}
                    className="h-8 rounded-lg px-2.5 text-xs font-bold shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="truncate font-bold text-foreground">
                      {nextReferralTier ? `${referralsToNextTier.toLocaleString()} more to ${nextReferralTier.tier_name}` : "Top referral tier unlocked"}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{Math.round(referralTierProgress)}%</span>
                  </div>
                  <Progress value={referralTierProgress} className="mt-1.5 h-1 bg-primary/15" />
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!referralShareUrl}
                    onClick={(e) => {
                      e.stopPropagation();
                      void shareReferral();
                    }}
                    className="h-9 w-full rounded-xl text-sm font-bold shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Share invite
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── GUEST SIGN-UP CTA ─── */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 15, rotateX: -8 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              whileHover={{ y: -4, rotateX: 2 }}
              className="rounded-2xl bg-gradient-to-br from-primary/12 to-primary/10 border border-primary/20 p-6 relative overflow-hidden shadow-sm card-3d"
              
            >
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/10 rounded-full blur-3xl breathe-glow" />
              <div className="relative z-10 [transform:translateZ(15px)]">
                <h3 className="text-base font-bold text-foreground mb-1">{t("home.join_free")}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("home.join_desc")}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate("/signup")}
                    size="sm"
                    className="flex-1 h-11 rounded-xl font-bold shadow-md shadow-primary/20 btn-3d"
                  >
                    {t("home.sign_up_free")}
                  </Button>
                  <Button
                    onClick={() => navigate("/login")}
                    variant="outline"
                    size="sm"
                    className="h-11 px-5 rounded-xl font-medium card-3d"
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

      <Suspense fallback={null}>
        <UniversalSearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </Suspense>

    {/* Bottom Nav — outside perspective container so position:fixed works */}
    <Suspense fallback={<div className="fixed inset-x-0 bottom-0 h-16 bg-background border-t border-border lg:hidden pb-safe" />}><ZivoMobileNav /></Suspense>
      </div>
  );
};

export default AppHome;
