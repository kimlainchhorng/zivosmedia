/**
 * ServicesPage - Full directory of all ZIVO services
 * Premium super-app style with glassmorphism, layered banners, staggered animations
 */
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, Car, Shield, MapPin, Sparkles, Package, Gift, Crown,
  Wine, ShoppingCart, Pill, Ship, FileCheck, ChevronRight,
  Search, X, Heart, Tv, Briefcase, Dumbbell, Mail, CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { useI18n } from "@/hooks/useI18n";
import { useCountry } from "@/hooks/useCountry";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import zivoRideIcon from "@/assets/zivo-ride-icon.webp";
import zivoEatsIcon from "@/assets/zivo-eats-icon.webp";
import zivoFlightsIcon from "@/assets/zivo-flights-icon.webp";
import zivoHotelsIcon from "@/assets/zivo-hotels-icon.webp";
import zivoRentalCarIcon from "@/assets/zivo-rental-car.webp";
import zivoReserveIcon from "@/assets/zivo-reserve-car.webp";
import zivoShoppingIcon from "@/assets/zivo-shopping.webp";
import zivoDeliveryBanner from "@/assets/zivo-delivery-banner.webp";
import zivoPackageIcon from "@/assets/service-package.png";
import zivoTravelBanner from "@/assets/zivo-travel-banner.webp";
import zivoGroupRideIcon from "@/assets/service-group-ride.png";
import zivoAlcoholIcon from "@/assets/service-alcohol.png";
import zivoPharmacyIcon from "@/assets/service-pharmacy.png";

/* ── Types ── */
interface ServiceItem {
  id?: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  image?: string;
  badge?: string;
  badgeVariant?: "discount" | "promo" | "new" | "coming_soon";
  animClass?: string;
  comingSoon?: boolean;
}

interface ServiceCategory {
  title: string;
  subtitle?: string;
  services: ServiceItem[];
}

/* Per-service accent colours (static literal classes so Tailwind JIT keeps them).
   Keyed by href so tiles don't each need annotating; related services share a hue.
   A soft 10% tint on the icon tile + a coloured icon turns the monochrome grid into
   a vibrant, organised super-app hub without touching layout or interaction. */
