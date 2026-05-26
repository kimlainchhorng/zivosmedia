/**
 * Flight Search Page — /flights
 * Cinematic 3D/4D immersive flight search experience
 */

import { useRef, useCallback, useMemo, useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plane, Shield, Star, TrendingUp, Sparkles,
  Globe, Clock, Headphones, Loader2, Zap, ArrowRight, MapPin,
  Ticket, Radar, ChevronRight, RefreshCw, Heart, Share2, Check
} from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Flight3DSkyHeader from "@/components/flight/Flight3DSkyHeader";
import BundleProgressBanner from "@/components/shared/BundleProgressBanner";
import NativeBackButton from "@/components/shared/NativeBackButton";

import siemReapImg from "@/assets/destinations/siem-reap.jpg";
import sihanoukvilleImg from "@/assets/destinations/sihanoukville.jpg";
import battambangImg from "@/assets/destinations/battambang.jpg";
import bangkokImg from "@/assets/destinations/tropical-paradise.jpg";
import singaporeImg from "@/assets/destinations/city-skyline-night.jpg";
import tokyoImg from "@/assets/destinations/japan-sakura.jpg";

import heroFlights from "@/assets/svc-flights-premium.jpg";
import heroHotels from "@/assets/svc-hotels-premium.jpg";
import heroCars from "@/assets/svc-cars-premium.jpg";

import Footer from "@/components/Footer";
import AppLayout from "@/components/app/AppLayout";
import InstallAppCard from "@/components/account/InstallAppCard";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FlightSearchFormPro } from "@/components/search";
const AISmartDeals = lazy(() => import("@/components/home/AISmartDeals"));
import { usePopularRoutePrices } from "@/hooks/usePopularRoutePrices";
import { useTravelpayoutsPopularRoutes } from "@/hooks/useTravelpayoutsPopularRoutes";
import { useFlightAppTrackingTransparencyPrompt } from "@/hooks/useFlightAppTrackingTransparencyPrompt";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";

const ease3D = [0.16, 1, 0.3, 1] as const;

/* ─── 3D Tilt Hook ─── */
function use3DTilt(maxTilt = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg) scale3d(1.02,1.02,1.02)`;
  }, [maxTilt]);
  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateY(0) rotateX(0) scale3d(1,1,1)";
  }, []);
  return { ref, onMouseMove, onMouseLeave };
}

/* ─── Scroll 3D section ─── */
function ScrollReveal3D({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [60, 0, 0, -30]);
  const rotateX = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [8, 0, 0, -4]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.95, 1, 1, 0.97]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.6]);
  return (
    <motion.div ref={ref} style={{ y, rotateX, scale, opacity, perspective: 1000, transformStyle: "preserve-3d" }} className={cn("relative", className)}>
      {children}
    </motion.div>
  );
}

/* ─── Cinematic hero backgrounds ─── */
const heroSlides = [
  { src: heroFlights, accent: "210 100% 55%", label: "Search & Compare Flights", sub: "500+ airlines, one search" },
  { src: heroHotels, accent: "210 90% 55%", label: "Find Your Next Trip", sub: "Best fares, real-time pricing" },
  { src: heroCars, accent: "210 80% 55%", label: "Fly Smarter with ZIVO", sub: "Trusted licensed partners" },
];

const routeImages: Record<string, string> = {
  "PNH-REP": siemReapImg,
  "PNH-KOS": sihanoukvilleImg,
  "PNH-BKK": bangkokImg,
  "PNH-SIN": singaporeImg,
  "REP-BKK": bangkokImg,
  "PNH-NRT": tokyoImg,
};

const destinationImages: Record<string, string> = {
  REP: siemReapImg,
  KOS: sihanoukvilleImg,
  BKK: bangkokImg,
  SIN: singaporeImg,
  NRT: tokyoImg,
};

type LiveRouteCard = {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  image: string;
  price: string;
  airline: string | null;
  departureDate?: string;
  returnDate?: string;
  transfers?: number | null;
};

const whyZivo = [
  { icon: Globe, title: "500+ Airlines", desc: "Compare all major & low-cost carriers", color: "sky" },
  { icon: Shield, title: "Trusted Partners", desc: "Book through licensed travel partners", color: "emerald" },
  { icon: Clock, title: "Real-Time Prices", desc: "Live fares, always up to date", color: "amber" },
  { icon: Headphones, title: "24/7 Support", desc: "Get help with your booking anytime", color: "purple" },
];

/* ─── 3D Route Card ─── */
function RouteCard3D({ route, index, onRouteClick, isFavorite, onToggleFavorite, onShare, justShared }: { route: LiveRouteCard; index: number; onRouteClick: (from: string, to: string) => void; isFavorite?: boolean; onToggleFavorite?: (e: React.MouseEvent) => void; onShare?: (e: React.MouseEvent) => void; justShared?: boolean }) {
  const { ref: tiltRef, onMouseMove, onMouseLeave } = use3DTilt(12);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 18 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.08, duration: 0.65, ease: ease3D }}
      style={{ perspective: 800 }}
    >
      <div
        ref={tiltRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={() => onRouteClick(route.from, route.to)}
        className="group relative rounded-2xl overflow-hidden border border-border/20 cursor-pointer active:scale-[0.96] touch-manipulation transition-[border-color,box-shadow] duration-300 hover:shadow-2xl hover:shadow-primary/15 hover:border-primary/30 bg-card"
        style={{ transformStyle: "preserve-3d", transition: "transform 0.15s ease-out, box-shadow 0.3s ease" }}
      >
        <div className="relative h-36 overflow-hidden">
          <motion.img src={route.image} alt={route.toCity} className="w-full h-full object-cover" loading="lazy" whileHover={{ scale: 1.12 }} transition={{ duration: 0.8, ease: ease3D }} />
          {/* Strong bottom gradient so caption text stays readable on any image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          {/* Holographic sweep */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* 3D lifted route badge */}
          <motion.div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-xl rounded-full px-3 py-1.5 border border-border/30 shadow-lg" style={{ transform: "translateZ(24px)" }}>
            <span className="font-bold text-[11px] text-foreground">{route.from}</span>
            <Plane className="w-3 h-3 text-primary rotate-45" />
            <span className="font-bold text-[11px] text-foreground">{route.to}</span>
          </motion.div>
          <div className="absolute top-2.5 right-2.5 flex gap-1 z-10" style={{ transform: "translateZ(24px)" }}>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                aria-label={justShared ? "Link copied" : "Share this route"}
                className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition"
              >
                {justShared ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5 text-white" />}
              </button>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={isFavorite ? "Remove route from saved" : "Save route"}
                aria-pressed={!!isFavorite}
                className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center active:scale-90 transition"
              >
                <Heart className={cn("w-3.5 h-3.5", isFavorite ? "fill-rose-500 text-rose-500" : "text-white")} />
              </button>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-[2]" style={{ transform: "translateZ(12px)" }}>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-white truncate drop-shadow-md">{route.fromCity} → {route.toCity}</p>
              {route.departureDate ? (
                <p className="text-[10px] text-white/85 flex items-center gap-1 mt-0.5 drop-shadow">
                  <Calendar className="w-2.5 h-2.5" />
                  {format(parseISO(route.departureDate), "MMM d")}
                  {route.returnDate && ` – ${format(parseISO(route.returnDate), "MMM d")}`}
                  {route.transfers !== null && route.transfers !== undefined && (
                    <span className="ml-1">· {route.transfers === 0 ? "Direct" : `${route.transfers} stop${route.transfers > 1 ? "s" : ""}`}</span>
                  )}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 inline-flex items-baseline gap-0.5 rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-[11px] font-bold shadow-lg drop-shadow-md whitespace-nowrap">
              {route.price}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Popular Routes ─── */
function PopularRoutesSection({ className }: { className?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const duffelQ = usePopularRoutePrices();
  const tpQ = useTravelpayoutsPopularRoutes();
  const liveRoutes = duffelQ.data;
  const tpRoutes = useMemo(() => tpQ.data ?? [], [tpQ.data]);
  const isLoading = duffelQ.isLoading && tpQ.isLoading;
  const isFetching = duffelQ.isFetching || tpQ.isFetching;
  const bothFailed = duffelQ.isError && tpQ.isError;
  const [originFilter, setOriginFilter] = useState<"all" | "PNH" | "REP" | "saved">("all");

  // "Updated X ago" — recompute every minute so the label stays fresh
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  const lastUpdated = useMemo(() => {
    const t = Math.max(duffelQ.dataUpdatedAt || 0, tpQ.dataUpdatedAt || 0);
    if (!t || !nowMs) return null;
    const diffMs = nowMs - t;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [duffelQ.dataUpdatedAt, nowMs, tpQ.dataUpdatedAt]);

  const refreshPrices = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["popular-route-prices"] });
    qc.invalidateQueries({ queryKey: ["tp-popular-routes"] });
  }, [qc]);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("flight_route_faves") || "[]") as string[]); }
    catch { return new Set<string>(); }
  });
  const toggleFavorite = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("flight_route_faves", JSON.stringify([...next])); } catch { /* ignore storage errors */ }
      return next;
    });
  }, []);

  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const handleShare = useCallback(async (route: LiveRouteCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/flights/results?origin=${route.from}&destination=${route.to}&adults=1&cabinClass=economy`;
    const title = `Flights from ${route.fromCity} to ${route.toCity}`;
    const text = `${route.fromCity} → ${route.toCity} from ${route.price} on ZIVO`;
    const key = `${route.from}-${route.to}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setSharedKey(key);
        setTimeout(() => setSharedKey((k) => (k === key ? null : k)), 1800);
      }
    } catch {
      // User cancelled / permission denied — silent
    }
  }, []);

  const handleRouteClick = (from: string, to: string, depDate?: string, retDate?: string) => {
    const dep = depDate || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();
    const ret = retDate || (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split("T")[0]; })();
    navigate(`/flights/results?origin=${from}&destination=${to}&departureDate=${dep}&returnDate=${ret}&adults=1&cabinClass=economy`);
  };

  const routes = useMemo(() => {
    const byKey = new Map<string, LiveRouteCard>();

    for (const tp of tpRoutes) {
      const key = `${tp.origin}-${tp.destination}`;
      byKey.set(key, {
        from: tp.origin,
        to: tp.destination,
        fromCity: tp.origin,
        toCity: tp.destination,
        image: routeImages[key] || destinationImages[tp.destination] || heroFlights,
        price: `$${tp.price}`,
        airline: tp.airline || null,
        departureDate: tp.departureAt?.split("T")[0],
        returnDate: tp.returnAt?.split("T")[0] || undefined,
        transfers: tp.transfers,
      });
    }

    for (const duffel of liveRoutes || []) {
      const key = `${duffel.origin_code}-${duffel.destination_code}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        from: duffel.origin_code,
        to: duffel.destination_code,
        fromCity: duffel.origin_city || duffel.origin_code,
        toCity: duffel.destination_city || duffel.destination_code,
        image: routeImages[key] || destinationImages[duffel.destination_code] || heroFlights,
        price: `$${Math.round(duffel.lowest_price)}`,
        airline: duffel.airline_name || null,
        departureDate: undefined,
        returnDate: undefined,
        transfers: undefined,
      });
    }

    return [...byKey.values()];
  }, [liveRoutes, tpRoutes]);

  const hasLivePrices = routes.length > 0;
  const hasTp = tpRoutes.length > 0;
  const visibleRoutes = originFilter === "all"
    ? routes
    : originFilter === "saved"
    ? routes.filter((r) => favorites.has(`${r.from}-${r.to}`))
    : routes.filter((r) => r.from === originFilter);

  return (
    <div className={className}>
      <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Top routes from Cambodia</h2>
          <p className="text-xs text-muted-foreground">
            Live fares from Phnom Penh & Siem Reap
            {lastUpdated ? <> · <span className="text-emerald-600">Updated {lastUpdated}</span></> : null}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className={cn("text-[10px]", hasLivePrices ? "border-emerald-500/30 text-emerald-600" : "border-primary/30 text-primary")}>
            {isLoading ? <><Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" /> Loading</> : hasLivePrices ? <><Zap className="w-2.5 h-2.5 mr-0.5" /> Live Prices</> : <><Sparkles className="w-2.5 h-2.5 mr-0.5" /> Unavailable</>}
          </Badge>
          <button
            type="button"
            onClick={refreshPrices}
            disabled={isFetching}
            aria-label="Refresh prices"
            className="h-7 w-7 rounded-full border border-border/50 bg-card flex items-center justify-center active:scale-90 transition disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-foreground/70", isFetching && "animate-spin")} />
          </button>
        </div>
      </motion.div>

      {/* Origin city tabs */}
      <div role="tablist" aria-label="Filter routes by origin airport" className="flex gap-1.5 mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          { id: "all", label: "All routes" },
          ...(favorites.size > 0 ? [{ id: "saved" as const, label: `♥ Saved (${favorites.size})` }] : []),
          { id: "PNH", label: "From Phnom Penh" },
          { id: "REP", label: "From Siem Reap" },
        ] as const).map((opt) => {
          const active = originFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              onClick={() => setOriginFilter(opt.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border active:bg-muted",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isLoading && !hasLivePrices ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/20 overflow-hidden bg-card">
              <div className="h-36 bg-muted/40 animate-pulse relative">
                <div className="absolute top-3 left-3 h-6 w-20 rounded-full bg-background/80" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleRoutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Live route prices unavailable right now</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Use the search form above to request current fares from travel partners.
          </p>
          <button
            type="button"
            onClick={() => setOriginFilter("all")}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
          >
            Search flights <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {visibleRoutes.map((route, i) => (
            <RouteCard3D
            key={`${route.from}-${route.to}`}
            route={route}
            index={i}
            onRouteClick={(from, to) => handleRouteClick(from, to, route.departureDate, route.returnDate)}
            isFavorite={favorites.has(`${route.from}-${route.to}`)}
            onToggleFavorite={(e) => toggleFavorite(`${route.from}-${route.to}`, e)}
            onShare={(e) => handleShare(route, e)}
            justShared={sharedKey === `${route.from}-${route.to}`}
          />
          ))}
        </div>
      )}
      <p className="text-[9px] text-muted-foreground mt-3 text-center">
        {hasTp
          ? "*Live prices in USD from Travelpayouts. No hidden fees — final price confirmed at partner checkout."
          : hasLivePrices
          ? "*Live prices in USD from Duffel. No hidden fees — final price confirmed at partner checkout."
          : bothFailed
          ? "Live prices unavailable right now. Use the search above for current fares."
          : "*Prices loading. Final price confirmed at partner checkout."}
      </p>

      {/* Airlines we compare */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-2">
          Top airlines we compare
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { name: "Cambodia Angkor Air", isMore: false },
            { name: "Bangkok Airways", isMore: false },
            { name: "AirAsia", isMore: false },
            { name: "Vietnam Airlines", isMore: false },
            { name: "Thai Airways", isMore: false },
            { name: "Singapore Airlines", isMore: false },
            { name: "Emirates", isMore: false },
            { name: "Korean Air", isMore: false },
            { name: "+ 490 more", isMore: true },
          ].map((a) => (
            <span
              key={a.name}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium",
                a.isMore
                  ? "bg-primary/8 text-primary border border-primary/20"
                  : "border border-border/50 bg-card/60 text-foreground/80",
              )}
            >
              {!a.isMore && <Plane className="w-2.5 h-2.5 text-primary/70 rotate-45" />}
              {a.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── 3D Why ZIVO Card ─── */
function WhyCard3D({ item, index }: { item: typeof whyZivo[0]; index: number }) {
  const { ref: tiltRef, onMouseMove, onMouseLeave } = use3DTilt(14);
  const colorMap: Record<string, string> = {
    sky: "from-sky-500/20 to-blue-500/20 border-sky-500/30 text-sky-500",
    emerald: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-500",
    amber: "from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-500",
    purple: "from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-500",
  };
  const colors = colorMap[item.color] || colorMap.sky;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: ease3D }}
      style={{ perspective: 600 }}
    >
      <div
        ref={tiltRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="group bg-card/80 backdrop-blur-lg border border-border/30 rounded-2xl p-3 sm:p-5 text-left sm:text-center transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20 relative overflow-hidden flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0"
        style={{ transformStyle: "preserve-3d", transition: "transform 0.15s ease-out" }}
      >
        {/* Background glow on hover */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", colors.split(" ").slice(0, 2).join(" "))} />
        <motion.div
          className={cn("w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-gradient-to-br border flex items-center justify-center sm:mx-auto sm:mb-3 relative z-10", colors)}
          style={{ transform: "translateZ(20px)" }}
          whileHover={{ rotateY: 15, scale: 1.1 }}
        >
          <item.icon className="w-5 h-5" />
        </motion.div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <p className="text-sm font-bold relative z-10" style={{ transform: "translateZ(10px)" }}>{item.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 sm:mt-1 leading-snug relative z-10" style={{ transform: "translateZ(5px)" }}>{item.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Why ZIVO Section ─── */
function WhyZivoSection({ className }: { className?: string }) {
  return (
    <div className={className}>
      <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Why Book with ZIVO?</h2>
          <p className="text-xs text-muted-foreground">Trusted by travelers worldwide</p>
        </div>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {whyZivo.map((item, i) => (
          <WhyCard3D key={item.title} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Cinematic Desktop Hero ─── */
function DesktopCinematicHero() {
  const { fromCity, toCity } = useParams();
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const formScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.98]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentAccent = heroSlides[currentSlide].accent;

  return (
    <div ref={containerRef} className="relative" style={{ perspective: "1400px" }}>
      {/* ── Cinematic Background ── */}
      <div className="absolute inset-0 h-[70vh] overflow-hidden">
        {heroSlides.map((slide, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ opacity: i === currentSlide ? 1 : 0, scale: i === currentSlide ? 1.02 : 1.08 }}
            transition={{ opacity: { duration: 1.6, ease: [0.4, 0, 0.2, 1] }, scale: { duration: 8, ease: "linear" } }}
            style={{ zIndex: i === currentSlide ? 1 : 0 }}
          >
            <motion.img src={slide.src} alt="" className="w-full h-full object-cover" style={{ y: bgY }} />
          </motion.div>
        ))}
        {/* Depth overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/50 z-[2]" />
        {/* Accent color wash */}
        <motion.div
          className="absolute inset-0 z-[3] pointer-events-none"
          animate={{ background: `radial-gradient(ellipse at 30% 40%, hsl(${currentAccent} / 0.12) 0%, transparent 70%)` }}
          transition={{ duration: 1.5 }}
        />
      </div>

      {/* ── Floating 3D Elements ── */}
      <div className="absolute inset-0 h-[70vh] z-[4] pointer-events-none overflow-hidden">
        {/* Animated plane */}
        <motion.div
          animate={{ x: ["-5%", "105%"], y: [80, 50, 90], rotateZ: [0, 3, -2, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-20"
        >
          <Plane className="w-6 h-6 text-primary/20 rotate-45" />
        </motion.div>

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-[20%] w-48 h-48 rounded-full blur-[80px]"
          style={{ background: `hsl(${currentAccent} / 0.08)` }}
        />
        <motion.div
          animate={{ y: [0, 20, 0], scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-[40%] left-[10%] w-64 h-64 rounded-full bg-primary/5 blur-[100px]"
        />

        {/* 3D floating service icons */}
        {[
          { icon: Plane, x: "8%", y: "25%", delay: 0, color: "sky" },
          { icon: Globe, x: "88%", y: "30%", delay: 1.5, color: "cyan" },
          { icon: Star, x: "85%", y: "55%", delay: 3, color: "amber" },
          { icon: MapPin, x: "12%", y: "60%", delay: 2, color: "emerald" },
        ].map((item, i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center shadow-xl",
              item.color === "sky" && "bg-sky-500/15 border-sky-500/25 shadow-sky-500/20",
              item.color === "cyan" && "bg-cyan-500/15 border-cyan-500/25 shadow-cyan-500/20",
              item.color === "amber" && "bg-amber-500/15 border-amber-500/25 shadow-amber-500/20",
              item.color === "emerald" && "bg-emerald-500/15 border-emerald-500/25 shadow-emerald-500/20",
            )}
            style={{ left: item.x, top: item.y }}
            animate={{
              y: [0, -8, 0],
              rotateY: [0, 10, 0],
              rotateX: [0, -5, 0],
            }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: item.delay }}
          >
            <item.icon className={cn(
              "w-5 h-5",
              item.color === "sky" && "text-sky-400",
              item.color === "cyan" && "text-cyan-400",
              item.color === "amber" && "text-amber-400",
              item.color === "emerald" && "text-emerald-400",
            )} />
          </motion.div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 pt-12 sm:pt-14">
        <div className="container mx-auto px-4">
          {/* Hero text */}
          <motion.div className="max-w-3xl mx-auto text-center mb-6" style={{ y: textY }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: ease3D }}
            >
              {/* Live badge */}
              <motion.div className="flex justify-center mb-4">
                <Badge className="px-4 py-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-2 text-xs font-medium backdrop-blur-xl">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500" />
                  </span>
                  Live Prices • 500+ Airlines
                </Badge>
              </motion.div>

              {/* Dynamic headline synced to slide */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.5 }}
                >
                  <h1 className="font-display text-3xl lg:text-5xl font-bold mb-2 leading-tight">
                    <span className="text-ig-gradient">
                      {heroSlides[currentSlide].label}
                    </span>
                  </h1>
                  <p className="text-sm text-muted-foreground">{heroSlides[currentSlide].sub}</p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Slide indicators removed for a cleaner hero */}
          </motion.div>

          {/* ── Search Form — 3D floating card ── */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: ease3D }}
            style={{ transformStyle: "preserve-3d", scale: formScale }}
            className="max-w-3xl mx-auto relative"
          >
            {/* Outer glow — subtle */}
            <motion.div
              className="absolute -inset-1 rounded-3xl blur-lg opacity-20"
              animate={{
                background: [
                  `linear-gradient(135deg, hsl(${currentAccent} / 0.25), hsl(var(--primary) / 0.15))`,
                  `linear-gradient(225deg, hsl(var(--primary) / 0.25), hsl(${currentAccent} / 0.15))`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />

            <div className="relative">
              <FlightSearchFormPro
                initialFrom={fromCity ? decodeURIComponent(fromCity) : ""}
                initialTo={toCity ? decodeURIComponent(toCity) : ""}
                className="shadow-2xl shadow-primary/15 rounded-2xl border border-border/30 bg-card/95 backdrop-blur-xl"
              />
            </div>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center justify-center gap-4 mt-6 text-[11px] text-muted-foreground"
          >
            {[
              { icon: Sparkles, label: "500+ Airlines" },
              { icon: Shield, label: "Secure Booking" },
              { icon: Star, label: "Best Prices" },
              { icon: Zap, label: "Instant Results" },
            ].map((item, i) => (
              <motion.span
                key={item.label}
                className="flex items-center gap-1.5"
                whileHover={{ scale: 1.06, y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {i > 0 && <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40 mr-3" />}
                <item.icon className="w-3.5 h-3.5 text-primary/60" /> {item.label}
              </motion.span>
            ))}
          </motion.div>

          {/* Scroll-linked 3D sections */}
          <div className="max-w-4xl mx-auto mt-16 space-y-16 pb-8">
            <ScrollReveal3D>
              <PopularRoutesSection />
            </ScrollReveal3D>
            <ScrollReveal3D>
              <Suspense fallback={<div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />}>
                <AISmartDeals />
              </Suspense>
            </ScrollReveal3D>
            <ScrollReveal3D>
              <WhyZivoSection />
            </ScrollReveal3D>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Time-of-day greeting (mobile) ─── */
function GreetingHeader() {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) return { line: "Good morning", emoji: "☀️" };
    if (h >= 12 && h < 17) return { line: "Good afternoon", emoji: "🌤️" };
    if (h >= 17 && h < 21) return { line: "Good evening", emoji: "🌅" };
    return { line: "Travelling late?", emoji: "🌙" };
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="-mb-2"
    >
      <p className="text-base font-bold text-foreground">
        {greeting.emoji} {greeting.line}
      </p>
      <p className="text-[12px] text-muted-foreground mt-0.5">
        Where would you like to fly?
      </p>
    </motion.div>
  );
}

/* ─── Rotating travel-tip bar (mobile) ─── */
const TRAVEL_TIPS: Array<{ icon: typeof Sparkles; text: string }> = [
  { icon: TrendingUp, text: "Tuesday & Wednesday flights are usually 10–20% cheaper." },
  { icon: Clock, text: "Book international flights 6–8 weeks ahead for the best price." },
  { icon: Zap, text: "Pay with ABA KHQR — no card needed, e-ticket in seconds." },
  { icon: Shield, text: "Most fares include free cancellation up to 24 hours after booking." },
];

function TravelTipBar() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % TRAVEL_TIPS.length), 5000);
    return () => clearInterval(id);
  }, []);
  const tip = TRAVEL_TIPS[idx];
  const Icon = tip.icon;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex items-center gap-2.5 overflow-hidden"
    >
      <span className="w-7 h-7 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-amber-600" />
      </span>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-[11px] font-medium text-foreground/80 leading-snug"
        >
          {tip.text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ─── Mobile Flight Search ─── */
function MobileFlightSearch() {
  const { fromCity, toCity } = useParams();
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = formRef.current;
      if (!el) return;
      // Show once the form bottom has scrolled above the viewport top
      setShowBackToTop(el.getBoundingClientRect().bottom < -40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-1" style={{ perspective: "1200px" }}>
      <GreetingHeader />
      <motion.div
        ref={formRef}
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.65, ease: ease3D }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <FlightSearchFormPro
          initialFrom={fromCity ? decodeURIComponent(fromCity) : ""}
          initialTo={toCity ? decodeURIComponent(toCity) : ""}
          className="shadow-xl shadow-primary/10 rounded-2xl border border-border/30"
        />
      </motion.div>
      {/* Rotating travel tip — replaces the previously redundant trust strip */}
      <TravelTipBar />

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 gap-2"
      >
        <button
          type="button"
          onClick={() => navigate("/flights/bookings")}
          aria-label="My bookings — manage trips and e-tickets"
          className="text-left flex items-center gap-2 rounded-2xl border border-border/40 bg-card p-3 active:scale-[0.98] transition shadow-sm"
        >
          <span className="w-9 h-9 shrink-0 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-sky-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-foreground leading-tight">My bookings</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">Manage trips & e-tickets</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/flights/live")}
          aria-label="Flight status — track live departures"
          className="text-left flex items-center gap-2 rounded-2xl border border-border/40 bg-card p-3 active:scale-[0.98] transition shadow-sm"
        >
          <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Radar className="w-4 h-4 text-emerald-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-foreground leading-tight">Flight status</p>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">Track live departures</p>
          </div>
        </button>
      </motion.div>

      {/* Trust badges — conversion confidence row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-2"
      >
        {[
          { icon: Shield, title: "Free cancellation", sub: "On most flights", color: "emerald" },
          { icon: Zap, title: "Instant confirmation", sub: "E-tickets in seconds", color: "amber" },
          { icon: Star, title: "Transparent pricing", sub: "All fees shown upfront", color: "sky" },
          { icon: Headphones, title: "24/7 support", sub: "Help anywhere, anytime", color: "purple" },
        ].map((item) => {
          const colorMap: Record<string, string> = {
            emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
            sky: "bg-sky-500/10 text-sky-600 border-sky-500/20",
            purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
          };
          return (
            <div
              key={item.title}
              className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/60 backdrop-blur p-2.5"
            >
              <span className={cn("w-8 h-8 shrink-0 rounded-xl border flex items-center justify-center", colorMap[item.color])}>
                <item.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-foreground leading-tight truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      <ScrollReveal3D><PopularRoutesSection /></ScrollReveal3D>

      <ScrollReveal3D>
        <Suspense fallback={<div className="h-40 rounded-2xl bg-muted/30 animate-pulse" />}>
          <AISmartDeals />
        </Suspense>
      </ScrollReveal3D>

      {/* Bundle cross-promo */}
      <motion.button
        type="button"
        onClick={() => navigate("/hotels")}
        aria-label="Browse hotels for your trip"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: ease3D }}
        className="text-left relative overflow-hidden rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition shadow-md bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30"
      >
        <span className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl" aria-hidden />
        <span className="relative w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-emerald-600" />
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">Need a place to stay?</p>
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 rounded px-1 py-0.5 shrink-0">
              Hotels
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            Browse hotels, resorts and guesthouses across Cambodia for your trip.
          </p>
        </div>
        <ArrowRight className="relative w-4 h-4 text-emerald-600 shrink-0" />
      </motion.button>

      {/* FAQ — common questions for Cambodian travelers */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Frequently asked</h2>
            <p className="text-xs text-muted-foreground">Quick answers before you book</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card divide-y divide-border/40 overflow-hidden">
          {[
            {
              q: "Which payment methods are accepted?",
              a: "Visa, Mastercard, JCB, and ABA KHQR. You'll see the available options at checkout based on the airline and partner.",
            },
            {
              q: "When do I get my e-ticket?",
              a: "Within seconds of a successful payment. We email it to you and store it in My bookings — show it at check-in by phone.",
            },
            {
              q: "Can I cancel or change a flight?",
              a: "Yes, on most fares. Refundable and changeable rules differ by airline — they're shown clearly before you confirm.",
            },
            {
              q: "What documents do I need?",
              a: "A valid passport for international flights and any visa required by your destination. Domestic Cambodia flights accept your national ID.",
            },
            {
              q: "How much baggage is included?",
              a: "Carry-on is included on most fares. Checked baggage depends on the airline and fare type — the limit is shown on each fare card.",
            },
          ].map((item, i) => (
            <details key={i} className="group [&>summary]:list-none">
              <summary className="cursor-pointer p-4 flex items-center gap-3 active:bg-muted/40 transition select-none">
                <span className="text-sm font-semibold text-foreground flex-1">{item.q}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
              </summary>
              <p className="px-4 pb-4 text-[12px] text-muted-foreground leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </motion.section>

      {/* Install app prompt — auto-hides inside the installed app */}
      <InstallAppCard />

      {/* Support / help CTA — Cambodian travelers expect direct human contact */}
      <motion.button
        type="button"
        onClick={() => navigate("/support/travel-bookings")}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: ease3D }}
        className="text-left rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-4 flex items-center gap-3 active:scale-[0.99] transition shadow-sm"
        aria-label="Open travel-bookings support"
      >
        <span className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Need a hand with a booking?</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            Talk to our travel team about flights, changes, or refunds — usually under 5 min.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </motion.button>

      {/* Mobile footer — legal & info links */}
      <footer className="pt-2 -mt-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          {[
            { href: "/legal/partner-disclosure", label: "About these prices" },
            { href: "/legal/refunds", label: "Refund policy" },
            { href: "/legal/cancellation", label: "Cancellation" },
            { href: "/legal/privacy", label: "Privacy" },
            { href: "/legal/terms", label: "Terms" },
          ].map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigate(link.href)}
              className="text-left underline-offset-2 hover:underline active:underline"
            >
              {link.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/70">
          © {new Date().getFullYear()} ZIVO. Flight prices powered by our partners (Duffel, Travelpayouts). Final price confirmed at checkout.
        </p>
      </footer>

      {/* Floating "Back to search" button */}
      <button
        type="button"
        onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        aria-label="Back to search"
        className={cn(
          "fixed bottom-[calc(var(--zivo-safe-bottom,0px)+5rem)] right-4 z-40 h-12 px-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200",
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
      >
        <Plane className="w-4 h-4 -rotate-45" />
        Search
      </button>
    </div>
  );
}

/* ─── Animated 3D Background (mobile) ─── */
function Animated3DBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/6 blur-[80px]" />
      <motion.div animate={{ y: [0, 30, 0], x: [0, -15, 0], scale: [1.1, 0.9, 1.1] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-1/2 -left-40 w-[28rem] h-[28rem] rounded-full bg-accent/4 blur-[100px]" />
      <motion.div animate={{ y: [0, -25, 0], x: [0, 12, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }} className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-primary/4 blur-[60px]" />
      <motion.div animate={{ x: ["-10%", "110%"], y: [60, 20, 80], rotateZ: [0, 5, -3, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-24">
        <Plane className="w-5 h-5 text-primary/10 rotate-45" />
      </motion.div>
    </div>
  );
}

/* ─── Main Component ─── */
const FlightLanding = () => {
  useFlightAppTrackingTransparencyPrompt(true);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <SEOHead
          title="Search Flights from Cambodia – ZIVO | 500+ Airlines"
          description="Find the best flight deals from Phnom Penh and Siem Reap. Compare 500+ airlines, book direct, and track price drops — all on ZIVO."
          canonical="/flights"
          ogImage="/og-flights.jpg"
          appLink="zivo://flights"
        />
        <AppLayout title="Flights" headerRightAction={undefined}>
          <BundleProgressBanner step="flight" />
          <Flight3DSkyHeader className="-mt-1" />
          <div className="relative overflow-hidden">
            <Animated3DBackground />
            <div className="relative z-10"><MobileFlightSearch /></div>
          </div>
        </AppLayout>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <BundleProgressBanner step="flight" />
      <SEOHead
        title="Search Flights from Cambodia – ZIVO | 500+ Airlines"
        description="Find the best flight deals from Phnom Penh and Siem Reap. Compare 500+ airlines, book direct, and track price drops — all on ZIVO."
        canonical="/flights"
        ogImage="/og-flights.jpg"
        appLink="zivo://flights"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Search Flights from Cambodia – ZIVO",
            "description": "Find the best flight deals from Phnom Penh and Siem Reap. Compare 500+ airlines.",
            "url": "https://hizivo.com/flights",
            "isPartOf": { "@type": "WebSite", "url": "https://hizivo.com", "name": "ZIVO" },
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://hizivo.com/flights/results?origin={origin}&destination={destination}&date={date}",
              "query-input": "required name=origin required name=destination required name=date"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://hizivo.com/" },
              { "@type": "ListItem", "position": 2, "name": "Flights", "item": "https://hizivo.com/flights" }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Popular flight destinations from Cambodia on ZIVO",
            "itemListOrder": "https://schema.org/ItemListOrderAscending",
            "itemListElement": [
              { "@type": "ListItem", "position": 1,  "name": "Siem Reap",     "url": "https://hizivo.com/flights/to-siem-reap" },
              { "@type": "ListItem", "position": 2,  "name": "Sihanoukville", "url": "https://hizivo.com/flights/to-sihanoukville" },
              { "@type": "ListItem", "position": 3,  "name": "Bangkok",       "url": "https://hizivo.com/flights/to-bangkok" },
              { "@type": "ListItem", "position": 4,  "name": "Singapore",     "url": "https://hizivo.com/flights/to-singapore" },
              { "@type": "ListItem", "position": 5,  "name": "Kuala Lumpur",  "url": "https://hizivo.com/flights/to-kuala-lumpur" },
              { "@type": "ListItem", "position": 6,  "name": "Hong Kong",     "url": "https://hizivo.com/flights/to-hong-kong" },
              { "@type": "ListItem", "position": 7,  "name": "Tokyo",         "url": "https://hizivo.com/flights/to-tokyo" },
              { "@type": "ListItem", "position": 8,  "name": "Seoul",         "url": "https://hizivo.com/flights/to-seoul" },
              { "@type": "ListItem", "position": 9,  "name": "Ho Chi Minh",   "url": "https://hizivo.com/flights/to-ho-chi-minh" },
              { "@type": "ListItem", "position": 10, "name": "Hanoi",         "url": "https://hizivo.com/flights/to-hanoi" }
            ]
          }
        ]}
      />
      <Header />
      <NativeBackButton />
      <main className="pt-16 sm:pt-20">
        <DesktopCinematicHero />
      </main>
      <Footer />
    </div>
  );
};

export default FlightLanding;