const ACCENT_BY_HREF: Record<string, { bg: string; icon: string }> = {
  "/rides/hub": { bg: "bg-blue-500/10 dark:bg-blue-400/15", icon: "text-blue-500 dark:text-blue-400" },
  "/delivery": { bg: "bg-violet-500/10 dark:bg-violet-400/15", icon: "text-violet-500 dark:text-violet-400" },
  "/flights": { bg: "bg-sky-500/10 dark:bg-sky-400/15", icon: "text-sky-500 dark:text-sky-400" },
  "/rent-car": { bg: "bg-amber-500/10 dark:bg-amber-400/15", icon: "text-amber-600 dark:text-amber-400" },
  "/eats": { bg: "bg-orange-500/10 dark:bg-orange-400/15", icon: "text-orange-500 dark:text-orange-400" },
  "/grocery": { bg: "bg-emerald-500/10 dark:bg-emerald-400/15", icon: "text-emerald-500 dark:text-emerald-400" },
  "/hotels": { bg: "bg-indigo-500/10 dark:bg-indigo-400/15", icon: "text-indigo-500 dark:text-indigo-400" },
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

/* ── Data ── */
const getServiceCategories = (t: (key: string) => string, isCambodia = false): ServiceCategory[] => [
  {
    title: t("services.category.ride"),
    subtitle: t("services.category.ride_sub"),
    services: [
      { label: t("services.ride"), href: "/rides/hub", image: zivoRideIcon, badge: t("services.badge.off_10"), badgeVariant: "discount", animClass: "animate-car-run" },
      { label: t("services.package"), href: "/delivery", image: zivoPackageIcon, badge: "Live", badgeVariant: "new", animClass: "animate-pkg-bounce" },
      { label: t("services.travel"), href: "/flights", image: zivoFlightsIcon, badge: "Hot", badgeVariant: "promo", animClass: "animate-plane-fly" },
      { id: "ride-reserve", label: t("services.reserve"), href: "/rides/hub", image: zivoReserveIcon, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { label: t("services.rental_cars"), href: "/rent-car", image: zivoRentalCarIcon, badge: "Book", badgeVariant: "promo", animClass: "animate-car-run" },
      { label: t("services.group_ride"), href: "/rides/hub", image: zivoGroupRideIcon, animClass: "animate-car-run" },
    ],
  },
  {
    title: t("services.category.food"),
    subtitle: t("services.category.food_sub"),
    services: [
      { label: t("services.food"), href: "/eats", image: zivoEatsIcon, badge: "Order", badgeVariant: "promo", animClass: "animate-food-wiggle" },
      { label: t("services.grocery"), href: "/grocery", image: zivoShoppingIcon, animClass: "animate-food-wiggle", badge: "Shop", badgeVariant: "promo" as const },
      { label: t("services.alcohol"), href: "/grocery", image: zivoAlcoholIcon, badge: "New", badgeVariant: "new", animClass: "animate-food-wiggle" },
      { label: t("services.pharmacy"), href: "/grocery", image: zivoPharmacyIcon, badge: "New", badgeVariant: "new", animClass: "animate-pkg-bounce" },
    ],
  },
  {
    title: t("services.category.trip"),
    subtitle: t("services.category.trip_sub"),
    services: [
      { label: t("services.flights"), href: "/flights", image: zivoFlightsIcon, badge: "Hot", badgeVariant: "promo", animClass: "animate-plane-fly" },
      { label: t("services.hotels"), href: "/hotels", image: zivoHotelsIcon, badge: "Book", badgeVariant: "promo", animClass: "animate-pkg-bounce" },
      { label: t("services.car_rental"), href: "/rent-car", image: zivoRentalCarIcon, badge: "Rent", badgeVariant: "promo", animClass: "animate-car-run" },
      { label: t("services.insurance"), href: "/travel-insurance", icon: Shield, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { label: t("services.things_to_do"), href: "/explore", icon: MapPin, badge: "New", badgeVariant: "new" },
      { label: t("services.ai_planner"), href: "/ai-trip-planner", icon: Sparkles, badge: "AI", badgeVariant: "new" },
      { label: t("services.visa_help"), href: "/support", icon: FileCheck, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
      { label: t("services.cruise"), href: "/flights", icon: Ship, badge: t("services.badge.coming_soon"), badgeVariant: "coming_soon", comingSoon: true },
    ],
  },
  {
    title: t("services.category.more"),
    subtitle: t("services.category.more_sub"),
    services: [
      { label: t("services.drive"), href: "/drive", icon: Car },
      { label: "ZIVO+", href: "/zivo-plus", icon: Crown, badge: "Premium", badgeVariant: "new" },
      { label: t("services.rewards"), href: "/rewards", icon: Gift, badge: "Earn", badgeVariant: "promo" },
      { label: t("services.deals"), href: "/deals", icon: Sparkles, badge: "Hot", badgeVariant: "promo" },
      { label: t("services.live"), href: "/live", icon: Tv, badge: "Live", badgeVariant: "new" },
      { label: t("services.wellness"), href: "/wellness", icon: Dumbbell, badge: "New", badgeVariant: "new" },
      { label: t("services.creator"), href: "/creator-dashboard", icon: Briefcase },
    ],
  },
];

/* ── Promo Banner Component ── */
function PromoBanner({
  image,
  alt,
  label,
  title,
  subtitle,
  href,
  delay = 0.15,
  navigate,
  objectPosition = "center",
}: {
  image: string;
  alt: string;
  label?: string;
  title: string;
  subtitle: string;
  href: string;
  delay?: number;
  navigate: (path: string) => void;
  objectPosition?: string;
}) {
  return (
    <motion.button
      onClick={() => navigate(href)}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
      className="w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 touch-manipulation mt-5 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-[150px]">
        <img
          src={image}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          style={{ objectPosition }}
        />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-5">
          {label && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-1">
              {label}
            </span>
          )}
          <span className="text-[15px] font-black text-background leading-tight drop-shadow-md">
            {title}
          </span>
          <span className="text-[11px] text-background/80 mt-1 font-medium">
            {subtitle}
          </span>
        </div>

        {/* Arrow indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChevronRight className="w-4 h-4 text-background" />
        </div>
      </div>
    </motion.button>
  );
}

/* ── Badge Variant Styles ── */
const badgeStyles = {
  discount: "bg-ig-gradient text-white shadow-primary/30",
  promo: "bg-primary/90 text-primary-foreground shadow-primary/20",
  new: "bg-foreground text-background shadow-foreground/20",
  coming_soon: "bg-amber-500 text-white shadow-amber-500/30",
};

const FAVORITES_KEY = "zivo_favorite_services";

const serviceFavoriteKey = (service: ServiceItem) => service.id ?? service.href;

/* ── Page ── */
export default function ServicesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isCambodia } = useCountry();
  const { user } = useAuth();
  const serviceCategories = getServiceCategories(t, isCambodia);
  const [runningLabel, setRunningLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [waitlistService, setWaitlistService] = useState<string | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState(user?.email ?? "");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });

  const toggleFavorite = (service: ServiceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = serviceFavoriteKey(service);
    const next = favorites.includes(key)
      ? favorites.filter(f => f !== key)
      : [...favorites, key];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const allServices = useMemo(
    () => serviceCategories.flatMap(c => c.services),
    [serviceCategories]
  );
  const favoriteServices = useMemo(
    () => allServices.filter(s => favorites.includes(serviceFavoriteKey(s))),
    [allServices, favorites]
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return serviceCategories;
    const q = searchQuery.toLowerCase();
    return serviceCategories
      .map(cat => ({
        ...cat,
        services: cat.services.filter(s => s.label.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.services.length > 0);
  }, [serviceCategories, searchQuery]);

  const handleServiceClick = (service: ServiceItem) => {
    if (service.comingSoon) {
      setWaitlistService(service.label);
      setWaitlistSubmitted(false);
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

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-x-hidden">
      {/* Decorative background orbs */}
      <div className="absolute top-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[400px] -right-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pb-2 relative z-10 safe-area-top">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-1"
        >
          <button type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-md border border-border/40 flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="w-[18px] h-[18px] text-foreground" />
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <h1 className="text-[28px] font-black text-foreground mt-3 tracking-tight">
            {t("services.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("services.subtitle")}</p>
        </motion.div>
      </div>

      {/* Search bar */}
      <div className="px-5 pt-4 pb-1 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("services.search_placeholder")}
            className="pl-9 pr-9 h-10 rounded-full bg-muted/60 border-border/40 text-sm focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Quick Launch — horizontal scroll of popular services */}
      {!searchQuery && (
        <div className="px-5 pt-4 relative z-10">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Popular</p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {[
              { label: t("services.ride"), href: "/rides/hub", image: zivoRideIcon, color: "from-blue-500 to-blue-600" },
              { label: t("services.food"), href: "/eats", image: zivoEatsIcon, color: "from-orange-500 to-amber-500" },
              { label: t("services.flights"), href: "/flights", image: zivoFlightsIcon, color: "from-sky-500 to-cyan-500" },
              { label: t("services.hotels"), href: "/hotels", image: zivoHotelsIcon, color: "from-purple-500 to-violet-600" },
              { label: t("services.grocery"), href: "/grocery", image: zivoShoppingIcon, color: "from-emerald-500 to-green-600" },
            ].map((s) => (
              <motion.button
                key={s.label}
                type="button"
                onClick={() => navigate(s.href)}
                whileTap={{ scale: 0.94 }}
                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <img src={s.image} alt={s.label} className="w-9 h-9 object-contain" loading="lazy" decoding="async" />
                </div>
                <span className="text-[10px] font-semibold text-foreground text-center leading-tight w-16">{s.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Favorites strip */}
      {!searchQuery && favoriteServices.length > 0 && (
        <div className="px-5 pt-4 relative z-10">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Favorites</p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {favoriteServices.map(s => (
              <motion.button
                key={serviceFavoriteKey(s) + "-fav"}
                type="button"
                onClick={() => handleServiceClick(s)}
                whileTap={{ scale: 0.94 }}
                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation relative rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="w-16 h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center shadow-sm relative">
                  {s.image ? (
                    <img src={s.image} alt={s.label} className="w-9 h-9 object-contain" loading="lazy" decoding="async" />
                  ) : s.icon ? (
                    <s.icon className="w-6 h-6 text-primary" />
                  ) : null}
                  <button
                    type="button"
                    aria-label="Remove from favorites"
                    onClick={(e) => toggleFavorite(s, e)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-card border border-border/40 shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                  </button>
                </div>
                <span className="text-[10px] font-semibold text-foreground text-center leading-tight w-16">{s.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Service Categories */}
      <div className="px-5 space-y-7 pt-7 relative z-10">
        {filteredCategories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">{t("services.search_no_results")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("services.search_no_results_sub")}</p>
          </motion.div>
        )}
        {filteredCategories.map((category, catIdx) => (
          <div key={category.title}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + catIdx * 0.08, type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Section header */}
              <div className="mb-4">
                <h2 className="text-[17px] font-extrabold text-foreground tracking-tight">
                  {category.title}
                </h2>
                {category.subtitle && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                    {category.subtitle}
                  </p>
                )}
              </div>

              {/* Service grid */}
              <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                {category.services.map((service, idx) => (
                  <motion.button
                    key={service.label}
                    onClick={() => handleServiceClick(service)}
                    whileTap={{ scale: 0.92 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.12 + catIdx * 0.08 + idx * 0.035,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 touch-manipulation relative group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      service.comingSoon && "opacity-60"
                    )}
                  >
                    {/* Favorite heart */}
                    <button
                      type="button"
                      aria-label={favorites.includes(serviceFavoriteKey(service)) ? "Remove from favorites" : "Save to favorites"}
                      onClick={(e) => toggleFavorite(service, e)}
                      className={cn(
                        "absolute -top-1 -right-1 z-20 w-5 h-5 flex items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border/30 shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        favorites.includes(serviceFavoriteKey(service))
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                      )}
                    >
                      <Heart className={cn(
                        "w-3 h-3 transition-colors",
                        favorites.includes(serviceFavoriteKey(service)) ? "fill-rose-500 text-rose-500" : "text-muted-foreground/60"
                      )} />
                    </button>

                    {/* Badge */}
                    {service.badge && (
                      <div
                        className={cn(
                          "absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-[8px] font-bold px-2.5 py-[3px] rounded-full whitespace-nowrap shadow-md",
                          badgeStyles[service.badgeVariant || "promo"]
                        )}
                      >
                        {service.badge}
                      </div>
                    )}

                    {/* Icon container */}
                    <div
                      className={cn(
                        "w-[68px] h-[68px] rounded-2xl flex items-center justify-center transition-all duration-200 overflow-visible",
                        ACCENT_BY_HREF[service.href]?.bg ?? "bg-card",
                        "border border-border/40 shadow-sm",
                        "group-hover:shadow-md group-hover:border-primary/20 group-hover:-translate-y-0.5",
                        "group-active:bg-muted/60 group-active:shadow-none group-active:translate-y-0"
                      )}
                    >
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.label}
                          className={cn(
                            "w-9 h-9 object-contain transition-transform duration-200 group-hover:scale-110",
                            runningLabel === service.label && service.animClass
                          )}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : service.icon ? (
                        <service.icon className={cn("w-6 h-6 transition-colors duration-200", ACCENT_BY_HREF[service.href]?.icon ?? "text-muted-foreground")} />
                      ) : null}
                    </div>

                    {/* Label */}
                    <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                      {service.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Promo banner after "Your ride, your way" */}
            {catIdx === 0 && !searchQuery && (
              <PromoBanner
                image={zivoDeliveryBanner}
                alt={t("services.banner.deliver_alt")}
                title={t("services.banner.deliver_title")}
                subtitle={t("services.banner.deliver_subtitle")}
                href="/drive"
                delay={0.2}
                navigate={navigate}
              />
            )}

            {/* Travel banner after "Food & more, fast" */}
            {catIdx === 1 && !searchQuery && (
              <PromoBanner
                image={zivoTravelBanner}
                alt={t("services.banner.trip_alt")}
                label={t("services.banner.trip_label")}
                title={t("services.banner.trip_title")}
                subtitle={t("services.banner.trip_subtitle")}
                href="/flights"
                delay={0.25}
                navigate={navigate}
              />
            )}
          </div>
        ))}
      </div>

      <Sheet open={!!waitlistService} onOpenChange={(open) => { if (!open) setWaitlistService(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10 max-h-[80dvh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold">Get early access</SheetTitle>
          </SheetHeader>
          {waitlistSubmitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-base">{waitlistService} — you're on the list!</p>
                <p className="text-sm text-muted-foreground mt-1">We'll email you when it launches.</p>
              </div>
              <button type="button" onClick={() => setWaitlistService(null)}
                className="text-sm text-primary font-semibold rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Close</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{waitlistService}</span> is coming soon.
                Drop your email and we'll notify you first.
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <button
                type="button"
                disabled={!waitlistEmail.trim() || waitlistLoading}
                onClick={async () => {
                  if (!waitlistEmail.trim()) return;
                  setWaitlistLoading(true);
                  try {
                    const { error } = await supabase.functions.invoke("service-waitlist-submit", { body: {
                      email: waitlistEmail,
                      service: waitlistService,
                      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
                    } });
                    if (error) throw error;
                  } catch {
                    toast.error("Couldn't join waitlist. Please try again.");
                    setWaitlistLoading(false);
                    return;
                  }
                  setWaitlistLoading(false);
                  setWaitlistSubmitted(true);
                }}
                className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {waitlistLoading ? "Joining…" : "Notify me when it launches"}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ZivoMobileNav />
    </div>
  );
}
